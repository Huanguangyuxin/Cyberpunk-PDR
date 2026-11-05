import {describe,it,expect} from 'vitest';
import {BODY,horizontalIntent,isSolidMesh,shouldMouseLook} from '../pdr-physical-navigation';
describe('physical inspection input and collision policy',()=>{
  it('turns with a locked mouse without holding RMB; unlocked hover cannot turn',()=>{
    expect(shouldMouseLook({pointerLocked:true,button:()=>false})).toBe(true);
    expect(shouldMouseLook({pointerLocked:false,button:()=>true})).toBe(true);
    expect(shouldMouseLook({pointerLocked:false,button:()=>false})).toBe(false);
  });
  it('has genuine opposite strafing at arbitrary camera yaw without diagonal acceleration',()=>{
    for(const yaw of [0,.7,Math.PI/2,Math.PI]){
      const a=horizontalIntent(-1,0,yaw),d=horizontalIntent(1,0,yaw),w=horizontalIntent(0,1,yaw);
      expect(a.x).toBeCloseTo(-d.x);expect(a.z).toBeCloseTo(-d.z);
      expect(d.x*w.x+d.z*w.z).toBeCloseTo(0);
      const diagonal=horizontalIntent(1,1,yaw);expect(Math.hypot(diagonal.x,diagonal.z)).toBeCloseTo(1);
    }
  });
  it('keeps real walls, railings, stair treads, all furniture while excluding non-solid overlays',()=>{
    for(const n of ['WALL_EAST','STAIR_MAIN_MEZZ/flight_1_lower_east/tread-01',
      'STAIR_MAIN_MEZZ/handrail','BAR-S01/seat','SOC-C01-1/leg','WATER_INNER_CURB'])expect(isSolidMesh(n)).toBe(true);
    for(const n of ['CALIB/CUBE_1M','LASER-01/SIMULATED_RAY_08','WATER_SURFACE','V4_BACKBAR_BTL_LIQ_01','GRAPHIC_STAGE_WALLPAPER/print'])expect(isSolidMesh(n)).toBe(false);
    expect(2*(BODY.radius+BODY.halfHeight)).toBeCloseTo(1.75);
    expect(BODY.step).toBeGreaterThan(.1625);expect(BODY.step).toBeLessThan(.30);
  });
});
