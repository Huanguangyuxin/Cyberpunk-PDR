import type {World} from '@forgeax/engine/ecs';
import {Name, Transform} from '@forgeax/engine/scene';
import specification from './pdr-furniture-clearance.json';

/** Apply authored root displacements after seating layout and before lights and trimesh registration. */
export function applyFurnitureClearance(world:World){
  const roots=new Map(Array.from(world.query({read:[Name,Transform]}).unwrap(),
    row=>[row.get(Name).value,row.entity] as const));
  const placements=specification.groups.flatMap(({roots:names,delta})=>names.map(name=>{
    const entity=roots.get(name);
    if(entity===undefined)throw new Error('Missing furniture clearance root '+name);
    const original=Array.from(world.get(entity,Transform).unwrap().pos);
    return {entity,original,position:original.map((v,i)=>v+delta[i])};
  }));
  for(const {entity,position} of placements)world.set(entity,Transform,{pos:position}).unwrap();
  return ()=>{for(const {entity,original} of placements)world.set(entity,Transform,{pos:original}).unwrap();};
}
