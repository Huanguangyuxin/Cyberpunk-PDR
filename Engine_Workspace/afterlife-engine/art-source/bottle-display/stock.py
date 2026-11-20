"""Rebuild the D189 backbar from its unmodified UGit D189 primary GLB."""
import io
import json
import math
import struct
import sys
from collections import defaultdict
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

BRANDS = [
    ('NIGHT', 'STATIC', 'PLUM LIQUEUR', '#342137', '#f6ded3', '#da9cae', 0),
    ('CRIMSON', 'PULSE', 'BITTER APERITIF', '#642b27', '#ffedcc', '#e7a373', 1),
    ('CLEAR', 'CUT', 'DRY VODKA', '#dbd7be', '#182e35', '#597a78', 2),
    ('COPPER', 'RELAY', 'MALT WHISKY', '#293b43', '#efd6ad', '#d4966b', 0),
    ('LOW', 'TIDE', 'COASTAL GIN', '#315954', '#f2ecd2', '#a2b49a', 2),
    ('VESPER', 'No. 4', 'VERMOUTH DRY', '#e2cfb0', '#4a232a', '#885450', 1),
    ('AFTER', 'HOURS', 'DARK RUM', '#28251f', '#e4c38b', '#998567', 1),
    ('GLASS', 'LINE', 'BLANC VERMOUTH', '#a5b9ac', '#132f38', '#456b6b', 2),
]
# One through five staggered display positions, different density on each shelf.
DISPLAY = [
    [[.10,.23,.57,.75],[.20,.39,.78],[.12,.46,.63,.81],[.16,.32,.60,.80]],
    [[.13,.34,.515,.78],[.10,.27,.53,.76,.88],[.24,.46,.80],[.11,.34,.64,.83]],
    [[.18,.43,.76],[.12,.32,.66,.82],[.12,.25,.50,.76,.87],[.21,.42,.70]],
]
TEMPLATES = [31,36,45]
SHAPES = [(.0354,.045,.165,1.15),(.0484,.040,.145,.74),(.0384,.035,.155,1.07)]


def atlas():
    font = '/System/Library/Fonts/Avenir Next Condensed.ttc'
    def typeface(size, bold=False):
        return ImageFont.truetype(font, size, index=1 if bold else 0)
    image = Image.new('RGB', (2048,1024))
    for k,(name, second, kind, paper, ink, accent, _) in enumerate(BRANDS):
        tile = Image.new('RGB',(360,490),paper)
        d = ImageDraw.Draw(tile)
        d.rectangle((21,20,338,468),outline=accent,width=3)
        d.text((180,54),'AFTERIMAGE   /   CELLARS',fill=ink,font=typeface(18),anchor='mm')
        x,y=180,155
        if k%4==0:
            for radius in (47,34,21):
                d.arc((x-radius,y-radius,x+radius,y+radius),-62,244,fill=accent,width=5)
        elif k%4==1:
            for shift in (-20,0,20):
                d.line([(x-58,y+shift),(x-22,y+shift),(x-5,y-23+shift),(x+12,y+20+shift),(x+31,y+shift),(x+58,y+shift)],fill=accent,width=4)
        elif k%4==2:
            for shift in (-27,0,27):
                d.polygon([(x+shift,y-42),(x+shift+14,y),(x+shift,y+42),(x+shift-14,y)],outline=accent,width=3)
        else:
            for shift in (-25,0,25):
                d.arc((x-52,y-36+shift,x+52,y+36+shift),180,357,fill=accent,width=5)
        for title,base in ((name,242),(second,300)):
            d.text((180,base),title,fill=ink,font=typeface(53,True),anchor='mm',stroke_width=1)
        d.line((65,350,295,350),fill=accent,width=3)
        d.text((180,383),kind,fill=ink,font=typeface(23),anchor='mm')
        d.text((180,433),f'LOT  0{k+1}     /     700 mL',fill=ink,font=typeface(17),anchor='mm')
        image.paste(tile.resize((512,512),Image.Resampling.LANCZOS),((k%4)*512,(k//4)*512))
    raw=io.BytesIO()
    image.save(raw,format='PNG')
    return raw.getvalue()


def rebuild(source, target):
    with source.open('rb') as f:
        f.seek(12)
        length,_=struct.unpack('<II',f.read(8))
        g=json.loads(f.read(length))
        length,_=struct.unpack('<II',f.read(8))
        binary=bytearray(f.read(length))
    def view(data,target=None):
        binary.extend(bytes(-len(binary)%4))
        item={'buffer':0,'byteOffset':len(binary),'byteLength':len(data)}
        if target:
            item['target']=target
        g['bufferViews'].append(item)
        binary.extend(data)
        return len(g['bufferViews'])-1
    def attr(values,kind,dtype,component,target):
        arr=np.array(values,dtype=dtype)
        item={'bufferView':view(arr.tobytes(),target),'componentType':component,'count':len(arr),'type':kind}
        if kind=='VEC3':
            item.update(min=arr.min(0).tolist(),max=arr.max(0).tolist())
        g['accessors'].append(item)
        return len(g['accessors'])-1
    def patch(k):
        radius,low,high,angle=SHAPES[BRANDS[k][-1]]
        positions=[]; normals=[]; tangents=[]; uvs=[]; indices=[]
        for j in range(33):
            t=j/32; a=(2*t-1)*angle
            co,si=math.cos(a),math.sin(a)
            for h,v in ((low,1),(high,0)):
                positions.append((-radius*co,h,radius*si))
                normals.append((-co,0,si))
                tangents.append((si,0,co,-1))
                uvs.append(((k%4+.006+.988*t)/4,(k//4+.006+.988*v)/2))
            if j:
                v=2*j-2
                indices.extend((v,v+2,v+3,v,v+3,v+1))
        attributes={key:attr(vals,kind,'<f4',5126,34962) for key,vals,kind in (
            ('POSITION',positions,'VEC3'),('NORMAL',normals,'VEC3'),('TANGENT',tangents,'VEC4'),('TEXCOORD_0',uvs,'VEC2'))}
        return {'attributes':attributes,'indices':attr(indices,'SCALAR','<u2',5123,34963),'material':39}
    assert 'animations' not in g and 'skins' not in g
    assert g['materials'][39]['name']=='M_LABEL'
    paper=g['materials'][39]
    paper.pop('normalTexture',None)
    paper['doubleSided']=False
    paper['pbrMetallicRoughness']['roughnessFactor']=.91
    img=next(im for im in g['images'] if im['name']=='LABEL_ATLAS')
    img['bufferView']=view(atlas())
    labels=list(TEMPLATES)
    for k in range(8):
        if k<3:
            mesh=g['meshes'][labels[k]]
        else:
            mesh={'name':'ME_'+BRANDS[k][0]+'_'+BRANDS[k][1].replace(' ','').replace('.','')+'_LABEL'}
            labels.append(len(g['meshes']))
            g['meshes'].append(mesh)
        mesh['primitives']=[patch(k)]
    nodes=g['nodes']
    roots={i for i,n in enumerate(nodes) if n['name'].startswith('DRINK_SHELF') and n.get('children')}
    assert len(roots)==239,'Use the pristine D189 GLB as source.'
    pools=defaultdict(list)
    for i in sorted(roots):
        lab=next(nodes[j] for j in nodes[i]['children'] if nodes[j]['name'].endswith('_LABEL'))
        pools[(int(nodes[i]['name'][11])-1,TEMPLATES.index(lab['mesh']))].append((i,lab))
    parts={}
    for (_,family),pool in pools.items():
        sample=nodes[pool[0][0]]
        parts[family]={nodes[j]["name"].rsplit("_",1)[-1]:nodes[j]["mesh"] for j in sample["children"]}
    keep=set()
    for tier,bays in enumerate(DISPLAY):
        for bay,positions in enumerate(bays):
            for j,p in enumerate(positions):
                style=(tier*3+bay*5+j*3+(j//3))%8
                family=BRANDS[style][-1]
                pool=pools[tier,family] or next(pool for (row,_),pool in pools.items() if row==tier and pool)
                i,lab=pool.pop(0)
                for child in nodes[i]["children"]:
                    entry=nodes[child]
                    entry["mesh"]=parts[family][entry["name"].rsplit("_",1)[-1]]
                n=nodes[i]
                n['translation']=[13.55+(.035*((j+bay)%3)),n['translation'][1],-(5.225+bay*2.1+p*2.05)]
                ang=(-.13,.019,.16,-.023,.105)[(j+tier+bay)%5]
                n['rotation']=[0,math.sin(ang/2),0,math.cos(ang/2)]
                w=(.91,1.08,.98,1.13)[(style+j)%4]
                h=(.94,1.05,.88,1.0)[(j+bay)%4]
                if tier==2 and family==0: h=min(h,.89)
                n['scale']=[w,h,w]
                lab['mesh']=labels[style]
                keep.add(i)
    drop=(roots-keep)|{j for i in roots-keep for j in nodes[i]['children']}
    mapping={old:new for new,old in enumerate(i for i in range(len(nodes)) if i not in drop)}
    def remap(indices):return [mapping[i] for i in indices if i not in drop]
    for n in nodes:
        if 'children' in n:n['children']=remap(n['children'])
    for scene in g['scenes']:scene['nodes']=remap(scene['nodes'])
    g['nodes']=[n for i,n in enumerate(nodes) if i not in drop]
    g['buffers'][0]['byteLength']=len(binary)
    binary.extend(bytes(-len(binary)%4))
    header=json.dumps(g,separators=(',',':'),ensure_ascii=False).encode()
    header+=b' '*(-len(header)%4)
    temp=target.with_suffix('.partial')
    with temp.open('wb') as f:
        f.write(struct.pack('<4sIIII',b'glTF',2,28+len(header)+len(binary),len(header),0x4e4f534a))
        f.write(header);f.write(struct.pack('<II',len(binary),0x004e4942));f.write(binary)
    temp.replace(target)
    print('shelf bottles',len(keep),'of',len(roots),'label designs',len(labels))

if __name__=='__main__':
    rebuild(Path(sys.argv[1]),Path(sys.argv[2]))
