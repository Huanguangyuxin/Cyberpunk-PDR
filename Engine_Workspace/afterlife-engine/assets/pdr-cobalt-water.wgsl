#define_import_path cyberpunk_pdr::cobalt_water
#import forgeax_material::surface_v1::{SurfaceInput, SurfaceData}

fn evaluate_surface(input: SurfaceInput) -> SurfaceData {
  let n=normalize(input.vertexNormalWS);
  let v=normalize(input.viewDirectionWS);
  let mu=clamp(abs(dot(n,v)),0.,1.);
  // Fresnel reflection at the water/air interface. The forward blend retains
  // the actual blue backing at the centre; grazing facets reflect the room.
  let cosT=sqrt(max(0.,1.-1.333*1.333*(1.-mu*mu)));
  let rs=(1.333*mu-cosT)/max(.0001,1.333*mu+cosT);
  let rp=(mu-1.333*cosT)/max(.0001,mu+1.333*cosT);
  let edge=.5*(rs*rs+rp*rp);
  let r=reflect(-v,n);
  let dir=normalize(vec3<f32>(-.30,.73,.61));
  // Average the extended rails over the curved interface. The top and
  // bottom rails run along the entire counter; a pin light would leave
  // almost every visible facet unlit at the eye height of a standing guest.
  let upper=smoothstep(-.42,.86,r.y+.24*r.z);
  let lower=smoothstep(.05,.92,-r.y+.30*r.x);
  let sparkle=pow(max(dot(r,dir),0.),4.);
  let rail=edge*vec3<f32>(2.55,3.36,3.95)*(.42+1.75*upper+.82*lower)
          +vec3<f32>(1.35,1.65,1.85)*(.30+1.25*edge)*sparkle;
  return SurfaceData(vec3<f32>(0.),n,0.,.095,rail,1.,.012+.62*edge,0.,0.);
}
