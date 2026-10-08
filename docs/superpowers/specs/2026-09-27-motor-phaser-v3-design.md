# ZooEsponji v3.0 — Motor Phaser 4 + TypeScript

**Fecha:** 2026-09-27
**Rama:** `v3-phaser` (creada desde `stardew-engine`), fusionada en `main` el 2026-09-27.
**Versión publicada:** 2.0.0. "v3" es el nombre interno de desarrollo (tercer motor: v1 DOM, prototipo Canvas, Phaser) y se mantiene en los nombres de archivo y en la clave de guardado.

## Visión

Reescribir ZooEsponji sobre un motor profesional para que crezca sin fricción y
pueda publicarse en Google Play, manteniendo a la vez una versión web jugable
con un enlace. Mismo juego base que hoy: el jugador maneja al cuidador por el
parque, da de comer a los animales arrastrando la comida (la mecánica favorita
de los niños desde la v1.0), gana monedas y desbloquea zonas y animales.

**Público:** niños de 6 a 9 años. Frases muy cortas + iconos + sonido, sin
estados de "perder".

**Dirección a largo plazo:** "cuidador de animales" (tareas con gestos: dar de
comer, bañar, limpiar, clínica), con progresión por monedas y desbloqueos.

Este documento cubre el **proyecto 1 de 3**:

1. **Motor nuevo + port del juego actual → v3.0** (este spec)
2. Publicación en Play Store (ficha, cuenta, pruebas abiertas) — spec propio
3. Monetización con anuncios para menores — spec propio

## Decisiones de tecnología

| Pieza | Elección | Motivo |
|---|---|---|
| Motor | **Phaser 4** (estable, v4.1+) | Motor 2D web maduro: tilemaps, física arcade, cámara, animaciones, tweens, partículas, audio, drag táctil, escenas |
| Lenguaje | **TypeScript** (estricto) | Código modular y tipado que escala |
| Bundler | **Vite**, partiendo de la plantilla oficial de Phaser 4 | Recarga instantánea, build optimizado |
| Mapas | **Tiled** (`.tmj`, tilesets embebidos, capas de objetos) | Colisiones, recintos y puertas salen del mapa, no de coordenadas a mano |
| Android | **Capacitor** | Misma base de código → web + AAB |
| Tests | **Vitest** (lógica) + **Playwright** (humo en navegador) | |
| CI | **GitHub Actions** | Tests + build en cada push |

Descartados: **Godot 4** (export web pesado, ~30–40 MB, flojo en navegador
móvil; AdMob solo vía plugins comunitarios), **Unity** (requiere editor
gráfico; export web pesado), **seguir con motor propio** (mantener colisiones,
animación, audio y escenas a mano no escala).

## Arte

- **Base:** packs profesionales de pixel art (itch.io, 10–30 €) para terreno,
  caminos, vallas, vegetación, edificios y personajes animados (cuidador,
  visitantes, tendero).
- **Animales:** los diseñan los niños, adaptados a la paleta, tamaño y
  perspectiva del pack. Mínimo por animal: animación idle y reacciones
  (come / rechaza / especial).
- **Tiles de 16 px**, escalado entero, `pixelArt: true`, `roundPixels: true`.
- Todos los sprites empaquetados en **atlas de texturas**; PNG optimizados.
  Presupuesto de descarga inicial en la web: **≤ 15 MB**.
- Hasta el hito 5 se usa arte provisional gratuito (CC0).

## Alcance de v3.0

**Entra:**
- Un mapa del zoo hecho en Tiled con el pack.
- Cuidador: **tocar para ir** (A\* por caminos) como control principal,
  **joystick opcional**, WASD/flechas en escritorio.
- Los 4 animales actuales (león, cabra, pantera negra, oso panda).
- Escena de alimentación con drag & drop.
- Monedas, tienda y desbloqueos con la progresión actual (tienda 20, pantera
  50, panda 100), guardado local.
- Visitantes paseando como ambiente.
- Música y efectos de sonido reales (sustituyen los tonos Web Audio).
- Textos en una tabla de cadenas (solo español en v3.0).
- Web desplegada en davidpladel.com + AAB en **prueba interna/cerrada** de
  Play Store.
- Orientación **horizontal fija** en móvil; en web se adapta a la ventana y
  muestra "gira el móvil" si está en vertical.

**Fuera de v3.0:** anuncios y monetización, bañar/limpiar/clínica, ciclo
día-noche, ánimo de los animales, más de 4 animales, cuentas o nube.

**Convivencia:** v1.1 (`main`) siguió en producción hasta que v3.0 la
sustituyó (2026-09-27: publicada como 2.0.0; la 1.x sale de `main` y queda en la etiqueta `v1.1.0`). De `stardew-engine` se reaprovechan la tabla de reacciones, la
economía, el A\* y los tests; el resto se reescribe.

## Arquitectura

Principio central: **la lógica del juego es TypeScript puro sin Phaser**
(`core/`), probada con tests. Las escenas solo dibujan y recogen input.

```
src/
├── main.ts                 — config de Phaser (escala, escenas, pixelArt)
├── core/                   — lógica pura, sin imports de Phaser
│   ├── reactions.ts        — (animal, comida) → come|rechaza|especial + monedas
│   ├── economy.ts          — saldo, precios, estado de desbloqueos
│   ├── save.ts             — partida versionada, validación y migraciones
│   └── pathfinding.ts      — A* sobre rejilla de tiles
├── data/                   — contenido tipado
│   ├── animals.ts  foods.ts  shop.ts  strings.ts
├── scenes/
│   ├── BootScene.ts        — pantalla de carga mínima
│   ├── PreloadScene.ts     — carga atlas, mapa, audio, partida
│   ├── TitleScene.ts       — botón "Jugar" (desbloquea audio)
│   ├── WorldScene.ts       — mapa, cuidador, animales, visitantes, cámara
│   ├── FeedScene.ts        — primer plano + drag (encima de World pausada)
│   ├── ShopScene.ts        — tendero y productos (encima de World pausada)
│   └── HudScene.ts         — monedas, botones, ajustes; siempre en paralelo
├── entities/               — Keeper, Animal, Visitor
└── systems/
    ├── events.ts           — bus de eventos tipado
    ├── input.ts            — tocar para ir / joystick / teclado
    ├── audio.ts            — música y efectos, volumen, mute
    ├── storage.ts          — Capacitor Preferences (app) / localStorage (web)
    ├── lifecycle.ts        — pausa, guardado y botón atrás de Android
    └── parentalGate.ts     — puerta parental para enlaces externos y ajustes
public/assets/              — atlas, mapas .tmj, audio (ogg + m4a)
android/                    — proyecto Capacitor
tests/                      — Vitest (core, data) + Playwright (humo)
```

### Reglas de la arquitectura

- `core/` no importa Phaser ni APIs del navegador; recibe el almacenamiento
  por inyección (`systems/storage.ts`).
- Las escenas se comunican **solo** por el bus de eventos tipado
  (p. ej. `coins-changed`, `animal-unlocked`, `feed-result`). Cada escena
  elimina sus listeners en `shutdown`.
- `FeedScene` y `ShopScene` se lanzan con `scene.launch` + `scene.pause('World')`
  y se cierran con `scene.stop` + `scene.resume('World')`.
- Monedas voladoras, partículas y visitantes usan **pools** (`Phaser.GameObjects.Group`
  con reutilización), nada de crear/destruir en bucle.
- Movimiento dependiente de `delta`, nunca de frames.

### Añadir un animal (contrato de contenido)

1. Especie en `data/animals.ts`: nombre (clave de `strings.ts`), reacciones solo para las comidas
   de su bandeja (4 o 5), monedas y precio del animal suelto.
2. Recinto en `data/pens.ts`: precio y lista ordenada de residentes (`id`, especie, aspecto). El
   `id` del residente es el de su página en `data/book.ts`.
3. Hoja de sprites del aspecto en el manifiesto de arte.
4. En el mapa, rectángulo `recinto` y objeto `puerta` con el id del recinto.

Sin tocar código del motor. Un test de coherencia valida que las piezas existen.

## Flujos de juego

### Arranque
`Boot` → `Preload` (barra de progreso; carga y migra la partida) → `Title`
(botón grande "Jugar"; el toque desbloquea el audio) → `World` + `Hud`.

### Mundo
- Tocar suelo → A\* por tiles transitables → el cuidador recorre la ruta;
  marcador en el destino. Destino inalcanzable → va al punto alcanzable más
  cercano.
- Cámara sigue al cuidador con límites del mapa.
- Tocar un animal lleva a la cuidadora dentro de su recinto; al llegar junto a él se abre
  `Feed` con ese animal.
- Recinto bloqueado: candado + precio; al tocarlo el cuidador sugiere ir a la
  tienda.

### Dar de comer
Tocar un animal lleva a la cuidadora dentro de su recinto; al llegar junto a él se abre
`Feed` con ese animal.

1. `World` pausada y oscurecida; primer plano del animal; bandeja de comidas
   abajo.
2. El niño arrastra una comida (sigue al dedo con retardo elástico). Al
   soltarla dentro de la zona de acierto (generosa, mayor que el sprite) se
   evalúa con `core/reactions`. Si cae fuera, vuelve a la bandeja sin coste.
3. **Come:** animación + sonido + monedas volando al contador.
   **Rechaza:** cara de asco + "¡puaj!", sin penalización.
   **Especial:** reacción sorpresa + partículas + más monedas.
4. `economy` suma → evento `coins-changed` → `Hud` anima → guardado.
5. Cerrar con X grande o botón atrás de Android.

### Tienda
- El edificio se desbloquea a las 20 monedas (aviso con fanfarria).
- Productos como tarjetas grandes (icono + precio); los no asequibles en gris
  con precio visible.
- Comprar → celebración → `economy` desbloquea → guardado → al volver a
  `World` el recinto se abre con animación (valla abriéndose, animal
  apareciendo).

### Guardado
Contenido: monedas, desbloqueos, ajustes (música, efectos, joystick),
`version`. Momentos: tras comprar, tras dar de comer, al pasar la app a
segundo plano.

## Móvil y política de familias

- **Ciclo de vida:** al ir a segundo plano, pausar juego y audio y guardar.
- **Botón atrás de Android:** cierra `Feed`/`Shop` → en el mapa pide
  confirmación para salir.
- **Audio:** se activa con el primer toque (pantalla de título).
- **Táctil para 6–9 años:** botones ≥ 64 dp, zonas de acierto generosas.
- **Families Policy de Google Play desde v3.0:**
  - Ningún SDK de analítica o crashes que recoja identificadores; sin permiso
    `AD_ID`.
  - Desde el 7-oct-2026 hay estadísticas anónimas con código propio hacia un Matomo propio, sin SDK ni
    identificadores: ver `2026-10-07-analitica-anonima-matomo-design.md`.
  - Puerta parental para cualquier enlace externo y ajustes sensibles.
  - Política de privacidad publicada (obligatoria aunque no haya anuncios).
  - `targetSdkVersion` según lo que exija Play en el momento de publicar.

## Errores

| Situación | Comportamiento |
|---|---|
| Recurso no carga | Sprite de reserva (cuadro + nombre en desarrollo), log en consola, un reintento en producción |
| Partida corrupta | Se guarda copia aparte (`save-backup`) y se empieza de cero; nunca bloquea la carga |
| Datos incoherentes | Test de coherencia + comprobación al arrancar en desarrollo |
| Ruta imposible | El cuidador va al punto alcanzable más cercano |
| Error inesperado | Manejador global: en desarrollo lo muestra; en producción vuelve a `World` sin cerrar la app. No se envía a servicios externos |

## Pruebas

- **Vitest — `core/`:** reacciones, economía, guardado y migraciones
  (incluida la de datos de v1.1 en `localStorage`), A\*. Se portan los tests
  existentes.
- **Vitest — coherencia de contenido:** cada animal tiene reacciones,
  animaciones en el atlas y recinto en el mapa.
- **Playwright — humo:** arranca, mueve al cuidador, da de comer por drag y
  comprueba que suben las monedas.
- **Manual:** en cada hito, en un Android de gama baja real, objetivo 60 fps
  sin tirones.
- **CI:** GitHub Actions ejecuta tests y build en cada push.

## Hitos

Cada hito termina con algo jugable.

1. **Esqueleto** — Phaser 4 + Vite + TS + Capacitor + CI; mapa Tiled de prueba
   con el cuidador moviéndose (tocar para ir + teclado), también en Android.
2. **Núcleo** — `core/` y `data/` portados con tests; guardado con
   `storage.ts`.
3. **Dar de comer** — `FeedScene` completa: drag, reacciones, monedas, HUD.
4. **Tienda y desbloqueos** — `ShopScene`, recintos bloqueados, animación de
   apertura; progresión completa.
5. **Arte y sonido** — pack comprado, mapa definitivo, animales de los niños,
   atlas, música y efectos.
6. **Pulido móvil y publicación** — ciclo de vida, botón atrás, aviso de girar,
   puerta parental, política de privacidad; web desplegada y AAB en prueba
   cerrada.

## Criterios de éxito

- Un niño de 6 años juega sin ayuda: se mueve, da de comer, compra un animal.
- 60 fps en un Android de gama baja.
- Añadir un animal = datos + sprites + objeto en Tiled, sin tocar el motor.
- La misma build se juega en la web y se instala desde la prueba cerrada de
  Play Store.

## Estado de implementación

### Cómo retomar (leer primero en una sesión nueva)

- **Repos:** público `davidpladel/zooesponji`, rama `main` (código en `game/`; desde la 2.0.0 ya no hay más que el juego nuevo); privado
  `davidpladel/zooesponji-private` (packs de arte, plantillas y dibujos de los niños). Clonados
  uno al lado del otro en `C:\Projects\games\`.
- **Regla fija:** ningún archivo de arte de los packs (ni derivado) en el repo público.
  (27-sep: el autor de los packs autorizó a David a usar IA para inspeccionarlos.)
- **Arrancar:** en `game/`: `npm install`, `npm run art:import`, `npm run dev`.
  Verificar: `npm test` y `npm run test:e2e` (en local usa el Chrome instalado).
- **Móvil:** `npm run art:import`, `npm run build`, `npx cap sync android`, ▶ Run en Android Studio.
- **Planes ejecutados:** `docs/superpowers/plans/` (hitos 1–2, 3–4, 5, 5b, 6a y la tienda por dentro, fases C y B).
- **Tienda por dentro (27-sep):** fase C hecha (spec `2026-09-27-tienda-por-dentro-design.md`):
  interior `tienda.tmj` + `world/ShopInterior.ts`, tendero, peanas, campanita, banderines y
  alfombra con huellas; unida a `main`. Mismo día: puerta del puesto en las 2 casillas y bambú
  de verdad en el recinto del panda.
- **Tienda fase B (28-sep):** hecha en `main` (spec `2026-09-28-tienda-fase-b-design.md`): el
  cuidador entra andando desde la calle, se maneja como en el zoo (teclado, joystick, tocar), al
  acercarse a una peana sale el bocadillo "¡Comprar! 🪙 N" (solo compra tocarlo) y sale pisando el
  felpudo; en el zoo reaparece bajo la puerta mirando abajo. Tendero atento, animales que reaccionan,
  pista de huellas a los 6 s y pasos en madera (`paso.wav`, CC0). Lógica pura en `core/shopWalk.ts`.
  David la probó el 28-sep y pidió: alfombra y peanas más arriba (hecho), cámara más alejada
  (`BASE_VIEW_HEIGHT` 130 → 160: zoom 4 en 1280×720, 2 en móvil apaisado) y pasillo central más
  estrecho (2 casillas de césped a cada lado): pantera y panda miden 15 de ancho, el león se arrima
  al centro; el bambú del panda, al lado de fuera. Después, a petición suya y como el parque de
  la v1: mapa 48×35 con **plaza central** 8×8 y la **fuente animada** (hoja
  `fountain_horsetail` del pack de madera) sobre una isla de césped; **muro del parque** (madera
  sobre piedra, del autotile de muros del pack) alrededor de todo y **portón de entrada** abajo en
  el centro con el cartel "Zoo Esponji"; la cuidadora empieza en la entrada. **Catarata de la
  pantera** nueva: pieza compuesta (acantilado de roca + caída animada + estanque) con las piezas
  del bosque templado; `import-art` admite props compuestos (`compose` en `art.config.json`).
  Arreglado: si se tocaba la pantalla durante la entrada a la tienda, la cuidadora se quedaba
  atascada fuera de la puerta. **Dar de comer sin bocadillo:** fuera el icono 🥣; al pisar el camino
  pegado a la puerta de un recinto se abre sola la ventana de comida (una vez hasta que se aparte,
  como la tienda; si está cerrado, aviso). `gateAtDoorstep` sustituye a `gateInReach`.
  **Catarata (2.1.1):** rehecha tras la revisión de David: pared de roca recta de 96×48 que toca la
  valla, la caída termina con la roca y el estanque (96×32, con orilla) empieza debajo; nada se
  superpone. **2.1.2:** otra vez, siguiendo el tutorial y el ejemplo del autor (devlog de Biome
  Tileset Pack A): bloque alto de acantilado ([C]+[D]) a cada lado con su remate, catarata [F] en
  medio y lago [E] de 5×3 al pie; pieza de 112×96 que ocupa todo el alto del recinto. Los props
  que bloquean pueden ocupar hasta el 60 % de un recinto.
  **Carne:** `carne.png` 16×16 dibujada por Claude al estilo del pack de iconos (en el repo privado;
  los niños pueden sustituirla).
- **Siguiente:** que David pruebe el 6a en su Android (ver "Aceptación" de la spec del 6a) y
  luego el **hito 6b** (publicación en Play: privacidad, ficha, firma, prueba cerrada; spec por
  escribir). La web ya está publicada en https://davidpladel.com/zoo/. `carne.png` ya está en `art-work/terminados/` (dibujada por Claude; los niños pueden cambiarla).
- **Forma de trabajar con David:** brainstorming → spec → plan → ejecución en la misma sesión,
  parando en los puntos clave; al cerrar cada bloque, actualizar la documentación y subir ambos
  repos.


*Actualizado: 2026-09-27 (versión 2.0.0 fusionada en `main`)*

| Hito | Estado | Plan |
|---|---|---|
| 1. Esqueleto | ✅ Hecho | `docs/superpowers/plans/2026-09-27-v3-hitos-1-2-esqueleto-y-nucleo.md` |
| 2. Núcleo | ✅ Hecho | ídem |
| 3. Dar de comer | ✅ Hecho | `docs/superpowers/plans/2026-09-27-v3-hitos-3-4-comer-y-tienda.md` |
| 4. Tienda y desbloqueos | ✅ Hecho | ídem |
| 5. Arte y sonido | ✅ Hecho (sonido real en el 6a) | `docs/superpowers/plans/2026-09-27-v3-hito-5-arte.md` |
| 5b. Decoración | ✅ Hecho (carne pendiente de los niños) | `docs/superpowers/plans/2026-09-27-v3-hito-5b-decoracion.md` |
| 6a. Pulido (agua, extras, menú, sonido, móvil, errores) → **2.0.0** | ✅ Hecho · web publicada · falta prueba en Android de David | `docs/superpowers/plans/2026-09-27-v3-hito-6a-pulido.md` |
| 6b. Publicación | ⬜ Pendiente (spec por escribir) | — |

### Qué hay hecho (hitos 1–2)

- Proyecto en `game/` (rama `v3-phaser`): Phaser 4.2.1, TypeScript 5, Vite 8, Vitest 5,
  Playwright, Capacitor 8.
- `core/`: `reactions`, `economy`, `save` (con backup y migración desde v1.1),
  `pathfinding` (A\* + destino alcanzable más cercano), `tiledmap`, `movement`.
- `data/`: animales, comidas, tienda y textos tipados.
- `systems/`: bus de eventos tipado, sesión, stores (memoria / web / Capacitor),
  zoom entero, ganchos de test (`window.__ZOO__`, solo en desarrollo).
- Escenas: `Boot` (arte provisional generado en código), `Preload`, `Title`,
  `World` (mapa de prueba de Tiled, tocar para ir, teclado, cámara), `Hud`.
- Mapa de prueba generado por `game/scripts/make-test-map.mjs` (40×30, 4 recintos).
- Android: `game/android/`, horizontal fijo, guardado nativo.
- Calidad: 124 tests de Vitest, 3 pruebas de humo de Playwright, CI `game-ci`.

### Qué hay hecho (hitos 3–4)

- `FeedScene`: primer plano del animal, bandeja 🪨🥩🐇🥕, arrastrar con retardo elástico,
  reacciones (¡Ñam!/¡Puaj!/¡Guau!) con sonido y animación, monedas voladoras al HUD.
- `ShopScene`: tendero, tarjetas de pantera y panda (asequible / gris / ya comprado).
- Mundo: animales en sus recintos, candados con precio, bocadillo 🥣 cerca de la puerta,
  edificio de la tienda (se abre al pisar su puerta), 8 visitantes paseando, aviso al tocar
  un recinto bloqueado, animación de apertura al comprar.
- HUD: pop del contador, avisos (tienda abierta, animal nuevo…), botón 🕹️ y joystick virtual.
- `core/`: `interaction`, `joystick`, `wander`; `Session.feed/buy/updateSettings`;
  sonidos provisionales (`systems/audio.ts`).
- Calidad: 168 tests de Vitest y 7 pruebas de juego con Playwright.

### Qué hay hecho (hito 5)

- Arte de **VectoRaith** (5 packs comprados). Nunca en el repo público: `npm run art:import`
  lo extrae del repo privado `zooesponji-private` a `game/public/art/` (ignorado).
- **Modo arte / provisional:** si existe `art/manifest.json` se usa el arte; si no, emojis.
  CI prueba el modo provisional; en local se prueban los dos.
- **Mapa del zoo 48×32** (`zoo.tmj`, generado por `make-zoo-map.mjs`): caminos de 2 de ancho,
  4 recintos 12×8, puesto de mercado como tienda, fuente, árboles y arbustos.
- **Terreno en formato RPG Maker A2:** cada tile se compone con 4 cuartos de 8 px según sus
  vecinos (`core/autotile.ts` + `world/TerrainArt.ts`); caminos y vallas sin cortes.
- Cuidador, visitantes y animales **animados en 4 direcciones**; los animales pasean por su recinto.
- Primer plano y tienda con el animal **de perfil** y escala entera; tendero con sprite.
- **Panda y pantera** pintados por Daniela y Adrián en Piskel (`art-work/terminados/`).

### Qué hay hecho (hito 5b)

- Recintos con ambiente: 🦁 sabana con acacias, hierba seca, rocas y **leona**; 🐐 montaña con
  meseta de roca (la cabra sube), cueva y pinos; 🐆 selva con **catarata**, estanque con
  nenúfares y palmeras; 🐼 bosque de bambú con tronco y flores. Suelo propio por bioma.
- Parque: bancos, farolas, carteles de madera con el nombre del animal, parterre, barril y caja de
  fruta junto a la tienda, fuente, árboles y arbustos.
- **Orden por profundidad (Y):** animales, personas y decoración se tapan correctamente.
- Animales que **esquivan** agua y árboles al pasear (`core/obstacles.ts`).
- Bandeja con **iconos del pack** (piedra, conejo, zanahoria); carne en emoji hasta `carne.png`.
- Herramientas `art:grid` y `art:props-sheet` para catalogar recortes; opción `erase`.

### Decisiones tomadas durante la implementación

- **`appId`: `com.davidpladel.zooesponji`** (confirmado por David; definitivo).
- **Ubicación:** el juego nuevo vive en `game/`; la v1/v2 de la raíz no se toca.
- **Zoom:** 180 px de mundo visibles en vertical como base (`BASE_VIEW_HEIGHT`),
  zoom = `floor(alto / 180)`, mínimo 1. Móvil horizontal → ×2; 1080p → ×6.
- **Claves de guardado:** `zooesponji_v3_save` (+ `_backup`). Se migran las
  claves de v1.1 `zooesponji_coins` y `zooesponji_purchases`.
- **Playwright en local** usa el Chrome instalado (`channel: 'chrome'`) porque
  la descarga de Chromium falla en el equipo de desarrollo; en CI usa el
  Chromium de Playwright.

- **Hitos 3–4:** arte provisional con emojis (animales, comida, visitantes, candados) hasta el
  hito 5; el 🥣 aparece a ≤ 2 tiles de la puerta del recinto; margen de acierto al soltar la
  comida: 48 px; la tienda se abre al pisar su puerta (no hace falta botón); zona del joystick:
  40 % izquierdo × 55 % inferior de la pantalla; 8 visitantes; sonidos provisionales con Web Audio.

- **Hito 5:** el terreno usa el autotile RPG Maker A2 del pack de edificios de madera (con tiles
  enteros de la hoja "3×3" salían motas y bordes desalineados); el bocadillo 🥣 va **sobre la
  puerta** del recinto (con recintos de 8 de alto quedaba fuera de pantalla); retratos de perfil;
  sin atlas (≈20 PNG pequeños); comida en emoji; sonido pendiente (necesita samples CC0); el
  manifiesto se pide con `fetch` porque, sin arte, el servidor de desarrollo devuelve HTML.

- **Tras el hito 5 (decisiones de David):** nombre visible "Zoo Esponji" (título, app); cámara más
  cerca (130 px de mundo en vertical: móvil ×3); cuidadora = `generic_jobs` personaje 6 (azul);
  visitantes = `mediterranean_people` 3 (turbante rojo), 0 (niño), 4 (niña) + 5 de `generic_people`.

- **Hito 5b:** piezas planas (agua, catarata, meseta) con capa propia para que el animal pase
  por encima; el agua y lo que bloquea ≤ 1/3 del interior (test); carteles sustituyen a las
  etiquetas flotantes en modo arte; farola con brazo y farol colgante (recorte limpiado con
  `erase`); bambú mediano/pequeño (el grande tapaba el recinto).

### Qué hay hecho (hito 6a)

- **Agua animada:** catarata y estanque con 3 fotogramas de la misma hoja del pack
  (`animate` en `art.config.json`; la catarata solo anima la franja de agua). El manifiesto marca
  `frames`/`fps` y `Decor` crea un sprite en bucle.
- **Colisiones:** dentro de un recinto toda pieza con volumen bloquea su base, salvo hierba y
  flores (`make-zoo-map.mjs`, con test). Intersección segmento-rectángulo exacta.
- **Extras:** cabra 5 (10🪙), pantera 2 y panda 2 (20🪙), león 1. Guardado **v2** con
  `counts` por recinto (migra la v1). `core/flock.ts` reparte y separa (MIN_GAP 14 px).
  Al dar de comer reacciona todo el recinto.
- **Menú ⚙️** (sin puerta parental: no hay nada de riesgo) con 🎵 🔊 🕹️ y créditos de Daniela y
  Adrián (con sus sprites en modo arte); el título también los muestra.
- **Sonido:** Kenney CC0 (efectos) y "Happy Adventure (Loop)" de TinyWorlds CC0 (música),
  1,3 MB en `game/public/audio/` con `CREDITS.md`. Efectos solo en `.ogg` (no había ffmpeg para
  sacar `.mp3`): suenan en Android/Chrome/Firefox; en Safari (iOS) puede que no.
- **Móvil:** botón atrás (`core/back.ts` + diálogo ¿Salir?), segundo plano (guarda y pausa mundo
  y música), capa "gira el móvil" en vertical, superposiciones y título que se recolocan.
- **Errores:** pantalla "¡Ups! 🐾" en HTML (sobrevive a que se rompa el bucle de Phaser), guarda
  solo si el estado pasa la validación, `console.error` y nada más.

- **Arreglo tras el 6a:** la hoja de la pantera de los niños tiene las filas de frente y de espaldas
  intercambiadas; `overrideRows: [3, 1, 2, 0]` las pone en su sitio al importar.
- **Ajustes de David tras el 6a:** la ⚙️ pasa abajo a la izquierda (arriba tapaba la ✖ de las
  ventanas; tocarla no arranca el joystick). La reacción especial (conejo a cabra o panda) vuelve a
  ser como en la v1: el conejo aparece al lado del animal, saltan juntos y salen corazones.

- **Versión 2.0.0 (2026-09-27):** `v3-phaser` se fusiona en `main`; `package.json` y `versionName`
  de Android pasan a 2.0.0 (`versionCode` 1). Se retiran de `main` la 1.x (etiqueta `v1.1.0`) y el
  prototipo Canvas (rama `stardew-engine`); la URL antigua `/zooesponji/` deja de actualizarse.
- **Web solo en `/zoo/` (2026-09-27):** `davidpladel.com/zooesponji/` (la 1.1) ya no se sirve:
  nginx (`nginx.ssl.conf` del dominio en Hestia) la redirige entera con **301 a `/zoo/`**. La única
  excepción es `/zooesponji/analytics.js` (banner de cookies + Matomo), que sigue en 200 porque
  nginx lo inyecta con `sub_filter` antes de `</body>` en `/zoo/`; por eso el banner no está en el
  `index.html` del repo y no sale en la app Android.

- **Menú de madera y privacidad (2026-10-06, en la 2.3.0):** el panel de ajustes y el
  «¿Salir?» se dibujan como tableros de madera (`addWoodPanel` y `addPlateButton` en `scenes/ui.ts`,
  sin arte de los packs). El pie enseña la versión (`__APP_VERSION__`, de `package.json`). «Privacidad»
  abre `public/privacidad.html` en una capa HTML encima del juego (`systems/legal.ts`), sin enlaces,
  así que sigue sin hacer falta puerta parental; esa misma página es la URL para la ficha de Google
  Play (`davidpladel.com/zoo/privacidad.html`). «Salir» solo sale en la app y pasa por el «¿Salir?»
  de siempre. El botón atrás cierra primero la página de privacidad.
- **Sasha come y «Salir» cierra del todo (2026-10-08, en la 2.5.1):** la leona deja de ser solo
  decorado: es la `companion` del recinto del león en `data/pens.ts` (id `sasha`), se la toca y se le
  da de comer como a Bills (misma especie, misma comida y monedas), sin contar como animal del recinto
  ni salir en la tienda. Es la única acompañante. En Android, `autoRemoveFromRecents` en el manifiesto
  hace que al salir con «Salir» (o atrás en la portada) el juego desaparezca de las aplicaciones
  recientes; salir con el botón de inicio lo deja en recientes, como antes.

### Pendiente fuera de los hitos

- **Carne** (`carne.png`) la pintan Daniela y Adrián (guía en el repo privado).
- Escuchar los efectos en el móvil: se eligieron por nombre dentro de los packs; cambiar alguno
  es copiar otro `.ogg` de Kenney con el mismo nombre de destino. Solo hay `.ogg`: en Safari (iOS)
  puede que no suenen.
- Probar la 2.0.0 en un Android real (Android Studio ya instalado; ver `game/README.md`).
