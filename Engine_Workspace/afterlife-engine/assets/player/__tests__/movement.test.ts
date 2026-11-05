import { describe, expect, it } from 'vitest';
import { mouseLook, walkingDisplacement, WALK_SPEED } from '../movement';
describe('first-person input mapping', () => {
  it('moves W/S forward/backward and A/D laterally relative to the camera', () => {
    expect(walkingDisplacement(0, 0, 1, 1)).toEqual([0, 0, -WALK_SPEED]);
    expect(walkingDisplacement(0, 0, -1, 1)).toEqual([0, 0, WALK_SPEED]);
    expect(walkingDisplacement(0, 1, 0, 1)[0]).toBeCloseTo(WALK_SPEED);
    expect(walkingDisplacement(0, 1, 0, 1)[2]).toBeCloseTo(0);
    expect(walkingDisplacement(0, -1, 0, 1)[0]).toBeCloseTo(-WALK_SPEED);
    expect(walkingDisplacement(0, -1, 0, 1)[2]).toBeCloseTo(0);
    const turned = walkingDisplacement(Math.PI / 2, 0, 1, 1);
    expect(turned[0]).toBeCloseTo(-WALK_SPEED); expect(turned[2]).toBeCloseTo(0);
  });
  it('keeps diagonal speed normalized and is independent of tick duration', () => {
    const d = walkingDisplacement(0, 1, 1, 1);
    expect(Math.hypot(d[0], d[2])).toBeCloseTo(WALK_SPEED);
    expect(walkingDisplacement(0, 0, 1, .5)[2] * 2).toBeCloseTo(-WALK_SPEED);
  });
  it('limits vertical mouse look without limiting horizontal turning', () => {
    expect(mouseLook(0, 0, 100, 100000).pitch).toBe(-1.35);
    expect(mouseLook(0, 0, 100, -100000).pitch).toBe(1.35);
    expect(mouseLook(0, 0, 2000, 0).yaw).toBeLessThan(-2 * Math.PI);
  });
});
