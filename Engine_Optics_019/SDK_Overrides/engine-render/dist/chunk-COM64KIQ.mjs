import {
  STANDARD_TEMPORAL_FORMAT,
  addTypedScenePass,
  createRenderPipelineTarget,
  renderExtentSize,
  selectMainPassMaterials
} from "./chunk-JWVQREUV.mjs";
import {
  COLOR_PASS_SELECTOR,
  DEFERRED_PASS_SELECTOR,
  SceneDataUnavailableError,
  motionBlurTemporalDemand
} from "./chunk-XAU6MWMX.mjs";

// sdk/engine/node_modules/@forgeax/engine-render/src/temporal/standard-scene-data.ts
import { err, ok } from "@forgeax/engine-types";
function standardSceneTemporalDemand(camera, sceneConsumer = false) {
  if (camera === void 0) return false;
  const motionBlur = camera.motionBlur;
  return sceneConsumer || camera.antialias === "taa" || motionBlur !== void 0 && motionBlurTemporalDemand({
    ...motionBlur,
    targetFps: motionBlur.targetFps ?? 60
  });
}
function aggregateTemporalDemand(input) {
  const consumerIds = [
    ...input.taa ? ["taa"] : [],
    ...input.motionBlur ? ["motion-blur"] : [],
    ...input.ssr ? ["ssr"] : [],
    ...input.visibleSurface ? ["visible-surface"] : []
  ];
  const requested = consumerIds.length > 0;
  return Object.freeze({
    consumerIds: Object.freeze(consumerIds),
    targetCount: requested ? 1 : 0,
    producerPassCount: requested ? 1 : 0,
    historyCount: input.taa ? 1 : 0
  });
}
function describeTemporalDemand(demand) {
  return {
    consumerCount: demand.consumerIds.length,
    targetCount: demand.targetCount,
    producerPassCount: demand.producerPassCount,
    historyCount: demand.historyCount,
    byteLength: demand.targetCount
  };
}
function standardTemporalLaneAdmission(input) {
  if (input.demand.targetCount === 0) return { status: "unavailable", reason: "no-demand" };
  if (input.capabilities.producerPresent === false)
    return { status: "unavailable", reason: "producer-missing" };
  if (!input.capabilities.rgba16floatRenderable || input.capabilities.filterable === false || input.capabilities.copy === false || input.capabilities.readback === false) {
    return { status: "unavailable", reason: "capability-missing" };
  }
  return {
    status: "available",
    schema: "forgeax::scene-data::temporal-v1",
    producerId: "forgeax::standard::scene-data",
    structuralOnly: input.lane === "rhi-null",
    format: "rgba16float"
  };
}
function requireStandardTemporalLane(input) {
  const lane = input.compute ? "clustered" : "cpu-webgl2";
  const admission = standardTemporalLaneAdmission({
    lane,
    demand: input.demand,
    capabilities: {
      compute: input.compute,
      storageBuffer: input.storageBuffer,
      rgba16floatRenderable: input.rgba16floatRenderable
    }
  });
  if (admission.status === "available" || admission.reason === "no-demand") return ok(void 0);
  return err(
    new SceneDataUnavailableError({
      featureIdentity: "forgeax::standard",
      schema: "forgeax::scene-data::temporal-v1",
      lane,
      reason: admission.reason,
      missingContributorIds: [],
      omittedMissingContributorCount: 0,
      recovery: "enable-capability"
    })
  );
}
function standardTemporalPostOrder(input) {
  const order = ["scene"];
  if (input.taa || input.motionBlur) order.push("standard-scene-data");
  if (input.taa) order.push("taa-resolve");
  if (input.motionBlur) order.push("motion-blur");
  if (input.bloom) order.push("bloom", "tone");
  order.push("output");
  return Object.freeze(order);
}
var TEMPORAL_TARGET = {
  format: STANDARD_TEMPORAL_FORMAT,
  size: "surface",
  sampleCount: 1
};
function createStandardSceneDataTarget(graph, extent) {
  const temporal = createRenderPipelineTarget(graph, "standard-scene-temporal", {
    ...TEMPORAL_TARGET,
    size: extent === void 0 ? TEMPORAL_TARGET.size : renderExtentSize(extent, "internal")
  });
  return temporal.ok ? ok({ temporal: temporal.value }) : temporal;
}
function addStandardSceneDataPass(graph, target, depth, gpuDriven, surfaces = "opaque") {
  const selector = COLOR_PASS_SELECTOR;
  const excludeSelector = surfaces === "forward-only-opaque" ? DEFERRED_PASS_SELECTOR : void 0;
  return addTypedScenePass(graph, {
    name: "standard-scene-data",
    // GBuffer already wrote this loaded target. An empty CPU supplement has
    // no work. The GPU owner derives live eligibility from its encoder predicate.
    executeIf: surfaces === "opaque" ? void 0 : (frame) => selectMainPassMaterials(
      frame,
      selector,
      "opaque",
      excludeSelector
    )?.size !== 0 || gpuDriven?.hasWork(surfaces, "fs_temporal") === true,
    gpuDrivenFilter: surfaces,
    ...gpuDriven === void 0 ? {} : { gpuDriven },
    color: target,
    depth,
    selector,
    ...excludeSelector === void 0 ? {} : { excludeSelector },
    // The temporal producer runs before the Surface raw-depth/nearest-layer
    // pair. Keep it on the ordinary opaque Standard lane rather than asking
    // a medium material to assemble a bind group from resources that this
    // pass cannot own yet.
    recordMode: "opaque",
    passKind: "temporal",
    // The temporal producer re-rasterizes the current scene after the main
    // color pass has populated depth. Its output is a semantic motion target;
    // it must cover the same fragments even when TAA jitter moves the raster
    // edge by a subpixel, while the loaded scene depth remains the consumer's
    // depth-rejection source for Motion Blur/TAA.
    clearColor: [0, 0, -1, 1],
    colorLoadOp: surfaces === "opaque" ? "clear" : "load",
    depthLoadOp: "load"
  });
}

export {
  standardSceneTemporalDemand,
  aggregateTemporalDemand,
  describeTemporalDemand,
  standardTemporalLaneAdmission,
  requireStandardTemporalLane,
  standardTemporalPostOrder,
  createStandardSceneDataTarget,
  addStandardSceneDataPass
};
//# sourceMappingURL=chunk-COM64KIQ.mjs.map
