import type {AssetRegistry} from '@forgeax/engine/assets-runtime';
import {Time,type World} from '@forgeax/engine/ecs';
import {packInterleavedVertexAttributes} from '@forgeax/engine/geometry';
import {createStreamGeometry} from './pdr-cobalt-stream-geometry';
import {Materials,MeshFilter,MeshRenderer,Visibility,VisibilityStateValue} from '@forgeax/engine/render';
import {Name} from '@forgeax/engine/scene';

const layers = {
  backing: ['Cobalt kiln cast modules', 'Rear cobalt'],
  water: ['Y-layer flowing water', 'Cavity water film'],
  cover: ['Y-layer clear glazing', 'Low iron front glazing'],
} as const;

// Submerged air reflects and transmits the cobalt backing through the outer
// glazing. Independent front-facing bubble rims blend over the submerged field.
export function cobaltWaterMaterial(){
  const optics=Materials.standard({baseColor:[0,0,0,1],roughness:.095,specular:.7});
  const surface=Materials.standard({surfaceModule:'cyberpunk_pdr::cobalt_water',
    parameters:optics.parameters!,values:{...optics.values,alphaMode:0},
    renderState:{cullMode:'back',depthWriteEnabled:false,blend:{
      color:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'},
      alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'},
    }}});
  const forward=surface.passes!.find(pass=>pass.name==='forward');
  if(!forward)throw new Error('The aeration interface needs the forward pass');
  return {...surface,passes:[forward] as const};
}

export async function installCobaltFlow(world:World,assets:AssetRegistry,guid:string,glassGuid:string) {
  const scene=Array.from(world.query({read:[Name,MeshFilter,MeshRenderer]}).unwrap(),row=>({
    name:row.get(Name).value,entity:row.entity,mesh:row.get(MeshFilter).assetHandle,materials:Array.from(row.get(MeshRenderer).materials),
  }));
  const find=([name,slotName]: readonly [string,string])=>{
    const found=scene.filter(row=>row.name===name);
    if(found.length!==1)throw new Error('Expected one bar facing layer: '+name);
    const row=found[0],mesh=assets.read(row.mesh).unwrap();
    const slot=mesh.materialSlots.findIndex(entry=>entry.slotName===slotName);
    if(slot<0)throw new Error('Missing bar facing material: '+slotName);
    return {...row,slot,slotName,imported:row.materials[slot]||mesh.materialSlots[slot].defaultMaterial};
  };
  const backing=find(layers.backing),water=find(layers.water),cover=find(layers.cover);
  const template=(await assets.load(assets.parseGuid(guid),'material')).unwrap();
  try {
    const glassTemplate=(await assets.load(assets.parseGuid(glassGuid),'material')).unwrap();
    const glass=(()=>{try{return assets.copy(glassTemplate).unwrap();}finally{assets.release(glassTemplate).unwrap();}})();
    try {
      // This low-iron architectural sheet is 8 mm thick. Its donor is a
      // curved drinking-glass material with millimetre-scale volume tint.
      assets.update(glass,{values:{...assets.read(glass).unwrap().values,
        thickness:.008,ior:1.50,specular:.67,roughness:.035,
        attenuationColor:[.978,.995,1],attenuationDistance:.50}}).unwrap();
      const sheet=assets.copy(template).unwrap();
      try {
        const streams=createStreamGeometry();
        const vertexCount=streams.position.length/3;
        const attributes={position:streams.position,normal:streams.normal,tangent:streams.tangent,uv:streams.uv,uv1:new Float32Array(streams.uv.length)};
        const vertices=packInterleavedVertexAttributes(attributes,vertexCount).unwrap().vertices;
        const mesh=assets.create({kind:'mesh',attributes,vertices,indices:streams.indices,aabb:streams.aabb,
          submeshes:[{indexOffset:0,indexCount:streams.indices.length,vertexCount,topology:'triangle-list',materialSlot:0}],
          materialSlots:[{slotName:water.slotName,defaultMaterial:sheet}]}).unwrap();
        let last=-1,updates=0,phase=-1;
        const refresh=(time:number)=>{
          streams.update(time);
          assets.writeRange(mesh,[{attribute:'position',first:0,values:streams.position}]).unwrap();
          updates++;
        };
        const install=(layer:typeof water,material:typeof sheet)=>{
          const slots=Array.from(layer.materials);
          slots[layer.slot]=material;
          world.set(layer.entity,MeshRenderer,{materials:slots}).unwrap();
        };
        const current=(layer:typeof water)=>world.get(layer.entity,MeshRenderer).unwrap().materials[layer.slot]||layer.imported;
        const restore=(layer:typeof water)=>world.set(layer.entity,MeshRenderer,{materials:layer.materials}).unwrap();
        world.set(water.entity,MeshRenderer,{materials:[sheet]}).unwrap();
        try { install(cover,glass); }
        catch(error){restore(water);throw error;}
        world.set(water.entity,MeshFilter,{assetHandle:mesh}).unwrap();
        return {
          collector:streams.collector,
          tick:()=>{
            const clock=world.getResource(Time),now=clock.elapsed;
            if(phase>=0||now-last<1/30 && now>=last)return;
            last=now;refresh(now);
          },
          read:(seconds:number)=>({
            transport:streams.inspect(),
            
            node:water.name,chambers:streams.chambers,nozzles:streams.nozzles,vertices:vertexCount,updates,mesh,material:sheet,active:world.get(water.entity,MeshRenderer).unwrap().materials[0]===sheet&&current(cover)===glass&&current(backing)===backing.imported,
            layers:[{node:backing.name,slot:backing.slotName,material:current(backing),optics:'static cobalt backing'},
              {node:water.name,slot:water.slotName,material:sheet,optics:'ascending air bubbles inside water; water/air Fresnel interface, relative IOR 1.333'},
              {node:cover.name,slot:cover.slotName,material:current(cover),optics:'8 mm clear geometry with native outer glass refraction and Fresnel reflection'}],
            timeSource:phase<0?'engine elapsed seconds':'diagnostic',timeSeconds:phase<0?seconds:phase,
          }),
          setLayerVisible:(which:'cover'|'water',visible:boolean)=>{
            const layer=which==='cover'?cover:water;
            const data={state:visible?VisibilityStateValue.inherited:VisibilityStateValue.hidden};
            if(world.get(layer.entity,Visibility).ok)world.set(layer.entity,Visibility,data).unwrap();
            else world.addComponent(layer.entity,{component:Visibility,data}).unwrap();
          },
          setPhase:(seconds:number|null)=>{
            if(seconds!==null&&(!Number.isFinite(seconds)||seconds<0))throw new Error('Expected nonnegative seconds or null');
            phase=seconds??-1;
            refresh(phase<0?world.getResource(Time).elapsed:phase);
          },
          dispose:()=>{world.set(water.entity,MeshFilter,{assetHandle:water.mesh}).unwrap();restore(cover);restore(water);assets.release(mesh).unwrap();assets.release(sheet).unwrap();assets.release(glass).unwrap();},
        };
      } catch(error){assets.release(sheet).unwrap();throw error;}
    } catch(error){assets.release(glass).unwrap();throw error;}
  } finally { assets.release(template).unwrap(); }
}
