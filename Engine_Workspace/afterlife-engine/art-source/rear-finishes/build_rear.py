"""Fabricate rear foyer floor and wall finishes in Engine metres (X, height, Z)."""
from pathlib import Path
import bpy
from mathutils import Vector, Quaternion
import math
import runpy
import subprocess
from tempfile import TemporaryDirectory
import numpy as np
root=Path(__file__).resolve().parents[2]
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene
scene.unit_settings.system='METRIC'
def finish(name):
    mat=bpy.data.materials.new('Rear '+name)
    mat.use_nodes=True
    nodes=mat.node_tree.nodes
    link=mat.node_tree.links.new
    shader=nodes.get('Principled BSDF')
    def texture(channel):
        image=bpy.data.images.load(str(Path(__file__).parent/'maps'/(name+'-'+channel+'.png')))
        if channel!='color': image.colorspace_settings.name='Non-Color'
        tex=nodes.new('ShaderNodeTexImage')
        tex.image=image
        return tex.outputs['Color']
    link(texture('color'),shader.inputs['Base Color'])
    normal=nodes.new('ShaderNodeNormalMap')
    link(texture('normal'),normal.inputs['Color'])
    link(normal.outputs['Normal'],shader.inputs['Normal'])
    split=nodes.new('ShaderNodeSeparateColor')
    link(texture('orm'),split.inputs['Color'])
    link(split.outputs['Green'],shader.inputs['Roughness'])
    link(split.outputs['Blue'],shader.inputs['Metallic'])
    return mat
stone,brick,trim,steel=map(finish,['terrazzo','basalt','trim','steel'])
joint=bpy.data.materials.new('Shadow joint')
joint.use_nodes=True
shader=joint.node_tree.nodes.get('Principled BSDF')
shader.inputs['Base Color'].default_value=(.012,.012,.016,1)
shader.inputs['Roughness'].default_value=.92
def diode(name,rgb,strength):
    mat=bpy.data.materials.new(name)
    mat.use_nodes=True
    shader=mat.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value=(*rgb,1)
    shader.inputs['Emission Color'].default_value=(*rgb,1)
    shader.inputs['Emission Strength'].default_value=strength
    return mat
cyan=diode('Cyan status lens',(.025,.68,.77),2.2)
neutral=diode('Neutral shelf lens',(.99,.61,.28),.60)
groups = {}
corners=[(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]
faces=[(3,2,1,0),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]

def box(group, mat, pos, size, bevel=.006, axis=(0,0,1), angle=0):
    vertices, polys = groups.setdefault((group,mat,bevel),([],[]))
    base = len(vertices)
    x,h,z = pos
    w,hh,d = size
    rot = Quaternion(axis,angle)
    for a,b,c in corners:
        v=rot @ Vector((a*w/2,b*d/2,c*hh/2))
        vertices.append((x+v.x,-z+v.y,h+v.z))
    polys.extend(tuple(base+i for i in face) for face in faces)

box('Mortar bed',joint,(0,.001,-9.9),(27.98,.012,19.79),.001)
def paving(lo,hi,pitch,rows,mat,name,accent_rows=True):
    depth=19.8/rows
    for j in range(rows):
        cuts=[lo]
        x=lo+(pitch/2 if j%2 else pitch)
        while x<hi-.05:
            cuts.append(x)
            x+=pitch
        cuts.append(hi)
        for a,b in zip(cuts,cuts[1:]):
            surface=brick if accent_rows and mat==stone and j in (4,11) else mat
            box(name,surface,((a+b)/2,.010,-(j+.5)*depth),(b-a-.006,.009,depth-.006),.0018)
paving(-7,7,1.0,20,stone,'Honed aggregate flags')
paving(-14,-7,.50,60,brick,'Split basalt bar and booth apron')
paving(7,14,1.05,21,stone,'Honed aggregate flags',accent_rows=False)
for x in [-7,7,-1.75,1.75]:
    for dx in [-.032,.032]:
        box('Steel inlay',trim,(x+dx,.015,-9.9),(.019,.003,19.79),.0006)
for z in [-.09,-19.73]:
    box('Threshold band',trim,(0,.015,z),(27.95,.003,.035),.0006)

# Place finishes against the original shell. Upper sheets lie behind the
# existing graphic faces. Raised vents occupy separate service bands.
def panel(sidewall, anchor, u, y, width, height, detail=False, inset=.01, face=steel):
    def part(label, mat, du, dy, front, w, h, d, radius):
        if sidewall:
            side=1 if anchor>0 else -1
            pos=(anchor-side*front,y+dy,u+du)
            size=(d,h,w)
        else:
            pos=(u+du,y+dy,anchor+front if anchor<0 else anchor-front)
            size=(w,h,d)
        box(label,mat,pos,size,radius)
    part('Gunmetal cassette' if face == steel else 'West graphite cassette',face,0,0,inset,width-.018,height-.019,.016,.003)
    for a in [-1,1]:
        for b in [-1,1]:
            part('Captive panel bolts',trim,a*(width/2-.052),b*(height/2-.054),inset+.011,.027,.027,.010,.004)
    if detail:
        part('Service recess',joint,0,0,inset+.013,width*.64,height*.49,.015,.004)
        for i in range(4):
            part('Stamped vent louvers',trim,-width*.065,(i-1.5)*height*.074,inset+.024,width*.39,.018,.022,.004)
        for i in range(2):
            part('Status LEDs',cyan,width*(.19+i*.053),0,inset+.025,.045,.018,.015,.003)

for side in [-1,1]:
    for i in range(8):
        x=side*(2.39+i*1.52)
        for j in range(4):
            panel(False,0,x,.47+j*.94,1.52,.94,(i+j)%6==2,inset=.026)

# Structural finishes fitted around the D189 countertop, original worktop and
# server opening. X and Z are the x/z coordinates of the reviewed engine.
cobalt=finish('cobalt')
garnet=finish('garnet')
champagne=finish('champagne')
pewter=finish('pewter')
bar_silver=finish('counter-silver')
canopy_bronze=finish('canopy-bronze')
amber=diode('Warm recessed LED', (1,.43,.135),2.4)
# Keep the warm toe light on the folded metal returns; the glass has
# its own cool couplers, confined to the eight insert panels.
toe_light=diode('Cobalt edge diffuser',(1,.37,.075),1.2)
glass_lens=diode('Sapphire optical edge',(.24,.48,1),2.32)
cobalt_shader=cobalt.node_tree.nodes.get('Principled BSDF')
scatter=cobalt.node_tree.nodes.new('ShaderNodeTexImage')
scatter.image=bpy.data.images.load(str(Path(__file__).parent/'maps/cobalt-scatter.png'))
cobalt.node_tree.links.new(scatter.outputs['Color'],cobalt_shader.inputs['Emission Color'])
cobalt_shader.inputs['Emission Strength'].default_value=.94
cobalt_shader.inputs['IOR'].default_value=1.51
cobalt_shader.inputs['Coat Weight'].default_value=.52
cobalt_shader.inputs['Coat Roughness'].default_value=.16

def transmitting_layer(name,tint,roughness,ior):
    material=bpy.data.materials.new(name)
    material.use_nodes=True
    shader=material.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value=(*tint,1)
    shader.inputs['Roughness'].default_value=roughness
    shader.inputs['IOR'].default_value=ior
    shader.inputs['Transmission Weight'].default_value=1
    return material

# The copper skirt has its own baked colour and roughness without changing the canopy.
copper_skirt=finish('copper')
warm_reflector=diode('Amber reflector behind the perforations',(1,.39,.085),1.45)
front_glass=transmitting_layer('Low iron front glazing',(.978,.995,1),.056,1.50)
flowing_water=transmitting_layer('Cavity water film',(.925,.974,1),.072,1.333)

def install_water_frame():
    # Sample both the free surface and its contact surface on the cobalt slab.
    with TemporaryDirectory() as work:
        subprocess.run(['node','--experimental-strip-types',str(Path(__file__).with_name('water_frame.mjs')),work],check=True)
        p=np.fromfile(Path(work)/'position',dtype='<f4').reshape(-1,3)
        normals=np.fromfile(Path(work)/'normal',dtype='<f4').reshape(-1,3)
        backing=np.fromfile(Path(work)/'backingPosition',dtype='<f4').reshape(-1,3)
        uv=np.fromfile(Path(work)/'uv',dtype='<f4').reshape(-1,2)
        front=np.fromfile(Path(work)/'indices',dtype='<u4').reshape(-1,3).copy()
    # Convert engine XYZ to Blender X,-Z,Y; preserve the perimeter and UVs.
    assert backing.shape==p.shape and np.isfinite(backing).all()
    thickness=np.einsum("ij,ij->i",p-backing,normals)
    assert np.isfinite(thickness).all() and 0 < thickness.max() < .033
    # The runtime hides dry vertices inside the stone. Keep only faces
    # fully above its surface when closing the solid DCC preview mesh.
    front=front[thickness[front].min(axis=1)>.00001]
    blended=np.concatenate([p,backing])[:,[0,2,1]]
    blended[:,1]*=-1
    original_edges=np.concatenate([front[:,[0,1]],front[:,[1,2]],front[:,[2,0]]])
    _,edge_index,edge_counts=np.unique(np.sort(original_edges,axis=1),axis=0,return_index=True,return_counts=True)
    outline=original_edges[edge_index[edge_counts==1]]
    count=len(p)
    back=(front[:,::-1]+count).tolist()
    sides=[(int(a),int(a)+count,int(b)+count,int(b)) for a,b in outline]
    mesh=bpy.data.meshes.new('Y-layer flowing water')
    mesh.from_pydata(blended.tolist(),[],front.tolist()+back+sides)
    mesh.update()
    obj=bpy.data.objects.new(mesh.name,mesh)
    scene.collection.objects.link(obj)
    mesh.materials.append(flowing_water)
    for face in mesh.polygons[:len(front)*2]:
        face.use_smooth=True
    tex=mesh.uv_layers.new(name='Flow')
    for loop in mesh.loops:
        tex.data[loop.index].uv=uv[loop.vertex_index%count]
    obj['source']='pdr-cobalt-stream-geometry.ts · primed film on cobalt'
    obj['film_peak_mm']=float(thickness.max()*1000)

def section_prism(name,material,plan,bottom,top,radius,cap_top=True):
    # Orient top normal toward Blender +Z regardless of footprint winding.
    shape=[(x,-z) for x,z in plan]
    area=sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(shape,shape[1:]+shape[:1]))
    if area < 0:
        shape.reverse()
    vertices,polys=groups.setdefault((name,material,radius),([],[]))
    base=len(vertices); count=len(shape)
    for y in (bottom,top):
        vertices.extend((x,z,y) for x,z in shape)
    polys.append(tuple(base+i for i in reversed(range(count))))
    if cap_top:
        polys.append(tuple(base+count+i for i in range(count)))
    for i in range(count):
        j=(i+1)%count
        polys.append((base+i,base+j,base+count+j,base+count+i))

def strip_between(name,material,start,end,centre_y,height,thickness,bevel):
    x0,z0=start;x1,z1=end
    length=math.hypot(x1-x0,z1-z0)
    box(name,material,((x0+x1)/2,centre_y,(z0+z1)/2),
        (length,height,thickness),bevel,angle=math.atan2(z0-z1,x1-x0))

# A framed entrance landing and angled apron define the arrival and ordering zones.
# The original substrate is 2.9 mm over the slab. These shallow inlay sections
# sit between 4 and 6 mm, keeping door sweeps and circulation clear.
def inlaid_ribbon(path, ordering_zone=False):
    for a,b in zip(path,path[1:]):
        dx,dz=b[0]-a[0],b[1]-a[1]
        length=math.hypot(dx,dz)
        nx,nz=-dz/length,dx/length
        def point(t,offset=0):
            return (a[0]+t*dx+nx*offset,a[1]+t*dz+nz*offset)
        # Brick joints reveal a continuous backing rail instead of the old tile.
        if ordering_zone:
            # A charcoal stone bed breaks the longer order queue into short
            # inserts. At distance the bar remains the strongest colour.
            strip_between('Split basalt bar and booth apron',brick,a,b,.022,.009,.235,.0018)
        else:
            strip_between('Steel inlay',trim,a,b,.022,.009,.285,.0006)
        pieces=max(1,round(length/.145))
        gap=.005/length
        for j in range(pieces):
            start,end=point(j/pieces+gap/2),point((j+1)/pieces-gap/2)
            if ordering_zone and pieces>=12 and j%12<7:
                strip_between('Split basalt bar and booth apron',brick,start,end,
                              .02825,.009,.212,.0018)
            else:
                strip_between('Garnet glazed running bond',garnet,start,end,.00565,.0018,
                              .212 if ordering_zone else .235,0)
        for offset in ([-.122,.122] if ordering_zone else [-.153,.153]):
            strip_between('Steel inlay',trim,point(0,offset),point(1,offset),
                          .0265,.009,.014,.0006)

# Door-side landing with black stone laid at right angles to the public hall.
for row in range(7):
    z=-.23-row*.265
    for col in range(6):
        box('Split basalt bar and booth apron',brick,((col-2.5)*.58,.022,z),
            (.573,.004,.258),.0018)
inlaid_ribbon([(-1.89,-.08),(-1.89,-2.13),(1.89,-2.13),(1.89,-.08)])
# The bartender's side stays clear. The public apron wraps outside the stools,
# with diagonal returns that follow the folded counter rather than the room grid.
inlaid_ribbon([(10.0,-14.78),(8.18,-14.78),(7.75,-14.35),(7.75,-4.0),
               (8.69,-2.91),(12.83,-2.91)], ordering_zone=True)
front_path=[(10.10,-14.01),(10.035,-13.70),(10.035,-4.26),(10.34,-3.78),(13.23,-3.78)]
# Offset the entire polyline before building the cap, rails or each individual
# glass depth. Its corner bisectors join each layered return on a single mitre.
normals=[]
lengths=[]
for a,b in zip(front_path,front_path[1:]):
    dx,dz=b[0]-a[0],b[1]-a[1]
    length=math.hypot(dx,dz)
    lengths.append(length)
    normals.append(Vector((-dz/length,dx/length)))
mitres=[normals[0]]
for prev,nxt in zip(normals,normals[1:]):
    mitres.append((prev+nxt)/(1+prev.dot(nxt)))
mitres.append(normals[-1])
def surface_station(point):
    # Locate the face and its common horizontal UV station on the folded bar.
    chain=0.
    nearest=(float('inf'),0,0.)
    for k,(a,b,length) in enumerate(zip(front_path,front_path[1:],lengths)):
        start=Vector(a)
        tangent=(Vector(b)-start)/length
        along=max(0,min(length,(point-start).dot(tangent)))
        nearest=min(nearest,((point-start-tangent*along).length_squared,k,chain+along))
        chain+=length
    return nearest[1:]

def offset_path(depth):
    return [tuple(Vector(v)+m*depth) for v,m in zip(front_path,mitres)]
# All three formed skins use one centre. Their actual radial offsets set the
# 6 mm lip overhang and the 2 mm recessed copper shoe.
bend_radius=.360
bend_face_offset=.069
bend_centre=Vector((front_path[1][0]-bend_face_offset+bend_radius,
                    front_path[1][1]))
bend_segments=40
def end_turn(offset):
    radius=bend_radius+offset-bend_face_offset
    return [(bend_centre.x-radius*math.cos(math.pi*i/(2*bend_segments)),
             bend_centre.y-radius*math.sin(math.pi*i/(2*bend_segments)))
            for i in range(bend_segments+1)]

def straight_run(offset):
    # The folded guest veneer begins on the tangent to the semicircular sheet.
    return [(front_path[1][0]-offset,front_path[1][1])]+offset_path(offset)[2:]

def top_outline(offset,near_offset):
    arc=end_turn(near_offset)
    return list(reversed(arc))+[(front_path[1][0]-offset,front_path[1][1]+.033)]+offset_path(offset)[2:]+[
        (13.25,-4.75),(11.0,-4.75),(11.0,arc[-1][1])]
# The fascia subdeck steps back at the end. Only the 9 mm polished edge is visible.
section_prism('Folded pewter guest counter',bar_silver,top_outline(.080,.042),.944,1.098,0,cap_top=False)
section_prism('Folded pewter guest counter',bar_silver,top_outline(.094,.075),1.098,1.107,0)
# A solid toe follows the glass area. The lower band wraps its stationary
# tangent into the terminal skin without leaving the old diagonal rail behind.
for inset,lower,upper in [(.067,.018,.073),(.071,.073,.248),(.076,.248,.26),(.060,.26,.272)]:
    skirt_plan=straight_run(inset)+list(reversed(straight_run(-.022)))
    section_prism('Bar copper plinth',copper_skirt,skirt_plan,lower,upper,.003)
def cut_face(name,material,front,back,radius):
    # Both contours are ordered counterclockwise when viewed from the guest side.
    vertices,polys=groups.setdefault((name,material,radius),([],[]))
    start=len(vertices)
    n=len(front)
    vertices.extend(front)
    vertices.extend(back)
    polys.append(tuple(start+i for i in range(n)))
    polys.append(tuple(start+n+i for i in reversed(range(n))))
    for i in range(n):
        j=(i+1)%n
        polys.append((start+i,start+n+i,start+n+j,start+j))

for k,(a,b) in enumerate(zip(front_path,front_path[1:])):
    dx,dz=b[0]-a[0],b[1]-a[1]
    run=math.hypot(dx,dz)
    def behind(u,h,d):
        t=u/run
        m=mitres[k].lerp(mitres[k+1],t)
        return (a[0]+dx*t+m.x*d,-a[1]-dz*t-m.y*d,h)
    def panel_face(name,mat,outline,offset,depth,bevel):
        cut_face(name,mat,[behind(u,h,offset) for u,h in outline],
                 [behind(u,h,offset-depth) for u,h in outline],bevel)
    if k==0:
        continue  # The former straight starter has been replaced with the formed end.
    strip_between('Bar panel shadow carrier',joint,a,b,.579,.918,.027,.006)
    lo,hi=.272,.918
    def rail(name,mat,low,high,offset,thickness,radius):
        panel_face(name,mat,[(0,low),(run,low),(run,high),(0,high)],offset,thickness,radius)
    # A recessed 5 mm amber line grazes the copper kick below the cold water sill.
    rail('Bar lower blue edge',toe_light,.033,.036,.0528,.003,.0005)
    rail('Cabinet upper glazing bead',bar_silver,.918,.944,.069,.034,.0015)
    if k>0:
        edge0_top=edge0_lo=0
        edge1_top=edge1_lo=run
        bays=(8,1,3)[k-1]
        for j in range(bays):
            bl=edge0_lo+(edge1_lo-edge0_lo)*j/bays+.005
            br=edge0_lo+(edge1_lo-edge0_lo)*(j+1)/bays-.005
            tl=edge0_top+(edge1_top-edge0_top)*j/bays+.005
            tr=edge0_top+(edge1_top-edge0_top)*(j+1)/bays-.005
            outline=[(bl,lo),(br,lo),(tr,hi),(tl,hi)]
            panel_face('Cobalt kiln cast modules',cobalt,outline,.024,.007,.0015)
            panel_face('Y-layer clear glazing',front_glass,outline,.065,.008,.0014)
            # The return shoe slopes toward a narrow drain immediately
            # behind the front glass. Its wet surface is visible through the
            # pane. The folded nose shields the bottom LED from a guest's eye.
            profile=[(bl,.294,.024),(bl,.2747,.051),(br,.2747,.051),(br,.294,.024)]
            top=[behind(u,y,d) for u,y,d in profile]
            underside=[behind(u,y-.0014,d) for u,y,d in profile]
            cut_face('Internal water supply and collector',pewter,top,underside,.00035)
            for low,high,reach,depth in [(.273,.2778,.0548,.0018),
                                          (.920,.926,.035,.011)]:
                panel_face('Internal water supply and collector',pewter,
                           [(bl,low),(br,low),(tr,high),(tl,high)],reach,depth,.00035)
            # Continuous dry rebates support the lower and upper corners. The
            # standing metal edge sits 2 mm inside the outer face of the pane.
            for low,high in [(lo-.004,lo+.0018),(hi-.0018,hi+.004)]:
                ll=(low-lo)/(hi-lo)
                hh=(high-lo)/(hi-lo)
                panel_face('Y-layer glazing retainers',pewter,
                           [(bl+(tl-bl)*ll,low),(br+(tr-br)*ll,low),
                            (br+(tr-br)*hh,high),(bl+(tl-bl)*hh,high)],
                           .063,.043,.0007)
            # The slim edge lens sits inside the glazing silhouette. Cut each
            # to the diagonal module and keep the vertical reveal dark.
            for low,high,reach in [(lo+.002,lo+.004,.0525),(hi-.012,hi-.004,.043)]:
                ll=(low-lo)/(hi-lo)
                hh=(high-lo)/(hi-lo)
                panel_face('X-facing cobalt edge lenses',glass_lens,
                           [(bl+(tl-bl)*ll+.010,low),(br+(tr-br)*ll-.010,low),
                            (br+(tr-br)*hh-.010,high),(bl+(tl-bl)*hh+.010,high)],
                           reach,.0014,.00035)

# Broad sealed skins at both ends, including the original steel core.
# At the stair end a single bent sheet meets the low prep cabinet on its inner side.
def end_skin(outside,inside):
    arc=end_turn(outside)
    inner=end_turn(inside)
    # The rear return is cut square to the working aisle.
    return arc+[(11.003,arc[-1][1]),(11.003,inner[-1][1])]+list(reversed(inner))
section_prism('Wrapped pewter counter ends',bar_silver,end_skin(.069,.041),.073,1.098,.004)
section_prism('Bar copper plinth',copper_skirt,end_skin(.067,.035),.018,.073,.003)

# The second cheek ends the 90-degree return at the foyer. It spans its entire
# depth, including the lip and shoe behind the last clear pane.
section_prism('Wrapped pewter counter ends',bar_silver,
              [(13.229,-3.713),(13.252,-3.713),(13.252,-4.749),(13.229,-4.749)],
              .073,1.098,.004)
section_prism('Bar copper plinth',copper_skirt,
              [(13.228,-3.708),(13.253,-3.708),(13.253,-4.751),(13.228,-4.751)],
              .018,.073,.003)

# Enclose the existing 0.90 m service counter. Its stock top and sink stay in place.
# This extended skin covers its otherwise exposed side from the guest approach.
end_z=end_turn(.069)[-1][1]
box('Prep end satin apron',bar_silver,(11.300,.472,end_z+.020),(.592,.800,.026),.005)
box('Prep end rolled lip',bar_silver,(11.300,.885,(end_z-13.900)/2),
    (.598,.030,-13.900-end_z),.004)
box('Prep end copper shoe',copper_skirt,(11.30,.045,end_z+.030),(.596,.054,.056),.003)
# Full working-side storage has a recessed toe and individually folded fronts.
# The original 900 mm steel worktop remains the single top over the long cabinet.
door_start=end_z+.04
door_end=-4.757
door_count=13
bay=(door_end-door_start)/door_count
mid=(door_start+door_end)/2
box('Prep cabinet graphite carcass',steel,(11.304,.458,mid),
    (.572,.788,door_end-door_start),.004)
box('Prep cabinet recessed toe',steel,(11.296,.041,mid),
    (.535,.054,door_end-door_start),.003)
for i in range(door_count):
    z=door_start+(i+.5)*bay
    box('Service end access doors',steel,(11.597,.462,z),(.014,.784,bay-.0045),.004)
    # A low-profile folded pull sits just below the original countertop.
    box('Service end finger pulls',bar_silver,(11.607,.808,z+bay*.30),
        (.010,.013,.098),.0018)
# Close both sides of the 17 cm-deep extension between prep counter and cheek.
for x in (11.011,11.590):
    box('Prep end satin apron',bar_silver,(x,.472,(end_z-13.899)/2),
        (.015,.800,-13.899-end_z),.005)

# Four folded, perforated shades project from the back bar on steel returns.
# Each bore is open through both skins. A baffled undertray conceals the LEDs.
def folded_bar_shade(zcentre,width,variant,tier):
    cols,rows=round(width/.075),14
    verts,polys=groups.setdefault(('Perforated canopy blades',canopy_bronze,0),([],[]))
    rim=[(-1,-1),(0,-1),(1,-1),(1,0),(1,1),(0,1),(-1,1),(-1,0)]
    def P(u,v,layer=0):
        # The staggered rolls make continuous eaves; the long outside arris stays level.
        # A short return bevel sweeps into the tip at each end of the run.
        corner=max(0,(abs(u)-.39)/.11)
        x=11.82+.155*tier+.105*(variant%2)+.24*corner+1.27*v
        h=2.73+.33*tier+.065*(variant%2)+.025*u+.39*v+.055*max(0,2*v-1)
        return (x+layer*.33,-(zcentre+width*u+.21*v),h-layer*.94)
    def flange(u,v):
        # The underside slopes back toward the wall behind the blade.
        x,y,h=P(u,v)
        return (x,y,h-.052-.105*v)
    def closed_patch(group,mat,points,offset,radius):
        cut_face(group,mat,points,[(x+offset[0],y+offset[1],h+offset[2]) for x,y,h in points],radius)
    for row in range(rows):
        for col in range(cols):
            u=(col+.5)/cols-.5
            v=(row+.5)/rows
            aperture=.014+.0035*math.sin(.27*col+row*.53+variant)
            base=len(verts)
            for layer in (0,.008):
                verts.extend(P(u+ox/(2*cols),v+oy/(2*rows),layer) for ox,oy in rim)
                verts.extend(P(u+ox/math.hypot(ox,oy)*aperture/width,
                               v+oy/math.hypot(ox,oy)*aperture/1.65,layer) for ox,oy in rim)
            # Two frosted ends of each light pipe sit 0.5 mm inside the skin.
            # At oblique views the near end remains visible past the 8 mm bore.
            dv,df=groups.setdefault(('Zoned amber canopy backing',warm_reflector,0),([],[]))
            cap=len(dv)
            for depth in (.0005,.0075):
                dv.extend(P(u+ox/math.hypot(ox,oy)*aperture*.96/width,
                            v+oy/math.hypot(ox,oy)*aperture*.96/1.65,depth) for ox,oy in rim)
            df.extend([tuple(cap+i for i in range(8)),tuple(cap+8+i for i in reversed(range(8)))])
            for i,(ox,oy) in enumerate(rim):
                j=(i+1)%8
                polys.extend([tuple(base+a for a in f) for f in
                              [(i,j,8+j,8+i),(16+i,24+i,24+j,16+j),(8+i,8+j,24+j,24+i)]])
                nx,ny=rim[j]
                if ((ox==nx==-1 and col==0) or (ox==nx==1 and col==cols-1)
                  or (oy==ny==-1 and row==0) or (oy==ny==1 and row==rows-1)):
                    polys.append(tuple(base+a for a in (i,16+i,16+j,j)))
    for u in (-.5,.5):
        pts=[P(u,0),flange(u,0),flange(u,1),P(u,1)]
        closed_patch('Canopy folded hems',canopy_bronze,pts,(0,.012 if u<0 else -.012,0),.003)
    for left,right in [(-.5,0),(0,.5)]:
        # A recessed warm reflector catches through the actual drilled skins.
        closed_patch('Canopy folded hems',canopy_bronze,[P(left,0),P(right,0),flange(right,0),flange(left,0)],
                     (.018,0,0),.003)
        closed_patch('Canopy standoff brackets',steel,[flange(left,.89),flange(right,.89),flange(right,1),flange(left,1)],
                     (0,0,.016),.004)
    # Replace exposed bright bars with a strip tucked under the folded leading lip.
    p,q=flange(-.46,.08),flange(.46,.08)
    # The luminous strip follows all three axes of the lip.
    vec=Vector(q)-Vector(p)
    pts=[]
    for t,d,h in [(0,0,0),(1,0,0),(1,.034,0),(0,.034,0)]:
        v=Vector(p)+vec*t+Vector((d,0,h-.006))
        pts.append(tuple(v))
    closed_patch('Canopy internal diffusers',amber,pts,(0,0,.007),.004)
    for u in (-.32,.32):
        x,y,h=flange(u,.92)
        box('Canopy standoff brackets',steel,((13.96+x)/2,h+.035,-y),
            (13.96-x,.070,.075),.004)
# A shadow seam separates each return. Shingled overhangs span the join
# in the adjacent course, like the concept's overlapping folded valance.
for tier,(ends,widths) in enumerate((
    ((-14.16,-9.20),(4.91,4.93)),
    ((-14.01,-10.85,-7.20),(3.11,3.60,3.03)),
    ((-14.12,-8.86),(5.21,4.61)),
)):
    for index,(end,width) in enumerate(zip(ends,widths)):
        folded_bar_shade(end+width/2,width,index,tier)


# Side and entrance walls: real glazed ceramic over a setback dark grout bed.
def wall_tiles(sidewall,anchor,start,end,top):
    tile_w,tile_h=.46,.145
    rows=round((top-.10)/tile_h)
    mid=(start+end)/2
    def wall_box(name,material,u,y,w,h,d,r,offset):
        if sidewall:
            side=1 if anchor>0 else -1
            box(name,material,(anchor-side*offset,y,u),(d,h,w),r)
        else:
            box(name,material,(u,y,anchor-offset),(w,h,d),r)
    def glazed_tile(u,y,w,h):
        # Tiles are mortar-bonded. Only the gently rolled glazed front is
        # visible, so each tile needs a face and four bevels, no hidden carcass.
        verts,polys=groups.setdefault(('Garnet glazed running bond',garnet,0),([],[]))
        base=len(verts)
        order=[(-1,-1),(1,-1),(1,1),(-1,1)]
        if sidewall and anchor<0:
            order.reverse()
        if not sidewall:
            order.reverse()
        for margin,depth in [(0,.049),(.003,.068)]:
            for a,b in order:
                along=u+a*(w*.5-margin);level=y+b*(h*.5-margin)
                if sidewall:
                    verts.append((anchor-(-1 if anchor<0 else 1)*depth,-along,level))
                else:
                    verts.append((along,-anchor+depth,level))
        polys.append(tuple(base+4+i for i in range(4)))
        for i in range(4):
            j=(i+1)%4
            polys.append((base+i,base+j,base+4+j,base+4+i))
    wall_box('Garnet tile mortar',joint,mid,(top+.10)/2,end-start,top-.10,.017,.002,.041)
    wall_box('Wall plinth kick',pewter,mid,.064,end-start,.088,.043,.003,.056)
    for row in range(rows):
        left=start
        next_cut=start+(tile_w if row%2==0 else tile_w*.5)
        while left<end-.012:
            right=min(next_cut,end)
            if right-left>.013:
                glazed_tile((left+right)/2,.10+(row+.5)*(top-.10)/rows,
                            right-left-.006,(top-.10)/rows-.006)
            left=right
            next_cut+=tile_w
    wall_box('Tile head trim',pewter,mid,top+.014,end-start,.026,.04,.003,.058)
    # The cap projects past the rolled tile face. A separate black shadow joint
    # and narrow returned rim pick up grazing light above the burgundy wall skirt.
    wall_box('Service recess',joint,mid,top+.074,end-start,.112,.031,.004,.076)
    wall_box('Tile head trim',pewter,mid,top+.041,end-start,.042,.094,.003,.100)
    wall_box('Tile head trim',pewter,mid,top+.133,end-start,.015,.068,.003,.091)
    # Expansion joints and full-height narrow metal cover strips finish each bay.
    count=max(1,round((end-start)/2.8))
    for k in range(1,count):
        u=start+(end-start)*k/count
        wall_box('Tile head trim',pewter,u,(top+.11)/2,.033,top-.11,.032,.003,.084)
    # One removable service cover near the corner of each long wall. The 
    # graphite face sits forward of the tiled field with a thin nickel rim,
    # four retained bolts and three narrow louvres below the top joint.
    if end-start>8 and not sidewall:
        service_u = start+1.03 if sidewall else end-.94
        wall_box('Tile head trim',pewter,service_u,.93,.46,.54,.020,.003,.093)
        wall_box('Gunmetal cassette',steel,service_u,.93,.435,.515,.018,.003,.11)
        for side in (-1,1):
            for level in (-1,1):
                wall_box('Captive panel bolts',trim,service_u+side*.184,.93+level*.218,
                         .021,.021,.009,.004,.124)
        for line in range(3):
            wall_box('Stamped vent louvers',trim,service_u,.96+line*.039,
                     .284,.013,.017,.004,.125)
    # Wider door-side return panels establish a strong entrance wall rhythm.
    if not sidewall:
        for k in range(count):
            u=start+(end-start)*(k+.5)/count
            wall_box('Gunmetal cassette',steel,u,1.972,(end-start)/count-.057,.47,.026,.003,.077)
            wall_box('Tile head trim',pewter,u,2.221,(end-start)/count-.057,.018,.045,.003,.087)

# Both dados continue behind their stairs to the gallery landing.
wall_start,wall_end=-19.79,-.015
dado_height=1.65
for anchor in (-14,14):
    wall_tiles(True,anchor,wall_start,wall_end,dado_height)
wall_tiles(False,0,-13.95,-1.52,1.65)
wall_tiles(False,0,1.52,13.95,1.65)
# Frame the double doors without narrowing the clear leaf swing.
for sign in (-1,1):
    box('Entry folded portal',pewter,(sign*1.41,1.44,-.10),(.13,2.84,.16),.013)
    box('Entry portal reveal',amber,(sign*1.331,1.48,-.181),(.014,2.61,.015),.002)
box('Entry portal head',pewter,(0,2.91,-.10),(2.95,.15,.16),.013)
box('Entry portal head reveal',amber,(0,2.83,-.181),(2.66,.015,.012),.002)

for i in range(5):
    z=-6.04-i*1.68
    box('Bottle niche rear',steel,(13.84,1.24,z),(.020,2.46,1.68),.006)
    for y in [1.30,1.69,2.09]:
        box('Shelf working light',neutral,(13.40,y,z),(.021,.018,1.57),.003)

graphite=finish('graphite')
# This lining is one assembly from the foyer return to the stair landing.
# Solid backing masks the previous sconce lenses even inside the 7 mm reveals.
# Two satin sheets fit each expansion bay in the garnet dado below.
upper_bottom,upper_top=dado_height+.128,9.20
wall_length=wall_end-wall_start
wall_middle=(wall_end+wall_start)/2
bay_count=round(wall_length/2.8)
sheet_width=wall_length/(2*bay_count)
sheet_height=(upper_top-upper_bottom)/6
for side,group_name in [(-1,'West graphite cassette'),(1,'Wrapped satin east wall panels')]:
    box('Service recess',joint,(side*13.911,(upper_bottom+upper_top)/2,wall_middle),
        (.010,upper_top-upper_bottom,wall_length),.004)
    for column in range(2*bay_count):
        z=wall_start+(column+.5)*sheet_width
        for row in range(6):
            level=upper_bottom+(row+.5)*sheet_height
            box(group_name,graphite,(side*13.901,level,z),
                (.012,sheet_height-.007,sheet_width-.007),.003)

# Section of the portrait-wall overhead cornice. The folded back and cut-off
# lip conceal each row of LEDs, leaving a warm reflected field on the cassettes.
# Baffles stop above the original artwork and clear its suspension cables.
wall_wash_opal=diode('Portrait wall recessed honey opal',(1,.72,.51),.86)
for i in range(6):
    z=-1.75-i*2.25
    box('Portrait head wash channel',steel,(-13.625,6.518,z),(.535,.044,2.244),.003)
    box('Portrait head wash shield',steel,(-13.357,6.467,z),(.022,.108,2.244),.002)
    box('Portrait head wash lens',wall_wash_opal,(-13.44,6.490,z),(.095,.009,2.18),.001)
    for sign in (-1,1):
        box('Portrait head wash shield',steel,(-13.535,6.473,z+sign*1.113),(.335,.065,.012),.001)

# A narrow folded end return covers the exposed east sheet and tile edges where
# the stair reaches the gallery. Its room-facing edge is flush with the sheet.
box('Tile head trim',pewter,(13.9475,4.61,wall_start-.010),(.105,9.18,.020),.003)

# Follow the four measured rings of the original stair grip, including the
# engine's 450 mm rise at the gallery landing. The dedicated old chrome slot
# is retired by pdr-foyer-refit.json in both the engine and the DCC assembly.
rail_groups=('West stair wall handrail','Wrought east stair handrail')
stations=[(14.38,.9),(14.68,1.09425),(19.60,3.90575),(20.,3.94)]
stations=[(u,h+.45*max(0,min(1,(u-14.46)/5.34))) for u,h in stations]

def stair_tube(rail_group,points,radius):
    # Parallel transport with a fixed guide gives continuous rings through
    # each change of pitch; the rail axis lies in one plane for every sweep.
    points=[Vector(p) for p in points]
    guide=Vector((1,0,0)) if abs((points[-1]-points[0]).normalized().x)<.7 else Vector((0,1,0))
    ring=20
    verts,polys=groups.setdefault((rail_group,pewter,0),([],[]))
    base=len(verts)
    for k,p in enumerate(points):
        tangent=(points[min(k+1,len(points)-1)]-points[max(0,k-1)]).normalized()
        side=(guide-tangent*guide.dot(tangent)).normalized()
        up=tangent.cross(side).normalized()
        for j in range(ring):
            a=2*math.pi*j/ring
            verts.append(tuple(p+radius*(side*math.cos(a)+up*math.sin(a))))
        if k:
            previous=base+(k-1)*ring
            for j in range(ring):
                a=previous+j
                b=previous+(j+1)%ring
                polys.append((a,b,b+ring,a+ring))
    polys.append(tuple(base+j for j in reversed(range(ring))))
    end=base+(len(points)-1)*ring
    polys.append(tuple(end+j for j in range(ring)))

for side,rail_group in zip((-1,1),rail_groups):
    rail_x=side*13.752
    stair_tube(rail_group,[(rail_x,u,h) for u,h in stations],.021)
    for u in (14.55,15.68,16.96,18.24,19.55):
        a,b=next((a,b) for a,b in zip(stations,stations[1:]) if a[0]<=u<=b[0])
        height=a[1]+(b[1]-a[1])*(u-a[0])/(b[0]-a[0])
        socket=height-.105
        face=side*(13.932 if socket<dado_height else 13.895)
        stair_tube(rail_group,[(face+side*.003,u,socket),(face-side*.010,u,socket)],.039)
        stair_tube(rail_group,[(face-side*.009,u,socket),(rail_x+side*.022,u,socket),
                    (rail_x,u,socket+.020),(rail_x,u,height-.017)],.010)

# The print is stood forward of the new metal face on a concealed back-tray.
front=-13.930

# A single photographic transparency spans the five individually framed glass lights.
opal=diode('Apricot opal', (1,.57,.32),2.1)
pearl=diode('Pearl profile', (1,.77,.58),2.4)
film=bpy.data.materials.new('Backlit photographic enamel')
film.use_nodes=True
shader=film.node_tree.nodes.get('Principled BSDF')
picture=film.node_tree.nodes.new('ShaderNodeTexImage')
picture.image=bpy.data.images.load(str(Path(__file__).with_name('afterimage-portrait.png')))
for socket in ['Base Color','Emission Color']:
    film.node_tree.links.new(picture.outputs['Color'],shader.inputs[socket])
shader.inputs['Emission Strength'].default_value=.72
shader.inputs['Roughness'].default_value=.36
for i in range(5):
    y0=.15+i*1.85
    y1=y0+1.84
    # The stair end of the lightbox falls along one continuous diagonal.
    clip_y=7.55
    def top(y):
        return 6.18-.76*max(0.,y-clip_y)
    outline=[(y0,2.32),(y1,2.32),(y1,top(y1))]
    if y0<clip_y<y1: outline.append((clip_y,6.18))
    outline.append((y0,top(y0)))
    verts,polys=groups.setdefault(('Photographic lightbox',trim,.008),([],[]))
    start=len(verts)
    n=len(outline)
    for x in (front+.036,front+.042):
        verts.extend((x,y,h) for y,h in outline)
    polys.extend([tuple(start+j for j in reversed(range(n))),tuple(start+n+j for j in range(n))])
    for j in range(n):
        k=(j+1)%n
        polys.append((start+j,start+k,start+n+k,start+n+j))
    mesh=bpy.data.meshes.new('Photographic panel')
    mesh.from_pydata([(front+.045,y,h) for y,h in outline],[],[tuple(range(n))])
    mesh.update()
    uv=mesh.uv_layers.new()
    for k,(y,h) in enumerate(outline):
        uv.data[k].uv=((i+(y-y0)/(y1-y0))/5,(h-2.32)/3.86)
    mesh.materials.append(film)
    obj=bpy.data.objects.new('Portrait glass',mesh)
    scene.collection.objects.link(obj)

# A folded nickel face and black gasket frame the edge of the portrait lightbox.
# Five mitred metal strips follow the clipped print, including the stair-side return.
inner=[(.15,2.32),(9.39,2.32),(9.39,top(9.39)),(clip_y,6.18),(.15,6.18)]
outer=[(-.03,2.12),(9.57,2.12),(9.57,top(9.39)+.090),(clip_y+.065,6.36),(-.03,6.36)]
for i in range(5):
    j=(i+1)%5
    section=[outer[i],outer[j],inner[j],inner[i]]
    group='Portrait folded jamb' if i in (1,4) else 'Portrait folded rail'
    verts,polys=groups.setdefault((group,pewter,.008),([],[]))
    start=len(verts)
    for x in (front+.016,front+.152):
        verts.extend((x,y,h) for y,h in section)
    polys.extend(tuple(start+k for k in f) for f in faces)
box('Portrait lower gasket',joint,(front+.096,2.317,-4.775),(.10,.012,9.28),.002)
for z in (-.06,-9.48):
    box('Portrait edge fastener',champagne,(front+.156,4.27,z),(.018,.044,.044),.004)

def capsule(x,z,y):
    box('Pendant cable',steel,(x,(9.20+y+.31)/2,z),(.014,9.2-y-.31,.014),0)
    box('Pendant ferrule',trim,(x,y+.29,z),(.12,.12,.12),.024)
    # Revolved profile gives the milky shade an uninterrupted round silhouette.
    verts,polys=groups.setdefault(('Opal pendant envelopes',opal,0),([],[]))
    rings=[(-.278,.035),(-.265,.076),(-.230,.105),(-.18,.119),(.17,.119),(.220,.11),(.263,.078),(.278,.035)]
    count=24; start=len(verts)
    for dy,radius in rings:
        for i in range(count):
            a=2*math.pi*i/count
            verts.append((x+radius*math.cos(a),-z+radius*math.sin(a),y+dy))
    for j in range(len(rings)-1):
        for i in range(count):
            q=start+j*count
            polys.append((q+i,q+(i+1)%count,q+count+(i+1)%count,q+count+i))
    polys.append(tuple(start+i for i in reversed(range(count))))
    polys.append(tuple(start+count*(len(rings)-1)+i for i in range(count)))
for x in [-11.70,9.68]:
    for j in range(6):
        capsule(x+(.24 if j%2 else 0),-3.4-2.28*j,2.94+.37*(j%3))

# The bar sign and entry sign use the same fabricated double-profile artwork.
def venue_sign(x,y,z,scale,east):
    def coord(u,v,d=0):
        return (x-d,-z-u*scale,y+v*scale) if east else (x-u*scale,-z+d,y+v*scale)
    outline=[(-.55,.90),(-.29,.83),(-.14,.70),(-.10,.52),(.02,.42),(.12,.37),(.04,.30),(.09,.26),(.02,.22),(.08,.16),(.06,.08),(-.04,.04),(-.23,-.03),(-.38,-.17),(-.47,-.33)]
    for dx,mat in [(0,pearl),(.19,cyan)]:
        line=bpy.data.curves.new('Offset side profile','CURVE')
        line.dimensions='3D'
        line.bevel_depth=.012*scale
        line.bevel_resolution=3
        spline=line.splines.new('BEZIER')
        spline.bezier_points.add(len(outline)-1)
        for pt,(u,v) in zip(spline.bezier_points,outline):
            pt.co=coord(u+dx,v,.02)
            pt.handle_left_type='AUTO'
            pt.handle_right_type='AUTO'
        obj=bpy.data.objects.new('Afterimage neon outline',line)
        scene.collection.objects.link(obj)
        line.materials.append(mat)
    font=bpy.data.curves.new('Venue wordmark','FONT')
    font.body='AFTERIMAGE'
    font.space_character=1.23
    font.size=.42*scale
    font.extrude=.004
    obj=bpy.data.objects.new('Afterimage wordmark',font)
    scene.collection.objects.link(obj)
    obj.location=coord(.48,.12,.024)
    obj.rotation_euler=(math.pi/2,0,-math.pi/2 if east else math.pi)
    font.materials.append(pearl)
venue_sign(13.70,6.47,-11.65,1.33,True)
venue_sign(.88,3.18,-.16,.79,False)

# Continuous solid plinth below the three portrait-wall booths.
# Root Z is 4 mm in the donor, so a 140 mm rise contacts the 144 mm deck.
box('Portrait lounge plinth',brick,(-12.185,.074,-5.465),(3.31,.14,10.33),0)
# Recessed amber lens between a dark carrier and brushed-metal upper lip.
warm_lens=diode('Lounge cove amber',(.95,.38,.10),.55)
box('Lounge cove carrier',steel,(-10.524,.10,-5.465),(.012,.058,10.28),0)
box('Lounge cove diffuser',warm_lens,(-10.515,.100,-5.465),(.006,.009,10.22),0)
box('Lounge cove shielding lip',trim,(-10.509,.132,-5.465),(.042,.016,10.30),0)
install_water_frame()
runpy.run_path(str(Path(__file__).with_name('bar_floor_edge.py')))['install'](groups,garnet,joint)
runpy.run_path(str(Path(__file__).with_name('landing_joints.py')))['install'](box,steel,graphite,pewter,brick)
runpy.run_path(str(Path(__file__).with_name('bar_service.py')))['install'](box,groups)
for (group,mat,radius),(vertices,polys) in groups.items():
    # Compress the veneer section to a 2.9 mm finished height above the slab.
    if group in {'Mortar bed','Honed aggregate flags','Split basalt bar and booth apron','Steel inlay','Threshold band'}:
        vertices=[(x,y,.20*z) for x,y,z in vertices]
        radius=min(radius,.00035)
    mesh=bpy.data.meshes.new(group)
    mesh.from_pydata(vertices,[],polys)
    mesh.update()
    obj=bpy.data.objects.new(group,mesh)
    scene.collection.objects.link(obj)
    mesh.materials.append(mat)
    if group in rail_groups:
        for poly in mesh.polygons:
            poly.use_smooth=len(poly.vertices)==4
    formed_end=group in {'Wrapped pewter counter ends','Bar copper plinth','Folded pewter guest counter'}
    def bend_parameters(point):
        dx=bend_centre.x-point.x
        dz=bend_centre.y+point.y
        return math.hypot(dx,dz),math.atan2(dz,dx)
    if formed_end:
        loop_normals=[tuple(poly.normal) for poly in mesh.polygons for idx in poly.loop_indices]
        for poly in mesh.polygons:
            r,theta=bend_parameters(poly.center)
            if abs(poly.normal.z)>.001 or not (.001<theta<math.pi/2-.001 and .31<r<.38):
                continue
            outward=Vector((-math.cos(theta),math.sin(theta),0))
            sign=1 if poly.normal.dot(outward)>0 else -1
            if abs(poly.normal.dot(outward))<.97:
                continue
            poly.use_smooth=True
            for idx in poly.loop_indices:
                _,angle=bend_parameters(mesh.vertices[mesh.loops[idx].vertex_index].co)
                loop_normals[idx]=(-sign*math.cos(angle),sign*math.sin(angle),0)
        mesh.normals_split_custom_set(loop_normals)
    uv=mesh.uv_layers.new(name='Metric finish')
    repeat_metres = {'Rear terrazzo':1.6,'Rear basalt':.70,'Rear graphite':1.4,
                     'Rear steel':1.4,'Rear canopy-bronze':1.2,'Rear garnet':.68,'Rear cobalt':.63}.get(mat.name,1/.85)
    for poly in mesh.polygons:
        axis=max(range(3),key=lambda k:abs(poly.normal[k]))
        u,v=[i for i in range(3) if i!=axis]
        for idx in poly.loop_indices:
            point=mesh.vertices[mesh.loops[idx].vertex_index].co
            if mat in (bar_silver,copper_skirt):
                if axis==2:
                    # Each rolled sheet follows its own long axis at the return.
                    if group=='Folded pewter guest counter' and poly.center.x>11.0:
                        uv.data[idx].uv=(point.x/1.2,point.y/1.2)
                    else:
                        uv.data[idx].uv=(-point.y/1.2,point.x/1.2)
                else:
                    # Local horizontal tangent also unwraps cheeks normal to the rail.
                    tangent=Vector((-poly.normal.y,poly.normal.x)).normalized()
                    along=tangent.dot(Vector((point.x,point.y)))
                    r,angle=bend_parameters(point)
                    if formed_end and .30<r<.39 and -.001<=angle<=math.pi/2+.001:
                        along=bend_centre.x+r*(angle-math.pi/2)
                    uv.data[idx].uv=(along/1.2,point.z/1.2)
            elif mat in (cobalt,front_glass):
                p2=Vector((point.x,-point.y))
                _,chain=surface_station(p2)
                uv.data[idx].uv=(chain/1.41,(point.z-.272)/(.918-.272))
            else:
                uv.data[idx].uv=(point[u]/repeat_metres,point[v]/repeat_metres)
    # Keep the submillimetre inlay square-cut; bevel faces collapse at engine precision.
    if radius==0 or formed_end or group in {'Steel inlay','Threshold band','Honed aggregate flags','Split basalt bar and booth apron'}:
        continue
    bevel=obj.modifiers.new('Fabricated edge radius','BEVEL')
    bevel.width=radius
    bevel.segments=2
    bevel.affect='EDGES'
    obj.modifiers.new('Weighted face normals','WEIGHTED_NORMAL')
# Resolve non-convex top slab contours and cylindrical cap n-gons before glTF tangent evaluation.
for name in ('Folded pewter guest counter','Wrapped pewter counter ends','Opal pendant envelopes','Bar copper plinth',*rail_groups):
    obj=bpy.data.objects[name]
    obj.modifiers.new('Triangulate manufacturing caps','TRIANGULATE')
bpy.context.preferences.filepaths.save_version=0
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(Path(__file__).with_name('D189-rear-finishes.blend')))
bpy.ops.export_scene.gltf(filepath=str(root/'assets/D189-Rear-Finishes.glb'),export_apply=True,export_yup=True,export_tangents=True)
