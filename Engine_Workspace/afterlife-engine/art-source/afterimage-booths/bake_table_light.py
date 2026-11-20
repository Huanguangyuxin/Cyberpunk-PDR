"""Bake the seated table lamp's steady Lambertian footprint in the donor mesh's second UV set."""
import json
import math
from pathlib import Path
import struct
import zlib

def bake(path):
    data = path.read_bytes()
    size = struct.unpack_from('<I', data, 12)[0]
    scene = json.loads(data[20:20 + size])
    name = 'D189 table lamp local irradiance'
    if any(image.get('name') == name for image in scene['images']):
        return
    binary = bytearray(data[28 + size:][:scene['buffers'][0]['byteLength']])
    def append(payload):
        binary.extend(bytes((-len(binary)) % 4))
        view = dict(buffer=0, byteOffset=len(binary), byteLength=len(payload))
        binary.extend(payload)
        scene['bufferViews'].append(view)
        return len(scene['bufferViews']) - 1
    def values(index):
        accessor = scene['accessors'][index]
        view = scene['bufferViews'][accessor['bufferView']]
        offset = view.get('byteOffset', 0) + accessor.get('byteOffset', 0)
        return [struct.unpack_from('<3f', binary, offset+n*view.get('byteStride',12)) for n in range(accessor['count'])]
    def chunk(kind, payload):
        return struct.pack('>I',len(payload)) + kind + payload + struct.pack('>I', zlib.crc32(kind+payload))
    width = 128
    scanlines = bytearray()
    for y in range(width):
        scanlines.append(0)
        for x in range(width):
            r = 1.9*math.hypot((x+.5)/width-.5,(y+.5)/width-.5)
            energy = (1+(r/.22)**2)**-1.5 * max(0,min(1,(.9-r)/.22))
            srgb = 12.92*energy if energy<.0031308 else 1.055*energy**(1/2.4)-.055
            scanlines.append(round(255*srgb))
    png=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>2I5B',width,width,8,0,0,0,0))+chunk(b'IDAT',zlib.compress(scanlines))+chunk(b'IEND',b'')
    scene['textures'].append(dict(name=name,source=len(scene['images'])))
    scene['images'].append(dict(name=name,mimeType='image/png',bufferView=append(png)))
    slot=next(i for i,m in enumerate(scene['materials']) if m['name']=='M07 Satin aggregate table')
    scene['materials'][slot].update(emissiveFactor=[.21,.10,.043],emissiveTexture=dict(index=len(scene['textures'])-1,texCoord=1))
    # Native A/B at the foyer booth: nine restores the lit stone to the original 162/255 midtone.
    scene['materials'][slot].setdefault('extensions', {})['KHR_materials_emissive_strength']={'emissiveStrength':9}
    if 'KHR_materials_emissive_strength' not in scene.setdefault('extensionsUsed', []):
        scene['extensionsUsed'].append('KHR_materials_emissive_strength')
    for mesh in scene['meshes']:
        lamp_x=1.75 if 'Foyer' in mesh['name'] else 1.53
        for primitive in mesh['primitives']:
            if primitive['material']!=slot: continue
            attributes=primitive['attributes']
            coords=values(attributes['POSITION'])
            normals=values(attributes['NORMAL'])
            uv=b''.join(struct.pack('<2f',(p[0]-lamp_x)/1.9+.5,(p[2]+1.54)/1.9+.5) if n[1]>.6 else bytes(8) for p,n in zip(coords,normals))
            attributes['TEXCOORD_1']=len(scene['accessors'])
            scene['accessors'].append(dict(bufferView=append(uv),componentType=5126,count=len(coords),type='VEC2'))
    scene['buffers'][0]['byteLength']=len(binary)
    encoded=json.dumps(scene,ensure_ascii=False,separators=(',',':')).encode()
    encoded+=b' '*((-len(encoded))%4)
    binary.extend(bytes((-len(binary))%4))
    output=struct.pack('<4s4I',b'glTF',2,28+len(encoded)+len(binary),len(encoded),0x4E4F534A)
    path.write_bytes(output+encoded+struct.pack('<II',len(binary),0x004E4942)+binary)

if __name__=='__main__':
    import sys
    bake(Path(sys.argv[1]))
