#!/usr/bin/env node
import { createHash, randomUUID } from 'crypto';
import { realpath, stat, readFile, mkdir, writeFile, readdir, mkdtemp, rename, rm } from 'fs/promises';
import { homedir } from 'os';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';
import { defineTool, toolJsonSchema } from '@forgeax/engine-tool-runtime';

var ID = /^\d{13}-[0-9a-f-]{36}$/;
var MAX_IMAGE = 32 * 1024 * 1024;
var digest = (bytes) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
function project(value, depth = 0, budget = { remaining: 65536 }) {
  if (budget.remaining <= 0 || depth > 6) return "[omitted]";
  budget.remaining -= 16;
  if (budget.remaining <= 0) return "[omitted]";
  if (ArrayBuffer.isView(value) || value instanceof ArrayBuffer) return "[binary artifact]";
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    if (value.startsWith("data:")) return "[binary artifact]";
    const size = Math.min(value.length, 2048, budget.remaining);
    budget.remaining -= size;
    return value.slice(0, size).replace(
      /([?&][^?&=\s]*(?:token|password|secret|authorization)[^?&=\s]*=)[^&#\s]*/gi,
      "$1[redacted]"
    ) + (size < value.length ? "\u2026" : "");
  }
  if (Array.isArray(value))
    return value.slice(0, 64).map((item) => project(item, depth + 1, budget));
  if (!value || typeof value !== "object") return null;
  return Object.fromEntries(
    Object.entries(value).slice(0, 64).map(([key, item]) => [
      key.slice(0, 256),
      /token|password|secret|authorization|cookie/i.test(key) ? "[redacted]" : project(item, depth + 1, budget)
    ])
  );
}
function requireId(id) {
  if (!ID.test(id)) throw new TypeError("Invalid operation history ID");
}
function artifactIndex(index) {
  if (!Number.isSafeInteger(index) || index < 0 || index >= 64)
    throw new TypeError("Invalid artifact index");
}
function summary(entry) {
  const { args: _args, result: _result, failure: _failure, artifacts, ...metadata } = entry;
  return {
    ...metadata,
    artifactCount: artifacts.length,
    imageCount: artifacts.filter((item) => item.available).length
  };
}
async function createOperationHistoryStore(rootInput, directoryInput) {
  let root = resolve(rootInput);
  try {
    root = await realpath(root);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const directory = directoryInput ?? join(
    process.env.FORGEAX_HISTORY_DIR ?? join(process.env.XDG_DATA_HOME || join(homedir(), ".local/share"), "ForgeaX/operations"),
    createHash("sha256").update(root).digest("hex")
  );
  const read = async (id) => {
    requireId(id);
    const path = join(directory, id, "record.json");
    const bytes = await readFile(path);
    if (bytes.length > 1024 * 1024) throw new Error("Operation history record exceeds its bound");
    const entry = JSON.parse(bytes.toString());
    if (entry.schemaVersion !== 1 || entry.id !== id || entry.root !== root || !Array.isArray(entry.artifacts))
      throw new Error("Invalid operation history record");
    return entry;
  };
  const save = async (entry, initial = false) => {
    const folder = join(directory, entry.id);
    if (initial) {
      await mkdir(directory, { recursive: true, mode: 448 });
      const staging = await mkdtemp(join(directory, ".staging-"));
      try {
        await writeFile(join(staging, "record.json"), JSON.stringify(entry), { mode: 384 });
        await rename(staging, folder);
      } catch (error) {
        await rm(staging, { recursive: true, force: true });
        throw error;
      }
      return;
    }
    await mkdir(folder, { recursive: true });
    const temporary = join(folder, `record-${randomUUID()}.tmp`);
    await writeFile(temporary, JSON.stringify(entry), { mode: 384 });
    await rename(temporary, join(folder, "record.json"));
  };
  return {
    root,
    async list({
      limit = 50,
      before
    } = {}) {
      if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100)
        throw new TypeError("History limit must be between 1 and 100");
      if (before !== void 0) requireId(before);
      const ids = await readdir(directory).catch((error) => {
        if (error.code === "ENOENT") return [];
        throw error;
      });
      const page = ids.filter((id) => ID.test(id) && (before === void 0 || id < before)).sort().reverse().slice(0, limit + 1);
      const entries = await Promise.all(page.slice(0, limit).map(read));
      return {
        root,
        items: entries.map(summary),
        ...page.length > limit ? { nextCursor: page[limit - 1] } : {}
      };
    },
    get: read,
    async readArtifact(id, index) {
      artifactIndex(index);
      const entry = await read(id);
      const artifact = entry.artifacts[index];
      if (!artifact?.available)
        throw new Error(artifact?.unavailableReason ?? "Screenshot artifact is unavailable");
      const bytes = await readFile(join(directory, id, "artifacts", `${index}.png`));
      if (bytes.length > MAX_IMAGE || digest(bytes) !== artifact.digest)
        throw new Error("Screenshot artifact digest mismatch");
      return {
        mediaType: "image/png",
        digest: artifact.digest,
        data: bytes.toString("base64")
      };
    },
    async track(operation, args, execute) {
      if (operation.startsWith("engine.history.") || operation.startsWith("view.workspace.history.") || operation === "help")
        return execute();
      const started = Date.now();
      const entry = {
        schemaVersion: 1,
        id: `${started}-${randomUUID()}`,
        root,
        operation,
        startedAt: new Date(started).toISOString(),
        state: "running",
        args: project(args),
        artifacts: []
      };
      try {
        await save(entry, true);
      } catch (cause) {
        throw Object.assign(new Error("Operation history directory is not writable", { cause }), {
          code: "operation-history-write-failed",
          expected: "a writable directory for durable operation receipts before command execution",
          hint: "Set FORGEAX_HISTORY_DIR or XDG_DATA_HOME to a writable data directory and retry the same command.",
          detail: { directory, reason: cause instanceof Error ? cause.message : String(cause) }
        });
      }
      let terminal;
      try {
        terminal = await execute();
      } catch (error) {
        Object.assign(entry, {
          state: "failed",
          completedAt: (/* @__PURE__ */ new Date()).toISOString(),
          durationMs: Date.now() - started,
          failure: project({ message: error instanceof Error ? error.message : String(error) })
        });
        await save(entry);
        throw error;
      }
      entry.state = terminal.outcome;
      entry.completedAt = (/* @__PURE__ */ new Date()).toISOString();
      entry.durationMs = Date.now() - started;
      if (terminal.outcome === "succeeded") entry.result = project(terminal.result);
      else entry.failure = project(terminal.failure);
      entry.artifacts = terminal.artifacts.slice(0, 64).map((ref) => ({ ...ref, available: false }));
      for (const [index, artifact] of entry.artifacts.entries()) {
        if (artifact.mediaType !== "image/png" && artifact.kind !== "png") continue;
        try {
          if (!artifact.uri) throw new Error("Producer returned no image URI");
          const path = artifact.uri.startsWith("file:") ? fileURLToPath(artifact.uri) : resolve(root, artifact.uri);
          if ((await stat(path)).size > MAX_IMAGE) throw new Error("Screenshot exceeds 32 MiB");
          const bytes = await readFile(path);
          if (bytes.length > MAX_IMAGE) throw new Error("Screenshot exceeds 32 MiB");
          if (digest(bytes) !== artifact.digest) throw new Error("Producer image digest mismatch");
          if (bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a")
            throw new Error("Producer image is not PNG");
          const folder = join(directory, entry.id, "artifacts");
          await mkdir(folder, { recursive: true });
          await writeFile(join(folder, `${index}.png`), bytes, { mode: 384 });
          artifact.available = true;
        } catch (error) {
          artifact.unavailableReason = error instanceof Error ? error.message : String(error);
        }
      }
      await save(entry);
      return terminal;
    }
  };
}
function createOperationHistoryTools(defaultRoot) {
  const root = { type: "string" };
  const create = (operation, properties, required, execute) => {
    const schema = {
      type: "object",
      properties: { root, ...properties },
      required: defaultRoot ? required : ["root", ...required],
      additionalProperties: false
    };
    return defineTool(
      {
        id: `engine.history.${operation}`,
        title: `Engine operation history ${operation}`,
        summary: "Read durable Engine command history without starting a game or View.",
        realm: "host",
        argsSchema: toolJsonSchema(schema),
        resultSchema: toolJsonSchema({ type: "object" }),
        evidence: [],
        inputSchema: schema
      },
      async (value) => {
        const args = value;
        return execute(await createOperationHistoryStore(String(args.root ?? defaultRoot)), args);
      }
    );
  };
  return [
    create(
      "list",
      { limit: { type: "integer", minimum: 1, maximum: 100 }, before: { type: "string" } },
      [],
      (store, args) => store.list(args)
    ),
    create("get", { id: { type: "string" } }, ["id"], (store, args) => store.get(String(args.id))),
    create(
      "artifact.read",
      { id: { type: "string" }, index: { type: "integer", minimum: 0, maximum: 63 } },
      ["id", "index"],
      (store, args) => store.readArtifact(String(args.id), Number(args.index))
    )
  ];
}

export { createOperationHistoryStore, createOperationHistoryTools };
//# sourceMappingURL=chunk-ZYPIUSIT.mjs.map
//# sourceMappingURL=chunk-ZYPIUSIT.mjs.map