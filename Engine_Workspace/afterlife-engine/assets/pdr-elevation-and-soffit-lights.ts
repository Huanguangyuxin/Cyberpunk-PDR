/** D095: Elevate the 2nd-floor balcony/mezzanine (+0.45m -> 3.00m beam soffit, 3.35m slab soffit, 3.65m floor)
 * and roof/ceiling (+0.65m -> 8.60m roof beam soffit, 9.25m roof slab) so the ground floor and upper
 * gallery feel spacious, and mount flush LED light strips directly onto the ceiling surfaces
 * (zero hanging/suspended fixtures).
 */
import type {AssetRegistry} from '@forgeax/engine/assets-runtime';
import type {EntityHandle, World} from '@forgeax/engine/ecs';
import {createBoxGeometry, packInterleavedVertexAttributes} from '@forgeax/engine/geometry';
import {Layer, Materials, MeshFilter, MeshRenderer, Visibility, VisibilityStateValue} from '@forgeax/engine/render';
import {Name, Transform} from '@forgeax/engine/scene';
import type {AssetHandle, MeshAsset} from '@forgeax/engine/types';
import {connectVipToSharedRoof, isVipShell} from './pdr-vip-roof';

export const DECK_LIFT = 0.45;
export const ROOF_LIFT = 0.65;
const sharedRoofUnderside = 8.60 + ROOF_LIFT;

const UPPER_TRANSFORM_NODES = new Set([
  'BOOTH_UE1', 'BOOTH_UE2', 'BOOTH_UE3', 'BOOTH_UE4',
  'BOOTH_UW1', 'BOOTH_UW2', 'BOOTH_UW3', 'BOOTH_UW4',
  'DECOR_PLANT_10', 'DECOR_PLANT_11', 'DECOR_PLANT_12', 'DECOR_PLANT_13',
  'VIP_E1_DOOR_LEAF', 'VIP_E1_LOUNGE_CHAIR_1', 'VIP_E1_LOUNGE_CHAIR_2', 'VIP_E1_LOUNGE_CHAIR_3', 'VIP_E1_LOUNGE_TABLE',
  'VIP_E2_DOOR_LEAF', 'VIP_E2_LOUNGE_CHAIR_1', 'VIP_E2_LOUNGE_CHAIR_2', 'VIP_E2_LOUNGE_CHAIR_3', 'VIP_E2_LOUNGE_TABLE',
  'VIP_W1_DOOR_LEAF', 'VIP_W1_LOUNGE_CHAIR_1', 'VIP_W1_LOUNGE_CHAIR_2', 'VIP_W1_LOUNGE_CHAIR_3', 'VIP_W1_LOUNGE_TABLE',
  'VIP_W2_DOOR_LEAF', 'VIP_W2_LOUNGE_CHAIR_1', 'VIP_W2_LOUNGE_CHAIR_2', 'VIP_W2_LOUNGE_CHAIR_3', 'VIP_W2_LOUNGE_TABLE',
  'WPANEL_UE1', 'WPANEL_UE2', 'WPANEL_UE3', 'WPANEL_UW1', 'WPANEL_UW2', 'WPANEL_UW3',
  'SIGN_COCKTAIL_01', 'SIGN_EYE_01', 'SIGN_LIPS_02', 'SIGN_NOSIGNAL', 'SIGN_TICKER', 'SIGN_WOMAN_02',
  'CAM06_GALLERY_WEST', 'CAM07_GALLERY_EAST', 'FP_STAIR_UPPER', 'FP_GALLERY_EXIT',
  'CAM10_GAL_W_CORRIDOR', 'CAM11_GAL_E_CORRIDOR',
  'CAM16_STAIR_LANDING_E', 'CAM16_STAIR_LANDING_W',
  'CAM17_STAIR_DOWN_E', 'CAM17_STAIR_DOWN_W',
  'CAM_VIP_E1_DOORIN', 'CAM_VIP_E1_IN', 'CAM_VIP_E1_OUT', 'CAM_VIP_E1_REV', 'CAM_VIP_E1_SHOW',
  'CAM_VIP_E2_DOORIN', 'CAM_VIP_E2_IN', 'CAM_VIP_E2_OUT', 'CAM_VIP_E2_REV', 'CAM_VIP_E2_SHOW',
  'CAM_VIP_W1_DOORIN', 'CAM_VIP_W1_IN', 'CAM_VIP_W1_OUT', 'CAM_VIP_W1_REV', 'CAM_VIP_W1_SHOW',
  'CAM_VIP_W2_DOORIN', 'CAM_VIP_W2_IN', 'CAM_VIP_W2_OUT', 'CAM_VIP_W2_REV', 'CAM_VIP_W2_SHOW',
]);

const CEILING_TRANSFORM_NODES = new Set([
  'CEIL_L_01', 'CEIL_L_02', 'CEIL_L_03', 'CEIL_L_04', 'CEIL_L_05', 'CEIL_L_06',
]);

const UPPER_ORIGIN_MESH_NODES = new Set([
  'ARCH_UPPER_DECK', 'ARCH_DECK_BEAMS_FASCIA',
  'RAIL_BRIDGE_NORTH', 'RAIL_DECK_SOUTH', 'RAIL_GAL_E', 'RAIL_GAL_W',
  'FIX_SOFFIT_PENDANTS',
]);

const CEILING_ORIGIN_MESH_NODES = new Set([
  'ARCH_ROOF_SLAB', 'ARCH_ROOF_BEAMS',
  'FIX_ROOF_LIGHT_BANDS',
  'WB018_ROOF_LIGHT_BANDS_COOL',
  'MEP_DUCTS', 'MEP_NET_C', 'MEP_NET_F', 'MEP_NET_M', 'MEP_TRANSVERSE_SERVICES',
]);

function vertexLiftForMesh(name: string, _x: number, y: number, z: number): number | null {
  if (UPPER_ORIGIN_MESH_NODES.has(name)) return DECK_LIFT;
  if (CEILING_ORIGIN_MESH_NODES.has(name)) return ROOF_LIFT;
  if (name === 'WB018_CEIL_BAND_FRONT') {
    // Lift the lower suspended light-band body (originally y = 6.52..7.10m) flush up against the roof beams (y = 8.58..9.15m)
    return y < 7.15 ? ROOF_LIFT + 1.40 : ROOF_LIFT;
  }
  if (CEILING_TRANSFORM_NODES.has(name)) {
    // Local Y: [-0.007..0.22] is the L-shaped light strip; [0.22..1.20] are the hanging rods.
    // Lift the light strip by +0.55m so it sits flush with the roof beam bottom (world y = 8.60m).
    return y < 0.30 ? 0.55 : 0;
  }
  if (name === 'ARCH_WALL_SOUTH' || name === 'ARCH_WALLS_WEN') {
    return y > 5.0 ? ROOF_LIFT : y > 2.5 ? DECK_LIFT : 0;
  }
  if (name === 'ARCH_COLUMNS' || name === 'ARCH_COLUMNS_WB015' || name === 'ARCH_PYLONS') {
    return y > 2.0 ? DECK_LIFT : 0;
  }
  if (isVipShell(name)) {
    return y > 7.5 ? ROOF_LIFT : DECK_LIFT;
  }
  if (name === 'LA_E' || name === 'LA_W') {
    return y > 2.0 ? ROOF_LIFT - DECK_LIFT : 0;
  }
  if (name === 'MEP_PIPES') {
    return y >= 6.0 ? ROOF_LIFT : y >= 2.2 ? DECK_LIFT : 0;
  }
  if (name === 'MEP_TRAYS_WIRES_JBOX') {
    return y >= 6.0 ? ROOF_LIFT : DECK_LIFT;
  }
  if (name === 'STAIR_E' || name === 'STAIR_W' || name === 'STAIR_E_GLASS' || name === 'STAIR_W_GLASS') {
    if (y <= 0.005) return 0;
    const rampU = Math.max(0, Math.min(1, (-14.46 - z) / 5.34));
    return DECK_LIFT * rampU;
  }
  if (
    name === 'DECOR_POSTERS' ||
    name === 'DECOR_WALL_COLLAGE' ||
    name === 'FIX_SIDE_LIGHT_BARS_SCONCES'
  ) {
    return z < -19.5 && y > 2.8 ? DECK_LIFT : 0;
  }
  return null;
}

export function installElevationAndSoffitLights(
  world: World,
  assets: AssetRegistry,
  cookedMaterials?: ReadonlyMap<string, AssetHandle<'material'>>,
) {
  const savedTransforms: {entity: EntityHandle; pos: number[]}[] = [];
  const savedMeshes: {entity: EntityHandle; mesh: AssetHandle<'mesh'>}[] = [];
  const savedVisibilities: {entity: EntityHandle; state?: number}[] = [];
  const createdAssets: AssetHandle<'mesh' | 'material'>[] = [];
  const spawnedEntities: EntityHandle[] = [];
  const vipRoof: ({name:string} & ReturnType<typeof connectVipToSharedRoof>['stats'])[] = [];

  // 1. Shift Transform.pos.y for upper-floor, stair-mid, and ceiling entities
  const transformRows = Array.from(
    world.query({read: [Name, Transform]}).unwrap(),
    row => ({
      entity: row.entity,
      name: row.get(Name).value,
      pos: Array.from(row.get(Transform).pos),
    }),
  );
  for (const row of transformRows) {
    const {name, pos} = row;
    let dy = 0;
    if (
      UPPER_TRANSFORM_NODES.has(name) ||
      name === 'LA_E' ||
      name === 'LA_W' ||
      /^DRINK_BOOTH_U[EW]\d+_(?:COUPE|TUMBLER)$/.test(name)
    ) {
      dy = DECK_LIFT;
    } else if (name === 'FP_STAIR_MID') {
      dy = DECK_LIFT * 0.5;
    } else if (CEILING_TRANSFORM_NODES.has(name)) {
      dy = ROOF_LIFT;
    }
    if (dy !== 0) {
      savedTransforms.push({entity: row.entity, pos});
      world.set(row.entity, Transform, {pos: [pos[0], pos[1] + dy, pos[2]]}).unwrap();
    }
    // Hide hanging conical pendant lamps (`FIX_SOFFIT_PENDANTS`) so only flush ceiling light strips remain
    if (name === 'FIX_SOFFIT_PENDANTS') {
      const vis = world.get(row.entity, Visibility);
      savedVisibilities.push({entity: row.entity, state: vis.ok ? vis.value.state : undefined});
      if (vis.ok) world.set(row.entity, Visibility, {state: VisibilityStateValue.hidden}).unwrap();
      else world.addComponent(row.entity, {component: Visibility, data: {state: VisibilityStateValue.hidden}}).unwrap();
    }
  }

  // 2. Elevate mesh vertices for origin-baked upper-deck, ceiling, column, wall, stair, and VIP shell meshes
  const meshRows = Array.from(
    world.query({read: [Name, MeshFilter, MeshRenderer]}).unwrap(),
    row => ({
      entity: row.entity,
      name: row.get(Name).value,
      handle: row.get(MeshFilter).assetHandle,
      materials: Array.from(row.get(MeshRenderer).materials),
    }),
  );
  const sharedTemplateElevated = new Map<number, AssetHandle<'mesh'>>();

  for (const row of meshRows) {
    if (sharedTemplateElevated.has(row.handle)) {
      const cached = sharedTemplateElevated.get(row.handle)!;
      if (cached !== row.handle) {
        savedMeshes.push({entity: row.entity, mesh: row.handle});
        world.set(row.entity, MeshFilter, {assetHandle: cached}).unwrap();
      }
      continue;
    }
    const read = assets.read(row.handle);
    if (!read.ok || read.value.kind !== 'mesh') continue;
    const mesh = read.value as MeshAsset;

    const p0 = mesh.attributes.position;
    if (!(p0 instanceof Float32Array)) continue;
    const probeLift = vertexLiftForMesh(row.name, 0, CEILING_TRANSFORM_NODES.has(row.name) ? 0.1 : 8.6, -30);
    if (probeLift === null) continue;

    const p = new Float32Array(p0);
    let changed = false;
    for (let i = 0; i < p.length; i += 3) {
      const dy = vertexLiftForMesh(row.name, p[i], p[i + 1], p[i + 2]);
      if (dy && Math.abs(dy) > 1e-5) {
        p[i + 1] += dy;
        changed = true;
      }
    }
    if (!changed) continue;

    const joined = isVipShell(row.name) ? connectVipToSharedRoof(mesh, p, sharedRoofUnderside + .005) : undefined;
    const attributes = {...mesh.attributes, position: p, ...(joined ? {uv:joined.uv} : {})};
    const vertices = packInterleavedVertexAttributes(attributes, p.length / 3).unwrap().vertices;
    const nextAabb = mesh.aabb?.length === 6
      ? [mesh.aabb[0], mesh.aabb[1], mesh.aabb[2], mesh.aabb[3], mesh.aabb[4] + Math.max(DECK_LIFT, ROOF_LIFT + 1.40), mesh.aabb[5]] as unknown as MeshAsset['aabb']
      : mesh.aabb;
    const created = joined
      ? assets.create({...mesh, attributes, vertices, indices:joined.indices, submeshes:joined.submeshes, aabb:joined.aabb})
      : assets.create({...mesh, attributes, vertices, ...(nextAabb ? {aabb: nextAabb} : {})});
    if (joined) {
      // The replacement is also used by physics. Never silently fall back to the low lid.
      created.unwrap();
      vipRoof.push({name:row.name,...joined.stats});
    }
    if (created.ok) {
      createdAssets.push(created.value);
      sharedTemplateElevated.set(row.handle, created.value);
      savedMeshes.push({entity: row.entity, mesh: row.handle});
      world.set(row.entity, MeshFilter, {assetHandle: created.value}).unwrap();
    } else {
      assets.update(row.handle, {attributes, vertices}).unwrap();
      sharedTemplateElevated.set(row.handle, row.handle);
    }
  }
  if (vipRoof.length !== 4) throw new Error('Expected four VIP rooms attached to the shared roof');

  // 3. Resolve pre-cooked emissive materials from brandLighting
  const fallbackCool = assets.create(
    Materials.standard({
      baseColor: [0.85, 0.65, 1.0, 1],
      metallic: 0.0,
      roughness: 0.22,
      emissive: [0.77, 0.28, 1.0],
      emissiveIntensity: 5.5,
    }),
  ).unwrap();
  const fallbackPink = assets.create(
    Materials.standard({
      baseColor: [1.0, 0.45, 0.75, 1],
      metallic: 0.0,
      roughness: 0.22,
      emissive: [1.0, 0.20, 0.58],
      emissiveIntensity: 3.8,
    }),
  ).unwrap();
  createdAssets.push(fallbackCool, fallbackPink);

  const coolBandMat = cookedMaterials?.get('M18_BAND_COOL') ?? fallbackCool;
  const dimBandMat = cookedMaterials?.get('M18_BAND_COOL_DIM') ?? coolBandMat;
  const pinkBandMat = cookedMaterials?.get('M_OPAL_PINK') ?? fallbackPink;

  const spawnStrip = (
    name: string,
    size: readonly [number, number, number],
    pos: readonly [number, number, number],
    mat: AssetHandle<'material'>,
  ) => {
    const geom = createBoxGeometry(size[0], size[1], size[2]).unwrap();
    const h = assets.create(geom).unwrap();
    createdAssets.push(h);
    const e = world.spawn(
      {component: Name, data: {value: name}},
      {component: Transform, data: {pos: [...pos]}},
      {component: Layer, data: {value: 0}},
      {component: MeshFilter, data: {assetHandle: h}},
      {component: MeshRenderer, data: {materials: geom.materialSlots.map(() => mat)}},
    ).unwrap();
    spawnedEntities.push(e);
  };

  const railFinish = cookedMaterials?.get('D109_STAIR_COATED_STEEL');
  if (railFinish === undefined) throw new Error('Mounting channel finish missing');
  const mountStrip = (
    name: string, size: readonly [number, number, number], pos: readonly [number, number, number],
    mat: AssetHandle<'material'>,
  ) => {
    // Top of the steel channel meets the structural soffit. The opal snaps
    // onto its lower face. The two parts share a contact surface only.
    const [w, t, l] = size;
    const [x, y, z] = pos;
    const ceiling = y + t / 2;
    spawnStrip(name + '_CHANNEL', [w + .032,.032,l + .032], [x,ceiling - .016,z], railFinish);
    spawnStrip(name, [w,t,l], [x,ceiling - .032 - t / 2,z], mat);
  };

  // ============================================================================
  // PART A: FRONT HALL (前厅 z = -1.2m .. -19.5m) FLUSH CEILING LIGHT STRIPS
  //         Embedded directly onto the underside of the existing roof beams (y = 8.595m)
  //         and flush against the ceiling slab (y = 9.243m) — ZERO suspended bars.
  // ============================================================================

  // A1. Flush LED strips mounted directly along the bottom face of the 4 Front-Hall transverse roof beams
  //     (ARCH_ROOF_BEAMS exist at z = -2.75m, -8.25m, -13.75m, -19.25m, bottom face y = 8.600m)
  for (const [bIdx, z] of [-2.75, -8.25, -13.75, -19.25].entries()) {
    const mat = bIdx % 2 === 0 ? coolBandMat : pinkBandMat;
    mountStrip(`PDR/SOFFIT_FRONT_BEAM_TRANS_${bIdx}`, [26.8, 0.012, 0.12], [0, 8.594, z], mat);
  }
  // A3. Flush LED strips mounted directly against the high ceiling slab (ARCH_ROOF_SLAB bottom at y = 9.250m)
  //     above the West booths/stairs (x = -13.6m, -11.2m, -8.0m) and East high-tables/bar/stairs (x = +8.0m, +11.2m, +13.6m)
  for (const [sIdx, x] of [-13.6, -11.2, -8.0, 8.0, 11.2, 13.6].entries()) {
    const mat = sIdx % 2 === 0 ? pinkBandMat : coolBandMat;
    mountStrip(`PDR/SOFFIT_FRONT_SLAB_LON_${sIdx}`, [0.15, 0.014, 17.6], [x, 9.243, -10.5], mat);
  }

  // ============================================================================
  // PART B: 2ND-FLOOR UNDERSIDE CEILING FLUSH LIGHT STRIPS (z = -19.8m .. -43.5m)
  //         Fitted inside each ceiling slab bay (y = 3.344m, flush with ARCH_UPPER_DECK bottom at 3.350m)
  //         and flush along the structural beam soffits (y = 2.994m, flush with ARCH_DECK_BEAMS_FASCIA bottom at 3.000m).
  // ============================================================================

  // B1. Under-Bridge Flush Ceiling Light Strips (inside bridge ceiling bay z = -22.35..-20.05m at y = 3.344m)
  mountStrip('PDR/SOFFIT_BRIDGE_STRIP_0', [16.0, 0.012, 0.14], [0, 3.344, -20.65], coolBandMat);
  mountStrip('PDR/SOFFIT_BRIDGE_STRIP_1', [16.0, 0.012, 0.14], [0, 3.344, -21.75], pinkBandMat);
  // Flush along the bottom face of the South & North bridge fascia beams (y = 2.994m)
  mountStrip('PDR/SOFFIT_BRIDGE_BEAM_SOUTH', [16.0, 0.012, 0.11], [0, 2.994, -19.92], pinkBandMat);
  mountStrip('PDR/SOFFIT_BRIDGE_BEAM_NORTH', [16.0, 0.012, 0.11], [0, 2.994, -22.48], coolBandMat);

  // B2. Under-Gallery Bay-Fitted Flush Ceiling Light Strips (inside each of the 4 ceiling bays on y = 3.344m)
  const galleryBays: readonly [number, number][] = [
    [-26.65, -22.75],
    [-32.25, -27.15],
    [-37.85, -32.75],
    [-43.45, -38.35],
  ];
  for (const [bIdx, [z0, z1]] of galleryBays.entries()) {
    const zMid = 0.5 * (z0 + z1);
    const zLen = z1 - z0;
    for (const [sideIdx, sign] of [-1, 1].entries()) {
      const side = sideIdx === 0 ? 'W' : 'E';
      // Inner aisle bay (between beams at x = 8.55m and x = 10.40m -> center x = +-9.475m)
      mountStrip(`PDR/SOFFIT_AISLE_LON_${side}_${bIdx}`, [0.14, 0.012, zLen], [sign * 9.475, 3.344, zMid], coolBandMat);
      // Outer booth bay (between beam at x = 10.65m and wall at x = 14.00m -> center x = +-12.15m)
      mountStrip(`PDR/SOFFIT_BOOTH_LON_${side}_${bIdx}`, [0.14, 0.012, zLen], [sign * 12.15, 3.344, zMid], pinkBandMat);
    }
  }
  // Flush along the bottom face of the inner gallery longitudinal beams (x = +-8.425m, y = 2.994m)
  mountStrip('PDR/SOFFIT_GAL_BEAM_W', [0.11, 0.012, 21.0], [-8.425, 2.994, -33.2], pinkBandMat);
  mountStrip('PDR/SOFFIT_GAL_BEAM_E', [0.11, 0.012, 21.0], [8.425, 2.994, -33.2], pinkBandMat);

  // The dance-floor downlights occupy the joint of each suspended L-shaped
  // rail. A dark bezel distinguishes their directional lens from the warm rail.
  for (const [i, [x,z]] of [[5,-26.5],[-6,-31.5],[3.5,-35]].entries()) {
    spawnStrip('PDR/DANCE_OPTIC_BEZEL_'+i, [.17,.038,.17], [x,8.577,z], railFinish);
    spawnStrip('PDR/DANCE_OPTIC_LENS_'+i, [.115,.008,.115], [x,8.554,z], dimBandMat);
  }

  // 6. Spawn solid glossy black step risers + continuous under-stair sloped soffit for STAIR_E and STAIR_W
  //    so the stairs to the 2nd floor read as a solid, smooth, reflective black structure with zero hollow gaps.
  // D109: the generated support pieces borrow the same DCC-authored coated
  // steel as the imported stairs; no separate hard-coded white-plastic lobe.
  const stairBlackMat = cookedMaterials?.get('D109_STAIR_COATED_STEEL');
  if (stairBlackMat === undefined) throw new Error('D109 Blender stair material donor missing');

  for (const sx of [13.30, -13.30]) {
    for (let k = 0; k < 19; k++) {
      const zFront = -14.48 - k * 0.28;
      const zMid = zFront - 0.14;
      const rampU = Math.max(0, Math.min(1, (-14.46 - zMid) / 5.34));
      const lift = DECK_LIFT * rampU;
      const yTop = (k + 1) * 0.16 + lift;
      const yBot = k * 0.16 + lift * (k / 19);
      const h = Math.max(0.16, yTop - yBot + 0.02);
      const yMid = yTop - h * 0.5;
      // Solid step block (riser + underside)
      spawnStrip(`PDR/STAIR_SOLID_STEP_${sx > 0 ? 'E' : 'W'}_${k}`, [1.38, h, 0.29], [sx, yMid, zMid], stairBlackMat);
    }
    // Under-stair solid support wall blocks from floor (y=0) up to each step so the stair is completely supported
    for (let k = 2; k < 19; k += 2) {
      const zMid = -14.62 - k * 0.28;
      const rampU = Math.max(0, Math.min(1, (-14.46 - zMid) / 5.34));
      const yTop = k * 0.16 + DECK_LIFT * rampU;
      if (yTop > 0.2) {
        spawnStrip(`PDR/STAIR_SUPPORT_${sx > 0 ? 'E' : 'W'}_${k}`, [1.36, yTop, 0.56], [sx, yTop * 0.5, zMid], stairBlackMat);
      }
    }
  }

  return {
    read: () => ({
      deckLiftM: DECK_LIFT,
      roofLiftM: ROOF_LIFT,
      elevatedTransforms: savedTransforms.length,
      elevatedMeshes: savedMeshes.length,
      spawnedSoffitFixtures: spawnedEntities.length,
      vipRoof,
    }),
    dispose: () => {
      for (const e of spawnedEntities) world.despawn(e).unwrap();
      for (const v of savedVisibilities) {
        if (v.state === undefined) world.removeComponent(v.entity, Visibility).unwrap();
        else world.set(v.entity, Visibility, {state: v.state}).unwrap();
      }
      for (const s of savedMeshes.reverse()) world.set(s.entity, MeshFilter, {assetHandle: s.mesh}).unwrap();
      for (const s of savedTransforms.reverse()) world.set(s.entity, Transform, {pos: s.pos}).unwrap();
      for (const h of createdAssets) assets.release(h).unwrap();
    },
  };
}
