import {installDisplayHierarchy} from './pdr-display-hierarchy';
import {heroRefractiveMaterial} from './pdr-hero-refractive-material';
import {causticTextureAsset,installBarCaustic} from './pdr-bar-caustics';
import {CAMERA_BLOOM,GTAO,nextHistoryVersion,validatePostProfile} from './pdr-post-profile-wb017';
import {liquidOpticalAssets,liquidOpticalGuid,liquidOpticalKeys} from './pdr-liquid-optical-materials';
import {drinkShellMaterial} from './pdr-drink-shell-material';
import {installCafeChairRepair,installMovingHeads} from './pdr-fixtures-d051';
import {installPlantRepair} from './pdr-plant-repair';
import {installGlassGuardTrial} from './pdr-glass-guards';
import {installOtherScreens} from './pdr-other-screens';
import {installStageMist} from './pdr-stage-mist';
import {installWetFloor} from './pdr-wet-floor';
import {installLiquidMotion} from './pdr-liquid-motion';
import {installWaterDroplets} from './pdr-water-droplets';
import {tuneNewLayout} from './pdr-newlayout-lighting';
import {brandAmbient, installForgeAxBrandLighting} from './pdr-forgeax-brand-lighting';
import {readDrinkOptics} from './pdr-optics-inspection';
/** Full club candidate. Imported R8 ground + WorkBuddy015 upper; Codex native FX/observation; no gameplay. */
import {NAV_CHANNEL} from './pdr-navigation-status';
const ENTRY={eye:[0,1.64,-1.1] as const,yaw:0,pitch:0};
const GLASS_GUID=AssetGuid.format(AssetGuid.derive(definePackageId('61898430-9733-4d13-820b-2c3599a8cab6'),'material/drink-shell-d052'));
const BOOKMARKS={'upper-vip':{eye:[-12.25,4.84,-28.9],target:[-12.02,4.16,-31.95]},'lighting-transition':{eye:[0,1.64,-25.1],target:[0,3.05,-42]},'stage-led-front':{eye:[0,4.04,-38.3],target:[0,4.04,-43.71]},'overlap-drinks':{eye:[10.22,1.38,-9.45],target:[10.65,1.25,-8.98]},'stage-led':{eye:[-2.8,2.1,-37.5],target:[0,4.04,-43.71]},'stage-shadow':{eye:[-3.7,1.1,-36.5],target:[0,.9,-41]},'stairs':{eye:[11.3,1.64,-13.5],target:[12.4,2.2,-17.4]},'gallery':{eye:[8.9,4.84,-27.8],target:[0,3.8,-32]},'liquid-caustic':{eye:[10.18,1.52,-8.60],target:[10.55,1.11,-8.98]},'liquid-light':{eye:[10.458,1.64,-8.817],target:[10.55,1.2515,-8.86]},'liquid-detail':{eye:[10.48,1.35,-9.31],target:[10.55,1.22,-8.94]},liquid:{eye:[10.25,1.48,-8.91],target:[10.55,1.235,-8.86]},'liquid-top':{eye:[10.48,1.62,-9.02],target:[10.58,1.22,-8.99]},drinks:{eye:[10.22,1.38,-9.45],target:[10.65,1.25,-8.98]},stage:{eye:[0,1.64,-31],target:[0,2.8,-40]},chairs:{eye:[7.1,1.64,-29.5],target:[9,.65,-31.6]}} as const;
import {collisionSourceNames} from './pdr-newlayout-collision-names';
import {BODY, installPhysicalNavigation, isSolidMesh, shouldMouseLook} from './pdr-physical-navigation';
import {physicsPlugin, Collider, ColliderShapeValue, RigidBody, RigidBodyTypeValue, type PhysicsWorld} from '@forgeax/engine/physics';
import { AssetGuid, definePack, definePackageId } from '@forgeax/engine/pack/source';
import { ok } from '@forgeax/engine/types';
import type { Plugin } from '@forgeax/engine/plugin';
import type { EntityHandle } from '@forgeax/engine/ecs';
import type { MeshAsset } from '@forgeax/engine/types';
import { Time, Update } from '@forgeax/engine/ecs';
import { INPUT_SNAPSHOT_RESOURCE_KEY, type InputSnapshot } from '@forgeax/engine/input';
import { euler, quat } from '@forgeax/engine/math';
import { getActiveCamera, setActiveCamera, AmbientOcclusion, AMBIENT_OCCLUSION_GTAO, ANTIALIAS_TAA, ANTIALIAS_NONE, TONEMAP_ACES_FILMIC, Camera, CameraView, Skylight, ReflectionProbe, REFLECTION_PROBE_UPDATE_ONCE, MeshFilter, MeshRenderer, PointLight, SpotLight, ShadowParticipation, Visibility, VisibilityStateValue } from '@forgeax/engine/render';
import { Name, Transform, GlobalTransform, Children, ChildOf, worldDespawnScene } from '@forgeax/engine/scene';

const CAMERA_NAMES = ["CAM01_ENTRANCE", "CAM05_DEEP_REVERSE", "CAM02_BAR", "CAM03_BOOTHS", "CAM06_GALLERY_WEST", "CAM07_GALLERY_EAST", "CAM04B_DEEP_UNDER_BRIDGE", "CAM09_CUTAWAY", "CAM08_BOTTLES", "FP_STAND_BAR", "FP_SIT_BOOTH", "THIRD_BAR", "THIRD_BOOTH", "FP_AISLE", "FP_STAIR_BOTTOM", "FP_STAIR_MID", "FP_STAIR_UPPER", "FP_SIT_TABLE_DETAIL", "FP_GALLERY_EXIT", "CAM04_DEEP_FORWARD"] as const;

// The imported glTF is already Y-up; apply no additional axis/scale conversion.
export const scene: Plugin.Object<{ readonly scene: string; readonly wb018Decor: string; readonly stageSign: string; readonly liquidTemplates: readonly string[]; readonly dropletMesh: string; readonly chairMesh: string; readonly headMeshes: readonly string[]; readonly glassMaterial: string; readonly heroGlassMeshes: readonly string[]; readonly liquidMaterials: readonly string[]; readonly barCaustic:string; readonly heroRefractiveMaterial:string }> = {
  name: 'cyberpunk/newlayout-observer',
  inject: ['world', 'assets', 'gameHost'],
  async apply(ctx, config) {
    await ctx.plugin(physicsPlugin('rapier-3d'));
    const { world } = ctx;
    const assets = ctx.assets!;
    const loaded = await assets.load(assets.parseGuid(config.scene), 'scene');
    if (!loaded.ok) throw loaded.error;
const readScaleBounds = (rootNames: readonly string[]) => {
  const world = ctx.world;
  const assets = ctx.assets!;
  const entities = Array.from(world.query({ read: [Name] }).unwrap(), row => row.entity);
  return rootNames.map(name => {
    const matches = entities.filter(e => world.get(e, Name).unwrap().value === name);
    if (matches.length !== 1) return { name, status: matches.length ? 'ambiguous-name' : 'missing-root' };
    const root = matches[0];
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    const pending = [root], seen = new Set<number>();
    let meshCount = 0, vertexCount = 0, aabbFallbackCount = 0;
    const errors: { entity: number; error: string }[] = [];
    while (pending.length) {
      const entity = pending.pop()!;
      if (seen.has(entity)) continue;
      seen.add(entity);
      const children = world.get(entity, Children);
      if (children.ok) for (const child of children.value.entities) pending.push(child as EntityHandle);
      const filter = world.get(entity, MeshFilter);
      if (!filter.ok || filter.value.assetHandle === 0) continue;
      const transform = world.get(entity, GlobalTransform);
      const content = assets.read(filter.value.assetHandle);
      if (!transform.ok || !content.ok) { errors.push({ entity, error: !transform.ok ? transform.error.code : !content.ok ? content.error.code : 'unknown' }); continue; }
      const mesh = content.value as MeshAsset;
      const m = transform.value.world; // column-major, parent-inclusive; DO NOT multiply parent again.
      let positions: Float32Array | undefined;
      const source = mesh.attributes.position;
      if (source instanceof Float32Array) positions = source;
      else if (source instanceof ArrayBuffer) positions = new Float32Array(source);
      if (!positions && mesh.aabb?.length === 6) {
        // Packed meshes may omit CPU positions. This is conservative, not exact shape bounds.
        const b = mesh.aabb, corners: number[] = [];
        for (const x of [b[0], b[3]]) for (const y of [b[1], b[4]]) for (const z of [b[2], b[5]]) corners.push(x, y, z);
        positions = new Float32Array(corners); aabbFallbackCount++;
      }
      if (!positions) { errors.push({ entity, error: 'mesh-positions-and-aabb-unavailable' }); continue; }
      meshCount++;
      for (let i = 0; i + 2 < positions.length; i += 3) {
        const x = positions[i], y = positions[i + 1], z = positions[i + 2];
        const p = [m[0]*x+m[4]*y+m[8]*z+m[12], m[1]*x+m[5]*y+m[9]*z+m[13], m[2]*x+m[6]*y+m[10]*z+m[14]];
        if (!p.every(Number.isFinite)) { errors.push({ entity, error: 'nonfinite-world-position' }); continue; }
        vertexCount++;
        for (let axis = 0; axis < 3; axis++) { min[axis] = Math.min(min[axis], p[axis]); max[axis] = Math.max(max[axis], p[axis]); }
      }
    }
    const global = world.get(root, GlobalTransform);
    const transform = world.get(root, Transform);
    const ancestors = []; let ancestor = root;
    const visited = new Set<number>();
    while (!visited.has(ancestor)) {
      visited.add(ancestor);
      const relation = world.get(ancestor, ChildOf);
      if (!relation.ok || relation.value.parent === null) break;
      ancestor = relation.value.parent;
      const parentName = world.get(ancestor, Name), parentLocal = world.get(ancestor, Transform), parentWorld = world.get(ancestor, GlobalTransform);
      ancestors.push({ entity: ancestor, name: parentName.ok ? parentName.value.value : null, localScale: parentLocal.ok ? Array.from(parentLocal.value.scale) : null, worldMatrix: parentWorld.ok ? Array.from(parentWorld.value.world) : null });
    }
    return { name, entity: root, status: errors.length ? 'incomplete' : vertexCount ? 'measured' : 'no-mesh-data',
      basis: 'Engine-native Y-up meters', method: aabbFallbackCount ? 'mixed positions and conservative transformed local AABB corners' : 'all actual CPU mesh POSITION vertices through GlobalTransform.world',
      meshCount, vertexCount, aabbFallbackCount, min: vertexCount ? min : null, max: vertexCount ? max : null,
      dimensions: vertexCount ? max.map((value, axis) => value-min[axis]) : null,
      localScale: transform.ok ? Array.from(transform.value.scale) : null, rootWorldMatrix: global.ok ? Array.from(global.value.world) : null,
      ancestors, errors };
  });
};

    await ctx.effect(async function* () {
      yield () => assets.release(loaded.value).unwrap();
      const root = assets.instantiate(loaded.value, world).unwrap();
      // WB018 selected-object candidate: official asset/GUID import, no full-scene replacement.
      const decorLoaded=(await assets.load(assets.parseGuid(config.wb018Decor),'scene')).unwrap();
      yield ()=>assets.release(decorLoaded).unwrap();
      const decorRoot=assets.instantiate(decorLoaded,world).unwrap();
      yield ()=>worldDespawnScene(world,decorRoot).unwrap();
      const ledLoaded=(await assets.load(assets.parseGuid(config.stageSign),'scene')).unwrap();
      yield ()=>assets.release(ledLoaded).unwrap();
      const ledRoot=assets.instantiate(ledLoaded,world).unwrap();
      yield ()=>worldDespawnScene(world,ledRoot).unwrap();
      const roofBands=Array.from(world.query({read:[Name]}).unwrap(),row=>({entity:row.entity,name:row.get(Name).value})).find(row=>row.name==='FIX_ROOF_LIGHT_BANDS')?.entity;
      if(roofBands===undefined)throw new Error('WB018 expected the existing roof-light-band object');
      const oldBandVisibility=world.get(roofBands,Visibility);
      const previousBandState=oldBandVisibility.ok?oldBandVisibility.value.state:VisibilityStateValue.inherited;
      if(!oldBandVisibility.ok)world.addComponent(roofBands,{component:Visibility,data:{state:VisibilityStateValue.hidden}}).unwrap();
      else world.set(roofBands,Visibility,{state:VisibilityStateValue.hidden}).unwrap();
      yield ()=>world.set(roofBands,Visibility,{state:previousBandState}).unwrap();
      ctx.gameHost?.setPointerLockAllowed?.(true);
      yield () => ctx.gameHost?.setPointerLockAllowed?.(false);
      yield () => worldDespawnScene(world, root).unwrap();
      // Temporary diffuse-only geometry inspection fill, not the art lighting design.
      // No equirect, no probe/specular claim, no extra PointLight/SpotLight.
      const inspectionIrradiance = [1.5, 1.8, 2.4];
      const artAmbient = brandAmbient.irradiance;
      let inspectionFill = false;
      const inspectionLight = world.spawn(
        { component: Name, data: { value: 'DIAGNOSTIC/geometry-inspection-not-art-lighting' } },
        { component: Skylight, data: { intensity: 0.18, color: brandAmbient.sky, ambientIrradiance: artAmbient } },
      ).unwrap();
      yield () => { if (world.get(inspectionLight, Skylight).ok) world.despawn(inspectionLight).unwrap(); };
      const roomProbe=world.spawn(
        {component:Name,data:{value:'PDR/new-layout-front-hall-reflection-probe'}},
        {component:Transform,data:{pos:[0,2.5,-10]}},
        {component:ReflectionProbe,data:{halfExtents:[14,4.5,12],resolution:64,updateIntent:REFLECTION_PROBE_UPDATE_ONCE,intensity:.65,boxProjection:false}},
      ).unwrap();
      yield ()=>world.despawn(roomProbe).unwrap();
      // D059: capture actual nearby fixtures above the hero drinks. A small
      // local domain avoids using the distant hall-centre cubemap at the bar.
      // Renderer owns cube capture, PMREM, Fresnel and selection; not RT.
      const barDrinkProbe=world.spawn(
        {component:Name,data:{value:'PDR/bar-drinks-local-reflection-D059'}},
        {component:Transform,data:{pos:[10.4,2.05,-8.95]}},
        {component:ReflectionProbe,data:{halfExtents:[1.65,1.35,2.5],priority:20,resolution:128,
          updateIntent:REFLECTION_PROBE_UPDATE_ONCE,intensity:1,boxProjection:false}},
      ).unwrap();
      yield ()=>world.despawn(barDrinkProbe).unwrap();
      const guards=installGlassGuardTrial(world,assets);
      yield ()=>guards.dispose();
      const chairRepair=await installCafeChairRepair(world,assets,config.chairMesh);
      yield ()=>chairRepair.dispose();
      const plantRepair=installPlantRepair(world,assets);
      yield ()=>plantRepair.dispose();
      const otherScreens=installOtherScreens(world,assets);
      yield ()=>otherScreens.dispose();
      const imported = Array.from(world.query({ read: [Name, Camera, Transform] }).unwrap(), row => row.entity);
      for(const entity of imported){if(world.get(entity,CameraView).ok)world.set(entity,CameraView,{enabled:false}).unwrap();}
      const cameras = CAMERA_NAMES.map(name => {
        const entity = imported.find(e => world.get(e, Name).unwrap().value === name);
        if (entity === undefined) throw new Error(`PDR v2 imported camera missing: ${name}`);
        const t = world.get(entity, Transform).unwrap();
        const c = world.get(entity, Camera).unwrap();
        const saved = { pos: Array.from(t.pos), quat: Array.from(t.quat) };
        const horizontalFov = 2 * Math.atan(Math.tan(c.fov / 2) * c.aspect);
        if (!world.get(entity, CameraView).ok) {
          world.addComponent(entity, { component: CameraView, data: { enabled: false } }).unwrap();
        } else world.set(entity, CameraView, { enabled: false }).unwrap();
        // Existing grade is a preview initial value; v2 exposure is not calibrated.
        world.set(entity, Camera, { autoAspect: false, aspect: 16 / 9, tonemap: TONEMAP_ACES_FILMIC, antialias: ANTIALIAS_TAA, exposureMode: 0, exposure: 0.60,
          whitePoint: 4, ...CAMERA_BLOOM }).unwrap();
        world.addComponent(entity,{component:AmbientOcclusion,data:{...GTAO,algorithm:AMBIENT_OCCLUSION_GTAO}}).unwrap();
        return { entity, name, saved, horizontalFov };
      });
      const cutaway = Array.from(world.query({ read: [Name] }).unwrap(), row => row.entity)
        .filter(entity => {
          const name = world.get(entity, Name).unwrap().value;
          return name === 'ARCH_ROOF_SLAB' || name === 'ARCH_WALL_SOUTH';
        }).map(entity => {
          const original = world.get(entity, Visibility);
          const state = original.ok ? original.value.state : VisibilityStateValue.inherited;
          if (!original.ok) world.addComponent(entity, { component: Visibility, data: { state } }).unwrap();
          return { entity, state };
        });
      const previousActiveCamera = getActiveCamera(world);
      yield () => {
        if (previousActiveCamera) setActiveCamera(world, previousActiveCamera.entity);
        else world.removeResource('ActiveCamera');
      };
      const calibrationMeshes = Array.from(world.query({ read: [Name] }).unwrap(), row => row.entity)
        .filter(e => world.get(e, Name).unwrap().value.startsWith('CALIB'));
      for (const e of calibrationMeshes) {
        if (!world.get(e, Visibility).ok) world.addComponent(e, {component: Visibility, data: {state: VisibilityStateValue.inherited}}).unwrap();
      }
      let humansVisible = false;
      for (const e of calibrationMeshes) world.set(e, Visibility, {state: VisibilityStateValue.hidden}).unwrap();
      let freeMove = false;
      let selected = 13;
      let keyboardAllowed=false;
      let physical: ReturnType<typeof installPhysicalNavigation> | null = null;
      let queuedJump = false;
      const keyCodes = ['Digit1','Digit2','Digit3','Digit4','Digit5','Digit6','Digit7','Digit8','Digit9',
        'F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11'];
      const eyeHeight = () => cameras[selected].name.startsWith('FP_SIT_') ? 1.20 : 1.64;
      let yaw = 0, pitch = 0, roll = 0;
      let mouseLookCaptured=false;
      let lastPointerLocked=false;
      const keys = new Map<string, boolean>();
      const select = (index: number) => {
        selected = index;
        mouseLookCaptured=false;
        freeMove = cameras[index].name.startsWith('FP_');
        physical?.reset(cameras[index].saved.pos, eyeHeight());
        queuedJump = false;
        for (let i = 0; i < cameras.length; i++) {
          world.set(cameras[i].entity, CameraView, { enabled: i === index }).unwrap();
        }
        const camera = cameras[index];
        // Native observation/editor selection must match the enabled render view.
        setActiveCamera(world, camera.entity);
        for (const item of cutaway) world.set(item.entity, Visibility, {
          state: index === 7 ? VisibilityStateValue.hidden : item.state,
        }).unwrap();
        // Number keys restore the frozen authored viewpoint, including after free flight.
        world.set(camera.entity, Transform, camera.saved).unwrap();
        // WB017: cut only after a discrete camera jump, retain history during walking.
        world.set(camera.entity, Camera, {historyVersion:nextHistoryVersion(world.get(camera.entity,Camera).unwrap().historyVersion)}).unwrap();
        const rotation = euler.fromQuat(euler.create(), camera.saved.quat, 'YXZ');
        yaw = rotation.y; pitch = rotation.x; roll = rotation.z;
      };
      const enterEntrance=()=>{
        select(13);yaw=ENTRY.yaw;pitch=ENTRY.pitch;roll=0;
        const pose={pos:[...ENTRY.eye],quat:Array.from(quat.fromEuler(quat.create(),pitch,yaw,roll,'YXZ'))};
        world.set(cameras[13].entity,Transform,pose).unwrap();physical?.reset(ENTRY.eye,1.64);
      };
      const collisionRoster: {name:string;entity:number;mesh:number}[]=[];
      const collisionExcluded=collisionSourceNames.filter(name=>!isSolidMesh(name));
      const collisionPending=new Set(collisionSourceNames.filter(isSolidMesh));
      const collisionExpected=collisionPending.size;
      const attached=new Set<number>();
      let collisionReady=false;
      world.addSystem(Update,{name:'cyberpunk-attach-loaded-collision',queries:[],fn:()=>{
        if(collisionReady)return;
        // Imported mesh components/refs become available after instantiate; discover on the live timeline.
        for(const row of Array.from(world.query({read:[Name,MeshFilter,Transform]}).unwrap(),row=>({
          name:row.get(Name).value,entity:row.entity,handle:row.get(MeshFilter).assetHandle}))){
          const {name,entity,handle}=row;
          if(attached.has(entity)||!collisionPending.has(name)||!handle||!assets.read(handle).ok)continue;
          world.addComponent(entity,{component:RigidBody,data:{type:RigidBodyTypeValue.static}}).unwrap();
          world.addComponent(entity,{component:Collider,data:{shape:ColliderShapeValue.trimesh,mesh:handle}}).unwrap();
          collisionRoster.push({name,entity,mesh:handle});attached.add(entity);collisionPending.delete(name);
        }
        if(!collisionPending.size){const pw=world.getResource<PhysicsWorld>('PhysicsWorld');
          collisionReady=collisionRoster.every(x=>pw.hasBody(x.entity));}
      }}).unwrap();
      yield ()=>world.removeSystem(Update,'cyberpunk-attach-loaded-collision').unwrap();
      physical=installPhysicalNavigation(world,ENTRY.eye,()=>({
        active:collisionReady&&freeMove&&cameras[selected].name.startsWith('FP_'),yaw,eyeHeight:eyeHeight(),camera:cameras[selected].entity,
      }));
      yield () => physical?.dispose();
      const port=ctx.gameHost?.port;
      if(!port)throw new Error('Navigation source requires the App-owned message port');
      let lastStatusTime=-1,lastKey='',liquidDiagnosticsRequested=false;
      let readLiquidDiagnostics:(()=>unknown)|null=null;
      let readRenderDiagnostics:(()=>unknown)|null=null,diagnosticShadowState:boolean|null=null,bloomOverride:boolean|null=null,bloomApplied:boolean|null=null,isolationMode:string|null=null,isolationApplied=false,headTestMode:string|null=null,headTestApplied=false;
      let pendingBookmark:keyof typeof BOOKMARKS|null=null,overlapOrbit=false;
      let chooseShadowLights:()=>void=()=>{};
      const applyBookmark=(view:keyof typeof BOOKMARKS)=>{const p=BOOKMARKS[view];overlapOrbit=view==='overlap-drinks';const dx=p.target[0]-p.eye[0],dy=p.target[1]-p.eye[1],dz=p.target[2]-p.eye[2];select(0);yaw=Math.atan2(-dx,-dz);pitch=Math.atan2(dy,Math.hypot(dx,dz));roll=0;world.set(cameras[0].entity,Transform,{pos:Array.from(p.eye),quat:Array.from(quat.fromEuler(quat.create(),pitch,yaw,0,'YXZ'))}).unwrap();};
      const publishHud=()=>{
        const p=physical!.read();
        port.postMessage({channel:NAV_CHANNEL,kind:'status',collisionReady,
          admitted:collisionReady?collisionExpected:collisionRoster.filter(x=>world.getResource<PhysicsWorld>('PhysicsWorld').hasBody(x.entity)).length,
          total:collisionExpected,firstPerson:cameras[selected].name.startsWith('FP_'),freeMove,
          focusAcknowledged:keyboardAllowed,keyboardAllowed,mouseLook:mouseLookCaptured,
          mouseLocked:lastPointerLocked,grounded:p.grounded,position:p.position,lastKey,renderDiagnostics:readRenderDiagnostics?.()??null,
          ...(liquidDiagnosticsRequested?{liquidDiagnostics:readLiquidDiagnostics?.()??null}:{})});
      };
      const receiveHud=(event:MessageEvent)=>{
        const m=event.data;if(m?.channel!==NAV_CHANNEL)return;
        if(m.kind==='render-diagnostic'&&['fog-off','ssr-off','gtao-off','taa-off','bands-off','plaque-baseline'].includes(m.mode))isolationMode=m.mode;
        if(m.kind==='render-diagnostic'&&['bloom-on','bloom-off'].includes(m.mode))bloomOverride=m.mode==='bloom-on';
        if(m.kind==='render-diagnostic'&&['shadow-on','shadow-off'].includes(m.mode))diagnosticShadowState=m.mode==='shadow-on';
        if(m.kind==='render-diagnostic'&&['head-left-lit','head-left-clear','head-right-lit','head-right-clear','head-sweep','head-sweep-no-taa'].includes(m.mode)){headTestMode=m.mode;diagnosticShadowState=!m.mode.endsWith('-clear');}
        if(m.kind==='inspect'&&m.liquidDiagnostics===true)liquidDiagnosticsRequested=true;
        if(m.kind==='bookmark'&&typeof m.view==='string'&&Object.hasOwn(BOOKMARKS,m.view))pendingBookmark=m.view as keyof typeof BOOKMARKS;
        if((m.kind==='focus'||m.kind==='capture')&&typeof m.focused==='boolean'){
          keyboardAllowed=m.focused;if(!keyboardAllowed){physical!.clearInput();mouseLookCaptured=false;}
          else if(m.kind==='capture')mouseLookCaptured=true;
        }
        if(['focus','capture','inspect'].includes(m.kind))publishHud();
      };
      port.addEventListener('message',receiveHud);port.start();
      yield ()=>port.removeEventListener('message',receiveHud);
      // New-layout lights are authored by the imported R8 scene. No old BS/SF overrides.
      const lighting=tuneNewLayout(world);
      const stageMist=installStageMist(world,assets);
      yield ()=>stageMist.dispose();
      const wetFloor=await installWetFloor(world,assets,cameras.map(c=>c.entity));
      yield ()=>wetFloor.dispose();
      const liquidMotion=await installLiquidMotion(world,assets,config.liquidTemplates,config.glassMaterial,config.heroGlassMeshes,config.liquidMaterials,config.heroRefractiveMaterial);
      yield ()=>liquidMotion.dispose();
      // Physical caustic cookie is disabled while validating the new layer owner.
      // It requires receiver-only lighting, not self-projection on the liquid.
      readLiquidDiagnostics=liquidMotion.read;
      const waterDroplets=await installWaterDroplets(world,assets,config.dropletMesh);
      yield ()=>waterDroplets.dispose();
      const movingHeads=await installMovingHeads(world,assets,config.headMeshes);
      yield ()=>movingHeads.dispose();
      const brandLighting = await installForgeAxBrandLighting(world, assets);
      yield () => brandLighting.dispose();
      const hierarchy=installDisplayHierarchy(world,assets);
      yield ()=>hierarchy.dispose();
      let viewportKey="";
      const readLightRefinement=lighting.read;
      const readBarLighting=()=>({status:'source-authored new-layout lights, no old bar override'});
      const setBarLightScale=(_scale:number)=>{throw new Error('Old-layout light override not available');};
      // Engine-specific lens bloom control. Manual exposure and the 32 source light intensities stay unchanged.
      if(validatePostProfile().length)throw new Error('WB017 post profile outside native parameter range');
      const artPost = {...CAMERA_BLOOM};
      const setArtPost = (intensity: number, threshold: number) => {
        if (!Number.isFinite(intensity) || intensity < 0 || intensity > 2 || !Number.isFinite(threshold) || threshold < 0 || threshold > 10) throw new Error('Invalid bloom authoring values');
        for (const c of cameras) world.set(c.entity, Camera, {bloomIntensity: intensity, bloomThreshold: threshold, bloomSmoothWidth: artPost.bloomSmoothWidth, bloomRadius: artPost.bloomRadius}).unwrap();
        return cameras.map(c => ({name: c.name, bloom: world.get(c.entity, Camera).unwrap().bloom, intensity: world.get(c.entity, Camera).unwrap().bloomIntensity, threshold: world.get(c.entity, Camera).unwrap().bloomThreshold}));
      };
      setArtPost(artPost.bloomIntensity, artPost.bloomThreshold);
      enterEntrance();
      world.addSystem(Update, {
        name: 'cyberpunk-pdr-v2-observer', queries: [],
        fn: () => {
          if(isolationMode&&!isolationApplied){
            if(isolationMode==='fog-off')stageMist.setEnabled(false);
            if(isolationMode==='bands-off')brandLighting.muteHouseBands();
            if(isolationMode==='plaque-baseline')brandLighting.resetPlaqueGlow();
            if(isolationMode==='ssr-off')wetFloor.setSSR(false);
            if(isolationMode==='gtao-off')for(const c of cameras)if(world.hasComponent(c.entity,AmbientOcclusion))world.removeComponent(c.entity,AmbientOcclusion).unwrap();
            if(isolationMode==='taa-off')for(const c of cameras)world.set(c.entity,Camera,{antialias:ANTIALIAS_NONE}).unwrap();
            isolationApplied=true;
          }
          if(bloomOverride!==null&&bloomOverride!==bloomApplied){for(const c of cameras)world.set(c.entity,Camera,{bloom:bloomOverride?1:0}).unwrap();bloomApplied=bloomOverride;}
          // Closed D068 verification only. Use the real scene, real two lamps
          // and unchanged physical materials; remove mist/ambient/other source
          // light contamination so a moving cast shadow is actually observable.
          if(headTestMode&&!headTestApplied){
            stageMist.setEnabled(false);
            const points=Array.from(world.query({read:[PointLight]}).unwrap(),row=>row.entity);
            for(const entity of points)world.set(entity,PointLight,{intensity:0}).unwrap();
            const spots=Array.from(world.query({read:[Name,SpotLight]}).unwrap(),row=>({entity:row.entity,name:row.get(Name).value}));
            for(const row of spots)if(!['L24_STAGE_HEAD_3','L25_STAGE_HEAD_4'].includes(row.name))world.set(row.entity,SpotLight,{intensity:0}).unwrap();
            world.set(inspectionLight,Skylight,{intensity:0}).unwrap();
            for(const c of cameras)world.set(c.entity,Camera,{bloom:0,...(headTestMode==='head-sweep-no-taa'?{antialias:ANTIALIAS_NONE}:{})}).unwrap();
            headTestApplied=true;
          }
          chooseShadowLights();
          if(overlapOrbit){const t=world.getResource(Time).elapsed,eye=[10.22+.12*Math.sin(t*.55),1.38+.025*Math.sin(t*.23),-9.45+.10*Math.cos(t*.55)],target=[10.65,1.25,-8.98],d=target.map((v,a)=>v-eye[a]);yaw=Math.atan2(-d[0],-d[2]);pitch=Math.atan2(d[1],Math.hypot(d[0],d[2]));world.set(cameras[0].entity,Transform,{pos:eye,quat:Array.from(quat.fromEuler(quat.create(),pitch,yaw,0,'YXZ'))}).unwrap();}
          if(pendingBookmark){const view=pendingBookmark;pendingBookmark=null;applyBookmark(view);}
          guards.tick();
          otherScreens.tick();
          stageMist.tick();
          liquidMotion.tick();
          waterDroplets.tick();
          movingHeads.tick(diagnosticShadowState!==null&&!headTestMode,headTestMode?(headTestMode.startsWith('head-sweep')?'sweep':headTestMode.startsWith('head-left')?'left':'right'):undefined);
          if (!world.hasResource(INPUT_SNAPSHOT_RESOURCE_KEY)) return;
          const input = world.getResource<InputSnapshot>(INPUT_SNAPSHOT_RESOURCE_KEY);
          const elapsed=world.getResource(Time).elapsed;
          if(elapsed-lastStatusTime>.1){publishHud();lastStatusTime=elapsed;}
          const hotKey = (code:string)=>keyboardAllowed&&(input.keyboard.downCode(code)||input.keyboard.justPressedCode(code));
          const disturb=hotKey('KeyJ');if(disturb&&!keys.get('KeyJ'))world.getResource<{disturb:(v:number)=>unknown}>('cyberpunk.liquids').disturb(1.5);keys.set('KeyJ',disturb);
          for(const code of ['KeyW','KeyA','KeyS','KeyD','Space'])if(hotKey(code))lastKey=code.replace('Key','');
          lastPointerLocked=input.mouse.pointerLocked;
          if(keyboardAllowed&&input.mouse.justPressed(0))mouseLookCaptured=true;
          if(hotKey('Escape'))mouseLookCaptured=false;
          for (const code of ['KeyH', 'KeyF']) {
            const down = hotKey(code);
            if (down && !keys.get(code)) {
              if (code === 'KeyF') freeMove = !freeMove;
              else { humansVisible = !humansVisible;
                for (const e of calibrationMeshes) world.set(e, Visibility, { state: humansVisible ? VisibilityStateValue.inherited : VisibilityStateValue.hidden }).unwrap();
              }
            }
            keys.set(code, down);
          }
          for (const code of ['KeyP', 'KeyR']) {
            const down = hotKey(code);
            if (down && !keys.get(code)) enterEntrance();
            keys.set(code, down);
          }
          const fillDown = hotKey('KeyL');
          if (fillDown && !keys.get('KeyL')) {
            inspectionFill = !inspectionFill;
            world.set(inspectionLight, Skylight, {
              intensity: 0.18, ambientIrradiance: inspectionFill ? inspectionIrradiance : artAmbient,
            }).unwrap();
          }
          keys.set('KeyL', fillDown);
          for (let i = 0; i < cameras.length; i++) {
            const code = keyCodes[i];
            const down = hotKey(code) || (i >= 9 && hotKey(['KeyZ','KeyX','KeyC','KeyV','KeyB','KeyN','KeyM','KeyT','KeyY','KeyU'][i-9]));
            if (down && !keys.get(code)) select(i);
            keys.set(code, down);
          }
          const camera = cameras[selected];
          const lens = world.get(camera.entity, Camera).unwrap();
          const size = ctx.gameHost?.drawingBufferSize?.();
          // Fit a genuine 16:9 viewport inside any window without stretching.
          const aspect = size && size.width > 0 && size.height > 0 ? size.width / size.height : 16 / 9;
          const rect = aspect > 16 / 9 ? [(1-(16/9)/aspect)/2,0,(16/9)/aspect,1] : [0,(1-aspect/(16/9))/2,1,aspect/(16/9)];
          // D051: publish projection only when its actual owner inputs change.
          const nextViewportKey=camera.entity+":"+(size?.width??0)+":"+(size?.height??0)+":"+camera.horizontalFov;
          if(nextViewportKey!==viewportKey){
            world.set(camera.entity, CameraView, { viewport: rect,
              resolutionScale: size ? Math.min(1,2560/(size.width*rect[2]),1440/(size.height*rect[3])) : 1 }).unwrap();
            world.set(camera.entity, Camera, { autoAspect: false, aspect: 16 / 9,
              fov: 2 * Math.atan(Math.tan(camera.horizontalFov / 2) / (16 / 9)) }).unwrap();
            viewportKey=nextViewportKey;
          }
          if (!freeMove) return;
          const dt = Math.min(0.05, Math.max(0, world.getResource(Time).delta));
          const key = (code: string) => Number(keyboardAllowed&&input.keyboard.downCode(code));
          let turnX = (key('ArrowLeft') - key('ArrowRight')) * 1.5 * dt;
          let turnY = (key('ArrowUp') - key('ArrowDown')) * 1.5 * dt;
          if (keyboardAllowed&&(shouldMouseLook(input.mouse) || mouseLookCaptured)) {
            turnX -= input.mouse.movementDelta.x * 0.003;
            turnY -= input.mouse.movementDelta.y * 0.003;
          }
          if (turnX || turnY) {
            yaw += turnX;
            pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, pitch + turnY));
            world.set(camera.entity, Transform, { quat: Array.from(quat.fromEuler(quat.create(), pitch, yaw, roll, 'YXZ')) }).unwrap();
          }
          const right = key('KeyD') - key('KeyA');
          const forward = key('KeyW') - key('KeyS');
          const firstPerson = cameras[selected].name.startsWith('FP_');
          if (firstPerson) {
            if(keyboardAllowed)physical!.sample(input);else physical!.clearInput();
            if(queuedJump){physical!.requestJump();queuedJump=false;}
            return;
          }
          const up = key('KeyE') - key('KeyQ');
          const length = Math.hypot(right, forward, up);
          if (length) {
            const accelerated = input.keyboard.downCode('ShiftLeft') || input.keyboard.downCode('ShiftRight');
            const speed = firstPerson ? (accelerated ? 2.8 : 1.4) : (accelerated ? 8 : 3);
            const step = speed * dt / Math.max(1, length);
            const p = world.get(camera.entity, Transform).unwrap().pos;
            const next = [
              p[0] + (Math.cos(yaw) * right - Math.sin(yaw) * Math.cos(pitch) * forward) * step,
              p[1] + (up + Math.sin(pitch) * forward) * step,
              p[2] + (-Math.sin(yaw) * right - Math.cos(yaw) * Math.cos(pitch) * forward) * step,
            ];
            world.set(camera.entity, Transform, { pos: next }).unwrap();
          }
        },
      }).unwrap();
      yield () => world.removeSystem(Update, 'cyberpunk-pdr-v2-observer').unwrap();
      // Four native shadow tiles are reassigned by the observed room. This
      // keeps stage sources shadowed without adding lights or atlas memory.
      const allSpots=Array.from(world.query({read:[Name,SpotLight]}).unwrap(),r=>({entity:r.entity,name:r.get(Name).value}));
      // Exact names come from the live32-light roster, not guessed IDs.
      const pick=(numbers:readonly number[])=>numbers.map(n=>{const l=allSpots.find(r=>Number(r.name.slice(1,3))===n);if(!l)throw Error('D063 shadow Spot missing '+n);return l;});
      const groups={stage:pick([22,24,25,27]),bar:pick([1,2,13,19]),hall:pick([19,20,22,27]),foyer:pick([12,13,14,19])};
      // A point source inside its own opaque lens/housing must not black out
      // its entire cone. Native caster channels exclude only that lamp's own
      // assembly; it remains visible and casts for every other light.
      const fixtures=Array.from(world.query({read:[Name,MeshRenderer]}).unwrap(),r=>({entity:r.entity,name:r.get(Name).value}));
      const sourceLinks=[{number:18,bit:15,names:['WB018_ROOF_LIGHT_BANDS_COOL'],prefix:null},...Array.from({length:6},(_,i)=>({number:22+i,bit:i,names:i===1||i===4?['WB018_ROOF_LIGHT_BANDS_COOL']:['STAGE_MOVING_HEAD_'+(i+1)],prefix:i===2?'PDR/MOVING_HEAD_0/':i===3?'PDR/MOVING_HEAD_1/':null})),
        ...[12,13,14,19,20,21].map((number,i)=>({number,bit:6+i,names:number===13?['WB018_CEIL_BAND_FRONT']:['CEIL_L_0'+(i+1)],prefix:null})),
        ...[1,2,3].map((number,i)=>({number,bit:12+i,names:['BAR_CANOPY'],prefix:null}))];
      const ownMasks=new Map<EntityHandle,number>();
      for(const link of sourceLinks){const light=allSpots.find(r=>Number(r.name.slice(1,3))===link.number);if(!light)continue;
        world.set(light.entity,SpotLight,{shadowCasterChannels:2**link.bit}).unwrap();
        for(const f of fixtures)if(link.names.includes(f.name)||(link.prefix!==null&&f.name.startsWith(link.prefix)))ownMasks.set(f.entity,((ownMasks.get(f.entity)??0xffffffff)&~(2**link.bit))>>>0);
      }
      for(const [entity,channels] of ownMasks){if(world.hasComponent(entity,ShadowParticipation))world.set(entity,ShadowParticipation,{channels}).unwrap();else world.addComponent(entity,{component:ShadowParticipation,data:{channels,cast:true,receive:true}}).unwrap();}
      let shadowRequests:EntityHandle[]=[],shadowZone='',shadowState:boolean|null=null;
      chooseShadowLights=()=>{const cam=getActiveCamera(world),gt=cam?world.get(cam.entity as EntityHandle,GlobalTransform):null;
        const p=gt?.ok?gt.value.world:null,x=p?.[12]??0,z=p?.[14]??0;
        const zone=z<-30?'stage':x>7&&z>-20?'bar':z>-23?'foyer':'hall';
        if(zone===shadowZone&&shadowState===diagnosticShadowState)return;
        const selected=groups[zone],set=new Set(selected.map(r=>r.entity));
        for(const row of allSpots){
          const n=Number(row.name.slice(1,3)),wide=[12,13,14,19,20,21].includes(n);
          // Wide ceiling cones need a world-space bias comparable to a map
          // texel, not the millimetre-scale bias of a close bar light.
          world.set(row.entity,SpotLight,{castShadow:set.has(row.entity)&&diagnosticShadowState!==false,mapSize:1536,normalBias:wide?.045:n<=3?.003:.012,depthBias:wide?.000025:.00001,pcfKernelSize:wide?5:3,nearPlane:.1,shadowIntensity:wide?.68:1}).unwrap();
        }
        shadowRequests=selected.map(r=>r.entity);shadowZone=zone;shadowState=diagnosticShadowState;
      };chooseShadowLights();
      readRenderDiagnostics=()=>{const h=hierarchy.read();return {headTest:headTestMode?{mode:headTestMode,fog:false,bloom:false,onlyLights:['L24_STAGE_HEAD_3','L25_STAGE_HEAD_4'],...movingHeads.read()}:null,shadowMode:headTestMode?'head-interaction-test':diagnosticShadowState===null?'normal':diagnosticShadowState?'frozen-on':'frozen-off',shadowZone,isolationMode,bloom:headTestMode?false:bloomOverride??true,frozenHeadDirections:diagnosticShadowState===null?null:movingHeads.read().fixtures.map(f=>f.direction),sourceHousingLinks:ownMasks.size,shadowLights:shadowRequests.map(e=>({name:world.get(e,Name).unwrap().value,castShadow:world.get(e,SpotLight).unwrap().castShadow,intensity:world.get(e,SpotLight).unwrap().intensity,direction:Array.from(world.get(e,SpotLight).unwrap().direction)})),hierarchy:{objects:h.objects,layers:h.transparentLayers,deduplicatedMeshTemplates:h.deduplicated.length},ceilingBands:brandLighting.read(),plants:plantRepair.read(),stageLed:'ForgeAX official plaque / native emissive + Bloom + local backlight'};};
      const measurementNames = [...collisionSourceNames];
      world.insertResource('cyberpunk.scale.calibration', {
        inspectAsset: (eye:readonly number[],target:readonly number[]) => {
          if(eye.length!==3||target.length!==3||![...eye,...target].every(Number.isFinite))throw new Error('Finite inspection pose required');
          const dx=target[0]-eye[0],dy=target[1]-eye[1],dz=target[2]-eye[2];
          if(Math.hypot(dx,dy,dz)<.01)throw new Error('Inspection eye and target must differ');
          select(0);yaw=Math.atan2(-dx,-dz);pitch=Math.atan2(dy,Math.hypot(dx,dz));roll=0;
          world.set(cameras[0].entity,Transform,{pos:Array.from(eye),quat:Array.from(quat.fromEuler(quat.create(),pitch,yaw,0,'YXZ'))}).unwrap();
          return {method:'Source-owned fixed inspection pose on the enabled CameraView; saved camera unchanged',eye:Array.from(eye),target:Array.from(target),camera:cameras[0].name};
        },
        enterFirstPerson: () => {enterEntrance();return cameras[selected].name;},
        requestJump: () => {if (!freeMove || !cameras[selected].name.startsWith('FP_')) return false;queuedJump = true;return true;},
        readNavigation: () => ({mode:cameras[selected].name.startsWith('FP_') ? 'first-person' : 'showcase',
          freeMove, camera:cameras[selected].name, eyeHeightM:eyeHeight(), spawn:[...ENTRY.eye], keyboardAllowed, mouseLookCaptured,mouseLocked:lastPointerLocked,yaw,pitch, 
          gravity:BODY.gravity,jumpSpeed:BODY.jumpSpeed,physical:physical!.read()}),
        readCollision: () => ({ready:collisionReady,expected:collisionExpected,pending:collisionPending.size,pendingNames:[...collisionPending],roster:collisionRoster.map(x=>({...x})),excluded:[...collisionExcluded],
          admitted:collisionRoster.filter(x=>world.getResource<PhysicsWorld>('PhysicsWorld').hasBody(x.entity)).length,
          controller:physical!.read()}),
        testPhysical: (right:number,forward:number,ticks:number,jump=false,sprint=false)=>{physical!.diagnostic(right,forward,ticks,jump,sprint);return 'engine-diagnostic intent';},
        resetPhysical: (position:readonly number[],testYaw=0)=>{select(13);yaw=testYaw;pitch=0;roll=0;
          world.set(cameras[13].entity,Transform,{quat:Array.from(quat.fromEuler(quat.create(),0,yaw,0,'YXZ'))}).unwrap();
          physical!.reset(position,1.64);physical!.clearTrace();return 'engine-diagnostic teleport';},
        setHumans: (visible: boolean) => {
          humansVisible = visible;
          for (const e of calibrationMeshes) world.set(e, Visibility, {state: visible ? VisibilityStateValue.inherited : VisibilityStateValue.hidden}).unwrap();
          return humansVisible;
        },
        readNamedBounds: (names: readonly string[]) => JSON.parse(JSON.stringify(readScaleBounds(names))),
        readAllBounds: () => JSON.parse(JSON.stringify(readScaleBounds(Array.from(world.query({read: [Name]}).unwrap(), row => world.get(row.entity, Name).unwrap().value)))),
        setBarLightScale: (scale: number) => setBarLightScale(scale),
        readBarLighting: () => readBarLighting(),
        readLightRefinement: () => readLightRefinement(),
        tuneLight: (name:string,data:any) => lighting.set(name,data),
        setEnvironment: (intensity:number) => {world.set(inspectionLight,Skylight,{intensity}).unwrap();return intensity;},
        setProbe: (intensity:number) => {world.set(roomProbe,ReflectionProbe,{intensity}).unwrap();return intensity;},
        setExposure: (exposure:number) => {if(!Number.isFinite(exposure)||exposure<=0)throw new Error('positive exposure required');for(const c of cameras)world.set(c.entity,Camera,{exposure}).unwrap();return exposure;},
        setAmbient: (rgb:number[]) => {if(rgb.length!==3||!rgb.every(x=>Number.isFinite(x)&&x>=0))throw new Error('finite irradiance required');world.set(inspectionLight,Skylight,{ambientIrradiance:rgb}).unwrap();return rgb;},
        readGlassGuards: () => guards.read(),
        readOtherScreens: () => otherScreens.read(),
        readPlants: () => plantRepair.read(),
        readStageMist: () => stageMist.read(),
        readWetFloor: () => wetFloor.read(),
        setWetFloor: (enabled:boolean) => wetFloor.setWet(enabled),
        setFloorSSR: (enabled:boolean) => wetFloor.setSSR(enabled),
        setStageMist: (enabled:boolean) => {stageMist.setEnabled(enabled);return stageMist.read();},
        setStageMistLights: (enabled:boolean) => {stageMist.setLights(enabled);return stageMist.read();},
        setStageMistAnimate: (enabled:boolean) => {stageMist.setAnimate(enabled);return stageMist.read();},
        readDrinkOptics: () => readDrinkOptics(world,assets),
        setPost: (intensity: number, threshold: number) => setArtPost(intensity, threshold),
        readFault: () => ({status: 'old fault fixture removed with old layout'}),
        readLighting: () => ({ shadowRequests: shadowRequests.map(e => ({name: world.get(e, Name).unwrap().value, light: JSON.parse(JSON.stringify(world.get(e, SpotLight).unwrap()))})),
          inspectionFill, ambientIrradiance: inspectionFill ? inspectionIrradiance : artAmbient, hasHDR: false, hasReflectionProbe: true }),
        readBounds: () => JSON.parse(JSON.stringify(readScaleBounds(measurementNames))),
        readProbes: () => Array.from(world.query({read:[Name, MeshFilter, GlobalTransform]}).unwrap(), row => {
          const name = row.get(Name).value;
          if (!name.startsWith('CALIB')) return null;
          const mesh = assets.read(row.get(MeshFilter).assetHandle).unwrap() as MeshAsset;
          const p = mesh.attributes.position;
          const positions = p instanceof Float32Array ? Array.from(p) : p instanceof ArrayBuffer ? Array.from(new Float32Array(p)) : null;
          return { name, positions, indices: mesh.indices ? Array.from(mesh.indices) : null,
            worldMatrix: Array.from(row.get(GlobalTransform).world) };
        }).filter(row => row !== null),
        select: (index: number) => { if (index < 0 || index >= cameras.length) throw new Error('camera index'); select(index); return cameras[selected].name; },
        readCamera: () => ({name: cameras[selected].name, freeMove, humansVisible,
          position: Array.from(world.get(cameras[selected].entity, Transform).unwrap().pos),
          lens: JSON.parse(JSON.stringify(world.get(cameras[selected].entity, Camera).unwrap())),
          view: JSON.parse(JSON.stringify(world.get(cameras[selected].entity, CameraView).unwrap()))}),
      });
      yield () => world.removeResource('cyberpunk.scale.calibration');
      if (ctx.gameHost?.gameProjection) yield ctx.gameHost.gameProjection.registerRead({
        id: 'cyberpunk.scale-calibration.bounds', title: 'Actual imported mesh world dimensions',
        description: 'Read actual CPU positions through Engine GlobalTransform. Y-up metres.',
        read: () => JSON.parse(JSON.stringify(readScaleBounds(measurementNames))),
      });
      if (ctx.gameHost?.gameProjection) yield ctx.gameHost.gameProjection.registerRead({
        id: 'cyberpunk.scale-calibration.observer', title: 'Underground v3 candidate observer',
        description: 'Default first-person WASD/Space jump; P/R reset, RMB look, Shift sprint; 1–9 original cameras; F1–F8 calibration views; F fixed/free; H reference humans; WASD walk or third-person QE fly; L diagnostic fill. Native capsule / triangle-mesh collision, stair autostep and ground snap; click to lock mouse, Esc releases.',
        read: () => ({ selected: selected + 1, camera: cameras[selected].name, cameraCount: cameras.length, freeMove, humansVisible, units: 'metres', calibrationEyeHeightM: eyeHeight(), viewportAspect: 16 / 9,
          horizontalFovDeg: cameras[selected].horizontalFov * 180 / Math.PI, verticalFovDeg: world.get(cameras[selected].entity, Camera).unwrap().fov * 180 / Math.PI,
          cameras: cameras.map(c => ({ name: c.name, enabled: world.get(c.entity, CameraView).unwrap().enabled })),
          position: Array.from(world.get(cameras[selected].entity, Transform).unwrap().pos),
          cutawayHidden: selected === 7 ? cutaway.map(c => world.get(c.entity, Name).unwrap().value) : [],
          inspectionFill, inspectionFillKind: 'temporary diffuse-only geometry inspection; not art lighting',
          inspectionAmbientIrradiance: inspectionFill ? inspectionIrradiance : artAmbient,
          inspectionFillHasEquirectOrSpecularProbe: false, previewGradeCalibrated: false, sceneGuid: config.scene, status: 'newlayout-runtime-not-art-accepted' }),
      });
    }, 'cyberpunk/newlayout-observer');
  },
};

export default definePack({
  schemaVersion: '2.0.0', plugins: true,
  packageId: definePackageId('61898430-9733-4d13-820b-2c3599a8cab6'),
  build: () => ok({
    'material/drink-shell-d052': drinkShellMaterial(),
    'texture/bar-caustic-d061':causticTextureAsset(),
    'material/hero-refractive-019':heroRefractiveMaterial(),
    ...liquidOpticalAssets(),
    'plugin/hud': {kind:'plugin',module:{specifier:'./pdr-navigation-hud.ts',export:'default'},config:{hud:{$asset:'01cf39db-5c41-4350-ba15-165fa6f1705e'}}},
    'plugin/scene': { kind: 'plugin', module: { specifier: './pdr-newlayout.pack.ts', export: 'scene' },
      config: { scene: { $asset: '01a18cc0-f159-7553-a50c-527de6f6d645' }, wb018Decor: {$asset:'01a19ac5-5ad3-745b-a280-3f341ab888de'}, stageSign: {$asset:'01a19fd2-3fe1-706c-8d9f-456c597a27b3'}, liquidTemplates: [{$asset:'01a19004-fd33-7799-af85-7f526edf0b11'},{$asset:'01a19004-fd34-74bc-a0d4-c9ef090e01ff'},{$asset:'01a19004-fd34-74bc-a0d4-c9f0e787a828'},{$asset:'01a19004-fd34-74bc-a0d4-c9f116fd16e7'},{$asset:'01a19004-fd34-74bc-a0d4-c9f2485cabaf'}], dropletMesh:{$asset:'01a19004-fd34-74bc-a0d4-c9f3e3b1b075'}, glassMaterial:{$asset:GLASS_GUID}, liquidMaterials:liquidOpticalKeys.map(key=>({$asset:liquidOpticalGuid(key)})), barCaustic:{$asset:liquidOpticalGuid('texture/bar-caustic-d061')},heroRefractiveMaterial:{$asset:liquidOpticalGuid('material/hero-refractive-019')}, heroGlassMeshes:[{$asset:'01a19072-2965-797d-9284-3beb445d93b5'},{$asset:'01a19072-2965-797d-9284-3bedd366bfa0'},{$asset:'01a19072-2965-797d-9284-3beae95930bc'},{$asset:'01a19072-2965-797d-9284-3bec88871603'},{$asset:'01a19072-2965-797d-9284-3bee013ae40b'}], chairMesh:{$asset:'01a19043-06fe-7abd-bee2-3bbc7a1d954a'}, headMeshes:[{$asset:'01a19043-06fe-7abd-bee2-3bbe2acfb9a9'},{$asset:'01a19043-06fe-7abd-bee2-3bbf12acefd4'},{$asset:'01a19043-06fe-7abd-bee2-3bbdc32f9c5c'}] } },
  }),
});
