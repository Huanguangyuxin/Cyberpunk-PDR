#define_import_path cyberpunk_pdr::drink_liquid_surface
#import forgeax_material::surface_v1::{SurfaceInput, SurfaceData}

fn evaluate_surface(input: SurfaceInput) -> SurfaceData {
  let outward = normalize(input.vertexNormalWS);
  let v = normalize(input.viewDirectionWS);
  // All drink views are outside the liquid. Establish that interface explicitly;
  // the native Standard path still owns IOR, Fresnel, lighting and transmission.
  let normal = select(-outward, outward, dot(outward, v) >= 0.0);
  return SurfaceData(vec3<f32>(1.0), normal, 0.0, 0.025,
    vec3<f32>(0.0), 1.0, 1.0, 0.0);
}
