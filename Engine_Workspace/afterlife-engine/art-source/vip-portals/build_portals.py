"""Fabricated door liners for the four existing open gallery doors. Engine coordinates in metres."""
from pathlib import Path
import math
import bpy

root = Path(__file__).resolve().parents[2]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.scene.unit_settings.system = 'METRIC'

def surface(name, colour, metal, rough, emission=0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    p = mat.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*colour, 1)
    p.inputs['Metallic'].default_value = metal
    p.inputs['Roughness'].default_value = rough
    if emission:
        p.inputs['Emission Color'].default_value = (*colour,1)
        p.inputs['Emission Strength'].default_value = emission
    return mat

def textured(name, family):
    mat = surface(name,(.2,.2,.2),.5,.42)
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    p = nodes.get('Principled BSDF')
    for kind in ('color','normal','orm'):
        tex = nodes.new('ShaderNodeTexImage')
        tex.image = bpy.data.images.load(str(root/'art-source'/'rear-finishes'/'maps'/f'{family}-{kind}.png'),check_existing=True)
        if kind == 'color':
            links.new(tex.outputs['Color'],p.inputs['Base Color'])
        else:
            tex.image.colorspace_settings.name = 'Non-Color'
            if kind == 'normal':
                n=nodes.new('ShaderNodeNormalMap')
                links.new(tex.outputs['Color'],n.inputs['Color'])
                links.new(n.outputs[0],p.inputs['Normal'])
            else:
                n=nodes.new('ShaderNodeSeparateColor')
                links.new(tex.outputs['Color'],n.inputs[0])
                links.new(n.outputs['Green'],p.inputs['Roughness'])
                links.new(n.outputs['Blue'],p.inputs['Metallic'])
    return mat

frames=textured('M11 graphite cassette','graphite')
brass=textured('Brushed champagne frame','champagne')
garnet=textured('Garnet glaze','garnet')
opal=surface('VIP honey diffuser',(1,.53,.21),.04,.32,1.75)
joint=surface('Gasket',(.016,.012,.014),.12,.76)
groups={}
def face(group,mat,points):
    verts,faces=groups.setdefault((group,mat),([],[]))
    faces.append(tuple(range(len(verts),len(verts)+len(points))))
    verts.extend((x,-z,h) for x,h,z in points)

def block(group,mat,x,y,z,w,h,d):
    cube=[(x+i*w/2,y+j*h/2,z+k*d/2) for j in (-1,1) for k in (-1,1) for i in (-1,1)]
    for indices in ((0,1,3,2),(4,6,7,5),(0,4,5,1),(2,3,7,6),(0,2,6,4),(1,5,7,3)):
        face(group,mat,[cube[i] for i in indices])

def screen(side,z):
    # Eight-sided holes and their back walls, with an actual diffuser behind them.
    pitch=.034
    for row in range(5):
        for col in range(40):
            yc=6.006+(row+.5)*pitch
            zc=z+(col-19.5)*pitch
            outline=[];ring=[];back=[]
            for i in range(8):
                a=math.pi*i/4
                dy,dz=math.sin(a),math.cos(a)
                s=pitch*.5/max(abs(dy),abs(dz))
                outline.append((side*10.385,yc+dy*s,zc+dz*s))
                ring.append((side*10.385,yc+dy*.011,zc+dz*.011))
                back.append((side*10.389,yc+dy*.011,zc+dz*.011))
            for a in range(8):
                b=(a+1)%8
                for pts in ([outline[a],outline[b],ring[b],ring[a]], [ring[a],ring[b],back[b],back[a]]):
                    face('Perforated bronze lintels',brass,pts if side>0 else list(reversed(pts)))
for side in (-1,1):
    for z in (-24.30,-34.50):
        for hand in (-1,1):
            edge=z+hand*.605
            block('Door lining',frames,side*10.45,4.80,edge,.09,2.30,.107)
            block('Jamb bead',brass,side*10.397,4.8,edge+hand*.045,.012,2.30,.012)
            block('Jamb skirting',joint,side*10.41,3.94,z+hand*.81,.06,.56,.28)
            for row in range(5):
                block('Glazed skirting courses',garnet,side*10.374,3.70+row*.115,z+hand*.81,.016,.109,.274)
        block('Header returns',frames,side*10.45,6.09,z,.11,.28,1.42)
        block('Header diffuser',opal,side*10.397,6.091,z,.006,.182,1.364)
        screen(side,z)
        # A second, room-facing fixture makes the door readable on the way out.
        block('Inside door head',frames,side*10.635,6.03,z,.05,.145,1.30)
        block('Inside door lens',opal,side*10.665,6.02,z,.012,.028,1.18)

for (name,mat),(verts,faces) in groups.items():
    mesh=bpy.data.meshes.new(name)
    mesh.from_pydata(verts,[],faces);mesh.update()
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj)
    mesh.materials.append(mat)
    uv=mesh.uv_layers.new()
    for poly in mesh.polygons:
        axis=max(range(3),key=lambda i:abs(poly.normal[i]))
        u,v=[i for i in range(3) if i!=axis]
        for loop in poly.loop_indices:
            co=mesh.vertices[mesh.loops[loop].vertex_index].co
            uv.data[loop].uv=(co[u],co[v])
bpy.context.preferences.filepaths.save_version=0
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(Path(__file__).with_name('D189-VIP-Portals.blend')))
bpy.ops.export_scene.gltf(filepath=str(root/'assets'/'D189-VIP-Portals.glb'),export_apply=True,export_tangents=True)
