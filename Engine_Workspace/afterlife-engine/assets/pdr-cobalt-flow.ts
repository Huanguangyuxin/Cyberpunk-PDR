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

// Art-directed optical travel scales the measured millimetre film to a visible
// displacement in the 1440px inspection view. Geometry stays at surveyed depth.
const maxOpticalTravel=.075;
const opticalTravelGain=18;
function filmDepthCoordinates(streams:ReturnType<typeof createStreamGeometry>){
  const uv=new Float32Array(streams.uv.length);
  const count=uv.length/2;
  const limits=new Float32Array(count),nx=new Float32Array(count),nz=new Float32Array(count);
  const cornerLength=Math.hypot(.305,.48),endOfBevel=9.44+cornerLength;
  for(let i=0;i<count;i++){
    const path=streams.uv[2*i],height=streams.position[3*i+1];
    const long=path<9.44,corner=!long&&path<endOfBevel;
    nx[i]=long?-1:corner?-.48/cornerLength:0;nz[i]=long?0:corner?.305/cornerLength:1;
    const width=long?9.44/8:corner?cornerLength:2.89/3;
    const local=(path-(long?0:corner?9.44:endOfBevel))%width;
    // Bound the sample at seals and retainers: projecting a longer path can
    // otherwise pull metal trim into a neighbouring pane at grazing angles.
    limits[i]=Math.min(maxOpticalTravel,Math.max(0,Math.min(local-.017,width-.017-local,height-.287,.923-height))*.92);
    uv[2*i+1]=.5;
  }
  const update=()=>{
    for(let i=0;i<count;i++){
      const d=3*i;
      const depth=(streams.position[d]-streams.backingPosition[d])*nx[i]+(streams.position[d+2]-streams.backingPosition[d+2])*nz[i];
      const travel=Math.min(limits[i],Math.max(0,depth-.00012)*opticalTravelGain);
      uv[i*2]=(.5+255*travel/maxOpticalTravel)/256;
    }
  };
  update();
  return {uv,update};
}

export function cobaltWaterMaterial() {
  const optics=Materials.standard({
    staticSwitches:{diffuseTransmission:true},
    baseColor:[1,1,1,1],metallic:0,roughness:.09,specular:1,ior:1.333,
    transmission:1,thickness:maxOpticalTravel,attenuationColor:[.96,.985,.995],attenuationDistance:.8,
    diffuseTransmission:1,diffuseTransmissionColor:[0,0,0],
    renderState:{cullMode:'back',depthWriteEnabled:false},
  });
  const sheet=Materials.standard({surfaceModule:'cyberpunk_pdr::cobalt_water',colorSpace:'linear',
    parameters:[...optics.parameters!,{name:'thicknessTexture',type:'texture',optional:true},{name:'flowTimeOverride',type:'f32',default:-1}],
    values:Object.fromEntries(Object.entries(optics.values!).filter((entry): entry is [string,NonNullable<typeof entry[1]>]=>entry[1]!==null)),staticSwitches:optics.staticSwitches,
    renderState:{cullMode:'back',depthWriteEnabled:false}});
  // Transmission reads the opaque backing and is resolved in Forward.
  const forward=sheet.passes!.find(pass=>pass.name==='forward');
  if(!forward)throw new Error('Water transmission requires the native forward pass');
  return {...sheet,passes:[forward] as const};
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
    const glass=(await assets.load(assets.parseGuid(glassGuid),'material')).unwrap();
    try {
      const sheet=assets.copy(template).unwrap();
      const pixels=new Uint8Array(256*4);
      for(let i=0;i<256;i++)pixels.set([0,i,0,255],i*4);
      const ramp=assets.create({kind:'texture',shape:{viewDimension:'2d',extent:{width:256,height:1}},
        format:'rgba8unorm',data:pixels,colorSpace:'linear',mips:{kind:'none'}});
      if(!ramp.ok){assets.release(sheet).unwrap();throw ramp.error;}
      const depthTexture=ramp.unwrap();
      try {
        const values={...assets.read(sheet).unwrap().values,thicknessTexture:{texture:depthTexture,coordinates:{set:1 as const}}};
        assets.update(sheet,{values}).unwrap();
        const streams=createStreamGeometry(true);
        const opticalDepth=filmDepthCoordinates(streams);
        const vertexCount=streams.position.length/3;
        // Probe captures use the shared standard vertex ABI, including the
        // tangent and second UV even when the clear water has no normal map.
        const tangent=new Float32Array(vertexCount*4);
        for(let v=0;v<vertexCount;v++){
          const nx=streams.normal[v*3],nz=streams.normal[v*3+2],length=Math.hypot(nx,nz)||1;
          tangent[v*4]=nz/length;tangent[v*4+2]=-nx/length;tangent[v*4+3]=1;
        }
        const attributes={position:streams.position,normal:streams.normal,tangent,uv:streams.uv,uv1:opticalDepth.uv};
        const vertices=packInterleavedVertexAttributes(attributes,vertexCount).unwrap().vertices;
        const mesh=assets.create({kind:'mesh',attributes,vertices,indices:streams.indices,aabb:streams.aabb,
          submeshes:[{indexOffset:0,indexCount:streams.indices.length,vertexCount,topology:'triangle-list',materialSlot:0}],
          materialSlots:[{slotName:water.slotName,defaultMaterial:sheet}]}).unwrap();
        let last=-1,updates=0,phase=-1;
        const refresh=(time:number)=>{
          streams.update(time);
          opticalDepth.update();
          assets.writeRange(mesh,[{attribute:'position',first:0,values:streams.position},
            {attribute:'normal',first:0,values:streams.normal},{attribute:'uv1',first:0,values:opticalDepth.uv}]).unwrap();
          updates++;
        };
        const install=(layer:typeof water,material:typeof sheet)=>{
          const slots=Array.from(layer.materials);
          slots[layer.slot]=material;
          world.set(layer.entity,MeshRenderer,{materials:slots}).unwrap();
        };
        const current=(layer:typeof water)=>world.get(layer.entity,MeshRenderer).unwrap().materials[layer.slot]||layer.imported;
        const restore=(layer:typeof water)=>world.set(layer.entity,MeshRenderer,{materials:layer.materials}).unwrap();
        install(water,sheet);
        try { install(cover,glass); }
        catch(error){restore(water);throw error;}
        world.set(water.entity,MeshFilter,{assetHandle:mesh}).unwrap();
        return {
          collector:streams.collector,
          tick:()=>{
            const clock=world.getResource(Time),now=clock.elapsed;
            if(phase>=0||now-last<(clock.delta>.060?1/12:1/20))return;
            last=now;refresh(now);
          },
          setInlet:(open:boolean)=>streams.setInlet(open),
          toggleInlet:()=>streams.setInlet(!streams.inspect().inletOpen),
          read:(seconds:number)=>({
            transport:streams.inspect(),
            refraction:{nativeProjectedBackdrop:true,opticalTravelGain,maxOpticalTravelM:maxOpticalTravel},
            node:water.name,bays:streams.bays,ribbons:streams.ribbons,vertices:vertexCount,updates,mesh,material:sheet,active:current(water)===sheet&&current(cover)===glass&&current(backing)===backing.imported,
            layers:[{node:backing.name,slot:backing.slotName,material:current(backing),optics:'static cobalt backing'},
              {node:water.name,slot:water.slotName,material:current(water),optics:'conservative gravity-driven contact film; native transmission and specular reflection, IOR 1.333'},
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
            assets.update(sheet,{values:{...values,flowTimeOverride:phase}}).unwrap();
            refresh(phase<0?world.getResource(Time).elapsed:phase);
          },
          dispose:()=>{world.set(water.entity,MeshFilter,{assetHandle:water.mesh}).unwrap();restore(cover);restore(water);assets.release(mesh).unwrap();assets.release(sheet).unwrap();assets.release(depthTexture).unwrap();assets.release(glass).unwrap();},
        };
      } catch(error){assets.release(sheet).unwrap();assets.release(depthTexture).unwrap();throw error;}
    } catch(error){assets.release(glass).unwrap();throw error;}
  } finally { assets.release(template).unwrap(); }
}
