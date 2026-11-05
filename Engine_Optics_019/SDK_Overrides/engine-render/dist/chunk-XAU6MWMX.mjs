// sdk/engine/node_modules/@forgeax/engine-render/src/pipeline/standard-output/auto-exposure/inspection.ts
var AutoExposureInvalidParameterError = class extends Error {
  constructor(detail) {
    super(`auto-exposure-invalid-parameter: ${detail.field}`);
    this.detail = detail;
    this.name = "AutoExposureInvalidParameterError";
  }
  detail;
  code = "auto-exposure-invalid-parameter";
  expected = ERROR_POLICY[this.code].expected;
  hint = ERROR_POLICY[this.code].hint;
};
var AutoExposureCapabilityUnavailableError = class extends Error {
  constructor(detail) {
    super(`auto-exposure-capability-unavailable: ${detail.capability}`);
    this.detail = detail;
    this.name = "AutoExposureCapabilityUnavailableError";
  }
  detail;
  code = "auto-exposure-capability-unavailable";
  expected = ERROR_POLICY[this.code].expected;
  hint = ERROR_POLICY[this.code].hint;
};
var AutoExposureStaleGenerationError = class extends Error {
  constructor(detail) {
    super(
      `auto-exposure-stale-generation: ${detail.actualGeneration} != ${detail.expectedGeneration}`
    );
    this.detail = detail;
    this.name = "AutoExposureStaleGenerationError";
  }
  detail;
  code = "auto-exposure-stale-generation";
  expected = ERROR_POLICY[this.code].expected;
  hint = ERROR_POLICY[this.code].hint;
};
var AutoExposureStageFailedError = class extends Error {
  constructor(detail) {
    super(`auto-exposure-stage-failed: ${detail.operation}`);
    this.detail = detail;
    this.name = "AutoExposureStageFailedError";
  }
  detail;
  code = "auto-exposure-stage-failed";
  expected = ERROR_POLICY[this.code].expected;
  hint = ERROR_POLICY[this.code].hint;
};
var ERROR_POLICY = {
  "auto-exposure-invalid-parameter": {
    expected: "camera auto-exposure parameters are finite and within their declared ranges",
    hint: "inspect the field and provide a finite value before rebuilding the camera output"
  },
  "auto-exposure-capability-unavailable": {
    expected: "the auto-exposure stage has the required device capability",
    hint: "inspect live capabilities and retry the same camera generation"
  },
  "auto-exposure-stale-generation": {
    expected: "the prepared auto-exposure state matches the camera target generation",
    hint: "discard stale prepared state and rebuild from the latest camera snapshot"
  },
  "auto-exposure-stage-failed": {
    expected: "the auto-exposure stage completes its declared operation",
    hint: "inspect the structured cause, preserve lastKnownGood, and retry the stage"
  }
};
function createAutoExposureError(input) {
  if (input instanceof AutoExposureInvalidParameterError || input instanceof AutoExposureCapabilityUnavailableError || input instanceof AutoExposureStaleGenerationError || input instanceof AutoExposureStageFailedError) {
    return input;
  }
  switch (input.code) {
    case "auto-exposure-invalid-parameter":
      return new AutoExposureInvalidParameterError(input.detail);
    case "auto-exposure-capability-unavailable":
      return new AutoExposureCapabilityUnavailableError(input.detail);
    case "auto-exposure-stale-generation":
      return new AutoExposureStaleGenerationError(input.detail);
    case "auto-exposure-stage-failed":
      return new AutoExposureStageFailedError(input.detail);
  }
}
function cloneExposure(exposure) {
  if (exposure.kind === "manual") return { ...exposure };
  return {
    ...exposure,
    rangeEv: [exposure.rangeEv[0], exposure.rangeEv[1]],
    rates: [exposure.rates[0], exposure.rates[1]]
  };
}
function cloneFailure(error) {
  if (error === void 0) return void 0;
  return Object.freeze({
    ...error,
    detail: Object.freeze({ ...error.detail })
  });
}
function createAutoExposureInspection(input) {
  const base = {
    requested: cloneExposure(input.requested),
    actual: input.actual,
    actualState: input.actualState ?? (input.actual === null ? "gpu-resident" : "accepted"),
    fallback: input.fallback,
    lastKnownGood: input.lastKnownGood,
    targetGeneration: input.targetGeneration,
    reset: Object.freeze([...input.reset]),
    cost: Object.freeze({ ...input.cost }),
    receipt: Object.freeze({ ...input.receipt })
  };
  if (input.recentFailure === void 0) return Object.freeze(base);
  const recentFailure = cloneFailure(createAutoExposureError(input.recentFailure));
  if (recentFailure === void 0) return Object.freeze(base);
  return Object.freeze({ ...base, recentFailure });
}

// sdk/engine/node_modules/@forgeax/engine-render/src/errors/render.ts
var LifecycleConstructionError = class extends Error {
  code = "lifecycle-construction-failed";
  expected = "all DeviceScope resources establish and terminate in order";
  hint = "inspect detail and cleanupFailures, then recover or rebuild the DeviceScope";
  detail;
  constructor(detail) {
    super(`lifecycle-construction-failed: ${detail.resourceKind} lifecycle transaction failed`);
    this.name = "LifecycleConstructionError";
    this.detail = detail;
  }
};
var LightResourceUnavailableError = class extends Error {
  code = "light-resource-unavailable";
  expected;
  hint;
  detail;
  constructor(detail, expected, actual, hint) {
    super(`light-resource-unavailable: ${detail.feature} ${actual}`);
    this.name = "LightResourceUnavailableError";
    this.expected = expected;
    this.hint = hint;
    this.detail = detail;
  }
};
function createLightResourceUnavailable(input) {
  return new LightResourceUnavailableError(
    {
      entity: input.entity,
      feature: input.feature,
      generation: input.generation,
      sourceKey: input.sourceKey,
      reason: input.reason
    },
    input.expected,
    input.actual,
    input.hint
  );
}
var TemporalFrameSubmitError = class extends Error {
  code = "temporal-frame-submit-rejected";
  expected = "the staged frame is accepted by queue.submit before temporal facts advance";
  hint = "inspect the queue submission and retry the frame after the device is available";
  detail;
  constructor(reason) {
    super(`temporal-frame-submit-rejected: ${reason}`);
    this.name = "TemporalFrameSubmitError";
    this.detail = { reason };
  }
};
var ShadowInvalidConfigError = class extends Error {
  code = "shadow-invalid-config";
  expected;
  hint;
  detail;
  constructor(field, actual, bound, reason) {
    const resolvedReason = reason ?? shadowBoundReason(bound);
    const expected = shadowBoundExpected(field, bound);
    const hint = `set ${field} to ${resolvedReason}; got ${actual}`;
    super(`shadow component .${field} is invalid: ${resolvedReason}; got ${actual}`);
    this.name = "ShadowInvalidConfigError";
    this.hint = hint;
    this.expected = expected;
    this.detail = { field, actual, bound, reason: resolvedReason };
  }
};
function shadowBoundExpected(field, bound) {
  switch (bound.kind) {
    case "range":
      return `${field} in [${bound.min}, ${bound.max}]`;
    case "lower-bound":
      return `${field} ${bound.operator} ${bound.value}`;
    case "allowed-values":
      return `${field} in {${bound.values.join(", ")}}`;
  }
}
function shadowBoundReason(bound) {
  switch (bound.kind) {
    case "range":
      return `a value in [${bound.min}, ${bound.max}]`;
    case "lower-bound":
      return `a value ${bound.operator} ${bound.value}`;
    case "allowed-values":
      return `one of [${bound.values.join(", ")}]`;
  }
}
var EquirectProjectionFailedError = class extends Error {
  code = "equirect-projection-failed";
  expected;
  hint;
  detail;
  constructor(handle, cause) {
    const expected = `equirect handle ${handle} projects to a GPU cubemap + IBL precompute`;
    const hint = `equirect handle ${handle} referenced by Skylight/SkyboxBackground failed projection with ${cause.code} (${cause.hint}); fix detail.cause, then declare Skylight/SkyboxBackground with a new equirect handle. The projection is internal (no user upload call); the record arm does not retry`;
    super(`equirect handle ${handle} cubemap projection failed: ${cause.code}`);
    this.name = "EquirectProjectionFailedError";
    this.expected = expected;
    this.hint = hint;
    this.detail = {
      handle,
      cause: { code: cause.code, expected: cause.expected, hint: cause.hint }
    };
  }
};
var StandardLightBudgetExceededError = class extends Error {
  code = "standard-light-budget-exceeded";
  expected;
  hint;
  detail;
  constructor(actual, budget) {
    const expected = `light count <= ${budget}`;
    const hint = `${actual} finite local lights exceed Standard budget ${budget}; reduce the local-light set or select a profile with a supported budget`;
    super(`Standard light budget exceeded: ${actual} > ${budget}`);
    this.name = "StandardLightBudgetExceededError";
    this.expected = expected;
    this.hint = hint;
    this.detail = { actual, budget };
  }
};
var StandardClusterIndexOverflowError = class extends Error {
  code = "standard-cluster-index-overflow";
  expected;
  hint;
  detail;
  constructor(actual, capacity) {
    const expected = `light index list entries <= ${capacity}`;
    const hint = `cluster binner overflow: writeCount ${actual} exceeds capacity ${capacity}; reduce finite local lights or choose a supported cluster layout`;
    super(`Standard cluster index list overflow: ${actual} > ${capacity}`);
    this.name = "StandardClusterIndexOverflowError";
    this.expected = expected;
    this.hint = hint;
    this.detail = { actual, capacity };
  }
};
var StandardClusterTransportUnavailableError = class extends Error {
  code = "standard-cluster-transport-unavailable";
  expected = "all requested local lights have a proven Cluster transport";
  hint;
  detail;
  constructor(requested, hint = "enable a proven Cluster storage transport before drawing") {
    super(`Standard Cluster transport unavailable for ${requested} local lights`);
    this.name = "StandardClusterTransportUnavailableError";
    this.hint = hint;
    this.detail = { requested, admitted: 0 };
  }
};
var StandardProfileInvalidError = class extends Error {
  code = "standard-profile-invalid";
  expected;
  hint;
  detail;
  constructor(message, detail) {
    super(message);
    this.name = "StandardProfileInvalidError";
    this.detail = detail ?? { field: "profile", actual: message };
    if (this.detail.field === "clusterGrid") {
      this.expected = "clusterGrid.{x,y,z} each positive integer in [1, 64]";
      this.hint = "set clusterGrid.x, clusterGrid.y, and clusterGrid.z to positive integers in [1, 64]";
    } else {
      this.expected = "StandardProfile contains only supported fields and values";
      this.hint = "repair the Standard profile fields and retry setProfile";
    }
  }
};
var PointShadowAtlasUninitializedError = class extends Error {
  code = "point-shadow-atlas-uninitialized";
  expected;
  hint;
  constructor() {
    const expected = "ShadowAtlas.ensure() invoked before faceView()";
    const hint = "Gate faceView on isAllocated() or call ensure() once in the per-frame extract step before iterating face views";
    super("ShadowAtlas.faceView called before ensure(); the cube_array texture is not allocated");
    this.name = "PointShadowAtlasUninitializedError";
    this.expected = expected;
    this.hint = hint;
  }
};
var PointShadowAtlasBoundsViolationError = class extends Error {
  code = "point-shadow-atlas-bounds-violation";
  expected;
  hint;
  detail;
  constructor(axis, value, max) {
    const expected = `0 <= ${axis} < ${max}`;
    const hint = axis === "layer" ? `clamp PointLight.shadowAtlasLayer to [0, ${max}); the cap on layers equals PointLightShadow cardinality (4)` : `clamp face index to [0, ${max}); cube faces are indexed 0..5 in +X/-X/+Y/-Y/+Z/-Z order`;
    super(`ShadowAtlas.faceView ${axis} out of range: ${value} (must be in [0, ${max}))`);
    this.name = "PointShadowAtlasBoundsViolationError";
    this.expected = expected;
    this.hint = hint;
    this.detail = { axis, value, max };
  }
};
var VideoUploadUnsupportedError = class extends Error {
  code = "video-upload-unsupported";
  expected;
  hint;
  constructor() {
    const expected = "a host video source for the VideoPlayer entity; both the copy path and zero-copy importExternalTexture read it";
    const hint = "register a VideoSourceProvider that returns the HTMLVideoElement or VideoFrame for this entity, or render a static texture instead";
    super("video upload unsupported \u2014 no host video source for this VideoPlayer");
    this.name = "VideoUploadUnsupportedError";
    this.expected = expected;
    this.hint = hint;
  }
};
var VertexColorVariantConflictError = class extends Error {
  code = "vertex-color-variant-conflict";
  expected;
  hint;
  detail;
  constructor(authoredValue, projected) {
    const expected = `VERTEX_COLOR_AVAILABLE=${projected ? "true" : "false"}`;
    const hint = "derive the shader variant from the mesh VertexLayoutProjection; COLOR_0 presence is a geometry fact";
    super(`authored vertex-color variant ${authoredValue} disagrees with projected ${expected}`);
    this.name = "VertexColorVariantConflictError";
    this.expected = expected;
    this.hint = hint;
    this.detail = { authored: true, authoredValue, projected };
  }
};
var SkinPaletteOverflowError = class extends Error {
  code = "skin-palette-overflow";
  expected;
  hint;
  detail;
  constructor(requestedBytes, limit) {
    const expected = `skinned joint palette (${requestedBytes} B) fits within device.limits.maxStorageBufferBindingSize (${limit} B)`;
    const hint = "palette buffer exceeds device maxStorageBufferBindingSize; reduce skinned entity count or split into multiple palette buffers (OOS-skin-palette-batch)";
    super(`skin palette buffer needs ${requestedBytes} B, exceeds device limit ${limit} B`);
    this.name = "SkinPaletteOverflowError";
    this.expected = expected;
    this.hint = hint;
    this.detail = { requestedBytes, limit };
  }
};
var SkinMaterialMismatchError = class extends Error {
  code = "skin-material-mismatch";
  expected;
  hint;
  detail;
  constructor(entity, actualShader) {
    const expected = "Skin entity's first material program module === 'forgeax::pbr-skin'";
    const hint = `entity ${entity} has Skin but the first material program module is ${actualShader ?? "<empty>"}; load the mesh via the gltf importer (cooker auto-routes 'forgeax::pbr-skin' for skinned primitives), or remove the Skin component to render the entity unskinned with Materials.standard / Materials.unlit`;
    super(
      `Skin / material mismatch on entity ${entity}: expected forgeax::pbr-skin, got ${actualShader ?? "<empty>"}`
    );
    this.name = "SkinMaterialMismatchError";
    this.expected = expected;
    this.hint = hint;
    this.detail = { entity, actualShader };
  }
};
var MaterialSkinAttrMissingError = class extends Error {
  code = "material-skin-attr-missing";
  expected;
  hint;
  detail;
  constructor(entity, missing) {
    const expected = "pbr-skin material requires mesh.attributes.skinIndex + skinWeight";
    const hint = `entity ${entity} uses forgeax::pbr-skin but its MeshAsset is missing ${missing}; switch the entity to a skinned glTF mesh authored with JOINTS_0 + WEIGHTS_0, or change the material to a non-skin shader via Materials.standard / Materials.unlit`;
    super(
      `material/skin attribute mismatch on entity ${entity}: pbr-skin material with mesh missing ${missing}`
    );
    this.name = "MaterialSkinAttrMissingError";
    this.expected = expected;
    this.hint = hint;
    this.detail = { entity, missing };
  }
};
var TransmissionCapabilityMissingError = class extends Error {
  code = "transmission-capability-missing";
  expected = "the renderer exposes the transmission capability for this material";
  hint = "disable transmission or provide the renderer capability before drawing";
  detail;
  constructor(material, stage, evidence) {
    super(`transmission capability is missing for material '${material}'`);
    this.name = "TransmissionCapabilityMissingError";
    this.detail = { material, capability: "transmission", stage, ...evidence };
  }
};
var MaterialSampledTextureBudgetExceededError = class extends Error {
  code = "material-sampled-texture-budget-exceeded";
  expected = "the material sampled-texture bindings fit the device per-stage limit";
  hint = "remove optional material textures, select fitted direct multiscattering, pack shared transmission maps, or use a device with maxSampledTexturesPerShaderStage >= required";
  detail;
  constructor(detail) {
    super(
      `material ${detail.materialHandle} needs ${detail.required} sampled textures with ${detail.conflicts.join(", ")}; device limit is ${detail.limit}`
    );
    this.name = "MaterialSampledTextureBudgetExceededError";
    this.detail = detail;
  }
};
var renderFeatureRecoveryHintByRecovery = {
  "next-frame": (featureIdentity, stage) => `correct '${featureIdentity}' ${stage} data and retry on the next frame`,
  "renderer-recover": (featureIdentity, _stage) => `wait for renderer recovery before retrying '${featureIdentity}'`,
  registration: (featureIdentity, _stage) => `correct '${featureIdentity}' registration before retrying`
};
var RenderFeatureRegistrationConflictError = class extends Error {
  code = "render-feature-registration-conflict";
  expected;
  hint;
  detail;
  constructor(featureIdentity, order, conflictingOrder) {
    const expected = `feature identity '${featureIdentity}' is unique`;
    const hint = `rename '${featureIdentity}' or remove the duplicate feature before registration`;
    super(`render feature registration conflict for '${featureIdentity}'`);
    this.name = "RenderFeatureRegistrationConflictError";
    this.expected = expected;
    this.hint = hint;
    this.detail = { featureIdentity, order, conflictingOrder };
  }
};
var RenderFeatureStageFailedError = class extends Error {
  code = "render-feature-stage-failed";
  expected;
  hint;
  detail;
  constructor(featureIdentity, order, stage, recovery, cause) {
    const expected = `feature '${featureIdentity}' completes its ${stage} stage without an error`;
    const hint = renderFeatureRecoveryHintByRecovery[recovery](featureIdentity, stage);
    super(`render feature '${featureIdentity}' failed during ${stage}`);
    this.name = "RenderFeatureStageFailedError";
    this.expected = expected;
    this.hint = hint;
    this.detail = {
      featureIdentity,
      order,
      stage,
      recovery,
      ...cause === void 0 ? {} : { cause }
    };
  }
};
var RenderFeatureCapabilityMissingError = class extends Error {
  code = "render-feature-capability-missing";
  expected;
  hint;
  detail;
  constructor(featureIdentity, order, capability) {
    const expected = `device capability '${capability}' is available for feature '${featureIdentity}'`;
    const hint = `disable '${featureIdentity}' or use a device with '${capability}' capability`;
    super(`render feature '${featureIdentity}' requires missing capability '${capability}'`);
    this.name = "RenderFeatureCapabilityMissingError";
    this.expected = expected;
    this.hint = hint;
    this.detail = { featureIdentity, order, capability };
  }
};
var RenderFeaturePreparationFailedError = class extends Error {
  code = "render-feature-preparation-failed";
  expected;
  hint;
  detail;
  constructor(featureIdentity, order, operation, resourceKind, resourceName, reason, recovery) {
    const expected = `${resourceKind} '${resourceName}' is prepared during ${operation}`;
    const hint = `repair '${resourceName}' and retry feature '${featureIdentity}' on ${recovery}`;
    super(`render feature '${featureIdentity}' preparation failed for '${resourceName}'`);
    this.name = "RenderFeaturePreparationFailedError";
    this.expected = expected;
    this.hint = hint;
    this.detail = {
      featureIdentity,
      order,
      stage: "prepare",
      operation,
      resourceKind,
      resourceName,
      reason,
      recovery
    };
  }
};
var RenderFeaturePreparedStateMismatchError = class extends Error {
  code = "render-feature-prepared-state-mismatch";
  expected;
  hint;
  detail;
  constructor(detail) {
    const expected = `${detail.resourceKind} state is compatible for '${detail.operation}'`;
    const hint = `repair '${detail.reason}' for feature '${detail.featureIdentity}' and retry`;
    super(`render feature '${detail.featureIdentity}' prepared state mismatch`);
    this.name = "RenderFeaturePreparedStateMismatchError";
    this.expected = expected;
    this.hint = hint;
    this.detail = detail;
  }
};
var RenderFeatureDrawRecordingFailedError = class extends Error {
  code = "render-feature-draw-recording-failed";
  expected;
  hint;
  detail;
  constructor(featureIdentity, order, operation, resourceKind, reason, backendReason, recovery) {
    const expected = `${resourceKind} recording succeeds for '${operation}'`;
    const hint = `repair '${reason}' and retry feature '${featureIdentity}' after ${recovery}`;
    super(`render feature '${featureIdentity}' draw recording failed`);
    this.name = "RenderFeatureDrawRecordingFailedError";
    this.expected = expected;
    this.hint = hint;
    this.detail = {
      featureIdentity,
      order,
      stage: "record",
      operation,
      resourceKind,
      reason,
      backendReason,
      recovery
    };
  }
};
var ObservationUnavailableError = class extends Error {
  code = "observation-unavailable";
  expected;
  hint;
  detail;
  constructor(reason, hint) {
    let recovery;
    if (reason === "copy-src") recovery = "enable-copy-src";
    else if (reason === "resource" || reason === "readback-failed") recovery = "retry-readback";
    else recovery = "draw-current-frame";
    super(`current-frame observation unavailable: ${reason}`);
    this.name = "ObservationUnavailableError";
    this.expected = "a fresh producer-owned rgba16float current-frame observation";
    this.hint = hint;
    this.detail = { reason, recovery };
  }
};
var SceneDataUnavailableError = class extends Error {
  code = "scene-data-unavailable";
  expected = "the requested semantic scene data is available for the active plan";
  hint;
  detail;
  constructor(detail) {
    const hint = detail.recovery === "enable-capability" ? "enable rgba16floatRenderable and retry the current frame" : detail.recovery === "renderer-recover" ? "wait for renderer recovery, then retry the frame" : "restore the producer coverage and retry on the next frame";
    super(`scene data '${detail.schema}' unavailable for '${detail.featureIdentity}'`);
    this.name = "SceneDataUnavailableError";
    this.hint = hint;
    this.detail = Object.freeze({
      ...detail,
      missingContributorIds: Object.freeze([...detail.missingContributorIds].slice(0, 32)),
      omittedMissingContributorCount: Math.max(
        detail.omittedMissingContributorCount,
        Math.max(0, detail.missingContributorIds.length - 32)
      )
    });
  }
};
var FrameReceiptStaleError = class extends Error {
  code = "frame-receipt-stale";
  expected = "the observation receipt belongs to the active device generation";
  hint = "draw a new frame and call observe with its returned FrameReceipt";
  detail;
  constructor(detail) {
    super("frame receipt belongs to a retired device generation");
    this.name = "FrameReceiptStaleError";
    this.detail = detail;
  }
};
var RendererContractFailureError = class extends Error {
  code = "renderer-contract-failed";
  expected = "renderer owner contracts remain valid at the public boundary";
  hint = "repair the owner contract and retry the operation";
  detail;
  constructor(operation, cause) {
    super(`renderer ${operation} contract failed: ${cause}`);
    this.name = "RendererContractFailureError";
    this.detail = { operation, cause };
  }
};
var EnvironmentSourceConflictError = class extends Error {
  code = "environment-source-conflict";
  expected = "exactly one environment source owns the frame";
  hint = "remove all but one image or atmosphere environment owner";
  detail;
  constructor(owners) {
    super("environment source owners conflict");
    this.name = "EnvironmentSourceConflictError";
    this.detail = { owners: owners.map((owner) => Object.freeze({ ...owner })) };
  }
};
var FogCardinalityError = class extends Error {
  code = "fog-cardinality";
  expected = "zero or one Fog owner contributes to a frame";
  hint = "remove extra Fog owners so the resource owner has at most one";
  detail;
  constructor(count) {
    super(`Fog owner cardinality is ${count}`);
    this.name = "FogCardinalityError";
    this.detail = { count };
  }
};
var TaaCapsInsufficientError = class extends Error {
  code = "taa-caps-insufficient";
  expected = "the backend exposes the capabilities required by TAA";
  hint = "select a backend with the required TAA capabilities or disable TAA on Camera";
  detail;
  constructor(required, available) {
    super("TAA capabilities are insufficient");
    this.name = "TaaCapsInsufficientError";
    this.detail = { required: [...required], available: [...available] };
  }
};
var EnvironmentGenerationFailedError = class extends Error {
  code = "environment-generation-failed";
  expected = "the selected environment generation completes its owner stage";
  hint = "inspect the stage and sourceKey, then retry after correcting the environment";
  detail;
  constructor(sourceKey, stage) {
    super(`environment generation failed during ${stage}`);
    this.name = "EnvironmentGenerationFailedError";
    this.detail = { sourceKey, stage };
  }
};
var AtmosphereInvalidParameterError = class extends Error {
  code = "atmosphere-invalid-parameter";
  expected;
  hint;
  detail;
  constructor(field, value, range2) {
    super(`Atmosphere.${field} is invalid`);
    this.name = "AtmosphereInvalidParameterError";
    this.detail = { field, value };
    const rangeText = Number.isFinite(range2.max) ? `[${range2.min}, ${range2.max}]` : `>= ${range2.min}`;
    this.expected = `Atmosphere.${field} must be finite and ${rangeText}`;
    this.hint = `set Atmosphere.${field} to a finite value ${rangeText}`;
  }
};
var DynamicResolutionInvalidParameterError = class extends Error {
  code = "dynamic-resolution-invalid-parameter";
  expected;
  hint;
  detail;
  constructor(detail) {
    super(`DynamicResolution.${detail.field} is invalid`);
    this.name = "DynamicResolutionInvalidParameterError";
    this.expected = `DynamicResolution.${detail.field} must be ${detail.expected}`;
    this.hint = `set DynamicResolution.${detail.field} to a value that is ${detail.expected}`;
    this.detail = detail;
  }
};
var DynamicResolutionRequiresTaaError = class extends Error {
  code = "dynamic-resolution-requires-taa";
  expected = "DynamicResolution requires Camera.antialias to be 'taa'";
  hint = "set Camera.antialias to 'taa' or remove DynamicResolution before retrying";
  detail;
  constructor(detail) {
    super("DynamicResolution requires TAA");
    this.name = "DynamicResolutionRequiresTaaError";
    this.detail = detail;
  }
};
var DynamicResolutionTimingUnavailableError = class extends Error {
  code = "dynamic-resolution-timing-unavailable";
  expected = "adaptive resolution receives a completed GPU timing sample";
  hint = "use fixed minScale=maxScale or retry after timestamp support is available";
  detail;
  constructor(detail) {
    super(`DynamicResolution timing is unavailable for generation ${detail.generation}`);
    this.name = "DynamicResolutionTimingUnavailableError";
    this.detail = detail;
  }
};
var OutlineInvalidParameterError = class extends Error {
  constructor(field, value, expected) {
    super(`Outline.${field} must be ${expected}`);
    this.expected = expected;
    this.name = "OutlineInvalidParameterError";
    this.hint = `repair Outline.${field} on the active camera`;
    this.detail = { field, value };
  }
  expected;
  code = "outline-invalid-parameter";
  hint;
  detail;
};
var LensFlareInvalidParameterError = class extends Error {
  code = "lens-flare-invalid-parameter";
  expected;
  hint;
  detail;
  constructor(field, value, minimum, maximum) {
    super(`LensFlare.${field} is invalid`);
    this.name = "LensFlareInvalidParameterError";
    this.expected = `finite LensFlare.${field} in [${minimum}, ${maximum}]`;
    this.hint = `repair LensFlare.${field} on the camera and retry`;
    this.detail = { field, value, minimum, maximum };
  }
};
var LensEffectsInvalidParameterError = class extends Error {
  code = "lens-effects-invalid-parameter";
  expected;
  hint;
  detail;
  constructor(field, value, minimum, maximum) {
    super(`LensEffects.${field} is invalid`);
    this.name = "LensEffectsInvalidParameterError";
    this.expected = `finite LensEffects.${field} in [${minimum}, ${maximum}]`;
    this.hint = `repair LensEffects.${field} on the camera and retry`;
    this.detail = { field, value, minimum, maximum };
  }
};
var BarrelDistortionInvalidParameterError = class extends Error {
  code = "barrel-distortion-invalid-parameter";
  expected;
  hint;
  detail;
  constructor(detail) {
    super(`BarrelDistortion.${detail.field} is invalid`);
    this.name = "BarrelDistortionInvalidParameterError";
    this.expected = `BarrelDistortion.${detail.field} must be ${detail.expected}`;
    this.hint = `set BarrelDistortion.${detail.field} to a value that is ${detail.expected}`;
    this.detail = detail;
  }
};
var OwnerStageFailedError = class extends Error {
  code = "owner-stage-failed";
  expected = "the owner completes its current frame stage";
  hint = "inspect the owner and stage, keep the last-known-good frame, and retry";
  detail;
  constructor(owner, stage) {
    super(`${owner} owner failed during ${stage}`);
    this.name = "OwnerStageFailedError";
    this.detail = { owner, stage };
  }
};
var RENDERER_OPERATION_ERROR_POLICY = {
  "frame-submit-rejected": {
    expected: "the frame reaches queue acceptance before submission facts advance",
    hint: "the aborted frame was not accepted; retain dependent gameplay isolation and retry through the frame owner"
  },
  "world-lease-invalid": {
    expected: "every render World is represented by a live lease owned by this Renderer",
    hint: "attach the World to this Renderer and use the returned lease"
  },
  "frame-input-invalid": {
    expected: "the frame input references attached leases and a valid immutable RenderProfile",
    hint: "repair the frame input and retry draw or setProfile"
  },
  "scene-projection-failed": {
    expected: "the attached World projects into the renderer-owned RenderScene",
    hint: "inspect the structured cause, repair the World publication, and retry draw"
  },
  "asset-binding-failed": {
    expected: "all frame assets resolve to valid renderer-owned bindings",
    hint: "inspect the structured cause, rebuild or cold-cook the asset, and retry draw"
  },
  "feature-plan-failed": {
    expected: "every installed RenderFeature produces a valid declarative plan",
    hint: "inspect the feature cause, repair its plan, and retry draw"
  },
  "graph-build-failed": {
    expected: "the Standard graph builds from the active profile and feature plans",
    hint: "inspect the graph cause, repair the profile or plan, and retry"
  },
  "device-operation-failed": {
    expected: "the active device generation completes the renderer-owned operation",
    hint: "inspect renderer state and the structured cause, then retry or recover"
  },
  "surface-unavailable": {
    expected: "the presentation surface accepts the requested lifecycle operation",
    hint: "inspect renderer state, then restore the surface or create a new Renderer"
  },
  "renderer-state-invalid": {
    expected: "the Renderer is in a state that accepts the requested operation",
    hint: "inspect renderer state and choose retry, restoreSurface, recover, or stop"
  },
  "recovery-failed": {
    expected: "one recovery attempt publishes a complete replacement device generation",
    hint: "inspect the structured cause and retry recover after the host-selected delay"
  },
  "cleanup-failed": {
    expected: "Renderer disposal completes every registered cleanup in reverse ownership order",
    hint: "inspect the ordered cleanup causes; the Renderer remains disposed and must not be reused"
  }
};
var RendererOperationError = class extends Error {
  code;
  expected;
  hint;
  detail;
  constructor(code, detail, options) {
    const policy = RENDERER_OPERATION_ERROR_POLICY[code];
    super(`${code}: ${policy.expected}`, options);
    this.name = "RendererOperationError";
    this.code = code;
    this.expected = policy.expected;
    this.hint = policy.hint;
    this.detail = detail;
  }
};
var PointsLinesInvalidStyleError = class extends Error {
  code = "points-lines-invalid-style";
  expected;
  hint;
  detail;
  constructor(detail) {
    super(`invalid ${detail.component} style at ${detail.field}`);
    this.name = "PointsLinesInvalidStyleError";
    this.expected = detail.expected;
    this.hint = `repair entity ${detail.entity} ${detail.component}.${detail.field} and retry admission`;
    this.detail = detail;
  }
};
var PointsLinesTopologyMismatchError = class extends Error {
  code = "points-lines-topology-mismatch";
  expected;
  hint;
  detail;
  constructor(detail) {
    super(`Points/Lines topology mismatch at submesh ${detail.submesh}`);
    this.name = "PointsLinesTopologyMismatchError";
    this.expected = `submesh ${detail.submesh} topology is ${detail.expected}`;
    this.hint = `rebuild entity ${detail.entity} with ${detail.expected} geometry before retrying Points/Lines admission`;
    this.detail = detail;
  }
};
var PointsLinesMaterialUnsupportedError = class extends Error {
  code = "points-lines-material-unsupported";
  expected = "one engine-owned unlit forward MaterialAsset pass";
  hint;
  detail;
  constructor(detail) {
    super(`Points/Lines material is unsupported on entity ${detail.entity}`);
    this.name = "PointsLinesMaterialUnsupportedError";
    this.hint = `use Materials.unlit without a shadow-caster pass for entity ${detail.entity}`;
    this.detail = detail;
  }
};
var PointsLinesBudgetExceededError = class extends Error {
  code = "points-lines-budget-exceeded";
  expected;
  hint;
  detail;
  constructor(detail) {
    super(`Points/Lines ${detail.unit} budget exceeded`);
    this.name = "PointsLinesBudgetExceededError";
    this.expected = `${detail.unit} <= ${detail.limit}`;
    this.hint = `reduce Points/Lines ${detail.unit} or split the entity into bounded equivalent batches`;
    this.detail = detail;
  }
};
var PointsLinesPrepareFailedError = class extends Error {
  code = "points-lines-prepare-failed";
  expected = "the complete Points/Lines candidate validates before publication";
  hint;
  detail;
  constructor(detail) {
    super(`Points/Lines prepare failed at generation ${detail.generation}`);
    this.name = "PointsLinesPrepareFailedError";
    this.hint = detail.lastKnownGood ? "retain the last known good candidate, repair the producer, and retry prepare" : "repair the producer and retry prepare; the failed first candidate produces zero draw";
    this.detail = detail;
  }
};
var RenderTargetDescriptorInvalidError = class extends Error {
  code = "render-target-descriptor-invalid";
  expected;
  hint;
  detail;
  constructor(detail) {
    super(`render-target-descriptor-invalid: ${detail.field} does not satisfy ${detail.expected}`);
    this.name = "RenderTargetDescriptorInvalidError";
    this.expected = detail.expected;
    this.hint = `set RenderTargetDescriptor.${detail.field} to the expected value, then retry create or resize`;
    this.detail = detail;
  }
};
var RenderTargetCapabilityMissingError = class extends Error {
  code = "render-target-capability-missing";
  expected;
  hint;
  detail;
  constructor(detail) {
    super(
      `render-target-capability-missing: ${detail.capability} does not admit ${detail.requested}`
    );
    this.name = "RenderTargetCapabilityMissingError";
    this.expected = `${detail.capability} admits ${detail.requested}`;
    this.hint = `choose an admitted target descriptor or use a backend providing ${detail.capability}`;
    this.detail = detail;
  }
};
var RenderTargetLayerInvalidError = class extends Error {
  code = "render-target-layer-invalid";
  expected;
  hint;
  detail;
  constructor(detail) {
    super(
      `render-target-layer-invalid: ${detail.operation} layer ${String(detail.layer)} is outside a ${detail.shape} target with ${detail.layerCount} layer(s)`
    );
    this.name = "RenderTargetLayerInvalidError";
    this.expected = `an integer layer in [0, ${detail.layerCount - 1}]`;
    this.hint = detail.operation === "write" ? "set Camera.targetLayer to a layer (cube face, array layer, or 3D depth slice) of its Camera.target" : "request a layer (cube face, array layer, or 3D depth slice) that exists in the target";
    this.detail = detail;
  }
};
var RenderTargetStateInvalidError = class extends Error {
  code = "render-target-state-invalid";
  expected;
  hint;
  detail;
  constructor(detail) {
    super(`render-target-state-invalid: ${detail.operation} cannot use ${detail.reason}`);
    this.name = "RenderTargetStateInvalidError";
    this.expected = `target state permits ${detail.operation}`;
    this.hint = "use the Renderer that created the target, then initialize, recover, or stop using the destroyed token";
    this.detail = detail;
  }
};
var RenderTargetOperationFailedError = class extends Error {
  code = "render-target-operation-failed";
  expected;
  hint;
  detail;
  constructor(detail) {
    super(`render-target-operation-failed: ${detail.operation} failed during ${detail.stage}`);
    this.name = "RenderTargetOperationFailedError";
    this.expected = `${detail.operation} completes ${detail.stage}`;
    this.hint = "inspect detail.cause, then retry, recover the Renderer, or retain the last-known-good generation";
    this.detail = detail;
  }
};
var FRAMEBUFFER_SNAPSHOT_HINTS = {
  "request-invalid": "pass non-negative integer region/destination values with width and height >= 1",
  "target-incompatible": "create a 2d rgba16float RenderTarget with sampleCount 1, mipLevels 1 and sampled=true",
  "writer-conflict": "give the snapshot its own target; a camera, capture or other snapshot already writes it this frame",
  "source-unavailable": "draw a frame whose Standard scene color is rendered by the requested camera (CameraView frames need request.camera)",
  "source-out-of-bounds": "keep the region inside the camera scene-color extent reported in detail.actual",
  "destination-out-of-bounds": "keep destination + region inside the current target extent",
  "destination-invalidated": "the target was resized, recovered or rewritten before observe; request a new snapshot"
};
var FramebufferSnapshotFailedError = class extends Error {
  code = "framebuffer-snapshot-failed";
  expected;
  hint;
  detail;
  constructor(detail) {
    super(`framebuffer-snapshot-failed: ${detail.reason}`);
    this.name = "FramebufferSnapshotFailedError";
    this.expected = detail.expected;
    this.hint = FRAMEBUFFER_SNAPSHOT_HINTS[detail.reason];
    this.detail = detail;
  }
};
var ExternalTextureInvalidError = class extends Error {
  code = "external-texture-invalid";
  expected;
  hint;
  detail;
  constructor(detail, expected, hint) {
    super(`external-texture-invalid: ${detail.kind} ${detail.reason} (${detail.actual})`);
    this.name = "ExternalTextureInvalidError";
    this.expected = expected;
    this.hint = hint;
    this.detail = detail;
  }
};
var ExternalTextureStateInvalidError = class extends Error {
  code = "external-texture-state-invalid";
  expected;
  hint;
  detail;
  constructor(detail) {
    super(`external-texture-state-invalid: ${detail.operation} cannot use ${detail.reason}`);
    this.name = "ExternalTextureStateInvalidError";
    this.expected = "a live external texture imported by this renderer at its current generation";
    this.hint = detail.reason === "stale-generation" ? "after recover(), create a GPUTexture on renderer.nativeDevice() and replace() or import it again" : detail.reason === "released" ? "import the texture again; a released handle never binds" : detail.reason === "source-expired" ? "replace() with a decoded source: an open VideoFrame, or a video with readyState >= HAVE_CURRENT_DATA" : "bind the source only in Worlds drawn by the Renderer that imported it";
    this.detail = detail;
  }
};
var RenderIntentInvalidError = class extends Error {
  code = "render-intent-invalid";
  expected;
  hint;
  detail;
  constructor(component, value) {
    super(`render-intent-invalid: ${component}.updateIntent is not an admitted value`);
    this.name = "RenderIntentInvalidError";
    this.expected = `${component}.updateIntent is one of 0, 1, or 2`;
    this.hint = `set ${component}.updateIntent to 0, 1, or 2`;
    this.detail = { component, field: "updateIntent", value, allowed: [0, 1, 2] };
  }
};
var VolumeOwnerConflictError = class extends Error {
  code = "volume-owner-conflict";
  expected = "at most eleven local VolumetricFog owners per rendered World";
  hint = "reduce simultaneously visible volume owners and retry extraction";
  detail;
  constructor(ownerCount) {
    super(`volume-owner-conflict: received ${ownerCount} owners`);
    this.name = "VolumeOwnerConflictError";
    this.detail = { ownerCount };
  }
};
var VolumeDensityShapeMismatchError = class extends Error {
  code = "volume-density-shape-mismatch";
  expected = "density is a linear 3D TextureAsset";
  hint = "bind a verified linear texture with viewDimension 3d";
  detail;
  constructor(guid, viewDimension) {
    super(`volume-density-shape-mismatch: ${viewDimension} density is not 3d`);
    this.name = "VolumeDensityShapeMismatchError";
    this.detail = { guid, viewDimension };
  }
};
var VolumeInvalidBoundsError = class extends Error {
  code = "volume-invalid-bounds";
  expected = "bounds are finite and max is greater than min on every axis";
  hint = "set finite non-degenerate volume bounds";
  detail;
  constructor(bounds) {
    super("volume-invalid-bounds: bounds must be finite and non-degenerate");
    this.name = "VolumeInvalidBoundsError";
    this.detail = bounds;
  }
};
var VolumeInvalidParametersError = class extends Error {
  code = "volume-invalid-parameters";
  expected = "volume parameters remain finite and inside their closed ranges";
  hint = "repair optics or sampling; density-albedo requires linear rgba8unorm or rgba16float";
  detail;
  constructor(input, detail) {
    const invalidSampling = input.sampling !== void 0 && input.sampling !== "noise" && input.sampling !== "density" && input.sampling !== "density-albedo";
    const field = invalidSampling ? "sampling" : input.maxDistance !== void 0 && input.maxDistance <= 0 ? "maxDistance" : "parameters";
    const value = invalidSampling ? input.sampling : field === "maxDistance" ? input.maxDistance : input.anisotropy;
    super(`volume-invalid-parameters: ${detail?.field ?? field} is outside the authored range`);
    this.name = "VolumeInvalidParametersError";
    this.detail = detail ?? { field, value };
  }
};
var CameraViewInvalidError = class extends Error {
  constructor(field, value, expected) {
    super(`Invalid CameraView.${field}`);
    this.expected = expected;
    this.name = "CameraViewInvalidError";
    this.hint = `repair CameraView.${field} before drawing again`;
    this.detail = { field, value };
  }
  expected;
  code = "camera-view-invalid";
  hint;
  detail;
};
var StereoCameraInvalidError = class extends Error {
  constructor(field, value, expected) {
    super(`Invalid StereoCamera.${field}`);
    this.expected = expected;
    this.name = "StereoCameraInvalidError";
    this.hint = field === "projection" || field === "target" || field === "planarReflection" ? `remove StereoCamera or the conflicting Camera ${field} before drawing again` : `repair StereoCamera.${field} before drawing again`;
    this.detail = { field, value };
  }
  expected;
  code = "stereo-camera-invalid";
  hint;
  detail;
};

// sdk/engine/node_modules/@forgeax/engine-render/src/components/camera-view.ts
import { defineComponent } from "@forgeax/engine-ecs";
var CameraView = defineComponent("CameraView", {
  viewport: { type: "array<f32, 4>", default: new Float32Array([0, 0, 1, 1]) },
  order: { type: "i32", default: 0 },
  resolutionScale: { type: "f32", default: 1 },
  updateInterval: { type: "u32", default: 1 },
  enabled: { type: "bool", default: true }
});
var CAMERA_VIEW_DEFAULTS = Object.freeze({
  viewport: new Float32Array([0, 0, 1, 1]),
  order: 0,
  resolutionScale: 1,
  updateInterval: 1,
  enabled: true
});
function cameraViewExtent(view, width, height) {
  const [x = Number.NaN, y = Number.NaN, w = Number.NaN, h = Number.NaN] = view.viewport;
  if (![x, y, w, h].every(Number.isFinite) || x < 0 || y < 0 || w <= 0 || h <= 0 || x + w > 1.000001 || y + h > 1.000001) {
    throw new CameraViewInvalidError(
      "viewport",
      Array.from(view.viewport),
      "a positive normalized rectangle contained in [0, 1]"
    );
  }
  if (!Number.isFinite(view.resolutionScale) || view.resolutionScale <= 0 || view.resolutionScale > 1) {
    throw new CameraViewInvalidError(
      "resolutionScale",
      view.resolutionScale,
      "a finite number in (0, 1]"
    );
  }
  if (!Number.isInteger(view.updateInterval) || view.updateInterval < 1) {
    throw new CameraViewInvalidError("updateInterval", view.updateInterval, "an integer >= 1");
  }
  const left = Math.min(width - 1, Math.round(x * width)), top = Math.min(height - 1, Math.round(y * height));
  const viewportWidth = Math.min(width - left, Math.max(1, Math.round((x + w) * width) - left));
  const viewportHeight = Math.min(height - top, Math.max(1, Math.round((y + h) * height) - top));
  return {
    x: left,
    y: top,
    width: viewportWidth,
    height: viewportHeight,
    renderWidth: Math.max(1, Math.round(viewportWidth * view.resolutionScale)),
    renderHeight: Math.max(1, Math.round(viewportHeight * view.resolutionScale))
  };
}

// sdk/engine/node_modules/@forgeax/engine-render/src/components/outline.ts
import { defineComponent as defineComponent2 } from "@forgeax/engine-ecs";
import { err, ok } from "@forgeax/engine-types";
var Outline = defineComponent2("Outline", {
  entities: "array<entity>",
  visibleColor: { type: "array<f32, 3>", default: new Float32Array([1, 0.5, 0]) },
  hiddenColor: { type: "array<f32, 3>", default: new Float32Array([0.15, 0.05, 0.02]) },
  width: { type: "f32", default: 2 },
  occlusion: { type: "u32", default: 0 }
});
var OutlineOcclusionValue = Object.freeze({ visible: 0, hidden: 1, all: 2 });
function resolveOutline(input) {
  if (input === void 0) return ok(void 0);
  if (!Number.isInteger(input.width) || input.width < 0 || input.width > 8)
    return err(
      new OutlineInvalidParameterError("width", input.width, "integer physical pixels in [0, 8]")
    );
  if (![0, 1, 2].includes(input.occlusion))
    return err(
      new OutlineInvalidParameterError(
        "occlusion",
        input.occlusion,
        "OutlineOcclusionValue.visible, hidden or all"
      )
    );
  for (const field of ["visibleColor", "hiddenColor"]) {
    for (const value of input[field])
      if (!Number.isFinite(value) || value < 0 || value > 1)
        return err(new OutlineInvalidParameterError(field, value, "linear RGB channels in [0, 1]"));
  }
  if (input.width === 0 || input.entities.length === 0) return ok(void 0);
  return ok({
    entities: Array.from(new Set(input.entities)),
    visibleColor: Array.from(input.visibleColor),
    hiddenColor: Array.from(input.hiddenColor),
    width: input.width,
    occlusion: input.occlusion
  });
}

// sdk/engine/node_modules/@forgeax/engine-render/src/components/stereo-camera.ts
import { defineComponent as defineComponent3 } from "@forgeax/engine-ecs";
import { mat4, vec3 } from "@forgeax/engine-math";
var StereoLayoutValue = Object.freeze({
  "side-by-side": 0,
  "top-bottom": 1,
  anaglyph: 2
});
var STEREO_EYES = Object.freeze(["left", "right"]);
var StereoCamera = defineComponent3(
  "StereoCamera",
  {
    eyeSeparation: { type: "f32", default: 0.064 },
    convergence: { type: "f32", default: 10 },
    layout: { type: "enum", default: StereoLayoutValue["side-by-side"], labels: StereoLayoutValue },
    swapEyes: { type: "bool", default: false }
  },
  {
    meta: {
      quickStart: "Attach StereoCamera to a perspective Camera; it renders two eyes into the CameraView rectangle (full screen by default).",
      diagnostics: "renderer.inspect().views reports one row per eye with its eye, viewport, and temporal history.",
      recovery: "stereo-camera-invalid names the rejected field: eyeSeparation >= 0, convergence > Camera.near, perspective projection, no Camera.target or PlanarReflection.",
      boundaries: "StereoCamera owns eye offset, convergence, and output layout; CameraView owns the outer rectangle, order, scale, and cadence."
    }
  }
);
function stereoLayoutFromU32(value) {
  switch (value) {
    case StereoLayoutValue["side-by-side"]:
      return "side-by-side";
    case StereoLayoutValue["top-bottom"]:
      return "top-bottom";
    case StereoLayoutValue.anaglyph:
      return "anaglyph";
    default:
      return void 0;
  }
}
function resolveStereoCamera(data, camera) {
  if (!Number.isFinite(data.eyeSeparation) || data.eyeSeparation < 0)
    throw new StereoCameraInvalidError(
      "eyeSeparation",
      data.eyeSeparation,
      "a finite distance >= 0"
    );
  if (!Number.isFinite(data.convergence) || data.convergence <= camera.near)
    throw new StereoCameraInvalidError(
      "convergence",
      data.convergence,
      `a finite distance > Camera.near (${camera.near})`
    );
  const layout = stereoLayoutFromU32(data.layout);
  if (layout === void 0)
    throw new StereoCameraInvalidError("layout", data.layout, "a StereoLayoutValue");
  if (camera.projection !== "perspective")
    throw new StereoCameraInvalidError("projection", camera.projection, "a perspective Camera");
  if (camera.target)
    throw new StereoCameraInvalidError("target", "RenderTarget", "a screen Camera (target 0)");
  if (camera.planarReflection)
    throw new StereoCameraInvalidError(
      "planarReflection",
      "PlanarReflection",
      "a Camera without PlanarReflection"
    );
  return {
    eyeSeparation: data.eyeSeparation,
    convergence: data.convergence,
    layout,
    swapEyes: data.swapEyes
  };
}
function stereoEyeSlot(stereo, eye) {
  return eye === "left" !== stereo.swapEyes ? 0 : 1;
}
function stereoEyeViewport(viewport, stereo, eye) {
  const x = viewport[0] ?? 0, y = viewport[1] ?? 0, w = viewport[2] ?? 1, h = viewport[3] ?? 1;
  const slot = stereoEyeSlot(stereo, eye);
  switch (stereo.layout) {
    case "side-by-side":
      return new Float32Array([x + slot * w * 0.5, y, w * 0.5, h]);
    case "top-bottom":
      return new Float32Array([x, y + slot * h * 0.5, w, h * 0.5]);
    case "anaglyph":
      return new Float32Array([x, y, w, h]);
  }
}
function stereoFrustumShift(stereo, eye, fov, aspect) {
  const sign = eye === "left" ? 1 : -1;
  return sign * stereo.eyeSeparation * 0.5 / (stereo.convergence * Math.tan(fov * 0.5) * aspect);
}
function stereoEyeCamera(camera, eye) {
  const stereo = camera.stereo;
  if (stereo === void 0) return camera;
  const offset = mat4.fromTranslation(
    mat4.create(),
    vec3.create((eye === "left" ? -0.5 : 0.5) * stereo.eyeSeparation, 0, 0)
  );
  const world = mat4.multiply(mat4.create(), camera.world, offset);
  return {
    ...camera,
    world,
    position: mat4.getTranslation(vec3.create(), world),
    eye: { side: eye },
    projectionOffset: [
      (camera.projectionOffset?.[0] ?? 0) - stereoFrustumShift(stereo, eye, camera.fov, camera.aspect),
      camera.projectionOffset?.[1] ?? 0
    ]
  };
}
function stereoEyeCameras(camera) {
  return camera.stereo === void 0 ? [camera] : STEREO_EYES.map((eye) => stereoEyeCamera(camera, eye));
}

// sdk/engine/node_modules/@forgeax/engine-render/src/errors/gpu-driven.ts
var ERROR_POLICY2 = {
  "missing-material-receipt": {
    expected: "a producer-owned material program receipt is present",
    hint: "cook and load the selected material program artifact, then retry preparation",
    recovery: "rebuild-producer"
  },
  "material-abi-not-executable": {
    expected: "the published material ABI fits the GPU Scene submission layout",
    hint: "recook the material with a scene-index ABI supported by the GPU-driven owner or keep it on its authored lane",
    recovery: "route-cpu-lane"
  },
  "missing-uv": {
    expected: "the geometry exposes every UV set named by the material receipt",
    hint: "repair the geometry UV semantic or route the draw to the CPU semantic lane",
    recovery: "route-cpu-lane"
  },
  "reflection-mismatch": {
    expected: "the loaded reflection receipt matches the artifact layout identity",
    hint: "rebuild the material artifact and reflection from one source, then retry",
    recovery: "rebuild-producer"
  },
  "vertex-input-mismatch": {
    expected: "geometry vertex semantics match the material reflection receipt",
    hint: "repair the geometry vertex semantic layout or route the draw to the CPU lane",
    recovery: "route-cpu-lane"
  },
  "alpha-mask-mismatch": {
    expected: "the Alpha Mask cutoff is present in the material receipt",
    hint: "declare the pass coverage cutoff in the material schema and recook it",
    recovery: "rebuild-producer"
  },
  "resource-not-ready": {
    expected: "all material resource slots have resolved handles",
    hint: "resolve the declared texture and sampler resources before recording",
    recovery: "retry-same-draw"
  },
  "stale-generation": {
    expected: "receipt and prepared inputs belong to the requested generation",
    hint: "discard stale GPU facts, rebuild the producer receipt, and retry the same draw",
    recovery: "rebuild-generation"
  },
  "skin-receipt-mismatch": {
    expected: "skinned geometry has a current palette address receipt",
    hint: "rebuild the Skin palette receipt for this generation before recording",
    recovery: "rebuild-producer"
  },
  "shadow-ownership": {
    expected: "every declared ShadowCaster pass has one GPU-compatible draw-item owner",
    hint: "repair the ShadowCaster producer membership or keep the residual on its explicit CPU lane",
    recovery: "route-cpu-lane"
  }
};
var GpuDrivenPreparationError = class extends Error {
  code;
  expected;
  hint;
  detail;
  constructor(code, detail) {
    const policy = ERROR_POLICY2[code];
    super(`[GpuDrivenPreparationError ${code}] ${policy.expected}`);
    this.name = "GpuDrivenPreparationError";
    this.code = code;
    this.expected = policy.expected;
    this.hint = policy.hint;
    this.detail = Object.freeze({
      ...detail,
      recovery: detail.recovery ?? policy.recovery
    });
  }
};

// sdk/engine/node_modules/@forgeax/engine-render/src/components/planar-reflection.ts
import { defineComponent as defineComponent4 } from "@forgeax/engine-ecs";
var PlanarReflection = defineComponent4("PlanarReflection", {
  target: { type: "shared<RenderTarget>", simulationTransient: true },
  normal: { type: "array<f32, 3>", default: new Float32Array([0, 1, 0]) },
  distance: { type: "f32", default: 0 },
  clipBias: { type: "f32", default: 1e-3 },
  updateIntervalFrames: { type: "u32", default: 1 },
  requestVersion: { type: "u32", default: 0 }
});
var PlanarReflectionInvalidError = class extends Error {
  code = "planar-reflection-invalid";
  expected = "a finite nonzero plane, nonnegative clip bias, positive update interval, and a distinct sampled 2D reflection target on a display Camera";
  hint = "repair the PlanarReflection field and its output target before drawing again";
  detail;
  constructor(field) {
    super(`Invalid planar reflection ${field}`);
    this.name = "PlanarReflectionInvalidError";
    this.detail = { field };
  }
};

// sdk/engine/node_modules/@forgeax/engine-render/src/capture/planar-view.ts
import { mat4 as mat42, vec3 as vec32 } from "@forgeax/engine-math";
function buildPlanarReflectionView(input) {
  const p = Array.from(input.plane);
  const length = Math.hypot(p[0] ?? 0, p[1] ?? 0, p[2] ?? 0);
  if (p.length !== 4 || !p.every(Number.isFinite) || length < 1e-8)
    throw new PlanarReflectionInvalidError("plane");
  if (!Number.isFinite(input.clipBias) || input.clipBias < 0)
    throw new PlanarReflectionInvalidError("clipBias");
  if (input.world.length !== 16 || input.projection.length !== 16 || !Array.from(input.world).every(Number.isFinite) || !Array.from(input.projection).every(Number.isFinite))
    throw new PlanarReflectionInvalidError("camera");
  const plane = p.map((v) => v / length);
  const normal = plane.slice(0, 3);
  const eye = Array.from(input.world.slice(12, 15));
  const dot = (a, b) => (a[0] ?? 0) * (b[0] ?? 0) + (a[1] ?? 0) * (b[1] ?? 0) + (a[2] ?? 0) * (b[2] ?? 0);
  const distance = dot(normal, eye) + (plane[3] ?? 0);
  if (distance <= 1e-6) return void 0;
  const reflectDirection = (v) => v.map((x, i) => x - 2 * dot(normal, v) * (normal[i] ?? 0));
  const position = vec32.create(
    ...eye.map((v, i) => v - 2 * distance * (normal[i] ?? 0))
  );
  const forward = reflectDirection([
    -(input.world[8] ?? 0),
    -(input.world[9] ?? 0),
    -(input.world[10] ?? 0)
  ]);
  const up = reflectDirection(Array.from(input.world.slice(4, 7)));
  const target = position.map((v, i) => v + (forward[i] ?? 0));
  const view = mat42.lookAt(mat42.create(), position, target, up);
  const world = mat42.invert(mat42.create(), view);
  const projection = mat42.create();
  projection.set(input.projection);
  const inverse = mat42.invert(mat42.create(), projection);
  const biasedPlane = [...normal, (plane[3] ?? 0) - input.clipBias];
  const clip = [0, 1, 2, 3].map(
    (column) => biasedPlane.reduce((sum, v, row) => sum + v * (world[column * 4 + row] ?? 0), 0)
  );
  const corner = [Math.sign(clip[0] ?? 0) || 1, Math.sign(clip[1] ?? 0) || 1, 0, 1];
  const q = [0, 1, 2, 3].map(
    (row) => corner.reduce((sum, v, col) => sum + v * (inverse[col * 4 + row] ?? 0), 0)
  );
  const denominator = clip.reduce((sum, v, i) => sum + v * (q[i] ?? 0), 0);
  if (!Number.isFinite(denominator)) throw new PlanarReflectionInvalidError("clipPlane");
  if (denominator <= 1e-8) return void 0;
  for (let i = 0; i < 4; i++)
    projection[i * 4 + 2] = (projection[i * 4 + 3] ?? 0) - (clip[i] ?? 0) / denominator;
  const viewProjection = mat42.multiply(mat42.create(), projection, view);
  return { position, world, view, projection, viewProjection, plane };
}

// sdk/engine/node_modules/@forgeax/engine-render/src/components/lens-effects.ts
import { defineComponent as defineComponent5 } from "@forgeax/engine-ecs";
import { err as err2, ok as ok2 } from "@forgeax/engine-types";
var LensEffects = defineComponent5("LensEffects", {
  vignetteIntensity: { type: "f32", default: 0 },
  vignetteRadius: { type: "f32", default: 0.5 },
  vignetteSoftness: { type: "f32", default: 0.5 },
  vignetteColor: { type: "array<f32, 3>", default: new Float32Array([0, 0, 0]) },
  chromaticAberration: { type: "f32", default: 0 },
  chromaticAberrationAngle: { type: "f32", default: 0 },
  grainIntensity: { type: "f32", default: 0 },
  grainSize: { type: "f32", default: 1 }
});
function resolveLensEffects(input) {
  if (input === void 0) return ok2(void 0);
  for (const [field, minimum, maximum] of [
    ["vignetteIntensity", 0, 1],
    ["vignetteRadius", 0, 1],
    ["vignetteSoftness", 1e-3, 1],
    ["chromaticAberration", 0, 32],
    ["chromaticAberrationAngle", -Math.fround(Math.PI), Math.fround(Math.PI)],
    ["grainIntensity", 0, 1],
    ["grainSize", 1, 8]
  ]) {
    const value = input[field];
    if (!Number.isFinite(value) || value < minimum || value > maximum)
      return err2(new LensEffectsInvalidParameterError(field, value, minimum, maximum));
  }
  for (const value of input.vignetteColor)
    if (!Number.isFinite(value) || value < 0 || value > 1)
      return err2(new LensEffectsInvalidParameterError("vignetteColor", value, 0, 1));
  if (input.vignetteIntensity === 0 && input.chromaticAberration === 0 && input.grainIntensity === 0)
    return ok2(void 0);
  return ok2({ ...input, vignetteColor: Array.from(input.vignetteColor) });
}

// sdk/engine/node_modules/@forgeax/engine-render/src/components/lens-flare.ts
import { defineComponent as defineComponent6 } from "@forgeax/engine-ecs";
import { err as err3, ok as ok3 } from "@forgeax/engine-types";
var LENS_FLARE_GHOST_COUNT = 8;
var DEFAULT_GHOST_TINTS = new Float32Array([
  1,
  0.8,
  0.4,
  1,
  1,
  0.6,
  0.8,
  0.8,
  1,
  0.5,
  1,
  0.4,
  0.5,
  0.8,
  1,
  0.9,
  1,
  0.8,
  1,
  0.8,
  0.4,
  0.9,
  0.7,
  0.7
]);
var DEFAULT_GHOST_SCALES = new Float32Array(
  [0.6, 0.53, 0.46, 0.39, 0.31, 0.27, 0.22, 0.15].map((alpha) => alpha * 7 - 3.5)
);
var LensFlare = defineComponent6("LensFlare", {
  intensity: { type: "f32", default: 1 },
  /** Linear HDR `r + g + b` where a pixel starts to contribute. */
  threshold: { type: "f32", default: 8 },
  /** Bokeh diameter as a percentage of twice the view width (Unreal's guard band). */
  bokehSize: { type: "f32", default: 3 },
  tint: { type: "array<f32, 3>", default: new Float32Array([1, 1, 1]) },
  /** Linear RGB per ghost, eight triples. */
  ghostTints: { type: "array<f32, 24>", default: DEFAULT_GHOST_TINTS },
  /**
   * Signed image scale per ghost: a source at screen offset X appears at
   * `scale * X`. Negative scales mirror through the center; 0 disables it.
   */
  ghostScales: { type: "array<f32, 8>", default: DEFAULT_GHOST_SCALES }
});
function resolveLensFlare(input) {
  if (input === void 0) return ok3(void 0);
  for (const [field, minimum, maximum] of [
    ["intensity", 0, 64],
    ["threshold", 0, 65504],
    ["bokehSize", 0.1, 10]
  ]) {
    const value = input[field];
    if (!Number.isFinite(value) || value < minimum || value > maximum)
      return err3(new LensFlareInvalidParameterError(field, value, minimum, maximum));
  }
  for (const [field, minimum, maximum] of [
    ["tint", 0, 64],
    ["ghostTints", 0, 64],
    ["ghostScales", -8, 8]
  ]) {
    for (const value of input[field])
      if (!Number.isFinite(value) || value < minimum || value > maximum)
        return err3(new LensFlareInvalidParameterError(field, value, minimum, maximum));
  }
  const ghostTints = Array.from(input.ghostTints);
  const ghostScales = Array.from(input.ghostScales);
  const live = ghostScales.some(
    (scale, ghost) => scale !== 0 && (ghostTints[ghost * 3] ?? 0) + (ghostTints[ghost * 3 + 1] ?? 0) + (ghostTints[ghost * 3 + 2] ?? 0) > 0
  );
  const tint = Array.from(input.tint);
  if (input.intensity === 0 || !live || tint.every((value) => value === 0)) return ok3(void 0);
  return ok3({
    intensity: input.intensity,
    threshold: input.threshold,
    bokehSize: input.bokehSize,
    tint,
    ghostTints,
    ghostScales
  });
}

// sdk/engine/node_modules/@forgeax/engine-render/src/material-resource.ts
import { runtimeMaterialShaderId } from "@forgeax/engine-assets-runtime";
var resources = /* @__PURE__ */ new WeakMap();
var MaterialResource = class _MaterialResource {
  current;
  static from(snapshot) {
    return resources.get(snapshot) ?? new _MaterialResource(snapshot);
  }
  constructor(snapshot) {
    this.current = snapshot;
    resources.set(snapshot, this);
  }
  get snapshot() {
    return this.current;
  }
  /** Called by material preparation at the renderer's adoption boundary. */
  adopt(snapshot) {
    this.current = snapshot;
    resources.set(snapshot, this);
  }
};
function materialResource(snapshot) {
  return resources.get(snapshot);
}
function runtimeMaterialShaderIdForMaterial(passes, programs) {
  const pass = passes.find(
    (pass2) => !/shadow|depth/i.test(
      String(
        pass2.renderState?.tags?.LightMode ?? pass2.name
      )
    )
  ) ?? passes[0];
  if (pass === void 0) return void 0;
  return programs === void 0 ? runtimeMaterialShaderId(pass.program.module, pass.name) : programs[pass.name];
}
function materialUsesSpriteGeometry(material) {
  const shader = runtimeMaterialShaderIdForMaterial(material.passes, void 0);
  return shader === "forgeax::sprite" || shader === "forgeax::sprite-lit";
}

// sdk/engine/node_modules/@forgeax/engine-render/src/components/cube-camera.ts
import { defineComponent as defineComponent7 } from "@forgeax/engine-ecs";
var CUBE_CAMERA_UPDATE_ONCE = 0;
var CUBE_CAMERA_UPDATE_ON_DEMAND = 1;
var CUBE_CAMERA_UPDATE_CONTINUOUS = 2;
var CUBE_CAMERA_FACE_ORDER = ["+X", "-X", "+Y", "-Y", "+Z", "-Z"];
function cubeCameraUpdateIntentFromF32(value) {
  switch (value) {
    case CUBE_CAMERA_UPDATE_ONCE:
      return "once";
    case CUBE_CAMERA_UPDATE_ON_DEMAND:
      return "on-demand";
    case CUBE_CAMERA_UPDATE_CONTINUOUS:
      return "continuous";
    default:
      throw new RenderIntentInvalidError("CubeCamera", value);
  }
}
function cubeCameraUpdateIntentToF32(intent) {
  switch (intent) {
    case "once":
      return CUBE_CAMERA_UPDATE_ONCE;
    case "on-demand":
      return CUBE_CAMERA_UPDATE_ON_DEMAND;
    case "continuous":
      return CUBE_CAMERA_UPDATE_CONTINUOUS;
  }
}
var CubeCamera = defineComponent7("CubeCamera", {
  target: { type: "shared<RenderTarget>", simulationTransient: true },
  near: { type: "f32", default: 0.1 },
  far: { type: "f32", default: 100 },
  updateIntent: { type: "f32", default: CUBE_CAMERA_UPDATE_ONCE },
  requestVersion: { type: "u32", default: 0 },
  faceBudget: { type: "u32", default: 1 }
});

// sdk/engine/node_modules/@forgeax/engine-render/src/capture/cube-views.ts
import { mat4 as mat43 } from "@forgeax/engine-math";
var FACE_ORIENTATION = [
  { direction: [1, 0, 0], up: [0, 1, 0] },
  { direction: [-1, 0, 0], up: [0, 1, 0] },
  { direction: [0, 1, 0], up: [0, 0, -1] },
  { direction: [0, -1, 0], up: [0, 0, 1] },
  { direction: [0, 0, 1], up: [0, 1, 0] },
  { direction: [0, 0, -1], up: [0, 1, 0] }
];
function assertRange(near, far) {
  if (!Number.isFinite(near) || near <= 0 || !Number.isFinite(far) || far <= near) {
    throw new RangeError("CubeCamera requires finite near > 0 and far > near.");
  }
}
function buildCubeCameraFaceViews(input) {
  assertRange(input.near, input.far);
  const views = [];
  for (const [index, face] of CUBE_CAMERA_FACE_ORDER.entries()) {
    const orientation = FACE_ORIENTATION[index];
    if (orientation === void 0)
      throw new Error(`CubeCamera face orientation missing at ${index}`);
    const target = [
      (input.position[0] ?? 0) + orientation.direction[0],
      (input.position[1] ?? 0) + orientation.direction[1],
      (input.position[2] ?? 0) + orientation.direction[2]
    ];
    const view = mat43.lookAt(mat43.create(), input.position, target, orientation.up);
    const projection = mat43.perspectiveReverseZ(
      mat43.create(),
      Math.PI / 2,
      1,
      input.near,
      input.far
    );
    const viewProjection = mat43.multiply(mat43.create(), projection, view);
    views.push({
      position: input.position,
      face,
      direction: orientation.direction,
      up: orientation.up,
      near: input.near,
      far: input.far,
      view,
      projection,
      viewProjection
    });
  }
  return views;
}

// sdk/engine/node_modules/@forgeax/engine-render/src/components/ambient-occlusion.ts
import { defineComponent as defineComponent8 } from "@forgeax/engine-ecs";
import { err as err5, ok as ok5 } from "@forgeax/engine-types";

// sdk/engine/node_modules/@forgeax/engine-render/src/post-process-errors.ts
var POST_PROCESS_POLICY = {
  "post-process-already-registered": {
    expected: "each post-process id is registered at most once",
    hint: (detail) => `post-process id '${detail.id}' is already registered; same-id re-register is forbidden. Pick a distinct id (engine builtins use the forgeax:: prefix; user passes use <package>::<id>).`
  },
  "post-process-not-found": {
    expected: "typed fullscreen plan references a registered post-process id",
    hint: (detail) => `no post-process is registered for id '${detail.id}'. For Engine-owned effects, rebuild the shader manifest with that Engine entry enabled. For custom effects, register '${detail.id}' with the feature host ({source, reads?}), then reference it from a typed fullscreen RenderFeaturePlan.`
  },
  "fullscreen-input-not-found": {
    expected: "reads key must be a graph-declared colorTarget with TEXTURE_BINDING",
    hint: (detail) => {
      const d = detail;
      return `fullscreen pass '${d.passName}' references reads key '${d.readsKey}' but that key is not declared as a graph color target, or the target is not sampleable as a texture. First declare graph color target '${d.readsKey}' with its format and size (or check spelling) before the typed fullscreen pass '${d.passName}' reads it. If '${d.readsKey}' is a depth target, ensure it has TEXTURE_BINDING usage (0x04) and is declared via graph.addColorTarget. Consider switching pipeline if your pipeline does not expose a sampleable depth target.`;
    }
  },
  "ssao-parameter-invalid": {
    expected: "valid AO algorithm, quality, finite non-negative thickness/exponent/intensity, falloff in [0, 1] and resolutionScale in [0.25, 1]",
    hint: () => "Inspect detail.paramName; use algorithm gtao or ssao, quality low/medium/high, non-negative finite intensity/thickness/distanceExponent, distanceFallOff in [0, 1], resolutionScale in [0.25, 1]."
  },
  "ssao-radius-non-positive": {
    expected: "SSAO radius must be > 0",
    hint: (detail) => {
      const d = detail;
      return `SSAO parameter '${d.paramName}' is ${d.value}, must be greater than 0. Set config.ssao.${d.paramName} to a positive value (default 0.25) or disable SSAO with config.ssao.enabled = false.`;
    }
  },
  "ssao-bias-negative": {
    expected: "SSAO bias must be >= 0",
    hint: (detail) => {
      const d = detail;
      return `SSAO parameter '${d.paramName}' is ${d.value}, must be >= 0. Set config.ssao.${d.paramName} to a non-negative value (default 0) or disable SSAO.`;
    }
  },
  "params-size-mismatch": {
    expected: "params.byteSize >= 16 and defaultValue.length === byteSize",
    hint: (detail) => {
      const d = detail;
      return `params.byteSize is ${d.byteSize} but defaultValue.length is ${d.actualLength}. The UBO byteSize must be >= 16 B and defaultValue.length must equal byteSize. Pass a defaultValue Uint8Array whose .length matches byteSize exactly.`;
    }
  },
  "params-update-size-mismatch": {
    expected: "PostProcessParams.data byteLength === registered params.byteSize",
    hint: (detail) => {
      const d = detail;
      return `PostProcessParams.data byteLength is ${d.actualLength} but the registered params.byteSize is ${d.byteSize}. The per-frame data-driven write must match the registered byteSize exactly; check the PostProcessParams.data you assign each frame.`;
    }
  }
};
var PostProcessErrorClass = class extends Error {
  code;
  expected;
  hint;
  detail;
  constructor(args) {
    const policy = POST_PROCESS_POLICY[args.code];
    const hint = policy.hint(args.detail);
    super(`post-process: ${args.code} (${hint})`);
    this.name = "PostProcessError";
    this.code = args.code;
    this.expected = policy.expected;
    this.hint = hint;
    this.detail = args.detail;
  }
};
var PostProcessError = PostProcessErrorClass;

// sdk/engine/node_modules/@forgeax/engine-render/src/ssao-config.ts
import { err as err4, ok as ok4 } from "@forgeax/engine-types";
var SSAO_DEFAULT_RADIUS = 0.25;
var SSAO_DEFAULT_BIAS = 0;
var SSAO_DEFAULT_INTENSITY = 1;
var GTAO_SAMPLE_COUNTS = { low: 4, medium: 10, high: 16 };
var SSAO_DEFAULT_THICKNESS = 1;
var SSAO_DEFAULT_DISTANCE_EXPONENT = 1;
var SSAO_DEFAULT_DISTANCE_FALL_OFF = 1;
var SSAO_DEFAULT_RESOLUTION_SCALE = 1;
var SSAO_SAMPLE_COUNTS = { low: 16, medium: 32, high: 64 };
function getSsaoParameters(config) {
  return {
    algorithm: config?.algorithm ?? "gtao",
    directLightingStrength: config?.directLightingStrength ?? 0,
    radius: config?.radius ?? SSAO_DEFAULT_RADIUS,
    bias: config?.bias ?? SSAO_DEFAULT_BIAS,
    intensity: config?.intensity ?? SSAO_DEFAULT_INTENSITY,
    thickness: config?.thickness ?? SSAO_DEFAULT_THICKNESS,
    distanceExponent: config?.distanceExponent ?? SSAO_DEFAULT_DISTANCE_EXPONENT,
    distanceFallOff: config?.distanceFallOff ?? SSAO_DEFAULT_DISTANCE_FALL_OFF,
    resolutionScale: config?.resolutionScale ?? SSAO_DEFAULT_RESOLUTION_SCALE,
    quality: config?.quality ?? "high"
  };
}
function resolveSsaoParameters(config) {
  const resolved = getSsaoParameters(config);
  if (resolved.algorithm !== "ssao" && resolved.algorithm !== "gtao") {
    return err4(
      new PostProcessError({
        code: "ssao-parameter-invalid",
        detail: { paramName: "algorithm", value: resolved.algorithm }
      })
    );
  }
  if (!Number.isFinite(resolved.radius) || resolved.radius <= 0) {
    return err4(
      new PostProcessError({
        code: "ssao-radius-non-positive",
        detail: { paramName: "radius", value: resolved.radius }
      })
    );
  }
  if (!Number.isFinite(resolved.bias) || resolved.bias < 0) {
    return err4(
      new PostProcessError({
        code: "ssao-bias-negative",
        detail: { paramName: "bias", value: resolved.bias }
      })
    );
  }
  if (!Number.isFinite(resolved.intensity) || resolved.intensity < 0 || !Object.hasOwn(SSAO_SAMPLE_COUNTS, resolved.quality)) {
    const paramName = !Number.isFinite(resolved.intensity) || resolved.intensity < 0 ? "intensity" : "quality";
    return err4(
      new PostProcessError({
        code: "ssao-parameter-invalid",
        detail: { paramName, value: resolved[paramName] }
      })
    );
  }
  if (!Number.isFinite(resolved.directLightingStrength) || resolved.directLightingStrength < 0 || resolved.directLightingStrength > 1) {
    return err4(
      new PostProcessError({
        code: "ssao-parameter-invalid",
        detail: { paramName: "directLightingStrength", value: resolved.directLightingStrength }
      })
    );
  }
  for (const [paramName, min, max] of [
    ["thickness", 0, Number.POSITIVE_INFINITY],
    ["distanceExponent", 0, Number.POSITIVE_INFINITY],
    ["distanceFallOff", 0, 1],
    ["resolutionScale", 0.25, 1]
  ]) {
    const value = resolved[paramName];
    if (!Number.isFinite(value) || value < min || value > max) {
      return err4(
        new PostProcessError({
          code: "ssao-parameter-invalid",
          detail: { paramName, value }
        })
      );
    }
  }
  return ok4(resolved);
}

// sdk/engine/node_modules/@forgeax/engine-render/src/components/ambient-occlusion.ts
var AMBIENT_OCCLUSION_ALGORITHMS = ["ssao", "gtao"];
var AMBIENT_OCCLUSION_QUALITIES = ["low", "medium", "high"];
var AMBIENT_OCCLUSION_SSAO = AMBIENT_OCCLUSION_ALGORITHMS.indexOf("ssao");
var AMBIENT_OCCLUSION_GTAO = AMBIENT_OCCLUSION_ALGORITHMS.indexOf("gtao");
var AmbientOcclusion = defineComponent8("AmbientOcclusion", {
  algorithm: { type: "f32", default: AMBIENT_OCCLUSION_GTAO },
  radius: { type: "f32", default: SSAO_DEFAULT_RADIUS },
  bias: { type: "f32", default: SSAO_DEFAULT_BIAS },
  intensity: { type: "f32", default: SSAO_DEFAULT_INTENSITY },
  thickness: { type: "f32", default: SSAO_DEFAULT_THICKNESS },
  distanceExponent: { type: "f32", default: SSAO_DEFAULT_DISTANCE_EXPONENT },
  distanceFallOff: { type: "f32", default: SSAO_DEFAULT_DISTANCE_FALL_OFF },
  resolutionScale: { type: "f32", default: SSAO_DEFAULT_RESOLUTION_SCALE },
  directLightingStrength: { type: "f32", default: 0 },
  quality: { type: "f32", default: AMBIENT_OCCLUSION_QUALITIES.indexOf("high") }
});
function ambientOcclusionParameters(data) {
  const algorithm = AMBIENT_OCCLUSION_ALGORITHMS[data.algorithm];
  if (algorithm === void 0) {
    return err5(
      new PostProcessError({
        code: "ssao-parameter-invalid",
        detail: { paramName: "algorithm", value: data.algorithm }
      })
    );
  }
  const quality = AMBIENT_OCCLUSION_QUALITIES[data.quality];
  if (quality === void 0) {
    return err5(
      new PostProcessError({
        code: "ssao-parameter-invalid",
        detail: { paramName: "quality", value: data.quality }
      })
    );
  }
  const config = {
    algorithm,
    radius: data.radius,
    bias: data.bias,
    intensity: data.intensity,
    directLightingStrength: data.directLightingStrength,
    thickness: data.thickness,
    distanceExponent: data.distanceExponent,
    distanceFallOff: data.distanceFallOff,
    resolutionScale: data.resolutionScale,
    quality
  };
  const resolved = resolveSsaoParameters(config);
  return resolved.ok ? ok5(config) : resolved;
}

// sdk/engine/node_modules/@forgeax/engine-render/src/components/atmosphere.ts
import { defineComponent as defineComponent9 } from "@forgeax/engine-ecs";
var Atmosphere = defineComponent9("Atmosphere", {
  planetRadius: { type: "f32", default: 636e4 },
  atmosphereHeight: { type: "f32", default: 6e4 },
  rayleighScattering: {
    type: "array<f32, 3>",
    default: new Float32Array([5802e-9, 13558e-9, 331e-7])
  },
  rayleighScaleHeight: { type: "f32", default: 8e3 },
  mieScattering: { type: "f32", default: 3996e-9 },
  mieAbsorption: { type: "f32", default: 444e-9 },
  mieScaleHeight: { type: "f32", default: 1200 },
  mieAnisotropy: { type: "f32", default: 0.8 },
  absorption: {
    type: "array<f32, 3>",
    default: new Float32Array([65e-8, 1881e-9, 85e-9])
  },
  absorptionPeakHeight: { type: "f32", default: 25e3 },
  absorptionHalfWidth: { type: "f32", default: 15e3 },
  groundAlbedo: { type: "array<f32, 3>", default: new Float32Array([0.4, 0.4, 0.4]) },
  multipleScattering: { type: "f32", default: 1 },
  sunAngularRadius: { type: "f32", default: 4675e-6 },
  aerialPerspectiveStart: { type: "f32", default: 0 },
  aerialPerspectiveDistanceScale: { type: "f32", default: 1 }
});

// sdk/engine/node_modules/@forgeax/engine-render/src/components/barrel-distortion.ts
import { defineComponent as defineComponent10 } from "@forgeax/engine-ecs";
import { err as err6, ok as ok6 } from "@forgeax/engine-types";
var BarrelDistortion = defineComponent10("BarrelDistortion", {
  strength: { type: "f32", default: 0 },
  centerX: { type: "f32", default: 0.5 },
  centerY: { type: "f32", default: 0.5 }
});
var DEFAULT_BARREL_DISTORTION = Object.freeze({
  strength: 0,
  centerX: 0.5,
  centerY: 0.5
});
function invalid(field, value, expected) {
  return new BarrelDistortionInvalidParameterError({ field, value, expected });
}
function validateBarrelDistortionParameters(input) {
  const value = input ?? {};
  const strength = value.strength ?? DEFAULT_BARREL_DISTORTION.strength;
  const centerX = value.centerX ?? DEFAULT_BARREL_DISTORTION.centerX;
  const centerY = value.centerY ?? DEFAULT_BARREL_DISTORTION.centerY;
  if (!Number.isFinite(strength) || strength < 0 || strength > 0.35) {
    return err6(invalid("strength", strength, "finite and in [0, 0.35]"));
  }
  if (!Number.isFinite(centerX) || centerX < 0 || centerX > 1) {
    return err6(invalid("centerX", centerX, "finite and in [0, 1]"));
  }
  if (!Number.isFinite(centerY) || centerY < 0 || centerY > 1) {
    return err6(invalid("centerY", centerY, "finite and in [0, 1]"));
  }
  return ok6(Object.freeze({ strength, centerX, centerY }));
}

// sdk/engine/node_modules/@forgeax/engine-render/src/components/camera.ts
import { defineComponent as defineComponent11 } from "@forgeax/engine-ecs";
import { TONEMAP_SHADER_MODE } from "@forgeax/engine-shader";
var CAMERA_PROJECTION_PERSPECTIVE = 0;
var CAMERA_PROJECTION_ORTHOGRAPHIC = 1;
var CAMERA_EXPOSURE_MODE_MANUAL = 0;
var CAMERA_EXPOSURE_MODE_AUTO = 1;
var CAMERA_TEMPERATURE_MIN = 1e3;
var CAMERA_TEMPERATURE_MAX = 4e4;
var CAMERA_TINT_MIN = -1;
var CAMERA_TINT_MAX = 1;
var CameraError = class extends Error {
  code;
  expected;
  hint;
  detail;
  constructor(code, field, actual, expected, hint) {
    super(`${code}: ${field}=${String(actual)}; expected ${expected}`);
    this.name = "CameraError";
    this.code = code;
    this.expected = expected;
    this.hint = hint;
    this.detail = Object.freeze({ field, actual, expected });
  }
};
function actualValue(value) {
  if (typeof value === "number" || typeof value === "string") return value;
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}
function cameraError(code, field, actual, expected, hint) {
  return new CameraError(code, field, actualValue(actual), expected, hint);
}
function finitePositive(value) {
  return Number.isFinite(value) && value > 0;
}
function validateCameraExposure(exposure) {
  if (typeof exposure !== "object" || exposure === null) {
    throw cameraError(
      "camera-exposure-invalid",
      "value",
      exposure,
      "an object with kind manual or auto",
      "choose one member of the CameraExposure union"
    );
  }
  if (exposure.kind === "manual") {
    if (!finitePositive(exposure.multiplier)) {
      throw cameraError(
        "camera-exposure-invalid",
        "multiplier",
        exposure.multiplier,
        "a finite number greater than zero",
        "set Camera.exposure to a positive finite manual multiplier"
      );
    }
    return exposure;
  }
  if (exposure.kind === "auto") {
    const [min, max] = exposure.rangeEv;
    const [up, down] = exposure.rates;
    if (!finitePositive(exposure.fallback) || !Number.isFinite(exposure.compensationEv) || !Number.isFinite(min) || !Number.isFinite(max) || min > max || !Number.isFinite(up) || !Number.isFinite(down) || up < 0 || down < 0) {
      throw cameraError(
        "camera-exposure-invalid",
        "auto",
        JSON.stringify(exposure),
        "finite fallback/compensation, an ordered range, and non-negative rates",
        "inspect fallback, compensationEv, rangeEv, and rates before rebuilding the camera"
      );
    }
    return exposure;
  }
  throw cameraError(
    "camera-exposure-invalid",
    "kind",
    exposure.kind,
    "'manual' or 'auto'",
    "choose one member of the CameraExposure union"
  );
}
function validateCameraColorGrading(temperature, tint, colorLutStrength) {
  if (!Number.isFinite(temperature) || temperature < CAMERA_TEMPERATURE_MIN || temperature > CAMERA_TEMPERATURE_MAX) {
    throw cameraError(
      "camera-color-grading-invalid",
      "temperature",
      temperature,
      `a finite value in [${CAMERA_TEMPERATURE_MIN}, ${CAMERA_TEMPERATURE_MAX}]`,
      "set Camera.temperature to a supported Kelvin value"
    );
  }
  if (!Number.isFinite(tint) || tint < CAMERA_TINT_MIN || tint > CAMERA_TINT_MAX) {
    throw cameraError(
      "camera-color-grading-invalid",
      "tint",
      tint,
      `a finite value in [${CAMERA_TINT_MIN}, ${CAMERA_TINT_MAX}]`,
      "set Camera.tint to a normalized value between -1 and 1"
    );
  }
  if (!Number.isFinite(colorLutStrength) || colorLutStrength < 0 || colorLutStrength > 1) {
    throw cameraError(
      "camera-color-grading-invalid",
      "colorLutStrength",
      colorLutStrength,
      "a finite value in [0, 1]",
      "set Camera.colorLutStrength to zero to disable the LUT or a blend in [0, 1]"
    );
  }
}
function cameraProjectionFromF32(value) {
  return value === CAMERA_PROJECTION_ORTHOGRAPHIC ? "orthographic" : "perspective";
}
var TONEMAP_NONE = TONEMAP_SHADER_MODE.none;
var TONEMAP_REINHARD_EXTENDED = TONEMAP_SHADER_MODE.reinhardExtended;
var TONEMAP_REINHARD = TONEMAP_SHADER_MODE.reinhard;
var TONEMAP_LINEAR = TONEMAP_SHADER_MODE.linear;
var TONEMAP_CINEON = TONEMAP_SHADER_MODE.cineon;
var TONEMAP_ACES_FILMIC = TONEMAP_SHADER_MODE.acesFilmic;
var TONEMAP_AGX = TONEMAP_SHADER_MODE.agx;
var TONEMAP_NEUTRAL = TONEMAP_SHADER_MODE.neutral;
function tonemapFromF32(value) {
  switch (value) {
    case TONEMAP_REINHARD_EXTENDED:
      return "reinhard-extended";
    case TONEMAP_REINHARD:
      return "reinhard";
    case TONEMAP_LINEAR:
      return "linear";
    case TONEMAP_CINEON:
      return "cineon";
    case TONEMAP_ACES_FILMIC:
      return "aces-filmic";
    case TONEMAP_AGX:
      return "agx";
    case TONEMAP_NEUTRAL:
      return "neutral";
    default:
      return "none";
  }
}
function tonemapToU32(mode) {
  switch (mode) {
    case "reinhard-extended":
      return TONEMAP_REINHARD_EXTENDED;
    case "reinhard":
      return TONEMAP_REINHARD;
    case "linear":
      return TONEMAP_LINEAR;
    case "cineon":
      return TONEMAP_CINEON;
    case "aces-filmic":
      return TONEMAP_ACES_FILMIC;
    case "agx":
      return TONEMAP_AGX;
    case "neutral":
      return TONEMAP_NEUTRAL;
    case "none":
      return TONEMAP_NONE;
  }
  throw cameraError(
    "camera-tonemap-invalid",
    "tonemap",
    mode,
    "one of the closed Tonemap values",
    "select a supported Camera tonemap mode"
  );
}
var ANTIALIAS_NONE = 0;
var ANTIALIAS_FXAA = 1;
var ANTIALIAS_MSAA = 2;
var ANTIALIAS_TAA = 3;
var ANTIALIAS_SMAA = 4;
function antialiasFromF32(value) {
  if (value === ANTIALIAS_NONE) return "none";
  if (value === ANTIALIAS_FXAA) return "fxaa";
  if (value === ANTIALIAS_MSAA) return "msaa";
  if (value === ANTIALIAS_TAA) return "taa";
  if (value === ANTIALIAS_SMAA) return "smaa";
  throw cameraError(
    "camera-antialias-invalid",
    "antialias",
    value,
    `${ANTIALIAS_NONE}, ${ANTIALIAS_FXAA}, ${ANTIALIAS_MSAA}, ${ANTIALIAS_TAA}, or ${ANTIALIAS_SMAA}`,
    "select a supported Camera antialias mode"
  );
}
var TRANSPARENCY_SORTED = 0;
var TRANSPARENCY_WEIGHTED_BLENDED = 1;
function transparencyFromF32(value) {
  if (value === TRANSPARENCY_SORTED) return "sorted";
  if (value === TRANSPARENCY_WEIGHTED_BLENDED) return "weighted-blended";
  throw cameraError(
    "camera-transparency-invalid",
    "transparency",
    value,
    `${TRANSPARENCY_SORTED} or ${TRANSPARENCY_WEIGHTED_BLENDED}`,
    "select Camera transparency TRANSPARENCY_SORTED or TRANSPARENCY_WEIGHTED_BLENDED"
  );
}
var BLOOM_DISABLED = 0;
var BLOOM_ENABLED = 1;
var CAMERA_BLOOM_INTENSITY_MIN = 0;
var CAMERA_BLOOM_INTENSITY_MAX = 8;
var CAMERA_BLOOM_THRESHOLD_MIN = 0;
var CAMERA_BLOOM_THRESHOLD_MAX = 65504;
var CAMERA_BLOOM_SMOOTH_WIDTH_MIN = 0;
var CAMERA_BLOOM_SMOOTH_WIDTH_MAX = 1;
var CAMERA_BLOOM_RADIUS_MIN = 0;
var CAMERA_BLOOM_RADIUS_MAX = 1;
function bloomEnabledFromF32(value) {
  if (value === BLOOM_DISABLED) return "off";
  if (value === BLOOM_ENABLED) return "on";
  throw cameraError(
    "camera-bloom-invalid",
    "bloom",
    value,
    `${BLOOM_DISABLED} or ${BLOOM_ENABLED}`,
    "select Camera bloom off or on"
  );
}
function validateBloomRange(field, value, min, max) {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw cameraError(
      "camera-bloom-invalid",
      field,
      value,
      `a finite value in [${min}, ${max}]`,
      `set Camera.${field} to a finite value in [${min}, ${max}]`
    );
  }
}
function validateCameraBloom(bloom, threshold, intensity, smoothWidth, radius) {
  const enabled = bloomEnabledFromF32(bloom);
  validateBloomRange(
    "bloomThreshold",
    threshold,
    CAMERA_BLOOM_THRESHOLD_MIN,
    CAMERA_BLOOM_THRESHOLD_MAX
  );
  validateBloomRange(
    "bloomIntensity",
    intensity,
    CAMERA_BLOOM_INTENSITY_MIN,
    CAMERA_BLOOM_INTENSITY_MAX
  );
  validateBloomRange(
    "bloomSmoothWidth",
    smoothWidth,
    CAMERA_BLOOM_SMOOTH_WIDTH_MIN,
    CAMERA_BLOOM_SMOOTH_WIDTH_MAX
  );
  validateBloomRange("bloomRadius", radius, CAMERA_BLOOM_RADIUS_MIN, CAMERA_BLOOM_RADIUS_MAX);
  return enabled;
}
var Camera = defineComponent11("Camera", {
  fov: { type: "f32" },
  aspect: { type: "f32" },
  near: { type: "f32", default: 0.1 },
  far: { type: "f32", default: 2e3 },
  projection: { type: "f32", default: 0 },
  /** Additive NDC offset: +X moves the image right, +Y moves it up. */
  projectionOffset: { type: "array<f32, 2>", default: new Float32Array([0, 0]) },
  left: { type: "f32", default: -1 },
  right: { type: "f32", default: 1 },
  bottom: { type: "f32", default: -1 },
  top: { type: "f32", default: 1 },
  tonemap: { type: "f32", default: 0 },
  exposure: { type: "f32", default: 1 },
  exposureMode: { type: "f32", default: CAMERA_EXPOSURE_MODE_MANUAL },
  compensationEv: { type: "f32", default: 0 },
  rangeEv: { type: "array<f32, 2>", default: new Float32Array([-8, 8]) },
  rates: { type: "array<f32, 2>", default: new Float32Array([3, 1]) },
  whitePoint: { type: "f32", default: 4 },
  temperature: { type: "f32", default: 6504 },
  tint: { type: "f32", default: 0 },
  colorLut: { type: "asset<texture>", default: 0 },
  colorLutStrength: { type: "f32", default: 1 },
  antialias: { type: "f32", default: 0 },
  transparency: { type: "f32", default: TRANSPARENCY_SORTED },
  historyVersion: { type: "u32", default: 0 },
  bloom: { type: "f32", default: 0 },
  bloomThreshold: { type: "f32", default: 0 },
  bloomIntensity: { type: "f32", default: 1 },
  bloomSmoothWidth: { type: "f32", default: 0.01 },
  bloomRadius: { type: "f32", default: 0 },
  // M1 target camera role: zero means this camera is eligible for display;
  // non-zero shared targets are auxiliary producers whose views and receipt
  // promotion remain owned by Renderer.
  target: { type: "shared<RenderTarget>", simulationTransient: true },
  // Layer of `target` this camera writes: cube face, `2d-array` layer, or
  // `3d` depth slice (Three.js reuses activeCubeFace the same way). Zero for
  // a 2D target; writers of one target must name distinct layers.
  targetLayer: { type: "u32", default: 0 },
  // feat-20260709 M3 / D-3: clear-color is one inline `array<f32,4>` column.
  // The earlier 4-scalar form (clearR/G/B/A) was chosen when this was believed
  // to be the only SoA-safe shape; the Transform (pos/quat/scale) and light
  // (direction/color) precedents disprove that -- an `array<f32,N>` IS an
  // inline stride-N SoA column, read on the hot path as `col[i*N+a]` with zero
  // allocation, so collapsing four scalars into one column removes three field
  // names a reader must track without changing the storage layout or read
  // pattern. The default `[0, 0, 0, 0]` is transparent black; explicit alpha
  // stays visible through the same public array field.
  clearColor: { type: "array<f32, 4>", default: new Float32Array([0, 0, 0, 0]) },
  // feat-20260617-host-engine-contract-and-video-cutscene / M3 / D-4: the
  // aspect-sync sidecar on the createApp(canvas) path writes
  // canvas.width / canvas.height into `aspect` every frame when this flag is
  // true. Reuses the existing `bool` column tier (AnimationPlayer.paused /
  // AudioSource.playing precedent) -- zero ECS infrastructure change. Default
  // true so demos that never touch aspect track the canvas automatically
  // (charter P1 default-is-correct); set false for render-to-texture /
  // split-screen cameras that drive aspect themselves. Read it via
  // world.get (readRow narrows bool -> JS boolean); the query-bundle path
  // returns a raw 0/1 number (the `!== 0` always-true trap).
  autoAspect: { type: "bool", default: true }
});
function validateCameraProjectionOffset(value) {
  if (value.length !== 2 || ![value[0], value[1]].every((v) => Number.isFinite(Math.fround(v ?? NaN))))
    throw cameraError(
      "camera-projection-invalid",
      "projectionOffset",
      value,
      "two finite Float32 NDC offsets",
      "use [0, 0] for a centered lens or finite X/Y offsets for an off-axis lens"
    );
  return [value[0], value[1]];
}
function cameraExposureFromColumns(input) {
  if (input.exposureMode === CAMERA_EXPOSURE_MODE_MANUAL) {
    return validateCameraExposure({ kind: "manual", multiplier: input.exposure });
  }
  if (input.exposureMode === CAMERA_EXPOSURE_MODE_AUTO) {
    return validateCameraExposure({
      kind: "auto",
      fallback: input.exposure,
      compensationEv: input.compensationEv,
      rangeEv: [input.rangeEv[0] ?? -8, input.rangeEv[1] ?? 8],
      rates: [input.rates[0] ?? 3, input.rates[1] ?? 1]
    });
  }
  throw cameraError(
    "camera-exposure-mode-invalid",
    "exposureMode",
    input.exposureMode,
    `${CAMERA_EXPOSURE_MODE_MANUAL} or ${CAMERA_EXPOSURE_MODE_AUTO}`,
    "set Camera.exposureMode to the manual or auto encoding"
  );
}
function cameraExposureColumns(exposure) {
  const checked = validateCameraExposure(exposure);
  if (checked.kind === "manual") {
    return {
      exposureMode: CAMERA_EXPOSURE_MODE_MANUAL,
      exposure: checked.multiplier,
      compensationEv: 0,
      rangeEv: new Float32Array([-8, 8]),
      rates: new Float32Array([3, 1])
    };
  }
  return {
    exposureMode: CAMERA_EXPOSURE_MODE_AUTO,
    exposure: checked.fallback,
    compensationEv: checked.compensationEv,
    rangeEv: new Float32Array(checked.rangeEv),
    rates: new Float32Array(checked.rates)
  };
}
function cameraColorGradingColumns(opts) {
  const exposure = opts.exposure ?? { kind: "manual", multiplier: 1 };
  const temperature = opts.temperature ?? 6504;
  const tint = opts.tint ?? 0;
  const colorLutStrength = opts.colorLutStrength ?? Camera.fields.colorLutStrength.default;
  validateCameraColorGrading(temperature, tint, colorLutStrength);
  return {
    ...cameraExposureColumns(exposure),
    temperature,
    tint,
    colorLut: opts.colorLut ?? 0,
    colorLutStrength
  };
}
function cameraPodFromDefaults() {
  const base = {};
  for (const [key, field] of Object.entries(Camera.fields)) {
    if ("default" in field && field.default !== void 0) {
      base[key] = field.default;
    }
  }
  return base;
}
function perspective(opts) {
  return {
    // cameraPodFromDefaults() reads autoAspect's schema default (true), so an
    // omitted opts.autoAspect lands the default-correct value; an explicit
    // false overrides it below (D-4: factory one-step opt-out, charter P1).
    ...cameraPodFromDefaults(),
    fov: opts.fov,
    aspect: opts.aspect,
    ...opts.near === void 0 ? {} : { near: opts.near },
    ...opts.far === void 0 ? {} : { far: opts.far },
    projection: CAMERA_PROJECTION_PERSPECTIVE,
    ...opts.autoAspect !== void 0 ? { autoAspect: opts.autoAspect } : {},
    ...opts.projectionOffset === void 0 ? {} : {
      projectionOffset: new Float32Array(validateCameraProjectionOffset(opts.projectionOffset))
    },
    ...cameraColorGradingColumns(opts)
  };
}
function orthographic(opts) {
  return {
    ...cameraPodFromDefaults(),
    fov: 0,
    aspect: 1,
    ...opts.near === void 0 ? {} : { near: opts.near },
    ...opts.far === void 0 ? {} : { far: opts.far },
    projection: CAMERA_PROJECTION_ORTHOGRAPHIC,
    left: opts.left,
    right: opts.right,
    bottom: opts.bottom,
    top: opts.top,
    ...opts.projectionOffset === void 0 ? {} : {
      projectionOffset: new Float32Array(validateCameraProjectionOffset(opts.projectionOffset))
    },
    ...cameraColorGradingColumns(opts)
  };
}

// sdk/engine/node_modules/@forgeax/engine-render/src/components/capsule-shadow.ts
import { defineComponent as defineComponent12 } from "@forgeax/engine-ecs";
var CapsuleShadow = defineComponent12("CapsuleShadow", {});

// sdk/engine/node_modules/@forgeax/engine-render/src/components/cloud-layer.ts
import { defineComponent as defineComponent13 } from "@forgeax/engine-ecs";
var CloudQualityValue = Object.freeze({
  low: 0,
  medium: 1,
  high: 2
});
var CloudLayer = defineComponent13("CloudLayer", {
  /** Stable integer seed for the periodic 3D density field. */
  seed: { type: "u32", default: 1337 },
  /** World-space lower edge of the layer, in metres. */
  baseHeight: { type: "f32", default: 120 },
  /** World-space thickness of the layer, in metres. */
  thickness: { type: "f32", default: 80 },
  /** Horizontal noise scale, in cycles per metre. */
  scale: { type: "f32", default: 4e-3 },
  /** Coverage threshold in [0, 1]. */
  coverage: { type: "f32", default: 0.48 },
  /** Extinction multiplier in inverse metres. */
  density: { type: "f32", default: 1 },
  /** World-space wind velocity in metres per second. */
  wind: { type: "array<f32, 3>", default: new Float32Array([8, 0, 2]) },
  /** Quality controls cache resolution and bounded ray steps. */
  quality: { type: "f32", default: CloudQualityValue.medium },
  /** Maximum world-space distance represented by the light-space shadow map. */
  shadowRange: { type: "f32", default: 512 }
});
function cloudQualityFromF32(value) {
  if (value === CloudQualityValue.low) return "low";
  if (value === CloudQualityValue.medium) return "medium";
  if (value === CloudQualityValue.high) return "high";
  return void 0;
}

// sdk/engine/node_modules/@forgeax/engine-render/src/components/depth-of-field.ts
import { defineComponent as defineComponent14 } from "@forgeax/engine-ecs";
var DepthOfFieldQualityValue = Object.freeze({
  low: 0,
  medium: 1,
  high: 2
});
var DepthOfFieldSideValue = Object.freeze({
  both: 0,
  near: 1,
  far: 2
});
var DepthOfField = defineComponent14("DepthOfField", {
  focusDistance: { type: "f32", default: 8 },
  fStop: { type: "f32", default: 2.8 },
  sensorHeight: { type: "f32", default: 0.024 },
  maxRadiusPixels: { type: "f32", default: 16 },
  quality: { type: "f32", default: DepthOfFieldQualityValue.medium },
  blurSide: { type: "f32", default: DepthOfFieldSideValue.both }
});
function depthOfFieldQualityFromF32(value) {
  if (value === DepthOfFieldQualityValue.low) return "low";
  if (value === DepthOfFieldQualityValue.medium) return "medium";
  if (value === DepthOfFieldQualityValue.high) return "high";
  return void 0;
}
function depthOfFieldSideFromF32(value) {
  if (value === DepthOfFieldSideValue.both) return "both";
  if (value === DepthOfFieldSideValue.near) return "near";
  if (value === DepthOfFieldSideValue.far) return "far";
  return void 0;
}

// sdk/engine/node_modules/@forgeax/engine-render/src/components/directional-shadow-filter.ts
var DirectionalShadowFilterValue = Object.freeze({
  pcf1: 1,
  pcf3: 2,
  pcf5: 3,
  pcssMedium: 4,
  pcssHigh: 5,
  pcfVogel: 6,
  pcfSoft: 7,
  variance: 8
});
function directionalShadowQualityFromF32(value, angularRadiusRadians, maxPenumbraTexels) {
  switch (value) {
    case DirectionalShadowFilterValue.variance:
      return { kind: "variance" };
    case DirectionalShadowFilterValue.pcfSoft:
      return { kind: "pcf-soft" };
    case DirectionalShadowFilterValue.pcfVogel:
      return { kind: "pcf-vogel" };
    case DirectionalShadowFilterValue.pcf1:
      return { kind: "pcf", kernel: 1 };
    case DirectionalShadowFilterValue.pcf3:
      return { kind: "pcf", kernel: 3 };
    case DirectionalShadowFilterValue.pcf5:
      return { kind: "pcf", kernel: 5 };
    case DirectionalShadowFilterValue.pcssMedium:
      return {
        kind: "pcss",
        preset: "medium",
        angularRadiusRadians,
        maxPenumbraTexels
      };
    case DirectionalShadowFilterValue.pcssHigh:
      return {
        kind: "pcss",
        preset: "high",
        angularRadiusRadians,
        maxPenumbraTexels
      };
    default:
      return void 0;
  }
}
var SHADOW_RASTER_GUARD_TEXELS = 2;
function directionalShadowFilterRadiusTexels(quality) {
  switch (quality.kind) {
    case "variance":
      return 1;
    case "pcf-vogel":
      return 1;
    case "pcf-soft":
      return 2;
    case "pcf":
      return (quality.kernel - 1) / 2;
    case "pcss":
      return Math.max(quality.preset === "medium" ? 2 : 3, quality.maxPenumbraTexels);
  }
}

// sdk/engine/node_modules/@forgeax/engine-render/src/errors/ecs-validation.ts
import {
  ResourceInvalidValueError,
  SpawnLightInvalidBoundsError,
  SpriteInstancesCountMismatchError,
  SpriteInstancesMutuallyExclusiveWithInstancesError,
  SpriteInstancesRequiresSpriteShaderError
} from "@forgeax/engine-ecs/projection";

// sdk/engine/node_modules/@forgeax/engine-render/src/components/lighting-channels.ts
var LIGHTING_CHANNELS_DEFAULT = 4294967295;
function validateChannelMask(value, field = "lightingChannels") {
  if (Number.isInteger(value) && value >= 0 && value <= LIGHTING_CHANNELS_DEFAULT) return null;
  return new ResourceInvalidValueError(
    `${field} is an integer in [0, 0xffffffff]`,
    "assign an unsigned 32-bit mask; use 0x80000000 for bit 31, not the signed result of 1 << 31",
    { receivedKey: field, receivedMode: value }
  );
}

// sdk/engine/node_modules/@forgeax/engine-render/src/components/directional-light.ts
import { defineComponent as defineComponent15 } from "@forgeax/engine-ecs";
var DirectionalLight = defineComponent15("DirectionalLight", {
  // f64 preserves invalid author inputs until render validation (no u32 wrapping).
  lightingChannels: { type: "f64", default: LIGHTING_CHANNELS_DEFAULT },
  // direction is the ONLY field with no default (D-5): omitting it lands the
  // array layer-3 all-zero [0,0,0], which the renderer owner rejects -- there is no
  // universal default direction, so "default is illegal" forces an explicit
  // non-zero value. color carries an explicit layer-2 default [1,1,1] (white);
  // the array layer-3 fallback is all-zero, so the default MUST be explicit.
  direction: { type: "array<f32, 3>" },
  color: { type: "array<f32, 3>", default: new Float32Array([1, 1, 1]) },
  intensity: { type: "f32", default: 1 },
  // Shadow opt-in gate; the game template enables its sun explicitly.
  castShadow: { type: "bool", default: false },
  // 9 shadow fields migrated from DirectionalLightShadow (feat-20260621 M1).
  cascadeCount: { type: "f32", default: 3 },
  splitLambda: { type: "f32", default: 0.5 },
  cascadeBlend: { type: "f32", default: 0.2 },
  shadowMapAspect: { type: "f32", default: 1 },
  shadowCasterChannels: { type: "f64", default: 4294967295 },
  shadowAutoUpdate: { type: "bool", default: true },
  shadowRevision: { type: "f64", default: 0 },
  mapSize: { type: "f32", default: 2048 },
  depthBias: { type: "f32", default: 1e-5 },
  normalBias: { type: "f32", default: 0.05 },
  // Sole shadow coverage knob (feat replaces nearPlane/farPlane). The PSSM
  // near end derives from the active camera near; shadowDistance is the far
  // cap. The effective distance is min(camera far, shadowDistance), matching
  // Three.js CSM maxFar. The default cap preserves nearby detail independently
  // of the display camera's longer visibility range.
  shadowDistance: { type: "f32", default: 200 },
  shadowFilter: {
    type: "enum",
    default: DirectionalShadowFilterValue.pcfVogel,
    labels: DirectionalShadowFilterValue
  },
  shadowAngularRadius: { type: "f32", default: 465e-5 },
  maxPenumbraTexels: { type: "f32", default: 32 },
  // Camera-fitted cascades remain the native default. An explicit reverse-Z
  // world-to-clip matrix provides an independent authored shadow camera.
  shadowProjection: { type: "enum", labels: { cascaded: 0, matrix: 1 }, default: 0 },
  shadowViewProjection: { type: "array<f32, 16>" },
  shadowBiasMode: { type: "enum", labels: { receiverPlane: 0, constant: 1 }, default: 0 },
  shadowRadius: { type: "f32", default: 1 },
  shadowIntensity: { type: "f32", default: 1 },
  shadowBlurSamples: { type: "f32", default: 8 },
  staggerCascades: { type: "bool", default: false },
  // Retained static cascade layer for GPU-driven casters (see doc above).
  staticShadowCache: { type: "bool", default: true },
  contactShadowLength: { type: "f32", default: 0 }
});

// sdk/engine/node_modules/@forgeax/engine-render/src/components/dynamic-resolution.ts
import { defineComponent as defineComponent16 } from "@forgeax/engine-ecs";
import { err as err7, ok as ok7 } from "@forgeax/engine-types";
var DynamicResolution = defineComponent16("DynamicResolution", {
  targetGpuMs: { type: "f32", default: 16.67 },
  minScale: { type: "f32", default: 0.67 },
  maxScale: { type: "f32", default: 1 }
});
var DEFAULT_DYNAMIC_RESOLUTION = Object.freeze({
  targetGpuMs: 16.67,
  minScale: 0.67,
  maxScale: 1
});
function invalid2(field, value, expected) {
  return new DynamicResolutionInvalidParameterError({ field, value, expected });
}
function validateDynamicResolutionParameters(input) {
  const value = input ?? {};
  const targetGpuMs = value.targetGpuMs ?? DEFAULT_DYNAMIC_RESOLUTION.targetGpuMs;
  const minScale = value.minScale ?? DEFAULT_DYNAMIC_RESOLUTION.minScale;
  const maxScale = value.maxScale ?? DEFAULT_DYNAMIC_RESOLUTION.maxScale;
  if (!Number.isFinite(targetGpuMs) || targetGpuMs <= 0) {
    return err7(invalid2("targetGpuMs", targetGpuMs, "finite and greater than 0"));
  }
  if (!Number.isFinite(minScale) || minScale < 0.5 || minScale > 1) {
    return err7(invalid2("minScale", minScale, "finite and in [0.5, 1.0]"));
  }
  if (!Number.isFinite(maxScale) || maxScale < 0.5 || maxScale > 1) {
    return err7(invalid2("maxScale", maxScale, "finite and in [0.5, 1.0]"));
  }
  if (minScale > maxScale) {
    return err7(invalid2("minScale", minScale, "less than or equal to maxScale"));
  }
  return ok7(Object.freeze({ targetGpuMs, minScale, maxScale }));
}
function validateDynamicResolutionCamera(input, antialias) {
  if (input === void 0) return ok7(void 0);
  const parameters = validateDynamicResolutionParameters(input);
  if (!parameters.ok) return parameters;
  if (antialias !== "taa") {
    return err7(new DynamicResolutionRequiresTaaError({ antialias }));
  }
  return parameters;
}

// sdk/engine/node_modules/@forgeax/engine-render/src/components/fog.ts
import { defineComponent as defineComponent17 } from "@forgeax/engine-ecs";
var Fog = defineComponent17("Fog", {
  color: { type: "array<f32, 3>", default: new Float32Array([0.5, 0.5, 0.5]) },
  density: { type: "f32", default: 0.01 },
  heightFalloff: { type: "f32", default: 0 },
  maxOpacity: { type: "f32", default: 1 }
});

// sdk/engine/node_modules/@forgeax/engine-render/src/components/instances.ts
import { defineComponent as defineComponent18 } from "@forgeax/engine-ecs";
var Instances = defineComponent18("Instances", {
  transforms: { type: "array<f32>" }
});

// sdk/engine/node_modules/@forgeax/engine-render/src/components/layer.ts
import { defineComponent as defineComponent19 } from "@forgeax/engine-ecs";
var Layer = defineComponent19("Layer", {
  value: { type: "i32", default: 0 }
});

// sdk/engine/node_modules/@forgeax/engine-render/src/components/point-light.ts
import { defineComponent as defineComponent20 } from "@forgeax/engine-ecs";
function validatePointLightDecay(value) {
  if (Number.isFinite(value) && value >= 0 && Number.isFinite(Math.fround(value))) return null;
  return new ResourceInvalidValueError(
    "PointLight.decay is a finite non-negative f32",
    "use 2 for inverse-square attenuation or 0 for range-only falloff",
    { receivedKey: "decay", receivedMode: value }
  );
}
var PointLight = defineComponent20("PointLight", {
  // f64 preserves invalid author inputs until render validation (no u32 wrapping).
  lightingChannels: { type: "f64", default: LIGHTING_CHANNELS_DEFAULT },
  // color carries an explicit layer-2 default [1,1,1] (white); the array
  // layer-3 fallback is all-zero, so the default MUST be explicit (D-5).
  color: { type: "array<f32, 3>", default: new Float32Array([1, 1, 1]) },
  intensity: { type: "f32", default: 1 },
  range: { type: "f32", default: Number.POSITIVE_INFINITY },
  /** Distance exponent; zero leaves only the finite-range window. */
  decay: { type: "f64", default: 2 },
  // Transform rotates the full-sphere profile: polar +Z, azimuth +X toward +Y.
  iesProfile: { type: "asset<ies-profile>" }
});

// sdk/engine/node_modules/@forgeax/engine-render/src/components/point-light-shadow.ts
import { defineComponent as defineComponent21 } from "@forgeax/engine-ecs";
var PointLightShadow = defineComponent21("PointLightShadow", {
  shadowProjection: { type: "enum", labels: { light: 0, fixed: 1 }, default: 0 },
  shadowPosition: { type: "array<f32, 3>" },
  shadowCasterChannels: { type: "f64", default: 4294967295 },
  shadowAutoUpdate: { type: "bool", default: true },
  shadowRevision: { type: "f64", default: 0 },
  mapSize: { type: "f32", default: 512 },
  depthBias: { type: "f32", default: 0.08 },
  normalBias: { type: "f32", default: 0.6 },
  nearPlane: { type: "f32", default: 0.5 },
  // Finite positive light.range overrides this fallback, as in Three r184.
  farPlane: { type: "f32", default: 500 },
  pcfKernelSize: { type: "f32", default: 3 },
  shadowFilter: { type: "enum", labels: { basic: 1, pcfVogel: 6 }, default: 6 },
  shadowBiasMode: { type: "enum", labels: { cubeTexel: 0, constant: 1 }, default: 0 },
  shadowIntensity: { type: "f32", default: 1 }
});

// sdk/engine/node_modules/@forgeax/engine-render/src/components/rect-area-light.ts
import { defineComponent as defineComponent22 } from "@forgeax/engine-ecs";
var RectAreaLight = defineComponent22("RectAreaLight", {
  // f64 preserves invalid author inputs until render validation (no u32 wrapping).
  lightingChannels: { type: "f64", default: LIGHTING_CHANNELS_DEFAULT },
  color: { type: "array<f32, 3>", default: new Float32Array([1, 1, 1]) },
  intensity: { type: "f32", default: 1 },
  width: { type: "f32", default: 10 },
  height: { type: "f32", default: 10 },
  range: { type: "f32", default: Number.POSITIVE_INFINITY },
  sourceTexture: { type: "asset<texture>" },
  // Center-direction photometry modulates the existing finite-area LTC light.
  iesProfile: { type: "asset<ies-profile>" }
});

// sdk/engine/node_modules/@forgeax/engine-render/src/components/spot-light.ts
import { defineComponent as defineComponent23 } from "@forgeax/engine-ecs";
var SpotLight = defineComponent23("SpotLight", {
  // f64 preserves invalid author inputs until render validation (no u32 wrapping).
  lightingChannels: { type: "f64", default: LIGHTING_CHANNELS_DEFAULT },
  // direction has no default (D-5): omitting it lands the array layer-3
  // all-zero, which validate() rejects. color carries an explicit layer-2
  // default [1,1,1] (white); the array layer-3 fallback is all-zero.
  direction: { type: "array<f32, 3>" },
  color: { type: "array<f32, 3>", default: new Float32Array([1, 1, 1]) },
  intensity: { type: "f32", default: 1 },
  range: { type: "f32", default: Number.POSITIVE_INFINITY },
  innerConeDeg: { type: "f32", default: 60 },
  outerConeDeg: { type: "f32", default: 60 },
  iesProfile: { type: "asset<ies-profile>" },
  cookie: { type: "asset<texture>" },
  rollDeg: { type: "f32", default: 0 },
  // Shadow opt-in gate: default lights allocate no shadow tile.
  castShadow: { type: "bool", default: false },
  // 7 shadow fields aligned with the shared light shadow vocabulary.
  shadowMapAspect: { type: "f32", default: 1 },
  shadowCasterChannels: { type: "f64", default: 4294967295 },
  shadowAutoUpdate: { type: "bool", default: true },
  shadowRevision: { type: "f64", default: 0 },
  mapSize: { type: "f32", default: 1024 },
  depthBias: { type: "f32", default: 1e-5 },
  normalBias: { type: "f32", default: 0.05 },
  nearPlane: { type: "f32", default: 0.5 },
  // Finite positive light.range overrides this fallback, as in Three r184.
  farPlane: { type: "f32", default: 500 },
  pcfKernelSize: { type: "f32", default: 3 },
  shadowFilter: {
    type: "enum",
    labels: { basic: 1, pcfVogel: 6, pcfSoft: 7, variance: 8 },
    default: 6
  },
  shadowBiasMode: { type: "enum", labels: { facingNormal: 0, constant: 1 }, default: 0 },
  shadowProjection: { type: "enum", labels: { cone: 0, matrix: 1 }, default: 0 },
  shadowViewProjection: { type: "array<f32, 16>" },
  // Three's SpotLight.shadow.intensity is the fraction of visibility applied
  // to a shadowed contribution. Keep it in the author-facing [0,1] domain;
  // extract/record transport this one fact to surface and volume consumers.
  shadowIntensity: { type: "f32", default: 1 },
  shadowBlurSamples: { type: "f32", default: 8 },
  // Shared TextureAsset identity; publication and residency remain owned by
  // the existing asset and GPU resource owners.
  projector: { type: "asset<texture>", simulationTransient: true }
});

// sdk/engine/node_modules/@forgeax/engine-render/src/components/light-helpers.ts
import { err as err8, ok as ok8, R_MIN } from "@forgeax/engine-types";
var RANGE_ZERO_FALLBACK_INV_R2 = 1e8;
var DEG_TO_RAD = Math.PI / 180;
var PCSS_RADIUS_MIN = 1e-4;
var PCSS_RADIUS_MAX = 0.05;
var PCSS_PENUMBRA_MIN = 1;
var PCSS_PENUMBRA_MAX = 64;
function degToCos(deg) {
  return Math.cos(deg * DEG_TO_RAD);
}
function computeInvRangeSquared(range2) {
  if (range2 === Number.POSITIVE_INFINITY) return 0;
  if (range2 === 0) return RANGE_ZERO_FALLBACK_INV_R2;
  return 1 / (range2 * range2);
}
function validateDirection(componentName, direction) {
  const dir = direction;
  if (dir === void 0 || (dir[0] ?? 0) === 0 && (dir[1] ?? 0) === 0 && (dir[2] ?? 0) === 0) {
    return new SpawnLightInvalidBoundsError(
      componentName,
      "direction",
      dir === void 0 ? [0, 0, 0] : [dir[0] ?? 0, dir[1] ?? 0, dir[2] ?? 0]
    );
  }
  return null;
}
function validateDirectedLightData(componentName, data) {
  const directionError = validateDirection(
    componentName,
    data.direction
  );
  if (directionError !== null) return err8(directionError);
  const contactShadowLength = data.contactShadowLength ?? 0;
  if (!Number.isFinite(contactShadowLength) || contactShadowLength < 0) {
    return err8(
      new ShadowInvalidConfigError(
        "contactShadowLength",
        contactShadowLength,
        { kind: "lower-bound", value: 0, operator: ">=" },
        "a finite value >= 0 (0 disables contact shadows)"
      )
    );
  }
  return ok8(void 0);
}
function validateShadowPolicy(data, kind) {
  for (const field of ["shadowProjection", "shadowBiasMode"]) {
    const value = data[field] ?? 0;
    if (value !== 0 && value !== 1)
      return err8(
        new ShadowInvalidConfigError(field, value, { kind: "allowed-values", values: [0, 1] })
      );
  }
  for (const [field, fallback, min, max] of [
    ["shadowRadius", 1, 0, 34028234663852886e22],
    ["shadowIntensity", 1, 0, 1],
    ["shadowMapAspect", 1, Number.MIN_VALUE, 34028234663852886e22],
    ["shadowRevision", 0, 0, Number.MAX_SAFE_INTEGER],
    ["shadowBlurSamples", 8, 1, 64]
  ]) {
    const value = data[field] ?? fallback;
    if (!Number.isFinite(value) || value < min || value > max || (field === "shadowRevision" || field === "shadowBlurSamples") && !Number.isSafeInteger(value))
      return err8(new ShadowInvalidConfigError(field, value, { kind: "range", min, max }));
  }
  if (kind !== "directional") {
    const values = kind === "point" ? [1, 6] : [1, 6, 7, 8];
    const filter = data.shadowFilter ?? 6;
    if (!values.includes(filter))
      return err8(
        new ShadowInvalidConfigError("shadowFilter", filter, { kind: "allowed-values", values })
      );
  }
  if (data.shadowProjection !== 1) return ok8(void 0);
  if (kind === "point") {
    const position = data.shadowPosition;
    if (position?.length !== 3 || !Array.from(position).every((value) => Number.isFinite(Math.fround(value))))
      return err8(
        new ShadowInvalidConfigError(
          "shadowPosition",
          0,
          { kind: "range", min: -34028234663852886e22, max: 34028234663852886e22 },
          "three finite world-space coordinates"
        )
      );
    return ok8(void 0);
  }
  const matrix = data.shadowViewProjection;
  if (matrix?.length !== 16 || !Array.from(matrix).every((value) => Number.isFinite(Math.fround(value))))
    return err8(
      new ShadowInvalidConfigError(
        "shadowViewProjection",
        0,
        { kind: "lower-bound", operator: ">", value: 0 },
        "a finite nonsingular reverse-Z world-to-clip matrix"
      )
    );
  const rows = Float64Array.from(
    { length: 16 },
    (_, i) => matrix[i % 4 * 4 + Math.floor(i / 4)]
  );
  let valid = true;
  for (let col = 0; col < 4; col++) {
    const target = col * 4;
    let pivot = target;
    for (let row = col + 1; row < 4; row++) {
      const candidate2 = row * 4;
      if (Math.abs(rows[candidate2 + col]) > Math.abs(rows[pivot + col]))
        pivot = candidate2;
    }
    if (rows[pivot + col] === 0) {
      valid = false;
      break;
    }
    for (let lane = col; lane < 4; lane++)
      [rows[pivot + lane], rows[target + lane]] = [
        rows[target + lane],
        rows[pivot + lane]
      ];
    for (let row = col + 1; row < 4; row++) {
      const offset = row * 4;
      const factor = rows[offset + col] / rows[target + col];
      for (let lane = col + 1; lane < 4; lane++)
        rows[offset + lane] = rows[offset + lane] - factor * rows[target + lane];
    }
  }
  if (!valid || kind === "directional" && ([3, 7, 11].some((index) => matrix[index] !== 0) || matrix[15] !== 1))
    return err8(
      new ShadowInvalidConfigError(
        "shadowViewProjection",
        0,
        { kind: "lower-bound", operator: ">", value: 0 },
        kind === "directional" ? "a nonsingular orthographic reverse-Z matrix" : "a nonsingular reverse-Z matrix"
      )
    );
  return ok8(void 0);
}
function validateDirectionalLightData(data) {
  const directed = validateDirectedLightData("DirectionalLight", data);
  if (!directed.ok) return directed;
  if (data.castShadow !== true) return ok8(void 0);
  const mapSize = data.mapSize ?? DirectionalLight.fields.mapSize.default;
  if (!Number.isInteger(mapSize) || mapSize < 1) {
    return err8(
      new ShadowInvalidConfigError("mapSize", mapSize, {
        kind: "lower-bound",
        value: 1,
        operator: ">="
      })
    );
  }
  const policy = validateShadowPolicy(data, "directional");
  if (!policy.ok) return policy;
  const cascadeCount = data.cascadeCount ?? DirectionalLight.fields.cascadeCount.default;
  if (cascadeCount < 1 || cascadeCount > 4 || !Number.isInteger(cascadeCount)) {
    return err8(
      new ShadowInvalidConfigError("cascadeCount", cascadeCount, { kind: "range", min: 1, max: 4 })
    );
  }
  const splitLambda = data.splitLambda ?? DirectionalLight.fields.splitLambda.default;
  if (splitLambda < 0 || splitLambda > 1) {
    return err8(
      new ShadowInvalidConfigError("splitLambda", splitLambda, { kind: "range", min: 0, max: 1 })
    );
  }
  const cascadeBlend = data.cascadeBlend ?? 0.2;
  if (cascadeBlend < 0 || cascadeBlend > 0.5) {
    return err8(
      new ShadowInvalidConfigError("cascadeBlend", cascadeBlend, {
        kind: "range",
        min: 0,
        max: 0.5
      })
    );
  }
  const shadowDistance = data.shadowDistance ?? DirectionalLight.fields.shadowDistance.default;
  if (shadowDistance <= 0) {
    return err8(
      new ShadowInvalidConfigError("shadowDistance", shadowDistance, {
        kind: "lower-bound",
        value: 0,
        operator: ">"
      })
    );
  }
  const shadowFilter = data.shadowFilter ?? DirectionalLight.fields.shadowFilter.default;
  const allowedFilters = Object.values(DirectionalShadowFilterValue);
  if (!Number.isFinite(shadowFilter) || !allowedFilters.includes(shadowFilter)) {
    return err8(
      new ShadowInvalidConfigError(
        "shadowFilter",
        shadowFilter,
        { kind: "allowed-values", values: allowedFilters },
        "one of [pcf1, pcf3, pcf5, pcssMedium, pcssHigh, pcfVogel, pcfSoft, variance]"
      )
    );
  }
  if (shadowFilter === DirectionalShadowFilterValue.pcssMedium || shadowFilter === DirectionalShadowFilterValue.pcssHigh) {
    const shadowAngularRadius = data.shadowAngularRadius ?? 465e-5;
    if (!Number.isFinite(shadowAngularRadius)) {
      return err8(
        new ShadowInvalidConfigError("shadowAngularRadius", shadowAngularRadius, {
          kind: "range",
          min: PCSS_RADIUS_MIN,
          max: PCSS_RADIUS_MAX
        })
      );
    }
    if (shadowAngularRadius < Math.fround(PCSS_RADIUS_MIN) || shadowAngularRadius > Math.fround(PCSS_RADIUS_MAX)) {
      return err8(
        new ShadowInvalidConfigError("shadowAngularRadius", shadowAngularRadius, {
          kind: "range",
          min: PCSS_RADIUS_MIN,
          max: PCSS_RADIUS_MAX
        })
      );
    }
    const maxPenumbraTexels = data.maxPenumbraTexels ?? 32;
    if (!Number.isFinite(maxPenumbraTexels) || !Number.isInteger(maxPenumbraTexels) || maxPenumbraTexels < PCSS_PENUMBRA_MIN || maxPenumbraTexels > PCSS_PENUMBRA_MAX) {
      return err8(
        new ShadowInvalidConfigError(
          "maxPenumbraTexels",
          maxPenumbraTexels,
          { kind: "range", min: PCSS_PENUMBRA_MIN, max: PCSS_PENUMBRA_MAX },
          "a finite integer in [1, 64]"
        )
      );
    }
  }
  return ok8(void 0);
}
function resolvePunctualShadowFarPlane(range2, nearPlane, fallback) {
  if (!Number.isFinite(nearPlane) || nearPlane <= 0)
    return err8(
      new ShadowInvalidConfigError(
        "nearPlane",
        nearPlane,
        { kind: "lower-bound", value: 0, operator: ">" },
        "a finite value > 0"
      )
    );
  const farPlane = Number.isFinite(range2) && range2 > 0 ? range2 : fallback;
  if (!Number.isFinite(farPlane) || farPlane <= nearPlane)
    return err8(
      new ShadowInvalidConfigError(
        "farPlane",
        farPlane,
        { kind: "lower-bound", value: nearPlane, operator: ">" },
        "a finite far plane beyond nearPlane; reduce nearPlane for short-range lights"
      )
    );
  return ok8(farPlane);
}
function validatePunctualShadowData(data, component, range2) {
  const policy = validateShadowPolicy(data, component === PointLightShadow ? "point" : "spot");
  if (!policy.ok) return policy;
  const mapSize = data.mapSize ?? component.fields.mapSize.default;
  if (!Number.isInteger(mapSize) || mapSize < 1)
    return err8(
      new ShadowInvalidConfigError("mapSize", mapSize, {
        kind: "lower-bound",
        value: 1,
        operator: ">="
      })
    );
  const nearPlane = data.nearPlane ?? component.fields.nearPlane.default;
  const farPlane = data.farPlane ?? component.fields.farPlane.default;
  const projection = resolvePunctualShadowFarPlane(range2, nearPlane, farPlane);
  if (!projection.ok) return projection;
  const pcfKernelSize = data.pcfKernelSize ?? 3;
  if (!Number.isFinite(pcfKernelSize) || pcfKernelSize < 1) {
    return err8(
      new ShadowInvalidConfigError(
        "pcfKernelSize",
        pcfKernelSize,
        { kind: "lower-bound", operator: ">=", value: 1 },
        "a finite footprint diameter >= 1"
      )
    );
  }
  return ok8(void 0);
}
function validateSpotLightData(data) {
  const directed = validateDirectedLightData("SpotLight", data);
  if (!directed.ok) return directed;
  const range2 = data.range ?? SpotLight.fields.range.default;
  if (typeof range2 !== "number" || Number.isNaN(range2) || range2 < 0) {
    return err8(new SpawnLightInvalidBoundsError("SpotLight", "range", range2));
  }
  const innerConeDeg = data.innerConeDeg ?? SpotLight.fields.innerConeDeg.default;
  const outerConeDeg = data.outerConeDeg ?? SpotLight.fields.outerConeDeg.default;
  if (!Number.isFinite(outerConeDeg) || outerConeDeg <= 0 || outerConeDeg > 90) {
    return err8(new SpawnLightInvalidBoundsError("SpotLight", "outerNinety", outerConeDeg));
  }
  if (!Number.isFinite(innerConeDeg) || innerConeDeg < 0 || outerConeDeg < innerConeDeg) {
    return err8(new SpawnLightInvalidBoundsError("SpotLight", "innerOuter", outerConeDeg));
  }
  if (data.castShadow !== true) return ok8(void 0);
  const shadow = validatePunctualShadowData(data, SpotLight, range2);
  if (!shadow.ok) return shadow;
  return ok8(void 0);
}
function validatePointLightData(data) {
  const range2 = data.range ?? PointLight.fields.range.default;
  if (typeof range2 !== "number" || Number.isNaN(range2) || range2 < 0) {
    return err8(new SpawnLightInvalidBoundsError("PointLight", "range", range2));
  }
  return ok8(void 0);
}
function validatePointLightShadowData(data) {
  return validatePunctualShadowData(data, PointLightShadow, Infinity);
}
function validateRectAreaLightData(data) {
  const intensity = data.intensity ?? 1;
  if (typeof intensity !== "number" || !Number.isFinite(intensity) || intensity < 0) {
    return err8(new SpawnLightInvalidBoundsError("RectAreaLight", "intensity", intensity));
  }
  const color = data.color ?? [1, 1, 1];
  if (color.length !== 3 || Array.from(color).some(
    (value) => typeof value !== "number" || !Number.isFinite(value) || value < 0
  )) {
    return err8(new SpawnLightInvalidBoundsError("RectAreaLight", "color", Array.from(color)));
  }
  for (const field of ["width", "height", "range"]) {
    const value = data[field] ?? RectAreaLight.fields[field].default;
    if (typeof value !== "number" || Number.isNaN(value) || value <= 0 || field !== "range" && !Number.isFinite(value)) {
      return err8(new SpawnLightInvalidBoundsError("RectAreaLight", field, value));
    }
  }
  return ok8(void 0);
}
function validateLightProbeData(data) {
  const irradiance = data.irradiance;
  if (irradiance === void 0 || irradiance.length !== 27 || Array.from(irradiance).some((value) => typeof value !== "number" || !Number.isFinite(value))) {
    return err8(
      new SpawnLightInvalidBoundsError(
        "LightProbe",
        "irradiance",
        irradiance === void 0 ? [] : Array.from(irradiance)
      )
    );
  }
  const radius = data.radius ?? R_MIN;
  if (typeof radius !== "number" || !Number.isFinite(radius) || radius < R_MIN) {
    return err8(new SpawnLightInvalidBoundsError("LightProbe", "radius", radius));
  }
  return ok8(void 0);
}

// sdk/engine/node_modules/@forgeax/engine-render/src/components/light-probe.ts
import { defineComponent as defineComponent24 } from "@forgeax/engine-ecs";
import { R_MIN as R_MIN2 } from "@forgeax/engine-types";
var LightProbe = defineComponent24("LightProbe", {
  irradiance: { type: "array<f32, 27>" },
  radius: { type: "f32", default: R_MIN2 }
});

// sdk/engine/node_modules/@forgeax/engine-render/src/components/lines.ts
import { defineComponent as defineComponent25 } from "@forgeax/engine-ecs";
var LineWidthUnitsValue = Object.freeze({
  pixels: 0,
  world: 1
});
var LineCapValue = Object.freeze({
  butt: 0,
  round: 1
});
function lineWidthUnitsFromU32(value) {
  switch (value) {
    case LineWidthUnitsValue.pixels:
      return "pixels";
    case LineWidthUnitsValue.world:
      return "world";
    default:
      return void 0;
  }
}
function lineCapFromU32(value) {
  switch (value) {
    case LineCapValue.butt:
      return "butt";
    case LineCapValue.round:
      return "round";
    default:
      return void 0;
  }
}
var Lines = defineComponent25(
  "Lines",
  {
    width: { type: "f32", default: 1 },
    widthUnits: { type: "enum", default: LineWidthUnitsValue.pixels, labels: LineWidthUnitsValue },
    cap: { type: "enum", default: LineCapValue.butt, labels: LineCapValue },
    dashSize: { type: "f32", default: 1 },
    gapSize: { type: "f32", default: 0 },
    dashOffset: { type: "f32", default: 0 }
  },
  {
    meta: {
      quickStart: "Attach Lines to line-list or line-strip meshes; widthUnits 'world' keeps a world-space width, cap 'round' rounds ends and joins, gapSize > 0 enables dashes.",
      diagnostics: "Inspect width, widthUnits, cap, dashSize, gapSize and dashOffset at points-lines admission.",
      recovery: "Use finite width > 0, a known widthUnits/cap label, dashSize > 0, gapSize >= 0 and finite dashOffset.",
      boundaries: "Lines owns width, cap and dash style; MeshFilter and MeshRenderer own geometry and material."
    }
  }
);

// sdk/engine/node_modules/@forgeax/engine-render/src/components/mesh-filter.ts
import { defineComponent as defineComponent26 } from "@forgeax/engine-ecs";
var MeshFilter = defineComponent26("MeshFilter", {
  assetHandle: { type: "asset<mesh>" }
});

// sdk/engine/node_modules/@forgeax/engine-render/src/components/mesh-renderer.ts
import { defineComponent as defineComponent27 } from "@forgeax/engine-ecs";
var MeshRenderer = defineComponent27("MeshRenderer", {
  lightingChannels: { type: "f64", default: LIGHTING_CHANNELS_DEFAULT },
  materials: { type: "array<asset<material>>", default: [] },
  // Current-joint conservative envelopes trade tighter culling for less CPU work.
  conservativeSkinBounds: { type: "bool", default: false },
  // An explicit request prepares this view's pipelines even while the mesh is hidden.
  preparePipelines: { type: "bool", default: false }
});

// sdk/engine/node_modules/@forgeax/engine-render/src/components/motion-blur.ts
import { defineComponent as defineComponent28 } from "@forgeax/engine-ecs";
var MotionBlur = defineComponent28("MotionBlur", {
  shutterAngle: { type: "f32", default: 180 },
  maxRadiusPixels: { type: "f32", default: 32 },
  sampleCount: { type: "f32", default: 8 },
  targetFps: { type: "f32", default: 60 }
});

// sdk/engine/node_modules/@forgeax/engine-render/src/components/points.ts
import { defineComponent as defineComponent29 } from "@forgeax/engine-ecs";
var PointShapeValue = Object.freeze({
  square: 0,
  circle: 1
});
function pointShapeFromU32(value) {
  switch (value) {
    case PointShapeValue.square:
      return "square";
    case PointShapeValue.circle:
      return "circle";
    default:
      return void 0;
  }
}
var Points = defineComponent29(
  "Points",
  {
    sizePx: { type: "f32", default: 4 },
    shape: { type: "enum", default: PointShapeValue.square, labels: PointShapeValue }
  },
  {
    meta: {
      quickStart: "Attach Points to render point-list MeshAsset vertices in screen pixels.",
      diagnostics: "Inspect sizePx and decode shape with pointShapeFromU32.",
      recovery: "Use points-lines-invalid-style for non-finite or non-positive sizePx values.",
      boundaries: "Points owns raster size and shape only; MeshFilter and MeshRenderer own geometry and material."
    }
  }
);

// sdk/engine/node_modules/@forgeax/engine-render/src/components/post-process-params.ts
import { defineComponent as defineComponent30 } from "@forgeax/engine-ecs";
var schema = {
  shader: "string",
  data: "buffer"
};
var PostProcessParams = defineComponent30("PostProcessParams", schema);

// sdk/engine/node_modules/@forgeax/engine-render/src/components/reflection-probe.ts
import { defineComponent as defineComponent31 } from "@forgeax/engine-ecs";
var REFLECTION_PROBE_UPDATE_ONCE = 0;
var REFLECTION_PROBE_UPDATE_ON_CHANGE = 1;
var REFLECTION_PROBE_UPDATE_CONTINUOUS = 2;
function reflectionProbeUpdateIntentFromF32(value) {
  switch (value) {
    case REFLECTION_PROBE_UPDATE_ONCE:
      return "once";
    case REFLECTION_PROBE_UPDATE_ON_CHANGE:
      return "on-change";
    case REFLECTION_PROBE_UPDATE_CONTINUOUS:
      return "continuous";
    default:
      throw new RenderIntentInvalidError("ReflectionProbe", value);
  }
}
function reflectionProbeUpdateIntentToF32(intent) {
  switch (intent) {
    case "once":
      return REFLECTION_PROBE_UPDATE_ONCE;
    case "on-change":
      return REFLECTION_PROBE_UPDATE_ON_CHANGE;
    case "continuous":
      return REFLECTION_PROBE_UPDATE_CONTINUOUS;
  }
}
var ReflectionProbe = defineComponent31("ReflectionProbe", {
  halfExtents: { type: "array<f32, 3>", default: new Float32Array([1, 1, 1]) },
  priority: { type: "f32", default: 0 },
  boxProjection: { type: "bool", default: false },
  intensity: { type: "f32", default: 1 },
  resolution: { type: "u32", default: 256 },
  updateIntent: { type: "f32", default: REFLECTION_PROBE_UPDATE_ONCE },
  invalidationVersion: { type: "u32", default: 0 }
});

// sdk/engine/node_modules/@forgeax/engine-render/src/components/scene-instance.ts
import { defineComponent as defineComponent32 } from "@forgeax/engine-ecs";
var SceneInstance = defineComponent32(
  "SceneInstance",
  {
    source: { type: "asset<scene>" },
    mapping: { type: "array<entity>" },
    // The unique slot is the ECS storage seam for the instance's structured
    // runtime payload; keep the nested semantic visible to schema consumers.
    state: { type: "unique<SceneInstanceState>", shape: "nested" }
  },
  { transient: true }
);

// sdk/engine/node_modules/@forgeax/engine-render/src/components/screen-space-reflection.ts
import { defineComponent as defineComponent33 } from "@forgeax/engine-ecs";
var ScreenSpaceReflection = defineComponent33("ScreenSpaceReflection", {
  maxDistance: { type: "f32", default: 1 },
  thickness: { type: "f32", default: 0.1 },
  maxRoughness: { type: "f32", default: 1 }
});

// sdk/engine/node_modules/@forgeax/engine-render/src/components/shadow-participation.ts
import { defineComponent as defineComponent34 } from "@forgeax/engine-ecs";
var ShadowParticipation = defineComponent34("ShadowParticipation", {
  channels: { type: "f64", default: 4294967295 },
  cast: { type: "bool", default: true },
  receive: { type: "bool", default: true }
});

// sdk/engine/node_modules/@forgeax/engine-render/src/components/skybox-background.ts
import { defineComponent as defineComponent35 } from "@forgeax/engine-ecs";
var SKYBOX_MODE_CUBEMAP = 0;
var SkyboxBackground = defineComponent35("SkyboxBackground", {
  // The GPU skybox projection is render-owned presentation state; restore
  // keeps the portable mode/rotation controls and lets the owner re-resolve
  // the environment asset on the target world.
  equirect: { type: "asset<equirect>", simulationTransient: true },
  mode: { type: "f32", default: SKYBOX_MODE_CUBEMAP },
  rotation: { type: "array<f32, 4>", default: new Float32Array([0, 0, 0, 1]) }
});

// sdk/engine/node_modules/@forgeax/engine-render/src/components/skylight.ts
import { defineComponent as defineComponent36 } from "@forgeax/engine-ecs";
var Skylight = defineComponent36("Skylight", {
  // Direction-independent diffuse irradiance, independent of image-based radiance.
  // It is additive and does not create a specular environment.
  ambientIrradiance: { type: "array<f32, 3>" },
  // The GPU equirect-to-cubemap projection is render-owned presentation
  // state. Record/restore preserves the portable lighting controls while the
  // render owner resolves this asset again on the target world.
  equirect: { type: "asset<equirect>", simulationTransient: true },
  // color carries an explicit layer-2 default [1,1,1] (white); the array
  // layer-3 fallback is all-zero, so the default MUST be explicit (D-5).
  color: { type: "array<f32, 3>", default: new Float32Array([1, 1, 1]) },
  intensity: { type: "f32", default: 1 },
  rotation: { type: "array<f32, 4>", default: new Float32Array([0, 0, 0, 1]) }
});

// sdk/engine/node_modules/@forgeax/engine-render/src/components/sort-key.ts
import { defineComponent as defineComponent37 } from "@forgeax/engine-ecs";
var SortKey = defineComponent37("SortKey", {
  value: { type: "f32", default: 0 }
});

// sdk/engine/node_modules/@forgeax/engine-render/src/components/sprite-animation.ts
import { defineComponent as defineComponent38 } from "@forgeax/engine-ecs";
var SpriteAnimation = defineComponent38("SpriteAnimation", {
  frameCount: { type: "u32" },
  frameDuration: { type: "f32" },
  currentFrame: { type: "u32", transient: true },
  accumDt: { type: "f32", transient: true },
  regions: { type: "array<f32>" },
  playbackMode: { type: "u32" }
});

// sdk/engine/node_modules/@forgeax/engine-render/src/components/sprite-instances.ts
import { defineComponent as defineComponent39 } from "@forgeax/engine-ecs";
var SpriteInstances = defineComponent39("SpriteInstances", {
  transforms: { type: "array<f32>" },
  regions: { type: "array<f32>" }
});

// sdk/engine/node_modules/@forgeax/engine-render/src/components/sprite-playback-mode.ts
var SPRITE_PLAYBACK_MODE_LOOP = 0;
var SPRITE_PLAYBACK_MODE_CLAMP = 1;
var SpritePlayback = Object.freeze({
  loop: SPRITE_PLAYBACK_MODE_LOOP,
  clamp: SPRITE_PLAYBACK_MODE_CLAMP
});
function spritePlaybackModeFromU32(value) {
  return value === SPRITE_PLAYBACK_MODE_CLAMP ? "clamp" : "loop";
}

// sdk/engine/node_modules/@forgeax/engine-render/src/components/sprite-region-override.ts
import { defineComponent as defineComponent40 } from "@forgeax/engine-ecs";
var SpriteRegionOverride = defineComponent40("SpriteRegionOverride", {
  region: { type: "array<f32, 4>" }
});

// sdk/engine/node_modules/@forgeax/engine-render/src/components/tilemap.ts
import { defineComponent as defineComponent41 } from "@forgeax/engine-ecs";
var Tilemap = defineComponent41("Tilemap", {
  cols: { type: "u32", default: 0 },
  rows: { type: "u32", default: 0 },
  tileSize: { type: "array<f32, 2>", default: new Float32Array([1, 1]) },
  chunkSize: { type: "u32", default: 16 },
  tileset: { type: "asset<tileset>", default: 0, simulationTransient: true },
  tiles: { type: "array<u32>" },
  layerOrder: { type: "i32", default: 0 },
  sortScope: { type: "u8", default: 0 }
});
var TilemapSort = Object.freeze({ layer: 0, perCell: 1 });

// sdk/engine/node_modules/@forgeax/engine-render/src/components/visibility.ts
import { defineComponent as defineComponent42 } from "@forgeax/engine-ecs";
var VisibilityStateValue = Object.freeze({
  inherited: 0,
  hidden: 1,
  visible: 2
});
function visibilityStateFromU32(value) {
  switch (value) {
    case VisibilityStateValue.inherited:
      return "inherited";
    case VisibilityStateValue.hidden:
      return "hidden";
    case VisibilityStateValue.visible:
      return "visible";
    default:
      return void 0;
  }
}
var Visibility = defineComponent42(
  "Visibility",
  {
    state: {
      type: "enum",
      default: VisibilityStateValue.inherited,
      labels: VisibilityStateValue
    }
  },
  {
    meta: {
      quickStart: "Attach Visibility to author render participation intent.",
      diagnostics: "Compare the ECS state with resolveVisibility and renderer.visibilityStats.",
      recovery: "Use structured ECS write errors and repair the owning scene relation.",
      boundaries: "Visibility does not own camera, picking, lifecycle, assets, or VFX shadow policy."
    }
  }
);

// sdk/engine/node_modules/@forgeax/engine-render/src/components/clipping-planes.ts
import { defineComponent as defineComponent43 } from "@forgeax/engine-ecs";
import {
  ClippingContractError,
  MAX_CLIPPING_PLANES,
  normalizeClippingPlanes
} from "@forgeax/engine-types";
var ClippingPlanes = defineComponent43("ClippingPlanes", {
  planes: { type: "array<f32, 24>" },
  count: { type: "u32", default: 0 },
  intersection: { type: "bool", default: false },
  clipShadows: { type: "bool", default: false }
});
function clippingPlanesData(options) {
  const normalized = normalizeClippingPlanes(options.planes);
  const planes = new Float32Array(MAX_CLIPPING_PLANES * 4);
  for (const [index, plane] of normalized.entries()) planes.set(plane, index * 4);
  return {
    planes,
    count: normalized.length,
    intersection: options.intersection === true,
    clipShadows: options.clipShadows === true
  };
}
function extractClippingPlanes(data) {
  if (data === void 0) return void 0;
  if (!Number.isInteger(data.count) || data.count < 0 || data.count > MAX_CLIPPING_PLANES)
    throw new ClippingContractError({ field: "count", actual: data.count });
  const planes = [];
  for (let index = 0; index < data.count; index++) {
    const offset = index * 4;
    planes.push([
      data.planes[offset] ?? Number.NaN,
      data.planes[offset + 1] ?? Number.NaN,
      data.planes[offset + 2] ?? Number.NaN,
      data.planes[offset + 3] ?? Number.NaN
    ]);
  }
  return {
    planes: normalizeClippingPlanes(planes),
    intersection: data.intersection,
    clipShadows: data.clipShadows
  };
}

// sdk/engine/node_modules/@forgeax/engine-render/src/environment/frame.ts
import { err as err9, ok as ok9 } from "@forgeax/engine-types";

// sdk/engine/node_modules/@forgeax/engine-render/src/extract/environment.ts
var ATMOSPHERE_PARAMETER_RANGES = Object.freeze({
  planetRadius: { min: 1, max: 1e9 },
  atmosphereHeight: { min: 1, max: 1e8 },
  groundOrigin: { min: -1e12, max: 1e12 },
  capturePosition: { min: -1e12, max: 1e12 },
  rayleighScattering: { min: 0, max: 1 },
  rayleighScaleHeight: { min: 1, max: 1e8 },
  mieScattering: { min: 0, max: 1 },
  mieAbsorption: { min: 0, max: 1 },
  mieScaleHeight: { min: 1, max: 1e8 },
  mieAnisotropy: { min: -0.99, max: 0.99 },
  absorption: { min: 0, max: 1 },
  absorptionPeakHeight: { min: 0, max: 1e8 },
  absorptionHalfWidth: { min: 1, max: 1e8 },
  groundAlbedo: { min: 0, max: 1 },
  multipleScattering: { min: 0, max: 2 },
  sunAngularRadius: { min: 0, max: 0.1 },
  aerialPerspectiveStart: { min: 0, max: 1e8 },
  aerialPerspectiveDistanceScale: { min: 0, max: 10 }
});
function validateFogParameters(candidate2) {
  if (candidate2.color.length !== 3) {
    return {
      field: "color",
      value: candidate2.color.length,
      expected: "exactly three finite channels in [0, 1]"
    };
  }
  for (let index = 0; index < candidate2.color.length; index += 1) {
    const value = candidate2.color[index];
    if (value === void 0 || !Number.isFinite(value) || value < 0 || value > 1) {
      return {
        field: `color[${index}]`,
        value: value ?? Number.NaN,
        expected: "a finite number in [0, 1]"
      };
    }
  }
  if (!Number.isFinite(candidate2.density) || candidate2.density < 0) {
    return { field: "density", value: candidate2.density, expected: "a finite number >= 0" };
  }
  if (!Number.isFinite(candidate2.heightFalloff) || candidate2.heightFalloff < 0) {
    return {
      field: "heightFalloff",
      value: candidate2.heightFalloff,
      expected: "a finite number >= 0"
    };
  }
  if (!Number.isFinite(candidate2.maxOpacity) || candidate2.maxOpacity < 0 || candidate2.maxOpacity > 1) {
    return {
      field: "maxOpacity",
      value: candidate2.maxOpacity,
      expected: "a finite number in [0, 1]"
    };
  }
  return void 0;
}
function freezeAtmosphere(parameters) {
  return Object.freeze({
    ...parameters,
    capturePosition: Object.freeze([
      ...parameters.capturePosition
    ]),
    groundOrigin: Object.freeze([
      ...parameters.groundOrigin
    ]),
    rayleighScattering: Object.freeze([
      ...parameters.rayleighScattering
    ]),
    absorption: Object.freeze([...parameters.absorption]),
    groundAlbedo: Object.freeze([
      ...parameters.groundAlbedo
    ])
  });
}
function validateAtmosphereParameters(parameters) {
  for (const field of Object.keys(ATMOSPHERE_PARAMETER_RANGES)) {
    const value = parameters[field];
    const range2 = ATMOSPHERE_PARAMETER_RANGES[field];
    const channels = typeof value === "number" ? [value] : value;
    if (channels === void 0 || typeof value !== "number" && channels.length !== 3) {
      return new AtmosphereInvalidParameterError(field, Number.NaN, range2);
    }
    for (const channel of channels) {
      if (!Number.isFinite(channel) || channel < range2.min || channel > range2.max) {
        return new AtmosphereInvalidParameterError(field, channel, range2);
      }
    }
  }
  return void 0;
}

// sdk/engine/node_modules/@forgeax/engine-render/src/environment/signature.ts
function sorted(items) {
  return [...items].sort((left, right) => left.entityKey - right.entityKey);
}
function environmentSignature(input) {
  return JSON.stringify({
    environments: sorted(input.environments),
    fogs: sorted(input.fogs),
    suns: sorted(input.suns)
  });
}
function environmentOnlySignature(input) {
  return JSON.stringify({
    environments: sorted(input.environments),
    suns: sorted(input.suns)
  });
}
function fogOnlySignature(input) {
  return JSON.stringify({ fogs: sorted(input.fogs) });
}
function environmentFactSignatures(input) {
  return {
    environmentSignature: environmentOnlySignature(input),
    fogSignature: fogOnlySignature(input),
    signature: environmentSignature(input)
  };
}

// sdk/engine/node_modules/@forgeax/engine-render/src/environment/frame.ts
var SKYLIGHT_RECOVERY_FALLBACK = Object.freeze({
  kind: "skylight",
  active: false
});
var EnvironmentSelectionParameterError = class extends Error {
  code = "environment-selection-invalid";
  expected;
  hint;
  detail;
  constructor(field, value, expected) {
    super(`environment selection field ${field} is invalid`);
    this.name = "EnvironmentSelectionParameterError";
    this.expected = expected;
    this.hint = `set ${field} to a finite value satisfying ${expected}`;
    this.detail = { field, value };
  }
};
var SunCardinalityError = class extends Error {
  code = "sun-cardinality";
  expected = "atmosphere has exactly one sun owner";
  hint = "add exactly one DirectionalLight sun for the atmosphere owner";
  detail;
  constructor(value) {
    super(`atmosphere sun cardinality is ${value}`);
    this.name = "SunCardinalityError";
    this.detail = { field: "sun", value };
  }
};
function freezeCandidate(candidate2) {
  return Object.freeze(candidate2);
}
function freezeFog(candidate2) {
  return Object.freeze({
    ...candidate2,
    color: Object.freeze([...candidate2.color])
  });
}
function selectEnvironment(input) {
  if (input.environments.length > 1) {
    return err9(
      new EnvironmentSourceConflictError(
        [...input.environments].sort((left, right) => left.entityKey - right.entityKey).map(({ kind, entityKey, sourceKey }) => ({ kind, entityKey, sourceKey }))
      )
    );
  }
  if (input.fogs.length > 1) return err9(new FogCardinalityError(input.fogs.length));
  const selectedFog = input.fogs[0];
  if (selectedFog !== void 0) {
    const issue = validateFogParameters(selectedFog);
    if (issue !== void 0) {
      return err9(new EnvironmentSelectionParameterError(issue.field, issue.value, issue.expected));
    }
  }
  const selected = input.environments[0];
  if (selected?.kind === "atmosphere") {
    const invalid4 = validateAtmosphereParameters(selected.atmosphere);
    if (invalid4 !== void 0) return err9(invalid4);
  }
  if (selected?.kind === "atmosphere" && input.suns.length !== 1) {
    return err9(new SunCardinalityError(input.suns.length));
  }
  const source = selected === void 0 ? { kind: "none" } : selected.kind === "atmosphere" ? {
    kind: "atmosphere",
    entityKey: selected.entityKey,
    sourceKey: selected.sourceKey,
    atmosphere: freezeAtmosphere(selected.atmosphere)
  } : {
    kind: "image",
    entityKey: selected.entityKey,
    sourceKey: selected.sourceKey
  };
  const sun = input.suns[0] === void 0 ? void 0 : freezeCandidate({ ...input.suns[0] });
  const fog = selectedFog === void 0 ? void 0 : freezeFog(selectedFog);
  const signatureInput = {
    environments: selected === void 0 ? [] : [selected],
    fogs: selectedFog === void 0 ? [] : [selectedFog],
    suns: input.suns
  };
  const signatures = environmentFactSignatures(signatureInput);
  const result = {
    source: Object.freeze(source),
    fog,
    ...signatures,
    revision: 0,
    sun
  };
  return ok9(Object.freeze(result));
}

// sdk/engine/node_modules/@forgeax/engine-render/src/extract/visibility.ts
import {
  projectHierarchy
} from "@forgeax/engine-scene";
var projections = /* @__PURE__ */ new WeakMap();
function captureVisibility(world) {
  let projection = projections.get(world);
  if (projection === void 0) {
    projection = {
      rows: world.query({ read: [Visibility] }).unwrap(),
      changes: world.query({ changed: [Visibility] }).unwrap(),
      structure: -1,
      captured: void 0
    };
    projections.set(world, projection);
  }
  let changed = false;
  for (const span of projection.changes.spans().unwrap()) changed ||= span.length > 0;
  const structure = world.getStructureEpoch();
  const previous = projection.captured;
  if (previous !== void 0 && !changed && projection.structure === structure) return previous;
  const spans = projection.rows.spans().unwrap();
  let count = 0;
  let validCount = 0;
  let same = previous !== void 0;
  for (const span of spans) {
    const states = span.get(Visibility).state;
    count += span.length;
    for (let index = 0; index < span.length; index++) {
      const entity = span.entities[index];
      const intent = visibilityStateFromU32(states[index] ?? 0);
      if (intent !== void 0) validCount++;
      if (previous?.intents.get(entity) !== intent) same = false;
    }
  }
  if (same && previous !== void 0 && count === previous.intentCount && validCount === previous.intents.size) {
    projection.structure = structure;
    return previous;
  }
  const intents = /* @__PURE__ */ new Map();
  let hasAnyHiddenIntent = false;
  for (const span of spans) {
    const states = span.get(Visibility).state;
    for (let index = 0; index < span.length; index++) {
      const rawState = states[index] ?? 0;
      const intent = visibilityStateFromU32(rawState);
      if (intent !== void 0) intents.set(span.entities[index], intent);
      hasAnyHiddenIntent ||= rawState === VisibilityStateValue.hidden;
    }
  }
  projection.structure = structure;
  projection.captured = { intents, intentCount: count, hasAnyHiddenIntent };
  return projection.captured;
}
function resolveVisibility(world, hierarchy = projectHierarchy(world)) {
  const captured = captureVisibility(world);
  const { intentCount, hasAnyHiddenIntent, intents } = captured;
  let resolveEntity;
  const ensureResolver = () => {
    if (resolveEntity !== void 0) return;
    const resolved = /* @__PURE__ */ new Map();
    const resolving = /* @__PURE__ */ new Set();
    resolveEntity = (entity) => {
      const existing = resolved.get(entity);
      if (existing !== void 0) return existing;
      if (resolving.has(entity)) return void 0;
      const intent = intents.get(entity) ?? "inherited";
      resolving.add(entity);
      let result;
      if (intent === "hidden") {
        result = { intent, effective: "hidden", source: "self" };
      } else if (intent === "visible") {
        result = { intent, effective: "visible", source: "self" };
      } else {
        const parent = hierarchy.getParent(entity);
        const parentResult = parent === void 0 ? void 0 : resolveEntity?.(parent);
        result = parentResult === void 0 ? { intent, effective: "visible", source: "default" } : { intent, effective: parentResult.effective, source: "parent" };
      }
      resolving.delete(entity);
      resolved.set(entity, result);
      return result;
    };
  };
  const snapshot = {
    diagnostics: hierarchy.diagnostics,
    hasAnyIntent: intentCount > 0,
    hasAnyHiddenIntent,
    get(entity) {
      ensureResolver();
      return intents.has(entity) ? resolveEntity?.(entity) : void 0;
    },
    effective(entity) {
      ensureResolver();
      return resolveEntity?.(entity)?.effective ?? "visible";
    }
  };
  return snapshot;
}

// sdk/engine/node_modules/@forgeax/engine-render/src/features/depth-of-field/depth-of-field-params.ts
import { err as err10, ok as ok10 } from "@forgeax/engine-types";
var DEPTH_OF_FIELD_PARAMS_BYTE_SIZE = 64;
var MIN_F_STOP = Math.fround(0.7);
var MAX_F_STOP = Math.fround(32);
var DEFAULT_DEPTH_OF_FIELD_PARAMS = Object.freeze({
  focusDistance: 8,
  fStop: 2.8,
  sensorHeight: 0.024,
  maxRadiusPixels: 16,
  quality: "medium",
  blurSide: "both",
  focalLength: 0
});
function quantizeF32(value) {
  return Math.fround(value);
}
var DepthOfFieldValidationError = class extends Error {
  code;
  expected;
  hint;
  detail;
  constructor(code, detail, expected, hint) {
    super(`${code}: ${expected}`);
    this.name = "DepthOfFieldValidationError";
    this.code = code;
    this.expected = expected;
    this.hint = hint;
    this.detail = detail;
  }
};
function depthOfFieldRequestFailure(error) {
  return Object.freeze({
    code: error.code,
    detail: error.detail,
    expected: error.expected,
    hint: error.hint
  });
}
function resolveDepthOfFieldFrameParams(requested, requestFailure, accepted) {
  if (requested !== void 0) return requested;
  if (requestFailure === void 0 || requestFailure.code === "depth-of-field-orthographic-unsupported") {
    return void 0;
  }
  return accepted;
}
function invalid3(field, value, expected, bound) {
  return new DepthOfFieldValidationError(
    "depth-of-field-invalid-params",
    { field, value, expected, ...bound === void 0 ? {} : { bound } },
    expected,
    `set ${field} to ${expected}`
  );
}
function focalLength(sensorHeight, fov) {
  return sensorHeight / (2 * Math.tan(fov / 2));
}
function opticalCocScale(params) {
  return params.focalLength / params.sensorHeight / (2 * params.fStop) * (params.focalLength / (params.focusDistance - params.focalLength));
}
function frameCocCoefficient(params, outputHeight) {
  return quantizeF32(quantizeF32(outputHeight) * opticalCocScale(params));
}
function resolveDepthOfFieldFrameValues(params, input) {
  const focusDistance = quantizeF32(params.focusDistance);
  const fStop = quantizeF32(params.fStop);
  const sensorHeight = quantizeF32(params.sensorHeight);
  const focal = quantizeF32(params.focalLength);
  const maxRadiusPixels = quantizeF32(params.maxRadiusPixels);
  const outputHeight = quantizeF32(input.outputHeight);
  const near = quantizeF32(input.near);
  const far = quantizeF32(input.far);
  const finitePositiveFields = [
    ["focusDistance", focusDistance, params.focusDistance],
    ["sensorHeight", sensorHeight, params.sensorHeight],
    ["focalLength", focal, params.focalLength],
    ["near", near, input.near],
    ["far", far, input.far]
  ];
  for (const [field, value, raw] of finitePositiveFields) {
    if (!Number.isFinite(value) || value <= 0) {
      return err10(invalid3(field, raw, "a finite positive f32 value"));
    }
  }
  if (!Number.isFinite(fStop) || fStop < MIN_F_STOP || fStop > MAX_F_STOP) {
    return err10(
      invalid3("fStop", params.fStop, "a finite f32 value in [0.7, 32]", [MIN_F_STOP, MAX_F_STOP])
    );
  }
  if (!Number.isFinite(maxRadiusPixels) || maxRadiusPixels < 0 || maxRadiusPixels > 32) {
    return err10(
      invalid3("maxRadiusPixels", params.maxRadiusPixels, "a finite f32 value in [0, 32]", [0, 32])
    );
  }
  if (!Number.isFinite(outputHeight) || outputHeight <= 0) {
    return err10(invalid3("outputHeight", input.outputHeight, "a finite positive f32 value"));
  }
  if (far <= near) {
    return err10(invalid3("near/far", [input.near, input.far], "finite f32 near > 0 and far > near"));
  }
  if (focusDistance <= focal) {
    return err10(invalid3("focusDistance", params.focusDistance, "greater than focalLength in f32"));
  }
  const depthRatio = quantizeF32(near / far);
  if (!Number.isFinite(depthRatio) || depthRatio <= 0) {
    return err10(invalid3("near/far ratio", depthRatio, "a finite positive f32 value"));
  }
  for (const raw of [quantizeF32(2 ** -149), 0.5, 1]) {
    const oneMinusRaw = quantizeF32(1 - raw);
    const weightedRatio = quantizeF32(oneMinusRaw * depthRatio);
    const denominator = quantizeF32(raw + weightedRatio);
    const distance = quantizeF32(near / denominator);
    if (!Number.isFinite(oneMinusRaw) || oneMinusRaw < 0 || !Number.isFinite(weightedRatio) || !Number.isFinite(denominator) || denominator <= 0 || !Number.isFinite(distance) || distance <= 0) {
      return err10(invalid3("linearDepth", distance, "finite positive f32 reconstruction"));
    }
  }
  const cocCoefficient = frameCocCoefficient(
    {
      focusDistance,
      fStop,
      sensorHeight,
      focalLength: focal
    },
    outputHeight
  );
  if (!Number.isFinite(cocCoefficient) || cocCoefficient <= 0) {
    return err10(
      invalid3("cocCoefficient", cocCoefficient, "a finite positive value representable as f32")
    );
  }
  for (const [field, depth] of [
    ["near", near],
    ["far", far]
  ]) {
    const focusOverDepth = quantizeF32(focusDistance / depth);
    const depthFactor = quantizeF32(1 - focusOverDepth);
    const radius = quantizeF32(cocCoefficient * depthFactor);
    if (!Number.isFinite(focusOverDepth) || !Number.isFinite(depthFactor) || !Number.isFinite(radius)) {
      return err10(invalid3(`coc.${field}`, radius, "a finite value representable as f32"));
    }
  }
  return ok10({
    focusDistance,
    fStop,
    sensorHeight,
    focalLength: focal,
    maxRadiusPixels,
    outputHeight,
    near,
    far,
    cocCoefficient
  });
}
function validateDepthOfFieldFrameParams(params, input) {
  const resolved = resolveDepthOfFieldFrameValues(params, input);
  return resolved.ok ? ok10(void 0) : resolved;
}
function validateDepthOfFieldParams(input, camera) {
  if (camera?.projection === "orthographic") {
    return err10(
      new DepthOfFieldValidationError(
        "depth-of-field-orthographic-unsupported",
        { projection: "orthographic" },
        "DepthOfField requires a perspective Camera",
        "use a perspective Camera or remove the DepthOfField component"
      )
    );
  }
  const value = input ?? {};
  const focusDistance = quantizeF32(
    value.focusDistance ?? DEFAULT_DEPTH_OF_FIELD_PARAMS.focusDistance
  );
  const fStop = quantizeF32(value.fStop ?? DEFAULT_DEPTH_OF_FIELD_PARAMS.fStop);
  const sensorHeight = quantizeF32(
    value.sensorHeight ?? DEFAULT_DEPTH_OF_FIELD_PARAMS.sensorHeight
  );
  const maxRadiusPixels = quantizeF32(
    value.maxRadiusPixels ?? DEFAULT_DEPTH_OF_FIELD_PARAMS.maxRadiusPixels
  );
  const qualityValue = quantizeF32(value.quality ?? DepthOfFieldQualityValue.medium);
  const blurSideValue = quantizeF32(value.blurSide ?? DepthOfFieldSideValue.both);
  const quality = depthOfFieldQualityFromF32(qualityValue);
  const blurSide = depthOfFieldSideFromF32(blurSideValue);
  if (!Number.isFinite(focusDistance) || focusDistance <= 0) {
    return err10(
      invalid3("focusDistance", value.focusDistance ?? focusDistance, "a finite positive f32 value")
    );
  }
  if (!Number.isFinite(fStop) || fStop < MIN_F_STOP || fStop > MAX_F_STOP) {
    return err10(
      invalid3("fStop", value.fStop ?? fStop, "a finite f32 value in [0.7, 32]", [
        MIN_F_STOP,
        MAX_F_STOP
      ])
    );
  }
  if (!Number.isFinite(sensorHeight) || sensorHeight <= 0) {
    return err10(
      invalid3("sensorHeight", value.sensorHeight ?? sensorHeight, "a finite positive f32 value")
    );
  }
  if (!Number.isFinite(maxRadiusPixels) || maxRadiusPixels < 0 || maxRadiusPixels > 32) {
    return err10(
      invalid3(
        "maxRadiusPixels",
        value.maxRadiusPixels ?? maxRadiusPixels,
        "a finite f32 value in [0, 32]",
        [0, 32]
      )
    );
  }
  if (quality === void 0) {
    return err10(invalid3("quality", qualityValue, "DepthOfFieldQualityValue.low, medium, or high"));
  }
  if (blurSide === void 0) {
    return err10(invalid3("blurSide", blurSideValue, "DepthOfFieldSideValue.both, near, or far"));
  }
  let focal = DEFAULT_DEPTH_OF_FIELD_PARAMS.focalLength;
  if (camera !== void 0) {
    const fov = quantizeF32(camera.fov);
    const near = quantizeF32(camera.near);
    const far = quantizeF32(camera.far);
    if (!Number.isFinite(fov) || fov <= 0 || fov >= Math.PI) {
      return err10(invalid3("fov", camera.fov, "a finite f32 value in (0, PI)"));
    }
    if (!Number.isFinite(near) || !Number.isFinite(far) || near <= 0 || far <= near) {
      return err10(
        invalid3("near/far", [camera.near, camera.far], "finite f32 near > 0 and far > near")
      );
    }
    focal = quantizeF32(focalLength(sensorHeight, fov));
    if (!Number.isFinite(focal) || focal <= 0) {
      return err10(invalid3("focalLength", focal, "a finite positive f32 value"));
    }
    if (focusDistance < near || focusDistance > far) {
      return err10(
        invalid3("focusDistance", focusDistance, `a value in [${near}, ${far}]`, [near, far])
      );
    }
    if (focusDistance <= focal) {
      return err10(
        invalid3("focusDistance", focusDistance, `greater than focalLength in f32 (${focal})`)
      );
    }
  }
  return ok10(
    Object.freeze({
      focusDistance,
      fStop,
      sensorHeight,
      maxRadiusPixels,
      quality,
      blurSide,
      focalLength: focal
    })
  );
}
function resolveDepthOfFieldParams(input, camera) {
  if (input === void 0) return ok10(void 0);
  return validateDepthOfFieldParams(input, camera);
}
function depthOfFieldTapCount(quality) {
  switch (quality) {
    case "low":
      return 16;
    case "medium":
      return 32;
    case "high":
      return 64;
  }
}
function depthOfFieldSideCode(side) {
  switch (side) {
    case "both":
      return DepthOfFieldSideValue.both;
    case "near":
      return DepthOfFieldSideValue.near;
    case "far":
      return DepthOfFieldSideValue.far;
  }
}
function depthOfFieldQualityCode(quality) {
  switch (quality) {
    case "low":
      return DepthOfFieldQualityValue.low;
    case "medium":
      return DepthOfFieldQualityValue.medium;
    case "high":
      return DepthOfFieldQualityValue.high;
  }
}
function signedDepthOfFieldCoC(params, viewDepth, outputHeight) {
  if (!Number.isFinite(viewDepth) || viewDepth <= 0 || !Number.isFinite(outputHeight) || outputHeight <= 0 || !Number.isFinite(params.focalLength) || params.focalLength <= 0 || !Number.isFinite(params.sensorHeight) || params.sensorHeight <= 0 || !Number.isFinite(params.fStop) || params.fStop <= 0 || !Number.isFinite(params.focusDistance) || params.focusDistance <= params.focalLength) {
    return 0;
  }
  const focusDistance = quantizeF32(params.focusDistance);
  const depth = quantizeF32(viewDepth);
  const focalLength2 = quantizeF32(params.focalLength);
  const sensorHeight = quantizeF32(params.sensorHeight);
  const fStop = quantizeF32(params.fStop);
  const coefficient = frameCocCoefficient(
    { focusDistance, focalLength: focalLength2, sensorHeight, fStop },
    outputHeight
  );
  const depthFactor = quantizeF32(1 - quantizeF32(focusDistance / depth));
  const radius = quantizeF32(coefficient * depthFactor);
  const limit = Number.isFinite(params.maxRadiusPixels) ? quantizeF32(params.maxRadiusPixels) : Number.POSITIVE_INFINITY;
  return Math.max(-limit, Math.min(limit, Number.isFinite(radius) ? radius : 0));
}
function packDepthOfFieldParams(params, input) {
  const frameValues = resolveDepthOfFieldFrameValues(params, input);
  if (!frameValues.ok) throw frameValues.error;
  const {
    focusDistance,
    fStop,
    sensorHeight,
    focalLength: focal,
    outputHeight,
    maxRadiusPixels,
    near,
    far,
    cocCoefficient
  } = frameValues.value;
  const payload = new Float32Array(DEPTH_OF_FIELD_PARAMS_BYTE_SIZE / 4);
  payload.set([
    focusDistance,
    fStop,
    sensorHeight,
    focal,
    outputHeight,
    maxRadiusPixels,
    depthOfFieldSideCode(params.blurSide),
    depthOfFieldQualityCode(params.quality),
    near,
    far,
    input.useTemporalDepth ? 1 : 0,
    0,
    // row2.w reserved
    cocCoefficient,
    // row3.x / WGSL reserved.x
    0,
    0,
    0
  ]);
  return new Uint8Array(payload.buffer);
}

// sdk/engine/node_modules/@forgeax/engine-render/src/features/motion-blur/motion-blur-params.ts
import { err as err11, ok as ok11 } from "@forgeax/engine-types";
var MOTION_BLUR_PARAMS_BYTE_SIZE = 32;
var DEFAULT_MOTION_BLUR_PARAMS = Object.freeze({
  shutterAngle: 180,
  maxRadiusPixels: 32,
  sampleCount: 8,
  targetFps: 60
});
var MotionBlurValidationError = class extends Error {
  code = "motion-blur-invalid-params";
  expected;
  hint;
  detail;
  constructor(detail) {
    const integer = detail.integer === true ? "integer " : "";
    const expected = `${detail.field} ${integer}in [${detail.min}, ${detail.max}]`;
    super(`motion-blur-invalid-params: ${expected}`);
    this.name = "MotionBlurValidationError";
    this.expected = expected;
    this.hint = `set ${detail.field} to an ${integer}value in [${detail.min}, ${detail.max}]`;
    this.detail = detail;
  }
};
function validateField(field, value, min, max, integer = false) {
  if (!Number.isFinite(value) || value < min || value > max || integer && !Number.isInteger(value)) {
    return new MotionBlurValidationError({
      field,
      value,
      min,
      max,
      ...integer ? { integer } : {}
    });
  }
  return void 0;
}
function validateMotionBlurParams(input) {
  const value = input ?? {};
  const shutterAngle = value.shutterAngle ?? DEFAULT_MOTION_BLUR_PARAMS.shutterAngle;
  const maxRadiusPixels = value.maxRadiusPixels ?? DEFAULT_MOTION_BLUR_PARAMS.maxRadiusPixels;
  const sampleCount = value.sampleCount ?? DEFAULT_MOTION_BLUR_PARAMS.sampleCount;
  const targetFps = value.targetFps ?? DEFAULT_MOTION_BLUR_PARAMS.targetFps;
  const shutterError = validateField("shutterAngle", shutterAngle, 0, 360);
  if (shutterError !== void 0) return err11(shutterError);
  const radiusError = validateField("maxRadiusPixels", maxRadiusPixels, 0, 64);
  if (radiusError !== void 0) return err11(radiusError);
  const sampleError = validateField("sampleCount", sampleCount, 4, 16, true);
  if (sampleError !== void 0) return err11(sampleError);
  const targetFpsError = validateField("targetFps", targetFps, 0, 240, true);
  if (targetFpsError !== void 0) return err11(targetFpsError);
  return ok11(Object.freeze({ shutterAngle, maxRadiusPixels, sampleCount, targetFps }));
}
function motionBlurTemporalDemand(params) {
  return params !== void 0 && params.shutterAngle > 0 && params.maxRadiusPixels > 0;
}
function effectiveMotionBlurSampleCount(sampleCount) {
  if (!Number.isFinite(sampleCount) || sampleCount < 4) return 0;
  if (sampleCount < 8) return 4;
  if (sampleCount < 16) return 8;
  return 16;
}
function isMotionBlurIntervalValid(frameDeltaSeconds) {
  return Number.isFinite(frameDeltaSeconds) && frameDeltaSeconds > 0 && frameDeltaSeconds <= 0.1;
}
function motionBlurExposureScale(frameDeltaSeconds, targetFps) {
  if (!isMotionBlurIntervalValid(frameDeltaSeconds)) return 0;
  if (!Number.isFinite(targetFps) || targetFps < 0 || targetFps > 240 || !Number.isInteger(targetFps)) {
    return 0;
  }
  if (targetFps === 0) return 1;
  return 1 / (targetFps * frameDeltaSeconds);
}
function motionBlurSampleDelta(sampleTimeSeconds, previousSampleTimeSeconds, fallbackDeltaSeconds) {
  if (sampleTimeSeconds !== void 0 && !Number.isFinite(sampleTimeSeconds) || previousSampleTimeSeconds !== void 0 && !Number.isFinite(previousSampleTimeSeconds)) {
    return Number.NaN;
  }
  if (Number.isFinite(sampleTimeSeconds) && Number.isFinite(previousSampleTimeSeconds)) {
    return sampleTimeSeconds - previousSampleTimeSeconds;
  }
  return fallbackDeltaSeconds;
}
function resolveMotionBlurParams(input) {
  if (input === void 0) return ok11(void 0);
  return validateMotionBlurParams(input);
}

// sdk/engine/node_modules/@forgeax/engine-render/src/systems/transparent-sort-config.ts
import { ResourceInvalidValueError as ResourceInvalidValueError2 } from "@forgeax/engine-ecs/projection";
import { err as err12, ok as ok12 } from "@forgeax/engine-types";
var TRANSPARENT_SORT_CONFIG_KEY = "TransparentSortConfig";
var TRANSPARENT_SORT_MODE_LAYER_Z = 0;
var TRANSPARENT_SORT_MODE_LAYER_Y = 1;
var TRANSPARENT_SORT_MODE_LAYER_YZ = 2;
var TRANSPARENT_SORT_MODE_DISTANCE = 3;
var TransparentSort = Object.freeze({
  layerZ: TRANSPARENT_SORT_MODE_LAYER_Z,
  layerY: TRANSPARENT_SORT_MODE_LAYER_Y,
  layerYZ: TRANSPARENT_SORT_MODE_LAYER_YZ,
  distance: TRANSPARENT_SORT_MODE_DISTANCE,
  configure: setTransparentSortConfig
});
var DEFAULT_CONFIG = Object.freeze({
  mode: TRANSPARENT_SORT_MODE_LAYER_Z,
  yzAlpha: 1
});
var VALID_MODES = /* @__PURE__ */ new Set([
  TRANSPARENT_SORT_MODE_LAYER_Z,
  TRANSPARENT_SORT_MODE_LAYER_Y,
  TRANSPARENT_SORT_MODE_LAYER_YZ,
  TRANSPARENT_SORT_MODE_DISTANCE
]);
var EXPECTED_MODE = "mode \u2208 {0, 1, 2, 3}";
var HINT_MODE = "0=layer-z, 1=layer-y, 2=layer-yz, 3=distance";
function getTransparentSortConfig(world) {
  if (!world.hasResource(TRANSPARENT_SORT_CONFIG_KEY)) {
    return DEFAULT_CONFIG;
  }
  return world.getResource(TRANSPARENT_SORT_CONFIG_KEY);
}
function setTransparentSortConfig(world, cfg) {
  if (!VALID_MODES.has(cfg.mode)) {
    return err12(
      new ResourceInvalidValueError2(EXPECTED_MODE, HINT_MODE, {
        receivedMode: cfg.mode,
        receivedKey: TRANSPARENT_SORT_CONFIG_KEY
      })
    );
  }
  world.insertResource(TRANSPARENT_SORT_CONFIG_KEY, {
    mode: cfg.mode,
    yzAlpha: cfg.yzAlpha
  });
  return ok12(void 0);
}

// sdk/engine/node_modules/@forgeax/engine-render/src/systems/active-camera.ts
var ACTIVE_CAMERA_KEY = "ActiveCamera";
function getActiveCamera(world) {
  if (!world.hasResource(ACTIVE_CAMERA_KEY)) return void 0;
  return world.getResource(ACTIVE_CAMERA_KEY);
}
function setActiveCamera(world, entity) {
  world.insertResource(ACTIVE_CAMERA_KEY, { entity });
}
function selectActiveCameraIndex(cameraEntities, activeEntity) {
  if (activeEntity === void 0) return -1;
  return cameraEntities.indexOf(activeEntity);
}

// sdk/engine/node_modules/@forgeax/engine-render/src/volume/capability.ts
import { Entity } from "@forgeax/engine-ecs";
import { Transform } from "@forgeax/engine-scene";
function hasVolumetricFogCapability(caps, shaders) {
  return caps.compute && caps.storageTexture && shaders !== void 0;
}
function resolveVolumetricFogLightPair(world, point, spot) {
  const expected = "PointLight + SpotLight in the same World";
  if (!world.get(point, Entity).ok || !world.get(spot, Entity).ok) {
    return {
      status: "unresolved",
      reason: "missing-entity",
      point,
      spot,
      expected,
      actual: "point or spot entity is absent from this World",
      hint: "assign two live entities from the same World and retry"
    };
  }
  if (point === spot) {
    return {
      status: "unresolved",
      reason: "same-entity",
      point,
      spot,
      expected,
      actual: "PointLight and SpotLight share one EntityHandle",
      hint: "spawn PointLight and SpotLight on two different entities"
    };
  }
  const pointValid = world.hasComponent(point, PointLight) && world.hasComponent(point, Transform);
  const spotValid = world.hasComponent(spot, SpotLight) && world.hasComponent(spot, Transform);
  if (!pointValid || !spotValid) {
    return {
      status: "unresolved",
      reason: "wrong-component",
      point,
      spot,
      expected,
      actual: `pointValid=${pointValid}; spotValid=${spotValid}`,
      hint: "attach PointLight and SpotLight with Transform to separate same-World entities"
    };
  }
  return { status: "available", mode: "point-spot", point, spot };
}
function resolveSelectedVolumetricLight(world, entity) {
  const expected = "DirectionalLight | PointLight | SpotLight";
  if (!world.get(entity, Entity).ok) {
    return {
      status: "unresolved",
      reason: "missing-entity",
      entity,
      expected,
      actual: "missing or foreign World entity",
      hint: "assign VolumetricFog.light to a live DirectionalLight or SpotLight in this World"
    };
  }
  const hasDirectional = world.hasComponent(entity, DirectionalLight);
  const hasSpot = world.hasComponent(entity, SpotLight);
  if (hasDirectional && hasSpot) {
    return {
      status: "unresolved",
      reason: "ambiguous",
      entity,
      expected,
      actual: "DirectionalLight + SpotLight",
      hint: "remove one mutually exclusive light component from the selected entity"
    };
  }
  if (hasDirectional) return { status: "available", entity, kind: "directional" };
  if (world.hasComponent(entity, PointLight) && world.hasComponent(entity, Transform)) {
    return { status: "available", entity, kind: "point" };
  }
  if (hasSpot && world.hasComponent(entity, Transform)) {
    return { status: "available", entity, kind: "spot" };
  }
  const actual = hasSpot ? "SpotLight without Transform" : world.hasComponent(entity, PointLight) ? "PointLight" : "other component";
  return {
    status: "unresolved",
    reason: "wrong-component",
    entity,
    expected,
    actual,
    hint: "add exactly one supported light component and a Transform for PointLight or SpotLight in the same World"
  };
}
function resolveIntegratedVolumeConsumer(resource, consumer) {
  return { consumer, resource };
}

// sdk/engine/node_modules/@forgeax/engine-render/src/volume/component.ts
import { defineComponent as defineComponent44 } from "@forgeax/engine-ecs";
import { err as err13, ok as ok13 } from "@forgeax/engine-types";
var MAX_VOLUMETRIC_FOG_OWNERS = 16 - 5;
var VolumetricFogSamplingValue = { noise: 0, density: 1, densityAlbedo: 2 };
var VolumetricFog = defineComponent44("VolumetricFog", {
  light: { type: "entity" },
  spotLight: { type: "entity" },
  density: { type: "asset<texture>", simulationTransient: true },
  boundsMin: { type: "array<f32, 3>" },
  boundsMax: { type: "array<f32, 3>" },
  extinction: { type: "array<f32, 3>" },
  albedo: { type: "array<f32, 3>" },
  emission: { type: "array<f32, 3>" },
  anisotropy: { type: "f32", default: 0 },
  maxDistance: { type: "f32", default: 100 },
  sampling: { type: "enum", labels: VolumetricFogSamplingValue, default: 0 }
});
function finiteVector(value) {
  return value.every(Number.isFinite);
}
function validBounds(bounds) {
  if (!finiteVector(bounds.min) || !finiteVector(bounds.max)) return false;
  return bounds.max.every((value, index) => value > (bounds.min[index] ?? value));
}
function validRange(value, min, max = Infinity) {
  return value.every((entry) => Number.isFinite(entry) && entry >= min && entry <= max);
}
function validateVolumetricFog(input) {
  if (input.density.shape.viewDimension !== "3d" || input.density.colorSpace === "srgb") {
    return err13(
      new VolumeDensityShapeMismatchError(input.density.guid, input.density.shape.viewDimension)
    );
  }
  if (!validBounds(input.bounds)) return err13(new VolumeInvalidBoundsError(input.bounds));
  if (input.sampling === "density-albedo" && input.density.format !== "rgba8unorm" && input.density.format !== "rgba16float") {
    return err13(
      new VolumeInvalidParametersError(input, {
        field: "density.format",
        value: input.density.format
      })
    );
  }
  if (!validRange(input.extinction, 0) || !validRange(input.albedo, 0, 1) || !validRange(input.emission, 0) || !Number.isFinite(input.anisotropy) || input.anisotropy <= -1 || input.anisotropy >= 1 || !Number.isFinite(input.maxDistance) || input.maxDistance <= 0 || input.sampling !== void 0 && input.sampling !== "noise" && input.sampling !== "density" && input.sampling !== "density-albedo") {
    return err13(new VolumeInvalidParametersError(input));
  }
  return ok13(input);
}

// sdk/engine/node_modules/@forgeax/engine-render/src/volume/extract.ts
import { err as err14, ok as ok14 } from "@forgeax/engine-types";
function extractVolumetricFog(inputs) {
  if (inputs.length === 0) return ok14({ status: "off" });
  if (inputs.length > MAX_VOLUMETRIC_FOG_OWNERS)
    return err14(new VolumeOwnerConflictError(inputs.length));
  const fogs = [];
  for (const input of inputs) {
    const validated = validateVolumetricFog(input);
    if (!validated.ok) return validated;
    fogs.push(validated.value);
  }
  return ok14({ status: "available", fogs });
}

// sdk/engine/node_modules/@forgeax/engine-render/src/sprite-region.ts
function spriteUvRegion(region, flipX, flipY) {
  let x = region?.[0] ?? 0;
  let y = region?.[1] ?? 0;
  let width = region?.[2] ?? 1;
  let height = region?.[3] ?? 1;
  if (typeof flipX === "number" && flipX !== 0) {
    x += width;
    width = -width;
  }
  if (typeof flipY === "number" && flipY !== 0) {
    y += height;
    height = -height;
  }
  return [x, y, width, height];
}

// sdk/engine/node_modules/@forgeax/engine-render/src/render-system-extract.ts
import { runtimeAssetRegistry as runtimeAssetRegistry2, runtimeAssets as runtimeAssets2 } from "@forgeax/engine-assets-runtime/internal";
import {
  materialProgramContextForPass
} from "@forgeax/engine-pack/material-cook";

// sdk/engine/node_modules/@forgeax/engine-render/src/camera-projection.ts
import { mat4 as mat44 } from "@forgeax/engine-math";
function cameraLensProjection(camera, out = mat44.create()) {
  if (camera.projection === "orthographic") {
    mat44.orthographicReverseZ(
      out,
      camera.orthoLeft,
      camera.orthoRight,
      camera.orthoTop,
      camera.orthoBottom,
      camera.near,
      camera.far
    );
  } else {
    mat44.perspectiveReverseZ(out, camera.fov, camera.aspect, camera.near, camera.far);
  }
  const [x, y] = camera.projectionOffset ?? [0, 0];
  for (let column = 0; column < 16; column += 4) {
    const w = out[column + 3] ?? 0;
    out[column] = (out[column] ?? 0) + x * w;
    out[column + 1] = (out[column + 1] ?? 0) + y * w;
  }
  return out;
}
function jitterCameraProjection(out, projection, jitterUv) {
  if (jitterUv === void 0) {
    out.set(projection);
    return out;
  }
  const shift = mat44.identity(mat44.create());
  shift[12] = jitterUv[0] * 2;
  shift[13] = jitterUv[1] * -2;
  return mat44.multiply(out, shift, projection);
}

// sdk/engine/node_modules/@forgeax/engine-render/src/record/helpers.ts
import { mat4 as mat45 } from "@forgeax/engine-math";

// sdk/engine/node_modules/@forgeax/engine-render/src/environment/bindings.ts
function atmosphereBindings(state, views) {
  if (state.atmosphereAvailable !== true) return [];
  const volume = state.atmosphereFallbackView;
  if (volume === void 0) throw new Error("admitted atmosphere layout has no neutral volume");
  return [
    {
      binding: 18,
      resource: {
        kind: "textureView",
        value: views?.transmittance ?? state.defaultWhiteTextureView
      }
    },
    {
      binding: 19,
      resource: {
        kind: "textureView",
        value: views?.multipleScattering ?? state.defaultWhiteTextureView
      }
    },
    { binding: 20, resource: { kind: "textureView", value: views?.aerialPerspective ?? volume } },
    { binding: 21, resource: { kind: "textureView", value: views?.aerialTransmittance ?? volume } },
    {
      binding: 23,
      resource: {
        kind: "textureView",
        value: views?.distantSkyLight ?? state.defaultWhiteTextureView
      }
    }
  ];
}
function atmosphereViewLayoutEntries() {
  return [
    ...[
      [18, "2d"],
      [19, "2d"],
      [20, "3d"],
      [21, "3d"],
      [23, "2d"]
    ].map(([binding, viewDimension]) => ({
      binding,
      visibility: 2,
      texture: { sampleType: "float", viewDimension }
    }))
  ];
}
function atmosphereMaterialVisibilityLayoutEntries() {
  return [
    { binding: 3, visibility: 2, texture: { sampleType: "depth", viewDimension: "2d-array" } },
    { binding: 4, visibility: 2, sampler: { type: "comparison" } },
    { binding: 16, visibility: 2, texture: { sampleType: "float", viewDimension: "2d" } },
    { binding: 17, visibility: 2, sampler: { type: "filtering" } }
  ];
}
function atmosphereMaterialVisibilityBindings(state, directional, cloud) {
  if (state.atmosphereAvailable !== true) return [];
  const sampler = state.perPassResources.shadowSampler;
  if (sampler === null) throw new Error("admitted atmosphere requires the shadow sampler");
  return [
    {
      binding: 3,
      resource: { kind: "textureView", value: directional ?? state.shadowArrayFallbackTextureView }
    },
    { binding: 4, resource: { kind: "sampler", value: sampler } },
    {
      binding: 16,
      resource: { kind: "textureView", value: cloud ?? state.defaultWhiteTextureView }
    },
    {
      binding: 17,
      resource: { kind: "sampler", value: state.viewLinearSampler ?? state.defaultSampler }
    }
  ];
}

// sdk/engine/node_modules/@forgeax/engine-render/src/pbr-pipeline.ts
import {
  STANDARD_DIRECT_DFG_LUT_BINDING,
  STANDARD_PHYSICAL_BINDING_START,
  STANDARD_PHYSICAL_TEXTURE_FIELDS,
  STANDARD_PIPELINE_PARAM_SCHEMA,
  standardPhysicalTextureFields,
  standardTextureMask
} from "@forgeax/engine-shader";
import { derive } from "@forgeax/engine-types";

// sdk/engine/node_modules/@forgeax/engine-render/src/device/direct-dfg-lut.ts
import {
  RhiError
} from "@forgeax/engine-rhi";
import { DIRECT_DFG_LUT_SIZE, directDfgLutBytes } from "@forgeax/engine-shader";
import {
  err as err15,
  getAdmittedParamSchemaInterface,
  ok as ok15
} from "@forgeax/engine-types";
var DIRECT_DFG_LUT_DESCRIPTOR = {
  label: "standard-direct-dfg-lut",
  size: { width: DIRECT_DFG_LUT_SIZE, height: DIRECT_DFG_LUT_SIZE, depthOrArrayLayers: 1 },
  format: "rg16float",
  usage: 2 | 4,
  mipLevelCount: 1,
  sampleCount: 1,
  dimension: "2d",
  textureBindingViewDimension: void 0
};
var luts = /* @__PURE__ */ new WeakMap();
function materialUsesDirectDfgLut(schema2) {
  if (schema2 === void 0) return false;
  const admitted = getAdmittedParamSchemaInterface(schema2);
  if (admitted !== void 0)
    return admitted.parameterTypes.get("directMultiscatteringLut") === "u32";
  return schema2.some((entry) => entry.name === "directMultiscatteringLut" && entry.type === "u32");
}
function getOrCreateDirectDfgLut(device, scope) {
  const stale = () => err15(
    new RhiError({
      code: "rhi-not-available",
      expected: "a live DeviceScope for the current DFG texture device",
      hint: "prepare the material again in the recovered renderer generation"
    })
  );
  if (!scope.isAlive()) return stale();
  const cached = luts.get(scope);
  if (cached !== void 0) return cached.device === device ? ok15(cached.lut) : stale();
  const texture = device.createTexture(DIRECT_DFG_LUT_DESCRIPTOR);
  if (!texture.ok) return texture;
  let destroyed = false;
  const destroy = () => {
    if (destroyed) return ok15(void 0);
    const result = device.destroyTexture(texture.value);
    if (result.ok) destroyed = true;
    return result;
  };
  const ref = scope._adopt("texture", texture.value, () => {
    luts.delete(scope);
    destroy().unwrap();
  });
  const fail = (result) => {
    if (destroy().ok) scope._release(ref);
    return result;
  };
  const bytes = directDfgLutBytes();
  const upload = new Uint8Array(256 * DIRECT_DFG_LUT_SIZE);
  for (let row = 0; row < DIRECT_DFG_LUT_SIZE; row += 1) {
    upload.set(bytes.subarray(row * 64, (row + 1) * 64), row * 256);
  }
  const written = device.queue.writeTexture(
    { texture: texture.value },
    upload,
    { bytesPerRow: 256, rowsPerImage: DIRECT_DFG_LUT_SIZE },
    DIRECT_DFG_LUT_DESCRIPTOR.size
  );
  if (!written.ok) return fail(written);
  const view = device.createTextureView(texture.value, {
    label: "standard-direct-dfg-lut-view",
    dimension: "2d"
  });
  if (!view.ok) return fail(view);
  const sampler = device.createSampler({
    label: "standard-direct-dfg-lut-sampler",
    minFilter: "linear",
    magFilter: "linear",
    addressModeU: "clamp-to-edge",
    addressModeV: "clamp-to-edge"
  });
  if (!sampler.ok) return fail(sampler);
  if (!scope.isAlive()) return fail(stale());
  const lut = { texture: texture.value, view: view.value, sampler: sampler.value };
  luts.set(scope, { device, lut });
  return ok15(lut);
}

// sdk/engine/node_modules/@forgeax/engine-render/src/gpu-stage.ts
var GPU_SHADER_STAGE_VERTEX = 1;
var GPU_SHADER_STAGE_FRAGMENT = 2;
var GPU_SHADER_STAGE_COMPUTE = 4;

// sdk/engine/node_modules/@forgeax/engine-render/src/pbr-pipeline.ts
var BGL_ONLY_SPEC_STUB = Object.freeze({
  shader: { id: "forgeax::default-standard-pbr", passKind: "forward", variantSet: void 0 },
  attachments: { colorFormats: [], depthFormat: void 0, sampleCount: 1 },
  geometry: { topology: "triangle-list", vertexLayout: {} },
  renderState: void 0
});
function buildPbrMaterialUserRegionEntries(paramSchema = STANDARD_PIPELINE_PARAM_SCHEMA, excludedTextureFields = [], vertexOnlyTextureFields = []) {
  const excluded = new Set(excludedTextureFields);
  for (const field of standardPhysicalTextureFields(paramSchema)) excluded.add(field);
  const derived = derive(
    excluded.size === 0 ? paramSchema : paramSchema.filter(
      (entry) => !excluded.has(entry.name) || !entry.type.startsWith("texture")
    )
  );
  const vertexOnlyBindings = new Set(
    derived.resourceBindings.filter(
      (resource) => resource.parameter !== void 0 && vertexOnlyTextureFields.includes(resource.parameter)
    ).map((resource) => resource.binding)
  );
  let entries2 = derived.bglEntries.map(
    (entry) => ({
      binding: entry.binding,
      visibility: vertexOnlyBindings.has(entry.binding) ? GPU_SHADER_STAGE_VERTEX : entry.texture !== void 0 || entry.sampler !== void 0 || entry.externalTexture !== void 0 ? GPU_SHADER_STAGE_VERTEX | GPU_SHADER_STAGE_FRAGMENT : entry.visibility,
      ...entry.buffer === void 0 ? {} : { buffer: entry.buffer },
      ...entry.sampler === void 0 ? {} : { sampler: entry.sampler },
      ...entry.texture === void 0 ? {} : { texture: entry.texture },
      ...entry.storageTexture === void 0 ? {} : { storageTexture: entry.storageTexture },
      ...entry.externalTexture === void 0 ? {} : { externalTexture: entry.externalTexture }
    })
  );
  const ubo = entries2[0];
  if (ubo !== void 0 && ubo.binding === 0 && ubo.buffer?.type === "uniform") {
    entries2[0] = {
      binding: 0,
      visibility: GPU_SHADER_STAGE_VERTEX | GPU_SHADER_STAGE_FRAGMENT,
      buffer: { type: "uniform", hasDynamicOffset: true }
    };
  } else {
    entries2 = [
      {
        binding: 0,
        visibility: GPU_SHADER_STAGE_VERTEX | GPU_SHADER_STAGE_FRAGMENT,
        buffer: { type: "uniform", hasDynamicOffset: true }
      },
      ...entries2.map((entry) => ({ ...entry, binding: entry.binding + 1 }))
    ];
  }
  return entries2;
}
var STANDARD_NORMAL_BIT = standardTextureMask([{ name: "normalTexture", type: "texture2d" }]);
var STANDARD_BUMP_BIT = standardTextureMask([{ name: "bumpTexture", type: "texture2d" }]);
function standardNormalInputField(field, mask) {
  if (field !== "normalTexture" || mask === void 0) return field;
  return (mask & STANDARD_NORMAL_BIT) === 0 && (mask & STANDARD_BUMP_BIT) !== 0 ? "bumpTexture" : field;
}
function sharedMaterialBindingDeclarations(registry, materialShaderId) {
  if (registry === void 0 || materialShaderId === void 0) return void 0;
  if ((registry.materialShaderManifestEntry(materialShaderId)?.variants.length ?? 0) > 0)
    return void 0;
  const lookup = registry.findMaterialArtifact(materialShaderId);
  if (materialShaderId === "forgeax::single-layer-medium" || lookup.ok && lookup.value.receipt?.surface?.model === "single-layer-medium")
    return void 0;
  return lookup.ok ? lookup.value.program.materialBindings : void 0;
}
function omittedStandardMaterialBindings(textureFields, transmissionAvailable, standard, canonical = false, materialBindings, userRegionEnd = 1 + textureFields.length * 2) {
  const omitted = /* @__PURE__ */ new Set();
  if (standard && !transmissionAvailable) {
    textureFields.forEach((name, index) => {
      if (name === "transmissionTexture" || name === "thicknessTexture") {
        omitted.add(1 + index * 2);
        omitted.add(2 + index * 2);
      }
    });
  }
  if (canonical) {
    const index = textureFields.indexOf("bumpTexture");
    if (index >= 0 && textureFields.includes("normalTexture")) {
      omitted.add(1 + index * 2);
      omitted.add(2 + index * 2);
    }
  }
  const backdropSampler = userRegionEnd + 6;
  if (materialBindings === void 0 ? standard : !materialBindings.includes(backdropSampler)) {
    omitted.add(backdropSampler);
  }
  return omitted;
}
function appendInjection(bgl, kind) {
  const start = bgl.length;
  switch (kind) {
    case "ibl":
      return [
        // binding start+0: irradianceMap (texture_cube)
        {
          binding: start,
          visibility: GPU_SHADER_STAGE_FRAGMENT,
          texture: { sampleType: "float", viewDimension: "cube" }
        },
        // binding start+1: irradianceSampler
        {
          binding: start + 1,
          visibility: GPU_SHADER_STAGE_FRAGMENT,
          sampler: { type: "filtering" }
        },
        // binding start+2: prefilterMap (CubeUV atlas)
        {
          binding: start + 2,
          visibility: GPU_SHADER_STAGE_FRAGMENT,
          texture: { sampleType: "float", viewDimension: "2d" }
        },
        // binding start+3: prefilterSampler
        {
          binding: start + 3,
          visibility: GPU_SHADER_STAGE_FRAGMENT,
          sampler: { type: "filtering" }
        },
        // binding start+4: brdfLut (texture_2d)
        {
          binding: start + 4,
          visibility: GPU_SHADER_STAGE_FRAGMENT,
          texture: { sampleType: "float", viewDimension: "2d" }
        },
        // binding start+5: uniform { intensity: f32 }
        {
          binding: start + 5,
          visibility: GPU_SHADER_STAGE_FRAGMENT,
          buffer: { type: "uniform" }
        }
      ];
    case "shadow":
      return [
        {
          binding: start,
          visibility: GPU_SHADER_STAGE_FRAGMENT,
          sampler: { type: "comparison" }
        },
        {
          binding: start + 1,
          visibility: GPU_SHADER_STAGE_FRAGMENT,
          texture: { sampleType: "depth", viewDimension: "2d" }
        }
      ];
    case "transmission":
      return [
        {
          binding: start,
          visibility: GPU_SHADER_STAGE_FRAGMENT,
          sampler: { type: "filtering" }
        },
        {
          binding: start + 1,
          visibility: GPU_SHADER_STAGE_FRAGMENT,
          texture: { sampleType: "float", viewDimension: "2d" }
        }
      ];
  }
}
function appendSingleLayerMediumInjection(bgl) {
  const start = bgl.length;
  return [
    {
      binding: start,
      visibility: GPU_SHADER_STAGE_FRAGMENT,
      sampler: { type: "non-filtering" }
    },
    {
      binding: start + 1,
      visibility: GPU_SHADER_STAGE_FRAGMENT,
      texture: { sampleType: "unfilterable-float", viewDimension: "2d" }
    },
    {
      binding: start + 2,
      visibility: GPU_SHADER_STAGE_FRAGMENT,
      sampler: { type: "filtering" }
    },
    {
      binding: start + 3,
      visibility: GPU_SHADER_STAGE_FRAGMENT,
      texture: { sampleType: "float", viewDimension: "2d" }
    },
    {
      binding: start + 4,
      visibility: GPU_SHADER_STAGE_FRAGMENT,
      sampler: { type: "non-filtering" }
    },
    {
      binding: start + 5,
      visibility: GPU_SHADER_STAGE_FRAGMENT,
      texture: { sampleType: "unfilterable-float", viewDimension: "2d" }
    },
    {
      binding: start + 6,
      visibility: GPU_SHADER_STAGE_FRAGMENT,
      texture: { sampleType: "float", viewDimension: "2d" }
    },
    {
      binding: start + 7,
      visibility: GPU_SHADER_STAGE_FRAGMENT,
      buffer: { type: "uniform", minBindingSize: 96 }
    }
  ];
}
function physicalTextureFields(paramSchema) {
  return standardPhysicalTextureFields(paramSchema);
}
function appendTextureInjection(paramSchema) {
  return standardPhysicalTextureFields(paramSchema).flatMap((field) => {
    const parameter = paramSchema.find((entry) => entry.name === field);
    const sampleType = parameter?.type === "texture2d" ? parameter.sampleType ?? "float" : "float";
    const canonicalIndex = STANDARD_PHYSICAL_TEXTURE_FIELDS.indexOf(field);
    const binding = STANDARD_PHYSICAL_BINDING_START + canonicalIndex * 2;
    return [
      {
        binding,
        visibility: GPU_SHADER_STAGE_FRAGMENT,
        sampler: { type: "filtering" }
      },
      {
        binding: binding + 1,
        visibility: GPU_SHADER_STAGE_FRAGMENT,
        texture: { sampleType, viewDimension: "2d" }
      }
    ];
  });
}
function materialBindGroupLayoutIdentity(shaderId, paramSchema) {
  const descriptor = buildBindGroupLayoutDescriptor(
    {
      shader: { id: shaderId, passKind: "forward", variantSet: void 0 },
      attachments: { colorFormats: [], depthFormat: void 0, sampleCount: 1 },
      geometry: { topology: "triangle-list", vertexLayout: {} },
      renderState: void 0
    },
    { kind: "pbr-material-merged", materialParamSchema: paramSchema }
  );
  return JSON.stringify({
    entries: descriptor.entries,
    physicalTextureFields: physicalTextureFields(paramSchema)
  });
}
function buildPbrViewBglEntries(caps) {
  const entries2 = [
    {
      binding: 0,
      visibility: GPU_SHADER_STAGE_VERTEX | GPU_SHADER_STAGE_FRAGMENT,
      // View captures use the same bind group with a per-face view slot.
      // Keeping this dynamic is also valid for the display slot at offset 0.
      buffer: { type: "uniform", hasDynamicOffset: true }
    },
    {
      binding: 3,
      visibility: GPU_SHADER_STAGE_VERTEX | GPU_SHADER_STAGE_FRAGMENT,
      texture: { sampleType: "depth", viewDimension: "2d-array" }
    },
    {
      binding: 4,
      visibility: GPU_SHADER_STAGE_FRAGMENT,
      sampler: { type: "comparison" }
    },
    // The no-storage shader profile has no cube-array point-shadow resources.
    ...caps.storageBuffer ? [
      {
        binding: 5,
        visibility: GPU_SHADER_STAGE_FRAGMENT,
        texture: { sampleType: "depth", viewDimension: "cube-array" }
      },
      {
        binding: 6,
        visibility: GPU_SHADER_STAGE_FRAGMENT,
        buffer: { type: "uniform" }
      }
    ] : [],
    // feat-20260613-csm-cascaded-shadow-maps M5 / w28: shadowCasterCascade
    // UBO (16 B). Carries the 0-based cascade index of the shadow pass
    // currently being rasterized so `shadow_caster.wgsl` can index into
    // `view.lightViewProj_X` per cascade. Shifted from binding 5 to
    // binding 7 on 2026-06-13 to make room for point-shadow bindings 5/6
    // (they predate this feat in main; CSM's slot was the optimal-yield
    // give since point-shadow needs FRAGMENT-only and the cascade UBO
    // needs vertex-stage too — keeping cascade higher avoids interleaving
    // visibility flags within the contiguous shadow-binding cluster).
    {
      binding: 7,
      visibility: GPU_SHADER_STAGE_VERTEX | GPU_SHADER_STAGE_FRAGMENT,
      buffer: { type: "uniform" }
    },
    // feat-20260625-spot-light-shadow-mapping M3 / w14 (D-5): spot shadow
    // array: one `texture_depth_2d_array` layer per spot shadow tile.
    // FRAGMENT-only — the spot
    // shadow factor is reconstructed at fragment time via perspective-divide in
    // `evalSpotShadowed` (lighting-punctual.wgsl).
    //
    // ALWAYS-ON (no caps gate, unlike the point cube_array atlas at binding 5
    // which rides POINT_SHADOW_AVAILABLE): spot uses `texture_depth_2d_array` which is
    // compat-safe in every WebGPU profile, so the binding is unconditionally
    // declared. The matching WGSL declaration is `spotShadowMap` at @group(0)
    // binding 8 in common.wgsl (also unconditional) — the two must stay in
    // lock-step or WebGPU validation rejects the bind group at smoke time
    // (memory: BGL shape mismatch is a browser-path-only bug). No binding 9
    // sampler: spot reuses the comparison sampler at binding 4.
    // feat-20260625-spot-light-shadow-mapping M3 / w14 (D-5): spot shadow
    // array, the LAST view-BG binding. The per-spot fragment-read perspective
    // lightViewProj matrices that w24 originally declared at a standalone
    // binding 9 uniform buffer were folded into the View UBO (binding 0,
    // `view.spotLightViewProj`) in w25 (scope-amend webkit-fallback): the
    // standalone binding pushed the WebGL2 fallback fragment uniform-buffer
    // count to 12, over GLES 3.0's `max_uniform_buffers_per_shader_stage = 11`,
    // crashing pipeline-layout creation on the compat path (this feat's target).
    {
      binding: 8,
      visibility: GPU_SHADER_STAGE_FRAGMENT,
      texture: { sampleType: "depth", viewDimension: "2d-array" }
    }
  ];
  if (caps.atmosphere === true) entries2.push(...atmosphereViewLayoutEntries());
  const extendedLighting = caps.extendedLighting ?? true;
  const lowLimitCloudBindings = extendedLighting === false && caps.projectorAvailable === false;
  if (extendedLighting) {
    entries2.push(
      {
        binding: 24,
        visibility: GPU_SHADER_STAGE_FRAGMENT,
        texture: { sampleType: "float", viewDimension: "2d-array" }
      },
      {
        binding: 9,
        visibility: GPU_SHADER_STAGE_FRAGMENT,
        sampler: { type: "filtering" }
      },
      {
        binding: 11,
        visibility: GPU_SHADER_STAGE_FRAGMENT,
        texture: { sampleType: "float", viewDimension: "2d-array" }
      },
      {
        binding: 12,
        visibility: GPU_SHADER_STAGE_FRAGMENT,
        texture: { sampleType: "float", viewDimension: "2d-array" }
      },
      {
        binding: 13,
        visibility: GPU_SHADER_STAGE_FRAGMENT,
        texture: { sampleType: "float", viewDimension: "2d" }
      },
      {
        binding: 14,
        visibility: GPU_SHADER_STAGE_FRAGMENT,
        texture: { sampleType: "float", viewDimension: "2d" }
      },
      {
        binding: 15,
        visibility: GPU_SHADER_STAGE_FRAGMENT,
        buffer: { type: "uniform" }
      }
    );
  } else if (caps.projectorAvailable !== false) {
    entries2.push(
      {
        binding: 11,
        visibility: GPU_SHADER_STAGE_FRAGMENT,
        texture: { sampleType: "float", viewDimension: "2d" }
      },
      {
        binding: 12,
        visibility: GPU_SHADER_STAGE_FRAGMENT,
        sampler: { type: "filtering" }
      }
    );
  }
  entries2.push({
    binding: 10,
    visibility: GPU_SHADER_STAGE_VERTEX,
    buffer: { type: "uniform", hasDynamicOffset: true }
  });
  if (!lowLimitCloudBindings) {
    entries2.push(
      {
        binding: 16,
        visibility: GPU_SHADER_STAGE_FRAGMENT,
        texture: { sampleType: "float", viewDimension: "2d" }
      },
      {
        binding: 17,
        visibility: GPU_SHADER_STAGE_FRAGMENT,
        sampler: { type: "filtering" }
      }
    );
  }
  return entries2;
}
function buildPbrPipelineLayouts(device, caps) {
  const viewBglRes = device.createBindGroupLayout(
    buildBindGroupLayoutDescriptor(BGL_ONLY_SPEC_STUB, { kind: "pbr-view", caps })
  );
  if (!viewBglRes.ok) throw viewBglRes.error;
  const materialBglRes = device.createBindGroupLayout(
    buildBindGroupLayoutDescriptor(BGL_ONLY_SPEC_STUB, {
      kind: "pbr-material-merged",
      caps
    })
  );
  if (!materialBglRes.ok) throw materialBglRes.error;
  const meshArrayBglRes = device.createBindGroupLayout(
    buildBindGroupLayoutDescriptor(BGL_ONLY_SPEC_STUB, { kind: "pbr-mesh-array", caps })
  );
  if (!meshArrayBglRes.ok) throw meshArrayBglRes.error;
  const instancesBglRes = device.createBindGroupLayout(
    buildBindGroupLayoutDescriptor(BGL_ONLY_SPEC_STUB, {
      kind: "pbr-instances",
      caps: { ...caps, probeBlend: false }
    })
  );
  if (!instancesBglRes.ok) throw instancesBglRes.error;
  const probeInstancesBglRes = caps.storageBuffer ? device.createBindGroupLayout(
    buildBindGroupLayoutDescriptor(BGL_ONLY_SPEC_STUB, {
      kind: "pbr-instances",
      caps: { ...caps, probeBlend: true }
    })
  ) : { ok: true, value: instancesBglRes.value };
  if (!probeInstancesBglRes.ok) throw probeInstancesBglRes.error;
  const layouts = [
    viewBglRes.value,
    materialBglRes.value,
    meshArrayBglRes.value,
    instancesBglRes.value
  ];
  const pipelineLayoutRes = device.createPipelineLayout({
    label: "pbr-pl",
    bindGroupLayouts: layouts
  });
  if (!pipelineLayoutRes.ok) throw pipelineLayoutRes.error;
  const probeLayouts = [viewBglRes.value, materialBglRes.value, meshArrayBglRes.value, probeInstancesBglRes.value];
  let probePipelineLayout = null;
  if (caps.storageBuffer) {
    const probePipelineLayoutRes = device.createPipelineLayout({
      label: "pbr-probe-pl",
      bindGroupLayouts: probeLayouts
    });
    if (!probePipelineLayoutRes.ok) throw probePipelineLayoutRes.error;
    probePipelineLayout = probePipelineLayoutRes.value;
  }
  return {
    pipelineLayout: pipelineLayoutRes.value,
    viewBgl: viewBglRes.value,
    materialBgl: materialBglRes.value,
    meshArrayBgl: meshArrayBglRes.value,
    instancesBgl: instancesBglRes.value,
    probeInstancesBgl: probeInstancesBglRes.value,
    probePipelineLayout,
    bindGroupLayouts: layouts
  };
}
var SKIN_MATERIAL_SHADER_ID = "forgeax::pbr-skin";
var SKIN_UNCOVERED_GBUFFER_ENTRY = "fs_gbuffer_uncovered";
var SHADOW_CASTER_SHADER_ID = "forgeax::default-shadow-caster";
var AUTHORED_STANDARD_ID_RE = /::(?:standard|pbr-skin)(?:-|$)/;
function isStandardPbrSkinMaterialShader(shaderId) {
  return shaderId === SKIN_MATERIAL_SHADER_ID || shaderId === "forgeax::default-standard-pbr-skin" || shaderId !== void 0 && /::pbr-skin(?:-|$)/.test(shaderId);
}
var SHADOW_CASTER_VARIANTS = Array.from(
  { length: 32 },
  (_, flags) => `ALPHA_MASK=${(flags & 8) !== 0}+GPU_DRIVEN_SCENE_INDEX_AVAILABLE=${(flags & 4) !== 0}+GPU_DRIVEN_SCENE_INDEX_EXPLICIT=false+SKINNING_DISABLED=${(flags & 2) === 0}+STORAGE_BUFFER_AVAILABLE=${(flags & 1) !== 0}` + ((flags & 16) !== 0 ? "+VERTEX_COLOR_AVAILABLE=true" : "")
);
function shadowCasterVariantSet(storageBuffer, skinned, gpuDrivenSceneIndex = false, alphaMask = false, vertexColorAvailable = false) {
  return SHADOW_CASTER_VARIANTS[Number(storageBuffer) | Number(skinned) << 1 | Number(gpuDrivenSceneIndex) << 2 | Number(alphaMask) << 3 | Number(vertexColorAvailable) << 4];
}
function isStandardPbrMaterialShader(shaderId) {
  return shaderId === "forgeax::default-standard-pbr" || shaderId === SKIN_MATERIAL_SHADER_ID || shaderId === "forgeax::default-standard-pbr-skin" || shaderId !== void 0 && AUTHORED_STANDARD_ID_RE.test(shaderId);
}
function isCanonicalStandardPbrMaterialShader(shaderId) {
  return shaderId === "forgeax::default-standard-pbr" || shaderId === SKIN_MATERIAL_SHADER_ID || shaderId === "forgeax::default-standard-pbr-skin";
}
function buildPbrSkinLayouts(device, caps, pbr) {
  const skinMeshArrayBglRes = device.createBindGroupLayout(
    buildBindGroupLayoutDescriptor(BGL_ONLY_SPEC_STUB, {
      kind: "pbr-skin-mesh-array",
      caps
    })
  );
  if (!skinMeshArrayBglRes.ok) throw skinMeshArrayBglRes.error;
  const layouts = [
    pbr.viewBgl,
    pbr.materialBgl,
    skinMeshArrayBglRes.value,
    pbr.instancesBgl
  ];
  const pipelineLayoutRes = device.createPipelineLayout({
    label: "pbr-skin-pl",
    bindGroupLayouts: layouts
  });
  if (!pipelineLayoutRes.ok) throw pipelineLayoutRes.error;
  const probeLayouts = [pbr.viewBgl, pbr.materialBgl, skinMeshArrayBglRes.value, pbr.probeInstancesBgl];
  let probePipelineLayout = null;
  if (caps.storageBuffer) {
    const probePipelineLayoutRes = device.createPipelineLayout({
      label: "pbr-skin-probe-pl",
      bindGroupLayouts: probeLayouts
    });
    if (!probePipelineLayoutRes.ok) throw probePipelineLayoutRes.error;
    probePipelineLayout = probePipelineLayoutRes.value;
  }
  return {
    pipelineLayout: pipelineLayoutRes.value,
    viewBgl: pbr.viewBgl,
    materialBgl: pbr.materialBgl,
    meshArrayBgl: skinMeshArrayBglRes.value,
    instancesBgl: pbr.instancesBgl,
    probeInstancesBgl: pbr.probeInstancesBgl,
    probePipelineLayout,
    bindGroupLayouts: layouts
  };
}
function buildGpuDrivenPbrInstancesBindGroupLayout(device, caps) {
  if (!caps.storageBuffer) {
    throw new Error("GPU-driven PBR instances layout requires storage-buffer capability");
  }
  const result = device.createBindGroupLayout(
    buildBindGroupLayoutDescriptor(BGL_ONLY_SPEC_STUB, {
      kind: "pbr-gpu-driven-instances",
      caps
    })
  );
  if (!result.ok) throw result.error;
  return result.value;
}
function buildSurfaceDirectInstancesBindGroupLayout(device, caps) {
  if (!caps.storageBuffer) {
    throw new Error("Direct Surface instances layout requires storage-buffer capability");
  }
  const result = device.createBindGroupLayout(
    buildBindGroupLayoutDescriptor(BGL_ONLY_SPEC_STUB, {
      kind: "pbr-surface-direct-instances",
      caps
    })
  );
  if (!result.ok) throw result.error;
  return result.value;
}
function buildGpuDrivenPbrPipelineLayout(device, pbr, gpuDrivenInstancesBgl) {
  const result = device.createPipelineLayout({
    label: "pbr-gpu-driven-pl",
    bindGroupLayouts: [pbr.viewBgl, pbr.materialBgl, pbr.meshArrayBgl, gpuDrivenInstancesBgl]
  });
  if (!result.ok) throw result.error;
  return result.value;
}
function buildGpuDrivenPbrSkinPipelineLayout(device, pbrSkin, gpuDrivenInstancesBgl) {
  const result = device.createPipelineLayout({
    label: "pbr-skin-gpu-driven-pl",
    bindGroupLayouts: [
      pbrSkin.viewBgl,
      pbrSkin.materialBgl,
      pbrSkin.meshArrayBgl,
      gpuDrivenInstancesBgl
    ]
  });
  if (!result.ok) throw result.error;
  return result.value;
}
function createPbrSkinMeshBindGroupEntries(meshBuffer, meshSize, paletteBuffer, paletteWindowBytes) {
  return [
    {
      binding: 0,
      resource: { kind: "buffer", value: { buffer: meshBuffer, offset: 0, size: meshSize } }
    },
    ...[1, 2].map((binding) => ({
      binding,
      resource: {
        kind: "buffer",
        value: {
          buffer: paletteBuffer,
          offset: 0,
          size: paletteWindowBytes
        }
      }
    }))
  ];
}
function pbrSkinMeshDynamicOffsets(meshOffset, paletteOffset) {
  return [meshOffset, paletteOffset, paletteOffset];
}
var SPRITE_PASS_PER_INSTANCE_REGION_VARIANT_SET = "";
function createHdrpBindGroupLayoutDescriptor(storageBuffer = true) {
  const meshBufType = storageBuffer ? "read-only-storage" : "uniform";
  const clusterBufType = "read-only-storage";
  return {
    label: "hdrp-unified-bgl-group2",
    entries: [
      {
        binding: 0,
        // Standard fragment lighting (transmission/refraction and clustered
        // evaluation) reads the same mesh transform window as the vertex
        // stage. Keep this visibility in the HDRP descriptor aligned with
        // the URP mesh-array descriptor; restricting it to vertex makes the
        // HDRP pipeline invalid when fs_main accesses `meshes[0]`.
        visibility: GPU_SHADER_STAGE_VERTEX | GPU_SHADER_STAGE_FRAGMENT,
        buffer: { type: meshBufType, hasDynamicOffset: true }
      },
      // Bindings 1 and 2 stay absent for the URP physical isolation gap.
      ...storageBuffer ? [
        {
          binding: 3,
          visibility: GPU_SHADER_STAGE_FRAGMENT,
          buffer: { type: clusterBufType, hasDynamicOffset: false }
        },
        {
          binding: 4,
          visibility: GPU_SHADER_STAGE_FRAGMENT,
          buffer: { type: clusterBufType, hasDynamicOffset: false }
        },
        {
          binding: 5,
          visibility: GPU_SHADER_STAGE_FRAGMENT,
          buffer: { type: clusterBufType, hasDynamicOffset: false }
        }
      ] : [
        {
          binding: 3,
          visibility: GPU_SHADER_STAGE_FRAGMENT,
          texture: {
            sampleType: "uint",
            viewDimension: "2d",
            multisampled: false
          }
        }
      ],
      {
        binding: 6,
        visibility: GPU_SHADER_STAGE_FRAGMENT,
        buffer: { type: "uniform", hasDynamicOffset: false }
      },
      ...storageBuffer ? [
        {
          binding: 7,
          visibility: GPU_SHADER_STAGE_FRAGMENT,
          texture: {
            sampleType: "float",
            viewDimension: "2d",
            multisampled: false
          }
        },
        {
          binding: 8,
          visibility: GPU_SHADER_STAGE_FRAGMENT,
          sampler: { type: "filtering" }
        }
      ] : []
    ]
  };
}
function createHdrpSkinBindGroupLayoutDescriptor(storageBuffer = true) {
  const base = createHdrpBindGroupLayoutDescriptor(storageBuffer);
  const baseEntries = base.entries;
  if (baseEntries === void 0 || baseEntries[0] === void 0) {
    throw new Error("HDRP base group(2) layout must declare mesh binding 0");
  }
  const paletteType = storageBuffer ? "read-only-storage" : "uniform";
  return {
    label: "hdrp-skin-unified-bgl-group2",
    entries: [
      baseEntries[0],
      {
        binding: 1,
        visibility: GPU_SHADER_STAGE_VERTEX,
        buffer: { type: paletteType, hasDynamicOffset: true }
      },
      {
        binding: 2,
        visibility: GPU_SHADER_STAGE_VERTEX,
        buffer: { type: paletteType, hasDynamicOffset: true }
      },
      ...baseEntries.slice(1)
    ]
  };
}
function resolveMaterialParamSchema(spec, options) {
  if (options.materialParamSchema !== void 0) return options.materialParamSchema;
  if (options.registry !== void 0) {
    const lookup = options.registry.findMaterialArtifact(spec.shader.id);
    if (lookup.ok) return lookup.value.paramSchema;
  }
  return void 0;
}
function buildBindGroupLayoutDescriptor(spec, options) {
  switch (options.kind) {
    case "pbr-view": {
      const caps = options.caps ?? { storageBuffer: true };
      return {
        label: "pbr-view-bgl",
        entries: buildPbrViewBglEntries(caps)
      };
    }
    case "pbr-mesh-array": {
      const caps = options.caps ?? { storageBuffer: true };
      const meshBufType = caps.storageBuffer ? "read-only-storage" : "uniform";
      return {
        label: "pbr-mesh-array-bgl",
        entries: [
          {
            binding: 0,
            visibility: GPU_SHADER_STAGE_VERTEX | GPU_SHADER_STAGE_FRAGMENT,
            buffer: { type: meshBufType, hasDynamicOffset: true }
          }
        ]
      };
    }
    case "pbr-instances": {
      const caps = options.caps ?? { storageBuffer: true };
      const meshBufType = caps.storageBuffer ? "read-only-storage" : "uniform";
      const entries2 = [
        {
          binding: 0,
          visibility: GPU_SHADER_STAGE_VERTEX,
          buffer: { type: meshBufType, hasDynamicOffset: false }
        },
        ...caps.probeBlend === true ? [
          {
            // Per-object fragment lane; the record is always exactly 160B.
            binding: 1,
            visibility: GPU_SHADER_STAGE_FRAGMENT,
            buffer: { type: meshBufType, hasDynamicOffset: true }
          }
        ] : []
      ];
      return {
        label: caps.probeBlend === true ? "pbr-probe-instances-bgl" : "pbr-instances-bgl",
        entries: entries2.map(
          (entry) => entry.binding === 0 ? {
            ...entry,
            // Standard transmission reads the same per-instance transform in
            // fs_main to convert glTF unit-space thickness into world metres.
            visibility: GPU_SHADER_STAGE_VERTEX | GPU_SHADER_STAGE_FRAGMENT
          } : entry
        )
      };
    }
    case "pbr-gpu-driven-instances": {
      const caps = options.caps ?? { storageBuffer: true };
      const meshBufType = caps.storageBuffer ? "read-only-storage" : "uniform";
      return {
        label: "pbr-gpu-driven-instances-bgl",
        entries: [
          {
            binding: 0,
            visibility: GPU_SHADER_STAGE_VERTEX,
            buffer: { type: meshBufType, hasDynamicOffset: false }
          },
          {
            // ProbeBlend is fragment-only. Both scene-index color and shadow
            // vertex stages read the visible row through binding(2).
            binding: 1,
            visibility: GPU_SHADER_STAGE_FRAGMENT,
            buffer: { type: meshBufType, hasDynamicOffset: false }
          },
          {
            binding: 2,
            visibility: GPU_SHADER_STAGE_VERTEX,
            buffer: { type: meshBufType, hasDynamicOffset: false }
          },
          {
            // Generic Surface dynamic pages are read by authored Surface
            // accessors. The binding is present for every scene-index group
            // so Standard and custom Surface batches share one owner shape.
            binding: 3,
            visibility: GPU_SHADER_STAGE_FRAGMENT,
            buffer: { type: meshBufType, hasDynamicOffset: false }
          },
          {
            // Frame time, explicit event ranges, and paired background/depth
            // facts use separate read-only pages. This keeps live state out
            // of the material row and leaves skin's address lane untouched.
            binding: 4,
            visibility: GPU_SHADER_STAGE_FRAGMENT,
            buffer: { type: meshBufType, hasDynamicOffset: false }
          },
          {
            // Frame time is one frame-global fact. Keeping it outside the
            // member row prevents a stable frame from issuing one 4-byte
            // queue write for every visible Surface member.
            binding: 5,
            visibility: GPU_SHADER_STAGE_FRAGMENT,
            buffer: { type: "uniform", hasDynamicOffset: false }
          },
          {
            // GPU Scene primitive table. Scene-index vertex stages resolve
            // visible.x (instance row) -> primitive root transform and
            // temporal flags here; binding(0) is the instance table, which
            // this variant declares instead of the direct instance array.
            binding: 6,
            visibility: GPU_SHADER_STAGE_VERTEX,
            buffer: { type: meshBufType, hasDynamicOffset: false }
          },
          {
            // Submitted-frame receiver address indexed by the rigid candidate row.
            binding: 7,
            visibility: GPU_SHADER_STAGE_VERTEX,
            buffer: { type: meshBufType, hasDynamicOffset: false }
          }
        ]
      };
    }
    case "pbr-surface-direct-instances": {
      return {
        label: "pbr-surface-direct-instances-bgl",
        entries: [
          {
            binding: 0,
            // Direct instance transforms are consumed only by vs_main. Keep
            // them out of the fragment-stage storage budget; Surface already
            // needs the retained ProbeBlend/page/frame records there and the
            // portable WebGPU limit is eight storage buffers per stage.
            visibility: GPU_SHADER_STAGE_VERTEX,
            buffer: { type: "read-only-storage", hasDynamicOffset: false }
          },
          {
            binding: 1,
            visibility: GPU_SHADER_STAGE_FRAGMENT,
            buffer: { type: "read-only-storage", hasDynamicOffset: true }
          },
          {
            binding: 3,
            visibility: GPU_SHADER_STAGE_FRAGMENT,
            buffer: { type: "read-only-storage", hasDynamicOffset: false }
          },
          {
            binding: 4,
            visibility: GPU_SHADER_STAGE_FRAGMENT,
            buffer: { type: "read-only-storage", hasDynamicOffset: false }
          },
          {
            binding: 5,
            visibility: GPU_SHADER_STAGE_FRAGMENT,
            buffer: { type: "uniform", hasDynamicOffset: false }
          },
          {
            binding: 6,
            visibility: GPU_SHADER_STAGE_VERTEX,
            buffer: { type: "uniform", hasDynamicOffset: false }
          }
        ]
      };
    }
    case "pbr-skin-mesh-array": {
      const caps = options.caps ?? { storageBuffer: true };
      const meshBufType = caps.storageBuffer ? "read-only-storage" : "uniform";
      return {
        label: "pbr-skin-mesh-array-bgl",
        entries: [
          {
            binding: 0,
            visibility: GPU_SHADER_STAGE_VERTEX | GPU_SHADER_STAGE_FRAGMENT,
            buffer: { type: meshBufType, hasDynamicOffset: true }
          },
          {
            binding: 1,
            visibility: GPU_SHADER_STAGE_VERTEX,
            buffer: { type: meshBufType, hasDynamicOffset: true }
          },
          {
            binding: 2,
            visibility: GPU_SHADER_STAGE_VERTEX,
            buffer: { type: meshBufType, hasDynamicOffset: true }
          }
        ]
      };
    }
    case "pbr-material-merged": {
      const resolvedSchema = resolveMaterialParamSchema(spec, options);
      const effectiveSchema = resolvedSchema ?? STANDARD_PIPELINE_PARAM_SCHEMA;
      const physicalFields = physicalTextureFields(effectiveSchema);
      const userRegionSchema = isCanonicalStandardPbrMaterialShader(spec.shader.id) ? STANDARD_PIPELINE_PARAM_SCHEMA.map(
        (field) => effectiveSchema.find(
          (entry) => entry.name === field.name && entry.type === field.type && entry.type.startsWith("texture")
        ) ?? field
      ) : effectiveSchema;
      const userRegion = buildPbrMaterialUserRegionEntries(
        userRegionSchema,
        [],
        isStandardPbrMaterialShader(spec.shader.id) || spec.shader.id === SHADOW_CASTER_SHADER_ID ? ["displacementTexture"] : []
      );
      const afterIbl = [...userRegion, ...appendInjection(userRegion, "ibl")];
      const afterTransmission = [...afterIbl, ...appendInjection(afterIbl, "transmission")];
      const engineRegion = options.caps?.transmissionBackdrop === false && spec.shader.id !== "forgeax::single-layer-medium" ? afterIbl : afterTransmission;
      const afterSurfaceMedium = spec.shader.id === "forgeax::single-layer-medium" ? [...engineRegion, ...appendSingleLayerMediumInjection(engineRegion)] : engineRegion;
      const merged = [...afterSurfaceMedium, ...appendTextureInjection(effectiveSchema)];
      if (options.caps?.storageBuffer ?? true) {
        merged.push({
          binding: 46,
          visibility: GPU_SHADER_STAGE_VERTEX | GPU_SHADER_STAGE_FRAGMENT,
          buffer: { type: "read-only-storage", hasDynamicOffset: false }
        });
      }
      const entries2 = [
        ...merged,
        ...materialUsesDirectDfgLut(effectiveSchema) ? [
          {
            binding: STANDARD_DIRECT_DFG_LUT_BINDING,
            visibility: GPU_SHADER_STAGE_FRAGMENT,
            texture: { sampleType: "float", viewDimension: "2d" }
          }
        ] : [],
        ...spec.shader.id === "forgeax::single-layer-medium" ? [] : [
          {
            binding: 47,
            visibility: GPU_SHADER_STAGE_FRAGMENT,
            texture: { sampleType: "float", viewDimension: "2d" }
          }
        ]
      ];
      const excluded = omittedStandardMaterialBindings(
        [
          ...derive(userRegionSchema.filter((field) => !physicalFields.includes(field.name))).textureFieldNames
        ],
        options.caps?.transmissionBackdrop !== false || spec.shader.id === "forgeax::single-layer-medium",
        isStandardPbrMaterialShader(spec.shader.id),
        isCanonicalStandardPbrMaterialShader(spec.shader.id),
        sharedMaterialBindingDeclarations(options.registry, spec.shader.id),
        userRegion.length
      );
      return {
        label: "pbr-material-skylight-bgl",
        entries: entries2.filter((entry) => !excluded.has(entry.binding))
      };
    }
    case "unlit-material": {
      const resolvedSchema = resolveMaterialParamSchema(spec, options);
      return {
        label: "unlit-material-bgl",
        entries: buildPbrMaterialUserRegionEntries(resolvedSchema)
      };
    }
    case "hdrp-7-slot": {
      const desc = createHdrpBindGroupLayoutDescriptor(options.caps?.storageBuffer ?? true);
      return {
        label: desc.label ?? "hdrp-unified-bgl-group2",
        entries: [...desc.entries ?? []]
      };
    }
    case "fullscreen-post":
    case "fullscreen-post-with-params":
    case "fullscreen-post-with-scene-depth":
    case "fullscreen-post-with-scene-depth-msaa":
    case "fullscreen-post-with-paired-msaa": {
      const entries2 = buildFullscreenPostInputEntries(
        spec,
        options.kind === "fullscreen-post-with-paired-msaa"
      );
      if (options.kind !== "fullscreen-post") {
        entries2.push({
          binding: 2,
          visibility: GPU_SHADER_STAGE_FRAGMENT,
          buffer: { type: "uniform" }
        });
      }
      if (options.kind !== "fullscreen-post" && options.kind !== "fullscreen-post-with-params") {
        entries2.push(
          {
            binding: 3,
            visibility: GPU_SHADER_STAGE_FRAGMENT,
            texture: {
              sampleType: "depth",
              viewDimension: "2d",
              ...options.kind === "fullscreen-post-with-scene-depth" ? {} : { multisampled: true }
            }
          },
          {
            binding: 4,
            visibility: GPU_SHADER_STAGE_FRAGMENT,
            sampler: { type: "non-filtering" }
          }
        );
      }
      return { label: `${options.kind}-bgl`, entries: entries2 };
    }
  }
}
function buildFullscreenPostInputEntries(spec, multisampled) {
  const inputFormat = spec.attachments.depthFormat ?? spec.attachments.colorFormats[0];
  const sampleType = multisampled ? "unfilterable-float" : inputFormat === "depth32float" || inputFormat === "depth24plus" || inputFormat === "depth32float-stencil8" || inputFormat === "depth24plus-stencil8" || inputFormat === "depth16unorm" ? "depth" : inputFormat === "r32float" ? "unfilterable-float" : "float";
  return [
    {
      binding: 0,
      visibility: GPU_SHADER_STAGE_FRAGMENT,
      texture: { sampleType, viewDimension: "2d", ...multisampled ? { multisampled: true } : {} }
    },
    {
      binding: 1,
      visibility: GPU_SHADER_STAGE_FRAGMENT,
      sampler: {
        type: sampleType === "depth" ? "comparison" : "filtering"
      }
    }
  ];
}

// sdk/engine/node_modules/@forgeax/engine-render/src/record/helpers.ts
function variantSetFromDefines(defines) {
  if (defines === void 0) return void 0;
  const entries2 = Object.entries(defines);
  if (entries2.length === 0) return void 0;
  return entries2.sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([name, value]) => `${name}=${value}`).join("+");
}
function selectLazyEquirectHandles(skylight, skybox) {
  return [.../* @__PURE__ */ new Set([skylight?.equirectHandle ?? 0, skybox?.equirectHandle ?? 0])].filter(
    (handle) => handle !== 0
  );
}
function warnMultiLightDirectional(frameState, directionalCount, envOverride) {
  if (!frameState.warnedMultiLightDirectional && directionalCount > 1) {
    frameState.warnedMultiLightDirectional = true;
    const env = envOverride ?? globalThis.process;
    if (env?.env?.NODE_ENV !== "production") {
      console.warn(
        "[forgeax] render-system-multi-light directional: at most 1 entity (got N=" + directionalCount + "). First entity used; rest dropped.",
        {
          code: "render-system-multi-light",
          expected: "at most 1 directional",
          detail: { type: "directional", got: directionalCount }
        }
      );
    }
  }
}
function warnMultiSkylight(frameState, skylightCount, winningEntityHandle) {
  if (!frameState.warnedMultiSkylight && skylightCount > 1) {
    frameState.warnedMultiSkylight = true;
    console.warn(
      `[forgeax] Skylight: ${skylightCount} Skylight entities found; using entity ${winningEntityHandle} (first by archetype order) for IBL ambient. The other ${skylightCount - 1} Skylight ${skylightCount - 1 === 1 ? "entity is" : "entities are"} ignored. Keep a single Skylight per scene, or reorder so the intended one is first.`
    );
  }
}
function warnMultiSkybox(frameState, skyboxCount, winningEntityHandle) {
  if (!frameState.warnedMultiSkybox && skyboxCount > 1) {
    frameState.warnedMultiSkybox = true;
    console.warn(
      `[forgeax] SkyboxBackground: ${skyboxCount} SkyboxBackground entities found; using entity ${winningEntityHandle} (first by archetype order). The other ${skyboxCount - 1} ${skyboxCount - 1 === 1 ? "entity is" : "entities are"} ignored. Keep a single SkyboxBackground per scene.`
    );
  }
}
function driveLazyEquirectProjection(internals, world, frameState, equirectHandle) {
  const store = internals.gpuStore;
  const handle = equirectHandle;
  const failure2 = store.getCubemapFailure(handle, world);
  if (failure2 !== void 0) {
    if (!frameState.firedEquirectProjectionFailedHandles.has(equirectHandle)) {
      frameState.firedEquirectProjectionFailedHandles.add(equirectHandle);
      internals.errorRegistry.fire(new EquirectProjectionFailedError(equirectHandle, failure2));
    }
    return;
  }
  if (store.getCubemapStatus(handle, world) !== void 0) return;
  const podRes = world.resolveAsset(handle);
  if (!podRes.ok || podRes.value.kind !== "equirect") {
    return;
  }
  void store._uploadCubemapFromEquirect(world, handle, podRes.value);
}
function isLitMaterialSnapshot(material) {
  return isStandardPbrMaterialShader(material.materialShaderId);
}
function computeViewMatrix(camera) {
  const cameraFromWorld = mat45.create();
  mat45.invert(cameraFromWorld, camera.world);
  return cameraFromWorld;
}
function computeProjectionMatrix(camera) {
  if (camera.captureProjection !== void 0) {
    const projection = mat45.create();
    projection.set(camera.captureProjection);
    return projection;
  }
  return cameraLensProjection(camera);
}

// sdk/engine/node_modules/@forgeax/engine-render/src/texture-digest.ts
import { fnv1a32 } from "@forgeax/engine-types";

// sdk/engine/node_modules/@forgeax/engine-render/src/buffer-bytes.ts
var SIDE_BYTES = 1048576;
var MIN_BYTES = 4096;
var kernel;
function equalityKernel() {
  if (kernel !== void 0) return kernel === false ? void 0 : kernel;
  kernel = false;
  if (typeof WebAssembly === "undefined") return void 0;
  try {
    const memory = new WebAssembly.Memory({ initial: 32, maximum: 32 });
    const module = new WebAssembly.Module(
      new Uint8Array([
        0,
        97,
        115,
        109,
        1,
        0,
        0,
        0,
        1,
        8,
        1,
        96,
        3,
        127,
        127,
        127,
        1,
        127,
        2,
        16,
        1,
        3,
        101,
        110,
        118,
        6,
        109,
        101,
        109,
        111,
        114,
        121,
        2,
        1,
        32,
        32,
        3,
        2,
        1,
        0,
        7,
        9,
        1,
        5,
        101,
        113,
        117,
        97,
        108,
        0,
        0,
        10,
        59,
        1,
        57,
        1,
        1,
        127,
        2,
        64,
        3,
        64,
        32,
        3,
        32,
        2,
        79,
        13,
        1,
        32,
        0,
        32,
        3,
        106,
        253,
        0,
        4,
        0,
        32,
        1,
        32,
        3,
        106,
        253,
        0,
        4,
        0,
        253,
        35,
        253,
        99,
        69,
        4,
        64,
        65,
        0,
        15,
        11,
        32,
        3,
        65,
        16,
        106,
        33,
        3,
        12,
        0,
        11,
        11,
        65,
        1,
        11
      ])
    );
    const instance = new WebAssembly.Instance(module, { env: { memory } });
    kernel = {
      bytes: new Uint8Array(memory.buffer),
      equal: instance.exports.equal
    };
    return kernel;
  } catch {
    return void 0;
  }
}
function compareBufferBytes(first, firstOffset, second, secondOffset, byteLength) {
  if (byteLength < MIN_BYTES || !(first instanceof ArrayBuffer) || !(second instanceof ArrayBuffer))
    return void 0;
  const current = equalityKernel();
  if (current === void 0) return void 0;
  const a = new Uint8Array(first, firstOffset, byteLength);
  const b = new Uint8Array(second, secondOffset, byteLength);
  for (let index = 0; index < 64; index++) if (a[index] !== b[index]) return false;
  const aligned = byteLength - byteLength % 16;
  for (let offset = 0; offset < aligned; offset += SIDE_BYTES) {
    const length = Math.min(SIDE_BYTES, aligned - offset);
    current.bytes.set(a.subarray(offset, offset + length), 0);
    current.bytes.set(b.subarray(offset, offset + length), SIDE_BYTES);
    if (current.equal(0, SIDE_BYTES, length) === 0) return false;
  }
  for (let index = aligned; index < byteLength; index++) if (a[index] !== b[index]) return false;
  return true;
}

// sdk/engine/node_modules/@forgeax/engine-render/src/texture-digest.ts
var MAX_BYTES = 1048576;
var MAX_ENTRIES = 4;
var entries = /* @__PURE__ */ new Map();
var typedArrayPrototype = Object.getPrototypeOf(Uint8Array.prototype);
var bufferOf = Object.getOwnPropertyDescriptor(typedArrayPrototype, "buffer")?.get;
var offsetOf = Object.getOwnPropertyDescriptor(typedArrayPrototype, "byteOffset")?.get;
var lengthOf = Object.getOwnPropertyDescriptor(typedArrayPrototype, "byteLength")?.get;
var iterator = Object.getOwnPropertyDescriptor(typedArrayPrototype, Symbol.iterator)?.value;
function ordinaryBytes(data) {
  if (!ArrayBuffer.isView(data)) return void 0;
  try {
    if (Object.getPrototypeOf(data) !== Uint8Array.prototype || Object.getOwnPropertyDescriptor(data, Symbol.iterator) !== void 0 || Object.getOwnPropertyDescriptor(Uint8Array.prototype, Symbol.iterator) !== void 0 || Object.getOwnPropertyDescriptor(typedArrayPrototype, Symbol.iterator)?.value !== iterator)
      return void 0;
    const buffer = bufferOf?.call(data);
    const byteLength = lengthOf?.call(data);
    if (!(buffer instanceof ArrayBuffer) || byteLength < 4096 || byteLength > MAX_BYTES)
      return void 0;
    return new Uint8Array(buffer, offsetOf?.call(data), byteLength);
  } catch {
    return void 0;
  }
}
function equal(first, second) {
  if (first.byteLength !== second.byteLength) return false;
  const compared = compareBufferBytes(
    first.buffer,
    first.byteOffset,
    second.buffer,
    second.byteOffset,
    first.byteLength
  );
  if (compared !== void 0) return compared;
  for (let index = 0; index < first.byteLength; index++)
    if (first[index] !== second[index]) return false;
  return true;
}
function textureDigest(texture) {
  const data = texture.data;
  const bytes = ordinaryBytes(data);
  const previous = bytes === void 0 ? void 0 : entries.get(texture);
  if (bytes !== void 0 && previous !== void 0 && equal(bytes, previous.bytes))
    return previous.digest;
  const hash = fnv1a32(data);
  const digest = `fnv1a:${hash.toString(16).padStart(8, "0")}`;
  if (bytes !== void 0) {
    if (!entries.has(texture) && entries.size === MAX_ENTRIES)
      entries.delete(entries.keys().next().value);
    entries.set(texture, { bytes: new Uint8Array(bytes), digest });
  } else entries.delete(texture);
  return digest;
}

// sdk/engine/node_modules/@forgeax/engine-render/src/render-system-extract.ts
import {
  assertMaterialStaticSelection,
  findMaterialPassProgram,
  materialParametersToParamSchema as projectMaterialParametersToParamSchema,
  runtimeMaterialShaderId as runtimeMaterialShaderId2,
  selectMaterialPassProgram
} from "@forgeax/engine-assets-runtime";
import {
  Time as Time2
} from "@forgeax/engine-ecs";
import { readRenderArrayView, routeWorldError } from "@forgeax/engine-ecs/projection";
import { mat4 as mat46, vec3 as vec33 } from "@forgeax/engine-math";
import { AssetGuid as AssetGuid2 } from "@forgeax/engine-pack/guid";
import { RhiError as RhiError2 } from "@forgeax/engine-rhi";
import { GlobalTransform, readPresentationWorldMatrix, Transform as Transform2 } from "@forgeax/engine-scene";
import {
  DEFAULT_SPRITE_PARAM_SCHEMA,
  DEFAULT_STANDARD_PBR_PARAM_SCHEMA,
  DEFAULT_STANDARD_SURFACE_MODULE,
  rayMaterialNeedsCoverage,
  STANDARD_PIPELINE_PARAM_SCHEMA as STANDARD_PIPELINE_PARAM_SCHEMA2,
  standardProjectionMask,
  standardSampleReuseMask,
  standardTextureMask as standardTextureMask2,
  TONEMAP_PARAMS_LAYOUT
} from "@forgeax/engine-shader";
import { derive as derive2, materialValuesToLinearRuntime, toShared } from "@forgeax/engine-types";

// sdk/engine/node_modules/@forgeax/engine-render/src/extract/directional-shadow-projection.ts
function projectDirectionalShadow(fits, mapSize, shadowFilter, shadowAngularRadius, maxPenumbraTexels) {
  if (!Number.isFinite(mapSize) || mapSize < 1) return void 0;
  const directionalShadowQuality = directionalShadowQualityFromF32(
    shadowFilter,
    shadowAngularRadius,
    maxPenumbraTexels
  );
  if (directionalShadowQuality === void 0) return void 0;
  const splitPlanes = new Float32Array(16);
  for (let index = 0; index < fits.length && index < 4; index += 1) {
    const fit = fits[index];
    if (fit === void 0) continue;
    const width = Math.abs(fit.maxX - fit.minX);
    const height = Math.abs(fit.maxY - fit.minY);
    const depth = Math.abs(fit.maxZ - fit.minZ);
    const worldUnitsPerTexel = Math.max(width, height, Number.EPSILON) / mapSize;
    const lightDepthWorldSpan = Math.max(depth, Number.EPSILON);
    if (!Number.isFinite(worldUnitsPerTexel) || !Number.isFinite(lightDepthWorldSpan)) {
      return void 0;
    }
    const lane = index * 4;
    splitPlanes[lane] = fit.split;
    splitPlanes[lane + 1] = worldUnitsPerTexel;
    splitPlanes[lane + 2] = lightDepthWorldSpan;
  }
  return { splitPlanes, directionalShadowQuality };
}

// sdk/engine/node_modules/@forgeax/engine-render/src/publication/resource-scope.ts
import {
  runtimeAssetReference,
  runtimeAssetRegistry,
  runtimeAssetSource,
  runtimeAssets
} from "@forgeax/engine-assets-runtime/internal";
import { Time } from "@forgeax/engine-ecs";
import {
  VIDEO_SOURCE_PROVIDER_KEY
} from "@forgeax/engine-graphics-extras";
import { AssetGuid } from "@forgeax/engine-pack/guid";
import { AssetError, err as err16 } from "@forgeax/engine-types";
var worldResources = /* @__PURE__ */ new WeakMap();
function worldRenderResources(world) {
  let view = worldResources.get(world);
  if (view !== void 0) return view;
  const owner = world.assets;
  const records = owner === void 0 ? void 0 : runtimeAssets(owner);
  view = {
    identity: world.identity,
    world,
    resolveAsset: (handle, revision) => records === void 0 ? err16(
      new AssetError({
        code: "asset-reference-invalid",
        expected: "an installed asset owner",
        hint: "create the World with the asset owner before binding asset fields"
      })
    ) : records.resolveAsset(handle, revision),
    assetRevision: (handle) => {
      const version = records?.version(handle);
      return version?.ok ? version.value : void 0;
    },
    get time() {
      return world.getResource(Time);
    },
    get transparentSort() {
      return getTransparentSortConfig(world);
    },
    handleForGuid: (guid) => owner === void 0 ? void 0 : runtimeAssetReference(owner, guid),
    sourceForAsset: (handle) => {
      const guid = owner === void 0 ? void 0 : runtimeAssetSource(owner, handle);
      if (guid === void 0 || owner === void 0) return void 0;
      const sourceKey = runtimeAssetRegistry(owner).sourceKeyOf(guid);
      return { guid, ...sourceKey === void 0 ? {} : { sourceKey } };
    },
    lookupAsset: (guid) => {
      const handle = owner === void 0 ? void 0 : runtimeAssetReference(owner, guid);
      const value = handle === void 0 ? void 0 : records?.resolveAsset(handle);
      return value?.ok ? value.value : void 0;
    },
    videoFrame: (entity, clip) => world.hasResource(VIDEO_SOURCE_PROVIDER_KEY) ? world.getResource(VIDEO_SOURCE_PROVIDER_KEY).getSource(
      entity,
      clip
    ) : void 0
  };
  worldResources.set(world, view);
  return view;
}
function renderAssetRevision(source, handle) {
  return source.assetRevision(handle);
}
function renderTime(source) {
  return source.time;
}
function renderAsset(source, reference) {
  const handle = typeof reference === "number" ? reference : source.handleForGuid(
    typeof reference === "string" ? reference : AssetGuid.format(reference)
  );
  if (handle === void 0) return void 0;
  const payload = source.resolveAsset(handle);
  return payload.ok ? payload.value : void 0;
}

// sdk/engine/node_modules/@forgeax/engine-render/src/systems/pass-selector.ts
var FORWARD_PASS_SELECTOR = Object.freeze({
  LightMode: Object.freeze(["Forward"])
});
var REFRACTION_INNER_PASS_SELECTOR = Object.freeze({
  LightMode: Object.freeze(["Forward"]),
  RefractionLayer: Object.freeze(["0"])
});
var REFRACTION_OUTER_PASS_SELECTOR = Object.freeze({
  LightMode: Object.freeze(["Forward"]),
  RefractionLayer: Object.freeze(["1"])
});
var TRANSMISSION_BACK_PASS_SELECTOR = Object.freeze({
  LightMode: Object.freeze(["TransmissionBack"])
});
var DEFERRED_PASS_SELECTOR = Object.freeze({
  LightMode: Object.freeze(["Deferred"])
});
var COLOR_PASS_SELECTOR = Object.freeze({
  LightMode: Object.freeze(["Deferred", "Forward"])
});
var SHADOW_CASTER_PASS_SELECTOR = Object.freeze({
  LightMode: Object.freeze(["ShadowCaster"])
});
function matchPass(tags, selector) {
  if (selector === FORWARD_PASS_SELECTOR)
    return tags.LightMode === FORWARD_PASS_SELECTOR.LightMode[0];
  if (selector === DEFERRED_PASS_SELECTOR)
    return tags.LightMode === DEFERRED_PASS_SELECTOR.LightMode[0];
  if (selector === SHADOW_CASTER_PASS_SELECTOR)
    return tags.LightMode === SHADOW_CASTER_PASS_SELECTOR.LightMode[0];
  if (selector === COLOR_PASS_SELECTOR) {
    const value = tags.LightMode;
    return value === COLOR_PASS_SELECTOR.LightMode[0] || value === COLOR_PASS_SELECTOR.LightMode[1];
  }
  for (const [key, allowedValues] of Object.entries(selector)) {
    const passValue = tags[key] ?? (key === "RefractionLayer" ? "0" : void 0);
    if (passValue === void 0) return false;
    if (allowedValues.length === 0) return false;
    if (!allowedValues.includes(passValue)) return false;
  }
  return true;
}
function selectPasses(passes, selector) {
  if (Object.keys(selector).length === 0) return passes;
  return passes.filter(
    (p) => matchPass(p.renderState?.tags ?? {}, selector)
  );
}

// sdk/engine/node_modules/@forgeax/engine-render/src/textures/source-token.ts
function renderTextureSourceKey(source) {
  return `${source.owner}:${source.id}`;
}
function isRenderTextureSourceToken(value) {
  if (typeof value !== "object" || value === null) return false;
  const source = value;
  return source.kind === "render-texture-source" && typeof source.owner === "string" && source.owner.length > 0 && Number.isSafeInteger(source.id) && (source.id ?? 0) > 0 && (source.source === "target" || source.source === "canvas" || source.source === "external");
}

// sdk/engine/node_modules/@forgeax/engine-render/src/render-system-extract.ts
import { runtimeMaterialShaderId as runtimeMaterialShaderId3 } from "@forgeax/engine-assets-runtime";
function buildRectAreaWorldFrame(input) {
  const center = vec33.create(input.center[0] ?? 0, input.center[1] ?? 0, input.center[2] ?? 0);
  const axisX = vec33.normalize(
    vec33.create(),
    vec33.create(input.axisX[0] ?? 0, input.axisX[1] ?? 0, input.axisX[2] ?? 0)
  );
  const axisY = vec33.normalize(
    vec33.create(),
    vec33.create(input.axisY[0] ?? 0, input.axisY[1] ?? 0, input.axisY[2] ?? 0)
  );
  const normal = vec33.normalize(vec33.create(), vec33.cross(vec33.create(), axisX, axisY));
  normal[0] = normal[0] === 0 ? 0 : normal[0] ?? 0;
  normal[1] = normal[1] === 0 ? 0 : normal[1] ?? 0;
  normal[2] = normal[2] === 0 ? 0 : normal[2] ?? 0;
  return {
    center,
    axisX,
    axisY,
    normal,
    halfWidth: Math.max(0, input.width * 0.5),
    halfHeight: Math.max(0, input.height * 0.5)
  };
}
function rectAreaFacesPoint(frame, point) {
  const toPoint = vec33.create(
    (point[0] ?? 0) - (frame.center[0] ?? 0),
    (point[1] ?? 0) - (frame.center[1] ?? 0),
    (point[2] ?? 0) - (frame.center[2] ?? 0)
  );
  return vec33.dot(frame.normal, toPoint) > 0;
}
function materialSnapshotContext(contexts, geometry, vertexColor) {
  const key = `${geometry}:${vertexColor}`;
  let context = contexts.get(key);
  if (context === void 0) {
    context = { geometry, vertexColor, cache: /* @__PURE__ */ new Map() };
    contexts.set(key, context);
  }
  return context.cache;
}
function sortDispatchByQueue(entries2) {
  return entries2.slice().sort((a, b) => a.queue - b.queue);
}
var DEFAULT_FORWARD_PASS = {
  name: "forward",
  program: { module: "forgeax::default-unlit", vertexEntry: "vs_main", fragmentEntry: "fs_main" },
  renderState: { tags: { LightMode: "Forward" }, queue: 2e3 }
};
function appendMaterialDispatchEntries(pendingDispatch, passes, entity, materialHandle, renderableIndex, layer, passIndexOffset = 0, materialProgramKeys) {
  const matchedPasses = selectPasses(passes, {});
  for (let pIdx = 0; pIdx < matchedPasses.length; pIdx++) {
    const pass = matchedPasses[pIdx];
    if (pass === void 0) continue;
    const passState = pass.renderState ?? {};
    const authoredShaderId = runtimeMaterialShaderId2(pass.program.module, pass.name);
    const dispatchShaderId = materialProgramKeys === void 0 ? authoredShaderId : materialProgramKeys[pass.name];
    if (materialProgramKeys !== void 0 && dispatchShaderId === void 0)
      throw new Error(`Missing published material program for Pass ${pass.name}`);
    pendingDispatch.push({
      entityIndex: entity,
      materialHandle,
      renderableIndex,
      passIndex: passIndexOffset + pIdx,
      queue: passState.queue ?? 2e3,
      layer,
      // Cooked Forward/Deferred artifacts have different byte identities.
      // Temporal still projects their shared authored geometry/opacity once.
      tags: materialProgramKeys !== void 0 && isCanonicalStandardPbrMaterialShader(authoredShaderId) && passState.tags?.SurfaceKind !== "full-custom" ? {
        ...passState.tags,
        SurfaceKind: "standard",
        ...pass.program.moduleSlots?.surface === void 0 ? {} : { SurfaceModule: pass.program.moduleSlots.surface },
        GeometryVariant: passState.tags?.GeometryVariant ?? (isStandardPbrSkinMaterialShader(authoredShaderId) ? "skinned" : "rigid")
      } : passState.tags ?? {},
      renderState: pipelineRenderState(passState, pass.outputs),
      // Material module identity is already closed in the cooked program.
      // It must never become a draw-time define map.
      defines: void 0,
      vertexEntry: pass.program.vertexEntry,
      fragmentEntry: pass.program.fragmentEntry,
      materialShaderId: dispatchShaderId,
      ...passState.stencilReference !== void 0 && {
        stencilReference: passState.stencilReference
      }
    });
  }
}
function selectCameraTargetViews(candidates, options) {
  const display = candidates.find(
    (candidate2) => candidate2.entityKey === options.displayEntityKey && candidate2.target === void 0
  );
  const rejected = [];
  const ordered = candidates.filter((candidate2) => candidate2.target !== void 0).sort((left, right) => left.worldId - right.worldId || left.entityKey - right.entityKey);
  const auxiliary = [];
  const seenLayers = /* @__PURE__ */ new Map();
  const selectedTargets = /* @__PURE__ */ new Set();
  for (const candidate2 of ordered) {
    const layer = candidate2.targetLayer ?? 0;
    const layers = candidate2.target === void 0 ? void 0 : seenLayers.get(candidate2.target);
    const duplicate = layers?.has(layer) ?? false;
    if (candidate2.target !== void 0) {
      if (layers === void 0) seenLayers.set(candidate2.target, /* @__PURE__ */ new Set([layer]));
      else layers.add(layer);
    }
    if (candidate2.entityKey === options.displayEntityKey) {
      rejected.push({ entityKey: candidate2.entityKey, reason: "display-target" });
      continue;
    }
    if (candidate2.target === void 0 || duplicate) {
      rejected.push({ entityKey: candidate2.entityKey, reason: "duplicate-target" });
      continue;
    }
    if (!selectedTargets.has(candidate2.target) && selectedTargets.size >= Math.max(0, options.budget)) {
      rejected.push({ entityKey: candidate2.entityKey, reason: "budget" });
      continue;
    }
    selectedTargets.add(candidate2.target);
    auxiliary.push(candidate2);
  }
  return {
    display,
    auxiliary: Object.freeze(auxiliary),
    rejected: Object.freeze(rejected)
  };
}
var Severity = Object.freeze({ Error: "error", Warning: "warning" });
function createWorldInternalView(world) {
  return {
    _routeError(error, ctx) {
      routeWorldError(world, error, { systemName: ctx.systemName });
    },
    _getArrayView(entity, component, fieldName) {
      return readRenderArrayView(world, entity, component, fieldName);
    }
  };
}
function resolveCameraTarget(world, raw) {
  if (raw === void 0 || raw <= 0) return void 0;
  const resolved = world.sharedRefs.resolve(
    toShared(Math.round(raw))
  );
  return resolved.ok ? resolved.value : void 0;
}
var BUILTIN_MATERIAL_TEXTURE_FIELDS = [
  ...derive2(DEFAULT_STANDARD_PBR_PARAM_SCHEMA).textureFieldNames
];
var BUILTIN_MATERIAL_TEXTURE_FIELD_SET = new Set(BUILTIN_MATERIAL_TEXTURE_FIELDS);
var BUILTIN_BASE_COLOR_TEXTURE_FIELD_SET = /* @__PURE__ */ new Set(["baseColorTexture"]);
function materialTextureFields(shaderId, fields) {
  if (fields !== void 0 && fields.size > 0) return fields;
  if (shaderId === "forgeax::default-standard-pbr" || shaderId === "forgeax::default-standard-pbr-skin" || shaderId === "forgeax::pbr-skin") {
    return BUILTIN_MATERIAL_TEXTURE_FIELD_SET;
  }
  if (shaderId === "forgeax::default-unlit" || shaderId === "forgeax::sprite" || shaderId === "forgeax::sprite-lit") {
    return BUILTIN_BASE_COLOR_TEXTURE_FIELD_SET;
  }
  return fields;
}
function declaredMaterialTextureFields(shaderId, paramSchema, assets) {
  return materialTextureFields(
    shaderId,
    paramSchema !== void 0 ? derive2(paramSchema).textureFieldNames : shaderId !== void 0 ? assets.materialShaderTextureFieldNames(shaderId) : void 0
  );
}
function collectAuthoredMaterialTextureFields(values, shaderId, paramSchema, assets) {
  const fields = declaredMaterialTextureFields(shaderId, paramSchema, assets);
  if (fields === void 0) return void 0;
  const authored = /* @__PURE__ */ new Set();
  for (const field of fields) {
    if (Object.hasOwn(values, field)) authored.add(field);
  }
  return authored.size === 0 ? void 0 : authored;
}
function collectAuthoredMaterialSamplerFields(values, textureFields) {
  const authored = /* @__PURE__ */ new Set();
  for (const field of textureFields ?? []) {
    if (materialTextureValue(values[field])?.sampler !== void 0) authored.add(field);
  }
  if (Object.hasOwn(values, "sampler") && values.sampler !== void 0) {
    authored.add("baseColorTexture");
  }
  return authored.size === 0 ? void 0 : authored;
}
function materialSurfaceProgramsForMaterial(material, assets, context, effective) {
  if (context === void 0 || context.backend === "webgl2" || context.capability === "uniform-fallback" || context.geometry !== "mesh" || context.instrumentation !== "none")
    return void 0;
  const projection = materialProjectionForSelection(material, assets);
  const pass = material.passes?.find((entry) => entry.name.toLowerCase() === "forward");
  if (projection === void 0 || pass === void 0) return void 0;
  const programs = {};
  for (const surfaceContext of ["ray-hit", "card-capture"]) {
    try {
      const selected = findMaterialPassProgram(projection, pass.name, {
        backend: context.backend,
        capability: "storage-buffer",
        pipeline: "ray",
        geometry: "mesh",
        pass: surfaceContext,
        profile: "forgeax-material-ray-v1",
        toolchain: context.toolchain,
        instrumentation: "none"
      });
      if (selected === void 0) continue;
      Object.assign(programs, {
        [surfaceContext]: surfaceContext === "ray-hit" ? {
          programKey: selected.specializationKey,
          evaluateCoverage: rayMaterialNeedsCoverage(effective)
        } : { programKey: selected.specializationKey }
      });
    } catch (error) {
      if (isMissingMaterialProgram(error) && error.detail?.matches === 0)
        continue;
      throw error;
    }
  }
  return Object.keys(programs).length === 0 ? void 0 : programs;
}
function materialProjectionForSelection(material, assets) {
  const projection = assets.getMaterialProjectionForPayload(material);
  assertMaterialStaticSelection(material.staticSwitches, projection);
  return projection;
}
function materialProgramSelectionsForMaterial(material, assets, context, address = "direct", vertexColorAvailable = false) {
  const projection = materialProjectionForSelection(material, assets);
  if (projection === void 0) return void 0;
  if (context === void 0)
    throw new Error("Published material selection requires renderer-owned compiler context");
  return (material.passes ?? []).map((pass) => {
    const mode = String(
      pass.renderState?.tags?.LightMode ?? pass.name
    );
    const selectedContext = materialProgramContextForPass(context, mode);
    const selected = selectMaterialPassProgram(
      projection,
      pass.name,
      selectedContext,
      address,
      vertexColorAvailable
    );
    return {
      pass: pass.name,
      context: selectedContext,
      specializationKey: selected.specializationKey,
      ...selected.abi === void 0 ? {} : { abi: selected.abi }
    };
  });
}
function materialPublicationForMaterial(material, assets, selected, vertexColorAvailable = false) {
  const projection = materialProjectionForSelection(material, assets);
  if (projection === void 0 || selected === void 0) return void 0;
  return Object.freeze({
    identity: Object.freeze({
      materialGuid: projection.materialGuid,
      publicationGeneration: projection.publicationGeneration,
      specializationKey: projection.specializationKey,
      artifactHash: projection.artifactHash
    }),
    programs: Object.freeze(
      selected.map(
        (program) => Object.freeze({
          pass: program.pass,
          context: Object.freeze({ ...program.context }),
          address: "direct",
          specializationKey: program.specializationKey,
          artifactHash: selectMaterialPassProgram(
            projection,
            program.pass,
            program.context,
            "direct",
            vertexColorAvailable
          ).artifactHash
        })
      )
    )
  });
}
function materialSceneIndexProgramKeysForMaterial(material, assets, context, vertexColorAvailable = false) {
  const projection = materialProjectionForSelection(material, assets);
  if (projection === void 0) return void 0;
  if (context === void 0)
    throw new Error("Published material selection requires renderer-owned compiler context");
  const entries2 = {};
  for (const pass of material.passes ?? []) {
    const mode = String(
      pass.renderState?.tags?.LightMode ?? pass.name
    );
    const selectedContext = materialProgramContextForPass(context, mode);
    try {
      const selected = findMaterialPassProgram(
        projection,
        pass.name,
        selectedContext,
        "scene-index",
        vertexColorAvailable
      );
      if (selected === void 0) continue;
      entries2[pass.name] = {
        specializationKey: selected.specializationKey,
        pass: selectedContext.pass
      };
    } catch (error) {
      if (!isMissingMaterialProgram(error)) throw error;
    }
  }
  return Object.keys(entries2).length === 0 ? void 0 : entries2;
}
function isMissingMaterialProgram(error) {
  return error !== null && typeof error === "object" && error.code === "material-specialization-not-cooked";
}
function materialSurfaceModel(passes, declared) {
  if (declared !== void 0) return declared;
  const authored = runtimeMaterialShaderIdForMaterial(passes, void 0);
  return isCanonicalStandardPbrMaterialShader(authored) && !passes.some(
    (pass) => pass.renderState?.tags?.SurfaceKind === "full-custom"
  ) ? "standard" : void 0;
}
function pipelineRenderState(renderState, outputs) {
  if (renderState === void 0 && outputs === void 0) return void 0;
  const {
    cullMode,
    depthCompare,
    depthWriteEnabled,
    colorWriteMask,
    depthBias,
    depthBiasSlopeScale,
    depthBiasClamp,
    blend,
    alphaToCoverageEnabled,
    stencil,
    stencilReadMask,
    stencilWriteMask,
    frontFace
  } = renderState ?? {};
  if (outputs === void 0 && cullMode === void 0 && depthCompare === void 0 && depthWriteEnabled === void 0 && colorWriteMask === void 0 && depthBias === void 0 && depthBiasSlopeScale === void 0 && depthBiasClamp === void 0 && blend === void 0 && alphaToCoverageEnabled === void 0 && stencil === void 0 && stencilReadMask === void 0 && stencilWriteMask === void 0 && frontFace === void 0) {
    return void 0;
  }
  return {
    ...outputs !== void 0 && { outputs },
    ...cullMode !== void 0 && { cullMode },
    ...depthCompare !== void 0 && { depthCompare },
    ...depthWriteEnabled !== void 0 && { depthWriteEnabled },
    ...colorWriteMask !== void 0 && { colorWriteMask },
    ...depthBias !== void 0 && { depthBias },
    ...depthBiasSlopeScale !== void 0 && { depthBiasSlopeScale },
    ...depthBiasClamp !== void 0 && { depthBiasClamp },
    ...blend !== void 0 && { blend },
    ...alphaToCoverageEnabled !== void 0 && { alphaToCoverageEnabled },
    ...stencil !== void 0 && { stencil },
    ...stencilReadMask !== void 0 && { stencilReadMask },
    ...stencilWriteMask !== void 0 && { stencilWriteMask },
    ...frontFace !== void 0 && { frontFace }
  };
}
function resolveRuntimeAssetReference(world, reference, kind) {
  if (typeof reference === "number") {
    const asset2 = world.resolveAsset(reference);
    return asset2.ok && asset2.value.kind === kind ? reference : void 0;
  }
  const guid = typeof reference === "string" ? reference : AssetGuid2.format(reference);
  const handle = world.handleForGuid(guid);
  if (handle === void 0) return void 0;
  const asset = world.resolveAsset(handle);
  return asset.ok && asset.value.kind === kind ? handle : void 0;
}
function resolveVideoFieldHandle(value, world, _assetsRef) {
  const texture = materialTextureValue(value);
  const reference = texture?.texture ?? value;
  if (typeof reference === "number")
    return resolveRuntimeAssetReference(world, reference, "video");
  const guid = assetReferenceText(reference);
  return guid === void 0 ? void 0 : resolveRuntimeAssetReference(world, guid, "video");
}
function materialTextureValue(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return void 0;
  const textureValue = value;
  return typeof textureValue.texture === "number" || typeof textureValue.texture === "string" || textureValue.texture instanceof Uint8Array || isRenderTextureSourceToken(textureValue.source) ? textureValue : void 0;
}
function assetReferenceText(value) {
  if (typeof value === "string") return value;
  if (value instanceof Uint8Array && isAssetGuidBytes(value)) return AssetGuid2.format(value);
  return void 0;
}
function isAssetGuidBytes(value) {
  return value.byteLength === 16;
}
function materialNormalScale(values) {
  const scale = values.normalScale;
  return Array.isArray(scale) && scale.length === 2 && Number.isFinite(scale[0]) && Number.isFinite(scale[1]) ? [scale[0], scale[1]] : [1, 1];
}
var standardRoughness = STANDARD_PIPELINE_PARAM_SCHEMA2.find(
  (entry) => entry.name === "roughness"
);
var DEFAULT_MATERIAL_ROUGHNESS = Number(
  standardRoughness?.type === "f32" ? standardRoughness.default : void 0
);
function materialValueSnapshot(values) {
  const baseColor = values.baseColor;
  const specularColor = values.specularColor;
  const emissive = values.emissive;
  const paramSnapshot = {};
  for (const [key, value] of Object.entries(values)) {
    if (typeof value === "number" || typeof value === "string") paramSnapshot[key] = value;
    else if (Array.isArray(value) && value.every((entry) => typeof entry === "number")) {
      paramSnapshot[key] = value;
    }
  }
  return {
    baseColor: vec33.create(baseColor?.[0] ?? 1, baseColor?.[1] ?? 1, baseColor?.[2] ?? 1),
    metallic: typeof values.metallic === "number" ? values.metallic : 0,
    roughness: typeof values.roughness === "number" ? values.roughness : DEFAULT_MATERIAL_ROUGHNESS,
    normalScale: materialNormalScale(values),
    ...specularColor !== void 0 && {
      specularColor: [specularColor[0] ?? 1, specularColor[1] ?? 1, specularColor[2] ?? 1]
    },
    ...emissive !== void 0 && {
      emissive: [emissive[0] ?? 0, emissive[1] ?? 0, emissive[2] ?? 0]
    },
    ...typeof values.emissiveIntensity === "number" && {
      emissiveIntensity: values.emissiveIntensity
    },
    ...typeof values.occlusionStrength === "number" && {
      occlusionStrength: values.occlusionStrength
    },
    paramSnapshot
  };
}
function materialTextureRef(value) {
  return materialTextureValue(value)?.texture ?? value;
}
function collectMaterialTextureCoordinates(values) {
  const out = /* @__PURE__ */ new Map();
  for (const [field, value] of Object.entries(values)) {
    if (!field.endsWith("Texture")) continue;
    const coordinates = materialTextureValue(value)?.coordinates;
    if (coordinates !== void 0) out.set(field, coordinates);
  }
  return out;
}
function materialTextureSourceFields(schema2) {
  if (schema2 === void 0) return void 0;
  const fields = /* @__PURE__ */ new Set();
  for (const entry of schema2) {
    if (entry.type.startsWith("texture")) fields.add(entry.name);
  }
  return fields;
}
function collectMaterialTextureSources(values, textureFields, stats) {
  const out = /* @__PURE__ */ new Map();
  for (const [field, value] of Object.entries(values)) {
    if (textureFields !== void 0 && !textureFields.has(field)) continue;
    if (stats !== void 0) stats.sourceFieldsVisited += 1;
    const source = materialTextureValue(value)?.source;
    if (!isRenderTextureSourceToken(source)) continue;
    if (stats !== void 0) {
      stats.producerRoutes[source.source] = (stats.producerRoutes[source.source] ?? 0) + 1;
    }
    out.set(field, source);
  }
  return out;
}
function collectMaterialTextureSamplers(values, resolveSampler) {
  const out = /* @__PURE__ */ new Map();
  for (const [field, value] of Object.entries(values)) {
    const sampler = resolveSampler(materialTextureValue(value)?.sampler);
    if (sampler !== void 0) out.set(field, sampler);
  }
  const legacySampler = resolveSampler(values.sampler);
  if (legacySampler !== void 0 && !out.has("baseColorTexture")) {
    out.set("baseColorTexture", legacySampler);
  }
  return out;
}
function collectUserRegionTextureHandles(pv, shaderId, paramSchema, assetsRef, world, resolveTex, videoOut) {
  const fields = materialTextureFields(
    shaderId,
    paramSchema !== void 0 ? derive2(paramSchema).textureFieldNames : shaderId !== void 0 ? assetsRef.materialShaderTextureFieldNames(shaderId) : void 0
  ) ?? BUILTIN_MATERIAL_TEXTURE_FIELDS;
  const out = /* @__PURE__ */ new Map();
  for (const field of fields) {
    const videoHandle = resolveVideoFieldHandle(pv[field], world, assetsRef);
    if (videoHandle !== void 0) {
      videoOut.set(field, videoHandle);
      continue;
    }
    const handle = resolveTex(materialTextureRef(pv[field]), "texture");
    if (handle !== void 0) out.set(field, handle);
  }
  return out;
}
function sameSampleCoordinates(a, b) {
  return (a?.set ?? 0) === (b?.set ?? 0) && (a?.transform?.offset?.[0] ?? 0) === (b?.transform?.offset?.[0] ?? 0) && (a?.transform?.offset?.[1] ?? 0) === (b?.transform?.offset?.[1] ?? 0) && (a?.transform?.scale?.[0] ?? 1) === (b?.transform?.scale?.[0] ?? 1) && (a?.transform?.scale?.[1] ?? 1) === (b?.transform?.scale?.[1] ?? 1) && (a?.transform?.rotation ?? 0) === (b?.transform?.rotation ?? 0) && (a?.physicalUvScale?.[0] ?? 1) === (b?.physicalUvScale?.[0] ?? 1) && (a?.physicalUvScale?.[1] ?? 1) === (b?.physicalUvScale?.[1] ?? 1);
}
function materialStandardTextureMask(parameters, shaderId, values, sampling) {
  if (!isCanonicalStandardPbrMaterialShader(shaderId) && shaderId !== "forgeax::default-shadow-caster")
    return void 0;
  const presence = standardTextureMask2(
    // Canonical materials may provide values without redeclaring the root
    // schema. Pruning must agree with the texture binder in that route too.
    DEFAULT_STANDARD_PBR_PARAM_SCHEMA.filter(
      (entry) => entry.type === "texture2d" && (values[entry.name] !== void 0 || parameters?.some(
        (parameter) => parameter.name === entry.name && parameter.default !== void 0
      ))
    )
  );
  const projection = standardProjectionMask(
    (name) => values[name] ?? parameters?.find((parameter) => parameter.name === name)?.default
  );
  if (sampling === void 0) return presence + projection;
  return presence + projection + standardSampleReuseMask(presence, (source, target) => {
    const texture = sampling.textureHandles.get(source);
    if (texture === void 0 || texture !== sampling.textureHandles.get(target)) return false;
    if (sampling.samplerHandles.get(source) !== sampling.samplerHandles.get(target)) return false;
    return sameSampleCoordinates(
      sampling.textureCoordinates.get(source),
      sampling.textureCoordinates.get(target)
    );
  });
}
function materialParametersToParamSchema(parameters, shaderId, registeredParamSchema) {
  if (isCanonicalStandardPbrMaterialShader(shaderId)) return STANDARD_PIPELINE_PARAM_SCHEMA2;
  if (registeredParamSchema !== void 0 && registeredParamSchema.length > 0)
    return registeredParamSchema;
  if (shaderId === "forgeax::sprite" || shaderId === "forgeax::sprite-lit")
    return DEFAULT_SPRITE_PARAM_SCHEMA;
  if (parameters.length === 0) {
    if (registeredParamSchema !== void 0) return registeredParamSchema;
  }
  return projectMaterialParametersToParamSchema(parameters);
}
function materialParamSchemaForMaterial(parameters, selectedShaderId, passes, assets) {
  const firstPass = passes.find(
    (pass) => !/shadow|depth/i.test(
      String(
        pass.renderState?.tags?.LightMode ?? pass.name
      )
    )
  ) ?? passes[0];
  const surfaceModule = firstPass?.program.moduleSlots?.surface;
  const schemaShaderId = surfaceModule === void 0 || surfaceModule === DEFAULT_STANDARD_SURFACE_MODULE ? selectedShaderId : void 0;
  const registered = selectedShaderId === void 0 || schemaShaderId === void 0 && selectedShaderId === runtimeMaterialShaderIdForMaterial(passes, void 0) ? void 0 : assets?.shaderRegistry.materialArtifact(selectedShaderId);
  return materialParametersToParamSchema(parameters, schemaShaderId, registered?.paramSchema);
}
function materialColorParameterSchema(parameters, shaderId, assets) {
  if (shaderId === void 0) return parameters;
  const shader = assets.shaderRegistry.materialArtifact(shaderId);
  const schema2 = materialParametersToParamSchema([], shaderId, shader?.paramSchema);
  if (schema2.length === 0) return parameters;
  const byName = new Map(
    schema2.map((parameter) => [parameter.name, parameter])
  );
  for (const parameter of parameters) byName.set(parameter.name, parameter);
  return [...byName.values()];
}
function readPersistentMaterialSnapshot(cache, handleRaw, world) {
  const entry = cache?.get(handleRaw);
  return entry !== void 0 && renderAssetRevision(world, handleRaw) === entry.assetRevision ? entry : void 0;
}
function storeMaterialSnapshot(cache, handleRaw, snapshot, world, programSelections) {
  const accepted = { ...snapshot, immutableValues: true };
  const previous = cache.get(handleRaw);
  const resource = previous === void 0 ? void 0 : materialResource(previous.snapshot);
  if (resource === void 0) new MaterialResource(accepted);
  else resource.adopt(accepted);
  const entry = {
    snapshot: accepted,
    ...programSelections === void 0 ? {} : { programSelections },
    assetRevision: renderAssetRevision(world, handleRaw) ?? 0
  };
  cache.set(handleRaw, entry);
  return entry;
}
function prepareMaterialSnapshot({
  handle: handleRaw,
  world,
  assets: assetsRef,
  material: programOwner,
  programSelections,
  materialContext,
  textureSourceStats: materialTextureSourceStats,
  vertexColorAvailable = false,
  geometry = materialContext?.geometry ?? "mesh"
}) {
  const resolved = {
    passes: programOwner.passes ?? [],
    parameters: programOwner.parameters ?? [],
    values: programOwner.values ?? {},
    colorSpace: programOwner.colorSpace,
    surface: programOwner.surface
  };
  const allPasses = resolved.passes;
  const materialProgramKeys = programSelections === void 0 ? void 0 : Object.fromEntries(
    programSelections.map(({ pass, specializationKey }) => [pass, specializationKey])
  );
  const materialSceneIndexProgramKeys = materialSceneIndexProgramKeysForMaterial(
    programOwner,
    assetsRef,
    materialContext,
    vertexColorAvailable
  );
  const materialSurfacePrograms = materialSurfaceProgramsForMaterial(
    programOwner,
    assetsRef,
    materialContext,
    resolved
  );
  const firstPassShader = runtimeMaterialShaderIdForMaterial(allPasses, materialProgramKeys);
  const pv = materialValuesToLinearRuntime(
    resolved.values,
    materialColorParameterSchema(resolved.parameters ?? [], firstPassShader, assetsRef),
    resolved.colorSpace
  );
  const valueSnapshot = materialValueSnapshot(pv);
  const paramSnap = valueSnapshot.paramSnapshot;
  const materialParamSchema = materialParamSchemaForMaterial(
    resolved.parameters ?? [],
    firstPassShader,
    allPasses,
    assetsRef
  );
  const resolveTexLike = (value, brand) => {
    if (typeof value === "number") {
      const asset = world.resolveAsset(value);
      return asset.ok && asset.value.kind === brand ? value : void 0;
    }
    const guid = assetReferenceText(value);
    return guid === void 0 ? void 0 : resolveRuntimeAssetReference(world, guid, brand);
  };
  const authoredTextureFields = collectAuthoredMaterialTextureFields(
    resolved.values,
    firstPassShader,
    materialParamSchema.length > 0 ? materialParamSchema : void 0,
    assetsRef
  );
  const authoredSamplerFields = collectAuthoredMaterialSamplerFields(
    resolved.values,
    authoredTextureFields
  );
  const authoredShader = runtimeMaterialShaderIdForMaterial(allPasses, void 0);
  if (authoredShader === "forgeax::sprite" || authoredShader === "forgeax::sprite-lit") {
    const region = paramSnap.region;
    const values = typeof region === "object" ? region : void 0;
    paramSnap.region = spriteUvRegion(values, 0, 0);
    paramSnap.flipX = typeof pv.flipX === "number" ? pv.flipX : 0;
    paramSnap.flipY = typeof pv.flipY === "number" ? pv.flipY : 0;
    paramSnap.slicesAndMode ??= [0, 0, 0, 0];
  }
  const videoTextureFields = /* @__PURE__ */ new Map();
  const textureHandles = collectUserRegionTextureHandles(
    pv,
    firstPassShader,
    materialParamSchema.length > 0 ? materialParamSchema : void 0,
    assetsRef,
    world,
    resolveTexLike,
    videoTextureFields
  );
  const samplerHandles = collectMaterialTextureSamplers(
    pv,
    (value) => resolveTexLike(materialTextureRef(value), "sampler")
  );
  if (authoredShader === "forgeax::sprite" || authoredShader === "forgeax::sprite-lit") {
    const slices = paramSnap.slicesAndMode;
    if (Array.isArray(slices) && (slices[3] ?? 0) < 0) {
      const handle = samplerHandles.get("baseColorTexture");
      const sampler = handle === void 0 ? void 0 : world.resolveAsset(handle);
      if (sampler?.ok && sampler.value.kind === "sampler" && (sampler.value.addressModeU !== "repeat" || sampler.value.addressModeV !== "repeat"))
        assetsRef.metrics?.increment("nineslice.tile-needs-repeat-sampler");
    }
  }
  const textureSources = collectMaterialTextureSources(
    pv,
    materialTextureSourceFields(materialParamSchema.length > 0 ? materialParamSchema : void 0),
    materialTextureSourceStats
  );
  const emissiveTextureHandle = textureHandles.get("emissiveTexture");
  const occlusionTextureHandle = textureHandles.get("occlusionTexture");
  const textureCoordinates = collectMaterialTextureCoordinates(pv);
  const baseColorTextureHandle = textureHandles.get("baseColorTexture");
  const metallicRoughnessTextureHandle = textureHandles.get("metallicRoughnessTexture");
  const normalTextureHandle = textureHandles.get("normalTexture");
  const surfaceModel = materialSurfaceModel(allPasses, resolved.surface?.model);
  const snapshot = {
    materialContext: { geometry, vertexColor: vertexColorAvailable },
    passes: allPasses,
    ...valueSnapshot,
    ...surfaceModel === void 0 ? {} : { surfaceModel },
    deferredPass: allPasses.some(
      (pass) => String(
        pass.renderState?.tags?.LightMode ?? pass.name
      ) === "Deferred"
    ),
    materialShaderId: firstPassShader,
    materialProgramKeys,
    materialEntryPoints: Object.fromEntries(
      allPasses.flatMap((pass) => {
        const key = materialProgramKeys?.[pass.name] ?? runtimeMaterialShaderId2(pass.program.module, pass.name);
        if (key === void 0) return [];
        const shader = assetsRef.shaderRegistry.findMaterialArtifact(key);
        const reads = shader.ok ? shader.value.program.entryPoints : void 0;
        return reads === void 0 ? [] : [[pass.name, reads]];
      })
    ),
    materialPublication: materialPublicationForMaterial(
      programOwner,
      assetsRef,
      programSelections,
      vertexColorAvailable
    ),
    materialSceneIndexProgramKeys,
    materialSurfacePrograms,
    materialHandle: handleRaw,
    renderState: pipelineRenderState(allPasses[0]?.renderState, allPasses[0]?.outputs),
    ...materialParamSchema.length > 0 && { materialParamSchema },
    standardTextureMask: materialStandardTextureMask(resolved.parameters, firstPassShader, pv, {
      textureHandles,
      samplerHandles,
      textureCoordinates
    }),
    ...textureCoordinates.size > 0 && { textureCoordinates },
    ...authoredTextureFields === void 0 ? {} : { authoredTextureFields },
    ...authoredSamplerFields === void 0 ? {} : { authoredSamplerFields },
    ...textureHandles.size > 0 && { textureHandles },
    ...textureSources.size > 0 && { textureSources },
    ...videoTextureFields.size > 0 && { videoTextureFields },
    ...samplerHandles.size > 0 && { samplerHandles },
    ...baseColorTextureHandle !== void 0 && { baseColorTexture: baseColorTextureHandle },
    ...metallicRoughnessTextureHandle !== void 0 && {
      metallicRoughnessTexture: metallicRoughnessTextureHandle
    },
    ...normalTextureHandle !== void 0 && { normalTexture: normalTextureHandle },
    ...emissiveTextureHandle !== void 0 && { emissiveTexture: emissiveTextureHandle },
    ...occlusionTextureHandle !== void 0 && { occlusionTexture: occlusionTextureHandle },
    // feat-city-glb Bug 5 (per-submesh transparency): derive `transparent`
    // from the first pass's `renderState.blend` presence, identical to the
    // entity-level snapshot builder (extractFrame archetype loop). Without
    // this, per-submesh materials (materials[i>=1], e.g. a glTF BLEND decal
    // submesh on a multi-material mesh) never carry the transparent flag, so
    // the record stage's LDR split + blend routing treats them as opaque and
    // their alpha=0 texels composite as black.
    transparent: allPasses[0]?.renderState?.blend !== void 0
  };
  return snapshot;
}
function resolveMaterialSnapshot(handleRaw, world, assetsRef, materialSnapshotCache, persistentMaterialSnapshotCache, materialContext, materialTextureSourceStats, vertexColorAvailable = false, geometry = materialContext?.geometry ?? "mesh") {
  if (world.world?.assets !== void 0) assetsRef = runtimeAssetRegistry2(world.world.assets);
  if (handleRaw === 0) return defaultMaterialSnapshot(handleRaw);
  const cached = materialSnapshotCache?.get(handleRaw);
  if (cached !== void 0) return cached.snapshot;
  const stablePersistentCached = readPersistentMaterialSnapshot(
    persistentMaterialSnapshotCache,
    handleRaw,
    world
  );
  if (stablePersistentCached !== void 0) {
    materialSnapshotCache?.set(handleRaw, stablePersistentCached);
    return stablePersistentCached.snapshot;
  }
  const tagged = handleRaw;
  const res = world.resolveAsset(tagged);
  if (!res.ok) return defaultMaterialSnapshot(handleRaw);
  const asset = res.value;
  if (asset.kind !== "material") return defaultMaterialSnapshot(handleRaw);
  const programSelections = materialProgramSelectionsForMaterial(
    asset,
    assetsRef,
    materialContext,
    "direct",
    vertexColorAvailable
  );
  const snapshot = prepareMaterialSnapshot({
    handle: handleRaw,
    world,
    assets: assetsRef,
    material: asset,
    programSelections,
    materialContext,
    textureSourceStats: materialTextureSourceStats,
    vertexColorAvailable,
    geometry
  });
  const cache = persistentMaterialSnapshotCache ?? materialSnapshotCache;
  const cacheEntry = cache === void 0 ? void 0 : storeMaterialSnapshot(cache, handleRaw, snapshot, world, programSelections);
  if (cacheEntry !== void 0) {
    materialSnapshotCache?.set(handleRaw, cacheEntry);
  }
  return cacheEntry?.snapshot ?? snapshot;
}
function pssmSplit(nearPlane, farPlane, cascadeCount, splitLambda) {
  const EPS = 1e-6;
  if (farPlane <= nearPlane + EPS) {
    throw new ShadowInvalidConfigError("shadowDistance", farPlane, {
      kind: "lower-bound",
      value: nearPlane + EPS,
      operator: ">="
    });
  }
  const result = new Float32Array(cascadeCount);
  const m = cascadeCount;
  const n = nearPlane;
  const f = farPlane;
  const ratio = f / n;
  for (let i = 1; i <= m; i++) {
    const t = i / m;
    const logPart = n * ratio ** t;
    const uniformPart = n + t * (f - n);
    result[i - 1] = splitLambda * logPart + (1 - splitLambda) * uniformPart;
  }
  return result;
}
function buildPointShadowMatrices(lightPos, near, far) {
  return buildCubeCameraFaceViews({ position: lightPos, near, far }).map(({ viewProjection }) => {
    for (const offset of [0, 4, 8, 12]) viewProjection[offset] = -(viewProjection[offset] ?? 0);
    return viewProjection;
  });
}
var DIRECTIONAL_SHADOW_PAGES = 16;
function cascadeSliceSphere(camera, near, far) {
  const world = mat46.invert(mat46.create(), mat46.invert(mat46.create(), camera.world));
  const forward = vec33.normalize(
    vec33.create(),
    vec33.create(-(world[8] ?? 0), -(world[9] ?? 0), -(world[10] ?? 1))
  );
  const origin = vec33.create(world[12] ?? 0, world[13] ?? 0, world[14] ?? 0);
  let depth;
  let radius;
  let offsetX = 0;
  let offsetY = 0;
  if (camera.projection === "orthographic") {
    const halfWidth = (camera.orthoRight - camera.orthoLeft) * 0.5;
    const halfHeight = (camera.orthoTop - camera.orthoBottom) * 0.5;
    offsetX = (camera.orthoRight + camera.orthoLeft) * 0.5 - (camera.projectionOffset?.[0] ?? 0) * halfWidth;
    offsetY = (camera.orthoTop + camera.orthoBottom) * 0.5 - (camera.projectionOffset?.[1] ?? 0) * halfHeight;
    depth = (near + far) * 0.5;
    radius = Math.hypot(halfWidth, halfHeight, (far - near) * 0.5);
  } else {
    const tanY = Math.tan(camera.fov * 0.5);
    const tanX = tanY * camera.aspect;
    const slope = tanX * tanX + tanY * tanY;
    depth = Math.min(far, (near + far) * 0.5 * (1 + slope));
    const shearX = -(camera.projectionOffset?.[0] ?? 0) * tanX;
    const shearY = -(camera.projectionOffset?.[1] ?? 0) * tanY;
    offsetX = shearX * depth;
    offsetY = shearY * depth;
    radius = Math.sqrt((far - depth) ** 2 + far * far * slope) + Math.hypot(shearX, shearY) * far;
  }
  const right = vec33.normalize(
    vec33.create(),
    vec33.create(world[0] ?? 1, world[1] ?? 0, world[2] ?? 0)
  );
  const up = vec33.normalize(
    vec33.create(),
    vec33.create(world[4] ?? 0, world[5] ?? 1, world[6] ?? 0)
  );
  const center = vec33.create(
    (origin[0] ?? 0) + (forward[0] ?? 0) * depth + (right[0] ?? 0) * offsetX + (up[0] ?? 0) * offsetY,
    (origin[1] ?? 0) + (forward[1] ?? 0) * depth + (right[1] ?? 0) * offsetX + (up[1] ?? 0) * offsetY,
    (origin[2] ?? 0) + (forward[2] ?? 0) * depth + (right[2] ?? 0) * offsetX + (up[2] ?? 0) * offsetY
  );
  return { center, radius };
}
function retainedCascadeCovers(retained, current, sphere, casterReach, mapSize, filterRadius, normalBiasWorld) {
  if (retained === void 0 || retained.length !== 16) return false;
  for (let index = 0; index < 12; index += 1) {
    if (retained[index] !== current[index]) return false;
  }
  const center = mat46.transformVec3(vec33.create(), retained, sphere.center);
  const scale = (row) => Math.hypot(retained[row] ?? 0, retained[row + 4] ?? 0, retained[row + 8] ?? 0);
  const edge = 1 - 2 * (filterRadius + SHADOW_RASTER_GUARD_TEXELS) / mapSize;
  const radius = sphere.radius + Math.abs(normalBiasWorld);
  return Math.abs(center[0] ?? Number.NaN) + radius * scale(0) <= edge && Math.abs(center[1] ?? Number.NaN) + radius * scale(1) <= edge && (center[2] ?? Number.NaN) - radius * scale(2) >= 0 && (center[2] ?? Number.NaN) + (radius + casterReach) * scale(2) <= 1;
}
function computeDirectionalCsm(direction, config, cameraData, retainedMatrices, normalBiasWorld = 0.05) {
  const cascadeCount = Math.round(config.cascadeCount);
  const quality = directionalShadowQualityFromF32(
    config.shadowFilter ?? DirectionalLight.fields.shadowFilter.default,
    config.shadowAngularRadius ?? DirectionalLight.fields.shadowAngularRadius.default,
    config.maxPenumbraTexels ?? DirectionalLight.fields.maxPenumbraTexels.default
  );
  if (quality === void 0) return null;
  if (config.shadowViewProjection !== void 0) {
    const matrix = config.shadowViewProjection;
    const rowLength = (row) => Math.hypot(matrix[row] ?? 0, matrix[row + 4] ?? 0, matrix[row + 8] ?? 0);
    const splitPlanes = new Float32Array(16);
    splitPlanes[0] = 34028234663852886e22;
    splitPlanes[1] = 2 / rowLength(0) / config.mapSize;
    splitPlanes[2] = 1 / rowLength(2);
    return {
      lightViewProj: [
        new Float32Array(matrix),
        ...Array.from({ length: 3 }, () => new Float32Array(16))
      ],
      splitPlanes,
      cascadeCount: 1,
      cascadeBlend: 0,
      shadowMapSize: config.mapSize,
      directionalShadowQuality: quality
    };
  }
  const filterRadius = directionalShadowFilterRadiusTexels(quality);
  const sNear = cameraData?.near ?? 0.1;
  const sFar = Math.min(config.shadowDistance, cameraData?.far ?? config.shadowDistance);
  const splits = pssmSplit(sNear, sFar, cascadeCount, config.splitLambda);
  const lightDirN = vec33.normalize(vec33.create(), direction);
  const lightTarget = vec33.create(lightDirN[0] ?? 0, lightDirN[1] ?? 0, lightDirN[2] ?? 0);
  const lightView = mat46.create();
  mat46.lookAt(lightView, vec33.create(0, 0, 0), lightTarget, vec33.create(0, 1, 0));
  if (cameraData === void 0) return null;
  const resultLightViewProjs = [];
  const cascadeFits = [];
  const full = cascadeSliceSphere(cameraData, sNear, sFar);
  const pageTexels = config.mapSize / DIRECTIONAL_SHADOW_PAGES;
  const usableTexels = config.mapSize - 2 * pageTexels;
  for (let cIdx = 0; cIdx < 4; cIdx++) {
    if (cIdx >= cascadeCount) {
      resultLightViewProjs.push(new Float32Array(16));
      continue;
    }
    const previousSplit = splits[cIdx - 1] ?? sNear;
    const cascadeNear = cIdx === 0 ? sNear : Math.max(sNear, previousSplit * (1 - config.cascadeBlend));
    const cascadeFar = splits[cIdx] ?? sFar;
    const sphere = cascadeSliceSphere(cameraData, cascadeNear, cascadeFar);
    const center = vec33.create();
    mat46.transformVec3(center, lightView, sphere.center);
    const texel = 2 * sphere.radius / usableTexels;
    const page = pageTexels * texel;
    const snap = (value) => Math.round(value / page) * page;
    const centerX = snap(center[0] ?? 0);
    const centerY = snap(center[1] ?? 0);
    const centerZ = snap(center[2] ?? 0);
    const half = sphere.radius + page;
    const minX = centerX - half;
    const maxX = centerX + half;
    const minY = centerY - half;
    const maxY = centerY + half;
    const minZ = centerZ - half;
    const nearZ = centerZ + half + 2 * full.radius;
    const orthoProj = mat46.create();
    mat46.orthographicReverseZ(orthoProj, minX, maxX, maxY, minY, -nearZ, -minZ);
    cascadeFits.push({
      split: splits[cIdx] ?? sFar,
      minX,
      maxX,
      minY,
      maxY,
      minZ,
      maxZ: nearZ
    });
    const matrix = new Float32Array(mat46.multiply(mat46.create(), orthoProj, lightView));
    const retained = retainedMatrices?.[cIdx];
    resultLightViewProjs.push(
      retainedCascadeCovers(
        retained,
        matrix,
        sphere,
        2 * full.radius,
        config.mapSize,
        filterRadius,
        normalBiasWorld
      ) ? retained : matrix
    );
  }
  const projection = projectDirectionalShadow(
    cascadeFits,
    config.mapSize,
    config.shadowFilter ?? DirectionalLight.fields.shadowFilter.default,
    config.shadowAngularRadius ?? DirectionalLight.fields.shadowAngularRadius.default,
    config.maxPenumbraTexels ?? DirectionalLight.fields.maxPenumbraTexels.default
  );
  if (projection === void 0) return null;
  return {
    lightViewProj: resultLightViewProjs,
    splitPlanes: projection.splitPlanes,
    cascadeCount,
    cascadeBlend: config.cascadeBlend,
    shadowMapSize: config.mapSize,
    directionalShadowQuality: projection.directionalShadowQuality
  };
}
var ALL_VISIBLE = {
  diagnostics: [],
  hasAnyIntent: false,
  hasAnyHiddenIntent: false,
  get: () => void 0,
  effective: () => "visible"
};
function collectCameraSnapshots(world) {
  const cameras = [];
  const cameraQuery = world.query({
    read: [Camera],
    optional: [
      CameraView,
      MotionBlur,
      DynamicResolution,
      ScreenSpaceReflection,
      AmbientOcclusion,
      DepthOfField,
      BarrelDistortion,
      LensEffects,
      LensFlare,
      ClippingPlanes,
      Outline,
      PlanarReflection,
      StereoCamera
    ],
    with: [Transform2, GlobalTransform]
  }).unwrap();
  for (const row of cameraQuery) {
    const cam = row.get(Camera);
    const cameraView = row.get(CameraView);
    const clipping = extractClippingPlanes(row.get(ClippingPlanes));
    const planar = row.get(PlanarReflection);
    if (planar !== void 0 && cam.target !== 0 && cameraView === void 0)
      throw new PlanarReflectionInvalidError("camera");
    if (planar !== void 0 && (planar.target === 0 || planar.updateIntervalFrames < 1))
      throw new PlanarReflectionInvalidError(
        planar.target === 0 ? "target" : "updateIntervalFrames"
      );
    const motionBlur = row.get(MotionBlur);
    const barrelDistortion = row.get(BarrelDistortion);
    const lensEffects = resolveLensEffects(row.get(LensEffects));
    if (!lensEffects.ok) throw lensEffects.error;
    const lensFlare = resolveLensFlare(row.get(LensFlare));
    if (!lensFlare.ok) throw lensFlare.error;
    const outline = resolveOutline(row.get(Outline));
    if (!outline.ok) throw outline.error;
    const motionBlurResult = resolveMotionBlurParams(motionBlur);
    if (!motionBlurResult.ok) throw motionBlurResult.error;
    const motionBlurParams = motionBlurResult.value;
    const depthOfField = row.get(DepthOfField);
    const dynamicResolution = row.get(DynamicResolution);
    const screenSpaceReflection = row.get(ScreenSpaceReflection);
    const ambientOcclusion = row.get(AmbientOcclusion);
    const projection = cameraProjectionFromF32(cam.projection);
    const depthOfFieldResult = resolveDepthOfFieldParams(depthOfField, {
      projection,
      fov: cam.fov,
      near: cam.near,
      far: cam.far
    });
    const depthOfFieldError = depthOfFieldResult.ok ? void 0 : depthOfFieldRequestFailure(depthOfFieldResult.error);
    const entity = row.entity;
    const view = readPresentationWorldMatrix(world, entity);
    if (view === void 0) continue;
    const worldMat = new Float32Array(view);
    const target = resolveCameraTarget(world, cam.target);
    const hasNonDefaultOutput = cam.exposureMode !== CAMERA_EXPOSURE_MODE_MANUAL || cam.exposure !== 1 || cam.temperature !== 6504 || cam.tint !== 0 || cam.colorLut !== 0 || cam.colorLutStrength !== Camera.fields.colorLutStrength.default;
    const output = hasNonDefaultOutput ? {
      exposure: cameraExposureFromColumns(cam),
      temperature: cam.temperature,
      tint: cam.tint,
      colorLut: cam.colorLut,
      colorLutStrength: cam.colorLutStrength
    } : void 0;
    const antialias = antialiasFromF32(cam.antialias);
    const dynamicResolutionResult = validateDynamicResolutionCamera(dynamicResolution, antialias);
    if (!dynamicResolutionResult.ok) throw dynamicResolutionResult.error;
    const barrelDistortionResult = validateBarrelDistortionParameters(barrelDistortion);
    if (!barrelDistortionResult.ok) throw barrelDistortionResult.error;
    const stereoData = row.get(StereoCamera);
    const stereo = stereoData === void 0 ? void 0 : resolveStereoCamera(stereoData, {
      projection,
      near: cam.near,
      target: target !== void 0,
      planarReflection: planar !== void 0
    });
    const composedView = cameraView ?? (stereo === void 0 ? void 0 : CAMERA_VIEW_DEFAULTS);
    const snapshot = {
      entityKey: entity,
      ...composedView === void 0 ? {} : {
        view: {
          viewport: new Float32Array(composedView.viewport),
          order: composedView.order,
          resolutionScale: composedView.resolutionScale,
          updateInterval: composedView.updateInterval,
          enabled: composedView.enabled
        }
      },
      ...stereo === void 0 ? {} : { stereo },
      ...target === void 0 ? {} : { target },
      ...target === void 0 || cam.targetLayer === 0 ? {} : { targetLayer: cam.targetLayer },
      historyVersion: cam.historyVersion,
      position: mat46.getTranslation(vec33.create(), worldMat),
      world: worldMat,
      fov: cam.fov,
      aspect: cam.aspect,
      autoAspect: cam.autoAspect,
      projectionOffset: validateCameraProjectionOffset(cam.projectionOffset),
      near: cam.near,
      far: cam.far,
      projection,
      orthoLeft: cam.left,
      orthoRight: cam.right,
      orthoBottom: cam.bottom,
      orthoTop: cam.top,
      tonemap: tonemapFromF32(cam.tonemap),
      exposure: cam.exposure,
      whitePoint: cam.whitePoint,
      ...output === void 0 ? {} : { output },
      antialias,
      transparency: transparencyFromF32(cam.transparency),
      ...dynamicResolutionResult.value === void 0 ? {} : { dynamicResolution: dynamicResolutionResult.value },
      bloom: validateCameraBloom(
        cam.bloom,
        cam.bloomThreshold,
        cam.bloomIntensity,
        cam.bloomSmoothWidth,
        cam.bloomRadius
      ),
      bloomThreshold: cam.bloomThreshold,
      bloomIntensity: cam.bloomIntensity,
      bloomSmoothWidth: cam.bloomSmoothWidth,
      bloomRadius: cam.bloomRadius,
      clearColor: [
        cam.clearColor[0] ?? 0,
        cam.clearColor[1] ?? 0,
        cam.clearColor[2] ?? 0,
        cam.clearColor[3] ?? 1
      ],
      ...depthOfFieldResult.ok && depthOfFieldResult.value !== void 0 ? { depthOfField: depthOfFieldResult.value } : {},
      ...depthOfFieldError === void 0 ? {} : { depthOfFieldError },
      ...motionBlurParams === void 0 ? {} : {
        motionBlur: {
          shutterAngle: motionBlurParams.shutterAngle,
          maxRadiusPixels: motionBlurParams.maxRadiusPixels,
          sampleCount: motionBlurParams.sampleCount,
          targetFps: motionBlurParams.targetFps
        }
      },
      ...clipping === void 0 ? {} : { clipping },
      ...outline.value === void 0 ? {} : { outline: outline.value },
      ...lensEffects.value === void 0 ? {} : { lensEffects: lensEffects.value },
      ...lensFlare.value === void 0 ? {} : { lensFlare: lensFlare.value },
      ...barrelDistortion === void 0 ? {} : { barrelDistortion: barrelDistortionResult.value },
      ...ambientOcclusion === void 0 ? {} : {
        ambientOcclusion: {
          algorithm: ambientOcclusion.algorithm,
          radius: ambientOcclusion.radius,
          bias: ambientOcclusion.bias,
          intensity: ambientOcclusion.intensity,
          directLightingStrength: ambientOcclusion.directLightingStrength,
          quality: ambientOcclusion.quality,
          thickness: ambientOcclusion.thickness,
          distanceExponent: ambientOcclusion.distanceExponent,
          distanceFallOff: ambientOcclusion.distanceFallOff,
          resolutionScale: ambientOcclusion.resolutionScale
        }
      },
      ...screenSpaceReflection === void 0 ? {} : {
        screenSpaceReflection: {
          maxDistance: screenSpaceReflection.maxDistance,
          thickness: screenSpaceReflection.thickness,
          maxRoughness: screenSpaceReflection.maxRoughness
        }
      }
    };
    cameras.push(snapshot);
    if (planar !== void 0) {
      const reflectionTarget = resolveCameraTarget(world, planar.target);
      if (reflectionTarget === void 0) throw new PlanarReflectionInvalidError("target");
      const { view: _view, ...capture } = snapshot;
      const { target: _target, ...reflection } = planar;
      cameras.push({
        ...capture,
        target: reflectionTarget,
        planarReflection: { ...reflection, normal: new Float32Array(planar.normal) }
      });
    }
  }
  const planarTargets = /* @__PURE__ */ new Set();
  const otherTargets = new Set(
    cameras.filter((camera) => camera.planarReflection === void 0).map((camera) => camera.target)
  );
  for (const camera of collectCubeCameraSnapshots(world)) otherTargets.add(camera.target);
  for (const camera of cameras) {
    if (camera.planarReflection === void 0 || camera.target === void 0) continue;
    if (planarTargets.has(camera.target) || otherTargets.has(camera.target))
      throw new PlanarReflectionInvalidError("target-writer");
    planarTargets.add(camera.target);
  }
  return cameras;
}
function collectCubeCameraSnapshots(world) {
  const snapshots = [];
  const query = world.query({ read: [CubeCamera], with: [Transform2, GlobalTransform] }).unwrap();
  for (const row of query) {
    const camera = row.get(CubeCamera);
    const target = resolveCameraTarget(world, camera.target);
    if (target === void 0) continue;
    const view = readPresentationWorldMatrix(world, row.entity);
    if (view === void 0) continue;
    snapshots.push({
      entityKey: row.entity,
      target,
      position: [view[12] ?? 0, view[13] ?? 0, view[14] ?? 0],
      near: camera.near,
      far: camera.far,
      updateIntent: cubeCameraUpdateIntentFromF32(camera.updateIntent),
      requestVersion: camera.requestVersion,
      faceBudget: camera.faceBudget
    });
  }
  return snapshots;
}
function collectReflectionProbeFacts(world) {
  const facts = [];
  const query = world.query({ read: [ReflectionProbe], with: [Transform2, GlobalTransform] }).unwrap();
  for (const row of query) {
    const probe = row.get(ReflectionProbe);
    const view = readPresentationWorldMatrix(world, row.entity);
    if (view === void 0) {
      continue;
    }
    facts.push({
      worldId: 0,
      entityKey: row.entity,
      center: [view[12] ?? 0, view[13] ?? 0, view[14] ?? 0],
      halfExtents: [
        probe.halfExtents[0] ?? 0,
        probe.halfExtents[1] ?? 0,
        probe.halfExtents[2] ?? 0
      ],
      priority: probe.priority,
      intensity: probe.intensity,
      resolution: probe.resolution,
      boxProjection: probe.boxProjection,
      revision: probe.invalidationVersion,
      updateIntent: reflectionProbeUpdateIntentFromF32(probe.updateIntent),
      invalidationVersion: probe.invalidationVersion
    });
  }
  return facts;
}
function cameraForView(cameras, entityKey, extent) {
  const camera = cameras.find(
    (item) => item.planarReflection === void 0 && item.entityKey === entityKey
  );
  if (camera === void 0) return void 0;
  const physical = {
    ...camera,
    aspect: camera.autoAspect === false ? camera.aspect : extent.width / extent.height
  };
  return extent.eye === void 0 ? physical : stereoEyeCamera(physical, extent.eye);
}
function projectAuxiliaryCamerasForView(display, auxiliary) {
  return auxiliary.flatMap((camera) => {
    const planar = camera.planarReflection;
    if (planar === void 0) return [camera];
    if (display === void 0 || camera.entityKey !== display.entityKey) return [];
    const reflected = buildPlanarReflectionView({
      world: display.world,
      projection: computeProjectionMatrix(display),
      plane: [...planar.normal, planar.distance],
      clipBias: planar.clipBias
    });
    if (reflected === void 0) return [];
    return [
      {
        ...display,
        ...display.clipping === void 0 ? {} : {
          clipping: {
            planes: display.clipping.planes.map((plane) => [...plane]),
            intersection: display.clipping.intersection === true,
            clipShadows: false
          }
        },
        ...camera.entityKey === void 0 ? {} : { entityKey: camera.entityKey },
        ...camera.target === void 0 ? {} : { target: camera.target },
        world: reflected.world,
        position: reflected.position,
        captureProjection: reflected.projection,
        planarReflection: planar,
        clearColor: [0, 0, 0, 0]
      }
    ];
  });
}
function selectCameraRoles(world, requestedEntityKey, viewExtent) {
  const snapshots = collectCameraSnapshots(world);
  const cameras = snapshots.filter((camera) => camera.planarReflection === void 0);
  const planar = snapshots.filter((camera) => camera.planarReflection !== void 0);
  const views = cameras.filter((camera) => camera.view !== void 0);
  const viewCamera = viewExtent === void 0 ? void 0 : cameraForView(cameras, requestedEntityKey, viewExtent);
  const displayEntities = cameras.filter((camera) => camera.target === void 0 && camera.view === void 0).map((camera) => camera.entityKey ?? 0);
  const hasExplicitSelection = requestedEntityKey !== void 0;
  const activeCameraIndex = selectActiveCameraIndex(
    displayEntities,
    hasExplicitSelection ? requestedEntityKey : getActiveCamera(world)?.entity
  );
  const displayEntityKey = hasExplicitSelection ? displayEntities[activeCameraIndex] : displayEntities[activeCameraIndex] ?? displayEntities[0];
  const display = viewExtent !== void 0 ? viewCamera === void 0 ? [] : [viewCamera] : views.length > 0 ? views : displayEntityKey === void 0 ? [] : cameras.filter((camera) => camera.entityKey === displayEntityKey);
  const candidates = cameras.filter((camera) => camera.view === void 0).map((camera) => ({
    worldId: 0,
    entityKey: camera.entityKey ?? 0,
    ...camera.target === void 0 ? {} : { target: camera.target },
    ...camera.targetLayer === void 0 ? {} : { targetLayer: camera.targetLayer },
    requestVersion: 0,
    update: "continuous"
  }));
  const selected = selectCameraTargetViews(candidates, {
    ...displayEntityKey === void 0 ? {} : { displayEntityKey },
    budget: 1
  });
  const auxiliary = selected.auxiliary.flatMap(
    (candidate2) => cameras.filter((camera) => camera.entityKey === candidate2.entityKey)
  );
  return { display, auxiliary: [...auxiliary, ...planar] };
}
function tonemapParams(camera) {
  const bytes = new Uint8Array(TONEMAP_PARAMS_LAYOUT.byteSize);
  const view = new DataView(bytes.buffer);
  view.setFloat32(TONEMAP_PARAMS_LAYOUT.exposureOffset, camera.exposure, true);
  view.setFloat32(TONEMAP_PARAMS_LAYOUT.whitePointOffset, camera.whitePoint, true);
  view.setUint32(TONEMAP_PARAMS_LAYOUT.modeOffset, tonemapToU32(camera.tonemap), true);
  return bytes;
}
function prepareExtractContext(world, options = {}) {
  const renderables = options.renderables ?? "full";
  return {
    materialContext: options.materialContext,
    assets: options.assets,
    pipelineState: options.pipelineState,
    materialSnapshotContexts: options.materialSnapshotContexts ?? /* @__PURE__ */ new Map(),
    resourceOwnerFog: options.resourceOwnerFog,
    cull: options.cull ?? "self",
    cullCameras: options.cullCameras,
    ...options.cameraEntityKey === void 0 ? {} : { cameraEntityKey: options.cameraEntityKey },
    ...options.viewExtent === void 0 ? {} : { viewExtent: options.viewExtent },
    renderables,
    worldId: options.worldId ?? 0,
    renderableEntities: options.renderableEntities,
    retainHidden: options.retainHidden ?? false,
    ...options.preparationMesh === void 0 ? {} : { preparationMesh: options.preparationMesh },
    visibility: renderables === "none" ? ALL_VISIBLE : resolveVisibility(world),
    getMaterialShaderArtifact: options.getMaterialShaderArtifact,
    instanceCollections: options.instanceCollections
  };
}
var fogQueries = /* @__PURE__ */ new WeakMap();
var fogLkgStates = /* @__PURE__ */ new WeakMap();
function fogState(world) {
  const existing = fogLkgStates.get(world);
  if (existing !== void 0) return existing;
  const created = { lkg: void 0, failure: void 0 };
  fogLkgStates.set(world, created);
  return created;
}
function selectFogFrame(world) {
  const fogCandidates = [];
  let fogQuery = fogQueries.get(world);
  if (fogQuery === void 0) {
    fogQuery = world.query({ read: [Fog] }).unwrap();
    fogQueries.set(world, fogQuery);
  }
  for (const row of fogQuery) {
    const value = row.get(Fog);
    fogCandidates.push({
      entityKey: row.entity,
      color: [value.color[0] ?? 0, value.color[1] ?? 0, value.color[2] ?? 0],
      density: value.density,
      heightFalloff: value.heightFalloff,
      maxOpacity: value.maxOpacity
    });
  }
  const fogSelection = selectEnvironment({
    environments: [],
    fogs: fogCandidates,
    suns: []
  });
  const state = fogState(world);
  if (fogSelection.ok) {
    state.lkg = fogSelection.value.fog;
    state.failure = void 0;
    return fogSelection.value.fog;
  }
  state.failure = {
    code: fogSelection.error.code,
    expected: fogSelection.error.expected,
    hint: fogSelection.error.hint,
    detail: Object.freeze({ ...fogSelection.error.detail })
  };
  routeWorldError(world, fogSelection.error, {
    systemName: "RenderSystem.extract (fog-selection)"
  });
  if (state.lkg !== void 0) return state.lkg;
  throw fogSelection.error;
}
function extractVolumeSnapshot(world, assets, worldInternal) {
  const elapsed = world.getResource(Time2).elapsed;
  const worldTimeSeconds = Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0;
  const query = world.query({ read: [VolumetricFog] }).unwrap();
  const authorings = [];
  const members = [];
  let selectedLight;
  for (const row of query) {
    selectedLight = void 0;
    const source = row.get(VolumetricFog);
    if (source.light === null) continue;
    const selected = resolveSelectedVolumetricLight(world, source.light);
    if (selected.status === "available") {
      const pairSpot = source.spotLight === null ? void 0 : source.spotLight;
      selectedLight ??= {
        entity: selected.entity,
        kind: selected.kind,
        ...selected.kind === "point" ? { pointLightEntity: selected.entity } : {},
        ...pairSpot === void 0 ? {} : { spotLightEntity: pairSpot }
      };
    }
    const densityHandle = Math.round(Number(source.density));
    const resolved = runtimeAssets2(world.assets).resolveAsset(densityHandle);
    if (!resolved.ok || resolved.value.kind !== "texture") {
      worldInternal._routeError(
        resolved.ok ? new RhiError2({
          code: "asset-not-registered",
          expected: "VolumetricFog.density resolves to a TextureAsset",
          hint: "load a TextureAsset before assigning it to VolumetricFog.density",
          detail: { assetHandle: Number(densityHandle) }
        }) : resolved.error,
        { severity: Severity.Error, systemName: "RenderSystem.extract (volumetric-density)" }
      );
      return { status: "degraded", worldTimeSeconds };
    }
    const densityAsset = resolved.value;
    const guid = assets?.guidOf(densityHandle) ?? `handle:${Number(densityHandle)}`;
    const shape = densityAsset.shape;
    const density = shape.viewDimension === "3d" ? {
      guid,
      generation: 1,
      shape: {
        viewDimension: "3d",
        extent: {
          width: shape.extent.width,
          height: shape.extent.height,
          depth: shape.extent.depth
        }
      },
      format: densityAsset.format,
      colorSpace: densityAsset.colorSpace
    } : {
      guid,
      generation: 1,
      shape: {
        viewDimension: shape.viewDimension,
        extent: shape.viewDimension === "2d-array" ? {
          width: shape.extent.width,
          height: shape.extent.height,
          layers: shape.extent.layers
        } : { width: shape.extent.width, height: shape.extent.height }
      },
      format: densityAsset.format,
      colorSpace: densityAsset.colorSpace
    };
    const authoring = {
      light: source.light,
      density,
      bounds: {
        min: [source.boundsMin[0] ?? 0, source.boundsMin[1] ?? 0, source.boundsMin[2] ?? 0],
        max: [source.boundsMax[0] ?? 0, source.boundsMax[1] ?? 0, source.boundsMax[2] ?? 0]
      },
      extinction: [source.extinction[0] ?? 0, source.extinction[1] ?? 0, source.extinction[2] ?? 0],
      albedo: [source.albedo[0] ?? 0, source.albedo[1] ?? 0, source.albedo[2] ?? 0],
      emission: [source.emission[0] ?? 0, source.emission[1] ?? 0, source.emission[2] ?? 0],
      anisotropy: source.anisotropy,
      maxDistance: source.maxDistance,
      sampling: source.sampling === 2 ? "density-albedo" : source.sampling === 1 ? "density" : "noise"
    };
    authorings.push(authoring);
    members.push({
      status: "available",
      worldTimeSeconds,
      densityHandle,
      densityAsset,
      guid,
      generation: 1,
      digest: textureDigest(densityAsset),
      ...selectedLight === void 0 ? {} : {
        lightEntity: selectedLight.entity,
        lightKind: selectedLight.kind,
        ...selectedLight.pointLightEntity === void 0 ? {} : { pointLightEntity: selectedLight.pointLightEntity },
        ...selectedLight.spotLightEntity === void 0 ? {} : { spotLightEntity: selectedLight.spotLightEntity }
      }
    });
  }
  if (authorings.length === 0) return void 0;
  const extracted = extractVolumetricFog(authorings);
  if (!extracted.ok) {
    worldInternal._routeError(extracted.error, {
      severity: Severity.Error,
      systemName: "RenderSystem.extract (volumetric-fog)"
    });
    return { ...members[0], status: "degraded" };
  }
  if (extracted.value.status === "off") return { status: "off" };
  const validatedMembers = extracted.value.fogs.map((fog, index) => ({
    ...members[index],
    status: "available",
    fog
  }));
  return {
    ...validatedMembers[0],
    status: "available",
    additional: validatedMembers.slice(1)
  };
}
var DEFAULT_MATERIAL_SNAPSHOT = Object.freeze({
  passes: Object.freeze([
    {
      name: "shadow-caster",
      program: { module: "forgeax::default-shadow-caster", vertexEntry: "vs_main" },
      renderState: { tags: { LightMode: "ShadowCaster" }, queue: 2e3 }
    },
    DEFAULT_FORWARD_PASS
  ]),
  baseColor: vec33.create(0.5, 0.5, 0.5),
  metallic: 0,
  roughness: 1,
  materialHandle: 0
});
function defaultMaterialSnapshot(materialHandle = 0) {
  return materialHandle === 0 ? DEFAULT_MATERIAL_SNAPSHOT : { ...DEFAULT_MATERIAL_SNAPSHOT, materialHandle };
}

// sdk/engine/node_modules/@forgeax/engine-render/src/instances.ts
import {
  InstanceTransformsStrideMismatchError
} from "@forgeax/engine-ecs/projection";
var MATRIX_STRIDE = 16;
var InstanceTransformsError = class extends Error {
  constructor(detail) {
    super("Instances.transforms must contain complete finite matrices");
    this.detail = detail;
    this.name = "InstanceTransformsError";
  }
  detail;
  code = "instance-transforms-invalid";
  expected = "finite column-major mat4 values, with transforms.length a multiple of 16";
  hint = "repair Instances.transforms in the World or source SceneAsset and retry";
};
function validateInstanceTransforms(transforms) {
  if (transforms.length % MATRIX_STRIDE !== 0)
    return new InstanceTransformsStrideMismatchError(transforms.length);
  for (let index = 0; index < transforms.length; index++) {
    if (!Number.isFinite(transforms[index]))
      return new InstanceTransformsError({
        actualLength: transforms.length,
        nonFiniteIndex: index
      });
  }
  return void 0;
}
var uniqueIdentities = /* @__PURE__ */ new WeakMap();
function uniqueInstanceIdentities(generations) {
  let unique = uniqueIdentities.get(generations);
  if (unique === void 0) {
    unique = !generations.includes(0) && new Set(generations).size === generations.length;
    uniqueIdentities.set(generations, unique);
  }
  return unique;
}
function instancePreviousPairing(current, previous) {
  if (previous === void 0 || previous.transforms === current.transforms) return "none";
  return current.revision !== void 0 && previous.revision === current.revision - 1 && previous.collectionId === current.collectionId && previous.generations !== void 0 && previous.generations === current.generations ? "prior" : "unpaired";
}
function clipRanges(ranges, window) {
  const clipped = [];
  for (const range2 of ranges) {
    const start = Math.max(window.start, range2.start);
    const end = Math.min(window.end, range2.end);
    if (end > start) clipped.push({ start, end });
  }
  return clipped;
}
function planInstanceUpload(input) {
  const { activeIsNew, resident, current, pairing, window } = input;
  const previousLane = pairing !== "no-previous-lane";
  const dirty = current.dirtyRanges;
  const motionRows = !previousLane || pairing === "none" ? [] : pairing === "prior" && dirty !== void 0 ? clipRanges(dirty, window) : void 0;
  if (!activeIsNew && current.revision !== void 0 && resident.uploadedRevision === current.revision && pairing === "none" && resident.uploadedMotionRows !== void 0) {
    return {
      ranges: clipRanges(resident.uploadedMotionRows, window).map(({ start, end }) => ({
        start: start - window.start,
        end: end - window.start
      })),
      motionRows
    };
  }
  const incremental = !activeIsNew && dirty !== void 0 && current.revision !== void 0 && resident.uploadedRevision === current.revision - 1 && pairing !== "unpaired" && (!previousLane || resident.uploadedMotionRows !== void 0);
  if (!incremental) return { ranges: [{ start: 0, end: window.end - window.start }], motionRows };
  const rows = clipRanges(
    [...dirty, ...previousLane ? resident.uploadedMotionRows ?? [] : []],
    window
  ).sort((a, b) => a.start - b.start);
  const ranges = [];
  for (const row of rows) {
    const last = ranges.at(-1);
    const start = row.start - window.start;
    const end = row.end - window.start;
    if (last !== void 0 && start <= last.end) last.end = Math.max(last.end, end);
    else ranges.push({ start, end });
  }
  return { ranges, motionRows };
}
var InstanceProjectionStore = class {
  nextId = 1;
  nextGeneration = 1;
  identities = /* @__PURE__ */ new WeakMap();
  records = /* @__PURE__ */ new Map();
  candidates = /* @__PURE__ */ new Map();
  backs = /* @__PURE__ */ new Map();
  /** Buffers this store allocated; only these may be recycled as back storage. */
  owned = /* @__PURE__ */ new WeakSet();
  residency = /* @__PURE__ */ new Map();
  work = { rows: 0, fullProjections: 0, rowProjections: 0 };
  /**
   * Project one authored column into a detached revision. With `rows`, a
   * collection whose source proves its changed element ranges costs O(changed
   * rows): only those rows are validated, compared and copied, and the result
   * carries `dirtyRanges`. Otherwise the whole column is validated and copied.
   */
  project(world, entity, transforms, rows) {
    const collectionId = this.identities.get(world)?.get(entity) ?? this.nextId++;
    const previous = this.records.get(collectionId);
    if (rows !== void 0 && previous?.sourceEpoch !== void 0 && previous.transforms.length === transforms.length) {
      const change = rows.changedSince(previous.sourceEpoch);
      if (change !== "whole") return this.projectRows(previous, transforms, change, rows.epoch);
    }
    this.work.fullProjections += 1;
    this.work.rows += transforms.length / MATRIX_STRIDE;
    const invalid4 = validateInstanceTransforms(transforms);
    if (invalid4 !== void 0) return invalid4;
    if (previous !== void 0 && previous.transforms.length === transforms.length && previous.transforms.every((value, index) => Object.is(value, transforms[index]))) {
      if (rows === void 0 || previous.sourceEpoch === rows.epoch) return previous;
      const reseeded = { ...previous, sourceEpoch: rows.epoch };
      this.candidates.set(collectionId, reseeded);
      return reseeded;
    }
    const count = transforms.length / MATRIX_STRIDE;
    const generations = previous?.count === count ? previous.generations : Uint32Array.from({ length: count }, () => this.nextGeneration++);
    let back = previous?.count === count ? this.backs.get(collectionId) : void 0;
    let target;
    if (back !== void 0 && back.transforms.length === transforms.length) {
      back.transforms.set(transforms);
      target = back.transforms;
    } else {
      target = this.own(new Float32Array(transforms));
      if (previous?.count === count && this.owned.has(previous.transforms)) {
        back = { transforms: target, diff: "whole", candidate: void 0 };
        this.backs.set(collectionId, back);
      } else {
        back = void 0;
      }
    }
    const record = {
      collectionId,
      world,
      entity,
      transforms: target,
      generations,
      count,
      revision: (previous?.revision ?? 0) + 1,
      sourceEpoch: rows?.epoch
    };
    if (back !== void 0) {
      back.diff = "whole";
      back.candidate = record;
    }
    this.candidates.set(collectionId, record);
    return record;
  }
  projectRows(previous, source, change, epoch) {
    this.work.rowProjections += 1;
    const written = [];
    for (const range2 of change) {
      const start = Math.floor(range2.start / MATRIX_STRIDE);
      const end = Math.min(previous.count, Math.ceil(range2.end / MATRIX_STRIDE));
      const last = written.at(-1);
      if (last !== void 0 && start <= last.end) last.end = Math.max(last.end, end);
      else if (end > start) written.push({ start, end });
    }
    for (const range2 of written) {
      this.work.rows += range2.end - range2.start;
      for (let index = range2.start * MATRIX_STRIDE; index < range2.end * MATRIX_STRIDE; index++) {
        if (!Number.isFinite(source[index]))
          return new InstanceTransformsError({
            actualLength: source.length,
            nonFiniteIndex: index
          });
      }
    }
    const front = previous.transforms;
    let back = this.backs.get(previous.collectionId);
    if (back === void 0 || back.transforms.length !== front.length) {
      back = { transforms: this.own(new Float32Array(front)), diff: [], candidate: void 0 };
      this.backs.set(previous.collectionId, back);
      this.work.rows += previous.count;
    } else if (back.diff === "whole") {
      back.transforms.set(front);
      this.work.rows += previous.count;
    } else {
      for (const range2 of back.diff) {
        this.work.rows += range2.end - range2.start;
        back.transforms.set(
          front.subarray(range2.start * MATRIX_STRIDE, range2.end * MATRIX_STRIDE),
          range2.start * MATRIX_STRIDE
        );
      }
    }
    const target = back.transforms;
    const dirtyRanges = [];
    for (const range2 of written) {
      for (let row = range2.start; row < range2.end; row += 1) {
        let changed = false;
        for (let lane = row * MATRIX_STRIDE; lane < (row + 1) * MATRIX_STRIDE; lane += 1) {
          const value = source[lane];
          target[lane] = value;
          if (!Object.is(target[lane], front[lane])) changed = true;
        }
        if (!changed) continue;
        const last = dirtyRanges.at(-1);
        if (last !== void 0 && last.end === row) last.end = row + 1;
        else dirtyRanges.push({ start: row, end: row + 1 });
      }
    }
    back.diff = written;
    if (dirtyRanges.length === 0) {
      back.candidate = void 0;
      return previous;
    }
    const record = {
      ...previous,
      transforms: target,
      revision: previous.revision + 1,
      dirtyRanges,
      sourceEpoch: epoch
    };
    back.candidate = record;
    this.candidates.set(previous.collectionId, record);
    return record;
  }
  /** Called only after the owning RenderScene accepts its prepared changes. */
  accept(world, entity, snapshot) {
    const { collectionId, revision, transforms, generations } = snapshot;
    if (collectionId === void 0 || revision === void 0 || generations === void 0) return;
    let entities = this.identities.get(world);
    if (entities === void 0) {
      entities = /* @__PURE__ */ new Map();
      this.identities.set(world, entities);
    }
    entities.set(entity, collectionId);
    const current = this.records.get(collectionId);
    const candidate2 = this.candidates.get(collectionId);
    this.candidates.delete(collectionId);
    const matches = candidate2 !== void 0 && candidate2.transforms === transforms && candidate2.revision === revision;
    const back = this.backs.get(collectionId);
    if (current?.transforms !== transforms && back !== void 0) {
      if (back.candidate !== void 0 && back.transforms === transforms) {
        if (current === void 0 || current.transforms.length !== transforms.length || !this.owned.has(current.transforms)) {
          this.backs.delete(collectionId);
        } else {
          back.transforms = current.transforms;
        }
      } else {
        back.diff = "whole";
      }
      back.candidate = void 0;
    }
    this.records.set(
      collectionId,
      matches ? candidate2 : {
        collectionId,
        revision,
        transforms,
        generations,
        count: transforms.length / MATRIX_STRIDE,
        world,
        entity,
        sourceEpoch: current?.transforms === transforms ? current.sourceEpoch : void 0
      }
    );
  }
  own(buffer) {
    this.owned.add(buffer);
    return buffer;
  }
  /** Cumulative projection work; tests and benches read deltas. */
  inspectWork() {
    return { ...this.work };
  }
  release(world, entity) {
    const entities = this.identities.get(world);
    const id = entities?.get(entity);
    if (id === void 0) return;
    entities?.delete(entity);
    this.records.delete(id);
    this.candidates.delete(id);
    this.backs.delete(id);
    this.residency.delete(id);
  }
  retain(ids) {
    for (const record of this.records.values()) {
      if (!ids.has(record.collectionId)) this.release(record.world, record.entity);
    }
  }
  dispose() {
    this.records.clear();
    this.candidates.clear();
    this.backs.clear();
    this.residency.clear();
    this.identities = /* @__PURE__ */ new WeakMap();
  }
  _resetResidency() {
    this.residency.clear();
  }
  _reportResidency(input) {
    if (!this.records.has(input.collectionId)) return;
    const previous = this.residency.get(input.collectionId);
    const sameFrame = previous?.frameNumber === input.frameNumber && previous.error === void 0;
    const ranges = [...sameFrame ? previous.uploadRanges : [], ...input.uploadRanges].map((range2) => ({ ...range2 })).sort((a, b) => a.start - b.start);
    const uploadRanges = [];
    for (const range2 of ranges) {
      const last = uploadRanges.at(-1);
      if (last !== void 0 && range2.start <= last.end) last.end = Math.max(last.end, range2.end);
      else uploadRanges.push(range2);
    }
    this.residency.set(input.collectionId, {
      ...input,
      uploadRanges,
      uploadedBytes: input.uploadedBytes + (sameFrame ? previous.uploadedBytes : 0),
      error: void 0
    });
  }
  _reportFailure(input) {
    if (!this.records.has(input.collectionId)) return;
    this.residency.set(input.collectionId, {
      frameNumber: -1,
      residentGeneration: void 0,
      lane: "unavailable",
      uploadRanges: [],
      uploadedBytes: 0,
      requestedBytes: input.facts.requestedBytes,
      supportedBytes: input.facts.supportedBytes,
      backend: input.facts.backend,
      error: {
        code: input.code,
        expected: input.expected,
        hint: input.hint,
        detail: { ...input.facts }
      }
    });
  }
  _inspections(frameNumber) {
    return [...this.records.values()].map((record) => {
      const resident = this.residency.get(record.collectionId);
      const current = resident?.frameNumber === frameNumber;
      return {
        collectionId: record.collectionId,
        count: record.count,
        revision: record.revision,
        residentGeneration: resident?.residentGeneration,
        lane: resident?.lane ?? "unresident",
        uploadRanges: current ? resident.uploadRanges.map((range2) => ({ ...range2 })) : [],
        uploadedBytes: current ? resident.uploadedBytes : 0,
        requestedBytes: resident?.requestedBytes ?? record.transforms.byteLength,
        supportedBytes: resident?.supportedBytes,
        backend: resident?.backend ?? "unknown",
        owner: "renderer.instances",
        error: resident?.error
      };
    });
  }
};

// sdk/engine/node_modules/@forgeax/engine-render/src/prepare/extended-lighting/resources.ts
import { mipDimension, numMipLevels, ok as ok16 } from "@forgeax/engine-types";
var EXTENDED_LIGHTING_TOPOLOGY = "extendedLighting";
var IES_SLICE_CAPACITY = 32;
var COOKIE_SLICE_CAPACITY = 32;
var IES_SLICE_WIDTH = 256;
var IES_SLICE_HEIGHT = 128;
var COOKIE_SLICE_SIZE = 256;
var COOKIE_MIP_LEVEL_COUNT = numMipLevels({
  width: COOKIE_SLICE_SIZE,
  height: COOKIE_SLICE_SIZE
});
var COOKIE_SLICE_MIP_CHAIN_BYTES = cookieMipChainBytes();
function cookieMipChainBytes() {
  let bytes = 0;
  for (let level = 0; level < COOKIE_MIP_LEVEL_COUNT; level += 1) {
    const size = mipDimension(COOKIE_SLICE_SIZE, level);
    bytes += size * size * 4;
  }
  return bytes;
}
function writeCookieSliceMipChain(device, texture, slice, data) {
  let offset = 0;
  for (let level = 0; level < COOKIE_MIP_LEVEL_COUNT; level += 1) {
    const size = mipDimension(COOKIE_SLICE_SIZE, level);
    const bytes = size * size * 4;
    const result = device.queue.writeTexture(
      { texture, mipLevel: level, origin: { x: 0, y: 0, z: slice } },
      data.subarray(offset, offset + bytes),
      { offset: 0, bytesPerRow: size * 4, rowsPerImage: size },
      { width: size, height: size, depthOrArrayLayers: 1 }
    );
    if (!result.ok) return result;
    offset += bytes;
  }
  return ok16(void 0);
}
var COOKIE_MATRIX_BYTES = 32 * 16 * Float32Array.BYTES_PER_ELEMENT;
var EXTENDED_LIGHTING_REQUIRED_SAMPLED_TEXTURES = 25;
function extendedLightingSampledTextureCapacityAvailable(maxSampledTexturesPerShaderStage) {
  return maxSampledTexturesPerShaderStage !== void 0 && maxSampledTexturesPerShaderStage >= EXTENDED_LIGHTING_REQUIRED_SAMPLED_TEXTURES;
}
function deriveExtendedLightingCapability(device) {
  const maxSampledTextures = device.limits.maxSampledTexturesPerShaderStage;
  if (!extendedLightingSampledTextureCapacityAvailable(maxSampledTextures)) {
    return {
      admitted: false,
      topology: EXTENDED_LIGHTING_TOPOLOGY,
      reason: `maxSampledTexturesPerShaderStage ${maxSampledTextures ?? 0} < ${EXTENDED_LIGHTING_REQUIRED_SAMPLED_TEXTURES}`
    };
  }
  const maxLayers = device.limits.maxTextureArrayLayers ?? 0;
  const maxUniformBuffers = device.limits.maxUniformBuffersPerShaderStage ?? 0;
  if (maxLayers < IES_SLICE_CAPACITY) {
    return {
      admitted: false,
      topology: EXTENDED_LIGHTING_TOPOLOGY,
      reason: `maxTextureArrayLayers ${maxLayers} < ${IES_SLICE_CAPACITY}`
    };
  }
  if (maxUniformBuffers < 1) {
    return {
      admitted: false,
      topology: EXTENDED_LIGHTING_TOPOLOGY,
      reason: `maxUniformBuffersPerShaderStage ${maxUniformBuffers} < 1`
    };
  }
  if (!device.caps.storageBuffer || !device.caps.rgba16floatRenderable || !device.caps.samplerAliasing) {
    return {
      admitted: false,
      topology: EXTENDED_LIGHTING_TOPOLOGY,
      reason: "required storage-buffer, rgba16float, or sampler capability is unavailable"
    };
  }
  return { admitted: true, topology: EXTENDED_LIGHTING_TOPOLOGY, reason: void 0 };
}

// sdk/engine/node_modules/@forgeax/engine-render/src/mesh-material-bindings.ts
var capturedResidencies = /* @__PURE__ */ new WeakSet();
function captureSampler(sampler) {
  return Object.freeze({ ...sampler });
}
function captureTexture(texture) {
  return Object.freeze({ ...texture });
}
function captureResidency(value, producer) {
  return Object.freeze({
    ...value,
    samplers: Object.freeze(
      producer ? Array.prototype.map.call(
        value.samplers,
        captureSampler
      ) : value.samplers.map(captureSampler)
    ),
    textures: Object.freeze(
      producer ? Array.prototype.map.call(
        value.textures,
        captureTexture
      ) : value.textures.map(captureTexture)
    ),
    ...value.preparationFailure === void 0 ? {} : {
      preparationFailure: Object.freeze({
        ...value.preparationFailure,
        ...value.preparationFailure.detail === void 0 ? {} : {
          detail: Object.freeze({ ...value.preparationFailure.detail })
        }
      })
    }
  });
}
function publishMeshMaterialBindingResidency(value) {
  const captured = captureResidency(value, true);
  capturedResidencies.add(captured);
  return captured;
}
var EMPTY_RESIDENCY = publishMeshMaterialBindingResidency({
  readiness: "pending",
  samplers: Object.freeze([]),
  textures: Object.freeze([])
});
function projectMeshMaterialBindingObservation(input) {
  const residency = input.bindings.map((_, index) => {
    const value = input.residency?.[index] ?? EMPTY_RESIDENCY;
    return capturedResidencies.has(value) ? value : captureResidency(value, false);
  });
  return {
    worldId: input.worldId,
    ...input.worldIdentity === void 0 ? {} : { worldIdentity: input.worldIdentity },
    entityKey: input.entityKey,
    bindings: Object.freeze([...input.bindings]),
    diagnostics: Object.freeze([...input.diagnostics]),
    residency: Object.freeze(residency)
  };
}
function summarizeMeshMaterialBindings(observations) {
  let ready = 0;
  let pending = 0;
  let failed = 0;
  let lastKnownGood = 0;
  let textureCount = 0;
  let samplerCount = 0;
  for (const observation of observations) {
    for (const residency of observation.residency) {
      switch (residency.readiness) {
        case "ready":
          ready += 1;
          break;
        case "pending":
          pending += 1;
          break;
        case "failed":
          failed += 1;
          break;
        case "last-known-good":
          lastKnownGood += 1;
          break;
      }
      textureCount += residency.textures.length;
      samplerCount += residency.samplers.length;
    }
  }
  return {
    total: ready + pending + failed + lastKnownGood,
    ready,
    pending,
    failed,
    lastKnownGood,
    textureCount,
    samplerCount
  };
}
function resolveMeshMaterialBindings(mesh, rendererOverrides, deps) {
  const bindings2 = [];
  const diagnostics = [];
  if (!Array.isArray(mesh.materialSlots)) {
    return { ok: false, code: "mesh-material-slots-missing" };
  }
  if (rendererOverrides.length > mesh.materialSlots.length) {
    diagnostics.push({
      code: "mesh-renderer-material-override-overflow",
      slotIndex: mesh.materialSlots.length
    });
  }
  for (let slotIndex = 0; slotIndex < mesh.materialSlots.length; slotIndex++) {
    const override = rendererOverrides[slotIndex] ?? 0;
    if (override !== 0 && deps.isValidOverride(override)) {
      bindings2.push({ handle: override, source: "renderer-override" });
      continue;
    }
    if (override !== 0) {
      diagnostics.push({
        code: "mesh-renderer-material-override-invalid",
        slotIndex,
        handle: override
      });
    }
    const declaredDefault = mesh.materialSlots[slotIndex]?.defaultMaterial;
    if (declaredDefault !== void 0) {
      const handle = deps.resolveMeshDefault(declaredDefault);
      if (handle === void 0) {
        return {
          ok: false,
          code: "mesh-default-material-not-ready",
          slotIndex,
          defaultMaterial: declaredDefault
        };
      }
      bindings2.push({ handle, source: "mesh-default" });
      continue;
    }
    bindings2.push({ handle: 0, source: "engine-default" });
  }
  return { ok: true, bindings: bindings2, diagnostics };
}

// sdk/engine/node_modules/@forgeax/engine-render/src/record/frame-snapshot.ts
import { vec3 as vec34 } from "@forgeax/engine-math";
function worldEntityKey(worldId, entityKey) {
  return worldId * 4294967296 + entityKey;
}
function instanceCollectionCacheKey(worldId, instance) {
  return -(4294967296 + worldEntityKey(worldId, instance.collectionId ?? instance.cacheKey));
}
var ZERO_CAMERA_CLEAR_FALLBACK = [0, 0, 0, 1];
var textureIdentities = /* @__PURE__ */ new WeakMap();
var nextTextureIdentity = 1;
var opaqueResourceIdentities = /* @__PURE__ */ new WeakMap();
var nextOpaqueResourceIdentity = 1;
function getOpaqueResourceIdentity(resource) {
  const existing = opaqueResourceIdentities.get(resource);
  if (existing !== void 0) return existing;
  const identity = nextOpaqueResourceIdentity++;
  opaqueResourceIdentities.set(resource, identity);
  return identity;
}
function getTextureIdentity(texture) {
  const object = texture;
  const existing = textureIdentities.get(object);
  if (existing !== void 0) return existing;
  const identity = nextTextureIdentity++;
  textureIdentities.set(object, identity);
  return identity;
}
function validateGraphTargetCaptureReadback(input) {
  const { bytes, expectedByteLength, sentinel, allowZero = false } = input;
  if (bytes.byteLength !== expectedByteLength)
    return { ok: false, code: "capture-readback-length" };
  if (sentinel?.every((value, index2) => bytes[index2] === value)) {
    return { ok: false, code: "capture-readback-untouched-sentinel" };
  }
  if (!allowZero && bytes.every((value) => value === 0)) {
    return { ok: false, code: "capture-readback-empty" };
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let index = 0;
  for (; index + 3 < bytes.byteLength; index += 4) {
    const word = view.getUint32(index, true);
    if ((word & 31744) === 31744 || (word & 2080374784) === 2080374784)
      return { ok: false, code: "capture-readback-non-finite" };
  }
  if (index + 1 < bytes.byteLength && (view.getUint16(index, true) & 31744) === 31744)
    return { ok: false, code: "capture-readback-non-finite" };
  return { ok: true };
}
function makeZeroCameraFallbackSnapshot() {
  const identityWorld = new Float32Array(16);
  identityWorld[0] = 1;
  identityWorld[5] = 1;
  identityWorld[10] = 1;
  identityWorld[15] = 1;
  return {
    position: vec34.create(0, 0, 0),
    world: identityWorld,
    fov: Math.PI / 4,
    aspect: 1,
    near: 0.1,
    far: 100,
    // feat-20260613 M6 / w20: synthetic camera defaults to perspective so
    // the CSM extract path stays consistent with the previously-implicit
    // perspective shape (unchanged behavior; explicit field).
    projection: "perspective",
    orthoLeft: -1,
    orthoRight: 1,
    orthoBottom: -1,
    orthoTop: 1,
    tonemap: "none",
    exposure: 1,
    whitePoint: 4,
    antialias: "none",
    bloom: "off",
    bloomThreshold: 1,
    bloomIntensity: 1,
    bloomSmoothWidth: 0.01,
    bloomRadius: 0,
    clearColor: ZERO_CAMERA_CLEAR_FALLBACK
  };
}
function emptyFrameRecordingOutputs() {
  return {
    sceneSubmitted: false,
    directionalShadowView: null,
    spotShadowView: null,
    observationSource: void 0
  };
}
function resetFrameRecordingOutputs(outputs) {
  outputs.sceneSubmitted = false;
  outputs.directionalShadowView = null;
  outputs.spotShadowView = null;
  outputs.observationSource = void 0;
}

// sdk/engine/node_modules/@forgeax/engine-render/src/shadow-atlas.ts
import {
  comparisonSamplerDescriptor,
  cubeArrayDepthDescriptor,
  cubeArrayDepthFaceView
} from "@forgeax/engine-rhi";

// sdk/engine/node_modules/@forgeax/engine-render/src/gpu-texture-usage.ts
var GPU_TEXTURE_USAGE_COPY_SRC = 1;
var GPU_TEXTURE_USAGE_COPY_DST = 2;
var GPU_TEXTURE_USAGE_TEXTURE_BINDING = 4;
var GPU_TEXTURE_USAGE_STORAGE_BINDING = 8;
var GPU_TEXTURE_USAGE_RENDER_ATTACHMENT = 16;
var GPU_TEXTURE_USAGE_RENDER_ATTACHMENT_AND_TEXTURE_BINDING = GPU_TEXTURE_USAGE_RENDER_ATTACHMENT | GPU_TEXTURE_USAGE_TEXTURE_BINDING;

// sdk/engine/node_modules/@forgeax/engine-render/src/shadow-atlas.ts
var SHADOW_ATLAS_DEFAULT_FACE_SIZE = 512;
var SHADOW_ATLAS_DEFAULT_LAYERS = 4;
var ShadowAtlas = class {
  /** Backing cube_array depth texture. `null` until `ensure()` has run. */
  texture = null;
  /**
   * Whole-atlas cube_array sampling view used by URP shaders that bind the
   * atlas at `@group(0) @binding(5)`. `null` until `ensure()` has run.
   */
  cubeArrayView = null;
  /** Comparison sampler for `texture_depth_cube_array`. */
  compareSampler = null;
  /** Per-face 2D depth view cache, keyed by `layer * 6 + face`. */
  faceViews = /* @__PURE__ */ new Map();
  /** Per-face label cache (debug aid). Reused on re-creation. */
  device;
  /** Per-face square size in pixels. */
  faceSize;
  /** Cube layer count. */
  layers;
  constructor(device, options = {}) {
    this.device = device;
    this.faceSize = options.faceSize ?? SHADOW_ATLAS_DEFAULT_FACE_SIZE;
    this.layers = options.layers ?? SHADOW_ATLAS_DEFAULT_LAYERS;
  }
  /**
   * Returns `true` once the atlas texture is allocated. Used by the extract /
   * record path to gate "no PointLightShadow → no allocation" (AC-09) — the
   * caller calls {@link ensure} on a frame that has at least one snapshot;
   * before that, `isAllocated()` stays `false` and tests can assert no GPU
   * resources were created.
   */
  isAllocated() {
    return this.texture !== null;
  }
  /**
   * Lazy-allocate the atlas texture + cube_array sampling view + comparison
   * sampler. Idempotent: subsequent calls are zero-cost no-ops once the
   * resources exist.
   *
   * Throws (via the RHI error registry) on allocation failure. This is the
   * only path that touches the GPU — keeping it inside one method makes the
   * "zero-shadow scene = zero allocation" gate easy to enforce: the renderer
   * never calls this method on a frame with no PointLightShadow entities.
   */
  ensure() {
    if (this.texture !== null) return;
    const usage = GPU_TEXTURE_USAGE_RENDER_ATTACHMENT_AND_TEXTURE_BINDING | GPU_TEXTURE_USAGE_COPY_DST;
    const texDesc = cubeArrayDepthDescriptor(this.faceSize, this.layers, usage);
    const texRes = this.device.createTexture(texDesc);
    if (!texRes.ok) throw texRes.error;
    this.texture = texRes.value;
    const viewRes = this.device.createTextureView(this.texture, {
      label: "shadow-atlas-cube-array-view",
      dimension: "cube-array",
      aspect: "depth-only",
      baseArrayLayer: 0,
      arrayLayerCount: 6 * this.layers,
      baseMipLevel: 0,
      mipLevelCount: 1
    });
    if (!viewRes.ok) {
      this.device.destroyTexture(this.texture);
      this.texture = null;
      throw viewRes.error;
    }
    this.cubeArrayView = viewRes.value;
    const sampRes = this.device.createSampler({
      ...comparisonSamplerDescriptor(),
      compare: "greater"
    });
    if (!sampRes.ok) {
      this.device.destroyTexture(this.texture);
      this.texture = null;
      this.cubeArrayView = null;
      throw sampRes.error;
    }
    this.compareSampler = sampRes.value;
  }
  /**
   * Whole-atlas cube_array sampling view (`texture_depth_cube_array`). Returns
   * `null` if the atlas is not yet allocated; the caller should gate on a
   * non-null pointShadow array before calling {@link ensure} + this getter.
   */
  getAtlasView() {
    return this.cubeArrayView;
  }
  /**
   * Comparison sampler (`compare: 'greater'`) for cube_array depth sampling.
   * Returns `null` if the atlas is not yet allocated.
   */
  getComparisonSampler() {
    return this.compareSampler;
  }
  /**
   * Backing texture handle. Returns `null` if the atlas is not yet allocated.
   */
  getTexture() {
    return this.texture;
  }
  /**
   * Lazy 2D depth view selecting `(layer, face)` (the caller passes
   * `shadowAtlasLayer` from the snapshot and a face index 0..5). Used as the
   * depth attachment of the shadow-caster render pass for one cube face.
   *
   * Caches per `(layer, face)` so the per-frame shadow loop pays zero
   * `createTextureView` cost after the first allocation. Cache is cleared on
   * {@link dispose}.
   *
   * @throws PointShadowAtlasUninitializedError if the atlas is not yet
   *   allocated (caller must call {@link ensure} first).
   * @throws PointShadowAtlasBoundsViolationError if `layer` or `face` is out
   *   of range.
   * @throws RhiError if the underlying `createTextureView` fails.
   */
  faceView(layer, face) {
    if (this.texture === null) {
      throw new PointShadowAtlasUninitializedError();
    }
    if (layer < 0 || layer >= this.layers) {
      throw new PointShadowAtlasBoundsViolationError("layer", layer, this.layers);
    }
    if (face < 0 || face >= 6) {
      throw new PointShadowAtlasBoundsViolationError("face", face, 6);
    }
    const key = layer * 6 + face;
    const cached = this.faceViews.get(key);
    if (cached !== void 0) return cached;
    const desc = cubeArrayDepthFaceView(layer, face);
    const r = this.device.createTextureView(this.texture, desc);
    if (!r.ok) throw r.error;
    this.faceViews.set(key, r.value);
    return r.value;
  }
  /**
   * Release the GPU resources and clear the per-face view cache. Idempotent;
   * subsequent calls are zero-cost. After dispose, `isAllocated()` returns
   * `false` and the next `ensure()` re-allocates from scratch.
   */
  dispose() {
    this.faceViews.clear();
    if (this.texture !== null) {
      this.device.destroyTexture(this.texture);
      this.texture = null;
    }
    this.cubeArrayView = null;
    this.compareSampler = null;
  }
};

// sdk/engine/node_modules/@forgeax/engine-render/src/render-contract.ts
var STANDARD_OUTPUT_TRANSFORM_FEATURE_ID = "forgeax::standard::output-transform";
var FXAA_POST_PROCESS_ID = "forgeax::post::fxaa";
function isFrameObservationDomain(value) {
  return value === "linear-hdr" || value === "linear-ldr" || value === "final-display" || value === "visible-surface";
}
var RENDER_GRAPH_EXECUTION_PHASE_CATALOG = [
  "record/graph-execute/point-shadow",
  "record/graph-execute/cluster-binner-upload",
  "record/graph-execute/g-buffer",
  "record/graph-execute/g-buffer/geometry-loop",
  "record/graph-execute/g-buffer/material-bind-groups",
  "record/graph-execute/g-buffer/pipeline-selection",
  "record/graph-execute/g-buffer/draw-submit",
  "record/graph-execute/ssao-calc",
  "record/graph-execute/ssao-blur",
  "record/graph-execute/lighting",
  "record/graph-execute/forward",
  "record/graph-execute/forward/geometry-loop",
  "record/graph-execute/forward/material-bind-groups",
  "record/graph-execute/forward/pipeline-selection",
  "record/graph-execute/forward/draw-submit",
  "record/graph-execute/output-transform",
  "record/graph-execute/present",
  "record/graph-execute/debug-overlay",
  "record/graph-execute/shadow",
  "record/graph-execute/spot-shadow",
  "record/graph-execute/skybox",
  "record/graph-execute/main",
  "record/graph-execute/fxaa",
  "record/graph-execute/bloom-horizontal",
  "record/graph-execute/bloom-vertical",
  "record/graph-execute/bloom-composite",
  "record/graph-execute/depth-pyramid",
  "record/graph-execute/ssr-trace",
  "record/graph-execute/ssr-temporal",
  "record/graph-execute/ssr-reflection-mip",
  "record/graph-execute/ssr-compose",
  "record/graph-execute/other"
];
var RENDER_HDRP_BINNER_PHASE_CATALOG = [
  "record/scene-state/hdrp-cluster/binner/light-bounds-and-occupancy",
  "record/scene-state/hdrp-cluster/binner/light-bounds-and-occupancy/light-aabb",
  "record/scene-state/hdrp-cluster/binner/light-bounds-and-occupancy/cluster-occupancy",
  "record/scene-state/hdrp-cluster/binner/cluster-reserve",
  "record/scene-state/hdrp-cluster/binner/input-preparation",
  "record/scene-state/hdrp-cluster/binner/bin-core",
  "record/scene-state/hdrp-cluster/binner/light-index-write",
  "record/scene-state/hdrp-cluster/binner/light-index-write/bounds-read",
  "record/scene-state/hdrp-cluster/binner/light-index-write/cluster-write"
];
var RENDER_HDRP_CLUSTER_PHASE_CATALOG = [
  "record/scene-state/hdrp-cluster/binner",
  ...RENDER_HDRP_BINNER_PHASE_CATALOG,
  "record/scene-state/hdrp-cluster/payload-packing",
  "record/scene-state/hdrp-cluster/buffer-upload"
];
var RENDER_SCENE_STATE_PHASE_CATALOG = [
  "record/scene-state/fold-buckets",
  "record/scene-state/lighting-prep",
  "record/scene-state/ambient-resolution",
  "record/scene-state/directional-shadow-cache",
  "record/scene-state/hdrp-cluster",
  ...RENDER_HDRP_CLUSTER_PHASE_CATALOG
];
var RENDER_GPU_DRIVEN_PREPARE_PHASE_CATALOG = [
  "record/gpu-driven-prepare",
  "record/gpu-driven-prepare/plan",
  "record/gpu-driven-prepare/plan/rows",
  "record/gpu-driven-prepare/plan/admission",
  "record/gpu-driven-prepare/filter",
  "record/gpu-driven-prepare/shadow-views",
  "record/gpu-driven-prepare/filter/lod",
  "record/gpu-driven-prepare/filter/lod/projection",
  "record/gpu-driven-prepare/filter/lod/selection",
  "record/gpu-driven-prepare/filter/lod/identity",
  "record/gpu-driven-prepare/filter/main-plan",
  "record/gpu-driven-prepare/filter/main-plan/groups",
  "record/gpu-driven-prepare/filter/main-plan/groups/key",
  "record/gpu-driven-prepare/filter/main-plan/batches",
  "record/gpu-driven-prepare/filter/counts",
  "record/gpu-driven-prepare/filter/shadow-ownership",
  "record/gpu-driven-prepare/filter/shadow-plan",
  "record/gpu-driven-prepare/filter/shadow-plan/groups",
  "record/gpu-driven-prepare/filter/shadow-plan/groups/key",
  "record/gpu-driven-prepare/filter/shadow-plan/batches",
  "record/gpu-driven-prepare/filter/admission",
  "record/gpu-driven-prepare/shadow-views/caster-classes",
  "record/gpu-driven-prepare/shadow-views/project-view",
  "record/gpu-driven-prepare/shadow-views/project-view/cache-update",
  "record/gpu-driven-prepare/shadow-views/project-view/lod",
  "record/gpu-driven-prepare/shadow-views/project-view/lod/projection",
  "record/gpu-driven-prepare/shadow-views/project-view/lod/selection",
  "record/gpu-driven-prepare/shadow-views/project-view/lod/identity"
];
var RENDER_RECORD_PHASE_CATALOG = [
  "record/scene-state",
  ...RENDER_SCENE_STATE_PHASE_CATALOG,
  "record/swapchain",
  "record/render-graph",
  "record/target-views",
  "record/validation",
  "record/validation/asset",
  "record/validation/lod-assets",
  "record/validation/residency",
  "record/validation/residency/project",
  "record/validation/residency/pack",
  "record/validation/residency/vertex-key",
  "record/validation/residency/vertex-equality",
  "record/validation/residency/vertex-buffer",
  "record/validation/residency/index-buffer",
  "record/validation/residency/vertex-write",
  "record/validation/residency/index-pack",
  "record/validation/residency/index-key",
  "record/validation/residency/index-equality",
  "record/validation/residency/index-write",
  "record/validation/residency/ownership-copy",
  ...RENDER_GPU_DRIVEN_PREPARE_PHASE_CATALOG,
  "record/dispatch-plan",
  "record/uploads",
  "record/bind-groups",
  "record/graph-execute",
  ...RENDER_GRAPH_EXECUTION_PHASE_CATALOG
];
var RENDER_PHASE_CATALOG = [
  "extract",
  "bind-groups",
  "features",
  "sort",
  "record",
  "submission/presentation",
  "submission/finish",
  "submission/submit",
  ...RENDER_RECORD_PHASE_CATALOG
];

// sdk/engine/node_modules/@forgeax/engine-render/src/material-render-state.ts
function isReflectedTransform(world) {
  const a = world[0] ?? 0, b = world[4] ?? 0, c = world[8] ?? 0;
  const d = world[1] ?? 0, e = world[5] ?? 0, f = world[9] ?? 0;
  const g = world[2] ?? 0, h = world[6] ?? 0, i = world[10] ?? 0;
  return a * (e * i - h * f) - b * (d * i - g * f) + c * (d * h - g * e) < 0;
}
var reflectedStates = /* @__PURE__ */ new WeakMap();
var REFLECTED_DEFAULT = Object.freeze({ frontFace: "cw" });
function reflectedRenderState(state, reflected) {
  if (!reflected) return state;
  if (state === void 0) return REFLECTED_DEFAULT;
  const frontFace = state.frontFace === "cw" ? "ccw" : "cw";
  let mirrored = reflectedStates.get(state);
  if (mirrored === void 0 || !sameReflection(state, mirrored, frontFace)) {
    mirrored = { ...state, frontFace };
    reflectedStates.set(state, mirrored);
  }
  return mirrored;
}
function sameReflection(state, mirrored, frontFace) {
  if (mirrored.frontFace !== frontFace) return false;
  const source = state, target = mirrored;
  let count = 0;
  for (const key in source) {
    count++;
    if (key !== "frontFace" && source[key] !== target[key]) return false;
  }
  return Object.keys(target).length === count + (source.frontFace === void 0 ? 1 : 0);
}
function transformRenderState(state, world) {
  return reflectedRenderState(state, isReflectedTransform(world));
}
var REVERSED_DEPTH_COMPARE = {
  never: "never",
  less: "greater",
  equal: "equal",
  "less-equal": "greater-equal",
  greater: "less",
  "not-equal": "not-equal",
  "greater-equal": "less-equal",
  always: "always"
};
function materialColorTarget(format, state, index = 0) {
  const output = state?.outputs?.[index];
  const blend = state?.outputs === void 0 ? state?.blend : output?.blend;
  const writeMask = state?.colorWriteMask === void 0 ? output?.writeMask : state.colorWriteMask & (output?.writeMask ?? 15);
  return {
    format,
    ...blend === void 0 ? {} : { blend },
    ...writeMask === void 0 ? {} : { writeMask }
  };
}
function materialDepthStencil(format, state) {
  return {
    format,
    depthWriteEnabled: state?.depthWriteEnabled ?? true,
    depthCompare: REVERSED_DEPTH_COMPARE[state?.depthCompare ?? "less"],
    ...state?.depthBias === void 0 ? {} : { depthBias: -state.depthBias },
    ...state?.depthBiasSlopeScale === void 0 ? {} : { depthBiasSlopeScale: -state.depthBiasSlopeScale },
    ...state?.depthBiasClamp === void 0 ? {} : { depthBiasClamp: -state.depthBiasClamp },
    ...state?.stencil === void 0 ? {} : { stencilFront: state.stencil, stencilBack: state.stencil },
    ...state?.stencilReadMask === void 0 ? {} : { stencilReadMask: state.stencilReadMask },
    ...state?.stencilWriteMask === void 0 ? {} : { stencilWriteMask: state.stencilWriteMask }
  };
}
function shadowCasterRenderState(state = {}) {
  return {
    cullMode: state.cullMode === "none" ? "none" : state.cullMode === "front" ? "back" : "front",
    ...state.frontFace === void 0 ? {} : { frontFace: state.frontFace },
    ...state.depthBias === void 0 ? {} : { depthBias: state.depthBias },
    ...state.depthBiasSlopeScale === void 0 ? {} : { depthBiasSlopeScale: state.depthBiasSlopeScale },
    ...state.depthBiasClamp === void 0 ? {} : { depthBiasClamp: state.depthBiasClamp }
  };
}
function supportsGpuShadowRenderState(state) {
  if (state === void 0) return true;
  const raster = shadowCasterRenderState(state) ?? {};
  return Object.entries(state).every(([key, value]) => value === void 0 || key in raster);
}

// sdk/engine/node_modules/@forgeax/engine-render/src/extract/gpu-driven.ts
import {
  deriveVertexLayoutProjection
} from "@forgeax/engine-geometry";

// sdk/engine/node_modules/@forgeax/engine-render/src/gpu-driven/batch-execution.ts
import {
  deriveVertexBufferLayoutFromProjection
} from "@forgeax/engine-geometry";
import {
  err as err17,
  isTriangleTopology,
  ok as ok17
} from "@forgeax/engine-types";

// sdk/engine/node_modules/@forgeax/engine-render/src/transmission/projection.ts
function standardTransmissionValue(material) {
  if (material.surfaceModel !== "standard" && material.materialShaderId !== "forgeax::default-standard-pbr")
    return void 0;
  const value = material.paramSnapshot?.transmission;
  return typeof value === "number" ? value : void 0;
}

// sdk/engine/node_modules/@forgeax/engine-render/src/gpu-driven/batch-layout.ts
var GPU_DRIVEN_LOD_LEVEL_CAPACITY = 8;
function batchLodLevelCount(batch) {
  const lod = batch.lod;
  if (lod === void 0) return 1;
  return Math.min(
    GPU_DRIVEN_LOD_LEVEL_CAPACITY,
    Math.max(1, lod.coverages.length, (lod.ranges?.length ?? 0) + 1)
  );
}
function batchLevelStride(batch) {
  return batch.visibleAllocationCapacity ?? alignInstanceBase(batch.visibleCapacity);
}
function batchVisibleSpan(batch) {
  return (batchLodLevelCount(batch) - 1) * batchLevelStride(batch) + (batch.visibleAllocationCapacity ?? batch.visibleCapacity);
}
var GPU_DRIVEN_INDIRECT_COMMAND_BYTES = 20;
function alignInstanceBase(value) {
  return Math.ceil(value / 64) * 64;
}

// sdk/engine/node_modules/@forgeax/engine-render/src/gpu-driven/prepared-draw.ts
function gpuDrivenMaterialArtifactKey(input) {
  return [
    input.material,
    input.deformation,
    input.receiptIdentity ?? "<legacy-receipt>",
    input.receiptGeneration
  ].join("|");
}
var preparedMaterialKeys = /* @__PURE__ */ new WeakMap();
function freezePreparedGpuDrivenDraw(prepared) {
  const owned = Object.freeze(prepared);
  const identity = Object.getOwnPropertyDescriptor(owned, "identity")?.value;
  if (identity === void 0 || !Object.isFrozen(identity)) return owned;
  const material = Object.getOwnPropertyDescriptor(identity, "material")?.value;
  const deformation = Object.getOwnPropertyDescriptor(identity, "deformation")?.value;
  const receiptIdentity = Object.getOwnPropertyDescriptor(owned, "receiptIdentity")?.value;
  const receiptGeneration = Object.getOwnPropertyDescriptor(owned, "receiptGeneration")?.value;
  if (typeof material === "string" && (deformation === "rigid" || deformation === "skin") && typeof receiptIdentity === "string" && typeof receiptGeneration === "number") {
    preparedMaterialKeys.set(
      owned,
      gpuDrivenMaterialArtifactKey({
        material,
        deformation,
        receiptIdentity,
        receiptGeneration
      })
    );
  }
  return owned;
}
function capturedPreparedMaterialArtifactKey(prepared) {
  return preparedMaterialKeys.get(prepared);
}
function failure(code, detail) {
  return { ok: false, error: new GpuDrivenPreparationError(code, detail) };
}
var ownedVertexInputs = /* @__PURE__ */ new WeakMap();
var immutableVertexInputs = /* @__PURE__ */ new WeakSet();
function ownGpuDrivenVertexInputs(inputs) {
  if (ownedVertexInputs.has(inputs)) return inputs;
  const owned = isImmutableVertexInputs(inputs) ? inputs : Object.freeze(
    inputs.map(
      ({ semantic, location, format }) => Object.freeze({ semantic, location, format })
    )
  );
  if (!isImmutableVertexInputs(owned)) return owned;
  ownedVertexInputs.set(owned, {
    admissions: /* @__PURE__ */ new WeakMap(),
    vertexColor: owned.some((input) => input.semantic === "color")
  });
  return owned;
}
function hasGpuDrivenVertexColor(inputs) {
  return ownedVertexInputs.get(inputs)?.vertexColor ?? inputs.some((input) => input.semantic === "color");
}
function isImmutableVertexInputs(inputs) {
  if (immutableVertexInputs.has(inputs)) return true;
  if (!Array.isArray(inputs) || !Object.isFrozen(inputs) || Object.getPrototypeOf(inputs) !== Array.prototype || Reflect.ownKeys(inputs).length !== inputs.length + 1)
    return false;
  for (let index = 0; index < inputs.length; index++) {
    const entry = Object.getOwnPropertyDescriptor(inputs, index)?.value;
    if (entry === null || typeof entry !== "object" || !Object.isFrozen(entry) || Object.getPrototypeOf(entry) !== Object.prototype || Reflect.ownKeys(entry).length !== 3)
      return false;
    for (const field of ["semantic", "location", "format"]) {
      const descriptor = Object.getOwnPropertyDescriptor(entry, field);
      if (descriptor === void 0 || !("value" in descriptor)) return false;
      if (typeof descriptor.value !== (field === "location" ? "number" : "string")) return false;
    }
  }
  immutableVertexInputs.add(inputs);
  return true;
}
function hasRequiredVertexInputs(expected, actual) {
  const admissions = ownedVertexInputs.get(actual)?.admissions;
  const retained = admissions?.get(expected);
  if (retained !== void 0) return retained;
  const matches = expected.every(
    (input) => actual.some(
      (candidate2) => candidate2.semantic === input.semantic && candidate2.location === input.location && candidate2.format === input.format
    )
  );
  if (admissions !== void 0 && isImmutableVertexInputs(expected)) {
    admissions.set(expected, matches);
  }
  return matches;
}
function hasMaterialResources(material, receipt) {
  if ((material.textureSources?.size ?? 0) > 0 || (material.videoTextureFields?.size ?? 0) > 0) {
    return false;
  }
  const textures = material.textureHandles;
  const samplers = material.samplerHandles;
  const authoredTextures = material.authoredTextureFields;
  const authoredSamplers = material.authoredSamplerFields;
  return receipt.resourceSlots.every((slot) => {
    if (slot.kind === "storage-buffer") {
      return receipt.surface?.dynamicInput?.group === slot.group && receipt.surface.dynamicInput.binding === slot.binding && slot.group === 3 && slot.binding === 3;
    }
    if (slot.kind === "texture") {
      if (!authoredTextures?.has(slot.parameter)) return true;
      return textures?.has(slot.parameter) === true || material.textureSources?.has(slot.parameter) === true || material.videoTextureFields?.has(slot.parameter) === true;
    }
    if (!authoredSamplers?.has(slot.parameter)) return true;
    return samplers?.has(slot.parameter) === true;
  });
}
function prepareGpuDrivenDraw(input) {
  const receipt = input.artifact.receipt;
  if (receipt === void 0 || receipt.sceneIndexEntry === void 0) {
    return failure("missing-material-receipt", {
      reason: "material-receipt-missing",
      owner: "material",
      expected: "MaterialShaderArtifact.receipt"
    });
  }
  if (receipt.generation !== input.generation) {
    return failure("stale-generation", {
      reason: "generation-stale",
      owner: "generation",
      expectedGeneration: input.generation,
      actualGeneration: receipt.generation
    });
  }
  if (receipt.reflection.layoutIdentity !== input.artifact.layoutIdentity) {
    return failure("reflection-mismatch", {
      reason: "reflection-receipt-mismatch",
      owner: "material",
      expected: input.artifact.layoutIdentity,
      actual: receipt.reflection.layoutIdentity
    });
  }
  if (receipt.uvSets.some((uv) => uv.set > 0) && input.geometry.vertexInputs.length < 3) {
    return failure("missing-uv", {
      reason: "uv-set-missing",
      owner: "geometry",
      expected: `${receipt.uvSets.length} material UV sets`,
      actual: `${input.geometry.vertexInputs.filter((vertex) => vertex.semantic.startsWith("uv")).length} geometry UV sets`
    });
  }
  if (!hasRequiredVertexInputs(receipt.vertexInputs, input.geometry.vertexInputs)) {
    return failure("vertex-input-mismatch", {
      reason: "vertex-semantic-mismatch",
      owner: "geometry",
      expected: receipt.vertexInputs.map((input2) => input2.semantic).join(","),
      actual: input.geometry.vertexInputs.map((input2) => input2.semantic).join(",")
    });
  }
  const hasAlphaMask = receipt.alphaMask.cutoff.length > 0 || receipt.alphaMask.source.length > 0;
  if (hasAlphaMask && (receipt.alphaMask.cutoff.length === 0 || receipt.alphaMask.source.length === 0)) {
    return failure("alpha-mask-mismatch", {
      reason: "alpha-mask-receipt-missing",
      owner: "material",
      expected: "alphaMask.cutoff and alphaMask.source for a masked Pass"
    });
  }
  if (!hasMaterialResources(input.material, receipt)) {
    return failure("resource-not-ready", {
      reason: "material-resource-missing",
      owner: "material",
      expected: receipt.resourceSlots.map((slot) => slot.parameter).join(",")
    });
  }
  const deformation = input.deformation;
  if (deformation === "skin" && receipt.skinPaletteAddress === void 0) {
    return failure("skin-receipt-mismatch", {
      reason: "skin-address-missing",
      owner: "skin",
      expected: "a material ABI with a storage palette address"
    });
  }
  return {
    ok: true,
    value: freezePreparedGpuDrivenDraw({
      identity: Object.freeze({
        material: input.artifact.material,
        geometry: input.geometry.identity,
        deformation
      }),
      receiptGeneration: receipt.generation,
      receiptIdentity: receipt.receiptIdentity,
      directEntry: receipt.directEntry,
      sceneIndexEntry: receipt.sceneIndexEntry,
      materialRow: receipt.materialRow,
      resourceSlots: receipt.resourceSlots,
      uvSets: receipt.uvSets,
      vertexInputs: receipt.vertexInputs,
      alphaMask: receipt.alphaMask,
      skinPaletteAddress: receipt.skinPaletteAddress,
      topology: input.draw.topology,
      indexed: input.draw.kind === "indexed",
      first: input.draw.first,
      count: input.draw.count,
      baseVertex: input.draw.baseVertex
    })
  };
}

// sdk/engine/node_modules/@forgeax/engine-render/src/gpu-driven/batch-execution.ts
var capturedGeometry = /* @__PURE__ */ new WeakSet();
function captureBatchGeometry(source) {
  if (capturedGeometry.has(source)) return source;
  const value = Object.freeze({
    receipt: Object.freeze({
      ...source.receipt,
      vertexInputs: ownGpuDrivenVertexInputs(source.receipt.vertexInputs)
    }),
    ...source.layout === void 0 ? {} : {
      layout: Object.freeze({
        ...source.layout,
        attributes: Object.freeze(
          source.layout.attributes.map((attribute) => Object.freeze({ ...attribute }))
        )
      })
    },
    draw: Object.freeze({ ...source.draw }),
    deformation: source.deformation
  });
  capturedGeometry.add(value);
  return value;
}
function prepareBatchExecution(geometry, material, pass, resolve) {
  if (pass === void 0) return ok17({ route: "none" });
  if (pass.kind === "shadow" && !isTriangleTopology(geometry.draw.topology))
    return ok17({ route: "none" });
  const direct = () => ok17({ route: "direct", material, pass });
  const state = pass.renderState;
  if (state?.stencil !== void 0 || pass.kind === "shadow" && !supportsGpuShadowRenderState(state) || (material.textureSources?.size ?? 0) > 0 || (material.videoTextureFields?.size ?? 0) > 0 || pass.kind === "forward" && (state?.blend !== void 0 || (standardTransmissionValue(material) ?? 0) > 0))
    return direct();
  const required = pass.sceneIndexProgramKey !== void 0 || isCanonicalStandardPbrMaterialShader(pass.shaderId);
  const artifact = resolve(pass.sceneIndexProgramKey ?? pass.shaderId, {
    vertexColorAvailable: hasGpuDrivenVertexColor(geometry.receipt.vertexInputs),
    deformation: geometry.deformation,
    pass: pass.kind,
    address: "scene-index"
  });
  if (artifact?.receipt?.sceneIndexEntry === void 0) {
    if (!required) return direct();
    return err17(
      new GpuDrivenPreparationError("missing-material-receipt", {
        reason: "material-receipt-missing",
        owner: "material",
        expected: `scene-index artifact for ${pass.sceneIndexProgramKey ?? pass.shaderId}`
      })
    );
  }
  const receipt = artifact.receipt;
  const selected = {
    ...artifact,
    ...pass.sceneIndexProgramKey === void 0 ? {} : {
      material: pass.shaderId,
      specializationKey: pass.sceneIndexProgramKey
    },
    ...pass.vertexEntry === void 0 ? {} : { vertexEntry: pass.vertexEntry },
    ...pass.fragmentEntry === void 0 ? {} : { fragmentEntry: pass.fragmentEntry }
  };
  const sourceInputs = geometry.receipt.vertexInputs;
  const layout = geometry.layout === void 0 || artifact.uvSetCount === void 0 || receipt.vertexInputs.every(
    (input) => sourceInputs.some((actual) => actual.location === input.location)
  ) ? void 0 : deriveVertexBufferLayoutFromProjection(geometry.layout, {
    shaderUvSetCount: artifact.uvSetCount
  })[0];
  const aliases = layout?.arrayStride !== geometry.layout?.arrayStride ? [] : receipt.vertexInputs.filter(
    (input) => !sourceInputs.some((actual) => actual.location === input.location) && layout?.attributes.some(
      (actual) => actual.shaderLocation === input.location && actual.format === input.format
    )
  );
  const prepared = prepareGpuDrivenDraw({
    material,
    deformation: geometry.deformation,
    artifact: selected,
    geometry: aliases.length === 0 ? geometry.receipt : { ...geometry.receipt, vertexInputs: [...sourceInputs, ...aliases] },
    generation: receipt.generation,
    draw: geometry.draw
  });
  return prepared.ok ? ok17({ route: "gpu", material, pass, artifact: selected, prepared: prepared.value }) : err17(prepared.error);
}
function captureBatchLod(batch, mesh) {
  const lod = batch.lod;
  if (lod === void 0) return void 0;
  const coverages = [];
  for (let i = 0; i < Math.min(lod.coverages.length, GPU_DRIVEN_LOD_LEVEL_CAPACITY); i++)
    coverages.push(lod.coverages[i]);
  const ranges = [];
  const count = Math.max(
    0,
    Math.min(
      mesh?.lodRanges === void 0 ? lod.ranges?.length ?? 0 : mesh?.lodRanges.length - 1,
      GPU_DRIVEN_LOD_LEVEL_CAPACITY - 1
    )
  );
  for (let i = 0; i < count; i++) {
    let range2;
    if (mesh?.lodRanges === void 0) range2 = lod.ranges?.[i];
    else {
      if (batch.binding === void 0)
        throw Error("Resident LOD requires a shared geometry binding");
      range2 = mesh.lodRanges[i + 1]?.[batch.binding.drawItemIndex];
    }
    ranges.push(
      range2 === void 0 ? void 0 : Object.freeze({
        first: range2.first,
        count: range2.count,
        baseVertex: range2.baseVertex
      })
    );
  }
  return Object.freeze({
    coverages: Object.freeze(coverages),
    ...lod.hysteresis === void 0 ? {} : { hysteresis: lod.hysteresis },
    ...lod.crossfade === void 0 ? {} : { crossfade: lod.crossfade },
    ...lod.ranges === void 0 && mesh?.lodRanges === void 0 ? {} : { ranges: Object.freeze(ranges) }
  });
}

// sdk/engine/node_modules/@forgeax/engine-render/src/extract/gpu-driven.ts
function gpuDrivenSourceDrawItemIndex(draw, compactIndex) {
  return draw.drawItemIndex ?? compactIndex;
}
var EMPTY_MATERIAL_RESOURCE_CLASS = JSON.stringify({ textures: [], samplers: [] });
function gpuDrivenMaterialResourceClass(material) {
  if ((material.textureHandles?.size ?? 0) === 0 && (material.samplerHandles?.size ?? 0) === 0) {
    return EMPTY_MATERIAL_RESOURCE_CLASS;
  }
  const textures = [...material.textureHandles?.entries() ?? []].map(([name, handle]) => [name, Number(handle)]).sort(([left], [right]) => left.localeCompare(right));
  const samplers = [...material.samplerHandles?.entries() ?? []].map(([name, handle]) => [name, Number(handle)]).sort(([left], [right]) => left.localeCompare(right));
  return JSON.stringify({
    textures,
    samplers
  });
}
var vertexInputsByLayout = /* @__PURE__ */ new WeakMap();
function buildGpuDrivenDraws(input) {
  const parsedMesh = input.mesh;
  if (parsedMesh === void 0) return [];
  const indexed = parsedMesh.indices !== void 0;
  const submeshes = parsedMesh.submeshes;
  const layoutProjection = deriveVertexLayoutProjection(parsedMesh.attributes);
  let vertexInputs = vertexInputsByLayout.get(layoutProjection);
  if (vertexInputs === void 0) {
    vertexInputs = ownGpuDrivenVertexInputs(
      layoutProjection.attributes.map((attribute) => ({
        semantic: attribute.key,
        location: attribute.shaderLocation,
        format: attribute.format
      }))
    );
    vertexInputsByLayout.set(layoutProjection, vertexInputs);
  }
  const geometry = {
    identity: `${parsedMesh.guid ?? "<no-guid>"}:${layoutProjection.digest}`,
    vertexInputs,
    topology: submeshes[0]?.topology ?? "triangle-list",
    indexed
  };
  let nonIndexedFirst = 0;
  return submeshes.flatMap((submesh, drawItemIndex) => {
    const drawMaterial = input.materials[submesh.materialSlot] ?? input.fallbackMaterial;
    const first = indexed ? submesh.indexOffset : nonIndexedFirst;
    nonIndexedFirst += submesh.vertexCount;
    const draw = {
      drawItemIndex,
      kind: indexed ? "indexed" : "non-indexed",
      first,
      count: indexed ? submesh.indexCount : submesh.vertexCount,
      baseVertex: 0,
      materialSlot: submesh.materialSlot,
      topology: submesh.topology,
      pipelineClass: `${drawMaterial.materialShaderId ?? "forgeax::default-unlit"}|${submesh.topology}|${JSON.stringify(drawMaterial.renderState ?? null)}`,
      materialResourceClass: gpuDrivenMaterialResourceClass(drawMaterial)
    };
    const lodRanges = input.lodMeshes?.map((lodMesh) => {
      if (lodMesh === void 0) return void 0;
      const lower = lodMesh.submeshes[drawItemIndex];
      if (lower === void 0) return void 0;
      const lowerIndexed = lodMesh.indices !== void 0;
      const lowerFirst = lowerIndexed ? lower.indexOffset : lodMesh.submeshes.slice(0, drawItemIndex).reduce((offset, entry) => offset + entry.vertexCount, 0);
      return {
        first: lowerFirst,
        count: lowerIndexed ? lower.indexCount : lower.vertexCount,
        baseVertex: 0
      };
    });
    const withLodRanges = lodRanges?.length !== 0 && lodRanges?.every((range2) => range2 !== void 0) ? { lodRanges } : {};
    const binding = captureBatchGeometry({
      receipt: { ...geometry, topology: draw.topology, indexed: draw.kind === "indexed" },
      layout: layoutProjection,
      draw: {
        kind: draw.kind,
        first: draw.first,
        count: draw.count,
        baseVertex: draw.baseVertex,
        topology: draw.topology
      },
      deformation: input.deformation
    });
    const prepared = input.getMaterialShaderArtifact === void 0 ? void 0 : (() => {
      const shaderId = drawMaterial.materialShaderId;
      const sceneIndexProgramKey = Object.entries(
        drawMaterial.materialSceneIndexProgramKeys ?? {}
      ).find(
        ([name, program]) => program.pass === "forward" && drawMaterial.materialProgramKeys?.[name] === shaderId
      )?.[1]?.specializationKey;
      const execution = prepareBatchExecution(
        binding,
        drawMaterial,
        shaderId === void 0 ? void 0 : {
          kind: "forward",
          shaderId,
          ...sceneIndexProgramKey === void 0 ? {} : { sceneIndexProgramKey },
          ...drawMaterial.renderState === void 0 ? {} : { renderState: drawMaterial.renderState }
        },
        input.getMaterialShaderArtifact
      );
      return execution.ok ? execution.value.route === "gpu" ? execution.value.prepared : void 0 : execution.error;
    })();
    if (prepared instanceof GpuDrivenPreparationError) {
      return [{ ...draw, geometry: binding, preparationError: prepared, ...withLodRanges }];
    }
    return [
      prepared === void 0 ? { ...draw, geometry: binding, ...withLodRanges } : { ...draw, geometry: binding, prepared, ...withLodRanges }
    ];
  });
}

// sdk/engine/node_modules/@forgeax/engine-render/src/assembly/shader-prewarm-policy.ts
import { findVariantByKey } from "@forgeax/engine-shader";
var STANDARD_PBR_REQUIRED_SAMPLED_TEXTURES = 21;
function isOrdinaryMaterialVariant(variant) {
  return variant.defines.COVERAGE_ONLY !== true && variant.defines.VISIBLE_SURFACE_AVAILABLE !== true;
}
function selectHdrpPbrPrewarmVariants(manifestEntry, storageBufferCapable, extendedLightingShaderAvailableOrTransmissionCapable = true, transmissionCapable = true, directionalPcssAvailable = true, projectorAvailable = true, atmosphereAvailable2 = false) {
  const variants = manifestEntry?.variants ?? [];
  const hasExtendedLightingAxis = variants.some(
    (variant) => "EXTENDED_LIGHTING_AVAILABLE" in variant.defines
  );
  const extendedLightingShaderAvailable = hasExtendedLightingAxis ? extendedLightingShaderAvailableOrTransmissionCapable : true;
  const effectiveTransmissionCapable = hasExtendedLightingAxis ? transmissionCapable : extendedLightingShaderAvailableOrTransmissionCapable;
  if (!storageBufferCapable) return [];
  return variants.filter(
    (variant) => isOrdinaryMaterialVariant(variant) && (variant.defines.ATMOSPHERE_AVAILABLE ?? false) === atmosphereAvailable2 && variant.defines.STORAGE_BUFFER_AVAILABLE === storageBufferCapable && (!("EXTENDED_LIGHTING_AVAILABLE" in variant.defines) || variant.defines.EXTENDED_LIGHTING_AVAILABLE === extendedLightingShaderAvailable) && variant.defines.CLUSTER_FORWARD_AVAILABLE === true && (!("DIRECTIONAL_PCSS_AVAILABLE" in variant.defines) || variant.defines.DIRECTIONAL_PCSS_AVAILABLE === directionalPcssAvailable) && (!("PROJECTOR_AVAILABLE" in variant.defines) || variant.defines.PROJECTOR_AVAILABLE === projectorAvailable) && variant.defines.PROBE_BLEND_AVAILABLE !== true && (effectiveTransmissionCapable || variant.defines.TRANSMISSION_AVAILABLE !== true)
  ) ?? [];
}
function selectSkinPrewarmVariants(manifestEntry, storageBufferCapable, extendedLightingAvailable = true, directionalPcssAvailable = true, projectorAvailable = true, transmissionCapable = true, atmosphereAvailable2 = false) {
  return manifestEntry?.variants.filter(
    ({ defines }) => defines.COVERAGE_ONLY !== true && defines.VISIBLE_SURFACE_AVAILABLE !== true && (defines.ATMOSPHERE_AVAILABLE ?? false) === atmosphereAvailable2 && defines.STORAGE_BUFFER_AVAILABLE === storageBufferCapable && defines.PROBE_BLEND_AVAILABLE !== true && (!("EXTENDED_LIGHTING_AVAILABLE" in defines) || defines.EXTENDED_LIGHTING_AVAILABLE === extendedLightingAvailable) && (!("DIRECTIONAL_PCSS_AVAILABLE" in defines) || defines.DIRECTIONAL_PCSS_AVAILABLE === directionalPcssAvailable) && (!("PROJECTOR_AVAILABLE" in defines) || defines.PROJECTOR_AVAILABLE === projectorAvailable) && (transmissionCapable || defines.TRANSMISSION_AVAILABLE !== true)
  ) ?? [];
}
function selectGpuDrivenSceneIndexVariant(manifestEntry, extendedLightingAvailable, directionalPcssAvailable, projectorAvailable, vertexColorAvailable = false, atmosphereAvailable2 = false) {
  return manifestEntry?.variants.find(
    (variant) => isOrdinaryMaterialVariant(variant) && variant.defines.STORAGE_BUFFER_AVAILABLE === true && variant.defines.GPU_DRIVEN_SCENE_INDEX_AVAILABLE === true && (variant.defines.ATMOSPHERE_AVAILABLE ?? false) === atmosphereAvailable2 && (!("CLUSTER_FORWARD_AVAILABLE" in variant.defines) || variant.defines.CLUSTER_FORWARD_AVAILABLE === false) && variant.defines.VERTEX_COLOR_AVAILABLE === true === vertexColorAvailable && (!("PROBE_BLEND_AVAILABLE" in variant.defines) || variant.defines.PROBE_BLEND_AVAILABLE === false) && (!("EXTENDED_LIGHTING_AVAILABLE" in variant.defines) || variant.defines.EXTENDED_LIGHTING_AVAILABLE === extendedLightingAvailable) && (!("DIRECTIONAL_PCSS_AVAILABLE" in variant.defines) || variant.defines.DIRECTIONAL_PCSS_AVAILABLE === directionalPcssAvailable) && (!("PROJECTOR_AVAILABLE" in variant.defines) || variant.defines.PROJECTOR_AVAILABLE === projectorAvailable) && (!("REFLECTION_FALLBACK_AVAILABLE" in variant.defines) || variant.defines.REFLECTION_FALLBACK_AVAILABLE === false) && (!("TRANSMISSION_AVAILABLE" in variant.defines) || variant.defines.TRANSMISSION_AVAILABLE === false)
  );
}
function selectProbePrewarmVariants(manifestEntry, storageBufferCapable, extendedLightingShaderAvailable = true, transmissionCapable = true, directionalPcssAvailable = true, projectorAvailable = true, webgl2Downlevel = false, atmosphereAvailable2 = false) {
  if (!storageBufferCapable) return [];
  return manifestEntry?.variants.filter((variant) => {
    const defines = variant.defines;
    return isOrdinaryMaterialVariant(variant) && (defines.ATMOSPHERE_AVAILABLE ?? false) === atmosphereAvailable2 && defines.PROBE_BLEND_AVAILABLE === true && defines.STORAGE_BUFFER_AVAILABLE === storageBufferCapable && (!("WEBGL2_COMPAT" in defines) || defines.WEBGL2_COMPAT === webgl2Downlevel) && (!("EXTENDED_LIGHTING_AVAILABLE" in defines) || defines.EXTENDED_LIGHTING_AVAILABLE === extendedLightingShaderAvailable) && (!("DIRECTIONAL_PCSS_AVAILABLE" in defines) || defines.DIRECTIONAL_PCSS_AVAILABLE === directionalPcssAvailable) && (!("PROJECTOR_AVAILABLE" in defines) || defines.PROJECTOR_AVAILABLE === projectorAvailable) && (transmissionCapable || defines.TRANSMISSION_AVAILABLE !== true);
  }) ?? [];
}
function selectBootVariant(manifestEntry, axes) {
  const required = Object.entries(axes);
  return manifestEntry?.variants.find(
    ({ defines }) => required.every(([axis, value]) => (defines[axis] ?? false) === value)
  );
}
var ADMIT_EVERY_VARIANT = () => true;
async function prewarmMaterialShaderVariants(materialShaderId, variants, prewarmedModules, compile, seed, admits) {
  const admitted = variants.filter(
    (variant) => prewarmedModules.has(variant.composedWgsl) || admits(`module-${materialShaderId}#${variant.definesKey}`)
  );
  for (let offset = 0; offset < admitted.length; offset += 8) {
    const batch = admitted.slice(offset, offset + 8);
    const pending = /* @__PURE__ */ new Map();
    for (const variant of batch) {
      if (prewarmedModules.has(variant.composedWgsl) || pending.has(variant.composedWgsl)) continue;
      const label = `module-${materialShaderId}#${variant.definesKey}`;
      pending.set(
        variant.composedWgsl,
        Promise.resolve().then(() => compile(variant, label))
      );
    }
    const results = await Promise.allSettled(
      [...pending].map(async ([source, request]) => {
        const result = await request;
        if (!result.ok) throw result.error;
        return { source, module: result.value };
      })
    );
    for (const result of results) {
      if (result.status === "rejected") throw result.reason;
      prewarmedModules.set(result.value.source, result.value.module);
    }
    for (const variant of batch) {
      const module = prewarmedModules.get(variant.composedWgsl);
      if (module === void 0) throw new Error("missing prepared material shader module");
      seed(`module-${materialShaderId}#${variant.definesKey}`, module);
    }
  }
}
function selectStandardPbrTransmissionPrewarmVariants(manifestEntry, storageBufferCapable, directionalPcssAvailable = true, projectorAvailable = true, extendedLightingShaderAvailable = true, atmosphereAvailable2 = false) {
  if (manifestEntry === void 0) return [];
  const selected = [];
  for (const transmissionAvailable of [false, true]) {
    const declared = manifestEntry.variants.find(
      (variant) => isOrdinaryMaterialVariant(variant) && (variant.defines.ATMOSPHERE_AVAILABLE ?? false) === atmosphereAvailable2 && variant.defines.GPU_DRIVEN_SCENE_INDEX_AVAILABLE !== true && variant.defines.STORAGE_BUFFER_AVAILABLE === storageBufferCapable && variant.defines.CLUSTER_FORWARD_AVAILABLE === standardBootClusterAxis() && variant.defines.VERTEX_COLOR_AVAILABLE === false && (!("DIRECTIONAL_PCSS_AVAILABLE" in variant.defines) || variant.defines.DIRECTIONAL_PCSS_AVAILABLE === directionalPcssAvailable) && (!("PROJECTOR_AVAILABLE" in variant.defines) || variant.defines.PROJECTOR_AVAILABLE === projectorAvailable) && (!("EXTENDED_LIGHTING_AVAILABLE" in variant.defines) || variant.defines.EXTENDED_LIGHTING_AVAILABLE === extendedLightingShaderAvailable) && variant.defines.PROBE_BLEND_AVAILABLE !== true && variant.defines.TRANSMISSION_AVAILABLE === transmissionAvailable
    );
    if (declared === void 0) {
      throw new Error(
        `Standard material shader manifest lacks exact TRANSMISSION_AVAILABLE=${transmissionAvailable} prewarm variant`
      );
    }
    const exact = findVariantByKey(manifestEntry, declared.definesKey);
    if (exact === void 0) {
      throw new Error(
        `Standard material shader manifest exact lookup failed for TRANSMISSION_AVAILABLE=${transmissionAvailable}`
      );
    }
    selected.push(exact);
  }
  return selected;
}
function standardBootClusterAxis() {
  return false;
}

// sdk/engine/node_modules/@forgeax/engine-render/src/assembly/mesh-ssbo-grow.ts
import { MeshSsboCeilingReachedError } from "@forgeax/engine-assets-runtime";
var INITIAL_MESH_SSBO_SLOT_COUNT = 1024;
function nextPow2(n) {
  if (n <= 1) return 1;
  let v = 1;
  while (v < n) v <<= 1;
  return v;
}
var WEBGPU_SPEC_FLOOR_MAX_STORAGE_BUFFER_BINDING_SIZE = 134217728;
function deriveStorageBufferCeiling(limits) {
  if (typeof limits.maxStorageBufferBindingSize === "number" && limits.maxStorageBufferBindingSize > 0) {
    return limits.maxStorageBufferBindingSize;
  }
  if (typeof limits.maxBufferSize === "number" && limits.maxBufferSize > 0) {
    return limits.maxBufferSize;
  }
  if (typeof limits.maxUniformBufferBindingSize === "number" && limits.maxUniformBufferBindingSize > 0) {
    return limits.maxUniformBufferBindingSize;
  }
  return WEBGPU_SPEC_FLOOR_MAX_STORAGE_BUFFER_BINDING_SIZE;
}
function meshSsboBuffer(storage, byteOffset) {
  const pages = storage.pages;
  if (pages === void 0) {
    if (storage.buffer === null) throw new Error("draw buffer is not allocated");
    return storage.buffer;
  }
  const buffer = pages.buffers[Math.floor(byteOffset / pages.byteStride)];
  if (buffer === void 0) throw new Error("draw buffer address exceeds allocated pages");
  return buffer;
}
function meshSsboBufferBinding(storage, byteOffset) {
  const buffer = meshSsboBuffer(storage, byteOffset);
  const pages = storage.pages;
  return {
    buffer,
    byteOffset: pages === void 0 ? byteOffset : byteOffset - Math.floor(byteOffset / pages.byteStride) * pages.byteStride
  };
}
function writeMeshSsboBuffer(queue, storage, byteOffset, data, dataOffset = 0, size = data.byteLength - dataOffset) {
  if (size === 0) return;
  const pages = storage.pages;
  if (pages === void 0) {
    const binding = meshSsboBufferBinding(storage, byteOffset);
    const result = queue.writeBuffer(binding.buffer, binding.byteOffset, data, dataOffset, size);
    if (!result.ok) throw result.error;
    return;
  }
  const first = Math.max(0, Math.floor((byteOffset - pages.byteSize) / pages.byteStride) + 1);
  const last = Math.min(
    pages.buffers.length - 1,
    Math.floor((byteOffset + size - 1) / pages.byteStride)
  );
  for (let index = first; index <= last; index += 1) {
    const buffer = pages.buffers[index];
    if (buffer === void 0) throw new Error("draw buffer upload has an unallocated page");
    const pageStart = index * pages.byteStride;
    const start = Math.max(byteOffset, pageStart);
    const end = Math.min(byteOffset + size, pageStart + pages.byteSize);
    if (start >= end) continue;
    const result = queue.writeBuffer(
      buffer,
      start - pageStart,
      data,
      dataOffset + start - byteOffset,
      end - start
    );
    if (!result.ok) throw result.error;
  }
}
function requireMeshSsboBuffer(wrapper) {
  if (wrapper.buffer === null && wrapper.pages?.buffers[0] === void 0)
    throw new Error("mesh SSBO initial allocation was not completed");
}
function createMeshSsboGrowController(init) {
  const { device, errorRegistry, initialSlotCount, materialStride, meshUsage, materialUsage } = init;
  const meshWrapper = {
    buffer: null,
    sizeInBytes: 0
  };
  const materialWrapper = {
    buffer: null,
    sizeInBytes: 0
  };
  const state = {
    meshSlotCount: 0,
    materialSlotCount: 0,
    mesh: meshWrapper,
    material: materialWrapper
  };
  let initialised = false;
  const meshStride = init.meshStride ?? materialStride;
  const meshWindow = init.meshBindingSize ?? meshStride;
  const materialWindow = init.materialBindingSize ?? materialStride;
  const uniformLimit = device.limits.maxUniformBufferBindingSize;
  const pageBytes = init.uniformPages ? Math.min(16384, uniformLimit !== void 0 && uniformLimit > 0 ? uniformLimit : 16384) : void 0;
  const pageSlots = (stride, window) => {
    if (pageBytes === void 0) return Number.POSITIVE_INFINITY;
    const count = Math.floor((pageBytes - Math.max(window, stride)) / stride) + 1;
    if (count < 1) throw new Error("draw buffer binding window exceeds uniform page capacity");
    return count;
  };
  const meshPageSlots = pageSlots(meshStride, meshWindow);
  const materialPageSlots = pageSlots(materialStride, materialWindow);
  const allocBufferPair = (meshSlots, materialSlots) => {
    const candidate2 = init.scope?.createChild("draw-buffer-growth");
    const created = [];
    const create = (label, size, usage) => {
      const buffer = device.createBuffer({ label, size, usage, mappedAtCreation: false });
      created.push(buffer);
      if (candidate2 !== void 0) {
        if (device.destroyBuffer === void 0)
          throw new Error("scoped draw buffers require destruction");
        candidate2._adopt("buffer", buffer, device.destroyBuffer);
      }
      return buffer;
    };
    const allocate = (previous, slots, currentSlots, label, stride, window, slotsPerPage, usage) => {
      if (slots === currentSlots && slots > 0) return previous;
      const sizeInBytes = slots * stride + Math.max(0, window - stride);
      if (pageBytes === void 0)
        return { buffer: create(label, sizeInBytes, usage), sizeInBytes };
      const byteStride = slotsPerPage * stride;
      const byteSize = byteStride + Math.max(0, window - stride);
      const buffers = [...previous.pages?.buffers ?? []];
      const needed = Math.ceil(slots / slotsPerPage);
      while (buffers.length < needed)
        buffers.push(create(`${label}:page-${buffers.length}`, byteSize, usage));
      return { buffer: null, sizeInBytes, pages: { byteStride, byteSize, buffers } };
    };
    try {
      const mesh = allocate(
        meshWrapper,
        meshSlots,
        state.meshSlotCount,
        "pbr-mesh-ssbo",
        meshStride,
        meshWindow,
        meshPageSlots,
        meshUsage
      );
      const material = allocate(
        materialWrapper,
        materialSlots,
        state.materialSlotCount,
        "pbr-material-ubo",
        materialStride,
        materialWindow,
        materialPageSlots,
        materialUsage
      );
      Object.assign(meshWrapper, mesh);
      Object.assign(materialWrapper, material);
      state.meshSlotCount = meshSlots;
      state.materialSlotCount = materialSlots;
    } catch (error) {
      if (candidate2 !== void 0) candidate2.abandon();
      else for (const buffer of created) device.destroyBuffer?.(buffer);
      throw error;
    }
  };
  const initialBuild = () => {
    if (initialised) return;
    allocBufferPair(
      Math.min(initialSlotCount, meshPageSlots),
      Math.min(initialSlotCount, materialPageSlots)
    );
    initialised = true;
  };
  const growthTarget = (needed, current, stride, window) => {
    if (needed <= current) return current;
    const tail = pageBytes === void 0 ? Math.max(0, window - stride) : 0;
    const ceiling = Math.floor((deriveStorageBufferCeiling(device.limits) - tail) / stride);
    return Math.min(nextPow2(needed), ceiling);
  };
  const growMeshSsbo = (neededMeshSlots, neededMaterialSlots) => {
    if (state.meshSlotCount >= neededMeshSlots && state.materialSlotCount >= neededMaterialSlots)
      return { ok: true };
    const meshSlots = growthTarget(neededMeshSlots, state.meshSlotCount, meshStride, meshWindow);
    const materialSlots = growthTarget(
      neededMaterialSlots,
      state.materialSlotCount,
      materialStride,
      materialWindow
    );
    const ceilingBytes = deriveStorageBufferCeiling(device.limits);
    if (meshSlots < neededMeshSlots || materialSlots < neededMaterialSlots) {
      const meshExceeded = meshSlots < neededMeshSlots;
      errorRegistry.fire(
        new MeshSsboCeilingReachedError(
          meshExceeded ? neededMeshSlots : neededMaterialSlots,
          meshExceeded ? state.meshSlotCount : state.materialSlotCount,
          ceilingBytes
        )
      );
      return {
        ok: false,
        code: "mesh-ssbo-ceiling-reached",
        degradedTo: {
          meshSlotCount: state.meshSlotCount,
          materialSlotCount: state.materialSlotCount
        }
      };
    }
    allocBufferPair(meshSlots, materialSlots);
    return { ok: true };
  };
  return { state, initialBuild, growMeshSsbo };
}

// sdk/engine/node_modules/@forgeax/engine-render/src/gpu-usage.ts
var GPU_BUFFER_USAGE_VERTEX = 32;
var GPU_BUFFER_USAGE_INDEX = 16;
var GPU_BUFFER_USAGE_COPY_DST = 8;
var GPU_BUFFER_USAGE_COPY_SRC = 4;
var GPU_BUFFER_USAGE_UNIFORM = 64;
var GPU_BUFFER_USAGE_STORAGE = 128;
var GPU_BUFFER_USAGE_INDIRECT = 256;
var GPU_BUFFER_USAGE_MAP_READ = 1;
var GPU_BUFFER_USAGE_QUERY_RESOLVE = 512;

// sdk/engine/node_modules/@forgeax/engine-render/src/record/mesh-ssbo.ts
import { RhiError as RhiError3 } from "@forgeax/engine-rhi";
import { ok as ok18 } from "@forgeax/engine-types";
var MESH_PER_ENTITY_STRIDE = 256;
var MESH_SSBO_BYTES = 176;
function meshSurfaceFlags(source) {
  return (source.temporal?.motionValid === false ? 0 : 1) | (source.shadowReceiver === false ? 2 : 0);
}
var MESH_UBO_FULL_ARRAY_BYTES = 96 * 128;
var INSTANCE_UBO_FULL_ARRAY_BYTES = 80 * 128;
var MAX_UNIFORM_INSTANCES = 128;
var INSTANCE_STORAGE_STRIDE_FLOATS = 32;
function hasStableGenerationColumn(generations, count) {
  if (generations === void 0 || generations.length !== count) return false;
  const seen = /* @__PURE__ */ new Set();
  for (const generation of generations) {
    if (generation === 0 || seen.has(generation)) return false;
    seen.add(generation);
  }
  return true;
}
function packInstanceStorageBuffer(transforms, previousTransforms = transforms, generations, previousGenerations) {
  const count = Math.floor(transforms.length / 16);
  const out = new Float32Array(count * INSTANCE_STORAGE_STRIDE_FLOATS);
  const previousCount = Math.floor(previousTransforms.length / 16);
  const generationInput = generations !== void 0 || previousGenerations !== void 0;
  const identityProof = hasStableGenerationColumn(generations, count) && hasStableGenerationColumn(previousGenerations, previousCount);
  const previousIndexByGeneration = identityProof ? new Map(
    Array.from(previousGenerations ?? [], (generation, index) => [generation, index])
  ) : void 0;
  for (let i = 0; i < count; i++) {
    const sourceBase = i * 16;
    const targetBase = i * INSTANCE_STORAGE_STRIDE_FLOATS;
    const previousIndex = identityProof ? previousIndexByGeneration?.get(generations?.[i] ?? 0) : !generationInput && previousCount === count ? i : void 0;
    const sameIdentity = previousIndex !== void 0 && previousIndex < previousCount;
    const previousBase = (previousIndex ?? i) * 16;
    for (let k = 0; k < 16; k++) {
      const value = transforms[sourceBase + k] ?? 0;
      out[targetBase + k] = value;
      out[targetBase + 16 + k] = sameIdentity ? previousTransforms[previousBase + k] ?? value : value;
    }
  }
  return out;
}
function extractEntryResourceHandle(entry) {
  const v = entry.resource.value;
  if (typeof v === "object" && v !== null && "buffer" in v) {
    return v.buffer;
  }
  return v;
}
var BIND_GROUP_CHAIN_LEAF_KEY = {};
function bindGroupChainLeaf(root, handles) {
  let node2 = root;
  for (const h of handles) {
    let next = node2.get(h);
    if (next === void 0) {
      next = /* @__PURE__ */ new WeakMap();
      node2.set(h, next);
    }
    node2 = next;
  }
  let leaf = node2.get(BIND_GROUP_CHAIN_LEAF_KEY);
  if (leaf === void 0) {
    leaf = /* @__PURE__ */ new Map();
    node2.set(BIND_GROUP_CHAIN_LEAF_KEY, leaf);
  }
  return leaf;
}
function getOrCreateFromChain(root, handles, variant, factory, counts) {
  const leaf = bindGroupChainLeaf(root, handles);
  const hit = leaf.get(variant);
  if (hit !== void 0) return hit;
  const bg = factory();
  counts.createBindGroup += 1;
  counts.keys.push(variant);
  leaf.set(variant, bg);
  return bg;
}
function getOrCreateFromChainResult(root, handles, variant, factory, counts) {
  const leaf = bindGroupChainLeaf(root, handles);
  const hit = leaf.get(variant);
  if (hit !== void 0) return ok18(hit);
  const created = factory();
  if (!created.ok) return created;
  counts.createBindGroup += 1;
  counts.keys.push(variant);
  leaf.set(variant, created.value);
  return created;
}
function findFromChain(root, handles, variant) {
  let node2 = root;
  for (const handle of handles) {
    const next = node2.get(handle);
    if (next === void 0) return void 0;
    node2 = next;
  }
  const leaf = node2.get(BIND_GROUP_CHAIN_LEAF_KEY);
  return leaf?.get(variant);
}
function getOrCreatePerEntity(outerMap, outerKey, handles, variant, factory, counts) {
  let inner = outerMap.get(outerKey);
  if (inner === void 0) {
    inner = /* @__PURE__ */ new WeakMap();
    outerMap.set(outerKey, inner);
  }
  return getOrCreateFromChain(inner, handles, variant, factory, counts);
}
function cleanPerEntityCache(cache, validatedEntityKeys) {
  for (const ek of cache.keys()) {
    if (!validatedEntityKeys.has(ek)) {
      cache.delete(ek);
    }
  }
}
function ensureMeshSsboCapacity(internals, neededMeshSlots, neededMaterialSlots) {
  const grow = internals.growMeshSsbo;
  if (grow === void 0 || neededMeshSlots <= 0 && neededMaterialSlots <= 0) return { ok: true };
  const beforeMesh = internals.meshSsboState?.meshSlotCount ?? 0;
  const beforeMaterial = internals.meshSsboState?.materialSlotCount ?? 0;
  if (beforeMesh >= neededMeshSlots && beforeMaterial >= neededMaterialSlots) return { ok: true };
  const result = grow(neededMeshSlots, neededMaterialSlots);
  if (!result.ok) return result;
  const after = internals.meshSsboState;
  if (after !== void 0 && (after.meshSlotCount !== beforeMesh || after.materialSlotCount !== beforeMaterial) && meshSsboDevModeProbe()) {
    console.info(
      "[mesh-ssbo] grew mesh slots: %d -> %d (requested=%d); material slots: %d -> %d (requested=%d)",
      beforeMesh,
      after.meshSlotCount,
      neededMeshSlots,
      beforeMaterial,
      after.materialSlotCount,
      neededMaterialSlots
    );
  }
  return result;
}
var meshSsboDevModeProbe = isMeshSsboDevMode;
function isMeshSsboDevMode() {
  const importMetaDev = import.meta.env?.DEV;
  if (importMetaDev) return true;
  const proc = globalThis.process;
  if (proc !== void 0 && proc.env?.NODE_ENV === "production") return false;
  if (proc === void 0) return false;
  return true;
}
var MESH_SLOT_FLOATS = 44;
var MESH_STRIDE_FLOATS = MESH_PER_ENTITY_STRIDE / Float32Array.BYTES_PER_ELEMENT;
var MESH_DIRTY_MERGE_GAP_SLOTS = 8;
function meshDrawSlot(entry, folded = false) {
  const slot = folded ? entry.foldedMeshSlot : entry.meshSlot;
  if (slot === void 0 || !Number.isSafeInteger(slot) || slot < 0)
    throw new Error("Draw recording requires a prepared physical mesh slot");
  return slot;
}
var mirrors = /* @__PURE__ */ new WeakMap();
var candidate = new Float32Array(MESH_SLOT_FLOATS);
var candidateBits = new Uint32Array(candidate.buffer);
function meshSsboMirror(buffer, slotCount) {
  let mirror = mirrors.get(buffer);
  if (mirror === void 0) {
    mirror = {
      bytes: new Uint8Array(0),
      bits: new Uint32Array(0),
      known: new Uint8Array(0),
      dirty: /* @__PURE__ */ new Set(),
      sources: /* @__PURE__ */ new Map()
    };
    mirrors.set(buffer, mirror);
  }
  if (mirror.known.length < slotCount) {
    const capacity = Math.max(slotCount, mirror.known.length * 2);
    const bytes = new Uint8Array(capacity * MESH_PER_ENTITY_STRIDE);
    bytes.set(mirror.bytes);
    const known = new Uint8Array(capacity);
    known.set(mirror.known);
    mirror.bytes = bytes;
    mirror.bits = new Uint32Array(bytes.buffer);
    mirror.known = known;
  }
  return mirror;
}
function writeMeshSlotCandidate(entry, foldHead) {
  candidate.fill(0);
  candidateBits[38] = entry.source.lightingChannels ?? LIGHTING_CHANNELS_DEFAULT;
  if (foldHead) {
    candidate[0] = 1;
    candidate[5] = 1;
    candidate[10] = 1;
    candidate[15] = 1;
    candidate[16] = 1;
    candidate[21] = 1;
    candidate[26] = 1;
    candidate[31] = 1;
    candidate[32] = 1;
    candidate[33] = 1;
    return;
  }
  const worldFromLocal = entry.source.transform.world;
  for (let k = 0; k < 16; k++) candidate[k] = worldFromLocal[k] ?? 0;
  const previousWorld = entry.source.temporal?.previousTransform.world ?? worldFromLocal;
  for (let k = 0; k < 16; k++) candidate[16 + k] = previousWorld[k] ?? 0;
  candidate[32] = entry.source.temporal?.reactive === true ? 1 : 0;
  candidate[33] = meshSurfaceFlags(entry.source);
}
function stageMeshSlot(mirror, slot) {
  const base = slot * MESH_STRIDE_FLOATS;
  let dirty = mirror.known[slot] !== 1;
  for (let k = 0; k < MESH_SLOT_FLOATS; k++) {
    const value = candidateBits[k] ?? 0;
    if (mirror.bits[base + k] !== value) {
      mirror.bits[base + k] = value;
      dirty = true;
    }
  }
  if (dirty) mirror.known[slot] = 0;
  return dirty;
}
function flushMeshRun(queue, storage, mirror, first, end) {
  const offset = first * MESH_PER_ENTITY_STRIDE;
  writeMeshSsboBuffer(
    queue,
    storage,
    offset,
    mirror.bytes,
    offset,
    (end - first) * MESH_PER_ENTITY_STRIDE
  );
  mirror.known.fill(1, first, end);
}
function stageMeshDraw(meshStorageBuffer, entry, folded, visibleSurfaceBases, storageBuffer) {
  const buffer = meshStorageBuffer.pages === void 0 ? meshStorageBuffer.buffer : meshStorageBuffer;
  if (buffer === null) throw new Error("mesh draw storage is not allocated");
  const slot = meshDrawSlot(entry, folded);
  const mirror = meshSsboMirror(buffer, slot + 1);
  const surfaceBase = visibleSurfaceBases?.get(
    worldEntityKey(entry.source.worldId, entry.source.entityKey)
  );
  const previous = mirror.sources.get(slot);
  if (previous?.source === entry.source && previous.surfaceBase === surfaceBase && previous.storageBuffer === storageBuffer && previous.folded === folded && previous.hasSurface === (visibleSurfaceBases !== void 0))
    return;
  writeMeshSlotCandidate(entry, folded);
  const surface = storageBuffer ? 36 : 16;
  candidateBits[surface] = visibleSurfaceBases === void 0 ? 0 : surfaceBase ?? 0;
  candidateBits[surface + 1] = visibleSurfaceBases === void 0 ? 0 : entry.source.instances?.instanceCount ?? 1;
  candidateBits[surface + 2] = entry.source.lightingChannels ?? LIGHTING_CHANNELS_DEFAULT;
  candidateBits[surface + 3] = 0;
  const region = entry.source.spriteRegion;
  if (region !== void 0) {
    candidateBits[storageBuffer ? 39 : 19] = 1;
    for (let index = 0; index < 4; index++)
      candidate[(storageBuffer ? 40 : 20) + index] = region[index] ?? 0;
  }
  if (stageMeshSlot(mirror, slot)) mirror.dirty.add(slot);
  mirror.sources.set(slot, {
    source: entry.source,
    surfaceBase,
    storageBuffer,
    folded,
    hasSurface: visibleSurfaceBases !== void 0
  });
}
function prepareMeshDraw(c, entry, folded = false) {
  stageMeshDraw(
    c.pipelineState.meshStorageBuffer,
    entry,
    folded,
    c.visibleSurface?.entityBases,
    c.runtime.device.caps.storageBuffer
  );
  return meshDrawSlot(entry, folded);
}
function flushMeshDrawUploads(queue, meshStorageBuffer) {
  const buffer = meshStorageBuffer.pages === void 0 ? meshStorageBuffer.buffer : meshStorageBuffer;
  const mirror = buffer === null ? void 0 : mirrors.get(buffer);
  if (mirror === void 0 || mirror.dirty.size === 0) return 0;
  const slots = [...mirror.dirty].sort((a, b) => a - b);
  let first = -1, end = -1, runs = 0;
  const flush = () => {
    flushMeshRun(queue, meshStorageBuffer, mirror, first, end);
    for (let slot = first; slot < end; slot++) mirror.dirty.delete(slot);
    runs++;
  };
  for (const slot of slots) {
    if (first >= 0 && slot - end <= MESH_DIRTY_MERGE_GAP_SLOTS) {
      end = slot + 1;
      continue;
    }
    if (first >= 0) flush();
    first = slot;
    end = slot + 1;
  }
  if (first >= 0) flush();
  return runs;
}
function sameParamSnapshot(a, b) {
  if (a === b) return true;
  if (a === void 0 || b === void 0) return false;
  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;
  for (const key of keys) {
    const va = a[key];
    const vb = b[key];
    if (va === vb) continue;
    if (!Array.isArray(va) || !Array.isArray(vb) || va.length !== vb.length) return false;
    for (let i = 0; i < va.length; i++) if (va[i] !== vb[i]) return false;
  }
  return true;
}
function isFoldEligible(entry, renderables) {
  const material = renderables[entry.renderableIndex]?.material;
  return material?.transparent === true && materialUsesSpriteGeometry(material);
}
function foldDispatchBuckets(orderedEntries, mode, renderables) {
  if (orderedEntries.length === 0) return [];
  if (mode !== TRANSPARENT_SORT_MODE_LAYER_Z && mode !== TRANSPARENT_SORT_MODE_LAYER_Y) {
    const out = [];
    for (let i = 0; i < orderedEntries.length; i++) {
      const e = orderedEntries.at(i);
      if (e === void 0) continue;
      out.push(makeSingletonBucket(e, renderables, mode));
    }
    return out;
  }
  const buckets = [];
  let runStart = 0;
  while (runStart < orderedEntries.length) {
    const head = orderedEntries.at(runStart);
    if (head === void 0) {
      runStart += 1;
      continue;
    }
    if (!isFoldEligible(head, renderables)) {
      buckets.push(makeSingletonBucket(head, renderables, mode));
      runStart += 1;
      continue;
    }
    const headSortKey = readSortKey(mode, head.renderableIndex, renderables);
    let runEnd = runStart + 1;
    while (runEnd < orderedEntries.length) {
      const cand = orderedEntries.at(runEnd);
      if (cand === void 0) break;
      if (cand.layer !== head.layer) break;
      if (cand.materialHandle !== head.materialHandle) break;
      const headRegion = renderables[head.renderableIndex]?.spriteRegion;
      const candidateRegion = renderables[cand.renderableIndex]?.spriteRegion;
      if (headRegion !== candidateRegion && (headRegion === void 0 || candidateRegion === void 0 || headRegion.some((value, index) => value !== candidateRegion[index])))
        break;
      if (!sameParamSnapshot(
        renderables[cand.renderableIndex]?.material.paramSnapshot,
        renderables[head.renderableIndex]?.material.paramSnapshot
      ))
        break;
      if (!isFoldEligible(cand, renderables)) break;
      const candSortKey = readSortKey(mode, cand.renderableIndex, renderables);
      if (candSortKey !== headSortKey) break;
      runEnd += 1;
    }
    const run = orderedEntries.slice(runStart, runEnd);
    const transforms = assembleTransforms(run, renderables);
    buckets.push({
      entries: run,
      bucketSize: run.length,
      transforms,
      materialHandle: head.materialHandle,
      layer: head.layer,
      sortKey: headSortKey
    });
    runStart = runEnd;
  }
  return buckets;
}
function makeSingletonBucket(entry, renderables, mode) {
  const transforms = new Float32Array(16);
  const w = renderables[entry.renderableIndex]?.transform.world;
  if (w !== void 0) transforms.set(w);
  const sortKey = readSortKey(mode, entry.renderableIndex, renderables);
  return {
    entries: [entry],
    bucketSize: 1,
    transforms,
    materialHandle: entry.materialHandle,
    layer: entry.layer,
    sortKey
  };
}
function assembleTransforms(run, renderables) {
  const out = new Float32Array(run.length * 16);
  for (let i = 0; i < run.length; i++) {
    const e = run.at(i);
    if (e === void 0) continue;
    const w = renderables[e.renderableIndex]?.transform.world;
    if (w !== void 0) out.set(w, i * 16);
  }
  return out;
}
function readSortKey(mode, renderableIndex, renderables) {
  const explicit = renderables[renderableIndex]?.sortKey;
  if (explicit !== void 0 && Number.isFinite(explicit)) return explicit;
  const w = renderables[renderableIndex]?.transform.world;
  if (w === void 0) return 0;
  return (mode === TRANSPARENT_SORT_MODE_LAYER_Z ? w[14] : w[13]) ?? 0;
}
function buildFoldDispatchPlan(buckets, renderableIndexToValidatedIndex) {
  const headBuckets = /* @__PURE__ */ new Map();
  const skipIndices = /* @__PURE__ */ new Set();
  let foldedBucketCount = 0;
  for (const bucket of buckets) {
    if (bucket.bucketSize <= 1) continue;
    const headEntry = bucket.entries.at(0);
    if (headEntry === void 0) continue;
    const headValidatedIdx = renderableIndexToValidatedIndex.get(headEntry.renderableIndex);
    if (headValidatedIdx === void 0) continue;
    headBuckets.set(headValidatedIdx, bucket);
    foldedBucketCount += 1;
    for (let i = 1; i < bucket.entries.length; i++) {
      const memberEntry = bucket.entries.at(i);
      if (memberEntry === void 0) continue;
      const memberValidatedIdx = renderableIndexToValidatedIndex.get(memberEntry.renderableIndex);
      if (memberValidatedIdx === void 0) continue;
      skipIndices.add(memberValidatedIdx);
    }
  }
  return { headBuckets, skipIndices, foldedBucketCount };
}
var FOLD_UNIFORM_INSTANCE_CAP = 128;
function evaluateFoldBucketUniformCap(bucket, caps, scope) {
  if (caps.storageBuffer) return { fallback: false, error: void 0 };
  if (bucket.bucketSize <= FOLD_UNIFORM_INSTANCE_CAP) {
    return { fallback: false, error: void 0 };
  }
  const error = new RhiError3({
    code: "instancing-exceeds-uniform-cap",
    expected: `bucket instance count <= ${FOLD_UNIFORM_INSTANCE_CAP} (uniform fallback cap)`,
    hint: `reduce the bucket size (smaller layer/material groupings), switch to a WebGPU-capable backend (storage buffers lift the cap), or accept the per-cell drawIndexed fallback for ${scope}`,
    detail: {
      requested: bucket.bucketSize,
      limit: FOLD_UNIFORM_INSTANCE_CAP,
      scope
    }
  });
  return { fallback: true, error };
}
var FOLDED_DRAWS_METRIC_KEY = "render.instancing.foldedDraws";
function incrementFoldedDrawsMetric(plan, metrics) {
  for (let i = 0; i < plan.foldedBucketCount; i++) {
    metrics.increment(FOLDED_DRAWS_METRIC_KEY);
  }
}

// sdk/engine/node_modules/@forgeax/engine-render/src/record/view-ubo.ts
import { mat4 as mat47 } from "@forgeax/engine-math";
import { normalizeClippingPlanes as normalizeClippingPlanes2 } from "@forgeax/engine-types";

// sdk/engine/node_modules/@forgeax/engine-render/src/environment/uniform.ts
function writeAtmosphereUniform(out, offset, p, far, referenceSamples = 0) {
  out.set(
    [
      ...p.groundOrigin.map((v) => v * 1e-3),
      p.planetRadius * 1e-3,
      ...p.rayleighScattering.map((v) => v * 1e3),
      p.rayleighScaleHeight * 1e-3,
      p.mieScattering * 1e3,
      p.mieAbsorption * 1e3,
      p.mieScaleHeight * 1e-3,
      p.mieAnisotropy,
      ...p.absorption.map((v) => v * 1e3),
      p.absorptionPeakHeight * 1e-3,
      ...p.groundAlbedo,
      p.absorptionHalfWidth * 1e-3,
      p.atmosphereHeight * 1e-3,
      p.multipleScattering,
      p.aerialPerspectiveStart * 1e-3,
      p.aerialPerspectiveDistanceScale,
      referenceSamples,
      p.sunAngularRadius,
      Math.max(1e-3, Math.min(far * 1e-3, 96)),
      1
    ],
    offset
  );
}

// sdk/engine/node_modules/@forgeax/engine-render/src/record/view-ubo.ts
var VIEW_UNIFORM_BYTES = 1280;
var SHADOW_PARAMS_BYTES = 16 * 16;
var POINTS_LINES_VIEW_BYTES = 176;
var POINTS_LINES_VIEW_SLOT_STRIDE = 256;
var POINTS_LINES_VIEW_SLOT_COUNT = 1024;
var POINTS_LINES_VIEW_BUFFER_SIZE = POINTS_LINES_VIEW_SLOT_STRIDE * POINTS_LINES_VIEW_SLOT_COUNT;
var VIEW_UNIFORM_SLOT_STRIDE = 1280;
var POINT_SHADOW_VIEW_SLOT_COUNT = 24;
var CUBE_CAPTURE_VIEW_SLOT_BASE = 1 + POINT_SHADOW_VIEW_SLOT_COUNT;
var REFLECTION_PROBE_VIEW_SLOT_BASE = CUBE_CAPTURE_VIEW_SLOT_BASE + 6 + 1;
var REFLECTION_PROBE_VIEW_SLOT_COUNT = 16;
var TRANSLUCENT_FOG_COMPOSITIONS = [
  "straight",
  "premultiplied",
  "additive"
];
var TRANSLUCENT_VIEW_SLOT_BASE = REFLECTION_PROBE_VIEW_SLOT_BASE + REFLECTION_PROBE_VIEW_SLOT_COUNT;
var PLANAR_REFLECTION_UNIFORM_OFFSET = VIEW_UNIFORM_SLOT_STRIDE * (TRANSLUCENT_VIEW_SLOT_BASE + TRANSLUCENT_FOG_COMPOSITIONS.length);
var VIEW_UNIFORM_BUFFER_SIZE = PLANAR_REFLECTION_UNIFORM_OFFSET + VIEW_UNIFORM_SLOT_STRIDE;
function translucentViewOffset(composition) {
  return VIEW_UNIFORM_SLOT_STRIDE * (TRANSLUCENT_VIEW_SLOT_BASE + TRANSLUCENT_FOG_COMPOSITIONS.indexOf(composition));
}
function translucentFogComposition(blend) {
  const color = blend?.color;
  if (color === void 0 || (color.operation ?? "add") !== "add") return void 0;
  const src = color.srcFactor ?? "one";
  const dst = color.dstFactor ?? "zero";
  if (dst === "one" && (src === "one" || src === "src-alpha")) return "additive";
  if (dst !== "one-minus-src-alpha") return void 0;
  if (src === "src-alpha") return "straight";
  return src === "one" ? "premultiplied" : void 0;
}
function pointShadowViewOffset(layer, face) {
  return VIEW_UNIFORM_SLOT_STRIDE * (1 + layer * 6 + face);
}
function directionalShadowFilterCarrier(quality) {
  if (quality === void 0) return [0, 0, 0];
  if (quality.kind === "variance") return [DirectionalShadowFilterValue.variance, 0, 0];
  if (quality.kind === "pcf-soft") return [DirectionalShadowFilterValue.pcfSoft, 0, 0];
  if (quality.kind === "pcf-vogel") return [DirectionalShadowFilterValue.pcfVogel, 0, 0];
  if (quality.kind === "pcss") {
    return [
      quality.preset === "medium" ? DirectionalShadowFilterValue.pcssMedium : DirectionalShadowFilterValue.pcssHigh,
      quality.angularRadiusRadians,
      quality.maxPenumbraTexels
    ];
  }
  return [DirectionalShadowFilterValue[`pcf${quality.kernel}`], 0, 0];
}
function writePointsLinesViewUbo(queue, buffer, camera, width, height, model, style, byteOffset = 0) {
  const projection = computeProjectionMatrix(camera);
  const view = computeViewMatrix(camera);
  const worldViewProj = mat47.create();
  mat47.multiply(worldViewProj, projection, view);
  const payload = new Float32Array(POINTS_LINES_VIEW_BYTES / 4);
  payload.set(worldViewProj);
  if (model === void 0) {
    payload[16] = 1;
    payload[21] = 1;
    payload[26] = 1;
    payload[31] = 1;
  } else {
    for (let index = 0; index < 16; index += 1) {
      payload[16 + index] = model[index] ?? 0;
    }
  }
  payload[32] = width;
  payload[33] = height;
  if (style?.kind === "points") {
    payload[36] = style.sizePx;
    payload[38] = style.shape === "circle" ? 1 : 0;
  } else if (style?.kind === "lines") {
    payload[36] = style.width;
    payload[37] = 1;
    payload[39] = style.widthUnits === LineWidthUnitsValue.world ? Math.abs(projection[5] ?? 0) * height * 0.5 : 0;
    payload[40] = style.dashSize ?? 1;
    payload[41] = style.gapSize ?? 0;
    payload[42] = style.dashOffset ?? 0;
    payload[43] = style.cap === LineCapValue.round ? 1 : 0;
  } else {
    payload[36] = 1;
  }
  const uploaded = queue.writeBuffer(buffer, byteOffset, payload);
  if (!uploaded.ok) throw uploaded.error;
}
function writeViewUbo(queue, viewUniformBuffer, camera, light, lights, spotShadowSnapshots, temporalOrOffset, projectorSpotIndex, cloudShadowProjection, fog, atmosphere, sceneCapture = false, frameTimeSeconds, viewport) {
  const byteOffset = typeof temporalOrOffset === "number" ? temporalOrOffset : 0;
  const resolvedTemporal = typeof temporalOrOffset === "number" ? void 0 : temporalOrOffset;
  const projMatrix = computeProjectionMatrix(camera);
  const viewMatrix = computeViewMatrix(camera);
  const unjitteredViewProjection = mat47.create();
  mat47.multiply(unjitteredViewProjection, projMatrix, viewMatrix);
  const jitteredProjection = jitterCameraProjection(
    mat47.create(),
    projMatrix,
    resolvedTemporal?.currentJitterUv
  );
  const mainProjection = mat47.create();
  mat47.multiply(mainProjection, jitteredProjection, viewMatrix);
  const VIEW_PAYLOAD_FLOATS = VIEW_UNIFORM_BYTES / 4;
  const viewPayload = new Float32Array(VIEW_PAYLOAD_FLOATS);
  if (camera.clipping !== void 0) {
    const planes = normalizeClippingPlanes2(camera.clipping.planes);
    for (const [index, plane] of planes.entries()) viewPayload.set(plane, 256 + index * 4);
    viewPayload.set(
      [
        planes.length,
        camera.clipping.intersection === true ? 1 : 0,
        camera.clipping.clipShadows === true ? 1 : 0,
        0
      ],
      280
    );
  }
  if (fog !== void 0 && fog.density > 0 && fog.maxOpacity > 0) {
    viewPayload.set([fog.color[0], fog.color[1], fog.color[2], fog.density], 284);
    viewPayload.set([fog.heightFalloff, fog.maxOpacity, 0, 0], 288);
  }
  const frameTime = Math.fround(frameTimeSeconds ?? 0);
  viewPayload[291] = Number.isFinite(frameTime) ? frameTime : 0;
  if (atmosphere !== void 0)
    writeAtmosphereUniform(viewPayload, 292, atmosphere, camera.far, sceneCapture ? 64 : 0);
  for (let i = 0; i < 16; i++) viewPayload[i] = mainProjection[i] ?? 0;
  viewPayload[16] = light.direction[0] ?? 0;
  viewPayload[17] = light.direction[1] ?? -1;
  viewPayload[18] = light.direction[2] ?? 0;
  new Uint32Array(viewPayload.buffer, viewPayload.byteOffset, viewPayload.length)[19] = light.lightingChannels ?? LIGHTING_CHANNELS_DEFAULT;
  viewPayload[20] = light.color[0] ?? 0;
  viewPayload[21] = light.color[1] ?? 0;
  viewPayload[22] = light.color[2] ?? 0;
  viewPayload[23] = viewport?.width ?? 1;
  viewPayload[24] = camera.position[0] ?? 0;
  viewPayload[25] = camera.position[1] ?? 0;
  viewPayload[26] = camera.position[2] ?? 0;
  viewPayload[27] = viewport?.height ?? 1;
  if (lights.lightViewProj !== void 0 && lights.lightViewProj[0] !== void 0) {
    for (let i = 0; i < 16; i++) viewPayload[28 + i] = lights.lightViewProj[0][i] ?? 0;
  }
  const inverseViewProj = mat47.create();
  mat47.invert(inverseViewProj, mainProjection);
  for (let i = 0; i < 16; i++) viewPayload[44 + i] = inverseViewProj[i] ?? 0;
  if (lights.lightViewProj !== void 0) {
    for (let c = 1; c <= 3; c++) {
      const base = 60 + (c - 1) * 16;
      const lvp = lights.lightViewProj[c];
      if (lvp !== void 0) {
        for (let i = 0; i < 16; i++) viewPayload[base + i] = lvp[i] ?? 0;
      }
    }
  }
  const previous = resolvedTemporal?.previousUnjitteredViewProjection;
  for (let i = 0; i < 16; i += 1) {
    viewPayload[196 + i] = unjitteredViewProjection[i] ?? 0;
    viewPayload[212 + i] = previous?.[i] ?? 0;
  }
  viewPayload[228] = camera.near;
  viewPayload[229] = camera.far;
  viewPayload[230] = camera.projection === "orthographic" ? 1 : 0;
  const previousCameraPosition = resolvedTemporal !== void 0 && "previousCameraPosition" in resolvedTemporal ? resolvedTemporal.previousCameraPosition : void 0;
  if (previousCameraPosition !== void 0) {
    viewPayload[232] = previousCameraPosition[0] ?? 0;
    viewPayload[233] = previousCameraPosition[1] ?? 0;
    viewPayload[234] = previousCameraPosition[2] ?? 0;
    viewPayload[235] = 1;
  }
  const ssr = camera.screenSpaceReflection;
  if (ssr !== void 0) {
    viewPayload[236] = ssr.maxDistance;
    viewPayload[237] = ssr.thickness;
    viewPayload[238] = ssr.maxRoughness;
    viewPayload[239] = 1;
  }
  if (cloudShadowProjection !== void 0) {
    viewPayload[240] = cloudShadowProjection.origin[0] ?? 0;
    viewPayload[241] = cloudShadowProjection.origin[1] ?? 0;
    viewPayload[242] = cloudShadowProjection.origin[2] ?? 0;
    viewPayload[243] = cloudShadowProjection.baseHeight ?? 0;
    viewPayload[247] = cloudShadowProjection.thickness ?? 0;
    viewPayload[244] = cloudShadowProjection.right[0] ?? 0;
    viewPayload[245] = cloudShadowProjection.right[1] ?? 0;
    viewPayload[246] = cloudShadowProjection.right[2] ?? 0;
    viewPayload[248] = cloudShadowProjection.up[0] ?? 0;
    viewPayload[249] = cloudShadowProjection.up[1] ?? 0;
    viewPayload[250] = cloudShadowProjection.up[2] ?? 0;
    viewPayload[252] = cloudShadowProjection.range;
    viewPayload[253] = cloudShadowProjection.lowSun ? 0 : 1;
    viewPayload[254] = cloudShadowProjection.lowSun ? 1 : 0;
  }
  if (lights.splitPlanes !== void 0) {
    for (let s = 0; s < 4; s++) {
      for (let lane = 0; lane < 4; lane++) {
        viewPayload[108 + s * 4 + lane] = lights.splitPlanes[s * 4 + lane] ?? 0;
      }
    }
  }
  viewPayload[111] = lights.directionalCsmConfig?.shadowBiasMode ?? 0;
  viewPayload[115] = 1 - (lights.directionalCsmConfig?.shadowIntensity ?? 1);
  viewPayload[119] = (lights.directionalCsmConfig?.shadowRadius ?? 1) - 1;
  viewPayload[123] = lights.directionalCsmConfig?.shadowMapAspect ?? 1;
  viewPayload[124] = lights.cascadeCount ?? 0;
  viewPayload[125] = lights.cascadeBlend ?? 0;
  viewPayload[126] = lights.depthBias ?? 1e-5;
  viewPayload[127] = lights.normalBias ?? 0.05;
  const filterCarrier = directionalShadowFilterCarrier(lights.directionalShadowQuality);
  viewPayload[128] = filterCarrier[0] ?? 0;
  viewPayload[129] = filterCarrier[1] ?? 0;
  viewPayload[130] = filterCarrier[2] ?? 0;
  viewPayload[131] = light.contactShadowLength;
  {
    const SPOT_LVP_BASE_FLOAT = 132;
    const SPOT_LVP_LANE_COUNT = 4;
    const SPOT_LVP_FLOATS_PER_LANE = 16;
    const spotSnaps = spotShadowSnapshots;
    for (let i = 0; i < spotSnaps.length; i++) {
      const ss = spotSnaps[i];
      if (ss === void 0) continue;
      const tile = ss.shadowAtlasTile;
      const lvp = ss.lightViewProj;
      if (lvp === void 0) continue;
      const lane = tile >= 0 && tile < SPOT_LVP_LANE_COUNT ? tile : i === projectorSpotIndex ? 0 : -1;
      if (lane < 0) continue;
      const base = SPOT_LVP_BASE_FLOAT + lane * SPOT_LVP_FLOATS_PER_LANE;
      for (let f = 0; f < SPOT_LVP_FLOATS_PER_LANE; f++) {
        viewPayload[base + f] = lvp[f] ?? 0;
      }
    }
  }
  if (sceneCapture) {
    viewPayload[290] = 1;
    viewPayload[317] = 0;
  }
  const viewUploadResult = queue.writeBuffer(viewUniformBuffer, byteOffset, viewPayload);
  if (!viewUploadResult.ok) throw viewUploadResult.error;
  if (byteOffset !== 0) return;
  for (const [index, composition] of TRANSLUCENT_FOG_COMPOSITIONS.entries()) {
    const translucentPayload = viewPayload.slice();
    translucentPayload[290] = index + 1;
    const uploaded = queue.writeBuffer(
      viewUniformBuffer,
      translucentViewOffset(composition),
      translucentPayload
    );
    if (!uploaded.ok) throw uploaded.error;
  }
  for (const snapshot of lights.pointShadow ?? []) {
    if (snapshot.shadowAtlasLayer < 0 || snapshot.shadowAtlasLayer >= SHADOW_ATLAS_DEFAULT_LAYERS)
      continue;
    for (let face = 0; face < 6; face += 1) {
      const facePayload = viewPayload.slice();
      const matrix = snapshot.shadowMatrices.subarray(face * 16, (face + 1) * 16);
      facePayload.set(matrix, 28);
      const uploaded = queue.writeBuffer(
        viewUniformBuffer,
        pointShadowViewOffset(snapshot.shadowAtlasLayer, face),
        facePayload
      );
      if (!uploaded.ok) throw uploaded.error;
    }
  }
}

// sdk/engine/node_modules/@forgeax/engine-render/src/scene/probe-blend-record.ts
var PROBE_BLEND_RECORD_BYTE_SIZE = 160;
var PROBE_BLEND_RECORD_STRIDE = 256;
var PROBE_BLEND_RECORD_CAPACITY = 64;
function probeBlendRecordOffset(objectKey) {
  if (!Number.isInteger(objectKey) || objectKey < 0) {
    throw new Error("probe blend record requires a non-negative object key");
  }
  return (objectKey + 1) * PROBE_BLEND_RECORD_STRIDE;
}

// sdk/engine/node_modules/@forgeax/engine-render/src/scene/mesh-materials.ts
var defaultMeshMaterial = MaterialResource.from(defaultMaterialSnapshot());
var tuples = { children: /* @__PURE__ */ new WeakMap(), value: Object.freeze([]) };
function captureMaterialOverrides(values) {
  let length = values.length;
  while (length > 0 && values[length - 1] === void 0) length--;
  let node2 = tuples;
  for (let index = 0; index < length; index++) {
    const material = values[index];
    let child = material === void 0 ? node2.empty : node2.children.get(material);
    if (child === void 0) {
      child = { children: /* @__PURE__ */ new WeakMap() };
      if (material === void 0) node2.empty = child;
      else node2.children.set(material, child);
    }
    node2 = child;
  }
  node2.value ??= Object.freeze(values.slice(0, length));
  return node2.value;
}
var bindings = /* @__PURE__ */ new WeakMap();
function retainMeshMaterialBindings(previous, next) {
  const table = bindings.get(previous);
  if (table !== void 0) bindings.set(next, table);
}
function meshMaterialGeometry(source) {
  return source.skin !== void 0 || source.skinPose !== void 0 ? "skinned" : source.spriteInstances !== void 0 ? "sprite-instances" : "mesh";
}
function prepareMeshMaterialBindings(source, mesh, geometry, resolve, pending) {
  return meshMaterials(source, mesh, geometry, resolve, pending);
}
function effectiveMeshMaterials(source, mesh, geometry = "mesh") {
  return meshMaterials(source, mesh, geometry);
}
function meshMaterials(source, mesh, geometry, resolve, pending) {
  const overrides = source.materialOverrides;
  if (overrides === void 0) return source;
  let versions = bindings.get(mesh);
  if (versions === void 0) {
    versions = /* @__PURE__ */ new WeakMap();
    bindings.set(mesh, versions);
  }
  let contexts = versions.get(overrides);
  if (contexts === void 0) {
    contexts = /* @__PURE__ */ new Map();
    versions.set(overrides, contexts);
  }
  const cached = resolve === void 0 ? contexts.get(geometry) : void 0;
  if (cached !== void 0) return cached;
  const materials = [];
  const materialBindingSources = [];
  for (let index = 0; index < mesh.materialSlots.length; index++) {
    const override = overrides[index];
    let material = override ?? mesh.materials[index] ?? defaultMeshMaterial;
    if (resolve !== void 0) {
      const handle = override?.snapshot.materialHandle ?? mesh.materialSlots[index]?.defaultMaterial;
      material = typeof handle === "number" && handle !== 0 ? resolve(
        mesh.worldId,
        handle,
        geometry,
        mesh.layout.attributes.some((attribute) => attribute.key === "color")
      ) : defaultMeshMaterial;
    }
    materials.push(material);
    materialBindingSources.push(
      override !== void 0 ? "renderer-override" : mesh.materialSlots[index]?.defaultMaterial === void 0 ? "engine-default" : "mesh-default"
    );
  }
  const result = Object.freeze({
    material: materials[0] ?? defaultMeshMaterial,
    materials: Object.freeze(materials),
    materialBindingSources: Object.freeze(materialBindingSources)
  });
  if (pending === void 0) contexts.set(geometry, result);
  else pending.push({ contexts, geometry, value: result });
  return result;
}

// sdk/engine/node_modules/@forgeax/engine-render/src/environment/capability.ts
var ATMOSPHERE_REQUIRED_SAMPLED_TEXTURES = 32;
function atmosphereAvailable(storageBuffer, maxSampledTextures) {
  return storageBuffer && (maxSampledTextures ?? 0) >= ATMOSPHERE_REQUIRED_SAMPLED_TEXTURES;
}

// sdk/engine/node_modules/@forgeax/engine-render/src/scene/frame-tree.ts
function node(value, queue, key, weight, left, right) {
  let hash = (key | 0) ^ Math.imul(Math.floor(key / 4294967296), 2654435769) ^ Math.imul(queue, 2246822507);
  hash = Math.imul(hash ^ hash >>> 16, 2146121005);
  hash = Math.imul(hash ^ hash >>> 15, 2221713035);
  return {
    value,
    queue,
    key,
    weight,
    priority: (hash ^ hash >>> 16) >>> 0,
    count: weight + (left?.count ?? 0) + (right?.count ?? 0),
    size: 1 + (left?.size ?? 0) + (right?.size ?? 0),
    left,
    right
  };
}
function rebuild(root, left, right) {
  return node(root.value, root.queue, root.key, root.weight, left, right);
}
function before(queue, key, root) {
  return queue < root.queue || queue === root.queue && key < root.key;
}
function put(root, value, queue, key, weight) {
  if (root === void 0) return node(value, queue, key, weight);
  if (queue === root.queue && key === root.key)
    return node(value, queue, key, weight, root.left, root.right);
  if (before(queue, key, root)) {
    const left = put(root.left, value, queue, key, weight);
    return left.priority < root.priority ? rebuild(left, left.left, rebuild(root, left.right, root.right)) : rebuild(root, left, root.right);
  }
  const right = put(root.right, value, queue, key, weight);
  return right.priority < root.priority ? rebuild(right, rebuild(root, root.left, right.left), right.right) : rebuild(root, root.left, right);
}
function merge(left, right) {
  if (left === void 0) return right;
  if (right === void 0) return left;
  return left.priority < right.priority ? rebuild(left, left.left, merge(left.right, right)) : rebuild(right, merge(left, right.left), right.right);
}
function remove(root, queue, key) {
  if (root === void 0) return void 0;
  if (queue === root.queue && key === root.key) return merge(root.left, root.right);
  return before(queue, key, root) ? rebuild(root, remove(root.left, queue, key), root.right) : rebuild(root, root.left, remove(root.right, queue, key));
}
function* nodes(root) {
  const pending = [];
  while (root !== void 0 || pending.length > 0) {
    while (root !== void 0) {
      pending.push(root);
      root = root.left;
    }
    const current = pending.pop();
    if (current === void 0) return;
    yield current;
    root = current.right;
  }
}
function prefix(root, queue, key) {
  if (root === void 0) return void 0;
  if (root.queue > queue || root.queue === queue && root.key >= key)
    return prefix(root.left, queue, key);
  const right = prefix(root.right, queue, key);
  return right === root.right ? root : rebuild(root, root.left, right);
}
function* range(root, start, end) {
  if (root === void 0 || start >= end || end <= 0 || start >= root.count) return;
  const left = root.left?.count ?? 0;
  yield* range(root.left, start, end);
  if (start < left + root.weight && end > left)
    yield {
      value: root.value,
      start: Math.max(0, start - left),
      end: Math.min(root.weight, end - left)
    };
  yield* range(root.right, start - left - root.weight, end - left - root.weight);
}
function at(root, index) {
  while (root !== void 0) {
    const left = root.left?.count ?? 0;
    if (index < left) root = root.left;
    else if (index < left + root.weight) return { node: root, offset: index - left };
    else {
      index -= left + root.weight;
      root = root.right;
    }
  }
  return void 0;
}
function split(root, queue, key) {
  if (root === void 0) return [void 0, void 0, void 0];
  if (root.queue === queue && root.key === key) return [root.left, root.value, root.right];
  if (before(queue, key, root)) {
    const [left2, found2, right2] = split(root.left, queue, key);
    return [left2, found2, rebuild(root, right2, root.right)];
  }
  const [left, found, right] = split(root.right, queue, key);
  return [rebuild(root, root.left, left), found, right];
}
function changes(before2, after, visit) {
  if (before2 === after) return;
  if (before2 === void 0) {
    for (const item of nodes(after)) visit(void 0, item.value, item.key);
  } else if (after === void 0) {
    for (const item of nodes(before2)) visit(item.value, void 0, item.key);
  } else if (before2.queue === after.queue && before2.key === after.key) {
    changes(before2.left, after.left, visit);
    if (before2.value !== after.value) visit(before2.value, after.value, after.key);
    changes(before2.right, after.right, visit);
  } else if (before2.priority < after.priority) {
    const [left, found, right] = split(after, before2.queue, before2.key);
    changes(before2.left, left, visit);
    if (before2.value !== found) visit(before2.value, found, before2.key);
    changes(before2.right, right, visit);
  } else {
    const [left, found, right] = split(before2, after.queue, after.key);
    changes(left, after.left, visit);
    if (found !== after.value) visit(found, after.value, after.key);
    changes(right, after.right, visit);
  }
}

// sdk/engine/node_modules/@forgeax/engine-render/src/render-data.ts
import {
  deriveVertexLayoutProjection as deriveVertexLayoutProjection2
} from "@forgeax/engine-geometry";
import { err as err18, ok as ok19 } from "@forgeax/engine-rhi";
import {
  ASSET_ERROR_HINTS,
  AssetError as AssetError2,
  deriveTextureLayout,
  isCompressedFormat,
  textureFormatBlock
} from "@forgeax/engine-types";
function physicalTextureDimension(logical, block) {
  return Math.ceil(logical / block) * block;
}
function deriveTextureUvScale(format, width, height) {
  const { blockWidth, blockHeight } = textureFormatBlock(format);
  return [
    width / physicalTextureDimension(width, blockWidth),
    height / physicalTextureDimension(height, blockHeight)
  ];
}
function deriveTextureExtent(format, width, height) {
  const { blockWidth, blockHeight } = textureFormatBlock(format);
  const physicalWidth = physicalTextureDimension(width, blockWidth);
  const physicalHeight = physicalTextureDimension(height, blockHeight);
  return {
    logicalExtent: { width, height },
    physicalExtent: { width: physicalWidth, height: physicalHeight },
    uvScale: [width / physicalWidth, height / physicalHeight]
  };
}
function deriveRenderDataMesh(mesh) {
  const indices = mesh.indices;
  const indexBytesUnpadded = indices === void 0 ? 0 : indices.byteLength;
  const indexByteLength = indexBytesUnpadded + 3 >> 2 << 2;
  const layoutProjection = deriveVertexLayoutProjection2(mesh.attributes);
  return ok19({
    vertexByteLength: mesh.vertices.byteLength,
    layoutProjection,
    indexByteLength,
    indexCount: indices === void 0 ? 0 : indices.length,
    indexFormat: indices instanceof Uint32Array ? "uint32" : "uint16",
    vertexUsage: GPU_BUFFER_USAGE_VERTEX | GPU_BUFFER_USAGE_COPY_DST,
    indexUsage: GPU_BUFFER_USAGE_INDEX | GPU_BUFFER_USAGE_COPY_DST,
    submeshes: mesh.submeshes
  });
}
function deriveRenderDataTexture(tex) {
  const width = tex.shape.extent.width;
  const height = tex.shape.extent.height;
  const isSrgbFormat = tex.format.endsWith("-srgb");
  const expectedColorSpace = isSrgbFormat ? "srgb" : "linear";
  if (tex.colorSpace !== expectedColorSpace) {
    return err18(
      new AssetError2({
        code: "invalid-source-format",
        expected: "format ends in '-srgb' iff colorSpace is 'srgb' (linear otherwise)",
        hint: `colorSpace '${tex.colorSpace}' does not match format '${tex.format}'; author sRGB color data as a '-srgb' format with colorSpace 'srgb', and data textures (normals, masks) as a linear format with colorSpace 'linear'`
      })
    );
  }
  const compressed = isCompressedFormat(tex.format);
  const layout = deriveTextureLayout({ shape: tex.shape, format: tex.format, mips: tex.mips });
  if (!layout.ok) {
    return err18(
      new AssetError2({
        code: "invalid-source-format",
        expected: layout.error.expected,
        hint: layout.error.hint
      })
    );
  }
  if (compressed && tex.mips.kind === "generate") {
    return err18(
      new AssetError2({
        code: "mipgen-unsupported-compressed-format",
        expected: "a compressed texture requesting mipmap:true must carry an offline mip chain (mipLevelCount > 1)",
        hint: ASSET_ERROR_HINTS["mipgen-unsupported-compressed-format"]
      })
    );
  }
  const mipLevelCount = layout.value.levels.length;
  const baseLevel = layout.value.levels[0];
  if (baseLevel === void 0) {
    return err18(
      new AssetError2({
        code: "invalid-source-format",
        expected: "texture layout contains a base mip level",
        hint: ASSET_ERROR_HINTS["invalid-source-format"]
      })
    );
  }
  if (!compressed && tex.data.byteLength < baseLevel.byteLength) {
    return err18(
      new AssetError2({
        code: "invalid-source-format",
        expected: "uncompressed texture data contains at least one complete base mip",
        hint: ASSET_ERROR_HINTS["invalid-source-format"]
      })
    );
  }
  const bytesPerRow = baseLevel.bytesPerRow;
  const usage = compressed ? GPU_TEXTURE_USAGE_TEXTURE_BINDING | GPU_TEXTURE_USAGE_COPY_DST | GPU_TEXTURE_USAGE_COPY_SRC : GPU_TEXTURE_USAGE_RENDER_ATTACHMENT_AND_TEXTURE_BINDING | GPU_TEXTURE_USAGE_COPY_DST | GPU_TEXTURE_USAGE_COPY_SRC;
  return ok19({
    width,
    height,
    shape: tex.shape,
    depthOrArrayLayers: tex.shape.viewDimension === "2d" ? 1 : tex.shape.viewDimension === "2d-array" ? tex.shape.extent.layers : tex.shape.extent.depth,
    ...deriveTextureExtent(tex.format, width, height),
    format: tex.format,
    mipLevelCount,
    usage,
    bytesPerRow,
    compressed
  });
}
function deriveRenderDataCubemap(source) {
  const isAcceptedHdr = source.format === "rgba16float" || source.format === "rgba32float";
  if (!isAcceptedHdr || source.colorSpace !== "linear") {
    return err18(
      new AssetError2({
        code: "invalid-source-format",
        expected: "format 'rgba16float' or 'rgba32float' with colorSpace 'linear'",
        hint: ASSET_ERROR_HINTS["invalid-source-format"]
      })
    );
  }
  const sourceHeight = source.shape.viewDimension === "2d" ? source.shape.extent.height : 0;
  return ok19({
    cubeFaceSize: sourceHeight,
    outputFormat: "rgba16float",
    needsHalfConversion: source.format === "rgba32float",
    cubeUsage: GPU_TEXTURE_USAGE_RENDER_ATTACHMENT_AND_TEXTURE_BINDING | GPU_TEXTURE_USAGE_COPY_DST | GPU_TEXTURE_USAGE_COPY_SRC
  });
}

// sdk/engine/node_modules/@forgeax/engine-render/src/material-texture-coordinates.ts
function writeMaterialTextureCoordinateRecord(target, offset, source, physicalScale) {
  const transform = source?.transform;
  const physical = physicalScale ?? source?.physicalUvScale;
  const rotation = transform?.rotation ?? 0;
  target[offset] = transform?.offset?.[0] ?? 0;
  target[offset + 1] = transform?.offset?.[1] ?? 0;
  target[offset + 2] = transform?.scale?.[0] ?? 1;
  target[offset + 3] = transform?.scale?.[1] ?? 1;
  target[offset + 4] = source?.set ?? 0;
  target[offset + 5] = rotation;
  target[offset + 6] = physical?.[0] ?? 1;
  target[offset + 7] = physical?.[1] ?? 1;
  const angle = Math.fround(rotation);
  target[offset + 8] = Math.cos(angle);
  target[offset + 9] = Math.sin(angle);
  target[offset + 10] = 0;
  target[offset + 11] = 0;
}

// sdk/engine/node_modules/@forgeax/engine-render/src/gpu-scene-schema.ts
import { STANDARD_PIPELINE_PARAM_SCHEMA as STANDARD_PIPELINE_PARAM_SCHEMA3 } from "@forgeax/engine-shader";
import { derive as derive3, MATERIAL_NUMERIC_LAYOUT, WGSL_NUMERIC_LAYOUT } from "@forgeax/engine-types";
var TYPE_LAYOUT = {
  ...WGSL_NUMERIC_LAYOUT,
  "mat4x4<f32>": { size: 64, alignment: 16 }
};
function align(value, alignment) {
  return Math.ceil(value / alignment) * alignment;
}
function deriveGpuSceneTableLayout(schema2) {
  let cursor = 0;
  let tableAlignment = 4;
  const fields = schema2.fields.map((field) => {
    const typeLayout = TYPE_LAYOUT[field.type];
    cursor = align(cursor, typeLayout.alignment);
    tableAlignment = Math.max(tableAlignment, typeLayout.alignment);
    const layout = { ...field, offset: cursor, ...typeLayout };
    cursor += typeLayout.size;
    return layout;
  });
  return { name: schema2.name, stride: align(cursor, tableAlignment), fields };
}
function gpuSceneFieldOffset(layout, name) {
  const field = layout.fields.find((candidate2) => candidate2.name === name);
  if (field === void 0) throw new RangeError(`${layout.name} has no field named ${name}`);
  return field.offset;
}
function gpuSceneWgsl(layout) {
  const fields = layout.fields.map((field) => `  ${field.name}: ${field.type},`).join("\n");
  return `struct ${layout.name} {
${fields}
};`;
}
function deriveStandardMaterialFields() {
  const derived = derive3(STANDARD_PIPELINE_PARAM_SCHEMA3);
  const fields = [
    ...derived.numericMembers.map((member) => ({
      offset: member.offset,
      field: { name: member.name, type: MATERIAL_NUMERIC_LAYOUT[member.type].wgslType }
    })),
    ...derived.coordinateRecords.flatMap((record) => [
      {
        offset: record.offset,
        field: { name: record.transformMember, type: "vec4<f32>" }
      },
      {
        offset: record.offset + 16,
        field: { name: record.metadataMember, type: "vec4<f32>" }
      },
      {
        offset: record.offset + 32,
        field: { name: record.rotationMember, type: "vec4<f32>" }
      }
    ])
  ];
  fields.sort((left, right) => left.offset - right.offset);
  return fields.map(({ field }) => field);
}
var GPU_SCENE_SCHEMAS = Object.freeze({
  lod: {
    name: "GpuSceneLod",
    fields: [
      { name: "generation", type: "u32" },
      { name: "level", type: "u32" },
      { name: "firstIndex", type: "u32" },
      { name: "indexCount", type: "u32" },
      { name: "baseVertex", type: "i32" },
      { name: "screenCoverage", type: "f32" },
      { name: "hysteresis", type: "f32" },
      { name: "ready", type: "u32" }
    ]
  },
  primitive: {
    name: "GpuScenePrimitive",
    fields: [
      { name: "generation", type: "u32" },
      { name: "flags", type: "u32" },
      { name: "transformIndex", type: "u32" },
      { name: "materialIndex", type: "u32" },
      { name: "instanceStart", type: "u32" },
      { name: "instanceCount", type: "u32" },
      { name: "sourceIndex", type: "u32" },
      { name: "localBoundsMin", type: "vec3<f32>" },
      { name: "lightingChannels", type: "u32" },
      { name: "localBoundsMax", type: "vec4<f32>" }
    ]
  },
  instance: {
    name: "GpuSceneInstance",
    fields: [
      { name: "primitiveIndex", type: "u32" },
      { name: "transformIndex", type: "u32" },
      { name: "customDataStart", type: "u32" },
      { name: "flags", type: "u32" }
    ]
  },
  transform: {
    name: "GpuSceneTransform",
    fields: [
      { name: "currentWorld", type: "mat4x4<f32>" },
      { name: "previousWorld", type: "mat4x4<f32>" }
    ]
  },
  material: {
    name: "GpuSceneMaterial",
    fields: deriveStandardMaterialFields()
  }
});
var GPU_SCENE_LAYOUTS = Object.freeze(
  Object.fromEntries(
    Object.entries(GPU_SCENE_SCHEMAS).map(([name, schema2]) => [
      name,
      deriveGpuSceneTableLayout(schema2)
    ])
  )
);
var GPU_SCENE_WGSL = Object.values(GPU_SCENE_LAYOUTS).map(gpuSceneWgsl).join("\n\n");

export {
  AutoExposureInvalidParameterError,
  AutoExposureCapabilityUnavailableError,
  AutoExposureStaleGenerationError,
  AutoExposureStageFailedError,
  createAutoExposureError,
  createAutoExposureInspection,
  LifecycleConstructionError,
  createLightResourceUnavailable,
  TemporalFrameSubmitError,
  EquirectProjectionFailedError,
  StandardLightBudgetExceededError,
  StandardClusterIndexOverflowError,
  StandardClusterTransportUnavailableError,
  StandardProfileInvalidError,
  PointShadowAtlasUninitializedError,
  PointShadowAtlasBoundsViolationError,
  VideoUploadUnsupportedError,
  VertexColorVariantConflictError,
  SkinPaletteOverflowError,
  SkinMaterialMismatchError,
  MaterialSkinAttrMissingError,
  TransmissionCapabilityMissingError,
  MaterialSampledTextureBudgetExceededError,
  RenderFeatureRegistrationConflictError,
  RenderFeatureStageFailedError,
  RenderFeatureCapabilityMissingError,
  RenderFeaturePreparationFailedError,
  RenderFeaturePreparedStateMismatchError,
  RenderFeatureDrawRecordingFailedError,
  ObservationUnavailableError,
  SceneDataUnavailableError,
  FrameReceiptStaleError,
  RendererContractFailureError,
  EnvironmentSourceConflictError,
  FogCardinalityError,
  TaaCapsInsufficientError,
  EnvironmentGenerationFailedError,
  AtmosphereInvalidParameterError,
  DynamicResolutionInvalidParameterError,
  DynamicResolutionRequiresTaaError,
  DynamicResolutionTimingUnavailableError,
  OutlineInvalidParameterError,
  LensFlareInvalidParameterError,
  LensEffectsInvalidParameterError,
  BarrelDistortionInvalidParameterError,
  OwnerStageFailedError,
  RendererOperationError,
  PointsLinesInvalidStyleError,
  PointsLinesTopologyMismatchError,
  PointsLinesMaterialUnsupportedError,
  PointsLinesBudgetExceededError,
  PointsLinesPrepareFailedError,
  RenderTargetDescriptorInvalidError,
  RenderTargetCapabilityMissingError,
  RenderTargetLayerInvalidError,
  RenderTargetStateInvalidError,
  RenderTargetOperationFailedError,
  FramebufferSnapshotFailedError,
  ExternalTextureInvalidError,
  ExternalTextureStateInvalidError,
  CameraViewInvalidError,
  StereoCameraInvalidError,
  CameraView,
  cameraViewExtent,
  Outline,
  OutlineOcclusionValue,
  resolveOutline,
  StereoLayoutValue,
  STEREO_EYES,
  StereoCamera,
  stereoLayoutFromU32,
  stereoEyeViewport,
  stereoEyeCameras,
  GpuDrivenPreparationError,
  isReflectedTransform,
  reflectedRenderState,
  transformRenderState,
  materialColorTarget,
  materialDepthStencil,
  shadowCasterRenderState,
  atmosphereBindings,
  atmosphereViewLayoutEntries,
  atmosphereMaterialVisibilityLayoutEntries,
  atmosphereMaterialVisibilityBindings,
  DIRECT_DFG_LUT_DESCRIPTOR,
  materialUsesDirectDfgLut,
  getOrCreateDirectDfgLut,
  GPU_SHADER_STAGE_VERTEX,
  GPU_SHADER_STAGE_FRAGMENT,
  GPU_SHADER_STAGE_COMPUTE,
  buildPbrMaterialUserRegionEntries,
  standardNormalInputField,
  sharedMaterialBindingDeclarations,
  omittedStandardMaterialBindings,
  physicalTextureFields,
  materialBindGroupLayoutIdentity,
  buildPbrPipelineLayouts,
  SKIN_MATERIAL_SHADER_ID,
  SKIN_UNCOVERED_GBUFFER_ENTRY,
  SHADOW_CASTER_SHADER_ID,
  isStandardPbrSkinMaterialShader,
  shadowCasterVariantSet,
  isStandardPbrMaterialShader,
  isCanonicalStandardPbrMaterialShader,
  buildPbrSkinLayouts,
  buildGpuDrivenPbrInstancesBindGroupLayout,
  buildSurfaceDirectInstancesBindGroupLayout,
  buildGpuDrivenPbrPipelineLayout,
  buildGpuDrivenPbrSkinPipelineLayout,
  createPbrSkinMeshBindGroupEntries,
  pbrSkinMeshDynamicOffsets,
  SPRITE_PASS_PER_INSTANCE_REGION_VARIANT_SET,
  createHdrpBindGroupLayoutDescriptor,
  createHdrpSkinBindGroupLayoutDescriptor,
  buildBindGroupLayoutDescriptor,
  standardTransmissionValue,
  GPU_DRIVEN_LOD_LEVEL_CAPACITY,
  batchLodLevelCount,
  batchLevelStride,
  batchVisibleSpan,
  GPU_DRIVEN_INDIRECT_COMMAND_BYTES,
  gpuDrivenMaterialArtifactKey,
  freezePreparedGpuDrivenDraw,
  capturedPreparedMaterialArtifactKey,
  ownGpuDrivenVertexInputs,
  captureBatchGeometry,
  prepareBatchExecution,
  captureBatchLod,
  gpuDrivenSourceDrawItemIndex,
  buildGpuDrivenDraws,
  spriteUvRegion,
  PlanarReflection,
  PlanarReflectionInvalidError,
  buildPlanarReflectionView,
  LensEffects,
  resolveLensEffects,
  LENS_FLARE_GHOST_COUNT,
  LensFlare,
  resolveLensFlare,
  MaterialResource,
  materialResource,
  runtimeMaterialShaderIdForMaterial,
  materialUsesSpriteGeometry,
  cameraLensProjection,
  jitterCameraProjection,
  variantSetFromDefines,
  selectLazyEquirectHandles,
  warnMultiLightDirectional,
  warnMultiSkylight,
  warnMultiSkybox,
  driveLazyEquirectProjection,
  isLitMaterialSnapshot,
  computeViewMatrix,
  computeProjectionMatrix,
  compareBufferBytes,
  CUBE_CAMERA_UPDATE_ONCE,
  CUBE_CAMERA_UPDATE_ON_DEMAND,
  CUBE_CAMERA_UPDATE_CONTINUOUS,
  CUBE_CAMERA_FACE_ORDER,
  cubeCameraUpdateIntentFromF32,
  cubeCameraUpdateIntentToF32,
  CubeCamera,
  buildCubeCameraFaceViews,
  PostProcessError,
  GTAO_SAMPLE_COUNTS,
  SSAO_SAMPLE_COUNTS,
  getSsaoParameters,
  resolveSsaoParameters,
  AMBIENT_OCCLUSION_ALGORITHMS,
  AMBIENT_OCCLUSION_QUALITIES,
  AMBIENT_OCCLUSION_SSAO,
  AMBIENT_OCCLUSION_GTAO,
  AmbientOcclusion,
  ambientOcclusionParameters,
  Atmosphere,
  BarrelDistortion,
  validateBarrelDistortionParameters,
  CAMERA_PROJECTION_PERSPECTIVE,
  CAMERA_PROJECTION_ORTHOGRAPHIC,
  CAMERA_EXPOSURE_MODE_MANUAL,
  CAMERA_EXPOSURE_MODE_AUTO,
  CAMERA_TEMPERATURE_MIN,
  CAMERA_TEMPERATURE_MAX,
  CAMERA_TINT_MIN,
  CAMERA_TINT_MAX,
  CameraError,
  validateCameraExposure,
  validateCameraColorGrading,
  cameraProjectionFromF32,
  TONEMAP_NONE,
  TONEMAP_REINHARD_EXTENDED,
  TONEMAP_REINHARD,
  TONEMAP_LINEAR,
  TONEMAP_CINEON,
  TONEMAP_ACES_FILMIC,
  TONEMAP_AGX,
  TONEMAP_NEUTRAL,
  ANTIALIAS_NONE,
  ANTIALIAS_FXAA,
  ANTIALIAS_MSAA,
  ANTIALIAS_TAA,
  ANTIALIAS_SMAA,
  TRANSPARENCY_SORTED,
  TRANSPARENCY_WEIGHTED_BLENDED,
  BLOOM_DISABLED,
  BLOOM_ENABLED,
  CAMERA_BLOOM_INTENSITY_MIN,
  CAMERA_BLOOM_INTENSITY_MAX,
  CAMERA_BLOOM_THRESHOLD_MIN,
  CAMERA_BLOOM_THRESHOLD_MAX,
  CAMERA_BLOOM_SMOOTH_WIDTH_MIN,
  CAMERA_BLOOM_SMOOTH_WIDTH_MAX,
  CAMERA_BLOOM_RADIUS_MIN,
  CAMERA_BLOOM_RADIUS_MAX,
  validateCameraBloom,
  Camera,
  cameraExposureFromColumns,
  perspective,
  orthographic,
  CapsuleShadow,
  CloudQualityValue,
  CloudLayer,
  cloudQualityFromF32,
  DepthOfFieldQualityValue,
  DepthOfFieldSideValue,
  DepthOfField,
  depthOfFieldQualityFromF32,
  depthOfFieldSideFromF32,
  DirectionalShadowFilterValue,
  directionalShadowQualityFromF32,
  SHADOW_RASTER_GUARD_TEXELS,
  directionalShadowFilterRadiusTexels,
  LIGHTING_CHANNELS_DEFAULT,
  validateChannelMask,
  DirectionalLight,
  DynamicResolution,
  validateDynamicResolutionParameters,
  validateDynamicResolutionCamera,
  Fog,
  Instances,
  Layer,
  validatePointLightDecay,
  PointLight,
  PointLightShadow,
  RectAreaLight,
  SpotLight,
  degToCos,
  computeInvRangeSquared,
  validateDirection,
  validateDirectionalLightData,
  resolvePunctualShadowFarPlane,
  validateSpotLightData,
  validatePointLightData,
  validatePointLightShadowData,
  validateRectAreaLightData,
  validateLightProbeData,
  LightProbe,
  LineWidthUnitsValue,
  LineCapValue,
  lineWidthUnitsFromU32,
  lineCapFromU32,
  Lines,
  MeshFilter,
  MeshRenderer,
  MotionBlur,
  PointShapeValue,
  pointShapeFromU32,
  Points,
  PostProcessParams,
  REFLECTION_PROBE_UPDATE_ONCE,
  REFLECTION_PROBE_UPDATE_ON_CHANGE,
  REFLECTION_PROBE_UPDATE_CONTINUOUS,
  reflectionProbeUpdateIntentFromF32,
  reflectionProbeUpdateIntentToF32,
  ReflectionProbe,
  SceneInstance,
  ScreenSpaceReflection,
  ShadowParticipation,
  SKYBOX_MODE_CUBEMAP,
  SkyboxBackground,
  Skylight,
  SortKey,
  SpriteAnimation,
  SpriteInstances,
  SpritePlayback,
  spritePlaybackModeFromU32,
  SpriteRegionOverride,
  Tilemap,
  TilemapSort,
  VisibilityStateValue,
  visibilityStateFromU32,
  Visibility,
  ClippingPlanes,
  clippingPlanesData,
  SKYLIGHT_RECOVERY_FALLBACK,
  SunCardinalityError,
  selectEnvironment,
  resolveVisibility,
  DEPTH_OF_FIELD_PARAMS_BYTE_SIZE,
  DEFAULT_DEPTH_OF_FIELD_PARAMS,
  DepthOfFieldValidationError,
  depthOfFieldRequestFailure,
  resolveDepthOfFieldFrameParams,
  validateDepthOfFieldFrameParams,
  validateDepthOfFieldParams,
  resolveDepthOfFieldParams,
  depthOfFieldTapCount,
  depthOfFieldSideCode,
  depthOfFieldQualityCode,
  signedDepthOfFieldCoC,
  packDepthOfFieldParams,
  MOTION_BLUR_PARAMS_BYTE_SIZE,
  DEFAULT_MOTION_BLUR_PARAMS,
  MotionBlurValidationError,
  validateMotionBlurParams,
  motionBlurTemporalDemand,
  effectiveMotionBlurSampleCount,
  isMotionBlurIntervalValid,
  motionBlurExposureScale,
  motionBlurSampleDelta,
  resolveMotionBlurParams,
  TRANSPARENT_SORT_MODE_LAYER_Z,
  TRANSPARENT_SORT_MODE_LAYER_Y,
  TRANSPARENT_SORT_MODE_LAYER_YZ,
  TRANSPARENT_SORT_MODE_DISTANCE,
  TransparentSort,
  getTransparentSortConfig,
  worldRenderResources,
  renderAssetRevision,
  renderTime,
  renderAsset,
  getActiveCamera,
  setActiveCamera,
  FORWARD_PASS_SELECTOR,
  REFRACTION_INNER_PASS_SELECTOR,
  REFRACTION_OUTER_PASS_SELECTOR,
  TRANSMISSION_BACK_PASS_SELECTOR,
  DEFERRED_PASS_SELECTOR,
  COLOR_PASS_SELECTOR,
  SHADOW_CASTER_PASS_SELECTOR,
  matchPass,
  renderTextureSourceKey,
  isRenderTextureSourceToken,
  hasVolumetricFogCapability,
  resolveVolumetricFogLightPair,
  resolveSelectedVolumetricLight,
  resolveIntegratedVolumeConsumer,
  MAX_VOLUMETRIC_FOG_OWNERS,
  VolumetricFogSamplingValue,
  VolumetricFog,
  validateVolumetricFog,
  extractVolumetricFog,
  buildRectAreaWorldFrame,
  rectAreaFacesPoint,
  materialSnapshotContext,
  sortDispatchByQueue,
  DEFAULT_FORWARD_PASS,
  appendMaterialDispatchEntries,
  Severity,
  createWorldInternalView,
  collectAuthoredMaterialTextureFields,
  collectAuthoredMaterialSamplerFields,
  materialProgramSelectionsForMaterial,
  resolveRuntimeAssetReference,
  materialTextureValue,
  assetReferenceText,
  materialTextureRef,
  collectMaterialTextureCoordinates,
  materialStandardTextureMask,
  readPersistentMaterialSnapshot,
  storeMaterialSnapshot,
  prepareMaterialSnapshot,
  resolveMaterialSnapshot,
  pssmSplit,
  buildPointShadowMatrices,
  computeDirectionalCsm,
  collectCubeCameraSnapshots,
  collectReflectionProbeFacts,
  cameraForView,
  projectAuxiliaryCamerasForView,
  selectCameraRoles,
  tonemapParams,
  prepareExtractContext,
  fogState,
  selectFogFrame,
  extractVolumeSnapshot,
  defaultMaterialSnapshot,
  defaultMeshMaterial,
  captureMaterialOverrides,
  retainMeshMaterialBindings,
  meshMaterialGeometry,
  prepareMeshMaterialBindings,
  effectiveMeshMaterials,
  InstanceTransformsError,
  validateInstanceTransforms,
  uniqueInstanceIdentities,
  instancePreviousPairing,
  planInstanceUpload,
  InstanceProjectionStore,
  ATMOSPHERE_REQUIRED_SAMPLED_TEXTURES,
  atmosphereAvailable,
  EXTENDED_LIGHTING_TOPOLOGY,
  IES_SLICE_CAPACITY,
  COOKIE_SLICE_CAPACITY,
  IES_SLICE_WIDTH,
  IES_SLICE_HEIGHT,
  COOKIE_SLICE_SIZE,
  COOKIE_MIP_LEVEL_COUNT,
  COOKIE_SLICE_MIP_CHAIN_BYTES,
  writeCookieSliceMipChain,
  COOKIE_MATRIX_BYTES,
  EXTENDED_LIGHTING_REQUIRED_SAMPLED_TEXTURES,
  extendedLightingSampledTextureCapacityAvailable,
  deriveExtendedLightingCapability,
  STANDARD_PBR_REQUIRED_SAMPLED_TEXTURES,
  isOrdinaryMaterialVariant,
  selectHdrpPbrPrewarmVariants,
  selectSkinPrewarmVariants,
  selectGpuDrivenSceneIndexVariant,
  selectProbePrewarmVariants,
  selectBootVariant,
  ADMIT_EVERY_VARIANT,
  prewarmMaterialShaderVariants,
  selectStandardPbrTransmissionPrewarmVariants,
  publishMeshMaterialBindingResidency,
  projectMeshMaterialBindingObservation,
  summarizeMeshMaterialBindings,
  resolveMeshMaterialBindings,
  INITIAL_MESH_SSBO_SLOT_COUNT,
  meshSsboBuffer,
  meshSsboBufferBinding,
  writeMeshSsboBuffer,
  requireMeshSsboBuffer,
  createMeshSsboGrowController,
  GPU_BUFFER_USAGE_VERTEX,
  GPU_BUFFER_USAGE_INDEX,
  GPU_BUFFER_USAGE_COPY_DST,
  GPU_BUFFER_USAGE_COPY_SRC,
  GPU_BUFFER_USAGE_UNIFORM,
  GPU_BUFFER_USAGE_STORAGE,
  GPU_BUFFER_USAGE_INDIRECT,
  GPU_BUFFER_USAGE_MAP_READ,
  GPU_BUFFER_USAGE_QUERY_RESOLVE,
  worldEntityKey,
  instanceCollectionCacheKey,
  getOpaqueResourceIdentity,
  getTextureIdentity,
  validateGraphTargetCaptureReadback,
  makeZeroCameraFallbackSnapshot,
  emptyFrameRecordingOutputs,
  resetFrameRecordingOutputs,
  MESH_PER_ENTITY_STRIDE,
  MESH_SSBO_BYTES,
  MESH_UBO_FULL_ARRAY_BYTES,
  INSTANCE_UBO_FULL_ARRAY_BYTES,
  MAX_UNIFORM_INSTANCES,
  INSTANCE_STORAGE_STRIDE_FLOATS,
  packInstanceStorageBuffer,
  extractEntryResourceHandle,
  getOrCreateFromChain,
  getOrCreateFromChainResult,
  findFromChain,
  getOrCreatePerEntity,
  cleanPerEntityCache,
  ensureMeshSsboCapacity,
  meshDrawSlot,
  prepareMeshDraw,
  flushMeshDrawUploads,
  foldDispatchBuckets,
  buildFoldDispatchPlan,
  evaluateFoldBucketUniformCap,
  incrementFoldedDrawsMetric,
  GPU_TEXTURE_USAGE_COPY_SRC,
  GPU_TEXTURE_USAGE_COPY_DST,
  GPU_TEXTURE_USAGE_TEXTURE_BINDING,
  GPU_TEXTURE_USAGE_STORAGE_BINDING,
  GPU_TEXTURE_USAGE_RENDER_ATTACHMENT,
  GPU_TEXTURE_USAGE_RENDER_ATTACHMENT_AND_TEXTURE_BINDING,
  put,
  remove,
  nodes,
  prefix,
  range,
  at,
  changes,
  deriveTextureUvScale,
  deriveRenderDataMesh,
  deriveRenderDataTexture,
  deriveRenderDataCubemap,
  SHADOW_ATLAS_DEFAULT_FACE_SIZE,
  SHADOW_ATLAS_DEFAULT_LAYERS,
  ShadowAtlas,
  writeAtmosphereUniform,
  VIEW_UNIFORM_BYTES,
  SHADOW_PARAMS_BYTES,
  POINTS_LINES_VIEW_BYTES,
  POINTS_LINES_VIEW_SLOT_STRIDE,
  POINTS_LINES_VIEW_SLOT_COUNT,
  VIEW_UNIFORM_SLOT_STRIDE,
  REFLECTION_PROBE_VIEW_SLOT_BASE,
  PLANAR_REFLECTION_UNIFORM_OFFSET,
  VIEW_UNIFORM_BUFFER_SIZE,
  translucentViewOffset,
  translucentFogComposition,
  pointShadowViewOffset,
  writePointsLinesViewUbo,
  writeViewUbo,
  writeMaterialTextureCoordinateRecord,
  PROBE_BLEND_RECORD_BYTE_SIZE,
  PROBE_BLEND_RECORD_STRIDE,
  PROBE_BLEND_RECORD_CAPACITY,
  probeBlendRecordOffset,
  gpuSceneFieldOffset,
  gpuSceneWgsl,
  GPU_SCENE_LAYOUTS,
  STANDARD_OUTPUT_TRANSFORM_FEATURE_ID,
  FXAA_POST_PROCESS_ID,
  isFrameObservationDomain,
  RENDER_PHASE_CATALOG
};
//# sourceMappingURL=chunk-XAU6MWMX.mjs.map
