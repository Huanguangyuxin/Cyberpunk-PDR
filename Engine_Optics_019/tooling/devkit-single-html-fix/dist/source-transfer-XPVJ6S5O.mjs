#!/usr/bin/env node
import { execFileCommand } from './chunk-S3NGZOPR.mjs';
import { pluginProgramSource, pluginRuntimeProjection } from './chunk-WBZD4GEB.mjs';
import './chunk-A2W6KPHB.mjs';
import { discoverPluginAssets, pluginAssetClosure, assertPluginSourceInputs } from './chunk-5KRT3YGN.mjs';
import { isFilesystemPathWithin, filesystemPathRelative, filesystemPathSegments } from './chunk-X5IGMUF7.mjs';
import { readProjectFacts, commandError } from './chunk-VNP4GISC.mjs';
import { randomUUID } from 'crypto';
import { realpath, mkdir, lstat, readFile, mkdtemp, cp, writeFile, symlink, rename, rm, readdir } from 'fs/promises';
import { resolve, dirname, relative } from 'path';
import { collectAuthorPackClosure, assertAuthorPackUnchanged } from '@forgeax/engine-pack/build';
import { PackageId, AssetGuid } from '@forgeax/engine-pack/guid';
import { scanInventory, declarationPackageId } from '@forgeax/engine-pack/scanner';
import { build } from 'vite';
import { stringify, parseAllDocuments } from 'yaml';

function conflict(path, reason) {
  throw {
    code: "pack-source-revision-conflict",
    expected: "one validated author closure with consistent identities and locked dependencies",
    hint: "repair the reported conflict or explicitly clone identities into an unused directory",
    detail: { path, reason }
  };
}
async function assertWritablePath(root, path) {
  const rel = filesystemPathRelative(root, path);
  if (rel === void 0) conflict(path, "write escapes project");
  let current = root;
  for (const part of filesystemPathSegments(rel)) {
    current = resolve(current, part);
    try {
      if ((await lstat(current)).isSymbolicLink())
        conflict(current, "source write crosses a symlink");
    } catch (cause) {
      if (cause.code !== "ENOENT") throw cause;
      break;
    }
  }
}
async function importedFiles(root, directory = root) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isSymbolicLink()) conflict(path, "import contains a symlink");
    if (entry.isDirectory()) files.push(...await importedFiles(root, path));
    else if (entry.isFile()) files.push(relative(root, path).replaceAll("\\", "/"));
    else conflict(path, "import contains a non-file resource");
  }
  return files.sort();
}
async function optionalText(path) {
  try {
    return await readFile(path, "utf8");
  } catch (cause) {
    if (cause.code === "ENOENT") return void 0;
    throw cause;
  }
}
function parseProjectLockfile(text, root) {
  const documents = parseAllDocuments(text);
  if (documents.some((document2) => document2.errors.length > 0))
    conflict(root, "pnpm lockfile contains invalid YAML");
  const document = documents.at(-1);
  const value = document?.toJSON();
  if (document === void 0 || value === null || typeof value !== "object" || Array.isArray(value)) {
    conflict(root, "project pnpm lockfile document is missing or invalid");
  }
  return { documents, value };
}
async function dependencyCandidate(closure, target, candidate) {
  if (!Object.keys(closure.dependencies).length) return false;
  const sourceText = await optionalText(resolve(closure.root, "pnpm-lock.yaml"));
  if (!sourceText) conflict(closure.root, "source dependencies require a project pnpm-lock.yaml");
  const source = parseProjectLockfile(sourceText, closure.root).value;
  if (String(source.lockfileVersion) !== "9.0")
    conflict(closure.root, "expected the supported pnpm lockfile format 9.0");
  const targetText = await optionalText(resolve(target, "pnpm-lock.yaml"));
  const targetProject = targetText ? parseProjectLockfile(targetText, target) : void 0;
  const locked = targetProject ? targetProject.value : {
    lockfileVersion: "9.0",
    settings: source.settings,
    importers: { ".": {} },
    packages: {},
    snapshots: {}
  };
  if (String(locked.lockfileVersion) !== "9.0")
    conflict(target, "incompatible target lockfile format");
  const manifest = JSON.parse(await readFile(resolve(candidate, "package.json"), "utf8"));
  manifest.dependencies ??= {};
  locked.importers["."] ??= {};
  const imports = locked.importers["."];
  imports.dependencies ??= {};
  const pending = [];
  let changed = false;
  for (const [name] of Object.entries(closure.dependencies)) {
    const entry = source.importers["."]?.dependencies?.[name] ?? source.importers["."]?.devDependencies?.[name];
    if (!entry) conflict(name, "source dependency must have locked resolution evidence");
    if (entry.specifier !== closure.dependencies[name])
      conflict(name, "source manifest and lock specifier differ");
    const declared = manifest.dependencies[name] ?? manifest.devDependencies?.[name];
    const current = imports.dependencies[name] ?? imports.devDependencies?.[name];
    if (declared !== void 0 && (!current || current.specifier !== declared))
      conflict(name, "target manifest and lock differ");
    const integrity = (lock, version) => {
      const value = lock.packages?.[`${name}@${version.split("(")[0]}`];
      return value?.resolution?.integrity;
    };
    if (current && entry.version.startsWith("file:") && current.version.startsWith("file:") && integrity(source, entry.version) && integrity(source, entry.version) === integrity(locked, current.version))
      continue;
    if (!/^\d+\.\d+\.\d+(?:[-+][^()]*)?(?:\(.*\))?$/.test(entry.version))
      conflict(
        name,
        "local SDK dependencies need matching target integrity; new dependencies require registry versions"
      );
    if (current && current.version !== entry.version)
      conflict(name, `locked version conflict: ${current.version} versus ${entry.version}`);
    if (!current) {
      changed = true;
      const version = entry.version.split("(")[0] ?? entry.version;
      manifest.dependencies[name] = version;
      imports.dependencies[name] = { specifier: version, version: entry.version };
    }
    pending.push(`${name}@${entry.version}`);
  }
  const visited = /* @__PURE__ */ new Set();
  locked.packages ??= {};
  locked.snapshots ??= {};
  while (pending.length) {
    const key = pending.pop();
    if (key === void 0) break;
    if (visited.has(key)) continue;
    visited.add(key);
    const packageKey = key.split("(")[0] ?? key;
    const value = source.packages?.[packageKey];
    const snapshot = source.snapshots?.[key];
    if (!value || !snapshot) conflict(key, "source lock closure is incomplete");
    if (locked.packages[packageKey] && JSON.stringify(locked.packages[packageKey]) !== JSON.stringify(value))
      conflict(key, "package integrity or resolution differs");
    if (locked.snapshots[key] && JSON.stringify(locked.snapshots[key]) !== JSON.stringify(snapshot))
      conflict(key, "transitive dependency closure differs");
    locked.packages[packageKey] = value;
    locked.snapshots[key] = snapshot;
    for (const [name, version] of Object.entries({
      ...snapshot.dependencies,
      ...snapshot.optionalDependencies
    }))
      pending.push(`${name}@${version}`);
  }
  if (changed) {
    await writeFile(resolve(candidate, "package.json"), `${JSON.stringify(manifest, null, 2)}
`);
    if (targetProject) {
      const prefix = targetProject.documents.slice(0, -1).map((document) => document.toString()).join("");
      const separator = prefix && !prefix.endsWith("\n") ? "\n" : "";
      await writeFile(
        resolve(candidate, "pnpm-lock.yaml"),
        `${prefix}${separator}---
${stringify(locked)}`
      );
    } else {
      await writeFile(resolve(candidate, "pnpm-lock.yaml"), stringify(locked));
    }
    await execFileCommand(
      "pnpm",
      ["install", "--frozen-lockfile", "--ignore-scripts", "--ignore-workspace"],
      {
        cwd: candidate,
        env: { ...process.env, CI: "true" },
        timeout: 5 * 6e4,
        maxBuffer: 4 * 1024 * 1024
      }
    );
  }
  return changed;
}
async function cloneMap(closure) {
  const map = /* @__PURE__ */ new Map();
  for (const declaration of closure.declarations) {
    const oldNamespace = declarationPackageId(declaration);
    if (oldNamespace) map.set(oldNamespace.toLowerCase(), randomUUID());
  }
  for (const [guid, identity] of closure.identities) {
    const next = identity.packageId ? map.get(identity.packageId.toLowerCase()) : void 0;
    const parsed = next ? PackageId.parse(next) : void 0;
    if (parsed && !parsed.ok) throw parsed.error;
    map.set(
      guid,
      parsed?.ok && identity.sourceKey ? AssetGuid.format(AssetGuid.derive(parsed.value, identity.sourceKey)) : randomUUID()
    );
  }
  return map;
}
async function assetSourceImportCommand(options) {
  let candidate;
  let lock;
  const committed = [];
  try {
    const facts = await readProjectFacts(options.root);
    if (!facts.ok) return facts;
    const root = await realpath(facts.value.root);
    const target = resolve(root, options.targetPath);
    if (!facts.value.assetRoots.some(
      (directory) => isFilesystemPathWithin(resolve(root, directory), target, false)
    ))
      conflict(
        options.targetPath,
        "target must be a new directory beneath a configured asset directory"
      );
    await assertWritablePath(root, target);
    for (const name of ["package.json", "pnpm-lock.yaml", ".forgeax/source-transfer.lock"])
      await assertWritablePath(root, resolve(root, name));
    const lockPath = resolve(root, ".forgeax/source-transfer.lock");
    await mkdir(dirname(lockPath), { recursive: true });
    await mkdir(lockPath);
    lock = lockPath;
    const sourceFacts = await readProjectFacts(options.sourceRoot);
    if (!sourceFacts.ok) return sourceFacts;
    const closure = await collectAuthorPackClosure(
      options.sourceRoot,
      options.sourcePath,
      sourceFacts.value.assetRoots
    );
    const sourceLock = await optionalText(resolve(closure.root, "pnpm-lock.yaml"));
    if (options.expectedRevision && closure.files.find((file) => file.path === closure.sourcePath)?.digest !== options.expectedRevision)
      conflict(options.sourcePath, "source revision changed");
    let reused = false;
    try {
      await lstat(target);
      if (options.cloneIdentities) conflict(target, "clone target already exists");
      for (const file of closure.files) {
        const existing = await readFile(resolve(target, file.path));
        if (!existing.equals(file.bytes)) conflict(target, "existing import differs from source");
      }
      if (JSON.stringify(await importedFiles(target)) !== JSON.stringify(closure.files.map((file) => file.path).sort()))
        conflict(target, "existing import has extra or missing source files");
      reused = true;
    } catch (cause) {
      if (cause.code !== "ENOENT") throw cause;
    }
    try {
      if (!reused) {
        await lstat(target);
        conflict(target, "existing import is incomplete");
      }
    } catch (cause) {
      if (cause.code !== "ENOENT") throw cause;
    }
    const targetInventory = await discoverPluginAssets(facts.value);
    const targetSources = await scanInventory(
      facts.value.assetRoots.map((directory) => resolve(root, directory))
    );
    if (!targetSources.ok) throw targetSources.error;
    const targetRevisions = JSON.stringify(
      [...targetSources.value.declarations].map(([path, source]) => [path, source.sourceRevision]).sort()
    );
    const identities = options.cloneIdentities ? await cloneMap(closure) : /* @__PURE__ */ new Map();
    const shaderModules = /* @__PURE__ */ new Map();
    if (options.cloneIdentities) {
      const prefix = `clone_${randomUUID().replaceAll("-", "")}`;
      for (const file of closure.files) {
        if (!file.path.endsWith(".wgsl")) continue;
        const module = /^\s*#define_import_path\s+([\w:.-]+)/m.exec(
          new TextDecoder().decode(file.bytes)
        )?.[1];
        if (module) shaderModules.set(module, `${prefix}::${module}`);
      }
    }
    const originalManifest = await readFile(resolve(root, "package.json"), "utf8");
    const originalLock = await optionalText(resolve(root, "pnpm-lock.yaml"));
    const candidateRoot = await mkdtemp(resolve(dirname(root), ".forgeax-transfer-"));
    candidate = candidateRoot;
    await cp(root, candidate, {
      recursive: true,
      filter: (path) => !relative(root, path).split(/[\\/]/).some(
        (part) => ["node_modules", ".git", ".forgeax", ".worktrees", "dist"].includes(part)
      )
    });
    const destination = resolve(candidate, relative(root, target));
    for (const file of closure.files) {
      const path = resolve(destination, file.path);
      await mkdir(dirname(path), { recursive: true });
      let bytes = file.bytes;
      if (identities.size && /\.(?:[cm]?[jt]sx?|json|gltf|wgsl)$/.test(path)) {
        let source = new TextDecoder().decode(bytes).replace(/(['"])([^'"\\\r\n]*)\1/g, (literal, quote, value) => {
          const replacement = identities.get(value.toLowerCase()) ?? shaderModules.get(value);
          return replacement === void 0 ? literal : quote + replacement + quote;
        });
        if (path.endsWith(".wgsl"))
          source = source.replace(/[A-Za-z_][\w:.-]*/g, (token) => {
            const module = [...shaderModules.keys()].find(
              (name) => token === name || token.startsWith(`${name}::`)
            );
            return module === void 0 ? token : shaderModules.get(module) + token.slice(module.length);
          });
        bytes = new TextEncoder().encode(source);
      }
      await writeFile(path, bytes);
    }
    const installed = await dependencyCandidate(closure, root, candidate);
    if (!installed) {
      try {
        await lstat(resolve(root, "node_modules"));
        await symlink(resolve(root, "node_modules"), resolve(candidate, "node_modules"), "dir");
      } catch (cause) {
        if (cause.code !== "ENOENT") throw cause;
      }
    }
    const scanned = await scanInventory(
      facts.value.assetRoots.map((directory) => resolve(candidateRoot, directory))
    );
    if (!scanned.ok) throw scanned.error;
    const candidateClosure = await collectAuthorPackClosure(
      candidate,
      relative(candidate, resolve(destination, closure.sourcePath)),
      facts.value.assetRoots
    );
    const destinationPrefix = `${relative(candidate, destination).replaceAll("\\", "/")}/`;
    if (options.cloneIdentities && candidateClosure.files.some((file) => !file.path.startsWith(destinationPrefix)))
      conflict(destination, "computed references must resolve inside the cloned source closure");
    const inventory = await discoverPluginAssets({
      root: candidate,
      assetRoots: facts.value.assetRoots
    });
    const sourceInventory = await discoverPluginAssets(sourceFacts.value);
    const buildGuids = /* @__PURE__ */ new Set([
      ...pluginAssetClosure(sourceInventory, sourceFacts.value.roots.build).map(
        (record) => identities.get(record.definition.guid) ?? record.definition.guid
      ),
      ...pluginAssetClosure(inventory, facts.value.roots.build).map(
        (record) => record.definition.guid
      )
    ]);
    for (const target2 of ["build", "engine"]) {
      const records = [...inventory.assets.values()].filter(
        (record) => buildGuids.has(record.definition.guid) === (target2 === "build")
      );
      if (!records.length) continue;
      const input = resolve(candidate, ".forgeax", `transfer-${target2}.ts`);
      await mkdir(dirname(input), { recursive: true });
      await writeFile(
        input,
        pluginProgramSource(records, target2, []) + '\nexport const validation = createPrograms("transfer", "candidate", 1);'
      );
      await build({
        root: candidate,
        configFile: false,
        logLevel: "silent",
        plugins: [
          pluginRuntimeProjection(candidate),
          {
            name: "forgeax:transfer-target-check",
            generateBundle(_options, bundle) {
              if (target2 === "build") return;
              for (const output of Object.values(bundle)) {
                if (output.type !== "chunk") continue;
                if (Object.keys(output.modules).some((id) => id.includes("__vite-browser-external")))
                  conflict(input, "Node dependencies cannot enter a browser plugin closure");
              }
            }
          }
        ],
        build: {
          write: false,
          target: "esnext",
          minify: false,
          ...target2 === "build" ? { ssr: input } : { lib: { entry: input, formats: ["es"], fileName: "validation" } }
        }
      });
    }
    await assertAuthorPackUnchanged(closure);
    if (await optionalText(resolve(closure.root, "pnpm-lock.yaml")) !== sourceLock)
      conflict(closure.root, "source lock changed during transfer");
    if (await readFile(resolve(root, "package.json"), "utf8") !== originalManifest || await optionalText(resolve(root, "pnpm-lock.yaml")) !== originalLock)
      conflict(root, "target dependencies changed during transfer");
    await assertPluginSourceInputs(targetInventory, root);
    const currentSources = await scanInventory(
      facts.value.assetRoots.map((directory) => resolve(root, directory))
    );
    if (!currentSources.ok) throw currentSources.error;
    if (JSON.stringify(
      [...currentSources.value.declarations].map(([path, source]) => [path, source.sourceRevision]).sort()
    ) !== targetRevisions)
      conflict(root, "target sources changed during transfer");
    await assertWritablePath(root, target);
    if (reused) {
      if (installed)
        conflict(
          target,
          "existing import dependencies changed; restore its locked dependencies first"
        );
      return {
        ok: true,
        value: {
          sourcePath: resolve(target, closure.sourcePath),
          files: closure.files.length,
          reused: true
        }
      };
    }
    await mkdir(dirname(target), { recursive: true });
    await mkdir(target);
    const changes = [
      relative(root, target),
      ...installed ? ["package.json", "pnpm-lock.yaml", "node_modules"] : []
    ];
    const rollback = resolve(candidate, ".rollback");
    await mkdir(rollback);
    try {
      for (const [index, path] of changes.entries()) {
        const current = resolve(root, path), next = resolve(candidate, path);
        await mkdir(dirname(current), { recursive: true });
        let backup;
        try {
          await lstat(current);
          backup = resolve(rollback, String(index));
          await rename(current, backup);
        } catch (cause) {
          if (cause.code !== "ENOENT") throw cause;
        }
        committed.push({ path: current, ...backup ? { backup } : {} });
        await rename(next, current);
      }
    } catch (cause) {
      const failures = [cause];
      for (const change of committed.reverse()) {
        try {
          await rm(change.path, { recursive: true, force: true });
          if (change.backup) await rename(change.backup, change.path);
        } catch (error) {
          failures.push(error);
        }
      }
      if (failures.length > 1) {
        const recovery = candidate;
        candidate = void 0;
        throw new AggregateError(
          failures,
          `transfer rollback failed; recovery files preserved at ${recovery}`
        );
      }
      throw cause;
    }
    return {
      ok: true,
      value: {
        sourcePath: resolve(target, closure.sourcePath),
        files: closure.files.length,
        identities: Object.fromEntries(identities),
        dependencies: closure.dependencies
      }
    };
  } catch (cause) {
    return { ok: false, error: commandError(cause, "asset-source-transfer-failed") };
  } finally {
    try {
      if (candidate) await rm(candidate, { recursive: true, force: true });
    } finally {
      if (lock) await rm(lock, { recursive: true, force: true });
    }
  }
}
async function transferPackOperation(root, operation) {
  const { ok, err } = await import('@forgeax/engine-types');
  if (operation.packageId !== void 0)
    return err({
      code: "pack-source-mutation-unsupported",
      expected: "sourcePath selection and automatically cloned closure identities",
      hint: "omit packageId; closure cloning remaps every owned namespace together",
      detail: { packageId: operation.packageId }
    });
  const result = await assetSourceImportCommand({
    root,
    sourceRoot: operation.sourceRoot ?? root,
    sourcePath: operation.sourcePath ?? "",
    targetPath: operation.targetPath ?? "",
    cloneIdentities: operation.operation === "asset.source.clone",
    ...operation.expectedRevision ? { expectedRevision: operation.expectedRevision } : {}
  });
  if (!result.ok)
    return err({
      code: result.error.code === "pack-source-revision-conflict" ? "pack-source-revision-conflict" : "pack-source-mutation-unsupported",
      expected: result.error.expected,
      hint: result.error.hint,
      detail: { cause: result.error }
    });
  return ok({
    operation: operation.operation,
    requestId: operation.requestId,
    ...result.value
  });
}

export { assetSourceImportCommand, transferPackOperation };
//# sourceMappingURL=source-transfer-XPVJ6S5O.mjs.map
//# sourceMappingURL=source-transfer-XPVJ6S5O.mjs.map