import {
  BARREL_DISTORTION_FEATURE_IDENTITY,
  BARREL_DISTORTION_POST_PROCESS_ID,
  CLOUD_LAYER_FEATURE_IDENTITY,
  addStandardTransparentPasses
} from "./chunk-BYYRQEH4.mjs";
import {
  addDepthPyramidPasses,
  computeBindGroup,
  computePipelineError,
  createComputeState,
  createSsrSpatialResources,
  resolvedGraphBuffer,
  resolvedGraphView
} from "./chunk-TI3O7TOU.mjs";
import {
  DECAL_TEXTURE_FIELDS,
  MAX_PROJECTED_DECALS,
  ProjectedDecalInvalidError,
  WORLD_CAPSULE_STRIDE
} from "./chunk-MVY4ZZCX.mjs";
import {
  addStandardSceneDataPass,
  aggregateTemporalDemand,
  createStandardSceneDataTarget,
  requireStandardTemporalLane
} from "./chunk-COM64KIQ.mjs";
import {
  BYTES_PER_DIRECT_LIGHT_SLOT,
  DEFAULT_STANDARD_PROFILE,
  DEFERRED_ATTACHMENT_BYTES,
  DEFERRED_COLOR_FORMATS,
  IBL_UNIFORM_SLOT_STRIDE,
  SCENE_DATA_TEMPORAL_V1_SCHEMA,
  SHADOW_DEPTH_LAYER_USAGE,
  STANDARD_LIGHT_COUNTS,
  STANDARD_PIPELINE_ID,
  STANDARD_VISIBLE_SURFACE_FORMAT,
  SUBSURFACE_ATTACHMENT_BYTES,
  SUBSURFACE_DEFERRED_COLOR_FORMATS,
  TYPED_BLOOM_PASS_NAMES,
  addAtmosphereLuts,
  addObservationCapturePass,
  addReflectionFallbackObservationPass,
  addTypedBloomPasses,
  addTypedCompositePostEffects,
  addTypedFrameObservationPass,
  addTypedFullscreenPass,
  addTypedOutputTransformPass,
  addTypedScenePass,
  addTypedSkyboxPass,
  addTypedSsaoPasses,
  addTypedTemporalResolvePass,
  atmosphereStorage,
  atmosphereTextures,
  atmosphereVisibilityAccesses,
  atmosphereVisibilityGroup,
  atmosphereVisibilityLayout,
  buildPerFrameBindGroups,
  createPmremPipeline,
  createRenderPipelineTarget,
  encodeDirectionalShadowPass,
  encodePointShadowPass,
  encodeSpotShadowPass,
  encodeStaticShadowPass,
  getOrCreateHdrpBuffers,
  iblPrefilterGroup0Entries,
  importRenderPipelineSurface,
  pmremExtent,
  pmremLevelCount,
  pmremViewport,
  postProcessShaderModuleLabel,
  prepareMaterialSkylight,
  renderExtentSize,
  renderPipelineCloudHistoryTargets,
  resolveOutputDither,
  resolveVolumetricFogProfile,
  shadowViewIdentityKey,
  shadowViewRasterAccesses,
  stageAtmospherePublish,
  standardBloomAdmitted,
  standardClusterTextureLayout,
  writeAllPrefilterUniforms
} from "./chunk-JWVQREUV.mjs";
import {
  AutoExposureCapabilityUnavailableError,
  COLOR_PASS_SELECTOR,
  DEFERRED_PASS_SELECTOR,
  FORWARD_PASS_SELECTOR,
  GPU_BUFFER_USAGE_COPY_DST,
  GPU_BUFFER_USAGE_STORAGE,
  GPU_BUFFER_USAGE_UNIFORM,
  GPU_SHADER_STAGE_COMPUTE,
  GPU_SHADER_STAGE_FRAGMENT,
  GPU_SHADER_STAGE_VERTEX,
  GPU_TEXTURE_USAGE_COPY_DST,
  GPU_TEXTURE_USAGE_COPY_SRC,
  GPU_TEXTURE_USAGE_RENDER_ATTACHMENT,
  GPU_TEXTURE_USAGE_RENDER_ATTACHMENT_AND_TEXTURE_BINDING,
  GPU_TEXTURE_USAGE_TEXTURE_BINDING,
  LENS_FLARE_GHOST_COUNT,
  MAX_VOLUMETRIC_FOG_OWNERS,
  MOTION_BLUR_PARAMS_BYTE_SIZE,
  PointShadowAtlasUninitializedError,
  REFRACTION_INNER_PASS_SELECTOR,
  REFRACTION_OUTER_PASS_SELECTOR,
  RenderFeatureCapabilityMissingError,
  STANDARD_OUTPUT_TRANSFORM_FEATURE_ID,
  SceneDataUnavailableError,
  StandardProfileInvalidError,
  TRANSMISSION_BACK_PASS_SELECTOR,
  VIEW_UNIFORM_BYTES,
  cameraLensProjection,
  computeProjectionMatrix,
  computeViewMatrix,
  deriveRenderDataTexture,
  effectiveMotionBlurSampleCount,
  getOrCreateDirectDfgLut,
  getOrCreateFromChain,
  getSsaoParameters,
  materialUsesDirectDfgLut,
  motionBlurExposureScale,
  motionBlurTemporalDemand,
  validateMotionBlurParams,
  writeAtmosphereUniform
} from "./chunk-XAU6MWMX.mjs";

// sdk/engine/node_modules/@forgeax/engine-render/src/volume/programs.ts
import { RhiError } from "@forgeax/engine-rhi";

// sdk/engine/node_modules/@forgeax/engine-render/src/volume/resources.ts
import { ok } from "@forgeax/engine-types";
var VOLUME_FROXEL_FORMAT = "rgba8unorm";
var VOLUME_HISTORY_FORMAT = "rgba16float";
var VOLUME_RESOLVED_FORMAT = "rgba16float";
var VOLUME_PACKING_Z = 4;
var VOLUMETRIC_FOG_PARAMS_BYTES = (1 + MAX_VOLUMETRIC_FOG_OWNERS) * 9 * 16;
function deriveVolumetricFogExtent(surface, depth2 = 64, tileSize = 4) {
  const physicalTileSize = Math.max(2, Math.floor(tileSize / 2));
  return {
    width: Math.max(1, Math.ceil(surface.width / physicalTileSize)),
    height: Math.max(1, Math.ceil(surface.height / physicalTileSize)),
    depth: Math.max(1, depth2)
  };
}
function deriveVolumetricFogResolvedExtent(surface, froxelTileSize = 4) {
  const resolveTileSize = froxelTileSize === 4 ? 8 : Math.max(1, froxelTileSize);
  return deriveVolumetricFogExtent(surface, 1, resolveTileSize);
}
function inspectVolumetricFogResources(graph, options = {}) {
  const volumeResources = graph.resources.filter(
    (resource) => resource.label === "volume-froxel" || resource.label === "volume-resolved-current" || resource.label === "volume-history" || resource.label === "volume-temporal" || resource.label === "volume-params"
  );
  const bytes = (label) => volumeResources.filter((resource) => resource.label === label).reduce((total, resource) => total + (resource.byteSize ?? 0), 0);
  const graphParameterResources = volumeResources.filter(
    (resource) => resource.label === "volume-params"
  );
  const graphParameterBufferCount = graphParameterResources.length;
  const parameterBufferCount = Math.max(
    0,
    Math.floor(options.parameterBufferCount ?? graphParameterBufferCount)
  );
  const froxel = volumeResources.find((resource) => resource.label === "volume-froxel");
  const froxelExtent = froxel?.extent;
  const resolvedExtent = volumeResources.find(
    (resource) => resource.label === "volume-resolved-current"
  )?.extent;
  const currentBytes = bytes("volume-resolved-current");
  const historyBytes = bytes("volume-history") + bytes("volume-temporal");
  const scratchBytes = bytes("volume-froxel");
  const bufferBytes = parameterBufferCount * VOLUMETRIC_FOG_PARAMS_BYTES;
  const physicalAllocations = /* @__PURE__ */ new Set();
  for (const resource of volumeResources) {
    if (resource.label === "volume-params") continue;
    physicalAllocations.add(resource.physicalAllocationKey ?? resource.label);
  }
  const totalBytes = currentBytes + historyBytes + scratchBytes + bufferBytes;
  return Object.freeze({
    generation: graph.generation,
    liveResourceCount: volumeResources.length - graphParameterBufferCount + parameterBufferCount,
    currentBytes,
    historyBytes,
    scratchBytes,
    bufferBytes,
    totalBytes,
    physicalResourceCount: physicalAllocations.size + parameterBufferCount,
    sampleCount: froxelExtent === void 0 ? 0 : froxelExtent.width * froxelExtent.height * froxelExtent.depthOrArrayLayers * VOLUME_PACKING_Z,
    resolvedPixelCount: resolvedExtent === void 0 ? 0 : resolvedExtent.width * resolvedExtent.height
  });
}
function textureDescriptor(format, extent) {
  return {
    format,
    size: {
      width: extent.width,
      height: extent.height,
      depthOrArrayLayers: Math.ceil(extent.depth / VOLUME_PACKING_Z)
    },
    dimension: "2d"
  };
}
function resolvedDescriptor(extent) {
  return {
    format: VOLUME_RESOLVED_FORMAT,
    size: { width: extent.width, height: extent.height, depthOrArrayLayers: 1 },
    dimension: "2d"
  };
}
function createVolumetricFogResources(graph, extent = { width: 64, height: 64, depth: 64 }, resolvedExtent) {
  const effectiveResolvedExtent = resolvedExtent ?? {
    width: extent.width,
    height: extent.height,
    depth: 1
  };
  const froxel = graph.createTexture(
    "volume-froxel",
    textureDescriptor(VOLUME_FROXEL_FORMAT, extent)
  );
  if (!froxel.ok) return froxel;
  const froxelView = graph.view(froxel.value, {
    label: "volume-froxel.view",
    dimension: "2d-array",
    baseArrayLayer: 0,
    arrayLayerCount: Math.ceil(extent.depth / VOLUME_PACKING_Z)
  });
  if (!froxelView.ok) return froxelView;
  const resolved = graph.createTexture(
    "volume-resolved-current",
    resolvedDescriptor(effectiveResolvedExtent)
  );
  if (!resolved.ok) return resolved;
  const resolvedView = graph.view(resolved.value, {
    label: "volume-resolved-current.view",
    dimension: "2d"
  });
  if (!resolvedView.ok) return resolvedView;
  const history = graph.createTexture(
    "volume-history",
    resolvedDescriptor(effectiveResolvedExtent)
  );
  if (!history.ok) return history;
  const historyView = graph.view(history.value, { label: "volume-history.view", dimension: "2d" });
  if (!historyView.ok) return historyView;
  const temporal = graph.createTexture(
    "volume-temporal",
    resolvedDescriptor(effectiveResolvedExtent)
  );
  if (!temporal.ok) return temporal;
  const temporalView = graph.view(temporal.value, {
    label: "volume-temporal.view",
    dimension: "2d"
  });
  if (!temporalView.ok) return temporalView;
  return ok({
    extent,
    resolvedExtent: effectiveResolvedExtent,
    froxel: froxel.value,
    froxelView: froxelView.value,
    resolved: resolved.value,
    resolvedView: resolvedView.value,
    history: history.value,
    historyView: historyView.value,
    temporal: temporal.value,
    temporalView: temporalView.value
  });
}

// sdk/engine/node_modules/@forgeax/engine-render/src/volume/programs.ts
var programs = /* @__PURE__ */ new WeakMap();
function unavailable(stage) {
  return new RhiError({
    code: "rhi-not-available",
    expected: `volumetric fog ${stage} preparation remains current`,
    hint: "await renderer initialization on the active device generation before drawing"
  });
}
function programsFor(context) {
  const { deviceScope: scope, device } = context;
  if (!scope.isAlive()) throw unavailable("device scope");
  let devices = programs.get(scope);
  if (devices === void 0) {
    devices = /* @__PURE__ */ new WeakMap();
    programs.set(scope, devices);
    scope._adopt("pipeline", devices, () => {
      programs.delete(scope);
    });
  }
  let result = devices.get(device);
  if (result === void 0) {
    result = { compute: /* @__PURE__ */ new Map(), composite: /* @__PURE__ */ new Map() };
    devices.set(device, result);
  }
  return result;
}
function additionalVolumeDensityBinding(index) {
  return index < 7 ? 18 + index : 20 + index;
}
var computeEntries = {
  volume_inject: [
    { binding: 0, visibility: 4, buffer: { type: "uniform" } },
    { binding: 3, visibility: 4, texture: { sampleType: "depth", viewDimension: "2d-array" } },
    { binding: 4, visibility: 4, sampler: { type: "comparison" } },
    { binding: 5, visibility: 4, buffer: { type: "uniform" } },
    {
      binding: 6,
      visibility: 4,
      storageTexture: {
        access: "write-only",
        format: VOLUME_FROXEL_FORMAT,
        viewDimension: "2d-array"
      }
    },
    { binding: 7, visibility: 4, buffer: { type: "read-only-storage" } },
    { binding: 8, visibility: 4, buffer: { type: "uniform" } },
    { binding: 9, visibility: 4, texture: { sampleType: "depth", viewDimension: "2d-array" } }
  ],
  volume_integrate: [
    { binding: 0, visibility: 4, texture: { sampleType: "float", viewDimension: "2d-array" } },
    { binding: 1, visibility: 4, texture: { sampleType: "depth", viewDimension: "2d" } },
    {
      binding: 2,
      visibility: 4,
      storageTexture: {
        access: "write-only",
        format: VOLUME_RESOLVED_FORMAT,
        viewDimension: "2d"
      }
    },
    { binding: 3, visibility: 4, buffer: { type: "uniform" } },
    { binding: 4, visibility: 4, buffer: { type: "uniform" } },
    { binding: 5, visibility: 4, sampler: { type: "filtering" } },
    { binding: 6, visibility: 4, texture: { sampleType: "float", viewDimension: "3d" } },
    { binding: 7, visibility: 4, sampler: { type: "filtering" } },
    {
      binding: 8,
      visibility: 4,
      storageTexture: {
        access: "write-only",
        format: VOLUME_HISTORY_FORMAT,
        viewDimension: "2d"
      }
    },
    {
      binding: 9,
      visibility: 4,
      storageTexture: {
        access: "write-only",
        format: VOLUME_HISTORY_FORMAT,
        viewDimension: "2d"
      }
    },
    { binding: 10, visibility: 4, buffer: { type: "read-only-storage" } },
    { binding: 11, visibility: 4, buffer: { type: "uniform" } },
    { binding: 12, visibility: 4, texture: { sampleType: "float", viewDimension: "2d" } },
    { binding: 13, visibility: 4, sampler: { type: "filtering" } },
    { binding: 16, visibility: 4, texture: { sampleType: "float", viewDimension: "2d" } },
    { binding: 17, visibility: 4, sampler: { type: "filtering" } },
    { binding: 25, visibility: 4, texture: { sampleType: "float", viewDimension: "2d" } },
    { binding: 26, visibility: 4, sampler: { type: "filtering" } },
    ...Array.from({ length: MAX_VOLUMETRIC_FOG_OWNERS - 1 }, (_, index) => ({
      binding: additionalVolumeDensityBinding(index),
      visibility: 4,
      texture: { sampleType: "float", viewDimension: "3d" }
    }))
  ],
  volume_temporal: [
    { binding: 0, visibility: 4, texture: { sampleType: "float", viewDimension: "2d" } },
    { binding: 1, visibility: 4, texture: { sampleType: "float", viewDimension: "2d" } },
    {
      binding: 2,
      visibility: 4,
      storageTexture: {
        access: "write-only",
        format: VOLUME_HISTORY_FORMAT,
        viewDimension: "2d"
      }
    },
    { binding: 3, visibility: 4, buffer: { type: "uniform" } },
    { binding: 4, visibility: 4, buffer: { type: "uniform" } }
  ]
};
function witness(context, source, label) {
  const factory = context.shaderModuleFactory;
  const factoryMethod = factory.createShaderModule;
  const result = factoryMethod.call(factory, { code: source, label });
  if (!result.ok) throw result.error;
  return { source, factory, factoryMethod, module: result.value };
}
function sameWitness(previous, current2) {
  return previous?.source === current2.source && previous.factory === current2.factory && previous.factoryMethod === current2.factoryMethod && previous.module === current2.module;
}
function computeProgram(context, source, label) {
  const owner = programsFor(context);
  const current2 = witness(context, source, label);
  let entry = owner.compute.get(label);
  if (entry === void 0 || !sameWitness(entry, current2)) {
    entry = current2;
    owner.compute.set(label, entry);
  }
  return entry;
}
function compositeProgram(context, source, format, neighbors) {
  const owner = programsFor(context);
  const current2 = witness(context, source, "volume_composite");
  let entry = owner.composite.get(neighbors);
  if (entry === void 0 || !sameWitness(entry, current2) || entry.format !== format) {
    entry = { ...current2, format };
    owner.composite.set(neighbors, entry);
  }
  return entry;
}
function pipelineLayout(context, label, entries, named = false) {
  const layout = context.device.createBindGroupLayout({
    ...named ? { label: `${label}.bind-group-layout` } : {},
    entries
  });
  if (!layout.ok) throw layout.error;
  const pipelineLayout2 = context.device.createPipelineLayout({
    label: `${label}.layout`,
    bindGroupLayouts: [layout.value]
  });
  if (!pipelineLayout2.ok) throw pipelineLayout2.error;
  return { layout: layout.value, pipelineLayout: pipelineLayout2.value };
}
function computeDescriptor(context, entry, label) {
  const { layout, pipelineLayout: value } = pipelineLayout(context, label, computeEntries[label]);
  const descriptor = {
    label,
    layout: value,
    compute: { module: entry.module, entryPoint: label }
  };
  return { layout, descriptor };
}
function compositeDescriptor(context, entry, neighbors) {
  const { layout, pipelineLayout: value } = pipelineLayout(
    context,
    "volume_composite",
    [
      { binding: 0, visibility: 2 | 1, texture: { sampleType: "float", viewDimension: "2d" } },
      { binding: 1, visibility: 2 | 1, sampler: { type: "filtering" } },
      { binding: 2, visibility: 2 | 1, texture: { sampleType: "depth", viewDimension: "2d" } },
      { binding: 3, visibility: 2 | 1, buffer: { type: "uniform" } }
    ],
    true
  );
  const descriptor = {
    label: "volume_composite",
    layout: value,
    vertex: { module: entry.module, entryPoint: "volume_vs", buffers: [] },
    fragment: {
      module: entry.module,
      entryPoint: "volume_fs",
      constants: { VOLUME_COMPOSITE_NEIGHBORS: neighbors },
      targets: [
        {
          format: entry.format,
          blend: {
            color: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
            alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" }
          }
        }
      ]
    },
    primitive: { topology: "triangle-list" }
  };
  return { layout, descriptor };
}
function volumeComputeState(context, source, label) {
  const entry = computeProgram(context, source, label);
  if (entry.state !== void 0) return entry.state;
  if (entry.pending !== void 0) throw unavailable(`${label} pending`);
  const { layout, descriptor } = computeDescriptor(context, entry, label);
  const created = context.device.createComputePipeline(descriptor);
  if (!created.ok) throw created.error;
  entry.state = { layout, pipeline: created.value };
  return entry.state;
}
function volumeCompositeState(context, source, format, neighbors) {
  const entry = compositeProgram(context, source, format, neighbors);
  if (entry.state !== void 0) return entry.state;
  if (entry.pending !== void 0) throw unavailable("volume_composite pending");
  const { layout, descriptor } = compositeDescriptor(context, entry, neighbors);
  const created = context.device.createRenderPipeline(descriptor);
  if (!created.ok) throw created.error;
  entry.state = { layout, pipeline: created.value };
  return entry.state;
}
async function prepare(context, entry, create) {
  if (!context.deviceScope.isAlive()) throw unavailable("retired device scope");
  if (entry.state !== void 0) return;
  entry.pending ??= create();
  const pending = entry.pending;
  try {
    const state = await pending;
    if (!context.deviceScope.isAlive()) throw unavailable("retired device scope");
    entry.state = state;
  } finally {
    if (entry.pending === pending) delete entry.pending;
  }
}
async function prepareVolumePrograms(context, sources, format) {
  const prepared = [];
  const work = [];
  for (const [stage, label] of [
    ["inject", "volume_inject"],
    ["integrate", "volume_integrate"],
    ["temporal", "volume_temporal"]
  ]) {
    const entry = computeProgram(context, sources[stage], label);
    prepared.push({ label, entry });
    work.push(
      () => prepare(context, entry, async () => {
        const { layout, descriptor } = computeDescriptor(context, entry, label);
        const result = context.device.createComputePipelineAsync === void 0 ? context.device.createComputePipeline(descriptor) : await context.device.createComputePipelineAsync(descriptor);
        if (!result.ok) throw result.error;
        return { layout, pipeline: result.value };
      })
    );
  }
  for (const neighbors of [2, 4, 8]) {
    const entry = compositeProgram(context, sources.composite, format, neighbors);
    if (neighbors === 2) prepared.push({ label: "volume_composite", entry });
    work.push(
      () => prepare(context, entry, async () => {
        const { layout, descriptor } = compositeDescriptor(context, entry, neighbors);
        const result = context.device.createRenderPipelineAsync === void 0 ? context.device.createRenderPipeline(descriptor) : await context.device.createRenderPipelineAsync(descriptor);
        if (!result.ok) throw result.error;
        return { layout, pipeline: result.value };
      })
    );
  }
  await Promise.all(work.map((start) => start()));
  if (!context.deviceScope.isAlive()) throw unavailable("retired device scope");
  for (const { label, entry } of prepared) {
    if (!sameWitness(entry, witness(context, entry.source, label)))
      throw unavailable(`${label} module changed during preparation`);
  }
}

// sdk/engine/node_modules/@forgeax/engine-render/src/pipeline/single-layer-medium-passes.ts
import {
  RenderGraphError
} from "@forgeax/engine-render-graph";
import {
  SINGLE_LAYER_MEDIUM_MSAA_PAIRED_COLOR_WGSL,
  SINGLE_LAYER_MEDIUM_MSAA_RAW_DEPTH_WGSL,
  SINGLE_LAYER_MEDIUM_RAW_DEPTH_WGSL
} from "@forgeax/engine-shader";
import { err, ok as ok2 } from "@forgeax/engine-types";
var SINGLE_LAYER_MEDIUM_RAW_DEPTH_POST_PROCESS_ID = "forgeax.single-layer-medium-raw-depth";
var SINGLE_LAYER_MEDIUM_MSAA_PAIRED_COLOR_POST_PROCESS_ID = "forgeax.single-layer-medium-msaa-paired-color";
var SINGLE_LAYER_MEDIUM_MSAA_RAW_DEPTH_POST_PROCESS_ID = "forgeax.single-layer-medium-msaa-raw-depth";
function addSingleLayerMediumRawDepthProducer(input) {
  const label = input.label ?? "single-layer-medium-raw-depth";
  if (input.sourceDepth.sampleCount !== 1) {
    return err(
      new RenderGraphError({
        code: "resource-descriptor-invalid",
        expected: "single-layer medium raw-depth producer has a single-sample source depth",
        hint: "select a resolved 1x depth producer; MSAA depth resolve is not admitted yet",
        detail: {
          resourceLabel: label,
          field: "sourceDepth.sampleCount",
          expected: "1",
          actual: String(input.sourceDepth.sampleCount)
        }
      })
    );
  }
  const rawDepth = createRenderPipelineTarget(input.graph, label, {
    format: "r32float",
    size: input.size,
    sampleCount: 1
  });
  if (!rawDepth.ok) return rawDepth;
  const producer = addTypedFullscreenPass(input.graph, {
    name: `${label}-producer`,
    shader: SINGLE_LAYER_MEDIUM_RAW_DEPTH_POST_PROCESS_ID,
    input: input.sourceColor,
    outputs: [rawDepth.value],
    depth: input.sourceDepth
  });
  if (!producer.ok) return producer;
  return ok2(rawDepth.value);
}
function addSingleLayerMediumMsaaPairProducer(input) {
  if (input.sourceColor.sampleCount !== 4 || input.sourceDepth.sampleCount !== 4) {
    return err(
      new RenderGraphError({
        code: "resource-descriptor-invalid",
        expected: "single-layer medium paired MSAA producer has 4x color and depth inputs",
        hint: "route 1x inputs through the single-sample raw-depth producer",
        detail: {
          resourceLabel: input.label,
          field: "source.sampleCount",
          expected: "color=4,depth=4",
          actual: `color=${input.sourceColor.sampleCount},depth=${input.sourceDepth.sampleCount}`
        }
      })
    );
  }
  const color = createRenderPipelineTarget(input.graph, `${input.label}-color`, {
    format: input.sourceColor.format,
    size: input.size,
    sampleCount: 1,
    ...input.sourceColor.domain === void 0 ? {} : { domain: input.sourceColor.domain }
  });
  if (!color.ok) return color;
  const depth2 = createRenderPipelineTarget(input.graph, `${input.label}-depth`, {
    format: "r32float",
    size: input.size,
    sampleCount: 1
  });
  if (!depth2.ok) return depth2;
  const colorProducer = addTypedFullscreenPass(input.graph, {
    name: `${input.label}-color-producer`,
    shader: SINGLE_LAYER_MEDIUM_MSAA_PAIRED_COLOR_POST_PROCESS_ID,
    input: input.sourceColor,
    outputs: [color.value],
    depth: input.sourceDepth
  });
  if (!colorProducer.ok) return colorProducer;
  const depthProducer = addTypedFullscreenPass(input.graph, {
    name: `${input.label}-depth-producer`,
    shader: SINGLE_LAYER_MEDIUM_MSAA_RAW_DEPTH_POST_PROCESS_ID,
    input: input.sourceColor,
    outputs: [depth2.value],
    depth: input.sourceDepth
  });
  if (!depthProducer.ok) return depthProducer;
  return ok2({ color: color.value, depth: depth2.value });
}
function requireSingleLayerMediumInputs(nearestTargets, backdrop) {
  if (nearestTargets === void 0 || backdrop === void 0) {
    return err(
      new RenderGraphError({
        code: "resource-descriptor-invalid",
        expected: "single-layer medium graph has nearest targets and an opaque backdrop",
        hint: "keep the shared transmission backdrop copy ahead of the Surface passes",
        detail: {
          resourceLabel: "single-layer-medium",
          field: "backdrop",
          expected: "resolved graph texture view",
          actual: "missing"
        }
      })
    );
  }
  return ok2({ nearestTargets, backdrop });
}
function addSingleLayerMediumPasses(input) {
  const pair = input.surfacePair;
  if (pair.rawDepth.status === "unavailable") {
    return err(
      new RenderGraphError({
        code: "resource-descriptor-invalid",
        expected: "single-layer medium consumes a graph-paired sampled raw depth",
        hint: "enable an owner-approved depth-copy producer before admitting the Surface passes",
        detail: {
          resourceLabel: "single-layer-medium",
          field: "surfacePair.rawDepth",
          expected: "available sampled depth view",
          actual: pair.rawDepth.reason
        }
      })
    );
  }
  const sampled = input.sampled ?? [];
  const nearest = addTypedScenePass(input.graph, {
    name: "single-layer-medium-nearest-layer",
    color: input.nearestLayer,
    depth: input.nearestDepth,
    sampled,
    ...input.directionalShadow === void 0 ? {} : { directionalShadow: input.directionalShadow },
    ...input.spotShadow === void 0 ? {} : { spotShadow: input.spotShadow },
    ...input.cloudShadow === void 0 ? {} : { cloudShadow: input.cloudShadow },
    ...input.ssao === void 0 ? {} : { ssao: input.ssao },
    selector: FORWARD_PASS_SELECTOR,
    colorLoadOp: "clear",
    depthLoadOp: "clear",
    recordMode: "single-layer-medium-nearest-layer",
    transmissionBackdrop: pair.opaqueColor,
    surfacePair: pair,
    gpuDrivenFilter: "single-layer-medium",
    ...input.extraAccesses === void 0 ? {} : { extraAccesses: input.extraAccesses },
    ...input.gpuDriven === void 0 ? {} : { gpuDriven: input.gpuDriven }
  });
  if (!nearest.ok) return nearest;
  const nearestPair = input.nearestLayer.sampleCount === 4 ? addSingleLayerMediumMsaaPairProducer({
    graph: input.graph,
    label: "single-layer-medium-nearest-resolve",
    sourceColor: input.nearestLayer,
    sourceDepth: input.nearestDepth,
    size: input.size
  }) : (() => {
    const depth2 = addSingleLayerMediumRawDepthProducer({
      graph: input.graph,
      label: "single-layer-medium-nearest-depth-sampled",
      sourceColor: input.nearestLayer,
      sourceDepth: input.nearestDepth,
      size: input.size
    });
    return depth2.ok ? ok2({ color: input.nearestLayer, depth: depth2.value }) : depth2;
  })();
  if (!nearestPair.ok) return nearestPair;
  const colorSampled = [...sampled, nearestPair.value.color];
  const color = addTypedScenePass(input.graph, {
    name: "single-layer-medium-color",
    color: input.color,
    ...input.colorResolve === void 0 ? {} : { resolve: input.colorResolve },
    depth: input.depth,
    sampled: colorSampled,
    ...input.directionalShadow === void 0 ? {} : { directionalShadow: input.directionalShadow },
    ...input.spotShadow === void 0 ? {} : { spotShadow: input.spotShadow },
    ...input.cloudShadow === void 0 ? {} : { cloudShadow: input.cloudShadow },
    ...input.ssao === void 0 ? {} : { ssao: input.ssao },
    selector: FORWARD_PASS_SELECTOR,
    colorLoadOp: "load",
    depthLoadOp: "load",
    recordMode: "single-layer-medium-color",
    transmissionBackdrop: pair.opaqueColor,
    surfacePair: pair,
    surfaceNearestLayer: nearestPair.value.color.view,
    surfaceNearestDepth: nearestPair.value.depth.view,
    gpuDrivenFilter: "single-layer-medium",
    ...input.extraAccesses === void 0 ? {} : { extraAccesses: input.extraAccesses },
    ...input.gpuDriven === void 0 ? {} : { gpuDriven: input.gpuDriven }
  });
  if (!color.ok) return color;
  return ok2(void 0);
}
function registerSingleLayerMediumBuiltins(renderSystem) {
  renderSystem.registerBuiltinPostProcess(SINGLE_LAYER_MEDIUM_RAW_DEPTH_POST_PROCESS_ID, {
    source: SINGLE_LAYER_MEDIUM_RAW_DEPTH_WGSL,
    reads: ["input", { key: "scene-depth", sampleType: "depth" }]
  });
  const pairedMsaaReads = [
    { key: "input", sampleType: "multisampled-float" },
    { key: "scene-depth", sampleType: "depth" }
  ];
  renderSystem.registerBuiltinPostProcess(SINGLE_LAYER_MEDIUM_MSAA_PAIRED_COLOR_POST_PROCESS_ID, {
    source: SINGLE_LAYER_MEDIUM_MSAA_PAIRED_COLOR_WGSL,
    reads: pairedMsaaReads
  });
  renderSystem.registerBuiltinPostProcess(SINGLE_LAYER_MEDIUM_MSAA_RAW_DEPTH_POST_PROCESS_ID, {
    source: SINGLE_LAYER_MEDIUM_MSAA_RAW_DEPTH_WGSL,
    reads: pairedMsaaReads
  });
}

// sdk/engine/node_modules/@forgeax/engine-render/src/pipeline/standard-pipeline.ts
import {
  RenderGraphError as RenderGraphError7
} from "@forgeax/engine-render-graph";
import { err as err13, ok as ok36 } from "@forgeax/engine-types";

// sdk/engine/node_modules/@forgeax/engine-render/src/decals/graph.ts
import { ok as ok3 } from "@forgeax/engine-types";
function projectedDecalTopology(decals) {
  if (decals.length > MAX_PROJECTED_DECALS)
    throw new ProjectedDecalInvalidError(
      "count",
      `at most ${MAX_PROJECTED_DECALS} visible decals across all Worlds`
    );
  return decals.map(
    (decal) => decal.textures.map((texture) => {
      if (texture === void 0) return void 0;
      const layout = deriveRenderDataTexture(texture).unwrap();
      return {
        format: layout.format,
        size: layout.physicalExtent,
        mipLevelCount: layout.mipLevelCount,
        usage: layout.usage
      };
    })
  );
}
var PARAM_BYTES = 288;
var PARAM_STRIDE = 512;
function parameters(decal) {
  const values = new Float32Array(PARAM_BYTES / 4);
  const material = decal.material;
  const params2 = material.paramSnapshot;
  const color = params2?.baseColor;
  const normalScale = params2?.normalScale;
  values.set(decal.inverse, 0);
  values.set(decal.transform, 16);
  values.set([...material.baseColor, Array.isArray(color) ? color[3] ?? 1 : 1], 32);
  values.set([decal.colorOpacity, decal.normalOpacity, decal.roughnessOpacity, decal.opacity], 36);
  values.set(
    [
      material.roughness,
      Array.isArray(normalScale) ? normalScale[0] ?? 1 : 1,
      Array.isArray(normalScale) ? normalScale[1] ?? 1 : 1,
      decal.normalThreshold
    ],
    40
  );
  values.set(
    [
      decal.textures[1] === void 0 ? 0 : 1,
      Number(params2?.roughnessChannel ?? 1),
      Number(params2?.alphaCutoff ?? 0),
      0
    ],
    44
  );
  DECAL_TEXTURE_FIELDS.forEach((field, index) => {
    const coordinates = material.textureCoordinates?.get(field);
    const transform = coordinates?.transform;
    const scale = transform?.scale ?? [1, 1];
    const offset = transform?.offset ?? [0, 0];
    const rotation = transform?.rotation ?? 0;
    const physical = coordinates?.physicalUvScale ?? [1, 1];
    const c = Math.cos(rotation);
    const s = Math.sin(rotation);
    values.set(
      [
        c * scale[0] * physical[0],
        -s * scale[1] * physical[0],
        offset[0] * physical[0],
        0,
        s * scale[0] * physical[1],
        c * scale[1] * physical[1],
        offset[1] * physical[1],
        0
      ],
      48 + index * 8
    );
  });
  return values;
}
function current(frame, index) {
  const decal = frame.camera.projectedDecals?.[index];
  if (decal === void 0)
    throw new ProjectedDecalInvalidError("frame", "the decal count used to compile this graph");
  const internal = frame;
  const scope = internal.resourceScopes?.[decal.worldId] ?? (decal.worldId === 0 ? internal.world : void 0);
  if (scope === void 0)
    throw new ProjectedDecalInvalidError("world", "a live source resource scope");
  return { decal, internal, scope };
}
function addProjectedDecalPasses(graph, topology, input) {
  if (topology.length === 0) return ok3(input);
  const channels = [];
  const outputs = [];
  for (const name of ["color", "normal", "roughness"]) {
    const channel = createRenderPipelineTarget(graph, `decal-${name}`, {
      format: "rgba16float",
      size: input.size
    });
    if (!channel.ok) return channel;
    channels.push(channel.value);
  }
  for (const name of ["normal", "albedo", "f0"]) {
    const output = createRenderPipelineTarget(graph, `decal-surface-${name}`, {
      format: name === "f0" ? "rg32uint" : "r32uint",
      size: input.size
    });
    if (!output.ok) return output;
    outputs.push(output.value);
  }
  const uniforms = graph.createBuffer("decal-params", { size: topology.length * PARAM_STRIDE });
  if (!uniforms.ok) return uniforms;
  const view = graph.importBuffer(
    "decal-view",
    { size: VIEW_UNIFORM_BYTES, usage: GPU_BUFFER_USAGE_UNIFORM | GPU_BUFFER_USAGE_COPY_DST },
    (frame) => frame.pipelineState.viewUniformBuffer
  );
  if (!view.ok) return view;
  const textureViews = [];
  for (const [index, descriptors] of topology.entries()) {
    const views = [];
    for (const [slot, descriptor] of descriptors.entries()) {
      if (descriptor === void 0) {
        views.push(void 0);
        continue;
      }
      const resident = (frame) => {
        const { decal, internal, scope } = current(frame, index);
        const texture2 = decal.textures[slot];
        const handle = decal.material.textureHandles?.get(
          DECAL_TEXTURE_FIELDS[slot]
        );
        if (texture2 === void 0 || handle === void 0)
          throw new ProjectedDecalInvalidError("texture", "the declared texture slot");
        return internal.store.ensureResident(handle, texture2, scope).unwrap();
      };
      const texture = graph.importTexture(
        `decal-${index}-texture-${slot}`,
        descriptor,
        (frame) => resident(frame).texture.handle
      );
      if (!texture.ok) return texture;
      const view2 = graph.importView(
        texture.value,
        { dimension: "2d" },
        (frame) => resident(frame).view
      );
      if (!view2.ok) return view2;
      views.push(view2.value);
    }
    textureViews.push(views);
  }
  const upload = graph.addCopyPass("decal-prepare", {
    accesses: [{ resource: uniforms.value, usage: "copy-dst" }],
    encode: ({ frame, resources }) => {
      const buffer = resources.buffer(uniforms.value).unwrap();
      topology.forEach((_, index) => {
        frame.runtime.device.queue.writeBuffer(buffer, index * PARAM_STRIDE, parameters(current(frame, index).decal)).unwrap();
      });
    }
  });
  if (!upload.ok) return upload;
  let project;
  const projectViews = [
    input.depth,
    input.normal.view,
    ...textureViews.flat().filter((view2) => view2 !== void 0)
  ];
  const projection = graph.addRasterPass("decal-project", {
    accesses: [
      ...projectViews.map((resource) => ({ resource, usage: "sampled-read" })),
      ...channels.map(({ view: resource }) => ({ resource, usage: "color-attachment" })),
      { resource: uniforms.value, usage: "uniform-read" },
      { resource: view.value, usage: "uniform-read" }
    ],
    colorAttachments: channels.map(({ view: view2 }) => ({
      view: view2,
      loadOp: "clear",
      storeOp: "store",
      clearValue: { r: 0, g: 0, b: 0, a: 0 }
    })),
    encode: ({ pass, frame, resources }) => {
      const internal = frame;
      const device = frame.runtime.device;
      if (project === void 0) {
        const source = internal.runtime.standardDeferredShaders?.decalProject;
        const factory = frame.runtime.shaderModuleFactory;
        if (source === void 0 || factory === void 0)
          throw new ProjectedDecalInvalidError("shader", "cooked decal projection shader");
        const module = factory.createShaderModule({ code: source, label: "forgeax::engine-decal-project" }).unwrap();
        const layout = device.createBindGroupLayout({
          entries: [
            {
              binding: 0,
              visibility: GPU_SHADER_STAGE_VERTEX | GPU_SHADER_STAGE_FRAGMENT,
              buffer: { type: "uniform", hasDynamicOffset: true, minBindingSize: PARAM_BYTES }
            },
            ...["depth", "uint", "float", "float", "float"].map(
              (sampleType, index) => ({
                binding: index + 1,
                visibility: GPU_SHADER_STAGE_FRAGMENT,
                texture: { sampleType, viewDimension: "2d" }
              })
            ),
            ...[6, 7, 8].map((binding) => ({
              binding,
              visibility: GPU_SHADER_STAGE_FRAGMENT,
              sampler: { type: "filtering" }
            }))
          ]
        }).unwrap();
        const pipeline = device.createRenderPipeline({
          label: "decal-project",
          layout: device.createPipelineLayout({
            bindGroupLayouts: [internal.pipelineState.viewBindGroupLayout, layout]
          }).unwrap(),
          vertex: { module, entryPoint: "vs_main", buffers: [] },
          fragment: {
            module,
            entryPoint: "fs_main",
            targets: channels.map(({ format }) => ({
              format,
              blend: {
                color: {
                  operation: "add",
                  srcFactor: "src-alpha",
                  dstFactor: "one-minus-src-alpha"
                },
                alpha: {
                  operation: "add",
                  srcFactor: "one",
                  dstFactor: "one-minus-src-alpha"
                }
              }
            }))
          },
          primitive: { topology: "triangle-list" }
        }).unwrap();
        project = { pipeline, layout, groups: /* @__PURE__ */ new WeakMap() };
      }
      pass.setPipeline(project.pipeline);
      if (internal.viewBindGroup === null)
        throw new ProjectedDecalInvalidError("view", "a prepared camera bind group");
      pass.setBindGroup(0, internal.viewBindGroup, [internal.viewBindGroupDynamicOffset ?? 0, 0]);
      const buffer = resources.buffer(uniforms.value).unwrap();
      for (const [index, slots] of textureViews.entries()) {
        const { decal, scope } = current(frame, index);
        const views = [
          resources.textureView(input.depth).unwrap(),
          resources.textureView(input.normal.view).unwrap(),
          ...slots.map(
            (view2, slot) => view2 === void 0 ? slot === 1 ? internal.pipelineState.defaultNormalTextureView : frame.pipelineState.defaultWhiteTextureView : resources.textureView(view2).unwrap()
          )
        ];
        const samplers = DECAL_TEXTURE_FIELDS.map((field, slot) => {
          const handle = decal.material.samplerHandles?.get(field);
          const pod = decal.samplers[slot];
          return handle === void 0 || pod === void 0 ? frame.pipelineState.defaultSampler : internal.store.ensureSamplerResident(handle, pod, scope).unwrap();
        });
        const layout = project.layout;
        const group = getOrCreateFromChain(
          project.groups,
          [buffer, ...views, ...samplers],
          "decal-project",
          () => device.createBindGroup({
            layout,
            entries: [
              {
                binding: 0,
                resource: { kind: "buffer", value: { buffer, offset: 0, size: PARAM_BYTES } }
              },
              ...views.map((value, i) => ({
                binding: i + 1,
                resource: { kind: "textureView", value }
              })),
              ...samplers.map((value, i) => ({
                binding: i + 6,
                resource: { kind: "sampler", value }
              }))
            ]
          }).unwrap(),
          internal.bindGroupCounts
        );
        pass.setBindGroup(1, group, [index * PARAM_STRIDE]);
        pass.draw(6);
      }
    }
  });
  if (!projection.ok) return projection;
  let apply;
  const applyViews = [
    input.normal.view,
    input.albedo.view,
    input.f0.view,
    ...channels.map(({ view: view2 }) => view2)
  ];
  const composition = graph.addRasterPass("decal-apply", {
    accesses: [
      ...applyViews.map((resource) => ({ resource, usage: "sampled-read" })),
      ...outputs.map(({ view: resource }) => ({ resource, usage: "color-attachment" }))
    ],
    colorAttachments: outputs.map(({ view: view2 }) => ({
      view: view2,
      loadOp: "clear",
      storeOp: "store"
    })),
    encode: ({ pass, frame, resources }) => {
      const internal = frame;
      const device = frame.runtime.device;
      if (apply === void 0) {
        const source = internal.runtime.standardDeferredShaders?.decalApply;
        const factory = frame.runtime.shaderModuleFactory;
        if (source === void 0 || factory === void 0)
          throw new ProjectedDecalInvalidError("shader", "cooked decal composition shader");
        const module = factory.createShaderModule({ code: source, label: "forgeax::engine-decal-apply" }).unwrap();
        const layout2 = device.createBindGroupLayout({
          entries: applyViews.map((_, binding) => ({
            binding,
            visibility: GPU_SHADER_STAGE_FRAGMENT,
            texture: {
              sampleType: binding < 3 ? "uint" : "unfilterable-float",
              viewDimension: "2d"
            }
          }))
        }).unwrap();
        const pipeline = device.createRenderPipeline({
          label: "decal-apply",
          layout: device.createPipelineLayout({ bindGroupLayouts: [layout2] }).unwrap(),
          vertex: { module, entryPoint: "vs_main", buffers: [] },
          fragment: {
            module,
            entryPoint: "fs_main",
            targets: outputs.map(({ format }) => ({ format }))
          },
          primitive: { topology: "triangle-list" }
        }).unwrap();
        apply = { pipeline, layout: layout2, groups: /* @__PURE__ */ new WeakMap() };
      }
      const views = applyViews.map((view2) => resources.textureView(view2).unwrap());
      const layout = apply.layout;
      const group = getOrCreateFromChain(
        apply.groups,
        views,
        "decal-apply",
        () => device.createBindGroup({
          layout,
          entries: views.map((value, binding) => ({
            binding,
            resource: { kind: "textureView", value }
          }))
        }).unwrap(),
        internal.bindGroupCounts
      );
      pass.setPipeline(apply.pipeline);
      pass.setBindGroup(0, group);
      pass.draw(3);
    }
  });
  if (!composition.ok) return composition;
  return ok3({
    ...input,
    normal: outputs[0],
    albedo: outputs[1],
    f0: outputs[2]
  });
}

// sdk/engine/node_modules/@forgeax/engine-render/src/environment/background.ts
import { RhiError as RhiError3 } from "@forgeax/engine-rhi";
import { ok as ok5 } from "@forgeax/engine-types";

// sdk/engine/node_modules/@forgeax/engine-render/src/environment/ibl.ts
import {
  RhiError as RhiError2
} from "@forgeax/engine-rhi";
import { ok as ok4 } from "@forgeax/engine-types";
function addAtmosphereIbl(graph, sky, vertices, dirty) {
  const size = 64, levels = pmremLevelCount(size);
  const irradiance = graph.importTexture(
    "atmosphere-irradiance",
    {
      format: "rgba16float",
      size: { width: 16, height: 16, depthOrArrayLayers: 6 },
      usage: 20
    },
    (frame) => atmosphereStorage(frame).irradiance
  );
  if (!irradiance.ok) return irradiance;
  const prefilter2 = graph.importTexture(
    "atmosphere-prefilter",
    {
      format: "rgba16float",
      size: pmremExtent(size),
      usage: 23
    },
    (frame) => atmosphereStorage(frame).prefilter
  );
  if (!prefilter2.ok) return prefilter2;
  const scratch = graph.importTexture(
    "atmosphere-prefilter-scratch",
    {
      format: "rgba16float",
      size: pmremExtent(size),
      usage: 23
    },
    (frame) => atmosphereStorage(frame).prefilterScratch
  );
  if (!scratch.ok) return scratch;
  const irradianceView = graph.view(irradiance.value, { dimension: "cube", arrayLayerCount: 6 });
  if (!irradianceView.ok) return irradianceView;
  const prefilterView = graph.view(prefilter2.value, { dimension: "2d" });
  if (!prefilterView.ok) return prefilterView;
  const scratchView = graph.view(scratch.value, { dimension: "2d" });
  if (!scratchView.ok) return scratchView;
  const parameters2 = graph.importBuffer(
    "atmosphere-ibl-params",
    {
      size: levels * 6 * IBL_UNIFORM_SLOT_STRIDE,
      usage: 72
    },
    (frame) => atmosphereStorage(frame).iblParams
  );
  if (!parameters2.ok) return parameters2;
  const upload = graph.addCopyPass("atmosphere-ibl-prepare", {
    accesses: [{ resource: parameters2.value, usage: "copy-dst" }],
    executeIf: dirty,
    encode: ({ frame, resources }) => {
      writeAllPrefilterUniforms(
        frame.runtime.device,
        resources.buffer(parameters2.value).unwrap(),
        size
      ).unwrap();
    }
  });
  if (!upload.ok) return upload;
  let state;
  const ensureState = (frame) => {
    if (state !== void 0) return state;
    const device = frame.runtime.device, factory = frame.runtime.shaderModuleFactory;
    const diffuseCode = frame.atmosphereShaders?.ibl, prefilterCode = frame.atmosphereShaders?.prefilter;
    if (factory === void 0 || diffuseCode === void 0 || prefilterCode === void 0)
      throw new RhiError2({
        code: "shader-compile-failed",
        expected: "compiled Atmosphere irradiance and shared PMREM programs",
        hint: "rebuild the Engine shader manifest before selecting Atmosphere lighting"
      });
    const diffuse = factory.createShaderModule({ code: diffuseCode, label: "atmosphere_ibl" }).unwrap();
    const specular = factory.createShaderModule({ code: prefilterCode, label: "ibl-prefilter" }).unwrap();
    const diffuseInputs = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: 2, texture: { sampleType: "float", viewDimension: "cube" } },
        { binding: 1, visibility: 2, sampler: { type: "filtering" } }
      ]
    }).unwrap();
    state = {
      diffuseInputs,
      irradiance: device.createRenderPipeline({
        label: "atmosphere_irradiance_fs",
        layout: device.createPipelineLayout({ bindGroupLayouts: [diffuseInputs] }).unwrap(),
        vertex: {
          module: diffuse,
          entryPoint: "atmosphere_ibl_vs",
          buffers: [
            {
              arrayStride: 12,
              attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }]
            }
          ]
        },
        fragment: {
          module: diffuse,
          entryPoint: "atmosphere_irradiance_fs",
          targets: [{ format: "rgba16float" }]
        },
        primitive: { topology: "triangle-list" }
      }).unwrap(),
      prefilter: createPmremPipeline(device, specular, "rgba16float").unwrap(),
      sampler: device.createSampler({ magFilter: "linear", minFilter: "linear", mipmapFilter: "linear" }).unwrap(),
      parameters: []
    };
    return state;
  };
  for (let face = 0; face < 6; face++) {
    const target5 = graph.view(irradiance.value, {
      dimension: "2d",
      baseArrayLayer: face,
      arrayLayerCount: 1
    });
    if (!target5.ok) return target5;
    const added = graph.addRasterPass(`atmosphere-irradiance-${face}`, {
      accesses: [
        { resource: sky, usage: "sampled-read" },
        { resource: vertices, usage: "vertex-read" },
        { resource: target5.value, usage: "color-attachment" }
      ],
      colorAttachments: [{ view: target5.value, loadOp: "clear", storeOp: "store" }],
      executeIf: dirty,
      encode: ({ frame, resources, pass }) => {
        const current2 = ensureState(frame);
        const group = frame.runtime.device.createBindGroup({
          layout: current2.diffuseInputs,
          entries: [
            {
              binding: 0,
              resource: { kind: "textureView", value: resources.textureView(sky).unwrap() }
            },
            { binding: 1, resource: { kind: "sampler", value: current2.sampler } }
          ]
        }).unwrap();
        pass.setPipeline(current2.irradiance);
        pass.setBindGroup(0, group);
        pass.setVertexBuffer(0, resources.buffer(vertices).unwrap());
        pass.draw(3, 1, face * 3);
      }
    });
    if (!added.ok) return added;
  }
  for (let level = 0; level < levels; level++) {
    const added = graph.addRasterPass(`atmosphere-prefilter-${level}`, {
      accesses: [
        { resource: sky, usage: "sampled-read" },
        { resource: scratchView.value, usage: "sampled-read" },
        { resource: parameters2.value, usage: "uniform-read" },
        { resource: prefilterView.value, usage: "color-attachment" }
      ],
      colorAttachments: [
        { view: prefilterView.value, loadOp: level === 0 ? "clear" : "load", storeOp: "store" }
      ],
      executeIf: dirty,
      encode: ({ frame, resources, pass }) => {
        const current2 = ensureState(frame);
        const inputs = frame.runtime.device.createBindGroup({
          layout: current2.prefilter.inputLayout,
          entries: [
            {
              binding: 0,
              resource: { kind: "textureView", value: resources.textureView(sky).unwrap() }
            },
            { binding: 1, resource: { kind: "sampler", value: current2.sampler } },
            {
              binding: 2,
              resource: {
                kind: "textureView",
                value: resources.textureView(scratchView.value).unwrap()
              }
            }
          ]
        }).unwrap();
        pass.setPipeline(current2.prefilter.pipeline);
        pass.setBindGroup(1, inputs);
        for (let face = 0; face < 6; face++) {
          const index = level * 6 + face;
          current2.parameters[index] ??= frame.runtime.device.createBindGroup({
            layout: current2.prefilter.parametersLayout,
            entries: iblPrefilterGroup0Entries(
              resources.buffer(parameters2.value).unwrap(),
              level,
              face
            )
          }).unwrap();
          const group = current2.parameters[index];
          const viewport = pmremViewport(size, level, face);
          pass.setBindGroup(0, group);
          pass.setViewport(viewport.x, viewport.y, viewport.width, viewport.height, 0, 1);
          pass.setScissorRect(viewport.x, viewport.y, viewport.width, viewport.height);
          pass.draw(3);
        }
      }
    });
    if (!added.ok) return added;
    const copied = graph.addCopyPass(`atmosphere-prefilter-copy-${level}`, {
      accesses: [
        { resource: prefilterView.value, usage: "copy-src" },
        { resource: scratchView.value, usage: "copy-dst" }
      ],
      executeIf: dirty,
      encode: ({ frame, encoder, resources }) => {
        for (let face = 0; face < 6; face++) {
          const viewport = pmremViewport(size, level, face);
          encoder.copyTextureToTexture(
            {
              texture: resources.texture(prefilter2.value).unwrap(),
              origin: [viewport.x, viewport.y, 0]
            },
            {
              texture: resources.texture(scratch.value).unwrap(),
              origin: [viewport.x, viewport.y, 0]
            },
            { width: viewport.width, height: viewport.height, depthOrArrayLayers: 1 }
          );
        }
        if (level === levels - 1) atmosphereStorage(frame).recordedEncoder = frame.encoder;
      }
    });
    if (!copied.ok) return copied;
  }
  return ok4({ sky, irradiance: irradianceView.value, prefilter: prefilterView.value });
}

// sdk/engine/node_modules/@forgeax/engine-render/src/environment/background.ts
var CUBE_SIZE = 128;
function createAtmosphereBackgroundLayout(device) {
  return device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: 2, texture: { sampleType: "float", viewDimension: "2d" } },
      { binding: 1, visibility: 2, sampler: { type: "filtering" } },
      {
        binding: 2,
        visibility: 2,
        buffer: { type: "uniform", minBindingSize: VIEW_UNIFORM_BYTES }
      },
      { binding: 3, visibility: 2, texture: { sampleType: "float", viewDimension: "2d" } },
      { binding: 4, visibility: 2, texture: { sampleType: "float", viewDimension: "2d" } }
    ]
  }).unwrap();
}
function createAtmosphereBackgroundGroup(device, layout, input) {
  return device.createBindGroup({
    layout,
    entries: [
      { binding: 0, resource: { kind: "textureView", value: input.sky } },
      { binding: 1, resource: { kind: "sampler", value: input.sampler } },
      {
        binding: 2,
        resource: {
          kind: "buffer",
          value: { buffer: input.viewBuffer, offset: input.viewOffset, size: VIEW_UNIFORM_BYTES }
        }
      },
      { binding: 3, resource: { kind: "textureView", value: input.transmittance } },
      { binding: 4, resource: { kind: "textureView", value: input.multiple } }
    ]
  }).unwrap();
}
function addAtmosphereBackground(graph, color, visibility = {}) {
  const cube = graph.importTexture(
    "atmosphere-sky",
    {
      format: "rgba16float",
      size: { width: CUBE_SIZE, height: CUBE_SIZE, depthOrArrayLayers: 6 },
      usage: 20
    },
    (frame) => atmosphereStorage(frame).sky
  );
  if (!cube.ok) return cube;
  const cubeView = graph.view(cube.value, { dimension: "cube", arrayLayerCount: 6 });
  if (!cubeView.ok) return cubeView;
  const params2 = graph.importBuffer(
    "atmosphere-params",
    { size: VIEW_UNIFORM_BYTES, usage: 72 },
    (frame) => atmosphereStorage(frame).params
  );
  if (!params2.ok) return params2;
  const vertices = graph.importBuffer(
    "atmosphere-face-vertices",
    { size: 6 * 3 * 3 * 4, usage: 40 },
    (frame) => atmosphereStorage(frame).vertices
  );
  if (!vertices.ok) return vertices;
  const view = graph.importBuffer(
    "atmosphere-view",
    { size: VIEW_UNIFORM_BYTES, usage: 64 | 8 },
    (frame) => frame.pipelineState.viewUniformBuffer
  );
  if (!view.ok) return view;
  let state;
  const frameOf = (frame) => frame;
  const dirty = (frame) => frameOf(frame).frameState.environmentFrame?.environmentSignature !== atmosphereStorage(frame).submittedSignature && atmosphereStorage(frame).recordedEncoder !== frame.encoder;
  const upload = graph.addCopyPass("atmosphere-prepare", {
    accesses: [
      { resource: params2.value, usage: "copy-dst" },
      { resource: vertices.value, usage: "copy-dst" }
    ],
    executeIf: dirty,
    encode: ({ frame, resources }) => {
      const environment = frameOf(frame).frameState.environmentFrame;
      const sun = environment?.sun;
      if (environment?.source.kind !== "atmosphere" || sun === void 0) {
        throw new RhiError3({
          code: "webgpu-runtime-error",
          expected: "selected Atmosphere frame carries its directional sun",
          hint: "publish the validated resource-owner environment frame before graph recording"
        });
      }
      const settings = environment.source.atmosphere;
      const values = new Float32Array(VIEW_UNIFORM_BYTES / 4);
      values.set(
        sun.direction.map((v) => -v),
        16
      );
      values.set(
        sun.color.map((v) => v * sun.intensity),
        20
      );
      values.set(settings.capturePosition, 24);
      writeAtmosphereUniform(values, 292, settings, 96e3);
      frame.runtime.device.queue.writeBuffer(resources.buffer(params2.value).unwrap(), 0, values).unwrap();
      const triangles = new Float32Array(6 * 9);
      for (let face = 0; face < 6; face += 1) {
        triangles.set([-1, -1, face + 1, 3, -1, face + 1, -1, 3, face + 1], face * 9);
      }
      frame.runtime.device.queue.writeBuffer(resources.buffer(vertices.value).unwrap(), 0, triangles).unwrap();
    }
  });
  if (!upload.ok) return upload;
  const tables = addAtmosphereLuts(graph, params2.value, dirty, visibility);
  if (!tables.ok) return tables;
  const ensureState = (frame) => {
    if (state !== void 0) return state;
    const sources = frame.atmosphereShaders;
    const factory = frame.runtime.shaderModuleFactory;
    if (sources === void 0 || factory === void 0) {
      throw new RhiError3({
        code: "shader-compile-failed",
        expected: "shader manifest includes the Atmosphere cube and background programs",
        hint: "rebuild the Engine shader manifest with the package-owned Atmosphere entries"
      });
    }
    const device = frame.runtime.device;
    const cubeModule = factory.createShaderModule({ code: sources.cube, label: "atmosphere_cube" }).unwrap();
    const backgroundModule = factory.createShaderModule({ code: sources.background, label: "atmosphere_background" }).unwrap();
    const cubeLayout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: 2,
          buffer: { type: "uniform", minBindingSize: VIEW_UNIFORM_BYTES }
        },
        { binding: 1, visibility: 2, texture: { sampleType: "float", viewDimension: "2d" } },
        { binding: 3, visibility: 2, sampler: { type: "filtering" } }
      ]
    }).unwrap();
    const backgroundLayout = createAtmosphereBackgroundLayout(device);
    const cubePipeline = device.createRenderPipeline({
      label: "atmosphere_cube",
      layout: device.createPipelineLayout({ bindGroupLayouts: [cubeLayout] }).unwrap(),
      vertex: {
        module: cubeModule,
        entryPoint: "atmosphere_cubemap_vs",
        buffers: [
          {
            arrayStride: 12,
            attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }]
          }
        ]
      },
      fragment: {
        module: cubeModule,
        entryPoint: "atmosphere_cubemap_fs",
        targets: [{ format: "rgba16float" }]
      },
      primitive: { topology: "triangle-list", cullMode: "none" }
    }).unwrap();
    const backgroundPipeline = device.createRenderPipeline({
      label: "atmosphere_background",
      layout: device.createPipelineLayout({
        bindGroupLayouts: [backgroundLayout, atmosphereVisibilityLayout(device)]
      }).unwrap(),
      vertex: { module: backgroundModule, entryPoint: "atmosphere_background_vs", buffers: [] },
      fragment: {
        module: backgroundModule,
        entryPoint: "atmosphere_background_fs",
        targets: [{ format: color.format }]
      },
      primitive: { topology: "triangle-list", cullMode: "none" },
      multisample: { count: color.sampleCount }
    }).unwrap();
    const sampler = device.createSampler({ minFilter: "linear", magFilter: "linear", mipmapFilter: "linear" }).unwrap();
    state = { cubePipeline, cubeLayout, backgroundPipeline, backgroundLayout, sampler };
    return state;
  };
  for (let face = 0; face < 6; face += 1) {
    const faceView = graph.view(cube.value, {
      dimension: "2d",
      baseArrayLayer: face,
      arrayLayerCount: 1
    });
    if (!faceView.ok) return faceView;
    const pass = graph.addRasterPass(`atmosphere-cube-${face}`, {
      accesses: [
        { resource: faceView.value, usage: "color-attachment" },
        { resource: params2.value, usage: "uniform-read" },
        { resource: vertices.value, usage: "vertex-read" },
        { resource: tables.value.captureSky, usage: "sampled-read" }
      ],
      colorAttachments: [{ view: faceView.value, loadOp: "clear", storeOp: "store" }],
      executeIf: dirty,
      encode: ({ pass: pass2, frame, resources }) => {
        const current2 = ensureState(frame);
        current2.cubeGroup = frame.runtime.device.createBindGroup({
          layout: current2.cubeLayout,
          entries: [
            {
              binding: 0,
              resource: {
                kind: "buffer",
                value: {
                  buffer: resources.buffer(params2.value).unwrap(),
                  size: VIEW_UNIFORM_BYTES
                }
              }
            },
            {
              binding: 1,
              resource: {
                kind: "textureView",
                value: resources.textureView(tables.value.captureSky).unwrap()
              }
            },
            { binding: 3, resource: { kind: "sampler", value: current2.sampler } }
          ]
        }).unwrap();
        pass2.setPipeline(current2.cubePipeline);
        pass2.setBindGroup(0, current2.cubeGroup);
        pass2.setVertexBuffer(0, resources.buffer(vertices.value).unwrap());
        pass2.draw(3, 1, face * 3, 0);
        if (face === 5) {
          const signature = frameOf(frame).frameState.environmentFrame?.environmentSignature;
          const storage = atmosphereStorage(frame);
          stageAtmospherePublish(frameOf(frame).frameState, () => {
            storage.submittedSignature = signature;
          });
        }
      }
    });
    if (!pass.ok) return pass;
  }
  const ibl = addAtmosphereIbl(graph, cubeView.value, vertices.value, dirty);
  if (!ibl.ok) return ibl;
  const background = graph.addRasterPass("atmosphere-background", {
    accesses: [
      ...atmosphereVisibilityAccesses(visibility),
      { resource: tables.value.skyView, usage: "sampled-read" },
      { resource: tables.value.transmittance, usage: "sampled-read" },
      { resource: tables.value.multipleScattering, usage: "sampled-read" },
      { resource: view.value, usage: "uniform-read" },
      { resource: color.view, usage: "color-attachment" }
    ],
    // Initialize scene radiance before opaque and transparent draws. Geometry
    // uses the normal scene depth authority, so alpha blending sees the sky
    // and no later background pass can overwrite a transparent foreground.
    colorAttachments: [{ view: color.view, loadOp: "clear", storeOp: "store" }],
    encode: ({ pass, frame, resources }) => {
      const current2 = ensureState(frame);
      current2.backgroundGroup = createAtmosphereBackgroundGroup(
        frame.runtime.device,
        current2.backgroundLayout,
        {
          sky: resources.textureView(tables.value.skyView).unwrap(),
          sampler: current2.sampler,
          viewBuffer: resources.buffer(view.value).unwrap(),
          viewOffset: 0,
          transmittance: resources.textureView(tables.value.transmittance).unwrap(),
          multiple: resources.textureView(tables.value.multipleScattering).unwrap()
        }
      );
      pass.setPipeline(current2.backgroundPipeline);
      pass.setBindGroup(0, current2.backgroundGroup);
      pass.setBindGroup(
        1,
        atmosphereVisibilityGroup(
          frame,
          resources.buffer(view.value).unwrap(),
          0,
          visibility.directional === void 0 ? void 0 : resources.textureView(visibility.directional).unwrap(),
          visibility.cloud === void 0 ? void 0 : resources.textureView(visibility.cloud).unwrap()
        )
      );
      pass.draw(3);
    }
  });
  return background.ok ? ok5({ ...ibl.value, atmosphere: tables.value }) : background;
}

// sdk/engine/node_modules/@forgeax/engine-render/src/ssr/compose.ts
import { RhiError as RhiError4 } from "@forgeax/engine-rhi";
function addSsrCompositionPass(graph, input) {
  let state;
  const views = [input.radiance, input.fallback, input.response, input.normal];
  return graph.addRasterPass("ssr-compose", {
    accesses: [
      ...views.map((resource) => ({ resource, usage: "sampled-read" })),
      { resource: input.view, usage: "uniform-read" },
      { resource: input.scene.view, usage: "color-attachment" }
    ],
    colorAttachments: [{ view: input.scene.view, loadOp: "load", storeOp: "store" }],
    encode: ({ pass, frame, resources }) => {
      const source = frame.ssrShaders?.compose;
      if (source === void 0) return;
      const device = frame.runtime.device;
      if (state === void 0) {
        const factory = frame.runtime.shaderModuleFactory;
        if (factory === void 0)
          throw new RhiError4({
            code: "rhi-not-available",
            expected: "SSR composition shader module factory",
            hint: "construct the renderer through a backend pack with shader module support"
          });
        const module = factory.createShaderModule({ code: source, label: "ssr_compose" }).unwrap();
        const layout2 = device.createBindGroupLayout({
          entries: [
            ...views.map((_, binding) => ({
              binding,
              visibility: GPU_SHADER_STAGE_FRAGMENT,
              texture: {
                sampleType: binding === 0 ? "float" : binding === 3 ? "uint" : "unfilterable-float",
                viewDimension: "2d"
              }
            })),
            {
              binding: 4,
              visibility: GPU_SHADER_STAGE_FRAGMENT,
              sampler: { type: "filtering" }
            },
            {
              binding: 5,
              visibility: GPU_SHADER_STAGE_FRAGMENT,
              buffer: { type: "uniform" }
            }
          ]
        }).unwrap();
        const pipelineLayout2 = device.createPipelineLayout({ bindGroupLayouts: [layout2] }).unwrap();
        const pipeline = device.createRenderPipeline({
          label: "ssr_compose",
          layout: pipelineLayout2,
          vertex: { module, entryPoint: "vs_ssr_compose", buffers: [] },
          fragment: {
            module,
            entryPoint: "fs_ssr_compose",
            targets: [
              {
                format: input.scene.format,
                blend: {
                  color: { operation: "add", srcFactor: "one", dstFactor: "one" },
                  alpha: { operation: "add", srcFactor: "zero", dstFactor: "one" }
                }
              }
            ]
          },
          primitive: { topology: "triangle-list" }
        }).unwrap();
        const sampler2 = device.createSampler({
          addressModeU: "clamp-to-edge",
          addressModeV: "clamp-to-edge",
          minFilter: "linear",
          magFilter: "linear",
          mipmapFilter: "linear"
        }).unwrap();
        state = { pipeline, layout: layout2, sampler: sampler2, groups: /* @__PURE__ */ new WeakMap() };
      }
      const textures = views.map((view) => resources.textureView(view).unwrap());
      const viewBuffer = resources.buffer(input.view).unwrap();
      const layout = state.layout;
      const sampler = state.sampler;
      const group = getOrCreateFromChain(
        state.groups,
        [...textures, sampler, viewBuffer],
        "ssr-compose",
        () => device.createBindGroup({
          layout,
          entries: [
            ...textures.map((value, binding) => ({
              binding,
              resource: { kind: "textureView", value }
            })),
            { binding: 4, resource: { kind: "sampler", value: sampler } },
            {
              binding: 5,
              resource: {
                kind: "buffer",
                value: { buffer: viewBuffer, size: VIEW_UNIFORM_BYTES }
              }
            }
          ]
        }).unwrap(),
        frame.bindGroupCounts
      );
      pass.setPipeline(state.pipeline);
      pass.setBindGroup(0, group);
      pass.draw(3);
    }
  });
}

// sdk/engine/node_modules/@forgeax/engine-render/src/ssr/graph.ts
import { RenderGraphError as RenderGraphError2 } from "@forgeax/engine-render-graph";
import { err as err2, mipDimension, numMipLevels, ok as ok6 } from "@forgeax/engine-types";
var SSR_TRACE_COARSE_STEPS = 48;
var SSR_TRACE_REFINE_STEPS = 5;
function buildSsrTracePlan() {
  return Object.freeze({
    resolution: "full",
    coarseSteps: SSR_TRACE_COARSE_STEPS,
    refineSteps: SSR_TRACE_REFINE_STEPS
  });
}
function missingInput(field) {
  return err2(
    new RenderGraphError2({
      code: "resource-descriptor-invalid",
      expected: `admitted SSR spatial graph input '${field}'`,
      hint: `provide the Standard '${field}' graph view before building SSR`,
      detail: {
        resourceLabel: "forgeax::ssr",
        field,
        expected: "typed graph view",
        actual: "missing"
      }
    })
  );
}
function shaderSource(frame, stage) {
  return frame.ssrShaders?.[stage];
}
function addPass(graph, name, accesses, encode = () => void 0) {
  return graph.addComputePass(name, { accesses, encode });
}
function addSsrSpatialPasses(graph, input) {
  if (input.admission.status !== "admitted") {
    return ok6({
      enabled: false,
      passNames: Object.freeze([]),
      resources: void 0,
      trace: void 0,
      reactivity: void 0,
      reactivitySurface: void 0
    });
  }
  const depth2 = input.depth;
  const normal = input.normal;
  const scene = input.scene;
  const fallback = input.fallback;
  const temporal = input.temporal;
  if (depth2 === void 0) return missingInput("depth");
  if (normal === void 0) return missingInput("normal");
  if (scene === void 0) return missingInput("scene");
  if (fallback === void 0) return missingInput("fallback");
  const currentTemporal = input.currentTemporal;
  if (currentTemporal === void 0) return missingInput("currentTemporal");
  const depthPyramid = input.depthPyramid;
  if (depthPyramid === void 0) return missingInput("depthPyramid");
  const resources = createSsrSpatialResources(graph, {
    width: input.width,
    height: input.height
  });
  if (!resources.ok) return resources;
  const { trace, hitReactivity } = resources.value;
  const reactivity = temporal?.outputSurface ?? hitReactivity;
  let resolved;
  let radiancePyramid;
  const reflectionLevels = [];
  if (temporal !== void 0) {
    const width = Math.max(1, Math.floor(input.width));
    const height = Math.max(1, Math.floor(input.height));
    const resolvedTexture = graph.createTexture("ssr-resolved", {
      format: "rgba16float",
      size: { width, height },
      domain: "linear-hdr",
      mipLevelCount: numMipLevels({ width, height })
    });
    if (!resolvedTexture.ok) return resolvedTexture;
    const resolvedView = graph.view(resolvedTexture.value, {
      label: "ssr-resolved.view",
      dimension: "2d",
      baseMipLevel: 0,
      mipLevelCount: 1
    });
    if (!resolvedView.ok) return resolvedView;
    reflectionLevels.push(resolvedView.value);
    for (let level = 1; level < numMipLevels({ width, height }); level++) {
      const view = graph.view(resolvedTexture.value, {
        label: `ssr-resolved.mip-${level}.view`,
        dimension: "2d",
        baseMipLevel: level,
        mipLevelCount: 1
      });
      if (!view.ok) return view;
      reflectionLevels.push(view.value);
    }
    const pyramid = graph.view(resolvedTexture.value, {
      label: "ssr-resolved.pyramid.view",
      dimension: "2d"
    });
    if (!pyramid.ok) return pyramid;
    radiancePyramid = pyramid.value;
    resolved = {
      texture: resolvedTexture.value,
      view: resolvedView.value,
      width,
      height,
      format: "rgba16float"
    };
  }
  const passNames = [];
  let traceState;
  let temporalState;
  let reflectionMipState;
  const computeEntries2 = {
    trace: [
      {
        binding: 0,
        visibility: GPU_SHADER_STAGE_COMPUTE,
        texture: { sampleType: "depth", viewDimension: "2d" }
      },
      {
        binding: 1,
        visibility: GPU_SHADER_STAGE_COMPUTE,
        texture: { sampleType: "uint", viewDimension: "2d" }
      },
      {
        binding: 2,
        visibility: GPU_SHADER_STAGE_COMPUTE,
        texture: { sampleType: "unfilterable-float", viewDimension: "2d" }
      },
      {
        binding: 3,
        visibility: GPU_SHADER_STAGE_COMPUTE,
        texture: { sampleType: "unfilterable-float", viewDimension: "2d" }
      },
      {
        binding: 4,
        visibility: GPU_SHADER_STAGE_COMPUTE,
        storageTexture: { access: "write-only", format: "rgba16float", viewDimension: "2d" }
      },
      { binding: 5, visibility: GPU_SHADER_STAGE_COMPUTE, buffer: { type: "uniform" } },
      {
        binding: 6,
        visibility: GPU_SHADER_STAGE_COMPUTE,
        texture: { sampleType: "unfilterable-float", viewDimension: "2d" }
      },
      {
        binding: 7,
        visibility: GPU_SHADER_STAGE_COMPUTE,
        texture: { sampleType: "unfilterable-float", viewDimension: "2d" }
      },
      {
        binding: 8,
        visibility: GPU_SHADER_STAGE_COMPUTE,
        storageTexture: { access: "write-only", format: "r32float", viewDimension: "2d" }
      }
    ],
    temporal: [
      {
        binding: 0,
        visibility: GPU_SHADER_STAGE_COMPUTE,
        texture: { sampleType: "unfilterable-float", viewDimension: "2d" }
      },
      {
        binding: 1,
        visibility: GPU_SHADER_STAGE_COMPUTE,
        texture: { sampleType: "depth", viewDimension: "2d" }
      },
      {
        binding: 2,
        visibility: GPU_SHADER_STAGE_COMPUTE,
        texture: { sampleType: "uint", viewDimension: "2d" }
      },
      {
        binding: 3,
        visibility: GPU_SHADER_STAGE_COMPUTE,
        texture: { sampleType: "unfilterable-float", viewDimension: "2d" }
      },
      {
        binding: 4,
        visibility: GPU_SHADER_STAGE_COMPUTE,
        texture: { sampleType: "unfilterable-float", viewDimension: "2d" }
      },
      {
        binding: 5,
        visibility: GPU_SHADER_STAGE_COMPUTE,
        storageTexture: { access: "write-only", format: "rgba16float", viewDimension: "2d" }
      },
      { binding: 6, visibility: GPU_SHADER_STAGE_COMPUTE, buffer: { type: "uniform" } },
      {
        binding: 7,
        visibility: GPU_SHADER_STAGE_COMPUTE,
        storageTexture: { access: "write-only", format: "rgba16float", viewDimension: "2d" }
      },
      { binding: 8, visibility: GPU_SHADER_STAGE_COMPUTE, buffer: { type: "uniform" } },
      {
        binding: 9,
        visibility: GPU_SHADER_STAGE_COMPUTE,
        texture: { sampleType: "unfilterable-float", viewDimension: "2d" }
      },
      {
        binding: 10,
        visibility: GPU_SHADER_STAGE_COMPUTE,
        storageTexture: { access: "write-only", format: "rgba8unorm", viewDimension: "2d" }
      },
      {
        binding: 11,
        visibility: GPU_SHADER_STAGE_COMPUTE,
        texture: { sampleType: "unfilterable-float", viewDimension: "2d" }
      }
    ]
  };
  let added = addPass(
    graph,
    "ssr-trace",
    [
      { resource: depth2, usage: "sampled-read" },
      { resource: normal, usage: "sampled-read" },
      { resource: scene, usage: "sampled-read" },
      { resource: fallback, usage: "sampled-read" },
      { resource: depthPyramid.pyramid, usage: "sampled-read" },
      { resource: trace.view, usage: "storage-write" },
      { resource: currentTemporal, usage: "sampled-read" },
      { resource: hitReactivity, usage: "storage-write" },
      ...input.view === void 0 ? [] : [{ resource: input.view, usage: "uniform-read" }]
    ],
    ({ pass, frame, resources: resolver }) => {
      const source = shaderSource(frame, "trace");
      if (source === void 0 || input.view === void 0) return;
      traceState ??= createComputeState(
        frame,
        source,
        "ssr_trace",
        computeEntries2.trace,
        "ssr_trace"
      );
      pass.setPipeline(traceState.pipeline);
      pass.setBindGroup(
        0,
        computeBindGroup(frame, traceState, [
          {
            binding: 7,
            resource: { kind: "textureView", value: resolvedGraphView(resolver, currentTemporal) }
          },
          {
            binding: 8,
            resource: { kind: "textureView", value: resolvedGraphView(resolver, hitReactivity) }
          },
          {
            binding: 6,
            resource: { kind: "textureView", value: resolvedGraphView(resolver, fallback) }
          },
          {
            binding: 0,
            resource: { kind: "textureView", value: resolvedGraphView(resolver, depth2) }
          },
          {
            binding: 1,
            resource: { kind: "textureView", value: resolvedGraphView(resolver, normal) }
          },
          {
            binding: 2,
            resource: { kind: "textureView", value: resolvedGraphView(resolver, scene) }
          },
          {
            binding: 3,
            resource: {
              kind: "textureView",
              value: resolvedGraphView(resolver, depthPyramid.pyramid)
            }
          },
          {
            binding: 4,
            resource: { kind: "textureView", value: resolvedGraphView(resolver, trace.view) }
          },
          {
            binding: 5,
            resource: {
              kind: "buffer",
              value: {
                buffer: resolvedGraphBuffer(resolver, input.view),
                size: VIEW_UNIFORM_BYTES
              }
            }
          }
        ])
      );
      pass.dispatchWorkgroups(Math.ceil(input.width / 8), Math.ceil(input.height / 8), 1);
    }
  );
  if (!added.ok) return added;
  passNames.push("ssr-trace");
  if (temporal !== void 0) {
    added = addPass(
      graph,
      "ssr-temporal",
      [
        { resource: trace.view, usage: "sampled-read" },
        { resource: depth2, usage: "sampled-read" },
        { resource: normal, usage: "sampled-read" },
        { resource: temporal.previousHistory, usage: "sampled-read" },
        { resource: currentTemporal, usage: "sampled-read" },
        { resource: hitReactivity, usage: "sampled-read" },
        { resource: temporal.outputHistory, usage: "storage-write" },
        { resource: temporal.previousSurface, usage: "sampled-read" },
        { resource: temporal.outputSurface, usage: "storage-write" },
        { resource: temporal.params, usage: "uniform-read" },
        ...input.view === void 0 ? [] : [{ resource: input.view, usage: "uniform-read" }],
        ...resolved === void 0 ? [] : [{ resource: resolved.view, usage: "storage-write" }]
      ],
      ({ pass, frame, resources: resolver }) => {
        const source = shaderSource(frame, "temporal");
        if (source === void 0 || input.view === void 0) return;
        temporalState ??= createComputeState(
          frame,
          source,
          "ssr_temporal",
          computeEntries2.temporal,
          "ssr_temporal"
        );
        pass.setPipeline(temporalState.pipeline);
        pass.setBindGroup(
          0,
          computeBindGroup(frame, temporalState, [
            {
              binding: 11,
              resource: { kind: "textureView", value: resolvedGraphView(resolver, hitReactivity) }
            },
            {
              binding: 9,
              resource: {
                kind: "textureView",
                value: resolvedGraphView(resolver, temporal.previousSurface)
              }
            },
            {
              binding: 10,
              resource: {
                kind: "textureView",
                value: resolvedGraphView(resolver, temporal.outputSurface)
              }
            },
            {
              binding: 8,
              resource: {
                kind: "buffer",
                value: {
                  buffer: resolvedGraphBuffer(resolver, input.view),
                  size: VIEW_UNIFORM_BYTES
                }
              }
            },
            {
              binding: 0,
              resource: { kind: "textureView", value: resolvedGraphView(resolver, trace.view) }
            },
            {
              binding: 1,
              resource: { kind: "textureView", value: resolvedGraphView(resolver, depth2) }
            },
            {
              binding: 2,
              resource: { kind: "textureView", value: resolvedGraphView(resolver, normal) }
            },
            {
              binding: 3,
              resource: {
                kind: "textureView",
                value: resolvedGraphView(resolver, temporal.previousHistory)
              }
            },
            {
              binding: 4,
              resource: {
                kind: "textureView",
                value: resolvedGraphView(resolver, currentTemporal)
              }
            },
            {
              binding: 5,
              resource: {
                kind: "textureView",
                value: resolvedGraphView(resolver, temporal.outputHistory)
              }
            },
            {
              binding: 6,
              resource: {
                kind: "buffer",
                value: { buffer: resolvedGraphBuffer(resolver, temporal.params) }
              }
            },
            ...resolved === void 0 ? [] : [
              {
                binding: 7,
                resource: {
                  kind: "textureView",
                  value: resolvedGraphView(resolver, resolved.view)
                }
              }
            ]
          ])
        );
        pass.dispatchWorkgroups(
          Math.ceil(Math.max(1, input.width) / 8),
          Math.ceil(Math.max(1, input.height) / 8),
          1
        );
      }
    );
    if (!added.ok) return added;
    passNames.push("ssr-temporal");
  }
  if (reflectionLevels.length > 1 && resolved !== void 0) {
    const output = resolved;
    const name = "ssr-reflection-mip-chain";
    const added2 = addPass(
      graph,
      name,
      reflectionLevels.map((resource, level) => ({
        resource,
        usage: level === 0 ? "sampled-read" : level === reflectionLevels.length - 1 ? "storage-write" : "sampled-storage-write"
      })),
      ({ pass, frame, resources: resolver }) => {
        const source = shaderSource(frame, "temporal");
        if (source === void 0) return;
        reflectionMipState ??= createComputeState(
          frame,
          source,
          "ssr_temporal",
          [
            {
              binding: 0,
              visibility: GPU_SHADER_STAGE_COMPUTE,
              texture: { sampleType: "unfilterable-float", viewDimension: "2d" }
            },
            {
              binding: 7,
              visibility: GPU_SHADER_STAGE_COMPUTE,
              storageTexture: { access: "write-only", format: "rgba16float", viewDimension: "2d" }
            }
          ],
          "ssr_reflection_mip"
        );
        pass.setPipeline(reflectionMipState.pipeline);
        for (let level = 1; level < reflectionLevels.length; level++) {
          const previous = reflectionLevels[level - 1];
          const target5 = reflectionLevels[level];
          if (previous === void 0 || target5 === void 0)
            throw computePipelineError("SSR reflection mip chain");
          pass.setBindGroup(
            0,
            computeBindGroup(frame, reflectionMipState, [
              {
                binding: 0,
                resource: {
                  kind: "textureView",
                  value: resolvedGraphView(resolver, previous)
                }
              },
              {
                binding: 7,
                resource: {
                  kind: "textureView",
                  value: resolvedGraphView(resolver, target5)
                }
              }
            ])
          );
          pass.dispatchWorkgroups(
            Math.ceil(mipDimension(output.width, level) / 8),
            Math.ceil(mipDimension(output.height, level) / 8),
            1
          );
        }
      }
    );
    if (!added2.ok) return added2;
    passNames.push(name);
  }
  return ok6({
    enabled: true,
    passNames: Object.freeze(passNames),
    resources: {
      ...resources.value,
      ...resolved === void 0 ? {} : { resolved },
      ...radiancePyramid === void 0 ? {} : { radiancePyramid }
    },
    trace: buildSsrTracePlan(),
    reactivity,
    reactivitySurface: {
      width: Math.max(1, Math.floor(input.width / 2)),
      height: Math.max(1, Math.floor(input.height / 2)),
      // History surfaces are 8-bit; the trace-only path keeps its r32float hits.
      format: temporal === void 0 ? "r32float" : "rgba8unorm"
    }
  });
}

// sdk/engine/node_modules/@forgeax/engine-render/src/subsurface/graph.ts
import {
  RhiError as RhiError5
} from "@forgeax/engine-rhi";
import { ok as ok7 } from "@forgeax/engine-types";
function addSubsurfaceDiffusion(graph, input) {
  const bandHeight = Math.min(64, input.size.height);
  const scratch = graph.createTexture("subsurface-delta", {
    size: { width: input.size.width, height: bandHeight },
    format: "rgba32float",
    domain: "linear-hdr"
  });
  if (!scratch.ok) return scratch;
  const delta = graph.view(scratch.value, { dimension: "2d" });
  if (!delta.ok) return delta;
  const views = [input.diffuse.view, input.profiles, input.normal, input.depth, delta.value];
  let state;
  let composition;
  for (let origin = 0; origin < input.size.height; origin += bandHeight) {
    const suffix = origin === 0 ? "" : `-${origin}`;
    const rows = Math.min(bandHeight, input.size.height - origin);
    const params2 = graph.createBuffer(`subsurface-params-${origin}`, { size: 32 });
    if (!params2.ok) return params2;
    const upload = graph.addCopyPass(`subsurface-prepare${suffix}`, {
      accesses: [{ resource: params2.value, usage: "copy-dst" }],
      encode: ({ frame, resources }) => {
        const camera = frame.camera;
        frame.runtime.device.queue.writeBuffer(
          resources.buffer(params2.value).unwrap(),
          0,
          new Float32Array([
            camera.near,
            camera.far,
            camera.projection === "orthographic" ? 1 : 0,
            input.quality === "low" ? 2 : 3,
            input.scale[0],
            input.scale[1],
            origin,
            rows
          ])
        ).unwrap();
      }
    });
    if (!upload.ok) return upload;
    const compute = graph.addComputePass(`subsurface-diffusion${suffix}`, {
      accesses: [
        ...views.slice(0, 4).map((resource) => ({ resource, usage: "sampled-read" })),
        { resource: delta.value, usage: "storage-write" },
        { resource: params2.value, usage: "uniform-read" }
      ],
      encode: ({ pass, frame, resources }) => {
        const internal = frame;
        const device = frame.runtime.device;
        if (state === void 0) {
          const code = internal.runtime.standardDeferredShaders?.subsurface;
          if (code === void 0)
            throw new RhiError5({
              code: "shader-compile-failed",
              expected: "cooked Standard subsurface diffusion shader",
              hint: "rebuild shared shader inputs and initialize the Renderer"
            });
          const module = frame.runtime.shaderModuleFactory?.createShaderModule({
            code,
            label: "forgeax::engine-subsurface-diffusion"
          }).unwrap();
          if (module === void 0)
            throw new RhiError5({
              code: "rhi-not-available",
              expected: "subsurface shader module factory",
              hint: "initialize the Renderer backend"
            });
          const layout = device.createBindGroupLayout({
            entries: [
              ...[0, 1, 2, 3].map((binding) => ({
                binding,
                visibility: 4,
                texture: {
                  sampleType: binding === 1 || binding === 2 ? "uint" : binding === 3 ? "depth" : "unfilterable-float",
                  viewDimension: "2d"
                }
              })),
              { binding: 4, visibility: 4, buffer: { type: "uniform", minBindingSize: 32 } },
              {
                binding: 5,
                visibility: 4,
                storageTexture: {
                  access: "write-only",
                  format: "rgba32float",
                  viewDimension: "2d"
                }
              }
            ]
          }).unwrap();
          const pipeline = device.createComputePipeline({
            label: "subsurface-diffusion",
            layout: device.createPipelineLayout({ bindGroupLayouts: [layout] }).unwrap(),
            compute: { module, entryPoint: "cs_subsurface" }
          }).unwrap();
          state = { pipeline, layout, groups: /* @__PURE__ */ new WeakMap() };
        }
        const textures = views.map((view) => resources.textureView(view).unwrap());
        const buffer = resources.buffer(params2.value).unwrap();
        const current2 = state;
        const group = getOrCreateFromChain(
          current2.groups,
          [...textures, buffer],
          "subsurface",
          () => device.createBindGroup({
            layout: current2.layout,
            entries: [
              ...textures.map((texture, i) => ({
                binding: i < 4 ? i : 5,
                resource: { kind: "textureView", value: texture }
              })),
              { binding: 4, resource: { kind: "buffer", value: { buffer } } }
            ]
          }).unwrap(),
          internal.bindGroupCounts
        );
        pass.setPipeline(current2.pipeline);
        pass.setBindGroup(0, group);
        pass.dispatchWorkgroups(Math.ceil(input.size.width / 8), Math.ceil(rows / 8), 1);
      }
    });
    if (!compute.ok) return compute;
    const compose = graph.addRasterPass(`subsurface-compose${suffix}`, {
      accesses: [
        { resource: delta.value, usage: "sampled-read" },
        { resource: params2.value, usage: "uniform-read" },
        { resource: input.scene.view, usage: "color-attachment" }
      ],
      colorAttachments: [{ view: input.scene.view, loadOp: "load", storeOp: "store" }],
      encode: ({ pass, frame, resources }) => {
        const internal = frame;
        const device = frame.runtime.device;
        if (composition === void 0) {
          const code = internal.runtime.standardDeferredShaders?.subsurface;
          const factory = frame.runtime.shaderModuleFactory;
          if (code === void 0 || factory === void 0)
            throw new RhiError5({
              code: "shader-compile-failed",
              expected: "cooked Standard subsurface composition shader and module factory",
              hint: "rebuild shared shader inputs and initialize the Renderer"
            });
          const module = factory.createShaderModule({ code, label: "forgeax::engine-subsurface-diffusion" }).unwrap();
          const layout = device.createBindGroupLayout({
            entries: [
              { binding: 4, visibility: 2, buffer: { type: "uniform", minBindingSize: 32 } },
              {
                binding: 6,
                visibility: 2,
                texture: { sampleType: "unfilterable-float", viewDimension: "2d" }
              }
            ]
          }).unwrap();
          const pipeline = device.createRenderPipeline({
            label: "subsurface-compose",
            layout: device.createPipelineLayout({ bindGroupLayouts: [layout] }).unwrap(),
            vertex: { module, entryPoint: "vs_subsurface", buffers: [] },
            fragment: {
              module,
              entryPoint: "fs_subsurface",
              targets: [
                {
                  format: input.scene.format,
                  blend: {
                    color: { operation: "add", srcFactor: "one", dstFactor: "one" },
                    alpha: { operation: "add", srcFactor: "zero", dstFactor: "one" }
                  }
                }
              ]
            },
            primitive: { topology: "triangle-list" }
          }).unwrap();
          composition = { pipeline, layout, groups: /* @__PURE__ */ new WeakMap() };
        }
        const texture = resources.textureView(delta.value).unwrap();
        const buffer = resources.buffer(params2.value).unwrap();
        const current2 = composition;
        const group = getOrCreateFromChain(
          current2.groups,
          [texture, buffer],
          "subsurface-compose",
          () => device.createBindGroup({
            layout: current2.layout,
            entries: [
              { binding: 4, resource: { kind: "buffer", value: { buffer, size: 32 } } },
              { binding: 6, resource: { kind: "textureView", value: texture } }
            ]
          }).unwrap(),
          internal.bindGroupCounts
        );
        pass.setPipeline(current2.pipeline);
        pass.setBindGroup(0, group);
        pass.setScissorRect(0, origin, input.size.width, rows);
        pass.draw(3);
      }
    });
    if (!compose.ok) return compose;
  }
  return ok7(void 0);
}

// sdk/engine/node_modules/@forgeax/engine-render/src/temporal/target-coverage-attachment.ts
import { ok as ok8 } from "@forgeax/engine-types";
var COVERAGE_DESCRIPTOR = {
  format: "rgba16float",
  size: "surface",
  sampleCount: 1,
  usage: GPU_TEXTURE_USAGE_COPY_SRC
};
var COVERAGE_DEPTH_DESCRIPTOR = {
  format: "depth32float-stencil8",
  size: "surface",
  sampleCount: 1
};
function createTargetCoverageAttachment(graph, extent) {
  const coverage = createRenderPipelineTarget(graph, "standard-scene-coverage", {
    ...COVERAGE_DESCRIPTOR,
    size: { width: extent.outputWidth, height: extent.outputHeight }
  });
  if (!coverage.ok) return coverage;
  const depth2 = createRenderPipelineTarget(graph, "standard-scene-coverage-depth", {
    ...COVERAGE_DEPTH_DESCRIPTOR,
    size: { width: extent.outputWidth, height: extent.outputHeight }
  });
  if (!depth2.ok) return depth2;
  return ok8({
    coverage: coverage.value,
    depth: depth2.value,
    outputWidth: extent.outputWidth,
    outputHeight: extent.outputHeight
  });
}
function addTargetCoveragePass(graph, target5, gpuDriven) {
  return addTypedScenePass(graph, {
    name: "standard-scene-coverage",
    ...gpuDriven === void 0 ? {} : { gpuDriven, gpuDrivenFilter: "opaque" },
    color: target5.coverage,
    colorTargets: [target5.coverage],
    depth: target5.depth,
    selector: COLOR_PASS_SELECTOR,
    // Coverage is a generic Standard raster producer. Surface medium pixels
    // are owned by the later paired nearest/color passes and have no raw-depth
    // input at this point, so keep this attachment on the opaque lane.
    recordMode: "opaque",
    passKind: "temporal",
    clearColor: [0, 0, -1, 3],
    depthLoadOp: "clear"
  });
}

// sdk/engine/node_modules/@forgeax/engine-render/src/transmission/backdrop.ts
import {
  RenderGraphError as RenderGraphError3
} from "@forgeax/engine-render-graph";
import { err as err3, mipDimension as mipDimension2, numMipLevels as numMipLevels2, ok as ok9 } from "@forgeax/engine-types";
function transmissionDemandForTopology(topology) {
  return topology.transmissionDemand ?? {
    activeCount: 0,
    needsRoughMips: false
  };
}
function resolveTransmissionBackdropTopology(input) {
  if (input.demand.activeCount === 0) {
    return {
      active: false,
      sourceSampleCount: input.sourceSampleCount,
      copyCount: 0,
      mipCount: 0,
      submitCount: 1,
      aliasCount: 0,
      phases: []
    };
  }
  const phases = ["opaque-resolve", "transmission-backdrop-copy"];
  if (input.demand.needsRoughMips) phases.push("transmission-backdrop-mip");
  phases.push("transmission-forward", "transparent", "temporal");
  return {
    active: true,
    sourceSampleCount: input.sourceSampleCount,
    copyCount: 1,
    mipCount: input.demand.needsRoughMips ? 1 : 0,
    submitCount: 1,
    aliasCount: 0,
    phases
  };
}
function probeTransmissionCapability(device, format = "rgba16float") {
  const formatSupported = format === "rgba16float" ? device.caps.rgba16floatRenderable : format === "rgba32float" && device.caps.float32Filterable && device.features.has("float32-filterable") && device.features.has("float32-blendable");
  const texture = formatSupported ? device.createTexture({
    label: "transmission-capability-probe",
    size: { width: 2, height: 2, depthOrArrayLayers: 1 },
    format,
    usage: GPU_TEXTURE_USAGE_COPY_SRC | GPU_TEXTURE_USAGE_TEXTURE_BINDING | GPU_TEXTURE_USAGE_RENDER_ATTACHMENT,
    mipLevelCount: 2,
    sampleCount: 1,
    dimension: "2d",
    textureBindingViewDimension: "2d"
  }) : void 0;
  let resourceCreation = false;
  let renderAttachment = false;
  let copySrc = false;
  let textureBinding = false;
  let mipView = false;
  let filteringSampler = false;
  let bindGroupLayout = false;
  if (texture?.ok === true) {
    resourceCreation = true;
    copySrc = true;
    const view = device.createTextureView(texture.value, { baseMipLevel: 0, mipLevelCount: 1 });
    const mip = device.createTextureView(texture.value, { baseMipLevel: 1, mipLevelCount: 1 });
    renderAttachment = view.ok;
    textureBinding = view.ok;
    mipView = mip.ok;
    const sampler = device.createSampler({
      minFilter: "linear",
      magFilter: "linear",
      mipmapFilter: "linear"
    });
    filteringSampler = sampler.ok;
    const layout = device.createBindGroupLayout({
      label: "transmission-capability-probe",
      entries: [
        { binding: 0, visibility: 2, texture: { sampleType: "float", viewDimension: "2d" } },
        { binding: 1, visibility: 2, sampler: { type: "filtering" } }
      ]
    });
    bindGroupLayout = layout.ok;
    device.destroyTexture(texture.value);
  }
  return {
    format,
    renderAttachment: formatSupported && renderAttachment,
    copySrc,
    textureBinding,
    mipView,
    filteringSampler,
    bindGroupLayout,
    msaaResolve: formatSupported && renderAttachment,
    resourceCreation
  };
}
function evaluateTransmissionCapability(facts) {
  const missing = [];
  if (facts.format !== "rgba16float" && facts.format !== "rgba32float") missing.push("format");
  for (const field of [
    "renderAttachment",
    "copySrc",
    "textureBinding",
    "mipView",
    "filteringSampler",
    "bindGroupLayout",
    "msaaResolve",
    "resourceCreation"
  ]) {
    if (!facts[field]) missing.push(field);
  }
  return missing.length === 0 ? { ok: true, missing: [] } : { ok: false, missing };
}
function sameDemand(left, right) {
  return left.activeCount === right.activeCount && left.needsRoughMips === right.needsRoughMips && left.needsBackPass === right.needsBackPass;
}
function cloneResource(resource) {
  return {
    ...resource,
    extent: { ...resource.extent }
  };
}
function resourceCompatible(current2, candidate) {
  if (candidate === void 0) return true;
  if (current2 === void 0) return false;
  return current2.deviceGeneration === candidate.deviceGeneration && current2.format === candidate.format && current2.mipCount === candidate.mipCount && current2.extent.width === candidate.extent.width && current2.extent.height === candidate.extent.height;
}
var TransmissionCandidateAdmission = class {
  generation = 0;
  demand = { activeCount: 0, needsRoughMips: false };
  capability = { ok: true, missing: [] };
  lifecycle = "inactive";
  lastKnownGood = false;
  recovery = "idle";
  resource;
  admit(demand, facts, resource) {
    const verdict = evaluateTransmissionCapability(facts);
    this.capability = verdict;
    if (!verdict.ok) {
      const compatible = this.lastKnownGood && sameDemand(this.demand, demand) && resourceCompatible(this.resource, resource);
      if (!compatible && this.lastKnownGood) {
        this.resource = void 0;
        this.lastKnownGood = false;
      }
      this.lifecycle = compatible ? "resident" : "failed";
      this.recovery = compatible ? "compatible-lkg" : "rebuild-required";
      return {
        ok: false,
        published: false,
        generation: this.generation,
        demand: this.demand,
        missing: verdict.missing
      };
    }
    this.generation += 1;
    this.demand = demand;
    this.resource = resource === void 0 ? void 0 : cloneResource(resource);
    this.lastKnownGood = demand.activeCount > 0 && resource !== void 0;
    this.lifecycle = demand.activeCount > 0 ? "resident" : "inactive";
    this.recovery = this.generation === 1 ? "idle" : "recovered";
    return { ok: true, published: true, generation: this.generation, demand };
  }
  inspect() {
    return { generation: this.generation, demand: this.demand };
  }
  /**
   * Drop physical resource identity after device loss without dropping the
   * persistent material demand. The next successful admission must publish a
   * replacement resource before it can become the LKG.
   */
  markDeviceLost() {
    this.resource = void 0;
    this.lastKnownGood = false;
    this.lifecycle = this.demand.activeCount > 0 ? "device-lost" : "inactive";
    this.recovery = this.demand.activeCount > 0 ? "rebuild-required" : "idle";
  }
  markRecoveryStarted() {
    this.resource = void 0;
    this.lastKnownGood = false;
    this.lifecycle = this.demand.activeCount > 0 ? "recovering" : "inactive";
    this.recovery = this.demand.activeCount > 0 ? "rebuild-required" : "idle";
  }
  inspectLifecycle() {
    return {
      generation: this.generation,
      demand: { ...this.demand },
      capability: this.capability.ok ? { ok: true, missing: [] } : { ok: false, missing: [...this.capability.missing] },
      lifecycle: this.lifecycle,
      lastKnownGood: this.lastKnownGood,
      recovery: this.recovery,
      ...this.resource === void 0 ? {} : { resource: cloneResource(this.resource) }
    };
  }
};
function roughMipEncoderMissing() {
  return new RenderGraphError3({
    code: "resource-descriptor-invalid",
    expected: "rough transmission mip generation to use the existing fullscreen/downsample owner",
    hint: "provide encodeRoughMip from the renderer-owned downsample path before enabling rough transmission",
    detail: {
      resourceLabel: "transmission-backdrop",
      field: "roughMipEncoder",
      expected: "renderer-owned fullscreen/downsample encoder",
      actual: "missing"
    }
  });
}
function addTransmissionBackdropPasses(input) {
  const topology = resolveTransmissionBackdropTopology({
    demand: input.demand,
    sourceSampleCount: input.source.sampleCount
  });
  if (!topology.active) {
    return ok9({ topology, backdrop: void 0, mipViews: [] });
  }
  if (topology.mipCount > 0 && input.encodeRoughMip === void 0) {
    return err3(roughMipEncoderMissing());
  }
  const label = input.name ?? "transmission-backdrop";
  const mipLevelCount = topology.mipCount === 0 ? 1 : numMipLevels2(input.copySize);
  const backdrop = createRenderPipelineTarget(input.graph, label, {
    format: input.source.format,
    size: input.surfaceSize,
    sampleCount: 1,
    mipLevelCount
  });
  if (!backdrop.ok) return backdrop;
  const mip0 = input.graph.view(backdrop.value.texture, {
    label: `${label}.mip-0`,
    baseMipLevel: 0,
    mipLevelCount: 1
  });
  if (!mip0.ok) return mip0;
  const mipViews = [mip0.value];
  for (let level = 1; level < mipLevelCount; level += 1) {
    const mip = input.graph.view(backdrop.value.texture, {
      label: `${label}.mip-${level}`,
      baseMipLevel: level,
      mipLevelCount: 1
    });
    if (!mip.ok) return mip;
    mipViews.push(mip.value);
  }
  const copy = input.graph.addCopyPass(`${label}-copy`, {
    accesses: [
      { resource: input.source.view, usage: "copy-src" },
      { resource: mip0.value, usage: "copy-dst" }
    ],
    encode: ({ encoder, resources }) => {
      const source = resources.texture(input.source.texture);
      const target5 = resources.texture(backdrop.value.texture);
      if (!source.ok) throw source.error;
      if (!target5.ok) throw target5.error;
      encoder.copyTextureToTexture(
        { texture: source.value, mipLevel: 0, origin: { x: 0, y: 0, z: 0 } },
        { texture: target5.value, mipLevel: 0, origin: { x: 0, y: 0, z: 0 } },
        { ...input.copySize, depthOrArrayLayers: 1 }
      );
    }
  });
  if (!copy.ok) return copy;
  if (topology.mipCount > 0) {
    const encodeRoughMip = input.encodeRoughMip;
    if (encodeRoughMip === void 0) return err3(roughMipEncoderMissing());
    const levelSize = (level) => ({
      width: mipDimension2(input.surfaceSize.width, level),
      height: mipDimension2(input.surfaceSize.height, level)
    });
    const scratch = input.graph.createTexture(`${label}-scratch`, {
      format: backdrop.value.format,
      size: levelSize(1),
      sampleCount: 1,
      mipLevelCount: mipLevelCount - 1
    });
    if (!scratch.ok) return scratch;
    for (let level = 1; level < mipViews.length; level += 1) {
      const source = mipViews[level - 1];
      const destination = mipViews[level];
      if (source === void 0 || destination === void 0) {
        return err3(
          new RenderGraphError3({
            code: "resource-descriptor-invalid",
            expected: "every rough transmission mip level to have a graph view",
            hint: "rebuild the backdrop mip chain before adding its raster passes",
            detail: {
              resourceLabel: label,
              field: "mipViews",
              expected: `mip views for level ${level - 1} and ${level}`,
              actual: "missing"
            }
          })
        );
      }
      const scratchView = input.graph.view(scratch.value, {
        label: `${label}-scratch.mip-${level - 1}`,
        baseMipLevel: level - 1,
        mipLevelCount: 1
      });
      if (!scratchView.ok) return scratchView;
      const mip = input.graph.addRasterPass(
        level === 1 ? `${label}-mip` : `${label}-mip-${level}`,
        {
          accesses: [
            { resource: source, usage: "sampled-read" },
            { resource: scratchView.value, usage: "color-attachment" }
          ],
          colorAttachments: [
            {
              view: scratchView.value,
              clearValue: { r: 0, g: 0, b: 0, a: 1 },
              loadOp: "clear",
              storeOp: "store"
            }
          ],
          encode: ({ pass, frame, resources }) => encodeRoughMip({
            pass,
            frame,
            resources,
            source,
            destination: scratchView.value,
            format: backdrop.value.format,
            level
          })
        }
      );
      if (!mip.ok) return mip;
      const copied = input.graph.addCopyPass(`${label}-mip-copy-${level}`, {
        accesses: [
          { resource: scratchView.value, usage: "copy-src" },
          { resource: destination, usage: "copy-dst" }
        ],
        encode: ({ encoder, resources }) => {
          const from = resources.texture(scratch.value);
          const to = resources.texture(backdrop.value.texture);
          if (!from.ok) throw from.error;
          if (!to.ok) throw to.error;
          encoder.copyTextureToTexture(
            { texture: from.value, mipLevel: level - 1, origin: { x: 0, y: 0, z: 0 } },
            { texture: to.value, mipLevel: level, origin: { x: 0, y: 0, z: 0 } },
            { ...levelSize(level), depthOrArrayLayers: 1 }
          );
        }
      });
      if (!copied.ok) return copied;
    }
  }
  if (input.includeConsumerPasses !== false) {
    const transmission = input.graph.addRasterPass("transmission-forward", {
      accesses: [
        { resource: mip0.value, usage: "sampled-read" },
        { resource: input.source.view, usage: "color-attachment" }
      ],
      colorAttachments: [{ view: input.source.view, loadOp: "load", storeOp: "store" }],
      encode: () => void 0
    });
    if (!transmission.ok) return transmission;
    for (const name of ["transparent", "temporal"]) {
      const pass = input.graph.addRasterPass(name, {
        accesses: [{ resource: input.source.view, usage: "color-attachment" }],
        colorAttachments: [{ view: input.source.view, loadOp: "load", storeOp: "store" }],
        encode: () => void 0
      });
      if (!pass.ok) return pass;
    }
  }
  return ok9({ topology, backdrop: backdrop.value, mipViews });
}
function addTransmissionBackdropTemporalPass(graph, source) {
  return graph.addRasterPass("temporal", {
    accesses: [{ resource: source.view, usage: "color-attachment" }],
    colorAttachments: [{ view: source.view, loadOp: "load", storeOp: "store" }],
    encode: () => void 0
  });
}

// sdk/engine/node_modules/@forgeax/engine-render/src/typed-shadow-passes.ts
import { ok as ok11 } from "@forgeax/engine-types";

// sdk/engine/node_modules/@forgeax/engine-render/src/shadow-variance.ts
import { RhiError as RhiError6 } from "@forgeax/engine-rhi";
import { ok as ok10 } from "@forgeax/engine-types";
function addVarianceShadowPasses(graph, views, retained) {
  if (views.length === 0) return ok10(void 0);
  const size = Math.max(...views.map((view) => view.size));
  const label = "shadow-variance";
  const descriptor = {
    format: "rg16float",
    size: { width: size, height: size, depthOrArrayLayers: 8 },
    usage: SHADOW_DEPTH_LAYER_USAGE
  };
  const texture = retained === void 0 ? graph.createTexture(label, descriptor) : graph.importTexture(label, descriptor, () => retained.texture(label, size, 8, "rg16float"));
  if (!texture.ok) return texture;
  const arrayView = graph.view(texture.value, { dimension: "2d-array", arrayLayerCount: 8 });
  if (!arrayView.ok) return arrayView;
  const result = {
    texture: texture.value,
    view: arrayView.value,
    format: "rg16float",
    sampleCount: 1
  };
  const parameters2 = graph.createBuffer("shadow-variance-params", { size: views.length * 256 });
  if (!parameters2.ok) return parameters2;
  const values = (frame, item) => {
    const internal = frame;
    const policy = internal.shadowUpdatePolicy?.(item);
    const extent = policy?.viewport ?? [item.size, item.size];
    const radius = policy?.blur?.radius ?? 1;
    const samples = policy?.blur?.samples ?? 8;
    if (!Number.isInteger(samples) || samples < 1 || samples > 64 || !Number.isFinite(radius) || radius < 0)
      throw new RhiError6({
        code: "webgpu-runtime-error",
        expected: "variance shadow radius >= 0 and blur samples integer in [1,64]",
        hint: "repair the light shadow filter parameters"
      });
    const bytes = new ArrayBuffer(32);
    new Float32Array(bytes).set([extent[0], extent[1], radius]);
    new Uint32Array(bytes)[3] = samples;
    new Float32Array(bytes)[4] = item.size / size;
    return new Uint8Array(bytes);
  };
  const uploaded = graph.addCopyPass("shadow-variance-prepare", {
    accesses: [{ resource: parameters2.value, usage: "copy-dst" }],
    encode: ({ frame, resources }) => {
      if (frame.pipelineState.extendedLightingAvailable !== true)
        throw new RhiError6({
          code: "webgpu-runtime-error",
          expected: "variance shadow sampled-texture capacity",
          hint: "use a device with the extended lighting texture budget"
        });
      const buffer = resources.buffer(parameters2.value).unwrap();
      for (const [index, view] of views.entries())
        frame.runtime.device.queue.writeBuffer(buffer, index * 256, values(frame, view)).unwrap();
    }
  });
  if (!uploaded.ok) return uploaded;
  let program;
  for (const [ordinal, item] of views.entries()) {
    const layer = item.kind === "directional" ? item.index : item.index + 4;
    const output = graph.view(texture.value, {
      dimension: "2d",
      baseArrayLayer: layer,
      arrayLayerCount: 1
    });
    if (!output.ok) return output;
    const vertical = createRenderPipelineTarget(graph, `shadow-variance-${layer}-vertical`, {
      format: "rg16float",
      size: { width: item.size, height: item.size }
    });
    if (!vertical.ok) return vertical;
    let initial = true;
    let dirty = false;
    for (const phase of ["vertical", "horizontal"]) {
      const target5 = phase === "vertical" ? vertical.value.view : output.value;
      const added = graph.addRasterPass(`shadow-variance-${layer}-${phase}`, {
        accesses: [
          { resource: item.depth.view, usage: "sampled-read" },
          ...phase === "horizontal" ? [{ resource: vertical.value.view, usage: "sampled-read" }] : [],
          { resource: parameters2.value, usage: "uniform-read" },
          { resource: target5, usage: "color-attachment" }
        ],
        colorAttachments: [
          {
            view: target5,
            loadOp: "clear",
            storeOp: "store",
            clearValue: { r: 1, g: 0, b: 0, a: 1 }
          }
        ],
        executeIf: (frame) => {
          if (phase === "vertical") {
            dirty = (retained === void 0 ? initial : !retained.retained(label, layer)) || item.rastered() || frame.shadowUpdatePolicy?.(item)?.auto === true;
            initial = false;
          }
          return dirty;
        },
        encode: ({ pass, frame, resources }) => {
          const internal = frame;
          const device = frame.runtime.device;
          if (program === void 0) {
            const source = internal.runtime.standardDeferredShaders?.shadowVariance;
            const factory = frame.runtime.shaderModuleFactory;
            if (source === void 0 || factory === void 0)
              throw new RhiError6({
                code: "webgpu-runtime-error",
                expected: "cooked variance shadow shader",
                hint: "rebuild the Engine shader manifest"
              });
            const module = factory.createShaderModule({ code: source, label: "forgeax::engine-shadow-variance" }).unwrap();
            const layout2 = device.createBindGroupLayout({
              entries: [
                {
                  binding: 0,
                  visibility: GPU_SHADER_STAGE_FRAGMENT,
                  buffer: { type: "uniform", hasDynamicOffset: true, minBindingSize: 32 }
                },
                {
                  binding: 1,
                  visibility: GPU_SHADER_STAGE_FRAGMENT,
                  texture: { sampleType: "depth", viewDimension: "2d" }
                },
                {
                  binding: 2,
                  visibility: GPU_SHADER_STAGE_FRAGMENT,
                  texture: { sampleType: "float", viewDimension: "2d" }
                },
                {
                  binding: 3,
                  visibility: GPU_SHADER_STAGE_FRAGMENT,
                  sampler: { type: "filtering" }
                }
              ]
            }).unwrap();
            const pipelineLayout2 = device.createPipelineLayout({ bindGroupLayouts: [layout2] }).unwrap();
            const pipeline = (phase2) => device.createRenderPipeline({
              label: `${label}-${phase2}`,
              layout: pipelineLayout2,
              vertex: { module, entryPoint: "vs_main", buffers: [] },
              fragment: {
                module,
                entryPoint: `fs_${phase2}`,
                targets: [{ format: "rg16float" }]
              },
              primitive: { topology: "triangle-list" }
            }).unwrap();
            program = {
              layout: layout2,
              vertical: pipeline("vertical"),
              horizontal: pipeline("horizontal"),
              groups: /* @__PURE__ */ new WeakMap()
            };
          }
          const buffer = resources.buffer(parameters2.value).unwrap();
          const depth2 = resources.textureView(item.depth.view).unwrap();
          const color = phase === "horizontal" ? resources.textureView(vertical.value.view).unwrap() : frame.pipelineState.defaultWhiteTextureView;
          const sampler = frame.pipelineState.defaultSampler;
          const layout = program.layout;
          const group = getOrCreateFromChain(
            program.groups,
            [buffer, depth2, color, sampler],
            label,
            () => device.createBindGroup({
              layout,
              entries: [
                { binding: 0, resource: { kind: "buffer", value: { buffer, size: 32 } } },
                { binding: 1, resource: { kind: "textureView", value: depth2 } },
                { binding: 2, resource: { kind: "textureView", value: color } },
                { binding: 3, resource: { kind: "sampler", value: sampler } }
              ]
            }).unwrap(),
            internal.bindGroupCounts
          );
          pass.setPipeline(program[phase]);
          pass.setBindGroup(0, group, [ordinal * 256]);
          pass.draw(3, 1, 0, 0);
          if (phase === "horizontal") retained?.rastered(label, layer);
        }
      });
      if (!added.ok) return added;
    }
  }
  return ok10(result);
}

// sdk/engine/node_modules/@forgeax/engine-render/src/typed-shadow-passes.ts
function shadowViewCacheMiss(frame, identity) {
  const context = frame;
  const gpuShadowViews = context.gpuDrivenShadowViews;
  if (identity.terrainReceiver !== void 0) {
    const logical = { kind: "directional", index: identity.index };
    const final = gpuShadowViews?.invalidationReason(logical);
    if (final !== void 0) return final;
    const staticReason = gpuShadowViews?.invalidationReason({ ...logical, layer: "static" });
    return (staticReason === "uncached" ? void 0 : staticReason) ?? context.directionalShadowCacheMiss;
  }
  if (gpuShadowViews !== void 0) return gpuShadowViews.invalidationReason(identity);
  if (identity.kind !== "directional") return "uncached";
  const cascades = context.directionalShadowCascadeMiss;
  return cascades !== void 0 && identity.index < cascades.length ? cascades[identity.index] : context.directionalShadowCacheMiss;
}
var shadowPreparationByGraph = /* @__PURE__ */ new WeakMap();
function shadowPipelinePreparationDemand(graph) {
  const views = shadowPreparationByGraph.get(graph);
  return views == null ? void 0 : (frame, identity) => views.get(shadowViewIdentityKey(identity))?.(frame) ?? true;
}
function registerShadowPreparation(graph, identity, demand) {
  let views = shadowPreparationByGraph.get(graph);
  if (views === null) return;
  if (identity.terrainReceiver !== void 0) {
    shadowPreparationByGraph.set(graph, null);
    return;
  }
  if (views === void 0) {
    views = /* @__PURE__ */ new Map();
    shadowPreparationByGraph.set(graph, views);
  }
  views.set(shadowViewIdentityKey(identity), demand);
}
function shadowViewRaster(graph, identity, shadowFeatures, target5) {
  let graphCompiled = true;
  let slot = -1;
  let decided;
  let dirtyRects;
  const reasonFor = (frame, follow) => {
    const empty = target5 === void 0 ? graphCompiled : !target5.retained();
    const context = frame;
    const policy = identity === void 0 ? void 0 : context.shadowUpdatePolicy?.(identity);
    if (identity?.kind === "point" && policy?.auto === false && context.frameState.shadowRaster.hasRevision(identity, policy.revision))
      return void 0;
    if (!empty && identity !== void 0 && policy !== void 0) {
      if (!context.frameState.shadowRaster.hasRevision(identity, policy.revision))
        return "source-changed";
      if (!policy.auto) return void 0;
    }
    return empty || graphCompiled && identity?.layer !== "static" ? "graph-compiled" : identity === void 0 ? void 0 : shadowFeatures !== void 0 ? "feature-draws" : shadowViewCacheMiss(frame, identity) ?? follow;
  };
  if (identity !== void 0)
    registerShadowPreparation(graph, identity, (frame) => reasonFor(frame) !== void 0);
  return {
    reasonFor,
    dirtyRects: () => dirtyRects,
    reason: () => decided,
    executeIf: (frame, follow) => {
      const reason = reasonFor(frame, follow);
      graphCompiled = false;
      decided = reason;
      if (reason !== void 0) target5?.rastered();
      const context = frame;
      dirtyRects = identity === void 0 || identity.terrainReceiver !== void 0 || reason === void 0 || reason === "graph-compiled" ? void 0 : context.gpuDrivenShadowViews?.dirtyRects(identity);
      slot = identity === void 0 ? -1 : context.frameState.shadowRaster.evaluate(
        identity,
        reason,
        context.gpuDrivenShadowViews?.texelCulled(identity),
        context.gpuDrivenShadowViews?.cameraCulled(identity),
        dirtyRects?.length,
        context.shadowUpdatePolicy?.(identity)?.revision
      );
      return reason !== void 0;
    },
    encode: (frame, pass, encode, passName) => {
      if (slot < 0) {
        encode(pass);
        return;
      }
      frame.frameState.shadowRaster.encode(
        slot,
        pass,
        encode,
        passName
      );
    }
  };
}
var MIN_SHADOW_ARRAY_LAYERS = 2;
var SPOT_SHADOW_LAYERS = 4;
function createShadowArrayTarget(graph, label, size, layers) {
  return createRenderPipelineTarget(
    graph,
    label,
    {
      format: "depth32float",
      size: { width: size, height: size, depthOrArrayLayers: layers }
    },
    { dimension: "2d-array", aspect: "depth-only", arrayLayerCount: layers }
  );
}
function shadowLayerTarget(graph, target5, label, layer, resolve) {
  const descriptor = {
    label,
    dimension: "2d",
    aspect: "depth-only",
    baseArrayLayer: layer,
    arrayLayerCount: 1
  };
  const view = resolve === void 0 ? graph.view(target5.texture, descriptor) : graph.importView(target5.texture, descriptor, resolve);
  if (!view.ok) return view;
  return ok11({ texture: target5.texture, view: view.value, format: target5.format, sampleCount: 1 });
}
function createRetainedShadowArrayTarget(graph, staticLayers, label, size, layers) {
  if (staticLayers === void 0) return createShadowArrayTarget(graph, label, size, layers);
  const texture = graph.importTexture(
    label,
    {
      format: "depth32float",
      size: { width: size, height: size, depthOrArrayLayers: layers },
      usage: SHADOW_DEPTH_LAYER_USAGE
    },
    () => staticLayers.texture(label, size, layers)
  );
  if (!texture.ok) return texture;
  const view = graph.importView(
    texture.value,
    {
      label: `${label}.view`,
      dimension: "2d-array",
      aspect: "depth-only",
      arrayLayerCount: layers
    },
    () => staticLayers.view(label)
  );
  if (!view.ok) return view;
  return ok11({ texture: texture.value, view: view.value, format: "depth32float", sampleCount: 1 });
}
function recordShadowPass(graph, name, target5, raster, encode, extraAccesses = [], depthLoadOp = "clear") {
  return graph.addRasterPass(name, {
    accesses: [{ resource: target5.view, usage: "depth-stencil-write" }, ...extraAccesses],
    colorAttachments: [],
    depthStencilAttachment: {
      view: target5.view,
      depthLoadOp,
      depthStoreOp: "store",
      depthClearValue: 0
    },
    executeIf: raster.executeIf,
    encode: ({ pass, frame, resources }) => raster.encode(frame, pass, (counted) => encode(counted, frame, resources), name)
  });
}
function projectionAccesses(projection) {
  return projection?.ok === true && projection.value?.graphResources !== void 0 ? shadowViewRasterAccesses(projection.value.graphResources) : [];
}
function recordStaticLayeredShadowPass(graph, projectGpuDrivenShadow, identity, name, target5, staticArray, staticLayers, staticLabel, layer, size, raster, encode, extraAccesses, reuseAdjacentShadow = false) {
  const staticIdentity = Object.freeze({ ...identity, layer: "static" });
  const staticProjection = projectGpuDrivenShadow(staticIdentity);
  if (!staticProjection.ok) return staticProjection;
  const staticLayer = shadowLayerTarget(
    graph,
    staticArray,
    `${name}-static-layer`,
    layer,
    staticLayers === void 0 ? void 0 : () => staticLayers.view(staticLabel, layer)
  );
  if (!staticLayer.ok) return staticLayer;
  const staticRaster = shadowViewRaster(
    graph,
    staticIdentity,
    void 0,
    staticLayers === void 0 ? void 0 : {
      retained: () => staticLayers.retained(staticLabel, layer),
      rastered: () => staticLayers.rastered(staticLabel, layer)
    }
  );
  registerShadowPreparation(
    graph,
    identity,
    (frame) => raster.reasonFor(
      frame,
      staticRaster.reasonFor(frame) === "graph-compiled" ? "static-layer-changed" : void 0
    ) !== void 0
  );
  const staticAdded = recordShadowPass(
    graph,
    `${name}.static`,
    staticLayer.value,
    {
      executeIf: (frame) => staticRaster.executeIf(frame) && staticRaster.dirtyRects() === void 0,
      encode: staticRaster.encode
    },
    (pass, frame) => encodeStaticShadowPass(frame, pass, identity, void 0, reuseAdjacentShadow),
    projectionAccesses(staticProjection)
  );
  if (!staticAdded.ok) return staticAdded;
  const partialAdded = recordShadowPass(
    graph,
    `${name}.static-partial`,
    staticLayer.value,
    { executeIf: () => staticRaster.dirtyRects() !== void 0, encode: staticRaster.encode },
    (pass, frame) => encodeStaticShadowPass(
      frame,
      pass,
      identity,
      {
        rects: staticRaster.dirtyRects() ?? [],
        size
      },
      reuseAdjacentShadow
    ),
    projectionAccesses(staticProjection),
    "load"
  );
  if (!partialAdded.ok) return partialAdded;
  let rasterFinal = false;
  const copied = graph.addCopyPass(`${name}.static-copy`, {
    accesses: [
      { resource: staticLayer.value.view, usage: "copy-src" },
      { resource: target5.view, usage: "copy-dst" }
    ],
    // A static layer rebuilt from an empty target changes the composed
    // layer even when the final view's own cache hits.
    executeIf: (frame) => {
      rasterFinal = raster.executeIf(
        frame,
        staticRaster.reason() === "graph-compiled" ? "static-layer-changed" : void 0
      );
      return rasterFinal;
    },
    encode: ({ encoder, resources }) => {
      const source = resources.texture(staticArray.texture);
      if (!source.ok) throw source.error;
      const destination = resources.texture(target5.texture);
      if (!destination.ok) throw destination.error;
      encoder.copyTextureToTexture(
        { texture: source.value, mipLevel: 0, origin: { x: 0, y: 0, z: layer } },
        { texture: destination.value, mipLevel: 0, origin: { x: 0, y: 0, z: layer } },
        { width: size, height: size, depthOrArrayLayers: 1 }
      );
    }
  });
  if (!copied.ok) return copied;
  const recorded = recordShadowPass(
    graph,
    name,
    target5,
    { executeIf: () => rasterFinal, encode: raster.encode },
    encode,
    extraAccesses,
    "load"
  );
  return recorded.ok ? ok11(staticRaster) : recorded;
}
function addTypedShadowPasses(graph, topology, {
  projectGpuDrivenShadow,
  shadowFeatures,
  cameraPyramid,
  staticLayers,
  depthLayers,
  reuseAdjacentShadow = false
} = {}) {
  const variance = [];
  let directional;
  if (topology.shadow.directional !== "disabled") {
    const {
      mapSize,
      cascadeCount,
      staticLayer = true,
      terrainReceivers = []
    } = topology.shadow.directional;
    const target5 = createRetainedShadowArrayTarget(
      graph,
      depthLayers,
      "directional-shadow-depth",
      mapSize,
      Math.max(MIN_SHADOW_ARRAY_LAYERS, cascadeCount * (1 + terrainReceivers.length))
    );
    if (!target5.ok) return target5;
    const directionalTarget = target5.value;
    directional = directionalTarget;
    let directionalStatic;
    if (projectGpuDrivenShadow !== void 0 && staticLayer) {
      const staticTarget = createRetainedShadowArrayTarget(
        graph,
        staticLayers,
        "directional-shadow-static",
        mapSize,
        Math.max(MIN_SHADOW_ARRAY_LAYERS, cascadeCount)
      );
      if (!staticTarget.ok) return staticTarget;
      directionalStatic = staticTarget.value;
    }
    const cascadeWork = [];
    for (let cascade = 0; cascade < cascadeCount; cascade += 1) {
      const identity = Object.freeze({ kind: "directional", index: cascade });
      const shadowProjection = projectGpuDrivenShadow?.(identity, cameraPyramid);
      if (shadowProjection !== void 0 && !shadowProjection.ok) return shadowProjection;
      const layer = shadowLayerTarget(
        graph,
        directionalTarget,
        `directional-shadow-cascade-${cascade}`,
        cascade
      );
      if (!layer.ok) return layer;
      const raster = shadowViewRaster(
        graph,
        identity,
        shadowFeatures,
        depthLayers === void 0 ? void 0 : {
          retained: () => depthLayers.retained("directional-shadow-depth", cascade),
          rastered: () => depthLayers.rastered("directional-shadow-depth", cascade)
        }
      );
      if (topology.shadow.variance?.directional)
        variance.push({
          kind: "directional",
          index: cascade,
          depth: layer.value,
          size: mapSize,
          rastered: () => raster.reason() !== void 0
        });
      const encode = (pass, frame, resources) => encodeDirectionalShadowPass(
        frame,
        pass,
        cascade,
        shadowFeatures === void 0 ? void 0 : (view) => shadowFeatures.encode(pass, frame, resources, view),
        void 0,
        reuseAdjacentShadow
      );
      const accesses = [
        ...projectionAccesses(shadowProjection),
        ...shadowFeatures?.accesses ?? []
      ];
      const added = projectGpuDrivenShadow !== void 0 && directionalStatic !== void 0 ? recordStaticLayeredShadowPass(
        graph,
        projectGpuDrivenShadow,
        identity,
        `shadowCascade${cascade}`,
        layer.value,
        directionalStatic,
        staticLayers,
        "directional-shadow-static",
        cascade,
        mapSize,
        raster,
        encode,
        accesses,
        reuseAdjacentShadow
      ) : recordShadowPass(
        graph,
        `shadowCascade${cascade}`,
        layer.value,
        raster,
        encode,
        accesses
      );
      if (!added.ok) return added;
      cascadeWork.push({ accesses, staticRaster: added.value ?? void 0 });
    }
    for (const [rootIndex, receiver] of terrainReceivers.entries()) {
      for (let cascade = 0; cascade < cascadeCount; cascade += 1) {
        const physicalLayer = cascadeCount * (rootIndex + 1) + cascade;
        const name = `shadowCascade${cascade}.terrain-${receiver.worldId}-${receiver.entityKey}`;
        const layer = shadowLayerTarget(graph, directionalTarget, `${name}.depth`, physicalLayer);
        if (!layer.ok) return layer;
        const identity = Object.freeze({
          kind: "directional",
          index: cascade,
          terrainReceiver: receiver
        });
        const raster = shadowViewRaster(
          graph,
          identity,
          shadowFeatures,
          depthLayers === void 0 ? void 0 : {
            retained: () => depthLayers.retained("directional-shadow-depth", physicalLayer),
            rastered: () => depthLayers.rastered("directional-shadow-depth", physicalLayer)
          }
        );
        const encode = (pass, frame, resources) => encodeDirectionalShadowPass(
          frame,
          pass,
          cascade,
          shadowFeatures === void 0 ? void 0 : (view) => shadowFeatures.encode(pass, frame, resources, view),
          receiver,
          reuseAdjacentShadow
        );
        let rasterFinal = false;
        if (directionalStatic !== void 0) {
          const sourceLayer = shadowLayerTarget(
            graph,
            directionalStatic,
            `${name}.gpu-static`,
            cascade
          );
          if (!sourceLayer.ok) return sourceLayer;
          const staticArray = directionalStatic;
          const copied = graph.addCopyPass(`${name}.static-copy`, {
            accesses: [
              { resource: sourceLayer.value.view, usage: "copy-src" },
              { resource: layer.value.view, usage: "copy-dst" }
            ],
            executeIf: (frame) => {
              const staticChanged = cascadeWork[cascade]?.staticRaster?.reason() !== void 0;
              rasterFinal = raster.executeIf(
                frame,
                staticChanged ? "static-layer-changed" : void 0
              );
              return rasterFinal;
            },
            encode: ({ encoder, resources }) => {
              const source = resources.texture(staticArray.texture);
              if (!source.ok) throw source.error;
              const target6 = resources.texture(directionalTarget.texture);
              if (!target6.ok) throw target6.error;
              encoder.copyTextureToTexture(
                { texture: source.value, origin: { x: 0, y: 0, z: cascade } },
                { texture: target6.value, origin: { x: 0, y: 0, z: physicalLayer } },
                { width: mapSize, height: mapSize, depthOrArrayLayers: 1 }
              );
            }
          });
          if (!copied.ok) return copied;
        }
        const added = recordShadowPass(
          graph,
          name,
          layer.value,
          directionalStatic === void 0 ? raster : { executeIf: () => rasterFinal, encode: raster.encode },
          encode,
          cascadeWork[cascade]?.accesses ?? [],
          directionalStatic === void 0 ? "clear" : "load"
        );
        if (!added.ok) return added;
      }
    }
    const observation = graph.addCopyPass("directional-shadow-observation", {
      accesses: [{ resource: directionalTarget.view, usage: "copy-src" }],
      encode: ({ frame, resources }) => {
        const internal = frame;
        const texture = resources.texture(directionalTarget.texture);
        if (!texture.ok) throw texture.error;
        internal.pipelineState.perPassResources.shadowTexture = texture.value;
      }
    });
    if (!observation.ok) return observation;
  }
  let point;
  if (topology.shadow.pointCount > 0) {
    const texture = graph.importTexture(
      "point-shadow-atlas",
      {
        format: "depth32float",
        size: {
          width: topology.shadow.pointFaceSize,
          height: topology.shadow.pointFaceSize,
          depthOrArrayLayers: 24
        },
        usage: GPU_TEXTURE_USAGE_RENDER_ATTACHMENT_AND_TEXTURE_BINDING | GPU_TEXTURE_USAGE_COPY_DST
      },
      (frame) => {
        const internal = frame;
        const atlas = internal.frameState.pointShadowAtlas?.getTexture();
        if (atlas === null || atlas === void 0) {
          throw new PointShadowAtlasUninitializedError();
        }
        return atlas;
      }
    );
    if (!texture.ok) return texture;
    const cube = graph.view(texture.value, {
      label: "point-shadow-atlas.cube-array",
      dimension: "cube-array",
      aspect: "depth-only",
      arrayLayerCount: 24
    });
    if (!cube.ok) return cube;
    point = {
      texture: texture.value,
      view: cube.value,
      format: "depth32float",
      sampleCount: 1
    };
    let pointStatic;
    if (projectGpuDrivenShadow !== void 0) {
      const staticTarget = createRetainedShadowArrayTarget(
        graph,
        staticLayers,
        "point-shadow-static",
        topology.shadow.pointFaceSize,
        topology.shadow.pointCount * 6
      );
      if (!staticTarget.ok) return staticTarget;
      pointStatic = staticTarget.value;
    }
    for (let pointIndex = 0; pointIndex < topology.shadow.pointCount; pointIndex += 1) {
      for (let face = 0; face < 6; face += 1) {
        const shadowProjection = projectGpuDrivenShadow?.({
          kind: "point",
          index: pointIndex,
          face
        });
        if (shadowProjection !== void 0 && !shadowProjection.ok) return shadowProjection;
        const identity = Object.freeze({ kind: "point", index: pointIndex, face });
        const faceView = graph.view(texture.value, {
          label: `point-shadow-${pointIndex}-${face}`,
          dimension: "2d",
          aspect: "depth-only",
          baseArrayLayer: pointIndex * 6 + face,
          arrayLayerCount: 1
        });
        if (!faceView.ok) return faceView;
        const faceTarget = {
          texture: texture.value,
          view: faceView.value,
          format: "depth32float",
          sampleCount: 1
        };
        const raster = shadowViewRaster(graph, identity, shadowFeatures);
        const encode = (pass, frame, resources) => encodePointShadowPass(
          frame,
          pass,
          pointIndex,
          face,
          shadowFeatures === void 0 ? void 0 : (view) => shadowFeatures.encode(pass, frame, resources, view),
          reuseAdjacentShadow
        );
        const accesses = [
          ...projectionAccesses(shadowProjection),
          ...shadowFeatures?.accesses ?? []
        ];
        const name = `point-shadow-${pointIndex}-${face}`;
        const added = projectGpuDrivenShadow !== void 0 && pointStatic !== void 0 ? recordStaticLayeredShadowPass(
          graph,
          projectGpuDrivenShadow,
          identity,
          name,
          faceTarget,
          pointStatic,
          staticLayers,
          "point-shadow-static",
          pointIndex * 6 + face,
          topology.shadow.pointFaceSize,
          raster,
          encode,
          accesses,
          reuseAdjacentShadow
        ) : recordShadowPass(graph, name, faceTarget, raster, encode, accesses);
        if (!added.ok) return added;
      }
    }
  }
  const spot = createRetainedShadowArrayTarget(
    graph,
    depthLayers,
    "spot-shadow-depth",
    topology.shadow.spotCount === 0 ? 1 : topology.shadow.spotMapSize,
    SPOT_SHADOW_LAYERS
  );
  if (!spot.ok) return spot;
  let spotStatic;
  if (projectGpuDrivenShadow !== void 0 && topology.shadow.spotCount > 0) {
    const staticTarget = createRetainedShadowArrayTarget(
      graph,
      staticLayers,
      "spot-shadow-static",
      topology.shadow.spotMapSize,
      SPOT_SHADOW_LAYERS
    );
    if (!staticTarget.ok) return staticTarget;
    spotStatic = staticTarget.value;
  }
  for (let spotIndex = 0; spotIndex < Math.max(1, topology.shadow.spotCount); spotIndex += 1) {
    const identity = Object.freeze({ kind: "spot", index: spotIndex });
    const shadowProjection = projectGpuDrivenShadow?.(identity, cameraPyramid);
    if (shadowProjection !== void 0 && !shadowProjection.ok) return shadowProjection;
    const layer = shadowLayerTarget(graph, spot.value, `spot-shadow-layer-${spotIndex}`, spotIndex);
    if (!layer.ok) return layer;
    const name = topology.shadow.spotCount === 0 ? "spot-shadow" : `spot-shadow-${spotIndex}`;
    const raster = shadowViewRaster(
      graph,
      topology.shadow.spotCount > 0 ? identity : void 0,
      shadowFeatures,
      depthLayers === void 0 ? void 0 : {
        retained: () => depthLayers.retained("spot-shadow-depth", spotIndex),
        rastered: () => depthLayers.rastered("spot-shadow-depth", spotIndex)
      }
    );
    if (topology.shadow.variance?.spots.includes(spotIndex))
      variance.push({
        kind: "spot",
        index: spotIndex,
        depth: layer.value,
        size: topology.shadow.spotMapSize,
        rastered: () => raster.reason() !== void 0
      });
    const encode = (pass, frame, resources) => encodeSpotShadowPass(
      frame,
      pass,
      spotIndex,
      shadowFeatures === void 0 ? void 0 : (view) => shadowFeatures.encode(pass, frame, resources, view),
      reuseAdjacentShadow
    );
    const accesses = [...projectionAccesses(shadowProjection), ...shadowFeatures?.accesses ?? []];
    const added = projectGpuDrivenShadow !== void 0 && spotStatic !== void 0 ? recordStaticLayeredShadowPass(
      graph,
      projectGpuDrivenShadow,
      identity,
      name,
      layer.value,
      spotStatic,
      staticLayers,
      "spot-shadow-static",
      spotIndex,
      topology.shadow.spotMapSize,
      raster,
      encode,
      accesses,
      reuseAdjacentShadow
    ) : recordShadowPass(graph, name, layer.value, raster, encode, accesses);
    if (!added.ok) return added;
  }
  const moments = addVarianceShadowPasses(graph, variance, depthLayers);
  if (!moments.ok) return moments;
  return ok11({ directional, spot: spot.value, point, moments: moments.value });
}

// sdk/engine/node_modules/@forgeax/engine-render/src/pipeline/analytic-fog-pass.ts
import {
  RenderGraphError as RenderGraphError5
} from "@forgeax/engine-render-graph";
import { err as err5, ok as ok14 } from "@forgeax/engine-types";

// sdk/engine/node_modules/@forgeax/engine-render/src/environment/compose.ts
import {
  RhiError as RhiError7
} from "@forgeax/engine-rhi";
import { ok as ok12 } from "@forgeax/engine-types";
function addAtmosphereComposition(graph, color, depth2, atmosphere) {
  const view = graph.importBuffer(
    "atmosphere-composition-view",
    { size: VIEW_UNIFORM_BYTES, usage: 72 },
    (frame) => frame.pipelineState.viewUniformBuffer
  );
  if (!view.ok) return view;
  const textures = [
    depth2,
    atmosphere.transmittance,
    atmosphere.multipleScattering,
    atmosphere.aerialPerspective,
    atmosphere.aerialTransmittance,
    atmosphere.distantSkyLight
  ];
  let state;
  const added = graph.addRasterPass("atmosphere-opaque-composition", {
    accesses: [
      ...atmosphereVisibilityAccesses(atmosphere.visibility),
      { resource: view.value, usage: "uniform-read" },
      ...textures.map((resource) => ({ resource, usage: "sampled-read" })),
      { resource: color.view, usage: "color-attachment" }
    ],
    colorAttachments: [{ view: color.view, loadOp: "load", storeOp: "store" }],
    encode: ({ frame, pass, resources }) => {
      const device = frame.runtime.device;
      if (state === void 0) {
        const source = frame.atmosphereShaders?.compose;
        const factory = frame.runtime.shaderModuleFactory;
        if (source === void 0 || factory === void 0)
          throw new RhiError7({
            code: "shader-compile-failed",
            expected: "atmosphere composition program",
            hint: "rebuild the shader manifest"
          });
        const module = factory.createShaderModule({ code: source, label: "atmosphere_compose" }).unwrap();
        const layout = device.createBindGroupLayout({
          entries: [
            {
              binding: 0,
              visibility: 2,
              buffer: { type: "uniform", minBindingSize: VIEW_UNIFORM_BYTES }
            },
            ...textures.map((_, i) => ({
              binding: i + 1,
              visibility: 2,
              texture: {
                sampleType: i === 0 ? "depth" : "float",
                viewDimension: i === 3 || i === 4 ? "3d" : "2d"
              }
            })),
            { binding: 7, visibility: 2, sampler: { type: "filtering" } }
          ]
        }).unwrap();
        const pipelineLayout2 = device.createPipelineLayout({ bindGroupLayouts: [layout, atmosphereVisibilityLayout(device)] }).unwrap();
        const pipelines = ["extinction", "inscatter"].map(
          (stage) => device.createRenderPipeline({
            label: `atmosphere-${stage}`,
            layout: pipelineLayout2,
            vertex: { module, entryPoint: "atmosphere_compose_vs", buffers: [] },
            fragment: {
              module,
              entryPoint: `atmosphere_${stage}_fs`,
              targets: [
                {
                  format: color.format,
                  blend: {
                    color: {
                      operation: "add",
                      srcFactor: stage === "extinction" ? "zero" : "one",
                      dstFactor: stage === "extinction" ? "src" : "one"
                    },
                    alpha: { operation: "add", srcFactor: "zero", dstFactor: "one" }
                  }
                }
              ]
            },
            primitive: { topology: "triangle-list" }
          }).unwrap()
        );
        state = {
          layout,
          pipelines,
          sampler: device.createSampler({ minFilter: "linear", magFilter: "linear" }).unwrap()
        };
      }
      const bindings = device.createBindGroup({
        layout: state.layout,
        entries: [
          {
            binding: 0,
            resource: {
              kind: "buffer",
              value: { buffer: resources.buffer(view.value).unwrap(), size: VIEW_UNIFORM_BYTES }
            }
          },
          ...textures.map((texture, i) => ({
            binding: i + 1,
            resource: {
              kind: "textureView",
              value: resources.textureView(texture).unwrap()
            }
          })),
          { binding: 7, resource: { kind: "sampler", value: state.sampler } }
        ]
      }).unwrap();
      for (const pipeline of state.pipelines) {
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindings);
        pass.setBindGroup(
          1,
          atmosphereVisibilityGroup(
            frame,
            resources.buffer(view.value).unwrap(),
            0,
            atmosphere.visibility.directional === void 0 ? void 0 : resources.textureView(atmosphere.visibility.directional).unwrap(),
            atmosphere.visibility.cloud === void 0 ? void 0 : resources.textureView(atmosphere.visibility.cloud).unwrap()
          )
        );
        pass.draw(3);
      }
    }
  });
  return added.ok ? ok12(void 0) : added;
}

// sdk/engine/node_modules/@forgeax/engine-render/src/volume/passes.ts
import { RenderGraphError as RenderGraphError4 } from "@forgeax/engine-render-graph";
import { RhiError as RhiError8 } from "@forgeax/engine-rhi";
import { err as err4, ok as ok13 } from "@forgeax/engine-types";

// sdk/engine/node_modules/@forgeax/engine-render/src/volume/composite-scissor.ts
var CLIP_ROWS = [0, 1, 2, 3];
function projectVolumeCompositeBounds(owners, viewProjection, cameraPosition) {
  if (owners.length === 0 || viewProjection.length !== 16 || cameraPosition.length !== 3 || !Array.from(cameraPosition).every(Number.isFinite))
    return void 0;
  const matrix = Array.from(viewProjection);
  if (!matrix.every(Number.isFinite)) return void 0;
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  const clip = [0, 0, 0, 0];
  const error = [0, 0, 0, 0];
  for (const bounds of owners) {
    if (!bounds.min.every(Number.isFinite) || !bounds.max.every(Number.isFinite) || bounds.max.some((value, axis) => value <= (bounds.min[axis] ?? value)))
      return void 0;
    if (bounds.min.every((v, axis) => v <= (cameraPosition[axis] ?? v)) && bounds.max.every((v, axis) => v >= (cameraPosition[axis] ?? v)))
      return void 0;
    for (let corner = 0; corner < 8; corner++) {
      const px = bounds[corner & 1 ? "max" : "min"][0];
      const py = bounds[corner & 2 ? "max" : "min"][1];
      const pz = bounds[corner & 4 ? "max" : "min"][2];
      let output = 0;
      for (const row of CLIP_ROWS) {
        let value = 0;
        let magnitude = 0;
        for (let column = 0; column < 4; column++) {
          const term = (matrix[column * 4 + row] ?? Number.NaN) * (column === 0 ? px : column === 1 ? py : column === 2 ? pz : 1);
          value += term;
          magnitude += Math.abs(term);
        }
        if (magnitude > 3402823e32) return void 0;
        clip[output] = value;
        error[output++] = 8 * 2 ** -23 * (magnitude + 1);
      }
      const w = clip[3] ?? Number.NaN;
      const wError = error[3] ?? Infinity;
      if (!(w > wError) || !clip.every(Number.isFinite)) return void 0;
      if (w - (clip[2] ?? Infinity) <= wError + (error[2] ?? Infinity)) return void 0;
      const x = (clip[0] ?? Number.NaN) / w;
      const y = (clip[1] ?? Number.NaN) / w;
      const ex = ((error[0] ?? Infinity) + Math.abs(x) * wError) / (w - wError);
      const ey = ((error[1] ?? Infinity) + Math.abs(y) * wError) / (w - wError);
      left = Math.min(left, (x - ex) * 0.5 + 0.5);
      right = Math.max(right, (x + ex) * 0.5 + 0.5);
      top = Math.min(top, 0.5 - (y + ey) * 0.5);
      bottom = Math.max(bottom, 0.5 - (y - ey) * 0.5);
    }
  }
  if (![left, top, right, bottom].every(Number.isFinite)) return void 0;
  return [left, top, right, bottom];
}
function volumeCompositeScissor(bounds, width, height, resolvedWidth, resolvedHeight) {
  if (bounds === void 0 || ![width, height, resolvedWidth, resolvedHeight].every(
    (value) => Number.isSafeInteger(value) && value > 0
  ) || !bounds.every(Number.isFinite))
    return void 0;
  const padX = 3 * width / resolvedWidth + 2;
  const padY = 3 * height / resolvedHeight + 2;
  const x = Math.max(0, Math.floor(bounds[0] * width - padX));
  const y = Math.max(0, Math.floor(bounds[1] * height - padY));
  const endX = Math.min(width, Math.ceil(bounds[2] * width + padX));
  const endY = Math.min(height, Math.ceil(bounds[3] * height + padY));
  if (endX <= x || endY <= y || x === 0 && y === 0 && endX === width && endY === height)
    return void 0;
  return [x, y, endX - x, endY - y];
}

// sdk/engine/node_modules/@forgeax/engine-render/src/volume/passes.ts
function pipelineError(stage) {
  return new RhiError8({
    code: "rhi-not-available",
    expected: `volumetric fog ${stage} pipeline to be available`,
    hint: "construct the renderer through a backend pack with shader module support"
  });
}
function shaderSource2(frame, stage) {
  const source = frame.volumetricFogShaders?.[stage];
  if (source === void 0) throw pipelineError(`${stage} shader source`);
  return source;
}
function volumeContext(frame) {
  const runtime = frame.runtime;
  if (runtime.shaderModuleFactory === void 0) throw pipelineError("shader module factory");
  return {
    device: runtime.device,
    deviceScope: runtime.deviceScope,
    shaderModuleFactory: runtime.shaderModuleFactory
  };
}
function volumeBindGroup(frame, layout, entries) {
  const group = frame.runtime.device.createBindGroup({ layout, entries });
  if (!group.ok) throw group.error;
  return group.value;
}
function importVolumeInputs(graph, topology, linearHdr, sceneDepth, directionalShadow, spotShadow, selectedLightKind, clusterBuffers, cloudShadow) {
  const volume = topology.volumetricFog;
  if (volume?.enabled !== true || volume.format === void 0 || volume.extent === void 0)
    return ok13(void 0);
  if (clusterBuffers === null || clusterBuffers.kind !== "storage") {
    return err4(
      new RenderGraphError4({
        code: "resource-descriptor-invalid",
        expected: "volumetric fog consumes the Standard Cluster light buffers",
        hint: "enable the storage-backed Standard Cluster transport before enabling volumetric fog",
        detail: {
          resourceLabel: "volumetric-fog",
          field: "clusterBuffers",
          expected: "StandardClusterGraphBuffers",
          actual: "missing"
        }
      })
    );
  }
  const texture = graph.importTexture(
    "volume-density",
    {
      format: volume.format,
      size: {
        width: volume.extent.width,
        height: volume.extent.height,
        depthOrArrayLayers: volume.extent.depth
      },
      dimension: "3d",
      usage: GPU_TEXTURE_USAGE_TEXTURE_BINDING
    },
    (frame) => {
      const context = frame.volumetricFog;
      if (context === void 0) throw pipelineError("density residency");
      return context.densityTexture;
    }
  );
  if (!texture.ok) return texture;
  const density = graph.importView(
    texture.value,
    { label: "volume-density.view", dimension: "3d" },
    (frame) => {
      const context = frame.volumetricFog;
      if (context === void 0) throw pipelineError("density view residency");
      return context.densityView;
    }
  );
  if (!density.ok) return density;
  const additionalDensities = [];
  for (const [index, member] of (volume.additional ?? []).entries()) {
    const texture2 = graph.importTexture(
      `volume-density-${index + 1}`,
      {
        format: member.format,
        size: {
          width: member.extent.width,
          height: member.extent.height,
          depthOrArrayLayers: member.extent.depth
        },
        dimension: "3d",
        usage: GPU_TEXTURE_USAGE_TEXTURE_BINDING
      },
      (frame) => {
        const value = frame.volumetricFog?.additional?.[index];
        if (value === void 0) throw pipelineError("local density residency");
        return value.densityTexture;
      }
    );
    if (!texture2.ok) return texture2;
    const view2 = graph.importView(
      texture2.value,
      { label: `volume-density-${index + 1}.view`, dimension: "3d" },
      (frame) => {
        const value = frame.volumetricFog?.additional?.[index];
        if (value === void 0) throw pipelineError("local density view residency");
        return value.densityView;
      }
    );
    if (!view2.ok) return view2;
    additionalDensities.push(view2.value);
  }
  const params2 = graph.importBuffer(
    "volume-params",
    {
      size: VOLUMETRIC_FOG_PARAMS_BYTES,
      usage: GPU_BUFFER_USAGE_UNIFORM | GPU_BUFFER_USAGE_COPY_DST
    },
    (frame) => {
      const context = frame.volumetricFog;
      if (context === void 0) throw pipelineError("parameter residency");
      return context.paramsBuffer;
    }
  );
  if (!params2.ok) return params2;
  const view = graph.importBuffer(
    "volume-view",
    { size: VIEW_UNIFORM_BYTES, usage: GPU_BUFFER_USAGE_UNIFORM | GPU_BUFFER_USAGE_COPY_DST },
    (frame) => frame.pipelineState.viewUniformBuffer
  );
  if (!view.ok) return view;
  let projector;
  if (volume.projector !== void 0) {
    const projectorTexture = graph.importTexture(
      "spot-projector",
      {
        format: "rgba8unorm-srgb",
        size: { width: 128, height: 128, depthOrArrayLayers: 1 },
        dimension: "2d",
        usage: GPU_TEXTURE_USAGE_TEXTURE_BINDING
      },
      (frame) => {
        const context = frame.volumetricFog;
        if (context?.projectorTexture === void 0) throw pipelineError("projector residency");
        return context.projectorTexture;
      }
    );
    if (!projectorTexture.ok) return projectorTexture;
    const projectorView = graph.importView(
      projectorTexture.value,
      { label: "spot-projector.view", dimension: "2d" },
      (frame) => {
        const context = frame.volumetricFog;
        if (context?.projectorView === void 0) throw pipelineError("projector view residency");
        return context.projectorView;
      }
    );
    if (!projectorView.ok) return projectorView;
    projector = projectorView.value;
  }
  return ok13({
    linearHdr,
    sceneDepth,
    density: density.value,
    additionalDensities,
    params: params2.value,
    view: view.value,
    ...directionalShadow === void 0 ? {} : { directionalShadow },
    spotShadow,
    lightData: clusterBuffers.lightData,
    clusterUniform: clusterBuffers.clusterUniform,
    selectedLightKind: selectedLightKind ?? "directional",
    ...projector === void 0 ? {} : { projector },
    ...cloudShadow === void 0 ? {} : { cloudShadow }
  });
}
function addAuthoredVolumetricFogPasses(graph, topology, linearHdr, sceneDepth, directionalShadow, spotShadow, clusterBuffers, cloudShadow, atmosphereTransmittance) {
  const shadowLightKind = topology.volumetricFog?.spotLightEntity === void 0 ? topology.volumetricFog?.lightKind : "spot";
  const imported = importVolumeInputs(
    graph,
    topology,
    linearHdr,
    sceneDepth,
    directionalShadow,
    spotShadow,
    shadowLightKind,
    clusterBuffers,
    cloudShadow
  );
  if (!imported.ok) return imported;
  if (imported.value === void 0) return ok13(void 0);
  const resources = createVolumetricFogResources(
    graph,
    topology.volumetricFog?.froxelExtent ?? { width: 64, height: 64, depth: 64 },
    topology.volumetricFog?.resolvedExtent
  );
  if (!resources.ok) return resources;
  return addVolumetricFogPasses(graph, {
    ...imported.value,
    compositeNeighbors: resolveVolumetricFogProfile(topology.standardProfile ?? {}).quality === "low" ? 4 : 8,
    atmosphereTransmittance,
    resources: resources.value
  });
}
function addVolumetricFogPasses(graph, inputs) {
  const dispatchX = Math.ceil(inputs.resources.extent.width / 8);
  const dispatchY = Math.ceil(inputs.resources.extent.height / 8);
  const packedLayers = Math.ceil(inputs.resources.extent.depth / VOLUME_PACKING_Z);
  const resolvedDispatchX = Math.ceil(inputs.resources.resolvedExtent.width / 8);
  const resolvedDispatchY = Math.ceil(inputs.resources.resolvedExtent.height / 8);
  const shadowResource = inputs.directionalShadow ?? inputs.spotShadow;
  let inject;
  let integrate;
  let temporal;
  let composite3;
  let compositeLayout;
  let shadowSampler;
  let linearSampler;
  let densitySampler;
  let compositeSampler;
  const injected = graph.addComputePass("volume-inject", {
    accesses: [
      { resource: inputs.params, usage: "uniform-read" },
      { resource: inputs.view, usage: "uniform-read" },
      {
        resource: shadowResource,
        usage: "sampled-read"
      },
      { resource: inputs.lightData, usage: "storage-read" },
      { resource: inputs.clusterUniform, usage: "uniform-read" },
      ...inputs.projector === void 0 ? [] : [{ resource: inputs.projector, usage: "sampled-read" }],
      { resource: inputs.resources.froxelView, usage: "storage-write" },
      { resource: inputs.spotShadow, usage: "sampled-read" }
    ],
    encode: ({ pass, frame, resources }) => {
      inject ??= volumeComputeState(
        volumeContext(frame),
        shaderSource2(frame, "inject"),
        "volume_inject"
      );
      const shadow = resources.textureView(shadowResource);
      const spotShadow = resources.textureView(inputs.spotShadow);
      if (!spotShadow.ok) throw spotShadow.error;
      const params2 = resources.buffer(inputs.params);
      const view = resources.buffer(inputs.view);
      const lightData = resources.buffer(inputs.lightData);
      const clusterUniform = resources.buffer(inputs.clusterUniform);
      const froxel = resources.textureView(inputs.resources.froxelView);
      if (!shadow.ok) throw shadow.error;
      if (!params2.ok) throw params2.error;
      if (!view.ok) throw view.error;
      if (!lightData.ok) throw lightData.error;
      if (!clusterUniform.ok) throw clusterUniform.error;
      if (!froxel.ok) throw froxel.error;
      shadowSampler ??= frame.runtime.device.createSampler({ compare: "greater" }).unwrap();
      const bindings = volumeBindGroup(frame, inject.layout, [
        {
          binding: 0,
          resource: { kind: "buffer", value: { buffer: view.value, size: VIEW_UNIFORM_BYTES } }
        },
        { binding: 3, resource: { kind: "textureView", value: shadow.value } },
        { binding: 4, resource: { kind: "sampler", value: shadowSampler } },
        { binding: 5, resource: { kind: "buffer", value: { buffer: params2.value } } },
        { binding: 6, resource: { kind: "textureView", value: froxel.value } },
        { binding: 7, resource: { kind: "buffer", value: { buffer: lightData.value } } },
        { binding: 8, resource: { kind: "buffer", value: { buffer: clusterUniform.value } } },
        { binding: 9, resource: { kind: "textureView", value: spotShadow.value } }
      ]);
      pass.setPipeline(inject.pipeline);
      pass.setBindGroup(0, bindings);
      pass.dispatchWorkgroups(dispatchX, dispatchY, packedLayers);
    }
  });
  if (!injected.ok) return injected;
  const integratePass = graph.addComputePass("volume-integrate", {
    accesses: [
      ...inputs.atmosphereTransmittance === void 0 ? [] : [{ resource: inputs.atmosphereTransmittance, usage: "sampled-read" }],
      { resource: inputs.resources.froxelView, usage: "sampled-read" },
      { resource: inputs.sceneDepth, usage: "sampled-read" },
      { resource: inputs.density, usage: "sampled-read" },
      ...(inputs.additionalDensities ?? []).map((resource) => ({
        resource,
        usage: "sampled-read"
      })),
      { resource: inputs.resources.resolvedView, usage: "storage-write" },
      { resource: inputs.resources.historyView, usage: "storage-write" },
      { resource: inputs.resources.temporalView, usage: "storage-write" },
      { resource: inputs.params, usage: "uniform-read" },
      { resource: inputs.view, usage: "uniform-read" },
      { resource: inputs.lightData, usage: "storage-read" },
      { resource: inputs.clusterUniform, usage: "uniform-read" },
      ...inputs.projector === void 0 ? [] : [{ resource: inputs.projector, usage: "sampled-read" }],
      ...inputs.cloudShadow === void 0 ? [] : [{ resource: inputs.cloudShadow, usage: "sampled-read" }]
    ],
    encode: ({ pass, frame, resources }) => {
      integrate ??= volumeComputeState(
        volumeContext(frame),
        shaderSource2(frame, "integrate"),
        "volume_integrate"
      );
      const froxel = resources.textureView(inputs.resources.froxelView);
      const depth2 = resources.textureView(inputs.sceneDepth);
      const density = resources.textureView(inputs.density);
      const resolved = resources.textureView(inputs.resources.resolvedView);
      const historySeed = resources.textureView(inputs.resources.historyView);
      const temporalSeed = resources.textureView(inputs.resources.temporalView);
      const params2 = resources.buffer(inputs.params);
      const view = resources.buffer(inputs.view);
      const lightData = resources.buffer(inputs.lightData);
      const clusterUniform = resources.buffer(inputs.clusterUniform);
      const projector = inputs.projector === void 0 ? void 0 : resources.textureView(inputs.projector);
      const cloudShadow = inputs.cloudShadow === void 0 ? void 0 : resources.textureView(inputs.cloudShadow);
      if (!froxel.ok) throw froxel.error;
      if (!depth2.ok) throw depth2.error;
      if (!density.ok) throw density.error;
      if (!resolved.ok) throw resolved.error;
      if (!historySeed.ok) throw historySeed.error;
      if (!temporalSeed.ok) throw temporalSeed.error;
      if (!params2.ok) throw params2.error;
      if (!view.ok) throw view.error;
      if (!lightData.ok) throw lightData.error;
      if (!clusterUniform.ok) throw clusterUniform.error;
      if (projector !== void 0 && !projector.ok) throw projector.error;
      if (cloudShadow !== void 0 && !cloudShadow.ok) throw cloudShadow.error;
      linearSampler ??= frame.runtime.device.createSampler({
        minFilter: "linear",
        magFilter: "linear"
      }).unwrap();
      densitySampler ??= frame.runtime.device.createSampler({
        minFilter: "linear",
        magFilter: "linear",
        addressModeU: "repeat",
        addressModeV: "repeat",
        addressModeW: "repeat"
      }).unwrap();
      const bindings = volumeBindGroup(frame, integrate.layout, [
        {
          binding: 25,
          resource: {
            kind: "textureView",
            value: inputs.atmosphereTransmittance === void 0 ? frame.pipelineState.defaultWhiteTextureView : resources.textureView(inputs.atmosphereTransmittance).unwrap()
          }
        },
        { binding: 26, resource: { kind: "sampler", value: frame.pipelineState.defaultSampler } },
        { binding: 0, resource: { kind: "textureView", value: froxel.value } },
        { binding: 1, resource: { kind: "textureView", value: depth2.value } },
        { binding: 2, resource: { kind: "textureView", value: resolved.value } },
        { binding: 3, resource: { kind: "buffer", value: { buffer: params2.value } } },
        {
          binding: 4,
          resource: { kind: "buffer", value: { buffer: view.value, size: VIEW_UNIFORM_BYTES } }
        },
        { binding: 5, resource: { kind: "sampler", value: linearSampler } },
        { binding: 6, resource: { kind: "textureView", value: density.value } },
        { binding: 7, resource: { kind: "sampler", value: densitySampler } },
        { binding: 8, resource: { kind: "textureView", value: historySeed.value } },
        { binding: 9, resource: { kind: "textureView", value: temporalSeed.value } },
        { binding: 10, resource: { kind: "buffer", value: { buffer: lightData.value } } },
        { binding: 11, resource: { kind: "buffer", value: { buffer: clusterUniform.value } } },
        {
          binding: 12,
          resource: {
            kind: "textureView",
            value: projector === void 0 ? frame.pipelineState.defaultWhiteTextureView : projector.value
          }
        },
        {
          binding: 13,
          resource: {
            kind: "sampler",
            value: frame.volumetricFog?.projectorSampler ?? frame.pipelineState.defaultSampler
          }
        },
        {
          binding: 16,
          resource: {
            kind: "textureView",
            value: cloudShadow === void 0 ? frame.pipelineState.defaultWhiteTextureView : cloudShadow.value
          }
        },
        {
          binding: 17,
          resource: { kind: "sampler", value: frame.pipelineState.defaultSampler }
        },
        ...Array.from({ length: MAX_VOLUMETRIC_FOG_OWNERS - 1 }, (_, index) => {
          const view2 = resources.textureView(inputs.additionalDensities?.[index] ?? inputs.density);
          if (!view2.ok) throw view2.error;
          return {
            binding: additionalVolumeDensityBinding(index),
            resource: { kind: "textureView", value: view2.value }
          };
        })
      ]);
      pass.setPipeline(integrate.pipeline);
      pass.setBindGroup(0, bindings);
      pass.dispatchWorkgroups(resolvedDispatchX, resolvedDispatchY, 1);
    }
  });
  if (!integratePass.ok) return integratePass;
  const temporalPass = graph.addComputePass("volume-temporal", {
    accesses: [
      { resource: inputs.resources.resolvedView, usage: "sampled-read" },
      { resource: inputs.resources.historyView, usage: "sampled-storage-read-write" },
      { resource: inputs.resources.temporalView, usage: "sampled-storage-read-write" },
      { resource: inputs.params, usage: "uniform-read" },
      { resource: inputs.view, usage: "uniform-read" }
    ],
    encode: ({ pass, frame, resources }) => {
      temporal ??= volumeComputeState(
        volumeContext(frame),
        shaderSource2(frame, "temporal"),
        "volume_temporal"
      );
      const current2 = resources.textureView(inputs.resources.resolvedView);
      const history = resources.textureView(
        frame.volumetricFog?.historyReadSlot === 0 ? inputs.resources.historyView : inputs.resources.temporalView
      );
      const pending = resources.textureView(
        frame.volumetricFog?.historyWriteSlot === 0 ? inputs.resources.historyView : inputs.resources.temporalView
      );
      const params2 = resources.buffer(inputs.params);
      const view = resources.buffer(inputs.view);
      if (!current2.ok) throw current2.error;
      if (!history.ok) throw history.error;
      if (!pending.ok) throw pending.error;
      if (!params2.ok) throw params2.error;
      if (!view.ok) throw view.error;
      const bindings = volumeBindGroup(frame, temporal.layout, [
        { binding: 0, resource: { kind: "textureView", value: current2.value } },
        { binding: 1, resource: { kind: "textureView", value: history.value } },
        { binding: 2, resource: { kind: "textureView", value: pending.value } },
        { binding: 3, resource: { kind: "buffer", value: { buffer: params2.value } } },
        {
          binding: 4,
          resource: { kind: "buffer", value: { buffer: view.value, size: VIEW_UNIFORM_BYTES } }
        }
      ]);
      pass.setPipeline(temporal.pipeline);
      pass.setBindGroup(0, bindings);
      pass.dispatchWorkgroups(resolvedDispatchX, resolvedDispatchY, 1);
    }
  });
  if (!temporalPass.ok) return temporalPass;
  return graph.addRasterPass("volume-composite", {
    accesses: [
      { resource: inputs.resources.historyView, usage: "sampled-read" },
      { resource: inputs.resources.temporalView, usage: "sampled-read" },
      { resource: inputs.sceneDepth, usage: "sampled-read" },
      { resource: inputs.view, usage: "uniform-read" },
      { resource: inputs.linearHdr.view, usage: "color-attachment" }
    ],
    colorAttachments: [
      {
        view: inputs.linearHdr.view,
        loadOp: "load",
        storeOp: "store",
        clearValue: { r: 0, g: 0, b: 0, a: 1 }
      }
    ],
    encode: ({ pass, frame, resources }) => {
      if (composite3 === void 0) {
        const state = volumeCompositeState(
          volumeContext(frame),
          shaderSource2(frame, "composite"),
          inputs.linearHdr.format,
          inputs.compositeNeighbors ?? 8
        );
        composite3 = state.pipeline;
        compositeLayout = state.layout;
      }
      const resolved = resources.textureView(
        frame.volumetricFog?.historyWriteSlot === 0 ? inputs.resources.historyView : inputs.resources.temporalView
      );
      const depth2 = resources.textureView(inputs.sceneDepth);
      const view = resources.buffer(inputs.view);
      if (!resolved.ok) throw resolved.error;
      if (!depth2.ok) throw depth2.error;
      if (!view.ok) throw view.error;
      compositeSampler ??= frame.runtime.device.createSampler({
        label: "volume_composite.sampler",
        minFilter: "linear",
        magFilter: "linear"
      }).unwrap();
      const bindings = frame.runtime.device.createBindGroup({
        layout: compositeLayout,
        entries: [
          { binding: 0, resource: { kind: "textureView", value: resolved.value } },
          { binding: 1, resource: { kind: "sampler", value: compositeSampler } },
          { binding: 2, resource: { kind: "textureView", value: depth2.value } },
          {
            binding: 3,
            resource: { kind: "buffer", value: { buffer: view.value, size: VIEW_UNIFORM_BYTES } }
          }
        ]
      });
      if (!bindings.ok) throw bindings.error;
      pass.setPipeline(composite3);
      pass.setBindGroup(0, bindings.value);
      let scissor;
      let scissorExtent;
      if (frame.volumetricFog?.compositeProjectedBounds !== void 0 && frame.camera.captureProjection === void 0 && frame.camera.target === void 0 && frame.camera.view === void 0) {
        const extent = resources.textureViewExtent(inputs.linearHdr.view);
        if (!extent.ok) throw extent.error;
        scissorExtent = extent.value;
        scissor = volumeCompositeScissor(
          frame.volumetricFog.compositeProjectedBounds,
          extent.value.width,
          extent.value.height,
          inputs.resources.resolvedExtent.width,
          inputs.resources.resolvedExtent.height
        );
        if (scissor !== void 0) pass.setScissorRect(...scissor);
      }
      pass.draw(3);
      if (scissor !== void 0 && scissorExtent !== void 0)
        pass.setScissorRect(0, 0, scissorExtent.width, scissorExtent.height);
    }
  });
}

// sdk/engine/node_modules/@forgeax/engine-render/src/pipeline/analytic-fog-pass.ts
var ANALYTIC_FOG_POST_PROCESS_ID = "forgeax.analytic-fog";
function analyticFogSampleCountError() {
  return new RenderGraphError5({
    code: "resource-resolution-failed",
    expected: "analytic fog receives single-sample scene depth",
    hint: "select FXAA, TAA or no AA for analytic fog",
    detail: { resourceLabel: "scene-depth" }
  });
}
function addAnalyticFogPass(graph, input) {
  if (input.color.sampleCount !== 1) return err5(analyticFogSampleCountError());
  const view = graph.importBuffer(
    "analytic-fog-view",
    { size: VIEW_UNIFORM_BYTES, usage: GPU_BUFFER_USAGE_UNIFORM | GPU_BUFFER_USAGE_COPY_DST },
    (frame) => frame.pipelineState.viewUniformBuffer
  );
  if (!view.ok) return view;
  let pipeline;
  let layout;
  let bindings;
  const pass = graph.addRasterPass("analytic-fog", {
    accesses: [
      { resource: input.depth, usage: "sampled-read" },
      { resource: view.value, usage: "uniform-read" },
      { resource: input.color.view, usage: "color-attachment" }
    ],
    colorAttachments: [
      {
        view: input.color.view,
        loadOp: "load",
        storeOp: "store",
        clearValue: { r: 0, g: 0, b: 0, a: 1 }
      }
    ],
    encode: ({ pass: pass2, frame, resources }) => {
      if (pipeline === void 0 || layout === void 0) {
        const source = frame.runtime.lookupPostProcess?.(ANALYTIC_FOG_POST_PROCESS_ID)?.source;
        const factory = frame.runtime.shaderModuleFactory;
        if (source === void 0 || factory === void 0) {
          throw new RenderGraphError5({
            code: "resource-resolution-failed",
            expected: "the registered forgeax.analytic-fog shader and a shader module factory",
            hint: "include forgeax::analytic-fog in the engine shader manifest",
            detail: { resourceLabel: "analytic-fog" }
          });
        }
        const module = factory.createShaderModule({ code: source, label: postProcessShaderModuleLabel(source) }).unwrap();
        const device = frame.runtime.device;
        layout = device.createBindGroupLayout({
          label: "analytic-fog.bind-group-layout",
          entries: [
            { binding: 0, visibility: GPU_SHADER_STAGE_FRAGMENT, buffer: { type: "uniform" } },
            {
              binding: 1,
              visibility: GPU_SHADER_STAGE_FRAGMENT,
              texture: { sampleType: "depth", viewDimension: "2d" }
            }
          ]
        }).unwrap();
        const pipelineLayout2 = device.createPipelineLayout({ label: "analytic-fog.layout", bindGroupLayouts: [layout] }).unwrap();
        pipeline = device.createRenderPipeline({
          label: "analytic-fog",
          layout: pipelineLayout2,
          vertex: { module, entryPoint: "vs_main", buffers: [] },
          fragment: {
            module,
            entryPoint: "fs_main",
            targets: [
              {
                format: input.color.format,
                // Premultiplied fog over the opaque scene: rgb = scene * T + inscatter.
                // Alpha keeps the scene's coverage lane untouched.
                blend: {
                  color: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
                  alpha: { srcFactor: "zero", dstFactor: "one", operation: "add" }
                }
              }
            ]
          },
          primitive: { topology: "triangle-list" }
        }).unwrap();
      }
      const depth2 = resources.textureView(input.depth);
      const uniform = resources.buffer(view.value);
      if (!depth2.ok) throw depth2.error;
      if (!uniform.ok) throw uniform.error;
      if (bindings?.depth !== depth2.value || bindings.uniform !== uniform.value) {
        const group = frame.runtime.device.createBindGroup({
          label: "analytic-fog.bind-group",
          layout,
          entries: [
            {
              binding: 0,
              resource: {
                kind: "buffer",
                value: { buffer: uniform.value, size: VIEW_UNIFORM_BYTES }
              }
            },
            { binding: 1, resource: { kind: "textureView", value: depth2.value } }
          ]
        }).unwrap();
        bindings = { depth: depth2.value, uniform: uniform.value, group };
      }
      pass2.setPipeline(pipeline);
      pass2.setBindGroup(0, bindings.group);
      pass2.draw(3);
    }
  });
  if (!pass.ok) return pass;
  return ok14(void 0);
}
function sceneDepthSample(graph, depth2, label) {
  if (depth2.sampleCount !== 1) return err5(analyticFogSampleCountError());
  return graph.view(depth2.texture, { label, dimension: "2d", aspect: "depth-only" });
}
function addOpaqueFogPasses(graph, input) {
  const analytic = input.topology.analyticFog === true;
  if (!analytic && input.atmosphere === void 0) return ok14(void 0);
  const depthSample = sceneDepthSample(graph, input.depth, "scene-depth.sample");
  if (!depthSample.ok) return depthSample;
  if (input.atmosphere !== void 0) {
    const composed = addAtmosphereComposition(
      graph,
      input.color,
      depthSample.value,
      input.atmosphere
    );
    if (!composed.ok) return composed;
  }
  if (analytic && input.atmosphere === void 0) {
    const fog = addAnalyticFogPass(graph, { color: input.color, depth: depthSample.value });
    if (!fog.ok) return fog;
  }
  return ok14(void 0);
}
function addTranslucencyVolumetricFogPasses(graph, input) {
  if (input.topology.volumetricFog?.enabled !== true) return ok14(void 0);
  const depthSample = sceneDepthSample(graph, input.depth, "local-volume-scene-depth");
  if (!depthSample.ok) return depthSample;
  return addAuthoredVolumetricFogPasses(
    graph,
    input.topology,
    input.color,
    depthSample.value,
    input.directionalShadow,
    input.spotShadow,
    input.clusterBuffers,
    input.cloudShadow,
    input.atmosphere?.transmittance
  );
}

// sdk/engine/node_modules/@forgeax/engine-render/src/pipeline/gpu-occlusion.ts
import { ok as ok15 } from "@forgeax/engine-types";
function sceneViewImport(graph) {
  let sceneView;
  return () => {
    if (sceneView !== void 0) return ok15(sceneView);
    const imported = graph.importBuffer(
      "scene-view",
      {
        size: VIEW_UNIFORM_BYTES,
        usage: GPU_BUFFER_USAGE_UNIFORM | GPU_BUFFER_USAGE_COPY_DST
      },
      (frame) => frame.pipelineState.viewUniformBuffer
    );
    if (imported.ok) sceneView = imported.value;
    return imported;
  };
}
function addGpuLateOcclusion(graph, input) {
  const addLateOcclusion = input.gpuDriven?.addLateOcclusion;
  if (addLateOcclusion === void 0) return ok15(void 0);
  const view = input.view();
  if (!view.ok) return view;
  const pyramid = addDepthPyramidPasses(graph, {
    depth: input.depth,
    width: input.width,
    height: input.height,
    view: view.value,
    reduction: "furthest",
    multisampled: input.multisampled
  });
  if (!pyramid.ok) return pyramid;
  const late = addLateOcclusion(pyramid.value.pyramid.pyramid);
  if (!late.ok) return late;
  return ok15(pyramid.value.pyramid.pyramid);
}

// sdk/engine/node_modules/@forgeax/engine-render/src/pipeline/standard-cloud-stage.ts
import { ok as ok16 } from "@forgeax/engine-types";
function createStandardCloudSceneTarget(context, enabled, descriptor) {
  if (!enabled) return ok16(void 0);
  return createRenderPipelineTarget(context.graph, "cloud-layer-scene-color", {
    ...descriptor,
    sampleCount: 1,
    usage: GPU_TEXTURE_USAGE_COPY_SRC | GPU_TEXTURE_USAGE_RENDER_ATTACHMENT | GPU_TEXTURE_USAGE_TEXTURE_BINDING
  });
}
function createStandardCloudShadowTarget(context, featureRasterWork) {
  const resolution = context.cloudShadowResolution;
  if (!featureRasterWork || resolution === void 0) return ok16(void 0);
  return createRenderPipelineTarget(context.graph, "cloud-layer-shadow", {
    format: "rgba16float",
    size: { width: resolution, height: resolution, depthOrArrayLayers: 1 },
    sampleCount: 1,
    domain: "linear-hdr",
    usage: GPU_TEXTURE_USAGE_COPY_SRC | GPU_TEXTURE_USAGE_RENDER_ATTACHMENT | GPU_TEXTURE_USAGE_TEXTURE_BINDING
  });
}
function contributeStandardCloudPreOpaque(context, targets) {
  const { color, depth: depth2, cloudShadow } = targets;
  const featureTargets = [
    {
      name: "linear-hdr",
      kind: "scene-color",
      texture: color.texture,
      view: color.view,
      format: color.format,
      sampleCount: 1
    },
    {
      kind: "scene-depth",
      texture: depth2.texture,
      view: depth2.view,
      format: depth2.format,
      sampleCount: depth2.sampleCount
    },
    ...cloudShadow === void 0 ? [] : [
      {
        name: "cloud-shadow",
        kind: "scene-color",
        texture: cloudShadow.texture,
        view: cloudShadow.view,
        format: cloudShadow.format,
        sampleCount: 1
      }
    ],
    ...context.cloudHistory === void 0 ? [] : renderPipelineCloudHistoryTargets(context.cloudHistory)
  ];
  const contributed = context.contributeFeatures({
    targets: featureTargets,
    semanticTargets: [],
    namedTargets: cloudShadow === void 0 ? {} : { "cloud-shadow": cloudShadow },
    standardSurfaceAccesses: [],
    placement: "scene",
    passNames: ["cloud-layer-density-cache", "cloud-layer-shadow"]
  });
  if (!contributed.ok) return contributed;
  return ok16(featureTargets);
}
function contributeStandardCloudComposite(context, featureTargets, targets, receiverAccesses, atmosphere) {
  const history = context.cloudHistory;
  return context.contributeFeatures({
    targets: featureTargets,
    semanticTargets: [],
    namedTargets: {
      "motion-input": targets.input,
      "motion-output": targets.output,
      ...targets.cloudShadow === void 0 ? {} : { "cloud-shadow": targets.cloudShadow },
      ...history === void 0 ? {} : {
        "cloud-history-radiance-current": history.currentRadiance,
        "cloud-history-radiance-previous": history.previousRadiance,
        "cloud-history-transmittance-current": history.currentTransmittance,
        "cloud-history-transmittance-previous": history.previousTransmittance,
        "cloud-history-depth-current": history.currentDepth,
        "cloud-history-depth-previous": history.previousDepth
      }
    },
    standardSurfaceAccesses: receiverAccesses,
    placement: "scene",
    passNames: ["cloud-layer-transport", "cloud-layer-resolve"],
    atmosphere
  });
}

// sdk/engine/node_modules/@forgeax/engine-render/src/pipeline/standard-deferred-lighting.ts
import {
  RhiError as RhiError9
} from "@forgeax/engine-rhi";

// sdk/engine/node_modules/@forgeax/engine-render/src/capsule-shadow/frame.ts
import { mat4 } from "@forgeax/engine-math";

// sdk/engine/node_modules/@forgeax/engine-render/src/capsule-shadow/inspection.ts
var NO_SUBMISSION = {
  capsuleCount: 0,
  droppedCapsules: 0,
  tileCount: 0,
  tileOverflow: 0
};
function capsuleShadowParticipates(source, materials) {
  if (source.shadowCaster === false || source.authorVisible === false) return false;
  const hasPass = (material) => {
    const accepted = materials?.get(material);
    if (accepted === void 0)
      throw new Error("Capsule shadow requires the accepted material frame");
    return accepted.passes.some((pass) => pass.tags.LightMode === "ShadowCaster");
  };
  return source.materials.length === 0 ? hasPass(source.material) : source.materials.some(hasPass);
}
function inspectCapsuleShadow(renderables, materials, deferred, directionalShadow, submission = NO_SUBMISSION) {
  let requested = 0;
  let admitted = 0;
  const fallbacks = {};
  for (const source of renderables) {
    const state = source.capsuleShadow;
    if (state === void 0) continue;
    requested += 1;
    let reason;
    if (state.status !== "ready") reason = state.status;
    else if (!capsuleShadowParticipates(source, materials)) reason = "no-shadow-caster-pass";
    else if (!directionalShadow) reason = "no-directional-shadow";
    else if (!deferred) reason = "forward-path";
    if (reason === void 0) admitted += 1;
    else fallbacks[reason] = (fallbacks[reason] ?? 0) + 1;
  }
  if (requested === 0) return void 0;
  return Object.freeze({ requested, admitted, ...submission, fallbacks: Object.freeze(fallbacks) });
}

// sdk/engine/node_modules/@forgeax/engine-render/src/capsule-shadow/frame.ts
var MAX_FRAME_CAPSULES = 1024;
var CAPSULE_TILE_SIZE = 16;
var MAX_CAPSULES_PER_TILE = 32;
var CAPSULE_TILE_INDEX_CAPACITY = 65536;
var CAPSULE_TILE_COUNT_BITS = 6;
var MAX_REACH = 8;
var MIN_LIGHT_SIN = 0.25;
var MIN_CONE = Math.PI / 180;
var MAX_CONE = Math.PI / 6;
function capsuleTileTableWords(width, height) {
  return Math.ceil(width / CAPSULE_TILE_SIZE) * Math.ceil(height / CAPSULE_TILE_SIZE) + CAPSULE_TILE_INDEX_CAPACITY;
}
function capsuleConeHalfAngle(quality) {
  const angular = quality?.kind === "pcss" ? quality.angularRadiusRadians : 0;
  return Math.min(MAX_CONE, Math.max(MIN_CONE, 5 * angular));
}
function capsuleReach(length, radius, lightSin) {
  return Math.min(MAX_REACH, 1.5 * (length + 2 * radius) / Math.max(lightSin, MIN_LIGHT_SIN));
}
function buildCapsuleShadowFrame(renderables, materials, camera, lightDirection, coneHalfAngle, width, height) {
  const lx = -(lightDirection[0] ?? 0);
  const ly = -(lightDirection[1] ?? -1);
  const lz = -(lightDirection[2] ?? 0);
  const lightLength = Math.hypot(lx, ly, lz) || 1;
  const toLight = [lx / lightLength, ly / lightLength, lz / lightLength];
  const cx = camera.position[0] ?? 0;
  const cy = camera.position[1] ?? 0;
  const cz = camera.position[2] ?? 0;
  const candidates = [];
  for (const source of renderables) {
    const state = source.capsuleShadow;
    if (state?.status !== "ready" || !capsuleShadowParticipates(source, materials)) continue;
    for (let offset = 0; offset < state.capsules.length; offset += WORLD_CAPSULE_STRIDE) {
      const c = state.capsules;
      const mx = (c[offset] + c[offset + 4]) / 2 - cx;
      const my = (c[offset + 1] + c[offset + 5]) / 2 - cy;
      const mz = (c[offset + 2] + c[offset + 6]) / 2 - cz;
      candidates.push({ source: c, offset, distance: mx * mx + my * my + mz * mz });
    }
  }
  candidates.sort((a, b) => a.distance - b.distance);
  const kept = Math.min(candidates.length, MAX_FRAME_CAPSULES);
  const capsules = new Float32Array(kept * WORLD_CAPSULE_STRIDE);
  for (let index = 0; index < kept; index++) {
    const { source, offset } = candidates[index];
    capsules.set(
      source.subarray(offset, offset + WORLD_CAPSULE_STRIDE),
      index * WORLD_CAPSULE_STRIDE
    );
    const base = index * WORLD_CAPSULE_STRIDE;
    const length = Math.hypot(
      capsules[base + 4] - capsules[base],
      capsules[base + 5] - capsules[base + 1],
      capsules[base + 6] - capsules[base + 2]
    );
    capsules[base + 7] = capsuleReach(length, capsules[base + 3], toLight[1]);
  }
  const tilesX = Math.ceil(width / CAPSULE_TILE_SIZE);
  const tilesY = Math.ceil(height / CAPSULE_TILE_SIZE);
  const tileTotal = tilesX * tilesY;
  const projection = computeProjectionMatrix(camera);
  const viewProjection = mat4.create();
  mat4.multiply(viewProjection, projection, computeViewMatrix(camera));
  const rects = new Int32Array(kept * 4);
  const counts = new Uint16Array(tileTotal);
  const spread = Math.tan(coneHalfAngle);
  let visible = 0;
  for (let index = 0; index < kept; index++) {
    const rect = sweptScreenRect(capsules, index, toLight, spread, viewProjection, tilesX, tilesY);
    rects.set(rect ?? [1, 1, 0, 0], index * 4);
    if (rect === void 0) continue;
    visible += 1;
    for (let y = rect[1]; y <= rect[3]; y++)
      for (let x = rect[0]; x <= rect[2]; x++) {
        const tile = y * tilesX + x;
        counts[tile] = counts[tile] + 1;
      }
  }
  const tiles = new Uint32Array(tileTotal + CAPSULE_TILE_INDEX_CAPACITY);
  const cursor = new Uint32Array(tileTotal);
  let pool = 0;
  let tileCount = 0;
  let tileOverflow = 0;
  for (let tile = 0; tile < tileTotal; tile++) {
    const wanted = counts[tile];
    if (wanted === 0) continue;
    const granted = Math.min(wanted, MAX_CAPSULES_PER_TILE, CAPSULE_TILE_INDEX_CAPACITY - pool);
    tileCount += 1;
    if (granted < wanted) tileOverflow += 1;
    tiles[tile] = tileTotal + pool << CAPSULE_TILE_COUNT_BITS | granted;
    cursor[tile] = granted;
    pool += granted;
  }
  const filled = new Uint32Array(tileTotal);
  for (let index = 0; index < kept && visible > 0; index++) {
    const x0 = rects[index * 4];
    const y0 = rects[index * 4 + 1];
    const x1 = rects[index * 4 + 2];
    const y1 = rects[index * 4 + 3];
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const tile = y * tilesX + x;
        const slot = filled[tile];
        if (slot >= cursor[tile]) continue;
        tiles[(tiles[tile] >>> CAPSULE_TILE_COUNT_BITS) + slot] = index;
        filled[tile] = slot + 1;
      }
  }
  return {
    capsules,
    tiles: tiles.subarray(0, tileTotal + pool),
    tilesX,
    tilesY,
    coneHalfAngle,
    submission: {
      capsuleCount: kept,
      droppedCapsules: candidates.length - kept,
      tileCount,
      tileOverflow
    }
  };
}
function sweptScreenRect(capsules, index, toLight, spread, viewProjection, tilesX, tilesY) {
  const base = index * WORLD_CAPSULE_STRIDE;
  const reach = capsules[base + 7];
  const pad = capsules[base + 3] + reach * spread;
  const low = [Infinity, Infinity, Infinity];
  const high = [-Infinity, -Infinity, -Infinity];
  for (const end of [0, 4])
    for (const t of [0, reach])
      for (let axis = 0; axis < 3; axis++) {
        const value = capsules[base + end + axis] - toLight[axis] * t;
        low[axis] = Math.min(low[axis], value - pad);
        high[axis] = Math.max(high[axis], value + pad);
      }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let behind = 0;
  for (let corner = 0; corner < 8; corner++) {
    const x = corner & 1 ? high[0] : low[0];
    const y = corner & 2 ? high[1] : low[1];
    const z = corner & 4 ? high[2] : low[2];
    const m = viewProjection;
    const w = m[3] * x + m[7] * y + m[11] * z + m[15];
    if (w <= 1e-4) {
      behind += 1;
      continue;
    }
    const ndcX = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
    const ndcY = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
    minX = Math.min(minX, ndcX);
    maxX = Math.max(maxX, ndcX);
    minY = Math.min(minY, ndcY);
    maxY = Math.max(maxY, ndcY);
  }
  if (behind === 8) return void 0;
  if (behind > 0) return [0, 0, tilesX - 1, tilesY - 1];
  if (maxX < -1 || minX > 1 || maxY < -1 || minY > 1) return void 0;
  const tile = (ndc, count) => Math.min(count - 1, Math.max(0, Math.floor((ndc + 1) / 2 * count)));
  return [tile(minX, tilesX), tile(-maxY, tilesY), tile(maxX, tilesX), tile(-minY, tilesY)];
}

// sdk/engine/node_modules/@forgeax/engine-render/src/pipeline/standard-deferred-lighting.ts
var DEFERRED_LIGHTING_PARAMS_BYTES = 2 * 4 * Float32Array.BYTES_PER_ELEMENT;
var lightingPrograms = /* @__PURE__ */ new WeakMap();
function programsFor2(scope, device, view, source) {
  let devices = lightingPrograms.get(scope);
  if (devices === void 0) {
    devices = /* @__PURE__ */ new WeakMap();
    lightingPrograms.set(scope, devices);
    scope._adopt("pipeline", devices, () => {
      lightingPrograms.delete(scope);
    });
  }
  let views = devices.get(device);
  if (views === void 0) {
    views = /* @__PURE__ */ new WeakMap();
    devices.set(device, views);
  }
  let sources = views.get(view);
  if (sources === void 0) {
    sources = /* @__PURE__ */ new Map();
    views.set(view, sources);
  }
  let variants = sources.get(source);
  if (variants === void 0) {
    variants = /* @__PURE__ */ new Map();
    sources.set(source, variants);
  }
  return variants;
}
function addStandardDeferredLighting(graph, input) {
  const params2 = graph.createBuffer("deferred-lighting-params", {
    size: DEFERRED_LIGHTING_PARAMS_BYTES
  });
  if (!params2.ok) return params2;
  const capsuleBytes = MAX_FRAME_CAPSULES * WORLD_CAPSULE_STRIDE * 4;
  const tileBytes = capsuleTileTableWords(input.size.width, input.size.height) * 4;
  const capsules = graph.createBuffer("capsule-shadow-capsules", { size: capsuleBytes });
  if (!capsules.ok) return capsules;
  const capsuleTiles = graph.createBuffer("capsule-shadow-tiles", {
    size: tileBytes
  });
  if (!capsuleTiles.ok) return capsuleTiles;
  const probe = graph.importBuffer(
    "deferred-probe-records",
    { size: 256, usage: GPU_BUFFER_USAGE_STORAGE | GPU_BUFFER_USAGE_COPY_DST },
    (frame) => {
      const buffer = frame.frameState.probeBlendRecordBuffer;
      if (buffer === void 0)
        throw new RhiError9({
          code: "rhi-not-available",
          expected: "prepared Standard probe records",
          hint: "prepare the deferred frame before recording lighting"
        });
      return buffer.handle;
    }
  );
  if (!probe.ok) return probe;
  const upload = graph.addCopyPass("deferred-lighting-prepare", {
    accesses: [
      { resource: params2.value, usage: "copy-dst" },
      { resource: capsules.value, usage: "copy-dst" },
      { resource: capsuleTiles.value, usage: "copy-dst" }
    ],
    encode: ({ frame, resources, encoder }) => {
      const internal = frame;
      const settings = internal.frameState.installedPipelineConfig?.ssao;
      const queue = frame.runtime.device.queue;
      const noiseFrame = (frame.camera.temporal?.temporalFrameIndex ?? 0) % 64;
      const light = internal.capsuleShadowLight;
      const capsuleFrame = light === void 0 ? void 0 : buildCapsuleShadowFrame(
        light.renderables,
        internal.materialFrame,
        frame.camera,
        light.direction,
        light.coneHalfAngle,
        input.size.width,
        input.size.height
      );
      if (capsuleFrame !== void 0) {
        if (frame.camera.captureProjection === void 0)
          internal.frameState.capsuleShadowSubmission = capsuleFrame.submission;
        if (capsuleFrame.capsules.length > 0) {
          queue.writeBuffer(resources.buffer(capsules.value).unwrap(), 0, capsuleFrame.capsules).unwrap();
          queue.writeBuffer(resources.buffer(capsuleTiles.value).unwrap(), 0, capsuleFrame.tiles).unwrap();
        }
      }
      const populated = (capsuleFrame?.capsules.length ?? 0) > 0;
      for (const [ref, capacity, used] of [
        [capsules.value, capsuleBytes, populated ? capsuleFrame?.capsules.byteLength ?? 0 : 0],
        [capsuleTiles.value, tileBytes, populated ? capsuleFrame?.tiles.byteLength ?? 0 : 0]
      ]) {
        if (used < capacity)
          encoder.clearBuffer(resources.buffer(ref).unwrap(), used, capacity - used);
      }
      queue.writeBuffer(
        resources.buffer(params2.value).unwrap(),
        0,
        new Float32Array([
          input.ssao === void 0 ? 0 : 1,
          noiseFrame,
          // Lane z gates the capsule evaluation; lane w is the light cone half-angle.
          capsuleFrame?.submission.capsuleCount ?? 0,
          capsuleFrame?.coneHalfAngle ?? 0,
          input.ssao === void 0 ? 0 : settings?.directLightingStrength ?? 0,
          0,
          0,
          0
        ])
      ).unwrap();
    }
  });
  if (!upload.ok) return upload;
  const colors = [
    input.color,
    ...input.reflectionFallback === void 0 ? [] : [input.reflectionFallback],
    ...input.response === void 0 ? [] : [input.response],
    ...input.diffuse === void 0 ? [] : [input.diffuse]
  ];
  const sampled = [
    ...input.gbuffer.map((target5) => target5.view),
    input.receiverGeometry.view,
    input.depth,
    ...[
      input.ssao,
      input.directionalShadow,
      input.spotShadow,
      input.shadowMoments,
      input.pointShadow,
      input.cloudShadow
    ].flatMap((target5) => target5 === void 0 ? [] : [target5.view]),
    ...input.environment === void 0 ? [] : [
      input.environment.irradiance,
      input.environment.prefilter,
      ...input.environment.atmosphere === void 0 ? [] : atmosphereTextures(input.environment.atmosphere)
    ]
  ];
  const states = /* @__PURE__ */ new Map();
  const fragmentEntry = input.diffuse !== void 0 && input.reflectionFallback === void 0 ? "fs_standard_deferred_subsurface" : colors.length === 1 ? "fs_standard_deferred" : "fs_standard_deferred_reflections";
  const targetKey = JSON.stringify(colors.map((target5) => target5.format));
  return graph.addRasterPass("lighting", {
    accesses: [
      ...sampled.map((resource) => ({ resource, usage: "sampled-read" })),
      ...colors.map((target5) => ({ resource: target5.view, usage: "color-attachment" })),
      { resource: params2.value, usage: "uniform-read" },
      { resource: probe.value, usage: "storage-read" },
      { resource: capsules.value, usage: "storage-read" },
      { resource: capsuleTiles.value, usage: "storage-read" },
      ...input.extraAccesses
    ],
    colorAttachments: colors.map((target5, index) => ({
      view: target5.view,
      loadOp: index === 0 ? "load" : "clear",
      storeOp: "store",
      clearValue: { r: 0, g: 0, b: 0, a: 0 }
    })),
    encode: ({ pass, frame, resources }) => {
      const internal = frame;
      const device = frame.runtime.device;
      const usesLut = (internal.validatedOrdered ?? []).some(
        (entry) => entry.source.materials.some(
          (material) => materialUsesDirectDfgLut(material.snapshot.materialParamSchema)
        )
      );
      const source = input.cluster === null ? usesLut ? internal.runtime.standardDeferredShaders?.unclusteredLut : internal.runtime.standardDeferredShaders?.unclustered : usesLut ? internal.runtime.standardDeferredShaders?.clusteredLut : internal.runtime.standardDeferredShaders?.clustered;
      if (source === void 0)
        throw new RhiError9({
          code: "shader-compile-failed",
          expected: "cooked Standard deferred lighting program",
          hint: "rebuild the Engine shader manifest and reinitialize the Renderer"
        });
      const scope = internal.runtime.deviceScope;
      if (!scope.isAlive())
        throw new RhiError9({
          code: "rhi-not-available",
          expected: "a live device scope for deferred lighting",
          hint: "recreate the Renderer after device retirement"
        });
      const viewLayout = internal.pipelineState.viewBindGroupLayout;
      let state = states.get(usesLut);
      if (state === void 0 || state.scope !== scope || state.device !== device || state.viewLayout !== viewLayout || state.source !== source) {
        const programs2 = programsFor2(scope, device, viewLayout, source);
        const key = `${input.cluster !== null}:${usesLut}:${fragmentEntry}:${targetKey}`;
        let program = programs2.get(key);
        if (program === void 0) {
          const module = frame.runtime.shaderModuleFactory?.createShaderModule({
            code: source,
            label: `standard_deferred_${input.cluster !== null}_${usesLut}`
          }).unwrap();
          if (module === void 0)
            throw new RhiError9({
              code: "rhi-not-available",
              expected: "deferred shader module factory",
              hint: "initialize the Renderer backend"
            });
          const material = device.createBindGroupLayout({
            label: "deferred-surface-environment",
            entries: [
              ...Array.from({ length: 6 }, (_, binding) => ({
                binding,
                visibility: 2,
                texture: {
                  sampleType: binding < 4 ? "uint" : binding === 4 ? "depth" : "float",
                  viewDimension: "2d"
                }
              })),
              { binding: 6, visibility: 2, sampler: { type: "filtering" } },
              {
                binding: 7,
                visibility: 2,
                buffer: { type: "uniform", minBindingSize: DEFERRED_LIGHTING_PARAMS_BYTES }
              },
              ...[8, 9, 10, 11].map((binding) => ({
                binding,
                visibility: 2,
                texture: {
                  sampleType: "float",
                  viewDimension: binding === 8 ? "cube" : "2d"
                }
              })),
              { binding: 12, visibility: 2, buffer: { type: "uniform", minBindingSize: 80 } },
              { binding: 13, visibility: 2, buffer: { type: "read-only-storage" } },
              { binding: 14, visibility: 2, buffer: { type: "read-only-storage" } },
              {
                binding: 15,
                visibility: 2,
                texture: { sampleType: "uint", viewDimension: "2d" }
              },
              ...usesLut ? [
                {
                  binding: 16,
                  visibility: 2,
                  texture: { sampleType: "float", viewDimension: "2d" }
                }
              ] : []
            ]
          }).unwrap();
          const cluster = device.createBindGroupLayout({
            entries: input.cluster === null ? [] : [3, 4, 5, 6].map((binding) => ({
              binding,
              visibility: 2,
              buffer: {
                type: binding === 6 ? "uniform" : "read-only-storage"
              }
            }))
          }).unwrap();
          const probeLayout = device.createBindGroupLayout({
            entries: [
              {
                binding: 0,
                visibility: 2,
                buffer: { type: "read-only-storage", minBindingSize: 256 }
              }
            ]
          }).unwrap();
          const layout = device.createPipelineLayout({
            bindGroupLayouts: [viewLayout, material, cluster, probeLayout]
          }).unwrap();
          const pipeline = device.createRenderPipeline({
            label: "standard-deferred-lighting",
            layout,
            vertex: { module, entryPoint: "vs_standard_deferred", buffers: [] },
            fragment: {
              module,
              entryPoint: fragmentEntry,
              targets: colors.map((target5, index) => ({
                format: target5.format,
                ...index === 0 ? {
                  blend: {
                    color: {
                      operation: "add",
                      srcFactor: "one",
                      dstFactor: "one"
                    },
                    alpha: {
                      operation: "add",
                      srcFactor: "zero",
                      dstFactor: "one"
                    }
                  }
                } : {}
              }))
            },
            primitive: { topology: "triangle-list", cullMode: "none" }
          }).unwrap();
          program = {
            scope,
            device,
            viewLayout,
            source,
            pipeline,
            material,
            cluster,
            probe: probeLayout
          };
          programs2.set(key, program);
        }
        state = { ...program, groups: /* @__PURE__ */ new WeakMap() };
        states.set(usesLut, state);
      }
      const current2 = state;
      const directDfgLut = usesLut ? getOrCreateDirectDfgLut(device, internal.runtime.deviceScope).unwrap() : void 0;
      const view = (target5) => target5 === void 0 ? void 0 : resources.textureView(target5.view).unwrap();
      const bindings = buildPerFrameBindGroups(
        internal.runtime,
        internal.frameState,
        internal.pipelineState,
        true,
        internal.bindGroupCounts,
        {
          atmosphere: input.environment?.atmosphere === void 0 ? void 0 : {
            transmittance: resources.textureView(input.environment.atmosphere.transmittance).unwrap(),
            distantSkyLight: resources.textureView(input.environment.atmosphere.distantSkyLight).unwrap(),
            multipleScattering: resources.textureView(input.environment.atmosphere.multipleScattering).unwrap(),
            aerialPerspective: resources.textureView(input.environment.atmosphere.aerialPerspective).unwrap(),
            aerialTransmittance: resources.textureView(input.environment.atmosphere.aerialTransmittance).unwrap()
          },
          directionalShadow: view(input.directionalShadow),
          spotShadow: view(input.spotShadow),
          shadowMoments: view(input.shadowMoments),
          cloudShadow: view(input.cloudShadow),
          projector: internal.spotLightProjector?.view,
          projectorSampler: internal.spotLightProjector?.sampler
        },
        true,
        internal.standardLighting
      );
      if (bindings.viewBindGroup === null)
        throw new RhiError9({
          code: "rhi-not-available",
          expected: "Standard view/shadow resources",
          hint: "repair the frame lighting resources"
        });
      pass.setPipeline(state.pipeline);
      pass.setBindGroup(0, bindings.viewBindGroup, [0, 0]);
      if (input.cluster?.kind === "texture")
        throw new RhiError9({
          code: "rhi-not-available",
          expected: "Deferred lighting requires storage-buffer capabilities",
          hint: "use the Standard Forward path on this device"
        });
      const clusterBuffers = input.cluster === null ? [] : [
        input.cluster.lightData,
        input.cluster.clusterGrid,
        input.cluster.lightIndexList,
        input.cluster.clusterUniform
      ].map((ref) => resources.buffer(ref).unwrap());
      const clusterGroup = getOrCreateFromChain(
        state.groups,
        [state.cluster, ...clusterBuffers],
        "deferred-cluster",
        () => device.createBindGroup({
          layout: current2.cluster,
          entries: clusterBuffers.map((buffer, index) => ({
            binding: index + 3,
            resource: { kind: "buffer", value: { buffer } }
          }))
        }).unwrap(),
        internal.bindGroupCounts
      );
      pass.setBindGroup(2, clusterGroup);
      const probeBuffer = resources.buffer(probe.value).unwrap();
      const probeGroup = getOrCreateFromChain(
        state.groups,
        [state.probe, probeBuffer],
        "deferred-probe",
        () => device.createBindGroup({
          layout: current2.probe,
          entries: [
            {
              binding: 0,
              resource: { kind: "buffer", value: { buffer: probeBuffer } }
            }
          ]
        }).unwrap(),
        internal.bindGroupCounts
      );
      pass.setBindGroup(3, probeGroup);
      const environment = input.environment === void 0 ? internal : {
        ...internal,
        environmentIbl: {
          irradiance: resources.textureView(input.environment.irradiance).unwrap(),
          prefilter: resources.textureView(input.environment.prefilter).unwrap()
        }
      };
      const sky = prepareMaterialSkylight(environment).skylightResources;
      const environments = [sky];
      for (const row of internal.reflectionProbes?.table.rows ?? []) {
        if (row.filteredView === void 0 || row.sampler === void 0 || row.uniformBuffer === void 0)
          continue;
        if (row.index >= 255)
          throw new RhiError9({
            code: "rhi-descriptor-invalid",
            expected: "at most 255 deferred reflection environments",
            hint: "reduce the resident reflection-probe roster"
          });
        environments.push({
          ...sky,
          prefilterView: row.filteredView,
          prefilterSampler: row.sampler,
          skylightPrefilterView: sky.prefilterView,
          intensityBuffer: row.uniformBuffer
        });
      }
      const surfaces = [
        ...input.gbuffer.map((target5) => resources.textureView(target5.view).unwrap()),
        resources.textureView(input.depth).unwrap(),
        view(input.ssao) ?? internal.pipelineState.defaultWhiteTextureView
      ];
      const paramsBuffer = resources.buffer(params2.value).unwrap();
      const receiverView = resources.textureView(input.receiverGeometry.view).unwrap();
      const capsuleBuffers = [capsules.value, capsuleTiles.value].map(
        (ref) => resources.buffer(ref).unwrap()
      );
      for (const env of environments) {
        const keys = [
          ...surfaces,
          receiverView,
          env.irradianceSampler,
          paramsBuffer,
          ...capsuleBuffers,
          env.irradianceView,
          env.prefilterView,
          env.brdfLutView,
          env.skylightPrefilterView ?? env.prefilterView,
          env.intensityBuffer,
          ...directDfgLut === void 0 ? [] : [directDfgLut.view]
        ];
        const group = getOrCreateFromChain(
          state.groups,
          keys,
          "deferred-environment",
          () => device.createBindGroup({
            layout: current2.material,
            entries: [
              {
                binding: 15,
                resource: {
                  kind: "textureView",
                  value: receiverView
                }
              },
              ...surfaces.map((resource, binding) => ({
                binding,
                resource: { kind: "textureView", value: resource }
              })),
              {
                binding: 6,
                resource: { kind: "sampler", value: env.irradianceSampler }
              },
              {
                binding: 7,
                resource: { kind: "buffer", value: { buffer: paramsBuffer } }
              },
              {
                binding: 8,
                resource: { kind: "textureView", value: env.irradianceView }
              },
              {
                binding: 9,
                resource: { kind: "textureView", value: env.prefilterView }
              },
              {
                binding: 10,
                resource: { kind: "textureView", value: env.brdfLutView }
              },
              {
                binding: 11,
                resource: {
                  kind: "textureView",
                  value: env.skylightPrefilterView ?? env.prefilterView
                }
              },
              {
                binding: 12,
                resource: { kind: "buffer", value: { buffer: env.intensityBuffer } }
              },
              ...capsuleBuffers.map((buffer, index) => ({
                binding: 13 + index,
                resource: { kind: "buffer", value: { buffer } }
              })),
              ...directDfgLut === void 0 ? [] : [
                {
                  binding: 16,
                  resource: { kind: "textureView", value: directDfgLut.view }
                }
              ]
            ]
          }).unwrap(),
          internal.bindGroupCounts
        );
        pass.setBindGroup(1, group);
        pass.draw(3);
      }
    }
  });
}

// sdk/engine/node_modules/@forgeax/engine-render/src/pipeline/standard-forward-lane.ts
import { ok as ok34 } from "@forgeax/engine-types";

// sdk/engine/node_modules/@forgeax/engine-render/src/pipeline/standard-forward-receiver.ts
function standardForwardReceiverInputs(input) {
  const { directional, spot, point, moments } = input.shadows;
  const { cloudShadow, ssao } = input;
  return {
    sampled: [directional, spot, point, moments, cloudShadow, ssao].filter(
      (target5) => target5 !== void 0
    ),
    ...directional === void 0 ? {} : { directionalShadow: directional },
    spotShadow: spot,
    ...moments === void 0 ? {} : { shadowMoments: moments },
    ...cloudShadow === void 0 ? {} : { cloudShadow },
    ...ssao === void 0 ? {} : { ssao },
    extraAccesses: input.clusterReads
  };
}
function standardForwardReceiverFeatureAccesses(receiver) {
  return [
    ...receiver.extraAccesses,
    ...receiver.sampled.map((target5) => ({
      resource: target5.view,
      usage: "sampled-read"
    }))
  ];
}

// sdk/engine/node_modules/@forgeax/engine-render/src/pipeline/standard-lighting/graph.ts
import { ok as ok17 } from "@forgeax/engine-types";
function projectDescriptor(input) {
  const { x, y, z } = input.prepared.layout.grid;
  return { grid: { x, y, z } };
}
function resolveBuffers(frame, descriptor) {
  const internal = frame;
  const buffers = getOrCreateHdrpBuffers(internal.runtime, descriptor.grid);
  if (buffers === null) throw new Error("Standard persistent buffer allocation failed");
  return buffers;
}
function shouldExecuteStandardClusterMembershipPass(frame) {
  const standardLighting = frame.standardLighting;
  return standardLighting?.kind === "clustered" && standardLighting.transport.kind === "compute-storage" && standardLighting.prepared.local.length > 0;
}
function importStandardClusterBuffers(graph, input) {
  if (input.kind !== "clustered") return ok17(null);
  const layout = input.prepared.layout;
  const descriptor = projectDescriptor(input);
  if (input.transport.kind === "cpu-texture") {
    const extent = standardClusterTextureLayout(layout);
    const texture = graph.importTexture(
      "standard-cluster-tables",
      {
        size: { width: extent.width, height: extent.height, depthOrArrayLayers: 1 },
        format: "rgba32uint",
        usage: 2 | 4
      },
      (frame) => {
        const buffers = resolveBuffers(frame, descriptor);
        if (buffers.kind !== "texture") throw new Error("Standard texture transport changed");
        return buffers.texture;
      }
    );
    if (!texture.ok) return texture;
    const view = graph.importView(texture.value, { dimension: "2d" }, (frame) => {
      const buffers = resolveBuffers(frame, descriptor);
      if (buffers.kind !== "texture") throw new Error("Standard texture transport changed");
      return buffers.view;
    });
    if (!view.ok) return view;
    const uniform = graph.importBuffer(
      "hdrp-cluster-uniform",
      {
        size: 32,
        usage: GPU_BUFFER_USAGE_UNIFORM | GPU_BUFFER_USAGE_COPY_DST
      },
      (frame) => resolveBuffers(frame, descriptor).clusterUniformBuffer
    );
    if (!uniform.ok) return uniform;
    return ok17({ kind: "texture", texture: view.value, clusterUniform: uniform.value });
  }
  const storage = (frame) => {
    const buffers = resolveBuffers(frame, descriptor);
    if (buffers.kind !== "storage") throw new Error("Standard storage transport changed");
    return buffers;
  };
  const usage = GPU_BUFFER_USAGE_STORAGE | GPU_BUFFER_USAGE_COPY_DST;
  const lightData = graph.importBuffer(
    "hdrp-light-data",
    { size: layout.lightDataSlotCount * BYTES_PER_DIRECT_LIGHT_SLOT, usage },
    (frame) => storage(frame).lightDataBuffer
  );
  if (!lightData.ok) return lightData;
  const clusterGrid = graph.importBuffer(
    "hdrp-cluster-grid",
    { size: layout.clusterGridU32Length * 4, usage },
    (frame) => storage(frame).clusterGridBuffer
  );
  if (!clusterGrid.ok) return clusterGrid;
  const lightIndexList = graph.importBuffer(
    "hdrp-light-index-list",
    { size: layout.lightIndexListCapacity * 4, usage },
    (frame) => storage(frame).lightIndexListBuffer
  );
  if (!lightIndexList.ok) return lightIndexList;
  const clusterUniform = graph.importBuffer(
    "hdrp-cluster-uniform",
    { size: 32, usage: GPU_BUFFER_USAGE_UNIFORM | GPU_BUFFER_USAGE_COPY_DST },
    (frame) => resolveBuffers(frame, descriptor).clusterUniformBuffer
  );
  if (!clusterUniform.ok) return clusterUniform;
  const lightBounds = graph.importBuffer(
    "hdrp-light-bounds",
    { size: layout.lightBoundsInt32Length * 4, usage },
    (frame) => storage(frame).lightBoundsBuffer
  );
  if (!lightBounds.ok) return lightBounds;
  return ok17({
    kind: "storage",
    lightData: lightData.value,
    clusterGrid: clusterGrid.value,
    lightIndexList: lightIndexList.value,
    clusterUniform: clusterUniform.value,
    lightBounds: lightBounds.value
  });
}
function standardClusterReadAccesses(buffers) {
  if (buffers.kind === "texture")
    return [
      { resource: buffers.texture, usage: "sampled-read" },
      { resource: buffers.clusterUniform, usage: "uniform-read" }
    ];
  return [
    { resource: buffers.lightData, usage: "storage-read" },
    { resource: buffers.clusterGrid, usage: "storage-read" },
    { resource: buffers.lightIndexList, usage: "storage-read" },
    { resource: buffers.clusterUniform, usage: "uniform-read" }
  ];
}
function addStandardClusterMembershipPass(graph, input, buffers) {
  if (input.kind !== "clustered") return ok17(void 0);
  if (input.transport.kind !== "compute-storage") return ok17(void 0);
  if (buffers.kind !== "storage") throw new Error("GPU membership requires storage transport");
  const descriptor = projectDescriptor(input);
  return graph.addComputePass("cluster-membership-producer", {
    accesses: [
      { resource: buffers.clusterGrid, usage: "storage-read" },
      { resource: buffers.clusterUniform, usage: "uniform-read" },
      { resource: buffers.lightBounds, usage: "storage-read" },
      { resource: buffers.lightIndexList, usage: "storage-write" }
    ],
    // Keep the clustered graph/ABI stable for a directional-only frame, but
    // do not require a producer bind group when there is no local corpus to
    // bin.  The zero-length prepared payload is already the complete result;
    // executing this pass would only turn an otherwise valid frame into a
    // null-backend encode failure.
    executeIf: shouldExecuteStandardClusterMembershipPass,
    encode: ({ pass, frame }) => {
      const internal = frame;
      const pipeline = internal.pipelineState.hdrpClusterMembershipPipeline;
      const bindings = internal.hdrpClusterMembershipBindGroup;
      if (pipeline === null || bindings === null) {
        throw new Error(
          "standard-cluster-transport-unavailable: selected compute Cluster producer is not ready"
        );
      }
      const { x, y, z } = descriptor.grid;
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bindings);
      pass.dispatchWorkgroups(Math.ceil(x * y * z / 64));
    }
  });
}

// sdk/engine/node_modules/@forgeax/engine-render/src/pipeline/standard-post.ts
import { RenderGraphError as RenderGraphError6 } from "@forgeax/engine-render-graph";
import { err as err11, mipDimension as mipDimension3, ok as ok33, textureFormatBlock } from "@forgeax/engine-types";

// sdk/engine/node_modules/@forgeax/engine-render/src/debug-draw-glue.ts
import { mat4 as mat42 } from "@forgeax/engine-math";
function addTypedDebugOverlayPass(graph, output) {
  return graph.addRasterPass("debug-overlay", {
    accesses: [{ resource: output.view, usage: "color-attachment" }],
    colorAttachments: [{ view: output.view, loadOp: "load", storeOp: "store" }],
    executeIf: (frame) => {
      const overlay = frame.runtime.debugOverlay;
      return overlay !== void 0 && (overlay.hasWork?.() ?? true);
    },
    encode: ({ pass, frame }) => {
      const projection = cameraLensProjection(frame.camera);
      const view = mat42.invert(mat42.create(), frame.camera.world);
      const result = frame.runtime.debugOverlay?.encode(
        pass,
        mat42.multiply(mat42.create(), projection, view),
        output.format
      );
      if (result !== void 0 && !result.ok) throw result.error;
    }
  });
}

// sdk/engine/node_modules/@forgeax/engine-render/src/features/depth-of-field/depth-of-field-feature.ts
import { ok as ok18 } from "@forgeax/engine-types";
var DEPTH_OF_FIELD_COC_ID = "forgeax.dof.coc";
var DEPTH_OF_FIELD_PREFILTER_ID = "forgeax.dof.prefilter";
var DEPTH_OF_FIELD_PREFILTER_METADATA_ID = "forgeax.dof.prefilter.metadata";
var DEPTH_OF_FIELD_GATHER_ID = "forgeax.dof.gather";
var DEPTH_OF_FIELD_COMPOSITE_ID = "forgeax.dof.composite";
var DEPTH_OF_FIELD_POST_PROCESS_IDS = Object.freeze([
  DEPTH_OF_FIELD_COC_ID,
  DEPTH_OF_FIELD_PREFILTER_ID,
  DEPTH_OF_FIELD_PREFILTER_METADATA_ID,
  DEPTH_OF_FIELD_GATHER_ID,
  DEPTH_OF_FIELD_COMPOSITE_ID
]);
var DEPTH_OF_FIELD_MSAA_POST_PROCESS_IDS = Object.freeze(
  DEPTH_OF_FIELD_POST_PROCESS_IDS.map((id) => `${id}.msaa`)
);
function depthOfFieldPostProcessId(id, multisampled) {
  return multisampled ? `${id}.msaa` : id;
}
function depthOfFieldTopology(params2) {
  if (params2 === void 0 || params2.maxRadiusPixels <= 0) return void 0;
  return {
    blurSide: params2.blurSide,
    useNear: params2.blurSide === "near" || params2.blurSide === "both",
    useFar: params2.blurSide === "far" || params2.blurSide === "both"
  };
}
function target(graph, label, descriptor) {
  return createRenderPipelineTarget(graph, label, descriptor);
}
function addPass2(graph, options) {
  return addTypedFullscreenPass(graph, options);
}
function addDepthOfFieldPasses(context, input, depth2, temporal) {
  const params2 = context.camera.depthOfField;
  const topology = depthOfFieldTopology(params2);
  if (params2 === void 0 || topology === void 0) return ok18(input);
  const multisampled = depth2.sampleCount === 4;
  const graph = context.graph;
  const extentSize = context.extent === void 0 ? void 0 : renderExtentSize(context.extent, context.temporalTaa ? "output" : "internal");
  const fullSize = extentSize ?? "surface";
  const halfSize = extentSize === void 0 ? "half-surface" : {
    width: Math.max(1, Math.ceil(extentSize.width / 2)),
    height: Math.max(1, Math.ceil(extentSize.height / 2))
  };
  const coc = target(graph, "dof-coc", {
    format: "rgba16float",
    size: fullSize,
    domain: "linear-hdr"
  });
  if (!coc.ok) return coc;
  const cocPass = addPass2(graph, {
    name: "dof-coc",
    shader: depthOfFieldPostProcessId(DEPTH_OF_FIELD_COC_ID, multisampled),
    fragmentEntryPoint: "fs_coc",
    input,
    depth: depth2,
    outputs: [coc.value],
    additionalReads: [
      {
        key: "scene-temporal",
        // No-TAA DoF deliberately aliases this optional input to current color;
        // only the TAA route consumes the matching resolved temporal attachment.
        target: context.temporalTaa && temporal !== void 0 ? temporal : input
      }
    ]
  });
  if (!cocPass.ok) return cocPass;
  const near = topology.useNear ? target(graph, "dof-near", { format: "rgba16float", size: halfSize }) : void 0;
  if (near !== void 0 && !near.ok) return near;
  const far = topology.useFar ? target(graph, "dof-far", { format: "rgba16float", size: halfSize }) : void 0;
  if (far !== void 0 && !far.ok) return far;
  const background = topology.useNear ? target(graph, "dof-background", { format: "rgba16float", size: halfSize }) : void 0;
  if (background !== void 0 && !background.ok) return background;
  const sources = /* @__PURE__ */ new Map();
  for (const side of ["near", "far"]) {
    const enabled = side === "near" ? topology.useNear : topology.useFar;
    if (!enabled) continue;
    const prefilter2 = target(graph, `dof-prefilter-${side}`, {
      format: "rgba16float",
      size: halfSize
    });
    if (!prefilter2.ok) return prefilter2;
    const prefilterPass = addPass2(graph, {
      name: `dof-prefilter-${side}`,
      shader: depthOfFieldPostProcessId(DEPTH_OF_FIELD_PREFILTER_ID, multisampled),
      fragmentEntryPoint: side === "near" ? "fs_prefilter_near" : "fs_prefilter_far",
      input,
      depth: depth2,
      outputs: [prefilter2.value],
      additionalReads: [{ key: "dof-coc", target: coc.value }]
    });
    if (!prefilterPass.ok) return prefilterPass;
    const prefilterMetadata = target(graph, `dof-prefilter-${side}-metadata`, {
      format: "rgba16float",
      size: halfSize
    });
    if (!prefilterMetadata.ok) return prefilterMetadata;
    const metadataPass = addPass2(graph, {
      name: `dof-prefilter-${side}-metadata`,
      shader: depthOfFieldPostProcessId(DEPTH_OF_FIELD_PREFILTER_METADATA_ID, multisampled),
      fragmentEntryPoint: side === "near" ? "fs_prefilter_metadata_near" : "fs_prefilter_metadata_far",
      input,
      depth: depth2,
      outputs: [prefilterMetadata.value],
      additionalReads: [
        {
          key: "scene-temporal",
          target: context.temporalTaa && temporal !== void 0 ? temporal : input
        },
        { key: "dof-coc", target: coc.value }
      ]
    });
    if (!metadataPass.ok) return metadataPass;
    sources.set(side, { color: prefilter2.value, metadata: prefilterMetadata.value });
  }
  const nearInput = near?.ok === true ? near.value : input;
  const farInput = far?.ok === true ? far.value : input;
  const backgroundInput = background?.ok === true ? background.value : input;
  const outputs = topology.useNear ? [nearInput, ...topology.useFar ? [farInput] : [], backgroundInput] : [farInput];
  const gatherPass = addPass2(graph, {
    name: `dof-gather-${topology.blurSide}`,
    shader: depthOfFieldPostProcessId(DEPTH_OF_FIELD_GATHER_ID, multisampled),
    fragmentEntryPoint: `fs_gather_${topology.blurSide}`,
    input: sources.get("near")?.color ?? input,
    depth: depth2,
    outputs,
    additionalReads: [
      {
        key: "scene-temporal",
        target: context.temporalTaa && temporal !== void 0 ? temporal : input
      },
      { key: "dof-coc", target: coc.value },
      { key: "dof-near-metadata", target: sources.get("near")?.metadata ?? input },
      { key: "dof-far-metadata", target: sources.get("far")?.metadata ?? input },
      { key: "dof-prefilter-far", target: sources.get("far")?.color ?? input },
      { key: "scene-color", target: input }
    ]
  });
  if (!gatherPass.ok) return gatherPass;
  const composite3 = target(graph, "dof-composite", {
    format: input.format,
    size: fullSize,
    domain: input.domain
  });
  if (!composite3.ok) return composite3;
  const compositePass = addPass2(graph, {
    name: "dof-composite",
    shader: depthOfFieldPostProcessId(DEPTH_OF_FIELD_COMPOSITE_ID, multisampled),
    fragmentEntryPoint: "fs_composite",
    input,
    depth: depth2,
    outputs: [composite3.value],
    additionalReads: [
      {
        key: "scene-temporal",
        // The composite shader always owns the temporal-depth slot. Without
        // TAA, the current input is the explicit alias for that slot.
        target: context.temporalTaa && temporal !== void 0 ? temporal : input
      },
      { key: "dof-coc", target: coc.value },
      // Disabled sides alias the original input so their resources and gathers
      // are absent while the fixed composite binding contract stays valid.
      { key: "dof-near", target: nearInput },
      { key: "dof-far", target: farInput },
      { key: "dof-background", target: backgroundInput }
    ]
  });
  if (!compositePass.ok) return compositePass;
  return ok18(composite3.value);
}
function depthOfFieldPassNames(topology) {
  const names = ["dof-coc"];
  if (topology.useNear) names.push("dof-prefilter-near", "dof-prefilter-near-metadata");
  if (topology.useFar) names.push("dof-prefilter-far", "dof-prefilter-far-metadata");
  names.push(`dof-gather-${topology.blurSide}`, "dof-composite");
  return Object.freeze(names);
}

// sdk/engine/node_modules/@forgeax/engine-render/src/features/lens-effects.ts
import { ok as ok19 } from "@forgeax/engine-types";
var LENS_EFFECTS_POST_PROCESS_ID = "forgeax.lens-effects";
var LENS_EFFECTS_WGSL = (
  /* wgsl */
  `
struct Params {
  vignette: vec4<f32>,
  grainIntensity: f32,
  grainSize: f32,
  frame: u32,
  chromaticAngle: f32,
  color: vec4<f32>,
};
struct Output {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
};
@group(1) @binding(0) var scene: texture_2d<f32>;
@group(1) @binding(1) var sceneSampler: sampler;
@group(1) @binding(2) var<uniform> params: Params;
@vertex fn vs_main(@builtin(vertex_index) index: u32) -> Output {
  let uv = vec2<f32>(f32((index << 1u) & 2u), f32(index & 2u));
  return Output(vec4<f32>(uv.x * 2.0 - 1.0, 1.0 - uv.y * 2.0, 0.0, 1.0), uv);
}
fn grain_hash(pixel: vec2<u32>, frame: u32) -> f32 {
  var h = (pixel.x * 1597334677u) ^ (pixel.y * 3812015801u) ^ (frame * 2798796415u);
  h = (h ^ (h >> 16u)) * 2246822519u;
  h = (h ^ (h >> 13u)) * 3266489917u;
  h = h ^ (h >> 16u);
  return f32(h & 0x00ffffffu) / 16777216.0;
}
@fragment fn fs_main(input: Output) -> @location(0) vec4<f32> {
  let dimensions = vec2<f32>(textureDimensions(scene));
  // Input and output extents match; preserve the center channels without resampling.
  let center = textureLoad(scene, vec2<i32>(input.position.xy), 0);
  var color = center.rgb;
  if (params.vignette.w > 0.0) {
    // Three.js uses bottom-left UVs; negate Y for this top-left texture domain.
    let direction = vec2<f32>(cos(params.chromaticAngle), -sin(params.chromaticAngle));
    let offset = direction * params.vignette.w / dimensions;
    let halfTexel = 0.5 / dimensions;
    let redUv = clamp(input.uv + offset, halfTexel, 1.0 - halfTexel);
    let blueUv = clamp(input.uv - offset, halfTexel, 1.0 - halfTexel);
    color.r = textureSampleLevel(scene, sceneSampler, redUv, 0.0).r;
    color.b = textureSampleLevel(scene, sceneSampler, blueUv, 0.0).b;
  }
  let radius = length((input.uv - 0.5) * 2.0) / sqrt(2.0);
  let vignette = smoothstep(params.vignette.y, params.vignette.y + params.vignette.z, radius);
  color = mix(color, params.color.rgb, params.vignette.x * vignette);
  if (params.grainIntensity > 0.0) {
    let pixel = vec2<u32>(floor(input.position.xy / params.grainSize));
    let noise = clamp(0.1 + grain_hash(pixel, params.frame), 0.0, 1.0);
    color = mix(color, color + color * noise, params.grainIntensity);
  }
  return vec4<f32>(color, center.a);
}
`
);
function createLensEffectsRenderFeature() {
  return {
    identity: LENS_EFFECTS_POST_PROCESS_ID,
    requiredCapabilities: ["rgba16floatRenderable"],
    requiredFullscreenPostProcesses: [
      { identity: LENS_EFFECTS_POST_PROCESS_ID, source: LENS_EFFECTS_WGSL }
    ],
    extract: (context) => ok19(
      context.views.filter((view) => view.render && view.selectedCamera?.lensEffects !== void 0).map((view) => view.identity)
    ),
    plan: (views) => ok19({
      work: views.map((view) => ({
        scope: { view },
        resources: [
          {
            kind: "fullscreen-program",
            name: LENS_EFFECTS_POST_PROCESS_ID,
            source: LENS_EFFECTS_WGSL,
            reads: ["scene-color"],
            params: { byteSize: 48, defaultValue: packLensEffectsParams(void 0, 0) }
          }
        ],
        passes: []
      }))
    })
  };
}
function packLensEffectsParams(input, frame) {
  const values = new Float32Array([
    input?.vignetteIntensity ?? 0,
    input?.vignetteRadius ?? 0.5,
    input?.vignetteSoftness ?? 0.5,
    input?.chromaticAberration ?? 0,
    input?.grainIntensity ?? 0,
    input?.grainSize ?? 1,
    0,
    input?.chromaticAberrationAngle ?? 0,
    input?.vignetteColor[0] ?? 0,
    input?.vignetteColor[1] ?? 0,
    input?.vignetteColor[2] ?? 0,
    0
  ]);
  new DataView(values.buffer).setUint32(24, frame >>> 0, true);
  return new Uint8Array(values.buffer);
}

// sdk/engine/node_modules/@forgeax/engine-render/src/features/lens-flare.ts
import { ok as ok20 } from "@forgeax/engine-types";
var LENS_FLARE_POST_PROCESS_ID = "forgeax.lens-flare";
var LENS_FLARE_PREFILTER_ID = "forgeax.lens-flare.prefilter";
var LENS_FLARE_BLUR_ID = "forgeax.lens-flare.blur";
var LENS_FLARE_COMPOSITE_ID = "forgeax.lens-flare.composite";
var LENS_FLARE_PARAMS_BYTES = 32 + LENS_FLARE_GHOST_COUNT * 16;
var LENS_FLARE_BOKEH_TAPS = 64;
var LENS_FLARE_GUARD_BAND = 1.25;
var common = (
  /* wgsl */
  `
const GUARD_BAND: f32 = ${LENS_FLARE_GUARD_BAND};
struct Params {
  control: vec4<f32>,
  tint: vec4<f32>,
  ghosts: array<vec4<f32>, ${LENS_FLARE_GHOST_COUNT}>,
};
struct Output {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
};
@group(1) @binding(0) var source: texture_2d<f32>;
@group(1) @binding(1) var linearSampler: sampler;
@group(1) @binding(2) var<uniform> params: Params;
@vertex fn vs_main(@builtin(vertex_index) index: u32) -> Output {
  let uv = vec2<f32>(f32((index << 1u) & 2u), f32(index & 2u));
  return Output(vec4<f32>(uv.x * 2.0 - 1.0, 1.0 - uv.y * 2.0, 0.0, 1.0), uv);
}
fn disc_mask(x: vec2<f32>) -> f32 {
  let r = saturate(1.0 - dot(x, x));
  return r * r;
}
`
);
var prefilter = (
  /* wgsl */
  `${common}
@fragment fn fs_main(input: Output) -> @location(0) vec4<f32> {
  let x = (input.uv * 2.0 - 1.0) * GUARD_BAND;
  let sceneUv = x * 0.5 + 0.5;
  if (any(sceneUv < vec2<f32>(0.0)) || any(sceneUv > vec2<f32>(1.0))) {
    return vec4<f32>(0.0, 0.0, 0.0, 1.0);
  }
  let texel = 1.0 / vec2<f32>(textureDimensions(source));
  var sum = vec3<f32>(0.0);
  for (var j = 0u; j < 4u; j += 1u) {
    for (var i = 0u; i < 4u; i += 1u) {
      let offset = (vec2<f32>(f32(i), f32(j)) - 1.5) * 2.0 * texel;
      let uv = clamp(sceneUv + offset, texel * 0.5, 1.0 - texel * 0.5);
      let color = min(textureSampleLevel(source, linearSampler, uv, 0.0).rgb, vec3<f32>(65504.0));
      let luminance = color.r + color.g + color.b;
      sum += color * (max(luminance - params.control.x, 0.0) / max(luminance, 1e-4));
    }
  }
  return vec4<f32>(sum * (disc_mask(x * 0.5) / 16.0), 1.0);
}
`
);
var blur = (
  /* wgsl */
  `${common}
@fragment fn fs_main(input: Output) -> @location(0) vec4<f32> {
  let dimensions = vec2<f32>(textureDimensions(source));
  let radius = params.control.y * dimensions.x / GUARD_BAND;
  var sum = vec3<f32>(0.0);
  for (var i = 0u; i < ${LENS_FLARE_BOKEH_TAPS}u; i += 1u) {
    let r = sqrt((f32(i) + 0.5) / ${LENS_FLARE_BOKEH_TAPS}.0) * radius;
    let theta = f32(i) * 2.39996323;
    let uv = input.uv + vec2<f32>(cos(theta), sin(theta)) * r / dimensions;
    sum += textureSampleLevel(source, linearSampler, uv, 0.0).rgb;
  }
  return vec4<f32>(sum / ${LENS_FLARE_BOKEH_TAPS}.0, 1.0);
}
`
);
var composite = (
  /* wgsl */
  `${common}
@group(1) @binding(3) var bokeh: texture_2d<f32>;
// Small, bright bokeh texels amplify fixed-precision hardware filter weights.
// Interpolate in f32 to keep ghost energy consistent across backends.
fn sample_bokeh(uv: vec2<f32>) -> vec3<f32> {
  let size = vec2<i32>(textureDimensions(bokeh));
  let p = uv * vec2<f32>(size) - 0.5;
  let base = vec2<i32>(floor(p));
  let f = fract(p);
  let a = textureLoad(bokeh, clamp(base, vec2<i32>(0), size - 1), 0).rgb;
  let b = textureLoad(bokeh, clamp(base + vec2<i32>(1, 0), vec2<i32>(0), size - 1), 0).rgb;
  let c = textureLoad(bokeh, clamp(base + vec2<i32>(0, 1), vec2<i32>(0), size - 1), 0).rgb;
  let d = textureLoad(bokeh, clamp(base + vec2<i32>(1, 1), vec2<i32>(0), size - 1), 0).rgb;
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
@fragment fn fs_main(input: Output) -> @location(0) vec4<f32> {
  let center = textureLoad(source, vec2<i32>(input.position.xy), 0);
  let p = input.uv * 2.0 - 1.0;
  let border = disc_mask(p) * disc_mask(p * 0.8);
  if (border <= 0.0) {
    return center;
  }
  var flare = vec3<f32>(0.0);
  for (var i = 0u; i < ${LENS_FLARE_GHOST_COUNT}u; i += 1u) {
    let ghost = params.ghosts[i];
    if (abs(ghost.w) < 1e-4) {
      continue;
    }
    let g = p / (ghost.w * 2.0 * GUARD_BAND) + 0.5;
    if (any(g < vec2<f32>(0.0)) || any(g > vec2<f32>(1.0))) {
      continue;
    }
    flare += ghost.rgb * sample_bokeh(g);
  }
  return vec4<f32>(center.rgb + flare * params.tint.rgb * border, center.a);
}
`
);
var LENS_FLARE_PROGRAMS = [
  {
    kind: "fullscreen-program",
    name: LENS_FLARE_PREFILTER_ID,
    source: prefilter,
    reads: ["scene-color"],
    params: { byteSize: LENS_FLARE_PARAMS_BYTES, defaultValue: packLensFlareParams(void 0) }
  },
  {
    kind: "fullscreen-program",
    name: LENS_FLARE_BLUR_ID,
    source: blur,
    reads: ["lens-flare-prefilter"],
    params: { byteSize: LENS_FLARE_PARAMS_BYTES, defaultValue: packLensFlareParams(void 0) }
  },
  {
    kind: "fullscreen-program",
    name: LENS_FLARE_COMPOSITE_ID,
    source: composite,
    reads: ["scene-color", "lens-flare-bokeh"],
    params: { byteSize: LENS_FLARE_PARAMS_BYTES, defaultValue: packLensFlareParams(void 0) }
  }
];
function createLensFlareRenderFeature() {
  return {
    identity: LENS_FLARE_POST_PROCESS_ID,
    requiredCapabilities: ["rgba16floatRenderable"],
    requiredFullscreenPostProcesses: LENS_FLARE_PROGRAMS.map((program) => ({
      identity: program.name,
      source: program.source
    })),
    extract: (context) => ok20(
      context.views.filter((view) => view.render && view.selectedCamera?.lensFlare !== void 0).map((view) => view.identity)
    ),
    plan: (views) => ok20({
      work: views.map((view) => ({
        scope: { view },
        resources: LENS_FLARE_PROGRAMS,
        passes: []
      }))
    })
  };
}
function isLensFlarePostProcess(identity) {
  return identity === LENS_FLARE_POST_PROCESS_ID || LENS_FLARE_PROGRAMS.some((program) => program.name === identity);
}
function packLensFlareParams(input) {
  const values = new Float32Array(LENS_FLARE_PARAMS_BYTES / 4);
  values[0] = input?.threshold ?? 8;
  values[1] = (input?.bokehSize ?? 3) / 100;
  const intensity = input?.intensity ?? 0;
  for (let channel = 0; channel < 3; channel += 1)
    values[4 + channel] = (input?.tint[channel] ?? 1) * intensity;
  for (let ghost = 0; ghost < LENS_FLARE_GHOST_COUNT; ghost += 1) {
    for (let channel = 0; channel < 3; channel += 1)
      values[8 + ghost * 4 + channel] = input?.ghostTints[ghost * 3 + channel] ?? 0;
    values[8 + ghost * 4 + 3] = input?.ghostScales[ghost] ?? 0;
  }
  return new Uint8Array(values.buffer);
}

// sdk/engine/node_modules/@forgeax/engine-render/src/features/lens-flare-graph.ts
import { ok as ok21 } from "@forgeax/engine-types";
function lensFlareGuardBandSize(output) {
  return {
    width: Math.max(1, Math.ceil(output.width * LENS_FLARE_GUARD_BAND / 8)),
    height: Math.max(1, Math.ceil(output.height * LENS_FLARE_GUARD_BAND / 8))
  };
}
function addLensFlarePasses(graph, input, output) {
  const guardBand = lensFlareGuardBandSize(output);
  const prefiltered = createRenderPipelineTarget(graph, "standard-lens-flare-prefilter", {
    format: "rgba16float",
    size: guardBand,
    domain: "linear-hdr"
  });
  if (!prefiltered.ok) return prefiltered;
  const bokeh = createRenderPipelineTarget(graph, "standard-lens-flare-bokeh", {
    format: "rgba16float",
    size: guardBand,
    domain: "linear-hdr"
  });
  if (!bokeh.ok) return bokeh;
  const composited = createRenderPipelineTarget(graph, "standard-lens-flare", {
    format: "rgba16float",
    size: { width: output.width, height: output.height },
    domain: "linear-hdr"
  });
  if (!composited.ok) return composited;
  const thresholded = addTypedFullscreenPass(graph, {
    name: "standard-lens-flare-prefilter",
    shader: LENS_FLARE_PREFILTER_ID,
    clearColor: [0, 0, 0, 1],
    input,
    outputs: [prefiltered.value]
  });
  if (!thresholded.ok) return thresholded;
  const blurred = addTypedFullscreenPass(graph, {
    name: "standard-lens-flare-bokeh",
    shader: LENS_FLARE_BLUR_ID,
    clearColor: [0, 0, 0, 1],
    input: prefiltered.value,
    outputs: [bokeh.value]
  });
  if (!blurred.ok) return blurred;
  const ghosts = addTypedFullscreenPass(graph, {
    name: "standard-lens-flare",
    shader: LENS_FLARE_COMPOSITE_ID,
    input,
    outputs: [composited.value],
    additionalReads: [{ key: "lens-flare-bokeh", target: bokeh.value }]
  });
  return ghosts.ok ? ok21(composited.value) : ghosts;
}

// sdk/engine/node_modules/@forgeax/engine-render/src/features/motion-blur/motion-blur-feature.ts
import { err as err6, ok as ok22 } from "@forgeax/engine-types";
var MOTION_BLUR_FEATURE_IDENTITY = "forgeax.motion-blur";
function addMotionBlurPass(graph, input, temporal, output) {
  return addTypedFullscreenPass(graph, {
    name: "motion-blur",
    shader: MOTION_BLUR_FEATURE_IDENTITY,
    input,
    additionalReads: [{ key: "scene-temporal", target: temporal }],
    outputs: [output]
  });
}
var MOTION_BLUR_COMPUTE_WGSL = `struct MotionBlurComputeParams {
  shutterAngle : f32,
  maxRadiusPixels : f32,
  sampleCount : u32,
  reset : u32,
  targetFps : f32,
  exposureScale : f32,
  frameDeltaSeconds : f32,
  flags : u32,
};

struct MotionBlurTileSummary {
  // The two motion lanes retain the source pixel that supplied the direction.
  // Those anchors let a bounded midpoint tap hit a sparse source without
  // adding a color read or growing the 32-byte per-tile summary.
  maxMotionAndLength : vec4<f32>,
  secondaryMotionAndDepth : vec4<f32>,
};

struct TemporalSample {
  motion : vec2<f32>,
  depth : f32,
  reactive : f32,
  validDepth : bool,
  motionValid : bool,
};

struct MotionBlurSupport {
  primaryMotion : vec2<f32>,
  secondaryMotion : vec2<f32>,
  primaryAnchor : vec2<i32>,
  secondaryAnchor : vec2<i32>,
  primaryRadius : f32,
  secondaryRadius : f32,
  valid : bool,
  longVector : bool,
};

struct MotionBlurTap {
  pixel : vec2<i32>,
  fallbackPixel : vec2<i32>,
  valid : bool,
  fallbackValid : bool,
};

struct MotionBlurFilter {
  color0 : vec4<f32>,
  color1 : vec4<f32>,
  color2 : vec4<f32>,
  color3 : vec4<f32>,
  depth0 : f32,
  depth1 : f32,
  depth2 : f32,
  depth3 : f32,
  coverage0 : f32,
  coverage1 : f32,
  coverage2 : f32,
  coverage3 : f32,
  receiver : vec2<i32>,
  motion : vec2<f32>,
  radius : f32,
  receiverMask : u32,
  validMask : u32,
  valid : bool,
};

struct MotionBlurCacheSample {
  color : vec4<f32>,
  coverage : f32,
  valid : bool,
};

struct MotionBlurSource {
  pixel : vec2<i32>,
  motion : vec2<f32>,
  depth : f32,
  radius : f32,
  coverage0 : f32,
  coverage1 : f32,
  coverage2 : f32,
  coverage3 : f32,
  receiverMask : u32,
  valid : bool,
};

@group(0) @binding(0) var currentColor : texture_2d<f32>;
@group(0) @binding(1) var sceneTemporal : texture_2d<f32>;
@group(0) @binding(2) var<storage, read_write> tileSummary : array<MotionBlurTileSummary>;
@group(0) @binding(3) var outputColor : texture_storage_2d<rgba16float, write>;
@group(0) @binding(4) var<uniform> params : MotionBlurComputeParams;

// Reconstruct a bounded part of a partially covered opaque edge and fund it
// by attenuating the matching empty-background trail. The fixed factor keeps
// the work and the energy adjustment independent of the blur radius.
const EDGE_FILL_FACTOR : f32 = 0.99;

// One 8x8 workgroup covers a 16x16 tile. Each invocation reads a 2x2
// footprint, then the workgroup reduction combines the values without
// write contention or a serial 256-pixel loop.
var<workgroup> tileMotionScratch : array<vec2<f32>, 64>;
var<workgroup> tileLengthScratch : array<f32, 64>;
var<workgroup> tileSourceScratch : array<vec2<i32>, 64>;
var<workgroup> tileSecondaryMotionScratch : array<vec2<f32>, 64>;
var<workgroup> tileSecondaryLengthScratch : array<f32, 64>;
var<workgroup> tileSecondarySourceScratch : array<vec2<i32>, 64>;
// The reconstruction workgroup owns a 4x4 half-resolution result cache for
// its 8x8 output footprint. Each owner computes the complete bounded support
// filter once. Full-resolution lanes only select a depth-compatible cached
// result after the uniform barrier, with no cross-workgroup dependency.
// Four quadrants are kept per half-cell. Each owner pays four receiver
// center-color reads and at most supportCount (<=15) accepted source-color
// reads; midpoint anchor recovery reuses an existing slot and adds no read
// budget. The shared result retains odd/even coverage instead of spreading an
// odd row across both rows.
var<workgroup> halfFilteredColor : array<vec4<f32>, 64>;
var<workgroup> halfFilteredDepth : array<f32, 64>;
var<workgroup> halfFilteredCoverage : array<f32, 64>;
var<workgroup> halfFilteredReceiver : array<vec2<i32>, 16>;
var<workgroup> halfFilteredMotion : array<vec2<f32>, 16>;
var<workgroup> halfFilteredRadius : array<f32, 16>;
var<workgroup> halfFilteredValid : array<u32, 64>;
var<workgroup> longVectorScratch : array<u32, 64>;
// A reconstruct workgroup covers one 8x8 output footprint. Its first lane
// derives the complete bounded tile neighbourhood once and publishes the top
// two source directions for all lanes and all designated half-resolution
// owners. This keeps summary work O(P/T^2), rather than repeating a tile walk
// per output pixel.
var<workgroup> neighbourhoodPrimaryMotion : vec2<f32>;
var<workgroup> neighbourhoodPrimaryLength : f32;
var<workgroup> neighbourhoodPrimaryAnchor : vec2<i32>;
var<workgroup> neighbourhoodSecondaryMotion : vec2<f32>;
var<workgroup> neighbourhoodSecondaryLength : f32;
var<workgroup> neighbourhoodSecondaryAnchor : vec2<i32>;

// maxRadiusPixels is authored at [0,64], so a 16-pixel tile support reaches
// at most four tiles. The fixed 9x9 lattice is geometrically derived from its
// index, then intersected with the circular/AABB support. It is a constant
// bounded metadata walk: no loop scales with the requested radius and no
// radius-squared per-pixel storage or write path is introduced.
const MAX_TILE_REACH : i32 = 4;
const TILE_NEIGHBORHOOD_SIDE : u32 = 9u;
const TILE_NEIGHBORHOOD_COUNT : u32 = 81u;

fn finite(value : f32) -> bool {
  return value == value && abs(value) < 3.402823e+38;
}

fn pixelInBounds(pixel : vec2<i32>, dimensions : vec2<i32>) -> bool {
  return pixel.x >= 0 && pixel.y >= 0 && pixel.x < dimensions.x && pixel.y < dimensions.y;
}

fn decodeDepth(packed : f32) -> f32 {
  if (packed < 0.0) { return 0.0; }
  return exp2(packed) - 1.0;
}

fn temporalAt(pixel : vec2<i32>, dimensions : vec2<i32>) -> TemporalSample {
  let samplePixel = clamp(pixel, vec2<i32>(0), dimensions - vec2<i32>(1));
  let packed = textureLoad(sceneTemporal, samplePixel, 0);
  let invalidMotion = packed.w >= 2.0;
  return TemporalSample(
    packed.xy,
    decodeDepth(packed.z),
    clamp(packed.w - select(0.0, 2.0, invalidMotion), 0.0, 1.0),
    packed.z >= 0.0,
    !invalidMotion,
  );
}

fn depthReject(center : f32, sample : f32) -> bool {
  return sample > center + max(0.01, center * 0.01);
}

fn distinctDirection(a : vec2<f32>, b : vec2<f32>) -> bool {
  let aLength = length(a);
  let bLength = length(b);
  if (aLength <= 1e-5 || bLength <= 1e-5) { return false; }
  // Keep only genuinely different directions. Opposite signs still carry
  // separate source segments, while nearly parallel candidates do not spend
  // the bounded second-direction slot.
  return abs(dot(a / aLength, b / bLength)) < 0.94;
}

fn sourceVelocitySegmentCovers(
  receiverPixel : vec2<i32>,
  sourcePixel : vec2<i32>,
  motionPixels : vec2<f32>,
  radius : f32,
) -> bool {
  let delta = vec2<f32>(receiverPixel - sourcePixel);
  let motionLength = length(motionPixels);
  if (motionLength <= 1e-5 || radius <= 1e-5) { return false; }
  let direction = motionPixels / motionLength;
  let along = dot(delta, direction);
  let perpendicular = abs(delta.x * direction.y - delta.y * direction.x);
  // A source segment owns a one-pixel coverage tube. This is a bounded
  // geometric test, not a radius-sized source scan, and lets a sparse mover
  // cover a static receiver without accepting a far/orthogonal source.
  return abs(along) <= radius + 0.75 && perpendicular <= 0.75;
}

fn symmetricOffset(index : u32, count : u32, motion : vec2<f32>) -> vec2<f32> {
  let denominator = max(f32(count), 1.0);
  return motion * (2.0 * (f32(index) + 0.5) / denominator - 1.0);
}

fn tileNeighborhoodOffset(index : u32) -> vec2<i32> {
  let x = i32(index % TILE_NEIGHBORHOOD_SIDE) - MAX_TILE_REACH;
  let y = i32(index / TILE_NEIGHBORHOOD_SIDE) - MAX_TILE_REACH;
  return vec2<i32>(x, y);
}

fn tileOffsetWithinSupport(offset : vec2<i32>, tileReach : i32) -> bool {
  if (offset.x == 0 && offset.y == 0) { return false; }
  let boundedReach = min(max(tileReach, 1), MAX_TILE_REACH);
  // The bounded lattice is a square around the receiver tile. The precise
  // AABB/circle intersection below decides whether a diagonal tile really
  // intersects the support; a circular pre-filter here would drop the
  // (\xB12,\xB12) and boundary cases before that exact test can run.
  return abs(offset.x) <= boundedReach && abs(offset.y) <= boundedReach;
}

fn tileIntersectsSupport(
  receiverPixel : vec2<i32>,
  candidateTile : vec2<i32>,
  dimensions : vec2<i32>,
  supportRadius : f32,
) -> bool {
  // Use the receiver-to-tile-AABB lower bound. This includes every tile whose
  // contents can intersect the support, including signs and diagonals, while
  // rejecting an outside-support tile before loading its summary.
  let tileMin = vec2<f32>(candidateTile * 16);
  let tileMax = min(tileMin + vec2<f32>(16.0), vec2<f32>(dimensions));
  let receiver = vec2<f32>(receiverPixel) + vec2<f32>(0.5);
  let dx = max(max(tileMin.x - receiver.x, 0.0), receiver.x - tileMax.x);
  let dy = max(max(tileMin.y - receiver.y, 0.0), receiver.y - tileMax.y);
  let distance = vec2<f32>(dx, dy);
  return dot(distance, distance) <= supportRadius * supportRadius + 1.0;
}

fn tileIntersectsWorkgroupSupport(
  workgroupBase : vec2<i32>,
  candidateTile : vec2<i32>,
  dimensions : vec2<i32>,
  supportRadius : f32,
) -> bool {
  // A workgroup's 8x8 rectangle is the conservative receiver domain for one
  // shared metadata walk. The AABB lower bound includes every pixel in that
  // rectangle that can reach the candidate tile, including diagonal/sign
  // variants, while rejecting a tile fully outside the support.
  let tileMin = vec2<f32>(candidateTile * 16);
  let tileMax = min(tileMin + vec2<f32>(16.0), vec2<f32>(dimensions));
  let groupMin = vec2<f32>(workgroupBase) + vec2<f32>(0.5);
  let groupMax = min(groupMin + vec2<f32>(8.0), vec2<f32>(dimensions));
  let dx = max(max(tileMin.x - groupMax.x, 0.0), groupMin.x - tileMax.x);
  let dy = max(max(tileMin.y - groupMax.y, 0.0), groupMin.y - tileMax.y);
  let distance = vec2<f32>(dx, dy);
  return dot(distance, distance) <= supportRadius * supportRadius + 1.0;
}

fn scanTileNeighbourhood(
  workgroupBase : vec2<i32>,
  dimensions : vec2<i32>,
) {
  let tiles = (vec2<u32>(dimensions) + vec2<u32>(15)) / vec2<u32>(16);
  let tileCoordinate = workgroupBase / vec2<i32>(16);
  let currentIndex = u32(tileCoordinate.y) * tiles.x + u32(tileCoordinate.x);
  let current = tileSummary[currentIndex];
  var primary = current.maxMotionAndLength.xy * vec2<f32>(dimensions) * params.exposureScale;
  var primaryLength = length(primary);
  var primaryAnchor = vec2<i32>(
    i32(current.maxMotionAndLength.z),
    i32(current.maxMotionAndLength.w),
  );
  var secondary = current.secondaryMotionAndDepth.xy * vec2<f32>(dimensions) * params.exposureScale;
  var secondaryLength = length(secondary);
  var secondaryAnchor = vec2<i32>(
    i32(current.secondaryMotionAndDepth.z),
    i32(current.secondaryMotionAndDepth.w),
  );
  let supportRadius = min(max(params.maxRadiusPixels, 1.0), 64.0);
  let tileReach = min(MAX_TILE_REACH, max(1, i32(ceil(supportRadius / 16.0))));
  for (var tileCandidateIndex = 0u; tileCandidateIndex < TILE_NEIGHBORHOOD_COUNT; tileCandidateIndex += 1u) {
    let offset = tileNeighborhoodOffset(tileCandidateIndex);
    if (!tileOffsetWithinSupport(offset, tileReach)) { continue; }
    let candidateTile = tileCoordinate + offset;
    if (
      candidateTile.x < 0 ||
      candidateTile.y < 0 ||
      candidateTile.x >= i32(tiles.x) ||
      candidateTile.y >= i32(tiles.y) ||
      !tileIntersectsWorkgroupSupport(workgroupBase, candidateTile, dimensions, supportRadius)
    ) { continue; }
    let candidate = tileSummary[u32(candidateTile.y) * tiles.x + u32(candidateTile.x)];
    let candidatePrimary = candidate.maxMotionAndLength.xy * vec2<f32>(dimensions) * params.exposureScale;
    let candidatePrimaryLength = length(candidatePrimary);
    let candidatePrimaryAnchor = vec2<i32>(
      i32(candidate.maxMotionAndLength.z),
      i32(candidate.maxMotionAndLength.w),
    );
    if (candidatePrimaryLength > primaryLength) {
      let previousPrimary = primary;
      let previousLength = primaryLength;
      let previousAnchor = primaryAnchor;
      primary = candidatePrimary;
      primaryLength = candidatePrimaryLength;
      primaryAnchor = candidatePrimaryAnchor;
      if (previousLength > 1e-5 && distinctDirection(primary, previousPrimary) && previousLength > secondaryLength) {
        secondary = previousPrimary;
        secondaryLength = previousLength;
        secondaryAnchor = previousAnchor;
      }
    } else if (
      candidatePrimaryLength > secondaryLength &&
      distinctDirection(primary, candidatePrimary)
    ) {
      secondary = candidatePrimary;
      secondaryLength = candidatePrimaryLength;
      secondaryAnchor = candidatePrimaryAnchor;
    }
    let candidateSecondary = candidate.secondaryMotionAndDepth.xy * vec2<f32>(dimensions) * params.exposureScale;
    let candidateSecondaryLength = length(candidateSecondary);
    let candidateSecondaryAnchor = vec2<i32>(
      i32(candidate.secondaryMotionAndDepth.z),
      i32(candidate.secondaryMotionAndDepth.w),
    );
    if (candidateSecondaryLength > secondaryLength && distinctDirection(primary, candidateSecondary)) {
      secondary = candidateSecondary;
      secondaryLength = candidateSecondaryLength;
      secondaryAnchor = candidateSecondaryAnchor;
    }
  }
  neighbourhoodPrimaryMotion = primary;
  neighbourhoodPrimaryLength = primaryLength;
  neighbourhoodPrimaryAnchor = primaryAnchor;
  neighbourhoodSecondaryMotion = secondary;
  neighbourhoodSecondaryLength = secondaryLength;
  neighbourhoodSecondaryAnchor = secondaryAnchor;
}

fn validMotionParameters() -> bool {
  return
    finite(params.frameDeltaSeconds) &&
    params.frameDeltaSeconds > 0.0 &&
    params.frameDeltaSeconds <= 0.1 &&
    finite(params.exposureScale) &&
    params.exposureScale > 0.0 &&
    finite(params.targetFps) &&
    params.targetFps >= 0.0 &&
    params.targetFps <= 240.0 &&
    params.targetFps == floor(params.targetFps) &&
    params.sampleCount >= 4u &&
    params.maxRadiusPixels > 0.0 &&
    finite(params.maxRadiusPixels) &&
    params.shutterAngle > 0.0;
}

fn sourceMotionPixels(sample : TemporalSample, dimensions : vec2<i32>) -> vec2<f32> {
  return sample.motion * vec2<f32>(dimensions) * params.exposureScale;
}

fn sourceRadius(motionPixels : vec2<f32>, shutter : f32) -> f32 {
  return min(length(motionPixels) * shutter * 0.5, params.maxRadiusPixels);
}

fn resolveMotionBlurSupport(
  pixel : vec2<i32>,
  dimensions : vec2<i32>,
) -> MotionBlurSupport {
  var empty = MotionBlurSupport(
    vec2<f32>(0.0),
    vec2<f32>(0.0),
    vec2<i32>(0),
    vec2<i32>(0),
    0.0,
    0.0,
    false,
    false,
  );
  if (!pixelInBounds(pixel, dimensions) || !validMotionParameters() || params.reset != 0u) {
    return empty;
  }
  let center = temporalAt(pixel, dimensions);
  if (!center.validDepth || !center.motionValid) { return empty; }
  let shutter = clamp(params.shutterAngle / 360.0, 0.0, 1.0);
  let centerMotion = sourceMotionPixels(center, dimensions);
  let centerLength = length(centerMotion);
  var primaryMotion = centerMotion;
  var primaryLength = centerLength;
  var primaryAnchor = pixel;
  var secondaryMotion = neighbourhoodSecondaryMotion;
  var secondaryLength = neighbourhoodSecondaryLength;
  var secondaryAnchor = neighbourhoodSecondaryAnchor;
  if (neighbourhoodPrimaryLength > primaryLength) {
    if (distinctDirection(primaryMotion, neighbourhoodPrimaryMotion)) {
      secondaryMotion = primaryMotion;
      secondaryLength = primaryLength;
      secondaryAnchor = pixel;
    }
    primaryMotion = neighbourhoodPrimaryMotion;
    primaryLength = neighbourhoodPrimaryLength;
    primaryAnchor = neighbourhoodPrimaryAnchor;
  } else if (
    neighbourhoodPrimaryLength > secondaryLength &&
    distinctDirection(primaryMotion, neighbourhoodPrimaryMotion)
  ) {
    secondaryMotion = neighbourhoodPrimaryMotion;
    secondaryLength = neighbourhoodPrimaryLength;
    secondaryAnchor = neighbourhoodPrimaryAnchor;
  }
  if (
    secondaryLength <= 1e-5 ||
    !distinctDirection(primaryMotion, secondaryMotion)
  ) {
    secondaryMotion = vec2<f32>(0.0);
    secondaryLength = 0.0;
  }
  empty.primaryMotion = primaryMotion;
  empty.secondaryMotion = secondaryMotion;
  empty.primaryAnchor = primaryAnchor;
  empty.secondaryAnchor = secondaryAnchor;
  empty.primaryRadius = sourceRadius(primaryMotion, shutter);
  empty.secondaryRadius = sourceRadius(secondaryMotion, shutter);
  empty.valid = empty.primaryRadius > 1e-5 || empty.secondaryRadius > 1e-5;
  empty.longVector = max(empty.primaryRadius, empty.secondaryRadius) > 8.0;
  return empty;
}

fn sourceAnchorForReceiver(
  receiverPixel : vec2<i32>,
  anchor : vec2<i32>,
  motion : vec2<f32>,
  dimensions : vec2<i32>,
) -> vec2<i32> {
  // A tile summary has one source anchor, while a horizontal source may span
  // the tile's perpendicular axis. Project that anchor onto the receiver's
  // motion line before the midpoint read. The following source footprint
  // validates the projected pixel, so a thin or off-axis source cannot be
  // invented by the projection.
  let motionLength = length(motion);
  if (motionLength <= 1e-5) { return anchor; }
  let direction = motion / motionLength;
  let delta = vec2<f32>(receiverPixel - anchor);
  let perpendicular = delta - direction * dot(delta, direction);
  let projected = vec2<f32>(anchor) + perpendicular;
  let candidate = vec2<i32>(floor(projected + vec2<f32>(0.5)));
  return clamp(candidate, vec2<i32>(0), dimensions - vec2<i32>(1));
}

fn supportTap(
  receiverPixel : vec2<i32>,
  index : u32,
  count : u32,
  motion : vec2<f32>,
  radius : f32,
  anchor : vec2<i32>,
  dimensions : vec2<i32>,
) -> MotionBlurTap {
  // Preserve the geometric midpoint as the primary sample. The source anchor
  // is a recovery coordinate for a sparse tile summary, not a replacement for
  // the receiver's authored support. It is tried only when this midpoint has
  // no valid source, and therefore never adds a color read or a tap.
  var fallbackPixel = vec2<i32>(0);
  var fallbackValid = false;
  if (index == count / 2u) {
    fallbackPixel = sourceAnchorForReceiver(receiverPixel, anchor, motion, dimensions);
    fallbackValid = pixelInBounds(fallbackPixel, dimensions);
  }
  let direction = motion / max(length(motion), 1e-5);
  let offset = symmetricOffset(index, count, direction * radius);
  let dimensionsF = vec2<f32>(dimensions);
  let uv = (vec2<f32>(receiverPixel) + vec2<f32>(0.5) + offset) / dimensionsF;
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x >= 1.0 || uv.y >= 1.0) {
    return MotionBlurTap(vec2<i32>(0), fallbackPixel, false, fallbackValid);
  }
  let candidate = vec2<i32>(floor(uv * dimensionsF));
  return MotionBlurTap(candidate, fallbackPixel, pixelInBounds(candidate, dimensions), fallbackValid);
}

fn sourceAt(
  receiverPixel : vec2<i32>,
  sourcePixel : vec2<i32>,
  centerDepth : f32,
  shutter : f32,
  dimensions : vec2<i32>,
) -> MotionBlurSource {
  let empty = MotionBlurSource(
    vec2<i32>(0),
    vec2<f32>(0.0),
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0u,
    false,
  );
  if (!pixelInBounds(sourcePixel, dimensions)) { return empty; }
  let source = temporalAt(sourcePixel, dimensions);
  if (!source.validDepth || !source.motionValid || depthReject(centerDepth, source.depth)) {
    return empty;
  }
  let motionPixels = sourceMotionPixels(source, dimensions);
  let radius = sourceRadius(motionPixels, shutter);
  if (!sourceVelocitySegmentCovers(receiverPixel, sourcePixel, motionPixels, radius)) {
    return empty;
  }
  return MotionBlurSource(
    sourcePixel,
    motionPixels,
    source.depth,
    radius,
    1.0,
    1.0,
    1.0,
    1.0,
    0u,
    true,
  );
}

// A half-resolution owner represents a complete 2x2 receiving footprint. The
// source motion test is evaluated against every receiving pixel in that
// footprint, so odd/even rows and columns remain visible without a second
// filter pass or an unbounded neighbourhood walk.
fn sourceAtFootprint(
  receiverPixel : vec2<i32>,
  sourcePixel : vec2<i32>,
  centerDepth : f32,
  shutter : f32,
  dimensions : vec2<i32>,
) -> MotionBlurSource {
  var selected = MotionBlurSource(
    vec2<i32>(0),
    vec2<f32>(0.0),
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0u,
    false,
  );
  var selectedDepth = 3.402823e+38;
  var coverage0 = 0.0;
  var coverage1 = 0.0;
  var coverage2 = 0.0;
  var coverage3 = 0.0;
  var selectedReceiverMask = 0u;
  for (var y = 0u; y < 2u; y += 1u) {
    for (var x = 0u; x < 2u; x += 1u) {
      let candidatePixel = sourcePixel + vec2<i32>(i32(x), i32(y));
      if (!pixelInBounds(candidatePixel, dimensions)) { continue; }
      let temporal = temporalAt(candidatePixel, dimensions);
      if (!temporal.validDepth || !temporal.motionValid || depthReject(centerDepth, temporal.depth)) {
        continue;
      }
      let motionPixels = sourceMotionPixels(temporal, dimensions);
      let radius = sourceRadius(motionPixels, shutter);
      var receiverMask = 0u;
      // A source half-cell and a receiver half-cell share the same integer
      // displacement. This one-to-one correspondence keeps a diagonal source
      // from being counted for all four receiver quadrants just because its
      // tube crosses the quadrant. The segment test still supplies the motion
      // support and depth/validity checks remain source-owned.
      let receiver = receiverPixel + vec2<i32>(i32(x), i32(y));
      if (
        pixelInBounds(receiver, dimensions) &&
        sourceVelocitySegmentCovers(receiver, candidatePixel, motionPixels, radius)
      ) {
        receiverMask = receiverMask | (1u << (y * 2u + x));
      }
      if (receiverMask == 0u) { continue; }
      if (!selected.valid || temporal.depth < selectedDepth) {
        selected = MotionBlurSource(
          candidatePixel,
          motionPixels,
          temporal.depth,
          radius,
          0.0,
          0.0,
          0.0,
          0.0,
          receiverMask,
          true,
        );
        selectedDepth = temporal.depth;
        coverage0 = 0.0;
        coverage1 = 0.0;
        coverage2 = 0.0;
        coverage3 = 0.0;
        selectedReceiverMask = receiverMask;
      }
      if (abs(temporal.depth - selectedDepth) <= 1e-4) {
        // The common integer displacement above gives each source cell one
        // receiver quadrant. The matching footprint therefore contributes its
        // full unit overlap to that one owner.
        if ((receiverMask & 1u) != 0u) { coverage0 += 1.0; }
        if ((receiverMask & 2u) != 0u) { coverage1 += 1.0; }
        if ((receiverMask & 4u) != 0u) { coverage2 += 1.0; }
        if ((receiverMask & 8u) != 0u) { coverage3 += 1.0; }
        selectedReceiverMask = selectedReceiverMask | receiverMask;
      }
    }
  }
  if (selected.valid) {
    // The owner samples a 2x2 source footprint but pays for one color read.
    // Each receiving quadrant keeps the fraction of that footprint that is
    // covered at the selected depth. This preserves energy at boundaries and
    // carries a one-pixel odd-row feature into its real row only.
    selected.coverage0 = min(coverage0, 1.0) * select(0.0, 1.0, (selectedReceiverMask & 1u) != 0u);
    selected.coverage1 = min(coverage1, 1.0) * select(0.0, 1.0, (selectedReceiverMask & 2u) != 0u);
    selected.coverage2 = min(coverage2, 1.0) * select(0.0, 1.0, (selectedReceiverMask & 4u) != 0u);
    selected.coverage3 = min(coverage3, 1.0) * select(0.0, 1.0, (selectedReceiverMask & 8u) != 0u);
    selected.receiverMask = selectedReceiverMask;
  }
  return selected;
}

fn midpointTileOwnership(
  receiverPixel : vec2<i32>,
  source : MotionBlurSource,
) -> f32 {
  // A recovered tile anchor represents one two-pixel source footprint. The
  // footprint is split across the finite, geometrically derived tile bands of
  // the support segment. One half-cell owner per band claims the represented
  // midpoint slot, rather than painting every receiver in the interval.
  let sourcePixel = source.pixel;
  let motionLength = length(source.motion);
  if (motionLength <= 1e-5 || source.radius <= 1e-5) { return 0.0; }
  let receiverTile = receiverPixel / vec2<i32>(16);
  let sourceTile = sourcePixel / vec2<i32>(16);
  let tileDelta = vec2<f32>(sourceTile - receiverTile);
  let direction = source.motion / motionLength;
  let along = abs(dot(tileDelta, direction));
  let perpendicular = abs(tileDelta.x * direction.y - tileDelta.y * direction.x);
  let tileReach = min(4, max(1, i32(ceil(source.radius / 16.0))));
  if (along < 1.0 || ceil(along) > f32(tileReach) || perpendicular > 1.0) { return 0.0; }
  let groupBase = (receiverPixel / vec2<i32>(8)) * vec2<i32>(8);
  let local = receiverPixel - groupBase;
  let ownerX = select(
    clamp(((sourcePixel.x - groupBase.x) / 2) * 2, 0, 6),
    select(0, 6, sourcePixel.x > receiverPixel.x),
    sourcePixel.x != receiverPixel.x,
  );
  let ownerY = select(
    clamp(((sourcePixel.y - groupBase.y) / 2) * 2, 0, 6),
    select(0, 6, sourcePixel.y > receiverPixel.y),
    sourcePixel.y != receiverPixel.y,
  );
  if (local.x != ownerX || local.y != ownerY) { return 0.0; }
  let sourceFootprintLength = 2.0;
  let supportLength = max(2.0 * source.radius, sourceFootprintLength);
  // Divide the finite footprint ownership over every reachable tile band.
  // This keeps the total recovery mass bounded when the support grows from
  // 32 to 64 pixels while retaining a nonzero owner at any in-view band.
  return min(1.0, sourceFootprintLength / (supportLength * f32(tileReach)));
}

fn integrateLongColor(
  filtered : vec4<f32>,
  validCount : f32,
  hasAcceptedSource : bool,
  uncovered : f32,
  count : u32,
  supportCount : u32,
  centerColor : vec4<f32>,
  centerMoving : bool,
) -> vec4<f32> {
  // Uncovered ownership is decremented at the same time as validCount is incremented
  // for both geometric and midpoint-recovered samples. Keep the derived cap
  // as a guard against floating point accumulation and make the ownership
  // transfer explicit instead of adding an independent brightness term.
  let conservedUncovered = min(
    max(uncovered, 0.0),
    max(f32(supportCount) - validCount, 0.0),
  );
  // A moving receiver can be partially covered at a silhouette edge. Use the
  // accepted foreground only for the receiver's missing current coverage; a
  // fully covered receiver keeps the original center contribution and the
  // Dawn energy contract remains unchanged for uniform opaque surfaces.
  let acceptedColor = select(
    vec3<f32>(0.0),
    filtered.rgb / max(validCount, 1.0),
    hasAcceptedSource && validCount > 0.0,
  );
  // Preserve the color target's authored alpha as the output floor. It is
  // separate from the RGB test below, which identifies an empty background
  // receiver without treating alpha as a scene-coverage attachment.
  let missingForeground = 1.0 - clamp(centerColor.a, 0.0, 1.0);
  let edgeCoverage = select(missingForeground, 1.0, centerMoving);
  let edgeFill = acceptedColor * edgeCoverage * EDGE_FILL_FACTOR;
  let movingFallback = select(centerColor.rgb, edgeFill, hasAcceptedSource && validCount > 0.0);
  let background = select(vec3<f32>(0.0), movingFallback, centerMoving);
  // The accepted colour can come from a transparent receiver's moving
  // foreground. Carry the same bounded support coverage into alpha so that
  // RGB written outside the current silhouette is not composited as black.
  // Preserve the receiver's authored coverage as a floor: blur must not make
  // an already visible pixel disappear.
  let acceptedAlpha = select(
    0.0,
    filtered.a / max(validCount, 1.0),
    validCount > 0.0,
  );
  let acceptedCoverage = validCount + missingForeground * conservedUncovered;
  let reconstructedAlpha = acceptedAlpha * acceptedCoverage / max(f32(count), 1.0);
  let outputAlpha = clamp(max(centerColor.a, reconstructedAlpha), 0.0, 1.0);
  let emptyReceiver =
    !centerMoving &&
    hasAcceptedSource &&
    max(max(abs(centerColor.r), abs(centerColor.g)), abs(centerColor.b)) < 1e-4;
  let sourceScale = select(1.0, 1.0 - EDGE_FILL_FACTOR, emptyReceiver);
  let sourceContribution = filtered.rgb * sourceScale;
  let trailScale = select(1.0, 1.0 - EDGE_FILL_FACTOR, emptyReceiver);
  let trailContribution = background * conservedUncovered * trailScale;
  return vec4<f32>(
    (sourceContribution + centerColor.rgb + trailContribution) / max(f32(count), 1.0),
    outputAlpha,
  );
}

fn longSupportFilter(
  receiverPixel : vec2<i32>,
  support : MotionBlurSupport,
  centerDepth : f32,
  dimensions : vec2<i32>,
) -> MotionBlurFilter {
  var empty = MotionBlurFilter(
    vec4<f32>(0.0),
    vec4<f32>(0.0),
    vec4<f32>(0.0),
    vec4<f32>(0.0),
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    receiverPixel,
    vec2<f32>(0.0),
    0.0,
    0u,
    0u,
    false,
  );
  if (!support.valid) { return empty; }
  let count = min(params.sampleCount, 16u);
  // The authored tier is the total source colour-read budget. Reserve one slot
  // for the receiver/background contribution; the remaining bounded taps
  // (at most 15) are split between the two source directions when needed.
  let supportCount = max(count - 1u, 1u);
  let useSecondDirection = support.secondaryRadius > 1e-5 && distinctDirection(support.primaryMotion, support.secondaryMotion);
  let primaryCount = select(supportCount, max(supportCount / 2u, 1u), useSecondDirection);
  let secondaryCount = max(supportCount - primaryCount, 1u);
  let shutter = clamp(params.shutterAngle / 360.0, 0.0, 1.0);
  let center = temporalAt(receiverPixel, dimensions);
  // Keep each receiving quadrant's own center color. Reusing the owner
  // pixel for all four quadrants causes a one-pixel parity shift to duplicate
  // a bright source (or erase a bright receiver) in the half-resolution cache.
  var centerColor0 = colorAt(receiverPixel, dimensions);
  var centerColor1 = colorAt(receiverPixel + vec2<i32>(1, 0), dimensions);
  var centerColor2 = colorAt(receiverPixel + vec2<i32>(0, 1), dimensions);
  var centerColor3 = colorAt(receiverPixel + vec2<i32>(1, 1), dimensions);
  var filtered0 = vec4<f32>(0.0);
  var filtered1 = vec4<f32>(0.0);
  var filtered2 = vec4<f32>(0.0);
  var filtered3 = vec4<f32>(0.0);
  var validCount0 = 0.0;
  var validCount1 = 0.0;
  var validCount2 = 0.0;
  var validCount3 = 0.0;
  var hasAcceptedSource0 = false;
  var hasAcceptedSource1 = false;
  var hasAcceptedSource2 = false;
  var hasAcceptedSource3 = false;
  var uncovered0 = f32(supportCount);
  var uncovered1 = f32(supportCount);
  var uncovered2 = f32(supportCount);
  var uncovered3 = f32(supportCount);
  var midpointFallbackPixel = vec2<i32>(0);
  var midpointFallbackValid = false;
  var midpointFallbackRadius = 0.0;
  var nearestDepth0 = 3.402823e+38;
  var nearestDepth1 = 3.402823e+38;
  var nearestDepth2 = 3.402823e+38;
  var nearestDepth3 = 3.402823e+38;
  for (var index = 0u; index < 16u; index += 1u) {
    if (index >= supportCount) { break; }
    let secondDirection = useSecondDirection && index >= primaryCount;
    let localIndex = select(index, index - primaryCount, secondDirection);
    let localCount = select(primaryCount, secondaryCount, secondDirection);
    let selectedMotion = select(support.primaryMotion, support.secondaryMotion, secondDirection);
    let selectedRadius = select(support.primaryRadius, support.secondaryRadius, secondDirection);
    let tap = supportTap(
      receiverPixel,
      localIndex,
      localCount,
      selectedMotion,
      selectedRadius,
      select(support.primaryAnchor, support.secondaryAnchor, secondDirection),
      dimensions,
    );
    if (!tap.valid) {
      if (tap.fallbackValid && selectedRadius > midpointFallbackRadius) {
        midpointFallbackPixel = tap.fallbackPixel;
        midpointFallbackValid = true;
        midpointFallbackRadius = selectedRadius;
      }
      continue;
    }
    let source = sourceAtFootprint(
      receiverPixel,
      tap.pixel,
      centerDepth,
      shutter,
      dimensions,
    );
    if (!source.valid) {
      if (tap.fallbackValid && selectedRadius > midpointFallbackRadius) {
        midpointFallbackPixel = tap.fallbackPixel;
        midpointFallbackValid = true;
        midpointFallbackRadius = selectedRadius;
      }
      continue;
    }
    let sampleColor = colorAt(source.pixel, dimensions);
    // Keep the receiver's own color as the center contribution. A source
    // footprint may cover an adjacent receiver quadrant without being the
    // receiver itself; substituting its color here creates odd/even-alignment
    // brightening at thin-object boundaries.
    if ((source.receiverMask & 1u) != 0u) {
      filtered0 += sampleColor * source.coverage0;
      validCount0 += source.coverage0;
      hasAcceptedSource0 = true;
      uncovered0 = max(uncovered0 - source.coverage0, 0.0);
      nearestDepth0 = min(nearestDepth0, source.depth);
    }
    if ((source.receiverMask & 2u) != 0u) {
      filtered1 += sampleColor * source.coverage1;
      validCount1 += source.coverage1;
      hasAcceptedSource1 = true;
      uncovered1 = max(uncovered1 - source.coverage1, 0.0);
      nearestDepth1 = min(nearestDepth1, source.depth);
    }
    if ((source.receiverMask & 4u) != 0u) {
      filtered2 += sampleColor * source.coverage2;
      validCount2 += source.coverage2;
      hasAcceptedSource2 = true;
      uncovered2 = max(uncovered2 - source.coverage2, 0.0);
      nearestDepth2 = min(nearestDepth2, source.depth);
    }
    if ((source.receiverMask & 8u) != 0u) {
      filtered3 += sampleColor * source.coverage3;
      validCount3 += source.coverage3;
      hasAcceptedSource3 = true;
      uncovered3 = max(uncovered3 - source.coverage3, 0.0);
      nearestDepth3 = min(nearestDepth3, source.depth);
    }
  }
  // A tile anchor recovers a sparse source only for the widest support tier,
  // where the fixed geometric lattice can leave a source between taps. It
  // spends the represented midpoint ownership of the finite support segment;
  // every accepted colour, coverage and depth contribution uses that same
  // bounded ownership, so the fallback cannot create an opaque stripe. The
  // shorter tiers keep their exact geometric energy and do not need recovery.
  if (midpointFallbackValid && max(support.primaryRadius, support.secondaryRadius) > 32.0) {
    let fallbackSource = sourceAtFootprint(
      receiverPixel,
      midpointFallbackPixel,
      centerDepth,
      shutter,
      dimensions,
    );
    if (fallbackSource.valid) {
      let midpointWeight = midpointTileOwnership(receiverPixel, fallbackSource);
      if (
        midpointWeight > 0.0
      ) {
        let fallbackColor = colorAt(fallbackSource.pixel, dimensions);
        let fallbackWeight0 = fallbackSource.coverage0 * midpointWeight;
        let fallbackWeight1 = fallbackSource.coverage1 * midpointWeight;
        let fallbackWeight2 = fallbackSource.coverage2 * midpointWeight;
        let fallbackWeight3 = fallbackSource.coverage3 * midpointWeight;
        if (validCount0 <= 0.0 && (fallbackSource.receiverMask & 1u) != 0u) {
          let ownedWeight0 = min(fallbackWeight0, uncovered0);
          if (ownedWeight0 > 0.0) {
            filtered0 += fallbackColor * ownedWeight0;
            validCount0 += ownedWeight0;
            hasAcceptedSource0 = true;
            uncovered0 = max(uncovered0 - ownedWeight0, 0.0);
            nearestDepth0 = min(nearestDepth0, fallbackSource.depth);
          }
        }
        if (validCount1 <= 0.0 && (fallbackSource.receiverMask & 2u) != 0u) {
          let ownedWeight1 = min(fallbackWeight1, uncovered1);
          if (ownedWeight1 > 0.0) {
            filtered1 += fallbackColor * ownedWeight1;
            validCount1 += ownedWeight1;
            hasAcceptedSource1 = true;
            uncovered1 = max(uncovered1 - ownedWeight1, 0.0);
            nearestDepth1 = min(nearestDepth1, fallbackSource.depth);
          }
        }
        if (validCount2 <= 0.0 && (fallbackSource.receiverMask & 4u) != 0u) {
          let ownedWeight2 = min(fallbackWeight2, uncovered2);
          if (ownedWeight2 > 0.0) {
            filtered2 += fallbackColor * ownedWeight2;
            validCount2 += ownedWeight2;
            hasAcceptedSource2 = true;
            uncovered2 = max(uncovered2 - ownedWeight2, 0.0);
            nearestDepth2 = min(nearestDepth2, fallbackSource.depth);
          }
        }
        if (validCount3 <= 0.0 && (fallbackSource.receiverMask & 8u) != 0u) {
          let ownedWeight3 = min(fallbackWeight3, uncovered3);
          if (ownedWeight3 > 0.0) {
            filtered3 += fallbackColor * ownedWeight3;
            validCount3 += ownedWeight3;
            hasAcceptedSource3 = true;
            uncovered3 = max(uncovered3 - ownedWeight3, 0.0);
            nearestDepth3 = min(nearestDepth3, fallbackSource.depth);
          }
        }
      }
    }
  }
  let moving0 = temporalAt(receiverPixel, dimensions);
  let moving1 = temporalAt(receiverPixel + vec2<i32>(1, 0), dimensions);
  let moving2 = temporalAt(receiverPixel + vec2<i32>(0, 1), dimensions);
  let moving3 = temporalAt(receiverPixel + vec2<i32>(1, 1), dimensions);
  let motion0 = sourceMotionPixels(moving0, dimensions);
  let motion1 = sourceMotionPixels(moving1, dimensions);
  let motion2 = sourceMotionPixels(moving2, dimensions);
  let motion3 = sourceMotionPixels(moving3, dimensions);
  let centerMoving0 = moving0.validDepth && moving0.motionValid && sourceRadius(motion0, shutter) > 1e-5;
  let centerMoving1 = moving1.validDepth && moving1.motionValid && sourceRadius(motion1, shutter) > 1e-5;
  let centerMoving2 = moving2.validDepth && moving2.motionValid && sourceRadius(motion2, shutter) > 1e-5;
  let centerMoving3 = moving3.validDepth && moving3.motionValid && sourceRadius(motion3, shutter) > 1e-5;
  empty.color0 = integrateLongColor(filtered0, validCount0, hasAcceptedSource0, uncovered0, count, supportCount, centerColor0, centerMoving0);
  empty.color1 = integrateLongColor(filtered1, validCount1, hasAcceptedSource1, uncovered1, count, supportCount, centerColor1, centerMoving1);
  empty.color2 = integrateLongColor(filtered2, validCount2, hasAcceptedSource2, uncovered2, count, supportCount, centerColor2, centerMoving2);
  empty.color3 = integrateLongColor(filtered3, validCount3, hasAcceptedSource3, uncovered3, count, supportCount, centerColor3, centerMoving3);
  empty.depth0 = select(centerDepth, nearestDepth0, validCount0 > 0.0);
  empty.depth1 = select(centerDepth, nearestDepth1, validCount1 > 0.0);
  empty.depth2 = select(centerDepth, nearestDepth2, validCount2 > 0.0);
  empty.depth3 = select(centerDepth, nearestDepth3, validCount3 > 0.0);
  empty.coverage0 = validCount0 / max(f32(supportCount), 1.0);
  empty.coverage1 = validCount1 / max(f32(supportCount), 1.0);
  empty.coverage2 = validCount2 / max(f32(supportCount), 1.0);
  empty.coverage3 = validCount3 / max(f32(supportCount), 1.0);
  empty.motion = select(support.primaryMotion, support.secondaryMotion, support.primaryRadius <= 1e-5);
  empty.radius = max(support.primaryRadius, support.secondaryRadius);
  empty.receiverMask =
    select(0u, 1u, validCount0 > 0.0 || centerMoving0) |
    select(0u, 2u, validCount1 > 0.0 || centerMoving1) |
    select(0u, 4u, validCount2 > 0.0 || centerMoving2) |
    select(0u, 8u, validCount3 > 0.0 || centerMoving3);
  empty.validMask =
    select(0u, 1u, validCount0 > 0.0 || centerMoving0) |
    select(0u, 2u, validCount1 > 0.0 || centerMoving1) |
    select(0u, 4u, validCount2 > 0.0 || centerMoving2) |
    select(0u, 8u, validCount3 > 0.0 || centerMoving3);
  empty.valid = empty.validMask != 0u;
  return empty;
}

fn colorAt(pixel : vec2<i32>, dimensions : vec2<i32>) -> vec4<f32> {
  return textureLoad(currentColor, clamp(pixel, vec2<i32>(0), dimensions - vec2<i32>(1)), 0);
}

fn cacheFootprintContains(receiverPixel : vec2<i32>, ownerPixel : vec2<i32>) -> bool {
  return
    receiverPixel.x >= ownerPixel.x && receiverPixel.x <= ownerPixel.x + 1 &&
    receiverPixel.y >= ownerPixel.y && receiverPixel.y <= ownerPixel.y + 1;
}

fn cachedSupportCovers(
  receiverPixel : vec2<i32>,
  ownerPixel : vec2<i32>,
  motion : vec2<f32>,
  radius : f32,
) -> bool {
  if (!cacheFootprintContains(receiverPixel, ownerPixel)) { return false; }
  let motionLength = length(motion);
  if (motionLength <= 1e-5 || radius <= 1e-5) { return false; }
  let direction = motion / motionLength;
  let delta = vec2<f32>(receiverPixel - ownerPixel);
  let along = dot(delta, direction);
  let perpendicular = abs(delta.x * direction.y - delta.y * direction.x);
  return abs(along) <= radius + 1.0 && perpendicular <= 1.0;
}

fn cachedDirectionMatches(support : MotionBlurSupport, motion : vec2<f32>) -> bool {
  let motionLength = length(motion);
  if (motionLength <= 1e-5) { return false; }
  let direction = motion / motionLength;
  if (support.primaryRadius > 1e-5 && abs(dot(normalize(support.primaryMotion), direction)) >= 0.94) {
    return true;
  }
  return support.secondaryRadius > 1e-5 && abs(dot(normalize(support.secondaryMotion), direction)) >= 0.94;
}

fn depthGuidedHalfResolutionColor(
  localId : vec3<u32>,
  receiverPixel : vec2<i32>,
  support : MotionBlurSupport,
  centerDepth : f32,
) -> MotionBlurCacheSample {
  let cell = vec2<i32>(localId.xy / vec2<u32>(2));
  let quadrant = (localId.y % 2u) * 2u + (localId.x % 2u);
  var selected = MotionBlurCacheSample(vec4<f32>(0.0), 0.0, false);
  var selectedDelta = 3.402823e+38;
  // Search the bounded adjacent cache cells, but accept only a cell whose
  // authored 2x2 footprint and direction actually cover this receiver.
  for (var y = -1; y <= 1; y += 1) {
    for (var x = -1; x <= 1; x += 1) {
      let candidateCell = cell + vec2<i32>(x, y);
      if (candidateCell.x < 0 || candidateCell.y < 0 || candidateCell.x >= 4 || candidateCell.y >= 4) { continue; }
      let cacheCellIndex = u32(candidateCell.y * 4 + candidateCell.x);
      let index = cacheCellIndex * 4u + quadrant;
      if (
        halfFilteredValid[index] == 0u ||
        depthReject(centerDepth, halfFilteredDepth[index]) ||
        !cachedDirectionMatches(support, halfFilteredMotion[cacheCellIndex]) ||
        !cachedSupportCovers(
          receiverPixel,
          halfFilteredReceiver[cacheCellIndex],
          halfFilteredMotion[cacheCellIndex],
          halfFilteredRadius[cacheCellIndex],
        )
      ) { continue; }
      let delta = abs(halfFilteredDepth[index] - centerDepth);
      if (!selected.valid || delta < selectedDelta) {
        selected.color = halfFilteredColor[index];
        selected.coverage = halfFilteredCoverage[index];
        selectedDelta = delta;
        selected.valid = true;
      }
    }
  }
  return selected;
}

@compute @workgroup_size(8, 8)
fn tile_summary(
  @builtin(global_invocation_id) id : vec3<u32>,
  @builtin(local_invocation_id) localId : vec3<u32>,
  @builtin(local_invocation_index) localIndex : u32,
  @builtin(workgroup_id) workgroupId : vec3<u32>,
) {
  let dimensions = textureDimensions(sceneTemporal);
  let tiles = (dimensions + vec2<u32>(15)) / vec2<u32>(16);
  let tile = workgroupId.xy;
  let inTile = tile.x < tiles.x && tile.y < tiles.y;
  var maxMotion = vec2<f32>(0.0);
  var maxLength = 0.0;
  var maxSource = vec2<i32>(0);
  var secondaryMotion = vec2<f32>(0.0);
  var secondaryLength = 0.0;
  var secondarySource = vec2<i32>(0);
  for (var localY = 0u; localY < 2u; localY += 1u) {
    for (var localX = 0u; localX < 2u; localX += 1u) {
      let pixel = tile * vec2<u32>(16) + localId.xy * vec2<u32>(2) + vec2<u32>(localX, localY);
      if (!inTile || pixel.x >= dimensions.x || pixel.y >= dimensions.y) { continue; }
      let sample = temporalAt(vec2<i32>(pixel), vec2<i32>(dimensions));
      if (!sample.validDepth || !sample.motionValid) { continue; }
      let motionLength = length(sample.motion * vec2<f32>(dimensions));
      if (motionLength > maxLength) {
        if (distinctDirection(maxMotion, sample.motion)) {
          secondaryMotion = maxMotion;
          secondaryLength = maxLength;
          secondarySource = maxSource;
        }
        maxLength = motionLength;
        maxMotion = sample.motion;
        maxSource = vec2<i32>(pixel);
      } else if (
        motionLength > secondaryLength &&
        distinctDirection(maxMotion, sample.motion)
      ) {
        secondaryLength = motionLength;
        secondaryMotion = sample.motion;
        secondarySource = vec2<i32>(pixel);
      }
    }
  }
  tileMotionScratch[localIndex] = maxMotion;
  tileLengthScratch[localIndex] = maxLength;
  tileSourceScratch[localIndex] = maxSource;
  tileSecondaryMotionScratch[localIndex] = secondaryMotion;
  tileSecondaryLengthScratch[localIndex] = secondaryLength;
  tileSecondarySourceScratch[localIndex] = secondarySource;
  workgroupBarrier();
  for (var stride = 32u; stride > 0u; stride = stride / 2u) {
    if (localIndex < stride) {
      let otherIndex = localIndex + stride;
      let otherLength = tileLengthScratch[otherIndex];
      if (otherLength > tileLengthScratch[localIndex]) {
        let oldMotion = tileMotionScratch[localIndex];
        let oldLength = tileLengthScratch[localIndex];
        let oldSource = tileSourceScratch[localIndex];
        tileLengthScratch[localIndex] = otherLength;
        tileMotionScratch[localIndex] = tileMotionScratch[otherIndex];
        tileSourceScratch[localIndex] = tileSourceScratch[otherIndex];
        if (
          oldLength > 1e-5 &&
          distinctDirection(tileMotionScratch[localIndex], oldMotion) &&
          oldLength > tileSecondaryLengthScratch[localIndex]
        ) {
          tileSecondaryLengthScratch[localIndex] = oldLength;
          tileSecondaryMotionScratch[localIndex] = oldMotion;
          tileSecondarySourceScratch[localIndex] = oldSource;
        }
      }
      if (
        tileSecondaryLengthScratch[otherIndex] > tileSecondaryLengthScratch[localIndex] &&
        distinctDirection(
          tileMotionScratch[localIndex],
          tileSecondaryMotionScratch[otherIndex],
        )
      ) {
        tileSecondaryLengthScratch[localIndex] = tileSecondaryLengthScratch[otherIndex];
        tileSecondaryMotionScratch[localIndex] = tileSecondaryMotionScratch[otherIndex];
        tileSecondarySourceScratch[localIndex] = tileSecondarySourceScratch[otherIndex];
      }
      if (
        tileLengthScratch[otherIndex] > tileSecondaryLengthScratch[localIndex] &&
        distinctDirection(tileMotionScratch[localIndex], tileMotionScratch[otherIndex])
      ) {
        tileSecondaryLengthScratch[localIndex] = tileLengthScratch[otherIndex];
        tileSecondaryMotionScratch[localIndex] = tileMotionScratch[otherIndex];
        tileSecondarySourceScratch[localIndex] = tileSourceScratch[otherIndex];
      }
    }
    workgroupBarrier();
  }
  if (localIndex == 0u && inTile) {
    let tileIndex = tile.y * tiles.x + tile.x;
    tileSummary[tileIndex] = MotionBlurTileSummary(
      vec4<f32>(
        tileMotionScratch[0],
        f32(tileSourceScratch[0].x),
        f32(tileSourceScratch[0].y),
      ),
      vec4<f32>(
        tileSecondaryMotionScratch[0],
        f32(tileSecondarySourceScratch[0].x),
        f32(tileSecondarySourceScratch[0].y),
      ),
    );
  }
}

@compute @workgroup_size(8, 8)
fn reconstruct(
  @builtin(global_invocation_id) id : vec3<u32>,
  @builtin(local_invocation_id) localId : vec3<u32>,
  @builtin(workgroup_id) workgroupId : vec3<u32>,
) {
  let dimensions = textureDimensions(currentColor);
  let colorDimensions = vec2<i32>(dimensions);
  let pixel = vec2<i32>(id.xy);
  let inBounds = id.x < dimensions.x && id.y < dimensions.y;
  let workgroupBase = vec2<i32>(workgroupId.xy * vec2<u32>(8));
  let ownsHalfCell = (localId.x % 2u == 0u) && (localId.y % 2u == 0u);
  let halfIndex = (localId.y / 2u) * 4u + (localId.x / 2u);
  let localIndex = localId.y * 8u + localId.x;
  if (localIndex == 0u) {
    scanTileNeighbourhood(workgroupBase, colorDimensions);
  }
  workgroupBarrier();
  let support = resolveMotionBlurSupport(pixel, colorDimensions);
  let longVector = support.valid && support.longVector;

  longVectorScratch[localId.y * 8u + localId.x] = select(0u, 1u, longVector);
  workgroupBarrier();
  for (var longStride = 32u; longStride > 0u; longStride = longStride / 2u) {
    let localIndex = localId.y * 8u + localId.x;
    if (localIndex < longStride) {
      longVectorScratch[localIndex] = max(
        longVectorScratch[localIndex],
        longVectorScratch[localIndex + longStride],
      );
    }
    workgroupBarrier();
  }
  let anyLongVector = longVectorScratch[0] != 0u;
  if (anyLongVector && ownsHalfCell) {
    // Every designated owner evaluates the full support exactly once. The
    // cached result includes filtered color, nearest accepted depth, and
    // coverage; no 2x2 prefilter is substituted for the long gather.
    let sourcePixel = workgroupBase + vec2<i32>(localId.xy);
    let sourceSupport = resolveMotionBlurSupport(sourcePixel, colorDimensions);
    let filtered = longSupportFilter(
      sourcePixel,
      sourceSupport,
      temporalAt(sourcePixel, colorDimensions).depth,
      colorDimensions,
    );
    halfFilteredReceiver[halfIndex] = sourcePixel;
    halfFilteredMotion[halfIndex] = filtered.motion;
    halfFilteredRadius[halfIndex] = filtered.radius;
    let cacheBase = halfIndex * 4u;
    halfFilteredColor[cacheBase] = filtered.color0;
    halfFilteredColor[cacheBase + 1u] = filtered.color1;
    halfFilteredColor[cacheBase + 2u] = filtered.color2;
    halfFilteredColor[cacheBase + 3u] = filtered.color3;
    halfFilteredDepth[cacheBase] = filtered.depth0;
    halfFilteredDepth[cacheBase + 1u] = filtered.depth1;
    halfFilteredDepth[cacheBase + 2u] = filtered.depth2;
    halfFilteredDepth[cacheBase + 3u] = filtered.depth3;
    halfFilteredCoverage[cacheBase] = filtered.coverage0;
    halfFilteredCoverage[cacheBase + 1u] = filtered.coverage1;
    halfFilteredCoverage[cacheBase + 2u] = filtered.coverage2;
    halfFilteredCoverage[cacheBase + 3u] = filtered.coverage3;
    halfFilteredValid[cacheBase] = select(0u, 1u, (filtered.validMask & 1u) != 0u);
    halfFilteredValid[cacheBase + 1u] = select(0u, 1u, (filtered.validMask & 2u) != 0u);
    halfFilteredValid[cacheBase + 2u] = select(0u, 1u, (filtered.validMask & 4u) != 0u);
    halfFilteredValid[cacheBase + 3u] = select(0u, 1u, (filtered.validMask & 8u) != 0u);
  }
  workgroupBarrier();
  // No invocation can return before both uniform barriers above. This keeps
  // odd extents and out-of-bounds lanes from allowing a long source to read a
  // cache entry that another invocation has not published yet.
  if (!inBounds) {
    return;
  }
  if (!support.valid) {
    textureStore(outputColor, pixel, colorAt(pixel, colorDimensions));
    return;
  }
  if (longVector) {
    let cached = depthGuidedHalfResolutionColor(
      localId,
      pixel,
      support,
      temporalAt(pixel, colorDimensions).depth,
    );
    if (cached.valid) {
      textureStore(outputColor, pixel, cached.color);
    } else {
      textureStore(outputColor, pixel, colorAt(pixel, colorDimensions));
    }
    return;
  }
  let useSecondDirection = support.secondaryRadius > 1e-5 && distinctDirection(support.primaryMotion, support.secondaryMotion);
  let count = min(params.sampleCount, 16u);
  let supportCount = max(count - 1u, 1u);
  let primaryCount = select(supportCount, max(supportCount / 2u, 1u), useSecondDirection);
  let secondaryCount = max(supportCount - primaryCount, 1u);
  let shutter = clamp(params.shutterAngle / 360.0, 0.0, 1.0);
  let center = temporalAt(pixel, colorDimensions);
  let centerMotion = sourceMotionPixels(center, colorDimensions);
  let centerMoving = center.validDepth && center.motionValid && sourceRadius(centerMotion, shutter) > 1e-5;
  let centerColor = colorAt(pixel, colorDimensions);
  var accum = vec4<f32>(0.0);
  var weight = 0.0;
  for (var index = 0u; index < 16u; index += 1u) {
    if (index >= supportCount) { break; }
    let secondDirection = useSecondDirection && index >= primaryCount;
    let localIndex = select(index, index - primaryCount, secondDirection);
    let localCount = select(primaryCount, secondaryCount, secondDirection);
    let selectedMotion = select(support.primaryMotion, support.secondaryMotion, secondDirection);
    let selectedRadius = select(support.primaryRadius, support.secondaryRadius, secondDirection);
    let tap = supportTap(
      pixel,
      localIndex,
      localCount,
      selectedMotion,
      selectedRadius,
      select(support.primaryAnchor, support.secondaryAnchor, secondDirection),
      colorDimensions,
    );
    if (!tap.valid) { continue; }
    let source = sourceAt(pixel, tap.pixel, center.depth, shutter, colorDimensions);
    if (!source.valid) { continue; }
    let sampleColor = colorAt(source.pixel, colorDimensions);
    accum += sampleColor;
    weight += 1.0;
  }
  let uncovered = max(f32(supportCount) - weight, 0.0);
  let acceptedColor = select(vec3<f32>(0.0), accum.rgb / max(weight, 1.0), weight > 0.0);
  let missingForeground = 1.0 - clamp(centerColor.a, 0.0, 1.0);
  let edgeCoverage = select(missingForeground, 1.0, centerMoving);
  let edgeFill = acceptedColor * edgeCoverage * EDGE_FILL_FACTOR;
  let movingFallback = select(centerColor.rgb, edgeFill, weight > 0.0);
  let uncoveredColor = select(vec3<f32>(0.0), movingFallback, centerMoving);
  let acceptedAlpha = select(0.0, accum.a / max(weight, 1.0), weight > 0.0);
  let acceptedCoverage = weight + missingForeground * uncovered;
  let reconstructedAlpha = acceptedAlpha * acceptedCoverage / max(f32(count), 1.0);
  let outputAlpha = clamp(max(centerColor.a, reconstructedAlpha), 0.0, 1.0);
  let emptyReceiver =
    !centerMoving &&
    weight > 0.0 &&
    max(max(abs(centerColor.r), abs(centerColor.g)), abs(centerColor.b)) < 1e-4;
  let sourceScale = select(1.0, 1.0 - EDGE_FILL_FACTOR, emptyReceiver);
  let sourceContribution = accum.rgb * sourceScale;
  let trailScale = select(1.0, 1.0 - EDGE_FILL_FACTOR, emptyReceiver);
  let trailContribution = uncoveredColor * uncovered * trailScale;
  textureStore(
    outputColor,
    pixel,
    vec4<f32>((sourceContribution + centerColor.rgb + trailContribution) / max(f32(count), 1.0), outputAlpha),
  );
}
`;
function encodeMotionBlurComputeParams(params2, frameDeltaSeconds = 1 / 60, reset = false) {
  const bytes = new Uint8Array(MOTION_BLUR_PARAMS_BYTE_SIZE);
  const view = new DataView(bytes.buffer);
  const uniformDeltaSeconds = Number.isFinite(frameDeltaSeconds) ? frameDeltaSeconds : 0;
  view.setFloat32(0, params2.shutterAngle, true);
  view.setFloat32(4, params2.maxRadiusPixels, true);
  view.setUint32(8, effectiveMotionBlurSampleCount(params2.sampleCount), true);
  view.setUint32(12, reset ? 1 : 0, true);
  view.setFloat32(16, params2.targetFps, true);
  view.setFloat32(20, motionBlurExposureScale(uniformDeltaSeconds, params2.targetFps), true);
  view.setFloat32(24, uniformDeltaSeconds, true);
  view.setUint32(28, 0, true);
  return bytes;
}
function positiveDimension(value) {
  return Number.isFinite(value) && value > 0 ? Math.ceil(value) : 1;
}
function planMotionBlur(params2, context, temporal = {
  frameDeltaSeconds: 1 / 60,
  reset: false
}) {
  if (!motionBlurTemporalDemand(params2)) return ok22({ resources: [], passes: [] });
  try {
    const sceneTemporal = context.sceneData.require(SCENE_DATA_TEMPORAL_V1_SCHEMA);
    const outputFormat = context.targets.find((target5) => target5.name === "motion-output")?.format ?? "rgba16float";
    const fullscreen = {
      kind: "fullscreen-program",
      name: "motion-blur",
      source: "forgeax::shader::motion-blur",
      reads: ["scene-color", "scene-temporal"],
      params: {
        byteSize: MOTION_BLUR_PARAMS_BYTE_SIZE,
        defaultValue: new Uint8Array(MOTION_BLUR_PARAMS_BYTE_SIZE)
      }
    };
    const computeCapable = context.caps.compute === true && context.caps.storageBuffer === true && context.caps.storageTexture === true && context.caps.rgba16floatRenderable === true && outputFormat === "rgba16float";
    if (computeCapable) {
      const width = positiveDimension(context.frame.width);
      const height = positiveDimension(context.frame.height);
      const tileWidth = Math.max(1, Math.ceil(width / 16));
      const tileHeight = Math.max(1, Math.ceil(height / 16));
      return ok22({
        resources: [
          {
            kind: "compute-program",
            name: "motion-blur-compute",
            program: {
              wgsl: MOTION_BLUR_COMPUTE_WGSL,
              entryPoints: ["tile_summary", "reconstruct"],
              bindings: [
                {
                  entries: [
                    {
                      binding: 0,
                      visibility: 4,
                      texture: { sampleType: "float", viewDimension: "2d" }
                    },
                    {
                      binding: 1,
                      visibility: 4,
                      texture: { sampleType: "float", viewDimension: "2d" }
                    },
                    { binding: 2, visibility: 4, buffer: { type: "storage" } },
                    {
                      binding: 3,
                      visibility: 4,
                      storageTexture: {
                        access: "write-only",
                        format: "rgba16float",
                        viewDimension: "2d"
                      }
                    },
                    { binding: 4, visibility: 4, buffer: { type: "uniform" } }
                  ]
                }
              ]
            }
          },
          {
            kind: "buffer",
            name: "motion-blur-tile-summary",
            size: tileWidth * tileHeight * 32,
            usage: ["storage"]
          },
          {
            kind: "buffer",
            name: "motion-blur-compute-params",
            size: MOTION_BLUR_PARAMS_BYTE_SIZE,
            usage: ["uniform"],
            data: encodeMotionBlurComputeParams(params2, temporal.frameDeltaSeconds, temporal.reset)
          },
          {
            kind: "prepared-gpu-resource",
            name: "motion-blur-input",
            resource: { kind: "texture-view", value: void 0 },
            logicalTarget: "motion-input"
          },
          {
            kind: "prepared-gpu-resource",
            name: "motion-blur-temporal",
            resource: { kind: "texture-view", value: void 0 },
            logicalTarget: sceneTemporal
          },
          {
            kind: "prepared-gpu-resource",
            name: "motion-blur-output",
            resource: { kind: "texture-view", value: void 0 },
            logicalTarget: "motion-output"
          },
          {
            kind: "compute-bindings",
            name: "motion-blur-compute-bindings",
            program: "motion-blur-compute",
            entries: [
              { binding: 0, resource: "motion-blur-input" },
              { binding: 1, resource: "motion-blur-temporal" },
              { binding: 2, resource: "motion-blur-tile-summary" },
              { binding: 3, resource: "motion-blur-output" },
              { binding: 4, resource: "motion-blur-compute-params" }
            ]
          }
        ],
        passes: [
          {
            kind: "compute",
            name: "motion-blur-tile-summary",
            program: "motion-blur-compute",
            bindings: "motion-blur-compute-bindings",
            dispatches: [
              {
                kind: "direct",
                entryPoint: "tile_summary",
                workgroups: [tileWidth, tileHeight, 1]
              }
            ]
          },
          {
            kind: "compute",
            // Keep the public post-process identity stable while the compute
            // lane adds its private tile-summary producer before it.
            name: "motion-blur",
            program: "motion-blur-compute",
            bindings: "motion-blur-compute-bindings",
            dispatches: [
              {
                kind: "direct",
                entryPoint: "reconstruct",
                workgroups: [
                  Math.max(1, Math.ceil(width / 8)),
                  Math.max(1, Math.ceil(height / 8)),
                  1
                ]
              }
            ]
          }
        ]
      });
    }
    return ok22({
      resources: [
        fullscreen,
        {
          kind: "graphics-program",
          name: "motion-blur-pipeline",
          program: {
            shader: MOTION_BLUR_FEATURE_IDENTITY,
            vertexLayout: "none",
            colorFormats: [outputFormat],
            sampleCount: 1
          }
        },
        {
          kind: "graphics-bindings",
          name: "motion-blur-bindings",
          program: "motion-blur-pipeline",
          values: {
            group: 1,
            fullscreen: true,
            shader: MOTION_BLUR_FEATURE_IDENTITY,
            input: "motion-input",
            temporal: sceneTemporal
          },
          logicalTargets: { input: "motion-input" }
        }
      ],
      passes: [
        {
          kind: "raster",
          name: "motion-blur",
          colorAttachments: [{ target: "motion-output", loadOp: "clear", storeOp: "store" }],
          sampledTargets: ["motion-input", sceneTemporal],
          draws: [
            {
              program: "motion-blur-pipeline",
              bindings: ["motion-blur-bindings"],
              vertexData: [],
              vertexLayout: "none",
              draw: { kind: "draw", vertexCount: 3, instanceCount: 1 }
            }
          ]
        }
      ]
    });
  } catch (cause) {
    return err6(cause);
  }
}
function createMotionBlurFeature() {
  return Object.freeze({
    identity: MOTION_BLUR_FEATURE_IDENTITY,
    shaderModuleMode: "immediate",
    extract: (context) => {
      const frames = /* @__PURE__ */ Object.create(null);
      for (const view of context.views) {
        if (!view.render) continue;
        const input = view.motionBlur;
        const validated = validateMotionBlurParams(input?.params);
        if (!validated.ok) return err6(validated.error);
        const params2 = input?.params === void 0 ? void 0 : validated.value;
        frames[view.identity] = {
          params: params2,
          demanded: motionBlurTemporalDemand(params2),
          frameDeltaSeconds: input?.frameDeltaSeconds ?? 1 / 60,
          reset: input?.reset === true
        };
      }
      return ok22(frames);
    },
    plan: (frames, context) => {
      const work = [];
      for (const view of context.views) {
        const frame = frames[view.identity];
        if (!view.render || frame?.params === void 0) continue;
        const planned = planMotionBlur(frame.params, { ...view, caps: context.caps }, frame);
        if (!planned.ok) return planned;
        work.push({ scope: { view: view.identity }, ...planned.value });
      }
      return ok22({ work });
    }
  });
}

// sdk/engine/node_modules/@forgeax/engine-render/src/features/outline/graph.ts
import { ok as ok23 } from "@forgeax/engine-types";
function params(_previous, frame) {
  const outline = frame.camera.outline;
  const values = new Float32Array(8);
  if (outline !== void 0) {
    values.set(outline.visibleColor, 0);
    values[3] = outline.width;
    values.set(outline.hiddenColor, 4);
    values[7] = outline.occlusion;
  }
  return new Uint8Array(values.buffer);
}
function addOutlinePasses(graph, input, depth2) {
  const make = (name) => createRenderPipelineTarget(graph, name, {
    format: "rgba16float",
    size: "surface"
  });
  const coverage = make("outline-coverage");
  if (!coverage.ok) return coverage;
  const selectedDepth = createRenderPipelineTarget(graph, "outline-depth", {
    format: "depth32float-stencil8",
    size: "surface"
  });
  if (!selectedDepth.ok) return selectedDepth;
  const selected = addTypedScenePass(graph, {
    name: "outline-selection",
    color: coverage.value,
    depth: selectedDepth.value,
    selector: COLOR_PASS_SELECTOR,
    passKind: "temporal",
    coverageOnly: true,
    clearColor: [0, 0, 0, 0],
    selectEntities: (frame) => ({
      worldId: frame.camera.worldId ?? 0,
      entities: frame.camera.outline?.entities ?? []
    })
  });
  if (!selected.ok) return selected;
  const packed2 = make("outline-selected-depth");
  if (!packed2.ok) return packed2;
  const packedPass = addTypedFullscreenPass(graph, {
    name: "outline-depth-copy",
    shader: "forgeax.outline.depth",
    input: coverage.value,
    outputs: [packed2.value],
    depth: selectedDepth.value,
    paramsTransform: params
  });
  if (!packedPass.ok) return packedPass;
  const mask = make("outline-mask");
  if (!mask.ok) return mask;
  const classified = addTypedFullscreenPass(graph, {
    name: "outline-classify",
    shader: depth2.sampleCount === 4 ? "forgeax.outline.classify.msaa" : "forgeax.outline.classify",
    input: packed2.value,
    outputs: [mask.value],
    depth: depth2,
    paramsTransform: params
  });
  if (!classified.ok) return classified;
  const horizontal2 = make("outline-expanded");
  if (!horizontal2.ok) return horizontal2;
  const expanded = addTypedFullscreenPass(graph, {
    name: "outline-horizontal",
    shader: "forgeax.outline.horizontal",
    input: mask.value,
    outputs: [horizontal2.value],
    paramsTransform: params
  });
  if (!expanded.ok) return expanded;
  const output = createRenderPipelineTarget(graph, "outline-color", {
    format: "rgba16float",
    size: "surface",
    domain: "linear-ldr"
  });
  if (!output.ok) return output;
  const composite3 = addTypedFullscreenPass(graph, {
    name: "outline-composite",
    shader: "forgeax.outline.composite",
    input,
    outputs: [output.value],
    additionalReads: [
      { key: "outline-mask", target: mask.value },
      { key: "outline-expanded", target: horizontal2.value }
    ],
    paramsTransform: params
  });
  return composite3.ok ? ok23(output.value) : composite3;
}

// sdk/engine/node_modules/@forgeax/engine-render/src/features/outline/shaders.ts
import { ok as ok24 } from "@forgeax/engine-types";
var vertex = (
  /* wgsl */
  `
struct Output { @builtin(position) position: vec4<f32>, @location(0) uv: vec2<f32> };
@vertex fn vs_main(@builtin(vertex_index) i: u32) -> Output {
  let p = vec2<f32>(f32((i << 1u) & 2u), f32(i & 2u));
  return Output(vec4<f32>(p * 2.0 - 1.0, 0.0, 1.0), vec2<f32>(p.x, 1.0 - p.y));
}
struct Params { visible: vec4<f32>, hidden: vec4<f32> };
@group(1) @binding(0) var source: texture_2d<f32>;
@group(1) @binding(1) var sourceSampler: sampler;
@group(1) @binding(2) var<uniform> params: Params;
`
);
var depth = "@group(1) @binding(3) var depth: texture_depth_2d;";
var packed = (
  /* wgsl */
  `${vertex}
${depth}
@fragment fn fs_main(in: Output) -> @location(0) vec4<f32> {
  let z = textureLoad(depth, vec2<i32>(in.position.xy), 0);
  // Integer bytes are exact in rgba16float, including distant subnormal depths.
  // The consumer uses textureLoad, so the raw float bits are never filtered.
  let bits = bitcast<u32>(z);
  return vec4<f32>(vec4<u32>(bits, bits >> 8u, bits >> 16u, bits >> 24u) & vec4<u32>(255u));
}`
);
function classify(msaa) {
  return (
    /* wgsl */
    `${vertex}
@group(1) @binding(3) var depth: ${msaa ? "texture_depth_multisampled_2d" : "texture_depth_2d"};
@fragment fn fs_main(in: Output) -> @location(0) vec4<f32> {
  let p = vec2<i32>(in.position.xy);
  let packed = vec4<u32>(textureLoad(source, p, 0));
  let selected = bitcast<f32>(packed.x | (packed.y << 8u) | (packed.z << 16u) | (packed.w << 24u));
  if (selected <= 0.0) { return vec4<f32>(0.0); }
  let q = min(vec2<i32>(in.uv * vec2<f32>(textureDimensions(depth))), vec2<i32>(textureDimensions(depth)) - vec2<i32>(1));
  var scene = textureLoad(depth, q, 0);
  ${msaa ? "for (var s = 1; s < 4; s++) { scene = max(scene, textureLoad(depth, q, s)); }" : ""}
  let visible = select(0.0, 1.0, selected >= scene - max(scene * 0.000002, 1e-12));
  return vec4<f32>(visible, 1.0 - visible, 1.0, 1.0);
}`
  );
}
var horizontal = (
  /* wgsl */
  `${vertex}
@fragment fn fs_main(in: Output) -> @location(0) vec4<f32> {
  let p = vec2<i32>(in.position.xy);
  let size = vec2<i32>(textureDimensions(source));
  var edge = vec2<f32>(0.0);
  for (var x = -i32(params.visible.w); x <= i32(params.visible.w); x++) {
    let q = p + vec2<i32>(x, 0);
    if (all(q >= vec2<i32>(0)) && all(q < size)) { edge = max(edge, textureLoad(source, q, 0).rg); }
  }
  return vec4<f32>(edge, 0.0, 1.0);
}`
);
var composite2 = (
  /* wgsl */
  `${vertex}
@group(1) @binding(3) var mask: texture_2d<f32>;
@group(1) @binding(4) var expanded: texture_2d<f32>;
@fragment fn fs_main(in: Output) -> @location(0) vec4<f32> {
  let p = vec2<i32>(in.position.xy);
  let size = vec2<i32>(textureDimensions(source));
  let color = textureLoad(source, p, 0);
  if (textureLoad(mask, p, 0).b > 0.5) { return color; }
  var edge = vec2<f32>(0.0);
  for (var y = -i32(params.visible.w); y <= i32(params.visible.w); y++) {
    let q = p + vec2<i32>(0, y);
    if (all(q >= vec2<i32>(0)) && all(q < size)) { edge = max(edge, textureLoad(expanded, q, 0).rg); }
  }
  if (edge.x > 0.5 && params.hidden.w != 1.0) { return vec4<f32>(params.visible.rgb, color.a); }
  if (edge.y > 0.5 && params.hidden.w != 0.0) { return vec4<f32>(params.hidden.rgb, color.a); }
  return color;
}`
);
var depthRead = { key: "scene-depth", sampleType: "depth" };
var OUTLINE_PROGRAMS = [
  {
    kind: "fullscreen-program",
    name: "forgeax.outline.depth",
    source: packed,
    reads: ["scene-color", depthRead]
  },
  {
    kind: "fullscreen-program",
    name: "forgeax.outline.classify",
    source: classify(false),
    reads: ["scene-color", depthRead]
  },
  {
    kind: "fullscreen-program",
    name: "forgeax.outline.classify.msaa",
    source: classify(true),
    reads: ["scene-color", depthRead]
  },
  {
    kind: "fullscreen-program",
    name: "forgeax.outline.horizontal",
    source: horizontal,
    reads: ["scene-color"]
  },
  {
    kind: "fullscreen-program",
    name: "forgeax.outline.composite",
    source: composite2,
    reads: ["scene-color", "outline-mask", "outline-expanded"]
  }
].map((program) => ({ ...program, params: { byteSize: 32, defaultValue: new Uint8Array(32) } }));
function createOutlineRenderFeature() {
  return {
    identity: "forgeax.outline",
    requiredCapabilities: ["rgba16floatRenderable"],
    requiredFullscreenPostProcesses: OUTLINE_PROGRAMS.map((program) => ({
      identity: program.name,
      source: program.source
    })),
    extract: (context) => ok24(context.views.some((view) => view.render && view.selectedCamera?.outline !== void 0)),
    plan: (active) => ok24({ work: active ? [{ scope: "frame", resources: OUTLINE_PROGRAMS, passes: [] }] : [] })
  };
}
function isOutlinePostProcess(identity) {
  return identity === "forgeax.outline" || OUTLINE_PROGRAMS.some((program) => program.name === identity);
}

// sdk/engine/node_modules/@forgeax/engine-render/src/features/smaa/graph.ts
import { ok as ok25 } from "@forgeax/engine-types";

// sdk/engine/node_modules/@forgeax/engine-render/src/features/smaa/lookup-data.ts
var area = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD8ACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD8ACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABmAD8AAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABmAD8AAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcgBcAC0AAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcgBcAC0AAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHgAagBIACIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHgAagBIACIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB6AHEAWQA6ABsAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB6AHEAWQA6ABsAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAfAB1AGMASgAwABYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAfAB1AGMASgAwABYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHwAeABqAFYAPwAoABMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHwAeABqAFYAPwAoABMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB9AHkAbgBeAEsANwAjABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB9AHkAbgBeAEsANwAjABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAfQB6AHIAZABUAEIAMAAfAA4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAfQB6AHIAZABUAEIAMAAfAA4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH4AewB0AGkAWwBLADsAKwAbAA0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH4AewB0AGkAWwBLADsAKwAbAA0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB+AHwAdgBtAGEAUwBEADUAJwAZAAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB+AHwAdgBtAGEAUwBEADUAJwAZAAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAfgB8AHcAbwBlAFkATAA+ADAAIwAWAAsAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAfgB8AHcAbwBlAFkATAA+ADAAIwAWAAsAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH4AfQB4AHEAaABeAFIARQA5ACwAIAAVAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH4AfQB4AHEAaABeAFIARQA5ACwAIAAVAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB+AH0AeQBzAGsAYgBXAEwAQAA0ACkAHgATAAkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB+AH0AeQBzAGsAYgBXAEwAQAA0ACkAHgATAAkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAfgB9AHoAdQBuAGUAWwBRAEYAOwAwACYAGwASAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAfgB9AHoAdQBuAGUAWwBRAEYAOwAwACYAGwASAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAfAD8AZgByAHgAegB8AHwAfQB9AH4AfgB+AH4AfgB+AD8APwBmAHIAeAB6AHwAfAB9AH0AfgB+AH4AfgB+AH4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB8fAD8AZgByAHgAegB8AHwAfQB9AH4AfgB+AH4AfgB+Hx8APwBmAHIAeAB6AHwAfAB9AH0AfgB+AH4AfgB+AH4AAAAKAD8AXABqAHEAdQB4AHkAegB7AHwAfAB9AH0AfQA/ABUAPwBcAGoAcQB1AHgAeQB6AHsAfAB8AH0AfQB9AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/AAoKAD8AXABqAHEAdQB4AHkAegB7AHwAfAB9AH0AfT8ACgoAPwBcAGoAcQB1AHgAeQB6AHsAfAB8AH0AfQB9AAAAAAADAC0ASABZAGMAagBuAHIAdAB2AHcAeAB5AHoAZgA/AAcALQBIAFkAYwBqAG4AcgB0AHYAdwB4AHkAegAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAZgA/AAMDAC0ASABZAGMAagBuAHIAdAB2AHcAeAB5AHpmAD8AAwMALQBIAFkAYwBqAG4AcgB0AHYAdwB4AHkAegAAAAAAAAABACIAOgBKAFYAXgBkAGkAbQBvAHEAcwB1AHIAXAAtAAMAIgA6AEoAVgBeAGQAaQBtAG8AcQBzAHUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHIAXAAtAAEBACIAOgBKAFYAXgBkAGkAbQBvAHEAcwB1cgBcAC0AAQEAIgA6AEoAVgBeAGQAaQBtAG8AcQBzAHUAAAAAAAAAAAAAABsAMAA/AEsAVABbAGEAZQBoAGsAbgB4AGoASAAiAAEAGwAwAD8ASwBUAFsAYQBlAGgAawBuAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB4AGoASAAiAAAAABsAMAA/AEsAVABbAGEAZQBoAGsAbngAagBIACIAAAAAGwAwAD8ASwBUAFsAYQBlAGgAawBuAAAAAAAAAAAAAAAAABYAKAA3AEIASwBTAFkAXgBiAGUAegBxAFkAOgAbAAEAFgAoADcAQgBLAFMAWQBeAGIAZQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAegBxAFkAOgAbAAAAABYAKAA3AEIASwBTAFkAXgBiAGV6AHEAWQA6ABsAAAAAFgAoADcAQgBLAFMAWQBeAGIAZQAAAAAAAAAAAAAAAAAAABMAIwAwADsARABMAFIAVwBbAHwAdQBjAEoAMAAWAAAAEwAjADAAOwBEAEwAUgBXAFsAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHwAdQBjAEoAMAAWAAAAABMAIwAwADsARABMAFIAVwBbfAB1AGMASgAwABYAAAAAEwAjADAAOwBEAEwAUgBXAFsAAAAAAAAAAAAAAAAAAAAAABAAHwArADUAPgBFAEwAUQB8AHgAagBWAD8AKAATAAAAEAAfACsANQA+AEUATABRAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB8AHgAagBWAD8AKAATAAAAABAAHwArADUAPgBFAEwAUXwAeABqAFYAPwAoABMAAAAAEAAfACsANQA+AEUATABRAAAAAAAAAAAAAAAAAAAAAAAAAA4AGwAnADAAOQBAAEYAfQB5AG4AXgBLADcAIwAQAAAADgAbACcAMAA5AEAARgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAfQB5AG4AXgBLADcAIwAQAAAAAA4AGwAnADAAOQBAAEZ9AHkAbgBeAEsANwAjABAAAAAADgAbACcAMAA5AEAARgAAAAAAAAAAAAAAAAAAAAAAAAAAAA0AGQAjACwANAA7AH0AegByAGQAVABCADAAHwAOAAAADQAZACMALAA0ADsAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH0AegByAGQAVABCADAAHwAOAAAAAA0AGQAjACwANAA7fQB6AHIAZABUAEIAMAAfAA4AAAAADQAZACMALAA0ADsAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAFgAgACkAMAB+AHsAdABpAFsASwA7ACsAGwANAAAADAAWACAAKQAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB+AHsAdABpAFsASwA7ACsAGwANAAAAAAwAFgAgACkAMH4AewB0AGkAWwBLADsAKwAbAA0AAAAADAAWACAAKQAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAsAFQAeACYAfgB8AHYAbQBhAFMARAA1ACcAGQAMAAAACwAVAB4AJgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAfgB8AHYAbQBhAFMARAA1ACcAGQAMAAAAAAsAFQAeACZ+AHwAdgBtAGEAUwBEADUAJwAZAAwAAAAACwAVAB4AJgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAEwAbAH4AfAB3AG8AZQBZAEwAPgAwACMAFgALAAAACgATABsAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH4AfAB3AG8AZQBZAEwAPgAwACMAFgALAAAAAAoAEwAbfgB8AHcAbwBlAFkATAA+ADAAIwAWAAsAAAAACgATABsAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAkAEgB+AH0AeABxAGgAXgBSAEUAOQAsACAAFQAKAAAACQASAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB+AH0AeABxAGgAXgBSAEUAOQAsACAAFQAKAAAAAAkAEn4AfQB4AHEAaABeAFIARQA5ACwAIAAVAAoAAAAACQASAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAfgB9AHkAcwBrAGIAVwBMAEAANAApAB4AEwAJAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAfgB9AHkAcwBrAGIAVwBMAEAANAApAB4AEwAJAAAAAAh+AH0AeQBzAGsAYgBXAEwAQAA0ACkAHgATAAkAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH4AfQB6AHUAbgBlAFsAUQBGADsAMAAmABsAEgAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH4AfQB6AHUAbgBlAFsAUQBGADsAMAAmABsAEgAIAAAAfgB9AHoAdQBuAGUAWwBRAEYAOwAwACYAGwASAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHwA/AGYAcgB4AHoAfAB8AH0AfQB+AH4AfgB+AH4AfgAfHz8AZgByAHgAegB8AHwAfQB9AH4AfgB+AH4AfgB+AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPwA/AGYAcgB4AHoAfAB8AH0AfQB+AH4AfgB+AH4AfgAfHz8AZgByAHgAegB8AHwAfQB9AH4AfgB+AH4AfgB+AAAACgA/AFwAagBxAHUAeAB5AHoAewB8AHwAfQB9AH0AAD8KCj8AXABqAHEAdQB4AHkAegB7AHwAfAB9AH0AfQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD8AFQA/AFwAagBxAHUAeAB5AHoAewB8AHwAfQB9AH0AAD8KCj8AXABqAHEAdQB4AHkAegB7AHwAfAB9AH0AfQAAAAAAAwAtAEgAWQBjAGoAbgByAHQAdgB3AHgAeQB6AABmAD8DAy0ASABZAGMAagBuAHIAdAB2AHcAeAB5AHoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABmAD8ABwAtAEgAWQBjAGoAbgByAHQAdgB3AHgAeQB6AABmAD8DAy0ASABZAGMAagBuAHIAdAB2AHcAeAB5AHoAAAAAAAAAAQAiADoASgBWAF4AZABpAG0AbwBxAHMAdQAAcgBcAC0BASIAOgBKAFYAXgBkAGkAbQBvAHEAcwB1AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcgBcAC0AAwAiADoASgBWAF4AZABpAG0AbwBxAHMAdQAAcgBcAC0BASIAOgBKAFYAXgBkAGkAbQBvAHEAcwB1AAAAAAAAAAAAAAAbADAAPwBLAFQAWwBhAGUAaABrAG4AAHgAagBIACIAABsAMAA/AEsAVABbAGEAZQBoAGsAbgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHgAagBIACIAAQAbADAAPwBLAFQAWwBhAGUAaABrAG4AAHgAagBIACIAABsAMAA/AEsAVABbAGEAZQBoAGsAbgAAAAAAAAAAAAAAAAAWACgANwBCAEsAUwBZAF4AYgBlAAB6AHEAWQA6ABsAABYAKAA3AEIASwBTAFkAXgBiAGUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB6AHEAWQA6ABsAAQAWACgANwBCAEsAUwBZAF4AYgBlAAB6AHEAWQA6ABsAABYAKAA3AEIASwBTAFkAXgBiAGUAAAAAAAAAAAAAAAAAAAATACMAMAA7AEQATABSAFcAWwAAfAB1AGMASgAwABYAABMAIwAwADsARABMAFIAVwBbAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAfAB1AGMASgAwABYAAAATACMAMAA7AEQATABSAFcAWwAAfAB1AGMASgAwABYAABMAIwAwADsARABMAFIAVwBbAAAAAAAAAAAAAAAAAAAAAAAQAB8AKwA1AD4ARQBMAFEAAHwAeABqAFYAPwAoABMAABAAHwArADUAPgBFAEwAUQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHwAeABqAFYAPwAoABMAAAAQAB8AKwA1AD4ARQBMAFEAAHwAeABqAFYAPwAoABMAABAAHwArADUAPgBFAEwAUQAAAAAAAAAAAAAAAAAAAAAAAAAOABsAJwAwADkAQABGAAB9AHkAbgBeAEsANwAjABAAAA4AGwAnADAAOQBAAEYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB9AHkAbgBeAEsANwAjABAAAAAOABsAJwAwADkAQABGAAB9AHkAbgBeAEsANwAjABAAAA4AGwAnADAAOQBAAEYAAAAAAAAAAAAAAAAAAAAAAAAAAAANABkAIwAsADQAOwAAfQB6AHIAZABUAEIAMAAfAA4AAA0AGQAjACwANAA7AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAfQB6AHIAZABUAEIAMAAfAA4AAAANABkAIwAsADQAOwAAfQB6AHIAZABUAEIAMAAfAA4AAA0AGQAjACwANAA7AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMABYAIAApADAAAH4AewB0AGkAWwBLADsAKwAbAA0AAAwAFgAgACkAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH4AewB0AGkAWwBLADsAKwAbAA0AAAAMABYAIAApADAAAH4AewB0AGkAWwBLADsAKwAbAA0AAAwAFgAgACkAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAALABUAHgAmAAB+AHwAdgBtAGEAUwBEADUAJwAZAAwAAAsAFQAeACYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB+AHwAdgBtAGEAUwBEADUAJwAZAAwAAAALABUAHgAmAAB+AHwAdgBtAGEAUwBEADUAJwAZAAwAAAsAFQAeACYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKABMAGwAAfgB8AHcAbwBlAFkATAA+ADAAIwAWAAsAAAoAEwAbAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAfgB8AHcAbwBlAFkATAA+ADAAIwAWAAsAAAAKABMAGwAAfgB8AHcAbwBlAFkATAA+ADAAIwAWAAsAAAoAEwAbAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJABIAAH4AfQB4AHEAaABeAFIARQA5ACwAIAAVAAoAAAkAEgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH4AfQB4AHEAaABeAFIARQA5ACwAIAAVAAoAAAAJABIAAH4AfQB4AHEAaABeAFIARQA5ACwAIAAVAAoAAAkAEgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAB+AH0AeQBzAGsAYgBXAEwAQAA0ACkAHgATAAkAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB+AH0AeQBzAGsAYgBXAEwAQAA0ACkAHgATAAkAAAAIAAB+AH0AeQBzAGsAYgBXAEwAQAA0ACkAHgATAAkAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAfgB9AHoAdQBuAGUAWwBRAEYAOwAwACYAGwASAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAfgB9AHoAdQBuAGUAWwBRAEYAOwAwACYAGwASAAgAAAAAfgB9AHoAdQBuAGUAWwBRAEYAOwAwACYAGwASAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHx8/AGYAcgB4AHoAfAB8AH0AfQB+AH4AfgB+AH4AfgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB8fAD8AZgByAHgAegB8AHwAfQB9AH4AfgB+AH4AfgB+AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/Cgo/AFwAagBxAHUAeAB5AHoAewB8AHwAfQB9AH0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/AAoKAD8AXABqAHEAdQB4AHkAegB7AHwAfAB9AH0AfQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAZgA/AwMtAEgAWQBjAGoAbgByAHQAdgB3AHgAeQB6AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAZgA/AAMDAC0ASABZAGMAagBuAHIAdAB2AHcAeAB5AHoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHIAXAAtAQEiADoASgBWAF4AZABpAG0AbwBxAHMAdQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHIAXAAtAAEBACIAOgBKAFYAXgBkAGkAbQBvAHEAcwB1AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB4AGoASAAiAAAbADAAPwBLAFQAWwBhAGUAaABrAG4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB4AGoASAAiAAAAABsAMAA/AEsAVABbAGEAZQBoAGsAbgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAegBxAFkAOgAbAAAWACgANwBCAEsAUwBZAF4AYgBlAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAegBxAFkAOgAbAAAAABYAKAA3AEIASwBTAFkAXgBiAGUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHwAdQBjAEoAMAAWAAATACMAMAA7AEQATABSAFcAWwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHwAdQBjAEoAMAAWAAAAABMAIwAwADsARABMAFIAVwBbAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB8AHgAagBWAD8AKAATAAAQAB8AKwA1AD4ARQBMAFEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB8AHgAagBWAD8AKAATAAAAABAAHwArADUAPgBFAEwAUQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAfQB5AG4AXgBLADcAIwAQAAAOABsAJwAwADkAQABGAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAfQB5AG4AXgBLADcAIwAQAAAAAA4AGwAnADAAOQBAAEYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH0AegByAGQAVABCADAAHwAOAAANABkAIwAsADQAOwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH0AegByAGQAVABCADAAHwAOAAAAAA0AGQAjACwANAA7AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB+AHsAdABpAFsASwA7ACsAGwANAAAMABYAIAApADAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB+AHsAdABpAFsASwA7ACsAGwANAAAAAAwAFgAgACkAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAfgB8AHYAbQBhAFMARAA1ACcAGQAMAAALABUAHgAmAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAfgB8AHYAbQBhAFMARAA1ACcAGQAMAAAAAAsAFQAeACYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH4AfAB3AG8AZQBZAEwAPgAwACMAFgALAAAKABMAGwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH4AfAB3AG8AZQBZAEwAPgAwACMAFgALAAAAAAoAEwAbAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB+AH0AeABxAGgAXgBSAEUAOQAsACAAFQAKAAAJABIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB+AH0AeABxAGgAXgBSAEUAOQAsACAAFQAKAAAAAAkAEgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAfgB9AHkAcwBrAGIAVwBMAEAANAApAB4AEwAJAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAfgB9AHkAcwBrAGIAVwBMAEAANAApAB4AEwAJAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH4AfQB6AHUAbgBlAFsAUQBGADsAMAAmABsAEgAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH4AfQB6AHUAbgBlAFsAUQBGADsAMAAmABsAEgAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
var search = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQEAAQEAAAEBAAEBAAAAAAAAAAAAAQEAAQEAAAEBAAEBAQEAAAAAAAEBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQEAAQEAAAEBAAEBAAAAAAAAAAAAAQEAAQEAAAEBAAEBAQEAAAAAAAEBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQEAAQEAAAEBAAEBAAAAAAAAAAAAAQEAAQEAAAEBAAEBAQEAAAAAAAEBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQEAAQEAAAEBAAEBAAAAAAAAAAAAAQEAAQEAAAEBAAEBAQEAAAAAAAEBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgIAAQEAAAICAAEBAAAAAAAAAAAAAQEAAQEAAAEBAAEBAgEAAAAAAAEBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgIAAQEAAAICAAEBAAAAAAAAAAAAAQEAAQEAAAEBAAEBAgEAAAAAAAEBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgIAAQEAAAICAAEBAAAAAAAAAAAAAQEAAQEAAAEBAAEBAgEAAAAAAAEBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgIAAQEAAAICAAEBAAAAAAAAAAAAAQEAAQEAAAEBAAEBAgEAAAAAAAEBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
function smaaLookupData() {
  const decode = (value) => Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
  return { area: decode(area), search: decode(search) };
}

// sdk/engine/node_modules/@forgeax/engine-render/src/features/smaa/graph.ts
function addSmaaPasses(graph, input) {
  const area2 = createRenderPipelineTarget(graph, "smaa-area", {
    format: "rg8unorm",
    size: { width: 80, height: 80 }
  });
  if (!area2.ok) return area2;
  const search2 = createRenderPipelineTarget(graph, "smaa-search", {
    format: "r8unorm",
    size: { width: 66, height: 33 }
  });
  if (!search2.ok) return search2;
  const data = smaaLookupData();
  for (const lookup of [
    { target: area2.value, bytes: data.area, width: 80, height: 80, stride: 160 },
    { target: search2.value, bytes: data.search, width: 66, height: 33, stride: 66 }
  ]) {
    let initialized;
    const upload = graph.addCopyPass(
      `${lookup.target === area2.value ? "smaa-area" : "smaa-search"}-upload`,
      {
        accesses: [{ resource: lookup.target.view, usage: "copy-dst" }],
        encode: ({ frame, resources }) => {
          const texture = resources.texture(lookup.target.texture).unwrap();
          if (texture === initialized) return;
          frame.runtime.device.queue.writeTexture(
            { texture },
            lookup.bytes,
            { bytesPerRow: lookup.stride, rowsPerImage: lookup.height },
            { width: lookup.width, height: lookup.height, depthOrArrayLayers: 1 }
          ).unwrap();
          initialized = texture;
        }
      }
    );
    if (!upload.ok) return upload;
  }
  const edges2 = createRenderPipelineTarget(graph, "smaa-edges", {
    format: "rg8unorm",
    size: "surface"
  });
  if (!edges2.ok) return edges2;
  const weights2 = createRenderPipelineTarget(graph, "smaa-weights", {
    format: "rgba8unorm",
    size: "surface"
  });
  if (!weights2.ok) return weights2;
  const output = createRenderPipelineTarget(graph, "smaa-color", {
    format: "rgba16float",
    size: "surface",
    domain: "linear-ldr"
  });
  if (!output.ok) return output;
  const detected = addTypedFullscreenPass(graph, {
    name: "smaa-edges",
    shader: "forgeax.smaa.edges",
    clearColor: [0, 0, 0, 0],
    input,
    outputs: [edges2.value]
  });
  if (!detected.ok) return detected;
  const calculated = addTypedFullscreenPass(graph, {
    name: "smaa-weights",
    shader: "forgeax.smaa.weights",
    clearColor: [0, 0, 0, 0],
    input: edges2.value,
    outputs: [weights2.value],
    additionalReads: [
      { key: "smaa-area", target: area2.value },
      { key: "smaa-search", target: search2.value }
    ]
  });
  if (!calculated.ok) return calculated;
  const blended = addTypedFullscreenPass(graph, {
    name: "smaa-blend",
    shader: "forgeax.smaa.blend",
    input,
    outputs: [output.value],
    additionalReads: [{ key: "smaa-weights", target: weights2.value }]
  });
  return blended.ok ? ok25(output.value) : blended;
}

// sdk/engine/node_modules/@forgeax/engine-render/src/features/smaa/shaders.ts
import { ok as ok26 } from "@forgeax/engine-types";
var vertex2 = (
  /* wgsl */
  `
struct Output { @builtin(position) position: vec4<f32>, @location(0) uv: vec2<f32> };
@vertex fn vs_main(@builtin(vertex_index) i: u32) -> Output {
  let p = vec2<f32>(f32((i << 1u) & 2u), f32(i & 2u));
  return Output(vec4<f32>(p * 2.0 - 1.0, 0.0, 1.0), vec2<f32>(p.x, 1.0 - p.y));
}
@group(1) @binding(0) var source: texture_2d<f32>;
@group(1) @binding(1) var sourceSampler: sampler;
`
);
var edges = (
  /* wgsl */
  `${vertex2}
fn color(p: vec2<i32>) -> vec3<f32> {
  return textureLoad(source, clamp(p, vec2<i32>(0), vec2<i32>(textureDimensions(source)) - 1), 0).rgb;
}
fn delta(a: vec3<f32>, b: vec3<f32>) -> f32 {
  let d = abs(a - b);
  return max(max(d.r, d.g), d.b);
}
@fragment fn fs_main(in: Output) -> @location(0) vec4<f32> {
  let p = vec2<i32>(in.position.xy);
  let c = color(p);
  let d = vec2<f32>(delta(c, color(p + vec2<i32>(-1, 0))), delta(c, color(p + vec2<i32>(0, -1))));
  var edge = step(vec2<f32>(0.1), d);
  if (dot(edge, vec2<f32>(1.0)) == 0.0) { return vec4<f32>(0.0); }
  let opposite = vec2<f32>(delta(c, color(p + vec2<i32>(1, 0))), delta(c, color(p + vec2<i32>(0, 1))));
  let distant = vec2<f32>(delta(c, color(p + vec2<i32>(-2, 0))), delta(c, color(p + vec2<i32>(0, -2))));
  let contrast = max(max(d, opposite), distant);
  edge *= step(vec2<f32>(0.5 * max(contrast.x, contrast.y)), d);
  return vec4<f32>(edge, 0.0, 0.0);
}`
);
var weights = (
  /* wgsl */
  `${vertex2}
@group(1) @binding(2) var areaTexture: texture_2d<f32>;
@group(1) @binding(3) var searchTexture: texture_2d<f32>;
fn edge(uv: vec2<f32>) -> vec2<f32> {
  return textureSampleLevel(source, sourceSampler, uv, 0.0).rg;
}
fn searchLength(e: vec2<f32>, positive: bool) -> f32 {
  let uv = vec2<f32>(select(0.0, 0.5, positive) + 0.5 * e.x, e.y);
  let size = vec2<i32>(textureDimensions(searchTexture));
  let p = clamp(vec2<i32>(uv * vec2<f32>(size)), vec2<i32>(0), size - 1);
  return 255.0 * textureLoad(searchTexture, p, 0).r;
}
// Both axes share the same pseudo-gather search; swizzling selects the crossing edge.
fn search(start: vec2<f32>, vertical: bool, positive: bool, pixel: vec2<f32>) -> f32 {
  let axis = select(vec2<f32>(1.0, 0.0), vec2<f32>(0.0, 1.0), vertical);
  let direction = select(-1.0, 1.0, positive);
  var uv = start;
  var e = vec2<f32>(0.0, 1.0);
  for (var i = 0; i < 8; i++) {
    let sampled = edge(uv);
    e = select(sampled, sampled.gr, vertical);
    uv += 2.0 * direction * axis * pixel;
    if (e.y <= 0.8281 || e.x != 0.0) { break; }
  }
  let coordinate = select(uv.x, uv.y, vertical);
  let stepSize = select(pixel.x, pixel.y, vertical);
  return coordinate + direction * stepSize * (searchLength(e, positive) - 3.25);
}
fn area(distance: vec2<f32>, crossing: vec2<f32>) -> vec2<f32> {
  // Only the 80x80 orthogonal, zero-subsample tile is needed for 1x Medium.
  let p = 16.0 * floor(4.0 * crossing + 0.5) + sqrt(abs(distance));
  return textureSampleLevel(areaTexture, sourceSampler, (p + 0.5) / 80.0, 0.0).rg;
}
@fragment fn fs_main(in: Output) -> @location(0) vec4<f32> {
  let pixel = 1.0 / vec2<f32>(textureDimensions(source));
  let uv = in.uv;
  let e = edge(uv);
  var result = vec4<f32>(0.0);
  if (e.g > 0.0) {
    let left = search(uv + pixel * vec2<f32>(-0.25, -0.125), false, false, pixel);
    let right = search(uv + pixel * vec2<f32>(1.25, -0.125), false, true, pixel);
    let y = uv.y - 0.25 * pixel.y;
    let crossing = vec2<f32>(edge(vec2<f32>(left, y)).r, edge(vec2<f32>(right + pixel.x, y)).r);
    let a = area((vec2<f32>(left, right) - uv.x) / pixel.x, crossing);
    result.r = a.x;
    result.g = a.y;
  }
  if (e.r > 0.0) {
    let top = search(uv + pixel * vec2<f32>(-0.125, -0.25), true, false, pixel);
    let bottom = search(uv + pixel * vec2<f32>(-0.125, 1.25), true, true, pixel);
    let x = uv.x - 0.25 * pixel.x;
    let crossing = vec2<f32>(edge(vec2<f32>(x, top)).g, edge(vec2<f32>(x, bottom + pixel.y)).g);
    let a = area((vec2<f32>(top, bottom) - uv.y) / pixel.y, crossing);
    result.b = a.x;
    result.a = a.y;
  }
  return result;
}`
);
var blend = (
  /* wgsl */
  `${vertex2}
@group(1) @binding(2) var blendTexture: texture_2d<f32>;
fn weight(p: vec2<i32>) -> vec4<f32> {
  return textureLoad(blendTexture, clamp(p, vec2<i32>(0), vec2<i32>(textureDimensions(blendTexture)) - 1), 0);
}
@fragment fn fs_main(in: Output) -> @location(0) vec4<f32> {
  let p = vec2<i32>(in.position.xy);
  let current = weight(p);
  let a = vec4<f32>(current.r, weight(p + vec2<i32>(0, 1)).g, current.b, weight(p + vec2<i32>(1, 0)).a);
  let color = textureLoad(source, p, 0);
  if (dot(a, vec4<f32>(1.0)) < 0.00001) { return color; }
  var offset = vec2<f32>(select(-a.b, a.a, a.a > a.b), select(-a.r, a.g, a.g > a.r));
  if (abs(offset.x) > abs(offset.y)) { offset.y = 0.0; } else { offset.x = 0.0; }
  let q = clamp(p + vec2<i32>(sign(offset)), vec2<i32>(0), vec2<i32>(textureDimensions(source)) - 1);
  // Standard supplies linear LDR; preserve that domain, including alpha, until its one OETF.
  return mix(color, textureLoad(source, q, 0), max(abs(offset.x), abs(offset.y)));
}`
);
var SMAA_PROGRAMS = [
  { kind: "fullscreen-program", name: "forgeax.smaa.edges", source: edges, reads: ["scene-color"] },
  {
    kind: "fullscreen-program",
    name: "forgeax.smaa.weights",
    source: weights,
    reads: ["smaa-edges", "smaa-area", "smaa-search"]
  },
  {
    kind: "fullscreen-program",
    name: "forgeax.smaa.blend",
    source: blend,
    reads: ["scene-color", "smaa-weights"]
  }
];
function createSmaaRenderFeature() {
  return {
    identity: "forgeax.smaa",
    requiredCapabilities: ["rgba16floatRenderable"],
    requiredFullscreenPostProcesses: SMAA_PROGRAMS.map((program) => ({
      identity: program.name,
      source: program.source
    })),
    extract: (context) => ok26(
      context.views.filter((view) => view.render && view.selectedCamera?.antialias === "smaa").map((view) => view.identity)
    ),
    plan: (views) => ok26({
      work: views.map((view) => ({ scope: { view }, resources: SMAA_PROGRAMS, passes: [] }))
    })
  };
}
function isSmaaPostProcess(identity) {
  return identity === "forgeax.smaa" || SMAA_PROGRAMS.some((program) => program.name === identity);
}

// sdk/engine/node_modules/@forgeax/engine-render/src/pipeline/standard-output/auto-exposure/gpu.ts
import { AUTO_EXPOSURE_METER_WGSL } from "@forgeax/engine-shader";
import { err as err8, ok as ok29 } from "@forgeax/engine-types";

// sdk/engine/node_modules/@forgeax/engine-render/src/pipeline/standard-output/color-transform.ts
import { halfFloat } from "@forgeax/engine-math";
import { ok as ok27 } from "@forgeax/engine-types";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";
var LINEAR_HDR_DOMAIN = "linear-hdr";
var LINEAR_LDR_DOMAIN = "linear-ldr";
var DISPLAY_ENCODED_DOMAIN = "display-encoded";
var COLOR_STAGE_PRELUDE_WGSL = (
  /* wgsl */
  `
struct VertexOutput { @builtin(position) position: vec4<f32>, @location(0) uv: vec2<f32> };
@vertex fn color_stage_vs(@builtin(vertex_index) index: u32) -> VertexOutput {
  var positions = array<vec2<f32>, 3>(vec2<f32>(-1.0, -3.0), vec2<f32>(3.0, 1.0), vec2<f32>(-1.0, 1.0));
  let p = positions[index];
  return VertexOutput(vec4<f32>(p, 0.0, 1.0), vec2<f32>(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5));
}
@group(0) @binding(0) var source: texture_2d<f32>;
@group(0) @binding(1) var sourceSampler: sampler;
`
);
var colorStagePrograms = /* @__PURE__ */ new WeakMap();
var MAX_COLOR_STAGE_PROGRAMS = 16;
function programsFor3(scope) {
  let programs2 = colorStagePrograms.get(scope);
  if (programs2 === void 0) {
    programs2 = [];
    colorStagePrograms.set(scope, programs2);
    const owned = programs2;
    scope._adopt("post-effect", programs2, () => {
      colorStagePrograms.delete(scope);
      owned.length = 0;
    });
  }
  return programs2;
}
function addStandardColorStagePass(graph, name, input, output, fragmentWgsl, stage) {
  const code = COLOR_STAGE_PRELUDE_WGSL + fragmentWgsl;
  let moduleLabel;
  let unscopedPrograms;
  const added = graph.addRasterPass(name, {
    accesses: [
      { resource: input.view, usage: "sampled-read" },
      ...stage?.accesses ?? [],
      { resource: output.view, usage: "color-attachment" }
    ],
    colorAttachments: [
      {
        view: output.view,
        loadOp: "clear",
        storeOp: "store",
        clearValue: { r: 0, g: 0, b: 0, a: 1 }
      }
    ],
    encode: ({ pass, frame, resources }) => {
      const runtime = frame.runtime;
      const device = runtime.device;
      const scope = runtime.deviceScope;
      const factory = runtime.immediateShaderModuleFactory ?? runtime.shaderModuleFactory;
      if (factory === void 0) throw new Error(`${name} shader factory unavailable`);
      const stageBinding = stage?.bind(device, resources, frame);
      if (scope === void 0) unscopedPrograms ??= [];
      const programs2 = scope === void 0 ? unscopedPrograms : scope.isAlive() ? programsFor3(scope) : void 0;
      moduleLabel ??= programs2?.find((entry) => entry.name === name && entry.code === code)?.moduleLabel ?? `${name}-sha256:${bytesToHex(sha256(utf8ToBytes(code)))}`;
      const source = factory.createShaderModule({ code, label: moduleLabel });
      if (!source.ok) throw source.error;
      let program = programs2?.find(
        (entry) => entry.device === device && entry.factory === factory && entry.createModule === factory.createShaderModule && entry.name === name && entry.code === code && entry.module === source.value && entry.format === output.format && entry.sampleCount === output.sampleCount && entry.stageLayout === stageBinding?.layout
      );
      if (program === void 0) {
        const createdLayout = device.createBindGroupLayout({
          label: `${name}.bgl`,
          entries: [
            { binding: 0, visibility: 2, texture: { sampleType: "float", viewDimension: "2d" } },
            { binding: 1, visibility: 2, sampler: { type: "filtering" } }
          ]
        });
        if (!createdLayout.ok) throw createdLayout.error;
        const layout = createdLayout.value;
        const createdSampler = device.createSampler({ minFilter: "linear", magFilter: "linear" });
        if (!createdSampler.ok) throw createdSampler.error;
        const pipelineLayout2 = device.createPipelineLayout({
          label: `${name}.layout`,
          bindGroupLayouts: stageBinding === void 0 ? [layout] : [layout, stageBinding.layout]
        });
        if (!pipelineLayout2.ok) throw pipelineLayout2.error;
        const created = device.createRenderPipeline({
          label: name,
          layout: pipelineLayout2.value,
          vertex: { module: source.value, entryPoint: "color_stage_vs", buffers: [] },
          fragment: {
            module: source.value,
            entryPoint: "color_stage_fs",
            targets: [{ format: output.format }]
          },
          primitive: { topology: "triangle-list" }
        });
        if (!created.ok) throw created.error;
        program = {
          device,
          factory,
          createModule: factory.createShaderModule,
          name,
          code,
          module: source.value,
          moduleLabel,
          format: output.format,
          sampleCount: output.sampleCount,
          stageLayout: stageBinding?.layout,
          layout,
          sampler: createdSampler.value,
          pipeline: created.value
        };
        if (programs2 !== void 0 && (scope === void 0 || scope.isAlive())) {
          if (programs2.length === MAX_COLOR_STAGE_PROGRAMS) programs2.shift();
          programs2.push(program);
        }
      }
      const inputView = resources.textureView(input.view);
      if (!inputView.ok) throw inputView.error;
      const bindings = device.createBindGroup({
        layout: program.layout,
        entries: [
          { binding: 0, resource: { kind: "textureView", value: inputView.value } },
          { binding: 1, resource: { kind: "sampler", value: program.sampler } }
        ]
      });
      if (!bindings.ok) throw bindings.error;
      pass.setPipeline(program.pipeline);
      pass.setBindGroup(0, bindings.value);
      if (stageBinding !== void 0) pass.setBindGroup(1, stageBinding.bindGroup);
      pass.draw(3, 1, 0, 0);
    }
  });
  return added.ok ? ok27(void 0) : added;
}

// sdk/engine/node_modules/@forgeax/engine-render/src/pipeline/standard-output/auto-exposure/graph.ts
import { err as err7, ok as ok28 } from "@forgeax/engine-types";
var AUTO_EXPOSURE_FUSED_GRAPH_PASS = "auto-exposure-meter";
var AUTO_EXPOSURE_HISTOGRAM_DISPATCH = Object.freeze({
  x: 4,
  y: 8,
  z: 1
});
function resolveAutoExposureShaderModuleFactory(runtime) {
  return runtime.immediateShaderModuleFactory ?? runtime.shaderModuleFactory;
}

// sdk/engine/node_modules/@forgeax/engine-render/src/pipeline/standard-output/auto-exposure/gpu.ts
var AUTO_EXPOSURE_HISTOGRAM_BYTES = 1024;
var AUTO_EXPOSURE_STATE_BYTES = 32;
var AUTO_EXPOSURE_CANDIDATE_BYTES = 16;
var AUTO_EXPOSURE_PARAMETERS_BYTES = 32;
var COMPUTE_VISIBILITY = 4;
function createBuffer(device, label, size, usage = GPU_BUFFER_USAGE_STORAGE) {
  return device.createBuffer({
    label,
    size,
    usage,
    mappedAtCreation: false
  });
}
function createAutoExposureGpuResources(device, generation) {
  if (!device.caps.compute) {
    return err8(new AutoExposureCapabilityUnavailableError({ capability: "compute", generation }));
  }
  if (!device.caps.storageBuffer) {
    return err8(
      new AutoExposureCapabilityUnavailableError({ capability: "storage-buffer", generation })
    );
  }
  const histogram = createBuffer(
    device,
    "standard-auto-exposure-histogram",
    AUTO_EXPOSURE_HISTOGRAM_BYTES
  );
  if (!histogram.ok) return histogram;
  const state = createBuffer(
    device,
    "standard-auto-exposure-state",
    AUTO_EXPOSURE_STATE_BYTES,
    GPU_BUFFER_USAGE_STORAGE | GPU_BUFFER_USAGE_COPY_DST
  );
  if (!state.ok) {
    device.destroyBuffer(histogram.value);
    return state;
  }
  const initialized = device.queue.writeBuffer(
    state.value,
    0,
    new Uint8Array(AUTO_EXPOSURE_STATE_BYTES)
  );
  if (!initialized.ok) {
    device.destroyBuffer(histogram.value);
    device.destroyBuffer(state.value);
    return initialized;
  }
  const candidate = createBuffer(
    device,
    "standard-auto-exposure-candidate",
    AUTO_EXPOSURE_CANDIDATE_BYTES
  );
  if (!candidate.ok) {
    device.destroyBuffer(histogram.value);
    device.destroyBuffer(state.value);
    return candidate;
  }
  const parameters2 = createBuffer(
    device,
    "standard-auto-exposure-parameters",
    AUTO_EXPOSURE_PARAMETERS_BYTES,
    GPU_BUFFER_USAGE_STORAGE | GPU_BUFFER_USAGE_COPY_DST
  );
  if (!parameters2.ok) {
    device.destroyBuffer(histogram.value);
    device.destroyBuffer(state.value);
    device.destroyBuffer(candidate.value);
    return parameters2;
  }
  return ok29({
    histogram: histogram.value,
    state: state.value,
    candidate: candidate.value,
    parameters: parameters2.value,
    device,
    generation
  });
}
function writeAutoExposureParameters(resources, parameters2) {
  const values = new Float32Array([
    parameters2.compensationEv,
    parameters2.rangeMinEv,
    parameters2.rangeMaxEv,
    parameters2.upRate,
    parameters2.downRate,
    parameters2.deltaTime,
    parameters2.fallback,
    parameters2.generation
  ]);
  return resources.device.queue.writeBuffer(resources.parameters, 0, values);
}
function retireAutoExposureGpuResources(resources) {
  resources.device.destroyBuffer(resources.histogram);
  resources.device.destroyBuffer(resources.state);
  resources.device.destroyBuffer(resources.candidate);
  resources.device.destroyBuffer(resources.parameters);
}
function importAutoExposureGraphResources(graph) {
  const resolve = (frame) => {
    const state2 = frame.frameState;
    const resources = state2.pendingAutoExposureGpuResources ?? state2.autoExposureGpuResources;
    if (resources === void 0) throw new Error("auto-exposure GPU resources were not prepared");
    return resources;
  };
  const histogram = graph.importBuffer(
    "standard-auto-exposure-histogram",
    {
      size: AUTO_EXPOSURE_HISTOGRAM_BYTES,
      usage: GPU_BUFFER_USAGE_STORAGE
    },
    (frame) => resolve(frame).histogram
  );
  if (!histogram.ok) return histogram;
  const state = graph.importBuffer(
    "standard-auto-exposure-state",
    {
      size: AUTO_EXPOSURE_STATE_BYTES,
      usage: GPU_BUFFER_USAGE_STORAGE
    },
    (frame) => resolve(frame).state
  );
  if (!state.ok) return state;
  const candidate = graph.importBuffer(
    "standard-auto-exposure-candidate",
    {
      size: AUTO_EXPOSURE_CANDIDATE_BYTES,
      usage: GPU_BUFFER_USAGE_STORAGE
    },
    (frame) => resolve(frame).candidate
  );
  if (!candidate.ok) return candidate;
  const parameters2 = graph.importBuffer(
    "standard-auto-exposure-parameters",
    {
      size: AUTO_EXPOSURE_PARAMETERS_BYTES,
      usage: GPU_BUFFER_USAGE_STORAGE | GPU_BUFFER_USAGE_COPY_DST
    },
    (frame) => resolve(frame).parameters
  );
  if (!parameters2.ok) return parameters2;
  return ok29({
    histogram: histogram.value,
    state: state.value,
    candidate: candidate.value,
    parameters: parameters2.value
  });
}
function createAutoExposureMeterState(frame) {
  const factory = resolveAutoExposureShaderModuleFactory(frame.runtime);
  if (factory === void 0) throw new Error("auto-exposure meter shader factory unavailable");
  const module = factory.createShaderModule({
    code: AUTO_EXPOSURE_METER_WGSL,
    label: "auto_exposure_meter"
  });
  if (!module.ok) throw module.error;
  const layout = frame.runtime.device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: COMPUTE_VISIBILITY,
        texture: { sampleType: "float", viewDimension: "2d" }
      },
      { binding: 1, visibility: COMPUTE_VISIBILITY, buffer: { type: "storage" } },
      { binding: 2, visibility: COMPUTE_VISIBILITY, buffer: { type: "storage" } },
      { binding: 3, visibility: COMPUTE_VISIBILITY, buffer: { type: "storage" } },
      { binding: 4, visibility: COMPUTE_VISIBILITY, buffer: { type: "read-only-storage" } }
    ]
  });
  if (!layout.ok) throw layout.error;
  const pipelineLayout2 = frame.runtime.device.createPipelineLayout({
    label: "auto_exposure_meter.layout",
    bindGroupLayouts: [layout.value]
  });
  if (!pipelineLayout2.ok) throw pipelineLayout2.error;
  const createPipeline = (label, entryPoint) => {
    const pipeline = frame.runtime.device.createComputePipeline({
      label,
      layout: pipelineLayout2.value,
      compute: { module: module.value, entryPoint }
    });
    if (!pipeline.ok) throw pipeline.error;
    return pipeline.value;
  };
  return {
    layout: layout.value,
    clearPipeline: createPipeline("auto_exposure_clear", "auto_exposure_clear"),
    histogramPipeline: createPipeline("auto_exposure_histogram", "auto_exposure_histogram"),
    adaptPipeline: createPipeline("auto_exposure_adapt", "auto_exposure_adapt")
  };
}
function addAutoExposureGraphPasses(context, projection) {
  let meterState;
  const meter = context.graph.addComputePass(AUTO_EXPOSURE_FUSED_GRAPH_PASS, {
    accesses: [
      { resource: projection.source.view, usage: "sampled-read" },
      // The clear dispatch initializes the histogram before the histogram
      // dispatch reads/writes it. `storage-write` keeps graph validation from
      // requiring an external initializer while the binding remains read/write.
      { resource: projection.resources.histogram, usage: "storage-write" },
      { resource: projection.resources.state, usage: "storage-write" },
      { resource: projection.resources.candidate, usage: "storage-write" },
      { resource: projection.resources.parameters, usage: "storage-read" }
    ],
    encode: ({ pass, frame, resources }) => {
      meterState ??= createAutoExposureMeterState(frame);
      const source = resources.textureView(projection.source.view);
      const histogramBuffer = resources.buffer(projection.resources.histogram);
      const state = resources.buffer(projection.resources.state);
      const candidate = resources.buffer(projection.resources.candidate);
      const parameters2 = resources.buffer(projection.resources.parameters);
      if (!source.ok) throw source.error;
      if (!histogramBuffer.ok) throw histogramBuffer.error;
      if (!state.ok) throw state.error;
      if (!candidate.ok) throw candidate.error;
      if (!parameters2.ok) throw parameters2.error;
      const bindings = frame.runtime.device.createBindGroup({
        layout: meterState.layout,
        entries: [
          { binding: 0, resource: { kind: "textureView", value: source.value } },
          {
            binding: 1,
            resource: { kind: "buffer", value: { buffer: histogramBuffer.value } }
          },
          {
            binding: 2,
            resource: { kind: "buffer", value: { buffer: state.value } }
          },
          {
            binding: 3,
            resource: { kind: "buffer", value: { buffer: candidate.value } }
          },
          {
            binding: 4,
            resource: { kind: "buffer", value: { buffer: parameters2.value } }
          }
        ]
      });
      if (!bindings.ok) throw bindings.error;
      pass.setBindGroup(0, bindings.value);
      pass.setPipeline(meterState.clearPipeline);
      pass.dispatchWorkgroups(1, 1, 1);
      pass.setPipeline(meterState.histogramPipeline);
      pass.dispatchWorkgroups(
        AUTO_EXPOSURE_HISTOGRAM_DISPATCH.x,
        AUTO_EXPOSURE_HISTOGRAM_DISPATCH.y,
        AUTO_EXPOSURE_HISTOGRAM_DISPATCH.z
      );
      pass.setPipeline(meterState.adaptPipeline);
      pass.dispatchWorkgroups(1, 1, 1);
    }
  });
  return meter.ok ? ok29(void 0) : meter;
}
function wgslFloat(value) {
  return Number.isFinite(value) ? value.toFixed(8) : "0.0";
}
function createAutoExposureApplyWgsl(whiteBalance = { temperature: 6504, tint: 0 }, hasCandidate = true) {
  const candidateBinding = hasCandidate ? "@group(1) @binding(0) var<storage, read> candidate: array<vec4<f32>>;" : "";
  const candidateValue = hasCandidate ? "max(candidate[0].x, 0.0)" : "1.0";
  return (
    /* wgsl */
    `
${candidateBinding}

const WB_TEMPERATURE: f32 = ${wgslFloat(whiteBalance.temperature)};
const WB_TINT: f32 = ${wgslFloat(whiteBalance.tint)};

fn mul_rgb_to_xyz(value: vec3<f32>) -> vec3<f32> {
  return vec3<f32>(
    dot(vec3<f32>(0.4124564, 0.3575761, 0.1804375), value),
    dot(vec3<f32>(0.2126729, 0.7151522, 0.0721750), value),
    dot(vec3<f32>(0.0193339, 0.1191920, 0.9503041), value)
  );
}

// Inverse of mul_rgb_to_xyz: adapted XYZ must return to linear sRGB.
fn mul_xyz_to_rgb(value: vec3<f32>) -> vec3<f32> {
  return vec3<f32>(
    dot(vec3<f32>(3.2404548, -1.5371389, -0.4985315), value),
    dot(vec3<f32>(-0.9692664, 1.8760109, 0.0415561), value),
    dot(vec3<f32>(0.0556434, -0.2040259, 1.0572252), value)
  );
}

fn mul_bradford(value: vec3<f32>) -> vec3<f32> {
  return vec3<f32>(
    dot(vec3<f32>(0.8951, 0.2664, -0.1614), value),
    dot(vec3<f32>(-0.7502, 1.7135, 0.0367), value),
    dot(vec3<f32>(0.0389, -0.0685, 1.0296), value)
  );
}

fn mul_bradford_inverse(value: vec3<f32>) -> vec3<f32> {
  return vec3<f32>(
    dot(vec3<f32>(0.9869929, -0.1470543, 0.1599627), value),
    dot(vec3<f32>(0.4323053, 0.5183603, 0.0492912), value),
    dot(vec3<f32>(-0.0085287, 0.0400428, 0.9684867), value)
  );
}

fn blackbody_white_point(temperature: f32) -> vec3<f32> {
  if (temperature == 6504.0) { return vec3<f32>(0.95047, 1.0, 1.08883); }
  let t = clamp(temperature, 1000.0, 40000.0);
  var x: f32;
  if (t <= 4000.0) {
    x = -0.2661239e9 / (t * t * t) - 0.234358e6 / (t * t) + 0.8776956e3 / t + 0.17991;
  } else {
    x = -3.0258469e9 / (t * t * t) + 2.1070379e6 / (t * t) + 0.2226347e3 / t + 0.24039;
  }
  var y: f32;
  if (t <= 2222.0) {
    y = -1.1063814 * x * x * x - 1.3481102 * x * x + 2.18555832 * x - 0.20219683;
  } else if (t <= 4000.0) {
    y = -0.9549476 * x * x * x - 1.37418593 * x * x + 2.09137015 * x - 0.16748867;
  } else {
    y = 3.081758 * x * x * x - 5.8733867 * x * x + 3.75112997 * x - 0.37001483;
  }
  return vec3<f32>(x / y, 1.0, (1.0 - x - y) / y);
}

fn apply_white_balance(value: vec3<f32>) -> vec3<f32> {
  if (WB_TEMPERATURE == 6504.0 && WB_TINT == 0.0) { return value; }
  let source_lms = mul_bradford(vec3<f32>(0.95047, 1.0, 1.08883));
  let target_lms = mul_bradford(blackbody_white_point(WB_TEMPERATURE));
  let scale = target_lms / source_lms;
  let adapted_lms = mul_bradford(mul_rgb_to_xyz(value)) * scale;
  let adapted_xyz = mul_bradford_inverse(adapted_lms);
  let adapted_rgb = mul_xyz_to_rgb(adapted_xyz);
  return adapted_rgb * vec3<f32>(
    max(0.0, 1.0 + WB_TINT),
    max(0.0, 1.0 - WB_TINT),
    max(0.0, 1.0 + WB_TINT)
  );
}

@fragment fn color_stage_fs(input: VertexOutput) -> @location(0) vec4<f32> {
  let color = textureSampleLevel(source, sourceSampler, input.uv, 0.0);
  let exposed = color.rgb * ${candidateValue};
  return vec4<f32>(apply_white_balance(exposed), color.a);
}`
  );
}
function addAutoExposureExposurePass(context, input, output, resources, whiteBalance = { temperature: 6504, tint: 0 }) {
  let candidateLayout;
  return addStandardColorStagePass(
    context.graph,
    "standard-exposure-white-balance",
    input,
    output,
    createAutoExposureApplyWgsl(whiteBalance, resources !== void 0),
    resources === void 0 ? void 0 : {
      accesses: [{ resource: resources.candidate, usage: "storage-read" }],
      bind: (device, graphResources) => {
        if (candidateLayout === void 0) {
          const created = device.createBindGroupLayout({
            label: "standard-exposure-white-balance.candidate.bgl",
            entries: [{ binding: 0, visibility: 2, buffer: { type: "read-only-storage" } }]
          });
          if (!created.ok) throw created.error;
          candidateLayout = created.value;
        }
        const candidate = graphResources.buffer(resources.candidate);
        if (!candidate.ok) throw candidate.error;
        const bindGroup = device.createBindGroup({
          layout: candidateLayout,
          entries: [
            { binding: 0, resource: { kind: "buffer", value: { buffer: candidate.value } } }
          ]
        });
        if (!bindGroup.ok) throw bindGroup.error;
        return { layout: candidateLayout, bindGroup: bindGroup.value };
      }
    }
  );
}

// sdk/engine/node_modules/@forgeax/engine-render/src/pipeline/standard-output/graph.ts
function requestedStages(input) {
  const stages = [];
  if (input.temporal) stages.push("temporal");
  if (input.meter) stages.push("meter");
  if (input.dof === true) stages.push("dof");
  if (input.bloom) stages.push("bloom");
  if (input.lensFlare === true) stages.push("lens-flare");
  if (input.exposure || input.whiteBalance) stages.push("exposure-white-balance");
  stages.push("tone");
  if (input.lut) stages.push("lut");
  if (input.outline === true) stages.push("outline");
  if (input.barrelDistortion === true) stages.push("barrel-distortion");
  if (input.fxaa) stages.push("fxaa");
  if (input.lensEffects === true) stages.push("lens-effects");
  if (input.smaa === true) stages.push("smaa");
  stages.push("output-encoding");
  return stages;
}
function physicalStages(logicalStages) {
  return logicalStages.map((name) => {
    switch (name) {
      case "temporal":
      case "meter":
      case "bloom":
      case "lens-flare":
      case "dof":
      case "exposure-white-balance":
        return { name, input: LINEAR_HDR_DOMAIN, output: LINEAR_HDR_DOMAIN };
      case "tone":
        return { name, input: LINEAR_HDR_DOMAIN, output: LINEAR_LDR_DOMAIN };
      case "lut":
      case "outline":
      case "barrel-distortion":
      case "fxaa":
      case "lens-effects":
      case "smaa":
        return { name, input: LINEAR_LDR_DOMAIN, output: LINEAR_LDR_DOMAIN };
      case "output-encoding":
        return { name, input: LINEAR_LDR_DOMAIN, output: DISPLAY_ENCODED_DOMAIN };
      default:
        throw new Error(`Unknown Standard output stage: ${name}`);
    }
  });
}
function createStandardOutputPlan(input) {
  const logicalStages = requestedStages(input);
  const incrementalResources = [
    ...input.lensFlare === true ? ["standard-lens-flare-prefilter", "standard-lens-flare-bokeh", "standard-lens-flare"] : [],
    ...input.lut ? ["standard-color-lut"] : [],
    ...input.barrelDistortion === true ? ["standard-barrel-distortion"] : [],
    ...input.lensEffects === true ? ["standard-lens-effects"] : []
  ];
  const incrementalBindings = (input.lensFlare === true ? 10 : 0) + (input.lut ? 2 : 0) + (input.barrelDistortion === true ? 3 : 0) + (input.lensEffects === true ? 3 : 0);
  return {
    features: {
      temporal: input.temporal,
      meter: input.meter,
      bloom: input.bloom,
      dof: input.dof === true,
      lensFlare: input.lensFlare === true,
      exposure: input.exposure,
      whiteBalance: input.whiteBalance,
      lut: input.lut,
      outline: input.outline === true,
      barrelDistortion: input.barrelDistortion === true,
      lensEffects: input.lensEffects === true,
      fxaa: input.fxaa,
      smaa: input.smaa === true
    },
    logicalStages,
    physicalStages: physicalStages(logicalStages),
    incrementalResources,
    incrementalBindings
  };
}

// sdk/engine/node_modules/@forgeax/engine-render/src/pipeline/standard-output/lut-gpu.ts
import { err as err10, ok as ok31 } from "@forgeax/engine-types";

// sdk/engine/node_modules/@forgeax/engine-render/src/pipeline/standard-output/lut-admission.ts
import { err as err9, ok as ok30 } from "@forgeax/engine-types";
function createStandardLutSamplerDescriptor() {
  return {
    addressModeU: "clamp-to-edge",
    addressModeV: "clamp-to-edge",
    addressModeW: "clamp-to-edge",
    magFilter: "linear",
    minFilter: "linear",
    mipmapFilter: "nearest"
  };
}
function failure(code, expected, hint, detail) {
  return err9({ code, expected, hint, detail });
}
function admitStandardColorLut(input) {
  const { texture } = input;
  if (texture.shape.viewDimension !== "3d" || texture.format !== "rgba16float" || texture.colorSpace !== "linear" || texture.mips.kind === "generate" || texture.mips.kind === "packed" && texture.mips.levelCount !== 1) {
    return failure(
      "standard-lut-shape-invalid",
      "a linear rgba16float 3D texture with one resident mip level",
      "re-import the LUT as an ordinary linear 3D TextureAsset without generated mips",
      {
        viewDimension: texture.shape.viewDimension,
        format: texture.format,
        colorSpace: texture.colorSpace,
        mipPolicy: texture.mips.kind
      }
    );
  }
  const extent = texture.shape.extent;
  if (extent.width !== extent.height || extent.width !== extent.depth) {
    return failure(
      "standard-lut-shape-invalid",
      "LUT width, height, and depth must be equal",
      "produce a cubic 3D LUT",
      { width: extent.width, height: extent.height, depth: extent.depth }
    );
  }
  if (!Number.isInteger(input.maxTextureDimension3D) || input.maxTextureDimension3D <= 0 || extent.width > input.maxTextureDimension3D) {
    return failure(
      "standard-lut-limit-exceeded",
      "the LUT extent must fit the live maxTextureDimension3D limit",
      "use a smaller LUT or select a device with a larger 3D texture limit",
      { size: extent.width, maxTextureDimension3D: input.maxTextureDimension3D }
    );
  }
  if (!input.rgba16floatFilterable) {
    return failure(
      "standard-lut-filter-unavailable",
      "rgba16float 3D sampling must be filterable on the live device",
      "disable the LUT or use a device that exposes rgba16float filtering",
      { format: texture.format, rgba16floatFilterable: false }
    );
  }
  if (!input.bind()) {
    return failure(
      "standard-lut-bind-failed",
      "the LUT view and sampler must bind on the live device",
      "disable the LUT and retain the last known good output",
      { size: extent.width }
    );
  }
  return ok30({
    viewDimension: "3d",
    extent: { width: extent.width, height: extent.height, depth: extent.depth },
    sampler: createStandardLutSamplerDescriptor()
  });
}

// sdk/engine/node_modules/@forgeax/engine-render/src/pipeline/standard-output/lut-gpu.ts
var lutBindingCache = /* @__PURE__ */ new WeakMap();
function retireStandardLutGpuResources(_resources) {
}
function failure2(code, expected, hint, detail = {}) {
  return err10({ code, expected, hint, detail });
}
function causeDetail(cause) {
  if (typeof cause !== "object" || cause === null) return { cause: String(cause) };
  const value = cause;
  return {
    ...typeof value.code === "string" ? { causeCode: value.code } : {},
    ...typeof value.expected === "string" ? { causeExpected: value.expected } : {},
    ...typeof value.hint === "string" ? { causeHint: value.hint } : {}
  };
}
function prepareStandardLutGpu(input) {
  if (!Number.isFinite(input.strength) || input.strength <= 0) {
    return failure2(
      "standard-lut-strength-invalid",
      "the LUT blend strength must be finite and positive",
      "set Camera.colorLutStrength to a value in (0, 1]",
      { strength: String(input.strength) }
    );
  }
  const asset = input.world.resolveAsset(input.handle);
  if (!asset.ok) {
    return failure2(
      "standard-lut-residency-failed",
      "the authored TextureAsset handle resolves in the active RenderResourceScope",
      "register or rebuild the TextureAsset, then retry the same camera generation",
      causeDetail(asset.error)
    );
  }
  const source = input.world.sourceForAsset(input.handle);
  const guid = source?.guid;
  const reference = `${input.world.identity}:${input.handle}`;
  const sourceKey = source?.sourceKey ?? reference;
  const resident = input.gpuStore.getTextureGpuView(input.handle, input.world);
  let entry;
  if (resident === void 0) {
    const prepared = input.gpuStore.ensureResident(input.handle, asset.value, input.world);
    if (!prepared.ok) {
      return failure2(
        "standard-lut-residency-failed",
        "the LUT TextureAsset becomes resident through the producer-owned GPU store",
        "inspect the structured residency failure and rebuild the source asset before retrying",
        causeDetail(prepared.error)
      );
    }
    if (!("texture" in prepared.value)) {
      return failure2(
        "standard-lut-residency-failed",
        "the LUT handle resolves to a resident TextureAsset, not a mesh resource",
        "repair the authored handle kind and retry the same source key",
        { guid: String(guid) }
      );
    }
    entry = prepared.value;
  }
  const view = resident ?? entry?.view;
  const texture = entry?.texture.handle ?? input.gpuStore._getTextureGpuTexture(input.handle, input.world)?.handle;
  if (view === void 0 || texture === void 0) {
    return failure2(
      "standard-lut-not-resident",
      "the LUT has a live GPU texture and view before graph admission",
      "retain the current LKG and retry producer-owned residency for the same GUID/sourceKey",
      { guid: String(guid), sourceKey }
    );
  }
  const cache = lutBindingCache.get(input.device) ?? (() => {
    const created = /* @__PURE__ */ new Map();
    lutBindingCache.set(input.device, created);
    return created;
  })();
  const cached = cache.get(reference);
  if (cached !== void 0 && cached.texture === texture) {
    return ok31({ ...cached, sourceKey, strength: input.strength });
  }
  const liveView = input.device.createTextureView(texture, { dimension: "3d" });
  if (!liveView.ok) {
    return failure2(
      "standard-lut-3d-view-unavailable",
      "the resident texture creates a live 3D texture view",
      "disable the LUT and retain the last known good output on this device",
      causeDetail(liveView.error)
    );
  }
  const sampler = cached === void 0 ? input.device.createSampler(createStandardLutSamplerDescriptor()) : ok31(cached.sampler);
  if (!sampler.ok) {
    return failure2(
      "standard-lut-sampler-failed",
      "the live device creates the filtering sampler required by the LUT",
      "disable the LUT and retain the last known good output",
      causeDetail(sampler.error)
    );
  }
  const bindGroupLayout = cached === void 0 ? input.device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: 2, texture: { sampleType: "float", viewDimension: "3d" } },
      { binding: 1, visibility: 2, sampler: { type: "filtering" } }
    ]
  }) : ok31(cached.bindGroupLayout);
  if (!bindGroupLayout.ok) {
    return failure2(
      "standard-lut-bind-group-layout-failed",
      "the live device accepts a filtering float 3D LUT bind-group layout",
      "disable the LUT and retain the last known good output",
      causeDetail(bindGroupLayout.error)
    );
  }
  let liveBindGroup;
  try {
    liveBindGroup = input.device.createBindGroup({
      layout: bindGroupLayout.value,
      entries: [
        { binding: 0, resource: { kind: "textureView", value: liveView.value } },
        { binding: 1, resource: { kind: "sampler", value: sampler.value } }
      ]
    });
  } catch (cause) {
    return failure2(
      "standard-lut-filter-unavailable",
      "the live device binds the rgba16float 3D view with a filtering sampler",
      "disable the LUT and retain the last known good output on this device",
      { cause: String(cause) }
    );
  }
  const admission = admitStandardColorLut({
    texture: asset.value,
    maxTextureDimension3D: input.device.limits.maxTextureDimension3D,
    rgba16floatFilterable: liveBindGroup.ok,
    bind: () => liveBindGroup.ok
  });
  if (!admission.ok) {
    if (admission.error.code === "standard-lut-filter-unavailable" && !liveBindGroup.ok) {
      return err10({
        ...admission.error,
        detail: Object.freeze({
          ...admission.error.detail,
          ...causeDetail(liveBindGroup.error)
        })
      });
    }
    return admission;
  }
  if (!liveBindGroup.ok) {
    return failure2(
      "standard-lut-bind-failed",
      "the admitted LUT view and sampler bind successfully",
      "disable the LUT and retain the last known good output",
      causeDetail(liveBindGroup.error)
    );
  }
  const binding = {
    texture,
    view: liveView.value,
    sampler: sampler.value,
    bindGroupLayout: bindGroupLayout.value,
    bindGroup: liveBindGroup.value,
    size: admission.value.extent.width
  };
  cache.set(reference, binding);
  return ok31({ ...binding, sourceKey, strength: input.strength });
}
var LUT_STAGE_WGSL = (
  /* wgsl */
  `
@group(1) @binding(0) var lut: texture_3d<f32>;
@group(1) @binding(1) var lutSampler: sampler;
@fragment fn color_stage_fs(input: VertexOutput) -> @location(0) vec4<f32> {
  let color = textureSampleLevel(source, sourceSampler, input.uv, 0.0);
  let mapped = textureSampleLevel(lut, lutSampler, clamp(color.rgb, vec3<f32>(0.0), vec3<f32>(1.0)), 0.0);
  return vec4<f32>(mix(color.rgb, mapped.rgb, LUT_STRENGTH), color.a);
}`
);
function addStandardColorLutPass(graph, input, output, lut) {
  return addStandardColorStagePass(
    graph,
    "standard-color-lut",
    input,
    output,
    LUT_STAGE_WGSL.replace("LUT_STRENGTH", String(lut.strength)),
    {
      accesses: [{ resource: lut.view, usage: "sampled-read" }],
      bind: (_device, _resources, frame) => {
        const binding = lut.bind(frame);
        return { layout: binding.bindGroupLayout, bindGroup: binding.bindGroup };
      }
    }
  );
}

// sdk/engine/node_modules/@forgeax/engine-render/src/pipeline/standard-output/tone-lut.ts
import { RhiError as RhiError10 } from "@forgeax/engine-rhi";
import { TONEMAP_PARAMS_LAYOUT } from "@forgeax/engine-shader";
import { ok as ok32 } from "@forgeax/engine-types";
var programsByScope = /* @__PURE__ */ new WeakMap();
function programsFor4(scope) {
  let programs2 = programsByScope.get(scope);
  if (programs2 === void 0) {
    programs2 = [];
    programsByScope.set(scope, programs2);
    const owned = programs2;
    scope._adopt("post-effect", programs2, () => {
      programsByScope.delete(scope);
      owned.length = 0;
    });
  }
  return programs2;
}
function unavailable2(expected) {
  throw new RhiError10({
    code: "rhi-not-available",
    expected,
    hint: "prepare the Standard output transform and its resident LUT before encoding"
  });
}
function addStandardToneLutPass(graph, input, output, lut, dither) {
  const localPrograms = [];
  let retainedBinding;
  const added = graph.addRasterPass("standard-tone-lut-output", {
    accesses: [
      { resource: input.view, usage: "sampled-read" },
      { resource: lut.view, usage: "sampled-read" },
      { resource: output.view, usage: "color-attachment" }
    ],
    colorAttachments: [
      {
        view: output.view,
        loadOp: "clear",
        storeOp: "store",
        clearValue: { r: 0, g: 0, b: 0, a: 1 }
      }
    ],
    encode: ({ frame, pass, resources }) => {
      const { runtime } = frame;
      const device = runtime.device;
      const binding = lut.bind(frame);
      const factory = runtime.immediateShaderModuleFactory ?? runtime.shaderModuleFactory;
      const entry = runtime.lookupPostProcess?.(STANDARD_OUTPUT_TRANSFORM_FEATURE_ID);
      const params2 = frame.postProcessParams.get(STANDARD_OUTPUT_TRANSFORM_FEATURE_ID);
      const paramsBuffer = runtime.getPostProcessParamsBuffer?.(
        STANDARD_OUTPUT_TRANSFORM_FEATURE_ID
      );
      if (factory === void 0 || entry === void 0 || paramsBuffer === void 0 || params2?.byteLength !== TONEMAP_PARAMS_LAYOUT.byteSize) {
        return unavailable2(
          "the composed Standard tone/LUT module and 32-byte params are available"
        );
      }
      const source = factory.createShaderModule({
        code: entry.source,
        label: postProcessShaderModuleLabel(entry.source)
      });
      if (!source.ok) throw source.error;
      const scope = runtime.deviceScope;
      const programs2 = scope === void 0 ? localPrograms : scope.isAlive() ? programsFor4(scope) : void 0;
      let program = programs2?.find(
        (cached) => cached.device === device && cached.factory === factory && cached.createModule === factory.createShaderModule && cached.module === source.value && cached.source === entry.source && cached.format === output.format && cached.sampleCount === output.sampleCount && cached.lutLayout === binding.bindGroupLayout
      );
      if (program === void 0) {
        const empty = device.createBindGroupLayout({ entries: [] });
        if (!empty.ok) throw empty.error;
        const inputLayout = device.createBindGroupLayout({
          entries: [
            { binding: 0, visibility: 2, texture: { sampleType: "float", viewDimension: "2d" } },
            { binding: 1, visibility: 2, sampler: { type: "filtering" } },
            { binding: 2, visibility: 2, buffer: { type: "uniform" } }
          ]
        });
        if (!inputLayout.ok) throw inputLayout.error;
        const layout = device.createPipelineLayout({
          bindGroupLayouts: [empty.value, inputLayout.value, binding.bindGroupLayout]
        });
        if (!layout.ok) throw layout.error;
        const sampler = device.createSampler({ minFilter: "linear", magFilter: "linear" });
        if (!sampler.ok) throw sampler.error;
        const pipeline = device.createRenderPipeline({
          label: "standard-tone-lut-output",
          layout: layout.value,
          vertex: { module: source.value, entryPoint: "vs_main", buffers: [] },
          fragment: {
            module: source.value,
            entryPoint: "fs_tone_lut_encode",
            targets: [{ format: output.format }]
          },
          primitive: { topology: "triangle-list" },
          multisample: { count: output.sampleCount }
        });
        if (!pipeline.ok) throw pipeline.error;
        program = {
          device,
          factory,
          createModule: factory.createShaderModule,
          module: source.value,
          source: entry.source,
          format: output.format,
          sampleCount: output.sampleCount,
          lutLayout: binding.bindGroupLayout,
          inputLayout: inputLayout.value,
          sampler: sampler.value,
          pipeline: pipeline.value
        };
        if (programs2 !== void 0 && (scope === void 0 || scope.isAlive())) {
          if (programs2.length === 8) programs2.shift();
          programs2.push(program);
        }
      }
      const extent = resources.textureViewExtent(output.view);
      if (!extent.ok) throw extent.error;
      const payload = params2.slice();
      const values = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
      values.setFloat32(TONEMAP_PARAMS_LAYOUT.ditherOffset, dither ? 1 : 0, true);
      values.setFloat32(TONEMAP_PARAMS_LAYOUT.outputGamutOffset + 4, lut.strength, true);
      values.setFloat32(TONEMAP_PARAMS_LAYOUT.outputWidthOffset, extent.value.width, true);
      values.setFloat32(TONEMAP_PARAMS_LAYOUT.outputHeightOffset, extent.value.height, true);
      const written = device.queue.writeBuffer(paramsBuffer, 0, payload);
      if (!written.ok) throw written.error;
      const inputView = resources.textureView(input.view);
      if (!inputView.ok) throw inputView.error;
      if (retainedBinding?.program !== program || retainedBinding.input !== inputView.value || retainedBinding.params !== paramsBuffer) {
        const bindings = device.createBindGroup({
          layout: program.inputLayout,
          entries: [
            { binding: 0, resource: { kind: "textureView", value: inputView.value } },
            { binding: 1, resource: { kind: "sampler", value: program.sampler } },
            { binding: 2, resource: { kind: "buffer", value: { buffer: paramsBuffer } } }
          ]
        });
        if (!bindings.ok) throw bindings.error;
        retainedBinding = {
          program,
          input: inputView.value,
          params: paramsBuffer,
          group: bindings.value
        };
      }
      pass.setPipeline(program.pipeline);
      pass.setBindGroup(1, retainedBinding.group);
      pass.setBindGroup(2, binding.bindGroup);
      pass.draw(3, 1, 0, 0);
    }
  });
  return added.ok ? ok32(void 0) : added;
}

// sdk/engine/node_modules/@forgeax/engine-render/src/pipeline/standard-post.ts
var STANDARD_BLOOM_MAX_LEVELS = 5;
var STANDARD_BLOOM_TARGET_SPEC = {
  composited: { label: "bloom-composited", format: "rgba16float" },
  horizontalPrefix: "bloom-horizontal-",
  verticalPrefix: "bloom-vertical-"
};
function deriveStandardBloomLevels(outputWidth, outputHeight) {
  const levels = [];
  let width = Math.max(1, Math.ceil(outputWidth / 2));
  let height = Math.max(1, Math.ceil(outputHeight / 2));
  for (let level = 0; level < STANDARD_BLOOM_MAX_LEVELS; level += 1) {
    levels.push({ width, height });
    width = Math.max(1, Math.ceil(width / 2));
    height = Math.max(1, Math.ceil(height / 2));
  }
  return levels;
}
function standardBloomTargetSpecs(outputWidth, outputHeight) {
  const levels = deriveStandardBloomLevels(outputWidth, outputHeight);
  return {
    composited: {
      label: STANDARD_BLOOM_TARGET_SPEC.composited.label,
      format: STANDARD_BLOOM_TARGET_SPEC.composited.format,
      size: { width: outputWidth, height: outputHeight },
      domain: "linear-hdr"
    },
    horizontal: levels.map((size, level) => ({
      label: `${STANDARD_BLOOM_TARGET_SPEC.horizontalPrefix}${level}`,
      format: "rgba16float",
      size,
      domain: "linear-hdr"
    })),
    vertical: levels.map((size, level) => ({
      label: `${STANDARD_BLOOM_TARGET_SPEC.verticalPrefix}${level}`,
      format: "rgba16float",
      size,
      domain: "linear-hdr"
    })),
    levels
  };
}
var emptyBloomGraphInspection = () => ({
  status: "empty",
  targetCount: 0,
  targetBytes: 0,
  passCount: 0,
  levelCount: 0,
  levelDimensions: [],
  horizontalPassCount: 0,
  verticalPassCount: 0
});
var invalidBloomGraphInspection = () => ({
  status: "invalid",
  targetCount: 0,
  targetBytes: 0,
  passCount: 0,
  levelCount: 0,
  levelDimensions: [],
  horizontalPassCount: 0,
  verticalPassCount: 0
});
function textureBytes(resource) {
  const descriptor = resource.descriptor;
  if (resource.kind !== "texture" || descriptor === void 0 || descriptor.kind !== "texture" || descriptor.format !== "rgba16float")
    return void 0;
  const texelBytes = textureFormatBlock(descriptor.format).bytesPerBlock;
  let bytes = 0;
  for (let level = 0; level < descriptor.mipLevelCount; level += 1) {
    bytes += mipDimension3(descriptor.width, level) * mipDimension3(descriptor.height, level) * descriptor.depthOrArrayLayers * texelBytes;
  }
  const descriptorBytes = bytes * descriptor.sampleCount;
  return resource.byteSize === descriptorBytes && descriptorBytes > 0 ? descriptorBytes : void 0;
}
function resourceSize(resource) {
  const descriptor = resource.descriptor;
  if (resource.kind !== "texture" || descriptor.kind !== "texture") return void 0;
  if (typeof descriptor.size === "string") return void 0;
  if (resource.extent === void 0 || resource.extent.width !== descriptor.width || resource.extent.height !== descriptor.height || resource.extent.depthOrArrayLayers !== descriptor.depthOrArrayLayers) {
    return void 0;
  }
  if (descriptor.format !== "rgba16float" || descriptor.domain !== "linear-hdr" || descriptor.width <= 0 || descriptor.height <= 0 || descriptor.depthOrArrayLayers !== 1 || descriptor.mipLevelCount !== 1 || descriptor.sampleCount !== 1 || resource.dimension !== "2d" || descriptor.size.width !== descriptor.width || descriptor.size.height !== descriptor.height || textureBytes(resource) === void 0) {
    return void 0;
  }
  return { width: descriptor.width, height: descriptor.height };
}
function hasPassAccesses(pass, accesses) {
  return pass !== void 0 && pass.kind === "raster" && pass.accesses.length === accesses.length && accesses.every(
    (access, index) => pass.accesses[index]?.resource === access.resource && pass.accesses[index]?.usage === access.usage
  );
}
function inspectStandardBloomGraph(graph) {
  if (graph === void 0) return emptyBloomGraphInspection();
  const composited = graph.resources.filter(
    (resource) => resource.label === STANDARD_BLOOM_TARGET_SPEC.composited.label
  );
  const horizontal2 = graph.resources.filter((resource) => resource.label.startsWith(STANDARD_BLOOM_TARGET_SPEC.horizontalPrefix)).sort((a, b) => a.label.localeCompare(b.label, void 0, { numeric: true }));
  const vertical = graph.resources.filter((resource) => resource.label.startsWith(STANDARD_BLOOM_TARGET_SPEC.verticalPrefix)).sort((a, b) => a.label.localeCompare(b.label, void 0, { numeric: true }));
  const targets = [...composited, ...horizontal2, ...vertical];
  const passes = graph.passes.filter(
    (pass) => pass.name === TYPED_BLOOM_PASS_NAMES.composite || pass.name.startsWith(`${TYPED_BLOOM_PASS_NAMES.horizontal}-`) || pass.name.startsWith(`${TYPED_BLOOM_PASS_NAMES.vertical}-`)
  ).sort((left, right) => left.executionIndex - right.executionIndex);
  if (targets.length === 0 && passes.length === 0) return emptyBloomGraphInspection();
  if (composited.length !== 1) return invalidBloomGraphInspection();
  const compositedResource = composited[0];
  if (compositedResource === void 0) return invalidBloomGraphInspection();
  const compositedSize = resourceSize(compositedResource);
  if (compositedSize === void 0) return invalidBloomGraphInspection();
  const expected = standardBloomTargetSpecs(compositedSize.width, compositedSize.height);
  const expectedHorizontalLabels = expected.horizontal.map((entry) => entry.label);
  const expectedVerticalLabels = expected.vertical.map((entry) => entry.label);
  const orderedHorizontal = horizontal2.sort(
    (left, right) => left.label.localeCompare(right.label, void 0, { numeric: true })
  );
  const orderedVertical = vertical.sort(
    (left, right) => left.label.localeCompare(right.label, void 0, { numeric: true })
  );
  const completeTargetSet = targets.length === 1 + expectedHorizontalLabels.length + expectedVerticalLabels.length && orderedHorizontal.length === expectedHorizontalLabels.length && orderedVertical.length === expectedVerticalLabels.length && orderedHorizontal.every(
    (resource, level) => resource.label === expectedHorizontalLabels[level]
  ) && orderedVertical.every((resource, level) => resource.label === expectedVerticalLabels[level]) && orderedHorizontal.every(
    (resource, level) => resourceSize(resource)?.width === expected.levels[level]?.width && resourceSize(resource)?.height === expected.levels[level]?.height
  ) && orderedVertical.every(
    (resource, level) => resourceSize(resource)?.width === expected.levels[level]?.width && resourceSize(resource)?.height === expected.levels[level]?.height
  );
  const expectedPassNames = expectedHorizontalLabels.flatMap((label, level) => [
    label,
    expectedVerticalLabels[level]
  ]);
  expectedPassNames.push(TYPED_BLOOM_PASS_NAMES.composite);
  const completePassSet = passes.length === expectedPassNames.length && passes.every((pass, index) => pass.name === expectedPassNames[index]);
  const sceneLabel = passes[0]?.accesses[0]?.resource;
  const passTopology = completePassSet && sceneLabel !== void 0 && !sceneLabel.startsWith("bloom-") && graph.resources.some((resource) => resource.label === sceneLabel) && orderedHorizontal.every(
    (_, level) => hasPassAccesses(passes[level * 2], [
      {
        resource: level === 0 ? sceneLabel : `bloom-vertical-${level - 1}`,
        usage: "sampled-read"
      },
      { resource: `bloom-horizontal-${level}`, usage: "color-attachment" }
    ]) && hasPassAccesses(passes[level * 2 + 1], [
      { resource: `bloom-horizontal-${level}`, usage: "sampled-read" },
      { resource: `bloom-vertical-${level}`, usage: "color-attachment" }
    ])
  ) && hasPassAccesses(passes.at(-1), [
    { resource: sceneLabel, usage: "sampled-read" },
    ...expectedVerticalLabels.map((resource) => ({ resource, usage: "sampled-read" })),
    { resource: STANDARD_BLOOM_TARGET_SPEC.composited.label, usage: "color-attachment" }
  ]);
  if (!completeTargetSet || !passTopology) {
    return invalidBloomGraphInspection();
  }
  const levelDimensions = orderedHorizontal.flatMap((resource) => {
    const size = resourceSize(resource);
    return size === void 0 ? [] : [size];
  });
  if (levelDimensions.length !== orderedHorizontal.length) {
    return invalidBloomGraphInspection();
  }
  const targetBytes = targets.reduce((bytes, resource) => bytes + (textureBytes(resource) ?? 0), 0);
  return {
    status: "valid",
    targetCount: targets.length,
    targetBytes,
    passCount: passes.length,
    levelCount: orderedHorizontal.length,
    levelDimensions,
    horizontalPassCount: orderedHorizontal.length,
    verticalPassCount: orderedVertical.length
  };
}
function target2(context, label, descriptor) {
  return createRenderPipelineTarget(context.graph, label, descriptor);
}
function missingTemporalContributor(topology, contributorId) {
  return new SceneDataUnavailableError({
    featureIdentity: "forgeax::standard",
    schema: "forgeax::scene-data::temporal-v1",
    lane: topology.lane.compute ? "clustered" : "cpu-webgl2",
    reason: "producer-missing",
    missingContributorIds: [contributorId],
    omittedMissingContributorCount: 0,
    recovery: "renderer-recover"
  });
}
function contributeStandardSceneFeatures(context, targets, receiverAccesses, atmosphere) {
  const { color, colorResolve, depth: depth2 } = targets;
  return context.contributeFeatures({
    targets: [
      {
        name: "linear-hdr",
        kind: "scene-color",
        texture: color.texture,
        view: color.view,
        ...colorResolve === void 0 ? {} : { resolveTarget: colorResolve },
        format: color.format,
        sampleCount: color.sampleCount
      },
      {
        kind: "scene-depth",
        texture: depth2.texture,
        view: depth2.view,
        format: depth2.format,
        sampleCount: depth2.sampleCount
      }
    ],
    semanticTargets: [],
    namedTargets: {},
    standardSurfaceAccesses: receiverAccesses,
    exclude: [BARREL_DISTORTION_FEATURE_IDENTITY],
    passNames: [],
    atmosphere
  });
}
function addStandardPost(context, topology, scene, depth2, surface, sceneTemporal, secondaryReactivity, coverage, coverageDepth, volumeInput) {
  const clearOnly = topology.clearOnly === true;
  if (clearOnly && surface.display === void 0) {
    const overlay = addTypedDebugOverlayPass(context.graph, scene);
    if (!overlay.ok) return overlay;
    if (context.observationCaptureDomains?.includes("final-display") === true) {
      const captured = addObservationCapturePass(context.graph, scene, "final-display");
      if (!captured.ok) return captured;
    }
    return addTypedOutputTransformPass(context.graph, scene, surface.storage, {
      name: "standard-clear-present",
      fragmentEntryPoint: "fs_present"
    });
  }
  const outputPlan = createStandardOutputPlan({
    temporal: !clearOnly && topology.camera.antialias === "taa",
    meter: topology.output?.autoExposure === true,
    bloom: !clearOnly && standardBloomAdmitted(topology.camera),
    dof: !clearOnly && topology.camera.depthOfField !== void 0,
    lensFlare: !clearOnly && topology.camera.lensFlare === true,
    exposure: topology.output?.autoExposure === true,
    whiteBalance: topology.output?.whiteBalance === true,
    lut: topology.output?.colorLut === true,
    outline: !clearOnly && topology.camera.outline === true,
    barrelDistortion: topology.camera.barrelDistortion === true,
    lensEffects: !clearOnly && topology.camera.lensEffects === true,
    fxaa: !clearOnly && topology.camera.antialias === "fxaa",
    smaa: !clearOnly && topology.camera.antialias === "smaa"
  });
  if ((outputPlan.features.barrelDistortion || outputPlan.features.lensEffects || outputPlan.features.lensFlare) && context.capabilities?.rgba16floatRenderable !== true) {
    return err11(
      new RenderFeatureCapabilityMissingError(
        outputPlan.features.barrelDistortion ? BARREL_DISTORTION_FEATURE_IDENTITY : outputPlan.features.lensEffects ? LENS_EFFECTS_POST_PROCESS_ID : LENS_FLARE_POST_PROCESS_ID,
        0,
        "rgba16floatRenderable"
      )
    );
  }
  const hdr = !clearOnly && (topology.camera.tonemap !== "none" || topology.camera.antialias === "taa" || outputPlan.features.bloom);
  const bloomActive = hdr && outputPlan.features.bloom;
  const fxaa = outputPlan.features.fxaa;
  const linearLdr = !clearOnly && !hdr;
  const rawOnly = !clearOnly && topology.surface.profile?.kind === "raw-only";
  const outputDither = resolveOutputDither(topology.config);
  const motionBlur = !clearOnly && topology.temporal?.motionBlur === true;
  const preTemporalEffects = clearOnly ? [] : topology.preTemporalEffects ?? [];
  const postEffects = clearOnly ? [] : (topology.config?.postEffects ?? []).filter(
    (identity) => !preTemporalEffects.includes(identity) && identity !== BARREL_DISTORTION_POST_PROCESS_ID && identity !== LENS_EFFECTS_POST_PROCESS_ID && !isOutlinePostProcess(identity) && !isLensFlarePostProcess(identity) && !isSmaaPostProcess(identity)
  );
  const rawOnlyPostInput = rawOnly && postEffects.length > 0 ? target2(context, "standard-post-effects-input", {
    format: "rgba16float",
    size: "surface",
    usage: GPU_TEXTURE_USAGE_COPY_SRC,
    domain: "display-encoded"
  }) : void 0;
  if (rawOnlyPostInput !== void 0 && !rawOnlyPostInput.ok) return rawOnlyPostInput;
  const observedOutput = rawOnly && context.observationCaptureDomains?.includes("final-display") === true ? target2(context, "standard-observed-output", {
    format: topology.surface.storageFormat,
    size: "surface",
    domain: "display-encoded"
  }) : void 0;
  if (observedOutput !== void 0 && !observedOutput.ok) return observedOutput;
  const finalPresent = observedOutput?.value ?? surface.storage;
  let postInput = scene;
  let postTemporal = sceneTemporal;
  for (const [index, shader] of preTemporalEffects.entries()) {
    const output = target2(context, `scene-effect-output-${index}`, {
      format: scene.format,
      size: topology.extent === void 0 ? "surface" : renderExtentSize(topology.extent, "internal"),
      domain: "linear-hdr"
    });
    if (!output.ok) return output;
    const added = addTypedFullscreenPass(context.graph, {
      name: `scene-effect-${index}`,
      shader,
      input: postInput,
      outputs: [output.value],
      depth: depth2
    });
    if (!added.ok) return added;
    postInput = output.value;
  }
  const autoExposure = context.standardOutput?.autoExposure;
  if (outputPlan.features.exposure && autoExposure === void 0) {
    return err11(
      new RenderGraphError6({
        code: "resource-resolution-failed",
        expected: "a prepared same-frame auto-exposure producer projection",
        hint: "prepare device-scoped auto-exposure resources before compiling Standard output",
        detail: { resourceLabel: "standard-auto-exposure" }
      })
    );
  }
  if (topology.camera.antialias === "taa") {
    if (sceneTemporal === void 0) {
      return err11(missingTemporalContributor(topology, "forgeax::standard::scene-data"));
    }
    const history = context.taaHistory;
    if (history === void 0) {
      return err11(missingTemporalContributor(topology, "forgeax::standard::taa-history"));
    }
    const resolveTargets = {
      scene: postInput,
      depth: depth2,
      currentTemporal: sceneTemporal,
      ...coverage === void 0 ? {} : { coverage },
      ...coverageDepth === void 0 ? {} : { coverageDepth },
      ...secondaryReactivity === void 0 ? {} : { secondaryReactivity },
      historyColor: history.previousColor,
      historyTemporal: history.previousTemporal,
      historyStability: history.previousStability,
      writeColor: history.currentColor,
      writeTemporal: history.currentTemporal,
      writeStability: history.currentStability
    };
    const resolve = addTypedTemporalResolvePass(context.graph, resolveTargets);
    if (!resolve.ok) return resolve;
    postInput = history.currentColor;
    postTemporal = history.currentTemporal;
  }
  if (!clearOnly && topology.volumetricFog?.enabled === true && volumeInput !== void 0) {
    const volumeColor = target2(context, "post-temporal-volume-color", {
      format: postInput.format,
      size: topology.camera.antialias === "taa" || topology.extent === void 0 ? "surface" : renderExtentSize(topology.extent, "internal"),
      domain: "linear-hdr"
    });
    if (!volumeColor.ok) return volumeColor;
    const copied = addTypedOutputTransformPass(context.graph, postInput, volumeColor.value, {
      name: "volume-post-temporal-input",
      fragmentEntryPoint: "fs_present",
      dither: false
    });
    if (!copied.ok) return copied;
    const volume = addTranslucencyVolumetricFogPasses(context.graph, {
      ...volumeInput,
      topology,
      color: volumeColor.value,
      depth: depth2
    });
    if (!volume.ok) return volume;
    postInput = volumeColor.value;
  }
  if (outputPlan.features.exposure && autoExposure !== void 0) {
    const added = addAutoExposureGraphPasses(context, {
      source: postInput,
      resources: autoExposure,
      width: topology.surface.width,
      height: topology.surface.height
    });
    if (!added.ok) return added;
  }
  const featureTargets = [
    {
      kind: "scene-color",
      texture: scene.texture,
      view: scene.view,
      format: scene.format,
      sampleCount: scene.sampleCount
    },
    {
      kind: "scene-depth",
      texture: depth2.texture,
      view: depth2.view,
      format: depth2.format,
      sampleCount: depth2.sampleCount
    }
  ];
  if (!clearOnly) {
    if (motionBlur) {
      if (postTemporal === void 0) {
        return err11(
          new Error("Motion Blur requires the Standard scene-data producer")
        );
      }
      const blurred = target2(context, "motion-blurred-color", {
        format: "rgba16float",
        size: "surface",
        domain: hdr ? "linear-hdr" : "linear-ldr"
      });
      if (!blurred.ok) return blurred;
      const features = context.contributeFeatures({
        targets: featureTargets,
        semanticTargets: [postTemporal],
        namedTargets: {
          "motion-input": postInput,
          "motion-output": blurred.value
        },
        standardSurfaceAccesses: [],
        exclude: [BARREL_DISTORTION_FEATURE_IDENTITY]
      });
      if (!features.ok) return features;
      if (context.hasFeature?.("forgeax.motion-blur") === true) {
        postInput = blurred.value;
      } else {
        const fallback = addMotionBlurPass(context.graph, postInput, postTemporal, blurred.value);
        if (!fallback.ok) return fallback;
        postInput = blurred.value;
      }
    } else {
      const features = context.contributeFeatures({
        targets: featureTargets,
        semanticTargets: sceneTemporal === void 0 ? [] : [sceneTemporal],
        namedTargets: {},
        standardSurfaceAccesses: [],
        exclude: [BARREL_DISTORTION_FEATURE_IDENTITY]
      });
      if (!features.ok) return features;
    }
  }
  if (outputPlan.features.dof) {
    const dof = addDepthOfFieldPasses(
      {
        graph: context.graph,
        camera: context.camera ?? {},
        temporalTaa: topology.temporal?.taa === true,
        msaaActive: depth2.sampleCount === 4,
        ...topology.extent === void 0 ? {} : { extent: topology.extent }
      },
      postInput,
      depth2,
      topology.temporal?.taa === true ? postTemporal : void 0
    );
    if (!dof.ok) return dof;
    postInput = dof.value;
  }
  if (bloomActive) {
    const outputWidth = topology.extent?.outputWidth ?? topology.surface.width;
    const outputHeight = topology.extent?.outputHeight ?? topology.surface.height;
    const bloomSpecs = standardBloomTargetSpecs(outputWidth, outputHeight);
    const composited = target2(context, bloomSpecs.composited.label, bloomSpecs.composited);
    if (!composited.ok) return composited;
    const horizontal2 = [];
    for (const spec of bloomSpecs.horizontal) {
      const level = target2(context, spec.label, spec);
      if (!level.ok) return level;
      horizontal2.push(level.value);
    }
    const vertical = [];
    for (const spec of bloomSpecs.vertical) {
      const level = target2(context, spec.label, spec);
      if (!level.ok) return level;
      vertical.push(level.value);
    }
    const bloom = addTypedBloomPasses(context.graph, {
      scene: postInput,
      composited: composited.value,
      horizontal: horizontal2,
      vertical,
      levelDimensions: bloomSpecs.levels
    });
    if (!bloom.ok) return bloom;
    postInput = composited.value;
  }
  if (hdr && outputPlan.features.lensFlare) {
    const flare = addLensFlarePasses(context.graph, postInput, {
      width: topology.extent?.outputWidth ?? topology.surface.width,
      height: topology.extent?.outputHeight ?? topology.surface.height
    });
    if (!flare.ok) return flare;
    postInput = flare.value;
  }
  if (outputPlan.features.exposure || outputPlan.features.whiteBalance) {
    const exposureOutput = target2(context, "standard-exposure-white-balance", {
      format: "rgba16float",
      size: "surface",
      domain: "linear-hdr"
    });
    if (!exposureOutput.ok) return exposureOutput;
    const exposurePass = addAutoExposureExposurePass(
      context,
      postInput,
      exposureOutput.value,
      outputPlan.features.exposure ? autoExposure : void 0,
      {
        temperature: topology.output?.temperature ?? 6504,
        tint: topology.output?.tint ?? 0
      }
    );
    if (!exposurePass.ok) return exposurePass;
    postInput = exposureOutput.value;
  }
  const splitOutput = !clearOnly && (outputPlan.features.lut || outputPlan.features.exposure || outputPlan.features.whiteBalance || outputPlan.features.barrelDistortion || outputPlan.features.lensEffects || outputPlan.features.outline || outputPlan.features.smaa);
  const fusedToneLut = !clearOnly && !rawOnly && outputPlan.features.lut && (topology.camera.antialias === "none" || topology.camera.antialias === "taa" && (topology.extent === void 0 || topology.extent.internalWidth === topology.extent.outputWidth && topology.extent.internalHeight === topology.extent.outputHeight)) && !outputPlan.features.outline && !outputPlan.features.barrelDistortion && !outputPlan.features.lensEffects && postEffects.length === 0 && (context.observationCaptureDomains?.length ?? 0) === 0;
  const toneOutput = !fusedToneLut && (splitOutput || context.observationCaptureDomains?.includes("linear-ldr") === true) ? target2(context, "standard-tone-output", {
    format: "rgba16float",
    size: "surface",
    domain: "linear-ldr"
  }) : void 0;
  if (toneOutput !== void 0) {
    if (!toneOutput.ok) return toneOutput;
    const transformed = addTypedOutputTransformPass(context.graph, postInput, toneOutput.value, {
      dither: false,
      name: "standard-tone",
      fragmentEntryPoint: "fs_tone_only"
    });
    if (!transformed.ok) return transformed;
    if (splitOutput) {
      postInput = toneOutput.value;
    } else {
      const captured = addObservationCapturePass(context.graph, toneOutput.value, "linear-ldr");
      if (!captured.ok) return captured;
    }
  }
  if (outputPlan.features.lut) {
    const colorLut = context.standardOutput?.colorLut;
    if (colorLut === void 0) {
      return err11(
        new RenderGraphError6({
          code: "resource-resolution-failed",
          expected: "a prepared resident Standard color LUT projection",
          hint: "resolve and admit the TextureAsset LUT before compiling Standard output",
          detail: { resourceLabel: "standard-color-lut" }
        })
      );
    }
    if (fusedToneLut) {
      const fused = addStandardToneLutPass(
        context.graph,
        postInput,
        finalPresent,
        colorLut,
        outputDither
      );
      if (!fused.ok) return fused;
      postInput = finalPresent;
    } else {
      const lutOutput = target2(context, "standard-color-lut", {
        format: "rgba16float",
        size: "surface",
        domain: "linear-ldr"
      });
      if (!lutOutput.ok) return lutOutput;
      const lutPass = addStandardColorLutPass(context.graph, postInput, lutOutput.value, colorLut);
      if (!lutPass.ok) return lutPass;
      postInput = lutOutput.value;
    }
  }
  if (outputPlan.features.outline) {
    const outlined = addOutlinePasses(context.graph, postInput, depth2);
    if (!outlined.ok) return outlined;
    postInput = outlined.value;
  }
  const debugOverlayBeforePost = outputPlan.features.barrelDistortion || outputPlan.features.lensEffects;
  if (rawOnly || debugOverlayBeforePost) {
    const overlay = addTypedDebugOverlayPass(context.graph, postInput);
    if (!overlay.ok) return overlay;
  }
  if (outputPlan.features.barrelDistortion) {
    const barrelOutput = target2(context, "standard-barrel-distortion", {
      format: "rgba16float",
      size: "surface",
      domain: "linear-ldr"
    });
    if (!barrelOutput.ok) return barrelOutput;
    const barrel = context.contributeFeatures({
      targets: featureTargets,
      semanticTargets: [],
      namedTargets: { "barrel-input": postInput, "barrel-output": barrelOutput.value },
      standardSurfaceAccesses: [],
      include: [BARREL_DISTORTION_FEATURE_IDENTITY]
    });
    if (!barrel.ok) return barrel;
    if (context.hasFeature?.(BARREL_DISTORTION_FEATURE_IDENTITY) !== true) {
      return err11(
        new RenderFeatureCapabilityMissingError(
          BARREL_DISTORTION_FEATURE_IDENTITY,
          0,
          "rgba16floatRenderable"
        )
      );
    }
    postInput = barrelOutput.value;
  }
  if (outputPlan.features.smaa) {
    const antialiased = addSmaaPasses(context.graph, postInput);
    if (!antialiased.ok) return antialiased;
    postInput = antialiased.value;
  }
  if (hdr || linearLdr || fxaa || rawOnly || motionBlur) {
    if (fxaa) {
      const output = splitOutput ? target2(context, "standard-fxaa-output", {
        format: "rgba16float",
        size: "surface",
        domain: "linear-ldr"
      }) : target2(context, "standard-output-color", {
        format: "rgba16float",
        size: "surface",
        usage: GPU_TEXTURE_USAGE_COPY_SRC,
        domain: "display-encoded"
      });
      if (!output.ok) return output;
      if (!splitOutput) {
        const outputTransform = addTypedOutputTransformPass(
          context.graph,
          postInput,
          output.value,
          { dither: false }
        );
        if (!outputTransform.ok) return outputTransform;
      }
      const aa = addTypedFullscreenPass(context.graph, {
        name: "fxaa",
        shader: "fxaa",
        input: splitOutput ? postInput : output.value,
        outputs: [splitOutput ? output.value : rawOnlyPostInput?.value ?? finalPresent],
        ...splitOutput ? {
          paramsTransform: () => new Uint8Array(16)
        } : {}
      });
      if (!aa.ok) return aa;
      if (splitOutput) postInput = output.value;
    } else if (rawOnlyPostInput !== void 0 && !splitOutput) {
      const transformed = addTypedOutputTransformPass(
        context.graph,
        postInput,
        rawOnlyPostInput.value,
        {
          dither: outputDither && postEffects.length === 0
        }
      );
      if (!transformed.ok) return transformed;
    } else if ((rawOnly || linearLdr) && !splitOutput) {
      const transformed = addTypedOutputTransformPass(context.graph, postInput, finalPresent, {
        dither: outputDither
      });
      if (!transformed.ok) return transformed;
    } else if (!splitOutput) {
      const outputTransform = addTypedOutputTransformPass(context.graph, postInput, finalPresent, {
        dither: outputDither
      });
      if (!outputTransform.ok) return outputTransform;
    }
  }
  if (outputPlan.features.lensEffects) {
    const lensOutput = target2(context, "standard-lens-effects", {
      format: "rgba16float",
      size: "surface",
      domain: "linear-ldr"
    });
    if (!lensOutput.ok) return lensOutput;
    const lens = addTypedFullscreenPass(context.graph, {
      name: "lens-effects",
      shader: LENS_EFFECTS_POST_PROCESS_ID,
      input: postInput,
      outputs: [lensOutput.value]
    });
    if (!lens.ok) return lens;
    postInput = lensOutput.value;
  }
  if (splitOutput && !fusedToneLut) {
    const encodedOutput = rawOnlyPostInput?.value ?? finalPresent;
    const outputTransform = addTypedOutputTransformPass(context.graph, postInput, encodedOutput, {
      dither: outputDither,
      name: "standard-output-encoding",
      fragmentEntryPoint: "fs_encode_only",
      observationCaptureDomains: context.observationCaptureDomains?.filter(
        (domain) => domain !== "final-display"
      )
    });
    if (!outputTransform.ok) return outputTransform;
    postInput = encodedOutput;
  }
  if (postEffects.length > 0) {
    const postInputTarget = rawOnly ? rawOnlyPostInput?.value : surface.storage;
    if (postInputTarget === void 0) {
      return err11(
        new RenderGraphError6({
          code: "resource-descriptor-invalid",
          expected: "raw-only post effects have a graph-owned encoded input target",
          hint: "retain the candidate LKG when the post-effect input target cannot be declared",
          detail: {
            resourceLabel: "standard-post-effects-input",
            field: "descriptor",
            expected: "rgba16float display-encoded target",
            actual: "absent"
          }
        })
      );
    }
    const effects = addTypedCompositePostEffects(
      context.graph,
      postEffects,
      postInputTarget,
      finalPresent,
      depth2,
      topology.surface
    );
    if (!effects.ok) return effects;
  }
  if (!rawOnly && !debugOverlayBeforePost) {
    const overlay = addTypedDebugOverlayPass(context.graph, surface.display ?? surface.storage);
    if (!overlay.ok) return overlay;
  }
  if (context.observationCaptureDomains?.includes("final-display") === true) {
    const captured = addObservationCapturePass(context.graph, finalPresent, "final-display");
    if (!captured.ok) return captured;
  }
  if (observedOutput !== void 0) {
    const presented = addTypedOutputTransformPass(context.graph, finalPresent, surface.storage, {
      name: "standard-observed-present",
      fragmentEntryPoint: "fs_present"
    });
    if (!presented.ok) return presented;
  }
  return ok33(void 0);
}

// sdk/engine/node_modules/@forgeax/engine-render/src/pipeline/standard-forward-lane.ts
function target3(graph, label, descriptor) {
  return createRenderPipelineTarget(graph, label, descriptor);
}
function buildUrp(context, topology, lighting, reuseAdjacentShadow = false) {
  const graph = context.graph;
  const surface = importRenderPipelineSurface(graph, topology);
  if (!surface.ok) return surface;
  const internalSize = topology.extent === void 0 ? "surface" : renderExtentSize(topology.extent, "internal");
  const internalCopySize = topology.extent === void 0 ? { width: topology.surface.width, height: topology.surface.height } : renderExtentSize(topology.extent, "internal");
  const clearOnly = topology.clearOnly === true;
  const msaa = !clearOnly && topology.camera.antialias === "msaa" && topology.lane.multisample;
  const hdr = !clearOnly && (topology.camera.tonemap !== "none" || topology.camera.antialias === "taa");
  const fxaa = !clearOnly && topology.camera.antialias === "fxaa";
  const taa = !clearOnly && topology.camera.antialias === "taa";
  const rawOnly = !clearOnly && topology.surface.profile?.kind === "raw-only";
  const linearLdr = !clearOnly && !hdr;
  const temporalDemand = aggregateTemporalDemand({
    taa,
    motionBlur: !clearOnly && topology.temporal?.motionBlur === true
  });
  const needsTemporalIntermediate = temporalDemand.targetCount === 1;
  const sceneFormat = context.forwardOutput?.format ?? (hdr || linearLdr || rawOnly || needsTemporalIntermediate || topology.singleLayerMedium === true ? "rgba16float" : topology.surface.storageFormat);
  const depth2 = target3(graph, "scene-depth", {
    format: "depth32float-stencil8",
    size: internalSize,
    sampleCount: msaa ? 4 : 1
  });
  if (!depth2.ok) return depth2;
  const sceneResolved = clearOnly ? surface.value.display === void 0 ? target3(graph, "scene-color", {
    format: topology.surface.storageFormat,
    size: "surface",
    sampleCount: 1,
    domain: "display-encoded"
  }) : ok34(surface.value.display) : hdr || fxaa || linearLdr || msaa || rawOnly || needsTemporalIntermediate || topology.singleLayerMedium === true ? target3(graph, "scene-color", {
    format: sceneFormat,
    size: internalSize,
    sampleCount: 1,
    domain: context.forwardOutput?.domain ?? "linear-ldr",
    ...sceneFormat === topology.surface.storageFormat && topology.surface.storageFormat !== topology.surface.viewFormat ? { viewFormats: [topology.surface.viewFormat] } : {}
  }) : surface.value.display === void 0 ? target3(graph, "scene-color", {
    format: topology.surface.storageFormat,
    size: "surface",
    sampleCount: 1,
    domain: "display-encoded"
  }) : ok34(surface.value.display);
  if (!sceneResolved.ok) return sceneResolved;
  const scene = msaa ? target3(graph, "scene-color-msaa", {
    format: sceneFormat,
    size: internalSize,
    sampleCount: 4,
    domain: context.forwardOutput?.domain ?? "linear-ldr",
    ...sceneFormat === topology.surface.storageFormat && topology.surface.storageFormat !== topology.surface.viewFormat ? { viewFormats: [topology.surface.viewFormat] } : {}
  }) : sceneResolved;
  if (!scene.ok) return scene;
  const mediumTargets = topology.singleLayerMedium === true ? (() => {
    const nearestLayer = target3(graph, "single-layer-medium-nearest-layer", {
      format: scene.value.format,
      size: internalSize,
      sampleCount: msaa ? 4 : 1,
      domain: context.forwardOutput?.domain ?? "linear-ldr"
    });
    if (!nearestLayer.ok) return nearestLayer;
    const nearestDepth = target3(graph, "single-layer-medium-nearest-depth", {
      format: "depth32float-stencil8",
      size: internalSize,
      sampleCount: msaa ? 4 : 1
    });
    if (!nearestDepth.ok) return nearestDepth;
    return ok34({ nearestLayer: nearestLayer.value, nearestDepth: nearestDepth.value });
  })() : ok34(void 0);
  if (!mediumTargets.ok) return mediumTargets;
  const reflectionFallback = topology.reflectionFallback?.enabled ? target3(graph, "reflection-fallback-linear-hdr", {
    format: "rgba16float",
    size: internalSize,
    sampleCount: scene.value.sampleCount,
    domain: "linear-hdr",
    usage: GPU_TEXTURE_USAGE_COPY_SRC | GPU_TEXTURE_USAGE_RENDER_ATTACHMENT | GPU_TEXTURE_USAGE_TEXTURE_BINDING
  }) : ok34(void 0);
  if (!reflectionFallback.ok) return reflectionFallback;
  if (reflectionFallback.value !== void 0) {
    const initialized = graph.addRasterPass("reflection-fallback-clear", {
      accesses: [{ resource: reflectionFallback.value.view, usage: "color-attachment" }],
      colorAttachments: [
        {
          view: reflectionFallback.value.view,
          loadOp: "clear",
          storeOp: "store",
          clearValue: { r: 0, g: 0, b: 0, a: 0 }
        }
      ],
      encode: () => {
      }
    });
    if (!initialized.ok) return initialized;
  }
  const featureShadows = context.contributeShadowFeatures?.();
  if (featureShadows !== void 0 && !featureShadows.ok) return featureShadows;
  const shadows = addTypedShadowPasses(graph, topology, {
    projectGpuDrivenShadow: context.projectGpuDrivenShadow,
    shadowFeatures: featureShadows?.value,
    staticLayers: context.gpuDrivenShadowDepthLayers,
    depthLayers: context.shadowDepthLayers,
    reuseAdjacentShadow
  });
  if (!shadows.ok) return shadows;
  const clusterBuffers = clearOnly ? ok34(null) : importStandardClusterBuffers(graph, lighting);
  if (!clusterBuffers.ok) return clusterBuffers;
  const clusterMembership = clusterBuffers.value === null ? ok34(void 0) : addStandardClusterMembershipPass(graph, lighting, clusterBuffers.value);
  if (!clusterMembership.ok) return clusterMembership;
  const clusterReads = clusterBuffers.value === null ? [] : standardClusterReadAccesses(clusterBuffers.value);
  const atmosphere = topology.atmosphere === true ? addAtmosphereBackground(graph, scene.value) : ok34(void 0);
  if (!atmosphere.ok) return atmosphere;
  if (atmosphere.value === void 0) {
    const skybox = addTypedSkyboxPass(graph, scene.value);
    if (!skybox.ok) return skybox;
  }
  const gpuDriven = context.projectGpuDriven({
    format: scene.value.format,
    sampleCount: scene.value.sampleCount,
    lateOcclusion: topology.config?.gpuOcclusion !== false,
    ...reflectionFallback.value === void 0 ? {} : {
      additionalColorFormats: [reflectionFallback.value.format]
    }
  });
  if (!gpuDriven.ok) return gpuDriven;
  const transmissionDemand = transmissionDemandForTopology(topology);
  const backdropDemand = {
    activeCount: transmissionDemand.activeCount + (topology.singleLayerMedium === true ? 1 : 0),
    needsRoughMips: transmissionDemand.needsRoughMips
  };
  const transmissionActive = resolveTransmissionBackdropTopology({
    demand: transmissionDemand,
    sourceSampleCount: scene.value.sampleCount
  }).active;
  const backdropActive = resolveTransmissionBackdropTopology({
    demand: backdropDemand,
    sourceSampleCount: scene.value.sampleCount
  }).active;
  const featureRasterWork = context.hasFeatureRasterWork?.(CLOUD_LAYER_FEATURE_IDENTITY, "scene") === true;
  const cloudScene = createStandardCloudSceneTarget(context, featureRasterWork && !msaa, {
    format: sceneResolved.value.format,
    size: internalSize,
    domain: hdr ? "linear-hdr" : "linear-ldr"
  });
  if (!cloudScene.ok) return cloudScene;
  const cloudShadow = createStandardCloudShadowTarget(context, featureRasterWork);
  if (!cloudShadow.ok) return cloudShadow;
  const targetCaptures = context.contributeCubeCaptures?.(atmosphere.value);
  if (targetCaptures !== void 0 && !targetCaptures.ok) return targetCaptures;
  const featureTargets = contributeStandardCloudPreOpaque(context, {
    color: sceneResolved.value,
    depth: depth2.value,
    cloudShadow: cloudShadow.value
  });
  if (!featureTargets.ok) return featureTargets;
  const receiver = standardForwardReceiverInputs({
    shadows: shadows.value,
    cloudShadow: cloudShadow.value,
    clusterReads
  });
  const mainOptions = {
    environment: atmosphere.value,
    name: "main",
    color: scene.value,
    ...reflectionFallback.value === void 0 ? {} : { colorTargets: [scene.value, reflectionFallback.value] },
    depth: depth2.value,
    ...msaa ? { resolve: sceneResolved.value } : {},
    ...receiver,
    selector: FORWARD_PASS_SELECTOR,
    colorLoadOp: "load",
    // Opaque, transmission and ordinary transparency are separate queue
    // segments. Keeping the opaque filter unconditional prevents an
    // ordinary transparent material from being drawn before the cloud pass.
    recordMode: "opaque",
    gpuDrivenFilter: "opaque",
    ...gpuDriven.value === void 0 ? {} : { gpuDriven: gpuDriven.value }
  };
  const main = addTypedScenePass(graph, mainOptions);
  if (!main.ok) return main;
  const depthSample = graph.view(depth2.value.texture, {
    label: "occlusion-scene-depth",
    dimension: "2d",
    aspect: "depth-only"
  });
  if (!depthSample.ok) return depthSample;
  const late = addGpuLateOcclusion(graph, {
    gpuDriven: gpuDriven.value,
    depth: depthSample.value,
    multisampled: msaa,
    width: internalCopySize.width,
    height: internalCopySize.height,
    view: sceneViewImport(graph)
  });
  if (!late.ok) return late;
  if (late.value !== void 0) {
    const mainLate = addTypedScenePass(graph, {
      ...mainOptions,
      name: "main-late",
      depthLoadOp: "load",
      gpuDrivenPhase: "late"
    });
    if (!mainLate.ok) return mainLate;
  }
  const opaqueMediumPair = topology.singleLayerMedium === true && msaa ? addSingleLayerMediumMsaaPairProducer({
    graph,
    label: "single-layer-medium-opaque-resolve",
    sourceColor: scene.value,
    sourceDepth: depth2.value,
    size: internalSize
  }) : ok34(void 0);
  if (!opaqueMediumPair.ok) return opaqueMediumPair;
  if (cloudScene.value !== void 0) {
    const compositeFeatures = contributeStandardCloudComposite(
      context,
      featureTargets.value,
      { input: sceneResolved.value, output: cloudScene.value, cloudShadow: cloudShadow.value },
      []
    );
    if (!compositeFeatures.ok) return compositeFeatures;
  }
  const temporalAdmission = requireStandardTemporalLane({
    demand: temporalDemand,
    compute: topology.lane.compute,
    storageBuffer: topology.lane.storageBuffer,
    rgba16floatRenderable: context.capabilities?.rgba16floatRenderable ?? false
  });
  if (!temporalAdmission.ok) return temporalAdmission;
  const temporal = temporalDemand.targetCount === 1 ? createStandardSceneDataTarget(graph, topology.extent) : ok34(void 0);
  if (!temporal.ok) return temporal;
  if (temporal.value !== void 0) {
    const producer = addStandardSceneDataPass(
      graph,
      temporal.value.temporal,
      depth2.value,
      gpuDriven.value
    );
    if (!producer.ok) return producer;
  }
  if (context.targetCoverage !== void 0) {
    const coverage = addTargetCoveragePass(graph, context.targetCoverage, gpuDriven.value);
    if (!coverage.ok) return coverage;
  }
  let sceneForLater = scene.value;
  let sceneResolvedForLater = sceneResolved.value;
  if (cloudScene.value !== void 0) {
    sceneForLater = cloudScene.value;
    sceneResolvedForLater = cloudScene.value;
  }
  const fogged = addOpaqueFogPasses(graph, {
    topology,
    color: sceneResolvedForLater,
    depth: depth2.value
  });
  if (!fogged.ok) return fogged;
  const sortedTransmission = transmissionActive && topology.transparency?.weightedBlended !== true && topology.singleLayerMedium !== true;
  if (sortedTransmission && transmissionDemand.needsBackPass === true) {
    const backdrop = addTransmissionBackdropPasses({
      graph,
      name: "transmission-backdrop-backs",
      source: sceneResolvedForLater,
      demand: transmissionDemand,
      copySize: internalCopySize,
      surfaceSize: topology.surface,
      encodeRoughMip: context.encodeTransmissionMip,
      includeConsumerPasses: false
    });
    if (!backdrop.ok) return backdrop;
    const backs = addTypedScenePass(graph, {
      environment: atmosphere.value,
      name: "transmission-backs",
      color: sceneForLater,
      depth: depth2.value,
      ...msaa ? { resolve: sceneResolvedForLater } : {},
      ...receiver,
      selector: TRANSMISSION_BACK_PASS_SELECTOR,
      colorLoadOp: "load",
      depthLoadOp: "load",
      recordMode: "transmission",
      transparentDepthWrite: true,
      transmissionBackdrop: backdrop.value.backdrop?.view
    });
    if (!backs.ok) return backs;
  }
  if (sortedTransmission) {
    const prefix = addTypedScenePass(graph, {
      environment: atmosphere.value,
      name: "transparent-before-transmission",
      color: sceneForLater,
      depth: depth2.value,
      ...msaa ? { resolve: sceneResolvedForLater } : {},
      ...receiver,
      selector: REFRACTION_INNER_PASS_SELECTOR,
      colorLoadOp: "load",
      depthLoadOp: "load",
      recordMode: "translucent-before-transmission",
      transparentDepthWrite: true
    });
    if (!prefix.ok) return prefix;
  }
  const transmission = addTransmissionBackdropPasses({
    graph,
    source: sceneResolvedForLater,
    demand: backdropDemand,
    copySize: internalCopySize,
    surfaceSize: topology.surface,
    encodeRoughMip: context.encodeTransmissionMip,
    includeConsumerPasses: false
  });
  if (!transmission.ok) return transmission;
  if (topology.singleLayerMedium === true) {
    const medium = requireSingleLayerMediumInputs(
      mediumTargets.value,
      transmission.value.backdrop?.view
    );
    if (!medium.ok) return medium;
    let rawDepthTarget = opaqueMediumPair.value?.depth;
    if (rawDepthTarget === void 0) {
      const rawDepth = addSingleLayerMediumRawDepthProducer({
        graph,
        sourceColor: sceneResolvedForLater,
        sourceDepth: depth2.value,
        size: internalSize
      });
      if (!rawDepth.ok) return rawDepth;
      rawDepthTarget = rawDepth.value;
    }
    const surfacePair = {
      opaqueColor: opaqueMediumPair.value?.color.view ?? medium.value.backdrop,
      rawDepth: rawDepthTarget === void 0 ? { status: "unavailable", reason: "depth-copy-unavailable" } : { status: "available", view: rawDepthTarget.view }
    };
    const mediumPasses = addSingleLayerMediumPasses({
      graph,
      size: internalSize,
      ...medium.value.nearestTargets,
      color: sceneForLater,
      ...msaa ? { colorResolve: sceneResolvedForLater } : {},
      depth: depth2.value,
      ...receiver,
      extraAccesses: [
        ...receiver.extraAccesses,
        ...targetCaptures?.value === void 0 ? [] : [{ resource: targetCaptures.value, usage: "sampled-read" }]
      ],
      surfacePair,
      ...gpuDriven.value === void 0 ? {} : { gpuDriven: gpuDriven.value }
    });
    if (!mediumPasses.ok) return mediumPasses;
  }
  if (backdropActive) {
    if (transmissionActive) {
      const transmissionPass = addTypedScenePass(graph, {
        environment: atmosphere.value,
        name: "transmission-forward",
        color: sceneForLater,
        depth: depth2.value,
        ...msaa ? { resolve: sceneResolvedForLater } : {},
        ...receiver,
        selector: sortedTransmission ? REFRACTION_INNER_PASS_SELECTOR : FORWARD_PASS_SELECTOR,
        colorLoadOp: "load",
        depthLoadOp: "load",
        recordMode: sortedTransmission ? "translucent" : "transmission",
        transparentDepthWrite: true,
        // Inject the complete backdrop view so the Standard shader can select
        // the producer's optional roughness mip level. mipViews[0] is only the
        // copy destination view and intentionally exposes one level.
        transmissionBackdrop: transmission.value.backdrop?.view
      });
      if (!transmissionPass.ok) return transmissionPass;
      if (sortedTransmission && transmissionDemand.needsBackPass === true) {
        const outerBackdrop = addTransmissionBackdropPasses({
          graph,
          name: "transmission-outer-backdrop",
          source: sceneResolvedForLater,
          demand: backdropDemand,
          copySize: internalCopySize,
          surfaceSize: topology.surface,
          encodeRoughMip: context.encodeTransmissionMip,
          includeConsumerPasses: false
        });
        if (!outerBackdrop.ok) return outerBackdrop;
        const outer = addTypedScenePass(graph, {
          environment: atmosphere.value,
          name: "transmission-outer-forward",
          color: sceneForLater,
          depth: depth2.value,
          ...msaa ? { resolve: sceneResolvedForLater } : {},
          ...receiver,
          selector: REFRACTION_OUTER_PASS_SELECTOR,
          colorLoadOp: "load",
          depthLoadOp: "load",
          passKind: "forward",
          recordMode: "transmission",
          transparentDepthWrite: true,
          transmissionBackdrop: outerBackdrop.value.backdrop?.view
        });
        if (!outer.ok) return outer;
      }
    }
  }
  const transparentPass = sortedTransmission ? ok34(void 0) : addStandardTransparentPasses(graph, {
    color: sceneForLater,
    ...msaa ? { resolve: sceneResolvedForLater } : {},
    depth: depth2.value,
    size: internalSize,
    transparency: topology.transparency,
    template: {
      environment: atmosphere.value,
      ...receiver
    }
  });
  if (!transparentPass.ok) return transparentPass;
  if (backdropActive) {
    const temporal2 = addTransmissionBackdropTemporalPass(graph, sceneResolvedForLater);
    if (!temporal2.ok) return temporal2;
  }
  const volume = context.forwardOutput === void 0 ? ok34(void 0) : addTranslucencyVolumetricFogPasses(graph, {
    topology,
    color: sceneResolvedForLater,
    depth: depth2.value,
    directionalShadow: shadows.value.directional?.view,
    spotShadow: shadows.value.spot.view,
    clusterBuffers: clusterBuffers.value,
    cloudShadow: cloudShadow.value?.view
  });
  if (!volume.ok) return volume;
  const features = contributeStandardSceneFeatures(
    context,
    {
      color: sceneForLater,
      colorResolve: msaa ? sceneResolvedForLater.view : void 0,
      depth: depth2.value
    },
    standardForwardReceiverFeatureAccesses(receiver)
  );
  if (!features.ok) return features;
  if (context.forwardOutput === void 0 && (hdr || linearLdr || rawOnly)) {
    const observation = addTypedFrameObservationPass(graph, sceneResolvedForLater);
    if (!observation.ok) return observation;
  }
  if (reflectionFallback.value?.sampleCount === 1) {
    const fallbackObservation = addReflectionFallbackObservationPass(
      graph,
      reflectionFallback.value
    );
    if (!fallbackObservation.ok) return fallbackObservation;
  }
  if (context.forwardOutput !== void 0)
    return context.forwardOutput.build(
      context,
      topology,
      sceneResolvedForLater,
      depth2.value,
      surface.value
    );
  const post = addStandardPost(
    context,
    topology,
    sceneResolvedForLater,
    depth2.value,
    surface.value,
    temporal.value?.temporal,
    void 0,
    context.targetCoverage?.coverage,
    context.targetCoverage?.depth,
    {
      directionalShadow: shadows.value.directional?.view,
      spotShadow: shadows.value.spot.view,
      clusterBuffers: clusterBuffers.value,
      cloudShadow: cloudShadow.value?.view
    }
  );
  if (!post.ok) return post;
  return ok34(void 0);
}
var buildStandardForwardLane = buildUrp;

// sdk/engine/node_modules/@forgeax/engine-render/src/pipeline/standard-lighting/topology.ts
import { err as err12, ok as ok35 } from "@forgeax/engine-types";
function standardLightingTopologySignature(input) {
  if (input === void 0) return "missing";
  if (input.kind === "no-local-lights") return "no-local-lights";
  return JSON.stringify({
    kind: input.kind,
    transport: input.transport.kind,
    producer: input.transport.producer,
    grid: input.prepared.layout.grid,
    clusterGridU32Length: input.prepared.layout.clusterGridU32Length,
    lightIndexListCapacity: input.prepared.layout.lightIndexListCapacity,
    lightDataSlotCount: input.prepared.layout.lightDataSlotCount,
    lightBoundsInt32Length: input.prepared.layout.lightBoundsInt32Length
  });
}
function invalid(field) {
  return err12({
    code: "topology-input-invalid",
    expected: "prepared Standard lighting topology input",
    hint: "derive topology from prepared Standard lighting",
    detail: { field }
  });
}
function deriveStandardTopologyInput(input) {
  const candidate = input;
  if ("lights" in candidate) return invalid("lights");
  if ("capabilities" in candidate) return invalid("capabilities");
  if (input === null || typeof input !== "object") return invalid("kind");
  if (input.prepared === null || typeof input.prepared !== "object") {
    return invalid("prepared");
  }
  const prepared = input.prepared;
  if (input.kind === "no-local-lights") {
    if (prepared.local.length !== 0 || "transport" in candidate) return invalid("transport");
    return ok35(input);
  }
  if (input.kind !== "clustered") return invalid("kind");
  if (!("transport" in candidate) || candidate.transport === null || typeof candidate.transport !== "object") {
    return invalid("transport");
  }
  const transport = input.transport;
  const requested = prepared.local.length;
  const transportMatchesPrepared = transport.layout === prepared.layout && transport.requestedLightCount === requested && transport.admittedLightCount === requested && transport.membershipEntryCount === prepared.membershipEntryCount && transport.lightBoundsBytes === prepared.lightBounds.byteLength;
  const producerMatchesKind = transport.producer === "gpu" && transport.kind === "compute-storage" || transport.producer === "cpu" && (transport.kind === "cpu-storage" || transport.kind === "cpu-texture");
  if (!transportMatchesPrepared || !producerMatchesKind) return invalid("transport");
  return ok35(input);
}

// sdk/engine/node_modules/@forgeax/engine-render/src/pipeline/standard-pipeline.ts
var STANDARD_CLUSTER_MEMBERSHIP_WGSL = (
  /* wgsl */
  `
struct ClusterUniform {
  grid : vec4<u32>,
  near_far_log : vec4<f32>,
};

@group(0) @binding(0) var<storage, read> cluster_grid : array<u32>;
@group(0) @binding(1) var<storage, read_write> light_index_list : array<u32>;
@group(0) @binding(2) var<uniform> cluster_uniform : ClusterUniform;
@group(0) @binding(3) var<storage, read> light_bounds : array<i32>;

@compute @workgroup_size(64)
fn cs_cluster_membership(@builtin(global_invocation_id) global_id : vec3<u32>) {
  let cluster_index = global_id.x;
  let grid_x = cluster_uniform.grid.x;
  let grid_y = cluster_uniform.grid.y;
  let grid_z = cluster_uniform.grid.z;
  let cluster_count = grid_x * grid_y * grid_z;
  if (cluster_index >= cluster_count) {
    return;
  }

  let cluster_x = cluster_index % grid_x;
  let cluster_yz = cluster_index / grid_x;
  let cluster_y = cluster_yz % grid_y;
  let cluster_z = cluster_yz / grid_y;
  let grid_offset = cluster_index * 2u;
  let output_offset = cluster_grid[grid_offset];
  let output_count = cluster_grid[grid_offset + 1u];
  let cluster_x_i = i32(cluster_x);
  let cluster_y_i = i32(cluster_y);
  let cluster_z_i = i32(cluster_z);
  var output_index = output_offset;

  var light_index = 0u;
  loop {
    if (light_index >= cluster_uniform.grid.w || light_index >= 256u) {
      break;
    }
    let bounds_offset = light_index * 6u;
    let min_x = light_bounds[bounds_offset];
    if (min_x >= 0) {
      let min_y = light_bounds[bounds_offset + 1u];
      let min_z = light_bounds[bounds_offset + 2u];
      let max_x = light_bounds[bounds_offset + 3u];
      let max_y = light_bounds[bounds_offset + 4u];
      let max_z = light_bounds[bounds_offset + 5u];
      if (
        cluster_x_i >= min_x && cluster_x_i <= max_x &&
        cluster_y_i >= min_y && cluster_y_i <= max_y &&
        cluster_z_i >= min_z && cluster_z_i <= max_z
      ) {
        if (output_index < output_offset + output_count) {
          light_index_list[output_index] = light_index;
          output_index += 1u;
        }
      }
    }
    light_index += 1u;
  }
}
`
);
function validateClusterGrid(grid) {
  const { x, y, z } = grid;
  return Number.isInteger(x) && Number.isInteger(y) && Number.isInteger(z) && x >= 1 && x <= 64 && y >= 1 && y <= 64 && z >= 1 && z <= 64 ? ok36({ x, y, z }) : err13(
    new StandardProfileInvalidError(
      `clusterGrid {x:${x}, y:${y}, z:${z}} is invalid; set x, y, and z to positive integers in [1, 64]`,
      { field: "clusterGrid", actual: { x, y, z } }
    )
  );
}
function target4(graph, label, descriptor) {
  return createRenderPipelineTarget(graph, label, descriptor);
}
function buildStandardDeferredLane(context, topology, lighting, reuseAdjacentShadow = false) {
  const visibleSurfaceEnabled = topology.standardProfile?.visibleSurface === true;
  const formats = topology.subsurface === void 0 ? DEFERRED_COLOR_FORMATS : SUBSURFACE_DEFERRED_COLOR_FORMATS;
  const attachmentBytes = topology.subsurface === void 0 ? DEFERRED_ATTACHMENT_BYTES : SUBSURFACE_ATTACHMENT_BYTES;
  const requiredSurfaceBytes = visibleSurfaceEnabled ? attachmentBytes.visibleSurface : attachmentBytes.surface;
  if (visibleSurfaceEnabled && (topology.lane.primitiveIndex !== true || topology.lane.maxColorAttachments < 7 || (topology.lane.maxColorAttachmentBytesPerSample ?? 0) < DEFERRED_ATTACHMENT_BYTES.visibleSurface || topology.camera.antialias === "msaa")) {
    return err13(
      new RenderGraphError7({
        code: "resource-descriptor-invalid",
        expected: `visible surfaces require primitive-index, seven targets, ${DEFERRED_ATTACHMENT_BYTES.visibleSurface} attachment bytes and single sampling`,
        hint: "request these device features/limits before enabling visibleSurface",
        detail: {
          resourceLabel: "visible-surface",
          field: "capabilities",
          expected: `primitive-index / 7 targets / ${DEFERRED_ATTACHMENT_BYTES.visibleSurface} bytes / single sample`,
          actual: JSON.stringify(topology.lane)
        }
      })
    );
  }
  if (!topology.lane.storageBuffer || topology.lane.maxColorAttachments < DEFERRED_COLOR_FORMATS.length) {
    return err13(
      new RenderGraphError7({
        code: "resource-descriptor-invalid",
        expected: "Standard deferred requires storage buffers and six color attachments",
        hint: "select a device with deferred capabilities or explicitly select the Forward profile",
        detail: {
          resourceLabel: "forgeax::standard",
          field: "renderPath",
          expected: "storage buffers and six MRTs",
          actual: `storageBuffer=${topology.lane.storageBuffer}, maxColorAttachments=${topology.lane.maxColorAttachments}`
        }
      })
    );
  }
  if ((topology.lane.maxColorAttachmentBytesPerSample ?? 32) < requiredSurfaceBytes) {
    return err13(
      new RenderGraphError7({
        code: "resource-descriptor-invalid",
        expected: "Deferred attachments fit the device byte limit",
        hint: `request at least ${requiredSurfaceBytes} bytes/sample for this Deferred profile`,
        detail: {
          resourceLabel: "subsurface-profile",
          field: "capabilities",
          expected: `${requiredSurfaceBytes} bytes/sample`,
          actual: String(topology.lane.maxColorAttachmentBytesPerSample)
        }
      })
    );
  }
  const graph = context.graph;
  const surface = importRenderPipelineSurface(graph, topology);
  if (!surface.ok) return surface;
  const internalSize = topology.extent === void 0 ? "surface" : renderExtentSize(topology.extent, "internal");
  const internalCopySize = topology.extent === void 0 ? { width: topology.surface.width, height: topology.surface.height } : renderExtentSize(topology.extent, "internal");
  const buffers = importStandardClusterBuffers(graph, lighting);
  if (!buffers.ok) return buffers;
  const membership = buffers.value === null ? ok36(void 0) : addStandardClusterMembershipPass(graph, lighting, buffers.value);
  if (!membership.ok) return membership;
  const addShadows = (cameraPyramid) => {
    const featureShadows = context.contributeShadowFeatures?.();
    if (featureShadows !== void 0 && !featureShadows.ok) return featureShadows;
    return addTypedShadowPasses(graph, topology, {
      projectGpuDrivenShadow: context.projectGpuDrivenShadow,
      shadowFeatures: featureShadows?.value,
      cameraPyramid,
      staticLayers: context.gpuDrivenShadowDepthLayers,
      depthLayers: context.shadowDepthLayers,
      reuseAdjacentShadow
    });
  };
  const earlyShadows = topology.atmosphere === true ? addShadows(void 0) : void 0;
  if (earlyShadows !== void 0 && !earlyShadows.ok) return earlyShadows;
  const depth2 = target4(graph, "hdrp-depth", {
    format: "depth32float-stencil8",
    size: internalSize
  });
  if (!depth2.ok) return depth2;
  const depthSample = graph.view(depth2.value.texture, {
    label: "ssr-scene-depth",
    dimension: "2d",
    aspect: "depth-only"
  });
  if (!depthSample.ok) return depthSample;
  const normalRoughness = target4(graph, "gbuffer-normal-roughness", {
    format: DEFERRED_COLOR_FORMATS[1],
    size: internalSize
  });
  if (!normalRoughness.ok) return normalRoughness;
  const albedoMetallic = target4(graph, "gbuffer-albedo-metallic", {
    format: DEFERRED_COLOR_FORMATS[3],
    size: internalSize
  });
  if (!albedoMetallic.ok) return albedoMetallic;
  const f0Occlusion = target4(graph, "gbuffer-f0-occlusion", {
    format: DEFERRED_COLOR_FORMATS[2],
    size: internalSize
  });
  if (!f0Occlusion.ok) return f0Occlusion;
  const lightingContext = target4(graph, "gbuffer-lighting-context", {
    format: formats[4],
    size: internalSize
  });
  if (!lightingContext.ok) return lightingContext;
  const receiverGeometry = target4(graph, "gbuffer-receiver-geometry", {
    format: DEFERRED_COLOR_FORMATS[5],
    size: internalSize
  });
  if (!receiverGeometry.ok) return receiverGeometry;
  const visibleSurface = visibleSurfaceEnabled ? target4(graph, "visible-surface", {
    format: STANDARD_VISIBLE_SURFACE_FORMAT,
    size: internalSize
  }) : ok36(void 0);
  if (!visibleSurface.ok) return visibleSurface;
  const scene = target4(graph, "hdrp-scene-color", {
    format: formats[0],
    size: internalSize
  });
  if (!scene.ok) return scene;
  const mediumTargets = topology.singleLayerMedium === true ? (() => {
    const nearestLayer = target4(graph, "single-layer-medium-nearest-layer", {
      format: scene.value.format,
      size: internalSize,
      // The color pass samples this target with a `texture_2d`; keep
      // it single-sample even when a future deferred path is MSAA.
      sampleCount: 1,
      domain: "linear-ldr"
    });
    if (!nearestLayer.ok) return nearestLayer;
    const nearestDepth = target4(graph, "single-layer-medium-nearest-depth", {
      format: "depth32float-stencil8",
      size: internalSize,
      sampleCount: 1
    });
    if (!nearestDepth.ok) return nearestDepth;
    return ok36({ nearestLayer: nearestLayer.value, nearestDepth: nearestDepth.value });
  })() : ok36(void 0);
  if (!mediumTargets.ok) return mediumTargets;
  const reflectionFallback = topology.reflectionFallback?.enabled === true || topology.ssr?.status === "admitted" || topology.standardProfile?.diffuseGi?.gather !== "baked" && topology.standardProfile?.diffuseGi?.reflections !== void 0 ? target4(graph, "reflection-fallback-linear-hdr", {
    format: "rgba16float",
    size: internalSize,
    domain: "linear-hdr"
  }) : ok36(void 0);
  if (!reflectionFallback.ok) return reflectionFallback;
  const specularResponse = reflectionFallback.value === void 0 ? ok36(void 0) : target4(graph, "deferred-specular-response", {
    format: "rgba16float",
    size: internalSize
  });
  if (!specularResponse.ok) return specularResponse;
  const temporalDemand = aggregateTemporalDemand({
    taa: topology.camera.antialias === "taa",
    motionBlur: topology.temporal?.motionBlur === true,
    ssr: topology.ssr?.status === "admitted",
    visibleSurface: visibleSurfaceEnabled
  });
  const temporalAdmission = requireStandardTemporalLane({
    demand: temporalDemand,
    compute: topology.lane.compute,
    storageBuffer: topology.lane.storageBuffer,
    rgba16floatRenderable: context.capabilities?.rgba16floatRenderable ?? false
  });
  if (!temporalAdmission.ok) return temporalAdmission;
  const temporal = temporalDemand.targetCount === 1 ? createStandardSceneDataTarget(graph, topology.extent) : ok36(void 0);
  if (!temporal.ok) return temporal;
  const deferredTemporal = temporal.value !== void 0 && topology.lane.maxColorAttachments >= 7 + Number(visibleSurfaceEnabled) && (topology.lane.maxColorAttachmentBytesPerSample ?? 0) >= (visibleSurfaceEnabled ? attachmentBytes.visibleSurfaceTemporal : attachmentBytes.temporal);
  const gpuDriven = context.projectGpuDriven({
    format: scene.value.format,
    sampleCount: scene.value.sampleCount,
    lateOcclusion: topology.config?.gpuOcclusion !== false,
    ...reflectionFallback.value === void 0 ? {} : {
      additionalColorFormats: [reflectionFallback.value.format]
    }
  });
  if (!gpuDriven.ok) return gpuDriven;
  const featureRasterWork = context.hasFeatureRasterWork?.(CLOUD_LAYER_FEATURE_IDENTITY, "scene") === true;
  const cloudScene = createStandardCloudSceneTarget(context, featureRasterWork, {
    format: scene.value.format,
    size: internalSize,
    domain: "linear-hdr"
  });
  if (!cloudScene.ok) return cloudScene;
  const cloudShadow = createStandardCloudShadowTarget(context, featureRasterWork);
  if (!cloudShadow.ok) return cloudShadow;
  const featureTargets = contributeStandardCloudPreOpaque(context, {
    color: scene.value,
    depth: depth2.value,
    cloudShadow: cloudShadow.value
  });
  if (!featureTargets.ok) return featureTargets;
  const atmosphere = topology.atmosphere === true ? addAtmosphereBackground(graph, scene.value, {
    directional: earlyShadows?.value.directional?.view,
    cloud: cloudShadow.value?.view
  }) : ok36(void 0);
  if (!atmosphere.ok) return atmosphere;
  if (atmosphere.value === void 0) {
    const skybox = addTypedSkyboxPass(graph, scene.value);
    if (!skybox.ok) return skybox;
  }
  const gbuffer = addTypedScenePass(graph, {
    name: "g-buffer",
    color: scene.value,
    colorTargets: [
      scene.value,
      normalRoughness.value,
      f0Occlusion.value,
      albedoMetallic.value,
      lightingContext.value,
      receiverGeometry.value,
      ...visibleSurface.value === void 0 ? [] : [visibleSurface.value],
      ...deferredTemporal && temporal.value !== void 0 ? [temporal.value.temporal] : []
    ],
    colorLoadOp: [
      "load",
      "clear",
      "clear",
      "clear",
      "clear",
      "clear",
      ...visibleSurfaceEnabled ? ["clear"] : [],
      ...deferredTemporal ? ["clear"] : []
    ],
    colorClearValues: [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      ...visibleSurfaceEnabled ? [[0, 0, 0, 0]] : [],
      ...deferredTemporal ? [[0, 0, -1, 1]] : []
    ],
    gpuDrivenFilter: "deferred-opaque",
    ...gpuDriven.value === void 0 ? {} : { gpuDriven: gpuDriven.value },
    depth: depth2.value,
    selector: DEFERRED_PASS_SELECTOR,
    // The G-buffer only admits opaque Standard materials. Medium Surface
    // programs have no Deferred entry and acquire raw depth in their later
    // paired color pass; filtering here also avoids assembling their bind
    // groups before that producer exists.
    recordMode: "opaque",
    passKind: "deferred",
    clearColor: [0, 0, 0, 0]
  });
  if (!gbuffer.ok) return gbuffer;
  const importSceneView = sceneViewImport(graph);
  let closestPyramid;
  const closestDepthPyramid = () => {
    if (closestPyramid !== void 0) return closestPyramid;
    const view = importSceneView();
    if (!view.ok) return view;
    closestPyramid = addDepthPyramidPasses(graph, {
      depth: depthSample.value,
      width: internalCopySize.width,
      height: internalCopySize.height,
      view: view.value
    });
    return closestPyramid;
  };
  const late = addGpuLateOcclusion(graph, {
    gpuDriven: gpuDriven.value,
    depth: depthSample.value,
    multisampled: depth2.value.sampleCount > 1,
    width: internalCopySize.width,
    height: internalCopySize.height,
    view: importSceneView
  });
  if (!late.ok) return late;
  if (late.value !== void 0 && gpuDriven.value !== void 0) {
    const gbufferLate = addTypedScenePass(graph, {
      name: "g-buffer-late",
      color: scene.value,
      colorTargets: [
        scene.value,
        normalRoughness.value,
        f0Occlusion.value,
        albedoMetallic.value,
        lightingContext.value,
        receiverGeometry.value,
        ...visibleSurface.value === void 0 ? [] : [visibleSurface.value],
        ...deferredTemporal && temporal.value !== void 0 ? [temporal.value.temporal] : []
      ],
      colorLoadOp: [
        "load",
        "load",
        "load",
        "load",
        "load",
        "load",
        ...visibleSurfaceEnabled ? ["load"] : [],
        ...deferredTemporal ? ["load"] : []
      ],
      depthLoadOp: "load",
      gpuDriven: gpuDriven.value,
      gpuDrivenFilter: "deferred-opaque",
      gpuDrivenPhase: "late",
      depth: depth2.value,
      selector: DEFERRED_PASS_SELECTOR,
      recordMode: "opaque",
      passKind: "deferred"
    });
    if (!gbufferLate.ok) return gbufferLate;
  }
  const shadows = earlyShadows ?? addShadows(late.value);
  if (!shadows.ok) return shadows;
  if (visibleSurface.value !== void 0) {
    const capture = addObservationCapturePass(graph, visibleSurface.value, "visible-surface");
    if (!capture.ok) return capture;
  }
  const decals = addProjectedDecalPasses(graph, topology.projectedDecals ?? [], {
    depth: depthSample.value,
    normal: normalRoughness.value,
    albedo: albedoMetallic.value,
    f0: f0Occlusion.value,
    size: internalSize
  });
  if (!decals.ok) return decals;
  if (context.contributeProbePlacement !== void 0 && visibleSurface.value !== void 0) {
    const placed = context.contributeProbePlacement({
      depth: depthSample.value,
      normal: decals.value.normal,
      identity: visibleSurface.value
    });
    if (!placed.ok) return placed;
  }
  let ssao;
  if (topology.config?.ssao?.enabled === true) {
    const { resolutionScale } = getSsaoParameters(topology.config.ssao);
    const size = {
      width: Math.max(1, Math.round(internalCopySize.width * resolutionScale)),
      height: Math.max(1, Math.round(internalCopySize.height * resolutionScale))
    };
    const raw = target4(graph, "ssao-raw", { format: "rgba8unorm", size });
    if (!raw.ok) return raw;
    const blurred = target4(graph, "ssao-blurred", { format: "r8unorm", size });
    if (!blurred.ok) return blurred;
    const passes = addTypedSsaoPasses(graph, {
      normal: decals.value.normal,
      depth: depth2.value,
      raw: raw.value,
      blurred: blurred.value
    });
    if (!passes.ok) return passes;
    ssao = blurred.value;
  }
  const targetCaptures = context.contributeCubeCaptures?.(atmosphere.value);
  if (targetCaptures !== void 0 && !targetCaptures.ok) return targetCaptures;
  const subsurfaceDiffuse = topology.subsurface === void 0 ? ok36(void 0) : target4(graph, "subsurface-diffuse", { format: "rgba16float", size: internalSize });
  if (!subsurfaceDiffuse.ok) return subsurfaceDiffuse;
  const lightingPass = addStandardDeferredLighting(graph, {
    color: scene.value,
    ...subsurfaceDiffuse.value === void 0 ? {} : { diffuse: subsurfaceDiffuse.value },
    gbuffer: [decals.value.normal, decals.value.albedo, decals.value.f0, lightingContext.value],
    receiverGeometry: receiverGeometry.value,
    depth: depthSample.value,
    ...reflectionFallback.value === void 0 ? {} : { reflectionFallback: reflectionFallback.value },
    ...specularResponse.value === void 0 ? {} : { response: specularResponse.value },
    ...ssao === void 0 ? {} : { ssao },
    ...atmosphere.value === void 0 ? {} : { environment: atmosphere.value },
    ...shadows.value.directional === void 0 ? {} : { directionalShadow: shadows.value.directional },
    spotShadow: shadows.value.spot,
    shadowMoments: shadows.value.moments,
    ...cloudShadow.value === void 0 ? {} : { cloudShadow: cloudShadow.value },
    ...shadows.value.point === void 0 ? {} : { pointShadow: shadows.value.point },
    cluster: buffers.value,
    extraAccesses: buffers.value === null ? [] : standardClusterReadAccesses(buffers.value),
    size: internalCopySize
  });
  if (!lightingPass.ok) return lightingPass;
  if (subsurfaceDiffuse.value !== void 0 && topology.subsurface !== void 0) {
    const diffusion = addSubsurfaceDiffusion(graph, {
      scene: scene.value,
      diffuse: subsurfaceDiffuse.value,
      profiles: lightingContext.value.view,
      normal: decals.value.normal.view,
      depth: depthSample.value,
      size: internalCopySize,
      scale: [
        internalCopySize.width / (topology.extent?.outputWidth ?? topology.surface.width),
        internalCopySize.height / (topology.extent?.outputHeight ?? topology.surface.height)
      ],
      quality: topology.subsurface.quality
    });
    if (!diffusion.ok) return diffusion;
  }
  if (temporal.value !== void 0) {
    const producer = addStandardSceneDataPass(
      graph,
      temporal.value.temporal,
      depth2.value,
      gpuDriven.value,
      deferredTemporal ? "forward-only-opaque" : "opaque"
    );
    if (!producer.ok) return producer;
  }
  if (context.contributeDiffuseGi !== void 0 && visibleSurface.value !== void 0 && temporal.value !== void 0) {
    const diffuse = context.contributeDiffuseGi({
      scene: scene.value,
      depth: depthSample.value,
      normal: decals.value.normal,
      albedo: decals.value.albedo,
      f0: decals.value.f0,
      identity: visibleSurface.value,
      motion: temporal.value.temporal,
      depthPyramid: () => {
        const pyramid = closestDepthPyramid();
        return pyramid.ok ? ok36(pyramid.value.pyramid.pyramid) : pyramid;
      },
      ...reflectionFallback.value === void 0 || specularResponse.value === void 0 ? {} : {
        reflection: { fallback: reflectionFallback.value, response: specularResponse.value }
      }
    });
    if (!diffuse.ok) return diffuse;
  }
  if (context.targetCoverage !== void 0) {
    const coverage = addTargetCoveragePass(graph, context.targetCoverage, gpuDriven.value);
    if (!coverage.ok) return coverage;
  }
  let sceneOutput = scene.value;
  let secondaryReactivity;
  if (topology.ssr !== void 0) {
    const ssrView = topology.ssr.status === "admitted" ? importSceneView() : ok36(void 0);
    if (!ssrView.ok) return ssrView;
    const depthPyramid = topology.ssr.status === "admitted" ? closestDepthPyramid() : ok36(void 0);
    if (!depthPyramid.ok) return depthPyramid;
    const spatial = addSsrSpatialPasses(graph, {
      admission: topology.ssr,
      width: internalCopySize.width,
      height: internalCopySize.height,
      depth: depthSample.value,
      normal: decals.value.normal.view,
      scene: scene.value.view,
      ...temporal.value === void 0 ? {} : { currentTemporal: temporal.value.temporal.view },
      ...reflectionFallback.value === void 0 ? {} : { fallback: reflectionFallback.value.view },
      ...temporal.value === void 0 || context.ssrHistory === void 0 ? {} : {
        temporal: {
          previousHistory: context.ssrHistory.previous.view,
          outputHistory: context.ssrHistory.output.view,
          previousSurface: context.ssrHistory.previousSurface.view,
          outputSurface: context.ssrHistory.outputSurface.view,
          params: context.ssrHistory.params
        }
      },
      ...ssrView.value === void 0 ? {} : { view: ssrView.value },
      ...depthPyramid.value === void 0 ? {} : { depthPyramid: depthPyramid.value.pyramid }
    });
    if (!spatial.ok) return spatial;
    if (spatial.value.resources !== void 0 && reflectionFallback.value !== void 0 && ssrView.value !== void 0 && specularResponse.value !== void 0) {
      const reactivity = spatial.value.reactivity;
      const surface2 = spatial.value.reactivitySurface;
      secondaryReactivity = reactivity === void 0 || surface2 === void 0 ? void 0 : { view: reactivity, ...surface2 };
      const radiance = spatial.value.resources.radiancePyramid ?? spatial.value.resources.trace.view;
      const composed = addSsrCompositionPass(graph, {
        scene: scene.value,
        radiance,
        fallback: reflectionFallback.value.view,
        response: specularResponse.value.view,
        normal: decals.value.normal.view,
        view: ssrView.value
      });
      if (!composed.ok) return composed;
    }
  }
  const transmissionDemand = transmissionDemandForTopology(topology);
  const backdropDemand = {
    activeCount: transmissionDemand.activeCount + (topology.singleLayerMedium === true ? 1 : 0),
    needsRoughMips: transmissionDemand.needsRoughMips
  };
  const transmissionActive = resolveTransmissionBackdropTopology({
    demand: transmissionDemand,
    sourceSampleCount: scene.value.sampleCount
  }).active;
  const backdropActive = resolveTransmissionBackdropTopology({
    demand: backdropDemand,
    sourceSampleCount: scene.value.sampleCount
  }).active;
  const receiver = standardForwardReceiverInputs({
    shadows: shadows.value,
    cloudShadow: cloudShadow.value,
    ssao,
    clusterReads: buffers.value === null ? [] : standardClusterReadAccesses(buffers.value)
  });
  const forward = addTypedScenePass(graph, {
    environment: atmosphere.value,
    name: "forward",
    color: sceneOutput,
    depth: depth2.value,
    selector: FORWARD_PASS_SELECTOR,
    colorLoadOp: "load",
    depthLoadOp: "load",
    ...receiver,
    ...gpuDriven.value === void 0 ? {} : { gpuDriven: gpuDriven.value },
    passKind: "forward",
    excludeSelector: DEFERRED_PASS_SELECTOR,
    // Keep the deferred opaque lane separate from Surface medium passes.
    recordMode: "opaque",
    gpuDrivenFilter: "forward-only-opaque"
  });
  if (!forward.ok) return forward;
  const fogged = addOpaqueFogPasses(graph, {
    topology,
    atmosphere: atmosphere.value?.atmosphere,
    color: scene.value,
    depth: depth2.value
  });
  if (!fogged.ok) return fogged;
  if (cloudScene.value !== void 0) {
    const compositeFeatures = contributeStandardCloudComposite(
      context,
      featureTargets.value,
      { input: scene.value, output: cloudScene.value, cloudShadow: cloudShadow.value },
      receiver.extraAccesses,
      atmosphere.value?.atmosphere
    );
    if (!compositeFeatures.ok) return compositeFeatures;
  }
  if (cloudScene.value !== void 0) sceneOutput = cloudScene.value;
  const sortedTransmission = transmissionActive && topology.transparency?.weightedBlended !== true && topology.singleLayerMedium !== true;
  if (sortedTransmission && transmissionDemand.needsBackPass === true) {
    const backdrop = addTransmissionBackdropPasses({
      graph,
      name: "transmission-backdrop-backs",
      source: sceneOutput,
      demand: transmissionDemand,
      copySize: internalCopySize,
      surfaceSize: topology.surface,
      encodeRoughMip: context.encodeTransmissionMip,
      includeConsumerPasses: false
    });
    if (!backdrop.ok) return backdrop;
    const backs = addTypedScenePass(graph, {
      environment: atmosphere.value,
      name: "transmission-backs",
      color: sceneOutput,
      depth: depth2.value,
      ...receiver,
      selector: TRANSMISSION_BACK_PASS_SELECTOR,
      colorLoadOp: "load",
      depthLoadOp: "load",
      recordMode: "transmission",
      transparentDepthWrite: true,
      transmissionBackdrop: backdrop.value.backdrop?.view
    });
    if (!backs.ok) return backs;
  }
  if (sortedTransmission) {
    const prefix = addTypedScenePass(graph, {
      environment: atmosphere.value,
      name: "transparent-before-transmission",
      color: sceneOutput,
      depth: depth2.value,
      ...receiver,
      selector: REFRACTION_INNER_PASS_SELECTOR,
      colorLoadOp: "load",
      depthLoadOp: "load",
      recordMode: "translucent-before-transmission",
      transparentDepthWrite: true
    });
    if (!prefix.ok) return prefix;
  }
  const transmission = addTransmissionBackdropPasses({
    graph,
    source: sceneOutput,
    demand: backdropDemand,
    copySize: internalCopySize,
    surfaceSize: topology.surface,
    encodeRoughMip: context.encodeTransmissionMip,
    includeConsumerPasses: false
  });
  if (!transmission.ok) return transmission;
  if (topology.singleLayerMedium === true) {
    const medium = requireSingleLayerMediumInputs(
      mediumTargets.value,
      transmission.value.backdrop?.view
    );
    if (!medium.ok) return medium;
    const rawDepth = addSingleLayerMediumRawDepthProducer({
      graph,
      sourceColor: sceneOutput,
      sourceDepth: depth2.value,
      size: internalSize
    });
    if (!rawDepth.ok) return rawDepth;
    const surfacePair = {
      opaqueColor: medium.value.backdrop,
      rawDepth: { status: "available", view: rawDepth.value.view }
    };
    const mediumPasses = addSingleLayerMediumPasses({
      graph,
      size: internalSize,
      ...medium.value.nearestTargets,
      color: sceneOutput,
      depth: depth2.value,
      ...receiver,
      extraAccesses: [
        ...receiver.extraAccesses,
        ...targetCaptures?.value === void 0 ? [] : [{ resource: targetCaptures.value, usage: "sampled-read" }]
      ],
      surfacePair,
      ...gpuDriven.value === void 0 ? {} : { gpuDriven: gpuDriven.value }
    });
    if (!mediumPasses.ok) return mediumPasses;
  }
  if (backdropActive) {
    if (transmissionActive) {
      const transmissionPass = addTypedScenePass(graph, {
        environment: atmosphere.value,
        name: "transmission-forward",
        color: sceneOutput,
        depth: depth2.value,
        selector: sortedTransmission ? REFRACTION_INNER_PASS_SELECTOR : FORWARD_PASS_SELECTOR,
        colorLoadOp: "load",
        depthLoadOp: "load",
        ...receiver,
        passKind: "forward",
        recordMode: sortedTransmission ? "translucent" : "transmission",
        transparentDepthWrite: true,
        // Inject the complete backdrop view so the Standard shader can select
        // the producer's optional roughness mip level. mipViews[0] is only the
        // copy destination view and intentionally exposes one level.
        transmissionBackdrop: transmission.value.backdrop?.view
      });
      if (!transmissionPass.ok) return transmissionPass;
      if (sortedTransmission && transmissionDemand.needsBackPass === true) {
        const outerBackdrop = addTransmissionBackdropPasses({
          graph,
          name: "transmission-outer-backdrop",
          source: sceneOutput,
          demand: backdropDemand,
          copySize: internalCopySize,
          surfaceSize: topology.surface,
          encodeRoughMip: context.encodeTransmissionMip,
          includeConsumerPasses: false
        });
        if (!outerBackdrop.ok) return outerBackdrop;
        const outer = addTypedScenePass(graph, {
          environment: atmosphere.value,
          name: "transmission-outer-forward",
          color: sceneOutput,
          depth: depth2.value,
          ...receiver,
          selector: REFRACTION_OUTER_PASS_SELECTOR,
          colorLoadOp: "load",
          depthLoadOp: "load",
          passKind: "forward",
          recordMode: "transmission",
          transparentDepthWrite: true,
          transmissionBackdrop: outerBackdrop.value.backdrop?.view
        });
        if (!outer.ok) return outer;
      }
    }
    const transparentPass = sortedTransmission ? ok36(void 0) : addStandardTransparentPasses(graph, {
      color: sceneOutput,
      depth: depth2.value,
      size: internalSize,
      transparency: topology.transparency,
      template: {
        environment: atmosphere.value,
        ...receiver,
        passKind: "forward"
      }
    });
    if (!transparentPass.ok) return transparentPass;
  }
  if (backdropActive) {
    const temporal2 = addTransmissionBackdropTemporalPass(graph, sceneOutput);
    if (!temporal2.ok) return temporal2;
  }
  if (!transmission.value.topology.active) {
    const transparentPass = addStandardTransparentPasses(graph, {
      color: sceneOutput,
      depth: depth2.value,
      size: internalSize,
      transparency: topology.transparency,
      template: {
        environment: atmosphere.value,
        ...receiver,
        passKind: "forward"
      }
    });
    if (!transparentPass.ok) return transparentPass;
  }
  const features = contributeStandardSceneFeatures(
    context,
    { color: sceneOutput, colorResolve: void 0, depth: depth2.value },
    standardForwardReceiverFeatureAccesses(receiver),
    atmosphere.value?.atmosphere
  );
  if (!features.ok) return features;
  const observation = addTypedFrameObservationPass(graph, sceneOutput);
  if (!observation.ok) return observation;
  if (reflectionFallback.value?.sampleCount === 1) {
    const fallbackObservation = addReflectionFallbackObservationPass(
      graph,
      reflectionFallback.value
    );
    if (!fallbackObservation.ok) return fallbackObservation;
  }
  const post = addStandardPost(
    context,
    topology,
    sceneOutput,
    depth2.value,
    surface.value,
    temporal.value?.temporal,
    secondaryReactivity,
    context.targetCoverage?.coverage,
    context.targetCoverage?.depth,
    {
      atmosphere: atmosphere.value?.atmosphere,
      directionalShadow: shadows.value.directional?.view,
      spotShadow: shadows.value.spot.view,
      clusterBuffers: buffers.value,
      cloudShadow: cloudShadow.value?.view
    }
  );
  if (!post.ok) return post;
  return ok36(void 0);
}
function profileFor(topology) {
  return topology.standardProfile ?? DEFAULT_STANDARD_PROFILE;
}
function resolveStandardTopologyInput(context) {
  const supplied = context.standardLighting;
  if (supplied !== void 0) {
    const derived = deriveStandardTopologyInput(supplied);
    if (derived.ok) return derived;
    return err13(
      new RenderGraphError7({
        code: "resource-descriptor-invalid",
        expected: "Forward/Deferred consume one prepared Standard topology input",
        hint: derived.error.hint,
        detail: {
          resourceLabel: "forgeax::standard",
          field: `standardLighting.${derived.error.detail.field}`,
          expected: derived.error.expected,
          actual: "invalid"
        }
      })
    );
  }
  return err13(
    new RenderGraphError7({
      code: "resource-descriptor-invalid",
      expected: "RenderPipelineBuildContext.standardLighting from frame preparation",
      hint: "prepare Standard lighting once, select a proven Cluster transport, and pass it to both lanes",
      detail: {
        resourceLabel: "forgeax::standard",
        field: "standardLighting",
        expected: "prepared Standard lighting topology input",
        actual: "invalid"
      }
    })
  );
}
function standardTopology(topology, profile) {
  const config = {
    ...topology.config ?? {},
    ssao: {
      ...topology.config?.ssao ?? {},
      ...typeof profile.ssao === "object" ? profile.ssao : {},
      enabled: profile.ssao !== false
    }
  };
  return {
    ...topology,
    pipelineId: STANDARD_PIPELINE_ID,
    standardProfile: profile,
    config
  };
}
function buildStandard(context, topology, reuseAdjacentShadow = false) {
  const standardContext = context;
  const profile = profileFor(topology);
  if (!STANDARD_LIGHT_COUNTS.some((count) => count === profile.lightCount)) {
    return err13(
      new RenderGraphError7({
        code: "resource-descriptor-invalid",
        expected: "StandardProfile.lightCount is one of 1, 32, or 256",
        hint: "set StandardProfile.lightCount to 1, 32, or 256",
        detail: {
          resourceLabel: "forgeax::standard",
          field: "lightCount",
          expected: "1 | 32 | 256",
          actual: profile.lightCount
        }
      })
    );
  }
  if ((topology.projectedDecals?.length ?? 0) > 0 && (profile.renderPath !== "deferred" || topology.camera.antialias === "msaa"))
    throw new ProjectedDecalInvalidError(
      "renderPath",
      "Standard Deferred with single-sample depth"
    );
  const effective = standardTopology(topology, profile);
  const lighting = resolveStandardTopologyInput(context);
  if (!lighting.ok) return lighting;
  if (effective.clearOnly === true) {
    return buildStandardForwardLane(
      standardContext,
      effective,
      lighting.value,
      reuseAdjacentShadow
    );
  }
  return profile.renderPath === "forward" ? buildStandardForwardLane(standardContext, effective, lighting.value, reuseAdjacentShadow) : buildStandardDeferredLane(standardContext, effective, lighting.value, reuseAdjacentShadow);
}
var standardPipeline = Object.freeze({
  identity: STANDARD_PIPELINE_ID,
  build: buildStandard
});

export {
  projectedDecalTopology,
  createAtmosphereBackgroundLayout,
  createAtmosphereBackgroundGroup,
  addAtmosphereBackground,
  createTargetCoverageAttachment,
  resolveTransmissionBackdropTopology,
  probeTransmissionCapability,
  evaluateTransmissionCapability,
  TransmissionCandidateAdmission,
  shadowPipelinePreparationDemand,
  addTypedShadowPasses,
  projectVolumeCompositeBounds,
  VOLUMETRIC_FOG_PARAMS_BYTES,
  deriveVolumetricFogExtent,
  deriveVolumetricFogResolvedExtent,
  inspectVolumetricFogResources,
  prepareVolumePrograms,
  ANALYTIC_FOG_POST_PROCESS_ID,
  analyticFogSampleCountError,
  SINGLE_LAYER_MEDIUM_RAW_DEPTH_POST_PROCESS_ID,
  SINGLE_LAYER_MEDIUM_MSAA_PAIRED_COLOR_POST_PROCESS_ID,
  SINGLE_LAYER_MEDIUM_MSAA_RAW_DEPTH_POST_PROCESS_ID,
  registerSingleLayerMediumBuiltins,
  inspectCapsuleShadow,
  capsuleConeHalfAngle,
  importStandardClusterBuffers,
  standardClusterReadAccesses,
  addStandardClusterMembershipPass,
  DEPTH_OF_FIELD_POST_PROCESS_IDS,
  DEPTH_OF_FIELD_MSAA_POST_PROCESS_IDS,
  depthOfFieldTopology,
  depthOfFieldPassNames,
  LENS_EFFECTS_POST_PROCESS_ID,
  createLensEffectsRenderFeature,
  packLensEffectsParams,
  LENS_FLARE_PROGRAMS,
  createLensFlareRenderFeature,
  packLensFlareParams,
  createMotionBlurFeature,
  createOutlineRenderFeature,
  isOutlinePostProcess,
  createSmaaRenderFeature,
  AUTO_EXPOSURE_HISTOGRAM_BYTES,
  createAutoExposureGpuResources,
  writeAutoExposureParameters,
  retireAutoExposureGpuResources,
  importAutoExposureGraphResources,
  retireStandardLutGpuResources,
  prepareStandardLutGpu,
  inspectStandardBloomGraph,
  standardLightingTopologySignature,
  STANDARD_CLUSTER_MEMBERSHIP_WGSL,
  validateClusterGrid,
  buildStandard,
  standardPipeline
};
//# sourceMappingURL=chunk-Q2KXQNQT.mjs.map
