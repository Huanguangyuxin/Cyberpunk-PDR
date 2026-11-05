/** D082/D084: repair potted plant foliage over-splay, screen-planter pot/glass clipping,
 * inverted leaf normals, and pot/soil coplanar overlap.
 * Because M_PLANT_LEAF / WB015_M_PLANT_LEAF already use cullMode:'none', a single
 * upward-normal (+N) sheet renders both sides without self-Z-fighting.
 */
import type {AssetRegistry} from '@forgeax/engine/assets-runtime';
import type {EntityHandle, World} from '@forgeax/engine/ecs';
import {packInterleavedVertexAttributes} from '@forgeax/engine/geometry';
import {MeshFilter} from '@forgeax/engine/render';
import {Name, Transform} from '@forgeax/engine/scene';
import type {AssetHandle, MeshAsset} from '@forgeax/engine/types';

const POT_VERTS = 260;
const SOIL_VERTS = 100;
const LEAF_ORIGIN_START = POT_VERTS + SOIL_VERTS; // 360
const RIBBON_COUNT = 38;
const RIBBON_VERTS = 22; // 11 segments * 2 sides
const LEAF_VERTS = RIBBON_COUNT * RIBBON_VERTS; // 836
const TOTAL_ORIGINAL_VERTS = LEAF_ORIGIN_START + LEAF_VERTS; // 1196

function normalize3(x: number, y: number, z: number): [number, number, number] {
  const len = Math.hypot(x, y, z);
  return len > 1e-8 ? [x / len, y / len, z / len] : [0, 1, 0];
}

function orthogonalTangent(nx: number, ny: number, nz: number, tx: number, ty: number, tz: number): [number, number, number, number] {
  const dot = nx * tx + ny * ty + nz * tz;
  let ox = tx - dot * nx;
  let oy = ty - dot * ny;
  let oz = tz - dot * nz;
  const len = Math.hypot(ox, oy, oz);
  if (len <= 1e-6) {
    if (Math.abs(ny) < 0.9) [ox, oy, oz] = normalize3(-nz, 0, nx);
    else [ox, oy, oz] = normalize3(1, 0, 0);
  } else {
    ox /= len;
    oy /= len;
    oz /= len;
  }
  return [ox, oy, oz, 1];
}

export function buildRepairedPlantMesh(source: MeshAsset, isScreen: boolean): {mesh: MeshAsset; maxLeafRadiusLocal: number; localMin: [number, number, number]; localMax: [number, number, number]} {
  const p0 = source.attributes.position;
  const n0 = source.attributes.normal;
  const u0 = source.attributes.uv;
  const t0 = source.attributes.tangent;
  const idx0 = source.indices;
  if (
    !(p0 instanceof Float32Array) ||
    !(n0 instanceof Float32Array) ||
    !(u0 instanceof Float32Array) ||
    !(t0 instanceof Float32Array) ||
    !(idx0 instanceof Uint16Array || idx0 instanceof Uint32Array)
  ) {
    throw new Error('D082 plant repair requires CPU vertex attributes and indices');
  }
  if (p0.length !== TOTAL_ORIGINAL_VERTS * 3 || source.submeshes.length !== 3) {
    throw new Error(`D082 expected 1196-vertex 3-submesh plant template; got ${p0.length / 3} verts, ${source.submeshes.length} submeshes`);
  }

  const pos = new Float32Array(p0);
  const norm = new Float32Array(n0);
  const uv = new Float32Array(u0);
  const tan = new Float32Array(t0);

  if (isScreen) {
    // FURN_AISLE_SCREENS pedestal top is at world y=0.4200 (local y = 0.020 / 0.55 = 0.036364)
    // and clear glass partition is at world x in [-4.900, -4.870] with steel frame at x=-4.910.
    const sx = 0.14 / 0.25;
    const sy = (0.360 - 0.042) / 0.58;
    for (let v = 0; v < POT_VERTS; v++) {
      const i = v * 3;
      pos[i] *= sx;
      pos[i + 1] = 0.042 + pos[i + 1] * sy;
      pos[i + 2] *= sx;
      const [nx, ny, nz] = normalize3(norm[i] / sx, norm[i + 1] / sy, norm[i + 2] / sx);
      norm[i] = nx;
      norm[i + 1] = ny;
      norm[i + 2] = nz;
      const [tx, ty, tz, tw] = orthogonalTangent(nx, ny, nz, tan[v * 4], tan[v * 4 + 1], tan[v * 4 + 2]);
      tan[v * 4] = tx;
      tan[v * 4 + 1] = ty;
      tan[v * 4 + 2] = tz;
      tan[v * 4 + 3] = tw;
    }
    // Place soil disk 4mm above the pot inner shelf (0.364) so it never Z-fights with the pot top
    const soilScale = 0.122 / 0.225;
    for (let v = POT_VERTS; v < LEAF_ORIGIN_START; v++) {
      const i = v * 3;
      pos[i] *= soilScale;
      pos[i + 1] = 0.364 + Math.max(0, pos[i + 1] - 0.58);
      pos[i + 2] *= soilScale;
    }
  } else {
    // Standalone pot top is at y=0.580; lift soil top to y=0.584..0.587 and inset slightly to prevent pot/soil Z-fighting
    for (let v = POT_VERTS; v < LEAF_ORIGIN_START; v++) {
      const i = v * 3;
      pos[i] *= 0.96;
      pos[i + 1] = 0.583 + Math.max(0, pos[i + 1] - 0.58);
      pos[i + 2] *= 0.96;
    }
  }

  let maxLeafRadiusLocal = 0;

  for (let r = 0; r < RIBBON_COUNT; r++) {
    const vBase = LEAF_ORIGIN_START + r * RIBBON_VERTS;
    let origYMax = -Infinity;
    let origRMax = 0;
    for (let k = 0; k < RIBBON_VERTS; k++) {
      const vi = (vBase + k) * 3;
      origYMax = Math.max(origYMax, p0[vi + 1]);
      origRMax = Math.max(origRMax, Math.hypot(p0[vi], p0[vi + 2]));
    }
    const heightRatio = Math.max(0, Math.min(1, (origYMax - 0.62) / (1.269 - 0.62)));
    const spreadRatio = Math.max(0, Math.min(1, (origRMax - 0.22) / (1.052 - 0.22)));

    const targetYBase = isScreen ? 0.366 : 0.586;
    // Standalone top reaches exactly 1.269m when heightRatio=1 (1.304 - 0.035 = 1.269).
    const targetYTop = isScreen ? 0.82 + 0.298 * heightRatio : 0.995 + 0.309 * heightRatio;
    const targetRMax = isScreen ? 0.095 + 0.055 * spreadRatio : 0.145 + 0.093 * spreadRatio;
    const rBaseScale = isScreen ? 0.42 : 0.75;
    const tipDroop = isScreen ? 0.020 : 0.035;

    const r0Left = Math.hypot(p0[vBase * 3], p0[vBase * 3 + 2]) * rBaseScale;
    const r0Right = Math.hypot(p0[(vBase + 1) * 3], p0[(vBase + 1) * 3 + 2]) * rBaseScale;

    for (let s = 0; s < 11; s++) {
      const t = s / 10;
      const archY = targetYBase + (targetYTop - targetYBase) * (1 - Math.pow(1 - t, 1.65)) - tipDroop * (t * t * t);
      for (let side = 0; side < 2; side++) {
        const vIdx = vBase + s * 2 + side;
        const i = vIdx * 3;
        const vx = p0[i];
        const vz = p0[i + 2];
        const rad = Math.hypot(vx, vz);
        const r0 = side === 0 ? r0Left : r0Right;
        const newR = r0 + (targetRMax - r0) * Math.pow(t, 0.85);
        if (rad > 1e-6) {
          const factor = newR / rad;
          pos[i] = vx * factor;
          pos[i + 2] = vz * factor;
        }
        pos[i + 1] = archY;
        maxLeafRadiusLocal = Math.max(maxLeafRadiusLocal, Math.hypot(pos[i], pos[i + 2]));
      }
    }

    // Recompute smooth upward/outward normals (+N) for the leaf ribbon.
    for (let s = 0; s < 11; s++) {
      const sPrev = Math.max(0, s - 1);
      const sNext = Math.min(10, s + 1);
      const v0 = vBase + s * 2;
      const v1 = v0 + 1;
      const vp0 = vBase + sPrev * 2;
      const vp1 = vp0 + 1;
      const vn0 = vBase + sNext * 2;
      const vn1 = vn0 + 1;

      const wx = pos[v1 * 3] - pos[v0 * 3];
      const wy = pos[v1 * 3 + 1] - pos[v0 * 3 + 1];
      const wz = pos[v1 * 3 + 2] - pos[v0 * 3 + 2];
      const [tx, ty, tz] = normalize3(wx, wy, wz);

      const mxPrev = 0.5 * (pos[vp0 * 3] + pos[vp1 * 3]);
      const myPrev = 0.5 * (pos[vp0 * 3 + 1] + pos[vp1 * 3 + 1]);
      const mzPrev = 0.5 * (pos[vp0 * 3 + 2] + pos[vp1 * 3 + 2]);
      const mxNext = 0.5 * (pos[vn0 * 3] + pos[vn1 * 3]);
      const myNext = 0.5 * (pos[vn0 * 3 + 1] + pos[vn1 * 3 + 1]);
      const mzNext = 0.5 * (pos[vn0 * 3 + 2] + pos[vn1 * 3 + 2]);

      const lx = mxNext - mxPrev;
      const ly = myNext - myPrev;
      const lz = mzNext - mzPrev;

      let [nx, ny, nz] = normalize3(
        ly * wz - lz * wy,
        lz * wx - lx * wz,
        lx * wy - ly * wx,
      );
      if (ny < 0) {
        nx = -nx;
        ny = -ny;
        nz = -nz;
      }
      const [otx, oty, otz, otw] = orthogonalTangent(nx, ny, nz, tx, ty, tz);

      for (let side = 0; side < 2; side++) {
        const frontV = v0 + side;
        norm[frontV * 3] = nx;
        norm[frontV * 3 + 1] = ny;
        norm[frontV * 3 + 2] = nz;
        tan[frontV * 4] = otx;
        tan[frontV * 4 + 1] = oty;
        tan[frontV * 4 + 2] = otz;
        tan[frontV * 4 + 3] = otw;
      }
    }
  }

  const sub0 = source.submeshes[0];
  const sub1 = source.submeshes[1];
  const sub2 = source.submeshes[2];

  // Filter out downward/coplanar bottom triangles on the pot & soil so they never Z-fight with floor or pot top
  const potIndices: number[] = [];
  for (let i = sub0.indexOffset; i < sub0.indexOffset + sub0.indexCount; i += 3) {
    const a = idx0[i], b = idx0[i + 1], c = idx0[i + 2];
    const yMax = Math.max(pos[a * 3 + 1], pos[b * 3 + 1], pos[c * 3 + 1]);
    const ny = (norm[a * 3 + 1] + norm[b * 3 + 1] + norm[c * 3 + 1]) / 3;
    // Skip bottom face of pot (sitting on floor y=0) and internal horizontal cap under soil
    if (ny < -0.8 && yMax < (isScreen ? 0.05 : 0.01)) continue;
    potIndices.push(a, b, c);
  }

  const soilIndices: number[] = [];
  for (let i = sub1.indexOffset; i < sub1.indexOffset + sub1.indexCount; i += 3) {
    const a = idx0[i], b = idx0[i + 1], c = idx0[i + 2];
    const ny = (norm[a * 3 + 1] + norm[b * 3 + 1] + norm[c * 3 + 1]) / 3;
    // Keep only upward-facing top surface of soil disk
    if (ny <= 0.2) continue;
    soilIndices.push(a, b, c);
  }

  const leafIndices: number[] = [];
  for (let i = sub2.indexOffset; i < sub2.indexOffset + sub2.indexCount; i += 3) {
    const a = idx0[i], b = idx0[i + 1], c = idx0[i + 2];
    leafIndices.push(a, c, b);
  }

  const newIndices = new Uint32Array(potIndices.length + soilIndices.length + leafIndices.length);
  newIndices.set(potIndices, 0);
  newIndices.set(soilIndices, potIndices.length);
  newIndices.set(leafIndices, potIndices.length + soilIndices.length);

  const localMin: [number, number, number] = [Infinity, Infinity, Infinity];
  const localMax: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < pos.length; i += 3) {
    for (let axis = 0; axis < 3; axis++) {
      localMin[axis] = Math.min(localMin[axis], pos[i + axis]);
      localMax[axis] = Math.max(localMax[axis], pos[i + axis]);
    }
  }

  const attributes = {position: pos, normal: norm, uv, tangent: tan};
  const packed = packInterleavedVertexAttributes(attributes, TOTAL_ORIGINAL_VERTS).unwrap();
  const submeshes: MeshAsset['submeshes'][number][] = [
    {...sub0, indexOffset: 0, indexCount: potIndices.length},
    {...sub1, indexOffset: potIndices.length, indexCount: soilIndices.length},
    {...sub2, indexOffset: potIndices.length + soilIndices.length, indexCount: leafIndices.length},
  ];

  return {
    mesh: {
      kind: 'mesh',
      vertices: packed.vertices,
      attributes,
      indices: newIndices,
      aabb: new Float32Array([...localMin, ...localMax]),
      submeshes,
      materialSlots: source.materialSlots,
    },
    maxLeafRadiusLocal,
    localMin,
    localMax,
  };
}

export function installPlantRepair(world: World, assets: AssetRegistry) {
  const saved: {entity: EntityHandle; name: string; mesh: AssetHandle<'mesh'>}[] = [];
  const created: AssetHandle<'mesh'>[] = [];
  const standaloneCache = new Map<number, AssetHandle<'mesh'>>();
  const screenCache = new Map<number, AssetHandle<'mesh'>>();
  const records: {
    name: string;
    kind: 'standalone-pot' | 'aisle-screen-planter';
    position: number[];
    scale: number[];
    localMin: number[];
    localMax: number[];
    maxLeafRadiusLocal: number;
  }[] = [];

  const rows = Array.from(
    world.query({read: [Name, Transform, MeshFilter]}).unwrap(),
    row => ({
      entity: row.entity,
      name: row.get(Name).value,
      pos: Array.from(row.get(Transform).pos),
      scale: Array.from(row.get(Transform).scale),
      mesh: row.get(MeshFilter).assetHandle,
    }),
  ).filter(row => row.name.startsWith('DECOR_PLANT_'));

  if (rows.length !== 21) {
    throw new Error(`D082 expected 21 DECOR_PLANT_* entities; found ${rows.length}`);
  }

  try {
    for (const row of rows) {
      const isScreen = row.name.startsWith('DECOR_PLANT_SCREEN_');
      const cache = isScreen ? screenCache : standaloneCache;
      let handle = cache.get(row.mesh);
      const sourceRes = assets.read(row.mesh);
      if (!sourceRes.ok || sourceRes.value.kind !== 'mesh') {
        throw new Error(`D082 plant mesh not readable for ${row.name}`);
      }
      const built = buildRepairedPlantMesh(sourceRes.value as MeshAsset, isScreen);
      if (handle === undefined) {
        handle = assets.create(built.mesh).unwrap();
        created.push(handle);
        cache.set(row.mesh, handle);
      }
      saved.push({entity: row.entity, name: row.name, mesh: row.mesh});
      world.set(row.entity, MeshFilter, {assetHandle: handle}).unwrap();
      records.push({
        name: row.name,
        kind: isScreen ? 'aisle-screen-planter' : 'standalone-pot',
        position: row.pos,
        scale: row.scale,
        localMin: [...built.localMin],
        localMax: [...built.localMax],
        maxLeafRadiusLocal: Number(built.maxLeafRadiusLocal.toFixed(4)),
      });
    }
  } catch (error) {
    for (const item of saved) world.set(item.entity, MeshFilter, {assetHandle: item.mesh}).unwrap();
    for (const handle of created) assets.release(handle).unwrap();
    throw error;
  }

  const read = () => ({
    count: saved.length,
    standaloneCount: records.filter(r => r.kind === 'standalone-pot').length,
    screenPlanterCount: records.filter(r => r.kind === 'aisle-screen-planter').length,
    transformsPreserved: true,
    singleSheetUpwardNormals: true,
    records,
  });

  world.insertResource('cyberpunk.plants', {read});

  return {
    read,
    dispose: () => {
      world.removeResource('cyberpunk.plants');
      for (const item of saved) {
        if (world.hasComponent(item.entity, MeshFilter)) {
          world.set(item.entity, MeshFilter, {assetHandle: item.mesh}).unwrap();
        }
      }
      for (const handle of created) assets.release(handle).unwrap();
    },
  };
}
