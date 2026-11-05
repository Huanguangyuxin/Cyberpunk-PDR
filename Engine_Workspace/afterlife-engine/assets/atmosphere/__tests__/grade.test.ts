import { expect, it } from 'vitest';
import { CAMERA_GRADE, FOG_ALBEDO, V4_GRADE } from '../grade';
import zones from '../fog-zones.json';

it('lowers exposure and Bloom within the Camera contract', () => {
  expect(CAMERA_GRADE.exposureMode).toBe(0); // CAMERA_EXPOSURE_MODE_MANUAL
  expect(CAMERA_GRADE.exposure).toBeGreaterThan(0.5);
  expect(CAMERA_GRADE.exposure).toBeLessThan(V4_GRADE.exposure);
  expect(CAMERA_GRADE.bloomIntensity).toBeLessThan(V4_GRADE.bloomIntensity * 0.6);
  expect(CAMERA_GRADE.bloomThreshold).toBeGreaterThan(V4_GRADE.bloomThreshold);
  expect(CAMERA_GRADE.bloomRadius).toBeLessThan(V4_GRADE.bloomRadius * 0.5);
  for (const [v, max] of [[CAMERA_GRADE.bloomIntensity, 8], [CAMERA_GRADE.bloomSmoothWidth, 1], [CAMERA_GRADE.bloomRadius, 1]] as const) {
    expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(max);
  }
});

it('keeps local fog thin enough not to wash out material detail', () => {
  const v4 = { 'V4 Stage': .022, 'V4 Dance': .016, 'V4 Bar': .009, 'V4 Upper': .012 } as Record<string, number>;
  for (const z of zones) {
    expect(z.extinction).toBeLessThan(v4[z.name] * 0.4);
    // Visibility across the zone stays high: transmittance over 20 m above 85 % (bar) / 85 % (stage).
    expect(Math.exp(-z.extinction * 20)).toBeGreaterThan(0.85);
  }
  expect(Math.max(...FOG_ALBEDO)).toBeLessThan(0.88);
});
