/** D049: continuous public-space optical density transported in three dimensions.
 * World-space advection/eddies are a realtime visual approximation, not a fluid solver.
 */
import {Time,type World} from '@forgeax/engine/ecs';
import type {AssetRegistry} from '@forgeax/engine/assets-runtime';
import {Name} from '@forgeax/engine/scene';
import {SpotLight,VolumetricFog,VolumetricFogSamplingValue} from '@forgeax/engine/render';
import {eased,unit,publicAirMask} from './pdr-atmosphere-domain';
const W=32,H=22,D=48;
const zones=[
 {name:'L20_CEIL_L_05',min:[-9.5,-.45,-44.4],max:[1.2,4.45,-14],part:0},
 {name:'L19_CEIL_L_04',min:[-1.2,-.45,-44.4],max:[9.5,4.45,-14],part:1},
] as const;
function hash3(x:number,y:number,z:number){let h=Math.imul(x,374761393)^Math.imul(y,668265263)^Math.imul(z,2147483647);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295;}
function mix(a:number,b:number,t:number){return a+(b-a)*t;}
function noise3(x:number,y:number,z:number){
 const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z),fx=x-ix,fy=y-iy,fz=z-iz;
 const u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy),w=fz*fz*(3-2*fz);
 return mix(mix(mix(hash3(ix,iy,iz),hash3(ix+1,iy,iz),u),mix(hash3(ix,iy+1,iz),hash3(ix+1,iy+1,iz),u),v),mix(mix(hash3(ix,iy,iz+1),hash3(ix+1,iy,iz+1),u),mix(hash3(ix,iy+1,iz+1),hash3(ix+1,iy+1,iz+1),u),v),w);
}
const fields=zones.map(zone=>{
 const field=new Float32Array(W*H*D*4);
 for(let z=0;z<D;z++)for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const X=zone.min[0]+(x+.5)/W*(zone.max[0]-zone.min[0]),Y=zone.min[1]+(y+.5)/H*(zone.max[1]-zone.min[1]),Z=zone.min[2]+(z+.5)/D*(zone.max[2]-zone.min[2]);
  const east=eased(-1.2,1.2,X),partition=zone.part===0?1-east:east,vertical=1-eased(2.8,4.35,Y);
  const roomMask=(1-eased(7.2,8.8,Math.abs(X)))*eased(-44.3,-41.8,Z)*(1-eased(-28.0,-14.5,Z));
  const i=(x+W*(y+H*z))*4;field.set([X,Y,Z,unit(roomMask*partition*vertical)],i);
 }return field;
});
export function danceFloorDensity(t:number,k:number,flowSpeed=1,background=.008,cloudGain=.85,a=new Uint8Array(W*H*D)){
 const field=fields[k],T=t*flowSpeed;
 a.fill(0);
 // 1. Accumulate the two side-nozzle spray plumes directly into this same ceiling-lit volume
 const count=22,lifetime=5.6,spacing=lifetime/count;
 for(const s of [-1,1]){
  for(let p=0;p<count;p++){
   const age=((T+(s<0?0:.28)-p*spacing)%lifetime+lifetime)%lifetime;
   const u=age/lifetime,phase=p*2.399+s*1.3;
   // Puffs emerge from the two side nozzles (x = +-4.3, y = 0.62, z = -38.0),
   // billow gently to ~1.75m, then settle and drift wide across the stage front and dance floor (x -> +-0.4m, z -> -26.5m).
   const px=s*(4.3-3.9*Math.pow(u,.82))+.55*Math.sin(u*4.6+phase)*u;
   const py=.58+2.45*u*Math.pow(1-u,1.20)-.20*u*u+.12*Math.cos(u*5.0+phase);
   const pz=-38+11.2*Math.pow(u,.88)+.45*Math.sin(u*3.6+phase)*u;
   const r=.42+2.45*Math.pow(u,1.02);
   const rx=r*(1.35+.65*u),ry=r*(.75-.28*u),rz=r*(1.25+.55*u);
   const env=Math.min(1,u/.12)*Math.pow(1-u,1.85);
   const strength=.95*env/(1+.85*u);
   const zone=zones[k];
   const ax=Math.max(0,Math.floor((px-2.2*rx-zone.min[0])/(zone.max[0]-zone.min[0])*W));
   const bx=Math.min(W-1,Math.ceil((px+2.2*rx-zone.min[0])/(zone.max[0]-zone.min[0])*W));
   if(ax>bx)continue;
   const ay=Math.max(0,Math.floor((py-2.2*ry-zone.min[1])/(zone.max[1]-zone.min[1])*H));
   const by=Math.min(H-1,Math.ceil((py+2.2*ry-zone.min[1])/(zone.max[1]-zone.min[1])*H));
   const az=Math.max(0,Math.floor((pz-2.2*rz-zone.min[2])/(zone.max[2]-zone.min[2])*D));
   const bz=Math.min(D-1,Math.ceil((pz+2.2*rz-zone.min[2])/(zone.max[2]-zone.min[2])*D));
   for(let z=az;z<=bz;z++)for(let y=ay;y<=by;y++)for(let x=ax;x<=bx;x++){
    const i=x+W*(y+H*z),j=i*4,X=field[j],Y=field[j+1],Z=field[j+2];
    const dx=(X-px)/rx,dy=(Y-py)/ry,dz=(Z-pz)/rz;
    const roll=.24*Math.sin(dx*2.1+phase+age*1.5)*Math.cos(dz*1.8-age*1.3);
    const val=strength*Math.exp(-1.25*(dx*dx+(dy+roll)*(dy+roll)+dz*dz));
    a[i]=Math.min(255,a[i]+Math.round(255*val));
   }
  }
 }
 // 2. Blend the nozzle puffs with the continuous 3D advected room mist field so they are one single optical medium
 for(let i=0;i<a.length;i++){
  const j=i*4,X=field[j],Y=field[j+1],Z=field[j+2],mask=field[j+3];if(mask===0){a[i]=0;continue;}
  const u=X-.68*T+1.4*Math.sin(.31*Z-.24*T)+.65*Math.sin(.6*Y+.24*Z+.31*T);
  const v=Z-.88*T+1.15*Math.sin(.43*X+.34*Y-.29*T);
  const w=Y-.24*T+.8*Math.sin(.57*X+.22*Z-.46*T);
  const broad=noise3(u*.48,w*.48,v*.48),fine=noise3(u*1.05+13,w*1.05-7,v*1.05+3);
  const cloud=eased(.40,.70,.77*broad+.23*fine),filament=eased(.36,.58,broad)*eased(.46,.68,fine);
  const puff=(a[i]/255)*(.58+.42*cloud);
  const floorStream=(1-eased(.20,2.50,Y))*eased(-41.5,-37.5,Z)*(1-eased(-31.0,-16.0,Z))*(.30+.70*cloud);
  const roomMist=background+cloudGain*(.86*cloud*cloud+.14*filament)+.32*floorStream;
  a[i]=Math.round(255*unit((roomMist+puff)*mask));
 }return a;
}
export function installDanceFloorMist(world:World,assets:AssetRegistry){
 const defaults={flowSpeed:1.05,background:.008,cloudGain:.82,extinction:.0052};
 const tuning={...defaults};
 // The volume samples the same broad downlights that light the floor and
 // structure. The room wash owns their intensity; the fog never retunes it.
 const lights=Array.from(world.query({read:[Name,SpotLight]}).unwrap(),r=>({name:r.get(Name).value,entity:r.entity}));
 const densityBuffers=zones.map(()=>new Uint8Array(W*H*D));
 const pairs=zones.map((zone,k)=>{
  const l=lights.find(l=>l.name===zone.name);if(!l)throw new Error('D079 missing ceiling band source '+zone.name);
  const texture=assets.create({kind:'texture',shape:{viewDimension:'3d',extent:{width:W,height:H,depth:D}},format:'r8unorm',data:danceFloorDensity(0,k),colorSpace:'linear',mips:{kind:'none'}}).unwrap();
  const data={light:l.entity,density:texture,boundsMin:Array.from(zone.min),boundsMax:Array.from(zone.max),extinction:[tuning.extinction,tuning.extinction,tuning.extinction],albedo:[.95,.95,.98],emission:[0,0,0],anisotropy:.28,maxDistance:55,sampling:VolumetricFogSamplingValue.density};
  const entity=world.spawn({component:Name,data:{value:'PDR/PUBLIC_AIR/advected-mist-'+k}},{component:VolumetricFog,data}).unwrap();return {entity,data,texture,l};
 });
 let enabled=true,animate=true,lightsOn=true,attached=true,ticks=0,lastUpdate=-1,error:unknown=null;
 const syncVolume=()=>{
  const next=enabled&&lightsOn; if(next===attached)return;
  for(const p of pairs){
   if(next)world.addComponent(p.entity,{component:VolumetricFog,data:p.data}).unwrap();
   else world.removeComponent(p.entity,VolumetricFog).unwrap();
  }
  attached=next;
 };
 const setTuning=(patch:Partial<typeof defaults>)=>{
  for(const key of Object.keys(patch) as (keyof typeof defaults)[]){const v=patch[key];if(!(key in defaults)||typeof v!=='number'||!Number.isFinite(v)||v<0||v>(key==='flowSpeed'?3:1))throw new Error('Invalid fog tuning '+key);}
  Object.assign(tuning,patch);
  for(const p of pairs){p.data.extinction=[tuning.extinction,tuning.extinction,tuning.extinction];if(attached)world.set(p.entity,VolumetricFog,{extinction:p.data.extinction}).unwrap();}return {...tuning};
 };
 world.insertResource('cyberpunk.mist.tuning',{read:()=>({...tuning}),set:setTuning,reset:()=>setTuning(defaults)});
 const setEnabled=(v:boolean)=>{enabled=v;syncVolume();};
 return {setEnabled,setAnimate:(v:boolean)=>{animate=v;},setLights:(v:boolean)=>{lightsOn=v;syncVolume();},
  tick:()=>{if(!attached||!animate||error)return;const t=world.getResource(Time).elapsed;if(t-lastUpdate<1/12)return;lastUpdate=t;ticks++;for(let k=0;k<pairs.length;k++){const r=assets.update(pairs[k].texture,{data:danceFloorDensity(t,k,tuning.flowSpeed,tuning.background,tuning.cloudGain,densityBuffers[k])});if(!r.ok){error={code:r.error.code,message:r.error.message};break;}}},
  read:()=>({enabled,animate,lightsOn,attached,ticks,lastUpdate,error,tuning:{...tuning},basis:'D079 deep-room volume lit by existing ceiling bands; continuous fade z=-29..-22m, front hall dry/clear',classification:'Realtime world-space advected 3D optical density, lateral and vertical eddies; not fluid CFD',transportMps:tuning.flowSpeed,transportDirection:'+X transverse, +Z toward entrance, +Y rise with 3D rolling warp',shape:[W,H,D],zones:zones.map(z=>({light:z.name,boundsMin:z.min,boundsMax:z.max})),emission:[0,0,0],newNativeLights:0,artAcceptance:'not independently accepted; user requested direct production'}),
  dispose:()=>{world.removeResource('cyberpunk.mist.tuning');for(const p of pairs){world.despawn(p.entity).unwrap();assets.release(p.texture).unwrap();}}};
}
