import type {EntityHandle, World} from '@forgeax/engine/ecs';
import {quat, vec3} from '@forgeax/engine/math';
import {PointLight} from '@forgeax/engine/render';
import {Name, Transform} from '@forgeax/engine/scene';

const boothLabels = {
  F: '前厅卡座台灯',
  D: '主厅卡座台灯',
  U: '二楼卡座台灯',
};
const boothPattern = /^BOOTH_([FDU])([12EW][1-5])$/;
const lightPrefix = 'PDR/practical/';
const backbar = [
  {id:'BACKBAR_S', label:'吧台背柜南灯', pos:[13.2, 2.36, -7]},
  {id:'BACKBAR_N', label:'吧台背柜北灯', pos:[13.2, 2.36, -11.6]},
];

export function practicalLightLabel(name: string) {
  if (!name.startsWith(lightPrefix)) return;
  const fixture = name.slice(lightPrefix.length);
  const bar = backbar.find(({id}) => id === fixture);
  if (bar) return {name:bar.label, group:'bar'} as const;
  const match = boothPattern.exec(fixture);
  if (!match) return;
  const floor = match[1] as keyof typeof boothLabels;
  return {name:boothLabels[floor]+' '+floor+match[2], group:floor === 'U' ? 'gallery' : 'booths'} as const;
}

export function installPracticalLights(world: World) {
  const booths = Array.from(world.query({read:[Name, Transform]}).unwrap(), row => {
    const name = row.get(Name).value;
    const transform = row.get(Transform);
    return {name, pos:Array.from(transform.pos), quat:Array.from(transform.quat), scale:Array.from(transform.scale)};
  }).filter(({name}) => boothPattern.test(name));
  if (booths.length !== 24 || new Set(booths.map(({name}) => name)).size !== 24) {
    throw new Error('Expected one authored lamp anchor for each of the 24 D122 booths');
  }

  const lights: EntityHandle[] = [];
  const spawn = (id: string, pos: number[], intensity: number, range: number) => {
    lights.push(world.spawn(
      {component:Name, data:{value:lightPrefix+id}},
      {component:Transform, data:{pos}},
      {component:PointLight, data:{intensity, range, decay:2, color:[1, .58, .38]}},
    ).unwrap());
  };
  const dispose = () => { for (const entity of lights) world.despawn(entity).unwrap(); };
  try {
    // D122 opal shade centre in booth-local metres, with the emitter 16 mm above its top face.
    for (const booth of booths) {
      const [x,y,z] = booth.scale;
      const offset = quat.transformVec3(vec3.create(), booth.quat, [1.36*x, .724*y, -1.30*z]);
      spawn(booth.name, Array.from(vec3.add(offset, booth.pos, offset)),
        booth.name.startsWith('BOOTH_F') ? 3 : 2.5, 1.6);
    }
    // The D122 source has two backbar lamp mounts. D108 reassigned their runtime rows to roof strips.
    for (const {id,pos} of backbar) spawn(id,pos,8,3);
  } catch (error) {
    dispose();
    throw error;
  }
  return {dispose};
}
