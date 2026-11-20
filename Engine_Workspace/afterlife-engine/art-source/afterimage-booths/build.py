"""Build three metre-scale booth mesh donors in Blender. Engine local X points at the aisle."""
from pathlib import Path
import math
import json
import bpy,bmesh
from mathutils import Matrix,Vector
src=Path(__file__).resolve().parent
root=src.parents[1]
contact_spec=json.loads((root/'assets/pdr-furniture-clearance.json').read_text())
import sys
sys.path.insert(0,str(src))
from bench import build_bench, end_lens
from upholstery import build_backrest, RADIUS, RAIL_X, LOW_Y, HIGH_Y
if globals().get('rebuild_open_donor', False):
    expected = src/'D189-Afterimage-Booths.blend'
    if Path(bpy.data.filepath) != expected or bpy.data.is_dirty:
        raise RuntimeError('Live rebuild needs the saved booth donor open')
    if {o.name for o in bpy.data.objects} != {'Afterimage '+k+' Booth' for k in ('Foyer','Hall','VIP')}:
        raise RuntimeError('Live donor has additional objects')
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    bpy.data.orphans_purge(do_recursive=True)
else:
    bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene
scene.unit_settings.system='METRIC'
def material(name,color,rough,metal=0,texture=None,emission=None,emit=0,trans=0,alpha=1):
    m=bpy.data.materials.new(name);m.use_nodes=True
    m.use_backface_culling=alpha>=1
    nt=m.node_tree;s=nt.nodes.get('Principled BSDF')
    s.inputs['Base Color'].default_value=(*color,1);s.inputs['Roughness'].default_value=rough
    s.inputs['Metallic'].default_value=metal
    if texture:
        def tex(channel):
            t=nt.nodes.new('ShaderNodeTexImage')
            t.image=bpy.data.images.load(str(src/'maps'/f'{texture}-{channel}.png'),check_existing=True)
            if channel not in ('color','emission'):t.image.colorspace_settings.name='Non-Color'
            return t.outputs['Color']
        albedo=tex('color');nt.links.new(albedo,s.inputs['Base Color'])
        n=nt.nodes.new('ShaderNodeNormalMap');n.inputs['Strength'].default_value=.46 if texture=='merlot' else 1.;nt.links.new(tex('normal'),n.inputs['Color']);nt.links.new(n.outputs['Normal'],s.inputs['Normal'])
        orm=nt.nodes.new('ShaderNodeSeparateColor');nt.links.new(tex('orm'),orm.inputs[0]);nt.links.new(orm.outputs['Green'],s.inputs['Roughness']);nt.links.new(orm.outputs['Blue'],s.inputs['Metallic'])
    if emission:
        s.inputs['Emission Color'].default_value=(*emission,1);s.inputs['Emission Strength'].default_value=emit
        if texture=='amber':nt.links.new(tex('emission'),s.inputs['Emission Color'])
    if trans:s.inputs['Transmission Weight'].default_value=trans;s.inputs['IOR'].default_value=1.49
    if alpha!=1:s.inputs['Alpha'].default_value=alpha;m.surface_render_method='BLENDED'
    return m
leather=material('M01 Merlot channel leather',(.12,.017,.026),.40,texture='merlot')
glass=material('M02 Amber cast ribbed glass',(.46,.19,.048),.24,texture='amber',emission=(.66,.23,.045),emit=4.1,trans=.34)
nickel=material('M03 Satin champagne metal',(.55,.42,.27),.32,.82,texture='bronze')
smoke=material('M04 Smoked safety glazing',(.18,.135,.092),.13,.03,alpha=.26)
black=material('Graphite enamel',(.043,.032,.033),.37,.51)
stone=material('M07 Satin aggregate table',(.09,.08,.08),.32,.13,texture='stone')
welt=material('Merlot piping',(.13,.031,.036),.37)
opal=material('Warm lamp lens',(.86,.53,.22),.36,emission=(1,.58,.26),emit=2.25)
mats=[leather,glass,nickel,smoke,black,stone,welt,opal]
def append_mesh(b,mat,origin,angle=0):
    transform=Matrix.Translation(Vector(origin))@Matrix.Rotation(angle,4,'Z')
    b.transform(transform);bmesh.ops.triangulate(b,faces=list(b.faces));b.normal_update();b.verts.index_update();offset=len(vertices)
    vertices.extend(tuple(v.co) for v in b.verts)
    for f in b.faces:
        faces.append(tuple(offset+v.index for v in f.verts));face_mats.append(mats.index(mat))
    b.free()
def box(mat,position,size,r=.008,angle=0,segments=2):
    b=bmesh.new();bmesh.ops.create_cube(b,size=1)
    for v in b.verts:
        for i in range(3):v.co[i]*=size[i]
    if r:bmesh.ops.bevel(b,geom=list(b.edges),offset=min(r,min(size)*.48),segments=segments,affect='EDGES',profile=.52)
    append_mesh(b,mat,position,angle)
def cyl(mat,xy,z,r,height,verts=24,ry=None):
    b=bmesh.new();bmesh.ops.create_cone(b,cap_ends=True,cap_tris=False,segments=verts,radius1=r,radius2=r,depth=height)
    if ry is not None:
        for v in b.verts:v.co.y*=ry/r
    append_mesh(b,mat,(*xy,z))
def corner_liner(upper=False):
    # Close the shelf between the rounded foam and the square glazed carcass.
    # Its inner arc sits under the leather and the two straight lips meet the rails.
    direction=-1 if upper else 1
    rail_y=HIGH_Y if upper else LOW_Y
    cx=RAIL_X+RADIUS
    cy=rail_y+direction*RADIUS
    outer_y=2.550 if upper else .045
    radius=RADIUS+.057
    outline=[(.070,outer_y+.085*direction),(.105,outer_y+.039*direction),(.162,outer_y),(cx,outer_y)]
    for i in range(31):
        a=math.pi*i/60
        outline.append((cx-radius*math.sin(a),cy-direction*radius*math.cos(a)))
    outline.append((.046,cy))
    if upper:outline.reverse()
    b=bmesh.new()
    rings=[[b.verts.new((x,y,h)) for x,y in outline] for h in (1.002,1.030)]
    b.faces.new(rings[0][::-1])
    b.faces.new(rings[1])
    for i in range(len(outline)):
        j=(i+1)%len(outline)
        b.faces.new([rings[0][i],rings[0][j],rings[1][j],rings[1][i]])
    append_mesh(b,black,(0,0,0))
    # One low-profile service fastener on the rear of the cap.
    cyl(nickel,(.114,outer_y+direction*.080),1.0305,.008,.002,12)

def build(kind):
    global vertices,faces,face_mats
    vertices=[];faces=[];face_mats=[]
    vip=kind=='VIP'; front=kind=='Foyer'
    # Rounded exterior metal envelope and formed cushions are added by the loft builder.
    corner_liner()
    if vip or front:corner_liner(upper=True)
    # Same glassware positions as the D189 scene, on a larger functional 690 mm top.
    table_start=len(vertices)
    shift=contact_spec["foyer"]["tableShift"] if front else 0.
    xy=(1.34+shift,1.30)
    cyl(nickel,xy,.028,.265,.048,32,.245)
    if vip:
        box(nickel,(*xy,.339),(.30,.45,.592),.07,segments=4)
    else:
        cyl(nickel,xy,.344,.071,.61)
    cyl(nickel,xy,.651,.595 if front else .54,.043,36,.565 if front else .58)
    cyl(stone,xy,.679,.590 if front else .535,.022,36,.560 if front else .575)
    lx,ly=1.53+shift,1.54
    if vip:
        box(nickel,(lx,ly,.70375),(.18,.105,.0275),.008)
        cyl(nickel,(lx,ly),.793,.014,.167,16)
        box(nickel,(lx,ly,.890),(.26,.102,.039),.017,segments=3)
        box(opal,(lx,ly,.871),(.229,.082,.012),.005)
    else:
        cyl(nickel,(lx,ly),.7025,.078,.025)
        cyl(opal,(lx,ly),.797,.057,.162)
        cyl(nickel,(lx,ly),.884,.071,.014)
        for i in range(12):
            a=i*math.pi/6
            cyl(nickel,(lx+.063*math.cos(a),ly+.063*math.sin(a)),.794,.0038,.166,6)
    table_end=len(vertices)
    if vip:
        rise=contact_spec['vipTableRise']
        for index in range(table_start,len(vertices)):
            x,y,z=vertices[index]
            vertices[index]=(x,y,z+rise)
    upholstery_faces={}
    def add_surface(points,polygons,uvs,smooth,materials):
        start=len(vertices)
        vertices.extend(points)
        for indices,coords,rounded,material in zip(polygons,uvs,smooth,materials):
            upholstery_faces[len(faces)]=(coords,rounded)
            faces.append(tuple(start+v for v in indices))
            face_mats.append(mats.index(material))
    def add_upholstery(points,polygons,uvs,smooth):
        add_surface(points,polygons,uvs,smooth,[leather]*len(polygons))
    shell,brow=build_bench(vip,front,add_surface,leather,welt,black,nickel,glass,opal,smoke)
    # Molded ribs catch the room lights across the arcuate header.
    distance=0.
    previous=None
    for index,((ax,ay),(bx,by)) in enumerate(shell):
        w=math.hypot(bx-ax,by-ay)
        if previous is not None:distance+=math.dist(previous,(ax,ay))
        previous=ax,ay
        if distance<.035:continue
        distance=0.
        cyl(glass,(ax+(bx-ax)*.062,ay+(by-ay)*.062),.949+brow(index),.005,.119,8)
        if brow(index)>.03:
            cyl(glass,(ax+(bx-ax)*.961,ay+(by-ay)*.961),.951+brow(index),.006,.118,8)
    end=1.95 if vip else 2.13
    end_lens(end,(.12135 if front else .12635),add_surface,nickel,glass)
    if vip:end_lens(end,2.42665,add_surface,nickel,glass)
    if front:end_lens(1.92,2.46965,add_surface,nickel,glass)
    build_backrest(vip,front,add_upholstery)
    if front:
        # Grade the carcass, edge trim and leather as one cut, maintaining every
        # mating edge. Keep the tabletop, lamp, drink heights and foot unscaled.
        spec=contact_spec['foyer']
        for i,(x,y,h) in enumerate(vertices):
            if i < table_start or i >= table_end:
                vertices[i]=(x*spec['depthFactor'],1.30+(y-1.30)*spec['widthFactor'],h)
    mesh=bpy.data.meshes.new('Afterimage '+kind+' Booth')
    mesh.from_pydata(vertices,[],faces)
    for m in mats:mesh.materials.append(m)
    mesh.update();uv=mesh.uv_layers.new()
    for f,index in zip(mesh.polygons,face_mats):
        f.material_index=index
        if f.index in upholstery_faces:
            coords,f.use_smooth=upholstery_faces[f.index]
            for li,coord in zip(f.loop_indices,coords):uv.data[li].uv=coord
            continue
        axis=max(range(3),key=lambda j:abs(f.normal[j]))
        axes=[(1,2),(0,2),(0,1)][axis]
        for li in f.loop_indices:
            co=mesh.vertices[mesh.loops[li].vertex_index].co
            if index==mats.index(glass) and axis in (0,1):
                u=co[axes[0]]/(2.50 if axis==0 else 1.92)
                v=(co.z-1.04)/.30 if co.z>1.032 and axis==0 else (co.z-.145)/.85
                uv.data[li].uv=(u,v)
            else:uv.data[li].uv=(co[axes[0]]*2.6,co[axes[1]]*2.6)
    obj=bpy.data.objects.new(mesh.name,mesh);scene.collection.objects.link(obj)
    # Layout only in donor Blender file. Engine adopts the mesh itself at existing D189 roots.
    obj.location.x={'Foyer':0,'Hall':3.2,'VIP':6.4}[kind]
for k in ['Foyer','Hall','VIP']:build(k)
bpy.context.preferences.filepaths.save_version=0
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(src/'D189-Afterimage-Booths.blend'))
bpy.ops.export_scene.gltf(filepath=str(root/'assets'/'D189-Afterimage-Booths.glb'),export_tangents=True,export_yup=True)
import runpy
runpy.run_path(str(src/'bake_table_light.py'))['bake'](root/'assets'/'D189-Afterimage-Booths.glb')
