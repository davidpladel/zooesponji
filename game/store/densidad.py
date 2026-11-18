# Comprueba las repeticiones de palabras clave en las descripciones de la ficha (regla de ASO.md › 5):
#   como mucho una repetición exacta cada 250 letras y menos del 3 %.
# Uso (desde game/store):  PYTHONIOENCODING=utf-8 python densidad.py
# Densidad = veces x palabras de la búsqueda / palabras del texto (como el Text Analyzer de ASO Mobile).
import re
import sys
from collections import Counter

FICHEROS = ['ficha-play-final-2026-11-17.txt', 'ficha-play-idiomas-2026-11-18.txt', 'ficha-play-resto-idiomas-2026-11-18.txt']
TITULOS = {}  # nombre y descripción breve de cada idioma, para comprobar los límites (30 y 80)

# Búsquedas elegidas de cada idioma (las del título y la descripción breve).
CLAVES = {
    'es-ES': ['juego para niños', 'juegos de animales', 'granja', 'zoo'],
    'es-419': ['juegos de animales', 'juegos para niños', 'granja', 'zoo'],
    'en-US': ['toddler games', 'kids animal games', 'animal games', 'zoo', 'farm'],
    'en-IN': ['kids games', 'kids game', 'animal games', 'zoo', 'farm'],
    'pt-BR': ['jogo infantil', 'jogos infantis', 'jogos para crianças', 'fazendinha', 'zoológico'],
    'fr-FR': ['jeux pour enfants', 'jeu d\'animaux', 'ferme', 'zoo'],
    'hi-IN': ['बच्चों के गेम', 'बच्चों का गेम', 'जानवरों का गेम', 'ज़ू'],
    'ar': ['ألعاب أطفال', 'العاب اطفال', 'ألعاب حيوانات', 'حيوانات', 'بدون نت'],
    'ru-RU': ['детские игры', 'игры для детей', 'игры для малышей', 'игры про животных', 'без интернета', 'зоопарк'],
    'pt-PT': ['jogos infantis', 'jogos para crianças', 'jogos de animais', 'quinta'],
    'it-IT': ['giochi bambini', 'giochi per bambini', 'giochi di animali', 'fattoria', 'zoo'],
    'ja-JP': ['子供ゲーム', '子供向けゲーム', '動物ゲーム', '動物園', '牧場'],
    'zh-CN': ['儿童游戏', '动物游戏', '动物园', '农场'],
}
# Japonés y chino no separan las palabras con espacios: se cuenta por letras (densidad = letras de la búsqueda / letras).
SIN_ESPACIOS = ('ja-JP', 'zh-CN')


def fichas():
    out = {}
    for f in FICHEROS:
        try:
            t = open(f, encoding='utf-8').read()
        except FileNotFoundError:
            continue
        for b in t.split('Idioma: ')[1:]:
            lang = b.split()[0]
            if 'Descripción completa:' not in b:
                continue
            c = b.split('Descripción completa:\n', 1)[1].split('\n=====')[0].strip()
            out[lang] = c
            TITULOS[lang] = (re.search(r'Nombre: (.*)', b).group(1).strip(), re.search(r'Descripción breve: (.*)', b).group(1).strip())
    # es-419: su primer párrafo y el resto como es-ES (igual que plan_subida.py).
    if 'es-419' in out and 'es-ES' in out:
        es = out['es-ES']
        out['es-419'] = out['es-419'].split('\n\n')[0] + '\n\n' + es[es.index('🦁'):]
    return out


SIGNOS = '.,:;!?¿¡()«»"“”…·-–—/؟،🦁🐷🐑🌍🩺🐘✋💡👪 '


def palabras(t):
    # Por espacios y sin signos: sirve igual para latín, cirílico, árabe y devanagari (con sus tildes).
    out = []
    for w in t.lower().replace('’', "'").split():
        w = w.strip(SIGNOS)
        if w and not w.isdigit() and not re.fullmatch(r'[\d\-–]+', w):
            out.append(w)
    return out


def veces(texto, clave):
    t, k = palabras(texto), palabras(clave)
    return sum(1 for i in range(len(t) - len(k) + 1) if t[i:i + len(k)] == k)


ok = True
for lang, c in fichas().items():
    claves = CLAVES.get(lang, [])
    if not claves:
        continue
    n = len(palabras(c))
    letras = len(c)
    print(f'\n== {lang}: {letras} letras, {n} palabras, máx. {letras // 250} repeticiones por búsqueda')
    t, s = TITULOS.get(lang, ('', ''))
    largo = len(t) > 30 or len(s) > 80 or letras > 4000
    ok &= not largo
    print(f'  {"MAL" if largo else "ok "} nombre {len(t)}/30, breve {len(s)}/80, completa {letras}/4000')
    for k in claves:
        if lang in SIN_ESPACIOS:
            letras_utiles = len(re.findall(r'\w', c))
            v = c.count(k)
            dens = 100 * v * len(k) / letras_utiles
        else:
            v = veces(c, k)
            dens = 100 * v * len(k.split()) / n
        malo = v > letras // 250 or dens >= 3
        ok &= not malo
        print(f'  {"MAL" if malo else "ok "} «{k}»: {v} veces, {dens:.1f} %')
    if lang in SIN_ESPACIOS:
        continue
    top = Counter(w for w in palabras(c) if len(w) > 3).most_common(4)
    print('  palabras sueltas más repetidas:', ', '.join(f'{w} {100 * v / n:.1f} %' for w, v in top))
sys.exit(0 if ok else 1)
