import { describe, expect, it } from 'vitest';
import { afterVerticalMove, GRAVITY, GROUND_STICK_SPEED, JUMP_SPEED, verticalStep, type VerticalState } from '../movement';

const DT = 1 / 60;

/** Flat-floor integrator mirroring the controller loop: step, move, then report grounded. */
function simulate(keys: (tick: number) => boolean, ticks: number) {
  let state: VerticalState = { velocity: 0, jumpHeld: false };
  let y = 0, grounded = true, jumps = 0, peak = 0, airborneTicks = 0;
  const jumpTicks: number[] = [];
  for (let t = 0; t < ticks; t++) {
    const next = verticalStep(state, grounded, keys(t), DT);
    if (next.jumped) { jumps++; jumpTicks.push(t); }
    const ny = Math.max(0, y + next.velocity * DT);
    const actual = ny - y;
    y = ny;
    grounded = y <= 1e-6;
    if (!grounded) airborneTicks++;
    peak = Math.max(peak, y);
    state = { velocity: afterVerticalMove(next.velocity, next.velocity * DT, actual), jumpHeld: next.jumpHeld };
    if (grounded && state.velocity < 0) state = { ...state, velocity: 0 };
  }
  return { y, grounded, jumps, peak, airborneTicks, jumpTicks };
}

describe('Space jump', () => {
  it('starts a jump only on a grounded press edge', () => {
    const jump = verticalStep({ velocity: GROUND_STICK_SPEED, jumpHeld: false }, true, true, DT);
    expect(jump.jumped).toBe(true);
    expect(jump.velocity).toBe(JUMP_SPEED);
    expect(verticalStep({ velocity: GROUND_STICK_SPEED, jumpHeld: false }, true, false, DT)).toEqual({ velocity: GROUND_STICK_SPEED, jumpHeld: false, jumped: false });
  });

  it('ignores presses in the air, so there is no double jump', () => {
    const air = verticalStep({ velocity: 2, jumpHeld: false }, false, true, DT);
    expect(air.jumped).toBe(false);
    expect(air.velocity).toBeCloseTo(2 - GRAVITY * DT);
    // Stale grounded contact on the tick after take-off must not re-launch or snap the body down.
    const stale = verticalStep({ velocity: JUMP_SPEED, jumpHeld: false }, true, true, DT);
    expect(stale.jumped).toBe(false);
    expect(stale.velocity).toBeCloseTo(JUMP_SPEED - GRAVITY * DT);
  });

  it('rises to a human-scale apex and lands under gravity', () => {
    const run = simulate(t => t === 5, 120);
    expect(run.jumps).toBe(1);
    expect(run.peak).toBeGreaterThan(0.6);
    expect(run.peak).toBeLessThan(0.8);
    expect(run.airborneTicks / 60).toBeGreaterThan(0.45);
    expect(run.airborneTicks / 60).toBeLessThan(0.65);
    expect(run.grounded).toBe(true);
    expect(run.y).toBe(0);
  });

  it('does not repeat while Space stays held through landing', () => {
    const held = simulate(t => t >= 5, 300);
    expect(held.jumps).toBe(1);
    expect(held.grounded).toBe(true);
  });

  it('mashing in the air does nothing; a fresh press after landing jumps again', () => {
    // Press at 5, release, press repeatedly while airborne, then press after landing (~tick 40).
    const mash = simulate(t => t === 5 || (t >= 12 && t <= 30 && t % 3 === 0) || t === 60, 140);
    expect(mash.jumpTicks).toEqual([5, 60]);
    expect(mash.grounded).toBe(true);
  });

  it('cancels upward speed when a ceiling blocks the rise', () => {
    expect(afterVerticalMove(4, 4 * DT, 0)).toBe(0);
    expect(afterVerticalMove(4, 4 * DT, 4 * DT)).toBe(4);
    expect(afterVerticalMove(-3, -3 * DT, 0)).toBe(-3);
  });
});
