#!/usr/bin/env node
import { specializeComputeEntries } from '@forgeax/engine-naga';

async function precomputePipelineLibrary(manifest) {
  if (manifest.computeEntryModules !== void 0) return manifest;
  const entries = /* @__PURE__ */ new Map();
  for (const { compute } of manifest.computePipelines) {
    if (compute.entryPoint === void 0) continue;
    let names = entries.get(compute.module);
    if (names === void 0) {
      names = /* @__PURE__ */ new Set();
      entries.set(compute.module, names);
    }
    names.add(compute.entryPoint);
  }
  const projectedEntries = [];
  const uses = /* @__PURE__ */ new Map();
  for (const [module, names] of entries) {
    const descriptor = manifest.shaders[module];
    if (descriptor === void 0) throw new Error("Missing compute pipeline shader");
    const projected = await specializeComputeEntries(descriptor.code, [...names]);
    if (!projected.ok) throw projected.error;
    for (const { entryPoint, source } of projected.value) {
      if (source === descriptor.code) continue;
      projectedEntries.push({ module, entryPoint, source });
      uses.set(source, (uses.get(source) ?? 0) + 1);
    }
  }
  const shaders = [...manifest.shaders];
  const sources = new Map(shaders.map((shader, id) => [shader.code, id]));
  const computeEntryModules = [];
  for (const { module, entryPoint, source } of projectedEntries) {
    if ((uses.get(source) ?? 0) < 2) continue;
    let specializedModule = sources.get(source);
    if (specializedModule === void 0) {
      specializedModule = shaders.length;
      shaders.push({ code: source });
      sources.set(source, specializedModule);
    }
    computeEntryModules.push({ module, entryPoint, specializedModule });
  }
  return computeEntryModules.length === 0 ? manifest : { ...manifest, shaders, computeEntryModules };
}

export { precomputePipelineLibrary };
//# sourceMappingURL=pipeline-library-JKXGS7BB.mjs.map
//# sourceMappingURL=pipeline-library-JKXGS7BB.mjs.map