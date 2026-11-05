import { readFile, realpath, stat, readdir } from 'fs/promises';
import { createRequire, isBuiltin } from 'module';
import { dirname, resolve, posix, isAbsolute, relative, sep, basename } from 'path';
import { pathToFileURL } from 'url';
import { PACK_PROGRAM_WORKER_SOURCE } from '@forgeax/engine-pack/runtime-browser';
import MagicString from 'magic-string';
import ts5 from 'typescript';
import { searchForWorkspaceRoot, normalizePath } from 'vite';
import { initSync, parse } from 'es-module-lexer';
import { createHash, randomUUID } from 'crypto';
import 'import-meta-resolve';
import { readPackAuthoringDeclaration, projectPackGenerationModules } from '@forgeax/engine-pack/build';
import { preparePackProgram } from '@forgeax/engine-pack/runtime';
import { err, ok } from '@forgeax/engine-types';
import { resolvePluginProgram, pluginAssetOutputProducer } from '@forgeax/engine-import';
import { listPackSourcePaths, scanInventory } from '@forgeax/engine-pack/scanner';
import { projectDirectPackJson, validatePluginAssetSource, AssetGuid, PackageId, executePackBuild, resolvePackParameterValues, lowerPluginToolContract } from '@forgeax/engine-pack/source';
import { createScriptablePackSourceSnapshot, createScriptablePackModuleExecutorPool, loadScriptablePack, createLazyScriptablePackDefinition } from '@forgeax/engine-pack/source-node';
import { readFileSync, realpathSync } from 'fs';
import { defineToolCommandContract, isToolCommandContract, commandContribution } from '@forgeax/engine-tool-runtime';
import { GameProjectSchema } from '@forgeax/engine-project';

// src/build/execution-workers.ts
initSync();
function moduleSpecifierEdits(source, filename, resolve7) {
  const edits = [];
  for (const edge of parse(source, filename)[0]) {
    if (edge.d === -2) continue;
    let specifier = edge.n;
    if (specifier === void 0 && source[edge.s] === "`") {
      const literal = ts5.createSourceFile(
        filename,
        source.slice(edge.s, edge.e),
        ts5.ScriptTarget.Latest,
        false,
        ts5.ScriptKind.JS
      ).statements[0];
      if (literal && ts5.isExpressionStatement(literal) && ts5.isNoSubstitutionTemplateLiteral(literal.expression))
        specifier = literal.expression.text;
    }
    if (specifier === void 0) continue;
    const next = resolve7(specifier, edge.d === -1 ? "static" : "dynamic");
    if (next !== void 0 && next !== specifier)
      edits.push({
        start: edge.d === -1 ? edge.s - 1 : edge.s,
        end: edge.d === -1 ? edge.e + 1 : edge.e,
        text: JSON.stringify(next)
      });
  }
  return edits;
}
function rewriteModuleSpecifiers(source, filename, resolve7) {
  for (const edit of moduleSpecifierEdits(source, filename, resolve7).sort(
    (a, b) => b.start - a.start
  ))
    source = source.slice(0, edit.start) + edit.text + source.slice(edit.end);
  return source;
}
var nativePath = { isAbsolute, relative, sep };
function filesystemPathKey(path) {
  return path.replaceAll("\\", "/");
}
function filesystemPathRelative(root, candidate, allowRoot = true, pathApi = nativePath) {
  const local = pathApi.relative(root, candidate);
  if (local === "") return allowRoot ? local : void 0;
  if (local === ".." || local.startsWith(`..${pathApi.sep}`) || pathApi.isAbsolute(local))
    return void 0;
  return local;
}
function isFilesystemPathWithin(root, candidate, allowRoot = true, pathApi = nativePath) {
  return filesystemPathRelative(root, candidate, allowRoot, pathApi) !== void 0;
}
function filesystemPathSegments(path, pathApi = nativePath) {
  return path.split(pathApi.sep);
}

// src/build/pack-program-imports.ts
var PACK_PROGRAM_ENGINE_IMPORTS = [
  "@forgeax/engine/ecs",
  "@forgeax/engine/scene",
  "@forgeax/engine/geometry",
  "@forgeax/engine/plugin",
  "@forgeax/engine/pack/source",
  "@forgeax/engine/types"
];
async function runtimeProgramIdentity(manifestPath) {
  const require3 = createRequire(manifestPath);
  const seen = /* @__PURE__ */ new Set();
  const hash = createHash("sha256");
  const visit = async (manifestPath2) => {
    const manifest = JSON.parse(await readFile(manifestPath2, "utf8"));
    if (seen.has(manifest.name)) return;
    seen.add(manifest.name);
    hash.update(
      JSON.stringify({
        name: manifest.name,
        version: manifest.version,
        dependencies: manifest.dependencies
      })
    );
    const directory = resolve(dirname(manifestPath2), "dist");
    const files = (await readdir(directory, { recursive: true })).filter((path) => /\.(?:mjs|js)$/.test(path)).sort();
    for (const file of files) {
      hash.update(file);
      hash.update(await readFile(resolve(directory, file)));
    }
    for (const name of Object.keys(manifest.dependencies ?? {}).filter((name2) => name2.startsWith("@forgeax/engine-")).sort()) {
      await visit(require3.resolve(`${name}/package.json`, { paths: [dirname(manifestPath2)] }));
    }
  };
  await visit(manifestPath);
  return `sha256:${hash.digest("hex")}`;
}

// src/build/execution-workers.ts
var require2 = createRequire(import.meta.url);
async function canonicalModuleId(id) {
  const file = id.split("?")[0] ?? id;
  return isAbsolute(file) ? normalizePath(await realpath(file)) + id.slice(file.length) : id;
}
var engineCapabilityMeta = "forgeax.engineCapability";
async function runtimeDependencyEntries(manifest, entries = /* @__PURE__ */ new Set()) {
  const entry = normalizePath(require2.resolve(dirname(manifest)));
  if (entries.has(entry)) return [...entries];
  entries.add(entry);
  const { dependencies = {} } = JSON.parse(await readFile(manifest, "utf8"));
  for (const name of Object.keys(dependencies)) {
    if (!name.startsWith("@forgeax/engine-")) continue;
    await runtimeDependencyEntries(
      require2.resolve(`${name}/package.json`, { paths: [dirname(manifest)] }),
      entries
    );
  }
  return [...entries];
}
function executionWorkerEntries(runtimeImports = PACK_PROGRAM_ENGINE_IMPORTS, delivery = "browser") {
  let building = false;
  let base = "/";
  let allowedFiles;
  const virtual = "virtual:forgeax/pack-program-imports";
  const importTableMarker = "__forgeax_delivered_program_imports__";
  let runtimeIdentity = "";
  const prepareIdentity = async (engineManifest) => {
    if (!engineManifest || engineManifest.external)
      throw new Error("Engine manifest unavailable from the Vite host");
    runtimeIdentity = await runtimeProgramIdentity(engineManifest.id);
    return runtimeIdentity;
  };
  const externalPrefix = "forgeax-host-import:";
  const facades = /* @__PURE__ */ new Map();
  const imports = /* @__PURE__ */ new Map();
  const admitDevelopmentModule = (id) => {
    const file = id.split("?")[0];
    if (allowedFiles && file && isAbsolute(file) && !allowedFiles.includes(normalizePath(file))) {
      allowedFiles.push(normalizePath(file));
    }
  };
  const linkedEdges = /* @__PURE__ */ new Map();
  const owners = /* @__PURE__ */ new Map();
  const engineOwner = (directory) => {
    const known = owners.get(directory);
    if (known) return known;
    const pending = (async () => {
      try {
        const manifest = JSON.parse(await readFile(resolve(directory, "package.json"), "utf8"));
        if (typeof manifest.name === "string")
          return manifest.name === "@forgeax/engine" || manifest.name.startsWith("@forgeax/engine-");
      } catch (cause) {
        if (cause.code !== "ENOENT") throw cause;
      }
      return dirname(directory) !== directory && engineOwner(dirname(directory));
    })();
    owners.set(directory, pending);
    return pending;
  };
  return {
    name: "forgeax:execution-worker-entries",
    enforce: "pre",
    configResolved(config) {
      base = config.base;
      allowedFiles = config.command === "serve" ? config.server.fs.allow : void 0;
    },
    async resolveId(id, importer, options) {
      if (id === virtual) return `\0${virtual}`;
      if (delivery === "native") return null;
      if (id.startsWith(externalPrefix)) return { id, external: true };
      if (!importer || !/^@forgeax\/engine(?:$|[/-])/.test(id)) return null;
      const filename = importer.split("?")[0] ?? importer;
      if (isAbsolute(filename) && await engineOwner(dirname(filename))) return null;
      const resolved = await this.resolve(id, importer, { ...options, skipSelf: true });
      if (!resolved || resolved.external) this.error(`Engine capability unavailable: ${id}`);
      resolved.id = await canonicalModuleId(resolved.id);
      if (!building) {
        const key = externalPrefix + encodeURIComponent(id);
        const previous2 = imports.get(key);
        if (previous2 && previous2 !== resolved.id)
          this.error(`Engine capability resolves to multiple modules in one player: ${id}`);
        imports.set(key, resolved.id);
        admitDevelopmentModule(resolved.id);
        return {
          ...resolved,
          meta: {
            ...resolved.meta,
            [engineCapabilityMeta]: { specifier: id }
          }
        };
      }
      let reference = facades.get(resolved.id);
      if (!reference) {
        reference = this.emitFile({ type: "chunk", id: resolved.id, preserveSignature: "strict" });
        facades.set(resolved.id, reference);
      }
      const external = externalPrefix + encodeURIComponent(id);
      const previous = imports.get(external);
      if (previous && previous !== reference)
        this.error(
          `Engine capability resolves to multiple modules in one player: ${id}; previous=${[...facades].find(([, value]) => value === previous)?.[0]}; current=${resolved.id}`
        );
      imports.set(external, reference);
      return {
        id: external,
        external: true,
        meta: {
          [engineCapabilityMeta]: { specifier: id, reference }
        }
      };
    },
    async load(id) {
      if (id !== `\0${virtual}`) return null;
      const identity = runtimeIdentity || await prepareIdentity(
        await this.resolve("@forgeax/engine/package.json", void 0, { skipSelf: true })
      );
      if (delivery === "native")
        return `export default ${JSON.stringify(Object.fromEntries(runtimeImports.map((specifier) => [specifier, { identity, url: `https://forgeax.package/modules/${encodeURIComponent(specifier)}` }])))};`;
      for (const specifier of runtimeImports) {
        const resolved = await this.resolve(specifier, void 0, { skipSelf: true });
        if (!resolved || resolved.external)
          this.error(`Runtime program import unavailable: ${specifier}`);
        resolved.id = await canonicalModuleId(resolved.id);
        let reference = facades.get(resolved.id);
        if (building && !reference) {
          reference = this.emitFile({
            type: "chunk",
            id: resolved.id,
            preserveSignature: "strict"
          });
          facades.set(resolved.id, reference);
        }
        if (building && reference) {
          const external = externalPrefix + encodeURIComponent(specifier);
          const previous = imports.get(external);
          if (previous && previous !== reference)
            this.error(
              `Engine capability resolves to multiple modules in one player: ${specifier}`
            );
          imports.set(external, reference);
        }
        if (!building) {
          const key = externalPrefix + encodeURIComponent(specifier);
          const previous = imports.get(key);
          if (previous && previous !== resolved.id)
            this.error(
              `Engine capability resolves to multiple modules in one player: ${specifier}`
            );
          imports.set(key, resolved.id);
          admitDevelopmentModule(resolved.id);
        }
      }
      const table = building ? `export default Object.freeze(${JSON.stringify(importTableMarker)});` : `export default { ${[...imports].sort(([a], [b]) => a.localeCompare(b)).map(([key, id2]) => {
        const file = id2.split("?")[0] ?? id2;
        const query = id2.slice(file.length);
        return `${JSON.stringify(decodeURIComponent(key.slice(externalPrefix.length)))}: { identity: ${JSON.stringify(identity)}, url: new URL(${JSON.stringify(`${base}@fs${pathToFileURL(file).pathname}${query}`)}, globalThis.location.origin).href }`;
      }).join(",")} };`;
      return `${table}
const modules = { ${runtimeImports.map((specifier) => `${JSON.stringify(specifier)}: () => import(${JSON.stringify(specifier)})`).join(",")} };
export function loadImport(specifier) {
  const load = modules[specifier];
  if (!load) throw new TypeError('Runtime program import unavailable: ' + specifier);
  return load();
}`;
    },
    renderChunk(code, chunk) {
      const output = new MagicString(code);
      if (code.includes(importTableMarker)) {
        const fields = [...imports].sort(([a], [b]) => a.localeCompare(b)).map(([external, reference]) => {
          const specifier = decodeURIComponent(external.slice(externalPrefix.length));
          const path = posix.relative(posix.dirname(chunk.fileName), this.getFileName(reference));
          return `${JSON.stringify(specifier)}: { identity: ${JSON.stringify(runtimeIdentity)}, url: new URL(${JSON.stringify(path.startsWith("./") || path.startsWith("../") ? path : `./${path}`)}, import.meta.url).href }`;
        });
        const file = ts5.createSourceFile(
          chunk.fileName,
          code,
          ts5.ScriptTarget.Latest,
          true,
          ts5.ScriptKind.JS
        );
        const edits2 = [];
        const visit = (node) => {
          if (ts5.isStringLiteralLike(node) && node.text === importTableMarker)
            edits2.push({ start: node.getStart(file), end: node.end });
          ts5.forEachChild(node, visit);
        };
        visit(file);
        for (const edit of edits2) output.overwrite(edit.start, edit.end, `{ ${fields.join(",")} }`);
      }
      const edges = { imports: [], dynamicImports: [] };
      const edits = moduleSpecifierEdits(code, chunk.fileName, (specifier, kind) => {
        const reference = imports.get(specifier);
        if (!reference) return void 0;
        edges[kind === "static" ? "imports" : "dynamicImports"].push(specifier);
        const relative4 = posix.relative(posix.dirname(chunk.fileName), this.getFileName(reference));
        return relative4.startsWith("./") || relative4.startsWith("../") ? relative4 : `./${relative4}`;
      });
      for (const edit of edits) output.overwrite(edit.start, edit.end, edit.text);
      linkedEdges.set(chunk.fileName, edges);
      return output.hasChanged() ? { code: output.toString(), map: output.generateMap({ hires: true }) } : null;
    },
    async configureServer(server) {
      if (runtimeImports.length > 0) {
        try {
          await prepareIdentity(
            await server.environments.client?.pluginContainer.resolveId(
              "@forgeax/engine/package.json"
            ) ?? null
          );
        } catch (cause) {
          await server.close();
          throw cause;
        }
      }
      server.middlewares.use((request, response, next) => {
        if (request.url?.split("?")[0] !== `${base}forgeax-pack-program-worker.js`) return next();
        response.setHeader("content-type", "text/javascript");
        response.end(PACK_PROGRAM_WORKER_SOURCE);
      });
    },
    generateBundle(_options, bundle) {
      if (delivery === "native") return;
      const target = (id) => {
        const reference = imports.get(id);
        return reference ? this.getFileName(reference) : id;
      };
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== "chunk") continue;
        const edges = linkedEdges.get(chunk.preliminaryFileName);
        chunk.imports = [...new Set([...chunk.imports, ...edges?.imports ?? []].map(target))];
        chunk.dynamicImports = [
          ...new Set([...chunk.dynamicImports, ...edges?.dynamicImports ?? []].map(target))
        ];
      }
      this.emitFile({
        type: "asset",
        fileName: "forgeax-pack-program-worker.js",
        source: PACK_PROGRAM_WORKER_SOURCE
      });
    },
    async config(config, environment) {
      building = environment.command === "build";
      if (building) return { build: { modulePreload: false } };
      const root = config.root ?? process.cwd();
      const exclude = ["@forgeax/engine"];
      let manifest;
      try {
        manifest = require2.resolve("@forgeax/engine/package.json", {
          paths: [root]
        });
      } catch (cause) {
        if (cause.code !== "MODULE_NOT_FOUND") throw cause;
        return { optimizeDeps: { exclude } };
      }
      const { dependencies } = JSON.parse(await readFile(manifest, "utf8"));
      exclude.push(
        ...Object.keys(dependencies ?? {}).filter((name) => name.startsWith("@forgeax/engine-"))
      );
      if (!exclude.includes("@forgeax/engine-app")) return { optimizeDeps: { exclude } };
      const appManifest = require2.resolve("@forgeax/engine-app/package.json", {
        paths: [dirname(manifest)]
      });
      return {
        optimizeDeps: {
          exclude,
          // Excluded Engine modules keep their identity, but their dependencies
          // still need discovery before the first page starts using them.
          entries: [
            "**/*.html",
            "execution-bootstrap.ts",
            ...await runtimeDependencyEntries(appManifest)
          ]
        },
        server: {
          fs: {
            allow: [
              ...config.server?.fs?.allow === void 0 ? [searchForWorkspaceRoot(root)] : [],
              resolve(dirname(appManifest), "dist")
            ]
          }
        }
      };
    },
    async transform(code, id) {
      if (!building) return null;
      if (id === "\0vite/preload-helper.js") {
        const source = ts5.createSourceFile(
          id,
          code,
          ts5.ScriptTarget.Latest,
          true,
          ts5.ScriptKind.JS
        );
        for (const statement of source.statements) {
          if (!ts5.isVariableStatement(statement)) continue;
          for (const declaration of statement.declarationList.declarations) {
            const fn = declaration.initializer;
            if (!ts5.isIdentifier(declaration.name) || declaration.name.text !== "__vitePreload" || !fn || !ts5.isFunctionExpression(fn) || !fn.parameters[0] || !ts5.isIdentifier(fn.parameters[0].name))
              continue;
            const offset = fn.body.getStart(source) + 1;
            return {
              code: `${code.slice(0, offset)}
if (typeof document === 'undefined') return ${fn.parameters[0].name.text}();
${code.slice(offset)}`,
              map: null
            };
          }
        }
        return this.error("Vite preload helper no longer exposes its native import function");
      }
      const pattern = /new Worker\(\s*new URL\(\s*(['"])(\.\/(?:engine|render|kernel)-worker-runtime\.mjs)\1,\s*import\.meta\.url\s*\)/g;
      const matches = [...code.matchAll(pattern)];
      if (matches.length === 0) return null;
      const output = new MagicString(code);
      for (const match of matches.reverse()) {
        const source = match[2];
        if (source === void 0 || match.index === void 0) continue;
        const resolved = await this.resolve(source, id, { skipSelf: true });
        if (resolved === null) this.error(`Cannot resolve execution Worker ${source} from ${id}`);
        const reference = this.emitFile({
          type: "chunk",
          id: resolved.id,
          name: basename(source, ".mjs"),
          preserveSignature: "strict"
        });
        output.overwrite(
          match.index,
          match.index + match[0].length,
          `new Worker(import.meta.ROLLUP_FILE_URL_${reference}`
        );
      }
      return { code: output.toString(), map: output.generateMap({ hires: true }) };
    }
  };
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
    const transformed = ts5.transpileModule(source, {
      fileName: filename,
      compilerOptions: {
        target: ts5.ScriptTarget.ES2022,
        module: ts5.ModuleKind.ESNext,
        rewriteRelativeImportExtensions: true,
        verbatimModuleSyntax: true
      },
      reportDiagnostics: true
    });
    const errors = transformed.diagnostics?.filter((item) => item.category === ts5.DiagnosticCategory.Error) ?? [];
    if (errors.length)
      return err({
        code: "pack-program-invalid",
        expected: "TypeScript source that converts to target JavaScript",
        hint: "repair the source diagnostics and prepare the program again",
        detail: {
          module: filename,
          reason: errors.map((item) => ts5.flattenDiagnosticMessageText(item.messageText, "\n")).join("\n")
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
  const parsed = ts5.parseConfigFileTextToJson(path, await snapshot.readText(path));
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
    if (ts5.preProcessFile(source, true, true).importedFiles.some(({ fileName }) => /^(?:node:)?fs(?:\/promises)?$/.test(fileName)) || /\b(?:readFile(?:Sync)?|readdir(?:Sync)?|createReadStream)\s*\(/.test(source))
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
function projectError(code, expected, hint, detail) {
  return { ok: false, error: { code, expected, hint, detail } };
}
async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}
function isValidStartupTimeoutMs(value) {
  return value === null || typeof value === "number" && Number.isSafeInteger(value) && value > 0 && value <= 2147483647;
}
function timeoutFromPackage(root, packageJson, key = "startupTimeoutMs") {
  const forgeax = packageJson.forgeax;
  const forgeaxConfig = forgeax !== null && typeof forgeax === "object" && !Array.isArray(forgeax) ? forgeax : void 0;
  const timeoutMs = forgeaxConfig?.[key];
  if (timeoutMs !== void 0 && !isValidStartupTimeoutMs(timeoutMs)) {
    return projectError(
      "package-manifest-invalid",
      `package.json#forgeax.${key} to be a positive timer-safe integer or null`,
      `Set a positive millisecond value or null to disable ${key} deadlines.`,
      { root, [key]: timeoutMs }
    );
  }
  return {
    ok: true,
    value: timeoutMs
  };
}
async function readProjectFacts(rootInput = process.cwd()) {
  const requestedRoot = resolve(rootInput);
  let root = requestedRoot;
  try {
    root = await realpath(requestedRoot);
  } catch {
  }
  let forgeValue;
  let packageValue;
  try {
    [forgeValue, packageValue] = await Promise.all([
      readJson(resolve(root, "forge.json")),
      readJson(resolve(root, "package.json"))
    ]);
  } catch (cause) {
    return projectError(
      "project-manifest-unreadable",
      "readable forge.json and package.json files",
      "Run the command from a ForgeaX game root or pass its directory.",
      { root, reason: cause instanceof Error ? cause.message : String(cause) }
    );
  }
  if (forgeValue === null || typeof forgeValue !== "object") {
    return projectError(
      "project-manifest-invalid",
      "forge.json to contain an object",
      "Repair forge.json before running DevKit.",
      { root }
    );
  }
  if (packageValue === null || typeof packageValue !== "object") {
    return projectError(
      "package-manifest-invalid",
      "package.json to contain an object",
      "Repair package.json before running DevKit.",
      { root }
    );
  }
  const parsedForge = GameProjectSchema.safeParse(forgeValue);
  if (!parsedForge.success) {
    return projectError(
      "project-manifest-invalid",
      "forge.json to satisfy @forgeax/engine-project GameProjectSchema",
      "Repair the fields reported by the authoritative project schema.",
      { root, issues: parsedForge.error.issues }
    );
  }
  const forge = parsedForge.data;
  if (forge.id.length === 0 || forge.name.length === 0) {
    return projectError(
      "project-manifest-invalid",
      "forge.json to declare id and name",
      "Restore the project identity in the authoritative project manifest.",
      { root }
    );
  }
  const packageJson = packageValue;
  const startup = timeoutFromPackage(root, packageJson);
  if (!startup.ok) return startup;
  const frame = timeoutFromPackage(root, packageJson, "frameTimeoutMs");
  if (!frame.ok) return frame;
  return {
    ok: true,
    value: {
      root,
      id: forge.id,
      name: forge.name,
      roots: forge.roots,
      ...startup.value === void 0 ? {} : { startupTimeoutMs: startup.value },
      ...frame.value === void 0 ? {} : { frameTimeoutMs: frame.value },
      assetRoots: forge.assetRoots,
      packageJson
    }
  };
}

// src/tools/project-tools.ts
async function createModuleLoader(root) {
  const { createServer } = await import('vite');
  const server = await createServer({
    root,
    configFile: false,
    appType: "custom",
    logLevel: "silent",
    server: { middlewareMode: true, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] }
  });
  return {
    load: (name) => server.ssrLoadModule(name),
    resolve: async (specifier, importer) => (await server.environments.ssr?.pluginContainer.resolveId(specifier, importer))?.id,
    close: () => server.close()
  };
}
async function discoverProjectTools(rootInput, options = {}) {
  const root = resolve(rootInput);
  const facts = await readProjectFacts(root);
  if (!facts.ok) throw facts.error;
  const inventory = options.inventory ?? await discoverPluginAssets(facts.value);
  if (inventory.deferred.length)
    throw {
      code: "plugin-tool-discovery-deferred",
      expected: "tool declarations discoverable without cooked reads",
      hint: "move tool contracts to source-only plugin definitions",
      detail: { sources: inventory.deferred }
    };
  return readProjectToolContracts(root, inventory, options);
}
async function readProjectToolContracts(root, inventory, options) {
  const records = [...inventory.assets.values()].filter((record) => record.source.toolContract);
  if (!records.length) return [];
  await assertPluginSourceInputs(inventory, root);
  let loader = options.moduleLoader;
  try {
    const result = [];
    for (const record of records) {
      const reference = record.source.toolContract;
      if (!reference) continue;
      let moduleName = record.sourcePath;
      let contract = reference;
      if ("specifier" in reference) {
        moduleName = reference.specifier.startsWith(".") ? resolve(dirname(record.sourcePath), reference.specifier) : reference.specifier;
        loader ??= await createModuleLoader(root);
        await capturePluginProgramInputs(root, inventory, moduleName, loader.resolve);
        const module = await loader.load(moduleName);
        contract = module !== null && typeof module === "object" ? Reflect.get(module, reference.export ?? "default") : void 0;
      }
      if (!isToolCommandContract(contract))
        throw new TypeError(`${moduleName}: invalid tool contract or duplicate command ID`);
      const contractDigest = `sha256:${createHash("sha256").update(JSON.stringify(contract)).digest("hex")}`;
      for (const declaration of contract.commands) {
        const executor = declaration.executor?.startsWith(".") ? resolve(dirname(moduleName), declaration.executor) : declaration.executor;
        if (executor !== void 0) await capturePluginProgramInputs(root, inventory, executor);
        result.push({
          contribution: commandContribution(declaration),
          assetGuid: record.definition.guid,
          sourceRevision: record.definition.evidence.kind === "source" ? record.definition.evidence.revision : "",
          contractDigest,
          moduleName,
          realm: declaration.realm,
          declaration,
          ...executor === void 0 ? {} : { executor }
        });
      }
    }
    await assertPluginSourceInputs(inventory, root);
    return result;
  } finally {
    if (!options.moduleLoader) {
      inventory.sourceSnapshot.releaseResolvers();
      await loader?.close();
    }
  }
}

// src/build/dev-program-resources.ts
var devProgramResourceMeta = "forgeax.programResource";
function markDevProgramResources(plugins) {
  for (const name of ["vite:asset", "vite:worker", "vite:wasm-helper"]) {
    const plugin = plugins.find((plugin2) => plugin2.name === name);
    const hook = plugin?.load;
    if (!plugin || !hook) throw new TypeError(`Vite resource producer unavailable: ${name}`);
    const handler = typeof hook === "function" ? hook : hook.handler;
    const wrapped = async function(...args) {
      const result = await handler.apply(this, args);
      if (result == null || name === "vite:asset" && new URLSearchParams(args[0].split("?")[1]).has("raw"))
        return result;
      return typeof result === "string" ? { code: result, meta: { [devProgramResourceMeta]: name } } : { ...result, meta: { ...result.meta, [devProgramResourceMeta]: name } };
    };
    plugin.load = typeof hook === "function" ? wrapped : { ...hook, handler: wrapped };
  }
  for (const name of ["vite:asset-import-meta-url", "vite:worker-import-meta-url", "vite:css"]) {
    const plugin = plugins.find((plugin2) => plugin2.name === name);
    const hook = plugin?.transform;
    if (!plugin || !hook) throw new TypeError(`Vite resource producer unavailable: ${name}`);
    const handler = typeof hook === "function" ? hook : hook.handler;
    const wrapped = async function(...args) {
      const result = await handler.apply(this, args);
      if (result == null) return result;
      return typeof result === "string" ? { code: result, meta: { [devProgramResourceMeta]: name } } : { ...result, meta: { ...result.meta, [devProgramResourceMeta]: name } };
    };
    plugin.transform = typeof hook === "function" ? wrapped : { ...hook, handler: wrapped };
  }
}

// src/build/dev-program-url.ts
function normalizeDevProgramUrl(url) {
  const split = url.indexOf("?");
  if (split < 0) return url;
  const query = url.slice(split + 1).split("&").filter((part) => !/^t=\d+$/.test(part) && part !== "import" && part !== "import=");
  return url.slice(0, split) + (query.length ? `?${query.join("&")}` : "");
}
var devProgramSessionQuery = "forgeax-program-session";
function devProgramSession(url) {
  if (!url.includes("?")) return null;
  return new URLSearchParams(url.slice(url.indexOf("?") + 1)).get(devProgramSessionQuery);
}
function withDevProgramSession(url, session) {
  const split = url.indexOf("?");
  const pathname = split < 0 ? url : url.slice(0, split);
  const query = (split < 0 ? [] : url.slice(split + 1).split("&")).filter(
    (part) => !new URLSearchParams(part).has(devProgramSessionQuery)
  );
  if (session !== null) query.push(`${devProgramSessionQuery}=${encodeURIComponent(session)}`);
  return pathname + (query.length ? `?${query.join("&")}` : "");
}
function assertPortableResources(context, chunk) {
  const hasResource = chunk.viteMetadata?.importedAssets.size || chunk.viteMetadata?.importedCss.size || Object.keys(chunk.modules).some(
    (id) => /__VITE_(?:ASSET|PUBLIC_ASSET|WORKER_ASSET)__/.test(context.getModuleInfo(id)?.code ?? "")
  );
  if (hasResource)
    throw new TypeError(`plugin program resource requires a portable producer: ${chunk.fileName}`);
}
var BrowserPluginProgramArchive = class {
  entries = /* @__PURE__ */ new Map();
  chunks = /* @__PURE__ */ new Map();
  rendered = /* @__PURE__ */ new Map();
  groups = /* @__PURE__ */ new Map();
  recordRendered(code, chunk) {
    if (Object.keys(chunk.modules).some((id) => this.chunks.has(id)))
      this.rendered.set(chunk.fileName, code);
  }
  /** Every provider's sidecar includes all selections and the exact Engine identity. */
  hash(engineIdentity) {
    return createHash("sha256").update(
      JSON.stringify([engineIdentity, [...this.rendered].sort(([a], [b]) => a.localeCompare(b))])
    ).digest("hex");
  }
  preserveModules(context) {
    const visited = /* @__PURE__ */ new Set();
    const visit = (input) => {
      const id = normalizePath(input);
      if (visited.has(id)) return;
      visited.add(id);
      const info = context.getModuleInfo(id);
      if (!info || info.code === null || info.meta[engineCapabilityMeta]) return;
      if (!this.chunks.has(id))
        this.chunks.set(
          id,
          context.emitFile({
            type: "chunk",
            id,
            name: `program-${createHash("sha256").update(id).digest("hex").slice(0, 16)}`,
            preserveSignature: "strict"
          })
        );
      for (const dependency of [...info.importedIds, ...info.dynamicallyImportedIds])
        visit(dependency);
    };
    for (const id of this.entries.values()) visit(id);
  }
  /** Coalesce only modules with identical static entry reachability; lazy boundaries survive. */
  prepareGroups(context) {
    const roots = new Set(this.entries.values());
    for (const id of context.getModuleIds()) {
      const info = context.getModuleInfo(id);
      if (!info) continue;
      if (info.isEntry && !this.chunks.has(normalizePath(id))) roots.add(id);
      for (const dependency of info.dynamicallyImportedIds) roots.add(dependency);
    }
    const memberships = /* @__PURE__ */ new Map();
    for (const root of [...roots].sort()) {
      const seen = /* @__PURE__ */ new Set();
      const visit = (id) => {
        if (seen.has(id)) return;
        seen.add(id);
        const info = context.getModuleInfo(id);
        if (!info || info.meta[engineCapabilityMeta]) return;
        if (this.chunks.has(normalizePath(id))) {
          const entries = memberships.get(id) ?? [];
          entries.push(root);
          memberships.set(id, entries);
        }
        for (const dependency of info.importedIds) visit(dependency);
      };
      visit(root);
    }
    this.groups.clear();
    for (const [id, entries] of memberships) {
      if (!entries.length) continue;
      this.groups.set(
        id,
        `program-group-${createHash("sha256").update(JSON.stringify(entries)).digest("hex").slice(0, 16)}`
      );
    }
  }
  groupedOutput(output) {
    if (output.codeSplitting === false || output.inlineDynamicImports || output.format !== void 0 && output.format !== "es" && output.format !== "esm" && output.format !== "module")
      return output;
    const splitting = typeof output.codeSplitting === "object" ? output.codeSplitting : {};
    return {
      ...output,
      codeSplitting: {
        ...splitting,
        includeDependenciesRecursively: false,
        groups: [
          { name: (id) => this.groups.get(id) ?? null, priority: 100 },
          ...splitting.groups ?? []
        ]
      }
    };
  }
  /** A complete delivered graph contains every selected entry, regardless of its active export. */
  entryFiles(context) {
    return [
      ...new Set(
        [...this.entries.values()].map((id) => {
          const reference = this.chunks.get(normalizePath(id));
          if (!reference) throw new TypeError(`missing browser plugin export ${id}`);
          return context.getFileName(reference);
        })
      )
    ].sort();
  }
  capabilities(context) {
    const capabilities = /* @__PURE__ */ new Map();
    for (const id of [...context.getModuleIds()].sort()) {
      const capability = context.getModuleInfo(id)?.meta[engineCapabilityMeta];
      if (!capability?.reference) continue;
      const file = context.getFileName(capability.reference);
      if (!capabilities.has(file)) capabilities.set(file, capability.specifier);
    }
    return capabilities;
  }
  /** Delivery locators stay in the current Host, outside exported portable programs. */
  imports(context, engineIdentity) {
    return Object.fromEntries(
      [...this.capabilities(context)].map(([url, name]) => [
        name,
        { identity: engineIdentity, url }
      ])
    );
  }
  capture(context, bundle, engineIdentity) {
    const capabilities = this.capabilities(context);
    const engineChunks = /* @__PURE__ */ new Set();
    const protect = (filename) => {
      if (engineChunks.has(filename)) return;
      engineChunks.add(filename);
      const chunk = bundle[filename];
      if (chunk?.type === "chunk")
        for (const dependency of [...chunk.imports, ...chunk.dynamicImports]) protect(dependency);
    };
    for (const filename of capabilities.keys()) protect(filename);
    const modules = {};
    const imports = {};
    const visit = (filename) => {
      if (Object.hasOwn(modules, filename)) return;
      const chunk = bundle[filename];
      if (chunk?.type !== "chunk")
        throw new TypeError(`plugin program resource requires a portable producer: ${filename}`);
      assertPortableResources(context, chunk);
      if (engineChunks.has(filename))
        throw new TypeError(`plugin program shares an undeclared Engine dependency: ${filename}`);
      modules[filename] = "";
      modules[filename] = rewriteModuleSpecifiers(chunk.code, filename, (specifier) => {
        const dependency = specifier.startsWith(".") ? posix.normalize(posix.join(posix.dirname(filename), specifier)) : specifier;
        const capability = capabilities.get(dependency);
        if (capability) {
          imports[capability] = engineIdentity;
          return capability;
        }
        visit(dependency);
        return void 0;
      });
    };
    const selections = [...this.entries].sort(([a], [b]) => a.localeCompare(b)).map(([key, id]) => {
      const reference = this.chunks.get(normalizePath(id));
      if (!reference) throw new TypeError(`missing browser plugin export ${key}`);
      const entry = context.getFileName(reference);
      visit(entry);
      return [key, entry];
    });
    return Object.fromEntries(
      selections.map(([key, entry]) => [
        key,
        preparePackProgram({ modules, imports, entry, export: "default" }).unwrap()
      ])
    );
  }
};
async function captureDevPluginPrograms(server, selections, identity, session) {
  const environment = server.environments.client;
  if (!environment) throw new TypeError("browser plugin capture requires a client environment");
  const base = server.config.base;
  const local = (url) => url.startsWith(base) ? `/${url.slice(base.length)}` : url;
  const responses = /* @__PURE__ */ new Map();
  const files = /* @__PURE__ */ new Map();
  const imports = {};
  const modules = {};
  const urls = {};
  const moduleIds = /* @__PURE__ */ new Set();
  const capabilities = /* @__PURE__ */ new Set();
  let unsupported;
  const visit = async (requested) => {
    const incoming = normalizeDevProgramUrl(local(requested));
    if (incoming.startsWith("/@vite/")) {
      unsupported ??= `plugin program resource requires a portable producer: ${incoming}`;
      return incoming;
    }
    const request = incoming.startsWith("/@id/") ? incoming.slice(5).replace("__x00__", "\0") : incoming;
    const known = files.get(request);
    if (known) return known;
    const [url, id, meta] = await environment.moduleGraph.resolveUrl(request);
    const capability = meta?.[engineCapabilityMeta];
    if (capability) {
      imports[capability.specifier] = { identity, url: `${base}${url.slice(1)}` };
      capabilities.add(url);
      return capability.specifier;
    }
    const nativeUrl = url.includes("\0") || url.startsWith("virtual:") ? `/@id/${url.replace("\0", "__x00__")}` : url;
    const filename = `modules/${createHash("sha256").update(withDevProgramSession(url, null)).digest("hex")}.js`;
    files.set(request, filename);
    files.set(url, filename);
    moduleIds.add(withDevProgramSession(id, null));
    const delivered = session === void 0 ? nativeUrl : withDevProgramSession(nativeUrl, session);
    urls[filename] = `${base}${delivered.slice(1)}`;
    const result = await environment.transformRequest(url);
    if (!result) throw new TypeError(`plugin module unavailable: ${url}`);
    if (environment.pluginContainer.getModuleInfo(id)?.meta[devProgramResourceMeta] || /^\/@vite\//.test(url) || id.includes("__vite-browser-external"))
      unsupported ??= `plugin program resource requires a portable producer: ${url}`;
    const dependencies = [];
    rewriteModuleSpecifiers(result.code, url, (specifier) => {
      dependencies.push(specifier);
      return void 0;
    });
    const edges = /* @__PURE__ */ new Map();
    for (const dependency of dependencies) {
      if (!dependency.startsWith("/")) {
        unsupported ??= `plugin program import requires a portable producer: ${dependency}`;
        continue;
      }
      edges.set(dependency, await visit(dependency));
    }
    modules[filename] = rewriteModuleSpecifiers(result.code, url, (specifier) => {
      const target = edges.get(specifier);
      return target?.startsWith("modules/") ? `./${target.slice("modules/".length)}` : target;
    });
    responses.set(
      delivered,
      rewriteModuleSpecifiers(result.code, url, (specifier) => {
        const target = edges.get(specifier);
        return target?.startsWith("modules/") ? urls[target] : void 0;
      })
    );
    return filename;
  };
  const entries = /* @__PURE__ */ new Map();
  for (const [key, url] of selections) entries.set(key, await visit(url));
  const protectedIds = /* @__PURE__ */ new Set();
  const protect = async (url) => {
    const incoming = normalizeDevProgramUrl(local(url));
    if (incoming.startsWith("/@vite/")) return;
    const node = await environment.moduleGraph.ensureEntryFromUrl(incoming);
    if (!node.id || protectedIds.has(node.id)) return;
    protectedIds.add(node.id);
    if (moduleIds.has(withDevProgramSession(node.id, null)))
      unsupported ??= `plugin program shares an undeclared Engine dependency: ${node.id}`;
    const transformed = await environment.transformRequest(node.url);
    if (!transformed) throw new TypeError(`Engine capability module unavailable: ${node.url}`);
    const dependencies = [];
    rewriteModuleSpecifiers(transformed.code, node.url, (specifier) => {
      dependencies.push(specifier);
      return void 0;
    });
    for (const dependency of dependencies) await protect(dependency);
  };
  for (const url of capabilities) await protect(url);
  const programs = {};
  if (!unsupported)
    for (const [key, entry] of entries)
      programs[key] = preparePackProgram({
        modules,
        entry,
        export: "default",
        imports: Object.fromEntries(Object.keys(imports).map((name) => [name, identity]))
      }).unwrap();
  return {
    responses,
    moduleIds,
    entries: [...new Set(entries.values())].sort(),
    archive: unsupported ? { error: unsupported } : { programs, imports, urls }
  };
}

// src/build/plugin-programs.ts
var pluginRuntimeQuery = "?forgeax-plugin-runtime";
var prefix = "virtual:forgeax/plugin-programs/";
var exportPrefix = "virtual:forgeax/plugin-export/";
var nativeEntriesMarker = "__forgeax_native_program_entries__";
var devProgramSessions = /* @__PURE__ */ new WeakMap();
function exportModule(module, name) {
  return exportPrefix + encodeURIComponent(name) + "?source=" + encodeURIComponent(JSON.stringify([module, name]));
}
function assertStaticPluginImports(source, filename) {
  const file = ts5.createSourceFile(
    filename,
    source,
    ts5.ScriptTarget.Latest,
    true,
    ts5.ScriptKind.TS
  );
  function visit(node) {
    if (ts5.isCallExpression(node) && node.expression.kind === ts5.SyntaxKind.ImportKeyword && (node.arguments.length !== 1 || node.arguments[0] === void 0 || !ts5.isStringLiteralLike(node.arguments[0]))) {
      throw new TypeError(`${filename}: plugin runtime imports must have literal specifiers`);
    }
    ts5.forEachChild(node, visit);
  }
  visit(file);
}
function projectPluginRuntimeSource(source, filename) {
  const file = ts5.createSourceFile(
    filename,
    source,
    ts5.ScriptTarget.Latest,
    true,
    ts5.ScriptKind.TS
  );
  const defineNames = /* @__PURE__ */ new Set();
  for (const node of file.statements) {
    if (!ts5.isImportDeclaration(node) || !ts5.isStringLiteral(node.moduleSpecifier) || !["@forgeax/engine/pack/source", "@forgeax/engine-pack/source"].includes(
      node.moduleSpecifier.text
    ))
      continue;
    const bindings = node.importClause?.namedBindings;
    if (bindings && ts5.isNamedImports(bindings))
      for (const binding of bindings.elements) {
        if ((binding.propertyName ?? binding.name).text === "definePack")
          defineNames.add(binding.name.text);
      }
  }
  const declaration = file.statements.find(
    (node) => ts5.isExportAssignment(node) && !node.isExportEquals && ts5.isCallExpression(node.expression) && ts5.isIdentifier(node.expression.expression) && defineNames.has(node.expression.expression.text)
  );
  if (!declaration)
    throw new TypeError(`${filename}: expected default definePack(...) for the runtime projection`);
  const edits = [{ start: declaration.getStart(file), end: declaration.end, text: "" }];
  for (const node of file.statements) {
    if (!ts5.isImportDeclaration(node) || !node.importClause?.namedBindings || !ts5.isNamedImports(node.importClause.namedBindings))
      continue;
    const bindings = node.importClause.namedBindings;
    const remaining = bindings.elements.filter((binding) => !defineNames.has(binding.name.text));
    if (remaining.length === bindings.elements.length) continue;
    const clause = ts5.factory.updateImportClause(
      node.importClause,
      node.importClause.isTypeOnly,
      node.importClause.name,
      remaining.length ? ts5.factory.updateNamedImports(bindings, remaining) : void 0
    );
    const replacement = remaining.length || clause.name ? ts5.createPrinter().printNode(
      ts5.EmitHint.Unspecified,
      ts5.factory.updateImportDeclaration(
        node,
        node.modifiers,
        clause,
        node.moduleSpecifier,
        node.attributes
      ),
      file
    ) : "";
    edits.push({ start: node.getStart(file), end: node.end, text: replacement });
  }
  const output = new MagicString(source);
  for (const edit of edits) output.overwrite(edit.start, edit.end, edit.text);
  return {
    code: output.toString(),
    map: output.generateMap({ hires: true, source: filename, includeContent: true })
  };
}
function pluginRootDescriptor(definition) {
  return {
    program: definition.asset.program,
    source: definition.guid,
    codeRevision: JSON.stringify(definition.evidence),
    ...definition.asset.config === void 0 ? {} : { config: definition.asset.config }
  };
}
function pluginProgramSpecifier(record) {
  if (!record.module.endsWith(".pack.ts")) return record.module;
  if (record.export === "default")
    throw new TypeError(`${record.sourcePath}: a Pack runtime plugin requires a named export`);
  return `${record.module}${pluginRuntimeQuery}`;
}
function projectPluginPrograms(records, target, tools = [], projectRoot) {
  const programs = /* @__PURE__ */ new Map();
  const add = (key, module, name) => {
    const previous = programs.get(key);
    if (previous && (previous.module !== module || previous.export !== name))
      throw new TypeError(`conflicting delivered program ${key}`);
    programs.set(key, { module, export: name });
  };
  for (const record of records) {
    add(record.definition.asset.program, pluginProgramSpecifier(record), record.export);
  }
  const declarations = new Map(
    records.map((record) => [record.definition.guid, []])
  );
  for (const tool of tools) {
    const rows = declarations.get(tool.assetGuid);
    if (tool.realm !== target || !rows) continue;
    const contract = lowerPluginToolContract(
      defineToolCommandContract([tool.declaration]),
      (reference) => {
        const resolved = resolvePluginProgram(tool.moduleName, reference, projectRoot);
        const module = pluginProgramSpecifier({ ...resolved, sourcePath: tool.moduleName });
        add(resolved.program, module, resolved.export);
        return resolved.program;
      }
    );
    if (!contract.ok) throw new TypeError(contract.error.detail.reason);
    rows.push(...contract.value.commands);
  }
  const contracts = new Map(
    [...declarations].map(([guid, rows]) => [guid, defineToolCommandContract(rows)])
  );
  return { programs, tools: contracts };
}
function pluginProgramSource(records, target, definitions, tools = [], projectRoot, archiveSuffix) {
  const projection = projectPluginPrograms(records, target, tools, projectRoot);
  const programs = [...projection.programs].map(
    ([key, value]) => `[${JSON.stringify(key)}, { ${archiveSuffix ? `exportSource: () => exportProgram(${JSON.stringify(key)}),` : ""} load: () => import(${JSON.stringify(exportModule(value.module, value.export))}).then(module => module.default) }]`
  );
  return `${archiveSuffix ? `
import { packProgramModuleIdentity, verifyPackProgram } from '@forgeax/engine/pack/runtime';
import imports from 'virtual:forgeax/pack-program-imports';
const nativeEntries = Object.freeze(${JSON.stringify(nativeEntriesMarker)});
const archiveUrl = new URL(import.meta.url);
const archiveSession = archiveUrl.searchParams.get(${JSON.stringify(devProgramSessionQuery)});
archiveUrl.search = ''; archiveUrl.hash = ''; archiveUrl.pathname += ${JSON.stringify(archiveSuffix)};
if (archiveSession) archiveUrl.searchParams.set(${JSON.stringify(devProgramSessionQuery)}, archiveSession);
let archived;
async function readArchive() {
  const archive = await (archived ??= fetch(archiveUrl).then(async response => {
    if (!response.ok) throw new TypeError('plugin program archive unavailable: ' + response.status);
    return response.json();
  }).catch(cause => { archived = undefined; throw cause; }));
  if (archive.error) throw new TypeError(archive.error);
  return archive;
}
async function exportProgram(key) {
  const archive = await readArchive();
  return verifyPackProgram(archive.programs?.[key]).unwrap();
}
function createProgramHost(fallback) {
  // When the fallback owns a native loader, remember only the URLs this
  // wrapper published itself. Other imports retain the publishing host.
  const nativeUrls = fallback?.importModule ? new Set() : undefined;
  return { async publish(program, bindings) {
    // Missing a delivered selection proves this is a different graph. Such a
    // program must not depend on unrelated static archive availability.
    if (nativeEntries.length && nativeEntries.every(name => Object.hasOwn(program.modules, name))) {
      const archive = await readArchive();
      const delivered = Object.values(archive.programs)[0];
      if (delivered) {
        const nativeImports = Object.fromEntries(Object.entries(archive.imports).map(([name, entry]) => [name, { ...entry, url: new URL(entry.url, archiveUrl).href }]));
        if (packProgramModuleIdentity(program, bindings).unwrap() === packProgramModuleIdentity(delivered, nativeImports).unwrap()) {
          const url = new URL(archive.urls[program.entry], archiveUrl).href;
          nativeUrls?.add(url);
          return url;
        }
      }
    }
    if (!fallback) throw new TypeError('New program modules require runtime module delivery');
    return fallback.publish(program, bindings);
  }, ...(nativeUrls ? { async importModule(url) {
    return nativeUrls.has(url) ? import(/* @vite-ignore */ url) : fallback.importModule(url);
  } } : {}) };
}
` : ""}const tools = new Map(${JSON.stringify([...projection.tools])});
const programs = new Map([${programs.join(",\n")}]);
const definitions = new Map(${JSON.stringify(definitions)});
export function createPrograms(sessionId, contextId, sessionGeneration, programHost) {
  return Object.freeze({ sessionId, contextId, sessionGeneration, target: ${JSON.stringify(target)}, programs, definitions, tools${archiveSuffix ? ", imports, programHost: createProgramHost(programHost)" : ""} });
}`;
}
function pluginRuntimeProjection(projectRoot, sourceInputs) {
  const canonicalPath = (path) => {
    const absolute = resolve(filesystemPathKey(path));
    try {
      return realpathSync.native(absolute);
    } catch {
      return absolute;
    }
  };
  const canonicalProjectRoot = projectRoot === void 0 ? void 0 : canonicalPath(projectRoot);
  const canonicalSourceInputs = sourceInputs === void 0 ? void 0 : /* @__PURE__ */ new Map();
  function captureSource(path, digest2) {
    if (!canonicalSourceInputs) return;
    const canonical = canonicalPath(path);
    const previous = canonicalSourceInputs.get(canonical);
    canonicalSourceInputs.set(
      canonical,
      canonicalSourceInputs.has(canonical) && previous !== digest2 ? void 0 : digest2
    );
  }
  for (const [path, digest2] of sourceInputs ?? []) captureSource(path, digest2);
  let observedSourceInputCount = sourceInputs?.size ?? 0;
  let sourceInputsFrozen = false;
  function refreshSourceInputAdditions() {
    if (!sourceInputs || !canonicalSourceInputs || sourceInputsFrozen || sourceInputs.size === observedSourceInputCount)
      return;
    for (const [path, digest2] of sourceInputs) captureSource(path, digest2);
    observedSourceInputCount = sourceInputs.size;
  }
  function assertSource(path, source) {
    if (!canonicalSourceInputs) return;
    refreshSourceInputAdditions();
    const digest2 = `sha256:${createHash("sha256").update(source).digest("hex")}`;
    const expected = canonicalSourceInputs.get(canonicalPath(path));
    sourceInputsFrozen = true;
    assertPluginSourceRevision(path, expected, digest2);
  }
  return {
    name: "forgeax:plugin-runtime-projection",
    enforce: "pre",
    resolveId(id) {
      if (id.startsWith(exportPrefix)) return `\0${id}`;
      if (id.startsWith(`\0${exportPrefix}`)) return id;
      return new URLSearchParams(id.slice(id.indexOf("?") + 1)).has(pluginRuntimeQuery.slice(1)) ? id : null;
    },
    transform(code, id) {
      if (!canonicalProjectRoot || !isAbsolute(id)) return null;
      const sourcePath = id.split("?")[0] ?? id;
      const path = filesystemPathRelative(canonicalProjectRoot, canonicalPath(sourcePath));
      if (path === void 0 || filesystemPathSegments(path).some((part) => part === ".forgeax" || part === "node_modules"))
        return null;
      if (/\.[cm]?[jt]sx?(?:\?|$)/.test(id)) {
        if (canonicalSourceInputs?.has(canonicalPath(sourcePath)) && !new URLSearchParams(id.slice(id.indexOf("?") + 1)).has(pluginRuntimeQuery.slice(1)))
          assertSource(sourcePath, readFileSync(sourcePath));
        assertStaticPluginImports(code, id);
      }
      return null;
    },
    async load(id) {
      id = withDevProgramSession(id, null);
      if (id.startsWith(`\0${exportPrefix}`)) {
        const encoded = new URLSearchParams(id.slice(id.indexOf("?") + 1)).get("source");
        if (!encoded) throw new TypeError("missing plugin export source");
        const [module, name] = JSON.parse(encoded);
        return `export { ${JSON.stringify(name)} as default } from ${JSON.stringify(module)};`;
      }
      if (!new URLSearchParams(id.slice(id.indexOf("?") + 1)).has(pluginRuntimeQuery.slice(1)))
        return null;
      const filename = id.slice(0, id.indexOf("?"));
      if (projectRoot) {
        if (!isFilesystemPathWithin(projectRoot, filename, false))
          throw new TypeError(`${filename}: plugin runtime source escapes project root`);
        if (!isFilesystemPathWithin(await realpath(projectRoot), await realpath(filename), false))
          throw new TypeError(`${filename}: plugin runtime source real path escapes project root`);
      }
      this.addWatchFile(filename);
      const source = await readFile(filename, "utf8");
      assertSource(filename, source);
      const projected = projectPluginRuntimeSource(source, filename);
      assertStaticPluginImports(projected.code, filename);
      return projected;
    }
  };
}
function assertPluginProgramGraphInputs(projectRoot, inventory, modules, moduleInfo) {
  const root = realpathSync.native(projectRoot);
  const physical = /* @__PURE__ */ new Map();
  const local = (id) => {
    if (!isAbsolute(id)) return void 0;
    const file = id.split("?")[0] ?? id;
    if (physical.has(file)) return physical.get(file);
    const path = realpathSync.native(file);
    const result = isFilesystemPathWithin(root, path, false) && !relative(root, path).split(/[\\/]/).some((part) => part === ".forgeax" || part === "node_modules") ? path : void 0;
    physical.set(file, result);
    return result;
  };
  const pending = [...modules].filter((id) => {
    const path = local(id);
    return path !== void 0 && hasPluginSourceInput(inventory.sourceInputs, path);
  });
  const visited = /* @__PURE__ */ new Set();
  for (const id of pending) {
    if (visited.has(id)) continue;
    visited.add(id);
    const info = moduleInfo(id);
    for (const dependency of [
      ...info?.importedIds ?? [],
      ...info?.dynamicallyImportedIds ?? []
    ]) {
      const path = local(dependency);
      if (path !== void 0 && !hasPluginSourceInput(inventory.sourceInputs, path))
        assertPluginSourceRevision(
          path,
          void 0,
          "compiler consumed an uncaptured program input"
        );
      pending.push(dependency);
    }
  }
}
function pluginProgramsBuild(options) {
  const modulePrefix = options.namespace ? `${prefix}${options.namespace}/` : prefix;
  let command = "build";
  const projections = /* @__PURE__ */ new Map();
  const archive = new BrowserPluginProgramArchive();
  const archiveSuffix = options.namespace ? `.programs-${encodeURIComponent(options.namespace)}.json` : ".programs.json";
  let engineIdentity = "";
  let session = "";
  const sessionModules = /* @__PURE__ */ new Set();
  const hasRoots = options.roots.engine !== void 0 || options.roots.frontend !== void 0;
  let dev;
  return {
    name: "forgeax:plugin-programs",
    enforce: "pre",
    options(input) {
      if (options.delivery !== "native" && hasRoots && input.preserveEntrySignatures === "strict")
        return { ...input, preserveEntrySignatures: "allow-extension" };
      return null;
    },
    closeBundle() {
      if (command === "serve") {
        dev?.inventory.sourceSnapshot.releaseResolvers();
        dev = void 0;
        sessionModules.clear();
      }
    },
    configResolved(config) {
      command = config.command;
      const identity = devProgramSessions.get(config) ?? randomUUID();
      devProgramSessions.set(config, identity);
      session = identity;
    },
    hotUpdate: {
      order: "pre",
      handler(context) {
        if (this.environment.name !== "client" || !dev?.inventory.sourceInputs.has(resolve(context.file)))
          return;
        if (!context.server.config.configFile || context.server.config.plugins.some((plugin) => plugin.name === "forgeax:project-session"))
          return [];
        const accepted = dev;
        void new Promise((resolve7) => setTimeout(resolve7, 0)).then(async () => {
          if (dev !== accepted) return;
          await context.server.restart();
        }).catch((cause) => {
          context.server.config.logger.error(
            cause instanceof Error ? cause.message : String(cause)
          );
        });
        return [];
      }
    },
    buildStart: {
      order: "post",
      sequential: true,
      async handler() {
        if (command !== "build" || !hasRoots) return;
        const inventory = await options.inventory();
        const tools = options.tools ?? await discoverProjectTools(options.projectRoot, { inventory });
        for (const target of ["engine", "frontend"])
          for (const value of projectPluginPrograms(
            pluginAssetClosure(inventory, options.roots[target]),
            target,
            tools,
            options.projectRoot
          ).programs.values())
            await capturePluginProgramInputs(
              options.projectRoot,
              inventory,
              value.module,
              async (specifier, importer) => (await this.resolve(specifier, importer))?.id
            );
      }
    },
    async configureServer(server) {
      try {
        const base = server.config.base;
        const frozenSource = (url) => {
          let local = url.startsWith(base) ? `/${url.slice(base.length)}` : url;
          if (local.startsWith("\0") || local.startsWith("virtual:"))
            local = `/@id/${local.replace("\0", "__x00__")}`;
          return dev?.responses.get(normalizeDevProgramUrl(local));
        };
        server.middlewares.use((request, response, next) => {
          if (request.method !== "GET" || !request.url?.startsWith(base)) return next();
          const url = normalizeDevProgramUrl(`/${request.url.slice(base.length)}`);
          const requestedSession = devProgramSession(url);
          if (requestedSession !== null && requestedSession !== session) {
            response.statusCode = 410;
            response.setHeader("cache-control", "no-store");
            response.end("Plugin program session retired");
            return;
          }
          const pathname = url.split("?")[0];
          if (pathname?.startsWith(`/@id/__x00__${modulePrefix}`) && pathname.endsWith(archiveSuffix)) {
            if (requestedSession !== session) {
              response.statusCode = 410;
              response.end("Plugin program archive requires its session");
              return;
            }
            response.setHeader("content-type", "application/json");
            response.end(
              JSON.stringify(dev?.archive ?? { error: "No browser plugin programs in this Host" })
            );
            return;
          }
          const source = frozenSource(request.url);
          if (source === void 0) return next();
          response.setHeader("content-type", "text/javascript");
          response.end(source);
        });
        if (!hasRoots) return;
        const environment = server.environments.client;
        if (!environment) throw new TypeError("plugin capture requires a client environment");
        const transform = environment.transformRequest.bind(environment);
        const warmup = environment.warmupRequest.bind(environment);
        environment.transformRequest = async (url, ...options2) => {
          const code = frozenSource(url);
          return code === void 0 ? transform(url, ...options2) : { code, map: null };
        };
        environment.warmupRequest = async (url) => {
          if (frozenSource(url) === void 0) await warmup(url);
        };
        markDevProgramResources(environment.plugins);
        await server.environments.client?.depsOptimizer?.init();
        await options.pack.ready();
        const inventory = await options.inventory();
        const tools = options.tools ?? await discoverProjectTools(options.projectRoot, { inventory });
        const selections = /* @__PURE__ */ new Map();
        for (const target of ["engine", "frontend"])
          for (const [key, value] of projectPluginPrograms(
            pluginAssetClosure(inventory, options.roots[target]),
            target,
            tools,
            options.projectRoot
          ).programs) {
            await capturePluginProgramInputs(
              options.projectRoot,
              inventory,
              value.module,
              async (specifier, importer) => (await environment.pluginContainer.resolveId(specifier, importer))?.id
            );
            selections.set(key, `/@id/__x00__${exportModule(value.module, value.export)}`);
          }
        const engineManifest = await environment.pluginContainer.resolveId(
          "@forgeax/engine/package.json"
        );
        if (!engineManifest || engineManifest.external)
          throw new Error("Engine manifest unavailable from the Vite host");
        dev = {
          ...await captureDevPluginPrograms(
            server,
            selections,
            await runtimeProgramIdentity(engineManifest.id),
            session
          ),
          inventory
        };
        assertPluginProgramGraphInputs(options.projectRoot, inventory, dev.moduleIds, (id) => {
          const node = environment.moduleGraph.getModuleById(id);
          return node ? {
            importedIds: [...node.importedModules].flatMap(
              (dependency) => dependency.id ? [dependency.id] : []
            ),
            dynamicallyImportedIds: []
          } : null;
        });
        for (const id of dev.moduleIds) sessionModules.add(id);
        await assertPluginSourceInputs(inventory, options.projectRoot);
        server.watcher.add([...inventory.sourceInputs.keys()]);
      } catch (cause) {
        await server.close();
        throw cause;
      }
    },
    resolveId: {
      order: "pre",
      async handler(id, importer, resolveOptions) {
        const marker = "forgeax:program-session";
        if (resolveOptions.custom?.[marker]) return null;
        const requestedSession = devProgramSession(id);
        if (command === "serve" && requestedSession !== null && requestedSession !== session)
          this.error("Plugin program session retired");
        if (command !== "serve" || !hasRoots || "scan" in resolveOptions && resolveOptions.scan)
          return id.startsWith(modulePrefix) ? `\0${id}` : null;
        const clean = withDevProgramSession(id, null);
        const parent = importer === void 0 ? void 0 : withDevProgramSession(importer, null);
        const resolved = clean.startsWith(modulePrefix) ? { id: `\0${clean}` } : await this.resolve(clean, parent, {
          ...resolveOptions,
          skipSelf: true,
          custom: { ...resolveOptions.custom, [marker]: true }
        });
        if (!resolved || "external" in resolved && resolved.external || "meta" in resolved && resolved.meta?.[engineCapabilityMeta])
          return resolved;
        const filename = resolved.id.split("?")[0] ?? resolved.id;
        const path = filesystemPathRelative(options.projectRoot, filename);
        const projectModule = isAbsolute(filename) && /\.[cm]?[jt]sx?$/.test(filename) && path !== void 0 && !filesystemPathSegments(path).includes("node_modules");
        const facade = resolved.id.startsWith(`\0${exportPrefix}`) || resolved.id.startsWith(`\0${modulePrefix}`);
        if (facade || projectModule || sessionModules.has(resolved.id) || isAbsolute(filename) && /\.[cm]?[jt]sx?$/.test(filename) && importer !== void 0 && devProgramSession(importer) === session) {
          sessionModules.add(resolved.id);
          return { ...resolved, id: withDevProgramSession(resolved.id, session) };
        }
        return resolved;
      }
    },
    async load(id) {
      id = withDevProgramSession(id, null);
      if (!id.startsWith(`\0${modulePrefix}`)) return null;
      const target = id.slice(modulePrefix.length + 1);
      if (target !== "frontend" && target !== "engine")
        throw new TypeError(`unknown player plugin target ${target}`);
      if (command === "serve") await options.pack.ready();
      const inventory = dev?.inventory ?? await options.inventory();
      const records = pluginAssetClosure(inventory, options.roots[target]);
      const rows = options.pack.catalogSnapshot();
      const definitions = records.map((record) => {
        const guid = record.definition.guid;
        const row = rows.find((entry) => entry.guid === guid);
        if (!row?.publication)
          throw new TypeError(`${guid}: plugin has no accepted publication for this program build`);
        const { generation, digest: digest2, outputSetDigest } = row.publication;
        return [
          guid,
          {
            kind: "publication",
            publication: {
              scopeId: options.binding.scopeId,
              generation,
              digest: digest2,
              outputSetDigest
            }
          }
        ];
      });
      const tools = options.tools ?? await discoverProjectTools(options.projectRoot, { inventory });
      if (command === "build" && options.delivery !== "native") {
        for (const [key, value] of projectPluginPrograms(
          records,
          target,
          tools,
          options.projectRoot
        ).programs) {
          archive.entries.set(key, `\0${exportModule(value.module, value.export)}`);
        }
      }
      projections.set(target, {
        root: options.roots[target],
        definitions,
        programs: [
          ...projectPluginPrograms(records, target, tools, options.projectRoot).programs.keys()
        ]
      });
      const rootDefinition = records.find(
        (record) => record.definition.guid === options.roots[target]
      )?.definition;
      const rootEvidence = definitions.find(([guid]) => guid === rootDefinition?.guid)?.[1];
      if (rootDefinition && !rootEvidence) throw new TypeError("root publication evidence missing");
      const descriptor = rootDefinition && rootEvidence ? pluginRootDescriptor({
        ...rootDefinition,
        evidence: rootEvidence
      }) : null;
      const source = pluginProgramSource(
        records,
        target,
        definitions,
        tools,
        options.projectRoot,
        options.delivery === "native" ? void 0 : archiveSuffix
      );
      return `${command === "serve" ? source.replace(JSON.stringify(nativeEntriesMarker), JSON.stringify(dev?.entries ?? [])) : source}
export const root = ${JSON.stringify(options.roots[target] ?? null)};
export const rootDescriptor = ${JSON.stringify(descriptor)};`;
    },
    moduleParsed() {
      if (command === "build") archive.preserveModules(this);
    },
    async buildEnd(error) {
      if (!error) archive.prepareGroups(this);
      if (!error && command === "build" && archive.entries.size) {
        const engineManifest = await this.resolve("@forgeax/engine/package.json", void 0, {
          skipSelf: true
        });
        if (!engineManifest || engineManifest.external)
          this.error("Engine manifest unavailable from the Vite host");
        engineIdentity = await runtimeProgramIdentity(engineManifest.id);
      }
    },
    renderChunk: {
      order: "post",
      handler(code, chunk) {
        const output = new MagicString(code);
        if (code.includes(nativeEntriesMarker)) {
          const file = ts5.createSourceFile(
            chunk.fileName,
            code,
            ts5.ScriptTarget.Latest,
            true,
            ts5.ScriptKind.JS
          );
          const edits = [];
          const visit = (node) => {
            if (ts5.isStringLiteralLike(node) && node.text === nativeEntriesMarker)
              edits.push({ start: node.getStart(file), end: node.end });
            ts5.forEachChild(node, visit);
          };
          visit(file);
          const entries = JSON.stringify(archive.entryFiles(this));
          for (const edit of edits) output.overwrite(edit.start, edit.end, entries);
        }
        archive.recordRendered(output.toString(), chunk);
        return output.hasChanged() ? { code: output.toString(), map: output.generateMap({ hires: true }) } : null;
      }
    },
    outputOptions(output) {
      return options.delivery === "native" ? output : archive.groupedOutput(output);
    },
    augmentChunkHash(chunk) {
      if (Object.keys(chunk.modules).some((id) => id.startsWith(`\0${modulePrefix}`)))
        return archive.hash(engineIdentity);
      return void 0;
    },
    generateBundle: {
      order: "post",
      async handler(_options, bundle) {
        const inventory = await options.inventory();
        assertPluginProgramGraphInputs(
          options.projectRoot,
          inventory,
          this.getModuleIds(),
          (id) => this.getModuleInfo(id)
        );
        await assertPluginSourceInputs(inventory, options.projectRoot);
        inventory.sourceSnapshot.releaseResolvers();
        if (archive.entries.size) {
          let data;
          try {
            data = {
              programs: archive.capture(this, bundle, engineIdentity),
              imports: archive.imports(this, engineIdentity)
            };
          } catch (cause) {
            data = { error: cause instanceof Error ? cause.message : JSON.stringify(cause) };
          }
          for (const chunk of Object.values(bundle)) {
            if (chunk.type !== "chunk" || !Object.keys(chunk.modules).some((id) => id.startsWith(`\0${modulePrefix}`)))
              continue;
            this.emitFile({
              type: "asset",
              fileName: `${chunk.fileName}${archiveSuffix}`,
              source: JSON.stringify(
                "error" in data ? data : {
                  ...data,
                  imports: Object.fromEntries(
                    Object.entries(archive.imports(this, engineIdentity)).map(
                      ([name, entry]) => [
                        name,
                        {
                          ...entry,
                          url: posix.relative(posix.dirname(chunk.fileName), entry.url)
                        }
                      ]
                    )
                  ),
                  urls: Object.fromEntries(
                    Object.keys(
                      Object.values(
                        data.programs
                      )[0]?.modules ?? {}
                    ).map((path) => [
                      path,
                      posix.relative(posix.dirname(chunk.fileName), path)
                    ])
                  )
                }
              )
            });
          }
        }
        const artifacts = Object.values(bundle).map((chunk) => {
          const bytes = chunk.type === "chunk" ? chunk.code : chunk.source;
          if (chunk.type === "chunk") {
            for (const id of [
              ...chunk.imports,
              ...chunk.dynamicImports,
              ...Object.keys(chunk.modules)
            ]) {
              if (isBuiltin(id) || id.includes("__vite-browser-external"))
                throw new TypeError(
                  `${chunk.fileName}: Node dependency ${id} leaked into the player`
                );
            }
            for (const id of Object.keys(chunk.modules)) {
              if (/\/packages\/(?:shader-compiler|naga|vfx-compiler|devkit)\/|@forgeax\/engine-(?:shader-compiler|naga|vfx-compiler|devkit)/.test(
                id
              )) {
                throw new TypeError(
                  `${chunk.fileName}: build-only dependency ${id} leaked into the player`
                );
              }
            }
          }
          return {
            path: chunk.fileName,
            digest: `sha256:${createHash("sha256").update(bytes).digest("hex")}`
          };
        });
        const inputs = await Promise.all(
          [
            ...new Set(
              [...this.getModuleIds()].filter((id) => id.startsWith("/")).map((id) => id.split("?")[0] ?? id)
            )
          ].sort().map(async (id) => {
            const bytes = await readFile(id);
            return {
              path: relative(options.projectRoot, id).replaceAll("\\", "/"),
              digest: `sha256:${createHash("sha256").update(bytes).digest("hex")}`
            };
          })
        );
        for (const path of ["package.json", "pnpm-lock.yaml", "bun.lock", "package-lock.json"]) {
          try {
            inputs.push({
              path,
              digest: `sha256:${createHash("sha256").update(await readFile(`${options.projectRoot}/${path}`)).digest("hex")}`
            });
          } catch (cause) {
            if (cause.code !== "ENOENT") throw cause;
          }
        }
        this.emitFile({
          type: "asset",
          fileName: options.namespace ? `plugin-program-inventory/${options.namespace}.json` : "plugin-program-inventory.json",
          source: JSON.stringify({
            schemaVersion: 1,
            targets: Object.fromEntries(projections),
            inputs,
            artifacts
          })
        });
      }
    }
  };
}

export { discoverPluginAssets, executionWorkerEntries, pluginProgramsBuild, pluginRuntimeProjection, preparePackProgramSource, prepareRuntimePackProgram, publishedPluginInventory };
//# sourceMappingURL=plugin-build.mjs.map
//# sourceMappingURL=plugin-build.mjs.map