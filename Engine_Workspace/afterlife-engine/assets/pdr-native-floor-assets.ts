import type {MaterialTextureValue} from '@forgeax/engine/types';
import {AssetGuid,definePackageId} from '@forgeax/engine/pack/source';
import {nativeFloorMaterial, type NativeFloorInputs} from './pdr-native-floor-material';
import {nativeFloorInputs} from './pdr-native-floor-inputs';
import {installedFloorInputs} from './pdr-installed-finish-ids';

const PACKAGE=definePackageId('61898430-9733-4d13-820b-2c3599a8cab6');
export const nativeFloorGuid=(key:string)=>AssetGuid.format(AssetGuid.derive(PACKAGE,key));
export const nativeFloorMaterialKey=(slot:string,installed=false)=>{
  if(slot!=='M_FLOOR_TILE'&&slot!=='M_DANCE_TILE')throw new Error('D112 unknown native ground tile '+slot);
  return (installed?'material/native-floor-d186/':'material/native-floor-d112/')+slot.toLowerCase().replaceAll('_','-');
};
export function nativeFloorAssets(){
  const result:Record<string,any>={};
  const nativeSampler='sampler/native-floor-d112',detailSampler='sampler/native-floor-d186',macroSampler='sampler/macro-floor-d112';
  result[nativeSampler]={kind:'sampler',magFilter:'linear',minFilter:'linear',mipmapFilter:'linear',addressModeU:'repeat',addressModeV:'repeat',maxAnisotropy:8};
  result[detailSampler]={...result[nativeSampler],maxAnisotropy:16};
  result[macroSampler]={kind:'sampler',magFilter:'linear',minFilter:'linear',mipmapFilter:'linear',addressModeU:'clamp-to-edge',addressModeV:'clamp-to-edge',maxAnisotropy:4};
  const wet='texture/wet-mask-d112',film='texture/film-normal-d112';
  result[wet]={kind:'texture',shape:{viewDimension:'2d',extent:{width:1,height:1}},format:'rgba8unorm',colorSpace:'linear',data:new Uint8Array([0,128,0,255]),mips:{kind:'none'}};
  result[film]={kind:'texture',shape:{viewDimension:'2d',extent:{width:1,height:1}},format:'rgba8unorm',colorSpace:'linear',data:new Uint8Array([128,128,255,255]),mips:{kind:'none'}};
  const macro=(key:string)=>({texture:nativeFloorGuid(key),sampler:nativeFloorGuid(macroSampler),coordinates:{set:1}});
  const sources=[{map:nativeFloorInputs,installed:false},{map:installedFloorInputs,installed:true}];
  for(const {map,installed} of sources)for(const [slot,original]of Object.entries(map)){
    const withSampler=(value:MaterialTextureValue)=>({...value,sampler:nativeFloorGuid(installed?detailSampler:nativeSampler)});
    const inputs:NativeFloorInputs={...original,
      baseColorTexture:withSampler(original.baseColorTexture),metallicRoughnessTexture:withSampler(original.metallicRoughnessTexture),
      normalTexture:withSampler(original.normalTexture),occlusionTexture:withSampler(original.occlusionTexture),
      wetMaskTexture:macro(wet),filmNormalTexture:macro(film)};
    const key = nativeFloorMaterialKey(slot,installed);
    result[key]=nativeFloorMaterial(inputs);
    result[key+'/planar']=nativeFloorMaterial(inputs, true);
  }
  return result;
}
