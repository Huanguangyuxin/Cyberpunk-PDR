#!/usr/bin/env node
import { DEV_PREPARATION_TIMEOUT_MS, readEngineBinding, inspectEngineWorkspace, enginePackageRuntimeIdentity, DEV_EXECUTION_TIMEOUT_MS, PRODUCTION_EXECUTION_TIMEOUT_MS, environmentExecutionWorkers } from './chunk-UTXAIODQ.mjs';
import { environmentAnimationPlayback, animationPlayback } from './chunk-6AKTNSSW.mjs';
import { loadProjectCookers } from './chunk-ZDSMIZQ7.mjs';
import { executionWorkerEntries, pluginRootDescriptor, pluginRuntimeProjection, pluginProgramsBuild } from './chunk-WBZD4GEB.mjs';
import { projectToolProjection } from './chunk-A2W6KPHB.mjs';
import { assertPluginSourceInputs, isPluginAssetSourceIgnoredPath, discoverPluginAssets, publishedPluginInventory, pluginAssetClosure } from './chunk-5KRT3YGN.mjs';
import { writeDistManifest, verifyDist } from './chunk-SFUAONG6.mjs';
import { isFilesystemPathWithin, filesystemPathRelative } from './chunk-X5IGMUF7.mjs';
import { readProjectFacts, commandError, readProjectStartupTimeoutMs } from './chunk-VNP4GISC.mjs';
import { Console } from 'console';
import { createHash } from 'crypto';
import { once } from 'events';
import { constants, existsSync } from 'fs';
import { readFile, mkdtemp, mkdir, writeFile, copyFile, rm, realpath, readdir, rename, stat } from 'fs/promises';
import { createRequire } from 'module';
import { createServer } from 'net';
import { resolve, dirname, sep, relative, posix, isAbsolute, basename } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { audioImporter } from '@forgeax/engine-audio-webaudio/audio-importer';
import { fbxImporter } from '@forgeax/engine-fbx';
import { fontImporter } from '@forgeax/engine-font/font-importer';
import { gltfImporter } from '@forgeax/engine-gltf/node-importer';
import { createBackendHost } from '@forgeax/engine-host/backend';
import { HostAssemblyError, createHostAssembly, validateHostAssembly } from '@forgeax/engine-host/protocol';
import { createHostTransport, attachHostWebSocketServer } from '@forgeax/engine-host/transport';
import { imageImporter } from '@forgeax/engine-image/image-importer';
import { iesImporter, createStandardAssetOutputProducerRegistry, createScriptablePackProductCache } from '@forgeax/engine-import';
import { objImporter, stlImporter, svgImporter } from '@forgeax/engine-mesh-io';
import { encodeCatalogWire } from '@forgeax/engine-pack';
import { BUILTIN_MESH_ASSETS } from '@forgeax/engine-pack/builtin';
import { scanInventory, declaredSourceGuids, declaredPackAssets } from '@forgeax/engine-pack/scanner';
import { projectScriptablePackSceneComponents } from '@forgeax/engine-pack/source';
import { createScriptablePackSourceSnapshot, inventoryScriptablePackSource } from '@forgeax/engine-pack/source-node';
import { validateCanonicalKitReceipt } from '@forgeax/engine-preview';
import { createMaterialPackCooker, listMaterialSourcePaths } from '@forgeax/engine-shader-compiler';
import { createStandaloneRuntimeAssetBinding } from '@forgeax/engine-types';
import { createUiImporter } from '@forgeax/engine-ui/importer';
import { createParticleCodeNativeCookerFromRoots } from '@forgeax/engine-vfx-compiler';
import { pluginPack } from '@forgeax/engine-vite-plugin-pack';
import { vitePluginRhiDebug } from '@forgeax/engine-vite-plugin-rhi-debug';
import { forgeaxShader } from '@forgeax/engine-vite-plugin-shader';
import { build, createServer as createServer$1, preview, createLogger } from 'vite';
import { WebSocketServer } from 'ws';
import { promisify } from 'util';
import { brotliCompress, constants as constants$1 } from 'zlib';
import { tmpdir } from 'os';
import { compressZstd } from '@forgeax/engine-codec/encode';
import { encodeAssetBundle } from '@forgeax/engine-pack/bundle';
import { HttpArtifactCompression, varyEncoding, identityAllowed } from '@forgeax/engine-vite-plugin-pack/http-artifact';

// src/build/material-profile.ts
function materialBuildCapabilityGuard(profile) {
  if (profile === void 0) return "";
  if (profile !== "webgpu-storage") throw new Error("unsupported material build profile");
  return `const materialBuildCaps = workerExecution && typeof app.remoteEval === 'function'
      ? await app.remoteEval('const inspected = await execution.inspectRenderer(); if (!inspected.ok) throw inspected.error; return inspected.value.capabilities;')
      : app.renderer.inspect().capabilities;
    if (materialBuildCaps?.backendKind !== 'webgpu' || materialBuildCaps.compute !== true || materialBuildCaps.storageBuffer !== true)
      throw new Error('forgeax: webgpu-storage validation build requires actual WebGPU compute/storage; fallback is unsupported');`;
}

// src/build/runtime-packs-source.ts
var runtimePacksSource = `import type { RuntimePackOptions } from '@forgeax/engine/app';
import { createBrowserPackProgramHost, prepareBrowserPackProgramScope } from '@forgeax/engine/pack/runtime-browser';
import type { PackProgramHostFactory } from '@forgeax/engine/pack/runtime';
import imports, { loadImport } from 'virtual:forgeax/pack-program-imports';

type Delivery = { scope: string } | { error: string };
let preparing: Promise<Delivery> | undefined;
export function prepareRuntimePackDelivery(): Promise<Delivery> {
  if (preparing) return preparing;
  preparing = (async () => {
    try {
      if (typeof document === 'undefined' || !/^https?:$/.test(location.protocol))
        throw new Error('Native runtime modules require an HTTP application with ServiceWorker support');
      return { scope: await prepareBrowserPackProgramScope(new URL('forgeax-pack-program-worker.js', document.baseURI).href) };
    } catch (cause) {
      preparing = undefined;
      return { error: String(cause) };
    }
  })();
  return preparing;
}

/** This private channel leaves the game's borrowed MessagePort queue untouched. */
export function serveRuntimePackDelivery(name: string): () => void {
  let channel: BroadcastChannel;
  try { channel = new BroadcastChannel(name); }
  catch { return () => {}; }
  let active = true;
  const receive = (event: MessageEvent) => {
    if (event.data?.kind !== 'forgeax:prepare-pack-programs' || typeof event.data.id !== 'string') return;
    const id = event.data.id;
    void prepareRuntimePackDelivery().then(delivery => {
      if (active) channel.postMessage({ kind: 'forgeax:pack-program-delivery', id, delivery });
    });
  };
  channel.addEventListener('message', receive);
  return () => { active = false; channel.removeEventListener('message', receive); channel.close(); };
}

/** Each World owns its waiting request; late replies cannot reach its replacement. */
export function createRuntimePackDeliveryClient(name: string | undefined, signal: AbortSignal): () => Promise<Delivery> {
  let pending: Promise<Delivery> | undefined;
  return () => {
    if (signal.aborted) return Promise.resolve({ error: 'Runtime Pack delivery owner is disposed' });
    if (!name || typeof BroadcastChannel === 'undefined')
      return Promise.resolve({ error: 'Runtime Pack delivery requires its page channel' });
    return pending ??= new Promise<Delivery>(resolve => {
      let channel: BroadcastChannel;
      try { channel = new BroadcastChannel(name); }
      catch (cause) { resolve({ error: String(cause) }); return; }
      const id = crypto.randomUUID();
      let finished = false;
      const finish = (delivery: Delivery) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        channel.removeEventListener('message', receive);
        channel.close();
        signal.removeEventListener('abort', aborted);
        resolve(delivery);
      };
      const receive = (event: MessageEvent) => {
        if (event.data?.kind !== 'forgeax:pack-program-delivery' || event.data.id !== id) return;
        const delivery = event.data.delivery;
        if (typeof delivery?.scope === 'string') finish({ scope: delivery.scope });
        else if (typeof delivery?.error === 'string') finish({ error: delivery.error });
      };
      const aborted = () => finish({ error: 'Runtime Pack delivery owner is disposed' });
      const timer = setTimeout(() => finish({ error: 'Runtime Pack page delivery timed out' }), 15000);
      channel.addEventListener('message', receive);
      signal.addEventListener('abort', aborted, { once: true });
      try { channel.postMessage({ kind: 'forgeax:prepare-pack-programs', id }); }
      catch (cause) { finish({ error: String(cause) }); }
    }).then(delivery => {
      if ('error' in delivery) pending = undefined;
      return delivery;
    });
  };
}

export async function createRuntimePackOptions(scopeId: string, prepared?: Delivery | (() => Promise<Delivery>), nativeHost?: PackProgramHostFactory): Promise<RuntimePackOptions> {
  if (nativeHost) return { scopeId, imports, programHost: nativeHost(imports, loadImport) };
  const delivery = prepared;
  let host: ReturnType<typeof createBrowserPackProgramHost> | undefined;
  return {
    scopeId, imports,
    programHost: { async publish(program, bindings) {
      const ready = typeof delivery === 'function' ? await delivery() : delivery ?? await prepareRuntimePackDelivery();
      if ('error' in ready) throw new Error(ready.error);
      host ??= createBrowserPackProgramHost(ready.scope);
      return host.publish(program, bindings);
    } },
  };
}
`;
async function staticPackProgramsSource(facts, inventory) {
  const records = [
    ...pluginAssetClosure(inventory, facts.roots.engine),
    ...pluginAssetClosure(inventory, facts.roots.frontend)
  ];
  const programPaths = [
    ...new Set(
      (await Promise.all(
        records.filter((record) => inventory.sourceInputs.has(record.module)).map(
          async (record) => (await inventoryScriptablePackSource(record.module)).map((entry) => entry.path)
        )
      )).flat().filter((path) => path.endsWith(".program.mjs"))
    )
  ].sort();
  const programSources = await Promise.all(
    programPaths.map(async (path) => readFile(path, "utf8"))
  );
  return `import { createStaticPackProgramHost } from '@forgeax/engine/pack/runtime';
import imports from 'virtual:forgeax/pack-program-imports';
export { imports };
export const programHost = createStaticPackProgramHost([
${programPaths.map((path, index) => `{ modules: ${JSON.stringify({ [basename(path)]: programSources[index] })}, load: async entry => { if (entry !== ${JSON.stringify(basename(path))}) throw new Error('Unknown static program entry'); return import(${JSON.stringify(path)}); } }`).join(",\n")}
], imports);`;
}

// src/build/tauri-source.ts
var tauriBuildScript = `import { spawnSync } from 'node:child_process';
const run = args => {
  const result = spawnSync('pnpm', ['exec', 'tauri', ...args], { stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) throw new Error('Tauri command failed: ' + args.join(' '), { cause: result.error });
};
run(['icon', 'icon.svg']);
run(['build', '--bundles', process.platform === 'darwin' ? 'app' : process.platform === 'win32' ? 'nsis' : 'appimage']);
`;
var tauriSmokeScript = `import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { setTimeout } from 'node:timers/promises';
const root = resolve(import.meta.dirname, '..');
const config = JSON.parse(await readFile(resolve(root, 'src-tauri/tauri.conf.json'), 'utf8'));
const target = resolve(process.env.CARGO_TARGET_DIR ?? resolve(root, 'src-tauri/target'), 'release');
if (process.platform !== 'darwin' && !process.env.FORGEAX_TAURI_EXECUTABLE) throw new Error('Packaged smoke requires the actual installed executable via FORGEAX_TAURI_EXECUTABLE on this OS');
const executable = process.env.FORGEAX_TAURI_EXECUTABLE ?? (process.platform === 'darwin'
  ? resolve(target, 'bundle/macos', config.productName + '.app', 'Contents/MacOS/forgeax-game')
  : process.platform === 'win32' ? resolve(target, 'forgeax-game.exe') : resolve(target, 'forgeax-game'));
const reportDir = resolve(root, 'report');
await mkdir(reportDir, { recursive: true });
await rm(resolve(reportDir, 'report.json'), { force: true });
const child = spawn(executable, ['--smoke', '--report-dir', reportDir, ...process.argv.slice(2)], { stdio: 'inherit' });
let exited = false;
const exit = new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', (code, signal) => { exited = true; resolve({ code, signal }); }); });
const deadline = Date.now() + 120000;
let captured = false;
try {
while (!exited && Date.now() < deadline) {
  try {
    const report = JSON.parse(await readFile(resolve(reportDir, 'report.json'), 'utf8'));
    captured ||= report.snapshot === 'webview-ready.png';
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  await setTimeout(100);
}
if (!exited) throw new Error('Tauri smoke timed out');
const status = await exit;
const report = JSON.parse(await readFile(resolve(reportDir, 'report.json'), 'utf8'));
const digest = async path => createHash('sha256').update(await readFile(path)).digest('hex');
report.artifact = { executable, executableSha256: await digest(executable),
  distributionSha256: await digest(resolve(root, 'forgeax-dist.json')),
  cargoLockSha256: await digest(resolve(root, 'src-tauri/Cargo.lock')) };
await writeFile(resolve(reportDir, 'report.json'), JSON.stringify(report, null, 2) + '\\n');
if (status.code !== 0 || report.phase !== 'closed' || report.cleanup !== 'completed' || report.presented < 60 || report.errors.length || !report.permissionDenied || (process.platform === 'darwin' && !captured)) {
  throw new Error('Tauri smoke failed: ' + JSON.stringify({ status, report }));
}
console.log(JSON.stringify({ executable, reportDir, completed: report.completed, cleanup: report.cleanup, captured }));
} finally {
  if (!exited) { child.kill('SIGTERM'); await exit; }
}
`;
var tauriMainSource = String.raw`#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use std::path::PathBuf;
use std::sync::{atomic::{AtomicBool, Ordering}, Mutex};
use tauri::Manager;

struct HostState {
    report_dir: Option<PathBuf>,
    report: Mutex<serde_json::Value>,
    closing: AtomicBool,
}

fn save(state: &HostState) -> Result<(), String> {
    if let Some(directory) = &state.report_dir {
        std::fs::create_dir_all(directory).map_err(|error| error.to_string())?;
        let report = state.report.lock().map_err(|error| error.to_string())?;
        let bytes = serde_json::to_vec_pretty(&*report).map_err(|error| error.to_string())?;
        let pending = directory.join("report.pending.json");
        std::fs::write(&pending, bytes).map_err(|error| error.to_string())?;
        std::fs::rename(pending, directory.join("report.json")).map_err(|error| error.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn smoke_report(window: tauri::WebviewWindow, state: tauri::State<'_, HostState>, mut report: serde_json::Value) -> Result<(), String> {
    if state.report_dir.is_none() { return Err("smoke-not-enabled".into()); }
    #[cfg(target_os = "macos")]
    let phase = report["phase"].as_str().unwrap_or("").to_owned();
    #[cfg(target_os = "macos")]
    let viewport = report["viewport"]["innerWidth"].as_f64()
        .zip(report["viewport"]["innerHeight"].as_f64());
    report["native"] = serde_json::json!({ "tauri": tauri::VERSION, "os": std::env::consts::OS, "arch": std::env::consts::ARCH });
    *state.report.lock().map_err(|error| error.to_string())? = report;
    save(&state)?;
    #[cfg(target_os = "macos")]
    if matches!(phase.as_str(), "document-loaded" | "ready" | "failed") {
        capture_webview(&window, phase, viewport)?;
    }
    Ok(())
}

// WKWebView captures its own composited page without desktop recording access.
// This also preserves an actual failed-startup image from an SSH-launched app.
#[cfg(target_os = "macos")]
fn capture_webview(window: &tauri::WebviewWindow, phase: String, viewport: Option<(f64, f64)>) -> Result<(), String> {
    use objc2::{AnyThread, MainThreadOnly};
    use objc2_app_kit::{NSBitmapImageFileType, NSBitmapImageRep, NSImage};
    use objc2_foundation::{NSDictionary, NSError, NSRect, NSSize};
    use objc2_web_kit::{WKSnapshotConfiguration, WKWebView};
    let app = window.app_handle().clone();
    window.with_webview(move |webview| unsafe {
        let native = &*(webview.inner() as *const WKWebView);
        let bounds = native.bounds();
        let configuration = WKSnapshotConfiguration::new(native.mtm());
        // WKWebView bounds can include title-bar inset space outside the JS viewport.
        let rect = match viewport.filter(|(width, height)| *width > 0.0 && *height > 0.0) {
            Some((width, height)) => NSRect::new(bounds.origin, NSSize::new(width.min(bounds.size.width), height.min(bounds.size.height))),
            None => bounds,
        };
        configuration.setRect(rect);
        let callback = block2::RcBlock::new(move |image: *mut NSImage, error: *mut NSError| {
            let state = app.state::<HostState>();
            let result = (|| -> Result<String, String> {
                let image = image.as_ref().ok_or_else(|| format!("WebView snapshot failed: {:?}", error.as_ref()))?;
                let tiff = image.TIFFRepresentation().ok_or("WebView snapshot has no image bytes")?;
                let bitmap = NSBitmapImageRep::initWithData(NSBitmapImageRep::alloc(), &tiff)
                    .ok_or("WebView snapshot cannot be decoded")?;
                let png = bitmap.representationUsingType_properties(NSBitmapImageFileType::PNG, &NSDictionary::new())
                    .ok_or("WebView snapshot cannot be encoded")?;
                let name = format!("webview-{phase}.png");
                let path = state.report_dir.as_ref().ok_or("smoke-not-enabled")?.join(&name);
                std::fs::write(&path, png.as_bytes_unchecked()).map_err(|error| error.to_string())?;
                eprintln!("[forgeax.tauri.snapshot] {}", path.display());
                Ok(name)
            })();
            if let Ok(mut report) = state.report.lock() {
                report["snapshotBounds"] = serde_json::json!({ "x": bounds.origin.x, "y": bounds.origin.y, "width": bounds.size.width, "height": bounds.size.height });
                report["snapshotRect"] = serde_json::json!({ "x": rect.origin.x, "y": rect.origin.y, "width": rect.size.width, "height": rect.size.height });
                match result {
                    Ok(name) => report["snapshot"] = name.into(),
                    Err(error) => report["snapshotError"] = error.into(),
                }
            }
            let _ = save(&state);
        });
        native.takeSnapshotWithConfiguration_completionHandler(Some(&configuration), &callback);
    }).map_err(|error| error.to_string())
}

#[tauri::command]
fn finish_close(app: tauri::AppHandle, state: tauri::State<'_, HostState>, error: Option<String>) -> Result<(), String> {
    {
        let mut report = state.report.lock().map_err(|error| error.to_string())?;
        report["phase"] = "closed".into();
        report["cleanup"] = if error.is_none() { "completed" } else { "failed" }.into();
        if let Some(reason) = &error { report["closeError"] = reason.clone().into(); }
    }
    save(&state)?;
    app.exit(if error.is_none() { 0 } else { 1 });
    Ok(())
}

#[tauri::command]
fn request_close(window: tauri::WebviewWindow) -> Result<(), String> {
    window.close().map_err(|error| error.to_string())
}

const CLOSE: &str = r#"(async () => {
  let error = null;
  try { await globalThis.__forgeaxTauriDispose?.(); }
  catch (cause) { error = cause?.message ?? JSON.stringify(cause); }
  await window.__TAURI__.core.invoke('finish_close', { error });
})().catch(console.error);"#;

const SMOKE: &str = r#"(() => {
  const errors = [];
  let permissionDenied;
  let permissionProbe;
  addEventListener('error', event => errors.push(String(event.error?.stack ?? event.message ?? ('Resource failed: ' + event.target?.src))), true);
  addEventListener('securitypolicyviolation', event => errors.push('CSP ' + event.violatedDirective + ': ' + event.blockedURI));
  addEventListener('unhandledrejection', event => errors.push(String(event.reason?.stack ?? event.reason)));
  const started = performance.now();
  let enteredAt;
  const uiText = root => [...root.querySelectorAll('*')].flatMap(node => node.shadowRoot ? [node.shadowRoot.textContent, ...uiText(node.shadowRoot)] : []).join('\n');
  const timer = setInterval(async () => {
    if (!window.__TAURI__?.core) return;
    permissionProbe ??= window.__TAURI__.core.invoke('plugin:window|set_title', { label: 'main', title: 'Unauthorized title' })
      .then(() => errors.push('undeclared native window permission was admitted'), error => { permissionDenied = String(error); });
    const observation = globalThis.__forgeaxGameInspection?.renderer();
    const completed = observation?.execution?.frame?.completed ?? 0;
    if (document.querySelector('#forgeax-loading')?.style.display === 'none' && enteredAt === undefined) enteredAt = completed;
    const presented = enteredAt === undefined ? 0 : completed - enteredAt;
    const ready = observation?.state === 'alive' && presented >= 60;
    const fatal = document.querySelector('#forgeax-fatal-details')?.textContent;
    if (fatal && errors.length === 0) errors.push(fatal);
    if (!ready && errors.length === 0 && performance.now() - started < 90000) return;
    clearInterval(timer);
    await permissionProbe;
    let probe;
    if (ready && globalThis.__forgeaxTauriSmokeProbe) {
      try { probe = await globalThis.__forgeaxTauriSmokeProbe(); }
      catch (error) { errors.push(String(error?.stack ?? error)); }
    }
    const report = { mode: 'tauri-webview', phase: ready ? 'ready' : 'failed', completed, presented, probe,
      errors, observation, permissionDenied, userAgent: navigator.userAgent,
      url: location.href, secureContext: isSecureContext,
      viewport: { innerWidth, innerHeight, outerWidth, outerHeight, devicePixelRatio,
        document: document.documentElement.getBoundingClientRect().toJSON(), body: document.body.getBoundingClientRect().toJSON() },
      startup: { text: document.querySelector('#forgeax-loading')?.textContent, fatal: document.querySelector('#forgeax-fatal-details')?.textContent,
        scripts: [...document.scripts].map(script => ({ src: script.src, type: script.type })), inspection: typeof globalThis.__forgeaxGameInspection },
      canvas: [...document.querySelectorAll('canvas')].map(canvas => ({ width: canvas.width, height: canvas.height })),
      ui: { count: document.querySelectorAll('#game-ui > *').length, text: uiText(document.querySelector('#game-ui') ?? document) },
      resources: performance.getEntriesByType('resource').map(entry => ({ name: entry.name, duration: entry.duration })) };
    if (!ready && errors.length === 0) errors.push('60 completed frames were not observed before timeout');
    if (observation?.lastError) errors.push(JSON.stringify(observation.lastError));
    await window.__TAURI__.core.invoke('smoke_report', { report });
    setTimeout(() => window.__TAURI__.core.invoke('request_close'), 5000);
  }, 100);
})();"#;

fn main() {
    let args: Vec<_> = std::env::args().collect();
    let smoke = args.iter().any(|argument| argument == "--smoke");
    let report_dir = smoke.then(|| args.windows(2)
        .find(|pair| pair[0] == "--report-dir")
        .map(|pair| PathBuf::from(&pair[1])).unwrap_or_else(|| PathBuf::from("report")));
    let probe = if smoke { args.windows(2).find(|pair| pair[0] == "--smoke-probe")
        .map(|pair| std::fs::read_to_string(&pair[1]).expect("Smoke probe could not be read")) } else { None };
    tauri::Builder::default()
        .manage(HostState { report_dir, report: Mutex::new(serde_json::json!({ "phase": "launching" })), closing: AtomicBool::new(false) })
        .invoke_handler(tauri::generate_handler![smoke_report, finish_close, request_close])
        .on_page_load(move |window, payload| {
            if smoke {
                eprintln!("[forgeax.tauri.page] {:?} {}", payload.event(), payload.url());
                if matches!(payload.event(), tauri::webview::PageLoadEvent::Finished) {
                    let _ = window.eval(r#"globalThis.__TAURI_INTERNALS__?.invoke('smoke_report', { report: {
                        phase: 'document-loaded', url: location.href, visibility: document.visibilityState,
                        tauriGlobal: !!globalThis.__TAURI__, ready: document.readyState,
                        title: document.title, scripts: document.scripts.length,
                        viewport: { innerWidth, innerHeight, devicePixelRatio },
                        startupError: document.querySelector('#forgeax-fatal-details')?.textContent,
                    } });"#);
                }
            }
        })
        .setup(move |app| {
            save(&app.state::<HostState>())?;
            let title = app.config().product_name.clone().unwrap_or_else(|| "ForgeaX".into());
            let mut builder = tauri::WebviewWindowBuilder::new(app, "main", tauri::WebviewUrl::App("index.html".into()))
                .title(title).inner_size(1280.0, 800.0);
            if let Some(source) = &probe { builder = builder.initialization_script(source); }
            if smoke { builder = builder.initialization_script(SMOKE); }
            let window = builder.build()?;
            window.set_focus()?;
            let handle = app.handle().clone();
            window.on_window_event(move |event| {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let state = handle.state::<HostState>();
                    if !state.closing.swap(true, Ordering::SeqCst) {
                        if let Some(window) = handle.get_webview_window("main") {
                            if let Err(error) = window.eval(CLOSE) { eprintln!("ForgeaX Host close failed: {error}"); handle.exit(1); }
                        }
                    }
                }
            });
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("Tauri WebView Host failed")
        .run(|app, event| {
            if let tauri::RunEvent::ExitRequested { code: None, api, .. } = event {
                api.prevent_exit();
                if let Some(window) = app.get_webview_window("main") { let _ = window.close(); }
            }
        });
}
`;

// src/build/tauri.ts
async function writeTauriProject(facts, outDir) {
  const files = await readdir(outDir);
  await mkdir(resolve(outDir, "web"));
  for (const name of files) await rename(resolve(outDir, name), resolve(outDir, "web", name));
  const identifier = facts.id.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/^-+|-+$/g, "");
  const config = {
    $schema: "https://schema.tauri.app/config/2",
    productName: facts.name,
    version: "0.0.0",
    identifier: `com.forgeax.game.${identifier || "game"}`,
    build: { frontendDist: "../web" },
    app: {
      windows: [],
      withGlobalTauri: true,
      security: {
        // A static style nonce would override unsafe-inline and reject runtime UiAsset CSS.
        dangerousDisableAssetCspModification: ["style-src"],
        csp: "default-src 'self'; script-src 'self' blob: 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' data: ipc: http://ipc.localhost; worker-src 'self' blob:"
      }
    },
    bundle: {
      active: true,
      targets: "all",
      icon: ["icons/icon.icns", "icons/icon.ico", "icons/32x32.png", "icons/128x128.png"]
    }
  };
  const manifest = {
    name: `forgeax-tauri-${identifier || "game"}`,
    version: "0.0.0",
    private: true,
    type: "module",
    scripts: { build: "node scripts/build.mjs", smoke: "node scripts/smoke.mjs" },
    devDependencies: { "@tauri-apps/cli": "2.11.4" }
  };
  const sources = {
    "package.json": `${JSON.stringify(manifest, null, 2)}
`,
    "src-tauri/tauri.conf.json": `${JSON.stringify(config, null, 2)}
`,
    "src-tauri/Cargo.toml": `[package]
name = "forgeax-game"
version = "0.0.0"
edition = "2021"
rust-version = "1.87"
publish = false

[build-dependencies]
tauri-build = { version = "=2.6.3", features = [] }

[dependencies]
tauri = { version = "=2.11.5", features = [] }
# Keep the Tauri family coherent: newer semver-compatible runtime/macros changed internal APIs.
tauri-runtime = "=2.11.3"
tauri-runtime-wry = { version = "=2.11.4", default-features = false }
tauri-macros = "=2.6.3"
tauri-utils = "=2.9.3"
serde_json = "1"

[target.'cfg(target_os = "macos")'.dependencies]
objc2 = "=0.6.5"
objc2-app-kit = "=0.3.2"
objc2-foundation = "=0.3.2"
objc2-web-kit = "=0.3.2"
block2 = "=0.6.2"

[features]
custom-protocol = ["tauri/custom-protocol"]
`,
    "src-tauri/build.rs": `fn main() {
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(
        tauri_build::AppManifest::new().commands(&["smoke_report", "finish_close", "request_close"])
    )).expect("Tauri application permissions could not be built");
}
`,
    "src-tauri/capabilities/main.json": `${JSON.stringify(
      {
        identifier: "main-host",
        description: "Only the packaged main WebView may finish Host cleanup and publish opt-in smoke evidence.",
        windows: ["main"],
        permissions: ["allow-smoke-report", "allow-finish-close", "allow-request-close"]
      },
      null,
      2
    )}
`,
    "src-tauri/src/main.rs": tauriMainSource,
    "scripts/build.mjs": tauriBuildScript,
    "scripts/smoke.mjs": tauriSmokeScript,
    "icon.svg": '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" rx="96" fill="#10151d"/><path d="M108 360 256 88l148 272h-78l-70-132-70 132z" fill="#81d4fa"/></svg>\n',
    ".gitignore": "node_modules/\nsrc-tauri/target/\nsrc-tauri/icons/\nreport/\n",
    "README.md": `# ${facts.name}

This application embeds the ordinary ForgeaX browser distribution in a Tauri WebView.
Its renderer uses WebView WebGPU or the existing WebGL2 fallback. This is not the native Rust RHI route.

On the target desktop, install Rust and the platform Tauri prerequisites, then run:

\`\`\`sh
pnpm install
pnpm build
pnpm smoke
\`\`\`

The packaged application is under \`src-tauri/target/release/bundle/\`.
Smoke launches that packaged application, waits for 60 completed Engine frames, and awaits Host cleanup before exit.
On macOS WKWebView captures its actual page in \`report/webview-ready.png\`; inspect that image to verify visible composition. Startup and failure captures use the same native snapshot path.
The structured report is \`report/report.json\`. Generated build caches and installed tools are not distribution source.
`
  };
  for (const [path, source] of Object.entries(sources)) {
    await mkdir(resolve(outDir, path, ".."), { recursive: true });
    await writeFile(resolve(outDir, path), source);
  }
}

// src/host/game-projection-source.ts
var gameProjectionSource = `const gameProjectionDefinitions = new Map();
function registerGameProjection(kind, definition) {
  if (gameProjectionDefinitions.has(definition.id)) {
    throw new Error('forgeax: duplicate game projection id ' + definition.id);
  }
  const entry = { kind, definition };
  gameProjectionDefinitions.set(definition.id, entry);
  return () => {
    if (gameProjectionDefinitions.get(definition.id) === entry) {
      gameProjectionDefinitions.delete(definition.id);
    }
  };
}
const gameProjection = {
  registerAction: (definition) => registerGameProjection('action', definition),
  registerRead: (definition) => registerGameProjection('read', definition),
};
`;

// src/host/startup-source.ts
function escapeHtml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
function hostStartupDocument(title) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" href="data:," />
    <title>${escapeHtml(title)}</title>
    <style>
      html, body, #app-shell, #app { width: 100%; height: 100%; margin: 0; overflow: hidden; }
      body { background: transparent; }
      #app { display: block; }
      #app-shell { position: relative; isolation: isolate; }
      #game-ui { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
      #forgeax-fps { display: none; position: absolute; top: 12px; left: 50%; margin-left: -46px; width: 92px; box-sizing: border-box; padding: 5px 8px; z-index: 2147483645; border: 1px solid rgb(230 235 245 / 30%); border-radius: 6px; background: rgb(5 12 22 / 88%); color: #ffe17b; font: 600 13px/18px system-ui, sans-serif; text-align: center; pointer-events: none; }
      @media (max-width: 600px) { #forgeax-fps { top: auto; bottom: 12px; } }
      #forgeax-loading { position: absolute; inset: 0; z-index: 2147483646; display: grid; place-items: center; overflow: auto; padding: 24px; box-sizing: border-box; background: #05070b; color: #e6e6e6; font: 15px/1.6 system-ui, sans-serif; text-align: center; opacity: 1; transition: opacity 150ms ease; }
      #forgeax-loading[aria-hidden="true"] { opacity: 0; }
      #forgeax-loading[aria-hidden="true"]:not([data-fading="true"]) { pointer-events: none; }
      #forgeax-loading-content { display: grid; justify-items: center; gap: 12px; max-width: min(480px, 100%); }
      #forgeax-loading-title { margin: 0; color: #f5f7fa; font-size: clamp(20px, 4vw, 30px); font-weight: 500; letter-spacing: 0.02em; }
      #forgeax-loading-spinner { width: 22px; height: 22px; border: 2px solid rgb(230 235 245 / 20%); border-top-color: rgb(230 235 245 / 78%); border-radius: 50%; animation: forgeax-loading-spin 900ms linear infinite; }
      #forgeax-loading-status { margin: 0; color: rgb(230 235 245 / 72%); }
      #forgeax-loading-slow, #forgeax-loading-reload { display: none; }
      #forgeax-loading-reload, #forgeax-fatal-reload { border: 1px solid rgb(230 235 245 / 35%); border-radius: 5px; padding: 7px 14px; background: transparent; color: inherit; cursor: pointer; font: inherit; }
      #forgeax-fatal { position: absolute; inset: 0; z-index: 2147483647; display: none; place-items: center; overflow: auto; padding: 24px; box-sizing: border-box; background: #0b0d10; color: #e6e6e6; font: 15px/1.6 system-ui, sans-serif; text-align: center; }
      #forgeax-fatal-content { display: grid; gap: 12px; width: min(680px, 100%); text-align: left; }
      #forgeax-fatal-message { margin: 0; font-size: 18px; }
      #forgeax-fatal-details { max-height: 45vh; overflow: auto; white-space: pre-wrap; }
      @keyframes forgeax-loading-spin { to { transform: rotate(360deg); } }
      @media (prefers-reduced-motion: reduce) { #forgeax-loading { transition: none; } #forgeax-loading-spinner { animation: none; } }
    </style>
  </head>
  <body>
    <div id="app-shell"><canvas id="app"></canvas><div id="game-ui"></div>
    <div id="forgeax-fps" aria-label="Completed game frames per second">FPS --</div>
    <div id="forgeax-loading" role="status" aria-live="polite" aria-atomic="true">
      <div id="forgeax-loading-content">
        <h1 id="forgeax-loading-title">${escapeHtml(title)}</h1>
        <div id="forgeax-loading-spinner" aria-hidden="true"></div>
        <p id="forgeax-loading-status">Loading\u2026</p>
        <p id="forgeax-loading-slow">Still loading. You can keep waiting or reload.</p>
        <button id="forgeax-loading-reload" type="button">Reload</button>
      </div>
    </div>
    <div id="forgeax-fatal" role="alert">
      <div id="forgeax-fatal-content">
        <p id="forgeax-fatal-message">Unable to start the game.</p>
        <details><summary>Diagnostics</summary><pre id="forgeax-fatal-details"></pre></details>
        <button id="forgeax-fatal-reload" type="button">Reload</button>
      </div>
    </div>
    </div>
    <noscript>JavaScript is required to start this game. Please enable JavaScript and reload.</noscript>
  </body>
</html>
`;
}
function hostStartupScript(startupScreen = true, hostExpression = "undefined") {
  const startupEnabled = startupScreen ? "true" : "false";
  return `
      ((host) => {
        const document = host?.document ?? globalThis.document;
        const window = host?.events ?? globalThis.window;
        const currentCanvas = () => host?.surface?.() ?? document.querySelector('#app');
        const isElement = (node) => host === undefined ? node instanceof HTMLElement : node?.nodeType === 1;
        const isNode = (node) => host === undefined ? node instanceof Node : node !== null && typeof node === 'object';
        const startupEnabled = ${startupEnabled};
        const loading = document.querySelector('#forgeax-loading');
        const loadingStatus = document.querySelector('#forgeax-loading-status');
        const loadingSlow = document.querySelector('#forgeax-loading-slow');
        const loadingReload = document.querySelector('#forgeax-loading-reload');
        const fatal = document.querySelector('#forgeax-fatal');
        const fatalMessage = document.querySelector('#forgeax-fatal-message');
        const fatalDetails = document.querySelector('#forgeax-fatal-details');
        const fatalReload = document.querySelector('#forgeax-fatal-reload');
        const gameUi = document.querySelector('#game-ui');
        const QueryParams = typeof URLSearchParams === 'function'
          ? URLSearchParams
          : class {
              has() {
                return false;
              }
              get() {
                return null;
              }
            };
        const query = typeof location === 'object' && location !== null
          ? new QueryParams(location.search)
          : new QueryParams();
        const gamePage = startupEnabled && (!query.has('forgeaxWorkspace') || query.get('forgeaxWorkspace') === 'game') &&
          !query.has('forgeax-tool-recipe') && !query.has('forgeax-tool-replay');
        // Editor workspace/resource/tool pages omit the game loading overlay.
        // Editor Play uses it and waits for a completed game frame. Every page
        // retains the fatal diagnostic surface and Reload action.
        const fatalEnabled = true;
        let phase = gamePage ? 'loading' : 'disabled';
        let slowTimer;
        let fadeTimer;
        let slowRemainingMs = 15000;
        let slowVisibleSince;
        let latestSubmitted;
        // A completion may legally lag behind a later submission. Keep the
        // submitted frame identities for the active device generation so a
        // successful receipt remains tied to a real frame without requiring
        // the queue to drain to the newest submission.
        let submittedFrames = new Set();
        const submissionKey = (worldIdentity, deviceGeneration, frameId) =>
          JSON.stringify([worldIdentity, deviceGeneration, frameId]);
        let expectedSession;
        let inputBinding;
        let inputEnabled = false;
        let sessionGeneration = 0;
        const reducedMotion =
          host?.reducedMotion ?? (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
        const fadeDurationMs = reducedMotion ? 0 : 150;
        const setStartupTimeout = typeof setTimeout === 'function' ? setTimeout : () => undefined;
        const clearStartupTimeout = (timer) => {
          if (timer !== undefined && typeof clearTimeout === 'function') clearTimeout(timer);
        };
        const reload = () => {
          if (phase === 'destroyed') return;
          destroy();
          if (host !== undefined) host.reload();
          else if (typeof location?.reload === 'function') location.reload();
        };
        const setText = (node, text) => {
          if (node !== null && isElement(node)) node.textContent = text;
        };
        const setDisplay = (node, display) => {
          if (node !== null && isElement(node)) node.style.display = display;
        };
        const setAttribute = (node, name, value) => {
          if (node !== null && isElement(node) && typeof node.setAttribute === 'function') {
            node.setAttribute(name, value);
          }
        };
        const isStartupControlTarget = (target) => {
          if (!(isNode(target))) return false;
          const owns = (node) =>
            node !== null &&
            node !== undefined &&
            (node === target || (typeof node.contains === 'function' && node.contains(target)));
          return owns(loading) || owns(fatal);
        };
        const onStartupInputCapture = (event) => {
          if (inputEnabled || isStartupControlTarget(event?.target)) return;
          // Preserve native Tab navigation into startup controls. The game UI
          // is inert while this owner blocks gameplay, including during fade.
          if (event?.key !== 'Tab') event?.preventDefault?.();
          event?.stopImmediatePropagation?.();
          event?.stopPropagation?.();
        };
        const onStartupControlKey = (event) => {
          // Let the focused Reload button receive its default Enter/Space
          // activation, but stop the key event before it bubbles to the
          // gameplay producer while the startup surface owns the page.
          if (!inputEnabled) event?.stopPropagation?.();
        };
        const startupInputKinds = [
          'keydown',
          'keyup',
          'pointerdown',
          'pointerup',
          'pointermove',
          'pointercancel',
          'mousedown',
          'mouseup',
          'mousemove',
          'wheel',
          'click',
        ];
        const bindStartupInputCapture = () => {
          if (!gamePage || typeof window.addEventListener !== 'function') return;
          for (const kind of startupInputKinds) {
            window.addEventListener(kind, onStartupInputCapture, { capture: true });
          }
        };
        const removeStartupInputCapture = () => {
          if (typeof window.removeEventListener !== 'function') return;
          for (const kind of startupInputKinds) {
            window.removeEventListener(kind, onStartupInputCapture, { capture: true });
          }
        };
        const setInputEnabled = (enabled) => {
          inputEnabled = enabled;
          if (gamePage && isElement(gameUi)) gameUi.inert = !enabled;
          try {
            inputBinding?.(enabled);
          } catch {
            // Input is an observational startup bridge; it must not change the
            // fatal error path when an App-owned callback is already disposed.
          }
        };
        const bindInput = (callback) => {
          if (typeof callback !== 'function') return () => {};
          const previous = inputBinding;
          if (previous !== undefined) {
            try {
              previous(false);
            } catch {
              // Continue replacing an already-bound input bridge.
            }
          }
          inputBinding = callback;
          setInputEnabled(false);
          return () => {
            if (inputBinding !== callback) return;
            setInputEnabled(false);
            inputBinding = undefined;
          };
        };
        const clearStartupWork = () => {
          clearStartupTimeout(slowTimer);
          clearStartupTimeout(fadeTimer);
          slowTimer = undefined;
          fadeTimer = undefined;
          slowVisibleSince = undefined;
          submittedFrames = new Set();
        };
        const clockNow = () => {
          if (host !== undefined) return host.now();
          if (typeof performance === 'object' && performance !== null && typeof performance.now === 'function') {
            return performance.now();
          }
          return Date.now();
        };
        const isForeground = () => host?.visible?.() ?? (
          typeof document !== 'object' || document === null || document.visibilityState !== 'hidden');
        // Receipt observation outlives the loading overlay. It does not request
        // render frames or sample rAF; one timer updates text only when changed.
        const frameRate = (() => {
          const node = document.querySelector('#forgeax-fps');
          let closed = !gamePage || node?.id !== 'forgeax-fps';
          let session, surface, deviceGeneration = -1, lastFrame = -1;
          let since, count = 0, timer;
          const text = value => {
            if (node?.textContent !== value) setText(node, value);
          };
          const reset = () => {
            clearStartupTimeout(timer); timer = undefined;
            since = undefined; count = 0;
            text('FPS --'); setDisplay(node, 'none');
          };
          const tick = () => {
            if (closed || !isForeground()) { reset(); return; }
            const now = clockNow();
            const elapsed = now - since;
            if (Number.isFinite(elapsed) && elapsed > 0) {
              text('FPS ' + (count * 1000 / elapsed).toFixed(1));
              count = 0; since = now;
            }
            timer = setStartupTimeout(tick, 1000);
          };
          const completed = detail => {
            const canvas = currentCanvas();
            if (closed || (phase !== 'fading' && phase !== 'entered') || !isForeground() || session === undefined ||
                detail?.worldIdentity !== session || detail.presentation !== 'ready' ||
                !Number.isSafeInteger(detail.frameId) || detail.frameId < 0 ||
                !Number.isSafeInteger(detail.deviceGeneration) || detail.deviceGeneration < 0 ||
                (canvas === surface && detail.deviceGeneration < deviceGeneration)) return;
            if (canvas !== surface || detail.deviceGeneration !== deviceGeneration) {
              reset(); surface = canvas; deviceGeneration = detail.deviceGeneration; lastFrame = -1;
            }
            if (detail.frameId <= lastFrame) return;
            lastFrame = detail.frameId;
            if (since === undefined) {
              since = clockNow();
              setDisplay(node, 'block');
              timer = setStartupTimeout(tick, 1000);
            } else count += 1;
          };
          const onReceipt = event => { if (event.target === currentCanvas()) completed(event.detail); };
          const visibilityChanged = () => reset();
          const pageHidden = event => { if (event.persisted) reset(); else destroy(); };
          const destroy = () => {
            if (closed) return;
            closed = true; reset();
            if (host === undefined) {
              window.removeEventListener('forgeax:frame-completed', onReceipt, { capture: true });
              window.removeEventListener('visibilitychange', visibilityChanged);
              window.removeEventListener('pagehide', pageHidden);
            }
          };
          if (!closed && host === undefined) {
            window.addEventListener('forgeax:frame-completed', onReceipt, { capture: true });
            window.addEventListener('visibilitychange', visibilityChanged);
            window.addEventListener('pagehide', pageHidden);
          }
          return { completed, visibilityChanged, destroy, bindSession(value) {
            if (session === value || closed) return;
            reset(); session = value; surface = undefined; deviceGeneration = -1; lastFrame = -1;
          } };
        })();
        const accountForegroundTime = () => {
          if (slowVisibleSince === undefined) return;
          slowRemainingMs = Math.max(0, slowRemainingMs - Math.max(0, clockNow() - slowVisibleSince));
          slowVisibleSince = undefined;
        };
        const showSlow = () => {
          if (!gamePage || (phase !== 'loading' && phase !== 'preparing') || !isForeground()) return;
          accountForegroundTime();
          if (slowRemainingMs > 0) {
            slowVisibleSince = clockNow();
            slowTimer = setStartupTimeout(showSlow, slowRemainingMs);
            return;
          }
          slowTimer = undefined;
          slowVisibleSince = undefined;
          setDisplay(loadingSlow, 'block');
          setDisplay(loadingReload, 'inline-block');
        };
        const armSlowTimer = () => {
          if (!gamePage || (phase !== 'loading' && phase !== 'preparing') || !isForeground()) return;
          accountForegroundTime();
          clearStartupTimeout(slowTimer);
          if (slowRemainingMs <= 0) {
            showSlow();
            return;
          }
          slowVisibleSince = clockNow();
          slowTimer = setStartupTimeout(showSlow, slowRemainingMs);
        };
        const appendStructuredFailure = (value, prefix, seen, lines) => {
          const formatValue = (candidate) => {
            if (typeof candidate === 'string') return candidate;
            try {
              const encoded = JSON.stringify(candidate);
              if (encoded !== undefined) return encoded;
            } catch {
              // Fall through to String for unserializable diagnostics.
            }
            return String(candidate);
          };
          if (value === null || typeof value !== 'object') {
            if (prefix && value !== undefined) lines.push(prefix + ': ' + formatValue(value));
            return;
          }
          if (seen.size >= 64) {
            lines.push((prefix || 'cause') + ': [diagnostic node limit]');
            return;
          }
          if (seen.has(value)) {
            lines.push((prefix || 'cause') + ': [circular]');
            return;
          }
          seen.add(value);
          if (Array.isArray(value)) {
            value.forEach((nested, index) =>
              appendStructuredFailure(nested, (prefix || 'cause') + '[' + index + ']', seen, lines),
            );
            return;
          }
          const record = value;
          const name = typeof record.name === 'string' && record.name.length > 0
            ? record.name
            : undefined;
          const code = typeof record.code === 'string' && record.code.length > 0
            ? record.code
            : undefined;
          const message = typeof record.message === 'string' && record.message.length > 0
            ? record.message
            : undefined;
          if (name !== undefined || code !== undefined || message !== undefined) {
            const identity = [name || 'Error', code].filter(Boolean).join(' ');
            lines.push((prefix ? prefix + ': ' : '') + identity + (message ? ': ' + message : ''));
          }
          for (const key of ['expected', 'hint', 'reason']) {
            if (record[key] !== undefined && record[key] !== null) {
              lines.push((prefix ? prefix + '.' : '') + key + ': ' + formatValue(record[key]));
            }
          }
          for (const key of ['cause', 'detail', 'failure', 'webgpuError', 'wgpuError', 'error']) {
            const nested = record[key];
            const nestedPrefix = (prefix ? prefix + '.' : '') + key;
            if (nested !== undefined && nested !== null && typeof nested === 'object') {
              appendStructuredFailure(nested, nestedPrefix, seen, lines);
            } else if (nested !== undefined && nested !== null) {
              lines.push(nestedPrefix + ': ' + formatValue(nested));
            }
          }
          const knownKeys = new Set([
            'name',
            'code',
            'message',
            'expected',
            'hint',
            'reason',
            'cause',
            'detail',
            'failure',
            'webgpuError',
            'wgpuError',
            'error',
          ]);
          for (const key of Object.keys(record)) {
            if (knownKeys.has(key)) continue;
            const nested = record[key];
            const nestedPrefix = (prefix ? prefix + '.' : '') + key;
            if (nested !== null && typeof nested === 'object') {
              appendStructuredFailure(nested, nestedPrefix, seen, lines);
            } else if (nested !== undefined) {
              lines.push(nestedPrefix + ': ' + formatValue(nested));
            }
          }
        };
        const formatStartupFailure = (reason) => {
          if (reason !== null && typeof reason === 'object') {
            const lines = [];
            appendStructuredFailure(reason, '', new Set(), lines);
            if (lines.length > 0) return lines.join('\\n');
            try {
              return JSON.stringify(reason) || 'Unknown structured startup failure';
            } catch {
              return 'Unserializable structured startup failure';
            }
          }
          return String(reason ?? 'Unknown startup failure');
        };
        const show = (reason, execution) => {
          const runtimeFailure = execution?.fault !== undefined && execution.fault !== null;
          if (!fatalEnabled || phase === 'failed' || phase === 'destroyed' ||
              (phase === 'entered' && !runtimeFailure)) return;
          phase = 'failed';
          frameRate.destroy();
          setInputEnabled(false);
          clearStartupWork();
          // Retain the first cause through teardown and keep Reload alive.
          cleanupStartupListeners();
          bindStartupInputCapture();
          bindFatalReload();
          let details = formatStartupFailure(reason);
          const notice = fatal;
          if (!(isElement(notice))) return;
          const message = runtimeFailure ? 'The game stopped because execution failed.' : 'Unable to start the game.';
          if (/webgpu|adapter-unavailable|no usable (rendering )?backend/i.test(details)) {
            details += '\\n\\nRenderer diagnosis: ForgeaX supports browser WebGPU and a wgpu/WebGL2 fallback. This failure alone does not prove that WebGPU is unsupported; use the structured code, hint, and nested backend causes above.';
          }
          // Keep the existing plain-text diagnostic fallback for hosts that
          // provide only one synthetic HTMLElement in a test harness.
          if (fatalMessage === notice) {
            notice.textContent = (runtimeFailure ? 'ForgeaX game stopped.\\n' : 'ForgeaX game failed to start.\\n') + message + '\\n' + details;
          } else {
            setText(fatalMessage, message);
            setText(fatalDetails, details);
          }
          setDisplay(loading, 'none');
          setDisplay(notice, 'grid');
          setDisplay(fatalReload, 'inline-block');
          setAttribute(loading, 'aria-hidden', 'true');
          setAttribute(loading, 'data-fading', 'false');
          if (gamePage && fatalReload !== null && isElement(fatalReload)) fatalReload.focus?.();
        };
        const prepare = () => {
          if (!gamePage || (phase !== 'loading' && phase !== 'fading')) return;
          if (phase === 'fading') {
            clearStartupTimeout(fadeTimer);
            fadeTimer = undefined;
            setAttribute(loading, 'aria-hidden', 'false');
            setAttribute(loading, 'data-fading', 'false');
          }
          phase = 'preparing';
          latestSubmitted = undefined;
          submittedFrames = new Set();
          setText(loadingStatus, 'Preparing scene\u2026');
          armSlowTimer();
        };
        const enter = (event) => {
          if (host !== undefined) frameRate.completed(event);
          if (!gamePage || phase !== 'preparing') return;
          if (event === null || typeof event !== 'object') return;
          if (expectedSession === undefined || event.worldIdentity !== expectedSession) return;
          if (
            !Number.isSafeInteger(event.frameId) ||
            event.frameId < 0 ||
            !Number.isSafeInteger(event.deviceGeneration) ||
            event.deviceGeneration < 0
          ) return;
          if (
            latestSubmitted === undefined ||
            latestSubmitted.canvas !== currentCanvas() ||
            event.deviceGeneration !== latestSubmitted.deviceGeneration ||
            (latestSubmitted.worldIdentity !== undefined &&
              event.worldIdentity !== latestSubmitted.worldIdentity) ||
            !submittedFrames.has(
              submissionKey(event.worldIdentity, event.deviceGeneration, event.frameId),
            )
          ) return;
          submittedFrames.delete(
            submissionKey(event.worldIdentity, event.deviceGeneration, event.frameId),
          );
          // A pending completion is still a terminal receipt for this
          // submitted candidate. Retire it before checking presentation so a
          // later forged/replayed ready event cannot reuse the same frame.
          if (event.presentation !== 'ready') return;
          if (phase === 'fading') return;
          phase = 'fading';
          frameRate.completed(event);
          clearStartupWork();
          setInputEnabled(false);
          const fadeGeneration = sessionGeneration;
          const fadeCanvas = latestSubmitted.canvas;
          setAttribute(loading, 'data-fading', 'true');
          setAttribute(loading, 'aria-hidden', 'true');
          fadeTimer = setStartupTimeout(() => {
            if (phase !== 'fading' || fadeGeneration !== sessionGeneration) return;
            if (fadeCanvas !== currentCanvas()) {
              prepare();
              return;
            }
            phase = 'entered';
            setInputEnabled(true);
            setDisplay(loading, 'none');
            setAttribute(loading, 'data-fading', 'false');
            cleanupStartupListeners();
          }, fadeDurationMs);
        };
        const destroy = () => {
          if (phase === 'destroyed') return;
          sessionGeneration += 1;
          phase = 'destroyed';
          frameRate.destroy();
          setInputEnabled(false);
          clearStartupWork();
          cleanupStartupListeners();
        };
        const onSubmitted = (event) => {
          if (phase === 'entered' || phase === 'failed' || phase === 'destroyed') return;
          if (event?.target !== currentCanvas()) return;
          const detail = event?.detail;
          if (
            detail !== null &&
            typeof detail === 'object' &&
            Number.isSafeInteger(detail.frameId) &&
            detail.frameId >= 0 &&
            Number.isSafeInteger(detail.deviceGeneration) &&
            detail.deviceGeneration >= 0 &&
            expectedSession !== undefined &&
            detail.worldIdentity === expectedSession
          ) {
            if (
              latestSubmitted !== undefined &&
              (detail.deviceGeneration !== latestSubmitted.deviceGeneration ||
                event.target !== latestSubmitted.canvas)
            ) {
              if (phase === 'fading') prepare();
              else submittedFrames = new Set();
            }
            latestSubmitted = {
              canvas: event.target,
              frameId: detail.frameId,
              deviceGeneration: detail.deviceGeneration,
              worldIdentity: detail.worldIdentity,
            };
            submittedFrames.add(
              submissionKey(detail.worldIdentity, detail.deviceGeneration, detail.frameId),
            );
          }
        };
        const onCompleted = (event) => {
          if (event?.target === currentCanvas()) enter(event?.detail);
        };
        const onVisibilityChange = () => {
          frameRate.visibilityChanged();
          if (isForeground()) {
            armSlowTimer();
          } else {
            accountForegroundTime();
            clearStartupTimeout(slowTimer);
            slowTimer = undefined;
          }
        };
        const onPageHide = () => destroy();
        const onError = (event) => {
          if (event?.error !== undefined) {
            show(event.error);
            return;
          }
          const target = event?.target;
          const source =
            target !== null &&
            target !== undefined &&
            (typeof target.src === 'string' || typeof target.href === 'string')
              ? target.src ?? target.href
              : undefined;
          if (source !== undefined || event?.message !== undefined) {
            show({
              name: 'ScriptResourceError',
              message: event?.message ?? 'startup resource failed to load',
              ...(source === undefined ? {} : { detail: { source } }),
            });
            return;
          }
          show(event);
        };
        const onUnhandledRejection = (event) => show(event?.reason ?? event);
        const cleanupStartupListeners = () => {
          if (typeof window.removeEventListener === 'function') {
            window.removeEventListener('forgeax:frame-submitted', onSubmitted, { capture: true });
            window.removeEventListener('forgeax:frame-completed', onCompleted, { capture: true });
            window.removeEventListener('visibilitychange', onVisibilityChange);
            window.removeEventListener('pagehide', onPageHide);
            window.removeEventListener('error', onError, { capture: true });
            window.removeEventListener('unhandledrejection', onUnhandledRejection);
          }
          removeStartupInputCapture();
          if (loadingReload !== null && typeof loadingReload.removeEventListener === 'function') {
            loadingReload.removeEventListener('click', reload);
            loadingReload.removeEventListener('keydown', onStartupControlKey);
            loadingReload.removeEventListener('keyup', onStartupControlKey);
          }
          if (
            fatalReload !== null &&
            typeof fatalReload.removeEventListener === 'function'
          ) {
            fatalReload.removeEventListener('click', reload);
            fatalReload.removeEventListener('keydown', onStartupControlKey);
            fatalReload.removeEventListener('keyup', onStartupControlKey);
          }
        };
        if (
          loadingReload !== null &&
          isElement(loadingReload) &&
          typeof loadingReload.addEventListener === 'function'
        ) loadingReload.addEventListener('click', reload);
        if (
          loadingReload !== null &&
          isElement(loadingReload) &&
          typeof loadingReload.addEventListener === 'function'
        ) {
          loadingReload.addEventListener('keydown', onStartupControlKey);
          loadingReload.addEventListener('keyup', onStartupControlKey);
        }
        const bindFatalReload = () => {
          if (
            fatalReload === null ||
            !isElement(fatalReload) ||
            typeof fatalReload.addEventListener !== 'function'
          ) return;
          fatalReload.addEventListener('click', reload);
          fatalReload.addEventListener('keydown', onStartupControlKey);
          fatalReload.addEventListener('keyup', onStartupControlKey);
        };
        if (gamePage) {
          // Render Worker recovery replaces its transferred canvas. Capture
          // nonbubbling receipts on the stable page and admit only its current
          // canvas; retired or unrelated surfaces cannot enter this game.
          window.addEventListener('forgeax:frame-submitted', onSubmitted, { capture: true });
          window.addEventListener('forgeax:frame-completed', onCompleted, { capture: true });
          window.addEventListener('visibilitychange', onVisibilityChange);
          window.addEventListener('pagehide', onPageHide);
          bindStartupInputCapture();
        }
        if (fatalEnabled) {
          // Keep module/resource errors observable even when a workspace or
          // preview page intentionally starts with no loading overlay.
          window.addEventListener('error', onError, { capture: true });
          window.addEventListener('unhandledrejection', onUnhandledRejection);
        }
        if (gamePage) {
          setInputEnabled(false);
          armSlowTimer();
        } else {
          setDisplay(loading, 'none');
        }
        const bindSession = (session) => {
          if (typeof session !== 'string' || session.length === 0) return;
          frameRate.bindSession(session);
          if (phase === 'entered' || phase === 'failed' || phase === 'destroyed') return;
          if (expectedSession === session) return;
          expectedSession = session;
          sessionGeneration += 1;
          latestSubmitted = undefined;
          submittedFrames = new Set();
          if (phase === 'loading' || phase === 'preparing' || phase === 'fading') {
            accountForegroundTime();
            clearStartupWork();
            phase = 'loading';
            setInputEnabled(false);
            setDisplay(loading, 'grid');
            setDisplay(fatal, 'none');
            setAttribute(loading, 'aria-hidden', 'false');
            setAttribute(loading, 'data-fading', 'false');
            setText(loadingStatus, 'Loading\u2026');
            armSlowTimer();
          }
        };
        const startup = Object.freeze({
          prepare,
          enter,
          fail: show,
          destroy,
          bindInput,
          bindSession,
          submitted: (detail) => onSubmitted({ target: currentCanvas(), detail }),
          visibilityChanged: onVisibilityChange,
        });
        if (host === undefined) globalThis.__forgeaxStartup = startup;
        return startup;
      })(${hostExpression});
`;
}

// src/build/wechat.ts
async function prepareWechatBuild(facts, generated, inventory, appOptions = {}) {
  const fontRoot = dirname(
    createRequire(import.meta.url).resolve("@fontsource-variable/noto-sans-sc/package.json")
  );
  const physics = [
    ...new Set(
      pluginAssetClosure(inventory, facts.roots.engine).flatMap((record) => {
        const match = /(?:\/|-)rapier([23])d(?:\.[cm]?js)?$/.exec(record.module);
        return match ? [match[1]] : [];
      })
    )
  ];
  const staging = await realpath(await mkdtemp(resolve(generated, "wechat-")));
  const native = resolve(staging, "wgpu");
  await writeFile(
    resolve(generated, "wechat-main.ts"),
    wechatHostSource(facts, native, process.env.FORGEAX_ENGINE_RHI_DEBUG === "1", appOptions)
  );
  await writeFile(resolve(generated, "wechat-game.ts"), wechatGameSource(physics, facts));
  await writeFile(
    resolve(generated, "wechat-programs.ts"),
    await staticPackProgramsSource(facts, inventory)
  );
  await writeFile(
    resolve(generated, "wechat-entry.ts"),
    `function launch() {
const entryInspection = globalThis.__forgeaxGameInspection;
if (entryInspection) entryInspection.phase = 'standards-module';
console.info('[forgeax.wechat.startup]', 'standards-module');
import('@forgeax/engine/platform-wechat/standards').then(({ installWechatStandards }) => {
  if (entryInspection) entryInspection.phase = 'standards-installation';
  console.info('[forgeax.wechat.startup]', 'standards-installation');
  installWechatStandards().unwrap();
  if (entryInspection) entryInspection.phase = 'host-module';
  console.info('[forgeax.wechat.startup]', 'host-module');
  return import('./wechat-main.ts');
}).then(module => module.start(launch)).catch(error => {
  console.error('ForgeaX graphics host failed', error);
  const seen = new Set();
  const encoded = JSON.stringify(error, (key, value) => {
    if (value !== null && typeof value === 'object') {
      if (seen.has(value)) return '[circular]';
      seen.add(value);
      if (value instanceof Error) return { ...value, name: value.name, message: value.message, cause: value.cause, errors: value.errors };
    }
    return value;
  });
  const diagnostic = encoded === undefined ? String(error) : JSON.parse(encoded);
  const inspection = globalThis.__forgeaxGameInspection ?? entryInspection;
  if (inspection) { inspection.phase = 'failed'; inspection.error = diagnostic; }
  let reason = 'The game could not start.';
  for (let current = diagnostic, depth = 0; current != null && depth < 16; depth++) {
    if (typeof current === 'string') {
      if (current !== '[circular]' && current.trim()) reason = current;
      break;
    }
    if (typeof current !== 'object') break;
    const message = current.message ?? current.errMsg ?? current.reason ?? current.detail?.reason;
    if (typeof message === 'string' && message.trim()) reason = message;
    current = current.cause ?? current.detail?.cause ?? current.error ?? current.failure ?? current.errors?.[0];
  }
  reason = reason.replace(/\\s+/g, ' ').trim();
  if (reason.length > 160) reason = reason.slice(0, 157) + '...';
  wx.showModal?.({ title: 'Unable to start',
    content: reason + '\\n\\nTap Reload to try again. If it fails again, close and reopen the game.',
    confirmText: 'Reload', showCancel: false,
    success(result) { if (result.confirm) launch(); },
  });
});
}
launch();`
  );
  let wgpuRequire;
  const plugin = {
    name: "forgeax:wechat-package",
    enforce: "pre",
    resolveId(id, importer) {
      if (importer?.startsWith(native) && id.startsWith("@noble/hashes/"))
        return wgpuRequire?.resolve(id) ?? null;
      return null;
    },
    async buildStart() {
      const packageManifest = async (name, importer) => {
        const id = `${name}/package.json`;
        const selected = await this.resolve(id, importer);
        if (selected === null || selected.external)
          return this.error({
            code: "UNRESOLVED_IMPORT",
            id,
            message: `Cannot resolve the native WeChat package ${id} from ${importer}`
          });
        return selected.id;
      };
      const engineManifest = await packageManifest(
        "@forgeax/engine",
        resolve(facts.root, "package.json")
      );
      const wgpuRoot = dirname(await packageManifest("@forgeax/engine-wgpu-wasm", engineManifest));
      const uiRoot = dirname(await packageManifest("@forgeax/engine-ui-blitz", engineManifest));
      const codecRoot = dirname(await packageManifest("@forgeax/engine-codec", engineManifest));
      const physicsRoots = await Promise.all(
        physics.map(async (dimension) => ({
          dimension,
          root: dirname(
            await packageManifest(`@forgeax/engine-physics-rapier${dimension}d`, engineManifest)
          )
        }))
      );
      wgpuRequire = createRequire(resolve(wgpuRoot, "package.json"));
      const { buildNativeWgpu } = await import(pathToFileURL(resolve(wgpuRoot, "scripts/native-build.mjs")).href);
      await buildNativeWgpu({ out: native });
      for (const [fileName, sourcePath] of [
        ["wasm/wgpu.wasm", resolve(native, "wgpu.wasm")],
        ["wasm/wgpu.provenance.json", resolve(native, "provenance.json")],
        ["wasm/ui.wasm", resolve(uiRoot, "pkg/ui_blitz_bg.wasm")],
        ["wasm/ui.provenance.json", resolve(uiRoot, "pkg/provenance.json")],
        ["wasm/ui.LICENSE", resolve(uiRoot, "LICENSE")],
        ["wasm/basis_transcoder.wasm", resolve(codecRoot, "pkg/basis_transcoder.wasm")],
        [
          "wasm/basis.provenance.json",
          resolve(codecRoot, "dist/basis-native-factory.provenance.json")
        ]
      ]) {
        this.emitFile({ type: "asset", fileName, source: await readFile(sourcePath) });
      }
      for (const { dimension, root } of physicsRoots) {
        for (const [file, name] of [
          ["rapier.wasm", `rapier${dimension}d.wasm`],
          ["provenance.json", `rapier${dimension}d.provenance.json`],
          ["LICENSE", `rapier${dimension}d.LICENSE`]
        ])
          this.emitFile({
            type: "asset",
            fileName: `wasm/${name}`,
            source: await readFile(resolve(root, "pkg", file))
          });
      }
      for (const file of [
        "LICENSE",
        "index.css",
        ...(await readdir(resolve(fontRoot, "files"))).filter((file2) => file2.endsWith(".woff2")).map((file2) => `files/${file2}`)
      ])
        this.emitFile({
          type: "asset",
          fileName: `ui-fonts/${file}`,
          source: await readFile(resolve(fontRoot, file))
        });
    },
    async closeBundle() {
      await rm(staging, { recursive: true, force: true });
    }
  };
  return { plugin, entry: resolve(generated, "wechat-entry.ts") };
}
async function writeWechatProject(facts, options, outDir) {
  await mkdir(outDir, { recursive: true });
  const entries = await readdir(outDir);
  const payload = resolve(outDir, "payload");
  await mkdir(payload);
  for (const entry of entries) await rename(resolve(outDir, entry), resolve(payload, entry));
  const compress = promisify(brotliCompress);
  const resources = [];
  async function publish(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) await publish(path);
      else if (!entry.name.endsWith(".js")) resources.push(path);
    }
  }
  await publish(payload);
  for (let start = 0; start < resources.length; start += 4) {
    await Promise.all(
      resources.slice(start, start + 4).map(async (path) => {
        const source = await readFile(path);
        const compressed = await compress(source, {
          params: { [constants$1.BROTLI_PARAM_QUALITY]: 11 }
        });
        await writeFile(`${path}.br`, compressed);
        await rm(path);
      })
    );
  }
  await Promise.all([
    writeFile(
      resolve(outDir, "game.js"),
      `const inspection = { phase: 'subpackage-loading', error: undefined, renderer: () => ({ state: 'initializing', phase: inspection.phase, lastError: inspection.error }) };
globalThis.__forgeaxGameInspection = inspection;
console.info('[forgeax.wechat.startup]', 'subpackage-loading');
wx.loadSubpackage({ name: 'payload', success() { if (inspection.phase === 'subpackage-loading') inspection.phase = 'subpackage-loaded'; console.info('[forgeax.wechat.startup]', 'subpackage-loaded'); }, fail(error) { inspection.phase = 'failed'; inspection.error = error; console.error('ForgeaX package failed', error); wx.showModal({ title: 'Unable to load', content: error.errMsg || String(error), showCancel: false }); } });
`
    ),
    writeFile(
      resolve(outDir, "game.json"),
      JSON.stringify(
        {
          deviceOrientation: "landscape",
          showStatusBar: false,
          subpackages: [{ name: "payload", root: "payload/" }]
        },
        null,
        2
      )
    ),
    writeFile(
      resolve(outDir, "project.config.json"),
      JSON.stringify(
        {
          appid: options.appid ?? "touristappid",
          compileType: "game",
          projectname: facts.name,
          setting: { es6: false, enhance: false, minified: false },
          libVersion: "latest"
        },
        null,
        2
      )
    )
  ]);
}
async function verifyWechatPackageBudget(outDir) {
  let total = 0;
  let main = 0;
  async function count(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) await count(path);
      else {
        const bytes = (await stat(path)).size;
        total += bytes;
        if (relative(outDir, path).split(sep)[0] !== "payload") main += bytes;
      }
    }
  }
  await count(outDir);
  if (main > 4 * 1024 * 1024 || total > 20 * 1024 * 1024) {
    throw new Error(
      `WeChat package exceeds deployment limits: main ${main}/4194304 bytes, total ${total}/20971520 bytes`
    );
  }
}
function wechatHostSource(facts, native, rhiDebug = false, appOptions = {}) {
  return `import { createWechatPlatform, createWechatWasmHost, createWechatWgpuHost, createWechatInputBackend, createWechatAudioBackend, createWechatPackageFetcher } from '@forgeax/engine/platform-wechat';
import { createBlitzUi, gpuShaders } from '@forgeax/engine/ui-blitz';
import { inspectUi } from '@forgeax/engine/ui';
import { ensureReady, rhi } from '@forgeax/engine/rhi-wgpu';
import * as nativeWgpu from ${JSON.stringify(resolve(native, "wgpu-native.mjs"))};
import { constructRuntimeRendererHost } from '@forgeax/engine/runtime/internal/renderer-host';
import { createApp, inputPlugin, canvasAspectPlugin } from '@forgeax/engine/app';
${rhiDebug ? "import { attachRecorder } from '@forgeax/engine/rhi-debug';\nimport { createRhiCapture, createRhiInstrumentation } from '@forgeax/engine/app';\nimport { createShaderModule, createShaderModuleImmediate } from '@forgeax/engine/rhi-wgpu';" : ""}
import { World } from '@forgeax/engine/ecs';
import { inputBackendPlugin } from '@forgeax/engine/input';
import { audioBackendPlugin, audioPlugin } from '@forgeax/engine/audio';
import { createCatalogSource } from '@forgeax/engine/assets-runtime';
import { forgeaxBundlerAdapter } from 'virtual:forgeax/bundler';
import { createPrograms as enginePrograms } from 'virtual:forgeax/plugin-programs/engine';
import { runtimeBinding } from 'virtual:forgeax/pack-runtime';
import { imports, programHost } from './wechat-programs.ts';
import { createGameVfx } from './game-vfx';
const value = result => { if (!result.ok) throw result.error; return result.value; };
let generation = 0;
let displayCanvas;
let uiWasm;
let wgpuHost;
let dispose;
let replacing = Promise.resolve();
export function start(reload) {
  const identity = ++generation;
  replacing = replacing.catch(() => {}).then(async () => { await dispose?.(); await boot(identity, reload); });
  return replacing;
}
async function boot(identity, reload) {
  const releases = [];
  const lifetime = new AbortController();
  let startup;
  let app;
  let graphics;
  let ui;
  let startupError;
  const appStartupErrors = [];
  let completed = 0;
  let presented = 0;
  let lastCompletion;
  let phase;
  ${gameProjectionSource}
  const advance = next => {
    if (phase === next) return;
    phase = next;
    console.info('[forgeax.wechat.startup]', JSON.stringify({ generation: identity, phase }));
  };
  const fail = (error, execution = app?.execution.report()) => {
    if (closed || startupError !== undefined) return;
    const appErrors = appStartupErrors.filter(observed => observed !== error);
    startupError = appErrors.length === 0 ? error : Object.assign(
      new Error('WeChat Host startup failed', { cause: error }), { detail: { appErrors } });
    advance('failed'); startup?.fail(startupError, execution);
  };
  const inspection = { ${rhiDebug ? "get rhiCapture() { return app?.rhiCapture; }," : ""}
    ui: request => inspectUi(!closed && globalThis.__forgeaxGameInspection === inspection ? ui?.document.body : undefined, request, ui),
    list: () => ({ reads: Array.from(gameProjectionDefinitions.entries()).filter(([, entry]) => entry.kind === 'read').map(([id]) => id) }),
    read: async id => {
      const entry = gameProjectionDefinitions.get(id);
      if (entry?.kind !== 'read') throw new Error('forgeax: game read projection not found ' + id);
      return entry.definition.read();
    }, assets: () => graphics?.assets.inspect(), world: () => app?.world.inspect(),
    runtimePacks: () => app?.pluginContext.runtimePacks?.producer.inspect(), renderer: () => ({ ...(app?.renderer.inspect() ?? { state: 'initializing' }),
    generation: identity, phase, completed, presented,
    lastCompletion: lastCompletion === undefined ? undefined : { ...lastCompletion }, startupError, lastError: app?.lastError }) };
  globalThis.__forgeaxGameInspection = inspection;
  releases.push(() => { if (startupError === undefined && globalThis.__forgeaxGameInspection === inspection) delete globalThis.__forgeaxGameInspection; });
  releases.push(() => gameProjectionDefinitions.clear());
  let closed = false;
  const stop = async () => {
    if (closed) return;
    closed = true;
    if (startupError === undefined) advance('disposing');
    lifetime.abort();
    const failures = [];
    try { startup?.destroy(); } catch (error) { failures.push(error); }
    try { if (app?.execution.report().engine.health === 'running') app.pause().unwrap(); } catch (error) { failures.push(error); }
    for (const release of releases.reverse()) { try { await release(); } catch (error) { failures.push(error); } }
    if (failures.length) throw new AggregateError(failures, 'WeChat Host cleanup failed');
  };
  dispose = stop;
  try {
  advance('platform');
  // WeChat's first Canvas is the display surface, even if Platform admission fails.
  displayCanvas ??= wx.createCanvas();
  const platform = createWechatPlatform({ wx, requestAnimationFrame: callback => requestAnimationFrame(callback), cancelAnimationFrame: handle => cancelAnimationFrame(handle) }, displayCanvas).unwrap();
  releases.push(() => platform.dispose());
  const canvas = platform.canvas;
  const native = { wx, WXWebAssembly };
  const fetcher = createWechatPackageFetcher(wx, { root: 'payload', baseUrl: 'https://forgeax.package/', encoding: 'br' });
  const display = platform.display().unwrap();
  canvas.width = Math.max(1, Math.round(display.width * display.pixelRatio));
  canvas.height = Math.max(1, Math.round(display.height * display.pixelRatio));
  advance('ui-wasm-and-fonts');
  // Cancel pending UI initialization, but retire a live document after its consumers.
  const uiLifetime = new AbortController();
  releases.push(() => uiLifetime.abort());
  ui = await createBlitzUi({
    wasm: uiWasm ??= createWechatWasmHost(native, 'payload/wasm/ui.wasm.br').unwrap(),
    html: ${JSON.stringify(hostStartupDocument(facts.name).replace("</head>", '<link rel="stylesheet" href="ui-fonts/index.css"></head>'))},
    width: canvas.width, height: canvas.height, pixelRatio: display.pixelRatio,
    font: new Uint8Array(await (await fetcher('https://forgeax.package/ui-fonts/files/noto-sans-sc-latin-wght-normal.woff2')).arrayBuffer()),
    fontFamily: 'Noto Sans SC Variable',
    resources: { baseUrl: 'https://forgeax.package/', read: async (url, signal) => new Uint8Array(await (await fetcher(url, { signal })).arrayBuffer()) },
    signal: uiLifetime.signal,
    onError: fail,
  });
  if (closed) { ui.dispose(); return; }
  if (startupError !== undefined) throw startupError;
  const host = { document: ui.document, events: ui.document, surface: () => canvas,
    now: () => platform.now().unwrap(), visible: () => platform.visible(),
    reducedMotion: false, reload };
  startup = ${hostStartupScript(true, "host")};
  const input = createWechatInputBackend(wx, platform, { ui: ui.input, keyboard: wx,
    onError: error => console.warn('ForgeaX native input failed', error) }).unwrap();
  releases.push(() => input.detach());
  const audio = createWechatAudioBackend(wx, platform, { onError: fail });
  releases.push(() => audio.destroy());
  startup.bindInput(enabled => input.setInputAllowed?.(enabled));
  advance('wgpu');
  await ensureReady({ initFn: async () => { await nativeWgpu.initializeNativeWgpu(wgpuHost ??= createWechatWgpuHost(native, 'payload/wasm/wgpu.wasm.br', [canvas]).unwrap()); return nativeWgpu; } });
  ${rhiDebug ? `const recorder = value(attachRecorder({ rhi, createShaderModule, createShaderModuleImmediate }));
  releases.push(async () => value(await recorder.dispose()));
  const rhiCapture = createRhiCapture(recorder);` : ""}
  advance('graphics');
  const gameVfx = createGameVfx();
  graphics = value(await constructRuntimeRendererHost(canvas, {
    ${rhiDebug ? "rhi: recorder.backend.rhi, rhiInstrumentation: createRhiInstrumentation(recorder)," : "rhi,"}
    features: [gameVfx.feature],
    dynamicGeometryMeshBudgetBytes: ${JSON.stringify(appOptions.dynamicGeometryMeshBudgetBytes)},
    pipelineLibrary: ${JSON.stringify(appOptions.pipelineLibrary)},
    standardProfile: ${JSON.stringify(appOptions.standardProfile)},
    ui: { kind: 'sparse-strips', shaders: gpuShaders, paint: time => ui.paintGpu(time) },
  }, { ...forgeaxBundlerAdapter(), shaderManifestUrl: 'https://forgeax.package/shaders/manifest.json', readShaderManifest: async url => (await fetcher(url)).text() }));
  releases.push(() => graphics.renderer.dispose());
  const world = new World(${appOptions.time === void 0 ? "" : JSON.stringify({ time: appOptions.time })});
  let game;
  let gameLoading;
  const catalog = createCatalogSource({ url: 'https://forgeax.package/pack-index.json', fetch: fetcher });
  advance('app');
  app = (await createApp({ platform, renderer: graphics.renderer, world, assets: graphics.assets, assetCatalog: catalog,
    ${rhiDebug ? "rhiCapture," : ""}
    drawSource: () => game !== undefined && startupError === undefined ? undefined : null,
    pluginPrograms: enginePrograms('wechat-' + identity, 'engine', identity),
    runtimePacks: { scopeId: runtimeBinding.scopeId, imports, programHost },
    plugins: [inputBackendPlugin(input), inputPlugin(), audioBackendPlugin(audio), audioPlugin(), canvasAspectPlugin(() => canvas), gameVfx.plugin],
    onFrameSubmitted: detail => { if (!closed && generation === identity) startup.submitted(detail); },
    onFrameCompleted: detail => {
      if (closed || generation !== identity) return;
      completed += 1; lastCompletion = detail;
      if (game !== undefined && detail.presentation === 'ready') {
        presented += 1;
        if (presented === 60) console.info('[forgeax.wechat.completed]', JSON.stringify({ generation: identity, completed, presented, ...detail }));
      }
      startup.enter(detail);
    },
  })).unwrap();
  releases.push(async () => (await app.dispose()).unwrap());
  startup.bindSession(world.identity);
  releases.push(app.onError(error => {
    // Activation owns its result, including child retirement before rejection.
    // App errors during that transaction must not preempt the primary failure.
    if (game === undefined) appStartupErrors.push(error);
    else {
      const execution = app.execution.report();
      if (execution.fault !== undefined && execution.fault !== null) fail(error, execution);
    }
  }));
  releases.push(platform.subscribe(event => {
    if (event.kind === 'visibility') startup.visibilityChanged();
    if (event.kind === 'display') {
      const next = event.display;
      canvas.width = Math.max(1, Math.round(next.width * next.pixelRatio));
      canvas.height = Math.max(1, Math.round(next.height * next.pixelRatio));
      ui.resize(canvas.width, canvas.height, next.pixelRatio);
    }
  }).unwrap());
  releases.push(async () => { await gameLoading?.catch(() => {}); await game?.dispose(); });
  app.start().unwrap();
  advance('renderer-initialization');
  void (async () => { try {
    value(await graphics.initialization);
    if (closed || generation !== identity) return;
    advance('scene');
    const module = await import('./wechat-game.ts');
    if (closed || generation !== identity) return;
    gameLoading = module.activate({ app, graphics, ui, canvas, gameProjection,
      generation: identity, signal: lifetime.signal, active: () => !closed && generation === identity });
    game = await gameLoading;
    if (closed || generation !== identity) { await game.dispose(); return; }
    if (appStartupErrors.length > 0) throw appStartupErrors[0];
    startup.prepare();
    advance('ready');
  } catch (error) { if (!closed && generation === identity) { console.error('ForgeaX game activation failed', error); fail(error); } } })();
  } catch (error) {
    if (closed) return;
    fail(error);
    try { await stop(); } catch (cleanup) { throw new AggregateError([error, cleanup], 'WeChat Host startup failed', { cause: error }); }
    throw error;
  }
}
`;
}
function wechatGameSource(physics, facts) {
  return `import { activateExecutionRoot, gameHostPlugin } from '@forgeax/engine/app';
import { AssetRegistry } from '@forgeax/engine/assets-runtime';
import { scenePlugin } from '@forgeax/engine/scene';
import { skinningPlugin } from '@forgeax/engine/skinning';
import { renderComponentsPlugin } from '@forgeax/engine/render';
import { animationPlugin } from '@forgeax/engine/animation';
import { statePlugin } from '@forgeax/engine/state';
import { root as engineRoot } from 'virtual:forgeax/plugin-programs/engine';
import { createPrograms as frontendPrograms, root as frontendRoot } from 'virtual:forgeax/plugin-programs/frontend';
import { runtimeBinding } from 'virtual:forgeax/pack-runtime';
import { createWechatWasmHost } from '@forgeax/engine/platform-wechat';
import { initBasisTranscoder } from '@forgeax/engine/codec';
${physics.map((dimension) => `import { initializeNativeRapier${dimension}D } from '@forgeax/engine/physics-rapier${dimension}d/native';`).join("\n")}
export async function activate({ app, graphics, ui, canvas, gameProjection, generation, signal, active }) {
  await initBasisTranscoder(createWechatWasmHost({ wx, WXWebAssembly }, 'payload/wasm/basis_transcoder.wasm.br').unwrap());
  ${physics.map((dimension) => `const physics${dimension} = await initializeNativeRapier${dimension}D(createWechatWasmHost({ wx, WXWebAssembly }, 'payload/wasm/rapier${dimension}d.wasm.br').unwrap()); if (physics${dimension}.code) throw physics${dimension};`).join("\n")}
  const lifetime = new AbortController();
  const abort = () => lifetime.abort();
  signal.addEventListener('abort', abort, { once: true });
  if (signal.aborted) abort();
  const fibers = [];
  const channel = new MessageChannel();
  const assets = graphics.assets;
  let disposed = false;
  const cleanup = async () => {
    if (disposed) return;
    disposed = true; lifetime.abort(); signal.removeEventListener('abort', abort);
    const failures = [];
    for (const fiber of fibers.reverse()) { try { await fiber.dispose(); } catch (error) { failures.push(error); } }
    channel.port1.close(); channel.port2.close();
    if (failures.length) throw new AggregateError(failures, 'WeChat game cleanup failed');
  };
  try {
  for (const plugin of [renderComponentsPlugin(), scenePlugin(), skinningPlugin(), animationPlugin(), statePlugin(), gameHostPlugin({ app, assets, canvas,
    drawingBufferSize: () => ({ width: canvas.width, height: canvas.height }),
    renderer: app.renderer, port: channel.port1, uiRoot: ui.document.querySelector('#game-ui'), gameProjection,
    startupTimeoutMs: ${JSON.stringify(facts.startupTimeoutMs)},
    controlMode: { read: () => 'touch', subscribe: () => () => {} },
    setPointerLockAllowed: () => {},
  })]) { const fiber = app.pluginContext.plugin(plugin); fibers.push(fiber); await fiber.await(); }
  if (engineRoot !== null) {
    const mounted = await activateExecutionRoot(app.pluginContext, { guid: engineRoot }, { signal: lifetime.signal, timeoutMs: ${JSON.stringify(facts.startupTimeoutMs)} });
    fibers.push(mounted.fiber);
  }
  if (frontendRoot !== null && active()) {
    const frontend = app.pluginContext.isolate('assets').isolate('gameHost').isolate('pluginPrograms');
    const provider = frontend.plugin({ name: 'wechat-frontend', provide: ['assets', 'gameHost', 'pluginPrograms'], apply(ctx) {
      const runtime = app.pluginContext.runtimePacks;
      const reader = new AssetRegistry({ catalog: runtime.catalog, fetcher: runtime.fetcher, scopeId: runtimeBinding.scopeId });
      ctx.provide('assets', reader); ctx.effect(() => () => reader.dispose());
      ctx.provide('gameHost', { ...app.pluginContext.gameHost, port: channel.port2 });
      ctx.provide('pluginPrograms', frontendPrograms('wechat-' + generation, 'frontend', generation));
    } });
    fibers.push(provider); await provider.await();
    const mounted = await activateExecutionRoot(frontend, { guid: frontendRoot }, { signal: lifetime.signal, timeoutMs: ${JSON.stringify(facts.startupTimeoutMs)} });
    fibers.push(mounted.fiber);
  }
  return { dispose: cleanup };
  } catch (error) {
    try { await cleanup(); } catch (cleanupError) { throw new AggregateError([error, cleanupError], 'WeChat game activation failed', { cause: error }); }
    throw error;
  }
}
`;
}

// src/game-vfx-source.ts
var gameVfxSource = `import { createVfxRuntimeHost } from '@forgeax/engine/vfx-render';
export function createGameVfx({ isolateViewGraph = true, instanceArenas = true, nativePlanning = true, retainedResources = true } = {}) {
  const host = createVfxRuntimeHost({
    instanceArenas,
    nativePlanning,
    retainedResources,
    ...(isolateViewGraph ? { isolateViewGraph: true } : {}),
    camera: { read: (_world, views) => views[0]?.selectedView },
  });
  return {
    feature: host.feature,
    plugin: {
      name: 'forgeax:game-vfx',
      inject: ['world', 'assets'],
      async apply(ctx) {
        const attached = await host.attachWorld({ world: ctx.world, assets: ctx.assets });
        if (!attached.ok) throw attached.error;
        ctx.effect(() => async () => {
          const detached = await host.detachWorld({ world: ctx.world });
          if (!detached.ok) throw detached.error;
        }, 'devkit/game-vfx');
      },
    },
  };
}
`;

// src/host/resource-presentation-source.ts
var previewVfxBoundsSource = `function previewVfxBounds(payload) {
  if (payload?.kind !== 'particle-effect' || payload.program?.emitters?.length === 0) return undefined;
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  for (const emitter of payload.program.emitters) {
    const bounds = emitter.bounds;
    if (bounds?.kind === 'sphere' && Array.isArray(bounds.center) && typeof bounds.radius === 'number') {
      const [x, y, z] = bounds.center;
      if (![x, y, z, bounds.radius].every((value) => typeof value === 'number' && Number.isFinite(value)) || bounds.radius < 0) return undefined;
      minX = Math.min(minX, x - bounds.radius);
      minY = Math.min(minY, y - bounds.radius);
      minZ = Math.min(minZ, z - bounds.radius);
      maxX = Math.max(maxX, x + bounds.radius);
      maxY = Math.max(maxY, y + bounds.radius);
      maxZ = Math.max(maxZ, z + bounds.radius);
      continue;
    }
    if (bounds?.kind === 'aabb' && Array.isArray(bounds.min) && Array.isArray(bounds.max)) {
      const [loX, loY, loZ] = bounds.min;
      const [hiX, hiY, hiZ] = bounds.max;
      if (![loX, loY, loZ, hiX, hiY, hiZ].every((value) => typeof value === 'number' && Number.isFinite(value))) return undefined;
      minX = Math.min(minX, loX);
      minY = Math.min(minY, loY);
      minZ = Math.min(minZ, loZ);
      maxX = Math.max(maxX, hiX);
      maxY = Math.max(maxY, hiY);
      maxZ = Math.max(maxZ, hiZ);
      continue;
    }
    return undefined;
  }
  if (![minX, minY, minZ, maxX, maxY, maxZ].every(Number.isFinite)) return undefined;
  const center = [(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2];
  const radius = Math.max(1, Math.hypot(maxX - minX, maxY - minY, maxZ - minZ));
  return { aabb: [minX, minY, minZ, maxX, maxY, maxZ], center, radius };
}
`;
var resourcePresentationSource = `async function prepareResourcePreview(app, resource, previewCanvas = canvas, presentation = {}) {
const resourceVfx = previewVfxHosts.get(app) ?? (resource?.kind === 'vfx' ? ensureVfxRuntimeHost() : undefined);
let preparedResourceBinding;
await prepareAssetRegistry(app.assets);
const assets = app.assets;
const ownedEntities = [];
const ownedHandles = [];
const createOwned = (payload) => {
  const handle = assets.create(payload).unwrap();
  ownedHandles.push(handle);
  return handle;
};
const loadOwned = async (guid, kind) => {
  const handle = (await assets.load(guid, kind)).unwrap();
  ownedHandles.push(handle);
  return handle;
};
const spawnOwned = (...components) => {
  const spawned = app.world.spawn(...components);
  if (!spawned.ok) throw spawned.error;
  ownedEntities.push(spawned.value);
  return spawned.value;
};
let resourceVfxAttached = false;
let meshDisplay;
let canonicalEnvironment;
let closed = false;
let cleanupPromise;
const cleanup = async () => {
  if (cleanupPromise !== undefined) return cleanupPromise;
  closed = true;
  cleanupPromise = (async () => {
    let failure;
    try { await meshDisplay?.close(); meshDisplay = undefined; } catch (cause) { failure = cause; }
    previewCameraEntities.delete(app.world);
    previewCameraTargets.delete(app.world);
    for (let index = ownedEntities.length - 1; index >= 0; index -= 1) {
      const dropped = app.world.despawn(ownedEntities[index]);
      if (dropped.ok || dropped.error?.code === 'stale-entity') ownedEntities.splice(index, 1);
      else failure ??= dropped.error;
    }
    if (resourceVfxAttached) {
      const detached = await resourceVfx.detachWorld({ world: app.world });
      if (detached.ok) resourceVfxAttached = false;
      else failure ??= detached.error;
    }
    for (let index = ownedHandles.length - 1; index >= 0; index -= 1) {
      const released = assets.release(ownedHandles[index]);
      if (released.ok || released.error?.code === 'asset-owner-closed') ownedHandles.splice(index, 1);
      else failure ??= released.error;
    }
    preparedResourceBinding = undefined;
    if (failure !== undefined) throw failure;
  })().catch((cause) => { cleanupPromise = undefined; throw cause; });
  return cleanupPromise;
};
try {
if (resource !== undefined) {
  if (resource.kind === 'texture' || resource.kind === 'equirect') {
    const resourceHandle = await loadOwned(resource.guid, resource.kind);
    const payload = assets.read(resourceHandle).unwrap();
    if (payload.kind !== 'texture' && payload.kind !== 'equirect') throw new Error('Texture preview requires TextureAsset or EquirectAsset');
    const source = textureViewSource(payload);
    const ownerFacts = presentation.evidence === false ? undefined : await previewOwnerFacts(assets, { ...resource, kind: 'texture' }, source);
    const assetBinding = captureEngineWorkspaceAssetBinding(assets, resourceHandle);
    const owner = createTextureWorkspacePreview(app.world, assets, resourceHandle,
      presentation.background === 'transparent' ? { background: presentation.background, projection: 'flat' } : {});
    previewCameraEntities.set(app.world, owner.camera);
    previewCameraTargets.set(app.world, [0, 0, 0]);
    return {
      app, texture: owner.texture,
      get binding() { return owner.binding; },
      assetBinding,
      facts: { kind: resource.kind, guid: resource.guid, asset: payload, ...(ownerFacts === undefined ? {} : { ownerFacts }) },
      close: async () => { try { owner.close(); } finally { await cleanup(); } },
    };
  }
  if (presentation.lighting !== 'neutral') {
    if (canonicalEnvironmentGuid === null) throw new Error('canonical preview environment is unavailable');
    canonicalEnvironment = await loadOwned(canonicalEnvironmentGuid, 'equirect');
    const environment = assets.read(canonicalEnvironment).unwrap();
    if (environment.width <= 0 || environment.height <= 0 || environment.data.byteLength === 0) {
      throw new Error('canonical preview environment must provide decoded equirect pixels');
    }
  }
  if (resource.kind === 'vfx') {
    const runtime = resourceVfx;
    const attached = await runtime.attachWorld({ world: app.world, assets });
    if (!attached.ok) throw attached.error;
    resourceVfxAttached = attached.value.state === 'attached';
  }
  const resourceHandle = await loadOwned(resource.guid, resource.kind === 'vfx' ? 'particle-effect' : resource.kind);
  const payload = assets.read(resourceHandle).unwrap();
  const assetBinding = captureEngineWorkspaceAssetBinding(assets, resourceHandle);
  if (resource.kind === 'vfx' && payload.kind !== 'particle-effect') {
    throw new Error(\`VFX preview expected ParticleEffectAsset, received \${payload.kind}\`);
  }
  const vfxBounds = resource.kind === 'vfx' ? previewVfxBounds(payload) : undefined;
  if (resource.kind === 'vfx' && vfxBounds === undefined) {
    throw new Error('VFX preview owner did not publish finite emitter bounds');
  }
  const meshMaterialHandles = resource.kind === 'mesh' && payload.kind === 'mesh'
    ? await loadEngineWorkspaceMaterialSlots(assets, payload.materialSlots)
    : undefined;
  if (meshMaterialHandles) for (const handle of meshMaterialHandles) if (handle !== 0) ownedHandles.push(handle);
  const meshHandle = resource.kind === 'mesh' && payload.kind === 'mesh'
    ? resourceHandle
    : createOwned(createPrimitiveMesh('sphere').unwrap());
  const materialHandle = resource.kind === 'material' && payload.kind === 'material'
    ? resourceHandle
    : undefined;
  const materialBindings = resource.kind === 'mesh'
    ? meshMaterialHandles
    : materialHandle === undefined
      ? undefined
      : [materialHandle];
  const neutralMeshBackdrop = meshMaterialHandles !== undefined && meshMaterialHandles.every((handle) => handle === 0);
  const rawAabb = payload.kind === 'mesh' ? payload.aabb : undefined;
  const aabb = rawAabb !== undefined && (Array.isArray(rawAabb) || ArrayBuffer.isView(rawAabb)) && rawAabb.length === 6
    ? Array.from(rawAabb)
    : resource.kind === 'mesh' && payload.kind === 'mesh'
      ? (() => { throw new Error('mesh owner did not publish a finite AABB'); })()
      : [-1, -1, -1, 1, 1, 1];
  const meshFrame = resource.kind === 'mesh' || resource.kind === 'material'
    ? fitToolPreviewCameraToAabb(aabb, { aspect: 1, fov: Math.PI / 4 })
    : undefined;
  const center = meshFrame?.center ?? vfxBounds?.center ?? [(aabb[0] + aabb[3]) / 2, (aabb[1] + aabb[4]) / 2, (aabb[2] + aabb[5]) / 2];
  const radius = meshFrame?.radius ?? vfxBounds?.radius ?? Math.max(1, Math.hypot(aabb[3] - aabb[0], aabb[4] - aabb[1], aabb[5] - aabb[2]));
  if (resource.kind === 'vfx') {
    const effect = resourceHandle;
    spawnOwned(
      { component: Transform, data: { pos: center } },
      { component: ParticleEffectPlayer, data: { effect, playing: true, seed: 0, timeScale: 1 } },
    );
  } else {
    const previewMeshEntity = spawnOwned(
      { component: Transform, data: { pos: center } },
      { component: MeshFilter, data: { assetHandle: meshHandle } },
      { component: MeshRenderer, data: materialBindings === undefined ? {} : { materials: materialBindings } },
    );
    preparedResourceBinding = {
      entityKey: previewMeshEntity,
      worldIdentity: app.world.identity,
      materialHandle,
    };
    if (resource.kind === 'mesh' && payload.kind === 'mesh') meshDisplay = await createWorkspaceMeshDisplay(app, payload, previewMeshEntity);
  }
  const cameraData = {
        fov: Math.PI / 4,
        aspect: 1,
        near: meshFrame?.near ?? 0.01,
        far: meshFrame?.far ?? radius * 8,
        tonemap: TONEMAP_REINHARD_EXTENDED,
        ...(presentation.background === 'transparent'
          ? { clearColor: [0, 0, 0, 0] }
          : neutralMeshBackdrop ? { clearColor: [0.02, 0.02, 0.02, 1] } : {}),
        ...(presentation.antialias === undefined ? {} : { antialias: presentation.antialias }),
        ...(presentation.bloom === undefined ? {} : { bloom: presentation.bloom }),
      };
  const cameraPosition = [center[0], center[1], center[2] + (meshFrame?.distance ?? radius * 2.5)];
  const cameraEntity = spawnOwned({ component: Camera, data: cameraData }, { component: Transform, data: { pos: cameraPosition } });
  previewCameraEntities.set(app.world, cameraEntity);
  previewCameraTargets.set(app.world, center);
  {
    spawnOwned({ component: DirectionalLight, data: { direction: [-0.5, -1, -0.3], intensity: 2 } });
    if (presentation.lighting === 'neutral') {
      spawnOwned({ component: Skylight, data: { color: [1, 1, 1], intensity: 1 } });
    } else {
      if (canonicalEnvironment === undefined) throw new Error('canonical preview environment was not loaded');
      spawnOwned({ component: Skylight, data: { equirect: canonicalEnvironment } });
      if (presentation.background !== 'transparent' && !neutralMeshBackdrop)
        spawnOwned({ component: SkyboxBackground, data: { equirect: canonicalEnvironment } });
    }
  }
  const textureBudget = resource.kind === 'material' && materialHandle !== undefined
    ? materialSampledTextureBudget(app.world, assets, materialHandle)
    : undefined;
  const ownerFacts = presentation.evidence === false ? undefined : await previewOwnerFacts(assets, resource, payload, textureBudget);
  const publishedAsset = resource.kind === 'mesh' && payload.kind === 'mesh' && payload.aabb !== undefined
    ? { ...payload, aabb: Array.from(payload.aabb) }
    : payload;
  return {
    facts: {
      kind: resource.kind,
      guid: resource.guid,
      asset: publishedAsset,
      ...(ownerFacts === undefined ? {} : { ownerFacts }),
    },
    app,
    binding: preparedResourceBinding,
    assetBinding,
    display: meshDisplay?.display,
    close: cleanup,
  };
}
} catch (cause) {
  await cleanup();
  throw cause;
}
}
`;

// src/host/preview-batch-entry-source.ts
function previewBatchEntrySource() {
  return `import { forgeaxBundlerAdapter } from 'virtual:forgeax/bundler';
import { runtimeBinding, createRuntimeAssetImportTransport } from 'virtual:forgeax/pack-runtime';
import { createApp } from '@forgeax/engine/app/browser';
import { captureEngineWorkspaceAssetBinding, createEngineWorkspaceAppPreview, createTextureWorkspacePreview, createWorkspaceMeshDisplay, fitToolPreviewCameraToAabb, loadEngineWorkspaceMaterialSlots } from '@forgeax/engine/app';
import { createCatalogSource, createCatalogHotSubscription } from '@forgeax/engine/assets-runtime';
import { THUMBNAIL_PREVIEW, previewThumbnailInput, textureViewSource } from '@forgeax/engine/preview';
import { createPrimitiveMesh } from '@forgeax/engine/geometry';
import { mat4 } from '@forgeax/engine/math';
import { physicsComponentsPlugin } from '@forgeax/engine/physics';
import { Camera, DirectionalLight, MeshFilter, MeshRenderer, Skylight, SkyboxBackground, TONEMAP_REINHARD_EXTENDED, materialSampledTextureBudget } from '@forgeax/engine/render';
import { Transform } from '@forgeax/engine/scene';
import { skinningPlugin } from '@forgeax/engine/skinning';
import { ParticleEffectPlayer } from '@forgeax/engine/vfx';
import { createVfxRuntimeHost } from '@forgeax/engine/vfx-render';

const canvas = document.querySelector('canvas');
const size = THUMBNAIL_PREVIEW.size;
canvas.width = canvas.height = size;
const canonicalEnvironmentGuid = null;
const previewCameraEntities = new WeakMap();
const previewCameraTargets = new WeakMap();
const previewVfxHosts = new WeakMap();
const vfx = createVfxRuntimeHost({ camera: { read(world) {
  const entity = previewCameraEntities.get(world);
  if (entity === undefined) return undefined;
  const transform = world.get(entity, Transform).unwrap();
  const camera = world.get(entity, Camera).unwrap();
  const position = new Float32Array(transform.pos);
  const target = previewCameraTargets.get(world) ?? [0, 0, 0];
  return { position, right: new Float32Array([1,0,0]), up: new Float32Array([0,1,0]),
    viewProjection: mat4.multiply(mat4.create(), mat4.perspectiveReverseZ(mat4.create(), camera.fov, camera.aspect, camera.near, camera.far), mat4.lookAt(mat4.create(), position, target, [0,1,0])) };
} } });
function ensureVfxRuntimeHost() { return vfx; }
${previewVfxBoundsSource}
async function prepareAssetRegistry(assets) { (await assets.enumerateCatalog()).unwrap(); }
${resourcePresentationSource}

function value(result) { if (!result.ok) throw result.error; return result.value; }
function failure(cause) {
  return { code: cause?.code ?? 'preview-image-failed', expected: cause?.expected ?? 'A completed asset preview', hint: typeof cause?.hint === 'string' ? cause.hint : cause?.message ?? JSON.stringify(cause) };
}
const state = { ready: false };
globalThis.__forgeaxPreviewBatch = state;
try {
  if (!runtimeBinding) throw new Error('Preview Catalog binding unavailable');
  const adapter = forgeaxBundlerAdapter();
  const app = value(await createApp(canvas, {
    assetCatalog: createCatalogSource({ url: runtimeBinding.catalogUrl, expectedScope: runtimeBinding, subscribe: createCatalogHotSubscription(import.meta.hot) }),
    assetRuntimeBinding: runtimeBinding,
    plugins: [physicsComponentsPlugin(), skinningPlugin()],
    features: [vfx.feature],
    pointerLockAllowed: () => false,
  }, { ...adapter, shaderManifestUrl: new URL(adapter.shaderManifestUrl, location.href).href,
    importTransport: createRuntimeAssetImportTransport(runtimeBinding) }));
  value(app.start()); value(app.pause());
  let active = false;
  let receipt;
  let renderError;
  const remove = app.renderer.subscribe(event => { if (event.kind === 'frame-submitted') receipt = event.receipt; });
  const removeError = app.onError(error => { renderError = error; });
  state.capture = async ({ asset, input }) => {
    if (active) throw new Error('A preview lease is already active');
    active = true;
    const start = performance.now();
    let preview;
    try {
      const rows = value(await app.assets.enumerateCatalog());
      if (previewThumbnailInput(new Map(rows.map(row => [row.guid, row])), asset.guid) !== input) throw new Error('Preview input changed before binding');
      renderError = undefined;
      preview = await createEngineWorkspaceAppPreview({
        app, assets: app.assets, asset,
        target: { targetId: 'batch', sessionId: 'batch', worldId: app.world.identity, width: size, height: size, headed: false },
        applyInput: () => {},
        openResourcePreview: ({ asset }) => prepareResourcePreview(app, asset, canvas, { ...THUMBNAIL_PREVIEW, evidence: false }),
      });
      if (asset.kind === 'scene') {
        for (const { entity } of app.world.query({ with: [Camera] }).unwrap()) {
          app.world.set(entity, Camera, { clearColor: [0,0,0,0], antialias: 0, bloom: 0 }).unwrap();
        }
        for (const { entity } of app.world.query({ with: [SkyboxBackground] }).unwrap()) app.world.removeComponent(entity, SkyboxBackground).unwrap();
      }
      const preparedMs = performance.now() - start;
      let ready = 0;
      let submitted = 0;
      const frames = asset.kind === 'vfx' ? THUMBNAIL_PREVIEW.vfxFrames : 1;
      const deadline = performance.now() + 30_000;
      while (ready < frames) {
        if (performance.now() > deadline) throw new Error('Preview frame readiness deadline exceeded');
        receipt = undefined;
        if (ready === frames - 1) value(app.renderer.requestObservation(['final-display']));
        const stepped = app.stepFrame(ready > 0 && asset.kind === 'vfx' ? 1 / 60 : 0);
        if (!stepped.ok && stepped.error.code === 'app-frame-step-invalid' && stepped.error.detail?.reason === 'credit') {
          await new Promise(done => setTimeout(done, 0)); continue;
        }
        value(stepped);
        // App owns asynchronous frame dispatch; wait for that exact submission.
        while (!receipt && !renderError && performance.now() < deadline) await new Promise(done => setTimeout(done, 0));
        if (renderError) throw renderError;
        if (!receipt) throw new Error('Preview submitted no frame');
        submitted++;
        value(await receipt.completed);
        if (receipt.presentation === 'ready') ready++;
        else await new Promise(done => setTimeout(done, 0));
      }
      const observed = value(await app.renderer.observe(receipt, { include: ['final-display'] }));
      const image = observed.observations?.find(item => item.domain === 'final-display');
      if (!image || image.metadata.width !== size || image.metadata.height !== size) throw new Error('Preview readback extent mismatch');
      const rgba = new Uint8ClampedArray(size * size * 4);
      const bgra = image.metadata.format.startsWith('bgra');
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const src = y * image.metadata.bytesPerRow + x * 4;
        const dst = (y * size + x) * 4;
        rgba[dst] = image.bytes[src + (bgra ? 2 : 0)];
        rgba[dst + 1] = image.bytes[src + 1];
        rgba[dst + 2] = image.bytes[src + (bgra ? 0 : 2)];
        rgba[dst + 3] = image.bytes[src + 3];
      }
      const output = new OffscreenCanvas(size, size);
      output.getContext('2d').putImageData(new ImageData(rgba, size, size), 0, 0);
      const blob = await output.convertToBlob({ type: 'image/png' });
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let binary = ''; for (const byte of bytes) binary += String.fromCharCode(byte);
      const current = value(await app.assets.enumerateCatalog());
      if (previewThumbnailInput(new Map(current.map(row => [row.guid, row])), asset.guid) !== input) throw new Error('Preview input changed during capture');
      return { dataUrl: 'data:image/png;base64,' + btoa(binary), preparedMs, totalMs: performance.now() - start, submitted, ready };
    } catch (cause) {
      if (app.rhiCapture) {
        const captured = await app.rhiCapture.captureFrame({ seed: { maxResourceBytes: 1048576 } });
        console.error('Preview failure capture', captured.ok ? await app.rhiCapture.upload(captured.value) : captured.error);
      }
      throw cause;
    } finally {
      try { await preview?.close(); } finally { active = false; }
    }
  };
  state.dispose = async () => { remove(); removeError(); value(await app.dispose()); };
  state.ready = true;
} catch (cause) { state.error = failure(cause); state.ready = true; }
`;
}
function hostBindingError(reason) {
  throw new HostAssemblyError(
    "host-assembly-invalid",
    "one unambiguous project host binding",
    "bind one project session to the host",
    { reason }
  );
}
function validateHostBinding(binding) {
  if (binding.frontendAssembly) {
    const checked = validateHostAssembly(binding.frontendAssembly);
    if (!checked.ok) throw checked.error;
  }
  const externalRoot = (binding.frontendAssembly ?? binding.backend.assembly.current).root;
  if (binding.workspace?.execution !== "game" && externalRoot && !binding.frontendModule)
    hostBindingError("an external frontend root requires an explicit immutable frontendModule");
  if (binding.frontendModule && (!binding.frontendModule.specifier || binding.frontendModule.export === "" || binding.frontendModule.prepare === ""))
    hostBindingError("frontendModule requires nonempty specifier, export and prepare names");
  if (binding.workspace && Object.values(binding.workspace).some((value) => typeof value !== "string" || !value)) {
    hostBindingError("workspace identity and admission token must be nonempty");
  }
  if (binding.frontendAssembly === void 0 && binding.workspace?.execution !== "game" && binding.backend.context.get("devkitHostBinding") !== void 0)
    hostBindingError("backend already serves a project");
}
function composeBoundHostAssembly(binding, project) {
  const current = binding.frontendAssembly ?? binding.backend.assembly.current;
  if (project.root && current.root)
    hostBindingError("compose roots through a native root plugin before binding");
  const root = project.root ?? current.root;
  return createHostAssembly({
    sessionGeneration: current.sessionGeneration + 1,
    ...root ? { root } : {},
    ...current.config === void 0 ? {} : { config: current.config }
  });
}
var AUTO_BUNDLE_TARGET_BYTES = 8 * 1024 * 1024;
function packAssets(document) {
  const assets = Array.isArray(document.assets) ? document.assets : document.pack?.assets;
  return Array.isArray(assets) ? assets : [];
}
function bundleable(descriptor) {
  return descriptor.delivery === void 0 && descriptor.byteRange === void 0 && descriptor.integrity !== void 0;
}
function* descriptors(document) {
  for (const asset of packAssets(document)) {
    const artifacts = asset.artifacts;
    if (artifacts === null || typeof artifacts !== "object") continue;
    const table = artifacts;
    for (const [key, descriptor] of Object.entries(table)) yield [table, key, descriptor];
  }
}
function buckets(items, key, weight, target, prefix = "") {
  const total = items.reduce((sum, item) => sum + weight(item), 0);
  if (items.length <= 1 || total <= target || prefix.length >= 64) return [[prefix, [...items]]];
  const bit = (item) => {
    const hex = Number.parseInt(key(item)[prefix.length >> 2] ?? "0", 16);
    return hex >> 3 - (prefix.length & 3) & 1;
  };
  return [0, 1].flatMap(
    (value) => buckets(
      items.filter((item) => bit(item) === value),
      key,
      weight,
      target,
      `${prefix}${value}`
    ).filter(([, members]) => members.length > 0)
  );
}
function catalogRows(catalog) {
  let rows = catalog;
  for (let depth = 0; depth < 2 && !Array.isArray(rows); depth++)
    rows = rows !== null && typeof rows === "object" ? rows.entries : [];
  return Array.isArray(rows) ? rows.filter((row) => row !== null && typeof row === "object") : [];
}
var sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
async function planPlayerBundles(input) {
  const target = input.targetBytes ?? AUTO_BUNDLE_TARGET_BYTES;
  const sources = /* @__PURE__ */ new Map();
  for (const row of catalogRows(input.catalog)) {
    if (typeof row.packageUrl !== "string" || typeof row.sourcePath !== "string") continue;
    const pack = input.pathOf(row.packageUrl, input.packIndexPath);
    if (pack !== void 0) sources.set(pack, row.sourcePath.replaceAll("\\", "/"));
  }
  const packs = [...sources.keys()].filter((path) => input.artifacts.has(path)).sort();
  const entries = /* @__PURE__ */ new Map();
  const retained = /* @__PURE__ */ new Set();
  for (const pack of packs) {
    const document = JSON.parse(await readFile(resolve(input.sourceRoot, pack), "utf8"));
    for (const [, , descriptor] of descriptors(document)) {
      const path = input.pathOf(descriptor.path, pack);
      const artifact = path === void 0 ? void 0 : input.artifacts.get(path);
      if (path === void 0 || artifact === void 0) continue;
      if (!bundleable(descriptor)) {
        retained.add(path);
        continue;
      }
      const identity = `${artifact.sha256}:${descriptor.contentEncoding ?? "identity"}`;
      const entry = entries.get(identity) ?? {
        path,
        paths: /* @__PURE__ */ new Set(),
        identity,
        bytes: artifact.bytes,
        owners: /* @__PURE__ */ new Set()
      };
      entry.paths.add(path);
      entry.owners.add(pack);
      entries.set(identity, entry);
    }
  }
  const named = /* @__PURE__ */ new Map();
  for (const pack of packs) {
    const source = sources.get(pack) ?? "";
    const matches = Object.entries(input.delivery.bundles ?? {}).filter(
      ([, prefixes]) => prefixes.some((prefix) => source.startsWith(prefix))
    );
    if (matches.length > 1)
      throw new Error(
        `Pack ${source} matches Bundles ${matches.map(([name]) => name).join(", ")}; a Pack belongs to one Bundle`
      );
    if (matches[0] !== void 0) named.set(pack, `named-${matches[0][0]}`);
  }
  for (const [name, prefixes] of Object.entries(input.delivery.bundles ?? {}))
    for (const prefix of prefixes)
      if (![...sources.values()].some((source) => source.startsWith(prefix)))
        throw new Error(`Bundle ${name} prefix ${prefix} matches no published Pack`);
  const exclusive = /* @__PURE__ */ new Map();
  for (const entry of entries.values()) {
    const [owner] = entry.owners;
    if (entry.owners.size === 1 && owner !== void 0)
      exclusive.set(owner, (exclusive.get(owner) ?? 0) + entry.bytes);
  }
  const groupOf = new Map(named);
  for (const [prefix, members] of buckets(
    packs.filter((pack) => !named.has(pack) && (exclusive.get(pack) ?? 0) > 0),
    sha256,
    (pack) => exclusive.get(pack) ?? 0,
    target
  ))
    for (const pack of members) groupOf.set(pack, `auto-${prefix}`);
  const groups = /* @__PURE__ */ new Map();
  const shared = [];
  for (const entry of entries.values()) {
    const owners = new Set([...entry.owners].map((pack) => groupOf.get(pack)));
    const [group] = owners;
    if (owners.size === 1 && group !== void 0)
      groups.set(group, [...groups.get(group) ?? [], entry]);
    else shared.push(entry);
  }
  for (const [prefix, members] of buckets(
    shared,
    (entry) => entry.identity,
    (entry) => entry.bytes,
    target
  ))
    if (members.length > 0) groups.set(`shared-${prefix}`, members);
  const windows = /* @__PURE__ */ new Map();
  const written = [];
  let storedBytes = 0;
  let sourceBytes = 0;
  for (const group of [...groups.keys()].sort()) {
    const members = (groups.get(group) ?? []).sort((a, b) => a.identity.localeCompare(b.identity));
    const stored = [];
    const encodings = [];
    for (const entry of members) {
      const bytes = new Uint8Array(await readFile(resolve(input.sourceRoot, entry.path)));
      sourceBytes += bytes.byteLength;
      const identity = entry.identity.endsWith(":identity");
      const compressed = identity && bytes.byteLength >= 256 ? await compressZstd(bytes) : void 0;
      if (compressed?.ok === true && compressed.value.byteLength < bytes.byteLength * 0.9) {
        stored.push(compressed.value);
        encodings.push("zstd");
      } else {
        stored.push(bytes);
        encodings.push(identity ? "identity" : "zstd");
      }
    }
    const bundle = encodeAssetBundle(stored);
    const digest = sha256(bundle.bytes);
    const bundlePath = `assets/bundles/${digest}.bin`;
    await mkdir(dirname(resolve(input.outputRoot, bundlePath)), { recursive: true });
    await writeFile(resolve(input.outputRoot, bundlePath), bundle.bytes);
    storedBytes += bundle.bytes.byteLength;
    written.push({
      path: bundlePath,
      mediaType: "application/octet-stream",
      bytes: bundle.bytes.byteLength,
      sha256: digest
    });
    members.forEach((entry, index) => {
      const window = bundle.windows[index];
      const contentEncoding = encodings[index];
      if (window === void 0 || contentEncoding === void 0) return;
      windows.set(entry.identity, {
        bundlePath,
        ...window,
        bundleDigest: `sha256:${digest}`,
        contentEncoding
      });
    });
  }
  for (const pack of packs) {
    const document = JSON.parse(await readFile(resolve(input.sourceRoot, pack), "utf8"));
    let changed = false;
    for (const [table, key, descriptor] of descriptors(document)) {
      const path = input.pathOf(descriptor.path, pack);
      const artifact = path === void 0 ? void 0 : input.artifacts.get(path);
      if (artifact === void 0 || !bundleable(descriptor)) continue;
      const window = windows.get(`${artifact.sha256}:${descriptor.contentEncoding ?? "identity"}`);
      if (window === void 0) continue;
      changed = true;
      table[key] = {
        ...descriptor,
        path: posix.relative(posix.dirname(pack), window.bundlePath),
        contentEncoding: window.contentEncoding,
        byteRange: {
          offset: window.offset,
          length: window.length,
          bundleDigest: window.bundleDigest
        }
      };
    }
    if (!changed) continue;
    const bytes = Buffer.from(JSON.stringify(document));
    await mkdir(dirname(resolve(input.outputRoot, pack)), { recursive: true });
    await writeFile(resolve(input.outputRoot, pack), bytes);
    const original = input.artifacts.get(pack);
    if (original !== void 0)
      written.push({ ...original, bytes: bytes.byteLength, sha256: sha256(bytes) });
  }
  return {
    removed: new Set(
      [...entries.values()].flatMap((entry) => [...entry.paths]).filter((path) => !retained.has(path))
    ),
    written,
    report: { bundles: groups.size, entries: entries.size, storedBytes, sourceBytes }
  };
}

// src/player-dist.ts
var PLAYER_DELIVERY_FILE = "forgeax-delivery.json";
async function preparePlayerDist(sourceRoot, manifest) {
  const base = new URL(manifest.base, "https://forgeax.package/");
  const catalogUrl = new URL(manifest.runtime.packIndexUrl, base);
  const paths = new Map(
    manifest.artifacts.map((artifact) => [new URL(artifact.path, base).href, artifact.path])
  );
  const receipts = /* @__PURE__ */ new Set();
  let changed = false;
  const source = await readFile(resolve(sourceRoot, manifest.runtime.packIndexUrl), "utf8");
  const catalog = JSON.stringify(JSON.parse(source), (key, value) => {
    if ((key === "cookReceiptUrl" || key === "receiptUrl") && typeof value === "string") {
      const path = paths.get(new URL(value, catalogUrl).href);
      if (key === "cookReceiptUrl" || path?.endsWith(".receipt.json")) {
        if (path !== void 0) receipts.add(path);
        changed = true;
        return void 0;
      }
    }
    return value;
  });
  const catalogBytes = Buffer.from(changed ? catalog : source);
  const delivery = manifest.artifacts.some(
    (artifact) => artifact.path === PLAYER_DELIVERY_FILE
  ) ? JSON.parse(await readFile(resolve(sourceRoot, PLAYER_DELIVERY_FILE), "utf8")) : {};
  const candidates = new Map(
    manifest.artifacts.filter((artifact) => !receipts.has(artifact.path) && artifact.path !== PLAYER_DELIVERY_FILE).map((artifact) => [
      artifact.path,
      artifact.path === manifest.runtime.packIndexUrl ? {
        ...artifact,
        bytes: catalogBytes.byteLength,
        sha256: createHash("sha256").update(catalogBytes).digest("hex")
      } : artifact
    ])
  );
  const root = await mkdtemp(resolve(tmpdir(), "forgeax-player-dist-"));
  try {
    const bundled = await planPlayerBundles({
      sourceRoot,
      outputRoot: root,
      artifacts: candidates,
      catalog: JSON.parse(catalogBytes.toString("utf8")),
      pathOf: (url, from) => paths.get(new URL(url, new URL(from, base)).href),
      packIndexPath: manifest.runtime.packIndexUrl,
      delivery
    });
    const written = new Map(bundled.written.map((artifact) => [artifact.path, artifact]));
    const copied = [...candidates.values()].filter(
      (artifact) => !bundled.removed.has(artifact.path) && !written.has(artifact.path)
    );
    const directories = new Set(copied.map((artifact) => dirname(resolve(root, artifact.path))));
    await Promise.all([...directories].map((directory) => mkdir(directory, { recursive: true })));
    for (let offset = 0; offset < copied.length; offset += 32) {
      await Promise.all(
        copied.slice(offset, offset + 32).map(
          (artifact) => artifact.path === manifest.runtime.packIndexUrl ? writeFile(resolve(root, artifact.path), catalogBytes) : copyFile(
            resolve(sourceRoot, artifact.path),
            resolve(root, artifact.path),
            constants.COPYFILE_FICLONE
          )
        )
      );
    }
    const artifacts = [
      ...[...candidates.values()].filter((artifact) => !bundled.removed.has(artifact.path)).map((artifact) => written.get(artifact.path) ?? artifact),
      ...[...written.values()].filter((artifact) => !candidates.has(artifact.path))
    ];
    const playerManifest = { ...manifest, artifacts };
    await writeFile(
      resolve(root, "forgeax-dist.json"),
      `${JSON.stringify(playerManifest, null, 2)}
`
    );
    return { root, manifest: playerManifest, bundles: bundled.report };
  } catch (cause) {
    await rm(root, { recursive: true, force: true });
    throw cause;
  }
}
async function preparePreviewHttpArtifacts(root, manifest) {
  const compression = new HttpArtifactCompression();
  const bodies = /* @__PURE__ */ new Map();
  const base = new URL(manifest.base, "http://localhost/");
  for (const artifact of manifest.artifacts) {
    if (!artifact.path.endsWith(".bin")) continue;
    const path = resolve(root, artifact.path);
    const bytes = await readFile(path);
    if (bytes.byteLength !== artifact.bytes || createHash("sha256").update(bytes).digest("hex") !== artifact.sha256) {
      throw new Error(`preview artifact changed after dist verification: ${artifact.path}`);
    }
    const body = { bytes, mimeType: artifact.mediaType };
    await compression.prepare([body]);
    bodies.set(new URL(artifact.path, base).pathname, body);
  }
  return {
    name: "forgeax:preview-http-artifacts",
    configurePreviewServer(server) {
      server.httpServer.once("close", () => bodies.clear());
      server.middlewares.use((request, response, next) => {
        const body = bodies.get(new URL(request.url ?? "/", "http://localhost/").pathname);
        if (body === void 0) return next();
        for (const [name, value] of Object.entries(server.config.preview.headers ?? {})) {
          if (value !== void 0) response.setHeader(name, value);
        }
        varyEncoding(response);
        if (request.method !== "GET" || request.headers.range !== void 0 || request.headers["if-none-match"] !== void 0 || request.headers["if-modified-since"] !== void 0) {
          if (!identityAllowed(request.headers["accept-encoding"])) {
            response.statusCode = 406;
            response.removeHeader("Content-Encoding");
            response.setHeader("Content-Length", "0");
            response.end();
            return;
          }
          return next();
        }
        compression.send(request, response, body);
      });
    }
  };
}

// src/types.ts
function resolveProjectPort(port) {
  return { port: port ?? 5173, strictPort: port !== 0 };
}

// src/host.ts
var activeDevKitHosts = /* @__PURE__ */ new Set();
async function disposeDevKitHosts() {
  const hosts = [...activeDevKitHosts];
  activeDevKitHosts.clear();
  for (const host of hosts) await host.dispose();
}
var DEFAULT_IMPORTERS = [
  audioImporter,
  imageImporter,
  fbxImporter,
  gltfImporter,
  objImporter,
  stlImporter,
  svgImporter,
  fontImporter,
  iesImporter,
  createUiImporter()
];
function ignoreDevKitCatalogPath(path) {
  const normalized = path.replace(/\\/g, "/");
  return normalized.split("/").includes("shaders");
}
function devKitDdcRoots(projectRoot) {
  return {
    buildCacheRoot: resolve(projectRoot, ".forgeax", "ddc", "build-cache"),
    projectDdcRoot: resolve(projectRoot, ".forgeax", "ddc", "v2")
  };
}
async function previewProducerIdentity() {
  const visited = /* @__PURE__ */ new Set();
  const identities = [];
  const visit = async (manifestPath) => {
    const path = await realpath(manifestPath);
    if (visited.has(path)) return;
    visited.add(path);
    const manifest = JSON.parse(await readFile(path, "utf8"));
    const resolver = createRequire(path);
    identities.push([manifest.name, await enginePackageRuntimeIdentity(dirname(path))]);
    await Promise.all(
      Object.keys(manifest.dependencies ?? {}).filter((name) => name.startsWith("@forgeax/engine-")).map((name) => visit(resolver.resolve(`${name}/package.json`)))
    );
  };
  await Promise.all(
    ["app", "preview"].map(
      (name) => visit(hostRequire.resolve(`@forgeax/engine-${name}/package.json`))
    )
  );
  return createHash("sha256").update(JSON.stringify(identities.sort(([a], [b]) => a.localeCompare(b)))).update(previewBatchEntrySource()).digest("hex");
}
function isResourcePreviewIgnoredPath(path) {
  return ignoreDevKitCatalogPath(path) || path.endsWith(".wgsl.meta.json") || path.endsWith("target-profile.json.meta.json");
}
function isProjectSourceIgnoredPath(path) {
  return ignoreDevKitCatalogPath(path) || path.endsWith(".wgsl.meta.json") || path.endsWith("target-profile.json.meta.json");
}
async function prepareBuiltinPack(inventory, generated) {
  if (inventory === void 0) return void 0;
  const declared = /* @__PURE__ */ new Set();
  for (const declaration of inventory.declarations.values())
    for (const guid of declaredSourceGuids(declaration)) declared.add(guid.toLowerCase());
  const missing = BUILTIN_MESH_ASSETS.filter((asset) => !declared.has(asset.guid.toLowerCase()));
  if (missing.length === 0) return void 0;
  const packPath = resolve(generated, "engine-builtins.pack.json");
  await writeFile(
    packPath,
    `${JSON.stringify(
      {
        schemaVersion: "2.0.0",
        kind: "internal-text-package",
        assets: missing.map((asset) => ({
          guid: asset.guid,
          kind: "mesh",
          payload: { geometry: asset.geometry },
          refs: [],
          artifacts: {}
        }))
      },
      null,
      2
    )}
`,
    "utf8"
  );
  return packPath;
}
async function discoverMaterialPackages(inventory) {
  if (inventory === void 0) return [];
  const paths = [];
  for (const declaration of inventory.declarations.values()) {
    if (declaration.format !== "pack.json") continue;
    const assets = declaredPackAssets(declaration.value);
    if (assets.length === 1 && assets[0]?.kind === "material" && assets[0].payload?.kind === "material")
      paths.push(declaration.sourcePath);
  }
  return paths.sort();
}
var hostRequire = createRequire(import.meta.url);
function findEngineWorkspaceRoot() {
  let cursor = dirname(fileURLToPath(import.meta.url));
  for (; ; ) {
    if (existsSync(resolve(cursor, "pnpm-workspace.yaml"))) return cursor;
    const parent = dirname(cursor);
    if (parent === cursor) return void 0;
    cursor = parent;
  }
}
function findInstalledEnginePackageRoot(start) {
  let cursor = resolve(start);
  for (; ; ) {
    if (dirname(cursor) !== cursor && cursor.endsWith(`${sep}node_modules${sep}@forgeax`)) {
      return cursor;
    }
    const parent = dirname(cursor);
    if (parent === cursor) return void 0;
    cursor = parent;
  }
}
async function engineWorkspacePackages(workspaceRoot) {
  const sourceWorkspaceRoot = workspaceRoot ?? findEngineWorkspaceRoot();
  const packageRoot = sourceWorkspaceRoot !== void 0 ? resolve(sourceWorkspaceRoot, "packages") : findInstalledEnginePackageRoot(dirname(fileURLToPath(import.meta.url)));
  if (packageRoot === void 0) return /* @__PURE__ */ new Map();
  if (!existsSync(packageRoot)) return /* @__PURE__ */ new Map();
  const packages = /* @__PURE__ */ new Map();
  for (const entry of await readdir(packageRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const root = resolve(packageRoot, entry.name);
    try {
      const manifest = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
      if (manifest === null || typeof manifest !== "object") continue;
      const name = manifest.name;
      if (typeof name === "string" && name.startsWith("@forgeax/engine")) {
        packages.set(name, { root, manifest });
      }
    } catch {
    }
  }
  return packages;
}
function conditionalExport(value, conditions = ["browser", "import", "node", "default"]) {
  if (typeof value === "string") return value;
  if (value === null || Array.isArray(value)) return void 0;
  for (const condition of conditions) {
    const candidate = value[condition];
    if (candidate === void 0) continue;
    const selected = conditionalExport(candidate, conditions);
    if (selected !== void 0) return selected;
  }
  return void 0;
}
function packageExportTarget(manifest, subpath, conditions) {
  const exportsValue = manifest.exports;
  if (exportsValue === void 0) {
    if (subpath.length > 0) return void 0;
    const main = manifest.module ?? manifest.main;
    return typeof main === "string" ? main : void 0;
  }
  if (typeof exportsValue === "string" || exportsValue === null) {
    return subpath.length === 0 ? conditionalExport(exportsValue, conditions) : void 0;
  }
  const keys = Object.keys(exportsValue);
  const subpathMap = keys.some((key) => key === "." || key.startsWith("./"));
  if (!subpathMap)
    return subpath.length === 0 ? conditionalExport(exportsValue, conditions) : void 0;
  const requested = subpath.length === 0 ? "." : `./${subpath}`;
  const exact = exportsValue[requested];
  if (exact !== void 0) return conditionalExport(exact, conditions);
  for (const key of keys) {
    const marker = key.indexOf("*");
    if (marker < 0) continue;
    const prefix = key.slice(0, marker);
    const suffix = key.slice(marker + 1);
    if (!requested.startsWith(prefix) || !requested.endsWith(suffix)) continue;
    const replacement = requested.slice(prefix.length, requested.length - suffix.length);
    const exportTarget = exportsValue[key];
    if (exportTarget === void 0) continue;
    const selected = conditionalExport(exportTarget, conditions);
    return selected?.replaceAll("*", replacement);
  }
  return void 0;
}
function engineWorkspaceImport(source, packages, conditions) {
  if (!source.startsWith("@forgeax/engine")) return void 0;
  const separator = source.indexOf("/", "@forgeax/engine".length);
  const packageName = separator < 0 ? source : source.slice(0, separator);
  const subpath = separator < 0 ? "" : source.slice(separator + 1);
  const packageInfo = packages.get(packageName);
  if (packageInfo === void 0) return void 0;
  const target = packageExportTarget(packageInfo.manifest, subpath, conditions);
  if (target === void 0) return void 0;
  const absolute = resolve(packageInfo.root, target);
  if (!isFilesystemPathWithin(packageInfo.root, absolute, false)) {
    return void 0;
  }
  return absolute;
}
async function createEngineWorkspaceResolver(projectRoot) {
  const binding = await readEngineBinding(projectRoot);
  if (!binding.ok) {
    throw new Error(`${binding.error.code}: ${binding.error.hint}`);
  }
  const localRoot = binding.value?.path;
  if (localRoot !== void 0) {
    const inspected = await inspectEngineWorkspace(localRoot);
    if (!inspected.ok) throw new Error(`${inspected.error.code}: ${inspected.error.hint}`);
  }
  const packages = await engineWorkspacePackages(localRoot);
  if (packages.size === 0) return void 0;
  let conditions;
  return {
    name: "forgeax:devkit-engine-workspace-resolver",
    enforce: "pre",
    configResolved(config) {
      conditions = [...config.resolve.conditions, "import", "default"];
    },
    async resolveId(source, importer) {
      const bareSource = source.split("?", 1)[0] ?? source;
      if (!bareSource.startsWith("@forgeax/engine")) return null;
      if (localRoot !== void 0) return engineWorkspaceImport(bareSource, packages, conditions);
      try {
        const resolved = await this.resolve(source, importer, { skipSelf: true });
        if (resolved !== null) return resolved;
      } catch {
      }
      return engineWorkspaceImport(bareSource, packages, conditions);
    }
  };
}
async function createEngineWorkspaceResolverForProject(projectRoot) {
  return createEngineWorkspaceResolver(projectRoot);
}
async function consumerEngineAliases(projectRoot) {
  const root = resolve(projectRoot, "node_modules", ".pnpm", "node_modules", "@forgeax");
  try {
    const entries = await readdir(root, { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory() && entry.name.startsWith("engine-")).map((entry) => ({
      find: `@forgeax/${entry.name}`,
      replacement: resolve(root, entry.name)
    })).sort((a, b) => a.find.localeCompare(b.find));
  } catch {
    return [];
  }
}
async function hostEngineAliases(projectRoot, binding) {
  const hostRoot = binding?.backend.context.get("devkitBackend")?.hostPackageRoot;
  if (hostRoot === void 0) return [];
  const hostManifest = JSON.parse(await readFile(resolve(hostRoot, "package.json"), "utf8"));
  if (hostManifest.dependencies?.["@forgeax/engine"] === void 0) return [];
  const hostRequire2 = createRequire(resolve(hostRoot, "package.json"));
  const engineRoot = dirname(hostRequire2.resolve("@forgeax/engine/package.json"));
  const manifest = JSON.parse(await readFile(resolve(engineRoot, "package.json"), "utf8"));
  const engineRequire = createRequire(resolve(engineRoot, "package.json"));
  const local = await readEngineBinding(projectRoot);
  if (!local.ok) hostBindingError(`${local.error.code}: ${local.error.hint}`);
  const localPackages = await engineWorkspacePackages(local.value?.path);
  const projectRequire = createRequire(resolve(projectRoot, "package.json"));
  const projectEngineRequire = local.value?.path ? void 0 : createRequire(projectRequire.resolve("@forgeax/engine/package.json"));
  const aliases = [];
  for (const name of [
    "@forgeax/engine",
    ...Object.keys(manifest.dependencies ?? {}).filter(
      (name2) => name2.startsWith("@forgeax/engine-")
    )
  ]) {
    const selected = await realpath(dirname(engineRequire.resolve(`${name}/package.json`)));
    const target = localPackages.get(name)?.root ?? dirname(
      projectEngineRequire?.resolve(`${name}/package.json`) ?? projectRequire.resolve(`${name}/package.json`)
    );
    const actual = await realpath(target);
    if (actual !== selected && await enginePackageRuntimeIdentity(actual) !== await enginePackageRuntimeIdentity(selected)) {
      hostBindingError(
        `frontend Engine source conflict for ${name}: host=${selected}; project=${actual}. Select the same Engine build before opening this target.`
      );
    }
    const selectedManifest = JSON.parse(await readFile(resolve(selected, "package.json"), "utf8"));
    const selectedPackages = /* @__PURE__ */ new Map([[name, { root: selected, manifest: selectedManifest }]]);
    aliases.push({
      find: name,
      replacement: name,
      customResolver: (id) => engineWorkspaceImport(id, selectedPackages) ?? null
    });
  }
  return aliases.sort((a, b) => b.find.length - a.find.length);
}
async function hostFrontendModuleAlias(binding) {
  const specifier = binding?.frontendModule?.specifier;
  const packageRoot = binding?.backend.context.get("devkitBackend")?.hostPackageRoot;
  if (specifier === void 0 || packageRoot === void 0 || specifier.startsWith(".") || isAbsolute(specifier) || specifier.includes(":"))
    return void 0;
  try {
    return {
      find: specifier,
      replacement: await realpath(
        createRequire(resolve(packageRoot, "package.json")).resolve(specifier)
      )
    };
  } catch (cause) {
    hostBindingError(
      `host package cannot resolve frontend module ${specifier} from ${packageRoot}: ${cause instanceof Error ? cause.message : String(cause)}`
    );
  }
}
async function resolveCanonicalKit() {
  const packageJson = hostRequire.resolve("@forgeax/engine-preview/package.json");
  const root = resolve(packageJson, "..", "assets/canonical-kit");
  if (!existsSync(root)) throw new Error(`canonical preview kit root is missing: ${root}`);
  const receiptPath = resolve(root, "cook-receipt.json");
  const receipt = validateCanonicalKitReceipt(JSON.parse(await readFile(receiptPath, "utf8")));
  if (!receipt.ok) {
    throw new Error(`${receipt.error.code}: ${receipt.error.detail.field}`);
  }
  const sourcePath = resolve(root, receipt.value.transport.source);
  const metaPath = resolve(root, receipt.value.transport.meta);
  if (!existsSync(sourcePath) || !existsSync(metaPath)) {
    throw new Error("canonical preview kit source and Meta must be package-owned files");
  }
  const [source, meta] = await Promise.all([readFile(sourcePath), readFile(metaPath)]);
  for (const [file, bytes, expectedDigest] of [
    [receipt.value.transport.source, source, receipt.value.source.digest],
    [receipt.value.transport.meta, meta, receipt.value.source.metaDigest]
  ]) {
    const actualDigest = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
    if (actualDigest !== expectedDigest) {
      throw Object.assign(new Error(`preview-kit-source-mismatch: ${file}`), {
        code: "preview-kit-source-mismatch",
        expected: "canonical preview kit source and Meta bytes to match their cook receipt",
        hint: "Run the canonical kit producer and publish its source, Meta, and receipt together.",
        detail: { file, expectedDigest, actualDigest }
      });
    }
  }
  return { root, guid: receipt.value.source.guid };
}
function devKitHostBridge(binding, assemblyInput) {
  let dispose;
  return {
    async releaseForRestart() {
      await dispose?.(false);
    },
    name: "forgeax:devkit-backend-host",
    async configureServer(server) {
      const assembly = typeof assemblyInput === "function" ? await assemblyInput() : assemblyInput ?? (binding ? composeBoundHostAssembly(binding, createHostAssembly()) : createHostAssembly());
      if (binding) validateHostBinding(binding);
      const http = server.httpServer;
      if (!http) return;
      const httpEvents = http;
      const projected = binding?.frontendAssembly !== void 0 || binding?.workspace?.execution === "game";
      const previous = binding?.backend.assembly.current;
      const transport = binding?.backend.transport ?? createHostTransport();
      const backend = binding?.backend ?? await createBackendHost({ assembly, transport });
      if (binding && previous && !projected)
        await backend.update(assembly, { expectedRevision: previous.revision });
      const published = backend.assembly.current.revision;
      const sockets = /* @__PURE__ */ new Set();
      const socketServer = new WebSocketServer({ noServer: true });
      let workspaceSocket;
      let admitting = false;
      const projections = /* @__PURE__ */ new Map();
      const removeConnect = transport.onClientConnect((caller) => {
        if (admitting && projected)
          projections.set(caller.connectionId, backend.bindProjection(caller, { assembly }));
      });
      const removeDisconnect = transport.onClientDisconnect((caller) => {
        projections.get(caller.connectionId)?.();
        projections.delete(caller.connectionId);
      });
      socketServer.on("connection", (socket) => {
        if (binding?.workspace) {
          workspaceSocket?.close();
          workspaceSocket = socket;
        }
        const workspace = binding?.workspace;
        admitting = true;
        let release;
        try {
          release = attachHostWebSocketServer(
            socket,
            transport,
            workspace ? {
              kind: "frontend",
              sourceId: `forgeax-workspace:${workspace.sessionId}:${workspace.targetId}`
            } : {}
          );
        } finally {
          admitting = false;
        }
        sockets.add(release);
        socket.once("close", () => sockets.delete(release));
      });
      const upgrade = (request, socket, head) => {
        const url = new URL(request.url ?? "/", "http://localhost");
        if (url.pathname !== "/__forgeax/host") return;
        const workspace = binding?.workspace;
        if (workspace && (url.searchParams.get("forgeaxWorkspaceSession") !== workspace.sessionId || url.searchParams.get("forgeaxWorkspaceTarget") !== workspace.targetId || url.searchParams.get("forgeaxWorkspaceToken") !== workspace.admissionToken)) {
          socket.destroy();
          return;
        }
        socketServer.handleUpgrade(
          request,
          socket,
          head,
          (client) => socketServer.emit("connection", client, request)
        );
      };
      httpEvents.on("upgrade", upgrade);
      const marker = binding && !projected ? backend.context.plugin({
        apply(ctx) {
          ctx.provide("devkitHostBinding", binding);
        }
      }).ctx.fiber : void 0;
      let disposed = false;
      const removeBackendDispose = binding?.backend.subscribeDispose(() => dispose?.(false));
      dispose = async (restore = true) => {
        if (disposed) return;
        disposed = true;
        httpEvents.off("upgrade", upgrade);
        removeBackendDispose?.();
        removeConnect();
        removeDisconnect();
        for (const release of projections.values()) release();
        projections.clear();
        for (const release of sockets) release();
        sockets.clear();
        socketServer.close();
        await marker?.dispose();
        if (!binding) await backend.dispose();
        else if (!projected && restore && previous && backend.assembly.current.revision === published) {
          await backend.update(
            { ...previous, sessionGeneration: backend.assembly.current.sessionGeneration + 1 },
            { expectedRevision: published }
          );
        }
      };
      httpEvents.once("close", () => {
        void dispose?.();
      });
    },
    async closeBundle() {
      await dispose?.();
    }
  };
}
function projectSsrIdentity(facts, inventory, generation) {
  const digest = (value) => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
  const inputs = [...inventory.sourceInputs].map(([path, revision]) => [relative(facts.root, path).split(sep).join("/"), revision]).sort(([left], [right]) => left.localeCompare(right));
  const sourceTree = digest(inputs);
  const lockSha256 = digest(
    inputs.filter(
      ([path]) => ["package.json", "pnpm-lock.yaml", "bun.lock", "package-lock.json"].includes(path)
    )
  );
  return {
    sourceHead: `project:${facts.id}`,
    sourceTree,
    lockSha256,
    buildSha256: digest({
      sourceTree,
      lockSha256,
      roots: Object.entries(facts.roots).sort(([left], [right]) => left.localeCompare(right)),
      ...generation
    })
  };
}
function executionBootstrapSource(bootstrapRoot, sessionGeneration, ssrIdentity, target, appOptions = {}) {
  return `import { audioPlugin } from '@forgeax/engine/audio';
import type { GameHost } from '@forgeax/engine/app';
import { skinningPlugin } from '@forgeax/engine/skinning';
import { root, createPrograms } from 'virtual:forgeax/plugin-programs/engine';
import { runtimeBinding } from 'virtual:forgeax/pack-runtime';
import { createRuntimePackOptions${target === "tauri" ? "" : ", createRuntimePackDeliveryClient"} } from './runtime-packs';
import { createGameVfx } from './game-vfx';
export default async function executionBootstrap(data) {
const vfx = createGameVfx({ isolateViewGraph: data?.isolateVfxViewGraph === true, instanceArenas: data?.vfxInstanceArenas !== false, nativePlanning: data?.vfxNativePlanning !== false, retainedResources: data?.vfxRetainedResources !== false });
${target === "tauri" ? "" : `let prepareDelivery: ReturnType<typeof createRuntimePackDeliveryClient> = async () => ({ error: 'Runtime Pack page bridge is not ready' });`}
const bridge = {
  name: 'forgeax:worker-game-host', inject: ['world', 'assets', 'executionBootstrapHost'],
  apply(ctx) {
    ${target === "tauri" ? "" : `const lifetime = new AbortController();
    prepareDelivery = createRuntimePackDeliveryClient(data?.programDeliveryChannel, lifetime.signal);
    ctx.effect(() => () => lifetime.abort(), 'devkit/runtime-pack-delivery');`}
    ${gameProjectionSource}
    const inspection = {
      list: () => ({ reads: Array.from(gameProjectionDefinitions.entries()).filter(([, entry]) => entry.kind === 'read').map(([id]) => id) }),
      read: async (id: string) => {
        const entry = gameProjectionDefinitions.get(id);
        if (entry?.kind !== 'read') throw new Error('forgeax: game read projection not found ' + id);
        return entry.definition.read();
      },
    };
    if (import.meta.env.DEV) {
      globalThis.__forgeaxGameInspection = inspection;
      ctx.effect(() => () => {
        if (globalThis.__forgeaxGameInspection === inspection) delete globalThis.__forgeaxGameInspection;
        gameProjectionDefinitions.clear();
      }, 'devkit/source-inspection');
    }
    ctx.provide('gameHost', {
      ...(ctx.executionBootstrapHost.canvas === undefined ? {} : { canvas: ctx.executionBootstrapHost.canvas }),
      drawingBufferSize: () => ctx.executionBootstrapHost.drawingBufferSize(),
      assets: ctx.assets,
      ...(ctx.executionBootstrapHost.port === undefined ? {} : { port: ctx.executionBootstrapHost.port }),
      app: { world: ctx.world, assets: ctx.assets },
      ...(import.meta.env.DEV ? { gameProjection } : {}),
      setPointerLockAllowed: (allowed) => ctx.executionBootstrapHost.setPointerLockAllowed(allowed),
    } satisfies GameHost);
  },
};
  const runtimePacks = await createRuntimePackOptions(runtimeBinding.scopeId${target === "tauri" ? "" : ", () => prepareDelivery()"});
  const pluginPrograms = createPrograms(crypto.randomUUID(), 'engine-worker', ${sessionGeneration}, runtimePacks.programHost);
  return {
    ssrIdentity: ${JSON.stringify(ssrIdentity)},
    ${appOptions.standardProfile === void 0 ? "" : `configureRenderer(renderer) {
      const result = renderer.setProfile(${JSON.stringify(appOptions.standardProfile)});
      if (!result.ok) throw result.error;
    },`}
    runtimePacks: { ...runtimePacks, programHost: pluginPrograms.programHost ?? runtimePacks.programHost },
    features: [vfx.feature],
    plugins: [audioPlugin(), skinningPlugin(), vfx.plugin, bridge],
    pluginPrograms,
    ...(root === null || ${JSON.stringify(bootstrapRoot === "resource-bootstrap")} ? {} : {
      root: { guid: root },
    }),
  };
}
`;
}
function hostSource(facts, bootstrapRoot, canonicalEnvironmentGuid, binding, rhiCaptureEnabled = false, devMode = false, initialAssembly = createHostAssembly(), ssrIdentity, previewRhiWindow = false, animation = {}, target = "browser", appOptions = {}, materialProfile) {
  const boundRoot = binding?.workspace?.execution === "game" ? void 0 : (binding?.frontendAssembly ?? binding?.backend.assembly.current)?.root;
  const plugins = bootstrapRoot === "resource-bootstrap" ? [] : [`webAudioPlugin(mainAudio)`, `audioPlugin()`, `skinningPlugin()`];
  const startupTimeout = facts.startupTimeoutMs === void 0 ? `(import.meta.env.DEV ? ${DEV_EXECUTION_TIMEOUT_MS} : ${PRODUCTION_EXECUTION_TIMEOUT_MS})` : JSON.stringify(facts.startupTimeoutMs);
  return `${appOptions.pipelineLibrary === void 0 ? "" : "import pipelineLibraryUrl from './pipeline-library.json?url';\n"}import { forgeaxBundlerAdapter } from 'virtual:forgeax/bundler';
import { createProfiler } from '@forgeax/engine/profiler';
import { activateExecutionRoot, assembleAssetRuntime, assembleRuntimePacks, captureEngineWorkspaceAssetBinding, createTextureWorkspacePreview, createWorkspaceMeshDisplay, engineWorkspaceBrowserPlugin, engineWorkspaceInputPlugin, engineWorkspaceResultService, createToolPreviewHost, createToolPreviewRecipe, fitToolPreviewCameraToAabb, gameHostPlugin, loadEngineWorkspaceMaterialSlots, projectEngineWorkspaceAssets, replayToolPreviewCapture, type App } from '@forgeax/engine/app';
import { createApp, syncCanvasDrawingBuffer } from '@forgeax/engine/app/browser';
import { inspectUi } from '@forgeax/engine/ui';
import { Context, startNativePlugin } from '@forgeax/engine/plugin';
import { ShaderRegistry } from '@forgeax/engine/shader';
import { textureViewSource } from '@forgeax/engine/preview';
import { createRuntimePackOptions${target === "tauri" ? "" : ", serveRuntimePackDelivery"} } from './runtime-packs';
import { createGameVfx } from './game-vfx';
import { root as engineRoot, createPrograms as enginePrograms } from 'virtual:forgeax/plugin-programs/engine';
import { root as hostRoot, rootDescriptor as hostDescriptor, createPrograms as hostPrograms } from 'virtual:forgeax/plugin-programs/frontend';
import { AssetGuid } from '@forgeax/engine/pack/guid';
import { AssetRegistry, createCatalogSource, createCatalogHotSubscription } from '@forgeax/engine/assets-runtime';
import {
  createRuntimeAssetImportTransport,
  runtimeBinding,
} from 'virtual:forgeax/pack-runtime';
import { createFrontendHost } from '@forgeax/engine/host/frontend';
import { createBrowserFrontendPlatform, createFrontendPlatformPlugin } from '@forgeax/engine/host/platform';
import { createHostAssembly, canonicalHostJson } from '@forgeax/engine/host/protocol';
import { HOST_ASSEMBLY_SERVICE, HOST_ASSEMBLY_CHANGED_TOPIC } from '@forgeax/engine/host/transport';
import { audioPlugin } from '@forgeax/engine/audio';
import { createHostAudioConsumer, WebAudioEngine, webAudioPlugin } from '@forgeax/engine/audio-webaudio';
import { physicsComponentsPlugin } from '@forgeax/engine/physics';
import { skinningPlugin } from '@forgeax/engine/skinning';
import { createPrimitiveMesh } from '@forgeax/engine/geometry';
import { mat4 } from '@forgeax/engine/math';
import { Camera, DirectionalLight, MeshFilter, MeshRenderer, Skylight, SkyboxBackground, TONEMAP_REINHARD_EXTENDED, materialSampledTextureBudget } from '@forgeax/engine/render';
import { Transform } from '@forgeax/engine/scene';
import { numMipLevels, type SceneAsset } from '@forgeax/engine/types';
import { ParticleEffectPlayer } from '@forgeax/engine/vfx';
import { createVfxRuntimeHost } from '@forgeax/engine/vfx-render';
${previewRhiWindow && !rhiCaptureEnabled ? `import { attachRecorder } from '@forgeax/engine/rhi-debug';
import { uploadTape } from '@forgeax/engine/rhi-debug/browser';
import { subscribeBrowserFrameSubmitted } from '@forgeax/engine/app';
import { RhiError } from '@forgeax/engine/rhi';
import { err } from '@forgeax/engine/types';` : ""}

const initialAssembly = createHostAssembly({ ...${JSON.stringify(initialAssembly)},
  ...(hostDescriptor === null ? {} : { root: hostDescriptor }) });
const hostContext = new Context();
${binding?.frontendModule?.prepare ? `const preparedFrontendModule = await import(${JSON.stringify(binding.frontendModule.specifier)});
const preparedFrontend = await startNativePlugin(hostContext, preparedFrontendModule[${JSON.stringify(binding.frontendModule.prepare)}], initialAssembly.root?.config, { timeoutMs: ${startupTimeout} });
if (!preparedFrontend.ok) throw preparedFrontend.error;` : ""}
const preparedPlatform = hostContext.get('frontendPlatform', false);
const frontendPlatform = preparedPlatform ?? createBrowserFrontendPlatform();
const location = frontendPlatform.window.location;
const bootstrapRoot = ${JSON.stringify(bootstrapRoot)};
const canonicalEnvironmentGuid = ${JSON.stringify(canonicalEnvironmentGuid ?? null)};
const query = new URLSearchParams(location.search);
const isolateVfxViewGraph = query.get('forgeax-vfx-view-graph') !== 'monolithic';
const vfxInstanceArenas = query.get('forgeax-vfx-instance-arena') !== 'individual';
const vfxNativePlanning = query.get('forgeax-vfx-planning') !== 'raw';
const vfxRetainedResources = query.get('forgeax-vfx-resources') !== 'declarations';
const resourceValue = query.get('forgeax-resource-preview');
const resource = resourceValue === null ? undefined : JSON.parse(resourceValue);
const executionWorkers = ${JSON.stringify(bootstrapRoot === "resource-bootstrap" || binding !== void 0 ? null : environmentExecutionWorkers())};
const animation = ${JSON.stringify(animation)};
const workerExecution = executionWorkers !== null;
const previewCameraEntities = new WeakMap();
const previewCameraTargets = new WeakMap();
let vfxRuntimeHost;
function ensureVfxRuntimeHost() {
  if (vfxRuntimeHost !== undefined) return vfxRuntimeHost;
  vfxRuntimeHost = makeVfxRuntimeHost();
  return vfxRuntimeHost;
}
function makeVfxRuntimeHost() {
  return createVfxRuntimeHost({
    instanceArenas: vfxInstanceArenas,
    nativePlanning: vfxNativePlanning,
    retainedResources: vfxRetainedResources,
    ...(isolateVfxViewGraph ? { isolateViewGraph: true } : {}),
    camera: {
      read(world) {
        const cameraEntity = previewCameraEntities.get(world);
        if (cameraEntity === undefined) return undefined;
        const transform = world.get(cameraEntity, Transform);
        const camera = world.get(cameraEntity, Camera);
        if (!transform.ok || !camera.ok) return undefined;
        const position = new Float32Array(transform.value.pos);
        const target = previewCameraTargets.get(world) ?? [0, 0, 0];
        return {
          position,
          right: new Float32Array([1, 0, 0]),
          up: new Float32Array([0, 1, 0]),
          viewProjection: mat4.multiply(mat4.create(), mat4.perspectiveReverseZ(mat4.create(), camera.value.fov, camera.value.aspect, camera.value.near, camera.value.far), mat4.lookAt(mat4.create(), position, target, [0, 1, 0])),
        };
      },
    },
  });
}
${previewRhiWindow && !rhiCaptureEnabled ? `async function previewRhiDiagnostic(context, canvas, targetId) {
  const controller = new AbortController();
  const backend = typeof navigator !== 'undefined' && navigator.gpu !== undefined
    ? await import('@forgeax/engine/rhi-webgpu')
    : await import('@forgeax/engine/rhi-wgpu');
  if ('ensureReady' in backend) await backend.ensureReady();
  const attached = attachRecorder(backend);
  if (!attached.ok) throw attached.error;
  const attachment = attached.value;
  let disposed = false;
  let worldIdentity;
  const observation = { targetId, seed: 'omitted', evidence: 'commands-and-bindings', status: 'attached', mapping: 'partial', frames: [] };
  const publish = () => { if (!disposed) { try { canvas.dataset.forgeaxPreviewRhiWindow = JSON.stringify(observation); } catch {} } };
  const remove = subscribeBrowserFrameSubmitted(canvas, (submitted) => {
    if (observation.frames.length >= 4) return;
    const receipt = submitted.receipt;
    const previous = observation.frames.at(-1);
    const valid = receipt !== undefined && worldIdentity !== undefined && submitted.worldIdentity === worldIdentity &&
      receipt.frameId === submitted.frameId && receipt.deviceGeneration === submitted.deviceGeneration &&
      (previous === undefined ? submitted.frameId === 1 : (submitted.frameId === previous.frameId + 1 && submitted.deviceGeneration === previous.deviceGeneration));
    const row = { tapeFrameIndex: observation.frames.length, frameId: submitted.frameId, deviceGeneration: submitted.deviceGeneration,
      worldIdentity: submitted.worldIdentity, presentation: receipt?.presentation, identityValid: valid,
      completion: receipt === undefined ? 'unavailable' : 'pending' };
    observation.frames.push(row);
    observation.mapping = observation.frames.length === 4 && observation.frames.every((frame) => frame.identityValid) ? 'complete' : 'partial';
    publish();
    if (receipt === undefined) return;
    void receipt.completed.then((result) => {
      row.completion = result.ok ? 'fulfilled' : 'error';
      publish();
    }, () => { row.completion = 'rejected'; publish(); });
  });
  context.effect(() => async () => {
    disposed = true;
    controller.abort();
    remove();
    const result = await attachment.dispose();
    if (!result.ok) throw result.error;
  }, 'devkit/preview-rhi-window');
  publish();
  return {
    options: { rhi: attachment.backend.rhi, rhiInstrumentation: {
      resolveSurfaceDevice(device) {
        const resolved = attachment.backend.unwrapDeviceForSurface(device);
        return resolved.ok ? resolved : err(new RhiError({ code: 'rhi-not-available',
          expected: 'The preview recorder resolves its surface device', hint: resolved.error.hint }));
      },
      onFrameBoundary() { void attachment.frameBoundary(); },
      onDeviceLost() { observation.mapping = 'partial'; attachment.deviceLost(); publish(); },
    } },
    async arm(world) {
      worldIdentity = world;
      observation.worldIdentity = world;
      observation.status = 'seeding'; publish();
      const capture = attachment.captureFrames(4, { seed: { maxResourceBytes: 0 }, signal: controller.signal });
      void capture.then(async (result) => {
        if (!result.ok) { observation.status = 'capture-error'; observation.error = result.error; publish(); return; }
        observation.status = 'uploading'; publish();
        const uploaded = await uploadTape(result.value, { signal: controller.signal });
        observation.status = uploaded.ok ? 'uploaded' : 'upload-error';
        if (uploaded.ok) observation.artifact = uploaded.value;
        else observation.error = uploaded.error;
        publish();
      }).catch((cause) => { observation.status = 'capture-error'; observation.error = String(cause); publish(); });
      const seeded = await attachment.frameBoundary();
      if (!seeded.ok) throw seeded.error;
      if (observation.status === 'seeding' && !controller.signal.aborted) observation.status = 'recording';
      publish();
    },
  };
}
` : ""}
const previewVfxHosts = new WeakMap();
if (resource?.kind === 'vfx') ensureVfxRuntimeHost();

${previewVfxBoundsSource}

const canvas = document.querySelector('#app');
if (!(canvas instanceof HTMLCanvasElement)) throw new Error('forgeax: missing canvas');
let latestFrameSubmission;
let latestTextureObservation;
canvas.addEventListener('forgeax:frame-submitted', (event) => {
  const detail = event instanceof CustomEvent ? event.detail : undefined;
  if (
    detail !== null &&
    typeof detail === 'object' &&
    Number.isSafeInteger(detail.frameId) &&
    Number.isSafeInteger(detail.deviceGeneration)
  ) {
    const frame = {
      frameId: detail.frameId,
      deviceGeneration: detail.deviceGeneration,
    };
    latestFrameSubmission = {
      ...frame,
      ...(detail.receipt?.completed === undefined ? {} : { completed: detail.receipt.completed }),
    };
    // Lock the renderer-owned binding projection at the submit boundary. A
    // later inspect() may already describe another frame or a replaced World;
    // resource observation must never pair those facts with this receipt.
    const currentApp = preparedResourceOwner?.app ?? appState.current;
    latestTextureObservation =
      currentApp?.renderer === undefined ||
      typeof currentApp.renderer.inspect !== 'function'
        ? undefined
        : textureRendererObservation(currentApp.renderer.inspect(), preparedResourceOwner?.binding, frame);
  }
});
// Publish the exact canvas + game UI container to frontend plugins.
// Presentation, reparenting, visibility and restoration belong to its consumer.
const engineWorkspaceSurface = canvas.parentElement ?? canvas;
const resizeCanvas = () => syncCanvasDrawingBuffer(canvas);
const resizeObserver = new ResizeObserver(resizeCanvas);
if (!workerExecution) {
  resizeObserver.observe(canvas);
  resizeCanvas();
}
const runtimeScopeBinding = runtimeBinding;
if (runtimeScopeBinding === undefined) {
  throw new Error('forgeax: Vite Pack runtime binding is required in the generated host');
}
const assetCatalog = createCatalogSource({
  url: import.meta.env.DEV
    ? runtimeScopeBinding.catalogUrl
    : new URL('pack-index.json', document.baseURI).href,
  ...(import.meta.env.DEV ? { expectedScope: runtimeScopeBinding, subscribe: createCatalogHotSubscription(import.meta.hot) } : {}),
});
const bundlerAdapter = forgeaxBundlerAdapter();
const bundler = {
  ...bundlerAdapter,
  // Resolve page-relative deployment URLs before crossing into nested Workers.
  shaderManifestUrl: new URL(bundlerAdapter.shaderManifestUrl, location.href).href,
  ...(import.meta.env.DEV
    ? { importTransport: createRuntimeAssetImportTransport(runtimeScopeBinding) }
    : {}),
};
const assetPreparation = new WeakMap();

function prepareAssetRegistry(assets) {
  const existing = assetPreparation.get(assets);
  if (existing !== undefined) return existing;
  const pending = (async () => {
    // The App/Host asset provider already owns source configuration, including
    // admitted runtime publications. Preparation only joins its current Catalog.
    const catalog = await assets.enumerateCatalog();
    if (!catalog.ok) throw catalog.error;
  })();
  assetPreparation.set(assets, pending);
  return pending;
}

function previewStable(value) {
  if (value instanceof ArrayBuffer) return 'ArrayBuffer:' + JSON.stringify(Array.from(new Uint8Array(value)));
  if (ArrayBuffer.isView(value)) return value.constructor.name + ':' + JSON.stringify(Array.from(new Uint8Array(value.buffer, value.byteOffset, value.byteLength)));
  if (Array.isArray(value)) return '[' + value.map(previewStable).join(',') + ']';
  if (value !== null && typeof value === 'object') {
    const record = value;
    return '{' + Object.keys(record).sort().map((key) => JSON.stringify(key) + ':' + previewStable(record[key])).join(',') + '}';
  }
  return JSON.stringify(value) ?? 'null';
}

async function previewDigest(value) {
  const bytes = new TextEncoder().encode(previewStable(value));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return 'sha256:' + Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function textureDimensions(payload) {
  const extent = payload?.shape?.extent;
  const width = extent?.width;
  const height = extent?.height;
  if (!Number.isSafeInteger(width) || width <= 0 || !Number.isSafeInteger(height) || height <= 0) {
    throw new Error('TextureAsset shape.extent must provide positive width and height');
  }
  return [width, height];
}

function textureMipCount(payload) {
  const mips = payload?.mips;
  if (mips?.kind === 'packed') {
    if (!Number.isSafeInteger(mips.levelCount) || mips.levelCount <= 0) {
      throw new Error('TextureAsset packed mips must provide a positive levelCount');
    }
    return mips.levelCount;
  }
  if (mips?.kind !== 'generate') return 1;
  const [width, height] = textureDimensions(payload);
  const depth = payload?.shape?.viewDimension === '3d' ? payload.shape.extent.depth : 1;
  return numMipLevels({ width, height }, Number.isSafeInteger(depth) && depth > 0 ? depth : 1);
}

function texturePayloadClass(payload) {
  const data = payload?.data;
  const bytes =
    data instanceof Uint8Array || data instanceof Uint8ClampedArray
      ? Array.from(data)
      : Array.isArray(data) && data.every((value) => typeof value === 'number')
        ? data
        : undefined;
  if (bytes === undefined || bytes.length === 0) return undefined;
  const format = String(payload?.format ?? '').toLowerCase();
  const singleChannel = format.startsWith('r') && !format.startsWith('rg');
  if (bytes.every((value) => value === 0)) return 'black';
  if (singleChannel) return 'single-channel';
  if (format.startsWith('rgba') || format.startsWith('bgra')) {
    const alpha = bytes.filter((_, index) => (index + 1) % 4 === 0);
    if (alpha.length > 0 && alpha.every((value) => value === 0)) return 'transparent';
  }
  return 'color';
}

function selectedMaterialPass(payload) {
  const passes = Array.isArray(payload?.passes) ? payload.passes : [];
  return passes.find((pass) => {
    const tags = pass?.renderState?.tags;
    const mode = tags?.LightMode ?? pass?.name;
    return !/shadow|depth/i.test(String(mode));
  }) ?? passes[0];
}

function textureRendererObservation(inspection, expected, frame) {
  const inspectedFrame = inspection?.frame;
  if (
    frame === undefined ||
    inspectedFrame?.frameId !== frame.frameId ||
    inspectedFrame?.deviceGeneration !== frame.deviceGeneration
  ) {
    return { rendererTextureResident: false, textureHandleCount: 0 };
  }
  const bindings = Array.isArray(inspection?.meshMaterialBindings)
    ? inspection.meshMaterialBindings
    : [];
  const selectedBinding =
    expected === undefined
      ? undefined
      : bindings.find(
          (binding) =>
            binding.entityKey === expected.entityKey &&
            (expected.worldIdentity === undefined ||
              binding.worldIdentity === expected.worldIdentity),
        );
  const selectedMaterialIndex =
    selectedBinding === undefined || expected?.materialHandle === undefined
      ? -1
      : selectedBinding.bindings.findIndex((binding) => binding.handle === expected.materialHandle);
  const selectedResidency =
    selectedMaterialIndex >= 0 ? selectedBinding?.residency[selectedMaterialIndex] : undefined;
  const selectedTexture =
    selectedResidency === undefined || expected?.textureHandle === undefined
      ? undefined
      : selectedResidency.textures.find((texture) => texture.handle === expected.textureHandle);
  const resident =
    selectedResidency !== undefined &&
    (selectedResidency.readiness === 'ready' || selectedResidency.readiness === 'last-known-good') &&
    selectedTexture !== undefined;
  return {
    rendererTextureResident: resident,
    textureHandleCount: selectedResidency?.textures.length ?? 0,
  };
}

async function previewOwnerFacts(assets, resource, payload, textureBudget) {
  if (resource.kind === 'material') {
    const primaryPass = selectedMaterialPass(payload);
    const program = primaryPass?.program?.module;
    const pass = primaryPass?.name;
    return {
      ...(textureBudget === undefined
        ? {}
        : {
            sampledTextureLimit: textureBudget.limit,
            sampledTextureRequired: textureBudget.required,
            sampledTextureTransmission: textureBudget.transmission,
            sampledTextureConflicts: textureBudget.conflicts.join(','),
          }),
      subjectDigest: await previewDigest(payload),
      bindingsDigest: await previewDigest(payload.passes),
      closureDigest: await previewDigest(payload.values ?? payload.passes),
      ...(typeof program === 'string' ? { program } : {}),
      ...(typeof pass === 'string' ? { pass } : {}),
    };
  }
  if (resource.kind === 'mesh') {
    return {
      subjectDigest: await previewDigest(payload),
      vertexDigest: await previewDigest(payload.vertices),
      indexDigest: await previewDigest(payload.indices ?? []),
      submeshDigest: await previewDigest(payload.submeshes),
      aabbDigest: await previewDigest(payload.aabb),
    };
  }
  if (resource.kind === 'texture') {
    const [width, height] = textureDimensions(payload);
    const mipCount = textureMipCount(payload);
    const filter = 'linear';
    const payloadClass = texturePayloadClass(payload);
    return {
      subjectDigest: await previewDigest(payload),
      boundDigest: await previewDigest({ width, height, format: payload.format }),
      uvDigest: await previewDigest({ offset: [0, 0], scale: [1, 1], rotation: 0 }),
      bindingDigest: await previewDigest({ format: payload.format, colorSpace: payload.colorSpace, filter, mipCount }),
      format: payload.format,
      colorSpace: payload.colorSpace,
      filter,
      mipCount,
      dimensions: [width, height],
      ...(payloadClass === undefined ? {} : { payloadClass }),
    };
  }
  return undefined;
}

${gameProjectionSource}
function exposeGameInspection(app) {
  const inspection = {
    ui: request => inspectUi(globalThis.__forgeaxGameInspection === inspection && appState.current === app ? document.body : undefined, request),
    list() {
      return {
        reads: Array.from(gameProjectionDefinitions.entries())
          .filter(([, entry]) => entry.kind === 'read')
          .map(([id]) => id),
      };
    },
    async read(id) {
      const entry = gameProjectionDefinitions.get(id);
      if (entry?.kind !== 'read') throw new Error('forgeax: game read projection not found ' + id);
      return entry.definition.read();
    },
    renderer() {
      const inspection = app.renderer.inspect();
      return {
        state: inspection.state,
        frameId: inspection.frame.frameId,
        frame: inspection.frame,
        capabilities: inspection.capabilities,
        limits: inspection.limits,
        execution: app.execution.report(),
        lastError: app.lastError,
      };
    },
  };
  globalThis.__forgeaxGameInspection = inspection;
}

let preparedResourceOwner;
${resourcePresentationSource}

async function prepareProject(app) {
await prepareAssetRegistry(app.assets);
if (resource === undefined) return;
preparedResourceOwner = await prepareResourcePreview(app, resource);
return preparedResourceOwner.facts;
}
const gpuPassTiming = query.get('forgeax-gpu-pass-timing') === '1' ? {} : undefined;
const shadowWorkload = query.get('forgeax-shadow-workload') === '1' ? true : undefined;
const geometryLane = query.get('forgeax-geometry-lane') === 'direct' ? 'direct' : undefined;
const featureReadOnlyDepthBatchDiagnostic = (() => {
  const values = query.getAll('forgeax-feature-read-only-depth-batch');
  if (values.length === 0) return undefined;
  if (values.length !== 1 || (values[0] !== '0' && values[0] !== '1'))
    throw new Error('Read-only depth batching diagnostic requires exactly one 0 or 1');
  return values[0] === '1';
})();
const gbufferBatchOrderDiagnostic = (() => {
  const order = query.get('forgeax-gbuffer-order');
  const encoded = query.get('forgeax-gbuffer-program-digests');
  if (order === null && encoded === null) return undefined;
  if ((order !== 'near' && order !== 'far') || encoded === null)
    throw new Error('GBuffer ordering diagnostic requires near/far order and audited program digests');
  const programDigests = JSON.parse(encoded);
  if (!Array.isArray(programDigests) || programDigests.length > 128 ||
      !programDigests.every(digest => typeof digest === 'string' && /^sha256:[0-9a-f]{64}$/.test(digest)))
    throw new Error('GBuffer ordering diagnostic program digests must be SHA-256 values');
  return { order, programDigests };
})();
const renderTaskYield = query.get('forgeax-render-task-yield') === 'features' ? 'features' : query.get('forgeax-render-task-yield') === 'completion' ? 'completion' : 'none';
const renderPipelineCapacity = query.get('forgeax-render-pipeline-capacity') === '4' ? 4 : query.get('forgeax-render-pipeline-capacity') === '3' ? 3 : query.get('forgeax-render-pipeline-capacity') === '2' ? 2 : ${JSON.stringify(appOptions.renderPipelineCapacity ?? 3)};
const dynamicGeometryMeshBudgetBytes = query.has('forgeax-dynamic-mesh-budget-bytes')
  ? Number(query.get('forgeax-dynamic-mesh-budget-bytes')) : ${JSON.stringify(appOptions.dynamicGeometryMeshBudgetBytes)};
const cpuProfileRequested = query.get('forgeax-cpu-profile') === '1';
const rhiCaptureRequested =
  query.get('forgeax-rhi-capture') === '1' || ${JSON.stringify(rhiCaptureEnabled)};
// A profiler is an inert, bounded capability until a caller starts a capture.
// Create it in both live execution placements so the persistent CLI can inspect the
// actual realm; the Worker receives only the structured diagnostics switches.
const profiler = ${JSON.stringify(devMode)} || cpuProfileRequested ? createProfiler() : undefined;
const workspaceTarget = query.has('forgeaxWorkspace') && !workerExecution && bootstrapRoot === 'project-bootstrap';
const workspaceGame = workspaceTarget && query.get('forgeaxWorkspace') === 'game';
const workspaceMode = workspaceTarget && !workspaceGame;
const recipeValue = query.get('forgeax-tool-recipe');
const snapshotValue = query.get('forgeax-tool-snapshot');
const runIdValue = query.get('forgeax-tool-run-id');
const appState: { current?: App | import('@forgeax/engine/app').ExecutionApp } = {};
let disposeFrontendHost;
let activateGameHost: (() => Promise<void>) | undefined;
let removeStartupErrorListener;
let removeStartupInputBinding;
let activateWorkspace;
const notifyWorkspacePageLost =
  workspaceTarget
    ? () => {
        if (hostTransport === undefined) return;
        void hostTransport
          .request(engineWorkspaceResultService(query.get('forgeaxWorkspaceTarget')), {
            kind: 'lost',
            id: 'page-lost:' + (query.get('forgeaxWorkspaceSession') ?? 'forgeax-workspace-session'),
            sessionId: query.get('forgeaxWorkspaceSession') ?? 'forgeax-workspace-session',
            targetId: query.get('forgeaxWorkspaceTarget') ?? 'forgeax-workspace-target',
          })
          .catch(() => {});
      }
    : undefined;
const appBootstrapPlugin = {
  name: 'forgeax:generated-app-bootstrap',
  inject: workspaceGame ? ['engineWorkspaceInput'] : [],
  async apply(ctx) {
    const ownsPageLifecycle =
      bootstrapRoot !== 'resource-bootstrap' && resource === undefined && recipeValue === null;
    let pageHidden = false;
    ctx.effect(() => {
      const onPageHide = () => {
        pageHidden = true;
        notifyWorkspacePageLost?.();
        resizeObserver.disconnect();
        if (disposeFrontendHost !== undefined) void disposeFrontendHost();
        else void appState.current?.dispose();
      };
      if (ownsPageLifecycle) window.addEventListener('pagehide', onPageHide, { once: true });
      return () => {
        if (ownsPageLifecycle) window.removeEventListener('pagehide', onPageHide);
      };
    }, 'devkit/generated-page-lifecycle');
    const pointerLockAllowed =
      query.has('forgeaxCapture') || recipeValue !== null ? () => false : undefined;
    let touchControls = window.matchMedia('(pointer: coarse)').matches;
    const controlModeListeners = new Set<() => void>();
    const controlMode: NonNullable<import('@forgeax/engine/app').GameHost['controlMode']> = {
      read: () => document.pointerLockElement === canvas ? 'pointer-locked' : touchControls ? 'touch' : 'pointer',
      subscribe: listener => {
        controlModeListeners.add(listener);
        return () => { controlModeListeners.delete(listener); };
      },
    };
    ctx.effect(() => {
      const notify = () => { for (const listener of controlModeListeners) listener(); };
      const pointer = (event: PointerEvent) => {
        if (event.pointerType !== 'touch' && event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
        const next = event.pointerType === 'touch';
        if (next === touchControls) return;
        touchControls = next;
        notify();
      };
      // Observe the real input modality across both the canvas and authored UI.
      // Pointer acquisition and gameplay state remain in their existing owners.
      document.addEventListener('pointerdown', pointer, { capture: true });
      document.addEventListener('pointerlockchange', notify);
      return () => {
        document.removeEventListener('pointerdown', pointer, { capture: true });
        document.removeEventListener('pointerlockchange', notify);
        controlModeListeners.clear();
      };
    }, 'devkit/game-control-mode');
    if (profiler !== undefined) ctx.provide('profiler', profiler);
    ${target === "tauri" ? "" : `const programDeliveryChannel = workerExecution ? crypto.randomUUID() : undefined;
    if (programDeliveryChannel !== undefined)
      ctx.effect(() => serveRuntimePackDelivery(programDeliveryChannel), 'devkit/runtime-pack-delivery');`}
    const gameChannel = workerExecution || (bootstrapRoot === 'project-bootstrap' && !workspaceMode)
      ? new MessageChannel() : undefined;
    if (gameChannel !== undefined) {
      ctx.effect(() => () => {
        gameChannel.port1.close();
        // Covers failure before handoff; App closes the Engine end after handoff.
        gameChannel.port2.close();
      }, 'devkit/game-channel');
    }
    const runtimePacks = workerExecution ? undefined : await createRuntimePackOptions(runtimeScopeBinding.scopeId${target === "tauri" ? "" : ", undefined, ctx.get('frontendPlatform', false)?.createPackProgramHost"});
    const pluginPrograms = workerExecution ? undefined : enginePrograms(crypto.randomUUID(), 'engine-main', initialAssembly.sessionGeneration, runtimePacks.programHost);
    const gameVfx = !workerExecution && bootstrapRoot === 'project-bootstrap' && !workspaceMode && resource === undefined && recipeValue === null
      ? createGameVfx({ isolateViewGraph: isolateVfxViewGraph, instanceArenas: vfxInstanceArenas, nativePlanning: vfxNativePlanning, retainedResources: vfxRetainedResources }) : undefined;
    let hostAudio: ReturnType<typeof createHostAudioConsumer> | undefined;
    const mainAudio = workerExecution || bootstrapRoot === 'resource-bootstrap' ? undefined : new WebAudioEngine();
    ${appOptions.pipelineLibrary === void 0 ? "" : `const pipelineLibraryResponse = await fetch(pipelineLibraryUrl);
    if (!pipelineLibraryResponse.ok) throw new Error('Pipeline library load failed: ' + pipelineLibraryResponse.status);
    const pipelineLibrary = await pipelineLibraryResponse.json();`}
    const result = await createApp(
      canvas,
      workerExecution
        ? {
            uiRoot: document.querySelector('#game-ui') ?? document.body,
            animation,
            dynamicGeometryMeshBudgetBytes,
            ${appOptions.time === void 0 ? "" : `time: ${JSON.stringify(appOptions.time)},`}
            ${appOptions.pipelineLibrary === void 0 ? "" : "pipelineLibrary,"}
            execution: {
              createHostAudio: () => {
                hostAudio = (ctx.get('executionHostAudioFactory') ?? createHostAudioConsumer)();
                return hostAudio;
              },
              workers: executionWorkers,
              bootstrapData: ${target === "tauri" ? "{ isolateVfxViewGraph, vfxInstanceArenas, vfxNativePlanning, vfxRetainedResources }" : "{ programDeliveryChannel, isolateVfxViewGraph, vfxInstanceArenas, vfxNativePlanning, vfxRetainedResources }"},
              ...(gameChannel === undefined ? {} : { bootstrapPort: gameChannel.port2 }),
              frameTimeoutMs: ${facts.frameTimeoutMs === void 0 ? "undefined" : JSON.stringify(facts.frameTimeoutMs)},
              // Development includes cold Vite compilation before the native Worker handshake.
              startupTimeoutMs: ${startupTimeout},
              bootstrap: new URL(
                import.meta.env.DEV ? './execution-bootstrap.ts' : './execution-bootstrap.js',
                import.meta.url,
              ),
              assetCatalog: {
                url: import.meta.env.DEV
                  ? runtimeScopeBinding.catalogUrl
                  : new URL('pack-index.json', document.baseURI).href,
                ...(import.meta.env.DEV
                  ? { expectedScope: runtimeScopeBinding, runtimeBinding: runtimeScopeBinding }
                  : {}),
              },
              diagnostics: {
                profiler: import.meta.env.DEV || cpuProfileRequested,
                rhiCapture: rhiCaptureRequested,
                ...(gpuPassTiming === undefined ? {} : { gpuPassTiming }),
                ...(shadowWorkload === undefined ? {} : { shadowWorkload }),
                ...(geometryLane === undefined ? {} : { geometryLane }),
                ...(gbufferBatchOrderDiagnostic === undefined ? {} : { gbufferBatchOrderDiagnostic }),
                ...(featureReadOnlyDepthBatchDiagnostic === undefined ? {} : { featureReadOnlyDepthBatchDiagnostic }),
                renderTaskYield,
                renderPipelineCapacity,
              },
            },
            ...(pointerLockAllowed === undefined ? {} : { pointerLockAllowed }),
          }
        : {
            uiRoot: document.querySelector('#game-ui') ?? document.body,
            animation,
            dynamicGeometryMeshBudgetBytes,
            ${appOptions.time === void 0 ? "" : `time: ${JSON.stringify(appOptions.time)},`}
            ${appOptions.pipelineLibrary === void 0 ? "" : "pipelineLibrary,"}
            standardProfile: ${JSON.stringify(appOptions.standardProfile)},
            context: ctx.root,
            ${ssrIdentity === void 0 ? "" : `ssrIdentity: ${JSON.stringify(ssrIdentity)},`}
            assetCatalog,
            pluginPrograms,
            runtimePacks: { ...runtimePacks, programHost: pluginPrograms.programHost ?? runtimePacks.programHost },
            gpuPassTiming,
            ...(shadowWorkload === undefined ? {} : { shadowWorkload }),
            profiler,
            ...(workspaceGame ? { input: ctx.engineWorkspaceInput.game } : {}),
            plugins: [${plugins.join(", ")}${plugins.length > 0 ? ", " : ""}...(workspaceMode ? [physicsComponentsPlugin()] : []), ...(gameVfx === undefined ? [] : [gameVfx.plugin])],
            ...(workspaceMode ? { features: [ensureVfxRuntimeHost().feature] } : gameVfx === undefined ? {} : { features: [gameVfx.feature] }),
            ...(import.meta.env.DEV ? { assetRuntimeBinding: runtimeScopeBinding } : {}),
            ...(pointerLockAllowed === undefined ? {} : { pointerLockAllowed }),
          },
      workerExecution ? { ...bundler, importTransport: undefined } : bundler,
    );
    if (!result.ok) throw result.error;
    const app = result.value;
    if (!workerExecution && (gbufferBatchOrderDiagnostic !== undefined || featureReadOnlyDepthBatchDiagnostic !== undefined)) {
      const selected = app.renderer.setProfile({ ...app.renderer.inspect().profile, ...(gbufferBatchOrderDiagnostic === undefined ? {} : { gbufferBatchOrderDiagnostic }), ...(featureReadOnlyDepthBatchDiagnostic === undefined ? {} : { featureReadOnlyDepthBatchDiagnostic }) });
      if (!selected.ok) throw selected.error;
    }
    appState.current = app;
    ctx.effect(() => async () => {
      (await app.dispose()).unwrap();
      if (appState.current === app) appState.current = undefined;
    }, 'devkit/generated-app-resource');
    ${materialBuildCapabilityGuard(materialProfile)}
    // Engine plugins can apply before createApp completes. A page that left
    // during startup must release this late App before publishing more services.
    if (pageHidden) throw new Error('forgeax: page left during App startup');
    if (workerExecution) {
      // DOM plugins load POD assets through the same catalog without a GPU or
      // a second World. Host UI never downloads the renderer shader manifest.
      const assets = new AssetRegistry({ shaderRegistry: new ShaderRegistry({ manifestUrl: undefined }), importTransport: bundler.importTransport });
      if (!import.meta.env.DEV) assets.configurePackIndex(new URL('pack-index.json', document.baseURI).href);
      const assembly = assembleAssetRuntime(assets, [], {
        ownsRegistry: true,
        catalogSource: assetCatalog,
        ...(import.meta.env.DEV ? { runtimeBinding: runtimeScopeBinding } : {}),
      });
      if (!assembly.ok) { await app.dispose(); throw assembly.error; }
      const uiRoot = document.querySelector('#game-ui');
      ctx.provide('assets', assets);
      const host = {
        app, assets,
        get audio() { return hostAudio?.engine; },
        ...(gameChannel === undefined ? {} : { port: gameChannel.port1 }),
        get canvas() { return ('canvas' in app ? app.canvas : undefined) ?? canvas; },
        drawingBufferSize: () => {
          const current = ('canvas' in app ? app.canvas : undefined) ?? canvas;
          return { width: current.width, height: current.height };
        },
        uiRoot: uiRoot instanceof HTMLElement ? uiRoot : document.body,
        controlMode,
        setPointerLockAllowed: (allowed: boolean) => app.input?.setPointerLockAllowed?.(allowed),
      } satisfies import('@forgeax/engine/app').GameHost;
      ctx.provide('gameHost', host);
      ctx.effect(() => () => assembly.value.dispose(), 'devkit/host-assets');
      if (import.meta.env.DEV || cpuProfileRequested || ${JSON.stringify(target === "tauri")}) {
        const localInspection = globalThis.__forgeaxGameInspection;
        const sourceRead = (method: 'list' | 'read', id?: string) => app.remoteEval === undefined
          ? localInspection?.[method](id)
          : app.remoteEval('globalThis.__forgeaxGameInspection.' + method + '(' + (id === undefined ? '' : JSON.stringify(id)) + ')');
        const inspection = {
          ui: request => inspectUi(globalThis.__forgeaxGameInspection === inspection && appState.current === app ? document.body : undefined, request),
          list: () => import.meta.env.DEV ? sourceRead('list') : { reads: [] },
          read: (id: string) => sourceRead('read', id),
          renderer: () => {
            const execution = app.execution.report();
            const local = 'renderer' in app ? app.renderer.inspect() : undefined;
            return { state: execution.render?.state ?? local?.state ?? (execution.engine.health === 'running' ? 'alive' : execution.engine.health), frameId: execution.render?.completedFrame ?? execution.frame.completed, ...(local === undefined ? {} : { frame: local.frame }), execution, lastError: app.lastError };
          },
        };
        globalThis.__forgeaxGameInspection = inspection;
        ctx.effect(() => () => {
          if (globalThis.__forgeaxGameInspection === inspection) delete globalThis.__forgeaxGameInspection;
        }, 'devkit/host-inspection');
      }
    }
    if (workspaceTarget) {
      activateWorkspace = async () => {
        if (hostTransport === undefined || workerExecution) throw new Error('Workspace requires its main-realm Host transport');
        const extent = (name, fallback) => { const value = Number(query.get(name)); return Number.isSafeInteger(value) && value > 0 ? value : fallback; };
        const fiber = await ctx.plugin(engineWorkspaceBrowserPlugin, {
          app, canvas, surface: engineWorkspaceSurface, transport: hostTransport,
          ...(workspaceMode ? { createPreviewApp: async ({ context, canvas: previewCanvas, asset, targetId }) => {
            const vfx = asset.kind === 'vfx' ? makeVfxRuntimeHost() : undefined;
            ${previewRhiWindow && !rhiCaptureEnabled ? "const diagnostic = ['mesh', 'texture', 'equirect'].includes(asset.kind) ? await previewRhiDiagnostic(context, previewCanvas, targetId) : undefined;" : ""}
            const created = await createApp(previewCanvas, {
              context, assetCatalog: app.pluginContext.get('runtimePacks')?.catalog ?? assetCatalog, plugins: [physicsComponentsPlugin()],
              ${previewRhiWindow && !rhiCaptureEnabled ? "...diagnostic?.options," : ""}
              ...(vfx ? { features: [vfx.feature] } : {}),
              ...(import.meta.env.DEV ? { assetRuntimeBinding: runtimeScopeBinding } : {}),
              pointerLockAllowed: () => false,
            }, bundler);
            if (!created.ok) throw created.error;
            ${previewRhiWindow && !rhiCaptureEnabled ? "if (diagnostic !== undefined) await diagnostic.arm(created.value.world.identity);" : ""}
            if (vfx) previewVfxHosts.set(created.value, vfx);
            return created.value;
          } } : {}),
          ...(workspaceGame ? { input: ctx.engineWorkspaceInput } : {}),
          project: { id: ${JSON.stringify(facts.id)}, root: ${JSON.stringify(facts.root)}, name: ${JSON.stringify(facts.name)}, assetRoots: ${JSON.stringify(facts.assetRoots)} },
          target: {
            sessionId: query.get('forgeaxWorkspaceSession'), targetId: query.get('forgeaxWorkspaceTarget'),
            worldId: app.world.identity, headed: query.get('forgeaxWorkspaceHeaded') !== '0',
            width: extent('forgeaxWorkspaceWidth', 1280), height: extent('forgeaxWorkspaceHeight', 720), url: location.href,
          },
          openResourcePreview: async ({ app: previewApp, asset, canvas: previewCanvas }) => {
            const owner = await prepareResourcePreview(previewApp, { kind: asset.kind, guid: asset.guid }, previewCanvas);
            return { close: owner.close, assetBinding: owner.assetBinding, ...(owner.texture === undefined ? {} : { texture: owner.texture }), ...(owner.display === undefined ? {} : { display: owner.display }) };
          },
        });
        await fiber.await();
      };
    }
    if (bootstrapRoot === 'project-bootstrap' && recipeValue === null && (!workspaceTarget || workspaceGame)) {
      const startup = globalThis.__forgeaxStartup;
      startup?.bindSession?.(app.execution.report().world.identity);
      removeStartupErrorListener = app.onError((error) => {
        // A refused pointer lock leaves the game running unlocked and the next
        // trusted click retries it; only unrecoverable errors stop the game.
        if (error.code === 'app-pointer-lock-failed') {
          console.warn(error);
          return;
        }
        startup?.fail?.(error, app.execution.report());
      });
      removeStartupInputBinding = startup?.bindInput?.((enabled) => {
        app.input?.setInputAllowed?.(enabled);
        if (!enabled) app.input?.clear?.();
      });
    }
    if (workspaceMode) await activateWorkspace?.();
    if ((import.meta.env.DEV || cpuProfileRequested || ${JSON.stringify(target === "tauri")}) && !workerExecution) exposeGameInspection(app as App);
    let gameHostFiber;
    let engineRootFiber;
    ctx.effect(
      () => {
        return async () => {
          resizeObserver.disconnect();
          await engineRootFiber?.dispose();
          await gameHostFiber?.dispose();
          removeStartupErrorListener?.();
          removeStartupErrorListener = undefined;
          removeStartupInputBinding?.();
          removeStartupInputBinding = undefined;
        };
      },
      'devkit/generated-app',
    );
    if (
      bootstrapRoot !== 'resource-bootstrap' &&
      !workerExecution &&
      !workspaceMode
    ) {
      activateGameHost = async () => {
        const assets = app.assets;
        await prepareAssetRegistry(assets);
        if (assets === undefined) throw new Error('forgeax: generated App did not provide assets');
        const uiRoot = document.querySelector('#game-ui');
        gameHostFiber = await ctx.root.plugin(gameHostPlugin({
          app,
          assets,
          canvas,
          renderer: app.renderer,
          ...(mainAudio === undefined ? {} : { audio: mainAudio }),
          drawingBufferSize: () => ({ width: canvas.width, height: canvas.height }),
          ...(gameChannel === undefined ? {} : { port: gameChannel.port2, presentationPort: gameChannel.port1 }),
          uiRoot: uiRoot instanceof HTMLElement ? uiRoot : document.body,
          controlMode,
          setPointerLockAllowed: (allowed) => app.input?.setPointerLockAllowed?.(allowed),
          startupTimeoutMs: ${startupTimeout},
          ...(import.meta.env.DEV ? { gameProjection } : {}),
        }));
        if (engineRoot !== null) {
          const mounted = await activateExecutionRoot(ctx, {
            guid: engineRoot,
          }, { timeoutMs: ${startupTimeout} });
          engineRootFiber = mounted.fiber;
        }
      };
    }
  },
};
let removeWorkspaceAssemblySubscription;
const hostLifecyclePlugin = {
  name: 'forgeax:generated-host-lifecycle',
  apply(ctx) {
    ctx.effect(
      () => async () => {
        // Release the borrowed connection and the separately prepared platform Fiber.
        removeWorkspaceAssemblySubscription?.();
        await hostTransport?.close('generated frontend host disposed');
        if (${JSON.stringify(target === "tauri")} && globalThis.__forgeaxTauriDispose === disposeFrontendHost) delete globalThis.__forgeaxTauriDispose;
        ${binding?.frontendModule?.prepare ? "await preparedFrontend.value.dispose();" : ""}
      },
      'devkit/generated-host-lifecycle',
    );
  },
};
const hostTransport = import.meta.env.DEV
  ? await (frontendPlatform.connectHost)(
      (() => {
        const hostUrl = new URL(
          (location.protocol === 'https:' ? 'wss:' : 'ws:') +
            '//' + location.host + '/__forgeax/host',
        );
        if (workspaceTarget) {
          const session = query.get('forgeaxWorkspaceSession');
          const target = query.get('forgeaxWorkspaceTarget');
          const token = query.get('forgeaxWorkspaceToken');
          if (session !== null) hostUrl.searchParams.set('forgeaxWorkspaceSession', session);
          if (target !== null) hostUrl.searchParams.set('forgeaxWorkspaceTarget', target);
          if (token !== null) hostUrl.searchParams.set('forgeaxWorkspaceToken', token);
        }
        return hostUrl.href;
      })(),
    )
  : undefined;
const frontendHost = await createFrontendHost({
  context: hostContext,
  startupTimeoutMs: ${startupTimeout},
  startupPlugins: [...(preparedPlatform ? [] : [createFrontendPlatformPlugin(frontendPlatform)]), hostLifecyclePlugin, ...(workspaceGame ? [{ name: 'forgeax:workspace-input-bootstrap', async apply(ctx) { const fiber = ctx.plugin(engineWorkspaceInputPlugin, { canvas }); await fiber.await(); } }] : []), ...(workspaceMode ? [] : [appBootstrapPlugin])],
  assembly: initialAssembly,
  activateRoot: async (ctx, descriptor, signal, startupTimeoutMs) => {
    ${boundRoot ? `if (canonicalHostJson(descriptor) === canonicalHostJson(${JSON.stringify(boundRoot)})) {
      const module = await import(${JSON.stringify(binding?.frontendModule?.specifier)});
      const plugin = module[${JSON.stringify(binding?.frontendModule?.export ?? "default")}];
      ${binding?.frontendModule?.prepare ? `if (plugin === preparedFrontendModule[${JSON.stringify(binding.frontendModule.prepare)}]) return { fiber: preparedFrontend.value, dispose: () => preparedFrontend.value.dispose() };` : ""}
      if (!ctx.registry.resolve(plugin)) throw new Error('external frontend module is missing its selected native plugin export');
      const started = await startNativePlugin(ctx, plugin, descriptor.config, {
        signal,
        timeoutMs: startupTimeoutMs,
      });
      if (!started.ok) throw started.error;
      return { fiber: started.value, dispose: () => started.value.dispose() };
    }` : ""}
    if (hostRoot === null || canonicalHostJson(descriptor) !== canonicalHostJson(hostDescriptor)) throw new Error('host root/program snapshot mismatch');
    const scope = ctx.isolate('assets').isolate('pluginPrograms').isolate('runtimePacks');
    const provider = scope.plugin({ provide: ['assets', 'pluginPrograms', 'runtimePacks'], async apply(ctx) {
      const assembly = assembleAssetRuntime(new AssetRegistry({ shaderRegistry: new ShaderRegistry({ manifestUrl: undefined }) }), [], { catalogSource: assetCatalog, ownsRegistry: true }).unwrap();
      ctx.effect(() => () => assembly.dispose());
      const options = await createRuntimePackOptions(runtimeScopeBinding.scopeId${target === "tauri" ? "" : ", undefined, ctx.get('frontendPlatform', false)?.createPackProgramHost"});
      const pluginPrograms = hostPrograms(crypto.randomUUID(), 'frontend', initialAssembly.sessionGeneration, options.programHost);
      ctx.provide('pluginPrograms', pluginPrograms);
      const runtimePacks = assembleRuntimePacks(ctx, assembly, { ...options, programHost: pluginPrograms.programHost ?? options.programHost });
      ctx.provide('runtimePacks', runtimePacks);
      const reader = new AssetRegistry({ catalog: runtimePacks.catalog, fetcher: runtimePacks.fetcher, scopeId: runtimeScopeBinding.scopeId });
      ctx.provide('assets', reader);
      ctx.effect(() => () => reader.dispose());
    } });
    await provider.await();
    return activateExecutionRoot(scope, {
      guid: hostRoot,
    }, { signal, timeoutMs: startupTimeoutMs });
  },
  ...(hostTransport === undefined ? {} : { transport: hostTransport }),
  autoActivate: false,
});
disposeFrontendHost = () => frontendHost.dispose();
if (${JSON.stringify(target === "tauri")}) globalThis.__forgeaxTauriDispose = disposeFrontendHost;
if (workspaceMode) {
  // UI and connection plugins activate independently of the optional renderer.
  await frontendHost.activate();
  const appFiber = hostContext.plugin(appBootstrapPlugin);
  try {
    await appFiber.await();
  } catch (error) {
    await appFiber.dispose();
    globalThis.__forgeaxStartup?.fail?.(error);
    await hostTransport?.request(engineWorkspaceResultService(query.get('forgeaxWorkspaceTarget')), {
      kind: 'failed', id: 'workspace-bootstrap-failed',
      sessionId: query.get('forgeaxWorkspaceSession'), targetId: query.get('forgeaxWorkspaceTarget'),
      error: { code: error?.code ?? 'engine-workspace-bootstrap-failed', expected: error?.expected ?? 'the workspace renderer to initialize', hint: error?.hint ?? String(error), detail: error?.detail ?? {} },
    });
  }
}
const app = appState.current;
let appStarted = false;
if (app !== undefined) {
try {
  if (app === undefined) throw new Error('forgeax: generated App bootstrap did not complete');
  await activateGameHost?.();
  if (!workspaceMode && bootstrapRoot !== 'resource-bootstrap') {
    // The Engine realm and its plugins are ready when createApp returns. Open
    // frame credit before Host plugins load runtime assets so their async
    // startup can never depend on a frame that this activation is withholding.
    app.start().unwrap();
    appStarted = true;
    await frontendHost.activate();
  }
  const pluginProjectionBridge = globalThis.__forgeaxPluginProjection;
  if (pluginProjectionBridge !== undefined) {
    pluginProjectionBridge.current = { inspect() {
      const live = frontendHost.assembly.inspection;
      return { desired: initialAssembly.root ? [initialAssembly.root] : [], live, entries: live, liveState: 'attached' };
    } };
  }
} catch (error) {
  if (appStarted) app.stop();
  await frontendHost.dispose().catch(() => {});
  throw error;
}

// The backend remains the assembly authority after the initial workspace boot.
// Its workspace bridge publishes only workspace-safe project entries.
if (workspaceMode && hostTransport !== undefined) {
  let queue = Promise.resolve();
  const applyWorkspaceAssembly = (assembly) => {
    queue = queue.then(async () => {
      if (assembly.revision !== frontendHost.assembly.current.revision) {
        await frontendHost.update(assembly);
      }
    }).catch((error) => hostTransport.close(error));
    return queue;
  };
  removeWorkspaceAssemblySubscription = hostTransport.subscribe(HOST_ASSEMBLY_CHANGED_TOPIC, applyWorkspaceAssembly);
  await applyWorkspaceAssembly(await hostTransport.request(HOST_ASSEMBLY_SERVICE, undefined));
}

// A workspace App stays stopped until its first preview is instantiated. This
// avoids running a camera-less frame loop between page readiness and the
// user's first asset selection; the selected SceneAsset (or resource owner)
// supplies the observation camera before any frame is submitted.

if (query.has('forgeax-tool-replay')) {
  globalThis.__forgeaxToolReplayHost = {
    ready: true,
    async run(capture) {
      const result = await replayToolPreviewCapture(capture);
      return result.ok ? { ok: true, result: result.value } : { ok: false, error: result.error };
    },
  };
} else if (recipeValue !== null) {
  const previewRecipe = createToolPreviewRecipe(JSON.parse(recipeValue));
  const host = await createToolPreviewHost({
    ...(runIdValue === null ? {} : { runId: runIdValue }),
    recipe: previewRecipe,
    snapshot: JSON.parse(snapshotValue ?? 'null'),
    ...(resource === undefined ? {} : { resource }),
    canvas,
    app: {
      plugins: [${plugins.join(", ")}],
      ...(import.meta.env.DEV ? { assetRuntimeBinding: runtimeScopeBinding } : {}),
      ...(vfxRuntimeHost === undefined ? {} : { features: [vfxRuntimeHost.feature] }),
    },
    bundler,
    prepare: prepareProject,
    async collectResourceFacts(app, current) {
      if (current === undefined) return current;
      if (resource?.kind !== 'vfx') {
        if (resource?.kind === 'material' || resource?.kind === 'mesh' || resource?.kind === 'texture') {
          if (resource.kind === 'mesh') {
            const asset = current.asset;
            const aabb = asset?.aabb;
            const submeshes = asset?.submeshes;
            const materialSlots = asset?.materialSlots;
            if (!Array.isArray(aabb) || aabb.length !== 6 || !Array.isArray(submeshes) || !Array.isArray(materialSlots)) {
              return current;
            }
            return {
              ...current,
              observation: {
                ...current.ownerFacts,
                aabb,
                submeshCount: submeshes.length,
                materialSlotCount: materialSlots.length,
              },
            };
          }
          if (resource.kind === 'texture') {
            let textureObservation = latestTextureObservation ?? {
              rendererTextureResident: false,
              textureHandleCount: 0,
            };
            const completion = latestFrameSubmission?.completed;
            if (completion === undefined) {
              textureObservation = { rendererTextureResident: false, textureHandleCount: 0 };
            } else {
              try {
                const completed = await completion;
                if (completed?.ok !== true) {
                  textureObservation = { rendererTextureResident: false, textureHandleCount: 0 };
                }
              } catch {
                textureObservation = { rendererTextureResident: false, textureHandleCount: 0 };
              }
            }
            return {
              ...current,
              observation: {
                ...current.ownerFacts,
                ...textureObservation,
              },
            };
          }
          return {
            ...current,
            observation: current.ownerFacts,
          };
        }
        return current;
      }
      if (vfxRuntimeHost === undefined) return current;
      const hostInspection = vfxRuntimeHost.inspect(app.world);
      const player = hostInspection?.players.find(
        (candidate) => candidate.assetGuid.toLowerCase() === resource.guid.toLowerCase(),
      );
      const renderObservation = vfxRuntimeHost.feature.inspect();
      if (player === undefined || renderObservation.frameNumber < 0) {
        return current;
      }
      const bounds = previewVfxBounds(current.asset);
      if (bounds === undefined) return current;
      const emitterDigest = JSON.stringify(player.emitters.map(({ id, module, capacity }) => ({ id, module, capacity })));
      const sampleDigest = JSON.stringify(player.emitters.map(({ id, schedule }) => ({ id, schedule })));
      const boundsDigest = JSON.stringify(player.emitters.map(({ id, bounds: emitterBounds }) => ({ id, bounds: emitterBounds })));
      const computeDigest = player.programFingerprint;
      const indirectDigest = JSON.stringify(player.emitters.map(({ id, renderers }) => ({ id, renderers: renderers.map(({ kind, enabled }) => ({ kind, enabled })) })));
      return {
        ...current,
        observation: {
          subjectDigest: current.asset.programFingerprint,
          programFingerprint: player.programFingerprint,
          emitterDigest,
          sampleDigest,
          boundsDigest,
          computeDigest,
          indirectDigest,
          authoredBounds: bounds.aabb,
          seed: player.seed,
          fixedDelta: player.fixedDelta,
          timelineFrames: previewRecipe.frames,
          dispatches: renderObservation.dispatches,
          indirectDraws: renderObservation.indirectDraws,
          subjectOutputs: renderObservation.subjectOutputs,
        },
      };
    },
    onDispose: async () => {
      const owner = preparedResourceOwner;
      preparedResourceOwner = undefined;
      await owner?.close?.();
    },
    executeAction(action) {
      return !globalThis.dispatchEvent(new CustomEvent('forgeax-tool-action', {
        detail: action,
        cancelable: true,
      }));
    },
  });
  if (!host.ok) {
    globalThis.__forgeaxStartup?.fail?.(host.error);
    globalThis.__forgeaxToolHost = {
      ready: true,
      capture: async () => ({ ok: false, error: host.error }),
      run: async () => ({ ok: false, error: host.error }),
      dispose: async () => undefined,
    };
  } else {
    globalThis.__forgeaxToolHost = {
      ready: true,
      async capture() {
        const result = await host.value.capture();
        return result.ok ? { ok: true, result: result.value } : { ok: false, error: result.error };
      },
      async run() {
        const result = await host.value.run();
        return result.ok ? { ok: true, result: result.value } : { ok: false, error: result.error };
      },
      dispose: () => host.value.dispose(),
    };
    window.addEventListener('pagehide', () => void host.value.dispose(), { once: true });
  }
} else if (!workspaceMode) {
  if (bootstrapRoot === 'project-bootstrap' && recipeValue === null) {
    (
      globalThis as typeof globalThis & {
        __forgeaxStartup?: { readonly prepare?: () => void };
      }
    ).__forgeaxStartup?.prepare?.();
  }
  if (workspaceGame) await activateWorkspace?.();
  if (!appStarted) app.start().unwrap();
  if (query.has('forgeaxCapture')) {
    document.documentElement.dataset.forgeaxCaptureReady = 'true';
  }
}
}
`;
}
function htmlSource(title, startupScreen = true) {
  return hostStartupDocument(title).replace(
    "  </body>",
    `    <script>${hostStartupScript(startupScreen)}</script>
    <script>
      (() => {
        // This inert marker keeps generated pages inspectable by older hosts
        // that only parse the fatal diagnostic hook.
        const startupFailureText = 'ForgeaX game failed to start.\\n' + 'Unable to start the game.';
        void startupFailureText;
      })();
    </script>
    <script type="module">
      try {
        await import('./main.ts');
      } catch (error) {
        globalThis.__forgeaxStartup?.fail?.(error);
      }
    </script>
  </body>`
  );
}
async function materializeViteDevPort(port) {
  if (port !== 0) return port;
  const reservation = createServer();
  await once(reservation.listen(0, "127.0.0.1"), "listening");
  const address = reservation.address();
  const assigned = typeof address === "object" && address !== null ? address.port : 0;
  await new Promise((resolveClose, rejectClose) => {
    reservation.close((error) => error === void 0 ? resolveClose() : rejectClose(error));
  });
  if (assigned === 0) throw new Error("OS did not assign an ephemeral preview port");
  return assigned;
}
async function buildProject(options = {}, initialSources) {
  const previous = process.cwd();
  try {
    const facts = await readProjectFacts(options.root);
    if (!facts.ok) return facts;
    const base = options.base ?? (options.target === "tauri" ? "./" : "/");
    const outDir = resolve(facts.value.root, options.outDir ?? "dist");
    process.chdir(facts.value.root);
    await build(
      await createViteConfig(facts.value, "build", base, {
        outDir,
        ...initialSources === void 0 ? {} : { initialSources },
        ...options.target === void 0 ? {} : { target: options.target },
        ...options.animation === void 0 ? {} : { animation: options.animation },
        ...options.sourcemap === void 0 ? {} : { sourcemap: options.sourcemap },
        ...options.materialProfile === void 0 ? {} : { materialProfile: options.materialProfile }
      })
    );
    if (options.target === "wechat") await writeWechatProject(facts.value, options, outDir);
    if (options.target === "tauri") await writeTauriProject(facts.value, outDir);
    const manifest = await writeDistManifest(
      facts.value,
      base,
      outDir,
      options.target,
      options.materialProfile
    );
    if (options.target === "wechat") await verifyWechatPackageBudget(outDir);
    return { ok: true, value: manifest };
  } catch (cause) {
    return { ok: false, error: commandError(cause, "game-build-failed") };
  } finally {
    process.chdir(previous);
  }
}
async function startDevProjectWithHost(options = {}, observeInputs) {
  let result;
  let started = false;
  let host;
  try {
    const startupPolicy = await readProjectStartupTimeoutMs(options.root);
    if (!startupPolicy.ok) return startupPolicy;
    host = await createBackendHost({
      startupTimeoutMs: startupPolicy.value === void 0 ? DEV_PREPARATION_TIMEOUT_MS : startupPolicy.value,
      startupPlugins: [
        {
          name: "forgeax:devkit-dev-server",
          async apply(ctx) {
            const facts = await readProjectFacts(options.root);
            if (!facts.ok) {
              result = facts;
              return;
            }
            const previous = process.cwd();
            let changedDirectory = false;
            let server;
            let closed = false;
            const closeServer = async () => {
              if (closed) return;
              closed = true;
              await server?.close();
              if (changedDirectory) process.chdir(previous);
            };
            try {
              const port = resolveProjectPort(options.port);
              const vitePort = {
                ...port,
                host: "127.0.0.1",
                port: await materializeViteDevPort(port.port)
              };
              process.chdir(facts.value.root);
              changedDirectory = true;
              server = await createServer$1(
                await createViteConfig(facts.value, "serve", "/", { server: vitePort })
              );
              const packPlugin = server.config.plugins.find(
                (plugin) => plugin.name === "forgeax:pack"
              );
              await packPlugin?.ready?.();
              ctx.effect(() => closeServer, "devkit/dev-server");
              await server.listen(vitePort.port);
              const projectSession = server.config.plugins.find(
                (plugin) => plugin.name === "forgeax:project-session"
              );
              if (projectSession) observeInputs?.(projectSession.inputPaths());
              if (options.json !== true) server.printUrls();
              result = {
                ok: true,
                value: {
                  root: facts.value.root,
                  urls: server.resolvedUrls,
                  mode: "dev",
                  serves: "source",
                  capabilities: {
                    "rhi.capture": {
                      available: false,
                      realm: "host",
                      reason: "standalone-dev-server-has-no-live-app-cli-attachment"
                    }
                  }
                }
              };
              started = true;
            } catch (cause) {
              await closeServer().catch(() => {
              });
              result = { ok: false, error: commandError(cause, "dev-server-failed") };
            }
          }
        }
      ]
    });
    const finalResult = result ?? {
      ok: false,
      error: {
        code: "dev-server-failed",
        expected: "the DevKit development plugin to publish a result",
        hint: "Inspect the DevKit host startup diagnostics.",
        detail: {}
      }
    };
    if (started) activeDevKitHosts.add(host);
    else await host.dispose();
    return finalResult;
  } catch (cause) {
    await host?.dispose();
    return { ok: false, error: commandError(cause, "dev-server-failed") };
  }
}
async function startPreviewProjectWithHost(options = {}) {
  let result;
  let started = false;
  let host;
  try {
    const startupPolicy = await readProjectStartupTimeoutMs(options.root);
    if (!startupPolicy.ok) return startupPolicy;
    host = await createBackendHost({
      startupTimeoutMs: startupPolicy.value === void 0 ? DEV_PREPARATION_TIMEOUT_MS : startupPolicy.value,
      startupPlugins: [
        {
          name: "forgeax:devkit-preview-server",
          async apply(ctx) {
            const root = resolve(options.root ?? process.cwd());
            const verified = await verifyDist(resolve(root, "dist"));
            if (!verified.ok) {
              result = verified;
              return;
            }
            if (verified.value.target !== void 0 && verified.value.target !== "browser") {
              result = {
                ok: false,
                error: {
                  code: "preview-target-unavailable",
                  expected: "a browser distribution for the HTTP preview server",
                  hint: verified.value.target === "wechat" ? "Open the built WeChat project in WeChat Developer Tools." : "Run the Tauri project in the output directory.",
                  detail: { target: verified.value.target }
                }
              };
              return;
            }
            try {
              const port = resolveProjectPort(options.port);
              const server = await preview({
                root,
                configFile: false,
                base: verified.value.base,
                plugins: [await preparePreviewHttpArtifacts(resolve(root, "dist"), verified.value)],
                preview: {
                  open: false,
                  ...port,
                  headers: {
                    "Cross-Origin-Opener-Policy": "same-origin",
                    "Cross-Origin-Embedder-Policy": "require-corp",
                    "Cross-Origin-Resource-Policy": "cross-origin"
                  }
                },
                build: { outDir: resolve(root, "dist") }
              });
              ctx.effect(() => () => server.close(), "devkit/preview-server");
              if (options.json !== true) server.printUrls();
              result = {
                ok: true,
                value: {
                  root,
                  urls: server.resolvedUrls,
                  mode: "preview",
                  serves: "dist",
                  capabilities: {
                    "rhi.capture": {
                      available: false,
                      realm: "host",
                      reason: "static-dist-host-does-not-install-dev-capture"
                    }
                  }
                }
              };
              started = true;
            } catch (cause) {
              result = { ok: false, error: commandError(cause, "preview-server-failed") };
            }
          }
        }
      ]
    });
    const finalResult = result ?? {
      ok: false,
      error: {
        code: "preview-server-failed",
        expected: "the DevKit preview plugin to publish a result",
        hint: "Inspect the DevKit host startup diagnostics.",
        detail: {}
      }
    };
    if (started) activeDevKitHosts.add(host);
    else await host.dispose();
    return finalResult;
  } catch (cause) {
    await host?.dispose();
    return { ok: false, error: commandError(cause, "preview-server-failed") };
  }
}
var projectRebuilds = /* @__PURE__ */ new WeakMap();
async function createViteConfig(facts, command, base = "/", options = {}) {
  if (options.materialProfile !== void 0 && options.target === "wechat")
    throw new Error("webgpu-storage validation builds require a desktop WebGPU target");
  const animation = options.animation === void 0 ? environmentAnimationPlayback() : animationPlayback(options.animation);
  const startedAt = performance.now();
  let previousAt = startedAt;
  const timing = (stage) => {
    const game = options.host?.workspace?.execution === "game";
    const build = command === "build" && process.env.FORGEAX_BUILD_PROGRESS === "1";
    if (!game && !build && (process.env.FORGEAX_WORKSPACE_TIMING !== "1" || !options.host?.workspace))
      return;
    const now = performance.now();
    console.error(
      build ? "[forgeax.build]" : game ? "[forgeax.play]" : "[forgeax.vite-config.timing]",
      JSON.stringify({
        root: facts.root,
        targetId: options.host?.workspace?.targetId,
        execution: game ? "game" : "preview",
        stage,
        totalMs: Math.round(now - startedAt),
        stageMs: Math.round(now - previousAt)
      })
    );
    previousAt = now;
  };
  const bootstrapRoot = options.bootstrapRoot ?? "project-bootstrap";
  const hasPluginRoots = facts.roots.engine !== void 0 || facts.roots.frontend !== void 0;
  const producerReadiness = process.env.FORGEAX_DEV_PACK_READINESS === "on-demand" && !hasPluginRoots ? "on-demand" : void 0;
  if (options.host !== void 0 && (command !== "serve" || bootstrapRoot !== "project-bootstrap")) {
    hostBindingError("host binding requires a main-thread project development server");
  }
  if (options.host) {
    validateHostBinding(options.host);
    const externalRoot = (options.host.frontendAssembly ?? options.host.backend.assembly.current).root;
    const workspacePreview = options.host.workspace && options.host.workspace.execution !== "game";
    if (!workspacePreview && options.host.workspace?.execution !== "game" && externalRoot && facts.roots.frontend)
      hostBindingError("compose external and project frontend roots explicitly before binding");
    await options.host.backend.context.get("devkitBackend")?.assertCurrent();
  }
  const canonicalKit = await resolveCanonicalKit();
  timing("canonical-kit");
  const generatedBase = resolve(facts.root, ".forgeax", "generated");
  await mkdir(generatedBase, { recursive: true });
  const generated = command === "serve" ? await mkdtemp(resolve(generatedBase, "serve-")) : generatedBase;
  let disposePreparation;
  try {
    const realProjectRoot = await realpath(facts.root);
    const realGeneratedRoot = await realpath(generated);
    const projectRoots = facts.assetRoots.map((root) => resolve(facts.root, root));
    const workspacePreview = options.host?.workspace !== void 0 && options.host.workspace.execution !== "game";
    const failedSources = /* @__PURE__ */ new Set();
    const ignoreSource = bootstrapRoot === "resource-bootstrap" ? isResourcePreviewIgnoredPath : isProjectSourceIgnoredPath;
    const ignorePath = (path) => ignoreSource(path) || failedSources.has(path);
    if (options.initialSources !== void 0)
      await assertPluginSourceInputs(options.initialSources, facts.root);
    const sourceSnapshot = options.initialSources?.sourceSnapshot ?? createScriptablePackSourceSnapshot();
    timing("project-inventory-start");
    const [scanned, engineWorkspaceResolver] = await Promise.all([
      scanInventory(projectRoots, {
        ignorePath: (path) => isPluginAssetSourceIgnoredPath(facts.root, path),
        scriptablePack: { metadataOnly: true, sourceSnapshot },
        ...command === "serve" && workspacePreview ? {
          onSourceFailure: (path, error) => {
            failedSources.add(path);
            process.stderr.write(`[pack-source] ${JSON.stringify({ path, error })}
`);
          }
        } : {}
      }),
      createEngineWorkspaceResolver(facts.root)
    ]);
    timing("project-inventory-and-engine-resolver");
    if (!scanned.ok) throw scanned.error;
    const inventory = {
      declarations: new Map([...scanned.value.declarations].filter(([path]) => !ignorePath(path)))
    };
    const builtinPack = await prepareBuiltinPack(inventory, generated);
    timing("builtin-pack");
    const textureViewRoot = canonicalKit !== void 0 && (workspacePreview || bootstrapRoot === "resource-bootstrap") ? resolve(canonicalKit.root, "..", "..", "dist", "texture-view") : void 0;
    const materialPackages = [
      ...await discoverMaterialPackages(inventory),
      ...textureViewRoot === void 0 ? [] : ["2d", "2d-array", "3d"].map(
        (dimension) => resolve(textureViewRoot, `${dimension}.pack.json`)
      )
    ];
    timing("material-packages");
    const roots = [
      ...projectRoots,
      ...builtinPack === void 0 ? [] : [builtinPack],
      ...canonicalKit === void 0 ? [] : [canonicalKit.root]
    ];
    const builtinCookers = [
      createMaterialPackCooker(
        roots,
        options.materialProfile === void 0 ? {} : { profile: options.materialProfile }
      ),
      createParticleCodeNativeCookerFromRoots(roots)
    ];
    const outputVersions = createStandardAssetOutputProducerRegistry(
      [...scanned.value.declarations.values()].flatMap(
        (declaration) => declaration.format === "pack.ts" ? projectScriptablePackSceneComponents(declaration.definition.sceneComponents) : []
      )
    ).versions();
    const productCache = await createScriptablePackProductCache({
      root: devKitDdcRoots(facts.root).buildCacheRoot,
      outputVersions,
      cookers: builtinCookers
    });
    timing("plugin-assets-start");
    const sourceInventory = options.initialSources ?? await discoverPluginAssets(facts, scanned.value, sourceSnapshot, productCache);
    const shaderPaths = await sourceSnapshot.observePaths(
      facts.root,
      () => listMaterialSourcePaths(projectRoots)
    );
    for (const path of shaderPaths) await sourceSnapshot.digest(path);
    timing("plugin-assets");
    const toolProjection = await projectToolProjection(facts.root, sourceInventory);
    timing("tool-projection");
    const projectTools = toolProjection.tools;
    const projectAssembly = createHostAssembly({
      sessionGeneration: options.sessionGeneration ?? 1
    });
    const assembly = options.host && options.host.workspace?.execution !== "game" ? composeBoundHostAssembly(options.host, projectAssembly) : projectAssembly;
    const selectedAliases = await hostEngineAliases(facts.root, options.host);
    const consumerAliases = selectedAliases.length ? selectedAliases : await consumerEngineAliases(facts.root);
    timing("consumer-aliases");
    const frontendAlias = await hostFrontendModuleAlias(options.host);
    timing("frontend-alias");
    const cookerSession = await loadProjectCookers(
      facts,
      builtinCookers,
      {
        resolve: {
          alias: consumerAliases,
          dedupe: consumerAliases.length ? consumerAliases.map((alias) => alias.find) : ["@forgeax/engine"]
        },
        plugins: engineWorkspaceResolver === void 0 ? [] : [engineWorkspaceResolver]
      },
      { inventory: sourceInventory }
    );
    timing("project-cookers");
    disposePreparation = () => cookerSession.dispose();
    const ssrIdentity = projectSsrIdentity(facts, sourceInventory, {
      command,
      base,
      bootstrapRoot,
      sessionGeneration: assembly.sessionGeneration,
      animation,
      appOptions: cookerSession.appOptions
    });
    await Promise.all([
      ...command === "serve" ? [
        writeFile(
          resolve(generated, "preview-batch.html"),
          '<!doctype html><html><body><canvas></canvas><script type="module" src="./preview-batch.ts"></script></body></html>'
        ),
        writeFile(resolve(generated, "preview-batch.ts"), previewBatchEntrySource())
      ] : [],
      ...cookerSession.appOptions.pipelineLibrary === void 0 ? [] : [
        writeFile(
          resolve(generated, "pipeline-library.json"),
          JSON.stringify(cookerSession.appOptions.pipelineLibrary)
        )
      ],
      writeFile(
        resolve(generated, "index.html"),
        htmlSource(facts.name, bootstrapRoot === "project-bootstrap")
      ),
      writeFile(
        resolve(generated, "main.ts"),
        hostSource(
          facts,
          bootstrapRoot,
          canonicalKit?.guid,
          options.host,
          process.env.FORGEAX_ENGINE_RHI_DEBUG === "1",
          command === "serve",
          assembly,
          ssrIdentity,
          command === "serve" && process.env.FORGEAX_PREVIEW_RHI_WINDOW === "1",
          animation,
          options.target,
          cookerSession.appOptions,
          options.materialProfile
        )
      ),
      writeFile(
        resolve(generated, "runtime-packs.ts"),
        options.target === "tauri" ? `${await staticPackProgramsSource(facts, sourceInventory)}
import type { RuntimePackOptions } from '@forgeax/engine/app';
export async function createRuntimePackOptions(scopeId: string): Promise<RuntimePackOptions> {
  return { scopeId, imports, programHost };
}
` : runtimePacksSource
      ),
      writeFile(resolve(generated, "game-vfx.ts"), gameVfxSource),
      writeFile(
        resolve(generated, "execution-bootstrap.ts"),
        executionBootstrapSource(
          bootstrapRoot,
          assembly.sessionGeneration,
          ssrIdentity,
          options.target,
          cookerSession.appOptions
        )
      )
    ]);
    timing("generated-files");
    const wechat = options.target === "wechat" ? await prepareWechatBuild(facts, generated, sourceInventory, cookerSession.appOptions) : void 0;
    const projectInputPaths = new Set(
      ["forge.json", "package.json", "pnpm-lock.yaml", "bun.lock", "package-lock.json"].map(
        (file) => resolve(realProjectRoot, file)
      )
    );
    const projectWatchPaths = [
      .../* @__PURE__ */ new Set([...roots, ...sourceInventory.sourceInputs.keys(), ...projectInputPaths])
    ].filter((path) => existsSync(path) && !isFilesystemPathWithin(generated, path));
    const engineWorkspaceRoot = findEngineWorkspaceRoot();
    const runtimeBinding = createStandaloneRuntimeAssetBinding(facts.id);
    let sessionClosed = false;
    const builtinImporterKeys = new Set(DEFAULT_IMPORTERS.map((importer) => importer.key));
    for (const importer of cookerSession.importers)
      if (builtinImporterKeys.has(importer.key))
        throw new TypeError(`duplicate builtin/project importer ${importer.key}`);
    let initialSourceSnapshot = sourceSnapshot;
    const pack = pluginPack({
      roots,
      takeInitialSourceSnapshot: () => {
        const taken = initialSourceSnapshot;
        initialSourceSnapshot = void 0;
        return taken;
      },
      runtimeBinding,
      // The catalog is consumed by project tools and editors, regardless of
      // where this DevKit package or Vite's generated entry lives. Keep
      // project assets rooted in the authored project; external dependencies
      // retain their physical identity and the Pack fallback policy.
      sourceIdentityFor: (sourcePath) => filesystemPathRelative(facts.root, sourcePath, false) ?? sourcePath,
      ...producerReadiness === void 0 ? {} : { producerReadiness },
      ddc: devKitDdcRoots(facts.root),
      watch: false,
      importers: [...DEFAULT_IMPORTERS, ...cookerSession.importers],
      cookers: cookerSession.cookers,
      ignorePath
    });
    const generatedServers = /* @__PURE__ */ new Set();
    let injectedWatchDependencies = [];
    let previewProducer;
    const plugins = [
      ...command === "serve" ? [
        {
          name: "forgeax:preview-inputs",
          configureServer(server) {
            server.middlewares.use("/__forgeax/preview-inputs", (_request, response) => {
              previewProducer ??= previewProducerIdentity();
              void previewProducer.then(
                (producer) => {
                  response.setHeader("Content-Type", "application/json");
                  response.setHeader("Cache-Control", "no-store");
                  response.end(
                    JSON.stringify({
                      producer,
                      catalog: encodeCatalogWire(pack.catalogSnapshot())
                    })
                  );
                },
                (cause) => {
                  response.statusCode = 500;
                  response.end(JSON.stringify({ error: String(cause) }));
                }
              );
            });
          }
        }
      ] : [],
      ...wechat === void 0 ? [] : [wechat.plugin],
      ...command === "serve" ? [
        {
          name: "forgeax:project-source-watch",
          enforce: "pre",
          configResolved(config) {
            const existing = new Set(config.configFileDependencies);
            injectedWatchDependencies = projectWatchPaths.filter((path) => !existing.has(path));
            config.configFileDependencies.push(...injectedWatchDependencies);
          },
          configureServer(server) {
            const temporary = new Set(injectedWatchDependencies);
            const dependencies = server.config.configFileDependencies;
            for (let index = dependencies.length - 1; index >= 0; index--)
              if (temporary.has(dependencies[index] ?? "")) dependencies.splice(index, 1);
            injectedWatchDependencies = [];
          }
        }
      ] : [],
      executionWorkerEntries(void 0, wechat === void 0 ? "browser" : "native"),
      ...command === "serve" ? [
        {
          name: "forgeax:generated-host-owner",
          configureServer(server) {
            generatedServers.add(server);
            const close = server.close.bind(server);
            server.close = async () => {
              try {
                await close();
              } finally {
                for (const environment of Object.values(server.environments))
                  environment.moduleGraph.invalidateAll();
                if (generatedServers.delete(server) && generatedServers.size === 0) {
                  await rm(generated, { recursive: true, force: true });
                }
              }
            };
          }
        }
      ] : [],
      ...engineWorkspaceResolver === void 0 ? [] : [engineWorkspaceResolver],
      ...command === "serve" && (process.env.FORGEAX_ENGINE_RHI_DEBUG === "1" || process.env.FORGEAX_PREVIEW_RHI_WINDOW === "1") ? [
        {
          ...vitePluginRhiDebug({
            rootDir: process.env.FORGEAX_PREVIEW_RHI_WINDOW === "1" && process.env.FORGEAX_ENGINE_RHI_DEBUG !== "1" ? process.env.FORGEAX_EVIDENCE_DIR ?? facts.root : facts.root
          }),
          ...process.env.FORGEAX_ENGINE_RHI_DEBUG === "1" ? {} : {
            config: () => ({
              define: { "import.meta.env.FORGEAX_ENGINE_RHI_DEBUG": JSON.stringify("0") }
            })
          }
        }
      ] : [],
      forgeaxShader({ materialPackages }),
      pack,
      ...command === "serve" ? [
        devKitHostBridge(options.host, async () => {
          await pack.ready();
          timing("pack-ready");
          const inventory2 = await publishedPluginInventory(facts.root, sourceInventory, pack);
          timing("published-plugin-inventory");
          const root = bootstrapRoot === "resource-bootstrap" || workspacePreview || !facts.roots.frontend ? void 0 : inventory2.assets.get(facts.roots.frontend);
          if (facts.roots.frontend && bootstrapRoot !== "resource-bootstrap" && !workspacePreview && !root)
            throw new Error(`host root ${facts.roots.frontend} has no published definition`);
          return createHostAssembly({
            ...assembly,
            ...root ? { root: pluginRootDescriptor(root.definition) } : {}
          });
        })
      ] : [],
      pluginRuntimeProjection(facts.root, sourceInventory.sourceInputs),
      pluginProgramsBuild({
        ...wechat === void 0 ? {} : { delivery: "native" },
        projectRoot: facts.root,
        tools: projectTools,
        roots: bootstrapRoot === "resource-bootstrap" || workspacePreview ? {} : facts.roots,
        inventory: () => publishedPluginInventory(facts.root, sourceInventory, pack),
        binding: runtimeBinding,
        pack
      }),
      {
        name: "forgeax:project-session",
        ...{
          inputPaths: () => [
            .../* @__PURE__ */ new Set([
              ...sourceInventory.sourceSnapshot.paths,
              ...sourceInventory.filesystemInputs === void 0 ? [] : [realProjectRoot],
              ...cookerSession.watchFiles,
              ...projectInputPaths
            ])
          ].filter(
            (path) => !isFilesystemPathWithin(generated, path) && !isFilesystemPathWithin(realGeneratedRoot, path)
          ).sort()
        },
        generateBundle() {
          if (command !== "build" || (options.target ?? "browser") !== "browser" || this.environment.name !== "client" || cookerSession.delivery.bundles === void 0)
            return;
          this.emitFile({
            type: "asset",
            fileName: PLAYER_DELIVERY_FILE,
            source: JSON.stringify(cookerSession.delivery)
          });
        },
        async closeBundle() {
          sessionClosed = true;
          await cookerSession.dispose();
        },
        async hotUpdate(context) {
          const environment = this.environment;
          if (environment.name !== "client") return [];
          const sourcePath = resolve(context.file);
          const authoringSource = await options.host?.authoringSourceChanged?.(sourcePath);
          if (sourcePath.startsWith(`${generated}${sep}`)) return [];
          if (relative(facts.root, sourcePath).split(sep).includes(".forgeax")) return [];
          const definitions = /* @__PURE__ */ new Set([
            ...[...sourceInventory.assets.values()].flatMap((record) => [
              record.sourcePath,
              record.module
            ]),
            ...cookerSession.watchFiles,
            ...projectTools.flatMap((tool) => [
              tool.moduleName,
              ...tool.executor ? [tool.executor] : []
            ])
          ]);
          const underRoot = roots.some((root) => sourcePath.startsWith(`${root}${sep}`));
          const assetSource = underRoot && !definitions.has(sourcePath) && (inventory.declarations.has(sourcePath) || !sourceInventory.sourceInputs.has(sourcePath));
          const capturedRevision = assetSource || authoringSource ? void 0 : sourceInventory.sourceInputs.get(sourcePath);
          if (capturedRevision !== void 0) {
            try {
              const currentRevision = `sha256:${createHash("sha256").update(await readFile(context.file)).digest("hex")}`;
              if (currentRevision === capturedRevision) return [];
            } catch (cause) {
              if (cause.code !== "ENOENT") throw cause;
            }
          }
          const visited = /* @__PURE__ */ new Set();
          const belongsToPlugin = (module) => {
            if (visited.has(module)) return false;
            visited.add(module);
            if (module.file && definitions.has(module.file)) return true;
            return [...module.importers].some(belongsToPlugin);
          };
          const changedModules = context.server.moduleGraph.getModulesByFile(context.file);
          const projectInput = projectInputPaths.has(sourcePath);
          const sessionSource = projectInput || !assetSource && sourceInventory.sourceInputs.has(sourcePath) || definitions.has(sourcePath) || [...changedModules ?? []].some(belongsToPlugin);
          if (options.host?.frontendModule && !authoringSource && !assetSource && (sessionSource || (changedModules?.size ?? 0) > 0))
            hostBindingError(
              `external frontend modules are immutable; source changed: ${sourcePath}; supply a new revision/binding and replace the page`
            );
          if (!authoringSource && !sessionSource && !underRoot) return;
          if (authoringSource || !sessionSource && underRoot) {
            void pack.rebuildCatalogInPlace([sourcePath]).then((published) => {
              if (!published) return;
              try {
                options.host?.backend.context.get("engineWorkspaceCatalog")?.notePublished();
              } catch {
              }
            }).catch((cause) => {
              const error = cause instanceof Error ? cause : new Error(String(cause));
              context.server.config.logger.error(error.message);
            });
            return [];
          }
          let queue = projectRebuilds.get(context.server);
          if (!queue) {
            queue = { tail: Promise.resolve(), generation: assembly.sessionGeneration };
            projectRebuilds.set(context.server, queue);
          }
          const owner = queue;
          let replacementStarted = false;
          const next = owner.tail.catch(() => {
          }).then(async () => {
            await new Promise((resolve7) => setTimeout(resolve7, 0));
            if (sessionClosed) return;
            const generation = owner.generation + 1;
            const prepareReplacement = async () => {
              const facts2 = await readProjectFacts(realProjectRoot);
              if (!facts2.ok) throw facts2.error;
              await options.host?.backend.context.get("devkitBackend")?.assertCurrent();
              const validated = await discoverPluginAssets(facts2.value);
              const candidate = await createViteConfig(facts2.value, "build", base, {
                sessionGeneration: generation
              });
              await build({ ...candidate, build: { ...candidate.build, write: false } });
              if (sessionClosed) return void 0;
              await assertPluginSourceInputs(validated, facts2.value.root);
              const config2 = await createViteConfig(facts2.value, "serve", base, {
                ...options,
                sessionGeneration: generation
              });
              try {
                if (sessionClosed)
                  throw new Error("project session closed during candidate preparation");
                await assertPluginSourceInputs(validated, facts2.value.root);
              } catch (cause) {
                const owner2 = config2.plugins?.flat().find(
                  (plugin) => plugin && typeof plugin === "object" && "name" in plugin && plugin.name === "forgeax:project-session"
                );
                if (typeof owner2?.closeBundle === "function")
                  await owner2.closeBundle.call({});
                if (typeof config2.root === "string")
                  await rm(config2.root, { recursive: true, force: true });
                throw cause;
              }
              return config2;
            };
            let config;
            try {
              config = await prepareReplacement();
            } catch (cause) {
              const error = commandError(cause, "project-rebuild-failed");
              const sourceCause = error.detail.cause;
              if (error.code !== "plugin-bootstrap-failed" || sourceCause === null || typeof sourceCause !== "object" || !("reason" in sourceCause) || sourceCause.reason !== "source changed during plugin compilation")
                throw cause;
              if (sessionClosed) return;
              config = await prepareReplacement();
            }
            if (config === void 0 || sessionClosed) return;
            const bridge = context.server.config.plugins.find(
              (plugin) => plugin.name === "forgeax:devkit-backend-host"
            );
            replacementStarted = true;
            await bridge?.releaseForRestart();
            config.server = { ...context.server.config.inlineConfig.server, ...config.server };
            Object.assign(context.server.config.inlineConfig, config);
            await context.server.restart();
            if (resolve(context.server.config.root) !== resolve(config.root ?? realProjectRoot))
              throw new Error("project session replacement failed; start a fresh server");
            owner.generation = generation;
          });
          owner.tail = next;
          void next.catch((cause) => {
            if (sessionClosed && !replacementStarted) return;
            const error = cause instanceof Error ? cause : new Error(JSON.stringify(cause));
            context.server.config.logger.error(error.message);
            environment.hot.send({
              type: "error",
              err: { name: error.name, message: error.message, stack: error.stack ?? "" }
            });
          });
          return [];
        }
      }
    ];
    if (options.host?.workspace?.execution === "game" || process.env.FORGEAX_WORKSPACE_TIMING === "1" && options.host?.workspace) {
      plugins.unshift({
        name: "forgeax:workspace-vite-timing-start",
        configResolved() {
          timing("vite-config-resolved");
        },
        configureServer() {
          timing("vite-configure-server-start");
        }
      });
      plugins.push({
        name: "forgeax:workspace-vite-timing-end",
        configureServer() {
          timing("vite-configure-server-end");
        }
      });
    }
    return {
      root: generated,
      logLevel: "warn",
      customLogger: createLogger("warn", {
        allowClearScreen: false,
        console: new Console({ stdout: process.stderr, stderr: process.stderr })
      }),
      base,
      configFile: false,
      publicDir: false,
      define: { "import.meta.env.DEV": JSON.stringify(command === "serve") },
      plugins,
      worker: {
        // Vite builds each nested Worker with a separate plugin graph and conditions.
        plugins: () => [createEngineWorkspaceResolver(facts.root)]
      },
      resolve: {
        ...wechat ? { conditions: ["forgeax-native", "module", "browser", "development|production"] } : {},
        alias: [...frontendAlias === void 0 ? [] : [frontendAlias], ...consumerAliases],
        dedupe: consumerAliases.length ? consumerAliases.map((alias) => alias.find) : ["@forgeax/engine"]
      },
      server: {
        ...options.server,
        // FSEventStreamStop can block the macOS event loop during backend disposal.
        ...process.platform === "darwin" ? { watch: { useFsEvents: false } } : {},
        headers: {
          "Cross-Origin-Opener-Policy": "same-origin",
          "Cross-Origin-Embedder-Policy": "require-corp",
          "Cross-Origin-Resource-Policy": "cross-origin"
        },
        fs: {
          allow: [
            facts.root,
            realProjectRoot,
            generated,
            realGeneratedRoot,
            ...roots,
            ...engineWorkspaceRoot === void 0 ? [] : [engineWorkspaceRoot],
            ...frontendAlias === void 0 ? [] : [dirname(frontendAlias.replacement)]
          ]
        }
      },
      build: {
        // Syntax capabilities only: lower optional chains/class fields but keep native BigInt.
        target: wechat ? "chrome70" : "esnext",
        sourcemap: options.sourcemap ?? false,
        outDir: options.outDir ?? resolve(facts.root, "dist"),
        emptyOutDir: true,
        modulePreload: false,
        rollupOptions: {
          // Portable plugin entries declare strict signatures individually.
          preserveEntrySignatures: wechat ? "strict" : "allow-extension",
          input: wechat ? { game: wechat.entry } : {
            index: resolve(realGeneratedRoot, "index.html"),
            "execution-bootstrap": resolve(realGeneratedRoot, "execution-bootstrap.ts")
          },
          output: {
            ...wechat ? { format: "cjs", chunkFileNames: "assets/[name]-[hash].js" } : {},
            entryFileNames: (chunk) => wechat ? "game.js" : chunk.name === "execution-bootstrap" ? "assets/execution-bootstrap.js" : "assets/[name]-[hash].js"
          }
        }
      }
    };
  } catch (cause) {
    const failures = [cause];
    try {
      await disposePreparation?.();
    } catch (error) {
      failures.push(error);
    }
    if (command === "serve") {
      try {
        await rm(generated, { recursive: true, force: true });
      } catch (error) {
        failures.push(error);
      }
    }
    throw failures.length === 1 ? cause : new AggregateError(failures, "Project preparation and cleanup failed");
  }
}

export { DEFAULT_IMPORTERS, buildProject, createEngineWorkspaceResolverForProject, createViteConfig, devKitDdcRoots, devKitHostBridge, disposeDevKitHosts, hostBindingError, ignoreDevKitCatalogPath, materializeViteDevPort, preparePlayerDist, startDevProjectWithHost, startPreviewProjectWithHost };
//# sourceMappingURL=chunk-O7QEAHSA.mjs.map
//# sourceMappingURL=chunk-O7QEAHSA.mjs.map