/** D049: runtime optical water-vapour puffs and continuous public-space mist.
 * Expanding age-driven density transport; no liquid/CFD claim.
 * The earlier Blender Mantaflow R06 experiment is retained separately in016 history.
 */
import {Time,type World} from '@forgeax/engine/ecs';
import type {AssetRegistry} from '@forgeax/engine/assets-runtime';
import {Name,Transform} from '@forgeax/engine/scene';
import {Materials,MeshFilter,MeshRenderer,SpotLight,VolumetricFog,VolumetricFogSamplingValue} from '@forgeax/engine/render';
import {createCylinderGeometry} from '@forgeax/engine/geometry';
import {Collider,ColliderShapeValue,RigidBody,RigidBodyTypeValue,type PhysicsWorld} from '@forgeax/engine/physics';
import {sprayDensity,SPRAY_SHAPE,SPRAY_MIN,SPRAY_MAX} from './pdr-spray-density';
import {installDanceFloorMist} from './pdr-dance-floor-mist';
const [W,H,D]=SPRAY_SHAPE;
export function installStageMist(world:World,assets:AssetRegistry){
 const dance=installDanceFloorMist(world,assets);
 const lights=Array.from(world.query({read:[Name,Transform,SpotLight]}).unwrap(),r=>({name:r.get(Name).value,entity:r.entity,pos:Array.from(r.get(Transform).pos),before:{...r.get(SpotLight),direction:Array.from(r.get(SpotLight).direction),color:Array.from(r.get(SpotLight).color)}}));
 const selected=['L24_STAGE_HEAD_3','L25_STAGE_HEAD_4'].map(n=>{const l=lights.find(l=>l.name===n);if(!l)throw new Error('D042 expected reusable stage spot '+n);return l;});
 const paint=assets.create(Materials.standard({baseColor:[.025,.032,.038,1],metallic:.7,roughness:.35})).unwrap();
 const steel=assets.create(Materials.standard({baseColor:[.42,.48,.52,1],metallic:1,roughness:.23})).unwrap();
 const meshes=[[.23,.23,.07],[.16,.16,.29],[.075,.075,.16],[.1,.1,.07],[.009,.009,.027]].map(a=>assets.create(createCylinderGeometry(a[0],a[1],a[2],48,1).unwrap()).unwrap());
 const pairs=selected.map((light,k)=>{
  const sx=k===0?-1:1,cx=sx*4.3,aim=[sx*3,6.2,-35],dir=aim.map((v,a)=>v-light.pos[a]),len=Math.hypot(...dir);
  world.set(light.entity,SpotLight,{direction:dir.map(v=>v/len),intensity:400,range:16,innerConeDeg:20,outerConeDeg:38,color:k===0?[.45,.5,1]:[1,.32,.65]}).unwrap();
  const texture=assets.create({kind:'texture',shape:{viewDimension:'3d',extent:{width:W,height:H,depth:D}},format:'r8unorm',data:sprayDensity(0,k===0?-1:1),colorSpace:'linear',mips:{kind:'none'}}).unwrap();
  // D049/D093: pure volumetric mist spray emerging from the two side nozzles (x = +-4.3m) with subtle violet-pink scatter that blends seamlessly into the ceiling-lit room mist.
  const plumeEmission=[.052,.028,.085];
  const fogData={light:light.entity,density:texture,boundsMin:Array.from(SPRAY_MIN),boundsMax:Array.from(SPRAY_MAX),extinction:[.045,.040,.052],albedo:[.92,.84,.98],emission:plumeEmission,anisotropy:.25,maxDistance:60,sampling:VolumetricFogSamplingValue.density};
  const fog=world.spawn({component:Name,data:{value:'PDR/SPRAY_'+(k===0?'W':'E')+'/expanding-water-vapour'}},{component:VolumetricFog,data:fogData}).unwrap();
  const models=meshes.slice(0,4).map((mesh,j)=>{
   const geometry=assets.read(mesh).unwrap();if(geometry.kind!=='mesh')throw new Error('Expected nozzle mesh');
   return world.spawn({component:Name,data:{value:'PDR/SPRAY_'+(k===0?'W':'E')+'/inspection-nozzle-'+j}},
    {component:Transform,data:{pos:[cx,[.035,.21,.48,.595][j],-38]}},
    {component:MeshFilter,data:{assetHandle:mesh}},{component:MeshRenderer,data:{materials:geometry.materialSlots.map(()=>j===2?steel:paint)}},
    {component:RigidBody,data:{type:RigidBodyTypeValue.static}},{component:Collider,data:{shape:ColliderShapeValue.trimesh,mesh}}).unwrap();
  });
  const tips=Array.from({length:8},(_,i)=>{
   const mesh=meshes[4],g=assets.read(mesh).unwrap();if(g.kind!=='mesh')throw new Error('Expected atomizer mesh');
   const a=i*Math.PI/4;
   return world.spawn({component:Name,data:{value:'PDR/SPRAY_'+k+'/upward-atomizer-'+i}},
    {component:Transform,data:{pos:[cx+.069*Math.cos(a),.644,-38-.069*Math.sin(a)]}},
    {component:MeshFilter,data:{assetHandle:mesh}},{component:MeshRenderer,data:{materials:g.materialSlots.map(()=>steel)}}).unwrap();
  });
  return {fog,fogData,texture,models,tips,light};
 });
 let enabled=true,animate=true,lightsOn=true,ticks=0,lastUpdate=-1,lastError:unknown=null;
 const setEnabled=(value:boolean)=>{dance.setEnabled(value);if(value===enabled)return;enabled=value;for(const p of pairs){if(value)world.addComponent(p.fog,{component:VolumetricFog,data:p.fogData}).unwrap();else world.removeComponent(p.fog,VolumetricFog).unwrap();}};
 const setLights=(value:boolean)=>{dance.setLights(value);lightsOn=value;for(const p of pairs){world.set(p.light.entity,SpotLight,{intensity:value?400:0}).unwrap();if(enabled)world.set(p.fog,VolumetricFog,{emission:value?[.052,.028,.085]:[0,0,0]}).unwrap();}};
 return {tick:()=>{dance.tick();if(!enabled||!animate||lastError)return;const t=world.getResource(Time).elapsed;if(t-lastUpdate<.1)return;lastUpdate=t;ticks++;
   for(let k=0;k<2;k++){const r=assets.update(pairs[k].texture,{data:sprayDensity(t,k===0?-1:1)});if(!r.ok){lastError={code:r.error.code,message:r.error.message};break;}}
  },setEnabled,setLights,setAnimate:(value:boolean)=>{dance.setAnimate(value);animate=value;},
  read:()=>({enabled,animate,lightsOn,ticks,lastUpdate,lastError,flow:'D049 realtime expanding optical puffs: upward velocity3.7m/s, gravity1.1m/s2, forward drift1.35m/s, transverse rolling, high spread and settling; visual approximation not two-phase water or CFD; R06 Blender experiment retained in016 history',densityShape:[W,H,D],updateHz:10,emission:[0,0,0],nativeLightsAdded:0,
   danceFloor:dance.read(),nozzleStatus:'Codex runtime nozzle bodies; D050 lit3D droplets are a separate resource; detailed final housing remains pending; D051 reuses L24/L25 for suspended moving heads',wetFloorSSR:'D051 same deep-room footprint, fades to dry front hall',artAcceptance:'not independently accepted; direct production requested',pairs:pairs.map(p=>({fog:p.fog,boundsMin:p.fogData.boundsMin,boundsMax:p.fogData.boundsMax,selectedLight:p.light.name,modelColliders:p.models.map(e=>world.getResource<PhysicsWorld>('PhysicsWorld').hasBody(e))}))}),
  dispose:()=>{dance.dispose();for(const p of pairs){for(const e of [...p.models,...p.tips])world.despawn(e).unwrap();world.despawn(p.fog).unwrap();world.set(p.light.entity,SpotLight,p.light.before).unwrap();assets.release(p.texture).unwrap();}for(const mesh of meshes)assets.release(mesh).unwrap();assets.release(paint).unwrap();assets.release(steel).unwrap();}};
}
