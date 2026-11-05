/** Measured public air/floor footprint, in Engine metres. Geometry stays authoritative. */
export const unit=(v:number)=>Math.max(0,Math.min(1,v));
export function eased(a:number,b:number,v:number){const t=unit((v-a)/(b-a));return t*t*(3-2*t);}
export function publicAirMask(x:number,z:number){
 const deep=(1-eased(7.0,8.3,Math.abs(x)))*eased(-44.3,-42.5,z);
 // D051: continuous deep-room -> bridge transition, then a dry, clear front hall.
 return unit(deep*(1-eased(-29,-22,z)));
}
export const PUBLIC_AIR_BOUNDS={min:[-9.5,-.45,-44.4],max:[9.5,9.7,-22]} as const;
