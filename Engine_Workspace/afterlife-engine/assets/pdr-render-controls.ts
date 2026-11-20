import type { Component, EntityHandle, World } from '@forgeax/engine/ecs';
import {
  AmbientOcclusion, AMBIENT_OCCLUSION_GTAO,
  Camera, DirectionalLight, PointLight, RectAreaLight, ReflectionProbe, ScreenSpaceReflection,
  Skylight, SpotLight,
} from '@forgeax/engine/render';
import { Name } from '@forgeax/engine/scene';
import { GTAO } from './pdr-post-profile-wb017';
import {CAMERA_CONTROLS, TONEMAPS, RENDER_SWITCHES, type AntialiasMode, type CameraControl,
  type LightGroup, type Tonemap, type RenderControlStatus, type RenderSwitch} from './pdr-render-controls-protocol';
import {aaModes, type installCameraControls} from './pdr-camera-controls';
import {isMergedLight} from './pdr-local-light-budget';
import {practicalLightLabel,type TableLightControl} from './pdr-practical-lights';
import {mirrorBallLightLabel} from './pdr-mirror-balls';

const intensityComponents = [PointLight, RectAreaLight, SpotLight, DirectionalLight, ReflectionProbe, Skylight] as const;
const zoneNumbers: [LightGroup, readonly number[]][] = [
  ['bar', [1, 2, 3, 4, 5]],
  ['booths', [6, 7, 8, 9]],
  ['foyer', [10, 11, 12, 13, 14]],
  ['vip', [15, 28, 31, 32]],
  ['gallery', [16, 17, 18, 29, 30]],
  ['dance', [19, 20, 21]],
  ['stage', [22, 23, 24, 25, 26, 27]],
];
const groupByNumber = new Map(zoneNumbers.flatMap(([zone, numbers]) => numbers.map(n => [n, zone] as const)));
const environmentNames: Record<string, string> = {
  'DIAGNOSTIC/geometry-inspection-not-art-lighting': '环境底光',
  'PDR/new-layout-front-hall-reflection-probe': '前厅反射探针',
  'PDR/bar-drinks-local-reflection-D059': '吧台反射探针',
  'PDR/wet-floor-deep-hall-reflection-fallback': '舞池反射探针',
};

interface Owners {
  tableLights:TableLightControl[];
  installedFinishesEnabled(): boolean;
  setInstalledFinishes(enabled: boolean): void;
  fogEnabled(): boolean;
  setFog(enabled: boolean): void;
  fogMotion(): boolean;
  setFogMotion(enabled: boolean):void;
  setSSR(enabled: boolean): unknown;
  setPracticalEmission(enabled: boolean): void;
}

export function installRenderControls(world: World, cameras: EntityHandle[], owners: Owners, quality:ReturnType<typeof installCameraControls>) {
  const muted = new Set<EntityHandle>();
  const lights = intensityComponents.flatMap(component =>
    Array.from(world.query({read: [component]}).unwrap(), ({entity}) => {
      const name = world.get(entity, Name).unwrapOr({value: component.name}).value;
      const isSky = component === Skylight;
      const indirect = isSky || component === ReflectionProbe;
      const practical = practicalLightLabel(name);
      const mirrorBall = mirrorBallLightLabel(name);
      const group = mirrorBall?.group ?? practical?.group ?? (indirect ? 'environment' : groupByNumber.get(Number(/^L(\d\d)_/.exec(name)?.[1])) ?? 'other');
      const intensityField: Component<string, {readonly intensity: 'f32'}> = component;
      const rayTestLight = component === RectAreaLight || Boolean(practical);
      const intensity = () => muted.has(entity) ? 0 : world.get(entity, intensityField).unwrap().intensity;
      let savedIntensity = 0;
      let savedAmbient: number[] = [];
      let reattach: (()=>void) | undefined;
      function detach() {
        if (component === RectAreaLight) {
          const light = world.get(entity, RectAreaLight).unwrap();
          const data = {...light, color:Array.from(light.color)};
          world.removeComponent(entity,RectAreaLight).unwrap();
          return () => world.addComponent(entity,{component:RectAreaLight,data}).unwrap();
        }
        const light = world.get(entity, PointLight).unwrap();
        const data = {...light, color:Array.from(light.color)};
        world.removeComponent(entity,PointLight).unwrap();
        return () => world.addComponent(entity,{component:PointLight,data}).unwrap();
      }
      const setEnabled = (enabled: boolean) => {
        if (enabled === !muted.has(entity)) return;
        if (rayTestLight) {
          if (enabled && reattach) {
            quality.setEffect('diffuseGi',false);
            reattach();
            reattach=undefined;
            muted.delete(entity);
          } else if (!enabled) {
            reattach=detach();
            muted.add(entity);
          }
          return;
        }
        if (!enabled) {
          savedIntensity = intensity();
          if (isSky) savedAmbient = Array.from(world.get(entity, Skylight).unwrap().ambientIrradiance);
          muted.add(entity);
        } else {
          muted.delete(entity);
        }
        world.set(entity, intensityField, {intensity: enabled ? savedIntensity : 0}).unwrap();
        if (isSky) world.set(entity, Skylight, {ambientIrradiance: enabled ? savedAmbient : [0, 0, 0]}).unwrap();
      };
      return {
        id: component.name + '/' + entity, name: mirrorBall?.name ?? practical?.name ?? environmentNames[name] ?? name, group, rayTestLight,
        setEnabled, readEnabled: () => !muted.has(entity), intensity,
      };
    }),
  );
  for(let i=lights.length-1;i>=0;i--)if(isMergedLight(lights[i].name))lights.splice(i,1);
  lights.push(...owners.tableLights);
  let practicalsEnabled = true;
  lights.push({
    id: 'practicals', name: '建筑灯带、灯罩与舞台招牌', group: 'practicals', rayTestLight: false,
    intensity: () => practicalsEnabled ? 1 : 0, readEnabled: () => practicalsEnabled,
    setEnabled(enabled) {
      if (enabled === practicalsEnabled) return;
      owners.setPracticalEmission(enabled);
      practicalsEnabled = enabled;
    },
  });
  lights.sort((a, b) => a.name.localeCompare(b.name));
  const lightsById = new Map(lights.map(light => [light.id, light]));

  let shadows = true;
  let notice:string|undefined;
  const effects = {
    installedFinishes: owners.setInstalledFinishes,
    shadows: (enabled: boolean) => { shadows = enabled; },
    ssr: owners.setSSR,
    gtao: (enabled: boolean) => {
      for (const camera of cameras) {
        const current = world.hasComponent(camera, AmbientOcclusion);
        if (enabled && !current) world.addComponent(camera, {component: AmbientOcclusion, data: {...GTAO, algorithm: AMBIENT_OCCLUSION_GTAO}}).unwrap();
        if (!enabled && current) world.removeComponent(camera, AmbientOcclusion).unwrap();
      }
    },
    bloom: (enabled: boolean) => {
      for (const camera of cameras) world.set(camera, Camera, {bloom: enabled ? 1 : 0}).unwrap();
    },
    fog: owners.setFog,
    fogMotion: owners.setFogMotion,
  };
  const read = (): RenderControlStatus => {
    const camera = cameras[0];
    const lens = world.get(camera, Camera).unwrap();
    const settings = quality.read();
    return {
      ...settings,notice,
      giTestLightsOn: lights.some(light=>light.rayTestLight&&light.readEnabled()),
      lights: lights.map(({id, name, group, readEnabled, intensity}) => ({id, name, group, enabled: readEnabled(), intensity: intensity()})),
      effects: {
        ...settings.effects,
        shadows, ssr: world.hasComponent(camera, ScreenSpaceReflection), gtao: world.hasComponent(camera, AmbientOcclusion),
        bloom: Boolean(lens.bloom), fog: owners.fogEnabled(),fogMotion:owners.fogMotion(),
        installedFinishes: owners.installedFinishesEnabled(),
      },
    };
  };
  const defaults = read();
  const lightDefaults = new Map(defaults.lights.map(light => [light.id, light.enabled]));

  // Validate user-facing messages at the presentation boundary.
  const command = (message: {action?: unknown; id?: unknown; enabled?: unknown; mode?: unknown; value?:unknown}) => {
    const {action, id, enabled, mode, value} = message;
    notice=undefined;
    if (action === 'light' && typeof id === 'string' && typeof enabled === 'boolean') lightsById.get(id)?.setEnabled(enabled);
    if (action === 'group' && typeof enabled === 'boolean') {
      for (const light of lights) if (light.group === id) light.setEnabled(enabled);
    }
    if (action === 'all-lights' && typeof enabled === 'boolean') {
      for (const light of lights) light.setEnabled(enabled);
    }
    if (action === 'prepare-gi-test') {
      for (const light of lights) if (light.rayTestLight) light.setEnabled(false);
    }
    if (action === 'restore-lights') {
      for (const light of lights) light.setEnabled(lightDefaults.get(light.id)!);
    }
    quality.setSceneLightsOn(lights.some(light=>light.readEnabled()));
    try {
      if (action === 'antialias' && typeof mode === 'string' && Object.hasOwn(aaModes, mode)) quality.setAA(mode as AntialiasMode);
      if (action === 'tonemap' && typeof mode === 'string' && Object.hasOwn(TONEMAPS,mode)) quality.setTone(mode as Tonemap);
      if (action === 'fog-quality' && (mode==='low'||mode==='high')) quality.setFogQuality(mode);
      if (action === 'scale' && typeof value==='number') quality.setScale(value);
      if (action === 'camera' && typeof id==='string'&&Object.hasOwn(CAMERA_CONTROLS,id)&&typeof value==='number') quality.setCamera(id as CameraControl,value);
      if (action === 'effect' && typeof id === 'string' && typeof enabled === 'boolean') {
        if((id==='ssr'||id==='fog')&&enabled&&quality.read().antialias==='msaa')throw Error('请先切换抗锯齿模式');
        if(quality.ownsEffect(id))quality.setEffect(id,enabled);
        else if(Object.hasOwn(effects,id))effects[id as keyof typeof effects](enabled);
      }
      if (action === 'restore-render') {
        quality.reset();
        for (const id of Object.keys(effects) as (keyof typeof effects)[]) effects[id](defaults.effects[id]);
      }
    } catch(error) {
      const label=typeof id==='string'&&Object.hasOwn(RENDER_SWITCHES,id)?RENDER_SWITCHES[id as RenderSwitch]:'画质设置';
      notice=label+'无法应用 · '+(error instanceof Error?error.message:String(error));
    }
  };

  return { read, command, isMuted: (entity: EntityHandle) => muted.has(entity), shadowsEnabled: () => shadows };
}
