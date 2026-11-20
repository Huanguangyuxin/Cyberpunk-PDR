"""Bake periodic surface colour, normal and packed glTF roughness/metalness."""
from pathlib import Path
import numpy as np
from PIL import Image

out = Path(__file__).parent / 'maps'
out.mkdir(exist_ok=True)
n = 512
rng = np.random.default_rng(189)
def noise(size):
    grid = rng.normal(size=(size,size))
    t = np.arange(n)*size/n
    i = t.astype(int)
    a = t-i
    a = a*a*(3-2*a)
    rows = grid[:,i]*(1-a) + grid[:,(i+1)%size]*a
    return rows[i]*(1-a[:,None])+rows[(i+1)%size]*a[:,None]

def save(name, values):
    Image.fromarray(np.clip(values,0,255).astype('uint8')).save(out/(name+'.png'))

for key,base in [('terrazzo',[57,56,62]),('basalt',[42,45,49]),('trim',[99,103,109]),('steel',[62,66,74]),('petrol',[24,83,91])]:
    cloud,grain,fine = noise(7),noise(72),noise(256)
    aggregate = np.maximum(0,noise(140)-.85)
    chips = np.maximum(0,noise(63)-1.33)
    if key == 'terrazzo':
        value=2*cloud+3*grain+9*aggregate+11*chips
        height=.08*fine+.12*aggregate
        rough=139+5*cloud+18*aggregate-16*chips
    elif key == 'basalt':
        value=8*cloud+5*grain+7*fine+18*chips
        height=.32*grain+.27*fine
        rough=153+19*cloud+13*grain
    elif key in ('steel','petrol'):
        streak=np.tile(rng.normal(0,1,n),(n,1))
        wear=np.maximum(0,grain+cloud-.8)
        seeds=(rng.random((n,n))>.998)*18.
        scratches=seeds.copy()
        for shift in range(1,12):
            scratches+=np.roll(seeds,shift,axis=1)*.3
        value=4*cloud+3*grain+2*streak+3*fine+12*wear+scratches
        height=.07*grain+.04*streak
        rough=(99 if key=='petrol' else 137)+15*cloud+8*grain
    else:
        brush=np.tile(rng.normal(size=n),(n,1))
        patina=np.maximum(0,cloud-.3)
        value=4*brush-25*patina+4*fine
        height=.075*brush+.06*fine
        rough=80+12*brush+40*patina
    save(key+'-color',np.array(base)+value[:,:,None])
    dx=np.roll(height,1,1)-np.roll(height,-1,1)
    dy=np.roll(height,-1,0)-np.roll(height,1,0)
    normal=np.stack([dx,dy,np.ones_like(dx)],2)
    save(key+'-normal',127.5+127.5*normal/np.linalg.norm(normal,axis=2,keepdims=True))
    save(key+'-orm',np.stack([np.full_like(rough,255),rough,np.full_like(rough,{'trim':198,'steel':132}.get(key,0))],2))

# Fine graphite powder coat for the west booth wall. Vary the microfinish,
# keeping the base coat uniform across each sheet.
powder = noise(200)
grain = rng.normal(0, 1, (n,n))
brushing = np.broadcast_to(rng.normal(0, 1, (n,1)), (n,n))
tone = .45*noise(6) + 1.10*powder + .65*grain + .65*brushing
save('graphite-color', np.array([56,55,56]) + tone[:,:,None])
roughness = 172 + 2*powder + 1.3*brushing + .8*grain
save('graphite-orm', np.stack([np.full_like(tone,255),roughness,np.full_like(tone,52)],2))
relief = .012*powder + .008*brushing
nx = np.roll(relief,1,1)-np.roll(relief,-1,1)
ny = np.roll(relief,-1,0)-np.roll(relief,1,0)
normal = np.stack([nx,ny,np.ones_like(nx)],2)
save('graphite-normal',127.5+127.5*normal/np.linalg.norm(normal,axis=2,keepdims=True))

# The bar block is backed by a blue LED cavity. Cast inclusions affect both
# the albedo and surface normal. A separate texture describes light scatter.
yy,xx=np.mgrid[:n,:n]
def export_surface(key,colour,height,roughness,metalness):
    dx=np.roll(height,1,1)-np.roll(height,-1,1)
    dy=np.roll(height,1,0)-np.roll(height,-1,0)
    normal=np.stack([dx,dy,np.ones_like(dx)],axis=2)
    save(key+'-color',colour)
    save(key+'-normal',127.5+127.5*normal/np.linalg.norm(normal,axis=2,keepdims=True))
    save(key+'-orm',np.stack([np.full_like(height,255),roughness,np.full_like(height,metalness)],axis=2))

inclusions=np.zeros((n,n))
for _ in range(1050):
    x,y=rng.integers(0,n,size=2)
    radius=rng.uniform(.65,3)
    extent=int(np.ceil(radius*1.9))
    iy,ix=np.mgrid[-extent:extent+1,-extent:extent+1]
    rr=np.hypot(ix,iy)/radius
    bubble=(np.exp(-((rr-.75)*3.7)**2)*(.50+.22*iy/radius)+.16*np.exp(-rr**2))
    inclusions[np.ix_((y+np.arange(-extent,extent+1))%n,(x+np.arange(-extent,extent+1))%n)]+=bubble*rng.uniform(.6,1.4)
glassnoise=.42*noise(9)+.28*noise(35)+.12*noise(128)
g=np.clip(.24+glassnoise*.12+.56*inclusions,0,1)
export_surface('cobalt',np.stack([6+27*g,24+84*g,76+155*g],2),
               .12*glassnoise+.85*inclusions,51+14*g,16)
save('cobalt-scatter',np.stack([2+12*g,18+48*g,70+115*g],2))

glaze=.52*noise(7)+.26*noise(49)+.12*noise(171)
export_surface('garnet',np.stack([89+17*glaze,17+5*glaze,27+5*glaze],2),
               .20*glaze,72+14*glaze,5)
brush=np.broadcast_to(rng.normal(size=(n,1)),(n,n))
patina=noise(5)*.6+noise(33)*.23
export_surface('champagne',np.array([157,128,94])+((6*brush+5*patina)[:,:,None]),
               .052*brush+.01*patina,90+10*brush+12*patina,220)
export_surface('pewter',np.array([137,139,140])+((5*brush+3*patina)[:,:,None]),
               .044*brush+.018*patina,79+13*brush+7*patina,231)

# The reference uses separate base, relief and finish maps for the upper walls.
# Bake the foyer's own materials at physical scale. Existing small fittings retain
# the 512 px set; only close-view architectural surfaces receive larger sheets.
def architectural_surface(key, resolution, repeat_m):
    global n, rng
    n = resolution
    rng = np.random.default_rng({'terrazzo':191,'basalt':193,'graphite':197,'steel':199,'garnet':211}[key])
    def field(periods):
        return noise(periods).astype(np.float32)
    broad = field(5)
    meso = field(43)
    grains = field(228)
    pixels = rng.normal(size=(n,n)).astype(np.float32)
    if key in ('terrazzo','basalt'):
        floor = key == 'terrazzo'
        # Discrete angular mineral fragments, with polished face and relief rim.
        # Tile the patches over all four borders so the exported repeat is seamless.
        chips = np.zeros((n,n),dtype=np.float32)
        warmth = np.zeros_like(chips)
        for _ in range(21500 if floor else 9700):
            cx, cy = rng.integers(n,size=2)
            radius_mm = rng.uniform(0.65,3.6) if floor else rng.uniform(.6,2.55)
            radius = radius_mm * .001 * n / repeat_m
            span = int(np.ceil(radius*1.6))
            idx = np.arange(-span,span+1)
            yy,xx = np.meshgrid(idx,idx,indexing='ij')
            a = rng.uniform(0,np.pi)
            p = (xx*np.cos(a)+yy*np.sin(a))/radius
            q = (-xx*np.sin(a)+yy*np.cos(a))/(radius*rng.uniform(.47,1))
            edge = 1 - np.maximum.reduce([np.abs(p), np.abs(q), .77*np.abs(p+.74*q)])
            coverage = np.clip(edge*radius+.35,0,1)
            site = np.ix_((cy+idx)%n,(cx+idx)%n)
            mineral = rng.choice([-1,.65,1.25,2.3],p=[.26,.39,.26,.09])
            chips[site] += mineral*coverage
            warmth[site] += rng.uniform(-1.4,1)*coverage
        tone = (2.0*broad+1.7*meso+2.6*grains+.85*pixels+21*chips if floor
                else 3.4*broad+3.7*meso+4.5*grains+1.35*pixels+12*chips)
        base = np.array([69,66,66] if floor else [47,45,45])
        colour = base+tone[:,:,None]+warmth[:,:,None]*[3.1,.6,-1.7]
        height = (.019*pixels+.092*grains+.16*chips if floor
                  else .05*pixels+.24*grains+.31*meso+.21*chips)
        roughness = (118+7*broad+6*meso+9*grains-11*chips if floor
                     else 154+11*broad+10*meso+13*grains-4*chips)
        metalness = 0
    elif key in ('steel','graphite'):
        # Hairlines on the foyer's rolled graphite-nickel sheet catch the
        # grazing light. Keep the other architectural gunmetal independently tuned.
        sheet = key == 'steel'
        brushing = np.broadcast_to(rng.normal(size=(n,1)),(n,n)).astype(np.float32)
        hairlines = np.zeros((n,n),np.float32)
        for _ in range(95 if sheet else 30):
            x,y = rng.integers(n,size=2)
            length = rng.integers(7,n//13)
            line = np.arange(length)
            weight = np.sin(np.pi*(line+.5)/length)*rng.uniform(.4,1)
            hairlines[(y+np.rint(.018*line).astype(int))%n,(x+line)%n] += weight
        finish = .9*broad+1.2*meso+1.35*grains+.9*pixels+brushing*(1.7 if sheet else 1.)
        colour = np.array([64,64,66] if sheet else [82,82,85])+(finish+7*hairlines)[:,:,None]
        height = .015*pixels+.035*grains+(.053 if sheet else .061)*brushing-.23*hairlines
        roughness = (121 if sheet else 106)+5*meso+6*grains+4*brushing+19*hairlines
        metalness = 165 if sheet else 192
    else:
        # Subtle thickness variation under a continuous garnet ceramic glaze.
        pooling = .5*broad+.39*meso+.13*grains
        pits = np.clip(-grains-1.35,0,1)
        colour = np.stack([79+11*pooling,17+3*pooling,28+5*pooling],axis=2)
        height = .07*meso+.075*grains-.19*pits
        roughness = 71+8*meso+4*grains+19*pits
        metalness = 0
    export_surface(key,colour,height,roughness,metalness)

for name,size,meters in [('terrazzo',2048,1.6),('basalt',1024,.70),
                         ('graphite',2048,1.4),('steel',1024,1.4),('garnet',1024,.68)]:
    architectural_surface(name,size,meters)

# Finish the cobalt bake with the current glass recipe.
from bar_glass import bake as bake_bar_glass
bake_bar_glass(out)

from bar_metals import bake as bake_bar_metals
bake_bar_metals(out)
