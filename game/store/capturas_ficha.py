# Capturas de la ficha de Play (noviembre 2026): 8 por idioma, con titular, y el gráfico de funciones.
# Orden pensado para la conversión: primero un animal grande en primer plano y la edad (2-5 años, y de 5 a 12),
# luego el zoo, los cuidados nuevos de la 2.10.0 (bañar y curar) y el resto.
# Bases: out/<idioma>-*.png (shots-cuidados.mjs) y play/captura-*.png (shots.mjs + make.py).
# Uso (desde game/store):  python capturas_ficha.py      Salida: out/ficha/<idioma>/ (ignorada por git)
import os

from PIL import Image

from titulares import ORO, MADERA_OSC, W, H, ajustada, banda, fondo, fuente, letras, marco

# El recuadro de la ventana de comer, bañar o curar en una captura 1920x1080 (16:9).
VENTANA = (600, 195, 1330, 606)


def de_cerca(ruta):
    """Recorta la ventana y la amplía: es pixel art, así que se agranda por píxeles enteros y luego se ajusta."""
    c = Image.open(ruta).convert('RGB').crop(VENTANA)
    c = c.resize((c.width * 3, c.height * 3), Image.NEAREST)
    return c.resize((W, H), Image.LANCZOS)


CAPTURAS = {
    'es': [
        ('1-leon', 'cerca:es-leon-comiendo-350', 'PARA NIÑOS DE 2-5 AÑOS', '¡Y TAMBIÉN DE 5 A 12!'),
        ('2-zoo', 'play/captura-1-leones.png', 'CUIDA', 'TU PROPIO ZOO'),
        ('3-banar', 'cerca:es-cerdo-02', 'LIMPIA', 'A LOS CERDITOS LLENOS DE BARRO'),
        ('4-curar', 'cerca:es-curar-5', 'CURA', 'A LOS ANIMALES MALITOS'),
        ('5-panda', 'cerca:es-panda-comiendo-650', 'DA DE COMER', 'Y DESCUBRE QUÉ LE GUSTA A CADA UNO'),
        ('6-tienda', 'play/captura-4-tienda.png', 'VISITA LA TIENDA', 'Y TRAE ANIMALES NUEVOS'),
        ('7-libro', 'play/captura-5-libro.png', 'LIBRO SECRETO', 'LLENO DE CURIOSIDADES'),
        ('8-carino', 'play/captura-6-panteras.png', 'HECHO CON CARIÑO', 'POR DANIELA (9) Y ADRIÁN (5)'),
    ],
    'en': [
        ('1-leon', 'cerca:en-leon-comiendo-350', 'TODDLER GAMES', 'FOR AGES 2-5, AND 5-12 TOO!'),
        ('2-zoo', 'play/captura-1-leones.png', 'CARE', 'FOR YOUR OWN ZOO'),
        ('3-banar', 'cerca:en-cerdo-02', 'WASH', 'THE MUDDY PIGLETS'),
        ('4-curar', 'cerca:en-curar-5', 'HEAL', 'THE POORLY ANIMALS'),
        ('5-panda', 'cerca:en-panda-comiendo-650', 'FEED', 'AND DISCOVER WHAT EACH ONE LIKES'),
        ('6-tienda', 'play/captura-4-tienda.png', 'VISIT THE SHOP', 'AND BRING NEW ANIMALS'),
        ('7-libro', 'play/captura-5-libro.png', 'SECRET BOOK', 'FULL OF FUN FACTS'),
        ('8-carino', 'play/captura-6-panteras.png', 'MADE WITH LOVE', 'BY DANIELA (9) & ADRIÁN (5)'),
    ],
}

GRAFICO = {
    'es': ('Para niños de 2 a 5 años', 'y también de 5 a 12', 'Da de comer, baña y cura a los animales'),
    'en': ('Toddler games for ages 2-5', 'and for kids 5-12 too', 'Feed, wash and heal the zoo animals'),
}


def marco_cerca(captura, ancho=1300):
    """Como marco() de titulares.py, pero más pequeño: el animal ampliado queda entero encima de la banda."""
    from PIL import ImageDraw
    c = captura.resize((ancho, round(captura.height * ancho / captura.width)), Image.LANCZOS)
    b = 14
    m = Image.new('RGBA', (c.width + 2 * b, c.height + 2 * b), (0, 0, 0, 0))
    ImageDraw.Draw(m).rounded_rectangle((0, 0, m.width - 1, m.height - 1), radius=34, fill=(255, 255, 255, 255))
    mascara = Image.new('L', c.size, 0)
    ImageDraw.Draw(mascara).rounded_rectangle((0, 0, c.width - 1, c.height - 1), radius=24, fill=255)
    m.paste(c, (b, b), mascara)
    return m.rotate(-1.4, resample=Image.BICUBIC, expand=True)


def captura(base, grande, pequeno, cerca=False):
    img = fondo()
    m = marco_cerca(base) if cerca else marco(base)
    img.alpha_composite(m, ((W - m.width) // 2, 14 if cerca else 26))
    banda(img)
    letras(img, (W // 2, 880), grande, ajustada(grande, 168, 1760), (255, 255, 255), MADERA_OSC, 14)
    letras(img, (W // 2, 1000), pequeno, ajustada(pequeno, 92, 1760), ORO, MADERA_OSC, 9)
    return img.convert('RGB')


def grafico(idioma):
    """El gráfico de funciones de antes (portada, nombre y león), con los textos nuevos y sin «Gratis»."""
    import titulares
    titulares.GRAFICO[idioma] = GRAFICO[idioma]
    return titulares.grafico(idioma)


if __name__ == '__main__':
    for idioma, lista in CAPTURAS.items():
        carpeta = f'out/ficha/{idioma}'
        os.makedirs(carpeta, exist_ok=True)
        for nombre, origen, grande, pequeno in lista:
            base = de_cerca(f'out/{origen[6:]}.png') if origen.startswith('cerca:') else Image.open(origen).convert('RGB')
            captura(base, grande, pequeno, origen.startswith('cerca:')).save(f'{carpeta}/captura-{nombre}.png')
        grafico(idioma).save(f'{carpeta}/grafico-funciones-1024x500.png')
        print(idioma, sorted(os.listdir(carpeta)))
