import type { GameHost } from '@forgeax/engine/app';
import { FixedTime, FixedUpdate, Update, type EntityHandle } from '@forgeax/engine/ecs';
import { INPUT_SNAPSHOT_RESOURCE_KEY, type InputSnapshot } from '@forgeax/engine/input';
import { quat, vec3 } from '@forgeax/engine/math';
import { CharacterController, Collider, ColliderShapeValue, RigidBody, RigidBodyTypeValue, type PhysicsWorld } from '@forgeax/engine/physics';
import type { Plugin } from '@forgeax/engine/plugin';
import { createBoxGeometry } from '@forgeax/engine/geometry';
import { Camera, Materials, MeshFilter, MeshRenderer } from '@forgeax/engine/render';
import { GlobalTransform, Name, Transform } from '@forgeax/engine/scene';
import { afterVerticalMove, mouseLook, RUN_SPEED, verticalStep, walkingDisplacement } from './movement';
import v4Colliders from './workbuddy-v4-colliders.json';
import { PLAYER_SPAWN, PLAYER_YAW, areaAt } from './room-layout';
import { EYE_OFFSET, HORIZONTAL_FOV_DEG, verticalFovForHorizontal } from './lens';
import { adultBoxes, CALIBRATION_TABLE, GROUND_TOP, horizontalFovDeg, matrixScale, rulerBoxes, viewpoint } from './calibration';

const STATE = 'afterlife.first-person';
interface PlayerState { yaw: number; pitch: number; verticalVelocity: number; jumpHeld: boolean; jumps: number; distance: number; }
interface CalibrationState { on: boolean; keys: Record<string, boolean>; teleport: number; entities: EntityHandle[]; }

const firstPerson: Plugin = {
  name: 'afterlife/first-person',
  inject: ['world', 'gameHost', 'physics', 'assets'],
  apply(ctx) {
    const world = ctx.world;
    const host: GameHost | undefined = ctx.gameHost;
    if (!host) throw new Error('Afterlife requires GameHost');
    const camera = Array.from(world.query({ read: [Camera, Transform] }).unwrap(), row => row.entity).find(entity => world.get(entity, Name).unwrap().value === '01 / Interior hero');
    if (camera === undefined) throw new Error('Afterlife requires its imported hero camera.');
    ctx.effect(function* () {
      const owned: EntityHandle[] = [];
      const original = world.get(camera, Transform).unwrap();
      const originalTransform = { pos: Array.from(original.pos), quat: Array.from(original.quat) };
      const c = world.get(camera, Camera).unwrap();
      const originalCamera = { fov: c.fov, aspect: c.aspect, autoAspect: c.autoAspect, near: c.near, far: c.far, tonemap: c.tonemap, bloom: c.bloom, bloomIntensity: c.bloomIntensity };
      yield () => {
        if (world.get(camera, Transform).ok) world.set(camera, Transform, originalTransform).unwrap();
        if (world.get(camera, Camera).ok) world.set(camera, Camera, originalCamera).unwrap();
      };
      for (const row of v4Colliders) {
        owned.push(world.spawn(
          { component: Name, data: { value: `Collision / ${row.name}` } },
          { component: Transform, data: { pos: row.pos } },
          { component: RigidBody, data: { type: RigidBodyTypeValue.static } },
          { component: Collider, data: { shape: ColliderShapeValue.cuboid, halfExtents: row.half } },
        ).unwrap());
      }
      const player = world.spawn(
        { component: Name, data: { value: 'First Person Player' } },
        { component: Transform, data: { pos: PLAYER_SPAWN } },
        { component: RigidBody, data: { type: RigidBodyTypeValue.kinematic } },
        { component: Collider, data: { shape: ColliderShapeValue.capsule, radius: .28, halfHeight: .57 } },
        { component: CharacterController, data: { autoStepMaxHeight: .32, snapToGroundDist: .2, offset: .02 } },
      ).unwrap();
      owned.push(player);
      yield () => { for (const entity of owned.reverse()) if (world.get(entity, Transform).ok) world.despawn(entity).unwrap(); };
      world.insertResource(STATE, { yaw: PLAYER_YAW, pitch: 0, verticalVelocity: 0, jumpHeld: false, jumps: 0, distance: 0 } satisfies PlayerState);
      yield () => world.removeResource(STATE);
      host.setPointerLockAllowed?.(true);
      yield () => host.setPointerLockAllowed?.(false);
      // ---- scale calibration (off by default): KeyC toggles ruler + 1.75 m adult, Digit1/Digit2 stand 1 m / 2 m from R4a.
      const assets = ctx.assets!;
      const cal: CalibrationState = { on: false, keys: {}, teleport: 0, entities: [] };
      const owned_assets: unknown[] = [];
      const calMaterials = [
        assets.create(Materials.standard({ baseColor: [1, .1, .45, 1], roughness: .6, emissive: [1, .1, .45], emissiveIntensity: .6 })).unwrap(),
        assets.create(Materials.standard({ baseColor: [.95, .95, .95, 1], roughness: .6, emissive: [1, 1, 1], emissiveIntensity: .35 })).unwrap(),
      ];
      owned_assets.push(...calMaterials);
      const spawnCalibration = () => {
        for (const b of [...rulerBoxes(), ...adultBoxes()]) {
          const mesh = assets.create(createBoxGeometry(b.size[0], b.size[1], b.size[2]).unwrap()).unwrap();
          owned_assets.push(mesh);
          cal.entities.push(world.spawn(
            { component: Name, data: { value: b.name } },
            { component: Transform, data: { pos: b.center } },
            { component: MeshFilter, data: { assetHandle: mesh } },
            { component: MeshRenderer, data: { materials: [calMaterials[b.band]] } },
          ).unwrap());
        }
      };
      const despawnCalibration = () => { for (const e of cal.entities.splice(0)) if (world.get(e, Transform).ok) world.despawn(e).unwrap(); };
      yield () => { despawnCalibration(); for (const h of owned_assets) assets.release(h as never).unwrap(); };
      const edge = (input: InputSnapshot, code: string) => { const down = input.keyboard.downCode(code); const fired = down && !cal.keys[code]; cal.keys[code] = down; return fired; };
      // The imported glTF camera arrives with autoAspect false and a fixed 16:9 aspect; follow the real canvas instead.
      const size = host.drawingBufferSize?.();
      const startAspect = size && size.width > 0 && size.height > 0 ? size.width / size.height : c.aspect;
      world.set(camera, Camera, { autoAspect: true, aspect: startAspect, fov: verticalFovForHorizontal(HORIZONTAL_FOV_DEG, startAspect), near: .06, far: 120, tonemap: 1, bloom: 1 }).unwrap(); // exposure and Bloom levels are owned by atmosphere/grade.ts
      world.addSystem(FixedUpdate, {
        name: 'afterlife-walk', queries: [],
        fn: () => {
          if (!world.hasResource('PhysicsWorld')) return;
          const physics = world.getResource<PhysicsWorld>('PhysicsWorld');
          if (!physics.hasBody(player)) return;
          if (cal.teleport) {
            const view = viewpoint(cal.teleport); cal.teleport = 0;
            physics.teleport(player, vec3.create(...view.position));
            const s = world.getResource<PlayerState>(STATE); s.yaw = view.yaw; s.pitch = view.pitch; s.verticalVelocity = 0;
          }
          const input = world.getResource<InputSnapshot>(INPUT_SNAPSHOT_RESOURCE_KEY);
          const state = world.getResource<PlayerState>(STATE);
          const dt = world.getResource(FixedTime).delta;
          // Keyboard turning remains available when the browser releases pointer lock.
          state.yaw += (Number(input.keyboard.downCode('ArrowLeft')) - Number(input.keyboard.downCode('ArrowRight'))) * 2.4 * dt;
          const right = Number(input.keyboard.downCode('KeyD')) - Number(input.keyboard.downCode('KeyA'));
          const forward = Number(input.keyboard.downCode('KeyW')) - Number(input.keyboard.downCode('KeyS'));
          const sprint = input.keyboard.downCode('ShiftLeft') || input.keyboard.downCode('ShiftRight');
          const move = walkingDisplacement(state.yaw, right, forward, dt, sprint ? RUN_SPEED : undefined);
          // Space: press-edge jump from the ground only; holding it never auto-repeats after landing.
          const grounded = world.get(player, CharacterController).unwrap().grounded;
          const vertical = verticalStep({ velocity: state.verticalVelocity, jumpHeld: state.jumpHeld }, grounded, input.keyboard.downCode('Space'), dt);
          state.jumpHeld = vertical.jumpHeld;
          if (vertical.jumped) state.jumps++;
          const requestedDy = vertical.velocity * dt;
          const delta = physics.moveAndSlide(player, vec3.create(move[0], requestedDy, move[2]));
          state.verticalVelocity = afterVerticalMove(vertical.velocity, requestedDy, delta[1]);
          state.distance += Math.hypot(delta[0], delta[2]);
        },
      }).unwrap();
      yield () => world.removeSystem(FixedUpdate, 'afterlife-walk').unwrap();
      world.addSystem(Update, {
        name: 'afterlife-first-person-camera', queries: [],
        fn: () => {
          const state = world.getResource<PlayerState>(STATE);
          const input = world.getResource<InputSnapshot>(INPUT_SNAPSHOT_RESOURCE_KEY);
          if (edge(input, 'KeyC')) { cal.on = !cal.on; if (cal.on) spawnCalibration(); else despawnCalibration(); }
          if (edge(input, 'Digit1') && cal.on) cal.teleport = 1;
          if (edge(input, 'Digit2') && cal.on) cal.teleport = 2;
          if (input.mouse.pointerLocked || input.mouse.button(2)) Object.assign(state, mouseLook(state.yaw, state.pitch, input.mouse.movementDelta.x, input.mouse.movementDelta.y));
          const p = world.get(player, Transform).unwrap().pos;
          const rotation = quat.fromEuler(quat.create(), state.pitch, state.yaw, 0, 'YXZ');
          world.set(camera, Transform, { pos: [p[0], p[1] + EYE_OFFSET, p[2]], quat: Array.from(rotation) }).unwrap();
          // Hor+ lens: keep 84° horizontal as the canvas aspect changes (Camera.fov is vertical).
          const lens = world.get(camera, Camera).unwrap();
          const fov = verticalFovForHorizontal(HORIZONTAL_FOV_DEG, lens.aspect);
          if (Math.abs(lens.fov - fov) > 1e-4) world.set(camera, Camera, { fov }).unwrap();
        },
      }).unwrap();
      yield () => world.removeSystem(Update, 'afterlife-first-person-camera').unwrap();
      if (host.gameProjection) yield host.gameProjection.registerRead({
        id: 'afterlife.player', title: 'First person player',
        description: 'Collision-resolved player position, mouse look, jump state, and travelled distance.',
        read: () => {
          const state = world.getResource<PlayerState>(STATE);
          const position = Array.from(world.get(player, Transform).unwrap().pos);
          const area = areaAt(position);
          return { position, area, yaw: state.yaw, pitch: state.pitch, travelled: state.distance, verticalVelocity: state.verticalVelocity, jumps: state.jumps, jumpHeld: state.jumpHeld, grounded: world.get(player, CharacterController).unwrap().grounded, physicsReady: world.hasResource('PhysicsWorld'), pointerLocked: world.getResource<InputSnapshot>(INPUT_SNAPSHOT_RESOURCE_KEY).mouse.pointerLocked, fixedTick: world.getResource(FixedTime).tick };
        },
      });
      if (host.gameProjection) yield host.gameProjection.registerRead({
        id: 'afterlife.calibration', title: 'First-person scale calibration',
        description: 'Live lens, canvas aspect, eye height and imported-scene world scale (KeyC toggles ruler and 1.75 m adult; Digit1/Digit2 stand 1 m / 2 m from the R4a table).',
        read: () => {
          const lens = world.get(camera, Camera).unwrap();
          const eye = Array.from(world.get(camera, GlobalTransform).unwrap().world).slice(12, 15);
          const floor = eye[1] > 5.6 + 1 ? 5.6 : GROUND_TOP;
          const scales = Array.from(world.query({ read: [Name, MeshRenderer] }).unwrap(), row => row.entity)
            .filter(e => world.get(e, Name).unwrap().value.startsWith('V4 / '))
            .map(e => matrixScale(world.get(e, GlobalTransform).unwrap().world));
          const flat = scales.flatMap(v => v.filter((_, i) => i !== 1));   // Plant_Leaf carries an authored 1.25 Y stretch
          return {
            calibration: cal.on, verticalFovDeg: lens.fov * 180 / Math.PI, aspect: lens.aspect, autoAspect: lens.autoAspect,
            drawingBufferSize: (() => { const b = host.drawingBufferSize?.(); return b ? { width: b.width, height: b.height } : null; })(),
            drawingBufferAspect: (() => { const b = host.drawingBufferSize?.(); return b && b.height > 0 ? b.width / b.height : null; })(),
            horizontalFovDeg: horizontalFovDeg(lens.fov, lens.aspect), eyeWorld: eye, eyeHeightAboveFloor: eye[1] - floor,
            distanceToCalibrationTableEdge: Math.abs(eye[2] - CALIBRATION_TABLE.nearEdgeZ),
            importedMeshEntities: scales.length, worldScaleXZ: { min: Math.min(...flat), max: Math.max(...flat) },
          };
        },
      });
    }, 'afterlife/first-person');
  },
};
export default firstPerson;
