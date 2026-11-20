"""Optical density and edge-lit scatter of the smoke-blue glass backer."""
from pathlib import Path
import numpy as np
from PIL import Image

def bake(folder):
    rng=np.random.default_rng(18904)
    n=1024
    row=(np.arange(n)+.5)/n
    u,v=np.meshgrid(row,row)
    # A smooth dark-blue backing. Its vertical gradient follows the physical
    # upper and lower light rails. Minute glass variation has no bright flecks.
    edge=np.exp(-v/.082)+.68*np.exp(-(1-v)/.064)
    grain=rng.normal(0,.42,(n,n))
    density=.5*np.sin(2*np.pi*u)+.23*np.cos(2*np.pi*(3*u+v))
    def rgb(*channels):
        return np.stack(np.broadcast_arrays(*channels),axis=2)
    colour=rgb(5.8+grain,13.5+1.1*density+.7*grain,34+2*density+grain)
    scatter=rgb(1.2+1.7*edge,5+14*edge,16+36*edge)
    h=grain*.014
    dx=np.roll(h,1,1)-np.roll(h,-1,1)
    dy=np.roll(h,1,0)-np.roll(h,-1,0)
    normal=rgb(dx,dy,np.ones_like(h))
    normal=127.5+127.5*normal/np.linalg.norm(normal,axis=2,keepdims=True)
    orm=rgb(np.full_like(h,255),88+1.4*density+grain,np.zeros_like(h))
    for name,pixels in [('color',colour),('scatter',scatter),('normal',normal),('orm',orm)]:
        Image.fromarray(np.clip(pixels,0,255).astype('uint8')).save(folder/f'cobalt-{name}.png')

if __name__=='__main__':
    bake(Path(__file__).resolve().parent/'maps')
