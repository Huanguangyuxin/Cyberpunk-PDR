import type {World} from '@forgeax/engine/ecs';
import type {AssetRegistry} from '@forgeax/engine/assets-runtime';
import {packInterleavedVertexAttributes} from '@forgeax/engine/geometry';
import {Materials,MeshFilter,MeshRenderer} from '@forgeax/engine/render';
import {Name,Transform} from '@forgeax/engine/scene';
import type {createStreamGeometry} from './pdr-cobalt-stream-geometry';

type Collector=ReturnType<typeof createStreamGeometry>['collector'];
type Strip=Collector['strips'][number];

export function collectorMaterial(){
  const optics=Materials.standard({baseColor:[0,0,0,1],roughness:.45,specular:0});
  if(!optics.parameters||!optics.values)throw new Error('Collector surface needs standard material parameters');
  const material=Materials.standard({
    surfaceModule:'cyberpunk_pdr::cobalt_collector',parameters:optics.parameters,values:{...optics.values,alphaMode:0},
    renderState:{cullMode:'back',depthWriteEnabled:false,blend:{
      color:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'},
      alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'},
    }},
  });
  const forward=material.passes!.find(pass=>pass.name==='forward');
  if(!forward)throw new Error('Collector requires a forward pass');
  return {...material,passes:[forward] as const};
}

// World-space contact line, using the same mitres as the fabricated metal.
function frameAt(strip:Strip,local:number,depth:number){
  const s=strip.segment,station=strip.left+local,t=station/s.length;
  return [s.x+station*s.tx+depth*(strip.start[0]+t*(strip.end[0]-strip.start[0])),
          s.z+station*s.tz+depth*(strip.start[1]+t*(strip.end[1]-strip.start[1]))];
}
const hash=(seed:number)=>{const x=Math.sin(seed*91.75+4.67)*47453.73;return x-Math.floor(x);};

export async function installCollector(world:World,assets:AssetRegistry,film:Collector,guid:string){
  const material=(await assets.load(assets.parseGuid(guid),'material')).unwrap();
  const positions:number[]=[],normals:number[]=[],tex:number[]=[],indices:number[]=[];
  function vertex(x:number,y:number,z:number,nx:number,ny:number,nz:number,u:number,v:number){
    const id=positions.length/3;
    positions.push(x,y,z);normals.push(nx,ny,nz);tex.push(u,v);return id;
  }
  const ribbons=film.strips.map(strip=>{
    const first=positions.length/3;
    for(let i=0;i<=strip.flux.length;i++){
      for(const [depth,y,v] of [[.0244,.29388,0],[.034,.28702,.36],[.044,.27987,.74],[.05085,.27498,1]]){
        const [x,z]=frameAt(strip,i*strip.dx,depth);
        vertex(x,y,z,.582*strip.segment.nx,.813,.582*strip.segment.nz,i*strip.dx,v);
      }
      if(i>0){
        const j=first+(i-1)*4;
        for(let k=0;k<3;k++)indices.push(j+k,j+k+1,j+k+4,j+k+4,j+k+1,j+k+5);
      }
    }
    return {strip,first};
  });
  // Build one indexed bubble shell template. Each impact releases a few
  // differently sized air bubbles into the 15 mm wide receiving channel.
  const rings=5,sides=10;
  const shells=film.strips.flatMap((strip,section)=>strip.pockets.flatMap((pocket,i)=>
    Array.from({length:3},(_,member)=>{
      const first=positions.length/3;
      const seed=section*211+i*7+member;
      for(let j=0;j<=rings;j++)for(let k=0;k<sides;k++){
        const phi=Math.PI*j/rings,theta=2*Math.PI*k/sides;
        vertex(0,0,0,Math.sin(phi)*Math.cos(theta),Math.cos(phi),Math.sin(phi)*Math.sin(theta),0,2);
        if(j<rings){
          const a=first+j*sides+k,b=first+j*sides+(k+1)%sides;
          indices.push(a,b,a+sides,b,b+sides,a+sides);
        }
      }
      return {strip,pocket,member,first,seed};
    })
  ));
  const position=new Float32Array(positions),normal=new Float32Array(normals),uv=new Float32Array(tex);
  const vertexCount=position.length/3,tangent=new Float32Array(vertexCount*4),uv1=new Float32Array(uv.length);
  for(let i=0;i<vertexCount;i++){
    const x=normal[i*3],z=normal[i*3+2],length=Math.hypot(x,z);
    tangent.set(length>1e-6?[z/length,0,-x/length,1]:[1,0,0,1],i*4);
  }
  let last=-1,liveBubbles=0,brightCells=0,peakDischarge=0;
  function update(){
    const t=film.seconds;
    last=t;liveBubbles=0;brightCells=0;peakDischarge=0;
    for(const {strip,first} of ribbons){
      for(let i=0;i<=strip.flux.length;i++){
        const a=Math.max(0,i-1),b=Math.min(strip.flux.length-1,i);
        const q=(strip.flux[a]+strip.flux[b])*.5;
        // Cubic ramp rejects residual dampness. Concentration belongs only
        // to portions of the bed currently receiving kinetic energy.
        const f=Math.max(0,Math.min(1,(q-.00009)/.00115));
        const energy=f*f*(3-2*f);
        if(energy>.2)brightCells++;
        peakDischarge=Math.max(peakDischarge,q);
        for(let k=0;k<4;k++)uv1.set([energy,t%4096],(first+i*4+k)*2);
      }
    }
    for(const {strip,pocket,member,first,seed} of shells){
      const key=seed+23*pocket.serial,age=t-pocket.birth-member*.055;
      const life=.32+.34*hash(key+1),f=age/life;
      const alive=age>=0&&age<life&&pocket.serial>0;
      const radius=alive?(.00125+.00215*hash(key+2))*Math.min(1,age/.035,(life-age)/.07):0;
      if(radius>0)liveBubbles++;
      const u=Math.max(.001,Math.min(strip.flux.length*strip.dx-.001,pocket.impactX+
        (hash(key+3)-.5)*.012+Math.max(0,Math.min(1,f))*(.006+.021*hash(key+4))));
      const [x,z]=frameAt(strip,u,.034+hash(key+5)*.009);
      const y=.2868+.0092*Math.min(1,Math.max(0,f)*2.1);
      for(let k=0;k<(rings+1)*sides;k++){
        const o=(first+k)*3;
        position[o]=x+normal[o]*radius;position[o+1]=y+normal[o+1]*radius*.82;
        position[o+2]=z+normal[o+2]*radius;
      }
    }
  }
  update();
  const attributes={position,normal,tangent,uv,uv1};
  const vertices=packInterleavedVertexAttributes(attributes,vertexCount).unwrap().vertices;
  const aabb=new Float32Array([9.97,.273,-13.72,13.24,.302,-3.72]);
  const meshResult=assets.create({kind:'mesh',attributes,vertices,indices:new Uint32Array(indices),aabb,
    submeshes:[{indexOffset:0,indexCount:indices.length,vertexCount,topology:'triangle-list',materialSlot:0}],
    materialSlots:[{slotName:'Return channel',defaultMaterial:material}]});
  if(!meshResult.ok){assets.release(material).unwrap();throw meshResult.error;}
  const mesh=meshResult.unwrap();
  const entity=world.spawn({component:Name,data:{value:'PDR/Bar/Return channel impact light and bubbles'}},
    {component:Transform,data:{}},{component:MeshFilter,data:{assetHandle:mesh}},
    {component:MeshRenderer,data:{materials:[material]}}).unwrap();
  return {
    tick:()=>{
      if(last===film.seconds)return;
      update();
      assets.writeRange(mesh,[{attribute:'position',first:0,values:position},{attribute:'uv1',first:0,values:uv1}]).unwrap();
    },
    read:()=>({liveBubbles,brightCells,peakDischargeM2s:peakDischarge}),
    dispose:()=>{world.despawn(entity).unwrap();assets.release(mesh).unwrap();assets.release(material).unwrap();},
  };
}
