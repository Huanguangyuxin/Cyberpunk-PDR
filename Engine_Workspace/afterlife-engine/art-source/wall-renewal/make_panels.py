"""Author a 2.7 × 1.65 m four-cassette wrap for original continuous wall faces."""
from pathlib import Path
import numpy as np
from PIL import Image
here=Path(__file__).parent
src=here.parent/'hall-redesign/maps'
def load(k):
    return np.asarray(Image.open(src/('gunmetal-'+k+'.png')).convert('RGB'),dtype=np.float32)
c,n,r=map(load,('color','normal','orm'))
y,x=np.indices(c.shape[:2],dtype=np.float32)
u=x%1024
v=y%1024
edge=np.minimum.reduce([u,1023-u,v,1023-v])
seam=np.clip((3-edge)/2.4,0,1)
bevel=np.exp(-((edge-5)/1.7)**2)
xsign=np.where(u<512,1,-1)
ysign=np.where(v<512,-1,1)
n[:,:,0]+=34*bevel*np.where(np.minimum(u,1023-u)<np.minimum(v,1023-v),xsign,0)
n[:,:,1]+=34*bevel*np.where(np.minimum(u,1023-u)>=np.minimum(v,1023-v),ysign,0)
panel=((x//1024)*2+y//1024)
tone=np.choose(panel.astype(int),[.92,1.04,.99,1.07])
c*=tone[:,:,None]*(1-.73*seam[:,:,None])
r[:,:,1]=np.clip(r[:,:,1]+(panel-1.5)*3+seam*36,0,255)
r[:,:,2]*=1-.62*seam
for cx in (31,992):
 for cy in (45,978):
  d=np.hypot(u-cx,v-cy)
  ring=np.clip(1-abs(d-5.8)/1.6,0,1)
  disk=np.clip((5.6-d)/1.5,0,1)
  slot=(abs((v-cy)*.84-(u-cx)*.55)<.85)&(d<4)
  c*=1-.49*ring[:,:,None]-.45*slot[:,:,None]
  c+=disk[:,:,None]*6
  r[:,:,1]-=disk*7
  n[:,:,1]+=ring*(v-cy)/7*30
for name,a in [('color',c),('normal',n),('orm',r)]:
 Image.fromarray(np.clip(a,0,255).astype('uint8')).save(here/('graphite-'+name+'.png'))
