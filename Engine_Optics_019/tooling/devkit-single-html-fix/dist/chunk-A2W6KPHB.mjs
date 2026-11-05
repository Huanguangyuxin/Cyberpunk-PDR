#!/usr/bin/env node
import { discoverPluginAssets, assertPluginSourceInputs, capturePluginProgramInputs } from './chunk-5KRT3YGN.mjs';
import { readProjectFacts } from './chunk-VNP4GISC.mjs';
import { createHash } from 'crypto';
import { resolve, dirname } from 'path';
import { isToolCommandContract, commandContribution } from '@forgeax/engine-tool-runtime';

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
async function discoverHostPackTools(hostPack) {
  const pack = resolve(hostPack);
  const root = dirname(pack);
  const inventory = await discoverPluginAssets({ root, assetRoots: [pack] });
  if (inventory.deferred.length)
    throw new Error(`Host Pack command discovery is deferred: ${pack}`);
  return readProjectToolContracts(root, inventory, {});
}
async function projectToolProjection(root, inventory) {
  return {
    tools: await readProjectToolContracts(root, inventory, {}),
    deferredSources: inventory.deferred
  };
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

export { discoverHostPackTools, discoverProjectTools, projectToolProjection };
//# sourceMappingURL=chunk-A2W6KPHB.mjs.map
//# sourceMappingURL=chunk-A2W6KPHB.mjs.map