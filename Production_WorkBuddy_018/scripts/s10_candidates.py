# WB018 s10: Lizzie-reference local repair candidates on an ISOLATED copy of the WB015 final source (0de38371).  Author/executor: WorkBuddy Claude-Opus-5.5
#   Blender -b source/baseline/club-wb015-upper-final_0de38371.blend --python-exit-code 1 --python scripts/s10_candidates.py
# Adds ONLY new objects in collection WB018 (+ one recoloured copy that replaces FIX_ROOF_LIGHT_BANDS). No existing object is moved, scaled or edited.
#   G1 WB018_CEIL_BAND_FRONT       folded/chamfered double cool-white light band on a dark bulkhead raft over the front hall (refs R11, R12, video 01:12/02:24/02:42/03:18)
#      WB018_ROOF_LIGHT_BANDS_COOL  same mesh as FIX_ROOF_LIGHT_BANDS, lavender diffusers -> cool white (replace-in-place candidate)
#   G2 WB018_BASE_LED_LINES        pink low base LED channels on the 4 bridge pylons + 18 column collars (refs R11, R12, video 01:12/01:30)
#   G3 WB018_STAGE_FLANK_PANELS    original acoustic weave panel fields + paired tall pink light boxes on the north wall either side of the stage (refs R12, R11, video 01:12/04:30)
# Native light candidate applied in this DCC copy only: L13_CEIL_L_02 moved under the new band, cool white (see design/light-param-candidate.json).
# Output: source/club-wb018-candidates.blend (full scene copy for same-source renders), logs/s10-receipt.json.  Baseline copy is not saved over.
import bpy, bmesh, sys, os, json, math, hashlib
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(HERE, 'lib'))
import wb011_blender as B
from wb011_blender import MB
src = bpy.data.filepath; src_sha = hashlib.sha256(open(src, 'rb').read()).hexdigest()
assert src_sha.startswith('0de38371'), src_sha
V = json.load(open(os.path.join(ROOT, '..', 'Production_WorkBuddy_015', 'design', 'venue.json')))   # read-only
O = bpy.data.objects; sc = bpy.context.scene
B.MATS.update({m.name: m for m in bpy.data.materials})
B.TILE.update({'M_STEEL_BLACK': 1.0, 'M_STEEL_NAVY': 1.0, 'M_CHROME': 0.5})
TX = os.path.join(ROOT, 'textures')
M = {
 'bulk': B.mat('M18_BULKHEAD_DARK', base=(0.030, 0.033, 0.044), rough=0.55, metal=0.2, tile=1.0),
 'band': B.mat('M18_BAND_COOL', base=(0.86, 0.92, 1.0), rough=0.30, emis=(0.70, 0.86, 1.0), emis_strength=7.0),
 'band2': B.mat('M18_BAND_COOL_DIM', base=(0.80, 0.88, 1.0), rough=0.30, emis=(0.55, 0.75, 1.0), emis_strength=4.5),
 'pinkline': B.mat('M18_BASE_LED_PINK', base=(1.0, 0.62, 0.82), rough=0.30, emis=(1.0, 0.14, 0.52), emis_strength=5.0),
 'pinkbox': B.mat('M18_TALL_PANEL_PINK', base=(0.30, 0.03, 0.08), rough=0.32, emis=(1.0, 0.05, 0.22), emis_strength=0.9),   # r3: r1 4.0 / r2 1.8 + pale base still rendered pink-white; dark red base keeps saturation
 'weave': B.mat('M18_ACOUSTIC_WEAVE', color_tex=os.path.join(TX, 'M18_ACOUSTIC_WEAVE_color.png'), normal_tex=os.path.join(TX, 'M18_ACOUSTIC_WEAVE_normal.png'),
                orm_tex=os.path.join(TX, 'M18_ACOUSTIC_WEAVE_orm.png'), tile=0.60),
}
ms, mc = B.MATS['M_STEEL_BLACK'], B.MATS['M_CHROME']
C = bpy.data.collections.new('WB018'); sc.collection.children.link(C)
REC = {'author': 'WorkBuddy Claude-Opus-5.5', 'blender': bpy.app.version_string, 'source_in': os.path.relpath(src, ROOT), 'source_in_sha256': src_sha, 'objects': {}, 'checks': {}}
existing = [o for o in O if o.type == 'MESH' and not o.name.startswith('CALIB')]
dg = bpy.context.evaluated_depsgraph_get()

def build(name, mb, note):
    o = B.obj(name, mb.build('ME_' + name), C); o['wb018'] = note; o['author'] = 'WorkBuddy Claude-Opus-5.5'
    REC['objects'][name] = note; return o

# --------------------------------------------------------------- polygon helpers (chamfered rectangle, inward offset, ring prism)
def chamf(cx, cy, hx, hy, c):
    return [(cx - hx + c, cy - hy), (cx + hx - c, cy - hy), (cx + hx, cy - hy + c), (cx + hx, cy + hy - c), (cx + hx - c, cy + hy), (cx - hx + c, cy + hy), (cx - hx, cy + hy - c), (cx - hx, cy - hy + c)]
def chamf_off(cx, cy, hx, hy, c, d):          # inward offset of a 45-degree chamfered rectangle by d
    return chamf(cx, cy, hx - d, hy - d, c - d * (2 - math.sqrt(2)))
def ring(mb, outer, inner, z0, z1, m):
    bm = bmesh.new(); n = len(outer)
    vo0 = [bm.verts.new((x, y, z0)) for x, y in outer]; vo1 = [bm.verts.new((x, y, z1)) for x, y in outer]
    vi0 = [bm.verts.new((x, y, z0)) for x, y in inner]; vi1 = [bm.verts.new((x, y, z1)) for x, y in inner]
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((vo0[i], vo0[j], vo1[j], vo1[i])); bm.faces.new((vi0[j], vi0[i], vi1[i], vi1[j]))
        bm.faces.new((vo1[i], vo1[j], vi1[j], vi1[i])); bm.faces.new((vo0[j], vo0[i], vi0[i], vi0[j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    mb.merge_bm(bm, m); bm.free()
def bar(mb, p0, p1, z0, z1, w, m):            # straight prism of width w along p0->p1 (plan), z0..z1
    p0 = Vector(p0); p1 = Vector(p1); d = p1 - p0; L = d.length; a = math.atan2(d.y, d.x)
    mb.push(Matrix.Translation((p0.x, p0.y, 0)) @ Matrix.Rotation(a, 4, 'Z')); mb.box((0, -w / 2, z0), (L, w / 2, z1), m); mb.pop()
def ray_up(p, dist=3.0):
    hit, loc, n, i, ob, mm = sc.ray_cast(dg, Vector(p), Vector((0, 0, 1)), distance=dist)
    return (loc, ob.name) if hit else (None, None)

# =============================================================== G1 front-hall folded band raft
CX, CY, HX, HY, CH, W = 0.0, 10.0, 4.30, 7.60, 1.60, 0.65
Z0, Z1 = 6.55, 7.00
mb = MB()
outer = chamf(CX, CY, HX, HY, CH); inner = chamf_off(CX, CY, HX, HY, CH, W)
ring(mb, outer, inner, Z0, Z1, M['bulk'])                                            # dark bulkhead raft (painted sheet steel)
for (d0, d1, m) in ((0.06, 0.24, M['band']), (0.40, 0.53, M['band2'])):   # r2: wider primary strip (r1 0.11 m read as a thin line at 7 m)             # double strip on the underside, recessed in steel lips
    ring(mb, chamf_off(CX, CY, HX, HY, CH, d0), chamf_off(CX, CY, HX, HY, CH, d1), Z0 - 0.014, Z0 - 0.002, m)
    ring(mb, chamf_off(CX, CY, HX, HY, CH, d0 - 0.012), chamf_off(CX, CY, HX, HY, CH, d0), Z0 - 0.026, Z0, ms)
    ring(mb, chamf_off(CX, CY, HX, HY, CH, d1), chamf_off(CX, CY, HX, HY, CH, d1 + 0.012), Z0 - 0.026, Z0, ms)
ring(mb, chamf_off(CX, CY, HX, HY, CH, -0.004), chamf_off(CX, CY, HX, HY, CH, 0.0), Z1 - 0.06, Z1 - 0.045, M['band2'])   # thin up-glow line on the outer top edge
# folded inner band (original Z-fold, not a copy of any sign): double channel hung lower than the raft
fold = [(-2.2, 6.2), (0.6, 6.2), (2.2, 7.8), (2.2, 9.0)]
ZF = 6.78
for a, b in zip(fold[:-1], fold[1:]):
    bar(mb, a, b, ZF, ZF + 0.10, 0.22, M['bulk'])
    for off, m in ((-0.055, M['band']), (0.055, M['band2'])):
        pa = Vector(a); pb = Vector(b); dv = (pb - pa).normalized(); nv = Vector((-dv.y, dv.x)) * off
        bar(mb, pa + nv, pb + nv, ZF - 0.012, ZF, 0.05, m)
# hangers: candidate points on the raft centre line; each rod must reach roof beam / slab, not a service (ray-checked)
mid = chamf_off(CX, CY, HX, HY, CH, W / 2)
cands = []
for (x, y) in ((-mid[3][0] if False else mid[2][0], 0),):
    pass
xs = mid[2][0]
for y in (4.6, 7.2, 9.8, 12.4, 15.0):
    cands += [(xs, y), (-xs, y)]
for x in (-1.2, 1.2):
    cands += [(x, CY - HY + W / 2), (x, CY + HY - W / 2)]
cands += [(-2.2 + 0.2, 6.2), (1.4, 7.0), (2.2, 8.8)]
rods = []
def _bvh_obj(o):
    bm = bmesh.new(); bm.from_mesh(o.data); bm.transform(o.matrix_world); t = BVHTree.FromBMesh(bm); bm.free(); return t
SERV = [_bvh_obj(o) for o in O if o.type == 'MESH' and o.name.startswith('MEP_')]
def box_tree(lo, hi):
    v = [(lo[0], lo[1], lo[2]), (hi[0], lo[1], lo[2]), (hi[0], hi[1], lo[2]), (lo[0], hi[1], lo[2]), (lo[0], lo[1], hi[2]), (hi[0], lo[1], hi[2]), (hi[0], hi[1], hi[2]), (lo[0], hi[1], hi[2])]
    f = [(0, 1, 2, 3), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    return BVHTree.FromPolygons(v, f)
def clear_of_services(x, y, z0, z1):     # run1 failure: beam-clamp plates at y2.7 touched MEP_TRANSVERSE_SERVICES hangers
    t = box_tree((x - 0.06, y - 0.06, z0), (x + 0.06, y + 0.06, z1))
    return all(not t.overlap(s) for s in SERV)
for (x, y) in cands:
    zb = ZF + 0.10 if (abs(y - 6.2) < 0.05 or (x, y) in ((1.4, 7.0), (2.2, 8.8))) else Z1
    for dy in (0.0, 0.25, -0.25, 0.5, -0.5):
        loc, hitname = ray_up((x, y + dy, zb + 0.002), 2.5)
        if loc is not None and hitname in ('ARCH_ROOF_BEAMS', 'ARCH_ROOF_SLAB') and clear_of_services(x, y + dy, zb, loc.z):
            mb.cyl((x, y + dy, zb), 0.006, loc.z - zb, mc, 8)                                   # M12 threaded rod
            mb.box((x - 0.05, y + dy - 0.05, loc.z - 0.008), (x + 0.05, y + dy + 0.05, loc.z), ms)     # anchor plate / beam clamp
            mb.box((x - 0.035, y + dy - 0.035, zb), (x + 0.035, y + dy + 0.035, zb + 0.012), ms)      # raft cleat
            rods.append({'xy': [round(x, 3), round(y + dy, 3)], 'z': [round(zb, 3), round(loc.z, 3)], 'anchor': hitname}); break
    else:
        rods.append({'xy': [x, y], 'skipped': 'no clear structural anchor above (service in the way)'})
# feed: junction box on raft top + flexible conduit following the nearest rod
fx, fy = xs, 9.8
mb.box((fx - 0.12, fy + 0.10, Z1), (fx + 0.12, fy + 0.34, Z1 + 0.10), B.MATS.get('M_JBOX', ms), 0.004)
mb.tube([(fx, fy + 0.22, Z1 + 0.10), (fx, fy + 0.22, Z1 + 0.40), (fx + 0.05, fy + 0.05, Z1 + 0.70), (fx + 0.05, fy + 0.05, 8.15)], 0.011, B.MATS['M_RUBBER'], 8)
build('WB018_CEIL_BAND_FRONT', mb, 'G1 front hall chamfered double cool band on dark bulkhead raft z6.55-7.0, Z-fold band z6.78; rods ray-anchored to roof beams/slab')
REC['checks']['front_rods'] = rods

# recoloured copy of the existing roof bands (deep hall void loop + corridor bands): same mesh data copy, diffuser materials swapped
src_o = O['FIX_ROOF_LIGHT_BANDS']; me2 = src_o.data.copy(); me2.name = 'ME_WB018_ROOF_LIGHT_BANDS_COOL'
swap = {'M_BAND_LAV': M['band'], 'M_BAND_VOID': M['band']}
for i, m in enumerate(me2.materials):
    if m and m.name in swap:
        me2.materials[i] = swap[m.name]
o2 = B.obj('WB018_ROOF_LIGHT_BANDS_COOL', me2, C); o2.matrix_world = src_o.matrix_world.copy()
o2['wb018'] = 'replace-in-place candidate for FIX_ROOF_LIGHT_BANDS (identical geometry); lavender diffusers -> cool white'
src_o.hide_render = True; src_o.hide_viewport = True
REC['objects']['WB018_ROOF_LIGHT_BANDS_COOL'] = o2['wb018']; REC['hidden_in_candidate_copy'] = ['FIX_ROOF_LIGHT_BANDS']

# =============================================================== G2 pink base LED lines (pylon skirts + column collars)
mb = MB(); nl = 0
for p in V['pylons']:
    x0, x1 = p['x']; y0, y1 = p['y']; e = 0.02 + 0.008                  # existing steel skirt is 0.02 proud of the pylon, 0..0.25 m
    zA, zB = 0.050, 0.075
    mb.box((x0 - e, y0 + 0.04, zA), (x0 - 0.02, y1 - 0.04, zB), M['pinkline']); mb.box((x1 + 0.02, y0 + 0.04, zA), (x1 + e, y1 - 0.04, zB), M['pinkline'])
    mb.box((x0 + 0.04, y0 - e, zA), (x1 - 0.04, y0 - 0.02, zB), M['pinkline']); mb.box((x0 + 0.04, y1 + 0.02, zA), (x1 - 0.04, y1 + e, zB), M['pinkline'])
    nl += 4
for c in V['columns']:
    x, y = c['x'], c['y']; h = 0.20                                       # collar 0.40 sq stays inside the existing 0.44 base plate
    mb.box((x - h, y - h, 0.02), (x + h, y + h, 0.11), ms, 0.004)
    for (a, b) in (((x - h - 0.004, y - h + 0.03), (x - h, y + h - 0.03)), ((x + h, y - h + 0.03), (x + h + 0.004, y + h - 0.03)),
                   ((x - h + 0.03, y - h - 0.004), (x + h - 0.03, y - h)), ((x - h + 0.03, y + h), (x + h - 0.03, y + h + 0.004))):
        mb.box((a[0], a[1], 0.045), (b[0], b[1], 0.070), M['pinkline'])
    nl += 4
build('WB018_BASE_LED_LINES', mb, f'G2 pink base LED channels: 4 pylons x4 faces + {len(V["columns"])} column collars (0.40 sq inside existing 0.44 plates), z<=0.11')
REC['checks']['base_line_count'] = nl

# =============================================================== G3 stage flank acoustic weave fields + tall pink light boxes (north wall y=44)
mb = MB(); YW = 44.0
for sx in (-1, 1):
    xa, xb = sorted([sx * 6.92, sx * 8.24]); za, zb = 0.25, 6.25
    for xx in (xa, xb - 0.05):                                            # steel uprights on stand-offs
        mb.box((xx, YW - 0.07, za - 0.05), (xx + 0.05, YW - 0.02, zb + 0.05), ms, 0.003)
    for zz in (za - 0.05, zb):
        mb.box((xa, YW - 0.07, zz), (xb, YW - 0.02, zz + 0.05), ms, 0.003)
    ncol = 2; wmod = (xb - xa - 0.10 - 0.01 * (ncol - 1)) / ncol; nrow = 10; hmod = (zb - za - 0.01 * (nrow - 1)) / nrow
    for i in range(ncol):
        for j in range(nrow):
            x0 = xa + 0.05 + i * (wmod + 0.01); z0 = za + j * (hmod + 0.01)
            mb.box((x0, YW - 0.065, z0), (x0 + wmod, YW - 0.035, z0 + hmod), M['weave'])
    for xc in (sx * 7.30, sx * 7.86):                                    # paired tall light boxes, steel housing + opal face (lit sides read on the weave)
        mb.box((xc - 0.13, YW - 0.16, 3.30), (xc + 0.13, YW - 0.065, 6.05), ms, 0.004)
        mb.opal_box((xc - 0.11, YW - 0.168, 3.34), (xc + 0.11, YW - 0.158, 6.01), M['pinkbox'])
        mb.cyl_axis((xc, YW - 0.11, 6.05), (xc, YW - 0.11, 6.25), 0.010, B.MATS['M_RUBBER'], 8)
build('WB018_STAGE_FLANK_PANELS', mb, 'G3 north-wall stage flanks x+-6.92..8.24, z0.25-6.25: original acoustic weave modules 0.6 m tile + 2 tall pink light boxes per side; avoids tray J-boxes at x+-6.45..6.75')

# =============================================================== clearance: new vs existing (BVH overlap), human/route impact
def bvh(o):
    bm = bmesh.new(); bm.from_mesh(o.data); bm.transform(o.matrix_world); t = BVHTree.FromBMesh(bm); bm.free(); return t
newo = [O[n] for n in ('WB018_CEIL_BAND_FRONT', 'WB018_BASE_LED_LINES', 'WB018_STAGE_FLANK_PANELS')]
ov = {}
for n in newo:
    tn = bvh(n); nb = [n.matrix_world @ Vector(c) for c in n.bound_box]; lo = [min(p[i] for p in nb) for i in range(3)]; hi = [max(p[i] for p in nb) for i in range(3)]
    hits = []
    for e in existing:
        if e.hide_render:
            continue
        eb = [e.matrix_world @ Vector(c) for c in e.bound_box]
        if any(max(p[i] for p in eb) < lo[i] or min(p[i] for p in eb) > hi[i] for i in range(3)):
            continue
        k = len(tn.overlap(bvh(e)))
        if k:
            hits.append([e.name, k])
    ov[n.name] = hits
REC['checks']['triangle_overlaps_with_existing'] = ov
REC['checks']['front_raft_lowest_z'] = Z0 - 0.026
REC['checks']['note'] = 'G2 collars/lines stay within existing pylon skirts (+8 mm) and 0.44 column plates; G3 is 0.17 m proud of the north wall behind the stage flank (no walkway); G1 is above 6.5 m'

# =============================================================== native light candidate (DCC copy only; Engine values in design/light-param-candidate.json)
L = O['L13_CEIL_L_02']; before = {'pos': list(L.location), 'color': list(L.data.color), 'W': L.data.energy}
L.location = (1.6, 10.2, 6.45); L.rotation_euler = (0, 0, 0); L.data.color = (0.70, 0.84, 1.0)
REC['dcc_light_change'] = {'L13_CEIL_L_02': {'before': before, 'after': {'pos': [1.6, 10.2, 6.45], 'aim': 'straight down', 'color': [0.70, 0.84, 1.0], 'W': L.data.energy}}}
assert len(bpy.data.collections['LIGHTS'].objects) == 32
bpy.ops.file.pack_all()
out = os.path.join(ROOT, 'source', 'club-wb018-candidates.blend')
bpy.ops.wm.save_as_mainfile(filepath=out, compress=True)
REC['output'] = os.path.relpath(out, ROOT); REC['output_sha256'] = hashlib.sha256(open(out, 'rb').read()).hexdigest()
json.dump(REC, open(os.path.join(ROOT, 'logs', 's10-receipt.json'), 'w'), indent=1)
print('OVERLAPS', json.dumps(ov)); print('RODS', sum(1 for r in rods if 'anchor' in r), '/', len(rods)); print('S10_OK', REC['output_sha256'])
