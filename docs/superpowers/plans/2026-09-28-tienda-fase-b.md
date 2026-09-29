# Tienda fase B (el cuidador entra andando) — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** que el cuidador entre andando en la tienda, compre acercándose (bocadillo de compra) y salga pisando el felpudo, con animales que reaccionan, tendero atento, pista y pasos.

**Architecture:** posición lógica del cuidador en píxeles del interior (`tienda.tmj`, 320×192, tiles de 16) dibujada con `toScreen`; se reutilizan `tryMove`, `findPathOrNearest`, `stepAlongPath` y el `SpriteWalker`. La lógica pura va en `core/shopWalk.ts` (tests unitarios); `ShopScene` coordina `ShopKeeperWalker`, `Shopkeeper` y `ShopHint`.

**Tech Stack:** Phaser 4, TypeScript, Vite, Vitest, Playwright.

Spec: `docs/superpowers/specs/2026-09-28-tienda-fase-b-design.md`.

**Estado: ejecutado (2026-09-28).** Todas las tareas hechas; 15 e2e y los unit en verde.

## Global Constraints

- Alcance de peana: 32 px de interior. Destino del paseo de entrada: (192, 170).
- Pista: a los 6 s quieto, repetición cada 8 s. Un gesto de más de 12 px no es un toque.
- Nunca se añaden archivos de arte de los packs al repo público.
- Textos en español en `data/strings.ts`; comentarios en español como el resto del código.
- Comandos desde `game/`: `npm test`, `npm run typecheck`, `npx playwright test`.

---

### Task 1: Lógica pura `core/shopWalk.ts` + mapa con plantas bloqueadas

**Files:** Create `src/core/shopWalk.ts`, `tests/unit/shopWalk.test.ts`; Modify `scripts/make-shop-map.mjs`, `tests/unit/shopmap.test.ts`, `public/assets/maps/tienda.tmj` (regenerado).

**Produces:** `PEDESTAL_REACH`, `ENTRY_TARGET`, `shopWalkGrid(base, bases)`, `productInReach(feet, bases, reach?)`, `approachPoint(grid, base)`, `hintTarget(entries, coins)`, `onDoorMat(feet, door)`, `openInteriorGrid()`.

- [x] Tests (vitest) para cada función con `gridFromAscii` y con `tienda.tmj` (puerta → punto de aproximación de cada peana; plantas (0,11) y (19,11) bloqueadas).
- [x] Implementar; `npm run make:shop-map`; `npm test` en verde; commit.

### Task 2: Sonido de pasos y textos

**Files:** Create `scripts/make-paso.mjs`, `public/audio/paso.wav`; Modify `src/systems/audio.ts` (`'paso'` en `SoundId`/`SOUND_IDS`, wav), `package.json` (`make:paso`), `src/data/strings.ts` (`shop.about.<animal>`, `shop.buyHint` no), `public/audio/CREDITS.md`, `tests/unit/audio.test.ts` si enumera ids.

- [x] Script de síntesis (golpe grave de madera, 90 ms, ruido filtrado + 180 Hz con caída rápida).
- [x] Textos: `shop.about.leon` "¡El león es el rey del zoo!", `shop.about.cabra` "¡Las cabras comen de todo… hasta piedras!", `shop.about.pantera` "¡La pantera es rapidísima!", `shop.about.panda` "¡Al panda le encanta el bambú!". Para ya comprado/completo se reutilizan `shop.owned` y `shop.full`.
- [x] Tests en verde; commit.

### Task 3: `SpriteWalker` con profundidad configurable; `Shopkeeper` y `ShopHint`

**Files:** Modify `src/world/Actors.ts` (`createKeeper(scene, x, y, depthOf = depthForY)`); Create `src/world/Shopkeeper.ts` (sacado de `ShopScene`: respirar, `hop()`, `wave()`, `say(msg, ms)`, `hideBubble()`, `message`, `lookAt(x)`), `src/world/ShopHint.ts` (`show(from, to)`, `hide()`, `visible`).

- [x] Typecheck en verde; commit.

### Task 4: `ShopKeeperWalker` y `ShopScene` con el cuidador

**Files:** Create `src/world/ShopKeeperWalker.ts`; Modify `src/scenes/ShopScene.ts`, `src/world/ShopInterior.ts` (`doorMat` sin cambios de API), `src/scenes/HudScene.ts` (joystick con Shop activa), `src/scenes/WorldScene.ts` (`onResume` con `{ from: 'shop' }`), `src/systems/testHooks.ts` (`shopKeeperScreenPos`, `shopBuyBubblePos`, `shopHintVisible`).

- [x] Entrada con paseo, control (teclado/joystick/toque), bocadillo de compra, reacciones, frases del tendero, pista, salida por felpudo, conservar posición al girar.
- [x] Typecheck + unit en verde; commit.

### Task 5: E2E, verificación en navegador y docs

**Files:** Modify `tests/e2e/shop.spec.ts` (y otras e2e que usen `shopCardScreenPos` para comprar), README raíz, `game/README.md`, spec (estado), este plan.

- [x] E2E: tocar pantera → bocadillo → comprar; panda sin monedas; felpudo → sale y queda bajo la puerta; pista visible.
- [x] Capturas escritorio y móvil apaisado.
- [x] Docs al día; commit.
