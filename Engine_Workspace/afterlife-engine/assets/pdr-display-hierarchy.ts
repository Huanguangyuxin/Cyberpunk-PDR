/** D063/D084/D085: native depth-tested display hierarchy, coplanar/degenerate triangle removal,
 * per-box decal de-confliction across all 182 wall/column/pylon decals, booth coaster/stitch/patch cleanup,
 * and deterministic micro-layering. Preserves all furniture outer bounds and collision roster.
 */
import type {AssetRegistry} from '@forgeax/engine/assets-runtime';
import type {EntityHandle, World} from '@forgeax/engine/ecs';
import {packInterleavedVertexAttributes} from '@forgeax/engine/geometry';
import {Layer, MeshFilter, MeshRenderer} from '@forgeax/engine/render';
import {Name} from '@forgeax/engine/scene';
import type {AssetHandle, MaterialAsset, MeshAsset} from '@forgeax/engine/types';

const TIER_4_SLOTS = new Set([
  'M_OPAL_PINK', 'WB015_M_OPAL_PINK', 'M_OPAL_PINK_DIM', 'WB015_M_OPAL_PINK_DIM',
  'M_STEP_LED', 'WB015_M_STEP_LED', 'WB015_M_PLINTH_PINK', 'WB015_M_FRAME_PINK',
  'WB015_M_COVE_BLUE', 'WB015_M_UPLIGHT', 'WB015_M_OPAL_WHITE', 'WB015_M_BAND_LAV',
  'WB015_M_BAND_VOID', 'M18_BASE_LED_PINK', 'M18_TALL_PANEL_PINK', 'M18_BAND_COOL',
  'M18_BAND_COOL_DIM', 'M_BULB_WARM', 'WB015_M_BULB_WARM', 'M_LAMP_OPAL',
  'WB015_M_LAMP_OPAL', 'M_LED_NOSIGNAL', 'M_LED_TICKER', 'WB015_M_LED_BLUE',
  'M_NEON_CYAN', 'M_NEON_PINK', 'M_NEON_AMBER', 'M_NEON_RED', 'M_NEON_PINKW',
  'M_SCREEN', 'M_STICKER', 'WB015_M_STICKER', 'M_TAPE', 'WB015_M_TAPE', 'WB015_M_STITCH',
]);

const TIER_3_SLOTS = new Set([
  'M_POSTER', 'WB015_M_POSTER', 'M_BIG_POSTER', 'M_STENCIL', 'M_PLASTER_PATCH',
  'M_WALL_COLLAGE', 'M_FLOOR_BORDER', 'M18_ACOUSTIC_WEAVE', 'M_PERF_STEEL',
  'WB015_M_PERF_STEEL', 'M_SPEAKER_GRILLE', 'WB015_M_SPEAKER_GRILLE',
  'M_LEATHER_PATCH', 'WB015_M_LEATHER_PATCH', 'M_SOIL', 'WB015_M_SOIL', 'M_CONE',
  'WB015_M_GLASS_DOOR', 'M_GLASS_DOOR', 'WB015_M_GLASS_GUARD',
]);

const TIER_2_SLOTS = new Set([
  'M_CHROME', 'WB015_M_CHROME', 'M_STEEL_EDGE', 'WB015_M_STEEL_EDGE',
  'M_LEATHER_WINE', 'WB015_M_LEATHER_WINE', 'WB015_M_VINYL_CONTACT',
  'M_LEATHER_WORN', 'WB015_M_LEATHER_WORN', 'M_COUNTER_STEEL',
  'WB015_M_COUNTER_STEEL', 'M_RUBBER', 'WB015_M_RUBBER', 'M_PLASTIC_BLACK',
  'WB015_M_PLASTIC_BLACK',
]);

const TIER_1_SLOTS = new Set([
  'M_STEEL_NAVY', 'WB015_M_STEEL_NAVY', 'WB015_M_GALV', 'M18_BULKHEAD_DARK',
  'M_STEEL_BLACK', 'WB015_M_STEEL_BLACK',
]);

function slotTier(slotName: string): number {
  if (TIER_4_SLOTS.has(slotName)) return 4;
  if (TIER_3_SLOTS.has(slotName)) return 3;
  if (TIER_2_SLOTS.has(slotName)) return 2;
  if (TIER_1_SLOTS.has(slotName)) return 1;
  return 0;
}

const DECAL_PRIORITY_ORDER = new Map<string, number>([
  ['ARCH_PYLONS', 1],
  ['DECOR_WALL_COLLAGE', 2],
  ['DECOR_COMPOSED_WALLS', 3],
  ['DECOR_WALL_HISTORY_RACEWAYS', 4],
  ['DECOR_BIG_POSTERS_PANELS', 5],
  ['DECOR_POSTERS', 6],
  ['DECOR_STICKERS', 7],
]);

const DECAL_BOX_SLOTS = new Set([
  'M_WALL_COLLAGE', 'M_PLASTER_PATCH', 'M_STENCIL', 'M_POSTER', 'M_BIG_POSTER', 'M_STICKER',
]);

function decalMaterialLayerClass(slotName: string): number {
  if (slotName === 'M_WALL_COLLAGE') return 0;
  if (slotName === 'M_PLASTER_PATCH') return 1;
  if (slotName === 'M_STENCIL') return 2;
  if (slotName === 'M_BIG_POSTER' || slotName === 'M_POSTER') return 3;
  if (slotName === 'M_STICKER') return 4;
  return 3;
}

const WALL_MOUNTED_DECOR_OBJECTS = new Set([
  'SIGN_COCKTAIL_01', 'SIGN_EYE_01', 'SIGN_LIPS_01', 'SIGN_LIPS_02',
  'SIGN_NOSIGNAL', 'SIGN_TICKER', 'SIGN_WOMAN_01', 'SIGN_WOMAN_02',
  'WPANEL_PYLON_E1', 'WPANEL_PYLON_E2', 'WPANEL_PYLON_W2',
  'WPANEL_W1', 'WPANEL_W2', 'WPANEL_W3', 'WPANEL_W4',
  'WPANEL_UE1', 'WPANEL_UE2', 'WPANEL_UE3', 'WPANEL_UW1', 'WPANEL_UW2', 'WPANEL_UW3',
  'ENTRY_POST_E', 'ENTRY_POST_W',
  'FIX_SIDE_LIGHT_BARS_SCONCES', 'FIX_UPLIGHT_E', 'FIX_UPLIGHT_W',
]);

const EMISSIVE_STRIP_OBJECTS = new Set([
  'ARCH_COLUMNS_WB015', 'FIX_SIDE_LIGHT_BARS_SCONCES', 'WB018_BASE_LED_LINES',
  'WB018_STAGE_FLANK_PANELS', 'WB018_ROOF_LIGHT_BANDS_COOL', 'WB018_CEIL_BAND_FRONT',
  'CEIL_L_01', 'CEIL_L_02', 'CEIL_L_03', 'CEIL_L_04', 'CEIL_L_05', 'CEIL_L_06',
  'ENTRY_POST_E', 'ENTRY_POST_W', 'WPANEL_PYLON_E1', 'WPANEL_PYLON_E2', 'WPANEL_PYLON_W2',
  'WPANEL_W1', 'WPANEL_W2', 'WPANEL_W3', 'WPANEL_W4',
  'WPANEL_UW1', 'WPANEL_UW2', 'WPANEL_UW3', 'WPANEL_UE1', 'WPANEL_UE2', 'WPANEL_UE3',
]);

const CEILING_DIFFUSER_SLOTS = new Set([
  'M18_BAND_COOL', 'M18_BAND_COOL_DIM', 'WB015_M_OPAL_WHITE',
]);

const PILLAR_VERTICAL_STRIP_SLOTS = new Set([
  'M_OPAL_PINK', 'WB015_M_OPAL_PINK', 'M18_BASE_LED_PINK', 'M18_TALL_PANEL_PINK',
]);

interface PlacedDecalQuad {
  readonly axis: number;
  readonly sign: number;
  readonly frontCoord: number;
  readonly min: readonly [number, number, number];
  readonly max: readonly [number, number, number];
}

interface TriRecord {
  readonly subIndex: number;
  readonly slotName: string;
  readonly tier: number;
  readonly i0: number;
  readonly i1: number;
  readonly i2: number;
  readonly nx: number;
  readonly ny: number;
  readonly nz: number;
  readonly vnx: number;
  readonly vny: number;
  readonly vnz: number;
  readonly d: number;
  readonly minX: number;
  readonly minY: number;
  readonly minZ: number;
  readonly maxX: number;
  readonly maxY: number;
  readonly maxZ: number;
  readonly cx: number;
  readonly cy: number;
  readonly cz: number;
  readonly area: number;
  removed: boolean;
}

function expectedFrontNormalSign(cx: number, cy: number, cz: number, thinAxis: number): number {
  if (thinAxis === 1) {
    return cy < 4.5 ? 1.0 : -1.0;
  }
  if (thinAxis === 0) {
    if (cz > -21.8 && cz < -20.5) {
      for (const px of [-8.0, -4.2, 4.2, 8.0]) {
        if (Math.abs(cx - px) < 0.6) return cx > px ? 1.0 : -1.0;
      }
    }
    if (cz < -19.5) {
      for (const colx of [-10.55, -8.45, 8.45, 10.55]) {
        if (Math.abs(cx - colx) < 0.45) return cx > colx ? 1.0 : -1.0;
      }
    }
    return cx < 0 ? 1.0 : -1.0;
  }
  // thinAxis === 2 (Z)
  if (cz > -1.0) return -1.0;
  if (cz > -21.8 && cz < -20.5 && Math.abs(cx) < 9.0) {
    return cz > -21.2 ? 1.0 : -1.0;
  }
  for (const colz of [-20.0, -26.9, -32.5, -38.1, -43.7]) {
    if (Math.abs(cz - colz) < 0.35 && Math.abs(Math.abs(cx) - 10.55) < 0.5) {
      return cz > colz ? 1.0 : -1.0;
    }
  }
  if (cz < -38.5) return 1.0;
  return cz < -22.0 ? 1.0 : -1.0;
}

function isRoomFacingNormal(cx: number, cy: number, cz: number, vnx: number, vny: number, vnz: number): boolean {
  const ax = Math.abs(vnx), ay = Math.abs(vny), az = Math.abs(vnz);
  const thinAxis = ay >= ax && ay >= az ? 1 : ax >= az ? 0 : 2;
  const sgn = expectedFrontNormalSign(cx, cy, cz, thinAxis);
  const comp = thinAxis === 0 ? vnx : thinAxis === 1 ? vny : vnz;
  return comp * sgn >= 0;
}

function aabb2DOverlap(a: TriRecord, b: TriRecord, tol = 0.001): boolean {
  let overlapAxes = 0;
  if (Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX) < -tol) return false;
  if (Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY) < -tol) return false;
  if (Math.min(a.maxZ, b.maxZ) - Math.max(a.minZ, b.minZ) < -tol) return false;
  if (Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX) > 0.004) overlapAxes++;
  if (Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY) > 0.004) overlapAxes++;
  if (Math.min(a.maxZ, b.maxZ) - Math.max(a.minZ, b.minZ) > 0.004) overlapAxes++;
  return overlapAxes >= 2;
}

function aabbContainedIn(inner: TriRecord, outer: TriRecord, margin = 0.003): boolean {
  return (
    inner.minX >= outer.minX - margin &&
    inner.maxX <= outer.maxX + margin &&
    inner.minY >= outer.minY - margin &&
    inner.maxY <= outer.maxY + margin &&
    inner.minZ >= outer.minZ - margin &&
    inner.maxZ <= outer.maxZ + margin
  );
}

export function installDisplayHierarchy(world: World, assets: AssetRegistry) {
  const saved: {entity: EntityHandle; layer?: number; mesh: AssetHandle<'mesh'>; materials: number[]}[] = [];
  const created: AssetHandle<'mesh' | 'material'>[] = [];
  const dedup = new Map<string, AssetHandle<'mesh'>>();
  const details: unknown[] = [];
  const biasCache = new Map<number, AssetHandle<'material'>>();
  const placedDecalQuads: PlacedDecalQuad[] = [];

  const rows = Array.from(
    world.query({read: [Name, MeshFilter, MeshRenderer]}).unwrap(),
    row => ({
      entity: row.entity,
      name: row.get(Name).value,
      handle: row.get(MeshFilter).assetHandle,
      materials: Array.from(row.get(MeshRenderer).materials),
    }),
  ).sort((a, b) => {
    const pa = DECAL_PRIORITY_ORDER.get(a.name) ?? 0;
    const pb = DECAL_PRIORITY_ORDER.get(b.name) ?? 0;
    return pa - pb;
  });

  for (const {entity, name, handle, materials} of rows) {
    const prior = world.get(entity, Layer);
    const liquid = name.startsWith('DRINK_') && name.endsWith('_LIQUID');
    const glass = name.startsWith('DRINK_') && name.endsWith('_GLASS');
    const isDecalObject = DECAL_PRIORITY_ORDER.has(name) && name !== 'ARCH_PYLONS';
    const overlay =
      isDecalObject ||
      (WALL_MOUNTED_DECOR_OBJECTS.has(name) && !name.startsWith('FIX_UPLIGHT_')) ||
      name === 'ARCH_FLOOR_INLAY';
    // Keep wall posters and wall decorations on Layer 0 so they render in the main GBuffer pass
    // (participating in GTAO, SSR, and deferred lighting) rather than Layer 5 overlay pass.
    const layer = liquid ? 10 : glass ? 20 : 0;

    saved.push({entity, layer: prior.ok ? prior.value.value : undefined, mesh: handle, materials});
    if (prior.ok) world.set(entity, Layer, {value: layer}).unwrap();
    else world.addComponent(entity, {component: Layer, data: {value: layer}}).unwrap();

    const read = assets.read(handle);
    if (!read.ok || read.value.kind !== 'mesh') continue;
    const mesh = read.value as MeshAsset;

    if (!liquid && !glass && !name.startsWith('CALIB') && !name.startsWith('PDR/') && !name.startsWith('DECOR_PLANT_')) {
      const isGroundBooth = /^BOOTH_(?:DE|DW|F)\d+$/.test(name);
      const isUpperBooth = /^BOOTH_U[EW]\d+$/.test(name);
      const isBooth = isGroundBooth || isUpperBooth;
      const hasPerEntityDecal = DECAL_PRIORITY_ORDER.has(name);
      const needsPerEntityClean =
        hasPerEntityDecal ||
        EMISSIVE_STRIP_OBJECTS.has(name) ||
        WALL_MOUNTED_DECOR_OBJECTS.has(name) ||
        name === 'ARCH_FLOOR_INLAY' ||
        name === 'ARCH_SKIRTING' ||
        name === 'ARCH_DECK_BEAMS_FASCIA' ||
        name === 'FURN_AISLE_SCREENS' ||
        name === 'STAGE_PLATFORM_DJ' ||
        name === 'SIGN_TICKER' ||
        name === 'SIGN_NOSIGNAL' ||
        name === 'SPK_E' ||
        name === 'SPK_W' ||
        name === 'LA_E' ||
        name === 'LA_W' ||
        name.startsWith('MEP_') ||
        name.startsWith('VIP_');
      const cacheKey = needsPerEntityClean ? `${handle}:${name}` : `${handle}`;

      if (!dedup.has(cacheKey)) {
        const p0 = mesh.attributes.position;
        const n0 = mesh.attributes.normal;
        const uv0 = mesh.attributes.uv;
        const old = mesh.indices;
        if (
          p0 instanceof Float32Array &&
          n0 instanceof Float32Array &&
          (old instanceof Uint16Array || old instanceof Uint32Array)
        ) {
          const p = new Float32Array(p0);
          const n = new Float32Array(n0);
          const uv = uv0 instanceof Float32Array ? new Float32Array(uv0) : undefined;
          let positionsModified = false;
          let normalsModified = false;
          let uvsModified = false;
          let removedCount = 0;

          if (name === 'ARCH_FLOOR_INLAY') {
            // Reconstruct ARCH_FLOOR_INLAY as a watertight, zero-overlap, zero-T-junction manifold grid at y = 0.0090m
            const posList: number[] = [];
            const nrmList: number[] = [];
            const uvList: number[] = [];
            const tanList: number[] = [];
            const idxList: number[] = [];
            const yInlay = 0.009;
            const addLongitudinalQuad = (x0: number, x1: number, za: number, zb: number, v0: number, v1: number) => {
              const ua = ((-0.6 - za) / 18.6) * 7.75;
              const ub = ((-0.6 - zb) / 18.6) * 7.75;
              const base = posList.length / 3;
              posList.push(x0, yInlay, za, x1, yInlay, za, x1, yInlay, zb, x0, yInlay, zb);
              nrmList.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0);
              uvList.push(ua, v0, ua, v1, ub, v1, ub, v0);
              tanList.push(0, 0, -1, -1, 0, 0, -1, -1, 0, 0, -1, -1, 0, 0, -1, -1);
              idxList.push(base, base + 1, base + 2, base, base + 2, base + 3);
            };
            const addTransverseQuad = (xa: number, xb: number, z0: number, z1: number) => {
              const ua = ((xa + 4.45) / 8.9) * (44.5 / 12);
              const ub = ((xb + 4.45) / 8.9) * (44.5 / 12);
              const base = posList.length / 3;
              posList.push(xa, yInlay, z0, xb, yInlay, z0, xb, yInlay, z1, xa, yInlay, z1);
              nrmList.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0);
              uvList.push(ua, 1, ub, 1, ub, 0, ua, 0);
              tanList.push(1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1);
              idxList.push(base, base + 1, base + 2, base, base + 2, base + 3);
            };
            const zIntervals: readonly [number, number, boolean][] = [
              [-0.6, -3.85, false],
              [-3.85, -4.15, true],
              [-4.15, -7.85, false],
              [-7.85, -8.15, true],
              [-8.15, -11.85, false],
              [-11.85, -12.15, true],
              [-12.15, -15.85, false],
              [-15.85, -16.15, true],
              [-16.15, -19.2, false],
            ];
            const xIntervals: readonly [number, number][] = [
              [-4.45, -2.075],
              [-2.075, -1.925],
              [-1.925, 1.925],
              [1.925, 2.075],
              [2.075, 4.45],
            ];
            for (const [za, zb, isCross] of zIntervals) {
              // Outer longitudinal strips subdivided at every Z-interval so T-junctions at x = +-4.45 share exact vertices
              addLongitudinalQuad(-4.75, -4.45, za, zb, 1, 0);
              addLongitudinalQuad(4.45, 4.75, za, zb, 1, 0);
              if (!isCross) {
                // Inner longitudinal strips emitted only in non-crossing intervals
                addLongitudinalQuad(-2.075, -1.925, za, zb, 0.8, 0.2);
                addLongitudinalQuad(1.925, 2.075, za, zb, 0.8, 0.2);
              } else {
                // Transverse cross strips subdivided at x = +-2.075 and +-1.925 so crossings share exact vertices
                for (const [xa, xb] of xIntervals) {
                  addTransverseQuad(xa, xb, za, zb);
                }
              }
            }
            const inlayAttrs = {
              position: new Float32Array(posList),
              normal: new Float32Array(nrmList),
              uv: new Float32Array(uvList),
              tangent: new Float32Array(tanList),
            };
            const inlayVerts = packInterleavedVertexAttributes(inlayAttrs, posList.length / 3).unwrap().vertices;
            const inlayHandle = assets.create({
              ...mesh,
              attributes: inlayAttrs,
              vertices: inlayVerts,
              indices: new Uint32Array(idxList),
              submeshes: [{...mesh.submeshes[0], indexOffset: 0, indexCount: idxList.length, vertexCount: posList.length / 3}],
            }).unwrap();
            created.push(inlayHandle);
            dedup.set(cacheKey, inlayHandle);
            details.push({name, nonOverlappingSegmentsRebuilt: true});
          } else {

          const allTris: TriRecord[] = [];
          const subTris: TriRecord[][] = mesh.submeshes.map(() => []);
          const vertexTouched = new Uint8Array(p.length / 3);
          const vertexOffsets = new Float32Array(p.length);
          const markOffset = (vIdx: number, ox: number, oy: number, oz: number) => {
            if (vertexTouched[vIdx]) return;
            vertexTouched[vIdx] = 1;
            vertexOffsets[vIdx * 3] = ox;
            vertexOffsets[vIdx * 3 + 1] = oy;
            vertexOffsets[vIdx * 3 + 2] = oz;
            positionsModified = true;
          };

          for (let sIdx = 0; sIdx < mesh.submeshes.length; sIdx++) {
            const sub = mesh.submeshes[sIdx];
            const slotName = mesh.materialSlots[sub.materialSlot]?.slotName ?? '';
            const tier = slotTier(slotName);

            // Preserve ground booth slot 10 (M_PERF_STEEL, 72 indices) verbatim for pdr-other-screens.ts createBoothGrid
            if (isGroundBooth && slotName === 'M_PERF_STEEL') {
              for (let i = sub.indexOffset; i < sub.indexOffset + sub.indexCount; i += 3) {
                const i0 = old[i], i1 = old[i + 1], i2 = old[i + 2];
                subTris[sIdx].push({
                  subIndex: sIdx, slotName, tier, i0, i1, i2,
                  nx: 0, ny: 0, nz: 1, vnx: 0, vny: 0, vnz: 1, d: 0,
                  minX: 0, minY: 0, minZ: 0, maxX: 0, maxY: 0, maxZ: 0,
                  cx: 0, cy: 0, cz: 0, area: 1, removed: false,
                });
              }
              continue;
            }

            // Drop redundant floor patch inside VIP shells that Z-fights with ARCH_UPPER_DECK
            if (name.startsWith('VIP_') && name.endsWith('_SHELL') && slotName === 'WB015_M_DANCE_TILE') {
              removedCount += sub.indexCount / 3;
              continue;
            }
            // Drop coplanar M_STEEL_BLACK backing under ARCH_FLOOR_INLAY
            if (name === 'ARCH_FLOOR_INLAY' && slotName === 'M_STEEL_BLACK') {
              removedCount += sub.indexCount / 3;
              continue;
            }
            // Drop coplanar WB015_M_STEEL_NAVY duplicate column shell in ARCH_COLUMNS_WB015
            if (name === 'ARCH_COLUMNS_WB015' && slotName === 'WB015_M_STEEL_NAVY') {
              removedCount += sub.indexCount / 3;
              continue;
            }

            // Per-box de-confliction for all 182 12-triangle decal boxes across ARCH_PYLONS and DECOR_*
            // Preserves all 4 side edges + front face (10 triangles per box) as a 2.5mm physical 3D plaque,
            // removing only the hidden wall-facing back face (2 triangles), repairing world-space UVs on
            // M_WALL_COLLAGE and M_STICKER so no poster is sliced across UV wrap boundaries, and resolving
            // 2D collisions with 3D wall sconces, handrails, cable trays, and canopies.
            if (hasPerEntityDecal && DECAL_BOX_SLOTS.has(slotName) && sub.indexCount % 36 === 0) {
              interface BoxCandidate {
                readonly bStart: number;
                readonly boxIdx: number;
                readonly origMn: [number, number, number];
                readonly origMx: [number, number, number];
                readonly mn: [number, number, number];
                readonly mx: [number, number, number];
                readonly thinAxis: number;
                readonly cx: number;
                readonly cy: number;
                readonly cz: number;
                readonly sgn: number;
                readonly origBack: number;
                readonly origFront: number;
                readonly area2d: number;
              }
              const collageTargets: readonly {y: [number, number]; z?: [number, number]; x?: [number, number]}[] = [
                {y: [1.72, 2.48], z: [-24.45, -23.55]},
                {y: [1.72, 2.48], z: [-32.45, -31.55]},
                {y: [1.72, 2.48], z: [-26.35, -25.45]},
                {y: [1.72, 2.48], z: [-34.65, -33.75]},
                {y: [3.80, 5.20], z: [-22.60, -21.40]},
                {y: [4.95, 5.95], z: [-29.40, -28.50]},
                {y: [4.95, 5.95], z: [-28.80, -27.80]},
                {y: [4.95, 5.95], z: [-38.60, -37.60]},
                {x: [-12.50, -11.30], y: [1.20, 2.60]},
                {x: [-6.30, -5.10], y: [1.20, 2.60]},
                {x: [4.20, 5.40], y: [1.20, 2.60]},
                {x: [11.20, 12.40], y: [1.20, 2.60]},
                {x: [-10.00, -8.90], y: [0.80, 2.20]},
                {x: [8.90, 10.00], y: [0.80, 2.20]},
              ];
              const collageUvRects: readonly [number, number, number, number][] = [
                [0.098, 0.348, 0.105, 0.441],
                [0.570, 0.785, 0.195, 0.570],
                [0.363, 0.574, 0.621, 0.990],
                [0.152, 0.289, 0.512, 0.773],
              ];
              const boxCandidates: BoxCandidate[] = [];
              for (let bStart = sub.indexOffset; bStart < sub.indexOffset + sub.indexCount; bStart += 36) {
                const boxIdx = (bStart - sub.indexOffset) / 36;
                const origMn: [number, number, number] = [Infinity, Infinity, Infinity];
                const origMx: [number, number, number] = [-Infinity, -Infinity, -Infinity];
                for (let k = bStart; k < bStart + 36; k++) {
                  const vi = old[k];
                  const vx = p0[vi * 3], vy = p0[vi * 3 + 1], vz = p0[vi * 3 + 2];
                  if (vx < origMn[0]) origMn[0] = vx;
                  if (vy < origMn[1]) origMn[1] = vy;
                  if (vz < origMn[2]) origMn[2] = vz;
                  if (vx > origMx[0]) origMx[0] = vx;
                  if (vy > origMx[1]) origMx[1] = vy;
                  if (vz > origMx[2]) origMx[2] = vz;
                }
                const mn: [number, number, number] = [...origMn];
                const mx: [number, number, number] = [...origMx];
                const sz = [mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]];
                const thinAxis = sz[0] <= sz[1] && sz[0] <= sz[2] ? 0 : sz[1] <= sz[2] ? 1 : 2;

                // Drop redundant pylon +Z decals where 3D sconces (WPANEL_PYLON_E1/E2/W2) or neon sign (SIGN_WOMAN_01) are mounted
                if (name === 'ARCH_PYLONS' && slotName === 'M_WALL_COLLAGE') {
                  if (boxIdx === 0 || boxIdx === 4 || boxIdx === 8 || boxIdx === 12) {
                    removedCount += 12;
                    continue;
                  }
                  if (boxIdx % 4 === 2 || boxIdx % 4 === 3) {
                    mn[2] = -21.55;
                    mx[2] = -20.85;
                  }
                }
                if (name === 'DECOR_COMPOSED_WALLS' && slotName === 'M_BIG_POSTER' && boxIdx <= 2) {
                  removedCount += 12;
                  continue;
                }

                // Reposition DECOR_WALL_COLLAGE boxes into clear wall spaces so booths/sconces/partitions never cut through them
                if (name === 'DECOR_WALL_COLLAGE' && slotName === 'M_WALL_COLLAGE' && boxIdx < collageTargets.length) {
                  const tgt = collageTargets[boxIdx];
                  mn[1] = tgt.y[0];
                  mx[1] = tgt.y[1];
                  if (tgt.z) {
                    mn[2] = tgt.z[0];
                    mx[2] = tgt.z[1];
                  }
                  if (tgt.x) {
                    mn[0] = tgt.x[0];
                    mx[0] = tgt.x[1];
                  }
                }

                // Shift ONLY the specific posters/stencils/plaster_patches that physically collide with 3D wall sconces or cable trays:
                // - DECOR_COMPOSED_WALLS M_POSTER#0..6 (collided with WPANEL_W3 at z=-7.8 and FIX_UPLIGHT_W at z=-7.1)
                // - DECOR_COMPOSED_WALLS M_POSTER#10..16 (collided with BAR_CANOPY horizontal bar at y=2.59)
                // - DECOR_COMPOSED_WALLS M_POSTER#23,30 (grazed STAIR_W/E sloped handrail at z=-18.5, y=3.35)
                // - DECOR_COMPOSED_WALLS M_POSTER#31..37 (collided with WPANEL_W2 at z=-5.2)
                // Keep stair posters M_POSTER#17..22, 24..29 and DECOR_POSTERS#0..2 at their original positions above the sloped handrail!
                if (name === 'DECOR_COMPOSED_WALLS' && slotName === 'M_POSTER') {
                  if (boxIdx >= 0 && boxIdx <= 6) {
                    const dz = boxIdx === 0 || boxIdx === 3 ? -0.35 : -0.88;
                    mn[2] += dz;
                    mx[2] += dz;
                    mn[1] += 0.50;
                    mx[1] += 0.50;
                  } else if (boxIdx >= 10 && boxIdx <= 13) {
                    mn[1] += 0.25;
                    mx[1] += 0.25;
                  } else if (boxIdx >= 14 && boxIdx <= 16) {
                    mn[1] += 0.20;
                    mx[1] += 0.20;
                  } else if (boxIdx === 23 || boxIdx === 30) {
                    mn[1] += 0.12;
                    mx[1] += 0.12;
                  } else if (boxIdx >= 31 && boxIdx <= 37) {
                    mn[1] += 1.58;
                    mx[1] += 1.58;
                  }
                }
                if (name === 'DECOR_COMPOSED_WALLS' && slotName === 'M_PLASTER_PATCH' && (boxIdx === 0 || boxIdx === 5)) {
                  mn[1] += 0.45;
                  mx[1] += 0.45;
                }
                if (name === 'DECOR_COMPOSED_WALLS' && slotName === 'M_STENCIL') {
                  if (boxIdx === 0) {
                    mn[2] = -5.75;
                    mx[2] = -3.55;
                    mn[1] += 0.45;
                    mx[1] += 0.45;
                  } else if (boxIdx === 3) {
                    mn[2] = -18.40;
                    mx[2] = -16.70;
                  }
                }
                if (name === 'DECOR_POSTERS' && slotName === 'M_POSTER' && boxIdx === 3) {
                  mn[2] -= 0.65;
                  mx[2] -= 0.65;
                }
                if (name === 'DECOR_BIG_POSTERS_PANELS' && slotName === 'M_STICKER' && boxIdx === 3) {
                  mn[2] += 1.50;
                  mx[2] += 1.50;
                }

                const cx = 0.5 * (mn[0] + mx[0]);
                const cy = 0.5 * (mn[1] + mx[1]);
                const cz = 0.5 * (mn[2] + mx[2]);
                const sgn = expectedFrontNormalSign(cx, cy, cz, thinAxis);
                const origFront = sgn > 0 ? origMx[thinAxis] : origMn[thinAxis];
                const origBack = sgn > 0 ? origMn[thinAxis] : origMx[thinAxis];
                const other0 = thinAxis === 0 ? 1 : 0;
                const other1 = thinAxis === 2 ? 1 : 2;
                const area2d = (mx[other0] - mn[other0]) * (mx[other1] - mn[other1]);
                boxCandidates.push({bStart, boxIdx, origMn, origMx, mn, mx, thinAxis, cx, cy, cz, sgn, origBack, origFront, area2d});
              }

              boxCandidates.sort((a, b) => {
                if (a.thinAxis === b.thinAxis && a.sgn === b.sgn && Math.abs(a.origFront - b.origFront) < 0.05) {
                  const da = a.origFront * a.sgn;
                  const db = b.origFront * b.sgn;
                  if (Math.abs(da - db) > 0.0004) return da - db;
                  return b.area2d - a.area2d;
                }
                return b.area2d - a.area2d;
              });

              const cls = decalMaterialLayerClass(slotName);
              const minClearance =
                cls === 0 ? 0.006 : cls === 1 ? 0.009 : cls === 2 ? 0.012 : cls === 3 ? 0.015 : 0.021;
              const plaqueThickness = 0.0025;

              for (const box of boxCandidates) {
                const {bStart, boxIdx, origMn, origMx, mn, mx, thinAxis, cx, cy, cz, sgn, origBack, origFront} = box;
                let basePlane = origBack;
                if (thinAxis === 0 && Math.abs(origBack) > 13.98) {
                  basePlane = origBack < 0 ? -14.0 : 14.0;
                } else if (thinAxis === 2 && origBack > -0.02) {
                  basePlane = 0.0;
                } else if (thinAxis === 2 && origBack < -43.98) {
                  basePlane = -44.0;
                } else if (thinAxis === 2 && Math.abs(cz - (-39.20)) < 0.1) {
                  // Stage speaker front stickers (boxes 42..47): clear SPK_W/E rotated cabinet front (z = -39.143m)
                  basePlane = -39.140;
                } else if (thinAxis === 0 && Math.abs(cx - 10.21) < 0.05 && cy < 0.25) {
                  // Lower bar counter stickers (boxes 2, 3, 7, 8): clear BAR_COUNTER_L lower kickplate (x = 10.200m)
                  basePlane = 10.200;
                }

                let targetFront = basePlane + sgn * minClearance;
                if (sgn > 0) targetFront = Math.max(targetFront, origFront + 0.004);
                else targetFront = Math.min(targetFront, origFront - 0.004);

                const other0 = thinAxis === 0 ? 1 : 0;
                const other1 = thinAxis === 2 ? 1 : 2;
                for (const pq of placedDecalQuads) {
                  if (pq.axis !== thinAxis || pq.sign !== sgn) continue;
                  if (Math.abs(pq.frontCoord - origFront) > 0.08) continue;
                  if (Math.min(mx[other0], pq.max[other0]) - Math.max(mn[other0], pq.min[other0]) <= 0.002) continue;
                  if (Math.min(mx[other1], pq.max[other1]) - Math.max(mn[other1], pq.min[other1]) <= 0.002) continue;
                  if (sgn > 0) targetFront = Math.max(targetFront, pq.frontCoord + 0.004);
                  else targetFront = Math.min(targetFront, pq.frontCoord - 0.004);
                }
                const targetBack = targetFront - sgn * plaqueThickness;
                const origMid = 0.5 * (origMn[thinAxis] + origMx[thinAxis]);
                const horizAxis = thinAxis === 0 ? 2 : 0;

                for (let t = bStart; t < bStart + 36; t += 3) {
                  const i0 = old[t], i1 = old[t + 1], i2 = old[t + 2];
                  const vnx = (n0[i0 * 3] + n0[i1 * 3] + n0[i2 * 3]) / 3;
                  const vny = (n0[i0 * 3 + 1] + n0[i1 * 3 + 1] + n0[i2 * 3 + 1]) / 3;
                  const vnz = (n0[i0 * 3 + 2] + n0[i1 * 3 + 2] + n0[i2 * 3 + 2]) / 3;
                  const vnComp = thinAxis === 0 ? vnx : thinAxis === 1 ? vny : vnz;
                  // Remove only the hidden wall-facing back face; keep front face + 4 physical side edges
                  if (vnComp * sgn < -0.8) {
                    removedCount++;
                    continue;
                  }
                  const isFrontFace = vnComp * sgn > 0.8;
                  for (const vi of [i0, i1, i2]) {
                    if (!vertexTouched[vi]) {
                      vertexTouched[vi] = 1;
                      const origCoord = p0[vi * 3 + thinAxis];
                      const isFrontVert = sgn > 0 ? origCoord >= origMid : origCoord <= origMid;
                      p[vi * 3 + thinAxis] = isFrontVert ? targetFront : targetBack;
                      for (const ax of [other0, other1]) {
                        const span = origMx[ax] - origMn[ax];
                        if (span > 1e-5) {
                          const frac = (p0[vi * 3 + ax] - origMn[ax]) / span;
                          p[vi * 3 + ax] = mn[ax] + frac * (mx[ax] - mn[ax]);
                        }
                      }
                      positionsModified = true;
                    }
                    if (uv && (slotName === 'M_WALL_COLLAGE' || (name === 'DECOR_BIG_POSTERS_PANELS' && slotName === 'M_STICKER'))) {
                      if (isFrontFace) {
                        const spanH = Math.max(1e-5, mx[horizAxis] - mn[horizAxis]);
                        const spanY = Math.max(1e-5, mx[1] - mn[1]);
                        const fh = (p[vi * 3 + horizAxis] - mn[horizAxis]) / spanH;
                        const fy = (p[vi * 3 + 1] - mn[1]) / spanY;
                        if (slotName === 'M_WALL_COLLAGE') {
                          const rect = collageUvRects[boxIdx % collageUvRects.length];
                          uv[vi * 2] = rect[0] + fh * (rect[1] - rect[0]);
                          uv[vi * 2 + 1] = rect[3] - fy * (rect[3] - rect[2]);
                        } else {
                          uv[vi * 2] = 0.256 + fh * (0.494 - 0.256);
                          uv[vi * 2 + 1] = 0.190 - fy * (0.190 - 0.060);
                        }
                      } else {
                        uv[vi * 2] = 0.005;
                        uv[vi * 2 + 1] = 0.995;
                      }
                      uvsModified = true;
                    }
                  }
                  const x0 = p[i0 * 3], y0 = p[i0 * 3 + 1], z0 = p[i0 * 3 + 2];
                  const x1 = p[i1 * 3], y1 = p[i1 * 3 + 1], z1 = p[i1 * 3 + 2];
                  const x2 = p[i2 * 3], y2 = p[i2 * 3 + 1], z2 = p[i2 * 3 + 2];
                  subTris[sIdx].push({
                    subIndex: sIdx, slotName, tier, i0, i1, i2,
                    nx: vnx, ny: vny, nz: vnz,
                    vnx, vny, vnz,
                    d: vnx * x0 + vny * y0 + vnz * z0,
                    minX: Math.min(x0, x1, x2), minY: Math.min(y0, y1, y2), minZ: Math.min(z0, z1, z2),
                    maxX: Math.max(x0, x1, x2), maxY: Math.max(y0, y1, y2), maxZ: Math.max(z0, z1, z2),
                    cx: (x0 + x1 + x2) / 3, cy: (y0 + y1 + y2) / 3, cz: (z0 + z1 + z2) / 3,
                    area: 1, removed: false,
                  });
                }
                placedDecalQuads.push({axis: thinAxis, sign: sgn, frontCoord: targetFront, min: mn, max: mx});
              }
              continue;
            }

            const seenExact = new Set<string>();
            for (let i = sub.indexOffset; i < sub.indexOffset + sub.indexCount; i += 3) {
              const i0 = old[i];
              let i1 = old[i + 1], i2 = old[i + 2];
              const x0 = p0[i0 * 3], y0 = p0[i0 * 3 + 1], z0 = p0[i0 * 3 + 2];
              const x1 = p0[i1 * 3], y1 = p0[i1 * 3 + 1], z1 = p0[i1 * 3 + 2];
              const x2 = p0[i2 * 3], y2 = p0[i2 * 3 + 1], z2 = p0[i2 * 3 + 2];

              const ex1 = x1 - x0, ey1 = y1 - y0, ez1 = z1 - z0;
              const ex2 = x2 - x0, ey2 = y2 - y0, ez2 = z2 - z0;
              const crx = ey1 * ez2 - ez1 * ey2;
              const cry = ez1 * ex2 - ex1 * ez2;
              const crz = ex1 * ey2 - ey1 * ex2;
              const area2 = Math.hypot(crx, cry, crz);
              if (area2 < 1e-6) {
                removedCount++;
                continue;
              }

              const k0 = `${x0.toFixed(5)},${y0.toFixed(5)},${z0.toFixed(5)}`;
              const k1 = `${x1.toFixed(5)},${y1.toFixed(5)},${z1.toFixed(5)}`;
              const k2 = `${x2.toFixed(5)},${y2.toFixed(5)},${z2.toFixed(5)}`;
              const unorderedKey = [k0, k1, k2].sort().join('|');
              if (seenExact.has(unorderedKey)) {
                removedCount++;
                continue;
              }
              seenExact.add(unorderedKey);

              let nx = crx / area2, ny = cry / area2, nz = crz / area2;
              let vnx = (n0[i0 * 3] + n0[i1 * 3] + n0[i2 * 3]) / 3;
              let vny = (n0[i0 * 3 + 1] + n0[i1 * 3 + 1] + n0[i2 * 3 + 1]) / 3;
              let vnz = (n0[i0 * 3 + 2] + n0[i1 * 3 + 2] + n0[i2 * 3 + 2]) / 3;
              const cx = (x0 + x1 + x2) / 3, cy = (y0 + y1 + y2) / 3, cz = (z0 + z1 + z2) / 3;

              // Remove floor-contact downward faces across furniture and architectural bases (Z-fights with floor slab at y=0 / y=3.2)
              if (!isBooth && vny < -0.85 && Math.abs(cy) < 0.008 && name !== 'ARCH_FLOOR_SLAB') {
                removedCount++;
                continue;
              }
              if (name === 'ARCH_UPPER_DECK' && slotName === 'WB015_M_FLOOR_TILE' && vny < -0.85) {
                removedCount++;
                continue;
              }
              if (name === 'ARCH_UPPER_DECK' && slotName === 'WB015_M_WALL_NAVY' && vny > 0.85) {
                removedCount++;
                continue;
              }

              // Booth local-coordinate cleanup (BOOTH_DE/DW/F and BOOTH_UE/UW)
              if (isBooth) {
                // 1. Remove ALL downward-facing horizontal faces below y = 0.57m (floor contact, bolt bottoms,
                //    seat-box underside at y=0.17m, cushion flat bottom at y=0.31m, table/coaster/lamp undersides at y=0.49..0.562m)
                if (vny < -0.78 && cy < 0.57) {
                  removedCount++;
                  continue;
                }
                // 2. Under-seat pink plinth (M_OPAL_PINK_DIM / WB015_M_OPAL_PINK_DIM): keep only the 3 visible inward-facing
                //    recess quads and reshape their independent vertices into a non-overlapping U-recess (y in [0.008, 0.165])
                if (slotName.includes('OPAL_PINK_DIM')) {
                  const isBackRecess = vnx > 0.7 && cx > 0.65 && cx < 0.70;
                  const isLeftRecess = vnz < -0.7 && cz > -0.68 && cz < -0.62;
                  const isRightRecess = vnz > 0.7 && cz > -1.98 && cz < -1.92;
                  if (!isBackRecess && !isLeftRecess && !isRightRecess) {
                    removedCount++;
                    continue;
                  }
                  for (const v of [i0, i1, i2]) {
                    if (!vertexTouched[v]) {
                      vertexTouched[v] = 1;
                      p[v * 3 + 1] = p[v * 3 + 1] < 0.08 ? 0.008 : 0.165;
                      if (isBackRecess) {
                        p[v * 3] = 0.673;
                        p[v * 3 + 2] = p[v * 3 + 2] > -1.0 ? -0.653 : -1.947;
                      } else if (isLeftRecess) {
                        p[v * 3] = p[v * 3] < 1.0 ? 0.673 : 2.075;
                        p[v * 3 + 2] = -0.653;
                      } else if (isRightRecess) {
                        p[v * 3] = p[v * 3] < 1.0 ? 0.673 : 2.075;
                        p[v * 3 + 2] = -1.947;
                      }
                      positionsModified = true;
                    }
                  }
                }
                // 3. Steel frame (M_STEEL_BLACK / WB015_M_STEEL_BLACK / WB015_M_STEEL_EDGE):
                if (slotName.includes('STEEL_BLACK') || slotName.includes('STEEL_EDGE')) {
                  // Remove upward top of seat frame at y = 0.310m (covered by leather cushion) and table pedestal plates at y = 0.525m / 0.562m
                  if (vny > 0.8 && ((cy > 0.305 && cy < 0.315) || (cy > 0.521 && cy < 0.529) || (cy > 0.558 && cy < 0.566))) {
                    removedCount++;
                    continue;
                  }
                  // Remove buried internal -X faces of left/right seat-frame wings at x = 0.690m
                  if (vnx < -0.8 && cx > 0.685 && cx < 0.695 && cy > 0.165 && cy < 0.315) {
                    removedCount++;
                    continue;
                  }
                  // Clip center seat-frame +X face (x = 0.690m) to z in [-1.930, -0.670] so it does not overlap the wings
                  if (vnx > 0.8 && cx > 0.685 && cx < 0.695 && cy > 0.165 && cy < 0.315) {
                    for (const v of [i0, i1, i2]) {
                      if (!vertexTouched[v]) {
                        vertexTouched[v] = 1;
                        if (p[v * 3 + 2] > -0.67) p[v * 3 + 2] = -0.67;
                        if (p[v * 3 + 2] < -1.93) p[v * 3 + 2] = -1.93;
                        positionsModified = true;
                      }
                    }
                  }
                  // Remove diagonal brace buried end-caps inside table pedestal
                  if (Math.abs(vnz) > 0.8 && cx > 1.22 && cx < 1.26 && cy > 0.23 && cy < 0.49) {
                    removedCount++;
                    continue;
                  }
                }
                // In upper booths, WB015_M_STEEL_EDGE has tiny 2.6mm weld beads at y < 0.02m and 0.65mm inner faces around the pedestal
                if (slotName === 'WB015_M_STEEL_EDGE') {
                  if (cy < 0.02 || (cx > 1.18 && cx < 1.30 && cz > -1.36 && cz < -1.24 && cy < 0.50)) {
                    removedCount++;
                    continue;
                  }
                }
                // 4. Remove flat hidden contact faces of leather cushion pressed against the steel frame
                if (slotName.includes('LEATHER_WINE')) {
                  if (
                    (vny < -0.85 && cy < 0.32) ||
                    (vnx < -0.95 && cx < 0.045) ||
                    (vnz > 0.95 && cz > -0.016) ||
                    (vnz < -0.95 && cz < -2.584)
                  ) {
                    removedCount++;
                    continue;
                  }
                }
                // 5. Offset upper-booth vinyl contact overlay outward by +2.5mm so it never Z-fights with WB015_M_LEATHER_WINE
                if (slotName === 'WB015_M_VINYL_CONTACT') {
                  for (const v of [i0, i1, i2]) {
                    markOffset(v, n0[v * 3] * 0.0025, n0[v * 3 + 1] * 0.0025, n0[v * 3 + 2] * 0.0025);
                  }
                }
                // 6. Booth counter steel (kickplates at x = 2.200..2.204 and tabletop/coasters at y = 0.525..0.554):
                if (slotName.includes('COUNTER_STEEL')) {
                  // Front kickplates: keep only the outward +X face (vnx > 0.8) and offset +2.0mm
                  if (cy < 0.20) {
                    if (vnx < 0.8) {
                      removedCount++;
                      continue;
                    }
                    for (const v of [i0, i1, i2]) markOffset(v, 0.002, 0, 0);
                  }
                  // Lift coaster tops and sides (maxY > 0.552) by +2.5mm so they clear the y = 0.550m tabletop
                  if (Math.max(y0, y1, y2) > 0.552) {
                    for (const v of [i0, i1, i2]) markOffset(v, 0, 0.0025, 0);
                  }
                }
                // 7. Booth posters/coasters on table: lift coaster tops and sides (maxY > 0.552) by +2.5mm
                if (slotName.includes('POSTER') && Math.max(y0, y1, y2) > 0.552 && cy < 0.56) {
                  for (const v of [i0, i1, i2]) markOffset(v, 0, 0.0025, 0);
                }
                // 8. Booth chrome trim & rivets:
                if (slotName.includes('CHROME')) {
                  // Remove tiny 6mm floor-plate bolts (cy < 0.02m) that Z-fight with the y=0.008m steel foot plates
                  if (cy < 0.02) {
                    removedCount++;
                    continue;
                  }
                  // Front kickplate rivets (cx > 2.19): remove inner -X cap and shift rigid rivet +3.5mm along +X
                  if (cx > 2.19) {
                    if (vnx < -0.5) {
                      removedCount++;
                      continue;
                    }
                    for (const v of [i0, i1, i2]) markOffset(v, 0.0035, 0, 0);
                  } else if (cx < 0.005) {
                    // Back-wall rivets (cx < 0.005): remove inner +X cap and shift rigid rivet -2.5mm along -X
                    if (vnx > 0.5) {
                      removedCount++;
                      continue;
                    }
                    for (const v of [i0, i1, i2]) markOffset(v, -0.0025, 0, 0);
                  } else if (cy > 0.51 && cy < 0.56) {
                    // Table-edge chrome trim: remove hidden inner faces pressed against M_COUNTER_STEEL
                    const isTableInnerFace =
                      (cx > 0.935 && cx < 0.945 && vnx > 0.8) ||
                      (cx > 1.535 && cx < 1.545 && vnx < -0.8) ||
                      (cz > -0.805 && cz < -0.795 && vnz < -0.8) ||
                      (cz > -1.805 && cz < -1.795 && vnz > 0.8);
                    if (isTableInnerFace) {
                      removedCount++;
                      continue;
                    }
                  }
                }
                // 9. Booth sticker & tape: keep only +X front face (vnx > 0.8), offset +4mm, and repair out-of-bounds sticker UVs
                if (slotName.includes('STICKER') || slotName.includes('TAPE')) {
                  if (vnx < 0.8) {
                    removedCount++;
                    continue;
                  }
                  for (const v of [i0, i1, i2]) {
                    markOffset(v, 0.004, 0, 0);
                    if (uv && slotName.includes('STICKER')) {
                      const fz = (p0[v * 3 + 2] - (-2.15)) / 0.20;
                      const fy = (p0[v * 3 + 1] - 1.40) / 0.12;
                      uv[v * 2] = 0.256 + Math.max(0, Math.min(1, fz)) * (0.494 - 0.256);
                      uv[v * 2 + 1] = 0.440 - Math.max(0, Math.min(1, fy)) * (0.440 - 0.310);
                      uvsModified = true;
                    }
                  }
                }
                // 10. Booth leather patch: strip -X back face (vnx < -0.5) and offset +4mm
                if (slotName.includes('LEATHER_PATCH')) {
                  if (vnx < -0.5) {
                    removedCount++;
                    continue;
                  }
                  for (const v of [i0, i1, i2]) markOffset(v, 0.004, 0, 0);
                }
                // 11. Booth worn leather: strip hidden inward/downward faces
                if (slotName.includes('LEATHER_WORN') && (vny < -0.4 || vnx < -0.4)) {
                  removedCount++;
                  continue;
                }
                // 12. Upper booth stitch strips: flip inverted normals and offset outward +4.5mm (above vinyl contact)
                if (slotName === 'WB015_M_STITCH') {
                  if (vny < -0.5 || vnx < -0.5) {
                    const tmp = i1; i1 = i2; i2 = tmp;
                    nx = -nx; ny = -ny; nz = -nz;
                    vnx = -vnx; vny = -vny; vnz = -vnz;
                    for (const v of [i0, i1, i2]) {
                      n[v * 3] = -Math.abs(n0[v * 3]);
                      if (Math.abs(n0[v * 3]) > 0.5) n[v * 3] = 1.0;
                      if (Math.abs(n0[v * 3 + 1]) > 0.5) n[v * 3 + 1] = 1.0;
                    }
                    normalsModified = true;
                  }
                  const ox = Math.abs(vnx) > 0.5 ? 0.0045 : 0;
                  const oy = Math.abs(vny) > 0.5 ? 0.0045 : 0;
                  const oz = Math.abs(vnz) > 0.5 ? (cz > -1.3 ? 0.0045 : -0.0045) : 0;
                  for (const v of [i0, i1, i2]) markOffset(v, ox, oy, oz);
                }
              }

              // For ARCH_FLOOR_INLAY & FURN_AISLE_SCREENS floor border, keep only upward top faces
              if ((name === 'ARCH_FLOOR_INLAY' || (name === 'FURN_AISLE_SCREENS' && slotName === 'M_FLOOR_BORDER')) && vny < 0.5) {
                removedCount++;
                continue;
              }

              // For ARCH_SKIRTING, remove outer wall-facing back faces & bottom faces
              if (name === 'ARCH_SKIRTING' && (vny < -0.5 || !isRoomFacingNormal(cx, cy, cz, vnx, vny, vnz))) {
                removedCount++;
                continue;
              }

              // For ARCH_DECK_BEAMS_FASCIA prim 1 (WB015_M_STEEL_BLACK), remove back faces & top faces
              if (name === 'ARCH_DECK_BEAMS_FASCIA' && slotName === 'WB015_M_STEEL_BLACK') {
                if (vny > 0.5 || !isRoomFacingNormal(cx, cy, cz, vnx, vny, vnz)) {
                  removedCount++;
                  continue;
                }
              }

              // For ARCH_PYLONS M_STEEL_BLACK trim, remove inward pylon-facing back faces
              if (name === 'ARCH_PYLONS' && slotName === 'M_STEEL_BLACK') {
                if (Math.abs(vny) < 0.5 && !isRoomFacingNormal(cx, cy, cz, vnx, vny, vnz)) {
                  removedCount++;
                  continue;
                }
              }

              // For DECOR_BIG_POSTERS_PANELS M_STEEL_NAVY backing frames and M_CHROME corner bolts,
              // remove wall-facing back faces and shift outward along their true wall normal (West/East X or South/North Z)
              if (name === 'DECOR_BIG_POSTERS_PANELS' && (slotName === 'M_STEEL_NAVY' || slotName === 'M_CHROME')) {
                if (slotName === 'M_STEEL_NAVY' && Math.abs(vny) < 0.5 && !isRoomFacingNormal(cx, cy, cz, vnx, vny, vnz)) {
                  removedCount++;
                  continue;
                }
                const isXWall = Math.abs(cx) > 13.5;
                if (isXWall) {
                  const sgnX = cx < 0 ? 1.0 : -1.0;
                  const dzPanel = cx > 13.5 ? 1.50 : 0.0;
                  for (const v of [i0, i1, i2]) markOffset(v, sgnX * 0.006, 0, dzPanel);
                  if (slotName === 'M_STEEL_NAVY' && Math.abs(vnx) > 0.8) {
                    const frontX = (sgnX > 0 ? Math.max(x0, x1, x2) : Math.min(x0, x1, x2)) + sgnX * 0.006;
                    placedDecalQuads.push({
                      axis: 0,
                      sign: sgnX,
                      frontCoord: frontX,
                      min: [Math.min(x0, x1, x2), Math.min(y0, y1, y2), Math.min(z0, z1, z2) + dzPanel],
                      max: [Math.max(x0, x1, x2), Math.max(y0, y1, y2), Math.max(z0, z1, z2) + dzPanel],
                    });
                  }
                } else {
                  const sgnZ = cz > -1.0 ? -1.0 : 1.0;
                  for (const v of [i0, i1, i2]) markOffset(v, 0, 0, sgnZ * 0.006);
                  if (slotName === 'M_STEEL_NAVY' && Math.abs(vnz) > 0.8) {
                    const frontZ = (cz > -1.0 ? Math.min(z0, z1, z2) : Math.max(z0, z1, z2)) + sgnZ * 0.006;
                    placedDecalQuads.push({
                      axis: 2,
                      sign: sgnZ,
                      frontCoord: frontZ,
                      min: [Math.min(x0, x1, x2), Math.min(y0, y1, y2), Math.min(z0, z1, z2)],
                      max: [Math.max(x0, x1, x2), Math.max(y0, y1, y2), Math.max(z0, z1, z2)],
                    });
                  }
                }
              }

              // For DECOR_WALL_HISTORY_RACEWAYS M_STEEL_NAVY and M_STEEL_BLACK conduits/junction boxes,
              // remove flat West-wall conduits and East-wall conduits below y=6.05m that slice through posters
              if (name === 'DECOR_WALL_HISTORY_RACEWAYS' && (slotName === 'M_STEEL_NAVY' || slotName === 'M_STEEL_BLACK')) {
                if (cx < 0 || cy < 6.05) {
                  removedCount++;
                  continue;
                }
                if (Math.abs(vny) < 0.5 && !isRoomFacingNormal(cx, cy, cz, vnx, vny, vnz)) {
                  removedCount++;
                  continue;
                }
              }

              // For WB018_STAGE_FLANK_PANELS, strip -Z back faces and layer M18_ACOUSTIC_WEAVE (+3.5mm), M_STEEL_BLACK (+5.5mm), M18_TALL_PANEL_PINK (+8.5mm)
              if (name === 'WB018_STAGE_FLANK_PANELS') {
                if (vnz < -0.5 && (slotName === 'M18_ACOUSTIC_WEAVE' || slotName === 'M_STEEL_BLACK' || slotName === 'M18_TALL_PANEL_PINK')) {
                  removedCount++;
                  continue;
                }
                const dz = slotName === 'M18_ACOUSTIC_WEAVE' ? 0.0035 : slotName === 'M_STEEL_BLACK' ? 0.0055 : slotName === 'M18_TALL_PANEL_PINK' ? 0.0085 : 0.0055;
                for (const v of [i0, i1, i2]) markOffset(v, 0, 0, dz);
              }

              // For SIGN_TICKER, SIGN_NOSIGNAL, SPK_E/W, LA_E/W, STAGE_PLATFORM_DJ front grilles/screens/posters
              if (
                (name === 'SIGN_TICKER' || name === 'SIGN_NOSIGNAL' || name === 'SPK_E' || name === 'SPK_W' || name === 'LA_E' || name === 'LA_W' || name === 'STAGE_PLATFORM_DJ') &&
                (slotName.includes('SPEAKER_GRILLE') || slotName.includes('LED_') || slotName === 'M_BIG_POSTER' || slotName === 'M_PERF_STEEL' || slotName === 'M_OPAL_PINK' || slotName === 'M_OPAL_PINK_DIM')
              ) {
                if (vnz < -0.5) {
                  removedCount++;
                  continue;
                }
                for (const v of [i0, i1, i2]) markOffset(v, 0, 0, 0.0045);
              }

              // For wall-mounted neon signs (SIGN_COCKTAIL_01, SIGN_EYE_01, SIGN_LIPS_01/02, SIGN_WOMAN_01/02)
              // and wall sconce panels (WPANEL_PYLON_*, WPANEL_W*, WPANEL_U*), strip hidden local -Z wall-contact
              // back faces (cz < 0.002) and offset the entire fixture +3mm along local +Z (roomward)
              if (
                (name.startsWith('SIGN_') && name !== 'SIGN_TICKER' && name !== 'SIGN_NOSIGNAL') ||
                name.startsWith('WPANEL_')
              ) {
                if (vnz < -0.8 && cz < 0.002) {
                  removedCount++;
                  continue;
                }
                for (const v of [i0, i1, i2]) markOffset(v, 0, 0, 0.003);
              }

              // For identity-transform wall sconces (FIX_SIDE_LIGHT_BARS_SCONCES), strip hidden wall-facing
              // back faces at x = +-14.0m and shift the sconce bracket 3mm toward the room interior
              if (name === 'FIX_SIDE_LIGHT_BARS_SCONCES' && slotName !== 'M_OPAL_PINK') {
                if (Math.abs(cx) > 13.99 && !isRoomFacingNormal(cx, cy, cz, vnx, vny, vnz)) {
                  removedCount++;
                  continue;
                }
                const sgnX = cx < 0 ? 1.0 : -1.0;
                for (const v of [i0, i1, i2]) markOffset(v, sgnX * 0.003, 0, 0);
              }

              // For ceiling MEP grilles & perforated cable tray bottoms, remove upward hidden faces and shift downward -3.5mm
              if (name.startsWith('MEP_') && (slotName === 'WB015_M_SPEAKER_GRILLE' || slotName === 'WB015_M_PERF_STEEL')) {
                if (vny > 0.5) {
                  removedCount++;
                  continue;
                }
                for (const v of [i0, i1, i2]) markOffset(v, 0, -0.0035, 0);
              }

              // For VIP_W2_SHELL and VIP_E2_SHELL, remove duplicate partition wall at z in [-33.47, -33.33]
              if ((name === 'VIP_W2_SHELL' || name === 'VIP_E2_SHELL') && Math.abs(vnz) > 0.9 && cz > -33.47 && cz < -33.33) {
                removedCount++;
                continue;
              }

              // For ceiling light band diffusers, remove upward top faces inside the dark steel housing
              if (EMISSIVE_STRIP_OBJECTS.has(name) && CEILING_DIFFUSER_SLOTS.has(slotName) && vny > 0.45) {
                removedCount++;
                continue;
              }

              // For vertical pillar/column/base LED strips (identity-transform objects), remove hidden wall-facing back faces
              if ((name === 'ARCH_COLUMNS_WB015' || name === 'FIX_SIDE_LIGHT_BARS_SCONCES' || name === 'WB018_BASE_LED_LINES') && PILLAR_VERTICAL_STRIP_SLOTS.has(slotName)) {
                if (!isRoomFacingNormal(cx, cy, cz, vnx, vny, vnz) && Math.abs(vny) < 0.5) {
                  removedCount++;
                  continue;
                }
              }

              const rec: TriRecord = {
                subIndex: sIdx,
                slotName,
                tier,
                i0, i1, i2,
                nx, ny, nz,
                vnx, vny, vnz,
                d: nx * x0 + ny * y0 + nz * z0,
                minX: Math.min(x0, x1, x2),
                minY: Math.min(y0, y1, y2),
                minZ: Math.min(z0, z1, z2),
                maxX: Math.max(x0, x1, x2),
                maxY: Math.max(y0, y1, y2),
                maxZ: Math.max(z0, z1, z2),
                cx, cy, cz,
                area: area2 * 0.5,
                removed: false,
              };
              subTris[sIdx].push(rec);
              allTris.push(rec);
            }
          }

          // 2. Within each submesh, remove opposite-normal < 1.2mm flattened-box back faces
          //    AND same-normal < 0.6mm duplicate contained faces
          for (let sIdx = 0; sIdx < subTris.length; sIdx++) {
            const list = subTris[sIdx];
            if (isGroundBooth && mesh.materialSlots[mesh.submeshes[sIdx].materialSlot]?.slotName === 'M_PERF_STEEL') continue;
            if (list.length > 3500) continue;
            for (let a = 0; a < list.length; a++) {
              const ta = list[a];
              if (ta.removed) continue;
              for (let b = a + 1; b < list.length; b++) {
                const tb = list[b];
                if (tb.removed) continue;
                const dot = ta.nx * tb.nx + ta.ny * tb.ny + ta.nz * tb.nz;
                if (!isBooth && dot < -0.996) {
                  const planeDist = Math.abs(ta.d + tb.d);
                  if (planeDist > 0.0012) continue;
                  if (!aabb2DOverlap(ta, tb, 0.0015)) continue;
                  const aFront = isRoomFacingNormal(ta.cx, ta.cy, ta.cz, ta.vnx, ta.vny, ta.vnz);
                  const bFront = isRoomFacingNormal(tb.cx, tb.cy, tb.cz, tb.vnx, tb.vny, tb.vnz);
                  if (aFront && !bFront) {
                    tb.removed = true;
                    removedCount++;
                  } else if (bFront && !aFront) {
                    ta.removed = true;
                    removedCount++;
                    break;
                  } else {
                    tb.removed = true;
                    removedCount++;
                  }
                } else if (dot > 0.996) {
                  const planeDist = Math.abs(ta.d - tb.d);
                  if (planeDist > 0.0006) continue;
                  const cDist = Math.hypot(ta.cx - tb.cx, ta.cy - tb.cy, ta.cz - tb.cz);
                  if (cDist < 0.008 && aabbContainedIn(tb, ta, 0.002)) {
                    tb.removed = true;
                    removedCount++;
                  } else if (cDist < 0.008 && aabbContainedIn(ta, tb, 0.002)) {
                    ta.removed = true;
                    removedCount++;
                    break;
                  }
                }
              }
            }
          }

          // 3. Across different submeshes of the same mesh (excluding >3500-tri curved upholstery submeshes),
          //    remove lower-tier same-normal coplanar (< 1.2mm) triangles contained in higher-tier faces
          const planarTris = allTris.filter(t => !t.removed && !(isGroundBooth && t.slotName === 'M_PERF_STEEL') && subTris[t.subIndex].length <= 3500);
          if (planarTris.length <= 5000) {
            for (let a = 0; a < planarTris.length; a++) {
              const high = planarTris[a];
              if (high.removed) continue;
              for (let b = 0; b < planarTris.length; b++) {
                if (a === b) continue;
                const low = planarTris[b];
                if (low.removed || low.subIndex === high.subIndex) continue;
                if (low.tier > high.tier || (low.tier === high.tier && low.subIndex > high.subIndex)) continue;
                const dot = high.nx * low.nx + high.ny * low.ny + high.nz * low.nz;
                if (dot < 0.996) continue;
                const planeDist = Math.abs(high.d - low.d);
                if (planeDist > 0.0012) continue;
                if (aabbContainedIn(low, high, 0.004)) {
                  low.removed = true;
                  removedCount++;
                }
              }
            }
          }

          // 4. Apply deterministic outward normal offsets to remaining structural/emissive overlays
          for (const rec of allTris) {
            if (rec.removed || isBooth) continue;
            if (name === 'FURN_AISLE_SCREENS' && rec.slotName === 'M_FLOOR_BORDER') {
              for (const v of [rec.i0, rec.i1, rec.i2]) markOffset(v, 0, 0.004, 0);
            } else if (name === 'ARCH_SKIRTING') {
              for (const v of [rec.i0, rec.i1, rec.i2]) {
                markOffset(v, n0[v * 3] * 0.002, Math.max(0, n0[v * 3 + 1]) * 0.002, n0[v * 3 + 2] * 0.002);
              }
            } else if (name === 'ARCH_DECK_BEAMS_FASCIA' && rec.slotName === 'WB015_M_STEEL_BLACK') {
              for (const v of [rec.i0, rec.i1, rec.i2]) {
                markOffset(v, n0[v * 3] * 0.003, 0, n0[v * 3 + 2] * 0.003);
              }
            } else if (EMISSIVE_STRIP_OBJECTS.has(name) && CEILING_DIFFUSER_SLOTS.has(rec.slotName)) {
              for (const v of [rec.i0, rec.i1, rec.i2]) markOffset(v, 0, -0.0035, 0);
            } else if (EMISSIVE_STRIP_OBJECTS.has(name) && name !== 'WB018_STAGE_FLANK_PANELS' && (PILLAR_VERTICAL_STRIP_SLOTS.has(rec.slotName) || rec.slotName === 'WB015_M_UPLIGHT')) {
              const stripOffset = 0.004;
              for (const v of [rec.i0, rec.i1, rec.i2]) {
                markOffset(v, n0[v * 3] * stripOffset, n0[v * 3 + 1] * stripOffset, n0[v * 3 + 2] * stripOffset);
              }
            }
          }

          if (positionsModified) {
            for (let k = 0; k < p.length; k++) p[k] += vertexOffsets[k];
          }

          if (removedCount > 0 || positionsModified || normalsModified || uvsModified) {
            const indices: number[] = [];
            const submeshes: MeshAsset['submeshes'][number][] = [];
            for (let sIdx = 0; sIdx < mesh.submeshes.length; sIdx++) {
              const sub = mesh.submeshes[sIdx];
              const start = indices.length;
              const usedVerts = new Set<number>();
              for (const rec of subTris[sIdx]) {
                if (!rec.removed) {
                  indices.push(rec.i0, rec.i1, rec.i2);
                  usedVerts.add(rec.i0);
                  usedVerts.add(rec.i1);
                  usedVerts.add(rec.i2);
                }
              }
              if (indices.length > start) {
                submeshes.push({
                  ...sub,
                  indexOffset: start,
                  indexCount: indices.length - start,
                  vertexCount: usedVerts.size,
                });
              }
            }
            const attributes = {
              ...mesh.attributes,
              ...(positionsModified ? {position: p} : {}),
              ...(normalsModified ? {normal: n} : {}),
              ...(uvsModified && uv ? {uv} : {}),
            };
            const vertices =
              positionsModified || normalsModified || uvsModified
                ? packInterleavedVertexAttributes(attributes, p.length / 3).unwrap().vertices
                : mesh.vertices;
            const createdMesh = assets.create({
              ...mesh,
              attributes,
              vertices,
              indices: new Uint32Array(indices),
              submeshes,
            });
            if (createdMesh.ok) {
              const h = createdMesh.value;
              created.push(h);
              dedup.set(cacheKey, h);
              details.push({
                name,
                removedCoplanarAndDegenerateTriangles: removedCount,
                layeredOffsetApplied: positionsModified,
              });
            } else {
              // If prepareRuntimeAsset rejects the new mesh (e.g. non-contiguous submesh vertexCount),
              // patch the existing runtime mesh attributes in place so position/normal/uv offsets always take effect.
              if (positionsModified || normalsModified || uvsModified) {
                assets.update(handle, {attributes, vertices}).unwrap();
              }
              dedup.set(cacheKey, handle);
              details.push({
                name,
                inPlaceAttributeUpdate: true,
                layeredOffsetApplied: positionsModified,
              });
            }
          } else {
            dedup.set(cacheKey, handle);
          }
          }
        }
      }
      const fixed = dedup.get(cacheKey);
      if (fixed !== undefined && fixed !== handle) {
        world.set(entity, MeshFilter, {assetHandle: fixed}).unwrap();
      }
    }

    if (overlay) {
      const bound = mesh.materialSlots
        .map((slot, i) => materials[i] || slot.defaultMaterial)
        .map(h => {
          if (typeof h !== 'number' || !h) return 0;
          const cached = biasCache.get(h);
          if (cached) return cached;
          const source = assets.read(h);
          if (!source.ok || source.value.kind !== 'material') return h;
          const m = source.value as MaterialAsset;
          if (m.parent !== undefined || !m.passes || m.staticSwitches !== undefined) return h;
          const passes = m.passes.map(p =>
            (p.renderState?.tags as Record<string, string> | undefined)?.LightMode === 'ShadowCaster'
              ? p
              : {
                  ...p,
                  renderState: {
                    ...p.renderState,
                    depthBias: -2,
                    depthBiasSlopeScale: -0.25,
                    depthBiasClamp: -0.00002,
                  },
                },
          ) as unknown as NonNullable<typeof m.passes>;
          const biasedRes = assets.create({...m, passes});
          if (!biasedRes.ok) return h;
          const biased = biasedRes.value;
          created.push(biased);
          biasCache.set(h, biased);
          return biased;
        });
      world.set(entity, MeshRenderer, {materials: bound}).unwrap();
    }
  }

  const read = () => ({
    owner: '019 native Layer/SortKey + coplanar/degenerate removal + 182-box decal de-confliction + booth/MEP/stage micro-layering',
    objects: saved.length,
    placedDecalQuads: placedDecalQuads.length,
    transparentLayers: {liquids: 10, drinkGlass: 20, overlays: 5, otherPhysical: 0},
    overlayRasterBias: {constant: -2, slope: -0.25, clamp: -0.00002},
    deduplicated: details,
    unresolved: 'Intersecting different transparent surfaces still use finite authored transport groups; not arbitrary per-pixel depth peeling.',
  });
  world.insertResource('cyberpunk.displayHierarchy', {read});
  return {
    read,
    dispose: () => {
      world.removeResource('cyberpunk.displayHierarchy');
      for (const s of saved) {
        world.set(s.entity, MeshFilter, {assetHandle: s.mesh}).unwrap();
        world.set(s.entity, MeshRenderer, {materials: s.materials}).unwrap();
        if (s.layer === undefined) world.removeComponent(s.entity, Layer).unwrap();
        else world.set(s.entity, Layer, {value: s.layer}).unwrap();
      }
      for (const h of created) assets.release(h).unwrap();
    },
  };
}
