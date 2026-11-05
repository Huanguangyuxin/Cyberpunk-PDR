/** Codex native lighting refinement010. Retunes existing fixtures; adds no light. */
import type {World} from '@forgeax/engine/ecs';
import {Name} from '@forgeax/engine/scene';
import {PointLight,SpotLight} from '@forgeax/engine/render';

type Tune={intensity:number;range:number;color?:number[];direction?:number[];innerConeDeg?:number;outerConeDeg?:number};
const TUNING:Record<string,Tune>={
  'HF-01':{intensity:1600,range:18,color:[.25,.40,1],direction:[.05,-1,-.10],innerConeDeg:35,outerConeDeg:62},
  'HF-02':{intensity:1800,range:18,innerConeDeg:28,outerConeDeg:50},
  'HF-03':{intensity:2000,range:18,color:[.70,.50,1],direction:[-.15,-1,-.15],innerConeDeg:35,outerConeDeg:60},
  'ST-01':{intensity:900,range:15,color:[.40,.58,1],direction:[-.03,-1,.15],innerConeDeg:30,outerConeDeg:50},
  'BK-01':{intensity:240,range:7,color:[.75,.15,.42],innerConeDeg:32,outerConeDeg:55},
  'BK-02':{intensity:240,range:7,color:[.18,.50,1],innerConeDeg:32,outerConeDeg:55},
  'BK-03':{intensity:240,range:7,color:[.72,.20,.65],innerConeDeg:32,outerConeDeg:55},
  'BS-01':{intensity:260,range:4},'BS-02':{intensity:280,range:4},'BS-03':{intensity:180,range:4},
  'BW-01':{intensity:220,range:6},'BW-02':{intensity:220,range:6},'BW-03':{intensity:180,range:6},
  'BT-01':{intensity:8,range:2},'BT-02':{intensity:8,range:2},'BT-03':{intensity:8,range:2},
  'UV-01':{intensity:220,range:6},'UV-02':{intensity:200,range:6},
  'UV-03':{intensity:220,range:6},'UV-04':{intensity:180,range:6},
  'DD-01':{intensity:55,range:5},'SV-01':{intensity:50,range:5},'SV-02':{intensity:50,range:5},
};

export function refineExistingLighting(world:World) {
  const point=Array.from(world.query({read:[Name,PointLight]}).unwrap(),row=>({
    entity:row.entity,name:row.get(Name).value,before:JSON.parse(JSON.stringify(row.get(PointLight))),
  }));
  const spot=Array.from(world.query({read:[Name,SpotLight]}).unwrap(),row=>({
    entity:row.entity,name:row.get(Name).value,before:JSON.parse(JSON.stringify(row.get(SpotLight))),
  }));
  if(point.length+spot.length!==32)throw new Error('Lighting010 requires exactly32 original Point/Spot lights');
  for(const row of point)if(TUNING[row.name])world.set(row.entity,PointLight,TUNING[row.name]).unwrap();
  for(const row of spot)if(TUNING[row.name])world.set(row.entity,SpotLight,TUNING[row.name]).unwrap();
  return ()=>({author:'Codex; Engine-only refinement010, not a Gemini DCC result',nativeCount:32,
    units:{intensity:'candela',range:'metres',color:'linear RGB',cone:'half-angle degrees'},
    lights:[...point.map(row=>({name:row.name,type:'point',imported:row.before,runtime:JSON.parse(JSON.stringify(world.get(row.entity,PointLight).unwrap()))})),
      ...spot.map(row=>({name:row.name,type:'spot',imported:row.before,runtime:JSON.parse(JSON.stringify(world.get(row.entity,SpotLight).unwrap()))}))]});
}
