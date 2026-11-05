#!/usr/bin/env node
import { runStateDirectory, createRunSnapshot } from './chunk-OMR3CVHO.mjs';
import { DEV_EXECUTION_TIMEOUT_MS, environmentExecutionWorkers, DEV_PREPARATION_TIMEOUT_MS } from './chunk-UTXAIODQ.mjs';
import { environmentAnimationPlayback, animationPlayback } from './chunk-6AKTNSSW.mjs';
import { isFilesystemPathWithin } from './chunk-X5IGMUF7.mjs';
import { spawn } from 'child_process';
import { randomUUID, createHash } from 'crypto';
import { once } from 'events';
import { createWriteStream } from 'fs';
import { mkdir, writeFile, access, unlink, stat, readFile, realpath, readdir } from 'fs/promises';
import { createServer, request } from 'http';
import { homedir } from 'os';
import { resolve, dirname, join, relative } from 'path';
import { fileURLToPath } from 'url';
import { isExecutionReport } from '@forgeax/engine-app';
import { WebSocketServer, WebSocket } from 'ws';

var excluded = /* @__PURE__ */ new Set([
  ".git",
  ".forgeax",
  ".forgeax-debug",
  ".forgeax-harness",
  ".worktrees",
  "node_modules",
  "dist",
  "artifacts",
  "coverage",
  ".DS_Store"
]);
var documentationExtensions = /* @__PURE__ */ new Set([".md", ".mdx", ".txt"]);
var binaryExtensions = /* @__PURE__ */ new Set([
  ".basis",
  ".bmp",
  ".dds",
  ".gif",
  ".glb",
  ".ico",
  ".jpeg",
  ".jpg",
  ".ktx",
  ".ktx2",
  ".mp3",
  ".ogg",
  ".png",
  ".wav",
  ".webp",
  ".wasm"
]);
function isAuthorFile(name) {
  const dot = name.lastIndexOf(".");
  return dot < 0 || !documentationExtensions.has(name.slice(dot).toLowerCase());
}
function isReferenceSource(name) {
  const dot = name.lastIndexOf(".");
  return dot < 0 || !binaryExtensions.has(name.slice(dot).toLowerCase());
}
function isTestSource(path) {
  const normalized = path.replace(/\\/g, "/");
  return normalized.includes("/__tests__/") || /(?:^|\/)[^/]+\.test\.[^/]+$/.test(normalized);
}
function hashFile(hash, file) {
  hash.update(
    JSON.stringify([
      file.key,
      file.metadata.dev.toString(),
      file.metadata.ino.toString(),
      file.metadata.size.toString(),
      file.metadata.mtimeNs.toString(),
      file.metadata.ctimeNs.toString(),
      file.metadata.mode.toString()
    ])
  );
}
function documentationReferences(source) {
  const references = /* @__PURE__ */ new Map();
  const patterns = [
    {
      pattern: /\b(?:import|export)\b[^'"`\r\n]*?\bfrom\b\s*['"`]([^'"`\r\n]+)['"`]/g,
      base: "source"
    },
    { pattern: /\bimport\s*['"`]([^'"`\r\n]+)['"`]/g, base: "source" },
    { pattern: /\bimport\s*\(\s*['"`]([^'"`\r\n]+)['"`]\s*\)/g, base: "source" },
    {
      // fetch() is resolved against document.baseURI. The generated host's
      // document root is the project root, so this is not source-relative.
      pattern: /\bfetch\s*\(\s*['"`]([^'"`\r\n]+)['"`]/g,
      base: "project"
    },
    {
      // readFile() is resolved against the process cwd, which an external
      // live project cannot prove from the authored module. Include all docs
      // for relative and absolute calls rather than silently missing one.
      pattern: /\b(?:[A-Za-z_$][\w$]*\.)?readFile(?:Sync)?\s*\(\s*['"`]([^'"`\r\n]+)['"`]/g,
      base: "unknown"
    },
    {
      pattern: /\b(?:require)\s*\(\s*['"`]([^'"`\r\n]+)['"`]/g,
      base: "source"
    }
  ];
  for (const { pattern, base } of patterns) {
    for (const match of source.matchAll(pattern)) {
      const reference = match[1];
      if (reference === void 0) continue;
      const query = reference.search(/[?#]/);
      const path = query < 0 ? reference : reference.slice(0, query);
      const extension = path.slice(path.lastIndexOf(".")).toLowerCase();
      if (documentationExtensions.has(extension)) references.set(`${base}:${path}`, { path, base });
    }
  }
  const urlPattern = /\bnew\s+URL\s*\(\s*['"`]([^'"`\r\n]+)['"`]\s*(?:,\s*([^)]*))?\)/g;
  for (const match of source.matchAll(urlPattern)) {
    const reference = match[1];
    if (reference === void 0) continue;
    const query = reference.search(/[?#]/);
    const path = query < 0 ? reference : reference.slice(0, query);
    const extension = path.slice(path.lastIndexOf(".")).toLowerCase();
    if (!documentationExtensions.has(extension)) continue;
    const base = match[2]?.trim() === "import.meta.url" ? "source" : "unknown";
    references.set(`${base}:${path}`, { path, base });
  }
  return [...references.values()];
}
function resolveDocumentationReference(projectRoot, sourcePath, reference, base) {
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(reference)) return void 0;
  const candidate = reference.startsWith("/") ? resolve(projectRoot, `.${reference}`) : base === "project" ? resolve(projectRoot, reference) : resolve(sourcePath, "..", reference);
  return isFilesystemPathWithin(projectRoot, candidate) ? candidate : void 0;
}
function hasDynamicDocumentationDependency(source) {
  const staticModuleUrlCall = /\b(?:[A-Za-z_$][\w$]*\.)?readFile(?:Sync)?\s*\(\s*new\s+URL\s*\(\s*['"`][^'"`]*['"`]\s*,\s*import\.meta\.url\s*\)/g;
  const dynamicSource = source.replace(staticModuleUrlCall, "");
  const dynamicCall = /(?<![.$\w])(?:import|require|fetch|readFile(?:Sync)?|URL)\s*\(\s*(?!['"`])(?=[^)\s])[\s\S]/;
  const dynamicTemplate = /\b(?:import|require|fetch|(?:[A-Za-z_$][\w$]*\.)?readFile(?:Sync)?|URL)\s*\(\s*`(?:\\.|[^`\\])*\$\{/s;
  const dynamicUrl = /\bnew\s+URL\s*\(\s*(?!['"`])(?=[^)\s])[\s\S]/;
  const aliasedReaderImport = /\bimport\s*\{[\s\S]*?\b(?:readFile|readFileSync)\s+as\s+[A-Za-z_$][\w$]*[\s\S]*?\}\s*from\s*['"`][^'"`]+['"`]/;
  const aliasedReaderDestructure = /\b(?:const|let|var)\s*\{[\s\S]*?\b(?:readFile|readFileSync)\s*:\s*[A-Za-z_$][\w$]*[\s\S]*?\}\s*=/;
  const namespaceReader = /\b(?:[A-Za-z_$][\w$]*\.)+(?:readFile|readFileSync)\b/;
  return /\bimport\.meta\.glob(?:Eager)?\s*\(/.test(dynamicSource) || dynamicCall.test(dynamicSource) || dynamicTemplate.test(dynamicSource) || dynamicUrl.test(dynamicSource) || aliasedReaderImport.test(source) || aliasedReaderDestructure.test(source) || namespaceReader.test(source);
}
async function readLiveProjectInputs(root, inputPaths) {
  const projectRoot = resolve(root);
  const hash = createHash("sha256");
  const authorFiles = [];
  const documentationFiles = [];
  async function directory(path, relative2, ancestors) {
    const canonical = await realpath(path);
    if (ancestors.has(canonical)) throw new Error(`Cyclic project input directory: ${path}`);
    const next = /* @__PURE__ */ new Set([...ancestors, canonical]);
    const names = (await readdir(path)).filter((name) => !excluded.has(name)).sort();
    for (let offset = 0; offset < names.length; offset += 32) {
      const rows = await Promise.all(
        names.slice(offset, offset + 32).map(async (name) => ({
          name,
          metadata: await stat(join(path, name), { bigint: true })
        }))
      );
      for (const { name, metadata } of rows) {
        const key = `${relative2}/${name}`;
        if (metadata.isDirectory()) {
          await directory(join(path, name), key, next);
        } else if (metadata.isFile()) {
          const file = {
            path: join(path, name),
            key,
            metadata: {
              dev: metadata.dev,
              ino: metadata.ino,
              size: metadata.size,
              mtimeNs: metadata.mtimeNs,
              ctimeNs: metadata.ctimeNs,
              mode: metadata.mode
            }
          };
          if (isAuthorFile(name)) {
            authorFiles.push(file);
            hashFile(hash, file);
          } else {
            documentationFiles.push(file);
          }
        } else {
          throw new Error(`Unsupported project input: ${join(path, name)}`);
        }
      }
    }
  }
  if (inputPaths === void 0 || inputPaths.includes(projectRoot)) {
    await directory(projectRoot, "", /* @__PURE__ */ new Set());
  } else {
    const assets = join(projectRoot, "assets");
    let assetsExist = true;
    try {
      await stat(assets);
    } catch (cause) {
      if (cause.code !== "ENOENT") throw cause;
      assetsExist = false;
    }
    if (assetsExist) await directory(assets, "/assets", /* @__PURE__ */ new Set());
    const admitted = new Set(authorFiles.map((file) => resolve(file.path)));
    for (let start = 0; start < inputPaths.length; start += 32) {
      const rows = await Promise.all(
        inputPaths.slice(start, start + 32).map(async (path) => {
          path = resolve(path);
          if (admitted.has(path)) return;
          try {
            return { path, metadata: await stat(path, { bigint: true }) };
          } catch (cause) {
            if (cause.code !== "ENOENT" && cause.code !== "ENOTDIR")
              throw cause;
            return { path, metadata: void 0 };
          }
        })
      );
      for (const row of rows) {
        if (!row) continue;
        const key = relative(projectRoot, row.path);
        if (row.metadata === void 0) hash.update(JSON.stringify([key, "absent"]));
        else hashFile(hash, { path: row.path, key, metadata: row.metadata });
      }
    }
    return hash.digest("hex");
  }
  const referenced = /* @__PURE__ */ new Set();
  let includeAllDocumentation = false;
  const referenceFiles = authorFiles.filter(
    (file) => isReferenceSource(file.path) && !isTestSource(file.path)
  );
  for (let offset = 0; offset < referenceFiles.length; offset += 32) {
    const rows = await Promise.all(
      referenceFiles.slice(offset, offset + 32).map(async (file) => {
        try {
          return { file, source: await readFile(file.path, "utf8") };
        } catch (cause) {
          throw new Error(
            `Cannot read live project input ${file.path}: ${cause instanceof Error ? cause.message : String(cause)}`,
            { cause }
          );
        }
      })
    );
    for (const { file, source } of rows) {
      if (hasDynamicDocumentationDependency(source)) includeAllDocumentation = true;
      for (const { path, base } of documentationReferences(source)) {
        if (path.includes("*")) {
          includeAllDocumentation = true;
          continue;
        }
        if (base === "unknown") {
          includeAllDocumentation = true;
          continue;
        }
        const resolved = resolveDocumentationReference(projectRoot, file.path, path, base);
        if (resolved !== void 0) referenced.add(resolved);
      }
    }
  }
  for (const file of documentationFiles.sort((left, right) => left.key.localeCompare(right.key))) {
    if (includeAllDocumentation || referenced.has(resolve(file.path))) hashFile(hash, file);
  }
  return hash.digest("hex");
}

// src/live-dev.ts
var CLI_ENTRY = fileURLToPath(new URL("./cli.mjs", import.meta.url));
var LIVE_DEV_POLL_INTERVAL_MS = 100;
var LIVE_DEV_REQUEST_TIMEOUT = "live-request-timeout: the owner did not respond";
function ciCaptureViewport() {
  if (process.env.FORGEAX_BROWSER_CI_LIGHTWEIGHT !== "1") return {};
  const readPositive = (name, fallback) => {
    const value = Number.parseInt(process.env[name] ?? "", 10);
    return Number.isSafeInteger(value) && value > 0 ? value : fallback;
  };
  return {
    width: readPositive("FORGEAX_BROWSER_CI_VIEWPORT_WIDTH", 320),
    height: readPositive("FORGEAX_BROWSER_CI_VIEWPORT_HEIGHT", 180)
  };
}
function sessionPath(root, snapshot = false) {
  if (snapshot) return resolve(runStateDirectory(root), "session.json");
  return resolve(root, ".forgeax", "dev-session.json");
}
function publicStatus(status) {
  const { loadId: _load, worldIdentity: _world, generation: _generation, ...value } = status;
  return value;
}
function observationValue(value, revision) {
  const result = value;
  if (Array.isArray(result.matches))
    return {
      ...result,
      matches: result.matches.map(
        ({ entity, ...entry }) => ({
          ...entry,
          ref: `${revision}/${entity}`
        })
      )
    };
  const { entity: _entity, ...rest } = result;
  return rest;
}
function jsonResponse(response, status, value) {
  response.statusCode = status;
  response.setHeader("content-type", "application/json");
  response.end(`${JSON.stringify(value)}
`);
}
async function body(request) {
  let raw = "";
  for await (const chunk of request) raw += String(chunk);
  if (raw.trim().length === 0) return {};
  return JSON.parse(raw);
}
function commandError(code, hint, detail = {}) {
  return { code, expected: "the live DevKit service to accept the request", hint, detail };
}
async function writeSessionFile(state) {
  await mkdir(dirname(state.sessionPath), { recursive: true });
  await writeFile(
    state.sessionPath,
    `${JSON.stringify({
      root: state.root,
      sessionPath: state.sessionPath,
      ...state.controlToken ? { controlToken: state.controlToken } : {},
      endpoint: state.status.endpoint,
      pid: state.status.pid,
      revision: state.status.revision,
      loadId: state.status.loadId
    })}
`,
    { encoding: "utf8", mode: 384 }
  );
}
async function waitForFirstFrame(session, timeoutMs = DEV_EXECUTION_TIMEOUT_MS) {
  const realm = session.execution?.realm ?? session.page;
  let observation;
  try {
    observation = await realm.waitForFunction(
      () => {
        const fatal = document.querySelector("#forgeax-fatal");
        if (fatal?.checkVisibility())
          return (document.querySelector("#forgeax-fatal-details")?.textContent?.trim() || fatal.textContent?.trim() || "Engine startup failed").slice(0, 16384);
        return document.documentElement.dataset.forgeaxFrameSubmitted !== void 0;
      },
      void 0,
      { timeout: timeoutMs ?? 0 }
    );
  } catch {
    return false;
  }
  try {
    const result = await observation.jsonValue();
    if (typeof result === "string")
      throw Object.assign(new Error(`live-startup-failed: ${result}`), {
        code: "live-startup-failed",
        detail: { reason: result }
      });
    return result === true;
  } finally {
    await observation.dispose();
  }
}
async function submittedFrameId(session) {
  const realm = session.execution?.realm ?? session.page;
  const value = await realm.evaluate(() => document.documentElement.dataset.forgeaxFrameSubmitted);
  if (value === void 0) return void 0;
  const frame = Number(value);
  return Number.isSafeInteger(frame) ? frame : void 0;
}
async function waitForFrameAfter(session, previous) {
  const realm = session.execution?.realm ?? session.page;
  await realm.waitForFunction(
    (before) => Number(document.documentElement.dataset.forgeaxFrameSubmitted) > (before ?? 0),
    previous,
    { timeout: 12e4 }
  );
}
async function waitForProfilerCompletion(state, previousFrame, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let frameId = previousFrame;
  while (Date.now() < deadline) {
    if (state.session === void 0)
      throw bridgeError("live-not-ready", "The live session closed.");
    await waitForFrameAfter(state.session, frameId);
    frameId = await submittedFrameId(state.session);
    const active = await bridgeEval(state, "return profiler?.activeCaptureId() ?? null;", 5e3);
    if (active === null || active === void 0) return frameId;
  }
  throw bridgeError(
    "profile-capture-timeout",
    "The live profiler did not finish before the bounded frame window."
  );
}
function rhiCaptureScript(runId) {
  return `return (async () => {
    if (rhiCapture === undefined) return { ok: false, error: { code: 'capture-unavailable', hint: 'Start dev with RHI diagnostics enabled.' } };
    // Software WebGPU can need more than the recorder's 30 s default to
    // snapshot a full live resource set. Keep this a bounded diagnostic wait,
    // but align it with the route's 120 s bridge deadline rather than failing
    // a valid capture midway through readback.
    const captured = await rhiCapture.captureFrame({ snapshotTimeoutMs: 120_000 });
    if (!captured.ok) return { ok: false, error: captured.error };
    // Resumable chunked upload: renderer memory stays bounded to a few chunks.
    const uploaded = await rhiCapture.upload(captured.value, { runId: ${JSON.stringify(runId)} });
    if (!uploaded.ok) return { ok: false, error: uploaded.error };
    return { ok: true, value: { ...uploaded.value, source: 'live', runId: ${JSON.stringify(runId)} } };
  })();`;
}
function assertLiveIdentity(state, args) {
  if (args.revision !== void 0 && args.revision !== state.status.revision) {
    return commandError(
      "live-revision-stale",
      "The runtime changed; inspect the current scene before repeating this operation.",
      { revision: state.status.revision }
    );
  }
  if (typeof args.ref === "string") {
    const [revision, rawEntity, extra] = args.ref.split("/");
    const entity = Number(rawEntity);
    if (extra !== void 0 || rawEntity === void 0 || !Number.isSafeInteger(entity) || entity < 0) {
      return commandError("live-reference-invalid", "Use an unmodified ref returned by dev find.");
    }
    if (revision !== state.status.revision)
      return commandError(
        "live-revision-stale",
        "This entity reference belongs to an older runtime; use dev find again."
      );
    args.entity = entity;
  }
  return void 0;
}
function assertRuntimeHealth(status) {
  const execution = status.execution;
  if (!isExecutionReport(execution) || execution.world.identity !== status.worldIdentity) {
    return commandError(
      "live-verification-unavailable",
      "The current execution report is unavailable.",
      {
        revision: status.revision
      }
    );
  }
  if (execution.fault !== null || execution.engine.health !== "running" || execution.world.health !== "healthy" || execution.world.partialWrite || execution.render !== void 0 && execution.render.state !== "alive") {
    return commandError(
      "live-runtime-failed",
      "Repair the execution fault before verifying again.",
      {
        execution
      }
    );
  }
  if (execution.frame.completed < 1) {
    return commandError(
      "live-verification-unavailable",
      "No completed Engine frame has been observed."
    );
  }
  return void 0;
}
async function refreshFrameStatus(state) {
  if (state.session === void 0) return;
  const frameId = await submittedFrameId(state.session);
  if (frameId !== void 0) state.status = { ...state.status, frameId };
}
function bridgeError(code, hint) {
  const error = new Error(hint);
  error.code = code;
  return error;
}
function bridgeRequest(state, request, timeoutMs = 1e4) {
  if (state.bridge?.readyState !== WebSocket.OPEN) {
    return {
      promise: Promise.reject(
        bridgeError(
          "live-app-bridge-unavailable",
          "The actual App execution bridge is not connected."
        )
      ),
      started: () => false,
      cancel: () => Promise.resolve(false)
    };
  }
  const id = state.bridgeNextId++;
  const progress = { started: false };
  const promise = new Promise((resolveResult, rejectResult) => {
    const timer = timeoutMs === null ? void 0 : setTimeout(() => {
      state.bridgePending.delete(id);
      rejectResult(
        bridgeError(
          "live-app-bridge-timeout",
          "The actual App execution bridge did not answer before the deadline."
        )
      );
    }, timeoutMs);
    state.bridgePending.set(id, {
      resolve: resolveResult,
      reject: rejectResult,
      timer,
      progress,
      cancelResolve: void 0
    });
    try {
      state.bridge?.send(
        JSON.stringify({
          id,
          ...request
        })
      );
    } catch (error) {
      if (timer !== void 0) clearTimeout(timer);
      state.bridgePending.delete(id);
      rejectResult(error);
    }
  }).then((payload) => {
    if (payload !== null && typeof payload === "object" && Reflect.get(payload, "ok") === false) {
      const error = Reflect.get(payload, "error");
      const errorRecord = error !== null && typeof error === "object" ? error : void 0;
      throw bridgeError(
        typeof errorRecord?.code === "string" ? errorRecord.code : "live-app-eval-failed",
        typeof errorRecord?.hint === "string" ? errorRecord.hint : "The App evaluation failed."
      );
    }
    return payload !== null && typeof payload === "object" && Reflect.get(payload, "ok") === true ? Reflect.get(payload, "value") : payload;
  });
  return {
    promise,
    started: () => progress.started,
    cancel: () => {
      const pending = state.bridgePending.get(id);
      if (pending === void 0) return Promise.resolve(true);
      const outcome = new Promise((resolve3) => {
        pending.cancelResolve = resolve3;
      });
      try {
        state.bridge?.send(JSON.stringify({ type: "cancel", id }));
      } catch {
        pending.cancelResolve?.(true);
        pending.cancelResolve = void 0;
      }
      return outcome;
    }
  };
}
function bridgeCall(state, code, timeoutMs = 1e4, worldIdentity = state.status.worldIdentity ?? null) {
  return bridgeRequest(
    state,
    {
      type: "eval",
      code,
      ...worldIdentity === null ? {} : { worldIdentity }
    },
    timeoutMs
  );
}
function bridgeEval(state, code, timeoutMs = 1e4) {
  return bridgeCall(state, code, timeoutMs).promise;
}
function revokeLiveInput(state) {
  try {
    if (state.bridge?.readyState === WebSocket.OPEN)
      state.bridge.send(JSON.stringify({ type: "input-clear" }));
  } catch {
  }
}
function openLiveInput(state) {
  try {
    if (state.bridge?.readyState === WebSocket.OPEN)
      state.bridge.send(JSON.stringify({ type: "input-lease-open" }));
  } catch {
  }
}
function finishLiveProfiler(state, expected) {
  try {
    if (state.bridge?.readyState === WebSocket.OPEN)
      state.bridge.send(JSON.stringify({ type: "profile-finish", ...expected ?? {} }));
  } catch {
  }
}
async function refreshBridgeStatus(state) {
  if (state.bridge?.readyState !== WebSocket.OPEN) {
    state.status = { ...state.status, bridgeConnected: false };
    return false;
  }
  const bridge = state.bridge;
  const value = await bridgeRequest(state, { type: "status" }).promise;
  if (state.bridge !== bridge || isStopped(state)) return false;
  const record = value;
  if (typeof record.worldIdentity !== "string")
    throw bridgeError(
      "live-world-identity-missing",
      "The App bridge did not publish a World identity."
    );
  const worldReplaced = state.status.worldIdentity !== void 0 && state.status.worldIdentity !== record.worldIdentity;
  state.status = {
    ...state.status,
    ...worldReplaced ? {
      generation: state.status.generation + 1,
      revision: randomUUID(),
      loadId: randomUUID(),
      error: void 0
    } : {},
    phase: state.status.phase,
    worldIdentity: record.worldIdentity,
    workers: record.workers,
    execution: record.execution,
    bridgeConnected: true
  };
  if (state.status.phase === "waiting" && !state.reloadRequested && state.reloadInFlight === void 0 && state.session !== void 0 && await submittedFrameId(state.session) !== void 0)
    state.status = { ...state.status, phase: "ready", error: void 0 };
  if (worldReplaced) await writeSessionFile(state);
  return true;
}
async function requireCurrentBridge(state, response) {
  try {
    if (!await reconcileProjectInputs(state)) {
      jsonResponse(response, 409, {
        ok: false,
        error: commandError(
          "live-not-ready",
          state.status.error ?? "Project inputs changed; wait for the new runtime."
        )
      });
      return false;
    }
    if (state.reloadInFlight !== void 0 || state.reloadRequested || state.status.phase === "reloading") {
      jsonResponse(response, 409, {
        ok: false,
        error: commandError("live-not-ready", "Project inputs changed; wait for the new runtime.")
      });
      return false;
    }
    if (state.status.phase === "failed") {
      jsonResponse(response, 409, {
        ok: false,
        error: commandError("live-not-ready", state.status.error ?? "Project startup failed.")
      });
      return false;
    }
    if (await refreshBridgeStatus(state)) return true;
  } catch (error) {
    jsonResponse(response, 409, {
      ok: false,
      error: commandError(
        typeof error?.code === "string" ? error.code ?? "live-app-bridge-unavailable" : "live-app-bridge-unavailable",
        error instanceof Error ? error.message : "The actual App execution realm is not available for this request."
      )
    });
    return false;
  }
  jsonResponse(response, 409, {
    ok: false,
    error: commandError(
      "live-app-bridge-unavailable",
      "The actual App execution realm is not connected; wait for dev status to report ready."
    )
  });
  return false;
}
function rejectBridgePending(state, error) {
  for (const pending of state.bridgePending.values()) {
    if (pending.timer !== void 0) clearTimeout(pending.timer);
    pending.cancelResolve?.(false);
    pending.reject(error);
  }
  state.bridgePending.clear();
}
function installBridgeRelay(state) {
  const server = state.server;
  if (server === void 0) return;
  const bridgeServer = new WebSocketServer({ noServer: true });
  state.bridgeServer = bridgeServer;
  server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    if (url.pathname !== "/bridge") {
      socket.destroy();
      return;
    }
    bridgeServer.handleUpgrade(
      request,
      socket,
      head,
      (client) => bridgeServer.emit("connection", client, request)
    );
  });
  bridgeServer.on("connection", (client) => {
    state.bridge?.close();
    state.bridge = client;
    state.status = { ...state.status, bridgeConnected: true };
    client.on("message", (raw) => {
      let message;
      try {
        message = JSON.parse(String(raw));
      } catch {
        return;
      }
      const id = message.id;
      if (id === void 0 || !Number.isSafeInteger(id)) return;
      const pending = state.bridgePending.get(id);
      if (pending === void 0) return;
      if (message.type === "started") {
        pending.progress.started = true;
        return;
      }
      if (message.type === "canceled") {
        const admitted = message.admitted === true;
        pending.cancelResolve?.(admitted);
        pending.cancelResolve = void 0;
        if (!admitted) {
          if (pending.timer !== void 0) clearTimeout(pending.timer);
          state.bridgePending.delete(id);
          pending.reject(
            bridgeError(
              "live-eval-cancelled-before-execution",
              "The evaluation was cancelled before it started."
            )
          );
        } else {
          pending.progress.started = true;
        }
        return;
      }
      if (message.type !== "result") return;
      if (pending.timer !== void 0) clearTimeout(pending.timer);
      state.bridgePending.delete(id);
      pending.cancelResolve?.(true);
      pending.resolve(message.payload);
    });
    client.on("close", () => {
      if (state.bridge !== client) return;
      state.bridge = void 0;
      state.status = {
        ...state.status,
        bridgeConnected: false,
        phase: state.status.phase === "ready" ? "waiting" : state.status.phase
      };
      rejectBridgePending(
        state,
        bridgeError(
          "live-app-bridge-disconnected",
          "The actual App execution bridge disconnected."
        )
      );
    });
    client.on("error", () => void 0);
  });
}
async function openSession(state) {
  const stopped = () => state.status.phase === "stopped";
  if (stopped()) return;
  const loadId = randomUUID();
  const revision = randomUUID();
  state.status = {
    ...state.status,
    revision,
    loadId,
    generation: state.status.generation + 1,
    phase: "starting",
    unfinishedEval: false,
    bridgeConnected: false,
    worldIdentity: void 0,
    frameId: void 0,
    workers: void 0,
    execution: void 0,
    backend: "unknown",
    fallbackReason: void 0,
    carrier: "private-browser",
    carrierTarget: void 0,
    carrierFallbackReason: void 0,
    error: void 0
  };
  await writeSessionFile(state);
  try {
    await replaceProjectProcess(state, state.status.generation);
    if (stopped()) return;
    const { createBrowserCapture } = await import('./browser-capture-XOLMW2LK.mjs');
    if (stopped()) return;
    state.browser ??= createBrowserCapture(state.executionRoot);
    state.session = await state.browser.open({
      backend: state.status.backendRequested,
      headless: state.status.headless,
      launchProfile: "development",
      ...ciCaptureViewport(),
      outputDir: resolve(
        process.env.XDG_DATA_HOME ?? (process.platform === "darwin" ? resolve(homedir(), "Library/Application Support") : process.platform === "win32" ? process.env.LOCALAPPDATA ?? resolve(homedir(), "AppData/Local") : resolve(homedir(), ".local/share")),
        "ForgeaX/artifacts",
        revision
      ),
      ...state.projectUrl === void 0 ? {} : { serverUrl: state.projectUrl },
      ...state.carrier === void 0 ? {} : {
        carrier: state.carrier,
        carrierGeneration: state.status.generation,
        ...state.carrierRun === void 0 ? {} : { carrierRun: state.carrierRun }
      }
    });
    if (stopped()) {
      await state.session.close();
      return;
    }
    if (state.snapshot) {
      const append = (level, text) => {
        state.logs.push({ sequence: ++state.logSequence, level, text: text.slice(0, 4096) });
        if (state.logs.length > 100) state.logs.shift();
      };
      state.session.page.on("console", (message) => append(message.type(), message.text()));
      state.session.page.on("pageerror", (error) => append("error", error.message));
      state.session.page.on("close", () => {
        if (!stopped() && state.reloadInFlight === void 0)
          state.status = { ...state.status, phase: "failed", error: "run-page-lost" };
      });
    }
    const browserReport = state.session.report();
    state.status = {
      ...state.status,
      backend: browserReport.backend,
      fallbackReason: browserReport.fallbackReason,
      carrier: browserReport.carrier,
      carrierTarget: browserReport.carrierTarget,
      carrierFallbackReason: browserReport.carrierFallbackReason
    };
    if (!state.status.headless && state.status.carrier === "private-browser") {
      await state.session.page.bringToFront();
    }
    const { readProjectStartupTimeoutMs } = await import('./project-Z2UXJBZO.mjs');
    const startupPolicy = await readProjectStartupTimeoutMs(state.executionRoot);
    if (!startupPolicy.ok) throw startupPolicy.error;
    const firstFrame = await waitForFirstFrame(
      state.session,
      startupPolicy.value === void 0 ? DEV_EXECUTION_TIMEOUT_MS : startupPolicy.value
    );
    if (stopped()) return;
    const connected = firstFrame && await refreshBridgeStatus(state).catch(() => false);
    if (stopped()) return;
    if (!connected) {
      const errors = state.session.report().pageErrors;
      state.status = {
        ...state.status,
        phase: errors.length > 0 ? "failed" : "waiting",
        url: state.session.url,
        frameId: await submittedFrameId(state.session),
        error: errors[0] ?? "live-app-bridge-unavailable: the actual App execution realm has not connected"
      };
    } else {
      state.status = {
        ...state.status,
        phase: state.reloadRequested ? "reloading" : "ready",
        url: state.session.url,
        frameId: await submittedFrameId(state.session)
      };
    }
  } catch (error) {
    await stopProjectProcess(state);
    if (stopped()) return;
    state.status = {
      ...state.status,
      phase: "failed",
      error: error instanceof Error ? error.message : String(error)
    };
  }
  await writeSessionFile(state);
}
async function reloadSession(state) {
  if (state.reloadInFlight !== void 0) {
    state.reloadRequested = true;
    return state.reloadInFlight;
  }
  const operation = (async () => {
    do {
      state.reloadRequested = false;
      await reloadSessionOwned(state);
    } while (state.reloadRequested && state.status.phase !== "stopped");
  })();
  state.reloadInFlight = operation.finally(() => {
    state.reloadInFlight = void 0;
  });
  return state.reloadInFlight;
}
async function reloadSessionOwned(state) {
  if (state.status.phase === "stopped") return;
  try {
    state.inputs = await checkProjectInputs(state);
  } catch (error) {
    failProjectInputs(state, error);
    return;
  }
  if (isStopped(state)) return;
  state.observation = void 0;
  state.status = {
    ...state.status,
    phase: "reloading",
    generation: state.status.generation + 1,
    revision: randomUUID(),
    loadId: randomUUID()
  };
  await writeSessionFile(state);
  rejectBridgePending(
    state,
    bridgeError("live-reload-cancelled", "The previous App execution was destroyed by reload.")
  );
  state.bridge?.close();
  await stopProjectProcess(state);
  await state.session?.close();
  state.session = void 0;
  state.evalRunning = false;
  state.status = { ...state.status, unfinishedEval: false };
  const latestInputs = await checkProjectInputs(state);
  if (latestInputs !== state.inputs) {
    state.inputs = latestInputs;
    state.reloadRequested = true;
    return;
  }
  await openSession(state);
  await reconcileProjectInputs(state);
  await writeSessionFile(state);
}
function isStopped(state) {
  return state.status.phase === "stopped";
}
function checkProjectInputs(state) {
  if (state.snapshot) return Promise.resolve(state.inputSnapshot?.version ?? "snapshot-not-ready");
  state.inputCheck ??= readLiveProjectInputs(state.root, state.projectInputPaths).finally(() => {
    state.inputCheck = void 0;
  });
  return state.inputCheck;
}
function failProjectInputs(state, error) {
  if (isStopped(state)) return;
  state.inputs = void 0;
  state.status = {
    ...state.status,
    phase: "failed",
    error: `live-inputs-unavailable: ${error instanceof Error ? error.message : String(error)}`
  };
}
async function reconcileProjectInputs(state) {
  if (state.snapshot) return !isStopped(state);
  if (isStopped(state)) return false;
  if (state.status.phase === "starting" && state.inputs === void 0 && state.reloadInFlight === void 0)
    return false;
  try {
    const inputs = await checkProjectInputs(state);
    if (isStopped(state)) return false;
    if (inputs === state.inputs) return true;
    state.status = { ...state.status, phase: "reloading" };
    if (state.reloadInFlight !== void 0) state.reloadRequested = true;
    else void reloadSession(state).catch((error) => failProjectInputs(state, error));
  } catch (error) {
    failProjectInputs(state, error);
  }
  return false;
}
function pollProjectInputs(state, delayMs = 1e3) {
  state.inputTimer = setTimeout(() => {
    const started = performance.now();
    const cpu = process.cpuUsage();
    void reconcileProjectInputs(state).finally(() => {
      const spent = process.cpuUsage(cpu);
      const costMs = Math.max(performance.now() - started, (spent.user + spent.system) / 1e3);
      if (!isStopped(state)) pollProjectInputs(state, Math.max(1e3, costMs * 20));
    });
  }, delayMs);
  state.inputTimer.unref();
}
async function stopProjectProcess(state) {
  const child = state.projectProcess;
  state.projectProcess = void 0;
  if (child === void 0 || child.exitCode !== null || child.signalCode !== null) return;
  await new Promise((resolveStop) => {
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      resolveStop();
    }, 2e3);
    child.once("exit", () => {
      clearTimeout(timer);
      resolveStop();
    });
    child.kill("SIGTERM");
  });
}
async function replaceProjectProcess(state, generation) {
  await stopProjectProcess(state);
  const child = spawn(
    process.execPath,
    // The daemon owns the control endpoint, while the project child owns the
    // Vite endpoint. Keep the latter OS-assigned so an unrelated 5173 listener
    // cannot hold a live session in starting/failed state. The project host
    // materializes port 0 before asking Vite to listen and reports its actual
    // URL back through the ready line.
    [
      state.snapshot ? resolve(state.executionRoot, "node_modules/@forgeax/engine/dist/bin/forgeax.mjs") : CLI_ENTRY,
      "--__forgeax-live-project",
      state.executionRoot,
      String(generation),
      "0"
    ],
    {
      env: {
        ...process.env,
        // Independent runs consume the copied package inputs, not a mutable
        // contributor build cache selected by the launching shell.
        ...state.snapshot ? { FORGEAX_SHARED_APP_INPUTS_MANIFEST: void 0 } : {},
        VITE_FORGEAX_ENGINE_BRIDGE: "1",
        VITE_FORGEAX_ENGINE_BRIDGE_PORT: new URL(state.status.endpoint).port,
        FORGEAX_EXECUTION_WORKERS: state.requestedWorkers === void 0 ? void 0 : JSON.stringify(state.requestedWorkers),
        FORGEAX_ANIMATION_PLAYBACK: JSON.stringify(state.animation),
        ...state.rhiCapture ? { FORGEAX_ENGINE_RHI_DEBUG: "1" } : {}
      },
      stdio: ["ignore", "pipe", "pipe"]
    }
  );
  state.projectProcess = child;
  const log = createWriteStream(resolve(dirname(state.sessionPath), "dev.log"), { flags: "a" });
  child.stderr?.pipe(log, { end: false });
  child.once("close", () => log.end());
  await new Promise((resolveReady, rejectReady) => {
    let output = "";
    const timer = setTimeout(
      () => rejectReady(new Error("live project backend build timed out")),
      3e5
    );
    child.stdout?.setEncoding("utf8");
    child.stdout?.on("data", (chunk) => {
      log.write(chunk);
      output += chunk;
      const lines = output.split("\n");
      output = lines.pop() ?? "";
      for (const line of lines) {
        try {
          const result = JSON.parse(line);
          if (result.ready === true && result.generation === generation) {
            clearTimeout(timer);
            state.projectUrl = result.url;
            if (!state.snapshot && result.inputPaths && result.inputVersion) {
              state.projectInputPaths = result.inputPaths;
              state.inputs = result.inputVersion;
            }
            resolveReady();
            return;
          }
          if (result.error !== void 0) {
            clearTimeout(timer);
            rejectReady(new Error(result.error));
            return;
          }
        } catch {
        }
      }
    });
    child.once("error", (error) => {
      clearTimeout(timer);
      rejectReady(error);
    });
    child.once("exit", (code) => {
      clearTimeout(timer);
      rejectReady(
        new Error(
          `live project backend exited ${code} before readiness; inspect ${resolve(dirname(state.sessionPath), "dev.log")}`
        )
      );
    });
  });
}
async function runLiveProjectProcess(rootInput, generationInput, projectPortInput = "0") {
  const root = resolve(rootInput);
  const generation = Number(generationInput);
  const projectPort = Number(projectPortInput);
  if (!Number.isSafeInteger(projectPort) || projectPort < 0 || projectPort > 65535) {
    throw new Error(`live project process received invalid project port: ${projectPortInput}`);
  }
  const startedAt = Date.now();
  process.stderr.write("live project: loading DevKit host\n");
  const { readProjectFacts } = await import('./project-Z2UXJBZO.mjs');
  const facts = await readProjectFacts(root);
  let inputPaths;
  const built = facts.ok ? await import('./host-GQJUKOJP.mjs').then(({ startDevProjectWithHost }) => {
    process.stderr.write(
      `live project: starting project backend after ${Date.now() - startedAt}ms
`
    );
    return startDevProjectWithHost({ root, json: true, port: projectPort }, (paths) => {
      inputPaths = paths;
    });
  }) : facts;
  if (!built.ok) {
    process.stderr.write(`${JSON.stringify(built.error)}
`);
    process.stdout.write(
      `${JSON.stringify({ error: `${built.error.code}: ${built.error.hint}; inspect ${resolve(root, ".forgeax/dev.log")}`, generation })}
`
    );
    process.exitCode = 1;
    return;
  }
  const url = built.ok && built.value !== null && typeof built.value === "object" && "urls" in built.value && built.value.urls !== null && typeof built.value.urls === "object" && "local" in built.value.urls && Array.isArray(built.value.urls.local) ? built.value.urls.local[0] : void 0;
  const inputVersion = await readLiveProjectInputs(root, inputPaths);
  process.stdout.write(
    `${JSON.stringify({ ready: true, generation, url, inputPaths, inputVersion })}
`
  );
  await new Promise((resolveExit) => {
    const stop = () => {
      void import('./host-GQJUKOJP.mjs').then(({ disposeDevKitHosts }) => disposeDevKitHosts()).finally(resolveExit);
    };
    process.once("SIGTERM", stop);
    process.once("SIGINT", stop);
  });
}
async function handleRequest(state, request, response) {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  if (state.controlToken && request.headers.authorization !== `Bearer ${state.controlToken}`) {
    jsonResponse(response, 403, {
      ok: false,
      error: commandError("run-unauthorized", "Use the Engine run client.")
    });
    return;
  }
  if (url.pathname === "/observe") {
    const { endpoint: _endpoint, url: _url, ...status } = state.status;
    jsonResponse(response, 200, {
      ok: true,
      value: {
        status,
        image: state.observation ?? null,
        logs: state.logs,
        firstLogSequence: state.logs[0]?.sequence ?? state.logSequence + 1,
        nextLogSequence: state.logSequence + 1,
        droppedLogs: state.logSequence - state.logs.length
      }
    });
    return;
  }
  let evalIdentity;
  let profileCaptureId;
  let profileCaptureWorldIdentity;
  let revokeLeaseForRequest;
  const clearEvalState = async () => {
    const identity = evalIdentity;
    evalIdentity = void 0;
    if (identity === void 0 || state.status.revision !== identity.revision || state.status.loadId !== identity.loadId)
      return;
    state.evalRunning = false;
    state.status = { ...state.status, unfinishedEval: false };
    await writeSessionFile(state);
  };
  if (request.method === "GET" && url.pathname === "/status") {
    if (state.reloadInFlight === void 0 && !state.reloadRequested)
      await reconcileProjectInputs(state);
    if (!state.snapshot && state.bridgePending.size === 0 && state.reloadInFlight === void 0) {
      void refreshBridgeStatus(state).then(() => refreshFrameStatus(state)).catch((error) => {
        if (state.status.phase === "ready" || state.status.phase === "waiting") {
          state.status = {
            ...state.status,
            phase: "waiting",
            error: error instanceof Error ? error.message : String(error)
          };
        }
      });
    }
    jsonResponse(response, 200, { ok: true, value: publicStatus(state.status) });
    return;
  }
  if (request.method !== "POST") {
    jsonResponse(response, 405, {
      ok: false,
      error: commandError(
        "live-method-not-allowed",
        "Use GET /status or a supported POST operation."
      )
    });
    return;
  }
  try {
    if (url.pathname === "/reload") {
      await reloadSession(state);
      jsonResponse(
        response,
        state.status.phase === "ready" ? 200 : 409,
        readyResult({ ok: true, value: publicStatus(state.status) })
      );
      return;
    }
    if (url.pathname === "/stop") {
      await stopLiveDaemon(state);
      jsonResponse(response, 200, { ok: true, value: publicStatus(state.status) });
      return;
    }
    if (url.pathname === "/rhi/capture") {
      if (state.evalRunning) {
        jsonResponse(response, 409, {
          ok: false,
          error: commandError(
            "live-eval-running",
            "RHI capture is blocked until the current evaluation completes."
          )
        });
        return;
      }
      const args = await body(request);
      if (!await requireCurrentBridge(state, response)) return;
      const before = state.status;
      const identityError = assertLiveIdentity(state, args);
      if (identityError !== void 0) {
        jsonResponse(response, 409, { ok: false, error: identityError });
        return;
      }
      if (state.session === void 0 || before.phase !== "ready") {
        jsonResponse(response, 409, {
          ok: false,
          error: commandError(
            "live-not-ready",
            "Wait for the live instance to reach a submitted frame."
          )
        });
        return;
      }
      const runId = `live-rhi-${randomUUID()}`;
      state.evalRunning = true;
      evalIdentity = { revision: before.revision, loadId: before.loadId };
      state.status = { ...state.status, unfinishedEval: true };
      await writeSessionFile(state);
      try {
        const captured = await bridgeEval(state, rhiCaptureScript(runId), 12e4);
        if (captured === null || typeof captured !== "object" || Reflect.get(captured, "ok") !== true) {
          const error = captured !== null && typeof captured === "object" && Reflect.get(captured, "error") !== void 0 ? Reflect.get(captured, "error") : commandError("capture-unavailable", "The live App did not return an RHI tape.");
          jsonResponse(response, 409, { ok: false, error });
          return;
        }
        if (!await requireCurrentBridge(state, response)) return;
        const after = state.status;
        if (before.revision !== after.revision || before.loadId !== after.loadId || before.worldIdentity !== after.worldIdentity) {
          jsonResponse(response, 409, {
            ok: false,
            error: commandError(
              "live-instance-changed",
              "The live instance changed while capturing RHI work; retry against the new status."
            )
          });
          return;
        }
        const value = Reflect.get(captured, "value");
        if (value === null || typeof value !== "object") {
          jsonResponse(response, 500, {
            ok: false,
            error: commandError(
              "capture-artifact-invalid",
              "The live RHI provider returned no artifact reference."
            )
          });
          return;
        }
        const artifact = value;
        if (typeof args.output === "string" && typeof artifact.path === "string") {
          const output = resolve(state.root, args.output);
          await mkdir(dirname(output), { recursive: true });
          await writeFile(output, await readFile(artifact.path));
          artifact.path = output;
        }
        jsonResponse(response, 200, {
          ok: true,
          value: { revision: after.revision, frameId: after.frameId, ...artifact }
        });
        return;
      } finally {
        await clearEvalState();
      }
    }
    if (url.pathname === "/capture" || url.pathname === "/verify") {
      const verifying = url.pathname === "/verify";
      if (state.captureRunning) {
        jsonResponse(response, 409, {
          ok: false,
          error: commandError("run-capture-busy", "Wait for the current capture.")
        });
        return;
      }
      state.captureRunning = true;
      await state.observationInFlight;
      try {
        if (state.evalRunning) {
          jsonResponse(response, 409, {
            ok: false,
            error: commandError(
              "live-eval-running",
              "Capture is blocked until the current evaluation completes."
            )
          });
          return;
        }
        const args = await body(request);
        if (verifying && typeof args.revision !== "string") {
          jsonResponse(response, 400, {
            ok: false,
            error: commandError(
              "live-revision-required",
              "Pass the revision of the execution to verify."
            )
          });
          return;
        }
        if (verifying && args.timeoutMs !== void 0 && (!Number.isSafeInteger(args.timeoutMs) || args.timeoutMs < 1)) {
          jsonResponse(response, 400, {
            ok: false,
            error: commandError(
              "live-invalid-timeout",
              "Verification timeoutMs must be a positive integer."
            )
          });
          return;
        }
        if (!await requireCurrentBridge(state, response)) return;
        await refreshFrameStatus(state);
        const before = state.status;
        const identityError = assertLiveIdentity(state, args);
        if (identityError !== void 0) {
          jsonResponse(response, 409, { ok: false, error: identityError });
          return;
        }
        if (state.session === void 0 || before.phase !== "ready") {
          jsonResponse(response, 409, {
            ok: false,
            error: commandError(
              "live-not-ready",
              "Wait for the live instance to reach a submitted frame."
            )
          });
          return;
        }
        const healthError = verifying ? assertRuntimeHealth(before) : void 0;
        if (healthError !== void 0) {
          jsonResponse(response, 409, { ok: false, error: healthError });
          return;
        }
        try {
          await bridgeCall(state, "return simulation.observation?.camera.get();", 5e3).promise;
        } catch (error) {
          const code = typeof error?.code === "string" ? error.code : "live-camera-unavailable";
          jsonResponse(response, 409, {
            ok: false,
            error: commandError(
              code,
              error instanceof Error ? error.message : "The live World has no active camera."
            )
          });
          return;
        }
        const record = await state.session.capture(
          typeof args.checkpoint === "string" ? args.checkpoint : void 0,
          {
            purpose: verifying ? "validate" : "observe",
            ...verifying && before.frameId !== void 0 ? { afterFrameId: before.frameId } : {},
            ...verifying && args.timeoutMs !== void 0 ? { timeoutMs: args.timeoutMs } : {},
            ...args.requireUi === void 0 ? {} : { requireUi: args.requireUi },
            ...typeof args.output === "string" ? { output: args.output } : {}
          }
        );
        if (!await requireCurrentBridge(state, response)) return;
        await refreshFrameStatus(state);
        const after = state.status;
        if (before.revision !== after.revision || before.loadId !== after.loadId || before.worldIdentity !== after.worldIdentity) {
          jsonResponse(response, 409, {
            ok: false,
            error: commandError(
              "live-instance-changed",
              "The live instance changed while capturing; retry against the new status."
            )
          });
          return;
        }
        const finalHealthError = verifying ? assertRuntimeHealth(after) : void 0;
        if (finalHealthError !== void 0) {
          jsonResponse(response, 409, { ok: false, error: finalHealthError });
          return;
        }
        const report = state.session.report();
        const reportPath = `${record.output}.json`;
        const reportBytes = `${JSON.stringify({ revision: after.revision, ...verifying ? { execution: after.execution } : {}, record, consoleErrors: report.consoleErrors, pageErrors: report.pageErrors }, null, 2)}
`;
        await writeFile(reportPath, reportBytes, "utf8");
        if (verifying && (!record.ok || report.consoleErrors.length > 0 || report.pageErrors.length > 0)) {
          jsonResponse(response, 409, {
            ok: false,
            error: commandError(
              "live-runtime-failed",
              "Runtime errors were observed during verification.",
              {
                output: record.output,
                report: reportPath
              }
            )
          });
          return;
        }
        jsonResponse(response, 200, {
          ok: true,
          artifacts: [
            { kind: "png", uri: record.output, mediaType: "image/png", digest: record.digest },
            {
              kind: "tool-result",
              uri: reportPath,
              mediaType: "application/json",
              digest: `sha256:${createHash("sha256").update(reportBytes).digest("hex")}`
            }
          ],
          value: {
            revision: after.revision,
            ...verifying ? { verified: "runtime" } : {},
            ...state.snapshot ? { runId: after.runId, inputVersion: after.inputVersion } : {},
            frameId: record.runtime.engineFrameId,
            screenshot: {
              kind: "screenshot",
              uri: record.output,
              mediaType: "image/png",
              digest: record.digest
            },
            report: {
              kind: "tool-result",
              uri: reportPath,
              mediaType: "application/json",
              digest: `sha256:${createHash("sha256").update(reportBytes).digest("hex")}`
            },
            pixels: {
              width: record.pixels.width,
              height: record.pixels.height,
              rendered: record.pixels.rendered
            },
            errors: { console: report.consoleErrors.length, page: report.pageErrors.length }
          }
        });
        return;
      } finally {
        state.captureRunning = false;
      }
    }
    if (url.pathname === "/camera/get" || url.pathname === "/camera/set" || url.pathname === "/camera/release" || url.pathname === "/find" || url.pathname === "/focus") {
      if (state.evalRunning) {
        jsonResponse(response, 409, {
          ok: false,
          error: commandError(
            "live-eval-running",
            "Observation mutation is blocked until the current evaluation completes."
          )
        });
        return;
      }
      if (state.session === void 0) {
        jsonResponse(response, 409, {
          ok: false,
          error: commandError(
            "live-not-ready",
            "Wait for the live instance to reach a submitted frame."
          )
        });
        return;
      }
      const args = await body(request);
      if (!await requireCurrentBridge(state, response)) return;
      if (state.status.phase !== "ready") {
        jsonResponse(response, 409, {
          ok: false,
          error: commandError(
            "live-not-ready",
            "Wait for the live instance to reach a submitted frame."
          )
        });
        return;
      }
      const identityError = assertLiveIdentity(state, args);
      if (identityError !== void 0) {
        jsonResponse(response, 409, { ok: false, error: identityError });
        return;
      }
      if (url.pathname === "/focus" && typeof args.name === "string" === (typeof args.ref === "string")) {
        jsonResponse(response, 400, {
          ok: false,
          error: commandError("live-target-required", "Pass exactly one of --name or --ref.")
        });
        return;
      }
      const before = state.status;
      const operation = url.pathname.slice(1);
      const script = operation === "camera/get" ? "return simulation.observation?.camera.get();" : operation === "camera/release" ? "simulation.observation.release(); return simulation.observation.camera.get();" : operation === "find" ? `return simulation.observation.find(${JSON.stringify(args)});` : operation === "camera/set" ? `return simulation.observation?.camera.set(${JSON.stringify(args)});` : `return simulation.observation?.focus(${JSON.stringify(args)});`;
      const result = await bridgeEval(state, script);
      if (operation !== "camera/get" && operation !== "find")
        await waitForFrameAfter(state.session, before.frameId);
      if (!await requireCurrentBridge(state, response)) return;
      await refreshFrameStatus(state);
      if (before.revision !== state.status.revision || before.loadId !== state.status.loadId || before.worldIdentity !== state.status.worldIdentity) {
        jsonResponse(response, 409, {
          ok: false,
          error: commandError(
            "live-instance-changed",
            "The live instance or World changed while applying the camera operation; retry against the new status."
          )
        });
        return;
      }
      jsonResponse(response, 200, {
        ok: true,
        value: {
          revision: state.status.revision,
          frameId: state.status.frameId,
          ...observationValue(result, state.status.revision)
        }
      });
      return;
    }
    if (url.pathname === "/profile/capture") {
      if (state.evalRunning) {
        jsonResponse(response, 409, {
          ok: false,
          error: commandError("live-eval-running", "Profile capture is already running.")
        });
        return;
      }
      const args = await body(request);
      if (!await requireCurrentBridge(state, response)) return;
      const before = state.status;
      const identityError = assertLiveIdentity(state, args);
      if (identityError !== void 0) {
        jsonResponse(response, 409, { ok: false, error: identityError });
        return;
      }
      if (state.session === void 0 || before.phase !== "ready") {
        jsonResponse(response, 409, {
          ok: false,
          error: commandError(
            "live-not-ready",
            "Wait for the live instance to reach a submitted frame."
          )
        });
        return;
      }
      const frameLimit = typeof args.frameLimit === "number" && Number.isSafeInteger(args.frameLimit) ? Math.min(120, Math.max(1, args.frameLimit)) : 30;
      const eventLimit = typeof args.eventLimit === "number" && Number.isSafeInteger(args.eventLimit) ? Math.min(2e4, Math.max(64, args.eventLimit)) : 4096;
      state.evalRunning = true;
      evalIdentity = { revision: before.revision, loadId: before.loadId };
      profileCaptureWorldIdentity = before.worldIdentity;
      state.status = { ...state.status, unfinishedEval: true };
      await writeSessionFile(state);
      const clearProfileState = async () => {
        if (evalIdentity === void 0 || state.status.revision !== evalIdentity.revision || state.status.loadId !== evalIdentity.loadId)
          return;
        state.evalRunning = false;
        evalIdentity = void 0;
        state.status = { ...state.status, unfinishedEval: false };
        await writeSessionFile(state);
      };
      const started = await bridgeEval(
        state,
        `return (() => {
          if (profiler === undefined) return { ok: false, error: { code: 'profile-capture-unavailable', hint: 'The live App has no profiler capability.' } };
          const result = profiler.startCapture({ frameLimit: ${frameLimit}, eventLimit: ${eventLimit} });
          return result.ok ? { ok: true, captureId: result.value.captureId } : result;
        })();`,
        1e4
      );
      if (started === null || typeof started !== "object" || Reflect.get(started, "ok") !== true) {
        await clearProfileState();
        const error = started !== null && typeof started === "object" && Reflect.get(started, "error") !== void 0 ? Reflect.get(started, "error") : commandError("profile-capture-unavailable", "The live App did not start profiling.");
        jsonResponse(response, 409, { ok: false, error });
        return;
      }
      profileCaptureId = typeof Reflect.get(started, "captureId") === "string" ? Reflect.get(started, "captureId") : void 0;
      await waitForProfilerCompletion(state, before.frameId, 12e4);
      const capture = await bridgeEval(state, "return profiler?.latestCapture() ?? null;", 1e4);
      if (capture === null || typeof capture !== "object") {
        throw bridgeError(
          "profile-capture-unavailable",
          "The live profiler finished without an artifact."
        );
      }
      if (!await requireCurrentBridge(state, response)) {
        await clearProfileState();
        return;
      }
      const after = state.status;
      if (before.revision !== after.revision || before.loadId !== after.loadId || before.worldIdentity !== after.worldIdentity) {
        jsonResponse(response, 409, {
          ok: false,
          error: commandError(
            "live-instance-changed",
            "The live instance changed while profiling; retry against the new status."
          )
        });
        await clearProfileState();
        return;
      }
      const output = resolve(
        state.root,
        typeof args.output === "string" ? args.output : `.forgeax/profiles/${before.revision}-${String(Date.now())}.json`
      );
      await mkdir(dirname(output), { recursive: true });
      const bytes = `${JSON.stringify(capture, null, 2)}
`;
      await writeFile(output, bytes, "utf8");
      const digest = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
      await clearProfileState();
      profileCaptureId = void 0;
      profileCaptureWorldIdentity = void 0;
      jsonResponse(response, 200, {
        ok: true,
        value: {
          revision: after.revision,
          captureId: Reflect.get(capture, "captureId"),
          artifact: { kind: "profile-capture", uri: output, path: output, digest }
        }
      });
      return;
    }
    if (url.pathname === "/eval") {
      const args = await body(request);
      if (typeof args.revision !== "string") {
        jsonResponse(response, 400, {
          ok: false,
          error: commandError(
            "live-revision-required",
            "Pass --revision from dev status before evaluating code."
          )
        });
        return;
      }
      if (typeof args.code !== "string" || args.code.trim().length === 0) {
        jsonResponse(response, 400, {
          ok: false,
          error: commandError(
            "live-invalid-eval",
            "Provide a non-empty JavaScript expression in code."
          )
        });
        return;
      }
      if (state.evalRunning) {
        jsonResponse(response, 409, {
          ok: false,
          error: commandError(
            "live-eval-running",
            "Only status, reload, and stop are available while eval is running."
          )
        });
        return;
      }
      if (state.session === void 0) {
        jsonResponse(response, 409, {
          ok: false,
          error: commandError(
            "live-not-ready",
            "Wait for the live instance to reach a submitted frame."
          )
        });
        return;
      }
      if (!await requireCurrentBridge(state, response)) return;
      if (state.status.phase !== "ready") {
        jsonResponse(response, 409, {
          ok: false,
          error: commandError(
            "live-not-ready",
            "Wait for the live instance to reach a submitted frame."
          )
        });
        return;
      }
      const before = state.status;
      const identityError = assertLiveIdentity(state, args);
      if (identityError !== void 0) {
        jsonResponse(response, 409, { ok: false, error: identityError });
        return;
      }
      state.evalRunning = true;
      evalIdentity = { revision: before.revision, loadId: before.loadId };
      state.status = { ...state.status, unfinishedEval: true };
      await writeSessionFile(state);
      const timeout = typeof args.timeoutMs === "number" ? Math.max(0, args.timeoutMs) : 3e4;
      openLiveInput(state);
      const evaluationCode = args.lease === true ? `try { ${args.code} } finally { simulation?.input?.revokeInjectedLease?.(); if (simulation?.input?.revokeInjectedLease === undefined) simulation?.input?.clearInjected?.(); }` : args.code;
      const evaluationCall = bridgeCall(state, evaluationCode, null);
      let leaseActive = args.lease === true;
      const revokeLease = () => {
        if (!leaseActive) return;
        leaseActive = false;
        revokeLiveInput(state);
        void evaluationCall.cancel().catch(() => {
        });
      };
      const finishLease = () => {
        leaseActive = false;
        if (revokeLeaseForRequest === revokeLease) revokeLeaseForRequest = void 0;
        request.off("aborted", revokeLease);
        response.off("close", revokeLease);
      };
      if (leaseActive) {
        revokeLeaseForRequest = revokeLease;
        request.once("aborted", revokeLease);
        response.once("close", revokeLease);
      }
      const evaluation = evaluationCall.promise;
      const timed = await Promise.race([
        evaluation.then((value) => ({ state: "completed", value })),
        new Promise(
          (resolveTimeout) => setTimeout(() => resolveTimeout({ state: "continuing" }), timeout)
        )
      ]);
      if (timed.state === "continuing") {
        if (!evaluationCall.started()) {
          const admitted = await Promise.race([
            evaluationCall.cancel(),
            new Promise((resolve3) => setTimeout(() => resolve3(true), 2e3))
          ]);
          void evaluation.catch(() => {
          });
          if (!admitted) {
            finishLease();
            state.evalRunning = false;
            evalIdentity = void 0;
            state.status = { ...state.status, unfinishedEval: false };
            await writeSessionFile(state);
            jsonResponse(response, 409, {
              ok: false,
              error: commandError(
                "live-eval-cancelled-before-execution",
                "The evaluation did not start before the caller deadline and was cancelled.",
                { continuing: false, revision: before.revision }
              )
            });
            return;
          }
        }
        jsonResponse(response, 408, {
          ok: false,
          error: commandError(
            "live-eval-continuing",
            "The caller wait ended; the owner still tracks the evaluation.",
            { continuing: true, revision: before.revision }
          )
        });
        void evaluation.then(
          () => {
            finishLease();
            if (state.status.revision !== before.revision || state.status.loadId !== before.loadId)
              return;
            state.evalRunning = false;
            state.status = { ...state.status, unfinishedEval: false };
            void writeSessionFile(state);
          },
          () => {
            finishLease();
            if (state.status.revision !== before.revision || state.status.loadId !== before.loadId)
              return;
            state.evalRunning = false;
            state.status = { ...state.status, unfinishedEval: false };
            void writeSessionFile(state);
          }
        );
        return;
      }
      finishLease();
      state.evalRunning = false;
      evalIdentity = void 0;
      state.status = { ...state.status, unfinishedEval: false };
      if (!await requireCurrentBridge(state, response)) return;
      await writeSessionFile(state);
      jsonResponse(response, 200, {
        ok: true,
        value: { revision: before.revision, result: timed.value }
      });
      return;
    }
    jsonResponse(response, 404, {
      ok: false,
      error: commandError("live-route-not-found", "Use status, reload, stop, eval, or capture.")
    });
  } catch (error) {
    if (profileCaptureId !== void 0) {
      finishLiveProfiler(state, {
        ...profileCaptureWorldIdentity === void 0 ? {} : { worldIdentity: profileCaptureWorldIdentity },
        captureId: profileCaptureId
      });
    }
    profileCaptureId = void 0;
    profileCaptureWorldIdentity = void 0;
    revokeLeaseForRequest?.();
    revokeLeaseForRequest = void 0;
    if (evalIdentity !== void 0 && state.status.revision === evalIdentity.revision && state.status.loadId === evalIdentity.loadId) {
      state.evalRunning = false;
      state.status = { ...state.status, unfinishedEval: false };
      void writeSessionFile(state);
    }
    const diagnostic = error;
    jsonResponse(response, 500, {
      ok: false,
      error: commandError(
        typeof diagnostic?.code === "string" ? diagnostic.code : "live-operation-failed",
        typeof diagnostic?.hint === "string" ? diagnostic.hint : error instanceof Error ? error.message : String(error),
        diagnostic?.detail !== null && typeof diagnostic?.detail === "object" ? diagnostic.detail : {}
      )
    });
  }
}
function pollRunObservation(state) {
  const tick = async () => {
    if (isStopped(state)) return;
    try {
      if ((state.status.phase === "ready" || state.status.phase === "waiting") && !state.captureRunning && !state.evalRunning && !state.reloadInFlight && state.session) {
        await refreshBridgeStatus(state);
        if (state.status.phase !== "ready") return;
        await refreshFrameStatus(state);
        const session = state.session;
        const revision = state.status.revision;
        const { captureBrowserExecutionSurface } = await import('./browser-capture-XOLMW2LK.mjs');
        const png = await captureBrowserExecutionSurface(
          session.execution ?? { kind: "page", ownerPage: session.page, realm: session.page },
          Date.now() + 5e3,
          session.report().viewport
        );
        if (state.session === session && state.status.revision === revision && png.byteLength <= 4 * 1024 * 1024) {
          state.observation = {
            capturedAt: (/* @__PURE__ */ new Date()).toISOString(),
            revision,
            frameId: state.status.frameId,
            png: `data:image/png;base64,${Buffer.from(png).toString("base64")}`
          };
        }
      }
    } catch {
    } finally {
      state.observationInFlight = void 0;
      if (!isStopped(state))
        state.observationTimer = setTimeout(() => {
          state.observationInFlight = tick();
        }, 5e3);
    }
  };
  state.observationInFlight = tick();
}
function stopLiveDaemon(state) {
  if (state.stopPromise !== void 0) return state.stopPromise;
  state.stopPromise = (async () => {
    if (state.observationTimer !== void 0) clearTimeout(state.observationTimer);
    if (state.inputTimer !== void 0) clearTimeout(state.inputTimer);
    state.inputTimer = void 0;
    state.reloadRequested = false;
    state.status = {
      ...state.status,
      phase: "stopped",
      generation: state.status.generation + 1,
      revision: randomUUID(),
      loadId: randomUUID()
    };
    state.evalRunning = false;
    state.status = { ...state.status, unfinishedEval: false };
    const failures = [];
    const release = async (cleanup) => {
      try {
        await cleanup();
      } catch (error) {
        failures.push(error);
      }
    };
    if (state.server?.listening) await release(() => writeSessionFile(state));
    await release(() => state.session?.close());
    await release(() => state.observationInFlight);
    rejectBridgePending(
      state,
      bridgeError("live-stop-cancelled", "The live App execution was destroyed by stop.")
    );
    await release(() => state.bridge?.close());
    await release(() => state.bridgeServer?.close());
    await release(() => stopProjectProcess(state));
    if (state.inputTimer !== void 0) clearTimeout(state.inputTimer);
    await release(() => state.browser?.close());
    await release(() => state.server?.close());
    await release(() => state.inputSnapshot?.dispose());
    if (state.ownerClaimed) {
      await release(() => unlink(resolve(runStateDirectory(state.root), "owner.json")));
      state.ownerClaimed = false;
    }
    await release(async () => {
      const current = await readSession(state.root, state.snapshot).catch(() => void 0);
      if (current?.pid === process.pid && current.endpoint === state.status.endpoint)
        await removeLiveDevSession(state.root, { snapshot: state.snapshot });
    });
    if (failures.length) throw new AggregateError(failures, "Live owner cleanup failed");
  })();
  return state.stopPromise;
}
async function runLiveDevDaemon(rootInput, port, sessionFile = void 0, options = {}) {
  options.signal?.throwIfAborted();
  if (options.snapshot && options.carrier)
    throw new Error("Independent runs require an Engine-owned browser.");
  const root = resolve(rootInput);
  const carrierRun = options.carrier === void 0 ? void 0 : options.carrierRun ?? {
    serviceId: `live-dev-service-${randomUUID()}`,
    runId: `live-dev-run-${randomUUID()}`
  };
  const state = {
    root,
    ownerClaimed: false,
    snapshot: options.snapshot === true,
    controlToken: options.snapshot ? randomUUID() : void 0,
    executionRoot: root,
    inputSnapshot: void 0,
    observation: void 0,
    observationTimer: void 0,
    observationInFlight: void 0,
    logs: [],
    logSequence: 0,
    captureRunning: false,
    sessionPath: sessionFile ?? sessionPath(root, options.snapshot),
    browser: void 0,
    carrier: options.carrier,
    carrierRun,
    requestedWorkers: options.workers ?? environmentExecutionWorkers(),
    animation: options.animation === void 0 ? environmentAnimationPlayback() : animationPlayback(options.animation),
    rhiCapture: options.rhiCapture ?? process.env.FORGEAX_DEV_RHI_CAPTURE === "1",
    session: void 0,
    projectUrl: void 0,
    status: {
      schemaVersion: "1.0.0",
      ...options.snapshot ? { runId: randomUUID() } : {},
      root,
      endpoint: `http://127.0.0.1:${port}`,
      pid: process.pid,
      generation: 0,
      revision: randomUUID(),
      loadId: randomUUID(),
      phase: "starting",
      unfinishedEval: false,
      url: void 0,
      frameId: void 0,
      worldIdentity: void 0,
      workers: void 0,
      backendRequested: options.backend ?? (process.env.FORGEAX_DEV_BACKEND === "hardware" || process.env.FORGEAX_DEV_BACKEND === "software" ? process.env.FORGEAX_DEV_BACKEND : "auto"),
      backend: "unknown",
      fallbackReason: void 0,
      carrier: "private-browser",
      carrierTarget: void 0,
      carrierFallbackReason: void 0,
      headless: options.headless ?? process.env.FORGEAX_DEV_HEADLESS === "true",
      bridgeConnected: false,
      error: void 0
    },
    evalRunning: false,
    server: void 0,
    bridgeServer: void 0,
    bridge: void 0,
    bridgeNextId: 1,
    bridgePending: /* @__PURE__ */ new Map(),
    projectProcess: void 0,
    inputs: void 0,
    projectInputPaths: void 0,
    inputCheck: void 0,
    inputTimer: void 0,
    reloadInFlight: void 0,
    reloadRequested: false
  };
  state.server = createServer((request, response) => void handleRequest(state, request, response));
  const closed = new Promise((resolveClose) => state.server?.once("close", resolveClose));
  const onAbort = () => {
    void stopLiveDaemon(state).catch(() => {
    });
  };
  const claimFile = resolve(runStateDirectory(root), "owner.json");
  try {
    if (state.snapshot) {
      await mkdir(dirname(claimFile), { recursive: true, mode: 448 });
      await writeFile(claimFile, JSON.stringify({ pid: process.pid }), { flag: "wx", mode: 384 });
      state.ownerClaimed = true;
    }
    installBridgeRelay(state);
    await once(state.server.listen(port, "127.0.0.1"), "listening");
    await writeSessionFile(state);
    options.signal?.addEventListener("abort", onAbort, { once: true });
    if (options.signal?.aborted) await stopLiveDaemon(state);
    else {
      if (state.snapshot) {
        try {
          state.inputSnapshot = await createRunSnapshot(
            root,
            resolve(runStateDirectory(root), `inputs-${state.status.runId}`)
          );
          if (isStopped(state)) {
            await state.inputSnapshot.dispose();
            return;
          }
          state.executionRoot = state.inputSnapshot.root;
          state.status = { ...state.status, inputVersion: state.inputSnapshot.version };
          await reloadSession(state);
          pollRunObservation(state);
        } catch (error) {
          if (isStopped(state)) return;
          state.status = { ...state.status, phase: "failed", error: String(error) };
          await writeSessionFile(state);
        }
      } else {
        pollProjectInputs(state);
        await reloadSession(state);
      }
    }
    options.onReady?.(state.status);
    await closed;
  } finally {
    options.signal?.removeEventListener("abort", onAbort);
    await stopLiveDaemon(state);
  }
}
async function readSession(root, snapshot = false) {
  return JSON.parse(await readFile(sessionPath(root, snapshot), "utf8"));
}
async function requestJson(session, path, method, value) {
  return new Promise((resolveResponse, rejectResponse) => {
    const request$1 = request(
      `${session.endpoint}${path}`,
      {
        method,
        headers: {
          "content-type": "application/json",
          ...session.controlToken ? { authorization: `Bearer ${session.controlToken}` } : {}
        }
      },
      (response) => {
        let raw = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => raw += chunk);
        response.on("end", () => {
          try {
            const parsed = JSON.parse(raw);
            resolveResponse(parsed);
          } catch (error) {
            rejectResponse(error);
          }
        });
      }
    );
    request$1.setTimeout(
      path === "/status" ? 5e3 : 33e4,
      () => request$1.destroy(new Error(LIVE_DEV_REQUEST_TIMEOUT))
    );
    request$1.on("error", rejectResponse);
    if (value !== void 0) request$1.write(JSON.stringify(value));
    request$1.end();
  });
}
async function liveDevStatus(rootInput, options = {}) {
  const root = resolve(rootInput);
  let session;
  try {
    session = await readSession(root, options.snapshot);
  } catch (error) {
    if (error.code === "ENOENT")
      return { ok: true, value: { root, phase: "stopped" } };
    throw error;
  }
  try {
    return await requestJson(session, "/status", "GET");
  } catch (error) {
    return {
      ok: true,
      value: {
        root,
        phase: "unreachable",
        endpoint: session.endpoint,
        error: error instanceof Error ? error.message : String(error)
      }
    };
  }
}
async function clearDeadRunClaim(root) {
  const path = resolve(runStateDirectory(root), "owner.json");
  let pid;
  try {
    ({ pid } = JSON.parse(await readFile(path, "utf8")));
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }
  if (!Number.isSafeInteger(pid) || pid <= 0) throw new Error("Invalid run owner claim.");
  try {
    process.kill(pid, 0);
  } catch (error) {
    if (error.code !== "ESRCH") throw error;
    await unlink(path);
  }
}
async function liveDevControl(rootInput, operation, value, options = {}) {
  const root = resolve(rootInput);
  try {
    return await requestJson(
      await readSession(root, options.snapshot),
      `/${operation}`,
      "POST",
      value
    );
  } catch (error) {
    if (error.code === "ENOENT") {
      if (options.snapshot && operation === "stop") await clearDeadRunClaim(root);
      if (operation === "observe")
        return { ok: true, value: { status: { root, phase: "stopped" }, image: null, logs: [] } };
      return operation === "stop" ? { ok: true, value: { root, phase: "stopped" } } : { ok: false, error: commandError("live-not-running", "Run forgeax dev start first.") };
    }
    if (operation === "stop") {
      const recorded = await readSession(root, options.snapshot).catch(() => void 0);
      if (recorded !== void 0 && Number.isSafeInteger(recorded.pid) && recorded.pid > 0) {
        try {
          process.kill(recorded.pid, 0);
        } catch (cause) {
          if (cause.code === "ESRCH") {
            await removeLiveDevSession(root, options);
            if (options.snapshot) await clearDeadRunClaim(root);
            return { ok: true, value: { root, phase: "stopped" } };
          }
        }
      }
    }
    return {
      ok: false,
      error: commandError(
        "live-unreachable",
        "The recorded owner did not respond; inspect dev status.",
        { cause: error instanceof Error ? error.message : String(error) }
      )
    };
  }
}
function readyResult(result) {
  const response = result;
  if (!response.ok || response.value?.phase === "ready") return result;
  return {
    ok: false,
    error: commandError(
      "live-not-ready",
      response.value?.error ?? "The owner is not ready; inspect dev status before retrying.",
      { status: response.value }
    )
  };
}
async function startLiveDev(rootInput, options = {}) {
  const root = resolve(rootInput);
  if (options.snapshot && options.inProcess)
    return {
      ok: false,
      error: commandError("run-owner-invalid", "Independent runs require a detached Engine owner.")
    };
  try {
    const existing = await liveDevStatus(root, options);
    if (existing !== null && typeof existing === "object" && "value" in existing && existing.value !== null && typeof existing.value === "object" && "phase" in existing.value && existing.value.phase !== "stopped") {
      const configuration = existing.value;
      if (options.backend !== void 0 && options.backend !== configuration.backendRequested || options.headless !== void 0 && options.headless !== configuration.headless) {
        return {
          ok: false,
          error: commandError(
            "live-configuration-conflict",
            "This project already has an owner with different browser options. Stop it before starting with the requested options.",
            {
              current: configuration,
              requested: { backend: options.backend, headless: options.headless }
            }
          )
        };
      }
      return readyResult(existing);
    }
  } catch (error) {
    return {
      ok: false,
      error: commandError(
        "live-discovery-invalid",
        "Inspect the existing dev session before starting another owner.",
        { cause: String(error) }
      )
    };
  }
  if (options.snapshot) {
    const claimed = await access(resolve(runStateDirectory(root), "owner.json")).then(
      () => true,
      (error) => {
        if (error.code === "ENOENT") return false;
        throw error;
      }
    );
    if (claimed)
      return {
        ok: false,
        error: commandError(
          "run-owner-busy",
          "The previous run is starting or stopping. Wait for its lifecycle to finish; use stop to clear a dead owner."
        )
      };
  }
  const { readProjectStartupTimeoutMs } = await import('./project-Z2UXJBZO.mjs');
  const startupPolicy = await readProjectStartupTimeoutMs(root);
  if (!startupPolicy.ok) return startupPolicy;
  const startupTimeout = startupPolicy.value === void 0 ? DEV_PREPARATION_TIMEOUT_MS : startupPolicy.value;
  const portProbe = createServer();
  await once(portProbe.listen(0, "127.0.0.1"), "listening");
  const address = portProbe.address();
  const port = typeof address === "object" && address !== null ? address.port : 0;
  await new Promise((resolveClose) => portProbe.close(() => resolveClose()));
  if (options.inProcess !== void 0) {
    const { inProcess, ...configuration } = options;
    inProcess.signal.throwIfAborted();
    const startup = new AbortController();
    return new Promise((resolveReady, rejectReady) => {
      const closed = runLiveDevDaemon(root, port, sessionPath(root, options.snapshot), {
        ...configuration,
        ...inProcess,
        signal: AbortSignal.any([inProcess.signal, startup.signal]),
        onReady: (status) => resolveReady(readyResult({ ok: true, value: publicStatus(status) }))
      });
      void closed.catch(rejectReady);
      try {
        inProcess.onStart?.(closed);
      } catch (error) {
        startup.abort(error);
        rejectReady(error);
      }
    });
  }
  const child = spawn(
    process.execPath,
    [
      CLI_ENTRY,
      "--__forgeax-live-daemon",
      root,
      String(port),
      options.snapshot ? "snapshot" : "live"
    ],
    {
      detached: true,
      stdio: "ignore",
      env: {
        ...process.env,
        ...options.headless === void 0 ? {} : { FORGEAX_DEV_HEADLESS: String(options.headless) },
        ...options.backend === void 0 ? {} : { FORGEAX_DEV_BACKEND: options.backend },
        ...options.workers === void 0 ? {} : { FORGEAX_EXECUTION_WORKERS: JSON.stringify(options.workers) },
        ...options.animation === void 0 ? {} : { FORGEAX_ANIMATION_PLAYBACK: JSON.stringify(animationPlayback(options.animation)) },
        ...options.rhiCapture === void 0 ? {} : { FORGEAX_DEV_RHI_CAPTURE: options.rhiCapture ? "1" : "0" }
      }
    }
  );
  child.unref();
  const file = sessionPath(root, options.snapshot);
  const deadline = startupTimeout === null ? Infinity : Date.now() + startupTimeout;
  while (Date.now() < deadline) {
    try {
      await access(file);
      const status = await liveDevStatus(root, options);
      if (status !== null && typeof status === "object" && "value" in status && status.value !== null && typeof status.value === "object" && "phase" in status.value && status.value.phase !== "starting" && status.value.phase !== "waiting" && status.value.phase !== "reloading") {
        let ownStartupTimeout = false;
        if (status.value.phase === "unreachable" && "error" in status.value && status.value.error === LIVE_DEV_REQUEST_TIMEOUT && child.pid !== void 0) {
          const recorded = await readSession(root, options.snapshot).catch(() => void 0);
          if (recorded?.pid === child.pid && recorded.endpoint === `http://127.0.0.1:${port}`) {
            try {
              process.kill(child.pid, 0);
              ownStartupTimeout = true;
            } catch {
            }
          }
        }
        if (!ownStartupTimeout) return readyResult(status);
      }
    } catch {
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, LIVE_DEV_POLL_INTERVAL_MS));
  }
  return {
    ok: false,
    error: commandError(
      "live-start-timeout",
      "Startup did not finish before the deadline; dev status reports whether the owner is still running."
    )
  };
}
async function removeLiveDevSession(rootInput, options = {}) {
  try {
    await unlink(sessionPath(resolve(rootInput), options.snapshot));
  } catch {
  }
}

export { liveDevControl, liveDevStatus, removeLiveDevSession, runLiveDevDaemon, runLiveProjectProcess, startLiveDev, waitForFirstFrame };
//# sourceMappingURL=chunk-4CLUR564.mjs.map
//# sourceMappingURL=chunk-4CLUR564.mjs.map