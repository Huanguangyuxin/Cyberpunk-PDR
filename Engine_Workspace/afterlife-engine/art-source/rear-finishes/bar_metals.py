"""Metric 1.2 m PBR swatches for the guest counter, foot rail and folded canopy."""
from pathlib import Path
import numpy as np
from PIL import Image


def bake(folder):
    size = 1024
    rng = np.random.default_rng(18936)
    axis = np.arange(size) / size

    def field(rows, columns):
        seeds = rng.uniform(-1, 1, (rows, columns))
        def interpolate(axis_values, count):
            scaled = axis_values * count
            lower = scaled.astype(int)
            fraction = scaled - lower
            return lower, fraction ** 2 * (3 - 2 * fraction)
        col, along = interpolate(axis, columns)
        row, across = interpolate(axis, rows)
        bands = seeds[:, col] * (1-along) + seeds[:, (col+1) % columns] * along
        return bands[row] * (1-across[:, None]) + bands[(row+1) % rows] * across[:, None]

    def save(key, base, height, rough, metal):
        dx = np.roll(height, 1, 1) - np.roll(height, -1, 1)
        dy = np.roll(height, 1, 0) - np.roll(height, -1, 0)
        normal = np.stack([dx, dy, np.ones_like(dx)], axis=2)
        normal /= np.linalg.norm(normal, axis=2, keepdims=True)
        orm = np.stack([np.ones_like(dx), rough, metal], axis=2)
        for suffix, pixels in [('color', base), ('normal', 127.5*(1+normal)), ('orm', 255*orm)]:
            Image.fromarray(np.rint(np.clip(pixels, 0, 255)).astype('uint8')).save(folder/f'{key}-{suffix}.png')

    grain = field(900, 20)
    lap = field(185, 11)
    wipe = field(14, 4)
    worn = np.maximum(0, field(405, 7)-.68) * np.maximum(0, field(15, 9))
    # Rolled stainless and exposed polished edges share grain direction; the
    # binder and rare crossing hairlines affect roughness more than tint.
    film = np.maximum(0, .65*field(9, 7) + .35*field(37, 21) - .16)
    steel = np.array([184, 188, 192]) + (2*grain+2*wipe-7*film+3*lap)[:,:,None]
    save('counter-silver', steel, .037*grain+.018*lap-.055*worn,
         .28+.036*grain+.049*wipe+.16*film+.22*worn, .973-.17*film)

    # Bronze skin: dark conversion patina over a brushed conductive alloy.
    patina = np.clip(.28+.55*field(8, 8)+.23*field(32, 25), 0, 1)
    bronze = np.array([147, 110, 75]) + (3*lap+1.8*grain)[:,:,None] - patina[:,:,None]*np.array([22, 20, 14])
    save('canopy-bronze', bronze, .027*grain+.018*lap,
         .36+.15*patina+.04*grain, .955-.31*patina)

    # A polished copper sheet catches long reflected bands. Residual oxide
    # sits in local depressions, rather than coating the entire kick plate.
    oxide = np.clip((.72*field(11, 8)+.28*field(50, 27)-.27)*1.6, 0, 1)
    sweep = .57*field(18, 7)+.43*field(45, 26)
    copper = np.array([201, 134, 100]) + (3.3*sweep+1.2*grain)[:,:,None] - oxide[:,:,None]*np.array([37, 32, 22])
    save('copper', copper, .037*grain+.105*sweep+.16*field(51, 26),
         .225+.050*sweep+.032*grain+.23*oxide, .973-.37*oxide)


if __name__ == '__main__':
    bake(Path(__file__).parent/'maps')
