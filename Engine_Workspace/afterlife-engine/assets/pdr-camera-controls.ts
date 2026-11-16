import type {Component, ComponentSchema, EntityHandle, InputShapeOf, World} from '@forgeax/engine/ecs';
import {Name} from '@forgeax/engine/scene';
import {
  ANTIALIAS_FXAA, ANTIALIAS_MSAA, ANTIALIAS_NONE, ANTIALIAS_SMAA, ANTIALIAS_TAA, ANTIALIAS_TSR,
  Atmosphere, BarrelDistortion, Camera, CAMERA_EXPOSURE_MODE_AUTO, DepthOfField, DepthOfFieldQualityValue,
  DirectionalLight, DynamicResolution, Fog, LensEffects, LensFlare, MotionBlur, PlanarReflection, PointLight, RectAreaLight, ScreenSpaceReflection, SpotLight,
  StereoCamera, StereoLayoutValue, TONEMAP_ACES_FILMIC, TONEMAP_AGX, TONEMAP_LINEAR,
  TONEMAP_NEUTRAL, TONEMAP_NONE, TONEMAP_REINHARD, TRANSPARENCY_WEIGHTED_BLENDED,
  resolveDiffuseGiTier, type CameraData, type Renderer,
} from '@forgeax/engine/render';
import {nextHistoryVersion} from './pdr-post-profile-wb017';
import {CAMERA_CONTROLS, type AntialiasMode, type CameraControl, type RenderSwitch, type Tonemap} from './pdr-render-controls-protocol';

export const aaModes = {none:ANTIALIAS_NONE,fxaa:ANTIALIAS_FXAA,smaa:ANTIALIAS_SMAA,taa:ANTIALIAS_TAA,tsr:ANTIALIAS_TSR,msaa:ANTIALIAS_MSAA};
const toneModes = {aces:TONEMAP_ACES_FILMIC,agx:TONEMAP_AGX,neutral:TONEMAP_NEUTRAL,reinhard:TONEMAP_REINHARD,linear:TONEMAP_LINEAR,none:TONEMAP_NONE};
const fogProfiles = {low:{quality:'low',depth:48,tileSize:16},high:{quality:'high',depth:64,tileSize:4}} as const;
const giScene = {
  maxDistance:28, environment:[.025,.025,.045],
  region:{grid:{origin:[-16,-1,-46],dimensions:[64,24,96],spacing:.5,maxDistance:5,coverageDistance:1},
    maxInstances:1024,maxFieldBytes:96*1024*1024,maxSteps:56},
  probeSpacing:2,maxCaptureBytes:48*1024*1024,
} as const;
const optionalEffects = {
  planar:false, contactShadows:false, diffuseGi:false, tracedReflections:false, lensFlare:false,
  depthOfField:false, motionBlur:false, autoExposure:false, weightedTransparency:false,
  dynamicResolution:false, stereo:false, vignette:false, chromaticAberration:false,
  filmGrain:false, barrelDistortion:false,
};
type Effect = keyof typeof optionalEffects;

export function installCameraControls(world: World, cameras: readonly EntityHandle[], renderer: Renderer | undefined,
  bindPlanarFloor: (enabled:boolean)=>void, volumeFogEnabled:()=>boolean) {
  const originals = cameras.map(entity=>({entity,camera:{...world.get(entity,Camera).unwrap()}}));
  const baseline = originals[0].camera;
  const originalProfile = renderer?.inspect({fields:['profile']}).profile;
  const defaultAA = (Object.keys(aaModes) as AntialiasMode[]).find(mode=>aaModes[mode]===baseline.antialias) ?? 'taa';
  const defaultTone = (Object.keys(toneModes) as Tonemap[]).find(mode=>toneModes[mode]===baseline.tonemap) ?? 'aces';
  const defaultFog = originalProfile?.volumetricFog?.quality ?? 'high';
  const enabled={...optionalEffects};
  let contactLight: EntityHandle | undefined;
  let sceneLightsOn=true;
  let giFailure='';
  let aa=defaultAA,tone=defaultTone,scale=1,fogQuality=defaultFog;

  const patchCamera = (data:Partial<CameraData>, resetHistory=false) => {
    for (const entity of cameras) {
      const historyVersion=world.get(entity,Camera).unwrap().historyVersion;
      world.set(entity,Camera,{...data,...resetHistory?{historyVersion:nextHistoryVersion(historyVersion)}:{}}).unwrap();
    }
  };
  const companion = <S extends ComponentSchema>(component:Component<string,S>,data:Partial<InputShapeOf<S>>,on:boolean) => {
    for (const entity of cameras) {
      const exists=world.hasComponent(entity,component);
      if(on&&exists)world.set(entity,component,data).unwrap();
      else if(on)world.addComponent(entity,{component,data}).unwrap();
      else if(exists)world.removeComponent(entity,component).unwrap();
    }
  };
  const support = () => {
    const device=renderer?.inspect({fields:['capabilities','limits']});
    const caps=device?.capabilities;
    const disabled:Partial<Record<RenderSwitch|AntialiasMode,string>>={};
    if(!caps?.compute||!caps.storageBuffer) {
      disabled.diffuseGi='当前后端缺少 GPU 计算或存储缓冲区';
      disabled.tracedReflections=disabled.diffuseGi;
      disabled.autoExposure=disabled.diffuseGi;
    }
    const canDefer=caps?.storageBuffer===true&&caps.maxColorAttachments>=6&&
      (device?.limits?.maxColorAttachmentBytesPerSample??32)>=36;
    if(!canDefer){
      disabled.contactShadows='需要延迟渲染';
      disabled.diffuseGi=disabled.diffuseGi??'需要延迟渲染';
      disabled.tracedReflections=disabled.diffuseGi;
    }
    if(Array.from(world.query({read:[RectAreaLight]}).unwrap()).length){
      disabled.diffuseGi='请先关闭酒吧里的矩形面光源';
      disabled.tracedReflections=disabled.diffuseGi;
    } else if ([PointLight,SpotLight,DirectionalLight].reduce((count, light) =>
      count + Array.from(world.query({read:[light]}).unwrap()).length, 0) > 32) {
      disabled.diffuseGi='实时 GI 最多接受 32 个直射光源。请先暂停补光';
      disabled.tracedReflections=disabled.diffuseGi;
    }
    if(!caps?.rgba16floatRenderable)disabled.lensFlare='需要浮点 HDR 渲染目标';
    if(!(caps?.compute&&caps.storageTexture) && (device?.limits?.maxColorAttachments??0)<3)disabled.tsr='当前后端缺少 TSR 所需的渲染能力';
    if(!caps?.timestampQuery||!caps.timestampPeriodNanoseconds)disabled.dynamicResolution='需要 GPU 时间戳';
    if(aa!=='taa'&&aa!=='tsr')disabled.dynamicResolution='请先选择 TAA 或 TSR';
    if(!caps||!['webgpu','wgpu-native'].includes(caps.backendKind))disabled.msaa='此预览的后端无法启用该 MSAA 配置';
    if(volumeFogEnabled())disabled.msaa='请先关闭体积雾';
    if(Array.from(world.query({read:[Fog]}).unwrap()).length||Array.from(world.query({read:[Atmosphere]}).unwrap()).length){
      disabled.msaa='当前大气效果需要单采样深度';
    }
    if(world.hasComponent(cameras[0],ScreenSpaceReflection))disabled.msaa='请先关闭屏幕空间反射';
    if(enabled.diffuseGi||enabled.tracedReflections||enabled.contactShadows)disabled.msaa='GI、光追反射和接触阴影使用延迟渲染';
    if(aa==='msaa') {
      disabled.ssr='请先切换抗锯齿模式。SSR 会启用延迟渲染';
      disabled.fog='请先切换抗锯齿模式。体积雾需要单采样深度';
      disabled.diffuseGi='请先切换到 TAA 或 TSR';
      disabled.tracedReflections=disabled.diffuseGi;
      disabled.contactShadows=disabled.diffuseGi;
    }
    if(enabled.stereo)disabled.planar='立体相机与平面反射不能同时开启';
    if(enabled.planar)disabled.stereo='请先关闭平面反射';
    return {disabled,hardwareRayQuery:caps?.rayQuery.supported===true};
  };
  const changeProfile = (mode:AntialiasMode, next:typeof enabled, fog:typeof fogQuality) => {
    if(!renderer||!originalProfile)throw Error('渲染器不可用');
    const {diffuseGi:_,...base}=originalProfile;
    const gi=next.diffuseGi||next.tracedReflections;
    const renderPath=mode==='msaa'?'forward':gi||next.contactShadows?'deferred':originalProfile.renderPath;
    if(gi){
      const {capabilities}=renderer.inspect({fields:['capabilities']});
      const {profile}=resolveDiffuseGiTier('medium',giScene,capabilities).unwrap();
      if(!profile.diffuseGi)throw Error('当前设备未通过实时 GI 能力检查');
      const diffuseGi={...profile.diffuseGi,...next.tracedReflections?{reflections:{maxRoughnessToTrace:.4,roughnessFadeLength:.1}}:{}};
      const result=renderer.setProfile({...base,renderPath,ibl:false,volumetricFog:fogProfiles[fog],diffuseGi});
      if(!result.ok)throw result.error;
    }else {
      const result=renderer.setProfile({...base,renderPath,volumetricFog:fog===defaultFog?base.volumetricFog:fogProfiles[fog]});
      if(!result.ok)throw result.error;
    }
  };
  const setEffect = (id:Effect,on:boolean) => {
    if(enabled[id]===on)return;
    if(on&&support().disabled[id])throw Error(support().disabled[id]);
    const next={...enabled,[id]:on};
    if(id==='tracedReflections'&&on)next.diffuseGi=true;
    if(id==='diffuseGi'&&!on)next.tracedReflections=false;
    if(id==='diffuseGi'||id==='tracedReflections'||id==='contactShadows')changeProfile(aa,next,fogQuality);
    if((id==='diffuseGi'||id==='tracedReflections')&&on)giFailure='';
    switch(id){
      case 'depthOfField': companion(DepthOfField,{focusDistance:4,fStop:1.8,maxRadiusPixels:10,quality:DepthOfFieldQualityValue.low},on);break;
      case 'motionBlur': companion(MotionBlur,{shutterAngle:110,maxRadiusPixels:12,sampleCount:6},on);break;
      case 'lensFlare': companion(LensFlare,{intensity:.12,threshold:3.5,bokehSize:3},on);break;
      case 'barrelDistortion': companion(BarrelDistortion,{strength:.075},on);break;
      case 'autoExposure': for(const {entity,camera} of originals)world.set(entity,Camera,{exposureMode:on?CAMERA_EXPOSURE_MODE_AUTO:camera.exposureMode}).unwrap();break;
      case 'weightedTransparency': for(const {entity,camera} of originals)world.set(entity,Camera,{transparency:on?TRANSPARENCY_WEIGHTED_BLENDED:camera.transparency}).unwrap();break;
      case 'dynamicResolution': companion(DynamicResolution,{minScale:.5,maxScale:1,targetGpuMs:16.67},on);patchCamera({},true);break;
      case 'stereo': companion(StereoCamera,{eyeSeparation:.064,convergence:4,layout:StereoLayoutValue['side-by-side']},on);break;
      case 'planar':
        companion(PlanarReflection,{normal:[0,1,0],distance:0,clipBias:.002,distortion:.15,resolutionScale:.35,updateIntervalFrames:2,generateMipmaps:true},on);
        bindPlanarFloor(on);
        break;
      case 'contactShadows':
        if(on) contactLight=world.spawn({component:Name,data:{value:'PDR/接触阴影测试光'}},
          {component:DirectionalLight,data:{direction:[-.4,-1,-.25],color:[1,1,1],intensity:sceneLightsOn ? .12 : 0,castShadow:false,contactShadowLength:.22}}).unwrap();
        else if(contactLight!==undefined){world.despawn(contactLight).unwrap();contactLight=undefined;}
        break;
      case 'vignette': case 'chromaticAberration': case 'filmGrain': {
        companion(LensEffects,{vignetteIntensity:next.vignette ? .33 : 0,chromaticAberration:next.chromaticAberration ? .8 : 0,
          grainIntensity:next.filmGrain ? .13 : 0},next.vignette||next.chromaticAberration||next.filmGrain);
        break;
      }
    }
    Object.assign(enabled,next);
  };
  const setAA = (mode:AntialiasMode) => {
    if(mode===aa)return;
    const reason=support().disabled[mode];if(reason)throw Error(reason);
    if(aa==='msaa'||mode==='msaa')changeProfile(mode,enabled,fogQuality);
    if(mode!=='taa'&&mode!=='tsr')setEffect('dynamicResolution',false);
    patchCamera({antialias:aaModes[mode]},true);
    aa=mode;
  };
  const setTone = (mode:Tonemap) => {patchCamera({tonemap:toneModes[mode]});tone=mode;};
  const setFogQuality = (mode:typeof fogQuality) => {
    if(mode!==fogQuality){changeProfile(aa,enabled,mode);fogQuality=mode;}
  };
  const setCamera = (id:CameraControl,value:number) => {
    const {min,max}=CAMERA_CONTROLS[id];
    if(Number.isFinite(value)&&value>=min&&value<=max)patchCamera({[id]:value});
  };
  const reset = () => {
    for (const id of Object.keys(enabled) as Effect[])setEffect(id,false);
    setAA(defaultAA);setFogQuality(defaultFog);setTone(defaultTone);scale=1;giFailure='';
    for (const {entity,camera} of originals){
      const {exposure,temperature,tint,bloomIntensity}=camera;
      world.set(entity,Camera,{exposure,temperature,tint,bloomIntensity}).unwrap();
    }
  };
  const inspectGi = () => {
    if(!enabled.diffuseGi)return;
    const gi=renderer?.inspect({fields:['diffuseGi']}).diffuseGi;
    if(gi?.state==='failed'){
      setEffect('diffuseGi',false);
      giFailure='实时 GI / 光追初始化失败，已恢复常规渲染';
    }
    return gi;
  };
  const read = () => {
    const {exposure,temperature,tint,bloomIntensity}=world.get(cameras[0],Camera).unwrap();
    const gi=inspectGi();
    const s=support();
    const giState=enabled.diffuseGi
      ? gi?.state==='ready'?'实时 GI 已就绪':'实时 GI 正在准备'
      : giFailure;
    return {effects:{...enabled},antialias:aa,tonemap:tone,fogQuality,renderScale:scale,
      camera:{exposure,temperature,tint,bloomIntensity},unavailable:s.disabled,hardwareRayQuery:s.hardwareRayQuery,giState};
  };
  return {
    read,inspectGi,setEffect,setAA,setTone,setFogQuality,setCamera,reset,ownsEffect:(id:string):id is Effect=>Object.hasOwn(enabled,id),
    setSceneLightsOn:(on:boolean)=>{
      if(on===sceneLightsOn)return;
      sceneLightsOn=on;
      if(contactLight!==undefined)world.set(contactLight,DirectionalLight,{intensity:on ? .12 : 0}).unwrap();
    },
    scale:()=>scale,setScale:(value:number)=>{if([.5,.7,.85,1].includes(value)&&value!==scale){scale=value;patchCamera({},true);}},
  };
}
