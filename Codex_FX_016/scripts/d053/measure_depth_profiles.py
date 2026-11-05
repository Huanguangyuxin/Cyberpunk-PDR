"""D053: measure the lower column envelope from real closed liquid triangles.
Run with the project's bundled NumPy Python, not during Engine build/HMR.
"""
from pathlib import Path
import hashlib,json,math,numpy as np
P=Path(__file__).resolve().parents[3]
input_path=P/'Codex_FX_016/source/d050/liquid-input.json'
j=json.loads(input_path.read_text());out=[]
for t in j['templates']:
 p=np.array(t['positions']);ix=np.array(t['indices']).reshape(-1,3)
 a,b,c=p[ix[:,0]],p[ix[:,1]],p[ix[:,2]];e=b-a;f=c-a
 d=e[:,0]*f[:,2]-e[:,2]*f[:,0];valid=abs(d)>1e-16;a,e,f,d=a[valid],e[valid],f[valid],d[valid]
 radius=float(np.hypot(p[:,0],p[:,2]).max());lo=float(p[:,1].min());hi=float(p[:,1].max());bottom=[]
 for k in range(33):
  samples=[]
  for m in range(12):
   r=radius*min(k/32,.999);x,z=r*math.cos(m*math.tau/12),r*math.sin(m*math.tau/12)
   dx,dz=x-a[:,0],z-a[:,2];u=(dx*f[:,2]-dz*f[:,0])/d;v=(e[:,0]*dz-e[:,2]*dx)/d
   hit=(u>=-1e-7)&(v>=-1e-7)&(u+v<=1+1e-7)
   if hit.any():samples.append(float((a[:,1]+u*e[:,1]+v*f[:,1])[hit].min()))
  bottom.append(float(np.median(samples)) if samples else hi-.0015)
 out.append({'type':t['type'],'radius':radius,'lo':lo,'top':hi,'bottomByRadius':bottom})
(P/'Engine_Workspace/afterlife-engine/assets/pdr-liquid-depth-data.ts').write_text('// D053 actual triangle vertical intersections: 33 radii, 12 azimuths; lower envelope median, metres.\nexport const liquidDepthProfiles='+json.dumps(out,separators=(',',':'))+' as const;\n')
(P/'Codex_FX_016/logs/d053/depth-profiles.json').write_text(json.dumps({'method':'Actual source closed-mesh vertical triangle intersections at33 radial samples/12 azimuths, not a vertex-only envelope','input_sha256':hashlib.sha256(input_path.read_bytes()).hexdigest(),'profiles':out},indent=2))
