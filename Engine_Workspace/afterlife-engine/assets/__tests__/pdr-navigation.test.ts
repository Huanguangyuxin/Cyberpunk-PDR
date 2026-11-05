import {describe, it, expect} from 'vitest';
import {createWalkState, stepWalk, WALK} from '../pdr-navigation';

const floor = () => 0;
const idle = {right: 0, forward: 0, yaw: 0, sprint: false, jump: false};
describe('first-person scene inspection', () => {
  it('moves all four directions with a constant horizontal speed and no diagonal boost', () => {
    for (const [right, forward] of [[1,0],[-1,0],[0,1],[0,-1],[1,1]]) {
      const s = stepWalk(createWalkState([0,1.64,0],1.64), {...idle,right,forward}, .05, floor);
      expect(Math.hypot(s.x,s.z)).toBeCloseTo(WALK.speed*.05,8);
      expect(s.feetY+1.64).toBeCloseTo(1.64,8);
    }
  });
  it('follows a ballistic arc and lands at the original eye height at different frame rates', () => {
    for (const dt of [1/30,1/60,1/144]) {
      let s=createWalkState([0,1.64,0],1.64), peak=0;
      for(let i=0;i<Math.ceil(1.4/dt);i++) {
        s=stepWalk(s,{...idle,jump:i===0},dt,floor); peak=Math.max(peak,s.feetY);
      }
      expect(peak).toBeCloseTo(WALK.jumpSpeed**2/(2*WALK.gravity),2);
      expect(s.grounded).toBe(true); expect(s.feetY).toBe(0);
      expect(s.jumps).toBe(1); expect(s.landings).toBe(1);
    }
  });
  it('does not auto-jump while held or double-jump in the air; can jump again after release', () => {
    let s=createWalkState([0,1.64,0],1.64);
    for(let i=0;i<120;i++) s=stepWalk(s,{...idle,jump:true},1/60,floor);
    expect(s.jumps).toBe(1);expect(s.grounded).toBe(true);
    s=stepWalk(s,idle,1/60,floor);
    s=stepWalk(s,{...idle,jump:true},1/60,floor);
    s=stepWalk(s,idle,1/60,floor);
    s=stepWalk(s,{...idle,jump:true},1/60,floor);
    expect(s.jumps).toBe(2);expect(s.grounded).toBe(false);
  });
  it('keeps horizontal movement during a jump and lands on the sampled upper surface', () => {
    let s=createWalkState([0,1.64,0],1.64);
    for(let i=0;i<70;i++) s=stepWalk(s,{...idle,forward:1,jump:i===0},1/60,(_x,z)=>z<-.4?.1625:0);
    expect(s.z).toBeCloseTo(-WALK.speed*70/60,7);
    expect(s.feetY).toBeCloseTo(.1625,7);expect(s.grounded).toBe(true);
  });
});
