import {describe, expect, it} from 'vitest';
import {allowsNativeSsr,boundedDisplayPixels,nativeViewport} from '../pdr-native-resolution';

describe('native display resolution',()=>{
  it('renders a 4K aperture at one scene pixel per physical pixel',()=>{
    const buffer=boundedDisplayPixels({width:1920,height:1080},2,8192);
    expect(buffer).toEqual({width:3840,height:2160});
    expect(nativeViewport(buffer.width,buffer.height)).toEqual({viewport:[0,0,1,1],resolutionScale:1,maxRenderShortSide:0});
  });
  it('retains the same projection in wide and portrait drawing buffers',()=>{
    for(const [w,h] of [[1800,1200],[780,1688],[3440,1440]]){
      const v=nativeViewport(w,h);
      expect(w*v.viewport[2]/(h*v.viewport[3])).toBeCloseTo(16/9);
      expect(v.viewport[0]*2+v.viewport[2]).toBeCloseTo(1);
      expect(v.viewport[1]*2+v.viewport[3]).toBeCloseTo(1);
      expect(v.resolutionScale).toBe(1);
    }
  });
  it('keeps full scene resolution when a native SSR history does not fit',()=>{
    expect(allowsNativeSsr(undefined)).toBe(false);
    expect(allowsNativeSsr({width:1920,height:1080})).toBe(true);
    expect(allowsNativeSsr({width:2560,height:1440})).toBe(false);
    expect(allowsNativeSsr({width:3840,height:2160})).toBe(false);
    expect(nativeViewport(3840,2160).resolutionScale).toBe(1);
  });
  it('preserves aspect and applies the GPU edge limit only when necessary',()=>{
    expect(boundedDisplayPixels({width:900,height:600},1.25,8192)).toEqual({width:1125,height:750});
    expect(boundedDisplayPixels({width:5000,height:3000},2,8192)).toEqual({width:8192,height:4915});
  });
});
