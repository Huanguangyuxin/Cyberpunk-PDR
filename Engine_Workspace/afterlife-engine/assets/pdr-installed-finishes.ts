import type {AssetRegistry} from '@forgeax/engine/assets-runtime';
import type {EntityHandle, World} from '@forgeax/engine/ecs';
import {MeshFilter, MeshRenderer, Visibility, VisibilityStateValue} from '@forgeax/engine/render';
import {Name, Transform, worldDespawnScene} from '@forgeax/engine/scene';
import type {AssetHandle} from '@forgeax/engine/types';
import type {ArchitecturalFinish} from './pdr-installed-finish-ids';
import {retilePbr} from './pdr-native-floor-material';
import {installFloorAccents} from './pdr-floor-accents';

type FinishBinding = readonly [finish:ArchitecturalFinish, uvScale:number];
type FinishSlots = Readonly<Record<string, FinishBinding>>;
const dryTile = ['dryTile',2] as const;
const brushed = ['brushed',1/.3] as const;
const brushedWall = ['brushed',2/.3] as const;
const tread = ['tread',1/.24] as const;
const satinTile = ['satinTile',2/1.2] as const;
const stairs = {
  D109_STAIR_COATED_STEEL: tread,
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
  ARCH_COLUMNS_WB015: {WB015_M_STEEL_NAVY:brushed,WB015_M_STEEL_BLACK:brushed},
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
    FURN_AISLE_SCREENS:'M_FLOOR_BORDER',
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
  let floorAccents:ReturnType<typeof installFloorAccents>|undefined;
  try{
    for(const row of architectural){
      const original = row.materials;
      const installed = original.slice();
      for(const {index,binding} of row.slots)installed[index]=await material(binding);
      rebound.push({entity:row.entity,original,installed});
    }
    const carpet = rows.find(row=>row.name==='D115_CARPET_EAST_01/BODY');
    if(!carpet)throw new Error('Floor mat requires the existing short-pile carpet');
    const carpetSlots = assets.read(carpet.mesh).unwrap().materialSlots;
    const carpetMaterial = (name:string)=>{
      const index = carpetSlots.findIndex(slot=>slot.slotName===name);
      const handle = carpet.materials[index] || carpetSlots[index]?.defaultMaterial;
      if(!handle)throw new Error(`Floor mat material missing: ${name}`);
      return handle as AssetHandle<'material'>;
    };
    floorAccents = installFloorAccents(world,assets,{
      tread:await material(['tread',1]),
      pile:carpetMaterial('D113_SHORT_PILE_CARPET'),
      binding:carpetMaterial('D113_CARPET_BOUND_EDGE'),
    });
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
      hiddenFloorPrints:enabled?['ARCH_FLOOR_INLAY','FURN_AISLE_SCREENS/M_FLOOR_BORDER']:[],
      vipRugScale:enabled ? .48 : 1,floorAccents:floorAccents?.read()??[]});
    return {setEnabled,read,dispose:()=>{setEnabled(false);release();}};
  }catch(error){
    release();
    throw error;
  }

  function release(){
    floorAccents?.dispose();
    if(root?.ok)worldDespawnScene(world,root.value).unwrap();
    if(scene!==undefined)assets.release(scene).unwrap();
    for(const mesh of visualMeshes)assets.release(mesh.installed).unwrap();
    for(const handle of materials.values())assets.release(handle).unwrap();
  }
}
