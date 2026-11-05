import {
  DynamicGeometryError,
  GLOBAL_SDF_HIT_STRIDE,
  GLOBAL_SDF_SAMPLE_WGSL,
  GLOBAL_SDF_TRACE_WGSL,
  GlobalSdfQueryStatus,
  IRRADIANCE_FIELD_MIP_TEXELS,
  IRRADIANCE_FIELD_OCT,
  IRRADIANCE_FIELD_PROBE_STRIDE,
  IRRADIANCE_FIELD_TEXELS,
  MeshResidencyError,
  RAY_INPUT_STRIDE,
  RAY_REFERENCE_LIMIT,
  SDF_INSTANCE_STRIDE,
  SDF_SAMPLE_WGSL,
  SdfQueryStatus,
  buildRayReferenceScene,
  createDynamicGeometryLifecycle,
  extractFrames,
  freezeBarrelDistortionMapping,
  isBufferOffsetAligned,
  isBufferRangeWithinLimits,
  publicationMaterialProgramKeys,
  rayGeometryKey,
  rayReferenceFailure,
  renderMaterialContext,
  sameCandidateCredential,
  standardDisplacementRadius
} from "./chunk-5JZNU5U3.mjs";
import {
  DIRECT_DFG_LUT_DESCRIPTOR,
  GPU_BUFFER_USAGE_COPY_DST,
  GPU_BUFFER_USAGE_UNIFORM,
  GPU_SCENE_LAYOUTS,
  GPU_TEXTURE_USAGE_COPY_DST,
  GPU_TEXTURE_USAGE_COPY_SRC,
  GPU_TEXTURE_USAGE_RENDER_ATTACHMENT,
  GPU_TEXTURE_USAGE_STORAGE_BINDING,
  GPU_TEXTURE_USAGE_TEXTURE_BINDING,
  LifecycleConstructionError,
  MeshFilter,
  MeshRenderer,
  PROBE_BLEND_RECORD_BYTE_SIZE,
  PROBE_BLEND_RECORD_CAPACITY,
  RenderFeaturePreparationFailedError,
  VIEW_UNIFORM_BYTES,
  collectMaterialTextureCoordinates,
  defaultMaterialSnapshot,
  getOrCreateDirectDfgLut,
  materialTextureValue,
  materialUsesDirectDfgLut,
  worldRenderResources,
  writeMaterialTextureCoordinateRecord
} from "./chunk-XAU6MWMX.mjs";

// sdk/engine/node_modules/@forgeax/engine-render/src/assembly/dynamic-geometry-host.ts
import {
  runtimeAssetSource,
  runtimeAssets
} from "@forgeax/engine-assets-runtime/internal";
import { FixedTime } from "@forgeax/engine-ecs";
import { readComponentMutationEpoch } from "@forgeax/engine-ecs/projection";
import { worldRead } from "@forgeax/engine-ecs/world-read";
import { AssetGuid } from "@forgeax/engine-pack/guid";
import { Transform } from "@forgeax/engine-scene";
import { err, ok } from "@forgeax/engine-types";
function meshTransfers(mesh) {
  const buffers = /* @__PURE__ */ new Set();
  for (const value of [mesh.vertices, mesh.indices, mesh.aabb, ...Object.values(mesh.attributes)]) {
    const buffer = value instanceof ArrayBuffer ? value : value?.buffer;
    if (buffer instanceof ArrayBuffer) buffers.add(buffer);
  }
  return [...buffers];
}
function fixedStepOf(world) {
  try {
    return world.getResource(FixedTime).tick;
  } catch {
    return void 0;
  }
}
function hasRenderableBinding(world, entity) {
  if (entity === void 0 || !Number.isInteger(entity)) return false;
  return world.hasComponent(entity, Transform) && world.hasComponent(entity, MeshFilter) && world.hasComponent(entity, MeshRenderer);
}
function meshHandleOf(world, entity) {
  if (entity === void 0 || !Number.isInteger(entity)) return void 0;
  return world[worldRead].getFieldValue(entity, MeshFilter, "assetHandle");
}
function hasMaterialIdentity(world, entity, mesh, identity) {
  if (identity === void 0) return true;
  const normalized = identity.trim();
  if (normalized.length === 0 || entity === void 0) return false;
  const material = world.get(entity, MeshRenderer);
  if (!material.ok) return false;
  const values = material.value.materials ?? [];
  if (mesh.materialSlots.some((slot) => slot.sourceKey === normalized || slot.slotName === normalized))
    return true;
  if (mesh.materialSlots.some(
    (slot) => slot.defaultMaterial !== void 0 && (typeof slot.defaultMaterial === "number" ? world.assets === void 0 ? void 0 : runtimeAssetSource(world.assets, slot.defaultMaterial) : AssetGuid.format(slot.defaultMaterial))?.toLowerCase() === normalized.toLowerCase()
  ))
    return true;
  return values.some((value) => {
    if (String(value) === normalized) return true;
    try {
      const resolved = runtimeAssets(world.assets).resolveAsset(value);
      if (!resolved.ok || typeof resolved.value !== "object" || resolved.value === null)
        return false;
      const payload = resolved.value;
      return payload.sourceKey === normalized || payload.guid === normalized;
    } catch {
      return false;
    }
  });
}
function resolveMeshAsset(world, meshHandle) {
  const resolved = runtimeAssets(world.assets).resolveAsset(meshHandle);
  return resolved.ok && resolved.value.kind === "mesh" ? resolved.value : void 0;
}
function captureInput(input) {
  const mesh = resolveMeshAsset(input.world, input.meshHandle);
  return mesh === void 0 ? err(
    new DynamicGeometryError(
      "dynamic-geometry-invalid",
      "a live mesh reference from the attached World asset owner",
      "create or load the mesh through the World asset service"
    )
  ) : ok({ ...input, mesh });
}
function physicsPublicationOf(world, entity, admitting = false) {
  try {
    const physics = world.getResource("PhysicsWorld");
    return admitting ? physics.getDerivedAdmission?.(entity) : physics.getDerivedPublication?.(entity);
  } catch {
    return void 0;
  }
}
function createDynamicGeometryHostOwner(options) {
  const {
    lifecycle,
    attachedWorlds,
    currentGeneration,
    isConsumedByRenderFrame,
    recordStageLane = () => void 0
  } = options;
  const hostCandidates = /* @__PURE__ */ new Map();
  let hasDeferredRetirements = false;
  const faultedWorlds = /* @__PURE__ */ new WeakMap();
  const releasePipelinePreparation = (record) => {
    record.pipelineAbort?.abort();
    delete record.pipelineAbort;
    delete record.pipelinePreparation;
    delete record.materialIsCurrent;
    record.pipelines?.release();
    delete record.pipelines;
  };
  let currentnessRevision = Object.freeze({});
  const invalidateCurrentness = () => {
    currentnessRevision = Object.freeze({});
  };
  let observedGeneration = -1;
  let batchActive = false;
  const fault = (world, cause, expected = "the attached World and managed MeshAsset leases remain in a known state", hint = "rebuild the paired World and Renderer before further simulation or rendering") => {
    const existing = faultedWorlds.get(world);
    if (existing !== void 0) return existing;
    const error = cause instanceof DynamicGeometryError ? cause : new DynamicGeometryError("dynamic-geometry-invalid", expected, hint, { actual: cause });
    faultedWorlds.set(world, error);
    return error;
  };
  const throwFault = (world, cause) => {
    throw fault(world, cause);
  };
  const ensureHealthyWorld = (world) => {
    const priorFault = faultedWorlds.get(world);
    if (priorFault !== void 0) throw priorFault;
    if (world.execution.health !== "healthy")
      throwFault(
        world,
        new DynamicGeometryError(
          "dynamic-geometry-invalid",
          "the attached World execution state is healthy before dynamic geometry admission",
          "rebuild the poisoned World and its paired Renderer",
          { actual: world.execution }
        )
      );
  };
  const releaseMeshLease = (record) => {
    if (!record.meshLeaseHeld) return void 0;
    const released = runtimeAssets(record.world.assets).release(record.meshHandle);
    if (!released.ok) {
      return new DynamicGeometryError(
        "dynamic-geometry-invalid",
        "the Renderer candidate lease remains a live runtime asset reference",
        "retain the MeshAsset handle until candidate cancellation or ECS acceptance completes",
        { candidateId: record.candidate.candidateId, actual: released.error }
      );
    }
    record.meshLeaseHeld = false;
    return void 0;
  };
  const releasePreviousMeshLease = (record) => {
    if (!record.previousMeshLeaseHeld) return void 0;
    const released = runtimeAssets(record.world.assets).release(record.previousMeshHandle);
    if (!released.ok) {
      return new DynamicGeometryError(
        "dynamic-geometry-invalid",
        "the previous ECS MeshFilter binding remains a live runtime asset reference",
        "retain the previous MeshAsset until candidate cancellation, retirement, or invalidation completes",
        { candidateId: record.candidate.candidateId, actual: released.error }
      );
    }
    record.previousMeshLeaseHeld = false;
    return void 0;
  };
  const releaseMeshLeases = (record) => {
    const candidateError = releaseMeshLease(record);
    const previousError = releasePreviousMeshLease(record);
    return candidateError ?? previousError;
  };
  const synchronizeGeneration = () => {
    const generation = currentGeneration();
    if (observedGeneration !== generation) {
      for (const record of hostCandidates.values()) {
        if (record.generation !== generation) {
          try {
            scheduleCandidateCleanup(record, true);
          } catch (cause) {
            fault(record.world, cause);
          }
        }
      }
      if ([...hostCandidates.values()].some((record) => record.generation !== generation))
        return generation;
      lifecycle.invalidateGeneration(generation);
      observedGeneration = generation;
    }
    return generation;
  };
  const candidateRecord = (candidate) => {
    const record = hostCandidates.get(candidate.candidateId);
    if (record === void 0 || !sameCandidateCredential(candidate, record.candidate))
      return void 0;
    return record;
  };
  const hasSuccessorBinding = (record, successor, allowAccepted = false, requireSameHandle = true) => {
    if (successor === void 0 || record.candidate.state !== "published") return false;
    const next = candidateRecord(successor);
    if (next === void 0 || next === record || next.cleanup !== void 0 || next.candidate.state !== "published" && !(allowAccepted && next.candidate.state === "accepted") || successor.state !== "accepted" && successor.state !== "published" || next.world !== record.world || next.entity !== record.entity || requireSameHandle && next.meshHandle !== record.meshHandle || next.generation !== record.generation || next.generation !== currentGeneration() || next.candidate.revision <= record.candidate.revision || next.residency === void 0 || next.residency === record.residency)
      return false;
    const nextState = next.candidate;
    const receipt = lifecycle.receipt(nextState);
    if (nextState.state === "published" && (receipt === void 0 || !receipt.recordStageConsumed || receipt.candidateId !== nextState.candidateId || receipt.generation !== next.generation || receipt.deviceGeneration !== next.generation || receipt.revision !== nextState.revision) || lifecycle.receipt(record.candidate) === void 0)
      return false;
    for (const other of hostCandidates.values()) {
      if (other.world === next.world && other.entity === next.entity && other.cleanup === void 0 && other.candidate.revision > nextState.revision && (other.candidate.state === "accepted" || other.candidate.state === "published"))
        return false;
    }
    if (next.residency.isCurrent?.() !== true || next.materialIsCurrent?.() === false || next.pipelines?.isCurrent() === false || !hasRenderableBinding(next.world, next.entity) || !hasMaterialIdentity(next.world, next.entity, next.mesh, nextState.materialIdentity))
      return false;
    return candidateRecord(record.candidate) === record && record.cleanup === void 0 && candidateRecord(successor) === next && next.candidate === nextState && next.cleanup === void 0 && next.generation === currentGeneration() && attachedWorlds.has(next.world) && !faultedWorlds.has(next.world) && meshHandleOf(next.world, next.entity) === next.meshHandle;
  };
  const capturePipelines = (record) => {
    if (record.pipelinePreparation !== void 0 || options.capturePipelinePreparation === void 0)
      return ok(void 0);
    const binding = record.world.get(record.entity, MeshRenderer);
    if (!binding.ok)
      return err(
        new DynamicGeometryError(
          "dynamic-geometry-invalid",
          "candidate material binding is live",
          "prepare the current render entity"
        )
      );
    const handles = [...binding.value.materials];
    const captured = options.capturePipelinePreparation(record);
    if (!captured.ok) return captured;
    const materialHandles = [
      ...new Set(
        captured.value.materials.map((row) => row.value.materialHandle ?? 0).filter((handle) => handle !== 0)
      )
    ];
    record.pipelinePreparation = captured.value;
    let contentRevision = runtimeAssets(record.world.assets).currentRevision;
    let runtimeRevisions = materialHandles.map(
      (handle) => runtimeAssets(record.world.assets).version(handle)
    );
    let rasterCurrent = true;
    record.materialIsCurrent = () => {
      if (!rasterCurrent) return false;
      const current = record.world.get(record.entity, MeshRenderer);
      if (!current.ok || current.value.materials.length !== handles.length || !handles.every((handle, index) => current.value.materials[index] === handle)) {
        rasterCurrent = false;
        return false;
      }
      const revision = runtimeAssets(record.world.assets).currentRevision;
      if (revision === contentRevision) return true;
      contentRevision = revision;
      const nextRevisions = materialHandles.map(
        (handle) => runtimeAssets(record.world.assets).version(handle)
      );
      const unchanged = nextRevisions.every((next2, index) => {
        const previous2 = runtimeRevisions[index];
        return next2.ok && previous2?.ok === true && next2.value === previous2.value;
      });
      runtimeRevisions = nextRevisions;
      if (unchanged) return true;
      const next = options.capturePipelinePreparation?.(record);
      if (next?.ok !== true) {
        rasterCurrent = false;
        return false;
      }
      const previous = captured.value.materials.map((row) => row.value);
      const materials = next.value.materials.map((row) => row.value);
      rasterCurrent = previous.length === materials.length && previous.every((material, index) => {
        const other = materials[index];
        return other !== void 0 && material.materialHandle === other.materialHandle && material.standardTextureMask === other.standardTextureMask && JSON.stringify([
          material.passes,
          material.materialProgramKeys,
          material.renderState,
          material.materialParamSchema
        ]) === JSON.stringify([
          other.passes,
          other.materialProgramKeys,
          other.renderState,
          other.materialParamSchema
        ]) && Number(material.paramSnapshot?.alphaCutoff ?? 0) > 0 === Number(other.paramSnapshot?.alphaCutoff ?? 0) > 0 && Number(material.paramSnapshot?.alphaHash ?? 0) > 0.5 === Number(other.paramSnapshot?.alphaHash ?? 0) > 0.5 && Number(material.paramSnapshot?.transmission ?? 0) > 0 === Number(other.paramSnapshot?.transmission ?? 0) > 0;
      });
      return rasterCurrent;
    };
    return ok(void 0);
  };
  const scheduleCandidateCleanup = (record, force = false, terminal) => {
    releasePipelinePreparation(record);
    if (record.cleanup !== void 0) return record.cleanup.completed;
    let complete;
    const completed = new Promise((resolve) => {
      complete = resolve;
    });
    record.cleanup = { completed, receipt: lifecycle.receipt(record.candidate) };
    const cancel = (completion2) => {
      const cancelled = lifecycle.cancel(record.candidate, completion2);
      if (!cancelled.ok) throw cancelled.error;
      record.candidate = Object.freeze({ ...record.candidate, state: "cancelled" });
    };
    const finish = (deferred) => {
      if (deferred && faultedWorlds.has(record.world)) return;
      const released = releaseMeshLeases(record);
      if (released === void 0) record.assetRevision.dispose();
      if (released !== void 0) throw released;
      if (terminal === "cancel" && !deferred) cancel();
      if (record.candidate.state === "retired") {
        const finalized = lifecycle.finalizeRetirement(record.candidate);
        if (!finalized.ok) throw finalized.error;
      }
      hostCandidates.delete(record.candidate.candidateId);
      complete();
    };
    if (terminal === "retire") {
      const retired = lifecycle.retire(record.candidate);
      if (!retired.ok) throw retired.error;
      record.candidate = Object.freeze({ ...record.candidate, state: "retired" });
    }
    if (record.residencyPending !== void 0) {
      if (terminal === "cancel") cancel(completed);
      void record.residencyPending.then(
        async () => {
          try {
            await record.residency?.release(force || record.candidate.state !== "published");
            finish(true);
          } catch (cause) {
            fault(record.world, cause);
          }
        },
        (cause) => fault(record.world, cause)
      );
      return completed;
    }
    if (record.residency === void 0 && record.residencyStore !== void 0)
      throw new Error("native preparation did not transfer its allocation owner");
    const completion = record.residency?.release(force || record.candidate.state !== "published");
    if (completion === void 0) {
      finish(false);
      return void 0;
    }
    if (terminal === "cancel") cancel(completed);
    void completion.then(
      () => {
        try {
          finish(true);
        } catch (cause) {
          fault(record.world, cause);
        }
      },
      (cause) => fault(record.world, cause)
    );
    return completed;
  };
  const acceptCandidates = (candidates, ordering) => {
    if (!Array.isArray(candidates) || candidates.length === 0)
      return err(
        new DynamicGeometryError(
          "dynamic-geometry-invalid",
          "a geometry group is a nonempty array of owned prepared candidates",
          "prepare one candidate per entity and retry the group admission"
        )
      );
    const first = candidates[0];
    if (first === void 0 || first === null || typeof first !== "object")
      return err(
        new DynamicGeometryError(
          "dynamic-geometry-candidate-not-found",
          "every geometry candidate is an object issued by this Renderer",
          "discard the invalid candidate and use a prepared credential"
        )
      );
    const world = first.world;
    if (world === null || typeof world !== "object" || !attachedWorlds.has(world))
      return err(
        new DynamicGeometryError(
          "dynamic-geometry-world-not-attached",
          "candidate and fixed-step ordering belong to the same attached World",
          "attach the World before accepting dynamic geometry"
        )
      );
    ensureHealthyWorld(world);
    if (batchActive)
      throwFault(world, new Error("dynamic geometry admission reentered its ECS swap"));
    batchActive = true;
    try {
      const generation = currentGeneration();
      const uniqueEntities = /* @__PURE__ */ new Set();
      const entries = [];
      for (let index = 0; index < candidates.length; index += 1) {
        const candidate = candidates[index];
        if (candidate === void 0 || candidate === null || typeof candidate !== "object")
          return err(
            new DynamicGeometryError(
              "dynamic-geometry-candidate-not-found",
              "every geometry candidate is an object issued by this Renderer",
              "discard the invalid candidate and use a prepared credential",
              { actual: { inputIndex: index } }
            )
          );
        const candidateWorld = candidate.world;
        if (candidateWorld === null || typeof candidateWorld !== "object")
          return err(
            new DynamicGeometryError(
              "dynamic-geometry-world-not-attached",
              "every candidate belongs to the attached World",
              "discard the invalid credential and prepare it against the attached World",
              { actual: { inputIndex: index } }
            )
          );
        const byId = hostCandidates.get(candidate.candidateId);
        const record = candidateRecord(candidate);
        if (record === void 0)
          return err(
            new DynamicGeometryError(
              byId === void 0 ? "dynamic-geometry-candidate-not-found" : "dynamic-geometry-receipt-mismatch",
              "admission uses the exact host candidate owner and lifecycle credential",
              "discard altered or stale credentials and use the value returned by preparation",
              { candidateId: candidate.candidateId, actual: { inputIndex: index } }
            )
          );
        if (candidateWorld !== world || candidate.world !== ordering?.world || !attachedWorlds.has(world))
          return err(
            new DynamicGeometryError(
              "dynamic-geometry-world-not-attached",
              "all candidates and fixed-step ordering belong to the same attached World",
              "attach the World and submit its PhysicsWorld ordering before accepting geometry",
              { candidateId: candidate.candidateId, actual: { inputIndex: index } }
            )
          );
        ensureHealthyWorld(candidateWorld);
        if (record.cleanup !== void 0 || record.candidate.state !== "prepared" || candidate.state !== "prepared")
          return err(
            new DynamicGeometryError(
              "dynamic-geometry-candidate-state",
              "admission consumes each prepared candidate exactly once",
              "retain the accepted or published receipt instead of admitting it again",
              { candidateId: candidate.candidateId }
            )
          );
        if (!uniqueEntities.add(record.entity))
          return err(
            new DynamicGeometryError(
              "dynamic-geometry-invalid",
              "a geometry group contains one candidate per distinct entity",
              "prepare one candidate per entity and retry the group admission",
              { candidateId: candidate.candidateId, actual: { entity: record.entity } }
            )
          );
        entries.push({ input: candidate, record });
      }
      if (ordering === void 0 || !Number.isInteger(ordering.fixedStep) || ordering.fixedStep < 0)
        return err(
          new DynamicGeometryError(
            "dynamic-geometry-ordering-required",
            "ordering names the attached World and a non-negative current fixed step",
            "accept candidates during their current paired fixed-step admission"
          )
        );
      const currentFixedStep = fixedStepOf(world);
      for (const { input, record } of entries) {
        if (input.generation !== generation || record.generation !== generation)
          return err(
            new DynamicGeometryError(
              "dynamic-geometry-generation-mismatch",
              "every candidate uses the active Renderer device generation",
              "prepare candidates again against the active device generation",
              {
                candidateId: input.candidateId,
                actual: { generation, candidate: input.generation }
              }
            )
          );
        if (!record.assetRevision.matchesCurrent() || !input.gpuReady || record.residency === void 0 || record.residency.isCurrent?.() === false || record.materialIsCurrent?.() === false || record.pipelines?.isCurrent() === false)
          return err(
            new DynamicGeometryError(
              "dynamic-geometry-gpu-not-ready",
              "every candidate retains standard GPU residency before acceptance",
              "repair GPU residency and prepare the candidate again",
              { candidateId: input.candidateId }
            )
          );
        if (!record.meshLeaseHeld || !record.previousMeshLeaseHeld)
          throwFault(
            world,
            new DynamicGeometryError(
              "dynamic-geometry-invalid",
              "both Renderer-owned MeshAsset asset-reference leases remain held until commit",
              "rebuild the paired World and Renderer because a managed lease was lost",
              { candidateId: input.candidateId }
            )
          );
        if (currentFixedStep === void 0 || input.fixedStep === void 0 || input.fixedStep > currentFixedStep || ordering.fixedStep !== currentFixedStep)
          return err(
            new DynamicGeometryError(
              "dynamic-geometry-ordering-required",
              "ordering matches the current World tick, no earlier than preparation",
              "accept prepared candidates during the current fixed-step admission",
              {
                candidateId: input.candidateId,
                actual: {
                  candidate: input.fixedStep,
                  currentFixedStep,
                  ordering: ordering.fixedStep
                }
              }
            )
          );
        if (!hasRenderableBinding(world, record.entity) || !hasMaterialIdentity(world, record.entity, record.mesh, input.materialIdentity))
          return err(
            new DynamicGeometryError(
              "dynamic-geometry-invalid",
              "the candidate remains bound to a live ECS MeshFilter and MeshRenderer",
              "keep the candidate MeshFilter binding intact until the consuming draw",
              { candidateId: input.candidateId }
            )
          );
        if (meshHandleOf(world, record.entity) !== record.previousMeshHandle)
          return err(
            new DynamicGeometryError(
              "dynamic-geometry-invalid",
              "the old MeshFilter binding remains visible until candidate acceptance",
              "reconcile the entity and prepare a fresh candidate before retrying",
              { candidateId: input.candidateId }
            )
          );
        for (const handle of [record.meshHandle, record.previousMeshHandle]) {
          const resolved = runtimeAssets(world.assets).resolveAsset(handle);
          if (!resolved.ok)
            throwFault(
              world,
              new DynamicGeometryError(
                "dynamic-geometry-invalid",
                "each held MeshAsset asset reference resolves before and after the ECS swap",
                "rebuild the paired World and Renderer because a managed payload is unavailable",
                { candidateId: input.candidateId, actual: resolved.error }
              )
            );
          if (runtimeAssets(world.assets).refcount(handle) < 1)
            throwFault(
              world,
              new DynamicGeometryError(
                "dynamic-geometry-invalid",
                "each Renderer-owned MeshAsset asset-reference lease is reflected in its store",
                "rebuild the paired World and Renderer because a managed lease cannot be proven",
                { candidateId: input.candidateId, actual: { handle } }
              )
            );
        }
        if (input.physicsEntity !== void 0) {
          const publication = physicsPublicationOf(world, input.physicsEntity, true);
          if (publication === void 0 || publication.fixedStep !== currentFixedStep || publication.revision !== input.revision)
            return err(
              new DynamicGeometryError(
                "dynamic-geometry-ordering-required",
                "candidate physicsEntity has the active paired PhysicsWorld admission",
                "accept geometry inside admitDerivedShapeCandidates commitGeometry before physics step",
                { candidateId: input.candidateId, actual: publication }
              )
            );
        }
      }
      const candidatesForLifecycle = entries.map(({ input }) => input);
      const validated = lifecycle.validateCandidates(candidatesForLifecycle, ordering);
      if (!validated.ok) return err(validated.error);
      const superseded = [...hostCandidates.values()].filter(
        (record) => record.world === world && uniqueEntities.has(record.entity) && !candidatesForLifecycle.some(
          (candidate) => candidate.candidateId === record.candidate.candidateId
        ) && (record.candidate.state === "prepared" || record.candidate.state === "accepted")
      );
      const allTouched = [...entries.map(({ record }) => record), ...superseded];
      const bindingBefore = /* @__PURE__ */ new Map();
      const referenceCounts = /* @__PURE__ */ new Map();
      for (const record of allTouched) {
        if (!bindingBefore.has(record.entity))
          bindingBefore.set(record.entity, meshHandleOf(world, record.entity));
        for (const handle of [record.meshHandle, record.previousMeshHandle]) {
          const key = Number(handle);
          if (!referenceCounts.has(key))
            referenceCounts.set(key, {
              handle,
              count: runtimeAssets(world.assets).refcount(handle)
            });
        }
      }
      for (const { record } of entries) {
        if (bindingBefore.get(record.entity) !== record.previousMeshHandle)
          return err(
            new DynamicGeometryError(
              "dynamic-geometry-invalid",
              "all old MeshFilter bindings remain unchanged through whole-batch preflight",
              "reconcile the entity and prepare a fresh candidate before retrying",
              { candidateId: record.candidate.candidateId }
            )
          );
      }
      const lifecycleBefore = JSON.stringify(lifecycle.inspect());
      const hostBefore = [...hostCandidates.entries()].map(([id, record]) => ({
        id,
        record,
        candidate: record.candidate,
        meshLeaseHeld: record.meshLeaseHeld,
        previousMeshLeaseHeld: record.previousMeshLeaseHeld
      }));
      const receiptsBefore = new Map(
        hostBefore.map(({ id, candidate }) => [id, lifecycle.receipt(candidate)])
      );
      const attempted = [];
      const stateWasPreserved = () => JSON.stringify(lifecycle.inspect()) === lifecycleBefore && hostBefore.length === hostCandidates.size && hostBefore.every(
        ({ id, record, candidate, meshLeaseHeld, previousMeshLeaseHeld }) => hostCandidates.get(id) === record && record.candidate === candidate && record.meshLeaseHeld === meshLeaseHeld && record.previousMeshLeaseHeld === previousMeshLeaseHeld && JSON.stringify(lifecycle.receipt(candidate)) === JSON.stringify(receiptsBefore.get(id))
      );
      const bindingsAndReferencesMatch = (expectedBindings, expectedCounts) => {
        if (world.execution.health !== "healthy") return false;
        for (const [entity, expected] of expectedBindings) {
          if (meshHandleOf(world, entity) !== expected) return false;
        }
        for (const { handle, count } of expectedCounts.values()) {
          const resolved = runtimeAssets(world.assets).resolveAsset(handle);
          if (!resolved.ok || runtimeAssets(world.assets).refcount(handle) !== count) return false;
        }
        return true;
      };
      const rollback = (cause) => {
        for (const record of [...attempted].reverse()) {
          const previous = bindingBefore.get(record.entity);
          const current = meshHandleOf(world, record.entity);
          if (current === previous) continue;
          if (current !== record.meshHandle)
            return fault(
              world,
              new DynamicGeometryError(
                "dynamic-geometry-invalid",
                "a failed batch swap exposes only its previous or attempted MeshFilter handle",
                "rebuild the paired World and Renderer because rollback found an unexpected binding",
                { candidateId: record.candidate.candidateId, actual: { cause, current, previous } }
              )
            );
          try {
            const restored = world.set(record.entity, MeshFilter, {
              assetHandle: record.previousMeshHandle
            });
            if (!restored.ok && meshHandleOf(world, record.entity) !== previous)
              return fault(
                world,
                new DynamicGeometryError(
                  "dynamic-geometry-invalid",
                  "every staged MeshFilter write can be restored through the ECS write barrier",
                  "rebuild the paired World and Renderer after an uncertain rollback",
                  {
                    candidateId: record.candidate.candidateId,
                    actual: { cause, restore: restored.error }
                  }
                )
              );
          } catch (restoreCause) {
            return fault(
              world,
              new DynamicGeometryError(
                "dynamic-geometry-invalid",
                "every staged MeshFilter write can be restored through the ECS write barrier",
                "rebuild the paired World and Renderer after an uncertain rollback",
                { candidateId: record.candidate.candidateId, actual: { cause, restoreCause } }
              )
            );
          }
        }
        if (!bindingsAndReferencesMatch(bindingBefore, referenceCounts) || !stateWasPreserved())
          return fault(
            world,
            new DynamicGeometryError(
              "dynamic-geometry-invalid",
              "a refused batch restores all MeshFilter bindings, asset references, lifecycle history, and reservations",
              "rebuild the paired World and Renderer because rollback could not be proven",
              { actual: cause }
            )
          );
        return void 0;
      };
      for (const { input, record } of entries) {
        attempted.push(record);
        const swapped = (() => {
          try {
            return world.set(record.entity, MeshFilter, {
              assetHandle: record.meshHandle
            });
          } catch (cause) {
            const rollbackFault = rollback(cause);
            throw rollbackFault ?? fault(
              world,
              new DynamicGeometryError(
                "dynamic-geometry-invalid",
                "ECS MeshFilter writes either commit or return a recoverable Result",
                "rebuild the paired World and Renderer after an unexpected write exception",
                { candidateId: input.candidateId, actual: cause }
              )
            );
          }
        })();
        if (!swapped.ok) {
          const rollbackFault = rollback(swapped.error);
          if (rollbackFault !== void 0) throw rollbackFault;
          return err(
            new DynamicGeometryError(
              "dynamic-geometry-invalid",
              "a refused MeshFilter swap restores the complete preflight snapshot",
              "retain the prepared candidates and retry after the ECS write barrier is healthy",
              { candidateId: input.candidateId, actual: swapped.error }
            )
          );
        }
      }
      const expectedCommittedCounts = new Map(referenceCounts);
      for (const { record } of entries) {
        if (record.previousMeshHandle === record.meshHandle) continue;
        const previousKey = Number(record.previousMeshHandle);
        const candidateKey = Number(record.meshHandle);
        const previous = expectedCommittedCounts.get(previousKey);
        const candidate = expectedCommittedCounts.get(candidateKey);
        if (previous !== void 0)
          expectedCommittedCounts.set(previousKey, { ...previous, count: previous.count - 1 });
        if (candidate !== void 0)
          expectedCommittedCounts.set(candidateKey, { ...candidate, count: candidate.count + 1 });
      }
      const expectedCommittedBindings = new Map(bindingBefore);
      for (const { record } of entries)
        expectedCommittedBindings.set(record.entity, record.meshHandle);
      if (!bindingsAndReferencesMatch(expectedCommittedBindings, expectedCommittedCounts)) {
        const rollbackFault = rollback("post-stage binding or asset-reference verification failed");
        if (rollbackFault !== void 0) throw rollbackFault;
        return err(
          new DynamicGeometryError(
            "dynamic-geometry-invalid",
            "the full ECS batch exposes the staged handles with exact managed-reference counts",
            "repair the MeshAsset bindings and retry from the retained prepared candidates"
          )
        );
      }
      const accepted = (() => {
        try {
          return lifecycle.acceptCandidates(candidatesForLifecycle, ordering);
        } catch (cause) {
          const rollbackFault = rollback(cause);
          throw rollbackFault ?? fault(
            world,
            new DynamicGeometryError(
              "dynamic-geometry-invalid",
              "lifecycle acceptance commits the preflighted candidate batch once",
              "rebuild the paired World and Renderer after an uncertain lifecycle commit",
              { actual: cause }
            )
          );
        }
      })();
      if (!accepted.ok) {
        const rollbackFault = rollback(accepted.error);
        if (rollbackFault !== void 0) throw rollbackFault;
        return err(accepted.error);
      }
      if (accepted.value.length !== entries.length)
        throw fault(
          world,
          new DynamicGeometryError(
            "dynamic-geometry-invalid",
            "lifecycle acceptance returns one committed credential per staged ECS entity",
            "rebuild the paired World and Renderer because the batch commit shape changed",
            { actual: { expected: entries.length, received: accepted.value.length } }
          )
        );
      for (let index = 0; index < entries.length; index += 1) {
        const entry = entries[index];
        const committed = accepted.value[index];
        if (entry === void 0 || committed === void 0)
          throw fault(world, new Error("lifecycle acceptance returned an incomplete batch"));
        entry.record.candidate = committed;
        if (entry.record.residency?.commit?.() === false)
          throw fault(
            world,
            new Error("preflighted mesh residency changed during candidate adoption")
          );
        releasePipelinePreparation(entry.record);
        invalidateCurrentness();
      }
      if (hasDeferredRetirements) {
        for (const record of hostCandidates.values()) {
          const previous = record.retirementSuccessor;
          if (previous === void 0 || !superseded.includes(previous)) continue;
          const replacement = entries.find(
            ({ record: next }) => next.world === previous.world && next.entity === previous.entity && next.generation === previous.generation && next.previousMeshHandle === previous.meshHandle && next.candidate.revision > previous.candidate.revision
          );
          if (replacement !== void 0) record.retirementSuccessor = replacement.record;
        }
      }
      const postCommitFailures = [];
      for (const record of superseded) {
        try {
          scheduleCandidateCleanup(record, false, "cancel");
        } catch (cause) {
          postCommitFailures.push(
            fault(
              world,
              new DynamicGeometryError(
                "dynamic-geometry-invalid",
                "GPU residency release and superseded candidate cleanup complete after commit",
                "rebuild the paired World and Renderer after a post-commit cleanup failure",
                { candidateId: record.candidate.candidateId, actual: cause }
              )
            )
          );
        }
      }
      try {
        options.onTopologyChanged?.();
      } catch (cause) {
        postCommitFailures.push(
          fault(
            world,
            new DynamicGeometryError(
              "dynamic-geometry-invalid",
              "the temporal geometry owner accepts one invalidation after the ECS batch commits",
              "rebuild the paired World and Renderer after a post-commit callback failure",
              { actual: cause }
            )
          )
        );
      }
      if (postCommitFailures.length > 0) throw postCommitFailures[0];
      return ok(accepted.value);
    } finally {
      batchActive = false;
    }
  };
  const beginPreparation = (request, candidate) => {
    const world = request.world;
    if (!attachedWorlds.has(world))
      return err(
        new DynamicGeometryError(
          "dynamic-geometry-world-not-attached",
          "the candidate World is attached to this Renderer",
          "call renderer.attach(world) before preparing dynamic geometry"
        )
      );
    ensureHealthyWorld(world);
    const captured = captureInput(request);
    if (!captured.ok) return captured;
    const input = captured.value;
    const generation = synchronizeGeneration();
    ensureHealthyWorld(world);
    if (input.entity === void 0 || !hasRenderableBinding(world, input.entity)) {
      return err(
        new DynamicGeometryError(
          "dynamic-geometry-invalid",
          "the candidate entity and MeshAsset payload belong to the attached World",
          "attach MeshFilter/MeshRenderer and pass the payload resolved by its runtime asset reference",
          { actual: { entity: input.entity, meshHandle: input.meshHandle } }
        )
      );
    }
    if (input.meshHandle === void 0)
      return err(
        new DynamicGeometryError(
          "dynamic-geometry-gpu-not-ready",
          "the standard MeshAsset shared handle is present before Renderer admission",
          "allocate the MeshAsset through assets.create and retry after asset projection",
          { actual: { entity: input.entity, meshHandle: input.meshHandle } }
        )
      );
    const meshHandle = input.meshHandle;
    if (!hasMaterialIdentity(world, input.entity, input.mesh, input.materialIdentity)) {
      return err(
        new DynamicGeometryError(
          "dynamic-geometry-invalid",
          "the candidate MeshAsset and material identity belong to the attached World",
          "pass the payload resolved by its runtime asset reference and its live material slot identity",
          { actual: { entity: input.entity, meshHandle } }
        )
      );
    }
    const fixedStep = fixedStepOf(world);
    if (fixedStep === void 0) {
      return err(
        new DynamicGeometryError(
          "dynamic-geometry-ordering-required",
          "the attached World exposes its ECS FixedTime resource",
          "prepare geometry from an initialized World fixed-step schedule"
        )
      );
    }
    const previousMeshHandle = meshHandleOf(world, input.entity);
    if (previousMeshHandle === void 0) {
      return err(
        new DynamicGeometryError(
          "dynamic-geometry-invalid",
          "the prepared entity retains a live MeshFilter binding",
          "keep the ECS render entity alive while staging geometry",
          { actual: { entity: input.entity } }
        )
      );
    }
    let assetRevision;
    let revisionTransferred = false;
    const referenceCounts = new Map(
      [previousMeshHandle, meshHandle].map((handle) => [
        handle,
        runtimeAssets(world.assets).refcount(handle)
      ])
    );
    const lifecycleBefore = JSON.stringify(lifecycle.inspect());
    const preparationWasRestored = () => world.execution.health === "healthy" && meshHandleOf(world, input.entity) === previousMeshHandle && JSON.stringify(lifecycle.inspect()) === lifecycleBefore && [...referenceCounts].every(
      ([handle, count]) => runtimeAssets(world.assets).refcount(handle) === count && runtimeAssets(world.assets).resolveAsset(handle).ok
    );
    try {
      const previousRetained = runtimeAssets(world.assets).retain(previousMeshHandle);
      if (!previousRetained.ok) {
        if (!preparationWasRestored()) throw fault(world, previousRetained.error);
        return err(
          new DynamicGeometryError(
            "dynamic-geometry-invalid",
            "the previous ECS MeshFilter binding remains live for Renderer preparation",
            "retain the current MeshAsset handle before staging replacement geometry",
            { actual: previousRetained.error }
          )
        );
      }
      const retained = runtimeAssets(world.assets).retain(meshHandle);
      if (!retained.ok) {
        const releasedPrevious = runtimeAssets(world.assets).release(previousMeshHandle);
        if (!releasedPrevious.ok || !preparationWasRestored())
          throw fault(world, { candidate: retained.error, previous: releasedPrevious });
        return err(
          new DynamicGeometryError(
            "dynamic-geometry-invalid",
            "the candidate MeshAsset asset reference remains live for Renderer preparation",
            "retain the World-owned MeshAsset handle before staging a candidate",
            { actual: retained.error }
          )
        );
      }
      const releaseRetained = () => {
        const releasedCandidate = runtimeAssets(world.assets).release(meshHandle);
        const releasedPrevious = runtimeAssets(world.assets).release(previousMeshHandle);
        if (!releasedCandidate.ok || !releasedPrevious.ok)
          return new DynamicGeometryError(
            "dynamic-geometry-invalid",
            "failed candidate preparation releases both World asset-reference leases",
            "repair the runtime asset references before retrying geometry preparation",
            {
              actual: {
                candidate: releasedCandidate.ok ? void 0 : releasedCandidate.error,
                previous: releasedPrevious.ok ? void 0 : releasedPrevious.error
              }
            }
          );
        return void 0;
      };
      const prepared = candidate === void 0 ? lifecycle.prepare({ ...input, fixedStep }, generation) : ok(candidate);
      if (!prepared.ok) {
        const released = releaseRetained();
        if (released !== void 0 || !preparationWasRestored())
          throw fault(world, released ?? prepared.error);
        return prepared;
      }
      const captured2 = runtimeAssets(world.assets).captureRevision(meshHandle);
      if (!captured2.ok) {
        const cancelled = candidate === void 0 ? lifecycle.cancel(prepared.value) : ok(void 0);
        const released = releaseRetained();
        if (!cancelled.ok || released !== void 0 || !preparationWasRestored())
          throw fault(world, { cancelled, released, cause: captured2.error });
        return err(
          new DynamicGeometryError(
            "dynamic-geometry-invalid",
            "a complete candidate asset revision closure",
            "repair the candidate asset references before retrying",
            { actual: captured2.error }
          )
        );
      }
      assetRevision = captured2.value;
      let mesh;
      try {
        mesh = runtimeAssets(world.assets).read(meshHandle).unwrap();
      } catch (cause) {
        const cancelled = candidate === void 0 ? lifecycle.cancel(prepared.value) : ok(void 0);
        const released = releaseRetained();
        if (!cancelled.ok || released !== void 0 || !preparationWasRestored())
          throw fault(world, { cause, cancelled, released });
        throw cause;
      }
      const record = {
        candidate: prepared.value,
        mesh,
        assetRevision,
        meshTransfers: meshTransfers(mesh),
        world,
        entity: input.entity,
        previousMeshHandle,
        meshHandle,
        residency: void 0,
        residencyStore: void 0,
        generation,
        meshLeaseHeld: true,
        previousMeshLeaseHeld: true
      };
      hostCandidates.set(prepared.value.candidateId, record);
      revisionTransferred = true;
      return ok(record);
    } catch (cause) {
      if (preparationWasRestored()) throw cause;
      throw fault(world, cause);
    } finally {
      if (!revisionTransferred) assetRevision?.dispose();
    }
  };
  const retire = (candidate, successor) => {
    const world = candidate.world;
    if (world !== null && typeof world === "object") ensureHealthyWorld(world);
    synchronizeGeneration();
    if (world !== null && typeof world === "object") ensureHealthyWorld(world);
    const record = candidateRecord(candidate);
    if (record === void 0) {
      if (hostCandidates.has(candidate.candidateId))
        return err(
          new DynamicGeometryError(
            "dynamic-geometry-receipt-mismatch",
            "retirement uses the exact host candidate owner and lifecycle credential",
            "discard the altered credential and use the value returned by acceptance",
            { candidateId: candidate.candidateId }
          )
        );
      return lifecycle.retire(candidate);
    }
    if (candidate.state !== "accepted" && candidate.state !== "published")
      return err(
        new DynamicGeometryError(
          "dynamic-geometry-receipt-mismatch",
          "retirement uses a candidate state issued by the host lifecycle",
          "discard the altered credential and use the value returned by acceptance",
          { candidateId: candidate.candidateId }
        )
      );
    const bindingIsLive = meshHandleOf(record.world, record.entity) === record.meshHandle;
    if (bindingIsLive && !hasSuccessorBinding(record, successor, true))
      return err(
        new DynamicGeometryError(
          "dynamic-geometry-invalid",
          "retirement does not evict the MeshFilter that still consumes the candidate",
          "swap the ECS MeshFilter through its write barrier before retiring this geometry",
          { candidateId: candidate.candidateId }
        )
      );
    if (bindingIsLive && successor !== void 0) {
      const next = candidateRecord(successor);
      if (next?.candidate.state === "accepted") {
        record.retirementSuccessor = next;
        hasDeferredRetirements = true;
        return ok(void 0);
      }
    }
    if (record.cleanup !== void 0) {
      if (record.candidate.state === "retired") return ok(void 0);
      return err(
        new DynamicGeometryError(
          "dynamic-geometry-candidate-state",
          "retirement cannot replace an already-owned terminal cleanup",
          "retain the terminal owner until its cleanup fence completes",
          { candidateId: candidate.candidateId }
        )
      );
    }
    if (lifecycle.receipt(record.candidate) === void 0) return lifecycle.retire(candidate);
    try {
      scheduleCandidateCleanup(record, false, "retire");
      return ok(void 0);
    } catch (cause) {
      throw fault(record.world, cause);
    }
  };
  const host = {
    acceptDynamicGeometry(candidate, ordering) {
      const accepted = acceptCandidates([candidate], ordering);
      if (!accepted.ok) return accepted;
      const result = accepted.value[0];
      if (result === void 0)
        throw fault(candidate.world, new Error("empty accepted batch"));
      return ok(result);
    },
    acceptDynamicGeometryCandidates: acceptCandidates,
    isDynamicGeometryCurrent(candidate) {
      const record = candidateRecord(candidate);
      return record !== void 0 && record.cleanup === void 0 && record.residency !== void 0 && record.assetRevision.matchesCurrent() && record.residency.isCurrent?.() !== false && (record.candidate.state !== "prepared" || record.materialIsCurrent?.() !== false && record.pipelines?.isCurrent() !== false) && record.generation === currentGeneration() && attachedWorlds.has(record.world) && !faultedWorlds.has(record.world);
    },
    dynamicGeometryReceipt(candidate) {
      const world = candidate.world;
      if (world !== null && typeof world === "object" && faultedWorlds.has(world)) return void 0;
      synchronizeGeneration();
      if (candidate.generation !== currentGeneration() || faultedWorlds.has(world))
        return void 0;
      return lifecycle.receipt(candidate);
    },
    dynamicGeometryFault(world) {
      return faultedWorlds.get(world);
    },
    cancelDynamicGeometry(candidate) {
      const world = candidate.world;
      if (world !== null && typeof world === "object") ensureHealthyWorld(world);
      synchronizeGeneration();
      if (world !== null && typeof world === "object") ensureHealthyWorld(world);
      const record = candidateRecord(candidate);
      if (record === void 0) {
        if (hostCandidates.has(candidate.candidateId))
          return err(
            new DynamicGeometryError(
              "dynamic-geometry-receipt-mismatch",
              "cancellation uses the exact host candidate owner and lifecycle credential",
              "discard the altered credential and use the value returned by preparation",
              { candidateId: candidate.candidateId }
            )
          );
        return lifecycle.cancel(candidate);
      }
      const issued = record.candidate.state;
      const unpublished = issued === "prepared" || issued === "accepted";
      if (unpublished ? candidate.state !== issued : candidate.state !== "accepted" && candidate.state !== "published")
        return err(
          new DynamicGeometryError(
            "dynamic-geometry-receipt-mismatch",
            "cancellation uses the candidate state issued by the host lifecycle",
            "discard the altered credential and use the value returned by preparation or acceptance",
            { candidateId: candidate.candidateId }
          )
        );
      if (!unpublished || record.cleanup !== void 0 || record.generation !== currentGeneration())
        return err(
          new DynamicGeometryError(
            "dynamic-geometry-candidate-state",
            "only current unpublished geometry without terminal cleanup may be cancelled",
            "retain the terminal owner until its cleanup fence completes",
            { candidateId: candidate.candidateId }
          )
        );
      if (issued === "accepted") {
        const currentHandle = meshHandleOf(record.world, record.entity);
        if (currentHandle !== record.meshHandle && currentHandle !== record.previousMeshHandle)
          return err(
            new DynamicGeometryError(
              "dynamic-geometry-invalid",
              "cancel does not overwrite a newer ECS MeshFilter binding",
              "reconcile the live entity before cancelling this candidate",
              { candidateId: candidate.candidateId }
            )
          );
        if (currentHandle === record.meshHandle) {
          const counts = new Map(
            [record.meshHandle, record.previousMeshHandle].map((handle) => [
              handle,
              runtimeAssets(record.world.assets).refcount(handle)
            ])
          );
          const before = JSON.stringify(lifecycle.inspect());
          try {
            const restored = record.world.set(record.entity, MeshFilter, {
              assetHandle: record.previousMeshHandle
            });
            const unchanged = () => record.world.execution.health === "healthy" && JSON.stringify(lifecycle.inspect()) === before && [...counts].every(
              ([handle, count]) => runtimeAssets(record.world.assets).refcount(handle) === count + (restored.ok ? Number(handle === record.previousMeshHandle) - Number(handle === record.meshHandle) : 0)
            ) && meshHandleOf(record.world, record.entity) === (restored.ok ? record.previousMeshHandle : currentHandle);
            if (!unchanged())
              throw new Error(
                "cancellation scalar write did not preserve its binding and lease contract"
              );
            if (!restored.ok)
              return err(
                new DynamicGeometryError(
                  "dynamic-geometry-invalid",
                  "cancel restores the previous MeshFilter through the ECS write barrier",
                  "restore the entity before retrying cancellation",
                  { candidateId: candidate.candidateId, actual: restored.error }
                )
              );
          } catch (cause) {
            throw fault(record.world, cause);
          }
        }
      }
      try {
        scheduleCandidateCleanup(record, false, "cancel");
        return ok(void 0);
      } catch (cause) {
        throw fault(record.world, cause);
      }
    },
    invalidateDynamicGeometryWorld(world) {
      const doomed = [...hostCandidates.values()].filter((record) => record.world === world);
      const completions = [];
      for (const record of doomed) {
        try {
          const completion = scheduleCandidateCleanup(record, true);
          if (completion !== void 0) completions.push(completion);
        } catch (cause) {
          fault(record.world, cause);
          if (record.cleanup !== void 0) completions.push(record.cleanup.completed);
        }
      }
      lifecycle.invalidateWorld(
        world,
        completions.length === 0 ? void 0 : Promise.all(completions)
      );
    },
    retireDynamicGeometry: (candidate) => retire(candidate),
    retireSupersededDynamicGeometry: (candidate, successor) => retire(candidate, successor),
    publishDynamicGeometry(frame, worlds, fixedStep) {
      synchronizeGeneration();
      const targetWorlds = /* @__PURE__ */ new Set();
      for (const candidateWorld of worlds ?? attachedWorlds) {
        const world = candidateWorld;
        if (attachedWorlds.has(world) && !faultedWorlds.has(world)) targetWorlds.add(world);
      }
      const receipts = [];
      for (const world of targetWorlds) {
        const worldFixedStep = fixedStepOf(world);
        if (worldFixedStep === void 0) continue;
        const publicationFixedStep = fixedStep ?? (options.publishedFixedStep === void 0 ? worldFixedStep : options.publishedFixedStep(world));
        if (publicationFixedStep === void 0) continue;
        receipts.push(
          ...lifecycle.publishFrame(
            frame,
            [world],
            publicationFixedStep,
            (candidate) => {
              const candidateWorld = candidate.world;
              if (candidateWorld !== world || !attachedWorlds.has(candidateWorld)) return false;
              const hostRecord = candidateRecord(candidate);
              if (hostRecord === void 0 || hostRecord.cleanup !== void 0 || hostRecord.candidate.state === "prepared" || !hostRecord.assetRevision.matchesCurrent() || !hasRenderableBinding(candidateWorld, candidate.entity) || meshHandleOf(candidateWorld, candidate.entity) !== candidate.meshHandle || !hasMaterialIdentity(
                candidateWorld,
                candidate.entity,
                hostRecord.mesh,
                candidate.materialIdentity
              ))
                return false;
              if (!isConsumedByRenderFrame(candidate)) return false;
              const actualFixedStep = publicationFixedStep;
              if (candidate.fixedStep === void 0 || actualFixedStep === void 0) return false;
              if ((options.publishedFixedStep === void 0 ? worldFixedStep !== actualFixedStep : worldFixedStep < actualFixedStep) || actualFixedStep < candidate.fixedStep)
                return false;
              if (candidate.physicsEntity !== void 0) {
                const publication = physicsPublicationOf(candidateWorld, candidate.physicsEntity);
                if (publication === void 0 || publication.fixedStep < candidate.fixedStep || publication.revision !== candidate.revision)
                  return false;
              }
              return true;
            },
            recordStageLane
          )
        );
      }
      for (const receipt of receipts) {
        const record = hostCandidates.get(receipt.candidateId);
        if (record !== void 0) {
          if (record.candidate.state !== "published")
            record.candidate = Object.freeze({ ...record.candidate, state: "published" });
          if (receipt.frame.completed !== void 0) {
            void receipt.frame.completed.then(void 0, (cause) => {
              record.cleanup ??= { completed: new Promise(() => {
              }), receipt };
              fault(record.world, cause);
            });
            try {
              record.residency?.track?.(receipt.frame.completed);
            } catch (cause) {
              record.cleanup = { completed: new Promise(() => {
              }), receipt };
              throw fault(record.world, cause);
            }
          }
        }
      }
      if (hasDeferredRetirements) {
        hasDeferredRetirements = false;
        for (const record of hostCandidates.values()) {
          const next = record.retirementSuccessor;
          if (next === void 0) continue;
          if (record.cleanup !== void 0 || candidateRecord(next.candidate) !== next || next.cleanup !== void 0 || next.candidate.state !== "accepted" && next.candidate.state !== "published") {
            delete record.retirementSuccessor;
            continue;
          }
          if (next.candidate.state === "published" && hasSuccessorBinding(record, next.candidate, false, false)) {
            delete record.retirementSuccessor;
            try {
              scheduleCandidateCleanup(record, false, "retire");
            } catch (cause) {
              throw fault(record.world, cause);
            }
          } else {
            hasDeferredRetirements = true;
          }
        }
      }
      return receipts;
    }
  };
  const prepareResidencyAsync = async (record, port, signal, waitForCapacity = false) => {
    const cancelled = () => new DynamicGeometryError(
      "dynamic-geometry-candidate-state",
      "preparation is current and has not been cancelled",
      "discard the stale preparation"
    );
    if (signal?.aborted) return err(cancelled());
    const captured = capturePipelines(record);
    if (!captured.ok) {
      await scheduleCandidateCleanup(record, false, "cancel");
      return captured;
    }
    const pending = Promise.resolve().then(
      () => port.prepare(
        {
          world: record.world,
          entity: record.entity,
          meshHandle: record.meshHandle,
          assetRevision: record.assetRevision.version(record.meshHandle).unwrap(),
          mesh: record.mesh,
          ...record.pipelinePreparation === void 0 ? {} : { pipelinePreparation: record.pipelinePreparation }
        },
        {
          ...signal === void 0 ? {} : { signal },
          waitForCapacity,
          transfers: record.meshTransfers
        }
      )
    );
    record.residencyPending = pending.then((result) => {
      if (result.ok) {
        record.residency = result.value;
      }
    });
    void record.residencyPending.catch((cause) => fault(record.world, cause));
    const cancel = () => {
      try {
        scheduleCandidateCleanup(record, false, "cancel");
      } catch (cause) {
        fault(record.world, cause);
      }
    };
    signal?.addEventListener("abort", cancel, { once: true });
    try {
      const resident = await pending;
      await record.residencyPending;
      delete record.residencyPending;
      if (!resident.ok) {
        await scheduleCandidateCleanup(record, false, "cancel");
        return resident;
      }
      const stale = !attachedWorlds.has(record.world) ? new DynamicGeometryError(
        "dynamic-geometry-world-not-attached",
        "the preparation World is still attached",
        "discard preparation from the detached World"
      ) : record.generation !== currentGeneration() ? new DynamicGeometryError(
        "dynamic-geometry-generation-mismatch",
        "preparation belongs to the current Render generation",
        "prepare geometry again after Render recovery"
      ) : signal?.aborted || record.cleanup !== void 0 || !record.assetRevision.matchesCurrent() ? cancelled() : !resident.value.isCurrent() || record.materialIsCurrent?.() === false ? new DynamicGeometryError(
        "dynamic-geometry-gpu-not-ready",
        "the prepared physical allocation remains current",
        "prepare geometry again after Render readiness"
      ) : void 0;
      if (stale !== void 0) {
        await scheduleCandidateCleanup(record, true, "cancel");
        return err(stale);
      }
      ensureHealthyWorld(record.world);
      return ok(record.candidate);
    } catch (cause) {
      throw fault(record.world, cause);
    } finally {
      signal?.removeEventListener("abort", cancel);
    }
  };
  const prepareResidencySync = (record, getGpuStore) => {
    const world = record.world;
    const meshHandle = record.meshHandle;
    try {
      const residencyStore = getGpuStore();
      record.residencyStore = residencyStore;
      const resident = residencyStore.prepareMeshResidency(
        meshHandle,
        record.mesh,
        record.assetRevision.version(meshHandle).unwrap(),
        worldRenderResources(world),
        void 0,
        (physical) => {
          record.residency = {
            ...physical.lease,
            mesh: physical.entry,
            isCurrent: physical.current,
            commit: physical.commit
          };
        }
      );
      if (!resident.ok) throw resident.error;
      record.residency ??= {
        ...resident.value.lease,
        mesh: resident.value.entry,
        isCurrent: resident.value.current,
        commit: resident.value.commit
      };
      return ok(record.candidate);
    } catch (cause) {
      throw fault(world, cause);
    }
  };
  const cancelPreparedBatch = (candidates) => {
    for (const candidate of candidates) {
      const record = hostCandidates.get(candidate.candidateId);
      if (record === void 0) lifecycle.cancel(candidate);
      else scheduleCandidateCleanup(record, record.residency !== void 0, "cancel");
    }
  };
  const beginBatch = (inputs) => {
    const generation = synchronizeGeneration();
    const contents = [];
    for (const input of inputs) {
      if (!attachedWorlds.has(input.world))
        return err(
          new DynamicGeometryError(
            "dynamic-geometry-world-not-attached",
            "each candidate World is attached",
            "attach the World before preparing geometry"
          )
        );
      const content = captureInput(input);
      if (!content.ok) return content;
      const fixedStep = fixedStepOf(input.world);
      contents.push({ ...content.value, ...fixedStep === void 0 ? {} : { fixedStep } });
    }
    const prepared = lifecycle.prepareCandidates(contents, generation);
    if (!prepared.ok) return prepared;
    const records = [];
    try {
      for (const [index, input] of inputs.entries()) {
        const candidate = prepared.value[index];
        if (candidate === void 0) throw new Error("incomplete prepared geometry roster");
        const result = beginPreparation(input, candidate);
        if (!result.ok) {
          cancelPreparedBatch(prepared.value);
          return result;
        }
        records.push(result.value);
      }
      return ok(records);
    } catch (cause) {
      cancelPreparedBatch(prepared.value);
      throw cause;
    }
  };
  return {
    host,
    async preparePipelines(candidates, getGpuStore, prepare, signal) {
      const unavailable = () => new DynamicGeometryError(
        "dynamic-geometry-gpu-not-ready",
        "pipeline preparation uses current prepared candidate credentials",
        "prepare the current mesh and material again"
      );
      const records = [];
      for (const candidate of candidates) {
        const record = candidateRecord(candidate);
        if (record === void 0 || record.candidate.state !== "prepared" || signal?.aborted || !host.isDynamicGeometryCurrent(candidate))
          return err(unavailable());
        const captured = capturePipelines(record);
        if (!captured.ok) return captured;
        if (record.pipelinePreparation === void 0) return err(unavailable());
        records.push(record);
      }
      const results = await Promise.all(
        records.map(async (record) => {
          const mesh = record.residencyStore === getGpuStore() ? record.residency?.mesh : void 0;
          const preparation = record.pipelinePreparation;
          if (mesh === void 0 || preparation === void 0) return err(unavailable());
          const isCurrent = () => record.cleanup === void 0 && record.generation === currentGeneration() && attachedWorlds.has(record.world) && record.residency !== void 0 && record.residency.isCurrent?.() !== false && record.materialIsCurrent?.() !== false;
          record.pipelines?.release();
          record.pipelines = { isCurrent: () => false, release() {
          } };
          record.pipelineAbort?.abort();
          const controller = new AbortController();
          record.pipelineAbort = controller;
          const cancel = () => controller.abort();
          signal?.addEventListener("abort", cancel, { once: true });
          if (signal?.aborted) cancel();
          try {
            const result = await prepare(
              {
                preparation,
                world: record.world,
                mesh,
                asset: record.mesh,
                isCurrent
              },
              controller.signal
            );
            if (result.ok && isCurrent() && !controller.signal.aborted)
              record.pipelines = result.value;
            else if (result.ok) {
              result.value.release();
              return err(unavailable());
            }
            return result;
          } finally {
            signal?.removeEventListener("abort", cancel);
            if (record.pipelineAbort === controller) delete record.pipelineAbort;
          }
        })
      );
      const failure4 = results.find((result) => !result.ok);
      return failure4 !== void 0 && !failure4.ok ? failure4 : ok(void 0);
    },
    currentnessRevision: () => currentnessRevision,
    fault,
    ensureHealthyWorld,
    async prepareAsync(input, port, signal) {
      if (signal?.aborted)
        return err(
          new DynamicGeometryError(
            "dynamic-geometry-candidate-state",
            "preparation has not been cancelled",
            "discard the cancelled preparation"
          )
        );
      const prepared = beginPreparation(input);
      return prepared.ok ? prepareResidencyAsync(prepared.value, port, signal) : prepared;
    },
    prepareSync(input, getGpuStore) {
      const prepared = beginPreparation(input);
      return prepared.ok ? prepareResidencySync(prepared.value, getGpuStore) : prepared;
    },
    prepareBatchSync(inputs, getGpuStore) {
      const begun = beginBatch(inputs);
      if (!begun.ok) return begun;
      const candidates = begun.value.map((record) => record.candidate);
      const results = [];
      for (const record of begun.value) {
        const result = prepareResidencySync(record, getGpuStore);
        if (!result.ok) {
          cancelPreparedBatch(candidates);
          return result;
        }
        results.push(result.value);
      }
      return ok(Object.freeze(results));
    },
    async prepareBatchAsync(inputs, port, signal) {
      if (signal?.aborted)
        return err(
          new DynamicGeometryError(
            "dynamic-geometry-candidate-state",
            "preparation has not been cancelled",
            "discard the cancelled preparation"
          )
        );
      const begun = beginBatch(inputs);
      if (!begun.ok) return begun;
      const candidates = begun.value.map((record) => record.candidate);
      for (const record of begun.value) {
        const captured = capturePipelines(record);
        if (!captured.ok) {
          cancelPreparedBatch(candidates);
          return captured;
        }
      }
      const results = [];
      for (let offset = 0; offset < begun.value.length; offset += port.maxConcurrentPreparations) {
        const window = begun.value.slice(offset, offset + port.maxConcurrentPreparations);
        let prepared;
        try {
          prepared = await Promise.all(
            window.map((record) => prepareResidencyAsync(record, port, signal, true))
          );
        } catch (cause) {
          await Promise.allSettled(window.map((record) => record.residencyPending));
          cancelPreparedBatch(candidates);
          throw cause;
        }
        const refused = prepared.find((result) => !result.ok);
        if (refused !== void 0 && !refused.ok) {
          cancelPreparedBatch(candidates);
          return refused;
        }
        for (const result of prepared) if (result.ok) results.push(result.value);
      }
      return ok(Object.freeze(results));
    }
  };
}
function createDynamicGeometryHost(options) {
  const owner = createDynamicGeometryHostOwner(options);
  const { attachedWorlds, getGpuStore } = options;
  return {
    ...owner.host,
    prepareDynamicGeometryPipelines: (candidates, preparation) => options.prepareCandidatePipelines === void 0 ? Promise.resolve(
      err(
        new DynamicGeometryError(
          "dynamic-geometry-gpu-not-ready",
          "a Renderer pipeline preparation owner is attached",
          "use the rendering host for asynchronous draw preparation"
        )
      )
    ) : owner.preparePipelines(
      candidates,
      getGpuStore,
      options.prepareCandidatePipelines,
      preparation?.signal
    ),
    prepareDynamicGeometry: (input) => owner.prepareSync(input, getGpuStore),
    prepareDynamicGeometryCandidates: (inputs) => owner.prepareBatchSync(inputs, getGpuStore),
    prepareMeshResidency(world, meshHandle, observePhase) {
      if (!attachedWorlds.has(world))
        return err(
          new MeshResidencyError(
            "mesh-residency-world-not-attached",
            "the MeshAsset World is attached to this Renderer",
            "call renderer.attach(world) before preparing mesh residency",
            { meshHandle }
          )
        );
      const mesh = resolveMeshAsset(world, meshHandle);
      if (mesh === void 0)
        return err(
          new MeshResidencyError(
            "mesh-residency-invalid-handle",
            "the shared handle resolves to a MeshAsset in its owning World",
            "allocate the mesh through assets.create and pass its live handle",
            { meshHandle }
          )
        );
      const contentVersion = runtimeAssets(world.assets).version(meshHandle).unwrap();
      const sourceCurrent = () => {
        const current = runtimeAssets(world.assets).version(meshHandle);
        return current.ok && current.value === contentVersion;
      };
      const store = getGpuStore();
      const profilePhase = observePhase === void 0 ? void 0 : (phase, action) => {
        const startMs = performance.now();
        try {
          return action();
        } finally {
          observePhase(phase, startMs, performance.now());
        }
      };
      const resident = store.prepareMeshResidency(
        meshHandle,
        mesh,
        contentVersion,
        worldRenderResources(world),
        profilePhase
      );
      if (!resident.ok)
        return err(
          new MeshResidencyError(
            "mesh-residency-gpu-failed",
            "the MeshAsset has GPU residency for the current Renderer device generation",
            "repair the reported asset or RHI error before publishing the streamed mesh",
            resident.error
          )
        );
      const physical = resident.value;
      const residency = physical.lease;
      let state = "prepared";
      return ok({
        isCurrent: () => state === "prepared" && sourceCurrent() && physical.current(),
        commit: (entity) => {
          if (state !== "prepared") return false;
          if (!sourceCurrent() || !physical.current() || meshHandleOf(world, entity) !== meshHandle) {
            state = "cancelled";
            residency.release(false);
            return false;
          }
          state = "committed";
          if (!physical.commit()) throw new Error("preflighted mesh residency could not commit");
          residency.release(false);
          return true;
        },
        cancel: () => {
          if (state !== "prepared") return;
          state = "cancelled";
          residency.release(false);
        }
      });
    }
  };
}
function createDynamicGeometrySourceHost(options) {
  if (!Number.isSafeInteger(options.residency.maxConcurrentPreparations) || options.residency.maxConcurrentPreparations < 1)
    throw new RangeError("residency preparation concurrency must be a positive safe integer");
  const owner = createDynamicGeometryHostOwner({
    ...options,
    currentGeneration: () => options.currentGeneration() ?? 0
  });
  const currentness = /* @__PURE__ */ new WeakMap();
  return {
    ...owner.host,
    currentGeneration: options.currentGeneration,
    dynamicGeometryCurrentness(world) {
      const generation = options.currentGeneration();
      const residency = options.residency.currentnessToken?.();
      if (generation === void 0 || residency === void 0 || !options.attachedWorlds.has(world) || owner.host.dynamicGeometryFault(world) !== void 0)
        return void 0;
      const revision = owner.currentnessRevision(), assets = runtimeAssets(world.assets).currentRevision, materials = readComponentMutationEpoch(world, MeshRenderer), previous = currentness.get(world);
      if (previous?.generation === generation && previous.residency === residency && previous.owner === revision && previous.assets === assets && previous.materials === materials)
        return previous.token;
      const token = Object.freeze({});
      currentness.set(world, { generation, residency, owner: revision, assets, materials, token });
      return token;
    },
    prepareDynamicGeometry(input, preparation) {
      if (options.currentGeneration() === void 0)
        return Promise.resolve(
          err(
            new DynamicGeometryError(
              "dynamic-geometry-gpu-not-ready",
              "the source has an active Render generation",
              "wait for Render readiness before preparing geometry"
            )
          )
        );
      return owner.prepareAsync(input, options.residency, preparation?.signal);
    },
    prepareDynamicGeometryCandidates(inputs, preparation) {
      if (options.currentGeneration() === void 0)
        return Promise.resolve(
          err(
            new DynamicGeometryError(
              "dynamic-geometry-gpu-not-ready",
              "the source has an active Render generation",
              "wait for Render readiness before preparing geometry"
            )
          )
        );
      return owner.prepareBatchAsync(inputs, options.residency, preparation?.signal);
    },
    async prepareMeshResidency(world, meshHandle, preparation) {
      const failure4 = (code, actual) => err(
        new MeshResidencyError(
          code,
          "a live source MeshAsset and current physical residency",
          "wait for Render readiness and retain the MeshAsset through preparation",
          actual
        )
      );
      if (!options.attachedWorlds.has(world)) return failure4("mesh-residency-world-not-attached");
      owner.ensureHealthyWorld(world);
      const mesh = resolveMeshAsset(world, meshHandle);
      if (mesh === void 0) return failure4("mesh-residency-invalid-handle");
      const generation = options.currentGeneration();
      if (generation === void 0 || preparation?.signal?.aborted)
        return failure4("mesh-residency-gpu-not-ready");
      const captured = runtimeAssets(world.assets).snapshot(meshHandle);
      if (!captured.ok) return failure4("mesh-residency-invalid-handle", captured.error);
      const snapshot = captured.value;
      const retained = runtimeAssets(world.assets).retain(meshHandle);
      if (!retained.ok) {
        snapshot.dispose();
        return failure4("mesh-residency-invalid-handle", retained.error);
      }
      const releaseWorld = () => {
        runtimeAssets(world.assets).release(meshHandle).unwrap();
        snapshot.dispose();
      };
      let result;
      try {
        result = await options.residency.prepare(
          {
            world,
            meshHandle,
            assetRevision: snapshot.version(meshHandle).unwrap(),
            mesh: snapshot.read(meshHandle).unwrap()
          },
          preparation
        );
      } catch (cause) {
        throw owner.fault(world, cause);
      }
      if (!result.ok) {
        releaseWorld();
        return failure4("mesh-residency-gpu-failed", result.error);
      }
      const residency = result.value;
      let active = true;
      const isCurrent = () => active && options.attachedWorlds.has(world) && options.currentGeneration() === generation && snapshot.matchesCurrent() && residency.isCurrent();
      const release = (evict) => {
        if (!active) return;
        active = false;
        try {
          const completion = residency.release(evict);
          if (completion === void 0) releaseWorld();
          else void completion.then(releaseWorld).catch((cause) => owner.fault(world, cause));
        } catch (cause) {
          throw owner.fault(world, cause);
        }
      };
      if (preparation?.signal?.aborted || !isCurrent()) {
        release(true);
        return failure4("mesh-residency-gpu-not-ready");
      }
      return ok({
        isCurrent,
        commit: (entity) => {
          if (!isCurrent() || meshHandleOf(world, entity) !== meshHandle) {
            release(true);
            return false;
          }
          release(false);
          return true;
        },
        cancel: () => release(true)
      });
    }
  };
}
function createRendererDynamicGeometryHost(options) {
  const { renderSystem, ...hostOptions } = options;
  return createDynamicGeometryHost({
    ...hostOptions,
    isConsumedByRenderFrame: (candidate) => renderSystem.isDynamicGeometryConsumed(
      worldRenderResources(candidate.world),
      candidate.entity ?? -1,
      candidate.meshHandle
    ),
    recordStageLane: (candidate) => renderSystem.dynamicGeometryRecordStageLane(
      worldRenderResources(candidate.world),
      candidate.entity ?? -1,
      candidate.meshHandle
    )
  });
}
function createRendererDynamicGeometryController(options, maxMeshBytes) {
  const lifecycle = createDynamicGeometryLifecycle(void 0, maxMeshBytes);
  return {
    lifecycle,
    host: createRendererDynamicGeometryHost({ ...options, lifecycle })
  };
}

// sdk/engine/node_modules/@forgeax/engine-render/src/device/device-scope.ts
import { err as err2, ok as ok2 } from "@forgeax/engine-types";
var DeviceResourceRef = class {
  kind;
  owner;
  generation;
  value;
  constructor(kind, owner, generation, value) {
    this.kind = kind;
    this.owner = owner;
    this.generation = generation;
    this.value = value;
  }
  isCurrent(scope) {
    return scope.accepts(this);
  }
  isStale(scope) {
    return !this.isCurrent(scope);
  }
};
function idempotentCleanup(cleanup) {
  let cleaned = false;
  return (value) => {
    if (cleaned) return;
    cleaned = true;
    return cleanup(value);
  };
}
var DeviceScope = class _DeviceScope {
  generation;
  owner;
  parent;
  lifecycleState = "active";
  resources = /* @__PURE__ */ new Map();
  children = /* @__PURE__ */ new Set();
  constructor(generation, owner, parent) {
    this.generation = generation;
    this.owner = owner;
    this.parent = parent;
    parent?.children.add(this);
  }
  static create(generation, owner) {
    if (!Number.isSafeInteger(generation) || generation < 0) {
      throw new RangeError("DeviceScope generation must be a non-negative safe integer.");
    }
    if (owner.length === 0) throw new TypeError("DeviceScope owner must not be empty.");
    return new _DeviceScope(generation, owner);
  }
  get state() {
    return this.lifecycleState;
  }
  get childrenSnapshot() {
    return [...this.children];
  }
  /** Create a renderer-owned child scope without exposing a second device owner. */
  createChild(owner) {
    if (this.lifecycleState !== "active") {
      throw new Error("Cannot create a child DeviceScope from an inactive scope.");
    }
    if (owner.length === 0) throw new TypeError("DeviceScope child owner must not be empty.");
    return new _DeviceScope(this.generation, owner, this);
  }
  ref(kind, value) {
    const ref = new DeviceResourceRef(kind, this.owner, this.generation, value);
    this.resources.set(ref, { ref, cleanup: () => void 0 });
    return ref;
  }
  accepts(ref) {
    return this.lifecycleState === "active" && ref.owner === this.owner && ref.generation === this.generation;
  }
  isAlive() {
    return this.lifecycleState === "active";
  }
  resourceDelta() {
    return this.resources.size;
  }
  /** @internal */
  _adopt(kind, value, cleanup) {
    const ref = new DeviceResourceRef(kind, this.owner, this.generation, value);
    this.resources.set(ref, {
      ref,
      cleanup: idempotentCleanup(cleanup)
    });
    return ref;
  }
  /** @internal Remove ownership only after the resource's cleanup succeeded. */
  _release(ref) {
    this.resources.delete(ref);
  }
  /** @internal */
  _clearResources() {
    const resources = [...this.resources.values()];
    this.resources.clear();
    for (const resource of resources.reverse()) {
      try {
        const pending = resource.cleanup(resource.ref.value);
        if (pending instanceof Promise) void pending.catch(() => void 0);
      } catch {
      }
    }
    return resources;
  }
  /** Mark an active child as retiring without releasing in-flight resources. */
  beginRetire() {
    if (this.lifecycleState === "active") this.lifecycleState = "retiring";
  }
  clearChildren() {
    for (const child of [...this.children].reverse()) {
      child.retire();
    }
  }
  detachChild(child) {
    this.children.delete(child);
  }
  retire() {
    if (this.lifecycleState !== "active" && this.lifecycleState !== "retiring") return;
    this.lifecycleState = "retiring";
    this.clearChildren();
    this._clearResources();
    this.lifecycleState = "retired";
    this.parent?.detachChild(this);
  }
  abandon() {
    if (this.lifecycleState !== "active") return;
    this.lifecycleState = "abandoned";
    this.clearChildren();
    this._clearResources();
    this.parent?.detachChild(this);
  }
  dispose() {
    if (this.lifecycleState === "disposed") return;
    this.lifecycleState = "disposed";
    this.clearChildren();
    this._clearResources();
    this.parent?.detachChild(this);
  }
  async replace(generation, resources) {
    const replacement = new _DeviceScope(generation, this.owner, this);
    const transaction = new LifecycleTransaction(replacement);
    for (const resource of resources) transaction.add(resource);
    const result = await transaction.commit();
    if (!result.ok) {
      replacement.abandon();
      return result;
    }
    if (!this.isAlive()) {
      replacement.dispose();
      return transaction.failure("dispose");
    }
    this.detachChild(replacement);
    this.retire();
    return ok2(replacement);
  }
  /** @internal */
  _receipt() {
    return {
      owner: this.owner,
      generation: this.generation,
      resourceCount: this.resources.size
    };
  }
};
function adoptBackendDevice(scope, device, dispose) {
  if (dispose !== void 0) scope._adopt("device", device, dispose);
}
var LifecycleTransaction = class {
  constructor(scope, options = {}) {
    this.scope = scope;
    this.options = options;
  }
  scope;
  resources = [];
  options;
  committed = false;
  add(spec) {
    if (this.committed) throw new Error("LifecycleTransaction is already committed.");
    this.resources.push(spec);
    return this;
  }
  async commit() {
    if (this.committed) return this.failure("create");
    this.committed = true;
    const created = [];
    for (let index = 0; index < this.resources.length; index += 1) {
      const spec = this.resources[index];
      if (spec === void 0) continue;
      try {
        if (this.options.failureAt === index + 1) {
          throw new Error(`injected lifecycle failure at ${index + 1}`);
        }
        const value = await spec.create();
        if (!this.scope.isAlive()) {
          await this.cleanupOne(value, created, idempotentCleanup(spec.cleanup));
          return this.failure("dispose");
        }
        created.push({ spec, value, cleanup: idempotentCleanup(spec.cleanup) });
      } catch (cause) {
        const cleanupFailures = await this.cleanupCreated(created);
        return this.failure("create", spec.kind, cleanupFailures, cause);
      }
    }
    if (!this.scope.isAlive()) {
      const cleanupFailures = await this.cleanupCreated(created);
      return this.failure("dispose", this.resources.at(-1)?.kind ?? "listener", cleanupFailures);
    }
    for (const item of created) this.scope._adopt(item.spec.kind, item.value, item.spec.cleanup);
    return ok2(this.scope);
  }
  failure(operation, resourceKind = this.resources.at(-1)?.kind ?? "listener", cleanupFailures = [], cause = void 0) {
    return err2({
      primary: new LifecycleConstructionError({
        owner: this.scope.owner,
        generation: this.scope.generation,
        operation,
        resourceKind,
        cause,
        cleanupFailures,
        receipt: this.scope._receipt()
      }),
      cleanupFailures,
      receipt: this.scope._receipt()
    });
  }
  async cleanupCreated(created) {
    const failures = [];
    for (let index = created.length - 1; index >= 0; index -= 1) {
      const item = created[index];
      if (item === void 0) continue;
      try {
        await item.cleanup(item.value);
      } catch (cause) {
        failures.push({ resourceKind: item.spec.kind, cause });
      }
    }
    return failures;
  }
  async cleanupOne(value, created, cleanup) {
    await this.cleanupCreated(created);
    try {
      await cleanup(value);
    } catch {
    }
  }
};

// sdk/engine/node_modules/@forgeax/engine-render/src/features/prepared-gpu-work.ts
import { err as err3, ok as ok3 } from "@forgeax/engine-types";
function validRenderFeatureWorkgroups(workgroups, limit = 4294967295) {
  if (!Array.isArray(workgroups) || workgroups.length < 1 || workgroups.length > 3) return false;
  const maximum = Math.min(limit, 4294967295);
  for (let axis = 0; axis < workgroups.length; axis += 1) {
    const count = workgroups[axis];
    if (axis !== 0 && count === void 0) continue;
    if (count === void 0 || !Number.isInteger(count) || count < 0 || count > maximum)
      return false;
  }
  return true;
}
function encodeRenderFeatureGpuComputePass(pass, work, resolveTarget) {
  for (const dispatch of work.dispatches) {
    pass.setPipeline(dispatch.pipeline);
    if (dispatch.resolveBindGroup !== void 0 && resolveTarget === void 0) {
      throw new Error("Graph texture resolver required for sampled compute work");
    }
    pass.setBindGroup(
      0,
      dispatch.resolveBindGroup !== void 0 && resolveTarget !== void 0 ? dispatch.resolveBindGroup(resolveTarget) : dispatch.bindGroup
    );
    if ("workgroups" in dispatch) pass.dispatchWorkgroups(...dispatch.workgroups);
    else pass.dispatchWorkgroupsIndirect(dispatch.indirectBuffer, dispatch.indirectOffset);
  }
}
var VFX_PARKED_RESOURCE_FRAME_LIMIT = 8;
var VFX_PARKED_RESOURCE_LIMIT = 256;
var COMPILED_PROGRAM_CACHE_LIMIT = 64;
var BUFFER_USAGE = {
  storage: 128,
  uniform: 64,
  indirect: 256,
  vertex: 32,
  index: 16,
  "copy-src": 4
};
var COPY_DST = 8;
function alignedSize(size) {
  return Math.max(4, Math.ceil(size / 4) * 4);
}
function graphAccess(type) {
  switch (type) {
    case "uniform":
      return "uniform-read";
    case "read-only-storage":
      return "storage-read";
    case "storage":
      return "storage-read-write";
  }
}
function bytes(value) {
  return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
}
function failure(featureIdentity, operation, kind, name, reason) {
  const recovery = reason.startsWith("rhi-not-available:") ? "next-frame" : "renderer-recover";
  return new RenderFeaturePreparationFailedError(
    featureIdentity,
    -1,
    operation,
    kind,
    name,
    reason,
    recovery
  );
}
function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value).sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0).map(([key, child]) => `${key}:${stable(child)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
function equalDescriptorValue(left, right) {
  if (Object.is(left, right)) return true;
  if (typeof left !== typeof right || left === null || right === null) return false;
  if (ArrayBuffer.isView(left) || ArrayBuffer.isView(right)) {
    if (!ArrayBuffer.isView(left) || !ArrayBuffer.isView(right)) return false;
    if (left.byteLength !== right.byteLength) return false;
    const leftBytes = new Uint8Array(left.buffer, left.byteOffset, left.byteLength);
    const rightBytes = new Uint8Array(right.buffer, right.byteOffset, right.byteLength);
    for (let index = 0; index < leftBytes.length; index += 1) {
      if (leftBytes[index] !== rightBytes[index]) return false;
    }
    return true;
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
    for (let index = 0; index < left.length; index += 1) {
      if (!equalDescriptorValue(left[index], right[index])) return false;
    }
    return true;
  }
  if (typeof left === "object" && typeof right === "object") {
    const leftRecord = left;
    const rightRecord = right;
    const leftKeys = Object.keys(leftRecord);
    const rightKeys = Object.keys(rightRecord);
    if (leftKeys.length !== rightKeys.length) return false;
    for (const key of leftKeys) {
      if (!Object.hasOwn(rightRecord, key)) return false;
      if (!equalDescriptorValue(leftRecord[key], rightRecord[key])) return false;
    }
    return true;
  }
  return false;
}
function cloneDescriptorValue(value) {
  if (Array.isArray(value)) {
    return Object.freeze(value.map((child) => cloneDescriptorValue(child)));
  }
  if (value !== null && typeof value === "object" && !ArrayBuffer.isView(value)) {
    return Object.freeze(
      Object.fromEntries(
        Object.entries(value).map(([key, child]) => [
          key,
          cloneDescriptorValue(child)
        ])
      )
    );
  }
  if (ArrayBuffer.isView(value)) {
    const source = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    return new Uint8Array(source);
  }
  return value;
}
function cloneProgramDescriptor(descriptor) {
  if (isOwnedRenderFeatureProgramData(descriptor)) return descriptor;
  return cloneDescriptorValue(descriptor);
}
var ownedProgramData = /* @__PURE__ */ new WeakSet();
var ownedProgramKeys = /* @__PURE__ */ new WeakMap();
function ownRenderFeatureProgramData(value) {
  if (isOwnedRenderFeatureProgramData(value)) return value;
  const owned = cloneDescriptorValue(value);
  const plainJson = (input) => {
    if (input === null || input === void 0) return true;
    if (typeof input !== "object") return ["string", "number", "boolean"].includes(typeof input);
    const array = Array.isArray(input), prototype = Object.getPrototypeOf(input);
    if (!array && prototype !== Object.prototype && prototype !== null) return false;
    return Reflect.ownKeys(input).every((key) => {
      if (array && key === "length") return true;
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      return typeof key === "string" && descriptor?.enumerable === true && "value" in descriptor && plainJson(descriptor.value);
    });
  };
  const immutableJson = (value2) => {
    if (value2 === null || value2 === void 0) return true;
    if (typeof value2 !== "object") return ["string", "number", "boolean"].includes(typeof value2);
    return Object.isFrozen(value2) && Object.values(value2).every(immutableJson);
  };
  if (owned !== null && typeof owned === "object" && plainJson(value) && immutableJson(owned))
    ownedProgramData.add(owned);
  return owned;
}
function isOwnedRenderFeatureProgramData(value) {
  return value !== null && typeof value === "object" && ownedProgramData.has(value);
}
var nativePlanPublications = /* @__PURE__ */ new WeakMap();
function createRenderFeatureNativePlanBuilder(input, resourceAdmission) {
  const { transaction, featureIdentity, frameNumber, generation } = input;
  const views = input.views.map(({ identity, render }) => ({ identity, render }));
  const viewNames = new Set(views.map((view) => view.identity));
  if (viewNames.size !== views.length) throw new Error("Duplicate native plan view");
  const scopes = /* @__PURE__ */ new Map();
  let closed = false;
  const scopeKey = (scope) => {
    if (scope === "frame") return "frame";
    if (scope === null || typeof scope !== "object" || !viewNames.has(scope.view))
      throw new Error("Unknown native plan scope");
    return `view:${scope.view}`;
  };
  const guardedAdmission = resourceAdmission === void 0 ? void 0 : Object.fromEntries(
    Object.entries(resourceAdmission).map(([name, method]) => [
      name,
      (scope, ...args) => {
        if (closed) throw new Error("Native plan builder is closed");
        scopeKey(scope);
        return method(
          scope,
          ...args
        );
      }
    ])
  );
  return {
    ...guardedAdmission === void 0 ? {} : { resourceAdmission: guardedAdmission },
    scope: (scope) => {
      if (closed) throw new Error("Native plan builder is closed");
      const key = scopeKey(scope);
      let work = scopes.get(key);
      if (work === void 0) {
        work = {
          scope: scope === "frame" ? "frame" : { view: scope.view },
          resources: [],
          passes: []
        };
        scopes.set(key, work);
      }
      return work;
    },
    finish: (finalWork, sourceFeedback, options) => {
      if (closed) throw new Error("Native plan builder is closed");
      closed = true;
      const admitted = /* @__PURE__ */ new Set();
      for (const work of finalWork) {
        const key = scopeKey(work.scope);
        if (!scopes.has(key) || admitted.has(key) || !Array.isArray(work.resources) || !Array.isArray(work.passes))
          throw new Error("Native plan work must use each created scope at most once");
        admitted.add(key);
      }
      const native = {};
      const planned = {
        work: [],
        native,
        ...sourceFeedback === void 0 ? {} : { sourceFeedback }
      };
      nativePlanPublications.set(planned, {
        transaction,
        featureIdentity,
        frameNumber,
        generation,
        views,
        ...options?.batchReadOnlyDepthRaster === true ? { batchReadOnlyDepthRaster: true } : {},
        work: finalWork,
        ...guardedAdmission === void 0 ? {} : { resourceAdmission: guardedAdmission },
        consumed: false
      });
      return planned;
    }
  };
}
function isRenderFeatureNativePlan(value) {
  return value !== null && typeof value === "object" && nativePlanPublications.has(value);
}
function renderFeatureNativeResourceAdmission(planned) {
  const publication = nativePlanPublications.get(planned);
  return publication?.consumed === true ? publication.resourceAdmission : void 0;
}
function renderFeatureNativeDepthBatchPermission(planned) {
  const publication = nativePlanPublications.get(planned);
  return publication?.consumed === true && publication.batchReadOnlyDepthRaster === true;
}
function consumeRenderFeatureNativePlan(planned, expected) {
  if (planned === null || typeof planned !== "object") return void 0;
  const publication = nativePlanPublications.get(planned);
  if (publication === void 0 || publication.consumed || publication.transaction !== expected.transaction || publication.featureIdentity !== expected.featureIdentity || publication.frameNumber !== expected.frameNumber || publication.generation !== expected.generation || publication.views.length !== expected.views.length || !publication.views.every(
    (view, index) => view.identity === expected.views[index]?.identity && view.render === expected.views[index]?.render
  ))
    return void 0;
  publication.consumed = true;
  return publication.work;
}
function rhiReason(error) {
  if (error === null || typeof error !== "object") return String(error);
  const code = "code" in error ? String(error.code) : "webgpu-runtime-error";
  const hint = "hint" in error ? String(error.hint) : error instanceof Error ? error.message : String(error);
  const detail = "detail" in error && error.detail !== void 0 ? `:${stable(error.detail)}` : "";
  return `${code}:${hint}${detail}`;
}
function createRenderFeatureGpuWorkSession(input) {
  const programs = /* @__PURE__ */ new Map();
  const compiledPrograms = /* @__PURE__ */ new Map();
  let disposed = false;
  const preparingPrograms = /* @__PURE__ */ new Map();
  const parkedPrograms = /* @__PURE__ */ new Map();
  const programRefs = /* @__PURE__ */ new Map();
  const buffers = /* @__PURE__ */ new Map();
  const parkedBuffers = /* @__PURE__ */ new Map();
  const bufferRefs = /* @__PURE__ */ new Map();
  const textureViews = /* @__PURE__ */ new Map();
  const textureViewRefs = /* @__PURE__ */ new Map();
  const samplers = /* @__PURE__ */ new Map();
  const samplerRefs = /* @__PURE__ */ new Map();
  const bindings = /* @__PURE__ */ new Map();
  const parkedBindings = /* @__PURE__ */ new Map();
  const bindingRefs = /* @__PURE__ */ new Map();
  const resourceDomains = /* @__PURE__ */ new WeakMap();
  const touchedPrograms = /* @__PURE__ */ new Set();
  const touchedBuffers = /* @__PURE__ */ new Set();
  const touchedTextureViews = /* @__PURE__ */ new Set();
  const touchedSamplers = /* @__PURE__ */ new Set();
  const touchedBindings = /* @__PURE__ */ new Set();
  const parksUntouched = input.featureIdentity === "forgeax.vfx-render.gpu-particles";
  let frameSerial = 0;
  const retiring = /* @__PURE__ */ new Map();
  const changedResourceNames = /* @__PURE__ */ new Set();
  const destroyedBuffers = /* @__PURE__ */ new WeakSet();
  const snapshotIndexes = () => ({
    // Candidate preparation only inserts or overwrites active names. Keep
    // each name's first old value; accepted keys never move before commit.
    programs: /* @__PURE__ */ new Map(),
    buffers: /* @__PURE__ */ new Map(),
    bindings: /* @__PURE__ */ new Map(),
    textureViews: /* @__PURE__ */ new Map(),
    samplers: /* @__PURE__ */ new Map(),
    parkedPrograms: new Map(parkedPrograms),
    parkedBuffers: new Map(parkedBuffers),
    parkedBindings: new Map(parkedBindings),
    addedProgramRefs: [],
    addedBufferRefs: [],
    addedBindingRefs: [],
    addedTextureViewRefs: [],
    addedSamplerRefs: []
  });
  let candidate;
  const restore = (target, saved) => {
    target.clear();
    for (const [key, value] of saved) target.set(key, value);
  };
  const setCandidateName = (target, previous, name, item) => {
    const current = target.get(name);
    if (current === item) return;
    if (previous !== void 0 && !previous.has(name)) previous.set(name, current);
    target.set(name, item);
  };
  const restoreCandidateNames = (target, previous) => {
    for (const [name, item] of previous) {
      if (item === void 0) target.delete(name);
      else target.set(name, item);
    }
  };
  const destroyBuffers = (items) => {
    let first;
    for (const item of items) {
      if (!item.owned || destroyedBuffers.has(item.buffer)) continue;
      destroyedBuffers.add(item.buffer);
      const result = input.device.destroyBuffer(item.buffer);
      if (!result.ok && first === void 0)
        first = failure(
          input.featureIdentity,
          "retire-gpu-buffer",
          "vertex-data",
          item.name,
          result.error.code
        );
    }
    return first === void 0 ? ok3(void 0) : err3(first);
  };
  const abortFrame = () => {
    const previous = candidate;
    if (previous === void 0) return ok3(void 0);
    candidate = void 0;
    const createdBuffers = [];
    for (const reference of previous.addedBufferRefs) {
      const item = bufferRefs.get(reference);
      if (item !== void 0) createdBuffers.push(item);
    }
    const discard = (index, references) => {
      for (const reference of references) index.delete(reference);
    };
    restoreCandidateNames(programs, previous.programs);
    restoreCandidateNames(buffers, previous.buffers);
    restoreCandidateNames(bindings, previous.bindings);
    restoreCandidateNames(textureViews, previous.textureViews);
    restoreCandidateNames(samplers, previous.samplers);
    restore(parkedPrograms, previous.parkedPrograms);
    restore(parkedBuffers, previous.parkedBuffers);
    restore(parkedBindings, previous.parkedBindings);
    discard(programRefs, previous.addedProgramRefs);
    discard(bufferRefs, previous.addedBufferRefs);
    discard(bindingRefs, previous.addedBindingRefs);
    discard(textureViewRefs, previous.addedTextureViewRefs);
    discard(samplerRefs, previous.addedSamplerRefs);
    return destroyBuffers(createdBuffers);
  };
  const canParkBinding = (item) => item.entries.every(
    (entry) => entry.textureView === void 0 && entry.sampler === void 0 && (entry.buffer === void 0 || entry.buffer.owned)
  );
  const activateProgram = (item) => {
    const current = programs.get(item.name);
    if (current === void 0) {
      parkedPrograms.delete(item.name);
      setCandidateName(programs, candidate?.programs, item.name, item);
    }
  };
  const activateBuffer = (item) => {
    const current = buffers.get(item.name);
    if (current === void 0) {
      parkedBuffers.delete(item.name);
      setCandidateName(buffers, candidate?.buffers, item.name, item);
    }
  };
  const activateBindingName = (item) => {
    const current = bindings.get(item.name);
    if (current === void 0) {
      parkedBindings.delete(item.name);
      setCandidateName(bindings, candidate?.bindings, item.name, item);
    }
  };
  const activateBindings = (item) => {
    activateBindingName(item);
    activateProgram(item.program);
    for (const entry of item.buffers) activateBuffer(entry.item);
  };
  const touchProgram = (item) => {
    retiring.delete(item.reference);
    touchedPrograms.add(item);
  };
  const touchBuffer = (item) => {
    retiring.delete(item.reference);
    touchedBuffers.add(item);
  };
  const touchTextureView = (item) => {
    retiring.delete(item.reference);
    touchedTextureViews.add(item);
  };
  const touchSampler = (item) => {
    retiring.delete(item.reference);
    touchedSamplers.add(item);
  };
  const touchBindingName = (item) => {
    retiring.delete(item.reference);
    touchedBindings.add(item);
  };
  const touchBindings = (item) => {
    if (touchedBindings.has(item)) return;
    touchBindingName(item);
    touchProgram(item.program);
    for (const entry of item.entries) {
      if (entry.buffer !== void 0) touchBuffer(entry.buffer);
      if (entry.textureView !== void 0) touchTextureView(entry.textureView);
      if (entry.sampler !== void 0) touchSampler(entry.sampler);
    }
  };
  const currentProgram = (item) => programRefs.get(item.reference) === item && item.reference.generation === input.generation && (programs.get(item.name) ?? parkedPrograms.get(item.name)?.item) === item;
  const currentBuffer = (item) => bufferRefs.get(item.reference) === item && item.reference.generation === input.generation && (buffers.get(item.name) ?? parkedBuffers.get(item.name)?.item) === item;
  const currentBindings = (item) => bindingRefs.get(item.reference) === item && item.reference.generation === input.generation && (bindings.get(item.name) ?? parkedBindings.get(item.name)?.item) === item;
  const prepareProgram = (name, descriptor, waitForCompletion = false) => {
    const createAsync = waitForCompletion ? input.device.createComputePipelineAsync : void 0;
    const complete = (item2) => createAsync === void 0 || item2.completionQualified;
    const prior = programs.get(name) ?? parkedPrograms.get(name)?.item;
    if (prior !== void 0 && complete(prior) && equalDescriptorValue(prior.descriptor, descriptor)) {
      activateProgram(prior);
      touchProgram(prior);
      return ok3(prior.reference);
    }
    if (name.length === 0 || descriptor.wgsl.length === 0 || descriptor.entryPoints.length === 0) {
      return err3(
        failure(
          input.featureIdentity,
          "prepare-gpu-program",
          "pipeline",
          name,
          "descriptor-invalid"
        )
      );
    }
    let programKey = isOwnedRenderFeatureProgramData(descriptor) ? ownedProgramKeys.get(descriptor) : void 0;
    if (programKey === void 0) {
      programKey = stable(descriptor);
      if (isOwnedRenderFeatureProgramData(descriptor)) ownedProgramKeys.set(descriptor, programKey);
    }
    const compiled = compiledPrograms.get(programKey);
    if (compiled !== void 0 && complete(compiled)) {
      compiledPrograms.delete(programKey);
      compiledPrograms.set(programKey, compiled);
      const item2 = {
        ...compiled,
        name,
        // Equivalent recipes share native programs, but an admitted immutable
        // alias keeps its own detached descriptor for the existing identity check.
        descriptor: isOwnedRenderFeatureProgramData(descriptor) ? descriptor : compiled.descriptor,
        reference: Object.freeze({ generation: input.generation })
      };
      parkedPrograms.delete(name);
      setCandidateName(programs, candidate?.programs, name, item2);
      changedResourceNames.add(name);
      programRefs.set(item2.reference, item2);
      candidate?.addedProgramRefs.push(item2.reference);
      touchProgram(item2);
      return ok3(item2.reference);
    }
    const preparing = preparingPrograms.get(programKey);
    const preparationFailure = (reason) => failure(input.featureIdentity, "prepare-gpu-program", "pipeline", name, reason);
    if (preparing?.error !== void 0) return err3(preparing.error);
    if (preparing !== void 0 && preparing.pending > 0)
      return err3(preparationFailure("rhi-not-available:pipeline-pending"));
    const module = preparing === void 0 ? input.shaderModuleFactory.createShaderModule({
      label: name,
      code: descriptor.wgsl
    }) : ok3(preparing.module);
    if (!module.ok) {
      return err3(
        failure(
          input.featureIdentity,
          "prepare-gpu-program",
          "pipeline",
          name,
          rhiReason(module.error)
        )
      );
    }
    let bindGroupLayout = preparing?.bindGroupLayout;
    let pipelineLayout = "auto";
    if (preparing === void 0 && descriptor.bindings !== void 0) {
      if (descriptor.bindings.length !== 1) {
        return err3(
          failure(
            input.featureIdentity,
            "prepare-gpu-program",
            "pipeline",
            name,
            "one-bind-group-required"
          )
        );
      }
      const reflected = descriptor.bindings[0];
      if (reflected === void 0) {
        return err3(
          failure(
            input.featureIdentity,
            "prepare-gpu-program",
            "pipeline",
            name,
            "one-bind-group-required"
          )
        );
      }
      const storageCount = reflected.entries.filter(
        (entry) => (entry.visibility & 4) !== 0 && (entry.buffer?.type === "storage" || entry.buffer?.type === "read-only-storage")
      ).length;
      const storageLimit = input.device.limits.maxStorageBuffersPerShaderStage;
      if (storageCount > storageLimit) {
        return err3(
          failure(
            input.featureIdentity,
            "prepare-gpu-program",
            "pipeline",
            name,
            `storage-buffer-binding-limit:${storageCount}>${storageLimit}`
          )
        );
      }
      const createdLayout = input.device.createBindGroupLayout({
        ...reflected.label === void 0 ? {} : { label: reflected.label },
        entries: reflected.entries.map((entry) => ({
          binding: entry.binding,
          visibility: entry.visibility,
          ...entry.buffer === void 0 ? {} : { buffer: entry.buffer },
          ...entry.sampler === void 0 ? {} : { sampler: entry.sampler },
          ...entry.texture === void 0 ? {} : { texture: entry.texture },
          ...entry.storageTexture === void 0 ? {} : { storageTexture: entry.storageTexture }
        }))
      });
      if (!createdLayout.ok) {
        return err3(
          failure(
            input.featureIdentity,
            "prepare-gpu-program",
            "pipeline",
            name,
            createdLayout.error.code
          )
        );
      }
      bindGroupLayout = createdLayout.value;
      const createdPipelineLayout = input.device.createPipelineLayout({
        label: `${name}.layout`,
        bindGroupLayouts: [bindGroupLayout]
      });
      if (!createdPipelineLayout.ok) {
        return err3(
          failure(
            input.featureIdentity,
            "prepare-gpu-program",
            "pipeline",
            name,
            createdPipelineLayout.error.code
          )
        );
      }
      pipelineLayout = createdPipelineLayout.value;
    }
    const pipelineMap = preparing?.pipelines ?? /* @__PURE__ */ new Map();
    if (preparing === void 0 && createAsync !== void 0) {
      if (preparingPrograms.size >= COMPILED_PROGRAM_CACHE_LIMIT)
        return err3(preparationFailure("preparation-budget-exceeded"));
      const state = {
        module: module.value,
        ...bindGroupLayout === void 0 ? {} : { bindGroupLayout },
        pipelines: pipelineMap,
        pending: descriptor.entryPoints.length
      };
      preparingPrograms.set(programKey, state);
      const settle = (entryPoint, result) => {
        if (disposed || preparingPrograms.get(programKey) !== state) return;
        if (result.ok) state.pipelines.set(entryPoint, result.value);
        else state.error ??= preparationFailure(rhiReason(result.error));
        state.pending--;
      };
      for (const entryPoint of descriptor.entryPoints) {
        try {
          const completion = createAsync.call(input.device, {
            label: `${name}.${entryPoint}`,
            layout: pipelineLayout,
            compute: { module: module.value, entryPoint }
          });
          if ("ok" in completion) settle(entryPoint, completion);
          else
            void completion.then(
              (result) => settle(entryPoint, result),
              (cause) => settle(entryPoint, err3(cause))
            );
        } catch (cause) {
          settle(entryPoint, err3(cause));
        }
      }
      if (state.pending > 0) return err3(preparationFailure("rhi-not-available:pipeline-pending"));
      if (state.error !== void 0) return err3(state.error);
    }
    if (preparing === void 0 && createAsync === void 0)
      for (const entryPoint of descriptor.entryPoints) {
        const pipeline = input.device.createComputePipeline({
          label: `${name}.${entryPoint}`,
          layout: pipelineLayout,
          compute: { module: module.value, entryPoint }
        });
        if (!pipeline.ok) return err3(preparationFailure(pipeline.error.code));
        pipelineMap.set(entryPoint, pipeline.value);
      }
    preparingPrograms.delete(programKey);
    const reference = Object.freeze({ generation: input.generation });
    const textureBindings = /* @__PURE__ */ new Map();
    for (const entry of descriptor.bindings?.[0]?.entries ?? []) {
      if (entry.texture !== void 0) {
        textureBindings.set(entry.binding, "sampled");
      } else if (entry.storageTexture !== void 0) {
        textureBindings.set(
          entry.binding,
          entry.storageTexture.access === "write-only" ? "storage-write" : entry.storageTexture.access === "read-only" ? "storage-read" : "storage-read-write"
        );
      }
    }
    const item = {
      name,
      completionQualified: preparing !== void 0 || createAsync !== void 0,
      descriptor: cloneProgramDescriptor(descriptor),
      reference,
      module: module.value,
      pipelines: pipelineMap,
      bindingLayouts: new Map(
        (descriptor.bindings?.[0]?.entries ?? []).flatMap(
          (entry) => entry.buffer === void 0 ? [] : [
            [
              entry.binding,
              {
                type: entry.buffer.type ?? "uniform",
                minBindingSize: entry.buffer.minBindingSize ?? 0
              }
            ]
          ]
        )
      ),
      textureBindings,
      ...bindGroupLayout === void 0 ? {} : { bindGroupLayout }
    };
    parkedPrograms.delete(name);
    setCandidateName(programs, candidate?.programs, name, item);
    changedResourceNames.add(name);
    programRefs.set(reference, item);
    candidate?.addedProgramRefs.push(reference);
    compiledPrograms.set(programKey, item);
    if (compiledPrograms.size > COMPILED_PROGRAM_CACHE_LIMIT) {
      const oldest = compiledPrograms.keys().next().value;
      if (oldest !== void 0) compiledPrograms.delete(oldest);
    }
    touchProgram(item);
    return ok3(reference);
  };
  const prepareBuffer = (name, descriptor) => {
    if (!Number.isSafeInteger(descriptor.size) || descriptor.size <= 0 || !Number.isSafeInteger(alignedSize(descriptor.size)) || descriptor.usage.length === 0) {
      return err3(
        failure(
          input.featureIdentity,
          "prepare-gpu-buffer",
          "vertex-data",
          name,
          "descriptor-invalid"
        )
      );
    }
    const uploadFailure = (reason) => err3(failure(input.featureIdentity, "write-gpu-buffer", "vertex-data", name, reason));
    if (descriptor.uploads !== void 0) {
      if (!Array.isArray(descriptor.uploads)) return uploadFailure("uploads-invalid");
      for (const upload of descriptor.uploads) {
        if (upload === null || typeof upload !== "object" || !ArrayBuffer.isView(upload.data) || !Number.isSafeInteger(upload.offset) || upload.offset < 0 || upload.offset % 4 !== 0 || upload.data.byteLength % 4 !== 0 || upload.offset > descriptor.size || upload.data.byteLength > descriptor.size - upload.offset)
          return uploadFailure("upload-range-invalid");
      }
    }
    const signature = stable({ size: descriptor.size, usage: [...descriptor.usage].sort() });
    let item = buffers.get(name) ?? parkedBuffers.get(name)?.item;
    if (item !== void 0 && (item.signature !== signature || !item.owned)) item = void 0;
    if (item === void 0) {
      const usage = descriptor.usage.reduce((bits, key) => bits | BUFFER_USAGE[key], COPY_DST);
      const created = input.device.createBuffer({
        label: name,
        size: alignedSize(descriptor.size),
        usage
      });
      if (!created.ok) {
        return err3(
          failure(
            input.featureIdentity,
            "prepare-gpu-buffer",
            "vertex-data",
            name,
            created.error.code
          )
        );
      }
      const reference = Object.freeze({
        name,
        generation: input.generation
      });
      item = {
        name,
        signature,
        reference,
        buffer: created.value,
        size: alignedSize(descriptor.size),
        physicalUsage: usage,
        owned: true
      };
      parkedBuffers.delete(name);
      setCandidateName(buffers, candidate?.buffers, name, item);
      changedResourceNames.add(name);
      bufferRefs.set(reference, item);
      candidate?.addedBufferRefs.push(reference);
    }
    activateBuffer(item);
    touchBuffer(item);
    if (descriptor.data !== void 0) {
      if (descriptor.data.byteLength > descriptor.size) return uploadFailure("data-exceeds-size");
      const written = input.device.queue.writeBuffer(item.buffer, 0, bytes(descriptor.data));
      if (!written.ok) {
        return err3(
          failure(
            input.featureIdentity,
            "write-gpu-buffer",
            "vertex-data",
            name,
            written.error.code
          )
        );
      }
    }
    for (const upload of descriptor.uploads ?? []) {
      const written = input.device.queue.writeBuffer(
        item.buffer,
        upload.offset,
        bytes(upload.data)
      );
      if (!written.ok) return uploadFailure(written.error.code);
    }
    return ok3(item.reference);
  };
  const prepareBufferResource = (name, resource, descriptor) => {
    if (name.length === 0 || !Number.isSafeInteger(descriptor.size) || descriptor.size <= 0 || !Number.isSafeInteger(alignedSize(descriptor.size)) || descriptor.usage.length === 0) {
      return err3(
        failure(
          input.featureIdentity,
          "prepare-gpu-buffer-resource",
          "uniform-data",
          name,
          "descriptor-invalid"
        )
      );
    }
    const size = alignedSize(descriptor.size);
    const usage = descriptor.usage.reduce((bits, key) => bits | BUFFER_USAGE[key], COPY_DST);
    const prior = buffers.get(name);
    if (prior !== void 0 && prior.buffer === resource && prior.size === size && prior.physicalUsage === usage && !prior.owned) {
      touchBuffer(prior);
      return ok3(prior.reference);
    }
    const reference = Object.freeze({
      name,
      generation: input.generation
    });
    const item = {
      name,
      signature: stable({ external: true, size, usage: [...descriptor.usage].sort() }),
      reference,
      buffer: resource,
      size,
      physicalUsage: usage,
      owned: false
    };
    parkedBuffers.delete(name);
    setCandidateName(buffers, candidate?.buffers, name, item);
    changedResourceNames.add(name);
    bufferRefs.set(reference, item);
    candidate?.addedBufferRefs.push(reference);
    touchBuffer(item);
    return ok3(reference);
  };
  const prepareTextureView = (name, resource, logicalTarget) => {
    if (name.length === 0) {
      return err3(
        failure(
          input.featureIdentity,
          "prepare-gpu-texture-view",
          "texture-view",
          name,
          "descriptor-invalid"
        )
      );
    }
    const prior = textureViews.get(name);
    if (prior !== void 0 && prior.resource === resource && stable(prior.logicalTarget) === stable(logicalTarget)) {
      touchTextureView(prior);
      return ok3(prior.reference);
    }
    const reference = Object.freeze({
      name,
      generation: input.generation
    });
    const item = {
      name,
      resource,
      reference,
      ...logicalTarget === void 0 ? {} : { logicalTarget }
    };
    setCandidateName(textureViews, candidate?.textureViews, name, item);
    changedResourceNames.add(name);
    textureViewRefs.set(reference, item);
    candidate?.addedTextureViewRefs.push(reference);
    touchTextureView(item);
    return ok3(reference);
  };
  const prepareSampler = (name, resource) => {
    if (name.length === 0) {
      return err3(
        failure(
          input.featureIdentity,
          "prepare-gpu-sampler",
          "sampler",
          name,
          "descriptor-invalid"
        )
      );
    }
    const prior = samplers.get(name);
    if (prior !== void 0 && prior.resource === resource) {
      touchSampler(prior);
      return ok3(prior.reference);
    }
    const reference = Object.freeze({
      name,
      generation: input.generation
    });
    const item = { name, resource, reference };
    setCandidateName(samplers, candidate?.samplers, name, item);
    changedResourceNames.add(name);
    samplerRefs.set(reference, item);
    candidate?.addedSamplerRefs.push(reference);
    touchSampler(item);
    return ok3(reference);
  };
  const prepareBindings = (name, descriptor, named) => {
    const program = programRefs.get(descriptor.program);
    if (program === void 0 || descriptor.program.generation !== input.generation) {
      return err3(
        failure(
          input.featureIdentity,
          "prepare-gpu-bindings",
          "bindings",
          name,
          "program-unavailable"
        )
      );
    }
    const prior = bindings.get(name) ?? parkedBindings.get(name)?.item;
    const entryItems = [];
    const previousEntry = (binding) => {
      const entry = prior?.program === program ? prior.entries[entryItems.length] : void 0;
      return entry?.binding === binding ? entry : void 0;
    };
    const bufferEntry = (entry, item2) => {
      const offset = entry.offset ?? 0;
      const size = entry.size ?? item2.size - offset;
      const layout2 = program.bindingLayouts.get(entry.binding);
      const reject = (reason) => err3(
        failure(
          input.featureIdentity,
          "prepare-gpu-bindings",
          "bindings",
          name,
          `${reason}:${entry.binding}`
        )
      );
      if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(size) || size <= 0 || offset > item2.size || size > item2.size - offset || layout2?.type !== "uniform" && size % 4 !== 0)
        return reject("buffer-range-invalid");
      const alignment = layout2?.type === "uniform" ? input.device.limits.minUniformBufferOffsetAlignment ?? 256 : input.device.limits.minStorageBufferOffsetAlignment ?? 256;
      if (offset % alignment !== 0) return reject("buffer-offset-unaligned");
      if (layout2 !== void 0 && (!Number.isSafeInteger(layout2.minBindingSize) || layout2.minBindingSize < 0 || size < layout2.minBindingSize))
        return reject("buffer-binding-too-small");
      const previous = previousEntry(entry.binding);
      if (previous?.buffer === item2 && previous.offset === offset && previous.size === size)
        return ok3(previous);
      return ok3({
        binding: entry.binding,
        offset,
        size,
        resource: {
          kind: "buffer",
          value: {
            buffer: item2.buffer,
            ...entry.offset === void 0 ? {} : { offset },
            ...entry.size === void 0 ? {} : { size }
          }
        },
        buffer: item2
      });
    };
    for (const entry of descriptor.entries) {
      const namedBuffer = named?.buffers.get(entry.resource);
      if (named === void 0 ? "buffer" in entry : namedBuffer !== void 0) {
        const raw = entry;
        const item3 = bufferRefs.get(named === void 0 ? raw.buffer : namedBuffer);
        if (item3 === void 0 || (named === void 0 ? raw.buffer : namedBuffer).generation !== input.generation) {
          return err3(
            failure(
              input.featureIdentity,
              "prepare-gpu-bindings",
              "bindings",
              name,
              "buffer-unavailable"
            )
          );
        }
        const ranged = bufferEntry(entry, item3);
        if (!ranged.ok) return ranged;
        entryItems.push(ranged.value);
        continue;
      }
      const prepared = named === void 0 ? entry.resource : named.resources.get(entry.resource);
      if (named !== void 0 && prepared === void 0) {
        return err3(
          failure(
            input.featureIdentity,
            "prepare-gpu-bindings",
            "bindings",
            name,
            `resource-unavailable:${entry.binding}`
          )
        );
      }
      if (prepared.reference.generation !== input.generation) {
        return err3(
          failure(
            input.featureIdentity,
            "prepare-gpu-bindings",
            "bindings",
            name,
            "resource-generation-mismatch"
          )
        );
      }
      if (prepared.kind === "buffer") {
        const item3 = bufferRefs.get(prepared.reference);
        if (item3 === void 0) {
          return err3(
            failure(
              input.featureIdentity,
              "prepare-gpu-bindings",
              "bindings",
              name,
              "buffer-unavailable"
            )
          );
        }
        const ranged = bufferEntry(entry, item3);
        if (!ranged.ok) return ranged;
        entryItems.push(ranged.value);
        continue;
      }
      if (entry.offset !== void 0 || entry.size !== void 0)
        return err3(
          failure(
            input.featureIdentity,
            "prepare-gpu-bindings",
            "bindings",
            name,
            `buffer-range-on-non-buffer:${entry.binding}`
          )
        );
      if (prepared.kind === "texture-view") {
        const item3 = textureViewRefs.get(prepared.reference);
        if (item3 === void 0) {
          return err3(
            failure(
              input.featureIdentity,
              "prepare-gpu-bindings",
              "bindings",
              name,
              "texture-view-unavailable"
            )
          );
        }
        const previous2 = previousEntry(entry.binding);
        if (previous2?.textureView === item3) {
          entryItems.push(previous2);
          continue;
        }
        entryItems.push({
          binding: entry.binding,
          ...item3.resource === void 0 ? {} : { resource: { kind: "textureView", value: item3.resource } },
          textureView: item3
        });
        continue;
      }
      const item2 = samplerRefs.get(prepared.reference);
      if (item2 === void 0) {
        return err3(
          failure(
            input.featureIdentity,
            "prepare-gpu-bindings",
            "bindings",
            name,
            "sampler-unavailable"
          )
        );
      }
      const previous = previousEntry(entry.binding);
      if (previous?.sampler === item2) {
        entryItems.push(previous);
        continue;
      }
      entryItems.push({
        binding: entry.binding,
        resource: { kind: "sampler", value: item2.resource },
        sampler: item2
      });
    }
    if (prior !== void 0 && prior.program === program && prior.entries.length === entryItems.length && prior.entries.every((entry, index) => {
      const next = entryItems[index];
      return next !== void 0 && entry.binding === next.binding && entry.offset === next.offset && entry.size === next.size && entry.buffer === next.buffer && entry.textureView === next.textureView && entry.sampler === next.sampler;
    })) {
      activateBindings(prior);
      touchBindings(prior);
      return ok3(prior.reference);
    }
    const firstPipeline = program.pipelines.values().next().value;
    const layout = program.bindGroupLayout ?? firstPipeline?.getBindGroupLayout(0);
    if (layout === void 0) {
      return err3(
        failure(
          input.featureIdentity,
          "prepare-gpu-bindings",
          "bindings",
          name,
          "layout-unavailable"
        )
      );
    }
    const hasLateTextures = entryItems.some(
      (entry) => entry.textureView?.logicalTarget !== void 0
    );
    const hasMissingResource = entryItems.some((entry) => entry.resource === void 0);
    if (hasMissingResource && !hasLateTextures) {
      return err3(
        failure(
          input.featureIdentity,
          "prepare-gpu-bindings",
          "bindings",
          name,
          "texture-view-unavailable"
        )
      );
    }
    const created = hasLateTextures ? void 0 : input.device.createBindGroup({
      label: name,
      layout,
      entries: entryItems.map((entry) => ({
        binding: entry.binding,
        resource: entry.resource
      }))
    });
    if (created !== void 0 && !created.ok) {
      return err3(
        failure(
          input.featureIdentity,
          "prepare-gpu-bindings",
          "bindings",
          name,
          created.error.code
        )
      );
    }
    const reference = Object.freeze({
      generation: input.generation
    });
    const item = {
      name,
      reference,
      program,
      entries: entryItems,
      buffers: entryItems.flatMap(
        (entry) => entry.buffer === void 0 ? [] : [{ binding: entry.binding, item: entry.buffer }]
      ),
      // A bind group with semantic targets is created once the graph resolves
      // the current generation's physical views. The placeholder is never
      // encoded because resolveComputePass installs resolveBindGroup.
      bindGroup: created?.value
    };
    parkedBindings.delete(name);
    setCandidateName(bindings, candidate?.bindings, name, item);
    changedResourceNames.add(name);
    bindingRefs.set(reference, item);
    candidate?.addedBindingRefs.push(reference);
    touchBindings(item);
    return ok3(reference);
  };
  const captureResourceDomain = (source) => {
    const reject = (reason) => err3(
      failure(
        input.featureIdentity,
        "capture-gpu-resources",
        "bindings",
        "resource-domain",
        reason
      )
    );
    if (disposed || candidate === void 0) return reject("frame-unavailable");
    const domainPrograms = /* @__PURE__ */ new Set();
    const domainBuffers = /* @__PURE__ */ new Set();
    const domainBindings = /* @__PURE__ */ new Set();
    for (const reference of source.programs) {
      const item = programRefs.get(reference);
      if (item === void 0 || !currentProgram(item)) return reject("program-unavailable");
      domainPrograms.add(item);
    }
    for (const reference of source.buffers) {
      const item = bufferRefs.get(reference);
      if (item === void 0 || !item.owned || !currentBuffer(item))
        return reject("buffer-unavailable");
      domainBuffers.add(item);
    }
    for (const reference of source.bindings) {
      const item = bindingRefs.get(reference);
      if (item === void 0 || !currentBindings(item) || !currentProgram(item.program))
        return reject("bindings-unavailable");
      domainBindings.add(item);
      domainPrograms.add(item.program);
      for (const entry of item.entries) {
        if (entry.textureView !== void 0 || entry.sampler !== void 0)
          return reject("borrowed-resource");
        if (entry.buffer === void 0) continue;
        if (!entry.buffer.owned || !currentBuffer(entry.buffer))
          return reject("buffer-unavailable");
        domainBuffers.add(entry.buffer);
      }
    }
    const domain = Object.freeze({});
    resourceDomains.set(domain, {
      programs: [...domainPrograms],
      buffers: [...domainBuffers],
      bindings: [...domainBindings]
    });
    return ok3(domain);
  };
  const retainResourceDomain = (domain) => {
    const retained = resourceDomains.get(domain);
    if (disposed || candidate === void 0 || retained === void 0 || !retained.programs.every(currentProgram) || !retained.buffers.every(currentBuffer) || !retained.bindings.every(currentBindings))
      return ok3(false);
    for (const item of retained.programs) {
      activateProgram(item);
      touchProgram(item);
    }
    for (const item of retained.buffers) {
      activateBuffer(item);
      touchBuffer(item);
    }
    for (const item of retained.bindings) {
      activateBindingName(item);
      touchBindingName(item);
    }
    return ok3(true);
  };
  const writeBuffer = (reference, offset, data) => {
    const item = bufferRefs.get(reference);
    const reject = (reason) => err3(
      failure(
        input.featureIdentity,
        "write-gpu-buffer",
        "vertex-data",
        item?.name ?? "buffer",
        reason
      )
    );
    if (disposed || candidate === void 0 || item === void 0 || !currentBuffer(item))
      return reject("buffer-unavailable");
    if (!ArrayBuffer.isView(data) || !Number.isSafeInteger(offset) || offset < 0 || offset % 4 !== 0 || data.byteLength % 4 !== 0 || offset > item.size || data.byteLength > item.size - offset || (item.physicalUsage & COPY_DST) === 0)
      return reject("upload-range-invalid");
    activateBuffer(item);
    touchBuffer(item);
    const written = input.device.queue.writeBuffer(item.buffer, offset, bytes(data));
    return written.ok ? ok3(void 0) : reject(written.error.code);
  };
  return {
    changedResourceNames,
    captureResourceDomain,
    retainResourceDomain,
    writeBuffer,
    beginFrame: () => {
      if (candidate !== void 0)
        throw new Error("Feature GPU frame must commit or abort before beginning another frame");
      candidate = snapshotIndexes();
      changedResourceNames.clear();
      touchedPrograms.clear();
      touchedBuffers.clear();
      touchedTextureViews.clear();
      touchedSamplers.clear();
      touchedBindings.clear();
    },
    retainResources: (matches) => {
      for (const item of programs.values()) if (matches(item.name)) touchProgram(item);
      for (const item of buffers.values()) if (matches(item.name)) touchBuffer(item);
      for (const item of textureViews.values()) if (matches(item.name)) touchTextureView(item);
      for (const item of samplers.values()) if (matches(item.name)) touchSampler(item);
      for (const item of bindings.values()) if (matches(item.name)) touchBindings(item);
    },
    retainBindings: (references) => {
      for (const reference of references) {
        const item = bindingRefs.get(reference);
        if (item === void 0 || reference.generation !== input.generation) {
          return err3(
            failure(
              input.featureIdentity,
              "retain-gpu-bindings",
              "bindings",
              "persistent-bindings",
              "bindings-unavailable"
            )
          );
        }
        activateBindings(item);
        touchBindings(item);
      }
      return ok3(void 0);
    },
    prepareProgram,
    prepareBuffer,
    prepareBufferResource,
    prepareTextureView,
    prepareSampler,
    prepareBindings,
    prepareNamedBindings: (name, descriptor, resources) => prepareBindings(name, descriptor, resources),
    resolveComputePass: (featureIdentity, descriptor) => {
      const program = programRefs.get(descriptor.program);
      const binding = bindingRefs.get(descriptor.bindings);
      const dispatchBindings = descriptor.dispatches.map(
        (dispatch) => dispatch.bindings === void 0 ? binding : bindingRefs.get(dispatch.bindings)
      );
      if (program === void 0 || binding === void 0 || binding.program !== program || dispatchBindings.some((item) => item === void 0) || dispatchBindings.some((item) => item?.program !== program) || descriptor.program.generation !== input.generation || descriptor.bindings.generation !== input.generation) {
        const reason = program === void 0 ? "program-unavailable" : binding === void 0 ? "bindings-unavailable" : binding.program !== program ? "bindings-program-mismatch" : dispatchBindings.some((item) => item === void 0) ? "dispatch-bindings-unavailable" : dispatchBindings.some((item) => item?.program !== program) ? "dispatch-bindings-program-mismatch" : "generation-mismatch";
        return err3(
          failure(
            featureIdentity,
            "resolve-gpu-compute",
            "bindings",
            program?.name ?? "program",
            reason
          )
        );
      }
      touchProgram(program);
      touchBindings(binding);
      for (const dispatchBinding of dispatchBindings) {
        if (dispatchBinding !== void 0) touchBindings(dispatchBinding);
      }
      const indirectItems = descriptor.dispatches.map(
        (dispatch) => dispatch.indirect === void 0 ? void 0 : bufferRefs.get(dispatch.indirect.buffer)
      );
      for (const [index, dispatch] of descriptor.dispatches.entries()) {
        const indirectItem = indirectItems[index];
        const invalidDirect = dispatch.workgroups !== void 0 && !validRenderFeatureWorkgroups(
          dispatch.workgroups,
          input.device.limits.maxComputeWorkgroupsPerDimension
        );
        const invalidIndirect = dispatch.indirect !== void 0 && (indirectItem === void 0 || dispatch.indirect.buffer.generation !== input.generation || (indirectItem.physicalUsage & BUFFER_USAGE.indirect) === 0 || !Number.isInteger(dispatch.indirect.offset) || dispatch.indirect.offset < 0 || dispatch.indirect.offset % 4 !== 0 || dispatch.indirect.offset + 12 > indirectItem.size);
        if (program.pipelines.get(dispatch.entryPoint) === void 0 || invalidDirect || invalidIndirect) {
          return err3(
            failure(
              featureIdentity,
              "resolve-gpu-compute",
              "pipeline",
              dispatch.entryPoint,
              !program.pipelines.has(dispatch.entryPoint) ? "entry-point-unavailable" : invalidDirect ? "workgroup-count-invalid" : "indirect-dispatch-invalid"
            )
          );
        }
        if (indirectItem !== void 0) touchBuffer(indirectItem);
      }
      const resolvedDispatches = [];
      let emptyDispatches = 0;
      for (const [index, dispatch] of descriptor.dispatches.entries()) {
        const pipeline = program.pipelines.get(dispatch.entryPoint);
        const dispatchBinding = dispatchBindings[index];
        if (pipeline === void 0 || dispatchBinding === void 0) continue;
        if (dispatch.workgroups?.includes(0)) {
          emptyDispatches += 1;
          continue;
        }
        const lateBindings = dispatchBinding.entries.some(
          (entry) => entry.textureView?.logicalTarget !== void 0
        ) ? {
          resolveBindGroup: (resolve) => {
            const layout = program.bindGroupLayout ?? pipeline.getBindGroupLayout(0);
            const created = input.device.createBindGroup({
              label: dispatchBinding.name,
              layout,
              entries: dispatchBinding.entries.map((entry) => ({
                binding: entry.binding,
                resource: entry.textureView?.logicalTarget === void 0 ? entry.resource : {
                  kind: "textureView",
                  value: resolve(entry.textureView.logicalTarget)
                }
              }))
            });
            if (!created.ok) throw created.error;
            return created.value;
          }
        } : {};
        if (dispatch.workgroups !== void 0) {
          resolvedDispatches.push({
            pipeline,
            bindGroup: dispatchBinding.bindGroup,
            ...lateBindings,
            workgroups: [
              dispatch.workgroups[0],
              dispatch.workgroups[1] ?? 1,
              dispatch.workgroups[2] ?? 1
            ]
          });
          continue;
        }
        const indirectItem = indirectItems[index];
        if (indirectItem === void 0) continue;
        resolvedDispatches.push({
          pipeline,
          bindGroup: dispatchBinding.bindGroup,
          ...lateBindings,
          indirectBuffer: indirectItem.buffer,
          indirectOffset: dispatch.indirect.offset
        });
      }
      if (resolvedDispatches.length + emptyDispatches !== descriptor.dispatches.length) {
        return err3(
          failure(
            featureIdentity,
            "resolve-gpu-compute",
            "bindings",
            program.name,
            "resolved-resource-unavailable"
          )
        );
      }
      const resolvedBuffers = /* @__PURE__ */ new Map();
      for (const item of dispatchBindings) {
        if (item === void 0) continue;
        for (const entry of item.buffers) {
          const access = program.bindingLayouts.get(entry.binding);
          if (access === void 0) {
            return err3(
              failure(
                featureIdentity,
                "resolve-gpu-compute",
                "bindings",
                item.name,
                `buffer-layout-unavailable:${entry.binding}`
              )
            );
          }
          const derived = graphAccess(access.type);
          const prior = resolvedBuffers.get(entry.item) ?? /* @__PURE__ */ new Set();
          if (prior.size > 0 && !prior.has(derived)) {
            if (prior.has("storage-read-write") || derived === "storage-read-write") {
              resolvedBuffers.set(entry.item, /* @__PURE__ */ new Set(["storage-read-write"]));
              continue;
            }
            return err3(
              failure(
                featureIdentity,
                "resolve-gpu-compute",
                "bindings",
                item.name,
                `buffer-access-conflict:${entry.binding}`
              )
            );
          }
          prior.add(derived);
          resolvedBuffers.set(entry.item, prior);
        }
      }
      for (const item of indirectItems) {
        if (item === void 0) continue;
        const accesses = resolvedBuffers.get(item) ?? /* @__PURE__ */ new Set();
        accesses.add("indirect-read");
        resolvedBuffers.set(item, accesses);
      }
      const sampledTargets = /* @__PURE__ */ new Set();
      const storageTargets = /* @__PURE__ */ new Set();
      for (const item of dispatchBindings) {
        for (const entry of item?.entries ?? []) {
          const target = entry.textureView?.logicalTarget;
          if (target === void 0) continue;
          const role = program.textureBindings.get(entry.binding) ?? "sampled";
          if (role === "sampled") sampledTargets.add(target);
          else storageTargets.add(target);
        }
      }
      return ok3({
        sampledTargets: [...sampledTargets],
        storageTargets: [...storageTargets],
        buffers: [...resolvedBuffers].flatMap(
          ([item, accesses]) => [...accesses].map((access) => ({
            name: item.name,
            buffer: item.buffer,
            size: item.size,
            physicalUsage: item.physicalUsage,
            access
          }))
        ),
        dispatches: resolvedDispatches
      });
    },
    resolveBuffer: (reference) => {
      const item = bufferRefs.get(reference);
      if (item !== void 0) {
        activateBuffer(item);
        touchBuffer(item);
      }
      return item === void 0 ? void 0 : { buffer: item.buffer, size: item.size, physicalUsage: item.physicalUsage };
    },
    abortFrame,
    commitFrame: () => {
      if (candidate === void 0) return [];
      candidate = void 0;
      frameSerial += 1;
      const park = (active, parked, touched, canPark) => {
        for (const [name, item] of active) {
          if (touched.has(item)) continue;
          active.delete(name);
          if (parksUntouched && canPark(item)) parked.set(name, { item, frame: frameSerial });
        }
      };
      park(bindings, parkedBindings, touchedBindings, canParkBinding);
      park(programs, parkedPrograms, touchedPrograms, () => true);
      park(buffers, parkedBuffers, touchedBuffers, (item) => item.owned);
      for (const [name, item] of textureViews)
        if (!touchedTextureViews.has(item)) textureViews.delete(name);
      for (const [name, item] of samplers) if (!touchedSamplers.has(item)) samplers.delete(name);
      const evict = (parked, removeDependencies) => {
        for (const [name, entry] of parked) {
          if (entry.frame > frameSerial - VFX_PARKED_RESOURCE_FRAME_LIMIT && parked.size <= VFX_PARKED_RESOURCE_LIMIT)
            break;
          parked.delete(name);
          removeDependencies(entry.item);
        }
      };
      evict(parkedBuffers, (item) => {
        for (const [name, entry] of parkedBindings)
          if (entry.item.buffers.some((buffer) => buffer.item === item))
            parkedBindings.delete(name);
      });
      evict(parkedPrograms, (item) => {
        for (const [name, entry] of parkedBindings)
          if (entry.item.program === item) parkedBindings.delete(name);
      });
      evict(parkedBindings, () => {
      });
      const releases = [];
      const retire = (index, named, parked, touched, buffer) => {
        for (const [reference, item] of index) {
          if (touched.has(item) || named.get(item.name) === item || parked?.get(item.name)?.item === item || retiring.has(reference))
            continue;
          const ticket = {};
          retiring.set(reference, ticket);
          releases.push(() => {
            if (retiring.get(reference) !== ticket) return void 0;
            index.delete(reference);
            retiring.delete(reference);
            return buffer?.(item);
          });
        }
      };
      retire(programRefs, programs, parkedPrograms, touchedPrograms);
      retire(bufferRefs, buffers, parkedBuffers, touchedBuffers, (item) => item);
      retire(bindingRefs, bindings, parkedBindings, touchedBindings);
      retire(textureViewRefs, textureViews, void 0, touchedTextureViews);
      retire(samplerRefs, samplers, void 0, touchedSamplers);
      if (releases.length === 0) return [];
      let released = false;
      return [
        {
          release: () => {
            if (released) return ok3(void 0);
            released = true;
            const retiredBuffers = [];
            for (const release of releases) {
              const item = release();
              if (item !== void 0) retiredBuffers.push(item);
            }
            return destroyBuffers(retiredBuffers);
          }
        }
      ];
    },
    dispose: () => {
      disposed = true;
      preparingPrograms.clear();
      candidate = void 0;
      const destroyed = destroyBuffers(bufferRefs.values());
      programs.clear();
      parkedPrograms.clear();
      compiledPrograms.clear();
      buffers.clear();
      parkedBuffers.clear();
      bindings.clear();
      parkedBindings.clear();
      textureViews.clear();
      textureViewRefs.clear();
      samplers.clear();
      samplerRefs.clear();
      bufferRefs.clear();
      programRefs.clear();
      bindingRefs.clear();
      retiring.clear();
      return destroyed;
    }
  };
}
function createRenderFeatureGpuWorkOwner(input) {
  const sessions = /* @__PURE__ */ new Map();
  let disposed = false;
  const owner = {
    createRecoveryRoot: (scope) => ({
      kind: "feature",
      create: () => {
        if (!scope.isAlive()) throw new Error("Feature GPU candidate scope is not active.");
        return owner;
      },
      cleanup: () => void 0
    }),
    beginFeature: (featureIdentity, generation, requestedShaderModuleMode = "validated") => {
      if (disposed) {
        throw new Error("Render feature GPU work owner is disposed.");
      }
      const shaderModuleMode = requestedShaderModuleMode;
      const existing = sessions.get(featureIdentity);
      if (existing?.generation === generation && existing.shaderModuleMode === shaderModuleMode) {
        existing.session.beginFrame();
        return existing.session;
      }
      if (existing !== void 0) existing.session.dispose();
      const shaderModuleFactory = shaderModuleMode === "immediate" ? input.getImmediateShaderModuleFactory?.() ?? input.getShaderModuleFactory() : input.getShaderModuleFactory();
      const session = createRenderFeatureGpuWorkSession({
        device: input.getDevice(),
        shaderModuleFactory,
        generation,
        featureIdentity
      });
      sessions.set(featureIdentity, { generation, shaderModuleMode, session });
      session.beginFrame();
      return session;
    },
    resolveBuffer: (featureIdentity, reference) => sessions.get(featureIdentity)?.session.resolveBuffer(reference),
    dispose: () => {
      if (disposed) return ok3(void 0);
      disposed = true;
      let first;
      for (const { session } of sessions.values()) {
        const disposed2 = session.dispose();
        if (!disposed2.ok && first === void 0) first = disposed2.error;
      }
      sessions.clear();
      return first === void 0 ? ok3(void 0) : err3(first);
    }
  };
  return owner;
}

// sdk/engine/node_modules/@forgeax/engine-render/src/inspection-types.ts
function projectLightInspection(input) {
  return Object.freeze({
    generation: input.generation,
    candidate: input.candidate,
    accepted: input.accepted,
    lastKnownGood: input.lastKnownGood,
    failure: input.failure,
    failureKeys: [...input.failureKeys],
    resourceCount: input.resourceCount,
    uploadBytes: input.uploadBytes
  });
}
function lightInspectionIdentity(topology, generation) {
  return `${topology}:generation-${generation}`;
}
var emptyBloomInspection = () => ({
  graphStatus: "empty",
  enabled: false,
  levelCount: 0,
  levelDimensions: [],
  horizontalPassCount: 0,
  verticalPassCount: 0,
  targetCount: 0,
  targetBytes: 0,
  resourceCount: 0,
  passCount: 0,
  encodeCount: 0,
  bindGroupCount: 0,
  uploadCount: 0,
  residentChildBytes: 0,
  generation: 0,
  state: "off"
});
function projectBarrelDistortionInspection(input) {
  const effectiveMapping = input.effectiveMapping === void 0 ? void 0 : freezeBarrelDistortionMapping(input.effectiveMapping);
  return Object.freeze({
    effectiveMapping,
    extent: effectiveMapping === void 0 ? void 0 : Object.freeze({ width: effectiveMapping.width, height: effectiveMapping.height }),
    frameId: input.frameId,
    deviceGeneration: input.deviceGeneration,
    graphGeneration: input.graphGeneration,
    lastKnownGood: input.lastKnownGood
  });
}

// sdk/engine/node_modules/@forgeax/engine-render/src/prepare/extended-lighting/state.ts
function createExtendedLightingState(generation) {
  return {
    enabled: false,
    generation,
    status: "empty",
    candidate: void 0,
    accepted: void 0,
    lastKnownGood: void 0,
    resourceCount: 0,
    descriptorBytes: 0,
    uploadCount: 0,
    passCount: 0,
    bindGroupCount: 0,
    failure: void 0,
    failureKeys: []
  };
}
function promoteExtendedLightingCandidate(state, candidate) {
  if (candidate === void 0) return state;
  return {
    ...state,
    enabled: true,
    generation: candidate.generation,
    status: "accepted",
    candidate: void 0,
    accepted: candidate,
    lastKnownGood: candidate,
    resourceCount: 4,
    descriptorBytes: candidate.descriptorBytes,
    uploadCount: candidate.uploadCount
  };
}
function recordExtendedLightingFailure(state, failure4) {
  const key = `${failure4.detail.entity}:${failure4.detail.feature}:${failure4.detail.generation}`;
  if (state.failureKeys.includes(key)) return state;
  return {
    ...state,
    failure: failure4,
    failureKeys: [...state.failureKeys, key]
  };
}
function projectExtendedLightingInspection(state) {
  const identity = (candidate) => candidate === void 0 ? void 0 : lightInspectionIdentity(candidate.topology, candidate.generation);
  return projectLightInspection({
    generation: state.generation,
    candidate: identity(state.candidate),
    accepted: identity(state.accepted),
    lastKnownGood: identity(state.lastKnownGood),
    failure: state.failure?.code,
    failureKeys: state.failureKeys,
    resourceCount: state.resourceCount,
    uploadBytes: state.descriptorBytes
  });
}

// sdk/engine/node_modules/@forgeax/engine-render/src/publication/mesh-pipeline-preparation.ts
import { err as err4, ok as ok4 } from "@forgeax/engine-types";
function captureMeshPipelinePreparation(input) {
  const invalid = (actual) => err4(
    new DynamicGeometryError(
      "dynamic-geometry-invalid",
      "the candidate has a complete rigid mesh material/program projection",
      "prepare the real entity and its candidate MeshAsset after its materials are available",
      { actual }
    )
  );
  try {
    const frame = extractFrames([input.world], 0, input.assets, void 0, void 0, {
      ...renderMaterialContext(input.capabilities, input.limits),
      cull: "none",
      retainHidden: true,
      renderables: { kind: "partial", entitiesByWorld: [/* @__PURE__ */ new Set([input.entity])] },
      preparationMesh: input
    });
    const row = frame.renderables.find((row2) => row2.entityKey === input.entity);
    if (row === void 0 || row.assetHandle !== input.meshHandle || row.pipelinePreparation === void 0)
      return invalid("candidate render snapshot is unavailable");
    if (row.skin !== void 0 || row.skinPose !== void 0 || row.morph !== void 0 || row.terrain !== void 0 || row.pointsLines !== void 0 || row.spriteInstances !== void 0)
      return invalid(
        "posed, terrain and expanded geometry require their specialized preparation owner"
      );
    const programs = /* @__PURE__ */ new Map();
    for (const material of row.materials) {
      for (const key of publicationMaterialProgramKeys(material.snapshot)) {
        if (programs.has(key)) continue;
        const shader = input.assets.shaderRegistry.findMaterialArtifact(key);
        if (!shader.ok) return invalid(shader.error);
        const artifact = input.assets.getMaterialArtifact(key);
        programs.set(key, {
          key,
          shader: {
            source: shader.value.source,
            paramSchema: shader.value.paramSchema,
            ...shader.value.receipt === void 0 ? {} : { receipt: shader.value.receipt }
          },
          ...artifact === void 0 ? {} : { artifact }
        });
      }
    }
    const {
      worldId: _worldId,
      entityKey: _entityKey,
      transform,
      gpuDrivenDraws: _gpuDraws,
      materialOverrides: _overrides,
      ...snapshot
    } = row;
    const materials = [];
    const ids = /* @__PURE__ */ new Map();
    const materialId = (resource) => {
      const previous = ids.get(resource);
      if (previous !== void 0) return previous;
      const id = materials.length + 1;
      ids.set(resource, id);
      materials.push({ id, value: resource.snapshot });
      return id;
    };
    return ok4({
      materials,
      entity: input.entity,
      transform,
      template: {
        snapshot: {
          ...snapshot,
          material: materialId(row.material),
          materials: row.materials.map(materialId),
          ...row.materialOverrides === void 0 ? {} : {
            materialOverrides: row.materialOverrides.map(
              (resource) => resource === void 0 ? 0 : materialId(resource)
            )
          }
        },
        dispatch: row.pipelinePreparation
      },
      programs: [...programs.values()]
    });
  } catch (cause) {
    return invalid(cause);
  }
}

// sdk/engine/node_modules/@forgeax/engine-render/src/raytracing/attributes.ts
import { ok as ok5 } from "@forgeax/engine-types";
var RAY_ATTRIBUTE_TRIANGLE_STRIDE = 384;
var RAY_MATERIAL_INPUT_STRIDE = 224;
var RAY_MATERIAL_SURFACE_STRIDE = 96;
function buildRaySurfaceScene(instances) {
  const scene = buildRayReferenceScene(instances);
  if (!scene.ok) return scene;
  const byId = new Map(instances.map((i) => [i.instanceId, i]));
  const instanceAttributes = /* @__PURE__ */ new Map();
  for (const i of instances) {
    const count = i.positions.length / 3;
    if ((i.uvSets?.length ?? 0) > 8 || i.uvSets?.some((uv) => uv.length !== count * 2 || !Array.from(uv).every(finite32)) || i.colors !== void 0 && (i.colors.length !== count * 4 || !Array.from(i.colors).every((v) => finite32(v) && v >= 0 && v <= 1)))
      return rayReferenceFailure(
        "expected 0..8 finite per-vertex UV sets and optional linear RGBA in [0,1]"
      );
    instanceAttributes.set(i.instanceId, {
      uvCount: i.uvSets?.length ?? 0,
      tangentFrame: i.normals !== void 0 && i.tangents !== void 0
    });
    for (const [data, stride] of [
      [i.normals, 3],
      [i.tangents, 4]
    ]) {
      if (data === void 0) continue;
      if (data.length !== count * stride || !Array.from(data).every(finite32))
        return rayReferenceFailure("expected finite per-vertex normals and xyzw tangents");
      for (let v = 0; v < count; v++) {
        if (Math.hypot(
          data[v * stride] ?? 0,
          data[v * stride + 1] ?? 0,
          data[v * stride + 2] ?? 0
        ) === 0 || stride === 4 && Math.abs(data[v * stride + 3] ?? 0) !== 1)
          return rayReferenceFailure(
            "normal/tangent directions must be nonzero; handedness is +1 or -1"
          );
      }
    }
  }
  const attributes = new Uint8Array(
    Math.max(1, scene.value.triangleCount) * RAY_ATTRIBUTE_TRIANGLE_STRIDE
  );
  const out = new DataView(attributes.buffer);
  const triangles = new DataView(scene.value.triangles.buffer);
  for (let triangle = 0; triangle < scene.value.triangleCount; triangle++) {
    const instanceId = triangles.getUint32(triangle * 80 + 48, true);
    const primitive = triangles.getUint32(triangle * 80 + 56, true);
    const instance = byId.get(instanceId);
    if (instance === void 0) return rayReferenceFailure("missing source instance");
    const m = instance.transform;
    const columns = [read3(m, 0), read3(m, 4), read3(m, 8)];
    const cofactor = [
      cross(columns[1], columns[2]),
      cross(columns[2], columns[0]),
      cross(columns[0], columns[1])
    ];
    const winding = Math.sign(dot(columns[0], cofactor[0]));
    const positions = [0, 1, 2].map(
      (c2) => read3(instance.positions, (instance.indices[primitive * 3 + c2] ?? 0) * 3)
    );
    const a = positions[0], b = positions[1], c = positions[2];
    if (!a || !b || !c) return rayReferenceFailure("missing indexed triangle");
    const face = cross(sub(b, a), sub(c, a));
    for (let corner = 0; corner < 3; corner++) {
      const vertex = instance.indices[primitive * 3 + corner] ?? -1;
      const offset = triangle * RAY_ATTRIBUTE_TRIANGLE_STRIDE + corner * 128;
      for (let axis = 0; axis < 3; axis++)
        out.setFloat32(offset + axis * 4, instance.positions[vertex * 3 + axis] ?? 0, true);
      for (let c2 = 0; c2 < 4; c2++)
        out.setFloat32(offset + 16 + c2 * 4, instance.colors?.[vertex * 4 + c2] ?? 1, true);
      for (let set = 0; set < 8; set++) {
        const uv = instance.uvSets?.[Math.min(set, (instance.uvSets?.length ?? 1) - 1)];
        for (let c2 = 0; c2 < 2; c2++)
          out.setFloat32(offset + 32 + set * 8 + c2 * 4, uv?.[vertex * 2 + c2] ?? 0, true);
      }
      const localNormal = instance.normals === void 0 ? face : read3(instance.normals, vertex * 3);
      const normal = unit(multiply(cofactor, localNormal).map((v) => v * winding));
      const tangent = instance.tangents === void 0 ? cross(Math.abs(normal[2]) > 0.9 ? [0, 1, 0] : [0, 0, 1], normal) : multiply(columns, read3(instance.tangents, vertex * 4));
      const projected = sub(tangent, normal.map((v) => v * dot(normal, tangent)));
      if (!normal.every(finite32) || Math.hypot(...projected) <= Math.hypot(...tangent) * 1e-8)
        return rayReferenceFailure(
          `instance ${instanceId} primitive ${primitive} vertex ${vertex} normal/tangent frame degenerates under the instance transform`
        );
      const frame = [
        ...normal,
        winding,
        ...unit(projected),
        instance.tangents === void 0 ? 1 : (instance.tangents[vertex * 4 + 3] ?? 1) * winding
      ];
      for (let lane = 0; lane < 8; lane++)
        out.setFloat32(offset + 96 + lane * 4, frame[lane] ?? 0, true);
    }
  }
  return ok5({ ...scene.value, attributes, instanceAttributes });
}
var read3 = (v, o) => [v[o] ?? 0, v[o + 1] ?? 0, v[o + 2] ?? 0];
var dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
var cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0]
];
var sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
var unit = (v) => v.map((x) => x / Math.hypot(...v));
var multiply = (m, v) => [0, 1, 2].map((i) => m[0][i] * v[0] + m[1][i] * v[1] + m[2][i] * v[2]);
function finite32(value) {
  return Number.isFinite(value) && Number.isFinite(Math.fround(value));
}

// sdk/engine/node_modules/@forgeax/engine-render/src/raytracing/surface-cards.ts
import {
  distanceFieldMeshDigest,
  meshCardSidednessDigest,
  validateMeshCardLayout
} from "@forgeax/engine-geometry";
import {
  admitRayMaterial,
  admitRayMaterialValues,
  rayMaterialContract
} from "@forgeax/engine-shader";
import { ok as ok9 } from "@forgeax/engine-types";

// sdk/engine/node_modules/@forgeax/engine-render/src/material-row.ts
import { STANDARD_PIPELINE_PARAM_SCHEMA } from "@forgeax/engine-shader";
import {
  derive,
  getAdmittedParamSchemaInterface
} from "@forgeax/engine-types";
var ROW = GPU_SCENE_LAYOUTS.material;
var STANDARD_PIPELINE_DERIVED = derive(STANDARD_PIPELINE_PARAM_SCHEMA);
var schemaDefaults = /* @__PURE__ */ new WeakMap();
function admittedDefaults(schema) {
  if (getAdmittedParamSchemaInterface(schema) === void 0) return void 0;
  let defaults = schemaDefaults.get(schema);
  if (defaults === void 0) {
    defaults = new Map(
      schema.map((entry) => [entry.name, "default" in entry ? entry.default : void 0])
    );
    schemaDefaults.set(schema, defaults);
  }
  return defaults;
}
var STANDARD_PIPELINE_DEFAULTS = admittedDefaults(STANDARD_PIPELINE_PARAM_SCHEMA);
function isNumericValue(value) {
  return typeof value === "number" || Array.isArray(value);
}
function numericFallback(name, material) {
  switch (name) {
    case "baseColor":
      return [
        material.baseColor[0] ?? 0,
        material.baseColor[1] ?? 0,
        material.baseColor[2] ?? 0,
        1
      ];
    case "metallic":
      return material.metallic;
    case "roughness":
      return material.roughness;
    case "emissive":
      return material.emissive ?? [0, 0, 0];
    case "emissiveIntensity":
      return material.emissiveIntensity;
    case "occlusionStrength":
      return material.occlusionStrength ?? 1;
    case "normalScale":
      return material.normalScale ?? [1, 1];
    case "specularColor":
      return material.specularColor ?? [1, 1, 1];
    default:
      return void 0;
  }
}
function numericValue(name, material, schema, allowStandardFallback = false, defaults) {
  const snapshotValue = material.paramSnapshot?.[name];
  if (isNumericValue(snapshotValue)) return snapshotValue;
  if (allowStandardFallback) {
    const materialValue = numericFallback(name, material);
    if (materialValue !== void 0) return materialValue;
  }
  const entry = defaults === void 0 ? schema.find((entry2) => entry2.name === name) : void 0;
  const defaultValue = defaults === void 0 ? entry !== void 0 && "default" in entry ? entry.default : void 0 : defaults.get(name);
  if (isNumericValue(defaultValue)) return defaultValue;
  return void 0;
}
function writeScalar(view, member, value) {
  switch (member.type) {
    case "f32":
    case "vec2":
    case "vec3":
    case "vec4":
    case "color":
      view.setFloat32(member.offset, value, true);
      return;
    case "i32":
      view.setInt32(member.offset, value, true);
      return;
    case "u32":
      view.setUint32(member.offset, value, true);
      return;
  }
}
function writeNumeric(view, member, value) {
  if (member.type === "f32" || member.type === "i32" || member.type === "u32") {
    writeScalar(view, member, typeof value === "number" ? value : value?.[0] ?? 0);
    return;
  }
  const values = Array.isArray(value) ? value : [];
  const count = member.type === "vec2" ? 2 : member.type === "vec3" ? 3 : 4;
  for (let index = 0; index < count; index += 1) {
    writeScalar(
      view,
      { ...member, offset: member.offset + index * 4, type: "f32" },
      values[index] ?? 0
    );
  }
}
function validateReceipt(receipt) {
  const expectedFields = ROW.fields.filter((field) => !field.name.startsWith("_gpuDrivenPadding")).map((field) => field.name);
  if (receipt.materialRow.byteLength !== ROW.stride || receipt.materialRow.fields.length !== expectedFields.length || receipt.materialRow.fields.some((field, index) => field !== expectedFields[index])) {
    throw new RangeError(
      `Standard PBR material row receipt must match the ${ROW.stride}-byte canonical ABI`
    );
  }
}
function packStandardPbrMaterialRow(receipt, material) {
  validateReceipt(receipt);
  const payload = new Uint8Array(ROW.stride);
  const view = new DataView(payload.buffer);
  const f32 = new Float32Array(payload.buffer);
  for (const member of STANDARD_PIPELINE_DERIVED.numericMembers) {
    writeNumeric(
      view,
      member,
      numericValue(
        member.name,
        material,
        STANDARD_PIPELINE_PARAM_SCHEMA,
        true,
        STANDARD_PIPELINE_DEFAULTS
      )
    );
  }
  for (const record of STANDARD_PIPELINE_DERIVED.coordinateRecords) {
    writeMaterialTextureCoordinateRecord(
      f32,
      record.offset / 4,
      material.textureCoordinates?.get(record.parameter)
    );
  }
  return payload;
}
function packMaterialProgramRow(schema, material, rowStride = ROW.stride) {
  const derived = derive(schema);
  if (derived.totalBytes > rowStride || rowStride < 16 || rowStride % 16 !== 0) return void 0;
  const payload = new Uint8Array(rowStride);
  const view = new DataView(payload.buffer);
  const f32 = new Float32Array(payload.buffer);
  const defaults = admittedDefaults(schema);
  for (const member of derived.numericMembers) {
    writeNumeric(view, member, numericValue(member.name, material, schema, false, defaults));
  }
  for (const record of derived.coordinateRecords) {
    writeMaterialTextureCoordinateRecord(
      f32,
      record.offset / 4,
      material.textureCoordinates?.get(record.parameter)
    );
  }
  return payload;
}

// sdk/engine/node_modules/@forgeax/engine-render/src/raytracing/capture-view.ts
import { mat4 } from "@forgeax/engine-math";
import { ok as ok7 } from "@forgeax/engine-types";

// sdk/engine/node_modules/@forgeax/engine-render/src/raytracing/path-input.ts
import { ok as ok6 } from "@forgeax/engine-types";
function packSettings(s) {
  if (!Number.isInteger(s.width) || !Number.isInteger(s.height) || s.width < 1 || s.height < 1 || s.width * s.height > 262144 || !Number.isInteger(s.maxBounces) || s.maxBounces < 1 || s.maxBounces > 8 || !Number.isInteger(s.seed) || s.seed < 0 || s.seed > 4294967295)
    return rayReferenceFailure("expected 1..262144 pixels, 1..8 bounces, and a u32 seed", true);
  if (![...s.environment, s.maxDistance].every(finite322) || s.environment.some((v) => v < 0) || s.maxDistance <= 0)
    return rayReferenceFailure(
      "expected finite nonnegative environment and positive trace distance"
    );
  if (Number(s.camera !== void 0) + Number(s.rays !== void 0) + Number(s.rayBuffer !== void 0) !== 1)
    return rayReferenceFailure(
      "expected one exclusive camera, initial-ray array or GPU ray buffer"
    );
  if (s.receiver !== void 0 && s.receiver !== "full" && s.receiver !== "diffuse")
    return rayReferenceFailure("expected receiver 'full' or 'diffuse'");
  const receiver = s.receiver === "diffuse" ? 1 : 0;
  const bytes2 = new Uint8Array(96);
  new Float32Array(bytes2.buffer).set([...s.environment, s.maxDistance], 16);
  new Float32Array(bytes2.buffer)[15] = receiver;
  new Uint32Array(bytes2.buffer, 80).set([s.width, s.height, s.maxBounces, s.seed]);
  if (s.rayBuffer !== void 0) {
    if (s.rayBuffer === null || typeof s.rayBuffer !== "object")
      return rayReferenceFailure("expected a live RHI storage buffer containing initial ray rows");
    return ok6(bytes2);
  }
  if (s.rays !== void 0) {
    if (s.rays.length !== s.width * s.height || s.rays.some(
      (r) => r.origin.length !== 3 || r.direction.length !== 3 || ![...r.origin, ...r.direction, r.coneWidth, r.coneSpread].every(finite322) || Math.abs(Math.hypot(...r.direction) - 1) > 1e-5 || r.coneWidth < 0 || r.coneSpread < 0 || typeof r.active !== "boolean"
    ))
      return rayReferenceFailure(
        "expected one exclusive source, one finite unit initial ray per pixel, nonnegative cone footprint and boolean activity"
      );
    return ok6(bytes2);
  }
  const c = s.camera;
  if (c === void 0) return rayReferenceFailure("expected camera or initial rays");
  if (![...c.origin, ...c.target, ...c.up, c.verticalFov].every(finite322) || c.verticalFov <= 0 || c.verticalFov >= Math.PI)
    return rayReferenceFailure(
      "expected finite camera, nonnegative linear environment, and positive trace distance"
    );
  const forward = normalize(c.target.map((v, i) => v - (c.origin[i] ?? 0)));
  const right = normalize(cross2(forward, c.up));
  const up = normalize(cross2(right, forward));
  if (![...forward, ...right, ...up].every(Number.isFinite))
    return rayReferenceFailure("camera direction and up must span a basis");
  const tan = Math.tan(c.verticalFov / 2), aspect = s.width / s.height;
  const floats = [
    ...c.origin,
    2 * tan / s.height,
    ...forward,
    0,
    ...right.map((v) => v * tan * aspect),
    0,
    ...up.map((v) => v * tan),
    receiver,
    ...s.environment,
    s.maxDistance
  ];
  new Float32Array(bytes2.buffer).set(floats);
  return ok6(bytes2);
}
function packLights(lights) {
  if (lights.length > 32) return rayReferenceFailure("at most 32 analytic lights", true);
  const bytes2 = new Uint8Array(Math.max(1, lights.length) * 64);
  const out = new Float32Array(bytes2.buffer);
  for (let i = 0; i < lights.length; i++) {
    const l = lights[i];
    if (!l) continue;
    if (l.kind === "rect-area") return rayReferenceFailure("analytic area lights are not admitted");
    if (l.kind !== "directional" && l.iesProfileHandle !== void 0)
      return rayReferenceFailure("IES profiles are not admitted");
    if (l.kind === "spot" && (l.cookieHandle !== void 0 || l.projectorSlice !== void 0))
      return rayReferenceFailure("spot modifiers are not admitted");
    const position = l.kind === "directional" ? [0, 0, 0] : Array.from(l.position);
    const direction = l.kind === "point" ? [0, 0, -1] : normalize(Array.from(l.direction));
    const color = Array.from(l.color);
    const range = l.kind === "directional" ? 0 : l.invRangeSquared;
    const cone = l.kind === "spot" ? [l.cosInner, l.cosOuter] : [1, 0];
    const row = [
      ...position,
      l.kind === "directional" ? 1 : l.kind === "point" ? 2 : 3,
      ...color,
      l.kind === "point" ? l.decay ?? 2 : 0,
      ...direction,
      range,
      ...cone,
      0,
      0
    ];
    if (!row.every(finite322) || color.some((v) => v < 0) || range < 0 || l.kind === "point" && (l.decay ?? 2) < 0 || l.kind === "spot" && (!(l.cosInner > l.cosOuter) || l.cosInner > 1 || l.cosOuter < -1))
      return rayReferenceFailure("invalid analytic light");
    out.set(row, i * 16);
  }
  return ok6(bytes2);
}
function finite322(v) {
  return Number.isFinite(v) && Number.isFinite(Math.fround(v));
}
function cross2(a, b) {
  return [
    (a[1] ?? 0) * (b[2] ?? 0) - (a[2] ?? 0) * (b[1] ?? 0),
    (a[2] ?? 0) * (b[0] ?? 0) - (a[0] ?? 0) * (b[2] ?? 0),
    (a[0] ?? 0) * (b[1] ?? 0) - (a[1] ?? 0) * (b[0] ?? 0)
  ];
}
function normalize(a) {
  const n = Math.hypot(...a);
  return a.map((v) => v / n);
}

// sdk/engine/node_modules/@forgeax/engine-render/src/raytracing/capture-view.ts
function captureViewProjection(p) {
  const matrix = mat4.identity(mat4.create());
  let eye;
  let depth;
  if ("camera" in p) {
    const validation = packSettings({
      camera: p.camera,
      width: 1,
      height: 1,
      maxBounces: 1,
      seed: 0,
      environment: [0, 0, 0],
      maxDistance: p.far
    });
    if (!validation.ok) return validation;
    if (!Number.isFinite(Math.fround(p.near)) || p.near <= 0 || p.near >= p.far)
      return rayReferenceFailure("perspective capture requires 0 < near < finite far");
    const view = mat4.lookAt(mat4.create(), p.camera.origin, p.camera.target, p.camera.up);
    mat4.perspective(matrix, p.camera.verticalFov, 1, p.near, p.far);
    mat4.multiply(matrix, matrix, view);
    eye = [...p.camera.origin, 1];
    depth = p.far;
  } else {
    const dot2 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const cross3 = [
      p.u[1] * p.n[2] - p.u[2] * p.n[1],
      p.u[2] * p.n[0] - p.u[0] * p.n[2],
      p.u[0] * p.n[1] - p.u[1] * p.n[0]
    ];
    if (![...p.origin, ...p.u, ...p.v, ...p.n, p.width, p.height, p.depth].every(
      (v) => Number.isFinite(Math.fround(v))
    ) || Math.min(p.width, p.height, p.depth) <= 0 || ![p.u, p.v, p.n].every((a) => Math.abs(dot2(a, a) - 1) < 1e-5) || Math.abs(dot2(p.u, p.v)) + Math.abs(dot2(p.u, p.n)) + Math.abs(dot2(p.v, p.n)) >= 1e-5 || dot2(cross3, p.v) <= 0.99999)
      return rayReferenceFailure("view requires finite orthonormal axes and positive extents");
    for (const a of [0, 1, 2]) {
      matrix[a * 4] = 2 * p.u[a] / p.width;
      matrix[a * 4 + 1] = -2 * p.v[a] / p.height;
      matrix[a * 4 + 2] = -p.n[a] / p.depth;
    }
    matrix[12] = -2 * dot2(p.origin, p.u) / p.width - 1;
    matrix[13] = 2 * dot2(p.origin, p.v) / p.height + 1;
    matrix[14] = dot2(p.origin, p.n) / p.depth;
    eye = [...p.n, 0];
    depth = p.depth;
  }
  const inverse = mat4.invert(mat4.create(), matrix);
  const roundTrip = mat4.multiply(mat4.create(), matrix, inverse);
  if (![...matrix, ...inverse].every(Number.isFinite) || roundTrip.some((v, i) => Math.abs(v - (i % 5 === 0 ? 1 : 0)) > 1e-3))
    return rayReferenceFailure("capture projection is not invertible");
  return ok7({ matrix, inverse, eye, depth });
}
function transformCardProjection(p, transform) {
  const m = Array.from(transform);
  if (m.length !== 16 || !m.every(Number.isFinite) || m[3] !== 0 || m[7] !== 0 || m[11] !== 0 || m[15] !== 1)
    return rayReferenceFailure("card transform requires a finite affine matrix");
  const direction = (a) => [0, 1, 2].map(
    (i) => (m[i] ?? NaN) * a[0] + (m[i + 4] ?? NaN) * a[1] + (m[i + 8] ?? NaN) * a[2]
  );
  const origin = direction(p.origin);
  for (const i of [0, 1, 2]) origin[i] += m[12 + i] ?? NaN;
  const u = direction(p.u), v = direction(p.v), n = direction(p.n);
  const lu = Math.hypot(...u), lv = Math.hypot(...v), ln = Math.hypot(...n);
  const width = p.width * lu, height = p.height * lv, depth = p.depth * ln;
  for (const [axis, length] of [
    [u, lu],
    [v, lv],
    [n, ln]
  ])
    for (const i of [0, 1, 2]) axis[i] /= length;
  const handedness = (u[1] * n[2] - u[2] * n[1]) * v[0] + (u[2] * n[0] - u[0] * n[2]) * v[1] + (u[0] * n[1] - u[1] * n[0]) * v[2];
  if (handedness < 0)
    for (const i of [0, 1, 2]) {
      origin[i] += v[i] * height;
      v[i] = -v[i];
    }
  const projection = { origin, u, v, n, width, height, depth };
  const valid = captureViewProjection(projection);
  return valid.ok ? ok7(projection) : valid;
}

// sdk/engine/node_modules/@forgeax/engine-render/src/raytracing/index-allocator.ts
function createIndexAllocator(capacity, end = 0) {
  if (!Number.isSafeInteger(capacity) || !Number.isSafeInteger(end) || end < 0 || end > capacity)
    throw new Error("index allocator requires 0 <= end <= capacity");
  let high = end;
  let holes = [];
  return {
    capacity,
    get end() {
      return high;
    },
    allocate(count) {
      if (!Number.isSafeInteger(count) || count < 1) return void 0;
      const hole = holes.findIndex((run2) => run2.end - run2.first >= count);
      const found = holes[hole];
      if (found !== void 0) {
        const run2 = { first: found.first, end: found.first + count };
        if (run2.end === found.end) holes.splice(hole, 1);
        else found.first = run2.end;
        return run2;
      }
      if (high + count > capacity) return void 0;
      const run = { first: high, end: high + count };
      high = run.end;
      return run;
    },
    free(run) {
      if (run.end <= run.first) return;
      if (run.first < 0 || run.end > high) throw new Error("freed run lies outside the allocation");
      const sorted = [...holes, { ...run }].sort((a, b) => a.first - b.first);
      holes = [];
      for (const next of sorted) {
        const last = holes[holes.length - 1];
        if (last !== void 0 && next.first < last.end)
          throw new Error("freed run overlaps a free run");
        if (last !== void 0 && next.first === last.end) last.end = next.end;
        else holes.push(next);
      }
    }
  };
}

// sdk/engine/node_modules/@forgeax/engine-render/src/raytracing/material-bindings.ts
import {
  derive as derive2,
  materialValuesToLinearRuntime,
  ok as ok8
} from "@forgeax/engine-types";
function referenceSurfaceMaterialSnapshot(material) {
  const values = materialValuesToLinearRuntime(
    material.asset.values,
    material.program.paramSchema,
    material.asset.colorSpace
  );
  return {
    ...defaultMaterialSnapshot(),
    renderState: material.asset.passes?.find((pass) => pass.name.toLowerCase() === "forward")?.renderState,
    paramSnapshot: Object.fromEntries(
      Object.entries(values).filter(
        ([, v]) => typeof v === "number" || typeof v === "string" || Array.isArray(v)
      )
    ),
    textureCoordinates: collectMaterialTextureCoordinates(values)
  };
}
function createSurfaceMaterialBindings(device, paramSchema, snapshot, visibility, resolveTexture) {
  const derived = derive2(paramSchema);
  const row = packMaterialProgramRow(paramSchema, snapshot, Math.max(16, derived.totalBytes));
  if (!row) return rayReferenceFailure("material uniform layout exceeds its allocation");
  const uniform = device.createBuffer({
    label: "surface.material",
    size: row.byteLength,
    usage: 72
  });
  if (!uniform.ok) return uniform;
  const failed = (result) => {
    device.destroyBuffer(uniform.value);
    return result;
  };
  const wrote = device.queue.writeBuffer(uniform.value, 0, row);
  if (!wrote.ok) return failed(wrote);
  const layout = device.createBindGroupLayout({
    entries: derived.bglEntries.map((e) => ({
      binding: e.binding,
      visibility,
      ...e.buffer ? { buffer: e.buffer } : {},
      ...e.texture ? { texture: e.texture } : {},
      ...e.sampler ? { sampler: e.sampler } : {},
      ...e.storageTexture ? { storageTexture: e.storageTexture } : {}
    }))
  });
  if (!layout.ok) return failed(layout);
  const group = createSurfaceMaterialGroup(
    device,
    paramSchema,
    uniform.value,
    layout.value,
    resolveTexture
  );
  if (!group.ok) return failed(group);
  return ok8({
    uniform: uniform.value,
    bytes: row.byteLength,
    layout: layout.value,
    ...group.value
  });
}
function createSurfaceMaterialGroup(device, paramSchema, uniform, layout, resolveTexture) {
  const derived = derive2(paramSchema);
  const entries = [];
  const binding = derived.bglEntries.find((e) => e.buffer?.type === "uniform")?.binding;
  if (binding !== void 0)
    entries.push({ binding, resource: { kind: "buffer", value: { buffer: uniform } } });
  const textures = /* @__PURE__ */ new Map();
  for (const r of derived.resourceBindings) {
    const parameter = r.parameter ?? r.name;
    let texture = textures.get(parameter);
    if (!texture) {
      if (!resolveTexture) return rayReferenceFailure(`missing texture binding ${parameter}`);
      const result = resolveTexture(parameter);
      if (!result.ok) return result;
      texture = result.value;
      textures.set(parameter, texture);
    }
    entries.push(
      r.kind === "sampler" ? { binding: r.binding, resource: { kind: "sampler", value: texture.sampler } } : { binding: r.binding, resource: { kind: "textureView", value: texture.view } }
    );
  }
  const group = device.createBindGroup({ layout, entries });
  if (!group.ok) return group;
  return ok8({
    group: group.value,
    textureViews: [...new Set([...textures.values()].map((texture) => texture.view))]
  });
}

// sdk/engine/node_modules/@forgeax/engine-render/src/raytracing/surface-cards.ts
var CARD_PLANES = [
  "albedoRoughness",
  "normals",
  "emissionMetallic",
  "f0Validity"
];
var CARD_TEXTURES = [...CARD_PLANES, "depth"];
var CARD_TILE_CLEAR_WGSL = `
struct ClearOut { @location(0) a: vec4f, @location(1) b: vec4f, @location(2) c: vec4f, @location(3) d: vec4f }
@vertex fn vs_clear(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
 let p=vec2f(f32((i<<1u)&2u),f32(i&2u));return vec4f(p*2.0-vec2f(1.0),1.0,1.0);
}
@fragment fn fs_clear() -> ClearOut { return ClearOut(vec4f(0),vec4f(0),vec4f(0),vec4f(0)); }
`;
function surfaceCardKey(source) {
  return JSON.stringify([
    rayGeometryKey(source.instance, source.layout.meshDigest),
    source.layout,
    source.instance.uvSets?.map((v) => Array.from(v)),
    source.instance.colors === void 0 ? null : Array.from(source.instance.colors),
    source.instance.normals === void 0 ? null : Array.from(source.instance.normals),
    source.instance.tangents === void 0 ? null : Array.from(source.instance.tangents),
    source.sections.map((section) => [
      section.indexOffset,
      section.indexCount,
      section.material.id,
      section.material.program.contract,
      section.material.program.sourceClosureDigest,
      section.material.asset.values,
      section.textureContentKey
    ])
  ]);
}
function packCardProjection(p, winding = 1) {
  return new Uint8Array(
    new Float32Array([...p.origin, winding, ...p.u, p.width, ...p.v, p.height, ...p.n, p.depth]).buffer
  );
}
async function createSurfaceCapture(device, compile, sources, request = { kind: "cards", resolution: 16 }, resolveTexture) {
  const lowered = [];
  for (const source of sources) {
    const sections = [];
    for (const section of source.sections) {
      const { material } = section;
      if (material.program.context !== "card-capture" || material.program.contract !== rayMaterialContract(material.asset))
        return rayReferenceFailure("card material identity/context is stale or mismatched");
      const admitted = admitRayMaterial(material.asset, String(material.id));
      if (!admitted.ok) return admitted;
      if (material.program.paramSchema.some((p) => p.type === "texture2d") && !section.textureContentKey)
        return rayReferenceFailure("textured cards require a producer textureContentKey");
      sections.push({
        ...section,
        material: {
          id: material.id,
          program: { source: material.program.wgsl, paramSchema: material.program.paramSchema },
          snapshot: referenceSurfaceMaterialSnapshot(material),
          resolveTexture: (parameter) => {
            const value = materialTextureValue(material.asset.values?.[parameter]);
            return value && resolveTexture ? resolveTexture(value) : rayReferenceFailure(`missing texture binding ${parameter}`);
          }
        }
      });
    }
    lowered.push({
      instance: source.instance,
      layout: source.layout,
      captureKey: surfaceCardKey(source),
      sections
    });
  }
  return prepareSurfaceCapture(device, compile, lowered, request);
}
async function prepareSurfaceCapture(device, compile, sources, request = { kind: "cards", resolution: 16 }, maxBytes = 256 * 1024 * 1024, reserve = 0, residency) {
  const { resolution } = request;
  if (residency !== void 0 && (request.kind !== "cards" || !Number.isSafeInteger(residency.maxTexels) || residency.maxTexels < resolution * resolution))
    return rayReferenceFailure("Card residency requires a Card atlas of at least one tile");
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 256 * 1024 * 1024)
    return rayReferenceFailure("capture requires an explicit byte budget within 256 MiB", true);
  if (!Number.isSafeInteger(reserve) || reserve < 0)
    return rayReferenceFailure("capture tile reserve must be a nonnegative integer");
  if (request.kind === "view") {
    const projection = captureViewProjection(request.projection);
    if (!projection.ok) return projection;
  }
  if (!Number.isInteger(resolution) || resolution < 8 || resolution > 512 || sources.length < 1 || residency === void 0 && sources.length > 1024)
    return rayReferenceFailure("capture requires 1..1024 instances and 8..512 pixels", true);
  if (!device.caps.rgba16floatRenderable || device.caps.maxColorAttachments < 4)
    return rayReferenceFailure("card capture requires four rgba16float attachments");
  if (new Set(sources.map((s) => s.instance.instanceId)).size !== sources.length)
    return rayReferenceFailure("duplicate card instance");
  for (const source of sources) {
    const valid = validateMeshCardLayout(source.layout);
    if (!valid.ok) return rayReferenceFailure("invalid cooked card layout");
  }
  const cardCount = sources.reduce((sum, source) => sum + source.layout.cards.length, 0);
  if (cardCount > 4096 && residency === void 0)
    return rayReferenceFailure("capture exceeds 4096 card budget", true);
  const workCount = sources.reduce(
    (sum, source) => sum + source.sections.length * (request.kind === "cards" ? source.layout.cards.length : 1),
    0
  );
  if (workCount > 65536 && residency === void 0)
    return rayReferenceFailure("capture exceeds 65536 material-card draw budget", true);
  const shape = (tiles2) => {
    const columns2 = request.kind === "cards" ? Math.max(1, Math.ceil(Math.sqrt(tiles2))) : 1;
    const rows = request.kind === "cards" ? Math.max(1, Math.ceil(tiles2 / columns2)) : 1;
    return { columns: columns2, rows, width: resolution * columns2, height: resolution * rows };
  };
  const fits = (s, bytes2) => s.width <= 8192 && s.height <= 8192 && s.width * s.height * 36 <= bytes2 && (residency === void 0 || s.width * s.height <= residency.maxTexels);
  let target = request.kind === "cards" ? Math.min(4096, cardCount + reserve) : cardCount;
  const floor = residency !== void 0 && !fits(shape(Math.min(4096, cardCount)), maxBytes) ? 1 : Math.min(cardCount, target);
  while (target > floor && !fits(shape(target), maxBytes / 2))
    target = Math.max(floor, Math.floor(target * 0.75));
  const { columns, width, height, rows: atlasRows } = shape(target);
  if (!fits({ columns, rows: atlasRows, width, height }, maxBytes))
    return rayReferenceFailure("capture exceeds texture extent or attachment byte budget", true);
  const tiles = createIndexAllocator(
    request.kind === "cards" ? Math.min(4096, columns * atlasRows) : 0
  );
  let allocatedBytes = 0;
  const bufferReads = [];
  const textureReads = [];
  const ownedBuffers = [], ownedTextures = [];
  const retired = [];
  const retiring = /* @__PURE__ */ new Set();
  let revision = 0;
  const dispose = () => {
    for (const b of ownedBuffers) device.destroyBuffer(b);
    for (const b of retired) device.destroyBuffer(b);
    for (const group of retiring) for (const b of group) device.destroyBuffer(b);
    for (const t of ownedTextures) device.destroyTexture(t);
    ownedBuffers.length = 0;
    retired.length = 0;
    retiring.clear();
    ownedTextures.length = 0;
  };
  const retire = (buffers) => {
    if (buffers.length === 0) return;
    const set = new Set(buffers);
    for (let i = bufferReads.length - 1; i >= 0; i--) {
      const read = bufferReads[i];
      if (read === void 0 || !set.has(read.buffer)) continue;
      allocatedBytes -= read.size;
      bufferReads.splice(i, 1);
    }
    for (let i = ownedBuffers.length - 1; i >= 0; i--) {
      const owned = ownedBuffers[i];
      if (owned !== void 0 && set.has(owned)) ownedBuffers.splice(i, 1);
    }
    retired.push(...buffers);
    revision++;
  };
  const fail = (r) => {
    dispose();
    return r;
  };
  const make = (label, bytes2, uniform = false) => {
    if (allocatedBytes + bytes2.byteLength > maxBytes)
      return rayReferenceFailure("capture exceeds its complete resource byte budget", true);
    const b = device.createBuffer({
      label,
      size: bytes2.byteLength,
      usage: (uniform ? 64 : 128) | 12
    });
    if (!b.ok) return b;
    ownedBuffers.push(b.value);
    bufferReads.push({
      buffer: b.value,
      size: bytes2.byteLength,
      usage: uniform ? "uniform-read" : "storage-read"
    });
    allocatedBytes += bytes2.byteLength;
    const write = device.queue.writeBuffer(b.value, 0, bytes2);
    return write.ok ? b : write;
  };
  allocatedBytes += width * height * 36;
  const textures = {};
  const views = [];
  for (const name of CARD_PLANES) {
    const texture = device.createTexture({
      label: `cards.${name}`,
      size: { width, height },
      format: "rgba16float",
      textureBindingViewDimension: "2d",
      usage: 21
    });
    if (!texture.ok) return fail(texture);
    ownedTextures.push(texture.value);
    textures[name] = texture.value;
    const view = device.createTextureView(texture.value, {});
    if (!view.ok) return fail(view);
    views.push(view.value);
  }
  const depth = device.createTexture({
    label: "cards.depth",
    size: { width, height },
    format: "depth32float",
    textureBindingViewDimension: "2d",
    usage: 21
  });
  if (!depth.ok) return fail(depth);
  ownedTextures.push(depth.value);
  textures.depth = depth.value;
  const depthView = device.createTextureView(depth.value, {});
  if (!depthView.ok) return fail(depthView);
  const layout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: 1, buffer: { type: "read-only-storage" } },
      { binding: 1, visibility: 1, buffer: { type: "read-only-storage" } },
      { binding: 2, visibility: 3, buffer: { type: "uniform" } }
    ]
  });
  if (!layout.ok) return fail(layout);
  const entries = [];
  const workRoot = () => {
    const members = /* @__PURE__ */ new Map();
    return {
      members,
      tileCount: 0,
      get tiles() {
        return this.tileCount;
      },
      runs: () => members.values(),
      has: (run) => members.get(run.first) === run
    };
  };
  const materialRoots = /* @__PURE__ */ new Map();
  const assetRoots = /* @__PURE__ */ new Map();
  const materialWork = {
    roots: 0,
    drawVisits: 0,
    uniformUploads: 0,
    assetRoots: 0,
    bindingRefreshes: 0
  };
  const textureUsers = /* @__PURE__ */ new Map();
  const textureIndices = /* @__PURE__ */ new Map();
  const retainViews = (views2) => {
    for (const view of views2) {
      const count = textureUsers.get(view) ?? 0;
      if (count === 0) {
        textureIndices.set(view, textureReads.length);
        textureReads.push(view);
      }
      textureUsers.set(view, count + 1);
    }
  };
  const releaseViews = (views2) => {
    for (const view of views2) {
      const count = textureUsers.get(view);
      if (count === void 0) continue;
      if (count > 1) {
        textureUsers.set(view, count - 1);
        continue;
      }
      textureUsers.delete(view);
      const index = textureIndices.get(view);
      textureIndices.delete(view);
      const tail = textureReads.pop();
      if (index !== void 0 && tail !== void 0 && tail !== view) {
        textureReads[index] = tail;
        textureIndices.set(tail, index);
      }
    }
  };
  const runMaterials = /* @__PURE__ */ new WeakMap();
  const attachAssets = (material) => {
    const scope = material.scope;
    if (scope === void 0) return [];
    let roots = assetRoots.get(scope);
    if (roots === void 0) {
      roots = /* @__PURE__ */ new Map();
      assetRoots.set(scope, roots);
    }
    const handles = /* @__PURE__ */ new Set([
      ...material.snapshot.textureHandles?.values() ?? [],
      ...material.snapshot.samplerHandles?.values() ?? []
    ]);
    return [...handles].filter((handle) => handle !== 0).map((handle) => {
      let root = roots.get(handle);
      if (root === void 0) {
        const materials = /* @__PURE__ */ new Set();
        root = {
          scope,
          handle,
          materials,
          revision: 0,
          tileCount: 0,
          get tiles() {
            return this.tileCount;
          },
          *runs() {
            const seen = /* @__PURE__ */ new Set();
            for (const material2 of materials)
              for (const run of material2.runs()) {
                if (seen.has(run.first)) continue;
                seen.add(run.first);
                yield run;
              }
          },
          has: (run) => {
            const owner = runMaterials.get(run);
            return owner !== void 0 && materials.has(owner) && owner.has(run);
          }
        };
        roots.set(handle, root);
      }
      root.materials.add(material);
      root.tileCount += material.tileCount;
      return { root, revision: root.revision };
    });
  };
  const detachAssets = (material) => {
    for (const { root } of material.assets) {
      root.materials.delete(material);
      root.tileCount -= material.tileCount;
      if (root.materials.size === 0) {
        const roots = assetRoots.get(root.scope);
        roots?.delete(root.handle);
        if (roots?.size === 0) assetRoots.delete(root.scope);
      }
    }
  };
  const drawsByTile = /* @__PURE__ */ new Map();
  let drawCount = 0;
  const editable = /* @__PURE__ */ new Map();
  const modules = /* @__PURE__ */ new Map();
  const meshDigests = /* @__PURE__ */ new WeakMap();
  const sidednessDigests = /* @__PURE__ */ new Map();
  const sidednessOf = (source) => {
    const { instance } = source;
    if (source.sections.length < 1 || source.sections.length > 1024)
      return rayReferenceFailure("capture requires 1..1024 material sections per mesh", true);
    const sidedness = new Uint8Array(instance.indices.length / 3);
    let indexEnd = 0;
    for (const section of source.sections) {
      if (section.indexOffset !== indexEnd || !Number.isSafeInteger(section.indexCount) || section.indexCount < 3 || section.indexCount % 3 !== 0 || section.indexOffset + section.indexCount > instance.indices.length)
        return rayReferenceFailure(
          "card sections must cover contiguous non-overlapping triangle ranges"
        );
      indexEnd += section.indexCount;
      const cull = section.material.snapshot.renderState?.cullMode ?? "back";
      if (cull !== "back" && cull !== "none")
        return rayReferenceFailure("card sections require back or none culling");
      sidedness.fill(cull === "none" ? 1 : 0, section.indexOffset / 3, indexEnd / 3);
    }
    if (indexEnd !== instance.indices.length)
      return rayReferenceFailure("card sections must cover the whole mesh");
    return ok9(sidedness);
  };
  const sidednessKey = (flags) => flags.join("");
  const admitted = (source) => {
    const sidedness = sidednessOf(source);
    return sidedness.ok && meshDigests.get(source.instance.positions)?.get(source.instance.indices) !== void 0 && sidednessDigests.has(sidednessKey(sidedness.value)) && source.sections.every((s) => modules.has(s.material.program.source));
  };
  const admit = async (source) => {
    const { instance } = source;
    let byIndices = meshDigests.get(instance.positions);
    if (byIndices?.get(instance.indices) === void 0) {
      const digest = await distanceFieldMeshDigest(instance.positions, instance.indices);
      if (byIndices === void 0) {
        byIndices = /* @__PURE__ */ new WeakMap();
        meshDigests.set(instance.positions, byIndices);
      }
      byIndices.set(instance.indices, digest);
    }
    const sidedness = sidednessOf(source);
    if (!sidedness.ok) return sidedness;
    const key = sidednessKey(sidedness.value);
    if (!sidednessDigests.has(key))
      sidednessDigests.set(key, await meshCardSidednessDigest(sidedness.value));
    for (const section of source.sections) {
      const code = section.material.program.source;
      if (modules.has(code)) continue;
      const module = await compile(device, { code, label: "cards.material" });
      if (!module.ok) return module;
      modules.set(code, module.value);
    }
    return ok9(void 0);
  };
  const install = (source, firstTile) => {
    const mark = ownedBuffers.length;
    const installed = installAt(source, firstTile, mark);
    if (!installed.ok) retire(ownedBuffers.slice(mark));
    else revision++;
    return installed;
  };
  const installAt = (source, firstTile, mark) => {
    const { instance, layout: cardLayout } = source;
    if (meshDigests.get(instance.positions)?.get(instance.indices) !== cardLayout.meshDigest)
      return rayReferenceFailure("card source geometry differs from its cooked layout");
    const sidedness = sidednessOf(source);
    if (!sidedness.ok) return sidedness;
    if (cardLayout.sidednessDigest !== sidednessDigests.get(sidednessKey(sidedness.value)))
      return rayReferenceFailure("card layout sidedness must match every material section");
    const cardProjections = [];
    if (request.kind === "cards")
      for (const local of cardLayout.cards) {
        const transformed = transformCardProjection(local, instance.transform);
        if (!transformed.ok) return transformed;
        cardProjections.push(transformed.value);
      }
    const cards = request.kind === "cards" ? cardProjections : [request.projection];
    const projectionBuffers = [];
    for (const card of cards) {
      const projection = captureViewProjection(card);
      if (!projection.ok) return projection;
      const bytes2 = new Float32Array(24);
      bytes2.set(projection.value.matrix);
      bytes2.set(projection.value.eye, 16);
      new Uint32Array(bytes2.buffer)[20] = request.kind === "cards" ? 1 : 0;
      const buffer = make("cards.projection", new Uint8Array(bytes2.buffer), true);
      if (!buffer.ok) return buffer;
      projectionBuffers.push(buffer.value);
    }
    const editSections = [];
    const installed = [];
    const installedMaterials = /* @__PURE__ */ new Set();
    for (const section of source.sections) {
      const { material } = section;
      const values = {
        ...Object.fromEntries(
          material.program.paramSchema.map((p) => [p.name, "default" in p ? p.default : void 0])
        ),
        ...material.snapshot.paramSnapshot
      };
      const admittedValues = admitRayMaterialValues(values, String(material.id), source.captureKey);
      if (!admittedValues.ok) return admittedValues;
      if (material.snapshot.renderState?.blend !== void 0 || material.snapshot.surfaceModel === "single-layer-medium")
        return rayReferenceFailure("card capture requires opaque or masked Standard material");
      const coordinates = material.snapshot.textureCoordinates;
      const textureParams = material.program.paramSchema.filter((p) => p.type === "texture2d");
      for (const entry of textureParams) {
        if (entry.name === "normalTexture" && (instance.normals === void 0 || instance.tangents === void 0))
          return rayReferenceFailure(
            `instance ${instance.instanceId} normal texture requires authored normals and tangents`
          );
        const set = coordinates?.get(entry.name)?.set ?? 0;
        if (set >= (instance.uvSets?.length ?? 0))
          return rayReferenceFailure(
            `instance ${instance.instanceId} is missing material UV set ${set}`
          );
      }
      const cullMode = material.snapshot.renderState?.cullMode ?? "back";
      if (cullMode !== "back" && cullMode !== "none")
        return rayReferenceFailure("invalid card culling");
      const scene = buildRaySurfaceScene([
        {
          ...instance,
          materialId: material.id,
          indices: Array.from(
            { length: section.indexCount },
            (_, i) => instance.indices[section.indexOffset + i] ?? NaN
          )
        }
      ]);
      if (!scene.ok) return scene;
      const value = scene.value;
      const triangles = make("cards.triangles", value.triangles), attributes = make("cards.attributes", value.attributes);
      if (!triangles.ok) return triangles;
      if (!attributes.ok) return attributes;
      const identity = material.identity ?? material.snapshot;
      let root = materialRoots.get(identity);
      if (root === void 0) {
        const bindings = createSurfaceMaterialBindings(
          device,
          material.program.paramSchema,
          material.snapshot,
          2,
          material.resolveTexture
        );
        if (!bindings.ok) return bindings;
        ownedBuffers.push(bindings.value.uniform);
        bufferReads.push({
          buffer: bindings.value.uniform,
          size: bindings.value.bytes,
          usage: "uniform-read"
        });
        allocatedBytes += bindings.value.bytes;
        if (allocatedBytes > maxBytes)
          return rayReferenceFailure("capture exceeds its complete resource byte budget", true);
        const row = packMaterialProgramRow(
          material.program.paramSchema,
          material.snapshot,
          bindings.value.bytes
        );
        if (row === void 0)
          return rayReferenceFailure("material uniform layout exceeds its allocation");
        root = Object.assign(workRoot(), {
          identity,
          schema: material.program.paramSchema,
          snapshot: material.snapshot,
          uploaded: material.snapshot,
          row,
          uniform: bindings.value.uniform,
          layout: bindings.value.layout,
          group: bindings.value.group,
          textureViews: bindings.value.textureViews,
          resolveTexture: material.resolveTexture,
          refreshTextures: material.refreshTextures,
          releaseTextures: material.releaseTextures,
          assets: [],
          scope: material.scope,
          bindingsDirty: false
        });
        root.assets = attachAssets(root);
        retainViews(root.textureViews);
        materialRoots.set(identity, root);
      }
      installedMaterials.add(root);
      const module = modules.get(material.program.source);
      if (module === void 0) return rayReferenceFailure("card material program is not admitted");
      const pipelineLayout = device.createPipelineLayout({
        bindGroupLayouts: [layout.value, root.layout]
      });
      if (!pipelineLayout.ok) return pipelineLayout;
      const winding = new DataView(value.attributes.buffer).getFloat32(108, true);
      const pipeline = device.createRenderPipeline({
        label: `cards.capture.instance-${instance.instanceId}.indices-${section.indexOffset}-${section.indexCount}.material-${material.id}`,
        layout: pipelineLayout.value,
        vertex: { module, entryPoint: "vs_card", buffers: [] },
        fragment: {
          module,
          entryPoint: "fs_card",
          targets: CARD_PLANES.map(() => ({ format: "rgba16float" }))
        },
        primitive: {
          topology: "triangle-list",
          cullMode,
          frontFace: winding < 0 ? "cw" : "ccw"
        },
        depthStencil: { format: "depth32float", depthWriteEnabled: true, depthCompare: "less" }
      });
      if (!pipeline.ok) return pipeline;
      const groups = [];
      for (const buffer of projectionBuffers) {
        const group = device.createBindGroup({
          layout: layout.value,
          entries: [triangles.value, attributes.value, buffer].map((b, binding) => ({
            binding,
            resource: { kind: "buffer", value: { buffer: b } }
          }))
        });
        if (!group.ok) return group;
        groups.push(group.value);
      }
      installed.push({
        pipeline: pipeline.value,
        root,
        cards: groups,
        vertices: value.triangleCount * 3,
        firstTile,
        instanceId: instance.instanceId
      });
      editSections.push({
        indexOffset: section.indexOffset,
        indexCount: section.indexCount,
        materialId: material.id,
        triangles: triangles.value,
        attributes: attributes.value,
        winding
      });
    }
    drawCount += installed.length;
    for (const draw of installed)
      for (let card = 0; card < draw.cards.length; card++) {
        const tile = firstTile + card;
        let work = drawsByTile.get(tile);
        if (work === void 0) {
          work = /* @__PURE__ */ new Set();
          drawsByTile.set(tile, work);
        }
        work.add(draw);
      }
    for (const root of installedMaterials) {
      const run = { first: firstTile, end: firstTile + cards.length };
      root.members.set(firstTile, run);
      runMaterials.set(run, root);
      root.tileCount += cards.length;
      for (const asset of root.assets) asset.root.tileCount += cards.length;
    }
    editable.set(instance.instanceId, {
      instance,
      layout: cardLayout,
      firstTile,
      projections: projectionBuffers,
      buffers: ownedBuffers.slice(mark).filter((buffer) => ![...installedMaterials].some((root) => root.uniform === buffer)),
      draws: installed,
      materials: installedMaterials,
      sections: editSections
    });
    entries.push({
      instanceId: instance.instanceId,
      geometryKey: rayGeometryKey(instance, cardLayout.meshDigest),
      captureKey: source.captureKey,
      projections: cardProjections
    });
    return ok9(void 0);
  };
  const detach = (instanceId) => {
    const record = editable.get(instanceId);
    if (record !== void 0) {
      retire(record.buffers);
      drawCount -= record.draws.length;
      for (const draw of record.draws)
        for (let card = 0; card < draw.cards.length; card++) {
          const tile = draw.firstTile + card;
          const work = drawsByTile.get(tile);
          work?.delete(draw);
          if (work?.size === 0) drawsByTile.delete(tile);
        }
      for (const root of record.materials) {
        const run = root.members.get(record.firstTile);
        if (run !== void 0) {
          root.tileCount -= run.end - run.first;
          for (const asset of root.assets) asset.root.tileCount -= run.end - run.first;
        }
        root.members.delete(record.firstTile);
        if (root.members.size === 0) {
          materialRoots.delete(root.identity);
          detachAssets(root);
          releaseViews(root.textureViews);
          retire([root.uniform]);
          root.releaseTextures?.();
        }
      }
    }
    editable.delete(instanceId);
    const entry = entries.findIndex((e) => e.instanceId === instanceId);
    if (entry >= 0) entries.splice(entry, 1);
  };
  for (const source of sources) {
    if (residency !== void 0 && (editable.size >= 1024 || drawCount + source.sections.length * source.layout.cards.length > 65536))
      break;
    const admittedSource = await admit(source);
    if (!admittedSource.ok) return fail(admittedSource);
    const run = request.kind === "cards" ? tiles.allocate(source.layout.cards.length) : { first: 0, end: 0 };
    if (run === void 0) {
      if (residency !== void 0) break;
      return fail(rayReferenceFailure("capture atlas has no free tiles", true));
    }
    const installed = install(source, run.first);
    if (!installed.ok) {
      if (residency !== void 0 && installed.error.code === "ray-reference-limit") {
        tiles.free(run);
        break;
      }
      return fail(installed);
    }
  }
  let clearPipeline;
  if (request.kind === "cards") {
    const module = await compile(device, { code: CARD_TILE_CLEAR_WGSL, label: "cards.clear" });
    if (!module.ok) return fail(module);
    const clearLayout = device.createPipelineLayout({ bindGroupLayouts: [] });
    if (!clearLayout.ok) return fail(clearLayout);
    const created = device.createRenderPipeline({
      label: "cards.clear-tile",
      layout: clearLayout.value,
      vertex: { module: module.value, entryPoint: "vs_clear", buffers: [] },
      fragment: {
        module: module.value,
        entryPoint: "fs_clear",
        targets: CARD_PLANES.map(() => ({ format: "rgba16float" }))
      },
      primitive: { topology: "triangle-list", cullMode: "none" },
      depthStencil: { format: "depth32float", depthWriteEnabled: true, depthCompare: "always" }
    });
    if (!created.ok) return fail(created);
    clearPipeline = created.value;
  }
  const tileRect = (pass, tile) => {
    const column = tile % columns, row = request.kind === "cards" ? Math.floor(tile / columns) : 0;
    pass.setViewport(column * resolution, row * resolution, resolution, resolution, 0, 1);
    pass.setScissorRect(column * resolution, row * resolution, resolution, resolution);
  };
  const writeProjection = (buffer, card) => {
    const projection = captureViewProjection(card);
    if (!projection.ok) return projection;
    const bytes2 = new Float32Array(24);
    bytes2.set(projection.value.matrix);
    bytes2.set(projection.value.eye, 16);
    new Uint32Array(bytes2.buffer)[20] = 1;
    const written = device.queue.writeBuffer(buffer, 0, new Uint8Array(bytes2.buffer));
    return written.ok ? ok9(void 0) : rayReferenceFailure(written.error.expected);
  };
  const editableSource = (source) => {
    if (disposed || request.kind !== "cards")
      return rayReferenceFailure("in-place Card edits require a live Card capture");
    if (!admitted(source))
      return rayReferenceFailure("in-place Card source is not admitted; admit it first");
    if (drawCount + source.sections.length * source.layout.cards.length > 65536)
      return rayReferenceFailure("capture exceeds 65536 material-card draw budget", true);
    return ok9(void 0);
  };
  let disposed = false;
  return ok9({
    get materialWork() {
      return { ...materialWork };
    },
    adoptAsset(scope, handle, revision2) {
      const root = assetRoots.get(scope)?.get(handle);
      if (disposed || root === void 0 || root.revision === revision2) return void 0;
      root.revision = revision2;
      materialWork.assetRoots++;
      return root;
    },
    prepareTiles(tiles2) {
      if (disposed) throw new Error("surface cards are disposed");
      for (let tile = tiles2.first; tile < tiles2.first + tiles2.count; tile++)
        for (const draw of drawsByTile.get(tile) ?? []) {
          const root = draw.root;
          if (!root.bindingsDirty && !root.assets.some((asset) => asset.revision !== asset.root.revision))
            continue;
          root.refreshTextures?.(root.snapshot);
          const binding = createSurfaceMaterialGroup(
            device,
            root.schema,
            root.uniform,
            root.layout,
            root.resolveTexture
          ).unwrap();
          retainViews(binding.textureViews);
          releaseViews(root.textureViews);
          root.group = binding.group;
          root.textureViews = binding.textureViews;
          for (const asset of root.assets) asset.revision = asset.root.revision;
          root.bindingsDirty = false;
          materialWork.bindingRefreshes++;
          revision++;
        }
    },
    adoptMaterial(identity, snapshot) {
      if (disposed) return rayReferenceFailure("surface cards are disposed");
      const root = materialRoots.get(identity);
      if (root === void 0 || root.snapshot === snapshot) return ok9(void 0);
      const contract = (value) => JSON.stringify([
        value.materialSurfacePrograms?.["card-capture"],
        value.renderState,
        value.surfaceModel,
        [...value.textureCoordinates ?? []]
      ]);
      if (contract(root.snapshot) !== contract(snapshot))
        return rayReferenceFailure("changed Card material bindings require capture preparation");
      const values = {
        ...Object.fromEntries(
          root.schema.map((parameter) => [
            parameter.name,
            "default" in parameter ? parameter.default : void 0
          ])
        ),
        ...snapshot.paramSnapshot
      };
      const admittedValues = admitRayMaterialValues(
        values,
        String(snapshot.materialHandle),
        "retained-card-material"
      );
      if (!admittedValues.ok) return admittedValues;
      const clipping = values.clippingControl;
      if (clipping !== void 0 && (!Array.isArray(clipping) || clipping[0] !== 0) || standardDisplacementRadius([snapshot]) > 0)
        return rayReferenceFailure(
          "retained field requires unclipped, undisplaced Card material values"
        );
      const row = packMaterialProgramRow(root.schema, snapshot, root.row.byteLength);
      if (row === void 0)
        return rayReferenceFailure("material uniform layout exceeds its allocation");
      const bindings = (value) => JSON.stringify([
        [...value.textureHandles ?? []],
        [...value.samplerHandles ?? []],
        [...value.authoredSamplerFields ?? []]
      ]);
      const rebind = bindings(root.snapshot) !== bindings(snapshot);
      if (rebind && root.refreshTextures === void 0)
        return rayReferenceFailure("changed Card bindings require a native texture owner");
      if (rebind) detachAssets(root);
      root.snapshot = snapshot;
      root.row = row;
      if (rebind) {
        root.assets = attachAssets(root);
        root.bindingsDirty = true;
      }
      materialWork.roots++;
      return ok9(root);
    },
    kind: request.kind,
    get bytes() {
      return allocatedBytes;
    },
    width,
    resolution,
    height,
    capacity: tiles.capacity,
    get allocatedTiles() {
      return tiles.end;
    },
    textures,
    views: Object.fromEntries([
      ...views.map((view, i) => [CARD_PLANES[i], view]),
      ["depth", depthView.value]
    ]),
    bufferReads,
    textureReads,
    entries,
    get revision() {
      return revision;
    },
    ...residency === void 0 ? {} : { residency },
    has: (instanceId) => editable.has(instanceId),
    track(completed) {
      if (retired.length === 0) return;
      const group = retired.splice(0);
      retiring.add(group);
      const destroy = () => {
        if (!retiring.delete(group)) return;
        for (const b of group) device.destroyBuffer(b);
      };
      void completed.then(destroy, destroy);
    },
    record(encoder) {
      if (disposed) return rayReferenceFailure("surface cards are disposed");
      const pass = encoder.beginRenderPass({
        label: "cards.capture",
        colorAttachments: views.map((view) => ({
          view,
          loadOp: "clear",
          storeOp: "store",
          clearValue: { r: 0, g: 0, b: 0, a: 0 }
        })),
        depthStencilAttachment: {
          view: depthView.value,
          depthLoadOp: "clear",
          depthStoreOp: "store",
          depthClearValue: 1
        }
      });
      try {
        return this.recordPass(pass);
      } finally {
        pass.end();
      }
    },
    clearTiles(pass, tiles2) {
      if (disposed || clearPipeline === void 0)
        return rayReferenceFailure("surface card tile clears require live Card capture");
      pass.setPipeline(clearPipeline);
      for (let tile = tiles2.first; tile < tiles2.first + tiles2.count; tile++) {
        tileRect(pass, tile);
        pass.draw(3);
      }
      return ok9(void 0);
    },
    admitted,
    admit,
    add(source) {
      const valid = editableSource(source);
      if (!valid.ok) return valid;
      if (editable.has(source.instance.instanceId))
        return rayReferenceFailure("duplicate card instance");
      if (editable.size >= 1024)
        return rayReferenceFailure("capture requires 1..1024 instances and 8..512 pixels", true);
      const validLayout = validateMeshCardLayout(source.layout);
      if (!validLayout.ok) return rayReferenceFailure("invalid cooked card layout");
      const run = tiles.allocate(source.layout.cards.length);
      if (run === void 0) return rayReferenceFailure("capture atlas has no free tiles", true);
      const installed = install(source, run.first);
      if (!installed.ok) {
        detach(source.instance.instanceId);
        tiles.free(run);
        return installed;
      }
      return ok9({ first: run.first, count: run.end - run.first });
    },
    rematerialize(instanceId, source) {
      const record = editable.get(instanceId);
      if (record === void 0 || source.instance.instanceId !== instanceId)
        return rayReferenceFailure("Card rematerialization requires a live captured instance");
      if (source.layout.meshDigest !== record.layout.meshDigest || source.layout.cards.length !== record.layout.cards.length)
        return rayReferenceFailure("Card rematerialization must keep the instance geometry");
      const valid = editableSource(source);
      if (!valid.ok) return valid;
      const position = entries.findIndex((e) => e.instanceId === instanceId);
      detach(instanceId);
      const installed = install(source, record.firstTile);
      if (!installed.ok) return installed;
      const entry = entries.pop();
      if (entry !== void 0) entries.splice(position, 0, entry);
      return ok9({ first: record.firstTile, count: record.layout.cards.length });
    },
    retransform(instanceId, transform) {
      const record = editable.get(instanceId);
      if (disposed || record === void 0 || request.kind !== "cards")
        return rayReferenceFailure("in-place Card edits require a live captured instance");
      const instance = { ...record.instance, transform: Array.from(transform) };
      const projections = [];
      for (const local of record.layout.cards) {
        const transformed = transformCardProjection(local, instance.transform);
        if (!transformed.ok) return transformed;
        projections.push(transformed.value);
      }
      const scenes = [];
      for (const section of record.sections) {
        const scene = buildRaySurfaceScene([
          {
            ...instance,
            materialId: section.materialId,
            indices: Array.from(
              { length: section.indexCount },
              (_, i) => instance.indices[section.indexOffset + i] ?? NaN
            )
          }
        ]);
        if (!scene.ok) return scene;
        const winding = new DataView(scene.value.attributes.buffer).getFloat32(108, true);
        if (Math.sign(winding) !== Math.sign(section.winding))
          return rayReferenceFailure("a Card edit that mirrors winding requires a rebuild");
        scenes.push(scene.value);
      }
      for (const [i, card] of projections.entries()) {
        const buffer = record.projections[i];
        if (buffer === void 0) return rayReferenceFailure("Card projection count changed");
        const written = writeProjection(buffer, card);
        if (!written.ok) return written;
      }
      for (const [i, section] of record.sections.entries()) {
        const scene = scenes[i];
        if (scene === void 0) return rayReferenceFailure("Card section count changed");
        for (const [buffer, bytes2] of [
          [section.triangles, scene.triangles],
          [section.attributes, scene.attributes]
        ]) {
          const written = device.queue.writeBuffer(buffer, 0, bytes2);
          if (!written.ok) return rayReferenceFailure(written.error.expected);
        }
      }
      record.instance = instance;
      const index = entries.findIndex((e) => e.instanceId === instanceId);
      const previous = entries[index];
      const geometryKey = rayGeometryKey(instance, record.layout.meshDigest);
      entries[index] = {
        instanceId,
        geometryKey,
        captureKey: JSON.stringify([previous?.captureKey, geometryKey]),
        projections
      };
      return ok9({ first: record.firstTile, count: projections.length });
    },
    remove(instanceId) {
      const record = editable.get(instanceId);
      if (disposed || record === void 0)
        return rayReferenceFailure("Card removal requires a live captured instance");
      detach(instanceId);
      const run = { first: record.firstTile, end: record.firstTile + record.layout.cards.length };
      if (request.kind === "cards") tiles.free(run);
      return ok9({ first: run.first, count: run.end - run.first });
    },
    recordPass(pass, tiles2) {
      if (disposed) return rayReferenceFailure("surface cards are disposed");
      const work = tiles2 === void 0 ? drawsByTile.entries() : (function* () {
        for (let tile = tiles2.first; tile < tiles2.first + tiles2.count; tile++) {
          const draws = drawsByTile.get(tile);
          if (draws !== void 0) yield [tile, draws];
        }
      })();
      for (const [tile, draws] of work) {
        tileRect(pass, tile);
        for (const draw of draws) {
          materialWork.drawVisits++;
          if (draw.root.uploaded !== draw.root.snapshot) {
            const written = device.queue.writeBuffer(draw.root.uniform, 0, draw.root.row);
            if (!written.ok) return rayReferenceFailure(written.error.expected);
            draw.root.uploaded = draw.root.snapshot;
            materialWork.uniformUploads++;
          }
          const group = draw.cards[tile - draw.firstTile];
          if (group === void 0) return rayReferenceFailure("Card draw lost its physical tile");
          pass.setPipeline(draw.pipeline);
          pass.setBindGroup(1, draw.root.group);
          pass.setBindGroup(0, group);
          pass.draw(draw.vertices);
        }
      }
      return ok9(void 0);
    },
    dispose() {
      if (!disposed) {
        disposed = true;
        for (const root of materialRoots.values()) root.releaseTextures?.();
        dispose();
      }
    }
  });
}

// sdk/engine/node_modules/@forgeax/engine-render/src/raytracing/card-lookup.ts
import { ok as ok10 } from "@forgeax/engine-types";
var CardLookupStatus = { notSurface: 0, mapped: 1, unmapped: 2, stale: 3 };
var CARD_LOOKUP_STRIDE = 112;
var CARD_POINT_LOOKUP_WGSL = `
fn decodeCardNormal(p: vec2f) -> vec3f {
 var n = vec3f(p,1.0-abs(p.x)-abs(p.y));
 if(n.z<0.0){n=vec3f((vec2f(1)-abs(n.yx))*select(vec2f(-1),vec2f(1),n.xy>=vec2f(0)),n.z);}
 return normalize(n);
}
struct Card { origin: vec4f, u: vec4f, v: vec4f, n: vec4f, ids: vec4u }
struct Lookup { state: vec4u, albedoRoughness: vec4f, normalDepth: vec4f, emissionMetallic: vec4f, f0: vec4f, texels: vec4u, weights: vec4f }
fn lookupCardPoint(position: vec3f, hitNormal: vec3f, instanceId: u32, projectionMargin: f32, queryStatus: u32, cardCount: u32, resolution: u32) -> Lookup {
 var out=Lookup(vec4u(${CardLookupStatus.unmapped}u,queryStatus,0xffffffffu,instanceId),vec4f(0),vec4f(0),vec4f(0),vec4f(0),vec4u(0xffffffffu),vec4f(0));
 var best=-1.0;
 for(var i=0u;i<cardCount;i++){
  let card=cards[i];if(card.ids.x!=instanceId){continue;}
  if(card.ids.y!=1u){out.state.x=${CardLookupStatus.stale}u;continue;}
  let alignment=dot(hitNormal,card.n.xyz);if(alignment<0.5){continue;}
  let rel=position-card.origin.xyz;let uv=vec2f(dot(rel,card.u.xyz)/card.u.w,dot(rel,card.v.xyz)/card.v.w);
  // The caller owns the world-space projection margin and its approximation.
  // Preserve depth/orientation tests when admitting a point outside the silhouette.
  // Interior points have exact zero edge distance. Keep that decision separate
  // from GPU distance arithmetic, especially for zero-allowance visibility hits.
  if(any(uv<vec2f(0))||any(uv>vec2f(1))){
   let edge=clamp(uv,vec2f(0),vec2f(1));
   if(length((uv-edge)*vec2f(card.u.w,card.v.w))>projectionMargin){continue;}
  }
  let depth=-dot(rel,card.n.xyz)/card.n.w;
  let pixelRadius=0.5*length(vec2f(card.u.w,card.v.w))/f32(resolution);
  let tolerance=projectionMargin+pixelRadius+card.n.w/1024.0;
  let xy=clamp(uv*f32(resolution)-vec2f(0.5),vec2f(0),vec2f(f32(resolution-1u)));
  let base=vec2u(floor(xy));let fraction=fract(xy);
  let tile=vec2u(i%(textureDimensions(f0).x/resolution),i/(textureDimensions(f0).x/resolution))*resolution;
  var texels=vec4u(0xffffffffu);var weights=vec4f(0);
  var a=vec4f(0);var e=vec4f(0);var specular=vec3f(0);var n=vec3f(0);var z=0.0;var error=0.0;var materialFlags=0u;var materialWeight=-1.0;
  for(var tap=0u;tap<4u;tap++){
   let offset=vec2u(tap&1u,tap>>1u);
   let axisWeight=select(vec2f(1)-fraction,fraction,offset>vec2u(0));let weight=axisWeight.x*axisWeight.y;
   if(weight<=0.0){continue;}
   let pixel=vec2i(tile+min(base+offset,vec2u(resolution-1u)));
   let material=textureLoad(f0,pixel,0);if((u32(material.w)&3u)!=1u){continue;}
   let frame=textureLoad(normal,pixel,0);if(dot(decodeCardNormal(frame.zw),hitNormal)<0.5){continue;}
   let sampleDepth=textureLoad(cardDepth,pixel,0);let delta=abs(depth-sampleDepth)*card.n.w;
   if(delta>tolerance){continue;}
   // Discrete material metadata follows the strongest accepted sample.
   if(weight>materialWeight){materialFlags=u32(material.w);materialWeight=weight;}
   texels[tap]=u32(pixel.y)*textureDimensions(f0).x+u32(pixel.x);weights[tap]=weight;
   a+=textureLoad(albedo,pixel,0)*weight;e+=textureLoad(emission,pixel,0)*weight;specular+=material.xyz*weight;
   n+=decodeCardNormal(frame.xy)*weight;z+=sampleDepth*weight;error+=delta*weight;
  }
  let support=dot(weights,vec4f(1));if(support<=0.0||length(n)<1e-10){continue;}
  let score=alignment-error/support/max(tolerance,1e-8)*0.1;
  if(score>best){best=score;out=Lookup(vec4u(${CardLookupStatus.mapped}u,queryStatus,i,instanceId),a/support,vec4f(normalize(n),z/support),e/support,vec4f(specular/support,f32(materialFlags)),texels,weights/support);}
 }
 return out;
}
`;
var CARD_LOOKUP_WGSL = `${CARD_POINT_LOOKUP_WGSL}
fn lookupSdfCard(hit: SdfHit, cardCount: u32, resolution: u32) -> Lookup {
 if(hit.state.x!=${SdfQueryStatus.surfaceBand}u&&hit.state.x!=${SdfQueryStatus.visibilityHit}u){
  return Lookup(vec4u(${CardLookupStatus.notSurface}u,hit.state.x,0xffffffffu,hit.state.y),vec4f(0),vec4f(0),vec4f(0),vec4f(0),vec4u(0xffffffffu),vec4f(0));
 }
 return lookupCardPoint(hit.position.xyz,hit.normal.xyz,hit.state.y,hit.metrics.y,hit.state.x,cardCount,resolution);
}

`;
var WGSL = `
struct SdfHit { state: vec4u, metrics: vec4f, position: vec4f, normal: vec4f }
@group(0) @binding(0) var<storage,read> hits: array<SdfHit>;
@group(0) @binding(1) var<storage,read> cards: array<Card>;
@group(0) @binding(2) var<storage,read_write> output: array<Lookup>;
@group(0) @binding(3) var albedo: texture_2d<f32>;
@group(0) @binding(4) var normal: texture_2d<f32>;
@group(0) @binding(5) var emission: texture_2d<f32>;
@group(0) @binding(6) var f0: texture_2d<f32>;
@group(0) @binding(7) var cardDepth: texture_depth_2d;
@group(0) @binding(8) var<uniform> settings: vec4u;
${CARD_LOOKUP_WGSL}
@compute @workgroup_size(64) fn main(@builtin(global_invocation_id) gid: vec3u){
 if(gid.x<arrayLength(&hits)){output[gid.x]=lookupSdfCard(hits[gid.x],settings.x,settings.y);}
}
`;
function packCardLookupProjections(cache, sources, expected) {
  const projectionBytes = new Uint8Array(
    Math.max(
      1,
      cache.entries.reduce((n, e) => n + e.projections.length, 0)
    ) * 80
  ), view = new DataView(projectionBytes.buffer);
  let count = 0;
  for (const entry of cache.entries) {
    const source = expected.find((s) => s.instance.instanceId === entry.instanceId);
    const current = sources.find((s) => s.instanceId === entry.instanceId);
    const valid = source !== void 0 && current?.key === entry.geometryKey && ("captureKey" in source ? source.captureKey : surfaceCardKey(source)) === entry.captureKey;
    for (const p of entry.projections) {
      projectionBytes.set(packCardProjection(p), count * 80);
      view.setUint32(count * 80 + 64, entry.instanceId, true);
      view.setUint32(count * 80 + 68, valid ? 1 : 0, true);
      count++;
    }
  }
  return { bytes: projectionBytes, count };
}
async function createSdfCardLookup(device, compile, query, cache, expected) {
  if (cache.kind !== "cards")
    return rayReferenceFailure("card lookup requires an offline card layout");
  const { bytes: projectionBytes, count } = packCardLookupProjections(
    cache,
    query.sources,
    expected
  );
  const owned = [];
  const dispose = () => {
    for (const b of owned) device.destroyBuffer(b);
    owned.length = 0;
  };
  const fail = (r) => {
    dispose();
    return r;
  };
  const make = (name, bytes2, uniform = false) => {
    const b = device.createBuffer({
      label: `cards.${name}`,
      size: bytes2.byteLength,
      usage: (uniform ? 64 : 128) | 12
    });
    if (!b.ok) return b;
    owned.push(b.value);
    const w = device.queue.writeBuffer(b.value, 0, bytes2);
    return w.ok ? b : w;
  };
  const projections = make("lookup-projections", projectionBytes), output = make("lookup", new Uint8Array(query.rayCount * CARD_LOOKUP_STRIDE)), settings = make(
    "lookup-settings",
    new Uint8Array(new Uint32Array([count, cache.resolution, 0, 0]).buffer),
    true
  );
  if (!projections.ok) return fail(projections);
  if (!output.ok) return fail(output);
  if (!settings.ok) return fail(settings);
  const views = [];
  for (const name of CARD_TEXTURES) {
    const v = device.createTextureView(cache.textures[name], {});
    if (!v.ok) return fail(v);
    views.push(v.value);
  }
  const layout = device.createBindGroupLayout({
    entries: [0, 1, 2, 3, 4, 5, 6, 7, 8].map((binding) => ({
      binding,
      visibility: 4,
      ...binding === 7 ? { texture: { sampleType: "depth" } } : binding >= 3 && binding <= 6 ? { texture: { sampleType: "unfilterable-float" } } : {
        buffer: {
          type: binding === 8 ? "uniform" : binding === 2 ? "storage" : "read-only-storage"
        }
      }
    }))
  });
  if (!layout.ok) return fail(layout);
  const group = device.createBindGroup({
    layout: layout.value,
    entries: [
      ...[query.buffers.hits, projections.value, output.value].map((buffer, binding) => ({
        binding,
        resource: { kind: "buffer", value: { buffer } }
      })),
      ...views.map((value, i) => ({
        binding: 3 + i,
        resource: { kind: "textureView", value }
      })),
      { binding: 8, resource: { kind: "buffer", value: { buffer: settings.value } } }
    ]
  });
  if (!group.ok) return fail(group);
  const pipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [layout.value] });
  if (!pipelineLayout.ok) return fail(pipelineLayout);
  const shader = await compile(device, { code: WGSL, label: "cards.lookup" });
  if (!shader.ok) return fail(shader);
  const pipeline = device.createComputePipeline({
    layout: pipelineLayout.value,
    compute: { module: shader.value, entryPoint: "main" }
  });
  if (!pipeline.ok) return fail(pipeline);
  let disposed = false;
  return ok10({
    buffer: output.value,
    record(encoder) {
      if (disposed) return rayReferenceFailure("card lookup is disposed");
      const p = encoder.beginComputePass({ label: "cards.lookup" });
      p.setPipeline(pipeline.value);
      p.setBindGroup(0, group.value);
      p.dispatchWorkgroups(Math.ceil(query.rayCount / 64));
      p.end();
      return ok10(void 0);
    },
    dispose() {
      if (!disposed) {
        disposed = true;
        dispose();
      }
    }
  });
}

// sdk/engine/node_modules/@forgeax/engine-render/src/raytracing/global-card-lookup.ts
import { RhiError } from "@forgeax/engine-rhi";
import { err as err5, ok as ok11 } from "@forgeax/engine-types";
var GLOBAL_CARD_CANDIDATE_STRIDE = 32;
var GlobalCardCandidateFlags = { missingField: 1, overflow: 2, invalidNormal: 4 };
var GLOBAL_CARD_CANDIDATES_WGSL = `
struct ObjectBounds { lo: vec4f, hi: vec4f, scale: vec4f }
struct Candidates { state: vec4u, ids: vec4u }
fn findCandidates(hit: SdfHit) -> Candidates {
 var out=Candidates(vec4u(0,0,hit.state.x,0),vec4u(0xffffffffu));
 if(hit.state.x!=${GlobalSdfQueryStatus.hit}u){return out;}
 if(dot(hit.normal.xyz,hit.normal.xyz)<0.5){out.state.y=${GlobalCardCandidateFlags.invalidNormal}u;return out;}
 let halfSpacing=grid.originSpacing.w*0.5;
 let world=hit.position.xyz+hit.normal.xyz*halfSpacing;
 // Association support only: this radius is not a bound on geometric error.
 let radius=3.0*halfSpacing;
 var distances=vec4f(3.402823466e+38);
 for(var i=0u;i<grid.dimensionsCount.w;i++){
  let m=instances[i];if(m.ids.w==0u){continue;}
  let b=bounds[i];let p=(m.inverse*vec4f(world,1)).xyz;
  let toBox=max(b.lo.xyz-p,p-b.hi.xyz)*b.scale.xyz;
  let boxDistance=length(max(toBox,vec3f(0)))+min(0.0,max(toBox.x,max(toBox.y,toBox.z)));
  if(boxDistance>=radius){continue;}
  if(m.field.x==0xffffffffu){out.state.y|=${GlobalCardCandidateFlags.missingField}u;continue;}
  let distance=max(sdfValue(m,clamp(p,b.lo.xyz,b.hi.xyz))*b.scale.w+max(boxDistance,0.0),boxDistance);
  if(abs(distance)>=radius){continue;}
  out.state.w++;
  // Signed-distance ordering with stable instance-ID ties, independent of roster order.
  var slot=4u;
  for(var k=0u;k<4u;k++){
   if(distance<distances[k]||(distance==distances[k]&&m.ids.x<out.ids[k])){slot=k;break;}
  }
  if(slot<4u){
   for(var k=3u;k>slot;k--){distances[k]=distances[k-1u];out.ids[k]=out.ids[k-1u];}
   distances[slot]=distance;out.ids[slot]=m.ids.x;
  }
 }
 out.state.x=min(out.state.w,4u);
 if(out.state.w>4u){out.state.y|=${GlobalCardCandidateFlags.overflow}u;}
 return out;
}
`;
var GLOBAL_SDF_CARD_LOOKUP_WGSL = `
${SDF_SAMPLE_WGSL}
struct Grid { originSpacing: vec4f, dimensionsCount: vec4u, ranges: vec4f }
@group(0) @binding(0) var<storage,read> hits: array<SdfHit>;
@group(0) @binding(1) var<storage,read> instances: array<Instance>;
@group(0) @binding(2) var<storage,read> fields: array<u32>;
@group(0) @binding(3) var<storage,read> bounds: array<ObjectBounds>;
@group(0) @binding(4) var<uniform> grid: Grid;
@group(0) @binding(5) var<storage,read_write> candidates: array<Candidates>;
@group(0) @binding(6) var<storage,read> cards: array<Card>;
@group(0) @binding(7) var<storage,read_write> output: array<Lookup>;
@group(0) @binding(8) var<uniform> settings: vec4u;
@group(0) @binding(9) var albedo: texture_2d<f32>;
@group(0) @binding(10) var normal: texture_2d<f32>;
@group(0) @binding(11) var emission: texture_2d<f32>;
@group(0) @binding(12) var f0: texture_2d<f32>;
@group(0) @binding(13) var cardDepth: texture_depth_2d;
${CARD_LOOKUP_WGSL}
${GLOBAL_CARD_CANDIDATES_WGSL}
@compute @workgroup_size(64) fn selectCandidates(@builtin(global_invocation_id) gid:vec3u){
 if(gid.x<arrayLength(&hits)){candidates[gid.x]=findCandidates(hits[gid.x]);}
}
@compute @workgroup_size(64) fn sampleCards(@builtin(global_invocation_id) gid:vec3u){
 if(gid.x>=arrayLength(&hits)){return;}
 let hit=hits[gid.x];let c=candidates[gid.x];
 for(var k=0u;k<4u;k++){
  var sample=Lookup(vec4u(${CardLookupStatus.notSurface}u,hit.state.x,0xffffffffu,c.ids[k]),vec4f(0),vec4f(0),vec4f(0),vec4f(0),vec4u(0xffffffffu),vec4f(0));
  if(hit.state.x==${GlobalSdfQueryStatus.hit}u){sample.state.x=${CardLookupStatus.unmapped}u;}
  if(k<c.state.x&&c.state.y==0u){
   // UE offsets the object-grid query; its executed Card lookup uses the original hit position.
   sample=lookupCardPoint(hit.position.xyz,hit.normal.xyz,c.ids[k],grid.originSpacing.w*1.5,hit.state.x,settings.x,settings.y);
  }
  output[gid.x*4u+k]=sample;
 }
}
`;
async function createGlobalSdfCardLookup(device, compile, composition, query, cache, expected) {
  if (cache.kind !== "cards")
    return rayReferenceFailure("global Card lookup requires an offline card layout");
  if (query.buffers.voxels !== composition.buffers.voxels || query.buffers.grid !== composition.buffers.settings)
    return rayReferenceFailure(
      "global Card lookup requires the composition that produced the query"
    );
  const { bytes: bytes2, count } = packCardLookupProjections(
    cache,
    composition.sources.map((s) => ({ instanceId: s.instanceId, key: s.geometryKey })),
    expected
  );
  const owned = [];
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    for (const b of owned) device.destroyBuffer(b);
    owned.length = 0;
  };
  const fail = (r) => {
    dispose();
    return r;
  };
  const make = (name, data, uniform = false) => {
    const b = device.createBuffer({
      label: `global-sdf.cards.${name}`,
      size: data.byteLength,
      usage: (uniform ? 64 : 128) | 12
    });
    if (!b.ok) return b;
    owned.push(b.value);
    const w = device.queue.writeBuffer(b.value, 0, data);
    return w.ok ? b : w;
  };
  const projections = make("projections", bytes2);
  if (!projections.ok) return fail(projections);
  const candidates = make(
    "candidates",
    new Uint8Array(query.rayCount * GLOBAL_CARD_CANDIDATE_STRIDE)
  );
  if (!candidates.ok) return fail(candidates);
  const output = make("samples", new Uint8Array(query.rayCount * 4 * CARD_LOOKUP_STRIDE));
  if (!output.ok) return fail(output);
  const settings = make(
    "settings",
    new Uint8Array(new Uint32Array([count, cache.resolution, 0, 0]).buffer),
    true
  );
  if (!settings.ok) return fail(settings);
  const textures = {};
  for (const name of CARD_TEXTURES) {
    const view = device.createTextureView(cache.textures[name], {});
    if (!view.ok) return fail(view);
    textures[name] = view.value;
  }
  const rayCount = query.rayCount;
  const rows = Math.max(1, composition.sources.length);
  const input = {
    hits: { buffer: query.buffers.hits, size: rayCount * GLOBAL_SDF_HIT_STRIDE },
    instances: { buffer: composition.buffers.instances, size: rows * SDF_INSTANCE_STRIDE },
    fields: { buffer: composition.buffers.fields },
    bounds: { buffer: composition.buffers.bounds, size: rows * 48 },
    grid: { buffer: composition.buffers.settings, size: 48 },
    candidates: { buffer: candidates.value, size: rayCount * GLOBAL_CARD_CANDIDATE_STRIDE },
    cards: { buffer: projections.value, size: bytes2.byteLength },
    output: { buffer: output.value, size: rayCount * 4 * CARD_LOOKUP_STRIDE },
    settings: { buffer: settings.value, size: 16 },
    textures
  };
  const shader = await compile(device, {
    code: GLOBAL_SDF_CARD_LOOKUP_WGSL,
    label: "global-sdf.cards"
  });
  if (!shader.ok) return fail(shader);
  const recorder = createGlobalSdfCardLookupRecorder(device, shader.value);
  if (!recorder.ok) return fail(recorder);
  return ok11({
    buffer: output.value,
    candidateBuffer: candidates.value,
    dispose,
    record(encoder) {
      if (disposed) return rayReferenceFailure("global Card lookup is disposed");
      for (const stage of CARD_STAGES) {
        const pass = encoder.beginComputePass({ label: `global-sdf.cards.${stage}` });
        try {
          const result = recorder.value.record(pass, input, rayCount, stage);
          if (!result.ok) return result;
        } finally {
          pass.end();
        }
      }
      return ok11(void 0);
    }
  });
}
var CARD_STAGES = ["selectCandidates", "sampleCards"];
var CARD_BUFFER_BINDINGS = [
  ["hits", GLOBAL_SDF_HIT_STRIDE, "read-only-storage"],
  ["instances", SDF_INSTANCE_STRIDE, "read-only-storage"],
  ["fields", 4, "read-only-storage"],
  ["bounds", 48, "read-only-storage"],
  ["grid", 48, "uniform"],
  ["candidates", GLOBAL_CARD_CANDIDATE_STRIDE, "storage"],
  ["cards", 80, "read-only-storage"],
  ["output", CARD_LOOKUP_STRIDE, "storage"],
  ["settings", 16, "uniform"]
];
function createGlobalSdfCardLookupRecorder(device, module) {
  const failure4 = (expected, code = "rhi-descriptor-invalid") => err5(
    new RhiError({
      code,
      expected,
      hint: "Supply supported limits and producer-validated Global query, composition and Card bindings."
    })
  );
  if (!device.caps.compute || !device.caps.storageBuffer)
    return failure4(
      "compute and storage-buffer support for Global Card lookup",
      "rhi-not-available"
    );
  for (const [name, required] of [
    ["maxBindGroups", 1],
    ["maxBindingsPerBindGroup", 14],
    ["maxStorageBuffersPerShaderStage", 7],
    ["maxUniformBuffersPerShaderStage", 2],
    ["maxSampledTexturesPerShaderStage", 5],
    ["maxUniformBufferBindingSize", 48],
    ["maxComputeWorkgroupSizeX", 64],
    ["maxComputeInvocationsPerWorkgroup", 64]
  ])
    if (!(device.limits[name] >= required))
      return failure4(`Global Card lookup requires ${name} >= ${required}`, "limit-exceeded");
  const layout = device.createBindGroupLayout({
    entries: [
      ...CARD_BUFFER_BINDINGS.map(([, minBindingSize, type], binding) => ({
        binding,
        visibility: 4,
        buffer: { type, minBindingSize }
      })),
      ...CARD_TEXTURES.map((name, i) => ({
        binding: CARD_BUFFER_BINDINGS.length + i,
        visibility: 4,
        texture: {
          sampleType: name === "depth" ? "depth" : "unfilterable-float"
        }
      }))
    ]
  });
  if (!layout.ok) return layout;
  const pipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [layout.value] });
  if (!pipelineLayout.ok) return pipelineLayout;
  const pipelines = {};
  for (const entryPoint of CARD_STAGES) {
    const pipeline = device.createComputePipeline({
      layout: pipelineLayout.value,
      compute: { module, entryPoint }
    });
    if (!pipeline.ok) return pipeline;
    pipelines[entryPoint] = pipeline.value;
  }
  return ok11({
    record(pass, input, rayCount, stage) {
      if (!Number.isSafeInteger(rayCount) || rayCount < 1 || rayCount > RAY_REFERENCE_LIMIT || !(Math.ceil(rayCount / 64) <= device.limits.maxComputeWorkgroupsPerDimension))
        return failure4(
          "Global Card ray count in 1..65536 within dispatch limits",
          "limit-exceeded"
        );
      const rows = input.instances.size / SDF_INSTANCE_STRIDE;
      if (!Number.isInteger(rows) || rows < 1 || rows > 1024 || input.bounds.size !== rows * 48 || input.grid.size !== 48 || input.settings.size !== 16 || input.hits.size !== rayCount * GLOBAL_SDF_HIT_STRIDE || input.candidates.size !== rayCount * GLOBAL_CARD_CANDIDATE_STRIDE || input.output.size !== rayCount * 4 * CARD_LOOKUP_STRIDE || !Number.isSafeInteger(input.cards.size) || input.cards.size < 80 || input.cards.size % 80 !== 0 || input.fields.size !== void 0 && (!Number.isSafeInteger(input.fields.size) || input.fields.size < 4 || input.fields.size % 4 !== 0))
        return failure4(
          "matching instance/bounds rows, u32 field words, Card projections and exact hit/candidate/sample/settings ranges"
        );
      for (const [name, , type] of CARD_BUFFER_BINDINGS) {
        const range = input[name], offset = range.offset ?? 0;
        const uniform = type === "uniform";
        if (!isBufferOffsetAligned(device.limits, offset, uniform))
          return failure4(`device-aligned nonnegative ${name} offset`);
        if (!(offset < device.limits.maxBufferSize) || !isBufferRangeWithinLimits(device.limits, range, uniform))
          return failure4(`${name} range within device buffer limits`, "limit-exceeded");
      }
      for (const output of ["candidates", "output"])
        if (CARD_BUFFER_BINDINGS.some(
          ([name]) => name !== output && input[name].buffer === input[output].buffer
        ))
          return failure4("Global Card candidate/sample outputs must not alias another binding");
      const group = device.createBindGroup({
        layout: layout.value,
        entries: [
          ...CARD_BUFFER_BINDINGS.map(([name], binding) => ({
            binding,
            resource: { kind: "buffer", value: input[name] }
          })),
          ...CARD_TEXTURES.map((name, i) => ({
            binding: CARD_BUFFER_BINDINGS.length + i,
            resource: { kind: "textureView", value: input.textures[name] }
          }))
        ]
      });
      if (!group.ok) return group;
      pass.setPipeline(pipelines[stage]);
      pass.setBindGroup(0, group.value);
      pass.dispatchWorkgroups(Math.ceil(rayCount / 64));
      return ok11(void 0);
    }
  });
}

// sdk/engine/node_modules/@forgeax/engine-render/src/raytracing/path-source.ts
function packInitialPathRays(rays, seed) {
  const bytes2 = new Uint8Array(rays.length * 80);
  const floats = new Float32Array(bytes2.buffer), words = new Uint32Array(bytes2.buffer);
  rays.forEach((ray, i) => {
    const base = i * 20;
    floats.set([...ray.origin, ray.coneWidth, ...ray.direction, ray.coneSpread, 1, 1, 1, 0], base);
    words.set([Number(ray.active), 0, seed, 0], base + 16);
  });
  return bytes2;
}
var INITIAL_PATH_RAYS_WGSL = `
@group(0) @binding(0) var<storage, read> seeds: array<vec4u>;
@group(0) @binding(1) var<storage, read_write> paths: array<vec4u>;
@group(0) @binding(2) var<storage, read_write> accumulation: array<vec4u>;
@compute @workgroup_size(64) fn generateInitialRays(@builtin(global_invocation_id) id: vec3u) {
  let base = id.x * 5u;
  if (base >= arrayLength(&paths)) { return; }
  for (var i = 0u; i < 5u; i++) { paths[base + i] = seeds[base + i]; }
  paths[base + 4u].z = ((id.x + 1u) * 2654435761u) ^ ((accumulation[base].w + 1u) * 2246822519u) ^ seeds[base + 4u].z;
  accumulation[base + 2u] = vec4u(0u);
  accumulation[base + 3u] = vec4u(0u, 0u, 0u, bitcast<u32>(-1.0));
  accumulation[base + 4u] = vec4u(0xffffffffu);
}
`;

// sdk/engine/node_modules/@forgeax/engine-render/src/raytracing/path-tracer.ts
import {
  admitRayMaterial as admitRayMaterial2,
  admitRayMaterialValues as admitRayMaterialValues2,
  rayMaterialContract as rayMaterialContract2,
  rayMaterialNeedsCoverage
} from "@forgeax/engine-shader";
import { err as err6, ok as ok12 } from "@forgeax/engine-types";
var RAY_COVERAGE_ROUNDS = 3;
var RAY_COVERAGE_HEADER = 32;
var RAY_COVERAGE_QUERY_STRIDE = 80;
function rayCoveragePoolCapacity(pixels) {
  return Math.max(1024, Math.ceil(pixels / 2));
}
var RAY_PATH_STRIDE = 80;
var RAY_ACCUMULATION_STRIDE = 80;
async function createRayPathTracer(device, compile, request) {
  const materials = [];
  for (const material of request.materials) {
    if (material.program.context !== "ray-hit")
      return rayReferenceFailure("path tracing requires a ray-hit material context");
    const admitted = admitRayMaterial2(material.asset, String(material.id));
    if (!admitted.ok) return admitted;
    if (rayMaterialContract2(material.asset) !== material.program.contract)
      return rayReferenceFailure("material contract changed; recook its ray program");
    materials.push({
      id: material.id,
      program: { source: material.program.wgsl, paramSchema: material.program.paramSchema },
      snapshot: referenceSurfaceMaterialSnapshot(material),
      evaluateCoverage: rayMaterialNeedsCoverage(material.asset),
      resolveTexture: (parameter) => {
        const value = materialTextureValue(material.asset.values?.[parameter]);
        return value && request.resolveTexture ? request.resolveTexture(value) : rayReferenceFailure(`missing texture binding ${parameter}`);
      }
    });
  }
  return createRayPathTransport(device, compile, { ...request, materials });
}
async function createSubmittedRayPathTracer(device, compile, request) {
  const current = () => request.generationFence.currentGeneration() === request.generationFence.capturedGeneration;
  const stale = () => err6({
    code: "ray-reference-stale",
    expected: "the accepted scene, material and device generation still owns this preparation",
    hint: "Release borrowed texture leases and prepare the current accepted snapshot; do not submit this candidate.",
    detail: { cause: "the candidate owner changed while preparing submitted ray transport" }
  });
  if (!current()) return stale();
  const materials = [];
  for (const { id, snapshot } of request.materials) {
    const ray = snapshot.materialSurfacePrograms?.["ray-hit"];
    if (ray === void 0) return rayReferenceFailure(`material ${id} has no accepted ray program`);
    const shader = request.shaders.findMaterialArtifact(ray.programKey);
    if (!shader.ok) return shader;
    const values = {
      ...Object.fromEntries(
        shader.value.paramSchema.map((parameter) => [
          parameter.name,
          "default" in parameter ? parameter.default : void 0
        ])
      ),
      ...snapshot.paramSnapshot
    };
    const admitted = admitRayMaterialValues2(values, String(id), ray.programKey);
    if (!admitted.ok) return admitted;
    if (snapshot.renderState?.blend !== void 0 || snapshot.surfaceModel === "single-layer-medium")
      return rayReferenceFailure(`material ${id} requires unsupported scattering`);
    materials.push({
      id,
      program: shader.value,
      snapshot,
      evaluateCoverage: ray.evaluateCoverage,
      resolveTexture: (parameter) => request.resolveTexture ? request.resolveTexture(id, parameter) : rayReferenceFailure(`missing texture binding ${parameter}`)
    });
  }
  const prepared = await createRayPathTransport(device, compile, { ...request, materials });
  if (!prepared.ok) return prepared;
  if (!current()) {
    prepared.value.dispose();
    return stale();
  }
  return prepared;
}
async function createRayPathTransport(device, compile, request) {
  const settings = packSettings(request.settings);
  if (!settings.ok) return settings;
  const lights = packLights(request.lights);
  if (!lights.ok) return lights;
  const pixels = request.settings.width * request.settings.height;
  const usesLut = request.materials.some(
    (material) => materialUsesDirectDfgLut(material.program.paramSchema)
  );
  const kernelSource = usesLut ? request.kernelLut : request.kernel;
  if (kernelSource === void 0)
    return rayReferenceFailure(
      "LUT material requires the cooked DIRECT_DFG_LUT_AVAILABLE path kernel"
    );
  const maxBounces = request.settings.maxBounces;
  if (request.materials.length > 32 || new Set(request.materials.map((m) => m.id)).size !== request.materials.length || request.materials.some((m) => !Number.isInteger(m.id) || m.id < 0 || m.id > 4294967295))
    return rayReferenceFailure("expected at most 32 distinct u32 material IDs", true);
  const masked = new Set(
    request.materials.filter((material) => material.evaluateCoverage).map((material) => material.id)
  );
  const hasCoverage = masked.size > 0;
  new Float32Array(settings.value.buffer)[7] = hasCoverage ? 1 : 0;
  new Float32Array(settings.value.buffer)[11] = request.lights.length;
  const triangles = request.scene.triangles.slice();
  const triangleView = new DataView(triangles.buffer);
  const materialById = new Map(request.materials.map((m) => [m.id, m]));
  for (let i = 0; i < request.scene.triangleCount; i++) {
    const material = materialById.get(triangleView.getUint32(i * 80 + 60, true));
    if (!material) return rayReferenceFailure("triangle references an absent material");
    const instance = triangleView.getUint32(i * 80 + 48, true);
    const coordinates = material.snapshot.textureCoordinates;
    for (const entry of material.program.paramSchema.filter((p) => p.type === "texture2d")) {
      if (entry.name === "normalTexture" && !request.scene.instanceAttributes.get(instance)?.tangentFrame)
        return rayReferenceFailure(
          `instance ${instance} normal texture requires authored normals and tangents`
        );
      const set = coordinates?.get(entry.name)?.set ?? 0;
      if (set >= (request.scene.instanceAttributes.get(instance)?.uvCount ?? 0))
        return rayReferenceFailure(`instance ${instance} is missing material UV set ${set}`);
    }
    const cull = material.snapshot.renderState?.cullMode ?? "back";
    const winding = new DataView(
      request.scene.attributes.buffer,
      request.scene.attributes.byteOffset
    ).getFloat32(i * RAY_ATTRIBUTE_TRIANGLE_STRIDE + 108, true);
    const side = request.faces === "both" ? 0 : cull === "back" ? 1 : cull === "front" ? 2 : 0;
    triangleView.setUint32(i * 80 + 68, winding < 0 && side !== 0 ? 3 - side : side, true);
    triangleView.setUint32(i * 80 + 72, masked.has(material.id) ? 1 : 0, true);
  }
  const descriptors = /* @__PURE__ */ new Map();
  const lutScope = usesLut ? request.deviceScope ?? DeviceScope.create(0, "ray-path") : void 0;
  const ownedScope = request.deviceScope === void 0 ? lutScope : void 0;
  const dispose = () => {
    for (const buffer of descriptors.keys()) device.destroyBuffer(buffer);
    descriptors.clear();
    ownedScope?.dispose();
  };
  const lut = lutScope === void 0 ? void 0 : getOrCreateDirectDfgLut(device, lutScope);
  if (lut !== void 0 && !lut.ok) {
    dispose();
    return lut;
  }
  const directDfgLut = lut?.value;
  const make = (label, bytes2, uniform = false) => {
    const buffer = device.createBuffer({
      label: `ray-path.${label}`,
      size: bytes2.byteLength,
      usage: (uniform ? 64 : 128) | 12
    });
    if (!buffer.ok) return buffer;
    descriptors.set(buffer.value, {
      label,
      size: bytes2.byteLength,
      usage: (uniform ? 64 : 128) | 12
    });
    const wrote = device.queue.writeBuffer(buffer.value, 0, bytes2);
    return wrote.ok ? buffer : wrote;
  };
  const poolBase = Math.ceil(pixels / 8) * 8;
  const poolCapacity = hasCoverage ? rayCoveragePoolCapacity(pixels) : 0;
  const materialSlots = hasCoverage ? poolBase + poolCapacity : pixels;
  const coverageHeader = new Uint8Array(
    RAY_COVERAGE_HEADER + (hasCoverage ? pixels : 1) * RAY_COVERAGE_QUERY_STRIDE
  );
  new Uint32Array(coverageHeader.buffer, 0, 8).set([0, 0, 0, 0, 0, poolCapacity, poolBase, 0]);
  const lightUniform = new Uint8Array(32 * 64);
  lightUniform.set(lights.value);
  const data = {
    triangles,
    nodes: request.scene.nodes,
    attributes: request.scene.attributes,
    paths: new Uint8Array(pixels * RAY_PATH_STRIDE),
    inputs: new Uint8Array(materialSlots * RAY_MATERIAL_INPUT_STRIDE),
    surfaces: new Uint8Array(materialSlots * RAY_MATERIAL_SURFACE_STRIDE),
    accumulation: new Uint8Array(pixels * RAY_ACCUMULATION_STRIDE),
    lights: lightUniform,
    settings: settings.value,
    coverage: coverageHeader
  };
  const buffers = {};
  for (const key of Object.keys(data)) {
    const result = make(key, data[key], key === "settings" || key === "lights");
    if (!result.ok) {
      dispose();
      return result;
    }
    buffers[key] = result.value;
  }
  const initialRays = request.settings.rays === void 0 ? void 0 : packInitialPathRays(request.settings.rays, request.settings.seed);
  let initialRayBuffer = request.settings.rayBuffer;
  const module = await compile(device, { code: kernelSource, label: "ray-path.kernel" });
  if (!module.ok) {
    dispose();
    return module;
  }
  const kernelEntries = Object.keys(data).map((_, binding) => ({
    binding,
    visibility: 4,
    buffer: {
      type: binding === 8 || binding === 7 ? "uniform" : [0, 1, 2].includes(binding) ? "read-only-storage" : "storage"
    }
  }));
  const kernelLayout = device.createBindGroupLayout({
    entries: [
      ...kernelEntries,
      ...directDfgLut === void 0 ? [] : [
        {
          binding: 10,
          visibility: 4,
          texture: { sampleType: "float", viewDimension: "2d" }
        },
        { binding: 11, visibility: 4, sampler: { type: "filtering" } }
      ]
    ]
  });
  if (!kernelLayout.ok) {
    dispose();
    return kernelLayout;
  }
  const kernelPipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [kernelLayout.value]
  });
  if (!kernelPipelineLayout.ok) {
    dispose();
    return kernelPipelineLayout;
  }
  const kernelBindings = device.createBindGroup({
    layout: kernelLayout.value,
    entries: [
      ...Object.values(buffers).map((buffer, binding) => ({
        binding,
        resource: { kind: "buffer", value: { buffer } }
      })),
      ...directDfgLut === void 0 ? [] : [
        { binding: 10, resource: { kind: "textureView", value: directDfgLut.view } },
        { binding: 11, resource: { kind: "sampler", value: directDfgLut.sampler } }
      ]
    ]
  });
  if (!kernelBindings.ok) {
    dispose();
    return kernelBindings;
  }
  const names = [
    "generate",
    "trace",
    "shade",
    "accumulate",
    "beginCoverage",
    "gather",
    "resolve",
    "sealCoverage",
    "beginShadow",
    "gatherShadow",
    "resolveShadow",
    "endShadow"
  ];
  const producers = ["armMaterials", "armRound"];
  const indirect = device.caps.indirectDrawing;
  const argsUsage = 128 | (indirect ? 256 : 0);
  const args = hasCoverage ? device.createBuffer({ label: "ray-path.dispatch-args", size: 24, usage: argsUsage }) : void 0;
  if (args !== void 0) {
    if (!args.ok) {
      dispose();
      return args;
    }
    descriptors.set(args.value, { label: "dispatch-args", size: 24, usage: argsUsage });
  }
  const argsBuffer = args?.ok ? args.value : void 0;
  const argsLayout = device.createBindGroupLayout({
    entries: [{ binding: 0, visibility: 4, buffer: { type: "storage" } }]
  });
  if (!argsLayout.ok) {
    dispose();
    return argsLayout;
  }
  const coverageLayout = device.createBindGroupLayout({
    entries: [{ binding: 9, visibility: 4, buffer: { type: "storage" } }]
  });
  if (!coverageLayout.ok) {
    dispose();
    return coverageLayout;
  }
  const producerLayout = device.createPipelineLayout({
    bindGroupLayouts: [coverageLayout.value, argsLayout.value]
  });
  if (!producerLayout.ok) {
    dispose();
    return producerLayout;
  }
  const pipelines = {};
  for (const name of [...names, ...hasCoverage ? producers : []]) {
    const result = device.createComputePipeline({
      label: `ray-path.${name}`,
      layout: producers.includes(name) ? producerLayout.value : kernelPipelineLayout.value,
      compute: { module: module.value, entryPoint: name }
    });
    if (!result.ok) {
      dispose();
      return result;
    }
    pipelines[name] = result.value;
  }
  let argsBindings;
  if (argsBuffer !== void 0) {
    const header = device.createBindGroup({
      layout: coverageLayout.value,
      entries: [{ binding: 9, resource: { kind: "buffer", value: { buffer: buffers.coverage } } }]
    });
    if (!header.ok) {
      dispose();
      return header;
    }
    const group = device.createBindGroup({
      layout: argsLayout.value,
      entries: [{ binding: 0, resource: { kind: "buffer", value: { buffer: argsBuffer } } }]
    });
    if (!group.ok) {
      dispose();
      return group;
    }
    argsBindings = [header.value, group.value];
  }
  const pixelGroups = Math.ceil(pixels / 64);
  const kernelResources = Object.values(buffers).map((buffer, binding) => ({
    buffer,
    usage: kernelEntries[binding]?.buffer.type === "uniform" ? "uniform-read" : kernelEntries[binding]?.buffer.type === "read-only-storage" ? "storage-read" : "storage-read-write"
  }));
  let generation = {
    pipeline: pipelines.generate,
    bindings: [kernelBindings.value],
    label: "ray-path.generate",
    buffers: kernelResources,
    textures: directDfgLut === void 0 ? [] : [directDfgLut.view],
    workgroups: pixelGroups
  };
  if (initialRays !== void 0) {
    const seeds = make("initial-rays", initialRays);
    if (!seeds.ok) {
      dispose();
      return seeds;
    }
    initialRayBuffer = seeds.value;
  }
  if (initialRayBuffer !== void 0) {
    const layout = device.createBindGroupLayout({
      entries: [0, 1, 2].map((binding) => ({
        binding,
        visibility: 4,
        buffer: { type: binding === 0 ? "read-only-storage" : "storage" }
      }))
    });
    if (!layout.ok) {
      dispose();
      return layout;
    }
    const group = device.createBindGroup({
      layout: layout.value,
      entries: [initialRayBuffer, buffers.paths, buffers.accumulation].map((buffer, binding) => ({
        binding,
        resource: { kind: "buffer", value: { buffer, size: pixels * RAY_PATH_STRIDE } }
      }))
    });
    if (!group.ok) {
      dispose();
      return group;
    }
    const pipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [layout.value] });
    if (!pipelineLayout.ok) {
      dispose();
      return pipelineLayout;
    }
    const shader = await compile(device, {
      code: INITIAL_PATH_RAYS_WGSL,
      label: "ray-path.initial-rays"
    });
    if (!shader.ok) {
      dispose();
      return shader;
    }
    const pipeline = device.createComputePipeline({
      layout: pipelineLayout.value,
      compute: { module: shader.value, entryPoint: "generateInitialRays" }
    });
    if (!pipeline.ok) {
      dispose();
      return pipeline;
    }
    generation = {
      pipeline: pipeline.value,
      bindings: [group.value],
      label: "ray-path.initial-rays",
      buffers: [
        { buffer: initialRayBuffer, usage: "storage-read" },
        { buffer: buffers.paths, usage: "storage-read-write" },
        { buffer: buffers.accumulation, usage: "storage-read-write" }
      ],
      textures: [],
      workgroups: pixelGroups
    };
  }
  const materialLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: 4, buffer: { type: "read-only-storage" } },
      { binding: 1, visibility: 4, buffer: { type: "storage" } },
      { binding: 2, visibility: 4, buffer: { type: "uniform" } }
    ]
  });
  if (!materialLayout.ok) {
    dispose();
    return materialLayout;
  }
  const materialWork = [];
  for (const m of request.materials) {
    const materialBindings = createSurfaceMaterialBindings(
      device,
      m.program.paramSchema,
      m.snapshot,
      4,
      m.resolveTexture
    );
    if (!materialBindings.ok) {
      dispose();
      return materialBindings;
    }
    descriptors.set(materialBindings.value.uniform, {
      label: `material-${m.id}.uniform`,
      size: materialBindings.value.bytes,
      usage: 72
    });
    const selector = make(
      `material-selector-${m.id}`,
      new Uint8Array(new Uint32Array([m.id, 0, 0, 0]).buffer),
      true
    );
    if (!selector.ok) {
      dispose();
      return selector;
    }
    const slotBindings = (first, count) => device.createBindGroup({
      layout: materialLayout.value,
      entries: [
        { buffer: buffers.inputs, stride: RAY_MATERIAL_INPUT_STRIDE },
        { buffer: buffers.surfaces, stride: RAY_MATERIAL_SURFACE_STRIDE },
        { buffer: selector.value, stride: 0 }
      ].map(({ buffer, stride }, binding) => ({
        binding,
        resource: {
          kind: "buffer",
          value: stride === 0 ? { buffer } : { buffer, offset: first * stride, size: count * stride }
        }
      }))
    });
    const workBindings = slotBindings(0, pixels);
    if (!workBindings.ok) {
      dispose();
      return workBindings;
    }
    const poolBindings = hasCoverage ? slotBindings(poolBase, poolCapacity) : workBindings;
    if (!poolBindings.ok) {
      dispose();
      return poolBindings;
    }
    const layout = device.createPipelineLayout({
      bindGroupLayouts: [materialLayout.value, materialBindings.value.layout]
    });
    if (!layout.ok) {
      dispose();
      return layout;
    }
    const shader = await compile(device, {
      code: m.program.source,
      label: `ray-path.material-${m.id}`
    });
    if (!shader.ok) {
      dispose();
      return shader;
    }
    const pipeline = device.createComputePipeline({
      label: `ray-path.material-${m.id}`,
      layout: layout.value,
      compute: { module: shader.value, entryPoint: "cs_surface" }
    });
    if (!pipeline.ok) {
      dispose();
      return pipeline;
    }
    const pixel = {
      label: `ray-path.material-${m.id}`,
      pipeline: pipeline.value,
      buffers: [
        { buffer: buffers.inputs, usage: "storage-read" },
        { buffer: buffers.surfaces, usage: "storage-read-write" },
        { buffer: selector.value, usage: "uniform-read" },
        { buffer: materialBindings.value.uniform, usage: "uniform-read" }
      ],
      textures: materialBindings.value.textureViews,
      bindings: [workBindings.value, materialBindings.value.group],
      workgroups: pixelGroups
    };
    materialWork.push({
      id: m.id,
      pixel,
      pool: {
        ...pixel,
        label: `ray-path.pool-material-${m.id}`,
        bindings: [poolBindings.value, materialBindings.value.group],
        workgroups: Math.ceil(poolCapacity / 64),
        ...argsBuffer !== void 0 && indirect ? {
          indirect: 0,
          buffers: [...pixel.buffers, { buffer: argsBuffer, usage: "indirect-read" }]
        } : {}
      }
    });
  }
  let disposed = false;
  const works = [];
  works.push(generation);
  const deferred = (work) => argsBuffer !== void 0 && indirect ? {
    ...work,
    workgroups: pixelGroups,
    indirect: 12,
    buffers: [...work.buffers, { buffer: argsBuffer, usage: "indirect-read" }]
  } : { ...work, workgroups: pixelGroups };
  for (let bounce = 0; bounce < maxBounces; bounce++) {
    const kernel = (name, round = 0) => ({
      label: `ray-path.${name}-${bounce}${round > 0 ? `-round-${round}` : ""}`,
      pipeline: pipelines[name],
      bindings: [kernelBindings.value],
      buffers: kernelResources,
      textures: directDfgLut === void 0 ? [] : [directDfgLut.view],
      workgroups: pixelGroups
    });
    const produce = (name) => {
      if (argsBuffer === void 0 || argsBindings === void 0)
        return rayReferenceFailure("coverage rounds require dispatch args").unwrap();
      return {
        label: `ray-path.${name}-${bounce}`,
        pipeline: pipelines[name],
        bindings: argsBindings,
        buffers: [
          { buffer: buffers.coverage, usage: "storage-read-write" },
          { buffer: argsBuffer, usage: "storage-read-write" }
        ],
        textures: [],
        workgroups: 1
      };
    };
    const rounds = (gather, resolve) => {
      for (let round = 0; round < RAY_COVERAGE_ROUNDS; round++) {
        const sized = (name) => round === 0 ? kernel(name) : deferred(kernel(name, round));
        works.push(sized(gather), produce("armMaterials"));
        for (const m of materialWork) if (masked.has(m.id)) works.push(m.pool);
        works.push(sized(resolve));
        if (round + 1 < RAY_COVERAGE_ROUNDS) works.push(produce("armRound"));
      }
    };
    if (!hasCoverage) {
      works.push(kernel("trace"), ...materialWork.map((m) => m.pixel), kernel("shade"));
      continue;
    }
    works.push(kernel("beginCoverage"));
    rounds("gather", "resolve");
    for (const m of materialWork) if (!masked.has(m.id)) works.push(m.pixel);
    works.push(kernel("sealCoverage"));
    for (let light = 0; light <= request.lights.length; light++) {
      works.push(kernel("beginShadow"));
      rounds("gatherShadow", "resolveShadow");
      works.push(kernel("endShadow"));
    }
    works.push(kernel("shade"));
  }
  works.push({
    label: "ray-path.accumulate",
    pipeline: pipelines.accumulate,
    bindings: [kernelBindings.value],
    buffers: kernelResources,
    textures: directDfgLut === void 0 ? [] : [directDfgLut.view],
    workgroups: pixelGroups
  });
  const batches = [];
  for (const work of works) {
    const last = batches[batches.length - 1];
    const merged = new Map(last?.usages);
    const compatible = last !== void 0 && work.buffers.every(({ buffer, usage }) => {
      const prior = merged.get(buffer);
      if (prior === void 0 || prior === usage) {
        merged.set(buffer, usage);
        return true;
      }
      if ([prior, usage].some((u) => u === "uniform-read" || u === "indirect-read")) return false;
      merged.set(buffer, "storage-read-write");
      return true;
    });
    if (compatible) {
      last.works.push(work);
      last.usages = merged;
    } else
      batches.push({
        works: [work],
        usages: new Map(work.buffers.map(({ buffer, usage }) => [buffer, usage]))
      });
  }
  const record = (pass, work) => {
    if (disposed) rayReferenceFailure("path tracer is disposed").unwrap();
    pass.setPipeline(work.pipeline);
    work.bindings.forEach((group, index) => {
      pass.setBindGroup(index, group);
    });
    if (work.indirect !== void 0 && argsBuffer !== void 0)
      pass.dispatchWorkgroupsIndirect(argsBuffer, work.indirect);
    else pass.dispatchWorkgroups(work.workgroups, 1, 1);
  };
  return ok12({
    buffers,
    pixelCount: pixels,
    dispatchCount: works.length,
    recordSample(encoder) {
      if (disposed) return rayReferenceFailure("path tracer is disposed");
      for (const [index, batch] of batches.entries()) {
        const pass = encoder.beginComputePass({ label: `ray-path.${index}.batch` });
        for (const work of batch.works) record(pass, work);
        pass.end();
      }
      return ok12(void 0);
    },
    addSampleToGraph(graph, input) {
      if (disposed) return rayReferenceFailure("path tracer is disposed");
      const graphBuffers = new Map(input.buffers);
      const graphTextures = new Map(input.textures);
      if (directDfgLut !== void 0 && !graphTextures.has(directDfgLut.view)) {
        const texture = graph.importTexture(
          `${input.label}.direct-dfg`,
          DIRECT_DFG_LUT_DESCRIPTOR,
          () => directDfgLut.texture
        );
        if (!texture.ok) return texture;
        const view = graph.importView(texture.value, { dimension: "2d" }, () => directDfgLut.view);
        if (!view.ok) return view;
        graphTextures.set(directDfgLut.view, view.value);
      }
      const required = (map, key) => {
        const value = map.get(key);
        if (value === void 0)
          return rayReferenceFailure("transport graph resource was not admitted").unwrap();
        return value;
      };
      for (const work of works) {
        for (const { buffer } of work.buffers) {
          if (!descriptors.has(buffer) && !graphBuffers.has(buffer))
            return rayReferenceFailure("borrowed ray buffer has no producer graph resource");
        }
        for (const view of work.textures) {
          if (!graphTextures.has(view))
            return rayReferenceFailure("material texture has no producer graph resource");
        }
      }
      for (const [buffer, descriptor] of descriptors) {
        if (graphBuffers.has(buffer)) continue;
        const imported = graph.importBuffer(
          `${input.label}.${descriptor.label}`,
          descriptor,
          () => buffer
        );
        if (!imported.ok) return imported;
        graphBuffers.set(buffer, imported.value);
      }
      const accumulation = required(graphBuffers, buffers.accumulation);
      if (input.reset) {
        const reset = graph.addCopyPass(`${input.label}.reset`, {
          accesses: [{ resource: accumulation, usage: "copy-dst" }],
          encode: ({ encoder, resources }) => {
            if (disposed) rayReferenceFailure("path tracer is disposed").unwrap();
            const resolved = resources.buffer(accumulation).unwrap();
            if (resolved !== buffers.accumulation)
              rayReferenceFailure("transport buffer generation changed").unwrap();
            encoder.clearBuffer(resolved);
          }
        });
        if (!reset.ok) return reset;
      }
      for (const [index, batch] of batches.entries()) {
        const textures = new Set(batch.works.flatMap((work) => work.textures));
        const accesses = [
          ...[...batch.usages].map(([buffer, usage]) => ({
            resource: required(graphBuffers, buffer),
            usage
          })),
          ...[...textures].map((view) => ({
            resource: required(graphTextures, view),
            usage: "sampled-read"
          }))
        ];
        const added = graph.addComputePass(`${input.label}.${index}.ray-path.batch`, {
          accesses,
          encode: ({ pass, resources }) => {
            for (const buffer of batch.usages.keys())
              if (resources.buffer(required(graphBuffers, buffer)).unwrap() !== buffer)
                rayReferenceFailure("transport buffer generation changed").unwrap();
            for (const view of textures)
              if (resources.textureView(required(graphTextures, view)).unwrap() !== view)
                rayReferenceFailure("transport texture generation changed").unwrap();
            for (const work of batch.works) record(pass, work);
          }
        });
        if (!added.ok) return added;
      }
      return ok12(accumulation);
    },
    reset(encoder) {
      if (disposed) return rayReferenceFailure("path tracer is disposed");
      encoder.clearBuffer(buffers.accumulation);
      return ok12(void 0);
    },
    dispose() {
      if (!disposed) {
        disposed = true;
        dispose();
      }
    }
  });
}

// sdk/engine/node_modules/@forgeax/engine-render/src/raytracing/irradiance-field.ts
import { ok as ok13 } from "@forgeax/engine-types";

// sdk/engine/node_modules/@forgeax/engine-render/src/raytracing/world-traversal.ts
import { RAY_QUERY_WGSL_ENABLE } from "@forgeax/engine-rhi";
var WORLD_TRAVERSAL_ROSTER = {
  "global-sdf": [
    [0, "read", "voxels"],
    [1, "uniform", "grid"],
    [2, "read", "instances"],
    [3, "read", "fields"],
    [4, "read", "bounds"]
  ],
  "ray-query": [
    [0, "tlas", "tlas"],
    [2, "read", "traversalInstances"],
    [3, "read", "faceNormals"]
  ]
};
var GLOBAL_SDF_TRAVERSAL_WGSL = `
${SDF_SAMPLE_WGSL}
${GLOBAL_SDF_SAMPLE_WGSL}
@group(0) @binding(0) var<storage,read> voxels: array<Voxel>;
@group(0) @binding(1) var<uniform> grid: Grid;
@group(0) @binding(2) var<storage,read> instances: array<Instance>;
@group(0) @binding(3) var<storage,read> fields: array<u32>;
@group(0) @binding(4) var<storage,read> bounds: array<ObjectBounds>;
${GLOBAL_SDF_TRACE_WGSL}
${GLOBAL_CARD_CANDIDATES_WGSL}
fn traceWorld(ray: Ray, maxSteps: u32, minStepFactor: f32) -> Hit { return traceGlobal(ray, maxSteps, minStepFactor); }
fn worldHitCandidates(hit: Hit) -> Candidates { return findCandidates(SdfHit(hit.state,hit.metrics,hit.position,hit.normal)); }
`;
var RAY_QUERY_TRAVERSAL_WGSL = `${RAY_QUERY_WGSL_ENABLE}
struct Ray { origin: vec3f, tMin: f32, direction: vec3f, tMax: f32, mask: vec4u }
struct Hit { state: vec4u, metrics: vec4f, position: vec4f, normal: vec4f }
struct Candidates { state: vec4u, ids: vec4u }
@group(0) @binding(0) var tlas: acceleration_structure;
@group(0) @binding(2) var<storage,read> traversalInstances: array<vec4u>;
@group(0) @binding(3) var<storage,read> faceNormals: array<vec4f>;
fn traceWorld(ray: Ray, maxSteps: u32, minStepFactor: f32) -> Hit {
 var result=Hit(vec4u(${GlobalSdfQueryStatus.miss}u,0u,0u,0xffffffffu),vec4f(ray.tMax,0,0,0),vec4f(ray.origin+ray.direction*ray.tMax,1),vec4f(0));
 if(ray.mask.x==0u){return result;}
 if(traversalInstances[0].x!=0u){result.state.x=${GlobalSdfQueryStatus.missingField}u;return result;}
 var query: ray_query;
 rayQueryInitialize(&query,tlas,RayDesc(0u,ray.mask.x&0xffu,ray.tMin,ray.tMax,ray.origin,ray.direction));
 while(rayQueryProceed(&query)){}
 let c=rayQueryGetCommittedIntersection(&query);
 result.state.z=1u;
 if(c.kind!=RAY_QUERY_INTERSECTION_TRIANGLE){return result;}
 let row=traversalInstances[c.instance_custom_data];
 let face=faceNormals[row.y+c.primitive_index];
 let local=face.xyz;
 let n=transpose(mat3x3f(c.world_to_object[0],c.world_to_object[1],c.world_to_object[2]))*local;
 result.state=vec4u(${GlobalSdfQueryStatus.hit}u,0u,1u,row.x);
 result.metrics=vec4f(c.t,0,0,1);
 result.position=vec4f(ray.origin+ray.direction*c.t,1);
 let normal=n/max(length(n),1e-20);
 // Exact coincident opposite windings cover both sides of the same plane.
 // A closest-hit tie must not turn that surface into an ordinary backface.
 result.normal=vec4f(select(normal,-normal,face.w!=0.0&&dot(ray.direction,normal)>0.0),0);
 return result;
}
fn worldHitCandidates(hit: Hit) -> Candidates {
 var out=Candidates(vec4u(0u,0u,hit.state.x,0u),vec4u(0xffffffffu));
 if(hit.state.x==${GlobalSdfQueryStatus.hit}u){out.state=vec4u(1u,0u,hit.state.x,1u);out.ids.x=hit.state.w;}
 return out;
}
`;
function worldTraversalWgsl(traversal) {
  switch (traversal) {
    case "global-sdf":
      return `${GLOBAL_SDF_TRAVERSAL_WGSL}
fn worldSurfaceOrigin(position: vec3f, normal: vec3f, fieldBias: f32) -> vec3f {
 return position + normal * fieldBias;
}
`;
    case "ray-query":
      return `${RAY_QUERY_TRAVERSAL_WGSL}
// Match ray-raster-source/ray-path-tracer exact receiver precision. A field
// voxel clearance can skip a nearby triangle and change the first surface.
fn worldSurfaceOrigin(position: vec3f, normal: vec3f, fieldBias: f32) -> vec3f {
 let bias = max(1e-4, max(max(abs(position.x), abs(position.y)), abs(position.z)) * 1e-5);
 return position + normal * bias;
}
`;
  }
}
var WORLD_CARD_RADIANCE_WGSL = `
${CARD_POINT_LOOKUP_WGSL}
fn worldCardRadiance(hit: Hit, projectionMargin: f32, pointSample: bool) -> vec4f {
 let candidates=worldHitCandidates(hit);
 if(candidates.state.y!=0u){return vec4f(0);}
 for(var k=0u;k<candidates.state.x;k++){
  let lookup=lookupCardPoint(hit.position.xyz,hit.normal.xyz,candidates.ids[k],projectionMargin,hit.state.x,settings.x,settings.y);
  if(lookup.state.x!=${CardLookupStatus.mapped}u){continue;}
  var radiance=vec3f(0);var nearest=0u;
  for(var t=0u;t<4u;t++){
   if(lookup.texels[t]==0xffffffffu){continue;}
   radiance+=cardLit[lookup.texels[t]].xyz*lookup.weights[t];
   if(lookup.weights[t]>lookup.weights[nearest]){nearest=t;}
  }
  if(pointSample){radiance=cardLit[lookup.texels[nearest]].xyz;}
  return vec4f(radiance,1.0);
 }
 if(settings.z!=0u){
  for(var c=0u;c<settings.x;c++){
   let card=cards[c];if(card.ids.y!=1u){continue;}
   for(var k=0u;k<candidates.state.x;k++){if(candidates.ids[k]==card.ids.x){return vec4f(0);}}
  }
  return vec4f(0,0,0,-1);
 }
 return vec4f(0);
}
`;

// sdk/engine/node_modules/@forgeax/engine-render/src/raytracing/irradiance-field.ts
var IRRADIANCE_FIELD_RAY_BYTES = 32;
var IRRADIANCE_FIELD_ORIGIN_BYTES = 32;
var IRRADIANCE_FIELD_SURFACE_BYTES = 64;
var IRRADIANCE_FIELD_FRAME_BYTES = 112;
var IRRADIANCE_FIELD_UNIFORM_BYTES = 256;
var IRRADIANCE_FIELD_PENDING_OFFSET = 56;
var IRRADIANCE_FIELD_LIGHTS_BYTES = 32 * 64;
var IrradianceFieldRayStatus = {
  miss: 0,
  hit: 1,
  backface: 2,
  skip: 3,
  unlit: 4
};
var IrradianceFieldProbeState = {
  untraced: 0,
  active: 1,
  inside: 2,
  relocated: 3
};
var IRRADIANCE_FIELD_RELOCATION = { clearance: 0.25, limit: 0.45, restart: 0.1 };
function packIrradianceFieldFrame(frame) {
  const bytes2 = new Uint8Array(IRRADIANCE_FIELD_FRAME_BYTES);
  const u = new Uint32Array(bytes2.buffer);
  const f = new Float32Array(bytes2.buffer);
  u.set([0, frame.probeBudget, frame.raysPerProbe, frame.frameIndex >>> 0], 0);
  u.set([frame.tileOffset, frame.tileBudget, frame.tileCount, frame.lightCount], 4);
  u.set([frame.atlasWidth, frame.cardResolution, frame.tileCount, frame.radiosity ? 1 : 0], 8);
  f.set([...frame.environment, frame.hysteresis], 12);
  f.set([frame.maxDistance, frame.surfaceBias, frame.depthClamp, frame.cardMargin], 16);
  u.set(frame.gather, 20);
  bytes2.set(frame.query.subarray(0, 8), 96);
  f.set(frame.reflections, 26);
  return bytes2;
}
var IRRADIANCE_FIELD_BLEND_CELLS = 2;
function packIrradianceFieldUniform(plan, levels) {
  const bytes2 = new Uint8Array(IRRADIANCE_FIELD_UNIFORM_BYTES);
  const u = new Uint32Array(bytes2.buffer);
  const i = new Int32Array(bytes2.buffer);
  const f = new Float32Array(bytes2.buffer);
  const [dx, dy, dz] = plan.dimensions;
  f.set([...plan.origin, plan.spacing], 0);
  u.set([dx, dy, dz, plan.probeCount], 4);
  const band = plan.levels > 1 ? IRRADIANCE_FIELD_BLEND_CELLS : 0;
  f.set([0.25 * plan.spacing, 0.1 * plan.spacing, irradianceFieldDepthClamp(plan), band], 8);
  u.set([plan.levels, dx * dy * dz, 0, 0], 12);
  levels.forEach((level, l) => {
    i.set(level.window, 16 + 4 * l);
    i.set(level.min, 32 + 4 * l);
    i.set(level.max, 48 + 4 * l);
  });
  return bytes2;
}
function irradianceFieldDepthClamp(plan) {
  return Math.ceil(Math.sqrt(3) * (1 + IRRADIANCE_FIELD_RELOCATION.limit)) * plan.spacing;
}
var SHARED_WGSL = `
struct Ray { origin: vec3f, tMin: f32, direction: vec3f, tMax: f32, mask: vec4u }
struct Frame { schedule: vec4u, cards: vec4u, atlas: vec4u, environment: vec4f, trace: vec4f, gather: vec4u, query: vec4u }
struct Field { originSpacing: vec4f, dimensionsCount: vec4u, bias: vec4f, levels: vec4u, window: array<vec4i,4>, validMin: array<vec4i,4>, validMax: array<vec4i,4> }
struct CardSurface { position: vec3f, mask: u32, normal: vec3f, valid: u32, albedo: vec4f, emission: vec4f }
struct ProbeRay { radianceDistance: vec4f, directionStatus: vec4f }
struct ProbeOrigin { position: vec3f, probe: u32, updates: u32 }
fn linearId(gid: vec3u, groups: vec3u) -> u32 { return gid.x + gid.y * groups.x * 64u; }
fn probeScale(probe: u32) -> f32 { return f32(1u<<(probe/probeField.levels.y)); }
// Toroidal decode: storage slot p of level l holds the window cell congruent to p.
fn probePosition(probe: u32) -> vec3f {
 let level=probe/probeField.levels.y;let local=probe%probeField.levels.y;
 let d=probeField.dimensionsCount.xyz;let di=vec3i(d);
 let p=vec3i(vec3u(local%d.x,(local/d.x)%d.y,local/(d.x*d.y)));
 let w=probeField.window[level].xyz;
 let c=w+(((p-w)%di)+di)%di;
 return probeField.originSpacing.xyz+vec3f(c)*(probeField.originSpacing.w*probeScale(probe));
}
const PROBE_FRESH=0x80000000u;const PROBE_FAST=0x40000000u;const PROBE_INDEX=0x3fffffffu;
// meta.zw: relocation offset from the lattice point, f16 xyz.
fn probeOffset(state: vec4u) -> vec3f { return vec3f(unpack2x16float(state.z),unpack2x16float(state.w).x); }
`;
var WORLD_TRACE_SHARED_WGSL = SHARED_WGSL.replace(
  "struct Ray { origin: vec3f, tMin: f32, direction: vec3f, tMax: f32, mask: vec4u }",
  ""
);
var irradianceFieldCardSurfaceWgsl = (traversal) => `${worldTraversalWgsl(traversal)}
struct Light { positionKind: vec4f, radiance: vec4f, directionRange: vec4f, cone: vec4f }
@group(0) @binding(5) var<storage,read> cards: array<Card>;
@group(0) @binding(6) var<uniform> lights: array<Light,32>;
@group(0) @binding(7) var<uniform> frame: Frame;
@group(0) @binding(8) var<uniform> settings: vec4u;
@group(0) @binding(9) var<storage,read_write> surfaces: array<CardSurface>;
@group(0) @binding(10) var albedo: texture_2d<f32>;
@group(0) @binding(11) var normal: texture_2d<f32>;
@group(0) @binding(12) var emission: texture_2d<f32>;
@group(0) @binding(13) var f0: texture_2d<f32>;
@group(0) @binding(14) var cardDepth: texture_depth_2d;
${WORLD_TRACE_SHARED_WGSL.replace(/fn probeScale[\s\S]*$/, "")}
${CARD_POINT_LOOKUP_WGSL}
@compute @workgroup_size(64) fn cardSurface(@builtin(global_invocation_id) gid: vec3u, @builtin(num_workgroups) groups: vec3u) {
 let res=frame.atlas.y;let i=linearId(gid,groups);
 if(i>=frame.cards.y*res*res){return;}
 let tile=(frame.cards.x+i/(res*res))%frame.cards.z;let localTexel=i%(res*res);
 let tilesPerRow=frame.atlas.x/res;
 let pixel=vec2u((tile%tilesPerRow)*res+localTexel%res,(tile/tilesPerRow)*res+localTexel/res);
 let texel=pixel.y*frame.atlas.x+pixel.x;
 var out=CardSurface(vec3f(0),0u,vec3f(0),0u,vec4f(0),vec4f(0));
 let card=cards[tile];let material=textureLoad(f0,vec2i(pixel),0);
 if(tile>=settings.x||card.ids.y==0u||(u32(material.w)&3u)!=1u){surfaces[texel]=out;return;}
 let uv=(vec2f(f32(localTexel%res),f32(localTexel/res))+vec2f(0.5))/f32(res);
 let depth=textureLoad(cardDepth,vec2i(pixel),0);
 let position=card.origin.xyz+card.u.xyz*(uv.x*card.u.w)+card.v.xyz*(uv.y*card.v.w)-card.n.xyz*(depth*card.n.w);
 let frameNormal=textureLoad(normal,vec2i(pixel),0);
 let shading=decodeCardNormal(frameNormal.xy);let geometric=decodeCardNormal(frameNormal.zw);
 let origin=worldSurfaceOrigin(position,geometric,frame.trace.y);let bias=length(origin-position);var mask=0u;
 for(var l=0u;l<frame.cards.w;l++){
  let light=lights[l];let kind=u32(light.positionKind.w);if(kind==0u){continue;}
  var incoming=normalize(-light.directionRange.xyz);var tMax=frame.trace.x;
  if(kind>=2u){let delta=light.positionKind.xyz-position;let d=length(delta);incoming=delta/max(d,1e-8);tMax=d-bias;}
  if(dot(geometric,incoming)<=0.0||dot(shading,incoming)<=0.0){continue;}
  if(tMax<=0.0){mask|=1u<<l;continue;}
  let hit=traceWorld(Ray(origin,0.0,incoming,tMax,vec4u(1u,0u,0u,0u)),frame.query.x,bitcast<f32>(frame.query.y));
  if(hit.state.x!=${GlobalSdfQueryStatus.hit}u&&hit.state.x!=${GlobalSdfQueryStatus.negativeStart}u){mask|=1u<<l;}
 }
 out=CardSurface(position,mask,shading,1u,textureLoad(albedo,vec2i(pixel),0),textureLoad(emission,vec2i(pixel),0));
 surfaces[texel]=out;
}
`;
var worldTraceWgsl = (traversal, records, shared) => `${worldTraversalWgsl(traversal)}
@group(0) @binding(5) var<storage,read> cards: array<Card>;
@group(0) @binding(6) var<storage,read> cardLit: array<vec4f>;
${records}
@group(0) @binding(9) var<uniform> frame: Frame;
@group(0) @binding(10) var<uniform> settings: vec4u;
@group(0) @binding(11) var albedo: texture_2d<f32>;
@group(0) @binding(12) var normal: texture_2d<f32>;
@group(0) @binding(13) var emission: texture_2d<f32>;
@group(0) @binding(14) var f0: texture_2d<f32>;
@group(0) @binding(15) var cardDepth: texture_depth_2d;
${shared}
${WORLD_CARD_RADIANCE_WGSL}
`;
var PROBE_ESCAPE_WGSL = {
  "global-sdf": `fn probeEscape(p: vec3f) -> vec3f {
 let h=grid.originSpacing.w*0.5;let center=sampleGlobal(p);
 var gradient=vec3f(0);
 for(var a=0u;a<3u;a++){
  var offset=vec3f(0);offset[a]=h;
  let positive=sampleGlobal(p+offset);let negative=sampleGlobal(p-offset);
  if(center.status!=1u||positive.status!=1u||negative.status!=1u){return vec3f(0);}
  gradient[a]=positive.distance-negative.distance;
 }
 let g=length(gradient);
 return select(vec3f(0),gradient/g*max(-center.distance,0.0),g>1e-12);
}
fn probeVoxel() -> f32 { return grid.originSpacing.w; }
fn probeSurface(p: vec3f) -> vec4f {
 let s=grid.originSpacing.w;let h=0.5*s;let center=sampleGlobal(p);
 if(center.status!=1u||center.distance<0.0||center.distance>=s){return vec4f(0);}
 var gradient=vec3f(0);
 for(var a=0u;a<3u;a++){
  var offset=vec3f(0);offset[a]=h;
  let positive=sampleGlobal(p+offset);let negative=sampleGlobal(p-offset);
  if(positive.status!=1u||negative.status!=1u){return vec4f(0);}
  gradient[a]=positive.distance-negative.distance;
 }
 let g=length(gradient);
 return select(vec4f(0),vec4f(gradient/g,s-center.distance),g>1e-12);
}`,
  "ray-query": "fn probeEscape(p: vec3f) -> vec3f { return vec3f(0); }\nfn probeSurface(p: vec3f) -> vec4f { return vec4f(0); }\nfn probeVoxel() -> f32 { return 0.0; }"
};
var IRRADIANCE_FIELD_PLACE_WGSL = `
@group(0) @binding(0) var<storage,read> probeList: array<u32>;
@group(0) @binding(1) var<storage,read> probeMeta: array<vec4u>;
@group(0) @binding(2) var<uniform> probeField: Field;
@group(0) @binding(3) var<uniform> frame: Frame;
@group(0) @binding(4) var<storage,read_write> probeOrigins: array<ProbeOrigin>;
${SHARED_WGSL}
@compute @workgroup_size(64) fn placeProbes(@builtin(global_invocation_id) gid: vec3u, @builtin(num_workgroups) groups: vec3u) {
 let i=linearId(gid,groups);
 if(i>=frame.schedule.y){return;}
 let entry=probeList[i];let probe=entry&PROBE_INDEX;
 let origin=probePosition(probe)+select(probeOffset(probeMeta[probe]),vec3f(0),(entry&PROBE_FRESH)!=0u);
 let updates=select(probeMeta[probe].x,0u,(entry&PROBE_FRESH)!=0u);
 probeOrigins[i]=ProbeOrigin(origin,probe,updates);
}
`;
var irradianceFieldTraceWgsl = (traversal) => `${worldTraceWgsl(
  traversal,
  `@group(0) @binding(7) var<storage,read_write> probeRays: array<ProbeRay>;
@group(0) @binding(8) var<uniform> probeField: Field;
@group(0) @binding(16) var<storage,read> probeOrigins: array<ProbeOrigin>;`,
  WORLD_TRACE_SHARED_WGSL
)}
${PROBE_ESCAPE_WGSL[traversal]}
fn hash(x: u32) -> u32 { var v=x*747796405u+2891336453u; v=((v>>((v>>28u)+4u))^v)*277803737u; return (v>>22u)^v; }
fn radicalInverse(index: u32, base: u32) -> f32 {
 var digits=index;var value=0.0;var place=1.0/f32(base);
 loop {if(digits==0u){break;}value+=f32(digits%base)*place;digits/=base;place/=f32(base);}
 return min(value,0.99999994);
}
fn rotation(probe: u32) -> mat3x3f {
 let sample=vec3f(f32(hash(probe)>>8u),f32(hash(probe^0x9e3779b9u)>>8u),f32(hash(probe^0x85ebca6bu)>>8u))/16777216.0;
 let a=sample.x*6.28318530718;let b=sample.y*6.28318530718;let c=sample.z;
 let r=mat3x3f(vec3f(cos(a),sin(a),0),vec3f(-sin(a),cos(a),0),vec3f(0,0,1));
 let v=vec3f(cos(b)*sqrt(c),sin(b)*sqrt(c),sqrt(1.0-c));
 let h=mat3x3f(vec3f(1,0,0)-2.0*v*v.x,vec3f(0,1,0)-2.0*v*v.y,vec3f(0,0,1)-2.0*v*v.z);
 return (h*r)*-1.0;
}
fn probeDirection(probe: u32, updates: u32, ray: u32, rays: u32) -> vec3f {
 // Longitude/height rectangles have equal solid angle. Variable band counts
 // retain exactly rays equal-area strata for every accepted integer budget.
 let bands=max(1u,u32(sqrt(f32(rays)*0.5)));let count=rays/bands;let extra=rays%bands;
 var first=0u;var columns=count;
 for(var band=0u;band<bands;band++){
  columns=count+u32(band<extra);if(ray<first+columns){break;}first+=columns;
 }
 let seed=hash(probe^hash(ray));
 let phase=vec2f(f32(seed>>8u),f32(hash(seed^0x9e3779b9u)>>8u))/16777216.0;
 let jitter=fract(vec2f(radicalInverse(updates,2u),radicalInverse(updates,3u))+phase);
 let z=1.0-2.0*(f32(first)+jitter.x*f32(columns))/f32(rays);
 let phi=6.28318530718*(f32(ray-first)+jitter.y)/f32(columns);
 let radius=sqrt(max(0.0,1.0-z*z));
 return normalize(rotation(probe)*vec3f(radius*cos(phi),radius*sin(phi),z));
}
@compute @workgroup_size(64) fn traceProbes(@builtin(global_invocation_id) gid: vec3u, @builtin(num_workgroups) groups: vec3u) {
 let rays=frame.schedule.z;let i=linearId(gid,groups);
 if(i>=frame.schedule.y*rays){return;}
 let placed=probeOrigins[i/rays];let probe=placed.probe;
 // Stable probe identity decorrelates neighbours without tying samples to view cadence.
 let direction=probeDirection(probe,placed.updates,i%rays,rays);
 let origin=placed.position;
 let clampDistance=frame.trace.z*probeScale(probe);
 var hit=traceWorld(Ray(origin,0.0,direction,frame.trace.x,vec4u(1u,0u,0u,0u)),frame.query.x,bitcast<f32>(frame.query.y));
 // A start closer than one SDF voxel steps through sub-voxel walls (the trace's
 // self-hit expansion shrinks with the start distance): a ray into the nearby
 // surface that runs past it is retraced from one voxel off that surface.
 let surface=probeSurface(origin);let cosine=dot(surface.xyz,direction);var liftAlong=0.0;
 let voxel=probeVoxel();let expected=(voxel-surface.w)/max(-cosine,1e-4)+voxel;
 if(cosine<0.0&&surface.w>0.0&&(hit.state.x!=${GlobalSdfQueryStatus.hit}u||hit.metrics.x>expected)){
  liftAlong=surface.w*cosine;
  hit=traceWorld(Ray(origin+surface.xyz*surface.w,0.0,direction,frame.trace.x,vec4u(1u,0u,0u,0u)),frame.query.x,bitcast<f32>(frame.query.y));
 }
 var out=ProbeRay(vec4f(0,0,0,clampDistance),vec4f(direction,${IrradianceFieldRayStatus.skip}.0));
 let status=hit.state.x;
 if(status==${GlobalSdfQueryStatus.miss}u||status==${GlobalSdfQueryStatus.outsideRegion}u){
  out.radianceDistance=vec4f(frame.environment.xyz,clampDistance);out.directionStatus.w=${IrradianceFieldRayStatus.miss}.0;
 } else if(status==${GlobalSdfQueryStatus.negativeStart}u){
  out.radianceDistance=vec4f(probeEscape(origin),0.0);out.directionStatus.w=${IrradianceFieldRayStatus.backface}.0;
 } else if(status==${GlobalSdfQueryStatus.hit}u&&dot(direction,hit.normal.xyz)>0.0){
  out.radianceDistance=vec4f(0,0,0,clamp(hit.metrics.x+liftAlong,0.0,clampDistance));out.directionStatus.w=${IrradianceFieldRayStatus.backface}.0;
 } else if(status==${GlobalSdfQueryStatus.hit}u){
   let card=worldCardRadiance(hit,frame.trace.w,true);
   out.radianceDistance=vec4f(max(card.xyz,vec3f(0)),clamp(hit.metrics.x+liftAlong,0.0,clampDistance));
   out.directionStatus.w=select(${IrradianceFieldRayStatus.hit}.0,${IrradianceFieldRayStatus.unlit}.0,card.w<0.0);
 }
 probeRays[i]=out;
}
`;
var IRRADIANCE_FIELD_REFLECTION_RAY_BYTES = 48;
var IRRADIANCE_FIELD_REFLECTION_HISTORY_BYTES = 48;
var irradianceFieldReflectionWgsl = (traversal) => `${worldTraceWgsl(
  traversal,
  `struct ReflectionRay { originWeight: vec4f, directionDistance: vec4f, fallback: vec4f }
@group(0) @binding(7) var<storage,read_write> reflectionRays: array<ReflectionRay>;
@group(0) @binding(8) var<storage,read_write> reflectionSignal: array<vec4f>;`,
  WORLD_TRACE_SHARED_WGSL.replace(/fn probeScale[\s\S]*$/, "")
)}
@compute @workgroup_size(64) fn traceReflections(@builtin(global_invocation_id) gid: vec3u, @builtin(num_workgroups) groups: vec3u) {
 let i=linearId(gid,groups);
 if(i>=arrayLength(&reflectionSignal)||i>=arrayLength(&reflectionRays)){return;}
 let ray=reflectionRays[i];let weight=ray.originWeight.w;
 if(!(weight>0.0)){return;}
 var radiance=ray.fallback.xyz;
 let direction=ray.directionDistance.xyz;
 let hit=traceWorld(Ray(ray.originWeight.xyz,0.0,direction,ray.directionDistance.w,vec4u(1u,0u,0u,0u)),frame.query.x,bitcast<f32>(frame.query.y));
 let status=hit.state.x;
 var distance=0.0;
 if(status==${GlobalSdfQueryStatus.miss}u||status==${GlobalSdfQueryStatus.outsideRegion}u){
  radiance=frame.environment.xyz;distance=-1.0;
 } else if(status==${GlobalSdfQueryStatus.hit}u){
  distance=max(hit.metrics.x,1e-4);
  if(dot(direction,hit.normal.xyz)<=0.0){
   let card=worldCardRadiance(hit,frame.trace.w,false);
   if(card.w==1.0){radiance=card.xyz;}
  }
 }
 reflectionRays[i].fallback.w=distance;
 let signal=reflectionSignal[i];
 reflectionSignal[i]=vec4f(signal.xyz+radiance*weight,signal.w);
}
`;
var IRRADIANCE_FIELD_COVERAGE_BYTES = 96;
var IRRADIANCE_FIELD_COVERAGE_WGSL = `
${worldTraceWgsl(
  "global-sdf",
  `struct Coverage { state: vec4u, detail: vec4u, metrics: vec4f, normal: vec4f, albedoRoughness: vec4f, radiance: vec4f }
@group(0) @binding(7) var<storage,read> coverageRays: array<Ray>;
@group(0) @binding(8) var<storage,read_write> coverage: array<Coverage>;`,
  WORLD_TRACE_SHARED_WGSL.replace(/fn probeScale[\s\S]*$/, "")
)}
struct WorldCard { candidates: Candidates, lookup: Lookup, radiance: vec4f }
// worldCardRadiance with the candidates and the most specific failed lookup kept,
// so diagnostics classify exactly what the lighting kernels skip.
fn worldCard(hit: Hit, projectionMargin: f32) -> WorldCard {
 var out=WorldCard(worldHitCandidates(hit),Lookup(vec4u(${CardLookupStatus.notSurface}u,hit.state.x,0xffffffffu,0xffffffffu),vec4f(0),vec4f(0),vec4f(0),vec4f(0),vec4u(0xffffffffu),vec4f(0)),vec4f(0));
 if(out.candidates.state.y!=0u){return out;}
 for(var k=0u;k<out.candidates.state.x;k++){
  let lookup=lookupCardPoint(hit.position.xyz,hit.normal.xyz,out.candidates.ids[k],projectionMargin,hit.state.x,settings.x,settings.y);
  if(lookup.state.x!=${CardLookupStatus.mapped}u){
   if(k==0u||lookup.state.x==${CardLookupStatus.stale}u){out.lookup=lookup;}
   continue;
  }
  out.lookup=lookup;out.radiance=worldCardRadiance(hit,projectionMargin,false);
  return out;
 }
 return out;
}
@compute @workgroup_size(64) fn classifyRays(@builtin(global_invocation_id) gid: vec3u, @builtin(num_workgroups) groups: vec3u) {
 let i=linearId(gid,groups);
 if(i>=arrayLength(&coverage)||i>=arrayLength(&coverageRays)){return;}
 let ray=coverageRays[i];
 let hit=traceWorld(ray,frame.query.x,bitcast<f32>(frame.query.y));
 let status=hit.state.x;
 var out=Coverage(vec4u(status,0u,0u,${CardLookupStatus.notSurface}u),vec4u(0xffffffffu,0xffffffffu,hit.state.z,0u),hit.metrics,vec4f(hit.normal.xyz,dot(ray.direction,hit.normal.xyz)),vec4f(0),vec4f(0));
 if(status==${GlobalSdfQueryStatus.hit}u){
  let card=worldCard(hit,frame.trace.w);
  out.state.y=card.candidates.state.y;out.state.z=card.candidates.state.w;out.state.w=card.lookup.state.x;
  out.detail.x=card.lookup.state.z;
  out.detail.y=select(card.candidates.ids.x,card.lookup.state.w,card.lookup.state.w!=0xffffffffu);
  var owned=0u;
  for(var c=0u;c<settings.x;c++){
   let id=cards[c].ids.x;
   for(var k=0u;k<card.candidates.state.x;k++){if(card.candidates.ids[k]==id){owned++;break;}}
  }
  out.detail.w=owned;out.albedoRoughness=card.lookup.albedoRoughness;out.radiance=card.radiance;
 }
 coverage[i]=out;
}
`;
var OCT_LOBES = Array.from({ length: IRRADIANCE_FIELD_TEXELS }, (_, texel) => {
  const x = (texel % IRRADIANCE_FIELD_OCT + 0.5) / IRRADIANCE_FIELD_OCT * 2 - 1;
  const y = (Math.floor(texel / IRRADIANCE_FIELD_OCT) + 0.5) / IRRADIANCE_FIELD_OCT * 2 - 1;
  const z = 1 - Math.abs(x) - Math.abs(y);
  const fold = (a, b) => z < 0 ? (1 - Math.abs(b)) * (a >= 0 ? 1 : -1) : a;
  const v = [fold(x, y), fold(y, x), z];
  const length = Math.hypot(...v);
  return `vec4f(${v.map((c) => (c / length).toFixed(7)).join(",")},${(1 / length ** 3).toFixed(7)})`;
}).join(",");
var PROBE_THREADS = 8;
var THREAD_TEXELS = IRRADIANCE_FIELD_TEXELS / PROBE_THREADS;
var threadTexels = (line) => Array.from({ length: THREAD_TEXELS }, (_, k) => line(k)).join("\n");
var IRRADIANCE_FIELD_UPDATE_WGSL = `
@group(0) @binding(0) var<storage,read> probeRays: array<ProbeRay>;
@group(0) @binding(1) var<storage,read_write> irradiance: array<vec4f>;
@group(0) @binding(2) var<storage,read_write> moments: array<vec2f>;
@group(0) @binding(3) var<storage,read_write> probeMeta: array<vec4u>;
@group(0) @binding(4) var<uniform> probeField: Field;
@group(0) @binding(5) var<uniform> frame: Frame;
@group(0) @binding(6) var<storage,read> probeList: array<u32>;
${SHARED_WGSL}
fn octSurface(texel: u32) -> vec3f {
 let p=(vec2f(f32(texel%${IRRADIANCE_FIELD_OCT}u),f32(texel/${IRRADIANCE_FIELD_OCT}u))+vec2f(0.5))/${IRRADIANCE_FIELD_OCT}.0*2.0-vec2f(1.0);
 var n=vec3f(p,1.0-abs(p.x)-abs(p.y));
 if(n.z<0.0){n=vec3f((vec2f(1)-abs(n.yx))*select(vec2f(-1),vec2f(1),n.xy>=vec2f(0)),n.z);}
 return n;
}
fn storeTexel(probe: u32, texel: u32, radiance: vec3f, depth: vec2f, weight: f32, depthWeight: f32, isFirst: bool, h: f32) {
 let level0=probe*${IRRADIANCE_FIELD_PROBE_STRIDE}u+${IRRADIANCE_FIELD_TEXELS}u+texel;
 let index=probe*${IRRADIANCE_FIELD_TEXELS}u+texel;
 // A recycled block must not leak its previous radiance into the derivation.
 if(weight>0.0){
  let stored=select(irradiance[level0],vec4f(0),isFirst);
  let fresh=radiance/weight;
  irradiance[level0]=vec4f(select(mix(fresh,stored.xyz,h),fresh,stored.w==0.0),1.0);
 } else if(isFirst){irradiance[level0]=vec4f(0);}
 if(depthWeight>0.0){
  let freshDepth=depth/depthWeight;
  moments[index]=select(mix(freshDepth,moments[index],h),freshDepth,isFirst);
 } else if(isFirst){moments[index]=vec2f(0);}
}
var<workgroup> previous: vec4u;
@compute @workgroup_size(${PROBE_THREADS}) fn updateProbes(@builtin(workgroup_id) wid: vec3u, @builtin(local_invocation_index) lane: u32, @builtin(num_workgroups) groups: vec3u) {
 let slot=wid.x+wid.y*groups.x;
 if(slot>=frame.schedule.y){return;}
 let entry=probeList[slot];let probe=entry&PROBE_INDEX;
 // A fresh entry is a newly exposed clipmap cell: its slot's history belongs to
 // another world cell, so it restarts exactly like a never-updated probe.
 let restart=(entry&PROBE_FRESH)!=0u;
 if(lane==0u){previous=probeMeta[probe];}
 let old=workgroupUniformLoad(&previous);
 let rays=frame.schedule.z;let depthClamp=probeField.bias.z*probeScale(probe);
 var backfaces=0u;var traced=0u;
  // Relocation evidence: the closest backface beyond the origin and the Global
  // SDF escape of a negative start.
  var back=depthClamp;var backDirection=vec3f(0);var escape=vec3f(0);
${threadTexels((k) => ` let direction${k}=normalize(octSurface(lane+${k * PROBE_THREADS}u));var radiance${k}=vec3f(0);var depth${k}=vec2f(0);var weight${k}=0.0;var depthWeight${k}=0.0;`)}
 for(var r=0u;r<rays;r++){
  let ray=probeRays[slot*rays+r];let status=u32(ray.directionStatus.w);
  traced+=u32(status!=${IrradianceFieldRayStatus.skip}u);
  let isBack=status==${IrradianceFieldRayStatus.backface}u;
  backfaces+=u32(isBack);
  // Unlit hits (non-resident Cards) shape depth only; radiance keeps its history.
  let lit=select(0.0,1.0,status<${IrradianceFieldRayStatus.backface}u);
  let live=status<${IrradianceFieldRayStatus.backface}u||status==${IrradianceFieldRayStatus.unlit}u;
  let d=min(ray.radianceDistance.w,depthClamp);let moment=vec2f(d,d*d);
  if(isBack&&d>0.0&&d<back){back=d;backDirection=ray.directionStatus.xyz;}
  if(isBack&&d==0.0&&any(ray.radianceDistance.xyz!=vec3f(0))){escape=ray.radianceDistance.xyz;}
${threadTexels((k) => `  {let c=select(0.0,max(dot(direction${k},ray.directionStatus.xyz),0.0),live);let c2=c*c;let c4=c2*c2;let c8=c4*c4;let w=c8*c8;radiance${k}+=ray.radianceDistance.xyz*(w*lit);depth${k}+=moment*w;weight${k}+=w*lit;depthWeight${k}+=w;}`)}
 }
 let isFirst=old.x==0u||restart;
 let h=select(frame.environment.w,min(frame.environment.w,0.5),(entry&PROBE_FAST)!=0u);
${threadTexels((k) => ` storeTexel(probe,lane+${k * PROBE_THREADS}u,radiance${k},depth${k},weight${k},depthWeight${k},isFirst,h);`)}
 if(lane==0u){
  let spacing=probeField.originSpacing.w*probeScale(probe);
  let clearance=${IRRADIANCE_FIELD_RELOCATION.clearance}*spacing;let limit=${IRRADIANCE_FIELD_RELOCATION.limit}*spacing;
  let offset=select(probeOffset(old),vec3f(0),restart);
  let inside=traced>0u&&backfaces*4u>traced;
  // Inside geometry: step out through the closest backface (or the SDF escape)
  // plus the clearance. Open-space probes stay on the lattice: thin walls next to
  // them are resolved by the trace (probeSurface), not by moving the probe.
  var moved=offset;
  if(inside&&any(escape!=vec3f(0))){moved=offset+escape+normalize(escape)*clearance;}
  else if(inside&&back<depthClamp){moved=offset+backDirection*(back+clearance);}
  moved=clamp(moved,vec3f(-limit),vec3f(limit));
  let relocated=length(moved-offset)>${IRRADIANCE_FIELD_RELOCATION.restart}*spacing;
  var state=${IrradianceFieldProbeState.untraced}u;
  if(relocated){state=${IrradianceFieldProbeState.relocated}u;}
  else if(inside){state=${IrradianceFieldProbeState.inside}u;}
  else if(traced>0u){state=${IrradianceFieldProbeState.active}u;}
  // A relocated probe restarts its history at the next update (updates = 0).
  let updates=select(select(old.x,0u,restart)+select(0u,1u,traced>0u),0u,relocated);
  probeMeta[probe]=vec4u(updates,state,pack2x16float(moved.xy),pack2x16float(vec2f(moved.z,0.0)));
 }
}
`;
var IRRADIANCE_FIELD_DERIVE_WGSL = `
@group(0) @binding(1) var<storage,read_write> irradiance: array<vec4f>;
@group(0) @binding(4) var<uniform> probeField: Field;
@group(0) @binding(5) var<uniform> frame: Frame;
@group(0) @binding(6) var<storage,read> probeList: array<u32>;
${SHARED_WGSL}
const OCT_LOBE=array<vec4f,${IRRADIANCE_FIELD_TEXELS}>(${OCT_LOBES});
@compute @workgroup_size(${PROBE_THREADS}) fn deriveProbes(@builtin(workgroup_id) wid: vec3u, @builtin(local_invocation_index) lane: u32, @builtin(num_workgroups) groups: vec3u) {
 let slot=wid.x+wid.y*groups.x;
 if(slot>=frame.schedule.y){return;}
 let probe=probeList[slot]&PROBE_INDEX;
 let block=probe*${IRRADIANCE_FIELD_PROBE_STRIDE}u;
 let level0=block+${IRRADIANCE_FIELD_TEXELS}u;
${threadTexels((k) => ` let direction${k}=OCT_LOBE[lane*${THREAD_TEXELS}u+${k}u].xyz;var e${k}=vec3f(0);var ew${k}=0.0;`)}
 for(var j=0u;j<${IRRADIANCE_FIELD_TEXELS}u;j++){
  let lobe=OCT_LOBE[j];let stored=irradiance[level0+j];
  let solidAngle=select(0.0,lobe.w,stored.w>0.0);
${threadTexels((k) => `  {let c=max(dot(direction${k},lobe.xyz),0.0)*solidAngle;e${k}+=stored.xyz*c;ew${k}+=c;}`)}
 }
${threadTexels((k) => ` if(ew${k}>0.0){irradiance[block+lane*${THREAD_TEXELS}u+${k}u]=vec4f(e${k}/ew${k},1.0);} else {irradiance[block+lane*${THREAD_TEXELS}u+${k}u]=vec4f(0);}`)}
 for(var i=0u;i<${IRRADIANCE_FIELD_MIP_TEXELS / PROBE_THREADS}u;i++){
  let texel=lane*${IRRADIANCE_FIELD_MIP_TEXELS / PROBE_THREADS}u+i;
  let m=vec2u(texel%${IRRADIANCE_FIELD_OCT / 2}u,texel/${IRRADIANCE_FIELD_OCT / 2}u)*2u;
  var mip=vec3f(0);var weight=0.0;
  for(var c=0u;c<4u;c++){
   let source=(m.y+(c>>1u))*${IRRADIANCE_FIELD_OCT}u+m.x+(c&1u);
   let stored=irradiance[level0+source];
   let w=select(0.0,OCT_LOBE[source].w,stored.w>0.0);mip+=stored.xyz*w;weight+=w;
  }
  if(weight>0.0){irradiance[block+${IRRADIANCE_FIELD_TEXELS * 2}u+texel]=vec4f(mip/weight,1.0);}
  else {irradiance[block+${IRRADIANCE_FIELD_TEXELS * 2}u+texel]=vec4f(0);}
 }
}
`;
function layoutEntry(binding, kind) {
  if (kind === "tlas") return { binding, visibility: 4, accelerationStructure: {} };
  return kind === "float" || kind === "depth" || kind === "uint" ? {
    binding,
    visibility: 4,
    texture: {
      sampleType: kind === "depth" ? "depth" : kind === "uint" ? "uint" : "unfilterable-float"
    }
  } : {
    binding,
    visibility: 4,
    buffer: {
      type: kind === "uniform" ? "uniform" : kind === "storage" ? "storage" : "read-only-storage"
    }
  };
}
function createComputeLayout(device, bindings) {
  return device.createBindGroupLayout({
    entries: bindings.map(([binding, kind]) => layoutEntry(binding, kind))
  });
}
var CARD_ATLAS_ROSTER = [
  [10, "uniform", "cardSettings"],
  [11, "float", "albedoRoughness"],
  [12, "float", "normals"],
  [13, "float", "emissionMetallic"],
  [14, "float", "f0Validity"],
  [15, "depth", "depth"]
];
var worldTraceRoster = (traversal, records) => [
  ...WORLD_TRAVERSAL_ROSTER[traversal],
  [5, "read", "cards"],
  [6, "read", "cardLit"],
  ...records,
  [9, "uniform", "frame"],
  ...CARD_ATLAS_ROSTER
];
var stages = (traversal) => ({
  traceProbes: [
    ...worldTraceRoster(traversal, [
      [7, "storage", "probeRays"],
      [8, "uniform", "field"]
    ]),
    [16, "read", "probeOrigins"]
  ],
  placeProbes: [
    [0, "read", "probeList"],
    [1, "read", "meta"],
    [2, "uniform", "field"],
    [3, "uniform", "frame"],
    [4, "storage", "probeOrigins"]
  ],
  traceReflections: worldTraceRoster(traversal, [
    [7, "storage", "reflectionRays"],
    [8, "storage", "reflectionSignal"]
  ]),
  cardSurface: [
    ...WORLD_TRAVERSAL_ROSTER[traversal],
    [5, "read", "cards"],
    [6, "uniform", "lights"],
    [7, "uniform", "frame"],
    [8, "uniform", "cardSettings"],
    [9, "storage", "surfaces"],
    [10, "float", "albedoRoughness"],
    [11, "float", "normals"],
    [12, "float", "emissionMetallic"],
    [13, "float", "f0Validity"],
    [14, "depth", "depth"]
  ],
  updateProbes: [
    [0, "read", "probeRays"],
    [1, "storage", "irradiance"],
    [2, "storage", "moments"],
    [3, "storage", "meta"],
    [4, "uniform", "field"],
    [5, "uniform", "frame"],
    [6, "read", "probeList"]
  ],
  deriveProbes: [
    [1, "storage", "irradiance"],
    [4, "uniform", "field"],
    [5, "uniform", "frame"],
    [6, "read", "probeList"]
  ]
});
function irradianceFieldKernelWgsl(traversal) {
  return {
    cardSurface: irradianceFieldCardSurfaceWgsl(traversal),
    placeProbes: IRRADIANCE_FIELD_PLACE_WGSL,
    traceProbes: irradianceFieldTraceWgsl(traversal),
    updateProbes: IRRADIANCE_FIELD_UPDATE_WGSL,
    deriveProbes: IRRADIANCE_FIELD_DERIVE_WGSL,
    traceReflections: irradianceFieldReflectionWgsl(traversal)
  };
}
function kernelResource(binding, kind, value) {
  switch (kind) {
    case "tlas":
      return { binding, resource: { kind: "accelerationStructure", value } };
    case "float":
    case "depth":
    case "uint":
      return { binding, resource: { kind: "textureView", value } };
    case "uniform":
    case "storage":
    case "read":
      return {
        binding,
        resource: {
          kind: "buffer",
          value
        }
      };
  }
}
function linearDispatch(device, threads) {
  const groups = Math.ceil(threads / 64);
  const max = device.limits.maxComputeWorkgroupsPerDimension;
  const x = Math.min(groups, max);
  return [x, Math.ceil(groups / x)];
}
function createIrradianceFieldKernel(device, stage, module, traversal) {
  const roster = stages(traversal)[stage];
  const layout = createComputeLayout(
    device,
    roster.map(([binding, kind]) => [binding, kind])
  );
  if (!layout.ok) return layout;
  const pipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [layout.value] });
  if (!pipelineLayout.ok) return pipelineLayout;
  const pipeline = device.createComputePipeline({
    label: `irradiance-field.${stage}`,
    layout: pipelineLayout.value,
    compute: { module, entryPoint: stage }
  });
  if (!pipeline.ok) return pipeline;
  return ok13({
    /** The stage's roster, declared by the caller as graph accesses. */
    bindings: roster,
    /** `work` is tile texels or probe rays; the update and derive stages dispatch one group per probe. */
    record(pass, resolve, work) {
      if (!Number.isSafeInteger(work) || work < 1)
        return rayReferenceFailure(`irradiance field ${stage} requires positive work`);
      const group = device.createBindGroup({
        layout: layout.value,
        entries: roster.map(
          ([binding, kind, name]) => kernelResource(binding, kind, resolve(name))
        )
      });
      if (!group.ok) return group;
      pass.setPipeline(pipeline.value);
      pass.setBindGroup(0, group.value);
      if (stage === "updateProbes" || stage === "deriveProbes") {
        const max = device.limits.maxComputeWorkgroupsPerDimension;
        const x = Math.min(work, max);
        pass.dispatchWorkgroups(x, Math.ceil(work / x));
      } else {
        const [x, y] = linearDispatch(device, work);
        pass.dispatchWorkgroups(x, y);
      }
      return ok13(void 0);
    }
  });
}
var VIEW_STAGES = {
  lightCards: [
    [0, "uniform"],
    [1, "uniform"],
    [2, "read"],
    [3, "storage"]
  ],
  radiateCards: [
    [0, "uniform"],
    [2, "read"],
    [4, "read"],
    [5, "storage"]
  ],
  gatherField: [
    [0, "uniform"],
    [6, "depth"],
    [7, "uint"],
    [8, "uniform"],
    [9, "storage"]
  ],
  upsampleField: [
    [0, "uniform"],
    [6, "depth"],
    [7, "uint"],
    [8, "uniform"],
    [10, "read"],
    [11, "storage"]
  ],
  generateFieldReflections: [
    [0, "uniform"],
    [6, "depth"],
    [7, "uint"],
    [8, "uniform"],
    [12, "storage"],
    [13, "storage"]
  ],
  accumulateFieldReflections: [
    [0, "uniform"],
    [6, "depth"],
    [7, "uint"],
    [8, "uniform"],
    [14, "read"],
    [15, "read"],
    [16, "storage"],
    [17, "float"],
    [20, "read"]
  ],
  filterFieldReflections: [
    [0, "uniform"],
    [8, "uniform"],
    [18, "read"],
    [19, "storage"]
  ]
};
var FIELD_SAMPLING_STAGES = /* @__PURE__ */ new Set([
  "radiateCards",
  "gatherField",
  "upsampleField",
  "generateFieldReflections"
]);
var IRRADIANCE_FIELD_SAMPLE_BINDINGS = [
  [0, "uniform"],
  [1, "read"],
  [2, "read"],
  [3, "read"]
];
function createIrradianceFieldSampleLayout(device, mode) {
  return device.createBindGroupLayout({
    entries: [
      ...IRRADIANCE_FIELD_SAMPLE_BINDINGS.map(([binding, kind]) => layoutEntry(binding, kind)),
      ...mode === "live" ? [
        { binding: 4, visibility: 4, buffer: { type: "uniform" } },
        {
          binding: 5,
          visibility: 4,
          texture: { sampleType: "unfilterable-float", viewDimension: "3d" }
        }
      ] : []
    ]
  });
}
function createIrradianceFieldViewKernels(device, module, mode) {
  const sampleLayout = createIrradianceFieldSampleLayout(device, mode);
  if (!sampleLayout.ok) return sampleLayout;
  const kernels = {};
  for (const stage of Object.keys(VIEW_STAGES)) {
    const roster = VIEW_STAGES[stage];
    const layout = createComputeLayout(device, roster);
    if (!layout.ok) return layout;
    const usesField = FIELD_SAMPLING_STAGES.has(stage);
    const pipelineLayout = device.createPipelineLayout({
      bindGroupLayouts: usesField ? [layout.value, sampleLayout.value] : [layout.value]
    });
    if (!pipelineLayout.ok) return pipelineLayout;
    const pipeline = device.createComputePipeline({
      label: `irradiance-field.${stage}`,
      layout: pipelineLayout.value,
      compute: {
        module,
        entryPoint: mode === "baked" && (stage === "gatherField" || stage === "upsampleField") ? stage.replace("Field", "BakedField") : stage
      }
    });
    if (!pipeline.ok) return pipeline;
    kernels[stage] = {
      record(pass, resources, sample, threads) {
        const group = device.createBindGroup({
          layout: layout.value,
          entries: roster.map(([binding, kind], i) => {
            const value = resources[i];
            if (value === void 0)
              throw new Error(`irradiance field ${stage} missing ${binding}`);
            return kind === "float" || kind === "depth" || kind === "uint" ? { binding, resource: { kind: "textureView", value } } : {
              binding,
              resource: {
                kind: "buffer",
                value
              }
            };
          })
        });
        if (!group.ok) return group;
        pass.setPipeline(pipeline.value);
        pass.setBindGroup(0, group.value);
        if (usesField) {
          if (sample === void 0) throw new Error(`irradiance field ${stage} needs the field`);
          pass.setBindGroup(1, sample);
        }
        const [x, y] = linearDispatch(device, threads);
        pass.dispatchWorkgroups(x, y);
        return ok13(void 0);
      }
    };
  }
  return ok13({ sampleLayout: sampleLayout.value, kernels });
}

// sdk/engine/node_modules/@forgeax/engine-render/src/raytracing/probe-placement.ts
import { RhiError as RhiError2 } from "@forgeax/engine-rhi";
import { err as err7, ok as ok14 } from "@forgeax/engine-types";
var PROBE_PLACEMENT_STRIDE = 32;
var PROBE_PLACEMENT_DIAGNOSTIC_STRIDE = 16;
function createRasterProbePlacement(device, module) {
  const failure4 = (expected, code = "rhi-descriptor-invalid") => err7(
    new RhiError2({
      code,
      expected,
      hint: "Supply supported device limits and matching native raster/probe ranges before recording placement."
    })
  );
  if (!device.caps.compute || !device.caps.storageBuffer)
    return failure4(
      "compute and storage-buffer support for raster probe placement",
      "rhi-not-available"
    );
  for (const [name, required] of [
    ["maxBindGroups", 1],
    ["maxBindingsPerBindGroup", 10],
    ["maxStorageBuffersPerShaderStage", 5],
    ["maxSampledTexturesPerShaderStage", 3],
    ["maxUniformBuffersPerShaderStage", 2],
    ["maxUniformBufferBindingSize", VIEW_UNIFORM_BYTES],
    ["maxComputeWorkgroupSizeX", 64],
    ["maxComputeInvocationsPerWorkgroup", 64],
    ["maxComputeWorkgroupStorageSize", 16]
  ])
    if (!(device.limits[name] >= required))
      return failure4(
        `raster probe placement requires ${name} >= ${required}; got ${device.limits[name]}`,
        "limit-exceeded"
      );
  const layout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: 4, texture: { sampleType: "depth" } },
      ...[1, 2].map((binding) => ({
        binding,
        visibility: 4,
        texture: { sampleType: "uint" }
      })),
      { binding: 3, visibility: 4, buffer: { type: "read-only-storage" } },
      {
        binding: 4,
        visibility: 4,
        buffer: { type: "uniform", minBindingSize: VIEW_UNIFORM_BYTES }
      },
      { binding: 5, visibility: 4, buffer: { type: "read-only-storage" } },
      { binding: 6, visibility: 4, buffer: { type: "read-only-storage" } },
      { binding: 7, visibility: 4, buffer: { type: "storage" } },
      { binding: 8, visibility: 4, buffer: { type: "storage" } },
      { binding: 9, visibility: 4, buffer: { type: "uniform" } }
    ]
  });
  if (!layout.ok) return layout;
  const pipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [layout.value] });
  if (!pipelineLayout.ok) return pipelineLayout;
  const pipeline = device.createComputePipeline({
    label: "ray-probe-placement.update",
    layout: pipelineLayout.value,
    compute: { module, entryPoint: "placeRasterProbes" }
  });
  if (!pipeline.ok) return pipeline;
  return ok14({
    record(pass, input, probeCount) {
      if (!Number.isSafeInteger(probeCount) || probeCount < 1 || !(probeCount <= device.limits.maxComputeWorkgroupsPerDimension))
        return failure4(
          `raster probe count in 1..${device.limits.maxComputeWorkgroupsPerDimension}`,
          "limit-exceeded"
        );
      if (probeCount * PROBE_PLACEMENT_STRIDE > device.limits.maxStorageBufferBindingSize || probeCount * PROBE_PLACEMENT_STRIDE > device.limits.maxBufferSize || input.records.size > device.limits.maxStorageBufferBindingSize)
        return failure4(
          "probe and row binding ranges within the device storage-buffer limits",
          "limit-exceeded"
        );
      if (!Number.isSafeInteger(input.records.size) || input.records.size < 64 || input.records.size % 64 !== 0)
        return failure4("a nonempty exact range of 64-byte frame rows");
      const viewOffset = input.view.offset ?? 0;
      if (input.view.size !== VIEW_UNIFORM_BYTES || !isBufferOffsetAligned(device.limits, viewOffset, true))
        return failure4(`an exact ${VIEW_UNIFORM_BYTES}-byte View range at a device-aligned offset`);
      const reads = [
        input.records.buffer,
        input.view.buffer,
        input.probes,
        input.accepted,
        input.viewRect
      ];
      if (input.candidate === input.diagnostics || reads.includes(input.candidate) || reads.includes(input.diagnostics))
        return failure4("placement outputs must not alias each other or borrowed inputs");
      const bindings = device.createBindGroup({
        layout: layout.value,
        entries: [
          ...[input.depth, input.normal, input.identity].map((value, binding) => ({
            binding,
            resource: { kind: "textureView", value }
          })),
          { binding: 3, resource: { kind: "buffer", value: input.records } },
          { binding: 4, resource: { kind: "buffer", value: input.view } },
          ...[input.probes, input.accepted, input.candidate, input.diagnostics, input.viewRect].map(
            (buffer, index) => ({
              binding: 5 + index,
              resource: {
                kind: "buffer",
                value: {
                  buffer,
                  size: index === 4 ? 16 : probeCount * (index === 3 ? PROBE_PLACEMENT_DIAGNOSTIC_STRIDE : PROBE_PLACEMENT_STRIDE)
                }
              }
            })
          )
        ]
      });
      if (!bindings.ok) return bindings;
      pass.setPipeline(pipeline.value);
      pass.setBindGroup(0, bindings.value);
      pass.dispatchWorkgroups(probeCount);
      return ok14(void 0);
    }
  });
}

// sdk/engine/node_modules/@forgeax/engine-render/src/raytracing/probe-rays.ts
import { RhiError as RhiError3 } from "@forgeax/engine-rhi";
import { err as err8, ok as ok15 } from "@forgeax/engine-types";
var ProbeRayStatus = {
  emitted: 0,
  untraced: 1,
  invalidProbe: 2,
  invalidRange: 3
};
var PROBE_RAYS_WGSL = `
struct Probe { baseCell: vec4f, key: vec4u }
struct Candidate { offset: vec4f, key: vec4u }
struct Ray { origin: vec3f, tMin: f32, direction: vec3f, tMax: f32, mask: vec4u }
@group(0) @binding(0) var<storage,read> probes: array<Probe>;
@group(0) @binding(1) var<storage,read> candidate: array<Candidate>;
@group(0) @binding(2) var<uniform> settings: vec4f;
@group(0) @binding(3) var<storage,read_write> rays: array<Ray>;
@group(0) @binding(4) var<storage,read_write> diagnostics: array<vec4u>;

// Clarberg 2008 square-to-sphere mapping; UE's MonteCarlo.ush uses this
// equal-area parameterization for Lumen probe texel centers, without jitter.
fn probeRayDirection(uv: vec2f) -> vec3f {
  let p = 2.0 * uv - 1.0;
  let d = 1.0 - abs(p.x) - abs(p.y);
  let r = 1.0 - abs(d);
  var phi = 0.0;
  if (r != 0.0) { phi = 0.7853981633974483 * ((abs(p.y) - abs(p.x)) / r + 1.0); }
  let f = r * sqrt(2.0 - r * r);
  return vec3f(f * sign(p.x) * abs(cos(phi)), f * sign(p.y) * abs(sin(phi)), sign(d) * (1.0 - r * r));
}

fn probeRayInputStatus(probe: Probe, state: Candidate) -> u32 {
  let cell = probe.baseCell.w;
  if (any(probe.key.xy == vec2u(0u)) || any(probe.key.xy != state.key.xy) ||
      probe.key.z > 1u || probe.key.w != 0u || any(state.key.zw != vec2u(0u)) ||
      !all(abs(probe.baseCell.xyz) < vec3f(1e30)) || !(cell > 1e-20 && cell < 1e20) ||
      !all(abs(state.offset.xyz) <= vec3f(cell * 0.25)) || state.offset.w != 0.0) {
    return ${ProbeRayStatus.invalidProbe}u;
  }
  let origin = probe.baseCell.xyz + state.offset.xyz;
  // A conservative finite endpoint bound for every unit direction. This is
  // numerical admission, never a field-coverage or solid-exterior classifier.
  if (!(settings.x >= 1.1754943508222875e-38 && settings.x < 1e30) ||
      any(settings.yzw != vec3f(0.0)) || !all(abs(origin) + vec3f(settings.x) < vec3f(1e30))) {
    return ${ProbeRayStatus.invalidRange}u;
  }
  return select(${ProbeRayStatus.untraced}u, ${ProbeRayStatus.emitted}u, probe.key.z == 1u);
}

@compute @workgroup_size(64) fn emitProbeRays(@builtin(global_invocation_id) id: vec3u) {
  if (id.x >= arrayLength(&rays)) { return; }
  // Exact CPU-admitted ranges are the count authority; there is no second
  // caller-writable count hidden in the settings buffer.
  let perProbe = arrayLength(&rays) / arrayLength(&probes);
  // sqrt may approximate an exact integer root from below; round before cast.
  let resolution = u32(round(sqrt(f32(perProbe))));
  let probeIndex = id.x / perProbe;
  let texel = id.x % perProbe;
  let probe = probes[probeIndex];
  let state = candidate[probeIndex];
  let status = probeRayInputStatus(probe, state);
  var ray = Ray(vec3f(0), 0, vec3f(0,0,1), 1, vec4u(0));
  if (status == ${ProbeRayStatus.emitted}u) {
    let uv = (vec2f(f32(texel % resolution), f32(texel / resolution)) + 0.5) / f32(resolution);
    ray = Ray(probe.baseCell.xyz + state.offset.xyz, 0, probeRayDirection(uv), settings.x, vec4u(255,0,0,0));
  }
  rays[id.x] = ray;
  if (texel == 0u) {
    diagnostics[probeIndex] = vec4u(probe.key.xy, status, select(0u, perProbe, status == ${ProbeRayStatus.emitted}u));
  }
}
`;
function createProbeRayRecorder(device, module) {
  const failure4 = (expected, code = "rhi-descriptor-invalid") => err8(
    new RhiError3({
      code,
      expected,
      hint: "Supply exact borrowed probe/candidate ranges, a bounded square direction budget and separate outputs."
    })
  );
  if (!device.caps.compute || !device.caps.storageBuffer)
    return failure4("compute and storage-buffer support for probe rays", "rhi-not-available");
  for (const [name, required] of [
    ["maxBindGroups", 1],
    ["maxBindingsPerBindGroup", 5],
    ["maxStorageBuffersPerShaderStage", 4],
    ["maxUniformBuffersPerShaderStage", 1],
    ["maxUniformBufferBindingSize", 16],
    ["maxComputeWorkgroupSizeX", 64],
    ["maxComputeInvocationsPerWorkgroup", 64]
  ])
    if (!(device.limits[name] >= required))
      return failure4(`probe rays require ${name} >= ${required}`, "limit-exceeded");
  const layout = device.createBindGroupLayout({
    entries: [
      PROBE_PLACEMENT_STRIDE,
      PROBE_PLACEMENT_STRIDE,
      16,
      RAY_INPUT_STRIDE,
      PROBE_PLACEMENT_DIAGNOSTIC_STRIDE
    ].map((minBindingSize, binding) => ({
      binding,
      visibility: 4,
      buffer: {
        type: binding === 2 ? "uniform" : binding >= 3 ? "storage" : "read-only-storage",
        minBindingSize
      }
    }))
  });
  if (!layout.ok) return layout;
  const pipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [layout.value] });
  if (!pipelineLayout.ok) return pipelineLayout;
  const pipeline = device.createComputePipeline({
    label: "probe-rays.emit",
    layout: pipelineLayout.value,
    compute: { module, entryPoint: "emitProbeRays" }
  });
  if (!pipeline.ok) return pipeline;
  return ok15({
    record(pass, input, probeCount, resolution) {
      const rayCount = probeCount * resolution * resolution;
      if (!Number.isSafeInteger(probeCount) || probeCount < 1 || !Number.isSafeInteger(resolution) || resolution < 1 || resolution > 256 || !Number.isSafeInteger(rayCount) || rayCount > RAY_REFERENCE_LIMIT || !(Math.ceil(rayCount / 64) <= device.limits.maxComputeWorkgroupsPerDimension))
        return failure4(
          "1..256 square direction resolution and 1..65536 total rays within dispatch limits",
          "limit-exceeded"
        );
      if (input.probes.size !== probeCount * PROBE_PLACEMENT_STRIDE || input.candidate.size !== input.probes.size || input.settings.size !== 16 || input.rays.size !== rayCount * RAY_INPUT_STRIDE || input.diagnostics.size !== probeCount * PROBE_PLACEMENT_DIAGNOSTIC_STRIDE)
        return failure4("exact probe/candidate/settings/ray/diagnostic binding sizes");
      for (const name of ["probes", "candidate", "settings", "rays", "diagnostics"]) {
        const range = input[name], offset = range.offset ?? 0, uniform = name === "settings";
        if (!isBufferOffsetAligned(device.limits, offset, uniform))
          return failure4(`device-aligned nonnegative ${name} offset`);
        if (!isBufferRangeWithinLimits(device.limits, range, uniform))
          return failure4(`${name} range within device buffer limits`, "limit-exceeded");
      }
      if (input.rays.buffer === input.diagnostics.buffer || [input.probes, input.candidate, input.settings].some(
        (range) => range.buffer === input.rays.buffer || range.buffer === input.diagnostics.buffer
      ))
        return failure4("probe ray outputs must not alias each other or borrowed inputs");
      const group = device.createBindGroup({
        layout: layout.value,
        entries: [input.probes, input.candidate, input.settings, input.rays, input.diagnostics].map(
          (value, binding) => ({ binding, resource: { kind: "buffer", value } })
        )
      });
      if (!group.ok) return group;
      pass.setPipeline(pipeline.value);
      pass.setBindGroup(0, group.value);
      pass.dispatchWorkgroups(Math.ceil(rayCount / 64));
      return ok15(void 0);
    }
  });
}

// sdk/engine/node_modules/@forgeax/engine-render/src/raytracing/raster-source.ts
import { ok as ok16 } from "@forgeax/engine-types";
function createRasterRayGenerator(device, module, entryPoint = "generateRasterRays") {
  const layout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: 4, texture: { sampleType: "depth" } },
      ...[1, 2].map((binding) => ({
        binding,
        visibility: 4,
        texture: { sampleType: "uint" }
      })),
      { binding: 3, visibility: 4, buffer: { type: "read-only-storage" } },
      { binding: 4, visibility: 4, buffer: { type: "uniform" } },
      { binding: 5, visibility: 4, buffer: { type: "uniform" } },
      { binding: 6, visibility: 4, buffer: { type: "storage" } }
    ]
  });
  if (!layout.ok) return layout;
  const pipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [layout.value] });
  if (!pipelineLayout.ok) return pipelineLayout;
  const pipeline = device.createComputePipeline({
    label: `ray-raster.${entryPoint}`,
    layout: pipelineLayout.value,
    compute: { module, entryPoint }
  });
  if (!pipeline.ok) return pipeline;
  return ok16({
    record(pass, input, pixelCount) {
      if (!Number.isInteger(pixelCount) || pixelCount < 1 || pixelCount > 262144)
        return rayReferenceFailure("expected 1..262144 raster receiver texels", true);
      if (!Number.isSafeInteger(input.records.size) || input.records.size < 64 || input.records.size % 64 !== 0)
        return rayReferenceFailure("expected a nonempty exact range of 64-byte frame rows", true);
      const bindings = device.createBindGroup({
        layout: layout.value,
        entries: [
          ...[input.depth, input.normal, input.identity].map((value, binding) => ({
            binding,
            resource: { kind: "textureView", value }
          })),
          { binding: 3, resource: { kind: "buffer", value: input.records } },
          { binding: 4, resource: { kind: "buffer", value: input.view } },
          { binding: 5, resource: { kind: "buffer", value: { buffer: input.sample, size: 16 } } },
          {
            binding: 6,
            resource: {
              kind: "buffer",
              value: { buffer: input.rays, size: pixelCount * RAY_PATH_STRIDE }
            }
          }
        ]
      });
      if (!bindings.ok) return bindings;
      pass.setPipeline(pipeline.value);
      pass.setBindGroup(0, bindings.value);
      pass.dispatchWorkgroups(Math.ceil(pixelCount / 64));
      return ok16(void 0);
    }
  });
}

// sdk/engine/node_modules/@forgeax/engine-render/src/record/gpu-pass-timing/parser.ts
import { err as err9, ok as ok17 } from "@forgeax/engine-types";
function failure2(code, expected, hint, detail) {
  return { code, expected, hint, detail };
}
function decimal(value) {
  return /^(0|[1-9][0-9]*)$/.test(value) ? BigInt(value) : void 0;
}
function parseGpuPassTimingTicks(input) {
  const period = input.timestampPeriodNanoseconds;
  if (!Number.isFinite(period) || period <= 0) {
    return err9(
      failure2(
        "timestamp-period-unavailable",
        "timestampPeriodNanoseconds is finite and greater than zero",
        "use a device with a trustworthy positive timestamp period",
        { timestampPeriodNanoseconds: period }
      )
    );
  }
  const beginning = decimal(input.beginningTick);
  const end = decimal(input.endTick);
  if (beginning === void 0 || end === void 0) {
    return err9(
      failure2(
        "timestamp-range-invalid",
        "raw timestamp ticks are unsigned decimal strings",
        "retain the GPU u64 readback as a decimal string before parsing",
        { beginningTick: input.beginningTick, endTick: input.endTick }
      )
    );
  }
  if (end < beginning) {
    return err9(
      failure2(
        "timestamp-range-invalid",
        "end tick is greater than or equal to beginning tick",
        "discard the readback and wait for a later receipt",
        { beginningTick: input.beginningTick, endTick: input.endTick }
      )
    );
  }
  const delta = end - beginning;
  if (delta > BigInt(Number.MAX_SAFE_INTEGER)) {
    return err9(
      failure2(
        "timestamp-range-invalid",
        "tick delta converts to a safe finite duration",
        "use a bounded timestamp range or capture a later receipt",
        { beginningTick: input.beginningTick, endTick: input.endTick }
      )
    );
  }
  const durationNanoseconds = Number(delta) * period;
  if (!Number.isFinite(durationNanoseconds) || !Number.isSafeInteger(Math.round(durationNanoseconds))) {
    return err9(
      failure2(
        "timestamp-range-invalid",
        "derived duration is finite and safely representable",
        "use a smaller tick range or a trustworthy timestamp period",
        { timestampPeriodNanoseconds: period }
      )
    );
  }
  return ok17({
    status: "measured",
    beginningTick: input.beginningTick,
    endTick: input.endTick,
    durationNanoseconds,
    ...delta === 0n ? { timerResolution: "equal-ticks" } : {}
  });
}
function summarizeGpuPassTimingIntervals(passes, timestampPeriodNanoseconds) {
  const ranges = [];
  let sum = 0n;
  for (const pass of passes) {
    if (pass.status !== "measured") continue;
    const parsed = parseGpuPassTimingTicks({ ...pass, timestampPeriodNanoseconds });
    if (!parsed.ok) return parsed;
    const begin = BigInt(pass.beginningTick);
    const end = BigInt(pass.endTick);
    ranges.push({ begin, end });
    sum += end - begin;
  }
  ranges.sort((left, right) => left.begin < right.begin ? -1 : left.begin > right.begin ? 1 : 0);
  let union = 0n;
  let envelope = 0n;
  const first = ranges[0];
  if (first !== void 0) {
    let begin = first.begin;
    let end = first.end;
    for (const range of ranges.slice(1)) {
      if (range.begin > end) {
        union += end - begin;
        begin = range.begin;
      }
      if (range.end > end) end = range.end;
    }
    union += end - begin;
    envelope = end - first.begin;
  }
  const durations = [0, 0, 0, 0];
  for (const [index, ticks] of [sum, union, envelope, sum - union].entries()) {
    const parsed = parseGpuPassTimingTicks({
      beginningTick: "0",
      endTick: ticks.toString(),
      timestampPeriodNanoseconds
    });
    if (!parsed.ok) return parsed;
    durations[index] = parsed.value.durationNanoseconds;
  }
  return ok17({
    measuredPassCount: ranges.length,
    unmeasuredPassCount: passes.length - ranges.length,
    sumNanoseconds: durations[0],
    unionNanoseconds: durations[1],
    envelopeNanoseconds: durations[2],
    overlapNanoseconds: durations[3]
  });
}

// sdk/engine/node_modules/@forgeax/engine-render/src/scene/probe-blend.ts
import { R_MIN } from "@forgeax/engine-types";
var PROBE_R_MIN = R_MIN;
var PROBE_MAX_CONTRIBUTORS = PROBE_BLEND_RECORD_CAPACITY;
var SH_C0 = 0.28209479177387814;
var SH_C1 = 0.4886025119029199;
var SH_C2 = 1.0925484305920792;
var SH_C20 = 0.31539156525252005;
var SH_C22 = 0.5462742152960396;
function finiteVector(values, length) {
  if (values.length !== length) return false;
  for (let index = 0; index < values.length; index += 1) {
    if (!Number.isFinite(values[index])) return false;
  }
  return true;
}
function contributorIsActive(probe, radiusMinimum) {
  return probe.admitted && Number.isFinite(probe.distance) && probe.distance >= 0 && Number.isFinite(probe.radius) && probe.radius >= radiusMinimum && probe.distance < probe.radius && finiteVector(probe.irradiance, 27);
}
function emptyReceipt(radiusMinimum) {
  return {
    activeIdentities: [],
    admittedIdentities: [],
    rejectedIdentities: [],
    stableOrder: [],
    capacity: PROBE_MAX_CONTRIBUTORS,
    scaleRadius: radiusMinimum,
    finite: true
  };
}
function admitProbeContributors(candidates, radiusMinimum = PROBE_R_MIN) {
  const active = candidates.filter((candidate) => contributorIsActive(candidate, radiusMinimum));
  const overflowed = active.length > PROBE_MAX_CONTRIBUTORS;
  const stableActive = active.slice().sort((left, right) => left.identity.localeCompare(right.identity));
  const admitted = stableActive.slice(0, PROBE_MAX_CONTRIBUTORS);
  const rejected = stableActive.slice(PROBE_MAX_CONTRIBUTORS);
  const scaleRadius = active.reduce(
    (minimum, candidate) => Math.min(minimum, candidate.radius),
    active[0]?.radius ?? radiusMinimum
  );
  const receipt = {
    activeIdentities: stableActive.map((candidate) => candidate.identity),
    admittedIdentities: admitted.map((candidate) => candidate.identity),
    rejectedIdentities: rejected.map((candidate) => candidate.identity),
    stableOrder: admitted.map((candidate) => candidate.identity),
    capacity: PROBE_MAX_CONTRIBUTORS,
    ...overflowed ? { overflowReason: "active-count-exceeds-capacity" } : {},
    scaleRadius,
    finite: stableActive.every((candidate) => Number.isFinite(candidate.radius))
  };
  return {
    active: stableActive,
    admitted,
    rejected,
    receipt,
    ...overflowed ? {
      error: {
        code: "capacity-exceeded",
        activeCount: active.length,
        capacity: PROBE_MAX_CONTRIBUTORS,
        receipt
      }
    } : {}
  };
}
function invalidInputResult(radiusMinimum, code) {
  const receipt = emptyReceipt(radiusMinimum);
  return {
    terms: [],
    rStar: radiusMinimum,
    Q: 0,
    C: 0,
    S: 1,
    SHPreblend: new Array(27).fill(0),
    skyIrradiance: [0, 0, 0],
    diffuse: [0, 0, 0],
    finite: false,
    receipt,
    scaledQLogOffset: 0,
    error: { code, activeCount: 0, capacity: PROBE_MAX_CONTRIBUTORS, receipt }
  };
}
function neumaierSum(values) {
  let sum = 0;
  let correction = 0;
  for (const value of values) {
    const next = sum + value;
    if (Math.abs(sum) >= Math.abs(value)) correction += sum - next + value;
    else correction += value - next + sum;
    sum = next;
  }
  return sum + correction;
}
function roundProbeToF32(value) {
  return Number.isFinite(value) ? new Float32Array([value])[0] : void 0;
}
function scaledProbeWeight(distance, radius, radiusMinimum = PROBE_R_MIN) {
  if (!Number.isFinite(distance) || distance < 0 || !Number.isFinite(radius) || radius < radiusMinimum || distance >= radius) {
    return { coverage: 0, q: 0 };
  }
  const ratio = distance / radius;
  const coverage = 1 - ratio * ratio;
  return { coverage, q: coverage / (radius * radius) };
}
function sh9Irradiance(coefficients, normal) {
  const x = normal[0];
  const y = normal[1];
  const z = normal[2];
  const basis = [
    SH_C0,
    SH_C1 * y,
    SH_C1 * z,
    SH_C1 * x,
    SH_C2 * x * y,
    SH_C2 * y * z,
    SH_C20 * (3 * z * z - 1),
    SH_C2 * x * z,
    SH_C22 * (x * x - y * y)
  ];
  const result = [0, 0, 0];
  for (let band = 0; band < basis.length; band += 1) {
    const factor = basis[band] ?? 0;
    const offset = band * 3;
    result[0] = (result[0] ?? 0) + (coefficients[offset] ?? 0) * factor;
    result[1] = (result[1] ?? 0) + (coefficients[offset + 1] ?? 0) * factor;
    result[2] = (result[2] ?? 0) + (coefficients[offset + 2] ?? 0) * factor;
  }
  return result;
}
function vectorNeumaierSum(values, width) {
  return Array.from(
    { length: width },
    (_, channel) => neumaierSum(values.map((value) => value[channel] ?? 0))
  );
}
function blendProbeCoefficients(contributors, radiusMinimum) {
  if (contributors.length > PROBE_MAX_CONTRIBUTORS || contributors.some((contributor) => !contributorIsActive(contributor, radiusMinimum))) {
    return void 0;
  }
  const rStar = contributors.reduce(
    (minimum, contributor) => Math.min(minimum, contributor.radius),
    contributors[0]?.radius ?? radiusMinimum
  );
  const rawTerms = contributors.map((contributor) => {
    const { coverage } = scaledProbeWeight(contributor.distance, contributor.radius, radiusMinimum);
    const scaledRatio = rStar / contributor.radius;
    return {
      contributor,
      coverage,
      // Diagnostic q is never used for Q, alpha, C, or SH accumulation.
      q: coverage / (contributor.radius * contributor.radius),
      scaledQ: coverage * scaledRatio * scaledRatio
    };
  });
  const scaledQLogOffset = 0;
  const finiteTerms = rawTerms;
  if (finiteTerms.some((term) => !Number.isFinite(term.scaledQ))) return void 0;
  const Q = neumaierSum(finiteTerms.map((term) => term.scaledQ));
  const terms = finiteTerms.map((term) => ({
    identity: term.contributor.identity,
    distance: term.contributor.distance,
    radius: term.contributor.radius,
    coverage: term.coverage,
    q: term.q,
    scaledQ: term.scaledQ,
    qHat: term.scaledQ,
    alpha: Q > 0 ? term.scaledQ / Q : 0
  }));
  let product = 1;
  for (const term of finiteTerms) product *= 1 - term.coverage;
  const C = 1 - product;
  const S = 1 - C;
  const weightedSh = finiteTerms.map(
    (term) => Array.from(term.contributor.irradiance, (value) => value * (Q > 0 ? term.scaledQ / Q : 0))
  );
  const SHPreblend = vectorNeumaierSum(weightedSh, 27).map((value) => value * C);
  const finite = Number.isFinite(Q) && Number.isFinite(C) && Number.isFinite(S) && SHPreblend.every(Number.isFinite) && finiteTerms.every((term) => Number.isFinite(term.scaledQ));
  const receipt = {
    activeIdentities: contributors.map((contributor) => contributor.identity),
    admittedIdentities: contributors.map((contributor) => contributor.identity),
    rejectedIdentities: [],
    stableOrder: contributors.map((contributor) => contributor.identity),
    capacity: PROBE_MAX_CONTRIBUTORS,
    scaleRadius: rStar,
    finite
  };
  return {
    terms,
    rStar,
    Q,
    C,
    S,
    SHPreblend,
    finite,
    receipt,
    scaledQLogOffset
  };
}
function blendLightProbes(input) {
  const radiusMinimum = input.radiusMinimum ?? PROBE_R_MIN;
  const normal = input.normal;
  const sky = input.skyIrradiance;
  if (!finiteVector(normal, 3) || !finiteVector(sky, 3)) {
    return invalidInputResult(radiusMinimum, "invalid-admitted-prefix");
  }
  const coefficients = blendProbeCoefficients(input.contributors, radiusMinimum);
  if (coefficients === void 0)
    return invalidInputResult(radiusMinimum, "invalid-admitted-prefix");
  const shIrradiance = sh9Irradiance(coefficients.SHPreblend, normal);
  const diffuse = [0, 1, 2].map(
    (channel) => Math.max(shIrradiance[channel] ?? 0, 0) + coefficients.S * (sky[channel] ?? 0)
  );
  return {
    ...coefficients,
    skyIrradiance: [sky[0], sky[1], sky[2]],
    diffuse,
    finite: coefficients.finite && diffuse.every(Number.isFinite)
  };
}
function vectorDistance(left, right) {
  const dx = left[0] - right[0];
  const dy = left[1] - right[1];
  const dz = left[2] - right[2];
  return Math.hypot(dx, dy, dz);
}
function encodeProbeRecord(objectKey, generation, localBlendFraction, shPreblend, candidate, accepted, lastKnownGood, sentinel) {
  const values = new Float32Array(PROBE_BLEND_RECORD_BYTE_SIZE / Float32Array.BYTES_PER_ELEMENT);
  values[0] = objectKey;
  values[1] = generation;
  values[2] = roundProbeToF32(localBlendFraction) ?? 0;
  values[3] = (candidate ? 1 : 0) | (accepted ? 2 : 0) | (lastKnownGood ? 4 : 0);
  for (let band = 0; band < 9; band += 1) {
    const lane = 4 + band * 4;
    values[lane] = roundProbeToF32(shPreblend[band * 3] ?? 0) ?? 0;
    values[lane + 1] = roundProbeToF32(shPreblend[band * 3 + 1] ?? 0) ?? 0;
    values[lane + 2] = roundProbeToF32(shPreblend[band * 3 + 2] ?? 0) ?? 0;
    values[lane + 3] = 0;
  }
  const packedSh = new Array(27);
  for (let band = 0; band < 9; band += 1) {
    packedSh[band * 3] = values[4 + band * 4] ?? 0;
    packedSh[band * 3 + 1] = values[5 + band * 4] ?? 0;
    packedSh[band * 3 + 2] = values[6 + band * 4] ?? 0;
  }
  return {
    objectKey,
    generation,
    localBlendFraction: values[2] ?? 0,
    shPreblend: packedSh,
    bytes: new Uint8Array(values.buffer),
    byteLength: values.byteLength,
    candidate,
    accepted,
    lastKnownGood,
    ...sentinel === void 0 ? {} : { sentinel }
  };
}
function sameList(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
function sameVector3(left, right) {
  return left[0] === right[0] && left[1] === right[1] && left[2] === right[2];
}
function sameProbeFacts(left, right) {
  if (left.length !== right.length) return false;
  return left.every((probe, index) => {
    const other = right[index];
    if (other === void 0 || probe.identity !== other.identity || probe.radius !== other.radius || probe.admitted !== other.admitted || !sameVector3(probe.position, other.position) || probe.irradiance.length !== other.irradiance.length)
      return false;
    for (let value = 0; value < probe.irradiance.length; value += 1) {
      if (probe.irradiance[value] !== other.irradiance[value]) return false;
    }
    return true;
  });
}
function sameSkyFacts(left, right) {
  const leftSky = left.sky;
  const rightSky = right.sky;
  if (leftSky === void 0 !== (rightSky === void 0)) return false;
  if (leftSky !== void 0 && rightSky !== void 0 && (leftSky.available !== rightSky.available || leftSky.identity !== rightSky.identity || leftSky.sourceKey !== rightSky.sourceKey || leftSky.fallbackReason !== rightSky.fallbackReason || !sameVector3(leftSky.irradiance, rightSky.irradiance)))
    return false;
  if (left.skyIrradiance === void 0 !== (right.skyIrradiance === void 0)) return false;
  return left.skyIrradiance === void 0 || right.skyIrradiance !== void 0 && sameVector3(left.skyIrradiance, right.skyIrradiance);
}
var ProbeBlendSceneProjection = class {
  previous;
  records = /* @__PURE__ */ new Map();
  lastError;
  lastReceipt = emptyReceipt(PROBE_R_MIN);
  lastActiveContributorCount = 0;
  lastAdmittedProbeCount = 0;
  lastCoverage = 0;
  lastFinite = true;
  lastSky = {
    available: false,
    irradiance: [0, 0, 0],
    fallbackReason: "no-skylight"
  };
  lastDirtyVisitCount = 0;
  lastDirtyReasons = [];
  bufferProjectionSource = Object.freeze({});
  bufferProjection = Object.freeze({
    sourceIdentity: this.bufferProjectionSource,
    revision: 0,
    baseRevision: 0,
    capacity: 1,
    records: Object.freeze([]),
    dirtyRecords: Object.freeze([]),
    removedCacheKeys: Object.freeze([])
  });
  resultRecords = Object.freeze([]);
  recordFacts = /* @__PURE__ */ new Map();
  getRecord(objectKey) {
    return this.records.get(objectKey);
  }
  captureRecordLookup() {
    const records = this.records;
    return (objectKey) => records.get(objectKey);
  }
  hasRecords() {
    return this.records.size > 0;
  }
  /** Stable upload projection; rebuilt only when probe/object facts change. */
  recordBufferProjection() {
    return this.bufferProjection;
  }
  inspect() {
    return {
      activeContributorCount: this.lastActiveContributorCount,
      admittedProbeCount: this.lastAdmittedProbeCount,
      coverage: this.lastCoverage,
      skyResidualFraction: 1 - this.lastCoverage,
      finite: this.lastFinite,
      errorCode: this.lastError?.code,
      records: [...this.records.values()].map((record) => {
        const facts = this.recordFacts.get(record.objectKey);
        return {
          objectKey: record.objectKey,
          generation: record.generation,
          localBlendFraction: record.localBlendFraction,
          shPreblend: [...record.shPreblend],
          byteLength: record.byteLength,
          candidate: record.candidate,
          accepted: record.accepted,
          lastKnownGood: record.lastKnownGood,
          sentinel: record.sentinel,
          probeBlendIndex: record.objectKey,
          contributors: (facts?.contributors ?? []).map((term) => ({
            identity: term.identity,
            distance: term.distance,
            radius: term.radius,
            coverage: term.coverage,
            q: term.q,
            qHat: term.qHat,
            alpha: term.alpha
          })),
          qHatSum: facts?.qHatSum ?? 0,
          rStar: facts?.rStar ?? PROBE_R_MIN,
          fallbackReason: facts?.fallbackReason
        };
      }),
      sky: {
        available: this.lastSky?.available ?? false,
        identity: this.lastSky?.identity,
        sourceKey: this.lastSky?.sourceKey,
        irradiance: [...this.lastSky?.irradiance ?? [0, 0, 0]],
        fallbackReason: this.lastSky?.fallbackReason
      },
      dirtyVisitCount: this.lastDirtyVisitCount,
      dirtyReasons: [...this.lastDirtyReasons],
      receipt: {
        activeIdentities: [...this.lastReceipt.activeIdentities],
        admittedIdentities: [...this.lastReceipt.admittedIdentities],
        rejectedIdentities: [...this.lastReceipt.rejectedIdentities],
        stableOrder: [...this.lastReceipt.stableOrder],
        capacity: this.lastReceipt.capacity,
        scaleRadius: this.lastReceipt.scaleRadius,
        finite: this.lastReceipt.finite,
        overflowReason: this.lastReceipt.overflowReason
      }
    };
  }
  apply(input) {
    const dirtyReasons = [];
    const affectedObjectKeys = /* @__PURE__ */ new Set();
    const previous = this.previous;
    if (previous !== void 0 && previous.objects === input.objects && input.worldRevision === previous.worldRevision && sameProbeFacts(input.probes, previous.probes) && sameSkyFacts(input, previous)) {
      return {
        records: this.resultRecords,
        contributors: [],
        activeContributorCount: this.lastActiveContributorCount,
        admittedProbeCount: this.lastAdmittedProbeCount,
        coverage: this.lastCoverage,
        skyResidualFraction: 1 - this.lastCoverage,
        dirtyReasons: [],
        affectedObjectKeys: [],
        visits: 0,
        allocations: 0,
        uploads: 0,
        receipt: this.lastReceipt,
        ...this.lastError === void 0 ? {} : { error: this.lastError }
      };
    }
    const objectKeys = input.objects.map((object) => String(object.objectKey)).sort();
    const previousObjectKeys = previous?.objects.map((object) => String(object.objectKey)).sort() ?? [];
    if (previous === void 0 || !sameList(objectKeys, previousObjectKeys)) {
      dirtyReasons.push("object-boundary");
      for (const object of input.objects) affectedObjectKeys.add(object.objectKey);
    }
    if (previous !== void 0 && input.worldRevision !== previous.worldRevision)
      dirtyReasons.push("world");
    if (previous !== void 0 && !sameProbeFacts(input.probes, previous.probes))
      dirtyReasons.push("probe-fact");
    if (previous !== void 0 && !sameSkyFacts(input, previous)) dirtyReasons.push("sky");
    const previousObjects = new Map(previous?.objects.map((object) => [object.objectKey, object]));
    for (const object of input.objects) {
      const oldObject = previousObjects.get(object.objectKey);
      if (oldObject === void 0) {
        affectedObjectKeys.add(object.objectKey);
        continue;
      }
      if (!sameVector3(object.position, oldObject.position)) {
        dirtyReasons.push("object-position");
        affectedObjectKeys.add(object.objectKey);
      }
      if (object.generation !== oldObject.generation) {
        dirtyReasons.push("generation");
        affectedObjectKeys.add(object.objectKey);
      }
    }
    if (dirtyReasons.includes("world") || dirtyReasons.includes("probe-fact") || dirtyReasons.includes("sky"))
      for (const object of input.objects) affectedObjectKeys.add(object.objectKey);
    const uniqueDirtyReasons = [...new Set(dirtyReasons)];
    if (previous !== void 0 && uniqueDirtyReasons.length === 0) {
      return {
        records: [...this.records.values()],
        contributors: [],
        activeContributorCount: this.lastActiveContributorCount,
        admittedProbeCount: this.lastAdmittedProbeCount,
        coverage: this.lastCoverage,
        skyResidualFraction: 1 - this.lastCoverage,
        dirtyReasons: [],
        affectedObjectKeys: [],
        visits: 0,
        allocations: 0,
        uploads: 0,
        receipt: this.lastReceipt,
        ...this.lastError === void 0 ? {} : { error: this.lastError }
      };
    }
    const nextRecords = new Map(this.records);
    const currentObjectKeys = new Set(input.objects.map((object) => object.objectKey));
    for (const objectKey of nextRecords.keys()) {
      if (!currentObjectKeys.has(objectKey)) {
        nextRecords.delete(objectKey);
        this.recordFacts.delete(objectKey);
      }
    }
    let firstTerms = [];
    let firstReceipt = emptyReceipt(PROBE_R_MIN);
    let firstError;
    let firstActiveCount = 0;
    let firstAdmittedCount = 0;
    let firstCoverage = 0;
    let firstObjectSeen = false;
    let visited = 0;
    for (const object of input.objects) {
      if (!affectedObjectKeys.has(object.objectKey)) continue;
      visited += 1;
      const candidates = input.probes.map((probe) => ({
        identity: probe.identity,
        admitted: probe.admitted,
        distance: vectorDistance(object.position, probe.position),
        radius: probe.radius,
        irradiance: probe.irradiance
      }));
      const admission = admitProbeContributors(candidates);
      if (!firstObjectSeen) {
        firstObjectSeen = true;
        firstActiveCount = admission.active.length;
        firstAdmittedCount = admission.admitted.length;
        firstReceipt = admission.receipt;
      }
      const previousRecord = this.records.get(object.objectKey);
      const lastKnownGood = input.lastKnownGood ?? previousRecord?.lastKnownGood ?? false;
      let record;
      if (admission.error !== void 0) firstError ??= admission.error;
      if (admission.admitted.length === 0) {
        if (input.probes.length === 0) {
          nextRecords.delete(object.objectKey);
          this.recordFacts.delete(object.objectKey);
          continue;
        }
        const sentinel = lastKnownGood ? "no-active" : "no-lkg";
        record = encodeProbeRecord(
          object.objectKey,
          object.generation,
          0,
          new Array(27).fill(0),
          true,
          false,
          lastKnownGood,
          sentinel
        );
        this.recordFacts.set(object.objectKey, {
          contributors: [],
          qHatSum: 0,
          rStar: PROBE_R_MIN,
          fallbackReason: admission.error?.code ?? sentinel
        });
      } else {
        const blend = blendProbeCoefficients(admission.admitted, PROBE_R_MIN);
        if (blend === void 0) {
          firstError ??= {
            code: "invalid-admitted-prefix",
            activeCount: admission.active.length,
            capacity: PROBE_MAX_CONTRIBUTORS,
            receipt: admission.receipt
          };
          firstReceipt = admission.receipt;
          continue;
        }
        record = encodeProbeRecord(
          object.objectKey,
          object.generation,
          blend.C,
          blend.SHPreblend,
          true,
          true,
          true,
          void 0
        );
        this.recordFacts.set(object.objectKey, {
          contributors: blend.terms,
          qHatSum: blend.Q,
          rStar: blend.rStar,
          fallbackReason: admission.error === void 0 ? void 0 : "capacity-exceeded-stable-prefix"
        });
        if (firstTerms.length === 0) firstTerms = blend.terms;
        firstCoverage = blend.C;
      }
      nextRecords.set(object.objectKey, record);
      firstError ??= admission.error;
    }
    const allocations = previous === void 0 ? nextRecords.size : 0;
    const resultRecords = Object.freeze([...nextRecords.values()]);
    const result = {
      records: resultRecords,
      contributors: firstTerms,
      activeContributorCount: firstActiveCount,
      admittedProbeCount: firstAdmittedCount,
      coverage: firstCoverage,
      skyResidualFraction: 1 - firstCoverage,
      dirtyReasons: uniqueDirtyReasons,
      affectedObjectKeys: [...affectedObjectKeys].sort((left, right) => left - right),
      visits: visited,
      allocations,
      uploads: nextRecords.size,
      receipt: firstReceipt,
      ...firstError === void 0 ? {} : { error: firstError }
    };
    const projectedRecords = Object.freeze(
      [...nextRecords].map(([objectKey, record]) => Object.freeze({ cacheKey: objectKey, record }))
    );
    const dirtyRecords = Object.freeze(
      projectedRecords.filter(({ record }) => affectedObjectKeys.has(record.objectKey))
    );
    const removedCacheKeys = Object.freeze(
      [...this.records.keys()].filter((objectKey) => !nextRecords.has(objectKey))
    );
    const capacity = projectedRecords.reduce(
      (value, { record }) => Math.max(value, record.objectKey + 2),
      1
    );
    this.previous = input;
    this.records = nextRecords;
    this.resultRecords = resultRecords;
    const baseRevision = this.bufferProjection.revision;
    this.bufferProjection = Object.freeze({
      sourceIdentity: this.bufferProjectionSource,
      revision: baseRevision + 1,
      baseRevision,
      capacity,
      records: projectedRecords,
      dirtyRecords,
      removedCacheKeys
    });
    this.lastError = firstError;
    this.lastReceipt = firstReceipt;
    this.lastActiveContributorCount = firstActiveCount;
    this.lastAdmittedProbeCount = firstAdmittedCount;
    this.lastCoverage = firstCoverage;
    this.lastFinite = this.resultRecords.every(
      (record) => record.bytes.length === PROBE_BLEND_RECORD_BYTE_SIZE
    );
    this.lastSky = input.sky ?? (input.skyIrradiance === void 0 ? { available: false, irradiance: [0, 0, 0], fallbackReason: "no-skylight" } : { available: true, irradiance: input.skyIrradiance });
    this.lastDirtyVisitCount = visited;
    this.lastDirtyReasons = uniqueDirtyReasons;
    return result;
  }
};

// sdk/engine/node_modules/@forgeax/engine-render/src/ssr/history.ts
import { err as err10, ok as ok18 } from "@forgeax/engine-types";
var SSR_HISTORY_FORMAT = "rgba16float";
var HISTORY_USAGE = GPU_TEXTURE_USAGE_COPY_SRC | GPU_TEXTURE_USAGE_COPY_DST | GPU_TEXTURE_USAGE_TEXTURE_BINDING | GPU_TEXTURE_USAGE_STORAGE_BINDING | GPU_TEXTURE_USAGE_RENDER_ATTACHMENT;
function positiveDimension(value, field) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${field} must be a positive safe integer.`);
  }
  return value;
}
function createResources(device, scope, width, height) {
  const traceWidth = Math.max(1, Math.floor(width));
  const traceHeight = Math.max(1, Math.floor(height));
  const descriptor = {
    label: "ssr-history-rgba16float",
    size: { width: traceWidth, height: traceHeight, depthOrArrayLayers: 1 },
    format: SSR_HISTORY_FORMAT,
    usage: HISTORY_USAGE,
    mipLevelCount: 1,
    sampleCount: 1,
    dimension: "2d",
    viewFormats: void 0,
    textureBindingViewDimension: void 0
  };
  const childScope = scope.createChild(`${scope.owner}:ssr-history`);
  const slots = [];
  for (const index of [0, 1]) {
    const texture = device.createTexture({
      ...descriptor,
      label: `ssr-history-rgba16float-${index}`
    });
    if (!texture.ok) {
      childScope.abandon();
      return texture;
    }
    childScope._adopt("texture", texture.value, (value) => {
      device.destroyTexture(value);
    });
    const view = device.createTextureView(texture.value, {
      label: `ssr-history-rgba16float-${index}.view`,
      dimension: "2d",
      baseMipLevel: 0,
      mipLevelCount: 1,
      baseArrayLayer: 0,
      arrayLayerCount: 1
    });
    if (!view.ok) {
      childScope.abandon();
      return view;
    }
    const surfaceTexture = device.createTexture({
      ...descriptor,
      label: `ssr-history-surface-${index}`,
      format: "rgba8unorm"
    });
    if (!surfaceTexture.ok) {
      childScope.abandon();
      return surfaceTexture;
    }
    childScope._adopt("texture", surfaceTexture.value, (value) => {
      device.destroyTexture(value);
    });
    const surfaceView = device.createTextureView(surfaceTexture.value, { dimension: "2d" });
    if (!surfaceView.ok) {
      childScope.abandon();
      return surfaceView;
    }
    slots.push({
      texture: texture.value,
      view: view.value,
      surfaceTexture: surfaceTexture.value,
      surfaceView: surfaceView.value
    });
  }
  const params = device.createBuffer({
    label: "ssr-temporal-params",
    size: 32,
    usage: GPU_BUFFER_USAGE_UNIFORM | GPU_BUFFER_USAGE_COPY_DST,
    mappedAtCreation: false
  });
  if (!params.ok) {
    childScope.abandon();
    return params;
  }
  childScope._adopt("buffer", params.value, (value) => {
    device.destroyBuffer(value);
  });
  const cleared = device.queue.writeBuffer(params.value, 0, new Uint8Array(32));
  if (!cleared.ok) {
    childScope.abandon();
    return cleared;
  }
  return ok18({
    width,
    height,
    traceWidth,
    traceHeight,
    bytes: traceWidth * traceHeight * 12 * 2,
    descriptor,
    slots,
    paramsBuffer: params.value,
    childScope
  });
}
function failure3(code, expected, hint, detail) {
  return { code, expected, hint, ...detail === void 0 ? {} : { detail } };
}
var SsrHistoryOwner = class _SsrHistoryOwner {
  constructor(device, scope, resources) {
    this.device = device;
    this.scope = scope;
    this.activeResources = resources;
  }
  device;
  scope;
  activeResources;
  retiringResources = /* @__PURE__ */ new Set();
  retirementFencePending = false;
  activeCandidate;
  readIndex = 0;
  valid = false;
  state = "first-frame";
  resetReason = "first-enable";
  lastFailure;
  resetCount = 0;
  static create(input) {
    const width = positiveDimension(input.width, "width");
    const height = positiveDimension(input.height, "height");
    const resources = createResources(input.device, input.scope, width, height);
    return resources.ok ? ok18(new _SsrHistoryOwner(input.device, input.scope, resources.value)) : resources;
  }
  /** The begun frame awaiting `commitFrame` / `abortFrame`; the only candidate copy. */
  get candidate() {
    return this.activeCandidate;
  }
  get resources() {
    if (this.activeResources === void 0) throw new Error("SSR history resources are retired.");
    return this.activeResources;
  }
  beginFrame() {
    if (this.activeResources === void 0 || this.state === "retired" || this.state === "disposed") {
      return err10(
        failure3(
          "ssr-history-retired",
          "SSR history resources are active",
          "recreate the renderer-owned SSR history after device recovery"
        )
      );
    }
    if (this.activeCandidate !== void 0) {
      return err10(
        failure3(
          "ssr-history-active",
          "one SSR history candidate is active",
          "commit or abort the active SSR history candidate before beginning another"
        )
      );
    }
    const writeSlot = this.valid ? this.readIndex === 0 ? 1 : 0 : 0;
    const candidate = Object.freeze({
      readSlot: this.valid ? this.readIndex : null,
      writeSlot,
      historyValid: this.valid && this.resetReason === void 0
    });
    this.activeCandidate = candidate;
    this.state = this.valid ? "stable" : this.state === "aborted" ? "aborted" : "first-frame";
    this.lastFailure = void 0;
    return ok18(candidate);
  }
  commitFrame(candidate) {
    if (this.activeCandidate !== candidate) {
      return err10(
        failure3(
          "ssr-history-not-active",
          "commit the candidate returned by beginFrame",
          "keep one candidate from beginFrame until the shared queue submit succeeds"
        )
      );
    }
    this.readIndex = candidate.writeSlot;
    this.valid = true;
    this.activeCandidate = void 0;
    this.state = "stable";
    this.resetReason = void 0;
    this.lastFailure = void 0;
    return ok18(void 0);
  }
  abortFrame(candidate, stage) {
    if (this.activeCandidate !== candidate) return;
    this.activeCandidate = void 0;
    this.state = "aborted";
    this.lastFailure = stage;
  }
  reset(reason) {
    this.activeCandidate = void 0;
    this.valid = false;
    this.readIndex = 0;
    this.resetReason = reason;
    this.lastFailure = void 0;
    this.resetCount += 1;
    if (this.activeResources !== void 0) this.state = "reset";
  }
  resize(width, height) {
    const next = createResources(
      this.device,
      this.scope,
      positiveDimension(width, "width"),
      positiveDimension(height, "height")
    );
    if (!next.ok) return next;
    if (this.activeResources !== void 0) this.retiringResources.add(this.activeResources);
    this.activeResources = next.value;
    this.activeCandidate = void 0;
    this.valid = false;
    this.readIndex = 0;
    this.resetReason = "resize";
    this.lastFailure = void 0;
    this.resetCount += 1;
    this.state = "reset";
    return ok18(void 0);
  }
  /** Retire pending allocations after the queue's already-submitted work. */
  retireAfterFence(queue, onFailure) {
    if (this.retirementFencePending) return;
    if (this.retiringResources.size === 0 && this.activeResources !== void 0) {
      this.retiringResources.add(this.activeResources);
      this.activeCandidate = void 0;
      this.valid = false;
      this.state = "retiring";
    }
    const pending = [...this.retiringResources];
    for (const resources of pending) resources.childScope.beginRetire();
    if (pending.length === 0) return;
    this.retirementFencePending = true;
    const finish = () => {
      this.retirementFencePending = false;
      for (const resources of pending) {
        this.retiringResources.delete(resources);
        resources.childScope.retire();
        if (this.activeResources === resources) this.activeResources = void 0;
      }
      if (this.activeResources === void 0 && this.retiringResources.size === 0) {
        this.state = "retired";
      }
      if (this.retiringResources.size > 0) this.retireAfterFence(queue, onFailure);
    };
    void queue.onSubmittedWorkDone().then(finish, (cause) => {
      onFailure(cause);
      finish();
    });
  }
  retire() {
    this.retirementFencePending = false;
    this.activeCandidate = void 0;
    if (this.activeResources !== void 0) {
      this.activeResources.childScope.retire();
      this.activeResources = void 0;
    }
    for (const resources of this.retiringResources) resources.childScope.retire();
    this.retiringResources.clear();
    this.valid = false;
    this.state = "retired";
  }
  dispose() {
    if (this.state === "disposed") return;
    this.retire();
    this.state = "disposed";
  }
  inspect() {
    const active = this.activeResources;
    return Object.freeze({
      state: this.state,
      width: active?.width ?? 0,
      height: active?.height ?? 0,
      traceWidth: active?.traceWidth ?? 0,
      traceHeight: active?.traceHeight ?? 0,
      format: SSR_HISTORY_FORMAT,
      historyCount: active === void 0 ? 0 : 2,
      historyValid: this.valid,
      readSlot: active === void 0 ? null : this.valid ? this.readIndex : null,
      writeSlot: active === void 0 ? 0 : this.valid ? this.readIndex === 0 ? 1 : 0 : 0,
      activeBytes: active?.bytes ?? 0,
      candidateBytes: 0,
      retiringBytes: [...this.retiringResources].filter((entry) => entry !== active).reduce((sum, entry) => sum + entry.bytes, 0),
      resetCount: this.resetCount,
      resetReason: this.resetReason,
      lastFailure: this.lastFailure
    });
  }
};
function createSsrHistoryOwner(input) {
  return SsrHistoryOwner.create(input);
}

export {
  createDynamicGeometrySourceHost,
  createRendererDynamicGeometryController,
  DeviceScope,
  adoptBackendDevice,
  LifecycleTransaction,
  validRenderFeatureWorkgroups,
  encodeRenderFeatureGpuComputePass,
  ownRenderFeatureProgramData,
  isOwnedRenderFeatureProgramData,
  createRenderFeatureNativePlanBuilder,
  isRenderFeatureNativePlan,
  renderFeatureNativeResourceAdmission,
  renderFeatureNativeDepthBatchPermission,
  consumeRenderFeatureNativePlan,
  createRenderFeatureGpuWorkOwner,
  emptyBloomInspection,
  projectBarrelDistortionInspection,
  createExtendedLightingState,
  promoteExtendedLightingCandidate,
  recordExtendedLightingFailure,
  projectExtendedLightingInspection,
  captureMeshPipelinePreparation,
  RAY_ATTRIBUTE_TRIANGLE_STRIDE,
  buildRaySurfaceScene,
  packStandardPbrMaterialRow,
  packMaterialProgramRow,
  packLights,
  captureViewProjection,
  createIndexAllocator,
  CARD_PLANES,
  CARD_TEXTURES,
  surfaceCardKey,
  packCardProjection,
  createSurfaceCapture,
  prepareSurfaceCapture,
  CardLookupStatus,
  CARD_LOOKUP_STRIDE,
  packCardLookupProjections,
  createSdfCardLookup,
  GLOBAL_CARD_CANDIDATE_STRIDE,
  GlobalCardCandidateFlags,
  GLOBAL_SDF_CARD_LOOKUP_WGSL,
  createGlobalSdfCardLookup,
  createGlobalSdfCardLookupRecorder,
  RAY_PATH_STRIDE,
  RAY_ACCUMULATION_STRIDE,
  createRayPathTracer,
  createSubmittedRayPathTracer,
  WORLD_TRAVERSAL_ROSTER,
  worldTraversalWgsl,
  WORLD_CARD_RADIANCE_WGSL,
  IRRADIANCE_FIELD_RAY_BYTES,
  IRRADIANCE_FIELD_ORIGIN_BYTES,
  IRRADIANCE_FIELD_SURFACE_BYTES,
  IRRADIANCE_FIELD_FRAME_BYTES,
  IRRADIANCE_FIELD_UNIFORM_BYTES,
  IRRADIANCE_FIELD_PENDING_OFFSET,
  IRRADIANCE_FIELD_LIGHTS_BYTES,
  packIrradianceFieldFrame,
  packIrradianceFieldUniform,
  irradianceFieldDepthClamp,
  IRRADIANCE_FIELD_REFLECTION_RAY_BYTES,
  IRRADIANCE_FIELD_REFLECTION_HISTORY_BYTES,
  IRRADIANCE_FIELD_COVERAGE_BYTES,
  IRRADIANCE_FIELD_COVERAGE_WGSL,
  createComputeLayout,
  irradianceFieldKernelWgsl,
  kernelResource,
  linearDispatch,
  createIrradianceFieldKernel,
  createIrradianceFieldSampleLayout,
  createIrradianceFieldViewKernels,
  createRasterProbePlacement,
  ProbeRayStatus,
  PROBE_RAYS_WGSL,
  createProbeRayRecorder,
  createRasterRayGenerator,
  parseGpuPassTimingTicks,
  summarizeGpuPassTimingIntervals,
  PROBE_MAX_CONTRIBUTORS,
  admitProbeContributors,
  scaledProbeWeight,
  blendLightProbes,
  ProbeBlendSceneProjection,
  SSR_HISTORY_FORMAT,
  SsrHistoryOwner,
  createSsrHistoryOwner
};
//# sourceMappingURL=chunk-NYKYJCUN.mjs.map
