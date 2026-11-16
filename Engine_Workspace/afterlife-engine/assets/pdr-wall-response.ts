import type {AssetRegistry} from '@forgeax/engine/assets-runtime';
import type {World,EntityHandle} from '@forgeax/engine/ecs';
import type {AssetHandle} from '@forgeax/engine/types';
import {MeshFilter,MeshRenderer} from '@forgeax/engine/render';
import {Name} from '@forgeax/engine/scene';

/** D112: bounded diagnostic only. Production uses the real Blender wall PBR.
 * Specular OFF leaves the same normal/albedo, real lights and Standard diffuse.
 * It is never the delivered default, and does not swap to an unlit material.
 */
export async function installWallResponse(world:World,assets:AssetRegistry){
  const saved:{entity:EntityHandle;materials:number[];diffuse:number[]}[]=[],copies:AssetHandle<'material'>[]=[],retained:AssetHandle<'material'>[]=[];
  const cache=new Map<number,AssetHandle<'material'>>(),facts:Record<string,unknown>[]=[];
  for(const row of world.query({read:[Name,MeshFilter,MeshRenderer]}).unwrap()){
    const name=row.get(Name).value;if(['ARCH_FLOOR_SLAB','ARCH_DANCE_FLOOR','ARCH_FLOOR_PATCHES'].includes(name))continue;
    const mesh=assets.read(row.get(MeshFilter).assetHandle);if(!mesh.ok||mesh.value.kind!=='mesh')continue;
    const before=Array.from(row.get(MeshRenderer).materials),diffuse=before.slice();let changed=false;
    for(const [i,slot]of mesh.value.materialSlots.entries()){
      if(!['M_WALL_NAVY','WB015_M_WALL_NAVY'].includes(slot.slotName))continue;
      const ref=before[i]||slot.defaultMaterial;if(!ref)throw new Error('D112 wall material missing');
      const handle=typeof ref==='number'?ref as AssetHandle<'material'>:(await assets.load(typeof ref==='string'?assets.parseGuid(ref):ref,'material')).unwrap();
      if(typeof ref!=='number')retained.push(handle);
      let clone=cache.get(handle);
      if(clone===undefined){
        const source=assets.read(handle).unwrap();
        facts.push({slot:slot.slotName,handle,metallic:source.values?.metallic,specular:source.values?.specular,roughnessFactor:source.values?.roughness,emissive:source.values?.emissive,emissiveIntensity:source.values?.emissiveIntensity});
        clone=assets.copy(handle).unwrap();assets.update(clone,{values:{...source.values,specular:0}}).unwrap();
        cache.set(handle,clone);copies.push(clone);
      }
      diffuse[i]=clone;changed=true;
    }
    if(changed)saved.push({entity:row.entity,materials:before,diffuse});
  }
  if(!saved.length)throw new Error('D112 expected actual wall surfaces');
  let diagnostic=false;
  const setDiffuseOnly=(on:boolean)=>{diagnostic=on;for(const row of saved)world.set(row.entity,MeshRenderer,{materials:on?row.diffuse:row.materials}).unwrap();};
  return {setDiffuseOnly,read:()=>({diagnosticDiffuseOnly:diagnostic,wallAssemblies:saved.length,sourceMaterials:facts,model:'opaque nonmetal Standard PBR; direct/ambient diffuse retained; no emission added'}),dispose:()=>{setDiffuseOnly(false);for(const h of copies)assets.release(h).unwrap();for(const h of retained)assets.release(h).unwrap();}};
}
