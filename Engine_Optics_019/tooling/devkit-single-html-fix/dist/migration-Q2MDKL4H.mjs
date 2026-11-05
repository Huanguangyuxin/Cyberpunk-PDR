#!/usr/bin/env node
import { pluginProgramSource, pluginRuntimeProjection } from './chunk-WBZD4GEB.mjs';
import { projectToolProjection } from './chunk-A2W6KPHB.mjs';
import { discoverPluginAssets, pluginAssetClosure } from './chunk-5KRT3YGN.mjs';
import { isFilesystemPathWithin } from './chunk-X5IGMUF7.mjs';
import { commandError } from './chunk-VNP4GISC.mjs';
import { randomUUID } from 'crypto';
import { mkdir, lstat, readFile, mkdtemp, cp, readdir, writeFile, symlink, rm, rename } from 'fs/promises';
import { resolve, isAbsolute, dirname, basename, relative } from 'path';
import { PackageId, AssetGuid, parsePackSourceJson } from '@forgeax/engine-pack/source';
import { GameProjectSchema } from '@forgeax/engine-project';
import ts from 'typescript';
import { build } from 'vite';

function invalid(path, reason) {
  throw {
    code: "plugin-migration-rewrite-required",
    expected: "static project entries and native composition",
    hint: "rewrite the reported dynamic behavior before rerunning migration",
    detail: { path, reason }
  };
}
function entries(value, path) {
  if (!Array.isArray(value)) invalid(path, "plugins/group config must be an array");
  return value.map((raw, index) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw))
      invalid(`${path}[${index}]`, "expected an entry");
    const entry = raw;
    if (typeof entry.id !== "string" || !entry.id || typeof entry.name !== "string" || !entry.name || entry.realm !== void 0 && !["engine", "host", "build", "frontend"].includes(entry.realm) || entry.disabled !== void 0 && typeof entry.disabled !== "boolean" || entry.group !== void 0 && typeof entry.group !== "boolean" || entry.inject !== void 0 && (!Array.isArray(entry.inject) || entry.inject.some((key) => typeof key !== "string")))
      invalid(path, "invalid static entry");
    if (Object.keys(entry).some(
      (key) => !["id", "name", "realm", "config", "disabled", "group", "inject"].includes(key)
    ))
      invalid(path, "entry has custom lifecycle or scope controls");
    return entry;
  });
}
function migrateStaticGroups(source, path) {
  if (!/\b(?:definePluginGroup|usePlugin)\b/.test(source)) return source;
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const edits = [];
  const groupNames = /* @__PURE__ */ new Set(), useNames = /* @__PURE__ */ new Set();
  for (const statement of file.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier) || !["@forgeax/engine/plugin", "@forgeax/engine-plugin"].includes(statement.moduleSpecifier.text))
      continue;
    const bindings = statement.importClause?.namedBindings;
    if (!bindings || !ts.isNamedImports(bindings)) continue;
    const keep = bindings.elements.filter((element) => {
      const name = (element.propertyName ?? element.name).text;
      if (name === "definePluginGroup") {
        groupNames.add(element.name.text);
        return false;
      }
      if (name === "usePlugin") {
        useNames.add(element.name.text);
        return false;
      }
      return true;
    });
    if (keep.length !== bindings.elements.length)
      edits.push({
        start: statement.getStart(file),
        end: statement.end,
        text: keep.length ? `import { ${keep.map((item) => item.getText(file)).join(", ")} } from ${statement.moduleSpecifier.getText(file)};` : ""
      });
  }
  let converted = 0;
  function visit(node) {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && groupNames.has(node.expression.text)) {
      const options = node.arguments[0];
      if (node.arguments.length !== 1 || !options || !ts.isObjectLiteralExpression(options))
        invalid(path, "dynamic Group options");
      const fields = /* @__PURE__ */ new Map();
      for (const property of options.properties) {
        if (!ts.isPropertyAssignment(property) || !ts.isIdentifier(property.name))
          invalid(path, "dynamic Group properties");
        fields.set(property.name.text, property.initializer);
      }
      if ([...fields.keys()].some((key) => !["name", "children"].includes(key)))
        invalid(path, "Group hooks or service controls need native source ownership");
      const children = fields.get("children");
      if (!children || !ts.isArrowFunction(children) || children.parameters.length || !ts.isArrayLiteralExpression(children.body))
        invalid(path, "dynamic children or captured configuration");
      const calls = children.body.elements.map((child) => {
        if (!ts.isCallExpression(child) || !ts.isIdentifier(child.expression) || !useNames.has(child.expression.text) || child.arguments.length < 1 || child.arguments.length > 3 || child.arguments[0] === void 0 || !ts.isIdentifier(child.arguments[0]))
          invalid(path, "child must name a native plugin");
        const config = child.arguments[1];
        if (config && !isStaticValue(config))
          invalid(path, "child configuration captures executable state");
        const options2 = child.arguments[2];
        if (options2 && (!ts.isObjectLiteralExpression(options2) || options2.properties.some(
          (item) => !ts.isPropertyAssignment(item) || item.name.getText(file) !== "key"
        )))
          invalid(path, "child has update/scope controls");
        return `ctx.plugin(${child.arguments[0].getText(file)}${config ? `, ${config.getText(file)}` : ""});`;
      });
      edits.push({
        start: node.getStart(file),
        end: node.end,
        text: `{ ${fields.has("name") ? `name: ${fields.get("name")?.getText(file)}, ` : ""}apply(ctx: import('@forgeax/engine/plugin').Context) { ${calls.join(" ")} } }`
      });
      converted++;
      return;
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  if (!converted) invalid(path, "Group helpers could not be statically migrated");
  for (const edit of edits.sort((a, b) => b.start - a.start))
    source = source.slice(0, edit.start) + edit.text + source.slice(edit.end);
  return source;
}
function isStaticValue(node) {
  if (ts.isStringLiteralLike(node) || ts.isNumericLiteral(node) || [ts.SyntaxKind.TrueKeyword, ts.SyntaxKind.FalseKeyword, ts.SyntaxKind.NullKeyword].includes(
    node.kind
  ) || ts.isIdentifier(node) && node.text === "undefined")
    return true;
  if (ts.isArrayLiteralExpression(node))
    return node.elements.every((element) => isStaticValue(element));
  if (ts.isObjectLiteralExpression(node))
    return node.properties.every(
      (item) => ts.isPropertyAssignment(item) && !ts.isComputedPropertyName(item.name) && isStaticValue(item.initializer)
    );
  return ts.isPrefixUnaryExpression(node) && ts.isNumericLiteral(node.operand);
}
async function pluginMigrateCommand(options) {
  const root = resolve(options.root ?? process.cwd()), output = resolve(options.output);
  let temporary;
  const lock = `${output}.migration.lock`;
  let locked = false;
  try {
    let convert2 = function(input, inherited) {
      if (seen.has(input.id)) invalid(input.id, "duplicate entry ID");
      seen.add(input.id);
      const realm = input.realm ?? inherited, key = `plugin/${input.id}`;
      if (input.group) {
        if (input.inject?.length)
          invalid(input.id, "group injection needs explicit native source composition");
        const children = entries(input.config, input.id);
        if (children.some((child) => child.realm && child.realm !== realm))
          invalid(input.id, "cross-realm group");
        const references = children.map((child) => ({ child, guid: convert2(child, realm) })).filter(({ child }) => !child.disabled).map(({ guid }) => ({ $asset: guid }));
        assets[key] = {
          kind: "plugin",
          payload: {
            module: { specifier: "./migration.ts", export: "compose" },
            config: { children: references }
          }
        };
      } else {
        if (isAbsolute(input.name) || input.name.startsWith("..") || input.name.includes("\\"))
          invalid(input.id, "entry module must be project-relative ./ or an npm specifier");
        const specifier = input.name.startsWith("./") ? `../../${input.name.slice(2)}` : input.name;
        if (input.inject?.length) {
          const name = `entry${source.length}`;
          source.push(
            `import ${name} from ${JSON.stringify(specifier)};
export const ${name}WithDependencies = { inject: ${JSON.stringify(input.inject)}, apply(ctx: Context, config: unknown) { ctx.plugin(${name}, config); } };`
          );
          assets[key] = {
            kind: "plugin",
            payload: {
              module: { specifier: "./migration.ts", export: `${name}WithDependencies` },
              ...input.config === void 0 ? {} : { config: input.config }
            }
          };
        } else
          assets[key] = {
            kind: "plugin",
            payload: {
              module: { specifier },
              ...input.config === void 0 ? {} : { config: input.config }
            }
          };
      }
      return assetId(key);
    };
    var convert = convert2;
    await mkdir(dirname(output), { recursive: true });
    await mkdir(lock);
    locked = true;
    if (isFilesystemPathWithin(root, output))
      invalid(output, "output must be outside the original project");
    try {
      await lstat(output);
      invalid(output, "output already exists");
    } catch (cause) {
      if (cause.code !== "ENOENT") throw cause;
    }
    const legacy = JSON.parse(await readFile(resolve(root, "forge.json"), "utf8"));
    if (legacy.schemaVersion !== "2.0.0" || typeof legacy.id !== "string" || typeof legacy.name !== "string" || Object.keys(legacy).some(
      (key) => !["id", "name", "schemaVersion", "plugins", "defaultScene"].includes(key)
    ))
      invalid("forge.json", "expected a strict schema 2.0 project");
    const namespace = PackageId.parse(randomUUID());
    if (!namespace.ok) throw namespace.error;
    const packageId = PackageId.format(namespace.value);
    const assetId = (key) => AssetGuid.format(AssetGuid.derive(namespace.value, key));
    const assets = {};
    const roots = {};
    const source = [
      "import { joinPluginFiber, mountPluginAsset, type Context } from '@forgeax/engine/plugin';",
      "export const compose = { inject: ['assets', 'pluginPrograms'], async apply(ctx: Context, config: { children: string[] }) { for (const guid of config.children) { const result = await mountPluginAsset(ctx, guid); if (!result.ok) throw result.error; } } };"
    ];
    const seen = /* @__PURE__ */ new Set();
    const top = { host: [], engine: [], build: [], frontend: [] };
    for (const entry of entries(legacy.plugins, "plugins")) {
      const realm = entry.realm ?? "engine";
      const guid = convert2(entry, realm);
      if (!entry.disabled) {
        top[realm] ??= [];
        top[realm].push(guid);
      }
    }
    if (legacy.defaultScene !== void 0) {
      if (!AssetGuid.parse(legacy.defaultScene).ok) invalid("defaultScene", "invalid scene GUID");
      source.push(`import { worldDespawnScene } from '@forgeax/engine/scene';
export const scene = { inject: ['assets', 'world', 'pluginPrograms'], async apply(ctx: Context, config: { scene: string; children: string[] }) {
  const assets = ctx.assets;
  if (!assets) throw new Error('scene requires assets');
  const loaded = await assets.load(config.scene, 'scene'); if (!loaded.ok) throw loaded.error;
  await ctx.effect(async function* () {
    yield () => assets.release(loaded.value).unwrap();
    const root = assets.instantiate(loaded.value, ctx.world).unwrap();
    yield () => worldDespawnScene(ctx.world, root).unwrap();
    ctx.provide('migratedScene', { root, asset: assets.read(loaded.value).unwrap() });
    for (const guid of config.children) { const result = await mountPluginAsset(ctx, guid); if (!result.ok) throw result.error; yield joinPluginFiber(result.value); }
  });
} };`);
      assets["root/engine"] = {
        kind: "plugin",
        payload: {
          module: { specifier: "./migration.ts", export: "scene" },
          config: {
            scene: { $asset: legacy.defaultScene },
            children: (top.engine ?? []).map((guid) => ({ $asset: guid }))
          }
        }
      };
      roots.engine = assetId("root/engine");
    }
    for (const [realm, children] of Object.entries(top)) {
      if (roots[realm] || !children.length) continue;
      assets[`root/${realm}`] = {
        kind: "plugin",
        payload: {
          module: { specifier: "./migration.ts", export: "compose" },
          config: { children: children.map((guid) => ({ $asset: guid })) }
        }
      };
      roots[realm] = assetId(`root/${realm}`);
    }
    const manifest = GameProjectSchema.parse({
      id: legacy.id,
      name: legacy.name,
      schemaVersion: "3.0.0",
      roots
    });
    const pack = { schemaVersion: "3.0.0", packageId, assets };
    parsePackSourceJson(pack).unwrap();
    await mkdir(dirname(output), { recursive: true });
    temporary = await mkdtemp(resolve(dirname(output), `.${basename(output)}-candidate-`));
    await cp(root, temporary, {
      recursive: true,
      filter: (path) => !relative(root, path).split(/[\\/]/).some(
        (part) => [".git", "node_modules", ".forgeax", "dist", ".worktrees"].includes(part)
      )
    });
    const candidateRoot = temporary;
    async function migrateDirectory(path) {
      for (const entry of await readdir(path, { withFileTypes: true })) {
        const file = resolve(path, entry.name);
        if (entry.isDirectory()) await migrateDirectory(file);
        else if (entry.name.endsWith(".ts")) {
          let check2 = function(node) {
            if (ts.isPropertyAccessExpression(node) && /^defaultScene(?:Root)?$/.test(node.name.text))
              invalid(
                relative(candidateRoot, file),
                "move scene consumers from GameHost to the migratedScene service"
              );
            ts.forEachChild(node, check2);
          };
          var check = check2;
          const code = await readFile(file, "utf8");
          const ast = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true);
          check2(ast);
          const migrated = migrateStaticGroups(code, relative(candidateRoot, file));
          if (migrated !== code) await writeFile(file, migrated);
        }
      }
    }
    await migrateDirectory(temporary);
    await mkdir(resolve(temporary, "assets/migrated"), { recursive: true });
    await writeFile(resolve(temporary, "assets/migrated/migration.ts"), source.join("\n"));
    await writeFile(
      resolve(temporary, "assets/migrated/plugins.pack.json"),
      `${JSON.stringify(pack, null, 2)}
`
    );
    await writeFile(resolve(temporary, "forge.json"), `${JSON.stringify(manifest, null, 2)}
`);
    const modules = resolve(root, "node_modules");
    let linked = false;
    try {
      if ((await lstat(modules)).isDirectory() || (await lstat(modules)).isSymbolicLink()) {
        await symlink(modules, resolve(temporary, "node_modules"), "dir");
        linked = true;
      }
    } catch (cause) {
      if (cause.code !== "ENOENT") throw cause;
    }
    const inventory = await discoverPluginAssets({ root: temporary, assetRoots: ["assets"] });
    const { tools } = await projectToolProjection(temporary, inventory);
    for (const [target, guid] of Object.entries(roots)) {
      const input = resolve(temporary, ".forgeax/migration", `${target}.ts`);
      await mkdir(dirname(input), { recursive: true });
      await writeFile(
        input,
        `${pluginProgramSource(
          pluginAssetClosure(inventory, guid),
          target,
          [],
          tools,
          temporary
        )}
export const validation = createPrograms("migration", "candidate", 0);`
      );
      await build({
        root: temporary,
        configFile: false,
        logLevel: "silent",
        plugins: [pluginRuntimeProjection(temporary)],
        build: {
          write: false,
          ...target === "build" || target === "host" ? { ssr: input } : { lib: { entry: input, formats: ["es"], fileName: "candidate" } },
          target: "esnext",
          minify: false
        }
      });
    }
    await rm(resolve(temporary, ".forgeax"), { recursive: true, force: true });
    if (linked) await rm(resolve(temporary, "node_modules"));
    await rename(temporary, output);
    temporary = void 0;
    return { ok: true, value: { output, manifest, definitions: Object.keys(assets).length } };
  } catch (cause) {
    return { ok: false, error: commandError(cause, "plugin-migration-failed") };
  } finally {
    try {
      if (temporary) await rm(temporary, { recursive: true, force: true });
    } finally {
      if (locked) await rm(lock, { recursive: true });
    }
  }
}

export { migrateStaticGroups, pluginMigrateCommand };
//# sourceMappingURL=migration-Q2MDKL4H.mjs.map
//# sourceMappingURL=migration-Q2MDKL4H.mjs.map