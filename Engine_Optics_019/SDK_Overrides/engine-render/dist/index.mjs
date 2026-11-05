import {
  fullscreenRenderFeatureDeclaration
} from "./chunk-XZHQWBNV.mjs";
import {
  DEFAULT_REFLECTION_PROBE_LIMITS,
  DynamicInputError,
  LOD_OCCLUSION_INSPECTION_MAX_BYTES,
  LOD_OCCLUSION_INSPECTION_SCHEMA,
  ReadonlyDynamicInputPage,
  ReflectionProbeProjection,
  RenderPublicationTargetOwner,
  SSR_FORMAT_PROFILE,
  SSR_FORMAT_STAGES,
  SceneSdfUnavailableError,
  admitPointsLines,
  admitReflectionProbe,
  admitSingleLayerMediumSubmission,
  admitSsrM0,
  admitSsrSpatial,
  advanceProbeFilter,
  boxProjectReflectionDirection,
  buildReflectionProbeTable,
  commitProbeFilterStep,
  createGlobalTransformChangeQuery,
  createProbeFilterState,
  createRenderSourceState,
  estimateReflectionProbeBytes,
  inspectLodOcclusion,
  inspectPointShadow,
  inspectReflectionFallback,
  inspectVolumetricFog,
  isRenderableMember,
  probeFilterIsSteady,
  projectSsrDependencies,
  projectSsrSpatialInspection,
  publicationCanvasFrames,
  publicationFrameDependencies,
  publicationTargetSources,
  publishAssetPatch,
  querySubmittedTerrainHeight,
  reflectionProbeTableBytes,
  registerRenderSourceSystems,
  renderFeatureCameraView,
  renderableAssetRoots,
  resolveSsrAdmissionGeneration,
  resolveVisibleSurface,
  selectReflectionProbe,
  serializeLodOcclusionInspection,
  serializeSsrSpatialInspection,
  validateReflectionProbeInput,
  validateRenderProfile,
  validateScreenSpaceReflection,
  zeroSsrAdmissionWork
} from "./chunk-QMNLXPE2.mjs";
import {
  BARREL_DISTORTION_FEATURE_IDENTITY,
  BARREL_DISTORTION_POST_PROCESS_ID,
  BARREL_DISTORTION_WGSL,
  BARREL_DISTORTION_WGSL_COORDINATE,
  CLOUD_DENSITY_COMPUTE_WGSL,
  CLOUD_HISTORY_FULLSCREEN_WGSL,
  CLOUD_HISTORY_SURFACE_COUNT,
  CLOUD_LAYER_FEATURE_IDENTITY,
  CLOUD_RGBA16FLOAT_BYTES_PER_TEXEL,
  CLOUD_VIEW_FULLSCREEN_WGSL,
  CLOUD_VIEW_PARAMS_BYTES,
  OIT_ACCUMULATE_PASS,
  OIT_COMPOSITE_PASS,
  acceptCloudLayerGeneration,
  applyCloudSolarTransmittance,
  buildCloudDensityCache,
  cloudCapabilitiesFromRhi,
  compositeCloudRadiance,
  createBarrelDistortionRenderFeature,
  createCloudLayerFeature,
  createCloudShadowProjection,
  evaluateCloudDensity,
  inspectCloudLayer,
  inspectCloudLayerResources,
  integrateCloudCameraPath,
  integrateCloudInterior,
  integrateCloudPath,
  integrateCloudSolarColumn,
  intersectCloudLayer,
  projectCloudShadowUv,
  reconstructCloudDensityCache,
  retainCloudLayerAfterFailure,
  sampleCloudDensity,
  sampleCloudShadow,
  snapshotCloudDensityCache
} from "./chunk-BYYRQEH4.mjs";
import {
  DynamicGeometryError,
  IRRADIANCE_VOLUME_KIND,
  MeshResidencyError,
  RenderPublicationError,
  attachBarrelDistortionCameraFrame,
  createBarrelDistortionMapping,
  createDynamicGeometryLifecycle,
  extractCloudLayer,
  extractFrames,
  freezeBarrelDistortionMapping,
  freezeDiffuseGi,
  irradianceVolumeContribution,
  irradianceVolumeKind,
  mapDisplayToScene,
  mapDisplayUvToSceneUv,
  mapSceneToDisplay,
  mapSceneUvToDisplayUv,
  publicationMaterialProgramKeys,
  renderMaterialContext,
  renderPublicationAssetTransfers,
  renderPublicationTransfers,
  selectCloudLayerFrame,
  tilemapGeometry,
  validateDiffuseGi,
  validateDynamicGeometryMeshBudget,
  validateIrradianceVolume
} from "./chunk-5JZNU5U3.mjs";
import {
  CLOUD_QUALITY_PROFILES,
  CloudLayerCacheInvalidError,
  CloudLayerCapabilityMissingError,
  CloudLayerInvalidParameterError,
  CloudLayerOwnerConflictError,
  CloudLayerResourceFailureError,
  DEFAULT_CLOUD_LAYER,
  GlyphText,
  ProjectedDecal,
  ProjectedDecalInvalidError,
  cloudLayerSourceKey,
  validateCloudLayer
} from "./chunk-MVY4ZZCX.mjs";
import {
  createSceneDataCatalog
} from "./chunk-QWUJDQND.mjs";
import {
  CanvasTexture,
  CloudHistoryStore,
  DEFAULT_STANDARD_PROFILE,
  MaterialAuthoringContractError,
  MaterialTransmissionContractError,
  Materials,
  OIT_INELIGIBLE_REASONS,
  OUTPUT_COLOR_SPACES,
  OUTPUT_GAMUT_CODE,
  REFLECTION_PROBE_IBL_STAGES,
  SCENE_DATA_TEMPORAL_V1_DESCRIPTOR,
  SCENE_DATA_TEMPORAL_V1_SCHEMA,
  appliedOutputColorSpace,
  beginProbeIblUpdate,
  classifyOitDraw,
  cloudTemporalResetReasons,
  cloudTemporalSignature,
  createCloudHistory,
  createIblKernelCache,
  createProbeIblOutput,
  displayP3,
  isCanvasTextureSource,
  isExternalTextureSource,
  isOutputColorSpace,
  publishProbeIblOutput,
  renderTargetLayerCount,
  renderTargetMaterialSourceIdentity,
  reprojectCloudHistory,
  resetIblKernelCaches,
  srgb,
  standardTransmissionAdmission
} from "./chunk-JWVQREUV.mjs";
import {
  AMBIENT_OCCLUSION_ALGORITHMS,
  AMBIENT_OCCLUSION_GTAO,
  AMBIENT_OCCLUSION_QUALITIES,
  AMBIENT_OCCLUSION_SSAO,
  ANTIALIAS_FXAA,
  ANTIALIAS_MSAA,
  ANTIALIAS_NONE,
  ANTIALIAS_SMAA,
  ANTIALIAS_TAA,
  AmbientOcclusion,
  Atmosphere,
  AtmosphereInvalidParameterError,
  AutoExposureCapabilityUnavailableError,
  AutoExposureInvalidParameterError,
  AutoExposureStageFailedError,
  AutoExposureStaleGenerationError,
  BLOOM_DISABLED,
  BLOOM_ENABLED,
  BarrelDistortion,
  BarrelDistortionInvalidParameterError,
  CAMERA_BLOOM_INTENSITY_MAX,
  CAMERA_BLOOM_INTENSITY_MIN,
  CAMERA_BLOOM_RADIUS_MAX,
  CAMERA_BLOOM_RADIUS_MIN,
  CAMERA_BLOOM_SMOOTH_WIDTH_MAX,
  CAMERA_BLOOM_SMOOTH_WIDTH_MIN,
  CAMERA_BLOOM_THRESHOLD_MAX,
  CAMERA_BLOOM_THRESHOLD_MIN,
  CAMERA_EXPOSURE_MODE_AUTO,
  CAMERA_EXPOSURE_MODE_MANUAL,
  CAMERA_PROJECTION_ORTHOGRAPHIC,
  CAMERA_PROJECTION_PERSPECTIVE,
  CAMERA_TEMPERATURE_MAX,
  CAMERA_TEMPERATURE_MIN,
  CAMERA_TINT_MAX,
  CAMERA_TINT_MIN,
  CUBE_CAMERA_FACE_ORDER,
  CUBE_CAMERA_UPDATE_CONTINUOUS,
  CUBE_CAMERA_UPDATE_ONCE,
  CUBE_CAMERA_UPDATE_ON_DEMAND,
  Camera,
  CameraError,
  CameraView,
  CameraViewInvalidError,
  CapsuleShadow,
  ClippingPlanes,
  CloudLayer,
  CloudQualityValue,
  CubeCamera,
  DEFAULT_DEPTH_OF_FIELD_PARAMS,
  DEFAULT_MOTION_BLUR_PARAMS,
  DEPTH_OF_FIELD_PARAMS_BYTE_SIZE,
  DepthOfField,
  DepthOfFieldQualityValue,
  DepthOfFieldSideValue,
  DepthOfFieldValidationError,
  DirectionalLight,
  DirectionalShadowFilterValue,
  DynamicResolution,
  DynamicResolutionInvalidParameterError,
  DynamicResolutionRequiresTaaError,
  DynamicResolutionTimingUnavailableError,
  EnvironmentGenerationFailedError,
  EnvironmentSourceConflictError,
  ExternalTextureInvalidError,
  ExternalTextureStateInvalidError,
  Fog,
  FogCardinalityError,
  GpuDrivenPreparationError,
  InstanceTransformsError,
  Instances,
  LENS_FLARE_GHOST_COUNT,
  LIGHTING_CHANNELS_DEFAULT,
  Layer,
  LensEffects,
  LensEffectsInvalidParameterError,
  LensFlare,
  LensFlareInvalidParameterError,
  LightProbe,
  LineCapValue,
  LineWidthUnitsValue,
  Lines,
  MAX_VOLUMETRIC_FOG_OWNERS,
  MaterialResource,
  MaterialSampledTextureBudgetExceededError,
  MeshFilter,
  MeshRenderer,
  MotionBlur,
  MotionBlurValidationError,
  Outline,
  OutlineInvalidParameterError,
  OutlineOcclusionValue,
  OwnerStageFailedError,
  PlanarReflection,
  PlanarReflectionInvalidError,
  PointLight,
  PointLightShadow,
  PointShapeValue,
  Points,
  PostProcessParams,
  REFLECTION_PROBE_UPDATE_CONTINUOUS,
  REFLECTION_PROBE_UPDATE_ONCE,
  REFLECTION_PROBE_UPDATE_ON_CHANGE,
  RENDER_PHASE_CATALOG,
  RectAreaLight,
  ReflectionProbe,
  RendererOperationError,
  SHADOW_ATLAS_DEFAULT_FACE_SIZE,
  SHADOW_ATLAS_DEFAULT_LAYERS,
  SKYBOX_MODE_CUBEMAP,
  STANDARD_PBR_REQUIRED_SAMPLED_TEXTURES,
  SceneDataUnavailableError,
  SceneInstance,
  ScreenSpaceReflection,
  ShadowAtlas,
  ShadowParticipation,
  SkyboxBackground,
  Skylight,
  SortKey,
  SpotLight,
  SpriteAnimation,
  SpriteInstances,
  SpriteRegionOverride,
  StereoCamera,
  StereoCameraInvalidError,
  StereoLayoutValue,
  SunCardinalityError,
  TONEMAP_ACES_FILMIC,
  TONEMAP_AGX,
  TONEMAP_CINEON,
  TONEMAP_LINEAR,
  TONEMAP_NEUTRAL,
  TONEMAP_NONE,
  TONEMAP_REINHARD,
  TONEMAP_REINHARD_EXTENDED,
  TRANSPARENCY_SORTED,
  TRANSPARENCY_WEIGHTED_BLENDED,
  TaaCapsInsufficientError,
  Tilemap,
  Visibility,
  VisibilityStateValue,
  VolumetricFog,
  VolumetricFogSamplingValue,
  ambientOcclusionParameters,
  buildCubeCameraFaceViews,
  buildPlanarReflectionView,
  cameraExposureFromColumns,
  cameraProjectionFromF32,
  clippingPlanesData,
  cloudQualityFromF32,
  computeInvRangeSquared,
  createAutoExposureError,
  createAutoExposureInspection,
  cubeCameraUpdateIntentFromF32,
  cubeCameraUpdateIntentToF32,
  degToCos,
  depthOfFieldQualityCode,
  depthOfFieldQualityFromF32,
  depthOfFieldRequestFailure,
  depthOfFieldSideCode,
  depthOfFieldSideFromF32,
  depthOfFieldTapCount,
  directionalShadowQualityFromF32,
  effectiveMotionBlurSampleCount,
  extractVolumetricFog,
  getActiveCamera,
  getTransparentSortConfig,
  hasVolumetricFogCapability,
  isCanonicalStandardPbrMaterialShader,
  isMotionBlurIntervalValid,
  lineCapFromU32,
  lineWidthUnitsFromU32,
  materialStandardTextureMask,
  materialUsesDirectDfgLut,
  motionBlurExposureScale,
  motionBlurSampleDelta,
  motionBlurTemporalDemand,
  orthographic,
  packDepthOfFieldParams,
  perspective,
  pointShapeFromU32,
  projectMeshMaterialBindingObservation,
  reflectionProbeUpdateIntentFromF32,
  reflectionProbeUpdateIntentToF32,
  renderTextureSourceKey,
  resolveDepthOfFieldParams,
  resolveIntegratedVolumeConsumer,
  resolveLensEffects,
  resolveLensFlare,
  resolveMaterialSnapshot,
  resolveMotionBlurParams,
  resolveOutline,
  resolvePunctualShadowFarPlane,
  resolveRuntimeAssetReference,
  resolveSelectedVolumetricLight,
  resolveSsaoParameters,
  resolveVisibility,
  resolveVolumetricFogLightPair,
  runtimeMaterialShaderIdForMaterial,
  setActiveCamera,
  signedDepthOfFieldCoC,
  stereoEyeCameras,
  stereoLayoutFromU32,
  summarizeMeshMaterialBindings,
  validateBarrelDistortionParameters,
  validateCameraBloom,
  validateCameraColorGrading,
  validateCameraExposure,
  validateDepthOfFieldFrameParams,
  validateDepthOfFieldParams,
  validateDirection,
  validateDirectionalLightData,
  validateDynamicResolutionCamera,
  validateDynamicResolutionParameters,
  validateLightProbeData,
  validateMotionBlurParams,
  validatePointLightData,
  validatePointLightShadowData,
  validateRectAreaLightData,
  validateSpotLightData,
  validateVolumetricFog,
  visibilityStateFromU32,
  worldRenderResources
} from "./chunk-XAU6MWMX.mjs";

// sdk/engine/node_modules/@forgeax/engine-render/src/async-dynamic-geometry.ts
import { err } from "@forgeax/engine-types";
function createAsyncDynamicGeometryHost(renderer) {
  return {
    currentGeneration: () => renderer.state() === "alive" ? renderer.inspect().frame.deviceGeneration : void 0,
    async prepareDynamicGeometry(input, options) {
      if (options?.signal?.aborted)
        return err(
          new DynamicGeometryError(
            "dynamic-geometry-candidate-state",
            "preparation has not been cancelled",
            "discard the cancelled preparation"
          )
        );
      const prepared = renderer.prepareDynamicGeometry(input);
      if (!prepared.ok) return prepared;
      const pipelines = await renderer.prepareDynamicGeometryPipelines([prepared.value], options);
      if (!pipelines.ok) {
        const cancelled = renderer.cancelDynamicGeometry(prepared.value);
        return cancelled.ok ? pipelines : cancelled;
      }
      return prepared;
    },
    async prepareDynamicGeometryCandidates(inputs, options) {
      if (options?.signal?.aborted)
        return err(
          new DynamicGeometryError(
            "dynamic-geometry-candidate-state",
            "preparation has not been cancelled",
            "discard the cancelled preparation"
          )
        );
      const prepared = renderer.prepareDynamicGeometryCandidates(inputs);
      if (!prepared.ok) return prepared;
      const pipelines = await renderer.prepareDynamicGeometryPipelines(prepared.value, options);
      if (!pipelines.ok) {
        let cancellationFailure;
        for (const candidate of prepared.value) {
          const cancelled = renderer.cancelDynamicGeometry(candidate);
          if (!cancelled.ok) cancellationFailure ??= cancelled.error;
        }
        return cancellationFailure === void 0 ? pipelines : err(cancellationFailure);
      }
      return prepared;
    },
    async prepareMeshResidency(world, meshHandle, options) {
      if (options?.signal?.aborted)
        return err(
          new MeshResidencyError(
            "mesh-residency-gpu-not-ready",
            "preparation has not been cancelled",
            "discard the cancelled preparation"
          )
        );
      return renderer.prepareMeshResidency(world, meshHandle);
    },
    acceptDynamicGeometry: (candidate, ordering) => renderer.acceptDynamicGeometry(candidate, ordering),
    acceptDynamicGeometryCandidates: (candidates, ordering) => renderer.acceptDynamicGeometryCandidates(candidates, ordering),
    isDynamicGeometryCurrent: (candidate) => renderer.isDynamicGeometryCurrent(candidate),
    dynamicGeometryReceipt: (candidate) => renderer.dynamicGeometryReceipt(candidate),
    cancelDynamicGeometry: (candidate) => renderer.cancelDynamicGeometry(candidate),
    retireDynamicGeometry: (candidate) => renderer.retireDynamicGeometry(candidate),
    retireSupersededDynamicGeometry: (candidate, successor) => renderer.retireSupersededDynamicGeometry(candidate, successor)
  };
}

// sdk/engine/node_modules/@forgeax/engine-render/src/index.ts
import {
  ClippingContractError,
  MAX_CLIPPING_PLANES,
  normalizeClippingPlanes,
  withClipping
} from "@forgeax/engine-types";

// sdk/engine/node_modules/@forgeax/engine-render/src/assets/asset-decoders.ts
import { createMaterialLoader } from "@forgeax/engine-assets-runtime/internal";
import {
  AssetError,
  err as err2,
  isMaterialStaticSwitches,
  isMaterialTextureParameterType,
  MATERIAL_CHILD_FORBIDDEN_FIELDS,
  ok,
  resolveMaterialTextureCoordinates
} from "@forgeax/engine-types";
function invalid(guid, expected, reason) {
  return err2({
    code: "asset-package-invalid",
    expected,
    hint: "recook the render asset and publish its complete cooked payload",
    detail: { guid, reason }
  });
}
function record(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function validMaterial(value) {
  if (!record(value) || value.kind !== "material") return false;
  if (value.staticSwitches !== void 0 && !isMaterialStaticSwitches(value.staticSwitches))
    return false;
  if (value.parent !== void 0 && typeof value.parent !== "string" && !(value.parent instanceof Uint8Array && value.parent.length === 16) && !Number.isSafeInteger(value.parent))
    return false;
  if (value.parent === void 0 && (!Array.isArray(value.passes) || value.passes.length === 0))
    return false;
  if (value.passes !== void 0 && !Array.isArray(value.passes)) return false;
  if (value.parameters !== void 0 && !Array.isArray(value.parameters)) return false;
  if (value.parent !== void 0 && MATERIAL_CHILD_FORBIDDEN_FIELDS.some((field) => Object.hasOwn(value, field))) {
    return false;
  }
  return value.values === void 0 || record(value.values);
}
function resolveMaterialWireRef(value, refs, field, guid) {
  if (typeof value !== "number") return ok(value);
  if (!Number.isSafeInteger(value) || value < 0 || refs[value] === void 0) {
    return err2({
      code: "asset-package-invalid",
      expected: `${field} to reference a GUID through the material Pack refs[] table`,
      hint: "recook the material so every texture or sampler ref has a matching refs[] entry",
      detail: { guid, reason: `${field} refs[${value}] is out of bounds` }
    });
  }
  return ok(refs[value]);
}
function isIdentityTextureCoordinates(value) {
  if (value === void 0) return true;
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const coordinates = value;
  if (Object.keys(coordinates).some((key) => key !== "set" && key !== "transform")) return false;
  const transform = coordinates.transform;
  if (transform !== void 0 && (typeof transform !== "object" || transform === null || Array.isArray(transform))) {
    return false;
  }
  if (transform !== void 0 && Object.keys(transform).some(
    (key) => key !== "offset" && key !== "scale" && key !== "rotation"
  )) {
    return false;
  }
  const resolved = resolveMaterialTextureCoordinates(coordinates);
  return resolved.set === 0 && resolved.transform.offset[0] === 0 && resolved.transform.offset[1] === 0 && resolved.transform.scale[0] === 1 && resolved.transform.scale[1] === 1 && resolved.transform.rotation === 0;
}
function compactTextureValue(value) {
  const compact = { ...value };
  if (isIdentityTextureCoordinates(compact.coordinates)) delete compact.coordinates;
  return compact;
}
function resolveMaterialWireRefs(value, refs, guid) {
  if (refs.length === 0) return ok(value);
  let changed = false;
  const wire = value;
  let parent = wire.parent;
  if (typeof parent === "number") {
    const resolved = resolveMaterialWireRef(parent, refs, "parent", guid);
    if (!resolved.ok) return resolved;
    parent = resolved.value;
    changed = true;
  }
  if (value.values === void 0) {
    if (!changed) return ok(value);
    if (parent !== void 0) {
      const child = value;
      return ok({ ...child, parent });
    }
    return ok(value);
  }
  const textureFields = new Set(
    value.parameters === void 0 ? [] : value.parameters.filter((parameter) => isMaterialTextureParameterType(parameter.type)).map((parameter) => parameter.name)
  );
  const values = { ...value.values };
  for (const [field, raw] of Object.entries(values)) {
    if (typeof raw === "number" && textureFields.has(field)) {
      const resolved = resolveMaterialWireRef(raw, refs, field, guid);
      if (!resolved.ok) return resolved;
      values[field] = { texture: resolved.value };
      changed = true;
      continue;
    }
    if (!record(raw)) continue;
    const rawRecord = raw;
    let rewritten;
    for (const key of ["texture", "sampler"]) {
      if (!(key in rawRecord)) continue;
      const resolved = resolveMaterialWireRef(rawRecord[key], refs, `${field}.${key}`, guid);
      if (!resolved.ok) return resolved;
      if (resolved.value !== rawRecord[key]) {
        rewritten ??= { ...rawRecord };
        rewritten[key] = resolved.value;
        changed = true;
      }
    }
    if (rewritten !== void 0) {
      values[field] = compactTextureValue(rewritten);
    }
  }
  if (!changed) return ok(value);
  if (parent !== void 0) {
    const child = value;
    return ok({
      ...child,
      parent,
      values
    });
  }
  return ok({ ...value, values });
}
var materialContribution = {
  kind: { kind: "material" },
  consumer: "Render MaterialScene",
  decoder: {
    async decode({ envelope, artifacts }) {
      let payload = envelope.payload;
      if (record(payload) && record(payload.cooked) && payload.cooked.schemaVersion === "material-cook/4" && Array.isArray(payload.cooked.programs)) {
        const programs = [...payload.cooked.programs];
        const cooked = payload.cooked;
        const requests = /* @__PURE__ */ new Map();
        for (const [index, program] of programs.entries()) {
          if (!record(program) || !record(program.artifact)) continue;
          const artifact = program.artifact;
          const path = artifact.path;
          const descriptor = typeof path === "string" ? envelope.artifacts[path] : void 0;
          if (artifact.bytes !== void 0 && descriptor === void 0) continue;
          if (typeof path !== "string" || descriptor === void 0 || artifacts.locate !== void 0 && artifacts.locate(descriptor) === void 0)
            return invalid(
              envelope.guid,
              "a verified external artifact for each compact material program",
              "compact material program artifact descriptor or digest mismatch"
            );
          const request = requests.get(path);
          if (request === void 0) requests.set(path, { descriptor, indices: [index] });
          else request.indices.push(index);
        }
        const distinct = [...requests.values()];
        const results = new Array(distinct.length);
        let cursor = 0;
        await Promise.all(
          Array.from({ length: Math.min(8, distinct.length) }, async () => {
            while (cursor < distinct.length) {
              const index = cursor++;
              const request = distinct[index];
              if (request !== void 0) results[index] = await artifacts.read(request.descriptor);
            }
          })
        );
        for (const [index, request] of distinct.entries()) {
          const loaded = results[index];
          if (loaded === void 0) throw new Error("material artifact read did not complete");
          if (!loaded.ok) return loaded;
          for (const programIndex of request.indices) {
            const program = programs[programIndex];
            const inline = program.artifact.bytes;
            if (inline !== void 0 && (!(Array.isArray(inline) || inline instanceof Uint8Array) || inline.length !== loaded.value.length || loaded.value.some((byte, offset) => byte !== inline[offset])))
              return invalid(
                envelope.guid,
                "inline bytes matching the verified external program",
                "inline material program bytes differ from their external artifact"
              );
            programs[programIndex] = {
              ...program,
              artifact: { ...program.artifact, bytes: loaded.value }
            };
          }
        }
        payload = { ...payload, cooked: { ...cooked, programs } };
      }
      if (!validMaterial(payload)) {
        return invalid(
          envelope.guid,
          "a material payload with cooked passes, parameters, and values",
          "material owner validation failed"
        );
      }
      if (record(payload) && payload.cooked !== void 0) {
        const cooked = payload.cooked;
        const programs = record(cooked) && Array.isArray(cooked.programs) ? cooked.programs : [];
        const ready = await createMaterialLoader({
          loadPublication: async () => ({
            guid: envelope.guid,
            record: cooked,
            artifacts: Object.fromEntries(
              programs.flatMap(
                (program) => record(program) && record(program.artifact) && typeof program.artifact.path === "string" ? [
                  [
                    program.artifact.path,
                    {
                      bytes: program.artifact.bytes,
                      digest: program.artifact.digest
                    }
                  ]
                ] : []
              )
            )
          })
        }).load({
          guid: envelope.guid,
          specializationKey: record(cooked) && typeof cooked.specializationKey === "string" ? cooked.specializationKey : ""
        });
        if (ready.status === "Error")
          return err2({
            code: "asset-decode-failed",
            expected: ready.error.expected,
            hint: ready.error.hint,
            detail: { guid: envelope.guid, kind: "material", cause: ready.error }
          });
        payload = { ...payload, cooked: ready.record };
      }
      return resolveMaterialWireRefs(payload, envelope.refs, envelope.guid);
    }
  }
};
var filters = /* @__PURE__ */ new Set(["nearest", "linear"]);
var addressModes = /* @__PURE__ */ new Set(["clamp-to-edge", "repeat", "mirror-repeat"]);
var compareFunctions = /* @__PURE__ */ new Set([
  "never",
  "less",
  "equal",
  "less-equal",
  "greater",
  "not-equal",
  "greater-equal",
  "always"
]);
function samplerDescriptor(payload) {
  const stringField = (key, allowed) => {
    const value = payload[key];
    if (value === void 0) return void 0;
    return typeof value === "string" && allowed.has(value) ? value : null;
  };
  const magFilter = stringField("magFilter", filters);
  const minFilter = stringField("minFilter", filters);
  const mipmapFilter = stringField("mipmapFilter", filters);
  const addressModeU = stringField("addressModeU", addressModes);
  const addressModeV = stringField("addressModeV", addressModes);
  const addressModeW = stringField("addressModeW", addressModes);
  const compare = stringField("compare", compareFunctions);
  if (magFilter === null || minFilter === null || mipmapFilter === null || addressModeU === null || addressModeV === null || addressModeW === null || compare === null) {
    return void 0;
  }
  const numericField = (key) => {
    const value = payload[key];
    if (value === void 0) return void 0;
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  };
  const lodMinClamp = numericField("lodMinClamp");
  const lodMaxClamp = numericField("lodMaxClamp");
  const maxAnisotropy = numericField("maxAnisotropy");
  if (lodMinClamp === null || lodMaxClamp === null || maxAnisotropy === null || (lodMinClamp ?? 0) < 0 || (lodMaxClamp ?? 32) < (lodMinClamp ?? 0) || !Number.isInteger(maxAnisotropy ?? 1) || (maxAnisotropy ?? 1) < 1 || (maxAnisotropy ?? 1) > 16 || (maxAnisotropy ?? 1) > 1 && (magFilter !== "linear" || minFilter !== "linear" || mipmapFilter !== "linear"))
    return void 0;
  return {
    kind: "sampler",
    ...magFilter === void 0 ? {} : { magFilter },
    ...minFilter === void 0 ? {} : { minFilter },
    ...mipmapFilter === void 0 ? {} : { mipmapFilter },
    ...addressModeU === void 0 ? {} : { addressModeU },
    ...addressModeV === void 0 ? {} : { addressModeV },
    ...addressModeW === void 0 ? {} : { addressModeW },
    ...lodMinClamp === void 0 ? {} : { lodMinClamp },
    ...lodMaxClamp === void 0 ? {} : { lodMaxClamp },
    ...compare === void 0 ? {} : { compare },
    ...maxAnisotropy === void 0 ? {} : { maxAnisotropy }
  };
}
var samplerContribution = {
  kind: { kind: "sampler" },
  consumer: "Render DeviceScope",
  decoder: {
    prepare(input) {
      const value = record(input) && input.kind === "sampler" ? samplerDescriptor(input) : void 0;
      return value === void 0 ? err2(
        new AssetError({
          code: "asset-invalid-value",
          expected: "a valid sampler descriptor with ordered nonnegative LOD bounds and integer anisotropy in [1, 16]",
          hint: "use linear mag, min and mip filters when enabling anisotropy"
        })
      ) : ok(value);
    },
    async decode({ envelope }) {
      const value = record(envelope.payload) && envelope.payload.kind === "sampler" ? samplerDescriptor(envelope.payload) : void 0;
      return value === void 0 ? invalid(envelope.guid, "a valid sampler descriptor", "sampler owner validation failed") : ok(value);
    }
  }
};
function finiteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}
function positiveInteger(value) {
  return finiteNumber(value) && Number.isInteger(value) && value > 0;
}
function validRenderPipelineConfig(value) {
  if (!record(value)) return false;
  const passCount = value.passCount;
  if (passCount !== void 0 && !positiveInteger(passCount)) return false;
  const clusterGrid = value.clusterGrid;
  if (clusterGrid !== void 0) {
    if (!record(clusterGrid) || !["x", "y", "z"].every((axis) => {
      const size = clusterGrid[axis];
      return positiveInteger(size) && size <= 64;
    })) {
      return false;
    }
  }
  const ssao = value.ssao;
  if (ssao !== void 0 && (!record(ssao) || typeof ssao.enabled !== "boolean" || !resolveSsaoParameters(ssao).ok))
    return false;
  const outputDither = value.outputDither;
  if (outputDither !== void 0 && typeof outputDither !== "boolean") return false;
  const gpuOcclusion = value.gpuOcclusion;
  if (gpuOcclusion !== void 0 && typeof gpuOcclusion !== "boolean") return false;
  const postEffects = value.postEffects;
  return postEffects === void 0 || Array.isArray(postEffects) && postEffects.every((effect) => typeof effect === "string" && effect.length > 0);
}
function renderPipelineDescriptor(value) {
  if (value.kind !== "render-pipeline") return void 0;
  const pipelineId = value.pipelineId;
  if (pipelineId !== "forgeax::standard") return void 0;
  const renderPath = value.renderPath;
  if (renderPath !== void 0 && renderPath !== "forward" && renderPath !== "deferred") {
    return void 0;
  }
  const config = value.config;
  if (config !== void 0 && !validRenderPipelineConfig(config)) return void 0;
  return {
    kind: "render-pipeline",
    pipelineId,
    ...renderPath === void 0 ? {} : { renderPath },
    ...config === void 0 ? {} : { config }
  };
}
var renderPipelineContribution = {
  kind: { kind: "render-pipeline" },
  consumer: "Render Pipeline",
  decoder: {
    prepare(input) {
      const value = record(input) ? renderPipelineDescriptor(input) : void 0;
      return value === void 0 ? err2(
        new AssetError({
          code: "asset-invalid-value",
          expected: "a complete render-pipeline descriptor with valid settings",
          hint: "supply the Standard pipeline id, a supported render path and finite in-range configuration"
        })
      ) : ok(value);
    },
    async decode({ envelope, artifacts }) {
      let payload = envelope.payload;
      const descriptor = envelope.artifacts.body ?? Object.values(envelope.artifacts)[0];
      if (descriptor !== void 0) {
        const bytes = await artifacts.read(descriptor);
        if (!bytes.ok) return bytes;
        try {
          payload = JSON.parse(new TextDecoder().decode(bytes.value));
        } catch {
          return invalid(
            envelope.guid,
            "a render-pipeline JSON descriptor artifact",
            "invalid JSON"
          );
        }
      }
      const value = record(payload) ? renderPipelineDescriptor(payload) : void 0;
      return value === void 0 ? invalid(
        envelope.guid,
        "a complete render-pipeline descriptor",
        "render-pipeline owner validation failed"
      ) : ok(value);
    }
  }
};

// sdk/engine/node_modules/@forgeax/engine-render/src/bake-data.ts
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";
var FINGERPRINT_SCHEMA = "forgeax-bake-fingerprint/1";
function bakeFingerprint(input) {
  const canonical = JSON.stringify({
    schema: FINGERPRINT_SCHEMA,
    meshContentHash: input.meshContentHash,
    worldTransform: Array.from(input.worldTransform),
    materialHash: input.materialHash,
    lightHashes: [...input.lightHashes].sort(),
    settingsHash: input.settingsHash,
    algorithmVersion: input.algorithmVersion
  });
  return bytesToHex(sha256(utf8ToBytes(canonical)));
}
function resolveBakeData(records, current) {
  const baked = [];
  const staleByScene = /* @__PURE__ */ new Map();
  for (const record2 of records) {
    const input = current(record2.key);
    if (input !== void 0 && bakeFingerprint(input) === record2.fingerprint) {
      baked.push(record2);
      continue;
    }
    const stale = staleByScene.get(record2.key.sceneSourceKey) ?? [];
    stale.push(record2.key);
    staleByScene.set(record2.key.sceneSourceKey, stale);
  }
  const diagnostics = [...staleByScene].map(
    ([sceneSourceKey, stale]) => ({
      code: "bake-data-stale",
      expected: "baked lighting whose input fingerprint matches the live scene",
      hint: "rebake the scene; affected entities use realtime lighting until then",
      detail: { sceneSourceKey, stale }
    })
  );
  return { baked, diagnostics };
}

// sdk/engine/node_modules/@forgeax/engine-render/src/examples/single-layer-medium-surface.ts
var SINGLE_LAYER_MEDIUM_SURFACE_EXAMPLE = {
  kind: "material",
  surface: {
    model: "single-layer-medium",
    module: "game::water_surface_a",
    dynamicInput: {
      name: "waterEvents",
      fields: [
        { name: "position", type: "vec3<f32>" },
        { name: "time", type: "f32" },
        { name: "eventId", type: "u32" }
      ],
      maxRecords: 64,
      maxDomains: 8,
      maxPageBytes: 2048,
      maxBindings: 1,
      maxEventsPerSample: 8
    }
  },
  passes: [
    {
      name: "color",
      program: { module: "forgeax::single-layer-medium" }
    }
  ],
  parameters: [],
  values: {}
};
var SINGLE_LAYER_MEDIUM_SURFACE_EXAMPLES = [
  {
    module: "game::water_surface_a",
    source: `#define_import_path game::water_surface_a
#import forgeax_material::single_layer_medium_surface_v1::{SingleLayerMediumSurfaceInput, SingleLayerMediumSurfaceData}
fn evaluate_surface(input : SingleLayerMediumSurfaceInput) -> SingleLayerMediumSurfaceData {
  let event = read_waterEvents(input.eventRangeStart);
  let normal = normalize(input.geometricNormalWS + vec3<f32>(0.0, 0.0, event.time * 0.02));
  return SingleLayerMediumSurfaceData(normal, 0.18, 1.0, 0.0, vec3<f32>(0.18, 0.06, 0.02), vec3<f32>(0.02, 0.04, 0.08), 1.333, 0.2, 1000.0);
}`
  },
  {
    module: "game::water_surface_b",
    source: `#define_import_path game::water_surface_b
#import forgeax_material::single_layer_medium_surface_v1::{SingleLayerMediumSurfaceInput, SingleLayerMediumSurfaceData}
fn evaluate_surface(input : SingleLayerMediumSurfaceInput) -> SingleLayerMediumSurfaceData {
  let event = read_waterEvents(input.eventRangeStart);
  let normal = normalize(input.geometricNormalWS + vec3<f32>(event.position.xy * 0.01, 0.0));
  return SingleLayerMediumSurfaceData(normal, 0.32, 1.0, clamp(event.time * 0.1, 0.0, 1.0), vec3<f32>(0.04, 0.02, 0.01), vec3<f32>(0.08, 0.05, 0.02), 1.333, -0.1, 800.0);
}`
  }
];

// sdk/engine/node_modules/@forgeax/engine-render/src/glyph-geometry.ts
import { runtimeAssets } from "@forgeax/engine-assets-runtime/internal";
import { buildGlyphMeshAsset, layoutGlyphText } from "@forgeax/engine-graphics-extras";
import { TextError } from "@forgeax/engine-types";
function glyphTextGeometry(world, entity) {
  const glyph = world.get(entity, GlyphText);
  if (!glyph.ok || glyph.value.fontHandle === 0 || glyph.value.text.length === 0) return void 0;
  if (!Number.isFinite(glyph.value.fontSize) || glyph.value.fontSize <= 0)
    throw new TextError({
      code: "glyph-layout-failed",
      expected: "a positive finite fontSize",
      hint: "repair the GlyphText size before querying"
    });
  const font = runtimeAssets(world.assets).resolveAsset(glyph.value.fontHandle);
  if (!font.ok || font.value.kind !== "font") return void 0;
  return buildGlyphMeshAsset(layoutGlyphText(font.value, glyph.value.text, glyph.value.fontSize));
}

// sdk/engine/node_modules/@forgeax/engine-render/src/material-sampled-texture-budget.ts
import { readMaterialContent, runtimeAssets as runtimeAssets2 } from "@forgeax/engine-assets-runtime/internal";
var WEBGPU_MIN_SAMPLED_TEXTURES_PER_SHADER_STAGE = 16;
function materialSampledTextureBudget(world, _assets, materialHandle, limit = WEBGPU_MIN_SAMPLED_TEXTURES_PER_SHADER_STAGE) {
  const resolved = readMaterialContent(
    runtimeAssets2(world.assets),
    materialHandle
  );
  if (!resolved.ok) return void 0;
  const { passes, parameters, values } = resolved.value;
  const materialShaderId = runtimeMaterialShaderIdForMaterial(passes, void 0);
  if (!isCanonicalStandardPbrMaterialShader(materialShaderId)) return void 0;
  const admission = standardTransmissionAdmission(
    {
      materialShaderId,
      paramSnapshot: typeof values.transmission === "number" ? { transmission: values.transmission } : void 0,
      standardTextureMask: materialStandardTextureMask(parameters, materialShaderId, values)
    },
    limit
  );
  const transmission = admission?.kind ?? "none";
  return {
    limit,
    required: (transmission === "dedicated" || transmission === "exceeded" ? STANDARD_PBR_REQUIRED_SAMPLED_TEXTURES : WEBGPU_MIN_SAMPLED_TEXTURES_PER_SHADER_STAGE) + (materialUsesDirectDfgLut(parameters) ? 1 : 0),
    transmission,
    conflicts: admission?.kind === "exceeded" ? admission.conflicts : []
  };
}

// sdk/engine/node_modules/@forgeax/engine-render/src/plugin.ts
import { Terrain } from "@forgeax/engine-terrain";
var RENDER_COMPONENTS = [
  AmbientOcclusion,
  Atmosphere,
  BarrelDistortion,
  LensEffects,
  LensFlare,
  ClippingPlanes,
  Outline,
  ProjectedDecal,
  Camera,
  CameraView,
  CapsuleShadow,
  ShadowParticipation,
  PlanarReflection,
  CloudLayer,
  DirectionalLight,
  DynamicResolution,
  DepthOfField,
  Fog,
  Instances,
  Layer,
  LightProbe,
  MeshFilter,
  Terrain,
  MeshRenderer,
  MotionBlur,
  PointLight,
  PointLightShadow,
  Points,
  Lines,
  PostProcessParams,
  RectAreaLight,
  SceneInstance,
  SkyboxBackground,
  Skylight,
  SortKey,
  SpotLight,
  SpriteAnimation,
  SpriteInstances,
  SpriteRegionOverride,
  StereoCamera,
  Tilemap,
  Visibility
];
function registerRenderComponents(world) {
  const leases = RENDER_COMPONENTS.map(
    (component) => world.components.register(component).unwrap()
  );
  return () => {
    for (let index = leases.length - 1; index >= 0; index -= 1) leases[index]?.dispose();
  };
}
function renderComponentsPlugin() {
  return {
    name: "render-components",
    inject: ["world"],
    apply(ctx) {
      ctx.effect(() => registerRenderComponents(ctx.world), "render/components");
    }
  };
}

// sdk/engine/node_modules/@forgeax/engine-render/src/publication/publisher.ts
import {
  runtimeAssetReference,
  runtimeAssetSource,
  runtimeAssets as runtimeAssets4
} from "@forgeax/engine-assets-runtime/internal";
import { Time } from "@forgeax/engine-ecs";
import { ChildOf, Children, readPresentationWorldMatrix } from "@forgeax/engine-scene";
import { err as err3, ok as ok2 } from "@forgeax/engine-types";

// sdk/engine/node_modules/@forgeax/engine-render/src/publication/asset-closure.ts
import {
  AssetClosure,
  runtimeAssets as runtimeAssets3
} from "@forgeax/engine-assets-runtime/internal";
var PublishedAssetClosure = class {
  closure = new AssetClosure();
  get size() {
    return this.closure.size;
  }
  begin(owner) {
    const records = runtimeAssets3(owner);
    const transaction = this.closure.begin(owner);
    const patches = /* @__PURE__ */ new Map();
    return {
      acquire: transaction.acquire,
      release: transaction.release,
      update: (handle, change) => {
        if (!transaction.update(handle)) return;
        const base = this.closure.version(handle);
        const patch = change === void 0 || base === void 0 ? void 0 : publishAssetPatch(records.borrow(handle).unwrap(), change, base);
        if (patch !== void 0) patches.set(handle, patch);
      },
      rows: () => [...transaction.changed].filter((handle) => transaction.has(handle) && !patches.has(handle)).map((handle) => [
        handle,
        records.borrow(handle).unwrap(),
        transaction.version(handle) ?? 0
      ]),
      patches: () => [...patches.values()].filter(({ handle }) => transaction.has(handle)),
      retired: transaction.retired,
      commit: transaction.commit
    };
  }
  clear() {
    this.closure.clear();
  }
};

// sdk/engine/node_modules/@forgeax/engine-render/src/publication/observation.ts
var SOURCE_PREPARATION_PROTOCOL = "source-preparation-observation-v1";
function beginSourcePreparation(world, source, epoch, revision, frameId, baseline) {
  let control;
  try {
    control = globalThis.__forgeaxFramePhaseDiagnostics?.sourcePreparation;
    if (control?.enabled !== true || control.protocol !== SOURCE_PREPARATION_PROTOCOL || control.worldIdentity !== world.identity || baseline || control.result !== void 0)
      return void 0;
    if (control.attempts >= Math.min(120, control.maxAttempts)) {
      control.enabled = false;
      control.dropped++;
      return void 0;
    }
    control.attempts++;
  } catch {
    return void 0;
  }
  const owner = control;
  const worldIdentity = world.identity;
  let clocks = 0, clockFailures = 0;
  const now = () => {
    clocks++;
    try {
      return performance.now();
    } catch {
      clockFailures++;
      return Number.NaN;
    }
  };
  const begin = now();
  let cursor = begin, phase = "selection", overheadMs = 0, operations = 0, closed = false, runtimeMeshes = 0, meshMutation = false, omitted = 0;
  const phases = {};
  const counts = {};
  const facts = {};
  const rows = [];
  const observe = (write) => {
    if (closed) return void 0;
    try {
      const at = now();
      if (!Number.isFinite(at) || at < cursor) clockFailures++;
      else phases[phase] = (phases[phase] ?? 0) + at - cursor;
      operations++;
      write(at);
      const end = now();
      if (!Number.isFinite(end) || end < at) clockFailures++;
      else overheadMs += end - at;
      cursor = end;
      return end - at;
    } catch {
      try {
        owner.failures++;
      } catch {
      }
      return void 0;
    }
  };
  return {
    phase(next) {
      observe(() => {
        phase = next;
      });
    },
    count(reason, inserted) {
      observe(() => {
        if (reason === "mesh-filter-write") meshMutation = true;
        counts[reason] = (counts[reason] ?? 0) + 1;
        if (inserted === true)
          counts[`${reason}:inserted`] = (counts[`${reason}:inserted`] ?? 0) + 1;
      });
    },
    fact(name, value) {
      observe(() => {
        facts[name] = value;
        if (name === "pendingMeshContent" && typeof value === "number" && value > 0 || name === "runtimeNewMesh" && value === true)
          meshMutation = true;
      });
    },
    mesh(handle, runtime, cloned) {
      observe(() => {
        if (runtime) runtimeMeshes++;
        if (rows.length >= 64) {
          omitted++;
          return;
        }
        const bytes = (name) => {
          const descriptor = Object.getOwnPropertyDescriptor(cloned, name);
          const value = descriptor && "value" in descriptor ? descriptor.value : void 0;
          return ArrayBuffer.isView(value) ? value.byteLength : null;
        };
        rows.push({
          handle,
          runtime,
          verticesBytes: bytes("vertices"),
          indicesBytes: bytes("indices")
        });
      });
    },
    finish(status) {
      if (closed) return;
      const finalizationMs = observe((at) => {
        owner.outcomes[status]++;
        owner.probeWallMs += at - begin;
        owner.observerWallMs += overheadMs;
        if (runtimeMeshes === 0 || !meshMutation) {
          owner.skipped++;
          return;
        }
        const result = {
          protocol: SOURCE_PREPARATION_PROTOCOL,
          token: owner.token,
          buildAssertion: owner.build,
          worldIdentity,
          source,
          epoch,
          revision,
          frameId: frameId ?? null,
          beginMs: begin,
          endMs: at,
          timeOriginMs: performance.timeOrigin,
          status: owner.cancelled ? "cancelled" : status,
          runtimeMeshes,
          meshMutation,
          phases,
          counts,
          facts,
          rows,
          omitted,
          clock: { domain: "EngineWorker-performance", calls: clocks, failures: clockFailures },
          observer: { wallMs: overheadMs, operations, intrusive: true, includesFinalExport: false },
          limitation: "Reason counts overlap. Runtime means an emitted mesh without a Catalog GUID, not proof every such mesh changed. Phase wall is not CPU; no receiver replay, GPU fence, or net savings claim. Clone bytes cover top-level views only, not total payload or unique buffers."
        };
        const encoded = JSON.stringify(result);
        owner.result = new TextEncoder().encode(encoded).byteLength <= 16384 ? result : {
          protocol: SOURCE_PREPARATION_PROTOCOL,
          token: owner.token,
          status: "unavailable",
          reason: "byte-budget",
          worldIdentity,
          source,
          epoch,
          revision,
          frameId: frameId ?? null,
          omitted: rows.length + omitted,
          maxBytes: 16384
        };
        owner.enabled = false;
      });
      closed = true;
      try {
        owner.clockCalls += clocks;
        owner.clockFailures += clockFailures;
        if (Number.isFinite(finalizationMs)) owner.finalizationWallMs += finalizationMs ?? 0;
      } catch {
      }
    }
  };
}

// sdk/engine/node_modules/@forgeax/engine-render/src/publication/texture-consumers.ts
function projectTextureConsumers(previous, removed, rows, collect) {
  let next = previous;
  for (const entity of removed) {
    if (!next.has(entity)) continue;
    if (next === previous) next = new Map(previous);
    next.delete(entity);
  }
  for (const row of rows) {
    const sources = collect(row.materials.map((material) => material.snapshot));
    if (sources === void 0 && !next.has(row.entityKey)) continue;
    if (next === previous) next = new Map(previous);
    if (sources === void 0) next.delete(row.entityKey);
    else next.set(row.entityKey, sources);
  }
  return next;
}
function materialVideoClips(materials) {
  let clips;
  for (const material of materials) {
    const fields = material.videoTextureFields;
    if (fields === void 0) continue;
    for (const clip of fields.values()) {
      clips ??= /* @__PURE__ */ new Set();
      clips.add(clip);
    }
  }
  return clips === void 0 ? void 0 : [...clips];
}
function materialCanvasSources(materials) {
  let sources;
  for (const material of materials) {
    const fields = material.textureSources;
    if (fields === void 0) continue;
    for (const source of fields.values()) {
      if (!isCanvasTextureSource(source)) continue;
      sources ??= /* @__PURE__ */ new Set();
      sources.add(source);
    }
  }
  return sources === void 0 ? void 0 : [...sources];
}

// sdk/engine/node_modules/@forgeax/engine-render/src/publication/video.ts
import {
  VIDEO_SOURCE_PROVIDER_KEY,
  videoSourceExtent
} from "@forgeax/engine-graphics-extras";
function publicationVideoFrames(world, consumers) {
  if (consumers.size === 0 || !world.hasResource(VIDEO_SOURCE_PROVIDER_KEY)) return [];
  const provider = world.getResource(VIDEO_SOURCE_PROVIDER_KEY);
  const frames = [];
  try {
    for (const [entity, clips] of consumers)
      for (const clip of clips) {
        const source = provider.getSource(entity, clip);
        if (source === void 0 || videoSourceExtent(source) === void 0) continue;
        frames.push({ entity, clip, frame: new VideoFrame(source) });
      }
    return frames;
  } catch (cause) {
    for (const row of frames) row.frame.close();
    throw cause;
  }
}

// sdk/engine/node_modules/@forgeax/engine-render/src/publication/publisher.ts
var EMPTY_ASSET_ROWS = Object.freeze([]);
var EMPTY_IDENTITIES = Object.freeze([]);
var EMPTY_MATERIAL_ROWS = Object.freeze([]);
function publicationKeyValue(key, value) {
  return value instanceof Map ? key === "textureSources" ? [...value].map(([name, source]) => [
    name,
    isCanvasTextureSource(source) ? renderTextureSourceKey(source) : isExternalTextureSource(source) ? renderTextureSourceKey(source) : renderTargetMaterialSourceIdentity(source)
  ]) : [...value] : ArrayBuffer.isView(value) ? Array.from(value) : value;
}
function publicationAssetBrand(asset) {
  return asset?.kind === "material" ? "material" : asset?.kind === "mesh" ? "mesh" : "RenderFeatureAsset";
}
function createRenderPublisher(world, assets, identity, capabilities, features = [], targetOwner, limits, maxInFlight = 2) {
  world.bindAssets(assets).unwrap();
  const assetObserver = assets.observe().unwrap();
  const assetClosure = new PublishedAssetClosure();
  const materialIds = /* @__PURE__ */ new WeakMap();
  const materialRecords = /* @__PURE__ */ new Map();
  const materialsByEntity = /* @__PURE__ */ new Map();
  const materialRows = /* @__PURE__ */ new Map();
  const materialSources = /* @__PURE__ */ new Map();
  const nextMaterialDependencies = /* @__PURE__ */ new Map();
  const materialHolds = /* @__PURE__ */ new Map();
  let nextMaterialId = 1;
  if (maxInFlight !== 2 && maxInFlight !== 3 && maxInFlight !== 4)
    throw new RenderPublicationError({ reason: "shape", subject: "publication capacity" });
  let activeObservation;
  const publishedFullscreenFeatures = /* @__PURE__ */ new Map();
  const releaseTransforms = registerRenderSourceSystems(world);
  const source = createRenderSourceState(world);
  const transforms = createGlobalTransformChangeQuery(world);
  const caches = /* @__PURE__ */ new WeakMap();
  const members = /* @__PURE__ */ new Set();
  const publishedPrograms = /* @__PURE__ */ new Set();
  const publishedMaterialProjections = /* @__PURE__ */ new Map();
  let assetVersions = /* @__PURE__ */ new Map();
  const dependencies = /* @__PURE__ */ new Map();
  const pending = /* @__PURE__ */ new Set();
  let canvasConsumers = /* @__PURE__ */ new Map();
  let videoConsumers = /* @__PURE__ */ new Map();
  const flights = /* @__PURE__ */ new Map();
  const jointsByEntity = /* @__PURE__ */ new Map();
  const skinConsumers = /* @__PURE__ */ new Map();
  const updateSkinConsumers = (entity, joints) => {
    const previous = jointsByEntity.get(entity);
    if (previous === joints || previous !== void 0 && joints !== void 0 && previous.length === joints.length && previous.every((joint, index) => joint === joints[index]))
      return;
    for (const joint of previous ?? []) {
      const users = skinConsumers.get(joint);
      users?.delete(entity);
      if (users?.size === 0) skinConsumers.delete(joint);
    }
    jointsByEntity.delete(entity);
    if (joints === void 0) return;
    jointsByEntity.set(entity, [...joints]);
    for (const joint of joints) {
      let users = skinConsumers.get(joint);
      if (users === void 0) {
        users = /* @__PURE__ */ new Set();
        skinConsumers.set(joint, users);
      }
      users.add(entity);
    }
  };
  let frameDependencies = /* @__PURE__ */ new Set();
  let revision = 0, disposed = false, active = false;
  let lastScannedRows = 0, allocations = 0;
  let storage = [new ArrayBuffer(0), new ArrayBuffer(0), new ArrayBuffer(0), new ArrayBuffer(0)];
  const spareStorage = [];
  const buffer = (index, bytes) => {
    let value = storage[index];
    if (value.byteLength < bytes) {
      let capacity = Math.max(16, value.byteLength);
      while (capacity < bytes) capacity *= 2;
      value = new ArrayBuffer(capacity);
      storage[index] = value;
      allocations++;
    }
    return value;
  };
  const fail = (reason, subject) => err3(new RenderPublicationError({ reason, subject }));
  const acknowledgePrograms = (programs) => {
    if (disposed) return;
    for (const program of programs) publishedPrograms.add(program.key);
  };
  return {
    identity,
    /** A successful candidate preparation ACK proves these programs reached this receiver. */
    acknowledgePrograms,
    unpublishedPrograms: (programs) => programs.filter((program) => !publishedPrograms.has(program.key)),
    inspect: () => ({
      revision,
      members: members.size,
      assetCount: assetClosure.size,
      scannedRows: lastScannedRows,
      inFlight: flights.size > 0,
      inFlightCount: flights.size,
      allocations
    }),
    prepare(sampleTimeSeconds, temporalReset = false, execution) {
      if (disposed) return fail("disposed", "publisher");
      if (active || flights.size >= maxInFlight)
        return fail("in-flight", "publication slots are occupied");
      materialRows.clear();
      materialSources.clear();
      nextMaterialDependencies.clear();
      materialHolds.clear();
      const baseline = revision === 0;
      const observation = beginSourcePreparation(
        world,
        identity.source,
        identity.epoch,
        revision + 1,
        execution?.frameId,
        baseline
      );
      activeObservation = observation;
      const featureSources = [...features];
      const batch = source.projection.read();
      lastScannedRows = batch.scannedRows;
      observation?.fact("scannedRows", batch.scannedRows);
      observation?.fact("batchIndices", batch.indices.length);
      observation?.fact("changedComponentKinds", batch.changedComponents.length);
      observation?.fact("membershipChanged", batch.membershipChanged);
      observation?.fact("pending", pending.size);
      const changed = new Set(pending), removed = /* @__PURE__ */ new Set();
      const invalidated = /* @__PURE__ */ new Set();
      const assetBatch = assetObserver.read().unwrap();
      observation?.fact("assetChanges", assetBatch.changes.length);
      for (const change of assetBatch.changes)
        if (!change.removed) invalidated.add(change.handle);
      for (const index of batch.indices) {
        const previous = source.entities.get(index), current = source.projection.entity(index);
        if (previous !== void 0 && members.has(previous) && (current !== previous || !isRenderableMember(world, previous)))
          removed.add(previous);
        if (previous !== void 0)
          for (const consumer of skinConsumers.get(previous) ?? []) {
            const size = observation === void 0 ? 0 : changed.size;
            changed.add(consumer);
            observation?.count("skin-component", changed.size !== size);
          }
        if (current === void 0) continue;
        if (isRenderableMember(world, current) && (baseline || !members.has(current) || source.renderableComponents.some((component) => {
          const dirty = source.projection.changed(current, component);
          if (dirty && observation !== void 0 && component.name === "MeshFilter")
            observation.count("mesh-filter-write");
          return dirty;
        }))) {
          const size = observation === void 0 ? 0 : changed.size;
          changed.add(current);
          observation?.count("renderable-component-or-new", changed.size !== size);
        }
        if (batch.membershipChanged || source.projection.changed(current, ChildOf) || source.projection.changed(current, Visibility)) {
          const queue = [current], visited = /* @__PURE__ */ new Set();
          while (queue.length) {
            const entity = queue.pop();
            if (visited.has(entity)) continue;
            visited.add(entity);
            if (isRenderableMember(world, entity)) {
              const size = observation === void 0 ? 0 : changed.size;
              changed.add(entity);
              observation?.count("hierarchy", changed.size !== size);
            }
            if (world.hasComponent(entity, Children))
              queue.push(
                ...Array.from(
                  world.get(entity, Children).unwrap().entities,
                  (child) => child
                )
              );
          }
        }
      }
      if (baseline) {
        for (const entity of members) changed.add(entity);
        for (const entity of source.entities.values())
          if (isRenderableMember(world, entity)) {
            const size = observation === void 0 ? 0 : changed.size;
            changed.add(entity);
            observation?.count("catalog-source", changed.size !== size);
          }
      }
      const matrixRows = /* @__PURE__ */ new Map();
      for (const span of transforms.spans().unwrap()) {
        for (let row = 0; row < span.entities.length; row++) {
          const entity = span.entities[row];
          for (const consumer of skinConsumers.get(entity) ?? []) {
            const size = observation === void 0 ? 0 : changed.size;
            changed.add(consumer);
            observation?.count("skin-transform", changed.size !== size);
          }
          if (members.has(entity) && !removed.has(entity)) {
            const matrix = readPresentationWorldMatrix(world, entity);
            if (matrix !== void 0) matrixRows.set(entity, matrix);
            pending.add(entity);
          }
        }
      }
      observation?.fact("changed", changed.size);
      observation?.fact("removed", removed.size);
      observation?.fact("invalidated", invalidated.size);
      observation?.fact("matrixRows", matrixRows.size);
      for (const entity of changed) pending.add(entity);
      let canvasFrames = [];
      let videoFrames = [];
      try {
        observation?.phase("extract");
        const frame = extractFrames(
          [world],
          { cameraOwner: 0, resourceOwner: 0 },
          assets,
          void 0,
          caches,
          {
            ...capabilities === void 0 ? {} : renderMaterialContext(capabilities, limits),
            cull: "none",
            retainHidden: true,
            renderables: changed.size ? { kind: "partial", entitiesByWorld: [changed] } : "none"
          }
        );
        observation?.phase("templates");
        observation?.fact("renderables", frame.renderables.length);
        const meshCounts = /* @__PURE__ */ new Map();
        for (const row of frame.renderables)
          if (row.assetHandle !== void 0)
            meshCounts.set(row.assetHandle, (meshCounts.get(row.assetHandle) ?? 0) + 1);
        const templates = [], templateIds = /* @__PURE__ */ new Map();
        const valueIds = /* @__PURE__ */ new Map();
        const values = /* @__PURE__ */ new Map();
        const keyValue = (key, value) => key === "paramSnapshot" && value !== null && typeof value === "object" ? valueId(value, true) : publicationKeyValue(key, value);
        const valueId = (object, parameters = false) => {
          const cached = valueIds.get(object);
          if (cached !== void 0) return cached;
          const value = JSON.stringify(object, parameters ? publicationKeyValue : keyValue);
          let id = values.get(value);
          if (id === void 0) {
            id = values.size;
            values.set(value, id);
          }
          valueIds.set(object, id);
          return id;
        };
        const upserts = [];
        const programs = /* @__PURE__ */ new Map();
        const programMaterials = /* @__PURE__ */ new Set();
        const nextDependencies = /* @__PURE__ */ new Map();
        let closure;
        const publicationClosure = () => closure ??= assetClosure.begin(assets);
        const publishMaterial = (resource) => {
          let id = materialIds.get(resource);
          if (id === void 0) {
            if (nextMaterialId > 4294967295)
              throw new Error("material publication identity capacity exhausted");
            id = nextMaterialId++;
            materialIds.set(resource, id);
          }
          materialSources.set(id, resource);
          if (materialRecords.get(id)?.snapshot !== resource.snapshot)
            materialRows.set(id, resource.snapshot);
          return id;
        };
        const byRenderable = /* @__PURE__ */ new Map();
        for (const { entityIndex: _entity, renderableIndex, ...dispatch } of frame.dispatch) {
          const rows = byRenderable.get(renderableIndex) ?? [];
          rows.push(dispatch);
          byRenderable.set(renderableIndex, rows);
        }
        const publishProgram = (key) => {
          if (publishedPrograms.has(key) || programs.has(key)) return;
          const shader = assets.shaderRegistry.findMaterialArtifact(key);
          if (!shader.ok) throw shader.error;
          const artifact = assets.getMaterialArtifact(key);
          programs.set(key, {
            key,
            shader: {
              source: shader.value.source,
              ...shader.value.program.entryPoints === void 0 ? {} : { entryPoints: shader.value.program.entryPoints },
              paramSchema: shader.value.paramSchema,
              ...shader.value.receipt === void 0 ? {} : { receipt: shader.value.receipt }
            },
            ...artifact === void 0 ? {} : { artifact }
          });
        };
        const publishPrograms = (materials) => {
          for (const material of materials) {
            if (programMaterials.has(material)) continue;
            programMaterials.add(material);
            for (const key of publicationMaterialProgramKeys(material)) publishProgram(key);
          }
        };
        for (const handle of invalidated) {
          for (const { cache, geometry, vertexColor } of caches.get(worldRenderResources(world))?.values() ?? []) {
            if (!cache.has(handle)) continue;
            const context = capabilities === void 0 ? void 0 : renderMaterialContext(capabilities, limits).materialContext;
            const snapshot = resolveMaterialSnapshot(
              handle,
              worldRenderResources(world),
              assets,
              void 0,
              cache,
              context === void 0 ? void 0 : { ...context, geometry },
              void 0,
              vertexColor
            );
            const resource = MaterialResource.from(snapshot);
            const id = materialIds.get(resource);
            if (id !== void 0 && materialRecords.has(id)) {
              publishMaterial(resource);
              publishPrograms([snapshot]);
            }
          }
        }
        for (let i = 0; i < frame.renderables.length; i++) {
          const row = frame.renderables.at(i);
          if (row.skin) return fail("unsupported", "source GPU skin receipt");
          if ([...row.materials, ...row.materialOverrides ?? []].some(
            (material2) => [...material2?.snapshot.textureSources?.values() ?? []].some(
              isExternalTextureSource
            )
          ))
            return fail("unsupported", "renderer-local external texture source");
          const {
            worldId: _world,
            entityKey,
            transform,
            material,
            materials,
            materialOverrides,
            ...content
          } = row;
          const materialReferences = materials.map(publishMaterial);
          const overrides = materialOverrides?.map(
            (resource) => resource === void 0 ? 0 : publishMaterial(resource)
          );
          nextMaterialDependencies.set(entityKey, [
            ...materialReferences,
            ...(overrides ?? []).filter((id) => id !== 0)
          ]);
          const snapshot = {
            ...content,
            material: publishMaterial(material),
            materials: materialReferences,
            ...overrides === void 0 ? {} : { materialOverrides: overrides }
          };
          const template = { snapshot, dispatch: byRenderable.get(i) ?? [] };
          const entityOwned = snapshot.instances !== void 0 || snapshot.spriteInstances !== void 0 || snapshot.skinPose !== void 0 || snapshot.pointsLines !== void 0;
          const key = entityOwned || snapshot.assetHandle !== void 0 && meshCounts.get(snapshot.assetHandle) === 1 ? void 0 : JSON.stringify(
            {
              snapshot: {
                ...snapshot,
                material: snapshot.material,
                materials: snapshot.materials
              },
              dispatch: template.dispatch
            },
            keyValue
          );
          let known = key === void 0 ? void 0 : templateIds.get(key);
          if (known === void 0) {
            const index2 = templates.length;
            templates.push(template);
            publishPrograms(
              [
                ...row.materials,
                ...(materialOverrides ?? []).filter((resource) => resource !== void 0)
              ].map((material2) => material2.snapshot)
            );
            const handles = renderableAssetRoots(row);
            known = { index: index2, dependencies: handles };
            if (key !== void 0) templateIds.set(key, known);
          }
          upserts.push(entityKey, known.index);
          matrixRows.set(entityKey, transform.world);
          nextDependencies.set(entityKey, known.dependencies);
        }
        observation?.phase("feature");
        const nextAssetVersions = /* @__PURE__ */ new Map();
        const featureRows = featureSources.map((feature) => {
          const data = feature.extract({
            worlds: [world],
            owner: 0,
            frameNumber: revision + 1,
            ...capabilities === void 0 ? {} : {
              caps: capabilities,
              ...limits === void 0 ? {} : { limits },
              ...renderMaterialContext(capabilities, limits)
            },
            views: frame.cameras.filter((camera) => camera.view?.enabled !== false).flatMap(stereoEyeCameras).map((camera) => ({
              ...renderFeatureCameraView(camera),
              ...frame.cloudLayer === void 0 ? {} : { frame: { cloudLayer: frame.cloudLayer } }
            })),
            visibilitySnapshots: frame.featureVisibilitySnapshots,
            referenceAssetVersion: (sourceWorldIndex, version) => {
              if (sourceWorldIndex !== 0)
                throw new TypeError("fixed asset source World mismatch");
              const key = `${version.handle}:${version.revision}`;
              const prior = nextAssetVersions.get(key) ?? assetVersions.get(key);
              nextAssetVersions.set(key, prior ?? version);
            },
            referenceAsset: (sourceWorldIndex, identity2, captured) => {
              if (sourceWorldIndex !== 0) return void 0;
              const handle = typeof identity2 === "string" ? resolveRuntimeAssetReference(
                worldRenderResources(world),
                identity2,
                publicationAssetBrand(captured)
              ) : identity2;
              if (handle === void 0) return void 0;
              const current = runtimeAssets4(world.assets).resolveAsset(handle);
              return current.ok && current.value === captured ? handle : void 0;
            }
          }).unwrap();
          const fullscreen = fullscreenRenderFeatureDeclaration(feature);
          return {
            identity: feature.identity,
            data,
            ...fullscreen === void 0 || publishedFullscreenFeatures.get(feature.identity) === fullscreen ? {} : { fullscreen }
          };
        });
        observation?.phase("packet");
        const nextFrameDependencies = new Set(publicationFrameDependencies(frame));
        for (const feature of featureSources) {
          const row = featureRows.find((row2) => row2.identity === feature.identity);
          if (row === void 0) continue;
          for (const identity2 of feature.assetDependencies?.(row.data) ?? []) {
            const handle = typeof identity2 === "string" ? runtimeAssetReference(assets, identity2) : identity2;
            if (handle === void 0 || !assets.validate(handle).ok)
              throw new Error(`Missing feature asset ${identity2}`);
            nextFrameDependencies.add(handle);
          }
        }
        const emitted = new Set(frame.renderables.map((row) => row.entityKey));
        for (const entity of changed)
          if (members.has(entity) && !emitted.has(entity)) removed.add(entity);
        for (const entity of removed) matrixRows.delete(entity);
        const nextVideoConsumers = projectTextureConsumers(
          videoConsumers,
          removed,
          frame.renderables,
          materialVideoClips
        );
        videoFrames = publicationVideoFrames(world, nextVideoConsumers);
        const nextCanvasConsumers = projectTextureConsumers(
          canvasConsumers,
          removed,
          frame.renderables,
          materialCanvasSources
        );
        canvasFrames = publicationCanvasFrames(nextCanvasConsumers);
        const transformEntities = new Uint32Array(
          buffer(2, matrixRows.size * 4),
          0,
          matrixRows.size
        ), matrices = new Float32Array(buffer(3, matrixRows.size * 64), 0, matrixRows.size * 16);
        let index = 0;
        for (const [entity, matrix] of matrixRows) {
          transformEntities[index] = entity;
          matrices.set(matrix, index * 16);
          index++;
        }
        const {
          renderables: _rows,
          dispatch: _dispatch,
          visibilitySnapshots: _visibility,
          featureVisibilitySnapshots: _features,
          hiddenEntityReports: _hidden,
          ...metadata
        } = frame;
        const removedConsumers = /* @__PURE__ */ new Set([...removed, ...nextDependencies.keys()]);
        for (const handles of nextDependencies.values())
          for (const handle of handles) publicationClosure().acquire(handle);
        for (const entity of removedConsumers)
          for (const handle of dependencies.get(entity) ?? []) publicationClosure().release(handle);
        for (const handle of nextFrameDependencies)
          if (!frameDependencies.has(handle)) publicationClosure().acquire(handle);
        for (const handle of frameDependencies)
          if (!nextFrameDependencies.has(handle)) publicationClosure().release(handle);
        for (const change of assetBatch.changes)
          if (!change.removed) publicationClosure().update(change.handle, change);
        const assetRows = closure?.rows() ?? EMPTY_ASSET_ROWS;
        const retired = closure?.retired() ?? EMPTY_IDENTITIES;
        const materialProjections = /* @__PURE__ */ new Map();
        for (const [handle, value] of assetRows) {
          if (value.kind !== "material") continue;
          const source2 = runtimeAssets4(world.assets).resolveAsset(handle).unwrap();
          const projection = source2.kind === "material" ? assets.getMaterialProjectionForPayload(source2) : void 0;
          materialProjections.set(handle, projection);
          if (projection !== void 0) {
            for (const pass of projection.passes)
              for (const program of pass.programs) publishProgram(program.specializationKey);
          } else {
            const snapshot = resolveMaterialSnapshot(
              handle,
              worldRenderResources(world),
              assets,
              void 0,
              void 0,
              capabilities === void 0 ? void 0 : renderMaterialContext(capabilities, limits).materialContext
            );
            publishPrograms([snapshot]);
          }
        }
        const holdMaterial = (id, delta) => materialHolds.set(
          id,
          (materialHolds.get(id) ?? materialRecords.get(id)?.holds ?? 0) + delta
        );
        for (const ids of nextMaterialDependencies.values())
          for (const id of ids) holdMaterial(id, 1);
        for (const entity of /* @__PURE__ */ new Set([...removed, ...nextMaterialDependencies.keys()]))
          for (const id of materialsByEntity.get(entity) ?? []) holdMaterial(id, -1);
        const retiredMaterials = materialHolds.size === 0 ? EMPTY_IDENTITIES : [...materialHolds].flatMap(([id, count]) => count === 0 ? [id] : []);
        const publishedMaterials = materialRows.size === 0 ? EMPTY_MATERIAL_ROWS : [...materialRows].filter(
          ([id]) => (materialHolds.get(id) ?? materialRecords.get(id)?.holds ?? 0) > 0
        ).map(([id, value]) => ({ id, value }));
        const upsertColumn = new Uint32Array(buffer(0, upserts.length * 4), 0, upserts.length);
        upsertColumn.set(upserts);
        const removedColumn = new Uint32Array(buffer(1, removed.size * 4), 0, removed.size);
        removedColumn.set([...removed]);
        observation?.phase("packet");
        const packet = {
          ...identity,
          protocol: 2,
          materials: publishedMaterials,
          retiredMaterials,
          revision: revision + 1,
          base: revision,
          baseline,
          time: { ...world.getResource(Time) },
          sampleTimeSeconds,
          temporalReset,
          transparentSort: getTransparentSortConfig(world),
          metadata,
          templates,
          videoFrames,
          ...canvasFrames.length > 0 ? { canvasFrames } : {},
          targets: targetOwner?.snapshot() ?? [],
          targetSources: publicationTargetSources(publishedMaterials),
          features: featureRows,
          assetVersions: [...nextAssetVersions].flatMap(
            ([key, version]) => assetVersions.has(key) ? [] : [{ ...version, value: structuredClone(version.value) }]
          ),
          retiredAssetVersions: [...assetVersions].flatMap(
            ([key, { handle, revision: revision2 }]) => nextAssetVersions.has(key) ? [] : [{ handle, revision: revision2 }]
          ),
          programs: [...programs.values()],
          upserts: upsertColumn,
          removed: removedColumn,
          transformEntities,
          transforms: matrices,
          assets: [...assetRows].map(([handle, value, revision2]) => {
            const guid = runtimeAssetSource(assets, handle);
            const sourceKey = guid === void 0 ? void 0 : assets.sourceKeyOf(guid);
            const isMesh = value.kind === "mesh";
            if (isMesh) observation?.phase("clone");
            const packetValue = structuredClone(value);
            if (isMesh) {
              observation?.phase("packet");
              observation?.mesh(handle, guid === void 0, packetValue);
            }
            return {
              handle,
              revision: revision2,
              // Assets stay with their source owner. An admitted mesh owns a
              // detached packet copy so its large buffers can move to Render
              // without another receiver-side structured-clone allocation.
              value: packetValue,
              ...value.kind !== "material" || publishedMaterialProjections.has(handle) && publishedMaterialProjections.get(handle) === materialProjections.get(handle) ? {} : { materialProjection: structuredClone(materialProjections.get(handle) ?? null) },
              ...guid === void 0 ? {} : { guid },
              ...sourceKey === void 0 ? {} : { sourceKey }
            };
          }),
          retiredAssets: retired,
          assetPatches: closure?.patches() ?? []
        };
        observation?.fact("assets", packet.assets.length);
        observation?.fact("templates", templates.length);
        observation?.fact("upsertRows", upserts.length / 2);
        observation?.phase("candidate");
        batch.validate();
        active = true;
        let closed = false;
        return ok2({
          packet,
          ...observation === void 0 ? {} : { observation },
          accept: () => {
            if (closed)
              throw new RenderPublicationError({ reason: "revision", subject: "closed candidate" });
            observation?.phase("accept");
            batch.accept();
            assetBatch.accept();
            assetVersions = nextAssetVersions;
            for (const handle of retired) publishedMaterialProjections.delete(handle);
            for (const [handle, projection] of materialProjections)
              publishedMaterialProjections.set(handle, projection);
            closure?.commit();
            for (const [id, holds] of materialHolds) {
              const resource = materialSources.get(id) ?? materialRecords.get(id)?.resource;
              if (holds === 0) materialRecords.delete(id);
              else if (resource !== void 0)
                materialRecords.set(id, { resource, holds, snapshot: resource.snapshot });
            }
            for (const { id, value } of publishedMaterials) {
              const previous = materialRecords.get(id);
              if (previous !== void 0) materialRecords.set(id, { ...previous, snapshot: value });
            }
            for (const entity of removed) materialsByEntity.delete(entity);
            for (const [entity, ids] of nextMaterialDependencies)
              materialsByEntity.set(entity, ids);
            for (const row of featureRows) {
              if (row.fullscreen !== void 0)
                publishedFullscreenFeatures.set(row.identity, row.fullscreen);
            }
            for (const key of programs.keys()) publishedPrograms.add(key);
            closed = true;
            active = false;
            revision++;
            flights.set(revision, {
              features: featureRows,
              owners: featureSources,
              submitted: false
            });
            storage = spareStorage.pop() ?? [
              new ArrayBuffer(0),
              new ArrayBuffer(0),
              new ArrayBuffer(0),
              new ArrayBuffer(0)
            ];
            for (const row of videoFrames) row.frame.close();
            for (const row of canvasFrames) row.frame?.close();
            videoConsumers = nextVideoConsumers;
            canvasConsumers = nextCanvasConsumers;
            frameDependencies = nextFrameDependencies;
            for (const entity of removedConsumers) dependencies.delete(entity);
            for (const entity of removed) updateSkinConsumers(entity, void 0);
            for (const row of frame.renderables)
              updateSkinConsumers(row.entityKey, row.skinJointEntities);
            for (const entity of removed) members.delete(entity);
            for (const [entity, handles] of nextDependencies) {
              members.add(entity);
              dependencies.set(entity, handles);
            }
            for (const entity of matrixRows.keys()) pending.delete(entity);
            for (const entity of removed) pending.delete(entity);
            for (const sourceIndex of batch.indices) {
              const entity = source.projection.entity(sourceIndex);
              if (entity === void 0) {
                source.entities.delete(sourceIndex);
              } else {
                source.entities.set(sourceIndex, entity);
              }
            }
            observation?.finish("accepted");
            activeObservation = void 0;
          },
          discard: () => {
            if (!closed) {
              closed = true;
              active = false;
              for (const row of videoFrames) row.frame.close();
              for (const row of canvasFrames) row.frame?.close();
              observation?.finish("discarded");
              activeObservation = void 0;
            }
          }
        });
      } catch (cause) {
        observation?.finish("prepare-error");
        activeObservation = void 0;
        for (const row of videoFrames) row.frame.close();
        for (const row of canvasFrames) row.frame?.close();
        return fail("unsupported", cause instanceof Error ? cause.message : String(cause));
      }
    },
    acknowledgeFeatures(acceptedRevision, receipts) {
      if (disposed) return fail("disposed", "publisher");
      const flight = flights.get(acceptedRevision);
      if (flight === void 0 || flight.submitted)
        return fail("revision", "feature acknowledgment");
      const identities = /* @__PURE__ */ new Set();
      for (const receipt of receipts) {
        if (identities.has(receipt.identity))
          return fail("revision", "duplicate feature acknowledgment");
        const row = flight.features.find((row2) => row2.identity === receipt.identity);
        const feature = flight.owners.find((feature2) => feature2.identity === receipt.identity);
        if (row === void 0 || feature === void 0)
          return fail("shape", "unknown feature acknowledgment");
        identities.add(receipt.identity);
      }
      flight.submitted = true;
      for (const receipt of receipts) {
        const row = flight.features.find((row2) => row2.identity === receipt.identity);
        const feature = flight.owners.find((feature2) => feature2.identity === receipt.identity);
        feature?.onSourceFrameSubmitted?.(row?.data, receipt.feedback);
      }
      return ok2(void 0);
    },
    recycle(acceptedRevision, buffers) {
      if (disposed) return fail("disposed", "publisher");
      if (flights.keys().next().value !== acceptedRevision)
        return fail("revision", "returned storage revision");
      if (buffers.length !== 4 || buffers.some((value) => !(value instanceof ArrayBuffer)))
        return fail("shape", "returned storage");
      if (active || storage.some((buffer2) => buffer2.byteLength > 0))
        spareStorage.push([...buffers]);
      else storage = [...buffers];
      flights.delete(acceptedRevision);
      return ok2(void 0);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      activeObservation?.finish("retired");
      activeObservation = void 0;
      releaseTransforms();
      members.clear();
      dependencies.clear();
      assetObserver.dispose();
      assetClosure.clear();
      assetVersions.clear();
      publishedMaterialProjections.clear();
      materialRecords.clear();
      materialsByEntity.clear();
      pending.clear();
      videoConsumers.clear();
      canvasConsumers.clear();
      flights.clear();
      spareStorage.length = 0;
      frameDependencies.clear();
      jointsByEntity.clear();
      skinConsumers.clear();
    }
  };
}

// sdk/engine/node_modules/@forgeax/engine-render/src/raytracing/diffuse-gi-tier.ts
import { ok as ok3 } from "@forgeax/engine-types";
var DIFFUSE_GI_TIERS = Object.freeze([
  "low",
  "medium",
  "high",
  "epic"
]);
var DIFFUSE_GI_TIER_BUDGETS = Object.freeze({
  low: Object.freeze({}),
  medium: Object.freeze({
    field: Object.freeze({
      raysPerProbe: 32,
      probeBudget: 64,
      hysteresis: 0.8,
      cardResolution: 16,
      cardBudget: 128,
      clipmapLevels: 2,
      resolution: "half",
      radiosity: false
    })
  }),
  high: Object.freeze({
    field: Object.freeze({
      raysPerProbe: 64,
      probeBudget: 128,
      hysteresis: 0.7,
      cardResolution: 16,
      cardBudget: 256,
      clipmapLevels: 3,
      resolution: "half",
      radiosity: true
    }),
    probes: Object.freeze({
      downsample: 16,
      adaptiveFraction: 0.25,
      importance: "brdf",
      screenTrace: Object.freeze({ maxSteps: 16, thickness: 0.02 }),
      filterPasses: 1,
      shortRangeAo: 0,
      maxFrames: 10
    })
  }),
  epic: Object.freeze({
    field: Object.freeze({
      raysPerProbe: 128,
      probeBudget: 256,
      hysteresis: 0.7,
      cardResolution: 16,
      cardBudget: 512,
      clipmapLevels: 4,
      resolution: "full",
      radiosity: true
    }),
    probes: Object.freeze({
      downsample: 8,
      adaptiveFraction: 0.5,
      importance: "brdf",
      screenTrace: Object.freeze({ maxSteps: 32, thickness: 0.02 }),
      filterPasses: 2,
      shortRangeAo: 0,
      maxFrames: 10
    })
  })
});
function capabilityGap(caps) {
  if (caps.backendKind === "wgpu-webgl2") return "webgl2-backend";
  if (!caps.compute) return "compute-unavailable";
  if (!caps.storageBuffer) return "storage-buffer-unavailable";
  return void 0;
}
function resolveDiffuseGiTier(tier, scene, caps) {
  const raster = { renderPath: "deferred", pbr: true };
  if (tier === "low")
    return ok3(
      Object.freeze({
        tier,
        lane: "direct-ibl-ssao",
        profile: Object.freeze({ ...raster, ibl: true, ssao: true })
      })
    );
  const gap = capabilityGap(caps);
  if (gap !== void 0)
    return ok3(
      Object.freeze({
        tier,
        lane: "direct-ibl",
        profile: Object.freeze({ ...raster, ibl: true, ssao: false }),
        fallback: Object.freeze({
          reason: gap,
          hint: "Diffuse GI needs compute with storage buffers on a WebGPU-class backend; rendering direct + IBL."
        })
      })
    );
  const budget = DIFFUSE_GI_TIER_BUDGETS[tier];
  const { cardResolution, cardBudget, clipmapLevels, ...fieldBudget } = budget.field;
  const field = {
    ...fieldBudget,
    region: scene.region,
    probeSpacing: scene.probeSpacing,
    cards: {
      resolution: cardResolution,
      maxCaptureBytes: scene.maxCaptureBytes ?? 256 * 1024 * 1024,
      budget: cardBudget
    },
    ...scene.clipmapDimensions === void 0 ? {} : { clipmap: { levels: clipmapLevels, dimensions: scene.clipmapDimensions } }
  };
  const common = { maxDistance: scene.maxDistance, environment: scene.environment };
  const diffuseGi = budget.probes === void 0 ? { gather: "irradiance-field", ...common, field } : { gather: "screen-probe", ...common, field, probes: budget.probes };
  const valid = validateDiffuseGi(diffuseGi);
  if (!valid.ok) return valid;
  return ok3(
    Object.freeze({
      tier,
      lane: diffuseGi.gather,
      profile: Object.freeze({
        ...raster,
        ibl: false,
        ssao: false,
        diffuseGi: freezeDiffuseGi(diffuseGi)
      })
    })
  );
}
function parseDiffuseGiTier(value) {
  return DIFFUSE_GI_TIERS.find((tier) => tier === value);
}

// sdk/engine/node_modules/@forgeax/engine-render/src/ssr/composition.ts
import { err as err4, ok as ok4 } from "@forgeax/engine-types";
function finiteColor(value) {
  return value.length === 3 && value.every(Number.isFinite);
}
function invalid2(field, expected) {
  return err4({
    code: "ssr-composition-input-invalid",
    expected,
    hint: "preserve linear HDR and the bounded SSR confidence before composing",
    detail: Object.freeze({ field })
  });
}
function composeSsrReflection(input) {
  if (!Number.isFinite(input.c) || input.c < 0 || input.c > 1) {
    return invalid2("c", "a finite confidence in the inclusive range 0..1");
  }
  for (const [field, value] of [
    ["baseSpecular", input.baseSpecular],
    ["screenSpecular", input.screenSpecular],
    ["fallbackSpecular", input.fallbackSpecular]
  ]) {
    if (!finiteColor(value)) {
      return invalid2(field, "three finite linear HDR RGB channels");
    }
  }
  const c = input.c;
  return ok4(
    Object.freeze([
      input.baseSpecular[0] + c * (input.screenSpecular[0] - input.fallbackSpecular[0]),
      input.baseSpecular[1] + c * (input.screenSpecular[1] - input.fallbackSpecular[1]),
      input.baseSpecular[2] + c * (input.screenSpecular[2] - input.fallbackSpecular[2])
    ])
  );
}

// sdk/engine/node_modules/@forgeax/engine-render/src/transmission/oracle.ts
var clamp01 = (value) => Math.min(Math.max(value, 0), 1);
function fresnelReflectance(cosTheta, eta) {
  if (!Number.isFinite(cosTheta) || !Number.isFinite(eta) || eta <= 0) return 1;
  const cosIncident = clamp01(cosTheta);
  const sinTransmittedSquared = eta * eta * (1 - cosIncident * cosIncident);
  if (sinTransmittedSquared >= 1) return 1;
  const cosTransmitted = Math.sqrt(Math.max(0, 1 - sinTransmittedSquared));
  const perpendicularDenominator = cosIncident + eta * cosTransmitted;
  const parallelDenominator = eta * cosIncident + cosTransmitted;
  if (perpendicularDenominator === 0 || parallelDenominator === 0) return 1;
  const perpendicular = (cosIncident - eta * cosTransmitted) / perpendicularDenominator;
  const parallel = (eta * cosIncident - cosTransmitted) / parallelDenominator;
  return clamp01((perpendicular * perpendicular + parallel * parallel) / 2);
}

// sdk/engine/node_modules/@forgeax/engine-render/src/transmission/single-layer-medium.ts
var DEFAULT_MAX_DISTANCE_METERS = 1e3;
var DEFAULT_DEPTH_TOLERANCE_METERS = 1e-3;
var DEFAULT_IOR = 1.333;
var finiteOr = (value, fallback) => Number.isFinite(value) ? value : fallback;
function oneMinusExpNeg(value) {
  const x = Math.max(finiteOr(value, 0), 0);
  if (x < 1e-3) {
    const x2 = x * x;
    return x * (1 - x * 0.5 + x2 / 6 - x * x2 / 24);
  }
  return -Math.expm1(-x);
}
function singleScatterIntegral(sigmaS, sigmaT, distance) {
  const scattering = Math.max(finiteOr(sigmaS, 0), 0);
  const extinction = Math.max(finiteOr(sigmaT, 0), 0);
  const path = Math.max(finiteOr(distance, 0), 0);
  if (extinction === 0) return scattering * path;
  return scattering * oneMinusExpNeg(extinction * path) / extinction;
}
var nonNegative = (value) => Math.max(finiteOr(value, 0), 0);
var clamp012 = (value) => Math.min(Math.max(finiteOr(value, 0), 0), 1);
function vector3(input) {
  return [nonNegative(input?.[0] ?? 0), nonNegative(input?.[1] ?? 0), nonNegative(input?.[2] ?? 0)];
}
function finiteColor2(input) {
  return input !== void 0 && input.length === 3 && input.every(Number.isFinite);
}
function finiteUv(input) {
  return input.length === 2 && input.every(Number.isFinite);
}
function safeDistance(value, maxDistance) {
  return Math.min(Math.max(finiteOr(value, 0), 0), maxDistance);
}
function integrateSingleLayerMedium(input) {
  const absorption = vector3(input.coefficients.absorption);
  const scattering = vector3(input.coefficients.scattering);
  const sigmaT = [
    absorption[0] + scattering[0],
    absorption[1] + scattering[1],
    absorption[2] + scattering[2]
  ];
  const maxDistanceMeters = Math.min(
    Math.max(
      finiteOr(input.maxDistanceMeters ?? DEFAULT_MAX_DISTANCE_METERS, DEFAULT_MAX_DISTANCE_METERS),
      0
    ),
    1e5
  );
  const distanceMeters = safeDistance(input.distanceMeters, maxDistanceMeters);
  const transmittance = [
    Number.isFinite(sigmaT[0]) && sigmaT[0] > 0 ? Math.exp(-sigmaT[0] * distanceMeters) : 1,
    Number.isFinite(sigmaT[1]) && sigmaT[1] > 0 ? Math.exp(-sigmaT[1] * distanceMeters) : 1,
    Number.isFinite(sigmaT[2]) && sigmaT[2] > 0 ? Math.exp(-sigmaT[2] * distanceMeters) : 1
  ];
  const singleScatter = [
    singleScatterIntegral(scattering[0], sigmaT[0], distanceMeters),
    singleScatterIntegral(scattering[1], sigmaT[1], distanceMeters),
    singleScatterIntegral(scattering[2], sigmaT[2], distanceMeters)
  ];
  const iorCandidate = finiteOr(input.coefficients.ior, DEFAULT_IOR);
  const ior = iorCandidate >= 1 ? iorCandidate : DEFAULT_IOR;
  const reflectance = fresnelReflectance(input.cosTheta, 1 / ior);
  const transmissionWeight = 1 - reflectance;
  const phaseG = Math.min(Math.max(finiteOr(input.coefficients.phaseG ?? 0, 0), -1), 1);
  const phaseCosTheta = clamp012(input.phaseCosTheta ?? input.cosTheta);
  const phaseDenominator = Math.max(1 + phaseG * phaseG - 2 * phaseG * phaseCosTheta, 1e-6);
  const phase = (1 - phaseG * phaseG) / (4 * Math.PI * phaseDenominator ** 1.5);
  return {
    sigmaT,
    transmittance,
    singleScatter,
    reflectance,
    transmissionWeight,
    phase: finiteOr(phase, 1 / (4 * Math.PI)),
    distanceMeters
  };
}
function composeSingleLayerMediumColor(input) {
  const coverage = clamp012(input.coverage ?? 1);
  const foam = clamp012(input.foam ?? 0) * coverage;
  const foamColor = finiteColor2(input.foamColor) ? input.foamColor : [1, 1, 1];
  const background = finiteColor2(input.background) ? input.background : [0, 0, 0];
  const reflection = finiteColor2(input.reflection) ? input.reflection : [0, 0, 0];
  const medium = [
    background[0] * input.optics.transmittance[0] + input.optics.singleScatter[0],
    background[1] * input.optics.transmittance[1] + input.optics.singleScatter[1],
    background[2] * input.optics.transmittance[2] + input.optics.singleScatter[2]
  ];
  const waterWeight = input.optics.transmissionWeight * coverage * (1 - foam);
  const reflectionWeight = input.optics.reflectance * coverage;
  const foamWeight = foam;
  return [
    finiteOr(
      reflection[0] * reflectionWeight + medium[0] * waterWeight + foamColor[0] * foamWeight,
      0
    ),
    finiteOr(
      reflection[1] * reflectionWeight + medium[1] * waterWeight + foamColor[1] * foamWeight,
      0
    ),
    finiteOr(
      reflection[2] * reflectionWeight + medium[2] * waterWeight + foamColor[2] * foamWeight,
      0
    )
  ];
}
function validCandidate(candidate, maxDistance) {
  return candidate !== void 0 && finiteColor2(candidate.color) && finiteUv(candidate.uv) && Number.isFinite(candidate.depthMeters) && candidate.depthMeters >= 0 && candidate.depthMeters <= maxDistance;
}
function resolveSingleLayerMediumBackground(input) {
  const maxDistance = Math.max(finiteOr(input.maxDistanceMeters, DEFAULT_MAX_DISTANCE_METERS), 0);
  const tolerance = Math.max(
    finiteOr(
      input.depthToleranceMeters ?? DEFAULT_DEPTH_TOLERANCE_METERS,
      DEFAULT_DEPTH_TOLERANCE_METERS
    ),
    0
  );
  const surfaceDepth = finiteOr(input.surfaceDepthMeters, 0);
  if (validCandidate(input.refracted, maxDistance) && input.refracted.uv.every((coordinate) => coordinate >= 0 && coordinate <= 1)) {
    if (input.refracted.depthMeters + tolerance < surfaceDepth) {
      return {
        source: "unrefracted",
        reason: "front",
        candidate: validCandidate(input.original, maxDistance) ? input.original : void 0,
        color: validCandidate(input.original, maxDistance) ? input.original.color : [0, 0, 0],
        distanceMeters: validCandidate(input.original, maxDistance) ? Math.max(input.original.depthMeters - surfaceDepth, 0) : 0
      };
    }
    return {
      source: "refracted",
      candidate: input.refracted,
      color: input.refracted.color,
      distanceMeters: Math.max(input.refracted.depthMeters - surfaceDepth, 0)
    };
  }
  if (validCandidate(input.original, maxDistance)) {
    const reason = input.refracted === void 0 ? "shore" : finiteUv(input.refracted.uv) && input.refracted.uv.some((coordinate) => coordinate < 0 || coordinate > 1) ? "edge" : "shore";
    return {
      source: "unrefracted",
      reason,
      candidate: input.original,
      color: input.original.color,
      distanceMeters: Math.max(input.original.depthMeters - surfaceDepth, 0)
    };
  }
  if (finiteColor2(input.environment)) {
    return {
      source: "environment",
      reason: "sky-miss",
      candidate: void 0,
      color: input.environment,
      distanceMeters: maxDistance
    };
  }
  return {
    source: "environment",
    reason: "sky-miss",
    candidate: void 0,
    color: [0, 0, 0],
    distanceMeters: maxDistance
  };
}
function estimateSingleLayerPathLength(input) {
  const maxDistance = Math.max(finiteOr(input.maxDistanceMeters, DEFAULT_MAX_DISTANCE_METERS), 0);
  if (input.surfacePosition.length !== 3 || input.backgroundPosition === void 0 || input.backgroundPosition.length !== 3 || !input.surfacePosition.every(Number.isFinite) || !input.backgroundPosition.every(Number.isFinite)) {
    return { distanceMeters: maxDistance, valid: false };
  }
  const distance = Math.hypot(
    (input.backgroundPosition[0] ?? 0) - (input.surfacePosition[0] ?? 0),
    (input.backgroundPosition[1] ?? 0) - (input.surfacePosition[1] ?? 0),
    (input.backgroundPosition[2] ?? 0) - (input.surfacePosition[2] ?? 0)
  );
  return {
    distanceMeters: Math.min(Math.max(finiteOr(distance, maxDistance), 0), maxDistance),
    valid: Number.isFinite(distance)
  };
}
export {
  AMBIENT_OCCLUSION_ALGORITHMS,
  AMBIENT_OCCLUSION_GTAO,
  AMBIENT_OCCLUSION_QUALITIES,
  AMBIENT_OCCLUSION_SSAO,
  ANTIALIAS_FXAA,
  ANTIALIAS_MSAA,
  ANTIALIAS_NONE,
  ANTIALIAS_SMAA,
  ANTIALIAS_TAA,
  AmbientOcclusion,
  Atmosphere,
  AtmosphereInvalidParameterError,
  AutoExposureCapabilityUnavailableError,
  AutoExposureInvalidParameterError,
  AutoExposureStageFailedError,
  AutoExposureStaleGenerationError,
  BARREL_DISTORTION_FEATURE_IDENTITY,
  BARREL_DISTORTION_POST_PROCESS_ID,
  BARREL_DISTORTION_WGSL,
  BARREL_DISTORTION_WGSL_COORDINATE,
  BLOOM_DISABLED,
  BLOOM_ENABLED,
  BarrelDistortion,
  BarrelDistortionInvalidParameterError,
  CAMERA_BLOOM_INTENSITY_MAX,
  CAMERA_BLOOM_INTENSITY_MIN,
  CAMERA_BLOOM_RADIUS_MAX,
  CAMERA_BLOOM_RADIUS_MIN,
  CAMERA_BLOOM_SMOOTH_WIDTH_MAX,
  CAMERA_BLOOM_SMOOTH_WIDTH_MIN,
  CAMERA_BLOOM_THRESHOLD_MAX,
  CAMERA_BLOOM_THRESHOLD_MIN,
  CAMERA_EXPOSURE_MODE_AUTO,
  CAMERA_EXPOSURE_MODE_MANUAL,
  CAMERA_PROJECTION_ORTHOGRAPHIC,
  CAMERA_PROJECTION_PERSPECTIVE,
  CAMERA_TEMPERATURE_MAX,
  CAMERA_TEMPERATURE_MIN,
  CAMERA_TINT_MAX,
  CAMERA_TINT_MIN,
  CLOUD_DENSITY_COMPUTE_WGSL,
  CLOUD_HISTORY_FULLSCREEN_WGSL,
  CLOUD_HISTORY_SURFACE_COUNT,
  CLOUD_LAYER_FEATURE_IDENTITY,
  CLOUD_QUALITY_PROFILES,
  CLOUD_RGBA16FLOAT_BYTES_PER_TEXEL,
  CLOUD_VIEW_FULLSCREEN_WGSL,
  CLOUD_VIEW_PARAMS_BYTES,
  CUBE_CAMERA_FACE_ORDER,
  CUBE_CAMERA_UPDATE_CONTINUOUS,
  CUBE_CAMERA_UPDATE_ONCE,
  CUBE_CAMERA_UPDATE_ON_DEMAND,
  Camera,
  CameraError,
  CameraView,
  CameraViewInvalidError,
  CanvasTexture,
  CapsuleShadow,
  ClippingContractError,
  ClippingPlanes,
  CloudHistoryStore,
  CloudLayer,
  CloudLayerCacheInvalidError,
  CloudLayerCapabilityMissingError,
  CloudLayerInvalidParameterError,
  CloudLayerOwnerConflictError,
  CloudLayerResourceFailureError,
  CloudQualityValue,
  CubeCamera,
  DEFAULT_CLOUD_LAYER,
  DEFAULT_DEPTH_OF_FIELD_PARAMS,
  DEFAULT_MOTION_BLUR_PARAMS,
  DEFAULT_REFLECTION_PROBE_LIMITS,
  DEFAULT_STANDARD_PROFILE,
  DEPTH_OF_FIELD_PARAMS_BYTE_SIZE,
  DIFFUSE_GI_TIERS,
  DIFFUSE_GI_TIER_BUDGETS,
  DepthOfField,
  DepthOfFieldQualityValue,
  DepthOfFieldSideValue,
  DepthOfFieldValidationError,
  DirectionalLight,
  DirectionalShadowFilterValue,
  DynamicGeometryError,
  DynamicInputError,
  DynamicResolution,
  DynamicResolutionInvalidParameterError,
  DynamicResolutionRequiresTaaError,
  DynamicResolutionTimingUnavailableError,
  EnvironmentGenerationFailedError,
  EnvironmentSourceConflictError,
  ExternalTextureInvalidError,
  ExternalTextureStateInvalidError,
  Fog,
  FogCardinalityError,
  GpuDrivenPreparationError,
  IRRADIANCE_VOLUME_KIND,
  InstanceTransformsError,
  Instances,
  LENS_FLARE_GHOST_COUNT,
  LIGHTING_CHANNELS_DEFAULT,
  LOD_OCCLUSION_INSPECTION_MAX_BYTES,
  LOD_OCCLUSION_INSPECTION_SCHEMA,
  Layer,
  LensEffects,
  LensEffectsInvalidParameterError,
  LensFlare,
  LensFlareInvalidParameterError,
  LightProbe,
  LineCapValue,
  LineWidthUnitsValue,
  Lines,
  MAX_CLIPPING_PLANES,
  MAX_VOLUMETRIC_FOG_OWNERS,
  MaterialAuthoringContractError,
  MaterialResource,
  MaterialSampledTextureBudgetExceededError,
  MaterialTransmissionContractError,
  Materials,
  MeshFilter,
  MeshRenderer,
  MeshResidencyError,
  MotionBlur,
  MotionBlurValidationError,
  OIT_ACCUMULATE_PASS,
  OIT_COMPOSITE_PASS,
  OIT_INELIGIBLE_REASONS,
  OUTPUT_COLOR_SPACES,
  OUTPUT_GAMUT_CODE,
  Outline,
  OutlineInvalidParameterError,
  OutlineOcclusionValue,
  OwnerStageFailedError,
  PlanarReflection,
  PlanarReflectionInvalidError,
  PointLight,
  PointLightShadow,
  PointShapeValue,
  Points,
  PostProcessParams,
  ProjectedDecal,
  ProjectedDecalInvalidError,
  REFLECTION_PROBE_IBL_STAGES,
  REFLECTION_PROBE_UPDATE_CONTINUOUS,
  REFLECTION_PROBE_UPDATE_ONCE,
  REFLECTION_PROBE_UPDATE_ON_CHANGE,
  RENDER_PHASE_CATALOG,
  ReadonlyDynamicInputPage,
  RectAreaLight,
  ReflectionProbe,
  ReflectionProbeProjection,
  RenderPublicationError,
  RenderPublicationTargetOwner,
  RendererOperationError,
  SCENE_DATA_TEMPORAL_V1_DESCRIPTOR,
  SCENE_DATA_TEMPORAL_V1_SCHEMA,
  SHADOW_ATLAS_DEFAULT_FACE_SIZE,
  SHADOW_ATLAS_DEFAULT_LAYERS,
  SINGLE_LAYER_MEDIUM_SURFACE_EXAMPLE,
  SINGLE_LAYER_MEDIUM_SURFACE_EXAMPLES,
  SKYBOX_MODE_CUBEMAP,
  SSR_FORMAT_PROFILE,
  SSR_FORMAT_STAGES,
  SceneDataUnavailableError,
  SceneInstance,
  SceneSdfUnavailableError,
  ScreenSpaceReflection,
  ShadowAtlas,
  ShadowParticipation,
  SkyboxBackground,
  Skylight,
  SortKey,
  SpotLight,
  StereoCamera,
  StereoCameraInvalidError,
  StereoLayoutValue,
  SunCardinalityError,
  TONEMAP_ACES_FILMIC,
  TONEMAP_AGX,
  TONEMAP_CINEON,
  TONEMAP_LINEAR,
  TONEMAP_NEUTRAL,
  TONEMAP_NONE,
  TONEMAP_REINHARD,
  TONEMAP_REINHARD_EXTENDED,
  TRANSPARENCY_SORTED,
  TRANSPARENCY_WEIGHTED_BLENDED,
  TaaCapsInsufficientError,
  Visibility,
  VisibilityStateValue,
  VolumetricFog,
  VolumetricFogSamplingValue,
  WEBGPU_MIN_SAMPLED_TEXTURES_PER_SHADER_STAGE,
  acceptCloudLayerGeneration,
  admitPointsLines,
  admitReflectionProbe,
  admitSingleLayerMediumSubmission,
  admitSsrM0,
  admitSsrSpatial,
  advanceProbeFilter,
  ambientOcclusionParameters,
  appliedOutputColorSpace,
  applyCloudSolarTransmittance,
  attachBarrelDistortionCameraFrame,
  bakeFingerprint,
  beginProbeIblUpdate,
  boxProjectReflectionDirection,
  buildCloudDensityCache,
  buildCubeCameraFaceViews,
  buildPlanarReflectionView,
  buildReflectionProbeTable,
  cameraExposureFromColumns,
  cameraProjectionFromF32,
  classifyOitDraw,
  clippingPlanesData,
  cloudCapabilitiesFromRhi,
  cloudLayerSourceKey,
  cloudQualityFromF32,
  cloudTemporalResetReasons,
  cloudTemporalSignature,
  commitProbeFilterStep,
  composeSingleLayerMediumColor,
  composeSsrReflection,
  compositeCloudRadiance,
  computeInvRangeSquared,
  createAsyncDynamicGeometryHost,
  createAutoExposureError,
  createAutoExposureInspection,
  createBarrelDistortionMapping,
  createBarrelDistortionRenderFeature,
  createCloudHistory,
  createCloudLayerFeature,
  createCloudShadowProjection,
  createDynamicGeometryLifecycle,
  createIblKernelCache,
  createProbeFilterState,
  createProbeIblOutput,
  createRenderPublisher,
  createSceneDataCatalog,
  cubeCameraUpdateIntentFromF32,
  cubeCameraUpdateIntentToF32,
  degToCos,
  depthOfFieldQualityCode,
  depthOfFieldQualityFromF32,
  depthOfFieldRequestFailure,
  depthOfFieldSideCode,
  depthOfFieldSideFromF32,
  depthOfFieldTapCount,
  directionalShadowQualityFromF32,
  displayP3,
  effectiveMotionBlurSampleCount,
  estimateReflectionProbeBytes,
  estimateSingleLayerPathLength,
  evaluateCloudDensity,
  extractCloudLayer,
  extractVolumetricFog,
  freezeBarrelDistortionMapping,
  getActiveCamera,
  glyphTextGeometry,
  hasVolumetricFogCapability,
  inspectCloudLayer,
  inspectCloudLayerResources,
  inspectLodOcclusion,
  inspectPointShadow,
  inspectReflectionFallback,
  inspectVolumetricFog,
  integrateCloudCameraPath,
  integrateCloudInterior,
  integrateCloudPath,
  integrateCloudSolarColumn,
  integrateSingleLayerMedium,
  intersectCloudLayer,
  irradianceVolumeContribution,
  irradianceVolumeKind,
  isExternalTextureSource,
  isMotionBlurIntervalValid,
  isOutputColorSpace,
  lineCapFromU32,
  lineWidthUnitsFromU32,
  mapDisplayToScene,
  mapDisplayUvToSceneUv,
  mapSceneToDisplay,
  mapSceneUvToDisplayUv,
  materialContribution,
  materialSampledTextureBudget,
  motionBlurExposureScale,
  motionBlurSampleDelta,
  motionBlurTemporalDemand,
  normalizeClippingPlanes,
  orthographic,
  packDepthOfFieldParams,
  parseDiffuseGiTier,
  perspective,
  pointShapeFromU32,
  probeFilterIsSteady,
  projectCloudShadowUv,
  projectMeshMaterialBindingObservation,
  projectSsrDependencies,
  projectSsrSpatialInspection,
  publishProbeIblOutput,
  querySubmittedTerrainHeight,
  reconstructCloudDensityCache,
  reflectionProbeTableBytes,
  reflectionProbeUpdateIntentFromF32,
  reflectionProbeUpdateIntentToF32,
  renderComponentsPlugin,
  renderPipelineContribution,
  renderPublicationAssetTransfers,
  renderPublicationTransfers,
  renderTargetLayerCount,
  reprojectCloudHistory,
  resetIblKernelCaches,
  resolveBakeData,
  resolveDepthOfFieldParams,
  resolveDiffuseGiTier,
  resolveIntegratedVolumeConsumer,
  resolveLensEffects,
  resolveLensFlare,
  resolveMotionBlurParams,
  resolveOutline,
  resolvePunctualShadowFarPlane,
  resolveSelectedVolumetricLight,
  resolveSingleLayerMediumBackground,
  resolveSsrAdmissionGeneration,
  resolveVisibility,
  resolveVisibleSurface,
  resolveVolumetricFogLightPair,
  retainCloudLayerAfterFailure,
  sampleCloudDensity,
  sampleCloudShadow,
  samplerContribution,
  selectCloudLayerFrame,
  selectReflectionProbe,
  serializeLodOcclusionInspection,
  serializeSsrSpatialInspection,
  setActiveCamera,
  signedDepthOfFieldCoC,
  snapshotCloudDensityCache,
  srgb,
  stereoLayoutFromU32,
  summarizeMeshMaterialBindings,
  tilemapGeometry,
  validateBarrelDistortionParameters,
  validateCameraBloom,
  validateCameraColorGrading,
  validateCameraExposure,
  validateCloudLayer,
  validateDepthOfFieldFrameParams,
  validateDepthOfFieldParams,
  validateDirection,
  validateDirectionalLightData,
  validateDynamicGeometryMeshBudget,
  validateDynamicResolutionCamera,
  validateDynamicResolutionParameters,
  validateIrradianceVolume,
  validateLightProbeData,
  validateMotionBlurParams,
  validatePointLightData,
  validatePointLightShadowData,
  validateRectAreaLightData,
  validateReflectionProbeInput,
  validateRenderProfile,
  validateScreenSpaceReflection,
  validateSpotLightData,
  validateVolumetricFog,
  visibilityStateFromU32,
  withClipping,
  zeroSsrAdmissionWork
};
//# sourceMappingURL=index.mjs.map
