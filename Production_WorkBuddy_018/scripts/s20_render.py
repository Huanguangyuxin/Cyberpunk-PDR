# WB018 s20: fixed-source fixed-camera DCC before/after renders (Blender Cycles; NOT Engine images).  WorkBuddy Claude-Opus-5.5
#   before: Blender -b source/baseline/club-wb015-upper-final_0de38371.blend --python scripts/s20_render.py -- --tag before
#   after : Blender -b source/club-wb018-candidates.blend               --python scripts/s20_render.py -- --tag after
# Identical settings: source native lights + emissive as saved in each file, NO haze/world fill, AgX Medium High Contrast, exposure 1.45, 96 spp, 1600x900.
# Camera matrices are built from the fixed pos/aim table below (same numbers in both runs); nothing is saved back.
import bpy, sys, os, json, math, time, hashlib
from mathutils import Vector
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
TAG = argv[argv.index('--tag') + 1]
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'renders', TAG); os.makedirs(OUT, exist_ok=True)
sc = bpy.context.scene; src = bpy.data.filepath; sha0 = hashlib.sha256(open(src, 'rb').read()).hexdigest()
sc.render.engine = 'CYCLES'
pr = bpy.context.preferences.addons['cycles'].preferences; pr.compute_device_type = 'METAL'; pr.get_devices()
for d in pr.devices:
    d.use = d.type == 'METAL'
sc.cycles.device = 'GPU'; sc.cycles.samples = 96; sc.cycles.use_adaptive_sampling = True; sc.cycles.adaptive_threshold = 0.02; sc.cycles.use_denoising = True
sc.cycles.max_bounces = 10; sc.cycles.glossy_bounces = 6; sc.cycles.diffuse_bounces = 4; sc.cycles.transmission_bounces = 14
sc.render.resolution_x = 1600; sc.render.resolution_y = 900; sc.render.resolution_percentage = 100
sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_depth = '8'
sc.view_settings.view_transform = 'AgX'
try:
    sc.view_settings.look = 'AgX - Medium High Contrast'
except Exception:
    pass
sc.view_settings.exposure = 1.45
for c in bpy.context.view_layer.layer_collection.children:
    if c.name == 'CALIB':
        c.exclude = True
CAMS = [  # id, pos, aim, hfov  (Blender Z-up metres; eye 1.64 m)
    ('CAM01_ENTRANCE', [0.0, 1.1, 1.64], [1.2, 20.0, 2.0], 75),
    ('WB018_FRONT_UP', [1.0, 3.0, 1.64], [0.4, 12.5, 6.3], 75),
    ('WB018_PYLON_BASE', [-1.6, 15.8, 1.64], [-5.2, 21.0, 0.35], 60),
    ('CAM04B_DEEP_UNDER_BRIDGE', [0.0, 24.2, 1.64], [0.0, 44.0, 2.7], 75),
    ('WB018_STAGE_FLANK', [2.2, 32.6, 1.64], [7.4, 44.0, 3.3], 70),
]
REC = []
for cid, p, a, hf in CAMS:
    cd = bpy.data.cameras.new('R_' + cid); cd.sensor_fit = 'HORIZONTAL'; cd.sensor_width = 36.0; cd.angle = math.radians(hf); cd.clip_start = 0.03; cd.clip_end = 200
    co = bpy.data.objects.new('R_' + cid, cd); sc.collection.objects.link(co); co.location = p
    co.rotation_euler = (Vector(a) - Vector(p)).to_track_quat('-Z', 'Y').to_euler(); bpy.context.view_layer.update()
    sc.camera = co; f = os.path.join(OUT, f'{cid}_{TAG}.png'); sc.render.filepath = f
    t = time.time(); bpy.ops.render.render(write_still=True)
    REC.append({'camera': cid, 'pos': p, 'aim': a, 'hfov_deg': hf, 'matrix_world': [[round(v, 6) for v in r] for r in co.matrix_world],
                'file': os.path.relpath(f, ROOT), 'sha256': hashlib.sha256(open(f, 'rb').read()).hexdigest(), 'seconds': round(time.time() - t, 1)})
    print('RENDERED', cid, flush=True)
assert hashlib.sha256(open(src, 'rb').read()).hexdigest() == sha0
json.dump({'author': 'WorkBuddy Claude-Opus-5.5', 'kind': 'Blender DCC render, NOT ForgeaX Engine', 'source': os.path.relpath(src, ROOT), 'source_sha256': sha0,
           'renderer': f'Blender {bpy.app.version_string} Cycles Metal 96spp adaptive .02 OIDN 1600x900 AgX MHC exposure 1.45, no haze, no extra lights',
           'renders': REC}, open(os.path.join(OUT, f'render-receipt-{TAG}.json'), 'w'), indent=1)
print('S20_OK', TAG, len(REC))
