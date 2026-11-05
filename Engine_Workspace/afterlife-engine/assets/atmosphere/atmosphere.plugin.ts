import type { GameHost } from '@forgeax/engine/app';
import type { EntityHandle } from '@forgeax/engine/ecs';
import type { Plugin } from '@forgeax/engine/plugin';
import { ANTIALIAS_FXAA, Camera, PointLight, SpotLight, VolumetricFog, VolumetricFogSamplingValue } from '@forgeax/engine/render';
import { Name, Transform } from '@forgeax/engine/scene';
import type { TextureAsset } from '@forgeax/engine/types';
import zones from './fog-zones.json';
import { smokeDensity } from './density';
import { CAMERA_GRADE, FOG_ALBEDO, FOG_EMISSION } from './grade';

const atmosphere: Plugin = {
  name: 'afterlife/volumetric-atmosphere', inject: ['world', 'gameHost', 'assets'],
  apply(ctx) {
    const world = ctx.world;
    const host: GameHost | undefined = ctx.gameHost;
    if (!host) throw new Error('Afterlife requires GameHost');
    ctx.effect(function* () {
      const lights = [PointLight, SpotLight].flatMap(component =>
        Array.from(world.query({ read: [Name, Transform, component] }).unwrap(), row => ({
          entity: row.entity, name: world.get(row.entity, Name).unwrap().value,
          pos: Array.from(world.get(row.entity, Transform).unwrap().pos),
        })));
      const nearest = (prefix: string, target: number[]) => {
        const found = lights.filter(l => l.name.startsWith(prefix)).sort((a, b) =>
          Math.hypot(...a.pos.map((p, i) => p - target[i])) - Math.hypot(...b.pos.map((p, i) => p - target[i])))[0];
        if (!found) throw new Error(`No authored light for ${prefix}`);
        return found;
      };
      const selected = zones.map(z => ({ zone: z, source: nearest(z.lightPrefix, z.nearest) }));
      const asset: TextureAsset = { kind: 'texture', shape: { viewDimension: '3d', extent: { width: 32, height: 32, depth: 32 } },
        format: 'r8unorm', colorSpace: 'linear', mips: { kind: 'none' }, data: smokeDensity() };
      const density = ctx.assets!.create(asset).unwrap();
      const owned: EntityHandle[] = [];
      yield () => {
        for (const entity of owned) if (world.get(entity, VolumetricFog).ok) world.despawn(entity).unwrap();
        ctx.assets!.release(density).unwrap();
      };
      for (const { zone, source } of selected) owned.push(world.spawn(
        { component: Name, data: { value: `Atmosphere / ${zone.name}` } },
        { component: VolumetricFog, data: {
          light: source.entity, density, boundsMin: zone.min, boundsMax: zone.max,
          extinction: [zone.extinction, zone.extinction, zone.extinction], albedo: FOG_ALBEDO,
          emission: FOG_EMISSION, anisotropy: zone.anisotropy,
          maxDistance: 60, sampling: VolumetricFogSamplingValue.noise,
        } },
      ).unwrap());
      const cameras = Array.from(world.query({ read: [Camera] }).unwrap(), row => row.entity);
      const before = cameras.map(entity => {
        const c = world.get(entity, Camera).unwrap();
        return { entity, data: { antialias: c.antialias, exposureMode: c.exposureMode, exposure: c.exposure, whitePoint: c.whitePoint,
          bloomIntensity: c.bloomIntensity, bloomThreshold: c.bloomThreshold, bloomSmoothWidth: c.bloomSmoothWidth, bloomRadius: c.bloomRadius } };
      });
      for (const entity of cameras) {
        world.set(entity, Camera, { antialias: ANTIALIAS_FXAA, ...CAMERA_GRADE }).unwrap();
      }
      yield () => { for (const row of before) if (world.get(row.entity, Camera).ok) {
        world.set(row.entity, Camera, row.data).unwrap();
      } };
      if (host.gameProjection) yield host.gameProjection.registerRead({ id: 'afterlife.atmosphere', title: 'Volumetric bar atmosphere',
        description: 'Live local fog owners and renderer-accepted scattering resources.', read: () => {
          const fog = host.renderer?.inspect().volumetricFog;
          return {
          zones: selected.map(({zone, source}) => ({ name: zone.name, extinction: zone.extinction, source: source.name })),
          camera: cameras.map(entity => { const c = world.get(entity, Camera).unwrap();
            return { exposureMode: c.exposureMode, exposure: c.exposure, tonemap: c.tonemap, bloom: c.bloom, bloomIntensity: c.bloomIntensity,
              bloomThreshold: c.bloomThreshold, bloomSmoothWidth: c.bloomSmoothWidth, bloomRadius: c.bloomRadius }; }),
          authoredOwners: owned.length, localLightCount: lights.length, spotLights: Array.from(world.query({ read: [SpotLight] }).unwrap()).length,
          renderer: fog ? { status: fog.status, resourceStage: fog.resourceStage, ownerCount: fog.ownerCount,
            passCount: fog.passCount, sampleCount: fog.sampleCount, memoryBytes: fog.memoryBytes,
            candidateFailure: fog.candidateFailure ?? null } : null,
        }; } });
    }, 'afterlife/atmosphere');
  },
};
export default atmosphere;
