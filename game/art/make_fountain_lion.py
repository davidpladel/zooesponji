# El león del logo en pixel art, para la estatua de la fuente de la plaza (fountain-lion.png).
# Sale del dibujo grande del icono: sin la hierba, reducido, con pocos colores y un contorno oscuro.
# Uso: python make_fountain_lion.py   (desde game/art)
import os
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
MASTER = os.path.join(HERE, '../../web/public/assets/prensa/20261102b/identidad/leon-icono-master.png')
WIDTH = 20  # la fuente mide 80x64; las piedras que había eran de 16 de ancho
COLORS = 14

img = Image.open(MASTER).convert('RGBA')
a = np.array(img).astype(int)
grass = (a[..., 1] > a[..., 0] + 10) & (a[..., 1] > a[..., 2])
a[grass, 3] = 0
img = Image.fromarray(a.astype(np.uint8))
img = img.crop(img.getbbox())

height = round(WIDTH * img.height / img.width)
small = np.array(img.resize((WIDTH, height), Image.LANCZOS)).astype(int).clip(0, 255)
alpha = np.where(small[..., 3] > 110, 255, 0)
rgb = Image.fromarray(small[..., :3].astype(np.uint8)).quantize(COLORS, method=Image.Quantize.MEDIANCUT).convert('RGB')
out = np.dstack([np.array(rgb), alpha]).astype(np.uint8)

inside = alpha > 0
p = np.pad(inside, 1)
edge = inside & ~(p[:-2, 1:-1] & p[2:, 1:-1] & p[1:-1, :-2] & p[1:-1, 2:])
out[edge, :3] = (out[edge, :3] * 0.45).astype(np.uint8)

Image.fromarray(out).save(os.path.join(HERE, 'fountain-lion.png'))
print(f'fountain-lion.png {WIDTH}x{height}')
