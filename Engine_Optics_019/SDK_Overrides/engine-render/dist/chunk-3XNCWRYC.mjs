import {
  classifySceneDataCoverage
} from "./chunk-6Y4WOKOE.mjs";
import {
  cameraLensProjection,
  jitterCameraProjection,
  motionBlurTemporalDemand
} from "./chunk-XAU6MWMX.mjs";

// sdk/engine/node_modules/@forgeax/engine-render/src/temporal/temporal-view.ts
import { mat4 } from "@forgeax/engine-math";
var TEMPORAL_JITTER_SAMPLE_COUNT = 8;
var TEMPORAL_TAAU_DEPENDENCY_STATUS = "available";
function temporalViewId(worldId, entityKey) {
  const raw = entityKey >>> 0;
  const index = raw & 16777215;
  const generation = raw >>> 24 & 255;
  return `${worldId}:${index}:${generation}`;
}
function halton(index, base) {
  let result = 0;
  let fraction = 1 / base;
  let value = index;
  while (value > 0) {
    result += fraction * (value % base);
    value = Math.floor(value / base);
    fraction /= base;
  }
  return result;
}
function temporalJitterSample(temporalFrameIndex) {
  const sampleIndex = (Math.trunc(temporalFrameIndex) % TEMPORAL_JITTER_SAMPLE_COUNT + TEMPORAL_JITTER_SAMPLE_COUNT) % TEMPORAL_JITTER_SAMPLE_COUNT;
  const haltonIndex = sampleIndex + 1;
  return [halton(haltonIndex, 2) - 0.5, halton(haltonIndex, 3) - 0.5];
}
function temporalJitterUv(temporalFrameIndex, surfaceWidth, surfaceHeight) {
  const sample = temporalJitterSample(temporalFrameIndex);
  return [sample[0] / Math.max(1, surfaceWidth), sample[1] / Math.max(1, surfaceHeight)];
}
function resetReason(current, viewId, previous) {
  if (previous === void 0) return "first-frame";
  if (previous.viewId !== viewId) return "camera-switch";
  if (previous.historyVersion !== (current.historyVersion ?? 0)) {
    return "history-version-changed";
  }
  if (previous.projection !== current.projection) return "projection-kind-changed";
  if (!Object.is(previous.near, current.near) || !Object.is(previous.far, current.far)) {
    return "projection-range-changed";
  }
  return void 0;
}
function projectTemporalView(input) {
  const { camera } = input;
  const viewId = temporalViewId(camera.worldId ?? 0, camera.entityKey ?? 0);
  const currentJitterUv = temporalJitterUv(
    input.temporalFrameIndex,
    input.internalWidth ?? input.surfaceWidth,
    input.internalHeight ?? input.surfaceHeight
  );
  const view = mat4.invert(mat4.create(), camera.world);
  const projection = cameraLensProjection(camera);
  const currentUnjitteredViewProjection = mat4.multiply(mat4.create(), projection, view);
  const jitteredProjection = jitterCameraProjection(mat4.create(), projection, currentJitterUv);
  const currentJitteredViewProjection = mat4.multiply(mat4.create(), jitteredProjection, view);
  const reason = resetReason(camera, viewId, input.lastSubmitted);
  const historyValid = reason === void 0;
  return {
    viewId,
    historyVersion: camera.historyVersion ?? 0,
    temporalFrameIndex: input.temporalFrameIndex,
    historyValid,
    resetReason: reason,
    currentJitterUv,
    internalWidth: input.internalWidth ?? input.surfaceWidth,
    internalHeight: input.internalHeight ?? input.surfaceHeight,
    previousJitterUv: historyValid ? input.lastSubmitted?.jitterUv ?? currentJitterUv : currentJitterUv,
    currentJitteredViewProjection,
    currentUnjitteredViewProjection,
    previousUnjitteredViewProjection: historyValid ? input.lastSubmitted?.unjitteredViewProjection ?? currentUnjitteredViewProjection : currentUnjitteredViewProjection,
    projection: camera.projection,
    near: camera.near,
    far: camera.far
  };
}
function snapshotSubmittedTemporalView(view) {
  return {
    viewId: view.viewId,
    historyVersion: view.historyVersion,
    projection: view.projection,
    near: view.near,
    far: view.far,
    jitterUv: [view.currentJitterUv[0], view.currentJitterUv[1]],
    unjitteredViewProjection: new Float32Array(view.currentUnjitteredViewProjection)
  };
}

// sdk/engine/node_modules/@forgeax/engine-render/src/temporal/frame-coordinator.ts
import { err, ok } from "@forgeax/engine-types";

// sdk/engine/node_modules/@forgeax/engine-render/src/temporal/taa-history-store.ts
var nextHistoryToken = 1;
var TaaHistoryStore = class {
  token = nextHistoryToken++;
  deviceGeneration = 0;
  content = "uninitialized";
  requestVersion = 0;
  generation = 0;
  seed = 0;
  valid = false;
  attempt = "none";
  resetReason;
  begin(reason = void 0) {
    const generation = this.generation;
    const seed = this.seed;
    this.attempt = "active";
    let state = "active";
    return {
      generation,
      seed,
      commit: (receipt) => {
        if (state !== "active") return;
        if (receipt !== void 0 && (!receipt.completed || receipt.deviceGeneration !== this.deviceGeneration)) {
          state = "aborted";
          this.attempt = "aborted";
          return;
        }
        state = "committed";
        this.attempt = "committed";
        this.valid = true;
        this.content = "active";
        this.requestVersion += 1;
        this.generation += 1;
        this.seed += 1;
        this.resetReason = reason;
      },
      abort: () => {
        if (state !== "active") return;
        state = "aborted";
        this.attempt = "aborted";
      }
    };
  }
  seedHistory(reason = "first-frame") {
    this.valid = false;
    this.content = "uninitialized";
    this.resetReason = reason;
    this.attempt = "none";
  }
  reset(reason) {
    this.generation = 0;
    this.seed = 0;
    this.valid = false;
    this.content = "uninitialized";
    this.attempt = "none";
    this.resetReason = reason;
  }
  recoverForGeneration(deviceGeneration) {
    if (!Number.isSafeInteger(deviceGeneration) || deviceGeneration < 0) {
      throw new RangeError("deviceGeneration must be a non-negative safe integer.");
    }
    this.deviceGeneration = deviceGeneration;
    this.valid = false;
    this.content = "uninitialized";
    this.attempt = "none";
    this.resetReason = "device-generation";
  }
  inspect() {
    return {
      token: this.token,
      deviceGeneration: this.deviceGeneration,
      content: this.content,
      fallback: "neutral-texture",
      requestVersion: this.requestVersion,
      generation: this.generation,
      seed: this.seed,
      attempt: this.attempt,
      valid: this.valid,
      resetReason: this.resetReason
    };
  }
};

// sdk/engine/node_modules/@forgeax/engine-render/src/temporal/frame-coordinator.ts
function temporalFrameStageFromError(cause) {
  if (typeof cause === "object" && cause !== null && "stage" in cause) {
    const stage = cause.stage;
    if (stage === "build" || stage === "encode" || stage === "finish" || stage === "submit")
      return stage;
  }
  return "submit";
}
function failure(code, hint) {
  return {
    code,
    expected: code === "taa-unavailable" ? "TAA resources and capability are available" : "one temporal frame is active",
    hint
  };
}
var TemporalFrameCoordinator = class {
  historyStore;
  epoch;
  previous;
  consumerIds = [];
  active;
  attempt = "none";
  historyAttempt = "none";
  lastFailure;
  historyDirection = "a-to-b";
  temporalFrameIndex = 0;
  lastSubmittedView;
  coverage = {
    exactContributorIds: [],
    reactiveContributorIds: [],
    missingContributorIds: [],
    omittedMissingContributorCount: 0
  };
  historyAttempts = /* @__PURE__ */ new WeakMap();
  constructor(initial = {}) {
    this.historyStore = initial.historyStore ?? new TaaHistoryStore();
    this.epoch = initial.epoch ?? 0;
    this.previous = initial.previous;
  }
  begin(input) {
    const consumerIds = Object.freeze([...input.consumerIds ?? []]);
    const demanded = input.antialias === "taa" || input.temporalDemand === true || consumerIds.length > 0;
    if (!demanded) {
      return ok({
        epoch: this.epoch,
        current: input.current,
        previous: this.previous,
        history: { direction: this.historyDirection, valid: false },
        contributors: Object.freeze([...input.contributors ?? []]),
        requiredContributorIds: Object.freeze([...input.requiredContributorIds ?? []]),
        consumerIds,
        ...input.temporalView === void 0 ? {} : { temporalView: input.temporalView }
      });
    }
    if (input.available === false) {
      return err(
        failure("taa-unavailable", "enable rgba16float temporal targets and retry the frame")
      );
    }
    if (this.active !== void 0) {
      return err(
        failure(
          "temporal-active",
          "commit or abort the active temporal frame before beginning another"
        )
      );
    }
    const candidate = {
      epoch: this.epoch + 1,
      current: input.current,
      previous: this.previous,
      history: { direction: this.historyDirection, valid: this.previous !== void 0 },
      contributors: Object.freeze([...input.contributors ?? []]),
      requiredContributorIds: Object.freeze([...input.requiredContributorIds ?? []]),
      consumerIds,
      ...input.temporalView === void 0 ? {} : { temporalView: input.temporalView }
    };
    if (input.antialias === "taa") {
      this.historyAttempts.set(candidate, this.historyStore.begin());
    }
    this.active = candidate;
    this.attempt = "active";
    this.historyAttempt = input.antialias === "taa" ? "active" : "none";
    this.lastFailure = void 0;
    return ok(candidate);
  }
  commit(candidate) {
    if (this.active !== candidate) {
      return err(failure("temporal-not-active", "commit the candidate returned by begin"));
    }
    this.epoch = candidate.epoch;
    this.previous = candidate.current;
    if (candidate.temporalView !== void 0) {
      this.lastSubmittedView = snapshotSubmittedTemporalView(candidate.temporalView);
      this.temporalFrameIndex += 1;
    }
    this.historyDirection = candidate.history.direction === "a-to-b" ? "b-to-a" : "a-to-b";
    this.consumerIds = candidate.consumerIds;
    const historyAttempt = this.historyAttempts.get(candidate);
    historyAttempt?.commit({
      deviceGeneration: this.historyStore.inspect().deviceGeneration,
      completed: true
    });
    this.coverage = classifySceneDataCoverage({
      contributors: candidate.contributors,
      requiredContributorIds: candidate.requiredContributorIds
    });
    this.active = void 0;
    historyAttempt?.abort();
    this.historyAttempts.delete(candidate);
    this.attempt = "committed";
    this.historyAttempt = historyAttempt === void 0 ? "none" : "committed";
    return ok({
      epoch: this.epoch,
      previous: candidate.current,
      historyDirection: candidate.history.direction
    });
  }
  abort(candidate, stage = "submit") {
    if (this.active !== candidate) return;
    this.historyAttempts.get(candidate)?.abort();
    this.historyAttempts.delete(candidate);
    this.active = void 0;
    this.attempt = "aborted";
    this.historyAttempt = "aborted";
    this.lastFailure = stage;
  }
  run(input, phases) {
    const started = this.begin(input);
    if (!started.ok) return started;
    const candidate = started.value;
    if (input.antialias !== "taa" && input.temporalDemand !== true && (input.consumerIds?.length ?? 0) === 0) {
      return ok(void 0);
    }
    try {
      const built = phases.build();
      phases.encode(built);
      phases.finish();
      phases.submit();
    } catch (cause) {
      const stage = temporalFrameStageFromError(cause);
      this.abort(candidate, stage);
      return err({
        code: "temporal-not-active",
        expected: `temporal ${stage} succeeds before commit`,
        hint: "inspect the underlying stage failure and retry the frame",
        detail: { stage, cause }
      });
    }
    return this.commit(candidate);
  }
  inspect() {
    return {
      epoch: this.epoch,
      previous: this.previous,
      consumerIds: this.consumerIds,
      historyAttempt: this.historyAttempt,
      attempt: this.attempt,
      lastFailure: this.lastFailure,
      coverage: this.coverage
    };
  }
  /**
   * Derive the current/previous camera matrices without mutating history.
   * `commit()` is the only operation that publishes the returned view, so a
   * graph/finish/submit failure leaves the last successful view intact.
   */
  prepareTemporalView(camera, surfaceWidth, surfaceHeight) {
    const demanded = camera.antialias === "taa" || camera.motionBlur !== void 0 && motionBlurTemporalDemand({
      shutterAngle: camera.motionBlur.shutterAngle,
      maxRadiusPixels: camera.motionBlur.maxRadiusPixels,
      sampleCount: camera.motionBlur.sampleCount,
      targetFps: camera.motionBlur.targetFps ?? 60
    });
    if (!demanded) return void 0;
    return projectTemporalView({
      camera,
      temporalFrameIndex: this.temporalFrameIndex,
      surfaceWidth,
      surfaceHeight,
      ...this.lastSubmittedView === void 0 ? {} : { lastSubmitted: this.lastSubmittedView }
    });
  }
  reset(reason = "recover") {
    void reason;
    this.active = void 0;
    this.epoch = 0;
    this.previous = void 0;
    this.temporalFrameIndex = 0;
    this.lastSubmittedView = void 0;
    this.historyDirection = "a-to-b";
    this.historyStore.reset(
      reason === "cut" || reason === "camera-switch" ? "camera-cut" : reason === "resize" ? "resize" : reason === "device-generation" || reason === "device-loss" ? "device-generation" : "recover"
    );
    this.attempt = "none";
    this.historyAttempt = "none";
    this.lastFailure = void 0;
    this.coverage = {
      exactContributorIds: [],
      reactiveContributorIds: [],
      missingContributorIds: [],
      omittedMissingContributorCount: 0
    };
    this.consumerIds = [];
  }
};

export {
  TEMPORAL_JITTER_SAMPLE_COUNT,
  TEMPORAL_TAAU_DEPENDENCY_STATUS,
  temporalViewId,
  temporalJitterSample,
  projectTemporalView,
  snapshotSubmittedTemporalView,
  temporalFrameStageFromError,
  TemporalFrameCoordinator
};
//# sourceMappingURL=chunk-3XNCWRYC.mjs.map
