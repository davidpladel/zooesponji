# Zoo Esponji 2.0 (Phaser 4 + TypeScript)

Versión 2.1.3. En la documentación de desarrollo se llama "v3" (nombre interno: fue el tercer motor, tras la v1 en DOM y el prototipo en Canvas).

Spec: `docs/superpowers/specs/2026-09-27-motor-phaser-v3-design.md`

## Comandos (desde `game/`)

```bash
npm install          # dependencias
npm run dev          # juego en http://localhost:5173
npm test             # tests de lógica (Vitest)
npm run test:e2e     # 30 pruebas de juego (29 corren solas; la de capturas en inglés, solo a mano con CAPTURAS=1) en el navegador (Playwright; en local usa el Chrome instalado; si alguna falla por tiempo, --workers=1)
npm run build        # build de producción en dist/
npm run make:ui-assets # copia la letra y los iconos de la interfaz a public/ (solo si cambian)
npm run make:test-map  # regenera el mapa de prueba
npx cap sync android # copia la build al proyecto Android
npx cap open android # abre Android Studio (▶ Run para probar en el móvil)
```

Icono y ficha de Play (desde `game/store/`, Python + Pillow + numpy): `python make_icon.py` dibuja el león y genera el icono 512, los iconos de Android y los splash; después `python make.py` compone el gráfico de funciones 1024×500 y copia las capturas a `play/`. El splash usa la letra `store/fonts/Baloo2.ttf` sobre el azul cielo `#58B0F0`.

## Arte

El arte (packs de VectoRaith) **no está en este repositorio** por licencia. Para jugar con él:

1. Tener clonado el repo privado `zooesponji-private` **al lado** de este (`C:\Projects\games\zooesponji-private`).
2. Desde `game/`: `npm run art:import`. Lee los zips de `packs/` y los dibujos de `art-work/terminados/`, y deja todo en `public/art/` (ignorado por git).

Sin `public/art/` el juego funciona con arte provisional (emojis y colores planos); así se ejecuta en GitHub Actions.

- **Panda y pantera de los niños:** dejar `panda.png` / `pantera.png` (hojas 3×4 exportadas de Piskel) en `zooesponji-private/art-work/terminados/` y volver a ejecutar `npm run art:import`. Las filas deben ir en orden abajo, izquierda, derecha, arriba; si una hoja viene con otro orden, `overrideRows` en `art.config.json` lo corrige (la pantera lleva `[3, 1, 2, 0]`: su hoja tiene la vista de espaldas arriba).
- **Qué se extrae de cada pack:** `art/art.config.json`.
- **Terreno:** formato RPG Maker A2 (`src/core/autotile.ts` compone cada tile con 4 cuartos de 8 px según sus vecinos).
- **Decoración:** piezas ("props") recortadas de los packs en `art/art.config.json` (`props`, `foods`, `companions`). Para catalogar: `npm run art:grid -- <zip> "<hoja>" <salida.png>` (rejilla ampliada) y `npm run art:props-sheet -- <salida.png>` (tablón de todas las piezas). Las salidas van fuera del repo.
- **Agua animada:** una pieza con `animate: { step, count, area?, fps? }` en `art.config.json` se importa como hoja de fotogramas (`step` = distancia entre fotogramas en la hoja del pack; `area` = zona que cambia).
- **Carne:** cuando exista `zooesponji-private/art-work/terminados/carne.png`, `art:import` la usa en la bandeja (mientras, emoji 🥩).
- **Mapa:** `npm run make:zoo-map` regenera `public/assets/maps/zoo.tmj` (mapa lógico de 96×60; el arte lo pone el juego). El parque de siempre queda en el centro y de sus caminos salen tres zonas, cada una con su cartel: sabana y elefantes al norte, polo al oeste y granja al este.
- **Tienda por dentro:** `npm run make:shop-map` regenera `public/assets/maps/tienda.tmj` (20×12: suelo, pared, muebles, tendero, 5 peanas, felpudo y decoración). `art:import` recorta los muebles del *Interior Tileset Pack – Essentials* (`interior` en `art.config.json`, salen como `interior-*.png`); sin ellos la tienda se pinta con colores. `npm run make:campanita` y `npm run make:paso` vuelven a sintetizar `public/audio/campanita.wav` y `paso.wav`. Dentro, la cuidadora anda por la rejilla de `tienda.tmj` con las peanas bloqueadas (`core/shopWalk.ts`: alcance, punto de aproximación, pista y felpudo). Tienda: enseña como mucho 5 artículos, los más baratos que se pueden comprar (recintos por abrir y "otro animal" de los abiertos, mezclados y de menor a mayor precio; `core/shopEntries.ts`). Las peanas se deciden al entrar y no cambian mientras se está dentro: si un animal se completa, su peana se queda con el sello AGOTADO y lo siguiente sale en la próxima visita. En la estantería hay un **libro secreto** (`BookScene`, `core/book.ts`, `data/book.ts`): 49 páginas (la historia, Mary y cada animal con nombre) repartidas en capítulos por zona, con un índice tocable y una portadilla por capítulo que no cuentan. Las páginas salen de los recintos de `data/pens.ts`; se guardan los ids leídos en `book` del guardado.

### Animales distintos dentro de un recinto

Cada animal puede tener su propio **aspecto**: una entrada en `animals` de `art/art.config.json`
con la hoja del pack y una lista de `edits` (retoques):

- `swap`: cambia colores exactos (`"f4f3f2": "e8c9a0"`), opcionalmente solo en una `area`
  `[x, y, ancho, alto]` del fotograma.
- `dots`: pinta píxeles sueltos `[x, y, color]`.
- `rows`: a qué filas se aplica (0 de frente, 1 izquierda, 2 derecha, 3 de espaldas).
- `cols`: a qué fotogramas del paso (0, 1, 2); el central va 1 px más alto en la cabra.

`shrink` reduce cada fotograma a ese lado en píxeles (Chispa, 13). `npm run art:preview -- <aspecto>`
deja una vista ×8 en el repo privado para ajustarlos. El aspecto se asigna al animal en
`src/data/pens.ts` (`look`). Tras cambiar la configuración, o añadir una especie o un aspecto, hay que
ejecutar `npm run art:import`: el manifiesto exige la hoja de cada especie y, si falta, el juego arranca
con emojis. `npm run art:compare -- <nombre> <aspecto> <aspecto>…` deja en el repo privado una imagen
con varios aspectos juntos, para ver si se distinguen.

Un recinto puede mezclar especies (sabana: jirafas, cebras y gacelas; establo: caballos, gallinas y
gallo). Se da de comer al animal que se toca, con la bandeja de su especie, y la tienda vende el
siguiente de la lista del recinto al precio de su especie. Las especies grandes llevan `radius` en
`src/data/animals.ts`: se separan más al pasear y se tocan por el cuerpo, no por los pies.

- **Calcetín:** `npm run make:calcetin` dibuja el icono en `art-work/terminados/calcetin.png` del
  repo privado si no existe; si los niños pintan el suyo, no se toca.

## Interfaz

Las piezas de los menús (píldoras, paneles, carteles, chapa de cerrar, monedas) están en `src/ui/`. Se pintan con Canvas 2D en texturas porque el juego usa `pixelArt: true`. Todo botón pasa por `makePressable` (`src/ui/press.ts`), que le da el efecto al pulsar, y todo texto de la interfaz se crea con `addUiText` (`src/ui/text.ts`) para que no tiemble al cambiar de tamaño. Los bocetos de referencia están en `docs/superpowers/mockups/`.

## Estructura

- `src/core/` — lógica pura sin Phaser (reacciones, economía y extras, guardado, A*, mapas, movimiento, `flock` para que los animales no se pisen, `petting` para el aforo de la granja de contacto, `back` para el botón atrás). Todo con tests.
- `src/data/` — contenido: animales, comidas, tienda, libro del zoo (`book.ts`: ids de página y qué las desbloquea) y textos (`strings/`: `es.ts` y `en.ts`, una clave por texto; `en.ts` no compila si le falta una; todo texto visible pasa por `t()`, que usa el idioma activo).
- `src/systems/` — eventos, sesión, almacenamiento, zoom, `audio` (samples y música), `platform` (botón atrás, segundo plano, girar el móvil), `errors` (pantalla ¡Ups!), `language` (idioma activo y detección por el idioma del móvil).
- `src/scenes/` — escenas de Phaser (solo dibujan y recogen input): Boot, Preload, Title, World, Feed (dar de comer), Shop (tienda), Book (libro del zoo), Hud, Settings (menú ⚙️: ajustes, idioma, créditos, privacidad y salir), Quit (¿Salir?), Rotate (gira el móvil).
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

Ganchos disponibles: `addCoins(n)`, `openFeed('leon')`, `openShop()`, `openSettings()`, `back()` (simula el botón atrás), `crash()` (fuerza la pantalla de error), `goToTile(x, y)`, `unlocked()`, `counts()`, `hudCoinsText()`, `keeperPosition()`, `activeScenes()`. `window.__GAME__` es el juego de Phaser.

## Sonido

En `public/audio/` (CC0, créditos en `CREDITS.md`): un `.ogg` por efecto (`tap`, `come`, `rechaza`, `especial`, `coin`, `buy`, `unlock`) y `music.ogg`/`music.mp3`. Si un archivo falta, el juego sigue sin ese sonido.

## Publicar en la web

Se publica en https://davidpladel.com/zoo/ (la v1.1 sigue en `/zooesponji/`). Hay que compilar en local: el arte de VectoRaith no está en git, así que el servidor no puede hacer `git pull` y compilar.

1. En `game/`: `npm run build; tar -czf zoo-web.tgz -C dist .` (`zoo-web.tgz` está en `.gitignore`).
2. Subir `zoo-web.tgz` con WinSCP a `/home/user/web/davidpladel.com/public_html/`.
3. En el servidor (PuTTY):
   `cd /home/user/web/davidpladel.com/public_html && rm -rf zoo/* && tar -xzf zoo-web.tgz -C zoo && rm zoo-web.tgz && chown -R user:user zoo`

Caché: el JS lleva huella en el nombre (Vite); el arte, el audio y el mapa se piden con `?v=<id de compilación>` (`src/core/cacheBust.ts`), y `public/.htaccess` hace que `index.html` y el manifiesto no se guarden en caché. Así nadie se queda con una versión vieja.

Girar el móvil: los navegadores avisan del giro antes de dar el tamaño nuevo, así que `Platform` vuelve a medir la pantalla varias veces tras cada giro (sin recargar la página).

## Versión

`version` en `package.json` y `versionName` en `android/app/build.gradle`: **2.4.0**. `versionCode` sube en 1 con cada subida a Play: el 5 es la 2.3.0, que está en la prueba cerrada; el **6** queda preparado para la siguiente subida.
