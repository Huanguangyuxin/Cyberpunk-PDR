import type {World} from '@forgeax/engine/ecs';
import {SpotLight} from '@forgeax/engine/render';
import {Name,Transform} from '@forgeax/engine/scene';
import {packInterleavedVertexAttributes} from '@forgeax/engine/geometry';
import type {MeshAsset} from '@forgeax/engine/types';
import spec from './pdr-bar-metal.json';

// Shear about the common lower lip so the mount still terminates on the wall.
export function openBarCanopy(mesh:MeshAsset):MeshAsset{
  const {position,normal,tangent}=mesh.attributes;
  if(!(position instanceof Float32Array))throw new Error('Missing canopy positions');
  const p=new Float32Array(position);
  const n=normal instanceof Float32Array?new Float32Array(normal):undefined;
  const t=tangent instanceof Float32Array?new Float32Array(tangent):undefined;
  const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
  for(let i=0;i<p.length;i+=3){
    p[i+1]+=spec.risePerMetre*(p[i]-spec.frontX);
    for(let j=0;j<3;j++){lo[j]=Math.min(lo[j],p[i+j]);hi[j]=Math.max(hi[j],p[i+j]);}
    if(n){
      n[i]-=spec.risePerMetre*n[i+1];
      const len=Math.hypot(n[i],n[i+1],n[i+2])||1;
      for(let j=0;j<3;j++)n[i+j]/=len;
    }
    if(t){
      const off=i/3*4;
      t[off+1]+=spec.risePerMetre*t[off];
      const len=Math.hypot(t[off],t[off+1],t[off+2])||1;
      for(let j=0;j<3;j++)t[off+j]/=len;
    }
  }
  const attributes={...mesh.attributes,position:p,...(n?{normal:n}:{}),...(t?{tangent:t}:{})};
  return {...mesh,attributes,vertices:packInterleavedVertexAttributes(attributes,p.length/3).unwrap().vertices,
    aabb:new Float32Array([...lo,...hi])};
}

export function installBarMetalStrips(world:World){
  const accents=spec.spots.map(s=>{
    const offset=s.target.map((v,i)=>v-s.pos[i]);
    const length=Math.hypot(...offset);
    return world.spawn(
      {component:Name,data:{value:'PDR/bar local reflector/'+s.name}},
      {component:Transform,data:{pos:s.pos}},
      {component:SpotLight,data:{color:s.color,direction:offset.map(v=>v/length),
        innerConeDeg:s.inner,outerConeDeg:s.outer,intensity:s.intensity,range:s.range}}
    ).unwrap();
  });
  return {dispose:()=>{for(const e of accents)world.despawn(e).unwrap();}};
}
