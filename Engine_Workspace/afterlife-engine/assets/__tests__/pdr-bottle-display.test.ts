import {expect, it} from 'vitest';
import {MeshFilter, MeshRenderer} from '@forgeax/engine/render';
import {Name} from '@forgeax/engine/scene';
import {installDisplayHierarchy} from '../pdr-display-hierarchy';

function mesh(position: number[], normal: number[], indices: number[]) {
  return {
    kind: 'mesh', indices: Uint32Array.from(indices),
    attributes: {position: Float32Array.from(position), normal: Float32Array.from(normal)},
    materialSlots: [{slotName: 'TEST'}],
    submeshes: [{indexOffset: 0, indexCount: indices.length, materialSlot: 0}],
  };
}

function bottleCurve() {
  const positions: number[] = [], normals: number[] = [], indices: number[] = [];
  for (let k = 0; k <= 32; k++) {
    const angle = .74 * (2 * k / 32 - 1);
    for (const height of [.04, .145]) {
      positions.push(-.0484 * Math.cos(angle), height, .0484 * Math.sin(angle));
      normals.push(-Math.cos(angle), 0, Math.sin(angle));
    }
    if (k === 0) continue;
    const i = 2 * k - 2;
    indices.push(i, i + 2, i + 3, i, i + 3, i + 1);
  }
  return mesh(positions, normals, indices);
}

// The 9 mm-high silver lip is tessellated as a quarter cylinder. The two
// halves of each quad share an AABB, yet cover disjoint areas of its face.
function counterLip() {
  const positions: number[] = [], normals: number[] = [], indices: number[] = [];
  for (let i = 0; i <= 40; i++) {
    const angle = Math.PI * i / 80;
    const nx = -Math.cos(angle), nz = -Math.sin(angle);
    for (const height of [1.098, 1.107]) {
      positions.push(10.326 + .366 * nx, height, -13.70 + .366 * nz);
      normals.push(nx, 0, nz);
    }
    if (i > 0) {
      const k = 2 * i - 2;
      indices.push(k, k + 1, k + 3, k, k + 3, k + 2);
    }
  }
  return mesh(positions, normals, indices);
}

it('preserves adjacent bottle and counter lip facets while removing genuine duplicate architectural faces', () => {
  const curve = bottleCurve();
  const wall = mesh([0, 0, 0, 1, 0, 0, 0, 1, 0], [0, 0, 1, 0, 0, 1, 0, 0, 1], [0, 1, 2, 0, 1, 2]);
  const lip = counterLip();
  const meshes = [curve, wall, lip];
  const names = [
    'DRINK_SHELF2_076_LABEL', 'DRINK_SHELF2_076_CAP', 'DRINK_SHELF2_076_CORK',
    'Folded pewter guest counter', 'Wrapped pewter counter ends', 'Bar copper plinth',
    'ARCH_TEST_WALL',
  ];
  const handles = [0, 0, 0, 2, 2, 2, 1];
  const rows = names.map((name, entity) => ({
    entity,
    get: (component: unknown) => {
      if (component === Name) return {value: name};
      if (component === MeshFilter) return {assetHandle: handles[entity]};
      if (component === MeshRenderer) return {materials: []};
      throw new Error('Unexpected component');
    },
  }));
  const ok = <T>(value: T) => ({ok: true, value, unwrap: () => value});
  const world = {
    query: () => ok(rows), get: () => ({ok: false}), addComponent: () => ok(undefined),
    set: (entity: number, component: unknown, data: {assetHandle: number}) => {
      if (component === MeshFilter) handles[entity] = data.assetHandle;
      return ok(undefined);
    },
    insertResource: () => {},
  };
  const assets = {
    read: (handle: number) => ok(meshes[handle]),
    create: (value: typeof curve) => ok(meshes.push(value) - 1),
  };
  type Install = Parameters<typeof installDisplayHierarchy>;
  const hierarchy = installDisplayHierarchy(world as unknown as Install[0], assets as unknown as Install[1]);
  for (const handle of handles.slice(0, 3)) {
    expect(meshes[handle].indices).toEqual(curve.indices);
    expect(meshes[handle].indices).toHaveLength(192);
  }
  for (const handle of handles.slice(3, 6)) {
    expect(meshes[handle].indices).toEqual(lip.indices);
    expect(meshes[handle].indices).toHaveLength(240);
  }
  expect(meshes[handles[6]].indices).toHaveLength(3);
  expect(hierarchy.read().deduplicated).toEqual([
    expect.objectContaining({name: 'ARCH_TEST_WALL', removedCoplanarAndDegenerateTriangles: 1}),
  ]);
});
