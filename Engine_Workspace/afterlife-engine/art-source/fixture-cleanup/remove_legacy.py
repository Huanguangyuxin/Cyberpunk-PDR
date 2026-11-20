"""Remove obsolete wall displays, attached wiring and foyer furniture in the production GLB."""
import json
from pathlib import Path
import struct
import sys
import numpy as np

WALL_OWNERS = {
    'DECOR_BIG_POSTERS_PANELS','DECOR_COMPOSED_WALLS','DECOR_POSTERS','DECOR_STICKERS','DECOR_WALL_COLLAGE',
    'DECOR_WALL_HISTORY_RACEWAYS','FIX_SIDE_LIGHT_BARS_SCONCES','FIX_SOFFIT_PENDANTS','FIX_UPLIGHT_E','FIX_UPLIGHT_W',
}
def obsolete(name):
    return name in WALL_OWNERS or name.startswith(('SIGN_', 'WPANEL_', 'HTABLE_', 'DRINK_HTABLE_'))

def retired_aisle_node(name):
    return name.startswith(('RTABLE_', 'DRINK_RTABLE_')) or name == 'ARCH_COLUMNS_WB015'

def cleanup(source, target, stage_only=False):
    raw=source.read_bytes()
    size=struct.unpack_from('<I',raw,12)[0]
    g=json.loads(raw[20:20+size]);binary=bytearray(raw[28+size:])
    def data(index):
        a=g['accessors'][index];v=g['bufferViews'][a['bufferView']]
        dim={'VEC2':2,'VEC3':3,'VEC4':4,'SCALAR':1}[a['type']]
        dt=np.dtype({5121:'u1',5123:'<u2',5125:'<u4',5126:'<f4'}[a['componentType']])
        return np.ndarray((a['count'],dim),dtype=dt,buffer=binary,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',dim*dt.itemsize),dt.itemsize)).copy()
    def write(index, arr):
        a=g['accessors'][index];v=dict(g['bufferViews'][a['bufferView']]);v.pop('byteStride',None)
        binary.extend(bytes(-len(binary)%4));v.update(byteOffset=len(binary),byteLength=arr.nbytes)
        binary.extend(arr.tobytes());a.update(bufferView=len(g['bufferViews']),count=len(arr));a.pop('byteOffset',None)
        if 'min' in a:a['min']=arr.reshape(len(arr),-1).min(0).tolist()
        if 'max' in a:a['max']=arr.reshape(len(arr),-1).max(0).tolist()
        g['bufferViews'].append(v)
    original_materials={p['material'] for mesh in g['meshes'] for p in mesh['primitives']}
    def retire(name):
        return retired_aisle_node(name) or (not stage_only and obsolete(name))
    dead_nodes={i for i,n in enumerate(g['nodes']) if retire(n['name'])}
    pending=list(dead_nodes)
    while pending:
        for child in g['nodes'][pending.pop()].get('children',[]):
            if child not in dead_nodes:
                dead_nodes.add(child)
                pending.append(child)
    dropped=[g['nodes'][i]['name'] for i in sorted(dead_nodes)]
    if not stage_only:
        assert set(dropped)>=WALL_OWNERS
    mesh_ids={g['nodes'][i]['mesh'] for i in dead_nodes if 'mesh' in g['nodes'][i]}
    nodes={i:j for j,i in enumerate(i for i in range(len(g['nodes'])) if i not in dead_nodes)}
    g['nodes']=[n for i,n in enumerate(g['nodes']) if i in nodes]
    def links(obj,key,mapping):
        if key in obj:obj[key]=[mapping[n] for n in obj[key] if n in mapping]
    for n in g['nodes']:links(n,'children',nodes)
    for scene in g['scenes']:links(scene,'nodes',nodes)
    mesh_ids-={n['mesh'] for n in g['nodes'] if 'mesh' in n}
    remap={i:j for j,i in enumerate(i for i in range(len(g['meshes'])) if i not in mesh_ids)}
    removed_meshes=[g['meshes'][i]['name'] for i in sorted(mesh_ids)]
    g['meshes']=[m for i,m in enumerate(g['meshes']) if i in remap]
    for node in g['nodes']:
        if 'mesh' in node:node['mesh']=remap[node['mesh']]
    audit={}
    for node in g['nodes']:
        stage_geometry=('WB018_BASE_LED_LINES','WB018_STAGE_FLANK_PANELS')
        if node['name'] not in stage_geometry and (stage_only or node['name'] not in ('ARCH_PYLONS','BAR_COUNTER_L','MEP_TRAYS_WIRES_JBOX')):
            continue
        mesh=g['meshes'][node['mesh']];keep=[]
        for q in mesh['primitives']:
            name=node['name'];mat=g['materials'][q['material']]['name']
            pid=q['attributes']['POSITION'];pos=data(pid);iid=q['indices'];tris=data(iid).reshape(-1,3)
            if name=='WB018_STAGE_FLANK_PANELS' and mat=='M18_TALL_PANEL_PINK':
                audit[name+'/'+mat]={'removedTriangles':len(tris)}
                continue
            if name=='WB018_BASE_LED_LINES':
                # This combined mesh also includes the genuine bridge pylons and outer structural columns.
                xs=np.abs(pos[tris][:,:,0])
                kill=((xs>8.20)&(xs<8.70)).all(axis=1)
                if np.any(kill):
                    audit[name+'/'+mat]={'removedTriangles':int(sum(kill))}
                    if np.all(kill):continue
                    used,reindex=np.unique(tris[~kill].ravel(),return_inverse=True)
                    for attr in q['attributes'].values():write(attr,data(attr)[used])
                    write(iid,reindex.astype(tris.dtype).reshape(-1,1))
            if (name,mat) in [('ARCH_PYLONS','M_WALL_COLLAGE'),('ARCH_COLUMNS_WB015','WB015_M_OPAL_PINK')]:
                audit[name+'/'+mat]={'removedTriangles':len(tris)};continue
            if name=='MEP_TRAYS_WIRES_JBOX':
                xyz=pos[tris]
                kill=np.zeros(len(tris),dtype=bool)
                for xmin,z in [(-14.02,-6.),(13.86,-16.5)]:
                    lower=[xmin,3.98,z-.16];upper=[xmin+.17,8.56,z+.16]
                    kill|=np.all((xyz>=lower)&(xyz<=upper),axis=(1,2))
                if np.any(kill):
                    audit[name+'/'+mat]={'removedTriangles':int(sum(kill))}
                    if np.all(kill):continue
                    used,reindex=np.unique(tris[~kill].ravel(),return_inverse=True)
                    for a in q['attributes'].values():write(a,data(a)[used])
                    write(iid,reindex.astype(tris.dtype).reshape(-1,1))
            if name=='BAR_COUNTER_L' and mat=='M_STEEL_NAVY':
                face=np.isclose(pos[tris][:,:,0],11.,atol=.00002).all(axis=1)
                assert sum(face)==2
                used=np.unique(tris[face]);upper=used[np.isclose(pos[used,1],1.06,atol=.00002)]
                assert len(upper)==2 and not np.isin(tris[~face],upper).any()
                pos[upper,1]=.944;write(pid,pos)
                audit[name+'/'+mat]={'steelFaceX':11,'oldTop':1.06,'newTop':.944,'trimmedTriangles':2}
            keep.append(q)
        mesh['primitives']=keep
    for mesh in g['meshes']:
        if mesh['name'] not in ('ME_BOOTH_MODULE','WB015_ME_BOOTH_MODULE'):continue
        retained=[]
        for prim in mesh['primitives']:
            name=g['materials'][prim['material']]['name']
            if name in ('M_POSTER','M_STICKER','WB015_M_POSTER','WB015_M_STICKER'):
                audit[mesh['name']+'/'+name]={'removedTriangles':len(data(prim['indices']))//3}
            else:retained.append(prim)
        mesh['primitives']=retained
    def texture_refs(obj):
        if isinstance(obj,dict):
            for key,value in obj.items():
                if key.endswith('Texture') and isinstance(value,dict) and 'index' in value:yield value
                else:yield from texture_refs(value)
        elif isinstance(obj,list):
            for value in obj:yield from texture_refs(value)
    def compact(section,dead):
        source=g[section];mapping={i:j for j,i in enumerate(i for i in range(len(source)) if i not in dead)}
        g[section]=[v for i,v in enumerate(source) if i in mapping]
        return mapping
    used_materials={p['material'] for mesh in g['meshes'] for p in mesh['primitives']}
    dead_materials=original_materials-used_materials
    retired_material_names=[g['materials'][i]['name'] for i in sorted(dead_materials)]
    old_texture_refs={r['index'] for m in g['materials'] for r in texture_refs(m)}
    mids=compact('materials',dead_materials)
    for m in g['meshes']:
        for prim in m['primitives']:prim['material']=mids[prim['material']]
    refs=[r for m in g['materials'] for r in texture_refs(m)]
    dead_textures=old_texture_refs-{r['index'] for r in refs}
    old_images={t['source'] for t in g['textures']}
    tids=compact('textures',dead_textures)
    for r in refs:r['index']=tids[r['index']]
    dead_images=old_images-{t['source'] for t in g['textures']}
    retired_image_names=[g['images'][i]['name'] for i in sorted(dead_images)]
    imids=compact('images',dead_images)
    for t in g['textures']:t['source']=imids[t['source']]
    # Repack only referenced geometry and images; selectors use stable named source keys.
    live=set()
    for mesh in g['meshes']:
        for p in mesh['primitives']: live.update([p['indices'],*p['attributes'].values()])
    ids={i:j for j,i in enumerate(sorted(live))}
    g['accessors']=[a for i,a in enumerate(g['accessors']) if i in live]
    for mesh in g['meshes']:
        for p in mesh['primitives']:
            p['indices']=ids[p['indices']];p['attributes']={k:ids[v] for k,v in p['attributes'].items()}
    refs=[a for a in g['accessors'] if 'bufferView' in a]+[i for i in g['images'] if 'bufferView' in i]
    assert not any('sparse' in a for a in g['accessors']) and not g.get('animations') and not g.get('skins')
    views=sorted({r['bufferView'] for r in refs});ids={i:j for j,i in enumerate(views)}
    out=bytearray();new=[]
    for i in views:
        v=g['bufferViews'][i];offset=v.get('byteOffset',0);out.extend(bytes(-len(out)%4));new.append({**v,'byteOffset':len(out)})
        out.extend(binary[offset:offset+v['byteLength']])
    for r in refs:r['bufferView']=ids[r['bufferView']]
    g['bufferViews']=new;g['buffers'][0]['byteLength']=len(out)
    j=json.dumps(g,ensure_ascii=False,separators=(',',':')).encode();j+=b' '*(-len(j)%4);out.extend(bytes(-len(out)%4))
    target.write_bytes(struct.pack('<4s4I',b'glTF',2,28+len(j)+len(out),len(j),0x4E4F534A)+j+struct.pack('<II',len(out),0x004E4942)+out)
    return dict(removedNodes=dropped,removedMeshes=removed_meshes,changedGeometry=audit,removedMaterials=retired_material_names,removedTextures=len(dead_textures),removedImages=retired_image_names,bytesBefore=len(raw),bytesAfter=target.stat().st_size)

if __name__=='__main__':
    stage_only='--stage-aisles' in sys.argv
    src,dst,report=map(Path,[arg for arg in sys.argv[1:] if arg!='--stage-aisles'])
    report.write_text(json.dumps(cleanup(src,dst,stage_only),ensure_ascii=False,indent=2)+'\n')
