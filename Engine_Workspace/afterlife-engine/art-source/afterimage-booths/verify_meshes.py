"""Inspect indexed GLB attributes, material slots and the connected upholstery shell."""
from collections import Counter
import hashlib
import json
from pathlib import Path
import struct
import numpy as np
from bench import build_bench, end_lens
from upholstery import build_backrest

source = Path(__file__).resolve().parent
asset = source.parents[1]/'assets'/'D189-Afterimage-Booths.glb'
payload = asset.read_bytes()
length = struct.unpack_from('<I', payload, 12)[0]
doc = json.loads(payload[20:20+length])
binary = memoryview(payload)[28+length:]
widths = {'SCALAR':1, 'VEC2':2, 'VEC3':3, 'VEC4':4}
types = {5121:'u1',5123:'<u2',5125:'<u4',5126:'<f4'}
def read(index):
    acc=doc['accessors'][index]
    view=doc['bufferViews'][acc['bufferView']]
    dtype=np.dtype(types[acc['componentType']])
    width=widths[acc['type']]
    offset=view.get('byteOffset',0)+acc.get('byteOffset',0)
    return np.ndarray((acc['count'],width),dtype,binary,offset,
                      (view.get('byteStride',dtype.itemsize*width),dtype.itemsize))
results=[]
for mesh in doc['meshes']:
    tris=0
    minimum_uv=1.
    worst_orthogonality=0.
    worst_normal_agreement=1.
    slots=[]
    for prim in mesh['primitives']:
        idx=read(prim['indices']).ravel()
        attr={k:read(v) for k,v in prim['attributes'].items()}
        pos,n,uv,t=(attr[k][idx].astype('float64') for k in ('POSITION','NORMAL','TEXCOORD_0','TANGENT'))
        for a in [pos,n,uv,t]:assert np.isfinite(a).all(),mesh['name']
        assert np.max(np.abs(np.linalg.norm(n,axis=1)-1))<1e-4
        assert np.max(np.abs(np.linalg.norm(t[:,:3],axis=1)-1))<1e-4
        ortho=np.max(np.abs((n*t[:,:3]).sum(axis=1)))
        assert ortho<1e-3,(mesh['name'],ortho)
        assert np.all(np.abs(t[:,3])==1)
        worst_orthogonality=max(worst_orthogonality,ortho)
        coordinates=pos.reshape(-1,3,3)
        geometric=np.cross(coordinates[:,1]-coordinates[:,0],coordinates[:,2]-coordinates[:,0])
        double_areas=np.linalg.norm(geometric, axis=1)
        assert double_areas.min()>1e-12,mesh['name']
        face_normals=geometric/double_areas[:,None]
        smooth_normals=n.reshape(-1,3,3).mean(axis=1)
        normal_agreement=(face_normals*smooth_normals).sum(axis=1).min()
        assert normal_agreement>0,mesh['name']
        worst_normal_agreement=min(worst_normal_agreement,normal_agreement)
        tex=uv.reshape(-1,3,2)
        ab,ac=tex[:,1]-tex[:,0],tex[:,2]-tex[:,0]
        uv_area=np.abs(ab[:,0]*ac[:,1]-ab[:,1]*ac[:,0])
        assert (uv_area>1e-12).all(),(mesh['name'],np.min(uv_area))
        minimum_uv=min(minimum_uv,np.min(uv_area))
        tris+=len(idx)//3
        slots.append(doc['materials'][prim['material']]['name'])
    components = []
    def check_solid(vertices, faces, uv, smooth, materials=None):
        edges = Counter((a, b) for f in faces for a, b in zip(f, f[1:] + f[:1]))
        assert all(count == 1 and edges[b, a] == 1 for (a, b), count in edges.items())
        assert len(vertices) - len(edges) // 2 + len(faces) == 2
        triangles = [[f[0], f[j], f[j + 1]] for f in faces for j in range(1, len(f) - 1)]
        a, b, c = np.array(vertices)[np.array(triangles)].transpose(1, 0, 2)
        areas = np.linalg.norm(np.cross(b - a, c - a), axis=1)
        volume = float((a * np.cross(b, c)).sum() / 6.)
        assert areas.min() > 1e-12 and volume > 0.
        components.append({'signedVolumeM3':volume, 'triangles':len(triangles)})
    vip = 'VIP' in mesh['name']
    foyer = 'Foyer' in mesh['name']
    build_bench(vip, foyer, check_solid, 'leather', 'welt', 'enamel', 'bronze', 'amber', 'lens', 'smoke')
    build_backrest(vip, foyer, check_solid)
    end_lens(1.95 if vip else 2.13, .12, check_solid, 'bronze', 'glass')
    end_lens(1.95 if vip else 1.56 if foyer else 1.14, 2.45, check_solid, 'bronze', 'glass')
    names = ['seat', 'kick', 'outer shell', 'backrest', 'end lens A', 'end lens B']
    results.append({'name':mesh['name'],'triangles':tris,'materials':slots,
                    'minUvDoubleArea':minimum_uv,'maxNormalTangentDot':worst_orthogonality,
                    'minExportFaceNormalAgreement':worst_normal_agreement,
                    'closedOrientedBackrest':True, 'closedOrientedSolids':dict(zip(names, components))})
sidedness = {m['name']:m.get('doubleSided',False) for m in doc['materials']}
assert [n for n, double in sidedness.items() if double] == ['M04 Smoked safety glazing']
print(json.dumps({'sha256':hashlib.sha256(payload).hexdigest(),'doubleSided':sidedness,'meshes':results},indent=2))
