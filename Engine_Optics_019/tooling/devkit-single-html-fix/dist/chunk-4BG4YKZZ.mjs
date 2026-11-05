#!/usr/bin/env node
import { discoverPluginAssets } from './chunk-5KRT3YGN.mjs';
import { isFilesystemPathWithin } from './chunk-X5IGMUF7.mjs';
import { readProjectFacts, commandError } from './chunk-VNP4GISC.mjs';
import { randomUUID } from 'crypto';
import { mkdir, writeFile, readFile, rename, rm } from 'fs/promises';
import { resolve, basename, dirname } from 'path';
import { parsePackSourceJson, AssetGuid } from '@forgeax/engine-pack/source';
import { PluginRealmSchema, GameProjectSchema } from '@forgeax/engine-project';

async function pluginCreateCommand(options) {
  try {
    const facts = await readProjectFacts(options.root);
    if (!facts.ok) return facts;
    const path = resolve(facts.value.root, options.path);
    const scriptable = path.endsWith(".pack.ts");
    if (!scriptable && !path.endsWith(".pack.json") || !isFilesystemPathWithin(facts.value.root, path)) {
      throw new TypeError("plugin source path must be a project-local .pack.ts or .pack.json file");
    }
    const inline = options.module === void 0;
    if (inline && !scriptable)
      throw new TypeError(
        ".pack.json requires a module; use .pack.ts to create a same-file plugin"
      );
    if (inline && options.export === "default")
      throw new TypeError("the default export of .pack.ts is the Pack; use a named plugin export");
    const packageId = options.packageId ?? randomUUID();
    const sourceKey = options.sourceKey ?? "plugin/main";
    const payload = {
      module: {
        specifier: options.module ?? `./${basename(path)}`,
        ...inline ? { export: options.export ?? "plugin" } : options.export === void 0 ? {} : { export: options.export }
      },
      ...options.config === void 0 ? {} : { config: options.config }
    };
    const pack = {
      schemaVersion: "3.0.0",
      packageId,
      assets: {
        [sourceKey]: {
          kind: "plugin",
          payload
        }
      }
    };
    const parsed = parsePackSourceJson(pack);
    if (!parsed.ok) throw parsed.error;
    const guid = AssetGuid.format(AssetGuid.derive(parsed.value.packageId, sourceKey));
    const outputs = JSON.stringify(
      { [sourceKey]: { kind: "plugin", ...payload } },
      null,
      2
    ).replace(/^(\s*)"__proto__":/gm, '$1["__proto__"]:');
    const source = scriptable ? `import { definePack, definePackageId } from '@forgeax/engine/pack/source';
import { ok } from '@forgeax/engine/types';
${inline ? `import type { Plugin } from '@forgeax/engine/plugin';

const plugin: Plugin = {
  apply(ctx) {
    ctx.effect(() => {
      // Install this behavior's systems, services, or listeners here.
      return () => {
        // Release the contributions owned by this installation.
      };
    });
  },
};
export { plugin as ${JSON.stringify(options.export ?? "plugin")} };

` : ""}export default definePack({
  schemaVersion: '2.0.0',
  plugins: true,
  packageId: definePackageId(${JSON.stringify(packageId)}),
  build: () => ok(${outputs}),
});
` : `${JSON.stringify(pack, null, 2)}
`;
    if (!options.dryRun) {
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, source, { flag: "wx" });
    }
    return { ok: true, value: { path, guid, source, dryRun: options.dryRun === true } };
  } catch (cause) {
    return { ok: false, error: commandError(cause, "plugin-asset-create-failed") };
  }
}
async function pluginInspectCommand(options = {}) {
  try {
    const facts = await readProjectFacts(options.root);
    if (!facts.ok) return facts;
    const inventory = await discoverPluginAssets(facts.value);
    return {
      ok: true,
      value: {
        roots: facts.value.roots,
        deferred: inventory.deferred,
        assets: [...inventory.assets.values()].filter((record) => !options.guid || record.definition.guid === options.guid).map((record) => ({
          ...record.definition,
          sourcePath: record.sourcePath,
          sourceKey: record.sourceKey,
          refs: record.refs,
          lifecycle: "definition",
          execution: "not-observed"
        }))
      }
    };
  } catch (cause) {
    return { ok: false, error: commandError(cause, "plugin-asset-inspect-failed") };
  }
}
async function pluginRootCommand(options) {
  const root = resolve(options.root ?? process.cwd());
  const path = resolve(root, "forge.json");
  const lock = `${path}.lock`;
  const temporary = `${path}.${randomUUID()}.tmp`;
  let locked = false;
  try {
    if (!PluginRealmSchema.safeParse(options.realm).success)
      throw new TypeError("invalid root realm");
    const raw = await readFile(path, "utf8");
    const manifest = GameProjectSchema.parse(JSON.parse(raw));
    if (options.guid !== null) {
      if (!AssetGuid.parse(options.guid).ok)
        throw new TypeError("root requires a canonical GUID or null");
      const facts = await readProjectFacts(root);
      if (!facts.ok) return facts;
      const inventory = await discoverPluginAssets(facts.value);
      if (!inventory.assets.has(options.guid))
        throw new TypeError(`plugin definition ${options.guid} not found`);
      manifest.roots[options.realm] = options.guid;
    } else delete manifest.roots[options.realm];
    if (!options.dryRun) {
      await mkdir(lock);
      locked = true;
      if (await readFile(path, "utf8") !== raw)
        throw new Error("project changed during root validation");
      await writeFile(temporary, `${JSON.stringify(manifest, null, 2)}
`, { flag: "wx" });
      await rename(temporary, path);
    }
    return { ok: true, value: { manifest, dryRun: options.dryRun === true } };
  } catch (cause) {
    return { ok: false, error: commandError(cause, "plugin-root-update-failed") };
  } finally {
    await rm(temporary, { force: true });
    if (locked) await rm(lock, { recursive: true });
  }
}

export { pluginCreateCommand, pluginInspectCommand, pluginRootCommand };
//# sourceMappingURL=chunk-4BG4YKZZ.mjs.map
//# sourceMappingURL=chunk-4BG4YKZZ.mjs.map