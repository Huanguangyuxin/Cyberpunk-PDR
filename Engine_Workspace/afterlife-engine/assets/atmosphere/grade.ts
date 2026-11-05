/**
 * Camera-owned output grade for the V5 bar (Engine 0.4.18 Camera schema).
 *
 * - `exposure` + `exposureMode` are the real Camera SoA columns; mode 0 is
 *   CAMERA_EXPOSURE_MODE_MANUAL, where `exposure` is a positive linear multiplier
 *   applied before the Reinhard-extended tonemap (`tonemap: 1`).
 * - Bloom fields are bounded by the Camera contract: intensity [0, 8],
 *   threshold [0, 65504] scene-linear luminance, smoothWidth [0, 1], radius [0, 1].
 *
 * V4 used exposure 1, bloom .24 / threshold .9 / radius .62 with smoothWidth .01.
 * Lower exposure keeps dark materials from lifting; a higher threshold and smaller
 * radius leave only neon cores and practicals to bloom.
 */
export const CAMERA_GRADE = {
  exposureMode: 0,
  exposure: 0.68,
  whitePoint: 4,
  bloomIntensity: 0.11,
  bloomThreshold: 1.6,
  bloomSmoothWidth: 0.4,
  bloomRadius: 0.22,
} as const;

/** V4 values retained for regression comparison in tests. */
export const V4_GRADE = { exposure: 1, bloomIntensity: 0.24, bloomThreshold: 0.9, bloomRadius: 0.62 } as const;

/** Local media scattering colour; lower than V4 (.88/.91/.96) so the fog no longer greys out silhouettes. */
export const FOG_ALBEDO: [number, number, number] = [0.62, 0.66, 0.74];
export const FOG_EMISSION: [number, number, number] = [0.00003, 0.00005, 0.0001];
