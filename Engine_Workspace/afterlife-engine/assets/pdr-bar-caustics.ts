/** Physical rest-pose photon bake projected by one existing native Spot source.
 * Fixed two-glass/counter setup only; no claim of general dynamic caustics. */
import {SpotLight} from '@forgeax/engine/render';
import {Name} from '@forgeax/engine/scene';
import type {World} from '@forgeax/engine/ecs';
import type {AssetRegistry} from '@forgeax/engine/assets-runtime';
import cookieBytes from './pdr-caustic-cookie-data.json';

export function causticTextureAsset(){
 if(cookieBytes.length!==256*256*4)throw new Error('D061 physical caustic data length');
 return {kind:'texture' as const,shape:{viewDimension:'2d' as const,extent:{width:256,height:256}},format:'rgba8unorm' as const,
  data:new Uint8Array(cookieBytes),colorSpace:'linear' as const,mips:{kind:'none' as const}};
}
export async function installBarCaustic(world:World,assets:AssetRegistry,guid:string){
 const texture=(await assets.load(assets.parseGuid(guid),'texture')).unwrap();
 const lights=Array.from(world.query({read:[Name,SpotLight]}).unwrap(),row=>({entity:row.entity,name:row.get(Name).value}));
 const light=lights.find(x=>x.name==='L02_BAR_CANOPY');if(!light)throw new Error('D061 L02 native Spot missing');
 const before=world.get(light.entity,SpotLight).unwrap();
 world.set(light.entity,SpotLight,{cookie:texture,intensity:before.intensity*1.2,rollDeg:0}).unwrap();
 const read=()=>({kind:'Physical2glass rest-pose BVH photon cache on native L02 Spot cookie; not general runtime ray caustics',
  light:light.name,textureSize:256,lightCountAdded:0,cookieGain:1.2,receiverHeightM:1.10002,
  tracedPhotons:102400,hitRays:9404,interfaceEvents:46367,peakIrradianceRatio:1.1663841358,
  limitations:['Fixed rest surface, fixed lamp/receiver','Sixteen-interface path cap;651truncated rays','Front glass still Fresnel-only; full nested camera refraction not implemented']});
 world.insertResource('cyberpunk.bar.caustics',{read});
 return {read,dispose:()=>{world.set(light.entity,SpotLight,before).unwrap();world.removeResource('cyberpunk.bar.caustics');assets.release(texture).unwrap();}};
}
