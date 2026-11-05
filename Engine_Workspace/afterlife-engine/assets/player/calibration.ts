/**
 * Runtime scale calibration for the first-person view (V7).
 *
 * Off by default. `KeyC` toggles a 1 m banded ruler and a 1.75 m adult silhouette next to the
 * calibration four-top (social group R4a); while it is on, `Digit1` / `Digit2` place the player
 * 1 m / 2 m in front of that table's near edge at standing eye height, facing it. The
 * `afterlife.calibration` game read reports the live Camera lens, canvas aspect, eye height and
 * the world scale of the imported scene, so measured values replace assumptions.
 *
 * Coordinates: Blender (x, y, z) -> Engine (x, z, -y).
 */
export const CALIBRATION_TABLE = {
  /** R4a centre, Engine x / z. */
  x: -0.9, z: 8.4,
  /** Engine z of the near (Blender south) long edge: 0.95 m deep table. */
  nearEdgeZ: 8.875,
  top: 0.75,
} as const;

/** Ground floor collider top (Floor_Main half-height .006 x 2). */
export const GROUND_TOP = 0.012;
/** Capsule centre above the floor: radius .28 + half-height .57 + controller offset .02. */
export const CAPSULE_CENTRE_ABOVE_FLOOR = 0.87;

export interface Box { readonly name: string; readonly center: [number, number, number]; readonly size: [number, number, number]; readonly band: 0 | 1 }

/** Ten 100 mm bands of a 1 m pole beside the table's near-left corner. */
export function rulerBoxes(): Box[] {
  return Array.from({ length: 10 }, (_, k) => ({ name: `Calibration / Ruler ${k}`, center: [-1.93, (k + 0.5) * 0.1, 9.03], size: [0.04, 0.1, 0.04], band: (k % 2) as 0 | 1 }));
}

/** Adult stands beyond the far (north) edge, right of the table, so both 1 m and 2 m views frame table, chairs and person. */
export const ADULT_POSITION = { x: 0.45, z: 7.6 } as const;

/** 1.75 m adult: legs .86, torso to 1.45, neck, head to 1.75 (boxes only, visual, no collider). */
export function adultBoxes(): Box[] {
  const at = (n: string, x0: number, x1: number, y0: number, y1: number, d: number): Box =>
    ({ name: `Calibration / Adult ${n}`, center: [ADULT_POSITION.x + (x0 + x1) / 2, (y0 + y1) / 2, ADULT_POSITION.z], size: [x1 - x0, y1 - y0, d], band: 1 });
  return [at('leg L', -.17, -.03, 0, .86, .2), at('leg R', .03, .17, 0, .86, .2), at('torso', -.22, .22, .86, 1.45, .24),
    at('arm L', -.3, -.22, .9, 1.43, .14), at('arm R', .22, .3, .9, 1.43, .14), at('neck', -.05, .05, 1.45, 1.53, .1), at('head', -.1, .1, 1.53, 1.75, .2)];
}

export function adultHeight(): number {
  return Math.max(...adultBoxes().map(b => b.center[1] + b.size[1] / 2));
}

/**
 * Player capsule centre that puts the eye `distance` metres in front of the table's near edge, on the floor
 * under normal gravity. Pitch keeps the near table edge and the adult's head inside the 84°-horizontal lens.
 */
export function viewpoint(distance: number): { position: [number, number, number]; yaw: number; pitch: number } {
  return { position: [CALIBRATION_TABLE.x, GROUND_TOP + CAPSULE_CENTRE_ABOVE_FLOOR, CALIBRATION_TABLE.nearEdgeZ + distance], yaw: 0, pitch: distance <= 1 ? -0.33 : -0.2 };
}

/** Camera-space test: is a world point inside a yaw-0 first-person view (looking -Z) with the given lens? */
export function inView(eye: readonly number[], pitch: number, verticalFov: number, aspect: number, point: readonly number[]): boolean {
  const dx = point[0] - eye[0], dy = point[1] - eye[1], dz = point[2] - eye[2];
  const c = Math.cos(-pitch), s = Math.sin(-pitch);
  const y = dy * c - dz * s, z = dy * s + dz * c;           // rotate by -pitch about X into camera space
  if (z >= 0) return false;
  const ty = Math.tan(verticalFov / 2), tx = ty * aspect;
  return Math.abs(dx / -z) <= tx && Math.abs(y / -z) <= ty;
}

/** Scale encoded in a column-major 4x4 world matrix. */
export function matrixScale(m: ArrayLike<number>): [number, number, number] {
  const len = (o: number) => Math.hypot(m[o] as number, m[o + 1] as number, m[o + 2] as number);
  return [len(0), len(4), len(8)];
}

export function horizontalFovDeg(verticalFovRad: number, aspect: number): number {
  return 2 * Math.atan(Math.tan(verticalFovRad / 2) * aspect) * 180 / Math.PI;
}
