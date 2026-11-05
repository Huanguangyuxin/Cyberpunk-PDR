import {Materials} from '@forgeax/engine/render';
/** Full native glass is placed after the fork's completed inner-liquid stage. */
export function heroRefractiveMaterial(){
 const root=Materials.standard({staticSwitches:{diffuseTransmission:true},baseColor:[1,1,1,1],metallic:0,
  roughness:.025,ior:1.5,specular:1,transmission:1,thickness:.0015,
  attenuationColor:[.98,.995,1],attenuationDistance:.5,diffuseTransmission:1,diffuseTransmissionColor:[0,0,0],
  renderState:{cullMode:'back',depthWriteEnabled:false}});
 const passes=root.passes;if(!passes)throw new Error('019 glass Standard passes missing');
 const forward=passes.find(p=>p.name==='forward');if(!forward)throw new Error('019 glass Forward pass missing');
 const outer={...forward,renderState:{...forward.renderState,tags:{LightMode:'Forward',RefractionLayer:'1'}}};
 const back={...forward,name:'glass-back-019',renderState:{...forward.renderState,cullMode:'front',tags:{LightMode:'TransmissionBack',RefractionLayer:'1'}}};
 return {...root,passes:[back,...passes.map(p=>p===forward?outer:p)] as typeof passes};
}
