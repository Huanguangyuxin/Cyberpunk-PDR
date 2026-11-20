import type {World,EntityHandle} from '@forgeax/engine/ecs';
import type {AssetRegistry} from '@forgeax/engine/assets-runtime';
import type {AssetHandle,MeshAsset} from '@forgeax/engine/types';
import {createBoxGeometry,packInterleavedVertexAttributes} from '@forgeax/engine/geometry';
import {MeshFilter,MeshRenderer,Visibility,VisibilityStateValue} from '@forgeax/engine/render';
import {Name,Transform} from '@forgeax/engine/scene';
import spec from './pdr-hall-fitout-spec.json';
import {installLegacyFixtureFit} from './pdr-legacy-fixture-fit';

const removal:Record<string,string[]>=spec.remove;
const fits:Record<string,(typeof spec.fits)[keyof typeof spec.fits]>=spec.fits;
type Mesh=AssetHandle<'mesh'>;
export function installHallFitoutClearance(world:World,assets:AssetRegistry,collisionSources:Map<number,Mesh>){
  const rows=Array.from(world.query({read:[Name,MeshFilter,MeshRenderer]}).unwrap(),q=>({
    name:q.get(Name).value,entity:q.entity,handle:q.get(MeshFilter).assetHandle,materials:Array.from(q.get(MeshRenderer).materials)}));
  const replacements:{e:EntityHandle,before:Mesh,after:Mesh}[]=[];
  const originals:{e:EntityHandle,state:number|undefined}[]=[];
  const pivots:EntityHandle[]=[];
  let block:Mesh|undefined,enabled=false;
  let previousFixtures:ReturnType<typeof installLegacyFixtureFit>|undefined;
  const audit:Record<string,{removed:number,adjusted:number}>={};
  const show=(e:EntityHandle,state:number|undefined)=>{
    if(state===undefined){
      if(world.hasComponent(e,Visibility))world.removeComponent(e,Visibility).unwrap();
    }else if(world.hasComponent(e,Visibility))world.set(e,Visibility,{state}).unwrap();
    else world.addComponent(e,{component:Visibility,data:{state}}).unwrap();
  };
  function setEnabled(on:boolean){
    if(on===enabled)return;
    previousFixtures?.setEnabled(on);
    for(const r of replacements)world.set(r.e,MeshFilter,{assetHandle:on?r.after:r.before}).unwrap();
    for(const r of originals)show(r.e,on?VisibilityStateValue.hidden:r.state);
    for(const e of pivots)show(e,on?VisibilityStateValue.inherited:VisibilityStateValue.hidden);
    enabled=on;
  }
  function dispose(){
    setEnabled(false);
    previousFixtures?.dispose();
    for(const r of replacements){assets.release(r.after);collisionSources.delete(r.e);}
    for(const e of pivots)world.despawn(e);
    if(block!==undefined)assets.release(block);
  }
  try{
    for(const r of rows){
      if(spec.hidden.includes(r.name)){
        const orig=world.get(r.entity,Visibility);
        originals.push({e:r.entity,state:orig.ok?orig.value.state:undefined});
        continue;
      }
      const drop=removal[r.name],fit=fits[r.name];
      if(!drop&&!fit)continue;
      const mesh=assets.read(r.handle).unwrap(), p=mesh.attributes.position;
      if(!(p instanceof Float32Array)||!mesh.indices)throw new Error('Invalid fitout geometry '+r.name);
      let result:MeshAsset=mesh;
      let removed=0,adjusted=0;
      if(drop){
        const zones=spec.zones.filter(z=>z.owner===r.name);
        const ids:number[]=[],sections:MeshAsset['submeshes'][number][]=[];
        for(const section of mesh.submeshes){
          const slot=mesh.materialSlots[section.materialSlot].slotName,start=ids.length;
          const zone=zones.find(z=>z.slot===slot);
          for(let k=section.indexOffset;k<section.indexOffset+section.indexCount;k+=3){
            const tri=[mesh.indices[k],mesh.indices[k+1],mesh.indices[k+2]];
            if(drop.includes(slot)||zone&&tri.every(i=>[0,1,2].every(a=>p[i*3+a]>=zone.bounds[a]&&p[i*3+a]<=zone.bounds[a+3]))){removed++;continue;}
            ids.push(...tri);
          }
          if(ids.length>start)sections.push({...section,indexOffset:start,indexCount:ids.length-start});
        }
        if(!removed||!ids.length)throw new Error('Missing retired surface on '+r.name);
        result={...mesh,indices:Uint32Array.from(ids),submeshes:sections};
      }else{
        const pos=new Float32Array(p);
        const normal=mesh.attributes.normal instanceof Float32Array?new Float32Array(mesh.attributes.normal):undefined;
        const tangent=mesh.attributes.tangent instanceof Float32Array?new Float32Array(mesh.attributes.tangent):undefined;
        const scale=(fit.next[1]-fit.next[0])/(fit.old[1]-fit.old[0]);
        const bounds=[Infinity,Infinity,Infinity,-Infinity,-Infinity,-Infinity];
        for(let i=0;i<pos.length;i+=3){
          const k=i+fit.axis,sign=fit.mirror?Math.sign(pos[k]):1;
          pos[k]=sign*(fit.next[0]+(pos[k]*sign-fit.old[0])*scale);
          if(normal){
            normal[k]/=scale;
            const len=Math.hypot(normal[i],normal[i+1],normal[i+2]);
            if(len>0)for(let a=0;a<3;a++)normal[i+a]/=len;
          }
          if(tangent){
            const t=i/3*4;
            tangent[t+fit.axis]*=scale;
            const len=Math.hypot(tangent[t],tangent[t+1],tangent[t+2]);
            if(len>0)for(let a=0;a<3;a++)tangent[t+a]/=len;
          }
          for(let a=0;a<3;a++){bounds[a]=Math.min(bounds[a],pos[i+a]);bounds[a+3]=Math.max(bounds[a+3],pos[i+a]);}
        }
        const attributes={...mesh.attributes,position:pos,...(normal?{normal}:{}),...(tangent?{tangent}:{})};
        const vertices=packInterleavedVertexAttributes(attributes,pos.length/3).unwrap().vertices;
        result={...mesh,attributes,vertices,aabb:new Float32Array(bounds)};
        adjusted=pos.length/3;
      }
      const after=assets.create(result).unwrap();
      replacements.push({e:r.entity,before:r.handle,after});
      if(drop)collisionSources.set(r.entity,r.handle);
      audit[r.name]={removed,adjusted};
    }
    if(Object.keys(audit).length!==Object.keys(removal).length+Object.keys(fits).length
      ||originals.length!==spec.hidden.length)throw new Error('Incomplete hall fitout bindings');
    const mount=rows.find(r=>r.name==='PDR/MOVING_HEAD_0/mount');
    if(!mount)throw new Error('Missing fitted stage mount');
    const socket=assets.read(mount.handle).unwrap().materialSlots[0];
    const [w,h,d]=spec.pivot.dimensions;
    const geometry=createBoxGeometry(w,h,d).unwrap();
    block=assets.create({...geometry,materialSlots:geometry.materialSlots.map(s=>({...s,defaultMaterial:socket.defaultMaterial}))}).unwrap();
    for(const [i,x] of spec.pivot.x.entries())pivots.push(world.spawn(
      {component:Name,data:{value:'PDR/stage-yaw-pivot-'+i}},
      {component:Transform,data:{pos:[x,spec.pivot.y,spec.pivot.z]}},
      {component:MeshFilter,data:{assetHandle:block}},
      {component:MeshRenderer,data:{materials:geometry.materialSlots.map(()=>mount.materials[0]??0)}},
    ).unwrap());
    previousFixtures=installLegacyFixtureFit(world,assets);
    setEnabled(true);
    return {setEnabled,dispose,read:()=>({enabled,audit,originalCollisionOwners:collisionSources.size,stagePivots:pivots.length,retired:spec.hidden,fixtures:previousFixtures?.read()})};
  }catch(error){dispose();throw error;}
}
