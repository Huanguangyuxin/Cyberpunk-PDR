#!/usr/bin/env node
import { filesystemPathSegments, isFilesystemPathWithin, filesystemPathKey } from './chunk-X5IGMUF7.mjs';
import { createHash } from 'crypto';
import { realpath, stat, readdir } from 'fs/promises';
import { createRequire } from 'module';
import { relative, resolve, dirname, isAbsolute } from 'path';
import { resolvePluginProgram, pluginAssetOutputProducer } from '@forgeax/engine-import';
import { listPackSourcePaths, scanInventory } from '@forgeax/engine-pack/scanner';
import { projectDirectPackJson, validatePluginAssetSource, AssetGuid, PackageId, executePackBuild, resolvePackParameterValues } from '@forgeax/engine-pack/source';
import { createScriptablePackSourceSnapshot, createScriptablePackModuleExecutorPool, loadScriptablePack, createLazyScriptablePackDefinition } from '@forgeax/engine-pack/source-node';
import { err } from '@forgeax/engine-types';
import ts from 'typescript';

function sourceInputPathCandidates(path) {
  const normalized = filesystemPathKey(path);
  const windows = normalized.replaceAll("/", "\\");
  return normalized === windows ? [normalized] : [normalized, windows];
}
function hasPluginSourceInput(sourceInputs, path) {
  return sourceInputPathCandidates(path).some((candidate) => sourceInputs.has(candidate));
}
function isPluginAssetSourceIgnoredPath(root, path) {
  return filesystemPathSegments(relative(root, path)).some(
    (part) => part === "node_modules" || part === ".forgeax"
  );
}
function digest(value) {
  return `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}
function failure(path, reason) {
  const diagnostic = {
    code: "plugin-bootstrap-failed",
    expected: "deterministic plugin definitions discoverable without cooked reads",
    hint: "repair the source or move build-root definitions to a self-contained Pack",
    detail: { sourcePath: path, cause: reason }
  };
  throw Object.assign(new Error(JSON.stringify(diagnostic)), diagnostic);
}
async function observeCompilerConfig(snapshot, path, seen = /* @__PURE__ */ new Set()) {
  if (seen.has(path)) return;
  seen.add(path);
  if (!await snapshot.observeFile(path)) return;
  const parsed = ts.parseConfigFileTextToJson(path, await snapshot.readText(path));
  const extensions = parsed.config?.extends;
  for (const specifier of typeof extensions === "string" ? [extensions] : Array.isArray(extensions) ? extensions : []) {
    if (typeof specifier !== "string") continue;
    if (specifier.startsWith(".")) {
      const candidate = resolve(dirname(path), specifier);
      const selected = await snapshot.observeFile(candidate) ? candidate : candidate.endsWith(".json") ? candidate : `${candidate}.json`;
      await observeCompilerConfig(snapshot, selected, seen);
    } else {
      await observeCompilerConfig(snapshot, createRequire(path).resolve(specifier), seen);
    }
  }
}
function assertPluginSourceRevision(path, expected, actual) {
  if (actual !== expected)
    failure(path, { reason: "source changed during plugin compilation", expected, actual });
}
async function capturePluginProgramInputs(projectRoot, inventory, module, resolveModule) {
  const root = await realpath(projectRoot);
  const resolveLocal = async (importer, specifier) => {
    const resolved = resolveModule ? await resolveModule(specifier, importer) : specifier;
    if (!resolved || !isAbsolute(resolved)) return void 0;
    let path;
    try {
      path = await realpath(resolved.split("?")[0] ?? resolved);
    } catch (cause) {
      if (cause.code === "ENOENT" && (!resolveModule || isPluginAssetSourceIgnoredPath(root, resolved.split("?")[0] ?? resolved)))
        return void 0;
      throw cause;
    }
    if (!resolveModule && !(await stat(path)).isFile()) return void 0;
    if (!isFilesystemPathWithin(root, path, false) || isPluginAssetSourceIgnoredPath(root, path))
      return void 0;
    return resolved.split("?")[0] ?? resolved;
  };
  const entry = await resolveLocal(resolve(root, "package.json"), module);
  if (!entry) return;
  const inputs = await inventory.sourceSnapshot.inventory(
    entry,
    void 0,
    resolveModule ? resolveLocal : void 0
  );
  const directories = /* @__PURE__ */ new Set();
  for (const input of inputs) {
    let directory = dirname(input.path);
    while (isFilesystemPathWithin(root, directory, true) && !directories.has(directory)) {
      directories.add(directory);
      await inventory.sourceSnapshot.observeFile(resolve(directory, "package.json"));
      await observeCompilerConfig(inventory.sourceSnapshot, resolve(directory, "tsconfig.json"));
      if (directory === root) break;
      directory = dirname(directory);
    }
  }
}
async function capturePluginSourceInput(snapshot, path, revision) {
  const actual = await snapshot.digest(path);
  if (actual !== revision)
    failure(path, {
      reason: "source changed during plugin compilation",
      expected: revision,
      actual
    });
}
async function hasUnboundedFilesystemReads(snapshot) {
  for (const path of snapshot.inputs.keys()) {
    if (!/\.[cm]?[jt]sx?$/.test(path)) continue;
    const source = await snapshot.readText(path);
    if (ts.preProcessFile(source, true, true).importedFiles.some(({ fileName }) => /^(?:node:)?fs(?:\/promises)?$/.test(fileName)) || /\b(?:readFile(?:Sync)?|readdir(?:Sync)?|createReadStream)\s*\(/.test(source))
      return true;
  }
  return false;
}
async function filesystemSourcePaths(root) {
  const ignored = /* @__PURE__ */ new Set([
    "node_modules",
    ".git",
    ".forgeax",
    ".assetlib",
    ".worktrees",
    "artifacts",
    "dist",
    "coverage",
    "__tests__",
    ".forgeax-harness"
  ]);
  const paths = [];
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (ignored.has(entry.name)) continue;
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile() && /(?:\.[cm]?[jt]sx?|\.wgsl|\.json|lock\.yaml|bun\.lock)$/.test(entry.name))
        paths.push(path);
    }
  }
  await visit(root);
  return paths.sort();
}
async function captureFilesystemSourceInputs(root, snapshot) {
  const paths = await snapshot.observePaths(root, () => filesystemSourcePaths(root));
  for (let start = 0; start < paths.length; start += 16)
    await Promise.all(paths.slice(start, start + 16).map((path) => snapshot.digest(path)));
  return paths;
}
async function discoverPluginAssets(facts, scannedInventory, sourceSnapshot, productCache) {
  const retainedInventory = scannedInventory !== void 0 && sourceSnapshot === void 0;
  const capturedSources = sourceSnapshot ?? createScriptablePackSourceSnapshot();
  const sourceRoots = facts.assetRoots.map((path) => resolve(facts.root, path));
  const sourcePaths = await capturedSources.observePaths(
    facts.root,
    () => listPackSourcePaths(sourceRoots, {
      ignorePath: (path) => isPluginAssetSourceIgnoredPath(facts.root, path)
    })
  );
  let filesystemInputs;
  for (const path of sourcePaths)
    if (path.endsWith(".pack.ts")) await capturedSources.inventory(path);
  if (await hasUnboundedFilesystemReads(capturedSources))
    filesystemInputs = await captureFilesystemSourceInputs(facts.root, capturedSources);
  let inventory = scannedInventory;
  if (!inventory) {
    const scanned = await scanInventory(
      facts.assetRoots.map((root) => resolve(facts.root, root)),
      {
        ignorePath: (path) => isPluginAssetSourceIgnoredPath(facts.root, path),
        scriptablePack: { metadataOnly: true, sourceSnapshot: capturedSources }
      }
    );
    if (!scanned.ok) throw scanned.error;
    inventory = scanned.value;
  }
  const assets = /* @__PURE__ */ new Map();
  for (const file of [
    "forge.json",
    "package.json",
    "pnpm-lock.yaml",
    "bun.lock",
    "package-lock.json",
    "tsconfig.json"
  ])
    await capturedSources.observeFile(resolve(facts.root, file));
  await observeCompilerConfig(capturedSources, resolve(facts.root, "tsconfig.json"));
  for (const declaration of inventory.declarations.values()) {
    await capturePluginSourceInput(
      capturedSources,
      declaration.sourcePath,
      declaration.sourceRevision
    );
    if (declaration.format === "pack.ts")
      for (const input of declaration.sourceClosure)
        await capturePluginSourceInput(capturedSources, input.path, input.digest);
  }
  const sourceInputs = capturedSources.inputs;
  const programInputs = { sourceSnapshot: capturedSources };
  const deferred = [];
  const sourceDeclarations = inventory.declarations;
  const declarations = [...sourceDeclarations.values()];
  async function add(sourcePath, revision, packageId, outputs) {
    for (const [sourceKey, output] of Object.entries(outputs)) {
      if (output.kind !== "plugin") continue;
      const declaration = sourceDeclarations.get(sourcePath);
      await capturePluginSourceInput(
        capturedSources,
        sourcePath,
        declaration?.sourceRevision ?? revision
      );
      if (declaration?.format === "pack.ts")
        for (const input of declaration.sourceClosure)
          await capturePluginSourceInput(capturedSources, input.path, input.digest);
      const source = validatePluginAssetSource(output);
      if (!source.ok) failure(sourcePath, source.error);
      const guid = AssetGuid.format(AssetGuid.derive(packageId, sourceKey));
      if (assets.has(guid)) failure(sourcePath, `duplicate plugin GUID ${guid}`);
      const resolved = resolvePluginProgram(sourcePath, source.value.module, facts.root);
      await capturePluginProgramInputs(facts.root, programInputs, resolved.module);
      const contract = source.value.toolContract;
      if (contract && "specifier" in contract)
        await capturePluginProgramInputs(
          facts.root,
          programInputs,
          contract.specifier.startsWith(".") ? resolve(dirname(sourcePath), contract.specifier) : contract.specifier
        );
      const cooked = await pluginAssetOutputProducer.produce({
        guid,
        sourceKey,
        asset: source.value,
        sourcePath,
        projectRoot: facts.root
      });
      if (!cooked.ok) failure(sourcePath, cooked.error);
      const asset = cooked.value.payload;
      assets.set(guid, {
        definition: { guid, asset, evidence: { kind: "source", revision, digest: digest(asset) } },
        source: source.value,
        sourcePath,
        sourceKey,
        refs: cooked.value.refs.map((ref) => ref.guid),
        module: resolved.module,
        export: resolved.export
      });
    }
  }
  async function evaluate(sourcePath, definition, packageId = definition.packageId, overrides = {}) {
    const declaration = sourceDeclarations.get(sourcePath);
    if (productCache !== void 0 && declaration?.format === "pack.ts" && PackageId.format(packageId) === PackageId.format(declaration.definition.packageId) && Object.keys(overrides).length === 0) {
      const product = await productCache.read({
        definition,
        sourcePath,
        sourceClosure: declaration.sourceClosure,
        publicationGeneration: 1
      });
      if (product !== void 0)
        return Object.fromEntries(
          product.stagedOutputs.map((output) => [output.sourceKey, output.asset])
        );
    }
    let blocked = false;
    const context = {
      packageId,
      async readByGuid(guid) {
        blocked = true;
        return err({
          code: "plugin-bootstrap-read-blocked",
          expected: "source-only bootstrap inputs",
          hint: "defer this Pack to normal cooking",
          detail: { guid: AssetGuid.format(guid) }
        });
      }
    };
    const result = await executePackBuild(definition, {
      ...context,
      ..."parameters" in definition ? { values: resolvePackParameterValues(definition, overrides).unwrap() } : {}
    });
    if (blocked) return void 0;
    if (!result.ok) failure(sourcePath, result.error);
    return result.value;
  }
  const batchSize = retainedInventory ? 1 : 4;
  const executors = createScriptablePackModuleExecutorPool({
    maxWorkers: batchSize,
    maxTasksPerWorker: 1
  });
  const definitionFor = (declaration) => retainedInventory ? declaration.definition : createLazyScriptablePackDefinition({
    sourcePath: declaration.sourcePath,
    definition: declaration.definition,
    sourceClosure: declaration.sourceClosure,
    sourceSnapshot: capturedSources,
    executors
  });
  try {
    for (let start = 0; start < declarations.length; start += batchSize) {
      const batch = declarations.slice(start, start + batchSize);
      const completed = await Promise.allSettled(
        batch.map(async (declaration) => ({
          declaration,
          outputs: declaration.format === "pack.ts" && declaration.definition.plugins === true ? await evaluate(declaration.sourcePath, definitionFor(declaration)) : void 0
        }))
      );
      for (const result of completed) {
        if (result.status === "rejected") throw result.reason;
        const { declaration, outputs } = result.value;
        if (declaration.format === "pack.ts") {
          if (declaration.definition.plugins !== true) continue;
          if (outputs === void 0) deferred.push(relative(facts.root, declaration.sourcePath));
          else
            await add(
              declaration.sourcePath,
              declaration.sourceRevision,
              declaration.definition.packageId,
              outputs
            );
        } else if (declaration.format === "pack.json" && declaration.value.schemaVersion === "3.0.0") {
          const parsed = declaration.value;
          if (parsed.format !== "direct") continue;
          const projected = projectDirectPackJson(parsed);
          const outputs2 = Object.fromEntries(
            projected.assets.map((asset) => [
              asset.sourceKey,
              { ...asset.payload, kind: asset.kind }
            ])
          );
          await add(declaration.sourcePath, declaration.sourceRevision, parsed.packageId, outputs2);
        }
      }
    }
    for (const [sourcePath, instance] of inventory.instances) {
      if (instance.root.definition.plugins !== true) continue;
      await capturePluginSourceInput(capturedSources, sourcePath, instance.sourceRevision);
      const definition = retainedInventory ? (await loadScriptablePack(instance.root.sourcePath)).unwrap() : definitionFor(instance.root);
      const outputs = await evaluate(
        instance.root.sourcePath,
        definition,
        instance.packageId,
        instance.values
      );
      if (outputs === void 0) deferred.push(relative(facts.root, instance.root.sourcePath));
      else
        await add(
          instance.root.sourcePath,
          digest([instance.sourceRevision, instance.root.sourceRevision]),
          instance.packageId,
          outputs
        );
    }
    if (filesystemInputs === void 0 && await hasUnboundedFilesystemReads(capturedSources))
      filesystemInputs = await captureFilesystemSourceInputs(facts.root, capturedSources);
    return {
      assets,
      sourceInputs,
      sourceSnapshot: capturedSources,
      filesystemInputs,
      deferred: [...new Set(deferred)].sort()
    };
  } finally {
    await executors.dispose();
  }
}
function pluginAssetClosure(inventory, root) {
  if (!root) return [];
  const result = /* @__PURE__ */ new Map();
  const queue = [root];
  for (const guid of queue) {
    if (result.has(guid)) continue;
    const record = inventory.assets.get(guid);
    if (!record) failure(guid, { missingPlugin: guid, deferredSources: inventory.deferred });
    result.set(guid, record);
    for (const ref of record.refs) if (inventory.assets.has(ref)) queue.push(ref);
  }
  return [...result.values()];
}
async function publishedPluginInventory(projectRoot, bootstrap, pack) {
  await assertPluginSourceInputs(bootstrap, projectRoot);
  const assets = new Map(bootstrap.assets);
  const published = await pack.readPluginDefinitions();
  for (const item of published) {
    const previous = bootstrap.assets.get(item.definition.guid);
    if (previous && digest(previous.definition.asset) !== digest(item.definition.asset)) {
      failure(
        previous.sourcePath,
        "plugin definition changed between bootstrap and ordinary cooking"
      );
    }
    const program = item.definition.asset.program;
    const split = program.lastIndexOf("#");
    const locator = program.slice(0, split);
    const name = decodeURIComponent(program.slice(split + 1));
    const module = locator.startsWith("project:") ? resolve(projectRoot, locator.slice(8)) : locator.slice(4);
    if (!locator.startsWith("project:") && !locator.startsWith("npm:") || split < 0)
      failure(item.sourcePath, "invalid program locator");
    await capturePluginProgramInputs(projectRoot, bootstrap, module);
    assets.set(
      item.definition.guid,
      previous ? { ...previous, definition: item.definition } : {
        ...item,
        sourceKey: item.definition.guid,
        module,
        export: name,
        source: { kind: "plugin", module: { specifier: module, export: name } }
      }
    );
  }
  return { ...bootstrap, assets, deferred: [] };
}
async function assertPluginSourceInputs(inventory, projectRoot) {
  const verified = await inventory.sourceSnapshot.verify();
  if (!verified.ok)
    failure(String(verified.error.detail.sourcePath ?? projectRoot), {
      ...verified.error.detail,
      reason: "source changed during plugin compilation",
      conflict: verified.error.detail.reason
    });
}

export { assertPluginSourceInputs, assertPluginSourceRevision, capturePluginProgramInputs, discoverPluginAssets, hasPluginSourceInput, isPluginAssetSourceIgnoredPath, pluginAssetClosure, publishedPluginInventory };
//# sourceMappingURL=chunk-5KRT3YGN.mjs.map
//# sourceMappingURL=chunk-5KRT3YGN.mjs.map