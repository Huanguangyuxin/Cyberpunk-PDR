#!/usr/bin/env node
import { runRhiDebugOperation } from './chunk-DVDZY2BO.mjs';
import { existsSync } from 'fs';
import { mkdir, writeFile, readFile } from 'fs/promises';
import { resolve, dirname, join } from 'path';
import { pathToFileURL } from 'url';
import { replayDeviceRequest, createRhiDebugError, tapeDigest, usesAccelerationStructures } from '@forgeax/engine-rhi-debug';
import { rhi, createShaderModule } from '@forgeax/engine-rhi-webgpu';
import { err } from '@forgeax/engine-types';

var replayInstance;
function providerUnavailable(expected, hint, cause) {
  return {
    ok: false,
    error: {
      code: "replay-backend-unavailable",
      expected,
      hint,
      detail: { stage: "provider", cause }
    }
  };
}
async function replayGpu(tape) {
  const native = process.env.FORGEAX_WEBGPU_NODE === "wgpu-native";
  if (!native && usesAccelerationStructures(tape))
    return providerUnavailable(
      "a replay provider with hardware Ray Query for a tape that builds acceleration structures",
      "Dawn has no acceleration structures; rerun with FORGEAX_WEBGPU_NODE=wgpu-native from an Engine contributor checkout with the native addon built.",
      "tape builds acceleration structures; the default Dawn provider cannot replay them"
    );
  if (replayInstance !== void 0) return { ok: true, value: replayInstance };
  if (native) {
    const entry = findNativeProvider(process.cwd());
    if (entry === void 0)
      return providerUnavailable(
        "the contributor-only @forgeax/engine-rhi-wgpu-native package with its built addon",
        "Run from an Engine contributor checkout after `pnpm --filter @forgeax/engine-rhi-wgpu-native build:native` and its `build`.",
        `no rhi-wgpu-native dist/index.mjs above ${process.cwd()}`
      );
    try {
      const provider = await import(pathToFileURL(entry).href);
      const installed = provider.installNavigatorGpu();
      if (!installed.ok)
        return providerUnavailable(
          "the native wgpu addon to load",
          installed.error.hint,
          installed.error.hint
        );
      replayInstance = installed.value;
      return { ok: true, value: installed.value };
    } catch (cause) {
      return providerUnavailable(
        "the native wgpu provider to load",
        "Rebuild @forgeax/engine-rhi-wgpu-native (`build:native`, then `build`).",
        cause instanceof Error ? cause.message : String(cause)
      );
    }
  }
  try {
    const dawn = await import('@forgeax/engine-dawn-node');
    Object.assign(globalThis, dawn.globals);
    replayInstance = dawn.create([]);
    return { ok: true, value: replayInstance };
  } catch (cause) {
    return providerUnavailable(
      "the Dawn WebGPU provider to load",
      "Dawn replay is opt-in: run `pnpm --filter @forgeax/engine-dawn-node build:native` from an Engine source checkout and retry rhi.inspect. Ray Query tapes use FORGEAX_WEBGPU_NODE=wgpu-native with its native addon built.",
      cause instanceof Error ? cause.message : String(cause)
    );
  }
}
function findNativeProvider(from) {
  for (let dir = resolve(from); ; dir = dirname(dir)) {
    for (const candidate of [
      join(dir, "packages/rhi-wgpu-native/dist/index.mjs"),
      join(dir, "node_modules/@forgeax/engine-rhi-wgpu-native/dist/index.mjs")
    ])
      if (existsSync(candidate)) return candidate;
    if (dirname(dir) === dir) return void 0;
  }
}
function createCliRhiDebugOperationContext() {
  return {
    captureFrame: async () => err(
      createRhiDebugError("capture-unavailable", {
        stage: "capture",
        cause: "the standalone CLI has no live App capture provider; start a recorder-enabled live host and invoke its rhiCapture root"
      })
    ),
    async readArtifact(artifact) {
      if (artifact.path === void 0) {
        return {
          ok: false,
          error: {
            code: "artifact-path-missing",
            expected: "ArtifactRef.path to identify a readable .rhitape file",
            hint: "Pass the path returned by the capture host together with its digest.",
            detail: { digest: artifact.digest }
          }
        };
      }
      try {
        return { ok: true, value: new Uint8Array(await readFile(artifact.path)) };
      } catch (cause) {
        return {
          ok: false,
          error: {
            code: "artifact-read-failed",
            expected: "the ArtifactRef path to be readable",
            hint: "Check the tape path and recapture if the artifact was removed.",
            detail: {
              path: artifact.path,
              reason: cause instanceof Error ? cause.message : String(cause)
            }
          }
        };
      }
    },
    async writeFile(path, bytes) {
      const target = resolve(path);
      try {
        await mkdir(dirname(target), { recursive: true });
        await writeFile(target, bytes);
        return { ok: true, value: target };
      } catch (cause) {
        return {
          ok: false,
          error: {
            code: "artifact-write-failed",
            expected: "the PNG output path to be writable",
            hint: "Choose a writable image.png path.",
            detail: {
              path: target,
              reason: cause instanceof Error ? cause.message : String(cause)
            }
          }
        };
      }
    },
    async createReplayBackend(tape) {
      const provider = await replayGpu(tape);
      if (!provider.ok) return provider;
      if (!("navigator" in globalThis) || globalThis.navigator === void 0) {
        Object.defineProperty(globalThis, "navigator", {
          value: {},
          configurable: true,
          writable: true
        });
      }
      Object.defineProperty(globalThis.navigator, "gpu", {
        value: provider.value,
        configurable: true,
        writable: true
      });
      const adapter = await rhi.requestAdapter();
      if (!adapter.ok) {
        return {
          ok: false,
          error: {
            code: "replay-backend-unavailable",
            expected: "a fresh replay WebGPU adapter",
            hint: adapter.error.hint,
            detail: { stage: "adapter", cause: adapter.error.hint }
          }
        };
      }
      const device = await adapter.value.requestDevice(
        replayDeviceRequest(tape, adapter.value.features, adapter.value.limits)
      );
      if (!device.ok) {
        return {
          ok: false,
          error: {
            code: "replay-backend-unavailable",
            expected: "a fresh replay WebGPU device satisfying the recorded tape",
            hint: device.error.hint,
            detail: { stage: "device", cause: device.error.hint }
          }
        };
      }
      const replayDevice = device.value;
      return {
        ok: true,
        value: {
          device: replayDevice,
          createShaderModule,
          release: () => {
            const native = replayDevice.nativeDevice();
            if (native.ok) native.value.destroy();
          }
        }
      };
    }
  };
}
async function runCliRhiDebugOperation(name, input) {
  const context = createCliRhiDebugOperationContext();
  const source = {
    kind: "rhi-tape",
    source: "cli",
    path: input.artifact,
    digest: input.digest ?? ""
  };
  const bytes = await context.readArtifact(source);
  if (!bytes.ok) return bytes;
  const artifact = { ...source, digest: input.digest ?? tapeDigest(bytes.value) };
  return runRhiDebugOperation(name, { ...input, artifact }, {
    ...context,
    readArtifact: async () => bytes
  });
}

export { createCliRhiDebugOperationContext, runCliRhiDebugOperation };
//# sourceMappingURL=chunk-IB3GZHDT.mjs.map
//# sourceMappingURL=chunk-IB3GZHDT.mjs.map