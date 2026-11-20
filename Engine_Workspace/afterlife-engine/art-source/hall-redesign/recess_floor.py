"""Cut the dance basin into the authored hall mesh, retaining its PBR UVs and asset IDs."""
from pathlib import Path
import json
import struct
import numpy as np

path = Path(__file__).resolve().parents[2] / 'assets/Club_Upper_WB015_bcf6514f.glb'
with path.open('rb') as f:
    f.seek(12)
    size, _ = struct.unpack('<II', f.read(8))
    doc = json.loads(f.read(size))
    size, _ = struct.unpack('<II', f.read(8))
    data = bytearray(f.read(size))
if doc.get('extras', {}).get('d189Basin') == 1:
    raise SystemExit('Basin already installed')

types = {5126:'<f4', 5123:'<u2', 5125:'<u4'}
dims = {'SCALAR':1, 'VEC2':2, 'VEC3':3, 'VEC4':4}
def read(i):
    a = doc['accessors'][i]
    v = doc['bufferViews'][a['bufferView']]
    return np.ndarray((a['count'],dims[a['type']]),types[a['componentType']],data,
                      v.get('byteOffset',0)+a.get('byteOffset',0),
                      (v.get('byteStride',dims[a['type']]*np.dtype(types[a['componentType']]).itemsize),np.dtype(types[a['componentType']]).itemsize)).copy()

def put(values, old):
    a = doc['accessors'][old].copy()
    buf = np.array(values,dtype=types[a['componentType']]).reshape(-1,dims[a['type']])
    data.extend(bytes((-len(data))%4))
    offset = len(data)
    data.extend(buf.tobytes())
    view = {'buffer':0,'byteOffset':offset,'byteLength':buf.nbytes}
    a.update(bufferView=len(doc['bufferViews']),byteOffset=0,count=len(buf))
    for key, fn in [('min',np.min),('max',np.max)]:
        if key in a: a[key]=fn(buf,axis=0).tolist()
    doc['bufferViews'].append(view)
    doc['accessors'].append(a)
    return len(doc['accessors'])-1

# Clip a triangle against each hole boundary; retain the outside pieces
# and continue cutting only the still-inside polygon. Attributes interpolate together.
def split(poly, axis, boundary, sign):
    inside,outside=[],[]
    for v,w in zip(poly,poly[1:]+poly[:1]):
        d=(v[axis]-boundary)*sign
        e=(w[axis]-boundary)*sign
        (inside if d>=0 else outside).append(v)
        if d*e<0:
            crossing=v+(w-v)*(d/(d-e));inside.append(crossing);outside.append(crossing)
        elif d==0:
            outside.append(v)
    return inside,outside

bounds=[(0,-5.58,1),(0,5.58,-1),(2,-37.45,1),(2,-25.25,-1)]
for node in doc['nodes']:
    name=node.get('name')
    if name not in ('ARCH_FLOOR_SLAB','ARCH_FLOOR_PATCHES','ARCH_DANCE_FLOOR'):continue
    for prim in doc['meshes'][node['mesh']]['primitives']:
        attrs=prim['attributes']
        if name=='ARCH_DANCE_FLOOR':
            xyz=read(attrs['POSITION'])
            xyz[:,1]-=.306
            attrs['POSITION']=put(xyz,attrs['POSITION'])
            continue
        keys=['POSITION',*[k for k in attrs if k!='POSITION']]
        arrays=[read(attrs[k]) for k in keys]
        verts=np.concatenate(arrays,axis=1).astype(float)
        retained=[]
        for triangle in read(prim['indices']).reshape(-1,3):
            poly=list(verts[triangle])
            for axis,limit,sign in bounds:
                if len(poly)<3:break
                poly,outside=split(poly,axis,limit,sign)
                for i in range(1,len(outside)-1):
                    a,b,c=outside[0],outside[i],outside[i+1]
                    if np.linalg.norm(np.cross(b[:3]-a[:3],c[:3]-a[:3]))>1e-10:
                        retained.extend([a,b,c])
        result=np.array(retained)
        start=0
        for key,arr in zip(keys,arrays):
            width=arr.shape[1]
            attrs[key]=put(result[:,start:start+width],attrs[key])
            start+=width
        prim['indices']=put(np.arange(len(result)),prim['indices'])
doc.setdefault('extras',{})['d189Basin']=1
doc['buffers'][0]['byteLength']=len(data)
data.extend(bytes((-len(data))%4))
header=json.dumps(doc,separators=(',',':'),ensure_ascii=False).encode()
header+=b' '*((-len(header))%4)
temp=path.with_suffix('.basin-temp')
with temp.open('wb') as f:
    f.write(struct.pack('<4sIIII',b'glTF',2,28+len(header)+len(data),len(header),0x4e4f534a))
    f.write(header);f.write(struct.pack('<II',len(data),0x004e4942));f.write(data)
temp.replace(path)
