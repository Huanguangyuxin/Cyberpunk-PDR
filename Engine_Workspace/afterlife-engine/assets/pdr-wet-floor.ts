import {allowsNativeSsr,type ViewSize} from './pdr-native-resolution';
import {SSR} from './pdr-post-profile-wb017';
import {retilePbr} from './pdr-native-floor-material';
/** D047: a thin wet dielectric surface on the real floor, not a water plane or reflection image.
 * Existing color/AO/geometry survive. UV1 holds world-space wetness; UV0 keeps the original tile.
 * Standard SSR owns live reflections; the native local probe supplies off-screen fallback.
 */
import type {World,EntityHandle} from '@forgeax/engine/ecs';
import type {AssetRegistry} from '@forgeax/engine/assets-runtime';
import type {AssetHandle,MeshAsset} from '@forgeax/engine/types';
import {Name,Transform,GlobalTransform} from '@forgeax/engine/scene';
import {MeshFilter,MeshRenderer,ScreenSpaceReflection,ReflectionProbe,REFLECTION_PROBE_UPDATE_ONCE} from '@forgeax/engine/render';
import {packInterleavedVertexAttributes} from '@forgeax/engine/geometry';
import {publicAirMask,eased} from './pdr-atmosphere-domain';

const MAP_W=2048,MAP_H=2048;
const X0=-14.5,X1=14.5,Z0=-44.5,Z1=.5;
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
const smooth=(a:number,b:number,v:number)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
function hash(x:number,z:number){let h=Math.imul(x,374761393)^Math.imul(z,668265263);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295;}
function noise(x:number,z:number){const ix=Math.floor(x),iz=Math.floor(z),u=smooth(0,1,x-ix),v=smooth(0,1,z-iz);return (1-v)*((1-u)*hash(ix,iz)+u*hash(ix+1,iz))+v*((1-u)*hash(ix,iz+1)+u*hash(ix+1,iz+1));}
function filmHeight(x:number,z:number){return .00022*noise(x*4.3+z*1.5,z*4.3-x*1.5)+.00006*noise(x*12-z*5,z*12+x*5);}
/** Same continuous public-space footprint as D049 fog. Upper floors/VIP stay dry. */
export function wetnessAt(x:number,z:number){
 const edge=publicAirMask(x,z)*smooth(-44,-42.5,z);
 const pooling=.62*noise(x*.46,z*.46)+.38*noise(x*1.12+19,z*1.12-8);
 return edge*(.16+.84*smooth(.28,.66,pooling));
}
const dampSpots=[[-3.2,-27.8,1.05,.94],[3.6,-31.2,1.25,1.13],[.95,-34.8,1.42,.88]] as const;
function installedWetness(x:number,z:number){
 if(x< -4.5||x>5.1||z< -36||z> -26.5)return 0;
 let edge=2;
 for(const [cx,cz,rx,rz] of dampSpots)edge=Math.min(edge,Math.hypot((x-cx)/rx,(z-cz)/rz));
 return (1-smooth(.46,1.12,edge+.17*(noise(x*2.9,z*2.9)-.5)))*.91;
}
interface FloorSet {readonly standard:readonly string[]; readonly planar:readonly string[]}
export async function installWetFloor(world:World,assets:AssetRegistry,cameras:readonly EntityHandle[],
 original:FloorSet, installed:FloorSet, trimGuid:string, drawingBuffer:()=>ViewSize|undefined){
 if([original.standard,original.planar,installed.standard,installed.planar].some(set=>set.length!==2))throw new Error('Floor finishes require two cooked materials per render path');
 const textures:AssetHandle<'texture'>[]=[],materials:AssetHandle<'material'>[]=[],meshes:AssetHandle<'mesh'>[]=[];
 const retained:(AssetHandle<'texture'>|AssetHandle<'material'>)[]=[];
 const saved:{entity:EntityHandle;name:string;mesh:AssetHandle<'mesh'>;materials:number[];wetMesh:AssetHandle<'mesh'>;original:number[][];installed:number[][]}[]=[];
 const baseSsr=cameras.map(entity=>({entity,before:world.get(entity,ScreenSpaceReflection)}));
 let wet=true,ssr=true,disposed=false,planar=false,installedEnabled=true;
 // D112: these maps contain macro wetness/film only. Original native UV0 tile (2K runtime / 4K DCC)
 // normals, 2K ORM and 3mm grout are sampled by the cooked Surface on the GPU.
 const macroPixels=new Uint8Array(MAP_W*MAP_H*4),filmPixels=new Uint8Array(MAP_W*MAP_H*4);
 let wetPixels=0,installedWetPixels=0;
 for(let z=0;z<MAP_H;z++)for(let x=0;x<MAP_W;x++){
  const X=X0+(x+.5)/MAP_W*(X1-X0),Z=Z0+(z+.5)/MAP_H*(Z1-Z0),i=x+z*MAP_W;
  const w=wetnessAt(X,Z),localWet=installedWetness(X,Z);
  if(w>.3)wetPixels++;
  if(localWet>.3)installedWetPixels++;
  // A follows the two entrance traffic lanes and the dance-floor perimeter in metres.
  const laneDistance=Math.min(Math.abs(Math.abs(X)-2.2),Math.abs(Math.abs(X)-5.8));
  const travel=(1-smooth(.24,1.05,laneDistance))*smooth(-43,-37,Z)*smooth(0,2,-Z);
  macroPixels.set([Math.round(w*255),Math.round(noise(X*1.7+7,Z*1.7)*255),Math.round(localWet*255),Math.round(travel*255)],i*4);
  const eps=.025,nx=-(filmHeight(X+eps,Z)-filmHeight(X-eps,Z))/(2*eps),nz=-(filmHeight(X,Z+eps)-filmHeight(X,Z-eps))/(2*eps);
  const ny=Math.sqrt(Math.max(.001,1-nx*nx-nz*nz));
  // Encode slopes at64x; the cooked Surface scale restores physical amplitude.
  filmPixels.set([Math.round(clamp(nx*64*.5+.5)*255),Math.round(clamp(nz*64*.5+.5)*255),Math.round(ny*255),255],i*4);
 }
 const makeMacro=(data:Uint8Array)=>{
  const h=assets.create({kind:'texture',shape:{viewDimension:'2d',extent:{width:MAP_W,height:MAP_H}},format:'rgba8unorm',data,colorSpace:'linear',mips:{kind:'generate'}}).unwrap();textures.push(h);return h;
 };
 const maskTexture=makeMacro(macroPixels),filmTexture=makeMacro(filmPixels);
 const sampler=assets.create({kind:'sampler',magFilter:'linear',minFilter:'linear',mipmapFilter:'linear',addressModeU:'clamp-to-edge',addressModeV:'clamp-to-edge',maxAnisotropy:4}).unwrap();
 const bind=(texture:AssetHandle<'texture'>)=>({texture,sampler,coordinates:{set:1}});
 const materialCache=new Map<string,AssetHandle<'material'>>();
 const variant=async(guid:string)=>{
  const existing=materialCache.get(guid);if(existing!==undefined)return existing;
  const cooked=(await assets.load(assets.parseGuid(guid),'material')).unwrap();
  retained.push(cooked);
  const handle=assets.copy(cooked).unwrap(),source=assets.read(handle).unwrap();
  materials.push(handle);
  const hallPaving=guid===installed.standard[0]||guid===installed.planar[0];
  const finish=hallPaving?{baseColor:[.38,.36,.37,1],roughness:.86,specular:.48}:undefined;
  assets.update(handle,{values:{...source.values,...finish,wetMaskTexture:bind(maskTexture),filmNormalTexture:bind(filmTexture)}}).unwrap();
  materialCache.set(guid,handle);
  return handle;
 };
 const cookedTrim=(await assets.load(assets.parseGuid(trimGuid),'material')).unwrap();
 retained.push(cookedTrim);
 const trim=assets.copy(cookedTrim).unwrap();
 materials.push(trim);
 assets.update(trim,{values:retilePbr(assets.read(trim).unwrap().values,1/.24)}).unwrap();
 const rows=Array.from(world.query({read:[Name,Transform,GlobalTransform,MeshFilter,MeshRenderer]}).unwrap(),r=>({entity:r.entity,name:r.get(Name).value,mesh:r.get(MeshFilter).assetHandle,materials:Array.from(r.get(MeshRenderer).materials),matrix:r.get(GlobalTransform).world})).filter(r=>['ARCH_DANCE_FLOOR','ARCH_FLOOR_SLAB','ARCH_FLOOR_PATCHES'].includes(r.name));
 if(rows.length!==3)throw new Error('D047 expected exactly three existing ground assemblies');
 for(const row of rows){
  const source=assets.read(row.mesh).unwrap();if(source.kind!=='mesh')throw new Error('D047 ground mesh pending');
  const origPositions=source.attributes.position,origNormals=source.attributes.normal,origIndices=source.indices;
  if(!(origPositions instanceof Float32Array)||!(origNormals instanceof Float32Array)||!(origIndices instanceof Uint16Array||origIndices instanceof Uint32Array))throw new Error('D047 requires actual CPU floor positions/normals/indices');
  const positions=new Float32Array(origPositions);
  if(row.name==='ARCH_FLOOR_PATCHES'){
   // Sink ARCH_FLOOR_PATCHES inside the slab at y=-0.05m so its collision stays valid without any overlay squares on the floor.
   for(let i=0;i<positions.length;i+=3)positions[i+1]=-0.05;
  }
  const uv1=new Float32Array(positions.length/3*2),m=row.matrix;
  for(let i=0;i<positions.length;i+=3){const x=positions[i],y=positions[i+1],z=positions[i+2];uv1[i/3*2]=(m[0]*x+m[4]*y+m[8]*z+m[12]-X0)/(X1-X0);uv1[i/3*2+1]=(m[2]*x+m[6]*y+m[10]*z+m[14]-Z0)/(Z1-Z0);}
  let indices:Uint16Array|Uint32Array=origIndices,submeshes=source.submeshes;
  if(row.name==='ARCH_FLOOR_PATCHES'||row.name==='ARCH_DANCE_FLOOR'){
   const kept:number[]=[],nextSubs:MeshAsset['submeshes'][number][]=[];
   for(const sub of source.submeshes){
    const start=kept.length;
    for(let i=sub.indexOffset;i<sub.indexOffset+sub.indexCount;i+=3){
     const a=origIndices[i],b=origIndices[i+1],c=origIndices[i+2];
     const ny=(origNormals[a*3+1]+origNormals[b*3+1]+origNormals[c*3+1])/3;
      if(row.name==='ARCH_FLOOR_PATCHES'){
      if(ny<0.5)continue;
      const cx=(positions[a*3]+positions[b*3]+positions[c*3])/3,cz=(positions[a*3+2]+positions[b*3+2]+positions[c*3+2])/3;
      // Exclude patches inside dance floor + aisle screen border, front-hall inlay grid, or booth footprints
      if(cx>-7.50&&cx<7.50&&cz>-38.10&&cz<-24.10)continue;
      if(cx>-4.90&&cx<4.90&&cz>-19.40&&cz<-0.40)continue;
      if(cx<-7.60||(cx>11.20&&cz<-22.50))continue;
     }else if(ny<-0.5){
      continue;
     }
     kept.push(a,b,c);
    }
    if(kept.length>start)nextSubs.push({...sub,indexOffset:start,indexCount:kept.length-start});
   }
   indices=new Uint32Array(kept);submeshes=nextSubs;
  }
  const attributes={...source.attributes,position:positions,uv1};const packed=packInterleavedVertexAttributes(attributes,positions.length/3).unwrap();
  const mesh=assets.create({...source,attributes,vertices:packed.vertices,indices,submeshes}).unwrap();meshes.push(mesh);
  const slots=source.materialSlots.map((_,i)=>Number(row.materials[i]??0));
  const variants=[original,installed].map(()=>[slots.slice(),slots.slice()]);
  for(let i=0;i<source.materialSlots.length;i++){
   const slot=source.materialSlots[i];
   if(row.name==='ARCH_DANCE_FLOOR'&&slot.slotName==='M_STEEL_BLACK'){
    variants[1][0][i]=trim;variants[1][1][i]=trim;
    continue;
   }
   // D107: also bind ARCH_FLOOR_PATCHES secondary slots (M_COUNTER_STEEL, M_WALL_NAVY) to the wet floor tile
   // material so floor patches blend seamlessly into the tiled floor instead of showing as irregular dark/black bricks.
   const isPatchSlot=row.name==='ARCH_FLOOR_PATCHES'&&['M_COUNTER_STEEL','M_WALL_NAVY'].includes(slot.slotName);
   if(!['M_DANCE_TILE','M_FLOOR_TILE'].includes(slot.slotName)&&!isPatchSlot)continue;
   const donorSlot=isPatchSlot?source.materialSlots[0].slotName:slot.slotName;
   if(donorSlot!=='M_FLOOR_TILE'&&donorSlot!=='M_DANCE_TILE')throw new Error('D112 unknown donor '+donorSlot);
   const donor=donorSlot==='M_FLOOR_TILE'?0:1;
   for(const [index,set] of [original,installed].entries()){
    const finish=index===1&&row.name==='ARCH_FLOOR_PATCHES'?0:donor;
    variants[index][0][i]=await variant(set.standard[finish]);
    variants[index][1][i]=await variant(set.planar[finish]);
   }
  }
  saved.push({...row,wetMesh:mesh,original:variants[0],installed:variants[1]});
  world.set(row.entity,MeshFilter,{assetHandle:mesh}).unwrap();
 }
 const probe=world.spawn({component:Name,data:{value:'PDR/wet-floor-deep-hall-reflection-fallback'}},{component:Transform,data:{pos:[0,2.5,-32]}},{component:ReflectionProbe,data:{halfExtents:[9,3.5,11],resolution:128,updateIntent:REFLECTION_PROBE_UPDATE_ONCE,intensity:.75,boxProjection:true}}).unwrap();
 let ssrApplied:boolean|undefined;
 const syncSSR=()=>{
  const on=ssr&&allowsNativeSsr(drawingBuffer());
  if(on===ssrApplied)return on;
  for(const {entity} of baseSsr){
   const has=world.hasComponent(entity,ScreenSpaceReflection);
   if(on&&!has)world.addComponent(entity,{component:ScreenSpaceReflection,data:{...SSR}}).unwrap();
   if(!on&&has)world.removeComponent(entity,ScreenSpaceReflection).unwrap();
  }
  ssrApplied=on;
  return on;
 };
 const setSSR=(on:boolean)=>{ssr=on;return syncSSR();};

 const apply=()=>{for(const s of saved){
  const mesh=wet?s.wetMesh:s.mesh;
  if(world.get(s.entity,MeshFilter).unwrap().assetHandle!==mesh)world.set(s.entity,MeshFilter,{assetHandle:mesh}).unwrap();
  const materials=wet?(installedEnabled?s.installed:s.original)[planar && s.name==='ARCH_DANCE_FLOOR' ? 1 : 0]:s.materials;
  world.set(s.entity,MeshRenderer,{materials}).unwrap();
 }};
 const setWet=(on:boolean)=>{wet=on;apply();return wet;};
 const setPlanar=(on:boolean)=>{planar=on;apply();};
 const setInstalled=(on:boolean)=>{installedEnabled=on;apply();};
 apply();
 const read=()=>({
  enabled:wet,installed:installedEnabled,ssrRequested:ssr,ssrActive:ssrApplied,planar,
  assemblies:saved.map(s=>({name:s.name,sourceMesh:s.mesh,wetMesh:s.wetMesh,
   activeMaterials:Array.from(world.get(s.entity,MeshRenderer).unwrap().materials)})),
  nativeDetailSampling:installedEnabled?'D186 2048 px / 1.2 m with 16× anisotropy':'D112 2.4 m detail on original UV0',
  wetPixelFraction:(installedEnabled?installedWetPixels:wetPixels)/(MAP_W*MAP_H),
  footprint:installedEnabled?{dampSpots,zone:'dance floor only'}:{x:[-9.5,9.5],z:[-44,-22],zone:'deep public hall'},
  maps:[MAP_W,MAP_H],deepProbe:probe,
 });
 setSSR(true);world.insertResource('cyberpunk.wetFloor',{read,setWet,setSSR});
 return {read,setWet,setSSR,syncSSR,setPlanar,setInstalled,dispose:()=>{if(disposed)return;disposed=true;setWet(false);for(const item of baseSsr){if(item.before.ok)world.set(item.entity,ScreenSpaceReflection,item.before.value).unwrap();else if(world.hasComponent(item.entity,ScreenSpaceReflection))world.removeComponent(item.entity,ScreenSpaceReflection).unwrap();}world.removeResource('cyberpunk.wetFloor');world.despawn(probe).unwrap();for(const h of meshes)assets.release(h).unwrap();for(const h of materials)assets.release(h).unwrap();for(const h of textures)assets.release(h).unwrap();assets.release(sampler).unwrap();for(const h of retained)assets.release(h).unwrap();}};
}
