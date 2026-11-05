/** D037 temporary glass on R8 guard fill surfaces; physical solid panels remain a DCC deliverable. */
import type {World,EntityHandle} from '@forgeax/engine/ecs';
import type {AssetRegistry} from '@forgeax/engine/assets-runtime';
import type {MeshAsset} from '@forgeax/engine/types';
import {Name} from '@forgeax/engine/scene';
import {Materials,MeshFilter,MeshRenderer} from '@forgeax/engine/render';
const FILL_SLOTS:Record<string,number>={STAIR_E:4,STAIR_W:4,RAIL_GAL_E:2,RAIL_GAL_W:2,RAIL_DECK_SOUTH:2,RAIL_BRIDGE_NORTH:2};
export function installGlassGuardTrial(world:World,assets:AssetRegistry){
 const glass=assets.create(Materials.standard({baseColor:[1,1,1,1],metallic:0,roughness:.065,transmission:.96,ior:1.5,thickness:.01,
  attenuationColor:[.92,.97,1],attenuationDistance:4,renderState:{cullMode:'back'}})).unwrap();
 const saved:{entity:EntityHandle;name:string;materials:number[]}[]=[];
 let ready=false,pending=Object.keys(FILL_SLOTS);
 const tick=()=>{
  if(ready)return;
  const rows=Array.from(world.query({read:[Name,MeshFilter,MeshRenderer]}).unwrap(),r=>({entity:r.entity,name:r.get(Name).value,mesh:r.get(MeshFilter).assetHandle,materials:Array.from(r.get(MeshRenderer).materials)})).filter(r=>FILL_SLOTS[r.name]!==undefined);
  const subjects=rows.flatMap(r=>{const read=assets.read(r.mesh);if(!read.ok||read.value.kind!=='mesh')return [];const mesh=read.value as MeshAsset;const slot=FILL_SLOTS[r.name];
   const legacy=mesh.materialSlots[slot]?.slotName==='M_LATTICE_STEEL';
   // Zero is the public MeshRenderer sentinel: inherit the Mesh default by GUID/handle.
   return [{...r,slots:mesh.materialSlots.map((_,i)=>Number(r.materials[i]??0)),slot:legacy?slot:-1}];});
  pending=Object.keys(FILL_SLOTS).filter(n=>!subjects.some(r=>r.name===n));if(pending.length)return;
  for(const r of subjects){if(r.slot<0)continue;saved.push({entity:r.entity,name:r.name,materials:r.materials});r.slots[r.slot]=glass;world.set(r.entity,MeshRenderer,{materials:r.slots}).unwrap();}ready=true;
 };
 return {tick,read:()=>({status:'D048 WorkBuddy solid glass stays source-native; optical override only for a surviving legacy lattice slot',ready,pending,expected:6,adopted:saved.map(r=>({name:r.name,slot:FILL_SLOTS[r.name]})),glassHandle:glass,values:assets.read(glass).unwrap(),collision:'current imported solid geometry retained'}),dispose:()=>{for(const r of saved){if(world.hasComponent(r.entity,MeshRenderer))world.set(r.entity,MeshRenderer,{materials:r.materials}).unwrap();}assets.release(glass).unwrap();}};
}
