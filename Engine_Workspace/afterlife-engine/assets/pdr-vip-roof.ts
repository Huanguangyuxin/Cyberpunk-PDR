import type {MeshAsset} from '@forgeax/engine/types';

export const isVipShell = (name: string) => /^VIP_[EW][12]_SHELL$/.test(name);

const shellWallTop = 6.60;
const topHanger = 8.20;
const atHeight = (y: number, height: number) => Math.abs(y - height) < .002;

// The shared roof covers the whole gallery. Extend the authored partitions into
// it and remove only the low lid and the accent strips attached to that lid.
export function connectVipToSharedRoof(mesh: MeshAsset, positions: Float32Array, roofY: number) {
  const {position: source, normal, uv: sourceUv} = mesh.attributes;
  const originalIndices = mesh.indices;
  if (!(source instanceof Float32Array && normal instanceof Float32Array &&
        sourceUv instanceof Float32Array && originalIndices)) {
    throw new Error('A VIP shell needs indexed position, normal and UV data');
  }
  const uv = new Float32Array(sourceUv);
  const indices: number[] = [];
  const submeshes: MeshAsset['submeshes'][number][] = [];
  let lidTriangles = 0;
  let trimTriangles = 0;
  let wallVertices = 0;
  let hangerVertices = 0;
  for (const part of mesh.submeshes) {
    const slot = mesh.materialSlots[part.materialSlot].slotName;
    const offset = indices.length;
    if (slot === 'WB015_M_ROOF_DARK') {
      lidTriangles += part.indexCount / 3;
      continue;
    }
    for (let i = part.indexOffset; i < part.indexOffset + part.indexCount; i += 3) {
      const triangle = [originalIndices[i], originalIndices[i + 1], originalIndices[i + 2]];
      if (slot === 'WB015_M_PLINTH_PINK' && triangle.every(vertex => source[vertex * 3 + 1] > 6.5)) {
        trimTriangles++;
        continue;
      }
      for (const vertex of triangle) {
        const y = vertex * 3 + 1;
        const authoredY = source[y];
        const dy = roofY - positions[y];
        if (dy <= .001) continue;
        if (slot === 'WB015_M_WALL_NAVY' && atHeight(authoredY, shellWallTop)) {
          // The authored wall UV is vertical −0.5 repeats per metre.
          if (Math.abs(normal[y]) < .5) uv[vertex * 2 + 1] -= dy * .5;
          positions[y] = roofY;
          wallVertices++;
        } else if (slot === 'WB015_M_CHROME' &&
                   (atHeight(authoredY, topHanger) || atHeight(authoredY, shellWallTop))) {
          positions[y] = roofY;
          hangerVertices++;
        }
      }
      indices.push(...triangle);
    }
    if (indices.length > offset) submeshes.push({...part, indexOffset:offset, indexCount:indices.length-offset});
  }
  if (!lidTriangles || !wallVertices || !hangerVertices) throw new Error('VIP roof join did not resolve its lid, wall and hangers');

  const bounds = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
  for (const vertex of indices) {
    for (let axis=0; axis<3; axis++) {
      const component = positions[vertex*3 + axis];
      bounds[axis] = Math.min(bounds[axis], component);
      bounds[axis+3] = Math.max(bounds[axis+3], component);
    }
  }
  return {
    indices: Uint32Array.from(indices),
    submeshes,
    aabb: new Float32Array(bounds),
    uv,
    stats: {lidTriangles, trimTriangles, wallVertices, hangerVertices, joinY:roofY},
  };
}
