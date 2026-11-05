#!/usr/bin/env node
import {gzipSync as _singleHtmlGzip} from "node:zlib";
import {createHash as _singleHtmlDigest} from "node:crypto";
import { inspectRunDependencyClosure } from './chunk-OMR3CVHO.mjs';
export { pluginCreateCommand, pluginInspectCommand, pluginRootCommand } from './chunk-4BG4YKZZ.mjs';
export { createCliRhiDebugOperationContext } from './chunk-IB3GZHDT.mjs';
import { runRhiDebugOperation } from './chunk-DVDZY2BO.mjs';
export { RHI_DEBUG_OPERATION_MANIFEST, createRhiDebugOperationContext, discoverRhiDebugOperations, recoverRhiDebugError, renderRhiDebugHelp, runRhiDebugOperation } from './chunk-DVDZY2BO.mjs';
export { sdkInstallCommand } from './chunk-T5LHI5SU.mjs';
import { execFileCommand } from './chunk-S3NGZOPR.mjs';
export { browserCaptureCommand } from './chunk-I7CPTDO2.mjs';
import { createViteConfig, buildProject, preparePlayerDist, startDevProjectWithHost, startPreviewProjectWithHost, createEngineWorkspaceResolverForProject } from './chunk-O7QEAHSA.mjs';
import { readEngineBinding, engineDoctorCommand } from './chunk-UTXAIODQ.mjs';
export { engineDoctorCommand, engineStatusCommand, engineUnlinkCommand, engineUseLocalCommand } from './chunk-UTXAIODQ.mjs';
import './chunk-6AKTNSSW.mjs';
import './chunk-ZDSMIZQ7.mjs';
import './chunk-WBZD4GEB.mjs';
import './chunk-A2W6KPHB.mjs';
import { discoverPluginAssets, pluginAssetClosure } from './chunk-5KRT3YGN.mjs';
export { assetAddCommand, assetInspectCommand, assetListCommand, assetResolveCommand, assetVerifyCommand } from './chunk-62ITDDCW.mjs';
import { verifyDist, mediaType } from './chunk-SFUAONG6.mjs';
import { isFilesystemPathWithin } from './chunk-X5IGMUF7.mjs';
import { readProjectFacts, commandError } from './chunk-VNP4GISC.mjs';
import { createHash } from 'crypto';
import { copyFile, readFile, readdir, mkdir, mkdtemp, cp, rename, rm, writeFile, symlink, realpath, access, stat, lstat, readlink, rmdir } from 'fs/promises';
import { resolve, basename, dirname, relative, isAbsolute, sep } from 'path';
import { startVitest } from 'vitest/node';
import { deflateRawSync } from 'zlib';
import { tmpdir } from 'os';
import { fileURLToPath, pathToFileURL } from 'url';
import { parse } from 'parse5';
import ts from 'typescript';
import { build, parseAst, Visitor } from 'vite';
import { UI_AUTHORING_PROFILE } from '@forgeax/engine-ui/authoring';
import { parseDocument } from 'yaml';
import { createRequire } from 'module';
import { err, ok } from '@forgeax/engine-types';

var ZIP32_LIMIT = 4294967295;
var ZIP_ENTRY_LIMIT = 65535;
var UTF8_FLAG = 2048;
var DEFLATE_METHOD = 8;
var DOS_EPOCH_DATE = 33;
var CRC_TABLE = new Uint32Array(256);
for (let index = 0; index < CRC_TABLE.length; index += 1) {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) value = value >>> 1 ^ 3988292384 & -(value & 1);
  CRC_TABLE[index] = value >>> 0;
}
function crc32(bytes) {
  let value = 4294967295;
  for (const byte of bytes) value = value >>> 8 ^ (CRC_TABLE[(value ^ byte) & 255] ?? 0);
  return (value ^ 4294967295) >>> 0;
}
function assertArchivePath(path) {
  if (path.length === 0 || path.startsWith("/") || path.includes("\\") || path.split("/").some((segment) => segment.length === 0 || segment === "." || segment === "..")) {
    throw new TypeError(`invalid ZIP entry path: ${path}`);
  }
}
function createZip(entriesInput) {
  if (entriesInput.length > ZIP_ENTRY_LIMIT) throw new RangeError("ZIP32 entry limit exceeded");
  const entries = [...entriesInput].sort((left, right) => left.path.localeCompare(right.path));
  const seen = /* @__PURE__ */ new Set();
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  for (const entry of entries) {
    assertArchivePath(entry.path);
    if (seen.has(entry.path)) throw new TypeError(`duplicate ZIP entry path: ${entry.path}`);
    seen.add(entry.path);
    const name = Buffer.from(entry.path, "utf8");
    const source = Buffer.from(entry.bytes);
    const compressed = deflateRawSync(source, { level: 9 });
    if (source.byteLength > ZIP32_LIMIT || compressed.byteLength > ZIP32_LIMIT) {
      throw new RangeError(`ZIP32 file limit exceeded: ${entry.path}`);
    }
    const checksum = crc32(source);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(67324752, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(UTF8_FLAG, 6);
    local.writeUInt16LE(DEFLATE_METHOD, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(DOS_EPOCH_DATE, 12);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(compressed.byteLength, 18);
    local.writeUInt32LE(source.byteLength, 22);
    local.writeUInt16LE(name.byteLength, 26);
    local.writeUInt16LE(0, 28);
    localParts.push(local, name, compressed);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(33639248, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(UTF8_FLAG, 8);
    central.writeUInt16LE(DEFLATE_METHOD, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(DOS_EPOCH_DATE, 14);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(compressed.byteLength, 20);
    central.writeUInt32LE(source.byteLength, 24);
    central.writeUInt16LE(name.byteLength, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, name);
    offset += local.byteLength + name.byteLength + compressed.byteLength;
    if (offset > ZIP32_LIMIT) throw new RangeError("ZIP32 archive limit exceeded");
  }
  const centralDirectory = Buffer.concat(centralParts);
  if (centralDirectory.byteLength > ZIP32_LIMIT)
    throw new RangeError("ZIP32 directory limit exceeded");
  const end = Buffer.alloc(22);
  end.writeUInt32LE(101010256, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.byteLength, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...localParts, centralDirectory, end]);
}
var GAME_PACKAGE_DOCUMENT_PATHS = Object.freeze([
  "README.md",
  "docs/feedback.md"
]);
async function readGamePackageDocuments(root) {
  const entries = [];
  for (const path of GAME_PACKAGE_DOCUMENT_PATHS) {
    try {
      entries.push({ path, bytes: await readFile(resolve(root, path)) });
    } catch (cause) {
      return {
        ok: false,
        error: {
          code: "game-package-document-missing",
          expected: "the game to contain README.md and docs/feedback.md",
          hint: "Restore README.md and docs/feedback.md before creating a Web ZIP.",
          detail: {
            root,
            path,
            reason: cause instanceof Error ? cause.message : String(cause)
          }
        }
      };
    }
  }
  return { ok: true, value: entries };
}
var SINGLE_HTML_FORMAT = "forgeax-single-html-game";
var GENERATED_PREFIX = "__forgeax-bundle/";
var SingleHtmlError = class extends Error {
  constructor(code, expected, hint, detail) {
    super(`${code}: ${hint}`);
    this.code = code;
    this.expected = expected;
    this.hint = hint;
    this.detail = detail;
    this.name = "SingleHtmlError";
  }
  code;
  expected;
  hint;
  detail;
};
function errorResult(code, expected, hint, detail = {}) {
  return { ok: false, error: new SingleHtmlError(code, expected, hint, detail) };
}
function toErrorResult(cause, code, expected, hint) {
  if (cause instanceof SingleHtmlError) return { ok: false, error: cause };
  return errorResult(code, expected, hint, {
    reason: cause instanceof Error ? cause.message : String(cause)
  });
}
function normalizePath(value) {
  let decoded;
  try {
    decoded = decodeURIComponent(value.split(/[?#]/, 1)[0] ?? value);
  } catch {
    return void 0;
  }
  const normalized = decoded.replace(/\\/g, "/").replace(/^\.\//, "").replace(/^\/+/, "");
  const segments = normalized.split("/");
  if (normalized.length === 0 || segments.some((segment) => segment.length === 0 || segment === "." || segment === "..")) {
    return void 0;
  }
  return normalized;
}
function safeScriptText(value) {
  return value.replace(/<\/script/gi, "<\\/script");
}
function hashBytes(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}
function contentTypeForDataUri(value) {
  const semicolon = value.indexOf(";");
  return semicolon < 0 ? value : value.slice(0, semicolon);
}
function dataUri(bytes, type) {
  return `data:${contentTypeForDataUri(type)};base64,${Buffer.from(bytes).toString("base64")}`;
}
function attributeValueRange(source, location) {
  const raw = source.slice(location.startOffset, location.endOffset);
  const equals = raw.indexOf("=");
  if (equals < 0) return void 0;
  let cursor = equals + 1;
  while (/\s/.test(raw[cursor] ?? "")) cursor += 1;
  const quote = raw[cursor] === '"' || raw[cursor] === "'" ? raw[cursor] : void 0;
  if (quote !== void 0) {
    const start = cursor + 1;
    const end = raw.lastIndexOf(quote);
    return end <= start ? void 0 : { startOffset: location.startOffset + start, endOffset: location.startOffset + end };
  }
  return {
    startOffset: location.startOffset + cursor,
    endOffset: location.endOffset
  };
}
function scanHtmlElements(source) {
  const document = parse(source, { sourceCodeLocationInfo: true });
  const elements = [];
  const visit = (node) => {
    if (node.nodeName === "#document" || node.nodeName === "#document-fragment") {
      for (const child of node.childNodes) visit(child);
      return;
    }
    if (node.nodeName === "#text" || node.nodeName === "#comment" || node.nodeName === "#documentType") {
      return;
    }
    const element = node;
    const location = element.sourceCodeLocation;
    if (location?.startTag === void 0) {
      for (const child of element.childNodes) visit(child);
      return;
    }
    const name = element.tagName.toLowerCase();
    const attributes = element.attrs.map(({ name: attributeName, value }) => ({
      name: attributeName.toLowerCase(),
      value
    }));
    const attributeLocations = {};
    for (const attribute2 of attributes) {
      const attributeLocation = location.attrs?.[attribute2.name];
      if (attributeLocation !== void 0) attributeLocations[attribute2.name] = attributeLocation;
    }
    elements.push({
      name,
      start: location.startTag.startOffset,
      openEnd: location.startTag.endOffset,
      end: location.endTag?.endOffset ?? location.startTag.endOffset,
      ...name === "script" || name === "style" ? {
        contentStart: location.startTag.endOffset,
        contentEnd: location.endTag?.startOffset ?? location.startTag.endOffset
      } : {},
      attributes,
      attributeLocations
    });
    for (const child of element.childNodes) visit(child);
  };
  visit(document);
  return elements;
}
function attribute(element, name) {
  return element.attributes.find((candidate) => candidate.name === name);
}
function attributeValue(element, name) {
  return attribute(element, name)?.value;
}
function isModuleScript(element) {
  return element.name === "script" && attributeValue(element, "type")?.toLowerCase() === "module";
}
function isStylesheet(element) {
  return element.name === "link" && attributeValue(element, "rel")?.toLowerCase().split(/\s+/).includes("stylesheet") === true;
}
function isModulePreload(element) {
  return element.name === "link" && attributeValue(element, "rel")?.toLowerCase().split(/\s+/).includes("modulepreload") === true;
}
function resourceForPath(path, resources) {
  const normalized = normalizePath(path);
  if (normalized === void 0) return void 0;
  const direct = resources.get(normalized);
  if (direct !== void 0) return direct;
  const suffix = [...resources.entries()].filter(
    ([candidate]) => candidate.endsWith(`/${normalized}`)
  );
  return suffix.length === 1 ? suffix[0]?.[1] : void 0;
}
function resourcePath(reference, basePath) {
  try {
    return normalizePath(new URL(reference, `https://forgeax.invalid/${basePath}`).pathname);
  } catch {
    return void 0;
  }
}
function applyReplacements(source, replacements) {
  const unique = /* @__PURE__ */ new Map();
  for (const replacement of replacements) {
    unique.set(`${replacement.start}:${replacement.end}`, replacement);
  }
  const ordered = [...unique.values()].sort((left, right) => left.start - right.start);
  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1];
    const current = ordered[index];
    if (previous !== void 0 && current !== void 0 && previous.end > current.start) {
      throw new Error(
        `single-html AST replacements overlap (${previous.start}:${previous.end} and ${current.start}:${current.end})`
      );
    }
  }
  return ordered.reverse().reduce(
    (value, replacement) => value.slice(0, replacement.start) + replacement.value + value.slice(replacement.end),
    source
  );
}
function inlineCss(css, cssPath, resources) {
  const replacements = [];
  const pattern = /url\(\s*(["']?)(.*?)\1\s*\)/gi;
  for (; ; ) {
    const match = pattern.exec(css);
    if (match === null) break;
    const reference = match[2]?.trim();
    if (reference === void 0 || reference.length === 0 || reference.startsWith("data:") || reference.startsWith("#")) {
      continue;
    }
    if (/^(?:https?:|blob:)/i.test(reference)) {
      return errorResult(
        "single-html-css-external-resource",
        "CSS URL references to be embedded or data/blob URLs",
        "Move the CSS resource into the verified dist closure before packaging.",
        { cssPath, reference }
      );
    }
    const path = resourcePath(reference, cssPath);
    const resource = path === void 0 ? void 0 : resourceForPath(path, resources);
    if (resource === void 0) {
      return errorResult(
        "single-html-css-asset-missing",
        "every local CSS URL to resolve to an embedded dist artifact",
        "Add the referenced asset to the project asset closure and rebuild.",
        { cssPath, reference, path: path ?? null }
      );
    }
    replacements.push({
      start: match.index,
      end: match.index + match[0].length,
      value: `url(${dataUri(resource.bytes, resource.mediaType)})`
    });
  }
  return { ok: true, value: applyReplacements(css, replacements) };
}
function collectEntrySource(html) {
  const entries = scanHtmlElements(html).filter((element2) => isModuleScript(element2));
  const external = entries.filter((element2) => attributeValue(element2, "src") !== void 0);
  const inline = entries.filter((element2) => attributeValue(element2, "src") === void 0);
  if (external.length === 0 && inline.length === 0) {
    return errorResult(
      "single-html-entry-missing",
      "production index.html to contain one module entry",
      "Rebuild the game with a module entry in its generated host."
    );
  }
  if (external.length > 1 || inline.length > 1) {
    return errorResult(
      "single-html-entry-ambiguous",
      "production index.html to contain exactly one module entry",
      "Converge the generated host to one ForgeaX module entry before packaging.",
      { external: external.length, inline: inline.length }
    );
  }
  const element = external[0] ?? inline[0];
  if (element === void 0) throw new Error("single-html entry selection was unexpectedly empty");
  const src = attributeValue(element, "src");
  if (src === void 0 && element.contentStart !== void 0 && element.contentEnd !== void 0) {
    return { ok: true, value: html.slice(element.contentStart, element.contentEnd) };
  }
  if (src === void 0) {
    return errorResult(
      "single-html-entry-missing",
      "a module entry source",
      "Add a module entry to index.html."
    );
  }
  if (/^(?:https?:|file:|data:|blob:)/i.test(src)) {
    return errorResult(
      "single-html-entry-external",
      "the module entry to be a project-local dist artifact",
      "Rebuild the game so the generated host points at a local production module.",
      { src }
    );
  }
  return { ok: true, value: src };
}
async function filesUnder(root, directory = root) {
  const result = [];
  for (const name of (await readdir(directory)).sort()) {
    const path = resolve(directory, name);
    const info = await stat(path);
    if (info.isDirectory()) result.push(...await filesUnder(root, path));
    else if (info.isFile()) result.push(path);
  }
  return result;
}
function isPreloadHelperSource(value) {
  if (typeof value !== "string") return false;
  const path = value.split(/[?#]/, 1)[0] ?? value;
  const name = path.slice(path.lastIndexOf("/") + 1);
  return name.startsWith("preload-helper-") && name.endsWith(".js");
}
function isLocalChunkImport(source) {
  const value = source.type === "TemplateLiteral" && source.expressions?.length === 0 ? source.quasis?.[0]?.value.cooked ?? source.quasis?.[0]?.value.raw : source.value;
  return typeof value === "string" && /^(?:\.{1,2}\/|\/)/.test(value);
}
function isStaticImportSource(source) {
  if (typeof source !== "object" || source === null) return false;
  const candidate = source;
  return candidate.type === "Literal" || candidate.type === "StringLiteral" || candidate.type === "TemplateLiteral" && candidate.expressions?.length === 0;
}
function preloadDependencyReplacements(code) {
  const fileName = resolve("forgeax-single-html-input.js");
  const source = ts.createSourceFile(
    fileName,
    code,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS
  );
  const options = { allowJs: true, noLib: true, noResolve: true, types: [] };
  const host = ts.createCompilerHost(options);
  host.getSourceFile = (path) => resolve(path) === fileName ? source : void 0;
  const checker = ts.createProgram([fileName], options, host).getTypeChecker();
  const bindings = /* @__PURE__ */ new Set();
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier) || !isPreloadHelperSource(statement.moduleSpecifier.text))
      continue;
    const imports = statement.importClause?.namedBindings;
    if (imports === void 0 || !ts.isNamedImports(imports)) continue;
    for (const specifier of imports.elements) {
      const symbol = checker.getSymbolAtLocation(specifier.name);
      if (symbol !== void 0) bindings.add(symbol);
    }
  }
  const replacements = [];
  function visit(node) {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      const symbol = checker.getSymbolAtLocation(node.expression);
      const dependencies = node.arguments[1];
      if (symbol !== void 0 && bindings.has(symbol) && dependencies !== void 0) {
        replacements.push({
          start: dependencies.getStart(source),
          end: dependencies.end,
          value: "void 0"
        });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return replacements;
}
function programReplacements(program, code) {
  const hasPreloadImport = program.body.some(
    (node) => node.type === "ImportDeclaration" && isPreloadHelperSource(node.source.value)
  );
  const replacements = hasPreloadImport ? preloadDependencyReplacements(code) : [];
  new Visitor({
    ImportExpression(node) {
      if (isLocalChunkImport(node.source)) return;
      replacements.push({
        start: node.start,
        end: node.start + "import".length,
        value: "globalThis.__forgeaxImport"
      });
    }
  }).visit(program);
  return replacements;
}
function outputReplacements(program) {
  const replacements = [];
  new Visitor({
    ImportExpression(node) {
      replacements.push({
        start: node.start,
        end: node.start + "import".length,
        value: "globalThis.__forgeaxImport"
      });
    }
  }).visit(program);
  return replacements;
}
function rewriteOutputJavaScript(code) {
  const program = parseAst(code);
  return applyReplacements(code, outputReplacements(program));
}
function residualImportStart(code) {
  let residualStart;
  new Visitor({
    ImportExpression(node) {
      residualStart ??= node.start;
    }
  }).visit(parseAst(code));
  return residualStart;
}
function isJavaScriptOutputAsset(fileName) {
  return /\.(?:c?js|mjs)$/i.test(fileName);
}
function isRelativeStaticModuleSource(source) {
  if (!isStaticImportSource(source)) return false;
  return typeof source.value === "string" && /^(?:\.\/|\.\.\/)/.test(source.value);
}
function hasStaticJavaScriptImports(code) {
  let found = false;
  try {
    new Visitor({
      ImportDeclaration(node) {
        if (isRelativeStaticModuleSource(node.source)) found = true;
      },
      ExportNamedDeclaration(node) {
        if (isRelativeStaticModuleSource(node.source)) found = true;
      },
      ExportAllDeclaration(node) {
        if (isRelativeStaticModuleSource(node.source)) found = true;
      }
    }).visit(parseAst(code));
  } catch {
    return false;
  }
  return found;
}
function staticGraphNamespace(path) {
  return path.startsWith(GENERATED_PREFIX) ? "generated" : "raw";
}
function staticGraphCanonicalPath(path) {
  return path.startsWith(GENERATED_PREFIX) ? path.slice(GENERATED_PREFIX.length) : path;
}
function staticGraphNamespaceForId(graphRoot, id) {
  const path = relative(graphRoot, id).split(sep).join("/");
  if (path.startsWith("raw/")) return "raw";
  if (path.startsWith("generated/")) return "generated";
  return void 0;
}
function staticGraphCanonicalPathForId(graphRoot, id) {
  const path = relative(graphRoot, id).split(sep).join("/");
  if (path.startsWith("raw/")) return path.slice("raw/".length);
  if (path.startsWith("generated/")) return path.slice("generated/".length);
  return void 0;
}
function resolveStaticGraphImport(source, importerNamespace, importerPath, index) {
  if (!/^(?:\.\/|\.\.\/)/.test(source)) return void 0;
  const path = resourcePath(source, importerPath);
  if (path === void 0) return void 0;
  const sameNamespace = index[importerNamespace].has(path) === true ? { namespace: importerNamespace, path } : void 0;
  if (sameNamespace !== void 0) return sameNamespace;
  if (importerNamespace === "generated" && index.raw.has(path)) {
    return { namespace: "raw", path };
  }
  return void 0;
}
function embeddedStaticGraphPath(target) {
  return target.namespace === "generated" ? `${GENERATED_PREFIX}${target.path}` : target.path;
}
function staticGraphResolverPlugin(graphRoot, index) {
  return {
    name: "forgeax-single-html-static-graph-resolver",
    enforce: "pre",
    resolveId(source, importer) {
      if (importer === void 0) return null;
      const namespace = staticGraphNamespaceForId(graphRoot, importer);
      const importerPath = staticGraphCanonicalPathForId(graphRoot, importer);
      if (namespace === void 0 || importerPath === void 0) return null;
      const target = resolveStaticGraphImport(source, namespace, importerPath, index);
      if (target === void 0) return null;
      return resolve(graphRoot, target.namespace, target.path);
    }
  };
}
function staticGraphImporterPlugin(graphRoot, index) {
  return {
    name: "forgeax-single-html-static-graph-importer",
    enforce: "pre",
    transform(code, id) {
      const sourcePath = id.split(/[?#]/, 1)[0] ?? id;
      const importerNamespace = staticGraphNamespaceForId(graphRoot, sourcePath);
      const importer = staticGraphCanonicalPathForId(graphRoot, sourcePath);
      if (importerNamespace === void 0 || importer === void 0) return null;
      let program;
      try {
        program = parseAst(code);
      } catch {
        return null;
      }
      const replacements = [];
      new Visitor({
        ImportExpression(node) {
          const source = node.source;
          if (!isStaticImportSource(source)) return;
          const staticSource = source;
          const specifier = staticSource.value;
          if (typeof specifier !== "string") return;
          const target = resolveStaticGraphImport(specifier, importerNamespace, importer, index);
          if (target === void 0) return;
          replacements.push(
            {
              start: node.start,
              end: node.start + "import".length,
              value: "globalThis.__forgeaxImport"
            },
            {
              start: staticSource.start,
              end: staticSource.end,
              value: JSON.stringify(embeddedStaticGraphPath(target))
            }
          );
        },
        CallExpression(node) {
          const callee = node.callee;
          if (callee.type !== "MemberExpression" || callee.computed || callee.object.type !== "Identifier" || callee.object.name !== "globalThis" || callee.property.type !== "Identifier" || callee.property.name !== "__forgeaxImport") {
            return;
          }
          const source = node.arguments[0];
          if (!isStaticImportSource(source)) return;
          const specifier = source.value;
          if (typeof specifier !== "string" || !/^(?:\.\/|\.\.\/)/.test(specifier)) return;
          const target = resolveStaticGraphImport(specifier, importerNamespace, importer, index);
          if (target === void 0) return;
          replacements.push({
            start: source.start,
            end: source.end,
            value: JSON.stringify(embeddedStaticGraphPath(target))
          });
        }
      }).visit(program);
      return replacements.length === 0 ? null : applyReplacements(code, replacements);
    }
  };
}
async function closeStaticJavaScriptGraphs(temporaryRoot, initial) {
  const artifacts = /* @__PURE__ */ new Map();
  for (const artifact of initial) {
    if (artifacts.has(artifact.path)) {
      return errorResult(
        "single-html-asset-duplicate",
        "embedded resource paths to be unique",
        "Repair the generated bundle path collision before packaging.",
        { path: artifact.path }
      );
    }
    artifacts.set(artifact.path, artifact);
  }
  const artifactIndex = {
    raw: new Set(
      [...artifacts.keys()].filter((path) => staticGraphNamespace(path) === "raw").map(staticGraphCanonicalPath)
    ),
    generated: new Set(
      [...artifacts.keys()].filter((path) => staticGraphNamespace(path) === "generated").map(staticGraphCanonicalPath)
    )
  };
  let pass = 0;
  for (; ; ) {
    const candidate = [...artifacts.values()].find((artifact) => {
      if (!isJavaScriptOutputAsset(artifact.path) || staticGraphNamespace(artifact.path) !== "generated") {
        return false;
      }
      return hasStaticJavaScriptImports(Buffer.from(artifact.bytes).toString("utf8"));
    });
    if (candidate === void 0) return { ok: true, value: [...artifacts.values()] };
    pass += 1;
    if (pass > artifacts.size + 1) {
      return errorResult(
        "single-html-static-graph-open",
        "every embedded JavaScript artifact to have its static module graph closed",
        "Inspect the emitted module graph for an unresolved static import.",
        { path: candidate.path }
      );
    }
    const graphRoot = resolve(temporaryRoot, `static-graph-${pass}`);
    const outputRoot = resolve(graphRoot, "out");
    await mkdir(graphRoot, { recursive: true });
    for (const artifact of artifacts.values()) {
      const namespace = staticGraphNamespace(artifact.path);
      const relativePath = staticGraphCanonicalPath(artifact.path);
      const destination = resolve(graphRoot, namespace, relativePath);
      await mkdir(dirname(destination), { recursive: true });
      await writeFile(destination, artifact.bytes);
      // Worker/URL assets are resolved directly by Vite, before import hooks.
      // Mirror raw files as staging-only aliases, without publishing a second graph.
      if (namespace === "raw" && !artifactIndex.generated.has(relativePath)) {
        const alias = resolve(graphRoot, "generated", relativePath);
        await mkdir(dirname(alias), {recursive:true});
        await (await import("node:fs/promises")).link(destination, alias);
      }
    }
    const candidateNamespace = staticGraphNamespace(candidate.path);
    const candidatePath = staticGraphCanonicalPath(candidate.path);
    const inputPath = resolve(graphRoot, candidateNamespace, candidatePath);
    try {
      await build({
        configFile: false,
        root: graphRoot,
        worker: {format: "es", rolldownOptions: {output: {codeSplitting: false, entryFileNames: `${candidateNamespace}/assets/[name]-[hash].mjs`, chunkFileNames: `${candidateNamespace}/assets/[name]-[hash].mjs`, assetFileNames: `${candidateNamespace}/assets/[name]-[hash][extname]`}}},
        base: "./",
        logLevel: "error",
        plugins: [
          staticGraphResolverPlugin(graphRoot, artifactIndex),
          staticGraphImporterPlugin(graphRoot, artifactIndex),
          singleHtmlBundlePlugin(candidateNamespace)
        ],
        build: {
          outDir: outputRoot,
          emptyOutDir: true,
          target: "esnext",
          minify: false,
          assetsInlineLimit: 0,
          rolldownOptions: {
            input: inputPath,
            preserveEntrySignatures: "strict",
            output: {
              codeSplitting: false,
              entryFileNames: `${candidateNamespace}/${candidatePath}`,
              chunkFileNames: `${candidateNamespace}/assets/[name]-[hash].mjs`,
              assetFileNames: `${candidateNamespace}/assets/[name]-[hash][extname]`
            },
            experimental: { nativeMagicString: true }
          }
        }
      });
    } catch (cause) {
      return toErrorResult(
        cause,
        "single-html-static-graph-failed",
        "the emitted JavaScript artifact static graph to bundle as one Blob-safe module",
        "Repair the generated JavaScript graph or inspect the bundler diagnostic before packaging."
      );
    }
    const outputPaths = await filesUnder(outputRoot);
    const outputRelativePaths = outputPaths.map(
      (path) => relative(outputRoot, path).split(sep).join("/")
    );
    const outputEntry = outputRelativePaths.find(
      (path) => path === `${candidateNamespace}/${candidatePath}`
    );
    if (outputEntry === void 0) {
      return errorResult(
        "single-html-static-graph-entry-missing",
        "the static graph bundler to emit the original artifact path",
        "Inspect the generated static graph output and preserve its artifact entry.",
        { path: candidate.path, outputPaths: outputRelativePaths }
      );
    }
    for (const outputPath of outputRelativePaths) {
      if (!outputPath.startsWith(`${candidateNamespace}/`)) {
        return errorResult(
          "single-html-static-graph-namespace-missing",
          "static graph output paths to retain their source namespace",
          "Inspect the static graph bundler output and preserve its raw/generated namespace.",
          { path: candidate.path, outputPath }
        );
      }
      const namespace = candidateNamespace;
      const canonicalOutputPath = outputPath.slice(`${namespace}/`.length);
      const embeddedPath = namespace === "generated" ? `${GENERATED_PREFIX}${canonicalOutputPath}` : canonicalOutputPath;
      const bytes = await readFile(resolve(outputRoot, outputPath));
      const previous = artifacts.get(embeddedPath);
      artifacts.set(embeddedPath, {
        path: embeddedPath,
        bytes,
        mediaType: previous?.mediaType ?? mediaType(canonicalOutputPath)
      });
      artifactIndex[namespace].add(canonicalOutputPath);
    }
  }
}
function singleHtmlBundlePlugin(namespace) {
  const plugin = {
    name: "forgeax-single-html-bundle-runtime",
    enforce: "post",
    transform: {
      order: "post",
      handler(code, _id, meta) {
        let program = meta?.ast;
        if (program === void 0) {
          try {
            program = parseAst(code);
          } catch {
            return null;
          }
        }
        const replacements = programReplacements(program, code);
        if (replacements.length === 0) return null;
        if (meta?.magicString !== void 0) {
          for (const replacement of replacements) {
            meta.magicString.overwrite(replacement.start, replacement.end, replacement.value);
          }
          return meta.magicString.hasChanged() ? meta.magicString : null;
        }
        return applyReplacements(code, replacements);
      }
    },
    generateBundle(_outputOptions, bundle) {
      for (const output of Object.values(bundle)) {
        if (output.type === "chunk") {
          output.code = rewriteOutputJavaScript(output.code);
        } else if (isJavaScriptOutputAsset(output.fileName) && output.source !== void 0) {
          const source = typeof output.source === "string" ? output.source : Buffer.from(output.source).toString("utf8");
          output.source = rewriteOutputJavaScript(source);
        } else {
          continue;
        }
        const code = output.type === "chunk" ? output.code : String(output.source);
        const residualStart = residualImportStart(code);
        if (residualStart !== void 0) {
          this.error(
            `single-html bundle left a native dynamic import in ${output.fileName} at ${residualStart}`
          );
        }
      }
    },
    resolveFileUrl: ({ fileName }) => {
      const canonicalPath = namespace !== void 0 && fileName.startsWith(`${namespace}/`) ? fileName.slice(`${namespace}/`.length) : fileName;
      return JSON.stringify(
        namespace === "raw" ? canonicalPath : `${GENERATED_PREFIX}${canonicalPath}`
      );
    }
  };
  return plugin;
}
"use strict";
async function bundleSingleHtmlEntry(distRootInput, indexHtml, projectRoot) {
    const selected = collectEntrySource(indexHtml);
    if (!selected.ok)
        return selected;
    const entryPath = normalizePath(selected.value);
    if (entryPath !== undefined) {
        try {
            if ((await stat(resolve(distRootInput, entryPath))).isFile())
                return { ok: true, value: { entrySource: 'await globalThis.__forgeaxReady; await globalThis.__forgeaxImport(' + JSON.stringify(entryPath) + ');', artifacts: [] } };
        }
        catch { }
    }
    const path = GENERATED_PREFIX + 'inline-entry.mjs';
    return { ok: true, value: { entrySource: 'await globalThis.__forgeaxReady; await globalThis.__forgeaxImport(' + JSON.stringify(path) + ');', artifacts: [{ path, mediaType: 'text/javascript', bytes: Buffer.from(selected.value) }] } };
}

const _singleHtmlSystemSource = "/* SystemJS 6.15.1 — MIT License\r\n-----------\r\n\r\nCopyright (C) 2013-2022 Guy Bedford\r\n\r\nPermission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the \"Software\"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:\r\n\r\nThe above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.\r\n\r\nTHE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.\r\n */\n/*!\r\n * SJS 6.15.1\r\n */\r\n!function(){function e(e,t){return(t||\"\")+\" (SystemJS https://github.com/systemjs/systemjs/blob/main/docs/errors.md#\"+e+\")\"}function t(e,t){if(-1!==e.indexOf(\"\\\\\")&&(e=e.replace(S,\"/\")),\"/\"===e[0]&&\"/\"===e[1])return t.slice(0,t.indexOf(\":\")+1)+e;if(\".\"===e[0]&&(\"/\"===e[1]||\".\"===e[1]&&(\"/\"===e[2]||2===e.length&&(e+=\"/\"))||1===e.length&&(e+=\"/\"))||\"/\"===e[0]){var r,n=t.slice(0,t.indexOf(\":\")+1);if(r=\"/\"===t[n.length+1]?\"file:\"!==n?(r=t.slice(n.length+2)).slice(r.indexOf(\"/\")+1):t.slice(8):t.slice(n.length+(\"/\"===t[n.length])),\"/\"===e[0])return t.slice(0,t.length-r.length-1)+e;for(var i=r.slice(0,r.lastIndexOf(\"/\")+1)+e,o=[],s=-1,c=0;c<i.length;c++)-1!==s?\"/\"===i[c]&&(o.push(i.slice(s,c+1)),s=-1):\".\"===i[c]?\".\"!==i[c+1]||\"/\"!==i[c+2]&&c+2!==i.length?\"/\"===i[c+1]||c+1===i.length?c+=1:s=c:(o.pop(),c+=2):s=c;return-1!==s&&o.push(i.slice(s)),t.slice(0,t.length-r.length)+o.join(\"\")}}function r(e,r){return t(e,r)||(-1!==e.indexOf(\":\")?e:t(\"./\"+e,r))}function n(e,r,n,i,o){for(var s in e){var f=t(s,n)||s,a=e[s];if(\"string\"==typeof a){var l=u(i,t(a,n)||a,o);l?r[f]=l:c(\"W1\",s,a)}}}function i(e,t,i){var o;for(o in e.imports&&n(e.imports,i.imports,t,i,null),e.scopes||{}){var s=r(o,t);n(e.scopes[o],i.scopes[s]||(i.scopes[s]={}),t,i,s)}for(o in e.depcache||{})i.depcache[r(o,t)]=e.depcache[o];for(o in e.integrity||{})i.integrity[r(o,t)]=e.integrity[o]}function o(e,t){if(t[e])return e;var r=e.length;do{var n=e.slice(0,r+1);if(n in t)return n}while(-1!==(r=e.lastIndexOf(\"/\",r-1)))}function s(e,t){var r=o(e,t);if(r){var n=t[r];if(null===n)return;if(!(e.length>r.length&&\"/\"!==n[n.length-1]))return n+e.slice(r.length);c(\"W2\",r,n)}}function c(t,r,n){console.warn(e(t,[n,r].join(\", \")))}function u(e,t,r){for(var n=e.scopes,i=r&&o(r,n);i;){var c=s(t,n[i]);if(c)return c;i=o(i.slice(0,i.lastIndexOf(\"/\")),n)}return s(t,e.imports)||-1!==t.indexOf(\":\")&&t}function f(){this[b]={}}function a(t,r,n,i){var o=t[b][r];if(o)return o;var s=[],c=Object.create(null);j&&Object.defineProperty(c,j,{value:\"Module\"});var u=Promise.resolve().then((function(){return t.instantiate(r,n,i)})).then((function(n){if(!n)throw Error(e(2,r));var i=n[1]((function(e,t){o.h=!0;var r=!1;if(\"string\"==typeof e)e in c&&c[e]===t||(c[e]=t,r=!0);else{for(var n in e)t=e[n],n in c&&c[n]===t||(c[n]=t,r=!0);e&&e.__esModule&&(c.__esModule=e.__esModule)}if(r)for(var i=0;i<s.length;i++){var u=s[i];u&&u(c)}return t}),2===n[1].length?{import:function(e,n){return t.import(e,r,n)},meta:t.createContext(r)}:void 0);return o.e=i.execute||function(){},[n[0],i.setters||[],n[2]||[]]}),(function(e){throw o.e=null,o.er=e,e})),f=u.then((function(e){return Promise.all(e[0].map((function(n,i){var o=e[1][i],s=e[2][i];return Promise.resolve(t.resolve(n,r)).then((function(e){var n=a(t,e,r,s);return Promise.resolve(n.I).then((function(){return o&&(n.i.push(o),!n.h&&n.I||o(n.n)),n}))}))}))).then((function(e){o.d=e}))}));return o=t[b][r]={id:r,i:s,n:c,m:i,I:u,L:f,h:!1,d:void 0,e:void 0,er:void 0,E:void 0,C:void 0,p:void 0}}function l(e,t,r,n){if(!n[t.id])return n[t.id]=!0,Promise.resolve(t.L).then((function(){return t.p&&null!==t.p.e||(t.p=r),Promise.all(t.d.map((function(t){return l(e,t,r,n)})))})).catch((function(e){if(t.er)throw e;throw t.e=null,e}))}function h(e,t){return t.C=l(e,t,t,{}).then((function(){return d(e,t,{})})).then((function(){return t.n}))}function d(e,t,r){function n(){try{var e=o.call(I);if(e)return e=e.then((function(){t.C=t.n,t.E=null}),(function(e){throw t.er=e,t.E=null,e})),t.E=e;t.C=t.n,t.L=t.I=void 0}catch(r){throw t.er=r,r}}if(!r[t.id]){if(r[t.id]=!0,!t.e){if(t.er)throw t.er;return t.E?t.E:void 0}var i,o=t.e;return t.e=null,t.d.forEach((function(n){try{var o=d(e,n,r);o&&(i=i||[]).push(o)}catch(s){throw t.er=s,s}})),i?Promise.all(i).then(n):n()}}function v(){[].forEach.call(document.querySelectorAll(\"script\"),(function(t){if(!t.sp)if(\"systemjs-module\"===t.type){if(t.sp=!0,!t.src)return;System.import(\"import:\"===t.src.slice(0,7)?t.src.slice(7):r(t.src,p)).catch((function(e){if(e.message.indexOf(\"https://github.com/systemjs/systemjs/blob/main/docs/errors.md#3\")>-1){var r=document.createEvent(\"Event\");r.initEvent(\"error\",!1,!1),t.dispatchEvent(r)}return Promise.reject(e)}))}else if(\"systemjs-importmap\"===t.type){t.sp=!0;var n=t.src?(System.fetch||fetch)(t.src,{integrity:t.integrity,priority:t.fetchPriority,passThrough:!0}).then((function(e){if(!e.ok)throw Error(e.status);return e.text()})).catch((function(r){return r.message=e(\"W4\",t.src)+\"\\n\"+r.message,console.warn(r),\"function\"==typeof t.onerror&&t.onerror(),\"{}\"})):t.innerHTML;M=M.then((function(){return n})).then((function(r){!function(t,r,n){var o={};try{o=JSON.parse(r)}catch(s){console.warn(Error(e(\"W5\")))}i(o,n,t)}(R,r,t.src||p)}))}}))}var p,m=\"undefined\"!=typeof Symbol,g=\"undefined\"!=typeof self,y=\"undefined\"!=typeof document,E=g?self:global;if(y){var w=document.querySelector(\"base[href]\");w&&(p=w.href)}if(!p&&\"undefined\"!=typeof location){var O=(p=location.href.split(\"#\")[0].split(\"?\")[0]).lastIndexOf(\"/\");-1!==O&&(p=p.slice(0,O+1))}var x,S=/\\\\/g,j=m&&Symbol.toStringTag,b=m?Symbol():\"@\",P=f.prototype;P.import=function(e,t,r){var n=this;return t&&\"object\"==typeof t&&(r=t,t=void 0),Promise.resolve(n.prepareImport()).then((function(){return n.resolve(e,t,r)})).then((function(e){var t=a(n,e,void 0,r);return t.C||h(n,t)}))},P.createContext=function(e){var t=this;return{url:e,resolve:function(r,n){return Promise.resolve(t.resolve(r,n||e))}}},P.register=function(e,t,r){x=[e,t,r]},P.getRegister=function(){var e=x;return x=void 0,e};var I=Object.freeze(Object.create(null));E.System=new f;var L,C,M=Promise.resolve(),R={imports:{},scopes:{},depcache:{},integrity:{}},T=y;if(P.prepareImport=function(e){return(T||e)&&(v(),T=!1),M},P.getImportMap=function(){return JSON.parse(JSON.stringify(R))},y&&(v(),window.addEventListener(\"DOMContentLoaded\",v)),P.addImportMap=function(e,t){i(e,t||p,R)},y){window.addEventListener(\"error\",(function(e){J=e.filename,W=e.error}));var _=location.origin}P.createScript=function(e){var t=document.createElement(\"script\");t.async=!0,e.indexOf(_+\"/\")&&(t.crossOrigin=\"anonymous\");var r=R.integrity[e];return r&&(t.integrity=r),t.src=e,t};var J,W,q={},N=P.register;P.register=function(e,t){if(y&&\"loading\"===document.readyState&&\"string\"!=typeof e){var r=document.querySelectorAll(\"script[src]\"),n=r[r.length-1];if(n){L=e;var i=this;C=setTimeout((function(){q[n.src]=[e,t],i.import(n.src)}))}}else L=void 0;return N.call(this,e,t)},P.instantiate=function(t,r){var n=q[t];if(n)return delete q[t],n;var i=this;return Promise.resolve(P.createScript(t)).then((function(n){return new Promise((function(o,s){n.addEventListener(\"error\",(function(){s(Error(e(3,[t,r].join(\", \"))))})),n.addEventListener(\"load\",(function(){if(document.head.removeChild(n),J===t)s(W);else{var e=i.getRegister(t);e&&e[0]===L&&clearTimeout(C),o(e)}})),document.head.appendChild(n)}))}))},P.shouldFetch=function(){return!1},\"undefined\"!=typeof fetch&&(P.fetch=fetch);var k=P.instantiate,A=/^(text|application)\\/(x-)?javascript(;|$)/;P.instantiate=function(t,r,n){var i=this;return this.shouldFetch(t,r,n)?this.fetch(t,{credentials:\"same-origin\",integrity:R.integrity[t],meta:n}).then((function(n){if(!n.ok)throw Error(e(7,[n.status,n.statusText,t,r].join(\", \")));var o=n.headers.get(\"content-type\");if(!o||!A.test(o))throw Error(e(4,o));return n.text().then((function(e){return e.indexOf(\"//# sourceURL=\")<0&&(e+=\"\\n//# sourceURL=\"+t),(0,eval)(e),i.getRegister(t)}))})):k.apply(this,arguments)},P.resolve=function(r,n){return u(R,t(r,n=n||p)||r,n)||function(t,r){throw Error(e(8,[t,r].join(\", \")))}(r,n)};var F=P.instantiate;P.instantiate=function(e,t,r){var n=R.depcache[e];if(n)for(var i=0;i<n.length;i++)a(this,this.resolve(n[i],e),e);return F.call(this,e,t,r)},g&&\"function\"==typeof importScripts&&(P.instantiate=function(e){var t=this;return Promise.resolve().then((function(){return importScripts(e),t.getRegister(e)}))})}();\r\n//# sourceMappingURL=s.min.js.map\r\n";
"use strict";
"use strict";
function registerSingleHtmlModules(resources) {
    return resources.map(resource => {
        if (!/\.(?:m?js|cjs)$/i.test(resource.path))
            return resource;
        const input = Buffer.from(resource.bytes).toString('utf8');
        const forwardImportedExports = context => file => {
            const imports = new Map();
            for (const node of file.statements) {
                if (!ts.isImportDeclaration(node) || !ts.isStringLiteral(node.moduleSpecifier))
                    continue;
                const clause = node.importClause;
                if (!clause)
                    continue;
                if (clause.name)
                    imports.set(clause.name.text, { from: node.moduleSpecifier.text, name: 'default' });
                if (clause.namedBindings && ts.isNamedImports(clause.namedBindings))
                    for (const item of clause.namedBindings.elements)
                        imports.set(item.name.text, { from: node.moduleSpecifier.text, name: (item.propertyName ?? item.name).text });
            }
            const statements = [];
            for (const node of file.statements) {
                if (!ts.isExportDeclaration(node) || node.moduleSpecifier || !node.exportClause || !ts.isNamedExports(node.exportClause)) {
                    statements.push(node);
                    continue;
                }
                const locals = [];
                for (const item of node.exportClause.elements) {
                    const binding = imports.get((item.propertyName ?? item.name).text);
                    if (!binding) {
                        locals.push(item);
                        continue;
                    }
                    statements.push(context.factory.createExportDeclaration(undefined, false, context.factory.createNamedExports([context.factory.createExportSpecifier(false, context.factory.createIdentifier(binding.name), item.name)]), context.factory.createStringLiteral(binding.from)));
                }
                if (locals.length)
                    statements.push(context.factory.updateExportDeclaration(node, node.modifiers, false, context.factory.createNamedExports(locals), undefined));
            }
            return context.factory.updateSourceFile(file, statements);
        };
        const result = ts.transpileModule(input, { fileName: resource.path, compilerOptions: { module: ts.ModuleKind.System, target: ts.ScriptTarget.ESNext, moduleDetection: ts.ModuleDetectionKind.Force, ignoreDeprecations: "6.0", sourceMap: false, removeComments: false }, transformers: { before: [forwardImportedExports] }, reportDiagnostics: true });
        const errors = result.diagnostics?.filter(d => d.category === ts.DiagnosticCategory.Error) ?? [];
        if (errors.length)
            throw new Error('single-html module conversion failed: ' + resource.path + ' ' + errors.map(d => ts.flattenDiagnosticMessageText(d.messageText, ' ')).join('; '));
        return { ...resource, bytes: Buffer.from(result.outputText), mediaType: 'text/javascript' };
    });
}


function workerBootstrapSource() {
  const runtime = workerRuntimeSource();
  return `const __forgeaxQueuedMessages=[];
let __forgeaxWorkerStarted=false;
let __forgeaxWorkerReady=false;
let __forgeaxNextRequest=0;
const __forgeaxPendingRequests=new Map();
const __forgeaxForwardedRequests=new Map();
const __forgeaxReplay=(event)=>{globalThis.dispatchEvent(new MessageEvent('message',{data:event.data,ports:event.ports,origin:event.origin,lastEventId:event.lastEventId}));};
const __forgeaxRequestResource=(path,kind)=>new Promise((resolve,reject)=>{const requestId=String(++__forgeaxNextRequest);__forgeaxPendingRequests.set(requestId,{resolve,reject});try{globalThis.postMessage({__forgeaxResourceRequest:{requestId,path:String(path),kind:String(kind)}});}catch(cause){__forgeaxPendingRequests.delete(requestId);reject(cause);}});
const __forgeaxForwardRequest=(request,worker,token)=>{const requestId='f:'+token+':'+String(request.requestId);__forgeaxForwardedRequests.set(requestId,{worker,requestId:String(request.requestId)});globalThis.postMessage({__forgeaxResourceRequest:{requestId,path:String(request.path),kind:String(request.kind)}});};
const __forgeaxForwardTelemetry=(value)=>{try{globalThis.postMessage(value);}catch{}};
const __forgeaxHandleResponse=(response)=>{const requestId=String(response.requestId);const pending=__forgeaxPendingRequests.get(requestId);if(pending!==undefined){__forgeaxPendingRequests.delete(requestId);pending.resolve(response);return true;}const forwarded=__forgeaxForwardedRequests.get(requestId);if(forwarded!==undefined){__forgeaxForwardedRequests.delete(requestId);const forwardedResponse={...response,requestId:forwarded.requestId};try{const transfer=forwardedResponse.data instanceof ArrayBuffer?[forwardedResponse.data]:[];forwarded.worker.postMessage({__forgeaxResourceResponse:forwardedResponse},transfer);}catch{}return true;}return false;};
const __forgeaxStart=async(init)=>{const runtime=(${runtime});await runtime(init,__forgeaxRequestResource,__forgeaxForwardRequest,__forgeaxForwardTelemetry);__forgeaxWorkerReady=true;for(const event of __forgeaxQueuedMessages.splice(0))__forgeaxReplay(event);};
globalThis.addEventListener('message',(event)=>{const response=event.data?.__forgeaxResourceResponse;if(response!==undefined){if(__forgeaxHandleResponse(response))event.stopImmediatePropagation?.();return;}const init=event.data?.__forgeaxWorkerInit;if(init!==undefined){event.stopImmediatePropagation?.();if(!__forgeaxWorkerStarted){__forgeaxWorkerStarted=true;void __forgeaxStart(init);}return;}if(!__forgeaxWorkerReady){event.stopImmediatePropagation?.();__forgeaxQueuedMessages.push({data:event.data,ports:[...event.ports],origin:event.origin,lastEventId:event.lastEventId});}}, {capture:true});`;
}
"use strict";
function workerRuntimeSource() {
    return `(async (init, requestResource, forwardRequest, forwardTelemetry) => {
globalThis.process??={env:{},versions:{node:'0.0.0'},platform:'browser',argv:[]};
const nativeURL=globalThis.URL;
const nativeFetch=globalThis.fetch?.bind(globalThis);
const nativePostMessage=globalThis.postMessage?.bind(globalThis);
const nativeWorker=globalThis.Worker;
const sourcePath=String(init.sourcePath??'');
const bootstrapURL=String(init.bootstrapURL??'');
const sourceOrigin=String(init.sourceOrigin??'');
const normalize=(value)=>{try{return decodeURIComponent(String(value).split(/[?#]/,1)[0]).replaceAll('\\\\','/').replace(/^\\/+/, '');}catch{return undefined;}};
const withoutBundle=(value)=>String(value).replace(/^__forgeax-bundle\\//,'');
const resolveInput=(value)=>{try{const raw=String(value);if(raw.startsWith('__forgeax-bundle/'))return {kind:'resource',path:withoutBundle(raw),url:new nativeURL('forgeax-resource:///'+withoutBundle(raw))};const url=value instanceof nativeURL?value:new nativeURL(raw,'https://forgeax.invalid/'+sourcePath);if(url.protocol==='data:'||url.protocol==='blob:')return {kind:'native',url};if((url.protocol==='http:'||url.protocol==='https:')&&/^[a-z][a-z0-9+.-]*:/i.test(raw)&&url.origin!==sourceOrigin)return {kind:'external',url};const path=normalize(url.pathname);return path===undefined?{kind:'missing',url}:{kind:'resource',path:withoutBundle(path),url};}catch{return {kind:'missing'};}};
const resourceURL=(value)=>{try{const url=new nativeURL(String(value),'https://forgeax.invalid/'+sourcePath);if(url.protocol!=='http:'&&url.protocol!=='https:')return url;const path=normalize(url.pathname);return path===undefined?url:new nativeURL('forgeax-resource:///'+withoutBundle(path));}catch{return new nativeURL(String(value),'https://forgeax.invalid/'+sourcePath);}};
class ForgeaxURL extends nativeURL{constructor(input,base){if(base!==undefined&&/^(?:blob:|data:)/i.test(String(base))&&!/^[a-z][a-z0-9+.-]*:/i.test(String(input))){super(resourceURL(input));return;}super(input,base);}}
globalThis.URL=ForgeaxURL;
const note=(kind,specifier)=>{try{nativePostMessage?.({__forgeaxResourceMiss:{kind,specifier:String(specifier)}});}catch{}};
const noteHit=()=>{try{nativePostMessage?.({__forgeaxResourceHit:1});}catch{}};
const noteExternal=(kind,specifier)=>{try{nativePostMessage?.({__forgeaxExternalRequest:{kind,specifier:String(specifier)}});}catch{}};
const load=async(value,kind)=>{const resolved=resolveInput(value);if(resolved.kind==='native')return {native:true,url:resolved.url};if(resolved.kind==='external'){noteExternal(kind,value);throw new TypeError('forgeax single-html external resource blocked');}if(resolved.kind!=='resource'){note(kind,value);throw new TypeError('forgeax single-html worker resource miss');}const result=await requestResource(resolved.path,kind);if(result?.ok!==true){note(kind,value);throw new TypeError('forgeax single-html worker resource miss');}noteHit();return {native:false,path:resolved.path,data:new Uint8Array(result.data),mime:result.mime??'application/octet-stream'};};
if(typeof nativeFetch==='function')globalThis.fetch=(input,init)=>load(input,'fetch').then((value)=>value.native?nativeFetch(value.url,init):new Response(value.data,{status:200,headers:{'Content-Type':value.mime}}));
const resourcePaths=init.resourcePaths??[];
const canonical=(path)=>{const normalized=withoutBundle(path);const exact=resourcePaths.find(p=>p===path||withoutBundle(p)===normalized);if(exact!==undefined)return exact;const suffix=resourcePaths.filter(p=>normalized.endsWith('/'+withoutBundle(p)));if(suffix.length===1)return suffix[0];const name=normalized.slice(normalized.lastIndexOf('/')+1);const matches=resourcePaths.filter(p=>p.slice(p.lastIndexOf('/')+1)===name);if(matches.length===1)return matches[0];throw new TypeError('single-html unresolved module '+path);};
(0,eval)(${JSON.stringify(_singleHtmlSystemSource)});
const modules=globalThis.System;
modules.resolve=(value,parent)=>{const raw=String(value);const url=new nativeURL(raw,parent||'forgeax-resource:///'+sourcePath);const resolved=resolveInput(url);if(resolved.kind!=='resource')throw new TypeError('single-html external module blocked '+raw);return 'forgeax-resource:///'+canonical(resolved.path);};
modules.instantiate=async(id)=>{const loaded=await load(id,'import');(0,eval)(new TextDecoder().decode(loaded.data));const registration=modules.getRegister();if(!registration)throw new TypeError('single-html module did not register '+id);return registration;};
globalThis.__forgeaxImport=(value)=>modules.import(String(value),'forgeax-resource:///'+sourcePath);
let childToken=0;
const attachWorker=(worker)=>{const token=String(++childToken);worker.addEventListener('message',(event)=>{const request=event.data?.__forgeaxResourceRequest;if(request!==undefined){forwardRequest(request,worker,token);event.stopImmediatePropagation?.();return;}if(event.data?.__forgeaxResourceMiss||event.data?.__forgeaxResourceHit||event.data?.__forgeaxExternalRequest){forwardTelemetry(event.data);event.stopImmediatePropagation?.();return;}},{capture:true});return worker;};
const nativeWorkerURL=(input)=>{try{const url=input instanceof nativeURL?input:new nativeURL(String(input),'https://forgeax.invalid/'+sourcePath);return /^(?:blob:|data:)$/i.test(url.protocol);}catch{return false;}};
if(typeof nativeWorker==='function')globalThis.Worker=class extends nativeWorker{constructor(input,options){if(nativeWorkerURL(input)){super(input,options);return;}const resolved=resolveInput(input);if(resolved.kind!=='resource'){if(resolved.kind==='external')noteExternal('worker',input);else note('worker',input);throw new TypeError('forgeax single-html worker resource miss');}super(bootstrapURL,options);attachWorker(this);this.postMessage({__forgeaxWorkerInit:{sourcePath:canonical(resolved.path),bootstrapURL,sourceOrigin,resourcePaths}});}};
await modules.import('forgeax-resource:///'+canonical(sourcePath));
})`;
}

"use strict";
function runtimeBootstrap() {
    const bootstrapSource = workerBootstrapSource();
    return `(() => {
  globalThis.process ??= { env: {}, versions: { node: '0.0.0' }, platform: 'browser', argv: [] };
  const nativeURL = globalThis.URL;
  const nativeFetch = globalThis.fetch?.bind(globalThis);
  const assetManifestNode = document.getElementById('forgeax-asset-payload');
  const assetManifest = JSON.parse((assetManifestNode?.textContent || '[]').trim());
  const assetDataNodes = [...document.querySelectorAll('script[data-forgeax-asset-index]')];
  const entries = assetManifest.map((entry) => ({ ...entry, node: assetDataNodes[entry.index] })).filter((entry) => entry.node !== undefined);
  // Retain nodes privately so immutable embedded resources no longer bloat the live DOM.
  for (const node of assetDataNodes) node.remove();
  assetManifestNode?.remove();
  // Require a real foreground user action before starting the bounded Engine startup.
  globalThis.__forgeaxReady = new Promise((resolve) => {
    const status=document.getElementById('forgeax-loading-status');
    const spinner=document.getElementById('forgeax-loading-spinner');
    const content=document.getElementById('forgeax-loading-content') || document.body;
    if(status)status.textContent='完整场景已内置，请点击下方按钮进入';
    if(spinner)spinner.style.display='none';
    const button=document.createElement('button');
    button.id='forgeax-single-html-start'; button.type='button'; button.textContent='进入场景';
    button.style.cssText='border:1px solid #ed8de1;border-radius:8px;padding:12px 30px;background:#361a41;color:#fff;font:600 17px system-ui;cursor:pointer';
    button.addEventListener('click',()=>{button.disabled=true;button.remove();if(status)status.textContent='正在加载完整场景，请保持此页面在前台…';if(spinner)spinner.style.display='';resolve();},{once:true});
    content.appendChild(button);
  });
  const decodedPayloads = new Map();
  const decode = async (entry) => { let pending = decodedPayloads.get(entry.index); if (pending === undefined) { pending = (async () => { const binary = atob(entry.node.textContent || ''); const bytes = new Uint8Array(binary.length); for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index); if (entry.encoding !== 'gzip') return bytes; if (typeof DecompressionStream !== 'function') throw new TypeError('This offline game requires a browser with gzip decompression support.'); return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()); })(); decodedPayloads.set(entry.index, pending); } return (await pending).slice(); };
  const normalize = (value) => { try { return decodeURIComponent(String(value).split(/[?#]/, 1)[0]).replaceAll('\\\\', '/').replace(/^\\/+/, ''); } catch { return undefined; } };
  const withoutBundle = (value) => String(value).replace(/^__forgeax-bundle\\//, '');
  const lookup = (input) => { let url; try { url = input instanceof nativeURL ? input : new nativeURL(String(input), document.baseURI); } catch { return undefined; } if (url.protocol === 'data:' || url.protocol === 'blob:') return undefined; const path = normalize(url.pathname); if (path === undefined) return undefined; const normalized = withoutBundle(path); const exact = entries.find((entry) => entry.path === path || withoutBundle(entry.path) === normalized); if (exact !== undefined) return exact; const suffix = entries.filter((entry) => normalized.endsWith('/' + withoutBundle(entry.path))); if (suffix.length === 1) return suffix[0]; const name = normalized.slice(normalized.lastIndexOf('/') + 1); const matches = entries.filter((entry) => withoutBundle(entry.path).slice(withoutBundle(entry.path).lastIndexOf('/') + 1) === name); return matches.length === 1 ? matches[0] : undefined; };
  const resourceMisses = [];
  const externalRequests = [];
  let resourceHits = 0;
  const noteMiss = (kind, specifier) => { resourceMisses.push({ kind, specifier: String(specifier), realm: 'main' }); };
  const noteExternal = (kind, specifier) => { externalRequests.push({ kind, specifier: String(specifier), realm: 'main' }); };
  const response = async (entry) => { resourceHits += 1; return new Response(await decode(entry), { status: 200, headers: { 'Content-Type': entry.mime } }); };
  const ownedBlobUrls = new Set();
  const makeBlobUrl = async (entry) => { const url = nativeURL.createObjectURL(new Blob([await decode(entry)], { type: entry.mime })); ownedBlobUrls.add(url); return url; };
  const dataUrl = (source) => { const bytes = new TextEncoder().encode(source); let binary = ''; for (const byte of bytes) binary += String.fromCharCode(byte); return 'data:text/javascript;base64,' + btoa(binary); };
  const workerBootstrapSource = ${JSON.stringify(bootstrapSource)};
  const workerBootstrapUrl = dataUrl(workerBootstrapSource);
  (0,eval)(${JSON.stringify(_singleHtmlSystemSource)});
  const modules=globalThis.System;
  modules.resolve=(specifier,parent)=>{const url=new nativeURL(String(specifier),parent||document.baseURI);const entry=lookup(url);if(entry===undefined){noteMiss('import',specifier);throw new TypeError('single-html module missing '+specifier);}return 'forgeax-resource:///'+entry.path;};
  modules.instantiate=async(id)=>{const entry=lookup(id);if(entry===undefined)throw new TypeError('single-html module missing '+id);resourceHits+=1;(0,eval)(new TextDecoder().decode(await decode(entry)));const registration=modules.getRegister();if(!registration)throw new TypeError('single-html module did not register '+id);return registration;};
  globalThis.__forgeaxImport=(specifier)=>modules.import(String(specifier),document.baseURI);
  const external = (input) => { try { const url = input instanceof nativeURL ? input : new nativeURL(String(input), document.baseURI); return url.protocol === 'http:' || url.protocol === 'https:'; } catch { return false; } };
  if (typeof nativeFetch === 'function') globalThis.fetch = (input, init) => { const entry = lookup(input); if (entry !== undefined) return Promise.resolve(response(entry)); if (/^(?:data:|blob:)/i.test(String(input))) return nativeFetch(input, init); if (external(input)) { noteExternal('fetch', input); return Promise.reject(new TypeError('forgeax single-html blocked an external request')); } noteMiss('fetch', input); return Promise.reject(new TypeError('forgeax single-html resource miss')); };
  const sendResource = async (worker, request) => { const entry = lookup(request.path); if (entry === undefined) { worker.postMessage({ __forgeaxResourceResponse: { requestId: String(request.requestId), ok: false } }); return; } try { const data = await decode(entry); worker.postMessage({ __forgeaxResourceResponse: { requestId: String(request.requestId), ok: true, mime: entry.mime, data: data.buffer } }, [data.buffer]); } catch { worker.postMessage({ __forgeaxResourceResponse: { requestId: String(request.requestId), ok: false } }); } };
  const nativeWorker = globalThis.Worker;
  const nativeWorkerURL = (input) => { try { const url = input instanceof nativeURL ? input : new nativeURL(String(input), document.baseURI); return /^(?:blob:|data:)$/i.test(url.protocol); } catch { return false; } };
  const attachWorker = (worker) => { worker.addEventListener('message', (event) => { const request = event.data?.__forgeaxResourceRequest; if (request !== undefined) { sendResource(worker, request); event.stopImmediatePropagation?.(); return; } const miss = event.data?.__forgeaxResourceMiss; if (miss !== undefined) { resourceMisses.push({ ...miss, realm: 'worker' }); event.stopImmediatePropagation?.(); return; } const externalRequest = event.data?.__forgeaxExternalRequest; if (externalRequest !== undefined) { externalRequests.push({ ...externalRequest, realm: 'worker' }); event.stopImmediatePropagation?.(); return; } const hit = event.data?.__forgeaxResourceHit; if (typeof hit === 'number' && Number.isFinite(hit)) { resourceHits += hit; event.stopImmediatePropagation?.(); } }, { capture: true }); return worker; };
  if (typeof nativeWorker === 'function') globalThis.Worker = class extends nativeWorker { constructor(input, options) { if (nativeWorkerURL(input)) { super(input, options); return; } const entry = lookup(input); if (entry === undefined) { const text = String(input); if (external(input)) noteExternal('worker', text); else noteMiss('worker', text); throw new TypeError('forgeax single-html worker resource miss'); } super(workerBootstrapUrl, options); attachWorker(this); this.postMessage({ __forgeaxWorkerInit: { sourcePath: entry.path, bootstrapURL: workerBootstrapUrl, sourceOrigin: document.location.origin, resourcePaths: entries.map(e=>e.path) } }); } };
  const witness = () => ({ ready: document.documentElement.dataset.forgeaxSingleHtmlReady === 'true', resourceHits, resourceMisses: resourceMisses.slice(), externalRequests: externalRequests.slice() });
  globalThis.__forgeaxSingleHtml = { lookup, entries: entries.map(({ path, mime }) => ({ path, mime })), witness };
  globalThis.addEventListener('pagehide', () => { for (const url of ownedBlobUrls) nativeURL.revokeObjectURL(url); ownedBlobUrls.clear(); }, { once: true });
  document.documentElement.dataset.forgeaxSingleHtmlReady = 'true';
})();`;
}

function distResources(distRoot, manifest) {
  const rows = [
    ...manifest.artifacts,
    { path: "forgeax-dist.json" }
  ];
  return Promise.all(
    rows.filter((artifact) => artifact.path !== "index.html").map(async (artifact) => ({
      path: artifact.path,
      bytes: await readFile(resolve(distRoot, artifact.path)),
      mediaType: "mediaType" in artifact ? artifact.mediaType : mediaType(artifact.path)
    }))
  );
}
function buildHtml(indexHtml, distArtifacts, bundle) {
  const resources = /* @__PURE__ */ new Map();
  for (const resource of [...distArtifacts, ...bundle.artifacts]) {
    if (resources.has(resource.path)) {
      return errorResult(
        "single-html-asset-duplicate",
        "embedded resource paths to be unique",
        "Repair the generated bundle path collision before packaging.",
        { path: resource.path }
      );
    }
    resources.set(resource.path, resource);
  }
  const replacements = [];
  for (const element of scanHtmlElements(indexHtml)) {
    if (isModuleScript(element) || isModulePreload(element)) {
      replacements.push({ start: element.start, end: element.end, value: "" });
      continue;
    }
    if (isStylesheet(element)) {
      const href = attributeValue(element, "href");
      if (href === void 0) {
        return errorResult(
          "single-html-stylesheet-missing",
          "stylesheet link to contain href",
          "Repair the generated HTML stylesheet link."
        );
      }
      const path = resourcePath(href, "index.html");
      const stylesheet = path === void 0 ? void 0 : resourceForPath(path, resources);
      if (stylesheet === void 0) {
        return errorResult(
          "single-html-css-asset-missing",
          "stylesheet link to resolve to an embedded artifact",
          "Add the stylesheet to the dist closure and rebuild.",
          { href, path: path ?? null }
        );
      }
      const css = inlineCss(
        Buffer.from(stylesheet.bytes).toString("utf8"),
        stylesheet.path,
        resources
      );
      if (!css.ok) return css;
      replacements.push({
        start: element.start,
        end: element.end,
        value: `<style data-forgeax-inline-css>${css.value}</style>`
      });
      continue;
    }
    if (element.name === "style" && element.contentStart !== void 0 && element.contentEnd !== void 0) {
      const css = inlineCss(
        indexHtml.slice(element.contentStart, element.contentEnd),
        "index.html",
        resources
      );
      if (!css.ok) return css;
      replacements.push({ start: element.contentStart, end: element.contentEnd, value: css.value });
      continue;
    }
    const resourceAttribute = element.name === "img" || element.name === "source" || element.name === "video" || element.name === "audio" || element.name === "link" ? element.attributes.find((candidate) => ["src", "poster", "href"].includes(candidate.name)) : void 0;
    const resourceAttributeLocation = resourceAttribute === void 0 ? void 0 : element.attributeLocations[resourceAttribute.name];
    const resourceAttributeRange = resourceAttribute === void 0 || resourceAttributeLocation === void 0 ? void 0 : attributeValueRange(indexHtml, resourceAttributeLocation);
    if (resourceAttribute?.value !== void 0 && resourceAttributeRange !== void 0 && !/^(?:data:|blob:|#)/i.test(resourceAttribute.value)) {
      const path = resourcePath(resourceAttribute.value, "index.html");
      const embedded = path === void 0 ? void 0 : resourceForPath(path, resources);
      if (embedded === void 0) {
        return errorResult(
          "single-html-asset-missing",
          "every local HTML resource to resolve to an embedded dist artifact",
          "Add the referenced asset to the project closure and rebuild.",
          { value: resourceAttribute.value, path: path ?? null }
        );
      }
      replacements.push({
        start: resourceAttributeRange.startOffset,
        end: resourceAttributeRange.endOffset,
        value: dataUri(embedded.bytes, embedded.mediaType)
      });
      continue;
    }
    if (element.name === "script" && attributeValue(element, "src") !== void 0) {
      return errorResult(
        "single-html-script-external",
        "non-module script sources to be absent from the generated host",
        "Move the script into the production module entry before packaging.",
        { src: attributeValue(element, "src") }
      );
    }
  }
  const orderedResources = [...resources.values()].sort(
    (left, right) => left.path.localeCompare(right.path)
  );
  const payloads = [];
  const payloadIndices = new Map();
  const assetManifestSource = JSON.stringify(orderedResources.map((resource) => {
    const digest = _singleHtmlDigest("sha256").update(resource.bytes).digest("hex");
    let index = payloadIndices.get(digest);
    if (index === undefined) { index = payloads.length; payloadIndices.set(digest,index); payloads.push(_singleHtmlGzip(resource.bytes,{level:6})); }
    return {path:resource.path,mime:resource.mediaType,index,encoding:"gzip"};
  }));
  const assetManifestNode = `<script type="application/json" id="forgeax-asset-payload" data-forgeax-asset-payload>${safeScriptText(assetManifestSource)}</script>`;
  const assetDataNodes = payloads.map((bytes,index) => `<script type="application/octet-stream" data-forgeax-asset-index="${index}">${Buffer.from(bytes).toString("base64")}</script>`).join("");
  const assetNode = `${assetManifestNode}${assetDataNodes}`;
  const bootstrap = `<script type="application/javascript">${safeScriptText(runtimeBootstrap())}</script>`;
  const entry = `<script type="module">${safeScriptText(bundle.entrySource)}</script>`;
  const withResources = applyReplacements(indexHtml, replacements);
  const body = `${assetNode}${bootstrap}${entry}`;
  const html = withResources.includes("</body>") ? withResources.replace(/<\/body>/i, () => `${body}</body>`) : `${withResources}${body}`;
  return { ok: true, value: { html, embeddedAssets: resources.size } };
}
"use strict";
async function writeSingleHtml(options) {
    const distRoot = resolve(options.distRoot);
    const output = resolve(options.output);
    const checksumPath = `${output}.sha256`;
    const temporary = `${output}.partial-${process.pid}`;
    const temporaryChecksum = `${checksumPath}.partial-${process.pid}`;
    let staticGraphRoot;
    try {
        staticGraphRoot = await (await import('node:fs/promises')).realpath(await mkdtemp(resolve(tmpdir(), 'forgeax-single-html-static-')));
        const indexHtml = await readFile(resolve(distRoot, 'index.html'), 'utf8');
        const resources = await distResources(distRoot, options.manifest);
        const registered = registerSingleHtmlModules([...resources, ...options.bundle.artifacts]);
        const built = buildHtml(indexHtml, registered, {
            entrySource: options.bundle.entrySource,
            artifacts: [],
        });
        if (!built.ok)
            return built;
        const bytes = Buffer.from(built.value.html, 'utf8');
        const sha256 = hashBytes(bytes);
        const manifestBytes = await readFile(resolve(distRoot, 'forgeax-dist.json'));
        await mkdir(dirname(output), { recursive: true });
        await writeFile(temporary, bytes);
        await writeFile(temporaryChecksum, `${sha256}  ${basename(output)}\n`, 'utf8');
        await rename(temporaryChecksum, checksumPath);
        await rename(temporary, output);
        return {
            ok: true,
            value: {
                schemaVersion: '1.0.0',
                format: SINGLE_HTML_FORMAT,
                target: 'file',
                project: options.manifest.project,
                base: options.manifest.base,
                html: { path: output, bytes: bytes.byteLength, sha256 },
                checksumPath,
                distManifestSha256: hashBytes(manifestBytes),
                embeddedAssets: built.value.embeddedAssets,
                run: {
                    local: pathToFileURL(output).href,
                    shared: 'send the HTML file and open it in a desktop Chrome with WebGPU support',
                },
            },
        };
    }
    catch (cause) {
        return toErrorResult(cause, 'single-html-write-failed', 'the single HTML candidate and adjacent SHA-256 to be written atomically', 'Repair the dist closure or output directory, then retry packaging.');
    }
    finally {
        await Promise.all([
            rm(temporary, { force: true }),
            rm(temporaryChecksum, { force: true }),
            ...(staticGraphRoot === undefined
                ? []
                : [rm(staticGraphRoot, { recursive: true, force: true })]),
        ]);
    }
}

function packageFormatError(format) {
  return errorResult(
    "package-format-unsupported",
    "package format to be web-zip or single-html",
    "Use web-zip for HTTPS hosting or single-html for a self-contained file:// delivery.",
    { format }
  );
}
function packageOutputError(output, format) {
  const expectedSuffix = format === "single-html" ? ".html" : ".zip";
  return errorResult(
    "package-output-suffix-mismatch",
    `package output to end with ${expectedSuffix}`,
    `Use a ${expectedSuffix} output path for ${format}.`,
    { output, format }
  );
}
var PROJECT_SKILL_MOUNT_ROOTS = Object.freeze([
  ".codebuddy/skills",
  ".cursor/skills",
  ".agents/skills",
  ".claude/skills",
  ".workbuddy/skills",
  ".forgeax/skills"
]);
var RETIRED_PROJECT_SKILL_MOUNT_ROOTS = /* @__PURE__ */ new Set([".claude-internal/skills"]);
var MANIFEST_PATH = ".forgeax/skill-install-manifest.json";
var GITIGNORE_BEGIN = "# BEGIN FORGEAX MANAGED SKILLS";
var GITIGNORE_END = "# END FORGEAX MANAGED SKILLS";
function slash(path) {
  return path.split(sep).join("/");
}
async function pathKind(path) {
  try {
    const info = await lstat(path);
    if (info.isSymbolicLink()) return "symlink";
    if (info.isDirectory()) return "directory";
    return "file";
  } catch (cause) {
    if (cause !== null && typeof cause === "object" && "code" in cause && cause.code === "ENOENT") {
      return "missing";
    }
    throw cause;
  }
}
async function filesUnder2(root, directory = root) {
  const files = [];
  for (const name of (await readdir(directory)).sort()) {
    const path = resolve(directory, name);
    const info = await lstat(path);
    if (info.isSymbolicLink()) throw new Error(`skill-source-symlink: ${path}`);
    if (info.isDirectory()) files.push(...await filesUnder2(root, path));
    else if (info.isFile()) files.push(path);
  }
  return files;
}
async function skillRow(sourceRoot, id) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) throw new Error(`skill-id-invalid: ${id}`);
  const root = resolve(sourceRoot, id);
  if (await pathKind(root) !== "directory") throw new Error(`skill-source-invalid: ${id}`);
  if (await pathKind(resolve(root, "SKILL.md")) !== "file") {
    throw new Error(`skill-entry-missing: ${id}/SKILL.md`);
  }
  const files = await filesUnder2(root);
  return {
    id,
    root: `skills/${id}`,
    fileCount: files.length,
    byteCount: (await Promise.all(files.map(async (path) => (await readFile(path)).byteLength))).reduce((sum, bytes) => sum + bytes, 0)
  };
}
async function discoverProjectSkills(root) {
  const sourceRoot = resolve(root, "skills");
  if (await pathKind(sourceRoot) !== "directory") throw new Error("project-skills-missing");
  const entries = await readdir(sourceRoot, { withFileTypes: true });
  const ids = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  if (ids.length === 0) throw new Error("project-skills-empty");
  return Promise.all(ids.map((id) => skillRow(sourceRoot, id)));
}
async function sameFiles(leftRoot, rightRoot) {
  const left = await filesUnder2(leftRoot);
  const right = await filesUnder2(rightRoot);
  const leftNames = left.map((path) => slash(relative(leftRoot, path)));
  const rightNames = right.map((path) => slash(relative(rightRoot, path)));
  if (JSON.stringify(leftNames) !== JSON.stringify(rightNames)) return false;
  for (let index = 0; index < left.length; index += 1) {
    const leftPath = left[index];
    const rightPath = right[index];
    if (leftPath === void 0 || rightPath === void 0) return false;
    if (!(await readFile(leftPath)).equals(await readFile(rightPath))) return false;
  }
  return true;
}
async function copySdkSkills(sdk, projectRoot) {
  const targetSourceRoot = resolve(projectRoot, "skills");
  const copies = [];
  for (const skill of sdk.manifest.skills) {
    const source = resolve(sdk.root, skill.root);
    const destination = resolve(projectRoot, skill.root);
    if (!isFilesystemPathWithin(sdk.root, source, false) || !isFilesystemPathWithin(projectRoot, destination, false)) {
      throw new Error(`sdk-skill-path-invalid: ${skill.id}`);
    }
    const actual = await skillRow(resolve(sdk.root, "skills"), skill.id);
    if (actual.root !== skill.root || actual.fileCount !== skill.fileCount || actual.byteCount !== skill.byteCount) {
      throw new Error(`sdk-skill-manifest-drift: ${skill.id}`);
    }
    const kind = await pathKind(destination);
    if (kind === "missing") {
      copies.push({ source, destination });
    } else if (kind !== "directory" || !await sameFiles(source, destination)) {
      throw new Error(`project-skill-source-conflict: ${skill.id}`);
    }
  }
  const created = [];
  try {
    await mkdir(targetSourceRoot, { recursive: true });
    for (const { source, destination } of copies) {
      await cp(source, destination, { recursive: true, errorOnExist: true, force: false });
      created.push(destination);
    }
  } catch (cause) {
    await Promise.all(created.map((path) => rm(path, { recursive: true, force: true })));
    throw cause;
  }
}
function expectedLinkTarget(projectRoot, mountRoot, id) {
  const mountParent = resolve(projectRoot, mountRoot);
  const target = resolve(projectRoot, "skills", id);
  return process.platform === "win32" ? target : relative(mountParent, target);
}
async function linkMatches(path, target) {
  if (await pathKind(path) !== "symlink") return false;
  const actual = await readlink(path);
  return resolve(dirname(path), actual) === resolve(dirname(path), target);
}
function updateManagedGitignore(previous, skillIds) {
  const block = `${GITIGNORE_BEGIN}
${skillIds.map((id) => `/${id}`).join("\n")}
${GITIGNORE_END}`;
  const begin = previous.indexOf(GITIGNORE_BEGIN);
  const end = previous.indexOf(GITIGNORE_END);
  if (begin >= 0 && end >= begin) {
    const after = end + GITIGNORE_END.length;
    return `${previous.slice(0, begin)}${block}${previous.slice(after)}`.replace(/^\n+/, "");
  }
  return previous.length === 0 ? `${block}
` : `${previous.replace(/\s*$/, "")}

${block}
`;
}
function removeManagedGitignore(previous) {
  const begin = previous.indexOf(GITIGNORE_BEGIN);
  const end = previous.indexOf(GITIGNORE_END);
  if (begin < 0 || end < begin) return previous;
  const before = previous.slice(0, begin).trimEnd();
  const after = previous.slice(end + GITIGNORE_END.length).trimStart();
  const retained = [before, after].filter((part) => part.length > 0).join("\n");
  return retained.length === 0 ? "" : `${retained}
`;
}
async function removeEmptyDirectory(path) {
  try {
    await rmdir(path);
  } catch (cause) {
    if (cause !== null && typeof cause === "object" && "code" in cause && (cause.code === "ENOENT" || cause.code === "ENOTEMPTY" || cause.code === "EEXIST")) {
      return;
    }
    throw cause;
  }
}
async function readOptional(path) {
  try {
    return await readFile(path, "utf8");
  } catch (cause) {
    if (cause !== null && typeof cause === "object" && "code" in cause && cause.code === "ENOENT") {
      return void 0;
    }
    throw cause;
  }
}
async function readInstallManifest(root) {
  const value = await readOptional(resolve(root, MANIFEST_PATH));
  return value === void 0 ? void 0 : JSON.parse(value);
}
async function installedProjectSkillDirectories(root) {
  const manifest = await readInstallManifest(root);
  if (manifest === void 0) return [];
  if (manifest.schemaVersion !== "1.0.0" || manifest.sourceRoot !== "skills" || !Array.isArray(manifest.skills)) {
    throw new Error("skill-install-manifest-drift");
  }
  const directories = [];
  for (const skill of manifest.skills) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(skill.id) || skill.root !== `skills/${skill.id}`) {
      throw new Error("skill-install-manifest-drift");
    }
    if (await pathKind(resolve(root, skill.root)) !== "directory") continue;
    directories.push(skill.root);
    for (const mountRoot of PROJECT_SKILL_MOUNT_ROOTS) {
      const path = `${mountRoot}/${skill.id}`;
      if (await linkMatches(resolve(root, path), expectedLinkTarget(root, mountRoot, skill.id))) {
        directories.push(path);
      }
    }
  }
  return directories;
}
async function installProjectSkills(root, provenance) {
  const projectRoot = resolve(root);
  const skills = await discoverProjectSkills(projectRoot);
  const ids = skills.map((skill) => skill.id);
  const priorManifest = await readInstallManifest(projectRoot);
  const desiredLinks = PROJECT_SKILL_MOUNT_ROOTS.flatMap(
    (mountRoot) => ids.map((id) => ({
      path: resolve(projectRoot, mountRoot, id),
      target: expectedLinkTarget(projectRoot, mountRoot, id)
    }))
  );
  const desiredPaths = new Set(desiredLinks.map((entry) => entry.path));
  const desiredMountRoots = new Set(PROJECT_SKILL_MOUNT_ROOTS);
  const retiredMountRoots = (priorManifest?.mounts ?? []).map((mount) => mount.root).filter(
    (mountRoot) => !desiredMountRoots.has(mountRoot) && RETIRED_PROJECT_SKILL_MOUNT_ROOTS.has(mountRoot)
  );
  const staleLinks = (priorManifest?.mounts ?? []).flatMap(
    (mount) => mount.skills.map((id) => ({
      path: resolve(projectRoot, mount.root, id),
      target: expectedLinkTarget(projectRoot, mount.root, id)
    }))
  ).filter((entry) => !desiredPaths.has(entry.path));
  for (const entry of desiredLinks) {
    const kind = await pathKind(entry.path);
    if (kind !== "missing" && !await linkMatches(entry.path, entry.target)) {
      throw new Error(`skill-mount-conflict: ${slash(relative(projectRoot, entry.path))}`);
    }
  }
  for (const entry of staleLinks) {
    const kind = await pathKind(entry.path);
    if (kind !== "missing" && !await linkMatches(entry.path, entry.target)) {
      throw new Error(`skill-stale-mount-conflict: ${slash(relative(projectRoot, entry.path))}`);
    }
  }
  const ignoreSnapshots = /* @__PURE__ */ new Map();
  const createdLinks = [];
  const removedLinks = [];
  const manifestPath = resolve(projectRoot, MANIFEST_PATH);
  const priorManifestText = await readOptional(manifestPath);
  try {
    for (const entry of staleLinks) {
      if (await pathKind(entry.path) === "symlink") {
        await rm(entry.path);
        removedLinks.push(entry);
      }
    }
    for (const mountRoot of retiredMountRoots) {
      const mountParent = resolve(projectRoot, mountRoot);
      const ignorePath = resolve(mountParent, ".gitignore");
      const previous = await readOptional(ignorePath);
      ignoreSnapshots.set(ignorePath, previous);
      if (previous !== void 0) {
        const retained = removeManagedGitignore(previous);
        if (retained.length === 0) await rm(ignorePath);
        else await writeFile(ignorePath, retained);
      }
      await removeEmptyDirectory(mountParent);
      await removeEmptyDirectory(dirname(mountParent));
    }
    for (const mountRoot of PROJECT_SKILL_MOUNT_ROOTS) {
      const mountParent = resolve(projectRoot, mountRoot);
      await mkdir(mountParent, { recursive: true });
      const ignorePath = resolve(mountParent, ".gitignore");
      const previous = await readOptional(ignorePath);
      ignoreSnapshots.set(ignorePath, previous);
      await writeFile(ignorePath, updateManagedGitignore(previous ?? "", ids));
      for (const id of ids) {
        const path = resolve(mountParent, id);
        if (await pathKind(path) === "missing") {
          const target = expectedLinkTarget(projectRoot, mountRoot, id);
          await symlink(target, path, process.platform === "win32" ? "junction" : "dir");
          createdLinks.push(path);
        }
      }
    }
    const sdkVersion = provenance?.sdkVersion ?? priorManifest?.sdkVersion;
    const engineCommit = provenance?.engineCommit ?? priorManifest?.engineCommit;
    const manifest = {
      schemaVersion: "1.0.0",
      sourceRoot: "skills",
      ...sdkVersion === void 0 ? {} : { sdkVersion },
      ...engineCommit === void 0 ? {} : { engineCommit },
      skills,
      mounts: PROJECT_SKILL_MOUNT_ROOTS.map((mountRoot) => ({ root: mountRoot, skills: ids }))
    };
    await mkdir(dirname(manifestPath), { recursive: true });
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}
`);
  } catch (cause) {
    await Promise.all(createdLinks.map((path) => rm(path, { force: true })));
    await Promise.all(
      removedLinks.map(async ({ path, target }) => {
        await mkdir(dirname(path), { recursive: true });
        await symlink(target, path, process.platform === "win32" ? "junction" : "dir");
      })
    );
    await Promise.all(
      [...ignoreSnapshots].map(async ([path, value]) => {
        if (value === void 0) await rm(path, { force: true });
        else {
          await mkdir(dirname(path), { recursive: true });
          await writeFile(path, value);
        }
      })
    );
    if (priorManifestText === void 0) await rm(manifestPath, { force: true });
    else await writeFile(manifestPath, priorManifestText);
    throw cause;
  }
  return {
    root: projectRoot,
    sourceRoot: resolve(projectRoot, "skills"),
    manifest: manifestPath,
    skills: ids,
    mountRoots: PROJECT_SKILL_MOUNT_ROOTS
  };
}
async function verifyProjectSkills(root) {
  const projectRoot = resolve(root);
  const skills = await discoverProjectSkills(projectRoot);
  const ids = skills.map((skill) => skill.id);
  const manifest = await readInstallManifest(projectRoot);
  if (manifest === void 0) throw new Error("skill-install-manifest-missing");
  if (manifest.schemaVersion !== "1.0.0" || manifest.sourceRoot !== "skills" || JSON.stringify(manifest.skills) !== JSON.stringify(skills) || JSON.stringify(manifest.mounts.map((mount) => mount.root)) !== JSON.stringify(PROJECT_SKILL_MOUNT_ROOTS)) {
    throw new Error("skill-install-manifest-drift");
  }
  for (const mountRoot of PROJECT_SKILL_MOUNT_ROOTS) {
    const declared = manifest.mounts.find((mount) => mount.root === mountRoot);
    if (declared === void 0 || JSON.stringify(declared.skills) !== JSON.stringify(ids)) {
      throw new Error(`skill-install-manifest-mount-drift: ${mountRoot}`);
    }
    const ignore = await readOptional(resolve(projectRoot, mountRoot, ".gitignore"));
    if (ignore === void 0 || updateManagedGitignore(ignore, ids) !== ignore) {
      throw new Error(`skill-mount-gitignore-drift: ${mountRoot}`);
    }
    for (const id of ids) {
      const path = resolve(projectRoot, mountRoot, id);
      const target = expectedLinkTarget(projectRoot, mountRoot, id);
      if (!await linkMatches(path, target)) {
        throw new Error(`skill-mount-drift: ${mountRoot}/${id}`);
      }
    }
  }
  return {
    root: projectRoot,
    sourceRoot: resolve(projectRoot, "skills"),
    manifest: resolve(projectRoot, MANIFEST_PATH),
    skills: ids,
    mountRoots: PROJECT_SKILL_MOUNT_ROOTS
  };
}
async function skillInstallCommand(options = {}) {
  const facts = await readProjectFacts(options.root);
  if (!facts.ok) return facts;
  try {
    return { ok: true, value: await installProjectSkills(facts.value.root) };
  } catch (cause) {
    return { ok: false, error: commandError(cause, "skill-install-failed") };
  }
}
async function skillVerifyCommand(options = {}) {
  const facts = await readProjectFacts(options.root);
  if (!facts.ok) return facts;
  try {
    return { ok: true, value: await verifyProjectSkills(facts.value.root) };
  } catch (cause) {
    return { ok: false, error: commandError(cause, "skill-verify-failed") };
  }
}

// package.json
var package_default = {
  version: "0.0.0",
  dependencies: {
    vitest: "4.0.18"}};

// src/init.ts
var sdkVitestVersion = package_default.dependencies.vitest;
var STANDARD_SCRIPTS = {
  dev: "forgeax dev start",
  build: "forgeax project build",
  package: "forgeax project package",
  serve: "forgeax project preview",
  preview: "forgeax project preview",
  doctor: "forgeax project check",
  test: "forgeax project test",
  typecheck: "pnpm exec tsc --noEmit"
};
var SDK_DEV_DEPENDENCIES = {
  "@types/node": "20.19.40",
  "@webgpu/types": "0.1.71",
  tsx: "4.23.1",
  typescript: "6.0.3",
  vitest: sdkVitestVersion
};
function isEnginePackage(name) {
  return name === "@forgeax/engine" || name.startsWith("@forgeax/engine-");
}
function createInitPlan(facts, sdk) {
  const manifest = structuredClone(facts.packageJson);
  const packageVersions = new Map(sdk?.packages.map((entry) => [entry.name, entry.version]));
  const devkitVersion = packageVersions.get("@forgeax/engine-devkit") ?? package_default.version;
  const dependencyChanges = [];
  if (sdk !== void 0) {
    for (const section of ["dependencies", "devDependencies"]) {
      const dependencies = manifest[section];
      if (dependencies === null || typeof dependencies !== "object") continue;
      const unsupported = Object.keys(dependencies).filter(
        (name) => !isEnginePackage(name) && !(name in SDK_DEV_DEPENDENCIES)
      );
      if (unsupported.length > 0) {
        return {
          ok: false,
          error: {
            code: "sdk-external-dependency-unsupported",
            expected: "archive-backed init dependencies to belong to the SDK closure",
            hint: "Remove the external dependency or use a network-backed package workflow explicitly.",
            detail: { root: facts.root, dependencies: unsupported.sort() }
          }
        };
      }
    }
  }
  for (const section of ["dependencies", "devDependencies"]) {
    const dependencies = manifest[section];
    if (dependencies === null || typeof dependencies !== "object") continue;
    for (const [name, value] of Object.entries(dependencies)) {
      if (isEnginePackage(name) && typeof value === "string" && value.startsWith("workspace:")) {
        const version = packageVersions.get(name) ?? devkitVersion;
        dependencyChanges.push({ section, name, from: value, to: version });
      }
    }
  }
  if (sdk !== void 0) {
    const existingEngineNames = new Set(
      ["dependencies", "devDependencies"].flatMap((section) => {
        const value = manifest[section];
        return value !== null && typeof value === "object" ? Object.keys(value).filter((name) => isEnginePackage(name)) : [];
      })
    );
    for (const entry of sdk.packages) {
      if (entry.name === "@forgeax/engine-devkit" || existingEngineNames.has(entry.name)) continue;
      dependencyChanges.push({
        section: "dependencies",
        name: entry.name,
        to: entry.version
      });
    }
    const devDependencies2 = manifest.devDependencies !== null && typeof manifest.devDependencies === "object" ? manifest.devDependencies : {};
    for (const [name, version] of Object.entries(SDK_DEV_DEPENDENCIES)) {
      if (devDependencies2[name] === version) continue;
      dependencyChanges.push({
        section: "devDependencies",
        name,
        ...typeof devDependencies2[name] === "string" ? { from: devDependencies2[name] } : {},
        to: version
      });
    }
  }
  const scriptsValue = manifest.scripts;
  const scripts = scriptsValue !== null && typeof scriptsValue === "object" ? scriptsValue : {};
  const scriptChanges = [];
  for (const [name, command] of Object.entries(STANDARD_SCRIPTS)) {
    const existing = scripts[name];
    if (existing === void 0) scriptChanges.push({ name, to: command });
    else if (existing !== command) {
      return {
        ok: false,
        error: {
          code: "project-script-conflict",
          expected: `package.json#scripts.${name} to be absent or ${JSON.stringify(command)}`,
          hint: `Rename the existing ${name} script, then rerun forgeax project init.`,
          detail: { root: facts.root, script: name, existing }
        }
      };
    }
  }
  const devDependencies = manifest.devDependencies;
  const existingDevkit = devDependencies !== null && typeof devDependencies === "object" ? devDependencies["@forgeax/engine-devkit"] : void 0;
  if (existingDevkit !== devkitVersion) {
    dependencyChanges.push({
      section: "devDependencies",
      name: "@forgeax/engine-devkit",
      ...typeof existingDevkit === "string" ? { from: existingDevkit } : {},
      to: devkitVersion
    });
  }
  return {
    ok: true,
    value: {
      root: facts.root,
      version: sdk?.sdkVersion ?? devkitVersion,
      ...sdk === void 0 ? {} : { pnpmVersion: sdk.requirements.pnpm },
      archiveBacked: sdk !== void 0,
      dependencyChanges,
      scriptChanges
    }
  };
}
async function applyInitPlan(facts, plan, options) {
  if (options.dryRun === true) return { ok: true, value: plan };
  const manifest = structuredClone(facts.packageJson);
  for (const change of plan.dependencyChanges) {
    const sectionValue = manifest[change.section];
    const section = sectionValue !== null && typeof sectionValue === "object" ? sectionValue : {};
    section[change.name] = change.to;
    manifest[change.section] = section;
  }
  const scriptsValue = manifest.scripts;
  const scripts = scriptsValue !== null && typeof scriptsValue === "object" ? scriptsValue : {};
  for (const change of plan.scriptChanges) scripts[change.name] = change.to;
  manifest.scripts = scripts;
  if (plan.archiveBacked) {
    if (plan.pnpmVersion === void 0) throw new Error("sdk-pnpm-version-missing");
    manifest.packageManager = `pnpm@${plan.pnpmVersion}`;
  }
  await writeFile(resolve(facts.root, "package.json"), `${JSON.stringify(manifest, null, 2)}
`);
  return { ok: true, value: plan };
}
async function readable(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
async function findSdkContext() {
  const configured = process.env.FORGEAX_SDK_ROOT;
  let cursor = resolve(configured ?? dirname(fileURLToPath(import.meta.url)));
  for (; ; ) {
    const manifestPath = resolve(cursor, "sdk-manifest.json");
    if (await readable(manifestPath)) {
      const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
      const templates = new Map(
        manifest.templates.map((template) => [template.id, resolve(cursor, template.root)])
      );
      const store = resolve(cursor, "store", "pnpm");
      return {
        root: cursor,
        manifest,
        ...await readable(store) ? { store } : {},
        templates
      };
    }
    const parent = dirname(cursor);
    if (parent === cursor) return void 0;
    cursor = parent;
  }
}
var SDK_INIT_PATH = [".forgeax", "sdk-init.json"];
var SDK_INIT_SCHEMA_VERSION = "2.0.0";
function agentOnboarding(sdk, projectRoot) {
  const root = projectRoot ?? sdk.root;
  return {
    read: [resolve(root, "AGENTS.md"), resolve(root, "skills", "forgeax-engine-sdk", "SKILL.md")],
    ...projectRoot === void 0 ? {
      templateSelection: {
        required: true,
        available: [...sdk.templates.keys()].sort()
      }
    } : {},
    ...projectRoot === void 0 ? {} : { next: { cwd: root, argv: ["pnpm", "exec", "forgeax", "help", "--tree", "--json"] } }
  };
}
function sdkInitPath(sdk) {
  return resolve(sdk.root, ...SDK_INIT_PATH);
}
function commandFailure(code, expected, hint, detail = {}) {
  return { ok: false, error: { code, expected, hint, detail } };
}
function sdkProjectInstallArgs(store) {
  const common = [
    "install",
    "--frozen-lockfile",
    "--ignore-scripts",
    "--config.pm-on-fail=ignore",
    "--side-effects-cache=true",
    "--child-concurrency=1"
  ];
  return store === void 0 ? common : [...common, "--offline", "--config.trust-lockfile=true", "--store-dir", store];
}
function sdkBootstrapInstallArgs(store) {
  const common = [
    "install",
    "--frozen-lockfile",
    "--config.pm-on-fail=ignore",
    "--child-concurrency=1",
    "--side-effects-cache=true"
  ];
  return store === void 0 ? common : [...common, "--offline", "--config.trust-lockfile=true", "--store-dir", store];
}
var MINIMUM_SUPPORTED_PNPM = "12.10.1";
function pnpmVersionAtLeast(version, minimum) {
  const parse2 = (value) => {
    const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(value);
    return match === null ? void 0 : [Number(match[1]), Number(match[2]), Number(match[3])];
  };
  const actual = parse2(version);
  const required = parse2(minimum);
  if (actual === void 0 || required === void 0) return false;
  const [actualMajor, actualMinor, actualPatch] = actual;
  const [requiredMajor, requiredMinor, requiredPatch] = required;
  if (actualMajor !== requiredMajor) return false;
  if (actualMinor !== requiredMinor) return actualMinor > requiredMinor;
  return actualPatch >= requiredPatch;
}
function sdkPnpmRequirement(minimum) {
  const major = Number(minimum.split(".")[0]);
  return `>=${minimum} <${major + 1}`;
}
async function currentPnpm() {
  try {
    const result = await execFileCommand("pnpm", ["--version"], { maxBuffer: 1024 * 1024 });
    const version = result.stdout.trim();
    if (version.length === 0) throw new Error("pnpm returned an empty version");
    return { ok: true, value: version };
  } catch (cause) {
    return commandFailure(
      "pnpm-unavailable",
      `pnpm ${sdkPnpmRequirement(MINIMUM_SUPPORTED_PNPM)} to be available on PATH`,
      "Install or activate pnpm 12.10.1 or newer in the pnpm 12 line, then rerun forgeax project init from the SDK root.",
      { reason: cause instanceof Error ? cause.message : String(cause) }
    );
  }
}
function matchesState(sdk, state, digest) {
  if (state === null || typeof state !== "object" || Array.isArray(state)) return false;
  const value = state;
  return value.schemaVersion === SDK_INIT_SCHEMA_VERSION && value.sdkVersion === sdk.manifest.sdkVersion && value.engineCommit === sdk.manifest.engineCommit && value.toolInputsDigest === digest && typeof value.pnpm === "string" && pnpmVersionAtLeast(value.pnpm, sdk.manifest.requirements.pnpm) && value.node === process.versions.node && value.platform === process.platform && value.arch === process.arch;
}
async function toolRuntimeReady(sdk) {
  const runtime = resolve(sdk.root, ".forgeax/cli-runtime");
  await access(resolve(runtime, "node_modules/@forgeax/engine/dist/bin/forgeax.mjs"));
  await access(resolve(runtime, "node_modules/@forgeax/view/host.pack.json"));
  await access(
    createRequire(resolve(runtime, "package.json")).resolve("@forgeax/view/host.pack.json")
  );
  for (const name of ["package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml"]) {
    if (!(await readFile(resolve(runtime, name))).equals(
      await readFile(resolve(sdk.root, "toolchain/cli-runtime", name))
    ))
      return false;
  }
  return true;
}
async function readSdkInitState(sdk) {
  try {
    const value = JSON.parse(await readFile(sdkInitPath(sdk), "utf8"));
    const digest = await toolInputsDigest(sdk);
    if (!matchesState(sdk, value, digest)) return void 0;
    if (!await toolRuntimeReady(sdk)) return void 0;
    return value;
  } catch {
    return void 0;
  }
}
async function requireSdkInitialization(sdk) {
  const state = await readSdkInitState(sdk);
  if (state === void 0) {
    return commandFailure(
      "sdk-not-initialized",
      "the downloaded SDK to be initialized for this Node/pnpm/platform tuple",
      "Run ./bin/forgeax project init from the SDK root once, then run forgeax project new outside the SDK.",
      {
        sdkRoot: sdk.root,
        sdkVersion: sdk.manifest.sdkVersion,
        pnpm: sdk.manifest.requirements.pnpm,
        node: process.versions.node,
        platform: process.platform,
        arch: process.arch
      }
    );
  }
  return { ok: true, value: state };
}
async function toolInputsDigest(sdk) {
  const hash = createHash("sha256");
  for (const name of ["package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml"])
    hash.update(await readFile(resolve(sdk.root, "toolchain/cli-runtime", name)));
  return hash.digest("hex");
}
async function copyBootstrapInputs(sdk, root) {
  const template = resolve(sdk.root, "toolchain/cli-runtime");
  for (const name of ["package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml"]) {
    await cp(resolve(template, name), resolve(root, name));
  }
  try {
    await cp(resolve(template, ".npmrc"), resolve(root, ".npmrc"));
  } catch (cause) {
    if (cause === null || typeof cause !== "object" || !("code" in cause) || cause.code !== "ENOENT") {
      throw cause;
    }
  }
}
async function sdkInitCommand(sdk, options = {}) {
  const pnpmResult = await currentPnpm();
  if (!pnpmResult.ok) return pnpmResult;
  if (!pnpmVersionAtLeast(pnpmResult.value, sdk.manifest.requirements.pnpm)) {
    return commandFailure(
      "pnpm-version-unsupported",
      `pnpm ${sdkPnpmRequirement(sdk.manifest.requirements.pnpm)}`,
      `Activate pnpm ${sdk.manifest.requirements.pnpm} or newer in the pnpm ${sdk.manifest.requirements.pnpm.split(".")[0]} line, then rerun forgeax project init.`,
      { actual: pnpmResult.value, expected: sdk.manifest.requirements.pnpm }
    );
  }
  let digest;
  try {
    digest = await toolInputsDigest(sdk);
  } catch (cause) {
    return commandFailure(
      "sdk-init-failed",
      "the SDK toolchain inputs to exist",
      "Download a complete SDK archive, then rerun project init.",
      { reason: String(cause), sdkRoot: sdk.root }
    );
  }
  const state = {
    schemaVersion: SDK_INIT_SCHEMA_VERSION,
    sdkVersion: sdk.manifest.sdkVersion,
    engineCommit: sdk.manifest.engineCommit,
    toolInputsDigest: digest,
    pnpm: pnpmResult.value,
    node: process.versions.node,
    platform: process.platform,
    arch: process.arch
  };
  const report = {
    ...state,
    root: sdk.root,
    store: sdk.store === void 0 ? "registry" : "offline",
    onboarding: agentOnboarding(sdk)
  };
  if (options.dryRun === true || options.install === false) return { ok: true, value: report };
  const staging = resolve(sdk.root, ".forgeax/cli-runtime");
  try {
    await mkdir(staging, { recursive: true });
    await copyBootstrapInputs(sdk, staging);
    await execFileCommand("pnpm", sdkBootstrapInstallArgs(sdk.store), {
      cwd: staging,
      env: { ...process.env, CI: "true" },
      maxBuffer: 16 * 1024 * 1024
    });
    if (!await toolRuntimeReady(sdk)) throw new Error("sdk-tool-runtime-incomplete");
    await mkdir(resolve(sdk.root, ".forgeax"), { recursive: true });
    await writeFile(sdkInitPath(sdk), `${JSON.stringify(state, null, 2)}
`);
    return { ok: true, value: report };
  } catch (cause) {
    return commandFailure(
      "sdk-init-failed",
      "the SDK dependency closure to install and build native packages successfully",
      "Inspect the pnpm output, repair Node/pnpm or platform permissions, then rerun forgeax project init from the SDK root.",
      { reason: cause instanceof Error ? cause.message : String(cause), sdkRoot: sdk.root }
    );
  }
}

// src/sdk-update.ts
var UPDATE_MIGRATION_RISK = "Install a newer SDK in a separate directory. Existing games remain pinned and are not migrated automatically; review release notes and migrate and test each game before changing its Engine version.";
function parseVersion(version) {
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(
    version
  );
  if (match === null) return void 0;
  const major = match[1];
  const minor = match[2];
  const patch = match[3];
  if (major === void 0 || minor === void 0 || patch === void 0) return void 0;
  const prerelease = match[4]?.split(".");
  if (prerelease?.some(
    (identifier) => identifier.length === 0 || /^\d+$/.test(identifier) && /^0\d+/.test(identifier)
  )) {
    return void 0;
  }
  return {
    core: [major, minor, patch],
    ...prerelease === void 0 ? {} : { prerelease }
  };
}
function compareNumericIdentifier(current, latest) {
  if (current.length !== latest.length) return latest.length > current.length ? 1 : -1;
  if (current === latest) return 0;
  return latest > current ? 1 : -1;
}
function comparePrerelease(current, latest) {
  const length = Math.max(current.length, latest.length);
  for (let index = 0; index < length; index += 1) {
    const currentIdentifier = current[index];
    const latestIdentifier = latest[index];
    if (currentIdentifier === void 0) return 1;
    if (latestIdentifier === void 0) return -1;
    if (currentIdentifier === latestIdentifier) continue;
    const currentNumeric = /^\d+$/.test(currentIdentifier);
    const latestNumeric = /^\d+$/.test(latestIdentifier);
    if (currentNumeric && latestNumeric) {
      return compareNumericIdentifier(currentIdentifier, latestIdentifier);
    }
    if (currentNumeric !== latestNumeric) return latestNumeric ? -1 : 1;
    return latestIdentifier > currentIdentifier ? 1 : -1;
  }
  return 0;
}
function newerSdkVersion(currentVersion, latestVersion) {
  const current = parseVersion(currentVersion);
  const latest = parseVersion(latestVersion);
  if (current === void 0 || latest === void 0) return false;
  for (let index = 0; index < current.core.length; index += 1) {
    const precedence = compareNumericIdentifier(
      current.core[index] ?? "0",
      latest.core[index] ?? "0"
    );
    if (precedence !== 0) return precedence > 0;
  }
  if (current.prerelease !== void 0 && latest.prerelease === void 0) return true;
  if (current.prerelease === void 0 || latest.prerelease === void 0) return false;
  return comparePrerelease(current.prerelease, latest.prerelease) > 0;
}
function offline() {
  return ["1", "true"].includes((process.env.npm_config_offline ?? "").toLowerCase());
}
async function checkSdkUpdate(currentVersion) {
  if (process.env.FORGEAX_DISABLE_UPDATE_CHECK === "1") {
    return { status: "skipped", currentVersion, reason: "disabled" };
  }
  if (offline()) return { status: "skipped", currentVersion, reason: "offline" };
  try {
    const registry = process.env.npm_config_registry ?? "https://registry.npmjs.org/";
    const response = await fetch(
      new URL("@forgeax%2Fengine-sdk", `${registry.replace(/\/$/, "")}/`),
      {
        headers: { accept: "application/vnd.npm.install-v1+json" },
        signal: AbortSignal.timeout(2e3)
      }
    );
    if (!response.ok) throw new Error(`registry-http-${response.status}`);
    const metadata = await response.json();
    const tag = currentVersion.includes("-dev.") ? "next" : "latest";
    const channelVersion = metadata["dist-tags"]?.[tag];
    if (typeof channelVersion !== "string") throw new Error(`registry-${tag}-version-missing`);
    const rcVersion = currentVersion.includes("-rc.") ? metadata["dist-tags"]?.rc : void 0;
    const latestVersion = typeof rcVersion === "string" && newerSdkVersion(channelVersion, rcVersion) ? rcVersion : channelVersion;
    return newerSdkVersion(currentVersion, latestVersion) ? {
      status: "available",
      currentVersion,
      latestVersion,
      migrationRisk: UPDATE_MIGRATION_RISK
    } : { status: "current", currentVersion, latestVersion };
  } catch (cause) {
    return {
      status: "unavailable",
      currentVersion,
      reason: cause instanceof Error ? cause.message : String(cause)
    };
  }
}

// src/templates/descriptor.ts
function validateTemplateDescriptor(value) {
  if (typeof value !== "object" || value === null) {
    return {
      ok: false,
      error: {
        code: "template-invalid",
        expected: "a template descriptor object",
        hint: "declare the template identity and purpose in template.json",
        detail: {}
      }
    };
  }
  const candidate = value;
  const identity = candidate.defaultIdentity;
  if (typeof candidate.id !== "string" || typeof candidate.purpose !== "string" || typeof identity !== "object" || identity === null || typeof identity.name !== "string" || typeof identity.packageName !== "string" || !Array.isArray(candidate.journeys)) {
    return {
      ok: false,
      error: {
        code: "template-invalid",
        expected: "id, purpose, defaultIdentity, and journeys",
        hint: "complete template.json before discovering the template",
        detail: { ...typeof candidate.id === "string" ? { id: candidate.id } : {} }
      }
    };
  }
  const defaultIdentity = identity;
  const invalidJourneys = candidate.journeys.length === 0 || candidate.journeys.some(
    (journey) => typeof journey !== "string" || journey.trim().length === 0
  );
  const invalidIdentity = candidate.id.trim().length === 0 || candidate.id.includes("/") || candidate.id.includes("\\") || candidate.purpose.trim().length === 0 || defaultIdentity.name.trim().length === 0 || defaultIdentity.packageName.trim().length === 0;
  if (invalidIdentity || invalidJourneys) {
    return {
      ok: false,
      error: {
        code: invalidJourneys ? "template-journey-missing" : "template-invalid",
        expected: invalidJourneys ? "at least one named verification journey" : "non-empty path-safe template identity and purpose",
        hint: invalidJourneys ? "add the exact validation journey to template.json" : "repair the template identity and purpose in template.json",
        detail: { id: candidate.id }
      }
    };
  }
  return {
    ok: true,
    value: {
      id: candidate.id,
      purpose: candidate.purpose,
      defaultIdentity,
      journeys: candidate.journeys
    }
  };
}

// src/templates/materialize.ts
function identityError(field, received) {
  const expected = field === "name" ? "the project name to be a non-empty string without surrounding whitespace" : field === "packageName" ? "the package name to be a valid lowercase npm package name" : "the project id to be a lowercase path-safe identifier";
  return {
    code: "project-identity-invalid",
    expected,
    hint: field === "target" ? "Rename the target directory to a lowercase identifier or pass an explicit --id." : field === "packageName" ? "Pass --package-name with a lowercase npm package name, for example @local/my-game." : field === "name" ? "Pass --name with a non-empty display name." : "Pass --id with a lowercase identifier such as my-game.",
    detail: { field, ...received === void 0 ? {} : { received } }
  };
}
function isProjectId(value) {
  return /^[a-z0-9][a-z0-9._-]*$/.test(value);
}
function isPackageSegment(value) {
  return /^[a-z0-9][a-z0-9._-]*$/.test(value);
}
function isPackageName(value) {
  if (value.startsWith("@")) {
    const parts = value.split("/");
    const scope = parts[0];
    const name = parts[1];
    return parts.length === 2 && scope !== void 0 && name !== void 0 && isPackageSegment(scope.slice(1)) && isPackageSegment(name);
  }
  return !value.includes("/") && isPackageSegment(value);
}
function packageNameFor(id, templateDefault) {
  const slash2 = templateDefault.startsWith("@") ? templateDefault.indexOf("/") : -1;
  const scope = slash2 > 1 ? templateDefault.slice(0, slash2) : "";
  return scope.length > 0 ? `${scope}/${id}` : id;
}
function resolveProjectIdentity(input) {
  const overrides = input.overrides ?? {};
  const targetBasename = input.targetBasename;
  if (overrides.id === void 0 && !isProjectId(targetBasename)) {
    return err(identityError("target", targetBasename));
  }
  const templateDefault = input.descriptor.defaultIdentity;
  if (templateDefault.name.trim().length === 0 || templateDefault.name !== templateDefault.name.trim() || !isPackageName(templateDefault.packageName)) {
    return err(identityError("templateDefault", templateDefault.packageName));
  }
  const id = overrides.id ?? targetBasename;
  if (!isProjectId(id)) return err(identityError("id", id));
  const name = overrides.name ?? id;
  if (name.trim().length === 0 || name !== name.trim()) {
    return err(identityError("name", name));
  }
  const packageName = overrides.packageName ?? packageNameFor(id, templateDefault.packageName);
  if (!isPackageName(packageName)) {
    return err(identityError("packageName", packageName));
  }
  return ok({ id, name, packageName });
}
async function readTemplateDescriptor(templateRoot) {
  try {
    const parsed = JSON.parse(
      await readFile(resolve(templateRoot, "template.json"), "utf8")
    );
    return validateTemplateDescriptor(parsed);
  } catch {
    return {
      ok: false,
      error: {
        code: "template-invalid",
        expected: "template.json to contain valid JSON and a complete descriptor",
        hint: "Repair the selected template descriptor before creating a project.",
        detail: {}
      }
    };
  }
}
function materializeError(stage, reason) {
  return Object.assign(new Error("template materialization failed"), {
    code: "template-materialize-failed",
    expected: "project identity to be written in the staging directory before commit",
    hint: "repair the template manifests and retry project creation; the target was not committed",
    detail: { stage, reason: reason instanceof Error ? reason.message : String(reason) }
  });
}
async function writeProjectIdentity(root, identity) {
  const manifestPath = resolve(root, "forge.json");
  const packagePath = resolve(root, "package.json");
  let manifest;
  let packageJson;
  try {
    [manifest, packageJson] = await Promise.all([
      JSON.parse(await readFile(manifestPath, "utf8")),
      JSON.parse(await readFile(packagePath, "utf8"))
    ]);
  } catch (cause) {
    throw materializeError("read-manifests", cause);
  }
  if (manifest === null || typeof manifest !== "object" || Array.isArray(manifest) || packageJson === null || typeof packageJson !== "object" || Array.isArray(packageJson)) {
    throw materializeError(
      "validate-manifests",
      "forge.json and package.json must contain objects"
    );
  }
  const nextManifest = manifest;
  const nextPackage = packageJson;
  nextManifest.id = identity.id;
  nextManifest.name = identity.name;
  delete nextManifest.identity;
  nextPackage.name = identity.packageName;
  try {
    await Promise.all([
      writeFile(manifestPath, `${JSON.stringify(nextManifest, null, 2)}
`),
      writeFile(packagePath, `${JSON.stringify(nextPackage, null, 2)}
`)
    ]);
  } catch (cause) {
    throw materializeError("write-manifests", cause);
  }
}

// src/bootstrap-commands.ts
function isMissingPathError(cause) {
  return cause !== null && typeof cause === "object" && "code" in cause && cause.code === "ENOENT";
}
async function canonicalProspectivePath(path) {
  let cursor = resolve(path);
  const suffix = [];
  for (; ; ) {
    try {
      return resolve(await realpath(cursor), ...suffix.reverse());
    } catch (cause) {
      if (!isMissingPathError(cause)) throw cause;
      const parent = dirname(cursor);
      if (parent === cursor) throw cause;
      suffix.push(basename(cursor));
      cursor = parent;
    }
  }
}
async function configureSdkStore(root, store) {
  if (store === void 0) return;
  const path = resolve(root, "pnpm-workspace.yaml");
  const settings = parseDocument(await readFile(path, "utf8"));
  if (settings.errors.length > 0) throw settings.errors[0];
  settings.set("storeDir", store);
  await writeFile(path, settings.toString());
}
function nodeSupported() {
  const [major = 0, minor = 0] = process.versions.node.split(".").map(Number);
  return major > 22 || major === 22 && minor >= 13;
}
async function readPnpmVersion(root, packageJson) {
  const packageManager = packageJson.packageManager;
  if (typeof packageManager === "string" && packageManager.startsWith("pnpm@")) {
    try {
      return (await execFileCommand("corepack", ["pnpm", "--version"], { cwd: root })).stdout.trim();
    } catch {
    }
  }
  return (await execFileCommand("pnpm", ["--version"], { cwd: root })).stdout.trim();
}
async function doctorCommand(options = {}) {
  const facts = await readProjectFacts(options.root);
  if (!facts.ok) return facts;
  let pnpm;
  try {
    pnpm = await readPnpmVersion(facts.value.root, facts.value.packageJson);
  } catch (cause) {
    return {
      ok: false,
      error: {
        code: "pnpm-unavailable",
        expected: "pnpm to be available on PATH",
        hint: "Install the SDK-supported pnpm version and retry.",
        detail: { reason: cause instanceof Error ? cause.message : String(cause) }
      }
    };
  }
  if (!nodeSupported()) {
    return {
      ok: false,
      error: {
        code: "node-version-unsupported",
        expected: "Node.js >=22.13.0",
        hint: "Select a supported Node.js installation and retry.",
        detail: { actual: process.versions.node }
      }
    };
  }
  if (!pnpmVersionAtLeast(pnpm, MINIMUM_SUPPORTED_PNPM)) {
    return {
      ok: false,
      error: {
        code: "pnpm-version-unsupported",
        expected: "pnpm >=12.10.1 <13",
        hint: "Enable the packageManager-declared pnpm version with Corepack and retry.",
        detail: { actual: pnpm }
      }
    };
  }
  const workspaceDependencies = /* @__PURE__ */ new Set();
  for (const section of [
    "dependencies",
    "devDependencies",
    "optionalDependencies",
    "peerDependencies"
  ]) {
    const value = facts.value.packageJson[section];
    if (value === null || typeof value !== "object") continue;
    for (const [name, version] of Object.entries(value)) {
      if (typeof version === "string" && (version.startsWith("workspace:") || version.startsWith("file:"))) {
        workspaceDependencies.add(name);
      }
    }
  }
  const localDependencies = [...workspaceDependencies].sort();
  const binding = await readEngineBinding(facts.value.root);
  if (!binding.ok) return binding;
  let engineDigest;
  if (binding.value !== null) {
    const engine = await engineDoctorCommand({ root: facts.value.root });
    if (!engine.ok) return engine;
    if (engine.value.mode !== "local" || engine.value.binding === null || resolve(engine.value.binding.path) !== resolve(binding.value.path) || engine.value.workspace === null)
      return {
        ok: false,
        error: {
          code: "project-engine-binding-changed",
          expected: "the same healthy local Engine binding to remain selected during doctor",
          hint: "Recheck the project Engine binding and retry doctor.",
          detail: { binding: binding.value.path, mode: engine.value.mode }
        }
      };
    engineDigest = engine.value.workspace.digest;
  }
  if (binding.value !== null || localDependencies.length > 0) {
    try {
      await inspectRunDependencyClosure(facts.value.root, binding.value, engineDigest, pnpm);
    } catch (cause) {
      return { ok: false, error: commandError(cause, "project-dependency-closure-invalid") };
    }
  }
  return {
    ok: true,
    value: {
      root: facts.value.root,
      projectId: facts.value.id,
      node: process.versions.node,
      pnpm,
      workspaceDependencies: localDependencies,
      uiAuthoringProfile: UI_AUTHORING_PROFILE
    }
  };
}
async function initCommand(options = {}) {
  try {
    const sdk = await findSdkContext();
    const root = await canonicalProspectivePath(options.root ?? process.cwd());
    if (sdk !== void 0 && root === await canonicalProspectivePath(sdk.root)) {
      return sdkInitCommand(sdk, options);
    }
    const facts = await readProjectFacts(root);
    if (!facts.ok) return facts;
    const plan = createInitPlan(facts.value, sdk?.manifest);
    if (!plan.ok) return plan;
    if (sdk !== void 0 && options.dryRun !== true) {
      const initialized = await requireSdkInitialization(sdk);
      if (!initialized.ok) return initialized;
    }
    const applied = await applyInitPlan(facts.value, plan.value, options);
    if (!applied.ok || options.dryRun === true) return applied;
    if (sdk !== void 0) {
      const template = sdk.templates.get("empty");
      if (template === void 0) throw new Error("sdk-bootstrap-template-missing");
      await copyFile(
        resolve(template, "pnpm-lock.yaml"),
        resolve(facts.value.root, "pnpm-lock.yaml")
      );
      await copyFile(
        resolve(template, "pnpm-workspace.yaml"),
        resolve(facts.value.root, "pnpm-workspace.yaml")
      );
      try {
        await readFile(resolve(facts.value.root, ".npmrc"), "utf8");
      } catch (cause) {
        if (!isMissingPathError(cause)) throw cause;
        try {
          await copyFile(resolve(template, ".npmrc"), resolve(facts.value.root, ".npmrc"));
        } catch (templateCause) {
          if (!isMissingPathError(templateCause)) throw templateCause;
        }
      }
      await copySdkSkills(sdk, facts.value.root);
      await installProjectSkills(facts.value.root, sdk.manifest);
      await configureSdkStore(
        facts.value.root,
        sdk.store === void 0 ? void 0 : await canonicalProspectivePath(sdk.store)
      );
    }
    if (options.install === false) return applied;
    const store = sdk === void 0 || sdk.store === void 0 ? void 0 : await canonicalProspectivePath(sdk.store);
    const installArgs = sdk === void 0 ? ["install", "--frozen-lockfile=false"] : sdkProjectInstallArgs(store);
    await execFileCommand("pnpm", installArgs, {
      cwd: facts.value.root,
      env: { ...process.env, CI: "true" },
      maxBuffer: 16 * 1024 * 1024
    });
    return applied;
  } catch (cause) {
    return { ok: false, error: commandError(cause, "project-init-failed") };
  }
}
async function newCommand(options = {}) {
  try {
    const sdk = await findSdkContext();
    if (sdk === void 0) {
      return {
        ok: false,
        error: {
          code: "sdk-context-missing",
          expected: "forgeax project new to run from an unpacked ForgeaX SDK",
          hint: `Install the matching SDK outside the game: forgeax sdk install --root <sdk-root>; then run node <sdk-root>/bin/forgeax.mjs project init --root <sdk-root> and node <sdk-root>/bin/forgeax.mjs project new <game-root> --template ${options.template ?? "empty"}. For an existing SDK, run its bin/forgeax.mjs entry or set FORGEAX_SDK_ROOT to its root.`,
          detail: {}
        }
      };
    }
    const root = resolve(options.root ?? process.cwd());
    if (isFilesystemPathWithin(
      await canonicalProspectivePath(sdk.root),
      await canonicalProspectivePath(root)
    )) {
      return {
        ok: false,
        error: {
          code: "project-target-inside-sdk",
          expected: "forgeax project new target to be outside the unpacked SDK root",
          hint: "Choose a sibling directory or an absolute path outside the SDK.",
          detail: { root, sdkRoot: sdk.root }
        }
      };
    }
    if (options.template === void 0) {
      const available = [...sdk.templates.keys()].sort();
      return {
        ok: false,
        error: {
          code: "sdk-template-required",
          expected: "forgeax project new to select exactly one template with --template",
          hint: `Choose one of: ${available.join(", ")}.`,
          detail: { templates: available }
        }
      };
    }
    const templateId = options.template;
    const template = sdk.templates.get(templateId);
    if (template === void 0) {
      return {
        ok: false,
        error: {
          code: "sdk-template-not-found",
          expected: "a template id declared by sdk-manifest.json",
          hint: `Choose one of: ${[...sdk.templates.keys()].sort().join(", ")}.`,
          detail: { template: templateId }
        }
      };
    }
    const descriptor = await readTemplateDescriptor(template);
    if (!descriptor.ok) return descriptor;
    if (descriptor.value.id !== templateId) {
      return {
        ok: false,
        error: {
          code: "template-invalid",
          expected: `template.json#id to match the selected template ${templateId}`,
          hint: "Repair the descriptor identity or refresh the SDK before creating a project.",
          detail: { id: descriptor.value.id }
        }
      };
    }
    let targetExists = true;
    let entries;
    try {
      entries = await readdir(root);
    } catch (cause) {
      if (!isMissingPathError(cause)) throw cause;
      targetExists = false;
      entries = [];
    }
    if (entries.length > 0) {
      return {
        ok: false,
        error: {
          code: "project-target-not-empty",
          expected: "forgeax project new target to be absent or empty",
          hint: "Choose an empty directory so existing files cannot be overwritten.",
          detail: { root }
        }
      };
    }
    const identity = resolveProjectIdentity({
      targetBasename: basename(root),
      descriptor: descriptor.value,
      overrides: {
        ...options.id === void 0 ? {} : { id: options.id },
        ...options.name === void 0 ? {} : { name: options.name },
        ...options.packageName === void 0 ? {} : { packageName: options.packageName }
      }
    });
    if (!identity.ok) return identity;
    if (options.dryRun === true) {
      return {
        ok: true,
        value: {
          root,
          template: templateId,
          identity: identity.value,
          sdkVersion: sdk.manifest.sdkVersion
        }
      };
    }
    const initialized = await requireSdkInitialization(sdk);
    if (!initialized.ok) return initialized;
    const parent = dirname(root);
    await mkdir(parent, { recursive: true });
    let staging = await mkdtemp(
      resolve(parent, `.${basename(root)}.forgeax-staging-`)
    );
    const committedNames = [];
    let committed = false;
    try {
      for (const name of await readdir(template)) {
        await cp(resolve(template, name), resolve(staging, name), {
          recursive: true,
          errorOnExist: true,
          force: false
        });
      }
      await writeProjectIdentity(staging, identity.value);
      await copySdkSkills(sdk, staging);
      const store = sdk.store === void 0 ? void 0 : await canonicalProspectivePath(sdk.store);
      await configureSdkStore(staging, store);
      if (!targetExists) {
        await rename(staging, root);
        staging = void 0;
        committedNames.push(...await readdir(root));
      } else {
        for (const name of await readdir(staging)) {
          await rename(resolve(staging, name), resolve(root, name));
          committedNames.push(name);
        }
        await rm(staging, { recursive: true, force: true });
        staging = void 0;
      }
      committed = true;
      await installProjectSkills(root, sdk.manifest);
      await execFileCommand("pnpm", sdkProjectInstallArgs(store), {
        cwd: root,
        env: { ...process.env, CI: "true" },
        maxBuffer: 16 * 1024 * 1024
      });
      const sdkUpdate = await checkSdkUpdate(sdk.manifest.sdkVersion);
      return {
        ok: true,
        value: {
          root,
          template: templateId,
          identity: identity.value,
          sdkVersion: sdk.manifest.sdkVersion,
          onboarding: agentOnboarding(sdk, root),
          sdkUpdate
        }
      };
    } catch (cause) {
      if (staging !== void 0) await rm(staging, { recursive: true, force: true });
      if (committed) {
        if (!targetExists) {
          await rm(root, { recursive: true, force: true });
          return { ok: false, error: commandError(cause, "project-create-failed") };
        }
        const cleanupNames = /* @__PURE__ */ new Set([
          ...committedNames,
          ...PROJECT_SKILL_MOUNT_ROOTS.map((mountRoot) => mountRoot.split("/")[0] ?? mountRoot),
          "node_modules"
        ]);
        await Promise.all(
          [...cleanupNames].map(
            (name) => rm(resolve(root, name), { recursive: true, force: true })
          )
        );
      } else {
        await Promise.all(
          committedNames.map((name) => rm(resolve(root, name), { recursive: true, force: true }))
        );
      }
      return { ok: false, error: commandError(cause, "project-create-failed") };
    }
  } catch (cause) {
    return { ok: false, error: commandError(cause, "project-create-failed") };
  }
}
async function buildProjectOwnershipGraph(facts) {
  const ownership = [];
  const diagnostics = [];
  try {
    const inventory = await discoverPluginAssets(facts);
    for (const realm of ["host", "engine", "build", "frontend"]) {
      for (const record of pluginAssetClosure(inventory, facts.roots[realm])) {
        const ownerPath = `forge.json#roots.${realm} > ${record.definition.guid}`;
        ownership.push({ module: record.module, ownerPath, realm, source: "plugin-asset" });
        if (isAbsolute(record.module)) {
          try {
            await access(record.module);
          } catch {
            diagnostics.push({
              ruleId: "project-ownership-orphan",
              ownerPath,
              expected: "the declared runtime module to exist",
              hint: "repair the plugin asset module reference",
              detail: { module: record.module }
            });
          }
        }
      }
    }
  } catch (cause) {
    diagnostics.push({
      ruleId: "project-schema-invalid",
      ownerPath: "forge.json#roots",
      expected: "discoverable plugin definitions for project roots",
      hint: "inspect the owning Pack and its source-only bootstrap inputs",
      detail: { cause }
    });
  }
  return { ownership, diagnostics };
}

// src/project/lint.ts
function readerDiagnostic(error) {
  const legacyIssue = Array.isArray(error.detail.issues) ? error.detail.issues.find(
    (issue) => issue !== null && typeof issue === "object" && "code" in issue && "keys" in issue
  ) : void 0;
  const legacyField = legacyIssue?.code === "unrecognized_keys" && Array.isArray(legacyIssue.keys) ? legacyIssue.keys.find(
    (key) => typeof key === "string" && [
      "plugins",
      "defaultScene",
      "entry",
      "executionEntry",
      "physics",
      "pointerLock",
      "input",
      "preview",
      "npc"
    ].includes(key)
  ) : void 0;
  if (legacyField !== void 0) {
    return {
      ruleId: "project-legacy-field",
      ownerPath: `forge.json#${legacyField}`,
      expected: error.expected,
      hint: error.hint,
      detail: { field: legacyField, source: "forge.json" }
    };
  }
  if (error.code === "project-manifest-invalid") {
    return {
      ruleId: "project-schema-invalid",
      ownerPath: "forge.json",
      expected: error.expected,
      hint: error.hint,
      detail: {
        code: error.code,
        ...Array.isArray(error.detail.issues) ? { issues: error.detail.issues } : {}
      }
    };
  }
  const readerReason = typeof error.detail.reason === "string" ? error.detail.reason : void 0;
  const readerOwner = readerReason?.includes("package.json") ? "package.json" : "forge.json";
  return {
    ruleId: "project-reader-error",
    ownerPath: readerOwner,
    expected: error.expected,
    hint: error.hint,
    detail: {
      code: error.code,
      ...typeof error.detail.root === "string" ? { root: error.detail.root } : {},
      ...readerReason === void 0 ? {} : { reason: readerReason }
    }
  };
}
function packageDiagnostics(packageJson) {
  const forgeax = packageJson.forgeax;
  if (forgeax === null || typeof forgeax !== "object" || Array.isArray(forgeax)) return [];
  const assets = Reflect.get(forgeax, "assets");
  if (assets === void 0) return [];
  return [
    {
      ruleId: "project-legacy-field",
      ownerPath: "package.json#forgeax.assets",
      expected: "package.json to omit the legacy forgeax.assets project authority",
      hint: "move project content under assets/ and let the manifest Entry/Plugin graph own it.",
      detail: { field: "forgeax.assets" }
    }
  ];
}
async function projectLintCommand(options = {}) {
  const root = options.root ?? process.cwd();
  const facts = await readProjectFacts(root);
  if (!facts.ok) {
    const diagnostic = readerDiagnostic(facts.error);
    return {
      ok: false,
      error: {
        code: "project-lint-failed",
        expected: "the project to satisfy the strict project and ownership contracts",
        hint: "Repair the owning manifest or Plugin path before activation; lint executes no project module.",
        detail: { root, diagnostics: [diagnostic] }
      }
    };
  }
  const graph = await buildProjectOwnershipGraph(facts.value);
  const diagnostics = [...packageDiagnostics(facts.value.packageJson), ...graph.diagnostics];
  if (diagnostics.length > 0) {
    return {
      ok: false,
      error: {
        code: "project-lint-failed",
        expected: "the project to have one explicit ownership path per executable capability",
        hint: "Repair the reported owning Plugin path, realm, provider, or legacy field and rerun forgeax project lint.",
        detail: { root: facts.value.root, diagnostics }
      }
    };
  }
  return { ok: true, value: { root: facts.value.root, ...graph, diagnostics } };
}
async function shaderCheckCommand(options = {}) {
  const facts = await readProjectFacts(options.root);
  if (!facts.ok) return facts;
  const target = options.path === void 0 ? void 0 : resolve(facts.value.root, options.path);
  if (target !== void 0) {
    try {
      await readFile(target);
    } catch (cause) {
      return { ok: false, error: commandError(cause, "shader-source-unreadable") };
    }
  }
  const temporary = await mkdtemp(resolve(tmpdir(), "forgeax-shader-check-"));
  const previous = process.cwd();
  try {
    process.chdir(facts.value.root);
    const config = await createViteConfig(facts.value, "build");
    const input = config.build?.rollupOptions?.input;
    await build({
      ...config,
      build: {
        ...config.build,
        outDir: temporary,
        emptyOutDir: true,
        write: true,
        ...target === void 0 || typeof input !== "object" || Array.isArray(input) ? {} : {
          rollupOptions: {
            ...config.build?.rollupOptions,
            input: { ...input, "shader-check": target }
          }
        }
      }
    });
    return { ok: true, value: { root: facts.value.root, path: target ?? null } };
  } catch (cause) {
    return { ok: false, error: commandError(cause, "shader-check-failed") };
  } finally {
    process.chdir(previous);
    await rm(temporary, { recursive: true, force: true });
  }
}

// src/commands.ts
function runRhiDebugCommand(name, input, context) {
  return runRhiDebugOperation(name, input, context);
}
async function buildCommand(options = {}, initialSources) {
  return buildProject(options, initialSources);
}
function releaseSlug(name) {
  const slug = name.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug.length > 0 ? slug : "forgeax-game";
}
async function packageCommand(options = {}) {
  const facts = await readProjectFacts(options.root);
  if (!facts.ok) return facts;
  const format = options.format ?? "web-zip";
  if (format !== "web-zip" && format !== "single-html") return packageFormatError(String(format));
  const defaultOutput = format === "single-html" ? `release/${releaseSlug(facts.value.name)}-offline.html` : `release/${releaseSlug(facts.value.name)}-web.zip`;
  const output = resolve(facts.value.root, options.output ?? defaultOutput);
  const expectedSuffix = format === "single-html" ? ".html" : ".zip";
  if (!output.toLowerCase().endsWith(expectedSuffix)) {
    return packageOutputError(output, format);
  }
  const distRoot = resolve(facts.value.root, "dist");
  if (isFilesystemPathWithin(distRoot, output)) {
    return {
      ok: false,
      error: {
        code: "release-output-inside-dist",
        expected: "the release artifact to live outside the derived dist directory",
        hint: "Use --output release/<game>-web.zip or release/<game>-offline.html.",
        detail: { output, distRoot, format }
      }
    };
  }
  const packageDocuments = format === "web-zip" ? await readGamePackageDocuments(facts.value.root) : void 0;
  if (packageDocuments !== void 0 && !packageDocuments.ok) return packageDocuments;
  const built = await buildCommand({
    root: facts.value.root,
    base: "./",
    ...options.json === void 0 ? {} : { json: options.json }
  });
  if (!built.ok) return built;
  const verified = await verifyDist(distRoot);
  if (!verified.ok) return verified;
  const archive = output;
  const temporaryArchive = `${archive}.partial-${process.pid}`;
  const checksumPath = `${archive}.sha256`;
  const temporaryChecksum = `${checksumPath}.partial-${process.pid}`;
  let playerRoot;
  try {
    const player = await preparePlayerDist(distRoot, verified.value);
    playerRoot = player.root;
    if (format === "single-html") {
      const indexHtml = await readFile(resolve(player.root, "index.html"), "utf8");
      const bundle = await bundleSingleHtmlEntry(player.root, indexHtml, facts.value.root);
      if (!bundle.ok) return bundle;
      return await writeSingleHtml({
        distRoot: player.root,
        output,
        manifest: player.manifest,
        bundle: bundle.value
      });
    }
    const paths = [
      ...player.manifest.artifacts.map((artifact) => artifact.path),
      "forgeax-dist.json"
    ];
    const entries = await Promise.all(
      paths.map(async (path) => ({ path, bytes: await readFile(resolve(player.root, path)) }))
    );
    const bytes = createZip([
      ...entries,
      ...packageDocuments?.ok === true ? packageDocuments.value : []
    ]);
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const manifestBytes = await readFile(resolve(player.root, "forgeax-dist.json"));
    await mkdir(dirname(archive), { recursive: true });
    await writeFile(temporaryArchive, bytes);
    await writeFile(temporaryChecksum, `${sha256}  ${basename(archive)}
`);
    await rename(temporaryChecksum, checksumPath);
    await rename(temporaryArchive, archive);
    return {
      ok: true,
      value: {
        schemaVersion: "1.0.0",
        format: "forgeax-web-game",
        target: "web",
        project: verified.value.project,
        base: verified.value.base,
        engine: {
          delivery: "bundled-runtime",
          wasm: verified.value.artifacts.some((artifact) => artifact.path.endsWith(".wasm"))
        },
        archive: { path: archive, bytes: bytes.byteLength, sha256 },
        files: player.manifest.artifacts.length,
        bundles: player.bundles,
        documents: [...GAME_PACKAGE_DOCUMENT_PATHS],
        checksumPath,
        distManifestSha256: createHash("sha256").update(manifestBytes).digest("hex"),
        run: {
          local: "forgeax project preview",
          shared: "upload the ZIP to an HTTPS static or HTML-game host and share its URL"
        }
      }
    };
  } catch (cause) {
    return { ok: false, error: commandError(cause, "game-package-failed") };
  } finally {
    await Promise.all([
      rm(temporaryArchive, { force: true }),
      rm(temporaryChecksum, { force: true }),
      ...playerRoot === void 0 ? [] : [rm(playerRoot, { recursive: true, force: true })]
    ]);
  }
}
async function devCommand(options = {}) {
  return startDevProjectWithHost(options);
}
async function previewCommand(options = {}) {
  return startPreviewProjectWithHost(options);
}
async function testCommand(options = {}) {
  const facts = await readProjectFacts(options.root);
  if (!facts.ok) return facts;
  try {
    const context = await startVitest(
      "test",
      [],
      {
        root: facts.value.root,
        run: true,
        watch: false,
        passWithNoTests: false,
        cliExclude: (await installedProjectSkillDirectories(facts.value.root)).map(
          (directory) => `${directory}/**`
        ),
        // The minimal reporter hides successful test logs; project diagnostics
        // remain observable on stderr even when the CLI result is JSON.
        reporters: ["default"]
      },
      void 0,
      { stdout: process.stderr, stderr: process.stderr }
    );
    if (context === void 0) {
      return {
        ok: false,
        error: {
          code: "test-runner-unavailable",
          expected: "Vitest to create a project test context",
          hint: "Inspect the project test configuration.",
          detail: { root: facts.value.root }
        }
      };
    }
    const failed = context.state.getFiles().filter((file) => file.result?.state === "fail");
    await context.close();
    if (failed.length > 0) {
      return {
        ok: false,
        error: {
          code: "project-tests-failed",
          expected: "all project tests to pass",
          hint: "Repair the failing game test before building a release.",
          detail: { files: failed.map((file) => file.filepath) }
        }
      };
    }
    return { ok: true, value: { root: facts.value.root } };
  } catch (cause) {
    return { ok: false, error: commandError(cause, "project-tests-failed") };
  }
}

export { buildCommand, devCommand, doctorCommand, initCommand, newCommand, packageCommand, previewCommand, projectLintCommand, runRhiDebugCommand, shaderCheckCommand, skillInstallCommand, skillVerifyCommand, testCommand };
//# sourceMappingURL=commands-DABHGFZM.mjs.map
//# sourceMappingURL=commands-DABHGFZM.mjs.map