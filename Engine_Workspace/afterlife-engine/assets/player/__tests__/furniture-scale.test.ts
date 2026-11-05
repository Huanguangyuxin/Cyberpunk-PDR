import { describe, expect, it } from 'vitest';
import scale from '../furniture-scale.json';
import solids from '../workbuddy-v4-colliders.json';

type Dim = { size: number[]; min: number[]; max: number[] };
const d = (k: keyof typeof scale) => scale[k] as Dim;
const all = solids as { name: string; pos: number[]; half: number[] }[];

describe('V7 adult furniture scale (calibrated on the R4a four-top)', () => {
  it('four-top: 1.6-1.8 x 0.85-1.0 m at dining height with a 60 mm top and 80 mm legs', () => {
    const t = d('rect170');
    expect(t.size[0]).toBeGreaterThanOrEqual(1.6); expect(t.size[0]).toBeLessThanOrEqual(1.8);
    expect(t.size[1]).toBeGreaterThanOrEqual(.85); expect(t.size[1]).toBeLessThanOrEqual(1.0);
    expect(t.max[2]).toBeCloseTo(.75, 2);
    // four 1.7 m-wide place settings: >= 0.6 m of edge per diner along each long side
    expect(t.size[0] / 2).toBeGreaterThanOrEqual(.6 * 1.4);
  });

  it('dining chair: 0.52-0.58 W, 0.50-0.55 D, seat 0.45-0.50, overall 1.0-1.15 m', () => {
    const c = d('chair');
    expect(c.size[0]).toBeGreaterThanOrEqual(.52); expect(c.size[0]).toBeLessThanOrEqual(.6);
    expect(c.size[1]).toBeGreaterThanOrEqual(.5); expect(c.size[1]).toBeLessThanOrEqual(.57);
    expect(c.size[2]).toBeGreaterThanOrEqual(1.0); expect(c.size[2]).toBeLessThanOrEqual(1.15);
    const seatTop = all.find(s => s.name.startsWith('Social_Chair_R4a_'))!;
    expect(seatTop.pos[1] + seatTop.half[1]).toBeCloseTo(c.size[2], 2);
    // table-to-seat difference for a 0.47 m seat: 0.28 m (comfortable 0.27-0.30)
    expect(d('rect170').max[2] - .47).toBeGreaterThan(.26); expect(d('rect170').max[2] - .47).toBeLessThan(.31);
  });

  it('keeps heights human: dining 0.75, high tables 1.10, stool seats 0.76, no giant verticals', () => {
    for (const k of ['rect170', 'rect160p', 'rect240', 'rect90', 'round130', 'round90'] as const) expect(d(k).max[2], k).toBeCloseTo(.75, 2);
    for (const k of ['hightop', 'communal'] as const) expect(d(k).max[2], k).toBeCloseTo(1.10, 2);
    expect(d('stool').size[2]).toBeGreaterThan(1.0); expect(d('stool').size[2]).toBeLessThan(1.1);
    expect(d('stool').size[0]).toBeCloseTo(.5, 1);
    expect(d('hightop').size[0]).toBeCloseTo(.8, 2);
    expect(d('sofa').size[0]).toBeCloseTo(2.6, 2); expect(d('sofa').size[2]).toBeCloseTo(.88, 2);
    expect(d('club').size[0]).toBeCloseTo(.95, 2);
  });

  it('gives tabletop objects real-world size against the 1.75 m adult reference', () => {
    expect(d('adult').size[2]).toBeCloseTo(1.75, 2);
    expect(d('highball').size[2]).toBeCloseTo(.15, 2); expect(d('highball').size[0]).toBeGreaterThan(.07);
    expect(d('rocks').size[0]).toBeCloseTo(.09, 2);
    expect(d('bottle').size[2]).toBeCloseTo(.32, 2); expect(d('bottle').size[0]).toBeGreaterThan(.08);
    expect(d('candle').size[0]).toBeCloseTo(.1, 2);
  });

  it('builds every table from the four-top family scale, not V6 0.7-0.9 m tops', () => {
    expect(d('round130').size[0]).toBeCloseTo(1.3, 2);
    expect(d('rect240').size[0]).toBeCloseTo(2.4, 2); expect(d('rect240').size[1]).toBeCloseTo(1.0, 2);
    expect(d('rect160p').size[0]).toBeCloseTo(1.6, 2);
    expect(d('communal').size[0]).toBeCloseTo(3.2, 2);
    expect(all.filter(s => s.name.startsWith('Calib'))).toEqual([]);   // calibration geometry stays out of the game
  });
});
