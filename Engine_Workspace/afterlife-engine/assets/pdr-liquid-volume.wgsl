#define_import_path cyberpunk_pdr::drink_liquid_volume
#import forgeax_material::parameters::{material}
#import forgeax_material::single_layer_medium_surface_v1::{SingleLayerMediumSurfaceInput, SingleLayerMediumSurfaceData}

// The native medium model owns paired scene color/depth, Beer-Lambert
// integration and the single Fresnel energy split. No hand-drawn reflection,
// output color, scattering veil or emissive liquid is authored here.
fn evaluate_surface(input: SingleLayerMediumSurfaceInput) -> SingleLayerMediumSurfaceData {
  let n = normalize(input.geometricNormalWS);
  let v = normalize(input.viewDirectionWS);
  let ior = max(material.liquidIor, 1.0001);
  let radius = max(material.radius, 0.001);
  let radial = clamp(length(input.positionOS.xz) / radius, 0.0, 1.0);
  let lower = material.bottom + material.bowlShape *
    (material.top - material.bottom) * 0.97 * radial * radial;
  let ray = refract(-v, n, 1.0 / ior);
  // Existing venue drink transforms are metres and Y-up with Y-only rotation.
  // Thus the world ray Y is also local vertical. This is a bounded column /
  // finite chord approximation, not a closed-mesh ray tracer or multilayer path.
  let downDistance = max(input.positionOS.y - lower, 0.001);
  let upDistance = max(material.top - input.positionOS.y, 0.001);
  let capDistance = select(downDistance, upDistance, ray.y > 0.0) / max(abs(ray.y), 0.05);
  let noV = clamp(abs(dot(n, v)), 0.0, 1.0);
  let cosInside = sqrt(1.0 - (1.0 - noV * noV) / (ior * ior));
  let chord = 2.0 * radius * cosInside;
  let path = select(min(chord, capDistance), capDistance, n.y > 0.6);
  return SingleLayerMediumSurfaceData(n, 0.05, 1.0, 0.0,
    material.absorption, vec3<f32>(0.0), ior, 0.0, clamp(path, 0.001, 0.35));
}
