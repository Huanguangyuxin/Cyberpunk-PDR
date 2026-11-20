import type {World} from '@forgeax/engine/ecs';
import type {AssetRegistry} from '@forgeax/engine/assets-runtime';
import {packInterleavedVertexAttributes} from '@forgeax/engine/geometry';
import {Materials,MeshFilter,MeshRenderer} from '@forgeax/engine/render';
import {Name,Transform} from '@forgeax/engine/scene';
import {createTankGeometry,type createStreamGeometry} from './pdr-cobalt-stream-geometry';

type Collector=ReturnType<typeof createStreamGeometry>['collector'];


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

export async function installCollector(world:World,assets:AssetRegistry,film:Collector,guid:string){
  const material=(await assets.load(assets.parseGuid(guid),'material')).unwrap();
  const {position,normal,uv,indices}=createTankGeometry(film);
  const vertexCount=position.length/3,tangent=new Float32Array(vertexCount*4);
  for(let i=0;i<vertexCount;i++){
    const x=normal[i*3],z=normal[i*3+2],length=Math.hypot(x,z);
    tangent.set(length>1e-6?[z/length,0,-x/length,1]:[1,0,0,1],i*4);
  }
  const attributes={position,normal,tangent,uv,uv1:new Float32Array(uv.length)};
  const vertices=packInterleavedVertexAttributes(attributes,vertexCount).unwrap().vertices;
  const aabb=new Float32Array([9.63,.273,-13.72,13.24,film.level+.004,-3.70]);
  const meshResult=assets.create({kind:'mesh',attributes,vertices,indices:indices,aabb,
    submeshes:[{indexOffset:0,indexCount:indices.length,vertexCount,topology:'triangle-list',materialSlot:0}],
    materialSlots:[{slotName:'Water cassettes',defaultMaterial:material}]});
  if(!meshResult.ok){assets.release(material).unwrap();throw meshResult.error;}
  const mesh=meshResult.unwrap();
  const entity=world.spawn({component:Name,data:{value:'PDR/Bar/Full water cassettes and bottom aerators'}},
    {component:Transform,data:{}},{component:MeshFilter,data:{assetHandle:mesh}},
    {component:MeshRenderer,data:{materials:[material]}}).unwrap();
  return {
    read:()=>({standingLitres:film.standingLitres,waterLevelM:film.level,airGapMm:11}),
    dispose:()=>{world.despawn(entity).unwrap();assets.release(mesh).unwrap();assets.release(material).unwrap();},
  };
}
