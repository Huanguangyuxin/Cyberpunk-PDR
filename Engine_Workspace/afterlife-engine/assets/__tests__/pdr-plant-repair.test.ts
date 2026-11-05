import {describe, expect, it} from 'vitest';
import type {MeshAsset} from '@forgeax/engine/types';
import {buildRepairedPlantMesh} from '../pdr-plant-repair';

function createSyntheticPlantTemplate(): MeshAsset {
  const totalVerts = 1196;
  const pos = new Float32Array(totalVerts * 3);
  const norm = new Float32Array(totalVerts * 3);
  const uv = new Float32Array(totalVerts * 2);
  const tan = new Float32Array(totalVerts * 4);

  // Pot (0..259): [-0.25..0.25, 0..0.58, -0.25..0.25]
  for (let v = 0; v < 260; v++) {
    const sx = v % 2 === 0 ? -0.25 : 0.25;
    const sy = v < 130 ? 0.0 : 0.58;
    const sz = v % 4 < 2 ? -0.25 : 0.25;
    pos.set([sx, sy, sz], v * 3);
    norm.set([0, 1, 0], v * 3);
    uv.set([0, 0], v * 2);
    tan.set([1, 0, 0, 1], v * 4);
  }
  // Soil (260..359): [-0.225..0.225, 0.58..0.584, -0.225..0.225]
  for (let v = 260; v < 360; v++) {
    pos.set([0.225, 0.582, 0.225], v * 3);
    norm.set([0, 1, 0], v * 3);
    uv.set([0, 0], v * 2);
    tan.set([1, 0, 0, 1], v * 4);
  }
  // 38 leaf ribbons (360..1195), each 22 verts (11 segments * 2 sides) with over-splay up to 1.052m and inverted normals ny < 0
  for (let r = 0; r < 38; r++) {
    const angle = (r / 38) * Math.PI * 2;
    const maxR = r === 31 ? 1.052 : 0.65;
    const maxY = r === 14 ? 1.269 : 0.85;
    for (let s = 0; s < 11; s++) {
      const t = s / 10;
      const rad = 0.04 + (maxR - 0.04) * t;
      const y = 0.585 + (maxY - 0.585) * Math.sin(t * Math.PI * 0.5);
      for (let side = 0; side < 2; side++) {
        const v = 360 + r * 22 + s * 2 + side;
        const a = angle + (side === 0 ? -0.04 : 0.04);
        pos.set([Math.cos(a) * rad, y, Math.sin(a) * rad], v * 3);
        norm.set([0, -0.85, 0.52], v * 3);
        uv.set([side, 1 - t], v * 2);
        tan.set([1, 0, 0, 1], v * 4);
      }
    }
  }

  const indices = new Uint16Array(768 + 288 + 2280);
  let cursor = 768 + 288;
  for (let r = 0; r < 38; r++) {
    const base = 360 + r * 22;
    for (let s = 0; s < 10; s++) {
      const v0 = base + s * 2;
      indices.set([v0, v0 + 1, v0 + 3, v0, v0 + 3, v0 + 2], cursor);
      cursor += 6;
    }
  }

  return {
    kind: 'mesh',
    vertices: new Uint8Array(totalVerts * 48),
    attributes: {position: pos, normal: norm, uv, tangent: tan},
    indices,
    aabb: new Float32Array([-0.712, 0, -0.885, 1.052, 1.269, 0.625]),
    submeshes: [
      {materialSlot: 0, indexOffset: 0, indexCount: 768},
      {materialSlot: 1, indexOffset: 768, indexCount: 288},
      {materialSlot: 2, indexOffset: 1056, indexCount: 2280},
    ],
    materialSlots: [
      {slotName: 'M_POT', defaultMaterial: 1},
      {slotName: 'M_SOIL', defaultMaterial: 2},
      {slotName: 'M_PLANT_LEAF', defaultMaterial: 3},
    ],
  };
}

describe('D082 potted plant mesh repair', () => {
  it('bounds standalone plant foliage inside the 0.50m pot footprint while preserving 1.269m height and valid upward normals', () => {
    const template = createSyntheticPlantTemplate();
    const repaired = buildRepairedPlantMesh(template, false);
    expect(repaired.maxLeafRadiusLocal).toBeLessThanOrEqual(0.245);
    expect(repaired.localMin[0]).toBeGreaterThanOrEqual(-0.25);
    expect(repaired.localMax[0]).toBeLessThanOrEqual(0.25);
    expect(repaired.localMin[1]).toBeCloseTo(0, 4);
    expect(repaired.localMax[1]).toBeCloseTo(1.269, 3);

    const norms = repaired.mesh.attributes.normal as Float32Array;
    const tans = repaired.mesh.attributes.tangent as Float32Array;
    // Top-side leaf vertices (360..1195) must have upward normals (ny > 0) and unit orthogonal tangents
    for (let v = 360; v < 1196; v++) {
      const nx = norms[v * 3], ny = norms[v * 3 + 1], nz = norms[v * 3 + 2];
      const tx = tans[v * 4], ty = tans[v * 4 + 1], tz = tans[v * 4 + 2];
      expect(ny).toBeGreaterThan(0);
      expect(Math.hypot(nx, ny, nz)).toBeCloseTo(1, 4);
      expect(Math.hypot(tx, ty, tz)).toBeCloseTo(1, 4);
      expect(Math.abs(nx * tx + ny * ty + nz * tz)).toBeLessThan(1e-3);
    }
  });

  it('bounds aisle-screen planter geometry above the y=0.420m pedestal shelf and clear of the glass screen at x=-4.910m', () => {
    const template = createSyntheticPlantTemplate();
    const repaired = buildRepairedPlantMesh(template, true);
    const scale = 0.55;
    const originX = -5.01;
    const originY = 0.40;
    const worldMaxRadius = repaired.maxLeafRadiusLocal * scale;
    const worldMinY = originY + repaired.localMin[1] * scale;
    const worldMaxY = originY + repaired.localMax[1] * scale;

    expect(originX + worldMaxRadius).toBeLessThan(-4.915);
    expect(originX - worldMaxRadius).toBeGreaterThan(-5.145);
    expect(worldMinY).toBeGreaterThan(0.420);
    expect(worldMaxY).toBeLessThan(1.050);
  });
});
