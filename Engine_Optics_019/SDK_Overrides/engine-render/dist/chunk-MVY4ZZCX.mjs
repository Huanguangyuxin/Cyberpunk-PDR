import {
  CloudQualityValue,
  cloudQualityFromF32,
  collectAuthoredMaterialSamplerFields,
  collectAuthoredMaterialTextureFields,
  deriveRenderDataTexture,
  materialSnapshotContext,
  resolveMaterialSnapshot,
  worldRenderResources
} from "./chunk-XAU6MWMX.mjs";

// sdk/engine/node_modules/@forgeax/engine-render/src/decals/component.ts
import { defineComponent } from "@forgeax/engine-ecs";
var ProjectedDecal = defineComponent("ProjectedDecal", {
  material: { type: "asset<material>" },
  order: { type: "i32", default: 0 },
  opacity: { type: "f32", default: 1 },
  normalThreshold: { type: "f32", default: 0 },
  colorOpacity: { type: "f32", default: 1 },
  normalOpacity: { type: "f32", default: 1 },
  roughnessOpacity: { type: "f32", default: 1 }
});
var ProjectedDecalInvalidError = class extends Error {
  constructor(field, expected) {
    super(`Invalid ProjectedDecal ${field}: expected ${expected}`);
    this.expected = expected;
    this.name = "ProjectedDecalInvalidError";
    this.detail = { field };
  }
  expected;
  code = "projected-decal-invalid";
  hint = "repair the named ProjectedDecal input; use Standard Deferred with single-sample depth";
  detail;
};

// sdk/engine/node_modules/@forgeax/engine-render/src/errors/cloud.ts
var CloudLayerInvalidParameterError = class extends Error {
  code = "cloud-layer-invalid-parameter";
  expected;
  hint;
  detail;
  constructor(field, value, expected) {
    super(`CloudLayer.${field} is invalid`);
    this.name = "CloudLayerInvalidParameterError";
    this.expected = `CloudLayer.${field} must be ${expected}`;
    this.hint = `set CloudLayer.${field} to ${expected}`;
    this.detail = { field, value, expected };
  }
};
var CloudLayerOwnerConflictError = class extends Error {
  code = "cloud-layer-owner-conflict";
  expected = "at most one CloudLayer owns a World frame";
  hint = "remove additional CloudLayer owners before extraction";
  detail;
  constructor(count) {
    super(`CloudLayer owner cardinality is ${count}`);
    this.name = "CloudLayerOwnerConflictError";
    this.detail = { count };
  }
};
var CloudLayerCacheInvalidError = class extends Error {
  code = "cloud-layer-cache-invalid";
  expected = "the density cache payload matches its reconstructible source";
  hint = "discard the derived cache and rebuild it from CloudLayer source facts";
  detail;
  constructor(sourceKey, reason) {
    super(`CloudLayer cache is invalid: ${reason}`);
    this.name = "CloudLayerCacheInvalidError";
    this.detail = { sourceKey, reason };
  }
};
var CloudLayerCapabilityMissingError = class extends Error {
  code = "cloud-layer-capability-missing";
  expected = "the selected backend exposes the capability required by the cloud lane";
  hint = "inspect the capability report, disable the cloud lane on this backend, or retry on a backend with the required capability";
  detail;
  constructor(capability) {
    super(`CloudLayer capability is unavailable: ${capability}`);
    this.name = "CloudLayerCapabilityMissingError";
    this.detail = { capability };
  }
};
var CloudLayerResourceFailureError = class extends Error {
  code = "cloud-layer-resource-failed";
  expected = "cloud resources are created, submitted and retired as one generation";
  hint = "keep the last-known-good cloud generation and retry after recovery";
  detail;
  constructor(detail) {
    super(`CloudLayer ${detail.stage} resource failed at generation ${detail.generation}`);
    this.name = "CloudLayerResourceFailureError";
    this.detail = detail;
  }
};

// sdk/engine/node_modules/@forgeax/engine-render/src/cloud/parameters.ts
import { CLOUD_EXTINCTION_COEFFICIENT } from "@forgeax/engine-shader";
import { err, ok } from "@forgeax/engine-types";
var CLOUD_QUALITY_PROFILES = Object.freeze({
  low: Object.freeze({
    // Preserve low-profile ray counts while keeping separate puffs from
    // collapsing into one bilinear cache smear.
    cacheResolution: 32,
    viewSteps: 40,
    shadowSteps: 12,
    historyWeight: 0.82,
    viewDistance: 1600
  }),
  medium: Object.freeze({
    cacheResolution: 40,
    viewSteps: 64,
    shadowSteps: 20,
    historyWeight: 0.9,
    viewDistance: 2400
  }),
  high: Object.freeze({
    cacheResolution: 64,
    viewSteps: 64,
    shadowSteps: 32,
    historyWeight: 0.94,
    viewDistance: 4e3
  })
});
function cloudShadowResolutionForQuality(qualityValue) {
  return CLOUD_QUALITY_PROFILES[qualityValue].cacheResolution * 4;
}
function cloudViewDistanceForQuality(qualityValue) {
  return CLOUD_QUALITY_PROFILES[qualityValue].viewDistance;
}
var DEFAULT_CLOUD_LAYER = Object.freeze({
  seed: 1337,
  baseHeight: 120,
  thickness: 80,
  scale: 4e-3,
  coverage: 0.48,
  density: 1,
  wind: Object.freeze([8, 0, 2]),
  quality: "medium",
  shadowRange: 512
});
function invalid(field, value, expected) {
  return err(new CloudLayerInvalidParameterError(field, value, expected));
}
function finiteRange(field, value, min, max = Number.POSITIVE_INFINITY) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    const expected = Number.isFinite(max) ? `finite and in [${min}, ${max}]` : `finite and >= ${min}`;
    return invalid(field, value, expected);
  }
  return ok(value);
}
function quality(value) {
  if (typeof value === "string" && (value === "low" || value === "medium" || value === "high")) {
    return ok(value);
  }
  if (typeof value === "number") {
    const resolved = cloudQualityFromF32(value);
    if (resolved !== void 0) return ok(resolved);
  }
  return invalid(
    "quality",
    value,
    `one of low, medium, high (codes ${CloudQualityValue.low}, ${CloudQualityValue.medium}, ${CloudQualityValue.high})`
  );
}
function wind(value) {
  if (value === void 0 || value === null || typeof value !== "object") {
    return invalid("wind", value, "three finite world-space components");
  }
  const source = value;
  if (source.length !== 3) return invalid("wind", value, "three finite world-space components");
  const result = [
    source[0] ?? Number.NaN,
    source[1] ?? Number.NaN,
    source[2] ?? Number.NaN
  ];
  if (result.some((entry) => !Number.isFinite(entry) || Math.abs(entry) > 1e3)) {
    return invalid("wind", value, "three finite components in [-1000, 1000]");
  }
  return ok(Object.freeze(result));
}
function validateCloudLayer(input) {
  const value = input ?? {};
  const seed = value.seed ?? DEFAULT_CLOUD_LAYER.seed;
  if (typeof seed !== "number" || !Number.isInteger(seed) || seed < 0 || seed > 4294967295) {
    return invalid("seed", seed, "an integer in [0, 4294967295]");
  }
  const baseHeight = finiteRange(
    "baseHeight",
    value.baseHeight ?? DEFAULT_CLOUD_LAYER.baseHeight,
    -1e5,
    1e6
  );
  if (!baseHeight.ok) return baseHeight;
  const thickness = finiteRange(
    "thickness",
    value.thickness ?? DEFAULT_CLOUD_LAYER.thickness,
    1e-3,
    1e6
  );
  if (!thickness.ok) return thickness;
  const scale = finiteRange("scale", value.scale ?? DEFAULT_CLOUD_LAYER.scale, 1e-6, 10);
  if (!scale.ok) return scale;
  const coverage = finiteRange("coverage", value.coverage ?? DEFAULT_CLOUD_LAYER.coverage, 0, 1);
  if (!coverage.ok) return coverage;
  const density = finiteRange("density", value.density ?? DEFAULT_CLOUD_LAYER.density, 0, 32);
  if (!density.ok) return density;
  const resolvedWind = wind(value.wind ?? DEFAULT_CLOUD_LAYER.wind);
  if (!resolvedWind.ok) return resolvedWind;
  const resolvedQuality = quality(value.quality ?? DEFAULT_CLOUD_LAYER.quality);
  if (!resolvedQuality.ok) return resolvedQuality;
  const shadowRange = finiteRange(
    "shadowRange",
    value.shadowRange ?? DEFAULT_CLOUD_LAYER.shadowRange,
    1e-3,
    1e7
  );
  if (!shadowRange.ok) return shadowRange;
  return ok(
    Object.freeze({
      seed,
      baseHeight: baseHeight.value,
      thickness: thickness.value,
      scale: scale.value,
      coverage: coverage.value,
      density: density.value,
      wind: resolvedWind.value,
      quality: resolvedQuality.value,
      shadowRange: shadowRange.value
    })
  );
}
function cloudLayerSourceKey(params) {
  return [
    "cloud-layer-v1",
    params.seed,
    params.baseHeight,
    params.thickness,
    params.scale,
    params.coverage,
    params.density,
    params.wind[0],
    params.wind[1],
    params.wind[2],
    params.quality,
    params.shadowRange
  ].join(":");
}
function cloudLayerFormationKey(params) {
  return [
    "cloud-formation-v5",
    params.seed,
    params.baseHeight,
    params.thickness,
    params.scale,
    params.quality
  ].join(":");
}

// sdk/engine/node_modules/@forgeax/engine-render/src/components/glyph-text.ts
import { defineComponent as defineComponent2 } from "@forgeax/engine-ecs";
var GlyphText = defineComponent2("GlyphText", {
  // The layout/render owner re-resolves the font asset on the target world;
  // authoring text and style remain portable simulation state.
  fontHandle: {
    type: "asset<font>",
    default: 0,
    simulationTransient: true
  },
  text: { type: "string", default: "" },
  fontSize: { type: "f32", default: 16 },
  // color carries an explicit layer-2 default [1,1,1,1] (opaque white); the
  // array layer-3 fallback is all-zero, so the default MUST be explicit (D-5).
  color: { type: "array<f32, 4>", default: new Float32Array([1, 1, 1, 1]) }
});

// sdk/engine/node_modules/@forgeax/engine-render/src/capsule-shadow/world-capsules.ts
import { SHADOW_CAPSULE_STRIDE } from "@forgeax/engine-types";
var WORLD_CAPSULE_STRIDE = 8;
function poseShadowCapsules(set, inverseBindMatrices, jointWorlds) {
  const count = set.joints.length;
  const out = new Float32Array(count * WORLD_CAPSULE_STRIDE);
  const m = new Float32Array(16);
  for (let index = 0; index < count; index++) {
    const joint = set.joints[index];
    const world = jointWorlds[joint];
    const ibm = inverseBindMatrices[joint];
    if (world === void 0 || ibm === void 0) continue;
    for (let column = 0; column < 4; column++) {
      for (let row = 0; row < 4; row++) {
        let sum = 0;
        for (let k = 0; k < 4; k++) {
          sum += world[k * 4 + row] * ibm[column * 4 + k];
        }
        m[column * 4 + row] = sum;
      }
    }
    const shape = index * SHADOW_CAPSULE_STRIDE;
    const base = index * WORLD_CAPSULE_STRIDE;
    for (const [src, dst] of [
      [shape, base],
      [shape + 3, base + 4]
    ]) {
      const x = set.shapes[src];
      const y = set.shapes[src + 1];
      const z = set.shapes[src + 2];
      out[dst] = m[0] * x + m[4] * y + m[8] * z + m[12];
      out[dst + 1] = m[1] * x + m[5] * y + m[9] * z + m[13];
      out[dst + 2] = m[2] * x + m[6] * y + m[10] * z + m[14];
    }
    const scale = (Math.hypot(m[0], m[1], m[2]) + Math.hypot(m[4], m[5], m[6]) + Math.hypot(m[8], m[9], m[10])) / 3;
    out[base + 3] = set.shapes[shape + 6] * scale;
  }
  return out;
}

// sdk/engine/node_modules/@forgeax/engine-render/src/decals/extract.ts
import { readMaterialContent, runtimeAssets } from "@forgeax/engine-assets-runtime/internal";
import { readRenderArrayView } from "@forgeax/engine-ecs/projection";
import { mat4, vec3 } from "@forgeax/engine-math";
import { GlobalTransform } from "@forgeax/engine-scene";
var MAX_PROJECTED_DECALS = 64;
var DECAL_TEXTURE_FIELDS = [
  "baseColorTexture",
  "normalTexture",
  "roughnessTexture"
];
function extractProjectedDecals(world, context) {
  const result = [];
  const query = world.query({ read: [ProjectedDecal] }).unwrap();
  for (const row of query) {
    if (context.visibility.effective(row.entity) === "hidden") continue;
    const data = row.get(ProjectedDecal);
    for (const field of [
      "opacity",
      "colorOpacity",
      "normalOpacity",
      "roughnessOpacity",
      "normalThreshold"
    ]) {
      const minimum = field === "normalThreshold" ? -1 : 0;
      if (!Number.isFinite(data[field]) || data[field] < minimum || data[field] > 1)
        throw new ProjectedDecalInvalidError(field, `a finite number in [${minimum}, 1]`);
    }
    if (data.opacity === 0 || data.colorOpacity === 0 && data.normalOpacity === 0 && data.roughnessOpacity === 0)
      continue;
    const raw = readRenderArrayView(world, row.entity, GlobalTransform, "world");
    if (raw === void 0)
      throw new ProjectedDecalInvalidError("transform", "a propagated world transform");
    const transform = new Float32Array(raw);
    const basis = [0, 4, 8].map((offset) => transform.subarray(offset, offset + 3));
    const x = basis[0];
    const y = basis[1];
    const z = basis[2];
    const determinant = vec3.dot(vec3.cross(vec3.create(), x, y), z);
    const scale = Math.hypot(...x) * Math.hypot(...y) * Math.hypot(...z);
    if (!transform.every(Number.isFinite) || !Number.isFinite(scale) || scale === 0 || Math.abs(determinant) <= scale * 1e-8)
      throw new ProjectedDecalInvalidError("transform", "a finite invertible projection box");
    const inverse = mat4.invert(mat4.create(), transform);
    if (!inverse.every(Number.isFinite) || !mat4.equals(
      mat4.multiply(mat4.create(), inverse, transform),
      mat4.identity(mat4.create()),
      1e-4
    ))
      throw new ProjectedDecalInvalidError("transform", "a stable float32 inverse");
    const handle = Number(data.material);
    if (context.assets === void 0 || context.assets === null || Number(data.material) === 0)
      throw new ProjectedDecalInvalidError("material", "a loaded Standard MaterialAsset");
    const resolved = readMaterialContent(runtimeAssets(world.assets), handle);
    if (!resolved.ok) throw new ProjectedDecalInvalidError("material", resolved.error.expected);
    const material = resolveMaterialSnapshot(
      Number(handle),
      worldRenderResources(world),
      context.assets,
      void 0,
      materialSnapshotContext(
        context.materialSnapshotContexts,
        context.materialContext?.geometry ?? "mesh",
        false
      ),
      context.materialContext
    );
    if (!material.deferredPass || material.materialShaderId !== "forgeax::default-standard-pbr")
      throw new ProjectedDecalInvalidError(
        "material",
        "a base Standard material with a Deferred pass"
      );
    if (![...material.baseColor, material.roughness].every(Number.isFinite))
      throw new ProjectedDecalInvalidError("material", "finite color and roughness");
    const authored = collectAuthoredMaterialTextureFields(
      resolved.value.values,
      material.materialShaderId,
      material.materialParamSchema,
      context.assets
    );
    const authoredSamplers = collectAuthoredMaterialSamplerFields(resolved.value.values, authored);
    if (Number(material.paramSnapshot?.alphaHash ?? 0) !== 0)
      throw new ProjectedDecalInvalidError("alphaHash", "continuous opacity or alphaCutoff");
    for (const field of authored ?? []) {
      if (!DECAL_TEXTURE_FIELDS.includes(field))
        throw new ProjectedDecalInvalidError(
          field,
          "baseColorTexture, normalTexture, or roughnessTexture"
        );
    }
    const textures = DECAL_TEXTURE_FIELDS.map((field) => {
      const textureHandle = material.textureHandles?.get(field);
      if (textureHandle === void 0) {
        if (authored?.has(field))
          throw new ProjectedDecalInvalidError(field, "a resolved static 2D texture");
        return void 0;
      }
      const texture = runtimeAssets(world.assets).resolveAsset(textureHandle);
      if (!texture.ok) throw new ProjectedDecalInvalidError(field, texture.error.expected);
      if (texture.value.kind !== "texture" || texture.value.shape.viewDimension !== "2d")
        throw new ProjectedDecalInvalidError(field, "a static 2D texture");
      if (field !== "baseColorTexture" && texture.value.colorSpace !== "linear")
        throw new ProjectedDecalInvalidError(field, "linear material data");
      if (texture.value.format.endsWith("uint") || texture.value.format.endsWith("sint") || texture.value.format.includes("32float") || texture.value.format.startsWith("depth"))
        throw new ProjectedDecalInvalidError(field, "a filterable color texture format");
      const layout = deriveRenderDataTexture(texture.value);
      if (!layout.ok) throw new ProjectedDecalInvalidError(field, layout.error.expected);
      const coordinates = material.textureCoordinates?.get(field);
      if (coordinates?.set !== void 0 && coordinates.set !== 0)
        throw new ProjectedDecalInvalidError(field, "projector UV set 0");
      return texture.value;
    });
    const samplers = DECAL_TEXTURE_FIELDS.map((field) => {
      const sampler = material.samplerHandles?.get(field);
      if (sampler === void 0) {
        if (authoredSamplers?.has(field))
          throw new ProjectedDecalInvalidError(field, "a resolved sampler");
        return void 0;
      }
      const resolved2 = runtimeAssets(world.assets).resolveAsset(sampler);
      if (!resolved2.ok) throw new ProjectedDecalInvalidError(field, resolved2.error.expected);
      if (resolved2.value.compare !== void 0)
        throw new ProjectedDecalInvalidError(field, "a color sampler without comparison");
      return resolved2.value;
    });
    result.push({
      ...data,
      entityKey: row.entity,
      worldId: context.worldId,
      transform,
      inverse,
      material,
      textures,
      samplers
    });
    if (result.length > MAX_PROJECTED_DECALS)
      throw new ProjectedDecalInvalidError(
        "count",
        `at most ${MAX_PROJECTED_DECALS} visible decals`
      );
  }
  return result.sort((a, b) => a.order - b.order || a.entityKey - b.entityKey);
}

export {
  ProjectedDecal,
  ProjectedDecalInvalidError,
  CloudLayerInvalidParameterError,
  CloudLayerOwnerConflictError,
  CloudLayerCacheInvalidError,
  CloudLayerCapabilityMissingError,
  CloudLayerResourceFailureError,
  CLOUD_EXTINCTION_COEFFICIENT,
  CLOUD_QUALITY_PROFILES,
  cloudShadowResolutionForQuality,
  cloudViewDistanceForQuality,
  DEFAULT_CLOUD_LAYER,
  validateCloudLayer,
  cloudLayerSourceKey,
  cloudLayerFormationKey,
  GlyphText,
  WORLD_CAPSULE_STRIDE,
  poseShadowCapsules,
  MAX_PROJECTED_DECALS,
  DECAL_TEXTURE_FIELDS,
  extractProjectedDecals
};
//# sourceMappingURL=chunk-MVY4ZZCX.mjs.map
