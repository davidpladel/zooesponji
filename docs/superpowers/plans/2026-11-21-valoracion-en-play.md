# Pedir la valoración en Google Play — Plan de implementación

> **Para quien lo ejecute:** usar `superpowers:executing-plans` (en la propia sesión, sin subagentes; así lo manda `CLAUDE.md`) y `superpowers:test-driven-development`. Las casillas (`- [ ]`) se marcan al terminar cada paso.

**Objetivo:** con 10 min de juego acumulados y el primer animal comprado, en un momento tranquilo, el juego llama a la API de reseñas de Google Play (una vez; una 2.ª a los 30 días y 10 min más; nunca más de 2), sin cartel, botón ni enlace propios.

**Arquitectura:** lógica pura en `core/reviewPrompt.ts` (memoria guardada, sumar juego, «¿toca?»); un sistema `systems/review.ts` (reloj de juego, avisos recientes, pedir con la tarjeta abierta y tiempo máximo); `systems/reviewInstall.ts`, único archivo que toca el plugin `@capawesome/capacitor-app-review`; el enganche en `WorldScene` al volver de comer, limpiar o la tienda, por delante del anuncio de la pausa.

**Tecnología:** Phaser 3 + TypeScript, Capacitor 8, `@capawesome/capacitor-app-review` 8.1.0, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-21-valoracion-en-play-design.md` (aprobada el 2026-11-21).

## Restricciones globales

- Rama `feat/release-2.11.0`; no crear otra, no fusionar con `main`, no subir a GitHub, **no subir la versión** ni publicar en Play.
- **Nada de enlace a la ficha:** `openAppStore()` no se llama nunca; sin `market://` ni `play.google.com` en `src/`.
- Sin cartel, botón, pregunta, premio, monedas ni «gracias» propios. La tarjeta de Google no se toca.
- Solo Android nativo. En web, en desarrollo sin `?valoracion=rapido` y en los jugadores con IA no hace nada.
- Clave propia `zooesponji_v3_review`, fuera de la partida y de `SAVE_VERSION`; no se envía a ningún sitio. Clave ausente o mala → vacía, sin lanzar. Nunca lanza: la valoración nunca impide jugar.
- Constantes (en `reviewPrompt.ts`, cada una con su prueba): `PLAY_MIN_S = 600`, `SECOND_WAIT_DAYS = 30`, `SECOND_PLAY_S = 600`, `MAX_ATTEMPTS = 2`, `CALM_WAIT_S = 300`, `NOTICE_QUIET_S = 600`, `AD_QUIET_S = 180`, `MAX_TICK_S = 60`, `SAVE_EVERY_S = 60`, `CARD_TIMEOUT_MS = 60_000`.
- El intento se marca y se guarda **antes** de llamar a la API.
- Pruebas: quién las lanza se decide con David al empezar; las pesadas de una en una (`--workers=1`). Git: `git add` y `git commit` en el mismo comando y `git log -1 --stat` después; commits en español con prefijo.

## Qué vigilar (casos que la spec no prueba por sí sola)

- El juego se cierra a la fuerza con la tarjeta abierta: al volver, `attempts` ya está guardado y no se pide otra vez → Tarea 2.
- La app vuelve a primer plano al cerrar la tarjeta y el aviso de actualizar intenta salir encima → Tarea 4 (`'Review'` en `BUSY`).
- Dos pausas naturales seguidas mientras la llamada aún no ha terminado: no se pide dos veces → Tarea 2 (`request()` con la tarjeta abierta no hace nada).
- La tarjeta abierta y el reloj de juego sigue sumando: no suma mientras está abierta → Tarea 2.
- El jugador compra su primer animal **dentro** del tutorial: no sale hasta que el tutorial acaba → Tarea 4 (prueba de juego).

---

### Tarea 1: Lógica pura `core/reviewPrompt.ts`

**Archivos:**
- Crear: `game/src/core/reviewPrompt.ts`
- Modificar: `game/src/core/economy.ts` (sacar `boughtAnimal`), `game/src/systems/analyticsEvents.ts:45-54` (`knownSteps` la usa)
- Prueba: `game/tests/unit/reviewPrompt.test.ts`, `game/tests/unit/economy.test.ts`

**Interfaces:**
- Produce:
  - `boughtAnimal(state: GameState): boolean` en `economy.ts`: `PEN_IDS.some(id => state.counts[id] > initialCounts()[id])`. Luna y la clínica no cuentan.
  - `REVIEW_KEY = 'zooesponji_v3_review'` y las constantes de «Restricciones globales».
  - `interface ReviewMemory { playSeconds: number; attempts: number; lastAttemptDay: string | null; playAtAttempt: number | null }`
  - `emptyReview(): ReviewMemory` → `{ playSeconds: 0, attempts: 0, lastAttemptDay: null, playAtAttempt: null }`
  - `parseReview(raw: string | null): ReviewMemory`: nunca lanza; cualquier campo malo (no número, negativo, infinito, `attempts` no entero o > 2, día que no es `AAAA-MM-DD`) → `emptyReview()`.
  - `addPlay(m: ReviewMemory, seconds: number): ReviewMemory`: ignora `seconds` ≤ 0, no finito o > `MAX_TICK_S`.
  - `markAttempt(m: ReviewMemory, today: string): ReviewMemory` → `attempts + 1`, `lastAttemptDay = today`, `playAtAttempt = playSeconds`.
  - `interface ReviewMoment { boughtAnimal: boolean; tutorialReady: boolean; panelOpen: boolean; natural: boolean; dueFor: number; sinceNotice: number | null; sinceAd: number | null; today: string }` — `dueFor`: segundos de juego que lleva cumpliendo las condiciones en esta partida; `sinceNotice`/`sinceAd`: segundos de juego desde el último aviso destacado / panel de anuncio de esta partida (`null`: ninguno).
  - `isDue(m: ReviewMemory, boughtAnimal: boolean, today: string): boolean`: las condiciones sin el momento (1.ª: `playSeconds ≥ 600` y animal; 2.ª: `daysBetween(lastAttemptDay, today) ≥ 30` y `playSeconds − playAtAttempt ≥ 600`; `attempts ≥ 2` nunca; día anterior al del intento, no).
  - `shouldRequest(m: ReviewMemory, at: ReviewMoment): boolean`: `isDue` y `tutorialReady` y `!panelOpen` y `(sinceNotice === null || sinceNotice ≥ 600)` y `(sinceAd === null || sinceAd ≥ 180)` y `(natural || dueFor ≥ 300)`.

- [x] **Paso 1: Escribir las pruebas que fallan** en `reviewPrompt.test.ts` (y `boughtAnimal` en `economy.test.ts`), una por caso:
  - `parseReview(null)`, `'{'`, `'[]'`, `{"playSeconds":-1,…}`, `{"playSeconds":"5",…}`, `{"attempts":3,…}`, día `"21-11-2026"` → `emptyReview()`; uno bueno se lee igual.
  - `addPlay`: suma 1; ignora 0, −5, `NaN`, `Infinity` y 61.
  - `isDue`: 599 s con animal → false; 600 con animal → true; 600 sin animal → false; 3000 sin animal → false.
  - 2.ª vez: `attempts 1`, intento `2026-11-01`, hoy `2026-11-30` y 600 s más → false; hoy `2026-12-01` y 599 s más → false; `2026-12-01` y 600 s más → true; hoy `2026-10-31` (reloj hacia atrás) → false. `attempts 2` → false siempre.
  - `shouldRequest` con todo bien y `natural: true` → true; cada condición rota por separado → false (`tutorialReady: false`, `panelOpen: true`, `sinceNotice 599`, `sinceAd 179`); `sinceNotice 600` y `sinceAd 180` → true; `natural: false` con `dueFor 299` → false, con `300` → true.
  - `boughtAnimal`: partida nueva → false; con `luna` y `clinic` en true → false; un recinto con un animal más → true.
  - `knownSteps` sigue dando lo mismo (sus pruebas actuales pasan sin cambios).

- [x] **Paso 2: Ver que fallan:** `npx vitest run tests/unit/reviewPrompt.test.ts tests/unit/economy.test.ts` → FAIL (no existe el módulo / la función).
- [x] **Paso 3: Implementar** `reviewPrompt.ts` (estilo de `adPacing.ts`: sin Phaser, reloj ni almacén; días con `daysBetween` de `core/activity.ts`) y `boughtAnimal`; `knownSteps` pasa a usarla.
- [x] **Paso 4: Ver que pasan:** el mismo comando y `npx vitest run tests/unit/analyticsEvents.test.ts` → PASS.
- [x] **Paso 5: Guardar:** `git add game/src/core/reviewPrompt.ts game/src/core/economy.ts game/src/systems/analyticsEvents.ts game/tests/unit/reviewPrompt.test.ts game/tests/unit/economy.test.ts && git commit -m "feat(valoracion): lógica pura de cuándo pedir la valoración"`

### Tarea 2: Sistema `systems/review.ts`

**Archivos:**
- Crear: `game/src/systems/review.ts`
- Modificar: `game/src/systems/events.ts` (avisos `review-requested`, `review-failed`)
- Prueba: `game/tests/unit/review.test.ts`

**Interfaces:**
- Consume: todo lo de la Tarea 1.
- Produce:
  - En `GameEvents`: `'review-requested': { attempt: 1 | 2 }` y `'review-failed': { attempt: 1 | 2 }`.
  - `interface Reviewer { request(): Promise<void> }` (el plugin o uno falso).
  - `interface ReviewDeps { reviewer: Reviewer; store: KeyValueStore; events: EventBus<GameEvents>; now: () => Date; timeoutMs?: number }`
  - `class Review`: `start(): Promise<void>` (lee la clave); `tick(seconds: number): void` (suma a la memoria y al juego de esta partida, guarda cada `SAVE_EVERY_S`; no hace nada con la tarjeta abierta); `setBackground(hidden: boolean): void` (guarda al ocultarse); `get open(): boolean`; `canRequest(at: { boughtAnimal: boolean; tutorialReady: boolean; panelOpen: boolean; natural: boolean }): boolean` (completa `dueFor` —la primera vez que ve `isDue` en esta partida apunta los segundos de juego y desde ahí cuenta—, `sinceNotice`, `sinceAd` y `today`, y llama a `shouldRequest`); `request(): Promise<void>` (si `open` o no `isDue`, nada; si no: `markAttempt`, guarda **y espera a que se guarde**, emite `review-requested`, `open = true`, espera a `reviewer.request()` o a `timeoutMs` (por defecto `CARD_TIMEOUT_MS`), emite `review-failed` si rechaza, `open = false` siempre).
  - Escucha en el bus `poll-notice`, `poll-winner-notice` y `update-offered` (último aviso) y `ad-offered` (último anuncio), apuntando los segundos de juego de esta partida.
  - `getReview(): Review | null` y `setReview(r: Review | null): void`.

- [x] **Paso 1: Pruebas que fallan** en `review.test.ts`, con almacén en memoria, bus de verdad y `Reviewer` falso:
  - Arranca sin clave → `playSeconds 0`; con clave corrupta → igual, sin lanzar.
  - `tick(1)` × 600 y animal → `canRequest({…natural:true})` true; × 599 → false.
  - Se guarda a los 60 s de juego y con `setBackground(true)`; un `Review` nuevo sobre el mismo almacén sigue donde iba.
  - Con estadísticas apagadas cuenta igual (el sistema no las mira: la prueba no monta analíticas y pide igual).
  - `poll-notice` emitido hace 599 s de juego → false; a los 600 → true. `ad-offered` hace 179 s → false; a los 180 → true.
  - Sin pausa natural: `dueFor` cuenta desde que cumple; a los 299 s → false, a los 300 → true.
  - `request()`: el almacén ya tiene `attempts 1` **antes** de que `reviewer.request` se llame (el falso lo comprueba al ser llamado); emite `review-requested {attempt:1}`; `open` es true mientras no resuelve y false después.
  - Reviewer que rechaza → `review-failed {attempt:1}`, `open` false, y `canRequest` false después (ya hay un intento).
  - Reviewer que no resuelve nunca, `timeoutMs: 50` → `open` false a los 50 ms, sin `review-failed`.
  - `request()` dos veces seguidas → el reviewer se llama una vez.
  - Con la tarjeta abierta, `tick(30)` no suma.
  - Cierre a la fuerza: tras `request()` sin resolver, un `Review` nuevo sobre el mismo almacén → `attempts 1`, `canRequest` false.
  - 2.ª vez: `attempts 1` hace 30 días (reloj falso) y 600 s más → pide y emite `{attempt:2}`; después, nunca más.
- [x] **Paso 2: Ver que fallan:** `npx vitest run tests/unit/review.test.ts` → FAIL.
- [x] **Paso 3: Implementar** `review.ts` (como `ads.ts`: todo en `try/catch`, nunca lanza; si el almacén falla al leer, no pide nada en esta partida) y los dos avisos en `events.ts`.
- [x] **Paso 4: Ver que pasan:** el mismo comando → PASS; `npm run typecheck` → sin errores.
- [x] **Paso 5: Guardar:** `git add game/src/systems/review.ts game/src/systems/events.ts game/tests/unit/review.test.ts && git commit -m "feat(valoracion): sistema que cuenta el juego y pide la valoración con la tarjeta abierta"`

### Tarea 3: Plugin nativo y montaje (`systems/reviewInstall.ts`)

**Archivos:**
- Crear: `game/src/systems/reviewInstall.ts`, `game/src/systems/playing.ts`
- Modificar: `game/package.json` (dependencia), `game/src/systems/adsInstall.ts` (usa `playing.ts`), `game/src/scenes/PreloadScene.ts` (llama a `installReview`), `game/src/systems/platform.ts:65` (avisa a `getReview()?.setBackground`)
- Prueba: `game/tests/unit/reviewInstall.test.ts`

**Interfaces:**
- Consume: `Review`, `setReview`, `Reviewer` (Tarea 2).
- Produce:
  - `playing(game: Phaser.Game): boolean` en `playing.ts` (la misma regla de hoy en `adsInstall.ts`: `!document.hidden` y `World` activo o en pausa debajo de un panel); `adsInstall.ts` la importa en vez de tenerla.
  - `createPlayReviewer(): Reviewer`: llama solo a `AppReview.requestReview()`.
  - `startReview(game: Phaser.Game, reviewer: Reviewer, options?: { playSeconds?: number }): Promise<Review>`: monta `Review`, `setReview`, y un `setInterval` de 1 s con `if (playing(game)) review.tick(1)`; `playSeconds` solo para `?valoracion=rapido`.
  - `installReview(game: Phaser.Game): void`: nunca lanza; en desarrollo con `?valoracion=rapido` arranca con un `Reviewer` falso (escribe en la consola `valoracion: pedida`) y `playSeconds: 600`; si no, solo en Android nativo con el de verdad.

- [x] **Paso 1: Instalar y leer el plugin:** `npm i @capawesome/capacitor-app-review@8.1.0` (desde `game/`). Leer `node_modules/@capawesome/capacitor-app-review/android/build.gradle` y su `AndroidManifest.xml`: apuntar en el «Cómo quedó» de la spec qué versión de `com.google.android.play:review` trae y confirmar que **no añade permisos**. Si añade alguno, parar y avisar a David.
- [x] **Paso 2: Pruebas que fallan** en `reviewInstall.test.ts` (con `vi.mock('@capawesome/capacitor-app-review')`, como `appUpdate.test.ts`): `createPlayReviewer().request()` llama a `requestReview` y nunca a `openAppStore`; `installReview` en web no monta nada (`getReview()` null); un fallo de `requestReview` llega como promesa rechazada. Y una prueba que lee todos los `.ts` de `src/` y comprueba que no aparecen `openAppStore`, `market://` ni `play.google.com`.
- [x] **Paso 3: Ver que fallan:** `npx vitest run tests/unit/reviewInstall.test.ts` → FAIL.
- [x] **Paso 4: Implementar** `playing.ts`, `reviewInstall.ts`, la llamada en `PreloadScene` (junto a `installUpdateNotice`) y el aviso de segundo plano en `platform.ts`.
- [x] **Paso 5: Ver que pasan:** el mismo comando, `npx vitest run tests/unit/ads.test.ts` y `npm run typecheck` → PASS.
- [x] **Paso 6: Compilar Android:** `npm run build`, `npx cap sync android`, y en `game/android` `./gradlew bundleRelease`; después `npm run check:manifest` y `npm run check:aab` → los dos OK (sale de R8 y sin permisos nuevos). Si R8 se queja, se añaden las reglas que pida el plugin y se vuelve a compilar.
- [x] **Paso 7: Guardar:** `git add game/package.json game/package-lock.json game/src/systems/reviewInstall.ts game/src/systems/playing.ts game/src/systems/adsInstall.ts game/src/scenes/PreloadScene.ts game/src/systems/platform.ts game/tests/unit/reviewInstall.test.ts game/android && git commit -m "feat(valoracion): plugin de reseñas de Play (solo pedir, nunca la ficha)"`

### Tarea 4: Enganche en `WorldScene`, convivencia con anuncios y avisos, pruebas de juego

**Archivos:**
- Modificar: `game/src/scenes/WorldScene.ts:690-830`, `game/src/core/updatePolicy.ts:100` (`'Review'` en `BUSY`), `game/src/systems/updateNoticeInstall.ts` (`activeScenes` añade `'Review'` si `getReview()?.open`), `game/src/systems/testHooks.ts`
- Prueba: `game/tests/unit/updatePolicy.test.ts`, `game/tests/e2e/valoracion.spec.ts`

**Interfaces:**
- Consume: `getReview()`, `boughtAnimal`, `pendingLessonOffers`.
- Produce:
  - `WorldScene.maybeReview(natural: boolean): boolean`: si `getReview()?.canRequest({ boughtAnimal, tutorialReady, panelOpen, natural })`, para a la cuidadora, pausa `World`, llama a `request()` y reanuda `World` al terminar; devuelve true si ha pedido. `tutorialReady` = `tutorial.offered` y `!tutorialRunning()` y sin `pendingLessonOffers`; `panelOpen` = `AdOffer`, `PollNotice` o `UpdateNotice` activos, o `getAds()?.panelOpen`.
  - En la vuelta natural (de `shop`, `feed` o `clean`), tras el `return` de las lecciones: `delayedCall(AD_OFFER_MS, () => { if (!this.maybeReview(true)) this.offerAd(); })`.
  - Un `this.time.addEvent({ delay: 5000, loop: true })` que llama a `maybeReview(false)` (el caso «sin pausa en 5 min»). Al estar en el reloj de la escena, con `World` en pausa no corre.
  - `offerAd()` y `maybeNotice()` no hacen nada si `getReview()?.open`.
  - En `testHooks.ts`: `reviewFake(result: 'ok' | 'fallo' | 'colgada', playSeconds?: number)`, `reviewAdvance(seconds: number)`, `reviewCalls(): number`, `reviewOpen(): boolean`.

- [x] **Paso 1: Prueba que falla** en `updatePolicy.test.ts`: `isSafeMoment(['World', 'Review'])` → false.
- [x] **Paso 2: Pruebas de juego que fallan** en `valoracion.spec.ts` (con `?sin-tutorial` donde toque y `reviewFake`), una por caso:
  - 600 s y animal comprado → al volver de dar de comer: `reviewCalls() === 1`, y mientras `reviewOpen()` el mundo está en pausa; al resolver, la cuidadora se mueve.
  - Lo mismo al salir de la tienda tras comprar el primer animal.
  - Sin los 600 s, o sin animal comprado → 0 llamadas al volver de comer.
  - Valoración y anuncio de la pausa a la vez (`adsFake('visto')` y `adsAdvance(900)`) → sale la valoración y no `AdOffer`; en la pausa siguiente, `AdOffer` sí.
  - Votación sin avisar (`PollNotice` abierto) → 0 llamadas; anuncio ofrecido hace menos de 180 s → 0.
  - Tutorial sin hacer (sin `?sin-tutorial`) → 0 llamadas mientras no se ha ofrecido; primer animal comprado dentro del tutorial → no sale hasta que acaba.
  - Salir de la tienda tras comprar un recinto de barro → sale la lección y no la valoración.
  - Sin volver de ningún panel, a los 300 s de cumplir → 1 llamada.
  - `'colgada'` → el mundo vuelve solo a los 60 s (con el tiempo de la página acelerado con `page.clock`).
  - Pantalla baja apaisada (844×390): sale igual y el juego sigue jugable.
- [x] **Paso 3: Ver que fallan:** `npx vitest run tests/unit/updatePolicy.test.ts` y `npx playwright test valoracion --workers=1` → FAIL.
- [x] **Paso 4: Implementar** el enganche, `BUSY`, `activeScenes` y los ayudantes de prueba.
- [x] **Paso 5: Ver que pasan:** los dos comandos → PASS; y que no se ha roto lo de al lado: `npx playwright test ads actualizacion tutorial lecciones board --workers=1` → PASS.
- [x] **Paso 6: Guardar:** `git add game/src/scenes/WorldScene.ts game/src/core/updatePolicy.ts game/src/systems/updateNoticeInstall.ts game/src/systems/testHooks.ts game/tests/unit/updatePolicy.test.ts game/tests/e2e/valoracion.spec.ts && git commit -m "feat(valoracion): se pide en la pausa natural, por delante del anuncio y sin pisar avisos"`

### Tarea 5: Estadísticas de Matomo

**Archivos:**
- Modificar: `game/src/systems/analyticsEvents.ts:275-280`, `game/src/core/eventCatalog.ts:31`, `game/tests/unit/eventCatalog.test.ts:19`, `tools/matomo/resumen.mjs:188-197`
- Prueba: `game/tests/unit/analyticsEvents.test.ts`, `game/tests/unit/eventCatalog.test.ts`

**Interfaces:**
- Consume: `review-requested`, `review-failed` (Tarea 2).
- Produce: categoría `valoracion: ['valoracion-solicitada', 'valoracion-fallo']`; `review-requested` → `send('valoracion', 'valoracion-solicitada', String(attempt))`; `review-failed` → `send('valoracion', 'valoracion-fallo', String(attempt))`.

- [x] **Paso 1: Pruebas que fallan:** en `analyticsEvents.test.ts`, emitir cada aviso y ver el evento con su nombre `'1'`/`'2'` (y que con las estadísticas apagadas no se envía nada); en `eventCatalog.test.ts`, añadir `'2026-11-21-valoracion-en-play-design.md'` a la lista de specs.
- [x] **Paso 2: Ver que fallan:** `npx vitest run tests/unit/analyticsEvents.test.ts tests/unit/eventCatalog.test.ts` → FAIL.
- [x] **Paso 3: Implementar** las dos líneas en `analyticsEvents.ts`, la categoría en `CATALOG` y en `resumen.mjs` un apartado «Valoración en Play» con una tabla `Intento | Solicitadas | Fallos` (filas `1` y `2`) y una línea que recuerde que la API no dice si se mostró ni si se valoró (eso, en Play Console).
- [x] **Paso 4: Ver que pasan:** el mismo comando → PASS; `node tools/matomo/resumen.mjs` (si hay datos descargados) acaba sin error.
- [x] **Paso 5: Guardar:** `git add game/src/systems/analyticsEvents.ts game/src/core/eventCatalog.ts game/tests/unit/analyticsEvents.test.ts game/tests/unit/eventCatalog.test.ts tools/matomo/resumen.mjs && git commit -m "feat(valoracion): estadísticas de Matomo (categoría valoracion)"`

### Tarea 6: Comprobación completa y documentación

**Archivos:**
- Modificar: `README.md` (estado y hoja de ruta), `game/README.md` (apartado de la valoración: cuándo sale, la clave, `?valoracion=rapido`, cómo probar en el móvil), la spec (apartado «Cómo quedó») y las casillas de este plan.

- [x] **Paso 1: Todo junto:** `npm run typecheck`, `npm test` y `npm run build` → sin errores. La tanda de juego completa (`npm run test:e2e -- --workers=1`, ~30 min) → PASS.
- [x] **Paso 2: Documentación:** lo de arriba, con el «Cómo quedó» diciendo qué versión de `play:review` trae el plugin, que no añade permisos y que sigue pendiente lo de «Antes de publicar» (consulta a Google sobre Familias, ficha de datos, cuentas de niños, política de SDK).
- [x] **Paso 3: Guardar:** `git add README.md game/README.md docs/superpowers/specs/2026-11-21-valoracion-en-play-design.md docs/superpowers/plans/2026-11-21-valoracion-en-play.md && git commit -m "docs(valoracion): README, cómo quedó y casillas del plan"`
- [ ] **Paso 4 (lo hace David): Para David (al final del mensaje):** prueba en el móvil desde la **prueba interna** de Play con una cuenta sin reseña del juego (no con «compartir apps internamente», que no deja enviar), y nunca con una cuenta de niño real. No se sube a producción hasta que Google conteste lo de Familias.
