/** D039 R8-specific repair. Other materials and the DCC author's active file stay untouched. */
import type {World,EntityHandle} from '@forgeax/engine/ecs';
import type {AssetRegistry} from '@forgeax/engine/assets-runtime';
import type {MeshAsset,AssetHandle} from '@forgeax/engine/types';
import {Name} from '@forgeax/engine/scene';
import {Materials,MeshFilter,MeshRenderer} from '@forgeax/engine/render';
import {createBoothGrid} from './pdr-booth-grid';
// D048: keep the existing ground repair; upstairs furniture/materials now come from WorkBuddy.
const booth=(name:string)=>/^BOOTH_(?:DE|DW|F)\d+$/.test(name);
export function installOtherScreens(world:World,assets:AssetRegistry){
 const clear=assets.create(Materials.standard({baseColor:[1,1,1,1],metallic:0,roughness:.04,transmission:1,ior:1.5,thickness:.01,attenuationColor:[.96,.98,1],attenuationDistance:4,renderState:{cullMode:'back'}})).unwrap();
 const steel=assets.create(Materials.standard({baseColor:[.06,.065,.075,1],metallic:.7,roughness:.48,renderState:{cullMode:'back'}})).unwrap();
 const saved:{entity:EntityHandle;name:string;mesh:AssetHandle<'mesh'>;materials:number[]}[]=[];
 let grid:AssetHandle<'mesh'>|undefined,stats:ReturnType<typeof createBoothGrid>['stats']|undefined,ready=false;
 const tick=()=>{
  if(ready)return;
  const rows=Array.from(world.query({read:[Name,MeshFilter,MeshRenderer]}).unwrap(),r=>({entity:r.entity,name:r.get(Name).value,mesh:r.get(MeshFilter).assetHandle,materials:Array.from(r.get(MeshRenderer).materials)})).filter(r=>booth(r.name)||r.name==='FURN_AISLE_SCREENS');
  if(rows.length!==17)return;
  const subjects=rows.flatMap(r=>{const read=assets.read(r.mesh);if(!read.ok||read.value.kind!=='mesh')return [];const mesh=read.value as MeshAsset,slot=booth(r.name)?10:2;
   if(mesh.materialSlots[slot]?.slotName!=='M_PERF_STEEL')throw new Error('D039 R8 screen recipe must be removed/reviewed for revised DCC assets');
   return [{...r,source:mesh,slot}];});
  if(subjects.length!==17)return;
  const booths=subjects.filter(r=>booth(r.name));
  if(booths.length!==16||new Set(booths.map(r=>r.mesh)).size!==1)throw new Error('D048 expects16 preserved shared ground booths');
  const built=createBoothGrid(booths[0].source);grid=assets.create(built.mesh).unwrap();stats=built.stats;
  for(const r of subjects){saved.push({entity:r.entity,name:r.name,mesh:r.mesh,materials:r.materials});const slots=r.source.materialSlots.map((_,i)=>Number(r.materials[i]??0));
   slots[r.slot]=booth(r.name)?steel:clear;
   if(booth(r.name))world.set(r.entity,MeshFilter,{assetHandle:grid}).unwrap();
   world.set(r.entity,MeshRenderer,{materials:slots}).unwrap();
  }ready=true;
 };
 return {tick,read:()=>({ready,expectedAssemblies:17,adopted:saved.map(r=>r.name),glassLowScreenSections:3,realGridBoothInstances:16,grid,stats,
  scope:'R8 runtime geometry repair by Codex; other booth triangles, source GLB, furniture transforms and envelopes preserved; original collision geometry retained; not final015 DCC delivery'}),
 dispose:()=>{for(const r of saved){if(world.hasComponent(r.entity,MeshFilter))world.set(r.entity,MeshFilter,{assetHandle:r.mesh}).unwrap();if(world.hasComponent(r.entity,MeshRenderer))world.set(r.entity,MeshRenderer,{materials:r.materials}).unwrap();}if(grid!==undefined)assets.release(grid).unwrap();assets.release(clear).unwrap();assets.release(steel).unwrap();}};
}
