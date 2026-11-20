"""Back screen for the stage-side banquette, in local Blender metres."""
import math

def build_screen(emit,box,glass,bronze,opal):
    x=.060
    start,end=.185,2.366
    low,high=1.088,1.474
    pitch_count=91
    segments=pitch_count*6
    points=[]
    faces=[]
    tex=[]
    smooth=[]
    materials=[]

    def quad(corners, uv, softened=False):
        faces.append(corners)
        tex.append(uv)
        smooth.append(softened)
        materials.append(glass)

    for i in range(segments+1):
        u=i/segments
        y=start+(end-start)*u
        front=x+.006+.003*(1-math.cos(i*math.pi/3))
        points.extend([(front,y,low),(front,y,high),(x-.006,y,high),(x-.006,y,low)])
        if not i:
            continue
        a=(i-1)*4
        b=i*4
        for j in range(4):
            k=(j+1)%4
            first=(i-1)/segments
            quad([a+j,b+j,b+k,a+k],[(first,0),(u,0),(u,1),(first,1)],j==0)
    quad([0,1,2,3],[(0,0),(0,1),(1,1),(1,0)])
    last=segments*4
    quad([last+3,last+2,last+1,last],[(0,0),(0,1),(1,1),(1,0)])
    emit(points,faces,tex,smooth,materials)
    # The shoe rests flush on the original 1.059 m shell. The lens is seated
    # in its aisle-side rebate, and the metal uprights clamp both glass ends.
    box(bronze,(x,(start+end)/2,1.074),(.049,end-start+.038,.030),.004)
    box(opal,(x+.019,(start+end)/2,1.090),(.008,end-start,.003),0)
    box(bronze,(x,(start+end)/2,high+.006),(.028,end-start+.040,.014),.003)
    for y in (start-.008,end+.008):
        box(bronze,(x,y,(low+high)/2),(.034,.018,high-low+.004),.003)
