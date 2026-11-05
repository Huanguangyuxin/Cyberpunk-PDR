import type {MeshAsset} from '@forgeax/engine/types';
import {packInterleavedVertexAttributes} from '@forgeax/engine/geometry';
export function createBoothGrid(mesh:MeshAsset){
 if(!mesh.aabb)throw new Error('R8 screen source requires finite bounds');
 const slot=mesh.materialSlots.findIndex(m=>m.slotName==='M_PERF_STEEL');
 const section=mesh.submeshes.find(s=>s.materialSlot===slot);
 if(slot!==10||!section||section.indexCount!==72)throw new Error('D039 recipe expects the unchanged R8 two-box booth screen');
 const old=mesh.indices,p0=mesh.attributes.position,n0=mesh.attributes.normal,u0=mesh.attributes.uv,t0=mesh.attributes.tangent;
 if(!(old instanceof Uint16Array||old instanceof Uint32Array)||!(p0 instanceof Float32Array)||!(n0 instanceof Float32Array)||!(u0 instanceof Float32Array)||!(t0 instanceof Float32Array))throw new Error('R8 CPU attributes required');
 const positions=Array.from(p0),normals=Array.from(n0),uv=Array.from(u0),tangents=Array.from(t0);
 const keyToId=new Map<string,number>(),points:number[][]=[],parent:number[]=[];
 const root=(a:number):number=>{while(parent[a]!==a)a=parent[a];return a;};
 const weld=(i:number):number=>{const v=Array.from(p0.slice(i*3,i*3+3)),key=v.map(x=>x.toFixed(6)).join(',');let id=keyToId.get(key);if(id===undefined){id=points.length;keyToId.set(key,id);points.push(v);parent.push(id);}return id;};
 for(let i=section.indexOffset;i<section.indexOffset+section.indexCount;i+=3){const ids=[weld(old[i]),weld(old[i+1]),weld(old[i+2])];parent[root(ids[1])]=root(ids[0]);parent[root(ids[2])]=root(ids[0]);}
 const sets=new Map<number,number[][]>();for(let i=0;i<points.length;i++){const r=root(i);if(!sets.has(r))sets.set(r,[]);sets.get(r)!.push(points[i]);}
 if(sets.size!==2)throw new Error('Expected two disconnected closed screen plates');
 const newIndices:number[]=[];
 function box(lo:readonly number[],hi:readonly number[]){
  const [a,b,c]=lo,[d,e,f]=hi;
  const faces=[[[a,b,f],[d,b,f],[d,e,f],[a,e,f]],[[d,b,c],[a,b,c],[a,e,c],[d,e,c]],[[d,b,f],[d,b,c],[d,e,c],[d,e,f]],[[a,b,c],[a,b,f],[a,e,f],[a,e,c]],[[a,e,f],[d,e,f],[d,e,c],[a,e,c]],[[a,b,c],[d,b,c],[d,b,f],[a,b,f]]];
  for(const q of faces){const base=positions.length/3,U=q[1].map((x,i)=>x-q[0][i]),V=q[3].map((x,i)=>x-q[0][i]);const lu=Math.hypot(...U),lv=Math.hypot(...V),T=U.map(x=>x/lu),B=V.map(x=>x/lv),N=[T[1]*B[2]-T[2]*B[1],T[2]*B[0]-T[0]*B[2],T[0]*B[1]-T[1]*B[0]];
   q.forEach((v,i)=>{positions.push(...v);normals.push(...N);tangents.push(...T,1);uv.push(i===1||i===2?lu:0,i>=2?lv:0);});newIndices.push(base,base+1,base+2,base,base+2,base+3);}
 }
 const panelBounds:{lo:number[];hi:number[];thickness:number;pitch:number;web:number;holes:number[]}[]=[];const pitch=.045,web=.004;
 for(const points of sets.values()){
  const lo=[0,1,2].map(a=>Math.min(...points.map(p=>p[a]))),hi=[0,1,2].map(a=>Math.max(...points.map(p=>p[a]))),size=hi.map((v,i)=>v-lo[i]),thin=size.indexOf(Math.min(...size)),axes=[0,1,2].filter(a=>a!==thin),A=axes[0],B=axes[1];
  if(size[thin]>.004||size[A]<.1||size[B]<.1)throw new Error('Expected thin unscaled source sheet');
  const divisions=(a:number)=>{const n=Math.max(1,Math.round((hi[a]-lo[a])/pitch));return Array.from({length:n+1},(_,i)=>{const c=lo[a]+(hi[a]-lo[a])*i/n;return [i===0?lo[a]:c-web/2,i===n?hi[a]:c+web/2];});};
  const as=divisions(A),bs=divisions(B);
  for(const a of as){const l=lo.slice(),h=hi.slice();l[A]=a[0];h[A]=a[1];box(l,h);}
  for(let i=0;i<as.length-1;i++)for(const b of bs){const l=lo.slice(),h=hi.slice();l[A]=as[i][1];h[A]=as[i+1][0];l[B]=b[0];h[B]=b[1];box(l,h);}
  panelBounds.push({lo,hi,thickness:size[thin],pitch,web,holes:[as.length-1,bs.length-1]});
 }
 const indices:number[]=[],submeshes:MeshAsset['submeshes'][number][]=[];let otherSectionsUnchanged=true;
 for(const s of mesh.submeshes){const values=s.materialSlot===slot?newIndices:Array.from(old.slice(s.indexOffset,s.indexOffset+s.indexCount));submeshes.push({...s,indexOffset:indices.length,indexCount:values.length,...(s.materialSlot===slot?{vertexCount:positions.length/3-p0.length/3}:{})});indices.push(...values);if(s.materialSlot!==slot)otherSectionsUnchanged&&=values.every((v,i)=>v===old[s.indexOffset+i]);}
 const p=new Float32Array(positions);
 const attributes={position:p,normal:new Float32Array(normals),uv:new Float32Array(uv),tangent:new Float32Array(tangents)};
 const packed=packInterleavedVertexAttributes(attributes,p.length/3).unwrap();
 return {mesh:{kind:'mesh' as const,vertices:packed.vertices,attributes,indices:new Uint32Array(indices),aabb:new Float32Array(mesh.aabb),submeshes,materialSlots:mesh.materialSlots},stats:{method:'Real welded rectangular steel grid in original closed3mm screen envelopes; no alpha MASK, no billboard',panelBounds,newTriangles:newIndices.length/3,oldScreenTriangles:24,totalTriangles:indices.length/3,otherSectionsUnchanged,sourceBounds:Array.from(mesh.aabb),boundsPreserved:true}};
}
