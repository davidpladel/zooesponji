# ZooEsponji v3 — Hito 6a (pulido) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dejar el juego listo para testers en Android: agua animada, extras por recinto sin pisarse, menú ⚙️ con créditos, sonido real, móvil y errores.

**Architecture:** Lógica nueva pura en `core/` (economía de extras, separación de animales, botón atrás) con tests Vitest; escenas Phaser nuevas `Settings`, `Rotate` y `Error`; el importador de arte genera hojas de fotogramas para piezas animadas y el manifiesto lo declara.

**Tech Stack:** Phaser 4.2, TypeScript estricto, Vite, Vitest, Playwright, Capacitor 8 (`@capacitor/app`).

## Global Constraints

- Directorio `game/`, rama `v3-phaser`. `core/` sin Phaser ni DOM. TypeScript estricto.
- Ningún archivo de arte de los packs ni derivado en el repo público. (Actualización 27-sep: el autor permite a David usar IA para inspeccionar el arte.)
- Todo funciona y pasa pruebas en modo provisional (sin `public/art/`) y con arte.
- Pixel art con escalado entero. Commits con `Co-Authored-By`; nunca `--no-verify`.
- Sin SDKs, sin enlaces externos, sin permisos Android nuevos (nunca `AD_ID` ni ubicación).
- Audio CC0 en `game/public/audio/` con `CREDITS.md`; total < 2 MB. (Descarga autorizada por David el 27-sep.)

---

### Task 1: Agua animada

Inspección hecha (27-sep) en `vectoraith_tileset_full_terrain_alpine_A.png` (la hoja que ya usamos): los 3 fotogramas están en horizontal en la misma hoja.
- `pond` (0,128,48×48): fotogramas cada **80 px** → x = 0, 80, 160.
- `waterfall` (0,176,56×80): fotogramas cada **48 px**, pero el 3.º no trae la roca derecha → solo se anima la franja de agua `x 7..40` del recorte (34×80); las rocas se quedan del fotograma 0.

**Files:** `art/art.config.json`, `scripts/art/source.ts`, `scripts/art/pngTools.ts`, `scripts/import-art.ts`, `src/art/manifest.ts`, `src/art/art.ts`, `src/world/Decor.ts`, `tests/unit/manifest.test.ts`, `tests/unit/pngTools.test.ts`.

**Interfaces:**
- Config de prop: `animate?: { step: number; count: number; area?: [x, y, w, h]; fps?: number }`.
- `pngTools.animatedStrip(src, crop, animate): PNG` → hoja horizontal de `count` fotogramas del tamaño del recorte.
- Manifiesto: `props[name]` puede llevar `frames?: number` y `fps?: number` (`ImageInfo` + `PropAnim`); `width` es el de un fotograma.
- `art.ts`: props con `frames > 1` se cargan como spritesheet; `propAnimKey(name)`; `registerArtAnims` crea la animación en bucle.
- `Decor`: `scene.add.sprite(...).play(propAnimKey(name))` para las animadas.

- [x] Test de `parseManifest` con `frames`/`fps`, y de `animatedStrip`. Implementar. Importar arte y ver el agua en el navegador.

### Task 2: Colisiones de la decoración

**Files:** `scripts/make-zoo-map.mjs`, `public/assets/maps/zoo.tmj`, `tests/unit/zoomap.test.ts`.

- Lista `WALKABLE_PROPS = /^(grass-tall-dry|flowers)/`. Dentro de un recinto, `inPen` pone por defecto `block: [ancho de la pieza, 16]` a toda pieza no plana y no pisable (ancho redondeado a casillas: rocas/arbustos pequeños 16, grandes 32).
- Test: toda pieza no plana dentro de un recinto y no pisable tiene `block`. Se mantiene el test de ≤ 1/3.

### Task 3: Extras en datos, guardado y economía

**Files:** `src/data/animals.ts` (`maxCount`, `extraCost`), `src/core/economy.ts`, `src/core/save.ts`, `src/systems/session.ts`, `src/systems/events.ts`, `tests/unit/economy.test.ts`, `tests/unit/save.test.ts`, `tests/unit/session.test.ts`.

- `GameState.counts: Record<AnimalId, number>` (reemplaza `unlocked`). Helpers `isAnimalUnlocked(state,id)`, `animalCount(state,id)`, `unlockedAnimals(state)`.
- `buyExtra(state, id): PurchaseResult` con errores `'pen-closed' | 'pen-full' | 'not-enough-coins' | 'shop-locked'`.
- `SAVE_VERSION = 2`; `parseSave` acepta v1 (`unlocked` → 1) y v2 (`counts`, recortado a `[0..maxCount]`, animales por defecto ≥ 1).
- Evento `animal-added { animalId, count }` cuando sube un conteo ya abierto.
- Datos: león 1/—, cabra 5/10, pantera 2/20, panda 2/20.

### Task 4: Varios animales por recinto sin pisarse

**Files:** `src/core/flock.ts`, `tests/unit/flock.test.ts`, `src/world/Pens.ts`.

- `MIN_GAP = 14`. `pickWanderTarget(area, from, obstacles, rng, margin, attempts, occupied: Vec[] = [])` descarta destinos a < `MIN_GAP` de `occupied`.
- `core/flock.ts`: `spreadPositions(area, obstacles, n, rng): Vec[]`; `blockedByOthers(next, others): boolean`.
- `Pens`: cada recinto tiene `wanderers: Wanderer[]`; `syncUnlocks` añade los nuevos en la puerta con el efecto de desbloqueo; al dar de comer todos saltan (`celebrate(id)`).
- Test: 5 cabras, rng fijo, N pasos → ningún par < MIN_GAP y ninguno dentro de un obstáculo.

### Task 5: Tienda con extras

**Files:** `src/data/shop.ts`, `src/data/strings.ts`, `src/scenes/ShopScene.ts`, `src/systems/testHooks.ts`.

- Artículos derivados: recintos (`pantera`, `panda`) + extras `extra-<id>` para animales con `maxCount > 1` y recinto abierto. `shopEntries(state): ShopEntry[]` (puro, en `data/shop.ts`), estado `'buy' | 'owned' | 'full'`.
- Rejilla de tarjetas que cabe en pantalla; al llegar al máximo: atenuada con ✔️.

### Task 6: Menú ⚙️ y créditos

**Files:** `src/scenes/SettingsScene.ts`, `src/scenes/HudScene.ts`, `src/scenes/TitleScene.ts`, `src/data/strings.ts`, `src/main.ts`.

- Botón ⚙️ (≥ 48 px) en el HUD, abre `Settings` y pausa `World`. Tres interruptores 🎵 🔊 🕹️. Créditos al pie, con sprites de panda y pantera en modo arte. Cerrar con ✖, tocar fuera o atrás. Se quita el 🕹️ suelto. Título con "Hecho por Daniela y Adrián 💛".

### Task 7: Sonido real

**Files:** `public/audio/*.ogg|mp3`, `public/audio/CREDITS.md`, `src/systems/audio.ts`, `src/scenes/PreloadScene.ts`, `tests/unit/audio.test.ts`.

- Kenney CC0 (Interface Sounds, Impact Sounds, Music Jingles / Digital Audio…), convertido a ogg+mp3 si hace falta.
- `audio.ts`: `SOUND_FILES: Record<SoundId, string>`, `MUSIC_KEY`; `AudioSystem.attach(game)`, `play(id)`, `setMusic(on)`, `pauseAll()/resumeAll()`. Si un audio no cargó, no suena y no falla. Se eliminan los tonos Web Audio.

### Task 8: Móvil

**Files:** `android/app/src/main/AndroidManifest.xml`, `package.json` (`@capacitor/app`), `src/core/back.ts`, `tests/unit/back.test.ts`, `src/systems/platform.ts`, `src/scenes/RotateScene.ts`, `src/scenes/*` (resize), `src/scenes/QuitDialog` en `ui.ts`.

- `screenOrientation="sensorLandscape"`.
- `decideBack(ctx: { settingsOpen, overlayOpen, quitDialogOpen, scene: 'title'|'world'|'other' }): BackAction` = `'close-settings' | 'close-overlay' | 'close-quit' | 'ask-quit' | 'exit'`.
- Capa "gira el móvil" si alto > ancho (pausa el mundo).
- Title, HUD, Shop, Feed, Settings se recolocan en resize (las superposiciones se reconstruyen con `scene.restart`).
- `visibilitychange` + `appStateChange` → guardar, pausar mundo y música; reanudar al volver.

### Task 9: Errores globales

**Files:** `src/scenes/ErrorScene.ts`, `src/systems/errors.ts`, `src/systems/testHooks.ts`.

- `window.onerror` / `unhandledrejection` → `console.error`, `session.saveIfValid()` y escena "¡Ups! 🐾" con 🔄 que recarga. Hook `__ZOO__.crash()`.

### Task 10: E2E, verificación y docs

- E2E: comprar pantera + segunda → "completo"; ⚙️ apagar sonido y ver créditos; viewport vertical → aviso; `crash()` → pantalla de error.
- `npm test`, `npm run build`, `npm run test:e2e`; comprobar `AndroidManifest.xml` final (sin permisos nuevos).
- README raíz, `game/README.md`, "Estado de implementación" de la spec padre, casillas; subir ambos repos.
