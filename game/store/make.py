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

# --- Gráfico de funciones 1024x500: la portada pintada, el nombre como en el juego y el león del icono
BALOO = 'fonts/Baloo2.ttf'
def baloo(d, xy, s, size, fill, stroke, sw):
    f = ImageFont.truetype(BALOO, size)
    f.set_variation_by_name('ExtraBold')
    d.text(xy, s, font=f, fill=fill, anchor='mm', stroke_width=sw, stroke_fill=stroke)

cover = Image.open('../public/assets/ui/title-bg.webp').convert('RGB')
h = int(cover.width * 500 / 1024)
top = int((cover.height - h) * 0.42)
g = cover.crop((0, top, cover.width, top + h)).resize((1024, 500), Image.LANCZOS).convert('RGBA')
lion = Image.open('out/leon-icono-master.png')
lion = lion.crop(lion.getbbox())
lion = lion.resize((int(lion.width * 430 / lion.height), 430), Image.LANCZOS)
g.alpha_composite(lion, (1024 - lion.width - 45, 500 - lion.height - 25))
d = ImageDraw.Draw(g)
CX = 330
baloo(d, (CX, 120), 'Zoo Esponji', 108, (255, 200, 61), (255, 255, 255), 16)
baloo(d, (CX, 120), 'Zoo Esponji', 108, (255, 200, 61), (138, 59, 18), 7)
baloo(d, (CX, 245), 'Da de comer a los animales', 40, (255, 255, 255), (90, 50, 16), 5)
baloo(d, (CX, 295), 'y abre tu propio zoo', 40, (255, 255, 255), (90, 50, 16), 5)
baloo(d, (CX, 425), 'Sin anuncios · Para peques de 5 a 12 años', 28, (255, 255, 255), (90, 50, 16), 4)
g.convert('RGB').save(OUT + 'grafico-funciones-1024x500.png')

# --- Capturas (16:9, 1920x1080; Play admite 320-3840 px por lado)
# De los recintos shots.mjs saca varias tomas (los animales pasean): aquí se elige la mejor de cada uno.
SHOTS = [('leones-5', 'captura-1-leones'), ('pantera-comiendo', 'captura-2-dar-de-comer'),
         ('cabras-5', 'captura-3-cabras'), ('tienda', 'captura-4-tienda'), ('libro-mary', 'captura-5-libro'),
         ('panteras-5', 'captura-6-panteras')]
for src, dst in SHOTS:
    Image.open(f'out/{src}.png').convert('RGB').save(OUT + dst + '.png')
print(os.listdir(OUT))
