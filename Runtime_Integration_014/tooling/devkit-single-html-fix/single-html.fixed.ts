import {gzipSync as _singleHtmlGzip} from 'node:zlib';
import {createHash as _singleHtmlDigest} from 'node:crypto';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { type DefaultTreeAdapterTypes, parse } from 'parse5';
import ts from 'typescript';
import { type Plugin, parseAst, Visitor, build as viteBuild } from 'vite';
import { type DistArtifact, type DistManifest, mediaType } from './dist.js';
import { createEngineWorkspaceResolverForProject } from './host.js';
import type { CommandError, CommandResult } from './types.js';

const SINGLE_HTML_FORMAT = 'forgeax-single-html-game' as const;
const GENERATED_PREFIX = '__forgeax-bundle/';

export interface SingleHtmlBundleArtifact {
  readonly path: string;
  readonly bytes: Uint8Array;
  readonly mediaType: string;
}

export interface SingleHtmlBundle {
  readonly entrySource: string;
  readonly artifacts: readonly SingleHtmlBundleArtifact[];
}

export interface SingleHtmlPackageOptions {
  readonly distRoot: string;
  readonly output: string;
  readonly manifest: DistManifest;
  readonly bundle: SingleHtmlBundle;
}

export interface SingleHtmlPackageResult {
  readonly schemaVersion: '1.0.0';
  readonly format: typeof SINGLE_HTML_FORMAT;
  readonly target: 'file';
  readonly project: DistManifest['project'];
  readonly base: DistManifest['base'];
  readonly html: { readonly path: string; readonly bytes: number; readonly sha256: string };
  readonly checksumPath: string;
  readonly distManifestSha256: string;
  readonly embeddedAssets: number;
  readonly run: {
    readonly local: string;
    readonly shared: string;
  };
}

class SingleHtmlError extends Error implements CommandError {
  constructor(
    readonly code: string,
    readonly expected: string,
    readonly hint: string,
    readonly detail: Readonly<Record<string, unknown>>,
  ) {
    super(`${code}: ${hint}`);
    this.name = 'SingleHtmlError';
  }
}

function errorResult(
  code: string,
  expected: string,
  hint: string,
  detail: Readonly<Record<string, unknown>> = {},
): CommandResult<never> {
  return { ok: false, error: new SingleHtmlError(code, expected, hint, detail) };
}

function toErrorResult(
  cause: unknown,
  code: string,
  expected: string,
  hint: string,
): CommandResult<never> {
  if (cause instanceof SingleHtmlError) return { ok: false, error: cause };
  return errorResult(code, expected, hint, {
    reason: cause instanceof Error ? cause.message : String(cause),
  });
}

function normalizePath(value: string): string | undefined {
  let decoded: string;
  try {
    decoded = decodeURIComponent(value.split(/[?#]/, 1)[0] ?? value);
  } catch {
    return undefined;
  }
  const normalized = decoded.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '');
  const segments = normalized.split('/');
  if (
    normalized.length === 0 ||
    segments.some((segment) => segment.length === 0 || segment === '.' || segment === '..')
  ) {
    return undefined;
  }
  return normalized;
}

function safeScriptText(value: string): string {
  return value.replace(/<\/script/gi, '<\\/script');
}

function hashBytes(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function contentTypeForDataUri(value: string): string {
  const semicolon = value.indexOf(';');
  return semicolon < 0 ? value : value.slice(0, semicolon);
}

function dataUri(bytes: Uint8Array, type: string): string {
  return `data:${contentTypeForDataUri(type)};base64,${Buffer.from(bytes).toString('base64')}`;
}

interface HtmlElement {
  readonly name: string;
  readonly start: number;
  readonly openEnd: number;
  readonly end: number;
  readonly contentStart?: number;
  readonly contentEnd?: number;
  readonly attributes: readonly { readonly name: string; readonly value: string }[];
  readonly attributeLocations: Readonly<
    Record<string, { readonly startOffset: number; readonly endOffset: number }>
  >;
}

interface Replacement {
  readonly start: number;
  readonly end: number;
  readonly value: string;
}

type ParsedElement = DefaultTreeAdapterTypes.Element;
type ParsedNode = DefaultTreeAdapterTypes.Node;

function attributeValueRange(
  source: string,
  location: { readonly startOffset: number; readonly endOffset: number },
): { readonly startOffset: number; readonly endOffset: number } | undefined {
  const raw = source.slice(location.startOffset, location.endOffset);
  const equals = raw.indexOf('=');
  if (equals < 0) return undefined;
  let cursor = equals + 1;
  while (/\s/.test(raw[cursor] ?? '')) cursor += 1;
  const quote = raw[cursor] === '"' || raw[cursor] === "'" ? raw[cursor] : undefined;
  if (quote !== undefined) {
    const start = cursor + 1;
    const end = raw.lastIndexOf(quote);
    return end <= start
      ? undefined
      : { startOffset: location.startOffset + start, endOffset: location.startOffset + end };
  }
  return {
    startOffset: location.startOffset + cursor,
    endOffset: location.endOffset,
  };
}

function scanHtmlElements(source: string): readonly HtmlElement[] {
  const document = parse(source, { sourceCodeLocationInfo: true });
  const elements: HtmlElement[] = [];
  const visit = (node: ParsedNode): void => {
    if (node.nodeName === '#document' || node.nodeName === '#document-fragment') {
      for (const child of node.childNodes) visit(child);
      return;
    }
    if (
      node.nodeName === '#text' ||
      node.nodeName === '#comment' ||
      node.nodeName === '#documentType'
    ) {
      return;
    }
    const element = node as ParsedElement;
    const location = element.sourceCodeLocation;
    if (location?.startTag === undefined) {
      for (const child of element.childNodes) visit(child);
      return;
    }
    const name = element.tagName.toLowerCase();
    const attributes = element.attrs.map(({ name: attributeName, value }) => ({
      name: attributeName.toLowerCase(),
      value,
    }));
    const attributeLocations: Record<
      string,
      { readonly startOffset: number; readonly endOffset: number }
    > = {};
    for (const attribute of attributes) {
      const attributeLocation = location.attrs?.[attribute.name];
      if (attributeLocation !== undefined) attributeLocations[attribute.name] = attributeLocation;
    }
    elements.push({
      name,
      start: location.startTag.startOffset,
      openEnd: location.startTag.endOffset,
      end: location.endTag?.endOffset ?? location.startTag.endOffset,
      ...(name === 'script' || name === 'style'
        ? {
            contentStart: location.startTag.endOffset,
            contentEnd: location.endTag?.startOffset ?? location.startTag.endOffset,
          }
        : {}),
      attributes,
      attributeLocations,
    });
    for (const child of element.childNodes) visit(child);
  };
  visit(document);
  return elements;
}

function attribute(
  element: HtmlElement,
  name: string,
): { readonly name: string; readonly value: string } | undefined {
  return element.attributes.find((candidate) => candidate.name === name);
}

function attributeValue(element: HtmlElement, name: string): string | undefined {
  return attribute(element, name)?.value;
}

function isModuleScript(element: HtmlElement): boolean {
  return element.name === 'script' && attributeValue(element, 'type')?.toLowerCase() === 'module';
}

function isStylesheet(element: HtmlElement): boolean {
  return (
    element.name === 'link' &&
    attributeValue(element, 'rel')?.toLowerCase().split(/\s+/).includes('stylesheet') === true
  );
}

function isModulePreload(element: HtmlElement): boolean {
  return (
    element.name === 'link' &&
    attributeValue(element, 'rel')?.toLowerCase().split(/\s+/).includes('modulepreload') === true
  );
}

function resourceForPath(
  path: string,
  resources: ReadonlyMap<string, SingleHtmlBundleArtifact>,
): SingleHtmlBundleArtifact | undefined {
  const normalized = normalizePath(path);
  if (normalized === undefined) return undefined;
  const direct = resources.get(normalized);
  if (direct !== undefined) return direct;
  const suffix = [...resources.entries()].filter(([candidate]) =>
    candidate.endsWith(`/${normalized}`),
  );
  return suffix.length === 1 ? suffix[0]?.[1] : undefined;
}

function resourcePath(reference: string, basePath: string): string | undefined {
  try {
    return normalizePath(new URL(reference, `https://forgeax.invalid/${basePath}`).pathname);
  } catch {
    return undefined;
  }
}

function applyReplacements(source: string, replacements: readonly Replacement[]): string {
  const unique = new Map<string, Replacement>();
  for (const replacement of replacements) {
    unique.set(`${replacement.start}:${replacement.end}`, replacement);
  }
  const ordered = [...unique.values()].sort((left, right) => left.start - right.start);
  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1];
    const current = ordered[index];
    if (previous !== undefined && current !== undefined && previous.end > current.start) {
      throw new Error(
        `single-html AST replacements overlap (${previous.start}:${previous.end} and ${current.start}:${current.end})`,
      );
    }
  }
  return ordered
    .reverse()
    .reduce(
      (value, replacement) =>
        value.slice(0, replacement.start) + replacement.value + value.slice(replacement.end),
      source,
    );
}

function inlineCss(
  css: string,
  cssPath: string,
  resources: ReadonlyMap<string, SingleHtmlBundleArtifact>,
): CommandResult<string> {
  const replacements: Replacement[] = [];
  const pattern = /url\(\s*(["']?)(.*?)\1\s*\)/gi;
  for (;;) {
    const match = pattern.exec(css);
    if (match === null) break;
    const reference = match[2]?.trim();
    if (
      reference === undefined ||
      reference.length === 0 ||
      reference.startsWith('data:') ||
      reference.startsWith('#')
    ) {
      continue;
    }
    if (/^(?:https?:|blob:)/i.test(reference)) {
      return errorResult(
        'single-html-css-external-resource',
        'CSS URL references to be embedded or data/blob URLs',
        'Move the CSS resource into the verified dist closure before packaging.',
        { cssPath, reference },
      );
    }
    const path = resourcePath(reference, cssPath);
    const resource = path === undefined ? undefined : resourceForPath(path, resources);
    if (resource === undefined) {
      return errorResult(
        'single-html-css-asset-missing',
        'every local CSS URL to resolve to an embedded dist artifact',
        'Add the referenced asset to the project asset closure and rebuild.',
        { cssPath, reference, path: path ?? null },
      );
    }
    replacements.push({
      start: match.index,
      end: match.index + match[0].length,
      value: `url(${dataUri(resource.bytes, resource.mediaType)})`,
    });
  }
  return { ok: true, value: applyReplacements(css, replacements) };
}

function collectEntrySource(html: string): CommandResult<string> {
  const entries = scanHtmlElements(html).filter((element) => isModuleScript(element));
  const external = entries.filter((element) => attributeValue(element, 'src') !== undefined);
  const inline = entries.filter((element) => attributeValue(element, 'src') === undefined);
  if (external.length === 0 && inline.length === 0) {
    return errorResult(
      'single-html-entry-missing',
      'production index.html to contain one module entry',
      'Rebuild the game with a module entry in its generated host.',
    );
  }
  if (external.length > 1 || inline.length > 1) {
    return errorResult(
      'single-html-entry-ambiguous',
      'production index.html to contain exactly one module entry',
      'Converge the generated host to one ForgeaX module entry before packaging.',
      { external: external.length, inline: inline.length },
    );
  }
  const element = external[0] ?? inline[0];
  if (element === undefined) throw new Error('single-html entry selection was unexpectedly empty');
  const src = attributeValue(element, 'src');
  if (src === undefined && element.contentStart !== undefined && element.contentEnd !== undefined) {
    return { ok: true, value: html.slice(element.contentStart, element.contentEnd) };
  }
  if (src === undefined) {
    return errorResult(
      'single-html-entry-missing',
      'a module entry source',
      'Add a module entry to index.html.',
    );
  }
  if (/^(?:https?:|file:|data:|blob:)/i.test(src)) {
    return errorResult(
      'single-html-entry-external',
      'the module entry to be a project-local dist artifact',
      'Rebuild the game so the generated host points at a local production module.',
      { src },
    );
  }
  return { ok: true, value: src };
}

async function filesUnder(root: string, directory = root): Promise<string[]> {
  const result: string[] = [];
  for (const name of (await readdir(directory)).sort()) {
    const path = resolve(directory, name);
    const info = await stat(path);
    if (info.isDirectory()) result.push(...(await filesUnder(root, path)));
    else if (info.isFile()) result.push(path);
  }
  return result;
}

function isPreloadHelperSource(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const path = value.split(/[?#]/, 1)[0] ?? value;
  const name = path.slice(path.lastIndexOf('/') + 1);
  return name.startsWith('preload-helper-') && name.endsWith('.js');
}

function isLocalChunkImport(source: {
  readonly type?: string;
  readonly value?: unknown;
  readonly expressions?: readonly unknown[];
  readonly quasis?: readonly {
    readonly value: { readonly cooked?: string | null; readonly raw: string };
  }[];
}): boolean {
  const value =
    source.type === 'TemplateLiteral' && source.expressions?.length === 0
      ? (source.quasis?.[0]?.value.cooked ?? source.quasis?.[0]?.value.raw)
      : source.value;
  return typeof value === 'string' && /^(?:\.{1,2}\/|\/)/.test(value);
}

interface StaticImportSource {
  readonly type?: string;
  readonly expressions?: readonly unknown[];
  readonly start: number;
  readonly end: number;
  readonly value?: unknown;
}

function isStaticImportSource(source: unknown): source is StaticImportSource {
  if (typeof source !== 'object' || source === null) return false;
  const candidate = source as StaticImportSource;
  return (
    candidate.type === 'Literal' ||
    candidate.type === 'StringLiteral' ||
    (candidate.type === 'TemplateLiteral' && candidate.expressions?.length === 0)
  );
}

type SingleHtmlProgram = ReturnType<typeof parseAst>;

interface SingleHtmlMagicString {
  overwrite(start: number, end: number, content: string): SingleHtmlMagicString;
  hasChanged(): boolean;
}

interface SingleHtmlTransformMeta {
  readonly ast?: SingleHtmlProgram;
  readonly magicString?: SingleHtmlMagicString;
}

interface SingleHtmlPluginContext {
  error(message: string): never;
}

interface SingleHtmlOutputChunk {
  type: 'chunk';
  fileName: string;
  code: string;
}

interface SingleHtmlOutputAsset {
  type: 'asset';
  fileName: string;
  source?: string | Uint8Array;
}

type SingleHtmlOutputBundle = Record<string, SingleHtmlOutputChunk | SingleHtmlOutputAsset>;

function preloadDependencyReplacements(code: string): Replacement[] {
  const fileName = resolve('forgeax-single-html-input.js');
  const source = ts.createSourceFile(
    fileName,
    code,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS,
  );
  const options: ts.CompilerOptions = { allowJs: true, noLib: true, noResolve: true, types: [] };
  const host = ts.createCompilerHost(options);
  host.getSourceFile = (path) => (resolve(path) === fileName ? source : undefined);
  const checker = ts.createProgram([fileName], options, host).getTypeChecker();
  const bindings = new Set<ts.Symbol>();
  for (const statement of source.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      !isPreloadHelperSource(statement.moduleSpecifier.text)
    )
      continue;
    const imports = statement.importClause?.namedBindings;
    if (imports === undefined || !ts.isNamedImports(imports)) continue;
    for (const specifier of imports.elements) {
      const symbol = checker.getSymbolAtLocation(specifier.name);
      if (symbol !== undefined) bindings.add(symbol);
    }
  }
  const replacements: Replacement[] = [];
  function visit(node: ts.Node): void {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      const symbol = checker.getSymbolAtLocation(node.expression);
      const dependencies = node.arguments[1];
      if (symbol !== undefined && bindings.has(symbol) && dependencies !== undefined) {
        replacements.push({
          start: dependencies.getStart(source),
          end: dependencies.end,
          value: 'void 0',
        });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return replacements;
}

function programReplacements(program: SingleHtmlProgram, code: string): readonly Replacement[] {
  const hasPreloadImport = program.body.some(
    (node) => node.type === 'ImportDeclaration' && isPreloadHelperSource(node.source.value),
  );
  // Minified imports can share a name with unrelated nested functions. Resolve
  // their lexical symbols instead of rewriting every same-spelled call.
  const replacements = hasPreloadImport ? preloadDependencyReplacements(code) : [];
  new Visitor({
    ImportExpression(node) {
      // Production already resolved package imports. Residual bare specifiers are
      // optional runtime requests, subject to the same closed resource lookup as computed imports.
      if (isLocalChunkImport(node.source)) return;
      replacements.push({
        start: node.start,
        end: node.start + 'import'.length,
        value: 'globalThis.__forgeaxImport',
      });
    },
  }).visit(program);
  return replacements;
}

function outputReplacements(program: SingleHtmlProgram): readonly Replacement[] {
  const replacements: Replacement[] = [];
  new Visitor({
    ImportExpression(node) {
      replacements.push({
        start: node.start,
        end: node.start + 'import'.length,
        value: 'globalThis.__forgeaxImport',
      });
    },
  }).visit(program);
  return replacements;
}

function rewriteOutputJavaScript(code: string): string {
  const program = parseAst(code);
  return applyReplacements(code, outputReplacements(program));
}

function residualImportStart(code: string): number | undefined {
  let residualStart: number | undefined;
  new Visitor({
    ImportExpression(node) {
      residualStart ??= node.start;
    },
  }).visit(parseAst(code));
  return residualStart;
}

function isJavaScriptOutputAsset(fileName: string): boolean {
  return /\.(?:c?js|mjs)$/i.test(fileName);
}

function isRelativeStaticModuleSource(source: unknown): boolean {
  if (!isStaticImportSource(source)) return false;
  return typeof source.value === 'string' && /^(?:\.\/|\.\.\/)/.test(source.value);
}

function hasStaticJavaScriptImports(code: string): boolean {
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
      },
    }).visit(parseAst(code));
  } catch {
    return false;
  }
  return found;
}

type StaticGraphNamespace = 'raw' | 'generated';

interface StaticGraphArtifactIndex {
  readonly raw: Set<string>;
  readonly generated: Set<string>;
}

function staticGraphNamespace(path: string): StaticGraphNamespace {
  return path.startsWith(GENERATED_PREFIX) ? 'generated' : 'raw';
}

function staticGraphCanonicalPath(path: string): string {
  return path.startsWith(GENERATED_PREFIX) ? path.slice(GENERATED_PREFIX.length) : path;
}

function staticGraphNamespaceForId(
  graphRoot: string,
  id: string,
): StaticGraphNamespace | undefined {
  const path = relative(graphRoot, id).split(sep).join('/');
  if (path.startsWith('raw/')) return 'raw';
  if (path.startsWith('generated/')) return 'generated';
  return undefined;
}

function staticGraphCanonicalPathForId(graphRoot: string, id: string): string | undefined {
  const path = relative(graphRoot, id).split(sep).join('/');
  if (path.startsWith('raw/')) return path.slice('raw/'.length);
  if (path.startsWith('generated/')) return path.slice('generated/'.length);
  return undefined;
}

function resolveStaticGraphImport(
  source: string,
  importerNamespace: StaticGraphNamespace,
  importerPath: string,
  index: StaticGraphArtifactIndex,
): { readonly namespace: StaticGraphNamespace; readonly path: string } | undefined {
  if (!/^(?:\.\/|\.\.\/)/.test(source)) return undefined;
  const path = resourcePath(source, importerPath);
  if (path === undefined) return undefined;
  const sameNamespace =
    index[importerNamespace].has(path) === true
      ? { namespace: importerNamespace, path }
      : undefined;
  if (sameNamespace !== undefined) return sameNamespace;
  // A generated bootstrap is emitted in the generated namespace, but its
  // project-relative loader can remain a raw dist artifact. Resolve that
  // cross-namespace edge by canonical path only; never fall back to a
  // basename or suffix match.
  if (importerNamespace === 'generated' && index.raw.has(path)) {
    return { namespace: 'raw', path };
  }
  return undefined;
}

function embeddedStaticGraphPath(target: {
  readonly namespace: StaticGraphNamespace;
  readonly path: string;
}): string {
  return target.namespace === 'generated' ? `${GENERATED_PREFIX}${target.path}` : target.path;
}

function staticGraphResolverPlugin(graphRoot: string, index: StaticGraphArtifactIndex): Plugin {
  return {
    name: 'forgeax-single-html-static-graph-resolver',
    enforce: 'pre',
    resolveId(source, importer) {
      if (importer === undefined) return null;
      const namespace = staticGraphNamespaceForId(graphRoot, importer);
      const importerPath = staticGraphCanonicalPathForId(graphRoot, importer);
      if (namespace === undefined || importerPath === undefined) return null;
      const target = resolveStaticGraphImport(source, namespace, importerPath, index);
      if (target === undefined) return null;
      return resolve(graphRoot, target.namespace, target.path);
    },
  };
}

function staticGraphImporterPlugin(graphRoot: string, index: StaticGraphArtifactIndex): Plugin {
  return {
    name: 'forgeax-single-html-static-graph-importer',
    enforce: 'pre',
    transform(code, id) {
      const sourcePath = id.split(/[?#]/, 1)[0] ?? id;
      const importerNamespace = staticGraphNamespaceForId(graphRoot, sourcePath);
      const importer = staticGraphCanonicalPathForId(graphRoot, sourcePath);
      if (importerNamespace === undefined || importer === undefined) return null;
      let program: SingleHtmlProgram;
      try {
        program = parseAst(code);
      } catch {
        return null;
      }
      const replacements: Replacement[] = [];
      new Visitor({
        ImportExpression(node) {
          const source = node.source;
          if (!isStaticImportSource(source)) return;
          const staticSource = source as StaticImportSource;
          const specifier = staticSource.value;
          if (typeof specifier !== 'string') return;
          const target = resolveStaticGraphImport(specifier, importerNamespace, importer, index);
          if (target === undefined) return;
          replacements.push(
            {
              start: node.start,
              end: node.start + 'import'.length,
              value: 'globalThis.__forgeaxImport',
            },
            {
              start: staticSource.start,
              end: staticSource.end,
              value: JSON.stringify(embeddedStaticGraphPath(target)),
            },
          );
        },
        CallExpression(node) {
          const callee = node.callee;
          if (
            callee.type !== 'MemberExpression' ||
            callee.computed ||
            callee.object.type !== 'Identifier' ||
            callee.object.name !== 'globalThis' ||
            callee.property.type !== 'Identifier' ||
            callee.property.name !== '__forgeaxImport'
          ) {
            return;
          }
          const source = node.arguments[0];
          if (!isStaticImportSource(source)) return;
          const specifier = source.value;
          if (typeof specifier !== 'string' || !/^(?:\.\/|\.\.\/)/.test(specifier)) return;
          const target = resolveStaticGraphImport(specifier, importerNamespace, importer, index);
          if (target === undefined) return;
          replacements.push({
            start: source.start,
            end: source.end,
            value: JSON.stringify(embeddedStaticGraphPath(target)),
          });
        },
      }).visit(program);
      return replacements.length === 0 ? null : applyReplacements(code, replacements);
    },
  };
}

async function closeStaticJavaScriptGraphs(
  temporaryRoot: string,
  initial: readonly SingleHtmlBundleArtifact[],
): Promise<CommandResult<SingleHtmlBundleArtifact[]>> {
  const artifacts = new Map<string, SingleHtmlBundleArtifact>();
  for (const artifact of initial) {
    if (artifacts.has(artifact.path)) {
      return errorResult(
        'single-html-asset-duplicate',
        'embedded resource paths to be unique',
        'Repair the generated bundle path collision before packaging.',
        { path: artifact.path },
      );
    }
    artifacts.set(artifact.path, artifact);
  }
  const artifactIndex: StaticGraphArtifactIndex = {
    raw: new Set(
      [...artifacts.keys()]
        .filter((path) => staticGraphNamespace(path) === 'raw')
        .map(staticGraphCanonicalPath),
    ),
    generated: new Set(
      [...artifacts.keys()]
        .filter((path) => staticGraphNamespace(path) === 'generated')
        .map(staticGraphCanonicalPath),
    ),
  };
  let pass = 0;
  for (;;) {
    const candidate = [...artifacts.values()].find((artifact) => {
      // Raw dist JavaScript is already a production output and may retain
      // unrelated bare imports for tool-only branches. Only generated
      // artifacts are Blob-imported closure candidates; raw files are staged
      // as exact cross-namespace dependencies of those generated graphs.
      if (
        !isJavaScriptOutputAsset(artifact.path) ||
        staticGraphNamespace(artifact.path) !== 'generated'
      ) {
        return false;
      }
      return hasStaticJavaScriptImports(Buffer.from(artifact.bytes).toString('utf8'));
    });
    if (candidate === undefined) return { ok: true, value: [...artifacts.values()] };
    pass += 1;
    if (pass > artifacts.size + 1) {
      return errorResult(
        'single-html-static-graph-open',
        'every embedded JavaScript artifact to have its static module graph closed',
        'Inspect the emitted module graph for an unresolved static import.',
        { path: candidate.path },
      );
    }

    const graphRoot = resolve(temporaryRoot, `static-graph-${pass}`);
    const outputRoot = resolve(graphRoot, 'out');
    await mkdir(graphRoot, { recursive: true });
    for (const artifact of artifacts.values()) {
      const namespace = staticGraphNamespace(artifact.path);
      const relativePath = staticGraphCanonicalPath(artifact.path);
      const destination = resolve(graphRoot, namespace, relativePath);
      await mkdir(dirname(destination), { recursive: true });
      await writeFile(destination, artifact.bytes);
      if (namespace === 'raw' && !artifactIndex.generated.has(relativePath)) {
        const alias = resolve(graphRoot, 'generated', relativePath);
        await mkdir(dirname(alias), { recursive: true });
        await (await import('node:fs/promises')).link(destination, alias);
      }
    }
    const candidateNamespace = staticGraphNamespace(candidate.path);
    const candidatePath = staticGraphCanonicalPath(candidate.path);
    const inputPath = resolve(graphRoot, candidateNamespace, candidatePath);
    try {
      await viteBuild({
        configFile: false,
        root: graphRoot,
        worker: { format: 'es', rolldownOptions: { output: { codeSplitting: false, entryFileNames: `${candidateNamespace}/assets/[name]-[hash].mjs`, chunkFileNames: `${candidateNamespace}/assets/[name]-[hash].mjs`, assetFileNames: `${candidateNamespace}/assets/[name]-[hash][extname]` } } },
        base: './',
        logLevel: 'error',
        plugins: [
          staticGraphResolverPlugin(graphRoot, artifactIndex),
          staticGraphImporterPlugin(graphRoot, artifactIndex),
          singleHtmlBundlePlugin(candidateNamespace),
        ],
        build: {
          outDir: outputRoot,
          emptyOutDir: true,
          target: 'esnext',
          minify: false,
          assetsInlineLimit: 0,
          rolldownOptions: {
            input: inputPath,
            preserveEntrySignatures: 'strict',
            output: {
              codeSplitting: false,
              entryFileNames: `${candidateNamespace}/${candidatePath}`,
              chunkFileNames: `${candidateNamespace}/assets/[name]-[hash].mjs`,
              assetFileNames: `${candidateNamespace}/assets/[name]-[hash][extname]`,
            },
            experimental: { nativeMagicString: true },
          },
        },
      });
    } catch (cause) {
      return toErrorResult(
        cause,
        'single-html-static-graph-failed',
        'the emitted JavaScript artifact static graph to bundle as one Blob-safe module',
        'Repair the generated JavaScript graph or inspect the bundler diagnostic before packaging.',
      );
    }

    const outputPaths = await filesUnder(outputRoot);
    const outputRelativePaths = outputPaths.map((path) =>
      relative(outputRoot, path).split(sep).join('/'),
    );
    const outputEntry = outputRelativePaths.find(
      (path) => path === `${candidateNamespace}/${candidatePath}`,
    );
    if (outputEntry === undefined) {
      return errorResult(
        'single-html-static-graph-entry-missing',
        'the static graph bundler to emit the original artifact path',
        'Inspect the generated static graph output and preserve its artifact entry.',
        { path: candidate.path, outputPaths: outputRelativePaths },
      );
    }
    for (const outputPath of outputRelativePaths) {
      if (!outputPath.startsWith(`${candidateNamespace}/`)) {
        return errorResult(
          'single-html-static-graph-namespace-missing',
          'static graph output paths to retain their source namespace',
          'Inspect the static graph bundler output and preserve its raw/generated namespace.',
          { path: candidate.path, outputPath },
        );
      }
      const namespace = candidateNamespace;
      const canonicalOutputPath = outputPath.slice(`${namespace}/`.length);
      const embeddedPath =
        namespace === 'generated'
          ? `${GENERATED_PREFIX}${canonicalOutputPath}`
          : canonicalOutputPath;
      const bytes = await readFile(resolve(outputRoot, outputPath));
      const previous = artifacts.get(embeddedPath);
      artifacts.set(embeddedPath, {
        path: embeddedPath,
        bytes,
        mediaType: previous?.mediaType ?? mediaType(canonicalOutputPath),
      });
      artifactIndex[namespace].add(canonicalOutputPath);
    }
  }
}

function singleHtmlBundlePlugin(namespace?: StaticGraphNamespace): Plugin {
  const plugin = {
    name: 'forgeax-single-html-bundle-runtime',
    enforce: 'post',
    transform: {
      order: 'post',
      handler(
        this: SingleHtmlPluginContext,
        code: string,
        _id: string,
        meta?: SingleHtmlTransformMeta,
      ) {
        let program = meta?.ast;
        if (program === undefined) {
          try {
            program = parseAst(code);
          } catch {
            return null;
          }
        }
        const replacements = programReplacements(program, code);
        if (replacements.length === 0) return null;
        if (meta?.magicString !== undefined) {
          for (const replacement of replacements) {
            meta.magicString.overwrite(replacement.start, replacement.end, replacement.value);
          }
          return meta.magicString.hasChanged() ? meta.magicString : null;
        }
        return applyReplacements(code, replacements);
      },
    },
    generateBundle(
      this: SingleHtmlPluginContext,
      _outputOptions: unknown,
      bundle: SingleHtmlOutputBundle,
    ) {
      for (const output of Object.values(bundle)) {
        if (output.type === 'chunk') {
          output.code = rewriteOutputJavaScript(output.code);
        } else if (isJavaScriptOutputAsset(output.fileName) && output.source !== undefined) {
          const source =
            typeof output.source === 'string'
              ? output.source
              : Buffer.from(output.source).toString('utf8');
          output.source = rewriteOutputJavaScript(source);
        } else {
          continue;
        }
        const code = output.type === 'chunk' ? output.code : String(output.source);
        const residualStart = residualImportStart(code);
        if (residualStart !== undefined) {
          this.error(
            `single-html bundle left a native dynamic import in ${output.fileName} at ${residualStart}`,
          );
        }
      }
    },
    resolveFileUrl: ({ fileName }: { readonly fileName: string }) => {
      const canonicalPath =
        namespace !== undefined && fileName.startsWith(`${namespace}/`)
          ? fileName.slice(`${namespace}/`.length)
          : fileName;
      return JSON.stringify(
        namespace === 'raw' ? canonicalPath : `${GENERATED_PREFIX}${canonicalPath}`,
      );
    },
  } as unknown as Plugin;
  return plugin;
}

export async function bundleSingleHtmlEntry(distRootInput: string,indexHtml: string,projectRoot?: string): Promise<CommandResult<SingleHtmlBundle>> {
  const selected=collectEntrySource(indexHtml); if(!selected.ok)return selected;
  const entryPath=normalizePath(selected.value);
  if(entryPath!==undefined){
    try {if((await stat(resolve(distRootInput,entryPath))).isFile())return {ok:true,value:{entrySource:'await globalThis.__forgeaxReady; await globalThis.__forgeaxImport('+JSON.stringify(entryPath)+');',artifacts:[]}};}catch{}
  }
  const path=GENERATED_PREFIX+'inline-entry.mjs';
  return {ok:true,value:{entrySource:'await globalThis.__forgeaxReady; await globalThis.__forgeaxImport('+JSON.stringify(path)+');',artifacts:[{path,mediaType:'text/javascript',bytes:Buffer.from(selected.value)}]}};
}

const _singleHtmlSystemSource = "/* SystemJS 6.15.1 — MIT License\r\n-----------\r\n\r\nCopyright (C) 2013-2022 Guy Bedford\r\n\r\nPermission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the \"Software\"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:\r\n\r\nThe above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.\r\n\r\nTHE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.\r\n */\n/*!\r\n * SJS 6.15.1\r\n */\r\n!function(){function e(e,t){return(t||\"\")+\" (SystemJS https://github.com/systemjs/systemjs/blob/main/docs/errors.md#\"+e+\")\"}function t(e,t){if(-1!==e.indexOf(\"\\\\\")&&(e=e.replace(S,\"/\")),\"/\"===e[0]&&\"/\"===e[1])return t.slice(0,t.indexOf(\":\")+1)+e;if(\".\"===e[0]&&(\"/\"===e[1]||\".\"===e[1]&&(\"/\"===e[2]||2===e.length&&(e+=\"/\"))||1===e.length&&(e+=\"/\"))||\"/\"===e[0]){var r,n=t.slice(0,t.indexOf(\":\")+1);if(r=\"/\"===t[n.length+1]?\"file:\"!==n?(r=t.slice(n.length+2)).slice(r.indexOf(\"/\")+1):t.slice(8):t.slice(n.length+(\"/\"===t[n.length])),\"/\"===e[0])return t.slice(0,t.length-r.length-1)+e;for(var i=r.slice(0,r.lastIndexOf(\"/\")+1)+e,o=[],s=-1,c=0;c<i.length;c++)-1!==s?\"/\"===i[c]&&(o.push(i.slice(s,c+1)),s=-1):\".\"===i[c]?\".\"!==i[c+1]||\"/\"!==i[c+2]&&c+2!==i.length?\"/\"===i[c+1]||c+1===i.length?c+=1:s=c:(o.pop(),c+=2):s=c;return-1!==s&&o.push(i.slice(s)),t.slice(0,t.length-r.length)+o.join(\"\")}}function r(e,r){return t(e,r)||(-1!==e.indexOf(\":\")?e:t(\"./\"+e,r))}function n(e,r,n,i,o){for(var s in e){var f=t(s,n)||s,a=e[s];if(\"string\"==typeof a){var l=u(i,t(a,n)||a,o);l?r[f]=l:c(\"W1\",s,a)}}}function i(e,t,i){var o;for(o in e.imports&&n(e.imports,i.imports,t,i,null),e.scopes||{}){var s=r(o,t);n(e.scopes[o],i.scopes[s]||(i.scopes[s]={}),t,i,s)}for(o in e.depcache||{})i.depcache[r(o,t)]=e.depcache[o];for(o in e.integrity||{})i.integrity[r(o,t)]=e.integrity[o]}function o(e,t){if(t[e])return e;var r=e.length;do{var n=e.slice(0,r+1);if(n in t)return n}while(-1!==(r=e.lastIndexOf(\"/\",r-1)))}function s(e,t){var r=o(e,t);if(r){var n=t[r];if(null===n)return;if(!(e.length>r.length&&\"/\"!==n[n.length-1]))return n+e.slice(r.length);c(\"W2\",r,n)}}function c(t,r,n){console.warn(e(t,[n,r].join(\", \")))}function u(e,t,r){for(var n=e.scopes,i=r&&o(r,n);i;){var c=s(t,n[i]);if(c)return c;i=o(i.slice(0,i.lastIndexOf(\"/\")),n)}return s(t,e.imports)||-1!==t.indexOf(\":\")&&t}function f(){this[b]={}}function a(t,r,n,i){var o=t[b][r];if(o)return o;var s=[],c=Object.create(null);j&&Object.defineProperty(c,j,{value:\"Module\"});var u=Promise.resolve().then((function(){return t.instantiate(r,n,i)})).then((function(n){if(!n)throw Error(e(2,r));var i=n[1]((function(e,t){o.h=!0;var r=!1;if(\"string\"==typeof e)e in c&&c[e]===t||(c[e]=t,r=!0);else{for(var n in e)t=e[n],n in c&&c[n]===t||(c[n]=t,r=!0);e&&e.__esModule&&(c.__esModule=e.__esModule)}if(r)for(var i=0;i<s.length;i++){var u=s[i];u&&u(c)}return t}),2===n[1].length?{import:function(e,n){return t.import(e,r,n)},meta:t.createContext(r)}:void 0);return o.e=i.execute||function(){},[n[0],i.setters||[],n[2]||[]]}),(function(e){throw o.e=null,o.er=e,e})),f=u.then((function(e){return Promise.all(e[0].map((function(n,i){var o=e[1][i],s=e[2][i];return Promise.resolve(t.resolve(n,r)).then((function(e){var n=a(t,e,r,s);return Promise.resolve(n.I).then((function(){return o&&(n.i.push(o),!n.h&&n.I||o(n.n)),n}))}))}))).then((function(e){o.d=e}))}));return o=t[b][r]={id:r,i:s,n:c,m:i,I:u,L:f,h:!1,d:void 0,e:void 0,er:void 0,E:void 0,C:void 0,p:void 0}}function l(e,t,r,n){if(!n[t.id])return n[t.id]=!0,Promise.resolve(t.L).then((function(){return t.p&&null!==t.p.e||(t.p=r),Promise.all(t.d.map((function(t){return l(e,t,r,n)})))})).catch((function(e){if(t.er)throw e;throw t.e=null,e}))}function h(e,t){return t.C=l(e,t,t,{}).then((function(){return d(e,t,{})})).then((function(){return t.n}))}function d(e,t,r){function n(){try{var e=o.call(I);if(e)return e=e.then((function(){t.C=t.n,t.E=null}),(function(e){throw t.er=e,t.E=null,e})),t.E=e;t.C=t.n,t.L=t.I=void 0}catch(r){throw t.er=r,r}}if(!r[t.id]){if(r[t.id]=!0,!t.e){if(t.er)throw t.er;return t.E?t.E:void 0}var i,o=t.e;return t.e=null,t.d.forEach((function(n){try{var o=d(e,n,r);o&&(i=i||[]).push(o)}catch(s){throw t.er=s,s}})),i?Promise.all(i).then(n):n()}}function v(){[].forEach.call(document.querySelectorAll(\"script\"),(function(t){if(!t.sp)if(\"systemjs-module\"===t.type){if(t.sp=!0,!t.src)return;System.import(\"import:\"===t.src.slice(0,7)?t.src.slice(7):r(t.src,p)).catch((function(e){if(e.message.indexOf(\"https://github.com/systemjs/systemjs/blob/main/docs/errors.md#3\")>-1){var r=document.createEvent(\"Event\");r.initEvent(\"error\",!1,!1),t.dispatchEvent(r)}return Promise.reject(e)}))}else if(\"systemjs-importmap\"===t.type){t.sp=!0;var n=t.src?(System.fetch||fetch)(t.src,{integrity:t.integrity,priority:t.fetchPriority,passThrough:!0}).then((function(e){if(!e.ok)throw Error(e.status);return e.text()})).catch((function(r){return r.message=e(\"W4\",t.src)+\"\\n\"+r.message,console.warn(r),\"function\"==typeof t.onerror&&t.onerror(),\"{}\"})):t.innerHTML;M=M.then((function(){return n})).then((function(r){!function(t,r,n){var o={};try{o=JSON.parse(r)}catch(s){console.warn(Error(e(\"W5\")))}i(o,n,t)}(R,r,t.src||p)}))}}))}var p,m=\"undefined\"!=typeof Symbol,g=\"undefined\"!=typeof self,y=\"undefined\"!=typeof document,E=g?self:global;if(y){var w=document.querySelector(\"base[href]\");w&&(p=w.href)}if(!p&&\"undefined\"!=typeof location){var O=(p=location.href.split(\"#\")[0].split(\"?\")[0]).lastIndexOf(\"/\");-1!==O&&(p=p.slice(0,O+1))}var x,S=/\\\\/g,j=m&&Symbol.toStringTag,b=m?Symbol():\"@\",P=f.prototype;P.import=function(e,t,r){var n=this;return t&&\"object\"==typeof t&&(r=t,t=void 0),Promise.resolve(n.prepareImport()).then((function(){return n.resolve(e,t,r)})).then((function(e){var t=a(n,e,void 0,r);return t.C||h(n,t)}))},P.createContext=function(e){var t=this;return{url:e,resolve:function(r,n){return Promise.resolve(t.resolve(r,n||e))}}},P.register=function(e,t,r){x=[e,t,r]},P.getRegister=function(){var e=x;return x=void 0,e};var I=Object.freeze(Object.create(null));E.System=new f;var L,C,M=Promise.resolve(),R={imports:{},scopes:{},depcache:{},integrity:{}},T=y;if(P.prepareImport=function(e){return(T||e)&&(v(),T=!1),M},P.getImportMap=function(){return JSON.parse(JSON.stringify(R))},y&&(v(),window.addEventListener(\"DOMContentLoaded\",v)),P.addImportMap=function(e,t){i(e,t||p,R)},y){window.addEventListener(\"error\",(function(e){J=e.filename,W=e.error}));var _=location.origin}P.createScript=function(e){var t=document.createElement(\"script\");t.async=!0,e.indexOf(_+\"/\")&&(t.crossOrigin=\"anonymous\");var r=R.integrity[e];return r&&(t.integrity=r),t.src=e,t};var J,W,q={},N=P.register;P.register=function(e,t){if(y&&\"loading\"===document.readyState&&\"string\"!=typeof e){var r=document.querySelectorAll(\"script[src]\"),n=r[r.length-1];if(n){L=e;var i=this;C=setTimeout((function(){q[n.src]=[e,t],i.import(n.src)}))}}else L=void 0;return N.call(this,e,t)},P.instantiate=function(t,r){var n=q[t];if(n)return delete q[t],n;var i=this;return Promise.resolve(P.createScript(t)).then((function(n){return new Promise((function(o,s){n.addEventListener(\"error\",(function(){s(Error(e(3,[t,r].join(\", \"))))})),n.addEventListener(\"load\",(function(){if(document.head.removeChild(n),J===t)s(W);else{var e=i.getRegister(t);e&&e[0]===L&&clearTimeout(C),o(e)}})),document.head.appendChild(n)}))}))},P.shouldFetch=function(){return!1},\"undefined\"!=typeof fetch&&(P.fetch=fetch);var k=P.instantiate,A=/^(text|application)\\/(x-)?javascript(;|$)/;P.instantiate=function(t,r,n){var i=this;return this.shouldFetch(t,r,n)?this.fetch(t,{credentials:\"same-origin\",integrity:R.integrity[t],meta:n}).then((function(n){if(!n.ok)throw Error(e(7,[n.status,n.statusText,t,r].join(\", \")));var o=n.headers.get(\"content-type\");if(!o||!A.test(o))throw Error(e(4,o));return n.text().then((function(e){return e.indexOf(\"//# sourceURL=\")<0&&(e+=\"\\n//# sourceURL=\"+t),(0,eval)(e),i.getRegister(t)}))})):k.apply(this,arguments)},P.resolve=function(r,n){return u(R,t(r,n=n||p)||r,n)||function(t,r){throw Error(e(8,[t,r].join(\", \")))}(r,n)};var F=P.instantiate;P.instantiate=function(e,t,r){var n=R.depcache[e];if(n)for(var i=0;i<n.length;i++)a(this,this.resolve(n[i],e),e);return F.call(this,e,t,r)},g&&\"function\"==typeof importScripts&&(P.instantiate=function(e){var t=this;return Promise.resolve().then((function(){return importScripts(e),t.getRegister(e)}))})}();\r\n//# sourceMappingURL=s.min.js.map\r\n";
function registerSingleHtmlModules(resources: readonly SingleHtmlBundleArtifact[]): SingleHtmlBundleArtifact[] {
 return resources.map(resource=>{
  if(!/\.(?:m?js|cjs)$/i.test(resource.path))return resource;
  const input=Buffer.from(resource.bytes).toString('utf8');
  const forwardImportedExports: ts.TransformerFactory<ts.SourceFile> = context => file => {
   const imports=new Map<string,{from:string,name:string}>();
   for(const node of file.statements){if(!ts.isImportDeclaration(node)||!ts.isStringLiteral(node.moduleSpecifier))continue;const clause=node.importClause;if(!clause)continue;if(clause.name)imports.set(clause.name.text,{from:node.moduleSpecifier.text,name:'default'});if(clause.namedBindings&&ts.isNamedImports(clause.namedBindings))for(const item of clause.namedBindings.elements)imports.set(item.name.text,{from:node.moduleSpecifier.text,name:(item.propertyName??item.name).text});}
   const statements:ts.Statement[]=[];
   for(const node of file.statements){
    if(!ts.isExportDeclaration(node)||node.moduleSpecifier||!node.exportClause||!ts.isNamedExports(node.exportClause)){statements.push(node);continue;}
    const locals:ts.ExportSpecifier[]=[];
    for(const item of node.exportClause.elements){const binding=imports.get((item.propertyName??item.name).text);if(!binding){locals.push(item);continue;}statements.push(context.factory.createExportDeclaration(undefined,false,context.factory.createNamedExports([context.factory.createExportSpecifier(false,context.factory.createIdentifier(binding.name),item.name)]),context.factory.createStringLiteral(binding.from)));}
    if(locals.length)statements.push(context.factory.updateExportDeclaration(node,node.modifiers,false,context.factory.createNamedExports(locals),undefined));
   }
   return context.factory.updateSourceFile(file,statements);
  };
  const result=ts.transpileModule(input,{fileName:resource.path,compilerOptions:{module:ts.ModuleKind.System,target:ts.ScriptTarget.ESNext,moduleDetection:ts.ModuleDetectionKind.Force,ignoreDeprecations:"6.0",sourceMap:false,removeComments:false},transformers:{before:[forwardImportedExports]},reportDiagnostics:true});
  const errors=result.diagnostics?.filter(d=>d.category===ts.DiagnosticCategory.Error)??[];
  if(errors.length)throw new Error('single-html module conversion failed: '+resource.path+' '+errors.map(d=>ts.flattenDiagnosticMessageText(d.messageText,' ')).join('; '));
  return {...resource,bytes:Buffer.from(result.outputText),mediaType:'text/javascript'};
 });
}

function workerBootstrapSource(): string {
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

function workerRuntimeSource(): string {
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

function runtimeBootstrap(): string {
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

function distResources(
  distRoot: string,
  manifest: DistManifest,
): Promise<SingleHtmlBundleArtifact[]> {
  const rows: readonly (DistArtifact | { readonly path: string })[] = [
    ...manifest.artifacts,
    { path: 'forgeax-dist.json' },
  ];
  return Promise.all(
    rows
      .filter((artifact) => artifact.path !== 'index.html')
      .map(async (artifact) => ({
        path: artifact.path,
        bytes: await readFile(resolve(distRoot, artifact.path)),
        mediaType: 'mediaType' in artifact ? artifact.mediaType : mediaType(artifact.path),
      })),
  );
}

function buildHtml(
  indexHtml: string,
  distArtifacts: readonly SingleHtmlBundleArtifact[],
  bundle: SingleHtmlBundle,
): CommandResult<{ readonly html: string; readonly embeddedAssets: number }> {
  const resources = new Map<string, SingleHtmlBundleArtifact>();
  for (const resource of [...distArtifacts, ...bundle.artifacts]) {
    if (resources.has(resource.path)) {
      return errorResult(
        'single-html-asset-duplicate',
        'embedded resource paths to be unique',
        'Repair the generated bundle path collision before packaging.',
        { path: resource.path },
      );
    }
    resources.set(resource.path, resource);
  }

  const replacements: Replacement[] = [];
  for (const element of scanHtmlElements(indexHtml)) {
    if (isModuleScript(element) || isModulePreload(element)) {
      replacements.push({ start: element.start, end: element.end, value: '' });
      continue;
    }
    if (isStylesheet(element)) {
      const href = attributeValue(element, 'href');
      if (href === undefined) {
        return errorResult(
          'single-html-stylesheet-missing',
          'stylesheet link to contain href',
          'Repair the generated HTML stylesheet link.',
        );
      }
      const path = resourcePath(href, 'index.html');
      const stylesheet = path === undefined ? undefined : resourceForPath(path, resources);
      if (stylesheet === undefined) {
        return errorResult(
          'single-html-css-asset-missing',
          'stylesheet link to resolve to an embedded artifact',
          'Add the stylesheet to the dist closure and rebuild.',
          { href, path: path ?? null },
        );
      }
      const css = inlineCss(
        Buffer.from(stylesheet.bytes).toString('utf8'),
        stylesheet.path,
        resources,
      );
      if (!css.ok) return css;
      replacements.push({
        start: element.start,
        end: element.end,
        value: `<style data-forgeax-inline-css>${css.value}</style>`,
      });
      continue;
    }
    if (
      element.name === 'style' &&
      element.contentStart !== undefined &&
      element.contentEnd !== undefined
    ) {
      const css = inlineCss(
        indexHtml.slice(element.contentStart, element.contentEnd),
        'index.html',
        resources,
      );
      if (!css.ok) return css;
      replacements.push({ start: element.contentStart, end: element.contentEnd, value: css.value });
      continue;
    }
    const resourceAttribute =
      element.name === 'img' ||
      element.name === 'source' ||
      element.name === 'video' ||
      element.name === 'audio' ||
      element.name === 'link'
        ? element.attributes.find((candidate) => ['src', 'poster', 'href'].includes(candidate.name))
        : undefined;
    const resourceAttributeLocation =
      resourceAttribute === undefined
        ? undefined
        : element.attributeLocations[resourceAttribute.name];
    const resourceAttributeRange =
      resourceAttribute === undefined || resourceAttributeLocation === undefined
        ? undefined
        : attributeValueRange(indexHtml, resourceAttributeLocation);
    if (
      resourceAttribute?.value !== undefined &&
      resourceAttributeRange !== undefined &&
      !/^(?:data:|blob:|#)/i.test(resourceAttribute.value)
    ) {
      const path = resourcePath(resourceAttribute.value, 'index.html');
      const embedded = path === undefined ? undefined : resourceForPath(path, resources);
      if (embedded === undefined) {
        return errorResult(
          'single-html-asset-missing',
          'every local HTML resource to resolve to an embedded dist artifact',
          'Add the referenced asset to the project closure and rebuild.',
          { value: resourceAttribute.value, path: path ?? null },
        );
      }
      replacements.push({
        start: resourceAttributeRange.startOffset,
        end: resourceAttributeRange.endOffset,
        value: dataUri(embedded.bytes, embedded.mediaType),
      });
      continue;
    }
    if (element.name === 'script' && attributeValue(element, 'src') !== undefined) {
      return errorResult(
        'single-html-script-external',
        'non-module script sources to be absent from the generated host',
        'Move the script into the production module entry before packaging.',
        { src: attributeValue(element, 'src') },
      );
    }
  }

  const orderedResources = [...resources.values()].sort((left, right) =>
    left.path.localeCompare(right.path),
  );
  const payloads: Uint8Array[] = [];
  const payloadIndices = new Map<string, number>();
  const assetManifestSource = JSON.stringify(orderedResources.map((resource) => {
    const digest = _singleHtmlDigest('sha256').update(resource.bytes).digest('hex');
    let index = payloadIndices.get(digest);
    if (index === undefined) { index = payloads.length; payloadIndices.set(digest,index); payloads.push(_singleHtmlGzip(resource.bytes,{level:6})); }
    return {path:resource.path,mime:resource.mediaType,index,encoding:'gzip'};
  }));
  const assetManifestNode = `<script type="application/json" id="forgeax-asset-payload" data-forgeax-asset-payload>${safeScriptText(assetManifestSource)}</script>`;
  const assetDataNodes = payloads.map((bytes,index) => `<script type="application/octet-stream" data-forgeax-asset-index="${index}">${Buffer.from(bytes).toString('base64')}</script>`).join('');
  const assetNode = `${assetManifestNode}${assetDataNodes}`;
  const bootstrap = `<script type="application/javascript">${safeScriptText(runtimeBootstrap())}</script>`;
  const entry = `<script type="module">${safeScriptText(bundle.entrySource)}</script>`;
  const withResources = applyReplacements(indexHtml, replacements);
  const body = `${assetNode}${bootstrap}${entry}`;
  const html = withResources.includes('</body>')
    ? withResources.replace(/<\/body>/i, () => `${body}</body>`)
    : `${withResources}${body}`;
  return { ok: true, value: { html, embeddedAssets: resources.size } };
}

export async function writeSingleHtml(
  options: SingleHtmlPackageOptions,
): Promise<CommandResult<SingleHtmlPackageResult>> {
  const distRoot = resolve(options.distRoot);
  const output = resolve(options.output);
  const checksumPath = `${output}.sha256`;
  const temporary = `${output}.partial-${process.pid}`;
  const temporaryChecksum = `${checksumPath}.partial-${process.pid}`;
  let staticGraphRoot: string | undefined;
  try {
    staticGraphRoot = await (await import('node:fs/promises')).realpath(await mkdtemp(resolve(tmpdir(), 'forgeax-single-html-static-')));
    const indexHtml = await readFile(resolve(distRoot, 'index.html'), 'utf8');
    const resources = await distResources(distRoot, options.manifest);
    const registered = registerSingleHtmlModules([...resources,...options.bundle.artifacts]);
    const built = buildHtml(indexHtml, registered, {
      entrySource: options.bundle.entrySource,
      artifacts: [],
    });
    if (!built.ok) return built;
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
  } catch (cause) {
    return toErrorResult(
      cause,
      'single-html-write-failed',
      'the single HTML candidate and adjacent SHA-256 to be written atomically',
      'Repair the dist closure or output directory, then retry packaging.',
    );
  } finally {
    await Promise.all([
      rm(temporary, { force: true }),
      rm(temporaryChecksum, { force: true }),
      ...(staticGraphRoot === undefined
        ? []
        : [rm(staticGraphRoot, { recursive: true, force: true })]),
    ]);
  }
}

export function packageFormatError(format: string): CommandResult<never> {
  return errorResult(
    'package-format-unsupported',
    'package format to be web-zip or single-html',
    'Use web-zip for HTTPS hosting or single-html for a self-contained file:// delivery.',
    { format },
  );
}

export function packageOutputError(
  output: string,
  format: 'web-zip' | 'single-html',
): CommandResult<never> {
  const expectedSuffix = format === 'single-html' ? '.html' : '.zip';
  return errorResult(
    'package-output-suffix-mismatch',
    `package output to end with ${expectedSuffix}`,
    `Use a ${expectedSuffix} output path for ${format}.`,
    { output, format },
  );
}
