/** D050: closed liquid volumes with small, pinned gravity/capillary surface modes.
 * The native mesh/normal/tangent changes, not a scrolling reflection or fluid-CFD claim.
 */
import {liquidDepthProfiles} from './pdr-liquid-depth-data';
import {Time,type World,type EntityHandle} from '@forgeax/engine/ecs';
import type {AssetRegistry} from '@forgeax/engine/assets-runtime';
import type {AssetHandle,MeshAsset,MaterialAsset} from '@forgeax/engine/types';
import {packInterleavedVertexAttributes} from '@forgeax/engine/geometry';
import {Name,GlobalTransform} from '@forgeax/engine/scene';
import {MeshFilter,MeshRenderer,Materials,getActiveCamera} from '@forgeax/engine/render';

type VolumeModes={a:number;b:number;c:number;d:number;e:number;f:number;g:number;h:number;i:number;j:number;den:number};
type LiquidRow={entity:EntityHandle;name:string;original:AssetHandle<'mesh'>;originalMaterials:number[];staticMesh:AssetHandle<'mesh'>;source:MeshAsset;radius:number;top:number;phase:number;isOpen:boolean;volume:VolumeModes;material:AssetHandle<'material'>;mesh?:AssetHandle<'mesh'>;pos?:Float32Array;normal?:Float32Array;tangent?:Float32Array;uv1?:Float32Array;template:boolean};
function extent(m:MeshAsset){const p=m.attributes.position as Float32Array;let radius=0,lo=Infinity,hi=-Infinity;for(let i=0;i<p.length;i+=3){radius=Math.max(radius,Math.hypot(p[i],p[i+2]));lo=Math.min(lo,p[i+1]);hi=Math.max(hi,p[i+1]);}return {radius,lo,hi};}
function volumeModes(mesh:MeshAsset,r:number,top:number):VolumeModes{
 const p=mesh.attributes.position as Float32Array,indices=mesh.indices!,g=new Float64Array(p.length/3),o={a:0,b:0,c:0,d:0,e:0,f:0,g:0,h:0,i:0,j:0,den:0};
 for(let i=0;i<indices.length;i+=3){const a=indices[i],b=indices[i+1],c=indices[i+2];g[a]+=(p[b*3+2]*p[c*3]-p[b*3]*p[c*3+2])/6;g[b]+=(p[a*3]*p[c*3+2]-p[a*3+2]*p[c*3])/6;g[c]+=(p[a*3+2]*p[b*3]-p[a*3]*p[b*3+2])/6;}
 for(let i=0;i<g.length;i++){const u=p[i*3]/r,v=p[i*3+2]/r,e=Math.max(0,1-u*u-v*v),f=Math.max(0,Math.min(1,(p[i*3+1]-(top-.008))/.0064)),m=f*f*(3-2*f),w=g[i]*m*e;o.a+=w*u;o.b+=w*v;o.c+=w*.28*(u*u-v*v);o.d+=w*.56*u*v;o.e+=w*.16*(u*u*u-3*u*v*v);o.f+=w*.16*(3*u*u*v-v*v*v);o.g+=w*e*Math.sin(6.4*u+3.3*v);o.h+=w*e*Math.cos(6.4*u+3.3*v);o.i+=w*e*Math.sin(-4.8*u+6.7*v);o.j+=w*e*Math.cos(-4.8*u+6.7*v);o.den+=w*e;}
 if(Math.abs(o.den)<1e-12)throw new Error('Liquid free-surface volume constraint is degenerate');return o;
}

export async function installLiquidMotion(world:World,assets:AssetRegistry,templateGuids:readonly string[],glassMaterialGuid:string,heroGlassGuids:readonly string[],liquidMaterialGuids:readonly string[],heroRefractiveMaterialGuid:string){
 const retained:AssetHandle<'mesh'|'material'>[]=[],materials:AssetHandle<'material'>[]=[],rows:LiquidRow[]=[],glassSaved:{entity:EntityHandle;materials:number[];mesh:AssetHandle<'mesh'>}[]=[];
 const templates:MeshAsset[]=[];
 for(const guid of templateGuids){const h=(await assets.load(assets.parseGuid(guid),'mesh')).unwrap();retained.push(h);templates.push(assets.read(h).unwrap());}
 const descriptors=templates.map(mesh=>({mesh,...extent(mesh)}));
 const opticalBases:AssetHandle<'material'>[]=[];for(const guid of liquidMaterialGuids){const h=(await assets.load(assets.parseGuid(guid),'material')).unwrap();retained.push(h);opticalBases.push(h);}if(opticalBases.length!==5)throw new Error('D053 requires five cooked liquid optical materials');
 const staticMeshes:AssetHandle<'mesh'>[]=[],refinedSources=new Map<string,{source:MeshAsset;handle:AssetHandle<'mesh'>}>();
 const sourceCache=new Map<number,MeshAsset>(),matCache=new Map<string,AssetHandle<'material'>>();
 const existing=Array.from(world.query({read:[Name,MeshFilter,MeshRenderer,GlobalTransform]}).unwrap(),r=>({entity:r.entity,name:r.get(Name).value,handle:r.get(MeshFilter).assetHandle,materials:Array.from(r.get(MeshRenderer).materials)})).filter(r=>r.name.startsWith('DRINK_')&&r.name.endsWith('_LIQUID'));
 for(const item of existing){
  let original=sourceCache.get(item.handle);if(!original){original=assets.read(item.handle).unwrap() as MeshAsset;sourceCache.set(item.handle,original);}
  const dims=extent(original),match=descriptors.find(t=>Math.abs(t.radius-dims.radius)<.00002&&Math.abs(t.hi-dims.hi)<.00002&&Math.abs(t.lo-dims.lo)<.00002);
  const baseSource=match?.mesh??original;
  const ref=item.materials[0]||original.materialSlots[0].defaultMaterial;const key=String(ref)+':'+Math.round(dims.radius*10000)+':'+Math.round((dims.hi-dims.lo)*10000);
  let material=matCache.get(key);
  if(!material){
   let h:AssetHandle<'material'>;
   if(typeof ref==='number')h=ref as AssetHandle<'material'>;
   else{h=(await assets.load(assets.parseGuid(String(ref)),'material')).unwrap();retained.push(h);}
   const m=assets.read(h).unwrap() as MaterialAsset,v=m.values??{};
   const color=Array.isArray(v.attenuationColor)?v.attenuationColor as number[]:[1,1,1];
   const matched=match?descriptors.indexOf(match):-1;
   const type=matched>=0?matched:color[1]<.1?1:color[2]<.2?2:color[1]<.6?3:0;
   material=assets.copy(opticalBases[type]).unwrap();const cooked=assets.read(material).unwrap();
   const profile=liquidDepthProfiles[type],depthScale=(dims.hi-dims.lo)/(profile.top-profile.lo);
   assets.update(material,{values:{...cooked.values,thickness:.30*depthScale}}).unwrap();materials.push(material);matCache.set(key,material);
  }
  const sourceKey=String(item.handle)+':'+(match?descriptors.indexOf(match):-1);let refined=refinedSources.get(sourceKey);
  if(!refined){
   const uv1=new Float32Array((baseSource.attributes.position as Float32Array).length/3*2),p=baseSource.attributes.position as Float32Array,n=baseSource.attributes.normal as Float32Array;
   for(let i=0;i<p.length;i+=3){const u=Math.hypot(p[i],p[i+2])/dims.radius,top=n[i+1]>.6;uv1[i/3*2]=top?.55+.4*Math.min(1,u):.25;uv1[i/3*2+1]=top?.65:Math.max(0,Math.min(1,(p[i+1]-dims.lo)/(dims.hi-dims.lo)));}
   const attributes={...baseSource.attributes,uv1},packed=packInterleavedVertexAttributes(attributes,p.length/3).unwrap(),source={...baseSource,attributes,vertices:packed.vertices};
   const handle=assets.create(source).unwrap();staticMeshes.push(handle);refined={source,handle};refinedSources.set(sourceKey,refined);
  }
  const source=refined.source;world.set(item.entity,MeshFilter,{assetHandle:refined.handle}).unwrap();world.set(item.entity,MeshRenderer,{materials:source.materialSlots.map(()=>material!)}).unwrap();
  rows.push({entity:item.entity,name:item.name,original:item.handle,originalMaterials:item.materials,staticMesh:refined.handle,source,radius:dims.radius,top:dims.hi,phase:rows.length*2.399963,isOpen:/COUPE|TUMBLER/.test(item.name),volume:volumeModes(source,dims.radius,dims.hi),material,template:!!match});
 }
 // Current renderer exposes one transmission backdrop. The liquid keeps that real
 // volume path; paired containers use native lit alpha thin shells, with no second
 // refraction claim. Editable DCC/source glass remains physically transmissive.
 const shell=(await assets.load(assets.parseGuid(glassMaterialGuid),'material')).unwrap();retained.push(shell);
 const refractive=(await assets.load(assets.parseGuid(heroRefractiveMaterialGuid),'material')).unwrap();retained.push(refractive);
 const heroNames=['DRINK_HERO_1_NIGHT_STATIC_GLASS','DRINK_HERO_2_CRIMSON_PULSE_GLASS','DRINK_HERO_3_CLEAR_CUT_GLASS','DRINK_HERO_COUPE_GLASS','DRINK_HERO_TUMBLER_GLASS'];
 if(heroGlassGuids.length!==heroNames.length)throw new Error('D052 requires five original-size hero glass templates');
 const heroMeshes=new Map<string,AssetHandle<'mesh'>>();
 for(let i=0;i<heroNames.length;i++){const h=(await assets.load(assets.parseGuid(heroGlassGuids[i]),'mesh')).unwrap();retained.push(h);heroMeshes.set(heroNames[i],h);}
 for(const row of world.query({read:[Name,MeshFilter,MeshRenderer]}).unwrap()){
  const name=row.get(Name).value;if(!name.startsWith('DRINK_')||!name.endsWith('_GLASS'))continue;
  const originalMesh=row.get(MeshFilter).assetHandle,mesh=heroMeshes.get(name)??originalMesh,source=assets.read(mesh).unwrap() as MeshAsset,before=Array.from(row.get(MeshRenderer).materials);
  glassSaved.push({entity:row.entity,materials:before,mesh:originalMesh});if(mesh!==originalMesh)world.set(row.entity,MeshFilter,{assetHandle:mesh}).unwrap();world.set(row.entity,MeshRenderer,{materials:source.materialSlots.map(()=>heroMeshes.has(name)?refractive:shell)}).unwrap();
 }
 let enabled=true,animate=true,updates=0,last=-1,lastSelection=-1,maxDisplacement=0,lastError:unknown=null,disturbanceTime=-100,drive=1;
 const active=new Set<LiquidRow>();
 const release=(row:LiquidRow)=>{if(!row.mesh)return;world.set(row.entity,MeshFilter,{assetHandle:row.staticMesh}).unwrap();world.set(row.entity,MeshRenderer,{materials:row.source.materialSlots.map(()=>row.material)}).unwrap();assets.release(row.mesh).unwrap();row.mesh=undefined;row.pos=undefined;row.normal=undefined;row.tangent=undefined;row.uv1=undefined;active.delete(row);};
 const activate=(row:LiquidRow)=>{
  row.mesh=assets.create(row.source).unwrap();row.pos=new Float32Array(row.source.attributes.position as Float32Array);row.normal=new Float32Array(row.source.attributes.normal as Float32Array);
  row.uv1=new Float32Array(row.source.attributes.uv1 as Float32Array);
  if(row.source.attributes.tangent instanceof Float32Array)row.tangent=new Float32Array(row.source.attributes.tangent);
  world.set(row.entity,MeshFilter,{assetHandle:row.mesh}).unwrap();world.set(row.entity,MeshRenderer,{materials:row.source.materialSlots.map(()=>row.material)}).unwrap();active.add(row);
 };
 const tick=()=>{
  if(!enabled||!animate||lastError)return;const t=world.getResource(Time).elapsed;if(t-last<1/24)return;last=t;
  if(t-lastSelection>.35){
   lastSelection=t;const cam=getActiveCamera(world),gt=cam?world.get(cam.entity as EntityHandle,GlobalTransform):undefined;
   if(gt?.ok){const m=gt.value.world,near=rows.map(row=>{const g=world.get(row.entity,GlobalTransform).unwrap().world;return {row,d:Math.hypot(g[12]-m[12],g[13]-m[13],g[14]-m[14])};}).filter(x=>x.d<(active.has(x.row)?4:3.3)).sort((a,b)=>(a.d-(a.row.name.includes('HERO')?.7:0))-(b.d-(b.row.name.includes('HERO')?.7:0))).slice(0,18);const desired=new Set(near.map(x=>x.row));for(const row of [...active])if(!desired.has(row))release(row);for(const row of desired)if(!row.mesh)activate(row);}
  }
  const camera=getActiveCamera(world),cg=camera?world.get(camera.entity as EntityHandle,GlobalTransform):undefined;const cameraWorld=cg?.ok?cg.value.world:undefined;
  maxDisplacement=0;
  for(const row of active){
   const p=row.pos!,n=row.normal!,sourceP=row.source.attributes.position as Float32Array,sourceN=row.source.attributes.normal as Float32Array,sourceT=row.source.attributes.tangent as Float32Array|undefined;
   const amplitude=(row.isOpen?.00055:.00025)*(.8+1.3*drive*Math.exp(-Math.max(0,t-disturbanceTime)*1.4)),r=row.radius,k=1.841/r,omega=Math.sqrt(9.81*k+.072/1000*k*k*k),k3=4.2/r,omega3=Math.sqrt(9.81*k3+.072/1000*k3*k3*k3);
   const c1=Math.cos(omega*t+row.phase),s1=Math.sin(omega*t+row.phase),c2=Math.cos(omega*1.39*t-row.phase),s2=Math.sin(omega*1.39*t-row.phase),c3=Math.cos(omega3*t+row.phase*.7),s3=Math.sin(omega3*t+row.phase*.7);
   // D059: a slow advected surface corrugation, separate from gravity slosh.
   // Phase rates2.1/2.9rad/s transport submillimetre crests across a glass in seconds;
   // this is an authored viscous-flow approximation, not a fluid solver.
   const wA=2.1,wB=2.9,cap=(row.isOpen?.00008:.000025)*(.65+.7*drive*Math.exp(-Math.max(0,t-disturbanceTime)*1.4));
   const ctA=Math.cos(wA*t+row.phase),stA=Math.sin(wA*t+row.phase),ctB=Math.cos(wB*t-row.phase),stB=Math.sin(wB*t-row.phase);
   const vm=row.volume,correction=(amplitude*(vm.a*c1+vm.b*s1+vm.c*c2+vm.d*s2+vm.e*c3+vm.f*s3)+cap*(vm.g*ctA-vm.h*stA+.62*(vm.i*ctB-vm.j*stB)))/vm.den;
   const objectWorld=world.get(row.entity,GlobalTransform).unwrap().world;let localCamera=[0,1,1];if(cameraWorld){const ax=cameraWorld[12]-objectWorld[12],ay=cameraWorld[13]-objectWorld[13],az=cameraWorld[14]-objectWorld[14];localCamera=[objectWorld[0]*ax+objectWorld[1]*ay+objectWorld[2]*az,objectWorld[4]*ax+objectWorld[5]*ay+objectWorld[6]*az,objectWorld[8]*ax+objectWorld[9]*ay+objectWorld[10]*az];}
   for(let i=0;i<p.length;i+=3){
    const x=sourceP[i],y=sourceP[i+1],z=sourceP[i+2],u=x/r,v=z/r,edge=Math.max(0,1-u*u-v*v),fraction=Math.max(0,Math.min(1,(y-(row.top-.008))/.0064)),mask=fraction*fraction*(3-2*fraction),dm=6*fraction*(1-fraction)/.0064;
    const mode=u*c1+v*s1+.28*((u*u-v*v)*c2+2*u*v*s2)+.16*((u*u*u-3*u*v*v)*c3+(3*u*u*v-v*v*v)*s3),capA=Math.sin(6.4*u+3.3*v-wA*t-row.phase),capB=Math.sin(-4.8*u+6.7*v-wB*t+row.phase),capSum=capA+.62*capB,height=amplitude*edge*mode+(cap*capSum-correction)*edge*edge,h=height*mask;
    const dx=(amplitude/r*(-2*u*mode+edge*(c1+.56*(u*c2+v*s2)+.48*(u*u-v*v)*c3+.96*u*v*s3))+4*correction*u*edge/r+cap/r*(-4*u*edge*capSum+edge*edge*(6.4*Math.cos(6.4*u+3.3*v-wA*t-row.phase)-.62*4.8*Math.cos(-4.8*u+6.7*v-wB*t+row.phase))))*mask,dz=(amplitude/r*(-2*v*mode+edge*(s1+.56*(-v*c2+u*s2)-.96*u*v*c3+.48*(u*u-v*v)*s3))+4*correction*v*edge/r+cap/r*(-4*v*edge*capSum+edge*edge*(3.3*Math.cos(6.4*u+3.3*v-wA*t-row.phase)+.62*6.7*Math.cos(-4.8*u+6.7*v-wB*t+row.phase))))*mask,jac=1+dm*height;
    p[i]=x;p[i+1]=y+h;p[i+2]=z;maxDisplacement=Math.max(maxDisplacement,Math.abs(h));
    let nx=sourceN[i]-sourceN[i+1]*dx/jac,ny=sourceN[i+1]/jac,nz=sourceN[i+2]-sourceN[i+1]*dz/jac,length=Math.hypot(nx,ny,nz);nx/=length;ny/=length;nz/=length;n[i]=nx;n[i+1]=ny;n[i+2]=nz;
    const vx=localCamera[0]-x,vy=localCamera[1]-y-h,vz=localCamera[2]-z,vl=Math.hypot(vx,vy,vz),noV=Math.min(1,Math.abs((vx*nx+vy*ny+vz*nz)/Math.max(vl,1e-6))),topFace=sourceN[i+1]>.6;
    row.uv1![i/3*2]=topFace?.55+.4*Math.min(1,Math.hypot(x,z)/r):.05+.4*noV;row.uv1![i/3*2+1]=topFace?noV:(row.source.attributes.uv1 as Float32Array)[i/3*2+1];
    if(row.tangent&&sourceT){const j=i/3*4,tx0=sourceT[j],ty0=sourceT[j+1]*jac+sourceT[j]*dx+sourceT[j+2]*dz,tz0=sourceT[j+2],dot=tx0*nx+ty0*ny+tz0*nz;let tx=tx0-dot*nx,ty=ty0-dot*ny,tz=tz0-dot*nz;length=Math.hypot(tx,ty,tz);row.tangent[j]=tx/length;row.tangent[j+1]=ty/length;row.tangent[j+2]=tz/length;row.tangent[j+3]=sourceT[j+3];}
   }
   for(const [attribute,values]of [['position',p],['normal',n],['uv1',row.uv1!],...(row.tangent?[['tangent',row.tangent]]:[])] as [ 'position'|'normal'|'tangent'|'uv1',Float32Array][]){const result=assets.writeRange(row.mesh!,{attribute,first:0,values});if(!result.ok){lastError={name:row.name,code:result.error.code,message:result.error.message};return;}}
  }updates++;
 };
 const read=()=>({enabled,animate,objects:rows.length,refinedTemplateMatches:rows.filter(r=>r.template).length,active:active.size,updates,last,maxDisplacementM:maxDisplacement,lastError,activeNames:[...active].map(r=>r.name),model:'Closed native mesh; pinned gravity slosh plus slowly advected submillimetre surface crests, signed-volume correction including ice cutouts; X/Z fixed and volume linear in Y; authored flow approximation, not Navier-Stokes/pouring CFD',optics:'D053 native depth-textured liquid (measured column / finite chord approximation), color by Beer absorption;  officially cooked Standard PBR reflection-only Fresnel shell, no diffuse whitening; no exterior refraction/caustic claim',thinShellContainers:glassSaved.length,refinedHeroGlassMeshes:heroMeshes.size,lod:'At most18 nearby liquids; activate3.3m/release4m; distant bottles remain still'});
 world.insertResource('cyberpunk.liquids',{read,setAnimate:(v:boolean)=>{animate=v;},disturb:(strength=1)=>{if(!Number.isFinite(strength)||strength<0||strength>3)throw new Error('Liquid disturbance0..3');drive=strength;disturbanceTime=world.getResource(Time).elapsed;return read();}});
 return {tick,read,dispose:()=>{enabled=false;for(const row of [...active])release(row);for(const row of glassSaved){world.set(row.entity,MeshRenderer,{materials:row.materials}).unwrap();world.set(row.entity,MeshFilter,{assetHandle:row.mesh}).unwrap();}world.removeResource('cyberpunk.liquids');for(const row of rows){world.set(row.entity,MeshFilter,{assetHandle:row.original}).unwrap();world.set(row.entity,MeshRenderer,{materials:row.originalMaterials}).unwrap();}for(const h of staticMeshes)assets.release(h).unwrap();for(const h of materials)assets.release(h).unwrap();for(const h of retained)assets.release(h).unwrap();}};
}
