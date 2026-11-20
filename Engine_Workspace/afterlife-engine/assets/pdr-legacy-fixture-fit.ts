import type {EntityHandle,World} from '@forgeax/engine/ecs';
import type {AssetRegistry} from '@forgeax/engine/assets-runtime';
import type {AssetHandle} from '@forgeax/engine/types';
import {MeshFilter,MeshRenderer,Visibility,VisibilityStateValue} from '@forgeax/engine/render';
import {Name,Transform} from '@forgeax/engine/scene';
import {createBoxGeometry} from '@forgeax/engine/geometry';
import spec from './pdr-legacy-fixture-fit.json';

export function installLegacyFixtureFit(world:World,assets:AssetRegistry){
  const poses:Record<string,number[]>=spec.pose;
  const moves=Array.from(world.query({read:[Name,Transform]}).unwrap(),r=>({
    e:r.entity,n:r.get(Name).value,p:Array.from(r.get(Transform).pos),s:Array.from(r.get(Transform).scale),
  })).filter(r=>poses[r.n]);
  if(moves.length!==Object.keys(poses).length)throw new Error('Incomplete legacy fixture poses '+moves.map(r=>r.n));
  const rows=Array.from(world.query({read:[Name,MeshFilter,MeshRenderer]}).unwrap(),r=>({
    e:r.entity,n:r.get(Name).value,mesh:r.get(MeshFilter).assetHandle,mats:Array.from(r.get(MeshRenderer).materials),
  }));
  const mount=rows.find(r=>r.n==='PDR/MOVING_HEAD_0/mount');
  if(!mount)throw new Error('Missing moving head mount');
  const meshes:AssetHandle<'mesh'>[]=[],supports:EntityHandle[]=[];
  let enabled=false;
  const setEnabled=(on:boolean)=>{
    if(enabled===on)return;
    for(const r of moves){
      const [dy,sx,sy]=poses[r.n];
      world.set(r.e,Transform,{pos:on?[r.p[0],r.p[1]+dy,r.p[2]]:r.p,
        scale:on?[r.s[0]*sx,r.s[1]*sy,r.s[2]]:r.s}).unwrap();
    }
    for(const e of supports)world.set(e,Visibility,{state:on?VisibilityStateValue.inherited:VisibilityStateValue.hidden}).unwrap();
    enabled=on;
  };
  function dispose(){
    setEnabled(false);
    for(const e of supports)world.despawn(e);
    for(const m of meshes)assets.release(m);
  }
  try{
    const slot=assets.read(mount.mesh).unwrap().materialSlots[0],s=spec.suspension;
    for(const part of s.parts){
      const [w,h,d]=part.size,g=createBoxGeometry(w,h,d).unwrap();
      const asset=assets.create({...g,materialSlots:g.materialSlots.map(m=>({...m,defaultMaterial:slot.defaultMaterial}))}).unwrap();
      meshes.push(asset);
      for(const x of s.fixtureX){
        supports.push(world.spawn(
          {component:Name,data:{value:'PDR/legacy-stage-'+part.name+'/'+x}},
          {component:Transform,data:{pos:[x-Math.sign(x)*s.inset,part.y,s.z]}},
          {component:MeshFilter,data:{assetHandle:asset}},
          {component:MeshRenderer,data:{materials:g.materialSlots.map(()=>mount.mats[0]??0)}},
          {component:Visibility,data:{state:VisibilityStateValue.hidden}},
        ).unwrap());
      }
    }
    setEnabled(true);
    return {setEnabled,dispose,read:()=>({enabled,owners:moves.map(r=>r.n),clampParts:supports.length})};
  }catch(error){dispose();throw error;}
}
