"""Author repeatable tileable PBR maps in linear roughness and tangent-space normals."""
from pathlib import Path
import numpy as np
from PIL import Image

out = Path(__file__).with_name('maps')
out.mkdir(exist_ok=True)
rng = np.random.default_rng(189)
n = 512
y,x = np.mgrid[:n,:n] * (2*np.pi/n)

def field(frequency):
    a = np.zeros((n,n))
    for _ in range(22):
        k,j = rng.integers(-frequency,frequency+1,2)
        a += np.cos(k*x+j*y+rng.uniform(0,2*np.pi))
    return a / np.std(a)

def save(name, colour, height, roughness, metal):
    dx = (np.roll(height,-1,1)-np.roll(height,1,1))*.5
    dy = (np.roll(height,-1,0)-np.roll(height,1,0))*.5
    normal=np.stack((-dx,dy,np.ones_like(dx)),axis=-1)
    normal=normal/np.linalg.norm(normal,axis=-1,keepdims=True)
    def write(s,v):
        Image.fromarray(np.uint8(np.clip(v,0,1)*255)).save(out/(name+'-'+s+'.png'))
    write('color',colour)
    write('normal',normal*.5+.5)
    write('orm',np.stack((np.ones_like(dx),np.broadcast_to(roughness,dx.shape),np.full_like(dx,metal)),axis=-1))

grain = field(52)*.4+field(9)*.6
tone=np.array([.315,.152,.133])
save('garnet',tone*(1+grain[:,:,None]*.095),grain*.16,.53+.052*grain,.03)
grain=field(56)*.2+field(12)*.8
basalt=np.array([.20,.208,.215])*(1+.13*grain[:,:,None])
save('basalt',basalt,grain*.28,.57+.055*grain,.03)
linear=(np.sin(y*115+.23*np.sin(x*2))+.6*np.sin(y*179+.2*np.cos(x*3)))*.4+field(16)*.12
save('nickel',np.array([.66,.635,.605])*(1+linear[:,:,None]*.075),linear*.14,.36+.09*linear,.85)
v=field(10)+.36*field(22)+.14*field(45)
vein=np.exp(-np.square(v*3.4))
chips=field(60)
c=np.stack((.59+.36*vein+.09*np.tanh(v),.30+.42*vein+.07*np.tanh(v),.095+.28*vein),axis=-1)
save('amber',c*(1+.035*chips[:,:,None]),v*.07,.25+.025*chips,.02)
