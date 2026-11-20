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

  // Installed floor stack, bottom to top: board core, recessed joint filler,
  // eggshell coating, exposed abrasion, traffic polish, grime, water film.
  let dryR = clamp(material.roughness * pdrChannel(orm, u32(material.roughnessChannel)), 0.04, 1.0);
  let topFace = smoothstep(0.70, 0.98, normalize(input.vertexNormalWS).y);
  let installed = material.wearStrength * topFace;
  let metres = input.uv1 * vec2<f32>(29.0,45.0);
  let board = metres / vec2<f32>(0.60,0.90);
  let grid = vec2<f32>(board.x + 0.5 * (floor(board.y) - 2.0 * floor(board.y * 0.5)),board.y);
  let fraction = fract(grid);
  let fromEdge = min(fraction,1.0-fraction) * vec2<f32>(0.60,0.90);
  let edge = min(fromEdge.x,fromEdge.y);
  let joint = installed * (1.0-smoothstep(0.001,0.0028,edge));
  let boardField = installed * (1.0-joint);
  let coat = boardField * (0.34 + 0.48*smoothstep(0.22,0.81,wetField.g));
  let scuff = boardField * (1.0-smoothstep(0.003,0.015,edge)) *
    smoothstep(0.45,0.76,wetField.g + (normal.r-0.5)*1.5);
  let polish = boardField * wetField.a * smoothstep(0.18,0.72,wetField.g);
  let residue = boardField * smoothstep(0.54,0.83,wetField.g) * (1.0-wetField.a*0.75);
  var boardColor = material.baseColor.rgb * color.rgb * input.vertexColor.rgb;
  boardColor = mix(boardColor,min(boardColor*0.56, vec3<f32>(0.011)),joint);
  boardColor = mix(boardColor,boardColor*vec3<f32>(0.83,0.88,0.95),coat);
  boardColor = mix(boardColor,boardColor*vec3<f32>(1.38,1.28,1.19) + vec3<f32>(0.002),scuff*0.6);
  boardColor *= 1.0-residue*0.25;
  var response = mix(dryR,0.84,joint);
  response = mix(response,clamp(dryR*0.86,0.24,0.63),coat);
  response = mix(response,max(response,0.41),scuff*0.65);
  response = mix(response,max(0.13,response*0.52),polish);
  response = mix(response,max(response,0.60),residue*0.78);
  let mortar = smoothstep(material.groutProtectStart, material.groutProtectEnd, dryR);
  let w = clamp(pdrChannel(wetField,u32(material.wetMaskChannel))*material.wetStrength,0.0,1.0) *
    (1.0-mortar) * topFace * (1.0-joint);
  let wetR = mix(material.wetRoughnessMin,material.wetRoughnessMax,wetField.g);
  let roughness = mix(response,wetR,w);

  let nativeNormal = applyTBN(input.vertexNormalWS, input.tangentWS,
    scaleTangentSpaceNormal(decodeTangentSpaceNormalRg(normal.rg), material.normalScale));
  // The film generator encodes world X/Z slopes in RG, not UV0 tangent axes.
  // Both normal maps decode through the same public native helper.
  let filmN = normalize(scaleTangentSpaceNormal(decodeTangentSpaceNormalRg(film.rg), material.filmNormalScale));
  let filmWorldNormal = vec3<f32>(filmN.x, filmN.z, filmN.y);
  let faceDirection = select(-1.0, 1.0, input.frontFacing);
  let normalWS = normalize(mix(nativeNormal, filmWorldNormal, w)) * faceDirection;
  let occlusion = clamp(1.0 + (ao.r - 1.0) * material.occlusionStrength, 0.0, 1.0);
  return SurfaceData(boardColor,
    normalWS, 0.0, roughness, vec3<f32>(0.0), occlusion, 1.0, 0.0, 0.0);
}
