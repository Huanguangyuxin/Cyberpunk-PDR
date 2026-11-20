"""Run with the saved D189 blend open in background; checks images and renders six review views."""
from pathlib import Path
import bpy
p=Path(bpy.data.filepath).parent
s=bpy.context.scene
assert len([o for o in s.objects if o.type=='MESH' and o.name.startswith('BOOTH_')])==21
assert len([o for o in s.objects if o.type=='LIGHT'])==62
# All three bases must contact this single deck. The discontinued second row
# had separate drink roots and lights, so check for them independently.
from mathutils import Vector
def bounds(obj):
    pts = [obj.matrix_world @ Vector(p) for p in obj.bound_box]
    return [(min(p[k] for p in pts), max(p[k] for p in pts)) for k in range(3)]
backing = bounds(s.objects['Bottle niche rear'])
assert abs(backing[0][0]-13.830)<.002 and abs(backing[2][0]-.01)<.002 and abs(backing[2][1]-2.47)<.002
for prefix in ('L04_','L05_'):
    lights = [o for o in s.objects if o.type=='LIGHT' and o.name.startswith(prefix)]
    assert len(lights)==1
    lamp = lights[0]
    import json
    merge_spec=json.loads((p.parents[1]/'assets/pdr-fixed-lighting.json').read_text())
    target=next(r['intensity'] for r in merge_spec['merges'] if r['owner']==int(prefix[1:3]))
    assert lamp.data.type=='AREA' and abs(lamp['engine_rect_radiance_scale']-target)<.01
    assert abs(lamp.location.x-12.17)<.001 and abs(lamp.location.z-2.68)<.001
assert all(s.objects.get(key) for key in ('Afterimage wordmark','Shelf working light','BAR_WORK_SURFACE'))
assert not any(o.name.startswith(('SIGN_', 'WPANEL_', 'HTABLE_')) for o in s.objects)
assert s.objects.get('Wrought east stair handrail') is not None
east_stair=s.objects['STAIR_E']
assert len(east_stair.data.polygons)>0
assert all(east_stair.material_slots[f.material_index].material.name.split('.')[0]!='WB015_M_CHROME' for f in east_stair.data.polygons)
platform = bounds(s.objects['Portrait lounge plinth'])
assert abs(platform[2][1] - .144) < .0002
assert not any('BOOTH_F2' in obj.name for obj in s.objects)
for name in ('BOOTH_F11','BOOTH_F12','BOOTH_F13'):
    booth = bounds(s.objects[name])
    assert abs(booth[1][1]-booth[1][0]-3.118)<.002
    assert abs(booth[0][1]-booth[0][0]-2.457)<.002
    assert abs(booth[2][0] - platform[2][1]) < .001
    assert all(platform[k][0] <= booth[k][0] and booth[k][1] <= platform[k][1] for k in (0,1))
    fixture=s.objects[name]
    tabletop=fixture.matrix_world @ Vector((1.56,1.30,.690))
    lamp=s.objects[name+' · Opal table lamp']
    lamp_target=fixture.matrix_world @ Vector((1.75,1.54,.910))
    assert (lamp.matrix_world.translation-lamp_target).length < .001
    for vessel in ('COUPE','TUMBLER'):
        glass = bounds(s.objects['DRINK_'+name+'_'+vessel+'_GLASS'])
        assert abs(glass[2][0] - tabletop.z) < .002
        for x in glass[0]:
            for y in glass[1]:
                assert ((x-tabletop.x)/.590)**2+((y-tabletop.y)/.560)**2<1
    assert s.objects[name+' · Opal table lamp'].type == 'LIGHT'
assert all(im.packed_file for im in bpy.data.images if im.filepath)
stone=bpy.data.materials['Rear terrazzo']
normal=next(n for n in stone.node_tree.nodes if n.type=='NORMAL_MAP')
assert abs(normal.inputs['Strength'].default_value-.46)<1e-6
tile=bpy.data.objects['Garnet glazed running bond']
iron=bpy.data.materials['Rear garnet · iron-red bar apron']
hits=0
for face in tile.data.polygons:
    point=tile.matrix_world @ face.center
    expected=point.x>7 and point.z<.02
    assert (tile.material_slots[face.material_index].material==iron)==expected
    hits+=int(expected)
assert hits==696
assert bounds(s.objects['STAIR_W'])[1][0] - platform[1][1] > 3.59
print('Validated three foyer booth footprints and tables; 696 bar-apron faces and terrazzo normal strength',flush=True)
for cam,label in [('redesign-hall','舞台前'),('design-bar','前厅吧台'),('gallery-wall-wash','二层回廊'),('seating-foyer-entry','前厅卡座'),('vip-e2','二层观演窗'),('vip-e2-stage-sightline','包厢望向舞台')]:
    s.camera=bpy.data.objects['Review · '+cam]
    s.render.resolution_percentage=75
    s.cycles.samples=12
    s.render.image_settings.file_format='JPEG'
    s.render.image_settings.quality=93
    s.render.filepath=str(p/(label+'.jpg'))
    bpy.ops.render.render(write_still=True)
