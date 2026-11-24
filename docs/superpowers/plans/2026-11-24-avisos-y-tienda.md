# Aviso de votación y avisos en la tienda: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** «¡A votar!» solo con una votación abierta, el globo del tendero nunca tapado por el botón de comprar y el
aviso de página nueva más largo y a la derecha.

**Architecture:** Decisiones puras y probadas en `game/src/core/` (qué panel de votación toca, dónde colocar una caja
para que no choque con otra). Las escenas solo las usan. Ganchos de prueba nuevos en `testHooks.ts` para que
Playwright mida las cajas.

**Tech Stack:** Phaser 3 + TypeScript, Vitest (unitarias), Playwright (juego).

**Spec:** `docs/superpowers/specs/2026-11-24-avisos-y-tienda-design.md`

## Global Constraints

- Rama `feat/release-2.11.0`. Commits en español con prefijo (`fix(tablon): …`, `fix(tienda): …`). `git add` y `git commit` en el mismo comando, y después `git log -1 --stat`.
- Sin textos nuevos (no hacen falta los 11 idiomas) y sin eventos de Matomo nuevos.
- Lo publicado no se rompe: un guardado viejo sin `winnerNoticed` sigue funcionando.
- Las pruebas las lanza un subagente con un modelo barato (haiku o sonnet), que devuelve la salida. Playwright de una en una: `npx playwright test <archivo> --workers=1`.
- El aviso de página nueva se ve unos **3,5 s** antes de desvanecerse (ahora 1,8 s). Los demás avisos no cambian.
- El globo del tendero queda por encima del bocadillo de comprar (profundidad del bocadillo: 3100).

## Review Focus

1. Giro del móvil con el panel de la ganadora abierto → sigue la copa (Task 1, prueba de juego).
2. Votación cerrada sin ganadora → ningún panel (Task 1, unitaria).
3. Pantalla baja apaisada (p. ej. 740×340) con el mensaje más largo («¡Te faltan N monedas!…») y el botón de comprar → no se pisan y el globo cabe en pantalla (Task 2).
4. Árabe: el aviso de página nueva también va a la derecha y no se sale de la pantalla (Task 3).
5. El globo ya visible cuando aparece o se va el botón de comprar se recoloca (Task 2).

---

### Task 1: El panel de votación no cambia a «¡A votar!» al reiniciarse

**Files:**
- Modify: `game/src/core/community.ts` (junto a `shouldNotifyWinner`)
- Modify: `game/src/scenes/PollNoticeScene.ts` (`create()`)
- Test: `game/tests/unit/community.test.ts`, `game/tests/e2e/board.spec.ts`

**Interfaces:**
- Produces: `pollNoticeKind(status: CommunityStatus, memory: CommunityMemory, today: string): 'winner' | 'vote' | null` en `core/community.ts`: `'winner'` si `shouldNotifyWinner`, si no `'vote'` si `shouldNotify`, si no `null`.
- Produces: `PollNoticeScene.kindFor: { poll: string; kind: 'winner' | 'vote' } | null` (estático, como `shownFor`).

- [x] **Step 1: Pruebas unitarias que fallan** en `community.test.ts`:
  - `pollNoticeKind` con votación cerrada y ganadora no vista → `'winner'`; con la misma memoria y `winnerNoticed` = id → `null` (este es el caso del fallo: nunca `'vote'`).
  - cerrada sin ganadora → `null`; abierta sin votar ni avisar → `'vote'`; primer día → `null`; memoria vieja sin `winnerNoticed` (se parsea con `parseMemory` de un JSON sin ese campo) → `'winner'`.
- [x] **Step 2: Prueba de juego que falla** en `board.spec.ts`: `'girar el móvil con el aviso de la ganadora no lo cambia a votar'`. Servidor falso con `{ ...OPEN, abierta: false, ganadora: <id de una opción> }`, `firstDay` de ayer (como los demás casos de ganadora del archivo, o con el gancho que ya usen), esperar el panel, `page.setViewportSize` a otro tamaño, y comprobar que el bus registra `poll-winner-notice` una vez y **ningún** `poll-notice`.
- [x] **Step 3: Lanzar ambas en el subagente.** Esperado: FAIL (no existe `pollNoticeKind`; en juego sale `poll-notice` tras el giro).
- [x] **Step 4: Implementar.** `pollNoticeKind` en `core`. En `create()`: si `kindFor?.poll === poll.id` se usa ese `kind`; si no, se calcula con `pollNoticeKind` y se guarda. Si sale `null`, o si es `'vote'` y `community.phase() !== 'open'`, se llama a `finish(false)`. La rama `'winner'` busca la opción ganadora como ahora (si no la encuentra, `finish(false)`). `Community` expone `noticeKind()` envolviendo la función pura con `this.today()`.
- [x] **Step 5: Lanzar** `npm test -- community` y `npx playwright test tests/e2e/board.spec.ts --workers=1`. Esperado: todo PASS, incluidos los casos que ya existían.
- [x] **Step 6: Commit** `fix(tablon): el aviso de la ganadora no se convierte en «A votar» al girar el móvil`.

### Task 2: El globo del tendero, encima y sin chocar con el botón de comprar

**Files:**
- Create: `game/src/core/bubbleLayout.ts`
- Modify: `game/src/world/Shopkeeper.ts` (`say`, nueva `setAvoid`), `game/src/scenes/ShopScene.ts` (`showBuyBubble`, `hideBuyBubble`), `game/src/systems/testHooks.ts`
- Test: `game/tests/unit/bubbleLayout.test.ts`, `game/tests/e2e/shop.spec.ts`

**Interfaces:**
- Produces: `interface Rect { x: number; y: number; w: number; h: number }` (centro y tamaño) y `placeClear(box: Rect, avoid: Rect | null, bounds: { width: number; height: number; minY: number }, gap: number): { x: number; y: number }` en `core/bubbleLayout.ts`. Devuelve el centro de `box` tal cual si no choca. Si choca, prueba en este orden: encima de `avoid`, a la derecha, a la izquierda, debajo. Se queda con el primer sitio que cabe dentro de `bounds` (y ≥ `minY`). Si no cabe ninguno, el que menos se solape.
- Produces: `Shopkeeper.setAvoid(rect: Rect | null): void`: guarda la caja y recoloca el globo visible.
- Produces ganchos: `shopBubbleRect(): Rect | null`, `shopBuyBubbleRect(): Rect | null`, `shopBubbleAbove(): boolean` (profundidad del globo > profundidad del bocadillo).

- [x] **Step 1: Pruebas unitarias que fallan** (`bubbleLayout.test.ts`): sin choque → misma posición; choque → resultado sin solape y dentro de `bounds`; sin sitio arriba (cerca de `minY`) → va a un lado; pantalla 740×340 con caja grande → dentro de `bounds`.
- [x] **Step 2: Prueba de juego que falla** (`shop.spec.ts`): `'el tendero no queda tapado por el botón de comprar con ninguno de sus mensajes'`. Recorre: saludo, curiosidad de un animal, Luna, clínica, `owned`, `full`, `needCoinsHow` (con pocas monedas), `thanks` tras comprar. En cada uno, con el bocadillo visible, las dos cajas no se solapan, el globo está dentro del lienzo y `shopBubbleAbove()` es true. La misma prueba se repite a 740×340 apaisado.
- [x] **Step 3: Lanzar en el subagente.** Esperado: FAIL.
- [x] **Step 4: Implementar.** El globo sube a profundidad 3200. `say()` calcula su posición de siempre y la pasa por `placeClear` con el `avoid` guardado (`minY` = `COIN_CLEAR_Y`, gap `4 * s`). `showBuyBubble` llama a `shopkeeper.setAvoid(caja del bocadillo a escala 1, contando el vaivén de 2·s)` y `hideBuyBubble` a `setAvoid(null)`. La punta del globo puede quedar como está.
- [x] **Step 5: Lanzar** `npm test -- bubbleLayout` y `npx playwright test tests/e2e/shop.spec.ts --workers=1`. Esperado: PASS.
- [x] **Step 6: Commit** `fix(tienda): el globo del tendero va encima y se aparta del botón de comprar`.

### Task 3: El aviso de página nueva, más largo y a la derecha

**Files:**
- Modify: `game/src/systems/events.ts` (carga de `'toast'`), `game/src/scenes/HudScene.ts` (`showToast`), `game/src/scenes/ShopScene.ts` (`onBuy`, emisión de `book.newPage`), `game/src/systems/testHooks.ts`
- Test: `game/tests/e2e/shop.spec.ts`

**Interfaces:**
- Produces: carga del evento `'toast'` con `{ text: string; icon?: 'shop'; place?: 'right'; ms?: number }`. Sin `place` ni `ms` funciona igual que ahora (centro, 1800 ms).
- Produces gancho: `hudToastRect(): Rect | null` (usa `Rect` de la Task 2).

- [x] **Step 1: Prueba de juego que falla** (`shop.spec.ts`): `'el aviso de página nueva sale a la derecha y dura más'`. Comprar un animal que abre una página. El aviso queda en la mitad derecha del lienzo, sin solaparse con `shopBubbleRect()` ni con `shopBuyBubbleRect()`, sigue visible a los 3 s y desaparece antes de los 5 s. Se repite en árabe (dentro del lienzo) y a 740×340. Otra prueba comprueba que un aviso normal (`toast.shopOpen`) sigue centrado.
- [x] **Step 2: Lanzar en el subagente.** Esperado: FAIL.
- [x] **Step 3: Implementar.** Con `place: 'right'`, `showToast` coloca el aviso con su borde derecho a 16 px del borde del lienzo, a la altura de siempre (y 90), sin pasar de la mitad hacia la izquierda; el `delay` del desvanecido es `ms ?? 1800`. En `onBuy` se emite `{ text: t('book.newPage'), place: 'right', ms: 3500 }`. Si al probarlo choca con el botón de ajustes del HUD, se baja lo justo y se anota en «Cómo quedó».
- [x] **Step 4: Lanzar** `npx playwright test tests/e2e/shop.spec.ts --workers=1`. Esperado: PASS.
- [x] **Step 5: Commit** `fix(tienda): el aviso de página nueva dura más y sale a la derecha`.

### Task 4: Comprobación completa, documentación y prueba de David

- [x] **Step 1:** El subagente lanza `npm run typecheck`, `npm test` y, de una en una, `board.spec.ts`, `shop.spec.ts`, `valoracion.spec.ts` y `stats.spec.ts`. Todo PASS.
- [x] **Step 2:** Documentación: apartado «Cómo quedó» en la spec y casillas de este plan.
- [x] **Step 3:** Commit `docs: cómo quedaron los arreglos de aviso y tienda`.
- [ ] **Step 4:** Preguntar a David si hay que sacar una nueva subida a la prueba interna (versionCode 15, según la tabla de `game/README.md` › Versión) para probarlo en el móvil. Lo visual no se da por terminado sin su prueba.
