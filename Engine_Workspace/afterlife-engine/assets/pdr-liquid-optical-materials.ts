import {Materials} from '@forgeax/engine/render';
import {AssetGuid,definePackageId} from '@forgeax/engine/pack/source';
import {liquidDepthProfiles} from './pdr-liquid-depth-data';

const PACKAGE=definePackageId('61898430-9733-4d13-820b-2c3599a8cab6');
export const liquidOpticalGuid=(key:string)=>AssetGuid.format(AssetGuid.derive(PACKAGE,key));
export const liquidOpticalKeys=liquidDepthProfiles.map(p=>'material/liquid-depth-d053/'+p.type.toLowerCase());
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
// Per-metre absorption coefficients. Pigment belongs to volume absorption,
// not a white diffuse surface tinted pink. These are authored cocktail values.
const absorption=[[.08,.04,.02],[2,15,9],[1.2,7,18],[.2,10,4],[2.2,10,22]];

export function liquidOpticalAssets(){
 const result:Record<string,any>={};
 const sampler='sampler/liquid-depth-d053';
 result[sampler]={kind:'sampler',magFilter:'linear',minFilter:'linear',mipmapFilter:'nearest',addressModeU:'clamp-to-edge',addressModeV:'clamp-to-edge'};
 for(let k=0;k<liquidDepthProfiles.length;k++){
  const p=liquidDepthProfiles[k],W=128,H=128,data=new Uint8Array(W*H*4),ior=k===3?1.34:1.36;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
   const u=(x+.5)/W,v=(y+.5)/H;let distance:number;
   if(u>.5){
    const radial=clamp((u-.55)/.4),q=radial*32,a=Math.floor(q),b=Math.min(32,a+1);
    const bottom=p.bottomByRadius[a]*(1-(q-a))+p.bottomByRadius[b]*(q-a);
    const cosInside=Math.sqrt(1-(1-v*v)/(ior*ior));
    distance=Math.max(0,p.top-.0015-bottom)/cosInside;
   }else{
    const cosAir=clamp((u-.05)/.4),cosInside=Math.sqrt(1-(1-cosAir*cosAir)/(ior*ior));
    // Finite-column chord approximation, clipped by the nearby end cap.
    const chord=2*p.radius*cosInside,cap=(p.top-p.lo)*Math.min(1,Math.max(.08,v/.45));
    distance=Math.min(chord,cap);
   }
   const value=Math.round(clamp(distance/.30)*255),i=(x+y*W)*4;
   data[i]=255;data[i+1]=value;data[i+2]=255;data[i+3]=255;
  }
  const texture='texture/liquid-depth-d053/'+p.type.toLowerCase();
  result[texture]={kind:'texture',shape:{viewDimension:'2d',extent:{width:W,height:H}},format:'rgba8unorm',data,colorSpace:'linear',mips:{kind:'none'}};
  const material=Materials.standard({staticSwitches:{diffuseTransmission:true},baseColor:[1,1,1,1],metallic:0,roughness:.025,specular:1,ior,transmission:1,thickness:.30,
   attenuationColor:absorption[k].map(c=>Math.exp(-c*.1)) as [number,number,number],attenuationDistance:.1,diffuseTransmission:1,diffuseTransmissionColor:[0,0,0],
   thicknessTexture:{texture:liquidOpticalGuid(texture),sampler:liquidOpticalGuid(sampler),coordinates:{set:1}},renderState:{cullMode:'back',depthWriteEnabled:false}});
  // Clear liquids have no diffuse scattering lobe. The documented native
  // diffuse-energy split removes the residual diffuse term while retaining
  // Standard's specular interface, Beer absorption and backdrop transmission.
  result[liquidOpticalKeys[k]]=material;
 }
 return result;
}
