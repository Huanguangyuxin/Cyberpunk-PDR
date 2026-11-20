import type {AssetRegistry} from '@forgeax/engine/assets-runtime';
import type {World} from '@forgeax/engine/ecs';
import {MeshFilter,MeshRenderer} from '@forgeax/engine/render';
import {Name,Transform} from '@forgeax/engine/scene';
import recipe from './pdr-foyer-refit.json';

export function installFoyerRefit(world:World,assets:AssetRegistry){
  const undo:(()=>void)[]=[];
  const removed:Record<string,number>={};
  const emptyNodes:string[]=[];
  const moves:Record<string,number[]>=recipe.moves;
  const rows=Array.from(world.query({read:[Name,MeshFilter]}).unwrap(),row=>({
    entity:row.entity,name:row.get(Name).value,original:row.get(MeshFilter).assetHandle,
  }));
  try{
    for(const {entity,name,original} of rows){
      const delta=moves[name];
      if(delta){
        const [x,y,z]=world.get(entity,Transform).unwrap().pos;
        world.set(entity,Transform,{pos:[x+delta[0],y+delta[1],z+delta[2]]}).unwrap();
        undo.push(()=>{world.set(entity,Transform,{pos:[x,y,z]}).unwrap();});
      }
      const rules=recipe.retire.filter(rule=>rule.object===name);
      if(!rules.length)continue;
      const source=assets.read(original).unwrap();
      const indices=source.indices, positions=source.attributes.position;
      if(!indices||!(positions instanceof Float32Array))throw new Error('Missing foyer mesh geometry '+name);
      const retained:number[]=[];
      const submeshes=source.submeshes.flatMap(part=>{
        const slot=source.materialSlots[part.materialSlot].slotName;
        const slotRules=rules.filter(rule=>rule.slot===slot||rule.slot==='*');
        const start=retained.length;
        for(let i=part.indexOffset;i<part.indexOffset+part.indexCount;i+=3){
          const a=indices[i],b=indices[i+1],c=indices[i+2];
          const retire=slotRules.some(rule=>!rule.min||rule.min.every((low,k)=>{
            const center=(positions[a*3+k]+positions[b*3+k]+positions[c*3+k])/3;
            return center>=low&&center<=rule.max![k];
          }));
          if(retire){
            const key=name+'/'+slot;
            removed[key]=(removed[key]??0)+1;
          }else retained.push(a,b,c);
        }
        const count=retained.length-start;
        return count?[{...part,indexOffset:start,indexCount:count}]:[];
      });
      if(retained.length===indices.length)continue;
      if(!retained.length){
        // Hierarchy deduplication can already have retired every other print.
        // Preserve the named transform, but publish neither geometry nor a renderer.
        const renderer=world.get(entity,MeshRenderer);
        if(renderer.ok){
          const saved={...renderer.value,materials:Array.from(renderer.value.materials)};
          world.removeComponent(entity,MeshRenderer).unwrap();
          undo.push(()=>{world.addComponent(entity,{component:MeshRenderer,data:saved}).unwrap();});
        }
        world.removeComponent(entity,MeshFilter).unwrap();
        undo.push(()=>{world.addComponent(entity,{component:MeshFilter,data:{assetHandle:original}}).unwrap();});
        emptyNodes.push(name);
        continue;
      }
      const replacement=assets.create({...source,indices:Uint32Array.from(retained),submeshes}).unwrap();
      undo.push(()=>{world.set(entity,MeshFilter,{assetHandle:original}).unwrap();assets.release(replacement).unwrap();});
      world.set(entity,MeshFilter,{assetHandle:replacement}).unwrap();
    }
  }catch(error){while(undo.length)undo.pop()!();throw error;}
  return {removed,emptyNodes,dispose(){while(undo.length)undo.pop()!();}};
}
