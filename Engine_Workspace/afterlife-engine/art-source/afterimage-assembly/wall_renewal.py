"""Use the same source material slots and metric mapping as ForgeaX."""
import json
import struct

def apply_wall_renewal(bpy, assets, ingest, drop):
    spec=json.loads((assets/'pdr-wall-specification.json').read_text())
    donor=ingest('D189-Wall-Cassettes.glb','M14 material donor')
    for o in list(donor.objects):
        drop(o)
    bpy.data.collections.remove(donor)
    defaults={}
    for file in ('Club_Upper_WB015_bcf6514f.glb','WB018_lizzie_badb10cd.glb','PDR-D180-Installed-Finishes.glb'):
        with (assets/file).open('rb') as f:
            f.seek(12)
            n,_=struct.unpack('<II',f.read(8))
            doc=json.loads(f.read(n))
        for node in doc['nodes']:
            if node['name'] not in spec['owners']:continue
            primitives=doc['meshes'][node['mesh']]['primitives']
            defaults[node['name']]=list(dict.fromkeys(doc['materials'][p['material']]['name'] for p in primitives))
    # Runtime display hierarchy already removes these plaster patches and
    # pylon print faces. Keep the standalone Blender assembly in agreement.
    import bmesh
    for name,slot_name in [('DECOR_COMPOSED_WALLS','M_PLASTER_PATCH'),
                           ('DECOR_WALL_HISTORY_RACEWAYS','M_PLASTER_PATCH'),
                           ('ARCH_PYLONS','M_WALL_COLLAGE'),
                           ('ARCH_COLUMNS_WB015','WB015_M_STEEL_NAVY')]:
        obj=bpy.data.objects.get(name)
        if not obj:continue
        slots={i for i,slot in enumerate(obj.material_slots) if slot.name.split('.')[0]==slot_name}
        if name in defaults:
            slots.update(i for i,s in enumerate(defaults[name]) if s==slot_name)
        if not slots:continue
        bm=bmesh.new()
        bm.from_mesh(obj.data)
        doomed=[face for face in bm.faces if face.material_index in slots]
        if doomed:
            bmesh.ops.delete(bm,geom=doomed,context='FACES')
            bm.to_mesh(obj.data)
        bm.free()
    facts=[]
    for name,rules in spec['owners'].items():
        obj=bpy.data.objects[name]
        source=defaults[name]
        assert len(source)==len(obj.material_slots),(name,source,len(obj.material_slots))
        face_settings={}
        for index,s in enumerate(source):
            if s not in rules:continue
            finish=spec['materials'][rules[s]]
            obj.material_slots[index].material=bpy.data.materials[finish['name']]
            face_settings[index]=finish['metres']
            facts.append([name,s,finish['name']])
        uv=obj.data.uv_layers.active
        assert uv
        for face in obj.data.polygons:
            dims=face_settings.get(face.material_index)
            if not dims:continue
            for li in face.loop_indices:
                loop=obj.data.loops[li]
                v=obj.data.vertices[loop.vertex_index]
                # Mesh is authored in world metres; transform lifts gallery and
                # seating-shell surfaces onto the correct courses.
                x,forward,h=obj.matrix_world@v.co
                normal=obj.data.corner_normals[li].vector
                nx,ny,nz=normal.x,normal.z,-normal.y
                ax,ay,az=abs(nx),abs(ny),abs(nz)
                top=ay>ax and ay>az
                side=not top and ax>az
                sign=1 if top else (1 if (nx if side else -nz)>0 else -1)
                u=(-forward if side else x)*sign/dims[0]
                gltf_v=(-forward if top else -h)/dims[1]
                uv.data[li].uv=(u,1-gltf_v)
    print('WALL_RENEWAL',len(spec['owners']),len(facts),'native owner/slot bindings',flush=True)
    return facts
