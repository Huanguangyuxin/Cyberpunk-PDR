"""Check the actual production GLB, including slot assignment and UV domain for each table."""
from pathlib import Path
import struct
import json
import zlib
import sys

def verify(path):
    data=path.read_bytes()
    size=struct.unpack_from('<I',data,12)[0]
    scene=json.loads(data[20:20+size])
    binary=data[28+size:]
    def payload(view):
        v=scene['bufferViews'][view]
        start=v.get('byteOffset',0)
        return binary[start:start+v['byteLength']]
    def rows(index,n):
        a=scene['accessors'][index]
        raw=payload(a['bufferView'])
        stride=scene['bufferViews'][a['bufferView']].get('byteStride',4*n)
        return [struct.unpack_from('<'+'f'*n,raw,a.get('byteOffset',0)+i*stride) for i in range(a['count'])]
    table=next(i for i,m in enumerate(scene['materials']) if m['name']=='M07 Satin aggregate table')
    texture=scene['materials'][table]['emissiveTexture']
    assert texture['texCoord']==1
    image=scene['images'][scene['textures'][texture['index']]['source']]
    png=payload(image['bufferView'])
    width,height=struct.unpack_from('>II',png,16)
    offset=8
    while png[offset+4:offset+8]!=b'IDAT':
        offset+=12+struct.unpack_from('>I',png,offset)[0]
    pixels=zlib.decompress(png[offset+8:offset+8+struct.unpack_from('>I',png,offset)[0]])
    def sample(u,v):
        x=round(min(1,max(0,u))*(width-1))
        y=round(min(1,max(0,v))*(height-1))
        s=pixels[y*(width+1)+1+x]/255
        return s/12.92 if s<.04045 else ((s+.055)/1.055)**2.4
    report=[]
    for mesh in scene['meshes']:
        assert sum(p['material']==table for p in mesh['primitives'])==1
        attr=next(p['attributes'] for p in mesh['primitives'] if p['material']==table)
        positions,normals,uv=rows(attr['POSITION'],3),rows(attr['NORMAL'],3),rows(attr['TEXCOORD_1'],2)
        lampX=1.75 if 'Foyer' in mesh['name'] else 1.53
        face=[]
        for pos,n,(u,v) in zip(positions,normals,uv):
            if n[1]<=.6:
                assert sample(u,v)==0
            else:
                assert abs((u-.5)*1.9+lampX-pos[0])<1e-5 and abs((v-.5)*1.9-1.54-pos[2])<1e-5
                face.append((u,v))
        assert min(u for u,v in face)<.5<max(u for u,v in face)
        assert min(v for u,v in face)<.5<max(v for u,v in face)
        assert sample(.5,.5)>.97 and min(sample(*t) for t in face)<.03
        report.append(dict(mesh=mesh['name'],receiverVertices=len(face),tableCentreUnderLamp=sample(.5,.5),darkestTableEdge=min(sample(*t) for t in face),verticalAndUndersideEmission=0,uv=1))
    return report

if __name__=='__main__': print(json.dumps(verify(Path(sys.argv[1])),indent=2))
