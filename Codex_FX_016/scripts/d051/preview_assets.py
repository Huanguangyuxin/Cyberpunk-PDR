"""Actual DCC product view; never labelled as Engine scene output."""
import bpy,json,math,hashlib
from pathlib import Path
from mathutils import Vector
P=Path(__file__).resolve().parents[3];D=P/'Codex_FX_016';source=D/'source/d051/chair-and-moving-head.blend';bpy.ops.wm.open_mainfile(filepath=str(source));sc=bpy.context.scene
for o in sc.objects:
 if o.name.startswith('D051_'):o.location=(-.62,0,0) if o.name=='D051_CAFE_CHAIR' else (.55,0,.40)
sc['asset_library_only']='Display offsets separate chair and lamp. Exported meshes are local; actual venue placement belongs to Engine source. Not a complete club scene.'
bpy.ops.wm.save_as_mainfile(filepath=str(source))
p=D/'logs/d051/dcc-receipt.json';r=json.loads(p.read_text());r['blend_sha256']=hashlib.sha256(source.read_bytes()).hexdigest();r['display_layout']='Chair and assembled fixture separated for editing; GLB local mesh geometry unchanged';p.write_text(json.dumps(r,indent=2))
# Presentation-only studio, not included in the exported GLB/source mesh roster.
bpy.ops.mesh.primitive_plane_add(size=200);floor=bpy.context.object;floor.name='DCC_PREVIEW_FLOOR';m=bpy.data.materials.new('Preview neutral');m.diffuse_color=(.055,.062,.075,1);floor.data.materials.append(m)
for pos,color,power,size in [((1,-2,3),(1,.8,.9),400,3),((-2,-.5,2),(.5,.65,1),250,2),((0,2,2),(1,.22,.45),180,2)]:
 l=bpy.data.lights.new('DCC product softbox','AREA');l.energy=power;l.shape='DISK';l.size=size;l.color=color;o=bpy.data.objects.new(l.name,l);sc.collection.objects.link(o);o.location=pos;o.rotation_euler=(Vector((0,0,.6))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(2.2,-3.2,2));cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,.65))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=2.3;sc.camera=cam
sc.render.engine='CYCLES';sc.cycles.samples=32;sc.cycles.use_denoising=True;sc.render.resolution_x=1280;sc.render.resolution_y=800;sc.render.resolution_percentage=100
if sc.world is None:sc.world=bpy.data.worlds.new('DCC studio world')
sc.world.color=(.08,.08,.08)
out=D/'renders/d051';out.mkdir(parents=True,exist_ok=True);sc.render.filepath=str(out/'D051-DCC-chair-and-fixture.png');bpy.ops.render.render(write_still=True)
print('D051_DCC_PREVIEW_OK',sc.render.filepath)
