import type {Component,World} from '@forgeax/engine/ecs';
import {PointLight, RectAreaLight, SpotLight} from '@forgeax/engine/render';
import {Name, Transform} from '@forgeax/engine/scene';
import spec from './pdr-fixed-lighting.json';

export const fixedShadowNumbers = spec.shadowNumbers;
export const fixedLightCapacity = 32 as const;
if(fixedLightCapacity!==spec.nativeSlots)throw Error('Invalid fixed lighting profile');
export function isMergedLight(name:string) {
  return spec.merges.some(group=>group.members.some(member=>typeof member==='number'
    ? name.startsWith('L'+String(member).padStart(2,'0')+'_')
    : name==='PDR/bar local reflector/'+member));
}

export function installFixedLighting(world:World) {
  type LocalEmitter=Component<string,{readonly intensity:'f32';readonly range:'f32'}>;
  const components:LocalEmitter[]=[PointLight,RectAreaLight,SpotLight];
  const rows=components.flatMap(component=>Array.from(world.query({read:[Name,component,Transform]}).unwrap(), r=>({
    entity:r.entity, component, name:r.get(Name).value,
  })));
  const named=(id:string|number)=>rows.find(row=>typeof id==='number'
    ? row.name.startsWith('L'+String(id).padStart(2,'0')+'_')
    : row.name==='PDR/bar local reflector/'+id);
  const undo:(()=>void)[]=[];
  const restore=()=>{while(undo.length)undo.pop()!();};
  try {
    for(const merge of spec.merges) {
      const owner=named(merge.owner);
      if(!owner)throw Error('Fixed light owner missing: '+merge.owner);
      const {entity,component}=owner;
      const original={...world.get(entity,component).unwrap()};
      const position=Array.from(world.get(entity,Transform).unwrap().pos);
      if(merge.position)world.set(entity,Transform,{pos:merge.position}).unwrap();
      const {owner:_owner,members,position:_position,...shape}=merge;
      world.set(entity,component,shape).unwrap();
      undo.push(()=>{world.set(entity,component,original).unwrap();world.set(entity,Transform,{pos:position}).unwrap();});
      for(const member of members) {
        const source=named(member);
        if(!source)throw Error('Fixed light member missing: '+member);
        const data={...world.get(source.entity,source.component).unwrap()};
        world.set(source.entity,source.component,{intensity:0}).unwrap();
        undo.push(()=>{world.set(source.entity,source.component,data).unwrap();});
      }
    }
    const read=()=>{
      const all=rows.flatMap(({name,component,entity})=>{
        const light=world.get(entity,component);
        return light.ok?[{name,kind:component.name,intensity:light.value.intensity,range:light.value.range}]:[];
      }).sort((a,b)=>a.name.localeCompare(b.name));
      const fixtures=all.filter(light=>!isMergedLight(light.name));
      return {capacity:fixedLightCapacity,nativeCount:fixtures.length,activeCount:all.filter(l=>l.intensity>0).length,
        shadowNumbers:fixedShadowNumbers,fixtures,merged:spec.merges.map(({owner,members})=>({owner,members}))};
    };
    if(read().nativeCount>fixedLightCapacity)throw Error('D189 exceeds its native light allocation');
    return {read,restore};
  }catch(error){restore();throw error;}
}
