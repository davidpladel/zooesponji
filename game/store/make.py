# Compone icono 512x512, gráfico de funciones 1024x500 y capturas para Google Play.
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

# --- Icono 512x512 (32 bits, cuadrado; Play redondea las esquinas él solo)
S = 512
ic = Image.new('RGBA', (S, S))
d = ImageDraw.Draw(ic)
for y in range(S):  # cielo-verde suave
    t = y / S
    d.line([(0, y), (S, y)], fill=(int(140-40*t), int(205-45*t), int(95-25*t), 255))
d.ellipse((S*0.5-215, S*0.5-215, S*0.5+215, S*0.5+215), fill=(255, 236, 150, 255))
lion = big(frame('leon', 24), 15)
ic.alpha_composite(lion, ((S-lion.width)//2, (S-lion.height)//2 + 10))
ic.convert('RGBA').save(OUT + 'icono-512.png')

# --- Gráfico de funciones 1024x500
shot = Image.open('out/2-entrada.png').convert('RGB')
bg = shot.crop((0, 200, 1920, 200+ int(1920*500/1024))).resize((1024, 500), Image.LANCZOS)
bg = bg.filter(ImageFilter.GaussianBlur(3))
ov = Image.new('RGBA', (1024, 500), (20, 50, 20, 120))
g = Image.alpha_composite(bg.convert('RGBA'), ov)
d = ImageDraw.Draw(g)
text(d, (330, 190), 'Zoo Esponji', 92, (255, 214, 64), (90, 45, 10), 8)
text(d, (300, 275), 'Da de comer a los animales', 30, (255, 255, 255), (30, 60, 20), 5)
text(d, (300, 315), 'y abre tu propio zoo', 30, (255, 255, 255), (30, 60, 20), 5)
x = 560
for name, fw in [('cabra', 16), ('leon', 24), ('pantera', 24), ('panda', 32)]:
    sp = big(frame(name, fw), 5)
    g.alpha_composite(sp, (x, 400 - sp.height - 8))
    x += sp.width + 4
tag = ImageDraw.Draw(g)
text(tag, (330, 430), 'Sin anuncios · Para peques de 5 a 12 años', 26, (255, 255, 255), (30, 60, 20), 4)
g.convert('RGB').save(OUT + 'grafico-funciones-1024x500.png')

# --- Capturas (16:9, 1920x1080; Play admite 320-3840 px por lado)
for src, dst in [('leon-carne', 'captura-1-dar-de-comer'), 
                 ('5-tienda', 'captura-2-tienda'), ('2-entrada', 'captura-3-entrada')]:
    Image.open(f'out/{src}.png').convert('RGB').save(OUT + dst + '.png')
print(os.listdir(OUT))
