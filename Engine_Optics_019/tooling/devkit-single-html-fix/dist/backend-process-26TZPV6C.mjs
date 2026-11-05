#!/usr/bin/env node
import { logBackendStartup, traceBackendStartup } from './chunk-ECS2PUL5.mjs';
import { isValidStartupTimeoutMs } from './chunk-VNP4GISC.mjs';
import { spawn } from 'child_process';
import { randomUUID, createHash } from 'crypto';
import { realpathSync, mkdirSync, writeFileSync, linkSync, rmSync, openSync, closeSync, readFileSync, renameSync } from 'fs';
import { tmpdir } from 'os';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHostWebSocketClient } from '@forgeax/engine-host/transport';
import { isToolCommandContract, commandContribution } from '@forgeax/engine-tool-runtime';
import { WebSocket } from 'ws';

var DEFAULT_BACKEND_STARTUP_TIMEOUT_MS = 12e4;
function resolveBackendStartupTimeoutMs(timeoutMs) {
  const resolved = timeoutMs === void 0 ? DEFAULT_BACKEND_STARTUP_TIMEOUT_MS : timeoutMs;
  if (!isValidStartupTimeoutMs(resolved)) {
    throw new TypeError("startupTimeoutMs must be a positive timer-safe integer or null.");
  }
  return resolved;
}
async function waitForBackendStartup(timeoutMs, isReady, assertAlive, timeoutError) {
  const deadline = timeoutMs === null ? void 0 : Date.now() + timeoutMs;
  while (deadline === void 0 || Date.now() < deadline) {
    if (isReady()) return;
    assertAlive();
    await new Promise((done) => setTimeout(done, 50));
  }
  throw timeoutError();
}
function statePath(root) {
  const key = createHash("sha256").update(resolve(root)).digest("hex");
  return join(tmpdir(), "forgeax-backend", key, "session.json");
}
function alive(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === "EPERM";
  }
}
function readState(root) {
  const path = statePath(root);
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return void 0;
    throw error;
  }
}
function removeState(root, id) {
  if (readState(root)?.id === id) rmSync(statePath(root), { force: true });
}
function writeState(state) {
  const path = statePath(state.root);
  const pending = `${path}.${state.id}.tmp`;
  writeFileSync(pending, `${JSON.stringify(state)}
`, { mode: 384 });
  renameSync(pending, path);
}
async function request(root, service, payload, timeout = 12e4, signal) {
  const state = readState(root);
  if (!state || !alive(state.pid) || state.phase !== "ready" || !state.endpoint || !state.token) {
    throw new Error("Engine backend is not ready. Run forgeax backend start first.");
  }
  const url = new URL(state.endpoint);
  url.searchParams.set("token", state.token);
  const socket = new WebSocket(url.href, { handshakeTimeout: 5e3 });
  try {
    const transport = await createHostWebSocketClient(socket);
    try {
      return await transport.request(service, payload, {
        signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(timeout)]) : AbortSignal.timeout(timeout)
      });
    } finally {
      transport.close();
    }
  } finally {
    socket.terminate();
  }
}
async function discoverDevKitBackendTools(root) {
  const state = readState(root);
  if (!state || !alive(state.pid) || state.phase !== "ready") return [];
  const contract = await request(root, "engine.backend.tool.list", void 0, 5e3);
  if (!isToolCommandContract(contract)) throw new TypeError("invalid backend tool contract");
  return contract.commands.map(
    (declaration) => commandContribution(declaration, async () => async (args, context) => {
      const terminal = await runDevKitBackendTool(root, declaration.id, args, context.signal);
      if (terminal.outcome === "succeeded")
        return { ok: true, value: terminal.result, artifacts: terminal.artifacts };
      if (terminal.outcome === "failed") return { ok: false, error: terminal.failure };
      return {
        ok: false,
        error: {
          code: "tool-run-cancelled",
          expected: "a completed backend operation",
          hint: "Start a fresh request.",
          detail: { reason: "backend operation cancelled" }
        }
      };
    })
  );
}
async function runDevKitBackendTool(root, operation, args = {}, signal) {
  return await request(
    root,
    "engine.backend.call",
    { operation, args },
    3e5,
    signal
  );
}
async function callDevKitBackend(root, operation, args = {}) {
  const terminal = await runDevKitBackendTool(root, operation, args);
  if (terminal.outcome === "failed") {
    const error = new Error(terminal.failure.hint);
    Object.assign(error, terminal.failure);
    throw error;
  }
  return terminal.result;
}
async function devKitBackendStatus(rootInput) {
  const root = resolve(rootInput);
  const state = readState(root);
  if (!state || !alive(state.pid)) return { root, phase: "stopped" };
  if (state.phase === "starting")
    return {
      root,
      phase: "starting",
      pid: state.pid,
      ...state.hostPack === void 0 ? {} : { hostPack: state.hostPack }
    };
  try {
    await request(root, "engine.backend.status", void 0, 5e3);
    return {
      root,
      phase: "ready",
      pid: state.pid,
      ...state.hostPack === void 0 ? {} : { hostPack: state.hostPack }
    };
  } catch {
    return {
      root,
      phase: "unreachable",
      pid: state.pid,
      ...state.hostPack === void 0 ? {} : { hostPack: state.hostPack }
    };
  }
}
async function stopDevKitBackend(rootInput) {
  const root = resolve(rootInput);
  const state = readState(root);
  if (!state) return { root, phase: "stopped" };
  if (!alive(state.pid)) {
    removeState(root, state.id);
    return { root, phase: "stopped" };
  }
  await request(root, "engine.backend.stop", void 0, 5e3);
  const deadline = Date.now() + 15e3;
  while (Date.now() < deadline) {
    if (!alive(state.pid) || readState(root)?.id !== state.id) return { root, phase: "stopped" };
    await new Promise((done) => setTimeout(done, 50));
  }
  throw new Error(
    `Engine backend is still stopping; inspect ${join(dirname(statePath(root)), "backend.log")} and backend status.`
  );
}
function devKitBackendHostPack(rootInput) {
  const state = readState(resolve(rootInput));
  return state && alive(state.pid) ? state.hostPack : void 0;
}
async function startDevKitBackend(rootInput, options = {}) {
  const root = resolve(rootInput);
  const hostPack = options.hostPack === void 0 ? void 0 : realpathSync(options.hostPack);
  const startupTimeoutMs = resolveBackendStartupTimeoutMs(options.startupTimeoutMs);
  const current = readState(root);
  if (current && alive(current.pid)) {
    if (hostPack !== void 0 && current.hostPack !== hostPack)
      throw new Error(
        `Backend already runs with a different host Pack: ${current.hostPack ?? "none"}`
      );
    return devKitBackendStatus(root);
  }
  if (current) removeState(root, current.id);
  const path = statePath(root);
  mkdirSync(dirname(path), { recursive: true });
  const id = randomUUID();
  const initial = {
    id,
    root,
    pid: process.pid,
    phase: "starting",
    ...hostPack === void 0 ? {} : { hostPack }
  };
  const claim = `${path}.${id}.claim`;
  writeFileSync(claim, `${JSON.stringify(initial)}
`, { mode: 384 });
  try {
    linkSync(claim, path);
  } catch (error) {
    if (error.code === "EEXIST") {
      const owner = readState(root);
      if (hostPack !== void 0 && owner?.hostPack !== hostPack)
        throw new Error(
          `Backend already starts with a different host Pack: ${owner?.hostPack ?? "none"}`
        );
      return devKitBackendStatus(root);
    }
    throw error;
  } finally {
    rmSync(claim, { force: true });
  }
  const logPath = join(dirname(path), "backend.log");
  const log = openSync(logPath, "a", 384);
  let child;
  try {
    child = spawn(
      process.execPath,
      [fileURLToPath(new URL("./cli.mjs", import.meta.url)), "--__forgeax-backend", root, id],
      {
        detached: true,
        stdio: ["ignore", log, log],
        env: process.env
      }
    );
    logBackendStartup(
      {
        stage: "daemon-spawn",
        event: "spawned",
        hostPid: process.pid,
        childPid: child.pid,
        time: (/* @__PURE__ */ new Date()).toISOString()
      },
      log
    );
  } catch (error) {
    removeState(root, id);
    throw error;
  } finally {
    closeSync(log);
  }
  let failure;
  child.once("error", (error) => {
    failure = error;
  });
  child.unref();
  await waitForBackendStartup(
    startupTimeoutMs,
    () => {
      const state = readState(root);
      return state?.id === id && state.phase === "ready";
    },
    () => {
      if (failure || !child.pid || !alive(child.pid)) {
        removeState(root, id);
        throw failure ?? new Error(`Engine backend startup failed; inspect ${logPath}`);
      }
    },
    () => new Error(
      `Engine backend startup is still pending after ${startupTimeoutMs}ms; inspect ${logPath} and backend status.`
    )
  );
  return devKitBackendStatus(root);
}
async function runDevKitBackendProcess(root, id) {
  logBackendStartup({
    stage: "daemon-entry",
    event: "begin",
    pid: process.pid,
    time: (/* @__PURE__ */ new Date()).toISOString()
  });
  const claim = readState(root);
  if (claim?.id !== id) throw new Error("Backend startup claim was replaced");
  const { createDevKitBackend, devKitBackendServerPlugin } = await import('./backend-JJ65UYOH.mjs');
  const hostPack = claim.hostPack;
  writeState({
    root,
    id,
    pid: process.pid,
    phase: "starting",
    ...hostPack === void 0 ? {} : { hostPack }
  });
  let stop;
  const closed = new Promise((done) => {
    stop = done;
  });
  process.once("SIGTERM", stop);
  process.once("SIGINT", stop);
  let backend;
  try {
    backend = await traceBackendStartup(
      "backend-create",
      () => createDevKitBackend(root, hostPack === void 0 ? {} : { hostPack })
    );
    const startedBackend = backend;
    await traceBackendStartup("server-listen", async () => {
      await (await startedBackend.host.context.plugin(devKitBackendServerPlugin, { stop })).await();
    });
    writeState({
      root,
      id,
      pid: process.pid,
      phase: "ready",
      ...hostPack === void 0 ? {} : { hostPack },
      ...backend.host.context.devkitBackendServer
    });
    await closed;
  } finally {
    try {
      await traceBackendStartup("backend-dispose", async () => {
        await backend?.dispose();
      });
    } finally {
      removeState(root, id);
      process.off("SIGTERM", stop);
      process.off("SIGINT", stop);
    }
  }
}

export { DEFAULT_BACKEND_STARTUP_TIMEOUT_MS, callDevKitBackend, devKitBackendHostPack, devKitBackendStatus, discoverDevKitBackendTools, resolveBackendStartupTimeoutMs, runDevKitBackendProcess, runDevKitBackendTool, startDevKitBackend, stopDevKitBackend, waitForBackendStartup };
//# sourceMappingURL=backend-process-26TZPV6C.mjs.map
//# sourceMappingURL=backend-process-26TZPV6C.mjs.map