/** Read-only native material evidence. No renderer, shader or optical fallback. */
import type {World} from '@forgeax/engine/ecs';
import type {AssetRegistry} from '@forgeax/engine/assets-runtime';
import type {MeshAsset,MaterialAsset} from '@forgeax/engine/types';
import {Name} from '@forgeax/engine/scene';
import {MeshFilter,MeshRenderer,materialSampledTextureBudget} from '@forgeax/engine/render';

export function readDrinkOptics(world:World,assets:AssetRegistry) {
  const meshes=new Map<number,MeshAsset>();
  const materials=new Map<number,unknown>();
  const objects=Array.from(world.query({read:[Name,MeshFilter,MeshRenderer]}).unwrap(),row=>({
    name:row.get(Name).value,mesh:row.get(MeshFilter).assetHandle,
    overrides:Array.from(row.get(MeshRenderer).materials),
  })).filter(row=>/BOTTLE|LIQUID|DRINK|MENISCUS|BTL/i.test(row.name));
  const bindings=objects.map(row=>{
    if(!meshes.has(row.mesh)) {
      const read=assets.read(row.mesh);
      if(read.ok&&read.value.kind==='mesh')meshes.set(row.mesh,read.value as MeshAsset);
    }
    const mesh=meshes.get(row.mesh);
    const slots=mesh?.materialSlots.map((slot,index)=>{
      const handle=row.overrides[index]||slot.defaultMaterial;
      if(typeof handle!=='number'||!handle)return {slot:index,slotName:slot.slotName,unresolvedDefault:handle??null};
      if(!materials.has(handle)) {
        const read=assets.read(handle);
        const m=read.ok&&read.value.kind==='material'?read.value as MaterialAsset:null;
        materials.set(handle,{handle,readable:!!m,values:m?.values??null,
          portableBudget16:materialSampledTextureBudget(world,assets,handle,16)??null});
      }
      return {slot:index,slotName:slot.slotName,material:handle};
    })??[];
    return {name:row.name,mesh:row.mesh,meshReadable:!!mesh,slots};
  });
  return {method:'Actual native mesh slot bindings and adopted MaterialAsset values; conservative portable budget16, not a GPU pixel proof',
    objectCount:objects.length,uniqueMeshCount:meshes.size,bindings,materials:[...materials.values()]};
}
