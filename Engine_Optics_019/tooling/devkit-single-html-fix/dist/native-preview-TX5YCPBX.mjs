#!/usr/bin/env node
import { nativePreviewPlugins, createNativePreviewPlugin } from './chunk-WTUHF6YQ.mjs';
import { resolveBrowserExecutable, acquireBrowserCarrierPage, captureBrowserExecutionSurface, browserLaunchArgs, classifyCaptureAdapter } from './chunk-I7CPTDO2.mjs';
import { createViteConfig } from './chunk-O7QEAHSA.mjs';
import './chunk-UTXAIODQ.mjs';
import './chunk-6AKTNSSW.mjs';
import './chunk-ZDSMIZQ7.mjs';
import './chunk-WBZD4GEB.mjs';
import './chunk-A2W6KPHB.mjs';
import './chunk-5KRT3YGN.mjs';
import { assetInspectCommand } from './chunk-62ITDDCW.mjs';
import './chunk-SFUAONG6.mjs';
import './chunk-X5IGMUF7.mjs';
import { readProjectFacts } from './chunk-VNP4GISC.mjs';
import { readFile, mkdir, writeFile, mkdtemp, rename, rm } from 'fs/promises';
import { resolve, dirname, join, relative, sep } from 'path';
import { createToolPreviewRecipe, toolPreviewSubjectDrawn } from '@forgeax/engine-app';
import { decodeCatalogWire } from '@forgeax/engine-pack';
import { Context, createToolApiPlugin, startNativePlugin, createContextCapabilityResolver } from '@forgeax/engine-plugin';
import { RESOURCE_PREVIEW_DEFAULT_SIZE, createPreviewHost, createResourcePreviewReport } from '@forgeax/engine-preview';
import { domainFailureError, createPreviewArtifactManifest, validatePreviewArtifactManifest, createArtifactRef } from '@forgeax/engine-tool-runtime';
import { readCatalogRows } from '@forgeax/engine-types';
import { createHash } from 'crypto';
import { once } from 'events';
import { createServer as createServer$1 } from 'net';
import { chromium } from 'playwright';
import { createServer } from 'vite';

async function waitForBrowserToolHost(realm, name, timeoutMs = 45e3) {
  const observation = await realm.waitForFunction(
    (key) => {
      const fatal = document.querySelector("#forgeax-fatal");
      if (fatal?.checkVisibility())
        return (document.querySelector("#forgeax-fatal-details")?.textContent?.trim() || fatal.textContent?.trim() || "Engine startup failed").slice(0, 16384);
      return globalThis[key]?.ready === true;
    },
    name,
    { timeout: timeoutMs }
  );
  let failure;
  try {
    failure = await observation.jsonValue();
  } finally {
    await observation.dispose();
  }
  if (typeof failure === "string")
    throw {
      code: "tool-preview-startup-failed",
      expected: "the generated Engine Host to start without a terminal failure",
      hint: "Repair the reported startup cause before retrying this preview.",
      detail: { cause: failure }
    };
}
function transportCause(cause) {
  if (cause instanceof Error) {
    return {
      name: cause.name,
      message: cause.message,
      ...cause.stack === void 0 ? {} : { stack: cause.stack }
    };
  }
  if (cause === void 0) return "undefined";
  try {
    return JSON.parse(JSON.stringify(cause));
  } catch {
    return String(cause);
  }
}
function dataUriBytes(uri) {
  const separator = uri.indexOf(",");
  if (separator < 0) throw new TypeError("preview artifact must be a data URI before publication");
  return Buffer.from(uri.slice(separator + 1), "base64");
}
function projectUri(projectRoot, path) {
  return relative(projectRoot, path).split(sep).join("/");
}
async function observeBrowserAdapter(realm) {
  return realm.evaluate(async () => {
    try {
      const gpuAdapter = await navigator.gpu?.requestAdapter();
      if (gpuAdapter === null || gpuAdapter === void 0) return { adapter: null };
      const info = gpuAdapter.info;
      return {
        adapter: {
          vendor: info.vendor,
          architecture: info.architecture,
          device: info.device,
          description: info.description
        }
      };
    } catch {
      return { adapter: null };
    }
  }).then((result) => {
    const adapter = result.adapter !== null && typeof result.adapter === "object" && !Array.isArray(result.adapter) ? result.adapter : null;
    return { observed: classifyCaptureAdapter(adapter), adapter };
  });
}
async function allocateLoopbackPort() {
  const probe = createServer$1();
  try {
    await once(probe.listen(0, "127.0.0.1"), "listening");
    const address = probe.address();
    if (address === null || typeof address === "string") {
      throw new Error("loopback port probe did not expose a TCP address");
    }
    return address.port;
  } finally {
    if (probe.listening) {
      await new Promise((resolve2) => probe.close(() => resolve2()));
    }
  }
}
function sha256(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}
function artifactRef(artifact) {
  const kind = artifact.kind === "report" || artifact.kind === "contact-sheet" ? "tool-result" : artifact.kind;
  return {
    kind,
    digest: artifact.digest,
    uri: artifact.uri,
    mediaType: artifact.mediaType,
    sizeBytes: artifact.byteLength
  };
}
async function publishPreviewArtifacts(projectRoot, runId, result, reportInput) {
  if (result.manifest.identity.runId !== runId) {
    throw new Error(
      `preview artifact run identity mismatch: manifest=${result.manifest.identity.runId} requested=${runId}`
    );
  }
  const runsRoot = join(projectRoot, ".forgeax", "tool-runs");
  await mkdir(runsRoot, { recursive: true });
  const directoryName = runId.replace(/[^a-zA-Z0-9._-]/g, "_");
  const published = join(runsRoot, directoryName);
  const finalPaths = {
    tapeJson: join(published, "rhi-tape.json"),
    tapeBlob: join(published, "rhi-tape.bin"),
    capturePng: join(published, "capture.png"),
    freshReplayPng: join(published, "fresh-replay.png"),
    profile: join(published, "profile.json"),
    manifest: join(published, "manifest.json"),
    report: join(published, "report.json")
  };
  const tapeJson = dataUriBytes(result.tape.jsonUri);
  const tapeBlob = dataUriBytes(result.tape.blobUri);
  const capturePng = dataUriBytes(result.capturePng.uri);
  const freshReplayPng = dataUriBytes(result.png.uri);
  const profile = dataUriBytes(result.profile.uri);
  const bytesByRole = {
    "rhi-tape": tapeJson,
    capture: capturePng,
    "fresh-replay": freshReplayPng,
    "profile-capture": profile
  };
  const uriByRole = {
    "rhi-tape": projectUri(projectRoot, finalPaths.tapeJson),
    capture: projectUri(projectRoot, finalPaths.capturePng),
    "fresh-replay": projectUri(projectRoot, finalPaths.freshReplayPng),
    "profile-capture": projectUri(projectRoot, finalPaths.profile)
  };
  const mediaTypeByRole = {
    "rhi-tape": "application/vnd.forgeax.rhi-tape+json",
    capture: "image/png",
    "fresh-replay": "image/png",
    "profile-capture": "application/vnd.forgeax.profile+json"
  };
  const requiredRoles = ["rhi-tape", "capture", "fresh-replay", "profile-capture"];
  const nonReportArtifacts = result.manifest.artifacts.filter((artifact) => artifact.role !== "report").map((artifact) => {
    if (!(artifact.role in bytesByRole)) {
      return artifact;
    }
    const role = artifact.role;
    const bytes = bytesByRole[role];
    const digest = sha256(bytes);
    if (artifact.digest !== digest) {
      throw new Error(`preview artifact digest mismatch for ${artifact.role}`);
    }
    return {
      ...artifact,
      uri: uriByRole[role],
      digest,
      byteLength: bytes.byteLength,
      mediaType: mediaTypeByRole[role]
    };
  });
  if (requiredRoles.some((role) => !nonReportArtifacts.some((artifact) => artifact.role === role))) {
    throw new Error(
      "preview publication is missing capture, fresh-replay, tape, or profile artifact"
    );
  }
  let report;
  let reportBytes;
  if (reportInput !== void 0) {
    if (reportInput.snapshot.digest !== result.manifest.identity.snapshotDigest) {
      throw new Error("preview report snapshot identity does not match the artifact manifest");
    }
    report = createResourcePreviewReport({
      runId,
      snapshot: reportInput.snapshot,
      subject: reportInput.subject,
      presentation: reportInput.presentation,
      oracle: reportInput.oracle,
      artifacts: nonReportArtifacts
    });
    reportBytes = new TextEncoder().encode(JSON.stringify(report));
  }
  const reportArtifact = reportBytes === void 0 ? void 0 : {
    owner: "resource-preview",
    kind: "report",
    role: "report",
    uri: projectUri(projectRoot, finalPaths.report),
    digest: sha256(reportBytes),
    byteLength: reportBytes.byteLength,
    mediaType: "application/vnd.forgeax.resource-preview+json",
    derivedFrom: nonReportArtifacts.map((artifact) => artifact.digest)
  };
  const manifest = createPreviewArtifactManifest({
    ...result.manifest,
    artifacts: reportArtifact === void 0 ? nonReportArtifacts : [reportArtifact, ...nonReportArtifacts]
  });
  const validated = validatePreviewArtifactManifest(
    manifest,
    reportArtifact === void 0 ? requiredRoles : ["report", ...requiredRoles]
  );
  if (!validated.ok) throw new Error(JSON.stringify(validated.error.detail));
  const staging = await mkdtemp(join(runsRoot, ".staging-"));
  const paths = {
    tapeJson: join(staging, "rhi-tape.json"),
    tapeBlob: join(staging, "rhi-tape.bin"),
    capturePng: join(staging, "capture.png"),
    freshReplayPng: join(staging, "fresh-replay.png"),
    profile: join(staging, "profile.json"),
    manifest: join(staging, "manifest.json"),
    report: join(staging, "report.json")
  };
  try {
    await Promise.all([
      writeFile(paths.tapeJson, tapeJson),
      writeFile(paths.tapeBlob, tapeBlob),
      writeFile(paths.capturePng, capturePng),
      writeFile(paths.freshReplayPng, freshReplayPng),
      writeFile(paths.profile, profile),
      ...reportBytes === void 0 ? [] : [writeFile(paths.report, reportBytes)]
    ]);
    await writeFile(paths.manifest, `${JSON.stringify(manifest, null, 2)}
`);
    await rename(staging, published);
  } catch (cause) {
    await rm(staging, { recursive: true, force: true });
    throw cause;
  }
  return {
    ...result,
    tape: {
      ...result.tape,
      jsonUri: projectUri(projectRoot, finalPaths.tapeJson),
      blobUri: projectUri(projectRoot, finalPaths.tapeBlob)
    },
    profile: { ...result.profile, uri: projectUri(projectRoot, finalPaths.profile) },
    capturePng: { ...result.capturePng, uri: projectUri(projectRoot, finalPaths.capturePng) },
    png: { ...result.png, uri: projectUri(projectRoot, finalPaths.freshReplayPng) },
    manifest,
    artifacts: manifest.artifacts.map(artifactRef)
  };
}
async function publishFailedPreviewCapture(projectRoot, runId, capture) {
  const root = join(projectRoot, ".forgeax", "tool-runs");
  await mkdir(root, { recursive: true });
  const published = join(
    root,
    `${runId.replace(/[^a-zA-Z0-9._-]/g, "_")}-${capture.captureId.replace(/[^a-zA-Z0-9._-]/g, "_")}-failed-capture`
  );
  const parts = [
    {
      name: "capture.rhitape",
      kind: "rhi-tape",
      mediaType: "application/octet-stream",
      bytes: dataUriBytes(capture.tape.jsonUri)
    },
    {
      name: "capture.png",
      kind: "png",
      mediaType: "image/png",
      bytes: dataUriBytes(capture.capturePng.uri)
    },
    {
      name: "profile.json",
      kind: "profile-capture",
      mediaType: "application/json",
      bytes: dataUriBytes(capture.profile.uri)
    }
  ];
  const staging = await mkdtemp(join(root, ".staging-"));
  try {
    await Promise.all(parts.map((part) => writeFile(join(staging, part.name), part.bytes)));
    await rename(staging, published);
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    throw error;
  }
  return parts.map(
    (part) => createArtifactRef({
      kind: part.kind,
      mediaType: part.mediaType,
      digest: sha256(part.bytes),
      sizeBytes: part.bytes.byteLength,
      uri: projectUri(projectRoot, join(published, part.name))
    })
  );
}
function browserFailure(phase, cause, pageErrors = []) {
  if (cause !== null && typeof cause === "object" && cause.code === "tool-preview-capability-unavailable") {
    const failure = cause;
    return {
      ok: false,
      error: {
        ...failure,
        detail: failure.detail
      }
    };
  }
  return {
    ok: false,
    error: {
      code: "tool-preview-browser-host-failed",
      expected: "a real Chromium page, project bootstrap, WebGPU device, and bounded preview run",
      hint: "Inspect the Browser Host phase and repair the project or local WebGPU capability.",
      detail: {
        phase,
        cause: transportCause(cause),
        pageErrors
      }
    }
  };
}
function skinCapabilityFailure(resourceKind, errors) {
  if (resourceKind !== "material") return void 0;
  if (!Array.isArray(errors)) return void 0;
  const cause = errors.find(isSkinCapabilityError);
  if (cause === void 0) return void 0;
  return {
    code: "tool-preview-capability-unavailable",
    expected: "a skinned material preview mesh with skinIndex, skinWeight, and Skin bindings",
    hint: "Preview this material through a scene or mesh that supplies the skinning contract.",
    detail: { phase: "capture-render", cause: transportCause(cause) }
  };
}
function isSkinCapabilityError(error) {
  return error !== null && typeof error === "object" && error.code === "material-skin-attr-missing" || typeof error === "string" && /\[RenderSystem\.extract \(material-skin-attr-missing\)\]\s*MaterialSkinAttrMissingError:/.test(
    error
  );
}
async function runBrowserPreviewHost(projectRoot, recipe, snapshot, runId, signal, bootstrapRoot = "project-bootstrap", resource, options = {}) {
  const facts = await readProjectFacts(projectRoot);
  if (!facts.ok)
    return { ok: false, error: { ...facts.error, detail: facts.error.detail } };
  if (signal.aborted) throw new Error("Browser Host aborted before configuration");
  const config = await createViteConfig(facts.value, "serve", "/", { bootstrapRoot });
  if (signal.aborted) throw new Error("Browser Host aborted before server creation");
  const cacheDir = await mkdtemp(join(facts.value.root, ".forgeax", ".browser-host-vite-"));
  let server;
  try {
    if (signal.aborted) throw new Error("Browser Host aborted before server creation");
    const port = await allocateLoopbackPort();
    if (signal.aborted) throw new Error("Browser Host aborted before server creation");
    server = await createServer({
      ...config,
      cacheDir,
      logLevel: "silent",
      optimizeDeps: {
        ...config.optimizeDeps,
        // Tool runs must observe the current workspace build, even when a
        // persistent runner retains Vite's optimized-dependency cache.
        force: true
      },
      server: {
        ...config.server,
        host: "127.0.0.1",
        port,
        // Vite's port 0 means its default 5173. Bind the probed port exactly so
        // another project or runner cannot be mistaken for this Browser Host.
        strictPort: true
      }
    });
    if (signal.aborted) {
      await server.close();
      throw new Error("Browser Host aborted before server listen");
    }
  } catch (cause) {
    await rm(cacheDir, { recursive: true, force: true });
    throw cause;
  }
  const hostStartedAtMs = performance.now();
  let phase = "server-listen";
  let browser;
  let browserServer;
  let page;
  let carrierAttachment;
  let carrierFallbackReason;
  let pageErrors = [];
  let completedCapture;
  const failedWithCapture = async (cause) => {
    const failure = browserFailure(phase, cause, pageErrors);
    if (!completedCapture) return failure;
    try {
      return {
        ...failure,
        artifacts: await publishFailedPreviewCapture(projectRoot, runId, completedCapture)
      };
    } catch (error) {
      return {
        ...failure,
        error: {
          ...failure.error,
          detail: {
            phase,
            cause: transportCause(cause),
            evidencePublicationError: transportCause(error)
          }
        }
      };
    }
  };
  let removePageListeners = () => {
  };
  const requestedBackend = options.backend ?? "auto";
  const launchBackend = requestedBackend === "software" ? "software" : "hardware";
  const headless = options.headless ?? recipe.presentation === "hidden";
  const channel = process.env.FORGEAX_CHROME_CHANNEL;
  const executablePath = channel === void 0 ? await resolveBrowserExecutable(void 0) : void 0;
  const launchBrowser = async (headlessMode, backend) => {
    const owner = await chromium.launchServer({
      ...channel === void 0 ? {} : { channel },
      ...executablePath === void 0 ? {} : { executablePath },
      headless: headlessMode,
      args: [
        ...browserLaunchArgs(backend, "development", false),
        "--autoplay-policy=no-user-gesture-required"
      ],
      ...backend === "software" ? {
        env: {
          ...Object.fromEntries(
            Object.entries(process.env).filter(
              (entry) => entry[1] !== void 0
            )
          ),
          LIBGL_ALWAYS_SOFTWARE: "1"
        }
      } : {},
      chromiumSandbox: true
    });
    browserServer = owner;
    try {
      if (signal.aborted) throw new Error("Browser Host aborted during browser launch");
      const connected = await chromium.connect(owner.wsEndpoint());
      if (signal.aborted) throw new Error("Browser Host aborted during browser connection");
      return connected;
    } catch (cause) {
      if (browserServer === owner) browserServer = void 0;
      await owner.kill();
      throw cause;
    }
  };
  const observePage = (target, execution) => {
    removePageListeners();
    const targetFrame = execution.kind === "frame" ? execution.realm : void 0;
    const onPageError = (error) => {
      if (targetFrame === void 0) pageErrors.push(error.message);
    };
    const onConsole = (message) => {
      if (message.type() !== "error" && message.type() !== "warning") return;
      if (targetFrame !== void 0) {
        const location = message.location().url;
        const targetUrl = typeof targetFrame.url === "function" ? targetFrame.url() : "";
        if (location !== "" && targetUrl !== "" && location !== targetUrl) return;
      }
      pageErrors.push(`${message.type()}: ${message.text()}`);
    };
    const onResponse = (response) => {
      if (targetFrame !== void 0 && response.frame() !== targetFrame) return;
      if (response.status() >= 400) {
        pageErrors.push(`HTTP ${response.status()}: ${response.url()}`);
      }
    };
    target.on("pageerror", onPageError);
    target.on("console", onConsole);
    target.on("response", onResponse);
    removePageListeners = () => {
      target.off?.("pageerror", onPageError);
      target.off?.("console", onConsole);
      target.off?.("response", onResponse);
      removePageListeners = () => {
      };
    };
  };
  let browserRetirement = Promise.resolve();
  const closeBrowserProcess = async (releaseCarrier = false) => {
    const activePage = page;
    const activeBrowser = browser;
    const activeBrowserServer = browserServer;
    const activeCarrier = carrierAttachment;
    page = void 0;
    browser = void 0;
    browserServer = void 0;
    removePageListeners();
    if (releaseCarrier) carrierAttachment = void 0;
    browserRetirement = Promise.allSettled([
      browserRetirement,
      ...activeCarrier === void 0 && activePage !== void 0 ? [activePage.close().catch(() => void 0)] : [],
      activeBrowser?.close(),
      // These private preview realms have no borrowed application lifetime.
      // Retire the actual process even if its client has already disconnected.
      activeBrowserServer?.kill(),
      ...releaseCarrier && activeCarrier !== void 0 ? [activeCarrier.close("tool-preview-close")] : []
    ]);
    await browserRetirement;
  };
  const abort = () => {
    void closeBrowserProcess(true);
    void server.close();
  };
  signal.addEventListener("abort", abort, { once: true });
  try {
    if (signal.aborted) throw new Error("Browser Host aborted before launch");
    await server.listen();
    const address = server.httpServer?.address();
    if (address === null || address === void 0 || typeof address === "string") {
      throw new Error("Vite Browser Host did not expose a loopback TCP address");
    }
    phase = "server-transform";
    const entryTransform = await server.transformRequest("/main.ts");
    if (entryTransform === null) {
      throw new Error("Vite Browser Host entry transform returned no module");
    }
    const captureUrl = new URL(`http://127.0.0.1:${address.port}/`);
    captureUrl.searchParams.set("forgeax-tool-recipe", JSON.stringify(recipe));
    captureUrl.searchParams.set("forgeax-tool-snapshot", JSON.stringify(snapshot));
    captureUrl.searchParams.set("forgeax-tool-run-id", runId);
    if (resource !== void 0)
      captureUrl.searchParams.set("forgeax-resource-preview", JSON.stringify(resource));
    if (!headless && recipe.presentation !== "hidden" && options.carrier !== void 0) {
      if (options.carrierRun === void 0 || options.carrierGeneration === void 0) {
        throw new Error(
          "browser host carrier requires carrierRun and carrierGeneration for a visible page"
        );
      }
      phase = "capture-carrier-select";
      const acquired = await acquireBrowserCarrierPage(
        options.carrier,
        {
          run: options.carrierRun,
          generation: options.carrierGeneration,
          headless: false,
          gpu: "auto",
          width: recipe.viewport.width,
          height: recipe.viewport.height,
          url: captureUrl.href
        },
        { signal, releaseReason: "tool-preview-attach-failed" }
      );
      carrierAttachment = acquired.attachment;
      carrierFallbackReason = acquired.fallbackReason;
      if (carrierAttachment !== void 0) page = carrierAttachment.page;
    }
    if (page === void 0) {
      phase = "capture-browser-launch";
      browser = await launchBrowser(headless, launchBackend);
      phase = "capture-page-bootstrap";
      page = await browser.newPage({
        viewport: recipe.viewport,
        deviceScaleFactor: 1
      });
    }
    const capturePage = page;
    if (capturePage === void 0) throw new Error("Browser Host did not provide a capture page");
    const captureExecution = carrierAttachment?.execution ?? {
      kind: "page",
      ownerPage: capturePage,
      realm: capturePage
    };
    const captureRealm = captureExecution.realm;
    observePage(capturePage, captureExecution);
    await captureRealm.goto(captureUrl.href, { waitUntil: "domcontentloaded", timeout: 45e3 });
    await waitForBrowserToolHost(captureRealm, "__forgeaxToolHost");
    phase = "capture-run";
    const captured = await captureRealm.evaluate(async () => {
      const host = globalThis.__forgeaxToolHost;
      const value2 = await host.capture();
      return JSON.parse(
        JSON.stringify(
          value2,
          (_key, nested) => nested instanceof Error ? {
            ...nested,
            name: nested.name,
            message: nested.message,
            stack: nested.stack
          } : nested
        )
      );
    });
    if (!captured.ok) return browserFailure("capture-run", captured.error, pageErrors);
    completedCapture = captured.result;
    const captureCapabilityFailure = skinCapabilityFailure(resource?.kind, [
      ...Array.isArray(captured.result.appErrors) ? captured.result.appErrors : [],
      ...pageErrors
    ]);
    const unexpectedPageErrors = captureCapabilityFailure === void 0 ? pageErrors : pageErrors.filter((error) => !isSkinCapabilityError(error));
    if (unexpectedPageErrors.length > 0)
      return browserFailure("capture-page-runtime", unexpectedPageErrors[0], unexpectedPageErrors);
    const observedCapture = await observeBrowserAdapter(captureRealm);
    if (requestedBackend !== "auto" && observedCapture.observed !== requestedBackend) {
      return {
        ok: false,
        error: {
          code: "tool-preview-backend-unavailable",
          expected: `the explicitly requested ${requestedBackend} browser adapter`,
          hint: "Use backend: auto to allow fallback, or repair the requested browser backend.",
          detail: {
            requested: requestedBackend,
            actual: observedCapture.observed,
            adapter: observedCapture.adapter
          }
        }
      };
    }
    const canvasCaptureUri = captured.result.capturePng?.uri;
    const reuseCanvasCapture = resource !== void 0 && canvasCaptureUri?.startsWith("data:image/png;base64,") === true;
    const capturePng = reuseCanvasCapture ? dataUriBytes(canvasCaptureUri) : await captureBrowserExecutionSurface(
      captureExecution,
      Date.now() + 45e3,
      recipe.viewport
    );
    const capturedResult = {
      ...captured.result,
      capturePng: {
        uri: `data:image/png;base64,${Buffer.from(capturePng).toString("base64")}`,
        width: reuseCanvasCapture ? captured.result.capturePng.width : recipe.viewport.width,
        height: reuseCanvasCapture ? captured.result.capturePng.height : recipe.viewport.height
      }
    };
    completedCapture = capturedResult;
    await closeBrowserProcess();
    pageErrors = [];
    phase = "replay-browser-launch";
    const replayBackend = observedCapture.observed === "software" ? "software" : launchBackend;
    browser = await launchBrowser(true, replayBackend);
    phase = "replay-page-bootstrap";
    page = await browser.newPage({
      viewport: recipe.viewport,
      deviceScaleFactor: 1
    });
    observePage(page, { kind: "page", ownerPage: page, realm: page });
    const replayUrl = new URL(`http://127.0.0.1:${address.port}/`);
    replayUrl.searchParams.set("forgeax-tool-replay", "1");
    await page.goto(replayUrl.href, { waitUntil: "domcontentloaded", timeout: 45e3 });
    await waitForBrowserToolHost(page, "__forgeaxToolReplayHost");
    phase = "replay-run";
    const result = await page.evaluate(async (serializedCapture) => {
      const host = globalThis.__forgeaxToolReplayHost;
      const value2 = await host.run(JSON.parse(serializedCapture));
      return JSON.parse(
        JSON.stringify(
          value2,
          (_key, nested) => nested instanceof Error ? {
            ...nested,
            name: nested.name,
            message: nested.message,
            stack: nested.stack
          } : nested
        )
      );
    }, JSON.stringify(capturedResult));
    if (!result.ok) return failedWithCapture(result.error);
    if (pageErrors.length > 0)
      return browserFailure("replay-page-runtime", pageErrors[0], pageErrors);
    const endedAtMs = performance.now();
    const phases = result.result.operationTiming.phases;
    const observedDurationMs = phases === void 0 ? 0 : Object.values(phases).reduce(
      (total, observation) => total + (observation.status === "observed" ? observation.durationMs : 0),
      0
    );
    const durationMs = endedAtMs - hostStartedAtMs;
    const value = {
      ...result.result,
      operationTiming: {
        ...result.result.operationTiming,
        startedAtMs: hostStartedAtMs,
        endedAtMs,
        durationMs,
        ...phases === void 0 ? { unattributedMs: durationMs } : {
          phases: {
            ...phases,
            transport: {
              status: "observed",
              durationMs: Math.max(0, durationMs - observedDurationMs)
            }
          },
          unattributedMs: 0
        }
      },
      actualCarrier: headless ? "headless-private" : carrierAttachment === void 0 ? "headed-private" : "visible-consumer",
      ...carrierAttachment === void 0 ? {} : { carrierTarget: carrierAttachment.target },
      ...carrierFallbackReason === void 0 ? {} : { carrierFallbackReason },
      backendRequested: requestedBackend,
      backendObserved: observedCapture.observed,
      ...captureCapabilityFailure === void 0 ? {} : { capabilityFailure: captureCapabilityFailure },
      ...requestedBackend === "auto" && observedCapture.observed === "software" ? { backendFallbackReason: "browser adapter reported a software implementation" } : {}
    };
    phase = "artifact-publish";
    return {
      ok: true,
      value: options.publish === false ? value : await publishPreviewArtifacts(projectRoot, runId, value)
    };
  } catch (cause) {
    return await failedWithCapture(cause);
  } finally {
    signal.removeEventListener("abort", abort);
    await closeBrowserProcess(true);
    await server.close().catch(() => void 0);
    await rm(cacheDir, { recursive: true, force: true });
  }
}
function runBrowserResourcePreviewHost(projectRoot, recipe, snapshot, runId, signal, resource, options = {}) {
  return runBrowserPreviewHost(
    projectRoot,
    recipe,
    snapshot,
    runId,
    signal,
    "resource-bootstrap",
    resource,
    options
  );
}

// src/tools/native-preview.ts
var DEFAULT_NATIVE_PREVIEW_TIMEOUT_MS = 12e4;
function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function adapterUnavailable(value, depth = 0) {
  if (depth > 8 || value === null || typeof value !== "object") return false;
  return isRecord(value) && value.code === "adapter-unavailable" || Object.values(value).some((nested) => adapterUnavailable(nested, depth + 1));
}
async function readPreviewCatalogRow(root, guid) {
  const indexPath = resolve(root, "dist", "pack-index.json");
  let raw;
  try {
    raw = await readFile(indexPath, "utf8");
  } catch (cause) {
    if (cause.code === "ENOENT") {
      return { ok: true, row: void 0 };
    }
    return {
      ok: false,
      code: "asset-index-unreadable",
      detail: { indexPath, reason: cause instanceof Error ? cause.message : String(cause) }
    };
  }
  let parsed;
  try {
    const decoded = decodeCatalogWire(JSON.parse(raw));
    if (!decoded.ok) {
      return {
        ok: false,
        code: "asset-index-invalid",
        detail: { indexPath, code: decoded.error.code, detail: decoded.error.detail }
      };
    }
    parsed = decoded.value;
  } catch (cause) {
    return {
      ok: false,
      code: "asset-index-invalid",
      detail: { indexPath, reason: cause instanceof Error ? cause.message : String(cause) }
    };
  }
  const rows = readCatalogRows(parsed);
  if (rows === void 0) {
    return { ok: false, code: "asset-index-invalid", detail: { indexPath, actual: typeof parsed } };
  }
  const row = rows.find(
    (candidate) => isRecord(candidate) && typeof candidate.guid === "string" && candidate.guid.toLowerCase() === guid.toLowerCase()
  );
  return { ok: true, row };
}
function previewCatalogFailure(guid, row) {
  const projection = isRecord(row.projection) ? row.projection : void 0;
  const operations = projection !== void 0 && isRecord(projection.operations) ? projection.operations : void 0;
  const preview = operations !== void 0 && isRecord(operations.preview) ? operations.preview : void 0;
  if (preview?.enabled === false) {
    return {
      code: "asset-preview-disabled",
      detail: { guid, reason: preview.reason ?? "catalog disabled preview" }
    };
  }
  const publication = isRecord(row.publication) ? row.publication : void 0;
  const current = publication !== void 0 && isRecord(publication.current) ? publication.current : void 0;
  if (row.lifecycle !== "current" || typeof current?.packageUrl !== "string" || current.packageUrl.length === 0) {
    return {
      code: "asset-preview-output-unavailable",
      detail: { guid, lifecycle: row.lifecycle ?? null }
    };
  }
  return void 0;
}
function failed(failure, artifacts = []) {
  return {
    outcome: "failed",
    failure: {
      code: "tool-domain-failed",
      expected: failure.expected ?? "the asset preview to complete",
      hint: failure.hint ?? "Inspect the preview owner failure and retry.",
      detail: {
        code: failure.code,
        ...failure.detail === void 0 ? {} : { payload: failure.detail }
      }
    },
    artifacts
  };
}
async function runNativePreviewTool(contribution, args, options, projectRoot, previewOptions = {}) {
  const kind = contribution.descriptor.id.split(".")[1];
  if (kind !== "material" && kind !== "mesh" && kind !== "texture" && kind !== "vfx") {
    throw new Error(`unsupported native preview operation ${contribution.descriptor.id}`);
  }
  const parsed = contribution.descriptor.argsSchema.parse(args);
  if (!parsed.ok) {
    return {
      outcome: "failed",
      failure: {
        code: "tool-invalid-args",
        expected: "preview arguments to match the operation argsSchema",
        hint: "Pass { guid } and an optional power-of-two size from AssetRegistry catalog identity.",
        detail: { message: parsed.error, value: null }
      },
      artifacts: []
    };
  }
  const request = parsed.value;
  const { guid, size = RESOURCE_PREVIEW_DEFAULT_SIZE } = request;
  const width = previewOptions.width ?? size;
  const height = previewOptions.height ?? size;
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0) {
    return failed({
      code: "tool-preview-extent-invalid",
      expected: "preview width and height to be positive safe integers",
      hint: "Pass positive --width and --height values.",
      detail: { width, height }
    });
  }
  const facts = await readProjectFacts(projectRoot);
  if (facts.ok) {
    const catalog = await readPreviewCatalogRow(projectRoot, guid);
    if (!catalog.ok) {
      return failed({
        code: catalog.code,
        expected: "the project asset catalog to be readable",
        hint: "Rebuild the project to regenerate dist/pack-index.json, then retry.",
        detail: catalog.detail
      });
    }
    if (catalog.row !== void 0) {
      const catalogFailure = previewCatalogFailure(guid, catalog.row);
      if (catalogFailure !== void 0) {
        return failed({
          ...catalogFailure,
          expected: catalogFailure.code === "asset-preview-disabled" ? "the selected catalog asset to allow preview" : "the selected asset to have a ready published output",
          hint: catalogFailure.code === "asset-preview-disabled" ? "Use the catalog-supported operation or publish a previewable projection." : "Run the owning producer, then retry the preview with the same GUID."
        });
      }
    } else {
      const inspected = await assetInspectCommand({ root: projectRoot, subject: guid });
      if (!inspected.ok) return failed(inspected.error);
      const value = inspected.value;
      if (value !== null && typeof value === "object" && !Array.isArray(value) && "status" in value && value.status !== "ready") {
        return failed({
          code: "asset-preview-output-unavailable",
          expected: "the selected asset to have a ready published output",
          hint: "Run the owning producer, then retry the preview with the same GUID.",
          detail: { guid, status: value.status }
        });
      }
    }
  }
  const selectedPreviewPlugin = nativePreviewPlugins.find(
    ([, , tool]) => tool.descriptor.id === contribution.descriptor.id
  );
  if (selectedPreviewPlugin === void 0) {
    throw new Error(`native preview plugin does not export ${contribution.descriptor.id}`);
  }
  const selectedPluginName = selectedPreviewPlugin[0];
  const snapshot = options.snapshot ?? { revision: 0, digest: `sha256:project:${projectRoot}` };
  const previewRunId = `${contribution.descriptor.id}:${crypto.randomUUID()}`;
  const previewController = new AbortController();
  const parentSignal = options.signal;
  const onParentAbort = () => previewController.abort(parentSignal?.reason);
  if (parentSignal?.aborted) previewController.abort(parentSignal.reason);
  else parentSignal?.addEventListener("abort", onParentAbort, { once: true });
  const timeoutMs = options.deadlineMs ?? DEFAULT_NATIVE_PREVIEW_TIMEOUT_MS;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 12e4) {
    parentSignal?.removeEventListener("abort", onParentAbort);
    return failed({
      code: "tool-preview-timeout-invalid",
      expected: "deadlineMs within (0, 120000]",
      hint: "Pass a finite positive preview deadline.",
      detail: { timeoutMs }
    });
  }
  const recipe = createToolPreviewRecipe({
    presentation: "hidden",
    viewport: { width, height },
    frames: 32
  });
  const runBrowser = (backend) => runBrowserResourcePreviewHost(
    projectRoot,
    recipe,
    snapshot,
    previewRunId,
    previewController.signal,
    { kind, guid, size },
    {
      publish: false,
      ...backend === void 0 ? {} : { backend },
      ...previewOptions.headless === void 0 ? {} : { headless: previewOptions.headless }
    }
  );
  const requestedBackend = previewOptions.backend ?? "auto";
  const browserPromise = (async () => {
    const first = await runBrowser(previewOptions.backend);
    if (first.ok || previewController.signal.aborted || requestedBackend !== "auto" || (first.artifacts?.length ?? 0) > 0 || !adapterUnavailable(first.error)) {
      return { value: first, fallbackReason: void 0 };
    }
    const retry = await runBrowser("software");
    return {
      value: retry,
      fallbackReason: retry.ok ? "hardware-first preview failed; software adapter was selected" : void 0
    };
  })();
  let timeout;
  const timeoutPromise = new Promise((resolve2) => {
    timeout = setTimeout(resolve2, timeoutMs);
  });
  let browserRace;
  try {
    browserRace = await Promise.race([
      browserPromise.then((value) => ({ timedOut: false, value })),
      timeoutPromise.then(() => ({ timedOut: true }))
    ]);
  } catch (cause) {
    if (timeout !== void 0) clearTimeout(timeout);
    parentSignal?.removeEventListener("abort", onParentAbort);
    throw cause;
  }
  if (timeout !== void 0) clearTimeout(timeout);
  parentSignal?.removeEventListener("abort", onParentAbort);
  if (browserRace.timedOut) {
    previewController.abort(new Error("native preview deadline exceeded"));
    const retired = await browserPromise.catch(() => void 0);
    return failed(
      {
        code: "tool-preview-timeout",
        expected: `the asset preview to complete within ${timeoutMs}ms`,
        hint: "Inspect the preview bootstrap or producer output; retry only after the owner is ready.",
        detail: { guid, timeoutMs }
      },
      retired && !retired.value.ok ? retired.value.artifacts ?? [] : []
    );
  }
  const browser = browserRace.value.value;
  const backendFallbackReason = browserRace.value.fallbackReason;
  const resourceAsset = browser.ok ? browser.value.resource?.asset : void 0;
  if (!browser.ok || browser.value.resource === void 0 || !isRecord(resourceAsset)) {
    const failure = browser.ok ? {
      code: "tool-preview-bootstrap-failed",
      expected: "the Browser resource bootstrap to return AssetRegistry owner facts",
      hint: "Inspect resource-bootstrap and retry after the owner publishes the GUID payload.",
      detail: { phase: "resource-owner" }
    } : browser.error;
    return {
      outcome: "failed",
      failure: {
        code: "tool-domain-failed",
        expected: failure.expected ?? "the Browser resource bootstrap to succeed",
        hint: failure.hint ?? "Inspect the Browser resource bootstrap failure and retry.",
        detail: {
          code: failure.code,
          ...failure.detail === void 0 ? {} : { payload: failure.detail }
        }
      },
      artifacts: browser.ok ? [] : browser.artifacts ?? []
    };
  }
  const resource = browser.value.resource;
  const subjectDrawn = toolPreviewSubjectDrawn(kind, browser.value.drawCalls);
  const outputPath = previewOptions.output === void 0 ? void 0 : resolve(projectRoot, previewOptions.output);
  const publishFailureEvidence = async () => {
    try {
      const published = await publishPreviewArtifacts(projectRoot, previewRunId, browser.value);
      if (outputPath !== void 0) {
        const replayPath = resolve(projectRoot, published.png.uri);
        const replayBytes = await readFile(replayPath);
        await mkdir(dirname(outputPath), { recursive: true });
        await writeFile(outputPath, replayBytes);
      }
      return published.artifacts;
    } catch {
      return [];
    }
  };
  if (browser.value.capabilityFailure !== void 0) {
    const capabilityFailure = browser.value.capabilityFailure;
    return {
      outcome: "failed",
      failure: domainFailureError(
        capabilityFailure.code,
        capabilityFailure.expected,
        capabilityFailure.hint,
        capabilityFailure.detail
      ),
      artifacts: await publishFailureEvidence()
    };
  }
  if (!subjectDrawn) {
    return {
      outcome: "failed",
      failure: {
        code: "tool-domain-failed",
        expected: "the captured resource frame to contain a subject draw in addition to canonical presentation passes",
        hint: "Inspect material readiness and the RHI tape before retrying the same GUID preview.",
        detail: {
          code: "tool-preview-subject-not-rendered",
          payload: { kind, drawCalls: browser.value.drawCalls }
        }
      },
      artifacts: await publishFailureEvidence()
    };
  }
  const ctx = new Context();
  try {
    await ctx.plugin(createToolApiPlugin());
    const api = ctx.get("toolApi", false);
    if (api === void 0) throw new Error("native preview owner did not install ToolApi");
    const host = createPreviewHost({
      runId: `${contribution.descriptor.id}:native`,
      snapshot,
      projectRoot,
      backend: "webgpu",
      signal: options.signal ?? new AbortController().signal,
      subject: {
        guid,
        asset: resourceAsset,
        ...resource.digest === void 0 ? {} : { digest: resource.digest },
        ...resource.ownerFacts === void 0 ? {} : { ownerFacts: resource.ownerFacts }
      },
      renderer: {
        rendererReady: browser.value.trace.events.includes("renderer-created"),
        worldReady: browser.value.trace.events.includes("world-updated"),
        drawCalls: browser.value.drawCalls,
        nonBlackPixels: browser.value.nonBlackPixels,
        ...resource.observation === void 0 ? {} : { observation: resource.observation },
        ...kind === "vfx" && resource.observation !== void 0 ? {
          vfx: {
            dispatches: typeof resource.observation.dispatches === "number" ? resource.observation.dispatches : 0,
            indirectDraws: typeof resource.observation.indirectDraws === "number" ? resource.observation.indirectDraws : 0,
            subjectOutputs: typeof resource.observation.subjectOutputs === "number" ? resource.observation.subjectOutputs : 0
          }
        } : {},
        texture: { drawCalls: browser.value.drawCalls }
      },
      artifacts: browser.value.artifacts
    });
    const installed = await startNativePlugin(
      ctx,
      createNativePreviewPlugin(host, selectedPluginName)
    );
    if (!installed.ok) throw installed.error;
    const provider = api.list().find(
      (record) => record.descriptor.id === contribution.descriptor.id && record.callable && record.providerState === "active"
    );
    if (provider === void 0) {
      return {
        outcome: "failed",
        failure: {
          code: "tool-domain-failed",
          expected: `the native preview provider for ${contribution.descriptor.id} to activate`,
          hint: "Inspect the preview plugin Fiber and retry after it reports Callable.",
          detail: { code: "tool-preview-provider-unavailable" }
        },
        artifacts: await publishFailureEvidence()
      };
    }
    const terminal = await api.run(contribution.descriptor.id, args, {
      ...options,
      snapshot,
      providerId: provider.owner.providerId,
      sourceId: provider.owner.sourceId,
      capabilityResolver: createContextCapabilityResolver(ctx)
    }).terminal;
    if (terminal.outcome !== "succeeded") {
      const evidence = await publishFailureEvidence();
      return {
        ...terminal,
        artifacts: evidence.length === 0 ? terminal.artifacts : evidence
      };
    }
    const domainResult = terminal.result;
    let published;
    try {
      published = await publishPreviewArtifacts(projectRoot, previewRunId, browser.value, {
        snapshot,
        subject: domainResult.subject,
        presentation: domainResult.presentation,
        oracle: domainResult.oracle
      });
    } catch (cause) {
      return {
        outcome: "failed",
        failure: {
          code: "tool-domain-failed",
          expected: "the preview report and all capture artifacts to publish atomically",
          hint: "Inspect the artifact manifest identity or digest failure and retry the same ToolRun.",
          detail: {
            code: "tool-artifact-manifest-invalid",
            payload: cause instanceof Error ? cause.message : String(cause)
          }
        },
        artifacts: []
      };
    }
    const report = published.manifest.artifacts.find((artifact) => artifact.role === "report");
    if (report === void 0) {
      throw new Error("resource preview publisher returned no report artifact");
    }
    if (outputPath !== void 0) {
      const replayPath = resolve(projectRoot, published.png.uri);
      const replayBytes = await readFile(replayPath);
      await mkdir(dirname(outputPath), { recursive: true });
      await writeFile(outputPath, replayBytes);
    }
    const publishedTerminal = {
      ...terminal,
      result: {
        ...terminal.result,
        actualCarrier: browser.value.actualCarrier,
        ...browser.value.backendRequested === void 0 ? {} : { backendRequested: browser.value.backendRequested },
        ...browser.value.backendObserved === void 0 ? {} : { backendObserved: browser.value.backendObserved },
        ...backendFallbackReason === void 0 && browser.value.backendFallbackReason === void 0 ? {} : {
          backendFallbackReason: backendFallbackReason ?? browser.value.backendFallbackReason
        },
        ...outputPath === void 0 ? {} : { output: outputPath },
        report: {
          kind: "tool-result",
          digest: report.digest,
          uri: report.uri,
          mediaType: report.mediaType,
          sizeBytes: report.byteLength
        },
        artifacts: published.artifacts
      },
      artifacts: published.artifacts
    };
    return publishedTerminal;
  } finally {
    await ctx.fiber.dispose();
  }
}

export { runNativePreviewTool };
//# sourceMappingURL=native-preview-TX5YCPBX.mjs.map
//# sourceMappingURL=native-preview-TX5YCPBX.mjs.map