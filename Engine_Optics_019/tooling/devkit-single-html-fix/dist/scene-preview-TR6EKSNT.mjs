#!/usr/bin/env node
import { createDevKitWorkspaceProvider, createBrowserCapture } from './chunk-I7CPTDO2.mjs';
import './chunk-O7QEAHSA.mjs';
import './chunk-UTXAIODQ.mjs';
import './chunk-6AKTNSSW.mjs';
import './chunk-ZDSMIZQ7.mjs';
import './chunk-WBZD4GEB.mjs';
import './chunk-A2W6KPHB.mjs';
import './chunk-5KRT3YGN.mjs';
import './chunk-62ITDDCW.mjs';
import './chunk-SFUAONG6.mjs';
import './chunk-X5IGMUF7.mjs';
import './chunk-VNP4GISC.mjs';
import { randomUUID, createHash } from 'crypto';
import { mkdir, writeFile, stat } from 'fs/promises';
import { resolve, relative, sep } from 'path';
import { createEngineWorkspaceRuntime } from '@forgeax/engine-app';

var DEFAULT_SIZE = 1024;
var DEFAULT_BACKEND = "auto";
function failure(code, expected, hint, detail = {}, artifacts = []) {
  return {
    outcome: "failed",
    failure: {
      code: "tool-domain-failed",
      expected,
      hint,
      detail: { code, payload: detail }
    },
    artifacts
  };
}
function positiveExtent(value, fallback) {
  if (value === void 0) return fallback;
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) return void 0;
  return value;
}
function parseArgs(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return {
      ok: false,
      error: failure(
        "tool-invalid-args",
        "scene preview arguments to be an object with a GUID",
        'Pass { kind: "scene", guid } and retry.'
      )
    };
  }
  const candidate = value;
  if (typeof candidate.guid !== "string" || candidate.guid.trim() === "") {
    return {
      ok: false,
      error: failure(
        "tool-invalid-args",
        "scene preview arguments to include a non-empty guid",
        "Pass the published SceneAsset GUID from `asset list`."
      )
    };
  }
  const widthValue = positiveExtent(candidate.width, DEFAULT_SIZE);
  const heightValue = positiveExtent(candidate.height, DEFAULT_SIZE);
  if (widthValue === void 0 || heightValue === void 0) {
    return {
      ok: false,
      error: failure(
        "tool-invalid-args",
        "width and height to be positive safe integers",
        "Pass positive integer viewport dimensions.",
        { width: candidate.width ?? null, height: candidate.height ?? null }
      )
    };
  }
  const width = widthValue;
  const height = heightValue;
  const backend = candidate.backend;
  if (backend !== void 0 && backend !== "auto" && backend !== "hardware" && backend !== "software") {
    return {
      ok: false,
      error: failure(
        "tool-invalid-args",
        "backend to be auto, hardware, or software",
        "Use backend: auto for hardware-first fallback.",
        { backend }
      )
    };
  }
  if (candidate.headless !== void 0 && typeof candidate.headless !== "boolean") {
    return {
      ok: false,
      error: failure(
        "tool-invalid-args",
        "headless to be boolean",
        "Pass headless: true or false.",
        { headless: candidate.headless }
      )
    };
  }
  if (candidate.output !== void 0 && typeof candidate.output !== "string") {
    return {
      ok: false,
      error: failure(
        "tool-invalid-args",
        "output to be a project-relative path",
        "Pass a relative PNG output path.",
        { output: candidate.output }
      )
    };
  }
  return {
    ok: true,
    value: {
      guid: candidate.guid,
      width,
      height,
      backend: backend ?? DEFAULT_BACKEND,
      ...candidate.headless === void 0 ? {} : { headless: candidate.headless },
      ...candidate.output === void 0 ? {} : { output: candidate.output }
    }
  };
}
function dataUriBytes(uri) {
  const comma = uri.indexOf(",");
  if (comma < 0 || !uri.startsWith("data:image/png;base64,")) {
    throw new TypeError("workspace capture did not return a base64 PNG data URI");
  }
  return Buffer.from(uri.slice(comma + 1), "base64");
}
function digest(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}
function projectUri(root, path) {
  return relative(root, path).split(sep).join("/");
}
function jsonCopy(value) {
  const encoded = JSON.stringify(value);
  if (encoded === void 0) throw new TypeError("workspace result is not JSON serializable");
  return JSON.parse(encoded);
}
function sceneAsset(assets, guid) {
  return assets.find(
    (asset) => asset.kind === "scene" && asset.guid.toLowerCase() === guid.toLowerCase()
  );
}
async function runScenePreviewTool(args, projectRoot) {
  const parsed = parseArgs(args);
  if (!parsed.ok) return parsed.error;
  const input = parsed.value;
  const runId = `scene.preview:${randomUUID()}`;
  const outputRoot = resolve(
    projectRoot,
    ".forgeax",
    "tool-runs",
    runId.replace(/[^a-zA-Z0-9._-]/g, "_")
  );
  const output = resolve(
    projectRoot,
    input.output ?? `${projectUri(projectRoot, outputRoot)}/engine-canvas.png`
  );
  const provider = createDevKitWorkspaceProvider({
    width: input.width,
    height: input.height,
    headed: input.headless === false,
    // Scene packs can contain a cold producer closure (for example the
    // character pack in game-3d). Keep the workspace contract bounded while
    // allowing that one cold start to finish before the catalog is queried.
    readyTimeoutMs: 12e4
  });
  const runtime = createEngineWorkspaceRuntime(provider);
  const browser = createBrowserCapture(projectRoot);
  let browserSession;
  let opened;
  let preview;
  let engineArtifact;
  let compositorArtifact;
  let captureErrors;
  let reportUri;
  try {
    opened = await runtime.openProject({ root: projectRoot });
    const serverUrl = opened.target?.url;
    if (typeof serverUrl !== "string" || serverUrl.length === 0) {
      return failure(
        "scene-preview-target-url-missing",
        "the workspace provider to publish a browser target URL",
        "Reopen the project through the Engine workspace provider."
      );
    }
    browserSession = await browser.open({
      serverUrl,
      target: { kind: "project" },
      backend: input.backend,
      headless: input.headless ?? true,
      width: input.width,
      height: input.height,
      runId,
      outputDir: projectUri(projectRoot, outputRoot)
    });
    const assets = await runtime.listAssets({
      project: opened.project,
      handle: opened.handle
    });
    const asset = sceneAsset(assets, input.guid);
    if (asset === void 0) {
      return failure(
        "scene-preview-asset-not-found",
        "the requested GUID to resolve to a published SceneAsset",
        "Run `asset list --type scene` and retry with a current GUID.",
        { guid: input.guid }
      );
    }
    preview = await runtime.openPreview({
      project: opened.project,
      projectHandle: opened.handle,
      asset,
      width: input.width,
      height: input.height
    });
    const camera = jsonCopy(await preview.getCamera({ targetId: preview.target.targetId }));
    if (preview.capture === void 0) {
      return failure(
        "scene-preview-capture-unavailable",
        "the SceneAsset workspace preview to expose Engine canvas capture",
        "Use a workspace target with capture support and retry.",
        { guid: asset.guid }
      );
    }
    const capture = await preview.capture({
      targetId: preview.target.targetId,
      width: input.width,
      height: input.height
    });
    const bytes = dataUriBytes(capture.png);
    await mkdir(resolve(output, ".."), { recursive: true });
    await writeFile(output, bytes);
    const imageDigest = digest(bytes);
    const compositorPath = resolve(outputRoot, "compositor.png");
    engineArtifact = {
      kind: "png",
      digest: imageDigest,
      uri: projectUri(projectRoot, output),
      mediaType: "image/png",
      sizeBytes: bytes.byteLength
    };
    captureErrors = capture.errors;
    const compositor = await browserSession.capture(void 0, {
      purpose: "validate",
      output: projectUri(projectRoot, compositorPath)
    });
    const report = browserSession.report();
    reportUri = projectUri(projectRoot, report.report);
    const artifact = engineArtifact;
    if (artifact === void 0) {
      throw new Error("workspace Engine capture artifact was not retained");
    }
    const compositorSize = (await stat(compositorPath)).size;
    compositorArtifact = {
      kind: "png",
      digest: compositor.digest,
      uri: projectUri(projectRoot, compositorPath),
      mediaType: "image/png",
      sizeBytes: compositorSize
    };
    if (capture.errors !== void 0 && capture.errors.length > 0) {
      return failure(
        "scene-preview-render-errors",
        "the SceneAsset workspace preview to complete without Engine renderer errors",
        "Inspect capture.errors and the retained PNG/report artifacts before retrying.",
        {
          guid: asset.guid,
          errors: jsonCopy(capture.errors),
          engineCapture: artifact.uri,
          compositorCapture: compositorArtifact.uri,
          report: reportUri
        },
        [artifact, compositorArtifact]
      );
    }
    return {
      outcome: "succeeded",
      result: {
        kind: "scene",
        guid: asset.guid,
        asset,
        target: preview.target,
        camera,
        capture: {
          frameId: capture.frameId,
          width: capture.width,
          height: capture.height,
          digest: imageDigest,
          uri: artifact.uri,
          ...capture.errors === void 0 ? {} : { errors: capture.errors },
          compositor: {
            digest: compositor.digest,
            uri: compositorArtifact.uri,
            width: compositor.pixels.width,
            height: compositor.pixels.height
          }
        },
        backend: {
          requested: report.backendRequested,
          observed: report.backend,
          ...report.fallbackReason === void 0 ? {} : { fallbackReason: report.fallbackReason },
          report: reportUri
        }
      },
      artifacts: [artifact, compositorArtifact]
    };
  } catch (cause) {
    if (reportUri === void 0 && browserSession !== void 0) {
      try {
        reportUri = projectUri(projectRoot, browserSession.report().report);
      } catch {
      }
    }
    const retainedArtifacts = [engineArtifact, compositorArtifact].filter(
      (value) => value !== void 0
    );
    const detail = { guid: input.guid };
    if (captureErrors !== void 0 && captureErrors.length > 0) {
      detail.errors = jsonCopy(captureErrors);
    }
    if (engineArtifact !== void 0) detail.engineCapture = engineArtifact.uri;
    if (compositorArtifact !== void 0) detail.compositorCapture = compositorArtifact.uri;
    if (reportUri !== void 0) detail.report = reportUri;
    return failure(
      "scene-preview-failed",
      "the SceneAsset workspace preview and capture to complete",
      cause instanceof Error ? cause.message : String(cause),
      detail,
      retainedArtifacts
    );
  } finally {
    if (preview !== void 0) await runtime.closePreview(preview).catch(() => {
    });
    await runtime.dispose().catch(() => {
    });
    await browserSession?.close().catch(() => {
    });
    await browser.close().catch(() => {
    });
  }
}

export { runScenePreviewTool };
//# sourceMappingURL=scene-preview-TR6EKSNT.mjs.map
//# sourceMappingURL=scene-preview-TR6EKSNT.mjs.map