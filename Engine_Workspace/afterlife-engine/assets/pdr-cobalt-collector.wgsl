#define_import_path cyberpunk_pdr::cobalt_collector
#import forgeax_material::surface_v1::{SurfaceInput, SurfaceData}

fn evaluate_surface(input: SurfaceInput) -> SurfaceData {
  let n=normalize(input.vertexNormalWS);
  let band=input.uv0.y;
  if(band>2.){
    return SurfaceData(vec3<f32>(.055,.071,.082),n,.59,.53,vec3<f32>(.007,.021,.03),1.,1.,0.,.22);
  }
  if(band>=1.){
    let v=normalize(input.viewDirectionWS);
    let fresnel=.0204+.9796*pow(1.-clamp(abs(dot(n,v)),0.,1.),5.);
    let edge=smoothstep(1.45,1.8,band);
    let light=(fresnel+.35*edge)*vec3<f32>(.06,.36,.58);
    return SurfaceData(vec3<f32>(0.),n,0.,.055,light,1.,min(.84,.05+.65*fresnel),0.,0.);
  }
  let sides=min(input.uv0.x,1.-input.uv0.x);
  let sideGlow=exp(-sides*410.)*(.62+.38*band);
  let line=exp(-(1.-band)*70.);
  // Light from the concealed rails scatters through the filled channel.
  // The lower rail lights the body of water; the upper rail catches its meniscus.
  let lowerWash=exp(-3.4*(1.-band));
  let upperWash=exp(-8.*band);
  let light=vec3<f32>(.035,.065,.26)*(.22+1.4*lowerWash+.22*upperWash)
           +vec3<f32>(.021,.28,.58)*sideGlow+vec3<f32>(.056,.34,.58)*line;
  return SurfaceData(vec3<f32>(0.),n,0.,.055,light,1.,.12,0.,0.);
}
