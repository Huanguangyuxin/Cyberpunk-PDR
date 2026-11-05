import { expect,it } from 'vitest';
import solids from '../workbuddy-v4-colliders.json';
import {areaAt,PLAYER_SPAWN} from '../room-layout';
it('leaves a capsule-width route from the entry to the water ribbon and performance floor',()=>{
 const route=[[23.5,16],[26.5,16],[26.5,12.3],[-15,12.3]];
 for(let i=1;i<route.length;i++)for(let j=0;j<=100;j++){
  const x=route[i-1][0]+(route[i][0]-route[i-1][0])*j/100;
  const z=route[i-1][1]+(route[i][1]-route[i-1][1])*j/100;
  expect(solids.filter(s=>s.pos[1]+s.half[1]>.35&&s.pos[1]-s.half[1]<1.6&&Math.abs(x-s.pos[0])<s.half[0]+.28&&Math.abs(z-s.pos[2])<s.half[2]+.28).map(s=>s.name),`${x},${z}`).toEqual([]);
 }
 expect(areaAt(PLAYER_SPAWN)).toBe('Main Bar');
});
it('provides stair treads to the upper floor and a large side-facing stage',()=>{
 const t=solids.filter(s=>s.name.startsWith('Stair_Tread_')).sort((a,b)=>a.pos[1]-b.pos[1]);
 expect(t).toHaveLength(33);
 for(let i=1;i<t.length;i++)expect(t[i].pos[1]-t[i-1].pos[1]).toBeLessThan(.20);
 expect(t.at(-1)!.pos[1]+t.at(-1)!.half[1]).toBeCloseTo(5.6);
 const stage=solids.find(s=>s.name==='Stage_Platform')!;
 expect(stage.half[0]*2).toBeCloseTo(10);expect(stage.half[2]*2).toBeCloseTo(22);
 expect(areaAt([2,6,-10])).toBe('Upper Lounge');
});
