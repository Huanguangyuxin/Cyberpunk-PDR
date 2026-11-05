import { describe, expect, it } from 'vitest';
import solids from '../workbuddy-v4-colliders.json';

/** Collider rows are Engine coords: x east, y up, z = -Blender y (south positive). */
type Solid = { name: string; pos: number[]; half: number[] };
const all = solids as Solid[];
const named = (prefix: string) => all.filter(s => s.name.startsWith(prefix));
const top = (s: Solid) => s.pos[1] + s.half[1];
const size = (s: Solid, axis: 0 | 2) => s.half[axis] * 2;
/** Plan rectangle in Blender (x, y) metres -> list of colliders standing in it between knee and head height. */
function blockers(x0: number, x1: number, y0: number, y1: number, floor = 0, ignore: (s: Solid) => boolean = () => false) {
  return all.filter(s => !ignore(s) && s.pos[1] + s.half[1] > floor + .1 && s.pos[1] - s.half[1] < floor + 1.6
    && s.pos[0] + s.half[0] > x0 && s.pos[0] - s.half[0] < x1 && -s.pos[2] + s.half[2] > y0 && -s.pos[2] - s.half[2] < y1).map(s => s.name);
}
const architecture = (s: Solid) => s.name.startsWith(('Column_')) || s.name === 'Floor_Main' || s.name.startsWith('Mezz_Slab');

describe('V6 layout density is kept in V7', () => {
  it('replaces the 30-table / 130-stool grid with a few varied groups', () => {
    const tables = [...named('Social_Table_'), ...named('Social_HighTop_')];
    expect(tables.length).toBeGreaterThanOrEqual(10);
    expect(tables.length).toBeLessThanOrEqual(12);
    expect(named('HighTop')).toHaveLength(0);
    // mixed: lounge 4-tops, a 6-top, high-tops, banquette and a communal high table
    const sizes = new Set(tables.map(t => `${size(t, 0).toFixed(1)}x${size(t, 2).toFixed(1)}@${top(t).toFixed(2)}`));
    expect(sizes.size).toBeGreaterThanOrEqual(5);
    expect(named('Social_HighTop_').length).toBeLessThanOrEqual(3);
    const seats = named('Social_Chair_').length + named('Social_Stool_').length;
    expect(seats).toBeGreaterThan(30);
    expect(seats).toBeLessThan(60);
    expect(named('Social_Banquette_Seat')).toHaveLength(1);
    expect(named('Social_Ledge_Top')).toHaveLength(1);
  });

  it('uses three large U-shaped booth islands with adult seat, back and table sizes', () => {
    for (let i = 1; i <= 3; i++) {
      const seat = named(`Booth${i}_Seat_S`)[0], back = named(`Booth${i}_Back_S`)[0], table = named(`Booth${i}_Table`)[0];
      expect(named(`Booth${i}_Seat_`)).toHaveLength(3);
      expect(named(`Booth${i}_Back_`)).toHaveLength(3);
      expect(size(seat, 0)).toBeGreaterThanOrEqual(4.4);            // 4 people on the back run alone
      expect(size(seat, 2)).toBeCloseTo(.65, 2);                    // seat depth
      expect(top(seat) - .10).toBeCloseTo(.46, 2);                  // seat height above the 10 cm plinth
      expect(top(back)).toBeCloseTo(1.30, 2); expect(size(back, 2)).toBeCloseTo(.35, 2);
      expect(size(table, 0)).toBeCloseTo(2.8, 2); expect(size(table, 2)).toBeCloseTo(1.2, 2);
      expect(top(table) - top(seat)).toBeGreaterThan(.25); expect(top(table) - top(seat)).toBeLessThan(.30);
      const island = named(`Booth${i}_`).reduce((r, s) => [Math.min(r[0], s.pos[0] - s.half[0]), Math.max(r[1], s.pos[0] + s.half[0])], [1e9, -1e9]);
      expect(island[1] - island[0]).toBeCloseTo(5.6, 1);
    }
    expect(named('Booth4_')).toHaveLength(0);
  });

  it('groups bar stools into short runs with service gaps', () => {
    const north = named('BarStool_N').map(s => s.pos[0]).sort((a, b) => a - b);
    const east = named('BarStool_E').map(s => -s.pos[2]).sort((a, b) => a - b);
    expect(north.length + east.length).toBeLessThanOrEqual(28);
    for (const run of [north, east]) {
      const gaps = run.slice(1).map((v, k) => v - run[k]);
      expect(Math.min(...gaps)).toBeGreaterThan(.7);               // >= 0.75 m pitch
      expect(gaps.filter(g => g > 1.5).length).toBeGreaterThanOrEqual(2); // pick-up / service gaps
      let longest = 1, cur = 1; for (const g of gaps) { cur = g < 1 ? cur + 1 : 1; longest = Math.max(longest, cur); }
      expect(longest).toBeLessThanOrEqual(5);
    }
  });

  it('gives the upper lounge three conversation groups and two rail benches', () => {
    expect(named('Lounge_Sofa_')).toHaveLength(3);
    expect(named('Lounge_ArmChair_')).toHaveLength(6);
    expect(named('Lounge_RailSeat_').length).toBe(2);
    for (const sofa of named('Lounge_Sofa_')) { expect(size(sofa, 0)).toBeCloseTo(2.6, 1); expect(top(sofa) - 5.6).toBeCloseTo(.88, 2); }
    for (const t of named('Lounge_Table_')) expect(top(t) - 5.6).toBeCloseTo(.42, 2);
  });
});

describe('V7 circulation stays clear', () => {
  const lanes: [string, number, number, number, number][] = [
    ['east-west spine', -6, 16.4, -4.5, -2.7],
    ['north-south spine', 6.0, 7.8, -11.0, 5.0],
    ['bar aisle behind north stools', -3.0, 16.4, 5.0, 6.8],
    ['east aisle before east stools', 16.4, 18.4, -11.0, 5.0],
    ['booth aisle', -3.0, 19.6, -13.9, -11.0],
    ['audience strip', -6.0, -4.5, -12.9, 11.8],
    ['dry ribbon path', 25.85, 27.35, -15.0, 0.0],
  ];
  for (const [name, x0, x1, y0, y1] of lanes) it(`keeps the ${name} free of furniture`, () => {
    expect(blockers(x0, x1, y0, y1, 0, architecture)).toEqual([]);
    expect(Math.min(x1 - x0, y1 - y0)).toBeGreaterThanOrEqual(1.5);
  });

  it('keeps every seating group outside the dance floor and stage-view strip', () => {
    for (const s of [...named('Social_'), ...named('Booth')]) expect(s.pos[0] - s.half[0], s.name).toBeGreaterThan(-4.5);
  });

  it('leaves chair pull-out room: seats of different groups are at least 1 m apart', () => {
    const seats = [...named('Social_Chair_'), ...named('Social_Stool_')];
    const group = (n: string) => n.split('_')[2];
    for (const a of seats) for (const b of seats) if (group(a.name) !== group(b.name)) {
      const gap = Math.max(Math.abs(a.pos[0] - b.pos[0]) - a.half[0] - b.half[0], Math.abs(a.pos[2] - b.pos[2]) - a.half[2] - b.half[2]);
      expect(gap, `${a.name} / ${b.name}`).toBeGreaterThan(.9);
    }
  });

  it('keeps an upper-lounge lane from the stair head between rail benches and armchairs', () => {
    expect(blockers(12, 27, 11.9, 12.8, 5.6, s => s.name.startsWith('Column_'))).toEqual([]);
    expect(blockers(24.2, 25.8, 10.0, 14.4, 5.6, s => s.name.startsWith('Mezz_'))).toEqual([]);
  });
});
