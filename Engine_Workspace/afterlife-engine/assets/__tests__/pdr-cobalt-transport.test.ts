import {expect,it} from 'vitest';
import {createStreamGeometry,reservoirLevel} from '../pdr-cobalt-stream-geometry';

it('starts with independent rising bubbles, confined inside one continuous tank',()=>{
  const wall=createStreamGeometry();
  expect(wall.chambers).toBe(1);
  expect(wall.inspect().plumeGroups).toBe(8);
  expect(wall.inspect().activeBubbles).toBeGreaterThan(120);
  const before=wall.position.slice();
  const first=(i:number)=>3*i*wall.verticesPerBubble;
  wall.update(.04);
  let rising=0;
  for(let i=0;i<wall.position.length/(3*wall.verticesPerBubble);i++){
    const offset=first(i);
    const wasLive=before[offset+1]>.32;
    const isLive=wall.position[offset+1]>.32;
    if(wasLive&&isLive){
      expect(wall.position[offset+1]).toBeGreaterThan(before[offset+1]);
      rising++;
    }
    expect(wall.position[offset+1]).toBeLessThan(reservoirLevel+.0001);
  }
  expect(rising).toBeGreaterThan(120);
  expect(wall.inspect().mode).toBe('continuous aeration');
});

it('keeps the water level and geometry repeatable after arbitrary playback times',()=>{
  const wall=createStreamGeometry();
  const initial=wall.position.slice(),litres=wall.collector.standingLitres;
  wall.update(7.3);
  expect(wall.position).not.toEqual(initial);
  expect(wall.collector.standingLitres).toBe(litres);
  wall.update(0);
  expect(wall.position).toEqual(initial);
});
