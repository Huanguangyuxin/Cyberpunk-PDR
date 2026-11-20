"""Paired inner and outer radii for the seat, toe kick and glazed exterior carcass."""
import math

def plan(vip,foyer,exterior=False):
    """Each station stores two independently tangent rails. Their radii never invert."""
    if exterior:
        end=(1.95 if vip else 2.13)-.050
        outer_y=.0295 if foyer else .0345
        high_y=2.5615 if foyer else 2.5185
        # Centerline of a 133 mm thick curved screen. Signed lateral coordinates
        # in the profile correspond to millimetres across its physical thickness.
        specs=[(.06-.0665,outer_y-.0665,.190),(.06+.0665,outer_y+.0665,.057)]
        upper=[(.06-.0665,high_y+.0665,.190),(.06+.0665,high_y-.0665,.057)]
        far=1.51 if foyer else end if vip else 1.09
    else:
        end=1.95 if vip else 2.13
        # Both rails arrive tangentially at the side and main seat edges. The
        # inner radius is broader so the corner cushion spans the entire wedge.
        return_depth=.060 if foyer else 0.
        specs=[(.165,.185,.380),(.792,.708+return_depth,.227)]
        upper=[(.165,2.415,.380),(.792,1.892-return_depth,.227)]
        far=1.56 if foyer else end if vip else 1.14
    stations=[]
    def segment(f,count):
        for i in range(1 if stations else 0,count+1):
            stations.append(f(i/count))
    def arc(arr,t,sign):
        a=t*math.pi/2
        return [(x+r-r*math.sin(a),y+sign*(r-r*math.cos(a))) for x,y,r in arr]
    def between(a,b,t):
        return [(x+(u-x)*t,y+(v-y)*t) for (x,y),(u,v) in zip(a,b)]
    low_start=[(end,y) for x,y,r in specs]
    low_in=arc(specs,0,1); low_out=arc(specs,1,1)
    segment(lambda t:between(low_start,low_in,t),70)
    segment(lambda t:arc(specs,t,1),32)
    main_end=arc(upper,1,-1)
    segment(lambda t:between(low_out,main_end,t),100)
    segment(lambda t:arc(upper,1-t,-1),32)
    upper_out=arc(upper,0,-1)
    segment(lambda t:between(upper_out,[(far,y) for _,y,_ in upper],t),70)
    return stations

def sweep(stations,profile,emit,styles,default,seams=False,end_radius=0.,seam_mat=None,heights=None):
    """Close a section with UVs measured along the rails and around the profile."""
    centers=[((a[0]+b[0])*.5,(a[1]+b[1])*.5) for a,b in stations]
    dist=[0.]
    for a,b in zip(centers,centers[1:]): dist.append(dist[-1]+math.dist(a,b))
    total=dist[-1]
    # Upholstery is one fabric envelope. Pressure seams compress its surface
    # without leaving holes through to the supporting plinth.
    seam_centers=[i*total/max(1,round(total/.78)) for i in range(1,max(1,round(total/.78)))]
    if seams:
        # Preserve a true 3 mm stitched seam even if the regular curve samples miss it.
        from bisect import bisect_right
        new_dist=sorted(set(dist+[mid+d for mid in seam_centers for d in (-.031,-.015,-.004,-.0015,.0015,.004,.015,.031)]))
        def at(d):
            j=min(len(dist)-2,max(0,bisect_right(dist,d)-1));t=(d-dist[j])/(dist[j+1]-dist[j])
            return [tuple(a+(b-a)*t for a,b in zip(u,v)) for u,v in zip(stations[j],stations[j+1])]
        stations=[at(d) for d in new_dist];dist=new_dist
    verts=[];faces=[];uv=[];smooth=[];materials=[]
    def face(indices,tex,m,rounding):
        faces.append(indices);uv.append(tex);smooth.append(rounding);materials.append(m)
    n=len(profile)
    perimeter=[0.]
    for i,((ax,ay),(bx,by)) in enumerate(stations):
        w=math.hypot(bx-ax,by-ay)
        if i==0:
            for a,b in zip(profile,profile[1:]+profile[:1]):
                perimeter.append(perimeter[-1]+math.hypot((a[0]-b[0])*w,a[1]-b[1]))
        s=dist[i];edge=min(s,total-s)
        rounding=0.
        if edge<end_radius:
            rounding=end_radius-math.sqrt(max(0.,end_radius**2-(end_radius-edge)**2))
        depression=max((.016*math.exp(-((s-mid)/.019)**2) for mid in seam_centers),default=0.) if seams else 0.
        for u,z,weight in profile:
            u=u+(1-2*u)*rounding/w
            if seams and u>.70:u-=depression/w*(u-.70)*2.0
            h=z-weight*(depression+rounding*.50)
            if heights:h+=heights(i)*max(0.,min(1.,(z-.16)/(.855-.16)))
            verts.append((ax+(bx-ax)*u,ay+(by-ay)*u,h))
        if not i:continue
        for j in range(n):
            k=(j+1)%n
            mat=styles.get(j,default)
            if seams and seam_mat and profile[j][2]>.18 and any(abs((dist[i-1]+s)*.5-mid)<.00151 for mid in seam_centers):mat=seam_mat
            face([(i-1)*n+j,i*n+j,i*n+k,(i-1)*n+k],
                 [(dist[i-1]*2.6,perimeter[j]*2.6),(s*2.6,perimeter[j]*2.6),
                  (s*2.6,perimeter[j+1]*2.6),(dist[i-1]*2.6,perimeter[j+1]*2.6)],
                 mat,True)
    for r in (0,len(stations)-1):
        height=(min(v[1] for v in profile)+max(v[1] for v in profile))/2
        center=len(verts)
        (ax,ay),(bx,by)=stations[r]
        verts.append(((ax+bx)/2,(ay+by)/2,height+(heights(r)*.5 if heights else 0)))
        width=math.hypot(bx-ax,by-ay)
        for j in range(n):
            k=(j+1)%n
            ends=[j,k] if r==0 else [k,j]
            face([center]+[r*n+v for v in ends],
                 [(width*.5*2.6,height*2.6)]+[(profile[v][0]*width*2.6,profile[v][1]*2.6) for v in ends],
                 default,False)
    emit(verts,faces,uv,smooth,materials)

def build_bench(vip,foyer,emit,leather,welt,enamel,bronze,amber,lens,smoke,reflector=None):
    rail=plan(vip,foyer)
    # A 53 mm bullnose, slow crown, lower rolled welt, and a recessed toe line.
    cushion=[(.025,.351,0),(.87,.351,0),(.94,.354,0),(.975,.365,.12),
             (.99,.378,.22),(.996,.393,.32),(.998,.411,.5),
             (1.,.418,.5),(.998,.422,.52),(.993,.425,.55),
             (.990,.443,.8),(.983,.459,.9),(.965,.475,1),(.936,.488,1),
             (.89,.498,1),(.8,.504,1),(.64,.502,1),(.54,.496,.85),(.46,.491,.60),
             (.38,.489,.46),(.28,.490,.35),(.13,.493,.32),(.06,.496,.6),(.028,.481,.4),
             (.014,.457,.2),(.011,.384,0)]
    sweep(rail,cushion,emit,{6:welt,7:welt},leather,True,.031,seam_mat=welt)
    kick=[(.035,.008,0),(.76,.008,0),(.81,.022,0),(.82,.076,0),(.852,.084,0),
          (.89,.087,0),(.90,.092,0),(.90,.100,0),(.895,.105,0),(.922,.115,0),
          (.929,.322,0),(.915,.351,0),(.86,.363,0),(.04,.363,0)]
    kick_materials={4:bronze,5:lens,6:lens,7:bronze}
    if not vip:
        # Recessed reflector below the 33 mm diffuser returns onto the grounded
        # foot. Its exposed bronze lip catches the amber light around each bend.
        kick[2:10]=[(.89,.016,0),(.890,.033,0),(.842,.056,0),(.854,.060,0),
                    (.870,.065,0),(.870,.098,0),(.878,.105,0),(.922,.121,0)]
        kick_materials.update({3:reflector or bronze,4:reflector or bronze,5:bronze,6:lens,7:bronze,8:bronze})
    if foyer:
        kick_materials.update({9:leather,10:welt,11:leather})
    sweep(rail[::2]+([rail[-1]] if (len(rail)-1)%2 else []),kick,emit,kick_materials,enamel,end_radius=.014)
    shell=plan(vip,foyer,True)
    # The exterior is one bent shell. Parallel flanged rails turn with it.
    # A hidden lower shoe supports the raised fascia all the way around the
    # return, including the free-standing privacy wing in the foyer design.
    section=[
        (.15,.008,enamel),(.86,.008,enamel),(.91,.017,enamel),(.92,.074,enamel),
        (.98,.081,bronze),(1.,.094,bronze),(1.,.143,bronze),(.96,.151,enamel),
        (.96,.861,enamel),(1.,.868,bronze),(1.,.883,bronze),(.971,.888,amber),
        (.971,1.016,smoke if foyer else bronze),(1.,1.023,bronze),(1.,1.035,bronze),
        (.95,1.051,bronze),(.86,1.059,bronze),(.13,1.059,bronze),
        (.035,1.054,bronze),(0,1.044,bronze),(0,1.026,bronze),
        (.030,1.020,bronze),(.041,1.013,amber),(.041,.883,bronze),
        (.022,.881,bronze),(0,.875,bronze),(0,.861,bronze),(.025,.853,enamel),
        (.048,.845,enamel),(.048,.157,bronze),(.022,.149,bronze),(0,.145,bronze),
        (0,.091,bronze),(.029,.080,enamel),(.13,.076,enamel)]
    def head_lift(i):
        if not vip:return 0.
        # Smoothly raise the amber cap at the far back and return it into the ends.
        blend=max(0.,min(1.,(i-74)/26,(228-i)/26))
        return .157*blend*blend*(3-2*blend)
    sweep(shell,[(u,z,0.) for u,z,_ in section],emit,
          {j:m for j,(_,_,m) in enumerate(section)},enamel,heights=head_lift)
    return shell,head_lift

def end_lens(end,center,emit,bronze,glass):
    """A rounded die-cast cap with an amber lens seated inside the front lip."""
    rings=[(end-.082,.193,.905,.042),(end-.067,.207,.929,.048),
           (end-.025,.207,.929,.048),(end-.010,.199,.921,.048),
           (end-.004,.184,.904,.044),(end-.004,.155,.871,.035),
           (end-.008,.151,.867,.032)]
    rings=[(x,w*1.53,h,r*1.11) for x,w,h,r in rings]
    vs=[];faces=[];uv=[];materials=[];smooth=[]
    midz=.574
    def face(indices,coords,mat,shading):
        faces.append(indices);uv.append(coords);materials.append(mat);smooth.append(shading)
    def outline(w,h,r):
        result=[]
        for i,(sy,sz) in enumerate([(1,1),(-1,1),(-1,-1),(1,-1)]):
            cy=center+sy*(w/2-r);cz=midz+sz*(h/2-r)
            for j in range(9):
                a=(i+j/8)*math.pi/2
                result.append((cy+r*math.cos(a),cz+r*math.sin(a)))
        return result
    n=36
    for i,(x,w,h,r) in enumerate(rings):
        points=outline(w,h,r)
        vs.extend((x,y,z) for y,z in points)
        if i:
            for j in range(n):
                k=(j+1)%n
                idx=[(i-1)*n+j,(i-1)*n+k,i*n+k,i*n+j]
                face(idx,[(j/n,(i-1)/7),((j+1)/n,(i-1)/7),((j+1)/n,i/7),(j/n,i/7)],bronze,True)
    for i in [0,len(rings)-1]:
        c=len(vs);xx,w,h,r=rings[i];vs.append((xx,center,midz))
        for j in range(n):
            k=(j+1)%n
            ring=[j,k] if i else [k,j]
            idx=[c]+[i*n+v for v in ring]
            face(idx,[(.5+(vs[v][1]-center)/w,.5+(vs[v][2]-midz)/h) for v in idx],glass if i else bronze,False)
    emit(vs,faces,uv,smooth,materials)
