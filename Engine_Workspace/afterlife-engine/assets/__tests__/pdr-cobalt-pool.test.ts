import {expect,it} from 'vitest';
import {createStreamGeometry,createTankGeometry,reservoirLevel} from '../pdr-cobalt-stream-geometry';

it('fills past 98% of the visible glazing and routes the face directly to the sloping shoe',()=>{
  const wall=createStreamGeometry(),tank=createTankGeometry(wall.collector);
  expect((reservoirLevel-.272)/(.918-.272)).toBeGreaterThan(.98);
  const frontHeights=new Set<number>();
  let diffusers=0;
  for(let i=0;i<tank.uv.length/2;i++){
    const tag=tank.uv[2*i+1];
    if(tag<1)frontHeights.add(+tank.position[3*i+1].toFixed(4));
    if(tag===3)diffusers++;
  }
  expect([...frontHeights].sort()).toEqual([.275,.9086]);
  expect(diffusers).toBeGreaterThan(wall.nozzles*12);
  expect(tank.indices.every(i=>i<tank.position.length/3)).toBe(true);
});

it('joins the water surface and front exactly at every bend with continuous optical coordinates',()=>{
  const wall=createStreamGeometry();
  const tank=createTankGeometry(wall.collector);
  let index=0;
  for(const [i,s] of wall.collector.strips.entries()){
    const next=index+10+s.jets.length*12*7;
    if(i<wall.collector.strips.length-1){
      for(let row=0;row<5;row++){
        const a=index+5+row,b=next+row;
        expect(Array.from(tank.position.slice(3*a,3*a+3))).toEqual(Array.from(tank.position.slice(3*b,3*b+3)));
        expect(Array.from(tank.uv.slice(2*a,2*a+2))).toEqual(Array.from(tank.uv.slice(2*b,2*b+2)));
      }
    }
    index=next;
  }
});
