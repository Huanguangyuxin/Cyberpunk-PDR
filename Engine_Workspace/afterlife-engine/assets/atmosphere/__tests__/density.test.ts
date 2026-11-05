import { expect, it } from 'vitest';
import { smokeDensity } from '../density';
import zones from '../fog-zones.json';

it('keeps all six density faces clear so adjoining local media have no hard box edge', () => {
  const n = 32, data = smokeDensity(n);
  let occupied = 0;
  for (let z = 0; z < n; z++) for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const d = data[x + n * (y + n * z)];
    if (x === 0 || y === 0 || z === 0 || x === n-1 || y === n-1 || z === n-1) expect(d).toBe(0);
    if (d > 25) occupied++;
  }
  expect(occupied).toBeGreaterThan(n ** 3 * .4);
  expect(new Set(data).size).toBeGreaterThan(80);
});

it('stays within the eight-medium renderer contract with valid spatial bounds', () => {
  expect(zones.length).toBeLessThanOrEqual(8);
  for (const z of zones) {
    expect(z.max.every((v, i) => v > z.min[i])).toBe(true);
    expect(z.extinction).toBeGreaterThan(0);
    expect(z.anisotropy).toBeGreaterThan(-1);
    expect(z.anisotropy).toBeLessThan(1);
  }
});
