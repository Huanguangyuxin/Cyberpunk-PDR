import {
  CloudLayerOwnerConflictError,
  GlyphText,
  ProjectedDecalInvalidError,
  cloudLayerSourceKey,
  extractProjectedDecals,
  poseShadowCapsules,
  validateCloudLayer
} from "./chunk-MVY4ZZCX.mjs";
import {
  Atmosphere,
  BarrelDistortionInvalidParameterError,
  COOKIE_MIP_LEVEL_COUNT,
  COOKIE_SLICE_CAPACITY,
  COOKIE_SLICE_MIP_CHAIN_BYTES,
  COOKIE_SLICE_SIZE,
  CapsuleShadow,
  CloudLayer,
  DEFAULT_FORWARD_PASS,
  DirectionalLight,
  EXTENDED_LIGHTING_REQUIRED_SAMPLED_TEXTURES,
  GPU_BUFFER_USAGE_COPY_DST,
  GPU_BUFFER_USAGE_STORAGE,
  GPU_BUFFER_USAGE_UNIFORM,
  IES_SLICE_CAPACITY,
  IES_SLICE_HEIGHT,
  IES_SLICE_WIDTH,
  Instances,
  Layer,
  LightProbe,
  Lines,
  MaterialResource,
  MaterialSkinAttrMissingError,
  MeshFilter,
  MeshRenderer,
  MotionBlurValidationError,
  PointLight,
  PointLightShadow,
  Points,
  PostProcessParams,
  RectAreaLight,
  SHADOW_ATLAS_DEFAULT_LAYERS,
  STANDARD_OUTPUT_TRANSFORM_FEATURE_ID,
  STANDARD_PBR_REQUIRED_SAMPLED_TEXTURES,
  Severity,
  ShadowParticipation,
  SkinMaterialMismatchError,
  SkinPaletteOverflowError,
  SkyboxBackground,
  Skylight,
  SortKey,
  SpotLight,
  SpriteInstances,
  SpriteRegionOverride,
  Tilemap,
  appendMaterialDispatchEntries,
  at,
  atmosphereAvailable,
  buildGpuDrivenDraws,
  buildPointShadowMatrices,
  buildRectAreaWorldFrame,
  cameraLensProjection,
  captureMaterialOverrides,
  collectCubeCameraSnapshots,
  collectReflectionProbeFacts,
  compareBufferBytes,
  computeDirectionalCsm,
  computeInvRangeSquared,
  computeProjectionMatrix,
  computeViewMatrix,
  createLightResourceUnavailable,
  createWorldInternalView,
  defaultMaterialSnapshot,
  degToCos,
  directionalShadowQualityFromF32,
  effectiveMeshMaterials,
  extractVolumeSnapshot,
  fogState,
  gpuDrivenSourceDrawItemIndex,
  isStandardPbrSkinMaterialShader,
  materialProgramSelectionsForMaterial,
  materialSnapshotContext,
  materialStandardTextureMask,
  materialUsesSpriteGeometry,
  meshMaterialGeometry,
  pointShapeFromU32,
  prepareExtractContext,
  prepareMaterialSnapshot,
  pssmSplit,
  put,
  readPersistentMaterialSnapshot,
  renderAsset,
  renderAssetRevision,
  resolveMaterialSnapshot,
  resolveMeshMaterialBindings,
  resolvePunctualShadowFarPlane,
  resolveRuntimeAssetReference,
  selectCameraRoles,
  selectEnvironment,
  selectFogFrame,
  sortDispatchByQueue,
  spriteUvRegion,
  storeMaterialSnapshot,
  tonemapParams,
  validateBarrelDistortionParameters,
  validateChannelMask,
  validateDirectionalLightData,
  validateInstanceTransforms,
  validateLightProbeData,
  validatePointLightDecay,
  validateRectAreaLightData,
  worldRenderResources
} from "./chunk-XAU6MWMX.mjs";

// sdk/engine/node_modules/@forgeax/engine-render/src/dynamic-geometry.ts
import { assetDataBytes } from "@forgeax/engine-assets-runtime/internal";
import { err, ok } from "@forgeax/engine-types";
function sharedFrameSnapshot(frame) {
  if (!Object.isFrozen(frame) || Object.getPrototypeOf(frame) !== Object.prototype)
    return void 0;
  for (const key of Reflect.ownKeys(frame)) {
    const descriptor = Object.getOwnPropertyDescriptor(frame, key);
    if (descriptor === void 0 || !("value" in descriptor)) return void 0;
  }
  return Object.freeze({ ...frame });
}
var MeshResidencyError = class extends Error {
  code;
  expected;
  hint;
  actual;
  constructor(code, expected, hint, actual) {
    super(`${code}: ${expected}`);
    this.name = "MeshResidencyError";
    this.code = code;
    this.expected = expected;
    this.hint = hint;
    this.actual = actual;
  }
};
var DynamicGeometryError = class extends Error {
  code;
  expected;
  hint;
  detail;
  constructor(code, expected, hint, detail = {}) {
    super(`${code}: ${expected}`);
    this.name = "DynamicGeometryError";
    this.code = code;
    this.expected = expected;
    this.hint = hint;
    this.detail = Object.freeze({ code, ...detail });
  }
};
function sameCandidateCredential(candidate, committed) {
  return candidate.candidateId === committed.candidateId && candidate.owner === committed.owner && candidate.world === committed.world && candidate.generation === committed.generation && candidate.entity === committed.entity && candidate.physicsEntity === committed.physicsEntity && candidate.gpuReady === committed.gpuReady && candidate.meshBytes === committed.meshBytes && candidate.revision === committed.revision && candidate.topologyRevision === committed.topologyRevision && candidate.materialIdentity === committed.materialIdentity && candidate.meshHandle === committed.meshHandle && candidate.fixedStep === committed.fixedStep;
}
function validateMesh(mesh) {
  if (mesh.kind !== "mesh") return "MeshAsset.kind must be mesh";
  if (!(mesh.vertices instanceof Float32Array) || mesh.vertices.length === 0) {
    return "MeshAsset.vertices must be a non-empty Float32Array";
  }
  if (mesh.indices !== void 0 && !(mesh.indices instanceof Uint16Array || mesh.indices instanceof Uint32Array)) {
    return "MeshAsset.indices must be Uint16Array or Uint32Array";
  }
  if (mesh.submeshes.length === 0)
    return "MeshAsset.submeshes must contain at least one topology range";
  if (mesh.submeshes.some(
    (submesh) => !Number.isSafeInteger(submesh.materialSlot) || submesh.materialSlot < 0 || submesh.materialSlot >= mesh.materialSlots.length
  )) {
    return "MeshAsset.materialSlots must cover every referenced materialSlot";
  }
  const vertices = mesh.vertices;
  if (vertices.byteLength === 0) {
    if (vertices.some((value) => !Number.isFinite(value)))
      return "MeshAsset.vertices must be finite";
  } else {
    for (let index = 0, length = vertices.length; index < length; index++) {
      if (!Number.isFinite(vertices[index])) return "MeshAsset.vertices must be finite";
    }
  }
  return void 0;
}
function meshByteSize(mesh) {
  return assetDataBytes(mesh);
}
function validateDynamicGeometryMeshBudget(maxMeshBytes) {
  const maxMeshByteLimit = 512 * 1024 * 1024;
  if (!Number.isSafeInteger(maxMeshBytes) || maxMeshBytes < 1 || maxMeshBytes > maxMeshByteLimit) {
    throw new RangeError(
      `maxMeshBytes must be a positive safe integer no greater than ${maxMeshByteLimit}`
    );
  }
}
function createDynamicGeometryLifecycle(maxCandidates = 32, maxMeshBytes = 64 * 1024 * 1024, options = {}) {
  const maxRetainedCandidates = options.maxRetainedCandidates ?? maxCandidates;
  const maxCandidateLimit = 4096;
  if (!Number.isSafeInteger(maxCandidates) || maxCandidates < 1 || maxCandidates > maxCandidateLimit) {
    throw new RangeError(
      `maxCandidates must be a positive safe integer no greater than ${maxCandidateLimit}`
    );
  }
  validateDynamicGeometryMeshBudget(maxMeshBytes);
  if (!Number.isSafeInteger(maxRetainedCandidates) || maxRetainedCandidates < maxCandidates || maxRetainedCandidates > maxCandidateLimit) {
    throw new RangeError(
      `maxRetainedCandidates must be a safe integer from maxCandidates through ${maxCandidateLimit}`
    );
  }
  const records = /* @__PURE__ */ new Map();
  const owner = {};
  let sequence = 0;
  let currentGeneration = 0;
  let disposed = false;
  let historyInvalidations = 0;
  let latestRevision;
  let latestFrameId;
  let retired = 0;
  let invalidated = 0;
  let meshBytes = 0;
  const latestRevisionByWorld = /* @__PURE__ */ new WeakMap();
  const latestTopologyRevisionByWorld = /* @__PURE__ */ new WeakMap();
  const publishedReceipts = /* @__PURE__ */ new Map();
  const failure2 = (code, expected, hint, detail = {}) => err(new DynamicGeometryError(code, expected, hint, detail));
  const batchFailure = (code, phase, inputIndex, candidate, detail) => failure2(
    code,
    "all candidates satisfy the current CPU admission contract",
    "fix the item or retain its credential for owner cleanup",
    {
      ...candidate === void 0 ? {} : {
        ...candidate.candidateId === void 0 ? {} : { candidateId: candidate.candidateId },
        ...candidate.revision === void 0 ? {} : { revision: candidate.revision }
      },
      actual: {
        phase,
        ...inputIndex === void 0 ? {} : { inputIndex },
        ...candidate?.candidateId === void 0 ? {} : { candidateId: candidate.candidateId },
        ...detail === void 0 ? {} : { detail }
      }
    }
  );
  const current = (candidate) => {
    const record = records.get(candidate.candidateId);
    if (record === void 0 || candidate.owner !== owner || record.candidate.owner !== candidate.owner || record.candidate.world !== candidate.world || record.candidate.generation !== candidate.generation)
      return void 0;
    return record;
  };
  const planAcceptance = (record, accepted, historyRecords, invalidatesHistory) => ({
    record,
    accepted,
    historyRecords,
    invalidatesHistory
  });
  const commitAcceptancePlans = (plans) => {
    for (const plan of plans) plan.record.candidate = plan.accepted;
    for (const plan of plans) {
      if (plan.invalidatesHistory) historyInvalidations += 1;
      for (const previous of plan.historyRecords) {
        if (previous.historyInvalidated) continue;
        previous.historyInvalidated = true;
        invalidated += 1;
      }
    }
  };
  const release = (id, record) => {
    if (records.get(id) !== record) return;
    records.delete(id);
    meshBytes = Math.max(0, meshBytes - record.candidate.meshBytes);
  };
  const cancelRecord = (id, record, completion) => {
    record.candidate = Object.freeze({ ...record.candidate, state: "cancelled" });
    if (completion === void 0) release(id, record);
    else {
      const settle = () => release(id, record);
      void completion.then(settle, settle);
    }
  };
  const retainedCandidateCount = () => {
    const retained = /* @__PURE__ */ new Set();
    for (const record of records.values()) {
      const state = record.candidate.state;
      if (state === "prepared" || state === "cancelled" || state === "retired")
        retained.add(record.batch ?? record);
    }
    return retained.size;
  };
  const pendingFenceCandidateCount = () => [...records.values()].reduce(
    (count, record) => count + (record.candidate.state === "cancelled" || record.candidate.state === "retired" ? 1 : 0),
    0
  );
  const planCandidates = (candidates, ordering) => {
    if (disposed)
      return failure2("dynamic-geometry-disposed", "renderer is alive", "rebuild the Renderer");
    if (!Array.isArray(candidates) || candidates.length === 0) {
      return batchFailure("dynamic-geometry-invalid", "input", void 0, void 0, {
        candidateCount: Array.isArray(candidates) ? candidates.length : void 0
      });
    }
    const first = candidates[0];
    const declared = first?.candidateId === void 0 ? void 0 : records.get(first.candidateId)?.batch;
    const completeDeclaredBatch = declared !== void 0 && declared.length === candidates.length && candidates.every(
      (candidate) => candidate?.candidateId !== void 0 && records.get(candidate.candidateId)?.batch === declared
    );
    if (candidates.length > maxCandidates && !completeDeclaredBatch) {
      return failure2(
        "dynamic-geometry-budget-exceeded",
        "candidate batch remains within the bounded renderer budget",
        "split the batch before preparing its candidates",
        {
          reason: "batch-count",
          requested: candidates.length,
          used: candidates.length,
          limit: maxCandidates,
          pendingFenceCandidates: pendingFenceCandidateCount(),
          actual: {
            candidateCount: candidates.length,
            maxCandidates,
            retainedCandidates: retainedCandidateCount()
          }
        }
      );
    }
    if (ordering === null || typeof ordering !== "object" || ordering.world === null || typeof ordering.world !== "object" || !Number.isInteger(ordering.fixedStep) || ordering.fixedStep < 0) {
      return batchFailure(
        "dynamic-geometry-ordering-required",
        "ordering",
        void 0,
        void 0,
        ordering
      );
    }
    const orderingWorld = ordering.world;
    const orderingFixedStep = ordering.fixedStep;
    const resolved = [];
    for (let inputIndex = 0; inputIndex < candidates.length; inputIndex += 1) {
      const candidate = candidates[inputIndex];
      if (candidate === void 0 || candidate === null || typeof candidate !== "object") {
        return batchFailure("dynamic-geometry-candidate-not-found", "credential", inputIndex);
      }
      const record = current(candidate);
      if (record === void 0) {
        return batchFailure(
          "dynamic-geometry-candidate-not-found",
          "credential",
          inputIndex,
          candidate
        );
      }
      if (!sameCandidateCredential(candidate, record.candidate)) {
        return batchFailure(
          "dynamic-geometry-receipt-mismatch",
          "credential",
          inputIndex,
          candidate
        );
      }
      resolved.push({ candidate, record, inputIndex });
    }
    if (resolved.some((entry) => entry.record.batch !== void 0) && !completeDeclaredBatch) {
      return batchFailure("dynamic-geometry-invalid", "input", void 0, void 0, {
        reason: "admission must contain the complete declared preparation batch"
      });
    }
    const candidateIndexes = /* @__PURE__ */ new Map();
    const entityIndexes = /* @__PURE__ */ new Map();
    for (const entry of resolved) {
      const candidateIdIndex = candidateIndexes.get(entry.candidate.candidateId);
      if (candidateIdIndex !== void 0) {
        return batchFailure(
          "dynamic-geometry-invalid",
          "duplicate-item",
          entry.inputIndex,
          entry.candidate,
          { firstInputIndex: candidateIdIndex }
        );
      }
      candidateIndexes.set(entry.candidate.candidateId, entry.inputIndex);
      let indexesByEntity = entityIndexes.get(entry.record.world);
      if (indexesByEntity === void 0) {
        indexesByEntity = /* @__PURE__ */ new Map();
        entityIndexes.set(entry.record.world, indexesByEntity);
      }
      const entityIndex = indexesByEntity.get(entry.record.candidate.entity);
      if (entityIndex !== void 0) {
        return batchFailure(
          "dynamic-geometry-invalid",
          "duplicate-item",
          entry.inputIndex,
          entry.candidate,
          { firstInputIndex: entityIndex, entity: entry.record.candidate.entity }
        );
      }
      indexesByEntity.set(entry.record.candidate.entity, entry.inputIndex);
    }
    for (const entry of resolved) {
      if (entry.record.candidate.generation !== currentGeneration) {
        return batchFailure(
          "dynamic-geometry-generation-mismatch",
          "generation",
          entry.inputIndex,
          entry.candidate,
          { activeGeneration: currentGeneration }
        );
      }
    }
    for (const entry of resolved) {
      if (entry.candidate.state !== "prepared" || entry.record.candidate.state !== "prepared") {
        return batchFailure(
          "dynamic-geometry-candidate-state",
          "state",
          entry.inputIndex,
          entry.candidate,
          { inputState: entry.candidate.state, recordState: entry.record.candidate.state }
        );
      }
      if (entry.record.historyInvalidated) {
        return batchFailure("dynamic-geometry-stale", "state", entry.inputIndex, entry.candidate, {
          historyInvalidated: true
        });
      }
    }
    for (const entry of resolved) {
      if (entry.record.world !== orderingWorld) {
        return batchFailure(
          "dynamic-geometry-ordering-required",
          "ordering",
          entry.inputIndex,
          entry.candidate,
          { expectedWorld: entry.record.world, actualWorld: orderingWorld }
        );
      }
      const preparedFixedStep = entry.record.candidate.fixedStep;
      if (preparedFixedStep !== void 0 && (!Number.isInteger(preparedFixedStep) || preparedFixedStep < 0 || preparedFixedStep > orderingFixedStep)) {
        return batchFailure(
          "dynamic-geometry-ordering-required",
          "ordering",
          entry.inputIndex,
          entry.candidate,
          { preparedFixedStep, orderingFixedStep }
        );
      }
    }
    const batchIds = new Set(resolved.map((entry) => entry.candidate.candidateId));
    const newestRevisionByEntity = new Map(
      latestRevisionByWorld.get(orderingWorld)
    );
    const newestTopologyByEntity = new Map(
      latestTopologyRevisionByWorld.get(orderingWorld)
    );
    const recordsByEntity = /* @__PURE__ */ new Map();
    const keepNewest = (watermarks, entity, revision) => {
      const previous = watermarks.get(entity);
      if (previous === void 0 || revision > previous) watermarks.set(entity, revision);
    };
    for (const [candidateId, record] of records) {
      if (record.world !== orderingWorld || batchIds.has(candidateId)) continue;
      const candidate = record.candidate;
      if (candidate.state === "prepared" || candidate.state === "accepted") {
        keepNewest(newestRevisionByEntity, candidate.entity, candidate.revision);
      }
      keepNewest(newestTopologyByEntity, candidate.entity, candidate.topologyRevision);
      const sameEntity = recordsByEntity.get(candidate.entity) ?? [];
      sameEntity.push(record);
      recordsByEntity.set(candidate.entity, sameEntity);
    }
    const planned = [];
    for (const entry of resolved) {
      const candidate = entry.record.candidate;
      if (!Number.isInteger(candidate.revision) || candidate.revision < 0) {
        return batchFailure(
          "dynamic-geometry-invalid",
          "revision-topology",
          entry.inputIndex,
          entry.candidate,
          { revision: candidate.revision }
        );
      }
      const newestRevision = newestRevisionByEntity.get(candidate.entity);
      if (newestRevision !== void 0 && candidate.revision <= newestRevision) {
        return batchFailure(
          "dynamic-geometry-stale",
          "revision-topology",
          entry.inputIndex,
          entry.candidate,
          { revision: candidate.revision, newestRevision }
        );
      }
      if (!Number.isInteger(candidate.topologyRevision) || candidate.topologyRevision < 0) {
        return batchFailure(
          "dynamic-geometry-invalid",
          "revision-topology",
          entry.inputIndex,
          entry.candidate,
          { topologyRevision: candidate.topologyRevision }
        );
      }
      const newestTopology = newestTopologyByEntity.get(candidate.entity);
      if (newestTopology !== void 0 && candidate.topologyRevision < newestTopology) {
        return batchFailure(
          "dynamic-geometry-stale",
          "revision-topology",
          entry.inputIndex,
          entry.candidate,
          { topologyRevision: candidate.topologyRevision, newestTopology }
        );
      }
      const invalidatesHistory = newestTopology !== void 0 && candidate.topologyRevision > newestTopology;
      const historyRecords = invalidatesHistory ? (recordsByEntity.get(candidate.entity) ?? []).filter(
        (record) => record.candidate.topologyRevision < candidate.topologyRevision && !record.historyInvalidated
      ) : [];
      planned.push({ entry, invalidatesHistory, historyRecords });
    }
    let reservedBytes = 0;
    for (const record of records.values()) {
      reservedBytes += record.candidate.meshBytes;
    }
    const reservedCount = retainedCandidateCount();
    if (reservedCount > maxRetainedCandidates) {
      return batchFailure("dynamic-geometry-budget-exceeded", "budget", void 0, void 0, {
        reason: "retained-count",
        requested: 0,
        used: reservedCount,
        limit: maxRetainedCandidates,
        pendingFenceCandidates: pendingFenceCandidateCount()
      });
    }
    if (!Number.isSafeInteger(reservedBytes) || reservedBytes !== meshBytes || reservedBytes > maxMeshBytes) {
      return batchFailure("dynamic-geometry-budget-exceeded", "budget", void 0, void 0, {
        reservedCount,
        reservedBytes,
        meshBytes,
        maxCandidates,
        maxMeshBytes
      });
    }
    const plans = planned.map(({ entry, invalidatesHistory, historyRecords }) => {
      const accepted = Object.freeze({
        ...entry.record.candidate,
        fixedStep: orderingFixedStep,
        state: "accepted"
      });
      return planAcceptance(entry.record, accepted, historyRecords, invalidatesHistory);
    });
    return ok(plans);
  };
  const prepare = (input, generation, batch) => {
    if (disposed)
      return failure2("dynamic-geometry-disposed", "renderer is alive", "rebuild the Renderer");
    if (input.world === null || typeof input.world !== "object") {
      return failure2(
        "dynamic-geometry-world-not-attached",
        "candidate belongs to an attached World",
        "attach the World before preparing geometry"
      );
    }
    if (!Number.isInteger(input.revision) || input.revision < 0) {
      return failure2(
        "dynamic-geometry-invalid",
        "geometry revision is a non-negative integer",
        "advance the consumer revision monotonically",
        { revision: input.revision }
      );
    }
    const topologyRevision = input.topologyRevision ?? input.revision;
    if (!Number.isInteger(topologyRevision) || topologyRevision < 0) {
      return failure2(
        "dynamic-geometry-invalid",
        "topology revision is a non-negative integer",
        "correct the topology revision and prepare geometry again",
        { revision: input.revision, actual: { topologyRevision } }
      );
    }
    if (generation !== currentGeneration && currentGeneration !== 0) {
      return failure2(
        "dynamic-geometry-generation-mismatch",
        "candidate uses the active renderer generation",
        "discard stale generation work and prepare again",
        { generation, actual: currentGeneration }
      );
    }
    if (batch === void 0 || batch.length === 0) {
      const inFlight = retainedCandidateCount();
      if (inFlight >= maxRetainedCandidates) {
        return failure2(
          "dynamic-geometry-budget-exceeded",
          "candidate count remains within the bounded renderer budget",
          "cancel or retire an earlier candidate before retrying",
          {
            reason: "retained-count",
            requested: 1,
            used: inFlight,
            limit: maxRetainedCandidates,
            pendingFenceCandidates: pendingFenceCandidateCount(),
            actual: inFlight
          }
        );
      }
    }
    const invalid = validateMesh(input.mesh);
    if (invalid !== void 0)
      return failure2(
        "dynamic-geometry-invalid",
        "MeshAsset satisfies the standard geometry contract",
        invalid
      );
    const candidateBytes = meshByteSize(input.mesh);
    if (!Number.isSafeInteger(candidateBytes) || candidateBytes < 0 || meshBytes > maxMeshBytes - candidateBytes) {
      return failure2(
        "dynamic-geometry-budget-exceeded",
        "candidate mesh bytes remain within the bounded renderer resource budget",
        "cancel or retire an earlier candidate before retrying",
        {
          reason: "mesh-bytes",
          requested: candidateBytes,
          used: meshBytes,
          limit: maxMeshBytes,
          pendingFenceCandidates: pendingFenceCandidateCount(),
          actual: { meshBytes, candidateBytes, maxMeshBytes }
        }
      );
    }
    const candidateId = `mesh:${generation}:${++sequence}:${input.revision}`;
    const candidate = Object.freeze({
      candidateId,
      generation,
      owner,
      world: input.world,
      ...input.entity === void 0 ? {} : { entity: input.entity },
      ...input.physicsEntity === void 0 ? {} : { physicsEntity: input.physicsEntity },
      gpuReady: input.meshHandle !== void 0,
      meshBytes: candidateBytes,
      revision: input.revision,
      topologyRevision,
      ...input.materialIdentity === void 0 ? {} : { materialIdentity: input.materialIdentity },
      ...input.meshHandle === void 0 ? {} : { meshHandle: input.meshHandle },
      ...input.fixedStep === void 0 ? {} : { fixedStep: input.fixedStep },
      state: "prepared"
    });
    const record = {
      world: input.world,
      candidate,
      historyInvalidated: false,
      ...batch === void 0 ? {} : { batch }
    };
    records.set(candidateId, record);
    batch?.push(candidateId);
    meshBytes += candidateBytes;
    currentGeneration = generation;
    return ok(candidate);
  };
  return {
    prepare,
    prepareCandidates(inputs, generation) {
      if (!Array.isArray(inputs) || inputs.length === 0 || inputs.length > maxCandidateLimit) {
        return failure2(
          "dynamic-geometry-budget-exceeded",
          `one declared preparation has from 1 through ${maxCandidateLimit} members`,
          "submit a complete bounded roster",
          {
            reason: "batch-count",
            ...Array.isArray(inputs) ? { requested: inputs.length } : {},
            limit: maxCandidateLimit
          }
        );
      }
      const world = inputs[0]?.world;
      const entities = /* @__PURE__ */ new Set();
      for (const input of inputs) {
        if (input.world !== world || entities.has(input.entity)) {
          return failure2(
            "dynamic-geometry-invalid",
            "one declared preparation has distinct entities in one World",
            "submit each entity exactly once in the complete World transaction"
          );
        }
        entities.add(input.entity);
      }
      const batch = [];
      const candidates = [];
      const previousGeneration = currentGeneration;
      for (const input of inputs) {
        const result = prepare(input, generation, batch);
        if (!result.ok) {
          for (const id of batch) {
            const record = records.get(id);
            if (record !== void 0) release(id, record);
          }
          currentGeneration = previousGeneration;
          return result;
        }
        candidates.push(result.value);
      }
      Object.freeze(batch);
      return ok(Object.freeze(candidates));
    },
    validateCandidates(candidates, ordering) {
      const planned = planCandidates(candidates, ordering);
      return planned.ok ? ok(void 0) : err(planned.error);
    },
    acceptCandidates(candidates, ordering) {
      const planned = planCandidates(candidates, ordering);
      if (!planned.ok) return err(planned.error);
      const accepted = Object.freeze(planned.value.map((plan) => plan.accepted));
      commitAcceptancePlans(planned.value);
      return ok(accepted);
    },
    accept(candidate, ordering) {
      if (disposed)
        return failure2("dynamic-geometry-disposed", "renderer is alive", "rebuild the Renderer");
      const record = current(candidate);
      if (record === void 0)
        return failure2(
          "dynamic-geometry-candidate-not-found",
          "candidate is owned by this renderer",
          "discard the stale credential"
        );
      if (record.batch !== void 0 && record.batch.length !== 1) {
        return failure2(
          "dynamic-geometry-invalid",
          "admission contains the complete declared preparation batch",
          "accept every prepared member together"
        );
      }
      if (candidate.generation !== currentGeneration) {
        return failure2(
          "dynamic-geometry-generation-mismatch",
          "candidate generation matches the active renderer generation",
          "prepare against the current renderer generation",
          { candidateId: candidate.candidateId }
        );
      }
      if (record.candidate.state !== "prepared") {
        return failure2(
          "dynamic-geometry-candidate-state",
          "candidate is prepared exactly once before acceptance",
          "retain the accepted or published receipt",
          { candidateId: candidate.candidateId }
        );
      }
      if (!sameCandidateCredential(candidate, record.candidate)) {
        return failure2(
          "dynamic-geometry-receipt-mismatch",
          "acceptance uses the exact prepared candidate credential",
          "discard the altered credential and use the value returned by prepare",
          { candidateId: candidate.candidateId }
        );
      }
      if (ordering !== void 0) {
        if (ordering.world !== record.world || !Number.isInteger(ordering.fixedStep) || ordering.fixedStep < 0) {
          return failure2(
            "dynamic-geometry-ordering-required",
            "acceptance ordering names the candidate World and a non-negative fixed step",
            "submit the PhysicsWorld publication ordering for the same attached World",
            { candidateId: candidate.candidateId, actual: ordering }
          );
        }
      }
      const newest = [...records.values()].filter(
        (entry) => entry.candidate.candidateId !== candidate.candidateId && entry.world === record.world && entry.candidate.entity === record.candidate.entity && (entry.candidate.state === "prepared" || entry.candidate.state === "accepted")
      ).map((entry) => entry.candidate.revision).concat(latestRevisionByWorld.get(record.world)?.get(record.candidate.entity) ?? -1).sort((a, b) => b - a)[0];
      if (newest !== void 0 && record.candidate.revision <= newest) {
        return failure2(
          "dynamic-geometry-stale",
          "accepted geometry revision is newer than the active candidate",
          "advance topology revision before accepting",
          { candidateId: candidate.candidateId }
        );
      }
      const accepted = Object.freeze({
        ...record.candidate,
        ...ordering === void 0 ? {} : { fixedStep: ordering.fixedStep },
        state: "accepted"
      });
      const previousTopologies = [...records.values()].filter(
        (entry) => entry.candidate.candidateId !== candidate.candidateId && entry.world === record.world && entry.candidate.entity === record.candidate.entity
      ).map((entry) => entry.candidate.topologyRevision);
      const previousLatestTopology = latestTopologyRevisionByWorld.get(record.world)?.get(record.candidate.entity);
      const newestTopology = previousTopologies.concat(previousLatestTopology === void 0 ? [] : [previousLatestTopology]).sort((a, b) => b - a)[0];
      if (newestTopology !== void 0 && accepted.topologyRevision < newestTopology) {
        return failure2(
          "dynamic-geometry-stale",
          "accepted topology revision is not older than the active geometry history",
          "advance topology revision before accepting a replacement candidate",
          { candidateId: candidate.candidateId }
        );
      }
      const invalidatesHistory = newestTopology !== void 0 && accepted.topologyRevision > newestTopology;
      const historyRecords = invalidatesHistory ? [...records.values()].filter(
        (previous) => previous.world === record.world && previous.candidate.entity === record.candidate.entity && previous.candidate.candidateId !== candidate.candidateId && previous.candidate.topologyRevision < accepted.topologyRevision && !previous.historyInvalidated
      ) : [];
      const plan = planAcceptance(record, accepted, historyRecords, invalidatesHistory);
      const result = ok(plan.accepted);
      commitAcceptancePlans([plan]);
      return result;
    },
    cancel(candidate, completion) {
      const record = current(candidate);
      if (record === void 0)
        return failure2(
          "dynamic-geometry-candidate-not-found",
          "candidate is owned by this renderer",
          "discard the stale credential"
        );
      if (!sameCandidateCredential(candidate, record.candidate))
        return failure2(
          "dynamic-geometry-receipt-mismatch",
          "cancellation uses the exact prepared candidate credential",
          "discard the altered credential and use the value returned by prepare",
          { candidateId: candidate.candidateId }
        );
      if (record.candidate.state !== "prepared" && record.candidate.state !== "accepted") {
        return failure2(
          "dynamic-geometry-candidate-state",
          "only prepared or accepted geometry can be cancelled once",
          "retire published geometry or await the existing terminal cleanup"
        );
      }
      cancelRecord(candidate.candidateId, record, completion);
      return ok(void 0);
    },
    retire(candidate) {
      const record = current(candidate);
      if (record === void 0)
        return failure2(
          "dynamic-geometry-candidate-not-found",
          "retirement uses a published candidate owned by this renderer",
          "discard the stale credential and do not evict any unrelated mesh",
          { candidateId: candidate.candidateId }
        );
      if (!sameCandidateCredential(candidate, record.candidate))
        return failure2(
          "dynamic-geometry-receipt-mismatch",
          "retirement uses the exact published candidate credential",
          "discard the altered credential and use the value returned by publish",
          { candidateId: candidate.candidateId }
        );
      if (record.candidate.state !== "published") {
        return failure2(
          "dynamic-geometry-candidate-state",
          "only published geometry can enter receipt-bound retirement",
          "publish the candidate from a submitted frame first"
        );
      }
      record.candidate = Object.freeze({ ...record.candidate, state: "retired" });
      publishedReceipts.delete(candidate.candidateId);
      retired += 1;
      return ok(void 0);
    },
    finalizeRetirement(candidate) {
      const record = current(candidate);
      if (record === void 0)
        return failure2(
          "dynamic-geometry-candidate-not-found",
          "retirement finalization uses a candidate retained by this lifecycle",
          "discard the stale credential or finish the current receipt-bound retirement"
        );
      if (!sameCandidateCredential(candidate, record.candidate))
        return failure2(
          "dynamic-geometry-receipt-mismatch",
          "retirement finalization uses the exact published candidate credential",
          "discard the altered credential and use the value returned by publication",
          { candidateId: candidate.candidateId }
        );
      if (record.candidate.state !== "retired")
        return failure2(
          "dynamic-geometry-candidate-state",
          "only a retired candidate can release its deferred budget",
          "retire the published candidate before finalizing its receipt-bound cleanup",
          { candidateId: candidate.candidateId }
        );
      release(candidate.candidateId, record);
      return ok(void 0);
    },
    publishFrame(frame, worlds, fixedStep, canPublish, recordStageLane) {
      if (disposed || frame.deviceGeneration !== currentGeneration) return [];
      const receipts = [];
      let sharedFrame;
      let frameChecked = false;
      for (const record of records.values()) {
        const canRepeatPublished = record.candidate.state === "published" && // Attached Renderer publication revalidates the entity binding in
        // `canPublish`, so a history-invalidated candidate can still record
        // a real draw for its live entity. Detached lifecycle publication
        // remains one-shot once that history is invalidated.
        (canPublish !== void 0 || !record.historyInvalidated);
        if (record.candidate.state !== "accepted" && !canRepeatPublished) continue;
        if (worlds !== void 0 && !worlds.includes(record.world)) continue;
        if (record.candidate.fixedStep !== void 0 && (fixedStep === void 0 || record.candidate.fixedStep > fixedStep)) {
          continue;
        }
        if (canPublish !== void 0 && !canPublish(record.candidate)) continue;
        const consumedLane = canPublish === void 0 ? void 0 : recordStageLane?.(record.candidate);
        if (!frameChecked) {
          sharedFrame = sharedFrameSnapshot(frame);
          frameChecked = true;
        }
        if (record.candidate.state !== "published")
          record.candidate = Object.freeze({ ...record.candidate, state: "published" });
        const receipt = Object.freeze({
          candidateId: record.candidate.candidateId,
          generation: record.candidate.generation,
          revision: record.candidate.revision,
          topologyRevision: record.candidate.topologyRevision,
          ...record.candidate.fixedStep === void 0 ? {} : { fixedStep: record.candidate.fixedStep },
          frameId: frame.frameId,
          deviceGeneration: frame.deviceGeneration,
          recordStageConsumed: canPublish !== void 0,
          ...consumedLane === void 0 ? {} : { recordStageLane: consumedLane },
          ...fixedStep === void 0 ? {} : { publicationFixedStep: fixedStep },
          frame: sharedFrame ?? Object.freeze({ ...frame })
        });
        receipts.push(receipt);
        publishedReceipts.set(record.candidate.candidateId, receipt);
        latestRevision = record.candidate.revision;
        latestFrameId = frame.frameId;
        if (!latestRevisionByWorld.has(record.world))
          latestRevisionByWorld.set(record.world, /* @__PURE__ */ new Map());
        latestRevisionByWorld.get(record.world)?.set(record.candidate.entity, record.candidate.revision);
        if (!latestTopologyRevisionByWorld.has(record.world))
          latestTopologyRevisionByWorld.set(record.world, /* @__PURE__ */ new Map());
        latestTopologyRevisionByWorld.get(record.world)?.set(record.candidate.entity, record.candidate.topologyRevision);
      }
      return receipts;
    },
    invalidateWorld(world, completion) {
      for (const [id, record] of records) {
        if (record.world !== world) continue;
        if (record.candidate.state === "cancelled" || record.candidate.state === "retired")
          continue;
        publishedReceipts.delete(id);
        cancelRecord(id, record, completion);
        invalidated += 1;
      }
      latestRevisionByWorld.delete(world);
      latestTopologyRevisionByWorld.delete(world);
    },
    invalidateGeneration(generation) {
      if (generation === currentGeneration) return;
      currentGeneration = generation;
      const invalidatedWorlds = /* @__PURE__ */ new Set();
      for (const [id, record] of records) {
        if (record.candidate.generation !== generation) {
          release(id, record);
          publishedReceipts.delete(id);
          invalidatedWorlds.add(record.world);
          invalidated += 1;
        }
      }
      for (const world of invalidatedWorlds) {
        latestRevisionByWorld.delete(world);
        latestTopologyRevisionByWorld.delete(world);
      }
    },
    receipt(candidate) {
      const receipt = publishedReceipts.get(candidate.candidateId);
      const record = records.get(candidate.candidateId);
      if (record === void 0 || !sameCandidateCredential(candidate, record.candidate)) {
        return void 0;
      }
      return receipt?.generation === candidate.generation ? receipt : void 0;
    },
    inspect() {
      let prepared = 0;
      let accepted = 0;
      let published = 0;
      for (const record of records.values()) {
        if (record.candidate.state === "prepared") prepared += 1;
        else if (record.candidate.state === "accepted") accepted += 1;
        else if (record.candidate.state === "published") published += 1;
      }
      return Object.freeze({
        generation: currentGeneration,
        prepared,
        accepted,
        published,
        retired,
        ...latestRevision === void 0 ? {} : { latestRevision },
        ...latestFrameId === void 0 ? {} : { latestFrameId },
        historyInvalidations,
        invalidated,
        meshBytes,
        maxMeshBytes
      });
    },
    dispose() {
      disposed = true;
      records.clear();
      publishedReceipts.clear();
      meshBytes = 0;
    }
  };
}

// sdk/engine/node_modules/@forgeax/engine-render/src/publication/contract.ts
function renderPublicationTransfers(packet) {
  return [
    packet.upserts.buffer,
    packet.removed.buffer,
    packet.transformEntities.buffer,
    packet.transforms.buffer
  ];
}
function renderPublicationAssetTransfers(packet) {
  const buffers = /* @__PURE__ */ new Set();
  const collect = (value) => {
    if (value instanceof ArrayBuffer) {
      buffers.add(value);
    } else if (ArrayBuffer.isView(value)) {
      if (value.buffer instanceof ArrayBuffer) buffers.add(value.buffer);
    } else if (value !== null && typeof value === "object") {
      for (const child of Object.values(value)) collect(child);
    }
  };
  for (const row of packet.assets) collect(row.value);
  for (const patch of packet.assetPatches) {
    collect(patch.fields);
    for (const range of patch.ranges) collect(range.bytes);
  }
  return [...buffers];
}
var RenderPublicationError = class extends Error {
  constructor(detail) {
    super(`render-publication-invalid: ${detail.reason}: ${detail.subject}`);
    this.detail = detail;
    this.name = "RenderPublicationError";
  }
  detail;
  code = "render-publication-invalid";
  expected = "one valid publication for the bound source session and accepted base";
  hint = "inspect detail.reason; repair the source or start a new session with a complete current baseline";
};

// sdk/engine/node_modules/@forgeax/engine-render/src/raytracing/scene.ts
import { err as err2, ok as ok2 } from "@forgeax/engine-types";
function rayGeometryKey(instance, meshDigest) {
  return JSON.stringify([
    instance.instanceId,
    instance.geometryId,
    instance.mask,
    Array.from(instance.transform),
    meshDigest
  ]);
}
var RAY_REFERENCE_LIMIT = 65536;
var RAY_REFERENCE_TRIANGLE_LIMIT = 327680;
var RAY_TRIANGLE_STRIDE = 80;
var RAY_NODE_STRIDE = 48;
var RAY_INPUT_STRIDE = 48;
var RAY_HIT_STRIDE = 32;
function rayReferenceFailure(cause, limit = false) {
  return err2({
    code: limit ? "ray-reference-limit" : "ray-reference-invalid",
    expected: "finite opaque indexed triangles and finite nonzero rays within the reference profile",
    hint: "Inspect the input; rebuild a bounded scene snapshot before submitting queries.",
    detail: { cause }
  });
}
var uint = (value, max = 4294967295) => Number.isInteger(value) && value >= 0 && value <= max;
var finite32 = (value) => Number.isFinite(value) && Number.isFinite(Math.fround(value));
function buildRayReferenceScene(instances) {
  if (instances.length > 1024) return rayReferenceFailure("instance limit exceeded", true);
  const rows = [];
  const ids = /* @__PURE__ */ new Set();
  for (const instance of instances) {
    const {
      instanceId,
      geometryId,
      materialId,
      mask,
      positions: p,
      indices,
      transform: m
    } = instance;
    if (!uint(instanceId, 4294967294) || ids.has(instanceId) || !uint(geometryId) || !uint(materialId) || !uint(mask, 255))
      return rayReferenceFailure(
        "instance identities must be unique; IDs are u32 and masks are u8"
      );
    ids.add(instanceId);
    if (p.length === 0 || p.length % 3 !== 0 || indices.length === 0 || indices.length % 3 !== 0 || m.length !== 16)
      return rayReferenceFailure("expected nonempty xyz positions, triangle indices, and a mat4");
    if (rows.length + indices.length / 3 > RAY_REFERENCE_TRIANGLE_LIMIT)
      return rayReferenceFailure("triangle limit exceeded", true);
    if (!Array.from(p).every(finite32) || !Array.from(m).every(finite32) || m[3] !== 0 || m[7] !== 0 || m[11] !== 0 || m[15] !== 1)
      return rayReferenceFailure("positions and affine transforms must be finite f32");
    const det = item(m, 0) * (item(m, 5) * item(m, 10) - item(m, 9) * item(m, 6)) - item(m, 4) * (item(m, 1) * item(m, 10) - item(m, 9) * item(m, 2)) + item(m, 8) * (item(m, 1) * item(m, 6) - item(m, 5) * item(m, 2));
    if (!Number.isFinite(det) || det === 0) return rayReferenceFailure("singular transform");
    for (let primitive = 0; primitive < indices.length / 3; primitive++) {
      const row = [];
      for (let vertex = 0; vertex < 3; vertex++) {
        const index = item(indices, primitive * 3 + vertex);
        if (!uint(index) || index * 3 + 2 >= p.length)
          return rayReferenceFailure("index outside positions");
        const x = item(p, index * 3), y = item(p, index * 3 + 1), z = item(p, index * 3 + 2);
        for (let axis = 0; axis < 3; axis++)
          row.push(
            Math.fround(
              item(m, axis) * x + item(m, 4 + axis) * y + item(m, 8 + axis) * z + item(m, 12 + axis)
            )
          );
        row.push(0);
      }
      if (!row.every(finite32)) return rayReferenceFailure("world position overflow");
      const ab = [
        item(row, 4) - item(row, 0),
        item(row, 5) - item(row, 1),
        item(row, 6) - item(row, 2)
      ];
      const ac = [
        item(row, 8) - item(row, 0),
        item(row, 9) - item(row, 1),
        item(row, 10) - item(row, 2)
      ];
      const activeMask = cross(ab, ac).every((v) => v === 0) ? 0 : mask;
      rows.push([...row, instanceId, geometryId, primitive, materialId, activeMask, 0, 0, 0]);
    }
  }
  const { nodes, order } = buildBinnedBvh(rows);
  const ordered = Array.from(order, (index) => item(rows, index));
  const triangles = new Uint8Array(Math.max(1, rows.length) * RAY_TRIANGLE_STRIDE);
  const tv = new DataView(triangles.buffer);
  ordered.forEach((row, i) => {
    row.forEach((v, j) => {
      if (j < 12) tv.setFloat32(i * 80 + j * 4, v, true);
      else tv.setUint32(i * 80 + j * 4, v, true);
    });
  });
  const nodeBytes = new Uint8Array(Math.max(1, nodes.length) * RAY_NODE_STRIDE);
  const nv = new DataView(nodeBytes.buffer);
  nodes.forEach((n, i) => {
    for (let axis = 0; axis < 3; axis++) {
      nv.setFloat32(i * 48 + axis * 4, item(n.min, axis), true);
      nv.setFloat32(i * 48 + 16 + axis * 4, item(n.max, axis), true);
    }
    nv.setUint32(i * 48 + 12, n.escape, true);
    nv.setUint32(i * 48 + 28, n.first, true);
    nv.setUint32(i * 48 + 32, n.count, true);
    nv.setUint32(i * 48 + 36, n.right, true);
    nv.setUint32(i * 48 + 40, n.axis, true);
  });
  return ok2({ triangles, nodes: nodeBytes, triangleCount: rows.length });
}
function packReferenceRays(rays) {
  if (!rays.length || rays.length > RAY_REFERENCE_LIMIT)
    return rayReferenceFailure("ray count must be 1..65536", true);
  const bytes = new Uint8Array(rays.length * RAY_INPUT_STRIDE), view = new DataView(bytes.buffer);
  for (let i = 0; i < rays.length; i++) {
    const r = item(rays, i);
    if (r.origin.length !== 3 || r.direction.length !== 3 || ![...r.origin, ...r.direction, r.tMin, r.tMax].every(finite32) || r.direction.every((v) => Math.fround(v) === 0) || r.tMin < 0 || Math.fround(r.tMax) <= Math.fround(r.tMin) || !uint(r.mask, 255))
      return rayReferenceFailure(`invalid ray ${i}`);
    [...r.origin, r.tMin, ...r.direction, r.tMax].forEach((v, j) => {
      view.setFloat32(i * 48 + j * 4, v, true);
    });
    view.setUint32(i * 48 + 32, r.mask, true);
  }
  return ok2(bytes);
}
function traceReferenceRay(scene, ray) {
  const view = new DataView(
    scene.triangles.buffer,
    scene.triangles.byteOffset,
    scene.triangles.byteLength
  );
  let best = null;
  for (let i = 0; i < scene.triangleCount; i++) {
    const base = i * 80;
    if (!(view.getUint32(base + 64, true) & ray.mask)) continue;
    const point = (offset) => [0, 4, 8].map((a2) => view.getFloat32(base + offset + a2, true));
    const a = point(0), b = point(16), c = point(32);
    const ab = sub(b, a), ac = sub(c, a), normal = cross(ab, ac);
    const denom = dot(normal, ray.direction);
    if (denom === 0) continue;
    const t = dot(normal, sub(a, ray.origin)) / denom;
    if (t < ray.tMin || t > ray.tMax || best !== null && t >= best.t) continue;
    const q = ray.origin.map((o, axis) => o + item(ray.direction, axis) * t - item(a, axis));
    const bb = dot(ab, ab), cc = dot(ac, ac), bc = dot(ab, ac), qb = dot(q, ab), qc = dot(q, ac);
    const d = bb * cc - bc * bc;
    const u = (qb * cc - qc * bc) / d, v = (qc * bb - qb * bc) / d;
    if (u < 0 || v < 0 || u + v > 1) continue;
    best = {
      instanceId: view.getUint32(base + 48, true),
      geometryId: view.getUint32(base + 52, true),
      primitiveId: view.getUint32(base + 56, true),
      materialId: view.getUint32(base + 60, true),
      t,
      barycentrics: [u, v],
      frontFace: denom < 0
    };
  }
  return best;
}
function sub(a, b) {
  return [0, 1, 2].map((i) => item(a, i) - item(b, i));
}
function dot(a, b) {
  return item(a, 0) * item(b, 0) + item(a, 1) * item(b, 1) + item(a, 2) * item(b, 2);
}
function cross(a, b) {
  return [
    item(a, 1) * item(b, 2) - item(a, 2) * item(b, 1),
    item(a, 2) * item(b, 0) - item(a, 0) * item(b, 2),
    item(a, 0) * item(b, 1) - item(a, 1) * item(b, 0)
  ];
}
function item(values, index) {
  const value = values[index];
  if (value === void 0)
    throw new RangeError(`reference kernel index ${index} is outside its validated span`);
  return value;
}
var BVH_LEAF_SIZE = 4;
var BVH_BINS = 16;
var BVH_SAH_DEPTH = 40;
function buildBinnedBvh(rows) {
  const count = rows.length;
  const lo = new Float64Array(count * 3);
  const hi = new Float64Array(count * 3);
  const center = new Float64Array(count * 3);
  for (let t = 0; t < count; t++) {
    const row = item(rows, t);
    for (let axis = 0; axis < 3; axis++) {
      const a = item(row, axis), b = item(row, 4 + axis), c = item(row, 8 + axis);
      lo[t * 3 + axis] = Math.min(a, b, c);
      hi[t * 3 + axis] = Math.max(a, b, c);
      center[t * 3 + axis] = (a + b + c) / 3;
    }
  }
  const order = Uint32Array.from({ length: count }, (_, t) => t);
  const nodes = [];
  const area = (min, max) => {
    const x = Math.max(0, item(max, 0) - item(min, 0)), y = Math.max(0, item(max, 1) - item(min, 1)), z = Math.max(0, item(max, 2) - item(min, 2));
    return x * y + y * z + z * x;
  };
  const binLo = new Float64Array(BVH_BINS * 3);
  const binHi = new Float64Array(BVH_BINS * 3);
  const binCount = new Uint32Array(BVH_BINS);
  const rightArea = new Float64Array(BVH_BINS);
  const visit = (start, end, depth) => {
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    const cmin = [Infinity, Infinity, Infinity], cmax = [-Infinity, -Infinity, -Infinity];
    for (let k = start; k < end; k++) {
      const t = item(order, k);
      for (let axis = 0; axis < 3; axis++) {
        min[axis] = Math.min(item(min, axis), item(lo, t * 3 + axis));
        max[axis] = Math.max(item(max, axis), item(hi, t * 3 + axis));
        cmin[axis] = Math.min(item(cmin, axis), item(center, t * 3 + axis));
        cmax[axis] = Math.max(item(cmax, axis), item(center, t * 3 + axis));
      }
    }
    const node = { min, max, escape: 0, first: start, count: 0, right: 0, axis: 0 };
    nodes.push(node);
    const n = end - start;
    if (n <= BVH_LEAF_SIZE) {
      node.count = n;
      node.escape = nodes.length;
      return;
    }
    let bestAxis = -1, bestBin = 0, bestCost = Infinity;
    for (let axis = 0; depth < BVH_SAH_DEPTH && axis < 3; axis++) {
      const extent = item(cmax, axis) - item(cmin, axis);
      if (!(extent > 0)) continue;
      binLo.fill(Infinity);
      binHi.fill(-Infinity);
      binCount.fill(0);
      const scale = BVH_BINS / extent;
      for (let k = start; k < end; k++) {
        const t = item(order, k);
        const bin = Math.min(
          BVH_BINS - 1,
          Math.floor((item(center, t * 3 + axis) - item(cmin, axis)) * scale)
        );
        binCount[bin] = item(binCount, bin) + 1;
        for (let c = 0; c < 3; c++) {
          binLo[bin * 3 + c] = Math.min(item(binLo, bin * 3 + c), item(lo, t * 3 + c));
          binHi[bin * 3 + c] = Math.max(item(binHi, bin * 3 + c), item(hi, t * 3 + c));
        }
      }
      const accLo = [Infinity, Infinity, Infinity], accHi = [-Infinity, -Infinity, -Infinity];
      for (let bin = BVH_BINS - 1; bin > 0; bin--) {
        for (let c = 0; c < 3; c++) {
          accLo[c] = Math.min(item(accLo, c), item(binLo, bin * 3 + c));
          accHi[c] = Math.max(item(accHi, c), item(binHi, bin * 3 + c));
        }
        rightArea[bin] = area(accLo, accHi);
      }
      accLo.fill(Infinity);
      accHi.fill(-Infinity);
      let left = 0;
      for (let bin = 0; bin < BVH_BINS - 1; bin++) {
        left += item(binCount, bin);
        for (let c = 0; c < 3; c++) {
          accLo[c] = Math.min(item(accLo, c), item(binLo, bin * 3 + c));
          accHi[c] = Math.max(item(accHi, c), item(binHi, bin * 3 + c));
        }
        if (left === 0 || left === n) continue;
        const cost = area(accLo, accHi) * left + item(rightArea, bin + 1) * (n - left);
        if (cost < bestCost) {
          bestCost = cost;
          bestAxis = axis;
          bestBin = bin;
        }
      }
    }
    let middle;
    if (bestAxis >= 0) {
      const axis = bestAxis;
      const scale = BVH_BINS / (item(cmax, axis) - item(cmin, axis));
      const isLeft = (t) => Math.min(
        BVH_BINS - 1,
        Math.floor((item(center, t * 3 + axis) - item(cmin, axis)) * scale)
      ) <= bestBin;
      let i = start, j = end - 1;
      while (i <= j) {
        if (isLeft(item(order, i))) i++;
        else {
          const swap = item(order, i);
          order[i] = item(order, j);
          order[j] = swap;
          j--;
        }
      }
      middle = i;
      node.axis = axis;
    } else {
      const axis = [0, 1, 2].sort(
        (a, b) => item(max, b) - item(min, b) - (item(max, a) - item(min, a)) || a - b
      )[0];
      const span = Array.from(order.subarray(start, end)).sort(
        (a, b) => item(center, a * 3 + axis) - item(center, b * 3 + axis) || a - b
      );
      order.set(span, start);
      middle = start + Math.floor(n / 2);
      node.axis = axis;
    }
    visit(start, middle, depth + 1);
    node.right = nodes.length;
    visit(middle, end, depth + 1);
    node.escape = nodes.length;
  };
  if (count) visit(0, count, 0);
  return { nodes, order };
}

// sdk/engine/node_modules/@forgeax/engine-render/src/raytracing/sdf-query.ts
import {
  validateMeshDistanceField
} from "@forgeax/engine-geometry";
import { mat4 } from "@forgeax/engine-math";
import { ok as ok3 } from "@forgeax/engine-types";

// sdk/engine/node_modules/@forgeax/engine-render/src/raytracing/sdf-field-storage.ts
import { distanceFieldTexel } from "@forgeax/engine-geometry";
import { fnv1a32 } from "@forgeax/engine-types";
var SDF_BRICK_EDGE = 4;
function packSampledField(values, bricks, band, maxWords) {
  const table = bricks.length, brickWords = 32;
  if (table + brickWords > maxWords) return null;
  const words = new Uint32Array(Math.min(maxWords, table * (1 + brickWords))), brick = new Uint32Array(brickWords), chains = /* @__PURE__ */ new Map();
  let end = table;
  const encodedOffsets = /* @__PURE__ */ new Map();
  for (const [index, sourceOffset] of bricks.entries()) {
    const prior = encodedOffsets.get(sourceOffset);
    if (prior !== void 0) {
      words[index] = prior;
      continue;
    }
    brick.fill(0);
    for (let local = 0; local < 64; local++) {
      const code = Math.max(
        -32767,
        Math.min(32767, Math.round((values[sourceOffset + local] ?? 0) / band * 32767))
      ) & 65535;
      brick[local >> 1] = (brick[local >> 1] ?? 0) | code << (local & 1) * 16;
    }
    const hash = fnv1a32(brick);
    let found = -1;
    const offsets = chains.get(hash);
    if (offsets)
      for (const offset of offsets) {
        let equal = true;
        for (let i = 0; i < brickWords; i++)
          if (words[offset + i] !== brick[i]) {
            equal = false;
            break;
          }
        if (equal) {
          found = offset;
          break;
        }
      }
    if (found < 0) {
      if (end + brickWords > maxWords) return null;
      found = end;
      words.set(brick, end);
      end += brickWords;
      if (offsets) offsets.push(found);
      else chains.set(hash, [found]);
    }
    words[index] = found;
    encodedOffsets.set(sourceOffset, found);
  }
  return words.slice(0, end);
}
function packGeometricField(field, maxWords) {
  const [nx, ny, nz] = field.dimensions, count = nx * ny * nz;
  if (count > maxWords) return null;
  const values = new Float32Array(count);
  for (let z = 0; z < nz; z++)
    for (let y = 0; y < ny; y++)
      for (let x = 0; x < nx; x++)
        values[(z * ny + y) * nx + x] = distanceFieldTexel(field, x, y, z);
  return new Uint32Array(values.buffer);
}

// sdk/engine/node_modules/@forgeax/engine-render/src/raytracing/sdf-query.ts
var SdfQueryStatus = {
  miss: 0,
  surfaceBand: 1,
  insideStart: 2,
  stepBudget: 3,
  missingField: 4,
  /** Approximate scene visibility; metrics.y is zero, not a geometric uncertainty bound. */
  visibilityHit: 5
};
function sdfInstanceKey(instance) {
  return JSON.stringify([
    instance.instanceId,
    instance.geometryId,
    instance.mask,
    Array.from(instance.transform),
    "missing" in instance.field ? instance.field.bounds : [
      instance.field.meshDigest,
      instance.field.policy,
      instance.field.dimensions,
      instance.field.origin,
      instance.field.spacing
    ]
  ]);
}
var SDF_HIT_STRIDE = 64;
var SDF_INSTANCE_STRIDE = 144;
var SDF_SAMPLE_WGSL = `
struct Instance { inverse: mat4x4f, ids: vec4u, field: vec4u, origin: vec4f, extent: vec4f, error: vec4f }
struct Ray { origin: vec3f, tMin: f32, direction: vec3f, tMax: f32, mask: vec4u }
struct SdfHit { state: vec4u, metrics: vec4f, position: vec4f, normal: vec4f }
fn sdfTexel(m: Instance, c: vec3u) -> f32 {
  if(m.error.w>0.5){
    let edge=${SDF_BRICK_EDGE}u;
    let dims=(m.field.yzw+vec3u(edge-1u))/edge;
    let b=c/edge;
    let entry=fields[m.field.x+(b.z*dims.y+b.y)*dims.x+b.x];
    let p=c%edge;let local=(p.z*edge+p.y)*edge+p.x;
    return unpack2x16snorm(fields[m.field.x+entry+(local>>1u)])[local&1u]*m.extent.w;
  }
  return bitcast<f32>(fields[m.field.x+(c.z*m.field.z+c.y)*m.field.y+c.x]);
}
fn sdfValue(m: Instance, p: vec3f) -> f32 {
  let q=clamp((p-m.origin.xyz)/m.origin.w,vec3f(0),vec3f(m.field.yzw-vec3u(1u)));
  let cell=vec3u(min(floor(q),vec3f(m.field.yzw-vec3u(2u))));
  let f=q-vec3f(cell); var value=0.0;
  for(var z=0u;z<2u;z++){ for(var y=0u;y<2u;y++){for(var x=0u;x<2u;x++){
    let c=cell+vec3u(x,y,z); let w=select(vec3f(1)-f,f,vec3u(x,y,z)>vec3u(0));
    value+=sdfTexel(m,c)*w.x*w.y*w.z;
  }}}
  return value;
}
`;
var SDF_TRACE_WGSL = `${SDF_SAMPLE_WGSL}fn sdfNormal(m: Instance,p: vec3f) -> vec3f {
  let h=select(m.origin.w,m.origin.w*0.5,m.error.w>0.5);let g=vec3f(sdfValue(m,p+vec3f(h,0,0))-sdfValue(m,p-vec3f(h,0,0)),
    sdfValue(m,p+vec3f(0,h,0))-sdfValue(m,p-vec3f(0,h,0)),sdfValue(m,p+vec3f(0,0,h))-sdfValue(m,p-vec3f(0,0,h)));
  let n=transpose(mat3x3f(m.inverse[0].xyz,m.inverse[1].xyz,m.inverse[2].xyz))*g;
  return n/max(length(n),1e-20);
}
fn traceSdf(ray: Ray, instanceCount: u32, maxSteps: u32, rayDistanceExpansion: bool) -> SdfHit {
var result=SdfHit(vec4u(${SdfQueryStatus.miss}u,0xffffffffu,0xffffffffu,0xffffffffu),vec4f(ray.tMax,0,0,0),vec4f(0),vec4f(0));
  var totalSteps=0u;
  for(var i=0u;i<instanceCount;i++){
    let m=instances[i];if((m.ids.w&ray.mask.x)==0u){continue;}
    let o=(m.inverse*vec4f(ray.origin,1)).xyz;let d=(m.inverse*vec4f(ray.direction,0)).xyz;
    let visibility=m.error.w>0.5;let lo=select(m.origin.xyz,m.origin.xyz+vec3f(m.origin.w),visibility);
    var near=ray.tMin;var far=ray.tMax;var overlap=true;
    for(var axis=0u;axis<3u;axis++){
      if(d[axis]==0.0){if(o[axis]<lo[axis]||o[axis]>m.extent[axis]){overlap=false;}}
      else{let a=(lo[axis]-o[axis])/d[axis];let b=(m.extent[axis]-o[axis])/d[axis];near=max(near,min(a,b));far=min(far,max(a,b));}
    }
    if(!overlap||near>far||near>result.metrics.x){continue;}
    var t=near;var status=${SdfQueryStatus.miss}u;var steps=0u;var insideHeuristic=0.0;
    if(m.field.x==0xffffffffu){status=${SdfQueryStatus.missingField}u;}
    else if(visibility){
      let speed=length(d);var maxDistance=0.0;
      for(var step=0u;step<maxSteps;step++){
        steps++;let value=sdfValue(m,o+d*t);
        if(step==0u && near==ray.tMin && value<0.0){insideHeuristic=1.0;}
        maxDistance=max(maxDistance,value);
        let expansionDistance=select(maxDistance,t*speed,rayDistanceExpansion);
        let expansion=m.error.x*clamp(expansionDistance/(2.0*m.error.x),0.0,1.0);
        if(value<expansion){
          t=clamp(t+(value-expansion)/speed,near,far);status=${SdfQueryStatus.visibilityHit}u;break;
        }
        let next=t+max(value,m.error.z)/speed;
        if(next<=t){status=${SdfQueryStatus.stepBudget}u;break;}
        t=next;
        if(t>far+expansion/speed || t>result.metrics.x){break;}
        if(step+1u==maxSteps){status=${SdfQueryStatus.stepBudget}u;}
      }
    }else {
      for(var step=0u;step<maxSteps;step++){
        if(t>far||t>result.metrics.x){break;}
        steps++;let p=o+d*t;let value=sdfValue(m,p);
        if(value < -m.error.x && step==0u && near==ray.tMin){status=${SdfQueryStatus.insideStart}u;break;}
        if(value<=m.error.x+m.origin.w*0.02){status=${SdfQueryStatus.surfaceBand}u;break;}
        let advance=(value-m.error.x)*0.9/length(d);
        if(t+advance<=t){status=${SdfQueryStatus.stepBudget}u;break;}
        t+=advance;
        if(step+1u==maxSteps && t<=far){status=${SdfQueryStatus.stepBudget}u;}
      }
    }
    totalSteps+=steps;
    if(status!=${SdfQueryStatus.miss}u && t<=result.metrics.x){
      var n=vec3f(0);if(status==${SdfQueryStatus.surfaceBand}u||status==${SdfQueryStatus.visibilityHit}u){n=sdfNormal(m,o+d*t);}
      result=SdfHit(vec4u(status,m.ids.xyz),vec4f(t,m.error.y,0,insideHeuristic),vec4f(ray.origin+ray.direction*t,1),vec4f(n,0));
    }
  }
  result.metrics.z=f32(totalSteps);return result;
}
`;
var SDF_QUERY_WGSL = `
@group(0) @binding(0) var<storage,read> instances: array<Instance>;
@group(0) @binding(1) var<storage,read> fields: array<u32>;
@group(0) @binding(2) var<storage,read> rays: array<Ray>;
@group(0) @binding(3) var<storage,read_write> hits: array<SdfHit>;
@group(0) @binding(4) var<uniform> settings: vec4u;
${SDF_TRACE_WGSL}
@compute @workgroup_size(64) fn main(@builtin(global_invocation_id) gid: vec3u){
 if(gid.x<arrayLength(&rays)){hits[gid.x]=traceSdf(rays[gid.x],settings.x,settings.y,settings.z==1u);}
}
`;
async function createSdfQuery(device, compile, source, rays, options = {}) {
  if (!options || typeof options !== "object" || Array.isArray(options))
    return rayReferenceFailure("SDF query options must be an object");
  const { maxSteps = 128, visibilityExpansion = "clearance" } = options;
  if (visibilityExpansion !== "clearance" && visibilityExpansion !== "ray-distance")
    return rayReferenceFailure("SDF visibility expansion must be clearance or ray-distance");
  const packed = packReferenceRays(rays);
  if (!packed.ok) return packed;
  if (source.length > 64 || !Number.isInteger(maxSteps) || maxSteps < 1 || maxSteps > 1024)
    return rayReferenceFailure("SDF profile allows 64 instances and 1..1024 steps", true);
  const scene = packSdfScene(source);
  if (!scene.ok) return scene;
  const sources = source.map((instance) => ({
    instanceId: instance.instanceId,
    key: rayGeometryKey(
      instance,
      "missing" in instance.field ? "missing" : instance.field.meshDigest
    )
  }));
  const rayCount = rays.length;
  const owned = [];
  const dispose = () => {
    for (const b of owned) device.destroyBuffer(b);
    owned.length = 0;
  };
  const make = (label, bytes, uniform = false) => {
    const result = device.createBuffer({
      label: `sdf.${label}`,
      size: bytes.byteLength,
      usage: (uniform ? 64 : 128) | 12
    });
    if (!result.ok) return result;
    owned.push(result.value);
    const wrote = device.queue.writeBuffer(result.value, 0, bytes);
    return wrote.ok ? result : wrote;
  };
  const data = {
    ...scene.value,
    rays: packed.value,
    hits: new Uint8Array(rays.length * SDF_HIT_STRIDE),
    settings: new Uint8Array(
      new Uint32Array([source.length, maxSteps, visibilityExpansion === "ray-distance" ? 1 : 0, 0]).buffer
    )
  };
  const buffers = {};
  for (const key of Object.keys(data)) {
    const b = make(key, data[key], key === "settings");
    if (!b.ok) {
      dispose();
      return b;
    }
    buffers[key] = b.value;
  }
  const shader = await compile(device, { code: SDF_QUERY_WGSL, label: "sdf.trace" });
  if (!shader.ok) {
    dispose();
    return shader;
  }
  const bgl = device.createBindGroupLayout({
    entries: [0, 1, 2, 3, 4].map((binding) => ({
      binding,
      visibility: 4,
      buffer: {
        type: binding === 4 ? "uniform" : binding === 3 ? "storage" : "read-only-storage"
      }
    }))
  });
  if (!bgl.ok) {
    dispose();
    return bgl;
  }
  const layout = device.createPipelineLayout({ bindGroupLayouts: [bgl.value] });
  if (!layout.ok) {
    dispose();
    return layout;
  }
  const group = device.createBindGroup({
    layout: bgl.value,
    entries: Object.values(buffers).map((buffer, binding) => ({
      binding,
      resource: { kind: "buffer", value: { buffer } }
    }))
  });
  if (!group.ok) {
    dispose();
    return group;
  }
  const pipeline = device.createComputePipeline({
    layout: layout.value,
    compute: { module: shader.value, entryPoint: "main" }
  });
  if (!pipeline.ok) {
    dispose();
    return pipeline;
  }
  let disposed = false;
  return ok3({
    buffers,
    sources,
    rayCount,
    record(encoder) {
      if (disposed) return rayReferenceFailure("SDF query is disposed");
      const p = encoder.beginComputePass({ label: "sdf.trace" });
      p.setPipeline(pipeline.value);
      p.setBindGroup(0, group.value);
      p.dispatchWorkgroups(Math.ceil(rayCount / 64));
      p.end();
      return ok3(void 0);
    },
    dispose() {
      if (!disposed) {
        disposed = true;
        dispose();
      }
    }
  });
}
function packSdfScene(source, maxInstances = 64) {
  if (!Number.isInteger(maxInstances) || maxInstances < 1 || maxInstances > 1024 || source.length > maxInstances)
    return rayReferenceFailure(`SDF profile allows ${maxInstances} instances (maximum 1024)`, true);
  const fieldOffsets = /* @__PURE__ */ new Map();
  const instances = new Uint8Array(Math.max(1, source.length) * SDF_INSTANCE_STRIDE), iv = new DataView(instances.buffer), segments = [], ids = /* @__PURE__ */ new Set();
  let wordCount = 0;
  for (let i = 0; i < source.length; i++) {
    const m = source[i];
    if (m === void 0) return rayReferenceFailure("missing SDF instance");
    if (!Number.isInteger(m.instanceId) || m.instanceId < 0 || m.instanceId >= 4294967295 || ids.has(m.instanceId) || ![m.geometryId, m.mask].every((v) => Number.isInteger(v) && v >= 0 && v <= 4294967295) || m.mask > 255)
      return rayReferenceFailure("SDF identities must be unique u32 values and masks must be u8");
    ids.add(m.instanceId);
    const t = Array.from(m.transform);
    if (t.length !== 16 || !t.every((v) => Number.isFinite(Math.fround(v))) || t[3] !== 0 || t[7] !== 0 || t[11] !== 0 || t[15] !== 1)
      return rayReferenceFailure("expected finite affine SDF transform");
    const matrix = mat4.clone(t), inverse = mat4.invert(mat4.create(), matrix), check = mat4.multiply(mat4.create(), matrix, inverse);
    if (!mat4.equals(check, mat4.identity(mat4.create()), 1e-4) || !Array.from(inverse).every(Number.isFinite))
      return rayReferenceFailure("singular or ill-conditioned SDF transform");
    const field = m.field, missing = "missing" in field, bounds = field.bounds;
    if (![...bounds.min, ...bounds.max].every(Number.isFinite) || bounds.min.some(
      (v, a) => !missing && field.policy.kind === "signed-solid" ? v >= (bounds.max[a] ?? -Infinity) : v > (bounds.max[a] ?? -Infinity)
    ))
      return rayReferenceFailure("invalid SDF bounds");
    const offset2 = i * SDF_INSTANCE_STRIDE;
    inverse.forEach((v, j) => {
      iv.setFloat32(offset2 + j * 4, v, true);
    });
    [m.instanceId, m.geometryId, 4294967295, m.mask].forEach((v, j) => {
      iv.setUint32(offset2 + 64 + j * 4, v, true);
    });
    let origin = bounds.min, extent = bounds.max, spacing = 0, error = 0, distanceBand = 0;
    if (!missing) {
      if (!validateMeshDistanceField(field).ok)
        return rayReferenceFailure("invalid or incomplete SDF payload");
      let fieldOffset = fieldOffsets.get(field);
      if (fieldOffset === void 0) {
        const remaining = 4194304 - wordCount;
        const packed = field.policy.kind === "sampled-visibility" ? packSampledField(field.values, field.bricks, field.policy.distanceBand, remaining) : packGeometricField(field, remaining);
        if (!packed) return rayReferenceFailure("SDF sample memory exceeds 16 MiB", true);
        fieldOffset = wordCount;
        wordCount += packed.length;
        segments.push(packed);
        fieldOffsets.set(field, fieldOffset);
      }
      [fieldOffset, ...field.dimensions].forEach((v, j) => {
        iv.setUint32(offset2 + 80 + j * 4, v, true);
      });
      origin = field.origin;
      spacing = field.spacing;
      error = field.policy.kind === "sampled-visibility" ? 0 : field.policy.errorBound;
      extent = [
        origin[0] + (field.dimensions[0] - 1) * spacing,
        origin[1] + (field.dimensions[1] - 1) * spacing,
        origin[2] + (field.dimensions[2] - 1) * spacing
      ];
      if (field.policy.kind === "sampled-visibility") {
        distanceBand = field.policy.distanceBand;
        const bounds2 = field.policy.traceBounds;
        extent = bounds2.max;
        const halfExtent = Math.max(...extent.map((v, a) => (v - (bounds2.min[a] ?? 0)) / 2));
        iv.setFloat32(offset2 + 128, Math.sqrt(3) * spacing / 2, true);
        iv.setFloat32(offset2 + 136, halfExtent / 1024, true);
        iv.setFloat32(offset2 + 140, 1, true);
      }
    } else iv.setUint32(offset2 + 80, 4294967295, true);
    [...origin, spacing].forEach((v, j) => {
      iv.setFloat32(offset2 + 96 + j * 4, v, true);
    });
    [...extent, distanceBand].forEach((v, j) => {
      iv.setFloat32(offset2 + 112 + j * 4, v, true);
    });
    if (missing || field.policy.kind !== "sampled-visibility")
      iv.setFloat32(offset2 + 128, error, true);
    const scaleBound = Math.hypot(...[0, 1, 2, 4, 5, 6, 8, 9, 10].map((j) => t[j] ?? 0));
    iv.setFloat32(
      offset2 + 132,
      !missing && field.policy.kind === "sampled-visibility" ? 0 : (2 * error + spacing * 0.02) * scaleBound,
      true
    );
  }
  const words = new Uint32Array(Math.max(1, wordCount));
  let offset = 0;
  for (const segment of segments) {
    words.set(segment, offset);
    offset += segment.length;
  }
  return ok3({ instances, fields: new Uint8Array(words.buffer) });
}

// sdk/engine/node_modules/@forgeax/engine-render/src/raytracing/global-sdf.ts
import { RhiError } from "@forgeax/engine-rhi";
import { err as err3, ok as ok5 } from "@forgeax/engine-types";

// sdk/engine/node_modules/@forgeax/engine-render/src/raytracing/buffer-range.ts
function isBufferOffsetAligned(limits, offset, uniform) {
  const alignment = uniform ? limits.minUniformBufferOffsetAlignment : limits.minStorageBufferOffsetAlignment;
  return Number.isSafeInteger(offset) && offset >= 0 && offset % alignment === 0;
}
function isBufferRangeWithinLimits(limits, range, uniform) {
  const offset = range.offset ?? 0;
  if (range.size === void 0) return offset < limits.maxBufferSize;
  const limit = uniform ? limits.maxUniformBufferBindingSize : limits.maxStorageBufferBindingSize;
  return Number.isSafeInteger(offset + range.size) && offset + range.size <= limits.maxBufferSize && range.size <= limit;
}

// sdk/engine/node_modules/@forgeax/engine-render/src/raytracing/global-sdf-buffers.ts
import { ok as ok4 } from "@forgeax/engine-types";
function createGlobalSdfBuffers(device, label, data) {
  const buffers = {};
  const owned = [];
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    for (const buffer of owned) device.destroyBuffer(buffer);
    owned.length = 0;
  };
  for (const key of Object.keys(data)) {
    const bytes = data[key];
    const made = device.createBuffer({
      label: `${label}.${key}`,
      size: bytes.byteLength,
      usage: (key === "settings" ? 64 : 128) | 12
    });
    if (!made.ok) {
      dispose();
      return made;
    }
    buffers[key] = made.value;
    owned.push(made.value);
    const wrote = device.queue.writeBuffer(made.value, 0, bytes);
    if (!wrote.ok) {
      dispose();
      return wrote;
    }
  }
  return ok4({
    buffers,
    get disposed() {
      return disposed;
    },
    dispose
  });
}

// sdk/engine/node_modules/@forgeax/engine-render/src/raytracing/global-sdf.ts
var GlobalSdfVoxelStatus = { unwritten: 0, complete: 1, missingField: 2 };
var GLOBAL_SDF_VOXEL_STRIDE = 16;
var GLOBAL_SDF_COMPOSE_WGSL = `
${SDF_SAMPLE_WGSL}
struct ObjectBounds { lo: vec4f, hi: vec4f, scale: vec4f }
struct Settings { originSpacing: vec4f, dimensionsCount: vec4u, ranges: vec4f }
struct GlobalVoxel { distance: f32, coverage: f32, status: u32, nearestInstance: u32 }
@group(0) @binding(0) var<storage,read> instances: array<Instance>;
@group(0) @binding(1) var<storage,read> fields: array<u32>;
@group(0) @binding(2) var<storage,read> bounds: array<ObjectBounds>;
@group(0) @binding(3) var<uniform> settings: Settings;
@group(0) @binding(4) var<storage,read_write> voxels: array<GlobalVoxel>;
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let dims=settings.dimensionsCount.xyz;
  let count=dims.x*dims.y*dims.z;
  // ranges.zw: optional edit box as exact f32 integers, x|y<<8|z<<16 (lo, extent).
  let boxExtent=u32(settings.ranges.w);var cell:vec3u;
  if(boxExtent==0u){
    if(gid.x>=count){return;}
    cell=vec3u(gid.x%dims.x,(gid.x/dims.x)%dims.y,gid.x/(dims.x*dims.y));
  }else{
    let boxLo=u32(settings.ranges.z);
    let e=vec3u(boxExtent&255u,(boxExtent>>8u)&255u,boxExtent>>16u);
    if(gid.x>=e.x*e.y*e.z){return;}
    cell=vec3u(boxLo&255u,(boxLo>>8u)&255u,boxLo>>16u)+vec3u(gid.x%e.x,(gid.x/e.x)%e.y,gid.x/(e.x*e.y));
    if(any(cell>=dims)){return;}
  }
  let index=cell.x+cell.y*dims.x+cell.z*dims.x*dims.y;
  let world=settings.originSpacing.xyz+vec3f(cell)*settings.originSpacing.w;
  var distance=settings.ranges.x;var nearest=0xffffffffu;var missing=false;
  var oneSided=false;var twoSided=false;
  for(var i=0u;i<settings.dimensionsCount.w;i++){
    let m=instances[i];if(m.ids.w==0u){continue;}
    let b=bounds[i];let p=(m.inverse*vec4f(world,1)).xyz;
    let toBox=max(b.lo.xyz-p,p-b.hi.xyz)*b.scale.xyz;
    let boxDistance=length(max(toBox,vec3f(0)))+min(0.0,max(toBox.x,max(toBox.y,toBox.z)));
    if(boxDistance>=settings.ranges.x){continue;}
    if(m.field.x==0xffffffffu){missing=true;continue;}
    let local=sdfValue(m,clamp(p,b.lo.xyz,b.hi.xyz));
    let candidate=max(local*b.scale.w+max(boxDistance,0.0),boxDistance);
    if(candidate<distance||(candidate==distance&&candidate<settings.ranges.x&&m.ids.x<nearest)){
      distance=candidate;nearest=m.ids.x;
    }
    if(abs(candidate)<settings.ranges.y){
      if(b.lo.w>0.5){twoSided=true;}else{oneSided=true;}
    }
  }
  let coverage=select(1.0,0.0,twoSided&&!oneSided);
  voxels[index]=GlobalVoxel(clamp(distance,-settings.ranges.x,settings.ranges.x),coverage,select(${GlobalSdfVoxelStatus.complete}u,${GlobalSdfVoxelStatus.missingField}u,missing),nearest);
}
`;
function normalizeGlobalSdfGrid(grid) {
  if (!grid || !Array.isArray(grid.origin) || !Array.isArray(grid.dimensions))
    return rayReferenceFailure("global SDF requires origin and dimension triples");
  const numeric = [...grid.origin, grid.spacing, grid.maxDistance, grid.coverageDistance];
  if (grid.origin.length !== 3 || grid.dimensions.length !== 3 || !numeric.every((v) => Number.isFinite(Math.fround(v))) || Math.fround(grid.spacing) <= 0 || Math.fround(grid.maxDistance) <= 0 || grid.coverageDistance < 0 || grid.coverageDistance > grid.maxDistance || grid.dimensions.some((v) => !Number.isInteger(v) || v < 1 || v > 128))
    return rayReferenceFailure(
      "global SDF requires finite origin, positive spacing/range, 0..maxDistance coverage and 1..128 samples per axis"
    );
  for (let a = 0; a < 3; a++) {
    let previous = -Infinity;
    for (let i = 0; i < (grid.dimensions[a] ?? 0); i++) {
      const center = Math.fround(
        Math.fround(grid.origin[a] ?? 0) + Math.fround(i * Math.fround(grid.spacing))
      );
      if (!Number.isFinite(center) || center <= previous)
        return rayReferenceFailure(
          "global SDF sample centers must remain distinct finite f32 positions"
        );
      previous = center;
    }
  }
  const frozen = {
    origin: [Math.fround(grid.origin[0]), Math.fround(grid.origin[1]), Math.fround(grid.origin[2])],
    dimensions: [grid.dimensions[0], grid.dimensions[1], grid.dimensions[2]],
    spacing: Math.fround(grid.spacing),
    maxDistance: Math.fround(grid.maxDistance),
    coverageDistance: Math.fround(grid.coverageDistance)
  };
  return ok5(frozen);
}
function packGlobalSdfComposition(source, grid) {
  const normalized = normalizeGlobalSdfGrid(grid);
  if (!normalized.ok) return normalized;
  const frozen = normalized.value;
  const packed = packSdfScene(source, 1024);
  if (!packed.ok) return packed;
  const sources = source.map((m) => ({
    instanceId: m.instanceId,
    key: sdfInstanceKey(m),
    geometryKey: rayGeometryKey(m, "missing" in m.field ? "missing" : m.field.meshDigest)
  }));
  const objectBytes = new Uint8Array(Math.max(1, source.length) * 48), view = new DataView(objectBytes.buffer);
  for (const [i, m] of source.entries()) {
    const t = Array.from(m.transform, Math.fround);
    const axes = [0, 4, 8].map((a) => [t[a] ?? 0, t[a + 1] ?? 0, t[a + 2] ?? 0]);
    const scales = axes.map((a) => Math.hypot(...a));
    if (!scales.every((v) => Math.fround(v) > 0 && Number.isFinite(Math.fround(v))) || ![...m.field.bounds.min, ...m.field.bounds.max].every((v) => Number.isFinite(Math.fround(v))))
      return rayReferenceFailure(
        "global SDF bounds and transform scales must be finite f32 values"
      );
    for (let a = 0; a < 3; a++)
      for (let b2 = a + 1; b2 < 3; b2++) {
        const x = axes[a], y = axes[b2];
        if (!x || !y) return rayReferenceFailure("missing transform axis");
        const dot2 = x.reduce((n, v, k) => n + v * (y[k] ?? 0), 0);
        if (Math.abs(dot2) > 1e-5 * (scales[a] ?? 0) * (scales[b2] ?? 0))
          return rayReferenceFailure(
            "global SDF composition requires orthogonal transform axes; shear is not qualified",
            true
          );
      }
    const b = !("missing" in m.field) && m.field.policy.kind === "sampled-visibility" ? m.field.policy.traceBounds : m.field.bounds;
    [
      ...b.min,
      "missing" in m.field ? 0 : Number(
        m.field.policy.kind === "sampled-visibility" ? m.field.policy.mostlyTwoSided : m.field.policy.kind === "two-sided"
      ),
      ...b.max,
      0,
      ...scales,
      Math.min(...scales)
    ].forEach((v, k) => {
      view.setFloat32(i * 48 + k * 4, v, true);
    });
  }
  const count = grid.dimensions[0] * grid.dimensions[1] * grid.dimensions[2];
  const settings = new Uint8Array(48), sv = new DataView(settings.buffer);
  [...frozen.origin, frozen.spacing].forEach((v, i) => {
    sv.setFloat32(i * 4, v, true);
  });
  [...frozen.dimensions, source.length].forEach((v, i) => {
    sv.setUint32(16 + i * 4, v, true);
  });
  sv.setFloat32(32, frozen.maxDistance, true);
  sv.setFloat32(36, frozen.coverageDistance, true);
  const data = {
    instances: packed.value.instances,
    fields: packed.value.fields,
    bounds: objectBytes,
    settings,
    voxels: new Uint8Array(count * GLOBAL_SDF_VOXEL_STRIDE)
  };
  return ok5({ grid: frozen, voxelCount: count, sources, data });
}
async function createGlobalSdfComposition(device, compile, source, grid) {
  const prepared = packGlobalSdfComposition(source, grid);
  if (!prepared.ok) return prepared;
  const { grid: frozen, voxelCount: count, sources, data } = prepared.value;
  const allocated = createGlobalSdfBuffers(device, "global-sdf", data);
  if (!allocated.ok) return allocated;
  const allocation = allocated.value;
  const { buffers, dispose } = allocation;
  const shader = await compile(device, {
    code: GLOBAL_SDF_COMPOSE_WGSL,
    label: "global-sdf.compose"
  });
  if (!shader.ok) {
    dispose();
    return shader;
  }
  const recorder = createGlobalSdfCompositionRecorder(device, shader.value);
  if (!recorder.ok) {
    dispose();
    return recorder;
  }
  const input = Object.fromEntries(
    Object.keys(data).map((name) => [
      name,
      { buffer: buffers[name], size: data[name].byteLength }
    ])
  );
  return ok5({
    grid: frozen,
    voxelCount: count,
    sources,
    buffers,
    record(encoder) {
      if (allocation.disposed) return rayReferenceFailure("global SDF composition is disposed");
      const pass = encoder.beginComputePass({ label: "global-sdf.compose" });
      try {
        return recorder.value.record(pass, input, count);
      } finally {
        pass.end();
      }
    },
    dispose
  });
}
function createGlobalSdfCompositionRecorder(device, module) {
  const failure2 = (expected, code = "rhi-descriptor-invalid") => err3(
    new RhiError({
      code,
      expected,
      hint: "Supply supported limits and exact borrowed ranges from the admitted Global SDF scene/grid producer."
    })
  );
  if (!device.caps.compute || !device.caps.storageBuffer)
    return failure2(
      "compute and storage-buffer support for Global SDF composition",
      "rhi-not-available"
    );
  for (const [name, required] of [
    ["maxBindGroups", 1],
    ["maxBindingsPerBindGroup", 5],
    ["maxStorageBuffersPerShaderStage", 4],
    ["maxUniformBuffersPerShaderStage", 1],
    ["maxUniformBufferBindingSize", 48],
    ["maxComputeWorkgroupSizeX", 64],
    ["maxComputeInvocationsPerWorkgroup", 64]
  ])
    if (!(device.limits[name] >= required))
      return failure2(`Global SDF composition requires ${name} >= ${required}`, "limit-exceeded");
  const layout = device.createBindGroupLayout({
    entries: [SDF_INSTANCE_STRIDE, 4, 48, 48, GLOBAL_SDF_VOXEL_STRIDE].map(
      (minBindingSize, binding) => ({
        binding,
        visibility: 4,
        buffer: {
          type: binding === 3 ? "uniform" : binding === 4 ? "storage" : "read-only-storage",
          minBindingSize
        }
      })
    )
  });
  if (!layout.ok) return layout;
  const pipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [layout.value] });
  if (!pipelineLayout.ok) return pipelineLayout;
  const pipeline = device.createComputePipeline({
    label: "global-sdf.compose",
    layout: pipelineLayout.value,
    compute: { module, entryPoint: "main" }
  });
  if (!pipeline.ok) return pipeline;
  return ok5({
    record(pass, input, voxelCount, dispatchCount = voxelCount) {
      if (!Number.isSafeInteger(voxelCount) || voxelCount < 1 || voxelCount > 128 ** 3 || !(Math.ceil(voxelCount / 64) <= device.limits.maxComputeWorkgroupsPerDimension))
        return failure2(
          "Global SDF voxel count in 1..128^3 within dispatch limits",
          "limit-exceeded"
        );
      const rows = input.instances.size / SDF_INSTANCE_STRIDE;
      if (!Number.isInteger(rows) || rows < 1 || rows > 1024 || input.bounds.size !== rows * 48 || input.settings.size !== 48 || input.voxels.size !== voxelCount * GLOBAL_SDF_VOXEL_STRIDE || !Number.isSafeInteger(input.fields.size) || input.fields.size < 4 || input.fields.size % 4 !== 0)
        return failure2(
          "matching packed instance/bounds rows, u32 field words and exact grid/voxel ranges"
        );
      for (const name of ["instances", "fields", "bounds", "settings", "voxels"]) {
        const range = input[name], offset = range.offset ?? 0;
        const uniform = name === "settings";
        if (!isBufferOffsetAligned(device.limits, offset, uniform))
          return failure2(`device-aligned nonnegative ${name} offset`);
        if (!isBufferRangeWithinLimits(device.limits, range, uniform))
          return failure2(`${name} range within device buffer limits`, "limit-exceeded");
      }
      if (["instances", "fields", "bounds", "settings"].some(
        (name) => input[name].buffer === input.voxels.buffer
      ))
        return failure2("Global SDF composition voxels must not alias any borrowed input");
      const group = device.createBindGroup({
        layout: layout.value,
        entries: [input.instances, input.fields, input.bounds, input.settings, input.voxels].map(
          (value, binding) => ({
            binding,
            resource: { kind: "buffer", value }
          })
        )
      });
      if (!group.ok) return group;
      pass.setPipeline(pipeline.value);
      pass.setBindGroup(0, group.value);
      if (!Number.isSafeInteger(dispatchCount) || dispatchCount < 1 || dispatchCount > voxelCount)
        return failure2("Global SDF edit dispatch within 1..voxelCount", "limit-exceeded");
      pass.dispatchWorkgroups(Math.ceil(dispatchCount / 64));
      return ok5(void 0);
    }
  });
}
function globalSdfEditBox(grid, bounds) {
  if (bounds.length === 0) return void 0;
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  const pad = grid.maxDistance + grid.spacing;
  for (const box of bounds)
    for (let a = 0; a < 3; a++) {
      const d = grid.dimensions[a] ?? 1, o = grid.origin[a] ?? 0;
      const first = Math.floor(((box.min[a] ?? 0) - pad - o) / grid.spacing);
      const last = Math.ceil(((box.max[a] ?? 0) + pad - o) / grid.spacing);
      lo[a] = Math.min(lo[a] ?? 0, Math.max(0, first));
      hi[a] = Math.max(hi[a] ?? 0, Math.min(d - 1, last));
    }
  const extent = [0, 1, 2].map((a) => Math.max(0, (hi[a] ?? 0) - (lo[a] ?? 0) + 1));
  if (extent.some((e) => e === 0)) return { lo: [0, 0, 0], extent: [0, 0, 0] };
  if (extent.every((e, a) => e >= (grid.dimensions[a] ?? 0))) return void 0;
  return {
    lo: [lo[0] ?? 0, lo[1] ?? 0, lo[2] ?? 0],
    extent: [extent[0] ?? 0, extent[1] ?? 0, extent[2] ?? 0]
  };
}
function packGlobalSdfEditBox(box) {
  if (box === void 0) return new Float32Array(2);
  const pack = (v) => (v[0] ?? 0) | (v[1] ?? 0) << 8 | (v[2] ?? 0) << 16;
  return new Float32Array([pack(box.lo), pack(box.extent)]);
}

// sdk/engine/node_modules/@forgeax/engine-render/src/raytracing/global-sdf-query.ts
import { RhiError as RhiError2 } from "@forgeax/engine-rhi";
import { err as err4, ok as ok6 } from "@forgeax/engine-types";
var GlobalSdfQueryStatus = {
  miss: 0,
  hit: 1,
  negativeStart: 2,
  stepBudget: 3,
  missingField: 4,
  outsideRegion: 5
};
var GLOBAL_SDF_HIT_STRIDE = 64;
var GLOBAL_SDF_SAMPLE_WGSL = `
struct Grid { originSpacing: vec4f, dimensionsCount: vec4u, ranges: vec4f }
struct Voxel { distance: f32, coverage: f32, status: u32, nearestInstance: u32 }
struct Sample { distance: f32, coverage: f32, status: u32 }
fn sampleGlobal(p: vec3f) -> Sample {
 let dims=grid.dimensionsCount.xyz;
 let q=clamp((p-grid.originSpacing.xyz)/grid.originSpacing.w,vec3f(0),vec3f(dims-vec3u(1u)));
 let cell=vec3u(min(floor(q),vec3f(dims-vec3u(2u))));let f=q-vec3f(cell);
 var result=Sample(0,0,1u);
 for(var z=0u;z<2u;z++){for(var y=0u;y<2u;y++){for(var x=0u;x<2u;x++){
  let offset=vec3u(x,y,z);let w=select(vec3f(1)-f,f,offset>vec3u(0));let weight=w.x*w.y*w.z;
  if(weight>0.0){
   let c=cell+offset;let v=voxels[(c.z*dims.y+c.y)*dims.x+c.x];
   if(v.status!=1u){return Sample(0,0,v.status);}
   result.distance+=v.distance*weight;result.coverage+=v.coverage*weight;
  }
 }}}
 return result;
}
`;
var GLOBAL_SDF_TRACE_WGSL = `
// state: status, unavailable voxel status, steps, reserved.
// metrics: ray t, surface expansion, first sampled distance, geometry coverage.
struct Hit { state: vec4u, metrics: vec4f, position: vec4f, normal: vec4f }
fn traceGlobal(ray: Ray, maxSteps: u32, minStepFactor: f32) -> Hit {
 var result=Hit(vec4u(${GlobalSdfQueryStatus.miss}u,0,0,0),vec4f(ray.tMax,0,0,0),vec4f(0),vec4f(0));
 if(ray.mask.x==0u){return result;}
 let h=grid.originSpacing.w*0.5;
 // Keep one stored sample border for hit-normal differences.
 let lo=grid.originSpacing.xyz+vec3f(grid.originSpacing.w);
 let hi=grid.originSpacing.xyz+vec3f(grid.dimensionsCount.xyz-vec3u(2u))*grid.originSpacing.w;
 let start=ray.origin+ray.direction*ray.tMin;
 if(any(start<lo)||any(start>hi)){
  result.state.x=${GlobalSdfQueryStatus.outsideRegion}u;result.metrics.x=ray.tMin;result.position=vec4f(start,1);return result;
 }
 var far=ray.tMax;
 for(var a=0u;a<3u;a++){
  if(ray.direction[a]>0.0){far=min(far,(hi[a]-ray.origin[a])/ray.direction[a]);}
  else if(ray.direction[a]<0.0){far=min(far,(lo[a]-ray.origin[a])/ray.direction[a]);}
 }
 let scale=max(abs(ray.direction.x),max(abs(ray.direction.y),abs(ray.direction.z)));
 let speed=scale*length(ray.direction/scale);
 var t=ray.tMin;var maxDistance=0.0;var expansion=0.0;
 for(var step=0u;step<maxSteps;step++){
  result.state.z=step+1u;let p=ray.origin+ray.direction*t;let sample=sampleGlobal(p);
  result.metrics.x=t;result.position=vec4f(p,1);
  if(sample.status!=1u){result.state.x=${GlobalSdfQueryStatus.missingField}u;result.state.y=sample.status;return result;}
  if(step==0u){result.metrics.z=sample.distance;}
  result.metrics.w=sample.coverage;
  if(step==0u && sample.distance<0.0){result.state.x=${GlobalSdfQueryStatus.negativeStart}u;return result;}
  maxDistance=max(maxDistance,sample.distance);
  expansion=h*clamp(maxDistance/(2.0*h),0.0,1.0);result.metrics.y=expansion;
  if(sample.distance<expansion){
   t=clamp(t+(sample.distance-expansion)/speed,ray.tMin,far);
   let hitPosition=ray.origin+ray.direction*t;
   var gradient=vec3f(0);
   for(var a=0u;a<3u;a++){
    var offset=vec3f(0);offset[a]=h;
    let positive=sampleGlobal(hitPosition+offset);let negative=sampleGlobal(hitPosition-offset);
    if(positive.status!=1u || negative.status!=1u){
     result.state.x=${GlobalSdfQueryStatus.missingField}u;result.state.y=select(negative.status,positive.status,positive.status!=1u);return result;
    }
    gradient[a]=positive.distance-negative.distance;
   }
   result.state.x=${GlobalSdfQueryStatus.hit}u;result.metrics.x=t;result.position=vec4f(hitPosition,1);
   result.normal=vec4f(gradient/max(length(gradient),1e-20),0);return result;
  }
  let next=t+max(sample.distance,h*minStepFactor)/speed;
  if(next<=t){result.state.x=${GlobalSdfQueryStatus.stepBudget}u;return result;}
  if(next>far){
   // Only a fully covered requested interval can report an approximate miss.
   result.state.x=select(${GlobalSdfQueryStatus.outsideRegion}u,${GlobalSdfQueryStatus.miss}u,far==ray.tMax);
   result.metrics.x=far;result.position=vec4f(ray.origin+ray.direction*far,1);return result;
  }
  t=next;
 }
 result.state.x=${GlobalSdfQueryStatus.stepBudget}u;return result;
}
`;
var GLOBAL_SDF_QUERY_WGSL = `
${GLOBAL_SDF_SAMPLE_WGSL}
struct Ray { origin: vec3f, tMin: f32, direction: vec3f, tMax: f32, mask: vec4u }
${GLOBAL_SDF_TRACE_WGSL}
@group(0) @binding(0) var<storage,read> voxels: array<Voxel>;
@group(0) @binding(1) var<uniform> grid: Grid;
@group(0) @binding(2) var<storage,read> rays: array<Ray>;
@group(0) @binding(3) var<storage,read_write> hits: array<Hit>;
@group(0) @binding(4) var<uniform> settings: vec4u;
@compute @workgroup_size(64) fn main(@builtin(global_invocation_id) id:vec3u){
 if(id.x<arrayLength(&rays)){hits[id.x]=traceGlobal(rays[id.x],settings.x,bitcast<f32>(settings.y));}
}
`;
function packGlobalSdfQuerySettings(grid, options = {}) {
  if (!options || typeof options !== "object" || Array.isArray(options))
    return rayReferenceFailure("global SDF query options must be an object");
  const maxSteps = options.maxSteps ?? 256;
  if (!Number.isInteger(maxSteps) || maxSteps < 1 || maxSteps > 1024)
    return rayReferenceFailure("global SDF query allows 1..1024 steps", true);
  const minStepFactor = Math.fround(options.minStepFactor ?? 1);
  if (!Number.isFinite(minStepFactor) || minStepFactor <= 0 || minStepFactor > 1 || Math.fround(grid.spacing * 0.5 * minStepFactor) < 2 ** -126)
    return rayReferenceFailure(
      "global SDF minimum step factor must be in (0, 1] and produce a normal f32 world advance"
    );
  if (grid.dimensions.some((n) => n < 4) || Math.fround(grid.spacing * 0.5) <= 0)
    return rayReferenceFailure(
      "global SDF tracing requires 4..128 centers per axis and a finite positive half spacing"
    );
  const settings = new Uint8Array(16);
  const settingsView = new DataView(settings.buffer);
  settingsView.setUint32(0, maxSteps, true);
  settingsView.setFloat32(4, minStepFactor, true);
  return ok6(settings);
}
async function createGlobalSdfQuery(device, compile, composition, rays, options = {}) {
  const packed = packReferenceRays(rays);
  if (!packed.ok) return packed;
  const querySettings = packGlobalSdfQuerySettings(composition.grid, options);
  if (!querySettings.ok) return querySettings;
  if (rays.some(
    (r) => r.mask !== 0 && r.mask !== 255 || // WGSL may flush subnormals. Validate the rounded inputs, including
    // intermediate products, before they can form an invalid sample position.
    !Number.isFinite(Math.fround(Math.hypot(...r.direction.map(Math.fround)))) || Math.hypot(...r.direction.map(Math.fround)) < 2 ** -126 || r.origin.some(
      (origin, axis) => [r.tMin, r.tMax].some(
        (t) => !Number.isFinite(
          Math.fround(
            Math.fround(origin) + Math.fround(Math.fround(r.direction[axis] ?? 0) * Math.fround(t))
          )
        )
      )
    )
  ))
    return rayReferenceFailure(
      "a composed world region requires mask 255 or 0, a finite normal f32 ray length and finite f32 endpoints"
    );
  const settings = querySettings.value;
  const data = {
    rays: packed.value,
    hits: new Uint8Array(rays.length * GLOBAL_SDF_HIT_STRIDE),
    settings
  };
  const allocated = createGlobalSdfBuffers(device, "global-sdf.query", data);
  if (!allocated.ok) return allocated;
  const allocation = allocated.value;
  const { dispose } = allocation;
  const buffers = {
    ...allocation.buffers,
    voxels: composition.buffers.voxels,
    grid: composition.buffers.settings
  };
  const fail = (result) => {
    dispose();
    return result;
  };
  const rayCount = packed.value.byteLength / RAY_INPUT_STRIDE;
  const input = {
    voxels: { buffer: buffers.voxels, size: composition.voxelCount * 16 },
    grid: { buffer: buffers.grid, size: 48 },
    rays: { buffer: buffers.rays, size: packed.value.byteLength },
    hits: { buffer: buffers.hits, size: rayCount * GLOBAL_SDF_HIT_STRIDE },
    settings: { buffer: buffers.settings, size: 16 }
  };
  const shader = await compile(device, { code: GLOBAL_SDF_QUERY_WGSL, label: "global-sdf.query" });
  if (!shader.ok) return fail(shader);
  const recorder = createGlobalSdfQueryRecorder(device, shader.value);
  if (!recorder.ok) return fail(recorder);
  return ok6({
    buffers,
    rayCount,
    dispose,
    record(encoder) {
      if (allocation.disposed) return rayReferenceFailure("global SDF query is disposed");
      const pass = encoder.beginComputePass({ label: "global-sdf.query" });
      const result = recorder.value.record(pass, input, rayCount);
      pass.end();
      return result;
    }
  });
}
function createGlobalSdfQueryRecorder(device, module) {
  const failure2 = (expected, code = "rhi-descriptor-invalid") => err4(
    new RhiError2({
      code,
      expected,
      hint: "Supply supported limits, exact borrowed ranges and producer-validated Global SDF inputs."
    })
  );
  if (!device.caps.compute || !device.caps.storageBuffer)
    return failure2("compute and storage-buffer support for Global SDF query", "rhi-not-available");
  for (const [name, required] of [
    ["maxBindGroups", 1],
    ["maxBindingsPerBindGroup", 5],
    ["maxStorageBuffersPerShaderStage", 3],
    ["maxUniformBuffersPerShaderStage", 2],
    ["maxUniformBufferBindingSize", 48],
    ["maxComputeWorkgroupSizeX", 64],
    ["maxComputeInvocationsPerWorkgroup", 64]
  ])
    if (!(device.limits[name] >= required))
      return failure2(`Global SDF query requires ${name} >= ${required}`, "limit-exceeded");
  const layout = device.createBindGroupLayout({
    entries: [16, 48, RAY_INPUT_STRIDE, GLOBAL_SDF_HIT_STRIDE, 16].map(
      (minBindingSize, binding) => ({
        binding,
        visibility: 4,
        buffer: {
          type: binding === 1 || binding === 4 ? "uniform" : binding === 3 ? "storage" : "read-only-storage",
          minBindingSize
        }
      })
    )
  });
  if (!layout.ok) return layout;
  const pipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [layout.value] });
  if (!pipelineLayout.ok) return pipelineLayout;
  const pipeline = device.createComputePipeline({
    label: "global-sdf.query",
    layout: pipelineLayout.value,
    compute: { module, entryPoint: "main" }
  });
  if (!pipeline.ok) return pipeline;
  return ok6({
    record(pass, input, rayCount) {
      if (!Number.isSafeInteger(rayCount) || rayCount < 1 || rayCount > RAY_REFERENCE_LIMIT || !(Math.ceil(rayCount / 64) <= device.limits.maxComputeWorkgroupsPerDimension))
        return failure2("Global SDF ray count in 1..65536 within dispatch limits", "limit-exceeded");
      if (input.rays.size !== rayCount * RAY_INPUT_STRIDE || input.hits.size !== rayCount * GLOBAL_SDF_HIT_STRIDE || input.grid.size !== 48 || input.settings.size !== 16 || !Number.isSafeInteger(input.voxels.size) || input.voxels.size < 4 ** 3 * 16 || input.voxels.size > 128 ** 3 * 16 || input.voxels.size % 16 !== 0)
        return failure2("exact ray/hit/grid/settings ranges and a complete Global SDF voxel range");
      for (const name of ["voxels", "grid", "rays", "hits", "settings"]) {
        const range = input[name], offset = range.offset ?? 0;
        const uniform = name === "grid" || name === "settings";
        if (!isBufferOffsetAligned(device.limits, offset, uniform))
          return failure2(`device-aligned nonnegative ${name} offset`);
        if (!isBufferRangeWithinLimits(device.limits, range, uniform))
          return failure2(`${name} range within device buffer limits`, "limit-exceeded");
      }
      if (["voxels", "grid", "rays", "settings"].some(
        (name) => input[name].buffer === input.hits.buffer
      ))
        return failure2("Global SDF query hits must not alias any borrowed input");
      const group = device.createBindGroup({
        layout: layout.value,
        entries: [input.voxels, input.grid, input.rays, input.hits, input.settings].map(
          (value, binding) => ({ binding, resource: { kind: "buffer", value } })
        )
      });
      if (!group.ok) return group;
      pass.setPipeline(pipeline.value);
      pass.setBindGroup(0, group.value);
      pass.dispatchWorkgroups(Math.ceil(rayCount / 64));
      return ok6(void 0);
    }
  });
}

// sdk/engine/node_modules/@forgeax/engine-render/src/barrel-distortion.ts
import { err as err5, ok as ok7 } from "@forgeax/engine-types";
var COMPUTED_UV_BOUNDARY_EPSILON = Number.EPSILON * 16;
function freezeBarrelDistortionMapping(mapping) {
  const camera = mapping.camera;
  return Object.freeze({
    ...mapping,
    ...camera === void 0 ? {} : {
      camera: Object.freeze({
        projection: camera.projection,
        far: camera.far,
        viewMatrix: Object.freeze(Array.from(camera.viewMatrix)),
        projectionMatrix: Object.freeze(Array.from(camera.projectionMatrix))
      })
    }
  });
}
function attachBarrelDistortionCameraFrame(mapping, camera) {
  return freezeBarrelDistortionMapping({
    ...mapping,
    camera: {
      projection: camera.projection,
      far: camera.far,
      viewMatrix: camera.viewMatrix,
      projectionMatrix: camera.projectionMatrix
    }
  });
}
function invalidExtent(field, value) {
  return new BarrelDistortionInvalidParameterError({
    field,
    value,
    expected: "finite and greater than 0"
  });
}
function createBarrelDistortionMapping(width, height, input) {
  if (!Number.isFinite(width) || width <= 0) return err5(invalidExtent("width", width));
  if (!Number.isFinite(height) || height <= 0) return err5(invalidExtent("height", height));
  const parameters = validateBarrelDistortionParameters(input);
  if (!parameters.ok) return parameters;
  const { strength, centerX, centerY } = parameters.value;
  const aspect = width / height;
  const radiusSquared = 4 * (aspect * aspect * Math.max(centerX, 1 - centerX) ** 2 + Math.max(centerY, 1 - centerY) ** 2);
  return ok7(
    Object.freeze({
      width,
      height,
      aspect,
      strength,
      centerX,
      centerY,
      radiusSquared
    })
  );
}
function displayToSceneScale(mapping, ux, uy) {
  const px = 2 * mapping.aspect * (ux - mapping.centerX);
  const py = 2 * (uy - mapping.centerY);
  const t = (px * px + py * py) / mapping.radiusSquared;
  return (1 - mapping.strength) / (1 - mapping.strength * t);
}
function normalizeComputedUv(out, x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  if (x < -COMPUTED_UV_BOUNDARY_EPSILON || x > 1 + COMPUTED_UV_BOUNDARY_EPSILON || y < -COMPUTED_UV_BOUNDARY_EPSILON || y > 1 + COMPUTED_UV_BOUNDARY_EPSILON) {
    return false;
  }
  out.x = Math.min(1, Math.max(0, x));
  out.y = Math.min(1, Math.max(0, y));
  return true;
}
function mapDisplayUvToSceneUv(out, mapping, ux, uy) {
  if (!Number.isFinite(ux) || !Number.isFinite(uy) || ux < 0 || ux > 1 || uy < 0 || uy > 1)
    return false;
  if (mapping.strength === 0) {
    out.x = ux;
    out.y = uy;
    return ux >= 0 && ux <= 1 && uy >= 0 && uy <= 1;
  }
  const scale = displayToSceneScale(mapping, ux, uy);
  return normalizeComputedUv(
    out,
    mapping.centerX + (ux - mapping.centerX) * scale,
    mapping.centerY + (uy - mapping.centerY) * scale
  );
}
function mapSceneUvToDisplayUv(out, mapping, ux, uy) {
  if (!Number.isFinite(ux) || !Number.isFinite(uy) || ux < 0 || ux > 1 || uy < 0 || uy > 1)
    return false;
  if (mapping.strength === 0) {
    out.x = ux;
    out.y = uy;
    return ux >= 0 && ux <= 1 && uy >= 0 && uy <= 1;
  }
  const px = 2 * mapping.aspect * (ux - mapping.centerX);
  const py = 2 * (uy - mapping.centerY);
  const sourceRadius = Math.hypot(px, py);
  if (sourceRadius === 0) {
    out.x = mapping.centerX;
    out.y = mapping.centerY;
    return true;
  }
  const discriminant = (1 - mapping.strength) ** 2 + 4 * mapping.strength * sourceRadius * sourceRadius / mapping.radiusSquared;
  const displayRadius = 2 * sourceRadius / (1 - mapping.strength + Math.sqrt(Math.max(0, discriminant)));
  const scale = displayRadius / sourceRadius;
  return normalizeComputedUv(
    out,
    mapping.centerX + (ux - mapping.centerX) * scale,
    mapping.centerY + (uy - mapping.centerY) * scale
  );
}
function validPixel(point) {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}
function mapDisplayToScene(out, mapping, displayX, displayY) {
  if (!Number.isFinite(displayX) || !Number.isFinite(displayY)) return false;
  if (displayX < 0 || displayX > mapping.width || displayY < 0 || displayY > mapping.height) {
    return false;
  }
  const scene = { x: 0, y: 0 };
  if (!mapDisplayUvToSceneUv(scene, mapping, displayX / mapping.width, displayY / mapping.height)) {
    return false;
  }
  out.x = scene.x * mapping.width;
  out.y = scene.y * mapping.height;
  return validPixel(out);
}
function mapSceneToDisplay(out, mapping, sceneX, sceneY) {
  if (!Number.isFinite(sceneX) || !Number.isFinite(sceneY)) return false;
  if (sceneX < 0 || sceneX > mapping.width || sceneY < 0 || sceneY > mapping.height) {
    return false;
  }
  const display = { x: 0, y: 0 };
  if (!mapSceneUvToDisplayUv(display, mapping, sceneX / mapping.width, sceneY / mapping.height)) {
    return false;
  }
  out.x = display.x * mapping.width;
  out.y = display.y * mapping.height;
  return validPixel(out);
}

// sdk/engine/node_modules/@forgeax/engine-render/src/cloud/extract.ts
import { Time } from "@forgeax/engine-ecs";
import { err as err6, ok as ok8 } from "@forgeax/engine-types";
function selectCloudLayerFrame(candidates, worldTimeSeconds = 0, sunDirection = void 0, sunRadiance = void 0) {
  if (candidates.length === 0) return ok8(void 0);
  if (candidates.length > 1) return err6(new CloudLayerOwnerConflictError(candidates.length));
  const candidate = candidates[0];
  if (candidate === void 0) return ok8(void 0);
  const validated = validateCloudLayer(candidate.data);
  if (!validated.ok) return validated;
  return ok8(
    Object.freeze({
      status: "available",
      entityKey: candidate.entityKey,
      sourceKey: cloudLayerSourceKey(validated.value),
      params: validated.value,
      worldTimeSeconds: Number.isFinite(worldTimeSeconds) ? Math.max(0, worldTimeSeconds) : 0,
      sunDirection: sunDirection === void 0 ? void 0 : Object.freeze([...sunDirection]),
      sunRadiance: sunRadiance === void 0 ? void 0 : Object.freeze([...sunRadiance]),
      revision: 1
    })
  );
}
function extractCloudLayer(world) {
  const candidates = [];
  try {
    const query = world.query({ read: [CloudLayer] });
    if (!query.ok) return ok8(void 0);
    for (const row of query.value)
      candidates.push({ entityKey: row.entity, data: row.get(CloudLayer) });
  } catch {
    return ok8(void 0);
  }
  let sunDirection;
  let sunRadiance;
  try {
    const query = world.query({ read: [DirectionalLight] });
    if (query.ok) {
      for (const row of query.value) {
        const light = row.get(DirectionalLight);
        const intensity = Number.isFinite(light.intensity) ? Math.max(0, light.intensity) : 0;
        sunDirection = [
          -(light.direction[0] ?? 0),
          -(light.direction[1] ?? -1),
          -(light.direction[2] ?? 0)
        ];
        sunRadiance = [
          (light.color[0] ?? 1) * intensity,
          (light.color[1] ?? 1) * intensity,
          (light.color[2] ?? 1) * intensity
        ];
        break;
      }
    }
  } catch {
  }
  return selectCloudLayerFrame(
    candidates,
    world.getResource(Time).elapsed,
    sunDirection,
    sunRadiance
  );
}

// sdk/engine/node_modules/@forgeax/engine-render/src/tilemap-geometry.ts
import { runtimeAssets } from "@forgeax/engine-assets-runtime/internal";
import {
  DEFAULT_VERTEX_ATTRIBUTE_MAP,
  deriveVertexLayoutProjection,
  unpackInterleavedVertexAttributes
} from "@forgeax/engine-geometry";
import { decodeTileBits } from "@forgeax/engine-graphics-extras";
import { mat4 as mat42 } from "@forgeax/engine-math";
import {
  AssetError
} from "@forgeax/engine-types";
function validTilemapSource(value) {
  return value !== null && typeof value === "object" && Number.isInteger(value.tileset) && value.tileset > 0 && value.tileset <= 4294967295 && Number.isSafeInteger(value.cols) && value.cols > 0 && Number.isSafeInteger(value.rows) && value.rows > 0 && Number.isSafeInteger(value.chunkSize) && value.chunkSize > 0 && value.chunkSize <= 256 && Array.isArray(value.tileSize) && value.tileSize.length === 2 && value.tileSize.every((n) => Number.isFinite(n) && n > 0) && value.tiles instanceof Uint32Array && value.tiles.length === value.cols * value.rows && Number.isInteger(value.layerOrder) && value.layerOrder >= -2048 && value.layerOrder <= 2047 && (value.sortScope === 0 || value.sortScope === 1);
}
function tilemapSource(world, entity) {
  const row = world.get(entity, Tilemap);
  if (!row.ok || row.value.tileset === 0) return void 0;
  const source = {
    ...row.value,
    tiles: row.value.tiles.slice(),
    tileSize: [row.value.tileSize[0], row.value.tileSize[1]]
  };
  if (!validTilemapSource(source))
    throw new AssetError({
      code: "asset-invalid-value",
      expected: "a Tilemap with positive dimensions, matching cells, valid tileSize and chunkSize in [1, 256]",
      hint: "set the complete Tilemap row with a managed Tileset and TilemapSort value"
    });
  return source;
}
function tilemapChunks(source) {
  const chunks = /* @__PURE__ */ new Map();
  const nx = Math.ceil(source.cols / source.chunkSize);
  for (let cell = 0; cell < source.tiles.length; cell++) {
    if (decodeTileBits(source.tiles[cell] ?? 0).tileId === 0) continue;
    const x = Math.floor(cell % source.cols / source.chunkSize);
    const y = Math.floor(Math.floor(cell / source.cols) / source.chunkSize);
    const index = y * nx + x;
    let chunk = chunks.get(index);
    if (chunk === void 0) {
      chunk = { index, cells: [], x, y };
      chunks.set(index, chunk);
    }
    chunk.cells.push(cell);
  }
  return [...chunks.values()];
}
function tilemapCellMatrix(source, cell, entry) {
  const { flipH, flipV, flipDiagonal } = decodeTileBits(source.tiles[cell] ?? 0);
  const px = entry.pivotX ?? 0.5, py = entry.pivotY ?? 0.5;
  const ex = flipH ? 1 - (flipDiagonal ? py : px) : flipDiagonal ? py : px;
  const ey = flipV ? 1 - (flipDiagonal ? px : py) : flipDiagonal ? px : py;
  const width = entry.widthCells ?? 1, height = entry.heightCells ?? 1;
  const x = (cell % source.cols + ex + (0.5 - ex) * width) * source.tileSize[0];
  const y = (Math.floor(cell / source.cols) + ey + (0.5 - ey) * height) * source.tileSize[1];
  return mat42.compose(
    mat42.create(),
    [x, y, 0],
    [0, 0, flipDiagonal ? Math.SQRT1_2 : 0, flipDiagonal ? Math.SQRT1_2 : 1],
    [
      (flipH ? -1 : 1) * width * source.tileSize[0],
      (flipV ? -1 : 1) * height * source.tileSize[1],
      1
    ]
  );
}
function tilemapRegionMesh(tileset, regionIndex) {
  return tilemapMesh(tileset, [{ regionIndex, matrix: mat42.identity(mat42.create()) }]);
}
function tilemapMesh(tileset, cells) {
  const vertices = new Float32Array(cells.length * 4 * 12);
  const indices = new Uint32Array(cells.length * 6);
  for (const [i, cell] of cells.entries()) {
    const region = tileset.regions[cell.regionIndex];
    if (region === void 0) throw new Error("Tilemap cell references a missing region");
    const size = tileset.atlasSizes?.[region.atlasIndex ?? 0];
    const width = size?.pixelWidth ?? tileset.columns * tileset.tileWidth;
    const height = size?.pixelHeight ?? tileset.rows * tileset.tileHeight;
    const u = (region.x + 0.5) / width, v = (region.y + 0.5) / height;
    const uw = (region.width - 1) / width, vh = (region.height - 1) / height;
    const m = cell.matrix;
    for (let corner = 0; corner < 4; corner++) {
      const right = corner % 2, bottom = Math.floor(corner / 2);
      const x = right - 0.5, y = 0.5 - bottom;
      vertices.set(
        [
          m[0] * x + m[4] * y + m[12],
          m[1] * x + m[5] * y + m[13],
          m[2] * x + m[6] * y + m[14],
          0,
          0,
          1,
          u + right * uw,
          v + bottom * vh,
          m[0] / Math.hypot(m[0], m[1]),
          m[1] / Math.hypot(m[0], m[1]),
          0,
          -1
        ],
        (i * 4 + corner) * 12
      );
    }
    const start = i * 4;
    indices.set([start, start + 2, start + 1, start + 2, start + 3, start + 1], i * 6);
  }
  const attributes = unpackInterleavedVertexAttributes(
    vertices,
    deriveVertexLayoutProjection(DEFAULT_VERTEX_ATTRIBUTE_MAP)
  );
  if (attributes === void 0) throw new Error("Tilemap requires canonical vertex attributes");
  const aabb = new Float32Array([Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity]);
  for (let base = 0; base < vertices.length; base += 12)
    for (let axis = 0; axis < 3; axis++) {
      aabb[axis] = Math.min(aabb[axis], vertices[base + axis]);
      aabb[axis + 3] = Math.max(aabb[axis + 3], vertices[base + axis]);
    }
  return {
    kind: "mesh",
    vertices,
    indices,
    attributes,
    aabb,
    submeshes: [
      {
        indexOffset: 0,
        indexCount: indices.length,
        vertexCount: vertices.length / 12,
        topology: "triangle-list",
        materialSlot: 0
      }
    ],
    materialSlots: [{ slotName: "Default" }]
  };
}
function tilemapCellGeometry(source, tileset, cell) {
  const tileId = decodeTileBits(source.tiles[cell] ?? 0).tileId;
  if (tileId === 0) return void 0;
  const entry = tileset.tiles[tileId - 1];
  if (entry === void 0)
    throw new AssetError({
      code: "asset-invalid-value",
      expected: "every nonempty Tilemap cell to name a Tileset tile",
      hint: "repair the cell id or add the missing Tileset tile"
    });
  return { regionIndex: entry.regionIndex, matrix: tilemapCellMatrix(source, cell, entry) };
}
function tilemapGeometry(world, entity) {
  const source = tilemapSource(world, entity);
  if (source === void 0) return void 0;
  const resolved = runtimeAssets(world.assets).resolveAsset(source.tileset);
  if (!resolved.ok || resolved.value.kind !== "tileset") return void 0;
  const cells = [];
  for (const chunk of tilemapChunks(source))
    for (const cell of chunk.cells) {
      const geometry = tilemapCellGeometry(source, resolved.value, cell);
      if (geometry !== void 0) cells.push(geometry);
    }
  return cells.length === 0 ? void 0 : tilemapMesh(resolved.value, cells);
}

// sdk/engine/node_modules/@forgeax/engine-render/src/raytracing/irradiance-volume.ts
import {
  AssetError as AssetError2,
  err as err7,
  ok as ok13
} from "@forgeax/engine-types";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";

// sdk/engine/node_modules/@forgeax/engine-render/src/raytracing/irradiance-field-plan.ts
import { isValidAssetGuidString, ok as ok12 } from "@forgeax/engine-types";

// sdk/engine/node_modules/@forgeax/engine-render/src/raytracing/reflections-plan.ts
import { ok as ok9 } from "@forgeax/engine-types";
var DEFAULT_LITE_REFLECTIONS = Object.freeze({
  maxRoughnessToTrace: 0.4,
  roughnessFadeLength: 0.1
});
function validateLiteReflections(gi) {
  const value = gi.gather === "baked" ? void 0 : gi.reflections;
  if (value === void 0) return ok9(void 0);
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return rayReferenceFailure("Lite reflections require one configuration object");
  const reflections = value;
  const { maxRoughnessToTrace: limit, roughnessFadeLength: fade } = reflections;
  if (Object.keys(reflections).some(
    (key) => key !== "maxRoughnessToTrace" && key !== "roughnessFadeLength"
  ) || typeof limit !== "number" || typeof fade !== "number" || !(limit >= 0 && limit <= 1) || !(fade > 0 && fade <= 1))
    return rayReferenceFailure(
      "Lite reflections require maxRoughnessToTrace in [0, 1] and roughnessFadeLength in (0, 1]"
    );
  return ok9(void 0);
}
function freezeLiteReflections(reflections) {
  return Object.freeze({
    maxRoughnessToTrace: reflections.maxRoughnessToTrace,
    roughnessFadeLength: reflections.roughnessFadeLength
  });
}

// sdk/engine/node_modules/@forgeax/engine-render/src/raytracing/scene-field-projection.ts
import {
  runtimeMaterialShaderId
} from "@forgeax/engine-assets-runtime";
import {
  MESH_VISIBILITY_DISTANCE_FIELD_CODEC,
  meshDistanceFieldSource,
  validateMeshDistanceField as validateMeshDistanceField2
} from "@forgeax/engine-geometry";
import { mat4 as mat43 } from "@forgeax/engine-math";
import { admitRayMaterialValues, DEFAULT_STANDARD_SURFACE_MODULE } from "@forgeax/engine-shader";
import {
  ok as ok10
} from "@forgeax/engine-types";

// sdk/engine/node_modules/@forgeax/engine-render/src/standard-displacement-bounds.ts
import { standardTextureMask } from "@forgeax/engine-shader";
var displacementBit = standardTextureMask([{ name: "displacementTexture", type: "texture2d" }]);
var radii = /* @__PURE__ */ new WeakMap();
function materialDisplacementRadius(material) {
  const cached = material.immutableValues === true ? radii.get(material) : void 0;
  if (cached !== void 0) return cached;
  const present = material.standardTextureMask === void 0 ? material.materialParamSchema?.some(
    (p) => p.name === "displacementTexture" && p.type === "texture2d"
  ) : (material.standardTextureMask & displacementBit) !== 0;
  const scale = material.paramSnapshot?.displacementScale ?? 1;
  const bias = material.paramSnapshot?.displacementBias ?? 0;
  const radius = !present ? 0 : typeof scale !== "number" || typeof bias !== "number" || !Number.isFinite(scale) || !Number.isFinite(bias) ? Infinity : Math.max(Math.abs(bias), Math.abs(scale + bias));
  if (material.immutableValues === true) radii.set(material, radius);
  return radius;
}
function standardDisplacementRadius(materials) {
  let radius = 0;
  for (const material of materials) radius = Math.max(radius, materialDisplacementRadius(material));
  return radius;
}
function expandDisplacementBounds(bounds, radius) {
  if (bounds === void 0 || radius === 0) return bounds;
  if (!Number.isFinite(radius)) return void 0;
  const expanded = new Float32Array(bounds);
  for (let axis = 0; axis < 3; axis++) {
    expanded[axis] = (bounds[axis] ?? 0) - radius;
    expanded[axis + 3] = (bounds[axis + 3] ?? 0) + radius;
  }
  return expanded.every(Number.isFinite) ? expanded : void 0;
}

// sdk/engine/node_modules/@forgeax/engine-render/src/raytracing/scene-field-projection.ts
function fieldTransform(source) {
  const t = Float32Array.from(source);
  if (t.length !== 16 || !t.every(Number.isFinite) || t[3] !== 0 || t[7] !== 0 || t[11] !== 0 || t[15] !== 1)
    return rayReferenceFailure("retained field requires a finite affine transform");
  const inverse = mat43.invert(mat43.create(), t);
  if (!inverse.every(Number.isFinite) || !mat43.equals(mat43.multiply(mat43.create(), t, inverse), mat43.identity(mat43.create()), 1e-4))
    return rayReferenceFailure("retained field transform is singular or ill-conditioned");
  const scales = [0, 4, 8].map((i) => Math.hypot(t[i] ?? NaN, t[i + 1] ?? NaN, t[i + 2] ?? NaN));
  if (!scales.every((scale) => Math.fround(scale) > 0 && Number.isFinite(Math.fround(scale))))
    return rayReferenceFailure("retained field transform scales must be finite positive f32");
  for (let a = 0; a < 3; a++)
    for (let b = a + 1; b < 3; b++) {
      const dot2 = (t[a * 4] ?? NaN) * (t[b * 4] ?? NaN) + (t[a * 4 + 1] ?? NaN) * (t[b * 4 + 1] ?? NaN) + (t[a * 4 + 2] ?? NaN) * (t[b * 4 + 2] ?? NaN);
      if (Math.abs(dot2) > 1e-5 * (scales[a] ?? NaN) * (scales[b] ?? NaN))
        return rayReferenceFailure(
          "retained field requires orthogonal axes; shear is not qualified"
        );
    }
  return ok10(t);
}
function validateSceneFieldBudget(budget) {
  if (!Number.isSafeInteger(budget.maxInstances) || budget.maxInstances < 1 || budget.maxInstances > 1024 || !Number.isSafeInteger(budget.maxFieldBytes) || budget.maxFieldBytes < 1)
    return rayReferenceFailure(
      "retained field requires explicit 1..1024 instance and positive byte budgets",
      true
    );
  return ok10(void 0);
}
function projectSceneFields(slots, worlds, budget, assets, frame) {
  const admittedBudget = validateSceneFieldBudget(budget);
  if (!admittedBudget.ok) return admittedBudget;
  const instances = [], sources = [], deforming = [];
  const fields = /* @__PURE__ */ new Map(), meshes = /* @__PURE__ */ new Map();
  const seenSlots = /* @__PURE__ */ new Set(), seenEntities = /* @__PURE__ */ new Set();
  let fieldBytes = 0;
  for (const slot of [...slots].sort((a, b) => a.slot - b.slot)) {
    const source = slot.snapshot;
    if (source.glyph !== void 0) continue;
    if (source.assetHandle === void 0)
      return rayReferenceFailure("retained field has no Mesh source");
    const geometry = frame?.meshes.get(slot.worldId, source.assetHandle);
    const bindings = geometry === void 0 ? source : effectiveMeshMaterials(source, geometry, meshMaterialGeometry(source));
    if (source.authorVisible === false) continue;
    if (![slot.slot, slot.generation, slot.worldId, slot.entityKey].every(
      (v) => Number.isInteger(v) && v >= 0 && v <= 4294967295
    ) || source.worldId !== slot.worldId || source.entityKey !== slot.entityKey || seenSlots.has(slot.slot) || seenEntities.has(`${slot.worldId}:${slot.entityKey}`))
      return rayReferenceFailure("retained field requires unique, matching scene owner identities");
    seenSlots.add(slot.slot);
    seenEntities.add(`${slot.worldId}:${slot.entityKey}`);
    const scope = worlds[slot.worldId];
    if (scope === void 0)
      return rayReferenceFailure("retained field has no matching resource scope");
    const assetRevision = scope.assetRevision(source.assetHandle);
    const resolved = scope.resolveAsset(source.assetHandle);
    if (assetRevision === void 0 || !resolved.ok || resolved.value.kind !== "mesh")
      return rayReferenceFailure(
        "retained field mesh handle must resolve in its exact resource scope"
      );
    const mesh = resolved.value, field = mesh.distanceField;
    if (source.skin !== void 0 || source.skinPose !== void 0 || source.morph !== void 0 || mesh.morphWeights !== void 0 || mesh.morphTargets !== void 0) {
      deforming.push({ worldId: slot.worldId, entityKey: slot.entityKey, slot: slot.slot });
      continue;
    }
    if (field === void 0)
      return rayReferenceFailure(
        "retained mesh has no admitted distance field; rebuild its producer"
      );
    if (source.spriteInstances !== void 0 || source.pointsLines !== void 0 || slot.pointsLines !== void 0 || (source.lods?.length ?? 0) > 0 || (mesh.lods?.length ?? 0) > 0)
      return rayReferenceFailure(
        "retained fields require base meshes without LOD, sprites or points/lines"
      );
    const count = source.instances?.instanceCount ?? 1;
    if (!Number.isSafeInteger(count) || count < 1 || count > budget.maxInstances - instances.length)
      return rayReferenceFailure(
        "complete retained field roster exceeds its instance budget",
        true
      );
    if (source.instances !== void 0 && (source.instances.transforms.length !== count * 16 || source.instances.generations?.length !== count || new Set(source.instances.generations).size !== count || source.instances.generations.some((v) => v === 0)))
      return rayReferenceFailure(
        "retained instances require complete matrices and unique nonzero owner generations"
      );
    let geometryId = meshes.get(mesh);
    if (geometryId === void 0) {
      const validSource = meshDistanceFieldSource(mesh, {
        sectionSidedness: field.sectionSidedness
      });
      if (!validSource.ok) return rayReferenceFailure(validSource.error.detail.reason);
      geometryId = meshes.size;
      meshes.set(mesh, geometryId);
    }
    let fieldSnapshot = fields.get(field);
    if (fieldSnapshot === void 0) {
      const artifact = field.artifact, codec = artifact?.assetCodec;
      if (artifact?.integrity.algorithm !== "sha256" || !/^sha256:[a-f0-9]{64}$/.test(artifact.integrity.digest) || codec?.name !== MESH_VISIBILITY_DISTANCE_FIELD_CODEC.name || codec.version !== MESH_VISIBILITY_DISTANCE_FIELD_CODEC.version || codec.profile !== MESH_VISIBILITY_DISTANCE_FIELD_CODEC.profile || codec.container !== void 0 || field.policy.kind !== "sampled-visibility")
        return rayReferenceFailure(
          "retained field requires its admitted sampled-visibility artifact Integrity and Codec"
        );
      const valid = validateMeshDistanceField2(field);
      if (!valid.ok) return rayReferenceFailure(valid.error.detail.reason);
      const bytes = field.bricks.byteLength + field.values.byteLength;
      if (bytes > budget.maxFieldBytes - fieldBytes)
        return rayReferenceFailure(
          "complete unique retained field snapshots exceed the byte budget",
          true
        );
      fieldBytes += bytes;
      fieldSnapshot = structuredClone(field);
      fields.set(field, fieldSnapshot);
    }
    const materials = [];
    let first = 0;
    const draws = /* @__PURE__ */ new Map();
    for (const [index, draw] of (source.gpuDrivenDraws ?? []).entries()) {
      const section = gpuDrivenSourceDrawItemIndex(draw, index);
      if (!Number.isInteger(section) || section < 0 || section >= mesh.submeshes.length || draws.has(section))
        return rayReferenceFailure("retained draw has no unique actual mesh section");
      draws.set(section, draw);
    }
    for (const [sectionIndex, section] of mesh.submeshes.entries()) {
      const resource = bindings.materials[section.materialSlot] ?? bindings.material;
      const material = frame?.materials.get(resource)?.snapshot ?? resource.snapshot, handle = material.materialHandle;
      if (!Number.isInteger(section.materialSlot) || section.materialSlot < 0 || material === void 0 || handle === void 0)
        return rayReferenceFailure(
          "every actual mesh section must resolve its effective material slot"
        );
      const shared = handle;
      const payload = scope.resolveAsset(shared);
      if (!payload.ok || payload.value.kind !== "material")
        return rayReferenceFailure(
          "retained field material handle is unavailable in its resource scope"
        );
      const projection = assets.getMaterialProjectionForPayload(payload.value);
      if (!isNativePlacementMaterial(material, projection, payload.value) || material.surfaceModel !== void 0 && material.surfaceModel !== "standard")
        return rayReferenceFailure(
          "retained field requires accepted native Standard material provenance"
        );
      const passes2 = projection?.passes ?? payload.value.passes ?? [];
      const color = passes2.filter(
        (pass) => !/shadow|depth/i.test(
          String(
            pass.renderState?.tags?.LightMode ?? pass.name
          )
        )
      );
      const values = {
        ...Object.fromEntries(
          (payload.value.parameters ?? []).map((parameter) => [
            parameter.name,
            "default" in parameter ? parameter.default : void 0
          ])
        ),
        ...payload.value.values
      };
      const coverage = admitRayMaterialValues(values, String(handle), "retained-mesh-field");
      if (!coverage.ok) return rayReferenceFailure(coverage.error.detail.requirement);
      const scalar = (name, fallback) => values[name] === void 0 ? fallback : typeof values[name] === "number" ? values[name] : NaN;
      const alphaCutoff = scalar("alphaCutoff", 0), displacementScale = scalar("displacementScale", 1), displacementBias = scalar("displacementBias", 0);
      const clipping = values.clippingControl;
      const clipped = (value) => value !== void 0 && (!Array.isArray(value) || value[0] !== 0);
      const actualDisplacement = standardDisplacementRadius([
        {
          ...material,
          standardTextureMask: materialStandardTextureMask(
            payload.value.parameters,
            "forgeax::default-standard-pbr",
            values
          ),
          paramSnapshot: { displacementScale, displacementBias }
        }
      ]);
      if (material.transparent === true || material.renderState?.blend !== void 0 || color.some((pass) => pass.renderState?.blend !== void 0) || standardDisplacementRadius([material]) !== 0 || actualDisplacement !== 0 || clipped(clipping) || clipped(material.paramSnapshot?.clippingControl) || !Number.isFinite(alphaCutoff) || alphaCutoff < 0 || alphaCutoff > 1)
        return rayReferenceFailure(
          "retained field rejects transparent, displaced or locally clipped material coverage"
        );
      const sidedness = field.sectionSidedness[sectionIndex];
      for (const state of [material.renderState, ...color.map((pass) => pass.renderState)]) {
        const cull = state?.cullMode ?? "back";
        if (cull !== "back" && cull !== "none" || Number(cull === "none") !== sidedness)
          return rayReferenceFailure(
            "retained material sidedness differs from its cooked whole-mesh field; recook the producer"
          );
      }
      const draw = draws.get(sectionIndex);
      const offset = mesh.indices === void 0 ? first : section.indexOffset;
      const elements = mesh.indices === void 0 ? section.vertexCount : section.indexCount;
      if (draw !== void 0 && (gpuDrivenSourceDrawItemIndex(draw, sectionIndex) !== sectionIndex || draw.kind !== (mesh.indices === void 0 ? "non-indexed" : "indexed") || draw.topology !== section.topology || draw.materialSlot !== section.materialSlot || draw.first !== offset || draw.count !== elements || draw.baseVertex !== 0 || (draw.lodRanges?.length ?? 0) > 0))
        return rayReferenceFailure(
          "retained draw subset or range disagrees with its actual whole-mesh field"
        );
      first += section.vertexCount;
      const {
        materialShaderId,
        materialProgramKeys,
        materialSurfacePrograms,
        renderState,
        paramSnapshot,
        textureHandles,
        textureCoordinates
      } = material;
      materials.push({
        resource,
        materialSlot: section.materialSlot,
        handle,
        payload: payload.value,
        projection,
        alphaCoverageOmitted: alphaCutoff > 0,
        snapshot: material,
        facts: structuredClone({
          materialShaderId,
          materialProgramKeys,
          materialSurfacePrograms,
          renderState,
          paramSnapshot: {
            ...paramSnapshot,
            alphaCutoff,
            displacementScale,
            displacementBias,
            ...Array.isArray(clipping) ? { clippingControl: clipping } : {}
          },
          textureHandles,
          textureCoordinates
        })
      });
    }
    const root = fieldTransform(source.transform.world);
    if (!root.ok) return root;
    const firstInstance = instances.length;
    for (let ordinal = 0; ordinal < count; ordinal++) {
      const transform = source.instances === void 0 ? root : fieldTransform(
        mat43.multiply(
          mat43.create(),
          root.value,
          source.instances.transforms.subarray(ordinal * 16, (ordinal + 1) * 16)
        )
      );
      if (!transform.ok) return transform;
      instances.push({
        instanceId: instances.length,
        geometryId,
        mask: 255,
        transform: transform.value,
        field: fieldSnapshot
      });
    }
    const {
      transforms: _transforms,
      dirtyRanges: _dirty,
      ...identity
    } = source.instances ?? { transforms: void 0, dirtyRanges: void 0 };
    sources.push({
      worldId: slot.worldId,
      entityKey: slot.entityKey,
      slot: slot.slot,
      generation: slot.generation,
      scope,
      assetHandle: source.assetHandle,
      assetRevision,
      mesh,
      field,
      fieldSnapshot,
      firstInstance,
      instances: source.instances === void 0 ? void 0 : structuredClone(identity),
      materials
    });
  }
  return ok10({ instances, sources, deforming });
}
function isNativePlacementMaterial(material, projection, source) {
  if (projection === void 0) {
    if (source === void 0 || source.parent !== void 0 || material.materialProgramKeys !== void 0 || source.surface !== void 0 && (source.surface.model !== "standard" || source.surface.module !== DEFAULT_STANDARD_SURFACE_MODULE || source.surface.dynamicInput !== void 0))
      return false;
    const color2 = (source.passes ?? []).filter(
      (pass) => !/shadow|depth/i.test(
        String(
          pass.renderState?.tags?.LightMode ?? pass.name
        )
      )
    );
    return color2.length > 0 && material.materialShaderId === "forgeax::default-standard-pbr" && color2.every(
      (pass) => runtimeMaterialShaderId(pass.program.module, pass.name) === material.materialShaderId && (pass.program.moduleSlots?.surface ?? source.surface?.module ?? DEFAULT_STANDARD_SURFACE_MODULE) === DEFAULT_STANDARD_SURFACE_MODULE && pass.renderState?.tags?.SurfaceKind !== "full-custom"
    );
  }
  if (projection === void 0 || projection.surface !== void 0 && (projection.surface.model !== "standard" || projection.surface.dynamicInput !== void 0))
    return false;
  const color = projection.passes.filter((pass) => {
    const tags = pass.renderState?.tags;
    return !/shadow|depth/i.test(String(tags?.LightMode ?? pass.name));
  });
  const first = color[0];
  if (first === void 0 || material.materialShaderId !== (material.materialProgramKeys?.[first.name] ?? runtimeMaterialShaderId(first.module, first.name)))
    return false;
  return color.length > 0 && color.every((pass) => {
    const key = material.materialProgramKeys?.[pass.name];
    const tags = pass.renderState?.tags;
    return runtimeMaterialShaderId(pass.module, pass.name) === "forgeax::default-standard-pbr" && (pass.moduleSlots?.surface ?? projection.surface?.module ?? DEFAULT_STANDARD_SURFACE_MODULE) === DEFAULT_STANDARD_SURFACE_MODULE && tags?.SurfaceKind !== "full-custom" && (key === void 0 ? material.materialShaderId === "forgeax::default-standard-pbr" : pass.programs.some((program) => program.specializationKey === key));
  });
}

// sdk/engine/node_modules/@forgeax/engine-render/src/raytracing/screen-probe-plan.ts
import { ok as ok11 } from "@forgeax/engine-types";
var SCREEN_PROBE_OCT = 8;
var SCREEN_PROBE_TEXELS = SCREEN_PROBE_OCT * SCREEN_PROBE_OCT;
var SCREEN_PROBE_RECORD_BYTES = 32;
var SCREEN_PROBE_RADIANCE_BYTES = 32;
var SCREEN_PROBE_HISTORY_BYTES = SCREEN_PROBE_RECORD_BYTES + SCREEN_PROBE_TEXELS * SCREEN_PROBE_RADIANCE_BYTES;
var SCREEN_PROBE_ADAPTIVE_SLOTS = 4;
var SCREEN_PROBE_FRAME_BYTES = 176;
var SCREEN_PROBE_META_BYTES = 16;
var ScreenProbeRayStatus = {
  /** Screen hit with history radiance, or a world hit/miss with final radiance. */
  resolved: 0,
  /** Screen march found nothing usable; the world trace owns it next. */
  world: 1,
  /** No admissible trace; the irradiance field supplies the direction. */
  fallback: 2,
  /** Culled by importance sampling; the texel is filled from the field. */
  culled: 3,
  /** Required scene geometry is absent; cache reconstruction cannot resolve it. */
  incomplete: 4
};
var SCREEN_PROBE_DEFAULTS = Object.freeze({
  downsample: 16,
  adaptiveFraction: 0.5,
  importance: "brdf",
  screenTrace: Object.freeze({ maxSteps: 32, thickness: 0.02 }),
  filterPasses: 2,
  shortRangeAo: 0.5,
  maxFrames: 10
});
var KEYS = [
  "downsample",
  "adaptiveFraction",
  "importance",
  "screenTrace",
  "filterPasses",
  "shortRangeAo",
  "maxFrames",
  "history"
];
var finite = (value) => typeof value === "number" && Number.isFinite(Math.fround(value));
function validateScreenProbes(probes) {
  if (typeof probes !== "object" || probes === null || Array.isArray(probes))
    return rayReferenceFailure("screen probes require one configuration object");
  const record = probes;
  const extra = Object.keys(record).find((key) => !KEYS.includes(key));
  const history = probes.history;
  const historyValid = history === void 0 || typeof history === "object" && history !== null && !Array.isArray(history) && Object.entries(history).every(
    ([key, value]) => ["probe", "pixel", "screen"].includes(key) && typeof value === "boolean"
  );
  const trace = probes.screenTrace;
  const traceValid = typeof trace === "object" && trace !== null && Object.keys(trace).every((key) => key === "maxSteps" || key === "thickness") && Number.isInteger(probes.screenTrace.maxSteps) && probes.screenTrace.maxSteps >= 0 && probes.screenTrace.maxSteps <= 128 && finite(probes.screenTrace.thickness) && probes.screenTrace.thickness > 0 && probes.screenTrace.thickness <= 1;
  if (extra !== void 0 || ![4, 8, 16, 32].includes(probes.downsample) || !finite(probes.adaptiveFraction) || probes.adaptiveFraction < 0 || probes.adaptiveFraction > 1 || probes.importance !== "uniform" && probes.importance !== "brdf" || !traceValid || !historyValid || !Number.isInteger(probes.filterPasses) || probes.filterPasses < 0 || probes.filterPasses > 4 || !finite(probes.shortRangeAo) || probes.shortRangeAo < 0 || !Number.isInteger(probes.maxFrames) || probes.maxFrames < 1 || probes.maxFrames > 64)
    return rayReferenceFailure(
      `screen probes require downsample 4|8|16|32, adaptiveFraction in [0,1], uniform|brdf importance, 0..128 screen steps with thickness in (0,1], 0..4 filter passes, a nonnegative AO radius and 1..64 history frames with optional boolean probe/pixel/screen history controls${extra === void 0 ? "" : `; unknown key ${extra}`}`
    );
  return ok11(void 0);
}
function planScreenProbeLayout(probes, width, height) {
  const tilesX = Math.ceil(width / probes.downsample);
  const tilesY = Math.ceil(height / probes.downsample);
  const uniformCount = tilesX * tilesY;
  const adaptiveCapacity = Math.min(
    uniformCount * SCREEN_PROBE_ADAPTIVE_SLOTS,
    Math.floor(uniformCount * probes.adaptiveFraction)
  );
  return {
    width,
    height,
    tilesX,
    tilesY,
    uniformCount,
    adaptiveCapacity,
    probeCount: uniformCount + adaptiveCapacity
  };
}
function packScreenProbeFrame(frame) {
  const bytes = new Uint8Array(SCREEN_PROBE_FRAME_BYTES);
  const u = new Uint32Array(bytes.buffer);
  const f = new Float32Array(bytes.buffer);
  const l = frame.layout;
  u.set([l.width, l.height, l.tilesX, l.tilesY], 0);
  u.set([l.uniformCount, l.adaptiveCapacity, frame.downsample, frame.frameIndex >>> 0], 4);
  u.set(
    [
      frame.importance === "brdf" ? 1 : 0,
      frame.screenSteps,
      (frame.sceneHistory ? 1 : 0) | (frame.pixelHistory ? 2 : 0) | (frame.probeHistory ? 4 : 0),
      frame.maxFrames
    ],
    8
  );
  f.set([...frame.environment, frame.maxDistance], 12);
  f.set([frame.thickness, frame.shortRangeAo, frame.worldBias, frame.cardMargin], 16);
  bytes.set(frame.query.subarray(0, 8), 80);
  const previous = frame.reprojection;
  if (previous !== void 0) {
    for (let i = 0; i < 16; i++) f[24 + i] = previous.viewProjection[i] ?? 0;
    f.set([...previous.cameraPosition, 1], 40);
  }
  return bytes;
}

// sdk/engine/node_modules/@forgeax/engine-render/src/raytracing/irradiance-field-plan.ts
var IRRADIANCE_FIELD_OCT = 8;
var IRRADIANCE_FIELD_TEXELS = IRRADIANCE_FIELD_OCT * IRRADIANCE_FIELD_OCT;
var IRRADIANCE_FIELD_MIP_TEXELS = (IRRADIANCE_FIELD_OCT / 2) ** 2;
var IRRADIANCE_FIELD_PROBE_STRIDE = 2 * IRRADIANCE_FIELD_TEXELS + IRRADIANCE_FIELD_MIP_TEXELS;
var IRRADIANCE_FIELD_PROBE_BYTES = IRRADIANCE_FIELD_PROBE_STRIDE * 16;
var IRRADIANCE_FIELD_DEPTH_BYTES = IRRADIANCE_FIELD_TEXELS * 8;
var IRRADIANCE_FIELD_META_BYTES = 16;
var IRRADIANCE_FIELD_MAX_PROBES = 32768;
var IRRADIANCE_FIELD_MAX_LEVELS = 4;
var isObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
var unknownKey = (value, keys) => Object.keys(value).find((key) => !keys.includes(key));
function validateGlobalSdfRegion(region, extraKeys = []) {
  if (!isObject(region))
    return rayReferenceFailure("Global SDF region requires one configuration object");
  const extra = unknownKey(region, [
    "grid",
    "maxInstances",
    "maxFieldBytes",
    "maxSteps",
    "minStepFactor",
    ...extraKeys
  ]);
  if (extra !== void 0)
    return rayReferenceFailure(`Global SDF region contains unsupported field '${extra}'`);
  const grid = normalizeGlobalSdfGrid(region.grid);
  if (!grid.ok) return grid;
  const settings = packGlobalSdfQuerySettings(grid.value, region);
  if (!settings.ok) return settings;
  const budget = validateSceneFieldBudget(region);
  if (!budget.ok) return budget;
  return ok12({ grid: grid.value, settings: settings.value });
}
function validateCardCapture(cards) {
  if (!isObject(cards) || unknownKey(cards, ["resolution", "maxCaptureBytes", "budget"]) !== void 0 || !Number.isInteger(cards.resolution) || cards.resolution < 8 || cards.resolution > 512 || !Number.isSafeInteger(cards.maxCaptureBytes) || cards.maxCaptureBytes < 1 || cards.maxCaptureBytes > 256 * 1024 * 1024)
    return rayReferenceFailure(
      "Native Card capture requires 8..512 resolution and a positive capture budget up to 256 MiB"
    );
  if (!Number.isSafeInteger(cards.budget) || cards.budget < 1)
    return rayReferenceFailure("Native Card capture requires a positive per-frame tile budget");
  return ok12(void 0);
}
function planIrradianceField(field) {
  if (!isObject(field)) return rayReferenceFailure("irradiance field requires one object");
  const extra = unknownKey(field, [
    "region",
    "probeSpacing",
    "raysPerProbe",
    "probeBudget",
    "hysteresis",
    "cards",
    "resolution",
    "radiosity",
    "clipmap"
  ]);
  if (extra !== void 0)
    return rayReferenceFailure(`irradiance field contains unsupported field '${extra}'`);
  const region = validateGlobalSdfRegion(field.region);
  if (!region.ok) return region;
  const cards = validateCardCapture(field.cards);
  if (!cards.ok) return cards;
  if (field.resolution !== "full" && field.resolution !== "half")
    return rayReferenceFailure("irradiance field resolution must be 'full' or 'half'");
  if (typeof field.radiosity !== "boolean")
    return rayReferenceFailure("irradiance field radiosity must be boolean");
  const grid = region.value.grid;
  const spacing = Math.fround(field.probeSpacing);
  if (!Number.isFinite(spacing) || spacing < grid.spacing)
    return rayReferenceFailure(
      "irradiance field probe spacing must be finite and at least the Global SDF spacing"
    );
  if (!Number.isInteger(field.raysPerProbe) || field.raysPerProbe < 16 || field.raysPerProbe > 256)
    return rayReferenceFailure("irradiance field traces 16..256 rays per probe", true);
  if (!Number.isSafeInteger(field.probeBudget) || field.probeBudget < 1)
    return rayReferenceFailure("irradiance field requires a positive per-frame probe budget");
  if (typeof field.hysteresis !== "number" || !(field.hysteresis >= 0 && field.hysteresis < 1))
    return rayReferenceFailure("irradiance field hysteresis must be in [0, 1)");
  const origin = grid.origin.map((v) => Math.fround(v + grid.spacing));
  const clipmap = field.clipmap;
  if (clipmap !== void 0 && (!isObject(clipmap) || unknownKey(clipmap, ["levels", "dimensions"]) !== void 0 || !Number.isInteger(clipmap.levels) || clipmap.levels < 1 || clipmap.levels > IRRADIANCE_FIELD_MAX_LEVELS || !Array.isArray(clipmap.dimensions) || clipmap.dimensions.length !== 3 || clipmap.dimensions.some(
    (n) => !Number.isInteger(n) || Number(n) < 2 || Number(n) > 64
  )))
    return rayReferenceFailure(
      `irradiance field clipmap requires 1..${IRRADIANCE_FIELD_MAX_LEVELS} levels and 2..64 probes per axis`
    );
  const levels = clipmap?.levels ?? 1;
  const dimensions = clipmap === void 0 ? grid.dimensions.map((n) => Math.floor((n - 3) * grid.spacing / spacing + 1e-6) + 1) : [...clipmap.dimensions];
  if (dimensions.some((n) => n < 2))
    return rayReferenceFailure(
      "irradiance field requires at least two probes per axis inside the Global SDF region"
    );
  const probeCount = levels * dimensions[0] * dimensions[1] * dimensions[2];
  if (probeCount > IRRADIANCE_FIELD_MAX_PROBES)
    return rayReferenceFailure(
      `irradiance field allows at most ${IRRADIANCE_FIELD_MAX_PROBES} probes`,
      true
    );
  if (field.probeBudget < levels)
    return rayReferenceFailure("irradiance field probe budget must cover every clipmap level");
  const probeBudget = Math.min(field.probeBudget, probeCount);
  return ok12({
    grid,
    querySettings: region.value.settings,
    origin,
    spacing,
    dimensions,
    levels,
    follow: clipmap !== void 0,
    probeCount,
    raysPerProbe: field.raysPerProbe,
    probeBudget,
    levelBudgets: splitProbeBudget(probeBudget, levels, probeCount / levels),
    hysteresis: field.hysteresis,
    cardResolution: field.cards.resolution,
    cardBudget: field.cards.budget
  });
}
var IRRADIANCE_FIELD_RELIGHT_SWEEPS = Object.freeze([
  0.25,
  0.25,
  0.5,
  0.5
]);
var IRRADIANCE_FIELD_RADIOSITY_PERIOD = 4;
function irradianceFieldRadiosityPeriod(plan) {
  const framesPerSweep = Math.floor(plan.probeCount / Math.max(1, plan.probeBudget));
  return Math.max(1, Math.min(IRRADIANCE_FIELD_RADIOSITY_PERIOD, framesPerSweep));
}
function irradianceFieldRelightHysteresis(plan, probesSinceDirect) {
  const sweep = IRRADIANCE_FIELD_RELIGHT_SWEEPS[Math.floor(probesSinceDirect / plan.probeCount)];
  return sweep === void 0 ? plan.hysteresis : Math.min(plan.hysteresis, sweep);
}
function splitProbeBudget(budget, levels, perLevel) {
  const total = 2 - 2 ** (1 - levels);
  const out = Array.from(
    { length: levels },
    (_, l) => Math.min(perLevel, Math.max(1, Math.floor(budget * 2 ** -l / total)))
  );
  const rest = budget - out.reduce((n, v) => n + v, 0);
  out[0] = Math.max(1, Math.min(perLevel, (out[0] ?? 0) + rest));
  return out;
}
var EXACT_KEYS = [
  "gather",
  "maxBounces",
  "maxDistance",
  "environment",
  "seed",
  "reconstruction",
  "reflections"
];
function validateDiffuseGi(gi) {
  if (!isObject(gi)) return rayReferenceFailure("Diffuse GI requires one configuration object");
  if (gi.gather === "baked")
    return unknownKey(gi, ["gather", "volume", "resolution"]) === void 0 && isValidAssetGuidString(gi.volume) && (gi.resolution === "full" || gi.resolution === "half") ? ok12(void 0) : rayReferenceFailure(
      "Baked GI requires one irradiance-volume asset GUID and resolution 'full' or 'half'"
    );
  const common = Number.isFinite(Math.fround(gi.maxDistance)) && gi.maxDistance > 0 && Array.isArray(gi.environment) && gi.environment.length === 3 && gi.environment.every(
    (v) => typeof v === "number" && Number.isFinite(Math.fround(v)) && v >= 0
  );
  switch (gi.gather) {
    case "exact":
      if (!common || unknownKey(gi, EXACT_KEYS) !== void 0 || !Number.isInteger(gi.maxBounces) || gi.reconstruction !== void 0 && !["spatial", "temporal", "combined"].includes(gi.reconstruction) || gi.maxBounces < 1 || gi.maxBounces > 8 || !Number.isInteger(gi.seed) || gi.seed < 0 || gi.seed > 4294967295)
        return rayReferenceFailure(
          "Diffuse GI requires 1..8 bounces, a positive f32 distance, a u32 seed and nonnegative linear RGB"
        );
      return validateLiteReflections(gi);
    case "irradiance-field": {
      if (!common || unknownKey(gi, ["gather", "maxDistance", "environment", "field", "reflections"]) !== void 0)
        return rayReferenceFailure(
          "Irradiance-field GI requires a positive f32 distance, nonnegative linear RGB and one field"
        );
      const plan = planIrradianceField(gi.field);
      return plan.ok ? validateLiteReflections(gi) : plan;
    }
    case "screen-probe": {
      if (!common || unknownKey(gi, [
        "gather",
        "maxDistance",
        "environment",
        "probes",
        "field",
        "reflections"
      ]) !== void 0)
        return rayReferenceFailure(
          "Screen-probe GI requires a positive f32 distance, nonnegative linear RGB, probes and one fallback field"
        );
      const probes = validateScreenProbes(gi.probes);
      if (!probes.ok) return probes;
      const plan = planIrradianceField(gi.field);
      return plan.ok ? validateLiteReflections(gi) : plan;
    }
    default:
      return rayReferenceFailure(
        "Diffuse GI gather must be 'exact', 'irradiance-field', 'screen-probe' or 'baked'"
      );
  }
}
function freezeDiffuseGi(gi) {
  if (gi.gather === "baked") return Object.freeze({ ...gi });
  const environment = Object.freeze([...gi.environment]);
  const reflections = gi.reflections === void 0 ? {} : { reflections: freezeLiteReflections(gi.reflections) };
  if (gi.gather === "exact") return Object.freeze({ ...gi, environment, ...reflections });
  const { region, cards } = gi.field;
  const field = Object.freeze({
    ...gi.field,
    ...gi.field.clipmap === void 0 ? {} : {
      clipmap: Object.freeze({
        ...gi.field.clipmap,
        dimensions: Object.freeze([...gi.field.clipmap.dimensions])
      })
    },
    cards: Object.freeze({ ...cards }),
    region: Object.freeze({ ...region, grid: freezeGlobalSdfGrid(region.grid) })
  });
  if (gi.gather === "screen-probe")
    return Object.freeze({
      ...gi,
      environment,
      ...reflections,
      field,
      probes: Object.freeze({
        ...gi.probes,
        screenTrace: Object.freeze({ ...gi.probes.screenTrace }),
        ...gi.probes.history === void 0 ? {} : { history: Object.freeze({ ...gi.probes.history }) }
      })
    });
  return Object.freeze({ ...gi, environment, ...reflections, field });
}
function freezeGlobalSdfGrid(grid) {
  return Object.freeze({
    ...grid,
    origin: Object.freeze([...grid.origin]),
    dimensions: Object.freeze([...grid.dimensions])
  });
}

// sdk/engine/node_modules/@forgeax/engine-render/src/raytracing/irradiance-volume.ts
var IRRADIANCE_VOLUME_KIND = "irradiance-volume";
var IRRADIANCE_VOLUME_ARTIFACT = "volume";
var IRRADIANCE_VOLUME_MEDIA_TYPE = "application/x-forgeax-irradiance-volume";
var IRRADIANCE_VOLUME_FORMAT = 1;
var MAGIC = 1447647302;
var HEADER_BYTES = 64;
var EXPECTED = {
  "irradiance-volume-invalid-lattice": [
    `a finite lattice origin, a positive f32 spacing and 1..${IRRADIANCE_FIELD_MAX_PROBES} probes`,
    "derive the lattice from the irradiance-field plan of the baked region"
  ],
  "irradiance-volume-invalid-rays": [
    "one direction, radiance, distance and status per probe ray",
    "pass the traced ray records in probe-major order with matching lengths"
  ],
  "irradiance-volume-corrupt": [
    `a format-${IRRADIANCE_VOLUME_FORMAT} irradiance volume with finite nonnegative probes`,
    "rebake the volume through its NativeCooker; never patch the cooked bytes"
  ]
};
function failure(code, reason) {
  const [expected, hint] = EXPECTED[code];
  return err7({ code, expected, hint, detail: { reason } });
}
var finite322 = (value) => Number.isFinite(value) && Number.isFinite(Math.fround(value));
function validateIrradianceLattice(lattice) {
  const { origin, spacing, dimensions } = lattice;
  if (!Array.isArray(origin) || origin.length !== 3 || !origin.every(finite322) || !finite322(spacing) || !(Math.fround(spacing) > 0) || !Array.isArray(dimensions) || dimensions.length !== 3 || !dimensions.every((n) => Number.isInteger(n) && n >= 1))
    return failure("irradiance-volume-invalid-lattice", "malformed origin, spacing or dimensions");
  const count = dimensions[0] * dimensions[1] * dimensions[2];
  if (count > IRRADIANCE_FIELD_MAX_PROBES)
    return failure("irradiance-volume-invalid-lattice", `${count} probes exceed the field limit`);
  return ok13(count);
}
function irradianceProbePosition(lattice, index) {
  const [dx, dy] = lattice.dimensions;
  const cell = [index % dx, Math.floor(index / dx) % dy, Math.floor(index / (dx * dy))];
  return [
    lattice.origin[0] + cell[0] * lattice.spacing,
    lattice.origin[1] + cell[1] * lattice.spacing,
    lattice.origin[2] + cell[2] * lattice.spacing
  ];
}
function sphericalFibonacci(count) {
  const out = new Float32Array(count * 3);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const z = 1 - (2 * i + 1) / count;
    const r = Math.sqrt(Math.max(0, 1 - z * z));
    const phi = golden * i;
    out.set([r * Math.cos(phi), r * Math.sin(phi), z], i * 3);
  }
  return out;
}
var IRRADIANCE_OCT_DIRECTIONS = (() => {
  const out = new Float32Array(IRRADIANCE_FIELD_TEXELS * 3);
  for (let texel = 0; texel < IRRADIANCE_FIELD_TEXELS; texel++) {
    const x = (texel % IRRADIANCE_FIELD_OCT + 0.5) / IRRADIANCE_FIELD_OCT * 2 - 1;
    const y = (Math.floor(texel / IRRADIANCE_FIELD_OCT) + 0.5) / IRRADIANCE_FIELD_OCT * 2 - 1;
    const z = 1 - Math.abs(x) - Math.abs(y);
    const fold = (a, b) => z < 0 ? (1 - Math.abs(b)) * (a >= 0 ? 1 : -1) : a;
    const v = [fold(x, y), fold(y, x), z];
    const length = Math.hypot(v[0] ?? 0, v[1] ?? 0, v[2] ?? 0);
    out.set(
      v.map((c) => c / length),
      texel * 3
    );
  }
  return out;
})();
function integrateIrradianceProbes(lattice, rays) {
  const counted = validateIrradianceLattice(lattice);
  if (!counted.ok) return counted;
  const probeCount = counted.value;
  const perProbe = rays.directions.length / 3;
  const total = probeCount * perProbe;
  if (!Number.isInteger(perProbe) || perProbe < 1 || rays.radiance.length !== total * 3 || rays.distance.length !== total || rays.status.length !== total)
    return failure(
      "irradiance-volume-invalid-rays",
      `expected ${total} rays for ${probeCount} probes x ${perProbe} directions`
    );
  const clamp = 2 * Math.fround(lattice.spacing);
  const irradiance = new Float32Array(probeCount * IRRADIANCE_FIELD_TEXELS * 4);
  const moments = new Float32Array(probeCount * IRRADIANCE_FIELD_TEXELS * 2);
  const meta = new Uint32Array(probeCount * 4);
  const e = new Float64Array(IRRADIANCE_FIELD_TEXELS * 4);
  const m = new Float64Array(IRRADIANCE_FIELD_TEXELS * 3);
  const dirs = rays.directions;
  const oct = IRRADIANCE_OCT_DIRECTIONS;
  for (let probe = 0; probe < probeCount; probe++) {
    e.fill(0);
    m.fill(0);
    let traced = 0;
    let backfaces = 0;
    for (let r = 0; r < perProbe; r++) {
      const ray = probe * perProbe + r;
      const status = rays.status[ray] ?? 3;
      if (status !== 3) traced++;
      if (status === 2) backfaces++;
      if (status > 1) continue;
      const dx = dirs[r * 3] ?? 0;
      const dy = dirs[r * 3 + 1] ?? 0;
      const dz = dirs[r * 3 + 2] ?? 0;
      const lr = rays.radiance[ray * 3] ?? 0;
      const lg = rays.radiance[ray * 3 + 1] ?? 0;
      const lb = rays.radiance[ray * 3 + 2] ?? 0;
      const hit = rays.distance[ray] ?? -1;
      const d = Math.min(status === 1 && hit >= 0 ? hit : clamp, clamp);
      for (let t = 0; t < IRRADIANCE_FIELD_TEXELS; t++) {
        const c = Math.max(
          (oct[t * 3] ?? 0) * dx + (oct[t * 3 + 1] ?? 0) * dy + (oct[t * 3 + 2] ?? 0) * dz,
          0
        );
        if (c === 0) continue;
        e[t * 4] = (e[t * 4] ?? 0) + lr * c;
        e[t * 4 + 1] = (e[t * 4 + 1] ?? 0) + lg * c;
        e[t * 4 + 2] = (e[t * 4 + 2] ?? 0) + lb * c;
        e[t * 4 + 3] = (e[t * 4 + 3] ?? 0) + c;
        const c2 = c * c;
        const c4 = c2 * c2;
        const c8 = c4 * c4;
        const w = c8 * c8;
        m[t * 3] = (m[t * 3] ?? 0) + d * w;
        m[t * 3 + 1] = (m[t * 3 + 1] ?? 0) + d * d * w;
        m[t * 3 + 2] = (m[t * 3 + 2] ?? 0) + w;
      }
    }
    for (let t = 0; t < IRRADIANCE_FIELD_TEXELS; t++) {
      const weight = e[t * 4 + 3] ?? 0;
      const texel = (probe * IRRADIANCE_FIELD_TEXELS + t) * 4;
      if (weight > 0)
        irradiance.set(
          [(e[t * 4] ?? 0) / weight, (e[t * 4 + 1] ?? 0) / weight, (e[t * 4 + 2] ?? 0) / weight, 1],
          texel
        );
      const mw = m[t * 3 + 2] ?? 0;
      if (mw > 0)
        moments.set(
          [(m[t * 3] ?? 0) / mw, (m[t * 3 + 1] ?? 0) / mw],
          (probe * IRRADIANCE_FIELD_TEXELS + t) * 2
        );
    }
    const valid = traced > 0 && backfaces * 4 <= traced;
    meta.set([traced > 0 ? 1 : 0, valid ? 1 : 0, backfaces, traced], probe * 4);
  }
  return ok13({
    origin: [...lattice.origin],
    spacing: Math.fround(lattice.spacing),
    dimensions: [...lattice.dimensions],
    probeCount,
    irradiance,
    moments,
    meta
  });
}
function irradianceVolumeDigest(bytes) {
  return `sha256:${bytesToHex(sha256(bytes))}`;
}
function sections(probeCount) {
  const irradiance = probeCount * IRRADIANCE_FIELD_TEXELS * 4 * 4;
  const moments = probeCount * IRRADIANCE_FIELD_TEXELS * 2 * 4;
  const meta = probeCount * 16;
  return { irradiance, moments, meta, total: HEADER_BYTES + irradiance + moments + meta };
}
function validateVolumeContent(value) {
  if (value === null || typeof value !== "object")
    return failure("irradiance-volume-corrupt", "volume must be an object");
  const volume = value;
  if (!Array.isArray(volume.origin) || !Array.isArray(volume.dimensions) || !(volume.irradiance instanceof Float32Array) || !(volume.moments instanceof Float32Array) || !(volume.meta instanceof Uint32Array))
    return failure("irradiance-volume-corrupt", "volume requires a lattice and typed probe arrays");
  const counted = validateIrradianceLattice(volume);
  if (!counted.ok) return counted;
  const size = sections(counted.value);
  if (counted.value !== volume.probeCount || volume.irradiance.byteLength !== size.irradiance || volume.moments.byteLength !== size.moments || volume.meta.byteLength !== size.meta)
    return failure("irradiance-volume-corrupt", "probe sections do not match the lattice");
  for (const data of [volume.irradiance, volume.moments])
    for (const sample of data)
      if (!Number.isFinite(sample) || sample < 0)
        return failure(
          "irradiance-volume-corrupt",
          "probe arrays require finite nonnegative values"
        );
  return ok13(volume);
}
function validateIrradianceVolume(value) {
  const valid = validateVolumeContent(value);
  if (!valid.ok) return valid;
  if (typeof value.digest !== "string")
    return failure("irradiance-volume-corrupt", "volume requires its source digest");
  return ok13(value);
}
function encodeIrradianceVolume(volume) {
  const checked = validateVolumeContent(volume);
  if (!checked.ok) return checked;
  const size = sections(volume.probeCount);
  const bytes = new Uint8Array(size.total);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, MAGIC, true);
  view.setUint32(4, IRRADIANCE_VOLUME_FORMAT, true);
  for (const [i, n] of volume.dimensions.entries()) view.setUint32(8 + i * 4, n, true);
  view.setUint32(20, volume.probeCount, true);
  for (const [i, v] of volume.origin.entries()) view.setFloat32(24 + i * 4, v, true);
  view.setFloat32(36, volume.spacing, true);
  let offset = HEADER_BYTES;
  for (const section of [volume.irradiance, volume.moments, volume.meta]) {
    const words = new Uint32Array(section.buffer, section.byteOffset, section.byteLength / 4);
    for (let i = 0; i < words.length; i++) view.setUint32(offset + i * 4, words[i] ?? 0, true);
    offset += section.byteLength;
  }
  return ok13(bytes);
}
function decodeIrradianceVolume(bytes) {
  if (bytes.byteLength < HEADER_BYTES)
    return failure("irradiance-volume-corrupt", "truncated header");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(0, true) !== MAGIC)
    return failure("irradiance-volume-corrupt", "not an irradiance volume");
  const format = view.getUint32(4, true);
  if (format !== IRRADIANCE_VOLUME_FORMAT)
    return failure(
      "irradiance-volume-corrupt",
      `format ${format} is not ${IRRADIANCE_VOLUME_FORMAT}`
    );
  const dimensions = [0, 1, 2].map((i) => view.getUint32(8 + i * 4, true));
  const origin = [0, 1, 2].map((i) => view.getFloat32(24 + i * 4, true));
  const spacing = view.getFloat32(36, true);
  const counted = validateIrradianceLattice({ origin, spacing, dimensions });
  if (!counted.ok) return failure("irradiance-volume-corrupt", counted.error.detail.reason);
  const probeCount = view.getUint32(20, true);
  const size = sections(probeCount);
  if (probeCount !== counted.value || bytes.byteLength !== size.total)
    return failure("irradiance-volume-corrupt", "byte length does not match the lattice");
  const read = (offset, length) => {
    const words = new Uint32Array(length / 4);
    for (let i = 0; i < words.length; i++) words[i] = view.getUint32(offset + i * 4, true);
    return words;
  };
  const irradiance = new Float32Array(read(HEADER_BYTES, size.irradiance).buffer);
  const moments = new Float32Array(read(HEADER_BYTES + size.irradiance, size.moments).buffer);
  const meta = read(HEADER_BYTES + size.irradiance + size.moments, size.meta);
  return validateIrradianceVolume({
    origin,
    spacing,
    dimensions,
    probeCount,
    irradiance,
    moments,
    meta,
    digest: irradianceVolumeDigest(bytes)
  });
}
function irradianceVolumeProbeBlocks(volume) {
  const blocks = new Float32Array(volume.probeCount * IRRADIANCE_FIELD_PROBE_STRIDE * 4);
  const level = IRRADIANCE_FIELD_TEXELS * 4;
  for (let probe = 0; probe < volume.probeCount; probe++)
    blocks.set(
      volume.irradiance.subarray(probe * level, (probe + 1) * level),
      probe * IRRADIANCE_FIELD_PROBE_STRIDE * 4
    );
  return blocks;
}
var irradianceVolumeKind = { kind: IRRADIANCE_VOLUME_KIND };
var irradianceVolumeContribution = {
  kind: irradianceVolumeKind,
  consumer: "Render baked irradiance field",
  decoder: {
    prepare(value) {
      const valid = validateIrradianceVolume(value);
      return valid.ok ? valid : err7(
        new AssetError2({
          code: "asset-invalid-value",
          expected: valid.error.expected,
          hint: valid.error.hint
        })
      );
    },
    async decode({ envelope, artifacts }) {
      const descriptor = envelope.artifacts[IRRADIANCE_VOLUME_ARTIFACT];
      if (descriptor !== void 0) {
        const bytes = await artifacts.read(descriptor);
        if (!bytes.ok) return bytes;
        const decoded = decodeIrradianceVolume(bytes.value);
        if (decoded.ok) return decoded;
        return err7({
          code: "asset-package-invalid",
          expected: decoded.error.expected,
          hint: decoded.error.hint,
          detail: { guid: envelope.guid, reason: decoded.error.detail.reason }
        });
      }
      return err7({
        code: "asset-package-invalid",
        expected: "a cooked irradiance volume artifact",
        hint: "rebake the volume through its NativeCooker",
        detail: { guid: envelope.guid, reason: "missing volume artifact" }
      });
    }
  }
};

// sdk/engine/node_modules/@forgeax/engine-render/src/extract/material-context.ts
function renderMaterialContext(caps, limits, visibleSurface = false) {
  return {
    materialContext: {
      backend: caps.backendKind === "null" ? "webgpu" : caps.backendKind === "wgpu-webgl2" ? "webgl2" : caps.backendKind,
      capability: atmosphereAvailable(caps.storageBuffer, limits?.maxSampledTexturesPerShaderStage) ? "storage-buffer-atmosphere" : caps.storageBuffer ? limits?.maxSampledTexturesPerShaderStage === void 0 || limits.maxSampledTexturesPerShaderStage >= EXTENDED_LIGHTING_REQUIRED_SAMPLED_TEXTURES ? "storage-buffer" : limits.maxSampledTexturesPerShaderStage >= STANDARD_PBR_REQUIRED_SAMPLED_TEXTURES ? "storage-buffer-projector" : "storage-buffer-minimum" : "uniform-fallback",
      pipeline: "forward",
      geometry: "mesh",
      pass: "forward",
      profile: "forgeax-material-wgsl-v1",
      toolchain: "naga-oil",
      instrumentation: "none",
      ...visibleSurface ? { visibleSurface: true } : {}
    }
  };
}

// sdk/engine/node_modules/@forgeax/engine-render/src/terrain/source.ts
import { runtimeAssets as runtimeAssets2 } from "@forgeax/engine-assets-runtime/internal";
import { GlobalTransform, readPresentationWorldMatrix, Transform } from "@forgeax/engine-scene";
import {
  Terrain,
  terrainAxisEndpoint,
  terrainHeightAtlas,
  terrainHeightBounds,
  terrainHeightMipOffset,
  terrainTranslationValid
} from "@forgeax/engine-terrain";
var rootMaterial = MaterialResource.from({ ...defaultMaterialSnapshot(), passes: [] });
function fixedAsset(asset) {
  return {
    columns: asset.columns,
    rows: asset.rows,
    spacing: asset.spacing,
    subsectionVertices: asset.subsectionVertices,
    heightRange: [...asset.heightRange]
  };
}
function fixedSection(world, asset, index) {
  const section = asset.sections[index];
  if (section === void 0 || typeof section.heightTexture !== "number")
    terrainSourceError("terrain-query-unavailable", "section", "an admitted Terrain section");
  const texture = world.resolveAsset(section.heightTexture).unwrap();
  if (texture.kind !== "texture" || texture.format !== "rgba8unorm")
    terrainSourceError("terrain-query-unavailable", "height", "packed f32 height mip bytes");
  const n = asset.subsectionVertices;
  const atlas = terrainHeightAtlas(asset);
  const heights = new Uint8Array(terrainHeightMipOffset(n, n, Math.log2(n) + 1));
  let sourceOffset = 0, targetOffset = 0;
  for (let size = n; size >= 1; size /= 2) {
    const width = atlas.tileColumns * size;
    const x = index % atlas.tileColumns * size;
    const z = Math.floor(index / atlas.tileColumns) * size;
    for (let row = 0; row < size; row++) {
      const offset = sourceOffset + ((z + row) * width + x) * 4;
      heights.set(texture.data.subarray(offset, offset + size * 4), targetOffset + row * size * 4);
    }
    sourceOffset += width * atlas.tileRows * size * 4;
    targetOffset += size * size * 4;
  }
  return { data: { ...section, activeLayers: [...section.activeLayers] }, heights };
}
var TerrainSourceCache = class {
  worlds = /* @__PURE__ */ new WeakMap();
  resolve(world, handle) {
    let roots = this.worlds.get(world);
    const cached = roots?.get(handle);
    if (cached !== void 0) return cached;
    const resolved = world.resolveAsset(handle);
    if (!resolved.ok || resolved.value.kind !== "terrain")
      terrainSourceError("terrain-query-unavailable", "asset", "one admitted TerrainAsset");
    const asset = resolved.value;
    const grids = asset.grids.map((value) => {
      if (typeof value !== "number")
        terrainSourceError("terrain-query-unavailable", "grid", "an admitted Mesh reference");
      return value;
    });
    let sections2;
    for (let index = 0; index < asset.sections.length; index++)
      sections2 = put(sections2, fixedSection(world, asset, index), 0, index, 1);
    const version = renderAssetRevision(world, handle);
    if (version === void 0)
      terrainSourceError(
        "terrain-query-unavailable",
        "version",
        "one admitted Terrain asset version"
      );
    const result = {
      version,
      asset: fixedAsset(asset),
      layers: asset.layers.map(
        (layer) => layer.blend === "height" ? { ...layer, heightRange: [...layer.heightRange] } : { ...layer }
      ),
      activeLayers: [...new Set(asset.sections.flatMap((section) => section.activeLayers))],
      grids,
      sectionCount: asset.sections.length,
      sections: sections2
    };
    if (roots === void 0) {
      roots = /* @__PURE__ */ new Map();
      this.worlds.set(world, roots);
    }
    roots.set(handle, result);
    return result;
  }
  adopt(world, changes) {
    const roots = this.worlds.get(world);
    if (roots === void 0) return;
    for (const change of changes) {
      const before = roots.get(change.handle);
      if (before === void 0) continue;
      if (change.removed || change.ranges.length === 0 || change.ranges.some((range) => range.path.length !== 1 || range.path[0] !== "heights")) {
        roots.delete(change.handle);
        continue;
      }
      const asset = world.resolveAsset(change.handle).unwrap();
      const stride = asset.subsectionVertices - 1;
      const nx = (asset.columns - 1) / stride;
      const nz = (asset.rows - 1) / stride;
      const indices = /* @__PURE__ */ new Set();
      for (const range of change.ranges) {
        const rowBytes = range.rowBytes ?? range.byteLength;
        const byteStride = range.byteStride ?? rowBytes;
        const rowCount = (range.byteLength - rowBytes) / byteStride + 1;
        for (let row = 0; row < rowCount; row++) {
          let start = (range.byteOffset + row * byteStride) / 4;
          let remaining = rowBytes / 4;
          while (remaining > 0) {
            const x = start % asset.columns;
            const z = Math.floor(start / asset.columns);
            const count = Math.min(remaining, asset.columns - x);
            const minX = Math.max(0, Math.ceil(x / stride) - 1);
            const maxX = Math.min(nx - 1, Math.floor((x + count - 1) / stride));
            const minZ = Math.max(0, Math.ceil(z / stride) - 1);
            const maxZ = Math.min(nz - 1, Math.floor(z / stride));
            for (let sz = minZ; sz <= maxZ; sz++)
              for (let sx = minX; sx <= maxX; sx++) indices.add(sz * nx + sx);
            start += count;
            remaining -= count;
          }
        }
      }
      let sections2 = before.sections;
      for (const index of indices)
        sections2 = put(sections2, fixedSection(world, asset, index), 0, index, 1);
      roots.set(change.handle, {
        ...before,
        version: change.revision,
        asset: fixedAsset(asset),
        sections: sections2
      });
    }
  }
  detach(world) {
    this.worlds.delete(world);
  }
  clear() {
    this.worlds = /* @__PURE__ */ new WeakMap();
  }
};
function terrainDrawSection(source, index) {
  const section = at(source.sections, index)?.node.value;
  if (section === void 0)
    terrainSourceError("terrain-query-unavailable", "section", "a fixed prepared Terrain section");
  return section;
}
function terrainSourceError(code, field, expected) {
  throw {
    code,
    expected,
    hint: "repair the terrain source or load its complete closure before rendering",
    detail: { field }
  };
}
function extractTerrainSources(world, _assets, _context, worldId, renderables, _dispatch, selected, visibility, retainHidden = false, hidden) {
  if (world.components.resolve("Terrain") === void 0) return;
  const query = world.query({ read: [Terrain, Transform, GlobalTransform], optional: [Layer, ShadowParticipation] }).unwrap();
  const filter = selected === void 0 ? void 0 : selected;
  for (const row of query) {
    if (filter && !filter.has(row.entity)) continue;
    const authorVisible = visibility?.effective(row.entity) !== "hidden";
    if (!authorVisible) {
      hidden?.add(row.entity);
      if (!retainHidden) continue;
    }
    const terrain = row.get(Terrain), transform = readPresentationWorldMatrix(world, row.entity);
    if (transform === void 0) continue;
    const layer = row.has(Layer) ? row.get(Layer)?.value ?? 0 : 0;
    const shadow = row.has(ShadowParticipation) ? row.get(ShadowParticipation) : void 0;
    const value = runtimeAssets2(world.assets).resolveAsset(terrain.asset);
    if (!value.ok || value.value.kind !== "terrain")
      terrainSourceError("terrain-query-unavailable", "asset", "one loaded TerrainAsset");
    const asset = value.value;
    const matrix = transform;
    if (!terrainTranslationValid(asset, matrix))
      terrainSourceError(
        "terrain-pose-unsupported",
        "Transform",
        "finite GPU world bounds, translation with exact identity rotation and unit scale"
      );
    if (!Number.isFinite(terrain.lod0Diameter) || terrain.lod0Diameter <= 0 || !Number.isFinite(terrain.forcedLod) || terrain.forcedLod > Math.log2(asset.subsectionVertices) - 1)
      terrainSourceError(
        "terrain-input-invalid",
        "LOD",
        "finite positive LOD0 diameter and a forced LOD within resident range"
      );
    const grids = asset.grids.map((value2) => {
      if (typeof value2 !== "number")
        terrainSourceError("terrain-query-unavailable", "grids", "admitted mesh references");
      return value2;
    });
    if (!grids[0])
      terrainSourceError("terrain-input-invalid", "grids", "at least one complete subsection grid");
    const [minHeight, maxHeight] = terrainHeightBounds(...asset.heightRange);
    renderables.push({
      layer,
      ...shadow?.cast === false ? { shadowCaster: false } : {},
      assetHandle: Number(grids[0]),
      transform: { world: new Float32Array(matrix) },
      material: rootMaterial,
      materials: [rootMaterial],
      materialBindingSources: ["mesh-default"],
      worldId,
      entityKey: row.entity,
      ...authorVisible ? {} : { authorVisible: false },
      ...shadow?.receive === false ? { shadowReceiver: false } : {},
      localAabb: new Float32Array([
        0,
        minHeight,
        0,
        terrainAxisEndpoint(
          (asset.columns - asset.subsectionVertices) * asset.spacing,
          (asset.subsectionVertices - 1) * asset.spacing
        ),
        maxHeight,
        terrainAxisEndpoint(
          (asset.rows - asset.subsectionVertices) * asset.spacing,
          (asset.subsectionVertices - 1) * asset.spacing
        )
      ]),
      terrain: {
        handle: terrain.asset,
        lod0Diameter: terrain.lod0Diameter,
        forcedLod: terrain.forcedLod,
        layer
      }
    });
  }
}

// sdk/engine/node_modules/@forgeax/engine-render/src/render-system-extract-tail.ts
import { runtimeAssetRegistry, runtimeAssets as runtimeAssets4 } from "@forgeax/engine-assets-runtime/internal";
import {
  readArrayRangesChangedSince,
  readMutationEpoch,
  SpriteInstancesCountMismatchError,
  SpriteInstancesMutuallyExclusiveWithInstancesError,
  SpriteInstancesRequiresSpriteShaderError
} from "@forgeax/engine-ecs/projection";
import { worldRead } from "@forgeax/engine-ecs/world-read";
import { isFiniteAabb } from "@forgeax/engine-geometry";
import { box3 as box32, frustum as frustum4, mat4 as mat49 } from "@forgeax/engine-math";
import { AssetGuid } from "@forgeax/engine-pack/guid";
import { RhiError as RhiError4 } from "@forgeax/engine-rhi";
import {
  GlobalTransform as GlobalTransform5,
  Mobility,
  MobilityKindValue,
  MorphWeights,
  readPresentationWorldMatrix as readPresentationWorldMatrix5,
  Transform as Transform5
} from "@forgeax/engine-scene";
import {
  JointCountMismatchError,
  JointEntityDanglingError,
  SkeletonResolveFailedError,
  Skin,
  SkinInstancesCoexistForbiddenError
} from "@forgeax/engine-skinning";
import { ASSET_ERROR_HINTS, AssetError as AssetError3, ok as ok14 } from "@forgeax/engine-types";

// sdk/engine/node_modules/@forgeax/engine-render/src/camera-frusta.ts
import { frustum, mat4 as mat44 } from "@forgeax/engine-math";
function buildCameraFrusta(cameras) {
  const planes = [];
  for (const camera of cameras) {
    if (camera.projection === "perspective" && (camera.fov <= 0 || camera.aspect <= 0) || camera.near >= camera.far) {
      planes.push(new Float32Array(0));
      continue;
    }
    const projection = cameraLensProjection(camera);
    const view = mat44.create();
    mat44.invert(view, camera.world);
    const viewProjection = mat44.create();
    mat44.multiply(viewProjection, projection, view);
    const cameraPlanes = frustum.create();
    frustum.fromViewProjection(cameraPlanes, viewProjection);
    planes.push(cameraPlanes);
  }
  return planes;
}

// sdk/engine/node_modules/@forgeax/engine-render/src/extract/world-environment.ts
import { runtimeAssets as runtimeAssets3 } from "@forgeax/engine-assets-runtime/internal";
import { routeWorldError, SpawnLightInvalidBoundsError } from "@forgeax/engine-ecs/projection";
import { mat4 as mat45, vec3 } from "@forgeax/engine-math";
import { RhiError as RhiError3 } from "@forgeax/engine-rhi";
import { GlobalTransform as GlobalTransform2, readPresentationWorldMatrix as readPresentationWorldMatrix2, Transform as Transform2 } from "@forgeax/engine-scene";

// sdk/engine/node_modules/@forgeax/engine-render/src/prepare/extended-lighting/spot-modifiers.ts
import { halfFloat } from "@forgeax/engine-math";
import {
  deriveTextureLayout,
  isCompressedFormat,
  srgbChannelToLinear
} from "@forgeax/engine-types";
var COOKIE_PROJECTION_CACHE = /* @__PURE__ */ new WeakMap();
function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}
function unorm8Decoder(srgb, bgra) {
  const toLinear = (value) => srgb ? srgbChannelToLinear(value / 255) : value / 255;
  return {
    bytesPerTexel: 4,
    colorSpace: srgb ? "srgb" : "linear",
    read(bytes, _view, index, out, at2) {
      const base = index * 4;
      out[at2] = toLinear(bytes[base + (bgra ? 2 : 0)] ?? 0);
      out[at2 + 1] = toLinear(bytes[base + 1] ?? 0);
      out[at2 + 2] = toLinear(bytes[base + (bgra ? 0 : 2)] ?? 0);
      out[at2 + 3] = (bytes[base + 3] ?? 0) / 255;
    }
  };
}
function floatDecoder(bytesPerChannel) {
  return {
    bytesPerTexel: bytesPerChannel * 4,
    colorSpace: "linear",
    read(_bytes, view, index, out, at2) {
      for (let channel = 0; channel < 4; channel += 1) {
        const offset = (index * 4 + channel) * bytesPerChannel;
        const value = bytesPerChannel === 2 ? halfFloat.f16ToF32(view.getUint16(offset, true)) : view.getFloat32(offset, true);
        out[at2 + channel] = Number.isFinite(value) ? clamp01(value) : 0;
      }
    }
  };
}
var R8_DECODER = {
  bytesPerTexel: 1,
  colorSpace: "linear",
  read(bytes, _view, index, out, at2) {
    const value = (bytes[index] ?? 0) / 255;
    out[at2] = value;
    out[at2 + 1] = value;
    out[at2 + 2] = value;
    out[at2 + 3] = 1;
  }
};
function sourceDecoder(format) {
  switch (format) {
    case "rgba8unorm":
      return unorm8Decoder(false, false);
    case "rgba8unorm-srgb":
      return unorm8Decoder(true, false);
    case "bgra8unorm":
      return unorm8Decoder(false, true);
    case "bgra8unorm-srgb":
      return unorm8Decoder(true, true);
    case "r8unorm":
      return R8_DECODER;
    case "rgba16float":
      return floatDecoder(2);
    case "rgba32float":
      return floatDecoder(4);
    default:
      return void 0;
  }
}
function decodeSource(asset, decoder) {
  const { width, height } = asset.shape.extent;
  const linear = new Float32Array(width * height * 4);
  const view = new DataView(asset.data.buffer, asset.data.byteOffset, asset.data.byteLength);
  for (let index = 0; index < width * height; index += 1) {
    decoder.read(asset.data, view, index, linear, index * 4);
  }
  return linear;
}
function resampleAxis(source, sourceLength, lineCount, horizontal) {
  const target = new Float32Array(COOKIE_SLICE_SIZE * lineCount * 4);
  const read = (line, index, channel) => source[(horizontal ? line * sourceLength + index : index * lineCount + line) * 4 + channel] ?? 0;
  const write = (line, index, channel, value) => {
    target[(horizontal ? line * COOKIE_SLICE_SIZE + index : index * lineCount + line) * 4 + channel] = value;
  };
  const scale = sourceLength / COOKIE_SLICE_SIZE;
  for (let line = 0; line < lineCount; line += 1) {
    for (let index = 0; index < COOKIE_SLICE_SIZE; index += 1) {
      for (let channel = 0; channel < 4; channel += 1) {
        if (scale < 1) {
          const position = clamp01((index + 0.5) / COOKIE_SLICE_SIZE) * (sourceLength - 1);
          const i0 = Math.floor(position);
          const i1 = Math.min(sourceLength - 1, i0 + 1);
          const t = position - i0;
          write(
            line,
            index,
            channel,
            read(line, i0, channel) * (1 - t) + read(line, i1, channel) * t
          );
          continue;
        }
        const begin = index * scale;
        const end = begin + scale;
        let sum = 0;
        for (let texel = Math.floor(begin); texel < Math.ceil(end); texel += 1) {
          const coverage = Math.min(end, texel + 1) - Math.max(begin, texel);
          sum += read(line, texel, channel) * coverage;
        }
        write(line, index, channel, sum / scale);
      }
    }
  }
  return target;
}
function buildMipChain(level0) {
  const data = new Uint8Array(COOKIE_SLICE_MIP_CHAIN_BYTES);
  let current = level0;
  let size = COOKIE_SLICE_SIZE;
  let offset = 0;
  for (let level = 0; level < COOKIE_MIP_LEVEL_COUNT; level += 1) {
    for (let index = 0; index < size * size * 4; index += 1) {
      data[offset + index] = Math.round(clamp01(current[index] ?? 0) * 255);
    }
    offset += size * size * 4;
    if (size === 1) break;
    const next = size >> 1;
    const reduced = new Float32Array(next * next * 4);
    for (let y = 0; y < next; y += 1) {
      for (let x = 0; x < next; x += 1) {
        for (let channel = 0; channel < 4; channel += 1) {
          const at2 = (sx, sy) => current[(sy * size + sx) * 4 + channel] ?? 0;
          reduced[(y * next + x) * 4 + channel] = (at2(2 * x, 2 * y) + at2(2 * x + 1, 2 * y) + at2(2 * x, 2 * y + 1) + at2(2 * x + 1, 2 * y + 1)) * 0.25;
        }
      }
    }
    current = reduced;
    size = next;
  }
  return data;
}
function prepareCookieProjection(asset) {
  if (COOKIE_PROJECTION_CACHE.has(asset)) {
    return COOKIE_PROJECTION_CACHE.get(asset) ?? void 0;
  }
  const decoder = sourceDecoder(asset.format);
  const { width, height } = asset.shape.extent;
  const valid = decoder !== void 0 && asset.shape.viewDimension === "2d" && asset.colorSpace === decoder.colorSpace && Number.isSafeInteger(width) && Number.isSafeInteger(height) && width > 0 && height > 0 && asset.data.byteLength >= width * height * decoder.bytesPerTexel;
  const compressed = decoder === void 0 && isCompressedFormat(asset.format) && asset.shape.viewDimension === "2d" && asset.mips.kind !== "generate" && asset.colorSpace === (asset.format.endsWith("-srgb") ? "srgb" : "linear") && deriveTextureLayout({
    shape: asset.shape,
    format: asset.format,
    mips: asset.mips,
    actualByteLength: asset.data.byteLength
  }).ok;
  if (!valid && !compressed) {
    COOKIE_PROJECTION_CACHE.set(asset, null);
    return void 0;
  }
  const source = decoder === void 0 ? { kind: "gpu-resample", asset } : {
    kind: "mip-chain",
    data: buildMipChain(
      resampleAxis(
        resampleAxis(decodeSource(asset, decoder), width, height, true),
        height,
        COOKIE_SLICE_SIZE,
        false
      )
    )
  };
  const matrix = new Float32Array(16);
  matrix[0] = asset.shape.extent.height / asset.shape.extent.width;
  matrix[5] = 1;
  matrix[10] = 1;
  matrix[15] = 1;
  const projection = {
    source,
    matrix,
    aspect: asset.shape.extent.width / asset.shape.extent.height
  };
  COOKIE_PROJECTION_CACHE.set(asset, projection);
  return projection;
}
function createCookieProjectionMatrixData(count) {
  const data = new Float32Array(count * 16);
  for (let index = 0; index < count; index += 1) {
    const base = index * 16;
    data[base] = 1;
    data[base + 5] = 1;
    data[base + 10] = 1;
    data[base + 15] = 1;
  }
  return data;
}

// sdk/engine/node_modules/@forgeax/engine-render/src/extract/world-environment.ts
function extractWorldEnvironment(world, context, worldInternal, fog) {
  const { assets } = context;
  const directionalLightQuery = world.query({ read: [DirectionalLight] }).unwrap();
  let volumetricFog = extractVolumeSnapshot(world, assets, worldInternal);
  let cloudLayer;
  const extractedCloudLayer = extractCloudLayer(world);
  if (extractedCloudLayer.ok) {
    cloudLayer = extractedCloudLayer.value;
  } else {
    worldInternal._routeError(extractedCloudLayer.error, {
      severity: Severity.Error,
      systemName: "RenderSystem.extract (cloud-layer)"
    });
  }
  const cameraRoles = selectCameraRoles(world, context.cameraEntityKey, context.viewExtent);
  const cameras = [...cameraRoles.display];
  const auxiliaryCameras = cameraRoles.auxiliary;
  const cubeCameras = collectCubeCameraSnapshots(world);
  const reflectionProbes = collectReflectionProbeFacts(world);
  let directional;
  let directionalCount = 0;
  let firstHitCastShadow;
  let firstHitShadowFields;
  for (const row of directionalLightQuery) {
    const l = row.get(DirectionalLight);
    const channelsError = validateChannelMask(l.lightingChannels) ?? validateChannelMask(l.shadowCasterChannels, "shadowCasterChannels");
    if (channelsError !== null) {
      worldInternal._routeError(channelsError, {
        severity: Severity.Error,
        systemName: "RenderSystem.extract (lighting-channels)"
      });
      continue;
    }
    directionalCount += 1;
    const intensity = l.intensity;
    const snapshot = {
      kind: "directional",
      lightingChannels: l.lightingChannels,
      entity: row.entity,
      direction: vec3.create(l.direction[0] ?? 0, l.direction[1] ?? -1, l.direction[2] ?? 0),
      color: vec3.create(
        (l.color[0] ?? 1) * intensity,
        (l.color[1] ?? 1) * intensity,
        (l.color[2] ?? 1) * intensity
      ),
      intensity,
      contactShadowLength: l.contactShadowLength
    };
    if (directional === void 0) {
      directional = snapshot;
      firstHitCastShadow = l.castShadow;
      firstHitShadowFields = {
        cascadeCount: l.cascadeCount,
        splitLambda: l.splitLambda,
        cascadeBlend: l.cascadeBlend,
        mapSize: l.mapSize,
        depthBias: l.depthBias,
        normalBias: l.normalBias,
        shadowDistance: l.shadowDistance,
        shadowFilter: l.shadowFilter,
        shadowAngularRadius: l.shadowAngularRadius,
        maxPenumbraTexels: l.maxPenumbraTexels,
        shadowMapAspect: l.shadowMapAspect,
        shadowCasterChannels: l.shadowCasterChannels,
        shadowAutoUpdate: l.shadowAutoUpdate,
        shadowRevision: l.shadowRevision,
        staggerCascades: l.staggerCascades,
        staticShadowCache: l.staticShadowCache,
        shadowProjection: l.shadowProjection,
        shadowViewProjection: new Float32Array(l.shadowViewProjection),
        shadowBiasMode: l.shadowBiasMode,
        shadowRadius: l.shadowRadius,
        shadowIntensity: l.shadowIntensity,
        shadowBlurSamples: l.shadowBlurSamples
      };
    }
  }
  let directionalShadowError;
  if (directional !== void 0 && firstHitShadowFields !== void 0) {
    const validation = validateDirectionalLightData({
      direction: directional.direction,
      contactShadowLength: directional.contactShadowLength,
      castShadow: firstHitCastShadow,
      ...firstHitShadowFields
    });
    if (!validation.ok) {
      directionalShadowError = validation.error;
      worldInternal._routeError(directionalShadowError, {
        severity: Severity.Error,
        systemName: "RenderSystem.extract (directional-shadow)"
      });
    }
  }
  const iesProfiles = /* @__PURE__ */ new Map();
  const iesProfile = (handle, entity) => {
    if (handle === void 0 || Number(handle) === 0) return {};
    const key = Number(handle);
    const cached = iesProfiles.get(key);
    if (cached !== void 0) return cached;
    const resolved = runtimeAssets3(world.assets).resolveAsset(handle);
    let result = { iesProfileHandle: key };
    if (resolved.ok && resolved.value.kind === "ies-profile" && resolved.value.data.byteLength === IES_SLICE_WIDTH * IES_SLICE_HEIGHT * 2) {
      result = {
        iesProfileHandle: key,
        // Cooked assets are immutable. Preserve payload identity so the upload
        // cache hashes once; publication clones metadata without transferring it.
        iesProfileData: resolved.value.data
      };
    } else {
      worldInternal._routeError(
        !resolved.ok ? resolved.error : createLightResourceUnavailable({
          entity,
          feature: "ies",
          generation: 0,
          sourceKey: String(key),
          reason: "format",
          expected: "a cooked 256 \xD7 128 r16float IesProfileAsset",
          actual: "invalid profile payload",
          hint: "recook the IES profile; the unresolved modifier is identity"
        }),
        { severity: Severity.Error, systemName: "RenderSystem.extract (ies-profile)" }
      );
    }
    iesProfiles.set(key, result);
    return result;
  };
  const pointSnapshots = [];
  const pointSnapshotEntities = [];
  const pointLightQuery = world.query({
    read: [PointLight],
    optional: [Transform2, GlobalTransform2]
  }).unwrap();
  for (const row of pointLightQuery) {
    const p = row.get(PointLight);
    const decayError = validatePointLightDecay(p.decay);
    if (decayError !== null) {
      worldInternal._routeError(decayError, {
        severity: Severity.Error,
        systemName: "RenderSystem.extract (point-light-decay)"
      });
      continue;
    }
    const channelsError = validateChannelMask(p.lightingChannels);
    if (channelsError !== null) {
      worldInternal._routeError(channelsError, {
        severity: Severity.Error,
        systemName: "RenderSystem.extract (lighting-channels)"
      });
      continue;
    }
    const hasTransform = row.get(GlobalTransform2) !== void 0;
    const intensity = p.intensity;
    const range = p.range;
    const entityId = row.entity;
    let worldMat;
    if (hasTransform) {
      const view = readPresentationWorldMatrix2(world, entityId);
      if (view !== void 0) worldMat = new Float32Array(view);
    }
    const position = worldMat !== void 0 ? mat45.getTranslation(vec3.create(), worldMat) : vec3.create(0, 0, 0);
    pointSnapshots.push({
      kind: "point",
      decay: Math.fround(p.decay),
      lightingChannels: p.lightingChannels,
      entity: entityId,
      worldId: context.worldId,
      position,
      color: vec3.create(
        (p.color[0] ?? 1) * intensity,
        (p.color[1] ?? 1) * intensity,
        (p.color[2] ?? 1) * intensity
      ),
      intensity,
      invRangeSquared: computeInvRangeSquared(range),
      ...iesProfile(p.iesProfile, entityId),
      ...Number(p.iesProfile) > 0 ? {
        axisX: vec3.normalize(
          vec3.create(),
          vec3.create(worldMat?.[0] ?? 1, worldMat?.[1] ?? 0, worldMat?.[2] ?? 0)
        ),
        axisY: vec3.normalize(
          vec3.create(),
          vec3.create(worldMat?.[4] ?? 0, worldMat?.[5] ?? 1, worldMat?.[6] ?? 0)
        )
      } : {}
    });
    pointSnapshotEntities.push(entityId);
  }
  const spotSnapshots = [];
  const spotLightQuery = world.query({
    read: [SpotLight],
    optional: [Transform2, GlobalTransform2]
  }).unwrap();
  let spotTileNext = 0;
  const lightTextureSlices = /* @__PURE__ */ new Map();
  const lightTextureSlice = (handle, source) => {
    if (handle === void 0 || handle <= 0) return void 0;
    const existing = lightTextureSlices.get(handle);
    if (existing !== void 0 || source === void 0) return existing;
    if (lightTextureSlices.size >= COOKIE_SLICE_CAPACITY) return void 0;
    const slice = lightTextureSlices.size;
    lightTextureSlices.set(handle, slice);
    return slice;
  };
  for (const row of spotLightQuery) {
    const s = row.get(SpotLight);
    const channelsError = validateChannelMask(s.lightingChannels) ?? validateChannelMask(s.shadowCasterChannels, "shadowCasterChannels");
    if (channelsError !== null) {
      worldInternal._routeError(channelsError, {
        severity: Severity.Error,
        systemName: "RenderSystem.extract (lighting-channels)"
      });
      continue;
    }
    const hasTransform = row.get(GlobalTransform2) !== void 0;
    const intensity = s.intensity;
    const range = s.range;
    const innerConeDeg = s.innerConeDeg;
    const outerConeDeg = s.outerConeDeg;
    let worldMat;
    if (hasTransform) {
      const entity = row.entity;
      const view = readPresentationWorldMatrix2(world, entity);
      if (view !== void 0) worldMat = new Float32Array(view);
    }
    const position = worldMat !== void 0 ? mat45.getTranslation(vec3.create(), worldMat) : vec3.create(0, 0, 0);
    const dir = vec3.create(s.direction[0] ?? 0, s.direction[1] ?? -1, s.direction[2] ?? 0);
    const dirLen = Math.sqrt(
      (dir[0] ?? 0) * (dir[0] ?? 0) + (dir[1] ?? 0) * (dir[1] ?? 0) + (dir[2] ?? 0) * (dir[2] ?? 0)
    );
    const EPSILON = 1e-6;
    const hasValidDirection = dirLen > EPSILON;
    if (!hasValidDirection) {
      worldInternal._routeError(
        new SpawnLightInvalidBoundsError("SpotLight", "direction", [
          dir[0] ?? 0,
          dir[1] ?? 0,
          dir[2] ?? 0
        ]),
        {
          severity: Severity.Error,
          systemName: "RenderSystem.extract (spot-direction)"
        }
      );
    }
    const dirN = vec3.create(
      hasValidDirection ? (dir[0] ?? 0) / dirLen : dir[0] ?? 0,
      hasValidDirection ? (dir[1] ?? 0) / dirLen : dir[1] ?? 0,
      hasValidDirection ? (dir[2] ?? 0) / dirLen : dir[2] ?? 0
    );
    const castShadow = s.castShadow;
    const sMapSize = s.mapSize;
    const sNearPlane = s.nearPlane;
    const shadowProjection = resolvePunctualShadowFarPlane(s.range, sNearPlane, s.farPlane);
    const sFarPlane = shadowProjection.ok ? shadowProjection.value : s.farPlane;
    const cookieHandle = Number(s.cookie) > 0 ? Number(s.cookie) : void 0;
    const cookieAsset = cookieHandle === void 0 ? void 0 : runtimeAssets3(world.assets).resolveAsset(cookieHandle);
    const hasProjector = Number(s.projector) > 0;
    let projectorHandle;
    let projectorAsset;
    let projectorGuid;
    if (hasProjector) {
      const candidate = Math.round(Number(s.projector));
      const resolvedProjector = runtimeAssets3(world.assets).resolveAsset(candidate);
      if (!resolvedProjector.ok || resolvedProjector.value.kind !== "texture") {
        worldInternal._routeError(
          resolvedProjector.ok ? new RhiError3({
            code: "asset-not-registered",
            expected: "SpotLight.projector resolves to a TextureAsset",
            hint: "load the authored projector TextureAsset before assigning SpotLight.projector",
            detail: { assetHandle: Number(candidate) }
          }) : resolvedProjector.error,
          { severity: Severity.Error, systemName: "RenderSystem.extract (spot-projector)" }
        );
      } else {
        projectorHandle = candidate;
        projectorAsset = resolvedProjector.value;
        projectorGuid = assets?.guidOf(candidate) ?? `handle:${Number(candidate)}`;
      }
    }
    const cookieProjection = cookieAsset?.ok && cookieAsset.value.kind === "texture" ? prepareCookieProjection(cookieAsset.value) : void 0;
    const cookieSource = cookieProjection?.source;
    const projectorProjection = projectorAsset === void 0 ? void 0 : prepareCookieProjection(projectorAsset);
    const projectorSource = projectorProjection?.source;
    const cookieSlice = lightTextureSlice(cookieHandle, cookieSource);
    const projectorSlice = lightTextureSlice(
      projectorHandle === void 0 ? void 0 : Number(projectorHandle),
      projectorSource
    );
    const shadowIntensity = s.shadowIntensity;
    let lightViewProj2;
    let shadowAtlasTile = -1;
    if ((castShadow || hasProjector) && !shadowProjection.ok) {
      worldInternal._routeError(shadowProjection.error, {
        severity: Severity.Error,
        systemName: "RenderSystem.extract (spot-shadow-projection)"
      });
    }
    if ((castShadow || hasProjector) && hasValidDirection && shadowProjection.ok) {
      const target = vec3.create(
        (position[0] ?? 0) + (dirN[0] ?? 0),
        (position[1] ?? 0) + (dirN[1] ?? 0),
        (position[2] ?? 0) + (dirN[2] ?? 0)
      );
      const fov = outerConeDeg * 2 * (Math.PI / 180);
      const proj = mat45.create();
      mat45.perspectiveReverseZ(proj, fov, 1, sNearPlane, sFarPlane);
      const view = mat45.create();
      mat45.lookAt(view, position, target, vec3.create(0, 1, 0));
      lightViewProj2 = new Float32Array(16);
      mat45.multiply(lightViewProj2, proj, view);
      if (castShadow && spotTileNext < 4) {
        shadowAtlasTile = spotTileNext;
        spotTileNext += 1;
      }
    }
    spotSnapshots.push({
      kind: "spot",
      lightingChannels: s.lightingChannels,
      entity: row.entity,
      worldId: context.worldId,
      // D-6: position reflects world transform; direction stays sourced
      // from SpotLight.direction (NOT rotated by the parent).
      position,
      direction: dirN,
      color: vec3.create(
        (s.color[0] ?? 1) * intensity,
        (s.color[1] ?? 1) * intensity,
        (s.color[2] ?? 1) * intensity
      ),
      intensity,
      invRangeSquared: computeInvRangeSquared(range),
      cosInner: degToCos(innerConeDeg),
      cosOuter: degToCos(outerConeDeg),
      ...iesProfile(s.iesProfile, row.entity),
      ...cookieHandle === void 0 ? {} : {
        cookieHandle,
        ...cookieSlice === void 0 ? {} : { cookieSlice }
      },
      ...cookieSource === void 0 ? {} : { cookieSource },
      ...cookieProjection === void 0 ? {} : { cookieMatrix: cookieProjection.matrix },
      ...projectorSlice === void 0 ? {} : { projectorSlice },
      ...projectorSource === void 0 ? {} : { projectorSource },
      ...projectorProjection === void 0 ? {} : { projectorMatrix: projectorProjection.matrix },
      rollDeg: s.rollDeg,
      // ── shadow fields ──
      castShadow,
      lightViewProj: s.shadowProjection === 1 ? new Float32Array(s.shadowViewProjection) : lightViewProj2,
      mapSize: sMapSize,
      nearPlane: sNearPlane,
      farPlane: sFarPlane,
      shadowAtlasTile,
      shadowIntensity,
      shadowBlurSamples: s.shadowBlurSamples,
      depthBias: s.depthBias,
      normalBias: s.normalBias,
      shadowMapAspect: s.shadowMapAspect,
      shadowCasterChannels: s.shadowCasterChannels,
      shadowAutoUpdate: s.shadowAutoUpdate,
      shadowRevision: s.shadowRevision,
      pcfKernelSize: s.pcfKernelSize,
      shadowFilter: s.shadowFilter,
      shadowBiasMode: s.shadowBiasMode,
      ...projectorHandle === void 0 || projectorAsset === void 0 || projectorGuid === void 0 ? {} : {
        projectorHandle,
        projectorAsset,
        projectorGuid,
        projectorGeneration: 1,
        projectorRevision: 1
      }
    });
  }
  const rectSnapshots = [];
  const rectLightQuery = world.query({
    read: [RectAreaLight],
    optional: [Transform2, GlobalTransform2]
  }).unwrap();
  for (const row of rectLightQuery) {
    const light = row.get(RectAreaLight);
    const channelsError = validateChannelMask(light.lightingChannels);
    if (channelsError !== null) {
      worldInternal._routeError(channelsError, {
        severity: Severity.Error,
        systemName: "RenderSystem.extract (lighting-channels)"
      });
      continue;
    }
    const validation = validateRectAreaLightData({
      intensity: light.intensity,
      color: light.color,
      width: light.width,
      height: light.height,
      range: light.range
    });
    if (!validation.ok) {
      worldInternal._routeError(validation.error, {
        severity: Severity.Error,
        systemName: "RenderSystem.extract (rect-area-light)"
      });
      continue;
    }
    const worldView = row.get(GlobalTransform2);
    const worldMat = worldView === void 0 ? void 0 : new Float32Array(readPresentationWorldMatrix2(world, row.entity) ?? []);
    const position = worldMat !== void 0 ? mat45.getTranslation(vec3.create(), worldMat) : vec3.create(0, 0, 0);
    const frame = buildRectAreaWorldFrame({
      center: position,
      axisX: [worldMat?.[0] ?? 1, worldMat?.[1] ?? 0, worldMat?.[2] ?? 0],
      axisY: [worldMat?.[4] ?? 0, worldMat?.[5] ?? 1, worldMat?.[6] ?? 0],
      width: light.width,
      height: light.height
    });
    let sourceTextureHandle;
    let sourceTextureSlice;
    let sourceTextureSource;
    if (light.sourceTexture !== void 0 && Number(light.sourceTexture) > 0) {
      const resolved = runtimeAssets3(world.assets).resolveAsset(light.sourceTexture);
      const projection = resolved.ok && resolved.value.kind === "texture" ? prepareCookieProjection(resolved.value) : void 0;
      if (projection === void 0) {
        worldInternal._routeError(
          resolved.ok ? new RhiError3({
            code: "asset-not-registered",
            expected: "RectAreaLight.sourceTexture resolves to a 2D TextureAsset: uncompressed rgba8unorm[-srgb], bgra8unorm[-srgb], r8unorm, rgba16float, rgba32float, or a BC/ETC2/ASTC block format whose colorSpace matches its -srgb suffix",
            hint: "assign a 2D image texture (not a cube, array or 3D texture) whose colorSpace matches its format before assigning RectAreaLight.sourceTexture; the light renders untextured until then",
            detail: { assetHandle: Number(light.sourceTexture) }
          }) : resolved.error,
          { severity: Severity.Error, systemName: "RenderSystem.extract (rect-source-texture)" }
        );
      }
      sourceTextureHandle = Number(light.sourceTexture);
      sourceTextureSource = projection?.source;
      sourceTextureSlice = lightTextureSlice(sourceTextureHandle, sourceTextureSource);
    }
    rectSnapshots.push({
      kind: "rect-area",
      lightingChannels: light.lightingChannels,
      position,
      color: vec3.create(
        (light.color[0] ?? 1) * light.intensity,
        (light.color[1] ?? 1) * light.intensity,
        (light.color[2] ?? 1) * light.intensity
      ),
      intensity: light.intensity,
      invRangeSquared: computeInvRangeSquared(light.range),
      halfWidth: frame.halfWidth,
      halfHeight: frame.halfHeight,
      axisX: frame.axisX,
      axisY: frame.axisY,
      ...iesProfile(light.iesProfile, row.entity),
      ...sourceTextureHandle === void 0 ? {} : { sourceTextureHandle },
      ...sourceTextureSlice === void 0 || sourceTextureSource === void 0 ? {} : { cookieSlice: sourceTextureSlice, cookieSource: sourceTextureSource }
    });
  }
  let volumeSpot;
  const extractedFog = volumetricFog;
  if (extractedFog !== void 0) {
    if (extractedFog.spotLightEntity !== void 0) {
      volumeSpot = spotSnapshots.find((light) => light.entity === extractedFog.spotLightEntity);
    } else if (extractedFog.lightKind === "spot") {
      volumeSpot = spotSnapshots.find((light) => light.entity === extractedFog.lightEntity);
    }
  }
  if (volumetricFog !== void 0 && volumetricFog.status === "available" && volumeSpot?.projectorAsset !== void 0 && volumeSpot.projectorHandle !== void 0) {
    const projectorHandle = volumeSpot.projectorHandle;
    const projectorAsset = volumeSpot.projectorAsset;
    volumetricFog = {
      ...volumetricFog,
      projector: {
        guid: volumeSpot.projectorGuid ?? `handle:${Number(volumeSpot.projectorHandle)}`,
        generation: volumeSpot.projectorGeneration ?? 1,
        view: "2d",
        sampler: "linear-clamp-to-edge",
        projection: "spot-projection",
        revision: volumeSpot.projectorRevision ?? 1
      },
      projectorHandle,
      projectorAsset
    };
  }
  let lightViewProj;
  let splitPlanes;
  let cascadeCount;
  let cascadeBlend;
  let shadowMapSize;
  let directionalShadowQuality;
  let directionalCsmConfig;
  let directionalCsmDirection;
  const cameraData = cameras[0];
  if (directional !== void 0 && firstHitCastShadow === true && directionalShadowError === void 0) {
    const dirSnapshot = directional;
    const sf = firstHitShadowFields;
    if (sf !== void 0) {
      directionalCsmConfig = {
        ...sf.shadowProjection === 1 ? { shadowViewProjection: sf.shadowViewProjection } : {},
        shadowMapAspect: sf.shadowMapAspect,
        shadowCasterChannels: sf.shadowCasterChannels,
        shadowAutoUpdate: sf.shadowAutoUpdate,
        shadowRevision: sf.shadowRevision,
        shadowBiasMode: sf.shadowBiasMode,
        shadowRadius: sf.shadowRadius,
        shadowIntensity: sf.shadowIntensity,
        shadowBlurSamples: sf.shadowBlurSamples,
        cascadeCount: sf.cascadeCount,
        splitLambda: sf.splitLambda,
        cascadeBlend: sf.cascadeBlend,
        mapSize: sf.mapSize,
        shadowDistance: sf.shadowDistance,
        shadowFilter: sf.shadowFilter,
        shadowAngularRadius: sf.shadowAngularRadius,
        maxPenumbraTexels: sf.maxPenumbraTexels,
        ...sf.staggerCascades ? { staggerCascades: true } : {},
        ...sf.staticShadowCache ? {} : { staticShadowCache: false }
      };
      directionalCsmDirection = dirSnapshot.direction;
      const csm = computeDirectionalCsm(dirSnapshot.direction, directionalCsmConfig, cameraData);
      cascadeCount = csm?.cascadeCount ?? Math.round(sf.cascadeCount);
      cascadeBlend = csm?.cascadeBlend ?? sf.cascadeBlend;
      shadowMapSize = sf.mapSize;
      if (csm !== null) {
        lightViewProj = csm.lightViewProj;
        splitPlanes = csm.splitPlanes;
        directionalShadowQuality = csm.directionalShadowQuality;
      } else {
        const sNear = cameraData?.near ?? 0.1;
        const splits = pssmSplit(sNear, sf.shadowDistance, cascadeCount, sf.splitLambda);
        const padded = new Float32Array(16);
        for (let i = 0; i < splits.length; i++) padded[i * 4] = splits[i] ?? 0;
        splitPlanes = padded;
      }
      directionalShadowQuality = directionalShadowQualityFromF32(
        sf.shadowFilter,
        sf.shadowAngularRadius,
        sf.maxPenumbraTexels
      );
    }
  }
  const paddedSplitPlanes = new Float32Array(16);
  if (splitPlanes !== void 0) {
    for (let i = 0; i < splitPlanes.length; i++) {
      paddedSplitPlanes[i] = splitPlanes[i] ?? 0;
    }
  }
  const pointShadowSnapshots = [];
  {
    const pointShadowQuery = world.query({ read: [Transform2, GlobalTransform2, PointLightShadow, PointLight] }).unwrap();
    for (const row of pointShadowQuery) {
      const ps = row.get(PointLightShadow);
      const channelsError = validateChannelMask(ps.shadowCasterChannels, "shadowCasterChannels");
      if (channelsError !== null) {
        worldInternal._routeError(channelsError, {
          severity: Severity.Error,
          systemName: "RenderSystem.extract (shadow-channels)"
        });
        continue;
      }
      const wRow = readPresentationWorldMatrix2(world, row.entity);
      if (wRow === void 0) continue;
      const px = wRow[12] ?? 0;
      const py = wRow[13] ?? 0;
      const pz = wRow[14] ?? 0;
      const lightPos = ps.shadowProjection === 1 ? vec3.clone(ps.shadowPosition) : vec3.create(px, py, pz);
      const mapSize = ps.mapSize;
      const nearPlane = ps.nearPlane;
      const projection = resolvePunctualShadowFarPlane(
        row.get(PointLight).range,
        nearPlane,
        ps.farPlane
      );
      if (!projection.ok) {
        worldInternal._routeError(projection.error, {
          severity: Severity.Error,
          systemName: "RenderSystem.extract (point-shadow-projection)"
        });
        continue;
      }
      const farPlane = projection.value;
      const layer = pointShadowSnapshots.length < SHADOW_ATLAS_DEFAULT_LAYERS ? pointShadowSnapshots.length : -1;
      const matrices = buildPointShadowMatrices(lightPos, nearPlane, farPlane);
      const packed = new Float32Array(96);
      for (let f = 0; f < 6; f++) {
        const m = matrices[f];
        if (m === void 0) continue;
        for (let k = 0; k < 16; k++) {
          packed[f * 16 + k] = m[k] ?? 0;
        }
      }
      pointShadowSnapshots.push({
        entity: row.entity,
        worldId: context.worldId,
        position: lightPos,
        mapSize,
        nearPlane,
        farPlane,
        depthBias: ps.depthBias,
        normalBias: ps.normalBias,
        shadowCasterChannels: ps.shadowCasterChannels,
        shadowAutoUpdate: ps.shadowAutoUpdate,
        shadowRevision: ps.shadowRevision,
        shadowFilter: ps.shadowFilter,
        shadowBiasMode: ps.shadowBiasMode,
        shadowIntensity: ps.shadowIntensity,
        pcfKernelSize: ps.pcfKernelSize ?? 3,
        shadowAtlasLayer: layer,
        shadowMatrices: packed
      });
    }
  }
  if (pointShadowSnapshots.length > 0) {
    const shadowByEntity = /* @__PURE__ */ new Map();
    for (const ps of pointShadowSnapshots) shadowByEntity.set(ps.entity, ps);
    for (let i = 0; i < pointSnapshots.length; i++) {
      const entityId = pointSnapshotEntities[i] ?? 0;
      const ps = shadowByEntity.get(entityId);
      if (ps !== void 0) {
        pointSnapshots[i] = {
          ...pointSnapshots[i],
          shadowAtlasLayer: ps.shadowAtlasLayer,
          shadowNear: ps.nearPlane,
          shadowFar: ps.farPlane,
          pcfKernelSize: ps.pcfKernelSize ?? 3
        };
      }
    }
  }
  const lights = {
    directional,
    directionalCount,
    point: pointSnapshots,
    spot: spotSnapshots,
    rect: rectSnapshots,
    lightViewProj,
    splitPlanes: splitPlanes !== void 0 ? paddedSplitPlanes : void 0,
    cascadeCount,
    cascadeBlend,
    shadowMapSize,
    depthBias: firstHitCastShadow === true ? firstHitShadowFields?.depthBias : void 0,
    normalBias: firstHitCastShadow === true ? firstHitShadowFields?.normalBias : void 0,
    directionalShadowQuality,
    directionalShadowError,
    pointShadow: pointShadowSnapshots,
    // bug-20260710-editor-cross-world-shadow: raw CSM config + light direction
    // so the merge layer can recompute matrices against the surfaced camera.
    directionalCsmConfig,
    directionalCsmDirection
  };
  const skylightQuery = world.query({ read: [Skylight], optional: [GlobalTransform2] }).unwrap();
  let skylight;
  let skylightCount = 0;
  for (const row of skylightQuery) {
    const s = row.get(Skylight);
    const equirectRaw = s.equirect;
    const intensity = s.intensity;
    const colorR = s.color[0] ?? 1;
    const colorG = s.color[1] ?? 1;
    const colorB = s.color[2] ?? 1;
    const rotation = [
      s.rotation[0] ?? 0,
      s.rotation[1] ?? 0,
      s.rotation[2] ?? 0,
      s.rotation[3] ?? 1
    ];
    skylightCount += 1;
    if (skylight === void 0) {
      const captureWorld = readPresentationWorldMatrix2(world, row.entity);
      skylight = {
        ...captureWorld === void 0 ? {} : {
          capturePosition: [
            captureWorld[12] ?? 0,
            captureWorld[13] ?? 0,
            captureWorld[14] ?? 0
          ]
        },
        equirectHandle: equirectRaw !== void 0 ? Math.round(equirectRaw) : 0,
        color: [colorR, colorG, colorB],
        ambientIrradiance: [
          s.ambientIrradiance[0] ?? 0,
          s.ambientIrradiance[1] ?? 0,
          s.ambientIrradiance[2] ?? 0
        ],
        intensity,
        rotation,
        // w19: winning entity handle for the multi-Skylight once-warn (F-8).
        entityHandle: row.entity
      };
    }
  }
  const lightProbeQuery = world.query({ read: [LightProbe, GlobalTransform2] }).unwrap();
  const lightProbes = [];
  for (const row of lightProbeQuery) {
    const probe = row.get(LightProbe);
    const validation = validateLightProbeData({
      irradiance: probe.irradiance,
      radius: probe.radius
    });
    if (!validation.ok) {
      worldInternal._routeError(validation.error, {
        severity: Severity.Error,
        systemName: "RenderSystem.extract (light-probe)"
      });
      continue;
    }
    const transform = readPresentationWorldMatrix2(world, row.entity);
    if (transform === void 0) continue;
    lightProbes.push({
      identity: String(row.entity),
      worldId: context.worldId,
      position: [transform[12] ?? 0, transform[13] ?? 0, transform[14] ?? 0],
      radius: probe.radius,
      irradiance: new Float32Array(probe.irradiance),
      admitted: true
    });
  }
  const skyboxQuery = world.query({ read: [SkyboxBackground] }).unwrap();
  let skybox;
  let skyboxCount = 0;
  for (const row of skyboxQuery) {
    const s = row.get(SkyboxBackground);
    const equirectRaw = s.equirect;
    const modeRaw = s.mode;
    const rotation = [
      s.rotation[0] ?? 0,
      s.rotation[1] ?? 0,
      s.rotation[2] ?? 0,
      s.rotation[3] ?? 1
    ];
    skyboxCount += 1;
    if (skybox === void 0 && equirectRaw !== void 0) {
      skybox = {
        equirectHandle: Math.round(equirectRaw),
        mode: modeRaw,
        rotation,
        // w19: winning entity handle for the multi-SkyboxBackground warn (F-8).
        entityHandle: row.entity
      };
    }
  }
  const environmentCandidates = [];
  const imageEnvironment = skylight?.equirectHandle !== void 0 && skylight.equirectHandle > 0 ? skylight : skybox?.equirectHandle !== void 0 && skybox.equirectHandle > 0 ? skybox : void 0;
  if (imageEnvironment !== void 0) {
    environmentCandidates.push({
      kind: "image",
      entityKey: imageEnvironment.entityHandle,
      sourceKey: `equirect:${imageEnvironment.equirectHandle}`
    });
  }
  const atmosphereQuery = world.query({ read: [Atmosphere], optional: [GlobalTransform2] }).unwrap();
  for (const row of atmosphereQuery) {
    const value = row.get(Atmosphere);
    const tuple = (channels) => [
      channels[0] ?? 0,
      channels[1] ?? 0,
      channels[2] ?? 0
    ];
    const atmosphereWorld = readPresentationWorldMatrix2(world, row.entity);
    const atmosphere = {
      planetRadius: value.planetRadius,
      atmosphereHeight: value.atmosphereHeight,
      groundOrigin: [
        atmosphereWorld?.[12] ?? 0,
        atmosphereWorld?.[13] ?? 0,
        atmosphereWorld?.[14] ?? 0
      ],
      capturePosition: skylight?.capturePosition ?? [
        atmosphereWorld?.[12] ?? 0,
        (atmosphereWorld?.[13] ?? 0) + 1,
        atmosphereWorld?.[14] ?? 0
      ],
      rayleighScattering: tuple(value.rayleighScattering),
      rayleighScaleHeight: value.rayleighScaleHeight,
      mieScattering: value.mieScattering,
      mieAbsorption: value.mieAbsorption,
      mieScaleHeight: value.mieScaleHeight,
      mieAnisotropy: value.mieAnisotropy,
      absorption: tuple(value.absorption),
      absorptionPeakHeight: value.absorptionPeakHeight,
      absorptionHalfWidth: value.absorptionHalfWidth,
      groundAlbedo: tuple(value.groundAlbedo),
      multipleScattering: value.multipleScattering,
      sunAngularRadius: value.sunAngularRadius,
      aerialPerspectiveStart: value.aerialPerspectiveStart,
      aerialPerspectiveDistanceScale: value.aerialPerspectiveDistanceScale
    };
    environmentCandidates.push({
      kind: "atmosphere",
      entityKey: row.entity,
      sourceKey: `atmosphere:${row.entity}`,
      atmosphere
    });
  }
  const directionalDirection = directional?.direction;
  const directionalLength = directionalDirection === void 0 ? 0 : Math.hypot(
    directionalDirection[0] ?? 0,
    directionalDirection[1] ?? 0,
    directionalDirection[2] ?? 0
  );
  const sunIntensity = directional?.intensity ?? 0;
  const sunColor = sunIntensity > 0 && directional !== void 0 ? [
    (directional.color[0] ?? 0) / sunIntensity,
    (directional.color[1] ?? 0) / sunIntensity,
    (directional.color[2] ?? 0) / sunIntensity
  ] : [0, 0, 0];
  const sun = directional === void 0 || directional.entity === void 0 || directionalLength <= 1e-6 ? [] : [
    {
      entityKey: directional.entity,
      direction: [
        -(directionalDirection?.[0] ?? 0) / directionalLength,
        -(directionalDirection?.[1] ?? 0) / directionalLength,
        -(directionalDirection?.[2] ?? 0) / directionalLength
      ],
      color: sunColor,
      intensity: directional.intensity
    }
  ];
  const environmentSelection = selectEnvironment({
    environments: environmentCandidates,
    fogs: fog === void 0 ? [] : [fog],
    suns: sun
  });
  if (!environmentSelection.ok) {
    routeWorldError(world, environmentSelection.error, {
      systemName: "RenderSystem.extract (environment-selection)"
    });
    throw environmentSelection.error;
  }
  const environment = environmentSelection.value;
  return {
    cameras,
    auxiliaryCameras,
    cubeCameras,
    reflectionProbes,
    lights,
    environment,
    volumetricFog,
    cloudLayer,
    skylight,
    skylightCount,
    lightProbes,
    skybox,
    skyboxCount
  };
}

// sdk/engine/node_modules/@forgeax/engine-render/src/glyph-source.ts
import { buildGlyphMeshAsset, layoutGlyphText } from "@forgeax/engine-graphics-extras";
import { GlobalTransform as GlobalTransform3, readPresentationWorldMatrix as readPresentationWorldMatrix3, Transform as Transform3 } from "@forgeax/engine-scene";
import {
  TextError
} from "@forgeax/engine-types";
var rootMaterial2 = MaterialResource.from({ ...defaultMaterialSnapshot(), passes: [] });
var textPasses = [
  {
    name: "text",
    program: { module: "forgeax::msdf-text" },
    renderState: {
      blend: {
        color: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
        alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" }
      },
      cullMode: "none",
      depthWriteEnabled: false,
      depthCompare: "less-equal",
      tags: { LightMode: "Forward" },
      queue: 3e3
    }
  }
];
var GlyphSources = class {
  worlds = /* @__PURE__ */ new WeakMap();
  content(world, handle) {
    let roots = this.worlds.get(world);
    const cached = roots?.get(handle);
    if (cached !== void 0) return cached;
    const font = world.resolveAsset(handle).unwrap();
    if (font.kind !== "font" || typeof font.atlas !== "number" || typeof font.sampler !== "number")
      throw new TextError({
        code: "font-atlas-missing",
        expected: "a managed Font with its complete atlas/sampler closure",
        hint: "load or create the Font through its asset owner before binding GlyphText"
      });
    const content = {
      font: structuredClone(font),
      layouts: /* @__PURE__ */ new Map(),
      materials: /* @__PURE__ */ new WeakMap(),
      colors: /* @__PURE__ */ new Map(),
      bytes: 0
    };
    if (roots === void 0) {
      roots = /* @__PURE__ */ new Map();
      this.worlds.set(world, roots);
    }
    roots.set(handle, content);
    return content;
  }
  adopt(world, changes) {
    const roots = this.worlds.get(world);
    if (roots === void 0) return;
    for (const change of changes) roots.delete(change.handle);
  }
  resolve(world, source, assets) {
    const content = this.content(world, source.font);
    let sizes = content.layouts.get(source.text);
    let mesh = sizes?.get(source.size);
    if (mesh === void 0) {
      mesh = buildGlyphMeshAsset(layoutGlyphText(content.font, source.text, source.size));
      const bytes = mesh.vertices.byteLength * 2 + (mesh.indices?.byteLength ?? 0) + source.text.length * 2;
      if (content.bytes + bytes > 16 * 1024 * 1024) {
        content.layouts.clear();
        content.bytes = 0;
        sizes = void 0;
      }
      if (sizes === void 0) {
        sizes = /* @__PURE__ */ new Map();
        content.layouts.set(source.text, sizes);
      }
      if (bytes <= 16 * 1024 * 1024) {
        sizes.set(source.size, mesh);
        content.bytes += bytes;
      }
    }
    let material = content.materials.get(source);
    if (material === void 0) {
      const font = content.font;
      const key = source.color.join(",");
      material = content.colors.get(key);
      const snapshot = content.base ?? prepareMaterialSnapshot({
        handle: 0,
        world,
        assets,
        programSelections: void 0,
        material: {
          kind: "material",
          passes: textPasses,
          colorSpace: "linear",
          parameters: [
            { name: "tintColor", type: "color", default: [1, 1, 1, 1] },
            { name: "distanceRange", type: "vec4", default: [4, 512, 512, 0] },
            { name: "baseColorTexture", type: "texture" },
            { name: "metallicRoughnessTexture", type: "texture", optional: true },
            { name: "normalTexture", type: "texture", optional: true }
          ],
          values: {
            tintColor: source.color,
            distanceRange: [
              font.common.distanceRange,
              font.common.atlasWidth,
              font.common.atlasHeight,
              0
            ],
            baseColorTexture: { texture: font.atlas, sampler: font.sampler }
          }
        }
      });
      content.base = snapshot;
      if (material === void 0) {
        material = MaterialResource.from({
          ...snapshot,
          paramSnapshot: { ...snapshot.paramSnapshot, tintColor: [...source.color] },
          immutableValues: true
        });
        if (content.colors.size >= 256)
          content.colors.delete(content.colors.keys().next().value);
        content.colors.set(key, material);
      }
      content.materials.set(source, material);
    }
    return { mesh, material };
  }
  detach(world) {
    this.worlds.delete(world);
  }
  clear() {
    this.worlds = /* @__PURE__ */ new WeakMap();
  }
};
function extractGlyphSources(world, worldId, renderables, selected, visibility, retainHidden = false, hidden) {
  const append = (entity) => {
    const data = world.get(entity, GlyphText);
    if (!data.ok || data.value.fontHandle === 0) return;
    const matrix = readPresentationWorldMatrix3(world, entity);
    if (matrix === void 0) return;
    const visible = visibility?.effective(entity) !== "hidden";
    if (!visible) {
      hidden?.add(entity);
      if (!retainHidden) return;
    }
    const glyph = data.value;
    if (!Number.isFinite(glyph.fontSize) || glyph.fontSize <= 0 || !Array.from(glyph.color).every(Number.isFinite))
      throw new TextError({
        code: "glyph-layout-failed",
        expected: "a positive finite fontSize and finite RGBA color",
        hint: "repair the GlyphText component values"
      });
    const layer = world.get(entity, Layer);
    renderables.push({
      glyph: {
        font: glyph.fontHandle,
        text: glyph.text,
        size: glyph.fontSize,
        color: [glyph.color[0] ?? 1, glyph.color[1] ?? 1, glyph.color[2] ?? 1, glyph.color[3] ?? 1]
      },
      transform: { world: new Float32Array(matrix) },
      worldId,
      entityKey: entity,
      material: rootMaterial2,
      materials: [rootMaterial2],
      materialBindingSources: ["mesh-default"],
      shadowCaster: false,
      layer: layer.ok ? layer.value.value : 0,
      ...visible ? {} : { authorVisible: false }
    });
  };
  if (selected !== void 0) {
    for (const entity of selected) append(entity);
  } else
    for (const row of world.query({ read: [GlyphText, Transform3, GlobalTransform3] }).unwrap())
      append(row.entity);
}
function projectGlyphView(frame, materials, worlds, sources, assets, hasSources = frame.renderables.some((source) => source.glyph !== void 0)) {
  if (!hasSources) return { frame, materials };
  const dispatch = [...frame.dispatch];
  const renderables = frame.renderables.map((source, index) => {
    if (source.glyph === void 0 || source.authorVisible === false || source.glyph.text.length === 0)
      return source;
    const world = worlds[source.worldId];
    if (world === void 0) throw new Error("GlyphText requires its source resource scope");
    if (assets === void 0) throw new Error("GlyphText requires the renderer asset service");
    const { mesh, material } = sources.resolve(world, source.glyph, assets);
    if (mesh.indices?.length === 0) return source;
    materials = materials.with(material);
    appendMaterialDispatchEntries(
      dispatch,
      material.snapshot.passes,
      source.entityKey,
      0,
      index,
      source.layer ?? 0
    );
    const matrix = new Float32Array(16);
    matrix[0] = matrix[5] = matrix[10] = matrix[15] = 1;
    matrix[12] = source.transform.world[12] ?? 0;
    matrix[13] = source.transform.world[13] ?? 0;
    matrix[14] = source.transform.world[14] ?? 0;
    return {
      ...source,
      transform: { world: matrix },
      generatedMesh: mesh,
      ...mesh.aabb === void 0 ? {} : { localAabb: mesh.aabb },
      material,
      materials: [material]
    };
  });
  return { frame: { ...frame, renderables, dispatch: sortDispatchByQueue(dispatch) }, materials };
}

// sdk/engine/node_modules/@forgeax/engine-render/src/instances-derived-bounds.ts
import { isFiniteBounds3 } from "@forgeax/engine-types";
var fingerprintScalar = new Float32Array(1);
var fingerprintBits = new Uint32Array(fingerprintScalar.buffer);
function fingerprintNumericArray(values) {
  let hash = 2166136261;
  for (let index = 0; index < values.length; index += 1) {
    fingerprintScalar[0] = Number(values[index]);
    hash = Math.imul(hash ^ (fingerprintBits[0] ?? 0), 16777619) >>> 0;
  }
  return hash >>> 0;
}
function finiteMatrix(matrix) {
  if (matrix.length < 16) return false;
  for (let index = 0; index < 16; index += 1) {
    if (!Number.isFinite(matrix[index])) return false;
  }
  return true;
}
function multiplyMat4(out, left, right, rightOffset = 0) {
  for (let column = 0; column < 4; column += 1) {
    const rightColumn = rightOffset + column * 4;
    const right0 = Number(right[rightColumn] ?? 0);
    const right1 = Number(right[rightColumn + 1] ?? 0);
    const right2 = Number(right[rightColumn + 2] ?? 0);
    const right3 = Number(right[rightColumn + 3] ?? 0);
    const outOffset = column * 4;
    out[outOffset] = Number(left[0] ?? 0) * right0 + Number(left[4] ?? 0) * right1 + Number(left[8] ?? 0) * right2 + Number(left[12] ?? 0) * right3;
    out[outOffset + 1] = Number(left[1] ?? 0) * right0 + Number(left[5] ?? 0) * right1 + Number(left[9] ?? 0) * right2 + Number(left[13] ?? 0) * right3;
    out[outOffset + 2] = Number(left[2] ?? 0) * right0 + Number(left[6] ?? 0) * right1 + Number(left[10] ?? 0) * right2 + Number(left[14] ?? 0) * right3;
    out[outOffset + 3] = Number(left[3] ?? 0) * right0 + Number(left[7] ?? 0) * right1 + Number(left[11] ?? 0) * right2 + Number(left[15] ?? 0) * right3;
  }
}
function finiteMatrixAt(values, offset) {
  if (values.length - offset < 16) return false;
  for (let index = 0; index < 16; index += 1) {
    if (!Number.isFinite(values[offset + index])) return false;
  }
  return true;
}
function isAffine(matrix) {
  return matrix[3] === 0 && matrix[7] === 0 && matrix[11] === 0 && matrix[15] === 1;
}
function includeBox(out, candidate, initialized) {
  const minX = candidate[0];
  const minY = candidate[1];
  const minZ = candidate[2];
  const maxX = candidate[3];
  const maxY = candidate[4];
  const maxZ = candidate[5];
  if (!initialized) {
    out[0] = minX;
    out[1] = minY;
    out[2] = minZ;
    out[3] = maxX;
    out[4] = maxY;
    out[5] = maxZ;
    return true;
  }
  if (minX < (out[0] ?? Number.POSITIVE_INFINITY)) out[0] = minX;
  if (minY < (out[1] ?? Number.POSITIVE_INFINITY)) out[1] = minY;
  if (minZ < (out[2] ?? Number.POSITIVE_INFINITY)) out[2] = minZ;
  if (maxX > (out[3] ?? Number.NEGATIVE_INFINITY)) out[3] = maxX;
  if (maxY > (out[4] ?? Number.NEGATIVE_INFINITY)) out[4] = maxY;
  if (maxZ > (out[5] ?? Number.NEGATIVE_INFINITY)) out[5] = maxZ;
  return true;
}
function transformAabb(out, local, matrix) {
  const minX = local[0];
  const minY = local[1];
  const minZ = local[2];
  const maxX = local[3];
  const maxY = local[4];
  const maxZ = local[5];
  const centerX = (minX + maxX) * 0.5;
  const centerY = (minY + maxY) * 0.5;
  const centerZ = (minZ + maxZ) * 0.5;
  const extentX = (maxX - minX) * 0.5;
  const extentY = (maxY - minY) * 0.5;
  const extentZ = (maxZ - minZ) * 0.5;
  if (isAffine(matrix)) {
    const centerWorldX = matrix[0] * centerX + matrix[4] * centerY + matrix[8] * centerZ + matrix[12];
    const centerWorldY = matrix[1] * centerX + matrix[5] * centerY + matrix[9] * centerZ + matrix[13];
    const centerWorldZ = matrix[2] * centerX + matrix[6] * centerY + matrix[10] * centerZ + matrix[14];
    const extentWorldX = Math.abs(matrix[0]) * extentX + Math.abs(matrix[4]) * extentY + Math.abs(matrix[8]) * extentZ;
    const extentWorldY = Math.abs(matrix[1]) * extentX + Math.abs(matrix[5]) * extentY + Math.abs(matrix[9]) * extentZ;
    const extentWorldZ = Math.abs(matrix[2]) * extentX + Math.abs(matrix[6]) * extentY + Math.abs(matrix[10]) * extentZ;
    out[0] = centerWorldX - extentWorldX;
    out[1] = centerWorldY - extentWorldY;
    out[2] = centerWorldZ - extentWorldZ;
    out[3] = centerWorldX + extentWorldX;
    out[4] = centerWorldY + extentWorldY;
    out[5] = centerWorldZ + extentWorldZ;
    return isFiniteBounds3(out);
  }
  let minimumW = Number.POSITIVE_INFINITY;
  let maximumW = Number.NEGATIVE_INFINITY;
  for (let corner = 0; corner < 8; corner += 1) {
    const x = (corner & 1) === 0 ? minX : maxX;
    const y = (corner & 2) === 0 ? minY : maxY;
    const z = (corner & 4) === 0 ? minZ : maxZ;
    const w = matrix[3] * x + matrix[7] * y + matrix[11] * z + matrix[15];
    if (!Number.isFinite(w)) return false;
    if (w < minimumW) minimumW = w;
    if (w > maximumW) maximumW = w;
  }
  if (minimumW <= 0 && maximumW >= 0) return false;
  let unionMinX = Number.POSITIVE_INFINITY;
  let unionMinY = Number.POSITIVE_INFINITY;
  let unionMinZ = Number.POSITIVE_INFINITY;
  let unionMaxX = Number.NEGATIVE_INFINITY;
  let unionMaxY = Number.NEGATIVE_INFINITY;
  let unionMaxZ = Number.NEGATIVE_INFINITY;
  for (let corner = 0; corner < 8; corner += 1) {
    const x = (corner & 1) === 0 ? minX : maxX;
    const y = (corner & 2) === 0 ? minY : maxY;
    const z = (corner & 4) === 0 ? minZ : maxZ;
    const rawX = matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12];
    const rawY = matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13];
    const rawZ = matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14];
    const w = matrix[3] * x + matrix[7] * y + matrix[11] * z + matrix[15];
    const projectedX = rawX / w;
    const projectedY = rawY / w;
    const projectedZ = rawZ / w;
    if (!Number.isFinite(projectedX) || !Number.isFinite(projectedY) || !Number.isFinite(projectedZ)) {
      return false;
    }
    if (projectedX < unionMinX) unionMinX = projectedX;
    if (projectedY < unionMinY) unionMinY = projectedY;
    if (projectedZ < unionMinZ) unionMinZ = projectedZ;
    if (projectedX > unionMaxX) unionMaxX = projectedX;
    if (projectedY > unionMaxY) unionMaxY = projectedY;
    if (projectedZ > unionMaxZ) unionMaxZ = projectedZ;
  }
  out[0] = unionMinX;
  out[1] = unionMinY;
  out[2] = unionMinZ;
  out[3] = unionMaxX;
  out[4] = unionMaxY;
  out[5] = unionMaxZ;
  return isFiniteBounds3(out);
}
function deriveInstancesUnionBounds(input) {
  const { meshAabb, entityWorld, transforms } = input;
  if (!isFiniteBounds3(meshAabb) || !finiteMatrix(entityWorld) || transforms === void 0) {
    return void 0;
  }
  if (transforms.length === 0 || transforms.length % 16 !== 0) return void 0;
  const local = meshAabb;
  const union = new Float32Array(6);
  const composed = new Float32Array(16);
  const transformed = new Float32Array(6);
  let initialized = false;
  for (let offset = 0; offset < transforms.length; offset += 16) {
    if (!finiteMatrixAt(transforms, offset)) return void 0;
    multiplyMat4(composed, entityWorld, transforms, offset);
    if (!finiteMatrix(composed) || !transformAabb(transformed, local, composed)) return void 0;
    initialized = includeBox(union, transformed, initialized);
  }
  return initialized && isFiniteBounds3(union) ? union : void 0;
}
var HIERARCHY_FANOUT = 16;
var MAX_ROW_CHANGE_RANGES = 32;
var composedScratch = new Float32Array(16);
var boxScratch = new Float32Array(6);
var InstanceRowBoundsHierarchy = class {
  constructor(rows) {
    this.rows = rows;
    this.coefficients = new Float32Array(rows * 12);
    this.rowValid = new Uint8Array(rows);
    let width = rows;
    do {
      width = Math.ceil(width / HIERARCHY_FANOUT);
      this.levels.push({
        coefficients: new Float32Array(width * 24),
        filled: new Uint8Array(width)
      });
    } while (width > 1);
  }
  rows;
  coefficients;
  rowValid;
  invalidRows = 0;
  levels = [];
  writeRow(row, transforms) {
    const offset = row * 16;
    const valid = finiteMatrixAt(transforms, offset) && transforms[offset + 3] === 0 && transforms[offset + 7] === 0 && transforms[offset + 11] === 0 && transforms[offset + 15] === 1;
    if (valid) {
      for (let column = 0; column < 4; column++)
        for (let axis = 0; axis < 3; axis++)
          this.coefficients[row * 12 + column * 3 + axis] = transforms[offset + column * 4 + axis];
    }
    const was = this.rowValid[row] === 1;
    if (was !== valid) this.invalidRows += valid ? -1 : 1;
    this.rowValid[row] = valid ? 1 : 0;
  }
  markAllRowsUnset() {
    this.invalidRows = this.rows;
    this.rowValid.fill(0);
  }
  refreshNode(level, node) {
    const target = this.levels[level];
    const previous = this.levels[level - 1];
    const source = level === 0 ? this.coefficients : previous.coefficients;
    const filled = level === 0 ? this.rowValid : previous.filled;
    const stride = level === 0 ? 12 : 24;
    const first = node * HIERARCHY_FANOUT;
    const last = Math.min(first + HIERARCHY_FANOUT, filled.length);
    let initialized = false;
    for (let child = first; child < last; child++) {
      if (filled[child] !== 1) continue;
      for (let field = 0; field < 12; field++) {
        const lo = source[child * stride + field];
        const hi = level === 0 ? lo : source[child * stride + field + 12];
        const offset = node * 24 + field;
        target.coefficients[offset] = initialized ? Math.min(target.coefficients[offset], lo) : lo;
        target.coefficients[offset + 12] = initialized ? Math.max(target.coefficients[offset + 12], hi) : hi;
      }
      initialized = true;
    }
    target.filled[node] = initialized ? 1 : 0;
    return last - first;
  }
  /** Rebuild every node bottom-up; returns node visits. */
  refreshAll() {
    let visits = 0;
    for (let level = 0; level < this.levels.length; level += 1) {
      const width = this.levels[level]?.filled.length ?? 0;
      for (let node = 0; node < width; node += 1) visits += this.refreshNode(level, node);
    }
    return visits;
  }
  /** Refresh the ancestors of the given sorted, disjoint row ranges. */
  refreshRows(ranges) {
    let visits = 0;
    let spans = ranges.map((range) => ({ start: range.start, end: range.end }));
    for (let level = 0; level < this.levels.length; level += 1) {
      const parents = [];
      for (const span of spans) {
        const start = Math.floor(span.start / HIERARCHY_FANOUT);
        const end = Math.floor((span.end - 1) / HIERARCHY_FANOUT) + 1;
        const tail = parents[parents.length - 1];
        if (tail !== void 0 && start <= tail.end) tail.end = Math.max(tail.end, end);
        else parents.push({ start, end });
      }
      for (const span of parents) {
        for (let node = span.start; node < span.end; node += 1) {
          visits += this.refreshNode(level, node);
        }
      }
      spans = parents;
    }
    return visits;
  }
  union(mesh, world) {
    if (this.invalidRows > 0 || mesh === void 0 || !isFiniteBounds3(mesh) || !finiteMatrix(world))
      return void 0;
    const root = this.levels[this.levels.length - 1];
    if (root.filled[0] !== 1) return void 0;
    const values = root.coefficients;
    for (let axis = 0; axis < 3; axis++) {
      let lo = values[9 + axis];
      let hi = values[21 + axis];
      for (let input = 0; input < 3; input++) {
        const a = values[input * 3 + axis];
        const b = values[input * 3 + axis + 12];
        const x = mesh[input];
        const y = mesh[input + 3];
        lo += Math.min(a * x, a * y, b * x, b * y);
        hi += Math.max(a * x, a * y, b * x, b * y);
      }
      boxScratch[axis] = lo;
      boxScratch[axis + 3] = hi;
    }
    const result = new Float32Array(6);
    return transformAabb(result, boxScratch, world) ? result : void 0;
  }
  rowBounds(out, first, last, mesh, world) {
    let initialized = false;
    for (let row = first; row < last; row++) {
      for (let column = 0; column < 4; column++)
        for (let axis = 0; axis < 3; axis++)
          rowMatrixScratch[column * 4 + axis] = this.coefficients[row * 12 + column * 3 + axis];
      multiplyMat4(composedScratch, world, rowMatrixScratch);
      transformAabb(boxScratch, mesh, composedScratch);
      initialized = includeBox(out, boxScratch, initialized);
    }
  }
};
var rowMatrixScratch = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
var InstanceBoundsCache = class {
  entries = /* @__PURE__ */ new Map();
  hits = 0;
  misses = 0;
  derives = 0;
  invalidations = 0;
  rowUpdates = 0;
  nodeVisits = 0;
  key(input) {
    return `${input.worldId === void 0 ? "" : `${input.worldId}:`}${input.entityKey}`;
  }
  get(input) {
    const key = this.key(input);
    const previous = this.entries.get(key);
    if (previous !== void 0 && previous.meshGeneration === input.meshGeneration && previous.transformGeneration === input.transformGeneration && previous.matrixGeneration === input.matrixGeneration && previous.collectionId === input.collectionId) {
      this.hits += 1;
      return previous.bounds;
    }
    this.misses += 1;
    if (previous?.hierarchy !== void 0 && previous.matrixGeneration === input.matrixGeneration && previous.collectionId === input.collectionId && input.transforms?.length === previous.hierarchy.rows * 16) {
      const { rowChange: _stale, ...retained } = previous;
      const adopted = {
        ...retained,
        meshGeneration: input.meshGeneration,
        transformGeneration: input.transformGeneration,
        bounds: previous.hierarchy.union(input.meshAabb, input.entityWorld)
      };
      this.entries.set(key, adopted);
      return adopted.bounds;
    }
    const updated = this.updateRows(previous, input);
    if (updated !== void 0) {
      this.rowUpdates += 1;
      this.entries.set(key, updated);
      return updated.bounds;
    }
    this.derives += 1;
    const entry = this.derive(input);
    this.entries.set(key, entry);
    return entry.bounds;
  }
  /**
   * Old/new world boxes of the rows changed by the entry's latest revision,
   * or undefined when that revision was a full derive (callers then fall
   * back to whole-collection bounds).
   */
  rowChange(entityKey, worldId) {
    return this.entries.get(this.key({ entityKey, ...worldId === void 0 ? {} : { worldId } }))?.rowChange;
  }
  derive(input) {
    const base = {
      ...input.worldId === void 0 ? {} : { worldId: input.worldId },
      entityKey: input.entityKey,
      meshGeneration: input.meshGeneration,
      transformGeneration: input.transformGeneration,
      matrixGeneration: input.matrixGeneration
    };
    const { meshAabb, entityWorld, transforms } = input;
    if (transforms === void 0 || transforms.length === 0 || transforms.length % 16 !== 0) {
      return { ...base, bounds: void 0 };
    }
    const reusable = this.entries.get(this.key(input))?.hierarchy;
    const hierarchy = reusable !== void 0 && reusable.rows === transforms.length / 16 ? reusable : new InstanceRowBoundsHierarchy(transforms.length / 16);
    hierarchy.markAllRowsUnset();
    for (let row = 0; row < hierarchy.rows; row += 1) {
      hierarchy.writeRow(row, transforms);
    }
    this.nodeVisits += hierarchy.rows + hierarchy.refreshAll();
    return {
      ...base,
      bounds: hierarchy.union(meshAabb, entityWorld),
      ...input.collectionId === void 0 ? {} : { collectionId: input.collectionId },
      ...input.revision === void 0 ? {} : { revision: input.revision },
      hierarchy
    };
  }
  updateRows(previous, input) {
    const hierarchy = previous?.hierarchy;
    const { meshAabb, entityWorld, transforms, dirtyRows } = input;
    if (previous === void 0 || hierarchy === void 0 || dirtyRows === void 0 || input.revision === void 0 || previous.collectionId !== input.collectionId || previous.revision !== input.revision - 1 || previous.meshGeneration !== input.meshGeneration || previous.transformGeneration !== input.transformGeneration || meshAabb === void 0 || transforms === void 0 || transforms.length !== hierarchy.rows * 16) {
      return void 0;
    }
    for (const range of dirtyRows) {
      if (range.start < 0 || range.end > hierarchy.rows || range.start >= range.end)
        return void 0;
    }
    const collapse = dirtyRows.length > MAX_ROW_CHANGE_RANGES;
    const count = collapse ? 1 : dirtyRows.length;
    const boxes = new Float32Array(count * 12);
    let rowsVisited = 0;
    for (let index = 0; index < dirtyRows.length; index += 1) {
      const range = dirtyRows[index];
      const entry = collapse ? 0 : index;
      if (!collapse || index === 0) {
        hierarchy.rowBounds(
          boxes.subarray(entry * 12, entry * 12 + 6),
          range.start,
          range.end,
          meshAabb,
          entityWorld
        );
      } else {
        hierarchy.rowBounds(scratchBox, range.start, range.end, meshAabb, entityWorld);
        includeBox(boxes.subarray(0, 6), scratchBox, true);
      }
      for (let row = range.start; row < range.end; row += 1) {
        hierarchy.writeRow(row, transforms);
      }
      rowsVisited += range.end - range.start;
      if (!collapse || index === 0) {
        hierarchy.rowBounds(
          boxes.subarray(entry * 12 + 6, entry * 12 + 12),
          range.start,
          range.end,
          meshAabb,
          entityWorld
        );
      } else {
        hierarchy.rowBounds(scratchBox, range.start, range.end, meshAabb, entityWorld);
        includeBox(boxes.subarray(6, 12), scratchBox, true);
      }
    }
    this.nodeVisits += rowsVisited + hierarchy.refreshRows(dirtyRows);
    const { rowChange: _stale, ...retained } = previous;
    const bounds = hierarchy.union(meshAabb, entityWorld);
    return {
      ...retained,
      matrixGeneration: input.matrixGeneration,
      revision: input.revision,
      bounds,
      ...bounds === void 0 || previous.bounds === void 0 ? {} : { rowChange: { revision: input.revision, boxes, count } }
    };
  }
  invalidate(entityKey, worldId) {
    if (entityKey === void 0) {
      if (this.entries.size > 0) this.invalidations += this.entries.size;
      this.entries.clear();
    } else {
      if (this.entries.delete(this.key({ entityKey, ...worldId === void 0 ? {} : { worldId } }))) {
        this.invalidations += 1;
      }
    }
  }
  inspect() {
    return {
      hits: this.hits,
      misses: this.misses,
      derives: this.derives,
      invalidations: this.invalidations,
      rowUpdates: this.rowUpdates,
      nodeVisits: this.nodeVisits
    };
  }
};
var scratchBox = new Float32Array(6);

// sdk/engine/node_modules/@forgeax/engine-render/src/points-lines/bounds.ts
function expandPointsLinesBounds(bounds, style) {
  if (bounds.length < 6 || style === void 0) return new Float32Array(bounds);
  const margin = style.kind === "points" ? style.sizePx * 0.5 : style.width * 2;
  if (!Number.isFinite(margin) || margin <= 0) return new Float32Array(bounds);
  return new Float32Array([
    (bounds[0] ?? 0) - margin,
    (bounds[1] ?? 0) - margin,
    (bounds[2] ?? 0) - margin,
    (bounds[3] ?? 0) + margin,
    (bounds[4] ?? 0) + margin,
    (bounds[5] ?? 0) + margin
  ]);
}

// sdk/engine/node_modules/@forgeax/engine-render/src/scene/shadow-visibility.ts
import { frustum as frustum2 } from "@forgeax/engine-math";
function buildShadowFrusta(lights) {
  const result = [];
  const add = (matrix) => {
    result.push(frustum2.fromViewProjection(frustum2.create(), matrix));
  };
  for (const matrix of lights.lightViewProj?.slice(0, lights.cascadeCount) ?? []) add(matrix);
  for (const snapshot of lights.pointShadow) {
    if (snapshot.shadowAtlasLayer < 0) continue;
    for (let face = 0; face < 6; face += 1)
      add(snapshot.shadowMatrices.subarray(face * 16, (face + 1) * 16));
  }
  for (const snapshot of lights.spot) {
    if (snapshot.shadowAtlasTile >= 0 && snapshot.lightViewProj !== void 0)
      add(snapshot.lightViewProj);
  }
  return result;
}

// sdk/engine/node_modules/@forgeax/engine-render/src/skin-posed-bounds.ts
import { box3, mat4 as mat46 } from "@forgeax/engine-math";
import { skinVertexPosition } from "@forgeax/engine-skinning";
var cachesByWorld = /* @__PURE__ */ new WeakMap();
var ledgersByWorld = /* @__PURE__ */ new WeakMap();
var MAX_CACHED_SKINS = 32;
var MAX_CACHED_GEOMETRY_BYTES = 1048576;
var MAX_ENVELOPE_GEOMETRY_BYTES = 4 * 1048576;
var MAX_LARGE_ENVELOPE_BYTES = 8 * 1048576;
var typedArrayPrototype = Object.getPrototypeOf(Uint8Array.prototype);
var bufferOf = Object.getOwnPropertyDescriptor(typedArrayPrototype, "buffer")?.get;
var offsetOf = Object.getOwnPropertyDescriptor(typedArrayPrototype, "byteOffset")?.get;
var lengthOf = Object.getOwnPropertyDescriptor(typedArrayPrototype, "byteLength")?.get;
function ordinaryBuffer(value, prototype) {
  try {
    return bufferOf?.call(value) instanceof ArrayBuffer && Object.getPrototypeOf(value) === prototype && Object.getOwnPropertyDescriptor(value, "length") === void 0;
  } catch {
    return false;
  }
}
function skinPosedBoundsCache(world, identity) {
  let entries = cachesByWorld.get(world);
  let ledger = ledgersByWorld.get(world);
  if (entries === void 0 || ledger === void 0) {
    entries = /* @__PURE__ */ new Map();
    ledger = { bytes: 0 };
    cachesByWorld.set(world, entries);
    ledgersByWorld.set(world, ledger);
  }
  let cache = entries.get(identity);
  if (cache === void 0) {
    if (entries.size === MAX_CACHED_SKINS) {
      const oldest = entries.keys().next().value;
      entries.get(oldest)?.release();
      entries.delete(oldest);
    }
    cache = new SkinPosedBoundsCache(ledger);
    entries.set(identity, cache);
  }
  return cache;
}
function sameBytes(first, second) {
  const byteLength = lengthOf?.call(first);
  if (byteLength !== lengthOf?.call(second)) return false;
  const firstOffset = offsetOf?.call(first);
  const secondOffset = offsetOf?.call(second);
  const firstBuffer = bufferOf?.call(first);
  const secondBuffer = bufferOf?.call(second);
  const compared = compareBufferBytes(
    firstBuffer,
    firstOffset,
    secondBuffer,
    secondOffset,
    byteLength
  );
  if (compared !== void 0) return compared;
  if (firstOffset % 4 === 0 && secondOffset % 4 === 0 && byteLength % 4 === 0) {
    const words = byteLength / 4;
    const a2 = new Uint32Array(firstBuffer, firstOffset, words);
    const b2 = new Uint32Array(secondBuffer, secondOffset, words);
    for (let index = 0; index < words; index++) if (a2[index] !== b2[index]) return false;
    return true;
  }
  const a = new Uint8Array(firstBuffer, firstOffset, byteLength);
  const b = new Uint8Array(secondBuffer, secondOffset, byteLength);
  for (let index = 0; index < a.length; index++) if (a[index] !== b[index]) return false;
  return true;
}
function jointEnvelopes(positions, indices, weights, jointCount) {
  const bounds = new Float64Array(jointCount * 6);
  for (let joint = 0; joint < jointCount; joint++) {
    bounds.fill(Infinity, joint * 6, joint * 6 + 3);
    bounds.fill(-Infinity, joint * 6 + 3, joint * 6 + 6);
  }
  let minimumSum = Infinity;
  let maximumSum = -Infinity;
  for (let vertex = 0; vertex < positions.length / 3; vertex++) {
    const x = positions[vertex * 3];
    const y = positions[vertex * 3 + 1];
    const z = positions[vertex * 3 + 2];
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return void 0;
    let sum = 0;
    for (let lane = 0; lane < 4; lane++) {
      const influence = vertex * 4 + lane;
      const joint = indices[influence];
      const weight = weights[influence];
      if (joint >= jointCount || !Number.isFinite(weight) || weight < 0) return void 0;
      sum += weight;
      if (weight === 0) continue;
      const base = joint * 6;
      bounds[base] = Math.min(bounds[base], x);
      bounds[base + 1] = Math.min(bounds[base + 1], y);
      bounds[base + 2] = Math.min(bounds[base + 2], z);
      bounds[base + 3] = Math.max(bounds[base + 3], x);
      bounds[base + 4] = Math.max(bounds[base + 4], y);
      bounds[base + 5] = Math.max(bounds[base + 5], z);
    }
    if (!(sum > 0) || !Number.isFinite(sum)) return void 0;
    minimumSum = Math.min(minimumSum, sum);
    maximumSum = Math.max(maximumSum, sum);
  }
  return {
    positions: new Float32Array(positions),
    indices: new Uint16Array(indices),
    weights: new Float32Array(weights),
    jointCount,
    bounds,
    minimumSum,
    maximumSum
  };
}
var SkinPosedBoundsCache = class {
  constructor(ledger = { bytes: 0 }) {
    this.ledger = ledger;
  }
  ledger;
  envelopes;
  chargedBytes = 0;
  last;
  previousPoseRepeated = false;
  captureGeometry = false;
  /** Drops retained snapshots and returns their bytes to the World budget. */
  release() {
    this.setEnvelopes(void 0);
    this.last = void 0;
  }
  setEnvelopes(envelope) {
    this.ledger.bytes -= this.chargedBytes;
    this.chargedBytes = 0;
    this.envelopes = envelope;
    if (envelope === void 0) return;
    const bytes = envelope.positions.byteLength + envelope.indices.byteLength + envelope.weights.byteLength + envelope.bounds.byteLength;
    if (bytes <= MAX_CACHED_GEOMETRY_BYTES) return;
    this.chargedBytes = bytes;
    this.ledger.bytes += bytes;
  }
  conservative(positions, indices, weights, palette, inverse) {
    for (let joint = 0; joint < palette.length / 16; joint++) {
      const base = joint * 16;
      if (palette[base + 3] !== 0 || palette[base + 7] !== 0 || palette[base + 11] !== 0 || palette[base + 15] !== 1)
        return void 0;
    }
    if (inverse[3] !== 0 || inverse[7] !== 0 || inverse[11] !== 0 || inverse[15] !== 1)
      return void 0;
    this.last = void 0;
    this.previousPoseRepeated = false;
    this.captureGeometry = false;
    let envelope = this.envelopes;
    const jointCount = palette.length / 16;
    if (envelope === void 0 || envelope.jointCount !== jointCount || !sameBytes(positions, envelope.positions) || !sameBytes(indices, envelope.indices) || !sameBytes(weights, envelope.weights)) {
      this.setEnvelopes(void 0);
      const bytes = lengthOf?.call(positions) + lengthOf?.call(indices) + lengthOf?.call(weights) + jointCount * 6 * 8;
      if (bytes > MAX_CACHED_GEOMETRY_BYTES && this.ledger.bytes + bytes > MAX_LARGE_ENVELOPE_BYTES)
        return void 0;
      envelope = jointEnvelopes(positions, indices, weights, jointCount);
      this.setEnvelopes(envelope);
    }
    if (envelope === void 0) return void 0;
    const minimum = [Infinity, Infinity, Infinity];
    const maximum = [-Infinity, -Infinity, -Infinity];
    let magnitude = 1;
    for (let joint = 0; joint < jointCount; joint++) {
      const box = joint * 6;
      if (envelope.bounds[box] === Infinity) continue;
      const matrix = joint * 16;
      for (let axis = 0; axis < 3; axis++) {
        let low = palette[matrix + 12 + axis];
        let high = low;
        let absolute = Math.abs(low);
        for (let dimension = 0; dimension < 3; dimension++) {
          const coefficient = palette[matrix + dimension * 4 + axis];
          const a = coefficient * envelope.bounds[box + dimension];
          const b = coefficient * envelope.bounds[box + dimension + 3];
          low += Math.min(a, b);
          high += Math.max(a, b);
          absolute += Math.max(Math.abs(a), Math.abs(b));
        }
        minimum[axis] = Math.min(minimum[axis], low);
        maximum[axis] = Math.max(maximum[axis], high);
        magnitude = Math.max(magnitude, absolute);
      }
    }
    const padding = 64 * 2 ** -23 * magnitude * Math.max(1, envelope.maximumSum);
    const worldBounds = new Float64Array(6);
    for (let axis = 0; axis < 3; axis++) {
      const low = minimum[axis];
      const high = maximum[axis];
      worldBounds[axis] = Math.min(
        low,
        low * envelope.minimumSum,
        low * envelope.maximumSum,
        high * envelope.minimumSum,
        high * envelope.maximumSum
      ) - padding;
      worldBounds[axis + 3] = Math.max(
        high,
        low * envelope.minimumSum,
        low * envelope.maximumSum,
        high * envelope.minimumSum,
        high * envelope.maximumSum
      ) + padding;
    }
    if (!worldBounds.every(Number.isFinite)) return void 0;
    const local = box3.transformBox3(box3.create(), worldBounds, inverse);
    const localPadding = 64 * 2 ** -23 * Math.max(1, ...Array.from(local, Math.abs));
    for (let axis = 0; axis < 3; axis++) {
      local[axis] = local[axis] - localPadding;
      local[axis + 3] = local[axis + 3] + localPadding;
    }
    return local.every(Number.isFinite) ? local : void 0;
  }
  read(positions, indices, weights, palette, inverse) {
    this.setEnvelopes(void 0);
    const last = this.last;
    const samePose = last !== void 0 && sameBytes(palette, last.palette) && sameBytes(inverse, last.inverse);
    this.captureGeometry = samePose || this.previousPoseRepeated;
    this.previousPoseRepeated = samePose;
    const geometry = last?.geometry;
    if (!samePose || geometry === void 0 || !sameBytes(positions, geometry.positions) || !sameBytes(indices, geometry.indices) || !sameBytes(weights, geometry.weights))
      return void 0;
    return new Float32Array(last.bounds);
  }
  remember(positions, indices, weights, palette, inverse, bounds) {
    let last = this.last;
    if (last === void 0 || last.palette.length !== palette.length) {
      last = {
        palette: new Float32Array(palette.length),
        inverse: new Float32Array(inverse.length),
        bounds: new Float32Array(bounds.length)
      };
      this.last = last;
    }
    const previous = last.geometry;
    if (this.captureGeometry) {
      last.geometry = {
        positions: previous !== void 0 && sameBytes(positions, previous.positions) ? previous.positions : new Float32Array(positions),
        indices: previous !== void 0 && sameBytes(indices, previous.indices) ? previous.indices : new Uint16Array(indices),
        weights: previous !== void 0 && sameBytes(weights, previous.weights) ? previous.weights : new Float32Array(weights)
      };
    } else delete last.geometry;
    last.palette.set(palette);
    last.inverse.set(inverse);
    last.bounds.set(bounds);
  }
};
function skinPosedBounds(mesh, pose, meshWorld, cache, conservative = false) {
  const positions = mesh.attributes.position;
  const indices = mesh.attributes.skinIndex;
  const weights = mesh.attributes.skinWeight;
  if (!(positions instanceof Float32Array) || positions.length === 0 || positions.length % 3 !== 0 || !(indices instanceof Uint16Array) || !(weights instanceof Float32Array) || indices.length !== positions.length / 3 * 4 || weights.length !== indices.length)
    return void 0;
  const inverse = mat46.invert(mat46.create(), meshWorld);
  const matrix = mat46.multiply(mat46.create(), meshWorld, inverse);
  for (let index = 0; index < 16; index++) {
    const value = matrix[index];
    if (!Number.isFinite(value) || Math.abs(value - (index % 5 === 0 ? 1 : 0)) > 1e-4)
      return void 0;
  }
  const palette = new Float32Array(pose.jointCount * 16);
  for (let joint = 0; joint < pose.jointCount; joint++) {
    const world = pose.jointWorlds[joint];
    const ibm = pose.inverseBindMatrices[joint];
    if (world === void 0 || ibm === void 0 || ibm.length !== 16) return void 0;
    mat46.multiply(matrix, world, ibm);
    for (let index = 0; index < 16; index++) if (!Number.isFinite(matrix[index])) return void 0;
    palette.set(matrix, joint * 16);
  }
  const ordinary = cache !== void 0 && ordinaryBuffer(positions, Float32Array.prototype) && ordinaryBuffer(indices, Uint16Array.prototype) && ordinaryBuffer(weights, Float32Array.prototype);
  const geometryBytes = ordinary ? lengthOf?.call(positions) + lengthOf?.call(indices) + lengthOf?.call(weights) : Infinity;
  if (conservative && geometryBytes + pose.jointCount * 6 * 8 <= MAX_ENVELOPE_GEOMETRY_BYTES) {
    const enclosure = cache?.conservative(positions, indices, weights, palette, inverse);
    if (enclosure !== void 0) return enclosure;
  }
  const reusable = geometryBytes + palette.byteLength + (conservative ? pose.jointCount * 6 * 8 : 0) + inverse.byteLength + 24 <= MAX_CACHED_GEOMETRY_BYTES ? cache : void 0;
  const previous = reusable?.read(positions, indices, weights, palette, inverse);
  if (previous !== void 0) return previous;
  const minimum = [Infinity, Infinity, Infinity];
  const maximum = [-Infinity, -Infinity, -Infinity];
  const point = new Float64Array(4);
  for (let vertex = 0; vertex < positions.length / 3; vertex++) {
    if (!skinVertexPosition(point, positions, indices, weights, palette, vertex)) return void 0;
    const pointX = point[0];
    const pointY = point[1];
    const pointZ = point[2];
    const homogeneousWeight = point[3];
    if (!(homogeneousWeight > 0)) return void 0;
    const projectedX = pointX / homogeneousWeight;
    const projectedY = pointY / homogeneousWeight;
    const projectedZ = pointZ / homogeneousWeight;
    if (!Number.isFinite(pointX) || !Number.isFinite(pointY) || !Number.isFinite(pointZ) || !Number.isFinite(projectedX) || !Number.isFinite(projectedY) || !Number.isFinite(projectedZ))
      return void 0;
    minimum[0] = Math.min(minimum[0], pointX, projectedX);
    minimum[1] = Math.min(minimum[1], pointY, projectedY);
    minimum[2] = Math.min(minimum[2], pointZ, projectedZ);
    maximum[0] = Math.max(maximum[0], pointX, projectedX);
    maximum[1] = Math.max(maximum[1], pointY, projectedY);
    maximum[2] = Math.max(maximum[2], pointZ, projectedZ);
  }
  const worldBounds = [...minimum, ...maximum];
  const localBounds = box3.transformBox3(box3.create(), worldBounds, inverse);
  if (!localBounds.every(Number.isFinite)) return void 0;
  reusable?.remember(positions, indices, weights, palette, inverse, localBounds);
  return localBounds;
}

// sdk/engine/node_modules/@forgeax/engine-render/src/systems/skin-palette-allocator.ts
import { mat4 as mat47 } from "@forgeax/engine-math";
var MAT4_BYTES = 64;
var MAX_JOINTS = 255;
var BINDING_WINDOW_BYTES = MAX_JOINTS * MAT4_BYTES;
var PALETTE_OFFSET_ALIGN = 256;
function alignedPaletteBytes(jointCount) {
  return jointCount * MAT4_BYTES + (PALETTE_OFFSET_ALIGN - 1) & ~(PALETTE_OFFSET_ALIGN - 1);
}
function prepareSkinPalette(pose, allocator) {
  allocator.observePersistentJoints(pose.identity, pose.inverseBindMatrices, pose.jointWorlds);
  const receipt = allocator.allocatePersistentSlice(pose);
  allocator.writePersistentJointPalette(receipt, pose.inverseBindMatrices, pose.jointWorlds);
  return receipt;
}
function createSkinPaletteAllocator(device, maxBindingSize, useStorageBuffer = true) {
  let storageBuffer = null;
  let storageCapacity = 0;
  let storageCursor = 0;
  let contentRevision = 0;
  const pool = [];
  let poolCursor = 0;
  const persistentUniformBuffers = /* @__PURE__ */ new Map();
  function persistentReceipt(allocation, dirtyRanges, uploadBytes, retiredByteOffset) {
    return {
      get buffer() {
        return allocation.slice.buffer;
      },
      get byteOffset() {
        return allocation.slice.byteOffset;
      },
      jointCount: allocation.slice.jointCount,
      identity: allocation.identity,
      generation: allocation.generation,
      fence: allocation.fence,
      customDataStart: useStorageBuffer ? allocation.slice.byteOffset / MAT4_BYTES : 0,
      storageOrUniform: useStorageBuffer ? "storage" : "uniform",
      ...allocation.bounds === void 0 ? {} : { bounds: new Float32Array(allocation.bounds) },
      dirtyRanges,
      uploadBytes,
      ...retiredByteOffset === void 0 ? {} : { retiredByteOffset }
    };
  }
  const persistent = /* @__PURE__ */ new Map();
  const freeStorageRanges = [];
  const pendingStorageRetirements = /* @__PURE__ */ new Set();
  const destroyedBuffers = /* @__PURE__ */ new Set();
  let allocatorDisposed = false;
  const pendingDirty = /* @__PURE__ */ new Map();
  const observedPose = /* @__PURE__ */ new Map();
  const frameSeenPersistent = /* @__PURE__ */ new Set();
  let persistentCursor = 0;
  let persistentFence = 0;
  const queueWriteBuffer = (buffer, byteOffset, payload) => {
    const result = device.queue.writeBuffer(buffer, byteOffset, payload);
    if (!result.ok) throw result.error;
    contentRevision += 1;
  };
  function normalizedDirtyRanges(allocation) {
    const joints = [...allocation.dirtyJoints].filter((joint) => joint >= 0 && joint < allocation.jointCount).sort((left, right) => left - right);
    const ranges = [];
    for (const joint of joints) {
      const previous = ranges[ranges.length - 1];
      if (previous !== void 0 && previous.startJoint + previous.jointCount === joint) {
        ranges[ranges.length - 1] = {
          startJoint: previous.startJoint,
          jointCount: previous.jointCount + 1
        };
      } else {
        ranges.push({ startJoint: joint, jointCount: 1 });
      }
    }
    return Object.freeze(ranges);
  }
  function mergeFreeStorageRange(range) {
    if (allocatorDisposed || storageBuffer !== range.buffer || range.byteSize <= 0) return;
    freeStorageRanges.push({ ...range });
    freeStorageRanges.sort((left, right) => left.offset - right.offset);
    for (let index = freeStorageRanges.length - 1; index > 0; index -= 1) {
      const current = freeStorageRanges[index];
      const previous = freeStorageRanges[index - 1];
      if (current === void 0 || previous === void 0) continue;
      if (previous.offset + previous.byteSize !== current.offset) continue;
      previous.byteSize += current.byteSize;
      freeStorageRanges.splice(index, 1);
    }
  }
  function retireStorageRange(range) {
    if (allocatorDisposed) return;
    pendingStorageRetirements.add(range);
    void device.queue.onSubmittedWorkDone().then(
      () => {
        pendingStorageRetirements.delete(range);
        mergeFreeStorageRange(range);
      },
      () => {
        pendingStorageRetirements.delete(range);
        mergeFreeStorageRange(range);
      }
    );
  }
  function takeFreeStorageRange(byteSize) {
    if (!useStorageBuffer || storageBuffer === null) return void 0;
    let candidateIndex = -1;
    for (let index = 0; index < freeStorageRanges.length; index += 1) {
      const candidate2 = freeStorageRanges[index];
      if (candidate2 !== void 0 && candidate2.buffer === storageBuffer && candidate2.byteSize >= byteSize && // Direct/residual draws bind a full palette window even for one joint.
      // A split free range can fit the payload but overrun that binding.
      candidate2.offset + BINDING_WINDOW_BYTES <= storageCapacity) {
        candidateIndex = index;
        break;
      }
    }
    if (candidateIndex < 0) return void 0;
    const candidate = freeStorageRanges[candidateIndex];
    if (candidate === void 0) return void 0;
    freeStorageRanges.splice(candidateIndex, 1);
    if (candidate.byteSize > byteSize) {
      freeStorageRanges.push({
        buffer: candidate.buffer,
        offset: candidate.offset + byteSize,
        byteSize: candidate.byteSize - byteSize
      });
    }
    return { buffer: candidate.buffer, offset: candidate.offset, byteSize };
  }
  function destroyBufferOnce(buffer) {
    if (destroyedBuffers.has(buffer)) return;
    destroyedBuffers.add(buffer);
    device.destroyBuffer(buffer);
  }
  function allocatePersistentSlice(input) {
    frameSeenPersistent.add(input.identity);
    if (!Number.isInteger(input.jointCount) || input.jointCount <= 0 || input.jointCount > MAX_JOINTS) {
      throw new RangeError(`skin joint count must be between 1 and ${MAX_JOINTS}`);
    }
    const prior = persistent.get(input.identity);
    if (prior !== void 0 && prior.generation === input.generation && prior.jointCount === input.jointCount) {
      if (input.bounds === void 0) delete prior.bounds;
      else prior.bounds = new Float32Array(input.bounds);
      const dirtyRanges2 = normalizedDirtyRanges(prior);
      const uploadBytes2 = dirtyRanges2.reduce(
        (total, range) => total + range.jointCount * MAT4_BYTES,
        0
      );
      prior.dirtyJoints.clear();
      return persistentReceipt(prior, dirtyRanges2, uploadBytes2);
    }
    const retiredByteOffset = prior?.slice.byteOffset;
    if (prior !== void 0) {
      persistent.delete(input.identity);
      if (useStorageBuffer) {
        retireStorageRange({
          buffer: prior.slice.buffer,
          offset: prior.slice.byteOffset,
          byteSize: prior.byteSize
        });
      }
    }
    let slice;
    if (useStorageBuffer) {
      const byteSize = alignedPaletteBytes(input.jointCount);
      const recycled = takeFreeStorageRange(byteSize);
      if (recycled !== void 0) {
        slice = {
          jointCount: input.jointCount,
          byteOffset: recycled.offset,
          buffer: recycled.buffer
        };
      } else {
        const offset = persistentCursor;
        const needed = offset + BINDING_WINDOW_BYTES;
        ensureStorageCapacity(needed);
        const buffer = storageBuffer;
        persistentCursor = offset + byteSize;
        slice = { jointCount: input.jointCount, byteOffset: offset, buffer };
      }
    } else {
      let buffer = persistentUniformBuffers.get(input.identity);
      if (buffer === void 0) {
        if (BINDING_WINDOW_BYTES > maxBindingSize) {
          throw new SkinPaletteOverflowError(BINDING_WINDOW_BYTES, maxBindingSize);
        }
        const created = device.createBuffer({
          label: "skin-palette-persistent",
          size: BINDING_WINDOW_BYTES,
          usage: GPU_BUFFER_USAGE_UNIFORM | GPU_BUFFER_USAGE_COPY_DST,
          mappedAtCreation: false
        });
        if (!created.ok) throw created.error;
        buffer = created.value;
        persistentUniformBuffers.set(input.identity, buffer);
      }
      slice = { jointCount: input.jointCount, byteOffset: 0, buffer };
    }
    const carriedDirty = prior !== void 0 ? new Set(Array.from({ length: input.jointCount }, (_, index) => index)) : pendingDirty.get(input.identity) ?? new Set(Array.from({ length: input.jointCount }, (_, index) => index));
    const allocation = {
      identity: input.identity,
      generation: input.generation,
      jointCount: input.jointCount,
      byteSize: alignedPaletteBytes(input.jointCount),
      slice,
      fence: ++persistentFence,
      ...input.bounds === void 0 ? {} : { bounds: new Float32Array(input.bounds) },
      dirtyJoints: new Set(carriedDirty)
    };
    pendingDirty.delete(input.identity);
    persistent.set(input.identity, allocation);
    const dirtyRanges = normalizedDirtyRanges(allocation);
    const uploadBytes = dirtyRanges.reduce(
      (total, range) => total + range.jointCount * MAT4_BYTES,
      0
    );
    allocation.dirtyJoints.clear();
    return persistentReceipt(allocation, dirtyRanges, uploadBytes, retiredByteOffset);
  }
  function markDirtyJoints(identity, joints) {
    const allocation = persistent.get(identity);
    const dirty = allocation?.dirtyJoints ?? pendingDirty.get(identity) ?? /* @__PURE__ */ new Set();
    for (const joint of joints) {
      if (Number.isInteger(joint) && joint >= 0 && (allocation === void 0 || joint < allocation.jointCount)) {
        dirty.add(joint);
      }
    }
    if (allocation === void 0) pendingDirty.set(identity, dirty);
  }
  function releasePersistentSlice(identity) {
    frameSeenPersistent.delete(identity);
    const allocation = persistent.get(identity);
    persistent.delete(identity);
    pendingDirty.delete(identity);
    observedPose.delete(identity);
    if (allocation === void 0) return;
    if (useStorageBuffer) {
      retireStorageRange({
        buffer: allocation.slice.buffer,
        offset: allocation.slice.byteOffset,
        byteSize: allocation.byteSize
      });
      return;
    }
    const buffer = persistentUniformBuffers.get(identity);
    if (buffer === void 0) return;
    persistentUniformBuffers.delete(identity);
    void device.queue.onSubmittedWorkDone().then(
      () => destroyBufferOnce(buffer),
      () => destroyBufferOnce(buffer)
    );
  }
  function observePersistentJoints(identity, ibms, jointWorlds) {
    const count = Math.min(ibms.length, jointWorlds.length);
    const previous = observedPose.get(identity);
    const next = new Array(count);
    const changed = [];
    const temp = mat47.create();
    const ibm = mat47.create();
    for (let index = 0; index < count; index += 1) {
      const ibmFlat = ibms[index];
      const jointWorld = jointWorlds[index];
      if (ibmFlat === void 0 || jointWorld === void 0) continue;
      for (let lane = 0; lane < 16; lane += 1) ibm[lane] = ibmFlat[lane] ?? 0;
      mat47.multiply(temp, jointWorld, ibm);
      const copy = new Float32Array(temp);
      next[index] = copy;
      const prior = previous?.[index];
      if (prior === void 0 || prior.length !== copy.length || prior.some((v, lane) => v !== copy[lane])) {
        changed.push(index);
      }
    }
    observedPose.set(identity, Object.freeze(next));
    if (changed.length > 0) markDirtyJoints(identity, changed);
    return Object.freeze(changed);
  }
  function beginFrame() {
    frameSeenPersistent.clear();
    persistentCursor = Math.max(persistentCursor, storageCursor);
  }
  function endFrame() {
    for (const identity of [...persistent.keys()]) {
      if (!frameSeenPersistent.has(identity)) releasePersistentSlice(identity);
    }
    frameSeenPersistent.clear();
  }
  function ensureStorageCapacity(needed) {
    if (storageBuffer !== null && needed <= storageCapacity) return;
    let newCapacity = storageCapacity === 0 ? BINDING_WINDOW_BYTES : storageCapacity;
    while (newCapacity < needed) {
      newCapacity = newCapacity + (newCapacity >> 1) + 255 & ~255;
    }
    if (newCapacity > maxBindingSize) {
      throw new SkinPaletteOverflowError(newCapacity, maxBindingSize);
    }
    const bufRes = device.createBuffer({
      label: "skin-palette",
      size: newCapacity,
      usage: GPU_BUFFER_USAGE_STORAGE | GPU_BUFFER_USAGE_COPY_DST,
      mappedAtCreation: false
    });
    if (!bufRes.ok) throw bufRes.error;
    const previous = storageBuffer;
    storageBuffer = bufRes.value;
    storageCapacity = newCapacity;
    for (const range of freeStorageRanges) {
      if (range.buffer === previous) range.buffer = storageBuffer;
    }
    for (const range of pendingStorageRetirements) {
      if (range.buffer === previous) range.buffer = storageBuffer;
    }
    for (const allocation of persistent.values()) {
      const pose = observedPose.get(allocation.identity);
      if (pose !== void 0) {
        const payload = new Float32Array(allocation.jointCount * 16);
        for (let joint = 0; joint < allocation.jointCount; joint += 1) {
          const matrix = pose[joint];
          if (matrix !== void 0) payload.set(matrix, joint * 16);
        }
        queueWriteBuffer(storageBuffer, allocation.slice.byteOffset, payload);
      }
      allocation.slice = { ...allocation.slice, buffer: storageBuffer };
    }
    if (previous !== null) {
      void device.queue.onSubmittedWorkDone().then(
        () => destroyBufferOnce(previous),
        () => destroyBufferOnce(previous)
      );
    }
  }
  function acquirePoolBuffer() {
    if (poolCursor < pool.length) {
      const reused = pool[poolCursor];
      return reused;
    }
    if (BINDING_WINDOW_BYTES > maxBindingSize) {
      throw new SkinPaletteOverflowError(BINDING_WINDOW_BYTES, maxBindingSize);
    }
    const bufRes = device.createBuffer({
      label: "skin-palette",
      size: BINDING_WINDOW_BYTES,
      usage: GPU_BUFFER_USAGE_UNIFORM | GPU_BUFFER_USAGE_COPY_DST,
      mappedAtCreation: false
    });
    if (!bufRes.ok) throw bufRes.error;
    pool.push(bufRes.value);
    return bufRes.value;
  }
  function allocateSlice(jointCount) {
    if (useStorageBuffer) {
      const offset = storageCursor;
      const needed = offset + BINDING_WINDOW_BYTES;
      ensureStorageCapacity(needed);
      const buffer2 = storageBuffer;
      storageCursor = offset + jointCount * MAT4_BYTES + (PALETTE_OFFSET_ALIGN - 1) & ~(PALETTE_OFFSET_ALIGN - 1);
      return { jointCount, byteOffset: offset, buffer: buffer2 };
    }
    const buffer = acquirePoolBuffer();
    poolCursor += 1;
    return { jointCount, byteOffset: 0, buffer };
  }
  function writeJointPalette(slice, ibms, jointWorlds) {
    const count = Math.min(slice.jointCount, ibms.length, jointWorlds.length);
    if (count === 0) return;
    const payload = new Float32Array(count * 16);
    const temp = mat47.create();
    const ibm = mat47.create();
    for (let i = 0; i < count; i++) {
      const ibmFlat = ibms[i];
      const jw = jointWorlds[i];
      if (ibmFlat === void 0 || jw === void 0) continue;
      for (let k = 0; k < 16; k++) {
        ibm[k] = ibmFlat[k] ?? 0;
      }
      mat47.multiply(temp, jw, ibm);
      const base = i * 16;
      for (let j = 0; j < 16; j++) {
        payload[base + j] = temp[j] ?? 0;
      }
    }
    queueWriteBuffer(slice.buffer, slice.byteOffset, payload);
  }
  function writePersistentJointPalette(receipt, ibms, jointWorlds) {
    if (receipt.uploadBytes === 0 || receipt.dirtyRanges.length === 0) return;
    const temp = mat47.create();
    const ibm = mat47.create();
    for (const range of receipt.dirtyRanges) {
      const count = Math.min(
        range.jointCount,
        ibms.length - range.startJoint,
        jointWorlds.length - range.startJoint
      );
      if (count <= 0) continue;
      const payload = new Float32Array(count * 16);
      for (let local = 0; local < count; local += 1) {
        const index = range.startJoint + local;
        const ibmFlat = ibms[index];
        const jointWorld = jointWorlds[index];
        if (ibmFlat === void 0 || jointWorld === void 0) continue;
        for (let lane = 0; lane < 16; lane += 1) ibm[lane] = ibmFlat[lane] ?? 0;
        mat47.multiply(temp, jointWorld, ibm);
        payload.set(temp, local * 16);
      }
      queueWriteBuffer(receipt.buffer, receipt.byteOffset + range.startJoint * MAT4_BYTES, payload);
    }
  }
  function resetForFrame() {
    storageCursor = 0;
    poolCursor = 0;
  }
  function dispose() {
    if (allocatorDisposed) return;
    allocatorDisposed = true;
    if (storageBuffer !== null) destroyBufferOnce(storageBuffer);
    for (const buffer of pool) destroyBufferOnce(buffer);
    for (const buffer of persistentUniformBuffers.values()) destroyBufferOnce(buffer);
    storageBuffer = null;
    persistent.clear();
    pendingDirty.clear();
    observedPose.clear();
    persistentUniformBuffers.clear();
    freeStorageRanges.length = 0;
    pendingStorageRetirements.clear();
    pool.length = 0;
  }
  return {
    get storageBuffer() {
      return storageBuffer;
    },
    get contentRevision() {
      return contentRevision;
    },
    bindingWindowBytes: BINDING_WINDOW_BYTES,
    useStorageBuffer,
    allocatePersistentSlice,
    observePersistentJoints,
    markDirtyJoints,
    releasePersistentSlice,
    beginFrame,
    endFrame,
    allocateSlice,
    writeJointPalette,
    writePersistentJointPalette,
    resetForFrame,
    dispose
  };
}

// sdk/engine/node_modules/@forgeax/engine-render/src/tilemap-source.ts
import { frustum as frustum3, mat4 as mat48 } from "@forgeax/engine-math";
import { GlobalTransform as GlobalTransform4, readPresentationWorldMatrix as readPresentationWorldMatrix4, Transform as Transform4 } from "@forgeax/engine-scene";
var rootMaterial3 = MaterialResource.from({ ...defaultMaterialSnapshot(), passes: [] });
var passes = [
  {
    name: "Forward",
    program: { module: "forgeax::default-unlit" },
    renderState: {
      blend: {
        color: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha", operation: "add" },
        alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" }
      },
      depthWriteEnabled: false,
      depthCompare: "less-equal",
      cullMode: "none",
      tags: { LightMode: "Forward" },
      queue: 3e3
    }
  }
];
var TilemapSources = class {
  worlds = /* @__PURE__ */ new WeakMap();
  partitions = /* @__PURE__ */ new WeakMap();
  content(world, handle) {
    let roots = this.worlds.get(world);
    let content = roots?.get(handle);
    if (content !== void 0) return content;
    const asset = structuredClone(world.resolveAsset(handle).unwrap());
    let extent = 1;
    for (const tile of asset.tiles)
      extent = Math.max(extent, tile.widthCells ?? 1, tile.heightCells ?? 1);
    content = {
      asset,
      extent,
      chunks: /* @__PURE__ */ new Map(),
      regions: /* @__PURE__ */ new Map(),
      materials: /* @__PURE__ */ new Map(),
      bytes: 0
    };
    if (roots === void 0) {
      roots = /* @__PURE__ */ new Map();
      this.worlds.set(world, roots);
    }
    roots.set(handle, content);
    return content;
  }
  chunks(source) {
    let chunks = this.partitions.get(source);
    if (chunks === void 0) {
      chunks = tilemapChunks(source);
      this.partitions.set(source, chunks);
    }
    return chunks;
  }
  adopt(world, changes) {
    const roots = this.worlds.get(world);
    if (roots !== void 0) for (const change of changes) roots.delete(change.handle);
  }
  draws(source, chunk, content) {
    const cached = content.chunks.get(chunk);
    if (cached !== void 0) return cached.draws;
    const draws = [];
    const groups = /* @__PURE__ */ new Map();
    for (const cell of chunk.cells) {
      const geometry = tilemapCellGeometry(source, content.asset, cell);
      if (geometry === void 0) continue;
      const atlas = content.asset.regions[geometry.regionIndex]?.atlasIndex ?? 0;
      if (source.sortScope === 1) {
        let mesh = content.regions.get(geometry.regionIndex);
        if (mesh === void 0) {
          mesh = tilemapRegionMesh(content.asset, geometry.regionIndex);
          content.regions.set(geometry.regionIndex, mesh);
        }
        draws.push({ key: cell, atlas, mesh, matrix: geometry.matrix });
      } else {
        let group = groups.get(atlas);
        if (group === void 0) {
          group = [];
          groups.set(atlas, group);
        }
        group.push(geometry);
      }
    }
    for (const [atlas, cells] of groups)
      draws.push({
        key: chunk.index * content.asset.atlases.length + atlas,
        atlas,
        mesh: tilemapMesh(content.asset, cells)
      });
    const bytes = draws.reduce(
      (sum, draw) => sum + (draw.matrix === void 0 ? draw.mesh.vertices.byteLength * 2 + (draw.mesh.indices?.byteLength ?? 0) : draw.matrix.byteLength + 32),
      0
    );
    if (bytes <= 32 * 1024 * 1024) {
      while (content.bytes + bytes > 32 * 1024 * 1024) {
        const oldest = content.chunks.entries().next().value;
        if (oldest === void 0) break;
        content.chunks.delete(oldest[0]);
        content.bytes -= oldest[1].bytes;
      }
      content.chunks.set(chunk, { draws, bytes });
      content.bytes += bytes;
    }
    return draws;
  }
  material(world, content, atlas, assets) {
    let material = content.materials.get(atlas);
    if (material !== void 0) return material;
    const texture = content.asset.atlases[atlas];
    if (typeof texture !== "number") throw new Error("Tilemap requires an admitted Tileset atlas");
    material = MaterialResource.from(
      prepareMaterialSnapshot({
        handle: 0,
        world,
        assets,
        programSelections: void 0,
        material: {
          kind: "material",
          passes,
          colorSpace: "linear",
          values: {
            baseColor: [1, 1, 1, 1],
            baseColorTexture: { texture }
          }
        }
      })
    );
    content.materials.set(atlas, material);
    return material;
  }
  detach(world) {
    this.worlds.delete(world);
  }
  clear() {
    this.worlds = /* @__PURE__ */ new WeakMap();
    this.partitions = /* @__PURE__ */ new WeakMap();
  }
};
function extractTilemapSources(world, worldId, renderables, selected, visibility, retainHidden = false, hidden) {
  const append = (entity) => {
    const source = tilemapSource(world, entity);
    if (source === void 0) return;
    const matrix = readPresentationWorldMatrix4(world, entity);
    if (matrix === void 0) return;
    const visible = visibility?.effective(entity) !== "hidden";
    if (!visible) {
      hidden?.add(entity);
      if (!retainHidden) return;
    }
    renderables.push({
      tilemap: source,
      transform: { world: new Float32Array(matrix) },
      worldId,
      entityKey: entity,
      material: rootMaterial3,
      materials: [rootMaterial3],
      materialBindingSources: ["mesh-default"],
      shadowCaster: false,
      layer: source.layerOrder << 20,
      ...visible ? {} : { authorVisible: false }
    });
  };
  if (selected !== void 0) for (const entity of selected) append(entity);
  else
    for (const row of world.query({ read: [Tilemap, Transform4, GlobalTransform4] }).unwrap())
      append(row.entity);
}
function projectTilemapView(frame, materials, worlds, sources, assets, hasSources = frame.renderables.some((source) => source.tilemap !== void 0)) {
  if (!hasSources) return { frame, materials };
  const camera = frame.cameras[0];
  if (camera === void 0) return { frame, materials };
  const viewProjection = mat48.multiply(
    mat48.create(),
    computeProjectionMatrix(camera),
    computeViewMatrix(camera)
  );
  const renderables = [], dispatch = [];
  const dispatchBySource = /* @__PURE__ */ new Map();
  for (const entry of frame.dispatch) {
    let entries = dispatchBySource.get(entry.renderableIndex);
    if (entries === void 0) {
      entries = [];
      dispatchBySource.set(entry.renderableIndex, entries);
    }
    entries.push(entry);
  }
  for (const [oldIndex, snapshot] of frame.renderables.entries()) {
    const source = snapshot.tilemap;
    if (source === void 0) {
      const index = renderables.length;
      renderables.push(snapshot);
      for (const entry of dispatchBySource.get(oldIndex) ?? [])
        dispatch.push({ ...entry, renderableIndex: index });
      continue;
    }
    if (snapshot.authorVisible === false) continue;
    const world = worlds[snapshot.worldId];
    if (world === void 0 || assets === void 0)
      throw new Error("Tilemap requires its resource scope and renderer asset service");
    const content = sources.content(world, source.tileset);
    const localFrustum = frustum3.fromViewProjection(
      frustum3.create(),
      mat48.multiply(mat48.create(), viewProjection, snapshot.transform.world)
    );
    for (const chunk of sources.chunks(source)) {
      const margin = content.extent * Math.max(...source.tileSize);
      const x = chunk.x * source.chunkSize * source.tileSize[0], y = chunk.y * source.chunkSize * source.tileSize[1];
      if (!frustum3.intersectsBox(localFrustum, [
        x - margin,
        y - margin,
        -1e-3,
        x + source.chunkSize * source.tileSize[0] + margin,
        y + source.chunkSize * source.tileSize[1] + margin,
        1e-3
      ]))
        continue;
      for (const draw of sources.draws(source, chunk, content)) {
        const material = sources.material(world, content, draw.atlas, assets);
        materials = materials.with(material);
        const index = renderables.length;
        const layer = source.layerOrder << 20 | (source.sortScope === 0 ? chunk.index & 1048575 : 0);
        renderables.push({
          ...snapshot,
          generatedMesh: draw.mesh,
          ...draw.mesh.aabb === void 0 ? {} : { localAabb: draw.mesh.aabb },
          nativeDraw: { key: `${source.sortScope}:${draw.key}` },
          transform: draw.matrix === void 0 ? snapshot.transform : { world: mat48.multiply(mat48.create(), snapshot.transform.world, draw.matrix) },
          material,
          materials: [material],
          layer
        });
        appendMaterialDispatchEntries(
          dispatch,
          material.snapshot.passes,
          snapshot.entityKey,
          0,
          index,
          layer
        );
      }
    }
  }
  return { frame: { ...frame, renderables, dispatch: sortDispatchByQueue(dispatch) }, materials };
}

// sdk/engine/node_modules/@forgeax/engine-render/src/render-system-extract-tail.ts
function skinPaletteIdentity(world, entity) {
  return `skin:${world.identity}:${entity}`;
}
function materialProgramSelectionRequiresSkin(selection) {
  if (selection.abi?.skinPaletteAddress !== void 0) return true;
  const semantics = new Set((selection.abi?.vertexInputs ?? []).map((input) => input.semantic));
  return semantics.has("skinIndex") && semantics.has("skinWeight");
}
function isMissingMaterialProgram(error) {
  return error !== null && typeof error === "object" && error.code === "material-specialization-not-cooked";
}
function extractFrames(worlds, owner, assets, pipelineState, materialSnapshotCachesByWorld, options = {}) {
  const cameraOwner = typeof owner === "number" ? owner : owner.cameraOwner;
  const resourceOwner = typeof owner === "number" ? owner : owner.resourceOwner;
  const cameraEntityKey = typeof owner === "number" ? void 0 : owner.cameraEntityKey;
  const renderableRequest = options.renderables ?? "full";
  const renderableMode = typeof renderableRequest === "object" ? "full" : renderableRequest;
  const partialEntitiesByWorld = typeof renderableRequest === "object" ? renderableRequest.entitiesByWorld : void 0;
  const retainHidden = options.retainHidden ?? typeof renderableRequest === "object";
  const skinPaletteAllocator = pipelineState?.skinPaletteAllocator ?? null;
  const reconcileSkinFrame = renderableRequest === "full";
  if (skinPaletteAllocator !== null && reconcileSkinFrame) {
    skinPaletteAllocator.beginFrame();
    skinPaletteAllocator.resetForFrame();
  }
  const failedWorlds = /* @__PURE__ */ new Set();
  const resourceOwnerWorld = worlds[resourceOwner];
  const resourceOwnerFog = resourceOwnerWorld === void 0 ? null : selectFogFrame(resourceOwnerWorld) ?? null;
  const succeededFrames = [];
  const succeededIndices = [];
  const extractionOrder = Array.from({ length: worlds.length }, (_, wi) => wi).sort((a, b) => {
    if (a === cameraOwner) return -1;
    if (b === cameraOwner) return 1;
    return a - b;
  });
  const framesByWorld = /* @__PURE__ */ new Map();
  for (const wi of extractionOrder) {
    const world = worlds[wi];
    if (world === void 0 || failedWorlds.has(world)) continue;
    const skinComponent = world.components.resolve(Skin.name) ?? Skin;
    try {
      if (skinPaletteAllocator !== null && partialEntitiesByWorld !== void 0) {
        for (const entityKey of partialEntitiesByWorld[wi] ?? []) {
          if (!world.hasComponent(entityKey, skinComponent)) {
            skinPaletteAllocator.releasePersistentSlice(skinPaletteIdentity(world, entityKey));
          }
        }
      }
      const isCameraOwner = wi === cameraOwner;
      const cameraOwnerFrame2 = framesByWorld.get(cameraOwner);
      const prepared = prepareExtractContext(world, {
        ...assets !== void 0 ? { assets } : {},
        ...pipelineState !== void 0 ? { pipelineState } : {},
        resourceOwnerFog: wi === resourceOwner ? resourceOwnerFog : null,
        ...materialSnapshotCachesByWorld === void 0 ? {} : {
          materialSnapshotContexts: materialSnapshotCachesByWorld.get(worldRenderResources(world)) ?? (() => {
            const cache = /* @__PURE__ */ new Map();
            materialSnapshotCachesByWorld.set(worldRenderResources(world), cache);
            return cache;
          })()
        },
        ...options.materialContext === void 0 ? {} : { materialContext: options.materialContext },
        cull: options.cull === "none" ? "none" : isCameraOwner ? "self" : "external",
        renderables: renderableMode,
        ...isCameraOwner && cameraEntityKey !== void 0 ? { cameraEntityKey } : {},
        ...isCameraOwner && options.viewExtent !== void 0 ? { viewExtent: options.viewExtent } : {},
        ...partialEntitiesByWorld?.[wi] === void 0 ? {} : { renderableEntities: partialEntitiesByWorld[wi] },
        retainHidden,
        ...options.preparationMesh?.world === world ? { preparationMesh: options.preparationMesh } : {},
        worldId: wi,
        ...options.getMaterialShaderArtifact === void 0 ? {} : { getMaterialShaderArtifact: options.getMaterialShaderArtifact },
        ...options.instanceCollections === void 0 ? {} : { instanceCollections: options.instanceCollections },
        ...cameraOwnerFrame2 === void 0 ? {} : { cullCameras: cameraOwnerFrame2.cameras }
      });
      const frame = extractFrame(world, prepared);
      framesByWorld.set(wi, frame);
    } catch (err8) {
      if (err8 instanceof MotionBlurValidationError || err8 instanceof ProjectedDecalInvalidError)
        throw err8;
      try {
        createWorldInternalView(world)._routeError(err8, {
          severity: Severity.Error,
          systemName: `RenderSystem.extractFrames(world[${wi}])`
        });
      } catch {
      }
    }
  }
  if (skinPaletteAllocator !== null && reconcileSkinFrame) {
    skinPaletteAllocator.endFrame();
  }
  for (let wi = 0; wi < worlds.length; wi++) {
    const frame = framesByWorld.get(wi);
    if (frame === void 0) continue;
    succeededFrames.push(frame);
    succeededIndices.push(wi);
  }
  const renderables = [];
  const dispatchEntries = [];
  const visibilitySnapshots = [];
  const featureVisibilitySnapshots = [];
  const hiddenEntityReports = [];
  for (let fi = 0; fi < succeededFrames.length; fi++) {
    const f = succeededFrames[fi];
    const wId = succeededIndices[fi];
    if (f === void 0 || wId === void 0) continue;
    const base = renderables.length;
    const visibilitySnapshot = f.visibilitySnapshots[0];
    const world = worlds[wId];
    if (visibilitySnapshot !== void 0) {
      visibilitySnapshots.push(visibilitySnapshot);
      if (world !== void 0)
        featureVisibilitySnapshots.push({ world, snapshot: visibilitySnapshot });
    }
    hiddenEntityReports.push(...f.hiddenEntityReports);
    for (const r of f.renderables) {
      renderables.push({
        ...r,
        worldId: wId,
        ...r.pointsLines === void 0 ? {} : { pointsLines: { ...r.pointsLines, worldId: wId } }
      });
    }
    for (const d of f.dispatch) {
      dispatchEntries.push({ ...d, renderableIndex: (d.renderableIndex ?? 0) + base });
    }
  }
  dispatchEntries.sort((a, b) => (a.queue ?? 0) - (b.queue ?? 0));
  const point = [];
  const spot = [];
  const rect = [];
  let nextIesSlice = 0;
  let directional;
  let directionalCount = 0;
  let lightViewProj;
  let splitPlanes;
  let cascadeCount;
  let cascadeBlend;
  let shadowMapSize;
  let depthBias;
  let normalBias;
  let directionalShadowQuality;
  let directionalShadowError;
  const pointShadow = [];
  let directionalCsmConfig;
  let directionalCsmDirection;
  for (let fi = 0; fi < succeededFrames.length; fi += 1) {
    const f = succeededFrames[fi];
    const wId = succeededIndices[fi] ?? 0;
    if (f === void 0) continue;
    const iesSlices = /* @__PURE__ */ new Map();
    const withIesSlice = (light) => {
      const handle = light.iesProfileHandle;
      if (handle === void 0 || light.iesProfileData === void 0) return light;
      if (!iesSlices.has(handle)) {
        const slice2 = nextIesSlice < IES_SLICE_CAPACITY ? nextIesSlice++ : void 0;
        iesSlices.set(handle, slice2);
        const world = worlds[wId];
        if (slice2 === void 0 && world !== void 0) {
          createWorldInternalView(world)._routeError(
            createLightResourceUnavailable({
              entity: "entity" in light ? light.entity ?? 0 : 0,
              feature: "ies",
              generation: 0,
              sourceKey: `${wId}:${handle}`,
              reason: "capacity",
              expected: `at most ${IES_SLICE_CAPACITY} distinct IES profiles per composition`,
              actual: "IES array capacity exhausted",
              hint: "share profiles or reduce distinct profiles; excess modifiers are identity"
            }),
            { severity: Severity.Error, systemName: "RenderSystem.extract (ies-profile)" }
          );
        }
      }
      const slice = iesSlices.get(handle);
      return { ...light, iesProfileSlice: slice };
    };
    for (const p of f.lights.point) point.push({ ...withIesSlice(p), worldId: wId });
    for (const s of f.lights.spot) spot.push({ ...withIesSlice(s), worldId: wId });
    for (const r of f.lights.rect) rect.push(withIesSlice(r));
    for (const ps of f.lights.pointShadow) pointShadow.push({ ...ps, worldId: wId });
    if (directional === void 0 && f.lights.directional !== void 0) {
      directional = f.lights.directional;
      lightViewProj = f.lights.lightViewProj;
      splitPlanes = f.lights.splitPlanes;
      cascadeCount = f.lights.cascadeCount;
      cascadeBlend = f.lights.cascadeBlend;
      shadowMapSize = f.lights.shadowMapSize;
      depthBias = f.lights.depthBias;
      normalBias = f.lights.normalBias;
      directionalShadowQuality = f.lights.directionalShadowQuality;
      directionalShadowError = f.lights.directionalShadowError;
      directionalCsmConfig = f.lights.directionalCsmConfig;
      directionalCsmDirection = f.lights.directionalCsmDirection;
    }
    directionalCount += f.lights.directionalCount;
  }
  let cameraOwnerFrame;
  let resourceOwnerFrame;
  for (let fi = 0; fi < succeededFrames.length; fi++) {
    if (succeededIndices[fi] === cameraOwner) cameraOwnerFrame = succeededFrames[fi];
    if (succeededIndices[fi] === resourceOwner) resourceOwnerFrame = succeededFrames[fi];
  }
  const projectedDecals = succeededFrames.flatMap(
    (frame, index) => (frame.projectedDecals ?? []).map((decal) => ({
      ...decal,
      worldId: succeededIndices[index] ?? 0
    }))
  ).sort((a, b) => a.order - b.order || a.worldId - b.worldId || a.entityKey - b.entityKey);
  const cameras = cameraOwnerFrame?.cameras.map((camera) => ({
    ...camera,
    worldId: cameraOwner,
    projectedDecals
  })) ?? [];
  const auxiliaryCameras = cameraOwnerFrame?.auxiliaryCameras.map((camera) => ({ ...camera, worldId: cameraOwner })) ?? [];
  const cubeCameras = cameraOwnerFrame !== void 0 ? [...cameraOwnerFrame.cubeCameras] : [];
  const mergeCam = cameras[0];
  if (directionalCsmConfig !== void 0 && directionalCsmDirection !== void 0) {
    const csm = computeDirectionalCsm(directionalCsmDirection, directionalCsmConfig, mergeCam);
    if (csm !== null) {
      lightViewProj = csm.lightViewProj;
      splitPlanes = csm.splitPlanes;
      cascadeCount = csm.cascadeCount;
      cascadeBlend = csm.cascadeBlend;
      shadowMapSize = csm.shadowMapSize;
      directionalShadowQuality = csm.directionalShadowQuality;
    }
  }
  const lights = {
    directional,
    directionalCount,
    point,
    spot,
    rect,
    lightViewProj,
    splitPlanes,
    cascadeCount,
    cascadeBlend,
    shadowMapSize,
    depthBias,
    normalBias,
    directionalShadowQuality,
    directionalShadowError,
    pointShadow,
    directionalCsmConfig,
    directionalCsmDirection
  };
  const volumetricFog = resourceOwnerFrame?.volumetricFog;
  const cloudLayer = resourceOwnerFrame?.cloudLayer;
  const skylight = resourceOwnerFrame?.skylight;
  const skylightCount = resourceOwnerFrame?.skylightCount ?? 0;
  const skybox = resourceOwnerFrame?.skybox;
  const skyboxCount = resourceOwnerFrame?.skyboxCount ?? 0;
  const fog = resourceOwnerFrame?.fog;
  const fogFailure = resourceOwnerFrame?.fogFailure;
  const environment = resourceOwnerFrame?.environment;
  const lightProbes = succeededFrames.flatMap((frame, index) => {
    const worldId = succeededIndices[index] ?? 0;
    return (frame.lightProbes ?? []).map((probe) => ({ ...probe, worldId }));
  });
  const postProcessParams = new Map(resourceOwnerFrame?.postProcessParams);
  const OUTPUT_TRANSFORM_PARAM_KEY = STANDARD_OUTPUT_TRANSFORM_FEATURE_ID;
  const cameraTonemapParam = cameraOwnerFrame?.postProcessParams.get(OUTPUT_TRANSFORM_PARAM_KEY);
  if (cameraTonemapParam !== void 0) {
    postProcessParams.set(OUTPUT_TRANSFORM_PARAM_KEY, cameraTonemapParam);
  } else {
    postProcessParams.delete(OUTPUT_TRANSFORM_PARAM_KEY);
  }
  const frustumStats = {
    culled: succeededFrames.reduce((s, f) => s + f.frustumStats.culled, 0),
    total: succeededFrames.reduce((s, f) => s + f.frustumStats.total, 0)
  };
  const visibilityStats = {
    explicitlyHidden: succeededFrames.reduce((s, f) => s + f.visibilityStats.explicitlyHidden, 0)
  };
  const materialTextureSources = {
    sourceFieldsVisited: 0,
    producerRoutes: {}
  };
  for (const frame of succeededFrames) {
    const stats = frame.materialTextureSources;
    if (stats === void 0) continue;
    materialTextureSources.sourceFieldsVisited += stats.sourceFieldsVisited;
    for (const [route, count] of Object.entries(stats.producerRoutes)) {
      materialTextureSources.producerRoutes[route] = (materialTextureSources.producerRoutes[route] ?? 0) + count;
    }
  }
  const reflectionProbes = succeededFrames.flatMap((f, index) => {
    const worldId = succeededIndices[index] ?? 0;
    return (f.reflectionProbes ?? []).map((probe) => ({ ...probe, worldId }));
  });
  return {
    projectedDecals,
    cameras,
    auxiliaryCameras,
    cubeCameras,
    reflectionProbes,
    lights,
    ...volumetricFog === void 0 ? {} : { volumetricFog: { ...volumetricFog, worldId: resourceOwner } },
    ...cloudLayer === void 0 ? {} : { cloudLayer },
    renderables,
    dispatch: dispatchEntries,
    skylight,
    skylightCount,
    lightProbes,
    skybox,
    skyboxCount,
    fog,
    ...fogFailure === void 0 ? {} : { fogFailure },
    environment,
    environmentReady: resourceOwnerFrame !== void 0 && environment !== void 0,
    frustumStats,
    visibilityStats,
    materialTextureSources,
    postProcessParams,
    visibilitySnapshots,
    featureVisibilitySnapshots,
    hiddenEntityReports
  };
}
function morphSnapshotFor(mesh, weights) {
  const targets = mesh.morphTargets;
  if (targets === void 0 || targets.length === 0 || weights === void 0) return void 0;
  if (weights.length !== targets.length) return void 0;
  const firstPositions = targets[0]?.position;
  if (firstPositions === void 0 || firstPositions.length === 0 || firstPositions.length % 3 !== 0) {
    return void 0;
  }
  const vertexCount = firstPositions.length / 3;
  if (mesh.vertices.length % vertexCount !== 0) return void 0;
  for (let targetIndex = 0; targetIndex < targets.length; targetIndex += 1) {
    const target = targets[targetIndex];
    if (target?.position?.length !== firstPositions.length) return void 0;
  }
  const copied = new Float32Array(weights.length);
  for (let index = 0; index < weights.length; index += 1) {
    const weight = weights[index] ?? Number.NaN;
    if (!Number.isFinite(weight)) return void 0;
    copied[index] = weight;
  }
  if (copied.every((weight) => weight === 0)) return void 0;
  return { weights: copied, targetCount: targets.length };
}
function extractFrame(world, context) {
  const {
    assets: contextAssets,
    pipelineState,
    materialSnapshotContexts,
    cull: cullMode,
    resourceOwnerFog,
    getMaterialShaderArtifact,
    instanceCollections,
    renderableEntities,
    retainHidden
  } = context;
  const assets = world.assets === void 0 ? contextAssets : runtimeAssetRegistry(world.assets);
  const skinComponent = world.components.resolve(Skin.name) ?? Skin;
  const fog = resourceOwnerFog === void 0 ? selectFogFrame(world) : resourceOwnerFog ?? void 0;
  const fogFailure = fogState(world).failure;
  const visibility = context.visibility.hasAnyHiddenIntent ? context.visibility : void 0;
  const skinPaletteAllocator = pipelineState?.skinPaletteAllocator ?? null;
  const materialTextureSourceStats = {
    sourceFieldsVisited: 0,
    producerRoutes: {}
  };
  const worldInternal = createWorldInternalView(world);
  const admitSkinMaterial = (entity, hasSkin, skeleton, shader, selections, mesh) => {
    const wantsSkin = selections?.some(materialProgramSelectionRequiresSkin) === true || isStandardPbrSkinMaterialShader(shader);
    if (hasSkin && skeleton !== void 0 && skeleton !== 0 && !wantsSkin) {
      worldInternal._routeError(new SkinMaterialMismatchError(entity, shader), {
        severity: Severity.Error,
        systemName: "RenderSystem.extract (skin-material-mismatch)"
      });
      return false;
    }
    if (wantsSkin && mesh !== void 0 && mesh !== 0) {
      const current = runtimeAssets4(world.assets).resolveAsset(
        mesh
      );
      if (current.ok) {
        const indices = current.value.attributes.skinIndex !== void 0;
        const weights = current.value.attributes.skinWeight !== void 0;
        if (!indices || !weights) {
          const missing = !indices && !weights ? "both" : !indices ? "skinIndex" : "skinWeight";
          worldInternal._routeError(new MaterialSkinAttrMissingError(entity, missing), {
            severity: Severity.Error,
            systemName: "RenderSystem.extract (material-skin-attr-missing)"
          });
          return false;
        }
      }
    }
    return true;
  };
  const {
    cameras,
    auxiliaryCameras,
    cubeCameras,
    reflectionProbes,
    lights,
    environment,
    volumetricFog,
    cloudLayer,
    skylight,
    skylightCount,
    lightProbes,
    skybox,
    skyboxCount
  } = extractWorldEnvironment(world, context, worldInternal, fog);
  const projectedDecals = extractProjectedDecals(world, context);
  for (const [i, camera] of cameras.entries()) cameras[i] = { ...camera, projectedDecals };
  const shadowFrusta = cullMode === "none" ? [] : buildShadowFrusta(lights);
  const cullingCameras = cullMode === "external" ? context.cullCameras ?? [] : cameras;
  const frustumPlanes = cullMode === "none" ? [] : buildCameraFrusta(cullingCameras);
  const renderables = [];
  let frustumCulled = 0;
  let frustumTotal = 0;
  const explicitlyHidden = /* @__PURE__ */ new Set();
  let dispatch = [];
  const materialCaches = /* @__PURE__ */ new Map();
  void SpriteRegionOverride;
  const meshRendererQuery = context.renderables === "none" ? [] : world.query({
    read: [MeshRenderer],
    optional: [
      Transform5,
      GlobalTransform5,
      MeshFilter,
      Instances,
      skinComponent,
      Layer,
      MorphWeights,
      SpriteRegionOverride,
      SpriteInstances,
      Points,
      Lines,
      SortKey
    ]
  }).unwrap();
  const resolveArchVersion = (entity) => {
    const values = [
      worldInternal._getArrayView(entity, SpriteInstances, "transforms"),
      worldInternal._getArrayView(entity, SpriteInstances, "regions")
    ];
    let hash = 2166136261;
    for (const value of values) {
      hash = Math.imul(hash ^ (value?.length ?? 0), 16777619) >>> 0;
      if (value === void 0) continue;
      for (let index = 0; index < value.length; index += 1) {
        hash = Math.imul(hash ^ Math.fround(value[index] ?? 0), 16777619) >>> 0;
      }
    }
    return hash;
  };
  const flushPendingDispatch = (pending) => {
    for (const entry of pending) dispatch.push(entry);
  };
  const requestedRows = renderableEntities === void 0 ? meshRendererQuery : {
    *[Symbol.iterator]() {
      for (const entity of renderableEntities) {
        const row = meshRendererQuery.at(entity);
        if (row !== void 0) yield row;
      }
    }
  };
  for (const row of requestedRows) {
    const lightingChannels = world[worldRead].getFieldValue(
      row.entity,
      MeshRenderer,
      "lightingChannels"
    );
    const channelsError = validateChannelMask(lightingChannels);
    if (channelsError !== null) {
      worldInternal._routeError(channelsError, {
        severity: Severity.Error,
        systemName: "RenderSystem.extract (lighting-channels)"
      });
      continue;
    }
    const preparationMesh = context.preparationMesh?.entity === row.entity ? context.preparationMesh : void 0;
    const preparePipelines = preparationMesh !== void 0 || world[worldRead].getFieldValue(row.entity, MeshRenderer, "preparePipelines") === 1;
    const hasTransform = row.has(Transform5);
    const meshFilter = row.get(MeshFilter);
    const hasInstances = row.has(Instances);
    const skin = row.get(skinComponent);
    const morphWeightsView = worldInternal._getArrayView(row.entity, MorphWeights, "weights");
    const hasMeshFilter = meshFilter !== void 0;
    const hasSkin = skin !== void 0;
    const capsuleShadowRequested = world.hasComponent(row.entity, CapsuleShadow);
    const participationRead = world.hasComponent(row.entity, ShadowParticipation) ? world.get(row.entity, ShadowParticipation) : void 0;
    const shadowChannelsError = participationRead?.ok ? validateChannelMask(participationRead.value.channels, "shadowChannels") : null;
    if (shadowChannelsError !== null) {
      worldInternal._routeError(shadowChannelsError, {
        severity: Severity.Error,
        systemName: "RenderSystem.extract (shadow-channels)"
      });
      continue;
    }
    const shadowCastDisabled = participationRead?.ok === true && participationRead.value.cast === false;
    const shadowReceiveDisabled = participationRead?.ok === true && participationRead.value.receive === false;
    const mobilityRead = world.hasComponent(row.entity, Mobility) ? world.get(row.entity, Mobility) : void 0;
    const mobilityStatic = mobilityRead?.ok === true && mobilityRead.value.kind === MobilityKindValue.static;
    const hasSpriteInstances = row.has(SpriteInstances);
    const points = row.get(Points);
    const lines = row.get(Lines);
    const sortKey = row.get(SortKey)?.value;
    const pointsLinesComponent = points !== void 0 ? "Points" : lines !== void 0 ? "Lines" : void 0;
    const isRenderable = hasTransform && hasMeshFilter;
    const fAssetHandle = preparationMesh?.meshHandle ?? meshFilter?.assetHandle;
    const fLayerValue = row.get(Layer)?.value;
    const hasSpriteRegionOverride = row.has(SpriteRegionOverride);
    const skinSkeletonView = skin?.skeleton;
    let archVersion = 0;
    if (hasInstances || hasSpriteInstances) {
      archVersion = resolveArchVersion(row.entity);
    }
    {
      const entity = row.entity;
      const authorVisible = !(isRenderable && visibility?.effective(entity) === "hidden");
      if (!authorVisible) explicitlyHidden.add(entity);
      if (!authorVisible && !retainHidden) {
        continue;
      }
      if (isRenderable && fAssetHandle === 0) {
        continue;
      }
      const layerVal = fLayerValue ?? 0;
      const pendingDispatch = [];
      const materialsView = worldInternal._getArrayView(entity, MeshRenderer, "materials");
      const materialCount = materialsView?.length ?? 0;
      let materialHandles = Array.from(materialsView ?? []);
      let materialBindingSources = materialHandles.map(
        () => "renderer-override"
      );
      let materialBindingDiagnostics = [];
      let gpuDrivenMesh;
      const fAssetHandleVal = fAssetHandle;
      if (fAssetHandleVal !== void 0 && fAssetHandleVal !== 0 && assets !== void 0 && assets !== null) {
        const meshHandle = fAssetHandleVal;
        const meshRes = preparationMesh === void 0 ? runtimeAssets4(world.assets).resolveAsset(meshHandle) : ok14(preparationMesh.mesh);
        if (meshRes.ok && meshRes.value.kind === "mesh") {
          const meshAsset = meshRes.value;
          const guid = meshRes.value.guid ?? "<no-guid>";
          gpuDrivenMesh = meshAsset;
          if (!Array.isArray(meshAsset.materialSlots) && world.get(entity, GlyphText).ok) {
          }
          const resolvedBindings = resolveMeshMaterialBindings(meshAsset, materialsView ?? [], {
            isValidOverride(handle) {
              const resolved = runtimeAssets4(world.assets).resolveAsset(
                handle
              );
              return resolved.ok && resolved.value.kind === "material";
            },
            resolveMeshDefault(defaultGuid) {
              return resolveRuntimeAssetReference(
                worldRenderResources(world),
                defaultGuid,
                "material"
              );
            }
          });
          if (!resolvedBindings.ok) {
            if (resolvedBindings.code === "mesh-material-slots-missing") {
              worldInternal._routeError(
                new AssetError3({
                  code: "load-failed",
                  expected: "every MeshAsset producer supplies materialSlots[]",
                  hint: `fix the MeshAsset producer; renderer inheritance never guesses slot topology (mesh=${guid}, entity=${entity}, vertices=${meshAsset.vertices.length}, indices=${meshAsset.indices?.length ?? 0})`,
                  detail: {
                    referencedByGuid: guid,
                    referencedByKind: "mesh",
                    subAssetGuid: "<material-slots-missing>",
                    sourceField: { fieldName: "materialSlots" }
                  }
                }),
                {
                  severity: Severity.Error,
                  systemName: "RenderSystem.extract (mesh-material-slots-missing)"
                }
              );
              continue;
            }
            const materialGuid = typeof resolvedBindings.defaultMaterial === "number" ? String(resolvedBindings.defaultMaterial) : AssetGuid.format(resolvedBindings.defaultMaterial);
            worldInternal._routeError(
              new AssetError3({
                code: "load-failed",
                expected: `MeshAsset materialSlots[${resolvedBindings.slotIndex}] default ${materialGuid} is ready and a MaterialAsset`,
                hint: `assets.load(meshGuid, 'mesh') must recursively load the declared default material; mesh=${guid}, slot=${resolvedBindings.slotIndex}, material=${materialGuid}`,
                detail: {
                  referencedByGuid: guid,
                  referencedByKind: "mesh",
                  subAssetGuid: materialGuid,
                  sourceField: {
                    fieldName: "materialSlots",
                    arrayIndex: resolvedBindings.slotIndex
                  }
                }
              }),
              {
                severity: Severity.Error,
                systemName: "RenderSystem.extract (mesh-default-not-ready)"
              }
            );
            continue;
          }
          materialHandles = resolvedBindings.bindings.map((binding) => binding.handle);
          materialBindingSources = resolvedBindings.bindings.map((binding) => binding.source);
          materialBindingDiagnostics = resolvedBindings.diagnostics.map((diagnostic) => ({
            ...diagnostic,
            detail: diagnostic.code === "mesh-renderer-material-override-overflow" ? {
              expectedCount: meshAsset.materialSlots.length,
              actualCount: materialCount,
              meshAssetGuid: guid
            } : {
              meshAssetGuid: guid,
              slotIndex: diagnostic.slotIndex,
              handle: diagnostic.handle ?? 0
            }
          }));
          for (const diagnostic of resolvedBindings.diagnostics) {
            worldInternal._routeError(
              new AssetError3({
                code: diagnostic.code,
                expected: diagnostic.code === "mesh-renderer-material-override-overflow" ? `materials.length <= materialSlots.length (${meshAsset.materialSlots.length})` : `materials[${diagnostic.slotIndex}] resolves to a live MaterialAsset`,
                hint: ASSET_ERROR_HINTS[diagnostic.code],
                detail: diagnostic.code === "mesh-renderer-material-override-overflow" ? {
                  expectedCount: meshAsset.materialSlots.length,
                  actualCount: materialCount,
                  meshAssetGuid: guid
                } : {
                  meshAssetGuid: guid,
                  slotIndex: diagnostic.slotIndex,
                  handle: diagnostic.handle ?? 0
                }
              }),
              {
                severity: Severity.Warning,
                systemName: `RenderSystem.extract (${diagnostic.code})`
              }
            );
          }
        }
      }
      if (materialHandles.length === 0) {
        materialHandles = [0];
        materialBindingSources = ["engine-default"];
      }
      const vertexColorAvailable = gpuDrivenMesh?.attributes.color !== void 0;
      const geometry = hasSkin ? "skinned" : hasSpriteInstances ? "sprite-instances" : "mesh";
      const cacheKey = `${geometry}:${vertexColorAvailable}`;
      let geometryMaterialCache = materialCaches.get(cacheKey);
      if (geometryMaterialCache === void 0) {
        geometryMaterialCache = /* @__PURE__ */ new Map();
        materialCaches.set(cacheKey, geometryMaterialCache);
      }
      const geometryPersistentCache = materialSnapshotContext(
        materialSnapshotContexts,
        geometry,
        vertexColorAvailable
      );
      const geometryMaterialContext = context.materialContext === void 0 ? void 0 : { ...context.materialContext, geometry };
      const handleRaw = materialHandles[0] ?? 0;
      const cachedCandidate = handleRaw !== 0 ? geometryMaterialCache.get(handleRaw) : void 0;
      const cachedMaterial = cachedCandidate;
      let materialSnap;
      let materialProgramSelections;
      if (cachedMaterial !== void 0) {
        materialSnap = cachedMaterial.snapshot;
        materialProgramSelections = cachedMaterial.programSelections;
        if (hasSkin && !admitSkinMaterial(
          entity,
          hasSkin,
          skinSkeletonView,
          materialSnap.materialShaderId,
          materialProgramSelections,
          fAssetHandleVal
        ))
          continue;
        if (isRenderable) {
          appendMaterialDispatchEntries(
            pendingDispatch,
            cachedMaterial.snapshot.passes,
            entity,
            handleRaw,
            renderables.length,
            layerVal,
            0,
            materialSnap.materialProgramKeys
          );
        }
      } else if (handleRaw === 0 || assets === void 0 || assets === null) {
        materialSnap = defaultMaterialSnapshot(handleRaw);
      } else {
        const tagged = handleRaw;
        const stableCandidate = readPersistentMaterialSnapshot(
          geometryPersistentCache,
          handleRaw,
          worldRenderResources(world)
        );
        const stablePersistentCached = stableCandidate;
        if (stablePersistentCached !== void 0) {
          geometryMaterialCache.set(handleRaw, stablePersistentCached);
          materialSnap = stablePersistentCached.snapshot;
          materialProgramSelections = stablePersistentCached.programSelections;
          if (hasSkin && !admitSkinMaterial(
            entity,
            hasSkin,
            skinSkeletonView,
            materialSnap.materialShaderId,
            materialProgramSelections,
            fAssetHandleVal
          ))
            continue;
          if (isRenderable) {
            appendMaterialDispatchEntries(
              pendingDispatch,
              stablePersistentCached.snapshot.passes,
              entity,
              handleRaw,
              renderables.length,
              layerVal,
              0,
              materialSnap.materialProgramKeys
            );
          }
        } else {
          const res = runtimeAssets4(world.assets).resolveAsset(tagged);
          if (!res.ok) {
            if (isRenderable) {
              const rhiErr = new RhiError4({
                code: "asset-not-registered",
                expected: "MeshRenderer.material in AssetRegistry",
                hint: "bind a live material reference from the same asset owner via assets.load or assets.create",
                detail: { assetHandle: handleRaw }
              });
              worldInternal._routeError(rhiErr, {
                severity: Severity.Error,
                systemName: "RenderSystem.extract (material asset-not-registered)"
              });
            }
            continue;
          }
          const asset = res.value;
          if (asset.kind !== "material") {
            materialSnap = defaultMaterialSnapshot(handleRaw);
          } else {
            const programOwner = asset;
            const allPasses = programOwner.passes ?? [];
            const materialContext = geometryMaterialContext;
            try {
              materialProgramSelections = materialProgramSelectionsForMaterial(
                programOwner,
                assets,
                materialContext,
                "direct",
                vertexColorAvailable
              );
            } catch (error) {
              if (isMissingMaterialProgram(error) && materialContext?.geometry === "mesh") {
                try {
                  const skinnedSelections = materialProgramSelectionsForMaterial(
                    programOwner,
                    assets,
                    {
                      ...materialContext,
                      geometry: "skinned"
                    },
                    "direct",
                    vertexColorAvailable
                  );
                  if (skinnedSelections?.some(materialProgramSelectionRequiresSkin) === true && gpuDrivenMesh !== void 0) {
                    const hasSkinIndex = gpuDrivenMesh.attributes.skinIndex !== void 0;
                    const hasSkinWeight = gpuDrivenMesh.attributes.skinWeight !== void 0;
                    if (!hasSkinIndex || !hasSkinWeight) {
                      const missing = !hasSkinIndex && !hasSkinWeight ? "both" : !hasSkinIndex ? "skinIndex" : "skinWeight";
                      worldInternal._routeError(new MaterialSkinAttrMissingError(entity, missing), {
                        severity: Severity.Error,
                        systemName: "RenderSystem.extract (material-skin-attr-missing)"
                      });
                      continue;
                    }
                  }
                } catch {
                }
              }
              throw error;
            }
            materialSnap = prepareMaterialSnapshot({
              handle: handleRaw,
              world: worldRenderResources(world),
              assets,
              material: programOwner,
              programSelections: materialProgramSelections,
              materialContext,
              textureSourceStats: materialTextureSourceStats,
              vertexColorAvailable,
              geometry
            });
            if (!admitSkinMaterial(
              entity,
              hasSkin,
              skinSkeletonView,
              materialSnap.materialShaderId,
              materialProgramSelections,
              fAssetHandleVal
            ))
              continue;
            {
              const stored = storeMaterialSnapshot(
                geometryPersistentCache ?? geometryMaterialCache,
                handleRaw,
                materialSnap,
                worldRenderResources(world),
                materialProgramSelections
              );
              materialSnap = stored.snapshot;
              geometryMaterialCache.set(handleRaw, stored);
              geometryPersistentCache?.set(handleRaw, stored);
            }
            if (isRenderable) {
              appendMaterialDispatchEntries(
                pendingDispatch,
                allPasses,
                entity,
                handleRaw,
                renderables.length,
                layerVal,
                0,
                materialSnap.materialProgramKeys
              );
            }
          }
        }
      }
      if (isRenderable && handleRaw === 0) {
        const shadowCasterTags = { LightMode: "ShadowCaster" };
        const nextRenderableIndex = renderables.length;
        pendingDispatch.push({
          entityIndex: entity,
          materialHandle: 0,
          renderableIndex: nextRenderableIndex,
          passIndex: 0,
          queue: 2e3,
          layer: layerVal,
          ...participationRead?.ok && participationRead.value.channels !== 4294967295 ? { shadowChannels: participationRead.value.channels } : {},
          tags: shadowCasterTags,
          renderState: void 0,
          defines: void 0,
          vertexEntry: "vs_main",
          fragmentEntry: void 0,
          materialShaderId: "forgeax::default-shadow-caster"
        });
        appendMaterialDispatchEntries(
          pendingDispatch,
          [DEFAULT_FORWARD_PASS],
          entity,
          0,
          nextRenderableIndex,
          layerVal,
          1
        );
      }
      if (isRenderable) {
        let skinSlice;
        let skinPose;
        let posedCapsules;
        let skeletonHasCapsules = false;
        const skinIdentity = hasSkin ? skinPaletteIdentity(world, entity) : void 0;
        const releaseSkinIdentity = () => {
          if (skinIdentity !== void 0) {
            skinPaletteAllocator?.releasePersistentSlice(skinIdentity);
          }
        };
        if (hasSkin) {
          const skeletonHandleRaw = skinSkeletonView;
          if (skeletonHandleRaw !== void 0 && skeletonHandleRaw !== 0 && assets !== void 0 && assets !== null) {
            if (hasInstances) {
              worldInternal._routeError(new SkinInstancesCoexistForbiddenError(entity), {
                severity: Severity.Error,
                systemName: "RenderSystem.extract (skin-instances-coexist)"
              });
              releaseSkinIdentity();
              continue;
            }
            const skeletonHandle = skeletonHandleRaw;
            const skeletonRes = runtimeAssets4(world.assets).resolveAsset(
              skeletonHandle
            );
            if (!skeletonRes.ok || skeletonRes.value.kind !== "skeleton") {
              worldInternal._routeError(new SkeletonResolveFailedError(entity, skeletonHandleRaw), {
                severity: Severity.Error,
                systemName: "RenderSystem.extract (skeleton-resolve-failed)"
              });
              releaseSkinIdentity();
              continue;
            }
            const skeleton = skeletonRes.value;
            const skinJoints = skin?.joints;
            if (skinJoints === void 0) {
              releaseSkinIdentity();
              continue;
            }
            const jointsLength = skinJoints.length;
            if (jointsLength !== skeleton.jointCount) {
              worldInternal._routeError(
                new JointCountMismatchError(entity, skeleton.jointCount, jointsLength),
                {
                  severity: Severity.Error,
                  systemName: "RenderSystem.extract (joint-count-mismatch)"
                }
              );
              releaseSkinIdentity();
              continue;
            }
            const jointWorlds = new Array(skeleton.jointCount);
            const jointWorldStorage = new Float32Array(skeleton.jointCount * 16);
            let jointDangling = -1;
            for (let jIdx = 0; jIdx < skeleton.jointCount; jIdx++) {
              const jointEntityRaw = skinJoints[jIdx] ?? 0;
              const jointEntity = jointEntityRaw;
              const jointWorld = readPresentationWorldMatrix5(world, jointEntity);
              if (jointWorld === void 0) {
                jointDangling = jIdx;
                break;
              }
              const jointWorldMat = mat49.view(jointWorldStorage, jIdx);
              jointWorldMat.set(jointWorld);
              jointWorlds[jIdx] = jointWorldMat;
            }
            if (jointDangling >= 0) {
              worldInternal._routeError(new JointEntityDanglingError(entity, jointDangling), {
                severity: Severity.Error,
                systemName: "RenderSystem.extract (joint-entity-dangling)"
              });
              releaseSkinIdentity();
              continue;
            }
            const ibmFlat = skeleton.inverseBindMatrices;
            const ibms = new Array(skeleton.jointCount);
            for (let jIdx = 0; jIdx < skeleton.jointCount; jIdx++) {
              ibms[jIdx] = ibmFlat.subarray(jIdx * 16, jIdx * 16 + 16);
            }
            if (capsuleShadowRequested && skeleton.shadowCapsules !== void 0) {
              skeletonHasCapsules = true;
              posedCapsules = poseShadowCapsules(skeleton.shadowCapsules, ibms, jointWorlds);
            }
            skinPose = {
              identity: skinPaletteIdentity(world, entity),
              generation: (skeletonHandleRaw >>> 0 ^ skeleton.jointCount) >>> 0,
              jointCount: skeleton.jointCount,
              inverseBindMatrices: ibms,
              jointWorlds
            };
          }
        }
        if (skinSlice === void 0 && skinPose === void 0 && hasSkin) {
          releaseSkinIdentity();
          if (materialSnap.materialShaderId === "forgeax::pbr-skin" || materialProgramSelections?.some(materialProgramSelectionRequiresSkin) === true) {
            pendingDispatch.length = 0;
            continue;
          }
        }
        const worldView = readPresentationWorldMatrix5(world, entity);
        if (worldView === void 0) {
          releaseSkinIdentity();
          continue;
        }
        const worldMat = new Float32Array(worldView);
        const transformSnap = { world: worldMat };
        const materialsArr = [materialSnap];
        if (assets !== void 0 && assets !== null) {
          for (let mi = 1; mi < materialHandles.length; mi++) {
            const subHandle = materialHandles[mi] ?? 0;
            const subCache = geometryMaterialCache;
            const cachedSubmaterial = subCache.get(subHandle);
            materialsArr.push(
              cachedSubmaterial?.snapshot ?? resolveMaterialSnapshot(
                subHandle,
                worldRenderResources(world),
                assets,
                subCache,
                geometryPersistentCache,
                geometryMaterialContext,
                materialTextureSourceStats,
                vertexColorAvailable
              )
            );
          }
        }
        if (isRenderable && assets !== void 0 && assets !== null) {
          for (let mi = 1; mi < materialHandles.length; mi++) {
            const subHandle = materialHandles[mi] ?? 0;
            if (subHandle === handleRaw) continue;
            const subEntry = geometryMaterialCache.get(subHandle) ?? readPersistentMaterialSnapshot(
              geometryPersistentCache,
              subHandle,
              worldRenderResources(world)
            );
            appendMaterialDispatchEntries(
              pendingDispatch,
              subEntry?.snapshot.passes ?? (subHandle === 0 ? [DEFAULT_FORWARD_PASS] : []),
              entity,
              subHandle,
              renderables.length,
              layerVal,
              0,
              materialsArr[mi]?.materialProgramKeys
            );
          }
        }
        let spriteInstancesSnap;
        if (hasSpriteInstances) {
          if (hasInstances) {
            worldInternal._routeError(
              new SpriteInstancesMutuallyExclusiveWithInstancesError(entity),
              {
                severity: Severity.Error,
                systemName: "RenderSystem.extract (sprite-instances-mutually-exclusive)"
              }
            );
            continue;
          }
          if (!materialUsesSpriteGeometry(materialSnap)) {
            worldInternal._routeError(
              new SpriteInstancesRequiresSpriteShaderError(
                entity,
                materialSnap.materialShaderId ?? "undefined"
              ),
              {
                severity: Severity.Error,
                systemName: "RenderSystem.extract (sprite-instances-requires-sprite-shader)"
              }
            );
            continue;
          }
          const transforms = worldInternal._getArrayView(entity, SpriteInstances, "transforms");
          const regions = worldInternal._getArrayView(entity, SpriteInstances, "regions");
          if (transforms !== void 0 && regions !== void 0) {
            const transformsLength = transforms.length;
            const regionsLength = regions.length;
            const tCount = transformsLength / 16;
            const rCount = regionsLength / 4;
            if (transformsLength % 16 !== 0 || regionsLength % 4 !== 0 || tCount !== rCount) {
              worldInternal._routeError(
                new SpriteInstancesCountMismatchError(transformsLength, regionsLength),
                {
                  severity: Severity.Error,
                  systemName: "RenderSystem.extract (sprite-instances-count-mismatch)"
                }
              );
              continue;
            }
            const transformsCopy = new Float32Array(transforms);
            const regionsCopy = new Float32Array(regions);
            spriteInstancesSnap = {
              transforms: transformsCopy,
              regions: regionsCopy,
              instanceCount: tCount,
              cacheKey: entity,
              archVersion
            };
          }
        }
        let localAabb;
        let lods;
        let lodHysteresis;
        let morph;
        const assetHandleRaw = Math.round(fAssetHandle ?? 0);
        if (assetHandleRaw !== 0) {
          const meshRes = preparationMesh === void 0 ? runtimeAssets4(world.assets).resolveAsset(assetHandleRaw) : ok14(preparationMesh.mesh);
          if (meshRes.ok && meshRes.value.kind === "mesh") {
            const meshAsset = meshRes.value;
            lods = meshAsset.lods;
            lodHysteresis = meshAsset.lodHysteresis;
            morph = morphSnapshotFor(meshAsset, morphWeightsView);
            if (skinPose !== void 0) {
              const bounds = skinPosedBounds(
                meshAsset,
                skinPose,
                worldMat,
                skinPosedBoundsCache(world, skinPose.identity),
                world[worldRead].getFieldValue(
                  row.entity,
                  MeshRenderer,
                  "conservativeSkinBounds"
                ) === 1
              );
              if (bounds !== void 0) skinPose = { ...skinPose, bounds };
            }
            const meshAabb = hasSkin ? skinPose?.bounds : meshAsset.aabb;
            if (morph === void 0 && isFiniteAabb(meshAabb)) {
              localAabb = new Float32Array(meshAabb);
            }
          }
        }
        if (skinPose !== void 0 && skinPaletteAllocator !== null) {
          skinSlice = prepareSkinPalette(skinPose, skinPaletteAllocator);
        }
        const displacementRadius = standardDisplacementRadius(materialsArr);
        localAabb = expandDisplacementBounds(localAabb, displacementRadius);
        if (hasSkin && displacementRadius > 0) localAabb = void 0;
        const pointsLinesStyle = points !== void 0 ? (() => {
          const shape = pointShapeFromU32(points.shape);
          return shape === void 0 ? void 0 : { kind: "points", sizePx: points.sizePx, shape };
        })() : lines === void 0 ? void 0 : {
          kind: "lines",
          width: lines.width,
          widthUnits: lines.widthUnits,
          cap: lines.cap,
          dashSize: lines.dashSize,
          gapSize: lines.gapSize,
          dashOffset: lines.dashOffset
        };
        const cullingLocalAabb = expandPointsLinesBounds(localAabb ?? [], pointsLinesStyle);
        const pointsLines = pointsLinesComponent === void 0 ? void 0 : {
          worldId: context.worldId,
          entityKey: entity,
          component: pointsLinesComponent,
          meshHandle: assetHandleRaw,
          materialHandle: handleRaw,
          style: pointsLinesStyle,
          layer: layerVal,
          ...participationRead?.ok && participationRead.value.channels !== 4294967295 ? { shadowChannels: participationRead.value.channels } : {},
          sortKey,
          visible: true,
          sourceBounds: cullingLocalAabb,
          viewport: { width: 0, height: 0, dpr: 1 },
          projection: identityProjection()
        };
        let instancesSnap;
        if (hasInstances) {
          const transforms = worldInternal._getArrayView(entity, Instances, "transforms") ?? new Float32Array();
          const projected = instanceCollections === void 0 ? validateInstanceTransforms(transforms) : instanceCollections.project(world, entity, transforms, {
            epoch: readMutationEpoch(world),
            changedSince: (since) => readArrayRangesChangedSince(world, entity, Instances, "transforms", since)
          });
          if (projected instanceof Error) {
            worldInternal._routeError(projected, {
              severity: Severity.Error,
              systemName: "RenderSystem.extract (Instances transforms)"
            });
            continue;
          }
          instancesSnap = {
            transforms: projected?.transforms ?? new Float32Array(transforms),
            instanceCount: transforms.length / 16,
            cacheKey: entity,
            archVersion: projected === void 0 ? archVersion : 0,
            ...projected === void 0 ? {} : {
              collectionId: projected.collectionId,
              revision: projected.revision,
              generations: projected.generations,
              ...projected.dirtyRanges === void 0 ? {} : { dirtyRanges: projected.dirtyRanges }
            }
          };
        }
        const baseRenderable = {
          ...hasSpriteRegionOverride ? {
            spriteRegion: spriteUvRegion(
              worldInternal._getArrayView(entity, SpriteRegionOverride, "region"),
              0,
              0
            )
          } : {},
          layer: layerVal,
          ...sortKey === void 0 ? {} : { sortKey },
          ...participationRead?.ok && participationRead.value.channels !== 4294967295 ? { shadowChannels: participationRead.value.channels } : {},
          ...shadowCastDisabled || pointsLinesComponent !== void 0 ? { shadowCaster: false } : {},
          lightingChannels,
          assetHandle: Math.round(fAssetHandle ?? 0),
          transform: transformSnap,
          ...lods === void 0 ? {} : { lods },
          ...lodHysteresis === void 0 ? {} : { lodHysteresis },
          ...localAabb !== void 0 ? { localAabb: cullingLocalAabb } : {},
          material: MaterialResource.from(materialSnap),
          materials: materialsArr.map(MaterialResource.from),
          materialBindingSources,
          materialOverrides: captureMaterialOverrides(
            Array.from(materialsView ?? [], (handle) => {
              if (handle === 0 || assets == null) return void 0;
              const current = runtimeAssets4(world.assets).resolveAsset(handle);
              if (!current.ok || current.value.kind !== "material") return void 0;
              return MaterialResource.from(
                resolveMaterialSnapshot(
                  handle,
                  worldRenderResources(world),
                  assets,
                  geometryMaterialCache,
                  geometryPersistentCache,
                  geometryMaterialContext,
                  materialTextureSourceStats,
                  vertexColorAvailable
                )
              );
            })
          ),
          materialBindingDiagnostics,
          worldId: context.worldId,
          entityKey: entity,
          ...authorVisible ? {} : { authorVisible: false },
          ...skinSlice !== void 0 ? { skin: skinSlice } : {},
          ...skinPose === void 0 ? {} : { skinPose },
          ...skin?.joints === void 0 ? {} : { skinJointEntities: Array.from(skin.joints, (joint) => Number(joint)) },
          ...morph !== void 0 ? { morph } : {},
          ...instancesSnap !== void 0 ? { instances: instancesSnap } : {},
          ...spriteInstancesSnap !== void 0 ? { spriteInstances: spriteInstancesSnap } : {},
          ...pointsLines !== void 0 ? { pointsLines } : {}
        };
        const gpuDrivenDraws = skinPose === void 0 || skinSlice !== void 0 ? buildGpuDrivenDraws({
          mesh: gpuDrivenMesh,
          materials: materialsArr,
          fallbackMaterial: materialSnap,
          deformation: baseRenderable.skin === void 0 ? "rigid" : "skin",
          ...getMaterialShaderArtifact === void 0 ? {} : { getMaterialShaderArtifact },
          ...lods === void 0 ? {} : {
            lodMeshes: lods.map((lod) => {
              const lower = renderAsset(worldRenderResources(world), lod.mesh);
              return lower?.kind === "mesh" ? lower : void 0;
            })
          }
        }) : [];
        for (const draw of gpuDrivenDraws) {
          if (draw.preparationError === void 0) continue;
          worldInternal._routeError(draw.preparationError, {
            severity: Severity.Error,
            systemName: `RenderSystem.extract (gpu-driven-preparation:${draw.preparationError.code})`
          });
        }
        const renderable = morph === void 0 && gpuDrivenDraws.length > 0 ? { ...baseRenderable, gpuDrivenDraws } : baseRenderable;
        if (shadowCastDisabled || pointsLinesComponent !== void 0) {
          for (let i = pendingDispatch.length - 1; i >= 0; i -= 1) {
            if (pendingDispatch[i]?.tags.LightMode === "ShadowCaster") pendingDispatch.splice(i, 1);
          }
        }
        const pipelinePreparation = preparePipelines ? pendingDispatch.map(
          ({ entityIndex: _entityIndex, renderableIndex: _renderableIndex, ...pass }) => pass
        ) : void 0;
        if (localAabb !== void 0) {
          const cullActive = frustumPlanes.length > 0;
          const derivedInstancesBounds = !cullActive || instancesSnap === void 0 || instancesSnap.instanceCount === 0 ? void 0 : deriveInstancesUnionBounds({
            meshAabb: cullingLocalAabb,
            entityWorld: transformSnap.world,
            transforms: instancesSnap.transforms
          });
          if (instancesSnap?.instanceCount === 0) {
          } else if (!cullActive) {
            frustumTotal += 1;
          } else if (hasInstances && (instancesSnap === void 0 || derivedInstancesBounds === void 0)) {
          } else {
            const worldAabb = box32.create();
            if (derivedInstancesBounds !== void 0) {
              worldAabb[0] = derivedInstancesBounds[0] ?? 0;
              worldAabb[1] = derivedInstancesBounds[1] ?? 0;
              worldAabb[2] = derivedInstancesBounds[2] ?? 0;
              worldAabb[3] = derivedInstancesBounds[3] ?? 0;
              worldAabb[4] = derivedInstancesBounds[4] ?? 0;
              worldAabb[5] = derivedInstancesBounds[5] ?? 0;
            } else {
              box32.transformBox3(worldAabb, cullingLocalAabb, transformSnap.world);
            }
            frustumTotal += 1;
            let visible = frustumPlanes.length === 0;
            for (let ci = 0; ci < frustumPlanes.length; ci++) {
              const planes = frustumPlanes[ci];
              if (planes.length === 0) {
                visible = true;
                break;
              }
              if (frustum4.intersectsBox(planes, worldAabb)) {
                visible = true;
                break;
              }
            }
            if (!visible) {
              frustumCulled += 1;
              const shadowVisible = shadowFrusta.length > 0 && pendingDispatch.some((entry) => entry.tags.LightMode === "ShadowCaster") && shadowFrusta.some(
                (lightPlanes) => frustum4.intersectsBox(lightPlanes, worldAabb)
              );
              if (!shadowVisible && pipelinePreparation === void 0) continue;
              for (let i = pendingDispatch.length - 1; i >= 0; i -= 1) {
                if (pendingDispatch[i]?.tags.LightMode !== "ShadowCaster") {
                  pendingDispatch.splice(i, 1);
                }
              }
            }
          }
        }
        if (!authorVisible) pendingDispatch.length = 0;
        const capsuleShadow = !capsuleShadowRequested ? void 0 : !hasSkin ? { status: "not-skinned" } : !skeletonHasCapsules || posedCapsules === void 0 ? { status: "no-shadow-capsules" } : { status: "ready", capsules: posedCapsules };
        const renderableWithShadowPasses = capsuleShadow === void 0 && !mobilityStatic && !shadowReceiveDisabled ? renderable : {
          ...renderable,
          ...capsuleShadow === void 0 ? {} : { capsuleShadow },
          ...mobilityStatic ? { mobility: "static" } : {},
          ...shadowReceiveDisabled ? { shadowReceiver: false } : {}
        };
        flushPendingDispatch(pendingDispatch);
        renderables.push(
          pipelinePreparation === void 0 ? renderableWithShadowPasses : {
            ...renderableWithShadowPasses,
            pipelinePreparation
          }
        );
      }
    }
  }
  if (context.renderables !== "none" && assets != null)
    extractTerrainSources(
      world,
      assets,
      context.materialContext,
      context.worldId,
      renderables,
      dispatch,
      renderableEntities,
      visibility,
      retainHidden,
      explicitlyHidden
    );
  if (context.renderables !== "none")
    extractGlyphSources(
      world,
      context.worldId,
      renderables,
      renderableEntities,
      visibility,
      retainHidden,
      explicitlyHidden
    );
  if (context.renderables !== "none")
    extractTilemapSources(
      world,
      context.worldId,
      renderables,
      renderableEntities,
      visibility,
      retainHidden,
      explicitlyHidden
    );
  dispatch = sortDispatchByQueue(dispatch);
  const postProcessParams = /* @__PURE__ */ new Map();
  const postProcessParamsQuery = world.query({ with: [PostProcessParams] }).unwrap();
  for (const row of postProcessParamsQuery) {
    const entity = row.entity;
    const read = world.get(entity, PostProcessParams);
    if (!read.ok) continue;
    postProcessParams.set(read.value.shader, read.value.data);
  }
  const tonemapCamera = cameras[0];
  if (tonemapCamera !== void 0) {
    postProcessParams.set(STANDARD_OUTPUT_TRANSFORM_FEATURE_ID, tonemapParams(tonemapCamera));
  }
  return {
    projectedDecals,
    cameras,
    auxiliaryCameras,
    cubeCameras,
    reflectionProbes,
    lights,
    environment,
    environmentReady: true,
    ...volumetricFog === void 0 ? {} : { volumetricFog },
    ...cloudLayer === void 0 ? {} : { cloudLayer },
    renderables,
    dispatch,
    skylight,
    skylightCount,
    lightProbes,
    skybox,
    skyboxCount,
    fog,
    ...fogFailure === void 0 ? {} : { fogFailure },
    frustumStats: { culled: frustumCulled, total: frustumTotal },
    visibilityStats: { explicitlyHidden: explicitlyHidden.size },
    materialTextureSources: materialTextureSourceStats,
    postProcessParams,
    visibilitySnapshots: [context.visibility],
    featureVisibilitySnapshots: [{ world, snapshot: context.visibility }],
    hiddenEntityReports: [...explicitlyHidden].map((entity) => ({ world, entity }))
  };
}
function identityProjection() {
  const projection = new Float32Array(16);
  projection[0] = 1;
  projection[5] = 1;
  projection[10] = 1;
  projection[15] = 1;
  return projection;
}

// sdk/engine/node_modules/@forgeax/engine-render/src/publication/programs.ts
import { runtimeMaterialShaderId as runtimeMaterialShaderId2 } from "@forgeax/engine-assets-runtime";
import { validateMaterialCookProgramContext } from "@forgeax/engine-pack/material-cook";
import { MaterialArtifactRegistry, ShaderRegistry } from "@forgeax/engine-shader";
import {
  getAdmittedParamSchemaInterface,
  isMaterialProgramAbi
} from "@forgeax/engine-types";
function validPublicationMaterialProjection(input, material, available) {
  if (input === null || typeof input !== "object") return false;
  const value = input;
  if (typeof value.materialGuid !== "string" || typeof value.specializationKey !== "string" || typeof value.artifactHash !== "string" || !Number.isSafeInteger(value.publicationGeneration) || Number(value.publicationGeneration) < 0 || !Array.isArray(value.staticSelection) || !value.staticSelection.every((item2) => typeof item2 === "string") || !Array.isArray(value.passes) || value.runtimeValues === null || typeof value.runtimeValues !== "object")
    return false;
  const passes2 = /* @__PURE__ */ new Map();
  for (const pass of value.passes) {
    if (pass === null || typeof pass !== "object" || typeof pass.name !== "string" || typeof pass.module !== "string" || !Array.isArray(pass.programs) || passes2.has(pass.name))
      return false;
    passes2.set(pass.name, pass.module);
    for (const program of pass.programs) {
      if (program === null || typeof program !== "object" || typeof program.specializationKey !== "string" || typeof program.artifactHash !== "string" || !available(program.specializationKey) || !validateMaterialCookProgramContext(program.context).ok || program.address !== void 0 && program.address !== "direct" && program.address !== "scene-index" || program.entry !== void 0 && typeof program.entry !== "string" || program.abi !== void 0 && !isMaterialProgramAbi(program.abi))
        return false;
    }
  }
  return (material.passes ?? []).every((pass) => passes2.get(pass.name) === pass.program.module);
}
function publicationMaterialProgramKeys(material) {
  return /* @__PURE__ */ new Set([
    ...Object.values(material.materialProgramKeys ?? {}),
    ...Object.values(material.materialSurfacePrograms ?? {}).map((program) => program.programKey),
    ...Object.values(material.materialSceneIndexProgramKeys ?? {}).map(
      (program) => program.specializationKey
    ),
    ...material.materialShaderId === void 0 || material.materialShaderId.startsWith("forgeax::") ? [] : [material.materialShaderId]
  ]);
}
function sameSchemaValue(left, right) {
  if (Object.is(left, right)) return true;
  if (left === null || right === null || typeof left !== "object" || typeof right !== "object")
    return false;
  if (Array.isArray(left) !== Array.isArray(right)) return false;
  if (Array.isArray(left) && Array.isArray(right) && left.length !== right.length) return false;
  if (!Array.isArray(left) && (Object.getPrototypeOf(left) !== Object.prototype || Object.getPrototypeOf(right) !== Object.prototype))
    return false;
  const keys = Object.keys(left);
  if (keys.length !== Object.keys(right).length) return false;
  return keys.every(
    (key) => Object.hasOwn(right, key) && sameSchemaValue(
      left[key],
      right[key]
    )
  );
}
function publicationMaterialSchemaRebinder(registry) {
  const materials = /* @__PURE__ */ new Map();
  let observedSchema;
  let canonicalSchema;
  let schemaEqual = false;
  const matchesSchema = (material, canonical) => {
    const schema = material.materialParamSchema;
    if (schema === void 0) return false;
    if (material.immutableValues !== true) return sameSchemaValue(schema, canonical);
    if (observedSchema === schema && canonicalSchema === canonical) return schemaEqual;
    const equal = sameSchemaValue(schema, canonical);
    if (getAdmittedParamSchemaInterface(canonical) !== void 0) {
      observedSchema = schema;
      canonicalSchema = canonical;
      schemaEqual = equal;
    }
    return equal;
  };
  const rebind = (material) => {
    const known = materials.get(material);
    if (known !== void 0) return known;
    const schema = material.materialParamSchema;
    const shader = material.materialShaderId === void 0 ? void 0 : registry.findMaterialArtifact(material.materialShaderId);
    let rebound = schema !== void 0 && shader?.ok === true && schema !== shader.value.paramSchema && matchesSchema(material, shader.value.paramSchema) ? { ...material, materialParamSchema: shader.value.paramSchema } : material;
    const entryPoints = Object.fromEntries(
      material.passes.flatMap((pass) => {
        const key = material.materialProgramKeys?.[pass.name] ?? runtimeMaterialShaderId2(pass.program.module, pass.name);
        if (key === void 0) return [];
        const program = registry.findMaterialArtifact(key);
        const reads = program.ok ? program.value.program.entryPoints : void 0;
        return reads === void 0 ? [] : [[pass.name, reads]];
      })
    );
    if (Object.keys(entryPoints).length > 0 && !sameEntryPoints(rebound.materialEntryPoints, entryPoints))
      rebound = { ...rebound, materialEntryPoints: entryPoints };
    materials.set(material, rebound);
    return rebound;
  };
  return rebind;
}
function sameEntryPoints(current, next) {
  if (current === void 0) return false;
  const keys = Object.keys(next);
  if (Object.keys(current).length !== keys.length) return false;
  for (const key of keys)
    if (current[key] !== next[key]) return false;
  return true;
}
function rebindPublicationMaterialSchemas(registry, input) {
  if (input.materialUpdates.length === 0) return input;
  const rebind = publicationMaterialSchemaRebinder(registry);
  for (const resource of input.materialUpdates) {
    const rebound = rebind(resource.snapshot);
    if (rebound !== resource.snapshot) resource.adopt(rebound);
  }
  return input;
}
function installPublicationPrograms(assets, programs) {
  if (programs.length === 0) return;
  const validation = new MaterialArtifactRegistry();
  let shaders;
  const keys = /* @__PURE__ */ new Set();
  for (const row of programs) {
    if (keys.has(row.key) || row.artifact !== void 0 && row.artifact.key !== row.key)
      throw new RenderPublicationError({
        reason: "shape",
        subject: "duplicate or mismatched program key"
      });
    keys.add(row.key);
    const previous = assets.shaderRegistry.findMaterialArtifact(row.key);
    if (previous.ok && (previous.value.source !== row.shader.source || !sameSchemaValue(previous.value.paramSchema, row.shader.paramSchema) || !sameSchemaValue(previous.value.receipt, row.shader.receipt) || !sameSchemaValue(
      previous.value.program.entryPoints,
      row.shader.entryPoints ?? row.shader.receipt?.entryPoints
    ))) {
      throw new RenderPublicationError({
        reason: "shape",
        subject: `conflicting immutable shader ${row.key}`
      });
    }
    if (!previous.ok) {
      shaders ??= new ShaderRegistry({ manifestUrl: void 0 });
      shaders.installMaterialArtifact(row.key, row.shader, assets.shaderRegistry);
    }
    if (row.artifact !== void 0) {
      const existing = assets.getMaterialArtifact(row.key);
      if (existing !== void 0) validation.register(existing).unwrap();
      validation.register(row.artifact).unwrap();
    }
  }
  if (shaders !== void 0) assets.shaderRegistry.installMaterialArtifactsFrom(shaders);
  for (const row of programs) {
    if (row.artifact !== void 0) assets.materialArtifactRegistry.register(row.artifact).unwrap();
  }
}

export {
  MeshResidencyError,
  DynamicGeometryError,
  sameCandidateCredential,
  validateDynamicGeometryMeshBudget,
  createDynamicGeometryLifecycle,
  renderPublicationTransfers,
  renderPublicationAssetTransfers,
  RenderPublicationError,
  isBufferOffsetAligned,
  isBufferRangeWithinLimits,
  rayGeometryKey,
  RAY_REFERENCE_LIMIT,
  RAY_TRIANGLE_STRIDE,
  RAY_INPUT_STRIDE,
  RAY_HIT_STRIDE,
  rayReferenceFailure,
  buildRayReferenceScene,
  packReferenceRays,
  traceReferenceRay,
  SdfQueryStatus,
  sdfInstanceKey,
  SDF_HIT_STRIDE,
  SDF_INSTANCE_STRIDE,
  SDF_SAMPLE_WGSL,
  createSdfQuery,
  packSdfScene,
  GlobalSdfVoxelStatus,
  GLOBAL_SDF_VOXEL_STRIDE,
  GLOBAL_SDF_COMPOSE_WGSL,
  normalizeGlobalSdfGrid,
  packGlobalSdfComposition,
  createGlobalSdfComposition,
  createGlobalSdfCompositionRecorder,
  globalSdfEditBox,
  packGlobalSdfEditBox,
  GlobalSdfQueryStatus,
  GLOBAL_SDF_HIT_STRIDE,
  GLOBAL_SDF_SAMPLE_WGSL,
  GLOBAL_SDF_TRACE_WGSL,
  GLOBAL_SDF_QUERY_WGSL,
  packGlobalSdfQuerySettings,
  createGlobalSdfQuery,
  createGlobalSdfQueryRecorder,
  materialDisplacementRadius,
  standardDisplacementRadius,
  expandDisplacementBounds,
  projectSceneFields,
  isNativePlacementMaterial,
  SCREEN_PROBE_TEXELS,
  SCREEN_PROBE_RECORD_BYTES,
  SCREEN_PROBE_RADIANCE_BYTES,
  SCREEN_PROBE_HISTORY_BYTES,
  SCREEN_PROBE_ADAPTIVE_SLOTS,
  SCREEN_PROBE_FRAME_BYTES,
  SCREEN_PROBE_META_BYTES,
  ScreenProbeRayStatus,
  planScreenProbeLayout,
  packScreenProbeFrame,
  IRRADIANCE_FIELD_OCT,
  IRRADIANCE_FIELD_TEXELS,
  IRRADIANCE_FIELD_MIP_TEXELS,
  IRRADIANCE_FIELD_PROBE_STRIDE,
  IRRADIANCE_FIELD_PROBE_BYTES,
  IRRADIANCE_FIELD_DEPTH_BYTES,
  IRRADIANCE_FIELD_META_BYTES,
  validateGlobalSdfRegion,
  validateCardCapture,
  planIrradianceField,
  IRRADIANCE_FIELD_RELIGHT_SWEEPS,
  irradianceFieldRadiosityPeriod,
  irradianceFieldRelightHysteresis,
  validateDiffuseGi,
  freezeDiffuseGi,
  freezeGlobalSdfGrid,
  freezeBarrelDistortionMapping,
  attachBarrelDistortionCameraFrame,
  createBarrelDistortionMapping,
  mapDisplayUvToSceneUv,
  mapSceneUvToDisplayUv,
  mapDisplayToScene,
  mapSceneToDisplay,
  selectCloudLayerFrame,
  extractCloudLayer,
  renderMaterialContext,
  buildCameraFrusta,
  createCookieProjectionMatrixData,
  GlyphSources,
  projectGlyphView,
  fingerprintNumericArray,
  deriveInstancesUnionBounds,
  InstanceBoundsCache,
  expandPointsLinesBounds,
  buildShadowFrusta,
  prepareSkinPalette,
  createSkinPaletteAllocator,
  TerrainSourceCache,
  terrainDrawSection,
  terrainSourceError,
  validTilemapSource,
  tilemapGeometry,
  TilemapSources,
  projectTilemapView,
  extractFrames,
  validPublicationMaterialProjection,
  publicationMaterialProgramKeys,
  publicationMaterialSchemaRebinder,
  rebindPublicationMaterialSchemas,
  installPublicationPrograms,
  IRRADIANCE_VOLUME_KIND,
  IRRADIANCE_VOLUME_ARTIFACT,
  IRRADIANCE_VOLUME_MEDIA_TYPE,
  IRRADIANCE_VOLUME_FORMAT,
  validateIrradianceLattice,
  irradianceProbePosition,
  sphericalFibonacci,
  integrateIrradianceProbes,
  irradianceVolumeDigest,
  validateIrradianceVolume,
  encodeIrradianceVolume,
  decodeIrradianceVolume,
  irradianceVolumeProbeBlocks,
  irradianceVolumeKind,
  irradianceVolumeContribution
};
//# sourceMappingURL=chunk-5JZNU5U3.mjs.map
