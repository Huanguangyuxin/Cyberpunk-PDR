"""Render inspection views from the saved donor file. Pass output directory after --."""
from pathlib import Path
import sys
import bpy
from mathutils import Vector

out=Path(sys.argv[sys.argv.index('--')+1])
out.mkdir(parents=True,exist_ok=True)
scene=bpy.context.scene
booths={kind:bpy.data.objects['Afterimage '+kind+' Booth'] for kind in ['Foyer','Hall','VIP']}
for obj in booths.values():
    obj.location.x=0
scene.render.engine='CYCLES'
scene.cycles.samples=24
scene.cycles.use_denoising=True
scene.render.resolution_x=960
scene.render.resolution_y=650
scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('Upholstery inspection world')
scene.world.use_nodes=True
background=scene.world.node_tree.nodes['Background']
background.inputs[0].default_value=(.51,.55,.64,1)
background.inputs[1].default_value=.65

def aim(obj,target):
    obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()
for pos,power,size in [((4,-3,4.8),580,4.),((-1.4,4.,4.),420,3.),((2.,4.,2.),85,2.)]:
    lamp=bpy.data.lights.new('Softbox', 'AREA')
    lamp.energy=power
    lamp.shape='DISK'
    lamp.size=size
    obj=bpy.data.objects.new(lamp.name,lamp)
    scene.collection.objects.link(obj)
    obj.location=pos
    aim(obj,(.85,1.25,.61))

bpy.ops.mesh.primitive_plane_add(size=100)
plane=bpy.context.object
plane.location.z=-.003
floor=bpy.data.materials.new('Matte slate')
floor.diffuse_color=(.083,.093,.113,1.)
plane.data.materials.append(floor)
bpy.ops.object.camera_add()
camera=bpy.context.object
scene.camera=camera
camera.data.type='ORTHO'
for name,kind,eye,target,span in [
    ('foyer-aisle','Foyer',(5.7,4.2,2.7),(.90,1.30,.64),3.65),
    ('hall-channel','Hall',(4.5,2.7,2.35),(.53,.63,.74),1.52),
    ('vip-inside','VIP',(5.7,1.39,2.6),(.85,1.30,.63),3.58),
    ('vip-plan','VIP',(.94,1.30,5.6),(.94,1.30,.62),3.74),
    ('foyer-end-lens','Foyer',(3.1,-.82,1.48),(1.91,.23,.66),1.67),
    ('vip-outside','VIP',(-3.7,4.7,2.9),(.90,1.30,.64),3.65),
]:
    for label,obj in booths.items():
        obj.hide_render=kind!=label
    camera.location=eye
    aim(camera,target)
    camera.data.ortho_scale=span
    scene.render.filepath=str(out/(name+'.png'))
    bpy.ops.render.render(write_still=True)
