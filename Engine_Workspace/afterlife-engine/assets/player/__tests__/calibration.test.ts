import { expect, it } from 'vitest';
import solids from '../workbuddy-v4-colliders.json';
import { adultBoxes, adultHeight, inView, CAPSULE_CENTRE_ABOVE_FLOOR, CALIBRATION_TABLE, GROUND_TOP, horizontalFovDeg, matrixScale, rulerBoxes, viewpoint } from '../calibration';
import { EYE_OFFSET, verticalFovForHorizontal } from '../lens';

it('places a 1 m ruler and a 1.75 m adult beside the calibration table', () => {
  const r = rulerBoxes();
  expect(r).toHaveLength(10);
  expect(Math.max(...r.map(b => b.center[1] + b.size[1] / 2))).toBeCloseTo(1, 5);
  expect(adultHeight()).toBeCloseTo(1.75, 5);
  const table = (solids as { name: string; pos: number[]; half: number[] }[]).find(s => s.name === 'Social_Table_R4a')!;
  expect(table.pos[0]).toBeCloseTo(CALIBRATION_TABLE.x, 2);
  expect(table.pos[2] + table.half[2]).toBeCloseTo(CALIBRATION_TABLE.nearEdgeZ, 2);
  expect(table.pos[1] + table.half[1]).toBeCloseTo(CALIBRATION_TABLE.top, 2);
});

it('stands the eye 1 m / 2 m from the table edge at about 1.6 m', () => {
  for (const dist of [1, 2]) {
    const v = viewpoint(dist);
    expect(v.position[2] - CALIBRATION_TABLE.nearEdgeZ).toBeCloseTo(dist, 5);
    expect(v.position[1] - GROUND_TOP + EYE_OFFSET).toBeCloseTo(CAPSULE_CENTRE_ABOVE_FLOOR + EYE_OFFSET, 5);
    expect(CAPSULE_CENTRE_ABOVE_FLOOR + EYE_OFFSET).toBeGreaterThan(1.55); expect(CAPSULE_CENTRE_ABOVE_FLOOR + EYE_OFFSET).toBeLessThan(1.65);
  }
});

it('decodes world scale and the live horizontal lens', () => {
  expect(matrixScale([1, 0, 0, 0, 0, 1.25, 0, 0, 0, 0, 1, 0, 3, 4, 5, 1])).toEqual([1, 1.25, 1]);
  expect(horizontalFovDeg(verticalFovForHorizontal(84, 16 / 9), 16 / 9)).toBeCloseTo(84, 5);
  expect(horizontalFovDeg(84 * Math.PI / 180, 16 / 9)).toBeGreaterThan(115);  // the V5 lens
});

type Solid = { name: string; pos: number[]; half: number[] };

it('frames the whole adult, the near table edge and the chair backs in both 1 m and 2 m views', () => {
  const aspect = 16 / 9, vfov = verticalFovForHorizontal(84, aspect);
  const corners = (b: { center: number[]; size: number[] }) => [-1, 1].flatMap(sx => [-1, 1].flatMap(sy => [-1, 1].map(sz =>
    [b.center[0] + sx * b.size[0] / 2, b.center[1] + sy * b.size[1] / 2, b.center[2] + sz * b.size[2] / 2])));
  const table = (solids as Solid[]).find(s => s.name === 'Social_Table_R4a')!;
  const nearEdge = [-1, 1].map(sx => [table.pos[0] + sx * table.half[0], CALIBRATION_TABLE.top, CALIBRATION_TABLE.nearEdgeZ]);
  for (const dist of [1, 2]) {
    const v = viewpoint(dist);
    const eye = [v.position[0], v.position[1] + EYE_OFFSET, v.position[2]];
    for (const b of adultBoxes()) for (const p of corners(b)) expect(inView(eye, v.pitch, vfov, aspect, p), `${dist} m ${b.name}`).toBe(true);
    for (const p of nearEdge) expect(inView(eye, v.pitch, vfov, aspect, p), `${dist} m table edge`).toBe(true);
  }
  // the old adult spot (x .6, z 9.6) is outside the 1 m view
  expect(inView([-.9, 1.612, 9.875], -.33, vfov, aspect, [.6, 1.2, 9.6])).toBe(false);
});

it('teleports onto free floor: the capsule clears every collider at both calibration spots', () => {
  const R = .28 + .02, HALF = .57;                           // capsule radius + controller skin, half-height
  for (const dist of [1, 2]) {
    const [x, y, z] = viewpoint(dist).position;
    for (const s of solids as Solid[]) {
      if (s.pos[1] - s.half[1] > y + HALF + R || s.pos[1] + s.half[1] < y - HALF - R + .05) continue;   // floor / overhead
      const gap = Math.hypot(Math.max(Math.abs(x - s.pos[0]) - s.half[0], 0), Math.max(Math.abs(z - s.pos[2]) - s.half[2], 0)) - R;
      expect(gap, `${dist} m vs ${s.name}`).toBeGreaterThan(.1);
    }
  }
});
