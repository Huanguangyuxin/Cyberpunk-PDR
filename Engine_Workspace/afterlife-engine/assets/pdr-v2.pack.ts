/** Full v2 design geometry preview. Native scene + observer only; no gameplay. */
import { definePack, definePackageId } from '@forgeax/engine/pack/source';
import { ok } from '@forgeax/engine/types';
import type { Plugin } from '@forgeax/engine/plugin';
import { Time, Update } from '@forgeax/engine/ecs';
import { INPUT_SNAPSHOT_RESOURCE_KEY, type InputSnapshot } from '@forgeax/engine/input';
import { euler, quat } from '@forgeax/engine/math';
import { getActiveCamera, setActiveCamera, Camera, CameraView, Skylight, Visibility, VisibilityStateValue } from '@forgeax/engine/render';
import { Name, Transform, worldDespawnScene } from '@forgeax/engine/scene';

const CAMERA_NAMES = [
  'CAM_01_ENTRANCE_HERO', 'CAM_02_STAGE_REVERSE', 'CAM_03_MAIN_BAR_WORKZONE',
  'CAM_04_FRONT_BOOTH_DETAIL', 'CAM_05_UPPER_GALLERY_OVERLOOK',
  'CAM_06_WATER_RIBBON_AND_STAIR', 'CAM_07_CEILING_STUDY',
  'CAM_08_AXON_DESIGN', 'CAM_09_VIP_ROOM_02',
] as const;

// The imported glTF is already Y-up; apply no additional axis/scale conversion.
export const scene: Plugin.Object<{ readonly scene: string }> = {
  name: 'cyberpunk/pdr-v2-observer',
  inject: ['world', 'assets', 'gameHost'],
  async apply(ctx, config) {
    const { world } = ctx;
    const assets = ctx.assets!;
    const loaded = await assets.load(assets.parseGuid(config.scene), 'scene');
    if (!loaded.ok) throw loaded.error;
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
        world.set(entity, Camera, { autoAspect: true, tonemap: 1, exposureMode: 0, exposure: 0.68,
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
      let selected = 0;
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
      select(0);
      world.addSystem(Update, {
        name: 'cyberpunk-pdr-v2-observer', queries: [],
        fn: () => {
          if (!world.hasResource(INPUT_SNAPSHOT_RESOURCE_KEY)) return;
          const input = world.getResource<InputSnapshot>(INPUT_SNAPSHOT_RESOURCE_KEY);
          const fillDown = input.keyboard.downCode('KeyL');
          if (fillDown && !keys.get('KeyL')) {
            inspectionFill = !inspectionFill;
            world.set(inspectionLight, Skylight, {
              intensity: 0, ambientIrradiance: inspectionFill ? inspectionIrradiance : [0, 0, 0],
            }).unwrap();
          }
          keys.set('KeyL', fillDown);
          for (let i = 0; i < cameras.length; i++) {
            const code = `Digit${i + 1}`;
            const down = input.keyboard.downCode(code);
            if (down && !keys.get(code)) select(i);
            keys.set(code, down);
          }
          const camera = cameras[selected];
          const lens = world.get(camera.entity, Camera).unwrap();
          const size = ctx.gameHost?.drawingBufferSize?.();
          const aspect = size && size.width > 0 && size.height > 0 ? size.width / size.height : lens.aspect;
          const fov = 2 * Math.atan(Math.tan(camera.horizontalFov / 2) / aspect);
          if (Math.abs(fov - lens.fov) > 1e-5 || Math.abs(aspect - lens.aspect) > 1e-5) {
            world.set(camera.entity, Camera, { aspect, fov }).unwrap();
          }
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
          const up = key('KeyE') - key('KeyQ');
          const length = Math.hypot(right, forward, up);
          if (length) {
            const speed = input.keyboard.downCode('ShiftLeft') || input.keyboard.downCode('ShiftRight') ? 8 : 3;
            const step = speed * dt / Math.max(1, length);
            const p = world.get(camera.entity, Transform).unwrap().pos;
            world.set(camera.entity, Transform, { pos: [
              p[0] + (Math.cos(yaw) * right - Math.sin(yaw) * Math.cos(pitch) * forward) * step,
              p[1] + (up + Math.sin(pitch) * forward) * step,
              p[2] + (-Math.sin(yaw) * right - Math.cos(yaw) * Math.cos(pitch) * forward) * step,
            ] }).unwrap();
          }
        },
      }).unwrap();
      yield () => world.removeSystem(Update, 'cyberpunk-pdr-v2-observer').unwrap();
      if (ctx.gameHost?.gameProjection) yield ctx.gameHost.gameProjection.registerRead({
        id: 'cyberpunk.pdr-v2.observer', title: 'PDR v2 design observer',
        description: 'Digit1–9 restore authored viewpoints; WASD/QE fly; arrows/right mouse look; Shift faster; L toggles diagnostic diffuse fill. No collision/gameplay.',
        read: () => ({ selected: selected + 1, camera: cameras[selected].name, cameraCount: cameras.length,
          cameras: cameras.map(c => ({ name: c.name, enabled: world.get(c.entity, CameraView).unwrap().enabled })),
          position: Array.from(world.get(cameras[selected].entity, Transform).unwrap().pos),
          cutawayHidden: selected === 7 ? cutaway.map(c => world.get(c.entity, Name).unwrap().value) : [],
          inspectionFill, inspectionFillKind: 'temporary diffuse-only geometry inspection; not art lighting',
          inspectionAmbientIrradiance: inspectionFill ? inspectionIrradiance : [0, 0, 0],
          inspectionFillHasEquirectOrSpecularProbe: false, previewGradeCalibrated: false, sceneGuid: config.scene, status: 'design-geometry-preview' }),
      });
    }, 'cyberpunk/pdr-v2-observer');
  },
};

export default definePack({
  schemaVersion: '2.0.0', plugins: true,
  packageId: definePackageId('718a7f6b-bc38-45f7-b15f-2ccdd8726c01'),
  build: () => ok({
    'plugin/scene': { kind: 'plugin', module: { specifier: './pdr-v2.pack.ts', export: 'scene' },
      config: { scene: { $asset: '01a18228-ef3c-79bf-b07c-c5dccdcb1a36' } } },
  }),
});
