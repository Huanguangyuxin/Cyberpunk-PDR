"""Isolated Blender production: cafe chair and suspended pan/tilt light parts, metres."""
import bpy,math,json,hashlib
from pathlib import Path
from mathutils import Vector,Matrix
P=Path(__file__).resolve().parents[3];D=P/'Codex_FX_016';S=D/'source/d051';E=D/'exports/d051';L=D/'logs/d051'
for p in (S,E,L):p.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
sc=bpy.context.scene;sc.unit_settings.system='METRIC';sc.unit_settings.scale_length=1
def mat(name,color,metal,rough):
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough;return m
vinyl=mat('D051_OXBLOOD_VINYL',(.12,.018,.037),0,.40);steel=mat('D051_PAINTED_STEEL',(.025,.031,.039),.8,.32);edge=mat('D051_EXPOSED_STEEL',(.29,.33,.37),1,.23);rubber=mat('D051_RUBBER',(.012,.015,.02),0,.78);plastic=mat('D051_HEAD_ABS',(.019,.024,.032),0,.34);lens=mat('D051_OPTICAL_APERTURE',(.12,.20,.35),0,.08)
p=lens.node_tree.nodes.get('Principled BSDF');p.inputs['Emission Color'].default_value=(.2,.30,.60,1);p.inputs['Emission Strength'].default_value=1.5
parts=[]
def finish(o,m):
 o.data.materials.append(m);parts.append(o);return o
def box(loc,dim,m,bev=.008):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.dimensions=dim;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bev:
  q=o.modifiers.new('Fabricated edge radius','BEVEL');q.width=bev;q.segments=2;bpy.ops.object.modifier_apply(modifier=q.name)
 return finish(o,m)
def tube(a,b,r,m,n=12):
 a,b=Vector(a),Vector(b);v=b-a;bpy.ops.mesh.primitive_cylinder_add(vertices=n,radius=r,depth=v.length,location=(a+b)/2);o=bpy.context.object;o.rotation_mode='QUATERNION';o.rotation_quaternion=Vector((0,0,1)).rotation_difference(v);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 for f in o.data.polygons:f.use_smooth=len(f.vertices)==4
 return finish(o,m)
def join(name):
 bpy.ops.object.select_all(action='DESELECT')
 for o in parts:o.select_set(True)
 bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();o=bpy.context.object;o.name=name;o.data.name=name
 sc.cursor.location=(0,0,0);bpy.ops.object.origin_set(type='ORIGIN_CURSOR');bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(island_margin=.018);bpy.ops.object.mode_set(mode='OBJECT');parts.clear();return o
# Local forward is Blender -Y / Engine -Z. Seat top .46m, real front clearance.
box((0,0,.429),(.47,.465,.062),vinyl,.027)
box((0,.208,.68),(.455,.064,.29),vinyl,.024)
for x in (-.177,.177):
 for y in (-.17,.17):
  tube((x*1.15,y*1.18,.023),(x,y,.414),.013,steel)
  box((x*1.15,y*1.18,.012),(.039,.042,.024),rubber,.005)
 tube((x,-.19,.398),(x,.19,.398),.011,steel)
 tube((x,.18,.405),(x,.235,.833),.011,steel)
tube((-.19,.14,.19),(.19,.14,.19),.008,steel)
for z in (.572,.79):tube((-.213,.246,z),(.213,.246,z),.007,edge)
# Real piping and stitched ribs, not a single uneditable textural line.
for x in (-.208,.208):tube((x,-.19,.456),(x,.18,.456),.0028,vinyl,8)
for x in (-.145,-.072,0,.072,.145):
 tube((x,.172,.575),(x,.172,.783),.0012,edge,6)
for x in (-.175,.175):
 for z in (.56,.80):tube((x,.245,z),(x,.251,z),.0045,edge,10)
chair=join('D051_CAFE_CHAIR')
# Clamp/base rises .64m above optical pivot, sits on existing stage truss.
box((0,0,.42),(.34,.25,.13),plastic,.02)
box((0,0,.515),(.28,.20,.055),steel,.008)
for x in (-.1,.1):
 tube((x,0,.54),(x,0,.635),.014,edge)
 box((x,0,.63),(.07,.10,.025),steel,.006)
for i in range(6):box((-.125+i*.05,-.132,.42),(.021,.009,.067),rubber,.002)
mount=join('D051_LIGHT_MOUNT')
# U-yoke rotates about vertical optical pivot; head tilts inside it.
box((0,0,.285),(.37,.12,.06),steel,.012)
for x in (-.19,.19):
 box((x,0,.15),(.055,.10,.30),plastic,.012)
 tube((x-.025,0,0),(x+.025,0,0),.037,edge,20)
yoke=join('D051_LIGHT_YOKE')
box((0,.02,0),(.29,.34,.29),plastic,.03)
for x in (-.147,.147):
 for z in (-.085,-.045,0,.045,.085):box((x,.078,z),(.008,.16,.018),rubber,.002)
tube((0,-.157,0),(0,-.188,0),.113,steel,32)
tube((0,-.189,0),(0,-.197,0),.093,lens,48)
for a in range(6):
 t=a*math.tau/6;x=.104*math.cos(t);z=.104*math.sin(t);tube((x,-.186,z),(x,-.192,z),.0035,edge,8)
head=join('D051_LIGHT_HEAD')
objects=[chair,mount,yoke,head]
# Blender glTF maps (X,Y,Z) -> (X,Z,-Y). Turn these authored -Y fronts
# to +Y before export so the actual Engine forward is -Z.
for o in (chair,head):o.data.transform(Matrix.Rotation(math.pi,4,'Z'));o.data.update()
receipt={'producer':'Codex isolated Blender CLI, no AI concept image','blender':bpy.app.version_string,'unit':'metres; Blender Z-up to glTF Y-up; chair forward -Y -> -Z','objects':[]}
for o in objects:
 o.data.calc_loop_triangles();receipt['objects'].append({'name':o.name,'vertices':len(o.data.vertices),'triangles':len(o.data.loop_triangles),'dimensions':list(o.dimensions),'material_slots':[m.name for m in o.data.materials]})
bpy.ops.object.select_all(action='DESELECT')
for o in objects:o.select_set(True)
glb=E/'chair-and-moving-head.glb';bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_tangents=True,export_materials='EXPORT',export_extras=True)
blend=S/'chair-and-moving-head.blend';bpy.ops.wm.save_as_mainfile(filepath=str(blend))
receipt.update(blend=str(blend),blend_sha256=hashlib.sha256(blend.read_bytes()).hexdigest(),glb=str(glb),glb_sha256=hashlib.sha256(glb.read_bytes()).hexdigest());(L/'dcc-receipt.json').write_text(json.dumps(receipt,indent=2));print('D051_DCC_OK',json.dumps(receipt))
