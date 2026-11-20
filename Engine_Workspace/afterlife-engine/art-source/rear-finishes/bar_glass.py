"""Bake the inclusions suspended in the bar's cobalt kiln-cast glass."""
from pathlib import Path
import numpy as np
from PIL import Image

def bake(folder):
    rng=np.random.default_rng(18904)
    n=1024
    def broad(bands):
        seed=rng.uniform(-1,1,(bands,bands))
        t=np.arange(n)*bands/n
        i=t.astype(int)
        v=t-i
        v=v*v*(3-2*v)
        rows=seed[:,i]*(1-v)+seed[:,(i+1)%bands]*v
        return rows[i]*(1-v[:,None])+rows[(i+1)%bands]*v[:,None]
    density=.5*broad(6)+.32*broad(21)+.18*broad(70)
    # Periodic angular lapis breccia. Every fragment has an individual grade
    # and broken facet; bedding meanders across it instead of repeating by pane.
    yy,xx=np.indices((n,n),dtype=np.float32)
    ux=xx*53/n+1.2*density+.28*broad(33)
    uy=yy*25/n+.35*np.sin(2*np.pi*xx/n)+.64*density
    cx=np.floor(ux).astype(int);cy=np.floor(uy).astype(int)
    jitter=rng.uniform(.12,.88,(25,53,2))
    grades=rng.uniform(0,1,(25,53))
    best=np.full_like(xx,1e5);second=best.copy()
    tone=np.zeros_like(xx);facet=np.zeros_like(xx)
    for dy in (-1,0,1):
        for dx in (-1,0,1):
            gx=(cx+dx)%53;gy=(cy+dy)%25
            rx=ux-cx-dx-jitter[gy,gx,0];ry=uy-cy-dy-jitter[gy,gx,1]
            dist=rx*rx+.88*ry*ry+.31*rx*ry
            nearer=dist<best
            second=np.minimum(second,np.maximum(best,dist))
            tone=np.where(nearer,grades[gy,gx],tone)
            facet=np.where(nearer,rx*.6-ry*.8,facet)
            best=np.minimum(best,dist)
    seam=np.exp(-14*np.maximum(0,second-best))
    phase=2*np.pi*(3*xx/n+2*yy/n)+6.1*broad(6)+1.8*broad(20)
    vein=np.exp(-23*np.abs(np.sin(phase)))*np.maximum(0,.45+.75*density)
    t=np.clip(.24+.48*tone+.27*density+.095*facet-.035*seam,0,1)
    row=(np.arange(n)+.5)/n
    edge=(np.exp(-row/.041)+.92*np.exp(-(1-row)/.047))[:,None]
    # Millimetre glass frit catches the edge light. Keep the surrounding
    # cobalt quiet so a moving water highlight reads separately from the backing.
    fleck_rng=np.random.default_rng(743)
    seeds=np.zeros((n,n),np.float32)
    y,x=fleck_rng.integers(0,n,size=(2,10800))
    np.maximum.at(seeds,(y,x),fleck_rng.uniform(.12,1,len(x))**2)
    frit=np.maximum.reduce([seeds,np.roll(seeds,1,0)*.78,
        np.roll(seeds,1,1)*.57,np.roll(np.roll(seeds,1,1),1,0)*.42])
    body=.24*t+.39*(density+.9)
    colour=np.stack([6+9*body+41*frit,18+27*body+83*frit,61+65*body+107*frit],2)
    lum=np.stack([1+4*body+11*frit,7+8*body+26*edge+62*frit,
                  35+31*body+89*edge+112*frit],2)
    h=.025*tone+.018*facet+.15*frit
    dx=np.roll(h,1,1)-np.roll(h,-1,1)
    dy=np.roll(h,1,0)-np.roll(h,-1,0)
    normal=np.stack([dx,dy,np.ones_like(dx)],2)
    normal=127.5+127.5*normal/np.linalg.norm(normal,axis=2,keepdims=True)
    rough=91+13*density-17*frit
    for name,v in [('color',colour),('scatter',lum),('normal',normal),
                   ('orm',np.stack([np.full_like(h,255),rough,np.full_like(h,6)],2))]:
        Image.fromarray(np.clip(v,0,255).astype('uint8')).save(folder/f'cobalt-{name}.png')

if __name__=='__main__':
    bake(Path(__file__).resolve().parent/'maps')
