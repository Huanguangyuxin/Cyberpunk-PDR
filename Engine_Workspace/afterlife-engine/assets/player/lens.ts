/**
 * First-person lens. Engine `Camera.fov` is the VERTICAL field of view in radians.
 * V4/V5 wrote 84° vertical, which is ~116° horizontal at 16:9: a strong wide-angle that
 * shrinks everything near the screen centre (~1.8× smaller than an 84°-horizontal lens)
 * and made adult-scale furniture read as toy-sized. Keep the intended 84° horizontally.
 */
export const HORIZONTAL_FOV_DEG = 84;
export const MIN_VERTICAL_FOV_DEG = 45;
export const MAX_VERTICAL_FOV_DEG = 75;
/** Eye height above the floor: capsule (r .28, half-height .57) centre .85 + camera offset .73 ≈ 1.6 m (incl. .02 skin). */
export const EYE_OFFSET = 0.73;

export function verticalFovForHorizontal(horizontalDeg: number, aspect: number): number {
  const a = Number.isFinite(aspect) && aspect > 0 ? aspect : 16 / 9;
  const v = 2 * Math.atan(Math.tan(horizontalDeg * Math.PI / 360) / a);
  const lo = MIN_VERTICAL_FOV_DEG * Math.PI / 180, hi = MAX_VERTICAL_FOV_DEG * Math.PI / 180;
  return Math.min(hi, Math.max(lo, v));
}

/** Apparent size of a centred object relative to a reference lens (same aspect). */
export function centreMagnification(verticalFovRad: number, referenceVerticalFovRad: number): number {
  return Math.tan(referenceVerticalFovRad / 2) / Math.tan(verticalFovRad / 2);
}
