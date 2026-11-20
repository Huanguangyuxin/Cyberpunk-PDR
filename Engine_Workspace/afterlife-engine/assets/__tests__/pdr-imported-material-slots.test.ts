import {describe,expect,it} from 'vitest';
import type {MeshAsset} from '@forgeax/engine/types';
import {completeRetiredSlots} from '../pdr-imported-material-slots';

function mesh(materialSlots:{slotName:string;defaultMaterial?:number}[],indices:number[]){
  return {materialSlots,submeshes:indices.map(materialSlot=>({materialSlot,indexOffset:0,indexCount:3,vertexCount:3,topology:'triangle-list'}))} as Pick<MeshAsset,'materialSlots'|'submeshes'>;
}
describe('native normal coverage after imported material renames',()=>{
  it('gives the retired slot a live material while retaining the counter finish and its index',()=>{
    const counter=mesh([{slotName:'Rear pewter'},{slotName:'Rear counter-silver',defaultMaterial:491}],[1]);
    const slots=completeRetiredSlots(counter)!;
    expect(slots[0].defaultMaterial).toBe(491);
    expect(slots[1]).toBe(counter.materialSlots[1]);
    expect(counter.materialSlots[0].defaultMaterial).toBeUndefined();
  });
  it('only repairs default-less slots with no triangles',()=>{
    const original=mesh([{slotName:'Glaze',defaultMaterial:532},{slotName:'Apron',defaultMaterial:1263}],[0,1]);
    expect(completeRetiredSlots(original)).toBeUndefined();
    const intentional=mesh([{slotName:'Inherited'},{slotName:'Silver',defaultMaterial:491}],[0,1]);
    expect(completeRetiredSlots(intentional)).toBeUndefined();
  });
});
