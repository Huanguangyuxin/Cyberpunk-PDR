import type {World, EntityHandle} from '@forgeax/engine/ecs';
import type {AssetRegistry} from '@forgeax/engine/assets-runtime';
import {Name} from '@forgeax/engine/scene';
import {Materials, MeshFilter, MeshRenderer} from '@forgeax/engine/render';

import {drinkShellMaterial} from './pdr-drink-shell-material';

const legacyFill: Record<string, number> = {
  STAIR_E:4, STAIR_W:4, RAIL_GAL_E:2, RAIL_GAL_W:2, RAIL_DECK_SOUTH:2, RAIL_BRIDGE_NORTH:2,
};

export function installGlassGuardTrial(world: World, assets: AssetRegistry) {
  // Distances are metres. Laminated rails have a light green interlayer.
  // Smoked door glass absorbs more light over the same optical path.
  function pane(roughness:number, thickness:number, absorption:[number,number,number], distance:number) {
    return assets.create(Materials.standard({
      baseColor:[1,1,1,1], metallic:0, specular:1, roughness, ior:1.52, transmission:1,
      thickness, attenuationColor:absorption, attenuationDistance:distance,
      renderState:{cullMode:'back'},
    })).unwrap();
  }
  const rail = pane(.085,.012,[.60,.82,.74],.020);
  const door = pane(.12,.010,[.45,.63,.60],.013);
  // The flat gallery panes have actual 10 mm bodies. Render one Fresnel interface
  // onto the real hall backdrop. Refraction here can expose the screen capture fallback.
  const observationWindow=assets.create(drinkShellMaterial()).unwrap();
  const saved:{entity:EntityHandle;name:string;materials:number[]}[]=[];
  let ready=false;
  let pending=Object.keys(legacyFill);
  function tick() {
    if (ready) return;
    const rows=Array.from(world.query({read:[Name,MeshFilter,MeshRenderer]}).unwrap(), row=>({
      entity:row.entity, name:row.get(Name).value, mesh:assets.read(row.get(MeshFilter).assetHandle),
      materials:Array.from(row.get(MeshRenderer).materials),
    }));
    pending=Object.keys(legacyFill).filter(name=>!rows.some(row=>row.name===name && row.mesh.ok));
    if (pending.length) return;
    for (const row of rows) {
      if (!row.mesh.ok || row.mesh.value.kind!=='mesh') continue;
      let changed=false;
      const materials=row.mesh.value.materialSlots.map((slot,index)=>{
        const name=slot.slotName.replace(/^WB015_/,'');
        if (name==='M_GLASS_DOOR') {
          changed=true;
          return /^VIP_[EW][12]_SHELL$/.test(row.name) ? observationWindow : door;
        }
        if (name==='M_GLASS_GUARD' || (name==='M_LATTICE_STEEL' && legacyFill[row.name]===index)) {
          changed=true; return rail;
        }
        return row.materials[index] ?? 0;
      });
      if (!changed) continue;
      saved.push({entity:row.entity,name:row.name,materials:row.materials});
      world.set(row.entity,MeshRenderer,{materials}).unwrap();
    }
    ready=true;
  }
  return {tick,read:()=>({ready,pending,adopted:saved.map(row=>row.name),glassHandle:rail,values:assets.read(rail).unwrap()}),
    dispose:()=>{
      for(const row of saved) if(world.hasComponent(row.entity,MeshRenderer)) world.set(row.entity,MeshRenderer,{materials:row.materials}).unwrap();
      assets.release(rail).unwrap();
      assets.release(door).unwrap();
      assets.release(observationWindow).unwrap();
    }};
}
