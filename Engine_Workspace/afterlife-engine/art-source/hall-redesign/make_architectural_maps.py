"""Reproducible 2K PBR surfaces for the hall and gallery; no external textures."""
from pathlib import Path
import numpy as np
from PIL import Image
out=Path(__file__).with_name('maps')
n=2048
rng=np.random.default_rng(18919)

def noise(k):
    data=rng.normal(128,32,(k,k)).clip(0,255).astype('uint8')
    # Periodic overscan keeps all four edges continuous.
    padded=np.pad(data,1,mode='wrap')
    a=Image.fromarray(padded).resize((n,n),Image.Resampling.BICUBIC,box=(1,1,k+1,k+1))
    return (np.asarray(a,dtype='float32')-128)/32

def save(key,col,h,r,m):
    one=np.ones_like(h)
    dx=(np.roll(h,-1,1)-np.roll(h,1,1))*.5
    dy=(np.roll(h,-1,0)-np.roll(h,1,0))*.5
    norm=np.stack((-dx,dy,one),-1)
    norm/=np.linalg.norm(norm,axis=-1,keepdims=True)
    for suffix,array in [('color',col),('normal',(norm+1)*.5),('orm',np.stack((one,r,one*m),-1))]:
        Image.fromarray(np.uint8(np.rint(np.clip(array,0,1)*255))).save(out/(key+'-'+suffix+'.png'),compress_level=6)

cloud=noise(8)
sand=noise(390)
fleck=np.maximum(0,sand-1.03)
crystal=np.maximum(0,noise(680)-1.4)
t=.012*cloud+.007*sand+.085*fleck+.103*crystal
save('mineral',np.array([.243,.250,.266],dtype='float32')+t[:,:,None],
     .26*fleck+.12*crystal+.045*sand,.60+.028*cloud+.045*fleck,.018)
striation=rng.normal(0,1,(n,1)).astype('float32')
brush=striation*(.64+.18*noise(5))+.21*noise(170)
patina=noise(7)
t=.013*brush+.013*patina
save('gunmetal',np.array([.298,.316,.344],dtype='float32')+t[:,:,None],
     .085*brush,.41+.049*brush+.026*patina,.76)
