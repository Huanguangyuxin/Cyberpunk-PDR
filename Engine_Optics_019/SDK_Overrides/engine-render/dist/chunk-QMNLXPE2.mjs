import {
  RAY_REFERENCE_LIMIT,
  RenderPublicationError,
  freezeDiffuseGi,
  freezeGlobalSdfGrid,
  terrainDrawSection,
  validateCardCapture,
  validateDiffuseGi,
  validateGlobalSdfRegion
} from "./chunk-5JZNU5U3.mjs";
import {
  GlyphText,
  ProjectedDecalInvalidError
} from "./chunk-MVY4ZZCX.mjs";
import {
  PMREM_FACES_PER_STEP,
  RENDER_TARGET_DEPTH_ATTACHMENT,
  STANDARD_LIGHT_COUNTS,
  STANDARD_PIPELINE_ID,
  STANDARD_POST_STAGE_NAMES,
  admitRenderTargetDescriptor,
  canvasTextureState,
  createRenderTargetMaterialSource,
  isCanvasTextureSource,
  isExternalTextureSource,
  pmremExtent,
  renderTargetLayerCount,
  renderTargetMipCount,
  resolveRenderTargetMaterialSource,
  resolveRenderTargetMipExtent,
  retireRenderTargetMaterialSources,
  unavailableGeometry
} from "./chunk-JWVQREUV.mjs";
import {
  EquirectProjectionFailedError,
  ExternalTextureInvalidError,
  ExternalTextureStateInvalidError,
  FramebufferSnapshotFailedError,
  GPU_BUFFER_USAGE_COPY_DST,
  GPU_BUFFER_USAGE_MAP_READ,
  GPU_TEXTURE_USAGE_COPY_DST,
  GPU_TEXTURE_USAGE_COPY_SRC,
  GPU_TEXTURE_USAGE_RENDER_ATTACHMENT,
  GPU_TEXTURE_USAGE_TEXTURE_BINDING,
  Instances,
  Layer,
  Lines,
  MaterialResource,
  MaterialSampledTextureBudgetExceededError,
  MeshFilter,
  MeshRenderer,
  MotionBlurValidationError,
  PointShapeValue,
  Points,
  PointsLinesBudgetExceededError,
  PointsLinesInvalidStyleError,
  PointsLinesMaterialUnsupportedError,
  PointsLinesTopologyMismatchError,
  RenderTargetCapabilityMissingError,
  RenderTargetDescriptorInvalidError,
  RenderTargetLayerInvalidError,
  RenderTargetOperationFailedError,
  RenderTargetStateInvalidError,
  RendererContractFailureError,
  RendererOperationError,
  SHADOW_ATLAS_DEFAULT_LAYERS,
  ShadowParticipation,
  SortKey,
  SpriteInstances,
  SpriteRegionOverride,
  Tilemap,
  Visibility,
  computeProjectionMatrix,
  computeViewMatrix,
  gpuDrivenSourceDrawItemIndex,
  lineCapFromU32,
  lineWidthUnitsFromU32,
  pointShapeFromU32,
  renderTextureSourceKey,
  resolveSsaoParameters,
  worldEntityKey
} from "./chunk-XAU6MWMX.mjs";

// sdk/engine/node_modules/@forgeax/engine-render/src/errors/scene-sdf.ts
var SceneSdfUnavailableError = class extends Error {
  code = "scene-sdf-unavailable";
  expected = "a current geometric field for the complete requested World and range";
  hint = "inspect detail, cook the same Mesh GUID with a geometric distance-field policy, or recover the named producer";
  detail;
  constructor(detail) {
    super(`Scene SDF unavailable: ${detail.reason}`);
    this.name = "SceneSdfUnavailableError";
    this.detail = detail;
  }
};

// sdk/engine/node_modules/@forgeax/engine-render/src/assembly/renderer-facade.ts
import { err, ok } from "@forgeax/engine-rhi";

// sdk/engine/node_modules/@forgeax/engine-render/src/assembly/renderer-lifecycle.ts
function isRendererStateOperational(state) {
  return state === "alive";
}
var RECOVERY_TOTAL_DEADLINE_MS = 2e4;
var RECOVERY_ADAPTER_DEADLINE_MS = 1e4;
var RECOVERY_DEVICE_DEADLINE_MS = 1e4;
var RENDERER_STATES = [
  "alive",
  "device-lost",
  "recovering",
  "faulted",
  "disposed"
];
var ALLOWED_TRANSITIONS = {
  alive: ["device-lost", "faulted", "disposed"],
  "device-lost": ["recovering", "faulted", "disposed"],
  recovering: ["alive", "device-lost", "faulted", "disposed"],
  faulted: ["disposed"],
  disposed: []
};
function createRendererLifecycle(initial = "alive") {
  if (!RENDERER_STATES.includes(initial)) {
    throw new RangeError(`Unknown renderer lifecycle state: ${initial}`);
  }
  let current = initial;
  return {
    state: () => current,
    transition: (next) => {
      if (!ALLOWED_TRANSITIONS[current].includes(next)) return false;
      current = next;
      return true;
    },
    states: () => RENDERER_STATES
  };
}
function createRecoveryDeadline(startedAt) {
  if (!Number.isFinite(startedAt)) throw new RangeError("Recovery deadline requires finite time.");
  const deadlineAt = startedAt + RECOVERY_TOTAL_DEADLINE_MS;
  let deviceAcquisitionStartedAt;
  return {
    startedAt,
    totalDeadlineMs: RECOVERY_TOTAL_DEADLINE_MS,
    adapterDeadlineMs: RECOVERY_ADAPTER_DEADLINE_MS,
    deviceDeadlineMs: RECOVERY_DEVICE_DEADLINE_MS,
    deadlineAt,
    beginDeviceAcquisition: (now) => {
      if (!Number.isFinite(now)) throw new RangeError("Device acquisition requires finite time.");
      deviceAcquisitionStartedAt ??= now;
    },
    isValid: (phase, now) => {
      const phaseDeadline = phase === "acquire-adapter" ? startedAt + RECOVERY_ADAPTER_DEADLINE_MS : phase === "acquire-device" ? Math.min(
        (deviceAcquisitionStartedAt ?? startedAt) + RECOVERY_DEVICE_DEADLINE_MS,
        deadlineAt
      ) : deadlineAt;
      return Number.isFinite(now) && now < phaseDeadline;
    },
    elapsed: (now) => Math.max(0, now - startedAt)
  };
}
function createRecoveryContinuation(deadline, cleanup) {
  let valid = true;
  let cleaned = false;
  return {
    isValid: (phase, now) => {
      if (!valid || !deadline.isValid(phase, now)) {
        valid = false;
        return false;
      }
      return true;
    },
    abandon: (now) => {
      if (!deadline.isValid("cleanup", now)) valid = false;
      valid = false;
    },
    cleanupOnce: () => {
      if (cleaned) return;
      cleaned = true;
      cleanup();
    }
  };
}
function createSingleFlight(factory) {
  let active;
  return {
    run: () => {
      if (active !== void 0) return active;
      let promise;
      try {
        promise = factory();
      } catch (cause) {
        promise = Promise.reject(cause);
      }
      active = promise;
      promise.then(
        () => {
          if (active === promise) active = void 0;
        },
        () => {
          if (active === promise) active = void 0;
        }
      );
      return promise;
    },
    inFlight: () => active
  };
}

// sdk/engine/node_modules/@forgeax/engine-render/src/errors/recover.ts
var RECOVER_ERROR_POLICY = {
  "recover-not-needed": {
    message: "recover-not-needed: renderer is not in a degraded state",
    expected: "renderer is healthy; use state() or inspect() to confirm degraded state before calling recover()",
    hint: "use state() or inspect().state to confirm degraded state before calling recover()"
  },
  "recover-not-implemented": {
    message: "recover-not-implemented: self-heal recovery is not yet implemented",
    expected: "recovery is not yet implemented; self-heal lands in S5",
    hint: "self-heal recovery lands in S5; inspect().state still reflects the lifecycle state"
  },
  "recover-adapter-unavailable": {
    message: "recover-adapter-unavailable: requestAdapter returned no adapter during rebuild",
    expected: "requestAdapter returned null; driver/GPU may have been reset",
    hint: "retry recover() after a host-chosen delay; adapter availability is transient"
  },
  "recover-device-unavailable": {
    message: "recover-device-unavailable: requestDevice failed or threw during rebuild",
    expected: "requestDevice failed or threw",
    hint: "retry recover() after a host-chosen delay; device creation is driver-dependent"
  }
};
var RecoverError = class extends Error {
  code;
  expected;
  hint;
  constructor(code) {
    const policy = RECOVER_ERROR_POLICY[code];
    super(policy.message);
    this.code = code;
    this.expected = policy.expected;
    this.hint = policy.hint;
    this.name = "RecoverError";
  }
};
var RecoveryFailedError = class extends Error {
  code = "recovery-failed";
  expected = "one recovery attempt publishes a complete replacement device generation";
  hint = "inspect detail and follow its guidance";
  detail;
  constructor(detail) {
    super("renderer recovery failed");
    this.name = "RecoveryFailedError";
    this.detail = Object.freeze({
      ...detail,
      cleanupFailures: Object.freeze([...detail.cleanupFailures])
    });
  }
};
function createRecoveryFailedError(detail) {
  return new RecoveryFailedError(detail);
}

// sdk/engine/node_modules/@forgeax/engine-render/src/assembly/renderer-facade.ts
function exposeRenderer(renderer) {
  const listeners = /* @__PURE__ */ new Set();
  const lifecycle = createRendererLifecycle(renderer.inspect().state);
  let scheduledFrame;
  let disposeInFlight;
  let synchronousDrawDepth = 0;
  let synchronousDrawDrained;
  let disposed = lifecycle.state() === "disposed";
  let recoverInFlight;
  const dynamicGeometryFault = (world) => renderer.dynamicGeometryFault?.(world);
  const emit = (event) => {
    for (const listener of listeners) {
      try {
        listener(event);
      } catch (cause) {
        console.error("[Renderer.subscribe] listener threw:", cause);
      }
    }
  };
  const transition = (next) => {
    const previous = lifecycle.state();
    if (previous === next || !lifecycle.transition(next)) return;
    emit(Object.freeze({ kind: "state-changed", previous, current: next }));
  };
  const eventError = (cause) => cause instanceof RendererOperationError || cause instanceof EquirectProjectionFailedError || cause instanceof ExternalTextureInvalidError || cause instanceof ExternalTextureStateInvalidError || cause instanceof MaterialSampledTextureBudgetExceededError ? cause : new RendererOperationError("device-operation-failed", {
    operation: "renderer-event",
    cause: structuredRendererCause(cause, "renderer-event")
  });
  const drawError = (cause) => {
    if (cause instanceof MotionBlurValidationError || cause instanceof RenderPublicationError || cause instanceof ProjectedDecalInvalidError)
      return cause;
    if (cause instanceof RendererOperationError) return cause;
    if (cause instanceof RendererContractFailureError) {
      return new RendererOperationError("device-operation-failed", {
        operation: "draw",
        cause: structuredRendererCause(cause, "draw")
      });
    }
    return new RendererOperationError("device-operation-failed", {
      operation: "draw",
      cause: structuredRendererCause(cause, "draw")
    });
  };
  const assertPreparationIdle = () => {
    if (scheduledFrame !== void 0)
      throw new RendererContractFailureError(
        "draw",
        "one active Renderer preparation without interleaved mutation"
      );
  };
  const afterScheduledPreparation = async (action) => {
    while (scheduledFrame !== void 0) {
      const active = scheduledFrame;
      try {
        await active.done;
      } catch {
      }
    }
    return action();
  };
  const projectSubmittedFrame = (result, frameFailure) => {
    if (!result.ok)
      return err(
        result.error instanceof RendererContractFailureError && frameFailure !== void 0 ? frameFailure : drawError(result.error)
      );
    emit(
      Object.freeze({
        kind: "frame-submitted",
        frameId: result.value.frameId,
        deviceGeneration: result.value.deviceGeneration,
        ...result.value.graphGeneration === void 0 ? {} : { graphGeneration: result.value.graphGeneration },
        receipt: result.value
      })
    );
    return ok(result.value);
  };
  const offHostEvents = renderer.subscribeHostEvents((event) => {
    if (event.kind === "error") {
      emit(Object.freeze({ kind: "error", error: eventError(event.error) }));
      return;
    }
    transition(
      event.health.reason === "device-lost" ? "device-lost" : event.health.reason === "internal-fault" ? "faulted" : "alive"
    );
  });
  return {
    setSurfaceDynamicInput: (frame) => {
      assertPreparationIdle();
      renderer.setSurfaceDynamicInput(frame);
    },
    bounds: (world, entity) => disposed ? void 0 : renderer.bounds(world, entity),
    attach: (world) => {
      assertPreparationIdle();
      const result = renderer.attach(world);
      return result.ok ? result : err(
        new RendererOperationError("world-lease-invalid", {
          operation: "attach",
          cause: result.error
        })
      );
    },
    prepareDynamicGeometryPipelines: (candidates, options) => afterScheduledPreparation(
      () => renderer.prepareDynamicGeometryPipelines(candidates, options)
    ),
    prepareDynamicGeometry: (input) => {
      assertPreparationIdle();
      const fault = dynamicGeometryFault(input.world);
      return fault === void 0 ? renderer.prepareDynamicGeometry(input) : err(fault);
    },
    prepareDynamicGeometryCandidates: (inputs) => {
      assertPreparationIdle();
      const first = inputs[0];
      const fault = first === void 0 ? void 0 : dynamicGeometryFault(first.world);
      return fault === void 0 ? renderer.prepareDynamicGeometryCandidates(inputs) : err(fault);
    },
    preparePublishedMeshResidency: async (input, inputOwnership, options) => {
      const prepared = await afterScheduledPreparation(
        () => renderer.preparePublishedMeshResidency(input, inputOwnership, options)
      );
      if (!prepared.ok) return prepared;
      const lease = prepared.value;
      return ok({
        ...lease,
        // A previously issued lease may be released while a newer frame holds
        // its extracted references. Recheck every active preparation owner.
        release: (evict) => afterScheduledPreparation(() => lease.release(evict))
      });
    },
    prepareMeshResidency: (world, meshHandle, observePhase) => {
      assertPreparationIdle();
      return renderer.prepareMeshResidency(world, meshHandle, observePhase);
    },
    acceptDynamicGeometry: (candidate, ordering) => {
      assertPreparationIdle();
      const fault = dynamicGeometryFault(candidate.world);
      return fault === void 0 ? renderer.acceptDynamicGeometry(candidate, ordering) : err(fault);
    },
    acceptDynamicGeometryCandidates: (candidates, ordering) => {
      assertPreparationIdle();
      const first = candidates[0];
      const fault = first === void 0 ? void 0 : dynamicGeometryFault(first.world);
      return fault === void 0 ? renderer.acceptDynamicGeometryCandidates(candidates, ordering) : err(fault);
    },
    isDynamicGeometryCurrent: (candidate) => lifecycle.state() === "alive" && renderer.isDynamicGeometryCurrent(candidate),
    dynamicGeometryReceipt: (candidate) => dynamicGeometryFault(candidate.world) === void 0 ? renderer.dynamicGeometryReceipt(candidate) : void 0,
    cancelDynamicGeometry: (candidate) => {
      assertPreparationIdle();
      const fault = dynamicGeometryFault(candidate.world);
      return fault === void 0 ? renderer.cancelDynamicGeometry(candidate) : err(fault);
    },
    retireDynamicGeometry: (candidate) => {
      assertPreparationIdle();
      const fault = dynamicGeometryFault(candidate.world);
      return fault === void 0 ? renderer.retireDynamicGeometry(candidate) : err(fault);
    },
    retireSupersededDynamicGeometry: (candidate, successor) => {
      assertPreparationIdle();
      const fault = dynamicGeometryFault(candidate.world);
      return fault === void 0 ? renderer.retireSupersededDynamicGeometry(candidate, successor) : err(fault);
    },
    createRenderTarget: (descriptor) => {
      assertPreparationIdle();
      return renderer.createRenderTarget(descriptor);
    },
    resizeRenderTarget: (target, descriptor) => {
      assertPreparationIdle();
      return renderer.resizeRenderTarget(target, descriptor);
    },
    createRenderTargetTextureSource: (target, options) => {
      assertPreparationIdle();
      return renderer.createRenderTargetTextureSource(target, options);
    },
    requestTargetReadback: (target, request) => {
      assertPreparationIdle();
      return renderer.requestTargetReadback(target, request);
    },
    requestFramebufferSnapshot: (target, request) => {
      assertPreparationIdle();
      return renderer.requestFramebufferSnapshot(target, request);
    },
    destroyRenderTarget: (target) => {
      assertPreparationIdle();
      return renderer.destroyRenderTarget(target);
    },
    importTexture: (input) => {
      assertPreparationIdle();
      return renderer.importTexture(input);
    },
    nativeDevice: () => renderer.nativeDevice(),
    setProfile: (profile) => {
      assertPreparationIdle();
      const state = lifecycle.state();
      if (!isRendererStateOperational(state)) {
        return err(
          new RendererOperationError("renderer-state-invalid", {
            operation: "set-profile",
            state
          })
        );
      }
      return renderer.setProfile(profile);
    },
    setOutputColorSpace: (colorSpace) => {
      assertPreparationIdle();
      const state = lifecycle.state();
      if (!isRendererStateOperational(state)) {
        return err(
          new RendererOperationError("renderer-state-invalid", {
            operation: "set-output-color-space",
            state
          })
        );
      }
      return renderer.setOutputColorSpace(colorSpace);
    },
    state: () => lifecycle.state(),
    draw: (request) => {
      const state = lifecycle.state();
      if (disposed || !isRendererStateOperational(state)) {
        return err(
          new RendererOperationError("renderer-state-invalid", {
            operation: "draw",
            state
          })
        );
      }
      assertPreparationIdle();
      let frameFailure;
      const observeFailure = (event) => {
        if (event.kind === "error") frameFailure ??= event.error;
      };
      listeners.add(observeFailure);
      let result;
      synchronousDrawDepth++;
      try {
        result = renderer.drawFrame(request);
      } finally {
        listeners.delete(observeFailure);
        if (--synchronousDrawDepth === 0) {
          synchronousDrawDrained?.();
          synchronousDrawDrained = void 0;
        }
      }
      return projectSubmittedFrame(result, frameFailure);
    },
    drawScheduled: (request, schedule) => {
      const state = lifecycle.state();
      const scheduledDraw = renderer.drawFrameScheduled;
      if (!isRendererStateOperational(state) || disposed || scheduledFrame !== void 0 || scheduledDraw === void 0)
        return Promise.resolve(
          err(new RendererOperationError("renderer-state-invalid", { operation: "draw", state }))
        );
      const controller = new AbortController();
      const cancel = () => controller.abort();
      schedule.signal?.addEventListener("abort", cancel, { once: true });
      if (schedule.signal?.aborted) controller.abort();
      let resolveDone;
      let rejectDone;
      const done = new Promise((resolve, reject) => {
        resolveDone = resolve;
        rejectDone = reject;
      });
      const active = { controller, done };
      scheduledFrame = active;
      void (async () => {
        let frameFailure;
        const observeFailure = (event) => {
          if (event.kind === "error") frameFailure ??= event.error;
        };
        listeners.add(observeFailure);
        try {
          const result = await scheduledDraw.call(renderer, request, {
            checkpoint: schedule.checkpoint,
            signal: controller.signal,
            isCurrent: () => !disposed && isRendererStateOperational(lifecycle.state()) && (schedule.isCurrent?.() ?? true)
          });
          return projectSubmittedFrame(result, frameFailure);
        } finally {
          listeners.delete(observeFailure);
          schedule.signal?.removeEventListener("abort", cancel);
        }
      })().then(resolveDone, rejectDone);
      const clear = () => {
        if (scheduledFrame === active) scheduledFrame = void 0;
      };
      void done.then(clear, clear);
      return done;
    },
    requestObservation: (domains) => {
      assertPreparationIdle();
      return renderer.requestObservation?.(domains) ?? err(
        new RendererOperationError("renderer-state-invalid", {
          operation: "request-observation",
          state: lifecycle.state()
        })
      );
    },
    currentDeviceGeneration: () => renderer.currentDeviceGeneration?.() ?? renderer.inspect().frame.deviceGeneration,
    inspect: (options) => ({ ...renderer.inspect(options), state: lifecycle.state() }),
    observeGeometry: (receipt) => renderer.observeGeometry?.(receipt) ?? Promise.resolve(
      unavailableGeometry("unsupported-renderer", receipt.frameId, receipt.deviceGeneration)
    ),
    observe: (receipt, request) => renderer.observe(receipt, request),
    subscribe: (listener) => {
      if (disposed) return () => void 0;
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    releaseSurface: () => {
      assertPreparationIdle();
      const result = renderer.releaseSurface();
      return result.ok ? result : err(
        new RendererOperationError("surface-unavailable", {
          operation: "release-surface",
          cause: result.error
        })
      );
    },
    restoreSurface: () => {
      assertPreparationIdle();
      const result = renderer.restoreSurface();
      return result.ok ? result : err(
        new RendererOperationError("surface-unavailable", {
          operation: "restore-surface",
          cause: result.error
        })
      );
    },
    recover: () => {
      if (recoverInFlight !== void 0) return recoverInFlight;
      const state = lifecycle.state();
      if (state !== "device-lost") {
        return Promise.resolve(
          err(
            new RendererOperationError("renderer-state-invalid", {
              operation: "recover",
              state
            })
          )
        );
      }
      transition("recovering");
      scheduledFrame?.controller.abort();
      recoverInFlight = Promise.resolve(scheduledFrame?.done).catch(() => void 0).then(() => renderer.recover()).then((result) => {
        if (!result.ok) {
          const error = new RendererOperationError("recovery-failed", {
            operation: "recover",
            ...projectRecoveryFailureDetail(result.error, renderer.inspect().recovery),
            cause: structuredRendererCause(result.error, "recover")
          });
          emit(Object.freeze({ kind: "error", error }));
          return err(error);
        }
        return ok(void 0);
      }).finally(() => {
        transition(renderer.inspect().state);
        recoverInFlight = void 0;
      });
      return recoverInFlight;
    },
    dispose: () => {
      if (disposeInFlight !== void 0) return disposeInFlight;
      if (disposed) return Promise.resolve(ok(void 0));
      disposed = true;
      scheduledFrame?.controller.abort();
      const active = scheduledFrame?.done ?? (synchronousDrawDepth > 0 ? new Promise((resolve) => {
        synchronousDrawDrained = resolve;
      }) : void 0);
      disposeInFlight = (async () => {
        if (active !== void 0) {
          try {
            await active;
          } catch {
          }
        }
        const result = renderer.dispose();
        if (!result.ok) emit(Object.freeze({ kind: "error", error: result.error }));
        transition("disposed");
        offHostEvents();
        listeners.clear();
        return result;
      })().finally(() => {
        disposeInFlight = void 0;
      });
      return disposeInFlight;
    }
  };
}
function toError(value) {
  if (value instanceof Error) return value;
  return new Error(String(value));
}
function structuredRendererCause(cause, operation) {
  if (typeof cause === "object" && cause !== null) {
    const candidate = cause;
    if (typeof candidate.code === "string" && typeof candidate.expected === "string" && typeof candidate.hint === "string") {
      return {
        code: candidate.code,
        expected: candidate.expected,
        hint: candidate.hint,
        ...candidate.detail === void 0 ? {} : { detail: candidate.detail }
      };
    }
  }
  const contractFailure = new RendererContractFailureError(
    "draw",
    `${operation}: ${cause instanceof Error ? cause.message : String(cause)}`
  );
  return {
    code: contractFailure.code,
    expected: contractFailure.expected,
    hint: contractFailure.hint,
    detail: contractFailure.detail
  };
}
function projectRecoveryFailureDetail(failure4, inspection) {
  if (failure4 instanceof RecoveryFailedError) {
    return {
      phase: failure4.detail.phase,
      oldGeneration: failure4.detail.oldGeneration,
      candidateGeneration: failure4.detail.candidateGeneration,
      attempt: failure4.detail.attempt,
      elapsedMs: failure4.detail.elapsedMs,
      retryable: failure4.detail.retryable,
      guidance: failure4.detail.guidance,
      owner: failure4.detail.owner,
      resourceKind: failure4.detail.resourceKind,
      lastOutcome: failure4.detail.lastOutcome,
      rehydratedRoots: failure4.detail.rehydratedRoots,
      staleLossEvents: failure4.detail.staleLossEvents,
      cleanupFailures: Object.freeze(
        failure4.detail.cleanupFailures.map(
          (cause) => structuredRendererCause(cause, "recovery-cleanup")
        )
      )
    };
  }
  const lastOutcome = inspection.lastOutcome === "disposed" ? "disposed" : "failed";
  return {
    phase: inspection.phase ?? "cleanup",
    oldGeneration: inspection.fromGeneration,
    candidateGeneration: inspection.candidateGeneration,
    attempt: inspection.attempt,
    elapsedMs: inspection.elapsedMs,
    retryable: false,
    guidance: "rebuild-renderer",
    owner: inspection.failedOwner ?? "renderer",
    resourceKind: inspection.failedResourceKind ?? "pipeline",
    lastOutcome,
    rehydratedRoots: inspection.rehydratedRoots,
    staleLossEvents: inspection.staleLossEvents,
    cleanupFailures: Object.freeze([])
  };
}
var RENDER_PROFILE_KEYS = /* @__PURE__ */ new Set([
  "featureReadOnlyDepthBatching",
  "featureReadOnlyDepthBatchDiagnostic",
  "pipelineId",
  "lightCount",
  "renderPath",
  "subsurfaceQuality",
  "visibleSurface",
  "diffuseGi",
  "probePlacement",
  "pbr",
  "ibl",
  "ssao",
  "volumetricFog",
  "gpuOcclusion",
  "gbufferBatchOrderDiagnostic",
  "postStages"
]);
function validateRenderProfile(profile) {
  if (typeof profile !== "object" || profile === null) return "RenderProfile must be a POD object";
  const unknownKey = Object.keys(profile).find((key) => !RENDER_PROFILE_KEYS.has(key));
  if (unknownKey !== void 0) return `RenderProfile contains unsupported field '${unknownKey}'`;
  if (profile.pipelineId !== STANDARD_PIPELINE_ID) {
    return `RenderProfile.pipelineId must be '${STANDARD_PIPELINE_ID}'`;
  }
  if (!STANDARD_LIGHT_COUNTS.some((count) => count === profile.lightCount)) {
    return "RenderProfile.lightCount must be 1, 32, or 256";
  }
  if (profile.renderPath !== "forward" && profile.renderPath !== "deferred") {
    return "RenderProfile.renderPath must be 'forward' or 'deferred'";
  }
  if (profile.subsurfaceQuality !== void 0 && profile.subsurfaceQuality !== "low" && profile.subsurfaceQuality !== "high")
    return "RenderProfile.subsurfaceQuality must be low or high";
  if (profile.volumetricFog !== void 0) {
    const volume = profile.volumetricFog;
    if (typeof volume !== "object" || volume === null || Array.isArray(volume) || Object.keys(volume).some((key) => !["quality", "depth", "tileSize"].includes(key)) || volume.quality !== "low" && volume.quality !== "high" || volume.depth !== 48 && volume.depth !== 64 || volume.tileSize !== 4 && volume.tileSize !== 16)
      return "RenderProfile.volumetricFog requires quality low/high, depth 48/64 and tileSize 4/16";
  }
  if (profile.featureReadOnlyDepthBatching !== void 0 && typeof profile.featureReadOnlyDepthBatching !== "boolean")
    return "RenderProfile.featureReadOnlyDepthBatching must be boolean";
  if (profile.featureReadOnlyDepthBatchDiagnostic !== void 0 && typeof profile.featureReadOnlyDepthBatchDiagnostic !== "boolean")
    return "RenderProfile.featureReadOnlyDepthBatchDiagnostic must be boolean";
  if (profile.visibleSurface !== void 0 && typeof profile.visibleSurface !== "boolean")
    return "RenderProfile.visibleSurface must be boolean";
  if (profile.gpuOcclusion !== void 0 && typeof profile.gpuOcclusion !== "boolean")
    return "RenderProfile.gpuOcclusion must be boolean";
  if (profile.gbufferBatchOrderDiagnostic !== void 0) {
    const diagnostic = profile.gbufferBatchOrderDiagnostic;
    if (typeof diagnostic !== "object" || diagnostic === null || Array.isArray(diagnostic) || Object.keys(diagnostic).some((key) => key !== "order" && key !== "programDigests") || diagnostic.order !== "near" && diagnostic.order !== "far" || !Array.isArray(diagnostic.programDigests) || diagnostic.programDigests.length > 128 || !diagnostic.programDigests.every(
      (digest) => typeof digest === "string" && /^sha256:[0-9a-f]{64}$/.test(digest)
    ))
      return "RenderProfile.gbufferBatchOrderDiagnostic requires near/far order and up to 128 audited SHA-256 programDigests";
  }
  if (profile.visibleSurface === true && profile.renderPath !== "deferred")
    return "Visible surfaces require the Standard deferred path";
  if (profile.probePlacement !== void 0) {
    const placement = profile.probePlacement;
    if (typeof placement !== "object" || placement === null || Array.isArray(placement) || Object.keys(placement).some((key) => !["seeds", "global"].includes(key)))
      return "Probe placement requires one seeds/global configuration object";
    const seeds = placement.seeds;
    if (profile.renderPath !== "deferred") return "Probe placement requires Standard deferred";
    if (!Array.isArray(seeds) || seeds.length < 1 || seeds.length > 4096 || new Set(seeds.map((seed) => seed?.id)).size !== seeds.length || seeds.some(
      (seed) => typeof seed !== "object" || seed === null || Object.keys(seed).some(
        (key) => !["id", "generation", "position", "cellSize", "traced"].includes(key)
      ) || ![seed.id, seed.generation].every(
        (v) => Number.isInteger(v) && v > 0 && v <= 4294967295
      ) || typeof seed.traced !== "boolean" || !Array.isArray(seed.position) || seed.position.length !== 3 || !seed.position.every(
        (v) => typeof v === "number" && Number.isFinite(Math.fround(v)) && Math.abs(v) < 1e30
      ) || typeof seed.cellSize !== "number" || !(Math.fround(seed.cellSize) > 1e-20 && Math.fround(seed.cellSize) < 1e20)
    ))
      return "Probe placement requires 1..4096 unique nonzero u32 seed identities/generations, finite positions, bounded positive cells and explicit traced eligibility";
    const global = placement.global;
    if (global !== void 0) {
      const region = validateGlobalSdfRegion(global, ["rayResolution", "tMax", "cards"]);
      if (!region.ok) return region.error.detail.cause;
      if (!Number.isInteger(global.rayResolution) || global.rayResolution < 1 || global.rayResolution > 256 || seeds.length * global.rayResolution ** 2 > RAY_REFERENCE_LIMIT || !(Math.fround(global.tMax) >= 2 ** -126 && Math.fround(global.tMax) < 1e30) || seeds.some((seed) => seed.position.some((v) => Math.abs(v) + global.tMax >= 1e30)))
        return "Global probes require 1..256 ray texels/axis within the query ray limit and finite normal f32 endpoints";
      if (global.cards !== void 0) {
        const cards = validateCardCapture(global.cards);
        if (!cards.ok) return cards.error.detail.cause;
      }
    }
  }
  if (profile.diffuseGi !== void 0) {
    const gi = validateDiffuseGi(profile.diffuseGi);
    if (!gi.ok) return gi.error.detail.cause;
    if (profile.renderPath !== "deferred" || profile.ibl || !profile.pbr)
      return "Diffuse GI requires deferred PBR with IBL disabled";
  }
  for (const field of ["pbr", "ibl"]) {
    if (typeof profile[field] !== "boolean") return `RenderProfile.${field} must be boolean`;
  }
  if (typeof profile.ssao !== "boolean" && (typeof profile.ssao !== "object" || profile.ssao === null || Array.isArray(profile.ssao)))
    return "RenderProfile.ssao must be boolean or AO parameters";
  if (typeof profile.ssao === "object") {
    if (Object.keys(profile.ssao).some(
      (key) => !["algorithm", "radius", "bias", "intensity", "quality"].includes(key)
    ))
      return "RenderProfile.ssao contains an unsupported parameter";
    const resolved = resolveSsaoParameters(profile.ssao);
    if (!resolved.ok) return resolved.error.hint;
  }
  if (profile.ssao !== false && profile.renderPath !== "deferred")
    return "SSAO needs current depth and normals: set renderPath to deferred";
  const stages = STANDARD_POST_STAGE_NAMES;
  if (!Array.isArray(profile.postStages) || profile.postStages.length !== stages.length || stages.some((stage, index) => profile.postStages[index] !== stage)) {
    return "RenderProfile.postStages must preserve the Standard post stage order";
  }
  return void 0;
}
function freezeRenderProfile(profile) {
  return Object.freeze({
    ...profile,
    ...profile.gbufferBatchOrderDiagnostic === void 0 ? {} : {
      gbufferBatchOrderDiagnostic: Object.freeze({
        order: profile.gbufferBatchOrderDiagnostic.order,
        programDigests: Object.freeze([...profile.gbufferBatchOrderDiagnostic.programDigests])
      })
    },
    ...profile.probePlacement === void 0 ? {} : {
      visibleSurface: true,
      probePlacement: Object.freeze({
        seeds: Object.freeze(
          profile.probePlacement.seeds.map(
            (seed) => Object.freeze({
              ...seed,
              position: Object.freeze([...seed.position])
            })
          )
        ),
        ...profile.probePlacement.global === void 0 ? {} : {
          global: Object.freeze({
            ...profile.probePlacement.global,
            ...profile.probePlacement.global.cards === void 0 ? {} : { cards: Object.freeze({ ...profile.probePlacement.global.cards }) },
            grid: freezeGlobalSdfGrid(profile.probePlacement.global.grid)
          })
        }
      })
    },
    ...profile.diffuseGi === void 0 ? {} : { visibleSurface: true, diffuseGi: freezeDiffuseGi(profile.diffuseGi) },
    ssao: typeof profile.ssao === "object" ? Object.freeze({ ...profile.ssao }) : profile.ssao,
    ...profile.volumetricFog === void 0 ? {} : { volumetricFog: Object.freeze({ ...profile.volumetricFog }) },
    postStages: Object.freeze([...profile.postStages])
  });
}

// sdk/engine/node_modules/@forgeax/engine-render/src/point-shadow-inspection.ts
import {
  materialShaderSourceMatches
} from "@forgeax/engine-shader";
function inspectPointShadow(snapshots, shadowAtlasCapacity) {
  const requested = snapshots.length;
  const admitted = snapshots.reduce(
    (count, snapshot) => snapshot.shadowAtlasLayer >= 0 && snapshot.shadowAtlasLayer < shadowAtlasCapacity ? count + 1 : count,
    0
  );
  const status = requested === 0 ? "inactive" : requested > shadowAtlasCapacity || admitted !== requested ? "over-budget" : "ready";
  return Object.freeze({
    status,
    requested,
    admitted,
    // A point shadow only samples an atlas after it owns an atlas layer. Keep
    // these names explicit for AI diagnostics while deriving both from the
    // one layer projection above.
    shadowed: admitted,
    shadowAtlasOccupancy: admitted,
    shadowAtlasCapacity
  });
}
var POINT_SHADOW_LANE = /@group\s*\(\s*0\s*\)\s*@binding\s*\(\s*5\s*\)\s*var\s+\w+\s*:\s*texture_depth_cube_array\b/u;
var laneByEntry = /* @__PURE__ */ new WeakMap();
function materialShadersSamplePointShadows(entries) {
  for (const entry of entries) {
    let lane = laneByEntry.get(entry);
    if (lane === void 0) {
      lane = materialShaderSourceMatches(entry, POINT_SHADOW_LANE) || entry.variants.some((variant) => materialShaderSourceMatches(variant, POINT_SHADOW_LANE));
      laneByEntry.set(entry, lane);
    }
    if (lane) return true;
  }
  return false;
}
function projectPointShadowInspection(recorded, shaderLane) {
  if (shaderLane) return recorded;
  return Object.freeze({
    status: "unavailable",
    requested: recorded?.requested ?? 0,
    admitted: 0,
    shadowed: 0,
    shadowAtlasOccupancy: 0,
    shadowAtlasCapacity: recorded?.shadowAtlasCapacity ?? SHADOW_ATLAS_DEFAULT_LAYERS
  });
}

// sdk/engine/node_modules/@forgeax/engine-render/src/points-lines/admission.ts
import { err as err2, ok as ok2 } from "@forgeax/engine-types";
function invalidStyle(input, component, field, value, expected) {
  return err2(new PointsLinesInvalidStyleError({ entity: input.entity, component, field, value, expected }));
}
function topologyMismatch(input, submesh, expected, actual) {
  return err2(new PointsLinesTopologyMismatchError({ entity: input.entity, submesh, expected, actual }));
}
function checkStyle(input) {
  const hasPoints = input.points !== void 0;
  const hasLines = input.lines !== void 0;
  if (hasPoints && hasLines) {
    return invalidStyle(
      input,
      "Points/Lines",
      "components",
      "Points + Lines",
      "exactly one style component"
    );
  }
  if (!hasPoints && !hasLines) {
    return invalidStyle(input, "Points/Lines", "components", void 0, "one style component");
  }
  if (hasPoints) {
    const sizePx = input.points?.sizePx ?? 4;
    const shapeValue = input.points?.shape ?? PointShapeValue.square;
    const shape = pointShapeFromU32(shapeValue);
    if (!Number.isFinite(sizePx) || sizePx <= 0) {
      return invalidStyle(input, "Points", "sizePx", sizePx, "finite sizePx > 0");
    }
    if (shape === void 0) {
      return invalidStyle(input, "Points", "shape", shapeValue, "shape is 'square' or 'circle'");
    }
    return ok2({ component: "Points", shape, sizePx });
  }
  const width = input.lines?.width ?? 1;
  if (!Number.isFinite(width) || width <= 0) {
    return invalidStyle(input, "Lines", "width", width, "finite width > 0");
  }
  const widthUnitsValue = input.lines?.widthUnits ?? 0;
  const widthUnits = lineWidthUnitsFromU32(widthUnitsValue);
  if (widthUnits === void 0) {
    return invalidStyle(
      input,
      "Lines",
      "widthUnits",
      widthUnitsValue,
      "widthUnits is 'pixels' or 'world'"
    );
  }
  const capValue = input.lines?.cap ?? 0;
  const cap = lineCapFromU32(capValue);
  if (cap === void 0) {
    return invalidStyle(input, "Lines", "cap", capValue, "cap is 'butt' or 'round'");
  }
  const dashSize = input.lines?.dashSize ?? 1;
  const gapSize = input.lines?.gapSize ?? 0;
  const dashOffset = input.lines?.dashOffset ?? 0;
  for (const [field, value, valid, expected] of [
    ["dashSize", dashSize, dashSize > 0, "finite dashSize > 0"],
    ["gapSize", gapSize, gapSize >= 0, "finite gapSize >= 0"],
    ["dashOffset", dashOffset, true, "finite dashOffset"]
  ]) {
    if (!Number.isFinite(value) || !valid)
      return invalidStyle(input, "Lines", field, value, expected);
  }
  if (!Number.isFinite(Math.fround(dashSize + gapSize))) {
    return invalidStyle(input, "Lines", "dashSize", dashSize, "dashSize + gapSize fits f32");
  }
  return ok2({ component: "Lines", width, widthUnits, cap, dashSize, gapSize, dashOffset });
}
function checkTopology(input, component) {
  const expected = component === "Points" ? "point-list" : "line-list";
  let pointCount = 0;
  let segmentCount = 0;
  const acceptedSubmeshes = [];
  let sawNonEmpty = false;
  for (const [submeshIndex, submesh] of input.mesh.submeshes.entries()) {
    const indexed = input.mesh.indices !== void 0 && submesh.indexCount > 0;
    const elementCount = indexed ? submesh.indexCount : submesh.vertexCount;
    if (elementCount === 0) continue;
    sawNonEmpty = true;
    const strip = component === "Lines" && submesh.topology === "line-strip";
    if (submesh.topology !== expected && !strip) {
      return topologyMismatch(input, submeshIndex, expected, submesh.topology);
    }
    if (strip && elementCount < 2) {
      return topologyMismatch(
        input,
        submeshIndex,
        "line-strip with at least two vertices",
        "short strip"
      );
    }
    if (component === "Lines" && !strip && elementCount % 2 !== 0) {
      return topologyMismatch(input, submeshIndex, "line-list pairs", "line-list odd tail");
    }
    acceptedSubmeshes.push(submeshIndex);
    if (component === "Points") pointCount += elementCount;
    else segmentCount += strip ? elementCount - 1 : elementCount / 2;
  }
  if (!sawNonEmpty) return topologyMismatch(input, 0, expected, "empty-range");
  return ok2({ pointCount, segmentCount, submeshes: acceptedSubmeshes });
}
function checkMaterial(input) {
  const passes = (input.material.passes ?? []).filter(
    (candidate) => candidate.name !== "shadow-caster" && candidate.renderState?.tags?.LightMode !== "ShadowCaster"
  );
  const unlitModules = /* @__PURE__ */ new Set(["forgeax_material::unlit", "forgeax::default-unlit"]);
  if (passes.length !== 1 || passes[0] === void 0) {
    const pass2 = passes.find((candidate) => candidate.name === "deferred") ?? passes[0];
    return err2(
      new PointsLinesMaterialUnsupportedError({
        entity: input.entity,
        material: input.materialId ?? "<anonymous>",
        pass: pass2?.name ?? "<empty>",
        module: pass2?.program.module ?? "<empty>",
        reason: "points-lines admission requires one unlit forward pass"
      })
    );
  }
  const pass = passes[0];
  if (!unlitModules.has(pass.program.module) || pass.name !== "forward") {
    return err2(
      new PointsLinesMaterialUnsupportedError({
        entity: input.entity,
        material: input.materialId ?? "<anonymous>",
        pass: pass.name,
        module: pass.program.module,
        reason: "points-lines admission requires an engine-owned unlit forward pass"
      })
    );
  }
  if (input.material.parameters?.some((parameter) => parameter.name === "clippingControl")) {
    return err2(
      new PointsLinesMaterialUnsupportedError({
        entity: input.entity,
        material: input.materialId ?? "<anonymous>",
        pass: pass.name,
        module: pass.program.module,
        reason: "expanded Points/Lines support camera ClippingPlanes; local material clipping requires triangle geometry"
      })
    );
  }
  return ok2(void 0);
}
function admitPointsLines(input) {
  const style = checkStyle(input);
  if (!style.ok) return style;
  const topology = checkTopology(input, style.value.component);
  if (!topology.ok) return topology;
  const material = checkMaterial(input);
  if (!material.ok) return material;
  if (style.value.component === "Points" && input.limits?.maxPoints !== void 0) {
    if (topology.value.pointCount > input.limits.maxPoints) {
      return err2(
        new PointsLinesBudgetExceededError({
          lane: "admission",
          requested: topology.value.pointCount,
          limit: input.limits.maxPoints,
          unit: "points"
        })
      );
    }
  }
  if (style.value.component === "Lines" && input.limits?.maxSegments !== void 0) {
    if (topology.value.segmentCount > input.limits.maxSegments) {
      return err2(
        new PointsLinesBudgetExceededError({
          lane: "admission",
          requested: topology.value.segmentCount,
          limit: input.limits.maxSegments,
          unit: "segments"
        })
      );
    }
  }
  return ok2({ ...style.value, ...topology.value });
}

// sdk/engine/node_modules/@forgeax/engine-render/src/assembly/render-target-host.ts
import { textureFormatBlock } from "@forgeax/engine-types";

// sdk/engine/node_modules/@forgeax/engine-render/src/targets/framebuffer-snapshot.ts
function failure(reason, expected, actual, frameId) {
  return new FramebufferSnapshotFailedError({
    reason,
    expected,
    actual,
    ...frameId === void 0 ? {} : { frameId }
  });
}
function nonNegativeInteger(value) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}
function fits(origin, region, extent) {
  return origin.x + region.width <= extent.width && origin.y + region.height <= extent.height;
}
function compatible(descriptor) {
  return descriptor.shape === "2d" && descriptor.format === "rgba16float" && descriptor.sampleCount === 1 && descriptor.mipLevels === 1;
}
function createFramebufferSnapshotQueue(options) {
  const records = /* @__PURE__ */ new Map();
  const reject = (record, error) => {
    record.status = "rejected";
    record.error = error;
  };
  const stateInvalid = (reason, generation) => new RenderTargetStateInvalidError({
    operation: "snapshot",
    reason,
    state: reason === "generation-mismatch" ? "active" : "destroyed",
    generation
  });
  return {
    request(target, request) {
      const { region } = request;
      const destination = request.destination ?? { x: 0, y: 0 };
      if (typeof region !== "object" || region === null || !nonNegativeInteger(region.x) || !nonNegativeInteger(region.y) || !nonNegativeInteger(region.width) || !nonNegativeInteger(region.height) || region.width < 1 || region.height < 1 || !nonNegativeInteger(destination.x) || !nonNegativeInteger(destination.y) || request.camera !== void 0 && !nonNegativeInteger(request.camera)) {
        return {
          ok: false,
          error: failure(
            "request-invalid",
            "integer region x/y >= 0, width/height >= 1, destination x/y >= 0, camera entity key",
            { region, destination, camera: request.camera }
          )
        };
      }
      const inspected = options.owner.inspect(target);
      if (!inspected.ok) return inspected;
      const descriptor = inspected.value.candidate?.descriptor ?? inspected.value.descriptor;
      if (!compatible(descriptor)) {
        return {
          ok: false,
          error: failure("target-incompatible", "2d rgba16float, sampleCount 1, mipLevels 1", {
            shape: descriptor.shape,
            format: descriptor.format,
            sampleCount: descriptor.sampleCount,
            mipLevels: descriptor.mipLevels
          })
        };
      }
      if (!fits(destination, region, descriptor)) {
        return {
          ok: false,
          error: failure(
            "destination-out-of-bounds",
            `destination + region <= ${descriptor.width}x${descriptor.height}`,
            { destination, region }
          )
        };
      }
      for (const record of records.values()) {
        if (record.target === target && record.status !== "submitted" && record.status !== "failed")
          return {
            ok: false,
            error: failure(
              "writer-conflict",
              "one pending snapshot per target",
              "pending snapshot"
            )
          };
      }
      const ticket = Object.freeze({});
      records.set(ticket, {
        target,
        region: Object.freeze({ ...region }),
        destination: Object.freeze({ x: destination.x, y: destination.y }),
        camera: request.camera,
        generation: options.currentGeneration(),
        status: "pending"
      });
      return { ok: true, value: ticket };
    },
    encode(encoder, source) {
      for (const record of records.values()) {
        if (record.status !== "pending") continue;
        if (record.camera === void 0 ? source.role !== "display" : record.camera !== source.camera)
          continue;
        if (record.generation !== options.currentGeneration()) {
          reject(record, stateInvalid("generation-mismatch", options.currentGeneration()));
          continue;
        }
        if (source.format !== "rgba16float") {
          reject(
            record,
            failure("source-unavailable", "rgba16float linear-HDR scene color", source.format)
          );
          continue;
        }
        if (!fits(record.region, record.region, source)) {
          reject(
            record,
            failure("source-out-of-bounds", "region inside the scene-color extent", {
              width: source.width,
              height: source.height
            })
          );
          continue;
        }
        if (options.claimedByWriter(record.target)) {
          reject(
            record,
            failure(
              "writer-conflict",
              "no camera or capture writes the target in the same frame",
              "camera writer"
            )
          );
          continue;
        }
        const physical = options.writablePhysical(record.target);
        if (physical === void 0 || !compatible(physical.descriptor)) {
          reject(
            record,
            failure("destination-invalidated", "a compatible physical target", void 0)
          );
          continue;
        }
        if (!fits(record.destination, record.region, physical.descriptor)) {
          reject(
            record,
            failure(
              "destination-out-of-bounds",
              `destination + region <= ${physical.descriptor.width}x${physical.descriptor.height}`,
              { destination: record.destination, region: record.region }
            )
          );
          continue;
        }
        encoder.copyTextureToTexture(
          {
            texture: source.texture,
            mipLevel: 0,
            origin: { x: record.region.x, y: record.region.y, z: 0 }
          },
          {
            texture: physical.texture,
            mipLevel: 0,
            origin: { x: record.destination.x, y: record.destination.y, z: 0 }
          },
          { width: record.region.width, height: record.region.height, depthOrArrayLayers: 1 }
        );
        record.status = "encoded";
        record.physical = physical;
        record.sourceExtent = { width: source.width, height: source.height };
      }
    },
    beginFrame() {
      for (const record of records.values()) {
        if (record.status !== "encoded" && record.status !== "rejected") continue;
        record.status = "pending";
        delete record.error;
        delete record.physical;
        delete record.sourceExtent;
      }
    },
    onFrameSubmitted(receipt, completed) {
      for (const record of records.values()) {
        if (record.status === "submitted" || record.status === "failed") continue;
        record.frameId = receipt.frameId;
        if (record.status === "encoded" && record.physical !== void 0) {
          options.markWritten(record.target, record.physical);
          record.status = "submitted";
          record.completed = completed;
          continue;
        }
        record.status = "failed";
        record.error ??= failure(
          "source-unavailable",
          record.camera === void 0 ? "a single-camera frame with Standard scene color" : `camera ${record.camera} rendering Standard scene color in this frame`,
          { camera: record.camera },
          receipt.frameId
        );
      }
    },
    async observe(receipt, tickets) {
      const results = [];
      for (const ticket of tickets) {
        const record = records.get(ticket);
        if (record === void 0)
          return { ok: false, error: stateInvalid("foreign-renderer", receipt.deviceGeneration) };
        if (record.frameId !== receipt.frameId || record.generation !== receipt.deviceGeneration || record.status !== "submitted" && record.status !== "failed") {
          return {
            ok: false,
            error: stateInvalid("generation-mismatch", receipt.deviceGeneration)
          };
        }
        records.delete(ticket);
        if (record.status === "failed") {
          return {
            ok: false,
            error: record.error ?? failure("source-unavailable", "an encoded snapshot", void 0)
          };
        }
        const completion = await (record.completed ?? Promise.resolve({ ok: true, value: void 0 }));
        if (!completion.ok) return completion;
        const inspected = options.owner.inspect(record.target);
        if (!inspected.ok) return inspected;
        if (options.currentGeneration() !== record.generation || options.activePhysical(record.target) !== record.physical) {
          return {
            ok: false,
            error: failure(
              "destination-invalidated",
              "the written physical target is still active",
              inspected.value.state,
              receipt.frameId
            )
          };
        }
        results.push({
          ticket,
          frameId: receipt.frameId,
          deviceGeneration: receipt.deviceGeneration,
          camera: record.camera,
          region: record.region,
          destination: record.destination,
          sourceExtent: record.sourceExtent ?? { width: 0, height: 0 }
        });
      }
      return { ok: true, value: Object.freeze(results) };
    },
    release(target) {
      for (const [ticket, record] of records) if (record.target === target) records.delete(ticket);
    },
    clear() {
      records.clear();
    }
  };
}

// sdk/engine/node_modules/@forgeax/engine-render/src/targets/owner.ts
function frozenDescriptor(descriptor) {
  return Object.freeze({ ...descriptor });
}
function invalid(operation, reason, state, generation) {
  return {
    ok: false,
    error: new RenderTargetStateInvalidError({ operation, reason, state, generation })
  };
}
function token() {
  return Object.freeze({});
}
function createRenderTargetOwner(options) {
  const targets = /* @__PURE__ */ new WeakMap();
  const requireTarget = (target, operation) => {
    const state = targets.get(target);
    if (state === void 0) return invalid(operation, "foreign-renderer", "destroyed", 0);
    if (state.rendererId !== options.rendererId) {
      return invalid(operation, "foreign-renderer", state.state, state.generation);
    }
    if (state.state === "destroyed") {
      return invalid(operation, "destroyed", state.state, state.generation);
    }
    return { ok: true, value: state };
  };
  return {
    create(descriptor) {
      const target = token();
      targets.set(target, {
        target,
        rendererId: options.rendererId,
        state: "uninitialized",
        generation: options.getGeneration(),
        descriptor: frozenDescriptor(descriptor),
        candidate: void 0,
        candidateBaseState: "uninitialized",
        retiredGenerations: /* @__PURE__ */ new Set()
      });
      return { ok: true, value: target };
    },
    stage(target, descriptor) {
      const found = requireTarget(target, "resize");
      if (!found.ok) return found;
      const state = found.value;
      if (state.state === "rebuilding") {
        return invalid("resize", "generation-mismatch", state.state, state.generation);
      }
      if (state.state !== "candidate")
        state.candidateBaseState = state.state === "active" ? "active" : "uninitialized";
      const candidate = Object.freeze({
        generation: Math.max(options.getGeneration(), state.generation),
        descriptor: frozenDescriptor(descriptor ?? state.descriptor)
      });
      state.candidate = candidate;
      state.state = "candidate";
      return { ok: true, value: candidate };
    },
    promote(target, generation) {
      const found = requireTarget(target, "resize");
      if (!found.ok) return found;
      const state = found.value;
      if (state.candidate?.generation !== generation) {
        return invalid("resize", "generation-mismatch", state.state, state.generation);
      }
      state.descriptor = state.candidate.descriptor;
      state.generation = generation;
      state.candidate = void 0;
      state.state = "active";
      return { ok: true, value: void 0 };
    },
    rejectCandidate(target, generation, stage) {
      const found = requireTarget(target, "resize");
      if (!found.ok) return found;
      const state = found.value;
      if (state.candidate?.generation !== generation) {
        return invalid("resize", "generation-mismatch", state.state, state.generation);
      }
      state.candidate = void 0;
      state.state = state.candidateBaseState;
      return {
        ok: false,
        error: new RenderTargetOperationFailedError({
          operation: "resize",
          stage,
          generation,
          cause: new Error(`candidate ${generation} failed during ${stage}`),
          recovery: state.state === "uninitialized" ? "retry" : "retain-last-known-good"
        })
      };
    },
    beginRecovery(target, generation) {
      const found = requireTarget(target, "resize");
      if (!found.ok) return found;
      const state = found.value;
      if (state.state === "rebuilding" || generation <= Math.max(state.generation, state.candidate?.generation ?? 0)) {
        return invalid("resize", "generation-mismatch", state.state, state.generation);
      }
      state.generation = generation;
      state.descriptor = state.candidate?.descriptor ?? state.descriptor;
      state.candidate = void 0;
      state.state = "rebuilding";
      return { ok: true, value: void 0 };
    },
    finishRecovery(target) {
      const found = requireTarget(target, "resize");
      if (!found.ok) return found;
      const state = found.value;
      if (state.state !== "rebuilding") {
        return invalid("resize", "generation-mismatch", state.state, state.generation);
      }
      state.state = "uninitialized";
      return { ok: true, value: void 0 };
    },
    retire(target, generation) {
      const found = requireTarget(target, "destroy");
      if (!found.ok) return found;
      found.value.retiredGenerations.add(generation);
      return { ok: true, value: void 0 };
    },
    destroy(target) {
      const state = targets.get(target);
      if (state === void 0) return invalid("destroy", "foreign-renderer", "destroyed", 0);
      if (state.rendererId !== options.rendererId) {
        return invalid("destroy", "foreign-renderer", state.state, state.generation);
      }
      if (state.state === "destroyed") return { ok: true, value: void 0 };
      state.candidate = void 0;
      state.state = "destroyed";
      return { ok: true, value: void 0 };
    },
    inspect(target) {
      const found = requireTarget(target, "inspect");
      if (!found.ok) return found;
      const state = found.value;
      return {
        ok: true,
        value: Object.freeze({
          token: state.target,
          state: state.state,
          generation: state.generation,
          descriptor: state.descriptor,
          ...state.candidate === void 0 ? {} : { candidate: state.candidate }
        })
      };
    }
  };
}

// sdk/engine/node_modules/@forgeax/engine-render/src/targets/physical.ts
function createRenderTargetPhysical(device, descriptor, generation, sampledDepth = false) {
  const allocations = [];
  const failed = (cause) => {
    const failures = destroyTextures(device, allocations);
    return {
      ok: false,
      error: new RenderTargetOperationFailedError({
        operation: "create",
        stage: "allocation",
        generation,
        cause: failures.length === 0 ? cause : new AggregateError([cause, ...failures], "Render target allocation failed"),
        recovery: "retry"
      })
    };
  };
  const layers = renderTargetLayerCount(descriptor);
  const volume = descriptor.shape === "3d";
  const arrayLayers = volume ? 1 : layers;
  const usage = GPU_TEXTURE_USAGE_COPY_DST | GPU_TEXTURE_USAGE_RENDER_ATTACHMENT | (descriptor.sampled ? GPU_TEXTURE_USAGE_TEXTURE_BINDING : 0) | (descriptor.readback ? GPU_TEXTURE_USAGE_COPY_SRC : 0);
  const created = device.createTexture({
    label: `render-target.${generation}`,
    size: { width: descriptor.width, height: descriptor.height, depthOrArrayLayers: layers },
    format: descriptor.format,
    mipLevelCount: renderTargetMipCount(descriptor),
    // WebGPU forbids multisampled array textures. The layered texture is
    // always the single-sample resolve destination; MSAA capture uses one
    // depth=1 color texture per layer below.
    sampleCount: 1,
    dimension: volume ? "3d" : "2d",
    usage,
    viewFormats: void 0,
    textureBindingViewDimension: descriptor.shape === "2d" ? void 0 : descriptor.shape
  });
  if (!created.ok) return failed(created.error);
  const texture = created.value;
  allocations.push(texture);
  const view = device.createTextureView(texture, {
    dimension: descriptor.shape,
    baseMipLevel: 0,
    mipLevelCount: renderTargetMipCount(descriptor),
    baseArrayLayer: 0,
    arrayLayerCount: arrayLayers
  });
  if (!view.ok) return failed(view.error);
  const mipViews = [];
  for (let mip = 0; mip < renderTargetMipCount(descriptor); mip += 1) {
    const mipView = device.createTextureView(texture, {
      dimension: descriptor.shape,
      baseMipLevel: mip,
      mipLevelCount: 1,
      baseArrayLayer: 0,
      arrayLayerCount: arrayLayers
    });
    if (!mipView.ok) return failed(mipView.error);
    mipViews.push(mipView.value);
  }
  const resolveLayerViews = [];
  if (volume) {
    const sliceView = mipViews[0] ?? view.value;
    for (let slice = 0; slice < layers; slice += 1) resolveLayerViews.push(sliceView);
  } else {
    for (let layer = 0; layer < layers; layer += 1) {
      const layerView = device.createTextureView(texture, {
        dimension: "2d",
        baseMipLevel: 0,
        mipLevelCount: 1,
        baseArrayLayer: layer,
        arrayLayerCount: 1
      });
      if (!layerView.ok) return failed(layerView.error);
      resolveLayerViews.push(layerView.value);
    }
  }
  const depth = device.createTexture({
    label: `render-target.${generation}.depth`,
    size: { width: descriptor.width, height: descriptor.height, depthOrArrayLayers: 1 },
    mipLevelCount: 1,
    sampleCount: descriptor.sampleCount,
    dimension: "2d",
    format: RENDER_TARGET_DEPTH_ATTACHMENT.format,
    usage: GPU_TEXTURE_USAGE_RENDER_ATTACHMENT | (sampledDepth ? GPU_TEXTURE_USAGE_TEXTURE_BINDING : 0),
    viewFormats: void 0,
    textureBindingViewDimension: void 0
  });
  if (!depth.ok) return failed(depth.error);
  allocations.push(depth.value);
  const depthView = device.createTextureView(depth.value, {
    dimension: "2d",
    baseArrayLayer: 0,
    arrayLayerCount: 1
  });
  if (!depthView.ok) return failed(depthView.error);
  const colorTextures = [];
  const layerViews = [];
  if (descriptor.sampleCount === 4) {
    for (let layer = 0; layer < layers; layer += 1) {
      const msaa = device.createTexture({
        label: `render-target.${generation}.msaa.${layer}`,
        size: { width: descriptor.width, height: descriptor.height, depthOrArrayLayers: 1 },
        format: descriptor.format,
        mipLevelCount: 1,
        sampleCount: 4,
        dimension: "2d",
        usage: GPU_TEXTURE_USAGE_RENDER_ATTACHMENT,
        viewFormats: void 0,
        textureBindingViewDimension: void 0
      });
      if (!msaa.ok) return failed(msaa.error);
      allocations.push(msaa.value);
      const msaaView = device.createTextureView(msaa.value, {
        dimension: "2d",
        baseMipLevel: 0,
        mipLevelCount: 1,
        baseArrayLayer: 0,
        arrayLayerCount: 1
      });
      if (!msaaView.ok) return failed(msaaView.error);
      colorTextures.push(msaa.value);
      layerViews.push(msaaView.value);
    }
  } else {
    for (let layer = 0; layer < layers; layer += 1) {
      colorTextures.push(texture);
      layerViews.push(resolveLayerViews[layer] ?? view.value);
    }
  }
  return {
    ok: true,
    value: {
      device,
      ...sampledDepth ? { sampledDepth: true } : {},
      generation,
      descriptor,
      texture,
      view: view.value,
      mipViews,
      colorTextures,
      layerViews,
      depthTexture: depth.value,
      depthView: depthView.value,
      ...descriptor.sampleCount === 4 ? { resolveTexture: texture } : {},
      resolveView: view.value,
      resolveLayerViews
    }
  };
}
function destroyRenderTargetPhysical(physical) {
  if (physical === void 0) return { ok: true, value: void 0 };
  const device = physical.device;
  const textures = /* @__PURE__ */ new Set();
  textures.add(physical.texture);
  if (physical.resolveTexture !== void 0) textures.add(physical.resolveTexture);
  for (const texture of physical.colorTextures) textures.add(texture);
  textures.add(physical.depthTexture);
  const failures = destroyTextures(device, textures);
  return failures.length === 0 ? { ok: true, value: void 0 } : {
    ok: false,
    error: new RenderTargetOperationFailedError({
      operation: "destroy",
      stage: "retire",
      generation: physical.generation,
      cause: new AggregateError(failures, "Render target retirement failed"),
      recovery: "recover"
    })
  };
}
function retireRenderTargetPhysical(physical, reportError) {
  const release = () => {
    const result = destroyRenderTargetPhysical(physical);
    if (!result.ok) reportError(result.error);
  };
  try {
    void physical.device.queue.onSubmittedWorkDone().then(release, release);
  } catch (cause) {
    release();
    reportError(
      new RenderTargetOperationFailedError({
        operation: "destroy",
        stage: "retire",
        generation: physical.generation,
        cause,
        recovery: "recover"
      })
    );
  }
}
function destroyTextures(device, textures) {
  const failures = [];
  for (const texture of textures) {
    try {
      const destroyed = device.destroyTexture(texture);
      if (!destroyed.ok) failures.push(destroyed.error);
    } catch (cause) {
      failures.push(cause);
    }
  }
  return failures;
}

// sdk/engine/node_modules/@forgeax/engine-render/src/targets/readback.ts
import { textureReadbackLayout } from "@forgeax/engine-rhi";
function invalidTicket(ticket, reason) {
  return {
    ok: false,
    error: new RenderTargetStateInvalidError({
      operation: "readback",
      reason,
      state: reason === "destroyed" ? "destroyed" : "active",
      generation: ticket.deviceGeneration
    })
  };
}
function bindRenderTargetReadbackTicket(ticket, receipt) {
  if (ticket.consumed) return invalidTicket(ticket, "destroyed");
  if (ticket.frameId !== void 0) {
    return invalidTicket(ticket, "generation-mismatch");
  }
  ticket.frameId = receipt.frameId;
  ticket.deviceGeneration = receipt.deviceGeneration;
  return { ok: true, value: void 0 };
}
function createRenderTargetReadbackTicket(target, input) {
  if (input.frameId !== void 0 && (!Number.isInteger(input.frameId) || input.frameId < 0) || !Number.isInteger(input.deviceGeneration) || input.deviceGeneration < 0 || !Number.isInteger(input.mipLevel) || input.mipLevel < 0 || !Number.isInteger(input.width) || input.width < 1 || !Number.isInteger(input.height) || input.height < 1 || !Number.isInteger(input.bytesPerPixel) || input.bytesPerPixel < 1) {
    return {
      ok: false,
      error: new RenderTargetOperationFailedError({
        operation: "readback",
        stage: "copy",
        generation: input.deviceGeneration,
        cause: new Error("readback dimensions and identity must be non-negative integers"),
        recovery: "retry"
      })
    };
  }
  const { bytesPerRow, byteLength } = textureReadbackLayout(input.width, input.height, {
    blockWidth: 1,
    blockHeight: 1,
    bytesPerBlock: input.bytesPerPixel
  });
  return {
    ok: true,
    value: {
      target,
      frameId: input.frameId,
      deviceGeneration: input.deviceGeneration,
      mipLevel: input.mipLevel,
      ...input.layer === void 0 ? {} : { layer: input.layer },
      width: input.width,
      height: input.height,
      bytesPerRow,
      byteLength,
      consumed: false
    }
  };
}
function completeRenderTargetReadback(ticket, receipt, bytes) {
  if (ticket.consumed) return invalidTicket(ticket, "destroyed");
  if (ticket.frameId === void 0 || receipt.frameId !== ticket.frameId || receipt.deviceGeneration !== ticket.deviceGeneration) {
    return invalidTicket(ticket, "generation-mismatch");
  }
  if (bytes.byteLength !== ticket.byteLength) {
    return {
      ok: false,
      error: new RenderTargetOperationFailedError({
        operation: "readback",
        stage: "copy",
        generation: ticket.deviceGeneration,
        cause: new Error(`expected ${ticket.byteLength} bytes, received ${bytes.byteLength}`),
        recovery: "retry"
      })
    };
  }
  ticket.consumed = true;
  return {
    ok: true,
    value: {
      bytes,
      frameId: ticket.frameId,
      deviceGeneration: ticket.deviceGeneration,
      mipLevel: ticket.mipLevel,
      ...ticket.layer === void 0 ? {} : { layer: ticket.layer }
    }
  };
}

// sdk/engine/node_modules/@forgeax/engine-render/src/assembly/render-target-host.ts
var DEFAULT_LIMITS = {
  maxTextureDimension2D: 8192,
  maxTextureDimension3D: 2048,
  maxTextureArrayLayers: 256,
  maxBytesPerTarget: 256 * 1024 * 1024,
  renderableFormats: ["rgba16float", "rgba8unorm", "rgba8unorm-srgb"],
  sampleCounts: [1, 4],
  depthFormats: ["depth24plus-stencil8", "depth32float"]
};
function opaqueTicket() {
  return Object.freeze({});
}
function createRenderTargetHost(options = {}) {
  let disposed = false;
  const limits = options.limits ?? DEFAULT_LIMITS;
  const currentGeneration = () => options.getGeneration?.() ?? options.initialGeneration ?? 0;
  const owner = createRenderTargetOwner({
    rendererId: options.rendererId ?? /* @__PURE__ */ Symbol("renderer"),
    getGeneration: currentGeneration
  });
  const targets = /* @__PURE__ */ new Set();
  const staged = /* @__PURE__ */ new Set();
  const activePhysical = /* @__PURE__ */ new WeakMap();
  const candidatePhysical = /* @__PURE__ */ new WeakMap();
  const submittedPhysicals = /* @__PURE__ */ new WeakSet();
  const sourceOwner = crypto.randomUUID();
  let nextSourceId = 1;
  const readbacks = /* @__PURE__ */ new Map();
  const frameWriters = /* @__PURE__ */ new Set();
  const markTargetSubmitted = (target, physical) => {
    if (candidatePhysical.get(target) === physical) submittedPhysicals.add(physical);
  };
  const snapshots = createFramebufferSnapshotQueue({
    owner,
    currentGeneration,
    writablePhysical: (target) => candidatePhysical.get(target) ?? activePhysical.get(target),
    activePhysical: (target) => activePhysical.get(target),
    claimedByWriter: (target) => frameWriters.has(target),
    markWritten: markTargetSubmitted
  });
  const report = (error) => options.onError?.(error);
  const releasePhysical = (physical, failures) => {
    const result = destroyRenderTargetPhysical(physical);
    if (!result.ok) failures.push(result.error);
  };
  const releaseReadback = (record, failures) => {
    if (record.allocation === void 0) return;
    try {
      const destroyed = record.allocation.device.destroyBuffer(record.allocation.buffer);
      if (!destroyed.ok) throw destroyed.error;
    } catch (cause) {
      failures.push(
        new RenderTargetOperationFailedError({
          operation: "destroy",
          stage: "retire",
          generation: record.ticket.deviceGeneration,
          cause,
          recovery: "recover"
        })
      );
    }
  };
  const releaseTarget = (target) => {
    const failures = [];
    const physicals = /* @__PURE__ */ new Set([activePhysical.get(target), candidatePhysical.get(target)]);
    activePhysical.delete(target);
    candidatePhysical.delete(target);
    staged.delete(target);
    for (const physical of physicals) releasePhysical(physical, failures);
    for (const [ticket, record] of readbacks) {
      if (record.target !== target) continue;
      readbacks.delete(ticket);
      releaseReadback(record, failures);
    }
    return failures;
  };
  const retirementResult = (failures) => failures.length === 0 ? { ok: true, value: void 0 } : {
    ok: false,
    error: new RenderTargetOperationFailedError({
      operation: "destroy",
      stage: "retire",
      generation: currentGeneration(),
      cause: new AggregateError(failures, "Render target cleanup failed"),
      recovery: "recover"
    })
  };
  const stagePhysical = (target, descriptor) => {
    const stagedTarget = owner.stage(target, descriptor);
    if (!stagedTarget.ok) return stagedTarget;
    const device = options.getDevice?.();
    if (device === void 0) {
      staged.add(target);
      return { ok: true, value: void 0 };
    }
    const physical = createRenderTargetPhysical(
      device,
      stagedTarget.value.descriptor,
      stagedTarget.value.generation
    );
    const previous = candidatePhysical.get(target);
    candidatePhysical.delete(target);
    if (previous !== void 0) {
      retireRenderTargetPhysical(previous, report);
    }
    if (!physical.ok) {
      staged.delete(target);
      owner.rejectCandidate(target, stagedTarget.value.generation, "allocation");
      return physical;
    }
    candidatePhysical.set(target, physical.value);
    staged.add(target);
    return { ok: true, value: void 0 };
  };
  return Object.freeze({
    owner: "renderer",
    descriptions() {
      return [...targets].map((target) => {
        const state = owner.inspect(target);
        if (!state.ok) throw state.error;
        return { target, descriptor: state.value.candidate?.descriptor ?? state.value.descriptor };
      });
    },
    createRenderTarget(descriptor) {
      if (disposed) {
        return {
          ok: false,
          error: new RenderTargetStateInvalidError({
            operation: "inspect",
            reason: "destroyed",
            state: "destroyed",
            generation: currentGeneration()
          })
        };
      }
      const admitted = admitRenderTargetDescriptor(descriptor, limits);
      if (!admitted.ok) return admitted;
      const created = owner.create(admitted.value);
      if (created.ok) targets.add(created.value);
      return created;
    },
    resizeRenderTarget(target, descriptor) {
      const admitted = admitRenderTargetDescriptor(descriptor, limits);
      if (!admitted.ok) return admitted;
      return stagePhysical(target, admitted.value);
    },
    createRenderTargetTextureSource(target, sourceOptions) {
      const inspected = owner.inspect(target);
      if (!inspected.ok) return inspected;
      if (!inspected.value.descriptor.sampled) {
        return {
          ok: false,
          error: new RenderTargetCapabilityMissingError({
            operation: "source",
            requested: "sampled=true",
            capability: "sampled",
            actual: "false"
          })
        };
      }
      if (sourceOptions.dimension !== inspected.value.descriptor.shape) {
        return {
          ok: false,
          error: new RenderTargetDescriptorInvalidError({
            field: "dimension",
            value: sourceOptions.dimension,
            expected: `dimension matches ${inspected.value.descriptor.shape}`
          })
        };
      }
      if (!Number.isInteger(sourceOptions.mipLevel) || sourceOptions.mipLevel < 0 || inspected.value.descriptor.mipLevels === 1 && sourceOptions.mipLevel !== 0) {
        return {
          ok: false,
          error: new RenderTargetDescriptorInvalidError({
            field: "mipLevel",
            value: sourceOptions.mipLevel,
            expected: "an admitted mip level for the target"
          })
        };
      }
      const binding = createRenderTargetMaterialSource(target, inspected.value.descriptor, {
        ...sourceOptions,
        generation: inspected.value.generation,
        source: Object.freeze({
          kind: "render-texture-source",
          owner: sourceOwner,
          id: nextSourceId++,
          source: "target"
        })
      });
      if (!binding.ok) return binding;
      return { ok: true, value: binding.value.source };
    },
    resolveRenderTargetTextureSource(source) {
      if (disposed || source.owner !== sourceOwner || source.source !== "target") return void 0;
      const binding = resolveRenderTargetMaterialSource(source);
      if (binding === void 0) return void 0;
      if (!owner.inspect(binding.target).ok) return void 0;
      const physical = activePhysical.get(binding.target);
      if (physical === void 0) return binding;
      const view = physical.mipViews[binding.view.mipLevel] ?? physical.view;
      if (binding.generation !== physical.generation) return binding;
      return { ...binding, textureView: view };
    },
    requestTargetReadback(target, request) {
      const inspected = owner.inspect(target);
      if (!inspected.ok) return inspected;
      if (!inspected.value.descriptor.readback) {
        return {
          ok: false,
          error: new RenderTargetCapabilityMissingError({
            operation: "readback",
            requested: "readback=true",
            capability: "readback",
            actual: "false"
          })
        };
      }
      if (!Number.isInteger(request.mipLevel) || request.mipLevel < 0) {
        return {
          ok: false,
          error: new RenderTargetDescriptorInvalidError({
            field: "mipLevel",
            value: request.mipLevel,
            expected: "a non-negative integer"
          })
        };
      }
      const mipCount = renderTargetMipCount(inspected.value.descriptor);
      if (request.mipLevel >= mipCount) {
        return {
          ok: false,
          error: new RenderTargetDescriptorInvalidError({
            field: "mipLevel",
            value: request.mipLevel,
            expected: `mipLevel < ${mipCount}`
          })
        };
      }
      const layers = renderTargetLayerCount(inspected.value.descriptor);
      if (request.layer !== void 0 && (!Number.isInteger(request.layer) || request.layer < 0 || request.layer >= layers)) {
        return {
          ok: false,
          error: new RenderTargetLayerInvalidError({
            operation: "readback",
            layer: request.layer,
            shape: inspected.value.descriptor.shape,
            layerCount: layers
          })
        };
      }
      const ticket = opaqueTicket();
      const extent = resolveRenderTargetMipExtent(inspected.value.descriptor, request.mipLevel);
      const device = options.getDevice?.();
      const buffer = device?.createBuffer({
        label: `render-target-readback.${request.mipLevel}.${request.layer ?? 0}`,
        size: Math.ceil(
          extent.width * textureFormatBlock(inspected.value.descriptor.format).bytesPerBlock / 256
        ) * 256 * extent.height,
        usage: GPU_BUFFER_USAGE_COPY_DST | GPU_BUFFER_USAGE_MAP_READ,
        mappedAtCreation: false
      });
      if (buffer !== void 0 && !buffer.ok) {
        return {
          ok: false,
          error: new RenderTargetOperationFailedError({
            operation: "readback",
            stage: "allocation",
            generation: inspected.value.generation,
            cause: buffer.error,
            recovery: "retry"
          })
        };
      }
      const internalTicket = createRenderTargetReadbackTicket(target, {
        deviceGeneration: inspected.value.generation,
        mipLevel: request.mipLevel,
        ...request.layer === void 0 ? {} : { layer: request.layer },
        width: extent.width,
        height: extent.height,
        bytesPerPixel: textureFormatBlock(inspected.value.descriptor.format).bytesPerBlock
      });
      if (!internalTicket.ok) return internalTicket;
      const record = {
        target,
        request,
        ticket: internalTicket.value,
        ...buffer === void 0 || device === void 0 ? {} : { allocation: { device, buffer: buffer.value } },
        status: "pending"
      };
      readbacks.set(ticket, record);
      return { ok: true, value: ticket };
    },
    async observeTargetReadbacks(receipt, tickets) {
      const results = [];
      for (const publicTicket of tickets) {
        const record = readbacks.get(publicTicket);
        if (record === void 0) {
          return {
            ok: false,
            error: new RenderTargetStateInvalidError({
              operation: "readback",
              reason: "foreign-renderer",
              state: "destroyed",
              generation: receipt.deviceGeneration
            })
          };
        }
        const inspected = owner.inspect(record.target);
        if (!inspected.ok) return inspected;
        if (activePhysical.get(record.target) === void 0 || record.status !== "submitted") {
          return {
            ok: false,
            error: new RenderTargetStateInvalidError({
              operation: "readback",
              reason: "uninitialized",
              state: inspected.value.state,
              generation: inspected.value.generation
            })
          };
        }
        if (inspected.value.generation !== receipt.deviceGeneration || record.ticket.frameId !== receipt.frameId || record.ticket.deviceGeneration !== receipt.deviceGeneration) {
          return {
            ok: false,
            error: new RenderTargetStateInvalidError({
              operation: "readback",
              reason: "generation-mismatch",
              state: inspected.value.state,
              generation: inspected.value.generation
            })
          };
        }
        let bytes = new Uint8Array(record.ticket.byteLength);
        if (record.allocation !== void 0 && typeof record.allocation.buffer.mapAsync === "function") {
          const mapped = await record.allocation.buffer.mapAsync(1);
          if (!mapped.ok) {
            return {
              ok: false,
              error: new RenderTargetOperationFailedError({
                operation: "readback",
                stage: "copy",
                generation: receipt.deviceGeneration,
                cause: mapped.error,
                recovery: "retry"
              })
            };
          }
          const range = mapped.value.getMappedRange();
          if (!range.ok) {
            return {
              ok: false,
              error: new RenderTargetOperationFailedError({
                operation: "readback",
                stage: "copy",
                generation: receipt.deviceGeneration,
                cause: range.error,
                recovery: "retry"
              })
            };
          }
          bytes = new Uint8Array(range.value.slice(0));
          mapped.value.unmap();
        }
        const completed = completeRenderTargetReadback(record.ticket, receipt, bytes);
        if (!completed.ok) return completed;
        readbacks.delete(publicTicket);
        const failures = [];
        releaseReadback(record, failures);
        const retired = retirementResult(failures);
        if (!retired.ok) return retired;
        results.push({
          ticket: publicTicket,
          bytes: completed.value.bytes,
          frameId: completed.value.frameId,
          deviceGeneration: completed.value.deviceGeneration,
          mipLevel: completed.value.mipLevel,
          ...completed.value.layer === void 0 ? {} : { layer: completed.value.layer },
          bytesPerRow: record.ticket.bytesPerRow,
          byteLength: record.ticket.byteLength
        });
      }
      return { ok: true, value: Object.freeze(results) };
    },
    destroyRenderTarget(target) {
      const destroyed = owner.destroy(target);
      if (!destroyed.ok) return destroyed;
      const failures = releaseTarget(target);
      snapshots.release(target);
      targets.delete(target);
      return retirementResult(failures);
    },
    requestFramebufferSnapshot: snapshots.request,
    observeFramebufferSnapshots: snapshots.observe,
    encodeFramebufferSnapshots(encoder, source) {
      if (!disposed) snapshots.encode(encoder, source);
    },
    beginFrame() {
      if (disposed) return;
      frameWriters.clear();
      snapshots.beginFrame();
      for (const record of readbacks.values())
        if (record.status === "encoded") record.status = "pending";
      for (const target of targets) {
        const inspected = owner.inspect(target);
        if (!inspected.ok || inspected.value.state === "active" || inspected.value.state === "candidate") {
          continue;
        }
        stagePhysical(target);
      }
    },
    onFrameSubmitted(completed = Promise.resolve({ ok: true, value: void 0 }), receipt) {
      if (disposed) return;
      const submittedReadbacks = [];
      if (receipt !== void 0) snapshots.onFrameSubmitted(receipt, completed);
      if (receipt !== void 0) {
        for (const record of readbacks.values()) {
          if (record.status !== "encoded") continue;
          const bound = bindRenderTargetReadbackTicket(record.ticket, receipt);
          if (!bound.ok) {
            report(bound.error);
            continue;
          }
          record.status = "submitted";
          submittedReadbacks.push(record);
        }
      }
      const generation = currentGeneration();
      const submittedTargets = [...staged].flatMap((target) => {
        const physical = candidatePhysical.get(target);
        if (physical === void 0 || !submittedPhysicals.has(physical)) return [];
        staged.delete(target);
        return [{ target, physical }];
      });
      const completeSubmission = (result) => {
        if (disposed || submittedTargets.length === 0 && submittedReadbacks.length === 0) return;
        const failures = result.ok ? [] : [result.error];
        if (!result.ok) {
          for (const record of submittedReadbacks) {
            if (record.status !== "submitted" || record.ticket.frameId !== receipt?.frameId || record.ticket.consumed)
              continue;
            record.status = "pending";
            record.ticket.frameId = void 0;
          }
        }
        for (const { target, physical: submittedPhysical } of submittedTargets) {
          if (candidatePhysical.get(target) !== submittedPhysical) continue;
          const candidate = owner.inspect(target);
          if (!candidate.ok || candidate.value.candidate === void 0) continue;
          try {
            if (!result.ok) {
              owner.rejectCandidate(target, candidate.value.candidate.generation, "submit");
              candidatePhysical.delete(target);
              releasePhysical(submittedPhysical, failures);
              continue;
            }
            if (options.canPromoteTarget?.(target) === false) {
              staged.add(target);
              continue;
            }
            if (submittedPhysical === void 0) {
              owner.rejectCandidate(target, candidate.value.candidate.generation, "submit");
              continue;
            }
            const promoted = owner.promote(target, candidate.value.candidate.generation);
            if (!promoted.ok) {
              failures.push(promoted.error);
              candidatePhysical.delete(target);
              releasePhysical(submittedPhysical, failures);
              continue;
            }
            const previous = activePhysical.get(target);
            activePhysical.set(target, submittedPhysical);
            candidatePhysical.delete(target);
            releasePhysical(previous, failures);
          } catch (cause) {
            owner.rejectCandidate(target, candidate.value.candidate.generation, "submit");
            candidatePhysical.delete(target);
            releasePhysical(submittedPhysical, failures);
            failures.push(
              new RenderTargetOperationFailedError({
                operation: "create",
                stage: "submit",
                generation,
                cause,
                recovery: "retain-last-known-good"
              })
            );
          }
        }
        for (const failure4 of failures) report(failure4);
      };
      void completed.then(
        completeSubmission,
        (cause) => completeSubmission({
          ok: false,
          error: new RenderTargetOperationFailedError({
            operation: "create",
            stage: "submit",
            generation,
            cause,
            recovery: "retain-last-known-good"
          })
        })
      );
    },
    markTargetSubmitted,
    getPhysicalTarget(target) {
      frameWriters.add(target);
      return candidatePhysical.get(target) ?? activePhysical.get(target);
    },
    encodePendingReadbacks(encoder, written) {
      for (const record of readbacks.values()) {
        if (record.status !== "pending" || record.allocation === void 0) continue;
        const layer = record.ticket.layer ?? 0;
        const writtenHere = record.ticket.layer !== void 0 && (written?.some((write) => write.target === record.target && write.layer === layer) ?? false);
        const candidate = candidatePhysical.get(record.target);
        const physical = writtenHere && candidate !== void 0 ? candidate : activePhysical.get(record.target);
        if (physical === void 0) continue;
        const source = physical.resolveTexture ?? physical.texture;
        encoder.copyTextureToBuffer(
          {
            texture: source,
            mipLevel: record.ticket.mipLevel,
            origin: { x: 0, y: 0, z: layer }
          },
          {
            buffer: record.allocation.buffer,
            bytesPerRow: record.ticket.bytesPerRow,
            rowsPerImage: record.ticket.height
          },
          [record.ticket.width, record.ticket.height, 1]
        );
        record.status = "encoded";
      }
    },
    recover() {
      if (disposed) return;
      const generation = currentGeneration();
      const failures = [];
      for (const target of targets) {
        const inspected = owner.inspect(target);
        if (!inspected.ok || inspected.value.generation >= generation) continue;
        const begun = owner.beginRecovery(target, generation);
        if (!begun.ok) {
          failures.push(begun.error);
          continue;
        }
        failures.push(...releaseTarget(target));
        const finished = owner.finishRecovery(target);
        if (!finished.ok) failures.push(finished.error);
      }
      for (const failure4 of failures) report(failure4);
    },
    dispose() {
      disposed = true;
      retireRenderTargetMaterialSources(sourceOwner);
      const failures = [];
      for (const target of targets) {
        failures.push(...releaseTarget(target));
        const destroyed = owner.destroy(target);
        if (!destroyed.ok) failures.push(destroyed.error);
      }
      targets.clear();
      staged.clear();
      readbacks.clear();
      snapshots.clear();
      frameWriters.clear();
      for (const failure4 of failures) report(failure4);
    }
  });
}

// sdk/engine/node_modules/@forgeax/engine-render/src/publication/targets.ts
var RenderPublicationTargetOwner = class {
  host = createRenderTargetHost();
  ids = /* @__PURE__ */ new WeakMap();
  nextId = 0;
  authoring = this.host;
  snapshot() {
    return this.host.descriptions().map(({ target, descriptor }) => {
      let id = this.ids.get(target);
      if (id === void 0) {
        id = ++this.nextId;
        this.ids.set(target, id);
      }
      return { id, token: target, descriptor };
    });
  }
  dispose() {
    this.host.dispose();
  }
};
function publicationTargetSources(materials) {
  const sources = /* @__PURE__ */ new Map();
  for (const { value: material } of materials) {
    for (const source of material.textureSources?.values() ?? []) {
      if (isCanvasTextureSource(source) || isExternalTextureSource(source) || sources.has(renderTextureSourceKey(source)))
        continue;
      const binding = resolveRenderTargetMaterialSource(source);
      if (binding === void 0)
        throw new RenderPublicationError({
          reason: "shape",
          subject: "unknown material target source"
        });
      sources.set(renderTextureSourceKey(source), {
        token: source,
        target: binding.target,
        options: {
          aspect: "color",
          dimension: binding.view.dimension,
          mipLevel: binding.view.mipLevel
        }
      });
    }
  }
  return [...sources.values()];
}
var RenderPublicationTargetReceiver = class {
  constructor(host) {
    this.host = host;
  }
  host;
  targets = /* @__PURE__ */ new Map();
  apply(input) {
    const packet = input.packet;
    if (packet.targets.length === 0 && packet.targetSources.length === 0 && this.targets.size === 0)
      return input;
    const tokens = /* @__PURE__ */ new Map();
    const records = /* @__PURE__ */ new Map();
    const active = new Set(packet.targets.map((row) => row.id));
    for (const [id, record] of this.targets)
      if (!active.has(id)) {
        const destroyed = this.host.destroyRenderTarget(record.target);
        if (!destroyed.ok) throw destroyed.error;
        this.targets.delete(id);
      }
    for (const row of packet.targets) {
      let record = this.targets.get(row.id);
      if (record === void 0) {
        const created = this.host.createRenderTarget(row.descriptor);
        if (!created.ok) throw created.error;
        record = { target: created.value, descriptor: row.descriptor, sources: /* @__PURE__ */ new Map() };
        this.targets.set(row.id, record);
      } else if (JSON.stringify(record.descriptor) !== JSON.stringify(row.descriptor)) {
        const resized = this.host.resizeRenderTarget(record.target, row.descriptor);
        if (!resized.ok) throw resized.error;
        record.descriptor = row.descriptor;
        record.sources.clear();
      }
      tokens.set(row.token, record.target);
      records.set(row.token, record);
    }
    const resolve = (token2) => {
      const target = tokens.get(token2);
      if (target === void 0)
        throw new RenderPublicationError({ reason: "shape", subject: "missing target descriptor" });
      return target;
    };
    const sources = /* @__PURE__ */ new Map();
    for (const row of packet.targetSources) {
      const record = records.get(row.target);
      if (record === void 0)
        throw new RenderPublicationError({ reason: "shape", subject: "missing material target" });
      const key = JSON.stringify(row.options);
      let source = record.sources.get(key);
      if (source === void 0) {
        const created = this.host.createRenderTargetTextureSource(record.target, row.options);
        if (!created.ok) throw created.error;
        source = created.value;
        record.sources.set(key, source);
      }
      sources.set(renderTextureSourceKey(row.token), source);
    }
    const camera = (row) => row.target === void 0 ? row : { ...row, target: resolve(row.target) };
    const rebound = /* @__PURE__ */ new Map();
    const rebind = (material) => {
      const existing = rebound.get(material);
      if (existing !== void 0) return existing;
      if (material.snapshot.textureSources === void 0) return material;
      const textureSources = new Map(
        [...material.snapshot.textureSources].map(([name, token2]) => {
          if (isCanvasTextureSource(token2) || isExternalTextureSource(token2))
            return [name, token2];
          const source = sources.get(renderTextureSourceKey(token2));
          if (source === void 0)
            throw new RenderPublicationError({
              reason: "shape",
              subject: "missing material target source"
            });
          return [name, source];
        })
      );
      const resource = MaterialResource.from({ ...material.snapshot, textureSources });
      rebound.set(material, resource);
      return resource;
    };
    const materialUpdates = input.materialUpdates.map(rebind);
    const renderables = input.frame.renderables.map((row) => {
      const materials = row.materials.map(rebind);
      const first = row.materials.indexOf(row.material);
      return { ...row, materials, material: materials[Math.max(0, first)] ?? row.material };
    });
    const snapshots = new Map(renderables.map((row) => [row.entityKey, row]));
    return {
      ...input,
      materialUpdates,
      frame: {
        ...input.frame,
        renderables,
        cameras: input.frame.cameras.map(camera),
        auxiliaryCameras: input.frame.auxiliaryCameras.map(camera),
        cubeCameras: input.frame.cubeCameras.map(camera)
      },
      operations: input.operations.map((operation) => {
        if (operation.kind === "remove" || operation.snapshot === void 0) return operation;
        const snapshot = snapshots.get(operation.entityKey);
        if (snapshot === void 0)
          throw new RenderPublicationError({
            reason: "shape",
            subject: "missing remapped snapshot"
          });
        return { ...operation, snapshot };
      })
    };
  }
};

// sdk/engine/node_modules/@forgeax/engine-render/src/raytracing/visible-surface.ts
import { RhiError } from "@forgeax/engine-rhi";
import { err as err3, ok as ok3 } from "@forgeax/engine-types";
var VISIBLE_SURFACE_RECORD_WORDS = 16;
function invalid2(expected, hint) {
  return err3(new RhiError({ code: "rhi-descriptor-invalid", expected, hint }));
}
function projectVisibleSurfaces(slots, maxRecords) {
  if (!Number.isSafeInteger(maxRecords) || maxRecords < 0 || maxRecords > 4294967294) {
    return invalid2(
      "a bounded u32 visible-surface row budget",
      "set the renderer row budget before projection"
    );
  }
  const slotBases = /* @__PURE__ */ new Map();
  const entityBases = /* @__PURE__ */ new Map();
  const ordered = [...slots].sort((a, b) => a.slot - b.slot);
  let count = 0;
  for (const slot of ordered) {
    const source = slot.snapshot;
    if (source.assetHandle === void 0) continue;
    const draws = source.gpuDrivenDraws ?? [];
    if (source.authorVisible === false || draws.length === 0) continue;
    if (slotBases.has(slot.slot)) {
      return invalid2(
        "one retained RenderScene record per slot",
        "rebuild the scene projection from the owning renderer"
      );
    }
    if (source.skin !== void 0 || source.morph !== void 0 || (source.lods?.length ?? 0) > 0)
      continue;
    const instances = source.instances;
    const instanceCount = instances?.instanceCount ?? 1;
    if (!Number.isSafeInteger(instanceCount) || instanceCount < 1) {
      return invalid2(
        "a positive admitted instance count",
        "repair the Instances producer before preparing visible surfaces"
      );
    }
    if (instances !== void 0) {
      const generations = instances.generations;
      if (generations?.length !== instanceCount || new Set(generations).size !== instanceCount || generations.some((generation) => generation === 0)) {
        return invalid2(
          "unique nonzero owner generations for every instance",
          "publish stable Instances generations; ordinals alone cannot prove history after reordering or reuse"
        );
      }
    }
    let drawCount = 0;
    const seen = /* @__PURE__ */ new Set();
    for (const [index, draw] of draws.entries()) {
      const drawItem = gpuDrivenSourceDrawItemIndex(draw, index);
      if (!Number.isSafeInteger(drawItem) || drawItem < 0 || seen.has(drawItem) || draw.topology !== "triangle-list" || !Number.isInteger(draw.first) || draw.first < 0 || !Number.isInteger(draw.count) || draw.count < 0 || draw.count % 3 !== 0 || draw.first + draw.count > 4294967295 || !Number.isInteger(draw.baseVertex) || draw.baseVertex < -2147483648 || draw.baseVertex > 2147483647) {
        return invalid2(
          "unique triangle-list source draw ranges",
          "repair source submesh identities and triangle ranges before raster admission"
        );
      }
      seen.add(drawItem);
      drawCount = Math.max(drawCount, drawItem + 1);
    }
    const required = drawCount * instanceCount;
    if (!Number.isSafeInteger(required) || required > maxRecords - count) {
      return invalid2(
        "the complete visible-surface projection fits its row budget",
        "increase the explicit renderer budget or reduce admitted content; do not truncate contributors"
      );
    }
    slotBases.set(slot.slot, count + 1);
    entityBases.set(worldEntityKey(slot.worldId, slot.entityKey), count + 1);
    count += required;
  }
  const records = new Uint32Array(count * VISIBLE_SURFACE_RECORD_WORDS);
  for (const slot of ordered) {
    const base = slotBases.get(slot.slot);
    if (base === void 0) continue;
    const source = slot.snapshot;
    if (source.assetHandle === void 0) continue;
    const instanceCount = source.instances?.instanceCount ?? 1;
    for (const [index, draw] of (source.gpuDrivenDraws ?? []).entries()) {
      const drawItemIndex = gpuDrivenSourceDrawItemIndex(draw, index);
      const material = source.materials[draw.materialSlot]?.snapshot;
      if (material === void 0) {
        return invalid2(
          "each visible draw resolves its own material slot",
          "repair the mesh/material binding before preparing the raster frame"
        );
      }
      for (let instanceOrdinal = 0; instanceOrdinal < instanceCount; instanceOrdinal++) {
        const offset = (base - 1 + drawItemIndex * instanceCount + instanceOrdinal) * VISIBLE_SURFACE_RECORD_WORDS;
        records.set(
          [
            slot.slot,
            slot.generation,
            slot.worldId,
            slot.entityKey,
            instanceOrdinal,
            source.instances?.generations?.[instanceOrdinal] ?? 0,
            drawItemIndex,
            material.materialHandle ?? 0,
            source.assetHandle,
            draw.first,
            draw.count,
            draw.baseVertex,
            draw.kind === "indexed" ? 1 : 0
          ],
          offset
        );
      }
    }
  }
  return ok3({ records, slotBases, entityBases });
}
function resolveVisibleSurface(projection, row, primitive) {
  if (row === 0) return ok3(void 0);
  const offset = (row - 1) * VISIBLE_SURFACE_RECORD_WORDS;
  const words = projection.records;
  if (!Number.isInteger(row) || row < 1 || offset + VISIBLE_SURFACE_RECORD_WORDS > words.length || // RenderScene generations start at zero. A hole has no source elements;
  // generation zero must never be used as a missing-record sentinel.
  words[offset + 10] === 0) {
    return invalid2(
      "a covered raster row from the same submitted frame",
      "use the projection retained with this capture/receipt, not the latest live scene"
    );
  }
  if (!Number.isInteger(primitive) || primitive < 0 || primitive >= (words[offset + 10] ?? 0) / 3) {
    return invalid2(
      "a draw-local primitive inside the captured source range",
      "inspect the selected raster draw and its matching frame projection"
    );
  }
  return ok3({
    slot: words[offset] ?? 0,
    generation: words[offset + 1] ?? 0,
    worldId: words[offset + 2] ?? 0,
    entityKey: words[offset + 3] ?? 0,
    instanceOrdinal: words[offset + 4] ?? 0,
    instanceGeneration: words[offset + 5] ?? 0,
    drawItemIndex: words[offset + 6] ?? 0,
    materialHandle: words[offset + 7] ?? 0,
    assetHandle: words[offset + 8] ?? 0,
    firstElement: (words[offset + 9] ?? 0) + primitive * 3,
    baseVertex: (words[offset + 11] ?? 0) | 0,
    indexed: words[offset + 12] === 1
  });
}

// sdk/engine/node_modules/@forgeax/engine-render/src/reflection/filter.ts
function createProbeFilterState(input) {
  return {
    probeIndex: input.probeIndex,
    faceCount: input.faceCount ?? 6,
    mipCount: input.mipCount,
    cursor: 0,
    activeGeneration: input.activeGeneration ?? 0
  };
}
function advanceProbeFilter(state) {
  const total = state.faceCount * state.mipCount;
  if (state.cursor >= total) return void 0;
  return {
    probeIndex: state.probeIndex,
    faceIndex: state.cursor % state.faceCount,
    mipLevel: Math.floor(state.cursor / state.faceCount)
  };
}
function commitProbeFilterStep(state, success) {
  if (!success || state.cursor >= state.faceCount * state.mipCount) return state;
  const nextCursor = Math.min(
    state.cursor + PMREM_FACES_PER_STEP,
    state.faceCount * state.mipCount
  );
  const complete = nextCursor >= state.faceCount * state.mipCount;
  return {
    ...state,
    cursor: nextCursor,
    activeGeneration: complete ? state.activeGeneration + 1 : state.activeGeneration
  };
}
function probeFilterIsSteady(state) {
  return state.cursor >= state.faceCount * state.mipCount;
}
function normalize(vector) {
  const length = Math.hypot(vector[0], vector[1], vector[2]);
  if (length === 0) return [0, 0, 1];
  return [vector[0] / length, vector[1] / length, vector[2] / length];
}
function boxProjectReflectionDirection(direction, boxCenter, halfExtents, point) {
  const ray = normalize(direction);
  for (const axis of [0, 1, 2]) {
    if (Math.abs(point[axis] - boxCenter[axis]) >= halfExtents[axis]) return ray;
  }
  let distance = Number.POSITIVE_INFINITY;
  for (let axis = 0; axis < 3; axis += 1) {
    const component = ray[axis] ?? 0;
    if (component === 0) continue;
    const extent = halfExtents[axis] ?? 0;
    const edge = component > 0 ? (boxCenter[axis] ?? 0) + extent : (boxCenter[axis] ?? 0) - extent;
    const candidate = (edge - (point[axis] ?? 0)) / component;
    if (candidate > 0) distance = Math.min(distance, candidate);
  }
  if (!Number.isFinite(distance)) return ray;
  return normalize([
    (point[0] ?? 0) + ray[0] * distance - (boxCenter[0] ?? 0),
    (point[1] ?? 0) + ray[1] * distance - (boxCenter[1] ?? 0),
    (point[2] ?? 0) + ray[2] * distance - (boxCenter[2] ?? 0)
  ]);
}

// sdk/engine/node_modules/@forgeax/engine-render/src/reflection/gpu-table.ts
function buildReflectionProbeTable(rows) {
  const ordered = rows.slice().sort((a, b) => a.index - b.index);
  const indices = /* @__PURE__ */ new Map();
  for (const row of ordered) {
    if (row.primitiveKey !== void 0) indices.set(row.primitiveKey, row.index);
  }
  const indexFor = (primitiveKey2) => indices.get(primitiveKey2);
  return {
    rows: Object.freeze(ordered),
    cpuIndexByPrimitive: indexFor,
    gpuIndexByPrimitive: indexFor
  };
}
function reflectionProbeTableBytes(table) {
  return table.rows.length * 48;
}

// sdk/engine/node_modules/@forgeax/engine-render/src/reflection/inspection.ts
function recoveryFor(receipt, failure4) {
  if (failure4 !== void 0) {
    const code = failure4.code.toLowerCase();
    if (code.includes("device") || code.includes("format") || code.includes("capability")) {
      return "rebuild";
    }
    if (failure4.stage === "prepare" || failure4.stage === "filter") return "recapture";
    if (failure4.stage === "build" || failure4.stage === "encode") return "rebuild";
    if (failure4.stage === "finish" || failure4.stage === "submit") return "retry";
    if (failure4.stage === "completion") {
      if (receipt.source === "probe" && (receipt.state === "active" || receipt.state === "lkg")) {
        return "use-LKG";
      }
      if (receipt.source === "skylight" && (receipt.state === "active" || receipt.state === "lkg")) {
        return "use-Skylight";
      }
      if (receipt.source === "neutral" && receipt.state === "neutral") return "use-neutral";
      return "retry";
    }
  }
  if (receipt.source === "probe" && (receipt.state === "active" || receipt.state === "lkg")) {
    return "use-LKG";
  }
  if (receipt.source === "skylight" || receipt.state === "lkg") return "use-Skylight";
  return "use-neutral";
}
function inspectReflectionFallback(receipt, failure4) {
  return {
    receipt,
    recoveryAction: recoveryFor(receipt, failure4),
    ...failure4 === void 0 ? {} : {
      failureStage: failure4.stage,
      failureCode: failure4.code,
      expected: failure4.expected,
      ...failure4.detail === void 0 ? {} : { detail: failure4.detail }
    }
  };
}

// sdk/engine/node_modules/@forgeax/engine-render/src/reflection/projection.ts
var REFLECTION_PROBE_BYTES_PER_TEXEL = 8;
var DEFAULT_REFLECTION_PROBE_LIMITS = Object.freeze({
  maxProbes: 16,
  maxResolution: 256,
  maxBytes: 64 * 1024 * 1024
});
function validateReflectionProbeInput(input) {
  for (let index = 0; index < input.halfExtents.length; index += 1) {
    const value = input.halfExtents[index];
    if (value === void 0 || !Number.isFinite(value) || value <= 0) {
      return {
        ok: false,
        error: {
          code: "reflection-probe-input-invalid",
          field: `halfExtents[${index}]`,
          value,
          expected: "a finite number greater than zero"
        }
      };
    }
  }
  if (!Number.isFinite(input.priority)) {
    return {
      ok: false,
      error: {
        code: "reflection-probe-input-invalid",
        field: "priority",
        value: input.priority,
        expected: "a finite number"
      }
    };
  }
  if (!Number.isFinite(input.intensity) || input.intensity < 0) {
    return {
      ok: false,
      error: {
        code: "reflection-probe-input-invalid",
        field: "intensity",
        value: input.intensity,
        expected: "a finite number greater than or equal to zero"
      }
    };
  }
  if (!Number.isInteger(input.resolution) || input.resolution < 16 || (input.resolution & input.resolution - 1) !== 0) {
    return {
      ok: false,
      error: {
        code: "reflection-probe-input-invalid",
        field: "resolution",
        value: input.resolution,
        expected: "a power of two of at least 16 pixels"
      }
    };
  }
  return { ok: true };
}
function estimateReflectionProbeBytes(resolution, limits = DEFAULT_REFLECTION_PROBE_LIMITS) {
  const maxResolution = limits.maxResolution ?? DEFAULT_REFLECTION_PROBE_LIMITS.maxResolution;
  const clamped = Math.min(resolution, maxResolution);
  const extent = pmremExtent(clamped);
  return (clamped * clamped * 6 + extent.width * extent.height * 3) * REFLECTION_PROBE_BYTES_PER_TEXEL + clamped * clamped * 4;
}
function admitReflectionProbe(input, current, limits = DEFAULT_REFLECTION_PROBE_LIMITS) {
  const maxProbes = limits.maxProbes ?? DEFAULT_REFLECTION_PROBE_LIMITS.maxProbes;
  const maxBytes = limits.maxBytes ?? DEFAULT_REFLECTION_PROBE_LIMITS.maxBytes;
  const maxResolution = limits.maxResolution ?? DEFAULT_REFLECTION_PROBE_LIMITS.maxResolution;
  const requested = estimateReflectionProbeBytes(input.resolution, { maxResolution });
  if (input.resolution > maxResolution || current.acceptedCount >= maxProbes || current.acceptedBytes + requested > maxBytes) {
    return {
      ok: false,
      error: {
        code: "reflection-probe-budget-exceeded",
        requested,
        activeCount: current.acceptedCount,
        activeBytes: current.acceptedBytes,
        maxProbes,
        maxBytes
      }
    };
  }
  return { ok: true, acceptedBytes: current.acceptedBytes + requested };
}
function resolveReflectionFallbackSource(selection, probeReady, skylightAvailable = true) {
  if (selection.kind === "probe" && probeReady) return "probe";
  if (skylightAvailable) return "skylight";
  return "neutral";
}
function reflectionFallbackCoverage(source, fact, selection) {
  if (source === "neutral") return 0;
  if (source === "skylight") return 1;
  if (fact === void 0 || selection.kind !== "probe") return 0;
  const normalized = Math.sqrt(Math.max(0, selection.normalizedDistance));
  return Math.max(0, Math.min(1, 1 - normalized / Math.sqrt(3)));
}
function reflectionFallbackSourceKey(source, selection, skylight) {
  if (source === "probe" && selection.kind === "probe") {
    return `probe:${selection.worldId}:${selection.entityKey}`;
  }
  if (source === "skylight" && skylight !== void 0) {
    return `skylight:${skylight.entityHandle}:${skylight.equirectHandle}`;
  }
  return source;
}
function reflectionFallbackProjectionSignature(input) {
  return JSON.stringify({
    renderableKey: input.renderableKey,
    sourceKey: input.sourceKey,
    source: input.source,
    coverage: input.coverage,
    extent: input.extent,
    brdfSignature: input.brdfSignature
  });
}
function deriveReflectionFallbackProjection(input) {
  if (!Number.isFinite(input.coverage) || input.coverage < 0 || input.coverage > 1) {
    return {
      ok: false,
      error: {
        code: "reflection-fallback-input-invalid",
        field: "coverage",
        expected: "a finite number between zero and one"
      }
    };
  }
  if (input.extent?.some((value) => !Number.isFinite(value) || value <= 0)) {
    return {
      ok: false,
      error: {
        code: "reflection-fallback-input-invalid",
        field: "extent",
        expected: "three finite numbers greater than zero"
      }
    };
  }
  if (input.linearHdr.some((value) => !Number.isFinite(value))) {
    return {
      ok: false,
      error: {
        code: "reflection-fallback-input-invalid",
        field: "linearHdr",
        expected: "four finite linear HDR values"
      }
    };
  }
  if (input.brdfSignature.length === 0) {
    return {
      ok: false,
      error: {
        code: "reflection-fallback-input-invalid",
        field: "brdfSignature",
        expected: "a non-empty BRDF signature"
      }
    };
  }
  const linearHdr = input.source === "neutral" ? [0, 0, 0, 0] : [...input.linearHdr];
  return {
    ok: true,
    value: Object.freeze({
      ...input.renderableKey === void 0 ? {} : { renderableKey: input.renderableKey },
      ...input.sourceKey === void 0 ? {} : { sourceKey: input.sourceKey },
      source: input.source,
      coverage: input.coverage,
      ...input.extent === void 0 ? {} : {
        extent: Object.freeze([...input.extent])
      },
      linearHdr: Object.freeze(linearHdr),
      brdfSignature: input.brdfSignature
    })
  };
}
function contains(fact, point) {
  return fact.halfExtents.every((extent, axis) => {
    const center = fact.center[axis] ?? 0;
    const coordinate = point[axis] ?? 0;
    return Math.abs(coordinate - center) <= extent;
  });
}
function normalizedDistance(fact, point) {
  let squared = 0;
  for (let axis = 0; axis < 3; axis += 1) {
    const delta = (point[axis] ?? 0) - (fact.center[axis] ?? 0);
    const extent = fact.halfExtents[axis] ?? 1;
    squared += (delta / extent) ** 2;
  }
  return squared;
}
function isBetter(candidate, current, facts) {
  const candidateFact = facts.find(
    (fact) => fact.worldId === candidate.worldId && fact.entityKey === candidate.entityKey
  );
  const currentFact = facts.find(
    (fact) => fact.worldId === current.worldId && fact.entityKey === current.entityKey
  );
  if (candidateFact === void 0 || currentFact === void 0) return false;
  if (candidateFact.priority !== currentFact.priority)
    return candidateFact.priority > currentFact.priority;
  if (candidate.normalizedDistance !== current.normalizedDistance) {
    return candidate.normalizedDistance < current.normalizedDistance;
  }
  return candidate.worldId < current.worldId || candidate.worldId === current.worldId && candidate.entityKey < current.entityKey;
}
function selectReflectionProbe(facts, primitiveCenter) {
  let selected;
  for (const fact of facts) {
    if (!contains(fact, primitiveCenter)) continue;
    const candidate = {
      kind: "probe",
      worldId: fact.worldId,
      entityKey: fact.entityKey,
      normalizedDistance: normalizedDistance(fact, primitiveCenter)
    };
    if (selected === void 0 || isBetter(candidate, selected, facts)) selected = candidate;
  }
  return selected ?? { kind: "skylight" };
}
function primitiveKey(worldId, entityKey) {
  return `${worldId}:${entityKey}`;
}
var ReflectionProbeProjection = class {
  revision = 0;
  facts = [];
  selected = /* @__PURE__ */ new Map();
  signature = "";
  scannedPrimitives = 0;
  update(facts, primitives) {
    const nextFacts = facts.slice().sort((a, b) => a.worldId - b.worldId || a.entityKey - b.entityKey);
    const signature = JSON.stringify({ facts: nextFacts, primitives });
    if (signature === this.signature) return this.snapshot();
    this.signature = signature;
    this.facts = nextFacts;
    this.selected = /* @__PURE__ */ new Map();
    for (const primitive of primitives) {
      this.selected.set(
        primitive.renderableKey ?? primitiveKey(primitive.worldId, primitive.entityKey),
        selectReflectionProbe(nextFacts, primitive.center)
      );
    }
    this.scannedPrimitives = primitives.length;
    this.revision += 1;
    return this.snapshot();
  }
  snapshot() {
    return {
      revision: this.revision,
      facts: this.facts,
      selected: this.selected,
      scannedPrimitives: this.scannedPrimitives
    };
  }
  selection(worldId, entityKey) {
    return this.selected.get(primitiveKey(worldId, entityKey)) ?? { kind: "skylight" };
  }
};

// sdk/engine/node_modules/@forgeax/engine-render/src/scene/visibility/inspection.ts
var LOD_OCCLUSION_INSPECTION_SCHEMA = "forgeax::lod-occlusion-inspection::v3";
var LOD_OCCLUSION_INSPECTION_MAX_BYTES = 16 * 1024;
var MAX_INSPECTION_SAMPLES = 64;
function nonNegativeInteger2(name, value) {
  if (!Number.isInteger(value) || value < 0)
    throw new Error(`${name} must be a non-negative integer`);
  return value;
}
function copySamples(samples) {
  return Object.freeze(
    [...samples].sort((left, right) => left.primitiveSlot - right.primitiveSlot).slice(0, MAX_INSPECTION_SAMPLES).map(
      (sample) => Object.freeze({
        primitiveSlot: nonNegativeInteger2("sample.primitiveSlot", sample.primitiveSlot),
        level: nonNegativeInteger2("sample.level", sample.level),
        visible: sample.visible
      })
    )
  );
}
function copyWorldAttribution(attribution) {
  if (attribution === void 0) {
    return Object.freeze({ status: "unavailable", reason: "projection-only" });
  }
  if (attribution.status === "same-submit") {
    if (typeof attribution.submit.build !== "string" || attribution.submit.build.length === 0) {
      throw new Error("world.attribution.submit.build must be a non-empty string");
    }
    nonNegativeInteger2("world.attribution.submit.frameId", attribution.submit.frameId);
    nonNegativeInteger2(
      "world.attribution.submit.deviceGeneration",
      attribution.submit.deviceGeneration
    );
    return Object.freeze({
      status: "same-submit",
      submit: Object.freeze({ ...attribution.submit })
    });
  }
  if (attribution.status !== "unavailable" || attribution.reason !== "projection-only") {
    throw new Error("world.attribution must declare same-submit or projection-only");
  }
  return Object.freeze({ status: "unavailable", reason: "projection-only" });
}
function copyRow(row) {
  for (const [name, value] of Object.entries({
    generation: row.generation,
    candidates: row.count.candidates,
    visible: row.count.visible,
    occluded: row.count.occluded
  }))
    nonNegativeInteger2(`inspection.${name}`, value);
  if (row.view.cameraEntity < 0 || row.view.viewGeneration < 0 || row.slot.primitiveSlot < 0 || row.slot.slotGeneration < 0) {
    throw new Error("inspection identity values must be non-negative");
  }
  return Object.freeze({
    root: Object.freeze({ ...row.root }),
    view: Object.freeze({ ...row.view }),
    slot: Object.freeze({ ...row.slot }),
    generation: row.generation,
    count: Object.freeze({ ...row.count }),
    lodHistogram: Object.freeze(
      row.lodHistogram.map(
        (histogram) => Object.freeze({
          level: nonNegativeInteger2("histogram.level", histogram.level),
          count: nonNegativeInteger2("histogram.count", histogram.count)
        })
      )
    ),
    samples: copySamples(row.samples)
  });
}
function copyWorlds(worlds, fallback) {
  const source = worlds ?? [{ attachmentId: fallback.view.attachmentId, rows: [fallback] }];
  return Object.freeze(
    source.map(
      (world) => Object.freeze({
        attachmentId: world.attachmentId,
        rows: Object.freeze(world.rows.map((row) => copyRow(row))),
        attribution: copyWorldAttribution(world.attribution)
      })
    )
  );
}
function inspectLodOcclusion(input) {
  const row = copyRow(input);
  const submit = input.submit ?? {
    frameId: input.generation,
    build: "unknown",
    deviceGeneration: 0
  };
  nonNegativeInteger2("inspection.submit.frameId", submit.frameId);
  nonNegativeInteger2("inspection.submit.deviceGeneration", submit.deviceGeneration);
  if (typeof submit.build !== "string" || submit.build.length === 0) {
    throw new Error("inspection.submit.build must be a non-empty string");
  }
  const worlds = copyWorlds(input.worlds, row);
  for (const world of worlds) {
    if (world.attribution.status === "same-submit" && (world.attribution.submit.frameId !== submit.frameId || world.attribution.submit.build !== submit.build || world.attribution.submit.deviceGeneration !== submit.deviceGeneration)) {
      throw new Error("world attribution must reference the parent inspection submit");
    }
  }
  const inspection = Object.freeze({
    schema: LOD_OCCLUSION_INSPECTION_SCHEMA,
    ...row,
    submit: Object.freeze({ ...submit }),
    worlds
  });
  if (JSON.stringify(inspection).length > LOD_OCCLUSION_INSPECTION_MAX_BYTES) {
    throw new Error(`LOD occlusion inspection exceeds ${LOD_OCCLUSION_INSPECTION_MAX_BYTES} bytes`);
  }
  return inspection;
}
function serializeLodOcclusionInspection(inspection) {
  const serialized = JSON.stringify(inspection);
  if (serialized.length > LOD_OCCLUSION_INSPECTION_MAX_BYTES) {
    throw new Error(`LOD occlusion inspection exceeds ${LOD_OCCLUSION_INSPECTION_MAX_BYTES} bytes`);
  }
  return serialized;
}

// sdk/engine/node_modules/@forgeax/engine-render/src/ssr/admission.ts
import {
  validateR32FloatReceipt
} from "@forgeax/engine-rhi";
import { err as err4, ok as ok4 } from "@forgeax/engine-types";
var SSR_FORMAT_PROFILE = "r32float-mip-sampled-storage";
var SSR_FORMAT_STAGES = Object.freeze([
  "texture-create",
  "mip-view",
  "sampled-storage-bind-group",
  "pipeline-bind",
  "finish",
  "submit",
  "completion",
  "readback"
]);
var ZERO_WORK = Object.freeze({
  attachmentCount: 0,
  passCount: 0,
  bindingCount: 0,
  resourceCount: 0,
  historyCount: 0,
  temporalDemand: 0
});
var ADMITTED_WORK = Object.freeze({
  attachmentCount: 1,
  passCount: 1,
  bindingCount: 1,
  resourceCount: 1,
  historyCount: 0,
  temporalDemand: 0
});
var ZERO_BUDGET = Object.freeze({
  probeExecutions: 0,
  resetCount: 0,
  rebuildCount: 0
});
var ADMITTED_BUDGET = Object.freeze({
  probeExecutions: 1,
  resetCount: 0,
  rebuildCount: 0
});
function identityFieldMismatch(expected, actual) {
  for (const field of ["sourceHead", "sourceTree", "lockSha256", "buildSha256"]) {
    if (expected[field] !== actual[field]) return field;
  }
  return void 0;
}
function blocked(identity, failure4, generation = 0) {
  return Object.freeze({
    status: "fallback-only",
    identity,
    generation,
    work: ZERO_WORK,
    budget: ZERO_BUDGET,
    failure: failure4
  });
}
function failure2(code, owner, hint, detail = {}) {
  const action = recoveryActionFor(code);
  return Object.freeze({
    code,
    expected: "all producer, format, and temporal receipts share one admitted identity",
    hint,
    detail: Object.freeze({ owner, action, ...detail })
  });
}
function recoveryActionFor(code) {
  switch (code) {
    case "ssr-reflection-fallback-unavailable":
    case "ssr-receipt-identity-mismatch":
      return "rebuild";
    case "ssr-not-requested":
    case "ssr-format-unavailable":
    case "ssr-temporal-unavailable":
    case "ssr-receipt-stale":
      return "retry";
  }
}
function receiptFailure(input, receipt, owner) {
  const field = identityFieldMismatch(input.identity, receipt.identity);
  if (field === void 0) return void 0;
  return blocked(
    input.identity,
    failure2("ssr-receipt-identity-mismatch", owner, "rebuild the owner receipt for this identity", {
      identityField: field
    })
  );
}
function validFallback(receipt) {
  return receipt !== void 0 && receipt.candidateVisible === false && Number.isFinite(receipt.coverage) && receipt.coverage >= 0 && receipt.coverage <= 1 && (receipt.sourceKey === void 0 || receipt.sourceKey.length > 0) && (receipt.extent === void 0 || receipt.extent.length === 3 && receipt.extent.every((value) => Number.isFinite(value) && value > 0)) && Number.isInteger(receipt.sourceGeneration) && receipt.sourceGeneration >= 0 && Number.isInteger(receipt.projectionGeneration) && receipt.projectionGeneration >= 0 && Number.isInteger(receipt.deviceGeneration) && receipt.deviceGeneration >= 0 && receipt.brdfSignature === "standard-pbr-ibl-v1" && (receipt.source === "probe" && (receipt.state === "active" || receipt.state === "lkg") || receipt.source === "skylight" && (receipt.state === "active" || receipt.state === "lkg") || receipt.source === "neutral" && receipt.state === "neutral");
}
function validFormat(receipt) {
  if (receipt?.profile !== SSR_FORMAT_PROFILE || receipt.verdict !== "admitted" || receipt.evidence !== "real" || !Number.isInteger(receipt.deviceGeneration) || receipt.deviceGeneration < 0) {
    return false;
  }
  if (!SSR_FORMAT_STAGES.every(
    (stage) => receipt.stages.some((entry) => entry.stage === stage && entry.verdict === "admitted")
  )) {
    return false;
  }
  return validateR32FloatReceipt(receipt).ok;
}
function validTemporal(receipt) {
  return receipt?.successfulSubmit === true && Number.isInteger(receipt.generation) && receipt.generation >= 0;
}
function admitSsrM0(input) {
  if (!input.requested) {
    return blocked(
      input.identity,
      failure2("ssr-not-requested", "consumer", "request SSR before evaluating M0 admission")
    );
  }
  if (input.reflectionFallback === void 0) {
    return blocked(
      input.identity,
      failure2("ssr-reflection-fallback-unavailable", "producer", "use LKG, Skylight, or neutral")
    );
  }
  const fallbackIdentityFailure = receiptFailure(input, input.reflectionFallback, "producer");
  if (fallbackIdentityFailure !== void 0) return fallbackIdentityFailure;
  if (!validFallback(input.reflectionFallback)) {
    return blocked(
      input.identity,
      failure2(
        "ssr-reflection-fallback-unavailable",
        "producer",
        "inspect and rebuild the producer receipt"
      ),
      input.reflectionFallback.projectionGeneration
    );
  }
  if (input.format === void 0) {
    return blocked(
      input.identity,
      failure2("ssr-format-unavailable", "format", "probe the exact format profile for this device"),
      input.reflectionFallback.projectionGeneration
    );
  }
  const formatIdentityFailure = receiptFailure(input, input.format, "format");
  if (formatIdentityFailure !== void 0) return formatIdentityFailure;
  if (!validFormat(input.format)) {
    return blocked(
      input.identity,
      failure2("ssr-format-unavailable", "format", "complete the full r32float profile probe"),
      input.reflectionFallback.projectionGeneration
    );
  }
  const temporalIdentityFailure = input.temporal === void 0 ? void 0 : receiptFailure(input, input.temporal, "temporal");
  if (temporalIdentityFailure !== void 0) return temporalIdentityFailure;
  if (input.temporal !== void 0 && !validTemporal(input.temporal)) {
    return blocked(
      input.identity,
      failure2("ssr-temporal-unavailable", "temporal", "inspect and rebuild the temporal receipt"),
      input.reflectionFallback.projectionGeneration
    );
  }
  if (input.previousGeneration !== void 0 && input.previousGeneration !== input.reflectionFallback.projectionGeneration) {
    return blocked(
      input.identity,
      failure2(
        "ssr-receipt-stale",
        "consumer",
        "discard stale completion and reinspect the owners",
        {
          generation: input.reflectionFallback.projectionGeneration
        }
      ),
      input.reflectionFallback.projectionGeneration
    );
  }
  return Object.freeze({
    status: "admitted",
    identity: input.identity,
    generation: input.reflectionFallback.projectionGeneration,
    work: ADMITTED_WORK,
    budget: ADMITTED_BUDGET
  });
}
function projectSsrDependencies(input) {
  const identity = input.identity;
  const reflectionFallback = identity === void 0 || input.reflectionFallback?.identity === void 0 ? void 0 : input.reflectionFallback;
  const format = identity === void 0 || input.format === void 0 ? void 0 : { ...input.format, identity };
  const temporal = identity === void 0 || input.temporal === void 0 ? void 0 : { identity, ...input.temporal };
  const admission = identity === void 0 ? blocked(
    void 0,
    failure2(
      input.requested ? "ssr-receipt-identity-mismatch" : "ssr-not-requested",
      "consumer",
      input.requested ? "bind the exact source, tree, lock, and build identity before admission" : "request SSR before evaluating M0 admission",
      input.requested ? { identityField: "sourceHead" } : {}
    )
  ) : admitSsrM0({
    requested: input.requested,
    identity,
    ...reflectionFallback === void 0 ? {} : { reflectionFallback },
    ...format === void 0 ? {} : { format },
    ...temporal === void 0 ? {} : { temporal },
    ...input.previousGeneration === void 0 ? {} : { previousGeneration: input.previousGeneration }
  });
  return Object.freeze({
    status: admission.status,
    identity,
    requested: input.requested,
    reflectionFallback: input.reflectionFallback,
    format,
    temporal,
    admission,
    work: admission.work,
    budget: admission.budget,
    failure: admission.failure
  });
}
function zeroSsrAdmissionWork() {
  return ZERO_WORK;
}
function resolveSsrAdmissionGeneration(previousGeneration, nextGeneration) {
  return {
    changed: previousGeneration !== void 0 && nextGeneration !== void 0 && previousGeneration !== nextGeneration,
    generation: nextGeneration
  };
}
var ZERO_SPATIAL_WORK = Object.freeze({
  attachmentCount: 0,
  passCount: 0,
  bindingCount: 0,
  resourceCount: 0,
  historyCount: 0,
  temporalDemand: 0
});
var ADMITTED_SPATIAL_WORK = Object.freeze({
  attachmentCount: 3,
  passCount: 4,
  bindingCount: 4,
  resourceCount: 3,
  historyCount: 0,
  temporalDemand: 0
});
function configRange(field, viewRange, maxDistance) {
  switch (field) {
    case "maxDistance":
      return { min: 0, minInclusive: false, max: viewRange, maxInclusive: true };
    case "thickness":
      return { min: 0, minInclusive: false, max: maxDistance, maxInclusive: true };
    case "maxRoughness":
      return { min: 0, minInclusive: true, max: 1, maxInclusive: true };
  }
}
function configError(field, value, range) {
  const left = range.minInclusive ? "[" : "(";
  const right = range.maxInclusive ? "]" : ")";
  return Object.freeze({
    code: "ssr-config-invalid",
    expected: `finite ${field} in ${left}${range.min}, ${range.max}${right}`,
    hint: `set ${field} to a finite value inside the reported range before retrying`,
    detail: Object.freeze({ field, value, range: Object.freeze(range) })
  });
}
function validateScreenSpaceReflection(config, input) {
  const viewRange = input.viewRange;
  if (!Number.isFinite(viewRange) || viewRange <= 0) {
    return err4(
      configError("maxDistance", config.maxDistance, configRange("maxDistance", viewRange, 0))
    );
  }
  if (!Number.isFinite(config.maxDistance) || config.maxDistance <= 0 || config.maxDistance > viewRange) {
    return err4(
      configError(
        "maxDistance",
        config.maxDistance,
        configRange("maxDistance", viewRange, config.maxDistance)
      )
    );
  }
  if (!Number.isFinite(config.thickness) || config.thickness <= 0 || config.thickness > config.maxDistance) {
    return err4(
      configError(
        "thickness",
        config.thickness,
        configRange("thickness", viewRange, config.maxDistance)
      )
    );
  }
  if (!Number.isFinite(config.maxRoughness) || config.maxRoughness < 0 || config.maxRoughness > 1) {
    return err4(
      configError(
        "maxRoughness",
        config.maxRoughness,
        configRange("maxRoughness", viewRange, config.maxDistance)
      )
    );
  }
  return ok4(
    Object.freeze({
      maxDistance: config.maxDistance,
      thickness: config.thickness,
      maxRoughness: config.maxRoughness
    })
  );
}
function unavailable(lane, reason, required, actual) {
  const recovery = reason === "lane-unsupported" || reason === "projection-unsupported" ? "select a perspective clustered or deferred Standard lane" : reason === "reflection-fallback-unavailable" ? "repair the submitted reflection fallback owner receipt" : reason === "temporal-unavailable" ? "submit the matching temporal-v1 producer receipt" : reason === "recovery-unavailable" ? "complete device and producer recovery before retrying" : "restore the required scene, capability, or format input before retrying";
  return Object.freeze({
    code: "ssr-unavailable",
    expected: "SSR spatial admission has a complete Standard input and capability set",
    hint: recovery,
    detail: Object.freeze({
      lane,
      reason,
      required: Object.freeze([...required]),
      actual: Object.freeze({ ...actual }),
      recovery
    })
  });
}
function unavailableResult(lane, viewRange, failure4) {
  return Object.freeze({
    status: "fallback-only",
    lane,
    config: void 0,
    viewRange,
    work: ZERO_SPATIAL_WORK,
    failure: failure4
  });
}
function admitSsrSpatial(input) {
  const camera = input.camera;
  const environment = input.environment;
  const viewRange = camera.far - camera.near;
  const config = camera.screenSpaceReflection;
  if (config === void 0) {
    return Object.freeze({
      status: "not-requested",
      lane: environment.lane,
      config: void 0,
      viewRange,
      work: ZERO_SPATIAL_WORK
    });
  }
  const valid = validateScreenSpaceReflection(config, { viewRange });
  if (!valid.ok) {
    return Object.freeze({
      status: "fallback-only",
      lane: environment.lane,
      config,
      viewRange,
      work: ZERO_SPATIAL_WORK,
      failure: valid.error
    });
  }
  if (environment.m0.status !== "admitted") {
    return unavailableResult(
      environment.lane,
      viewRange,
      unavailable(
        environment.lane,
        "reflection-fallback-unavailable",
        ["admitted M0 dependency receipt"],
        { m0: false }
      )
    );
  }
  if (environment.lane !== "clustered" && environment.lane !== "deferred") {
    return unavailableResult(
      environment.lane,
      viewRange,
      unavailable(environment.lane, "lane-unsupported", ["clustered or deferred Standard lane"], {
        lane: environment.lane
      })
    );
  }
  if (camera.projection !== "perspective") {
    return unavailableResult(
      environment.lane,
      viewRange,
      unavailable(environment.lane, "projection-unsupported", ["perspective camera"], {
        projection: camera.projection
      })
    );
  }
  if (!environment.sceneInputs) {
    return unavailableResult(
      environment.lane,
      viewRange,
      unavailable(
        environment.lane,
        "scene-input-unavailable",
        ["deferred Standard scene/material/fallback inputs"],
        { sceneInputs: false }
      )
    );
  }
  if (!environment.temporal) {
    return unavailableResult(
      environment.lane,
      viewRange,
      unavailable(environment.lane, "temporal-unavailable", ["temporal-v1"], { temporal: false })
    );
  }
  if (!environment.reflectionFallback) {
    return unavailableResult(
      environment.lane,
      viewRange,
      unavailable(
        environment.lane,
        "reflection-fallback-unavailable",
        ["submitted BRDF-projected fallback"],
        { reflectionFallback: false }
      )
    );
  }
  if (environment.recovery === false) {
    return unavailableResult(
      environment.lane,
      viewRange,
      unavailable(environment.lane, "recovery-unavailable", ["ready device and owners"], {
        recovery: false
      })
    );
  }
  const capabilities = environment.capabilities;
  if (!capabilities.compute || !capabilities.storageTexture || !capabilities.rgba16floatRenderable) {
    return unavailableResult(
      environment.lane,
      viewRange,
      unavailable(
        environment.lane,
        "capability-unavailable",
        ["compute", "storageTexture", "rgba16floatRenderable"],
        {
          compute: capabilities.compute,
          storageTexture: capabilities.storageTexture,
          rgba16floatRenderable: capabilities.rgba16floatRenderable
        }
      )
    );
  }
  if (!capabilities.r32floatSampledStorage) {
    return unavailableResult(
      environment.lane,
      viewRange,
      unavailable(
        environment.lane,
        "format-unavailable",
        ["r32float sampled and storage mip chain"],
        { r32floatSampledStorage: false }
      )
    );
  }
  return Object.freeze({
    status: "admitted",
    lane: environment.lane,
    config: valid.value,
    viewRange,
    work: ADMITTED_SPATIAL_WORK
  });
}

// sdk/engine/node_modules/@forgeax/engine-render/src/ssr/inspection.ts
var SSR_INSPECTION_MAX_PASSES = 64;
function nonNegativeSafeInteger(name, value) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative safe integer`);
  }
  return value;
}
function copyHistory(history) {
  nonNegativeSafeInteger("SSR inspection history.bytes", history.bytes);
  nonNegativeSafeInteger("SSR inspection history.resetCount", history.resetCount);
  return Object.freeze({
    state: history.state,
    bytes: history.bytes,
    resetCount: history.resetCount
  });
}
function copyCoverage(coverage) {
  const result = {
    hitCount: coverage?.hitCount ?? null,
    fallbackCount: coverage?.fallbackCount ?? null,
    excludedCount: coverage?.excludedCount ?? null
  };
  for (const [key, value] of Object.entries(result)) {
    if (value !== null) nonNegativeSafeInteger(`SSR inspection coverage.${key}`, value);
  }
  return Object.freeze(result);
}
function copyPassRoster(passRoster) {
  return Object.freeze(
    [...passRoster ?? []].slice(0, SSR_INSPECTION_MAX_PASSES).map((name, index) => {
      if (typeof name !== "string" || name.length === 0) {
        throw new Error(`SSR inspection passRoster[${index}] must be a non-empty string`);
      }
      return name;
    })
  );
}
function projectSsrSpatialInspection(admission, projection = {}) {
  const config = admission.config;
  return Object.freeze({
    status: projection.status ?? admission.status,
    lane: admission.lane,
    config: config === void 0 ? void 0 : Object.freeze({
      maxDistance: config.maxDistance,
      thickness: config.thickness,
      maxRoughness: config.maxRoughness
    }),
    viewRange: admission.viewRange,
    coverage: copyCoverage(projection.coverage),
    history: copyHistory(
      projection.history ?? {
        state: "not-owned",
        bytes: 0,
        resetCount: 0
      }
    ),
    work: Object.freeze({ ...admission.work }),
    passRoster: copyPassRoster(projection.passRoster),
    fallbackSource: projection.fallbackSource,
    failure: projection.failure ?? admission.failure
  });
}
function serializeSsrSpatialInspection(inspection) {
  return JSON.stringify(inspection);
}

// sdk/engine/node_modules/@forgeax/engine-render/src/surface/dynamic-input.ts
import { deriveMaterialDynamicInputLayout, err as err5, ok as ok5 } from "@forgeax/engine-types";
var ERROR_POLICY = {
  "invalid-schema": {
    expected: "the dynamic input schema has one derived bounded record layout",
    hint: "repair the root MaterialSurface dynamicInput declaration and recook it"
  },
  "invalid-record": {
    expected: "each dynamic record matches the derived scalar/vector fields",
    hint: "write finite values using the field names and types declared by the material"
  },
  "range-overflow": {
    expected: "the instance range stays within the declared read-only page",
    hint: "reduce the range or increase the producer page budget before publication"
  },
  "domain-overflow": {
    expected: "the page stays within its declared number of producer domains",
    hint: "reuse an existing domain or publish a larger bounded declaration"
  },
  "not-uploaded": {
    expected: "the current page revision was uploaded before frame consumption",
    hint: "submit the page upload receipt and retry the same frame"
  },
  "stale-generation": {
    expected: "the range, upload, and device use one current page generation",
    hint: "discard stale addresses and rebuild the producer projection for the current device"
  },
  released: {
    expected: "the read-only page is still attached to its owning Render lifecycle",
    hint: "create a new page after releasing the old owner"
  }
};
var DynamicInputError = class extends Error {
  code;
  expected;
  hint;
  detail;
  constructor(code, detail) {
    super(`${code}: ${ERROR_POLICY[code].expected}`);
    this.name = "DynamicInputError";
    this.code = code;
    this.expected = ERROR_POLICY[code].expected;
    this.hint = ERROR_POLICY[code].hint;
    this.detail = Object.freeze({ ...detail });
  }
};
function alignRange(ranges, start, end) {
  if (start >= end) return;
  let index = 0;
  while (index < ranges.length && (ranges[index]?.byteEnd ?? 0) < start) index += 1;
  while (index < ranges.length) {
    const existing = ranges[index];
    if (existing === void 0 || existing.byteStart > end) break;
    start = Math.min(start, existing.byteStart);
    end = Math.max(end, existing.byteEnd);
    ranges.splice(index, 1);
  }
  ranges.splice(index, 0, { byteStart: start, byteEnd: end });
}
function finiteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}
function invalid3(code, operation, expected, actual, field, page) {
  return new DynamicInputError(code, {
    operation,
    expected,
    ...actual === void 0 ? {} : { actual },
    ...field === void 0 ? {} : { field },
    ...page === void 0 ? {} : page
  });
}
var ReadonlyDynamicInputPage = class _ReadonlyDynamicInputPage {
  sourceId;
  pageId;
  schema;
  layout;
  bytes;
  contentRevisionValue = 1;
  bufferGenerationValue = 1;
  deviceGenerationValue = 1;
  uploadedRevisionValue = 0;
  lastUploadedBytesValue = 0;
  released = false;
  ownedRanges = /* @__PURE__ */ new WeakSet();
  ownedUploads = /* @__PURE__ */ new WeakSet();
  dirty = [
    {
      byteStart: 0,
      byteEnd: 0
    }
  ];
  domains = /* @__PURE__ */ new Map();
  constructor(sourceId, pageId, schema, layout) {
    this.sourceId = sourceId;
    this.pageId = pageId;
    this.schema = schema;
    this.layout = layout;
    this.bytes = new Uint8Array(schema.maxPageBytes);
    this.dirty.length = 0;
  }
  static create(input) {
    if (input.sourceId.length === 0 || !Number.isSafeInteger(input.pageId) || input.pageId < 0) {
      return err5(
        invalid3(
          "invalid-schema",
          "create",
          "sourceId is non-empty and pageId is non-negative",
          input.pageId
        )
      );
    }
    const layout = deriveMaterialDynamicInputLayout(input.schema);
    if (!layout.ok) {
      return err5(
        invalid3(
          "invalid-schema",
          "create",
          layout.error.expected,
          layout.error.actual,
          layout.error.field
        )
      );
    }
    return ok5(
      new _ReadonlyDynamicInputPage(input.sourceId, input.pageId, input.schema, layout.value)
    );
  }
  get contentRevision() {
    return this.contentRevisionValue;
  }
  get bufferGeneration() {
    return this.bufferGenerationValue;
  }
  get deviceGeneration() {
    return this.deviceGenerationValue;
  }
  get uploadedRevision() {
    return this.uploadedRevisionValue;
  }
  get lastUploadedBytes() {
    return this.lastUploadedBytesValue;
  }
  /** Write one complete record and mark only its byte interval dirty. */
  writeRecord(index, values) {
    const live = this.assertLive("write");
    if (!live.ok) return live;
    if (!Number.isSafeInteger(index) || index < 0 || index >= this.schema.maxRecords) {
      return err5(
        invalid3(
          "range-overflow",
          "write",
          `record index is within [0, ${this.schema.maxRecords})`,
          index,
          "index",
          this
        )
      );
    }
    const recordOffset = index * this.layout.stride;
    const encoded = new Uint8Array(this.layout.stride);
    const view = new DataView(encoded.buffer, encoded.byteOffset, encoded.byteLength);
    for (const field of this.layout.fields) {
      const value = values[field.name];
      if (value === void 0) {
        return err5(
          invalid3(
            "invalid-record",
            "write",
            `record contains field ${field.name}`,
            value,
            field.name,
            this
          )
        );
      }
      const width = field.size / 4;
      const numbers = typeof value === "number" ? [value] : value;
      if (numbers.length !== width || numbers.some((candidate) => !finiteNumber(candidate))) {
        return err5(
          invalid3(
            "invalid-record",
            "write",
            `${field.name} is a finite ${field.type}`,
            value,
            field.name,
            this
          )
        );
      }
      if (field.type === "u32" && (!Number.isInteger(numbers[0]) || numbers[0] < 0 || numbers[0] > 4294967295)) {
        return err5(
          invalid3(
            "invalid-record",
            "write",
            `${field.name} is an unsigned 32-bit integer`,
            value,
            field.name,
            this
          )
        );
      }
      for (const [component, number] of numbers.entries()) {
        const offset = field.offset + component * 4;
        if (field.type === "u32") view.setUint32(offset, number, true);
        else view.setFloat32(offset, number, true);
      }
    }
    this.bytes.set(encoded, recordOffset);
    this.contentRevisionValue += 1;
    alignRange(this.dirty, recordOffset, recordOffset + this.layout.stride);
    return ok5(this.contentRevisionValue);
  }
  /** Reserve one explicit instance range; no skin address field is involved. */
  reserveRange(input) {
    const live = this.assertLive("reserve");
    if (!live.ok) return live;
    if (input.domain.length === 0) {
      return err5(
        invalid3(
          "domain-overflow",
          "reserve",
          "domain is a non-empty identity",
          input.domain,
          "domain",
          this
        )
      );
    }
    if (!this.domains.has(input.domain) && this.domains.size >= this.schema.maxDomains) {
      return err5(
        invalid3(
          "domain-overflow",
          "reserve",
          `at most ${this.schema.maxDomains} domains are active`,
          this.domains.size + 1,
          "domain",
          this
        )
      );
    }
    if (!Number.isSafeInteger(input.instanceIndex) || input.instanceIndex < 0 || input.instanceIndex > 4294967295) {
      return err5(
        invalid3(
          "range-overflow",
          "reserve",
          "instance index is an exact unsigned 32-bit integer",
          input.instanceIndex,
          "instanceIndex",
          this
        )
      );
    }
    if (input.member.worldIdentity.length === 0 || !Number.isSafeInteger(input.member.entityKey) || input.member.entityKey < 0 || input.member.entityKey > 4294967295 || !Number.isSafeInteger(input.member.drawItemIndex) || input.member.drawItemIndex < 0 || input.member.drawItemIndex > 4294967295 || !Number.isSafeInteger(input.member.instanceOrdinal) || input.member.instanceOrdinal < 0 || input.member.instanceOrdinal > 4294967295) {
      return err5(
        invalid3(
          "range-overflow",
          "reserve",
          "member is a stable World identity plus exact unsigned 32-bit entity, draw-item, and instance identities",
          input.member,
          "member",
          this
        )
      );
    }
    if (!Number.isSafeInteger(input.recordStart) || !Number.isSafeInteger(input.recordCount) || input.recordStart < 0 || input.recordCount <= 0 || input.recordStart + input.recordCount > this.schema.maxRecords) {
      return err5(
        invalid3(
          "range-overflow",
          "reserve",
          "record range and instance index fit the declared page",
          input,
          "recordStart",
          this
        )
      );
    }
    const range = {
      pageId: this.pageId,
      sourceId: this.sourceId,
      domain: input.domain,
      byteOffset: input.recordStart * this.layout.stride,
      recordStart: input.recordStart,
      recordCount: input.recordCount,
      instanceIndex: input.instanceIndex,
      member: Object.freeze({ ...input.member }),
      contentRevision: this.contentRevisionValue,
      bufferGeneration: this.bufferGenerationValue,
      deviceGeneration: this.deviceGenerationValue
    };
    this.ownedRanges.add(range);
    this.domains.set(input.domain, {
      name: input.domain,
      start: input.recordStart,
      end: input.recordStart + input.recordCount
    });
    return ok5(range);
  }
  /** Return detached dirty bytes for the existing resource owner to upload. */
  beginUpload() {
    const live = this.assertLive("upload");
    if (!live.ok) return live;
    const ranges = this.dirty.map((range) => ({ ...range }));
    const bytes = ranges.reduce((sum, range) => sum + range.byteEnd - range.byteStart, 0);
    const receipt = {
      sourceId: this.sourceId,
      pageId: this.pageId,
      contentRevision: this.contentRevisionValue,
      bufferGeneration: this.bufferGenerationValue,
      deviceGeneration: this.deviceGenerationValue,
      ranges,
      bytes
    };
    this.ownedUploads.add(receipt);
    return ok5(receipt);
  }
  /**
   * Commit an upload only after the owning queue write has succeeded. A
   * producer that changed the page while a write was in flight leaves the
   * dirty bytes pending and must retry the new revision.
   */
  commitUpload(receipt) {
    const live = this.assertLive("upload");
    if (!live.ok) return live;
    if (!this.ownedUploads.has(receipt) || receipt.sourceId !== this.sourceId || receipt.pageId !== this.pageId || receipt.bufferGeneration !== this.bufferGenerationValue || receipt.deviceGeneration !== this.deviceGenerationValue || receipt.contentRevision !== this.contentRevisionValue) {
      return err5(
        invalid3(
          "stale-generation",
          "upload",
          "the upload receipt still describes the current page revision and generation",
          receipt,
          "receipt",
          this
        )
      );
    }
    this.uploadedRevisionValue = receipt.contentRevision;
    this.lastUploadedBytesValue = receipt.bytes;
    for (const range of receipt.ranges) {
      const index = this.dirty.findIndex(
        (candidate) => candidate.byteStart === range.byteStart && candidate.byteEnd === range.byteEnd
      );
      if (index >= 0) this.dirty.splice(index, 1);
    }
    return ok5(true);
  }
  /** CPU-only convenience: begin and commit are still explicit in production. */
  upload() {
    const receipt = this.beginUpload();
    if (!receipt.ok) return receipt;
    const committed = this.commitUpload(receipt.value);
    if (!committed.ok) return committed;
    return receipt;
  }
  /** Consume an uploaded range after graph submission has completed. */
  consume(range, frameNumber) {
    const live = this.assertLive("consume");
    if (!live.ok) return live;
    if (!this.ownedRanges.has(range) || range.sourceId !== this.sourceId || range.pageId !== this.pageId || range.bufferGeneration !== this.bufferGenerationValue || range.deviceGeneration !== this.deviceGenerationValue || range.recordStart < 0 || range.recordCount <= 0 || range.recordStart + range.recordCount > this.schema.maxRecords) {
      return err5(
        invalid3(
          "stale-generation",
          "consume",
          "range belongs to this current page generation",
          range,
          "generation",
          this
        )
      );
    }
    if (this.uploadedRevisionValue < range.contentRevision) {
      return err5(
        invalid3(
          "not-uploaded",
          "consume",
          "range content revision was uploaded before consumption",
          this.uploadedRevisionValue,
          "contentRevision",
          this
        )
      );
    }
    return ok5({ ...range, frameNumber, uploadedRevision: this.uploadedRevisionValue });
  }
  /** Device loss/rebuild changes physical generations while source identity stays stable. */
  reconfigureDevice(deviceGeneration) {
    const live = this.assertLive("reconfigure");
    if (!live.ok) return live;
    if (!Number.isSafeInteger(deviceGeneration) || deviceGeneration < 0) {
      return err5(
        invalid3(
          "stale-generation",
          "reconfigure",
          "deviceGeneration is a non-negative safe integer",
          deviceGeneration,
          "deviceGeneration",
          this
        )
      );
    }
    const rendererInitialGeneration = this.bufferGenerationValue === 1 && this.deviceGenerationValue === 1 && deviceGeneration === 0;
    if (deviceGeneration < this.deviceGenerationValue && !rendererInitialGeneration) {
      return err5(
        invalid3(
          "stale-generation",
          "reconfigure",
          "deviceGeneration does not precede the current device generation",
          deviceGeneration,
          "deviceGeneration",
          this
        )
      );
    }
    this.deviceGenerationValue = deviceGeneration;
    this.bufferGenerationValue += 1;
    this.uploadedRevisionValue = 0;
    alignRange(this.dirty, 0, this.schema.maxRecords * this.layout.stride);
    return ok5(this.bufferGenerationValue);
  }
  release() {
    if (this.released) return ok5(true);
    this.released = true;
    this.domains.clear();
    this.dirty.length = 0;
    return ok5(true);
  }
  assertLive(operation) {
    return this.released ? err5(
      invalid3(
        "released",
        operation,
        ERROR_POLICY.released.expected,
        void 0,
        void 0,
        this
      )
    ) : ok5(true);
  }
};

// sdk/engine/node_modules/@forgeax/engine-render/src/surface/gpu-driven.ts
import { err as err6, ok as ok6 } from "@forgeax/engine-types";
var ERROR_POLICY2 = {
  "surface-abi-missing": {
    expected: "a producer-published single-layer-medium ABI is present",
    hint: "compose, reflect, and publish the Surface model before preparing the draw"
  },
  "surface-pass-missing": {
    expected: "the published model contains both nearest-layer and color passes",
    hint: "recook the complete model publication; do not synthesize a missing pass"
  },
  "surface-producer-not-ready": {
    expected: "scene-index, resources, and dynamic input facts are ready for the published model",
    hint: "repair the owning producer publication and retry; capability fallback does not cover stale assets"
  },
  "surface-generation-stale": {
    expected: "prepared Surface facts belong to the current device generation",
    hint: "rebuild the prepared surface resources for the current device generation"
  }
};
function failure3(code, pass, owner, actual) {
  return {
    code,
    expected: ERROR_POLICY2[code].expected,
    hint: ERROR_POLICY2[code].hint,
    pass,
    owner,
    ...actual === void 0 ? {} : { actual }
  };
}
function capabilityFallback(caps) {
  if (!caps.compute) return "compute";
  if (!caps.storageBuffer) return "storageBuffer";
  if (!caps.indirectDrawing) return "indirectDrawing";
  return void 0;
}
function admitSingleLayerMediumSubmission(input) {
  const firstPass = "nearest-layer";
  const surface = input.abi.surface;
  if (surface === void 0 || surface.model !== "single-layer-medium") {
    return err6(failure3("surface-abi-missing", firstPass, "surface-producer", surface));
  }
  if (!surface.passes.includes("nearest-layer") || !surface.passes.includes("color")) {
    return err6(failure3("surface-pass-missing", firstPass, "surface-producer", surface.passes));
  }
  if (input.deviceGeneration !== input.preparedDeviceGeneration) {
    return err6(
      failure3("surface-generation-stale", firstPass, "render-generation", {
        deviceGeneration: input.deviceGeneration,
        preparedDeviceGeneration: input.preparedDeviceGeneration
      })
    );
  }
  const dynamicRequired = surface.dynamicInput !== void 0;
  if (!input.sceneIndexReady || !input.resourcesReady || dynamicRequired && !input.dynamicInputReady) {
    return err6(
      failure3("surface-producer-not-ready", firstPass, "surface-producer", {
        sceneIndexReady: input.sceneIndexReady,
        resourcesReady: input.resourcesReady,
        dynamicInputReady: input.dynamicInputReady
      })
    );
  }
  const fallback = capabilityFallback(input.caps);
  const admitted = fallback === void 0 ? [
    { pass: firstPass, lane: "gpu-driven" },
    { pass: "color", lane: "gpu-driven" }
  ] : [
    { pass: firstPass, lane: "direct", reason: fallback },
    { pass: "color", lane: "direct", reason: fallback }
  ];
  return ok6({
    model: "single-layer-medium",
    lane: fallback === void 0 ? "gpu-driven" : "direct",
    passes: admitted,
    deviceGeneration: input.deviceGeneration
  });
}

// sdk/engine/node_modules/@forgeax/engine-render/src/terrain/submitted.ts
import { terrainSurfaceHeight } from "@forgeax/engine-terrain";
import { err as err7, ok as ok7 } from "@forgeax/engine-types";
function captureSubmittedTerrain(sources, worlds) {
  const sections = [];
  for (const source of sources) {
    const terrain = source.terrain, section = source.terrainSection;
    if (terrain === void 0 || section === void 0 || source.authorVisible === false) continue;
    if (worlds[source.worldId] === void 0)
      throw unavailable2("source", "complete recorded terrain closure");
    const { data, heights } = terrainDrawSection(section.source, section.index);
    sections.push({
      worldId: source.worldId,
      entity: source.entityKey,
      section: section.index,
      asset: Number(terrain.handle),
      version: section.source.version,
      sectionOrigin: [data.x, data.z],
      translation: [
        source.transform.world[12] ?? 0,
        source.transform.world[13] ?? 0,
        source.transform.world[14] ?? 0
      ],
      surface: {
        vertices: section.source.asset.subsectionVertices,
        width: (section.source.asset.subsectionVertices - 1) * section.source.asset.spacing,
        lod: section.lod,
        neighbors: [...section.neighbors],
        textureWidth: section.source.asset.subsectionVertices,
        textureHeight: section.source.asset.subsectionVertices,
        sectionIndex: 0,
        heights
      }
    });
  }
  return sections;
}
function unavailable2(field, expected) {
  return {
    code: "terrain-query-unavailable",
    expected,
    hint: "use an accepted current-generation receipt and an explicitly identified view",
    detail: { field }
  };
}
var receiptData = /* @__PURE__ */ new WeakMap();
function createTerrainReceiptOwner(isCurrent) {
  const order = [];
  return {
    register(receipt, views) {
      if (!views.some((view) => view.sections.length > 0)) return;
      receiptData.set(receipt, { views, isCurrent: () => isCurrent(receipt) });
      order.push(receipt);
      while (order.length > 8) {
        const expired = order.shift();
        if (expired) receiptData.delete(expired);
      }
    },
    clear() {
      for (const receipt of order) receiptData.delete(receipt);
      order.length = 0;
    }
  };
}
async function querySubmittedTerrainHeight(receipt, request) {
  if (!Number.isInteger(request.worldId) || request.worldId < 0 || !Number.isInteger(request.entity) || ![request.x, request.z].every(Number.isFinite))
    return err7(unavailable2("request", "finite coordinates and integer source identities"));
  if (request.expectedAsset !== void 0 && (!Number.isSafeInteger(request.expectedAsset) || request.expectedAsset <= 0))
    return err7(unavailable2("expectedAsset", "a positive shared TerrainAsset identity"));
  if (request.expectedVersion !== void 0 && (!Number.isSafeInteger(request.expectedVersion) || request.expectedVersion <= 0))
    return err7(unavailable2("expectedVersion", "a positive Terrain asset version"));
  const completed = await receipt.completed, record = receiptData.get(receipt);
  if (receipt.presentation !== "ready" || !completed.ok || record === void 0 || !record.isCurrent())
    return err7(unavailable2("receipt", "a retained completed successful terrain receipt"));
  const views = request.view === void 0 ? record.views : record.views.filter((view2) => view2.view === request.view);
  if (views.length !== 1)
    return err7(
      unavailable2("view", "exactly one view; name the view when multiple views were composed")
    );
  const view = views[0];
  if (view === void 0) return err7(unavailable2("view", "one submitted view"));
  const sections = view.sections.filter(
    (section) => section.worldId === request.worldId && section.entity === request.entity
  );
  if (sections.length === 0)
    return err7(unavailable2("entity", "a terrain drawn in this receipt and view"));
  if (request.expectedAsset !== void 0 && sections.some((section) => section.asset !== request.expectedAsset))
    return err7(unavailable2("asset", "the requested terrain root actually drawn in this view"));
  if (request.expectedVersion !== void 0 && sections.some((section) => section.version !== request.expectedVersion))
    return err7(
      unavailable2("version", "the requested Terrain asset version actually drawn in this view")
    );
  for (const section of sections) {
    const height = terrainSurfaceHeight(
      section.surface,
      request.x,
      request.z,
      section.sectionOrigin,
      section.translation
    );
    if (height !== void 0) return ok7(height);
  }
  return ok7(void 0);
}

// sdk/engine/node_modules/@forgeax/engine-render/src/volume/inspection.ts
function resourceStage(input) {
  if (!input.authored || input.recovery === void 0) return "none";
  if (input.recovery.status === "candidate") return "candidate";
  if (input.recovery.status === "recovering") return "recovering";
  if (input.recovery.status === "degraded") return "lkg";
  return "accepted";
}
function inspectVolumetricFog(input) {
  const recovery = input.recovery;
  const status = !input.authored ? "off" : input.capability === "unavailable" ? "unavailable" : input.degraded === true || recovery?.status === "degraded" ? "degraded" : "available";
  return Object.freeze({
    ownerCount: 0,
    status,
    resourceStage: resourceStage(input),
    guid: recovery?.guid,
    generation: recovery?.generation,
    digest: input.acceptedDigest,
    candidateGeneration: recovery?.candidateGeneration,
    candidateDigest: recovery?.candidateDigest,
    lkgGeneration: recovery?.lkgGeneration,
    candidateFailure: recovery?.candidateFailure,
    deviceEpoch: recovery?.deviceEpoch ?? 0,
    format: input.format,
    passCount: input.passCount ?? 0,
    sampleCount: input.sampleCount ?? 0,
    memoryBytes: input.memoryBytes ?? 0,
    resourceFacts: input.resourceFacts,
    selectedLight: recovery?.selectedLight,
    candidateSelectedLight: recovery?.candidateSelectedLight
  });
}

// sdk/engine/node_modules/@forgeax/engine-render/src/features/view.ts
import { mat4 } from "@forgeax/engine-math";
function renderFeatureViewIdentity(camera) {
  const base = `camera:${camera?.entityKey ?? 0}`;
  return camera?.eye === void 0 ? base : `${base}:${camera.eye.side}`;
}
function renderFeatureCameraView(camera) {
  return {
    identity: renderFeatureViewIdentity(camera),
    render: camera.view?.enabled ?? true,
    selectedCamera: camera,
    selectedView: {
      position: new Float32Array(camera.position),
      right: new Float32Array([camera.world[0] ?? 1, camera.world[1] ?? 0, camera.world[2] ?? 0]),
      up: new Float32Array([camera.world[4] ?? 0, camera.world[5] ?? 1, camera.world[6] ?? 0]),
      viewProjection: mat4.multiply(
        mat4.create(),
        computeProjectionMatrix(camera),
        computeViewMatrix(camera)
      )
    }
  };
}

// sdk/engine/node_modules/@forgeax/engine-render/src/scene/render-source.ts
import { createStateProjection } from "@forgeax/engine-ecs/projection";
import { ChildOf, GlobalTransform, Mobility, MorphWeights, Transform } from "@forgeax/engine-scene";
import { Skin } from "@forgeax/engine-skinning";
import { Terrain } from "@forgeax/engine-terrain";
var RENDERABLE_SOURCE_COMPONENTS = [
  ChildOf,
  Terrain,
  GlyphText,
  Tilemap,
  MeshFilter,
  MeshRenderer,
  Instances,
  SpriteInstances,
  SpriteRegionOverride,
  Skin,
  Layer,
  Visibility,
  MorphWeights,
  Points,
  Lines,
  SortKey,
  Mobility,
  ShadowParticipation
];
function createGlobalTransformChangeQuery(world) {
  const result = world.query({ read: [GlobalTransform], changed: [GlobalTransform] });
  if (!result.ok) throw result.error;
  const query = result.value;
  for (const _span of query.spans().unwrap()) {
  }
  return query;
}
function createRenderSourceState(world, additional = []) {
  const skin = world.components.resolve(Skin.name) ?? Skin;
  const renderableComponents = RENDERABLE_SOURCE_COMPONENTS.map(
    (component) => component === Skin ? skin : component
  );
  const components = [...renderableComponents, ...additional];
  const projection = createStateProjection(world, components, [
    ...components,
    Transform,
    GlobalTransform
  ]);
  const entities = /* @__PURE__ */ new Map();
  const batch = projection.read();
  for (const index of batch.indices) {
    const entity = projection.entity(index);
    if (entity !== void 0) {
      entities.set(index, entity);
    }
  }
  return {
    projection,
    entities,
    batch,
    renderableComponents
  };
}
function isRenderableMember(world, entity) {
  return (world.hasComponent(entity, Tilemap) || world.hasComponent(entity, GlyphText) || world.hasComponent(entity, Terrain) || world.hasComponent(entity, MeshRenderer)) && world.hasComponent(entity, Transform) && (world.hasComponent(entity, Tilemap) || world.hasComponent(entity, GlyphText) || world.hasComponent(entity, Terrain) || world.hasComponent(entity, MeshFilter));
}

// sdk/engine/node_modules/@forgeax/engine-render/src/scene/source-systems.ts
import { Update } from "@forgeax/engine-ecs";
import { registerPropagateTransforms } from "@forgeax/engine-scene";

// sdk/engine/node_modules/@forgeax/engine-render/src/scene/mobility-validation.ts
import { emitMobilityDiagnostic, Mobility as Mobility2, MobilityKindValue } from "@forgeax/engine-scene";
var QUERIES = /* @__PURE__ */ new WeakMap();
function queriesFor(world) {
  let queries = QUERIES.get(world);
  if (queries === void 0) {
    queries = {
      kindChanged: world.query({ read: [Mobility2], with: [MeshFilter], changed: [Mobility2] }).unwrap(),
      meshAdded: world.query({ read: [Mobility2], added: [MeshFilter] }).unwrap()
    };
    QUERIES.set(world, queries);
  }
  return queries;
}
function collectStationary(query, out) {
  for (const span of query.spans().unwrap()) {
    const kinds = span.get(Mobility2).kind;
    for (let row = 0; row < span.length; row += 1) {
      if (kinds[row] === MobilityKindValue.stationary) out.add(span.entities[row]);
    }
  }
}
function detectMobilityInvalidKind(world) {
  if (world.components.resolve(Mobility2.name) === void 0) return;
  const { kindChanged, meshAdded } = queriesFor(world);
  const stationary = /* @__PURE__ */ new Set();
  collectStationary(kindChanged, stationary);
  collectStationary(meshAdded, stationary);
  for (const entity of stationary) {
    emitMobilityDiagnostic(world, entity, { code: "mobility-invalid-kind" });
  }
}

// sdk/engine/node_modules/@forgeax/engine-render/src/scene/source-systems.ts
var nextId = 0;
function registerRenderSourceSystems(world) {
  const releaseTransforms = registerPropagateTransforms(world);
  const name = `renderDerived:${++nextId}`;
  const result = world.addSystem(Update, {
    name,
    queries: [],
    fn: (world2) => {
      detectMobilityInvalidKind(world2);
    }
  });
  if (!result.ok) {
    releaseTransforms();
    throw result.error;
  }
  return () => {
    world.removeSystem(Update, name).unwrap();
    releaseTransforms();
  };
}

// sdk/engine/node_modules/@forgeax/engine-render/src/publication/canvas.ts
function publicationCanvasFrames(consumers) {
  if (consumers.size === 0) return [];
  const frames = /* @__PURE__ */ new Map();
  try {
    for (const sources of consumers.values())
      for (const source of sources) {
        if (!isCanvasTextureSource(source) || frames.has(renderTextureSourceKey(source))) continue;
        const state = canvasTextureState(source);
        const live = state !== void 0 && !state.lifetime.signal.aborted && state.canvas.width > 0 && state.canvas.height > 0;
        frames.set(renderTextureSourceKey(source), {
          id: renderTextureSourceKey(source),
          version: state?.version ?? 1,
          flipY: state?.flipY ?? false,
          disposed: state === void 0 || state.lifetime.signal.aborted,
          ...live ? { frame: new VideoFrame(state.canvas, { timestamp: state.version, alpha: "keep" }) } : {}
        });
      }
    return [...frames.values()];
  } catch (cause) {
    for (const row of frames.values()) row.frame?.close();
    throw cause;
  }
}
var CanvasFrameReceiver = class {
  frames = /* @__PURE__ */ new Map();
  get(id) {
    return this.frames.get(id);
  }
  accept(rows) {
    this.releaseFrames();
    const active = new Set(rows.map((row) => row.id));
    for (const [id, state] of this.frames)
      if (!active.has(id)) {
        state.lifetime.abort();
        this.frames.delete(id);
      }
    for (const row of rows) {
      let state = this.frames.get(row.id);
      if (state === void 0 || state.signal.aborted) {
        const lifetime = new AbortController();
        state = {
          key: {},
          lifetime,
          signal: lifetime.signal,
          version: row.version,
          flipY: row.flipY
        };
        this.frames.set(row.id, state);
      }
      state.version = row.version;
      state.flipY = row.flipY;
      state.frame = row.frame;
      if (row.disposed) state.lifetime.abort();
    }
  }
  releaseFrames() {
    for (const state of this.frames.values()) {
      state.frame?.close();
      state.frame = void 0;
    }
  }
  dispose() {
    this.releaseFrames();
    for (const state of this.frames.values()) state.lifetime.abort();
    this.frames.clear();
  }
};

// sdk/engine/node_modules/@forgeax/engine-render/src/publication/dependencies.ts
function publicationDependencies(row) {
  if (row.glyph !== void 0) return [row.glyph.font];
  if (row.tilemap !== void 0) return [row.tilemap.tileset];
  if (row.terrain !== void 0) return [row.terrain.handle];
  const handles = /* @__PURE__ */ new Set([row.assetHandle]);
  for (const override of row.materialOverrides ?? [])
    if (override?.snapshot.materialHandle) handles.add(override.snapshot.materialHandle);
  for (const material of row.materials) {
    for (const handle of [
      material.snapshot.materialHandle,
      material.snapshot.baseColorTexture,
      material.snapshot.metallicRoughnessTexture,
      material.snapshot.normalTexture,
      material.snapshot.emissiveTexture,
      material.snapshot.occlusionTexture
    ]) {
      if (handle) handles.add(handle);
    }
    for (const handle of material.snapshot.textureHandles?.values() ?? []) handles.add(handle);
    for (const handle of material.snapshot.samplerHandles?.values() ?? []) handles.add(handle);
  }
  return [...handles];
}
function publicationFrameDependencies(frame) {
  const handles = /* @__PURE__ */ new Set();
  const add = (handle) => {
    if (handle) handles.add(handle);
  };
  for (const decal of frame.projectedDecals ?? []) {
    add(decal.material.materialHandle);
    for (const handle of decal.material.samplerHandles?.values() ?? []) add(handle);
    for (const handle of decal.material.textureHandles?.values() ?? []) add(handle);
  }
  add(frame.skylight?.equirectHandle);
  add(frame.skybox?.equirectHandle);
  for (const camera of [...frame.cameras, ...frame.auxiliaryCameras]) add(camera.output?.colorLut);
  for (const light of frame.lights.spot) {
    add(light.iesProfileHandle);
    add(light.cookieHandle);
    add(light.projectorHandle);
  }
  for (const light of frame.lights.point) add(light.iesProfileHandle);
  for (const light of frame.lights.rect) {
    add(light.iesProfileHandle);
    add(light.sourceTextureHandle);
  }
  const fogs = frame.volumetricFog === void 0 ? [] : [frame.volumetricFog, ...frame.volumetricFog.additional ?? []];
  for (const fog of fogs) {
    add(fog.densityHandle);
    add(fog.projectorHandle);
  }
  return [...handles];
}
function renderableAssetRoots(row) {
  if (row.glyph !== void 0) return [row.glyph.font];
  if (row.tilemap !== void 0) return [row.tilemap.tileset];
  if (row.terrain !== void 0) return [row.terrain.handle];
  const handles = new Set(row.assetHandle === void 0 ? [] : [row.assetHandle]);
  for (const override of row.materialOverrides ?? [])
    if (override?.snapshot.materialHandle) handles.add(override.snapshot.materialHandle);
  for (const material of row.materials) handles.add(material.snapshot.materialHandle ?? 0);
  handles.delete(0);
  return [...handles];
}

// sdk/engine/node_modules/@forgeax/engine-render/src/publication/asset-patch.ts
import {
  validateMaterialValues
} from "@forgeax/engine-types";
var derivedGeometry = /* @__PURE__ */ new Set(["collision", "cardLayout", "distanceField"]);
function binary(value, path) {
  for (const key of path) {
    if (value === null || typeof value !== "object" || !Object.hasOwn(value, key))
      throw new RenderPublicationError({ reason: "shape", subject: "asset binary path" });
    value = value[key];
  }
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value) && value.buffer instanceof ArrayBuffer)
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  throw new RenderPublicationError({ reason: "shape", subject: "owned asset binary field" });
}
function publishAssetPatch(value, change, base) {
  const materialValues = value.kind === "material" && change.ranges.length === 0 && change.fields.length === 1 && change.fields[0] === "values";
  const terrainHeights = value.kind === "terrain" && change.ranges.length > 0 && change.ranges.every((range) => range.path.length === 1 && range.path[0] === "heights") && change.fields.every((field) => field === "heightRange" || field === "sections");
  if (!materialValues && !terrainHeights && (value.kind !== "mesh" && value.kind !== "texture" || change.ranges.length === 0 || change.fields.some(
    (key) => value.kind !== "mesh" || key !== "aabb" && !(derivedGeometry.has(key) && !Object.hasOwn(value, key))
  )))
    return void 0;
  return {
    handle: change.handle,
    base,
    revision: change.revision,
    fields: terrainHeights ? {} : structuredClone(
      Object.fromEntries(
        change.fields.filter((key) => Object.hasOwn(value, key)).map((key) => [key, value[key]])
      )
    ),
    removed: change.fields.filter((key) => !Object.hasOwn(value, key)),
    ranges: change.ranges.map((range) => {
      const rowBytes = range.rowBytes ?? range.byteLength;
      const stride = range.byteStride ?? rowBytes;
      const rows = (range.byteLength - rowBytes) / stride + 1;
      const source = binary(value, range.path);
      const bytes = new Uint8Array(rows * rowBytes);
      for (let row = 0; row < rows; row++) {
        const offset = range.byteOffset + row * stride;
        bytes.set(source.subarray(offset, offset + rowBytes), row * rowBytes);
      }
      return { ...range, path: [...range.path], bytes };
    })
  };
}
function prepareAssetPatch(current, patch, retained) {
  const fail = () => {
    throw new RenderPublicationError({ reason: "shape", subject: "asset binary patch" });
  };
  if (current.kind === "material") {
    if (patch.fields === null || typeof patch.fields !== "object" || Array.isArray(patch.fields) || !Array.isArray(patch.ranges) || patch.ranges.length !== 0 || !Array.isArray(patch.removed) || patch.removed.length !== 0 || Object.keys(patch.fields).length !== 1 || !Object.hasOwn(patch.fields, "values"))
      return fail();
    const values = structuredClone(patch.fields.values);
    if (values === null || typeof values !== "object" || Array.isArray(values) || !validateMaterialValues(
      "<publication>",
      values,
      current.parameters === void 0 ? void 0 : new Map(current.parameters.map((parameter) => [parameter.name, parameter]))
    ).ok)
      return fail();
    return {
      value: { ...current, values },
      change: {
        handle: patch.handle,
        revision: patch.revision,
        removed: false,
        fields: ["values"],
        ranges: []
      },
      commit() {
      }
    };
  }
  if (current.kind === "terrain") return prepareTerrainPatch(current, patch);
  const keyValid = (key) => typeof key === "string" && key !== "kind" && key !== "__proto__" && key !== "constructor" && key !== "prototype";
  if (current.kind !== "mesh" && current.kind !== "texture" || patch.fields === null || typeof patch.fields !== "object" || Array.isArray(patch.fields) || !Array.isArray(patch.removed) || !Array.isArray(patch.ranges) || patch.ranges.length === 0 || patch.ranges.length > 64)
    return fail();
  const fields = structuredClone(patch.fields);
  const removed = [...patch.removed];
  const keys = Object.keys(fields);
  if (keys.some((key) => key !== "aabb") || removed.some((key) => !derivedGeometry.has(key)) || current.kind === "texture" && (keys.length > 0 || removed.length > 0))
    return fail();
  if (fields.aabb !== void 0 && (!(fields.aabb instanceof Float32Array) || fields.aabb.length !== 6 || !fields.aabb.every(Number.isFinite) || [0, 1, 2].some(
    (axis) => fields.aabb[axis] > fields.aabb[axis + 3]
  )))
    return fail();
  const touched = /* @__PURE__ */ new Set([...keys, ...removed]);
  const next = { ...current, ...fields };
  for (const key of removed) delete next[key];
  const ranges = [];
  const copied = /* @__PURE__ */ new WeakMap();
  const copyBranch = (value, path, index = 0) => {
    if (value === null || typeof value !== "object") return fail();
    const cached = copied.get(value);
    if (index === path.length) {
      if (cached !== void 0) return cached;
      const owned = structuredClone(value);
      copied.set(value, owned);
      return owned;
    }
    const branch = cached ?? { ...value };
    copied.set(value, branch);
    const key = path[index];
    branch[key] = copyBranch(value[key], path, index + 1);
    return branch;
  };
  const writes = [];
  for (const range of patch.ranges) {
    if (!Array.isArray(range.path) || range.path.length < 1 || range.path.length > 2 || !range.path.every(keyValid) || touched.has(range.path[0]) || !(range.bytes instanceof Uint8Array))
      return fail();
    if (current.kind === "texture" ? range.path.length !== 1 || range.path[0] !== "data" : !(range.path.length === 1 && (range.path[0] === "vertices" || range.path[0] === "indices") || range.path.length === 2 && range.path[0] === "attributes"))
      return fail();
    const rowBytes = range.rowBytes ?? range.byteLength;
    const stride = range.byteStride ?? rowBytes;
    const rows = (range.byteLength - rowBytes) / stride + 1;
    if (!Number.isSafeInteger(range.byteOffset) || range.byteOffset < 0 || !Number.isSafeInteger(rowBytes) || rowBytes <= 0 || !Number.isSafeInteger(stride) || stride < rowBytes || !Number.isSafeInteger(rows) || rows < 1 || !Number.isSafeInteger(range.byteLength) || rows * rowBytes !== range.bytes.byteLength)
      return fail();
    if (retained) {
      const key = range.path[0];
      next[key] = copyBranch(
        current[key],
        range.path.slice(1)
      );
    }
    const target = binary(next, range.path);
    if (range.byteOffset + range.byteLength > target.byteLength) return fail();
    writes.push({ target, bytes: range.bytes.slice(), offset: range.byteOffset, rowBytes, stride });
    ranges.push({
      path: [...range.path],
      byteOffset: range.byteOffset,
      byteLength: range.byteLength,
      ...range.rowBytes === void 0 ? {} : { rowBytes },
      ...range.byteStride === void 0 ? {} : { byteStride: stride }
    });
  }
  return {
    value: next,
    change: {
      handle: patch.handle,
      revision: patch.revision,
      removed: false,
      fields: [...keys, ...removed],
      ranges
    },
    commit: () => {
      for (const { target, bytes, offset, rowBytes, stride } of writes)
        for (let source = 0, destination = offset; source < bytes.byteLength; source += rowBytes, destination += stride)
          target.set(bytes.subarray(source, source + rowBytes), destination);
    }
  };
}
function prepareTerrainPatch(current, patch) {
  const fail = () => {
    throw new RenderPublicationError({ reason: "shape", subject: "terrain height patch" });
  };
  if (patch.fields === null || typeof patch.fields !== "object" || Array.isArray(patch.fields) || Object.keys(patch.fields).length !== 0 || !Array.isArray(patch.removed) || patch.removed.length !== 0 || !Array.isArray(patch.ranges) || patch.ranges.length === 0 || patch.ranges.length > 64)
    fail();
  let min = current.heightRange[0], max = current.heightRange[1];
  const step = current.subsectionVertices - 1;
  const nx = (current.columns - 1) / step, nz = (current.rows - 1) / step;
  const sections = /* @__PURE__ */ new Map();
  const ranges = [];
  const writes = [];
  for (const range of patch.ranges) {
    const rowBytes = range.rowBytes ?? range.byteLength;
    const stride = range.byteStride ?? rowBytes;
    const rows = (range.byteLength - rowBytes) / stride + 1;
    if (!Array.isArray(range.path) || range.path.length !== 1 || range.path[0] !== "heights" || !(range.bytes instanceof Uint8Array) || !Number.isSafeInteger(range.byteOffset) || range.byteOffset < 0 || !Number.isSafeInteger(rowBytes) || rowBytes < 4 || !Number.isSafeInteger(stride) || stride < rowBytes || !Number.isSafeInteger(rows) || rows < 1 || !Number.isSafeInteger(range.byteLength) || range.byteOffset % 4 !== 0 || rowBytes % 4 !== 0 || stride % 4 !== 0 || rows * rowBytes !== range.bytes.byteLength || range.byteOffset + range.byteLength > current.heights.byteLength)
      fail();
    const bytes = range.bytes.slice();
    const values = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    for (let row = 0; row < rows; row++)
      for (let column = 0; column < rowBytes / 4; column++) {
        const value2 = values.getFloat32(row * rowBytes + column * 4, true);
        if (!Number.isFinite(value2)) fail();
        min = Math.min(min, value2);
        max = Math.max(max, value2);
        const sample = (range.byteOffset + row * stride) / 4 + column;
        const x = sample % current.columns, z = Math.floor(sample / current.columns);
        for (let sz = Math.max(0, Math.ceil(z / step) - 1); sz <= Math.min(nz - 1, Math.floor(z / step)); sz++)
          for (let sx = Math.max(0, Math.ceil(x / step) - 1); sx <= Math.min(nx - 1, Math.floor(x / step)); sx++) {
            const index = sz * nx + sx;
            const previous = sections.get(index) ?? current.sections[index] ?? fail();
            if (value2 < previous.minHeight || value2 > previous.maxHeight)
              sections.set(index, {
                ...previous,
                minHeight: Math.min(previous.minHeight, value2),
                maxHeight: Math.max(previous.maxHeight, value2)
              });
          }
      }
    writes.push({ offset: range.byteOffset, stride, rowBytes, bytes });
    ranges.push({
      path: ["heights"],
      byteOffset: range.byteOffset,
      byteLength: range.byteLength,
      ...range.rowBytes === void 0 ? {} : { rowBytes },
      ...range.byteStride === void 0 ? {} : { byteStride: stride }
    });
  }
  const value = { ...current, heightRange: [min, max] };
  return {
    value,
    change: {
      handle: patch.handle,
      revision: patch.revision,
      removed: false,
      fields: ["heightRange", ...sections.size === 0 ? [] : ["sections"]],
      ranges
    },
    commit() {
      const target = new Uint8Array(
        current.heights.buffer,
        current.heights.byteOffset,
        current.heights.byteLength
      );
      for (const write of writes)
        for (let source = 0, destination = write.offset; source < write.bytes.byteLength; source += write.rowBytes, destination += write.stride)
          target.set(write.bytes.subarray(source, source + write.rowBytes), destination);
      for (const [index, section] of sections)
        current.sections[index] = section;
    }
  };
}

export {
  SceneSdfUnavailableError,
  RECOVERY_ADAPTER_DEADLINE_MS,
  RECOVERY_DEVICE_DEADLINE_MS,
  createRecoveryDeadline,
  createRecoveryContinuation,
  createSingleFlight,
  RecoverError,
  createRecoveryFailedError,
  exposeRenderer,
  toError,
  structuredRendererCause,
  validateRenderProfile,
  freezeRenderProfile,
  inspectPointShadow,
  materialShadersSamplePointShadows,
  projectPointShadowInspection,
  admitPointsLines,
  renderFeatureViewIdentity,
  renderFeatureCameraView,
  createGlobalTransformChangeQuery,
  createRenderSourceState,
  isRenderableMember,
  registerRenderSourceSystems,
  publishAssetPatch,
  prepareAssetPatch,
  publicationCanvasFrames,
  CanvasFrameReceiver,
  publicationDependencies,
  publicationFrameDependencies,
  renderableAssetRoots,
  createRenderTargetPhysical,
  destroyRenderTargetPhysical,
  retireRenderTargetPhysical,
  createRenderTargetHost,
  RenderPublicationTargetOwner,
  publicationTargetSources,
  RenderPublicationTargetReceiver,
  projectVisibleSurfaces,
  resolveVisibleSurface,
  createProbeFilterState,
  advanceProbeFilter,
  commitProbeFilterStep,
  probeFilterIsSteady,
  boxProjectReflectionDirection,
  buildReflectionProbeTable,
  reflectionProbeTableBytes,
  inspectReflectionFallback,
  DEFAULT_REFLECTION_PROBE_LIMITS,
  validateReflectionProbeInput,
  estimateReflectionProbeBytes,
  admitReflectionProbe,
  resolveReflectionFallbackSource,
  reflectionFallbackCoverage,
  reflectionFallbackSourceKey,
  reflectionFallbackProjectionSignature,
  deriveReflectionFallbackProjection,
  selectReflectionProbe,
  ReflectionProbeProjection,
  LOD_OCCLUSION_INSPECTION_SCHEMA,
  LOD_OCCLUSION_INSPECTION_MAX_BYTES,
  inspectLodOcclusion,
  serializeLodOcclusionInspection,
  SSR_FORMAT_PROFILE,
  SSR_FORMAT_STAGES,
  admitSsrM0,
  projectSsrDependencies,
  zeroSsrAdmissionWork,
  resolveSsrAdmissionGeneration,
  validateScreenSpaceReflection,
  admitSsrSpatial,
  projectSsrSpatialInspection,
  serializeSsrSpatialInspection,
  DynamicInputError,
  ReadonlyDynamicInputPage,
  admitSingleLayerMediumSubmission,
  captureSubmittedTerrain,
  createTerrainReceiptOwner,
  querySubmittedTerrainHeight,
  inspectVolumetricFog
};
//# sourceMappingURL=chunk-QMNLXPE2.mjs.map
