#define_import_path cyberpunk_pdr::drink_reflective_shell
#import forgeax_material::surface_v1::{SurfaceInput, SurfaceData}

// Thin, non-refracting container interface. Standard owns direct lights,
// GGX/IBL reflections and fog; the inner closed liquid owns transmission.
// Blend ONE / ONE_MINUS_SRC_ALPHA: keep already Fresnel-weighted specular
// radiance, attenuate the backdrop by the interface reflectance only.
fn evaluate_surface(input : SurfaceInput) -> SurfaceData {
  let n = normalize(input.vertexNormalWS);
  let v = normalize(input.viewDirectionWS);
  let noV = clamp(abs(dot(n, v)), 0.0, 1.0);
  let f0 = 0.04; // air/glass IOR1.5, matching the native Standard parameter.
  let reflectance = f0 + (1.0 - f0) * pow(1.0 - noV, 5.0);
  return SurfaceData(vec3<f32>(0.0), n, 0.0, 0.025,
    vec3<f32>(0.0), 1.0, reflectance, 0.0);
}
