# Zoo Esponji 2.0 (Phaser 4 + TypeScript)

Versión 2.1.3. En la documentación de desarrollo se llama "v3" (nombre interno: fue el tercer motor, tras la v1 en DOM y el prototipo en Canvas).

Spec: `docs/superpowers/specs/2026-09-27-motor-phaser-v3-design.md`

## Comandos (desde `game/`)

```bash
npm install          # dependencias
npm run dev          # juego en http://localhost:5173
npm test             # tests de lógica (Vitest)
npm run test:e2e     # 13 pruebas de juego en el navegador (Playwright; en local usa el Chrome instalado; si alguna falla por tiempo, --workers=1)
npm run build        # build de producción en dist/
npm run make:test-map  # regenera el mapa de prueba
npx cap sync android # copia la build al proyecto Android
npx cap open android # abre Android Studio (▶ Run para probar en el móvil)
```

Icono y ficha de Play (desde `game/store/`, Python + Pillow + numpy): `python make_icon.py` dibuja el león y genera el icono 512, los iconos de Android y los splash; después `python make.py` compone el gráfico de funciones 1024×500 y copia las capturas a `play/`.

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
- **Mapa:** `npm run make:zoo-map` regenera `public/assets/maps/zoo.tmj` (mapa lógico; el arte lo pone el juego).
- **Tienda por dentro:** `npm run make:shop-map` regenera `public/assets/maps/tienda.tmj` (20×12: suelo, pared, muebles, tendero, 5 peanas, felpudo y decoración). `art:import` recorta los muebles del *Interior Tileset Pack – Essentials* (`interior` en `art.config.json`, salen como `interior-*.png`); sin ellos la tienda se pinta con colores. `npm run make:campanita` y `npm run make:paso` vuelven a sintetizar `public/audio/campanita.wav` y `paso.wav`. Dentro, la cuidadora anda por la rejilla de `tienda.tmj` con las peanas bloqueadas (`core/shopWalk.ts`: alcance, punto de aproximación, pista y felpudo). Tienda: una peana por animal (al comprar el recinto pasa a vender "otro animal"), precio o sello AGOTADO. En la estantería hay un **libro secreto** (`BookScene`, `core/book.ts`): 14 páginas con la historia, Mary y cada animal con nombre; se guardan los ids leídos en `book` del guardado.

## Estructura

- `src/core/` — lógica pura sin Phaser (reacciones, economía y extras, guardado, A*, mapas, movimiento, `flock` para que los animales no se pisen, `back` para el botón atrás). Todo con tests.
- `src/data/` — contenido: animales, comidas, tienda, libro del zoo (`book.ts`: ids de página y qué las desbloquea) y textos (`strings.ts`: todo texto visible pasa por `t()`, preparado para multi-idioma).
- `src/systems/` — eventos, sesión, almacenamiento, zoom, `audio` (samples y música), `platform` (botón atrás, segundo plano, girar el móvil), `errors` (pantalla ¡Ups!).
- `src/scenes/` — escenas de Phaser (solo dibujan y recogen input): Boot, Preload, Title, World, Feed (dar de comer), Shop (tienda), Book (libro del zoo), Hud, Settings (menú ⚙️ y créditos), Quit (¿Salir?), Rotate (gira el móvil).
- `src/world/` — ayudantes del mundo: `Pens` (los animales de cada recinto, cada uno con su identidad, los candados y el toque sobre un animal para darle de comer), `ShopBuilding` (edificio y puerta de la tienda), `ShopInterior` (la tienda por dentro), `ShopKeeperWalker` (la cuidadora dentro de la tienda), `Shopkeeper` (el tendero), `ShopHint` (huellas de pista), `VisitorCrowd` (visitantes).

## Añadir un animal

1. Especie en `src/data/animals.ts`: su nombre (clave de `src/data/strings.ts`), reacciones solo para las comidas de su bandeja (4 o 5), monedas y, si se pueden comprar más animales sueltos, `extraCost` + `extraNameKey`.
2. Recinto en `src/data/pens.ts`: precio (sin precio, viene abierto de inicio) y lista ordenada de residentes (`id`, especie, aspecto). El `id` de cada residente es el de su página en `src/data/book.ts`. La tienda sale de esta tabla.
3. Sprites del aspecto: entrada en `art/art.config.json` (hoja del pack o dibujo de los niños) y `npm run art:import`.
4. En el mapa de Tiled, capa `objetos`: rectángulo de tipo `recinto` y objeto de tipo `puerta`, ambos con la propiedad `animalId`, que lleva el id del recinto.

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

`version` en `package.json` y `versionName` en `android/app/build.gradle`: **2.2.0**. `versionCode` sube en 1 con cada subida a Play.
