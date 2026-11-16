import type {AssetRegistry} from '@forgeax/engine/assets-runtime';
import type {EntityHandle, World} from '@forgeax/engine/ecs';
import {MeshFilter, MeshRenderer, SpotLight} from '@forgeax/engine/render';
import {Name, Transform} from '@forgeax/engine/scene';
import {loadFixtureMeshes} from './pdr-fixtures-d051';

const positions = [
  {id:'E1', pos:[12.02,6.90,-30.71]},
  {id:'E2', pos:[12.02,6.90,-40.96]},
  {id:'W1', pos:[-12.02,6.90,-30.71]},
  {id:'W2', pos:[-12.02,6.90,-40.96]},
  {id:'stage', pos:[0,4.65,-39.45]},
] as const;
const fixtureName = (id:string) => id==='stage' ? 'PDR/stage-mirror-ball' : `PDR/vip-ball/${id}`;
const projectorName = (id:string) => `${fixtureName(id)}/projector`;

export function mirrorBallLightLabel(name:string) {
  const fixture = positions.find(({id})=>projectorName(id)===name);
  if (fixture?.id==='stage') return {name:'主舞台镜面球投光',group:'stage'} as const;
  if (fixture) return {name:`VIP ${fixture.id} 灯球投影`,group:'vip'} as const;
}

function projectionTexture() {
  const size = 128;
  const data = new Uint8Array(size*size*4);
  const spots = Array.from({length:26},(_,i)=>{
    const angle = i*2.399963;
    const distance = .40*Math.sqrt((i+.65)/26);
    return {x:.5+Math.cos(angle)*distance, y:.5+Math.sin(angle)*distance,
      radius:.018+.012*((i*7)%9)/8, peak:.66+.34*((i*11)%13)/12};
  });
  for (let y=0; y<size; y++) for (let x=0; x<size; x++) {
    let light = 0;
    for (const spot of spots) {
      const d = Math.hypot((x+.5)/size-spot.x,(y+.5)/size-spot.y)/spot.radius;
      light = Math.max(light,spot.peak*Math.max(0,1-d*d)**2);
    }
    const value = Math.round(light*255);
    data.set([value,value,value,255],(y*size+x)*4);
  }
  return {kind:'texture' as const, shape:{viewDimension:'2d' as const,extent:{width:size,height:size}},
    data,format:'rgba8unorm' as const,colorSpace:'linear' as const,mips:{kind:'none' as const}};
}

export async function installMirrorBalls(world:World, assets:AssetRegistry, guids:readonly string[]) {
  const loaded = await loadFixtureMeshes(assets,guids);
  const [ballMesh,mountMesh] = loaded.rows;
  const entities: EntityHandle[] = [];
  const fixtures: {id:string;ball:EntityHandle;projector:EntityHandle;isStage:boolean}[] = [];
  const cookie = assets.create(projectionTexture()).unwrap();
  const dispose = () => {
    for (const entity of entities) world.despawn(entity).unwrap();
    assets.release(cookie).unwrap();
    loaded.dispose();
  };
  try {
    for (const {id,pos} of positions) {
      const isStage = id==='stage';
      const ballScale = isStage ? 1.25 : 1;
      const mountHeightScale = isStage ? .04 : 1;
      // Preserve the joint above the rotating stem while shortening the VIP mount
      // to attach to the lower front rail of the existing stage truss.
      const mountY = pos[1]+.34*(ballScale-mountHeightScale);
      const spawnMesh = (suffix:string, template:typeof ballMesh, position:number[], scale:number[]) => {
        const entity = world.spawn(
          {component:Name,data:{value:`${fixtureName(id)}/${suffix}`}},
          {component:Transform,data:{pos:position,scale}},
          {component:MeshFilter,data:{assetHandle:template.handle}},
          {component:MeshRenderer,data:{materials:template.materials}},
        ).unwrap();
        entities.push(entity);
        return entity;
      };
      const mountWidth = isStage ? .70 : 1;
      spawnMesh('ceiling-mount',mountMesh,[pos[0],mountY,pos[2]],[mountWidth,mountHeightScale,mountWidth]);
      const ball = spawnMesh('sphere',ballMesh,[...pos],[ballScale,ballScale,ballScale]);
      const projector = world.spawn(
        {component:Name,data:{value:projectorName(id)}},
        {component:Transform,data:{pos:[pos[0],pos[1]-.302*ballScale,pos[2]]}},
        {component:SpotLight,data:{
          ...(isStage
            ? {color:[.75,.90,1],intensity:2150,range:11,innerConeDeg:45,outerConeDeg:57}
            : {color:[.62,.82,1],intensity:730,range:6.1,innerConeDeg:35,outerConeDeg:47}),
          direction:[0,-1,0],castShadow:false,cookie}},
      ).unwrap();
      entities.push(projector);
      fixtures.push({id,ball,projector,isStage});
    }
  } catch(error) {
    dispose();
    throw error;
  }
  const startedAt = performance.now();
  let last = -1;
  const tick = () => {
    const time = (performance.now()-startedAt)*.001;
    if (last>=0 && time-last<1/20) return;
    last = time;
    for (const [i,fixture] of fixtures.entries()) {
      const angle = (time*(fixture.isStage ? .10 : .13)+i*.23)*2*Math.PI;
      world.set(fixture.ball,Transform,{quat:[0,Math.sin(angle*.5),0,Math.cos(angle*.5)]}).unwrap();
      const x = (fixture.isStage ? .21 : .32)*Math.sin(angle);
      const z = fixture.isStage ? .42+.20*Math.cos(angle) : .38*Math.cos(angle);
      const length = Math.hypot(x,1,z);
      world.set(fixture.projector,SpotLight,{direction:[x/length,-1/length,z/length],
        rollDeg:(angle*180/Math.PI)%360}).unwrap();
    }
  };
  tick();
  const read = ({id,ball,projector}:typeof fixtures[number]) => {
    const light = world.get(projector,SpotLight).unwrap();
    return {id,quat:Array.from(world.get(ball,Transform).unwrap().quat),roll:light.rollDeg,
      direction:Array.from(light.direction),intensity:light.intensity,cookie:light.cookie};
  };
  const vipFixtures = fixtures.filter(fixture=>!fixture.isStage);
  const stageFixture = fixtures.find(fixture=>fixture.isStage)!;
  return {
    tick,dispose,
    readVip:()=>vipFixtures.map(read),
    readStage:()=>read(stageFixture),
  };
}
