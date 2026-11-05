#!/usr/bin/env node
import { filesystemPathRelative } from './chunk-X5IGMUF7.mjs';
import { readProjectFacts } from './chunk-VNP4GISC.mjs';
import { createHash } from 'crypto';
import { readFile, access, readdir, stat, realpath, rm, mkdir, writeFile, rename } from 'fs/promises';
import { resolve, dirname, sep } from 'path';

// src/execution-workers.ts
var policy = { enum: ["auto", true, false] };
var workerProperties = { engine: policy, render: policy, kernels: policy };
var executionWorkersSchema = {
  type: "object",
  additionalProperties: false,
  properties: workerProperties
};
function executionWorkers(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value) || Object.entries(value).some(
    ([key, policy2]) => !Object.hasOwn(workerProperties, key) || policy2 !== "auto" && typeof policy2 !== "boolean"
  )) {
    throw new Error(
      "workers requires an object with engine, render and kernels policies: auto, true or false"
    );
  }
  return value;
}
function environmentExecutionWorkers() {
  const value = process.env.FORGEAX_EXECUTION_WORKERS;
  return value === void 0 ? {} : executionWorkers(JSON.parse(value));
}
var ENGINE_BINDING_SCHEMA_VERSION = "1.0.0";
var bindingFile = (root) => resolve(root, ".forgeax", "engine-binding.json");
function bindingError(code, expected, hint, detail = {}) {
  return { ok: false, error: { code, expected, hint, detail } };
}
function isMissing(cause) {
  return cause !== null && typeof cause === "object" && "code" in cause && cause.code === "ENOENT";
}
async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
function parseBinding(value, path) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return bindingError(
      "engine-binding-invalid",
      "engine-binding.json to contain one object",
      "Run forgeax project engine unlink, then select a binding again.",
      { path }
    );
  }
  const candidate = value;
  if (candidate.schemaVersion !== ENGINE_BINDING_SCHEMA_VERSION) {
    return bindingError(
      "engine-binding-version-unsupported",
      `engine-binding.json schemaVersion ${ENGINE_BINDING_SCHEMA_VERSION}`,
      "Upgrade the SDK or remove the stale binding with forgeax project engine unlink.",
      { path, schemaVersion: candidate.schemaVersion ?? null }
    );
  }
  if (typeof candidate.path !== "string" || candidate.path.length === 0) {
    return bindingError(
      "engine-binding-path-missing",
      "engine-binding.json to contain one non-empty local Engine path",
      "Run forgeax project engine use-local <engine-directory>.",
      { path }
    );
  }
  return {
    ok: true,
    value: {
      schemaVersion: ENGINE_BINDING_SCHEMA_VERSION,
      path: resolve(candidate.path)
    }
  };
}
async function readEngineBinding(rootInput = process.cwd()) {
  const root = resolve(rootInput);
  const path = bindingFile(root);
  try {
    const value = JSON.parse(await readFile(path, "utf8"));
    return parseBinding(value, path);
  } catch (cause) {
    if (isMissing(cause)) return { ok: true, value: null };
    return bindingError(
      "engine-binding-unreadable",
      "engine-binding.json to be readable JSON",
      "Repair or remove .forgeax/engine-binding.json, then select a binding again.",
      { path, reason: cause instanceof Error ? cause.message : String(cause) }
    );
  }
}
async function writeEngineBinding(root, binding) {
  const path = bindingFile(root);
  const partial = `${path}.partial-${process.pid}`;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(partial, `${JSON.stringify(binding, null, 2)}
`, "utf8");
  await rename(partial, path);
}
function conditionalExport(value) {
  if (typeof value === "string") return value;
  if (value === null || typeof value !== "object" || Array.isArray(value)) return void 0;
  const record = value;
  for (const key of ["import", "browser", "node", "default", "require", "types"]) {
    const candidate = record[key];
    const selected = conditionalExport(candidate);
    if (selected !== void 0) return selected;
  }
  return void 0;
}
function canonicalJson(value) {
  if (Array.isArray(value)) return value.map((item) => canonicalJson(item));
  if (value !== null && typeof value === "object") {
    const result = {};
    for (const key of Object.keys(value).sort())
      result[key] = canonicalJson(value[key]);
    return result;
  }
  return value;
}
function digestBytes(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}
function digestText(value) {
  return digestBytes(Buffer.from(value, "utf8"));
}
function manifestDigest(manifest) {
  return digestText(JSON.stringify(canonicalJson(manifest)));
}
var nonRuntimeSuffixes = [".d.ts.map", ".d.ts", ".map", ".tsbuildinfo", ".md"];
var nonRuntimePrefixes = ["dist/engine-inputs/"];
function isRuntimeFile(path) {
  const lower = path.toLowerCase();
  return !nonRuntimePrefixes.some((prefix) => lower.startsWith(prefix)) && !nonRuntimeSuffixes.some((suffix) => lower.endsWith(suffix));
}
function packageRelativePath(packageRoot, target) {
  const absolute = resolve(packageRoot, target);
  const candidate = filesystemPathRelative(packageRoot, absolute, false);
  if (candidate === void 0) return null;
  return candidate.split(sep).join("/");
}
function manifestRuntimeTargets(manifest) {
  const targets = [];
  const visit = (value, key) => {
    if (key === "types") return;
    if (typeof value === "string") {
      if (value.startsWith("./") && !value.includes("*") && value !== "./package.json") {
        targets.push(value);
      }
      return;
    }
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      if (Array.isArray(value)) for (const item of value) visit(item);
      return;
    }
    for (const [childKey, childValue] of Object.entries(value)) visit(childValue, childKey);
  };
  for (const key of ["exports", "main", "module", "browser", "bin"]) visit(manifest[key]);
  return [...new Set(targets)].sort();
}
async function collectRuntimeFiles(packageRoot, manifest) {
  const paths = /* @__PURE__ */ new Set();
  const addFile = async (absolute, relativePath) => {
    let metadata;
    try {
      metadata = await stat(absolute);
    } catch {
      return;
    }
    if (!metadata.isFile()) return;
    const path = relativePath ?? packageRelativePath(packageRoot, absolute);
    if (path === null || !isRuntimeFile(path)) return;
    paths.add(path);
  };
  const walk = async (directory) => {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch (cause) {
      if (isMissing(cause)) return;
      throw cause;
    }
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const absolute = resolve(directory, entry.name);
      if (entry.isDirectory()) await walk(absolute);
      else if (entry.isFile()) await addFile(absolute);
    }
  };
  for (const root of ["dist", "pkg", "assets"]) await walk(resolve(packageRoot, root));
  for (const target of manifestRuntimeTargets(manifest)) {
    const path = packageRelativePath(packageRoot, target);
    if (path !== null) await addFile(resolve(packageRoot, path), path);
  }
  const result = [];
  for (const path of [...paths].sort()) {
    result.push({ path, digest: digestBytes(await readFile(resolve(packageRoot, path))) });
  }
  return result;
}
function runtimeDigest(files) {
  return digestText(files.map((file) => `${file.path}\0${file.digest}`).join("\n"));
}
function packageEntry(manifest) {
  const exportsValue = manifest.exports;
  if (exportsValue !== void 0) {
    if (typeof exportsValue === "object" && exportsValue !== null && !Array.isArray(exportsValue)) {
      const exportMap = exportsValue;
      const root = exportMap["."];
      const selectedRoot = conditionalExport(root);
      if (selectedRoot !== void 0) return selectedRoot;
      for (const key of Object.keys(exportMap).filter(
        (candidate) => candidate.startsWith("./") && candidate !== "./package.json" && !candidate.includes("*")
      ).sort()) {
        const selected2 = conditionalExport(exportMap[key]);
        if (selected2 !== void 0) return selected2;
      }
    }
    const selected = conditionalExport(exportsValue);
    if (selected !== void 0) return selected;
  }
  return typeof manifest.module === "string" ? manifest.module : typeof manifest.main === "string" ? manifest.main : void 0;
}
async function readManifest(path) {
  const value = JSON.parse(await readFile(path, "utf8"));
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`engine-package-manifest-invalid: ${path}`);
  }
  return value;
}
async function enginePackageRuntimeIdentity(packageRoot) {
  const manifest = await readManifest(resolve(packageRoot, "package.json"));
  return digestText(
    `${manifestDigest(manifest)}\0${runtimeDigest(await collectRuntimeFiles(packageRoot, manifest))}`
  );
}
async function inspectEngineWorkspace(workspaceInput) {
  const root = resolve(workspaceInput);
  const packageRoot = resolve(root, "packages");
  try {
    await access(resolve(root, "pnpm-workspace.yaml"));
    const entries = await readdir(packageRoot, { withFileTypes: true });
    const packages = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const packagePath = resolve(packageRoot, entry.name);
      let manifest;
      try {
        manifest = await readManifest(resolve(packagePath, "package.json"));
      } catch {
        continue;
      }
      if (typeof manifest.name !== "string" || !manifest.name.startsWith("@forgeax/engine"))
        continue;
      if (typeof manifest.version !== "string") {
        return bindingError(
          "engine-package-version-missing",
          "every local Engine package to declare a version",
          "Restore the package manifest version before selecting a local Engine.",
          { package: manifest.name, root: packagePath }
        );
      }
      const target = packageEntry(manifest);
      const entryPath = target === void 0 ? void 0 : resolve(packagePath, target);
      let entryDigest = null;
      let builtAt2 = null;
      if (entryPath !== void 0 && await pathExists(entryPath)) {
        const [bytes, metadata] = await Promise.all([readFile(entryPath), stat(entryPath)]);
        entryDigest = digestBytes(bytes);
        builtAt2 = metadata.mtime.toISOString();
      }
      const runtimeFiles = await collectRuntimeFiles(packagePath, manifest);
      packages.push({
        name: manifest.name,
        root: packagePath,
        version: manifest.version,
        entry: entryPath ?? null,
        built: entryDigest !== null,
        entryDigest,
        manifestDigest: manifestDigest(manifest),
        runtimeDigest: runtimeDigest(runtimeFiles),
        runtimeFiles,
        builtAt: builtAt2
      });
    }
    packages.sort((a, b) => a.name.localeCompare(b.name));
    if (packages.length === 0) {
      return bindingError(
        "engine-workspace-empty",
        "the local Engine workspace to contain @forgeax/engine packages",
        "Pass the Engine repository or its source/engine SDK directory.",
        { root, packageRoot }
      );
    }
    const versions = [...new Set(packages.map((item) => item.version))].sort();
    const missingBuilds = packages.filter((item) => !item.built).map((item) => item.name);
    const builtAt = packages.flatMap((item) => item.builtAt === null ? [] : [item.builtAt]).sort().at(-1) ?? null;
    const digest = `sha256:${createHash("sha256").update(
      packages.map((item) => `${item.name}\0${item.version}\0${item.entryDigest ?? "unbuilt"}`).map((identity, index) => {
        const item = packages[index];
        return `${identity}\0${item?.manifestDigest ?? "unmanifested"}\0${item?.runtimeDigest ?? "unruntime"}\0${item?.runtimeFiles.map((file) => `${file.path}\0${file.digest}`).join("\0") ?? ""}`;
      }).join("\n")
    ).digest("hex")}`;
    return {
      ok: true,
      value: {
        root,
        packageCount: packages.length,
        builtPackages: packages.length - missingBuilds.length,
        missingBuilds,
        versions,
        packages,
        digest,
        builtAt
      }
    };
  } catch (cause) {
    return bindingError(
      isMissing(cause) ? "engine-workspace-missing" : "engine-workspace-unreadable",
      "a readable Engine workspace with pnpm-workspace.yaml and packages/",
      "Pass the Engine repository root, not its packages/ directory.",
      { root, packageRoot, reason: cause instanceof Error ? cause.message : String(cause) }
    );
  }
}
function projectDependencyMode(packageJson) {
  let workspace = false;
  let registry = false;
  for (const section of [
    "dependencies",
    "devDependencies",
    "optionalDependencies",
    "peerDependencies"
  ]) {
    const value = packageJson[section];
    if (value === null || typeof value !== "object" || Array.isArray(value)) continue;
    for (const version of Object.values(value)) {
      if (typeof version !== "string") continue;
      if (version.startsWith("workspace:") || version.startsWith("file:")) workspace = true;
      else registry = true;
    }
  }
  return workspace ? registry ? "mixed" : "workspace" : registry ? "registry" : "none";
}
async function sdkResolution(root) {
  const packageJson = resolve(root, "node_modules", "@forgeax", "engine", "package.json");
  try {
    const manifest = await readManifest(packageJson);
    const target = packageEntry(manifest);
    const entry = target === void 0 ? null : resolve(dirname(packageJson), target);
    return {
      root: dirname(packageJson),
      version: typeof manifest.version === "string" ? manifest.version : null,
      entry,
      built: entry !== null && await pathExists(entry),
      source: "sdk"
    };
  } catch {
    return { root: null, version: null, entry: null, built: false, source: "unresolved" };
  }
}
async function engineStatusCommand(options = {}) {
  const facts = await readProjectFacts(options.root);
  if (!facts.ok) return facts;
  const bindingResult = await readEngineBinding(facts.value.root);
  if (!bindingResult.ok) return bindingResult;
  const binding = bindingResult.value;
  const mode = binding === null ? "sdk" : "local";
  const projectDependencies = projectDependencyMode(facts.value.packageJson);
  if (binding !== null) {
    const localPath = binding.path;
    const localBinding = {
      schemaVersion: ENGINE_BINDING_SCHEMA_VERSION,
      path: localPath
    };
    const workspaceResult = await inspectEngineWorkspace(localPath);
    if (!workspaceResult.ok) {
      const resolved3 = {
        root: localPath,
        version: null,
        entry: null,
        built: false,
        source: "local"
      };
      return {
        ok: true,
        value: {
          schemaVersion: ENGINE_BINDING_SCHEMA_VERSION,
          root: facts.value.root,
          binding: localBinding,
          mode,
          resolved: resolved3,
          workspace: null,
          projectDependencies,
          npmCompatible: projectDependencies === "registry" || projectDependencies === "none",
          healthy: false,
          next: [
            "forgeax project engine unlink",
            "forgeax project engine use-local <engine-directory>"
          ],
          diagnostic: workspaceResult.error
        }
      };
    }
    const workspace = workspaceResult.value;
    const version = workspace.versions.length === 1 ? workspace.versions[0] ?? null : null;
    const umbrella = workspace.packages.find((item) => item.name === "@forgeax/engine");
    const resolved2 = {
      root: localPath,
      version,
      entry: umbrella?.entry ?? null,
      built: umbrella?.built ?? false,
      source: "local"
    };
    const healthy = workspace.versions.length === 1 && workspace.missingBuilds.length === 0;
    return {
      ok: true,
      value: {
        schemaVersion: ENGINE_BINDING_SCHEMA_VERSION,
        root: facts.value.root,
        binding: localBinding,
        mode,
        resolved: resolved2,
        workspace,
        projectDependencies,
        npmCompatible: projectDependencies === "registry" || projectDependencies === "none",
        healthy,
        next: healthy ? ["forgeax project build", "forgeax project capture --backend auto --require-ui"] : ["pnpm build:engine", "forgeax project engine check"]
      }
    };
  }
  const resolved = await sdkResolution(facts.value.root);
  return {
    ok: true,
    value: {
      schemaVersion: ENGINE_BINDING_SCHEMA_VERSION,
      root: facts.value.root,
      binding,
      mode,
      resolved,
      workspace: null,
      projectDependencies,
      npmCompatible: projectDependencies === "registry" || projectDependencies === "none",
      healthy: resolved.source === "sdk" && resolved.built,
      next: resolved.source === "sdk" && resolved.built ? ["forgeax project build", "forgeax project capture --backend auto --require-ui"] : ["pnpm install", "forgeax project check"]
    }
  };
}
async function engineUseLocalCommand(options) {
  const root = resolve(options.root ?? process.cwd());
  if (options.path === void 0 || options.path.trim().length === 0) {
    return bindingError(
      "engine-binding-path-missing",
      "forgeax project engine use-local <engine-directory>",
      "Pass the local Engine repository or SDK source directory."
    );
  }
  let localPath;
  try {
    localPath = await realpath(resolve(root, options.path));
  } catch (cause) {
    return bindingError(
      "engine-workspace-missing",
      "the local Engine directory to exist",
      "Pass an existing Engine repository or SDK source directory.",
      {
        path: resolve(root, options.path),
        reason: cause instanceof Error ? cause.message : String(cause)
      }
    );
  }
  const workspace = await inspectEngineWorkspace(localPath);
  if (!workspace.ok) return workspace;
  const binding = {
    schemaVersion: ENGINE_BINDING_SCHEMA_VERSION,
    path: localPath
  };
  if (options.dryRun !== true) await writeEngineBinding(root, binding);
  const status = await engineStatusCommand({ root });
  if (!status.ok) return status;
  return {
    ok: true,
    value: {
      ...status.value,
      next: workspace.value.missingBuilds.length === 0 ? ["forgeax project build", "forgeax project capture --backend auto --require-ui"] : ["pnpm build:engine", "forgeax project engine check"]
    }
  };
}
async function engineUnlinkCommand(options = {}) {
  const root = resolve(options.root ?? process.cwd());
  if (options.dryRun !== true) await rm(bindingFile(root), { force: true });
  return engineStatusCommand({ root });
}
async function engineDoctorCommand(options = {}) {
  const status = await engineStatusCommand(options);
  if (!status.ok) return status;
  if (status.value.diagnostic !== void 0) return { ok: false, error: status.value.diagnostic };
  if (!status.value.healthy) {
    return {
      ok: false,
      error: {
        code: status.value.mode === "local" ? "engine-local-build-missing" : "engine-sdk-unresolved",
        expected: "the selected Engine binding to resolve to built packages",
        hint: status.value.mode === "local" ? "Run pnpm build:engine in the selected Engine checkout, then rerun forgeax project engine check." : "Run pnpm install in the game project or select a valid local Engine checkout.",
        detail: { status: status.value }
      }
    };
  }
  return status;
}

// src/startup-budget.ts
var DEV_PREPARATION_TIMEOUT_MS = 30 * 6e4;
var DEV_EXECUTION_TIMEOUT_MS = 12e4;
var PRODUCTION_EXECUTION_TIMEOUT_MS = 3e4;

export { DEV_EXECUTION_TIMEOUT_MS, DEV_PREPARATION_TIMEOUT_MS, PRODUCTION_EXECUTION_TIMEOUT_MS, engineDoctorCommand, enginePackageRuntimeIdentity, engineStatusCommand, engineUnlinkCommand, engineUseLocalCommand, environmentExecutionWorkers, executionWorkers, executionWorkersSchema, inspectEngineWorkspace, readEngineBinding };
//# sourceMappingURL=chunk-UTXAIODQ.mjs.map
//# sourceMappingURL=chunk-UTXAIODQ.mjs.map