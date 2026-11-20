"""Remove retired facing triangles and seat the replacement parts on existing mounts."""
import json
import struct
import bmesh

def apply_hall_fitout_clearance(bpy,assets):
    spec=json.loads((assets/'pdr-hall-fitout-spec.json').read_text())
    with (assets/'Club_Upper_WB015_bcf6514f.glb').open('rb') as f:
        f.seek(12)
        size,_=struct.unpack('<II',f.read(8))
        src=json.loads(f.read(size))
    origins={}
    for node in src['nodes']:
        if node['name'] not in spec['remove']:continue
        primitives=src['meshes'][node['mesh']]['primitives']
        origins[node['name']]=list(dict.fromkeys(src['materials'][pr['material']]['name'] for pr in primitives))
    removed={}
    for name in spec['hidden']:
        o=bpy.data.objects[name]
        o.hide_render=True
        o.hide_viewport=True
    for name,replaced in spec['remove'].items():
        o=bpy.data.objects[name]
        names=origins[name]
        zones=[z for z in spec['zones'] if z['owner']==name]
        bm=bmesh.new()
        bm.from_mesh(o.data)
        erase=[]
        for face in bm.faces:
            slot=names[face.material_index]
            if slot in replaced:
                erase.append(face)
                continue
            for zone in zones:
                if slot!=zone['slot']:continue
                bounds=zone['bounds']
                def inside(v):
                    x,y,h=o.matrix_world@v.co
                    return all(bounds[i]<=p<=bounds[i+3] for i,p in enumerate([x,h,-y]))
                if all(inside(v) for v in face.verts):
                    erase.append(face)
                    break
        assert erase,name
        removed[name]=len(erase)
        bmesh.ops.delete(bm,geom=erase,context='FACES')
        bm.to_mesh(o.data)
        bm.free()
    for name,fit in spec['fits'].items():
        o=bpy.data.objects[name]
        lo,hi=fit['old']
        a,b=fit['next']
        # The three fabricated owners carry world baked geometry.
        ax=(0,2,1)[fit['axis']]
        direction=-1 if fit['axis']==2 else 1
        for v in o.data.vertices:
            p=v.co[ax]*direction
            sign=-1. if fit['mirror'] and p<0 else 1.
            v.co[ax]=direction*sign*(a+(sign*p-lo)*(b-a)/(hi-lo))
        o.data.update()
    pivot=spec['pivot']
    w,h,d=pivot['dimensions']
    mount=bpy.data.objects['Moving head 1 · MOUNT']
    for i,x in enumerate(pivot['x']):
        bpy.ops.mesh.primitive_cube_add(size=1,location=(x,-pivot['z'],pivot['y']))
        o=bpy.context.object
        o.name=f'Stage yaw pivot {i+1}'
        o.dimensions=(w,d,h)
        o.data.materials.append(mount.material_slots[0].material)
        for c in list(o.users_collection):c.objects.unlink(o)
        mount.users_collection[0].objects.link(o)
    print('HALL_FITOUT_CLEARANCE',removed,'3 surface fits, 2 yaw spindles',flush=True)
    from legacy_fixture_fit import apply_legacy_fixture_fit
    apply_legacy_fixture_fit(bpy,assets)
    return removed
