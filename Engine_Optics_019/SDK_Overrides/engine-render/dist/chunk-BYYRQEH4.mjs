import {
  CLOUD_EXTINCTION_COEFFICIENT,
  CLOUD_QUALITY_PROFILES,
  CloudLayerCacheInvalidError,
  cloudLayerFormationKey,
  cloudShadowResolutionForQuality,
  cloudViewDistanceForQuality
} from "./chunk-MVY4ZZCX.mjs";
import {
  CloudHistoryStore,
  addTypedScenePass,
  cloudHistoryExtent,
  createCloudHistory,
  createRenderPipelineTarget,
  prepareMainPassPipelines,
  selectMainPassMaterials
} from "./chunk-JWVQREUV.mjs";
import {
  FORWARD_PASS_SELECTOR,
  GPU_SHADER_STAGE_FRAGMENT,
  getOrCreateFromChain
} from "./chunk-XAU6MWMX.mjs";

// sdk/engine/node_modules/@forgeax/engine-render/src/cloud/density.ts
import { CLOUD_VERTICAL_CELLS } from "@forgeax/engine-shader";
import { err, fnv1a32, ok } from "@forgeax/engine-types";
var CLOUD_SHAPE_CELLS = 4;
var CLOUD_WEATHER_CELLS = 2;
var CLOUD_DETAIL_CELLS = CLOUD_SHAPE_CELLS * 3;
var CLOUD_VERTICAL_NOISE_CELLS = 2;
var CLOUD_DETAIL_VERTICAL_CELLS = 3;
function saturate(value) {
  return Math.min(1, Math.max(0, value));
}
function smoothstep(edge0, edge1, value) {
  const t = saturate((value - edge0) / Math.max(1e-6, edge1 - edge0));
  return t * t * (3 - 2 * t);
}
function fract(value) {
  return value - Math.floor(value);
}
function wrapInteger(value, period) {
  const wrapped2 = value % period;
  return wrapped2 < 0 ? wrapped2 + period : wrapped2;
}
function hash3(x, y, z, seed) {
  let value = Math.imul(x | 0, 73244475);
  value = Math.imul(value ^ Math.imul(y | 0, 295559667), 73244475);
  value = Math.imul(value ^ Math.imul(z | 0, 214175), 73244475);
  value ^= seed | 0;
  value = Math.imul(value ^ value >>> 16, 73244475);
  value = Math.imul(value ^ value >>> 13, 668265261);
  return ((value ^ value >>> 16) >>> 0) / 4294967296;
}
function valueNoise(x, y, z, seed, periodX = 0, periodY = 0, periodZ = 0) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fy = y - iy;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const uz = fz * fz * (3 - 2 * fz);
  const lattice = (cellX, cellY, cellZ) => hash3(
    periodX > 0 ? wrapInteger(cellX, periodX) : cellX,
    periodY > 0 ? wrapInteger(cellY, periodY) : cellY,
    periodZ > 0 ? wrapInteger(cellZ, periodZ) : cellZ,
    seed
  );
  const c000 = lattice(ix, iy, iz);
  const c100 = lattice(ix + 1, iy, iz);
  const c010 = lattice(ix, iy + 1, iz);
  const c110 = lattice(ix + 1, iy + 1, iz);
  const c001 = lattice(ix, iy, iz + 1);
  const c101 = lattice(ix + 1, iy, iz + 1);
  const c011 = lattice(ix, iy + 1, iz + 1);
  const c111 = lattice(ix + 1, iy + 1, iz + 1);
  const x00 = c000 + (c100 - c000) * ux;
  const x10 = c010 + (c110 - c010) * ux;
  const x01 = c001 + (c101 - c001) * ux;
  const x11 = c011 + (c111 - c011) * ux;
  return x00 + (x10 - x00) * uy + (x01 + (x11 - x01) * uy - (x00 + (x10 - x00) * uy)) * uz;
}
function cellularNoise(x, y, z, seed, periodXZ = CLOUD_DETAIL_CELLS, periodY = 0) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fy = y - iy;
  const fz = z - iz;
  let nearest = Number.POSITIVE_INFINITY;
  for (let dz = -1; dz <= 1; dz += 1) {
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        const random = hash3(
          wrapInteger(ix + dx, periodXZ),
          periodY > 0 ? wrapInteger(iy + dy, periodY) : iy + dy,
          wrapInteger(iz + dz, periodXZ),
          seed ^ 2654435769
        );
        const px = dx + fract(random * 17) - fx;
        const py = dy + fract(random * 31) - fy;
        const pz = dz + fract(random * 47) - fz;
        nearest = Math.min(nearest, px * px + py * py + pz * pz);
      }
    }
  }
  return 1 - saturate(Math.sqrt(nearest) * 1.25);
}
function heightEnvelope(height, body, weather) {
  const lowerEdge = 0.05 + (1 - body) * 0.1;
  const crownEdge = Math.min(0.96, 0.6 + body * 0.3 + weather * 0.08);
  return smoothstep(lowerEdge, Math.min(1, lowerEdge + 0.12), height) * (1 - smoothstep(crownEdge, Math.min(1, crownEdge + 0.14), height));
}
function composeCloudDensity(height, formation, coverage) {
  const threshold = 1 - coverage * (0.45 + formation.weather * 0.55);
  const covered = smoothstep(0, 0.4, (formation.body - threshold) / Math.max(1e-3, 1 - threshold));
  const shaped = covered * heightEnvelope(height, formation.body, formation.weather);
  const erosion = (1 - formation.erosion) * 0.18;
  return saturate((shaped - erosion) / (1 - erosion));
}
function formationField(x, y, z, seed, detailRepeat = 1) {
  const macroWarpX = valueNoise(
    x * CLOUD_WEATHER_CELLS,
    y * CLOUD_VERTICAL_NOISE_CELLS + 3,
    z * CLOUD_WEATHER_CELLS,
    seed + 41023,
    CLOUD_WEATHER_CELLS,
    2,
    CLOUD_WEATHER_CELLS
  ) - 0.5;
  const macroWarpZ = valueNoise(
    x * CLOUD_WEATHER_CELLS + 5,
    y * CLOUD_VERTICAL_NOISE_CELLS - 7,
    z * CLOUD_WEATHER_CELLS,
    seed + 41023,
    CLOUD_WEATHER_CELLS,
    2,
    CLOUD_WEATHER_CELLS
  ) - 0.5;
  const bodyX = x + macroWarpX * 0.3;
  const bodyZ = z + macroWarpZ * 0.3;
  let amplitude = 0.5;
  let frequency = 1;
  let sum = 0;
  let weight = 0;
  for (let octave = 0; octave < 4; octave += 1) {
    const tilePeriod = CLOUD_SHAPE_CELLS * frequency;
    sum += valueNoise(
      bodyX * tilePeriod,
      y * frequency * CLOUD_VERTICAL_NOISE_CELLS,
      bodyZ * tilePeriod,
      seed + octave * 1013,
      tilePeriod,
      frequency * CLOUD_VERTICAL_NOISE_CELLS,
      tilePeriod
    ) * amplitude;
    weight += amplitude;
    amplitude *= 0.4;
    frequency *= 2;
  }
  const broad = sum / weight;
  const cells = cellularNoise(
    bodyX * CLOUD_SHAPE_CELLS,
    y * CLOUD_VERTICAL_NOISE_CELLS,
    bodyZ * CLOUD_SHAPE_CELLS,
    seed + 5011,
    CLOUD_SHAPE_CELLS,
    CLOUD_VERTICAL_NOISE_CELLS
  );
  const body = saturate(broad * 0.85 + cells * 0.15 + 0.15);
  const weather = smoothstep(
    0.34,
    0.66,
    valueNoise(
      x * CLOUD_WEATHER_CELLS,
      0.37,
      z * CLOUD_WEATHER_CELLS,
      seed + 17041,
      CLOUD_WEATHER_CELLS,
      1,
      CLOUD_WEATHER_CELLS
    )
  );
  const detailX = x * detailRepeat;
  const detailY = y * detailRepeat;
  const detailZ = z * detailRepeat;
  const warpX = valueNoise(
    detailX * CLOUD_WEATHER_CELLS,
    detailY * 2 + 11,
    detailZ * CLOUD_WEATHER_CELLS,
    seed + 29011,
    CLOUD_WEATHER_CELLS,
    2,
    CLOUD_WEATHER_CELLS
  ) - 0.5;
  const warpZ = valueNoise(
    detailX * CLOUD_WEATHER_CELLS + 7,
    detailY * 2 - 5,
    detailZ * CLOUD_WEATHER_CELLS,
    seed + 29011,
    CLOUD_WEATHER_CELLS,
    2,
    CLOUD_WEATHER_CELLS
  ) - 0.5;
  const erosion = cellularNoise(
    (detailX + warpX * 0.22) * CLOUD_DETAIL_CELLS,
    detailY * CLOUD_DETAIL_VERTICAL_CELLS,
    (detailZ + warpZ * 0.22) * CLOUD_DETAIL_CELLS,
    seed + 7919,
    CLOUD_DETAIL_CELLS,
    CLOUD_DETAIL_VERTICAL_CELLS
  );
  const noise = body;
  return { weather, body, erosion, noise };
}
function evaluateCloudFormation(params, position, timeSeconds = 0) {
  const windX = (params.wind[0] ?? 0) * timeSeconds;
  const windY = (params.wind[1] ?? 0) * timeSeconds;
  const windZ = (params.wind[2] ?? 0) * timeSeconds;
  const relativeHeight = ((position[1] ?? 0) - params.baseHeight) / Math.max(1e-6, params.thickness);
  const advectedHeight = relativeHeight + windY * params.scale / Math.max(1e-6, CLOUD_VERTICAL_CELLS);
  return formationField(
    ((position[0] ?? 0) + windX) * params.scale,
    fract(advectedHeight) * CLOUD_VERTICAL_CELLS,
    ((position[2] ?? 0) + windZ) * params.scale,
    params.seed
  );
}
function evaluateCloudDensity(params, position, timeSeconds = 0) {
  const relativeHeight = ((position[1] ?? 0) - params.baseHeight) / Math.max(1e-6, params.thickness);
  if (relativeHeight <= 0 || relativeHeight >= 1 || params.density <= 0 || params.coverage <= 0) {
    return { density: 0, heightFraction: saturate(relativeHeight), noise: 0 };
  }
  const windX = (params.wind[0] ?? 0) * timeSeconds;
  const windY = (params.wind[1] ?? 0) * timeSeconds;
  const windZ = (params.wind[2] ?? 0) * timeSeconds;
  const x = ((position[0] ?? 0) + windX) * params.scale;
  const advectedHeight = relativeHeight + windY * params.scale / Math.max(1e-6, CLOUD_VERTICAL_CELLS);
  const y = fract(advectedHeight) * CLOUD_VERTICAL_CELLS;
  const z = ((position[2] ?? 0) + windZ) * params.scale;
  const formation = formationField(x, y, z, params.seed, 3);
  const noise = formation.noise;
  return {
    density: composeCloudDensity(relativeHeight, formation, params.coverage) * params.density,
    heightFraction: relativeHeight,
    noise,
    weather: formation.weather,
    body: formation.body,
    erosion: formation.erosion
  };
}
function cacheIndex(resolution, x, y, z) {
  return z * resolution * resolution + y * resolution + x;
}
function digestBytes(data) {
  const hash = fnv1a32(data);
  return (hash >>> 0).toString(16).padStart(8, "0");
}
function buildCloudDensityCache(params, profile = CLOUD_QUALITY_PROFILES[params.quality]) {
  const resolution = Math.max(4, Math.floor(profile.cacheResolution));
  const data = new Uint8Array(resolution * resolution * resolution);
  const formationData = new Uint8Array(data.byteLength * 3);
  const position = [0, 0, 0];
  for (let z = 0; z < resolution; z += 1) {
    for (let y = 0; y < resolution; y += 1) {
      position[1] = params.baseHeight + (y + 0.5) / resolution * params.thickness;
      for (let x = 0; x < resolution; x += 1) {
        position[0] = (x + 0.5) / resolution / params.scale;
        position[2] = (z + 0.5) / resolution / params.scale;
        const index = cacheIndex(resolution, x, y, z);
        const formation = evaluateCloudFormation(params, position, 0);
        formationData[index] = Math.round(saturate(formation.weather) * 255);
        formationData[data.byteLength + index] = Math.round(saturate(formation.body) * 255);
        formationData[data.byteLength * 2 + index] = Math.round(saturate(formation.erosion) * 255);
      }
    }
  }
  const cache = {
    sourceKey: cloudLayerFormationKey(params),
    resolution,
    data,
    formationData,
    formationByteLength: formationData.byteLength,
    byteLength: formationData.byteLength,
    digest: digestBytes(formationData)
  };
  for (let z = 0; z < resolution; z++) {
    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        position[0] = (x + 0.5) / resolution / params.scale;
        position[1] = params.baseHeight + (y + 0.5) / resolution * params.thickness;
        position[2] = (z + 0.5) / resolution / params.scale;
        data[cacheIndex(resolution, x, y, z)] = Math.round(
          saturate(sampleCloudDensity(cache, params, position)) * 255
        );
      }
    }
  }
  return Object.freeze(cache);
}
function snapshotCloudDensityCache(cache) {
  return Object.freeze({
    sourceKey: cache.sourceKey,
    resolution: cache.resolution,
    data: new Uint8Array(cache.data),
    formationData: new Uint8Array(cache.formationData),
    digest: cache.digest
  });
}
function reconstructCloudDensityCache(params, snapshot) {
  const expectedKey = cloudLayerFormationKey(params);
  if (snapshot.sourceKey !== expectedKey) {
    return err(new CloudLayerCacheInvalidError(snapshot.sourceKey, "source key mismatch"));
  }
  if (!Number.isInteger(snapshot.resolution) || snapshot.resolution < 4 || snapshot.resolution > 256 || snapshot.data.byteLength !== snapshot.resolution ** 3 || snapshot.formationData !== void 0 && snapshot.formationData.byteLength !== snapshot.resolution ** 3 * 3) {
    return err(
      new CloudLayerCacheInvalidError(snapshot.sourceKey, "resolution and payload length mismatch")
    );
  }
  const formationData = snapshot.formationData === void 0 ? new Uint8Array(snapshot.data.length * 3).fill(0) : new Uint8Array(snapshot.formationData);
  const digest = digestBytes(formationData);
  if (digest !== snapshot.digest) {
    return err(new CloudLayerCacheInvalidError(snapshot.sourceKey, "payload digest mismatch"));
  }
  const data = new Uint8Array(snapshot.data);
  return ok(
    Object.freeze({
      sourceKey: snapshot.sourceKey,
      resolution: snapshot.resolution,
      data,
      formationData,
      formationByteLength: formationData.byteLength,
      byteLength: formationData.byteLength,
      digest
    })
  );
}
function wrapped(value, resolution) {
  const result = value - Math.floor(value);
  return Math.min(resolution - 1e-6, Math.max(0, result * resolution));
}
function sampleCloudDensity(cache, params, position, timeSeconds = 0) {
  const height = ((position[1] ?? 0) - params.baseHeight) / Math.max(1e-6, params.thickness);
  if (height <= 0 || height >= 1 || params.coverage <= 0 || params.density <= 0) return 0;
  const period = 1 / Math.max(1e-6, params.scale);
  const x = wrapped(
    ((position[0] ?? 0) + (params.wind[0] ?? 0) * timeSeconds) / period - 0.5 / cache.resolution,
    cache.resolution
  );
  const z = wrapped(
    ((position[2] ?? 0) + (params.wind[2] ?? 0) * timeSeconds) / period - 0.5 / cache.resolution,
    cache.resolution
  );
  const advectedHeight = height + (params.wind[1] ?? 0) * timeSeconds * params.scale / Math.max(1e-6, CLOUD_VERTICAL_CELLS);
  const y = wrapped(advectedHeight - 0.5 / cache.resolution, cache.resolution);
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const z0 = Math.floor(z);
  const x1 = (x0 + 1) % cache.resolution;
  const y1 = (y0 + 1) % cache.resolution;
  const z1 = (z0 + 1) % cache.resolution;
  const fx = x - x0;
  const fy = y - y0;
  const fz = z - z0;
  const stride = cache.resolution ** 3;
  if (cache.formationData === void 0 || cache.formationData.byteLength < stride * 3) {
    const sampleLegacy = (sx, sy, sz) => (cache.data[cacheIndex(cache.resolution, sx, sy, sz)] ?? 0) / 255;
    const c00 = sampleLegacy(x0, y0, z0) + (sampleLegacy(x1, y0, z0) - sampleLegacy(x0, y0, z0)) * fx;
    const c10 = sampleLegacy(x0, y1, z0) + (sampleLegacy(x1, y1, z0) - sampleLegacy(x0, y1, z0)) * fx;
    const c01 = sampleLegacy(x0, y0, z1) + (sampleLegacy(x1, y0, z1) - sampleLegacy(x0, y0, z1)) * fx;
    const c11 = sampleLegacy(x0, y1, z1) + (sampleLegacy(x1, y1, z1) - sampleLegacy(x0, y1, z1)) * fx;
    return (c00 + (c10 - c00) * fy + (c01 + (c11 - c01) * fy - (c00 + (c10 - c00) * fy)) * fz) * heightEnvelope(height, 1, 0.5) * params.density;
  }
  const samplePlane = (plane, sx, sy, sz) => {
    const payload = cache.formationData;
    const offset = plane * stride + cacheIndex(cache.resolution, sx, sy, sz);
    return (payload[offset] ?? 0) / 255;
  };
  const sample = (plane) => {
    const repeat = plane === 2 ? 3 : 1;
    const sx = wrapped(
      (x + 0.5) / cache.resolution * repeat - 0.5 / cache.resolution,
      cache.resolution
    );
    const sy = wrapped(
      (y + 0.5) / cache.resolution * repeat - 0.5 / cache.resolution,
      cache.resolution
    );
    const sz = wrapped(
      (z + 0.5) / cache.resolution * repeat - 0.5 / cache.resolution,
      cache.resolution
    );
    const x02 = Math.floor(sx), y02 = Math.floor(sy), z02 = Math.floor(sz);
    const x12 = (x02 + 1) % cache.resolution, y12 = (y02 + 1) % cache.resolution, z12 = (z02 + 1) % cache.resolution;
    const fx2 = sx - x02, fy2 = sy - y02, fz2 = sz - z02;
    const c00 = samplePlane(plane, x02, y02, z02) + (samplePlane(plane, x12, y02, z02) - samplePlane(plane, x02, y02, z02)) * fx2;
    const c10 = samplePlane(plane, x02, y12, z02) + (samplePlane(plane, x12, y12, z02) - samplePlane(plane, x02, y12, z02)) * fx2;
    const c01 = samplePlane(plane, x02, y02, z12) + (samplePlane(plane, x12, y02, z12) - samplePlane(plane, x02, y02, z12)) * fx2;
    const c11 = samplePlane(plane, x02, y12, z12) + (samplePlane(plane, x12, y12, z12) - samplePlane(plane, x02, y12, z12)) * fx2;
    return c00 + (c10 - c00) * fy2 + (c01 + (c11 - c01) * fy2 - (c00 + (c10 - c00) * fy2)) * fz2;
  };
  const weather = sample(0);
  const body = sample(1);
  const erosion = sample(2);
  return composeCloudDensity(height, { weather, body, erosion, noise: body }, params.coverage) * params.density;
}

// sdk/engine/node_modules/@forgeax/engine-render/src/cloud/inspection.ts
function resourceStage(input) {
  if (!input.authored || input.generation === void 0) return "none";
  if (input.candidateGeneration !== void 0) return "candidate";
  if (input.degraded === true || input.lkgGeneration !== void 0) return "lkg";
  return "accepted";
}
function inspectCloudLayer(input) {
  const capability = {
    compute: input.capability?.compute ?? false,
    storageBuffer: input.capability?.storageBuffer ?? false,
    rgba16floatRenderable: input.capability?.rgba16floatRenderable ?? false,
    physicalGpu: input.capability?.physicalGpu ?? "unknown",
    timestampQuery: input.capability?.timestampQuery ?? false
  };
  const budget = {
    measured: input.budget?.measured ?? false,
    physicalGpu: input.budget?.physicalGpu ?? capability.physicalGpu,
    gpuTimestamp: input.budget?.gpuTimestamp ?? capability.timestampQuery,
    quality: input.budget?.quality,
    warmupFrames: input.budget?.warmupFrames ?? 0,
    sampleFrames: input.budget?.sampleFrames ?? 0,
    p50GpuMs: input.budget?.p50GpuMs,
    p95GpuMs: input.budget?.p95GpuMs,
    coldGenerationMs: input.budget?.coldGenerationMs,
    frameBudgetMs: input.budget?.frameBudgetMs,
    ...input.budget?.reason === void 0 ? {} : { reason: input.budget.reason }
  };
  const available = capability.compute && capability.storageBuffer && capability.rgba16floatRenderable;
  return Object.freeze({
    status: !input.authored ? "off" : !available ? "unavailable" : input.degraded === true ? "degraded" : "available",
    resourceStage: resourceStage(input),
    sourceKey: input.sourceKey,
    generation: input.generation,
    candidateGeneration: input.candidateGeneration,
    lkgGeneration: input.lkgGeneration,
    shadowRevision: input.shadowRevision,
    temporalResets: input.temporalResets ?? 0,
    lastTemporalReset: input.lastTemporalReset,
    resourceFacts: input.resourceFacts,
    capability,
    budget
  });
}
function cloudCapabilitiesFromRhi(caps) {
  return Object.freeze({
    compute: caps.compute === true,
    storageBuffer: caps.storageBuffer === true,
    rgba16floatRenderable: caps.rgba16floatRenderable === true,
    // RHI caps intentionally do not claim a physical adapter. A browser or
    // Dawn receipt must promote this fact to available/unavailable.
    physicalGpu: "unknown",
    timestampQuery: caps.timestampQuery === true
  });
}

// sdk/engine/node_modules/@forgeax/engine-render/src/cloud/resources.ts
var CLOUD_RGBA16FLOAT_BYTES_PER_TEXEL = 8;
var CLOUD_HISTORY_SURFACE_COUNT = 6;
function inspectCloudLayerResources(input) {
  const cacheBytes = input.cache?.byteLength ?? 0;
  const shadowResolution = input.shadow?.resolution ?? 0;
  const declaredShadowBytes = shadowResolution * shadowResolution * CLOUD_RGBA16FLOAT_BYTES_PER_TEXEL;
  const historyExtent = input.history === void 0 ? { width: 0, height: 0 } : cloudHistoryExtent(input.history.width, input.history.height);
  const declaredHistoryBytes = historyExtent.width * historyExtent.height * CLOUD_HISTORY_SURFACE_COUNT * CLOUD_RGBA16FLOAT_BYTES_PER_TEXEL;
  const shadowBytes = input.shadowBytes ?? 0;
  const historyBytes = input.historyBytes ?? 0;
  const inFlightBytes = Math.max(0, input.inFlightBytes ?? 0);
  const residentBytes = cacheBytes + shadowBytes + historyBytes;
  const measuredGpuResourceCount = Number(input.shadowBytes !== void 0) + Number(input.historyBytes !== void 0);
  const gpuEvidence = measuredGpuResourceCount > 0 || input.inFlightBytes !== void 0 ? "measured" : input.shadow !== void 0 || input.history !== void 0 ? "declared" : "unavailable";
  const resourceCount = Number(input.cache !== void 0) + Number(input.shadow !== void 0) + Number(input.history !== void 0);
  return Object.freeze({
    generation: input.generation,
    cacheBytes,
    shadowBytes,
    historyBytes,
    inFlightBytes,
    residentBytes,
    resourceCount,
    gpuEvidence,
    declaredShadowBytes,
    declaredHistoryBytes,
    declaredResidentBytes: cacheBytes + declaredShadowBytes + declaredHistoryBytes,
    declaredResourceCount: resourceCount,
    measuredGpuResourceCount,
    cacheResolution: input.cache?.resolution ?? 0,
    shadowResolution
  });
}
function acceptCloudLayerGeneration(candidate, previous) {
  return Object.freeze({
    active: Object.freeze({ ...candidate, status: "active" }),
    lkg: previous === void 0 ? void 0 : Object.freeze({ ...previous, status: "lkg" })
  });
}
function retainCloudLayerAfterFailure(active, candidate) {
  return Object.freeze({
    active,
    retiring: Object.freeze({ ...candidate, status: "retiring" })
  });
}

// sdk/engine/node_modules/@forgeax/engine-render/src/cloud/optics.ts
var EMPTY_SCATTERING = [0, 0, 0];
function normalize(vector) {
  const x = vector[0] ?? 0;
  const y = vector[1] ?? 0;
  const z = vector[2] ?? 0;
  const length = Math.hypot(x, y, z);
  return length <= 1e-8 ? [0, 1, 0] : [x / length, y / length, z / length];
}
function rayBoxInterval(ray, params) {
  const min = [Number.NEGATIVE_INFINITY, params.baseHeight, Number.NEGATIVE_INFINITY];
  const max = [
    Number.POSITIVE_INFINITY,
    params.baseHeight + params.thickness,
    Number.POSITIVE_INFINITY
  ];
  let start = 0;
  let end = Math.max(0, ray.maxDistance);
  for (let axis = 0; axis < 3; axis += 1) {
    const origin = ray.origin[axis] ?? 0;
    const direction = ray.direction[axis] ?? 0;
    const lower = min[axis] ?? 0;
    const upper = max[axis] ?? 0;
    if (Math.abs(direction) < 1e-8) {
      if (origin < lower || origin > upper) return void 0;
      continue;
    }
    const a = (lower - origin) / direction;
    const b = (upper - origin) / direction;
    start = Math.max(start, Math.min(a, b));
    end = Math.min(end, Math.max(a, b));
    if (end <= start) return void 0;
  }
  return end > start ? { start, end } : void 0;
}
function intersectCloudLayer(ray, params) {
  return rayBoxInterval(ray, params);
}
function phaseFunction(cosTheta, g) {
  const boundedG = Math.max(-0.95, Math.min(0.95, g));
  const denominator = Math.max(1e-4, 1 + boundedG * boundedG - 2 * boundedG * cosTheta);
  return (1 - boundedG * boundedG) / denominator ** 1.5 * (1 / (4 * Math.PI));
}
function cloudPhase(cosTheta, forwardG) {
  return phaseFunction(cosTheta, forwardG) * 0.8 + phaseFunction(cosTheta, -0.2) * 0.2;
}
function smoothstep2(edge0, edge1, value) {
  const t = Math.max(0, Math.min(1, (value - edge0) / Math.max(1e-6, edge1 - edge0)));
  return t * t * (3 - 2 * t);
}
function cloudIncidentLight(solarT, cosTheta, height, forwardG = 0.55) {
  const direct = solarT * cloudPhase(cosTheta, forwardG);
  const multiple = (0.5 * Math.sqrt(solarT) + 0.25 * solarT ** 0.25) / (4 * Math.PI);
  const energy = (direct + multiple) * (4 * Math.PI);
  const skyFill = 0.025 + 0.05 * smoothstep2(0.1, 0.85, height);
  return [energy + 0.72 * skyFill, energy + 0.84 * skyFill, energy + skyFill];
}
function densityAt(input, position) {
  return input.cache === void 0 ? evaluateCloudDensity(input.params, position, input.timeSeconds ?? 0).density : sampleCloudDensity(input.cache, input.params, position, input.timeSeconds ?? 0);
}
function integrateCloudPath(input) {
  const direction = normalize(input.ray.direction);
  const interval = rayBoxInterval({ ...input.ray, direction }, input.params);
  if (interval === void 0 || input.params.density <= 0) {
    return {
      path: input.path,
      transmittance: 1,
      scattering: EMPTY_SCATTERING,
      opticalDepth: 0,
      representativeDepth: input.ray.maxDistance,
      steps: 0,
      entered: false,
      exited: false
    };
  }
  const steps = Math.max(1, Math.floor(input.steps ?? 32));
  const length = interval.end - interval.start;
  const stepLength = length / steps;
  let opticalDepth = 0;
  const scattering = [0, 0, 0];
  let weightedDepth = 0;
  let scatteringWeight = 0;
  const lighting = input.lighting;
  const lightDirection = lighting === void 0 ? void 0 : normalize(lighting.sunDirection);
  const viewDirection = normalize(input.ray.direction);
  for (let index = 0; index < steps; index += 1) {
    const distance = interval.start + (index + 0.5) * stepLength;
    const position = [
      (input.ray.origin[0] ?? 0) + direction[0] * distance,
      (input.ray.origin[1] ?? 0) + direction[1] * distance,
      (input.ray.origin[2] ?? 0) + direction[2] * distance
    ];
    const localDensity = Math.max(0, densityAt(input, position));
    const extinction = localDensity * CLOUD_EXTINCTION_COEFFICIENT * stepLength;
    const transmittanceBefore = Math.exp(-opticalDepth);
    opticalDepth += extinction;
    if (lighting !== void 0 && lightDirection !== void 0 && localDensity > 0) {
      const localShadow = integrateCloudPath({
        params: input.params,
        path: "solar-column",
        ray: {
          origin: position,
          direction: lightDirection,
          maxDistance: input.params.shadowRange
        },
        steps: Math.max(4, Math.ceil((input.steps ?? 32) * 0.5)),
        ...input.timeSeconds === void 0 ? {} : { timeSeconds: input.timeSeconds },
        ...input.cache === void 0 ? {} : { cache: input.cache }
      });
      const cosTheta = viewDirection[0] * lightDirection[0] + viewDirection[1] * lightDirection[1] + viewDirection[2] * lightDirection[2];
      const segmentWeight = transmittanceBefore * (1 - Math.exp(-extinction));
      const heightFraction = Math.max(
        0,
        Math.min(1, ((position[1] ?? 0) - input.params.baseHeight) / input.params.thickness)
      );
      const incident = cloudIncidentLight(
        localShadow.transmittance,
        cosTheta,
        heightFraction,
        lighting.phaseG
      );
      for (let channel = 0; channel < 3; channel++) {
        scattering[channel] = (scattering[channel] ?? 0) + (lighting.sunRadiance[channel] ?? 0) * (incident[channel] ?? 0) * segmentWeight;
      }
      const weight = segmentWeight;
      scatteringWeight += weight;
      weightedDepth += distance * weight;
    }
  }
  const transmittance = Math.exp(-opticalDepth);
  return {
    path: input.path,
    transmittance,
    scattering,
    opticalDepth,
    representativeDepth: scatteringWeight > 1e-6 ? weightedDepth / scatteringWeight : interval.start,
    steps,
    entered: true,
    exited: interval.end < input.ray.maxDistance
  };
}
function integrateCloudCameraPath(params, ray, options = {}) {
  return integrateCloudPath({ ...options, params, ray, path: "camera" });
}
function integrateCloudSolarColumn(params, origin, sunDirection, options = {}) {
  return integrateCloudPath({
    ...options,
    params,
    path: "solar-column",
    ray: {
      origin,
      direction: sunDirection,
      maxDistance: options.maxDistance ?? params.shadowRange
    }
  });
}
function integrateCloudInterior(params, ray, lighting, options = {}) {
  return integrateCloudPath({ ...options, params, ray, path: "cloud-interior", lighting });
}
function applyCloudSolarTransmittance(directSunRadiance, cloudTransmittance, meshVisibility = 1) {
  const factor = Math.min(1, Math.max(0, cloudTransmittance)) * Math.min(1, Math.max(0, meshVisibility));
  return [
    (directSunRadiance[0] ?? 0) * factor,
    (directSunRadiance[1] ?? 0) * factor,
    (directSunRadiance[2] ?? 0) * factor
  ];
}
function compositeCloudRadiance(sceneLinearHdr, cloud, sceneDepth, cloudDepth = cloud.representativeDepth) {
  if (!Number.isFinite(sceneDepth) || cloudDepth > sceneDepth) return sceneLinearHdr;
  const transmittance = Math.min(1, Math.max(0, cloud.transmittance));
  return [
    (sceneLinearHdr[0] ?? 0) * transmittance + (cloud.scattering[0] ?? 0),
    (sceneLinearHdr[1] ?? 0) * transmittance + (cloud.scattering[1] ?? 0),
    (sceneLinearHdr[2] ?? 0) * transmittance + (cloud.scattering[2] ?? 0),
    1
  ];
}

// sdk/engine/node_modules/@forgeax/engine-render/src/cloud/shadow.ts
function normalize2(vector) {
  const x = vector[0] ?? 0;
  const y = vector[1] ?? 0;
  const z = vector[2] ?? 0;
  const length = Math.hypot(x, y, z);
  return length <= 1e-8 ? [0, 1, 0] : [x / length, y / length, z / length];
}
function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function dot(a, b) {
  return (a[0] ?? 0) * (b[0] ?? 0) + (a[1] ?? 0) * (b[1] ?? 0) + (a[2] ?? 0) * (b[2] ?? 0);
}
function stableRevision(input) {
  let hash = 2166136261;
  const values = [...input.center, ...input.sunDirection, input.range, input.resolution];
  for (const value of values) {
    const bits = new Float32Array([value]);
    const bytes = new Uint8Array(bits.buffer);
    for (const byte of bytes) hash = Math.imul(hash ^ byte, 16777619);
  }
  return hash >>> 0;
}
function createCloudShadowProjection(input) {
  const sunDirection = normalize2(input.sunDirection);
  const resolution = Math.max(16, Math.floor(input.resolution ?? 1024));
  const range = Math.max(1, input.range);
  const texelSize = range / resolution;
  const reference = Math.abs(sunDirection[1]) < 0.95 ? [0, 1, 0] : [1, 0, 0];
  const right = normalize2(cross(reference, sunDirection));
  const up = normalize2(cross(sunDirection, right));
  const center = input.center;
  const lightX = dot(center, right);
  const lightY = dot(center, up);
  const lightZ = dot(center, sunDirection);
  const snappedX = Math.floor(lightX / texelSize + 0.5) * texelSize;
  const snappedY = Math.floor(lightY / texelSize + 0.5) * texelSize;
  const origin = [
    right[0] * snappedX + up[0] * snappedY + sunDirection[0] * lightZ,
    right[1] * snappedX + up[1] * snappedY + sunDirection[1] * lightZ,
    right[2] * snappedX + up[2] * snappedY + sunDirection[2] * lightZ
  ];
  return Object.freeze({
    revision: stableRevision({ center, sunDirection, range, resolution }),
    resolution,
    range,
    texelSize,
    center: Object.freeze([...center]),
    origin: Object.freeze(origin),
    right,
    up,
    sunDirection,
    lowSun: sunDirection[1] <= 0.08
  });
}
function projectCloudShadowUv(projection, position) {
  const relative = [
    position[0] - projection.origin[0],
    position[1] - projection.origin[1],
    position[2] - projection.origin[2]
  ];
  const x = dot(relative, projection.right);
  const y = dot(relative, projection.up);
  const uv = [0.5 + x / projection.range, 0.5 + y / projection.range];
  return { uv, inRange: uv[0] >= 0 && uv[0] <= 1 && uv[1] >= 0 && uv[1] <= 1 };
}
function sampleCloudShadow(params, projection, worldPosition, options = {}) {
  const projected = projectCloudShadowUv(projection, worldPosition);
  if (projection.lowSun) {
    return {
      transmittance: 1,
      uv: projected.uv,
      valid: false,
      fallback: "low-sun",
      revision: projection.revision
    };
  }
  if (!projected.inRange) {
    return {
      transmittance: 1,
      uv: projected.uv,
      valid: false,
      fallback: "outside-range",
      revision: projection.revision
    };
  }
  if (params.coverage >= 1 || params.density <= 0) {
    return {
      transmittance: 1,
      uv: projected.uv,
      valid: false,
      fallback: "empty-coverage",
      revision: projection.revision
    };
  }
  const integrated = integrateCloudSolarColumn(params, worldPosition, projection.sunDirection, {
    steps: 20,
    maxDistance: projection.range,
    ...options.cache === void 0 ? {} : { cache: options.cache },
    ...options.timeSeconds === void 0 ? {} : { timeSeconds: options.timeSeconds }
  });
  return {
    transmittance: integrated.transmittance,
    uv: projected.uv,
    valid: integrated.entered,
    fallback: "none",
    revision: projection.revision
  };
}

// sdk/engine/node_modules/@forgeax/engine-render/src/cloud/feature.ts
import {
  CLOUD_DENSITY_COMPUTE_WGSL,
  CLOUD_HISTORY_FULLSCREEN_WGSL,
  CLOUD_RESOLVE_FULLSCREEN_WGSL,
  CLOUD_TRANSPORT_ANALYTIC_FULLSCREEN_WGSL,
  CLOUD_TRANSPORT_FULLSCREEN_WGSL,
  CLOUD_VIEW_FULLSCREEN_WGSL
} from "@forgeax/engine-shader";
import { ok as ok2 } from "@forgeax/engine-types";
var CLOUD_LAYER_FEATURE_IDENTITY = "forgeax.cloud-layer";
var COMPUTE_STAGE = 4;
var CLOUD_WORKGROUP_SIZE = 64;
var CLOUD_VIEW_PARAMS_BYTES = 176;
function packCloudDensityCache(cache) {
  const packed = new Uint32Array(Math.max(1, Math.ceil(cache.formationData.byteLength / 4)));
  for (let index = 0; index < cache.formationData.byteLength; index += 1) {
    const wordIndex = index >>> 2;
    packed[wordIndex] = (packed[wordIndex] ?? 0) | (cache.formationData[index] ?? 0) << (index & 3) * 8;
  }
  return packed;
}
function makeCloudViewParams(frame, cache, mode = 0) {
  const params = new ArrayBuffer(CLOUD_VIEW_PARAMS_BYTES);
  const floats = new Float32Array(params);
  const integers = new Uint32Array(params);
  const profile = CLOUD_QUALITY_PROFILES[frame.params?.quality ?? "medium"];
  const authored = frame.params;
  floats[0] = authored?.baseHeight ?? 0;
  floats[1] = authored?.thickness ?? 1;
  floats[2] = authored?.scale ?? 1;
  floats[3] = authored?.density ?? 0;
  floats[4] = authored?.coverage ?? 1;
  floats[5] = frame.timeSeconds;
  floats[6] = mode === 1 ? authored?.shadowRange ?? 0 : cloudViewDistanceForQuality(authored?.quality ?? "medium");
  floats[7] = authored?.seed ?? 0;
  floats[8] = authored?.wind[0] ?? 0;
  floats[9] = authored?.wind[1] ?? 0;
  floats[10] = authored?.wind[2] ?? 0;
  floats[12] = frame.sunDirection?.[0] ?? 0;
  floats[13] = frame.sunDirection?.[1] ?? -1;
  floats[14] = frame.sunDirection?.[2] ?? 0;
  floats[15] = 0.2;
  floats[16] = frame.sunRadiance?.[0] ?? 0;
  floats[17] = frame.sunRadiance?.[1] ?? 0;
  floats[18] = frame.sunRadiance?.[2] ?? 0;
  integers[20] = cache.resolution;
  integers[21] = Math.max(1, Math.min(64, Math.floor(profile.viewSteps)));
  integers[22] = Math.max(1, Math.min(64, Math.floor(profile.shadowSteps)));
  integers[23] = mode;
  const projection = frame.shadowProjection;
  if (projection !== void 0) {
    floats[24] = projection.origin[0];
    floats[25] = projection.origin[1];
    floats[26] = projection.origin[2];
    floats[28] = projection.right[0];
    floats[29] = projection.right[1];
    floats[30] = projection.right[2];
    floats[32] = projection.up[0];
    floats[33] = projection.up[1];
    floats[34] = projection.up[2];
    floats[36] = projection.range;
    floats[37] = projection.lowSun ? 0 : 1;
    floats[38] = projection.lowSun ? 1 : 0;
    floats[39] = projection.texelSize;
  }
  const temporal = frame.temporal;
  floats[40] = temporal !== void 0 && temporal.reset === false ? 1 : 0;
  floats[41] = temporal?.reset === true ? 1 : 0;
  floats[42] = temporal === void 0 ? 0 : profile.historyWeight;
  floats[43] = temporal?.history?.temporal.timeSeconds ?? frame.timeSeconds;
  return new Uint8Array(params);
}
function planCloudDensity(frame, packedCache, context) {
  const shaderSource = (identifier, standalone) => {
    if (context.getFeatureShaderSource === void 0) return standalone;
    const source = context.getFeatureShaderSource(identifier);
    if (source === void 0)
      throw new Error(`Missing cooked cloud program ${identifier}; rebuild the shader manifest`);
    return source;
  };
  const densityPrefix = `cloud-density-${frame.generation}`;
  const densityProgram = `${densityPrefix}.program`;
  const densityBindings = `${densityPrefix}.bindings`;
  const densityCache = `${densityPrefix}.cache`;
  const densityOutput = `${densityPrefix}.output`;
  const densityParams = `${densityPrefix}.params`;
  const cacheCount = packedCache.length;
  const params = new Uint32Array([cacheCount]);
  const inputTarget = context.targets.find((target) => target.name === "motion-input");
  const outputTarget = context.targets.find((target) => target.name === "motion-output");
  const historyRadiancePrevious = context.targets.find(
    (target) => target.name === "cloud-history-radiance-previous"
  );
  const historyTransmittancePrevious = context.targets.find(
    (target) => target.name === "cloud-history-transmittance-previous"
  );
  const historyDepthPrevious = context.targets.find(
    (target) => target.name === "cloud-history-depth-previous"
  );
  const historyRadianceCurrent = context.targets.find(
    (target) => target.name === "cloud-history-radiance-current"
  );
  const historyTransmittanceCurrent = context.targets.find(
    (target) => target.name === "cloud-history-transmittance-current"
  );
  const historyDepthCurrent = context.targets.find(
    (target) => target.name === "cloud-history-depth-current"
  );
  const hasHistoryTargets = historyRadiancePrevious !== void 0 && historyTransmittancePrevious !== void 0 && historyDepthPrevious !== void 0 && historyRadianceCurrent !== void 0 && historyTransmittanceCurrent !== void 0 && historyDepthCurrent !== void 0;
  const shadowTarget = context.targets.find((target) => target.name === "cloud-shadow");
  const canShadow = shadowTarget !== void 0 && shadowTarget.sampleCount === 1 && frame.shadowProjection !== void 0 && hasHistoryTargets;
  const canCompose = inputTarget !== void 0 && outputTarget !== void 0 && inputTarget.sampleCount === 1 && outputTarget.sampleCount === 1 && hasHistoryTargets;
  const transportReads = ["motion-input", { key: "depth", sampleType: "depth" }];
  const transportCacheReads = [
    "motion-input",
    "cloud-shadow",
    { key: "depth", sampleType: "depth" }
  ];
  const historyReads = [
    "motion-input",
    "cloud-history-radiance-previous",
    "cloud-history-transmittance-previous",
    "cloud-history-depth-previous",
    { key: "depth", sampleType: "depth" }
  ];
  const historyAdditionalTextures = [
    "cloud-history-radiance-previous",
    "cloud-history-transmittance-previous",
    "cloud-history-depth-previous"
  ];
  const viewParams = makeCloudViewParams(frame, frame.cache);
  const shadowParams = canShadow ? makeCloudViewParams(frame, frame.cache, 1) : void 0;
  const transportUsesShadowCache = canCompose && canShadow;
  return {
    resources: [
      {
        kind: "compute-program",
        name: densityProgram,
        program: {
          wgsl: CLOUD_DENSITY_COMPUTE_WGSL,
          entryPoints: ["cloud_density_cache"],
          bindings: [
            {
              label: "forgeax.cloud-layer.cache",
              entries: [
                { binding: 0, visibility: COMPUTE_STAGE, buffer: { type: "read-only-storage" } },
                { binding: 1, visibility: COMPUTE_STAGE, buffer: { type: "storage" } },
                { binding: 2, visibility: COMPUTE_STAGE, buffer: { type: "uniform" } }
              ]
            }
          ]
        }
      },
      {
        kind: "buffer",
        name: densityCache,
        size: packedCache.byteLength,
        usage: ["storage", "copy-src"],
        data: packedCache
      },
      {
        kind: "buffer",
        name: densityOutput,
        size: packedCache.byteLength,
        usage: ["storage", "copy-src"]
      },
      {
        kind: "buffer",
        name: densityParams,
        size: params.byteLength,
        usage: ["uniform"],
        data: params
      },
      {
        kind: "compute-bindings",
        name: densityBindings,
        program: densityProgram,
        entries: [
          { binding: 0, resource: densityCache },
          { binding: 1, resource: densityOutput },
          { binding: 2, resource: densityParams }
        ]
      },
      {
        kind: "fullscreen-program",
        name: "cloud-layer-view",
        source: CLOUD_VIEW_FULLSCREEN_WGSL,
        usesView: true,
        storageBindings: [8],
        reads: historyReads,
        params: {
          byteSize: viewParams.byteLength,
          defaultValue: viewParams
        }
      },
      ...shadowParams === void 0 ? [] : [
        {
          kind: "fullscreen-program",
          name: "cloud-layer-shadow",
          source: CLOUD_VIEW_FULLSCREEN_WGSL,
          usesView: true,
          storageBindings: [8],
          reads: historyReads,
          params: {
            byteSize: shadowParams.byteLength,
            defaultValue: shadowParams
          }
        }
      ],
      ...canCompose ? [
        {
          kind: "fullscreen-program",
          name: "cloud-layer-transport",
          source: shaderSource(
            transportUsesShadowCache ? "forgeax::cloud-atmosphere-transport" : "forgeax::cloud-atmosphere-transport-analytic",
            transportUsesShadowCache ? CLOUD_TRANSPORT_FULLSCREEN_WGSL : CLOUD_TRANSPORT_ANALYTIC_FULLSCREEN_WGSL
          ),
          fragmentEntryPoint: "fs_transport",
          usesView: true,
          storageBindings: [8],
          reads: transportUsesShadowCache ? transportCacheReads : transportReads,
          params: {
            byteSize: viewParams.byteLength,
            defaultValue: viewParams
          }
        },
        {
          kind: "fullscreen-program",
          name: "cloud-layer-resolve",
          source: shaderSource(
            "forgeax::cloud-atmosphere-resolve",
            CLOUD_RESOLVE_FULLSCREEN_WGSL
          ),
          usesView: true,
          reads: [
            "motion-input",
            "cloud-history-radiance-current",
            "cloud-history-transmittance-current",
            "cloud-history-depth-current",
            "cloud-history-radiance-previous",
            "cloud-history-transmittance-previous",
            "cloud-history-depth-previous",
            { key: "depth", sampleType: "depth" }
          ],
          params: {
            byteSize: viewParams.byteLength,
            defaultValue: viewParams
          }
        }
      ] : [],
      ...canCompose ? [
        {
          kind: "graphics-program",
          name: "cloud-layer-transport-pipeline",
          program: {
            shader: "cloud-layer-transport",
            vertexLayout: "none",
            colorFormats: [
              historyRadianceCurrent.format,
              historyTransmittanceCurrent.format,
              historyDepthCurrent.format
            ],
            sampleCount: 1,
            renderState: {
              depthWriteEnabled: false,
              depthCompare: "always"
            }
          }
        },
        {
          kind: "graphics-bindings",
          name: "cloud-layer-transport-view-bindings",
          program: "cloud-layer-transport-pipeline",
          values: { group: 0, view: true }
        },
        {
          kind: "graphics-bindings",
          name: "cloud-layer-transport-bindings",
          program: "cloud-layer-transport-pipeline",
          values: {
            group: 1,
            fullscreen: true,
            shader: "cloud-layer-transport",
            input: "motion-input",
            depth: "depth",
            additionalTextures: transportUsesShadowCache ? ["cloud-shadow"] : [],
            storageBuffers: [densityOutput]
          },
          logicalTargets: { input: "motion-input" }
        },
        {
          kind: "graphics-program",
          name: "cloud-layer-resolve-pipeline",
          program: {
            shader: "cloud-layer-resolve",
            vertexLayout: "none",
            colorFormats: [outputTarget.format],
            sampleCount: 1,
            renderState: {
              depthWriteEnabled: false,
              depthCompare: "always"
            }
          }
        },
        {
          kind: "graphics-bindings",
          name: "cloud-layer-resolve-view-bindings",
          program: "cloud-layer-resolve-pipeline",
          values: { group: 0, view: true }
        },
        {
          kind: "graphics-bindings",
          name: "cloud-layer-resolve-bindings",
          program: "cloud-layer-resolve-pipeline",
          values: {
            group: 1,
            fullscreen: true,
            shader: "cloud-layer-resolve",
            input: "motion-input",
            depth: "depth",
            additionalTextures: [
              "cloud-history-radiance-current",
              "cloud-history-transmittance-current",
              "cloud-history-depth-current",
              "cloud-history-radiance-previous",
              "cloud-history-transmittance-previous",
              "cloud-history-depth-previous"
            ]
          }
        }
      ] : [],
      ...canShadow ? [
        {
          kind: "graphics-program",
          name: "cloud-layer-shadow-pipeline",
          program: {
            shader: "cloud-layer-shadow",
            vertexLayout: "none",
            colorFormats: [shadowTarget.format],
            sampleCount: 1,
            renderState: {
              depthWriteEnabled: false,
              depthCompare: "always",
              blend: {
                color: {
                  srcFactor: "one",
                  dstFactor: "zero",
                  operation: "add"
                },
                alpha: {
                  srcFactor: "one",
                  dstFactor: "zero",
                  operation: "add"
                }
              }
            }
          }
        },
        {
          kind: "graphics-bindings",
          name: "cloud-layer-shadow-view-bindings",
          program: "cloud-layer-shadow-pipeline",
          values: { group: 0, view: true }
        },
        {
          kind: "graphics-bindings",
          name: "cloud-layer-shadow-bindings",
          program: "cloud-layer-shadow-pipeline",
          values: {
            group: 1,
            fullscreen: true,
            shader: "cloud-layer-shadow",
            input: false,
            depth: "depth",
            // The shadow branch's WGSL keeps the shared depth binding
            // shape, but its light-space path never samples scene depth.
            // Bind the renderer-owned far-depth fallback instead of
            // introducing a read-before-main graph dependency.
            depthFallback: true,
            additionalTextures: historyAdditionalTextures,
            storageBuffers: [densityOutput]
          }
        }
      ] : []
    ],
    passes: context.caps.compute && context.caps.storageBuffer ? [
      {
        kind: "compute",
        name: `${densityPrefix}.compute`,
        program: densityProgram,
        bindings: densityBindings,
        dispatches: [
          {
            kind: "direct",
            entryPoint: "cloud_density_cache",
            workgroups: [Math.max(1, Math.ceil(cacheCount / CLOUD_WORKGROUP_SIZE))]
          }
        ]
      },
      ...canShadow ? [
        {
          kind: "raster",
          name: "cloud-layer-shadow",
          colorAttachments: [
            {
              target: "cloud-shadow",
              loadOp: "clear",
              storeOp: "store"
            }
          ],
          sampledTargets: [
            "cloud-history-radiance-previous",
            "cloud-history-transmittance-previous",
            "cloud-history-depth-previous"
          ],
          draws: [
            {
              program: "cloud-layer-shadow-pipeline",
              bindings: [
                "cloud-layer-shadow-view-bindings",
                "cloud-layer-shadow-bindings"
              ],
              vertexData: [],
              vertexLayout: "none",
              draw: { kind: "draw", vertexCount: 3, instanceCount: 1 }
            }
          ]
        }
      ] : [],
      ...canCompose ? [
        {
          kind: "raster",
          name: "cloud-layer-transport",
          colorAttachments: [
            {
              target: "cloud-history-radiance-current",
              loadOp: "clear",
              storeOp: "store"
            },
            {
              target: "cloud-history-transmittance-current",
              loadOp: "clear",
              storeOp: "store"
            },
            {
              target: "cloud-history-depth-current",
              loadOp: "clear",
              storeOp: "store"
            }
          ],
          sampledTargets: [
            "motion-input",
            "depth",
            ...transportUsesShadowCache ? ["cloud-shadow"] : []
          ],
          draws: [
            {
              program: "cloud-layer-transport-pipeline",
              bindings: [
                "cloud-layer-transport-view-bindings",
                "cloud-layer-transport-bindings"
              ],
              vertexData: [],
              vertexLayout: "none",
              draw: { kind: "draw", vertexCount: 3, instanceCount: 1 }
            }
          ]
        },
        {
          kind: "raster",
          name: "cloud-layer-resolve",
          colorAttachments: [
            {
              target: "motion-output",
              loadOp: "clear",
              storeOp: "store"
            }
          ],
          sampledTargets: [
            "motion-input",
            "depth",
            "cloud-history-radiance-current",
            "cloud-history-transmittance-current",
            "cloud-history-depth-current",
            "cloud-history-radiance-previous",
            "cloud-history-transmittance-previous",
            "cloud-history-depth-previous"
          ],
          draws: [
            {
              program: "cloud-layer-resolve-pipeline",
              bindings: [
                "cloud-layer-resolve-view-bindings",
                "cloud-layer-resolve-bindings"
              ],
              vertexData: [],
              vertexLayout: "none",
              draw: { kind: "draw", vertexCount: 3, instanceCount: 1 }
            }
          ]
        }
      ] : []
    ] : []
  };
}
function createCloudLayerFeature(options = {}) {
  let generation = 0;
  const caches = /* @__PURE__ */ new Map();
  const histories = new CloudHistoryStore(Infinity);
  const acceptedInspections = /* @__PURE__ */ new Map();
  const extractView = (context) => {
    if (options.enabled === false) {
      return ok2({
        params: void 0,
        cache: void 0,
        sourceKey: void 0,
        timeSeconds: 0,
        sunDirection: void 0,
        sunRadiance: void 0,
        shadowProjection: void 0,
        temporal: void 0,
        generation,
        inspection: inspectCloudLayer({ authored: false })
      });
    }
    if (context.worlds.length === 0) {
      return ok2({
        params: void 0,
        cache: void 0,
        sourceKey: void 0,
        timeSeconds: 0,
        sunDirection: void 0,
        sunRadiance: void 0,
        shadowProjection: void 0,
        temporal: void 0,
        generation,
        inspection: inspectCloudLayer({ authored: false })
      });
    }
    const cloud = context.frame?.cloudLayer;
    const capability = context.caps === void 0 ? void 0 : cloudCapabilitiesFromRhi(context.caps);
    if (cloud === void 0) {
      return ok2({
        params: void 0,
        cache: void 0,
        sourceKey: void 0,
        timeSeconds: 0,
        sunDirection: void 0,
        sunRadiance: void 0,
        shadowProjection: void 0,
        temporal: void 0,
        generation,
        inspection: inspectCloudLayer({
          authored: false,
          ...capability === void 0 ? {} : { capability }
        })
      });
    }
    const formationKey = cloudLayerFormationKey(cloud.params);
    let cacheEntry = caches.get(formationKey);
    if (cacheEntry === void 0) {
      cacheEntry = { cache: buildCloudDensityCache(cloud.params), generation: ++generation };
      caches.set(formationKey, cacheEntry);
    }
    const cached = cacheEntry.cache;
    const cacheGeneration = cacheEntry.generation;
    const view = context.frame?.view;
    const shadowProjection = view === void 0 || cloud.sunDirection === void 0 ? void 0 : createCloudShadowProjection({
      center: view.shadowAnchor ?? view.cameraPosition,
      sunDirection: cloud.sunDirection,
      range: cloud.params.shadowRange,
      resolution: cloudShadowResolutionForQuality(cloud.params.quality)
    });
    const temporalSignature = view === void 0 ? void 0 : {
      sourceKey: cloud.sourceKey,
      viewId: context.identity,
      authoringGeneration: cacheGeneration,
      cloudShadowRevision: shadowProjection?.revision ?? 0,
      cameraRevision: view.cameraRevision,
      deviceGeneration: view.deviceGeneration,
      width: view.width,
      height: view.height,
      timeSeconds: cloud.worldTimeSeconds,
      quality: cloud.params.quality,
      ...view.sceneDepthVersion === void 0 ? {} : { sceneDepthVersion: view.sceneDepthVersion }
    };
    const temporal = temporalSignature === void 0 ? void 0 : {
      signature: temporalSignature,
      cameraCut: view?.cameraCut === true,
      recovery: view?.recovery === true
    };
    const resourceFacts = inspectCloudLayerResources({
      generation: cacheGeneration,
      cache: cached,
      ...shadowProjection === void 0 ? {} : { shadow: shadowProjection }
    });
    return ok2({
      params: cloud.params,
      cache: cached,
      sourceKey: cloud.sourceKey,
      timeSeconds: cloud.worldTimeSeconds,
      sunDirection: cloud.sunDirection,
      sunRadiance: cloud.sunRadiance,
      shadowProjection,
      temporal,
      generation: cacheGeneration,
      inspection: inspectCloudLayer({
        authored: true,
        sourceKey: cloud.sourceKey,
        generation: cacheGeneration,
        resourceFacts,
        ...shadowProjection === void 0 ? {} : { shadowRevision: shadowProjection.revision },
        ...capability === void 0 ? {} : { capability },
        budget: {
          quality: cloud.params.quality,
          reason: "physical GPU timing and residency receipts are unavailable until a prepared adapter submits them"
        }
      })
    });
  };
  return Object.freeze({
    identity: CLOUD_LAYER_FEATURE_IDENTITY,
    placement: "scene",
    requiredCapabilities: ["compute", "storageBuffer", "rgba16floatRenderable"],
    shaderModuleMode: "immediate",
    extract: (context) => {
      const frames = /* @__PURE__ */ Object.create(null);
      for (const view of context.views) {
        if (!view.render) continue;
        const extracted = extractView({ ...context, ...view });
        if (!extracted.ok) return extracted;
        frames[view.identity] = extracted.value;
      }
      const formations = new Set(
        context.views.flatMap(
          (view) => view.frame?.cloudLayer === void 0 ? [] : [cloudLayerFormationKey(view.frame.cloudLayer.params)]
        )
      );
      for (const key of caches.keys()) if (!formations.has(key)) caches.delete(key);
      return ok2({
        views: frames,
        inspection: Object.freeze(
          Object.fromEntries(
            Object.entries(frames).map(([identity, frame]) => [identity, frame.inspection])
          )
        )
      });
    },
    onFrameSubmitted: (frames, receipt) => {
      const inspection = { ...frames.inspection };
      for (const work of receipt.works) {
        if (work.scope === "frame") continue;
        const frame = frames.views[work.scope.view];
        if (frame?.params === void 0) {
          histories.reset(work.scope.view);
          const off = inspectCloudLayer({ authored: false });
          acceptedInspections.set(work.scope.view, off);
          inspection[work.scope.view] = off;
          continue;
        }
        if (!work.passes.some((pass) => pass.name === "cloud-layer-transport") || frame.temporal === void 0)
          continue;
        histories.commit(
          frame.temporal.signature,
          createCloudHistory(frame.temporal.signature, frame.generation, true)
        );
        const candidate = frames.inspection[work.scope.view];
        if (candidate !== void 0) {
          const accepted = Object.freeze({
            ...candidate,
            resourceStage: "accepted",
            candidateGeneration: void 0
          });
          acceptedInspections.set(work.scope.view, accepted);
          inspection[work.scope.view] = accepted;
        }
      }
      frames.inspection = Object.freeze(inspection);
    },
    plan: (frames, context) => {
      const roster = new Set(context.views.map((view) => view.identity));
      histories.retain(roster);
      for (const identity of acceptedInspections.keys())
        if (!roster.has(identity)) acceptedInspections.delete(identity);
      const inspection = Object.fromEntries(acceptedInspections);
      const work = [];
      const densityResources = [];
      const densityPasses = [];
      const densityGenerations = /* @__PURE__ */ new Set();
      for (const view of context.views) {
        const frame = frames.views[view.identity];
        if (!view.render) continue;
        if (frame?.cache === void 0 || frame.params === void 0) {
          inspection[view.identity] = frame?.inspection ?? inspectCloudLayer({ authored: false });
          work.push({ scope: { view: view.identity }, resources: [], passes: [] });
          continue;
        }
        const decision = frame.temporal === void 0 ? void 0 : histories.begin(frame.temporal.signature, frame.temporal);
        const temporal = frame.temporal === void 0 || decision === void 0 ? void 0 : {
          signature: frame.temporal.signature,
          history: decision.history ?? createCloudHistory(frame.temporal.signature, frame.generation, false),
          reset: decision.reset,
          reasons: decision.reasons
        };
        const accepted = acceptedInspections.get(view.identity);
        const lastTemporalReset = temporal?.reasons.at(-1) ?? accepted?.lastTemporalReset;
        inspection[view.identity] = inspectCloudLayer({
          authored: true,
          ...frame.sourceKey === void 0 ? {} : { sourceKey: frame.sourceKey },
          generation: frame.generation,
          candidateGeneration: frame.generation,
          capability: cloudCapabilitiesFromRhi(context.caps),
          temporalResets: (accepted?.temporalResets ?? 0) + (temporal?.reset === true ? 1 : 0),
          ...lastTemporalReset === void 0 ? {} : { lastTemporalReset },
          ...frame.shadowProjection === void 0 ? {} : { shadowRevision: frame.shadowProjection.revision },
          resourceFacts: inspectCloudLayerResources({
            generation: frame.generation,
            cache: frame.cache,
            ...frame.shadowProjection === void 0 ? {} : { shadow: frame.shadowProjection },
            ...temporal?.history === void 0 ? {} : { history: temporal.history }
          }),
          budget: frame.inspection.budget
        });
        const planned = planCloudDensity(
          { ...frame, temporal },
          packCloudDensityCache(frame.cache),
          {
            ...view,
            caps: context.caps,
            getFeatureShaderSource: context.getFeatureShaderSource
          }
        );
        const isDensityResource = (resource) => resource.kind === "buffer" || resource.kind === "compute-program" || resource.kind === "compute-bindings";
        if (!densityGenerations.has(frame.generation)) {
          densityGenerations.add(frame.generation);
          densityResources.push(...planned.resources.filter(isDensityResource));
          densityPasses.push(...planned.passes.filter((pass) => pass.kind === "compute"));
        }
        work.push({
          scope: { view: view.identity },
          resources: planned.resources.filter((resource) => !isDensityResource(resource)),
          passes: planned.passes.filter((pass) => pass.kind !== "compute")
        });
      }
      if (densityResources.length > 0)
        work.unshift({ scope: "frame", resources: densityResources, passes: densityPasses });
      frames.inspection = Object.freeze(inspection);
      return ok2({ work });
    }
  });
}

// sdk/engine/node_modules/@forgeax/engine-render/src/features/barrel-distortion.ts
import { ok as ok3 } from "@forgeax/engine-types";
var BARREL_DISTORTION_POST_PROCESS_ID = "fullscreen.forgeax.barrel-distortion";
var BARREL_DISTORTION_FEATURE_IDENTITY = BARREL_DISTORTION_POST_PROCESS_ID;
var BARREL_DISTORTION_WGSL_COORDINATE = (
  /* wgsl */
  `
struct BarrelDistortionParams {
  strength : f32,
  centerX : f32,
  centerY : f32,
  radiusSquared : f32,
};

fn barrel_distortion_display_to_scene_uv(
  inputUv : vec2<f32>,
  params : BarrelDistortionParams,
  dimensions : vec2<f32>,
) -> vec2<f32> {
  let aspect = dimensions.x / max(dimensions.y, 1.0);
  let p = vec2<f32>(
    2.0 * aspect * (inputUv.x - params.centerX),
    2.0 * (inputUv.y - params.centerY),
  );
  let t = dot(p, p) / max(params.radiusSquared, 1e-6);
  let scale = (1.0 - params.strength) / (1.0 - params.strength * t);
  return clamp(
    vec2<f32>(
      params.centerX + (inputUv.x - params.centerX) * scale,
      params.centerY + (inputUv.y - params.centerY) * scale,
    ),
    vec2<f32>(0.0),
    vec2<f32>(1.0),
  );
}
`
);
var BARREL_DISTORTION_WGSL = (
  /* wgsl */
  `${BARREL_DISTORTION_WGSL_COORDINATE}
struct FullscreenOutput {
  @builtin(position) position : vec4<f32>,
  @location(0) uv : vec2<f32>,
};

fn fullscreen_triangle(vertex_index : u32) -> FullscreenOutput {
  var x : f32 = -1.0;
  var y : f32 = -1.0;
  if (vertex_index == 1u) { x = 3.0; }
  if (vertex_index == 2u) { y = 3.0; }
  let u : f32 = (x + 1.0) * 0.5;
  let v : f32 = 1.0 - (y + 1.0) * 0.5;
  var out : FullscreenOutput;
  out.position = vec4<f32>(x, y, 0.0, 1.0);
  out.uv = vec2<f32>(u, v);
  return out;
}

@group(1) @binding(0) var sceneColor : texture_2d<f32>;
@group(1) @binding(1) var sceneSampler : sampler;

@group(1) @binding(2) var<uniform> params : BarrelDistortionParams;

@vertex
fn vs_main(@builtin(vertex_index) vertex_index : u32) -> FullscreenOutput {
  return fullscreen_triangle(vertex_index);
}

@fragment
fn fs_main(input : FullscreenOutput) -> @location(0) vec4<f32> {
  let dimensions = vec2<f32>(textureDimensions(sceneColor));
  let sampleUv = barrel_distortion_display_to_scene_uv(input.uv, params, dimensions);
  return textureSampleLevel(sceneColor, sceneSampler, sampleUv, 0.0);
}
`
);
function createBarrelDistortionRenderFeature() {
  return Object.freeze({
    identity: BARREL_DISTORTION_FEATURE_IDENTITY,
    requiredCapabilities: ["rgba16floatRenderable"],
    requiredFullscreenPostProcesses: [
      { identity: BARREL_DISTORTION_POST_PROCESS_ID, source: BARREL_DISTORTION_WGSL }
    ],
    extract: (context) => ok3({
      views: context.views.filter(
        (view) => view.render && (view.selectedCamera?.barrelDistortion?.strength ?? 0) > 0
      ).map((view) => view.identity)
    }),
    plan: (data, _context) => ok3({
      work: data.views.map((view) => ({
        scope: { view },
        resources: [
          {
            kind: "fullscreen-program",
            name: BARREL_DISTORTION_POST_PROCESS_ID,
            source: BARREL_DISTORTION_WGSL,
            reads: ["ldrColor"],
            params: { byteSize: 16, defaultValue: new Uint8Array(16) }
          },
          {
            kind: "graphics-program",
            name: "barrel-distortion-pipeline",
            program: {
              shader: BARREL_DISTORTION_POST_PROCESS_ID,
              vertexLayout: "none",
              colorFormats: ["rgba16float"],
              sampleCount: 1
            }
          },
          {
            kind: "graphics-bindings",
            name: "barrel-distortion-bindings",
            program: "barrel-distortion-pipeline",
            values: {
              group: 1,
              fullscreen: true,
              shader: BARREL_DISTORTION_POST_PROCESS_ID,
              input: "barrel-input"
            },
            logicalTargets: { input: "barrel-input" }
          }
        ],
        passes: [
          {
            kind: "raster",
            name: "barrel-distortion",
            colorAttachments: [
              { target: "barrel-output", loadOp: "clear", storeOp: "store" }
            ],
            sampledTargets: ["barrel-input"],
            draws: [
              {
                program: "barrel-distortion-pipeline",
                bindings: ["barrel-distortion-bindings"],
                vertexData: [],
                vertexLayout: "none",
                draw: { kind: "draw", vertexCount: 3, instanceCount: 1 }
              }
            ]
          }
        ]
      }))
    })
  });
}

// sdk/engine/node_modules/@forgeax/engine-render/src/pipeline/standard-transparency.ts
import { RhiError } from "@forgeax/engine-rhi";
import { ok as ok4 } from "@forgeax/engine-types";

// sdk/engine/node_modules/@forgeax/engine-render/src/oit/weight.ts
var OIT_COMPOSITE_EPSILON = 1e-5;

// sdk/engine/node_modules/@forgeax/engine-render/src/pipeline/standard-transparency.ts
var OIT_ACCUMULATE_PASS = "oit-accumulate";
var OIT_COMPOSITE_PASS = "oit-composite";
function addStandardTransparentPasses(graph, input) {
  const sorted = (recordMode) => addTypedScenePass(graph, {
    ...input.template,
    name: "transparent",
    color: input.color,
    depth: input.depth,
    ...input.resolve === void 0 ? {} : { resolve: input.resolve },
    selector: FORWARD_PASS_SELECTOR,
    executeIf: (frame) => {
      if (input.template.executeIf?.(frame) === false) return false;
      if (input.template.gpuDriven !== void 0 || input.resolve !== void 0 || input.color.resolveTarget !== void 0)
        return true;
      const context = frame;
      const selected = selectMainPassMaterials(
        context,
        FORWARD_PASS_SELECTOR,
        recordMode,
        input.template.excludeSelector
      );
      if (selected?.size !== 0) return true;
      prepareMainPassPipelines(
        context,
        FORWARD_PASS_SELECTOR,
        {
          recordMode,
          transparentDepthWrite: true,
          ...input.template.excludeSelector === void 0 ? {} : { excludeSelector: input.template.excludeSelector }
        },
        input.color.sampleCount,
        [input.color.format]
      );
      return false;
    },
    colorLoadOp: "load",
    depthLoadOp: "load",
    recordMode,
    transparentDepthWrite: true
  });
  if (input.transparency?.weightedBlended !== true) return sorted("transparent");
  const msaa = input.color.sampleCount === 4;
  const accumTarget = (label, format) => {
    const resolved = createRenderPipelineTarget(graph, label, {
      format,
      size: input.size,
      domain: "linear-hdr"
    });
    if (!resolved.ok || !msaa) return resolved;
    const multisampled = createRenderPipelineTarget(graph, `${label}-msaa`, {
      format,
      size: input.size,
      sampleCount: 4,
      domain: "linear-hdr"
    });
    if (!multisampled.ok) return multisampled;
    return ok4({ ...multisampled.value, resolveTarget: resolved.value.view });
  };
  const accum = accumTarget("oit-accum", "rgba16float");
  if (!accum.ok) return accum;
  const weight = accumTarget("oit-weight", "r16float");
  if (!weight.ok) return weight;
  const accumulate = addTypedScenePass(graph, {
    ...input.template,
    name: OIT_ACCUMULATE_PASS,
    color: accum.value,
    colorTargets: [accum.value, weight.value],
    depth: input.depth,
    selector: FORWARD_PASS_SELECTOR,
    colorLoadOp: "clear",
    colorClearValues: [
      [0, 0, 0, 1],
      [0, 0, 0, 0]
    ],
    depthLoadOp: "load",
    recordMode: "oit-accumulate",
    transparentDepthWrite: false
  });
  if (!accumulate.ok) return accumulate;
  const composite = addOitCompositePass(graph, {
    color: input.color,
    ...input.resolve === void 0 ? {} : { resolve: input.resolve },
    accum: accum.value.resolveTarget ?? accum.value.view,
    weight: weight.value.resolveTarget ?? weight.value.view
  });
  if (!composite.ok) return composite;
  return input.transparency.residual ? sorted("oit-residual") : ok4(void 0);
}
var OIT_COMPOSITE_WGSL = (
  /* wgsl */
  `
@group(0) @binding(0) var oitAccum : texture_2d<f32>;
@group(0) @binding(1) var oitWeight : texture_2d<f32>;

@vertex
fn vs_oit_composite(@builtin(vertex_index) index : u32) -> @builtin(position) vec4<f32> {
  let p = vec2<f32>(f32((index << 1u) & 2u), f32(index & 2u));
  return vec4<f32>(p * 2.0 - 1.0, 0.0, 1.0);
}

// Weighted average color over the exact coverage 1 - prod(1 - a). The pipeline
// blends it over scene color with straight-alpha over.
@fragment
fn fs_oit_composite(@builtin(position) position : vec4<f32>) -> @location(0) vec4<f32> {
  let pixel = vec2<i32>(position.xy);
  let accum = textureLoad(oitAccum, pixel, 0);
  let revealage = accum.a;
  if (revealage >= 1.0) {
    discard;
  }
  let weight = textureLoad(oitWeight, pixel, 0).r;
  return vec4<f32>(accum.rgb / max(weight, ${OIT_COMPOSITE_EPSILON.toExponential()}), 1.0 - revealage);
}
`
);
function addOitCompositePass(graph, input) {
  let state;
  return graph.addRasterPass(OIT_COMPOSITE_PASS, {
    accesses: [
      { resource: input.accum, usage: "sampled-read" },
      { resource: input.weight, usage: "sampled-read" },
      { resource: input.color.view, usage: "color-attachment" },
      ...input.resolve === void 0 ? [] : [{ resource: input.resolve.view, usage: "color-attachment" }]
    ],
    colorAttachments: [
      {
        view: input.color.view,
        ...input.resolve === void 0 ? {} : { resolveTarget: input.resolve.view },
        loadOp: "load",
        storeOp: "store"
      }
    ],
    encode: ({ pass, frame, resources }) => {
      const device = frame.runtime.device;
      if (state === void 0) {
        const factory = frame.runtime.immediateShaderModuleFactory ?? frame.runtime.shaderModuleFactory;
        if (factory === void 0)
          throw new RhiError({
            code: "rhi-not-available",
            expected: "OIT composite shader module factory",
            hint: "construct the renderer through a backend pack with shader module support"
          });
        const module = factory.createShaderModule({ code: OIT_COMPOSITE_WGSL, label: "oit_composite" }).unwrap();
        const layout2 = device.createBindGroupLayout({
          label: "oit-composite-bgl",
          entries: [0, 1].map((binding) => ({
            binding,
            visibility: GPU_SHADER_STAGE_FRAGMENT,
            texture: { sampleType: "unfilterable-float", viewDimension: "2d" }
          }))
        }).unwrap();
        const pipelineLayout = device.createPipelineLayout({ label: "oit-composite-pl", bindGroupLayouts: [layout2] }).unwrap();
        const pipeline = device.createRenderPipeline({
          label: "oit_composite",
          layout: pipelineLayout,
          vertex: { module, entryPoint: "vs_oit_composite", buffers: [] },
          fragment: {
            module,
            entryPoint: "fs_oit_composite",
            targets: [
              {
                format: input.color.format,
                blend: {
                  color: {
                    operation: "add",
                    srcFactor: "src-alpha",
                    dstFactor: "one-minus-src-alpha"
                  },
                  alpha: { operation: "add", srcFactor: "one", dstFactor: "one-minus-src-alpha" }
                }
              }
            ]
          },
          primitive: { topology: "triangle-list" },
          multisample: { count: input.color.sampleCount }
        }).unwrap();
        state = { pipeline, layout: layout2, groups: /* @__PURE__ */ new WeakMap() };
      }
      const accum = resources.textureView(input.accum).unwrap();
      const weight = resources.textureView(input.weight).unwrap();
      const layout = state.layout;
      const group = getOrCreateFromChain(
        state.groups,
        [accum, weight],
        "oit-composite",
        () => device.createBindGroup({
          label: "oit-composite-bg",
          layout,
          entries: [
            { binding: 0, resource: { kind: "textureView", value: accum } },
            { binding: 1, resource: { kind: "textureView", value: weight } }
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

export {
  evaluateCloudDensity,
  buildCloudDensityCache,
  snapshotCloudDensityCache,
  reconstructCloudDensityCache,
  sampleCloudDensity,
  inspectCloudLayer,
  cloudCapabilitiesFromRhi,
  CLOUD_RGBA16FLOAT_BYTES_PER_TEXEL,
  CLOUD_HISTORY_SURFACE_COUNT,
  inspectCloudLayerResources,
  acceptCloudLayerGeneration,
  retainCloudLayerAfterFailure,
  intersectCloudLayer,
  integrateCloudPath,
  integrateCloudCameraPath,
  integrateCloudSolarColumn,
  integrateCloudInterior,
  applyCloudSolarTransmittance,
  compositeCloudRadiance,
  createCloudShadowProjection,
  projectCloudShadowUv,
  sampleCloudShadow,
  CLOUD_DENSITY_COMPUTE_WGSL,
  CLOUD_HISTORY_FULLSCREEN_WGSL,
  CLOUD_VIEW_FULLSCREEN_WGSL,
  CLOUD_LAYER_FEATURE_IDENTITY,
  CLOUD_VIEW_PARAMS_BYTES,
  createCloudLayerFeature,
  BARREL_DISTORTION_POST_PROCESS_ID,
  BARREL_DISTORTION_FEATURE_IDENTITY,
  BARREL_DISTORTION_WGSL_COORDINATE,
  BARREL_DISTORTION_WGSL,
  createBarrelDistortionRenderFeature,
  OIT_ACCUMULATE_PASS,
  OIT_COMPOSITE_PASS,
  addStandardTransparentPasses
};
//# sourceMappingURL=chunk-BYYRQEH4.mjs.map
