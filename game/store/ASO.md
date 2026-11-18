# ASO de Zoo Esponji: cómo se hace bien

Proceso para mejorar la ficha de Google Play (palabras clave, textos e imágenes), tal como se hizo el 2026-11-17 y con lo
aprendido por el camino. Se apoya en las guías de ASO Mobile (enlaces al final) y en los datos de nuestra propia ficha.
Nada de adivinar: cada decisión tiene que salir de un dato medido o de lo que dice una guía.

## 0. Antes de empezar

- **Cuándo tocar la ficha.** En Google Play cambiar la ficha es más arriesgado que en Apple: Google vuelve a evaluar la
  app. Dejar **de 2 a 4 semanas** entre cambios y probar **una idea por cambio**, salvo que se decida rehacerla entera
  (como el 2026-11-17).
- **Qué mirar primero.** Instalaciones y visitas a la ficha (informes de Play, `play-gcs.mjs`, con ~5 días de retraso),
  jugadores en Matomo (`tools/matomo/`) y con qué búsquedas salimos hoy (ASO Mobile › App Keywords).
- **Ojo con los plurales.** Una búsqueda que da muy poco puede ir bien en otra forma: en Turquía «çocuk oyunları»
  (plural) da 17 y «çocuk oyunu» (singular) 323. Probar siempre singular y plural antes de descartar un país.
- **Herramienta.** ASO Mobile, **en la web**, desde el Chrome de David (tiene la sesión abierta). El conector MCP de
  ASO Mobile solo sirve para `app_search` y para añadir palabras al seguimiento: sin créditos de API, todo lo demás da 403.

## 1. Reunir ideas de palabras

1. **App Keywords › Indexación** (España y EE. UU.): con qué búsquedas sale ya el juego y en qué puesto.
2. **Keyword Finder**, pestañas **Cola larga** y **Baja competencia**: es lo que la guía pide para una app nueva.
   Las ideas salen de nuestra ficha y de los competidores que tenga la cuenta, así que mezcla mucha basura: filtrar.
3. **Keyword Check** de cada idea: además del tráfico, da las **sugerencias de la tienda** (lo que la gente teclea).
   Keyword Suggest no llegó a cargar nunca; Keyword Check lo sustituye.
4. Apuntar todo en una tabla: búsqueda, tráfico, competencia (0-10), eficiencia y quién sale arriba.

## 2. Medir cada candidata (Keyword Check)

- **Tráfico** = búsquedas diarias estimadas en ese país. **Complejidad** = competencia de 0 a 10. **Eficiencia** =
  equilibrio entre los dos (muy alta … baja).
- **Trampa de la web:** al lanzar una búsqueda, la página puede seguir enseñando unos segundos el resultado de la
  anterior. Esperar ~15 s y **comprobar que las sugerencias corresponden a la palabra** antes de apuntar la cifra. El
  país elegido se queda guardado entre páginas: mirarlo siempre.
- **«No hay datos»** = nadie lo busca (o ASO Mobile aún no la ha analizado). No merece sitio en la ficha.
- **Mirar quién sale arriba.** Si son apps gigantes (Pou, Toca Boca, Talking Tom…), no es una palabra para nosotros.
  Si salen apps parecidas y pequeñas, sí.
- **La intención importa.** «pixel art» tiene mucho tráfico, pero lo buscan para apps de dibujar: no sirve aunque
  nuestro juego sea pixel art.

## 3. Por países (Worldwide Check)

Medir las palabras buenas en todos los mercados del mismo idioma a la vez (España, México, Argentina, Colombia, Chile,
Perú… / EE. UU., Reino Unido, Australia). Cada ficha de idioma se elige con los datos de **sus** países: es-ES y es-419
no tienen por qué llevar el mismo título.

## 4. Elegir y medir a los rivales directos

- Los rivales no son los que la cuenta trae por defecto (simuladores de zoo para mayores), sino **los que salen arriba
  en nuestras búsquedas**: para nosotros, apps de animales para peques (Bebi Family, Kidospace, GoKids, Kakadoo).
- Añadirlos en la cuenta (botón «+ Competidores»). Sus posiciones en **Keyword Monitor › Competidores** tardan hasta 12 h
  en salir en Google Play.
- **Text Analyzer** con sus descripciones (botón «Pegar descripción de los competidores»): qué palabras repiten.
  Ojo: analiza bien una vez y luego deja de refrescar; si pasa, contar en local.

## 5. Escribir la ficha

Reglas de las guías de ASO Mobile:

- **Título (30):** lo que más pesa. Marca + la palabra más eficiente del idioma. Sin «gratis», «el mejor», emojis ni
  mayúsculas. (Nuestra regla además: nada de «educativo» ni precios.)
- **Descripción breve (80):** 1 o 2 búsquedas buenas, escritas con naturalidad, sin repetir el título.
- **Descripción larga (4000, ideal ~2500):** la frase principal al principio (pesa más lo de arriba y los
  encabezados). **Como mucho una repetición exacta cada 250 letras y menos del 3 %.** Precisión antes que repetición.
- También cuentan el nombre del desarrollador, el del paquete (poco) y el texto de las reseñas.
- No traducir palabras clave: cada idioma, su propia búsqueda.
- Comprobar límites y repeticiones con `PYTHONIOENCODING=utf-8 python densidad.py` (todas las fichas; sale «MAL» si un
  texto se pasa de largo o una búsqueda se repite más de una vez cada 250 letras o llega al 3 %). Al añadir un idioma,
  poner sus búsquedas en `CLAVES`. En japonés y chino cuenta por letras, porque no separan las palabras con espacios.
- **Nada que el juego no tenga.** Los textos los revisa David antes de subir.

## 6. Imágenes (conversión)

Lo que hacen los rivales que convierten y lo que dicen las guías:

- **Icono:** cara del animal grande, fondo de color vivo y algún objeto (moneda, regalo). Sin letras. Comprobar a 48 px
  y con las esquinas redondeadas de Play. Lo dibuja ChatGPT con la imagen de base y un prompt (ejemplo en
  `prompt-icono-2026-11.txt`); el original va al repo privado.
- **Capturas:** todas con rótulo grande (Google lee el texto). Las **3 primeras explican el juego**. Animales **en
  primer plano**: como es pixel art, se amplía por píxeles enteros (`capturas_ficha.py › de_cerca`).
- **Cuántas:** Play admite **8 por tipo de dispositivo**: 8 de móvil, 8 de tableta de 7" y 8 de 10". Las de 1920x1080
  valen para las tres. Los rivales con «14-20 capturas» están sumando las de tableta.
- **Gráfico de funciones (1024x500):** la portada, el nombre, el león y la edad.
- **Vídeo:** ya tenemos tráiler; dos rivales no.

Cómo se generan (con `npm run dev` en marcha, uno detrás de otro):

| Script | Qué saca |
|---|---|
| `shots.mjs` + `make.py` | Capturas limpias de siempre (zoo, tienda, libro…) |
| `shots-cuidados.mjs [es\|en]` | Animales comiendo, baño y clínica |
| `shots-cerdo.mjs [es\|en]` | El cerdito de lado mientras se le cepilla |
| `shots-galeria.mjs [es\|en]` | Cada especie comiendo y cada zona del parque |
| `capturas_ficha.py` | Las 8 de móvil con rótulo y el gráfico de funciones |
| `candidatas.py [es\|en]` | Candidatas numeradas (C1…) para que David elija |
| `icono_app.py <original>` | Icono de Play 512 y los de Android de la app instalada |

Las imágenes quedan en `game/store/out/` (ignorada por git).

## 7. Subir

1. `PYTHONIOENCODING=utf-8 python plan_subida.py > out/plan-ficha.json` (textos e imágenes por idioma).
2. Con **permiso expreso de David, cada vez**: `node play-ficha.mjs subir <plan>` (script privado de Play, fuera del
   repo, junto a `play-publicar.mjs`). Cada tipo de imagen del plan se borra y se vuelve a subir en ese orden.
3. `node play-ficha.mjs ver` para comprobar. **Enviada no es publicada:** hasta que Google lo revise, en la tienda sigue
   lo anterior (Play Console › Resumen de publicación).
4. El icono de la app instalada va aparte, en la siguiente versión (`icono_app.py` cambia los mipmaps de Android).

## 8. Medir el resultado

- **Keyword Monitor** de ASO Mobile: posiciones diarias de las búsquedas elegidas (se refresca cada 12 h en Google
  Play). Añadir allí cada palabra nueva (por la web o con `account_add_keywords` del conector).
- **Play Console:** visitas a la ficha, conversión e instalaciones, comparando 2-4 semanas antes y después.
- Con ~10 visitas al día, un experimento A/B de la ficha tarda mucho en dar resultado: mejor comparar antes y después.

## Fuentes

- [Lección 4: textos para Google Play](https://asomobile.net/en/blog/lesson-4-text-optimization-for-google-play/)
- [Fichas de Google Play en 2026](https://asomobile.net/en/blog/app-listings-in-google-play-2026/)
- [Cómo elegir palabras clave](https://asomobile.net/en/blog/how-to-pick-up-keywords-for-your-app/)
- [Estrategia de palabras clave](https://asomobile.net/en/blog/keyword-strategy-in-the-app-store-and-google-play/)
- [Guía de ASO 2026](https://asomobile.net/en/blog/aso-app-optimization-checklist-for-google-play-and-app-store)
- Ayuda de ASO Mobile: [Keyword Check](https://help.asomobile.net/ru/articles/4602547-keyword-check),
  [Keyword Monitor](https://help.asomobile.net/ru/articles/4549184-keyword-monitor),
  [App Keywords](https://help.asomobile.net/ru/articles/9783054-app-keywords)

## Pendientes (a 2026-11-18)

- [ ] **Revisión de Google** de la ficha enviada el 2026-11-17 y reenviada con los idiomas nuevos el 2026-11-18: comprobar en Play Console que pasa y que la tienda la
      enseña.
- [ ] **Hacia el 2026-12-01:** posiciones en Keyword Monitor (España, EE. UU., México y Colombia) y visitas,
      conversión e instalaciones en Play Console, comparadas con las dos semanas de antes. Separar el efecto de
      «Aprobada por profesores» (2026-11-16), que llegó a la vez.
- [ ] **Icono de la app instalada:** está en `feat/release-2.11.0`; sale con la próxima subida (versionCode 14).
      Comprobarlo en el móvil al probar el paquete.
- [x] **pt-BR, fr-FR, hi-IN y en-IN (nuevo)** (2026-11-18): búsqueda propia de palabras en Brasil, Francia e India y
      textos al día (granja, cerdos, baño, clínica). Datos y textos en `ficha-play-idiomas-2026-11-18.txt`. Enviados a
      revisión junto con lo del 2026-11-17 (edición 11061154857540134968). Palabras añadidas al Keyword Monitor (BR, FR,
      IN). Siguen sin capturas propias: usan las del idioma principal.
- [x] **Revisión de densidad** (2026-11-18): las 7 fichas enviadas (es-ES, es-419, en-US/GB, pt-BR, fr-FR, hi-IN,
      en-IN) cumplen: ninguna búsqueda pasa del 1,8 % ni de una vez cada 250 letras (`densidad.py`).
- [ ] **Tanda 2, SIN SUBIR** (preparada el 2026-11-18). David pidió subirla **cuando Google apruebe** lo enviado el 17
      y el 18 (para no tocar esa revisión). Lleva:
      · Textos de ar, ru, pt-PT, it, ja y zh-CN al día, y 7 fichas nuevas: zh-TW (Taiwán), de-DE, id (Indonesia),
        ko-KR, tr-TR, pl-PL y nl-NL. Datos y textos en `ficha-play-resto-idiomas-2026-11-18.txt`.
      · Capturas de es/en sin el león repetido (jirafa en la 2.ª, la cabra en la clínica, cebra en tableta) y con la
        tienda, el libro y el parque en inglés en las de inglés.
      · Árabe, indonesio y turco sin cerdos: texto y capturas propias (elefante en el baño, tienda sin cerdos).
      Al subir: `python plan_subida.py tanda2 > out/plan-ficha-tanda2.json`, permiso de David, `play-ficha.mjs subir`
      y añadir las búsquedas al Keyword Monitor (SA, EG, RU, PT, IT, JP, TW, DE, ID, KR, TR, PL, NL).
- [ ] **Vietnam y Tailandia:** sin ficha de momento (70 y 106 búsquedas al día). Volver a medirlas más adelante.
- [x] **Captura del final de la votación** (2026-11-18): aviso de la ganadora y tablón con confeti, en es y en, en
      `game/store/votacion/` (cómo se sacan, en su README). Para la próxima votación, lo mismo.
- [ ] **Capturas en su idioma** para pt-BR, fr-FR e hi-IN (los scripts de capturas solo admiten `es` y `en`).
- [ ] **Contador de monedas** visible (con 92 280 monedas) en las capturas de zonas del parque (bambú y polo, en
      tabletas): rehacerlas sin tantas monedas o tapándolo.
- [ ] **Gráfico de funciones:** sigue con el león de antes (`make_icon.py`); se podría poner el del icono nuevo.
- [ ] **Edad «2-5 años»:** la ficha la anuncia; mirar en Matomo si cambia el tipo de jugador y si el tutorial sin
      palabras basta para los más pequeños.
- [ ] **Rivales en EE. UU.:** sus posiciones aún no salían en Keyword Monitor el 2026-11-17; mirarlas en la próxima
      revisión.
- [ ] **Promo MAX de ASO Mobile** hasta el 2026-11-22: después, la cuenta vuelve al plan gratis (Keyword Check y Text
      Analyzer siguen siendo gratis; el seguimiento puede quedar limitado).
