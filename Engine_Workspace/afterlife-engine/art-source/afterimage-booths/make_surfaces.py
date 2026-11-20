"""Bake a small, tileable PBR texture set for the AFTERIMAGE seating kit."""
from pathlib import Path
import numpy as np
from PIL import Image
root=Path(__file__).with_name('maps')
root.mkdir(exist_ok=True)
size=512
rng=np.random.default_rng(189)
y,x=np.mgrid[:size,:size]
def noise(scale):
    grid=rng.normal(0,1,(scale,scale))
    xx=x*scale/size; yy=y*scale/size
    i=xx.astype(int);j=yy.astype(int)
    a=xx-i;b=yy-j
    a=a*a*(3-2*a);b=b*b*(3-2*b)
    return ((1-a)*grid[j,i]+a*grid[j,(i+1)%scale])*(1-b)+((1-a)*grid[(j+1)%scale,i]+a*grid[(j+1)%scale,(i+1)%scale])*b
def bake(name,col,rough,metal,height,strength):
    def save(suffix,data):
        Image.fromarray(np.clip(data,0,255).astype('uint8')).save(root/(name+'-'+suffix+'.png'))
    save('color',col)
    dx=(np.roll(height,1,1)-np.roll(height,-1,1))*strength
    dy=(np.roll(height,-1,0)-np.roll(height,1,0))*strength
    n=np.stack([dx,dy,np.ones_like(dx)],-1);n/=np.linalg.norm(n,axis=-1,keepdims=True)
    save('normal',(n*.5+.5)*255)
    save('orm',np.stack([np.full_like(height,255),np.broadcast_to(rough,height.shape)*255,np.full_like(height,metal*255)],-1))
grain=noise(135)*.52+noise(223)*.43+noise(37)*.23
pore=np.clip((noise(171)-.6)*2,0,1)
h=grain*.22-pore*.28
bake('merlot',np.array([88,32,40])+((grain*4-pore*7+noise(8)*3)[:,:,None]),.41+np.clip(grain*.045,-.09,.09),0,h,.68)
lines=noise(155)*.2+rng.normal(0,1,(size,1))*.7
bake('bronze',np.array([150,111,69])+lines[:,:,None]*4,.31+np.clip(lines*.045,-.09,.09),.83,lines*.04,.6)
seeds=np.clip((noise(168)-1.0)*1.5,0,1);stars=np.clip((noise(196)-1.8)*2,0,1)
amber=np.array([87,48,24])+(seeds*56+stars*69+noise(33)*7)[:,:,None]*np.array([1,.74,.37])
bake('amber',amber,.20+seeds*.12,0,seeds*.22+noise(50)*.06,.45)
aggregate=noise(173);chip=np.clip((aggregate-1.05)*1.4,0,1)
bake('stone',np.array([53,49,52])+(chip*52+noise(36)*3)[:,:,None],.32+chip*.08,.13,aggregate*.035,.33)

# Rear-lit cast panel. Bright pinpricks and edge scatter are baked separately
# from the glass grain; the lower row is the physically illuminated edge.
bottom=(y/(size-1))**4.8
light=.045+bottom*.57+seeds*(.10+bottom*.23)+stars*(.56+bottom*.18)
Image.fromarray(np.clip(light[:,:,None]*np.array([255,158,51]),0,255).astype('uint8')).save(root/'amber-emission.png')
