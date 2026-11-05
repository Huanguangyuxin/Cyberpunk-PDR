# WB018 s05: ORIGINAL procedural acoustic "basket-weave" wall panel textures (editable source = this script + design/acoustic_weave.svg).
# Not copied from any game asset: generic woven-slat geometry written here. WorkBuddy Claude-Opus-5.5
#   /Applications/Blender.app/Contents/Resources/5.2/python/bin/python3.13 scripts/s05_textures.py
# Tile = 0.60 m panel module; 2x2 cells, each cell 4 slats, alternating horizontal/vertical. Outputs 1024 px colour (sRGB), normal (OpenGL +Y), ORM (R=AO,G=rough,B=metal).
import os, json, hashlib
import numpy as np
import OpenImageIO as oiio
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'textures'); os.makedirs(OUT, exist_ok=True)
N = 1024; rng = np.random.default_rng(1802)
yy, xx = np.mgrid[0:N, 0:N].astype(np.float32) + 0.5
cell = N / 2; nsl = 5; gap = 0.58                        # slat gap fraction of slat pitch
cx = (xx % cell) / cell; cy = (yy % cell) / cell
ci = (xx // cell).astype(int); cj = (yy // cell).astype(int)
horiz = ((ci + cj) % 2 == 0)
along = np.where(horiz, cy, cx) * nsl                      # coordinate across slats
across = np.where(horiz, cx, cy)
f = along % 1.0
slat = np.clip(np.minimum(f - gap / 2, 1 - gap / 2 - f) / 0.02, 0, 1)   # 1 on slat, 0 in groove
edge = np.clip(np.minimum(across, 1 - across) / 0.02, 0, 1)                # cell border groove
slat *= edge
# slat profile: rounded top (height), small per-slat tone variation and grime in grooves
prof = np.sin(np.clip((f - gap / 2) / (1 - gap), 0, 1) * np.pi) * slat
sid = (np.floor(along) + ci * 7 + cj * 13).astype(int)
tone = (0.80 + 0.12 * rng.random(64))[sid % 64]
lowf = np.clip(np.sin(xx / N * 6.1 + 1.3) * np.sin(yy / N * 4.7 + 0.4) * 0.5 + 0.5, 0, 1)
white = np.array([0.52, 0.53, 0.56]); black = np.array([0.018, 0.018, 0.022])
col = black[None, None] * (1 - slat[..., None]) + (white[None, None] * (tone * (0.88 + 0.12 * lowf))[..., None]) * slat[..., None]
col *= (1 - 0.18 * (1 - prof) * slat)[..., None]           # slat sides slightly darker
def srgb(c):
    c = np.clip(c, 0, 1); return np.where(c <= 0.0031308, 12.92 * c, 1.055 * np.power(c, 1 / 2.4) - 0.055)
h = prof * 1.0
gx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * 0.5; gy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * 0.5
s = 6.0; n = np.dstack([-gx * s, gy * s, np.ones_like(h)]); n /= np.linalg.norm(n, axis=2, keepdims=True)
nrm = n * 0.5 + 0.5
orm = np.dstack([1 - 0.55 * (1 - slat), 0.62 - 0.22 * slat + 0.06 * lowf, np.zeros_like(h)])
def save(name, a):
    p = os.path.join(OUT, name); b = oiio.ImageBuf(oiio.ImageSpec(N, N, 3, oiio.UINT8)); b.set_pixels(oiio.ROI(), np.ascontiguousarray(a.astype(np.float32)))
    b.write(p); return {'file': os.path.relpath(p, ROOT), 'sha256': hashlib.sha256(open(p, 'rb').read()).hexdigest()}
REC = {'author': 'WorkBuddy Claude-Opus-5.5', 'tile_m': 0.60, 'convention': 'colour sRGB; normal OpenGL +Y; ORM R=AO G=rough B=metal',
       'files': [save('M18_ACOUSTIC_WEAVE_color.png', srgb(col)), save('M18_ACOUSTIC_WEAVE_normal.png', nrm), save('M18_ACOUSTIC_WEAVE_orm.png', orm)]}
# editable vector source of the same pattern (1 tile, 600 x 600 units = mm)
svg = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600"><rect width="600" height="600" fill="#050506"/>']
p = 300 / nsl
for j in range(2):
    for i in range(2):
        x0, y0 = i * 300, j * 300
        for k in range(nsl):
            a = k * p + p * gap / 2; w = p * (1 - gap)
            if (i + j) % 2 == 0:
                svg.append(f'<rect x="{x0 + 6}" y="{y0 + a:.1f}" width="288" height="{w:.1f}" rx="3" fill="#c9cad0"/>')
            else:
                svg.append(f'<rect x="{x0 + a:.1f}" y="{y0 + 6}" width="{w:.1f}" height="288" rx="3" fill="#c9cad0"/>')
svg.append('</svg>')
os.makedirs(os.path.join(ROOT, 'design'), exist_ok=True)
open(os.path.join(ROOT, 'design', 'acoustic_weave.svg'), 'w').write(''.join(svg))
json.dump(REC, open(os.path.join(ROOT, 'logs', 's05-textures.json'), 'w'), indent=1)
print('TEX_OK', REC['files'])
