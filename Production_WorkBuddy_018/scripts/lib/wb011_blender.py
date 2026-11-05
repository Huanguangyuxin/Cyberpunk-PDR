# CURSOR-013 Blender helper library (inherited WB011 baseline by WorkBuddy Claude-Opus-5.5; D-030 material-light interaction extensions by Cursor Gemini 4 Argon Medium).
# Imported by scripts/04_build.py inside Blender 5.2.3.
import bpy, bmesh, math, os
import numpy as np
from mathutils import Matrix, Vector

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEXR = os.path.join(ROOT, 'source', 'textures')

# ======================================================================= materials
TILE = {}       # material name -> UV tile size in metres (box/cyl UV divide by this)
MATS = {}

def _img(rel, data=False):
    p = os.path.join(TEXR, rel)
    im = bpy.data.images.load(p, check_existing=True)
    if data:
        im.colorspace_settings.name = 'Non-Color'
    return im

def _gltf_group():
    g = bpy.data.node_groups.get('glTF Material Output')
    if g:
        return g
    g = bpy.data.node_groups.new('glTF Material Output', 'ShaderNodeTree')
    g.interface.new_socket('Occlusion', in_out='INPUT', socket_type='NodeSocketFloat')
    g.interface.new_socket('Thickness', in_out='INPUT', socket_type='NodeSocketFloat')
    return g

def mat(name, base=(0.5, 0.5, 0.5), rough=0.5, metal=0.0, color_tex=None, normal_tex=None, orm_tex=None, normal_strength=1.0,
        emis=None, emis_strength=0.0, emis_tex=None, alpha_tex=False, transmission=0.0, ior=1.5, thickness=None,
        absorb=None, density=0.0, tile=1.0, spec_ior_level=0.5, coat=0.0, coat_rough=0.03, backface=False):
    if name in MATS:
        return MATS[name]
    m = bpy.data.materials.new(name)
    nt = m.node_tree
    p = nt.nodes.get('Principled BSDF')
    out = nt.nodes.get('Material Output')
    L = nt.links.new
    p.inputs['Base Color'].default_value = (*base, 1.0)
    p.inputs['Roughness'].default_value = rough
    p.inputs['Metallic'].default_value = metal
    p.inputs['IOR'].default_value = ior
    p.inputs['Specular IOR Level'].default_value = spec_ior_level
    if coat:
        p.inputs['Coat Weight'].default_value = coat
        p.inputs['Coat Roughness'].default_value = coat_rough
    ct = None
    if color_tex:
        ct = nt.nodes.new('ShaderNodeTexImage'); ct.image = _img(color_tex); ct.location = (-700, 300)
        L(ct.outputs['Color'], p.inputs['Base Color'])
        if alpha_tex:
            rnd = nt.nodes.new('ShaderNodeMath'); rnd.operation = 'ROUND'
            L(ct.outputs['Alpha'], rnd.inputs[0]); L(rnd.outputs[0], p.inputs['Alpha'])
    if orm_tex:
        ot = nt.nodes.new('ShaderNodeTexImage'); ot.image = _img(orm_tex, True); ot.location = (-900, 0)
        sep = nt.nodes.new('ShaderNodeSeparateColor'); sep.location = (-600, 0)
        L(ot.outputs['Color'], sep.inputs['Color'])
        L(sep.outputs['Green'], p.inputs['Roughness']); L(sep.outputs['Blue'], p.inputs['Metallic'])
        go = nt.nodes.new('ShaderNodeGroup'); go.node_tree = _gltf_group(); go.location = (200, -300)
        L(sep.outputs['Red'], go.inputs['Occlusion'])
    if normal_tex:
        nt_ = nt.nodes.new('ShaderNodeTexImage'); nt_.image = _img(normal_tex, True); nt_.location = (-900, -300)
        nm = nt.nodes.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = normal_strength; nm.location = (-500, -300)
        L(nt_.outputs['Color'], nm.inputs['Color']); L(nm.outputs['Normal'], p.inputs['Normal'])
    if emis is not None or emis_tex:
        p.inputs['Emission Strength'].default_value = emis_strength
        if emis_tex:
            et = ct if (ct is not None and emis_tex == color_tex) else nt.nodes.new('ShaderNodeTexImage')
            if et is not ct:
                et.image = _img(emis_tex)
            L(et.outputs['Color'], p.inputs['Emission Color'])
        else:
            p.inputs['Emission Color'].default_value = (*emis, 1.0)
    if transmission > 0:
        p.inputs['Transmission Weight'].default_value = transmission
        go = None
        for n in nt.nodes:
            if n.bl_idname == 'ShaderNodeGroup' and n.node_tree and n.node_tree.name == 'glTF Material Output':
                go = n
        if go is None:
            go = nt.nodes.new('ShaderNodeGroup'); go.node_tree = _gltf_group()
        go.inputs['Thickness'].default_value = thickness if thickness is not None else 0.0
        if absorb is not None and density > 0:
            va = nt.nodes.new('ShaderNodeVolumeAbsorption'); va.inputs['Color'].default_value = (*absorb, 1.0); va.inputs['Density'].default_value = density
            L(va.outputs[0], out.inputs['Volume'])
    try:
        m.surface_render_method = 'DITHERED'   # never BLENDED (transmission + BLEND is a known engine rejection)
    except Exception:
        pass
    m.use_backface_culling = False
    TILE[name] = tile
    MATS[name] = m
    return m

def set_emission(m, strength):
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Emission Strength'].default_value = strength

# ======================================================================= mesh builder
class MB:
    def __init__(self):
        self.v = []; self.f = []; self.fm = []; self.fuv = []; self.fs = []; self.mats = []
        self.T = Matrix.Identity(4); self._stack = []

    # transform stack -------------------------------------------------
    def push(self, M):
        self._stack.append(self.T.copy()); self.T = self.T @ M
    def pop(self):
        self.T = self._stack.pop()

    def mi(self, m):
        if m not in self.mats:
            self.mats.append(m)
        return self.mats.index(m)

    def addv(self, pts):
        b = len(self.v)
        T = self.T
        for p in pts:
            self.v.append(tuple(T @ Vector(p)))
        return b

    def face(self, idx, m, uv=None, smooth=False):
        self.f.append(tuple(idx)); self.fm.append(self.mi(m)); self.fuv.append(uv); self.fs.append(smooth)

    def merge_bm(self, bm, m, smooth=False, mat_of_face=None):
        bm.verts.ensure_lookup_table()
        bm.faces.ensure_lookup_table()
        b = self.addv([v.co[:] for v in bm.verts])
        for fc in bm.faces:
            mm = mat_of_face(fc) if mat_of_face else m
            self.face([b + v.index for v in fc.verts], mm, None, smooth)

    # primitives ------------------------------------------------------
    def box(self, lo, hi, m, bevel=0.0, seg=1, smooth=False, edge_m=None):
        lo = [min(a, b) for a, b in zip(lo, hi)]; hi2 = [max(a, b) for a, b in zip(lo, hi)]; hi = hi2
        if bevel <= 0:
            x0, y0, z0 = lo; x1, y1, z1 = hi
            b = self.addv([(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0), (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)])
            for q in ((0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)):
                self.face([b + i for i in q], m)
            return
        bm = bmesh.new()
        bmesh.ops.create_cube(bm, size=1.0)
        sx, sy, sz = [h - l for l, h in zip(lo, hi)]
        cx, cy, cz = [(h + l) / 2 for l, h in zip(lo, hi)]
        for v in bm.verts:
            v.co.x = v.co.x * sx + cx; v.co.y = v.co.y * sy + cy; v.co.z = v.co.z * sz + cz
        bev = min(bevel, 0.49 * min(sx, sy, sz))
        bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bev, segments=seg, affect='EDGES', profile=0.5, clamp_overlap=True)
        bm.normal_update()
        # D-030: painted steel boxes with bevels automatically assign M_STEEL_EDGE to non-axis-aligned chamfer/edge faces
        em = edge_m
        if em is None and m.name in ('M_STEEL_BLACK', 'M_STEEL_NAVY') and 'M_STEEL_EDGE' in MATS:
            em = MATS['M_STEEL_EDGE']
        if em is not None:
            def _fmat(fc):
                nx_, ny_, nz_ = abs(fc.normal.x), abs(fc.normal.y), abs(fc.normal.z)
                return m if max(nx_, ny_, nz_) > 0.96 else em
            self.merge_bm(bm, m, smooth=seg > 1 or smooth, mat_of_face=_fmat)
        else:
            self.merge_bm(bm, m, smooth=seg > 1 or smooth)
        bm.free()

    def opal_box(self, lo, hi, m):
        """D-030 opal plastic diffuser box with explicit 0..1 face UVs so perimeter lip grime and center-to-edge LED diffusion read on every diffuser panel."""
        lo = [min(a, b) for a, b in zip(lo, hi)]; hi2 = [max(a, b) for a, b in zip(lo, hi)]; hi = hi2
        x0, y0, z0 = lo; x1, y1, z1 = hi
        b = self.addv([(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0), (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)])
        uv01 = [(0.0, 0.0), (1.0, 0.0), (1.0, 1.0), (0.0, 1.0)]
        for q in ((0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)):
            self.face([b + i for i in q], m, uv01)

    def cyl(self, c, r, h, m, segs=24, caps=True, smooth=True, r2=None, tile=None):
        """vertical cylinder/cone frustum from base centre c=(x,y,z0) height h (local Z of current transform)."""
        r2 = r if r2 is None else r2
        x, y, z = c
        bot = self.addv([(x + r * math.cos(2 * math.pi * k / segs), y + r * math.sin(2 * math.pi * k / segs), z) for k in range(segs)])
        top = self.addv([(x + r2 * math.cos(2 * math.pi * k / segs), y + r2 * math.sin(2 * math.pi * k / segs), z + h) for k in range(segs)])
        t = tile or TILE.get(m.name, 1.0)
        circ = 2 * math.pi * max(r, r2)
        for k in range(segs):
            k1 = (k + 1) % segs
            u0 = k / segs * circ / t; u1 = (k + 1) / segs * circ / t
            self.face([bot + k, bot + k1, top + k1, top + k], m, [(u0, z / t), (u1, z / t), (u1, (z + h) / t), (u0, (z + h) / t)], smooth)
        if caps:
            cb = self.addv([(x, y, z)]); ct = self.addv([(x, y, z + h)])
            for k in range(segs):
                k1 = (k + 1) % segs
                a0, a1 = 2 * math.pi * k / segs, 2 * math.pi * k1 / segs
                self.face([cb, bot + k1, bot + k], m, [(0.5 * r / t, 0.5 * r / t), (r / t * (0.5 + 0.5 * math.cos(a1)), r / t * (0.5 + 0.5 * math.sin(a1))), (r / t * (0.5 + 0.5 * math.cos(a0)), r / t * (0.5 + 0.5 * math.sin(a0)))])
                self.face([ct, top + k, top + k1], m, [(0.5 * r2 / t, 0.5 * r2 / t), (r2 / t * (0.5 + 0.5 * math.cos(a0)), r2 / t * (0.5 + 0.5 * math.sin(a0))), (r2 / t * (0.5 + 0.5 * math.cos(a1)), r2 / t * (0.5 + 0.5 * math.sin(a1)))])

    def cyl_axis(self, p0, p1, r, m, segs=12, caps=True, smooth=True):
        p0 = Vector(p0); p1 = Vector(p1); d = p1 - p0; L = d.length
        if L < 1e-6:
            return
        q = d.normalized().to_track_quat('Z', 'Y')
        M = Matrix.Translation(p0) @ q.to_matrix().to_4x4()
        self.push(M); self.cyl((0, 0, 0), r, L, m, segs, caps, smooth); self.pop()

    def lathe(self, prof, m, segs=48, v_tile=None, smooth=True, u_scale=1.0, ring_mats=None):
        """surface of revolution around local Z. prof = [(r,z),...]; r==0 only at ends (poles)."""
        rings = []
        lens = [0.0]
        for a, b in zip(prof[:-1], prof[1:]):
            lens.append(lens[-1] + math.hypot(b[0] - a[0], b[1] - a[1]))
        vt = v_tile or (lens[-1] if lens[-1] > 0 else 1.0)
        for (r, z) in prof:
            if r <= 1e-9:
                rings.append(('P', self.addv([(0.0, 0.0, z)])))
            else:
                rings.append(('R', self.addv([(r * math.cos(2 * math.pi * k / segs), r * math.sin(2 * math.pi * k / segs), z) for k in range(segs)])))
        for i in range(len(prof) - 1):
            (ta, a), (tb, b) = rings[i], rings[i + 1]
            va, vb = lens[i] / vt, lens[i + 1] / vt
            use_m = ring_mats[i] if (ring_mats and i < len(ring_mats) and ring_mats[i] is not None) else m
            for k in range(segs):
                k1 = (k + 1) % segs
                u0, u1 = k / segs * u_scale, (k + 1) / segs * u_scale
                if ta == 'R' and tb == 'R':
                    self.face([a + k, a + k1, b + k1, b + k], use_m, [(u0, va), (u1, va), (u1, vb), (u0, vb)], smooth)
                elif ta == 'P' and tb == 'R':
                    self.face([a, b + k1, b + k], use_m, [((u0 + u1) / 2, va), (u1, vb), (u0, vb)], smooth)
                elif ta == 'R' and tb == 'P':
                    self.face([a + k, a + k1, b], use_m, [(u0, va), (u1, va), ((u0 + u1) / 2, vb)], smooth)

    def tube(self, pts, r, m, segs=8, closed=False, caps=True, smooth=True, tile=None):
        P = [Vector(p) for p in pts]
        if closed and (P[0] - P[-1]).length < 1e-6:
            P = P[:-1]
        n = len(P)
        if n < 2:
            return
        tan = []
        for i in range(n):
            if closed:
                t = P[(i + 1) % n] - P[(i - 1) % n]
            else:
                t = (P[min(i + 1, n - 1)] - P[max(i - 1, 0)])
            tan.append(t.normalized())
        ref = Vector((0, 0, 1)) if abs(tan[0].z) < 0.9 else Vector((1, 0, 0))
        nrm = (ref - tan[0] * ref.dot(tan[0])).normalized()
        frames = []
        for i in range(n):
            if i > 0:
                nrm = (nrm - tan[i] * nrm.dot(tan[i])).normalized()
            frames.append((nrm.copy(), tan[i].cross(nrm).normalized()))
        if closed:
            back = (nrm - tan[0] * nrm.dot(tan[0])).normalized()
            a0 = frames[0][0]
            ang = math.atan2(tan[0].dot(a0.cross(back)), a0.dot(back))
            fr2 = []
            for i, (a, b) in enumerate(frames):
                th = -ang * i / n
                a2 = (a * math.cos(th) + b * math.sin(th)).normalized()
                fr2.append((a2, tan[i].cross(a2).normalized()))
            frames = fr2
        rings = []
        for i in range(n):
            a, b = frames[i]
            rings.append(self.addv([tuple(P[i] + (a * math.cos(2 * math.pi * k / segs) + b * math.sin(2 * math.pi * k / segs)) * r) for k in range(segs)]))
        t = tile or TILE.get(m.name, 1.0)
        s = [0.0]
        for i in range(1, n):
            s.append(s[-1] + (P[i] - P[i - 1]).length)
        last = n if closed else n - 1
        for i in range(last):
            i1 = (i + 1) % n
            v0, v1 = s[i] / t, (s[i1] if i1 > 0 else s[-1] + (P[0] - P[-1]).length) / t
            for k in range(segs):
                k1 = (k + 1) % segs
                self.face([rings[i] + k, rings[i] + k1, rings[i1] + k1, rings[i1] + k], m, [(k / segs, v0), ((k + 1) / segs, v0), ((k + 1) / segs, v1), (k / segs, v1)], smooth)
        if caps and not closed:
            for i, sgn in ((0, -1), (n - 1, 1)):
                c = self.addv([tuple(P[i])])
                for k in range(segs):
                    k1 = (k + 1) % segs
                    if sgn < 0:
                        self.face([c, rings[i] + k1, rings[i] + k], m, [(0.5, 0.5), (0.5, 0.6), (0.6, 0.5)])
                    else:
                        self.face([c, rings[i] + k, rings[i] + k1], m, [(0.5, 0.5), (0.6, 0.5), (0.5, 0.6)])

    def sphere(self, c, r, m, seg=10, rings=6):
        prof = [(r * math.sin(math.pi * i / rings), -r * math.cos(math.pi * i / rings)) for i in range(rings + 1)]
        prof[0] = (0.0, -r); prof[-1] = (0.0, r)
        self.push(Matrix.Translation(c)); self.lathe(prof, m, seg); self.pop()

    def cushion(self, lo, hi, m, rad=0.04, nx=10, ny=4, nz=3, tufts=None, tuft_depth=0.018, bulge=0.012, button_m=None, contact_m=None, seat_dip=0.0):
        """rounded, optionally tufted cushion as one closed grid box. tufts = list of (x,y) local positions on top face.
        D-030: adds radial/diamond tension creases around tufts, optional ergonomic seat_dip, and assigns contact_m (polished contact vinyl .24-.34)
        to the central contact crowns while keeping m (.38-.68) in tuft pits and flanks."""
        lo = Vector(lo); hi = Vector(hi); c = (lo + hi) / 2; h = (hi - lo) / 2
        rad = min(rad, 0.95 * min(h))
        inner = h - Vector((rad, rad, rad))
        N = (nx, ny, nz)
        idx = {}
        pts = []
        tuft_val = {}
        def P(i, j, k):
            kk = (i, j, k)
            if kk in idx:
                return idx[kk]
            q = Vector((-1 + 2 * i / nx, -1 + 2 * j / ny, -1 + 2 * k / nz))
            p = Vector((q.x * h.x, q.y * h.y, q.z * h.z))
            cl = Vector((max(-inner.x, min(inner.x, p.x)), max(-inner.y, min(inner.y, p.y)), max(-inner.z, min(inner.z, p.z))))
            d = p - cl
            p2 = cl + (d.normalized() * rad if d.length > 1e-9 else d)
            dz_total = 0.0
            if p2.z > h.z - rad * 1.01:
                fx = 1 - (p2.x / h.x) ** 2; fy = 1 - (p2.y / h.y) ** 2
                p2.z += bulge * max(fx, 0) * max(fy, 0)
                if seat_dip > 0:
                    # Ergonomic seated compression dip in the central sitting area, preserving outer/front crown height
                    dip_x = math.exp(-((p2.x / (h.x * 0.55)) ** 2))
                    dip_y = math.exp(-((p2.y / (h.y * 0.60)) ** 2))
                    p2.z -= seat_dip * dip_x * dip_y
                if tufts:
                    dz = 0.0
                    pleat = 0.0
                    for tx, ty in tufts:
                        dx_t = p2.x - tx; dy_t = p2.y - ty
                        r2_t = dx_t * dx_t + dy_t * dy_t
                        dz += math.exp(-(r2_t / (2 * 0.032 ** 2)))
                        # Radial 4-way diamond tension pleats radiating from each button tuft
                        if 1e-6 < r2_t < 0.16 ** 2:
                            ang_t = math.atan2(dy_t, dx_t)
                            ray = max(0.0, math.cos(4.0 * ang_t)) ** 3
                            env = math.exp(-r2_t / (2 * 0.085 ** 2)) * (1.0 - math.exp(-r2_t / (2 * 0.022 ** 2)))
                            pleat = max(pleat, ray * env)
                    dz_total = min(dz + 0.28 * pleat, 1.0)
                    p2.z -= tuft_depth * dz_total
            tuft_val[kk] = dz_total
            idx[kk] = len(pts); pts.append(tuple(c + p2))
            return idx[kk]

        b0 = self.addv([])  # placeholder to get base index after pts are built
        face_defs = []
        for (a, b, fixed, val, flip) in ((0, 1, 2, 0, True), (0, 1, 2, nz, False), (0, 2, 1, 0, False), (0, 2, 1, ny, True), (1, 2, 0, 0, True), (1, 2, 0, nx, False)):
            na, nb = N[a], N[b]
            is_top = (fixed == 2 and val == nz)
            for i in range(na):
                for j in range(nb):
                    def g(ii, jj):
                        t = [0, 0, 0]; t[a] = ii; t[b] = jj; t[fixed] = val
                        return P(*t), tuple(t)
                    (v0, k0), (v1, k1), (v2, k2), (v3, k3) = g(i, j), g(i + 1, j), g(i + 1, j + 1), g(i, j + 1)
                    q = [v0, v1, v2, v3]
                    if flip:
                        q = q[::-1]
                    use_m = m
                    if is_top and contact_m is not None:
                        u_mid = (i + 0.5) / na; v_mid = (j + 0.5) / nb
                        avg_tuft = 0.25 * (tuft_val[k0] + tuft_val[k1] + tuft_val[k2] + tuft_val[k3])
                        # Contact zone: central sitting/leaning area outside deep button pits
                        if 0.14 <= u_mid <= 0.86 and 0.14 <= v_mid <= 0.86 and avg_tuft < 0.32:
                            use_m = contact_m
                    face_defs.append((q, use_m))
        b0 = self.addv(pts)
        for q, use_m in face_defs:
            self.face([b0 + i for i in q], use_m, None, True)
        if tufts and button_m:
            for tx, ty in tufts:
                self.sphere((c.x + tx, c.y + ty, c.z + h.z - tuft_depth + bulge * 0.3), 0.009, button_m, 8, 4)

    def stitch_strip(self, p0, p1, normal, width, m, lift=0.0008):
        """D-030: physical stitch thread ribbon along a cushion seam from p0 to p1, lifted by `lift` along `normal`."""
        p0 = Vector(p0); p1 = Vector(p1); nrm = Vector(normal).normalized()
        d = p1 - p0; L = d.length
        if L < 1e-6:
            return
        t = d / L
        side = nrm.cross(t).normalized() * (width * 0.5)
        off = nrm * lift
        a0 = p0 + off - side; a1 = p0 + off + side; a2 = p1 + off + side; a3 = p1 + off - side
        u_max = L / TILE.get(m.name, 0.10)
        b = self.addv([tuple(a0), tuple(a1), tuple(a2), tuple(a3)])
        self.face([b, b + 1, b + 2, b + 3], m, [(0.0, 0.0), (0.0, 1.0), (u_max, 1.0), (u_max, 0.0)], False)

    def quad(self, p0, p1, p2, p3, m, uv=((0, 0), (1, 0), (1, 1), (0, 1))):
        b = self.addv([p0, p1, p2, p3]); self.face([b, b + 1, b + 2, b + 3], m, list(uv))

    def plate(self, w, h, t, m, uv_rect=(0, 0, 1, 1), back_m=None):
        """thin closed plate in local XZ (front face toward -Y), width w (X), height h (Z), thickness t (Y). front face carries uv_rect."""
        x0, x1, z0, z1 = -w / 2, w / 2, -h / 2, h / 2
        u0, v0, u1, v1 = uv_rect
        b = self.addv([(x0, 0, z0), (x1, 0, z0), (x1, 0, z1), (x0, 0, z1), (x0, t, z0), (x1, t, z0), (x1, t, z1), (x0, t, z1)])
        self.face([b, b + 1, b + 2, b + 3], m, [(u0, v0), (u1, v0), (u1, v1), (u0, v1)])
        bm_ = back_m or m
        for q in ((5, 4, 7, 6), (4, 0, 3, 7), (1, 5, 6, 2), (3, 2, 6, 7), (4, 5, 1, 0)):
            self.face([b + i for i in q], bm_, [(0, 0), (0.01, 0), (0.01, 0.01), (0, 0.01)])

    # build -----------------------------------------------------------
    def build(self, name, smooth_angle=35.0):
        me = bpy.data.meshes.new(name)
        me.from_pydata(self.v, [], self.f)
        me.validate(clean_customdata=False)
        for mm in self.mats:
            me.materials.append(mm)
        nf = len(me.polygons)
        if nf != len(self.f):
            raise RuntimeError(f'{name}: polygon count changed by validate {len(self.f)} -> {nf}')
        me.polygons.foreach_set('material_index', self.fm)
        me.polygons.foreach_set('use_smooth', [True] * nf)
        uvl = me.uv_layers.new(name='UVMap')
        co = np.array(self.v, np.float64)
        uvs = np.zeros((len(me.loops), 2), np.float64)
        li = 0
        for fi, poly in enumerate(self.f):
            given = self.fuv[fi]
            n = len(poly)
            if given is not None:
                uvs[li:li + n] = given
            else:
                P = co[list(poly)]
                nrm = np.cross(P[1] - P[0], P[2] - P[0]) if n >= 3 else np.array([0, 0, 1.0])
                if np.linalg.norm(nrm) < 1e-12 and n > 3:
                    nrm = np.cross(P[2] - P[0], P[3] - P[0])
                ax = int(np.argmax(np.abs(nrm)))
                t = TILE.get(self.mats[self.fm[fi]].name, 1.0)
                if ax == 0:
                    uv = P[:, [1, 2]] * (1 if nrm[0] > 0 else -1, 1)
                elif ax == 1:
                    uv = P[:, [0, 2]] * (-1 if nrm[1] > 0 else 1, 1)
                else:
                    uv = P[:, [0, 1]] * (1, 1 if nrm[2] > 0 else -1)
                uvs[li:li + n] = uv / t
            li += n
        uvl.data.foreach_set('uv', uvs.ravel())
        me.set_sharp_from_angle(angle=math.radians(smooth_angle))
        me.update()
        return me

def obj(name, data, coll, loc=(0, 0, 0), rot=(0, 0, 0), parent=None):
    o = bpy.data.objects.new(name, data)
    o.location = loc; o.rotation_euler = [math.radians(a) for a in rot]
    coll.objects.link(o)
    if parent is not None:
        o.parent = parent
    return o

def empty(name, coll, loc=(0, 0, 0), rot=(0, 0, 0), parent=None):
    o = bpy.data.objects.new(name, None)
    o.empty_display_size = 0.2
    o.location = loc; o.rotation_euler = [math.radians(a) for a in rot]
    coll.objects.link(o)
    if parent is not None:
        o.parent = parent
    return o

_COLLS = {}
def coll(name, parent=None):
    if name in _COLLS:
        return _COLLS[name]
    c = bpy.data.collections.new(name)
    (parent or bpy.context.scene.collection).children.link(c)
    _COLLS[name] = c
    return c
