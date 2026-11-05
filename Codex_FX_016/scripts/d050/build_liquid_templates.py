import bpy,json,math,hashlib
from pathlib import Path
P=Path(__file__).resolve().parents[2]
INPUT=P/'source/d050/liquid-input.json';OUT=P/'exports/d050/liquid-droplet-templates.glb';BLEND=P/'source/d050/liquid-droplet-templates.blend'
bpy.ops.wm.read_factory_settings(use_empty=True)
s=bpy.context.scene;s.unit_settings.system='METRIC';s.unit_settings.scale_length=1.0
j=json.loads(INPUT.read_text());rows=[]
for i,row in enumerate(j['templates']):
 verts=[(x,-z,y) for x,y,z in row['positions']];faces=[tuple(row['indices'][k:k+3]) for k in range(0,len(row['indices']),3)]
 mesh=bpy.data.meshes.new('D050_LIQ_'+row['type']);mesh.from_pydata(verts,[],faces);mesh.update()
 uv=mesh.uv_layers.new(name='UVMap')
 for poly in mesh.polygons:
  poly.use_smooth=True
  for li in poly.loop_indices:uv.data[li].uv=row['uv'][mesh.loops[li].vertex_index]
 ob=bpy.data.objects.new(mesh.name,mesh);bpy.context.collection.objects.link(ob);ob.location=(i*.16,0,0)
 bpy.context.view_layer.objects.active=ob;ob.select_set(True)
 # Linear subdivision adds real surface samples, preserving the authored closed boundary.
 mod=ob.modifiers.new('D050_LINEAR_SURFACE_DETAIL','SUBSURF');mod.subdivision_type='SIMPLE';mod.levels=1;mod.render_levels=1;bpy.ops.object.modifier_apply(modifier=mod.name)
 mat=bpy.data.materials.new('D050_SOURCE_'+row['type']);mat.use_nodes=True
 src=row['material'];pbr=src['pbrMetallicRoughness'];ext=src['extensions'];c=pbr.get('baseColorFactor',[1,1,1,1]);mat.diffuse_color=c
 bsdf=mat.node_tree.nodes.get('Principled BSDF');bsdf.inputs['Base Color'].default_value=c;bsdf.inputs['Metallic'].default_value=0;bsdf.inputs['Roughness'].default_value=.018;bsdf.inputs['IOR'].default_value=ext.get('KHR_materials_ior',{}).get('ior',1.34);bsdf.inputs['Transmission Weight'].default_value=1
 ob.data.materials.append(mat);ob['source_object']=row['source_name'];ob['runtime_rule']='Use local mesh only; scene row offset is author preview layout, never a venue transform';ob['units']='1 Blender unit = 1 metre'
 rows.append({'type':row['type'],'name':ob.name,'vertices':len(ob.data.vertices),'triangles':sum(len(p.vertices)-2 for p in ob.data.polygons),'source_vertices':len(row['positions']),'max_z':max(v.co.z for v in ob.data.vertices)})
 ob.select_set(False)
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=.0012,location=(.88,0,.14));drop=bpy.context.object;drop.name='D050_WATER_DROP';drop.data.name='D050_WATER_DROP'
for poly in drop.data.polygons:poly.use_smooth=True
drop['diameter_m']=.0024;drop['runtime_rule']='Normalize physical1.2mm-radius template then resize in metres by the authored droplet radius'
mat=bpy.data.materials.new('D050_WATER');mat.use_nodes=True;bsdf=mat.node_tree.nodes.get('Principled BSDF');bsdf.inputs['Base Color'].default_value=(.98,.995,1,1);bsdf.inputs['Metallic'].default_value=0;bsdf.inputs['Roughness'].default_value=.012;bsdf.inputs['IOR'].default_value=1.333;bsdf.inputs['Transmission Weight'].default_value=1;drop.data.materials.append(mat)
for ob in bpy.context.scene.objects:ob.select_set(ob.type=='MESH')
bpy.ops.wm.save_as_mainfile(filepath=str(BLEND),compress=True)
bpy.ops.export_scene.gltf(filepath=str(OUT),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_normals=True,export_tangents=True,export_materials='EXPORT')
r={'blender':bpy.app.version_string,'producer':'Codex isolated Blender CLI, not WorkBuddy or Gemini','source_glb':j['source_glb'],'source_sha256':hashlib.sha256(Path(j['source_glb']).read_bytes()).hexdigest(),'blend':str(BLEND),'blend_sha256':hashlib.sha256(BLEND.read_bytes()).hexdigest(),'glb':str(OUT),'glb_sha256':hashlib.sha256(OUT.read_bytes()).hexdigest(),'templates':rows,'drop_vertices':len(drop.data.vertices),'classification':'Editable closed subdivided liquid volumes and true3D droplet template; no baked fluid simulation'}
(P/'logs/d050/dcc-receipt.json').write_text(json.dumps(r,indent=2));print('D050_DCC_DONE',json.dumps(r))
