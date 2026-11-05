import {Materials} from '@forgeax/engine/render';
/** Build-time only factory, published inside the existing scene Pack. */
export function drinkShellMaterial(){
 const reference=Materials.standard({baseColor:[0,0,0,1],metallic:0,roughness:.025,ior:1.5,specular:1,transmission:0});
 if(!reference.parameters||!reference.values)throw new Error('D052 Standard parameter contract unavailable');
 return Materials.standard({surfaceModule:'cyberpunk_pdr::drink_reflective_shell',parameters:reference.parameters,values:{...reference.values,alphaMode:0},
  renderState:{cullMode:'back',depthWriteEnabled:false,blend:{color:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'}}}});
}
