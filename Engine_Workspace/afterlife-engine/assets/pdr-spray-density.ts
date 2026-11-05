/** D049/D090: expanding water-vapour puffs driven by emitter age and ballistic transport.
 * The spray plumes share the exact same 3D advection/eddy noise field as `pdr-dance-floor-mist.ts`
 * so the nozzle sprays dissolve seamlessly into the room's rolling mist without any seam or color break.
 */
import {eased,unit,publicAirMask} from './pdr-atmosphere-domain';
export const SPRAY_SHAPE=[36,40,64] as const;
export const SPRAY_MIN=[-8.5,-.2,-42] as const;
export const SPRAY_MAX=[8.5,4.25,-23.5] as const;
function hash3(x:number,y:number,z:number){let h=Math.imul(x,374761393)^Math.imul(y,668265263)^Math.imul(z,2147483647);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295;}
function mix(a:number,b:number,t:number){return a+(b-a)*t;}
function noise3(x:number,y:number,z:number){
 const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z),fx=x-ix,fy=y-iy,fz=z-iz;
 const u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy),w=fz*fz*(3-2*fz);
 return mix(mix(mix(hash3(ix,iy,iz),hash3(ix+1,iy,iz),u),mix(hash3(ix,iy+1,iz),hash3(ix+1,iy+1,iz),u),v),mix(mix(hash3(ix,iy,iz+1),hash3(ix+1,iy,iz+1),u),mix(hash3(ix,iy+1,iz+1),hash3(ix+1,iy+1,iz+1),u),v),w);
}
export function sprayDensity(t:number,side:number){
 const [W,H,D]=SPRAY_SHAPE,field=new Float32Array(W*H*D),out=new Uint8Array(field.length);
 const T=t*1.05;
 // Pure 3D volumetric mist puffs emerging from the two side nozzles (x = +-4.3, y = 0.62, z = -38.0),
 // rising gently as soft 3D clouds and dissolving into the ambient room mist (no narrow vertical jet column).
 const count=18,lifetime=4.2,spacing=lifetime/count;
 for(const s of [-1,1]){
  const wSide=.45;
  for(let p=0;p<count;p++){
   const age=((T+(s<0?0:.23)-p*spacing)%lifetime+lifetime)%lifetime;
   const u=age/lifetime,phase=p*2.399+s*1.3;
   const X=s*(4.3-2.85*Math.pow(u,.82))+.38*Math.sin(u*4.8+phase)*u;
   const Y=.58+1.65*u*Math.pow(1-u,1.25)-.14*u*u+.10*Math.cos(u*5.0+phase);
   const Z=-38+5.8*Math.pow(u,.88)+.35*Math.sin(u*3.6+phase)*u;
   // Wide, soft 3D cloud puffs (rx >= ry) from the very start so it always reads as soft volumetric fog, never a narrow vertical streak
   const r=.44+1.55*Math.pow(u,1.02);
   const rx=r*(1.28+.52*u),ry=r*(.72-.22*u),rz=r*(1.22+.45*u);
   const env=Math.min(1,u/.14)*Math.pow(1-u,2.05);
   const strength=wSide*.62*env/(1+.95*u);
   const lo=[X-2.1*rx,Y-2.1*ry,Z-2.1*rz],hi=[X+2.1*rx,Y+2.1*ry,Z+2.1*rz];
   const a=lo.map((v,i)=>Math.max(0,Math.floor((v-SPRAY_MIN[i])/(SPRAY_MAX[i]-SPRAY_MIN[i])*[W,H,D][i])));
   const b=hi.map((v,i)=>Math.min([W,H,D][i]-1,Math.ceil((v-SPRAY_MIN[i])/(SPRAY_MAX[i]-SPRAY_MIN[i])*[W,H,D][i])));
   for(let z=a[2];z<=b[2];z++)for(let y=a[1];y<=b[1];y++)for(let x=a[0];x<=b[0];x++){
    const wx=SPRAY_MIN[0]+(x+.5)/W*(SPRAY_MAX[0]-SPRAY_MIN[0]),wy=SPRAY_MIN[1]+(y+.5)/H*(SPRAY_MAX[1]-SPRAY_MIN[1]),wz=SPRAY_MIN[2]+(z+.5)/D*(SPRAY_MAX[2]-SPRAY_MIN[2]);
    const dx=(wx-X)/rx,dy=(wy-Y)/ry,dz=(wz-Z)/rz;
    const roll=.26*Math.sin(dx*2.0+phase+age*1.6)*Math.cos(dz*1.7-age*1.3);
    field[x+W*(y+H*z)]+=strength*Math.exp(-1.25*(dx*dx+(dy+roll)*(dy+roll)+dz*dz));
   }
  }
 }
 for(let z=0;z<D;z++)for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const i=x+W*(y+H*z);if(field[i]<=.003)continue;
  const X=SPRAY_MIN[0]+(x+.5)/W*(SPRAY_MAX[0]-SPRAY_MIN[0]),Y=SPRAY_MIN[1]+(y+.5)/H*(SPRAY_MAX[1]-SPRAY_MIN[1]),Z=SPRAY_MIN[2]+(z+.5)/D*(SPRAY_MAX[2]-SPRAY_MIN[2]);
  // Shared 3D advected noise field (matching pdr-dance-floor-mist.ts) so the spray puffs are 100% volumetric cloud eddies
  const u=X-.68*T+1.4*Math.sin(.31*Z-.24*T)+.65*Math.sin(.6*Y+.24*Z+.31*T);
  const v=Z-.88*T+1.15*Math.sin(.43*X+.34*Y-.29*T);
  const w=Y-.24*T+.8*Math.sin(.57*X+.22*Z-.46*T);
  const broad=noise3(u*.48,w*.48,v*.48),fine=noise3(u*1.05+13,w*1.05-7,v*1.05+3);
  const cloud=eased(.32,.72,.77*broad+.23*fine);
  const mod=.38+.62*cloud;
  const vertical=1-eased(2.1,3.55,Y);
  out[i]=Math.round(255*unit(field[i]*mod*publicAirMask(X,Z)*vertical));
 }
 return out;
}
