"""Turn the original ForgeAX SVG paths into the stage plaque."""
from collections import Counter
from hashlib import sha256
import json
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector
from mathutils.geometry import delaunay_2d_cdt, interpolate_bezier

root = Path(__file__).resolve().parents[1]
svg = root / 'design/forgeax-official.svg'
digest = sha256(svg.read_bytes()).hexdigest()
assert digest == '929a23b030f7a07e717292c8b896df7af51f2041e5de2326f5fe30b2f1f74601'

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.preferences.addon_enable(module='io_curve_svg')
bpy.ops.import_curve.svg(filepath=str(svg))
curves = [obj for obj in bpy.context.scene.objects if obj.type == 'CURVE']
assert len(curves) == 1 and len(curves[0].data.splines) == 15
curve = curves[0]
width = 2.76
height = width * 313.539 / 323

def srgb_to_linear(value):
    value /= 255
    return value / 12.92 if value <= .04045 else ((value + .055) / 1.055) ** 2.4

orange = tuple(srgb_to_linear(value) for value in (232, 105, 44))

def material(name, color, roughness, metalness, emission=0):
    result = bpy.data.materials.new(name)
    result.diffuse_color = (*color, 1)
    result.use_backface_culling = True
    node = result.node_tree.nodes['Principled BSDF']
    node.inputs['Base Color'].default_value = (*color, 1)
    node.inputs['Roughness'].default_value = roughness
    node.inputs['Metallic'].default_value = metalness
    if emission:
        node.inputs['Emission Color'].default_value = (*color, 1)
        node.inputs['Emission Strength'].default_value = emission
    return result

lit = material('D077_Official_ForgeAX_E8692C', orange, .39, 0, 1.85)
black = material('D077_Logo_Negative_Space', (.014,.017,.019), .66, .08)
metal = material('D077_Logo_Anodized_Frame', (.055,.060,.064), .33, .73)

origin = bpy.data.objects.new('PDR_Official_ForgeAX_Root', None)
bpy.context.scene.collection.objects.link(origin)
origin.location = (0, 43.51, 3.36)
origin['originalSvgSha256'] = digest
origin['originalHex'] = '#E8692C'
origin['source'] = 'https://forgeax.github.io/logo.svg?v=7'

def sample_loop(spline):
    anchors = list(spline.bezier_points)
    vertices = []
    for a,b in zip(anchors, anchors[1:] + anchors[:1]):
        chord = b.co - a.co
        if chord.length < 1e-10:
            continue
        curvature = max(chord.cross(a.handle_right-a.co).length,
                        chord.cross(b.handle_left-a.co).length) / chord.length
        if curvature < 1e-8:
            vertices.append(a.co.to_2d())
        else:
            vertices.extend(p.to_2d() for p in interpolate_bezier(a.co, a.handle_right, b.handle_left, b.co, 32)[:-1])
    return vertices

loops = [sample_loop(spline) for spline in curve.data.splines]
all_points = [v for loop in loops for v in loop]
min_x, max_x = min(v.x for v in all_points), max(v.x for v in all_points)
min_y, max_y = min(v.y for v in all_points), max(v.y for v in all_points)
scale_x, scale_y = width/(max_x-min_x), height/(max_y-min_y)
assert abs((max_y-min_y)*scale_x-height) < .001
loops = [[Vector(((v.x-(min_x+max_x)/2)*scale_x,(v.y-(min_y+max_y)/2)*scale_y))
          for v in loop] for loop in loops]
bpy.data.objects.remove(curve, do_unlink=True)

def inside(point, loop):
    x,y = point
    hit = False
    for a,b in zip(loop, loop[1:] + loop[:1]):
        if (a.y > y) != (b.y > y) and x < a.x + (b.x-a.x)*(y-a.y)/(b.y-a.y):
            hit = not hit
    return hit

# Split on every official outline edge before selecting the fill. The outer
# rectangle is the first spline and all later splines are actual logo openings.
points, edges = [], []
for loop in loops:
    start = len(points)
    points.extend(loop)
    edges.extend((start+i,start+(i+1)%len(loop)) for i in range(len(loop)))
points, _, faces, *_ = delaunay_2d_cdt(points,edges,[],0,1e-6)
caps = []
for a,b,c in faces:
    middle = (points[a]+points[b]+points[c])/3
    if not inside(middle,loops[0]) or any(inside(middle,hole) for hole in loops[1:]):
        continue
    area = (points[b]-points[a]).cross(points[c]-points[a])
    assert abs(area)>1e-10
    caps.append((a,b,c) if area>0 else (a,c,b))
boundary = Counter(tuple(sorted(edge)) for a,b,c in caps for edge in ((a,b),(b,c),(c,a)))
assert sum(count == 1 for count in boundary.values()) == len(edges)
back = len(points)
faces = []
for a,b,c in caps:
    faces.extend(((a,b,c),(c+back,b+back,a+back)))
    for i,j in ((a,b),(b,c),(c,a)):
        if boundary[tuple(sorted((i,j)))] == 1:
            faces.append((j,i,i+back,j+back))
mesh = bpy.data.meshes.new('PDR_Official_ForgeAX_Orange_Face')
mesh.from_pydata([(x,y,z) for y in (-.016,.016) for x,z in points], [], faces)
mesh.update()
mesh.materials.append(lit)
logo = bpy.data.objects.new(mesh.name, mesh)
bpy.context.scene.collection.objects.link(logo)
logo.parent = origin

def finish_mesh(mesh):
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bmesh.ops.triangulate(bm, faces=list(bm.faces))
    assert all(edge.is_manifold for edge in bm.edges), mesh.name
    volume = bm.calc_volume(signed=True)
    assert volume > 0, (mesh.name, volume)
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()
    uv = mesh.uv_layers.get('UVMap') or mesh.uv_layers.new(name='UVMap')
    for face in mesh.polygons:
        axis = max(range(3), key=lambda a: abs(face.normal[a]))
        for i in face.loop_indices:
            co = mesh.vertices[mesh.loops[i].vertex_index].co
            uv.data[i].uv = tuple(value for a,value in enumerate(co) if a != axis)
    return volume

face_volume = finish_mesh(mesh)

def box(name, center, size, mat, bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1)
    obj = bpy.context.object
    obj.name = name
    obj.parent = origin
    obj.location = center
    for vertex in obj.data.vertices:
        vertex.co = tuple(c * extent for c,extent in zip(vertex.co,size))
    obj.data.materials.append(mat)
    if bevel:
        mod = obj.modifiers.new('Manufactured edge', 'BEVEL')
        mod.width = bevel
        mod.segments = 3
        bpy.ops.object.modifier_apply(modifier=mod.name)
    finish_mesh(obj.data)

box('PDR_Official_ForgeAX_Dark_Optical_Backing', (0,.028,0), (width+.010,.022,height+.010), black, .003)
box('PDR_Official_ForgeAX_Enclosure', (0,.089,0), (width+.052,.103,height+.052), metal, .018)
for i, x in enumerate((-.76,.76)):
    box(f'PDR_Official_ForgeAX_Wall_Mount_{i+1}', (x,.276,0), (.072,.295,1.96), metal, .009)

bpy.context.scene.unit_settings.system = 'METRIC'
bpy.context.scene.unit_settings.scale_length = 1
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.object.select_all(action='SELECT')
bpy.context.view_layer.objects.active = origin
blend = root / 'source/PDR_FORGEAX_OFFICIAL_D077.blend'
out = root / 'exports/PDR_FORGEAX_OFFICIAL_D077.glb'
bpy.ops.wm.save_as_mainfile(filepath=str(blend), compress=True)
bpy.ops.export_scene.gltf(filepath=str(out), export_format='GLB', use_selection=True,
                         export_yup=True, export_normals=True, export_tangents=True,
                         export_texcoords=True, export_cameras=False, export_lights=False,
                         export_animations=False, export_extras=True)
(root / 'logs/export.json').write_text(json.dumps({
    'svgSha256': digest, 'glbSha256': sha256(out.read_bytes()).hexdigest(),
    'widthM': width, 'heightM': height, 'faceThicknessM': .032, 'logoFaceSignedVolumeM3': face_volume,
    'nativeLightsAdded': 0, 'baseColorSrgb': '#E8692C', 'baseColorLinear': orange,
}, indent=2) + '\n')
