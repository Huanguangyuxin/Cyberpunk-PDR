#!/usr/bin/env node
import { hostBindingError, createViteConfig, materializeViteDevPort } from './chunk-O7QEAHSA.mjs';
import { assetInspectCommand } from './chunk-62ITDDCW.mjs';
import { readProjectFacts, commandError } from './chunk-VNP4GISC.mjs';
import { spawn } from 'child_process';
import { randomUUID, createHash } from 'crypto';
import { once } from 'events';
import { access, stat, mkdir, writeFile, realpath, readFile } from 'fs/promises';
import { createServer as createServer$1 } from 'net';
import { join, resolve, dirname, relative, sep } from 'path';
import { pathToFileURL } from 'url';
import { createEngineWorkspaceProvider, FORGEAX_FRAME_SUBMITTED_DATASET, engineWorkspaceResultService, ENGINE_WORKSPACE_COMMAND_TOPIC, createAssetRuntimeAssembly } from '@forgeax/engine-app';
import { parseImage } from '@forgeax/engine-image/parse-image';
import { chromium } from 'playwright';
import { AssetRegistry, retainAssetPublications, createCatalogSource } from '@forgeax/engine-assets-runtime';
import { createBackendHost } from '@forgeax/engine-host/backend';
import { encodePackData, preparePackProgram } from '@forgeax/engine-pack/runtime';
import { AssetGuid, definePackageId, applyPackParameterBindings, packGenerationValues, PACK_DRAFT_CHANGED_TOPIC } from '@forgeax/engine-pack/source';
import { createDevImportTransport } from '@forgeax/engine-runtime';
import { createServer } from 'vite';
import { readPackAuthoringDeclaration, projectPackGenerationModules, createFileSystemPackDrafts } from '@forgeax/engine-pack/build';
import { ok, err } from '@forgeax/engine-types';
import ts from 'typescript';
import { prepareRuntimePackContent } from '@forgeax/engine-import';
import { createScriptablePackSourceSnapshot, loadScriptablePack } from '@forgeax/engine-pack/source-node';
import { Camera, DirectionalLight, PointLight, SpotLight, MeshFilter, MeshRenderer } from '@forgeax/engine-render';
import { Name, Transform, sceneFieldWritable } from '@forgeax/engine-scene';

// src/tools/display-carrier.ts
function assertBrowserCarrierTarget(target) {
  if (target === null || typeof target !== "object" || typeof target.leaseId !== "string" || target.leaseId.length === 0 || typeof target.targetId !== "string" || target.targetId.length === 0 || typeof target.kind !== "string" || target.kind.length === 0 || typeof target.surfaceId !== "string" || !/^[_A-Za-z][_A-Za-z0-9-]*$/.test(target.surfaceId))
    throw new TypeError("browser carrier target identity and surfaceId must be valid");
  if (target.run === null || typeof target.run !== "object" || typeof target.run.serviceId !== "string" || target.run.serviceId.length === 0 || typeof target.run.runId !== "string" || target.run.runId.length === 0)
    throw new TypeError("browser carrier run identity must be non-empty");
  if (!Number.isSafeInteger(target.generation) || target.generation < 0)
    throw new TypeError("browser carrier target generation must be non-negative");
  if (!Number.isSafeInteger(target.width) || target.width <= 0)
    throw new TypeError("browser carrier target width must be positive");
  if (!Number.isSafeInteger(target.height) || target.height <= 0)
    throw new TypeError("browser carrier target height must be positive");
  if (target.gpu !== "auto" && target.gpu !== "hardware" && target.gpu !== "software")
    throw new TypeError("browser carrier target GPU mode is invalid");
  return target;
}
function assertBrowserCarrierTargetMatch(expected, actual) {
  assertBrowserCarrierTarget(expected);
  assertBrowserCarrierTarget(actual);
  if (expected.leaseId !== actual.leaseId || expected.targetId !== actual.targetId || expected.kind !== actual.kind || expected.surfaceId !== actual.surfaceId || expected.run.serviceId !== actual.run.serviceId || expected.run.runId !== actual.run.runId || expected.generation !== actual.generation) {
    throw new TypeError("browser carrier attachment target does not match its selection");
  }
  return actual;
}
function assertBrowserCarrierTargetForRequest(request, target) {
  assertBrowserCarrierTarget(target);
  if (request.run.serviceId !== target.run.serviceId || request.run.runId !== target.run.runId || request.generation !== target.generation) {
    throw new TypeError("browser carrier target does not match the requesting run generation");
  }
  if (request.gpu === "hardware" && target.gpu !== "hardware" || request.gpu === "software" && target.gpu !== "software") {
    throw new TypeError("browser carrier target does not satisfy the requested GPU mode");
  }
  return target;
}
function hasExecutionMethods(value) {
  return value !== null && typeof value === "object" && typeof Reflect.get(value, "goto") === "function" && typeof Reflect.get(value, "evaluate") === "function" && typeof Reflect.get(value, "locator") === "function" && typeof Reflect.get(value, "waitForFunction") === "function" && typeof Reflect.get(value, "waitForTimeout") === "function";
}
function assertBrowserCarrierAttachment(attachment) {
  if (attachment === null || typeof attachment !== "object") {
    throw new TypeError("browser carrier attachment must be an object");
  }
  if (!hasExecutionMethods(attachment.page) || typeof attachment.close !== "function") {
    throw new TypeError("browser carrier attachment owner page or close handle is invalid");
  }
  const execution = attachment.execution;
  if (execution === null || typeof execution !== "object") {
    throw new TypeError("browser carrier attachment execution realm is required");
  }
  if (execution.ownerPage !== attachment.page || !hasExecutionMethods(execution.realm)) {
    throw new TypeError("browser carrier execution realm is not owned by its attachment page");
  }
  if (execution.kind === "page") {
    if (execution.realm !== attachment.page) {
      throw new TypeError("browser carrier page execution must use its owner page");
    }
  } else if (execution.kind === "frame") {
    if (typeof execution.realm.page !== "function" || execution.realm.page() !== attachment.page) {
      throw new TypeError("browser carrier frame execution must belong to its owner page");
    }
    if (!/^#[A-Za-z_][A-Za-z0-9_-]*$/.test(execution.surfaceSelector)) {
      throw new TypeError("browser carrier frame surfaceSelector must be a stable id selector");
    }
    if (execution.surfaceSelector !== `#${attachment.target.surfaceId}`) {
      throw new TypeError(
        "browser carrier frame surfaceSelector does not match its target surfaceId"
      );
    }
  } else {
    throw new TypeError("browser carrier execution kind is invalid");
  }
  return attachment;
}
async function assertBrowserCarrierSurface(attachment) {
  const execution = attachment.execution;
  if (execution.kind !== "frame") return;
  const locator = attachment.page.locator(execution.surfaceSelector);
  if (await locator.count() !== 1) {
    throw new TypeError("browser carrier frame surface must resolve to exactly one element");
  }
  const handle = await locator.elementHandle();
  if (handle === null) throw new TypeError("browser carrier frame surface element is unavailable");
  try {
    const identity = await handle.evaluate((element) => ({
      tagName: element.tagName,
      id: element.id
    }));
    if (identity.tagName !== "IFRAME") {
      throw new TypeError("browser carrier frame surface must be an iframe");
    }
    if (identity.id !== attachment.target.surfaceId) {
      throw new TypeError("browser carrier frame surface identity does not match its target");
    }
    if (await handle.contentFrame() !== execution.realm) {
      throw new TypeError("browser carrier frame surface does not own its execution realm");
    }
  } finally {
    await handle.dispose().catch(() => void 0);
  }
}
function throwIfBrowserCarrierAborted(signal) {
  if (!signal?.aborted) return;
  const reason = signal.reason;
  if (reason !== void 0) throw reason;
  const error = new Error("The browser carrier request was aborted");
  error.name = "AbortError";
  throw error;
}
async function acquireBrowserCarrierPage(carrier, request, options = {}) {
  const releaseReason = options.releaseReason ?? "engine-carrier-attach-failed";
  throwIfBrowserCarrierAborted(options.signal);
  const selection = await carrier.select(request, {
    ...options.signal === void 0 ? {} : { signal: options.signal }
  });
  if (options.signal?.aborted) {
    if (selection.carrier === "borrowed")
      await selection.release(releaseReason).catch(() => void 0);
    throwIfBrowserCarrierAborted(options.signal);
  }
  if (selection.carrier === "private-browser") return { fallbackReason: selection.fallbackReason };
  let attachmentClosed = false;
  let attached;
  try {
    assertBrowserCarrierTargetForRequest(request, selection.target);
    attached = assertBrowserCarrierAttachment(
      await carrier.attach(selection, {
        ...options.signal === void 0 ? {} : { signal: options.signal }
      })
    );
    if (options.signal?.aborted) {
      try {
        await attached.close(releaseReason);
        attachmentClosed = true;
      } catch {
      }
      throwIfBrowserCarrierAborted(options.signal);
    }
    assertBrowserCarrierTargetMatch(selection.target, attached.target);
    await assertBrowserCarrierSurface(attached);
    return { attachment: attached };
  } catch (error) {
    if (attached !== void 0 && !attachmentClosed) {
      try {
        await attached.close(releaseReason);
        attachmentClosed = true;
      } catch {
      }
    }
    if (!attachmentClosed) await selection.release(releaseReason).catch(() => void 0);
    throw error;
  }
}
function outputPath(path) {
  return path.replace(/\.mts$/, ".mjs").replace(/\.ts$/, ".js");
}
function preparePackProgramSource(input) {
  if (!input || typeof input.entry !== "string" || typeof input.export !== "string" || !input.modules || typeof input.modules !== "object" || Object.values(input.modules).some((source) => typeof source !== "string"))
    return err({
      code: "pack-program-invalid",
      expected: "an entry and text source modules",
      hint: "repair the program source record",
      detail: { module: "", reason: "malformed program source" }
    });
  const modules = {};
  let sources = input.modules;
  for (const [filename, source] of Object.entries(sources)) {
    const declaration = readPackAuthoringDeclaration(filename, source);
    if (declaration.ok && declaration.value.parameters.some((parameter) => typeof parameter.apply === "object")) {
      try {
        sources = projectPackGenerationModules(filename, sources, declaration.value);
        break;
      } catch (cause) {
        return err({
          code: "pack-program-invalid",
          expected: "isolated live Pack generation modules",
          hint: "remove source self-reading and use declared dependencies",
          detail: { module: filename, reason: JSON.stringify(cause) }
        });
      }
    }
  }
  for (const [filename, source] of Object.entries(sources)) {
    const target = outputPath(filename);
    if (Object.hasOwn(modules, target))
      return err({
        code: "pack-program-invalid",
        expected: "unique emitted module paths",
        hint: "rename the colliding source module before preparing this program",
        detail: { module: filename, reason: `duplicate output ${target}` }
      });
    if (!/\.(?:ts|mts)$/.test(filename)) {
      modules[target] = source;
      continue;
    }
    const transformed = ts.transpileModule(source, {
      fileName: filename,
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        rewriteRelativeImportExtensions: true,
        verbatimModuleSyntax: true
      },
      reportDiagnostics: true
    });
    const errors = transformed.diagnostics?.filter((item) => item.category === ts.DiagnosticCategory.Error) ?? [];
    if (errors.length)
      return err({
        code: "pack-program-invalid",
        expected: "TypeScript source that converts to target JavaScript",
        hint: "repair the source diagnostics and prepare the program again",
        detail: {
          module: filename,
          reason: errors.map((item) => ts.flattenDiagnosticMessageText(item.messageText, "\n")).join("\n")
        }
      });
    modules[target] = transformed.outputText;
  }
  return preparePackProgram({ ...input, entry: outputPath(input.entry), modules });
}
function prepareRuntimePackProgram(input) {
  const result = preparePackProgramSource(input);
  if (!result.ok) return result;
  return ok({
    artifact: result.value,
    ...Object.keys(input.modules).some((path) => /\.(?:ts|mts)$/.test(path)) ? { source: structuredClone(input) } : {}
  });
}
var directSceneComponents = new Map(
  [Camera, DirectionalLight, PointLight, SpotLight, MeshFilter, MeshRenderer, Name, Transform].map(
    (component) => [component.name, component]
  )
);
function createWorkspacePackAuthoring(options) {
  const bindings = /* @__PURE__ */ new Map();
  const dependencySources = /* @__PURE__ */ new Map();
  const dependenciesOf = /* @__PURE__ */ new Map();
  const observe = (source, path) => {
    const absolute = resolve(options.root, path);
    if (absolute === resolve(options.root, source)) return;
    let owners = dependencySources.get(absolute);
    if (!owners) {
      owners = /* @__PURE__ */ new Set();
      dependencySources.set(absolute, owners);
    }
    owners.add(source);
    let paths = dependenciesOf.get(source);
    if (!paths) {
      paths = /* @__PURE__ */ new Set();
      dependenciesOf.set(source, paths);
    }
    paths.add(absolute);
  };
  const forget = (source) => {
    for (const path of dependenciesOf.get(source) ?? []) {
      const owners = dependencySources.get(path);
      if (!owners) continue;
      owners.delete(source);
      if (!owners.size) dependencySources.delete(path);
    }
    dependenciesOf.delete(source);
  };
  const targetFor = (sourcePath) => {
    const binding = bindings.get(sourcePath);
    if (!binding) return void 0;
    if (options.preview(binding.target.targetId) !== binding)
      throw new Error("Authoring preview target has retired");
    return binding;
  };
  const requireTarget = (sourcePath) => {
    const target = targetFor(sourcePath);
    if (!target) throw new Error("Open this asset preview before applying live fields");
    return target;
  };
  const generate = async ({
    document: document2,
    values,
    signal
  }) => {
    const source = manager.sourceAt(document2.sourcePath);
    if (!source) throw new Error("Authoring source was closed");
    if (document2.format === "direct") {
      const json = JSON.parse(source.write(new Map(Object.entries(values))));
      const blobs = {};
      const dependencies = {};
      const projectRoot = await realpath(options.root);
      const own = new Set(
        Object.keys(json.assets).map(
          (key) => AssetGuid.format(AssetGuid.derive(definePackageId(json.packageId), key))
        )
      );
      const refs = /* @__PURE__ */ new Set();
      for (const asset of Object.values(json.assets)) {
        for (const ref of asset.refs ?? []) if (!own.has(ref)) refs.add(ref);
        for (const artifact of Object.values(asset.artifacts ?? {})) {
          const path = artifact.path;
          if (typeof path !== "string" || Object.hasOwn(blobs, path)) continue;
          const absolute2 = await realpath(
            resolve(options.root, dirname(document2.sourcePath), path)
          );
          if (!absolute2.startsWith(`${projectRoot}${sep}`))
            throw new TypeError("Pack artifact is outside the project");
          signal.throwIfAborted();
          blobs[path] = new Uint8Array(await readFile(absolute2));
          observe(document2.sourcePath, absolute2);
        }
      }
      if (refs.size) {
        const catalog = options.catalog?.();
        if (!catalog) throw new Error("Generation requires an accepted project asset source");
        let entries = (await catalog.enumerate()).unwrap();
        for (const ref of refs) {
          let row = entries.find((entry) => entry.guid === ref);
          if (!row?.publication && catalog.get) {
            (await catalog.get(ref)).unwrap();
            entries = (await catalog.enumerate()).unwrap();
            row = entries.find((entry) => entry.guid === ref);
          }
          signal.throwIfAborted();
          const digest = row?.publication?.outputs.find((output) => output.guid === ref)?.digest;
          if (!digest || !row) throw new Error(`Missing saved dependency ${ref}`);
          dependencies[ref] = digest;
          observe(document2.sourcePath, row.sourcePath);
        }
      }
      return {
        data: { content: { source: json, blobs, dependencies } },
        parameters: document2.fields.filter((field) => typeof field.apply === "object"),
        dependencies
      };
    }
    const generator = source.generator ?? {
      sourcePath: document2.sourcePath,
      source: source.source
    };
    const snapshot = createScriptablePackSourceSnapshot();
    const absolute = resolve(options.root, generator.sourcePath);
    await snapshot.inventory(absolute, generator.source);
    for (const path of snapshot.paths) observe(document2.sourcePath, path);
    signal.throwIfAborted();
    let reader;
    let registry;
    try {
      const definition = (await loadScriptablePack(absolute, {
        sourceSnapshot: snapshot,
        buildTimeoutMs: 12e4,
        signal
      })).unwrap();
      const parameters = "parameters" in definition ? definition.parameters : [];
      const dependencies = {};
      const reads = /* @__PURE__ */ new Map();
      const built = await definition.build({
        packageId: definePackageId(document2.packageId),
        ...parameters.length ? { values: packGenerationValues(parameters, values) } : {},
        async readByGuid(guid) {
          signal.throwIfAborted();
          const text = AssetGuid.format(guid);
          let read = reads.get(text);
          if (!read) {
            const catalog = options.catalog?.();
            if (!catalog) throw new Error("Generation requires an accepted project asset source");
            if (!registry) {
              registry = new AssetRegistry();
              reader = createAssetRuntimeAssembly(void 0, { registry, catalogSource: catalog });
              reader.unwrap();
            }
            let entries = (await registry.enumerateCatalog()).unwrap();
            if (!registry.catalogEntry(text)?.publication && catalog.get) {
              (await catalog.get(text)).unwrap();
              signal.throwIfAborted();
              (await registry.reconcileCatalog()).unwrap();
              entries = (await registry.enumerateCatalog()).unwrap();
            }
            const row = registry.catalogEntry(text);
            const digest = row?.publication?.outputs.find((output) => output.guid === text)?.digest;
            if (!digest) throw new Error(`Generation dependency has no saved publication: ${text}`);
            if (!reader) throw new Error("Generation asset reader is unavailable");
            const retained = await retainAssetPublications(
              registry,
              /* @__PURE__ */ new Map([[text, digest]]),
              entries,
              catalog,
              reader.unwrap().fetcher,
              { signal }
            );
            const pin = retained.get(text);
            if (!pin) throw new Error(`Missing retained dependency ${text}`);
            read = {
              asset: typeof pin.asset === "function" ? await pin.asset() : pin.asset,
              digest: pin.digest
            };
            observe(document2.sourcePath, pin.row.sourcePath);
            reads.set(text, read);
          }
          dependencies[text] = read.digest;
          return ok(structuredClone(read.asset));
        }
      });
      signal.throwIfAborted();
      if (!built.ok) throw built.error;
      for (const path of snapshot.paths) {
        const before = await snapshot.readText(path);
        const after = await readFile(path, "utf8");
        if (before === after) continue;
        const oldDeclaration = readPackAuthoringDeclaration(path, before);
        const newDeclaration = readPackAuthoringDeclaration(path, after);
        if (!oldDeclaration.ok || !newDeclaration.ok || oldDeclaration.value.generationSource !== newDeclaration.value.generationSource)
          throw new Error(`Generation source changed: ${path}`);
      }
      return {
        data: {
          outputs: built.value,
          ...definition.sceneComponents ? { sceneComponents: definition.sceneComponents } : {}
        },
        parameters,
        dependencies
      };
    } finally {
      snapshot.releaseResolvers();
      if (reader?.ok) reader.value.dispose();
      registry?.dispose();
    }
  };
  const manager = createFileSystemPackDrafts({
    gameRoot: options.root,
    sourceRoots: options.sourceRoots,
    liveField: (kind, path, value) => kind === "material" && path.length === 2 && path[0] === "values" && typeof value !== "string" || kind === "scene" && path[0] === "entities" && (path.length === 5 && path[2] === "components" || path.length === 8 && path[2] === "instance" && path[3] === "overrides" && path[5] === "components") && sceneFieldWritable(
      directSceneComponents.get(path[path.length - 2] ?? ""),
      path.at(-1) ?? ""
    ),
    owner(document2) {
      return {
        generate,
        async adopt(result, values, signal, currentValues) {
          if (!targetFor(document2.sourcePath)) return false;
          const content = "content" in result.data ? result.data.content : (await prepareRuntimePackContent(
            document2.packageId,
            applyPackParameterBindings(
              result.parameters,
              result.data.outputs,
              values
            ).unwrap(),
            {
              dependencies: result.dependencies,
              ...result.data.sceneComponents ? { sceneComponents: result.data.sceneComponents } : {}
            }
          )).unwrap();
          signal.throwIfAborted();
          const target = requireTarget(document2.sourcePath);
          if (!target.prepareAssetContent || !target.commitAssetContent)
            throw new Error("This preview cannot adopt generated content");
          const preparation = await target.prepareAssetContent(content, signal);
          signal.throwIfAborted();
          const latest = currentValues();
          const fields = result.parameters.flatMap(
            (field) => typeof field.apply !== "object" ? [] : [
              {
                guid: AssetGuid.format(
                  AssetGuid.derive(definePackageId(document2.packageId), field.apply.asset)
                ),
                path: field.apply.path,
                value: latest[field.name]
              }
            ]
          );
          await target.commitAssetContent(preparation, fields);
          return true;
        },
        async preview(field, value) {
          if (typeof field.apply !== "object") return;
          const guid = AssetGuid.format(
            AssetGuid.derive(definePackageId(document2.packageId), field.apply.asset)
          );
          const target = requireTarget(document2.sourcePath);
          if (!target.writeAssetField) throw new Error("This preview cannot write asset fields");
          await target.writeAssetField({ guid, path: field.apply.path, value });
        }
      };
    }
  });
  return {
    async execute(input) {
      input.signal?.throwIfAborted();
      const source = input.request.sourcePath ? relative(options.root, resolve(options.root, input.request.sourcePath)).split("\\").join("/") : input.request.draftId ? manager.source(input.request.draftId)?.document.sourcePath : void 0;
      let rebound = false;
      if (input.previewTargetId && source) {
        const target = options.preview(input.previewTargetId);
        if (!target) throw new Error("The requested authoring preview is unavailable");
        const targetSource = target.asset?.path;
        if (!targetSource || resolve(options.root, targetSource) !== resolve(options.root, source))
          throw new Error("The preview belongs to another Pack source");
        rebound = bindings.get(source) !== target;
        bindings.set(source, target);
      }
      let result = await manager.execute(input.request);
      if (source && input.request.action === "save")
        await options.publishSource?.(resolve(options.root, source));
      if (rebound && source && !("closed" in result))
        result = await manager.previewSource(source) ?? result;
      if ("closed" in result && source) {
        bindings.delete(source);
        forget(source);
      }
      if (source && (input.request.action === "open" || input.request.action === "refresh")) {
        const generator = manager.sourceAt(source)?.generator;
        if (generator)
          for (const path of generator.paths ?? [generator.sourcePath]) observe(source, path);
      }
      options.changed?.(result);
      return result;
    },
    async sourceChanged(path) {
      const requested = resolve(options.root, path);
      const projectRoot = await realpath(options.root);
      const rootAlias = resolve(options.root);
      let absolute = requested;
      try {
        absolute = await realpath(requested);
      } catch (cause) {
        if (cause.code !== "ENOENT") throw cause;
      }
      const within = (base, candidate) => candidate === base || candidate.startsWith(`${base}${sep}`);
      const source = relative(within(projectRoot, absolute) ? projectRoot : rootAlias, absolute).split("\\").join("/");
      const projectAlias = resolve(rootAlias, source);
      const dependentSources = /* @__PURE__ */ new Set([
        ...dependencySources.get(requested) ?? [],
        ...dependencySources.get(absolute) ?? [],
        ...dependencySources.get(projectAlias) ?? []
      ]);
      const dependents = dependentSources.size > 0 ? dependentSources : void 0;
      for (const dependentSource of dependents ?? []) {
        const reply2 = manager.invalidateGeneration(dependentSource);
        if (reply2) options.changed?.(reply2);
        void manager.refreshSource(dependentSource).then((reply3) => {
          if (reply3) options.changed?.(reply3);
        });
      }
      const active = async (source2) => {
        const binding = bindings.get(source2);
        if (!binding) return false;
        const current = options.preview(binding.target.targetId);
        if (!current) return false;
        if (current === binding) return true;
        const currentPath = current.asset?.path;
        if (current.target.targetId !== binding.target.targetId || current.target.generation !== binding.target.generation || !currentPath)
          return false;
        let boundPath;
        let activePath;
        try {
          [boundPath, activePath] = await Promise.all([
            realpath(resolve(options.root, source2)),
            realpath(resolve(options.root, currentPath))
          ]);
        } catch (cause) {
          if (cause.code === "ENOENT") return false;
          throw cause;
        }
        if (boundPath !== activePath) return false;
        bindings.set(source2, current);
        return true;
      };
      if (!await manager.hasSource(path)) {
        if (await active(source)) {
          try {
            await manager.execute({ action: "open", sourcePath: source });
          } catch {
            return false;
          }
          if (!await active(source)) return false;
          const reply2 = await manager.previewSource(source);
          if (reply2) options.changed?.(reply2);
          return true;
        }
        for (const dependent of dependents ?? []) if (await active(dependent)) return true;
        return false;
      }
      const reply = await manager.refreshSource(path, (prepared) => options.changed?.(prepared));
      if (reply) options.changed?.(reply);
      return await active(source);
    },
    dispose() {
      manager.dispose();
      bindings.clear();
      dependencySources.clear();
      dependenciesOf.clear();
    }
  };
}

// src/workspace-provider.ts
var DEFAULT_WIDTH = 1280;
var DEFAULT_HEIGHT = 720;
var DEFAULT_READY_TIMEOUT_MS = 12e4;
var DEFAULT_COMMAND_TIMEOUT_MS = 3e4;
var DevKitWorkspaceError = class extends Error {
  constructor(code, expected, hint, detail = {}) {
    super(`${code}: ${hint}`);
    this.code = code;
    this.expected = expected;
    this.hint = hint;
    this.detail = detail;
    this.name = "DevKitWorkspaceError";
  }
  code;
  expected;
  hint;
  detail;
};
function abortReason(signal) {
  if (signal === void 0) return void 0;
  if (signal.reason !== void 0) return signal.reason;
  return Object.assign(new Error("engine workspace operation was cancelled"), {
    name: "AbortError"
  });
}
function throwIfAborted(signal) {
  if (signal?.aborted) throw abortReason(signal);
}
function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
async function inspectAuthoredPack(root, sourcePath, sourceKey, guid, signal) {
  const result = await assetInspectCommand({ root, subject: sourcePath, sourceKey });
  throwIfAborted(signal);
  if (!result.ok)
    throw new DevKitWorkspaceError(
      result.error.code,
      result.error.expected,
      result.error.hint,
      result.error.detail
    );
  if (!isRecord(result.value) || typeof result.value.guid !== "string" || result.value.guid.toLowerCase() !== guid.toLowerCase())
    throw new DevKitWorkspaceError(
      "asset-inspect-identity-mismatch",
      "the authored Pack output GUID to match the inspected Catalog GUID",
      "Refresh the Catalog or repair the source locator before inspecting this asset.",
      {
        guid,
        sourcePath,
        sourceKey,
        sourceGuid: isRecord(result.value) ? result.value.guid : null
      }
    );
  const source = result.value;
  const properties = isRecord(source.payload) ? source.payload : isRecord(source.effectiveValues) ? source.effectiveValues : void 0;
  return {
    meta: {
      ...typeof source.packageId === "string" ? { packageId: source.packageId } : {},
      ...typeof source.format === "string" ? { format: source.format } : {},
      ...typeof source.parentPackageId === "string" ? { parentPackageId: source.parentPackageId } : {},
      ...Array.isArray(source.parameters) ? { parameters: source.parameters } : {},
      ...properties === void 0 ? {} : { properties }
    },
    ...typeof source.revision === "string" ? { revision: source.revision } : {}
  };
}
function workspaceCallerSource(sessionId, targetId) {
  return `forgeax-workspace:${sessionId}:${targetId}`;
}
function assertWorkspaceCaller(caller, sessionId, targetId, acceptedCaller) {
  const expected = workspaceCallerSource(sessionId, targetId);
  if (caller.kind === "frontend" && caller.sourceId === expected && acceptedCaller !== void 0 && caller.connectionId === acceptedCaller.connectionId && caller.capability === acceptedCaller.capability)
    return;
  throw new DevKitWorkspaceError(
    "engine-workspace-caller-mismatch",
    "the Engine workspace result caller to match the active session and target",
    "Discard results from an old, shell, or unassociated host connection and use the active display host page.",
    {
      expectedSource: expected,
      receivedKind: caller.kind,
      receivedSource: caller.sourceId ?? null,
      receivedConnectionId: caller.connectionId,
      sessionId,
      targetId
    }
  );
}
function positiveInteger(value, fallback, name) {
  const result = value ?? fallback;
  if (!Number.isSafeInteger(result) || result < 1) {
    throw new DevKitWorkspaceError(
      "engine-workspace-invalid-extent",
      `${name} to be a positive safe integer`,
      `Pass a positive ${name} when opening the Engine workspace.`,
      { [name]: value ?? null }
    );
  }
  return result;
}
function wireError(error, operation) {
  const failure = isRecord(error) ? error : void 0;
  return new DevKitWorkspaceError(
    typeof failure?.code === "string" ? failure.code : "engine-workspace-browser-failure",
    typeof failure?.expected === "string" ? failure.expected : `the browser workspace operation ${operation} to complete`,
    typeof failure?.hint === "string" ? failure.hint : "Inspect the browser page failure details.",
    failure?.detail !== null && typeof failure?.detail === "object" ? failure.detail : {}
  );
}
function assertProject(value, facts) {
  if (value === null || typeof value !== "object") {
    throw new DevKitWorkspaceError(
      "engine-workspace-project-invalid",
      "the browser page to return a project identity",
      "Inspect the generated Engine workspace page and reopen the project.",
      {}
    );
  }
  const project = value;
  if (project.id !== facts.id || project.root !== facts.root) {
    throw new DevKitWorkspaceError(
      "engine-workspace-project-mismatch",
      "the browser project identity to match the opened project",
      "Treat the headed target as stale and reopen the project.",
      {
        expectedId: facts.id,
        receivedId: project.id ?? null,
        expectedRoot: facts.root,
        receivedRoot: project.root ?? null
      }
    );
  }
  return {
    id: facts.id,
    root: facts.root,
    assetRoots: facts.assetRoots,
    ...typeof project.name === "string" ? { name: project.name } : { name: facts.name },
    ...typeof project.revision === "string" ? { revision: project.revision } : {}
  };
}
function assertTarget(value, expected) {
  if (value === null || typeof value !== "object") {
    throw new DevKitWorkspaceError(
      "engine-workspace-target-invalid",
      "the browser page to return a stable workspace target",
      "Reopen the project and wait for the Engine browser realm to become ready.",
      {}
    );
  }
  const target = value;
  const targetWidth = target.width;
  const targetHeight = target.height;
  if (target.targetId !== expected.targetId || target.sessionId !== expected.sessionId || typeof target.worldId !== "string" || target.worldId.length === 0 || target.headed !== expected.headed || typeof targetWidth !== "number" || !Number.isSafeInteger(targetWidth) || targetWidth < 1 || typeof targetHeight !== "number" || !Number.isSafeInteger(targetHeight) || targetHeight < 1) {
    throw new DevKitWorkspaceError(
      "engine-workspace-target-mismatch",
      "the browser target identity and dimensions to match the opened session",
      "Treat the workspace target as stale and reopen the project.",
      {
        expectedSessionId: expected.sessionId,
        receivedSessionId: target.sessionId ?? null,
        expectedTargetId: expected.targetId,
        receivedTargetId: target.targetId ?? null
      }
    );
  }
  return {
    targetId: expected.targetId,
    sessionId: expected.sessionId,
    worldId: target.worldId,
    headed: expected.headed,
    width: targetWidth,
    height: targetHeight,
    ...typeof target.frameId === "number" ? { frameId: target.frameId } : {},
    ...typeof target.url === "string" ? { url: target.url } : {}
  };
}
function localServerUrl(server) {
  const local = server.resolvedUrls?.local?.[0];
  if (typeof local === "string" && local.length !== 0) return local;
  const address = server.httpServer?.address();
  if (address !== null && typeof address === "object" && address.port > 0) {
    return `http://127.0.0.1:${address.port}/`;
  }
  throw new DevKitWorkspaceError(
    "engine-workspace-server-url-missing",
    "the Engine Vite server to publish a loopback URL",
    "Inspect the DevKit server startup diagnostics and reopen the project.",
    {}
  );
}
function packPluginReady(server) {
  const plugin = server.config?.plugins?.find((entry) => entry.name === "forgeax:pack");
  return typeof plugin?.ready === "function" ? plugin.ready.bind(plugin) : void 0;
}
async function awaitCatalogReady(server, serverUrl, scopeId, timeoutMs, signal) {
  const ready = packPluginReady(server);
  if (ready === void 0) {
    await waitForRuntimeCatalog(serverUrl, scopeId, timeoutMs, signal);
    return;
  }
  throwIfAborted(signal);
  let timer;
  let onAbort;
  const timeout = new Promise((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(
        new DevKitWorkspaceError(
          "engine-workspace-catalog-not-ready",
          "the project Pack catalog to become ready before the workspace page loads",
          "Wait for the project producer to finish, repair its diagnostics if it failed, and reopen the workspace.",
          {
            timeoutMs,
            catalogUrl: new URL(
              `/__pack/scopes/${encodeURIComponent(scopeId)}/1/catalog.json`,
              serverUrl
            ).href
          }
        )
      );
    }, timeoutMs);
  });
  const abort = new Promise((_resolve, reject) => {
    if (signal === void 0) return;
    if (signal.aborted) {
      reject(abortReason(signal));
      return;
    }
    onAbort = () => reject(abortReason(signal));
    signal.addEventListener("abort", onAbort, { once: true });
  });
  try {
    await Promise.race([ready(), timeout, abort]);
  } finally {
    if (timer !== void 0) clearTimeout(timer);
    if (signal !== void 0 && onAbort !== void 0) signal.removeEventListener("abort", onAbort);
  }
}
async function waitForRuntimeCatalog(serverUrl, scopeId, timeoutMs, signal) {
  throwIfAborted(signal);
  const catalogUrl = new URL(
    `/__pack/scopes/${encodeURIComponent(scopeId)}/1/catalog.json`,
    serverUrl
  );
  const deadline = Date.now() + timeoutMs;
  let lastStatus;
  let lastFailure;
  let lastResponseBody;
  while (Date.now() < deadline) {
    throwIfAborted(signal);
    const remaining = deadline - Date.now();
    const requestController = new AbortController();
    const requestTimeout = setTimeout(
      () => requestController.abort(),
      Math.min(5e3, Math.max(1, remaining))
    );
    const onAbort = () => requestController.abort(abortReason(signal));
    signal?.addEventListener("abort", onAbort, { once: true });
    try {
      const response = await fetch(catalogUrl, {
        signal: requestController.signal
      });
      throwIfAborted(signal);
      lastStatus = response.status;
      if (response.ok) {
        if (response.body !== null) await response.body.cancel().catch(() => {
        });
        return;
      }
      try {
        const body = await response.text();
        if (body.length > 0) lastResponseBody = body.slice(0, 8192);
      } catch (cause) {
        lastFailure = cause instanceof Error ? cause.message : String(cause);
      }
      if (response.status !== 503) break;
    } catch (cause) {
      if (signal?.aborted) throw abortReason(signal);
      lastFailure = cause instanceof Error ? cause.message : String(cause);
    } finally {
      clearTimeout(requestTimeout);
      signal?.removeEventListener("abort", onAbort);
    }
    const delay = Math.min(100, Math.max(1, remaining));
    await new Promise((resolve3, reject) => {
      const timer = setTimeout(done, delay);
      const onDelayAbort = () => {
        clearTimeout(timer);
        signal?.removeEventListener("abort", onDelayAbort);
        reject(abortReason(signal));
      };
      function done() {
        signal?.removeEventListener("abort", onDelayAbort);
        resolve3();
      }
      signal?.addEventListener("abort", onDelayAbort, { once: true });
      if (signal?.aborted) onDelayAbort();
    });
  }
  throw new DevKitWorkspaceError(
    "engine-workspace-catalog-not-ready",
    "the project Pack catalog to become ready before the workspace page loads",
    "Wait for the project producer to finish, repair its diagnostics if it failed, and reopen the workspace.",
    {
      catalogUrl: catalogUrl.href,
      timeoutMs,
      ...lastStatus === void 0 ? {} : { lastStatus },
      ...lastFailure === void 0 ? {} : { lastFailure },
      ...lastResponseBody === void 0 ? {} : { lastResponseBody }
    }
  );
}
function commandInput(value) {
  const { signal: _signal, ...rest } = value;
  return rest;
}
function operationResultTarget(value, expected) {
  if (value === null || typeof value !== "object") {
    throw new DevKitWorkspaceError(
      "engine-workspace-preview-invalid",
      "the browser page to return preview metadata",
      "Retry only after the Engine workspace target is ready.",
      {}
    );
  }
  return assertTarget(value.target, expected);
}
function operationResultAsset(value) {
  if (value === null || typeof value !== "object") return void 0;
  const asset = value.asset;
  if (asset === null || typeof asset !== "object") return void 0;
  const candidate = asset;
  if (typeof candidate.guid !== "string" || typeof candidate.kind !== "string") return void 0;
  return {
    guid: candidate.guid,
    kind: candidate.kind,
    ...typeof candidate.name === "string" ? { name: candidate.name } : {},
    ...typeof candidate.path === "string" ? { path: candidate.path } : {},
    ...typeof candidate.label === "string" ? { label: candidate.label } : {},
    ...typeof candidate.revision === "string" ? { revision: candidate.revision } : {},
    ...typeof candidate.previewable === "boolean" ? { previewable: candidate.previewable } : {}
  };
}
function createDevKitWorkspaceProvider(options = {}) {
  const width = positiveInteger(options.width, DEFAULT_WIDTH, "width");
  const height = positiveInteger(options.height, DEFAULT_HEIGHT, "height");
  const headed = options.headed ?? true;
  const readyTimeoutMs = positiveInteger(
    options.readyTimeoutMs,
    DEFAULT_READY_TIMEOUT_MS,
    "readyTimeoutMs"
  );
  const backendFactory = options.backendFactory ?? (() => createBackendHost());
  if (options.hostBinding !== void 0 && options.backendFactory !== void 0) {
    throw new TypeError("DevKit workspace provider cannot combine hostBinding and backendFactory");
  }
  const serverFactory = options.viteServerFactory ?? ((config) => createServer(config));
  let currentClose;
  let disposed = false;
  const openings = /* @__PURE__ */ new Set();
  const trackOpening = (operation) => {
    const pending = operation();
    openings.add(pending);
    void pending.then(
      () => openings.delete(pending),
      () => openings.delete(pending)
    );
    return pending;
  };
  const openSession = async (input, parent) => {
    const startupAt = performance.now();
    let lastStageAt = startupAt;
    const facts = await readProjectFacts(input.root);
    if (!facts.ok) {
      const error = facts.error;
      throw new DevKitWorkspaceError(error.code, error.expected, error.hint, error.detail);
    }
    if (disposed) {
      throw new DevKitWorkspaceError(
        "engine-workspace-provider-disposed",
        "the Engine workspace provider to remain active",
        "Create a new workspace provider before opening another project.",
        {}
      );
    }
    const sessionId = `workspace-${randomUUID()}`;
    const targetId = `target-${randomUUID()}`;
    const timing = (stage) => {
      const game = parent !== void 0;
      if (!game && process.env.FORGEAX_WORKSPACE_TIMING !== "1") return;
      const now = performance.now();
      console.error(
        game ? "[forgeax.play]" : "[forgeax.workspace.timing]",
        JSON.stringify({
          root: facts.value.root,
          sessionId,
          targetId,
          execution: game ? "game" : "preview",
          stage,
          totalMs: Math.round(now - startupAt),
          stageMs: Math.round(now - lastStageAt)
        })
      );
      lastStageAt = now;
    };
    timing("project-facts");
    const admissionToken = randomUUID();
    const dimensions = {
      sessionId,
      targetId,
      width,
      height,
      headed
    };
    const ownsBackend = parent === void 0 && options.hostBinding === void 0;
    const backend = parent ?? options.hostBinding?.backend ?? await backendFactory();
    if (disposed) {
      if (ownsBackend) await backend.dispose().catch(() => {
      });
      throw new DevKitWorkspaceError(
        "engine-workspace-provider-disposed",
        "the Engine workspace provider to remain active",
        "Create a new workspace provider before opening another project.",
        { sessionId, targetId }
      );
    }
    timing("backend-bound");
    let authoring;
    const binding = {
      ...parent ? { backend } : options.hostBinding ?? { backend },
      // A child keeps its own execution root while retaining realm preparation.
      ...parent && options.hostBinding?.frontendModule?.prepare ? { frontendModule: options.hostBinding.frontendModule } : {},
      workspace: { sessionId, targetId, admissionToken, execution: parent ? "game" : "preview" },
      ...parent ? {} : { authoringSourceChanged: (path) => authoring?.sourceChanged(path) ?? false }
    };
    const pending = /* @__PURE__ */ new Map();
    let ready;
    let readyFailure;
    let pageLost = false;
    let browserDetached = false;
    let browserGeneration = 0;
    let browserRetirement = Promise.resolve();
    let resultRegistration;
    let removePresentation;
    let acceptedCaller;
    const expectedCallerSource = workspaceCallerSource(sessionId, targetId);
    const removeClientConnect = backend.transport.onClientConnect((caller) => {
      if (caller.kind === "frontend" && caller.sourceId === expectedCallerSource) {
        if (acceptedCaller && acceptedCaller.connectionId !== caller.connectionId) {
          const previous = acceptedCaller;
          acceptedCaller = void 0;
          void settleResult({
            kind: "lost",
            id: `replaced:${previous.connectionId}`,
            sessionId,
            targetId
          });
        }
        acceptedCaller = caller;
      }
    });
    const removeClientDisconnect = backend.transport.onClientDisconnect((caller) => {
      if (acceptedCaller?.connectionId === caller.connectionId) {
        acceptedCaller = void 0;
        void settleResult({
          kind: "lost",
          id: `disconnect:${caller.connectionId}`,
          sessionId,
          targetId
        });
      }
    });
    let removeBackendDispose;
    let server;
    let serverClosed = false;
    let sessionClosed = false;
    let sessionClosePromise;
    const previews = /* @__PURE__ */ new Map();
    if (!parent)
      authoring = createWorkspacePackAuthoring({
        root: facts.value.root,
        sourceRoots: facts.value.assetRoots,
        publishSource: async (sourcePath) => {
          const pack = server?.config.plugins.find((entry) => entry.name === "forgeax:pack");
          if (!pack) throw new Error("The project asset producer is unavailable");
          if (await pack.rebuildCatalogInPlace([sourcePath]))
            backend.context.get("engineWorkspaceCatalog")?.notePublished();
        },
        catalog: () => {
          if (!server) return void 0;
          const plugin = server.config.plugins.find((entry) => entry.name === "forgeax:pack");
          const binding2 = plugin?.runtimeBinding?.();
          if (!binding2) return void 0;
          const base = localServerUrl(server);
          return createCatalogSource({
            url: new URL(binding2.catalogUrl, base).href,
            expectedScope: binding2,
            importTransport: createDevImportTransport({
              ...binding2,
              importUrlBase: new URL(binding2.importUrlBase, base).href
            })
          });
        },
        preview: (id) => previews.get(id),
        changed: (reply) => {
          backend.transport.publish(PACK_DRAFT_CHANGED_TOPIC, { sessionId, reply });
        }
      });
    let play;
    let currentTarget = {
      targetId,
      sessionId,
      worldId: `pending:${sessionId}`,
      headed,
      width,
      height
    };
    const inactiveError = () => disposed ? new DevKitWorkspaceError(
      "engine-workspace-provider-disposed",
      "the Engine workspace provider to remain active",
      "Create a new workspace provider before opening another project.",
      { sessionId, targetId }
    ) : new DevKitWorkspaceError(
      "engine-workspace-session-closed",
      "the Engine workspace session to remain open",
      "Reopen the project before issuing another workspace operation.",
      { sessionId, targetId }
    );
    const assertSessionActive = () => {
      if (disposed || sessionClosed) throw inactiveError();
    };
    const closeIfInactive = async () => {
      if (!disposed && !sessionClosed) return;
      if (server !== void 0 && !serverClosed) {
        serverClosed = true;
        await server.close().catch(() => {
        });
      }
      await closeResources();
      throw inactiveError();
    };
    const notifyTargetChanged = async () => {
      try {
        await options.onTargetChanged?.();
      } catch (error) {
        if (pageLost || sessionClosed) return;
        await settleResult({
          kind: "failed",
          id: "browser-retirement",
          sessionId,
          targetId,
          error: wireError(error, "browser retirement")
        });
      }
    };
    const settleResult = async (payload) => {
      if (payload.sessionId !== sessionId || payload.kind !== "result" && payload.targetId !== targetId && !previews.has(payload.targetId))
        return;
      if (payload.kind === "failed" && payload.targetId !== targetId) {
        const preview = previews.get(payload.targetId);
        if (!preview || preview.failure) return;
        preview.failure = wireError(payload.error, "target execution");
        for (const [id, waiter2] of pending) {
          if (waiter2.targetId !== payload.targetId) continue;
          pending.delete(id);
          clearTimeout(waiter2.timer);
          waiter2.signal?.removeEventListener("abort", waiter2.onAbort);
          waiter2.reject(preview.failure);
        }
        await notifyTargetChanged();
        return;
      }
      if (payload.kind === "lost") {
        if (payload.targetId !== targetId || pageLost && acceptedCaller !== void 0) return;
        const cleanup = readyFailure?.detail?.cleanup;
        if (cleanup === "failed" || cleanup === "timeout") return;
        if (sessionClosed || readyFailure !== void 0) {
          pageLost = true;
          browserDetached = false;
          timing("browser-lost");
          readyFailure = new DevKitWorkspaceError(
            "engine-workspace-page-lost",
            "the Engine workspace browser page to remain connected",
            "The headed page was destroyed or navigated away; reopen the project instead of replaying commands.",
            { sessionId, targetId }
          );
          for (const [id, waiter2] of pending) {
            pending.delete(id);
            clearTimeout(waiter2.timer);
            waiter2.signal?.removeEventListener("abort", waiter2.onAbort);
            waiter2.reject(readyFailure);
          }
          await notifyTargetChanged();
          return;
        }
        browserDetached = true;
        ready = void 0;
        timing("browser-detached");
        const detached = new DevKitWorkspaceError(
          "engine-workspace-browser-detached",
          "the replacement Engine workspace page to become ready",
          "The headed page is reloading. Wait for it instead of replaying commands or reopening the project.",
          { sessionId, targetId }
        );
        for (const [id, waiter2] of pending) {
          if (waiter2.operation === "workspace readiness") continue;
          pending.delete(id);
          clearTimeout(waiter2.timer);
          waiter2.signal?.removeEventListener("abort", waiter2.onAbort);
          waiter2.reject(detached);
        }
        browserRetirement = Promise.all([browserRetirement, notifyTargetChanged()]).then(
          () => void 0
        );
        return;
      }
      if (payload.kind === "failed") {
        if (payload.targetId !== targetId || pageLost) return;
        const cleanup = readyFailure?.detail?.cleanup;
        if (cleanup === "failed" || cleanup === "timeout") return;
        pageLost = true;
        browserDetached = false;
        timing("browser-failed");
        readyFailure = wireError(payload.error, "target execution");
        for (const [id, waiter2] of pending) {
          pending.delete(id);
          clearTimeout(waiter2.timer);
          waiter2.signal?.removeEventListener("abort", waiter2.onAbort);
          waiter2.reject(readyFailure);
        }
        await notifyTargetChanged();
        return;
      }
      if (pageLost && !(payload.kind === "result" && pending.get(payload.id)?.operation === "closeWorkspace"))
        return;
      if (payload.kind === "ready") {
        if (payload.targetId !== targetId || pageLost || ready !== void 0 && !browserDetached)
          return;
        const caller = acceptedCaller;
        let retirement;
        do {
          retirement = browserRetirement;
          await retirement;
        } while (retirement !== browserRetirement);
        if (sessionClosed || pageLost || caller !== acceptedCaller || ready !== void 0 && !browserDetached)
          return;
        try {
          const project = assertProject(payload.project, facts.value);
          const target = assertTarget(payload.target, dimensions);
          ready = { ...payload, project, target };
          browserDetached = false;
          browserGeneration += 1;
          timing("browser-ready");
          currentTarget = {
            ...target,
            ...target.url === void 0 && currentTarget.url === void 0 ? {} : { url: target.url ?? currentTarget.url }
          };
        } catch (error) {
          readyFailure = error;
        }
        for (const [id, waiter2] of pending) {
          if (waiter2.operation !== "workspace readiness") continue;
          pending.delete(id);
          clearTimeout(waiter2.timer);
          waiter2.signal?.removeEventListener("abort", waiter2.onAbort);
          if (readyFailure !== void 0) waiter2.reject(readyFailure);
          else waiter2.resolve(ready);
        }
        await notifyTargetChanged();
        return;
      }
      if (payload.kind !== "result") return;
      const waiter = pending.get(payload.id);
      if (waiter === void 0 || payload.targetId !== targetId && payload.targetId !== waiter.targetId)
        return;
      pending.delete(payload.id);
      clearTimeout(waiter.timer);
      waiter.signal?.removeEventListener("abort", waiter.onAbort);
      if (payload.ok) waiter.resolve(payload.value);
      else {
        const error = wireError(payload.error, waiter.operation);
        if (error.detail.cleanup === "failed" || error.detail.cleanup === "timeout")
          readyFailure = error;
        waiter.reject(error);
      }
    };
    if (!parent && binding.frontendAssembly !== void 0) {
      removePresentation = backend.context.on(
        "internal/service",
        (name) => {
          if (name !== "devkitWorkspaceFrontend" || sessionClosed || pageLost || options.hostBinding?.frontendAssembly === binding.frontendAssembly)
            return;
          settleResult({
            kind: "failed",
            id: `presentation:${targetId}`,
            sessionId,
            targetId,
            error: {
              code: "engine-workspace-page-lost",
              expected: "the sampled frontend presentation lease to remain active",
              hint: "The presentation provider changed. Reopen this exact lost target without replaying writes.",
              detail: { sessionId, targetId, stage: "presentation" }
            }
          });
        },
        { global: true }
      );
    }
    resultRegistration = backend.transport.register(
      engineWorkspaceResultService(targetId),
      async ({ payload, caller }) => {
        assertWorkspaceCaller(caller, sessionId, targetId, acceptedCaller);
        if (payload !== null && typeof payload === "object")
          await settleResult(payload);
        return { accepted: true };
      }
    );
    const cancel = (id, connectionId) => {
      if (!connectionId) return;
      backend.transport.publish(
        ENGINE_WORKSPACE_COMMAND_TOPIC,
        {
          kind: "cancel",
          id,
          sessionId
        },
        { connectionId }
      );
    };
    const waitFor = (id, operation, signal, timeoutMs = options.readyTimeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS, operationTargetId = targetId, previewOwner) => {
      throwIfAborted(signal);
      const connectionId = acceptedCaller?.connectionId;
      return new Promise((resolve3, reject) => {
        let timer;
        const onAbort = () => {
          pending.delete(id);
          clearTimeout(timer);
          cancel(id, connectionId);
          reject(abortReason(signal));
        };
        timer = setTimeout(() => {
          pending.delete(id);
          signal?.removeEventListener("abort", onAbort);
          cancel(id, connectionId);
          reject(
            new DevKitWorkspaceError(
              "engine-workspace-result-timeout",
              `the browser workspace operation ${operation} to return a result`,
              "The headed Engine page did not answer before the workspace timeout.",
              { operation, sessionId, targetId: operationTargetId, timeoutMs }
            )
          );
        }, timeoutMs);
        pending.set(id, {
          cancel: () => cancel(id, connectionId),
          targetId: operationTargetId,
          ...previewOwner === void 0 ? {} : { previewOwner },
          resolve: resolve3,
          reject,
          timer,
          ...signal === void 0 ? {} : { signal },
          onAbort,
          operation
        });
        signal?.addEventListener("abort", onAbort, { once: true });
        if (signal?.aborted) onAbort();
      });
    };
    const waitReady = async (signal) => {
      throwIfAborted(signal);
      if (pageLost) throw readyFailure;
      if (readyFailure !== void 0) throw readyFailure;
      if (ready !== void 0 && !browserDetached) return ready;
      return waitFor(
        `workspace-ready-${randomUUID()}`,
        "workspace readiness",
        signal,
        readyTimeoutMs
      );
    };
    const assertCurrentBrowser = (handshake, operation) => {
      if (operation !== "closePreview") assertSessionActive();
      if (pageLost || readyFailure !== void 0) throw readyFailure;
      if (ready === handshake && !browserDetached && acceptedCaller) return;
      throw new DevKitWorkspaceError(
        "engine-workspace-browser-detached",
        "the browser that admitted this operation to remain current",
        "Retry explicitly after the replacement Editor becomes ready.",
        { sessionId, targetId }
      );
    };
    const command = async (operation, commandPayload, signal) => {
      const handshake = operation === "closeWorkspace" ? { target: currentTarget } : await waitReady(signal);
      if (handshake.target.targetId !== targetId) {
        throw new DevKitWorkspaceError(
          "engine-workspace-target-mismatch",
          "the browser page target identity to remain current",
          "Treat the iframe as stale and reopen the project.",
          { expectedTargetId: targetId, receivedTargetId: handshake.target.targetId }
        );
      }
      throwIfAborted(signal);
      if (operation !== "closeWorkspace")
        assertCurrentBrowser(handshake, operation);
      const connectionId = acceptedCaller?.connectionId;
      if (!connectionId) throw inactiveError();
      const destination = commandPayload;
      if (operation !== "closePreview" && destination.previewOwner !== void 0 && previews.get(destination.targetId ?? targetId)?.handle !== destination.previewOwner)
        throw new DevKitWorkspaceError(
          "engine-workspace-preview-closed",
          "this preview owner to remain active when its command is published",
          "Open the asset again before issuing preview operations.",
          { sessionId, targetId: destination.targetId ?? targetId }
        );
      const id = randomUUID();
      const result = waitFor(
        id,
        operation,
        signal,
        operation === "openPreview" ? readyTimeoutMs : void 0,
        destination.targetId ?? targetId,
        destination.previewOwner
      );
      try {
        backend.transport.publish(
          ENGINE_WORKSPACE_COMMAND_TOPIC,
          {
            kind: "command",
            id,
            sessionId,
            operation,
            input: commandPayload
          },
          { connectionId }
        );
      } catch (cause) {
        const waiter = pending.get(id);
        if (waiter !== void 0) {
          pending.delete(id);
          clearTimeout(waiter.timer);
          signal?.removeEventListener("abort", waiter.onAbort);
          waiter.reject(cause);
        }
      }
      return result;
    };
    const closePreview = async (preview) => {
      if (previews.get(preview.target.targetId) !== preview) return;
      await Promise.resolve(preview.close?.({ targetId: preview.target.targetId }));
      if (previews.get(preview.target.targetId) === preview)
        previews.delete(preview.target.targetId);
    };
    const retireLost = () => {
      readyFailure = new DevKitWorkspaceError(
        "engine-workspace-page-lost",
        "The old Workspace connection was lost",
        "The session is retired; native cleanup is unconfirmed. Do not replay its commands.",
        { targetId, sessionId, cleanup: "unconfirmed", reason: "transport-lost" }
      );
    };
    const closeResources = async () => {
      authoring?.dispose();
      if (sessionClosePromise !== void 0) {
        return sessionClosePromise.catch((error) => {
          if (acceptedCaller !== void 0 || !(readyFailure instanceof DevKitWorkspaceError) || readyFailure.code !== "engine-workspace-page-lost")
            throw error;
          retireLost();
          removeClientDisconnect();
          if (currentClose === closeResources) currentClose = void 0;
          sessionClosePromise = Promise.resolve();
        });
      }
      sessionClosed = true;
      removePresentation?.();
      removePresentation = void 0;
      removeClientConnect();
      sessionClosePromise = (async () => {
        await play?.close?.();
        play = void 0;
        removeBackendDispose?.();
        removeBackendDispose = void 0;
        for (const [id, waiter] of pending) {
          pending.delete(id);
          clearTimeout(waiter.timer);
          waiter.signal?.removeEventListener("abort", waiter.onAbort);
          waiter.cancel();
          waiter.reject(
            new DevKitWorkspaceError(
              "engine-workspace-session-closed",
              "the Engine workspace session to remain open",
              "Reopen the project before issuing another workspace operation.",
              { sessionId, targetId }
            )
          );
        }
        for (const preview of [...previews.values()]) await closePreview(preview).catch(() => {
        });
        let cleanupFailure;
        const priorCleanup = readyFailure?.detail?.cleanup;
        if (priorCleanup === "failed" || priorCleanup === "timeout") {
          cleanupFailure = readyFailure;
        } else if (ready !== void 0 && acceptedCaller === void 0) {
          retireLost();
        } else if (ready !== void 0) {
          try {
            const cleanup = await command("closeWorkspace", { targetId });
            if (cleanup?.cleanup !== "completed")
              throw new DevKitWorkspaceError(
                "engine-workspace-cleanup-incomplete",
                "The old Workspace plugin scopes to report completed cleanup",
                "Inspect the old browser session before considering project closure complete.",
                { targetId, cleanup }
              );
          } catch (cause) {
            const reportedCleanup = cause?.detail?.cleanup;
            if (!acceptedCaller && reportedCleanup !== "failed" && reportedCleanup !== "timeout")
              retireLost();
            else {
              cleanupFailure = cause;
              readyFailure = cause;
            }
          }
        }
        if (server !== void 0 && !serverClosed) {
          serverClosed = true;
          await server.close().catch(() => {
          });
        }
        resultRegistration?.();
        resultRegistration = void 0;
        const failedCleanup = cleanupFailure?.detail?.cleanup;
        if (!cleanupFailure || failedCleanup === "failed" || failedCleanup === "timeout")
          removeClientDisconnect();
        if (ownsBackend) await backend.dispose().catch(() => {
        });
        if (cleanupFailure) throw cleanupFailure;
        if (currentClose === closeResources) currentClose = void 0;
      })();
      return sessionClosePromise;
    };
    if (!parent) currentClose = closeResources;
    if (!ownsBackend) {
      removeBackendDispose = backend.subscribeDispose(() => closeResources());
    }
    try {
      assertSessionActive();
      const config = await createViteConfig(facts.value, "serve", "/", {
        server: {
          port: await materializeViteDevPort(options.port ?? 0),
          strictPort: true
        },
        host: binding
      });
      timing("vite-config");
      await closeIfInactive();
      server = await serverFactory(config);
      timing("vite-server-created");
      await closeIfInactive();
      assertSessionActive();
      await server.listen();
      timing("vite-listening");
      await closeIfInactive();
      const serverUrl = localServerUrl(server);
      if (server.httpServer !== void 0) {
        await awaitCatalogReady(server, serverUrl, facts.value.id, readyTimeoutMs, input.signal);
      }
      timing("catalog-ready");
      const workspaceUrl = new URL(serverUrl);
      workspaceUrl.searchParams.set("forgeaxWorkspace", parent ? "game" : "1");
      workspaceUrl.searchParams.set("forgeaxWorkspaceSession", sessionId);
      workspaceUrl.searchParams.set("forgeaxWorkspaceTarget", targetId);
      workspaceUrl.searchParams.set("forgeaxWorkspaceToken", admissionToken);
      workspaceUrl.searchParams.set("forgeaxWorkspaceWidth", String(width));
      workspaceUrl.searchParams.set("forgeaxWorkspaceHeight", String(height));
      workspaceUrl.searchParams.set("forgeaxWorkspaceHeaded", headed ? "1" : "0");
      currentTarget = { ...currentTarget, url: workspaceUrl.href };
      timing("target-url-published");
      const assertSessionOpen = () => {
        if (sessionClosed) {
          throw new DevKitWorkspaceError(
            "engine-workspace-session-closed",
            "the Engine workspace session to remain open",
            "Reopen the project before issuing another workspace operation.",
            { sessionId, targetId }
          );
        }
      };
      const proxyTarget = (value) => {
        const previewOwner = value.previewOwner;
        const ownerBrowserGeneration = Math.max(1, browserGeneration);
        const previewInput = (input2) => ({
          ...commandInput(input2),
          previewOwner
        });
        let previewTarget = operationResultTarget(value, {
          ...dimensions,
          targetId: value.target?.targetId ?? targetId
        });
        const previewTargetId = previewTarget.targetId;
        const previewAsset = operationResultAsset(value);
        let previewClosed = false;
        let previewClosePromise;
        const previewClose = async () => {
          if (previewClosePromise !== void 0) return previewClosePromise;
          previewClosed = true;
          if (previews.get(preview.target.targetId) !== preview) return;
          previews.delete(previewTargetId);
          const closed = new DevKitWorkspaceError(
            "engine-workspace-preview-closed",
            "the Engine workspace preview to remain open",
            "Open the asset again before issuing preview operations.",
            { sessionId, targetId: previewTargetId }
          );
          for (const [id, waiter] of pending) {
            if (waiter.previewOwner !== previewOwner) continue;
            pending.delete(id);
            clearTimeout(waiter.timer);
            waiter.signal?.removeEventListener("abort", waiter.onAbort);
            waiter.cancel();
            waiter.reject(closed);
          }
          previewClosePromise = (ready && !pageLost && !browserDetached && (parent || ownerBrowserGeneration === Math.max(1, browserGeneration)) ? command("closePreview", { targetId: previewTargetId, previewOwner }, void 0) : Promise.resolve()).then(() => void 0);
          return previewClosePromise;
        };
        const assertPreviewOpen = () => {
          assertSessionOpen();
          if (preview.failure) throw preview.failure;
          if (browserDetached) {
            throw new DevKitWorkspaceError(
              "engine-workspace-browser-detached",
              "the replacement Engine workspace page to become ready",
              "The headed page is reloading. Wait for it before issuing another command.",
              { sessionId, targetId }
            );
          }
          if (previewClosed || !parent && ownerBrowserGeneration !== Math.max(1, browserGeneration)) {
            throw new DevKitWorkspaceError(
              "engine-workspace-preview-closed",
              "the Engine workspace preview to remain open",
              "Open the asset again before issuing camera or capture operations.",
              { targetId }
            );
          }
          if (previews.get(previewTargetId) !== preview) {
            throw new DevKitWorkspaceError(
              "engine-workspace-preview-closed",
              "this Engine workspace preview to remain the active preview",
              "The preview was replaced; reopen the asset before issuing camera or capture operations.",
              { targetId, reason: "replaced" }
            );
          }
        };
        const preview = {
          handle: previewOwner,
          async writeAssetField(fieldWrite) {
            assertPreviewOpen();
            await command("authoring.write", {
              targetId: previewTargetId,
              previewOwner,
              fieldWrite
            });
          },
          async prepareAssetContent(content, signal) {
            assertPreviewOpen();
            return await command(
              "authoring.prepare",
              { targetId: previewTargetId, previewOwner, content: encodePackData(content) },
              signal
            );
          },
          async commitAssetContent(preparation, fields) {
            assertPreviewOpen();
            await command("authoring.commit", {
              targetId: previewTargetId,
              previewOwner,
              preparation,
              fields
            });
          },
          get target() {
            return parent ? currentTarget : previewTarget;
          },
          ...previewAsset ? { asset: previewAsset } : {},
          ...value.assetBinding === void 0 ? {} : { assetBinding: value.assetBinding },
          display: {
            get(options2) {
              assertPreviewOpen();
              return command(
                "preview.display.get",
                { targetId: previewTargetId, previewOwner },
                options2?.signal
              );
            },
            set(display, options2) {
              assertPreviewOpen();
              return command(
                "preview.display.set",
                { targetId: previewTargetId, previewOwner, display },
                options2?.signal
              );
            }
          },
          setControl: (input2) => {
            assertPreviewOpen();
            return command("target.control", previewInput(input2), input2.signal);
          },
          tools: {
            pick(input2) {
              assertPreviewOpen();
              return command("target.pick", { ...input2, targetId: previewTargetId, previewOwner });
            },
            highlight(input2) {
              assertPreviewOpen();
              return command("entity.highlight", {
                ...input2,
                targetId: previewTargetId,
                previewOwner
              });
            },
            tree(input2 = {}) {
              assertPreviewOpen();
              return command("scene.tree.get", {
                ...input2,
                targetId: previewTargetId,
                previewOwner
              });
            },
            inspect(input2) {
              assertPreviewOpen();
              return command("entity.inspect", {
                ...input2,
                targetId: previewTargetId,
                previewOwner
              });
            },
            focus(input2) {
              assertPreviewOpen();
              return command("entity.focus", { ...input2, targetId: previewTargetId, previewOwner });
            }
          },
          ...previewAsset?.kind === "texture" || previewAsset?.kind === "equirect" ? {
            texture: {
              get: () => {
                assertPreviewOpen();
                return command(
                  "preview.texture.get",
                  previewInput({ targetId: previewTargetId })
                );
              },
              set: (options2) => {
                assertPreviewOpen();
                return command("preview.texture.set", {
                  ...previewInput({ targetId: previewTargetId }),
                  options: options2
                });
              }
            }
          } : {},
          getCamera: (cameraInput) => {
            assertPreviewOpen();
            return command("camera.get", previewInput(cameraInput), cameraInput.signal);
          },
          beginCameraInteraction: (cameraInput) => {
            assertPreviewOpen();
            return command("camera.begin", previewInput(cameraInput), cameraInput.signal);
          },
          updateCameraDraft: (cameraInput) => {
            assertPreviewOpen();
            return command("camera.update", previewInput(cameraInput), cameraInput.signal);
          },
          commitCamera: (cameraInput) => {
            assertPreviewOpen();
            return command("camera.commit", previewInput(cameraInput), cameraInput.signal);
          },
          abortCameraInteraction: (cameraInput) => {
            assertPreviewOpen();
            return command("camera.abort", previewInput(cameraInput), cameraInput.signal);
          },
          revokeConnection: (input2) => {
            if (sessionClosed || previewClosed || browserDetached || !parent && ownerBrowserGeneration !== Math.max(1, browserGeneration) || previews.get(previewTargetId) !== preview)
              return Promise.resolve();
            assertPreviewOpen();
            return command("camera.revoke", previewInput(input2));
          },
          async resize(input2) {
            assertPreviewOpen();
            const result = await command("resize", { ...input2, previewOwner }, input2.signal);
            assertPreviewOpen();
            previewTarget = operationResultTarget(result, {
              ...dimensions,
              targetId: previewTargetId
            });
            if (parent) currentTarget = previewTarget;
            return previewTarget;
          },
          capture: (captureInput) => {
            assertPreviewOpen();
            return command(
              "capture",
              {
                targetId: previewTargetId,
                previewOwner,
                width: captureInput.width,
                height: captureInput.height
              },
              captureInput.signal
            );
          },
          close: previewClose
        };
        previews.set(previewTargetId, preview);
        return preview;
      };
      const session = {
        ...authoring ? { authorPack: authoring.execute } : {},
        get failure() {
          return readyFailure;
        },
        get phase() {
          if (pageLost || readyFailure) return "failed";
          if (browserDetached || ready === void 0) return "starting";
          return "running";
        },
        get browserGeneration() {
          return browserGeneration;
        },
        borrowTarget: () => proxyTarget({ previewOwner: sessionId, target: currentTarget }),
        ready: async (signal) => {
          if (parent) timing("game-ready-wait");
          await waitReady(signal);
          if (parent) timing("game-ready");
        },
        ...!parent ? {
          async startPlay({ signal }) {
            assertSessionOpen();
            const playStarted = performance.now();
            const playLog = (stage) => {
              console.error(
                "[forgeax.play]",
                JSON.stringify({
                  root: facts.value.root,
                  sessionId,
                  targetId,
                  execution: "editor",
                  stage,
                  totalMs: Math.round(performance.now() - playStarted)
                })
              );
            };
            playLog("editor-ready-wait");
            const editorBrowser = await waitReady(signal);
            playLog("editor-ready");
            assertCurrentBrowser(editorBrowser);
            if (play)
              throw new DevKitWorkspaceError(
                "engine-workspace-target-busy",
                "One Play per project",
                "Stop the current Play first."
              );
            let game;
            try {
              throwIfAborted(signal);
              playLog("game-session-open");
              game = await openSession(
                { root: facts.value.root, ...signal ? { signal } : {} },
                backend
              );
              playLog("game-session-opened");
              throwIfAborted(signal);
              assertSessionOpen();
              assertCurrentBrowser(editorBrowser);
              const target = game.borrowTarget();
              const owned = game;
              let closing;
              const next = {
                ...target,
                get target() {
                  return target.target;
                },
                get phase() {
                  return owned.phase;
                },
                get browserGeneration() {
                  return owned.browserGeneration;
                },
                ready: owned.ready,
                close() {
                  if (closing) return closing;
                  closing = Promise.resolve(owned.close?.()).then(() => {
                    if (play === next) play = void 0;
                  });
                  return closing;
                }
              };
              play = next;
              return next;
            } catch (error) {
              await game?.close?.();
              throw error;
            }
          }
        } : {},
        project: {
          id: facts.value.id,
          root: facts.value.root,
          name: facts.value.name,
          assetRoots: facts.value.assetRoots
        },
        get target() {
          return currentTarget;
        },
        runtimePack: async (input2) => {
          assertSessionOpen();
          await waitReady(input2.signal);
          assertSessionOpen();
          if (input2.targetId !== targetId || input2.worldId !== currentTarget.worldId)
            throw new DevKitWorkspaceError(
              "engine-workspace-target-stale",
              "The current project App and World",
              "Refresh engine.workspace.get before submitting runtime content.",
              { target: currentTarget }
            );
          return command(
            "runtimePack",
            {
              targetId,
              worldId: input2.worldId,
              request: input2.request,
              ...input2.connectionId ? { connectionId: input2.connectionId } : {}
            },
            input2.signal
          );
        },
        inspectAsset: async ({ guid, signal }) => {
          assertSessionOpen();
          return command("inspectAsset", { targetId, guid }, signal);
        },
        listAssets: async ({ signal } = {}) => {
          assertSessionOpen();
          const result = await command(
            "listAssets",
            { targetId },
            signal
          );
          if (!Array.isArray(result)) {
            throw new DevKitWorkspaceError(
              "engine-workspace-assets-invalid",
              "the browser page to return an asset array",
              "Inspect the generated Engine workspace page and retry.",
              {}
            );
          }
          return result;
        },
        openPreview: async ({ asset, width: previewWidth, height: previewHeight, signal }) => {
          assertSessionOpen();
          const editorBrowser = await waitReady(signal);
          assertCurrentBrowser(editorBrowser);
          const previewTargetId = asset.kind === "scene" ? targetId : `${targetId}:preview:${randomUUID()}`;
          const value = await command(
            "openPreview",
            { targetId, previewTargetId, asset, width: previewWidth, height: previewHeight },
            signal
          );
          assertCurrentBrowser(editorBrowser);
          if (!value || typeof value !== "object" || !("previewOwner" in value) || typeof value.previewOwner !== "string") {
            throw new DevKitWorkspaceError(
              "engine-workspace-preview-invalid",
              "the Engine browser preview allocation identity",
              "Use the matching generated Engine workspace document.",
              {}
            );
          }
          return proxyTarget({
            previewOwner: value.previewOwner,
            target: operationResultTarget(value, { ...dimensions, targetId: previewTargetId }),
            asset: operationResultAsset(value) ?? asset,
            ..."assetBinding" in value ? { assetBinding: value.assetBinding } : {}
          });
        },
        close: closeResources
      };
      return session;
    } catch (cause) {
      await closeResources();
      throw cause;
    }
  };
  const provider = createEngineWorkspaceProvider({
    openProjectSession: (input) => trackOpening(async () => {
      if (disposed) throw new Error("Engine workspace provider is disposed");
      throwIfAborted(input.signal);
      await currentClose?.();
      if (disposed) throw new Error("Engine workspace provider is disposed");
      return openSession(input);
    })
  });
  return Object.freeze({
    ...provider,
    async prepareRuntimePackProgram(input) {
      throwIfAborted(input.signal);
      const prepared = prepareRuntimePackProgram(input.source).unwrap();
      throwIfAborted(input.signal);
      return prepared;
    },
    async inspectAsset(input) {
      throwIfAborted(input.signal);
      if (input.handle !== void 0) {
        const inspection = await provider.inspectAsset?.(input);
        throwIfAborted(input.signal);
        if (!isRecord(inspection) || !isRecord(inspection.asset)) return inspection;
        const asset2 = inspection.asset;
        const sourcePath2 = typeof asset2.path === "string" ? asset2.path : void 0;
        if (!sourcePath2?.endsWith(".pack.json") || typeof asset2.packageId !== "string" || typeof asset2.sourceKey !== "string")
          return inspection;
        const authored2 = await inspectAuthoredPack(
          input.project.root,
          sourcePath2,
          asset2.sourceKey,
          input.guid,
          input.signal
        );
        return {
          ...inspection,
          source: {
            ...isRecord(inspection.source) ? inspection.source : {},
            path: sourcePath2,
            ...authored2.revision === void 0 ? {} : { revision: authored2.revision }
          },
          meta: { ...isRecord(inspection.meta) ? inspection.meta : {}, ...authored2.meta },
          ...authored2.revision === void 0 ? {} : { revision: authored2.revision }
        };
      }
      const result = await assetInspectCommand({ root: input.project.root, subject: input.guid });
      throwIfAborted(input.signal);
      if (!result.ok)
        throw new DevKitWorkspaceError(
          result.error.code,
          result.error.expected,
          result.error.hint,
          result.error.detail
        );
      const asset = result.value;
      const sourcePath = typeof asset.sourcePath === "string" ? asset.sourcePath : void 0;
      const authored = sourcePath?.endsWith(".pack.json") && typeof asset.sourceKey === "string" ? await inspectAuthoredPack(
        input.project.root,
        sourcePath,
        asset.sourceKey,
        input.guid,
        input.signal
      ) : void 0;
      const revision = authored?.revision ?? asset.revision;
      return {
        guid: input.guid,
        asset,
        ...sourcePath === void 0 ? {} : {
          source: {
            path: sourcePath,
            ...sourcePath.endsWith(".pack.ts") ? { kind: "pack.ts" } : {},
            ...revision === void 0 ? {} : { revision }
          }
        },
        ...authored === void 0 ? {} : { meta: authored.meta },
        ...revision === void 0 ? {} : { revision },
        ...asset.cookReceiptUrl === void 0 ? {} : { ddc: { receiptUrl: asset.cookReceiptUrl } }
      };
    },
    async dispose() {
      if (disposed) {
        await currentClose?.();
        return;
      }
      disposed = true;
      const opening = [...openings];
      try {
        await currentClose?.();
      } finally {
        await Promise.allSettled(opening);
      }
    }
  });
}

// src/browser-capture.ts
var BrowserCaptureError = class extends Error {
  constructor(code, expected, hint, detail) {
    super(`${code}: ${hint}`);
    this.code = code;
    this.expected = expected;
    this.hint = hint;
    this.detail = detail;
    this.name = "BrowserCaptureError";
  }
  code;
  expected;
  hint;
  detail;
};
function fail(code, expected, hint, detail = {}) {
  throw new BrowserCaptureError(code, expected, hint, detail);
}
async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
async function reservePort() {
  const reservation = createServer$1();
  await once(reservation.listen(0, "127.0.0.1"), "listening");
  const address = reservation.address();
  const port = typeof address === "object" && address !== null ? address.port : 0;
  await new Promise((resolveClose, rejectClose) => {
    reservation.close((error) => error === void 0 ? resolveClose() : rejectClose(error));
  });
  if (port === 0) throw new Error("OS did not assign an ephemeral capture port");
  return port;
}
async function stopProcess(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  await new Promise((resolveStop) => {
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      resolveStop();
    }, 2e3);
    child.once("exit", () => {
      clearTimeout(timeout);
      resolveStop();
    });
    child.kill("SIGTERM");
  });
}
async function startVirtualDisplay(width, height) {
  if (process.platform !== "linux" || process.env.DISPLAY !== void 0) {
    return {
      ...process.env.DISPLAY === void 0 ? {} : { value: process.env.DISPLAY },
      async close() {
      }
    };
  }
  for (let offset = 0; offset < 100; offset += 1) {
    const number = 90 + (process.pid + offset) % 100;
    const socket = `/tmp/.X11-unix/X${number}`;
    const lock = `/tmp/.X${number}-lock`;
    if (await pathExists(socket) || await pathExists(lock)) continue;
    const display = `:${number}`;
    const child = spawn(
      "Xvfb",
      [display, "-screen", "0", `${width}x${height}x24`, "-nolisten", "tcp"],
      { stdio: ["ignore", "ignore", "pipe"] }
    );
    let diagnostic = "";
    child.stderr?.setEncoding("utf8");
    child.stderr?.on("data", (chunk) => {
      diagnostic += chunk;
    });
    try {
      await new Promise((resolveReady, rejectReady) => {
        const timeout = setTimeout(
          () => rejectReady(new Error(`Xvfb did not create ${socket}: ${diagnostic.trim()}`)),
          5e3
        );
        const poll = setInterval(() => {
          void pathExists(socket).then((exists) => {
            if (!exists) return;
            clearTimeout(timeout);
            clearInterval(poll);
            resolveReady();
          });
        }, 50);
        child.once("error", (error) => {
          clearTimeout(timeout);
          clearInterval(poll);
          rejectReady(
            new BrowserCaptureError(
              "browser-capture-display-unavailable",
              "Xvfb installed for a headed capture when Linux has no DISPLAY",
              "Use --headless true for unattended capture without X11, or install Xvfb for a virtual headed display. Keep Chromium sandboxing enabled and run as a non-root user.",
              { executable: "Xvfb", reason: error.message }
            )
          );
        });
        child.once("exit", (code, signal) => {
          clearTimeout(timeout);
          clearInterval(poll);
          rejectReady(
            new Error(`Xvfb exited before ready (${code ?? signal}): ${diagnostic.trim()}`)
          );
        });
      });
      return { value: display, close: () => stopProcess(child) };
    } catch (cause) {
      await stopProcess(child);
      throw cause;
    }
  }
  throw new Error("no free X11 display number was available for browser capture");
}
async function lavapipeIcd() {
  for (const candidate of [
    "/usr/share/vulkan/icd.d/lvp_icd.x86_64.json",
    "/usr/share/vulkan/icd.d/lvp_icd.aarch64.json"
  ]) {
    if (await pathExists(candidate)) return candidate;
  }
  return void 0;
}
function evidencePath(output) {
  return output.toLowerCase().endsWith(".png") ? `${output.slice(0, -4)}.json` : `${output}.json`;
}
function newRunId() {
  return `${(/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`;
}
function isRecoverablePointerLockDiagnostic(message) {
  return message.includes("app-pointer-lock-failed") && message.includes("path: w3c") && /(WrongDocumentError|SecurityError|not allowed|not valid for pointer lock)/i.test(message);
}
function checkpointSlug(checkpoint) {
  const value = (checkpoint ?? "capture").trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  return value.length === 0 ? "capture" : value;
}
function captureDigest(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}
function classifyCaptureAdapter(adapter) {
  if (adapter === null) return "unknown";
  const witness = Object.values(adapter).map((value) => String(value).toLowerCase()).join(" ");
  return ["swiftshader", "llvmpipe", "lavapipe", "software"].some(
    (token) => witness.includes(token)
  ) ? "software" : "hardware";
}
async function resolveBrowserExecutable(requested) {
  if (requested !== void 0 && requested.length > 0) {
    return await pathExists(requested) ? requested : void 0;
  }
  const candidates = [
    process.env.FORGEAX_BROWSER_EXECUTABLE,
    ...[process.env.PROGRAMFILES, process.env["PROGRAMFILES(X86)"], process.env.LOCALAPPDATA].filter((root) => root !== void 0 && root.length > 0).flatMap((root) => [
      join(root, "Google", "Chrome Beta", "Application", "chrome.exe"),
      join(root, "Google", "Chrome", "Application", "chrome.exe")
    ]),
    "/Applications/Google Chrome Beta.app/Contents/MacOS/Google Chrome Beta",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/opt/google/chrome-beta/chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    typeof chromium.executablePath === "function" ? chromium.executablePath() : void 0
  ].filter((candidate) => candidate !== void 0 && candidate.length > 0);
  for (const candidate of candidates) {
    if (await pathExists(candidate)) return candidate;
  }
  return void 0;
}
function browserLaunchArgs(backend, profile, nativeWindow) {
  const common = [
    "--force-color-profile=srgb",
    ...nativeWindow ? [] : ["--force-device-scale-factor=1"]
  ];
  if (profile === "development") {
    common.unshift(
      "--enable-unsafe-webgpu",
      "--ignore-gpu-blocklist",
      "--disable-gpu-driver-bug-workarounds",
      // Expose supported adapter limits rather than Chrome's privacy tiers.
      "--disable-dawn-features=tiered_adapter_limits"
    );
  }
  if (backend !== "software") return common;
  if (process.platform === "win32") {
    return [...common, "--enable-unsafe-webgpu", "--use-webgpu-adapter=swiftshader"];
  }
  return [
    ...common,
    "--enable-features=Vulkan",
    "--use-vulkan=swiftshader",
    "--use-angle=swiftshader"
  ];
}
function summarizeCapturePixels(rgba, width, height) {
  const pixelCount = width * height;
  const stride = Math.max(1, Math.floor(pixelCount / 4096));
  const histogram = new Uint32Array(16);
  let lumaMin = 255;
  let lumaMax = 0;
  let sampledPixels = 0;
  for (let pixel = 0; pixel < pixelCount; pixel += stride) {
    const offset = pixel * 4;
    const red = rgba[offset];
    const green = rgba[offset + 1];
    const blue = rgba[offset + 2];
    if (red === void 0 || green === void 0 || blue === void 0) break;
    const luma = Math.round((54 * red + 183 * green + 19 * blue) / 256);
    lumaMin = Math.min(lumaMin, luma);
    lumaMax = Math.max(lumaMax, luma);
    const bucket = Math.min(15, Math.floor(luma / 16));
    histogram[bucket] = (histogram[bucket] ?? 0) + 1;
    sampledPixels += 1;
  }
  const dominantPixels = histogram.reduce((largest, count) => Math.max(largest, count), 0);
  const varyingPixels = sampledPixels - dominantPixels;
  const lumaRange = lumaMax - lumaMin;
  const requiredVariation = Math.min(sampledPixels, Math.max(8, Math.ceil(sampledPixels * 2e-3)));
  return {
    width,
    height,
    sampledPixels,
    lumaMin,
    lumaMax,
    lumaRange,
    varyingPixels,
    rendered: lumaRange >= 8 && varyingPixels >= requiredVariation
  };
}
function inspectCapturePng(png) {
  const decoded = parseImage(png, "image/png", { mipmap: false });
  if (!decoded.ok) throw decoded.error;
  return summarizeCapturePixels(decoded.value.bytes, decoded.value.width, decoded.value.height);
}
async function captureBrowserExecutionSurfaceRaw(execution, deadline) {
  if (execution.kind === "frame") {
    return execution.ownerPage.locator(execution.surfaceSelector).screenshot({
      type: "png",
      timeout: Math.max(1, deadline - Date.now())
    });
  }
  return execution.realm.screenshot({
    type: "png",
    caret: "hide",
    timeout: Math.max(1, deadline - Date.now())
  });
}
async function captureBrowserExecutionSurface(execution, deadline, extent) {
  return withCaptureEnvelope(
    execution,
    extent,
    () => captureBrowserExecutionSurfaceRaw(execution, deadline)
  );
}
async function withCaptureEnvelope(execution, extent, operation) {
  if (execution.kind === "page") return operation();
  const token = `forgeax-capture-${randomUUID()}`;
  await execution.ownerPage.evaluate(
    ({ selector, token: token2, width, height }) => {
      const target = document.querySelector(selector);
      if (!(target instanceof HTMLIFrameElement)) {
        throw new Error("browser capture surface selector did not resolve to an iframe");
      }
      const keep = /* @__PURE__ */ new Set();
      for (let current = target; current !== null; current = current.parentElement)
        keep.add(current);
      const records = [];
      for (const element of document.querySelectorAll("*")) {
        if (keep.has(element) || target.contains(element)) continue;
        records.push({ element, style: element.getAttribute("style") });
        element.style.setProperty("visibility", "hidden", "important");
        element.style.setProperty("pointer-events", "none", "important");
      }
      records.push({ element: target, style: target.getAttribute("style") });
      target.style.setProperty("display", "block", "important");
      target.style.setProperty("visibility", "visible", "important");
      target.style.setProperty("opacity", "1", "important");
      target.style.setProperty("z-index", "2147483647", "important");
      target.style.setProperty("position", "relative", "important");
      target.style.setProperty("width", `${width}px`, "important");
      target.style.setProperty("height", `${height}px`, "important");
      target.style.setProperty("box-sizing", "border-box", "important");
      target.style.setProperty("border", "0", "important");
      const envelopes = globalThis.__forgeaxCaptureEnvelopes ?? /* @__PURE__ */ new Map();
      envelopes.set(token2, records);
      globalThis.__forgeaxCaptureEnvelopes = envelopes;
    },
    { selector: execution.surfaceSelector, token, width: extent.width, height: extent.height }
  );
  try {
    return await operation();
  } finally {
    await execution.ownerPage.evaluate((captureToken) => {
      const scope = globalThis;
      const records = scope.__forgeaxCaptureEnvelopes?.get(captureToken);
      if (records === void 0) return;
      for (const record of records.reverse()) {
        if (record.style === null) record.element.removeAttribute("style");
        else record.element.setAttribute("style", record.style);
      }
      scope.__forgeaxCaptureEnvelopes?.delete(captureToken);
    }, token).catch(() => void 0);
  }
}
async function screenshotCanvasWitness(execution, deadline, extent) {
  const canvasPng = await withCaptureEnvelope(execution, extent, async () => {
    const bounds = await execution.realm.locator("canvas").first().boundingBox();
    if (bounds === null) {
      fail(
        "browser-capture-runtime-failed",
        "a visible Engine canvas",
        "Inspect the browser runtime before capturing canvas pixels."
      );
    }
    const viewport = await execution.ownerPage.evaluate(() => ({
      width: innerWidth,
      height: innerHeight
    }));
    const x = Math.max(0, bounds.x);
    const y = Math.max(0, bounds.y);
    const width = Math.min(viewport.width, bounds.x + bounds.width) - x;
    const height = Math.min(viewport.height, bounds.y + bounds.height) - y;
    if (width <= 0 || height <= 0) {
      fail(
        "browser-capture-runtime-failed",
        "Engine canvas pixels inside the browser viewport",
        "Keep the capture canvas visible in its owning document."
      );
    }
    return execution.ownerPage.screenshot({
      type: "png",
      clip: { x, y, width, height },
      timeout: Math.max(1, deadline - Date.now()),
      style: "* { visibility: hidden !important; } canvas { visibility: visible !important; }"
    });
  });
  return { png: canvasPng, pixels: inspectCapturePng(canvasPng) };
}
async function runtimeWitness(realm, probeAdapter = true) {
  return realm.evaluate(
    async ({ datasetKey, probeAdapter: probeAdapter2 }) => {
      const canvas = document.querySelector("canvas");
      const uiRoot = document.querySelector("#game-ui");
      const shadowHosts = [...uiRoot?.querySelectorAll("*") ?? []].filter(
        (element) => element.shadowRoot?.childElementCount !== 0
      );
      let adapter = null;
      let adapterError = null;
      if (probeAdapter2) {
        try {
          const gpuAdapter = await navigator.gpu?.requestAdapter();
          if (gpuAdapter === null || gpuAdapter === void 0) {
            adapterError = "navigator.gpu.requestAdapter() returned null";
          } else {
            const info = gpuAdapter.info;
            adapter = {
              vendor: info.vendor,
              architecture: info.architecture,
              device: info.device,
              description: info.description
            };
          }
        } catch (cause) {
          adapterError = String(cause);
        }
      }
      const frameId = Number(document.documentElement.dataset[datasetKey]);
      const fatal = document.querySelector("#forgeax-fatal");
      const fatalError = fatal?.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) ? (document.querySelector("#forgeax-fatal-details")?.textContent?.trim() || fatal.textContent?.trim() || "Engine execution failed").slice(0, 16384) : null;
      const singleHtmlState = globalThis.__forgeaxSingleHtml;
      return {
        title: document.title,
        canvas: canvas instanceof HTMLCanvasElement ? { width: canvas.width, height: canvas.height } : null,
        domUi: {
          rootChildren: uiRoot?.childElementCount ?? 0,
          openShadowRoots: shadowHosts.length,
          textWitness: shadowHosts.map(
            (host) => [...host.shadowRoot?.children ?? []].filter((element) => !["STYLE", "SCRIPT"].includes(element.tagName)).map(
              (element) => element instanceof HTMLElement ? element.innerText : element.textContent
            ).join(" ").replace(/\s+/g, " ").trim()
          ).filter((text) => text.length > 0).join(" | ").slice(0, 500)
        },
        adapter,
        adapterError,
        engineFrameId: Number.isSafeInteger(frameId) && frameId > 0 ? frameId : null,
        captureReady: document.documentElement.dataset.forgeaxCaptureReady ?? null,
        fatalError,
        singleHtml: singleHtmlState?.witness?.() ?? null,
        userAgent: navigator.userAgent
      };
    },
    { datasetKey: FORGEAX_FRAME_SUBMITTED_DATASET, probeAdapter }
  );
}
async function writeRunReport(report) {
  await mkdir(dirname(report.report), { recursive: true });
  await writeFile(report.report, `${JSON.stringify(report, null, 2)}
`, "utf8");
}
function requestProtocol(url) {
  try {
    return new URL(url).protocol;
  } catch {
    return void 0;
  }
}
function requestRecord(request, target, candidateUrl) {
  const url = request.url();
  const protocol = requestProtocol(url);
  const requestDocument = url.split(/[?#]/, 1)[0];
  const candidateDocument = candidateUrl.split(/[?#]/, 1)[0];
  return {
    url,
    resourceType: request.resourceType(),
    status: null,
    failed: false,
    failure: null,
    resourceMiss: target.kind === "single-html" && protocol === "file:" && requestDocument !== candidateDocument
  };
}
function summarizeRequests(records) {
  return {
    documents: records.filter((record) => record.resourceType === "document").length,
    http: records.filter((record) => requestProtocol(record.url) === "http:").length,
    https: records.filter((record) => requestProtocol(record.url) === "https:").length,
    failed: records.filter((record) => record.failed).length,
    resourceMisses: records.filter((record) => record.resourceMiss).length,
    entries: records.map((record) => ({ ...record }))
  };
}
function singleHtmlRuntimeClean(target, runtime, requests) {
  if (target.kind !== "single-html") return true;
  const singleHtml = runtime?.singleHtml;
  return singleHtml?.ready === true && singleHtml.resourceMisses.length === 0 && singleHtml.externalRequests.length === 0 && requests.http === 0 && requests.https === 0 && requests.failed === 0 && requests.resourceMisses === 0;
}
function markResponse(records, response) {
  const record = records.get(response.request());
  if (record === void 0) return;
  record.status = response.status();
  if (record.status >= 400) record.resourceMiss = true;
}
function markFailed(records, request) {
  const record = records.get(request);
  if (record === void 0) return;
  record.failed = true;
  record.failure = request.failure()?.errorText ?? "request failed";
  record.resourceMiss = true;
}
async function openBrowserCaptureSession(root, options) {
  const backend = options.backend ?? "auto";
  const launchProfile = options.launchProfile ?? "development";
  const requestedTarget = options.target ?? { kind: "project" };
  if (options.host !== void 0 && (requestedTarget.kind !== "project" || options.serverUrl !== void 0)) {
    hostBindingError("host binding cannot modify an external server or a prebuilt HTML target");
  }
  const target = requestedTarget.kind === "single-html" ? { kind: "single-html", path: resolve(requestedTarget.path) } : { kind: "project" };
  if (target.kind === "single-html") {
    if (!target.path.toLowerCase().endsWith(".html")) {
      fail(
        "browser-capture-target-invalid",
        "single-html target path to end with .html",
        "Pass the exact forgeax project package --format single-html candidate.",
        { path: target.path }
      );
    }
    try {
      const info = await stat(target.path);
      if (!info.isFile()) throw new Error("target is not a regular file");
    } catch (cause) {
      fail(
        "browser-capture-target-missing",
        "single-html target path to exist",
        "Package the game first, then pass its candidate HTML path.",
        { path: target.path, reason: cause instanceof Error ? cause.message : String(cause) }
      );
    }
  }
  const facts = await readProjectFacts(root);
  if (!facts.ok) {
    throw new BrowserCaptureError(
      facts.error.code,
      facts.error.expected,
      facts.error.hint,
      facts.error.detail
    );
  }
  const width = options.width ?? 1280;
  const height = options.height ?? 720;
  const browserPath = await resolveBrowserExecutable(options.browser);
  if (options.browser !== void 0 && browserPath === void 0) {
    fail(
      "browser-capture-browser-missing",
      `a runnable browser at ${options.browser}`,
      "Install Chrome/Chromium or pass --browser with an executable path.",
      { browser: options.browser }
    );
  }
  const id = options.runId ?? newRunId();
  const outputDirectory = resolve(
    facts.value.root,
    options.outputDir ?? `artifacts/playthrough/${id}`
  );
  const reportPath = resolve(
    facts.value.root,
    options.report ?? resolve(outputDirectory, "run.json")
  );
  const port = target.kind === "project" ? options.port === void 0 || options.port === 0 ? await reservePort() : options.port : void 0;
  let server;
  let browser;
  let page;
  let carrierAttachment;
  let execution;
  let carrierFallbackReason;
  let display;
  let removePageListeners = () => {
  };
  try {
    if (target.kind === "project" && options.serverUrl === void 0) {
      const { createServer } = await import('vite');
      if (port === void 0) throw new Error("project capture did not reserve a port");
      server = await createServer(
        await createViteConfig(facts.value, "serve", "/", {
          server: { port, strictPort: true },
          ...options.host === void 0 ? {} : { host: options.host }
        })
      );
      await server.listen(port);
      if (server.httpServer !== void 0) {
        const serverUrl = server.resolvedUrls?.local?.[0] ?? `http://127.0.0.1:${port}/`;
        try {
          await waitForRuntimeCatalog(serverUrl, facts.value.id, 12e4);
        } catch (cause) {
          if (cause instanceof Error && cause.name === "DevKitWorkspaceError") {
            const detail = "detail" in cause && cause.detail !== null && typeof cause.detail === "object" ? cause.detail : {};
            throw new BrowserCaptureError(
              "browser-capture-catalog-not-ready",
              "the project Pack catalog to become ready before the browser page loads",
              "Wait for the project producer to finish, repair its diagnostics, and retry the capture.",
              detail
            );
          }
          throw cause;
        }
      }
    }
    display = options.headless === true ? { async close() {
    } } : await startVirtualDisplay(width, height);
    const captureDisplay = display;
    const icd = await lavapipeIcd();
    const consoleErrors = [];
    const pageErrors = [];
    const inputWarnings = [];
    const requestRecords = [];
    const requestByObject = /* @__PURE__ */ new Map();
    const pageListenerCleanups = [];
    removePageListeners = () => {
      for (const cleanup of pageListenerCleanups.splice(0)) cleanup();
    };
    const hasDisplay = display.value !== void 0;
    const headless = options.headless ?? (!hasDisplay && process.platform !== "linux");
    const nativeWindow = !headless && launchProfile === "development" && options.width === void 0 && options.height === void 0;
    const baseUrl = target.kind === "project" ? new URL(
      options.serverUrl ?? server?.resolvedUrls?.local[0] ?? `http://127.0.0.1:${port ?? 0}/`
    ) : void 0;
    const openPage = async (launchBackend) => {
      const useBorrowedCarrier = options.carrier !== void 0 && options.headless === false;
      if (useBorrowedCarrier && carrierAttachment === void 0) {
        if (options.carrierRun === void 0 || options.carrierGeneration === void 0) {
          fail(
            "browser-capture-carrier-input-invalid",
            "carrierRun and carrierGeneration for a borrowed headed page",
            "Pass the persistent Engine service/run identity and generation with the carrier adapter."
          );
        }
        const captureUrl3 = target.kind === "single-html" ? new URL(pathToFileURL(target.path).href) : new URL(baseUrl?.href ?? "http://127.0.0.1/");
        if (options.deterministic === true) captureUrl3.searchParams.set("forgeaxCapture", "1");
        const acquired = await acquireBrowserCarrierPage(
          options.carrier,
          {
            run: options.carrierRun,
            generation: options.carrierGeneration,
            headless: false,
            // `auto` is an intent, not a claim about the eventual adapter.
            // The page owner reports the observed backend after attachment.
            gpu: backend === "software" ? "software" : backend === "hardware" ? "hardware" : "auto",
            width,
            height,
            url: captureUrl3.href
          },
          { releaseReason: "engine-attach-failed" }
        );
        carrierAttachment = acquired.attachment;
        carrierFallbackReason = acquired.fallbackReason;
        if (carrierAttachment !== void 0) {
          page = carrierAttachment.page;
          execution = carrierAttachment.execution;
        }
      }
      const browserEnvironment = {
        ...Object.fromEntries(
          Object.entries(process.env).filter(
            (entry) => entry[1] !== void 0
          )
        ),
        ...launchBackend === "software" ? { LIBGL_ALWAYS_SOFTWARE: "1" } : {},
        ...captureDisplay.value === void 0 ? {} : { DISPLAY: captureDisplay.value }
      };
      const launchOptions = {
        headless,
        env: browserEnvironment,
        args: browserLaunchArgs(launchBackend, launchProfile, nativeWindow),
        ...browserPath === void 0 ? {} : { executablePath: browserPath }
      };
      if (page === void 0) {
        browser = await chromium.launch({ ...launchOptions, chromiumSandbox: true });
        page = await browser.newPage({
          ...nativeWindow ? { viewport: null } : { viewport: { width, height }, screen: { width, height }, deviceScaleFactor: 1 },
          colorScheme: "light",
          locale: "en-US",
          timezoneId: "UTC"
        });
      }
      const activePage = page;
      if (activePage === void 0) throw new Error("browser carrier did not provide a page");
      const activeRealm = execution?.realm ?? activePage;
      const targetFrame = execution?.kind === "frame" ? execution.realm : void 0;
      const captureUrl2 = target.kind === "single-html" ? new URL(pathToFileURL(target.path).href) : new URL(baseUrl?.href ?? "http://127.0.0.1/");
      if (options.deterministic === true) captureUrl2.searchParams.set("forgeaxCapture", "1");
      const onConsole = (message) => {
        if (message.type() !== "error") return;
        if (targetFrame !== void 0) {
          const location = message.location().url;
          const targetUrl = typeof targetFrame.url === "function" ? targetFrame.url() : "";
          if (location !== "" && targetUrl !== "" && location !== targetUrl) return;
        }
        const text = message.text();
        if (isRecoverablePointerLockDiagnostic(text)) inputWarnings.push(text);
        else consoleErrors.push(text);
      };
      const onPageError = (error) => {
        if (targetFrame !== void 0) return;
        const text = String(error);
        if (isRecoverablePointerLockDiagnostic(text)) inputWarnings.push(text);
        else pageErrors.push(text);
      };
      const onRequest = (request) => {
        if (targetFrame !== void 0 && request.frame() !== targetFrame) return;
        const record = requestRecord(request, target, captureUrl2.href);
        requestRecords.push(record);
        requestByObject.set(request, record);
      };
      const onResponse = (response) => {
        if (targetFrame !== void 0 && response.frame() !== targetFrame) return;
        markResponse(requestByObject, response);
      };
      const onRequestFailed = (request) => {
        if (targetFrame !== void 0 && request.frame() !== targetFrame) return;
        markFailed(requestByObject, request);
      };
      activePage.on("console", onConsole);
      activePage.on("pageerror", onPageError);
      activePage.on("request", onRequest);
      activePage.on("response", onResponse);
      activePage.on("requestfailed", onRequestFailed);
      pageListenerCleanups.push(
        () => activePage.off?.("console", onConsole),
        () => activePage.off?.("pageerror", onPageError),
        () => activePage.off?.("request", onRequest),
        () => activePage.off?.("response", onResponse),
        () => activePage.off?.("requestfailed", onRequestFailed)
      );
      await activeRealm.goto(captureUrl2.href, { waitUntil: "domcontentloaded", timeout: 12e4 });
      const readinessDeadline = Date.now() + 12e4;
      while (true) {
        await activeRealm.waitForFunction(
          (requireUi) => {
            if (document.querySelector("#forgeax-fatal")?.checkVisibility()) return true;
            const canvas = document.querySelector("canvas");
            if (!(canvas instanceof HTMLCanvasElement) || canvas.width <= 0 || canvas.height <= 0)
              return false;
            if (!requireUi) return true;
            const uiRoot = document.querySelector("#game-ui");
            return uiRoot !== null && uiRoot.childElementCount > 0;
          },
          options.requireUi === true,
          { timeout: Math.max(1, readinessDeadline - Date.now()) }
        );
        try {
          return await runtimeWitness(activeRealm);
        } catch (error) {
          if (!(error instanceof Error) || !error.message.includes("Execution context was destroyed") || Date.now() >= readinessDeadline) {
            throw error;
          }
        }
      }
    };
    const initialLaunchBackend = backend === "software" ? "software" : "hardware";
    let runtime = await openPage(initialLaunchBackend);
    let observed = classifyCaptureAdapter(runtime.adapter);
    const initialAdapterError = runtime.adapterError;
    if (backend === "auto" && observed !== "hardware" && carrierAttachment === void 0) {
      removePageListeners();
      await browser?.close();
      browser = void 0;
      page = void 0;
      consoleErrors.length = 0;
      pageErrors.length = 0;
      inputWarnings.length = 0;
      requestRecords.length = 0;
      requestByObject.clear();
      runtime = await openPage("software");
      observed = classifyCaptureAdapter(runtime.adapter);
    }
    if (backend !== "auto" && observed !== backend) {
      fail(
        "browser-capture-backend-unavailable",
        `the explicitly requested ${backend} adapter`,
        "Use backend: auto to allow fallback, or repair the requested browser backend.",
        {
          requested: backend,
          actual: observed,
          adapter: runtime.adapter,
          cause: runtime.adapterError
        }
      );
    }
    if (backend === "auto" && observed === "unknown") {
      fail(
        "browser-capture-backend-unavailable",
        "the browser to expose either a hardware or software WebGPU adapter",
        "The browser exposed no usable adapter for the requested launch profile; use development for the software fallback or repair the browser environment.",
        {
          requested: backend,
          actual: observed,
          launchProfile,
          initialAdapterError,
          fallbackAdapterError: runtime.adapterError
        }
      );
    }
    const captureUrl = target.kind === "single-html" ? new URL(pathToFileURL(target.path).href) : new URL(baseUrl?.href ?? "http://127.0.0.1/");
    if (options.deterministic === true) captureUrl.searchParams.set("forgeaxCapture", "1");
    if (page === void 0 || browser === void 0 && carrierAttachment === void 0) {
      fail(
        "browser-capture-browser-unavailable",
        "the browser capture session to open",
        "Inspect the browser launch diagnostic and retry with --browser or --headless."
      );
    }
    const nativeViewport = nativeWindow ? await page.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight,
      deviceScaleFactor: window.devicePixelRatio
    })) : void 0;
    const captures = [];
    let latestRuntime = runtime;
    let closed = false;
    const report = {
      schemaVersion: "2.0.0",
      runId: id,
      ok: false,
      mode: "browser-compositor",
      root: facts.value.root,
      url: captureUrl.href,
      target,
      carrier: carrierAttachment === void 0 ? "private-browser" : "borrowed",
      ...carrierAttachment === void 0 ? {} : { carrierTarget: carrierAttachment.target },
      ...carrierFallbackReason === void 0 ? {} : { carrierFallbackReason },
      launchProfile,
      report: reportPath,
      backendRequested: backend,
      backend: observed,
      ...backend === "auto" && observed === "software" ? { fallbackReason: initialAdapterError ?? "The browser selected a software adapter." } : {},
      deterministicRequested: options.deterministic === true,
      viewport: {
        width: nativeViewport?.width ?? width,
        height: nativeViewport?.height ?? height,
        deviceScaleFactor: nativeViewport?.deviceScaleFactor ?? 1,
        colorProfile: "srgb",
        colorScheme: "light",
        locale: "en-US",
        timezone: "UTC"
      },
      browser: {
        version: browser?.version() ?? "borrowed-carrier",
        executable: carrierAttachment === void 0 ? browserPath ?? "borrowed-carrier" : "borrowed-carrier"
      },
      display: display.value ?? null,
      lavapipeIcd: icd ?? null,
      captures,
      requests: summarizeRequests(requestRecords),
      singleHtml: runtime.singleHtml,
      consoleErrors,
      pageErrors,
      inputWarnings,
      boundary: "Browser-compositor capture is visual iteration evidence, not physical-GPU performance, HDR-display output, or release acceptance."
    };
    await writeRunReport(report);
    const updateReport = async () => {
      const requests = summarizeRequests(requestRecords);
      Object.assign(report, {
        requests,
        singleHtml: latestRuntime?.singleHtml ?? null,
        ok: captures.length > 0 && captures.every((capture) => capture.ok) && consoleErrors.length === 0 && pageErrors.length === 0 && latestRuntime?.fatalError == null && singleHtmlRuntimeClean(target, latestRuntime, requests)
      });
      await writeRunReport(report);
    };
    const close = async () => {
      if (closed) return;
      closed = true;
      removePageListeners();
      await Promise.allSettled([
        browser?.close(),
        carrierAttachment?.close("engine-capture-close"),
        display?.close(),
        server?.close()
      ]);
      Object.assign(report, { closedAt: (/* @__PURE__ */ new Date()).toISOString() });
      await updateReport();
    };
    return {
      page,
      ...execution === void 0 ? {} : { execution },
      url: captureUrl.href,
      reportPath,
      async capture(checkpoint, captureOptions = {}) {
        if (closed) {
          fail(
            "browser-capture-session-closed",
            "capture to run inside an open browser session",
            "Open one session, complete all checkpoints, then close it.",
            { report: reportPath }
          );
        }
        const activePage = page;
        if (activePage === void 0) {
          fail(
            "browser-capture-browser-unavailable",
            "an open Playwright page",
            "Inspect the browser launch diagnostic and retry the capture."
          );
        }
        const activeRealm = execution?.realm ?? activePage;
        const index = captures.length + 1;
        const output = resolve(
          facts.value.root,
          captureOptions.output ?? resolve(
            outputDirectory,
            `${String(index).padStart(3, "0")}-${checkpointSlug(checkpoint)}.png`
          )
        );
        let imageSaved = false;
        const expectedReady = checkpoint ?? (options.deterministic === true ? "true" : void 0);
        const observe = captureOptions.purpose === "observe";
        const timeoutMs = captureOptions.timeoutMs ?? 12e4;
        if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 12e4) {
          fail(
            "browser-capture-timeout-invalid",
            "timeoutMs within (0, 120000]",
            "Pass a finite positive capture budget."
          );
        }
        const deadline = Date.now() + timeoutMs;
        const withinBudget = async (condition, operation) => {
          const remaining = deadline - Date.now();
          const timeout = () => new BrowserCaptureError(
            "browser-capture-timeout",
            condition,
            `Capture timed out waiting for ${condition}; inspect the run report.`,
            {
              condition,
              checkpoint: expectedReady ?? null,
              timeoutMs,
              report: reportPath,
              ...imageSaved ? { output } : {}
            }
          );
          if (remaining <= 0) throw timeout();
          let timer;
          try {
            return await Promise.race([
              operation(remaining),
              new Promise((_resolve, reject) => {
                timer = setTimeout(() => reject(timeout()), remaining);
              })
            ]);
          } catch (error) {
            if (error instanceof Error && error.name === "TimeoutError") throw timeout();
            throw error;
          } finally {
            if (timer !== void 0) clearTimeout(timer);
          }
        };
        await withinBudget(
          "a submitted frame",
          (remaining) => activeRealm.waitForFunction(
            ({ datasetKey, afterFrameId }) => Number(document.documentElement.dataset[datasetKey]) > (afterFrameId ?? 0) || document.querySelector("#forgeax-fatal")?.checkVisibility() === true,
            {
              datasetKey: FORGEAX_FRAME_SUBMITTED_DATASET,
              afterFrameId: captureOptions.afterFrameId
            },
            { timeout: remaining }
          )
        );
        if (expectedReady !== void 0) {
          await withinBudget(
            "the requested checkpoint",
            (remaining) => activeRealm.waitForFunction(
              (expected) => document.documentElement.dataset.forgeaxCaptureReady === expected || document.querySelector("#forgeax-fatal")?.checkVisibility() === true,
              expectedReady,
              { timeout: remaining }
            )
          );
        }
        const readFrame = async () => {
          const image = await withinBudget(
            "a canvas witness",
            () => screenshotCanvasWitness(
              execution ?? { kind: "page", ownerPage: activePage, realm: activePage },
              deadline,
              { width, height }
            )
          );
          const runtime3 = await withinBudget(
            "runtime diagnostics",
            () => runtimeWitness(activeRealm, false)
          );
          return { ...image, runtime: runtime3 };
        };
        let captured = await readFrame();
        await mkdir(dirname(output), { recursive: true });
        await writeFile(output, captured.png);
        imageSaved = true;
        await updateReport();
        const waitForRendered = async () => {
          while (!observe && !captured.pixels.rendered && captured.runtime.fatalError === null && Date.now() < deadline) {
            try {
              await withinBudget(
                "non-flat canvas pixels",
                (remaining) => activeRealm.waitForTimeout(Math.min(500, remaining))
              );
              captured = await readFrame();
            } catch (error) {
              if (error instanceof BrowserCaptureError && error.code === "browser-capture-timeout")
                break;
              throw error;
            }
          }
        };
        await waitForRendered();
        const waitMs = captureOptions.waitMs ?? 0;
        if (waitMs > 0 && captured.runtime.fatalError === null) {
          await withinBudget("the requested delay", () => activeRealm.waitForTimeout(waitMs));
          captured = await readFrame();
          await waitForRendered();
        }
        let png = captured.png;
        let runtime2 = captured.runtime;
        if (observe || captured.pixels.rendered || runtime2.fatalError !== null) {
          png = await withinBudget(
            "a compositor screenshot",
            () => captureBrowserExecutionSurface(
              execution ?? { kind: "page", ownerPage: activePage, realm: activePage },
              deadline,
              { width, height }
            )
          );
          runtime2 = await withinBudget("runtime diagnostics", () => runtimeWitness(activeRealm));
        }
        latestRuntime = runtime2;
        const requestSummary = summarizeRequests(requestRecords);
        const uiPresent = runtime2.domUi.rootChildren > 0;
        const requireUi = captureOptions.requireUi ?? options.requireUi ?? false;
        const captureBackend = classifyCaptureAdapter(runtime2.adapter);
        if (captureBackend !== "unknown") Object.assign(report, { backend: captureBackend });
        const backendMatches = backend === "auto" || captureBackend === backend;
        const ok3 = runtime2.canvas !== null && (observe || captured.pixels.rendered) && backendMatches && runtime2.engineFrameId !== null && runtime2.fatalError === null && (observe || consoleErrors.length === 0 && pageErrors.length === 0) && singleHtmlRuntimeClean(target, runtime2, requestSummary) && (expectedReady === void 0 || runtime2.captureReady === expectedReady) && (!requireUi || uiPresent);
        await mkdir(dirname(output), { recursive: true });
        await writeFile(output, png);
        const record = {
          index,
          checkpoint: checkpoint ?? null,
          ok: ok3,
          output,
          digest: captureDigest(png),
          pixels: captured.pixels,
          runtime: runtime2
        };
        captures.push(record);
        await updateReport();
        if (!ok3) {
          fail(
            "browser-capture-runtime-failed",
            "non-flat canvas pixels, the requested browser backend/checkpoint, and no Engine or browser errors",
            "Inspect the run report and repair the first browser runtime failure.",
            { checkpoint: checkpoint ?? null, output, report: reportPath }
          );
        }
        return record;
      },
      report: () => report,
      close
    };
  } catch (cause) {
    removePageListeners();
    await Promise.allSettled([
      browser?.close(),
      carrierAttachment?.close("engine-capture-failed"),
      display?.close(),
      server?.close()
    ]);
    throw cause;
  }
}
function createBrowserCapture(root) {
  const sessions = /* @__PURE__ */ new Set();
  return {
    async open(options) {
      const session = await openBrowserCaptureSession(root, options);
      sessions.add(session);
      return session;
    },
    async close() {
      await Promise.allSettled([...sessions].map((session) => session.close()));
      sessions.clear();
    }
  };
}
function captureCommandError(cause) {
  if (cause instanceof BrowserCaptureError) {
    return {
      code: cause.code,
      expected: cause.expected,
      hint: cause.hint,
      detail: cause.detail
    };
  }
  return commandError(cause, "browser-capture-failed");
}
async function browserCaptureCommand(options) {
  const root = options.root ?? process.cwd();
  const output = resolve(root, options.output ?? "artifacts/capture/game-ui.png");
  const browser = createBrowserCapture(root);
  let captureSession;
  const artifacts = () => (captureSession?.report().captures ?? []).map((record) => ({
    kind: "png",
    uri: record.output,
    mediaType: "image/png",
    digest: record.digest
  }));
  try {
    const backend = options.backend ?? "auto";
    const session = await browser.open({
      backend,
      ...options.browser === void 0 ? {} : { browser: options.browser },
      width: options.width ?? 1280,
      height: options.height ?? 720,
      ...options.port === void 0 ? {} : { port: options.port },
      ...options.headless === void 0 ? {} : { headless: options.headless },
      ...options.carrier === void 0 ? {} : { carrier: options.carrier },
      ...options.carrierRun === void 0 ? {} : { carrierRun: options.carrierRun },
      ...options.carrierGeneration === void 0 ? {} : { carrierGeneration: options.carrierGeneration },
      requireUi: options.requireUi === true,
      deterministic: options.deterministic === true,
      outputDir: dirname(output),
      report: evidencePath(output)
    });
    captureSession = session;
    await session.capture(options.deterministic === true ? "true" : void 0, {
      output,
      waitMs: options.waitMs ?? 4e3,
      requireUi: options.requireUi === true
    });
    await session.close();
    return { ok: true, value: session.report(), artifacts: artifacts() };
  } catch (cause) {
    return { ok: false, error: captureCommandError(cause), artifacts: artifacts() };
  } finally {
    await browser.close();
  }
}

export { DevKitWorkspaceError, acquireBrowserCarrierPage, browserCaptureCommand, browserLaunchArgs, captureBrowserExecutionSurface, classifyCaptureAdapter, createBrowserCapture, createDevKitWorkspaceProvider, resolveBrowserExecutable, summarizeCapturePixels };
//# sourceMappingURL=chunk-I7CPTDO2.mjs.map
//# sourceMappingURL=chunk-I7CPTDO2.mjs.map