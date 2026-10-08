# Compone gráfico de funciones 1024x500 y capturas para Google Play.
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os
ART = '../public/art/'
OUT = 'play/'
os.makedirs(OUT, exist_ok=True)
FONT = 'C:/Windows/Fonts/ariblk.ttf'

def frame(name, fw, row=2, col=1):
    im = Image.open(ART + f'animal-{name}.png').convert('RGBA')
    im = im.crop((col*fw, row*fw, col*fw+fw, row*fw+fw))
    return im.crop(im.getbbox())  # sin margen transparente
def big(im, k):
    return im.resize((im.width*k, im.height*k), Image.NEAREST)
def text(d, xy, s, size, fill, stroke, sw, anchor='mm'):
    f = ImageFont.truetype(FONT, size)
    d.text(xy, s, font=f, fill=fill, anchor=anchor, stroke_width=sw, stroke_fill=stroke)

# El icono 512 y los iconos de Android los genera make_icon.py (león dibujado); ejecutarlo antes.

# --- Gráfico de funciones 1024x500
shot = Image.open('out/entrada.png').convert('RGB')
bg = shot.crop((0, 200, 1920, 200+ int(1920*500/1024))).resize((1024, 500), Image.LANCZOS)
bg = bg.filter(ImageFilter.GaussianBlur(3))
ov = Image.new('RGBA', (1024, 500), (20, 50, 20, 120))
g = Image.alpha_composite(bg.convert('RGBA'), ov)
d = ImageDraw.Draw(g)
text(d, (330, 190), 'Zoo Esponji', 92, (255, 214, 64), (90, 45, 10), 8)
text(d, (300, 275), 'Da de comer a los animales', 30, (255, 255, 255), (30, 60, 20), 5)
text(d, (300, 315), 'y abre tu propio zoo', 30, (255, 255, 255), (30, 60, 20), 5)
lion = Image.open('out/leon-icono-master.png')
lion = lion.crop(lion.getbbox())
lion = lion.resize((int(lion.width * 440 / lion.height), 440), Image.LANCZOS)
g.alpha_composite(lion, (1024 - lion.width - 50, 500 - lion.height - 20))
tag = ImageDraw.Draw(g)
text(tag, (330, 430), 'Sin anuncios · Para peques de 5 a 12 años', 26, (255, 255, 255), (30, 60, 20), 4)
g.convert('RGB').save(OUT + 'grafico-funciones-1024x500.png')

# --- Capturas (16:9, 1920x1080; Play admite 320-3840 px por lado)
# De los recintos shots.mjs saca varias tomas (los animales pasean): aquí se elige la mejor de cada uno.
SHOTS = [('leones-5', 'captura-1-leones'), ('pantera-comiendo', 'captura-2-dar-de-comer'),
         ('cabras-5', 'captura-3-cabras'), ('tienda', 'captura-4-tienda'), ('libro-mary', 'captura-5-libro'),
         ('panteras-5', 'captura-6-panteras'), ('titulo', 'captura-7-titulo')]
for src, dst in SHOTS:
    Image.open(f'out/{src}.png').convert('RGB').save(OUT + dst + '.png')
print(os.listdir(OUT))
