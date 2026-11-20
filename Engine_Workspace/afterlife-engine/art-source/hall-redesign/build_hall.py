"""Build original D189 interior fittings. Design coordinates are Engine Y-up metres."""
from pathlib import Path
import math
import bpy
from mathutils import Vector, Quaternion

root = Path(__file__).resolve().parents[2]
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'

def material(name, rgb, metal, rough, emission=0, texture=None):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    shader = nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*rgb, 1)
    shader.inputs['Metallic'].default_value = metal
    shader.inputs['Roughness'].default_value = rough
    if emission:
        shader.inputs['Emission Color'].default_value = (*rgb, 1)
        shader.inputs['Emission Strength'].default_value = emission
    if texture:
        image = bpy.data.images.load(str(root / 'art-source/material-textures' / (texture+'-normal.png')), check_existing=True)
        image.colorspace_settings.name = 'Non-Color'
        tex = nodes.new('ShaderNodeTexImage')
        tex.image = image
        normal = nodes.new('ShaderNodeNormalMap')
        normal.inputs['Strength'].default_value = .45
        mat.node_tree.links.new(tex.outputs['Color'],normal.inputs['Color'])
        mat.node_tree.links.new(normal.outputs['Normal'],shader.inputs['Normal'])
    return mat

stone = [material('Flamed basalt '+str(i), tuple(v*k for v in (.056,.068,.083)),.04,.60+i*.035, texture='concrete') for i,k in enumerate((.82,1,1.17))]
steel = material('Satin stainless tread',(.164,.160,.154),.81,.46,texture='metal')
edge = material('Burnished steel edge',(.37,.40,.43),.88,.24)
black = material('Blackened structural steel',(.047,.051,.059),.70,.34,texture='metal')
pad = material('Oxblood acoustic cassette',(.115,.024,.029),.08,.48,texture='leather')
welt = material('Oxblood welt',(.076,.014,.023),.10,.39)
ember = material('Amber red opal',(.86,.078,.027),0,.36,1.8)
ice = material('Low ice diffuser',(.055,.29,1),0,.32,2.4)
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

# Engine-space rectangle; trapezoidal courses share their diagonal corner cuts.
def basin_course(group, mat, outer, inner, top, bottom, radius):
    verts,polys=groups.setdefault((group,mat,radius),([],[]))
    def loop(inset):
        x=5.58-inset
        near,far=-25.25-inset,-37.45+inset
        return [(-x,-near),(x,-near),(x,-far),(-x,-far)]
    a,b=loop(outer),loop(inner)
    for i in range(4):
        j=(i+1)%4
        points=[a[i],a[j],b[j],b[i]]
        base=len(verts)
        verts.extend((x,y,h) for h in (bottom,top) for x,y in points)
        polys.extend(tuple(base+k for k in face) for face in faces)


def finish_map(name, key, emission=0.):
    mat = material(name,(.4,.4,.4),0,.45)
    shader=mat.node_tree.nodes.get('Principled BSDF')
    nodes,links=mat.node_tree.nodes,mat.node_tree.links
    def tex(suffix, non_colour):
        img=bpy.data.images.load(str(Path(__file__).with_name('maps')/(key+'-'+suffix+'.png')),check_existing=True)
        if non_colour: img.colorspace_settings.name='Non-Color'
        block=nodes.new('ShaderNodeTexImage')
        block.image=img
        return block.outputs['Color']
    colour=tex('color',False)
    links.new(colour,shader.inputs['Base Color'])
    normal=nodes.new('ShaderNodeNormalMap')
    normal.inputs['Strength'].default_value={'mineral':.52,'garnet':.48,'basalt':.65}.get(key,1.)
    links.new(tex('normal',True),normal.inputs['Color'])
    links.new(normal.outputs['Normal'],shader.inputs['Normal'])
    split=nodes.new('ShaderNodeSeparateColor')
    links.new(tex('orm',True),split.inputs['Color'])
    links.new(split.outputs['Green'],shader.inputs['Roughness'])
    links.new(split.outputs['Blue'],shader.inputs['Metallic'])
    if emission:
        links.new(colour,shader.inputs['Emission Color'])
        shader.inputs['Emission Strength'].default_value=emission
    return mat

nickel=finish_map('M03 satin folded nickel','nickel')
garnet=finish_map('M08 fired iron-red clay','garnet')
honed=finish_map('M09 honed basalt','basalt')
resin=finish_map('M02 veined amber resin diffuser','amber',1.25)
redcoat=material('M05 oxblood powder coat',(.22,.019,.026),.46,.38,texture='enamel')
marker=material('Warm recessed marker',(.98,.33,.065),.0,.36,1.45)
blue=material('M10 cobalt etched interlayer',(.016,.105,.95),.06,.24,2.25)

def folded_skin(group, material_, points, panels, bevel=.004):
    verts,polys=groups.setdefault((group,material_,bevel),([],[]))
    base=len(verts)
    verts.extend((x,-z,h) for x,h,z in points)
    polys.extend(tuple(base+k for k in panel) for panel in panels)

def folded_blade(side, lower_x, upper_x, bottom, top, bottom_width, top_width, face_z):
    # Two visible facets meeting along the standing seam of a tapered metal shell.
    points=[]
    for cx,h,w in [(lower_x,bottom,bottom_width),(upper_x,top,top_width)]:
        for u,depth in [(-.5,0),(-.09,.24),(.5,.015),(.5,-.105),(-.5,-.105)]:
            points.append((side*(cx+w*u),h,face_z+depth))
    panels=[(4,3,2,1,0),(5,6,7,8,9)]
    panels.extend((i,(i+1)%5,(i+1)%5+5,i+5) for i in range(5))
    # Mirroring reverses the winding of the sealed shell.
    if side<0: panels=[tuple(reversed(p)) for p in panels]
    folded_skin('Stage nickel fan blades',nickel,points,panels,.012)

def fascia_quad(group, material_, a,b,c,d, ridge):
    # Sealed pressed-metal face: four triangular facets and back cap.
    pts=[a,b,c,d,ridge]
    panels=[(0,1,4),(1,2,4),(2,3,4),(3,0,4),(3,2,1,0)]
    folded_skin(group,material_,pts,panels,.002)

def perforated_stair_skin(side):
    # Original inside glass runs from z=-14.675 to -19.605; infill fits directly
    # outside the glass on the open-well side. Eight-sided holes pierce all the way.
    near,far=-14.675,-19.605
    start_h=.30+.45*((-14.46-near)/5.34)
    rise=.572+.45/5.34
    columns,rows=88,11
    pitch=(near-far)/columns
    dh=.695/rows
    pts,panels=[],[]
    for col in range(columns):
        for row in range(rows):
            centre_z=near-(col+.5)*pitch
            base_h=start_h+(near-centre_z)*rise
            h=base_h+(row+.5)*dh
            base=len(pts)
            for thickness in (0,.007):
                for inner in (False,True):
                    for i in range(8):
                        angle=i*math.pi/4
                        cs,sn=math.cos(angle),math.sin(angle)
                        if inner: dz,dy=cs*.017,sn*.017
                        else:
                            scale=max(abs(cs),abs(sn))
                            dz,dy=cs*.50*pitch/scale,sn*.50*dh/scale
                        pts.append((side*(12.621-thickness),h+dy-dz*rise,centre_z+dz))
            for i in range(8):
                j=(i+1)%8
                panels.extend(tuple(base+v for v in face) for face in
                    [(i,j,j+8,i+8),(16+j,16+i,24+i,24+j),(8+i,8+j,24+j,24+i)])
    if side>0: panels=[tuple(reversed(p)) for p in panels]
    folded_skin('M05 drilled garnet stair infill',redcoat,pts,panels,0)

def contour_interlayers():
    # Transverse etching below the top glass, following four distinct flowing
    # paths across the room. A stone border bounds the illuminated interlayer.
    for course,(base,drift,amp,phase) in enumerate([
        (-34.88,1.38,.42,.3),(-32.58,1.92,.70,1.2),
        (-30.83,2.02,.54,-.1),(-28.35,1.56,.41,2.4)]):
        points=[]
        for k in range(145):
            f=k/144
            x=-4.64+9.28*f
            z=base+drift*(f-.5)+amp*math.sin(2*math.pi*f+phase)
            z+=.17*math.sin(3.4*math.pi*f+phase*.72)
            # Rounded, hand-etched width between 14 and 24 mm at artwork scale.
            hw=.008+.003*math.sin(f*math.pi+course*.35)**2
            points.extend([(x,-.2967,z-hw),(x,-.2967,z+hw)])
        quads=[(k,k+1,k+3,k+2) for k in range(0,len(points)-2,2)]
        folded_skin('M10 cobalt glass contour',blue,points,quads,0)

basin_course('Basin coping', honed,-.075,.16,.009,-.305,.003)
basin_course('Basin middle tread', honed,.16,.54,-.145,-.305,.003)
basin_course('Basin lower landing', stone[1],.54,.92,-.296,-.308,.002)
basin_course('Coping metal nosing', steel,.128,.16,.011,.008,.0007)
basin_course('Middle metal nosing', steel,.508,.54,-.143,-.146,.0007)
for side in (-1,1):
    for z in (-27.5,-31.35,-35.20):
        box('Low recessed step markers',marker,(side*5.417,-.039,z),(.012,.017,.48),.002)
    for x in (-3.3,0,3.3):
        z=-25.418 if side==1 else -37.282
        box('Low recessed step markers',marker,(x,-.039,z),(.48,.017,.012),.002)

for side in (-1,1):
    # A recessed dark bed remains visible in every 12 mm open mortar joint.
    cx=side*6.25
    box('Paver joint bed',black,(cx,.001,-31.35),(1.24,.006,12.24),.001)
    for row in range(40):
        edges=[-.6,-.2,.2,.6] if row%2==0 else [-.6,-.4,0,.4,.6]
        for col,(a,b) in enumerate(zip(edges,edges[1:])):
            box('Running bond side paving',garnet,(cx+(a+b)/2,.006,-37.45+(row+.5)*.305),(b-a-.012,.012,.294),.004)
    # Continue the small-paver module around the two ends of the basin.
    end_z=-24.87 if side==1 else -37.83
    box('End paving joint bed',black,(0,.001,end_z),(13.72,.006,.60),.001)
    for row in range(2):
        edges=[-6.86]+[i*.4+(row*.2) for i in range(-17,18) if -6.80<i*.4+row*.2<6.80]+[6.86]
        for col,(a,b) in enumerate(zip(edges,edges[1:])):
            box('End running bond',garnet,((a+b)/2,.006,end_z+(.5-row)*.30),
                (b-a-.012,.012,.289),.003)
    for mid in (-28.35,-38.55):
        # Public-facing side of VIP shells. The high fascia clears glazing and doors.
        for k in range(7):
            z=mid+(k-3)*.88
            box('Gallery fascia panel',pad,(side*10.37,6.51,z),(.10,.91,.844),.025)
            for r in (-1,1):
                for c in (-1,1):
                    box('Gallery quilt welt',welt,(side*10.312,6.51+r*.162,z+c*.154),
                        (.016,.448,.020),.003,(1,0,0),-r*c*.76)
        box('Gallery grazer valance',black,(side*10.12,7.085,mid),(.49,.115,6.32),.012)
        box('Gallery grazer diffuser',ember,(side*9.98,7.018,mid),(.10,.018,6.08),.003)
        for z in (mid-3.07,mid+3.07):
            box('Gallery end mullion',black,(side*10.26,6.46,z),(.16,1.06,.087),.007)
            box('Gallery return light',ice,(side*10.172,6.45,z),(.012,.71,.027),.002)
    cx=side*2.20
    box('Threshold stainless pan',steel,(cx,.019,-24.24),(1.91,.012,.44),.004)
    for end in (-1,1):
        box('Threshold milled edge',edge,(cx,.026,-24.24+end*.209),(1.91,.009,.017),.003)
    for i in range(22):
        for j in range(4):
            box('Raised chequer lugs',edge,(cx+(i-10.5)*.082,.028,-24.24+(j-1.5)*.09),(.065,.009,.019),.003,angle=(-1)**(i+j)*.70)
    for dx in (-.90,.90):
        for dz in (-.15,.15):
            box('Threshold fasteners',black,(cx+dx,.028,-24.24+dz),(.029,.007,.029),.003,angle=.785)
    # A folded fascia is clipped to the existing raised slab. The original guard
    # line remains the reference for both the fascia and the standing ledge.
    for j in range(16):
        z0=-22.56-j*1.337
        z1=z0-1.323
        xf=side*8.285
        v=[(xf,3.014,z0),(xf,3.014,z1),(xf,3.62,z1),(xf,3.62,z0)]
        if side>0: v.reverse()
        fascia_quad('Folded gallery beam jackets',nickel,*v,(xf-side*.104,3.33,z0-.90))
    # The east standing ledge projects over the void, never into the aisle.
    if side==1:
        for j in range(7):
            z=-24.0-j*2.89
            box('Upper nickel standing ledge',nickel,(8.242,4.72,z),(.235,.037,2.86),.012)
            for dz in (-1.02,1.02):
                box('Ledge cantilever bracket',black,(8.28,4.65,z+dz),(.19,.11,.035),.007)
    perforated_stair_skin(side)
    for i in range(19):
        z=-14.46-i*.28
        h=(i+1)*.16+.45*(max(0,min(1,(-14.46-z)/5.34)))
        box('Stair warm nosing diffuser',marker,(side*13.30,h-.017,z+.007),(1.303,.014,.012),.003)

    # Reuse enclosed support frames as collision owners behind folded fins.
    box('Stage wing acoustic backing',pad,(side*4.33,3.37,-43.10),(3.80,5.6,.18),.025)
    box('Stage steel uprights',black,(side*3.26,3.12,-42.80),(.15,4.93,.20),.014)
    box('Stage lattice',black,(side*4.77,2.96,-42.79),(.12,4.42,.15),.012)
    for lo,hi,b,t,bw,tw,z in [
        (2.94,3.36,.62,5.83,.36,.78,-42.50),
        (3.72,4.60,.62,6.22,.52,1.12,-42.28),
        (4.58,5.84,.62,6.43,.61,1.32,-42.03)]:
        folded_blade(side,lo,hi,b,t,bw,tw,z)
        box('Fan blade uplight housing',black,(side*lo,.625,z+.20),(.41,.068,.18),.012)
        box('Fan blade footlight glass',marker,(side*lo,.665,z+.20),(.34,.010,.12),.002)
    box('Sapphire slit recess',black,(side*2.29,3.34,-43.68),(.14,3.42,.10),.012)
    box('Sapphire slit opal strip',blue,(side*2.29,3.34,-43.61),(.057,3.30,.015),.006)
    # Upholstered wall bays sit behind the banquettes; the upper row repeats their rhythm.
    for y,height in [(2.02,1.24),(6.85,1.06)]:
        for station in [-24.55,-29.1,-33.65,-38.2]:
            # The first upper cassette bay sits inside the VIP end wall at
            # Z=-23.26. Re-space five complete pads inside this room, and
            # terminate the rails at the same interior boundary.
            shortened = y>3.65 and station==-24.55
            run_length = 2.98 if shortened else 3.45
            midpoint = -24.80 if shortened else station
            pitch = run_length / 5
            for panel in range(5):
                z=midpoint+(panel-2)*pitch
                box('Sidewall acoustic cassettes',pad,(side*13.83,y,z),(.095,height,pitch-.033),.027)
                # The upholstered face sits at x=13.7825 m. Raised welts form a lozenge in each cassette.
                rise,run=height*.34,pitch*.37
                for row in (-1,1):
                    for col in (-1,1):
                        box('Cassette diamond welts',welt,(side*13.777,y+row*rise/2,z+col*run/2),
                            (.018,math.hypot(rise,run),.017),.003,(1,0,0),-row*col*math.atan2(run,rise))
            for dy in (-height/2,height/2):
                box('Sidewall metal reveals',black,(side*13.74,y+dy,midpoint),(.08,.049,run_length+.07))
            box('Sidewall warm reveal',ember,(side*13.71,y+height/2+.03,midpoint),(.035,.021,run_length+.01),.003)
    # Portal is fixed to the bridge piers and soffit. Centre aisle stays open.
    x=side*4.35
    box('Bridge portal pier',black,(x,1.57,-20.42),(.21,3.12,.23),.018)
    box('Portal illuminated reveal',ember,(x-side*.126,1.62,-20.35),(.036,2.74,.064),.009)
box('Portal lintel',black,(0,3.02,-20.42),(8.9,.20,.23),.015)
box('Portal lintel reveal',ember,(0,2.935,-20.285),(8.58,.033,.037),.006)

# Fit the thin translucent console face in front of the old poster glass.
for x in (-.79,0,.79):
    box('DJ cast amber fascia',resin,(x,.966,-41.183),(.78,.806,.017),.004)
for x in (-1.195,1.195):
    box('DJ end trim',nickel,(x,.965,-41.179),(.024,.855,.032),.004)
for h in (.54,1.39):
    box('DJ fascia reveal',nickel,(0,h,-41.179),(2.417,.024,.032),.004)
contour_interlayers()
# Source STAGE_PLATFORM_DJ provides only the two 1.2 m-wide stair ends.
# The three infill courses sit between them, with a 2 mm installation joint.
# Join the existing trimesh used by physics so the central access is walkable.
for i in range(3):
    front=-38.09-i*.30
    back=-38.39-i*.30
    height=.15*(i+1)
    box('Basin middle tread',honed,(0,height/2,(front+back)/2),
        (8.796,height,front-back),.003)
    for j in range(9):
        x=(j-4)*.966
        box('Low recessed step markers',marker,(x,height-.024,front-.003),
            (.950,.022,.014),.002)
# Bronze marker faces remain below both the pool coping and public walk datum.
for x in (-3.3,0,3.3):
    box('Low recessed step markers',marker,(x,.006,-25.29),(.36,.013,.027),.002)
import sys
sys.path.insert(0,str(Path(__file__).parent))
from hall_surfaces import install_architectural_surfaces
mineral=finish_map('M12 honed graphite aggregate flags','mineral')
gunmetal=finish_map('M13 brushed charcoal technical panels','gunmetal')
install_architectural_surfaces(box,mineral,gunmetal,nickel,black,garnet)
# A dry mineral apron receives both stainless plates on the walking side of
# the red brickwork. Split flags around each pocket instead of stacking faces.
for row,(near,far) in enumerate(((-22.65,-23.65),(-23.65,-24.565))):
    cuts=sorted(set([-6.86,6.86]+[i+.50*row for i in range(-6,7)]+
                    ([-3.176,-1.224,1.224,3.176] if row==1 else [])))
    for a,b in zip(cuts,cuts[1:]):
        plate_column=row==1 and 1.224<abs((a+b)/2)<3.176
        runs=[(near,-24.009),(-24.471,far)] if plate_column else [(near,far)]
        for hi,lo in runs:
            box('Hall staggered mineral flags',mineral,((a+b)/2,.012,(hi+lo)/2),
                (b-a-.008,.014,hi-lo-.008),.002)


for (group,mat,radius),(vertices,polys) in groups.items():
    mesh=bpy.data.meshes.new(group)
    mesh.from_pydata(vertices,[],polys)
    mesh.update()
    obj=bpy.data.objects.new(group,mesh)
    scene.collection.objects.link(obj)
    mesh.materials.append(mat)
    if radius>0:
        bevel=obj.modifiers.new('Fabricated edge radius','BEVEL')
        bevel.width=radius
        bevel.segments=2
        bevel.affect='EDGES'
        obj.modifiers.new('Weighted face normals','WEIGHTED_NORMAL')
    obj.modifiers.new('Tangent export triangulation','TRIANGULATE')
    # Project the final bevel triangles rather than interpolating a single flat
    # UV at a hard corner. This also gives rounded coping edges valid tangents.
    evaluated=obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    finished=bpy.data.meshes.new_from_object(evaluated)
    obj.modifiers.clear()
    obj.data=finished
    bpy.data.meshes.remove(mesh)
    finished.name=group
    uv=finished.uv_layers.new()
    uv_scale=.68 if mat in (mineral,gunmetal) else 2.0
    for poly in finished.polygons:
        axis=max(range(3),key=lambda k:abs(poly.normal[k]))
        u,v=[i for i in range(3) if i!=axis]
        for idx in poly.loop_indices:
            point=finished.vertices[finished.loops[idx].vertex_index].co
            uv.data[idx].uv=(point[u]*uv_scale,point[v]*uv_scale)
bpy.context.preferences.filepaths.save_version=0
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(Path(__file__).with_name('D189-hall-fittings.blend')))
bpy.ops.export_scene.gltf(filepath=str(root/'assets/D189-Hall-Fittings.glb'),export_apply=True,export_yup=True,export_tangents=True)

# Blender can emit zero Mikk tangents on the submillimetre bevel seams of long
# plates. Reconstruct those frames from the least-aligned local axis, keeping
# handedness and the authored tangent on every well-conditioned vertex.
import json
import struct
import numpy as np
glb=root/'assets/D189-Hall-Fittings.glb'
with glb.open('r+b') as stream:
    stream.seek(12)
    length,_=struct.unpack('<II',stream.read(8))
    doc=json.loads(stream.read(length))
    length,_=struct.unpack('<II',stream.read(8))
    data_start=stream.tell()
    raw=bytearray(stream.read(length))
    def floats(index, width):
        acc=doc['accessors'][index]
        view=doc['bufferViews'][acc['bufferView']]
        assert acc['componentType']==5126
        return np.ndarray((acc['count'],width),'<f4',raw,
                          view.get('byteOffset',0)+acc.get('byteOffset',0),
                          (view.get('byteStride',4*width),4))
    for mesh in doc['meshes']:
        for prim in mesh['primitives']:
            a=prim['attributes']
            normal=floats(a['NORMAL'],3)
            tangent=floats(a['TANGENT'],4)
            bad=np.linalg.norm(tangent[:,:3],axis=1)<.999
            if not bad.any(): continue
            n=normal[bad]
            seed=np.eye(3)[np.argmin(abs(n),axis=1)]
            orthogonal=np.cross(n,seed)
            tangent[bad,:3]=orthogonal/np.linalg.norm(orthogonal,axis=1)[:,None]
    stream.seek(data_start)
    stream.write(raw)
