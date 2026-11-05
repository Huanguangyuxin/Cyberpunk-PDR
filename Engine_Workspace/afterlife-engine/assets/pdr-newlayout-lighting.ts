/** Codex new-layout Engine lighting. Actual cd/range, not a Blender-W conversion. */
import type {World} from '@forgeax/engine/ecs';
import {Name} from '@forgeax/engine/scene';
import {PointLight,SpotLight} from '@forgeax/engine/render';
export function tuneNewLayout(world:World){
 const points=Array.from(world.query({read:[Name,PointLight]}).unwrap(),r=>({entity:r.entity,name:r.get(Name).value,kind:'point',before:JSON.parse(JSON.stringify(r.get(PointLight)))}));
 const spots=Array.from(world.query({read:[Name,SpotLight]}).unwrap(),r=>({entity:r.entity,name:r.get(Name).value,kind:'spot',before:JSON.parse(JSON.stringify(r.get(SpotLight)))}));
 const stageWash:Record<string,unknown>={"L22_STAGE_HEAD_1": {"direction": [0.46, -0.886, 0.058], "intensity": 1100, "range": 18, "color": [0.22, 0.32, 1], "innerConeDeg": 22, "outerConeDeg": 38}, "L23_STAGE_HEAD_2": {"direction": [0.7267514684202935, -0.5829152691739525, -0.36337596523821675], "intensity": 950, "range": 18, "color": [1, 0.16, 0.55], "innerConeDeg": 18, "outerConeDeg": 32}, "L26_STAGE_HEAD_5": {"direction": [-0.7267514684202935, -0.5829152691739525, -0.36337596523821675], "intensity": 950, "range": 18, "color": [0.28, 0.18, 1], "innerConeDeg": 18, "outerConeDeg": 32}, "L27_STAGE_HEAD_6": {"direction": [-0.46, -0.886, 0.058], "intensity": 850, "range": 18, "color": [1, 0.48, 0.75], "innerConeDeg": 22, "outerConeDeg": 38}};
 const rows=[...points,...spots];if(rows.length!==32)throw new Error('New club requires32native lights');
 for(const r of rows){
  const n=Number(r.name.slice(1,3));let data:any;
  // D059: the hero drinks sit under the existing central canopy source L02.
  // With clear-liquid diffuse removed, restore readable real illumination there.
  if(n<=3)data={intensity:n===2?65:18,range:9,color:n===2?[1,.45,.70]:[1,.25,.58]};
  else if(n<=5)data={intensity:8,range:6,color:[1,.12,.5]};
  else if(n<=11)data={intensity:32,range:5,color:[1,.62,.36]};
  else if(n<=14)data={intensity:1100,range:24,innerConeDeg:36,outerConeDeg:62,color:[.62,.71,1]};
  else if(n===15)data={intensity:420,range:16,innerConeDeg:36,outerConeDeg:60};
  else if(n<=17)data={intensity:220,range:18,innerConeDeg:38,outerConeDeg:65,color:[.40,.55,1]};
  else if(n===18)data={intensity:600,range:20,innerConeDeg:36,outerConeDeg:60,color:[.58,.52,1]};
  else if(n<=21)data={intensity:1450,range:25,innerConeDeg:38,outerConeDeg:64,color:[.30,.46,1]};
  else if(n<=27)data={intensity:700,range:22};
  else data={intensity:n===28?130:240,range:13,color:[1,.62,.35]};
  if(r.name.includes('CEIL_L'))data.color=n%2?[.40,.13,1]:[1,.16,.58];
  else if(r.name.includes('UPLIGHT'))data.color=[.38,.12,1];
  else if(n===18||n===15)data.color=[.8,.18,.65];
  if(stageWash[r.name])data={...data,...stageWash[r.name] as object};
  if(r.name.includes('_VIP_'))data={intensity:350,range:9,color:[1,.18,.58]};
  world.set(r.entity,r.kind==='point'?PointLight:SpotLight,data).unwrap();
 }
 const readLive=(entity:(typeof rows)[number]['entity'])=>world.hasComponent(entity,SpotLight)
  ?world.get(entity,SpotLight).unwrap():world.get(entity,PointLight).unwrap();
 const read=()=>({author:'Codex native runtime tuning014, not DCC lighting',nativeCount:rows.length,units:'candela/metres/linear RGB',lights:rows.map(r=>({...r,runtime:JSON.parse(JSON.stringify(readLive(r.entity)))}))});
 return {read,set:(name:string,data:any)=>{const r=rows.find(x=>x.name===name);if(!r)throw new Error('Unknown new light');if(world.hasComponent(r.entity,SpotLight))world.set(r.entity,SpotLight,data).unwrap();else world.set(r.entity,PointLight,data).unwrap();return read();}};
}
