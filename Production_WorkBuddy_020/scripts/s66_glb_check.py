# WB020 s66: check the exported (triangulated) GLB: indexed normals unit, tangents unit/orthogonal/w=+-1, UV not degenerate, per-object closed
# solids with positive volume, and coplanar same-direction triangles between different emissive/metal objects. WorkBuddy Claude-Opus-5.5
import sys, json, struct, hashlib, os, collections
import numpy as np
p = sys.argv[1]; raw = open(p, 'rb').read(); jl = struct.unpack_from('<I', raw, 12)[0]; j = json.loads(raw[20:20 + jl]); BIN = raw[20 + jl + 8:]
CT = {5126: 'f4', 5123: 'u2', 5125: 'u4'}; NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}
def acc(i):
    a = j['accessors'][i]; bv = j['bufferViews'][a['bufferView']]; n = NC[a['type']]; off = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    return np.frombuffer(BIN, dtype=np.dtype(CT[a['componentType']]).newbyteorder('<'), count=a['count'] * n, offset=off).reshape(a['count'], n).astype(float)
R = {'glb': p, 'sha256': hashlib.sha256(raw).hexdigest(), 'objects': {}}; planes = {}
for nd in j['nodes']:
    if 'mesh' not in nd: continue
    T = np.array(nd.get('translation', [0, 0, 0]))
    allP = []; allI = []; base = 0; o = {}
    for pr in j['meshes'][nd['mesh']]['primitives']:
        P = acc(pr['attributes']['POSITION']); N = acc(pr['attributes']['NORMAL']); UV = acc(pr['attributes']['TEXCOORD_0']); TG = acc(pr['attributes']['TANGENT']); I = acc(pr['indices']).astype(int).reshape(-1, 3)
        used = np.unique(I)
        o['bad_normal'] = int((np.abs(np.linalg.norm(N[used], axis=1) - 1) > 1e-3).sum())
        o['bad_tangent_len'] = int((np.abs(np.linalg.norm(TG[used, :3], axis=1) - 1) > 1e-3).sum())
        o['bad_ortho'] = int((np.abs((N[used] * TG[used, :3]).sum(1)) > 1e-3).sum()); o['bad_w'] = int((np.abs(np.abs(TG[used, 3]) - 1) > 1e-6).sum())
        a = UV[I[:, 1]] - UV[I[:, 0]]; b = UV[I[:, 2]] - UV[I[:, 0]]; o['uv_degenerate_tris'] = int((np.abs(a[:, 0] * b[:, 1] - a[:, 1] * b[:, 0]) < 1e-12).sum())
        o['tris'] = len(I); allP.append(P + T); allI.append(I + base); base += len(P)
    P = np.concatenate(allP); I = np.concatenate(allI)
    key = {}; rem = np.zeros(len(P), int); V = []
    for k, q in enumerate(np.round(P, 6)):
        t = tuple(q); rem[k] = key.setdefault(t, len(V))
        if rem[k] == len(V): V.append(P[k])
    V = np.array(V); TI = rem[I]
    ec = collections.Counter(tuple(sorted((int(t[k]), int(t[(k + 1) % 3])))) for t in TI for k in range(3))
    o['open_or_multi_edges'] = sum(1 for v in ec.values() if v != 2)
    o['signed_volume_m3'] = round(float(np.einsum('ij,ij->i', V[TI[:, 0]], np.cross(V[TI[:, 1]], V[TI[:, 2]])).sum() / 6), 6)
    fn = np.cross(V[TI[:, 1]] - V[TI[:, 0]], V[TI[:, 2]] - V[TI[:, 0]]); ln = np.linalg.norm(fn, axis=1); ok = ln > 1e-12; fn[ok] /= ln[ok, None]
    zf = np.abs(fn[:, 2]) > 0.999                                              # faces facing glTF +-Z (front/back planes)
    planes[nd['name']] = sorted({(round(float(V[t[0], 2]), 4), int(np.sign(fn[i, 2]))) for i, t in enumerate(TI) if zf[i]})
    R['objects'][nd['name']] = o
names = list(planes); shared = []
for i in range(len(names)):
    for k in range(i + 1, len(names)):
        s = set(planes[names[i]]) & set(planes[names[k]])
        if s: shared.append([names[i], names[k], sorted(s)])
R['z_planes'] = planes; R['shared_same_direction_z_planes_between_objects'] = shared
json.dump(R, open(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'logs', 's66-glb-check.json'), 'w'), ensure_ascii=False, indent=1)
for n, o in R['objects'].items(): print(n, o)
print('SHARED_PLANES', shared)
