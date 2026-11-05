/** D050: batched lit 3D droplets; analytical gravity/linear drag/wind, no billboard. */
import {Time,type World} from '@forgeax/engine/ecs';
import type {AssetRegistry} from '@forgeax/engine/assets-runtime';
import type {MeshAsset,AssetHandle} from '@forgeax/engine/types';
import {Name,Transform} from '@forgeax/engine/scene';
import {MeshFilter,MeshRenderer,Materials,Visibility,VisibilityStateValue} from '@forgeax/engine/render';
import {packInterleavedVertexAttributes} from '@forgeax/engine/geometry';
const COUNT=80;
function rand(i:number){let n=Math.imul(i+31,374761393);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;}
export async function installWaterDroplets(world:World,assets:AssetRegistry,guid:string){
 const prototype=(await assets.load(assets.parseGuid(guid),'mesh')).unwrap(),source=assets.read(prototype).unwrap() as MeshAsset;
 const sp=source.attributes.position as Float32Array,sn=source.attributes.normal as Float32Array,sv=sp.length/3,si=source.indices!;
 let radius=0;for(let i=0;i<sp.length;i+=3)radius=Math.max(radius,Math.hypot(sp[i],sp[i+1],sp[i+2]));
 const mat=assets.create(Materials.standard({baseColor:[.98,.995,1,1],metallic:0,roughness:.012,transmission:1,ior:1.333,thickness:.0024,attenuationColor:[.98,.995,1],attenuationDistance:1,specular:1,renderState:{cullMode:'back'}})).unwrap();
 const batches=[-1,1].map(side=>{
  const position=new Float32Array(sp.length*COUNT),normal=new Float32Array(sn.length*COUNT),tangent=new Float32Array(sv*COUNT*4),uv=new Float32Array(sv*COUNT*2),indices=new Uint32Array(si.length*COUNT);
  for(let k=0;k<COUNT;k++)for(let i=0;i<si.length;i++)indices[k*si.length+i]=si[i]+k*sv;
  const attributes={position,normal,tangent,uv};
  const sourceUV=source.attributes.uv as Float32Array;for(let k=0;k<COUNT;k++)if(sourceUV)uv.set(sourceUV,k*sv*2);
  for(let k=0;k<COUNT;k++)for(let v=0;v<sv;v++){const i=k*sp.length+v*3;position[i]=side*4.3+sp[v*3];position[i+1]=.64+sp[v*3+1];position[i+2]=-38+sp[v*3+2];normal.set(sn.subarray(v*3,v*3+3),i);const nx=sn[v*3],ny=sn[v*3+1],nz=sn[v*3+2],ref=Math.abs(ny)<.9?[0,1,0]:[1,0,0],dot=ref[0]*nx+ref[1]*ny;const tx=ref[0]-dot*nx,ty=ref[1]-dot*ny,tz=-dot*nz,length=Math.hypot(tx,ty,tz);tangent.set([tx/length,ty/length,tz/length,1],(k*sv+v)*4);}
  const vertices=packInterleavedVertexAttributes(attributes,sv*COUNT).unwrap().vertices;
  const mesh=assets.create({kind:'mesh',attributes,vertices,indices,aabb:new Float32Array([side*4.3-.002,.638,-38.002,side*4.3+.002,.642,-37.998]),submeshes:[{indexOffset:0,indexCount:indices.length,vertexCount:sv*COUNT,topology:'triangle-list',materialSlot:0}],materialSlots:[{slotName:'WATER_DROPLET',defaultMaterial:mat}]}).unwrap();
  const entity=world.spawn({component:Name,data:{value:'PDR/SPRAY_'+(side<0?'W':'E')+'/lit-water-droplets'}},{component:Transform,data:{}},{component:MeshFilter,data:{assetHandle:mesh}},{component:MeshRenderer,data:{materials:[mat]}},{component:Visibility,data:{state:VisibilityStateValue.hidden}}).unwrap();
  return {side,position,normal,tangent,mesh,entity};
 });
 let enabled=false,animate=true,last=-1,updates=0,liveCount=0,impacts=0,lastError:unknown=null;
 const wasAlive=new Uint8Array(COUNT*2);
 const tick=()=>{
  if(!enabled||!animate||lastError)return;const t=world.getResource(Time).elapsed;if(t-last<1/24)return;last=t;liveCount=0;
  for(let b=0;b<batches.length;b++){
   const row=batches[b],side=row.side;
   for(let k=0;k<COUNT;k++){
    const seed=k+117*b,life=3.3+.65*rand(seed+29),age=(t+rand(seed)*life)%life,drag=1.45,g=9.81,terminal=g/drag,e=Math.exp(-drag*age),f=(1-e)/drag;
    const up=16.5+3*rand(seed+13),vx=(rand(seed+3)-.5)*1.6,vz=1.8+1.3*rand(seed+7),wx=-side*.18,wz=2.7;
    const X=side*4.3+vx*f+wx*(age-f),Y=.644+(up+terminal)*f-terminal*age,Z=-38+vz*f+wz*(age-f);
    const alive=Y>.004;if(alive)liveCount++;else if(wasAlive[b*COUNT+k])impacts++;wasAlive[b*COUNT+k]=alive?1:0;
    const velocity=[wx+(vx-wx)*e,(up+terminal)*e-terminal,wz+(vz-wz)*e],speed=Math.hypot(...velocity),ay=velocity.map(v=>v/speed);
    let ax=[ay[2],0,-ay[0]],length=Math.hypot(...ax);ax=ax.map(v=>v/length);const az=[ax[1]*ay[2]-ax[2]*ay[1],ax[2]*ay[0]-ax[0]*ay[2],ax[0]*ay[1]-ax[1]*ay[0]];
    const r=.00045+.0011*rand(seed+41),stretch=1+Math.min(.65,speed*.045),cy=alive?Y:-.5;
    for(let v=0;v<sv;v++){
     const j=v*3,i=k*sp.length+j,x=sp[j]/radius,y=sp[j+1]/radius,z=sp[j+2]/radius;
     row.position[i]=X+r*(ax[0]*x+ay[0]*y*stretch+az[0]*z);row.position[i+1]=cy+r*(ax[1]*x+ay[1]*y*stretch+az[1]*z);row.position[i+2]=Z+r*(ax[2]*x+ay[2]*y*stretch+az[2]*z);
     const nx=sn[j],ny=sn[j+1]/stretch,nz=sn[j+2];let a=ax[0]*nx+ay[0]*ny+az[0]*nz,c=ax[1]*nx+ay[1]*ny+az[1]*nz,d=ax[2]*nx+ay[2]*ny+az[2]*nz;length=Math.hypot(a,c,d);a/=length;c/=length;d/=length;row.normal[i]=a;row.normal[i+1]=c;row.normal[i+2]=d;
     const useY=Math.abs(c)<.9,dot=useY?c:a,tx=(useY?0:1)-dot*a,ty=(useY?1:0)-dot*c,tz=-dot*d;length=Math.hypot(tx,ty,tz);const ti=(k*sv+v)*4;row.tangent[ti]=tx/length;row.tangent[ti+1]=ty/length;row.tangent[ti+2]=tz/length;row.tangent[ti+3]=1;
    }
   }
   for(const [attribute,values]of [['position',row.position],['normal',row.normal],['tangent',row.tangent]] as const){const r=assets.writeRange(row.mesh,{attribute,first:0,values});if(!r.ok){lastError={code:r.error.code,message:r.error.message};return;}}
  }updates++;
 };
 const read=()=>({enabled,animate,updates,last,liveCount,impacts,lastError,capacity:COUNT*2,nativeMeshBatches:2,verticesPerDrop:sv,radiusM:[.00045,.00155],gravityMps2:9.81,dragPerSecond:1.45,windMps:[.18,0,2.7],ior:1.333,emission:0,groundContact:'Analytic Y=0 termination within central open landing strip, not full scene collision or two-phase CFD',classification:'Real closed3D meshes, native dielectric PBR/transmission; gravity/drag/wind trajectories; submillimetre unresolved spray remains volume fog'});
 world.insertResource('cyberpunk.droplets',{read,setAnimate:(v:boolean)=>{animate=v;},setEnabled:(v:boolean)=>{enabled=v;for(const b of batches)world.set(b.entity,Visibility,{state:v?VisibilityStateValue.inherited:VisibilityStateValue.hidden}).unwrap();}});
 return {tick,read,dispose:()=>{enabled=false;world.removeResource('cyberpunk.droplets');for(const b of batches){world.despawn(b.entity).unwrap();assets.release(b.mesh).unwrap();}assets.release(mat).unwrap();assets.release(prototype).unwrap();}};
}
