import {expect,it} from 'vitest';
import type {World} from '@forgeax/engine/ecs';
import {PointLight,RectAreaLight,SpotLight} from '@forgeax/engine/render';
import {Name,Transform} from '@forgeax/engine/scene';
import {installFixedLighting,isMergedLight} from '../pdr-local-light-budget';

it('keeps a fixed 32-light roster and four shadow sources, with reversible local merges',()=>{
  const emitters=new Map<number,{kind:unknown; name:string; light:Record<string,unknown>;transform:{pos:number[]}}>();
  function add(name:string,kind:unknown) {
    emitters.set(emitters.size,{name,kind,light:{intensity:40,range:4},transform:{pos:[1,2,3]}});
  }
  for(let n=1;n<=32;n++)add('L'+String(n).padStart(2,'0')+'_fixture',[4,5,8,9,10,11].includes(n)?RectAreaLight:SpotLight);
  for(let i=1;i<=5;i++)add('mirror '+i,SpotLight);
  for(let i=1;i<=4;i++)add('PDR/bar local reflector/Niche cross wash '+i,SpotLight);
  const get=(i:number,c:unknown)=>{
    const row=emitters.get(i)!;
    return c===Transform?row.transform:c===Name?{value:row.name}:row.light;
  };
  const world={
    query:({read}:{read:unknown[]})=>({unwrap:()=>Array.from(emitters).filter(([,r])=>r.kind===read[1]).map(([i])=>({entity:i,get:(c:unknown)=>get(i,c)}))}),
    get:(i:number,c:unknown)=>({ok:true,value:get(i,c),unwrap:()=>get(i,c)}),
    set:(i:number,c:unknown,fields:object)=>{Object.assign(get(i,c),fields);return {unwrap:()=>true};},
  } as unknown as World;
  const setup=installFixedLighting(world), state=setup.read();
  expect(state.nativeCount).toBe(32);
  expect(state.activeCount).toBe(32);
  expect(state.shadowNumbers).toEqual([2,19,24,25]);
  expect(state.fixtures.filter(l=>isMergedLight(l.name))).toHaveLength(0);
  expect(emitters.get(10)?.light.intensity).toBe(40); // Stair fixture remains independently admitted.
  expect(emitters.get(12)?.light.intensity).toBe(1280);
  expect(emitters.get(11)?.light.intensity).toBe(0); // Historical handle remains readable for diagnostics.
  setup.restore();
  expect([...emitters.values()].every(l=>l.light.intensity===40&&l.transform.pos.join()==='1,2,3')).toBe(true);
});
