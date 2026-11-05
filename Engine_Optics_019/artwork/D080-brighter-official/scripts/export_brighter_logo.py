"""Re-export the official plaque with a stronger emissive face."""
from hashlib import sha256
import json
from pathlib import Path
import bpy

root = Path(__file__).resolve().parents[1]
source = Path(bpy.data.filepath)
material = bpy.data.materials['D077_Official_ForgeAX_E8692C']
emission = material.node_tree.nodes['Principled BSDF'].inputs['Emission Strength']
assert abs(emission.default_value - 1.85) < 1e-5
emission.default_value = 2.75

origin = bpy.data.objects['PDR_Official_ForgeAX_Root']
bpy.ops.object.select_all(action='DESELECT')
for obj in [origin, *origin.children_recursive]:
    obj.select_set(True)
bpy.context.view_layer.objects.active = origin
bpy.context.preferences.filepaths.save_version = 0
blend = root / 'source/PDR_FORGEAX_OFFICIAL_D080.blend'
glb = root / 'exports/PDR_FORGEAX_OFFICIAL_D080.glb'
bpy.ops.wm.save_as_mainfile(filepath=str(blend), compress=True)
bpy.ops.export_scene.gltf(filepath=str(glb), export_format='GLB', use_selection=True,
                         export_yup=True, export_normals=True, export_tangents=True,
                         export_texcoords=True, export_cameras=False, export_lights=False,
                         export_animations=False, export_extras=True)
(root / 'logs/export.json').write_text(json.dumps({
    'sourceSha256':sha256(source.read_bytes()).hexdigest(),
    'blendSha256':sha256(blend.read_bytes()).hexdigest(),
    'glbSha256':sha256(glb.read_bytes()).hexdigest(),
    'emissiveStrengthBefore':1.85, 'emissiveStrengthAfter':2.75,
}, indent=2) + '\n')
