#!/usr/bin/env node
import { bindPreviewHost } from '@forgeax/engine-preview';
import materialPreviewPlugin, { materialPreview } from '@forgeax/engine-preview/material';
import meshPreviewPlugin, { meshPreview } from '@forgeax/engine-preview/mesh';
import texturePreviewPlugin, { texturePreview } from '@forgeax/engine-preview/texture';
import vfxPreviewPlugin, { vfxPreview } from '@forgeax/engine-preview/vfx';

var nativePreviewPlugins = [
  ["@forgeax/engine-preview/material", materialPreviewPlugin, materialPreview],
  ["@forgeax/engine-preview/mesh", meshPreviewPlugin, meshPreview],
  ["@forgeax/engine-preview/vfx", vfxPreviewPlugin, vfxPreview],
  ["@forgeax/engine-preview/texture", texturePreviewPlugin, texturePreview]
];
var nativePreviewTools = nativePreviewPlugins.map(
  ([, , tool]) => tool
);
var nativePreviewDescriptors = nativePreviewTools.map(
  ({ descriptor }) => descriptor
);
function createNativePreviewPlugin(host, name) {
  const selected = nativePreviewPlugins.find(([candidate]) => candidate === name);
  if (!selected) throw new TypeError(`unknown preview plugin ${name}`);
  return bindPreviewHost(selected[1], host);
}

export { createNativePreviewPlugin, nativePreviewDescriptors, nativePreviewPlugins, nativePreviewTools };
//# sourceMappingURL=chunk-WTUHF6YQ.mjs.map
//# sourceMappingURL=chunk-WTUHF6YQ.mjs.map