# WB020 s65 (D066 wedge A, from s30): export ONLY the LED sign (collection WB020_EXPORT) to exports/WB020_STAGE_LED_WEDGE_A.glb.  WorkBuddy Claude-Opus-5.5
import bpy, os, json, hashlib, struct
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = bpy.data.filepath; ssha = hashlib.sha256(open(src, 'rb').read()).hexdigest()
bpy.ops.object.select_all(action='DESELECT')
names = [o.name for o in bpy.data.collections['WB020_EXPORT'].objects]
for n in names: bpy.data.objects[n].select_set(True)
out = os.path.join(ROOT, 'exports', 'WB020_STAGE_LED_WEDGE_A.glb')
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=True, export_yup=True, export_apply=True, export_texcoords=True, export_normals=True,
                          export_tangents=True, export_materials='EXPORT', export_cameras=False, export_lights=False, export_extras=True, export_animations=False,
                          export_draco_mesh_compression_enable=False)
raw = open(out, 'rb').read(); jl = struct.unpack_from('<I', raw, 12)[0]; j = json.loads(raw[20:20 + jl])
mats = {m['name']: {'emissiveFactor': m.get('emissiveFactor'), 'emissive_strength': m.get('extensions', {}).get('KHR_materials_emissive_strength', {}).get('emissiveStrength'),
                    'doubleSided': m.get('doubleSided', False), 'baseColor': m.get('pbrMetallicRoughness', {}).get('baseColorFactor'),
                    'metal': m.get('pbrMetallicRoughness', {}).get('metallicFactor'), 'rough': m.get('pbrMetallicRoughness', {}).get('roughnessFactor')} for m in j['materials']}
nodes = [{'name': n.get('name'), 'translation': n.get('translation'), 'rotation': n.get('rotation'), 'children': [j['nodes'][c]['name'] for c in n.get('children', [])]} for n in j['nodes']]
tris = 0; bbmin = [1e9] * 3; bbmax = [-1e9] * 3
for m in j['meshes']:
    for p in m['primitives']:
        tris += j['accessors'][p['indices']]['count'] // 3
        a = j['accessors'][p['attributes']['POSITION']]; bbmin = [min(x, y) for x, y in zip(bbmin, a['min'])]; bbmax = [max(x, y) for x, y in zip(bbmax, a['max'])]
R = {'author': 'WorkBuddy Claude-Opus-5.5', 'source': os.path.relpath(src, ROOT), 'source_sha256': ssha, 'glb': os.path.relpath(out, ROOT), 'bytes': len(raw),
     'sha256': hashlib.sha256(raw).hexdigest(), 'extensionsUsed': j.get('extensionsUsed', []), 'nodes': nodes, 'materials': mats, 'triangles': tris,
     'mesh_local_bbox_gltf': [bbmin, bbmax], 'lights': 0 if 'KHR_lights_punctual' not in j.get('extensions', {}) else 'PRESENT'}
assert all(n['name'].startswith('WB020_STAGE_LED_') for n in nodes) and R['lights'] == 0
json.dump(R, open(os.path.join(ROOT, 'logs', 's65-export-wedge-receipt.json'), 'w'), ensure_ascii=False, indent=1)
print('S30_OK', R['sha256'], R['extensionsUsed'], tris, [n['name'] for n in nodes]); print(json.dumps(mats))
