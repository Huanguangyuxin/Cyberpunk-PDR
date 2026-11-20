import type {World} from '@forgeax/engine/ecs';
import type {AssetRegistry} from '@forgeax/engine/assets-runtime';
import type {AssetHandle} from '@forgeax/engine/types';
import {MeshFilter,MeshRenderer} from '@forgeax/engine/render';
import {Name} from '@forgeax/engine/scene';

const boothLabels = {
  F: '前厅卡座台灯',
  D: '主厅卡座台灯',
  U: '二楼卡座台灯',
};
const boothPattern = /^BOOTH_([FDU])([12EW][1-5])$/;
const lightPrefix = 'PDR/practical/';
export function practicalLightLabel(name: string) {
  if (!name.startsWith(lightPrefix)) return;
  const fixture = name.slice(lightPrefix.length);
  const match = boothPattern.exec(fixture);
  if (!match) return;
  const floor = match[1] as keyof typeof boothLabels;
  return {name:boothLabels[floor]+' '+floor+match[2], group:floor === 'U' ? 'gallery' : 'booths'} as const;
}

export interface TableLightControl {
  id:string; name:string; group:'gallery'|'booths'; rayTestLight:boolean;
  setEnabled(next:boolean):void; readEnabled():boolean; intensity():number;
}
export function installPracticalLights(world:World, assets:AssetRegistry) {
  const darkVariants=new Map<AssetHandle<'material'>,AssetHandle<'material'>>();
  const controls:TableLightControl[]=[];
  const records:{fixture:string;mesh:number;slot:number;table:number;lens:number;texture:unknown}[]=[];
  const booths=Array.from(world.query({read:[Name,MeshFilter,MeshRenderer]}).unwrap(),r=>({
    name:r.get(Name).value,entity:r.entity,mesh:r.get(MeshFilter).assetHandle,materials:Array.from(r.get(MeshRenderer).materials),
  })).filter(row=>boothPattern.test(row.name));
  if(booths.length!==21)throw Error('Missing authored table receiver');
  const dark=(handle:AssetHandle<'material'>)=>{
    let copy=darkVariants.get(handle);
    if(copy!==undefined)return copy;
    copy=assets.copy(handle).unwrap();
    const data=assets.read(copy).unwrap();
    assets.update(copy,{values:{...data.values,emissive:[0,0,0],emissiveIntensity:0}}).unwrap();
    darkVariants.set(handle,copy);
    return copy;
  };
  for(const booth of booths){
    const slots=assets.read(booth.mesh).unwrap().materialSlots;
    const pair=['M07 Satin aggregate table','Warm lamp lens'].map(name=>{
      const slot=slots.findIndex(s=>s.slotName===name);
      if(slot<0)throw Error('Missing table light material '+name+' on '+booth.name);
      const on=booth.materials[slot] as AssetHandle<'material'>;
      return {slot,on,off:dark(on)};
    });
    let enabled=true;
    const setEnabled=(next:boolean)=>{
      if(next===enabled)return;
      const materials=Array.from(world.get(booth.entity,MeshRenderer).unwrap().materials);
      for(const binding of pair)materials[binding.slot]=next?binding.on:binding.off;
      world.set(booth.entity,MeshRenderer,{materials}).unwrap();
      enabled=next;
    };
    const control={...practicalLightLabel(lightPrefix+booth.name)!,id:lightPrefix+booth.name,rayTestLight:false,
      readEnabled:()=>enabled,intensity:()=>enabled?(booth.name.startsWith('BOOTH_U')?6:4):0,setEnabled};
    controls.push(control);
    const table=assets.read(pair[0].on).unwrap();
    records.push({fixture:booth.name,mesh:booth.mesh,slot:pair[0].slot,table:pair[0].on,lens:pair[1].on,texture:table.values?.emissiveTexture});
  }
  return {controls,read:()=>records.map((row,i)=>({...row,enabled:controls[i].readEnabled()})),dispose:()=>{
    for(const control of controls)control.setEnabled(true);
    for(const handle of darkVariants.values())assets.release(handle).unwrap();
  }};
}

