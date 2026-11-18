# Arma el plan de subida de la ficha (textos de ficha-play-final-2026-11-17.txt e imágenes de out/) para play-ficha.mjs.
# Uso (desde game/store):  python plan_subida.py > out/plan-ficha.json
#                          python plan_subida.py tanda2 > out/plan-ficha-tanda2.json
# «tanda2» (preparada el 2026-11-18, se sube cuando Google apruebe lo enviado el 17 y el 18): textos de
# ficha-play-resto-idiomas-2026-11-18.txt (ar, ru, pt-PT, it, ja, zh-CN, zh-TW…), capturas nuevas de es/en (sin leones
# repetidos) y capturas propias del árabe (elefante en el baño y tienda sin cerdos).
import json
import os
import re
import sys

AQUI = os.path.abspath('.').replace('\\', '/')
texto = open('ficha-play-final-2026-11-17.txt', encoding='utf-8').read()


def bloque(idioma):
    b = texto.split(f'Idioma: {idioma}')[1]
    nombre = re.search(r'Nombre: (.*)', b).group(1).strip()
    breve = re.search(r'Descripción breve: (.*)', b).group(1).strip()
    completa = b.split('Descripción completa:\n', 1)[1].split('\n=====')[0].strip()
    return nombre, breve, completa


es = bloque('es-ES')
en = bloque('en-US (y en-GB igual)')
n419, b419, c419 = bloque('es-419')
# es-419: su primer párrafo y, desde «🦁 ¿Qué come cada animal?», lo mismo que es-ES.
c419 = c419.split('\n\n')[0] + '\n\n' + es[2][es[2].index('🦁'):]

listings = {}
for lang, (t, s, f) in {'es-ES': es, 'es-419': (n419, b419, c419), 'en-US': en, 'en-GB': en}.items():
    assert len(t) <= 30 and len(s) <= 80 and len(f) <= 4000, lang
    listings[lang] = {'title': t, 'shortDescription': s, 'fullDescription': f}


def imgs(idioma):
    F = f'{AQUI}/out/ficha/{idioma}'
    C = f'{AQUI}/out/candidatas/{idioma}'
    G = F if idioma != 'ar' else F.replace('/ar', '/en')  # el árabe usa el gráfico y las candidatas en inglés
    C = C if idioma != 'ar' else C.replace('/ar', '/en')
    movil = [f'{F}/captura-{n}.png' for n in ('1-leon', '2-jirafa', '3-banar', '4-curar', '5-panda', '6-tienda', '7-libro', '8-carino')]
    # Tabletas: las que eligió David (C1, C8, C18, C21) mezcladas con las 3 que más venden; desde el 2026-11-18 la cebra
    # (C2) en lugar de la cabra (C12), porque la cabra es ahora la que se cura en la clínica.
    tableta = [f'{F}/captura-1-leon.png', f'{C}/C01-comer-lola.png', f'{F}/captura-3-banar.png', f'{C}/C02-comer-raya.png',
               f'{F}/captura-4-curar.png', f'{C}/C08-comer-cuac.png', f'{C}/C18-zona-panda-1.png', f'{C}/C21-zona-pinguinos-2.png']
    for f in movil + tableta:
        assert os.path.exists(f), f
    return {'featureGraphic': [f'{G}/grafico-funciones-1024x500.png'], 'phoneScreenshots': movil,
            'sevenInchScreenshots': tableta, 'tenInchScreenshots': tableta}


icono = [f'{AQUI}/play/icono-512.png']
images = {'es-ES': {'icon': icono, **imgs('es')}, 'es-419': imgs('es'), 'en-US': {'icon': icono, **imgs('en')}, 'en-GB': imgs('en')}

if len(sys.argv) > 1 and sys.argv[1] == 'tanda2':
    # Solo cambian las capturas de es/en (textos iguales) y entran los textos nuevos; el árabe, con sus imágenes.
    resto = open('ficha-play-resto-idiomas-2026-11-18.txt', encoding='utf-8').read()
    listings = {}
    for b in resto.split('Idioma: ')[1:]:
        lang = b.split()[0]
        t_, s_ = re.search(r'Nombre: (.*)', b).group(1).strip(), re.search(r'Descripción breve: (.*)', b).group(1).strip()
        f_ = b.split('Descripción completa:\n', 1)[1].split('\n=====')[0].strip()
        assert len(t_) <= 30 and len(s_) <= 80 and len(f_) <= 4000, lang
        listings[lang] = {'title': t_, 'shortDescription': s_, 'fullDescription': f_}
    images = {lang: {k: v for k, v in imgs_.items() if k != 'icon'} for lang, imgs_ in images.items()}
    images['ar'] = imgs('ar')
    images['id'] = imgs('ar')  # Indonesia: como el árabe, sin cerdos en el texto ni en las capturas
    images['tr-TR'] = imgs('ar')  # Turquía: igual

print(json.dumps({'listings': listings, 'images': images}, ensure_ascii=False, indent=1))
