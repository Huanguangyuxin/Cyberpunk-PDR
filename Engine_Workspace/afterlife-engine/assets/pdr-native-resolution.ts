export interface ViewSize {width:number; height:number}

export function nativeViewport(width:number,height:number){
  const aspect=width>0&&height>0?width/height:16/9;
  const fraction=Math.min(1,(16/9)/aspect);
  const heightFraction=Math.min(1,aspect/(16/9));
  return {viewport:[(1-fraction)/2,(1-heightFraction)/2,fraction,heightFraction],
    resolutionScale:1,maxRenderShortSide:0};
}

/** Use the same uniform dimension clamp and rounding as the ForgeAX canvas host. */
export function boundedDisplayPixels(css:ViewSize,dpr:number,limit:number):ViewSize{
  const ratio=Math.min(dpr,limit/Math.max(1,css.width,css.height));
  const round=ratio<dpr?Math.floor:Math.round;
  return {width:Math.max(1,round(css.width*ratio+1e-9)),height:Math.max(1,round(css.height*ratio+1e-9))};
}

// 0.5.0's SSR component exposes no independent trace scale. Budget every
// full-res trace/history, Forward input and fragment scratch plane at camera size.
// 136 B/px bounds the 16:9 mip chains; 1 MiB covers constants and rounding.
export function allowsNativeSsr(size:ViewSize|undefined):boolean {
  if(!size || size.width<1 || size.height<1)return false;
  const width=Math.min(size.width,Math.ceil(size.height*16/9));
  const height=Math.min(size.height,Math.ceil(size.width*9/16));
  return width*height*136+1024*1024<=320*1024*1024;
}
