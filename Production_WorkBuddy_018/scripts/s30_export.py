# WB018 s30: export ONLY the WB018 candidate objects to exports/WB018_lizzie_candidates.glb (not a full-scene replacement).  WorkBuddy Claude-Opus-5.5
#   Blender -b source/club-wb018-candidates.blend --python-exit-code 1 --python scripts/s30_export.py
# Same glTF settings as the WB015 exporter: Y-up, metres, apply transforms, tangents, normals, extras; no lights/cameras/animations.
import bpy, os, json, hashlib, struct
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = bpy.data.filepath; src_sha = hashlib.sha256(open(src, 'rb').read()).hexdigest()
names = sorted(o.name for o in bpy.data.collections['WB018'].objects)
bpy.ops.object.select_all(action='DESELECT')
for n in names:
    o = bpy.data.objects[n]; o.hide_set(False); o.hide_viewport = False; o.select_set(True)
out = os.path.join(ROOT, 'exports', 'WB018_lizzie_candidates.glb'); os.makedirs(os.path.dirname(out), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=True, export_yup=True, export_apply=True, export_texcoords=True, export_normals=True,
                          export_tangents=True, export_materials='EXPORT', export_image_format='AUTO', export_cameras=False, export_lights=False,
                          export_extras=True, export_animations=False, export_draco_mesh_compression_enable=False)
raw = open(out, 'rb').read(); jl = struct.unpack_from('<I', raw, 12)[0]; j = json.loads(raw[20:20 + jl])
nodes = [n.get('name') for n in j['nodes']]
R = {'author': 'WorkBuddy Claude-Opus-5.5', 'source': os.path.relpath(src, ROOT), 'source_sha256': src_sha, 'glb': os.path.relpath(out, ROOT), 'bytes': len(raw),
     'sha256': hashlib.sha256(raw).hexdigest(), 'nodes': nodes, 'materials': [m['name'] for m in j.get('materials', [])], 'images': len(j.get('images', [])),
     'lights': len(j.get('extensions', {}).get('KHR_lights_punctual', {}).get('lights', [])), 'axis': 'glTF Y-up metres; Blender (x,y,z) -> glTF (x,z,-y); node TRS identity (geometry baked at world position)'}
assert set(nodes) == set(names) and R['lights'] == 0, (nodes, names)
json.dump(R, open(os.path.join(ROOT, 'logs', 's30-export-receipt.json'), 'w'), indent=1)
print('S30_OK', R['sha256'], R['nodes'], R['materials'])
