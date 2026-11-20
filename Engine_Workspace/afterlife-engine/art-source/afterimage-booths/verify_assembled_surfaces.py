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

    for side in (1, -1):
        side_limit = (100 if kind == "Hall" else 155) if kind != "VIP" and side == 1 else 176
        for x_cm in range(56, side_limit, 3):
            x = x_cm / 100
            inner_y = 1.80 if side == 1 else .80
            back = first_material((x, inner_y, .82), (0, side, 0))
            seat = first_material((x, 2.04 if side == 1 else .54, .535), (0, 0, -1))
            assert leather(back) and leather(seat), (kind, side, x, back, seat)
        for x_cm in range(4, (105 if kind == "Hall" else 165) if kind != "VIP" and side == 1 else 184, 2):
            for z_cm in range(17, 104, 2):
                origin = (x_cm / 100, 3.5 if side == 1 else -1, z_cm / 100)
                assert not leather(first_material(origin, (0, -side, 0))), (kind, origin)
    for y_cm in range(2, 254, 2):
        for z_cm in range(17, 104, 2):
            origin = (-1, y_cm / 100, z_cm / 100)
            assert not leather(first_material(origin, (1, 0, 0))), (kind, origin)
    if kind != 'VIP':
        from mathutils import Vector
        # Use physical face hits on the finished mesh, sampling the rib crowns
        # and the straight clear approach to the shorter return.
        y0,y1=.185,2.366
        front=[]
        for idx in range(91):
            for phase in (.08,.5):
                y=y0+(idx+phase)*(y1-y0)/91
                if kind=="Foyer":y=1.30+(y-1.30)*1.17
                pos,_,face,_=tree.ray_cast(Vector((.3,y,1.32)),Vector((-1,0,0)))
                assert mesh.materials[mesh.polygons[face].material_index].name=='Clear amber edge-lit screen'
                front.append(pos.x)
        relief=max(front)-min(front)
        assert .005<relief<.007,relief
        lo,hi=(.74,1.83) if kind=="Foyer" else (.73,2.10)
        for j in range(26):
            y=lo+(hi-lo)*j/25
            hit=tree.ray_cast((2.55 if kind=="Foyer" else 2.30,y,.50),(-1,0,0),.50)[2]
            assert hit is None,(j,y,hit)
        print(kind,'banquette clear approach',hi-lo,'m; screen flute relief',relief,'m')
    print(f'{kind}: seat, backrest and exterior checks passed')
