"""Revolve actual source glass profiles, adding sub-mm manufactured edge radii."""
import bpy,math,json,hashlib
from pathlib import Path
from mathutils import Vector
P=Path(__file__).resolve().parents[3];D=P/'Codex_FX_016';data=json.loads((D/'source/d052/glass-input.json').read_text());bpy.ops.wm.read_factory_settings(use_empty=True)
sc=bpy.context.scene;sc.unit_settings.system='METRIC';sc.unit_settings.scale_length=1
m=bpy.data.materials.new('D052_CLEAR_PHYSICAL_GLASS');m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(1,1,1,1);p.inputs['Metallic'].default_value=0;p.inputs['Roughness'].default_value=.025;p.inputs['IOR'].default_value=1.5;p.inputs['Transmission Weight'].default_value=1
receipt={'producer':'Codex isolated Blender5.2 CLI; no image generation','source_glb':data['source'],'profile_source':'actual mesh triangle-ring adjacency, not an invented new bottle size','units':'metres, Z-up source exported glTF Y-up','radial_segments':128,'edge_round_max_m':.00045,'models':[]}
for k,row in enumerate(data['glasses']):
 original=[Vector(p)for p in row['orderedProfile']];profile=[original[0]]
 for i in range(1,len(original)-1):
  a,b,c=original[i-1:i+2];u=a-b;v=c-b
  if u.length<1e-9 or v.length<1e-9:continue
  trim=min(.00045,u.length*.22,v.length*.22)
  if abs(u.normalized().dot(v.normalized()))>.9999:profile.append(b);continue
  before=b+u.normalized()*trim;after=b+v.normalized()*trim
  # Quadratic rounding stays in the original manufacturing envelope.
  for t in (0,.25,.5,.75,1):profile.append((1-t)**2*before+2*(1-t)*t*b+t*t*after)
 profile.append(original[-1]);verts=[];rings=[];arc=[0.0]
 for a,b in zip(profile,profile[1:]):arc.append(arc[-1]+(a-b).length)
 for y,r in profile:
  if r<1e-8:rings.append([len(verts)]);verts.append((0,0,y))
  else:
   ring=[]
   for j in range(128):
    t=j*math.tau/128;ring.append(len(verts));verts.append((r*math.cos(t),r*math.sin(t),y))
   rings.append(ring)
 faces=[];face_uv=[]
 for i,(a,b)in enumerate(zip(rings,rings[1:])):
  for j in range(128):
   j2=(j+1)%128;aa=a[j]if len(a)>1 else a[0];ab=a[j2]if len(a)>1 else a[0];bb=b[j2]if len(b)>1 else b[0];ba=b[j]if len(b)>1 else b[0]
   ids=[aa,ab,bb,ba];uv=[(j/128,arc[i]/arc[-1]),((j+1)/128,arc[i]/arc[-1]),((j+1)/128,arc[i+1]/arc[-1]),(j/128,arc[i+1]/arc[-1])];idx=[n for n in range(4)if n==0 or ids[n]!=ids[n-1]]
   if ids[idx[-1]]==ids[idx[0]]:idx.pop()
   if len(idx)>=3:faces.append([ids[n]for n in idx]);face_uv.append([uv[n]for n in idx])
 mesh=bpy.data.meshes.new('D052_GLASS_'+row['type']);mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(mesh.name,mesh);sc.collection.objects.link(o);mesh.materials.append(m);layer=mesh.uv_layers.new(name='UVMap')
 for poly,uv in zip(mesh.polygons,face_uv):
  poly.use_smooth=True
  for li,value in zip(poly.loop_indices,uv):layer.data[li].uv=value
 o.location=(k*.14,0,0);o['source_profile']=row['name'];o['library_offset_only']=True;mesh.calc_loop_triangles()
 receipt['models'].append({'name':o.name,'vertices':len(mesh.vertices),'triangles':len(mesh.loop_triangles),'dimensions':list(o.dimensions),'original_profile_points':len(original),'rounded_profile_points':len(profile)})
out=D/'exports/d052';out.mkdir(parents=True,exist_ok=True);glb=out/'hero-glass.glb';bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',export_yup=True,export_apply=True,export_tangents=True)
source=D/'source/d052/hero-glass.blend';bpy.ops.wm.save_as_mainfile(filepath=str(source));receipt.update(blend=str(source),blend_sha256=hashlib.sha256(source.read_bytes()).hexdigest(),glb=str(glb),glb_sha256=hashlib.sha256(glb.read_bytes()).hexdigest())
logs=D/'logs/d052';logs.mkdir(parents=True,exist_ok=True);(logs/'dcc-receipt.json').write_text(json.dumps(receipt,indent=2));print('D052_GLASS_OK',json.dumps(receipt))
