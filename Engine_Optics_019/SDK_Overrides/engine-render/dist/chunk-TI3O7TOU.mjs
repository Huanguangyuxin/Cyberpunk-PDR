import {
  GPU_SHADER_STAGE_COMPUTE,
  VIEW_UNIFORM_BYTES,
  getOrCreateFromChain
} from "./chunk-XAU6MWMX.mjs";

// sdk/engine/node_modules/@forgeax/engine-render/src/ssr/resources.ts
import { ok as ok2 } from "@forgeax/engine-types";

// sdk/engine/node_modules/@forgeax/engine-render/src/depth-pyramid/graph.ts
import { ok } from "@forgeax/engine-types";

// sdk/engine/node_modules/@forgeax/engine-render/src/compute-graph-state.ts
import { RhiError } from "@forgeax/engine-rhi";
function computePipelineError(stage) {
  return new RhiError({
    code: "rhi-not-available",
    expected: `${stage} compute pipeline to be available`,
    hint: "construct the renderer through a backend pack with shader module support"
  });
}
function createComputeState(frame, source, label, entries, entryPoint) {
  const factory = frame.runtime?.shaderModuleFactory;
  if (factory === void 0) throw computePipelineError(`${label} shader module`);
  const module = factory.createShaderModule({ code: source, label });
  if (!module.ok) throw module.error;
  const device = frame.runtime.device;
  return createComputeStateForModule(device, module.value, label, entries, entryPoint);
}
function createComputeStateForModule(device, module, label, entries, entryPoint) {
  const layout = device.createBindGroupLayout({
    label: `${label}.bind-group-layout`,
    entries
  });
  if (!layout.ok) throw layout.error;
  const pipelineLayout = device.createPipelineLayout({
    label: `${label}.pipeline-layout`,
    bindGroupLayouts: [layout.value]
  });
  if (!pipelineLayout.ok) throw pipelineLayout.error;
  const pipeline = device.createComputePipeline({
    label,
    layout: pipelineLayout.value,
    compute: { module, entryPoint }
  });
  if (!pipeline.ok) throw pipeline.error;
  return { label, pipeline: pipeline.value, layout: layout.value, bindGroups: /* @__PURE__ */ new WeakMap() };
}
function computeBindGroup(frame, state, entries) {
  const device = frame.runtime.device;
  return getOrCreateFromChain(
    state.bindGroups,
    entries.map(
      ({ resource }) => resource.kind === "buffer" ? resource.value.buffer : resource.value
    ),
    state.label,
    () => device.createBindGroup({ layout: state.layout, entries }).unwrap(),
    frame.bindGroupCounts
  );
}
function resolvedGraphView(resources, view) {
  const resolved = resources.textureView(view);
  if (!resolved.ok) throw resolved.error;
  return resolved.value;
}
function resolvedGraphBuffer(resources, buffer) {
  const resolved = resources.buffer(buffer);
  if (!resolved.ok) throw resolved.error;
  return resolved.value;
}

// sdk/engine/node_modules/@forgeax/engine-render/src/depth-pyramid/plan.ts
var DEPTH_PYRAMID_FORMAT = "r32float";
function validExtent(extent) {
  return Number.isInteger(extent.width) && Number.isInteger(extent.height) && extent.width > 0 && extent.height > 0;
}
function requireExtent(extent) {
  if (!validExtent(extent)) {
    throw new RangeError("Depth pyramid extent must contain positive integer width and height");
  }
}
function nextDepthPyramidMipExtent(extent) {
  requireExtent(extent);
  return {
    width: Math.max(1, Math.floor(extent.width / 2)),
    height: Math.max(1, Math.floor(extent.height / 2))
  };
}
function buildDepthPyramidPlan(extent) {
  requireExtent(extent);
  const levels = [];
  let current = { width: extent.width, height: extent.height };
  let level = 0;
  while (true) {
    levels.push({ level, ...current });
    if (current.width === 1 && current.height === 1) break;
    current = nextDepthPyramidMipExtent(current);
    level += 1;
  }
  return Object.freeze({
    extent: Object.freeze({ width: extent.width, height: extent.height }),
    format: DEPTH_PYRAMID_FORMAT,
    mipLevelCount: levels.length,
    levels: Object.freeze(levels.map((entry) => Object.freeze(entry))),
    graphSize: Object.freeze({ width: extent.width, height: extent.height })
  });
}

// sdk/engine/node_modules/@forgeax/engine-render/src/depth-pyramid/programs.ts
var scopedPrograms = /* @__PURE__ */ new WeakMap();
function createDepthPyramidProgramResolver() {
  let local;
  return (frame, source, entries, variant) => {
    const stage = variant === "reduce" || variant === "reduce_furthest" ? "reduce" : "seed";
    const runtime = frame.runtime;
    const factory = runtime?.shaderModuleFactory;
    if (factory === void 0) throw computePipelineError(`depth_pyramid_${stage} shader module`);
    const { device } = runtime;
    const scope = runtime.deviceScope;
    let programs;
    if (scope === void 0) {
      if (local?.device !== device) local = { device, entries: /* @__PURE__ */ new Map() };
      programs = local;
    } else {
      if (!scope.isAlive()) throw computePipelineError("depth pyramid live device scope");
      let owned = scopedPrograms.get(scope);
      if (owned === void 0) {
        owned = { device, entries: /* @__PURE__ */ new Map() };
        scopedPrograms.set(scope, owned);
        const retained = owned;
        scope._adopt("pipeline", retained, () => {
          retained.entries.clear();
          if (scopedPrograms.get(scope) === retained) scopedPrograms.delete(scope);
        });
      }
      if (owned.device !== device) throw computePipelineError("depth pyramid current device");
      programs = owned;
    }
    const layout = JSON.stringify(entries);
    const createModule = factory.createShaderModule;
    const module = createModule.call(factory, { code: source, label: `depth_pyramid_${stage}` });
    if (!module.ok) throw module.error;
    if (scope !== void 0 && (!scope.isAlive() || scopedPrograms.get(scope) !== programs))
      throw computePipelineError("depth pyramid live device scope");
    const prior = programs.entries.get(variant);
    if (prior !== void 0 && prior.source === source && prior.factory === factory && prior.createModule === createModule && prior.module === module.value && prior.layout === layout)
      return prior.state;
    const state = createComputeStateForModule(
      device,
      module.value,
      `depth_pyramid_${stage}`,
      entries,
      `depth_pyramid_${variant}`
    );
    if (scope !== void 0 && (!scope.isAlive() || scopedPrograms.get(scope) !== programs))
      throw computePipelineError("depth pyramid live device scope");
    if (factory.createShaderModule === createModule)
      programs.entries.set(variant, {
        source,
        factory,
        createModule,
        module: module.value,
        layout,
        state
      });
    return state;
  };
}

// sdk/engine/node_modules/@forgeax/engine-render/src/depth-pyramid/graph.ts
var REDUCTION_NAMES = {
  closest: { graph: "depth-pyramid", entry: "" },
  furthest: { graph: "occlusion-depth-pyramid", entry: "_furthest" }
};
var SEED_ENTRIES = [
  {
    binding: 0,
    visibility: GPU_SHADER_STAGE_COMPUTE,
    texture: { sampleType: "depth", viewDimension: "2d" }
  },
  {
    binding: 1,
    visibility: GPU_SHADER_STAGE_COMPUTE,
    storageTexture: { access: "write-only", format: DEPTH_PYRAMID_FORMAT, viewDimension: "2d" }
  },
  { binding: 2, visibility: GPU_SHADER_STAGE_COMPUTE, buffer: { type: "uniform" } }
];
var SEED_MULTISAMPLED_BINDING = 3;
var SEED_MULTISAMPLED_ENTRIES = [
  {
    binding: SEED_MULTISAMPLED_BINDING,
    visibility: GPU_SHADER_STAGE_COMPUTE,
    texture: { sampleType: "depth", viewDimension: "2d", multisampled: true }
  },
  SEED_ENTRIES[1],
  SEED_ENTRIES[2]
];
var REDUCE_ENTRIES = [
  {
    binding: 0,
    visibility: GPU_SHADER_STAGE_COMPUTE,
    texture: { sampleType: "unfilterable-float", viewDimension: "2d" }
  },
  {
    binding: 1,
    visibility: GPU_SHADER_STAGE_COMPUTE,
    storageTexture: { access: "write-only", format: DEPTH_PYRAMID_FORMAT, viewDimension: "2d" }
  }
];
function shaderSource(frame, stage) {
  return frame.depthPyramidShaders?.[stage];
}
function halfExtent(extent) {
  return {
    width: Math.max(1, Math.floor(extent.width / 2)),
    height: Math.max(1, Math.floor(extent.height / 2))
  };
}
function planViewDepthPyramid(extent) {
  return buildDepthPyramidPlan(halfExtent(extent));
}
function estimateDepthPyramidMemory(extent) {
  return planViewDepthPyramid(extent).levels.reduce((sum, level) => {
    const bytes = sum + level.width * level.height * 4;
    if (!Number.isSafeInteger(bytes)) {
      throw new RangeError("depth pyramid descriptor byte count exceeds safe integer range");
    }
    return bytes;
  }, 0);
}
function createDepthPyramid(graph, extent, name) {
  const plan = planViewDepthPyramid(extent);
  const created = graph.createTexture(name, {
    format: DEPTH_PYRAMID_FORMAT,
    size: plan.graphSize,
    mipLevelCount: plan.mipLevelCount
  });
  if (!created.ok) return created;
  const levels = [];
  for (const entry of plan.levels) {
    const view = graph.view(created.value, {
      label: `${name}.mip-${entry.level}.view`,
      dimension: "2d",
      baseMipLevel: entry.level,
      mipLevelCount: 1
    });
    if (!view.ok) return view;
    levels.push(view.value);
  }
  const pyramid = graph.view(created.value, { label: `${name}.view`, dimension: "2d" });
  if (!pyramid.ok) return pyramid;
  return ok({
    plan,
    texture: created.value,
    levels: Object.freeze(levels),
    pyramid: pyramid.value
  });
}
function addDepthPyramidPasses(graph, input) {
  const reduction = input.reduction ?? "closest";
  const names = REDUCTION_NAMES[reduction];
  const multisampled = input.reduction === "furthest" && input.multisampled === true;
  const seedPass = `${names.graph}-seed`;
  const reducePass = `${names.graph}-reduce-chain`;
  const created = createDepthPyramid(
    graph,
    { width: input.width, height: input.height },
    names.graph
  );
  if (!created.ok) return created;
  const pyramid = created.value;
  const { depth, view } = input;
  const mip0 = pyramid.levels[0];
  const passNames = [];
  const program = createDepthPyramidProgramResolver();
  const seeded = graph.addComputePass(seedPass, {
    accesses: [
      { resource: depth, usage: "sampled-read" },
      { resource: mip0, usage: "storage-write" },
      ...view === void 0 ? [] : [{ resource: view, usage: "uniform-read" }]
    ],
    encode: ({ pass, frame, resources }) => {
      const source = shaderSource(frame, "seed");
      if (source === void 0 || view === void 0) return;
      const seedState = program(
        frame,
        source,
        multisampled ? SEED_MULTISAMPLED_ENTRIES : SEED_ENTRIES,
        `seed${names.entry}${multisampled ? "_multisampled" : ""}`
      );
      pass.setPipeline(seedState.pipeline);
      pass.setBindGroup(
        0,
        computeBindGroup(frame, seedState, [
          {
            binding: multisampled ? SEED_MULTISAMPLED_BINDING : 0,
            resource: { kind: "textureView", value: resolvedGraphView(resources, depth) }
          },
          {
            binding: 1,
            resource: { kind: "textureView", value: resolvedGraphView(resources, mip0) }
          },
          {
            binding: 2,
            resource: {
              kind: "buffer",
              value: { buffer: resolvedGraphBuffer(resources, view), size: VIEW_UNIFORM_BYTES }
            }
          }
        ])
      );
      pass.dispatchWorkgroups(
        Math.ceil(pyramid.plan.extent.width / 8),
        Math.ceil(pyramid.plan.extent.height / 8),
        1
      );
    }
  });
  if (!seeded.ok) return seeded;
  passNames.push(seedPass);
  const levels = pyramid.levels;
  if (levels.length > 1) {
    const reduced = graph.addComputePass(reducePass, {
      accesses: levels.map((resource, level) => ({
        resource,
        usage: level === 0 ? "sampled-read" : level === levels.length - 1 ? "storage-write" : "sampled-storage-write"
      })),
      encode: ({ pass, frame, resources }) => {
        const source = shaderSource(frame, "reduce");
        if (source === void 0) return;
        const reduceState = program(
          frame,
          source,
          REDUCE_ENTRIES,
          `reduce${names.entry}`
        );
        pass.setPipeline(reduceState.pipeline);
        for (let level = 1; level < levels.length; level++) {
          const sourceLevel = levels[level - 1];
          const target = levels[level];
          const extent = pyramid.plan.levels[level];
          if (sourceLevel === void 0 || target === void 0 || extent === void 0)
            throw computePipelineError("depth pyramid mip chain");
          pass.setBindGroup(
            0,
            computeBindGroup(frame, reduceState, [
              {
                binding: 0,
                resource: { kind: "textureView", value: resolvedGraphView(resources, sourceLevel) }
              },
              {
                binding: 1,
                resource: { kind: "textureView", value: resolvedGraphView(resources, target) }
              }
            ])
          );
          pass.dispatchWorkgroups(Math.ceil(extent.width / 8), Math.ceil(extent.height / 8), 1);
        }
      }
    });
    if (!reduced.ok) return reduced;
    passNames.push(reducePass);
  }
  return ok({ pyramid, passNames: Object.freeze(passNames) });
}

// sdk/engine/node_modules/@forgeax/engine-render/src/ssr/resources.ts
var SSR_TRACE_FORMAT = "rgba16float";
var SSR_R32FLOAT_BYTES_PER_PIXEL = 4;
var SSR_RGBA16FLOAT_BYTES_PER_PIXEL = 8;
var SSR_TEMPORAL_PARAMS_BYTES = 32;
var SSR_SPATIAL_MEMORY_BUDGET_BYTES = 134217728;
function traceExtentForView(extent) {
  return {
    width: Math.max(1, Math.floor(extent.width)),
    height: Math.max(1, Math.floor(extent.height))
  };
}
function byteCount(width, height, bytesPerPixel) {
  const bytes = width * height * bytesPerPixel;
  if (!Number.isSafeInteger(bytes)) {
    throw new RangeError("SSR spatial descriptor byte count exceeds safe integer range");
  }
  return bytes;
}
function estimateSsrSpatialMemory(extent, options = {}) {
  const trace = traceExtentForView(extent);
  const plan = planViewDepthPyramid(extent);
  const temporal = options.temporal !== false;
  const depthPyramidBytes = estimateDepthPyramidMemory(extent);
  const traceBytes = byteCount(trace.width, trace.height, SSR_RGBA16FLOAT_BYTES_PER_PIXEL);
  const hitReactivityBytes = byteCount(trace.width, trace.height, SSR_R32FLOAT_BYTES_PER_PIXEL);
  const resolvedBytes = temporal ? [trace, ...Math.max(trace.width, trace.height) > 1 ? plan.levels : []].reduce(
    (sum, level) => sum + byteCount(level.width, level.height, SSR_RGBA16FLOAT_BYTES_PER_PIXEL),
    0
  ) : 0;
  const historyBytes = temporal ? trace.width * trace.height * 12 * 2 : 0;
  const temporalParamsBytes = temporal ? SSR_TEMPORAL_PARAMS_BYTES : 0;
  const fallbackInputBytes = byteCount(
    extent.width,
    extent.height,
    SSR_RGBA16FLOAT_BYTES_PER_PIXEL
  );
  const ssrOwnedBytes = depthPyramidBytes + traceBytes + hitReactivityBytes + resolvedBytes + historyBytes + temporalParamsBytes + fallbackInputBytes;
  return Object.freeze({
    width: extent.width,
    height: extent.height,
    traceWidth: trace.width,
    traceHeight: trace.height,
    depthPyramidBytes,
    traceBytes,
    hitReactivityBytes,
    resolvedBytes,
    historyBytes,
    temporalParamsBytes,
    fallbackInputBytes,
    ssrOwnedBytes,
    budgetBytes: SSR_SPATIAL_MEMORY_BUDGET_BYTES,
    withinBudget: ssrOwnedBytes <= SSR_SPATIAL_MEMORY_BUDGET_BYTES
  });
}
function texture(graph, label, format, extent) {
  const created = graph.createTexture(label, {
    format,
    size: { width: extent.width, height: extent.height },
    domain: "linear-hdr"
  });
  if (!created.ok) return created;
  const view = graph.view(created.value, { label: `${label}.view`, dimension: "2d" });
  if (!view.ok) return view;
  return ok2({
    texture: created.value,
    view: view.value,
    width: extent.width,
    height: extent.height,
    format
  });
}
function createSsrSpatialResources(graph, extent) {
  const traceExtent = traceExtentForView(extent);
  const trace = texture(graph, "ssr-trace", SSR_TRACE_FORMAT, traceExtent);
  if (!trace.ok) return trace;
  const hitTexture = graph.createTexture("ssr-hit-reactivity", {
    format: "r32float",
    size: traceExtent
  });
  if (!hitTexture.ok) return hitTexture;
  const hitReactivity = graph.view(hitTexture.value, {
    label: "ssr-hit-reactivity.view",
    dimension: "2d"
  });
  if (!hitReactivity.ok) return hitReactivity;
  return ok2({ trace: trace.value, hitReactivity: hitReactivity.value });
}

export {
  computePipelineError,
  createComputeState,
  computeBindGroup,
  resolvedGraphView,
  resolvedGraphBuffer,
  addDepthPyramidPasses,
  estimateSsrSpatialMemory,
  createSsrSpatialResources
};
//# sourceMappingURL=chunk-TI3O7TOU.mjs.map
