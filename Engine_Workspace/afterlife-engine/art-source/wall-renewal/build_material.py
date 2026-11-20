from pathlib import Path
import bpy
here=Path(__file__).parent
bpy.ops.wm.read_factory_settings(use_empty=True)
m=bpy.data.materials.new('M14 graphite cassette field')
m.use_nodes=True
nodes=m.node_tree.nodes
links=m.node_tree.links
s=next(n for n in nodes if n.type=='BSDF_PRINCIPLED')
def tex(name):
 image=bpy.data.images.load(str(here/('graphite-'+name+'.png')))
 if name!='color':image.colorspace_settings.name='Non-Color'
 n=nodes.new('ShaderNodeTexImage')
 n.image=image
 return n.outputs['Color']
links.new(tex('color'),s.inputs['Base Color'])
split=nodes.new('ShaderNodeSeparateColor')
links.new(tex('orm'),split.inputs['Color'])
links.new(split.outputs['Green'],s.inputs['Roughness'])
links.new(split.outputs['Blue'],s.inputs['Metallic'])
normal=nodes.new('ShaderNodeNormalMap')
links.new(tex('normal'),normal.inputs['Color'])
links.new(normal.outputs['Normal'],s.inputs['Normal'])
bpy.ops.mesh.primitive_plane_add()
o=bpy.context.object
o.name='M14 material swatch'
o.data.materials.append(m)
bpy.ops.export_scene.gltf(filepath=str(here.parents[1]/'assets/D189-Wall-Cassettes.glb'),export_tangents=True)
