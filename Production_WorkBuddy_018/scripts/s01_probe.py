# WB018 s01 read-only probe of the baseline copy: image packing, occupancy in candidate volumes. WorkBuddy Claude-Opus-5.5
import bpy, json, os
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
imgs = [(i.name, bool(i.packed_file), i.filepath) for i in bpy.data.images]
unpacked = [i for i in imgs if not i[1] and i[2]]
dg = bpy.context.evaluated_depsgraph_get()
def objs_in(lo, hi):
    out = []
    for o in bpy.data.objects:
        if o.type != 'MESH' or o.name.startswith('CALIB'): continue
        bb = [o.matrix_world @ Vector(c) for c in o.bound_box]
        mn = [min(p[i] for p in bb) for i in range(3)]; mx = [max(p[i] for p in bb) for i in range(3)]
        if all(mn[i] < hi[i] and mx[i] > lo[i] for i in range(3)):
            # vertex-level check
            me = o.data; M = o.matrix_world; n = 0
            for v in me.vertices:
                p = M @ v.co
                if all(lo[i] <= p[i] <= hi[i] for i in range(3)): n += 1
            if n: out.append([o.name, n])
    return out
VOL = {'front_band': ((-9.5, 1.5, 6.2), (9.5, 18.5, 7.1)), 'deep_band': ((-7.6, 24.0, 6.4), (7.6, 37.6, 7.3)),
       'north_flank_E': ((6.0, 43.6, 2.6), (8.3, 44.0, 6.8)), 'north_flank_W': ((-8.3, 43.6, 2.6), (-6.0, 44.0, 6.8))}
R = {'n_images': len(imgs), 'unpacked_with_path': unpacked[:20], 'occupancy': {k: objs_in(*v) for k, v in VOL.items()}}
json.dump(R, open(os.path.join(ROOT, 'logs', 's01-probe.json'), 'w'), indent=1)
print('IMAGES', len(imgs), 'unpacked', len(unpacked)); [print(k, v) for k, v in R['occupancy'].items()]
