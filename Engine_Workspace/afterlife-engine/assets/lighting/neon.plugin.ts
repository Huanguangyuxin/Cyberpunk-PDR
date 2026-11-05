import type { GameHost } from '@forgeax/engine/app';
import { Time, Update } from '@forgeax/engine/ecs';
import type { Plugin } from '@forgeax/engine/plugin';
import { Name } from '@forgeax/engine/scene';
import { Materials, MeshRenderer, PointLight, SpotLight } from '@forgeax/engine/render';
import circuits from './neon-circuits.json';
import { neonFactor, neonLevel, NEON_LEVELS } from './neon';

const neon: Plugin = {
  name: 'afterlife/neon-circuits', inject: ['world', 'gameHost', 'assets'],
  apply(ctx) {
    const world = ctx.world;
    const host: GameHost | undefined = ctx.gameHost;
    if (!host) throw new Error('Afterlife requires GameHost');
    ctx.effect(function* () {
      const meshes = Array.from(world.query({ read: [Name, MeshRenderer] }).unwrap(), row => ({ entity: row.entity, name: world.get(row.entity, Name).unwrap().value, materials: Array.from(world.get(row.entity, MeshRenderer).unwrap().materials) }));
      const lights = [
        ...Array.from(world.query({ read: [Name, PointLight] }).unwrap(), row => ({ entity: row.entity, name: world.get(row.entity, Name).unwrap().value, intensity: world.get(row.entity, PointLight).unwrap().intensity, kind: 'point' as const })),
        ...Array.from(world.query({ read: [Name, SpotLight] }).unwrap(), row => ({ entity: row.entity, name: world.get(row.entity, Name).unwrap().value, intensity: world.get(row.entity, SpotLight).unwrap().intensity, kind: 'spot' as const })),
      ];
      const setIntensity = (row: typeof lights[number], intensity: number) => {
        if (row.kind === 'spot') { if (world.get(row.entity, SpotLight).ok) world.set(row.entity, SpotLight, { intensity }).unwrap(); }
        else if (world.get(row.entity, PointLight).ok) world.set(row.entity, PointLight, { intensity }).unwrap();
      };
      const bound = circuits.map((circuit, index) => {
        const color = circuit.color as [number, number, number];
        const handles = NEON_LEVELS.map(level => ctx.assets!.create(Materials.standard({
          baseColor: [.035, .045, .05, 1], roughness: .42, metallic: .15,
          emissive: color, emissiveIntensity: 3 * circuit.gain * level,
        })).unwrap());
        const surfaces = meshes.filter(row => row.name === `V4 / Neon_${circuit.zone}`).map(row => ({ entity: row.entity, materials: row.materials }));
        for (const row of surfaces) for (const handle of row.materials) if (handle) ctx.assets!.retain(handle).unwrap();
        const sources = lights.filter(row => row.name.startsWith(`NeonLight / ${circuit.zone} /`)).map(row => ({ ...row }));
        return { ...circuit, index, handles, surfaces, sources, lastLevel: -1, factor: 1 };
      });
      yield () => {
        for (const circuit of bound) {
          for (const row of circuit.surfaces) {
            if (world.get(row.entity, MeshRenderer).ok) world.set(row.entity, MeshRenderer, { materials: row.materials }).unwrap();
            for (const handle of row.materials) if (handle) ctx.assets!.release(handle).unwrap();
          }
          for (const row of circuit.sources) setIntensity(row, row.intensity);
          for (const handle of circuit.handles) ctx.assets!.release(handle).unwrap();
        }
      };
      world.addSystem(Update, { name: 'afterlife-neon-flicker', queries: [], fn: () => {
        const t = world.getResource(Time).elapsed;
        for (const circuit of bound) {
          circuit.factor = neonFactor(t, circuit.period, circuit.phase, circuit.index);
          const level = neonLevel(circuit.factor);
          if (level !== circuit.lastLevel) {
            for (const row of circuit.surfaces) world.set(row.entity, MeshRenderer, { materials: [circuit.handles[level]] }).unwrap();
            circuit.lastLevel = level;
          }
          for (const row of circuit.sources) setIntensity(row, row.intensity * circuit.factor);
        }
      } }).unwrap();
      yield () => world.removeSystem(Update, 'afterlife-neon-flicker').unwrap();
      if (host.gameProjection) yield host.gameProjection.registerRead({ id: 'afterlife.neon', title: 'Live neon circuits', description: 'Actual emissive material levels and local-light intensity changes in the Play world.', read: () => ({
        time: world.getResource(Time).elapsed,
        circuits: bound.map(c => ({ zone: c.zone, factor: c.factor, level: c.lastLevel, meshes: c.surfaces.length, lights: c.sources.length,
          actualIntensities: c.sources.map(s => s.kind === 'spot' ? world.get(s.entity, SpotLight).unwrap().intensity : world.get(s.entity, PointLight).unwrap().intensity) })),
      }) });
    }, 'afterlife/neon');
  },
};
export default neon;
