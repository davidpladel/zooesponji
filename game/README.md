# Zoo Esponji 2.0 (Phaser 4 + TypeScript)

Versión 2.1.3. En la documentación de desarrollo se llama "v3" (nombre interno: fue el tercer motor, tras la v1 en DOM y el prototipo en Canvas).

Spec: `docs/superpowers/specs/2026-09-27-motor-phaser-v3-design.md`

## Comandos (desde `game/`)

```bash
npm install          # dependencias
npm run dev          # juego en http://localhost:5173
npm test             # tests de lógica (Vitest)
npm run test:e2e     # pruebas de juego en el navegador (Playwright; en local usa el Chrome instalado; la de capturas en inglés, solo a mano con CAPTURAS=1; si alguna falla por tiempo, --workers=1). Ver «Pruebas de juego» abajo
npm run build        # build de producción en dist/
npm run check:manifest # comprueba el manifiesto fusionado de Android (sin identificador de publicidad, con el de AdMob); con `-- --publicar` exige el identificador real. Compilar antes con Gradle
npm run check:aab      # comprueba que el AAB de publicación salió de R8 (con `r8.json` y el archivo de desofuscación, sin reglas que lo apaguen) y enseña lo que pesa el código Android. Compilar antes con Gradle
npm run make:ui-assets # copia la letra y los iconos de la interfaz a public/ (solo si cambian)
npm run make:test-map  # regenera el mapa de prueba
npm run make:zoo-map   # regenera el mapa del zoo desde scripts/make-zoo-map.mjs (nunca se toca a mano el .tmj)
npm run map:snapshot   # vuelve a sacar la «foto» de los caminos (solo si se quitan caminos a propósito)
npm run map:preview -- --salida <png>  # dibuja el mapa lógico en un PNG para revisarlo
npx playwright test recorrido  # la cuidadora y Luna recorren a pie todos los caminos y el interior de los recintos (unos minutos)
npm run ia:mando       # mando para los jugadores con IA (ver «Jugadores con IA»)
npx cap sync android # copia la build al proyecto Android
npx cap open android # abre Android Studio (▶ Run para probar en el móvil)
```

Icono y ficha de Play (desde `game/store/`, Python + Pillow + numpy): `python make_icon.py` dibuja el león y genera el icono 512, los iconos de Android y los splash; con el juego en marcha (`npm run dev`), `node store/shots.mjs` saca las capturas a `store/out/` (varias tomas de cada recinto, para elegir); `node store/shots-tablon.mjs` saca el muro del tablón con las ideas reales, en español e inglés; después `python make.py` compone el gráfico de funciones 1024×500 y copia las capturas a `play/`. El splash usa la letra `store/fonts/Baloo2.ttf` sobre el azul cielo `#58B0F0`. Los textos de la ficha, en todos los idiomas, están en `store/ficha-play-traducciones.txt` y se suben siempre juntos (ver «Idiomas de la ficha de Play» en el README principal).

### Pruebas de juego

- **Usan el servidor del 5173.** Si ya hay un `npm run dev` abierto, las pruebas lo reutilizan; si no, arrancan uno
  propio y lo cierran al acabar. **No pares ni reinicies el `npm run dev` mientras corren:** las páginas que estén
  cargando fallan con `ERR_CONNECTION_REFUSED`. Eso no es un fallo del juego: se vuelven a lanzar (pasó el
  2026-11-09).
- **De una en una** (`--workers=1`) si el PC está cargado o hay jugadores con IA en marcha.
- **Capturas para revisar a ojo:** un `.spec.ts` temporal en `tests/e2e/` que hace `page.screenshot` a una carpeta
  fuera del repo y se borra al acabar. En idiomas de derecha a izquierda, el lienzo se busca con
  `page.locator('canvas').first()`: en árabe hay más de un `canvas` en la página.

Tráiler (43 s, español e inglés): guion, pasos y piezas en [`trailer/README.md`](trailer/README.md).

## Arte

El arte (packs de VectoRaith) **no está en este repositorio** por licencia. Para jugar con él:

1. Tener clonado el repo privado `zooesponji-private` **al lado** de este (`C:\Projects\games\zooesponji-private`).
2. Desde `game/`: `npm run art:import`. Lee los zips de `packs/` y los dibujos de `art-work/terminados/`, y deja todo en `public/art/` (ignorado por git).

Sin `public/art/` el juego funciona con arte provisional (emojis y colores planos); así se ejecuta en GitHub Actions.

- **Panda y pantera de los niños:** dejar `panda.png` / `pantera.png` (hojas 3×4 exportadas de Piskel) en `zooesponji-private/art-work/terminados/` y volver a ejecutar `npm run art:import`. Las filas deben ir en orden abajo, izquierda, derecha, arriba; si una hoja viene con otro orden, `overrideRows` en `art.config.json` lo corrige (la pantera lleva `[3, 1, 2, 0]`: su hoja tiene la vista de espaldas arriba).
- **Qué se extrae de cada pack:** `art/art.config.json`.
- **Terreno:** formato RPG Maker A2 (`src/core/autotile.ts` compone cada tile con 4 cuartos de 8 px según sus vecinos).
- **Decoración:** piezas ("props") recortadas de los packs en `art/art.config.json` (`props`, `foods`, `companions`). Para catalogar: `npm run art:grid -- <zip> "<hoja>" <salida.png>` (rejilla ampliada) y `npm run art:props-sheet -- <salida.png>` (tablón de todas las piezas). Las salidas van fuera del repo.
- **Agua animada:** una pieza con `animate: { step, count, area?, fps? }` en `art.config.json` se importa como hoja de fotogramas (`step` = distancia entre fotogramas en la hoja del pack; `area` = zona que cambia). Las piezas (animadas o compuestas) aceptan también `edits` con `swap` de colores, como los animales: así salen las charcas de barro (`pond-grassland-mud`, `water-savannah-mud`), la misma charca con los azules del agua cambiados a marrón.
- **Dibujos propios de un animal (de los niños o hechos con ChatGPT).** Protocolo (2026-11-09, cerdos):
  1. **Revisar antes de usarlo:** hoja de 48×64 (3 columnas × 4 filas de 16×16), fondo transparente sin
     semitransparencias (solo píxeles opacos o vacíos), contorno `#414040` como el pack, filas en orden de frente,
     izquierda, derecha y de espaldas, patas tocando el borde de abajo (si no, flota sobre la sombra) y la columna
     del medio distinta (paso de andar). Si son varios del mismo recinto, cada uno con algo propio además del color,
     y los colores que diga su página del libro (cambiarlos obliga a reescribirla en 11 idiomas).
  2. **Dónde va:** `zooesponji-private/art-work/terminados/<especie>-<nombre>.png`, nunca en este repo.
  3. **Engancharlo:** `"override": "<archivo>.png"` en su aspecto de `art.config.json`, dejando el `zip`/`file` y
     los `edits` del pack como reserva: sin el repo privado, el juego usa el dibujo del pack recoloreado.
  4. `npm run art:import` (dice «usando el dibujo de los niños») y una captura del recinto y de su página del libro.
- **Carne:** cuando exista `zooesponji-private/art-work/terminados/carne.png`, `art:import` la usa en la bandeja (mientras, emoji 🥩).
- **Mapa:** `npm run make:zoo-map` regenera `public/assets/maps/zoo.tmj` (mapa lógico de 96×60; el arte lo pone el juego). El parque de siempre queda en el centro y de sus caminos salen tres zonas, cada una con su cartel: sabana y elefantes al norte, polo al oeste y granja al este. Desde el 2026-11-01 hay atajos por los bordes y a las esquinas del cuadrado central, y una «U» arriba con un jardín de flores dentro. `npm run map:preview -- --antes <tmj>` dibuja el mapa lógico en PNG con lo nuevo en rojo (por defecto en `docs/superpowers/mockups/`).
- **Tienda por dentro:** `npm run make:shop-map` regenera `public/assets/maps/tienda.tmj` (20×12: suelo, pared, muebles, tendero, 5 peanas, felpudo y decoración). `art:import` recorta los muebles del *Interior Tileset Pack – Essentials* (`interior` en `art.config.json`, salen como `interior-*.png`); sin ellos la tienda se pinta con colores. `npm run make:campanita` y `npm run make:paso` vuelven a sintetizar `public/audio/campanita.wav` y `paso.wav`. Dentro, la cuidadora anda por la rejilla de `tienda.tmj` con las peanas bloqueadas (`core/shopWalk.ts`: alcance, punto de aproximación, pista y felpudo). Tienda: enseña como mucho 5 artículos, los más baratos que se pueden comprar (recintos por abrir y "otro animal" de los abiertos, mezclados y de menor a mayor precio; `core/shopEntries.ts`). Las peanas se deciden al entrar y no cambian mientras se está dentro: si un animal se completa, su peana se queda con el sello AGOTADO y lo siguiente sale en la próxima visita. En la estantería hay un **libro secreto** (`BookScene`, `core/book.ts`, `data/book.ts`): 56 páginas (la historia, Luna, Mary y cada animal con nombre) repartidas en capítulos por zona, con un índice tocable y una portadilla por capítulo que no cuentan. Las páginas salen de los recintos de `data/pens.ts`; se guardan los ids leídos en `book` del guardado. Desde la 3.ª visita a la tienda (`shop.visits` del guardado), si el libro no se ha abierto nunca (`book.opened`), se ve parpadeando encima de la estantería (`showBookNotice`). En la página de cada animal, debajo del dibujo, van sus monedas sin palabras (`pageCoins`, 2026-11-09): «🪙 n» por comer (lo mismo que por lavarlo o curarlo) y, si tiene comida especial, su dibujo y lo que da de más («🐇 +1 🪙»). Bloqueada, también, con una estrella en vez de la comida; las portadillas no llevan.

### Animales distintos dentro de un recinto

Cada animal puede tener su propio **aspecto**: una entrada en `animals` de `art/art.config.json`
con la hoja del pack y una lista de `edits` (retoques):

- `swap`: cambia colores exactos (`"f4f3f2": "e8c9a0"`), opcionalmente solo en una `area`
  `[x, y, ancho, alto]` del fotograma.
- `dots`: pinta píxeles sueltos `[x, y, color]`.
- `rows`: a qué filas se aplica (0 de frente, 1 izquierda, 2 derecha, 3 de espaldas).
- `cols`: a qué fotogramas del paso (0, 1, 2); el central va 1 px más alto en la cabra.

`shrink` reduce cada fotograma a ese lado en píxeles (Chispa, 13). Con `retouchOverride`, `shrink` y `edits` se aplican también encima de un dibujo terminado de los niños (primero se reduce y luego se cambian colores): así sale Jose, el panda de los niños a 22 px y con las manchas en gris oscuro. `npm run art:preview -- <aspecto>`
deja una vista ×8 en el repo privado para ajustarlos. El aspecto se asigna al animal en
`src/data/pens.ts` (`look`). Tras cambiar la configuración, o añadir una especie o un aspecto, hay que
ejecutar `npm run art:import`: el manifiesto exige la hoja de cada especie y, si falta, el juego arranca
con emojis. `npm run art:compare -- <nombre> <aspecto> <aspecto>…` deja en el repo privado una imagen
con varios aspectos juntos, para ver si se distinguen.

Un recinto puede mezclar especies (sabana: jirafas, cebras y gacelas; establo: caballos, gallinas y
gallo). Se da de comer al animal que se toca, con la bandeja de su especie, y la tienda vende el
siguiente de la lista del recinto al precio de su especie. Las especies grandes llevan `radius` en
`src/data/animals.ts`: se separan más al pasear y se tocan por el cuerpo, no por los pies.

- **Cuidados (cerdos, limpieza y clínica):** la lógica es pura y está probada: `core/care.ts` (sucios, enfermos y charcos de barro, que se guardan en `care` del guardado; reglas de 2 enfermos como mucho y de recintos distintos; sitio del charco), `core/careDirector.ts` (relojes del barro y de las enfermedades: solo cuentan con el mundo en marcha) y `core/cleaning.ts` (los 5 pasos y el giro del cepillo). Escenas: `CleanScene` (limpieza), `ClinicScene` (la clínica por dentro, con `ShopInterior` y `Shopkeeper` reutilizados) y `CureScene` (medicinas). El charco es la charca animada del pack del suelo del recinto (`pond-grassland` en los cerdos, `water-savannah` en los elefantes) y, con barro, su versión `-mud` (los azules cambiados a marrón con `edits` en `art.config.json`; `puddleArt` en `core/care.ts` elige cuál). `world/ClinicBuilding.ts` pinta el edificio a píxeles. Desde la primera entrada en la clínica (`clinic.visits` del guardado) sale su botón en el HUD, debajo del de la tienda (`clinicButtonVisible` en `core/hud.ts`): la cuidadora va andando sola hasta la puerta. `npm run make:clinic-map` regenera `public/assets/maps/clinica.tmj`. El cerdo no está en los packs: sus cinco aspectos son dibujos propios (`cerdo-rosita.png`… en `art-work/terminados` del repo privado, enganchados con `override` en `cerdo*` de `art.config.json`); sin el repo privado se usa el ternero blanco del pack de granja recoloreado; los veterinarios salen de `generic_jobs_02` (`vets`).
- **Luna:** `npm run make:luna -- --force [--vista <png>]` dibuja su hoja (3×4 de 16×16) en `game/art/luna.png`. Es dibujo propio, así que va en este repo; `art:import` la copia a `public/art/pet-luna.png` (`pets` en `art.config.json`). Sin arte se ve como 🐕.
- **Calcetín:** `npm run make:calcetin` dibuja el icono en `art-work/terminados/calcetin.png` del
  repo privado si no existe; si los niños pintan el suyo, no se toca.

## Mapa del zoo

Todo el mapa sale de `scripts/make-zoo-map.mjs` (`npm run make:zoo-map` → `public/assets/maps/zoo.tmj`, 117×75 casillas).
Plaza de la fuente de 15×13 con la fuente sobre una isla de su tamaño, caminos de 3 de ancho que llegan a la plaza,
recintos de al menos 14×9 por dentro con el paisaje de cada especie y farolas repartidas solas por los caminos.

- **Regla de pisar:** todo lo que no es agua se puede subir (rocas, meseta, cueva, hierba, flores, helechos); árboles,
  troncos, arbustos, bambú y objetos de granja bloquean su base. Lo que se pisa lleva `walk` y se dibuja siempre
  por debajo de la cuidadora, Luna, los animales y los visitantes (`propDepth`).
- **Agua:** es una zona propia del mapa (objetos `agua` con `kind` `agua` o `barro`), no un prop que bloquea: así en
  el risco de la pantera la roca se pisa y la cascada no. `waterAt` dice en qué charca está un punto.
- **Tienda:** la puerta (2 casillas) está bajo la casilla 4 del edificio, donde el dibujo tiene la puerta; el camino
  baja de ella y entra en la plaza con un codo.
- **Farolas** (`lampAt` en el generador; las 4 del pack en `docs/mockups/2026-11-07-guia-tienda/farolas-del-pack.png` del repo privado):
  con el camino a un lado, la de brazo (`lamp`, con `flip` si el camino está a la izquierda), y el farol cuelga sobre
  él; con el camino debajo, la de frente (`lamp-front`); con el camino encima, la de espaldas (`lamp-back`). Las de
  la plaza y la entrada van a mano; las demás se reparten solas. Para revisarlas de una en una, la ayuda de pruebas
  `lookAtTile(x, y)` mueve la cámara a una casilla.
- **Fuente de la plaza:** la animada del pack con el junco borrado y el león del logo encima, sobre una peana de
  piedra (opciones `refill` y `overlay` de `art.config.json` para piezas animadas; `overlay` es una lista y admite
  dibujos propios de `game/art/` con `art`). El león sale de `art/make_fountain_lion.py`.
- **Muro de abajo:** los tramos salen pegados a los dos lados del portón.
- **Tablón:** solo se ve con `VITE_COMMUNITY_URL` (en `.env.production.local`); con `npm run dev` no sale.
- **Carteles de recinto:** medallón con el animal de frente sobre un poste (`world/Medallion.ts`); los grandes se
  reducen a escala entera y se quedan con la cabeza. Los carteles de zona siguen siendo de texto.
- **Foto de los caminos** (`tests/unit/data/caminos.json`): si un cambio quita casillas de camino, `caminos.test.ts`
  falla y dice cuáles. Si es a propósito, `npm run map:snapshot` y se explica en el commit.
- Las pruebas del mapa (`zoomap`, `caminos`, `recintos`, `tour`) leen las posiciones del propio mapa, no números
  fijos. La prueba de juego `recorrido.spec.ts` hace andar a la cuidadora tocando la pantalla por una ruta que pisa
  todas las casillas (`core/tour.ts`) y comprueba que llega, que Luna la sigue y que nada que se pisa queda encima.
- **Histórico del mapa:** cada vez que cambia el mapa (o entra algo nuevo que se ve en él) se saca una foto del zoo
  entero con todo comprado y se guarda en `mapa-historico/` del repo privado (lleva el arte de los packs, nunca aquí).
  Con `npm run dev` en marcha, desde `game/`: `node ../../zooesponji-private/mapa-historico/foto-mapa.mjs`. Se
  apunta qué hay nuevo en la tabla de su README.

## Llegar a la tienda sin leer

- **Botón de la tienda** debajo de las monedas (tiendita en píxeles, `core/guideArt.ts`). Antes de la primera visita
  (`shop.visits` del guardado; las partidas viejas con compras o con Luna cuentan como visitada) saca **huellas de
  Luna** por la ruta de la cuidadora hasta la puerta (`world/PawTrail.ts`): se apagan al pisarlas, al volver a tocar
  el botón, al entrar o a los 30 s. Después de la primera visita la cuidadora va andando sola.
- **Bocadillo del borde:** si la puerta no se ve (con huellas o en el paso de la tienda del tutorial), un bocadillo
  crema con la tiendita sale en el borde con la colita hacia ella. No se gira: hay un dibujo por lado.
- **Mano:** la de Lintnaya (CC0, `public/assets/ui/hand.png`, ×4). Tocar una comida sin arrastrarla hace que la
  mano la lleve dos veces a la boca del animal (salvo si el tutorial ya lo está enseñando). En el tutorial la mano
  lleva una comida normal (a la cabra, la zanahoria), no la piedra ni el conejo, que son de sorpresa (`goodFood`).
- **Monedas de inicio:** una partida nueva empieza con `STARTING_COINS` (`core/economy.ts`), lo justo para comprar
  lo más barato de la tienda al empezar (hoy otra cabra, 10). Se calcula de los precios: si cambian, cambia solo. El
  aviso «Cómpralo en la tienda» lleva la tiendita pixelada en vez del emoji.
- **Libro:** si no se ha abierto nunca, se abre por la primera hoja aunque se haya comprado algo; luego, cada compra
  lo deja en la página del animal nuevo, y tras varias compras sin leer, en la primera de ellas (`core/book.ts`).
- **Matomo:** `mapa | boton-tienda | huellas/apagar/andando` y `comer | pista-arrastrar | …` dicen si se usan estas
  ayudas; el resumen (`node tools/matomo/resumen.mjs`) tiene apartados de tutorial y de «ayudas sin palabras».
- **Lecciones de limpieza y clínica:** al salir de la tienda con un recinto de barro abierto (cerdos, elefantes) o con
  la clínica, y si su aviso no ha salido nunca, sale el aviso de esa lección (`save.tutorial.cleanOffered` y
  `clinicOffered`; nunca dentro de la tienda). A quien ya lo tenía y no vuelve a la tienda, le sale a los 20 s de
  empezar la partida; si salta uno, el siguiente espera 1 minuto. La lección ensucia o pone malito al momento a un animal suyo (o usa uno que
  ya lo esté) y la mano guía cada paso. En Matomo, los eventos `tutorial | …` llevan la lección en el nombre (`inicio`,
  `limpieza/…`, `clinica/…`) y `tutorial-prepara` dice qué se preparó para practicar.

## Estadísticas: qué hacer con cada cosa nueva

Protocolo (revisado el 2026-11-09 con los cuidados). Cada novedad que el niño pueda tocar o que le pase:

1. **Un aviso en el bus** (`systems/events.ts`) desde la escena, con lo justo: ids, nunca textos.
2. **Su traducción en `GameTracker`** (`systems/analyticsEvents.ts`), con una prueba en
   `tests/unit/analyticsEvents.test.ts`. Los animales van con su recinto delante (`residentName`: `cerdos/rosita`) y
   lo comprado se nombra igual al mirarlo, al no llegar y al comprarlo (`edificio/clinica`, `mascota/luna`).
3. **La acción en `CATALOG`** (`core/eventCatalog.ts`): única en todo el catálogo.
4. **Escrita en su spec**, en una tabla «Estadísticas (Matomo)»: `eventCatalog.test.ts` falla si una acción no sale
   en ninguna de las specs que lista (al crear una spec nueva con eventos, se añade a esa lista).
5. **Lo que se tiene** (un recinto, la clínica, Luna) va también en `tiene` al empezar el día y al comprarlo, para
   comparar solo entre quienes lo tienen.
6. **Su apartado en `tools/matomo/resumen.mjs`** y `node tools/matomo/resumen.mjs` con los datos que haya, para ver
   que sale sin errores.
7. Las partidas de los jugadores con IA llevan las estadísticas apagadas (`settings.stats: false` en su escenario).

## Jugadores con IA

Niños simulados (5 años sin leer y 10 años que lee) juegan a la versión construida solo con capturas, tocando,
arrastrando y esperando, y dejan un informe de UX/UI y fallos. Perfiles y objetivos: `scripts/ia/perfiles.md`;
encargo de cada jugador: `scripts/ia/instrucciones.md`.

1. `npm run build`, y en ventanas aparte `npm run preview` y `npm run ia:mando` (escucha en `127.0.0.1:7801`).
2. Cada jugador es un subagente con Sonnet que recibe `instrucciones.md` con su perfil, objetivo e id.
3. Capturas, diario e informes van al repo privado: `zooesponji-private/docs/jugadores-ia/AAAA-MM-DD/<id>/`, y el
   resumen de la pasada en `resumen.md` de esa carpeta. 30 acciones como mucho por partida.
4. **Los jugadores se lanzan de uno en uno, nunca en paralelo:** seis navegadores a la vez dejan el PC muy lento.
5. **Escenarios** (`scripts/ia/escenarios.ts`; al añadir un dato al guardado, se añade también a cada escenario o
   falla `iaEscenarios.test.ts`): `/partida` con `"escenario": "cuidados"` empieza con una partida
   preparada (cerdos y elefantes llenos, clínica comprada, tres animales manchados, dos malitos y charcos de
   barro), para que el objetivo `cuidar` no gaste acciones en comprarlo todo. Llevan las estadísticas apagadas: las
   partidas de IA no cuentan en Matomo. `tests/unit/iaEscenarios.test.ts` comprueba que el juego las lee tal cual.

## Interfaz

Las piezas de los menús (píldoras, paneles, carteles, chapa de cerrar, monedas) están en `src/ui/`. Se pintan con Canvas 2D en texturas porque el juego usa `pixelArt: true`. Todo botón pasa por `makePressable` (`src/ui/press.ts`), que le da el efecto al pulsar, y todo texto de la interfaz se crea con `addUiText` (`src/ui/text.ts`) para que no tiemble al cambiar de tamaño. Los bocetos de referencia están en `docs/superpowers/mockups/`.

- **Sin palabras cuando se pueda:** iconos, números y el dibujo del juego (la moneda de `coinImage`, la comida de
  la bandeja, la tiendita o la cruz de `core/guideArt.ts`) en lugar de texto. Así cabe en los 11 idiomas sin
  traducir y lo entienden los niños que no leen (botón de la tienda y de la clínica, monedas del libro).
- **Árabe (derecha a izquierda):** un número con signo («+1») sale al revés («1+»). Se aísla con
  `String.fromCodePoint(0x2066)` delante y `0x2069` detrás, como en las monedas del libro. Nunca se pegan esos
  caracteres tal cual en el código: no se ven al leerlo.
- **Sin emoji para algo:** se dibuja a píxeles en una tabla de letras (la toalla en `ui/towelArt.ts`, la tiendita y
  la cruz en `core/guideArt.ts`) con su prueba de medidas y colores.

## Estructura

- `src/core/` — lógica pura sin Phaser (reacciones, economía y extras, guardado, A*, mapas, movimiento, `flock` para que los animales no se pisen, `petting` para el aforo de la granja de contacto, `back` para el botón atrás, `adPacing` para el ritmo de la publicidad, `adConfig` para la configuración de AdMob). Todo con tests.
- `src/data/` — contenido: animales, comidas, tienda, libro del zoo (`book.ts`: ids de página y qué las desbloquea) y textos (`strings/`: `es.ts` y `en.ts`, una clave por texto; `en.ts` no compila si le falta una; todo texto visible pasa por `t()`, que usa el idioma activo).
- `src/systems/` — eventos, sesión, almacenamiento, zoom, `audio` (samples y música), `platform` (botón atrás, segundo plano, girar el móvil), `errors` (pantalla ¡Ups!), `language` (idioma activo y detección por el idioma del móvil), `ads` (publicidad con premio: cuándo se pide y se ofrece un anuncio), `adProvider` (avisos del SDK), `adsInstall` (único archivo que toca el complemento de AdMob; solo instala en Android).
- `src/scenes/` — escenas de Phaser (solo dibujan y recogen input): Boot, Preload, Title, World, Feed (dar de comer), Clean (limpieza), Shop (tienda), Clinic (la clínica por dentro), Cure (curar), Book (libro del zoo), Hud, Settings (menú ⚙️: ajustes, idioma, créditos, privacidad y salir), Quit (¿Salir?), Rotate (gira el móvil), AdOffer (panel que ofrece un anuncio), TutorialOffer (aviso de la primera vez y de las lecciones de limpieza y clínica) y Tutorial (la mano que enseña; una cola de lecciones: inicio, limpieza y clínica; pasos en `core/tutorial.ts`, qué avisos tocan y con qué animal se practica en `core/lessons.ts`).
- Luna: `core/petFollow.ts` (sigue el rastro de la cuidadora y espera en la puerta de los recintos) y `world/ShopPet.ts` (curiosea por la tienda; destinos con `pickShopSpot` de `core/shopWalk.ts`).
- `src/world/` — ayudantes del mundo: `Pens` (los animales de cada recinto, cada uno con su identidad, los candados y el toque sobre un animal para darle de comer; los recintos que no se ven no se actualizan), `ShopBuilding` (edificio y puerta de la tienda), `ShopInterior` (la tienda por dentro), `ShopKeeperWalker` (la cuidadora dentro de la tienda), `Shopkeeper` (el tendero), `ShopHint` (huellas de pista), `VisitorCrowd` (visitantes; en el recinto de ovejas entran a acariciar, 3 como mucho, y salen corazones).

## Añadir un animal

1. Especie en `src/data/animals.ts`: su nombre (clave de `src/data/strings/es.ts`, con su traducción en `en.ts`), reacciones solo para las comidas de su bandeja (4 o 5), monedas y, si se pueden comprar más animales sueltos, `extraCost` + `extraNameKey`.
2. Recinto en `src/data/pens.ts`: precio (sin precio, viene abierto de inicio) y lista ordenada de residentes (`id`, especie, aspecto). Su capítulo del libro se elige en `CHAPTER_PENS` (`src/data/book.ts`) y las páginas salen solas. El `id` de cada residente es el de su página en `src/data/book.ts`. La tienda sale de esta tabla.
3. Sprites del aspecto: entrada en `art/art.config.json` (hoja del pack o dibujo de los niños) y `npm run art:import`.
4. En el mapa de Tiled, capa `objetos`: rectángulo de tipo `recinto` y objeto de tipo `puerta`, ambos con la propiedad `penId`, que lleva el id del recinto.
5. Textos en los dos idiomas: nombre de la especie, frase del tendero (`shop.about.*`), «otro…» (`shop.extra.*`) y título y texto de la página de cada residente (`book.page.<id>.*`). El nombre propio no se traduce.

Los tests de contenido fallan si falta alguna de estas piezas.

## Depuración

En `npm run dev` existe `window.__ZOO__` en la consola del navegador (p. ej. `await __ZOO__.addCoins(10)`). No existe en la build de producción.

Ganchos disponibles: `addCoins(n)`, `openFeed('leon')`, `openShop()`, `openSettings()`, `back()` (simula el botón atrás), `crash()` (fuerza la pantalla de error), `goToTile(x, y)`, `keeperTile()`, `tourWaypoints(pasos, conRecintos)`, `walkPropsAbove()`, `unlocked()`, `counts()`, `hudCoinsText()`, `keeperPosition()`, `activeScenes()`, `petPosition()`, `openTutorial(lecciones?)`, `tutorialStep()`, `tutorialLesson()`, `tutorialLessons()`, `tutorialPractice()`, `tutorialOfferLesson()`. Las pruebas de juego abren `/?sin-tutorial` para que no salga el aviso de aprender ni los de las lecciones (solo funciona en desarrollo); las de las lecciones abren `/?sin-tutorial&lecciones`. `window.__GAME__` es el juego de Phaser.

## Sonido

En `public/audio/` (CC0, créditos en `CREDITS.md`): un `.ogg` por efecto de interfaz (`tap`, `come`, `rechaza`, `especial`, `coin`, `buy`, `unlock`), `music.ogg`/`music.mp3`, y `.wav` para la campanita, el paso y los cuidados.

- **Cuidados (2026-11-10, votados por David entre sonidos CC0 de OpenGameArt):** qué suena con cada comida (crujiente o blanda), herramienta y medicina está en `core/sounds.ts`. Al frotar, la herramienta suena cada `RUB_SOUND_GAP_MS` (el cepillo es un trozo de 0,4 s de una grabación continua de BigSoundBank). `barro` y `malito` suenan solo si el animal está en pantalla. Los nuevos se recortan al trozo que suena, en mono a 32 kHz y con el volumen igualado.
- **Cada `SoundId` necesita su archivo:** `tests/unit/sounds.test.ts` lo comprueba. En `npm run dev` un archivo que falta no se queda en silencio: Vite devuelve la página, no se puede decodificar y sale la pantalla «¡Ups!» (pasó el 2026-11-10 con `curar-vendaje.wav`).
- **Qué ha sonado:** `__ZOO__.soundsPlayed()` y `clearSounds()` en las pruebas de juego (`tests/e2e/sonidos.spec.ts`).

## Publicar en la web

Se publica en https://davidpladel.com/zoo/ (la v1.1 sigue en `/zooesponji/`). Hay que compilar en local: el arte de VectoRaith no está en git, así que el servidor no puede hacer `git pull` y compilar.

1. En `game/`: `npm run build; tar -czf zoo-web.tgz -C dist .` (`zoo-web.tgz` está en `.gitignore`).
2. Subir `zoo-web.tgz` con WinSCP a la carpeta pública del dominio en el servidor.
3. En el servidor (PuTTY), dentro de esa carpeta: vaciar `zoo/`, descomprimir `zoo-web.tgz` en `zoo/`, borrar el
   `.tgz` y devolver los archivos al usuario del dominio. La ruta y el usuario no van en el repositorio.

Caché: el JS lleva huella en el nombre (Vite); el arte, el audio y el mapa se piden con `?v=<id de compilación>` (`src/core/cacheBust.ts`), y `public/.htaccess` hace que `index.html` y el manifiesto no se guarden en caché. Así nadie se queda con una versión vieja.

Girar el móvil: los navegadores avisan del giro antes de dar el tamaño nuevo, así que `Platform` vuelve a medir la pantalla varias veces tras cada giro (sin recargar la página).

## Publicidad (solo Android)

Anuncios con premio de AdMob, en modo infantil. Sin configuración no hay publicidad: el juego es el de siempre.

- `game/.env.production.local` (no se sube): `VITE_ADMOB_REWARDED` y `VITE_ADMOB_REWARDED_INTERSTITIAL`, los dos bloques de anuncios. Con `VITE_ADMOB_TESTING=1` la compilación pide los anuncios de prueba de Google.
- `game/android/admob.properties` (no se sube), con una línea `appId=ca-app-pub-...~...`, o la variable `ZOO_ADMOB_APP_ID`. Sin ninguno, el paquete lleva el identificador de pruebas de Google y `npm run check:manifest -- --publicar` falla.
- **Nunca tocar anuncios reales en el propio móvil:** AdMob lo cuenta como tráfico no válido. Para probar, `VITE_ADMOB_TESTING=1`.
- **Monedas para probar en el móvil:** con `VITE_ADMOB_TESTING=1` y `VITE_REGALO_PRUEBA=<monedas>` en ese mismo archivo, al abrir el juego se suman esas monedas una sola vez (`core/testGift.ts`). Solo suma, nunca quita. Sin anuncios de prueba no hace nada; aun así, antes de compilar para Play se quitan las dos líneas.
- En el navegador se prueba con un proveedor falso: `window.__ZOO__.adsFake('visto')` y `window.__ZOO__.adsAdvance(300)`.

## Comunidad (tablón)

El tablón de la plaza habla con el servidor de comunidad. Sin configuración no hay tablón: el juego es el de siempre.

- `game/.env.production.local` (no se sube): `VITE_COMMUNITY_URL`, la dirección del servidor (`https://api.zooesponji.com`).
- `src/core/community.ts`: tipos y validación de lo que llega del servidor. `src/systems/community.ts`: consulta el estado, guarda el voto y construye la dirección de los dibujos (`dibujo.php?f=...`). `BoardScene` es el tablón y `PollNoticeScene`, el aviso de votación nueva.

## Versión

`version` en `package.json` y `versionName` en `android/app/build.gradle`: **2.10.0** con el `versionCode` **13** (2026-11-10, en la rama `feat/plaza-recintos-recorrido`: compilada con anuncios de prueba e instalada en el móvil de David para probarla; sin subir a Play). `versionCode` sube en 1 con cada subida a Play: el **7** es la 2.6.0 (primera con anuncios), subida a la prueba cerrada el 2026-10-12; el **8** es la 2.7.0 (tablón de la comunidad), subida; el **9** es la 2.7.1 (arreglos del muro del tablón), publicada en Play; el **10** es la 2.8.0; el **11**, la 2.8.1, publicada; el **12**, la 2.9.0 (con R8; la 2.8.2 no se llegó a subir), publicada.

Al sacar una versión nueva, la versión se cambia a mano en estos sitios (el resto la leen solos):

| Dónde | Qué poner |
|---|---|
| `game/package.json` (`version`) y `game/package-lock.json` (con `npm install`) | 2.x.y. De aquí la saca el juego para el pie del menú ⚙️ y para las estadísticas de Matomo |
| `game/android/app/build.gradle` | `versionName` (2.x.y) y `versionCode` (+1 por cada subida a Play) |
| Este apartado | versión y `versionCode` |
| `README.md` (raíz) | «Versión actual» de arriba, fila nueva en la tabla de versiones y la «Hoja de ruta» |
| Etiqueta de git | `v2.x.y` |

La web www.zooesponji.com no muestra la versión en ningún sitio. El formulario de ideas la pide en el campo opcional de fallos («Abre el menú ⚙️ del juego: está escrita abajo del todo»): si cambia dónde se ve la versión en el juego, hay que cambiar ese texto en `web/paginas/ideas-es.html` e `ideas-en.html` (rama `feat/comunidad`).
