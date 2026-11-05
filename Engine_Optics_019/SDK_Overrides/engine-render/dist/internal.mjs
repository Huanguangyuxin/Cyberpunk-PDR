import {
  fullscreenRenderFeatureDeclaration
} from "./chunk-XZHQWBNV.mjs";
import {
  TemporalFrameCoordinator,
  temporalFrameStageFromError
} from "./chunk-3XNCWRYC.mjs";
import {
  CARD_LOOKUP_STRIDE,
  CARD_PLANES,
  CardLookupStatus,
  DeviceScope,
  GLOBAL_CARD_CANDIDATE_STRIDE,
  GLOBAL_SDF_CARD_LOOKUP_WGSL,
  GlobalCardCandidateFlags,
  IRRADIANCE_FIELD_COVERAGE_BYTES,
  IRRADIANCE_FIELD_COVERAGE_WGSL,
  PROBE_MAX_CONTRIBUTORS,
  PROBE_RAYS_WGSL,
  ProbeRayStatus,
  RAY_ACCUMULATION_STRIDE,
  RAY_ATTRIBUTE_TRIANGLE_STRIDE,
  SSR_HISTORY_FORMAT,
  SsrHistoryOwner,
  admitProbeContributors,
  blendLightProbes,
  buildRaySurfaceScene,
  captureMeshPipelinePreparation,
  captureViewProjection,
  createDynamicGeometrySourceHost,
  createExtendedLightingState,
  createGlobalSdfCardLookup,
  createGlobalSdfCardLookupRecorder,
  createProbeRayRecorder,
  createRasterProbePlacement,
  createRasterRayGenerator,
  createRayPathTracer,
  createSdfCardLookup,
  createSsrHistoryOwner,
  createSubmittedRayPathTracer,
  createSurfaceCapture,
  isOwnedRenderFeatureProgramData,
  ownRenderFeatureProgramData,
  packCardProjection,
  packLights,
  projectExtendedLightingInspection,
  promoteExtendedLightingCandidate,
  recordExtendedLightingFailure,
  scaledProbeWeight,
  summarizeGpuPassTimingIntervals,
  surfaceCardKey
} from "./chunk-NYKYJCUN.mjs";
import {
  GLOBAL_SDF_COMPOSE_WGSL,
  GLOBAL_SDF_HIT_STRIDE,
  GLOBAL_SDF_QUERY_WGSL,
  GLOBAL_SDF_VOXEL_STRIDE,
  GlobalSdfQueryStatus,
  GlobalSdfVoxelStatus,
  IRRADIANCE_VOLUME_ARTIFACT,
  IRRADIANCE_VOLUME_FORMAT,
  IRRADIANCE_VOLUME_KIND,
  IRRADIANCE_VOLUME_MEDIA_TYPE,
  RAY_HIT_STRIDE,
  RAY_TRIANGLE_STRIDE,
  SDF_HIT_STRIDE,
  SdfQueryStatus,
  buildRayReferenceScene,
  createGlobalSdfComposition,
  createGlobalSdfCompositionRecorder,
  createGlobalSdfQuery,
  createGlobalSdfQueryRecorder,
  createSdfQuery,
  decodeIrradianceVolume,
  encodeIrradianceVolume,
  integrateIrradianceProbes,
  irradianceProbePosition,
  irradianceVolumeContribution,
  irradianceVolumeDigest,
  irradianceVolumeKind,
  irradianceVolumeProbeBlocks,
  packReferenceRays,
  packSdfScene,
  rayGeometryKey,
  rayReferenceFailure,
  sdfInstanceKey,
  sphericalFibonacci,
  traceReferenceRay,
  validateIrradianceLattice,
  validateIrradianceVolume
} from "./chunk-5JZNU5U3.mjs";
import {
  estimateSsrSpatialMemory
} from "./chunk-TI3O7TOU.mjs";
import "./chunk-MVY4ZZCX.mjs";
import "./chunk-6Y4WOKOE.mjs";
import {
  EXTENDED_LIGHTING_REQUIRED_SAMPLED_TEXTURES,
  EXTENDED_LIGHTING_TOPOLOGY,
  buildRectAreaWorldFrame,
  createLightResourceUnavailable,
  deriveExtendedLightingCapability,
  extendedLightingSampledTextureCapacityAvailable,
  getOrCreateDirectDfgLut,
  materialUsesDirectDfgLut,
  rectAreaFacesPoint,
  validateGraphTargetCaptureReadback
} from "./chunk-XAU6MWMX.mjs";

// sdk/engine/node_modules/@forgeax/engine-render/src/prepare/extended-lighting/ltc-resources.ts
function deriveLtcResourcePlan(input) {
  const admitted = input.ltcAvailable;
  return {
    topology: EXTENDED_LIGHTING_TOPOLOGY,
    generation: input.scope.generation,
    rectAdmission: admitted ? "admitted" : "omitted",
    tableCount: admitted ? 2 : 0,
    uploadCount: admitted && input.residentGeneration !== input.scope.generation ? 2 : 0
  };
}

// sdk/engine/node_modules/@forgeax/engine-render/src/raytracing/diffuse-gi.ts
import { ok } from "@forgeax/engine-types";
var GI_PIXEL_STRIDE = 80;
var GI_SURFACE_STRIDE = 64;
var GI_PROBE_SAMPLE_STRIDE = 32;
var GiStatus = { background: 0, complete: 1, incomplete: 2, invalidMaterial: 3 };
async function createDiffuseGi(device, compile, request) {
  const s = request.settings;
  const usesLut = request.sources.some(
    (source) => source.sections.some(
      (section) => materialUsesDirectDfgLut(section.material.program.paramSchema)
    )
  );
  const kernel = usesLut ? request.kernelLut : request.kernel;
  if (kernel === void 0)
    return rayReferenceFailure(
      "LUT material requires the cooked DIRECT_DFG_LUT_AVAILABLE GI kernel"
    );
  if (!Number.isInteger(s.resolution) || s.resolution < 8 || s.resolution > 512 || !Number.isInteger(s.cardResolution) || s.cardResolution < 8 || s.cardResolution > 32 || !Number.isInteger(s.samples) || s.samples < 16 || s.samples > 256 || s.samples % 2 !== 0 || !Number.isInteger(s.iterations) || s.iterations < 0 || s.iterations > 2 || s.probeCounts.some((v) => !Number.isInteger(v) || v < 2 || v > 4) || ![...s.probeOrigin, s.probeSpacing, ...s.environment].every(
    (v) => Number.isFinite(Math.fround(v))
  ) || s.probeSpacing <= 0 || s.environment.some((v) => v < 0) || request.lights.length > 4)
    return rayReferenceFailure(
      "GI requires 8..512 view, 8..32 cards, 16..256 even samples, 0..2 iterations, 2..4 probes per axis, positive spacing, finite nonnegative environment and at most 4 lights",
      true
    );
  const projection = captureViewProjection(s.view);
  if (!projection.ok) return projection;
  if (request.scene.some(
    (m) => !("missing" in m.field) && m.field.policy.kind === "sampled-visibility"
  ))
    return rayReferenceFailure(
      "sampled visibility is not admitted by the geometric diffuse diagnostic",
      true
    );
  const scene = packSdfScene(request.scene);
  if (!scene.ok) return scene;
  for (const source of request.sources) {
    const instance = request.scene.find((v) => v.instanceId === source.instance.instanceId);
    if (!instance || rayGeometryKey(
      instance,
      "missing" in instance.field ? "missing" : instance.field.meshDigest
    ) !== rayGeometryKey(source.instance, source.layout.meshDigest))
      return rayReferenceFailure("GI capture and tracing snapshots disagree");
  }
  const lightData = packLights(request.lights);
  if (!lightData.ok) return lightData;
  const owned = [], captures = [];
  let bytes = 0;
  const scope = usesLut ? DeviceScope.create(0, "diffuse-gi") : void 0;
  const dispose = () => {
    for (const b of owned) device.destroyBuffer(b);
    for (const c of captures) c.dispose();
    owned.length = 0;
    captures.length = 0;
    scope?.dispose();
  };
  const fail = (result) => {
    dispose();
    return result;
  };
  const make = (label, data2, uniform = false) => {
    const b = device.createBuffer({
      label: `gi.${label}`,
      size: data2.byteLength,
      usage: (uniform ? 64 : 128) | 12
    });
    if (!b.ok) return b;
    owned.push(b.value);
    bytes += data2.byteLength;
    const w = device.queue.writeBuffer(b.value, 0, data2);
    return w.ok ? b : w;
  };
  const lut = scope === void 0 ? void 0 : getOrCreateDirectDfgLut(device, scope);
  if (lut !== void 0 && !lut.ok) return fail(lut);
  const directDfgLut = lut?.value;
  if (directDfgLut !== void 0) bytes += 1024;
  const capture = await createSurfaceCapture(
    device,
    compile,
    request.sources,
    { kind: "cards", resolution: s.cardResolution },
    request.resolveTexture
  );
  if (!capture.ok) return fail(capture);
  captures.push(capture.value);
  const view = await createSurfaceCapture(
    device,
    compile,
    request.sources,
    { kind: "view", resolution: s.resolution, projection: s.view },
    request.resolveTexture
  );
  if (!view.ok) return fail(view);
  captures.push(view.value);
  const cards = capture.value, texels = cards.width * cards.height, pixels = s.resolution * s.resolution;
  const projections = new Uint8Array(
    Math.max(
      1,
      cards.entries.reduce((n, e) => n + e.projections.length, 0)
    ) * 80
  ), pv = new DataView(projections.buffer);
  let index = 0;
  for (const entry of cards.entries)
    for (const projection2 of entry.projections) {
      projections.set(packCardProjection(projection2), index * 80);
      pv.setUint32(index * 80 + 64, entry.instanceId, true);
      pv.setUint32(index * 80 + 68, 1, true);
      index++;
    }
  const probeCount = s.probeCounts.reduce((a, b) => a * b, 1);
  const bounds = giBounds(request.scene, s, projection.value);
  if (!Number.isFinite(bounds.distance) || bounds.distance > 1e5 || bounds.bias >= s.probeSpacing * 0.5)
    return fail(
      rayReferenceFailure("GI domain is too large or SDF uncertainty exceeds half a probe cell")
    );
  const settings = new Uint8Array(176), f = new Float32Array(settings.buffer), u = new Uint32Array(settings.buffer);
  f.set([...s.environment, bounds.distance], 0);
  f.set([...s.probeOrigin, s.probeSpacing], 4);
  u.set([...s.probeCounts, s.samples], 8);
  u.set([request.scene.length, index, s.cardResolution, request.lights.length], 12);
  u.set([s.resolution, probeCount, s.iterations, 0], 16);
  f.set([bounds.bias, 0, 0, 0], 20);
  f.set(projection.value.inverse, 24);
  f.set(projection.value.eye, 40);
  const data = {
    instances: scene.value.instances,
    fields: scene.value.fields,
    cards: projections,
    lights: lightData.value,
    surfaceA: new Uint8Array(texels * GI_SURFACE_STRIDE),
    surfaceB: new Uint8Array(texels * GI_SURFACE_STRIDE),
    probes: new Uint8Array(probeCount * s.samples * GI_PROBE_SAMPLE_STRIDE),
    field: new Uint8Array(pixels * GI_PIXEL_STRIDE),
    reference: new Uint8Array(pixels * GI_PIXEL_STRIDE),
    settings
  };
  const buffers = {};
  for (const key of Object.keys(data)) {
    const b = make(key, data[key], key === "settings");
    if (!b.ok) return fail(b);
    buffers[key] = b.value;
  }
  const bgl = device.createBindGroupLayout({
    entries: [
      ...Array.from({ length: 19 }, (_, binding) => ({
        binding,
        visibility: 4,
        ...binding >= 9 ? {
          texture: {
            sampleType: binding >= 17 ? "depth" : "unfilterable-float"
          }
        } : {
          buffer: {
            type: binding === 8 ? "uniform" : binding >= 5 ? "storage" : "read-only-storage"
          }
        }
      })),
      ...directDfgLut === void 0 ? [] : [
        {
          binding: 19,
          visibility: 4,
          texture: { sampleType: "float", viewDimension: "2d" }
        },
        { binding: 20, visibility: 4, sampler: { type: "filtering" } }
      ]
    ]
  });
  if (!bgl.ok) return fail(bgl);
  const views = [];
  for (const c of [cards, view.value])
    for (const plane of CARD_PLANES) {
      const v = device.createTextureView(c.textures[plane], {});
      if (!v.ok) return fail(v);
      views.push(v.value);
    }
  for (const c of [cards, view.value]) {
    const v = device.createTextureView(c.textures.depth, {});
    if (!v.ok) return fail(v);
    views.push(v.value);
  }
  const group = (read, write, output) => device.createBindGroup({
    layout: bgl.value,
    entries: [
      ...[
        buffers.instances,
        buffers.fields,
        buffers.cards,
        buffers.lights,
        read,
        write,
        buffers.probes,
        output,
        buffers.settings
      ].map((buffer, binding) => ({
        binding,
        resource: { kind: "buffer", value: { buffer } }
      })),
      ...views.map((value, i) => ({
        binding: i + 9,
        resource: { kind: "textureView", value }
      })),
      ...directDfgLut === void 0 ? [] : [
        { binding: 19, resource: { kind: "textureView", value: directDfgLut.view } },
        { binding: 20, resource: { kind: "sampler", value: directDfgLut.sampler } }
      ]
    ]
  });
  const groups = [];
  for (const [read, write] of [
    [buffers.surfaceA, buffers.surfaceB],
    [buffers.surfaceB, buffers.surfaceA]
  ]) {
    const g = group(read, write, buffers.field);
    if (!g.ok) return fail(g);
    groups.push(g.value);
  }
  const finalRead = s.iterations % 2 === 0 ? buffers.surfaceB : buffers.surfaceA;
  const other = s.iterations % 2 === 0 ? buffers.surfaceA : buffers.surfaceB;
  const fieldGroup = group(finalRead, other, buffers.field), referenceGroup = group(finalRead, other, buffers.reference);
  if (!fieldGroup.ok) return fail(fieldGroup);
  if (!referenceGroup.ok) return fail(referenceGroup);
  const layout = device.createPipelineLayout({ bindGroupLayouts: [bgl.value] });
  if (!layout.ok) return fail(layout);
  const shader = await compile(device, { code: kernel, label: "gi.transport" });
  if (!shader.ok) return fail(shader);
  const names = ["seed", "feedback", "traceProbes", "gatherField", "gatherReference"];
  const pipelines = {};
  for (const name of names) {
    const p = device.createComputePipeline({
      label: `gi.${name}`,
      layout: layout.value,
      compute: { module: shader.value, entryPoint: name }
    });
    if (!p.ok) return fail(p);
    pipelines[name] = p.value;
  }
  for (const c of captures) bytes += c.bytes;
  const keys = request.sources.map(surfaceCardKey), sceneKeys = request.scene.map(sdfInstanceKey), lightingKey = JSON.stringify(request.lights), settingsKey = JSON.stringify(s);
  const forward = groups[0], backward = groups[1];
  if (!forward || !backward) return fail(rayReferenceFailure("missing GI generation bindings"));
  let disposed = false;
  return ok({
    buffers: {
      surface: finalRead,
      probes: buffers.probes,
      field: buffers.field,
      reference: buffers.reference
    },
    view: view.value,
    cards,
    diagnostics: {
      bytes,
      rayDistance: bounds.distance,
      surfaceBias: bounds.bias,
      probeCount,
      iterations: s.iterations
    },
    record(encoder) {
      if (disposed) return rayReferenceFailure("GI batch is disposed");
      if (JSON.stringify(request.lights) !== lightingKey || JSON.stringify(s) !== settingsKey || request.sources.length !== keys.length || request.scene.length !== sceneKeys.length || request.sources.some((v, i) => surfaceCardKey(v) !== keys[i]) || request.scene.some((v, i) => sdfInstanceKey(v) !== sceneKeys[i]))
        return rayReferenceFailure("GI snapshot changed; create a new generation before recording");
      const a = cards.record(encoder);
      if (!a.ok) return a;
      const b = view.value.record(encoder);
      if (!b.ok) return b;
      const dispatch = (pipeline, bindings, count, label) => {
        const p = encoder.beginComputePass({ label });
        p.setPipeline(pipeline);
        p.setBindGroup(0, bindings);
        p.dispatchWorkgroups(Math.ceil(count / 64));
        p.end();
      };
      dispatch(pipelines.seed, forward, texels, "gi.seed");
      for (let i = 0; i < s.iterations; i++)
        dispatch(
          pipelines.feedback,
          i % 2 === 0 ? backward : forward,
          texels,
          `gi.feedback-${i + 1}`
        );
      dispatch(pipelines.traceProbes, fieldGroup.value, probeCount * s.samples, "gi.trace-probes");
      dispatch(pipelines.gatherField, fieldGroup.value, pixels, "gi.gather-field");
      dispatch(pipelines.gatherReference, referenceGroup.value, pixels, "gi.gather-reference");
      return ok(void 0);
    },
    dispose() {
      if (!disposed) {
        disposed = true;
        dispose();
      }
    }
  });
}
function giBounds(scene, s, projection) {
  const points = [
    Array.from(s.probeOrigin),
    s.probeOrigin.map((v, i) => v + ((s.probeCounts[i] ?? 0) - 1) * s.probeSpacing)
  ];
  const inv = projection.inverse;
  for (let corner = 0; corner < 8; corner++) {
    const p = [corner & 1 ? 1 : -1, corner & 2 ? 1 : -1, corner & 4 ? 1 : 0, 1];
    const w = p.reduce((sum2, v, i) => sum2 + v * (inv[i * 4 + 3] ?? 0), 0);
    points.push(
      [0, 1, 2].map((a) => p.reduce((sum2, v, i) => sum2 + v * (inv[i * 4 + a] ?? 0), 0) / w)
    );
  }
  let bias = 1e-4 + projection.depth / 1024;
  for (const instance of scene) {
    const { field, transform: m } = instance;
    if (!("missing" in field) && field.policy.kind !== "sampled-visibility")
      bias = Math.max(
        bias,
        (2 * field.policy.errorBound + field.spacing * 0.02) * Math.hypot(...[0, 1, 2, 4, 5, 6, 8, 9, 10].map((i) => m[i] ?? 0)) + projection.depth / 1024
      );
    for (let corner = 0; corner < 8; corner++) {
      const p = [0, 1, 2].map(
        (a) => corner & 1 << a ? field.bounds.max[a] ?? 0 : field.bounds.min[a] ?? 0
      );
      points.push(
        [0, 1, 2].map(
          (a) => (m[a] ?? 0) * (p[0] ?? 0) + (m[4 + a] ?? 0) * (p[1] ?? 0) + (m[8 + a] ?? 0) * (p[2] ?? 0) + (m[12 + a] ?? 0)
        )
      );
    }
  }
  const spans = [0, 1, 2].map(
    (a) => Math.max(...points.map((p) => p[a] ?? 0)) - Math.min(...points.map((p) => p[a] ?? 0))
  );
  return { distance: Math.hypot(...spans) + bias * 4 + 1, bias };
}

// sdk/engine/node_modules/@forgeax/engine-render/src/raytracing/display.ts
import { ok as ok2 } from "@forgeax/engine-types";
async function createRayDisplay(device, compile, request) {
  const mode = ["direct", "gi", "indirect", "coverage", "path"].indexOf(request.mode);
  if (mode < 0 || !Number.isInteger(request.resolution) || request.resolution < 1 || request.resolution > 512 || !Number.isFinite(Math.fround(request.exposure)) || request.exposure < 0)
    return rayReferenceFailure("display requires 1..512 pixels and finite nonnegative exposure");
  const shader = await compile(device, { code: request.kernel, label: "ray.display" });
  if (!shader.ok) return shader;
  const layout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: 2, buffer: { type: "read-only-storage" } },
      { binding: 1, visibility: 2, buffer: { type: "uniform" } }
    ]
  });
  if (!layout.ok) return layout;
  const pipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [layout.value] });
  if (!pipelineLayout.ok) return pipelineLayout;
  const pipeline = device.createRenderPipeline({
    label: `ray.display.${request.mode}`,
    layout: pipelineLayout.value,
    vertex: { module: shader.value, entryPoint: "vs_display", buffers: [] },
    fragment: {
      module: shader.value,
      entryPoint: "fs_display",
      targets: [{ format: "rgba8unorm" }]
    },
    primitive: { topology: "triangle-list" }
  });
  if (!pipeline.ok) return pipeline;
  const uniform = device.createBuffer({ size: 16, usage: 72, label: "ray.display.settings" });
  if (!uniform.ok) return uniform;
  const data = new Uint8Array(16);
  new Uint32Array(data.buffer).set([request.resolution, mode]);
  new Float32Array(data.buffer)[2] = request.exposure;
  const written = device.queue.writeBuffer(uniform.value, 0, data);
  if (!written.ok) {
    device.destroyBuffer(uniform.value);
    return written;
  }
  const group = device.createBindGroup({
    layout: layout.value,
    entries: [request.buffer, uniform.value].map((buffer, binding) => ({
      binding,
      resource: { kind: "buffer", value: { buffer } }
    }))
  });
  if (!group.ok) {
    device.destroyBuffer(uniform.value);
    return group;
  }
  let disposed = false;
  return ok2({
    record(encoder, view) {
      if (disposed) return rayReferenceFailure("ray display is disposed");
      const pass = encoder.beginRenderPass({
        label: `ray.display.${request.mode}`,
        colorAttachments: [
          { view, loadOp: "clear", storeOp: "store", clearValue: { r: 0, g: 0, b: 0, a: 1 } }
        ]
      });
      pass.setPipeline(pipeline.value);
      pass.setBindGroup(0, group.value);
      pass.draw(3);
      pass.end();
      return ok2(void 0);
    },
    dispose() {
      if (!disposed) {
        disposed = true;
        device.destroyBuffer(uniform.value);
      }
    }
  });
}

// sdk/engine/node_modules/@forgeax/engine-render/src/raytracing/irradiance-bake.ts
import { directDfgLutBytes } from "@forgeax/engine-shader";
import { err, ok as ok3 } from "@forgeax/engine-types";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
var BAKE_BATCH_RAYS = 262144;
var NONE = 4294967295;
var sum = (h, text) => h.update(new TextEncoder().encode(`${text}\0`));
function irradianceBakeFingerprint(input) {
  const h = sha256.create();
  sum(h, `${IRRADIANCE_VOLUME_KIND}:${IRRADIANCE_VOLUME_FORMAT}`);
  const usesLut = input.materials.some(
    (material) => materialUsesDirectDfgLut(material.program.paramSchema)
  );
  sum(h, usesLut ? input.kernelLut ?? "missing-direct-dfg-lut-kernel" : input.kernel);
  if (usesLut) h.update(directDfgLutBytes());
  h.update(input.scene.triangles);
  h.update(input.scene.nodes);
  h.update(input.scene.attributes);
  for (const material of input.materials)
    sum(h, `${material.id}|${material.program.contract}|${stableJson(material.asset)}`);
  for (const light of input.lights) sum(h, stableJson(light));
  sum(h, stableJson(input.lattice));
  sum(h, stableJson({ maxBounces: 7, ...input.settings }));
  return `sha256:${bytesToHex(h.digest())}`;
}
function stableJson(value) {
  if (ArrayBuffer.isView(value)) return `[${Array.from(value)}]`;
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value !== null && typeof value === "object")
    return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${stableJson(value[k])}`).join(",")}}`;
  return JSON.stringify(value) ?? "null";
}
function outwardNormals(scene) {
  const rows = new DataView(scene.triangles.buffer, scene.triangles.byteOffset);
  const attrs = new DataView(scene.attributes.buffer, scene.attributes.byteOffset);
  const out = /* @__PURE__ */ new Map();
  for (let t = 0; t < scene.triangleCount; t++) {
    const key = `${rows.getUint32(t * RAY_TRIANGLE_STRIDE + 48, true)}:${rows.getUint32(t * RAY_TRIANGLE_STRIDE + 56, true)}`;
    const n = [0, 0, 0];
    for (let corner = 0; corner < 3; corner++)
      for (let axis = 0; axis < 3; axis++)
        n[axis] = (n[axis] ?? 0) + attrs.getFloat32(t * RAY_ATTRIBUTE_TRIANGLE_STRIDE + corner * 128 + 96 + axis * 4, true);
    out.set(key, [n[0] ?? 0, n[1] ?? 0, n[2] ?? 0]);
  }
  return out;
}
async function bakeIrradianceVolume(device, compile, input) {
  const counted = validateIrradianceLattice(input.lattice);
  if (!counted.ok) return counted;
  const { raysPerProbe, samples, seed } = input.settings;
  if (!Number.isInteger(raysPerProbe) || raysPerProbe < 16 || raysPerProbe > BAKE_BATCH_RAYS || !Number.isInteger(samples) || samples < 1)
    return err({
      code: "irradiance-volume-invalid-rays",
      expected: "integer raysPerProbe in 16..262144 and samples >= 1",
      hint: "pick bake settings within the reference integrator budget",
      detail: { reason: `raysPerProbe ${raysPerProbe}, samples ${samples}` }
    });
  const scope = DeviceScope.create(0, "irradiance-bake");
  try {
    const probeCount = counted.value;
    const directions = sphericalFibonacci(raysPerProbe);
    const total = probeCount * raysPerProbe;
    const radiance = new Float32Array(total * 3);
    const distance = new Float32Array(total);
    const status = new Uint8Array(total);
    const normals = outwardNormals(input.scene);
    const spread = Math.sqrt(4 * Math.PI / raysPerProbe);
    const probesPerBatch = Math.max(1, Math.floor(BAKE_BATCH_RAYS / raysPerProbe));
    let batches = 0;
    for (let first = 0; first < probeCount; first += probesPerBatch, batches++) {
      const last = Math.min(probeCount, first + probesPerBatch);
      const rays = [];
      for (let probe = first; probe < last; probe++) {
        const origin = irradianceProbePosition(input.lattice, probe);
        for (let r = 0; r < raysPerProbe; r++)
          rays.push({
            origin,
            direction: [
              directions[r * 3] ?? 0,
              directions[r * 3 + 1] ?? 0,
              directions[r * 3 + 2] ?? 1
            ],
            coneWidth: 0,
            coneSpread: spread,
            active: true
          });
      }
      const trace = async (faces, environment, maxBounces, count) => {
        const tracer = await createRayPathTracer(device, compile, {
          kernel: input.kernel,
          ...input.kernelLut === void 0 ? {} : { kernelLut: input.kernelLut },
          deviceScope: scope,
          scene: input.scene,
          materials: input.materials,
          faces,
          lights: input.lights,
          ...input.resolveTexture === void 0 ? {} : { resolveTexture: input.resolveTexture },
          settings: {
            width: rays.length,
            height: 1,
            rays,
            maxBounces,
            seed: seed + batches * 2654435769 >>> 0,
            environment,
            maxDistance: input.settings.maxDistance,
            receiver: "full"
          }
        });
        if (!tracer.ok) return tracer;
        const read2 = await traceBatch(device, tracer.value, count, rays.length);
        tracer.value.dispose();
        return read2;
      };
      const read = await trace(
        "material",
        input.settings.environment,
        input.settings.maxBounces ?? 7,
        samples
      );
      if (!read.ok) return read;
      const seen = await trace("both", [0, 0, 0], 1, 1);
      if (!seen.ok) return seen;
      const f = read.value;
      const g = seen.value;
      const u = new Uint32Array(g.buffer);
      for (let i = 0; i < rays.length; i++) {
        const ray = first * raysPerProbe + i;
        const row = i * (RAY_ACCUMULATION_STRIDE / 4);
        const instance = u[row + 16] ?? NONE;
        if (instance === NONE) {
          status[ray] = 0;
          radiance.set([f[row] ?? 0, f[row + 1] ?? 0, f[row + 2] ?? 0], ray * 3);
          distance[ray] = -1;
          continue;
        }
        const n = normals.get(`${instance}:${u[row + 18] ?? 0}`);
        const r = i % raysPerProbe;
        const facing = n === void 0 ? -1 : n[0] * (directions[r * 3] ?? 0) + n[1] * (directions[r * 3 + 1] ?? 0) + n[2] * (directions[r * 3 + 2] ?? 0);
        distance[ray] = g[row + 15] ?? 0;
        if (facing > 0) status[ray] = 2;
        else {
          status[ray] = 1;
          radiance.set([f[row] ?? 0, f[row + 1] ?? 0, f[row + 2] ?? 0], ray * 3);
        }
      }
    }
    const volume = integrateIrradianceProbes(input.lattice, {
      directions,
      radiance,
      distance,
      status
    });
    if (!volume.ok) return volume;
    const bytes = encodeIrradianceVolume(volume.value);
    if (!bytes.ok) return bytes;
    return ok3({
      volume: volume.value,
      bytes: bytes.value,
      digest: irradianceVolumeDigest(bytes.value),
      fingerprint: irradianceBakeFingerprint(input),
      rays: total,
      batches
    });
  } finally {
    scope.dispose();
  }
}
async function traceBatch(device, tracer, samples, rays) {
  for (let sample = 0; sample < samples; sample++) {
    const encoder = device.createCommandEncoder({});
    if (!encoder.ok) return encoder;
    const recorded = tracer.recordSample(encoder.value);
    if (!recorded.ok) return recorded;
    const finished = encoder.value.finish();
    if (!finished.ok) return finished;
    const submitted = device.queue.submit([finished.value]);
    if (!submitted.ok) return submitted;
    await device.queue.onSubmittedWorkDone();
  }
  const size = rays * RAY_ACCUMULATION_STRIDE;
  const staging = device.createBuffer({ size, usage: 9 });
  if (!staging.ok) return staging;
  try {
    const encoder = device.createCommandEncoder({});
    if (!encoder.ok) return encoder;
    encoder.value.copyBufferToBuffer(tracer.buffers.accumulation, 0, staging.value, 0, size);
    const finished = encoder.value.finish();
    if (!finished.ok) return finished;
    const submitted = device.queue.submit([finished.value]);
    if (!submitted.ok) return submitted;
    const mapped = await staging.value.mapAsync(1);
    if (!mapped.ok) return mapped;
    const range = mapped.value.getMappedRange();
    if (!range.ok) return range;
    const out = new Float32Array(range.value.slice(0));
    mapped.value.unmap();
    return ok3(out);
  } finally {
    device.destroyBuffer(staging.value);
  }
}
function createIrradianceVolumeCooker() {
  return {
    key: IRRADIANCE_VOLUME_KIND,
    async cook(input) {
      if (!input.guid) throw new TypeError("irradiance volume bake requires its volume GUID");
      const baked = await bakeIrradianceVolume(input.device, input.compile, input);
      if (!baked.ok) throw new TypeError(`${baked.error.code}: ${JSON.stringify(baked.error)}`);
      return {
        guid: input.guid,
        payload: {
          artifact: IRRADIANCE_VOLUME_ARTIFACT,
          digest: baked.value.digest,
          dimensions: baked.value.volume.dimensions
        },
        refs: [],
        artifacts: {
          [IRRADIANCE_VOLUME_ARTIFACT]: {
            mediaType: IRRADIANCE_VOLUME_MEDIA_TYPE,
            bytes: baked.value.bytes
          }
        },
        inputFingerprint: baked.value.fingerprint
      };
    }
  };
}

// sdk/engine/node_modules/@forgeax/engine-render/src/raytracing/query.ts
import { ok as ok4 } from "@forgeax/engine-types";
async function createRayReferenceQuery(device, compile, kernel, scene, rays) {
  const packed = packReferenceRays(rays);
  if (!packed.ok) return packed;
  const owned = [];
  const dispose = () => {
    for (const buffer of owned) device.destroyBuffer(buffer);
    owned.length = 0;
  };
  const make = (label, bytes) => {
    const buffer = device.createBuffer({
      label,
      size: bytes.byteLength,
      usage: 128 | 8 | 4
    });
    if (!buffer.ok) return buffer;
    owned.push(buffer.value);
    const wrote = device.queue.writeBuffer(buffer.value, 0, bytes);
    return wrote.ok ? buffer : wrote;
  };
  const triangles = make("ray-reference.triangles", scene.triangles);
  if (!triangles.ok) {
    dispose();
    return triangles;
  }
  const nodes = make("ray-reference.nodes", scene.nodes);
  if (!nodes.ok) {
    dispose();
    return nodes;
  }
  const rayBuffer = make("ray-reference.rays", packed.value);
  if (!rayBuffer.ok) {
    dispose();
    return rayBuffer;
  }
  const hits = make("ray-reference.hits", new Uint8Array(rays.length * RAY_HIT_STRIDE));
  if (!hits.ok) {
    dispose();
    return hits;
  }
  const shader = await compile(device, { label: "ray-reference", code: kernel });
  if (!shader.ok) {
    dispose();
    return shader;
  }
  const layout = device.createBindGroupLayout({
    entries: [0, 1, 2, 3].map((binding) => ({
      binding,
      visibility: 4,
      buffer: { type: binding === 3 ? "storage" : "read-only-storage" }
    }))
  });
  if (!layout.ok) {
    dispose();
    return layout;
  }
  const pipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [layout.value] });
  if (!pipelineLayout.ok) {
    dispose();
    return pipelineLayout;
  }
  const pipeline = device.createComputePipeline({
    label: "ray-reference",
    layout: pipelineLayout.value,
    compute: { module: shader.value, entryPoint: "queryTriangles" }
  });
  if (!pipeline.ok) {
    dispose();
    return pipeline;
  }
  const bindings = device.createBindGroup({
    label: "ray-reference",
    layout: layout.value,
    entries: [triangles.value, nodes.value, rayBuffer.value, hits.value].map((buffer, binding) => ({
      binding,
      resource: { kind: "buffer", value: { buffer } }
    }))
  });
  if (!bindings.ok) {
    dispose();
    return bindings;
  }
  let disposed = false;
  return ok4({
    buffers: {
      triangles: triangles.value,
      nodes: nodes.value,
      rays: rayBuffer.value,
      hits: hits.value
    },
    rayCount: rays.length,
    record(encoder) {
      if (disposed) return rayReferenceFailure("query batch is disposed");
      const pass = encoder.beginComputePass({ label: "ray-reference" });
      pass.setPipeline(pipeline.value);
      pass.setBindGroup(0, bindings.value);
      pass.dispatchWorkgroups(Math.ceil(rays.length / 64), 1, 1);
      pass.end();
      return ok4(void 0);
    },
    dispose() {
      if (!disposed) {
        disposed = true;
        dispose();
      }
    }
  });
}

// sdk/engine/node_modules/@forgeax/engine-render/src/raytracing/software-sdf-query.ts
import { ok as ok5 } from "@forgeax/engine-types";
var CONTINUE_WGSL = `
struct Ray { origin: vec3f, tMin: f32, direction: vec3f, tMax: f32, mask: vec4u }
@group(0) @binding(0) var<storage,read> detailRays: array<Ray>;
@group(0) @binding(1) var<storage,read> detailResults: array<vec4u>;
@group(0) @binding(2) var<storage,read_write> globalRays: array<Ray>;
@compute @workgroup_size(64) fn main(@builtin(global_invocation_id) id: vec3u) {
  if(id.x>=arrayLength(&detailRays)){return;}
  let detail=detailRays[id.x];let state=detailResults[id.x*${SDF_HIT_STRIDE / 16}u];
  // tMax is the unchanged full interval on every recording, including repeats.
  let fullEnd=globalRays[id.x].tMax;
  let continued=detail.mask.x!=0u && state.x==${SdfQueryStatus.miss}u
    && all(state.yzw==vec3u(0xffffffffu)) && detail.tMax<fullEnd;
  var ray=detail;ray.tMax=fullEnd;
  ray.tMin=select(detail.tMin,detail.tMax,continued);
  ray.mask.x=select(0u,detail.mask.x,continued);
  globalRays[id.x]=ray;
}
`;
async function createSoftwareSdfQuery(device, compile, composition, source, rays, options) {
  if (!options || typeof options !== "object" || Array.isArray(options))
    return rayReferenceFailure("software SDF query requires a detail distance");
  const distance = Math.fround(options.detailDistance);
  if (!Number.isFinite(distance) || distance < 2 ** -126)
    return rayReferenceFailure("detail distance must be positive normal finite f32");
  const expected = new Map(composition.sources.map((s) => [s.instanceId, s.key]));
  if (source.length !== expected.size || source.some((s) => expected.get(s.instanceId) !== sdfInstanceKey(s)))
    return rayReferenceFailure(
      "detail traversal must use the complete frozen composition source roster"
    );
  const packed = packReferenceRays(rays);
  if (!packed.ok) return packed;
  const view = new DataView(packed.value.buffer, packed.value.byteOffset, packed.value.byteLength);
  const original = [], near = [];
  for (let offset = 0; offset < packed.value.byteLength; offset += 48) {
    const ray = {
      origin: [0, 1, 2].map((a) => view.getFloat32(offset + a * 4, true)),
      direction: [0, 1, 2].map((a) => view.getFloat32(offset + 16 + a * 4, true)),
      tMin: view.getFloat32(offset + 12, true),
      tMax: view.getFloat32(offset + 28, true),
      mask: view.getUint32(offset + 32, true)
    };
    const end = Math.min(ray.tMax, Math.fround(ray.tMin + distance / Math.hypot(...ray.direction)));
    if (!(end > ray.tMin))
      return rayReferenceFailure("detail distance cannot advance the rounded ray interval");
    original.push(ray);
    near.push({ ...ray, tMax: end });
  }
  const [detailResult, globalResult] = await Promise.all([
    createSdfQuery(device, compile, source, near, options.detail),
    createGlobalSdfQuery(device, compile, composition, original, options.global)
  ]);
  if (!detailResult.ok) {
    if (globalResult.ok) globalResult.value.dispose();
    return detailResult;
  }
  const detail = detailResult.value;
  if (!globalResult.ok) {
    detail.dispose();
    return globalResult;
  }
  const global = globalResult.value;
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    global.dispose();
    detail.dispose();
  };
  const fail = (result) => {
    dispose();
    return result;
  };
  const shader = await compile(device, { code: CONTINUE_WGSL, label: "sdf.continue-global" });
  if (!shader.ok) return fail(shader);
  const bgl = device.createBindGroupLayout({
    entries: [0, 1, 2].map((binding) => ({
      binding,
      visibility: 4,
      buffer: { type: binding === 2 ? "storage" : "read-only-storage" }
    }))
  });
  if (!bgl.ok) return fail(bgl);
  const layout = device.createPipelineLayout({ bindGroupLayouts: [bgl.value] });
  if (!layout.ok) return fail(layout);
  const group = device.createBindGroup({
    layout: bgl.value,
    entries: [detail.buffers.rays, detail.buffers.hits, global.buffers.rays].map(
      (buffer, binding) => ({
        binding,
        resource: { kind: "buffer", value: { buffer } }
      })
    )
  });
  if (!group.ok) return fail(group);
  const pipeline = device.createComputePipeline({
    layout: layout.value,
    compute: { module: shader.value, entryPoint: "main" }
  });
  if (!pipeline.ok) return fail(pipeline);
  return ok5({
    detail,
    global,
    dispose,
    record(encoder) {
      if (disposed) return rayReferenceFailure("software SDF query is disposed");
      const recorded = detail.record(encoder);
      if (!recorded.ok) return recorded;
      const pass = encoder.beginComputePass({ label: "sdf.continue-global" });
      pass.setPipeline(pipeline.value);
      pass.setBindGroup(0, group.value);
      pass.dispatchWorkgroups(Math.ceil(detail.rayCount / 64));
      pass.end();
      return global.record(encoder);
    }
  });
}

// sdk/engine/node_modules/@forgeax/engine-render/src/ssr/temporal.ts
import { err as err2, ok as ok6 } from "@forgeax/engine-types";
function coordinatorInput(input) {
  const consumerIds = input.consumerIds?.includes("ssr") ? input.consumerIds : [...input.consumerIds ?? [], "ssr"];
  return { ...input, temporalDemand: true, consumerIds };
}
function resetCoordinator(coordinator, reason) {
  switch (reason) {
    case "first-enable":
    case "disable":
      return;
    case "resize":
      coordinator.reset("resize");
      return;
    case "camera-cut":
      coordinator.reset("cut");
      return;
    case "history-version":
      coordinator.reset("camera-switch");
      return;
    case "coverage-loss":
      coordinator.reset("detach");
      return;
    case "reflection-generation":
    case "device-recovery":
      coordinator.reset("device-generation");
      return;
  }
}
var SsrTemporalConsumer = class {
  constructor(coordinator, history) {
    this.coordinator = coordinator;
    this.history = history;
  }
  coordinator;
  history;
  begin(input) {
    const history = this.history.beginFrame();
    if (!history.ok) return history;
    const temporal = this.coordinator.begin(coordinatorInput(input));
    if (!temporal.ok) {
      this.history.abortFrame(history.value, "build");
      return temporal;
    }
    return ok6({ temporal: temporal.value, history: history.value });
  }
  commit(candidate) {
    const committed = this.coordinator.commit(candidate.temporal);
    if (!committed.ok) {
      this.history.abortFrame(candidate.history, "submit");
      return committed;
    }
    const history = this.history.commitFrame(candidate.history);
    if (!history.ok) return history;
    return committed;
  }
  abort(candidate, stage) {
    this.history.abortFrame(candidate.history, stage);
    this.coordinator.abort(candidate.temporal, stage);
  }
  run(input, phases) {
    const started = this.begin(input);
    if (!started.ok) return started;
    const candidate = started.value;
    try {
      const built = phases.build();
      phases.encode(built);
      phases.finish();
      phases.submit();
    } catch (cause) {
      const stage = temporalFrameStageFromError(cause);
      this.abort(candidate, stage);
      return err2({
        code: "ssr-temporal-stage-failed",
        expected: `SSR temporal ${stage} succeeds before commit`,
        hint: "inspect the owned stage failure and retry without promoting the candidate",
        detail: { stage, cause }
      });
    }
    return this.commit(candidate);
  }
  reset(reason) {
    this.history.reset(reason);
    resetCoordinator(this.coordinator, reason);
  }
  retireAfterFence(queue, onFailure) {
    this.history.retireAfterFence(queue, onFailure);
  }
  inspect() {
    const temporal = this.coordinator.inspect();
    return Object.freeze({
      sharedEpoch: temporal.epoch,
      consumerIds: temporal.consumerIds,
      coordinatorAttempt: temporal.attempt,
      history: this.history.inspect()
    });
  }
};
function createSsrTemporalConsumer(coordinator, history) {
  return new SsrTemporalConsumer(coordinator, history);
}
export {
  CARD_LOOKUP_STRIDE,
  CARD_PLANES,
  CardLookupStatus,
  DeviceScope,
  EXTENDED_LIGHTING_REQUIRED_SAMPLED_TEXTURES,
  GI_PIXEL_STRIDE,
  GI_PROBE_SAMPLE_STRIDE,
  GI_SURFACE_STRIDE,
  GLOBAL_CARD_CANDIDATE_STRIDE,
  GLOBAL_SDF_CARD_LOOKUP_WGSL,
  GLOBAL_SDF_COMPOSE_WGSL,
  GLOBAL_SDF_HIT_STRIDE,
  GLOBAL_SDF_QUERY_WGSL,
  GLOBAL_SDF_VOXEL_STRIDE,
  GiStatus,
  GlobalCardCandidateFlags,
  GlobalSdfQueryStatus,
  GlobalSdfVoxelStatus,
  IRRADIANCE_FIELD_COVERAGE_BYTES,
  IRRADIANCE_FIELD_COVERAGE_WGSL,
  IRRADIANCE_VOLUME_ARTIFACT,
  IRRADIANCE_VOLUME_FORMAT,
  IRRADIANCE_VOLUME_KIND,
  IRRADIANCE_VOLUME_MEDIA_TYPE,
  PROBE_MAX_CONTRIBUTORS,
  PROBE_RAYS_WGSL,
  ProbeRayStatus,
  SSR_HISTORY_FORMAT,
  SdfQueryStatus,
  SsrHistoryOwner,
  SsrTemporalConsumer,
  TemporalFrameCoordinator,
  admitProbeContributors,
  bakeIrradianceVolume,
  blendLightProbes,
  buildRayReferenceScene,
  buildRaySurfaceScene,
  buildRectAreaWorldFrame,
  captureMeshPipelinePreparation,
  createDiffuseGi,
  createDynamicGeometrySourceHost,
  createExtendedLightingState,
  createGlobalSdfCardLookup,
  createGlobalSdfCardLookupRecorder,
  createGlobalSdfComposition,
  createGlobalSdfCompositionRecorder,
  createGlobalSdfQuery,
  createGlobalSdfQueryRecorder,
  createIrradianceVolumeCooker,
  createLightResourceUnavailable,
  createProbeRayRecorder,
  createRasterProbePlacement,
  createRasterRayGenerator,
  createRayDisplay,
  createRayPathTracer,
  createRayReferenceQuery,
  createSdfCardLookup,
  createSdfQuery,
  createSoftwareSdfQuery,
  createSsrHistoryOwner,
  createSsrTemporalConsumer,
  createSubmittedRayPathTracer,
  createSurfaceCapture,
  decodeIrradianceVolume,
  deriveExtendedLightingCapability,
  deriveLtcResourcePlan,
  encodeIrradianceVolume,
  estimateSsrSpatialMemory,
  extendedLightingSampledTextureCapacityAvailable,
  fullscreenRenderFeatureDeclaration,
  integrateIrradianceProbes,
  irradianceBakeFingerprint,
  irradianceProbePosition,
  irradianceVolumeContribution,
  irradianceVolumeDigest,
  irradianceVolumeKind,
  irradianceVolumeProbeBlocks,
  isOwnedRenderFeatureProgramData,
  ownRenderFeatureProgramData,
  packReferenceRays,
  projectExtendedLightingInspection,
  promoteExtendedLightingCandidate,
  recordExtendedLightingFailure,
  rectAreaFacesPoint,
  scaledProbeWeight,
  sphericalFibonacci,
  summarizeGpuPassTimingIntervals,
  traceReferenceRay,
  validateGraphTargetCaptureReadback,
  validateIrradianceLattice,
  validateIrradianceVolume
};
//# sourceMappingURL=internal.mjs.map
