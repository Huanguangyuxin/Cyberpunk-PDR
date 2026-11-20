// World metres. The station lines and seals are shared with the rear-fittings GLB.
const stations=[[10.035,-13.70],[10.035,-4.26],[10.34,-3.78],[13.23,-3.78]];
const counts=[8,1,3];
const high=.923, low=.287;
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
const pathStarts=[0,segments[0].length,segments[0].length+segments[1].length];
const backing=.024;
const dy=(high-low)/40;
const dt=1/60;
const rows=40;
// A seeded, smooth mineral permeability field. It is stationary in the stone.
function smoothNoise(x:number,seed:number){
  const k=Math.floor(x),a=x-k,w=a*a*(3-2*a);
  return random(k+seed)*(1-w)+random(k+seed+1)*w;
}
export function createStreamGeometry(_runtime=false){
  const bays=segments.flatMap((segment,section)=>{
    const width=segment.length/counts[section];
    return Array.from({length:counts[section]},(_,bay)=>{
      const span=width-.038,left=width*bay+.019,cols=Math.ceil(span/.014);
      const dx=span/cols;
      const cells=rows*cols;
      const seed=section*397+bay*61+7;
      const supply=Array.from({length:Math.max(3,Math.round(span/.18))},(_,i)=>{
        return {x:(i+.18+.64*random(seed+i))*span/Math.max(3,Math.round(span/.18)),
          radius:.012+.026*random(seed+31+i),gain:.8+1.7*random(seed+51+i),key:seed+101*i};
      });
      const mouths=supply.map(feed=>({...feed,weights:Float32Array.from({length:cols},(_,i)=>{
        const d=((i+.5)*dx-feed.x)/feed.radius;return Math.exp(-.5*d*d);
      })}));
      const down=new Float32Array(cells),side=new Float32Array(cells);
      for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
        const k=j*cols+i,x=(i+.5)*dx,y=(j+.5)*dy;
        const mineral=smoothNoise(x*14+y*.9,seed+207);
        // Gravity-driven acceleration approaches terminal speed under wall drag.
        down[k]=(.21+.33*(1-Math.exp(-6*y)))*(.70+.44*mineral);
        side[k]=(.22*(smoothNoise(x*4.2,seed+43)-.45)+.122)*Math.exp(-3.1*y)+.055*(smoothNoise(x*9+y*3.1,seed+337)-.5)+
          .034*(smoothNoise(y*8+x*2.1,seed+601)-.5);
      }
      // A catchment spans a few bottom cells; its bubbles can only be born
      // from volume that actually crossed this section of the lower boundary.
      const pockets=Array.from({length:Math.ceil(cols/9)},(_,i)=>({
        first:i*9,last:Math.min(cols,(i+1)*9),charge:0,pulseLiters:.045+.055*random(seed+19*i),
        birth:-10,serial:0,impactX:0,discharge:0,moment:0,
      }));
      return {section,segment,left,span,cols,dx,mouths,down,side,pockets,h:new Float64Array(cells),
        change:new Float64Array(cells),start:miter(segments[section-1]??segment,segment),
        end:miter(segment,segments[section+1]??segment)};
    });
  });
  const count=bays.reduce((n,b)=>n+(rows+1)*(b.cols+1),0);
  const position=new Float32Array(3*count),normal=new Float32Array(3*count),uv=new Float32Array(2*count);
  const backingPosition=new Float32Array(3*count);
  const indices=new Uint32Array(bays.reduce((n,b)=>n+6*rows*b.cols,0));
  let startVertex=0,idx=0;
  for(const b of bays){
    for(let j=0;j<=rows;j++)for(let i=0;i<=b.cols;i++){
      const v=startVertex+j*(b.cols+1)+i;uv[2*v]=pathStarts[b.section]+b.left+i*b.dx;uv[2*v+1]=j/rows;
      const station=b.left+i*b.dx,a=station/b.segment.length;
      backingPosition[3*v]=b.segment.x+station*b.segment.tx+(b.start[0]+a*(b.end[0]-b.start[0]))*backing;
      backingPosition[3*v+1]=high-j*dy;
      backingPosition[3*v+2]=b.segment.z+station*b.segment.tz+(b.start[1]+a*(b.end[1]-b.start[1]))*backing;
      if(i<b.cols&&j<rows){const below=v+b.cols+1;indices.set([v,below,v+1,below,below+1,v+1],idx);idx+=6;}
    }
    startVertex+=(rows+1)*(b.cols+1);
  }
  const collector={
    seconds:0,
    strips:bays.map(b=>({
      segment:b.segment,start:b.start,end:b.end,left:b.left,dx:b.dx,
      flux:new Float32Array(b.cols),depth:new Float32Array(b.cols),pockets:b.pockets,
    })),
  };
  let inletOpen=true,ticks=0,time=0,inflow=0,outflow=0;
  function step(){
    const t=ticks*dt;
    for(const [bayIndex,b] of bays.entries()){
      const {cols,dx,h,change}=b;
      for(const p of b.pockets){p.discharge=0;p.moment=0;}
      change.fill(0);
      // Supply flux (m²/s per metre of slot) enters ONLY through the top boundary.
      if(inletOpen){
        for(let i=0;i<cols;i++)change[i]=.000038*dt/dy;
        for(const m of b.mouths){
          const drive=.07+.93*smoothNoise(t*2.35,m.key)**2+.44*smoothNoise(t*5.6,m.key+813);
          const pulse=.00091*m.gain*drive*dt/dy;
          for(let i=0;i<cols;i++)change[i]+=pulse*m.weights[i];
        }
        for(let i=0;i<cols;i++)inflow+=change[i]*dx*dy;
      }
      for(let k=0;k<h.length;k++){
        const depth=h[k];
        // Nonlinear mobility lets thicker slugs overtake the trailing wet film.
        const speed=b.down[k]*(.56+.74*depth/(depth+.0018));
        const forward=depth*speed*dt/dy;
        change[k]-=forward;
        if(k+cols<h.length)change[k+cols]+=forward;
        else {
          const discharge=forward*dx*dy/dt;
          outflow+=discharge*dt;
          const col=k%cols,p=b.pockets[Math.floor(col/9)];
          p.discharge+=discharge;
          p.moment+=discharge*(col+.5)*dx;
          collector.strips[bayIndex].flux[col]=discharge/dx;
          collector.strips[bayIndex].depth[col]=depth;
        }
        if(k%cols===cols-1)continue;
        // Signed face flux: opposite cells exchange the EXACT same volume.
        const right=h[k+1],v=b.side[k];
        const lateral=(v*(v>=0?depth:right)+.016*(depth-right))*dt/dx;
        change[k]-=lateral;change[k+1]+=lateral;
      }
      for(const p of b.pockets){
        p.charge+=p.discharge*dt*1000;
        if(p.charge>=p.pulseLiters){
          p.charge%=p.pulseLiters;p.birth=t+dt;p.serial++;
          p.impactX=p.moment/p.discharge;
        }
      }
      for(let k=0;k<h.length;k++)h[k]+=change[k];
    }
    ticks++;
  }
  function publish(){
    let base=0;
    for(const b of bays){
      const s=b.segment,stride=b.cols+1;
      for(let j=0;j<=rows;j++)for(let i=0;i<=b.cols;i++){
        const x0=Math.max(0,i-1),x1=Math.min(b.cols-1,i),y0=Math.max(0,j-1)*b.cols,y1=Math.min(rows-1,j)*b.cols;
        const h=.25*(b.h[y0+x0]+b.h[y0+x1]+b.h[y1+x0]+b.h[y1+x1]);
        const station=b.left+i*b.dx,along=station/s.length;
        // Dry cells retreat just beneath the opaque mineral to avoid coplanar flicker.
        const d=backing+h-.00013*Math.max(0,1-h/.00015);
        const o=3*(base+j*stride+i);
        position[o]=s.x+station*s.tx+(b.start[0]+along*(b.end[0]-b.start[0]))*d;
        position[o+1]=high-j*dy;
        position[o+2]=s.z+station*s.tz+(b.start[1]+along*(b.end[1]-b.start[1]))*d;
      }
      for(let j=0;j<=rows;j++)for(let i=0;i<=b.cols;i++){
        const v=base+j*stride+i,a=(v-(i>0?1:0))*3,c=(v+(i<b.cols?1:0))*3;
        const e=(v-(j>0?stride:0))*3,d=(v+(j<rows?stride:0))*3;
        const ax=position[c]-position[a],az=position[c+2]-position[a+2];
        const bx=position[d]-position[e],by=position[d+1]-position[e+1],bz=position[d+2]-position[e+2];
        const nx=by*az,ny=bz*ax-bx*az,nz=-by*ax;
        const inv=(nx*s.nx+nz*s.nz<0?-1:1)/Math.hypot(nx,ny,nz);
        normal[v*3]=nx*inv;normal[v*3+1]=ny*inv;normal[v*3+2]=nz*inv;
      }
      base+=(rows+1)*stride;
    }
  }
  // Start with the pump having run for four seconds. Rewinds replay exactly
  // the same boundary schedule; normal frames only advance the elapsed ticks.
  const warmSteps=240;
  const gates:{tick:number;open:boolean}[]=[];
  let gateIndex=0;
  function update(seconds:number){
    if(!Number.isFinite(seconds)||seconds<0)throw Error('Invalid water film time');
    const target=warmSteps+Math.floor(seconds/dt+1e-7);
    if(target<ticks){
      for(const b of bays){
        b.h.fill(0);
        for(const p of b.pockets){p.charge=0;p.birth=-10;p.serial=0;p.impactX=0;}
      }
      ticks=0;inflow=0;outflow=0;inletOpen=true;gateIndex=0;
    }
    while(ticks<target){
      while(gateIndex<gates.length&&gates[gateIndex].tick<=ticks)inletOpen=gates[gateIndex++].open;
      step();
    }
    while(gateIndex<gates.length&&gates[gateIndex].tick<=ticks)inletOpen=gates[gateIndex++].open;
    time=seconds;collector.seconds=ticks*dt;publish();
  }
  function setInlet(open:boolean){
    if(open===inletOpen)return;
    gates.splice(gateIndex);
    gates.push({tick:ticks,open});gateIndex=gates.length;inletOpen=open;
  }
  function inspect(){
    const rowLiters=Array<number>(rows).fill(0);
    let peakMm=0;
    for(const b of bays)for(let k=0;k<b.h.length;k++){
      rowLiters[Math.floor(k/b.cols)]+=b.h[k]*b.dx*dy*1000;
      peakMm=Math.max(peakMm,b.h[k]*1000);
    }
    const heldLiters=rowLiters.reduce((a,b)=>a+b,0);
    return {inletOpen,seconds:time,preRollSeconds:warmSteps*dt,litersIn:inflow*1000,
      litersOut:outflow*1000,heldLiters,massErrorLiters:(inflow-outflow)*1000-heldLiters,peakMm,rowLiters};
  }
  update(0);
  return {collector,position,backingPosition,normal,uv,indices,update,setInlet,inspect,bays:bays.length,ribbons:bays.reduce((n,b)=>n+b.mouths.length,0),
    aabb:new Float32Array([9.94,low-.005,-13.71,13.24,high+.002,-3.70])};
}
