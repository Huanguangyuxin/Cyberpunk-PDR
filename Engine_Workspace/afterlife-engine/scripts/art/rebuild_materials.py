"""Blender-authored material light study; textures are deterministic author assets."""
import bpy,math,json,random
import numpy as np
from pathlib import Path
from mathutils import Vector
GAME=Path(__file__).resolve().parents[2]
OUT=GAME.parents[1]
SRC=OUT/'Afterlife_Private_Rooms.blend'
TEX=GAME/'art-source/material-textures';TEX.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(SRC));s=bpy.context.scene
random.seed(712);rng=np.random.default_rng(712);N=512
v,u=np.mgrid[0:N,0:N].astype(np.float32)/N

def noise(cells):
 a=rng.random((cells,cells)).astype(np.float32)
 xx=u*cells;yy=v*cells;x=np.floor(xx).astype(int);y=np.floor(yy).astype(int);fx=xx-x;fy=yy-y
 fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy)
 return a[y%cells,x%cells]*(1-fx)*(1-fy)+a[y%cells,(x+1)%cells]*fx*(1-fy)+a[(y+1)%cells,x%cells]*(1-fx)*fy+a[(y+1)%cells,(x+1)%cells]*fx*fy
coarse=noise(6);mid=noise(32);fine=noise(128);speck=rng.random((N,N)).astype(np.float32)

def image(name,a):
 if a.ndim==2:a=np.repeat(a[:,:,None],3,axis=2)
 data=np.ones((N,N,4),np.float32);data[:,:,:3]=np.clip(a,0,1)
 im=bpy.data.images.new('Study / '+name,width=N,height=N,alpha=False)
 im.colorspace_settings.name='Non-Color';im.pixels.foreach_set(data.ravel());im.filepath_raw=str(TEX/(name+'.png'));im.file_format='PNG';im.save();im.pack();return im

def pbr(m,kind):
 m.use_nodes=True;nodes=m.node_tree.nodes;links=m.node_tree.links
 p=nodes.get('Principled BSDF');p.inputs['Metallic'].default_value=0
 if kind=='metal':
  grain=noise(128)*.35+np.broadcast_to(rng.random((N,1)),(N,N))*.65
  scar=(np.sin(v*math.tau*120+coarse*3)>.96).astype(float)
  h=grain*.12-scar*.16;base=np.stack([.42+grain*.12,.44+grain*.12,.46+grain*.12],2)
  rough=.22+grain*.18+scar*.16;p.inputs['Metallic'].default_value=.92
 elif kind=='enamel':
  chips=np.clip((coarse*.6+mid*.4-.64)*12,0,1);h=mid*.13+chips*.18
  base=np.stack([.11+chips*.24,.17+chips*.11,.17+chips*.04],2);rough=.28+chips*.5+fine*.1;p.inputs['Metallic'].default_value=.65
 elif kind=='leather':
  crease=np.exp(-np.abs(np.sin((u*9+np.sin(v*16)*.22)*math.pi))*35)+np.exp(-np.abs(np.sin((v*11+coarse*.24)*math.pi))*30)
  h=fine*.32+mid*.14-crease*.5;base=np.stack([.26+coarse*.09+fine*.035,.065+coarse*.025,.045+coarse*.02],2)*(1-crease[:,:,None]*.14)
  rough=.43+mid*.22-crease*.06;p.inputs['Sheen Weight'].default_value=.18
 elif kind=='concrete':
  pores=np.clip((speck-.93)*14,0,1);h=mid*.5+fine*.3-pores*.22
  damp=np.clip((coarse-.6)*3,0,1);b=.34+coarse*.15+fine*.04-damp*.09-pores*.055
  base=np.stack([b,b*.96,b*.86],2);rough=.82+fine*.13-damp*.22
 else:
  cracks=np.exp(-np.abs(np.sin((u*3+np.sin(v*5)*.2)*math.pi))*90)
  h=mid*.13+fine*.08-cracks*.15
  b=.21+coarse*.1+fine*.025-cracks*.055;base=np.stack([b*.92,b,b*1.02],2);rough=.58+mid*.2
 maps={ 'Base':image(kind+'-base',base),'Rough':image(kind+'-rough',rough)}
 dx=(np.roll(h,-1,1)-np.roll(h,1,1))*2.2;dy=(np.roll(h,-1,0)-np.roll(h,1,0))*2.2
 normal=np.stack([-dx,-dy,np.ones_like(dx)],2);normal/=np.linalg.norm(normal,axis=2)[:,:,None]
 maps['Normal']=image(kind+'-normal',normal*.5+.5)
 for key,target in [('Base','Base Color'),('Rough','Roughness')]:
  tex=nodes.new('ShaderNodeTexImage');tex.image=maps[key];links.new(tex.outputs['Color'],p.inputs[target])
 tex=nodes.new('ShaderNodeTexImage');tex.image=maps['Normal'];normalNode=nodes.new('ShaderNodeNormalMap');normalNode.inputs['Strength'].default_value=.5
 links.new(tex.outputs['Color'],normalNode.inputs['Color']);links.new(normalNode.outputs['Normal'],p.inputs['Normal'])
 return m

families={'03 / brushed steel':'metal','01 / worn gunmetal':'enamel','02 / charcoal enamel':'enamel','04 / oxblood upholstery':'leather','Retrofit / old poured concrete':'concrete','Retrofit / faded petrol coating':'enamel','Retrofit / oxidized copper':'metal',**{'Floor panel '+str(i):'floor' for i in range(4)}}
# Reuse deterministic images between materials of the same family.
masters={}
for name,kind in families.items():
 m=bpy.data.materials.get(name)
 if not m:continue
 if kind not in masters:masters[kind]=pbr(m,kind)
 else:
  src=masters[kind]
  # Node-tree copying is performed by a material copy; update object slots below.
  copy=src.copy();copy.name=name+' / PBR';families[name]=(kind,copy)
for ob in list(s.objects):
 if ob.type not in {'MESH','CURVE','FONT'}:continue
 for slot in ob.material_slots:
  m=slot.material
  if m and isinstance(families.get(m.name),tuple):slot.material=families[m.name][1]
# World-size box projection makes grain scale consistent across furniture and walls.
textured={m.name for m in bpy.data.materials if m.use_nodes and any(n.type=='TEX_IMAGE' for n in m.node_tree.nodes)}
for ob in list(s.objects):
 if ob.type!='MESH' or not any(m and m.name in textured for m in ob.data.materials):continue
 ob.data=ob.data.copy();uv=ob.data.uv_layers.active or ob.data.uv_layers.new(name='Study UV')
 for poly in ob.data.polygons:
  normal=ob.matrix_world.to_3x3()@poly.normal;axis=max(range(3),key=lambda i:abs(normal[i]));axes=[i for i in range(3) if i!=axis]
  scale=.85 if any(m and 'upholstery' in m.name for m in ob.data.materials) else 1.8
  for li in poly.loop_indices:
   pos=ob.matrix_world@ob.data.vertices[ob.data.loops[li].vertex_index].co
   uv.data[li].uv=(pos[axes[0]]/scale,pos[axes[1]]/scale)
 for mod in ob.modifiers:
  if mod.type=='BEVEL':mod.segments=max(3,mod.segments)
# Glass remains tinted but no longer reads as opaque plastic.
for name in ['Bottle glass 0','Bottle glass 1','Bottle glass 2']:
 m=bpy.data.materials[name];p=m.node_tree.nodes.get('Principled BSDF')
 p.inputs['Transmission Weight'].default_value=.6;p.inputs['Roughness'].default_value=.11;p.inputs['IOR'].default_value=1.46;p.inputs['Metallic'].default_value=0
# Clear-coated thin wet film, with a tiny normal disturbance and irregular geometric edges.
water=bpy.data.materials.new('Study / shallow water film');water.use_nodes=True;p=water.node_tree.nodes.get('Principled BSDF')
p.inputs['Base Color'].default_value=(.035,.05,.046,1);p.inputs['Roughness'].default_value=.065;p.inputs['Metallic'].default_value=0;p.inputs['IOR'].default_value=1.333;p.inputs['Coat Weight'].default_value=1;p.inputs['Coat Roughness'].default_value=.05
# Small ripples, not an ocean normal map.
rip=np.sin(u*math.tau*5+np.sin(v*math.tau*3))*.0015+mid*.0015
normal=np.stack([-(np.roll(rip,-1,1)-np.roll(rip,1,1))*4,-(np.roll(rip,-1,0)-np.roll(rip,1,0))*4,np.ones_like(rip)],2);normal/=np.linalg.norm(normal,axis=2)[:,:,None]
im=image('water-normal',normal*.5+.5);tx=water.node_tree.nodes.new('ShaderNodeTexImage');tx.image=im;nm=water.node_tree.nodes.new('ShaderNodeNormalMap');water.node_tree.links.new(tx.outputs['Color'],nm.inputs['Color']);water.node_tree.links.new(nm.outputs['Normal'],p.inputs['Normal'])
for ob in list(s.objects):
 if ob.type=='MESH' and any(m and m.name=='Decay / oily pooled water / feathered' for m in ob.data.materials):bpy.data.objects.remove(ob,do_unlink=True)
puddles=[(-3.8,-6.9,1.7,.75),(1.1,-6.5,1.25,.65),(4.6,-7.0,1.15,.62),(6.0,-4.3,.9,.5),(-6.4,-3.2,.8,.45),(2.4,-9.0,.7,.35),(-20.7,-7.6,.75,.48)]
for k,(x,y,rx,ry) in enumerate(puddles):
 n=48;verts=[(x,y,.043)];radii=[]
 for i in range(n):
  a=math.tau*i/n;r=.88+.09*math.sin(a*3+k)+.06*math.cos(a*7-k)
  verts.append((x+rx*r*math.cos(a),y+ry*r*math.sin(a),.043))
 mesh=bpy.data.meshes.new('Shallow irregular puddle');mesh.from_pydata(verts,[],[(0,i+1,(i+1)%n+1) for i in range(n)]);mesh.materials.append(water)
 uv=mesh.uv_layers.new(name='Water UV')
 for face in mesh.polygons:
  for li in face.loop_indices:
   co=mesh.vertices[mesh.loops[li].vertex_index].co;uv.data[li].uv=((co.x-x)/(2*rx)+.5,(co.y-y)/(2*ry)+.5)
 ob=bpy.data.objects.new('Study / Puddle '+str(k),mesh);bpy.context.collection.objects.link(ob)
# Piping silhouettes and seam details on leather, and hex fastening on the counter.
seam=bpy.data.materials.new('Study / leather piping');seam.diffuse_color=(.18,.075,.045,1);seam.use_nodes=True;seam.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=seam.diffuse_color

def line(name,points,mat,radius=.007):
 cu=bpy.data.curves.new(name,'CURVE');cu.dimensions='3D';cu.bevel_depth=radius;cu.bevel_resolution=1;sp=cu.splines.new('POLY');sp.points.add(len(points)-1)
 for p,co in zip(sp.points,points):p.co=(*co,1)
 ob=bpy.data.objects.new(name,cu);bpy.context.collection.objects.link(ob);cu.materials.append(mat);return ob
leathers=[ob for ob in list(s.objects) if ob.type=='MESH' and any(m and 'upholstery' in m.name for m in ob.data.materials)]
for ob in leathers:
 bounds=[ob.matrix_world@Vector(p) for p in ob.bound_box];lo=[min(v[i] for v in bounds) for i in range(3)];hi=[max(v[i] for v in bounds) for i in range(3)]
 if 'Stool leather cushion' in ob.name:
  pts=[((lo[0]+hi[0])/2+(hi[0]-lo[0])*.46*math.cos(a),(lo[1]+hi[1])/2+(hi[1]-lo[1])*.46*math.sin(a),hi[2]-.035) for a in np.linspace(0,math.tau,49)]
  line('Study / stitched stool welt',pts,seam,.009)
 elif max(ob.dimensions)>1.3:
  # Thin surface channels break up the block silhouette and catch local light.
  longest=max(range(2),key=lambda i:hi[i]-lo[i]);cross=1-longest
  for t in np.arange(lo[longest]+.3,hi[longest]-.15,.45):
   p0=[0.,0.,hi[2]+.003];p1=p0.copy();p0[longest]=p1[longest]=t;p0[cross]=lo[cross]+.04;p1[cross]=hi[cross]-.04
   line('Study / cushion stitched channel',[p0,p1],seam,.005)
for ob in [o for o in list(s.objects) if o.name.startswith('Counter armor rib')][::2]:
 pos=ob.matrix_world.translation
 for z in [.4,1.03]:
  bpy.ops.mesh.primitive_cylinder_add(vertices=6,radius=.034,depth=.025,location=(pos.x,pos.y-.09,z))
  bolt=bpy.context.object;bolt.name='Study / counter hex fastener';bolt.rotation_euler.x=math.pi/2;bolt.data.materials.append(bpy.data.materials['03 / brushed steel'])
# Keep archived source fully editable; web export bakes only supported glTF inputs.
for ob in s.objects:
 if ob.type=='FONT':ob.data.resolution_u=1
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'Afterlife_Material_Lab.blend'))
for ob in list(s.objects):
 if ob.name.startswith('Atmosphere /'):bpy.data.objects.remove(ob,do_unlink=True);continue
 if ob.parent:
  mat=ob.matrix_world.copy();ob.parent=None;ob.matrix_world=mat
 if ob.type=='LIGHT':
  try:ob.data.driver_remove('energy')
  except:pass
  if ob.name.startswith('NeonLight / '):
   palette=json.loads((OUT/'Afterlife_Private_Room_Palette.json').read_text());c=next(c for c in palette if c['zone']==ob.name.split(' / ')[1]);ob.data.energy=max(ob.data.energy,65)*c['gain']
for m in bpy.data.materials:
 if m.name.startswith('Neon / '):
  p=m.node_tree.nodes.get('Principled BSDF')
  try:p.inputs['Emission Strength'].driver_remove('default_value')
  except:pass
  palette=json.loads((OUT/'Afterlife_Private_Room_Palette.json').read_text());c=next(c for c in palette if c['zone']==m.name.split(' / ')[1]);p.inputs['Emission Strength'].default_value=3*c['gain']
source=(OUT/'upgrade_cyberpunk_architecture.py').read_text();export=source[source.index("if 'Room atmosphere' in bpy.data.objects:"):].replace('Afterlife_Cyberpunk_Retrofit_Web.glb','Afterlife_Material_Lab_Web.glb')
export=export.replace("bpy.context.object.name='Retrofit / '+name", "bpy.context.object.name=name if name.startswith('Neon / ') else 'Interior / '+name")
exec(export)
print('MATERIAL_LAB_READY',len(leathers),len(puddles))
