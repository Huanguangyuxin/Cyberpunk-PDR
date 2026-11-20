/** D051: shared Blender chair mesh; real suspended pan/tilt fixtures, no beam cone mesh. */
import {Time,type World,type EntityHandle} from '@forgeax/engine/ecs';
import {Name,Transform} from '@forgeax/engine/scene';
import {MeshFilter,MeshRenderer,SpotLight,Visibility,VisibilityStateValue} from '@forgeax/engine/render';
import type {AssetRegistry} from '@forgeax/engine/assets-runtime';
import type {AssetHandle,MeshAsset} from '@forgeax/engine/types';
import {quat} from '@forgeax/engine/math';

const stageCues = [
  {name:'ice-red', colors:[[.055,.32,1],[1,.075,.025]]},
  {name:'blue-amber', colors:[[.08,.18,1],[1,.42,.047]]},
  {name:'steel-coral', colors:[[.16,.50,1],[1,.15,.075]]},
] as const;
const cueSeconds = 5.4;
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
export async function installMovingHeads(world:World,assets:AssetRegistry,guids:readonly string[]){
 const loaded=await loadFixtureMeshes(assets,guids),hidden:{entity:EntityHandle;state:number}[]=[];
 const oldHeads=Array.from(world.query({read:[Name]}).unwrap(),row=>({entity:row.entity,name:row.get(Name).value})).filter(row=>['STAGE_MOVING_HEAD_3','STAGE_MOVING_HEAD_4'].includes(row.name));
 for(const row of oldHeads){
  const before=world.get(row.entity,Visibility);hidden.push({entity:row.entity,state:before.ok?before.value.state:VisibilityStateValue.inherited});if(!before.ok)world.addComponent(row.entity,{component:Visibility,data:{state:VisibilityStateValue.hidden}}).unwrap();else world.set(row.entity,Visibility,{state:VisibilityStateValue.hidden}).unwrap();
 }
 const lights=Array.from(world.query({read:[Name,Transform,SpotLight]}).unwrap(),r=>({name:r.get(Name).value,entity:r.entity}));
 const stageLights=lights.filter(({name})=>/^L2[2-7]_STAGE_HEAD_/.test(name)).map(light=>{
  const number=Number(light.name.slice(1,3));
  return {...light,lane:number%2,color:Array.from(world.get(light.entity,SpotLight).unwrap().color)};
 });
 if(stageLights.length!==6)throw new Error('Stage colour cues require the six existing spotlights');
 const fixtures=[-1,1].map((side,k)=>{
  const light=lights.find(l=>l.name===(k===0?'L24_STAGE_HEAD_3':'L25_STAGE_HEAD_4'));if(!light)throw new Error('D051 existing moving light missing');
  const before={pos:Array.from(world.get(light.entity,Transform).unwrap().pos),light:JSON.parse(JSON.stringify(world.get(light.entity,SpotLight).unwrap()))},pos=[side*2.2,4.82,-39.6];
  world.set(light.entity,Transform,{pos}).unwrap();world.set(light.entity,SpotLight,{intensity:3600,range:24,innerConeDeg:6.5,outerConeDeg:13.5,color:k===0?[.38,.52,1]:[1,.20,.62]}).unwrap();
  const models=loaded.rows.map((row,j)=>world.spawn({component:Name,data:{value:'PDR/MOVING_HEAD_'+k+'/'+['mount','yoke','head'][j]}},{component:Transform,data:{pos}},{component:MeshFilter,data:{assetHandle:row.handle}},{component:MeshRenderer,data:{materials:row.materials}}).unwrap());
  return {light,before,pos,models,side,direction:[0,-1,0]};
 });
 let last=-1,lastFrozen:boolean|null=null,lastTest:string|undefined,updates=0;
 const cueStartedAt=performance.now();
 let lastCueUpdate=-1;
 let cue: {name:string; blend:number} = {name:stageCues[0].name,blend:0};
 const tick=(freeze=false,test?:'left'|'right'|'sweep',isMuted:(entity:EntityHandle)=>boolean=()=>false)=>{
  const still=freeze||test==='left'||test==='right',t=still?12.345:world.getResource(Time).elapsed;
  const showTime=(performance.now()-cueStartedAt)*.001;
  const showTick=showTime-lastCueUpdate>=1/24;
  if(lastTest===test&&lastFrozen===still&&(still||(t-last<1/24&&!showTick)))return;
  lastCueUpdate=showTime;
  last=t;lastFrozen=still;lastTest=test;
  const phase=showTime/cueSeconds;
  const index=Math.floor(phase)%stageCues.length;
  const current=stageCues[index], next=stageCues[(index+1)%stageCues.length];
  const fade=Math.max(0,(phase%1-.64)/.36);
  const blend=fade*fade*(3-2*fade);
  cue={name:test||freeze?'fixed':current.name,blend:test||freeze?0:blend};
  for(const light of stageLights){
   if (/^L(?:23|26)_/.test(light.name)) continue; // Dedicated warm grazers on the nickel wings.
   const a=current.colors[light.lane], b=next.colors[light.lane];
   const color=test||freeze?light.color:a.map((value,i)=>value+(b[i]-value)*blend);
   world.set(light.entity,SpotLight,{color}).unwrap();
  }
  for(let k=0;k<fixtures.length;k++){
   const f=fixtures[k],phase=t*(k===0?.45:.36)+k*2.1,target=test?[(k===0?-1:1)*2.5+(test==='left'?-.65:test==='right'?.65:.9*Math.sin(t*.6+k)),.45,-39.35]:freeze?[(k===0?-1:1)*2.5,.45,-39.35]:[(k===0?-1:1)*(3.2+1.65*Math.sin(phase)),.35,-38.8+2.3*Math.sin(phase*.78+k)],d=target.map((v,a)=>v-f.pos[a]),len=Math.hypot(...d),direction=d.map(v=>v/len),yaw=Math.atan2(-d[0],-d[2]),pitch=Math.atan2(d[1],Math.hypot(d[0],d[2]));
   // Keep the moving shafts saturated through the stage mist.
   const pulse=test||freeze?3600:1900+500*Math.sin(t*7.2+k*1.9);
   // Optical source is just outside the measured local -Z lens at0.197m.
   world.set(f.light.entity,Transform,{pos:f.pos.map((v,a)=>v+direction[a]*.215)}).unwrap();
   world.set(f.light.entity,SpotLight,{direction,intensity:isMuted(f.light.entity)?0:pulse}).unwrap();world.set(f.models[1],Transform,{quat:Array.from(quat.fromEuler(quat.create(),0,yaw,0,'YXZ'))}).unwrap();world.set(f.models[2],Transform,{quat:Array.from(quat.fromEuler(quat.create(),pitch,yaw,0,'YXZ'))}).unwrap();f.direction=direction;
  }updates++;};tick();
 const readCues=()=>({...cue,lights:stageLights.map(({name,entity})=>{
  const light=world.get(entity,SpotLight).unwrap();
  return {name,color:Array.from(light.color),intensity:light.intensity};
 })});
 const read=()=>({updates,last,test:lastTest??null,count:2,source:'Blender D051 mount/yoke/head meshes; clamped to existing stage truss, native L24/L25 reused',lightBudgetAdded:0,classification:'Real SpotLight direction + physical head pan/tilt; existing3D volume scattering, no decorative cone mesh',fixtures:fixtures.map(f=>({light:f.light.name,position:f.pos,opticalPosition:f.pos.map((v,a)=>v+f.direction[a]*.215),direction:f.direction}))});world.insertResource('cyberpunk.movingHeads',{read});
 return {tick,read,readCues,dispose:()=>{world.removeResource('cyberpunk.movingHeads');for(const l of stageLights)world.set(l.entity,SpotLight,{color:l.color}).unwrap();for(const f of fixtures){for(const e of f.models)world.despawn(e).unwrap();world.set(f.light.entity,Transform,{pos:f.before.pos}).unwrap();world.set(f.light.entity,SpotLight,f.before.light).unwrap();}for(const h of hidden)world.set(h.entity,Visibility,{state:h.state}).unwrap();loaded.dispose();}};
}
