#!/usr/bin/env node
import { createWorkspaceLiveTools } from './chunk-HIR5RTHU.mjs';
import { createOperationHistoryTools } from './chunk-ZYPIUSIT.mjs';
import './chunk-4CLUR564.mjs';
import { traceBackendStartup } from './chunk-ECS2PUL5.mjs';
import './chunk-OMR3CVHO.mjs';
import { DevKitWorkspaceError, createDevKitWorkspaceProvider, resolveBrowserExecutable, browserLaunchArgs } from './chunk-I7CPTDO2.mjs';
import './chunk-O7QEAHSA.mjs';
import './chunk-UTXAIODQ.mjs';
import './chunk-6AKTNSSW.mjs';
import { compileNodePluginPrograms } from './chunk-ZDSMIZQ7.mjs';
import './chunk-WBZD4GEB.mjs';
import './chunk-A2W6KPHB.mjs';
import { discoverPluginAssets, assertPluginSourceInputs } from './chunk-5KRT3YGN.mjs';
import './chunk-62ITDDCW.mjs';
import './chunk-SFUAONG6.mjs';
import './chunk-X5IGMUF7.mjs';
import { readProjectFacts } from './chunk-VNP4GISC.mjs';
import { randomUUID, createHash } from 'crypto';
import { once } from 'events';
import { realpath, readFile, mkdir, mkdtemp, rm, access, symlink } from 'fs/promises';
import { createServer } from 'http';
import { resolve, dirname, basename } from 'path';
import { pathToFileURL } from 'url';
import { createBackendHost } from '@forgeax/engine-host';
import { attachHostWebSocketServer } from '@forgeax/engine-host/transport';
import { startPluginAsset } from '@forgeax/engine-plugin';
import { GameProjectSchema } from '@forgeax/engine-project';
import { defineToolCommandContract, operationCommandPath, defineTool, toolJsonSchema } from '@forgeax/engine-tool-runtime';
import { ok, err, readCatalogRows } from '@forgeax/engine-types';
import { WebSocketServer } from 'ws';
import { createEngineWorkspaceTools, ENGINE_WORKSPACE_TOOL_SOURCE, createEngineWorkspaceRuntime, ENGINE_WORKSPACE_STATE_TOPIC, snapshotEngineWorkspace, projectEngineWorkspaceAssets } from '@forgeax/engine-app';
import { decodeCatalogWire } from '@forgeax/engine-pack';
import { previewThumbnailInput, THUMBNAIL_PREVIEW } from '@forgeax/engine-preview';
import { chromium } from 'playwright';
import { DdcEntryStore, withDdcLock, ddcOutputDigest } from '@forgeax/engine-ddc';

function createWorkspacePreviewBatch(url) {
  let browser;
  let page;
  let closed = false;
  let opening;
  async function open() {
    const channel = process.env.FORGEAX_CHROME_CHANNEL;
    const executablePath = channel ? void 0 : await resolveBrowserExecutable(void 0);
    browser = await chromium.launch({
      headless: true,
      ...channel ? { channel } : {},
      ...executablePath ? { executablePath } : {},
      args: browserLaunchArgs(
        process.env.FORGEAX_THUMBNAIL_BACKEND === "software" ? "software" : "hardware",
        "development",
        false
      ),
      chromiumSandbox: true
    });
    if (closed) {
      await browser.close();
      throw new Error("Preview batch retired");
    }
    page = await browser.newPage({
      viewport: { width: THUMBNAIL_PREVIEW.size, height: THUMBNAIL_PREVIEW.size }
    });
    page.setDefaultTimeout(45e3);
    await page.goto(new URL("/preview-batch.html", url).href, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () => globalThis.__forgeaxPreviewBatch?.ready
    );
    const error = await page.evaluate(
      () => globalThis.__forgeaxPreviewBatch.error
    );
    if (error) throw Object.assign(new Error(error.hint), error);
    return page;
  }
  const close = async () => {
    closed = true;
    await browser?.close();
  };
  return {
    async capture(asset, input, signal) {
      signal.throwIfAborted();
      if (closed) throw new Error("Preview batch retired");
      const retire = () => {
        void close();
      };
      const deadline = setTimeout(retire, 9e4);
      signal.addEventListener("abort", retire, { once: true });
      try {
        opening ??= open();
        const active = await opening;
        signal.throwIfAborted();
        const captured = await active.evaluate(
          async (request) => {
            try {
              return {
                ok: true,
                value: await globalThis.__forgeaxPreviewBatch.capture(request)
              };
            } catch (cause) {
              return {
                ok: false,
                error: JSON.stringify(
                  cause,
                  (_key, value) => value instanceof Error ? { ...value, name: value.name, message: value.message } : value
                ) || String(cause)
              };
            }
          },
          { asset, input }
        );
        signal.throwIfAborted();
        if (!captured.ok) throw new Error(captured.error);
        return captured.value;
      } finally {
        clearTimeout(deadline);
        signal.removeEventListener("abort", retire);
      }
    },
    close
  };
}
function thumbnailKey(input, producer) {
  return createHash("sha256").update(JSON.stringify([THUMBNAIL_PREVIEW, producer, input])).digest("hex");
}
function thumbnailPng(dataUrl) {
  if (!dataUrl.startsWith("data:image/png;base64,")) throw new Error("Preview returned no PNG");
  const bytes = Buffer.from(dataUrl.slice("data:image/png;base64,".length), "base64");
  if (bytes.length < 24 || bytes.length > 1024 * 1024 || !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) || bytes.toString("ascii", 12, 16) !== "IHDR" || bytes.readUInt32BE(16) !== THUMBNAIL_PREVIEW.size || bytes.readUInt32BE(20) !== THUMBNAIL_PREVIEW.size)
    throw new Error("Preview returned an invalid thumbnail PNG");
  return bytes;
}
function createThumbnailCache(root) {
  const store = new DdcEntryStore(root);
  return {
    async read(key) {
      const entry = await store.read(key);
      const image = entry?.artifacts["preview.png"];
      if (!image || image.mediaType !== "image/png") return void 0;
      const dataUrl = `data:image/png;base64,${Buffer.from(image.bytes).toString("base64")}`;
      try {
        thumbnailPng(dataUrl);
        return dataUrl;
      } catch {
        return void 0;
      }
    },
    async write(key, guid, producer, dataUrl) {
      const body = {
        guid,
        payload: THUMBNAIL_PREVIEW,
        refs: [],
        artifacts: { "preview.png": { mediaType: "image/png", bytes: thumbnailPng(dataUrl) } }
      };
      await withDdcLock(root, key, async () => {
        const existing = await store.readChecked(key);
        if (!existing.ok) await store.remove(key);
        if (existing.ok && existing.value) return;
        const staged = await store.stage({
          ...body,
          key,
          receipt: {
            guid,
            key,
            producer,
            inputFingerprint: key,
            outputDigest: ddcOutputDigest(body)
          }
        });
        const published = await store.publish(staged);
        if (published.result === "conflict") throw new Error("Preview cache content conflict");
      });
    }
  };
}

// src/workspace-thumbnails.ts
async function readPreviewInputs(url, signal) {
  const response = await fetch(new URL("/__forgeax/preview-inputs", url), {
    signal: AbortSignal.any([signal, AbortSignal.timeout(3e4)])
  });
  if (!response.ok)
    throw new Error(
      `Preview input HTTP ${response.status}: ${(await response.text()).slice(0, 2048)}`
    );
  const source = await response.json();
  if (typeof source.producer !== "string" || !source.producer)
    throw new Error("Preview producer identity missing");
  const decoded = decodeCatalogWire(source.catalog);
  if (!decoded.ok) throw decoded.error;
  const entries = readCatalogRows(decoded.value);
  if (!entries) throw new Error("Preview Catalog rows missing");
  return { producer: source.producer, entries };
}
function failure(cause) {
  return {
    code: "thumbnail-preview-failed",
    expected: "A current Engine preview image",
    hint: (cause instanceof Error ? cause.message : JSON.stringify(cause) || String(cause)).slice(
      0,
      4096
    )
  };
}
function createWorkspaceThumbnails(runtime, changed, dependencies = { readInputs: readPreviewInputs, createBatch: createWorkspacePreviewBatch }) {
  let project;
  let jobs = /* @__PURE__ */ new Map();
  let cache;
  let batch;
  let controller = new AbortController();
  let revision = 0;
  let producer = "";
  let scanning = false;
  let draining = false;
  let closed = false;
  let error;
  let notification;
  let idle;
  const notify = () => {
    if (closed || notification) return;
    notification = setTimeout(() => {
      notification = void 0;
      changed();
    }, 50);
  };
  const closeBatch = async () => {
    const old = batch;
    batch = void 0;
    if (idle) clearTimeout(idle);
    idle = void 0;
    await old?.close();
  };
  const drain = async () => {
    if (draining || closed) return;
    draining = true;
    const signal = controller.signal;
    try {
      for (; ; ) {
        const job = [...jobs.values()].find((candidate) => candidate.row.state === "queued");
        const url = project?.target?.url;
        if (!job?.checked || !url || !cache || signal.aborted) break;
        job.row = { guid: job.asset.guid, state: "cooking" };
        notify();
        try {
          if (idle) clearTimeout(idle);
          idle = void 0;
          batch ??= dependencies.createBatch(url);
          const capture = await batch.capture(
            { guid: job.asset.guid, kind: job.asset.kind },
            job.input,
            signal
          );
          if (signal.aborted || jobs.get(job.asset.guid) !== job) continue;
          await cache.write(job.key, job.asset.guid, producer, capture.dataUrl);
          if (signal.aborted || jobs.get(job.asset.guid) !== job) continue;
          const { dataUrl: _dataUrl, ...metrics } = capture;
          job.row = {
            guid: job.asset.guid,
            state: "ready",
            metrics: { cache: "miss", capture: metrics }
          };
        } catch (cause) {
          if (!signal.aborted && jobs.get(job.asset.guid) === job)
            job.row = { guid: job.asset.guid, state: "failed", error: failure(cause) };
          await closeBatch();
        }
        notify();
      }
    } finally {
      draining = false;
      if (!closed && project?.target?.url && cache && [...jobs.values()].find((job) => job.row.state === "queued")?.checked)
        void drain();
      else if (!scanning && batch)
        idle = setTimeout(() => {
          void closeBatch();
        }, 3e4);
    }
  };
  const refresh = () => {
    if (closed) return;
    const next = runtime.project;
    if (next !== project) {
      controller.abort();
      controller = new AbortController();
      project = next;
      jobs.clear();
      cache = void 0;
      void closeBatch();
      if (next)
        cache = createThumbnailCache(resolve(next.project.root, ".forgeax/ddc/v2/thumbnails"));
    }
    const current = ++revision;
    const signal = controller.signal;
    const url = project?.target?.url;
    error = void 0;
    scanning = false;
    if (!url || !cache) {
      notify();
      return;
    }
    scanning = true;
    const previous = jobs;
    jobs = /* @__PURE__ */ new Map();
    notify();
    const currentCache = cache;
    void dependencies.readInputs(url, signal).then(async (input) => {
      if (closed || signal.aborted || revision !== current) return;
      producer = input.producer;
      const catalog = new Map(input.entries.map((entry) => [entry.guid, entry]));
      jobs = new Map(
        projectEngineWorkspaceAssets(input.entries).map((asset) => {
          const content = asset.previewable ? previewThumbnailInput(catalog, asset.guid) : void 0;
          const key = content === void 0 ? "" : thumbnailKey(content, input.producer);
          const retained = previous.get(asset.guid);
          return [
            asset.guid,
            retained?.key === key && (retained.row.state === "ready" || retained.row.state === "unsupported") ? retained : {
              asset,
              input: content ?? "",
              key,
              checked: content === void 0,
              row: {
                guid: asset.guid,
                state: content === void 0 ? "unsupported" : "queued"
              }
            }
          ];
        })
      );
      notify();
      const pending = [...jobs.values()].filter((job) => !job.checked);
      let index = 0;
      await Promise.all(
        Array.from({ length: Math.min(8, pending.length) }, async () => {
          for (; ; ) {
            const job = pending[index++];
            if (!job || signal.aborted || revision !== current) return;
            const hit = await currentCache.read(job.key);
            if (signal.aborted || revision !== current || jobs.get(job.asset.guid) !== job)
              continue;
            job.checked = true;
            if (hit)
              job.row = { guid: job.asset.guid, state: "ready", metrics: { cache: "hit" } };
            notify();
            void drain();
          }
        })
      );
    }).catch((cause) => {
      if (!signal.aborted && revision === current) {
        error = failure(cause);
        notify();
      }
    }).finally(() => {
      if (revision === current) {
        scanning = false;
        void drain();
      }
    });
  };
  const read = async (guids) => {
    if (runtime.project !== project) refresh();
    const active = project;
    const rows = await Promise.all(
      guids.map(async (guid) => {
        const job = jobs.get(guid);
        if (!job)
          return error ? { guid, state: "failed", error } : { guid, state: scanning ? "queued" : "unsupported" };
        if (job.row.state !== "ready") return job.row;
        const dataUrl = await cache?.read(job.key);
        if (project !== active || jobs.get(guid) !== job) return { guid, state: "queued" };
        if (dataUrl) return { ...job.row, dataUrl };
        job.row = { guid, state: "queued" };
        void drain();
        return job.row;
      })
    );
    return { thumbnails: rows };
  };
  const schema = {
    type: "object",
    required: ["projectId", "guids"],
    properties: {
      projectId: { type: "string", minLength: 1 },
      targetId: {
        type: "string",
        minLength: 1,
        description: "Exact project target when addressing another admitted workspace session."
      },
      guids: {
        type: "array",
        minItems: 1,
        maxItems: 32,
        uniqueItems: true,
        items: { type: "string", minLength: 1 }
      }
    }
  };
  const outputSchema = {
    type: "object",
    required: ["thumbnails"],
    properties: {
      thumbnails: {
        type: "array",
        maxItems: 32,
        items: {
          type: "object",
          required: ["guid", "state"],
          properties: {
            guid: { type: "string" },
            state: { enum: ["queued", "cooking", "ready", "failed", "unsupported"] },
            dataUrl: {
              type: "string",
              description: "A verified 128x128 transparent PNG, present when ready."
            },
            error: {
              type: "object",
              required: ["code", "expected", "hint"],
              properties: {
                code: { type: "string" },
                expected: { type: "string" },
                hint: { type: "string" }
              }
            },
            metrics: {
              type: "object",
              required: ["cache"],
              properties: {
                cache: { enum: ["hit", "miss"] },
                capture: {
                  type: "object",
                  properties: {
                    preparedMs: { type: "number" },
                    totalMs: { type: "number" },
                    submitted: { type: "integer" },
                    ready: { type: "integer" }
                  }
                }
              }
            }
          }
        }
      }
    }
  };
  const tool = defineTool(
    {
      id: "engine.assets.thumbnails",
      path: ["engine", "assets", "thumbnails"],
      title: "Asset thumbnails",
      summary: "Read progressively cached Engine asset previews; generation runs asynchronously.",
      realm: "host",
      argsSchema: toolJsonSchema(schema),
      resultSchema: toolJsonSchema(outputSchema),
      inputSchema: schema,
      outputSchema,
      evidence: []
    },
    async (value) => {
      const args = value;
      if (!runtime.project || args.projectId !== runtime.project.project.id)
        return {
          ok: false,
          error: {
            code: "engine-workspace-project-mismatch",
            expected: "The current project",
            hint: "Open the project first."
          }
        };
      return read(args.guids);
    }
  );
  return {
    refresh,
    read,
    tool,
    async close() {
      closed = true;
      revision++;
      controller.abort();
      if (notification) clearTimeout(notification);
      await closeBatch();
      jobs.clear();
    }
  };
}

// src/workspace-plugin.ts
var ENGINE_WORKSPACE_CALL_SERVICE = "engine.workspace.call";
var ENGINE_WORKSPACE_CAPABILITIES_SERVICE = "engine.workspace.capabilities";
var devKitWorkspacePlugin = {
  name: "forgeax:devkit-workspace",
  inject: ["toolApi"],
  provide: ["engineWorkspace", "engineWorkspaceForCaller", "engineWorkspaceCatalog"],
  apply(ctx, options) {
    const backend = options.hostBinding.backend;
    const api = ctx.get("toolApi");
    let catalogEpoch = 0;
    let thumbnailEpoch = 0;
    const thumbnails = /* @__PURE__ */ new Map();
    const publish = () => backend.transport.publish(ENGINE_WORKSPACE_STATE_TOPIC, {
      ...snapshotEngineWorkspace(runtime, catalogEpoch),
      thumbnailEpoch
    });
    const notePublished = () => {
      catalogEpoch += 1;
      for (const owner of thumbnails.values()) owner.refresh();
      publish();
    };
    const runtimes = /* @__PURE__ */ new Set();
    const entries = /* @__PURE__ */ new Map();
    const createRuntime = () => {
      const session = createEngineWorkspaceRuntime(
        options.provider ?? createDevKitWorkspaceProvider({
          ...options,
          onTargetChanged: async () => {
            const project = session.project;
            const retired = project?.phase === "starting" && (project.browserGeneration ?? 0) > 0;
            const previews = retired ? session.previews : [];
            const play = retired ? session.play : void 0;
            publish();
            for (const preview of previews) await session.closePreview(preview);
            if (play) await session.stopPlay?.(play);
            if (retired) publish();
            await options.onTargetChanged?.();
          }
        })
      );
      runtimes.add(session);
      thumbnails.set(
        session,
        createWorkspaceThumbnails(session, () => {
          thumbnailEpoch++;
          publish();
        })
      );
      return session;
    };
    const runtime = createRuntime();
    const forCaller = (caller, targetId) => {
      if (caller?.kind === "frontend" && caller.sourceId?.startsWith("forgeax-workspace:")) {
        return [...runtimes].find((session) => {
          const target = session.project?.target;
          return target && caller.sourceId === `forgeax-workspace:${target.sessionId}:${target.targetId}`;
        });
      }
      if (caller?.kind === "frontend" && caller.sourceId === "view-frontend") {
        let session = entries.get(caller.connectionId);
        if (!session) {
          if (runtimes.size >= 16)
            throw new DevKitWorkspaceError(
              "engine-workspace-session-limit",
              "at most 16 active workspace sessions",
              "Close an unused project session before opening another."
            );
          session = createRuntime();
          entries.set(caller.connectionId, session);
        }
        return session;
      }
      if (targetId)
        return [...runtimes].find(
          (session) => [
            session.project?.target,
            ...session.previews.map((preview) => preview.target),
            session.play?.target
          ].some((target) => target?.targetId === targetId)
        );
      return runtime;
    };
    const sessionTools = /* @__PURE__ */ new WeakMap();
    const thumbnailTool = (session) => {
      const owner = thumbnails.get(session);
      if (!owner) throw new Error("Workspace thumbnail owner unavailable");
      return owner.tool;
    };
    const tools = [
      ...createEngineWorkspaceTools(runtime, publish),
      thumbnailTool(runtime),
      ...createWorkspaceLiveTools(),
      ...createOperationHistoryTools()
    ].map((tool) => ({
      descriptor: tool.descriptor,
      async execute(args, context) {
        if (tool.descriptor.id.startsWith("engine.run.") && tool.descriptor.id !== "engine.run.observe" && (options.runAccess === "observe" || context.caller?.kind === "frontend") || options.authorize && !await options.authorize({
          operation: tool.descriptor.id,
          args,
          caller: context.caller,
          signal: context.signal
        })) {
          return {
            ok: false,
            error: {
              code: "engine-workspace-unauthorized",
              expected: "an authorized Engine operation",
              hint: "Use an admitted identity with permission for this target."
            }
          };
        }
        context.signal.throwIfAborted();
        if (tool.descriptor.id.startsWith("engine.history.")) {
          if (context.caller?.kind === "frontend") {
            const source = context.caller.sourceId;
            const project = source === "view-frontend" || source?.startsWith("forgeax-workspace:") ? forCaller(context.caller)?.project : void 0;
            if (!project)
              return {
                ok: false,
                error: {
                  code: "engine-history-project-required",
                  expected: "an admitted frontend project",
                  hint: "Open a project before reading its operation history."
                }
              };
            return tool.execute(
              { ...args && typeof args === "object" ? args : {}, root: project.project.root },
              context
            );
          }
          return tool.execute(args, context);
        }
        if (!tool.descriptor.id.startsWith("engine.run.")) {
          const input = args && typeof args === "object" ? args : {};
          const session = forCaller(
            context.caller,
            typeof input.targetId === "string" ? input.targetId : void 0
          );
          if (!session)
            return {
              ok: false,
              error: {
                code: "engine-workspace-target-mismatch",
                expected: "an active admitted Engine session",
                hint: "Refresh the workspace and use its exact target identity."
              }
            };
          let handlers = sessionTools.get(session);
          if (!handlers) {
            handlers = [...createEngineWorkspaceTools(session, publish), thumbnailTool(session)];
            sessionTools.set(session, handlers);
          }
          const handler = handlers.find(
            (candidate) => candidate.descriptor.id === tool.descriptor.id
          );
          if (handler) {
            const result = await handler.execute(args, context);
            if (tool.descriptor.id === "engine.project.open" || tool.descriptor.id === "engine.project.close")
              thumbnails.get(session)?.refresh();
            return result;
          }
        }
        return tool.execute(args, context);
      }
    }));
    const provider = api.registerProvider({
      providerId: `engine-workspace:${ctx.fiber.uid}`,
      sourceId: ENGINE_WORKSPACE_TOOL_SOURCE,
      realm: "host",
      module: "@forgeax/engine-devkit",
      fiberId: String(ctx.fiber.uid),
      tools
    });
    const capabilities = backend.transport.register(ENGINE_WORKSPACE_CAPABILITIES_SERVICE, () => ({
      apiVersion: runtime.apiVersion,
      operations: tools.map(
        ({ descriptor: { id, path, title, summary, inputSchema, outputSchema } }) => ({
          id,
          path,
          title,
          summary,
          inputSchema,
          outputSchema
        })
      )
    }));
    const call = backend.transport.register(
      ENGINE_WORKSPACE_CALL_SERVICE,
      async ({ payload, caller, signal }) => {
        if (!payload || typeof payload !== "object" || !("operation" in payload) || typeof payload.operation !== "string") {
          throw new TypeError("Engine workspace call requires an operation");
        }
        const terminal = await api.run(payload.operation, "args" in payload ? payload.args : {}, {
          sourceId: ENGINE_WORKSPACE_TOOL_SOURCE,
          providerId: provider.owner.providerId,
          generation: provider.owner.generation,
          caller,
          signal
        }).terminal;
        if (terminal.outcome === "failed") {
          throw new DevKitWorkspaceError(
            terminal.failure.code,
            terminal.failure.expected,
            terminal.failure.hint,
            { failure: terminal.failure }
          );
        }
        return terminal.result;
      }
    );
    const disconnect = backend.transport.onClientDisconnect((caller) => {
      for (const session of runtimes) {
        const opened = session.project;
        const target = opened?.target;
        if (opened && target && session.runtimePack)
          void session.runtimePack({
            ...opened,
            targetId: target.targetId,
            worldId: target.worldId,
            connectionId: caller.connectionId,
            request: { operation: "release" }
          }).catch(() => {
          }).finally(publish);
        for (const preview of [...session.previews, session.play])
          if (preview)
            void Promise.resolve().then(
              () => preview.revokeConnection?.({
                targetId: preview.target.targetId,
                connectionId: caller.connectionId
              })
            ).catch(() => {
            }).finally(publish);
      }
      const entry = entries.get(caller.connectionId);
      entries.delete(caller.connectionId);
      if (entry && !entry.project) {
        runtimes.delete(entry);
        void thumbnails.get(entry)?.close();
        thumbnails.delete(entry);
        void entry.dispose().catch(() => {
        });
      }
    });
    ctx.provide("engineWorkspace", runtime);
    ctx.provide("engineWorkspaceForCaller", forCaller);
    ctx.provide("engineWorkspaceCatalog", { notePublished });
    ctx.effect(() => async () => {
      call();
      capabilities();
      disconnect();
      await provider.revoke("Engine workspace plugin disposed");
      await Promise.all([...thumbnails.values()].map((owner) => owner.close()));
      thumbnails.clear();
      await Promise.all([...runtimes].map((session) => session.dispose()));
      runtimes.clear();
      entries.clear();
    });
  }
};

// src/backend.ts
async function createDevKitBackend(rootInput, options = {}) {
  const root = resolve(rootInput);
  const requestedHostPack = options.hostPack;
  const hostPack = requestedHostPack === void 0 ? void 0 : await traceBackendStartup("host-pack-path", () => realpath(requestedHostPack));
  const hostPackageRoot = hostPack === void 0 ? void 0 : dirname(hostPack);
  const project = await traceBackendStartup(
    "project-config",
    () => readFile(resolve(root, "forge.json"), "utf8").then(
      (value) => GameProjectSchema.parse(JSON.parse(value)),
      (error) => {
        if (error.code !== "ENOENT") throw error;
        return void 0;
      }
    )
  );
  const host = await traceBackendStartup("host-create", () => createBackendHost());
  let hostInventory;
  let hostSourceRoot;
  const assertCurrent = async () => {
    if (hostInventory) {
      try {
        await assertPluginSourceInputs(hostInventory, hostSourceRoot ?? root);
      } catch (cause) {
        throw new Error(
          "Resident host sources changed; restart the backend before replacing browser sessions.",
          { cause }
        );
      }
    }
    const current = await readProjectFacts(root);
    if (!hostPack && current.ok && current.value.roots.host !== project?.roots.host)
      throw new Error(
        "Resident host root changed; restart the backend before replacing browser sessions."
      );
  };
  try {
    const owner = {
      name: "forgeax:devkit-backend",
      provide: ["devkitBackend"],
      apply(ctx) {
        ctx.provide("devkitBackend", { host, root, hostPackageRoot, assertCurrent });
      }
    };
    await traceBackendStartup("host-owner", async () => {
      await (await host.context.plugin(owner)).await();
    });
    await traceBackendStartup("workspace-plugin", async () => {
      const workspace = await host.context.plugin(devKitWorkspacePlugin, {
        hostBinding: {
          backend: host,
          get frontendAssembly() {
            return host.context.get("devkitWorkspaceFrontend")?.assembly;
          },
          get frontendModule() {
            return host.context.get("devkitWorkspaceFrontend")?.module;
          }
        }
      });
      await workspace.await();
    });
    if (hostPack || project?.roots.host) {
      const projectFacts = await traceBackendStartup("project-facts", () => readProjectFacts(root));
      let facts;
      if (hostPack) {
        facts = {
          root: dirname(hostPack),
          id: projectFacts.ok ? projectFacts.value.id : "host",
          name: projectFacts.ok ? projectFacts.value.name : "Host",
          packageJson: projectFacts.ok ? projectFacts.value.packageJson : {},
          roots: {},
          assetRoots: [hostPack]
        };
      } else if (projectFacts.ok) facts = projectFacts.value;
      else throw projectFacts.error;
      const inventory = await traceBackendStartup("host-assets", () => discoverPluginAssets(facts));
      const hostRoot = hostPack ? [...inventory.assets.values()].find(
        (record) => record.sourcePath === hostPack && record.sourceKey === "plugin/main"
      )?.definition.guid : project?.roots.host;
      if (!hostRoot) throw new Error(`Host Pack must define plugin/main: ${hostPack ?? root}`);
      hostInventory = inventory;
      hostSourceRoot = facts.root;
      const directory = resolve(root, ".forgeax", "host");
      await mkdir(directory, { recursive: true });
      const temporary = await mkdtemp(resolve(directory, "session-"));
      const hostFacts = { ...facts, roots: { ...facts.roots, host: hostRoot } };
      await host.context.effect(async function* () {
        yield () => rm(temporary, { recursive: true, force: true });
        const compiled = await traceBackendStartup(
          "host-compile",
          () => compileNodePluginPrograms(
            hostFacts,
            "host",
            inventory,
            temporary,
            {},
            traceBackendStartup
          )
        );
        if (hostPackageRoot !== void 0) {
          const localDependencies = resolve(hostPackageRoot, "node_modules");
          const parentDependencies = dirname(hostPackageRoot);
          const dependencies = await access(localDependencies).then(
            () => localDependencies,
            () => basename(parentDependencies) === "node_modules" ? parentDependencies : void 0
          );
          if (dependencies === void 0)
            throw new Error(`Host package dependencies are unavailable: ${hostPackageRoot}`);
          await symlink(dependencies, resolve(temporary, "compiled", "node_modules"), "dir");
        }
        const module = await traceBackendStartup(
          "host-import",
          () => import(pathToFileURL(compiled.entry).href)
        );
        const programs = module.createPrograms(randomUUID(), "host", 1);
        host.context.provide("pluginPrograms", programs);
        host.context.provide("assets", {
          async readPluginDefinition(guid) {
            const record = inventory.assets.get(guid);
            return record ? ok(structuredClone(record.definition)) : err({
              code: "plugin-definition-missing",
              expected: "a source-discoverable host plugin asset",
              hint: "Repair the host root or its source-only dependency definition.",
              detail: { guid }
            });
          }
        });
        const started = await traceBackendStartup(
          "host-plugin-start",
          () => startPluginAsset(host.context, hostRoot)
        );
        if (!started.ok) throw Object.assign(new Error(started.error.hint), started.error);
        yield async () => {
          await started.value.dispose();
          while (started.value.inertia) await started.value.inertia;
        };
      });
    }
    return { host, root, dispose: () => host.dispose() };
  } catch (error) {
    await host.dispose();
    throw error;
  }
}
var devKitBackendServerPlugin = {
  name: "forgeax:devkit-backend-server",
  inject: ["devkitBackend", "toolApi"],
  provide: ["devkitBackendServer"],
  async apply(ctx, options) {
    const { host } = ctx.devkitBackend;
    const api = ctx.toolApi;
    const token = randomUUID();
    const http = createServer((_request, response) => {
      response.writeHead(404);
      response.end();
    });
    const sockets = new WebSocketServer({ noServer: true });
    const connections = /* @__PURE__ */ new Set();
    http.on("upgrade", (request, socket, head) => {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      if (url.pathname !== "/host" || url.searchParams.get("token") !== token) {
        socket.destroy();
        return;
      }
      sockets.handleUpgrade(request, socket, head, (ws) => {
        const detach = attachHostWebSocketServer(ws, host.transport, {
          kind: "cli",
          sourceId: "devkit-backend-client"
        });
        const close = () => {
          detach();
          ws.terminate();
          connections.delete(close);
        };
        connections.add(close);
        ws.once("close", close);
      });
    });
    const status = host.transport.register("engine.backend.status", () => ({
      root: ctx.devkitBackend.root,
      phase: "ready"
    }));
    const stop = host.transport.register("engine.backend.stop", ({ caller }) => {
      if (caller.kind !== "cli" || caller.sourceId !== "devkit-backend-client")
        throw new Error("Stop the backend through its authenticated Engine owner connection.");
      setTimeout(options.stop, 0);
      return { stopping: true };
    });
    const listTools = host.transport.register("engine.backend.tool.list", () => {
      const records = api.list().filter((record) => record.callable);
      return defineToolCommandContract(
        records.filter(
          (record) => records.filter((candidate) => candidate.descriptor.id === record.descriptor.id).length === 1
        ).map(({ descriptor }) => ({
          id: descriptor.id,
          path: operationCommandPath(descriptor.id),
          title: descriptor.title,
          summary: descriptor.summary,
          realm: descriptor.realm,
          ...descriptor.inputSchema === void 0 ? {} : { argsSchema: JSON.stringify(descriptor.inputSchema) },
          ...descriptor.outputSchema === void 0 ? {} : { resultSchema: JSON.stringify(descriptor.outputSchema) },
          evidence: descriptor.evidence
        }))
      );
    });
    const call = host.transport.register(
      "engine.backend.call",
      async ({ payload, caller, signal }) => {
        const input = payload;
        if (typeof input?.operation !== "string")
          throw new TypeError("Backend call requires an operation");
        const owners = api.list().filter((record) => record.callable && record.descriptor.id === input.operation);
        const owner = owners.length === 1 ? owners[0]?.owner : void 0;
        if (!owner)
          return {
            outcome: "failed",
            artifacts: [],
            failure: {
              code: "tool-capability-unavailable",
              expected: `one active provider for ${input.operation}`,
              hint: "Enable the owning host plugin and retry the operation.",
              detail: { capability: input.operation, realm: "host" }
            }
          };
        return api.run(input.operation, input.args ?? {}, {
          caller,
          signal,
          sourceId: owner.sourceId,
          providerId: owner.providerId,
          generation: owner.generation
        }).terminal;
      }
    );
    ctx.effect(() => async () => {
      call();
      listTools();
      stop();
      status();
      for (const close of [...connections]) close();
      sockets.close();
      await new Promise((resolveClosed) => http.close(() => resolveClosed()));
    });
    await once(http.listen(0, "127.0.0.1"), "listening");
    const address = http.address();
    if (!address || typeof address === "string") throw new Error("Backend did not bind a TCP port");
    ctx.provide("devkitBackendServer", { endpoint: `ws://127.0.0.1:${address.port}/host`, token });
  }
};

export { createDevKitBackend, devKitBackendServerPlugin };
//# sourceMappingURL=backend-JJ65UYOH.mjs.map
//# sourceMappingURL=backend-JJ65UYOH.mjs.map