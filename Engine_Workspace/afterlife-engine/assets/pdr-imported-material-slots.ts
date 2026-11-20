import type {MeshAsset} from '@forgeax/engine/types';

// Stable imported slot indices survive material renames. The clustered normal
// prepass also inspects slot zero, even when no triangle references that slot.
export function completeRetiredSlots(mesh:Pick<MeshAsset,'materialSlots'|'submeshes'>) {
  const used=new Set(mesh.submeshes.filter(part=>part.indexCount>0||part.vertexCount>0).map(part=>part.materialSlot));
  const retired=mesh.materialSlots.some((slot,index)=>slot.defaultMaterial===undefined&&!used.has(index));
  if(!retired)return;
  const fallback=mesh.materialSlots.find((slot,index)=>used.has(index)&&slot.defaultMaterial!==undefined)?.defaultMaterial;
  if(fallback===undefined)return;
  return mesh.materialSlots.map((slot,index)=>slot.defaultMaterial===undefined&&!used.has(index)
    ? {...slot,defaultMaterial:fallback} : slot);
}
