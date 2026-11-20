"""Remove displaced foyer finish faces while retaining the D189 fixtures and cabinets."""
import json
from pathlib import Path

import bmesh
from mathutils import Vector


def install(bpy, assets):
    recipe = json.loads((Path(assets) / 'pdr-foyer-refit.json').read_text())
    removed = {}
    for name in dict.fromkeys(rule['object'] for rule in recipe['retire']):
        obj = bpy.data.objects.get(name)
        if obj is None and (name.startswith('SIGN_') or name.startswith('DECOR_')):
            continue
        assert obj is not None, name
        mesh = obj.data
        if mesh.users > 1:
            mesh = obj.data = mesh.copy()
        rules = [r for r in recipe['retire'] if r['object'] == name]
        bm = bmesh.new()
        bm.from_mesh(mesh)
        obsolete = []
        for face in bm.faces:
            slot = mesh.materials[face.material_index].name.split('.')[0]
            p = obj.matrix_world @ face.calc_center_median()
            center = p.x, p.z, -p.y
            if not any(rule['slot'] in (slot,'*') and
                       ('min' not in rule or all(a<=k<=b for a,k,b in zip(rule['min'],center,rule['max'])))
                       for rule in rules):
                continue
            obsolete.append(face)
            key = name + '/' + slot
            removed[key] = removed.get(key, 0) + 1
        bmesh.ops.delete(bm, geom=obsolete, context='FACES')
        bm.to_mesh(mesh)
        bm.free()
        mesh.update()
    for name, (x, y, z) in recipe['moves'].items():
        obj = bpy.data.objects[name]
        matrix = obj.matrix_world.copy()
        matrix.translation += Vector((x, -z, y))
        obj.matrix_world = matrix
    print('D189 foyer refit', removed)
    return removed
