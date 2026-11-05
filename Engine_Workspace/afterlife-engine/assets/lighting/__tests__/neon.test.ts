import { expect, it } from 'vitest';
import { neonFactor, neonLevel } from '../neon';
it('has bounded output and short double dropout instead of switching the whole room', () => {
  expect(neonFactor(.18, 4.9, 0, 0)).toBeLessThan(.07);
  expect(neonFactor(.35, 4.9, 0, 0)).toBeLessThan(.07);
  expect(neonFactor(.27, 4.9, 0, 0)).toBeGreaterThan(.7);
  for (let t = 0; t < 30; t += .017) expect(neonFactor(t, 4.9, 0, 0)).toBeGreaterThan(0);
});
it('separates neighboring circuit failure times and picks a dark material during dropout', () => {
  expect(neonFactor(.18, 5.33, .67, 1)).toBeGreaterThan(.7);
  expect(neonLevel(neonFactor(.18, 4.9, 0, 0))).toBe(0);
  expect(neonLevel(1)).toBe(5);
});
