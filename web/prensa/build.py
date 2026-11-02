"""Build the public press assets and ES/EN pages. See README.md for dependencies."""
import json, os, re, shutil, zipfile
from pathlib import Path
from html import escape as e
from urllib.parse import urlencode

ROOT = Path(__file__).resolve().parents[1]
HERE = Path(__file__).resolve().parent
DATA = json.loads((HERE / 'dossiers.json').read_text(encoding='utf-8'))
STAMP = '20261102b'
REL = '/assets/prensa/' + STAMP
OUT = ROOT / 'public' / REL.lstrip('/')
SITE = 'https://www.zooesponji.com'
PLAY = 'https://play.google.com/store/apps/details?id=com.davidpladel.zooesponji'
# Public contact name for press; the family credit lives in dossiers.json ('facts').
CONTACT = 'David Plaza'
TRAILERS = ['https://www.youtube.com/watch?v=JdYJmbETObk', 'https://www.youtube.com/watch?v=OtgodN0wrYg']

def urls(lang):
    def track(url, content):
        return url + ('&' if '?' in url else '?') + urlencode(dict(utm_source='kit_prensa', utm_medium='pdf', utm_campaign='prensa_2026_11', utm_content=content+'_'+lang))
    return [track(SITE + ('/' if lang == 'es' else '/en'), 'web'), track(PLAY, 'google_play'), track(SITE + ('/privacidad' if lang == 'es' else '/privacy'), 'privacidad'), SITE + REL + '/zoo-esponji-imagenes.zip'] + TRAILERS

def pdfs():
    from fpdf import FPDF
    from fontTools.ttLib import TTFont
    import tempfile
    fonts = Path(os.environ.get('PRESS_FONTS_DIR', 'C:/Windows/Fonts'))
    temp_root = Path(os.environ.get('PRESS_BUILD_TEMP', tempfile.gettempdir())).resolve()
    cache = Path(tempfile.mkdtemp(prefix='zoo-press-fonts-', dir=temp_root)).resolve()
    if cache.parent != temp_root:
        raise ValueError('Unexpected temporary directory')
    mapping = {'ar':'tahoma.ttf', 'hi':'Nirmala.ttc', 'zh':'msyh.ttc', 'ja':'YuGothR.ttc'}
    try:
        for lang, d in DATA.items():
            font = fonts / mapping.get(lang, 'arial.ttf')
            if font.suffix == '.ttc':
                target = cache / (lang + '.ttf')
                f = TTFont(font, fontNumber=0); f.save(target); f.close(); font = target
            p = FPDF()
            p.set_margins(18, 17, 18); p.set_auto_page_break(False)
            p.add_font('body', fname=str(font)); p.add_font('latin', fname=str(fonts / 'arial.ttf'))
            p.set_fallback_fonts(['latin']); p.set_text_shaping(True)
            p.set_title('Zoo Esponji | ' + d['kit']); p.set_author('Zoo Esponji - ' + CONTACT)
            p.set_lang(lang); p.set_subject(d['tagline'])
            align = 'R' if lang == 'ar' else 'L'
            wrap = 'CHAR' if lang in ('zh','ja') else 'WORD'
            size = 10.4 if lang not in ('hi','ja') else 10
            def text(s, heading=False, link=''):
                p.set_x(18); p.set_font('body', size=14 if heading else size)
                p.set_text_color(*(151,75,26) if heading else (62,39,35))
                p.multi_cell(174, 7 if heading else 5.25, s.replace('—','-').replace('–','-'), align=align, new_x='LMARGIN', new_y='NEXT', link=link, wrapmode=wrap)
                p.ln(2.3 if heading else 2)
            def start(n):
                p.add_page(); p.set_fill_color(255,248,225); p.rect(0,0,210,297,'F')
                p.image(str(OUT/'identidad/icono-512.png'), x=18,y=12,w=16)
                p.set_xy(39,15); p.set_font('body',size=18); p.set_text_color(151,75,26)
                p.cell(153,10,'Zoo Esponji | '+d['kit'],align=align)
                p.set_xy(18,280); p.set_font('body',size=8); p.set_text_color(109,76,65)
                p.cell(174,7,d['date']+'  ·  '+str(n)+'/2',align=align)
                p.set_xy(18,36)
            start(1)
            text(d['tagline'],True); text(d['intro'])
            y=p.get_y(); p.image(str(OUT/'capturas/captura-1-leones.png'),x=18,y=y,w=174,h=97.875);p.set_y(y+102)
            text(d['storyTitle'],True); text(d['story'])
            if p.get_y()>276: raise ValueError(f'{lang} page 1 overflow: {p.get_y()}')
            start(2)
            text(d['factsTitle'],True)
            for fact in d['facts']: text(fact)
            for key in ['play','ai','privacy']:
                text(d[key+'Title'],True);text(d[key])
            text(d['resourcesTitle'],True)
            p.set_x(18); p.set_font('body',size=9)
            p.multi_cell(174,4.5,d['resources'],align=align,new_x='LMARGIN',new_y='NEXT',wrapmode=wrap)
            p.ln(2)
            # Compact linked resource list; full editorial permission lives in the linked ZIP and web page.
            for label,url in zip(d['links'],urls(lang)):
                p.set_x(18); p.set_font('body',size=9);p.set_text_color(27,94,32)
                p.multi_cell(174,4.8,label,link=url,align=align,new_x='LMARGIN',new_y='NEXT')
            p.ln(3);p.set_font('body',size=9);p.set_text_color(62,39,35)
            p.set_x(18);p.multi_cell(174,4.5,d['rightsTitle']+': '+d['rights'],align=align,link=SITE+('/prensa#uso-editorial' if lang=='es' else '/press#editorial-use'),new_x='LMARGIN',new_y='NEXT',wrapmode=wrap)
            p.ln(2);p.set_x(18);p.multi_cell(174,5,d['contact']+': android@davidpladel.com',align=align,link='mailto:android@davidpladel.com',new_x='LMARGIN',new_y='NEXT')
            p.ln(2); p.set_font('latin',size=9); p.set_text_color(27,94,32)
            p.set_x(18); p.cell(65,5,'English PDF',link=SITE+REL+'/zoo-esponji-press-en.pdf')
            p.cell(90,5,'All languages / Todos los idiomas',link=SITE+'/press#languages')
            p.ln(5)
            if p.get_y()>276: raise ValueError(f'{lang} page 2 overflow: {p.get_y()}')
            p.output(str(OUT/f'zoo-esponji-press-{lang}.pdf'))
            print(lang, '2 pages', round(p.get_y(),1))
    finally:
        shutil.rmtree(cache)

def pages():
    for lang in ['es','en']:
        d=DATA[lang]; es=lang=='es'; route='prensa' if es else 'press'
        base=(ROOT/'paginas'/('inicio.html' if es else 'home.html')).read_text(encoding='utf-8')
        head=base[:base.index('<body>')]
        title='Zoo Esponji · '+d['kit']
        description=('Historia, ficha del juego, PDF en 11 idiomas, capturas originales, logo y tráileres para medios y creadores.' if es else 'The story, game facts, PDFs in 11 languages, original screenshots, logo and trailers for media and creators.')
        head=re.sub(r'<title>.*?</title>','<title>'+title+'</title>',head)
        for key,val in [('name="description"',description),('property="og:title"',title),('property="og:description"',description),('name="twitter:title"',title),('name="twitter:description"',description),('property="og:url"',SITE+'/'+route)]:
            head=re.sub(r'(<meta '+re.escape(key)+r' content=")[^"]*(">)',lambda m:m[1]+e(val,quote=True)+m[2],head)
        head=re.sub(r'(<link rel="canonical" href=")[^"]+',r'\g<1>'+SITE+'/'+route,head)
        for code,url in [('es','prensa'),('en','press'),('x-default','prensa')]:
            head=re.sub(r'(<link rel="alternate" hreflang="'+code+r'" href=")[^"]+',r'\g<1>'+SITE+'/'+url,head)
        schema={'@context':'https://schema.org','@type':'WebPage','name':title,'description':description,'url':SITE+'/'+route,'inLanguage':lang,'about':{'@type':'VideoGame','name':'Zoo Esponji','gamePlatform':'Android'}}
        head=re.sub(r'<script type="application/ld\+json">.*?</script>','<script type="application/ld+json">'+json.dumps(schema,ensure_ascii=False)+'</script>',head,flags=re.S)
        head=head.replace('</head>',f'<link rel="stylesheet" href="/assets/prensa.css?v={STAMP}">\n</head>')
        footer=base[base.index('<footer'):]
        def paras(s): return ''.join('<p>'+e(t)+'</p>' for t in s.split('\n\n'))
        pdf=f'{REL}/zoo-esponji-press-{lang}.pdf'
        mb=(OUT/'zoo-esponji-imagenes.zip').stat().st_size/1_000_000
        download='Descargar' if es else 'Download'
        cards=''
        for name,filename,label in [('leones','captura-1-leones.png','Leones' if es else 'Lions'),('tienda','captura-4-tienda.png','La tienda' if es else 'The shop'),('libro','captura-5-libro.png','El libro' if es else 'The book'),('panteras','captura-6-panteras.png','Panteras' if es else 'Panthers')]:
            cards+=f'<figure class="funcion"><a href="{REL}/capturas/{filename}" download><img src="/assets/img/{name}.webp" alt="{label}" width="960" height="540" loading="lazy"></a><figcaption><h3>{label}</h3><a href="{REL}/capturas/{filename}" download>{download} PNG · 1920 × 1080</a></figcaption></figure>'
        languageLinks=''.join(f'<li><a href="{REL}/zoo-esponji-press-{code}.pdf" download hreflang="{code}"><span lang="{code}" dir="auto">{item["name"]}</span> <small>PDF · 2 '+('páginas' if es else 'pages')+f' · {round((OUT/f"zoo-esponji-press-{code}.pdf").stat().st_size/1024)} KB</small></a></li>' for code,item in DATA.items())
        story='<h2>'+d['storyTitle']+'</h2>'+paras(d['story'])+'<h3>'+d['aiTitle']+'</h3>'+paras(d['ai'])
        anchors=[('historia' if es else 'story','La historia' if es else 'The story'),('ficha' if es else 'facts','Ficha' if es else 'Facts'),('materiales' if es else 'assets','Materiales' if es else 'Assets'),('contacto' if es else 'contact','Contacto' if es else 'Contact')]
        body=f'''<body>
<a class="saltar" href="#contenido">{'Saltar al contenido' if es else 'Skip to content'}</a>
<header class="cabecera-texto"><div class="envoltura"><a class="marca" href="{'/' if es else '/en'}"><img src="/assets/img/icono-192.png" alt="" width="40" height="40">Zoo Esponji</a><nav class="idiomas" aria-label="{'Idioma' if es else 'Language'}"><a href="/prensa" lang="es" {'aria-current="page"' if es else ''}>ES</a><a href="/press" lang="en" {'' if es else 'aria-current="page"'}>EN</a></nav></div></header>
<main id="contenido">
<section class="prensa-hero"><div class="envoltura prensa-intro"><div><p class="prensa-etiqueta">{'Para medios y creadores' if es else 'For media and creators'}</p><h1>{d['kit']}</h1><p class="prensa-lema">{d['tagline']}</p><p>{d['intro']}</p><div class="prensa-acciones"><a class="boton" href="{pdf}" download>{download} PDF</a><a class="prensa-secundario" href="#materiales" >{'Ver imágenes y vídeos' if es else 'Browse images and videos'}</a></div></div><figure class="prensa-destacada"><img src="/assets/img/leones.webp" alt="{'Los leones en su recinto del juego' if es else 'Lions in their enclosure in the game'}" width="960" height="540"><figcaption>Android · PEGI 3 · 11 {'idiomas' if es else 'languages'}</figcaption></figure></div></section>
<nav class="prensa-nav envoltura" aria-label="{'En esta página' if es else 'On this page'}">{''.join('<a href="#'+i+'">'+label+'</a>' for i,label in anchors)}</nav>
<div class="envoltura prensa-columnas"><section id="{anchors[0][0]}">{story}</section><aside id="{anchors[1][0]}" class="prensa-ficha"><h2>{d['factsTitle']}</h2><ul>{''.join('<li>'+e(x)+'</li>' for x in d['facts'])}</ul><a class="boton" href="{e(PLAY)}">Google Play</a></aside></div>
<section class="envoltura prensa-bloque"><h2>{d['playTitle']}</h2>{paras(d['play'])}<h3>{d['privacyTitle']}</h3>{paras(d['privacy'])}<a href="{'/privacidad' if es else '/privacy'}">{d['links'][2]}</a></section>
<section id="{anchors[2][0]}" class="prensa-materiales"><div class="envoltura"><h2>{d['resourcesTitle']}</h2><p>{d['resources']}</p><a class="boton" href="{REL}/zoo-esponji-imagenes.zip" download>{download} ZIP · {mb:.2f} MB</a><p class="prensa-detalle">{'Contenido: 4 capturas PNG (1920 × 1080), logo PNG transparente (2048 × 2048), icono PNG (512 × 512), condiciones y enlaces a los tráileres. Sin vídeos dentro del ZIP.' if es else 'Contents: 4 PNG screenshots (1920 × 1080), transparent PNG logo (2048 × 2048), PNG icon (512 × 512), terms and trailer links. The ZIP contains no video files.'}</p><div class="funciones">{cards}</div>
<div class="prensa-logo"><img src="{REL}/identidad/icono-512.png" alt="{'Logo del león de Zoo Esponji' if es else 'Zoo Esponji lion logo'}" width="110" height="110" loading="lazy"><div><h3>{'Logo e icono' if es else 'Logo and icon'}</h3><a href="{REL}/identidad/leon-icono-master.png" download>PNG · 2048 × 2048</a> · <a href="{REL}/identidad/icono-512.png" download>PNG · 512 × 512</a></div></div>
<h3>{'Tráileres oficiales' if es else 'Official trailers'}</h3><p><a href="{TRAILERS[0]}">{d['links'][4]} · YouTube</a> · <a href="{TRAILERS[1]}">{d['links'][5]} · YouTube</a></p>
<h3 id="{'idiomas' if es else 'languages'}">{'El dossier en los 11 idiomas del juego' if es else 'The press kit in all 11 game languages'}</h3><ul class="prensa-idiomas">{languageLinks}</ul></div></section>
<section id="{'uso-editorial' if es else 'editorial-use'}" class="envoltura prensa-bloque"><h2>{d['rightsTitle']}</h2>{paras(d['rights'])}<a href="{REL}/{'Uso_editorial_de_materiales.txt' if es else 'Editorial_use.txt'}">{'Condiciones y créditos completos' if es else 'Full terms and credits'}</a></section>
<section id="{anchors[3][0]}" class="envoltura prensa-contacto"><h2>{d['contact']}</h2><p>{CONTACT} · <a href="mailto:android@davidpladel.com">android@davidpladel.com</a></p><p>{'Para entrevistas, preguntas y material adicional.' if es else 'For interviews, questions and additional materials.'}</p><small>{d['date']}</small></section>
</main>
'''
        if not es: body=body.replace('href="#materiales"','href="#assets"')
        (ROOT/'paginas'/f'{route}.html').write_text(head+body+footer,encoding='utf-8')

if __name__=='__main__':
    OUT.mkdir(parents=True,exist_ok=True)
    pdfs(); pages()
