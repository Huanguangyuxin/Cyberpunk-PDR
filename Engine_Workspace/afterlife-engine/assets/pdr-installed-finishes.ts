import type {AssetRegistry} from '@forgeax/engine/assets-runtime';
import type {EntityHandle, World} from '@forgeax/engine/ecs';
import {MeshFilter, MeshRenderer, Visibility, VisibilityStateValue} from '@forgeax/engine/render';
import {Name, Transform, worldDespawnScene} from '@forgeax/engine/scene';
import type {AssetHandle, MaterialRootAsset} from '@forgeax/engine/types';
import type {ArchitecturalFinish} from './pdr-installed-finish-ids';
import {retilePbr} from './pdr-native-floor-material';
import {installFloorAccents} from './pdr-floor-accents';

import barMetal from './pdr-bar-metal.json';
import {installBarMetalStrips,openBarCanopy} from './pdr-bar-metal';

type FinishBinding = readonly [finish:ArchitecturalFinish, uvScale:number];
type FinishSlots = Readonly<Record<string, FinishBinding>>;
const dryTile = ['dryTile',2] as const;
const brushed = ['brushed',1/.3] as const;
const brushedWall = ['brushed',2/.3] as const;
const tread = ['tread',1/.24] as const;
const satinTile = ['satinTile',2/1.2] as const;
const stairs = {
  D109_STAIR_COATED_STEEL: dryTile,
  D109_STAIR_COATED_STEEL__WB015_M_WALL_NAVY: brushedWall,
  WB015_M_WALL_NAVY: brushedWall,
  WB015_M_STEEL_BLACK: brushed,
} satisfies FinishSlots;
const vip = {
  WB015_M_DANCE_TILE: dryTile,
  WB015_M_WALL_NAVY: satinTile,
  WB015_M_STEEL_NAVY: brushed,
  WB015_M_PLINTH_PINK: brushed,
  WB015_M_FRAME_PINK: brushed,
  WB015_M_LEATHER_WINE: ['acoustic',.8/1.2],
} satisfies FinishSlots;

const finishesByMesh: Readonly<Record<string,FinishSlots>> = {
  ARCH_WALL_SOUTH: {WB015_M_WALL_NAVY:satinTile},
  ARCH_WALLS_WEN: {WB015_M_WALL_NAVY:satinTile},
  ARCH_PYLONS: {M_WALL_NAVY:brushedWall,M_STEEL_BLACK:brushed},
  ARCH_COLUMNS: {M_STEEL_NAVY:brushed,M_STEEL_BLACK:brushed},
  ARCH_DECK_BEAMS_FASCIA: {WB015_M_STEEL_NAVY:brushed,WB015_M_STEEL_BLACK:brushed},
  ARCH_SKIRTING: {M_STEEL_BLACK:brushed},
  ARCH_UPPER_DECK: {WB015_M_FLOOR_TILE:dryTile},
  STAGE_PLATFORM_DJ: {
    D109_STAIR_COATED_STEEL:tread,
    M_STEEL_BLACK:brushed,
    M_STEEL_NAVY:['acoustic',1/1.2],
    M_PERF_STEEL:['perforated',1/(2.5*.24)],
  },
  STAIR_E: stairs,
  STAIR_W: stairs,
  VIP_E1_SHELL: vip,
  VIP_E2_SHELL: vip,
  VIP_W1_SHELL: vip,
  VIP_W2_SHELL: vip,
};

const requiredSlots = {
  ARCH_WALL_SOUTH:['WB015_M_WALL_NAVY'],
  ARCH_WALLS_WEN:['WB015_M_WALL_NAVY'],
  ARCH_UPPER_DECK:['WB015_M_FLOOR_TILE'],
  STAGE_PLATFORM_DJ:['D109_STAIR_COATED_STEEL','M_STEEL_NAVY'],
  STAIR_E:['D109_STAIR_COATED_STEEL'],
  STAIR_W:['D109_STAIR_COATED_STEEL'],
  VIP_E1_SHELL:['WB015_M_WALL_NAVY','WB015_M_DANCE_TILE'],
  VIP_E2_SHELL:['WB015_M_WALL_NAVY','WB015_M_DANCE_TILE'],
  VIP_W1_SHELL:['WB015_M_WALL_NAVY','WB015_M_DANCE_TILE'],
  VIP_W2_SHELL:['WB015_M_WALL_NAVY','WB015_M_DANCE_TILE'],
};

const supports: FinishSlots = {solid:brushed};

export async function installFinishes(
  world: World,
  assets: AssetRegistry,
  sceneGuid: string,
  materialGuids: Readonly<Record<ArchitecturalFinish,string>>,
) {
  const rows = Array.from(world.query({read:[Name,MeshFilter,MeshRenderer]}).unwrap(), row=>({
    entity:row.entity,
    name:row.get(Name).value,
    mesh:row.get(MeshFilter).assetHandle,
    materials:Array.from(row.get(MeshRenderer).materials),
  }));
  const removedSections = {
    WB018_STAGE_FLANK_PANELS:'M18_ACOUSTIC_WEAVE',
  };
  const filteredMeshes = Object.entries(removedSections).map(([name,slot])=>{
    const row = rows.find(candidate=>candidate.name===name);
    if(!row)throw new Error('Missing finish mesh '+name);
    const source = assets.read(row.mesh).unwrap();
    const indices = source.indices;
    if(!indices)throw new Error(name+' requires indexed geometry');
    const kept = source.submeshes.filter(part=>source.materialSlots[part.materialSlot].slotName!==slot);
    if(kept.length===source.submeshes.length||!kept.length)throw new Error(name+' is missing '+slot+' or its surrounding mesh');
    const filteredIndices: number[] = [];
    const submeshes = kept.map(part=>{
      const indexOffset=filteredIndices.length;
      for(let i=part.indexOffset;i<part.indexOffset+part.indexCount;i++)filteredIndices.push(indices[i]);
      return {...part,indexOffset};
    });
    return {entity:row.entity,original:row.mesh,content:{...source,indices:Uint32Array.from(filteredIndices),submeshes}};
  });

  const architectural = rows.flatMap(row=>{
    const generatedStair = /^PDR\/STAIR_(SOLID_STEP|SUPPORT)_[EW]_\d+$/.test(row.name);
    const rules = generatedStair?supports:finishesByMesh[row.name];
    if(!rules)return [];
    const mesh = assets.read(row.mesh).unwrap();
    const triangleCounts = mesh.materialSlots.map(()=>0);
    for(const part of mesh.submeshes)triangleCounts[part.materialSlot]+=part.indexCount/3;
    const slots = mesh.materialSlots.flatMap(({slotName},index)=>{
      const binding = rules[generatedStair?'solid':slotName];
      return binding ? [{index,slotName,binding,triangles:triangleCounts[index]}] : [];
    });
    const original = mesh.materialSlots.map((_,index)=>row.materials[index]??0);
    return slots.length ? [{...row,materials:original,slots}] : [];
  });
  for(const [name,slotNames] of Object.entries(requiredSlots)){
    const row = architectural.find(candidate=>candidate.name===name);
    const missing = slotNames.filter(slotName=>!row?.slots.some(slot=>slot.slotName===slotName));
    if(missing.length)throw new Error(name+' is missing its architectural finish slots: '+missing.join(', '));
  }
  const rememberVisibility = ({entity,name}:typeof rows[number])=>{
    const previous = world.get(entity,Visibility);
    return {entity,name,previous:previous.ok?previous.value.state:undefined};
  };
  const publicRugs = rows.filter(row=>row.name.startsWith('D115_CARPET_')).map(rememberVisibility);
  const inlay = rows.filter(row=>row.name==='ARCH_FLOOR_INLAY').map(rememberVisibility);
  const vipRugs = rows.filter(row=>row.name.startsWith('D113_CARPET_VIP_')).map(({entity,name})=>{
    const original = Array.from(world.get(entity,Transform).unwrap().scale);
    const installed = [original[0]*.48,original[1],original[2]*.48];
    return {entity,name,original,installed};
  });
  if(publicRugs.length!==4||vipRugs.length!==8||inlay.length!==1){
    throw new Error('Expected public and VIP floor treatments and the entrance inlay');
  }

  const materials = new Map<string,AssetHandle<'material'>>();
  const material = async ([name,scale]:FinishBinding)=>{
    const key = name+'/'+scale;
    const existing = materials.get(key);
    if(existing!==undefined)return existing;
    const donor = (await assets.load(assets.parseGuid(materialGuids[name]),'material')).unwrap();
    try{
      const handle = assets.copy(donor).unwrap();
      materials.set(key,handle);
      const values = retilePbr(assets.read(handle).unwrap().values,scale);
      if(name==='dryTile'){
        values.baseColor=[.47,.46,.48,1];
        values.roughness=.83;
      }
      assets.update(handle,{values}).unwrap();
      return handle;
    }finally{
      assets.release(donor).unwrap();
    }
  };

  const rebound: {entity:EntityHandle;original:number[];installed:number[]}[] = [];
  const visualMeshes: {entity:EntityHandle;original:AssetHandle<'mesh'>;installed:AssetHandle<'mesh'>}[] = [];
  let scene:AssetHandle<'scene'>|undefined;
  let root:ReturnType<typeof assets.instantiate>|undefined;
  let barStrips:ReturnType<typeof installBarMetalStrips>|undefined;
  let floorAccents:ReturnType<typeof installFloorAccents>|undefined;
  try{
    // Use the same warm opal as the recessed D189 nosings. The original
    // cool-white edge would otherwise overdraw the new warmer inset.
    const marker=rows.find(row=>row.name==='Low recessed step markers');
    const markerSlot=marker && assets.read(marker.mesh).unwrap().materialSlots[0];
    const markerRef=marker?.materials[0]||markerSlot?.defaultMaterial;
    const markerHandle=markerRef && typeof markerRef!=='number'
      ? (await assets.load(markerRef,'material')).unwrap()
      : markerRef;
    if(markerRef && typeof markerRef!=='number' && markerHandle)materials.set('stair-opal',markerHandle);
    for(const row of architectural){
      const original = row.materials;
      const installed = original.slice();
      for(const {index,binding} of row.slots)installed[index]=await material(binding);
      if(markerHandle && (row.name==='STAIR_E'||row.name==='STAIR_W')){
        const index=assets.read(row.mesh).unwrap().materialSlots.findIndex(s=>s.slotName==='WB015_M_STEP_LED');
        if(index>=0)installed[index]=markerHandle;
      }
      rebound.push({entity:row.entity,original,installed});
    }
    // The foyer receives the D189 veneer at +2.9 mm, above ARCH_FLOOR_SLAB.
    // Tune the visible textured materials themselves; the opaque bed shows only through joints.
    const foyerSurface: Readonly<Record<string, MaterialRootAsset['values']>> = {
      'Rear terrazzo': {baseColor:[.32,.30,.31,1], roughness:.84, normalScale:[.46,.46],specular:.48},
      'Rear basalt': {baseColor:[.48,.44,.42,1],roughness:.87,normalScale:[1.12,1.12],specular:.46},
      'Neutral shelf lens': {baseColor:[.72,.43,.20,1],emissive:[1,.48,.19],emissiveIntensity:.32},
      'M_STEP_LED': {baseColor:[.70,.43,.21,1],emissive:[1,.52,.24],emissiveIntensity:.68},
      'M_OPAL_PINK_DIM': {baseColor:[.40,.23,.13,1],emissive:[1,.48,.21],emissiveIntensity:.21},
    };
    barStrips=installBarMetalStrips(world);
    const barFinishes:Record<string,{slot:string} & NonNullable<MaterialRootAsset['values']>>=barMetal.finishes;
    for(const row of rows){
      if(barMetal.canopyParts.includes(row.name)){
        visualMeshes.push({entity:row.entity,original:row.mesh,installed:assets.create(openBarCanopy(assets.read(row.mesh).unwrap())).unwrap()});
      }
      const barFinish=barFinishes[row.name];
      if(!barFinish&&!/^(?:Honed aggregate flags(?:\.001)?|Split basalt bar and booth apron|Shelf working light|BAR_BACK_BAR)$/.test(row.name))continue;
      const slots=assets.read(row.mesh).unwrap().materialSlots;
      const original=slots.map((_,i)=>row.materials[i]??0);
      const installed=original.slice();
      for(const [i,slot] of slots.entries()){
        const {slot:finishSlot,...barValues}=barFinish??{};
        const tweak=finishSlot===slot.slotName?barValues:foyerSurface[slot.slotName];
        if(!tweak)continue;
        const ref=original[i]||slot.defaultMaterial;
        if(!ref)throw new Error('Missing visible finish '+row.name+'/'+slot.slotName);
        // The folded hem and perforated face can share a metal texture but
        // have different polishing passes. Preserve each authored finish.
        const finishOwner=finishSlot===slot.slotName?row.name:slot.slotName;
        const key='foyer/'+ref+'/'+finishOwner;
        let copy=materials.get(key);
        if(copy===undefined){
          const donor=typeof ref==='string'?(await assets.load(assets.parseGuid(ref),'material')).unwrap():ref as AssetHandle<'material'>;
          try{
            copy=assets.copy(donor).unwrap();
            materials.set(key,copy);
            assets.update(copy,{values:{...assets.read(copy).unwrap().values,...tweak}}).unwrap();
          }finally{if(typeof ref==='string')assets.release(donor).unwrap();}
        }
        installed[i]=copy;
      }
      rebound.push({entity:row.entity,original,installed});
    }
    // Walls, entrance bricks and the bar apron share one source glaze. Split
    // only the east apron indices into their own runtime material slot.
    const garnet = rows.find(row=>row.name==='Garnet glazed running bond');
    if(garnet){
      const source = assets.read(garnet.mesh).unwrap();
      const position = source.attributes.position;
      const indices = source.indices;
      if(!(position instanceof Float32Array)||!indices||source.submeshes.length!==1)throw new Error('Expected one indexed garnet tile section');
      const section = source.submeshes[0];
      const wallsAndEntry:number[] = [];
      const barApron:number[] = [];
      for(let i=section.indexOffset;i<section.indexOffset+section.indexCount;i+=3){
        const vertex = indices[i]*3;
        const target = position[vertex]>7 && position[vertex+1]<.02 ? barApron : wallsAndEntry;
        target.push(indices[i],indices[i+1],indices[i+2]);
      }
      if(!barApron.length||!wallsAndEntry.length)throw new Error('Missing bar apron or wall tile geometry');
      const slot = source.materialSlots[section.materialSlot];
      const ref = garnet.materials[section.materialSlot]||slot.defaultMaterial;
      if(!ref)throw new Error('Missing bar apron glaze');
      const donor = typeof ref==='string'?(await assets.load(assets.parseGuid(ref),'material')).unwrap():ref as AssetHandle<'material'>;
      try{
        const glaze = assets.copy(donor).unwrap();
        materials.set('foyer/bar-apron',glaze);
        assets.update(glaze,{values:{...assets.read(glaze).unwrap().values,
          baseColor:[.42,.63,.50,1],roughness:1,specular:.34}}).unwrap();
        const installed=assets.create({...source,
          indices:Uint32Array.from([...wallsAndEntry,...barApron]),
          submeshes:[{...section,indexOffset:0,indexCount:wallsAndEntry.length},
            {...section,indexOffset:wallsAndEntry.length,indexCount:barApron.length,materialSlot:source.materialSlots.length}],
          materialSlots:[...source.materialSlots,{slotName:'Iron-red bar apron',defaultMaterial:glaze}],
        }).unwrap();
        visualMeshes.push({entity:garnet.entity,original:garnet.mesh,installed});
        const original=source.materialSlots.map((_,i)=>garnet.materials[i]??0);
        rebound.push({entity:garnet.entity,original,installed:[...original,glaze]});
      }finally{if(typeof ref==='string')assets.release(donor).unwrap();}
    }
    floorAccents = installFloorAccents(world,assets,{tread:await material(['tread',1])});
    scene = (await assets.load(assets.parseGuid(sceneGuid),'scene')).unwrap();
    root = assets.instantiate(scene,world);
    if(!root.ok)throw root.error;
    const finishes = Array.from(world.query({read:[Name,MeshFilter]}).unwrap(),row=>({
      entity:row.entity,name:row.get(Name).value,
    })).filter(row=>row.name.startsWith('D180_'));
    const library = finishes.find(row=>row.name==='D180_Material_Library');
    const panels = finishes.filter(row=>row!==library);
    if(!library||panels.length!==9)throw new Error('Expected nine finish panels and one material library');
    for(const {entity,original,content} of filteredMeshes){
      visualMeshes.push({entity,original,installed:assets.create(content).unwrap()});
    }
    const visible = (entity:(typeof finishes)[number]['entity'],on:boolean)=>{
      const state=on?VisibilityStateValue.inherited:VisibilityStateValue.hidden;
      if(world.hasComponent(entity,Visibility))world.set(entity,Visibility,{state}).unwrap();
      else world.addComponent(entity,{component:Visibility,data:{state}}).unwrap();
    };
    visible(library.entity,false);
    let enabled=false;
    const setEnabled = (value:boolean)=>{
      if(enabled===value)return;
      for(const {entity,original,installed} of visualMeshes){
        world.set(entity,MeshFilter,{assetHandle:value?installed:original}).unwrap();
      }
      for(const {entity} of panels)visible(entity,value);
      floorAccents?.setEnabled(value);
      for(const {entity,installed,original} of rebound){
        world.set(entity,MeshRenderer,{materials:value?installed:original}).unwrap();
      }
      for(const {entity,previous} of [...publicRugs,...inlay]){
        if(value)visible(entity,false);
        else if(previous!==undefined)world.set(entity,Visibility,{state:previous}).unwrap();
        else if(world.hasComponent(entity,Visibility))world.removeComponent(entity,Visibility).unwrap();
      }
      for(const {entity,original,installed} of vipRugs){
        world.set(entity,Transform,{scale:value?installed:original}).unwrap();
      }
      enabled=value;
    };
    try{
      setEnabled(true);
    }catch(error){
      // Restore all original bindings if one of the requested swaps fails.
      enabled=true;
      setEnabled(false);
      throw error;
    }
    const coverage = architectural.flatMap(({name,slots})=>
      slots.map(({slotName,binding,triangles})=>({mesh:name,slot:slotName,finish:binding[0],triangles})));
    const upperFloors = architectural.filter(({slots})=>slots.some(({binding})=>binding[0]==='dryTile')).map(({name})=>name);
    const read = ()=>({enabled,panels:panels.map(row=>row.name),upperFloors,coverage,
      hiddenPublicCarpetMeshes:enabled?publicRugs.map(rug=>rug.name):[],
      hiddenFloorPrints:enabled?['ARCH_FLOOR_INLAY']:[],
      vipRugScale:enabled ? .48 : 1,floorAccents:floorAccents?.read()??[]});
    const readBarSurfaces=()=>rows.flatMap(row=>{
      const authored=barFinishes[row.name];
      if(!authored)return [];
      const mesh=assets.read(world.get(row.entity,MeshFilter).unwrap().assetHandle).unwrap();
      const index=mesh.materialSlots.findIndex(slot=>slot.slotName===authored.slot);
      if(index<0)return [];
      const material=world.get(row.entity,MeshRenderer).unwrap().materials[index];
      if(!material)return [];
      const values=assets.read(material).unwrap().values??{};
      return [{node:row.name,slot:authored.slot,material,values}];
    });
    return {setEnabled,read,readBarSurfaces,dispose:()=>{setEnabled(false);release();}};
  }catch(error){
    release();
    throw error;
  }

  function release(){
    barStrips?.dispose();
    floorAccents?.dispose();
    if(root?.ok)worldDespawnScene(world,root.value).unwrap();
    if(scene!==undefined)assets.release(scene).unwrap();
    for(const mesh of visualMeshes)assets.release(mesh.installed).unwrap();
    for(const handle of materials.values())assets.release(handle).unwrap();
  }
}
