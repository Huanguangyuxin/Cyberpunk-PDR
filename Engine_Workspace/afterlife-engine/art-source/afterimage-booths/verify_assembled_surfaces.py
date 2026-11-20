"""Run in Blender on the booth donor file; test the assembled visible surfaces."""
import bpy
from mathutils.bvhtree import BVHTree

for kind in ('Foyer', 'Hall', 'VIP'):
    mesh = bpy.data.objects[f'Afterimage {kind} Booth'].data
    tree = BVHTree.FromPolygons([v.co for v in mesh.vertices], [p.vertices[:] for p in mesh.polygons])

    def first_material(origin, direction):
        _, _, index, _ = tree.ray_cast(origin, direction)
        return mesh.materials[mesh.polygons[index].material_index].name if index is not None else None

    def leather(material):
        return material in ('M01 Merlot channel leather', 'Merlot piping')

    for side in ((1, -1) if kind != 'Hall' else (-1,)):
        for x_cm in range(56, 176, 3):
            x = x_cm / 100
            inner_y = 1.80 if side == 1 else .80
            back = first_material((x, inner_y, .82), (0, side, 0))
            seat = first_material((x, 2.04 if side == 1 else .54, .535), (0, 0, -1))
            assert leather(back) and leather(seat), (kind, side, x, back, seat)
        for x_cm in range(4, 184, 2):
            for z_cm in range(17, 104, 2):
                origin = (x_cm / 100, 3.5 if side == 1 else -1, z_cm / 100)
                assert not leather(first_material(origin, (0, -side, 0))), (kind, origin)
    for y_cm in range(2, 254, 2):
        for z_cm in range(17, 104, 2):
            origin = (-1, y_cm / 100, z_cm / 100)
            assert not leather(first_material(origin, (1, 0, 0))), (kind, origin)
    print(f'{kind}: seat, backrest and exterior checks passed')
