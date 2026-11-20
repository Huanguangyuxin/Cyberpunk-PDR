"""Continuous, channel-sewn upholstery following the original L/U booth footprint."""
import math

# Cross section from the concealed lower rear, around the lumbar roll and over the crown.
# Values are (inward offset, height, channel relief multiplier), in metres.
PROFILE = [
    # Upholstery folds into the seat at the toe. A shallow seam closes the
    # cove where it meets the compressed upper surface of the seat foam.
    (-.073,.414,0),(.182,.414,0),(.243,.465,0),(.262,.483,0),
    (.262,.490,0),(.258,.495,0),(.252,.497,0),(.244,.497,0),
    (.234,.499,.02),(.220,.503,.04),(.206,.510,.08),(.194,.520,.14),
    (.183,.533,.22),(.174,.550,.34),(.168,.570,.53),(.164,.593,.74),
    (.161,.618,.92),(.157,.644,1),(.152,.673,1),
    (.128,.752,1),(.089,.874,1),(.068,.964,.98),(.064,1.005,.91),
    (.056,1.030,.65),(.045,1.046,.26),(.043,1.052,.04),(.046,1.055,0),(.046,1.059,0),
    (.042,1.063,0),(.037,1.063,0),(.032,1.060,0),(.031,1.057,0),(.010,1.058,.05),
    (-.060,1.058,0),(-.093,1.048,0),(-.111,1.027,0),
    (-.118,1.000,0),(-.112,.941,0),(-.085,.431,0),
]
RADIUS=.395
RAIL_X=.179
LOW_Y=.210
HIGH_Y=2.373

def build_backrest(vip, foyer, emit):
    end_x=(1.949 if vip else 2.129)-.085
    far_end_x=(1.56 if foyer else 1.95 if vip else 1.14)-.085
    bend_x=RAIL_X+RADIUS
    elbow_low=LOW_Y+RADIUS
    elbow_high=HIGH_Y-RADIUS
    # Each path sample gives the position, unit tangent and cumulative textile distance.
    path=[]
    def sample(length, fn):
        start=path[-1][4] if path else 0.
        steps=math.ceil(length/.014)
        for i in range(1 if path else 0,steps+1):
            d=length*i/steps
            path.append((*fn(d),start+d))
    sample(end_x-bend_x,lambda d:(end_x-d,LOW_Y,-1.,0.))
    def arc_low(d):
        a=-math.pi/2-d/RADIUS
        return bend_x+RADIUS*math.cos(a),elbow_low+RADIUS*math.sin(a),math.sin(a),-math.cos(a)
    sample(math.pi*RADIUS/2,arc_low)
    sample(elbow_high-elbow_low,lambda d:(RAIL_X,elbow_low+d,0.,1.))
    def arc_high(d):
        a=math.pi-d/RADIUS
        return bend_x+RADIUS*math.cos(a),elbow_high+RADIUS*math.sin(a),math.sin(a),-math.cos(a)
    sample(math.pi*RADIUS/2,arc_high)
    sample(far_end_x-bend_x,lambda d:(bend_x+d,HIGH_Y,1.,0.))

    total=path[-1][4]
    # Rounded, solid end panels turn the upholstery over the arm in full view.
    first,last=path[0],path[-1]
    def tip(item, retreat, scale, start):
        x,y,tx,ty,s=item
        direction=-1 if start else 1
        return x+direction*tx*retreat,y+direction*ty*retreat,tx,ty,s+direction*retreat,scale
    path=[tip(first,.026,.90,True),tip(first,.019,.965,True),tip(first,.009,.992,True)]+[
        (*p,1.) for p in path]+[tip(last,.009,.992,False),tip(last,.019,.965,False),tip(last,.026,.90,False)]
    perimeter=[0.]
    for a,b in zip(PROFILE,PROFILE[1:]+PROFILE[:1]):
        perimeter.append(perimeter[-1]+math.hypot(a[0]-b[0],a[1]-b[1]))
    vertices=[];polygons=[];uv=[];smooth=[]
    def face(indices,coords,rounded=True):
        polygons.append(indices);uv.append(coords);smooth.append(rounded)
    count=len(PROFILE)
    pitch=total/max(1,round(total/(.143 if foyer else .170)))
    for i,(x,y,tx,ty,s,scale) in enumerate(path):
        dist=abs((s+pitch/2)%pitch-pitch/2)
        inset=.0165*math.exp(-(dist/.015)**2)
        fade=max(0.,min(1.,min(s,total-s)/.07))
        for j,(offset,z,weight) in enumerate(PROFILE):
            depth=(min(0.,offset)*.4+max(0.,offset)-weight*inset*fade)*scale
            h=.700+(z-.700)*scale
            if not vip:
                # Compress the arm foam toward its rounded nose, retaining the seat seam.
                shoulder=max(0.,min(1.,(x-.65)/.80))
                shoulder=shoulder*shoulder*(3-2*shoulder)
                h+=.045*(1.-shoulder)*max(0.,(h-.502)/.56)
            vertices.append((x+ty*depth,y-tx*depth,h))
        if i==0:continue
        for j in range(count):
            k=(j+1)%count
            indices=[(i-1)*count+j,i*count+j,i*count+k,(i-1)*count+k]
            u0,u1=path[i-1][4]*2.6,s*2.6
            v0,v1=perimeter[j]*2.6,perimeter[j+1]*2.6
            face(indices,[(u0,v0),(u1,v0),(u1,v1),(u0,v1)])
    for ring in [0,len(path)-1]:
        x,y,tx,ty,s,scale=path[ring]
        center=len(vertices)
        cap_z=.482
        vertices.append((x,y, .700+(cap_z-.700)*scale))
        for j in range(count):
            k=(j+1)%count
            # Ring oriented counterclockwise in (depth,z), outward normal -tangent.
            corners=[j,k] if ring==0 else [k,j]
            face([center]+[ring*count+p for p in corners],
                 [(0,0)]+[(PROFILE[p][0]*scale*2.6,(PROFILE[p][1]-cap_z)*scale*2.6) for p in corners],False)
    emit(vertices,polygons,uv,smooth)
