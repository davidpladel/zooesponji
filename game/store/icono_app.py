# Icono de la app a partir del dibujo de ChatGPT (noviembre 2026: el león con la moneda, fondo azul).
# Genera el icono de Play 512 y los mipmaps de Android (normal, redondo y adaptable: fondo + primer plano).
# Las pantallas de splash y el león del gráfico de funciones siguen saliendo de make_icon.py.
# El original (1254x1254) está en zooesponji-private/art-work/terminados/icono-app-2026-11.png.
# Uso (desde game/store):  python icono_app.py <ruta del original>
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

RES = '../android/app/src/main/res/'
DENS = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}


def circulo(size):
    m = Image.new('L', (size * 4, size * 4), 0)
    ImageDraw.Draw(m).ellipse((0, 0, size * 4 - 1, size * 4 - 1), fill=255)
    return m.resize((size, size), Image.LANCZOS)


def main(ruta):
    src = Image.open(ruta).convert('RGBA')
    a = lambda s: src.resize((s, s), Image.LANCZOS)

    os.makedirs('play', exist_ok=True)
    a(512).convert('RGB').save('play/icono-512.png')

    for name, k in DENS.items():
        fg_size, ic_size = round(108 * k), round(48 * k)
        d = RES + f'mipmap-{name}/'
        # Adaptable (108 dp; el móvil enseña los 72 dp del centro y los recorta con su forma):
        # el dibujo entero ocupa la zona segura (66 dp) y sus bordes azules se alargan hasta los 108 dp,
        # así no hay costura. Todo va en el fondo; el primer plano queda transparente.
        lado = round(66 * k)
        dib = np.asarray(a(lado).convert('RGB'))
        m = (fg_size - lado) // 2
        fondo = np.pad(dib, ((m, fg_size - lado - m), (m, fg_size - lado - m), (0, 0)), mode='edge')
        Image.fromarray(fondo, 'RGB').save(d + 'ic_launcher_background.png')
        Image.new('RGBA', (fg_size, fg_size), (0, 0, 0, 0)).save(d + 'ic_launcher_foreground.png')
        # Antiguo (Android 7 y anteriores): cuadrado y redondo.
        a(ic_size).save(d + 'ic_launcher.png')
        rnd = a(ic_size)
        rnd.putalpha(circulo(ic_size))
        rnd.save(d + 'ic_launcher_round.png')
    print('ok')


if __name__ == '__main__':
    main(sys.argv[1])
