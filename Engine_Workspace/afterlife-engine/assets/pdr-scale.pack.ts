/** Full v2 design geometry preview. Native scene + observer only; no gameplay. */
import { definePack, definePackageId } from '@forgeax/engine/pack/source';
import { ok } from '@forgeax/engine/types';
import type { Plugin } from '@forgeax/engine/plugin';
import type { EntityHandle } from '@forgeax/engine/ecs';
import type { MeshAsset } from '@forgeax/engine/types';
import { Time, Update } from '@forgeax/engine/ecs';
import { INPUT_SNAPSHOT_RESOURCE_KEY, type InputSnapshot } from '@forgeax/engine/input';
import { euler, quat } from '@forgeax/engine/math';
import { getActiveCamera, setActiveCamera, Camera, CameraView, Skylight, MeshFilter, Visibility, VisibilityStateValue } from '@forgeax/engine/render';
import { Name, Transform, GlobalTransform, Children, ChildOf, worldDespawnScene } from '@forgeax/engine/scene';

const CAMERA_NAMES = [
  'CAM_01_ENTRANCE_HERO', 'CAM_02_STAGE_REVERSE', 'CAM_03_MAIN_BAR_WORKZONE',
  'CAM_04_FRONT_BOOTH_DETAIL', 'CAM_05_UPPER_GALLERY_OVERLOOK',
  'CAM_06_WATER_RIBBON_AND_STAIR', 'CAM_07_CEILING_STUDY',
  'CAM_08_AXON_DESIGN', 'CAM_09_VIP_ROOM_02',
  'FP_STAND_BAR', 'FP_SIT_BOOTH', 'THIRD_BAR', 'THIRD_BOOTH',
  'FP_AISLE', 'FP_STAIR_BOTTOM', 'FP_STAIR_MID', 'FP_STAIR_UPPER', 'FP_SIT_TABLE_DETAIL', 'FP_GALLERY_EXIT',
] as const;

// The imported glTF is already Y-up; apply no additional axis/scale conversion.
export const scene: Plugin.Object<{ readonly scene: string }> = {
  name: 'cyberpunk/scale-calibration-observer',
  inject: ['world', 'assets', 'gameHost'],
  async apply(ctx, config) {
    const { world } = ctx;
    const assets = ctx.assets!;
    const loaded = await assets.load(assets.parseGuid(config.scene), 'scene');
    if (!loaded.ok) throw loaded.error;
const readScaleBounds = (rootNames: readonly string[]) => {
  const world = ctx.world;
  const assets = ctx.assets!;
  const entities = Array.from(world.query({ read: [Name] }).unwrap(), row => row.entity);
  return rootNames.map(name => {
    const matches = entities.filter(e => world.get(e, Name).unwrap().value === name);
    if (matches.length !== 1) return { name, status: matches.length ? 'ambiguous-name' : 'missing-root' };
    const root = matches[0];
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    const pending = [root], seen = new Set<number>();
    let meshCount = 0, vertexCount = 0, aabbFallbackCount = 0;
    const errors: { entity: number; error: string }[] = [];
    while (pending.length) {
      const entity = pending.pop()!;
      if (seen.has(entity)) continue;
      seen.add(entity);
      const children = world.get(entity, Children);
      if (children.ok) for (const child of children.value.entities) pending.push(child as EntityHandle);
      const filter = world.get(entity, MeshFilter);
      if (!filter.ok || filter.value.assetHandle === 0) continue;
      const transform = world.get(entity, GlobalTransform);
      const content = assets.read(filter.value.assetHandle);
      if (!transform.ok || !content.ok) { errors.push({ entity, error: !transform.ok ? transform.error.code : !content.ok ? content.error.code : 'unknown' }); continue; }
      const mesh = content.value as MeshAsset;
      const m = transform.value.world; // column-major, parent-inclusive; DO NOT multiply parent again.
      let positions: Float32Array | undefined;
      const source = mesh.attributes.position;
      if (source instanceof Float32Array) positions = source;
      else if (source instanceof ArrayBuffer) positions = new Float32Array(source);
      if (!positions && mesh.aabb?.length === 6) {
        // Packed meshes may omit CPU positions. This is conservative, not exact shape bounds.
        const b = mesh.aabb, corners: number[] = [];
        for (const x of [b[0], b[3]]) for (const y of [b[1], b[4]]) for (const z of [b[2], b[5]]) corners.push(x, y, z);
        positions = new Float32Array(corners); aabbFallbackCount++;
      }
      if (!positions) { errors.push({ entity, error: 'mesh-positions-and-aabb-unavailable' }); continue; }
      meshCount++;
      for (let i = 0; i + 2 < positions.length; i += 3) {
        const x = positions[i], y = positions[i + 1], z = positions[i + 2];
        const p = [m[0]*x+m[4]*y+m[8]*z+m[12], m[1]*x+m[5]*y+m[9]*z+m[13], m[2]*x+m[6]*y+m[10]*z+m[14]];
        if (!p.every(Number.isFinite)) { errors.push({ entity, error: 'nonfinite-world-position' }); continue; }
        vertexCount++;
        for (let axis = 0; axis < 3; axis++) { min[axis] = Math.min(min[axis], p[axis]); max[axis] = Math.max(max[axis], p[axis]); }
      }
    }
    const global = world.get(root, GlobalTransform);
    const transform = world.get(root, Transform);
    const ancestors = []; let ancestor = root;
    const visited = new Set<number>();
    while (!visited.has(ancestor)) {
      visited.add(ancestor);
      const relation = world.get(ancestor, ChildOf);
      if (!relation.ok || relation.value.parent === null) break;
      ancestor = relation.value.parent;
      const parentName = world.get(ancestor, Name), parentLocal = world.get(ancestor, Transform), parentWorld = world.get(ancestor, GlobalTransform);
      ancestors.push({ entity: ancestor, name: parentName.ok ? parentName.value.value : null, localScale: parentLocal.ok ? Array.from(parentLocal.value.scale) : null, worldMatrix: parentWorld.ok ? Array.from(parentWorld.value.world) : null });
    }
    return { name, entity: root, status: errors.length ? 'incomplete' : vertexCount ? 'measured' : 'no-mesh-data',
      basis: 'Engine-native Y-up meters', method: aabbFallbackCount ? 'mixed positions and conservative transformed local AABB corners' : 'all actual CPU mesh POSITION vertices through GlobalTransform.world',
      meshCount, vertexCount, aabbFallbackCount, min: vertexCount ? min : null, max: vertexCount ? max : null,
      dimensions: vertexCount ? max.map((value, axis) => value-min[axis]) : null,
      localScale: transform.ok ? Array.from(transform.value.scale) : null, rootWorldMatrix: global.ok ? Array.from(global.value.world) : null,
      ancestors, errors };
  });
};

    await ctx.effect(async function* () {
      yield () => assets.release(loaded.value).unwrap();
      const root = assets.instantiate(loaded.value, world).unwrap();
      yield () => worldDespawnScene(world, root).unwrap();
      // Temporary diffuse-only geometry inspection fill, not the art lighting design.
      // No equirect, no probe/specular claim, no extra PointLight/SpotLight.
      const inspectionIrradiance = [1.5, 1.8, 2.4];
      let inspectionFill = true;
      const inspectionLight = world.spawn(
        { component: Name, data: { value: 'DIAGNOSTIC/geometry-inspection-not-art-lighting' } },
        { component: Skylight, data: { intensity: 0, ambientIrradiance: inspectionIrradiance } },
      ).unwrap();
      yield () => { if (world.get(inspectionLight, Skylight).ok) world.despawn(inspectionLight).unwrap(); };
      const imported = Array.from(world.query({ read: [Name, Camera, Transform] }).unwrap(), row => row.entity);
      const cameras = CAMERA_NAMES.map(name => {
        const entity = imported.find(e => world.get(e, Name).unwrap().value === name);
        if (entity === undefined) throw new Error(`PDR v2 imported camera missing: ${name}`);
        const t = world.get(entity, Transform).unwrap();
        const c = world.get(entity, Camera).unwrap();
        const saved = { pos: Array.from(t.pos), quat: Array.from(t.quat) };
        const horizontalFov = 2 * Math.atan(Math.tan(c.fov / 2) * c.aspect);
        if (!world.get(entity, CameraView).ok) {
          world.addComponent(entity, { component: CameraView, data: { enabled: false } }).unwrap();
        } else world.set(entity, CameraView, { enabled: false }).unwrap();
        // Existing grade is a preview initial value; v2 exposure is not calibrated.
        world.set(entity, Camera, { autoAspect: false, aspect: 16 / 9, tonemap: 1, exposureMode: 0, exposure: 0.68,
          whitePoint: 4, bloom: 1, bloomIntensity: 0.11, bloomThreshold: 1.6,
          bloomSmoothWidth: 0.4, bloomRadius: 0.22 }).unwrap();
        return { entity, name, saved, horizontalFov };
      });
      const cutaway = Array.from(world.query({ read: [Name] }).unwrap(), row => row.entity)
        .filter(entity => {
          const name = world.get(entity, Name).unwrap().value;
          return name === 'SLAB_ROOF_MAIN' || name.startsWith('WALL_SOUTH') || name === 'WALL_EAST';
        }).map(entity => {
          const original = world.get(entity, Visibility);
          const state = original.ok ? original.value.state : VisibilityStateValue.inherited;
          if (!original.ok) world.addComponent(entity, { component: Visibility, data: { state } }).unwrap();
          return { entity, state };
        });
      const previousActiveCamera = getActiveCamera(world);
      yield () => {
        if (previousActiveCamera) setActiveCamera(world, previousActiveCamera.entity);
        else world.removeResource('ActiveCamera');
      };
      const calibrationMeshes = Array.from(world.query({ read: [Name] }).unwrap(), row => row.entity)
        .filter(e => world.get(e, Name).unwrap().value.startsWith('CALIB/'));
      for (const e of calibrationMeshes) {
        if (!world.get(e, Visibility).ok) world.addComponent(e, {component: Visibility, data: {state: VisibilityStateValue.inherited}}).unwrap();
      }
      let humansVisible = true;
      let freeMove = false;
      let selected = 11;
      const keyCodes = ['Digit1','Digit2','Digit3','Digit4','Digit5','Digit6','Digit7','Digit8','Digit9',
        'F1','F2','F3','F4','F5','F6','F7','F8','F9','F10'];
      const eyeHeight = () => cameras[selected].name.startsWith('FP_SIT_') ? 1.20 : 1.64;
      // Calibration walking surface from frozen stair dimensions; not physics collision.
      const floorAt = (x: number, engineZ: number, previous: number) => {
        const y = -engineZ;
        if (x >= 15.7 && x <= 17.4 && y >= 2.5 && y <= 6.7)
          return Math.min(2.4375, Math.max(.1625, (Math.floor((6.7-y)/.28)+1)*.1625));
        if (x >= 13.7 && x <= 15.4 && y >= 2.5 && y <= 6.7)
          return 2.6 + Math.min(2.4375, Math.max(.1625, (Math.floor((y-2.5)/.28)+1)*.1625));
        if (x >= 13.7 && x <= 17.4 && y >= .8 && y <= 2.5) return 2.6;
        if (x >= -1 && x <= 19 && y >= 6.7 && y <= 14 && previous > 3.5) return 5.2;
        if (x <= -11 && x >= -19 && y >= -8 && y <= 8) return 1.1;
        return 0;
      };
      let yaw = 0, pitch = 0, roll = 0;
      const keys = new Map<string, boolean>();
      const select = (index: number) => {
        selected = index;
        for (let i = 0; i < cameras.length; i++) {
          world.set(cameras[i].entity, CameraView, { enabled: i === index }).unwrap();
        }
        const camera = cameras[index];
        // Native observation/editor selection must match the enabled render view.
        setActiveCamera(world, camera.entity);
        for (const item of cutaway) world.set(item.entity, Visibility, {
          state: index === 7 ? VisibilityStateValue.hidden : item.state,
        }).unwrap();
        // Number keys restore the frozen authored viewpoint, including after free flight.
        world.set(camera.entity, Transform, camera.saved).unwrap();
        const rotation = euler.fromQuat(euler.create(), camera.saved.quat, 'YXZ');
        yaw = rotation.y; pitch = rotation.x; roll = rotation.z;
      };
      select(11);
      world.addSystem(Update, {
        name: 'cyberpunk-pdr-v2-observer', queries: [],
        fn: () => {
          if (!world.hasResource(INPUT_SNAPSHOT_RESOURCE_KEY)) return;
          const input = world.getResource<InputSnapshot>(INPUT_SNAPSHOT_RESOURCE_KEY);
          for (const code of ['KeyH', 'KeyF']) {
            const down = input.keyboard.downCode(code);
            if (down && !keys.get(code)) {
              if (code === 'KeyF') freeMove = !freeMove;
              else { humansVisible = !humansVisible;
                for (const e of calibrationMeshes) world.set(e, Visibility, { state: humansVisible ? VisibilityStateValue.inherited : VisibilityStateValue.hidden }).unwrap();
              }
            }
            keys.set(code, down);
          }
          const fillDown = input.keyboard.downCode('KeyL');
          if (fillDown && !keys.get('KeyL')) {
            inspectionFill = !inspectionFill;
            world.set(inspectionLight, Skylight, {
              intensity: 0, ambientIrradiance: inspectionFill ? inspectionIrradiance : [0, 0, 0],
            }).unwrap();
          }
          keys.set('KeyL', fillDown);
          for (let i = 0; i < cameras.length; i++) {
            const code = keyCodes[i];
            const down = input.keyboard.downCode(code) || (i >= 9 && input.keyboard.downCode(['KeyZ','KeyX','KeyC','KeyV','KeyB','KeyN','KeyM','KeyT','KeyY','KeyU'][i-9]));
            if (down && !keys.get(code)) select(i);
            keys.set(code, down);
          }
          const camera = cameras[selected];
          const lens = world.get(camera.entity, Camera).unwrap();
          const size = ctx.gameHost?.drawingBufferSize?.();
          // Fit a genuine 16:9 viewport inside any window without stretching.
          const aspect = size && size.width > 0 && size.height > 0 ? size.width / size.height : 16 / 9;
          const rect = aspect > 16 / 9 ? [(1-(16/9)/aspect)/2,0,(16/9)/aspect,1] : [0,(1-aspect/(16/9))/2,1,aspect/(16/9)];
          world.set(camera.entity, CameraView, { viewport: rect }).unwrap();
          world.set(camera.entity, Camera, { autoAspect: false, aspect: 16 / 9,
            fov: 2 * Math.atan(Math.tan(camera.horizontalFov / 2) / (16 / 9)) }).unwrap();
          if (!freeMove) return;
          const dt = Math.min(0.05, Math.max(0, world.getResource(Time).delta));
          const key = (code: string) => Number(input.keyboard.downCode(code));
          let turnX = (key('ArrowLeft') - key('ArrowRight')) * 1.5 * dt;
          let turnY = (key('ArrowUp') - key('ArrowDown')) * 1.5 * dt;
          if (input.mouse.button(2)) {
            turnX -= input.mouse.movementDelta.x * 0.003;
            turnY -= input.mouse.movementDelta.y * 0.003;
          }
          if (turnX || turnY) {
            yaw += turnX;
            pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, pitch + turnY));
            world.set(camera.entity, Transform, { quat: Array.from(quat.fromEuler(quat.create(), pitch, yaw, roll, 'YXZ')) }).unwrap();
          }
          const right = key('KeyD') - key('KeyA');
          const forward = key('KeyW') - key('KeyS');
          const firstPerson = cameras[selected].name.startsWith('FP_');
          const up = firstPerson ? 0 : key('KeyE') - key('KeyQ');
          const length = Math.hypot(right, forward, up);
          if (length) {
            const accelerated = input.keyboard.downCode('ShiftLeft') || input.keyboard.downCode('ShiftRight');
            const speed = firstPerson ? (accelerated ? 2.8 : 1.4) : (accelerated ? 8 : 3);
            const step = speed * dt / Math.max(1, length);
            const p = world.get(camera.entity, Transform).unwrap().pos;
            const next = [
              p[0] + (Math.cos(yaw) * right - Math.sin(yaw) * Math.cos(pitch) * forward) * step,
              p[1] + (up + Math.sin(pitch) * forward) * step,
              p[2] + (-Math.sin(yaw) * right - Math.cos(yaw) * Math.cos(pitch) * forward) * step,
            ];
            if (firstPerson) next[1] = floorAt(next[0], next[2], p[1] - eyeHeight()) + eyeHeight();
            world.set(camera.entity, Transform, { pos: next }).unwrap();
          }
        },
      }).unwrap();
      yield () => world.removeSystem(Update, 'cyberpunk-pdr-v2-observer').unwrap();
      const measurementNames = ["SOC-T01", "SOC-C01-1", "SOC-C01-2", "SOC-C01-3", "SOC-T02", "SOC-C02-1", "SOC-C02-2", "SOC-C02-3", "SOC-T03", "SOC-C03-1", "SOC-C03-2", "SOC-C03-3", "SOC-T04", "SOC-C04-1", "SOC-C04-2", "SOC-C04-3", "SOC-T05", "SOC-C05-1", "SOC-C05-2", "SOC-C05-3", "SOC-T06", "SOC-C06-1", "SOC-C06-2", "SOC-C06-3", "SOC-T07", "SOC-C07-1", "SOC-C07-2", "SOC-C07-3", "SOC-T08", "SOC-C08-1", "SOC-C08-2", "SOC-C08-3", "SOC-T09", "SOC-C09-1", "SOC-C09-2", "SOC-C09-3", "SOC-H01", "SOC-H02", "SOC-H03", "SOC-H04", "BAR-S01", "BAR-S02", "BAR-S03", "BAR-S04", "BAR-S05", "BAR-S06", "BAR-S07", "BAR-S08", "BAR-S09", "BAR-S10", "BAR-S11", "BAR-S12", "BOOTH-1", "BOOTH-T1", "BOOTH-2", "BOOTH-T2", "BOOTH-3", "BOOTH-T3", "VIP-S1", "VIP-T1", "VIP-S2", "VIP-T2", "VIP-S3", "VIP-T3", "VIP-S4", "VIP-T4", "SRV-R1", "SRV-R2", "SRV-R3", "SRV-P1", "SRV-P2"].concat(Array.from(world.query({read: [Name]}).unwrap(), row => world.get(row.entity, Name).unwrap().value).filter(name => name.startsWith('CALIB/')));
      world.insertResource('cyberpunk.scale.calibration', {
        setHumans: (visible: boolean) => {
          humansVisible = visible;
          for (const e of calibrationMeshes) world.set(e, Visibility, {state: visible ? VisibilityStateValue.inherited : VisibilityStateValue.hidden}).unwrap();
          return humansVisible;
        },
        readBounds: () => JSON.parse(JSON.stringify(readScaleBounds(measurementNames))),
        readProbes: () => Array.from(world.query({read:[Name, MeshFilter, GlobalTransform]}).unwrap(), row => {
          const name = row.get(Name).value;
          if (!name.startsWith('CALIB/')) return null;
          const mesh = assets.read(row.get(MeshFilter).assetHandle).unwrap() as MeshAsset;
          const p = mesh.attributes.position;
          const positions = p instanceof Float32Array ? Array.from(p) : p instanceof ArrayBuffer ? Array.from(new Float32Array(p)) : null;
          return { name, positions, indices: mesh.indices ? Array.from(mesh.indices) : null,
            worldMatrix: Array.from(row.get(GlobalTransform).world) };
        }).filter(row => row !== null),
        select: (index: number) => { if (index < 0 || index >= cameras.length) throw new Error('camera index'); select(index); return cameras[selected].name; },
        readCamera: () => ({name: cameras[selected].name, freeMove, humansVisible,
          position: Array.from(world.get(cameras[selected].entity, Transform).unwrap().pos),
          lens: JSON.parse(JSON.stringify(world.get(cameras[selected].entity, Camera).unwrap())),
          view: JSON.parse(JSON.stringify(world.get(cameras[selected].entity, CameraView).unwrap()))}),
      });
      yield () => world.removeResource('cyberpunk.scale.calibration');
      if (ctx.gameHost?.gameProjection) yield ctx.gameHost.gameProjection.registerRead({
        id: 'cyberpunk.scale-calibration.bounds', title: 'Actual imported mesh world dimensions',
        description: 'Read actual CPU positions through Engine GlobalTransform. Y-up metres.',
        read: () => JSON.parse(JSON.stringify(readScaleBounds(measurementNames))),
      });
      if (ctx.gameHost?.gameProjection) yield ctx.gameHost.gameProjection.registerRead({
        id: 'cyberpunk.scale-calibration.observer', title: 'PDR v2 design observer',
        description: '1–9 original cameras; F1–F8 calibration views; F fixed/free; H reference humans; WASD walk or third-person QE fly; L diagnostic fill. Calibration stair floor sampling, no physics/collision acceptance.',
        read: () => ({ selected: selected + 1, camera: cameras[selected].name, cameraCount: cameras.length, freeMove, humansVisible, units: 'metres', calibrationEyeHeightM: eyeHeight(), viewportAspect: 16 / 9,
          horizontalFovDeg: cameras[selected].horizontalFov * 180 / Math.PI, verticalFovDeg: world.get(cameras[selected].entity, Camera).unwrap().fov * 180 / Math.PI,
          cameras: cameras.map(c => ({ name: c.name, enabled: world.get(c.entity, CameraView).unwrap().enabled })),
          position: Array.from(world.get(cameras[selected].entity, Transform).unwrap().pos),
          cutawayHidden: selected === 7 ? cutaway.map(c => world.get(c.entity, Name).unwrap().value) : [],
          inspectionFill, inspectionFillKind: 'temporary diffuse-only geometry inspection; not art lighting',
          inspectionAmbientIrradiance: inspectionFill ? inspectionIrradiance : [0, 0, 0],
          inspectionFillHasEquirectOrSpecularProbe: false, previewGradeCalibrated: false, sceneGuid: config.scene, status: 'design-geometry-preview' }),
      });
    }, 'cyberpunk/scale-calibration-observer');
  },
};

export default definePack({
  schemaVersion: '2.0.0', plugins: true,
  packageId: definePackageId('c92b8fae-3d4e-4c72-867d-98345026b9cc'),
  build: () => ok({
    'plugin/scene': { kind: 'plugin', module: { specifier: './pdr-scale.pack.ts', export: 'scene' },
      config: { scene: { $asset: '01a18577-0900-726c-b201-ef01ba5d8da6' } } },
  }),
});
