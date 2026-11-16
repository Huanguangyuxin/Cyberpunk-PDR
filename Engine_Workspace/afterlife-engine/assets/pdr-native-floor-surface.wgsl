#define_import_path cyberpunk_pdr::native_tile_wet_surface_d112
#import forgeax_material::surface_v1::{SurfaceInput, SurfaceData}
#import forgeax_material::parameters::{material, baseColorTexture, baseColorTexture_sampler, metallicRoughnessTexture, metallicRoughnessTexture_sampler, normalTexture, normalTexture_sampler, occlusionTexture, occlusionTexture_sampler, wetMaskTexture, wetMaskTexture_sampler, filmNormalTexture, filmNormalTexture_sampler}
#import forgeax_material::texture_coordinates::{materialUvLinear}
#import forgeax_material::surface_sampling::{sampleSurfaceTexture, surfaceTextureFootprint}
#import forgeax_pbr::tbn::{decodeTangentSpaceNormalRg, scaleTangentSpaceNormal, applyTBN}

// Root parameters own all bindings. This module supplies base facts only;
// Standard owns its vertex, PBR lighting, G-buffer, shadows, SSR and fog passes.
fn pdrSample(tex: texture_2d<f32>, smp: sampler, input: SurfaceInput,
    transform: vec4<f32>, metadata: vec4<f32>, rotation: vec4<f32>) -> vec4<f32> {
  var uv = input.uv0;
  if (metadata.x >= 1.0) { uv = input.uv1; }
  if (metadata.x >= 2.0) { uv = input.uv2; }
  if (metadata.x >= 3.0) { uv = input.uv3; }
  if (metadata.x >= 4.0) { uv = input.uv4; }
  if (metadata.x >= 5.0) { uv = input.uv5; }
  if (metadata.x >= 6.0) { uv = input.uv6; }
  if (metadata.x >= 7.0) { uv = input.uv7; }
  let slotUv = (materialUvLinear(uv, transform, rotation) + transform.xy) * metadata.zw;
  return sampleSurfaceTexture(tex, smp, slotUv, surfaceTextureFootprint(input, transform, metadata));
}

fn pdrChannel(value: vec4<f32>, index: u32) -> f32 {
  switch index {
    case 0u: { return value.r; }
    case 1u: { return value.g; }
    case 2u: { return value.b; }
    default: { return value.a; }
  }
}

fn evaluate_surface(input: SurfaceInput) -> SurfaceData {
  // Four native UV0 samples: no CPU resampling of the 2.4m tile into world maps.
  let color = pdrSample(baseColorTexture, baseColorTexture_sampler, input,
    material.baseColorTextureCoordinatesTransform, material.baseColorTextureCoordinatesMetadata,
    material.baseColorTextureCoordinatesRotation);
  let orm = pdrSample(metallicRoughnessTexture, metallicRoughnessTexture_sampler, input,
    material.metallicRoughnessTextureCoordinatesTransform, material.metallicRoughnessTextureCoordinatesMetadata,
    material.metallicRoughnessTextureCoordinatesRotation);
  let normal = pdrSample(normalTexture, normalTexture_sampler, input,
    material.normalTextureCoordinatesTransform, material.normalTextureCoordinatesMetadata,
    material.normalTextureCoordinatesRotation);
  let ao = pdrSample(occlusionTexture, occlusionTexture_sampler, input,
    material.occlusionTextureCoordinatesTransform, material.occlusionTextureCoordinatesMetadata,
    material.occlusionTextureCoordinatesRotation);

  // Two low-frequency UV1 samples only. R is the existing spatial wetness;
  // G stores the existing 0..1 roughness modulation noise (not preblended ORM).
  let wetField = pdrSample(wetMaskTexture, wetMaskTexture_sampler, input,
    material.wetMaskTextureCoordinatesTransform, material.wetMaskTextureCoordinatesMetadata,
    material.wetMaskTextureCoordinatesRotation);
  let film = pdrSample(filmNormalTexture, filmNormalTexture_sampler, input,
    material.filmNormalTextureCoordinatesTransform, material.filmNormalTextureCoordinatesMetadata,
    material.filmNormalTextureCoordinatesRotation);

  let dryR = clamp(material.roughness * pdrChannel(orm, u32(material.roughnessChannel)), 0.04, 1.0);
  let mortar = smoothstep(material.groutProtectStart, material.groutProtectEnd, dryR);
  // All coarse mortar (including source roughness .84..90) remains exactly dry.
  // Ground assemblies contain side faces: a world-up film must not shade them.
  let topFace = smoothstep(0.70, 0.98, normalize(input.vertexNormalWS).y);
  let wetAmount = pdrChannel(wetField, u32(material.wetMaskChannel));
  let w = clamp(wetAmount * material.wetStrength, 0.0, 1.0) * (1.0 - mortar) * topFace;
  let wetR = mix(material.wetRoughnessMin, material.wetRoughnessMax, clamp(wetField.g, 0.0, 1.0));
  let roughness = mix(dryR, wetR, w);

  let nativeNormal = applyTBN(input.vertexNormalWS, input.tangentWS,
    scaleTangentSpaceNormal(decodeTangentSpaceNormalRg(normal.rg), material.normalScale));
  // The film generator encodes world X/Z slopes in RG, not UV0 tangent axes.
  // Both normal maps decode through the same public native helper.
  let filmN = normalize(scaleTangentSpaceNormal(decodeTangentSpaceNormalRg(film.rg), material.filmNormalScale));
  let filmWorldNormal = vec3<f32>(filmN.x, filmN.z, filmN.y);
  let faceDirection = select(-1.0, 1.0, input.frontFacing);
  let normalWS = normalize(mix(nativeNormal, filmWorldNormal, w)) * faceDirection;
  let occlusion = clamp(1.0 + (ao.r - 1.0) * material.occlusionStrength, 0.0, 1.0);
  return SurfaceData(material.baseColor.rgb * color.rgb * input.vertexColor.rgb,
    normalWS, 0.0, roughness, vec3<f32>(0.0), occlusion, 1.0, 0.0, 0.0);
}
