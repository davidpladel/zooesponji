# Capturas de la ficha de Play con titular, y el gráfico de funciones, en español e inglés.
# Base: las capturas limpias de play/ (las saca shots.mjs + make.py). Salida: play/titulares/{es,en}/.
# Uso (desde game/store):  python titulares.py [carpeta out/ con leon-icono-master.png]
import math
import os
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

BALOO = 'fonts/Baloo2.ttf'
OUT_PRIVADO = sys.argv[1] if len(sys.argv) > 1 else 'out'
W, H = 1920, 1080
MADERA, MADERA_OSC, ORO, CREMA = (109, 76, 65), (62, 39, 35), (255, 200, 61), (255, 248, 225)

TITULARES = {
    'es': [
        ('captura-1-leones', 'CUIDA', 'TU PROPIO ZOO'),
        ('captura-2-dar-de-comer', 'DA DE COMER', 'A CADA ANIMAL'),
        ('captura-3-cabras', 'DESCUBRE', 'QUÉ LE GUSTA A CADA UNO'),
        ('captura-4-tienda', 'VISITA LA TIENDA', 'Y TRAE ANIMALES NUEVOS'),
        ('captura-5-libro', 'LIBRO SECRETO', 'LLENO DE CURIOSIDADES'),
        ('captura-6-panteras', 'HECHO CON CARIÑO', 'POR DANIELA (9) Y ADRIÁN (5)'),
        ('captura-7-tablon', 'TUS IDEAS', '¡LLEGAN AL ZOO!'),
    ],
    'en': [
        ('captura-1-leones', 'CARE', 'FOR YOUR OWN ZOO'),
        ('captura-2-dar-de-comer', 'FEED', 'EVERY ANIMAL'),
        ('captura-3-cabras', 'DISCOVER', 'WHAT EACH ONE LIKES'),
        ('captura-4-tienda', 'VISIT THE SHOP', 'AND BRING NEW ANIMALS'),
        ('captura-5-libro', 'SECRET BOOK', 'FULL OF FUN FACTS'),
        ('captura-6-panteras', 'MADE WITH LOVE', 'BY DANIELA (9) & ADRIÁN (5)'),
        ('captura-7-tablon', 'YOUR IDEAS', 'COME TO THE ZOO!'),
    ],
}
GRAFICO = {
    'es': ('Da de comer a los animales', 'y abre tu propio zoo', 'Gratis · Para peques de 5 a 12 años'),
    'en': ('Feed the zoo animals', 'and open your own zoo', 'Free · For kids aged 5 to 12'),
}


def fuente(size):
    f = ImageFont.truetype(BALOO, size)
    f.set_variation_by_name('ExtraBold')
    return f


def ajustada(texto, size, ancho_max):
    """La letra más grande (hasta `size`) con la que `texto` cabe en `ancho_max`."""
    while size > 20:
        f = fuente(size)
        if f.getbbox(texto)[2] <= ancho_max:
            return f
        size -= 4
    return fuente(size)


def letras(img, xy, texto, f, relleno, borde, grosor, sombra=True):
    """Texto como el título del juego: borde grueso marrón, sombra suave debajo."""
    if sombra:
        capa = Image.new('RGBA', img.size, (0, 0, 0, 0))
        ImageDraw.Draw(capa).text((xy[0], xy[1] + grosor), texto, font=f, anchor='mm', fill=(40, 22, 10, 170), stroke_width=grosor, stroke_fill=(40, 22, 10, 170))
        img.alpha_composite(capa.filter(ImageFilter.GaussianBlur(grosor * 0.6)))
    d = ImageDraw.Draw(img)
    d.text(xy, texto, font=f, anchor='mm', fill=relleno, stroke_width=grosor, stroke_fill=borde)


def fondo():
    """La portada pintada del juego, desenfocada, como mesa sobre la que se apoya la captura."""
    p = Image.open('../public/assets/ui/title-bg.webp').convert('RGB')
    escala = max(W / p.width, H / p.height)
    p = p.resize((math.ceil(p.width * escala), math.ceil(p.height * escala)), Image.LANCZOS)
    x, y = (p.width - W) // 2, int((p.height - H) * 0.4)
    return p.crop((x, y, x + W, y + H)).filter(ImageFilter.GaussianBlur(6)).convert('RGBA')


def marco(captura):
    """La captura con borde blanco redondeado y sombra, un poco girada."""
    ancho = 1500
    c = captura.resize((ancho, round(captura.height * ancho / captura.width)), Image.LANCZOS)
    b = 14
    m = Image.new('RGBA', (c.width + 2 * b, c.height + 2 * b), (0, 0, 0, 0))
    ImageDraw.Draw(m).rounded_rectangle((0, 0, m.width - 1, m.height - 1), radius=34, fill=(255, 255, 255, 255))
    mascara = Image.new('L', c.size, 0)
    ImageDraw.Draw(mascara).rounded_rectangle((0, 0, c.width - 1, c.height - 1), radius=24, fill=255)
    m.paste(c, (b, b), mascara)
    return m.rotate(-1.4, resample=Image.BICUBIC, expand=True)


def banda(img):
    """Banda de madera abajo, con el borde de arriba ondulado y huellas suaves."""
    y0 = 790
    capa = Image.new('RGBA', img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(capa)
    borde = [(x, y0 + 16 * math.sin(x / W * math.pi * 3)) for x in range(0, W + 1, 8)]
    d.polygon([(0, H)] + borde + [(W, H)], fill=MADERA + (255,))
    d.line(borde, fill=(160, 112, 84, 255), width=10)
    for i in range(14):  # huellas
        cx, cy = 70 + i * 140, y0 + 120 + (i % 2) * 90
        tono = (96, 66, 56, 255)
        d.ellipse((cx - 20, cy - 14, cx + 20, cy + 18), fill=tono)
        for dx, dy in ((-24, -26), (-8, -38), (10, -38), (26, -26)):
            d.ellipse((cx + dx - 8, cy + dy - 9, cx + dx + 8, cy + dy + 9), fill=tono)
    sombra = capa.split()[3].point(lambda a: 120 if a else 0).filter(ImageFilter.GaussianBlur(14))
    s = Image.new('RGBA', img.size, (30, 15, 5, 0))
    s.putalpha(sombra)
    img.alpha_composite(s, (0, -10))
    img.alpha_composite(capa)


def captura_con_titular(base, grande, pequeno):
    img = fondo()
    m = marco(Image.open(base).convert('RGB'))
    img.alpha_composite(m, ((W - m.width) // 2, 26))
    banda(img)
    letras(img, (W // 2, 880), grande, ajustada(grande, 168, 1760), (255, 255, 255), MADERA_OSC, 14)
    letras(img, (W // 2, 1000), pequeno, ajustada(pequeno, 92, 1760), ORO, MADERA_OSC, 9)
    return img.convert('RGB')


def grafico(idioma):
    linea1, linea2, nota = GRAFICO[idioma]
    cover = Image.open('../public/assets/ui/title-bg.webp').convert('RGB')
    h = int(cover.width * 500 / 1024)
    top = int((cover.height - h) * 0.42)
    g = cover.crop((0, top, cover.width, top + h)).resize((1024, 500), Image.LANCZOS).convert('RGBA')
    leon = Image.open(os.path.join(OUT_PRIVADO, 'leon-icono-master.png'))
    leon = leon.crop(leon.getbbox())
    leon = leon.resize((int(leon.width * 430 / leon.height), 430), Image.LANCZOS)
    g.alpha_composite(leon, (1024 - leon.width - 45, 500 - leon.height - 25))
    d = ImageDraw.Draw(g)
    cx = 330
    d.text((cx, 120), 'Zoo Esponji', font=fuente(108), anchor='mm', fill=ORO, stroke_width=16, stroke_fill=(255, 255, 255))
    d.text((cx, 120), 'Zoo Esponji', font=fuente(108), anchor='mm', fill=ORO, stroke_width=7, stroke_fill=(138, 59, 18))
    for y, texto in ((245, linea1), (295, linea2)):
        d.text((cx, y), texto, font=ajustada(texto, 40, 600), anchor='mm', fill=(255, 255, 255), stroke_width=5, stroke_fill=(90, 50, 16))
    d.text((cx, 425), nota, font=ajustada(nota, 28, 600), anchor='mm', fill=(255, 255, 255), stroke_width=4, stroke_fill=(90, 50, 16))
    return g.convert('RGB')


if __name__ == '__main__':
    for idioma, lista in TITULARES.items():
        carpeta = f'play/titulares/{idioma}'
        os.makedirs(carpeta, exist_ok=True)
        for base, grande, pequeno in lista:
            captura_con_titular(f'play/{base}.png', grande, pequeno).save(f'{carpeta}/{base}.png')
        grafico(idioma).save(f'{carpeta}/grafico-funciones-1024x500.png')
        print(idioma, sorted(os.listdir(carpeta)))
