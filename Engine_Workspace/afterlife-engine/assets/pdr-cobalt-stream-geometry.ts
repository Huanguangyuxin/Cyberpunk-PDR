// World metres. The station lines and seals are shared with the rear-fittings GLB.
import footprint from './pdr-bar-footprint.json' with {type:'json'};
const {stations}=footprint;
// The overflow sets the standing level independently of the supply valve.
export const reservoirLevel=.907;
const nozzleHeight=.303;
const random=(k:number)=>{const v=Math.sin(k*78.233+12.9898)*43758.5453;return v-Math.floor(v);};
type Segment={x:number;z:number;tx:number;tz:number;nx:number;nz:number;length:number};
const segments:Segment[]=stations.slice(1).map(([x,z],i)=>{
  const [x0,z0]=stations[i],length=Math.hypot(x-x0,z-z0);
  const tx=(x-x0)/length,tz=(z-z0)/length;
  return {x:x0,z:z0,tx,tz,nx:-tz,nz:tx,length};
});
function miter(a:Segment,b:Segment){
  const den=1+a.nx*b.nx+a.nz*b.nz;
  return [(a.nx+b.nx)/den,(a.nz+b.nz)/den];
}
const rings=5,sides=8,verticesPerBubble=(rings+1)*sides;
const longestRise=(reservoirLevel-nozzleHeight)/.136;

export function createStreamGeometry(){
  // Floor-plan stations are the actual bends in one channel. Plume
  // locations are measured from the same service end, independent of bends.
  const totalLength=segments.reduce((sum,s)=>sum+s.length,0);
  const clusters=[[.48,.14,3],[1.91,.23,2],[3.02,.11,3],[5.78,.19,2],
    [7.43,.15,3],[9.34,.18,2],[11.47,.13,3],[12.55,.25,2]];
  let chain=0;
  const strips=segments.map((segment,section)=>{
    const origin=chain;
    chain+=segment.length;
    const jets=clusters.flatMap(([at,period,holes],g)=>
      Array.from({length:holes},(_,i)=>{
        const seed=113*g+i*23+11;
        const location=at+(i-(holes-1)/2)*(.059+.054*random(seed+9));
        return {seed,group:g,centre:location-origin,period:period*(.16+.085*random(seed+19)),
          depth:.032+.016*random(seed+31)};
      }).filter(jet=>jet.centre>=0&&jet.centre<segment.length));
    return {segment,left:0,chain:origin,span:segment.length,totalLength,
      start:miter(segments[section-1]??segment,segment),end:miter(segment,segments[section+1]??segment),jets};
  });
  const slots=strips.flatMap(strip=>strip.jets.flatMap(jet=>{
    const capacity=Math.ceil(longestRise/jet.period)+2;
    return Array.from({length:capacity},(_,lane)=>({strip,jet,capacity,lane}));
  }));
  const collector={level:reservoirLevel,strips,
    standingLitres:strips.reduce((sum,s)=>sum+s.span*.0326*(reservoirLevel-.2844)*1000,0)};
  const n=slots.length*verticesPerBubble;
  const position=new Float32Array(n*3),normal=new Float32Array(n*3),uv=new Float32Array(n*2);
  const tangent=new Float32Array(n*4),triangles:number[]=[];
  for(let i=0;i<slots.length;i++)for(let j=0;j<=rings;j++)for(let k=0;k<sides;k++){
    const phi=Math.PI*j/rings,theta=Math.PI*2*k/sides;
    const v=i*verticesPerBubble+j*sides+k;
    normal.set([Math.sin(phi)*Math.cos(theta),Math.cos(phi),Math.sin(phi)*Math.sin(theta)],3*v);
    tangent.set([-Math.sin(theta),0,Math.cos(theta),1],4*v);
    uv.set([k/sides,j/rings],2*v);
    const next=i*verticesPerBubble+j*sides+(k+1)%sides;
    if(j<rings){
      if(j>0)triangles.push(v,next,v+sides);
      if(j<rings-1)triangles.push(next,next+sides,v+sides);
    }
  }
  const indices=new Uint32Array(triangles);
  let time=0,activeBubbles=0;
  function update(seconds:number){
    if(!Number.isFinite(seconds)||seconds<0)throw Error('Expected a nonnegative bubble clock');
    time=seconds;activeBubbles=0;
    for(const [i,{strip,jet,capacity,lane}] of slots.entries()){
      const phase=random(jet.seed+97),last=Math.floor(time/jet.period-phase);
      const cycle=last-((last-lane)%capacity+capacity)%capacity;
      const key=jet.seed+cycle*319;
      const age=time-(cycle+phase+.71*random(key+44))*jet.period;
      // Small bubbles rise gently and almost straight. Larger bubbles drift
      // further sideways as the jet disperses into the surrounding water.
      const size=random(key+51);
      const r=size>.91?.0065+.0022*random(key+73):.0028+.0035*size**1.8;
      const speed=.136+.083*Math.max(0,r-.00066)/.0037+.013*random(key+27);
      const rise=Math.max(0,age)*speed;
      const height=nozzleHeight+rise;
      // Individual pores go quiet for short spells. Modulating acceptance
      // at release time preserves bubbles already rising during a lull.
      const release=time-age;
      const burst=.81+.12*Math.sin(release*1.9+jet.group*7.6)+.06*Math.sin(release*3.7+jet.seed*.17);
      const active=age>=0&&height+r<reservoirLevel&&random(key+199)<burst;
      const radius=active?r*Math.min(1,age/.028):0;
      if(active)activeBubbles++;
      const progress=Math.min(1,rise/(reservoirLevel-nozzleHeight));
      const sway=.011*Math.sin(age*4.9+key)+.033*Math.sin(time*1.4+jet.group*.9+rise*5);
      const spread=(random(key+3)-.5)*.34+sway;
      const station=strip.left+jet.centre+.006*(random(key+7)-.5)+progress*spread;
      const depth=Math.min(.056-r,Math.max(.025+r,jet.depth+.008*progress*Math.sin(age*3.3+key*.23)));
      const s=strip.segment,u=station/s.length;
      const x=s.x+station*s.tx+depth*(strip.start[0]+u*(strip.end[0]-strip.start[0]));
      const z=s.z+station*s.tz+depth*(strip.start[1]+u*(strip.end[1]-strip.start[1]));
      const centreY=active?height:nozzleHeight;
      for(let k=0;k<verticesPerBubble;k++){
        const o=3*(i*verticesPerBubble+k);
        position[o]=x+radius*normal[o];position[o+1]=centreY+radius*(1-.24*size**4)*normal[o+1];
        position[o+2]=z+radius*normal[o+2];
      }
    }
  }
  update(0);
  return {collector,position,normal,tangent,uv,indices,update,chambers:1,
    nozzles:strips.reduce((sum,s)=>sum+s.jets.length,0),verticesPerBubble,
    inspect:()=>({mode:'continuous aeration',seconds:time,activeBubbles,
      plumeGroups:clusters.length,waterLevelM:reservoirLevel,standingLitres:collector.standingLitres}),
    aabb:new Float32Array([9.63,.285,-13.72,13.24,reservoirLevel+.001,-3.70])};
}

// Static tank and porous diffuser faces. These same vertices are baked into
// the Blender preview and installed in the engine behind the outer glazing.
export function createTankGeometry(tank:ReturnType<typeof createStreamGeometry>['collector']){
  const pos:number[]=[],norm:number[]=[],tex:number[]=[],idx:number[]=[];
  for(const s of tank.strips){
    const seg=s.segment;
    function vertex(u:number,h:number,d:number,nx:number,ny:number,nz:number,ut:number,vt:number){
      const a=(s.left+u)/seg.length;
      const i=pos.length/3;
      pos.push(seg.x+(s.left+u)*seg.tx+d*(s.start[0]+a*(s.end[0]-s.start[0])),h,
        seg.z+(s.left+u)*seg.tz+d*(s.start[1]+a*(s.end[1]-s.start[1])));
      norm.push(nx,ny,nz);tex.push(ut,vt);return i;
    }
    // Horizontal top curls into the glass. Give its front the full standing
    // depth, with a slender air gap only at the uppermost glazing bead.
    const cross=[[.0242,tank.level,1.02],[.0549,tank.level,1.5],[.0568,tank.level+.0016,1.8],
      [.0568,tank.level+.0016,0],[.0568,.275,.99]];
    const base=pos.length/3;
    for(const u of [0,s.span]){
      for(const [d,h,v] of cross){
        const top=v>=1;
        vertex(u,h,d,top?0:seg.nx,top?1:0,top?0:seg.nz,(s.chain+u)/s.totalLength,v);
      }
    }
    for(const k of [0,1,3])idx.push(base+k,base+k+1,base+k+5,base+k+5,base+k+1,base+k+6);
    // Actual miniature air diffusers: a dark porous cap on a low cylindrical
    // foot sits on the sloping return shoe at each independent bubble plume.
    for(const jet of s.jets){
      const r=.010,cap=.3005,foot=.283;
      for(let k=0;k<12;k++){
        const a=2*Math.PI*k/12,b=2*Math.PI*(k+1)/12;
        const ring=(angle:number,height:number,top:boolean)=>vertex(jet.centre+r*Math.cos(angle),height,
          jet.depth+r*Math.sin(angle),top?0:Math.cos(angle)*seg.tx+Math.sin(angle)*seg.nx,top?1:0,
          top?0:Math.cos(angle)*seg.tz+Math.sin(angle)*seg.nz,.5+.5*Math.cos(angle),top?3:2.5);
        const c=vertex(jet.centre,cap,jet.depth,0,1,0,.5,3);
        const aTop=ring(a,cap,true),bTop=ring(b,cap,true);
        idx.push(c,bTop,aTop);
        const a0=ring(a,foot,false),a1=ring(a,cap,false),b0=ring(b,foot,false),b1=ring(b,cap,false);
        idx.push(a0,b0,a1,a1,b0,b1);
      }
    }
  }
  return {position:new Float32Array(pos),normal:new Float32Array(norm),uv:new Float32Array(tex),indices:new Uint32Array(idx)};
}
