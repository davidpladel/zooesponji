# Capturas candidatas para la ficha (más animales y zonas del parque), con titular y número, para que David elija.
# Bases: out/galeria/<idioma>-*.png (shots-galeria.mjs). Salida: out/candidatas/<idioma>/ y una hoja con todas.
# Uso (desde game/store):  python candidatas.py [es|en]
import os
import sys

from PIL import Image, ImageDraw

from capturas_ficha import captura, de_cerca
from titulares import fuente

CANDIDATAS = {
    'es': [
        ('comer-lola', 'LA JIRAFA', '¡LE ENCANTAN LOS PLÁTANOS!'),
        ('comer-raya', 'LA CEBRA', '¡LOCA POR LAS MANZANAS!'),
        ('comer-brisa', 'LA GACELA', '¡SU FAVORITO ES EL MAÍZ!'),
        ('comer-pingu', 'EL PINGÜINO', 'COME PESCADO'),
        ('comer-lana', 'LA OVEJA', '¡ÑAM, LECHUGA!'),
        ('comer-canela', 'EL CABALLO', '¡LAS MANZANAS, SUS FAVORITAS!'),
        ('comer-pepa', 'LA GALLINA', '¡EL PAN, SU FAVORITO!'),
        ('comer-cuac', 'EL PATO', '¡EL PESCADO, SU FAVORITO!'),
        ('comer-raja', 'EL ELEFANTE ASIÁTICO', '¡LE ENCANTAN LAS MANZANAS!'),
        ('comer-tembo', 'EL ELEFANTE AFRICANO', '¡LE ENCANTAN LOS PLÁTANOS!'),
        ('comer-rosita', 'LA CERDITA', '¡LE ENCANTAN LAS MANZANAS!'),
        ('comer-gordi', 'LA CABRA', 'COME ZANAHORIAS... ¡Y PIEDRAS!'),
        ('comer-noche', 'LA PANTERA NEGRA', 'COME CARNE'),
        ('zona-entrada', 'BIENVENIDOS', 'A TU PROPIO ZOO'),
        ('zona-leon-1', 'LOS LEONES', 'BILLS Y SASHA'),
        ('zona-cabra-1', 'LAS CABRAS', 'JUNTO A LA TIENDA'),
        ('zona-pantera-1', 'LA CATARATA', 'DE LA PANTERA NEGRA'),
        ('zona-panda-1', 'EL BOSQUE DE BAMBÚ', 'DE LOS PANDAS'),
        ('zona-sabana-1', 'LA SABANA', 'JIRAFAS, CEBRAS Y GACELAS'),
        ('zona-elefantes-africanos-1', 'LOS ELEFANTES', 'CON SU CHARCA'),
        ('zona-pinguinos-2', 'EL POLO', 'CON SUS PINGÜINOS'),
        ('zona-cerdos-1', 'LA GRANJA', 'CON CINCO CERDITOS'),
        ('zona-estanque-1', 'EL ESTANQUE', 'DE LOS PATOS'),
        ('zona-establo-2', 'EL ESTABLO', 'CABALLOS, GALLINAS Y GALLO'),
        ('zona-ovejas-2', 'LAS OVEJAS', 'CADA UNA CON SU NOMBRE'),
    ],
}
# En inglés, solo las que eligió David (2026-11-17): C1, C8, C12, C18 y C21, con su mismo número, y la C2 (cebra)
# desde el 2026-11-18, porque la cabra pasó a curarse en la clínica y salía dos veces en las de tableta.
_EN = {
    1: ('comer-lola', 'THE GIRAFFE', 'LOVES BANANAS!'),
    2: ('comer-raya', 'THE ZEBRA', 'CRAZY ABOUT APPLES!'),  # 2026-11-18: sustituye a la cabra en las de tableta
    8: ('comer-cuac', 'THE DUCK', 'LOVES FISH!'),
    12: ('comer-gordi', 'THE GOAT', 'EATS CARROTS... AND ROCKS!'),
    18: ('zona-panda-1', 'THE BAMBOO FOREST', 'WHERE THE PANDAS LIVE'),
    21: ('zona-pinguinos-2', 'THE POLAR ZONE', 'WITH ITS PENGUINS'),
}
CANDIDATAS['en'] = [_EN.get(i, None) for i in range(1, len(CANDIDATAS['es']) + 1)]

if __name__ == '__main__':
    idioma = sys.argv[1] if len(sys.argv) > 1 else 'es'
    carpeta = f'out/candidatas/{idioma}'
    os.makedirs(carpeta, exist_ok=True)
    hechas = []
    for i, item in enumerate(CANDIDATAS[idioma], start=1):
        if item is None:
            continue
        origen, grande, pequeno = item
        ruta = f'out/galeria/{idioma}-{origen}.png'
        cerca = origen.startswith('comer-')
        base = de_cerca(ruta) if cerca else Image.open(ruta).convert('RGB')
        destino = f'{carpeta}/C{i:02d}-{origen}.png'
        captura(base, grande, pequeno, cerca).save(destino)
        hechas.append((i, destino))
    # Hoja con todas, con su número bien grande para elegir.
    W, H, cols = 480, 270, 5
    hoja = Image.new('RGB', (W * cols, H * ((len(hechas) + cols - 1) // cols)), 'white')
    d = ImageDraw.Draw(hoja)
    for k, (i, ruta) in enumerate(hechas):
        x, y = (k % cols) * W, (k // cols) * H
        hoja.paste(Image.open(ruta).resize((W - 6, H - 6)), (x + 3, y + 3))
        d.rounded_rectangle((x + 8, y + 8, x + 78, y + 52), radius=10, fill=(200, 30, 30))
        d.text((x + 43, y + 30), f'C{i}', font=fuente(30), anchor='mm', fill='white')
    hoja.save(f'out/hoja-candidatas-{idioma}.png')
    print(len(hechas), 'candidatas')
