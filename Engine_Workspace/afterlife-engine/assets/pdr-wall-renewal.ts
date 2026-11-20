import type {World,EntityHandle} from '@forgeax/engine/ecs';
import type {AssetRegistry} from '@forgeax/engine/assets-runtime';
import type {AssetHandle} from '@forgeax/engine/types';
import {MeshFilter,MeshRenderer} from '@forgeax/engine/render';
import {Name} from '@forgeax/engine/scene';
import {packInterleavedVertexAttributes} from '@forgeax/engine/geometry';
import specification from './pdr-wall-specification.json';

type Finish = keyof typeof specification.materials;
type MeshHandle = AssetHandle<'mesh'>;
const owners:Record<string,Partial<Record<string,Finish>>> = specification.owners as typeof owners;

export async function installWallRenewal(world:World,assets:AssetRegistry,cassetteGuid:string){
  const materials=new Map<Finish,AssetHandle<'material'>>();
  const swaps:{entity:EntityHandle,before:MeshHandle,after:MeshHandle,
    original:number[],installed:number[]}[]=[];
  const coverage:{owner:string,slot:string,material:string,triangles:number}[]=[];
  const rows=Array.from(world.query({read:[Name,MeshFilter,MeshRenderer]}).unwrap(),row=>({
    name:row.get(Name).value,entity:row.entity,mesh:row.get(MeshFilter).assetHandle,
    original:Array.from(row.get(MeshRenderer).materials),
  })).filter(row=>owners[row.name]);
  let enabled=false;
  function setEnabled(on:boolean){
    if(on===enabled)return;
    for(const row of swaps){
      world.set(row.entity,MeshFilter,{assetHandle:on?row.after:row.before}).unwrap();
      world.set(row.entity,MeshRenderer,{materials:on?row.installed:row.original}).unwrap();
    }
    enabled=on;
  }
  function dispose(){
    setEnabled(false);
    for(const row of swaps)assets.release(row.after);
    for(const mat of materials.values())assets.release(mat);
  }
  try{
    for(const key of Object.keys(specification.materials) as Finish[]){
      const guid=key==='cassette'?cassetteGuid:specification.materials[key].guid;
      materials.set(key,(await assets.load(assets.parseGuid(guid),'material')).unwrap());
    }
    for(const row of rows){
      const mesh=assets.read(row.mesh).unwrap();
      const p=mesh.attributes.position,n=mesh.attributes.normal,oldUv=mesh.attributes.uv;
      if(!(p instanceof Float32Array&&n instanceof Float32Array&&oldUv instanceof Float32Array&&mesh.indices))
        throw new Error('Missing architectural mesh coordinates on '+row.name);
      const uv=new Float32Array(oldUv);
      const sourceT=mesh.attributes.tangent;
      const tan=sourceT instanceof Float32Array?new Float32Array(sourceT):undefined;
      const installed=mesh.materialSlots.map((_,i)=>row.original[i]??0);
      const seen=new Set<number>();
      for(const section of mesh.submeshes){
        const slot=mesh.materialSlots[section.materialSlot].slotName;
        const finish=owners[row.name][slot];
        if(!finish||!section.indexCount)continue;
        const {name,metres:[width,height]}=specification.materials[finish];
        installed[section.materialSlot]=materials.get(finish)!;
        coverage.push({owner:row.name,slot,material:name,triangles:section.indexCount/3});
        for(let j=section.indexOffset;j<section.indexOffset+section.indexCount;j++){
          const i=mesh.indices[j];
          if(seen.has(i))continue;
          seen.add(i);
          const nx=n[i*3],ny=n[i*3+1],nz=n[i*3+2];
          const ax=Math.abs(nx),ay=Math.abs(ny),az=Math.abs(nz);
          const top=ay>ax&&ay>az;
          const side=!top&&ax>az;
          const direction=top?1:side?Math.sign(nx):-Math.sign(nz);
          uv[i*2]=(side?p[3*i+2]:p[3*i])*direction/width;
          uv[i*2+1]=(top?p[3*i+2]:-p[3*i+1])/height;
          if(!tan)continue;
          // The U derivative projected onto the original normal plane.
          const dot=direction*(side?nz:nx);
          const tx=(side?0:direction)-dot*nx,ty=-dot*ny,tz=(side?direction:0)-dot*nz;
          const len=Math.hypot(tx,ty,tz);
          tan.set([tx/len,ty/len,tz/len,top?-Math.sign(ny):1],i*4);
        }
      }
      if(!seen.size)throw new Error('No matching architecture slots on '+row.name);
      const attributes={...mesh.attributes,uv,...(tan?{tangent:tan}:{})};
      const vertices=packInterleavedVertexAttributes(attributes,p.length/3).unwrap().vertices;
      const after=assets.create({...mesh,attributes,vertices}).unwrap();
      swaps.push({entity:row.entity,before:row.mesh,after,original:row.original,installed});
    }
    const matched=new Set(coverage.map(s=>s.owner));
    const missing=Object.keys(owners).filter(owner=>!matched.has(owner));
    if(missing.length)throw new Error('Unbound wall geometry '+missing.join(', '));
    setEnabled(true);
    return {setEnabled,dispose,read:()=>({enabled,owners:matched.size,coverage})};
  }catch(error){dispose();throw error;}
}
