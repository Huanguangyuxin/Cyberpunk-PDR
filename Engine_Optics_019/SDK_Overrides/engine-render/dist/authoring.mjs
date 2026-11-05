import {
  createFullscreenRenderFeature
} from "./chunk-XZHQWBNV.mjs";
import {
  buildStandard
} from "./chunk-Q2KXQNQT.mjs";
import "./chunk-BYYRQEH4.mjs";
import "./chunk-TI3O7TOU.mjs";
import {
  GlyphText
} from "./chunk-MVY4ZZCX.mjs";
import "./chunk-COM64KIQ.mjs";
import {
  DEFAULT_STANDARD_PROFILE,
  SPRITE_PREMULTIPLIED_ALPHA_BLEND,
  addObservationCapturePass,
  addTypedOutputTransformPass,
  addTypedScenePass,
  createRenderPipelineTarget,
  importRenderPipelineSurface
} from "./chunk-JWVQREUV.mjs";
import {
  SpriteAnimation,
  SpriteInstances,
  SpritePlayback,
  SpriteRegionOverride,
  Tilemap,
  TilemapSort,
  TransparentSort,
  setActiveCamera,
  spritePlaybackModeFromU32
} from "./chunk-XAU6MWMX.mjs";

// sdk/engine/node_modules/@forgeax/engine-render/src/pipeline/standard-forward-output.ts
function createStandardForwardPipeline(output) {
  return {
    build(context, topology) {
      return buildStandard(
        { ...context, forwardOutput: output },
        {
          ...topology,
          standardProfile: {
            ...topology.standardProfile ?? DEFAULT_STANDARD_PROFILE,
            renderPath: "forward"
          }
        }
      );
    }
  };
}
export {
  GlyphText,
  SPRITE_PREMULTIPLIED_ALPHA_BLEND,
  SpriteAnimation,
  SpriteInstances,
  SpritePlayback,
  SpriteRegionOverride,
  Tilemap,
  TilemapSort,
  TransparentSort,
  addObservationCapturePass,
  addTypedOutputTransformPass,
  addTypedScenePass,
  createFullscreenRenderFeature,
  createRenderPipelineTarget,
  createStandardForwardPipeline,
  importRenderPipelineSurface,
  setActiveCamera,
  spritePlaybackModeFromU32
};
//# sourceMappingURL=authoring.mjs.map
