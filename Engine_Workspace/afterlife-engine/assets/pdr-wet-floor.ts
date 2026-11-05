import {SSR} from './pdr-post-profile-wb017';
/** D047: a thin wet dielectric surface on the real floor, not a water plane or reflection image.
 * Existing color/AO/geometry survive. UV1 holds world-space wetness; UV0 keeps the original tile.
 * Standard SSR owns live reflections; the native local probe supplies off-screen fallback.
 */
import type {World,EntityHandle} from '@forgeax/engine/ecs';
import type {AssetRegistry} from '@forgeax/engine/assets-runtime';
import type {AssetHandle,MeshAsset,MaterialAsset,TextureAsset} from '@forgeax/engine/types';
import {Name,Transform,GlobalTransform} from '@forgeax/engine/scene';
import {Materials,MeshFilter,MeshRenderer,ScreenSpaceReflection,ReflectionProbe,REFLECTION_PROBE_UPDATE_ONCE} from '@forgeax/engine/render';
import {packInterleavedVertexAttributes} from '@forgeax/engine/geometry';
import {publicAirMask,eased} from './pdr-atmosphere-domain';

const MAP_W=1024,MAP_H=2048;
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
export async function installWetFloor(world:World,assets:AssetRegistry,cameras:readonly EntityHandle[]){
 const textures:AssetHandle<'texture'>[]=[],materials:AssetHandle<'material'>[]=[],meshes:AssetHandle<'mesh'>[]=[];
 const retained:(AssetHandle<'texture'>|AssetHandle<'material'>)[]=[];
 const saved:{entity:EntityHandle;name:string;mesh:AssetHandle<'mesh'>;materials:number[];wetMesh:AssetHandle<'mesh'>;wetMaterials:number[]}[]=[];
 const baseSsr=cameras.map(entity=>({entity,before:world.get(entity,ScreenSpaceReflection)}));
 let wet=true,ssr=true,disposed=false;
 const resolveMaterial=async(ref:unknown)=>{
  if(typeof ref==='number')return assets.read(ref as AssetHandle<'material'>).unwrap() as MaterialAsset;
  if(typeof ref!=='string')throw new Error('D047 floor material reference missing');
  const h=(await assets.load(assets.parseGuid(ref),'material')).unwrap();retained.push(h);return assets.read(h).unwrap();
 };
 const resolveTexture=async(ref:unknown)=>{
  const value=typeof ref==='object'&&ref!==null&&'texture' in ref?(ref as {texture:unknown}).texture:ref;
  let h:AssetHandle<'texture'>;
  if(typeof value==='number')h=value as AssetHandle<'texture'>;
  else if(typeof value==='string'){h=(await assets.load(assets.parseGuid(value),'texture')).unwrap();retained.push(h);}
  else return undefined;
  const tex=assets.read(h).unwrap();
  if(tex.encoding||!['rgba8unorm','rgba8unorm-srgb','bgra8unorm','bgra8unorm-srgb'].includes(tex.format))throw new Error('D047 requires decoded normal texture; got '+tex.format);
  return tex;
 };
 const mask=new Float32Array(MAP_W*MAP_H);
 let wetPixels=0,minR=1,maxR=0;
 for(let z=0;z<MAP_H;z++)for(let x=0;x<MAP_W;x++){
  const X=X0+(x+.5)/MAP_W*(X1-X0),Z=Z0+(z+.5)/MAP_H*(Z1-Z0),i=x+z*MAP_W;
  const w=wetnessAt(X,Z);mask[i]=w;if(w>.3)wetPixels++;
 }
 const sampler=assets.create({kind:'sampler',magFilter:'linear',minFilter:'linear',mipmapFilter:'linear',addressModeU:'clamp-to-edge',addressModeV:'clamp-to-edge',maxAnisotropy:4}).unwrap();
 const bind=(texture:AssetHandle<'texture'>)=>({texture,sampler,coordinates:{set:1}});
 const materialCache=new Map<string,AssetHandle<'material'>>();
 const rows=Array.from(world.query({read:[Name,Transform,GlobalTransform,MeshFilter,MeshRenderer]}).unwrap(),r=>({entity:r.entity,name:r.get(Name).value,mesh:r.get(MeshFilter).assetHandle,materials:Array.from(r.get(MeshRenderer).materials),matrix:r.get(GlobalTransform).world})).filter(r=>['ARCH_DANCE_FLOOR','ARCH_FLOOR_SLAB','ARCH_FLOOR_PATCHES'].includes(r.name));
 if(rows.length!==3)throw new Error('D047 expected exactly three existing ground assemblies');
 for(const row of rows){
  const source=assets.read(row.mesh).unwrap();if(source.kind!=='mesh')throw new Error('D047 ground mesh pending');
  const origPositions=source.attributes.position,origNormals=source.attributes.normal,origIndices=source.indices;
  if(!(origPositions instanceof Float32Array)||!(origNormals instanceof Float32Array)||!(origIndices instanceof Uint16Array||origIndices instanceof Uint32Array))throw new Error('D047 requires actual CPU floor positions/normals/indices');
  const positions=new Float32Array(origPositions);
  if(row.name==='ARCH_FLOOR_PATCHES'){
   for(let i=0;i<positions.length;i+=3)if(positions[i+1]>0.0005)positions[i+1]=0.0035;
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
  for(let i=0;i<source.materialSlots.length;i++){
   const slot=source.materialSlots[i];if(!['M_DANCE_TILE','M_FLOOR_TILE'].includes(slot.slotName))continue;
   const ref=row.materials[i]||slot.defaultMaterial,key=String(ref);let handle=materialCache.get(key);
   if(!handle){
    const original=await resolveMaterial(ref),v=original.values??{},normal=await resolveTexture(v.normalTexture),orm=await resolveTexture(v.metallicRoughnessTexture);
    const pixels=new Uint8Array(MAP_W*MAP_H*4),rough=new Uint8Array(MAP_W*MAP_H*4);
    const nw=normal?.shape.extent.width??1,nh=normal?.shape.extent.height??1;
    const ow=orm?.shape.extent.width??1,oh=orm?.shape.extent.height??1,rf=typeof v.roughness==='number'?v.roughness:1;
    for(let z=0;z<MAP_H;z++)for(let x=0;x<MAP_W;x++){
     const i=x+z*MAP_W,X=X0+(x+.5)/MAP_W*(X1-X0),Z=Z0+(z+.5)/MAP_H*(Z1-Z0);
     // The measured R8 horizontal tile UVs are u=X/2.4, v=Z/2.4+1. Preserve their dry micro-normal.
     const u=X/2.4,vv=Z/2.4+1,fu=u-Math.floor(u),fv=vv-Math.floor(vv),tx=Math.floor(fu*nw),tz=Math.floor(fv*nh),j=(tx+tz*nw)*4;
     const oi=(Math.floor(fu*ow)+Math.floor(fv*oh)*ow)*4;
     const dryR=orm?orm.data[oi+1]/255*rf:.55;
     // Real source ORM has rough mortar/edge damage (measured G>.62); keep it coarse through the wet zone.
     const joint=smooth(.62,.74,dryR),w=mask[i]*(1-.98*joint);
     const frontDry=eased(-29,-22,Z),drySurfaceR=Math.max(dryR,frontDry*(.58+.07*noise(X*.9+13,Z*.9)));
     const r=drySurfaceR*(1-w)+(.09+.025*noise(X*1.7+7,Z*1.7))*w;
     minR=Math.min(minR,r);maxR=Math.max(maxR,r);rough.set([Math.round(r*255),Math.round(r*255),Math.round(r*255),255],i*4);
     const a=normal?(normal.data[j]/127.5-1):0,b=normal?(normal.data[j+1]/127.5-1):0;
     // Non-periodic submillimetre height gradients, not repeated sine waves or a fluid-motion claim.
     const eps=.025,dx=-(filmHeight(X+eps,Z)-filmHeight(X-eps,Z))/(2*eps),dz=-(filmHeight(X,Z+eps)-filmHeight(X,Z-eps))/(2*eps);
     const nx=a*(1-w)+dx*w,ny=b*(1-w)+dz*w,nz=Math.sqrt(Math.max(.001,1-nx*nx-ny*ny));
     pixels.set([Math.round(clamp(nx*.5+.5)*255),Math.round(clamp(ny*.5+.5)*255),Math.round(clamp(nz*.5+.5)*255),255],i*4);
    }
    const roughMap=assets.create({kind:'texture',shape:{viewDimension:'2d',extent:{width:MAP_W,height:MAP_H}},format:'rgba8unorm',data:rough,colorSpace:'linear',mips:{kind:'generate'}}).unwrap();textures.push(roughMap);
    const nm=assets.create({kind:'texture',shape:{viewDimension:'2d',extent:{width:MAP_W,height:MAP_H}},format:'rgba8unorm',data:pixels,colorSpace:'linear',mips:{kind:'generate'}}).unwrap();textures.push(nm);
    const base:[number,number,number,number]=Array.isArray(v.baseColor)?[Number(v.baseColor[0]??1)*1.35,Number(v.baseColor[1]??1)*1.30,Number(v.baseColor[2]??1)*1.42,Number(v.baseColor[3]??1)]:[1.35,1.30,1.42,1];
    // The custom map ALREADY contains source ORM.G * source roughness. Keeping the
    // old packed map would multiply it twice, turning dry tile into a wet mirror.
    handle=assets.create(Materials.standard({baseColor:base,baseColorTexture:v.baseColorTexture??undefined,occlusionTexture:v.occlusionTexture??undefined,
     metallic:0,roughness:1,roughnessTexture:bind(roughMap),normalTexture:bind(nm),normalScale:[1,1],ior:1.333,specular:1,renderState:{cullMode:'none'}})).unwrap();materials.push(handle);materialCache.set(key,handle);
   }slots[i]=handle;
  }
  saved.push({...row,wetMesh:mesh,wetMaterials:slots});
  world.set(row.entity,MeshFilter,{assetHandle:mesh}).unwrap();world.set(row.entity,MeshRenderer,{materials:slots}).unwrap();
 }
 const probe=world.spawn({component:Name,data:{value:'PDR/wet-floor-deep-hall-reflection-fallback'}},{component:Transform,data:{pos:[0,2.5,-32]}},{component:ReflectionProbe,data:{halfExtents:[9,3.5,11],resolution:128,updateIntent:REFLECTION_PROBE_UPDATE_ONCE,intensity:.75,boxProjection:true}}).unwrap();
 const setSSR=(on:boolean)=>{ssr=on;for(const item of baseSsr){if(on){if(world.hasComponent(item.entity,ScreenSpaceReflection))world.set(item.entity,ScreenSpaceReflection,{...SSR}).unwrap();else world.addComponent(item.entity,{component:ScreenSpaceReflection,data:{...SSR}}).unwrap();}else if(world.hasComponent(item.entity,ScreenSpaceReflection))world.removeComponent(item.entity,ScreenSpaceReflection).unwrap();}return ssr;};
 const setWet=(on:boolean)=>{wet=on;for(const s of saved){world.set(s.entity,MeshFilter,{assetHandle:on?s.wetMesh:s.mesh}).unwrap();world.set(s.entity,MeshRenderer,{materials:on?s.wetMaterials:s.materials}).unwrap();}return wet;};
 const read=()=>({enabled:wet,ssrRequested:ssr,assemblies:saved.map(s=>({name:s.name,sourceMesh:s.mesh,wetMesh:s.wetMesh})),roughnessRange:[minR,maxR],wetPixelFraction:wetPixels/mask.length,footprint:{x:[-9.5,9.5],z:[-44,-22],domain:'D051 deep room, fades z=-29..-22; front dry roughness>=.58; upper/VIP excluded'},ior:1.333,metallic:0,emission:0,maps:[MAP_W,MAP_H],deepProbe:probe,classification:'thin-film equivalent opaque dielectric; native SSR + local probe fallback; static capillary micro-normal, no water-flow solver',geometry:'positions/indices/triangles/transforms unchanged; UV1 added; existing colliders kept',artAcceptance:'not independently accepted; user requested direct production'});
 setSSR(true);world.insertResource('cyberpunk.wetFloor',{read,setWet,setSSR});
 return {read,setWet,setSSR,dispose:()=>{if(disposed)return;disposed=true;setWet(false);for(const item of baseSsr){if(item.before.ok)world.set(item.entity,ScreenSpaceReflection,item.before.value).unwrap();else if(world.hasComponent(item.entity,ScreenSpaceReflection))world.removeComponent(item.entity,ScreenSpaceReflection).unwrap();}world.removeResource('cyberpunk.wetFloor');world.despawn(probe).unwrap();for(const h of meshes)assets.release(h).unwrap();for(const h of materials)assets.release(h).unwrap();for(const h of textures)assets.release(h).unwrap();assets.release(sampler).unwrap();for(const h of retained)assets.release(h).unwrap();}};
}
