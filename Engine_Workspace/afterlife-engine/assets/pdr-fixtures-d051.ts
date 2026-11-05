/** D051: shared Blender chair mesh; real suspended pan/tilt fixtures, no beam cone mesh. */
import {Time,type World,type EntityHandle} from '@forgeax/engine/ecs';
import {Name,Transform} from '@forgeax/engine/scene';
import {MeshFilter,MeshRenderer,SpotLight,Visibility,VisibilityStateValue} from '@forgeax/engine/render';
import type {AssetRegistry} from '@forgeax/engine/assets-runtime';
import type {AssetHandle,MeshAsset} from '@forgeax/engine/types';
import {quat} from '@forgeax/engine/math';
export async function loadFixtureMeshes(assets:AssetRegistry,guids:readonly string[]){
 const held:AssetHandle<'mesh'|'material'>[]=[],cache=new Map<string,AssetHandle<'material'>>();
 const rows=[];
 for(const guid of guids){
  const handle=(await assets.load(assets.parseGuid(guid),'mesh')).unwrap();held.push(handle);const mesh=assets.read(handle).unwrap() as MeshAsset,materials:AssetHandle<'material'>[]=[];
  for(const slot of mesh.materialSlots){const ref=slot.defaultMaterial;if(typeof ref==='number'){materials.push(ref as AssetHandle<'material'>);continue;}if(typeof ref!=='string')throw new Error('D051 fixture material missing');let material=cache.get(ref);if(!material){material=(await assets.load(assets.parseGuid(ref),'material')).unwrap();held.push(material);cache.set(ref,material);}materials.push(material);}
  rows.push({handle,mesh,materials});
 }
 return {rows,dispose:()=>{for(const h of held)assets.release(h).unwrap();}};
}
export async function installCafeChairRepair(world:World,assets:AssetRegistry,guid:string){
 const loaded=await loadFixtureMeshes(assets,[guid]),template=loaded.rows[0],saved:{entity:EntityHandle;pos:number[];quat:number[];mesh:AssetHandle<'mesh'>;materials:number[]}[]=[],changes:unknown[]=[];
 const rows=Array.from(world.query({read:[Name,Transform,MeshFilter,MeshRenderer]}).unwrap(),r=>({entity:r.entity,name:r.get(Name).value}));
 for(const row of rows){
  const match=/^(RTABLE_[EW][1-3])_CHAIR_([1-3])$/.exec(row.name);if(!match)continue;
  const table=rows.find(t=>t.name===match[1]);if(!table)throw new Error('D051 table missing '+match[1]);
  const p=world.get(row.entity,Transform).unwrap(),t=world.get(table.entity,Transform).unwrap().pos,dx=p.pos[0]-t[0],dz=p.pos[2]-t[2],length=Math.hypot(dx,dz);if(length<.1)throw new Error('D051 invalid chair/table pair');
  const radial=.76,pos=[t[0]+radial*dx/length,t[1],t[2]+radial*dz/length],yaw=Math.atan2(pos[0]-t[0],pos[2]-t[2]);
  saved.push({entity:row.entity,pos:Array.from(p.pos),quat:Array.from(p.quat),mesh:world.get(row.entity,MeshFilter).unwrap().assetHandle,materials:Array.from(world.get(row.entity,MeshRenderer).unwrap().materials)});
  world.set(row.entity,Transform,{pos,quat:Array.from(quat.fromEuler(quat.create(),0,yaw,0,'YXZ')),scale:[1,1,1]}).unwrap();
  world.set(row.entity,MeshFilter,{assetHandle:template.handle}).unwrap();world.set(row.entity,MeshRenderer,{materials:template.materials}).unwrap();
  changes.push({name:row.name,table:table.name,before:saved.at(-1)!.pos,position:pos,seatHeight:.46,front:'local -Z toward table centre',centreRadiusM:radial,tableEdgeToSeatFrontM:.76-.35-.2325});
 }
 if(saved.length!==18)throw new Error('D051 expected18 ground cafe chairs; got'+saved.length);
 world.insertResource('cyberpunk.chairs',{read:()=>({count:saved.length,source:'Codex Blender D051',beforePhysicsCooking:true,changes})});
 return {dispose:()=>{world.removeResource('cyberpunk.chairs');for(const s of saved){world.set(s.entity,Transform,{pos:s.pos,quat:s.quat}).unwrap();world.set(s.entity,MeshFilter,{assetHandle:s.mesh}).unwrap();world.set(s.entity,MeshRenderer,{materials:s.materials}).unwrap();}loaded.dispose();}};
}
export async function installMovingHeads(world:World,assets:AssetRegistry,guids:readonly string[]){
 const loaded=await loadFixtureMeshes(assets,guids),hidden:{entity:EntityHandle;state:number}[]=[];
 const oldHeads=Array.from(world.query({read:[Name]}).unwrap(),row=>({entity:row.entity,name:row.get(Name).value})).filter(row=>['STAGE_MOVING_HEAD_3','STAGE_MOVING_HEAD_4'].includes(row.name));
 for(const row of oldHeads){
  const before=world.get(row.entity,Visibility);hidden.push({entity:row.entity,state:before.ok?before.value.state:VisibilityStateValue.inherited});if(!before.ok)world.addComponent(row.entity,{component:Visibility,data:{state:VisibilityStateValue.hidden}}).unwrap();else world.set(row.entity,Visibility,{state:VisibilityStateValue.hidden}).unwrap();
 }
 const lights=Array.from(world.query({read:[Name,Transform,SpotLight]}).unwrap(),r=>({name:r.get(Name).value,entity:r.entity}));
 const fixtures=[-1,1].map((side,k)=>{
  const light=lights.find(l=>l.name===(k===0?'L24_STAGE_HEAD_3':'L25_STAGE_HEAD_4'));if(!light)throw new Error('D051 existing moving light missing');
  const before={pos:Array.from(world.get(light.entity,Transform).unwrap().pos),light:JSON.parse(JSON.stringify(world.get(light.entity,SpotLight).unwrap()))},pos=[side*2.2,4.82,-39.6];
  world.set(light.entity,Transform,{pos}).unwrap();world.set(light.entity,SpotLight,{intensity:950,range:18,innerConeDeg:5,outerConeDeg:11,color:k===0?[.35,.42,1]:[1,.16,.52]}).unwrap();
  const models=loaded.rows.map((row,j)=>world.spawn({component:Name,data:{value:'PDR/MOVING_HEAD_'+k+'/'+['mount','yoke','head'][j]}},{component:Transform,data:{pos}},{component:MeshFilter,data:{assetHandle:row.handle}},{component:MeshRenderer,data:{materials:row.materials}}).unwrap());
  return {light,before,pos,models,side,direction:[0,-1,0]};
 });
 let last=-1,lastFrozen:boolean|null=null,lastTest:string|undefined,updates=0;const tick=(freeze=false,test?:'left'|'right'|'sweep')=>{const still=freeze||test==='left'||test==='right',t=still?12.345:world.getResource(Time).elapsed;if(lastTest===test&&lastFrozen===still&&(still||t-last<1/24))return;last=t;lastFrozen=still;lastTest=test;
  for(let k=0;k<fixtures.length;k++){
   const f=fixtures[k],phase=t*(k===0?.37:.29)+k*2.1,target=test?[(k===0?-1:1)*2.5+(test==='left'?-.65:test==='right'?.65:.9*Math.sin(t*.6+k)),.45,-39.35]:freeze?[(k===0?-1:1)*2.5,.45,-39.35]:[3.8*Math.sin(phase),.45,-39.2+3.2*Math.sin(phase*.73+k)],d=target.map((v,a)=>v-f.pos[a]),len=Math.hypot(...d),direction=d.map(v=>v/len),yaw=Math.atan2(-d[0],-d[2]),pitch=Math.atan2(d[1],Math.hypot(d[0],d[2]));
   // Optical source is just outside the measured local -Z lens at0.197m.
   world.set(f.light.entity,Transform,{pos:f.pos.map((v,a)=>v+direction[a]*.215)}).unwrap();
   world.set(f.light.entity,SpotLight,{direction}).unwrap();world.set(f.models[1],Transform,{quat:Array.from(quat.fromEuler(quat.create(),0,yaw,0,'YXZ'))}).unwrap();world.set(f.models[2],Transform,{quat:Array.from(quat.fromEuler(quat.create(),pitch,yaw,0,'YXZ'))}).unwrap();f.direction=direction;
  }updates++;};tick();
 const read=()=>({updates,last,test:lastTest??null,count:2,source:'Blender D051 mount/yoke/head meshes; clamped to existing stage truss, native L24/L25 reused',lightBudgetAdded:0,classification:'Real SpotLight direction + physical head pan/tilt; existing3D volume scattering, no decorative cone mesh',fixtures:fixtures.map(f=>({light:f.light.name,position:f.pos,opticalPosition:f.pos.map((v,a)=>v+f.direction[a]*.215),direction:f.direction}))});world.insertResource('cyberpunk.movingHeads',{read});
 return {tick,read,dispose:()=>{world.removeResource('cyberpunk.movingHeads');for(const f of fixtures){for(const e of f.models)world.despawn(e).unwrap();world.set(f.light.entity,Transform,{pos:f.before.pos}).unwrap();world.set(f.light.entity,SpotLight,f.before.light).unwrap();}for(const h of hidden)world.set(h.entity,Visibility,{state:h.state}).unwrap();loaded.dispose();}};
}
