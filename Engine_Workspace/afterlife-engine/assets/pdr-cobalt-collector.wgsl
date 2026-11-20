#define_import_path cyberpunk_pdr::cobalt_collector
#import forgeax_material::surface_v1::{SurfaceInput, SurfaceData}

fn evaluate_surface(input: SurfaceInput) -> SurfaceData {
  let n=normalize(input.vertexNormalWS);
  if(input.uv0.y>1.5){
    // An air interface in shallow water. The edge redirects more of the
    // view ray; a small reflection of the upper strip lights the near crown.
    let v=normalize(input.viewDirectionWS);
    let mu=clamp(abs(dot(n,v)),0.,1.);
    // Air in water has a critical angle. This gives the air pocket a
    // distinct side rim while the centre still transmits the blue substrate.
    let eta=1.333;
    let cosT=sqrt(max(0.,1.-eta*eta*(1.-mu*mu)));
    let rs=(eta*mu-cosT)/max(.0001,eta*mu+cosT);
    let rp=(mu-eta*cosT)/max(.0001,mu+eta*cosT);
    let edge=.5*(rs*rs+rp*rp);
    let r=reflect(-v,n);
    let strip=pow(max(r.y,0.),4.);
    let room=mix(vec3<f32>(.045,.12,.22),vec3<f32>(1.18,1.48,1.64),strip);
    let light=edge*room+vec3<f32>(.62,.82,1.)*.68*pow(max(dot(r,normalize(vec3<f32>(-.32,.89,.33))),0.),18.);
    return SurfaceData(vec3<f32>(0.),n,0.,.045,light,1.,min(.97,.045+edge*.95),0.,0.);
  }
  let energy=input.uv1.x;
  let t=input.uv1.y;
  let x=input.uv0.x;
  let d=input.uv0.y*.027;
  // Slopes and curvature of two crossing, nonparallel impact waves. Refract
  // strip-light rays through a 7 mm pool; convergence brightens the metal.
  let a=x*206.+d*310.-t*8.9;
  let b=x*289.-d*180.+t*6.7+1.6*sin(x*17.);
  let bend=(.007*(1.-1./1.333))*energy;
  let c=.0018*cos(a);let e=.0009*cos(b);
  let xx=1.-bend*(c*206.*206.+e*289.*289.);
  let yy=1.-bend*(c*310.*310.+e*180.*180.);
  let xy=-bend*(c*206.*310.-e*289.*180.);
  let focus=clamp(1./max(.20,abs(xx*yy-xy*xy))-.84,0.,3.);
  let rim=mix(1.,.60,smoothstep(.80,.89,input.uv0.y));
  let spot=vec3<f32>(.56,.85,1.)*(2.5*energy*focus*rim);
  return SurfaceData(vec3<f32>(.039,.061,.080),n,.40,.43,spot,1.,1.,0.,.24);
}
