#define_import_path cyberpunk_pdr::cobalt_water
#import forgeax_material::surface_v1::{SurfaceInput, SurfaceData}
#import forgeax_material::parameters::{material}

fn evaluate_surface(input: SurfaceInput) -> SurfaceData {
  let geom=normalize(input.vertexNormalWS);
  let v=normalize(input.viewDirectionWS);
  let world=input.positionWS;
  let edge=input.uv0.x;
  let longFace=edge<9.44;
  let bevel=edge>=9.44&&edge<10.008;
  let plane=select(select(vec2<f32>(0.,1.),vec2<f32>(-.844,.536),bevel),vec2<f32>(-1.,0.),longFace);
  let station=select(select(vec2<f32>(10.34,-3.78),vec2<f32>(10.035,-4.26),bevel),vec2<f32>(10.035,-13.70),longFace);
  let base=vec3<f32>(plane.x,0.,plane.y);
  let waterDepth=max(0.0,dot(world.xz-station,plane)-.024);
  let wet=smoothstep(.00010,.00065,waterDepth);
  let tangent=vec3<f32>(plane.y,0.,-plane.x);
  // Compact capillary packets emitted at the upper slot. Each has its
  // own aperture, release time, width, skew and lifetime. Only their
  // slope perturbs the optical normal; they have no emissive intensity.
  let elapsed=select(input.frameTime,material.flowTimeOverride,material.flowTimeOverride>=0.0);
  let fall=max(0.,.923-world.y);
  let age=fall/(.29+.105*(1.-exp(-3.8*fall)));
  let departure=elapsed-age;
  var transverse=0.;
  var vertical=0.;
  let lattice=13.;
  let shift=.065*(1.-exp(-3.1*fall));
  let local=edge-shift;
  for(var ix:i32=-1;ix<=1;ix=ix+1) {
    let lane=floor(local*lattice)+f32(ix);
    let seed=fract(sin(lane*61.79+5.34)*5192.94);
    let cycle=6.2+.9*seed;
    let index=floor(departure*cycle+seed);
    for(var it:i32=-1;it<=1;it=it+1) {
      let k=index+f32(it);
      let r=fract(sin(k*15.31+lane*33.91+1.9)*4127.75);
      let q=fract(sin(k*17.93+lane*9.77+8.2)*6951.37);
      let x=(lane+.15+.70*seed)/lattice+.009*(r-.5);
      let width=.009+.015*q;
      let duration=.030+.041*r;
      let a=(local-x)/width;
      let b=(departure-(k+.14+.69*r-seed)/cycle)/duration+1.31*a*(seed-.46)+.17*a*a;
      let envelope=exp(-.72*a*a-.72*b*b);
      let amplitude=(.00028+.00158*smoothstep(.29,.89,r))*smoothstep(.0003,.0035,waterDepth);
      let orientation=1.6+1.3*seed;
      let carrier=1.78*b+orientation*a;
      let wave=cos(carrier);
      let steep=sin(carrier);
      transverse+=(-1.44*a*wave-orientation*steep)*envelope*amplitude/width;
      vertical+=(-1.44*b*wave-1.78*steep)*envelope*amplitude/(duration*.39);
    }
  }
  let up=vec3<f32>(0.,1.,0.);
  let n=normalize(geom-tangent*transverse-up*vertical);
  let reflection=reflect(-v,n);
  let cosView=clamp(dot(n,v),0.0,1.0);
  let fresnel=.0204+.9796*pow(1.0-cosView,5.0);
  // West portrait and low cove occupy these world-space solids. The true
  // reflected ray walks across their luminous edges as the skin changes slope.
  let westDist=(-13.885-world.x)/min(-.001,reflection.x);
  let west=world+reflection*westDist;
  let portraitAngle=select(0.,smoothstep(-9.55,-8.9,west.z)*(1.-smoothstep(-.43,.23,west.z)),reflection.x<0.);
  let portrait=portraitAngle*(smoothstep(2.23,2.38,west.y)-smoothstep(6.06,6.20,west.y));
  let brassLine=portraitAngle*exp(-5.5*abs(west.y-2.28));
  let coveHit=world+reflection*((-10.515-world.x)/min(-.001,reflection.x));
  let cove=select(0.,exp(-6.0*abs(coveHit.y-.1))*(smoothstep(-10.6,-10.2,coveHit.z)-smoothstep(-.5,-.1,coveHit.z)),reflection.x<0.);
  let room=fresnel*(vec3<f32>(.75,.48,.62)*portrait+vec3<f32>(1.,.62,.36)*(3.*brassLine+3.5*cove));
  // At each optical edge, a strip of LEDs gives oblique incident rays in
  // both along-counter directions. An inclined wet facet collects more flux
  // than the mineral below; its transmitted light concentrates at that facet.
  let topRay=normalize(base*.018+vec3<f32>(0.,max(.005,.915-world.y),0.)+tangent*.21);
  let bottomRay=normalize(base*.018+vec3<f32>(0.,-max(.005,world.y-.279),0.)-tangent*.14);
  let top=max(0.,dot(n-base,topRay));
  let bottom=max(0.,dot(n-base,bottomRay));
  let filmFocus=1.-exp(-waterDepth*640.);
  // Intersect two refracted edge-light rays with the physical stone. The
  // ratio of footprint areas is irradiance concentration at the receiver.
  let incident0=refract(-topRay,n,1.0/1.333);
  let incident1=refract(-bottomRay,n,1.0/1.333);
  let hit0=world+incident0*waterDepth/max(.12,-dot(incident0,base));
  let hit1=world+incident1*waterDepth/max(.12,-dot(incident1,base));
#ifdef RAY_SURFACE_CONTEXT
  let focus0=0.0;
  let focus1=0.0;
#else
  let area=abs(dot(cross(dpdx(world),dpdy(world)),base));
  let footprint0=abs(dot(cross(dpdx(hit0),dpdy(hit0)),base));
  let footprint1=abs(dot(cross(dpdx(hit1),dpdy(hit1)),base));
  let focus0=clamp(area/max(.00000001,footprint0)-1.,0.,1.);
  let focus1=clamp(area/max(.00000001,footprint1)-1.,0.,1.);
#endif
  let cold=vec3<f32>(.58,.80,1.)*filmFocus*(5.8*top+4.4*bottom+2.0*focus0+1.5*focus1);
  let impact=exp(-29.*max(0.,world.y-.287))*(bottom+focus1)*.8;
  // This optical normal is passed to Standard's TRANSMISSION_AVAILABLE
  // forward pass. The renderer projects its refracted exit into the real opaque
  // scene; UV1 supplies the wet-only path length, fading at the panel seals.
  let filmSlope=n-base*dot(n,base);
  let opticalNormal=normalize(base+filmSlope*(1.0+1.9*wet));
  return SurfaceData(vec3<f32>(.991,.998,1.),opticalNormal,0.,.047,
    wet*(room+cold+vec3<f32>(.65,.83,1.)*impact),1.,1.,0.,.72);
}
