# WB020 s60 (D066): real 3D build of the user-selected wordmark A (mechanical wedge). Author/executor: WorkBuddy Claude-Opus-5.5.
#   Blender -b --factory-startup --python-exit-code 1 --python scripts/s60_build_wedge_A.py
# Sole glyph authority: design/wordmark/tiangong_A_wedge.svg (SHA 27171007...). Polygons are read from the SVG paths (1 unit = 1 mm); no font is used.
# Per character: all stroke prisms are UNIONED (exact boolean) into ONE closed dark-metal solid (no stacked coplanar caps), 2 mm bevel on outer edges,
# then a recessed LED channel (union of 16 mm inward offsets of the strokes) is cut 8 mm deep; a pink-violet diffuser (union of 17 mm offsets) sits in it
# (front 4 mm below the rim, 1 mm off the channel walls). A few cyan side-edge strips sit on downward-facing baseline edges.
# The old bright rectangular cabinet is NOT rebuilt: letters hang on two dark rails behind them, using the r1 wall fixing points (lower arms x+-2.0 through
# the backdrop joints, upper L-arms x+-0.8/+-2.2 over the panel tops, safety rods x+-1.5 to the roof slab at 8.598).
# Outputs: source/WB020_stage_led_wedge_A.blend, logs/s60-receipt.json.  Root and envelope as r1: Blender (0, 43.71, 4.04) = glTF (0, 4.04, -43.71).
import bpy, bmesh, os, re, json, math, hashlib
from mathutils import Vector
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SVG = os.path.join(ROOT, 'design', 'wordmark', 'tiangong_A_wedge.svg')
svg_sha = hashlib.sha256(open(SVG, 'rb').read()).hexdigest()
assert svg_sha.startswith('271710071f4a'), svg_sha
sc = bpy.context.scene; sc.unit_settings.system = 'METRIC'
REC = {'author': 'WorkBuddy Claude-Opus-5.5', 'blender': bpy.app.version_string, 'decision': 'D-066', 'glyph_source': os.path.relpath(SVG, ROOT), 'glyph_source_sha256': svg_sha}
RP = Vector((0.0, 43.71, 4.04))
Y_FRONT, Y_BACK = 43.725, 43.775                     # 50 mm metal letter body
Y_GROOVE0, Y_GROOVE1 = 43.700, 43.733                # channel floor 8 mm below the rim
Y_LED0, Y_LED1 = 43.729, 43.737                      # diffuser front 4 mm below the rim, 4 mm embedded behind the floor
Y_CY0, Y_CY1 = 43.738, 43.748                        # cyan side strips on the side wall (inside the flat band between bevels)
INSET_G, INSET_L = 0.016, 0.017
BEVEL = 0.002

# ------------------------------------------------------------------ parse SVG (authoritative polygons)
txt = open(SVG, encoding='utf-8').read()
CH = {}
for g in re.finditer(r'<g id="char_(.)" data-codepoint="U\+([0-9A-F]+)">(.*?)</g>', txt):
    ch, cp, body = g.group(1), g.group(2), g.group(3); assert ord(ch) == int(cp, 16)
    strokes = []
    for m in re.finditer(r'<path id=".+?_([a-z0-9_]+)" d="([^"]+)"/>', body):      # run4 fix: non-greedy prefix (was dropping 'na_'/'shou_' parts of stroke ids)
        pts = [(float(a), float(b)) for a, b in re.findall(r'[ML]\s*([-\d.]+)\s+([-\d.]+)', m.group(2))]
        P = [((x - 2800.0) / 1000.0, 4.04 - (y - 750.0) / 1000.0) for x, y in pts]        # world x, world z
        strokes.append((m.group(1), P))
    CH[ch] = strokes
assert ''.join(CH) == '\u5929\u5de5\u5f15\u64ce', list(CH)
assert '<path d=' not in txt.split('<mask')[1].split('</mask>')[0], 'A has no mask cuts (checked)'
REC['strokes_per_char'] = {c: len(s) for c, s in CH.items()}

def area(P): return 0.5 * sum(P[i][0] * P[(i + 1) % len(P)][1] - P[(i + 1) % len(P)][0] * P[i][1] for i in range(len(P)))
def ccw(P): return P if area(P) > 0 else P[::-1]
def pip(P, x, z):
    c = False; n = len(P)
    for i in range(n):
        (ax, az), (bx, bz) = P[i], P[(i + 1) % n]
        if (az > z) != (bz > z) and x < (bx - ax) * (z - az) / (bz - az) + ax: c = not c
    return c
def seg_x(a, b, c, d):
    def o(p, q, r): return (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])
    return (o(a, b, c) * o(a, b, d) < 0) and (o(c, d, a) * o(c, d, b) < 0)
def inset(P, d):
    P = ccw(P); n = len(P); L = []
    for i in range(n):
        a, b = Vector(P[i]), Vector(P[(i + 1) % n]); e = (b - a).normalized(); nin = Vector((-e.y, e.x))       # left normal = inside for CCW
        L.append((a + nin * d, e))
    Q = []
    for i in range(n):
        (p1, e1), (p2, e2) = L[i - 1], L[i]
        den = e1.x * e2.y - e1.y * e2.x
        if abs(den) < 1e-9: Q.append(tuple(p2)); continue
        t = ((p2.x - p1.x) * e2.y - (p2.y - p1.y) * e2.x) / den; q = p1 + e1 * t; Q.append((q.x, q.y))
    if area(Q) <= 0.15 * area(P) or not all(pip(P, *q) for q in Q): return None
    for i in range(n):
        for j in range(i + 2, n):
            if i == 0 and j == n - 1: continue
            if seg_x(Q[i], Q[(i + 1) % n], Q[j], Q[(j + 1) % n]): return None
    return Q

# ------------------------------------------------------------------ mesh helpers
COL = bpy.data.collections.new('WB020_EXPORT'); sc.collection.children.link(COL)
TMP = bpy.data.collections.new('WB020_TMP'); sc.collection.children.link(TMP)
def prism_obj(name, P, y0, y1, coll, bevel=0.0):
    bm = bmesh.new(); P = ccw(P)
    f = [bm.verts.new((x, y0, z)) for x, z in P]; b = [bm.verts.new((x, y1, z)) for x, z in P]
    cf = bm.faces.new(f); cb_ = bm.faces.new(b[::-1])
    n = len(P)
    for i in range(n): bm.faces.new((f[i], b[i], b[(i + 1) % n], f[(i + 1) % n]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    if bevel > 0:      # perimeter (cap<->side) edges only; side corner edges keep the knife tips sharp. Inner chamfers vanish in the later union.
        caps = {cf, cb_}; edges = [e for e in bm.edges if any(fc in caps for fc in e.link_faces)]
        bmesh.ops.bevel(bm, geom=edges, offset=bevel, segments=1, profile=0.5, affect='EDGES', clamp_overlap=True)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); coll.objects.link(o); return o
def union_of(objs, name):
    base = objs[0]
    if len(objs) > 1:
        sub = bpy.data.collections.new(name + '_OPS'); sc.collection.children.link(sub)
        for o in objs[1:]:
            for c in o.users_collection: c.objects.unlink(o)
            sub.objects.link(o)
        m = base.modifiers.new('U', 'BOOLEAN'); m.operation = 'UNION'; m.solver = 'EXACT'; m.operand_type = 'COLLECTION'; m.collection = sub
    bpy.context.view_layer.update(); dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(base.evaluated_get(dg)); me.name = name
    o = bpy.data.objects.new(name, me); TMP.objects.link(o); return o
def apply_mod(o, mod_setup):
    m = mod_setup(o); bpy.context.view_layer.update(); dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(o.evaluated_get(dg)); o.modifiers.clear(); old = o.data; o.data = me; bpy.data.meshes.remove(old)
def solid_stats(me):
    bm = bmesh.new(); bm.from_mesh(me); bm.normal_update()
    nm = sum(1 for e in bm.edges if len(e.link_faces) != 2)
    vol = bm.calc_volume(signed=True); bm.free(); return nm, vol

# ------------------------------------------------------------------ build per character
bodies, leds, stats = [], [], {}
bevel_ok = {}; weld_fix = []; core_mode = {}
skipped = []
for ch, strokes in CH.items():
    so = [prism_obj(f'S_{ch}_{n}', P, Y_FRONT, Y_BACK, TMP, BEVEL) for n, P in strokes]   # run6: bevel per stroke before union (post-union bevel failed on 引/擎)
    body = union_of(so, f'BODY_{ch}')
    bm = bmesh.new(); bm.from_mesh(body.data)
    bmesh.ops.dissolve_limit(bm, angle_limit=math.radians(0.5), verts=bm.verts[:], edges=bm.edges[:])
    bm.to_mesh(body.data); bm.free(); body.data.update(); bevel_ok[ch] = 'per-stroke 2 mm perimeter bevel before union'
    gro, ledp = [], []
    for n, P in strokes:
        # v2 (after v1 renders read as pale filled blocks): narrow LED core 36 mm in from each edge so the dark metal face dominates;
        # strokes too narrow for that fall back to the v1 16/17 mm channel
        g = inset(P, 0.035); l = inset(P, 0.036); core_mode[f'{ch}_{n}'] = 'core36'
        if g is None or l is None:
            g = inset(P, INSET_G); l = inset(P, INSET_L); core_mode[f'{ch}_{n}'] = 'channel17'
        if g is None or l is None: skipped.append(f'{ch}_{n}'); core_mode[f'{ch}_{n}'] = 'none'; continue
        gro.append(prism_obj(f'G_{ch}_{n}', g, Y_GROOVE0, Y_GROOVE1, TMP)); ledp.append(prism_obj(f'L_{ch}_{n}', l, Y_LED0, Y_LED1, TMP))
    cut = union_of(gro, f'GROOVE_{ch}')
    def diff(o, cut=cut):
        m = o.modifiers.new('D', 'BOOLEAN'); m.operation = 'DIFFERENCE'; m.solver = 'EXACT'; m.object = cut; return m
    cut.hide_render = True; apply_mod(body, diff)
    # run2: 擎 kept 3 open edges after the exact difference (sub-0.02 mm slivers); weld + dissolve degenerate, report where any remain
    bm = bmesh.new(); bm.from_mesh(body.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=2e-5); bmesh.ops.dissolve_degenerate(bm, edges=bm.edges[:], dist=2e-5)
    bad = [e for e in bm.edges if len(e.link_faces) != 2]
    if bad and all(e.calc_length() < 0.001 for e in bad):        # run6: 0.34 mm sliver where two stroke chamfers met (引) -> sub-mm weld, recorded
        bmesh.ops.remove_doubles(bm, verts=list({v for e in bad for v in e.verts}), dist=6e-4); bmesh.ops.dissolve_degenerate(bm, edges=bm.edges[:], dist=6e-4)
        weld_fix.append({'char': ch, 'edges': len(bad)}); bad = [e for e in bm.edges if len(e.link_faces) != 2]
    if not bad:   # run12: 1 zero-tangent sliver on BODY -> merge coplanar fragments and drop sub-0.05 mm degenerates (same as LED)
        bmesh.ops.dissolve_limit(bm, angle_limit=math.radians(0.5), verts=bm.verts[:], edges=bm.edges[:]); bmesh.ops.dissolve_degenerate(bm, edges=bm.edges[:], dist=5e-5)
        bad = [e for e in bm.edges if len(e.link_faces) != 2]
    if bad: print('OPEN_EDGES', ch, [tuple(round(c, 4) for c in ((e.verts[0].co + e.verts[1].co) / 2)) for e in bad][:12], [round(e.calc_length(), 5) for e in bad][:12])
    bm.to_mesh(body.data); bm.free(); body.data.update()
    led = union_of(ledp, f'LED_{ch}')
    # run8: exact-union LED had near-duplicate vertices inside faces (sub-0.01 mm slivers) -> weld/dissolve then triangulate here and verify
    bm = bmesh.new(); bm.from_mesh(led.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-5); bmesh.ops.dissolve_degenerate(bm, edges=bm.edges[:], dist=1e-5)
    bmesh.ops.dissolve_limit(bm, angle_limit=math.radians(0.5), verts=bm.verts[:], edges=bm.edges[:])   # run10: merge coplanar fragments before triangulating (2 zero-tangent slivers)
    bmesh.ops.triangulate(bm, faces=bm.faces[:], quad_method='BEAUTY', ngon_method='BEAUTY'); bmesh.ops.dissolve_degenerate(bm, edges=bm.edges[:], dist=5e-5)   # run9: 1 zero-tangent sliver at 1e-5
    bm.to_mesh(led.data); bm.free(); led.data.update()
    nmb, vb = solid_stats(body.data); nml, vl = solid_stats(led.data)
    stats[ch] = {'body_non_manifold_edges': nmb, 'body_volume_m3': round(vb, 6), 'led_non_manifold_edges': nml, 'led_volume_m3': round(vl, 6),
                 'body_faces': len(body.data.polygons), 'led_faces': len(led.data.polygons)}
    assert nmb == 0 and nml == 0 and vb > 0 and vl > 0, (ch, stats[ch])
    bodies.append(body); leds.append(led)
REC['bevel_applied'] = bevel_ok; REC['led_core_mode'] = core_mode; REC['submm_weld_fixes'] = weld_fix; REC['per_char'] = stats; REC['strokes_without_led_channel'] = skipped

# ------------------------------------------------------------------ cyan side-edge strips (downward-facing baseline edges, on the union boundary)
def in_char(ch, x, z): return any(pip(P, x, z) for _, P in CH[ch])
cy_polys = []
for ch, names in (('\u5929', ('heng2', 'na_blade')), ('\u5de5', ('heng_bottom',)), ('\u5f15', ('gong_hook',)), ('\u64ce', ('shou_h2', 'pu_na'))):
    for n, P in CH[ch]:
        if n not in names: continue
        P = ccw(P); best = None
        for i in range(len(P)):
            a, b = Vector(P[i]), Vector(P[(i + 1) % len(P)]); e = b - a; Lg = e.length; d = e / Lg; nout = Vector((d.y, -d.x))
            if nout.y < -0.80 and Lg > 0.15 and not in_char(ch, *((a + b) / 2 + nout * 0.006)):
                if best is None or Lg > best[0]: best = (Lg, a, d, nout)
        if best:
            Lg, a, d, nout = best; t0, t1 = 0.04, min(Lg - 0.04, 0.04 + 0.62 * Lg)
            q = [a + d * t0 - nout * 0.002, a + d * t1 - nout * 0.002, a + d * t1 + nout * 0.004, a + d * t0 + nout * 0.004]
            cy_polys.append((f'{ch}_{n}', [(p.x, p.y) for p in q], round(t1 - t0, 3)))
REC['cyan_strips'] = [(n, l) for n, _, l in cy_polys]

# ------------------------------------------------------------------ carrier (rails, hangers, arms, wall plates, safety rods, PSUs, standoffs) - r1 fixing points
cb = bmesh.new()
def box(lo, hi):
    r = bmesh.ops.create_cube(cb, size=1.0); vs = r['verts']
    for v in vs:
        v.co = Vector(((lo[0] + hi[0]) / 2 + v.co.x * (hi[0] - lo[0]), (lo[1] + hi[1]) / 2 + v.co.y * (hi[1] - lo[1]), (lo[2] + hi[2]) / 2 + v.co.z * (hi[2] - lo[2])))
RY0, RY1 = 43.780, 43.830; RAILS = ((3.675, 3.725), (4.335, 4.385))
for z0, z1 in RAILS: box((-2.70, RY0, z0), (2.70, RY1, z1))
for xa in (-2.0, 2.0):                                                     # lower: link down to the r1 arm through the 40 mm backdrop joint
    box((xa - 0.011, 43.797, 3.41), (xa + 0.011, 43.813, 3.70)); box((xa - 0.0125, 43.795, 3.40), (xa + 0.0125, 43.994, 3.50));   # run9: link/arm faces no longer coplanar
    box((xa - 0.012, 43.992, 3.36), (xa + 0.012, 43.998, 3.54))
for xa in (-2.2, -0.8, 0.8, 2.2):                                          # upper: hanger flat up to the r1 L-arm above the panel tops
    box((xa - 0.018, 43.792, 4.36), (xa + 0.018, 43.818, 4.89)); box((xa - 0.02, 43.790, 4.86), (xa + 0.02, 43.994, 4.90)); box((xa - 0.06, 43.992, 4.84), (xa + 0.06, 43.998, 5.00))
for xr in (-1.5, 1.5):                                                     # safety rods to the roof slab (r1 x, plate 2 mm off the slab)
    box((xr - 0.004, 43.801, 4.38), (xr + 0.004, 43.809, 8.594)); box((xr - 0.04, 43.765, 8.590), (xr + 0.04, 43.845, 8.598))
    box((xr + 0.012, 43.799, 4.38), (xr + 0.024, 43.811, 8.58))           # power conduit beside the rod
for xp in (-0.4, 0.4):                                                     # LED drivers on the rail backs (hidden behind the letters)
    box((xp - 0.16, 43.829, 3.92), (xp + 0.16, 43.874, 4.12)); box((xp - 0.006, 43.829, 4.12), (xp + 0.006, 43.841, 4.34))
nso = 0
for ch, strokes in CH.items():                                             # standoffs letter back -> rail front (both embedded 3 mm)
    xs = [p[0] for _, P in strokes for p in P]; x0, x1 = min(xs), max(xs)
    for z0, z1 in RAILS:
        zc = (z0 + z1) / 2; got = []
        for k in range(1, 40):
            x = x0 + (x1 - x0) * k / 40
            if all(in_char(ch, x + dx, zc + dz) for dx in (-0.02, 0.02) for dz in (-0.02, 0.02)) and all(abs(x - g) > 0.18 for g in got): got.append(x)
        for x in got[:3]:
            box((x - 0.015, Y_BACK - 0.003, zc - 0.015), (x + 0.015, RY0 + 0.003, zc + 0.015)); nso += 1
me_c = bpy.data.meshes.new('ME_WB020_STAGE_LED_WEDGE_CARRIER'); cb.to_mesh(me_c); cb.free()
REC['standoffs'] = nso

# ------------------------------------------------------------------ materials
def mat(name, base, rough, metal=0.0, emis=None, strength=0.0):
    m = bpy.data.materials.new(name); p = m.node_tree.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value = (*base, 1); p.inputs['Roughness'].default_value = rough; p.inputs['Metallic'].default_value = metal
    if emis: p.inputs['Emission Color'].default_value = (*emis, 1); p.inputs['Emission Strength'].default_value = strength
    m.use_backface_culling = True; return m
M_BODY = mat('WB020_M_WEDGE_METAL', (0.055, 0.052, 0.062), 0.32, 0.90)
M_LED = mat('WB020_M_WEDGE_LED_PINK', (0.40, 0.03, 0.30), 0.40, 0.0, (1.0, 0.06, 0.62), 3.5)   # v2: deeper pink-violet (v1 (0.95,0.10,0.78)x4 read pale)
M_CY = mat('WB020_M_WEDGE_EDGE_CYAN', (0.45, 0.85, 1.0), 0.35, 0.0, (0.05, 0.72, 1.0), 4.0)
M_CAR = mat('WB020_M_WEDGE_CARRIER', (0.035, 0.036, 0.040), 0.45, 0.80)

# ------------------------------------------------------------------ assemble export objects (geometry relative to ROOT)
root = bpy.data.objects.new('WB020_STAGE_LED_ROOT', None); COL.objects.link(root); root.location = RP; root.empty_display_size = 0.3
root['wb020'] = 'D066 wordmark A wedge; place at glTF (0, 4.04, -43.71); faces +Z toward the dance floor'
def finalize(name, me_list, m):
    bm = bmesh.new()
    for me in me_list: bm.from_mesh(me)
    for v in bm.verts: v.co -= RP
    bmesh.ops.triangulate(bm, faces=bm.faces[:], quad_method='BEAUTY', ngon_method='BEAUTY')   # run7: concave n-gons made the glTF exporter drop TANGENT on BODY/LED
    # run3: welding while merging pieces fused near-coincident LED vertices into 2 non-manifold edges -> pieces are merged without welding
    me = bpy.data.meshes.new('ME_' + name); bm.to_mesh(me); bm.free(); me.materials.append(m)
    uv = me.uv_layers.new(name='UVMap')
    for p in me.polygons:
        ax = max(range(3), key=lambda i: abs(p.normal[i]))
        for li in p.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co; uv.data[li].uv = [c for i, c in enumerate(co) if i != ax]
        p.use_smooth = False
    o = bpy.data.objects.new(name, me); COL.objects.link(o); o.parent = root; o['wb020'] = 'WorkBuddy Claude-Opus-5.5 D066'; return o
o_body = finalize('WB020_STAGE_LED_WEDGE_BODY', [b.data for b in bodies], M_BODY)
o_led = finalize('WB020_STAGE_LED_WEDGE_LED', [l.data for l in leds], M_LED)
cyo = [prism_obj(f'CY_{n}', P, Y_CY0, Y_CY1, TMP) for n, P, _ in cy_polys]
o_cy = finalize('WB020_STAGE_LED_WEDGE_EDGE_CYAN', [c.data for c in cyo], M_CY)
o_car = finalize('WB020_STAGE_LED_WEDGE_CARRIER', [me_c], M_CAR)
for c in [c for c in bpy.data.collections if c.name.startswith(('WB020_TMP', 'BODY_', 'GROOVE_', 'LED_'))]:
    for o in list(c.objects): bpy.data.objects.remove(o)
    bpy.data.collections.remove(c)

# whole-object checks after merge
def tri(o): return sum(len(p.vertices) - 2 for p in o.data.polygons)
for o in (o_body, o_led, o_cy):
    nm, v = solid_stats(o.data); REC.setdefault('merged_checks', {})[o.name] = {'non_manifold_edges': nm, 'volume_m3': round(v, 6)}
    assert nm == 0 and v > 0, (o.name, nm, v)
REC['objects'] = {o.name: {'tris': tri(o), 'material': o.data.materials[0].name} for o in (o_body, o_led, o_cy, o_car)}
REC['tris_total'] = sum(v['tris'] for v in REC['objects'].values()); assert REC['tris_total'] < 70000
bb = [o_body.matrix_world @ Vector(c) for c in o_body.bound_box] if False else None
ws = [RP + v.co for v in o_body.data.vertices]
REC['letters_bbox_world_blender'] = {'x': [round(min(p.x for p in ws), 4), round(max(p.x for p in ws), 4)], 'y': [Y_FRONT, Y_BACK], 'z': [round(min(p.z for p in ws), 4), round(max(p.z for p in ws), 4)]}
REC['layers_y_world'] = {'letter_front_rim': Y_FRONT, 'channel_floor': Y_GROOVE1, 'led_front': Y_LED0, 'led_back_embedded': Y_LED1, 'letter_back': Y_BACK, 'cyan_strip': [Y_CY0, Y_CY1],
                         'rail_front': RY0, 'rail_back': RY1, 'driver_back': 43.874, 'vertical_bars_front_existing': 43.89}
REC['bevel_m'] = BEVEL; REC['channel'] = {'inset_m': '0.035 core (fallback 0.016)', 'depth_m': Y_GROOVE1 - Y_FRONT, 'led_inset_m': '0.036 core (fallback 0.017)', 'led_recess_m': round(Y_LED0 - Y_FRONT, 4)}
REC['emission'] = {'WB020_M_WEDGE_LED_PINK': [[1.0, 0.06, 0.62], 3.5], 'WB020_M_WEDGE_EDGE_CYAN': [[0.05, 0.72, 1.0], 4.0], 'metal': 'none', 'note': 'HDR emissive only; no halo geometry/texture'}
REC['pbr'] = {'WB020_M_WEDGE_METAL': {'base': [0.055, 0.052, 0.062], 'metallic': 0.9, 'rough': 0.32}, 'WB020_M_WEDGE_CARRIER': {'metallic': 0.8, 'rough': 0.45}}
out = os.path.join(ROOT, 'source', 'WB020_stage_led_wedge_A.blend'); assert not os.path.exists(out) or True
bpy.ops.wm.save_as_mainfile(filepath=out, compress=True)
REC['output'] = os.path.relpath(out, ROOT); REC['output_sha256'] = hashlib.sha256(open(out, 'rb').read()).hexdigest()
json.dump(REC, open(os.path.join(ROOT, 'logs', 's60-receipt.json'), 'w'), ensure_ascii=False, indent=1)
print('S60_OK', REC['output_sha256'], json.dumps(REC['objects']), 'skipped', skipped, 'cyan', REC['cyan_strips'], 'standoffs', nso)
