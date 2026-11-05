#!/usr/bin/env node
import { discoverProjectTools } from './chunk-A2W6KPHB.mjs';
import { hasPluginSourceInput, assertPluginSourceRevision, assertPluginSourceInputs, pluginAssetClosure, capturePluginProgramInputs } from './chunk-5KRT3YGN.mjs';
import { isFilesystemPathWithin, filesystemPathSegments, filesystemPathKey, filesystemPathRelative } from './chunk-X5IGMUF7.mjs';
import { realpath, readFile, readdir } from 'fs/promises';
import { createRequire, isBuiltin } from 'module';
import { relative, isAbsolute, dirname, join, resolve, posix, basename } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { PACK_PROGRAM_WORKER_SOURCE } from '@forgeax/engine-pack/runtime-browser';
import MagicString from 'magic-string';
import ts3 from 'typescript';
import { searchForWorkspaceRoot, normalizePath } from 'vite';
import { initSync, parse } from 'es-module-lexer';
import { createHash, randomUUID } from 'crypto';
import { resolve as resolve$1 } from 'import-meta-resolve';
import { existsSync, readFileSync, realpathSync, readdirSync } from 'fs';
import { resolvePluginProgram } from '@forgeax/engine-import';
import { lowerPluginToolContract } from '@forgeax/engine-pack/source';
import { defineToolCommandContract } from '@forgeax/engine-tool-runtime';
import { preparePackProgram } from '@forgeax/engine-pack/runtime';

initSync();
function moduleSpecifierEdits(source, filename, resolve5) {
  const edits = [];
  for (const edge of parse(source, filename)[0]) {
    if (edge.d === -2) continue;
    let specifier = edge.n;
    if (specifier === void 0 && source[edge.s] === "`") {
      const literal = ts3.createSourceFile(
        filename,
        source.slice(edge.s, edge.e),
        ts3.ScriptTarget.Latest,
        false,
        ts3.ScriptKind.JS
      ).statements[0];
      if (literal && ts3.isExpressionStatement(literal) && ts3.isNoSubstitutionTemplateLiteral(literal.expression))
        specifier = literal.expression.text;
    }
    if (specifier === void 0) continue;
    const next = resolve5(specifier, edge.d === -1 ? "static" : "dynamic");
    if (next !== void 0 && next !== specifier)
      edits.push({
        start: edge.d === -1 ? edge.s - 1 : edge.s,
        end: edge.d === -1 ? edge.e + 1 : edge.e,
        text: JSON.stringify(next)
      });
  }
  return edits;
}
function rewriteModuleSpecifiers(source, filename, resolve5) {
  for (const edit of moduleSpecifierEdits(source, filename, resolve5).sort(
    (a, b) => b.start - a.start
  ))
    source = source.slice(0, edit.start) + edit.text + source.slice(edit.end);
  return source;
}
var manifestAt = async (root) => JSON.parse(await readFile(join(root, "package.json"), "utf8"));
var names = (manifest, development = false) => Object.keys({
  ...manifest.dependencies,
  ...manifest.optionalDependencies,
  ...manifest.peerDependencies,
  ...development ? manifest.devDependencies : {}
}).sort();
var optional = (manifest, name) => manifest.optionalDependencies?.[name] !== void 0 || manifest.peerDependenciesMeta?.[name]?.optional === true;
async function dependencyRoot(root, name) {
  const require3 = createRequire(join(root, "package.json"));
  const installed = (require3.resolve.paths(`${name}/package.json`) ?? []).map((directory) => join(directory, name, "package.json")).find(existsSync);
  return installed ? realpath(dirname(installed)) : void 0;
}
async function installedRoot(entry) {
  for (let root = dirname(entry); ; root = dirname(root)) {
    if (existsSync(join(root, "package.json"))) {
      const manifest = await manifestAt(root);
      if (manifest.name && manifest.version) return realpath(root);
    }
    if (dirname(root) === root)
      throw new TypeError(`external module has no package authority: ${entry}`);
  }
}
async function nativeModuleIdentity(url) {
  if (url.startsWith("node:")) return `node:${process.versions.node}`;
  const entry = await realpath(fileURLToPath(url));
  const root = await installedRoot(entry);
  const paths = [root];
  const indices = /* @__PURE__ */ new Map([[root, 0]]);
  const graph = [];
  for (let index = 0; index < paths.length; index++) {
    const path = paths[index];
    if (!path) throw new TypeError("missing package instance");
    const manifest = await manifestAt(path);
    const hash = createHash("sha256");
    const visit = (directory) => {
      const files = readdirSync(directory, { withFileTypes: true }).sort(
        (a, b) => a.name.localeCompare(b.name)
      );
      for (const file of files) {
        if (file.name === "node_modules" || file.name === ".git") continue;
        const filename = join(directory, file.name);
        if (file.isDirectory()) visit(filename);
        else if (file.isFile()) {
          const bytes = readFileSync(filename);
          hash.update(JSON.stringify([relative(path, filename), bytes.byteLength]));
          hash.update(bytes);
        } else throw new TypeError(`external package contains an unsupported file: ${filename}`);
      }
    };
    visit(path);
    const dependencies = [];
    for (const name of names(manifest)) {
      const dependency = await dependencyRoot(path, name);
      if (!dependency) {
        if (optional(manifest, name)) {
          dependencies.push([name, null]);
          continue;
        }
        throw new TypeError(`external dependency unavailable: ${manifest.name} -> ${name}`);
      }
      let selected = indices.get(dependency);
      if (selected === void 0) {
        selected = paths.length;
        indices.set(dependency, selected);
        paths.push(dependency);
      }
      dependencies.push([name, selected]);
    }
    graph.push([manifest.name, manifest.version, hash.digest("hex"), dependencies]);
  }
  return `sha256:${createHash("sha256").update(JSON.stringify([process.versions.node, relative(root, entry), graph])).digest("hex")}`;
}
async function nativeModuleKey(projectRoot, url, importer) {
  const project = await realpath(projectRoot);
  let anchor = project;
  if (importer && isAbsolute(importer)) {
    for (let path = dirname(importer.split("?")[0] ?? importer); isFilesystemPathWithin(project, path); path = dirname(path)) {
      if (path === project) break;
      if (!filesystemPathSegments(relative(project, path)).includes("node_modules") && existsSync(join(path, "package.json"))) {
        const manifest = await manifestAt(path);
        if (names(manifest, true).length) {
          anchor = await realpath(path);
          break;
        }
      }
    }
  }
  const entry = await realpath(fileURLToPath(url));
  const target = await installedRoot(entry);
  const suffix = new URL(url);
  const selection = pathToFileURL(entry).href.slice(pathToFileURL(`${target}/`).href.length) + suffix.search + suffix.hash;
  const queue = [{ root: anchor, chain: [] }];
  const visited = /* @__PURE__ */ new Set([anchor]);
  for (const item of queue) {
    if (item.root === target) {
      return `npm:${encodeURIComponent(JSON.stringify([filesystemPathKey(relative(project, anchor)), item.chain, selection]))}`;
    }
    const manifest = await manifestAt(item.root);
    for (const name of names(manifest, item.root === anchor)) {
      const dependency = await dependencyRoot(item.root, name);
      if (!dependency || visited.has(dependency)) continue;
      visited.add(dependency);
      queue.push({ root: dependency, chain: [...item.chain, name] });
    }
  }
  throw new TypeError(
    `external instance is not reachable from declared package dependencies: ${url}`
  );
}
async function resolveNativeModuleKey(projectRoot, key) {
  const value = JSON.parse(decodeURIComponent(key.slice(4)));
  if (!key.startsWith("npm:") || !Array.isArray(value) || value.length !== 3)
    throw new TypeError("invalid native module locator");
  const [anchor, chain, entry] = value;
  const path = (value2, empty = false) => typeof value2 === "string" && (empty && value2 === "" || value2.length > 0 && !isAbsolute(value2) && !/^[a-zA-Z]:/.test(value2) && !value2.includes("\\") && value2.split("/").every(
    (part) => part !== ".." && part !== "." && part !== "" && part !== "node_modules"
  ));
  if (!path(anchor, true) || typeof entry !== "string" || !path(decodeURIComponent(entry.split(/[?#]/, 1)[0] ?? "")) || !Array.isArray(chain) || chain.some(
    (name) => typeof name !== "string" || !/^(?:@[a-z0-9._-]+\/)?[a-z0-9._-]+$/.test(name)
  ))
    throw new TypeError("invalid native module dependency route");
  const project = await realpath(projectRoot);
  let root = await realpath(resolve(project, anchor));
  if (!isFilesystemPathWithin(project, root))
    throw new TypeError("native module anchor escapes project");
  for (const [index, name] of chain.entries()) {
    if (!names(await manifestAt(root), index === 0).includes(name))
      throw new TypeError(`native dependency is no longer declared: ${name}`);
    const dependency = await dependencyRoot(root, name);
    if (!dependency) throw new TypeError(`native dependency unavailable: ${name}`);
    root = dependency;
  }
  const selectedUrl = new URL(entry, pathToFileURL(`${root}/`));
  const selected = await realpath(fileURLToPath(selectedUrl));
  if (!isFilesystemPathWithin(root, selected))
    throw new TypeError("native module entry escapes package");
  const restored = pathToFileURL(selected);
  restored.search = selectedUrl.search;
  restored.hash = selectedUrl.hash;
  return restored.href;
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
async function resolveNodePackProgramImport(root, specifier, engineIdentity) {
  const parent = pathToFileURL(resolve(root, "package.json")).href;
  if (isBuiltin(specifier)) {
    const url2 = specifier.startsWith("node:") ? specifier : `node:${specifier}`;
    return { url: url2, identity: await nativeModuleIdentity(url2) };
  }
  if (specifier.startsWith("npm:")) {
    const url2 = await resolveNativeModuleKey(root, specifier);
    return { url: url2, identity: await nativeModuleIdentity(url2) };
  }
  if (specifier === "@deepseek-ai/cordis") {
    const url2 = pathToFileURL(
      createRequire(import.meta.resolve("@forgeax/engine-plugin")).resolve(specifier)
    ).href;
    return { url: url2, identity: await nativeModuleIdentity(url2) };
  }
  let url;
  if (specifier === "@forgeax/engine/plugin" || specifier === "@forgeax/engine-plugin")
    url = import.meta.resolve("@forgeax/engine-plugin");
  else if (specifier === "@forgeax/engine/tool-runtime" || specifier === "@forgeax/engine-tool-runtime")
    url = import.meta.resolve("@forgeax/engine-tool-runtime");
  else if (specifier.startsWith("@forgeax/engine-host/")) url = import.meta.resolve(specifier);
  else if (specifier === "@forgeax/engine" || specifier.startsWith("@forgeax/engine/") || specifier.startsWith("@forgeax/engine-")) {
    url = resolve$1(
      specifier,
      specifier.startsWith("@forgeax/engine-") ? resolve$1("@forgeax/engine/package.json", parent) : parent
    );
  } else
    throw new TypeError(`native program import requires a recorded package locator: ${specifier}`);
  return {
    url,
    identity: engineIdentity ?? await runtimeProgramIdentity(
      createRequire(resolve(root, "package.json")).resolve("@forgeax/engine/package.json")
    )
  };
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
        const file = ts3.createSourceFile(
          chunk.fileName,
          code,
          ts3.ScriptTarget.Latest,
          true,
          ts3.ScriptKind.JS
        );
        const edits2 = [];
        const visit = (node) => {
          if (ts3.isStringLiteralLike(node) && node.text === importTableMarker)
            edits2.push({ start: node.getStart(file), end: node.end });
          ts3.forEachChild(node, visit);
        };
        visit(file);
        for (const edit of edits2) output.overwrite(edit.start, edit.end, `{ ${fields.join(",")} }`);
      }
      const edges = { imports: [], dynamicImports: [] };
      const edits = moduleSpecifierEdits(code, chunk.fileName, (specifier, kind) => {
        const reference = imports.get(specifier);
        if (!reference) return void 0;
        edges[kind === "static" ? "imports" : "dynamicImports"].push(specifier);
        const relative3 = posix.relative(posix.dirname(chunk.fileName), this.getFileName(reference));
        return relative3.startsWith("./") || relative3.startsWith("../") ? relative3 : `./${relative3}`;
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
        const source = ts3.createSourceFile(
          id,
          code,
          ts3.ScriptTarget.Latest,
          true,
          ts3.ScriptKind.JS
        );
        for (const statement of source.statements) {
          if (!ts3.isVariableStatement(statement)) continue;
          for (const declaration of statement.declarationList.declarations) {
            const fn = declaration.initializer;
            if (!ts3.isIdentifier(declaration.name) || declaration.name.text !== "__vitePreload" || !fn || !ts3.isFunctionExpression(fn) || !fn.parameters[0] || !ts3.isIdentifier(fn.parameters[0].name))
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
  const file = ts3.createSourceFile(
    filename,
    source,
    ts3.ScriptTarget.Latest,
    true,
    ts3.ScriptKind.TS
  );
  function visit(node) {
    if (ts3.isCallExpression(node) && node.expression.kind === ts3.SyntaxKind.ImportKeyword && (node.arguments.length !== 1 || node.arguments[0] === void 0 || !ts3.isStringLiteralLike(node.arguments[0]))) {
      throw new TypeError(`${filename}: plugin runtime imports must have literal specifiers`);
    }
    ts3.forEachChild(node, visit);
  }
  visit(file);
}
function projectPluginRuntimeSource(source, filename) {
  const file = ts3.createSourceFile(
    filename,
    source,
    ts3.ScriptTarget.Latest,
    true,
    ts3.ScriptKind.TS
  );
  const defineNames = /* @__PURE__ */ new Set();
  for (const node of file.statements) {
    if (!ts3.isImportDeclaration(node) || !ts3.isStringLiteral(node.moduleSpecifier) || !["@forgeax/engine/pack/source", "@forgeax/engine-pack/source"].includes(
      node.moduleSpecifier.text
    ))
      continue;
    const bindings = node.importClause?.namedBindings;
    if (bindings && ts3.isNamedImports(bindings))
      for (const binding of bindings.elements) {
        if ((binding.propertyName ?? binding.name).text === "definePack")
          defineNames.add(binding.name.text);
      }
  }
  const declaration = file.statements.find(
    (node) => ts3.isExportAssignment(node) && !node.isExportEquals && ts3.isCallExpression(node.expression) && ts3.isIdentifier(node.expression.expression) && defineNames.has(node.expression.expression.text)
  );
  if (!declaration)
    throw new TypeError(`${filename}: expected default definePack(...) for the runtime projection`);
  const edits = [{ start: declaration.getStart(file), end: declaration.end, text: "" }];
  for (const node of file.statements) {
    if (!ts3.isImportDeclaration(node) || !node.importClause?.namedBindings || !ts3.isNamedImports(node.importClause.namedBindings))
      continue;
    const bindings = node.importClause.namedBindings;
    const remaining = bindings.elements.filter((binding) => !defineNames.has(binding.name.text));
    if (remaining.length === bindings.elements.length) continue;
    const clause = ts3.factory.updateImportClause(
      node.importClause,
      node.importClause.isTypeOnly,
      node.importClause.name,
      remaining.length ? ts3.factory.updateNamedImports(bindings, remaining) : void 0
    );
    const replacement = remaining.length || clause.name ? ts3.createPrinter().printNode(
      ts3.EmitHint.Unspecified,
      ts3.factory.updateImportDeclaration(
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
  function captureSource(path, digest) {
    if (!canonicalSourceInputs) return;
    const canonical = canonicalPath(path);
    const previous = canonicalSourceInputs.get(canonical);
    canonicalSourceInputs.set(
      canonical,
      canonicalSourceInputs.has(canonical) && previous !== digest ? void 0 : digest
    );
  }
  for (const [path, digest] of sourceInputs ?? []) captureSource(path, digest);
  let observedSourceInputCount = sourceInputs?.size ?? 0;
  let sourceInputsFrozen = false;
  function refreshSourceInputAdditions() {
    if (!sourceInputs || !canonicalSourceInputs || sourceInputsFrozen || sourceInputs.size === observedSourceInputCount)
      return;
    for (const [path, digest] of sourceInputs) captureSource(path, digest);
    observedSourceInputCount = sourceInputs.size;
  }
  function assertSource(path, source) {
    if (!canonicalSourceInputs) return;
    refreshSourceInputAdditions();
    const digest = `sha256:${createHash("sha256").update(source).digest("hex")}`;
    const expected = canonicalSourceInputs.get(canonicalPath(path));
    sourceInputsFrozen = true;
    assertPluginSourceRevision(path, expected, digest);
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
        void new Promise((resolve5) => setTimeout(resolve5, 0)).then(async () => {
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
        const { generation, digest, outputSetDigest } = row.publication;
        return [
          guid,
          {
            kind: "publication",
            publication: {
              scopeId: options.binding.scopeId,
              generation,
              digest,
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
          const file = ts3.createSourceFile(
            chunk.fileName,
            code,
            ts3.ScriptTarget.Latest,
            true,
            ts3.ScriptKind.JS
          );
          const edits = [];
          const visit = (node) => {
            if (ts3.isStringLiteralLike(node) && node.text === nativeEntriesMarker)
              edits.push({ start: node.getStart(file), end: node.end });
            ts3.forEachChild(node, visit);
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

export { assertPluginProgramGraphInputs, executionWorkerEntries, exportModule, nativeModuleIdentity, nativeModuleKey, pluginProgramSource, pluginProgramsBuild, pluginRootDescriptor, pluginRuntimeProjection, projectPluginPrograms, resolveNodePackProgramImport, rewriteModuleSpecifiers, runtimeProgramIdentity };
//# sourceMappingURL=chunk-WBZD4GEB.mjs.map
//# sourceMappingURL=chunk-WBZD4GEB.mjs.map