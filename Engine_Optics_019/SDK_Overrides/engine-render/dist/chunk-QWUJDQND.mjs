import {
  SCENE_DATA_TEMPORAL_V1_SCHEMA,
  registerSceneDataTarget,
  sceneDataTargetOwner,
  sceneDataTokenMismatch
} from "./chunk-JWVQREUV.mjs";
import {
  SceneDataUnavailableError
} from "./chunk-XAU6MWMX.mjs";

// sdk/engine/node_modules/@forgeax/engine-render/src/temporal/scene-data-catalog.ts
import { err, ok } from "@forgeax/engine-types";
function availability(options) {
  if (options.recovering) return { status: "unavailable", reason: "renderer-recovering" };
  if (!options.rgba16floatRenderable)
    return { status: "unavailable", reason: "capability-missing" };
  if (options.producerPresent === false)
    return { status: "unavailable", reason: "producer-missing" };
  if (options.coverageComplete === false)
    return { status: "unavailable", reason: "coverage-incomplete" };
  return {
    status: "available",
    completeness: options.reactiveFallback ? "exact-with-reactive-fallback" : "exact"
  };
}
function createTarget(owner) {
  const target = Object.freeze({
    kind: "scene-data",
    schema: SCENE_DATA_TEMPORAL_V1_SCHEMA,
    access: "sampled-read",
    format: "rgba16float",
    sampleCount: 1,
    extent: "render-resolution"
  });
  registerSceneDataTarget(target, {
    featureIdentity: owner.featureIdentity,
    planIdentity: owner.planIdentity,
    generation: owner.generation
  });
  return target;
}
function tokenError(catalog, operation) {
  return sceneDataTokenMismatch(
    operation,
    "foreign-kind",
    {
      featureIdentity: catalog.featureIdentity,
      planIdentity: catalog.planIdentity,
      generation: catalog.generation
    },
    void 0
  );
}
function unavailableError(options, reason) {
  const recovery = reason === "capability-missing" ? "enable-capability" : reason === "renderer-recovering" ? "renderer-recover" : "next-frame";
  return new SceneDataUnavailableError({
    featureIdentity: options.featureIdentity,
    schema: SCENE_DATA_TEMPORAL_V1_SCHEMA,
    lane: options.lane ?? "direct",
    reason,
    missingContributorIds: options.missingContributorIds ?? [],
    omittedMissingContributorCount: 0,
    recovery
  });
}
function createSceneDataCatalog(options) {
  const state = availability(options);
  const owner = {
    featureIdentity: options.featureIdentity,
    planIdentity: options.planIdentity,
    generation: options.generation
  };
  const missing = [...options.missingContributorIds ?? []];
  const inspectionBase = {
    schema: SCENE_DATA_TEMPORAL_V1_SCHEMA,
    generation: options.generation,
    planIdentity: options.planIdentity,
    lane: options.lane ?? "direct",
    missingContributorIds: Object.freeze(missing.slice(0, 32)),
    omittedMissingContributorCount: Math.max(0, missing.length - 32)
  };
  return {
    schema: SCENE_DATA_TEMPORAL_V1_SCHEMA,
    generation: options.generation,
    planIdentity: options.planIdentity,
    availability: state,
    require(schema) {
      if (schema !== SCENE_DATA_TEMPORAL_V1_SCHEMA || state.status !== "available") {
        if (state.status === "unavailable") throw unavailableError(options, state.reason);
        throw tokenError(options, "require scene-data target");
      }
      return createTarget(options);
    },
    validate(target, generation = options.generation) {
      const targetOwner = sceneDataTargetOwner(target);
      if (targetOwner === void 0) {
        return err(
          sceneDataTokenMismatch("validate scene-data target", "foreign-feature", owner, target)
        );
      }
      if (targetOwner.planIdentity !== owner.planIdentity || targetOwner.featureIdentity !== owner.featureIdentity) {
        return err(
          sceneDataTokenMismatch("validate scene-data target", "foreign-feature", owner, target)
        );
      }
      if (generation !== owner.generation || targetOwner.generation !== owner.generation) {
        return err(
          sceneDataTokenMismatch(
            "validate scene-data target",
            "generation-mismatch",
            owner,
            target
          )
        );
      }
      if (target.access !== "sampled-read") {
        return err(
          sceneDataTokenMismatch("validate scene-data target", "layout-mismatch", owner, target)
        );
      }
      return ok(target);
    },
    inspect() {
      return Object.freeze(
        state.status === "available" ? { ...inspectionBase, status: state.status, completeness: state.completeness } : { ...inspectionBase, status: state.status, reason: state.reason }
      );
    }
  };
}

export {
  createSceneDataCatalog
};
//# sourceMappingURL=chunk-QWUJDQND.mjs.map
