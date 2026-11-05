export const WALK_SPEED = 3.2;
export const RUN_SPEED = 5.1;
export const LOOK_SENSITIVITY = 0.004;

/** Camera-relative planar movement; diagonals keep the same walking speed. */
export function walkingDisplacement(yaw: number, right: number, forward: number, dt: number, speed = WALK_SPEED): [number, number, number] {
  const length = Math.hypot(right, forward);
  if (length === 0) return [0, 0, 0];
  const scale = speed * dt / Math.max(1, length);
  return [
    (Math.cos(yaw) * right - Math.sin(yaw) * forward) * scale,
    0,
    (-Math.sin(yaw) * right - Math.cos(yaw) * forward) * scale,
  ];
}

export function mouseLook(yaw: number, pitch: number, dx: number, dy: number) {
  return {
    yaw: yaw - dx * LOOK_SENSITIVITY,
    pitch: Math.max(-1.35, Math.min(1.35, pitch - dy * LOOK_SENSITIVITY)),
  };
}

/** Gravity in m/s² and take-off speed: apex v²/2g ≈ 0.69 m, about 0.55 s airborne. */
export const GRAVITY = 18;
export const JUMP_SPEED = 5;
export const MAX_FALL_SPEED = 20;
/** Small downward speed while grounded so the controller keeps ground contact on stairs. */
export const GROUND_STICK_SPEED = -0.8;

export interface VerticalState {
  /** Vertical velocity in m/s (positive = up). */
  readonly velocity: number;
  /** Jump key state seen by the previous fixed tick; a jump needs a new press. */
  readonly jumpHeld: boolean;
}

/**
 * One fixed-tick vertical step. Jumps only on the press edge while grounded:
 * holding Space never re-triggers after landing, and airborne presses are ignored.
 * `grounded` is the controller result from the previous move; a rising body that
 * still reports stale ground contact keeps its upward velocity.
 */
export function verticalStep(state: VerticalState, grounded: boolean, jumpDown: boolean, dt: number): VerticalState & { jumped: boolean } {
  const pressed = jumpDown && !state.jumpHeld;
  if (pressed && grounded && state.velocity <= 0) return { velocity: JUMP_SPEED, jumpHeld: jumpDown, jumped: true };
  if (grounded && state.velocity <= 0) return { velocity: GROUND_STICK_SPEED, jumpHeld: jumpDown, jumped: false };
  return { velocity: Math.max(-MAX_FALL_SPEED, state.velocity - GRAVITY * dt), jumpHeld: jumpDown, jumped: false };
}

/** Stop upward motion when a ceiling blocks most of the requested rise. */
export function afterVerticalMove(velocity: number, requestedDy: number, actualDy: number): number {
  return velocity > 0 && requestedDy > 0 && actualDy < requestedDy * 0.5 ? 0 : velocity;
}
