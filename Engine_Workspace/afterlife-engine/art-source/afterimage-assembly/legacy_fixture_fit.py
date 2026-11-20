"""Physical clearance for stage moving heads and the west photographic installation."""
import json

def apply_legacy_fixture_fit(bpy,assets):
    spec=json.loads((assets/'pdr-legacy-fixture-fit.json').read_text())
    for name,(dy,sx,sy) in spec['pose'].items():
        if name.startswith('L'):
            match=[o for o in bpy.data.objects if o.type=='LIGHT' and o.name.startswith(name)]
            assert len(match)==1,(name,[o.name for o in match])
            obj=match[0]
        else:
            obj=bpy.data.objects[name]
        obj.location.z+=dy
        obj.scale.x*=sx
        obj.scale.z*=sy
    s=spec['suspension']
    mount=bpy.data.objects['Moving head 1 · MOUNT']
    for p in s['parts']:
        w,h,d=p['size']
        for x in s['fixtureX']:
            offset=s['inset'] if x<0 else -s['inset']
            bpy.ops.mesh.primitive_cube_add(size=1,location=(x+offset,-s['z'],p['y']))
            o=bpy.context.object
            o.name=f"Stage head {x:+d} {p['name']}"
            o.dimensions=(w,d,h)
            o.data.materials.append(mount.material_slots[0].material)
            for c in list(o.users_collection):c.objects.unlink(o)
            mount.users_collection[0].objects.link(o)
    bpy.context.view_layer.update()
    print('LEGACY_FIXTURE_FIT',list(spec['pose']),'4 suspensions',flush=True)
