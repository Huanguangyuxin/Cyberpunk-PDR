import { expect, it } from 'vitest';
import { centreMagnification, verticalFovForHorizontal } from '../lens';
const deg = (r: number) => r * 180 / Math.PI;
it('keeps 84° horizontal instead of the old 84° vertical wide-angle', () => {
  const v = verticalFovForHorizontal(84, 16 / 9);
  expect(deg(v)).toBeCloseTo(53.7, 1);
  const oldHorizontal = 2 * Math.atan(Math.tan(84 * Math.PI / 360) * 16 / 9);
  expect(deg(oldHorizontal)).toBeGreaterThan(115);
  // the same table at screen centre appears ~1.8x larger than with the V5 lens
  expect(centreMagnification(v, 84 * Math.PI / 180)).toBeCloseTo(1.78, 1);
});
it('clamps the vertical angle for extreme windows', () => {
  expect(deg(verticalFovForHorizontal(84, 4))).toBeCloseTo(45);
  expect(deg(verticalFovForHorizontal(84, .5))).toBeCloseTo(75);
  expect(deg(verticalFovForHorizontal(84, NaN))).toBeCloseTo(53.7, 1);
});
it('keeps 84° horizontal at the measured non-16:9 canvases instead of a fixed 16:9 aspect', () => {
  for (const [w, h] of [[2400, 1762], [2048, 1396]]) {
    const aspect = w / h, v = verticalFovForHorizontal(84, aspect);
    const horizontal = 2 * Math.atan(Math.tan(v / 2) * aspect) * 180 / Math.PI;
    expect(horizontal).toBeCloseTo(84, 4);
    // a stale 16:9 aspect on this canvas would squeeze width by aspect / (16/9)
    expect((16 / 9) / aspect).toBeGreaterThan(1.2);
  }
});
it('keeps 84° horizontal at the measured non-16:9 canvases instead of a fixed 16:9 aspect', () => {
  for (const [w, h] of [[2400, 1762], [2048, 1396]]) {
    const aspect = w / h, v = verticalFovForHorizontal(84, aspect);
    const horizontal = 2 * Math.atan(Math.tan(v / 2) * aspect) * 180 / Math.PI;
    expect(horizontal).toBeCloseTo(84, 4);
    // a stale 16:9 aspect on this canvas would squeeze width by aspect / (16/9)
    expect((16 / 9) / aspect).toBeGreaterThan(1.2);
  }
});
