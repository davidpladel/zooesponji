# Aviso para actualizar el juego — Plan de implementación

> **Para quien lo ejecute:** usar `superpowers:executing-plans` (en la propia sesión, sin subagentes; así lo manda `CLAUDE.md`) y `superpowers:test-driven-development`. Las casillas (`- [ ]`) se marcan al terminar cada paso.

**Objetivo:** que quien tenga una versión vieja vea un aviso (pequeña, grande o rota) decidido por la clave `actualizacion` del servidor, con la ventana de actualización inmediata de Play, sin bloquear nunca si Play no confirma que se puede actualizar.

**Arquitectura:** lógica pura en `core/updatePolicy.ts` (decide `nada | suave | obligatoria` y guarda lo aplazado); un envoltorio de Play en `systems/appUpdate.ts` (único archivo que toca el plugin, con una pieza falsa para pruebas); un coordinador `systems/updateNotice.ts` que junta servidor + Play + momento seguro y lanza `UpdateNoticeScene`; la clave nueva viaja en el `estado.php` que ya pide `Community`.

**Tecnología:** Phaser 3 + TypeScript, Capacitor 8, `@capawesome/capacitor-app-update`, Vitest, Playwright, PHP 8 + PHPUnit.

**Spec:** `docs/superpowers/specs/2026-11-19-actualizacion-obligatoria-design.md`

## Restricciones globales

- Rama `feat/release-2.11.0`; no crear otra, no fusionar con `main`, no subir a GitHub, **no subir la versión** (eso es de otro paso).
- No tocar el servidor real ni el VPS (solo el código de `server/` y sus pruebas PHPUnit); no publicar en Play ni lanzar el aviso de Play Console; no leer ni mostrar secretos.
- Números en `versionCode` entero, nunca el nombre de versión. `minima` y `ultima` ausentes o mal → sin aviso.
- **Nunca se bloquea** sin que Play confirme ahora que el tipo de actualización está permitido; sin respuesta del servidor *en esta sesión* tampoco.
- Sin enlaces externos (`market://`, `play.google.com`): solo la ventana de Play. Sin identificadores del jugador.
- Sin palabras siempre que se pueda; el texto, una frase corta en los **11 idiomas** (árabe de derecha a izquierda). Dibujos propios en Canvas 2D en `src/ui/`, nunca arte de VectoRaith.
- Topes (constantes en `updatePolicy.ts`): como mucho un aviso por día; pequeña: 3 en total por cada `ultima`; grande: 2 suaves y la tercera obligatoria; rota: obligatoria ya.
- Los campos nuevos del guardado llevan valor por defecto; el guardado viejo se sigue leyendo. Un cambio de servidor debe funcionar con el juego ya publicado.
- Pruebas las lanza Claude, pesadas de una en una con `--workers=1`. Git: `git add` y `git commit` en el mismo comando, y `git log -1 --stat` después; commits en español con prefijo. Lo visual lo valida David con capturas.

## Qué vigilar (pruebas que ninguna tarea cubre por la spec)

- Respuesta del servidor con `actualizacion` mal formada (`ultima` texto, `minima` negativa, `grande` no booleano): sin aviso y el resto del estado se sigue leyendo → Tarea 2.
- `appStateChange` repetido / título que se reinicia por cambio de tamaño: el aviso no sale dos veces ni cuenta dos veces → Tarea 6.
- Play falla o lanza una excepción al consultar: nada, ni aviso ni bloqueo → Tarea 4 y 6.
- Reloj del móvil que va hacia atrás (fecha anterior a `ultimoAviso`): no vuelve a avisar ese día → Tarea 1.
- `ultima` baja en el servidor (David rectifica): la memoria de una `ultima` distinta empieza de cero → Tarea 1.

## Estructura de archivos

- Crear `game/src/core/updatePolicy.ts` — lógica pura y memoria (`UPDATE_KEY`).
- Crear `game/src/systems/appUpdate.ts` — envoltorio del plugin y pieza falsa.
- Crear `game/src/systems/updateNotice.ts` — coordinador (momento seguro, aplazadas, estadísticas).
- Crear `game/src/ui/updateArrow.ts` — flecha hacia abajo en círculo (Canvas 2D).
- Crear `game/src/scenes/UpdateNoticeScene.ts` — ventana suave y pantalla de bloqueo.
- Modificar `core/community.ts` (+`actualizacion` en `CommunityStatus`), `systems/community.ts`, `core/back.ts`, `systems/platform.ts`, `main.ts`, `scenes/TitleScene.ts`, `systems/testHooks.ts`, `systems/events.ts`, `systems/analyticsEvents.ts`, `core/eventCatalog.ts`, `data/strings/*.ts`, `tools/matomo/resumen.mjs`.
- Modificar `server/app/src/Contenido.php`, `server/app/src/Estado.php` y sus tests.
- Pruebas: `game/tests/unit/updatePolicy.test.ts`, `appUpdate.test.ts`, `updateNotice.test.ts`, ampliar `community.test.ts`, `back.test.ts`, `analyticsEvents.test.ts`, `eventCatalog.test.ts`; `game/tests/e2e/actualizacion.spec.ts`; `server/tests/ContenidoTest.php`, `EstadoTest.php`.

---

### Tarea 1: Lógica pura de la política (`updatePolicy.ts`)

**Archivos:** crear `game/src/core/updatePolicy.ts`; probar en `game/tests/unit/updatePolicy.test.ts`.

**Interfaces:**
- Produce:
  ```ts
  export type UpdateKind = 'pequena' | 'grande' | 'rota';
  export interface UpdateKey { minima: number; ultima: number; grande: boolean }
  export interface UpdateMemory { ultima: number | null; aplazadas: number; ultimoAviso: string | null }
  export type UpdateDecision = { action: 'nada' } | { action: 'suave' | 'obligatoria'; kind: UpdateKind };
  export const UPDATE_KEY = 'zooesponji_v3_update';
  export const MAX_SOFT_SMALL = 3; export const MAX_SOFT_BIG = 2;
  export function parseUpdateKey(raw: unknown): UpdateKey | null;        // enteros ≥ 0, ultima ≥ minima, grande boolean (ausente = false)
  export function emptyUpdateMemory(): UpdateMemory;
  export function parseUpdateMemory(raw: string | null): UpdateMemory;  // nunca lanza
  export function decideUpdate(i: { code: number; key: UpdateKey | null; memory: UpdateMemory; today: string }): UpdateDecision;
  export function afterOffer(m: UpdateMemory, key: UpdateKey, today: string): UpdateMemory;   // anota ultimoAviso, y reinicia si cambió `ultima`
  export function afterLater(m: UpdateMemory, key: UpdateKey, today: string): UpdateMemory;   // aplazadas + 1
  export function isSafeMoment(active: readonly string[]): boolean;
  ```
- Consume: nada.

- [x] **Paso 1: escribir las pruebas que fallan** (un `it` por caso de la spec): al día (`code ≥ ultima`) → nada; pequeña → suave, y con `ultimoAviso === today` → nada, y con `aplazadas === 3` → nada; grande con 0 y 1 aplazadas → suave, con 2 → obligatoria, con `ultimoAviso === today` → nada (también la tercera); rota (`code < minima`) → obligatoria **aunque** `ultimoAviso === today`; memoria de otra `ultima` (más vieja o **más baja**) → empieza de cero; `key` nula, `ultima < minima`, números negativos o no enteros → nada; fecha de hoy anterior a `ultimoAviso` (reloj atrás) → nada; `parseUpdateMemory(null)`, texto roto y objeto con campos de tipo malo → `emptyUpdateMemory()` sin lanzar; `isSafeMoment(['Title'])` true, `['World']` true, `['World','Shop']`/`['World','Feed']`/`['World','Tutorial']`/`['World','Quit']`/`['World','Settings']`/`['World','AdOffer']`/`['World','PollNotice']` false.
- [x] **Paso 2:** `cd game; npx vitest run tests/unit/updatePolicy.test.ts` → FALLA (módulo no existe).
- [x] **Paso 3: implementar** `updatePolicy.ts` con las firmas de arriba (sin dependencias; días como `AAAA-MM-DD` comparados como texto).
- [x] **Paso 4:** la misma orden → PASA.
- [x] **Paso 5: commit** `feat(actualizacion): lógica pura de la política de avisos y su memoria`.

### Tarea 2: La clave `actualizacion` llega por `Community`

**Archivos:** modificar `game/src/core/community.ts` (`CommunityStatus`, `parseStatus`), `game/src/systems/community.ts`; ampliar `game/tests/unit/community.test.ts` y `communitySystem.test.ts`.

**Interfaces:**
- Consume: `parseUpdateKey` (Tarea 1).
- Produce: `CommunityStatus.actualizacion: UpdateKey | null`; `Community.liveUpdateKey(): UpdateKey | null` (la clave **solo** si esta sesión ya recibió respuesta válida, o sea `online`; nunca la copia guardada).

- [x] **Paso 1: pruebas que fallan:** `parseStatus` con clave válida la devuelve; sin clave → `null` y el resto igual que hoy; clave mal (`ultima` texto, negativa, `ultima < minima`, `grande: 1`) → `actualizacion: null` pero la votación y el muro se leen; **compatibilidad**: la lógica de `parseStatus` de la versión ya publicada (solo `hoy`, `ideas`, `votacion`, `muro`) sigue pasando con el campo nuevo presente; un guardado viejo (`parseMemory` con `last` sin la clave) se lee con `actualizacion: null`; `liveUpdateKey()` es `null` si el servidor no ha respondido (solo hay copia guardada) y devuelve la clave tras un `refresh()` bueno; tras un `refresh()` fallido vuelve a `null`.
- [x] **Paso 2:** `npx vitest run tests/unit/community.test.ts tests/unit/communitySystem.test.ts` → FALLA.
- [x] **Paso 3: implementar** el campo en el tipo y `parseStatus` (con `parseUpdateKey`) y `liveUpdateKey()` en `Community`.
- [x] **Paso 4:** misma orden → PASA; `npm run typecheck` limpio (hay literales de `CommunityStatus` en otras pruebas: añadirles `actualizacion: null`).
- [x] **Paso 5: commit** `feat(actualizacion): la clave del servidor entra en el estado de la comunidad`.

### Tarea 3: Servidor (`Contenido::validar` y `Estado::construir`)

**Archivos:** modificar `server/app/src/Contenido.php`, `server/app/src/Estado.php`; pruebas en `server/tests/ContenidoTest.php` y `EstadoTest.php`.

**Interfaces:**
- Produce: `Contenido::validar` devuelve también `'actualizacion' => ['minima'=>int,'ultima'=>int,'grande'=>bool] | null`; `Contenido::VACIO` lleva `'actualizacion' => null`; `Estado::construir` incluye `'actualizacion'` solo si no es `null` (así un `estado.php` sin la clave queda **idéntico** a hoy).

- [x] **Paso 1: pruebas PHPUnit que fallan:** clave válida; ausente → `null`; `minima` negativa → `InvalidArgumentException('actualizacion')`; `ultima < minima`; tipos mal (texto, `grande` no booleano, decimal); `grande` ausente → `false`; `Contenido::leer` con archivo roto conserva el muro y deja `actualizacion` en `null`; `Estado::construir` la devuelve cuando existe y **no añade la clave** cuando no existe (comparar con el array de hoy).
- [x] **Paso 2:** `cd server; php vendor/bin/phpunit tests/ContenidoTest.php tests/EstadoTest.php` (o el comando que dé `server/README.md`) → FALLA.
- [x] **Paso 3: implementar** (validación estricta de enteros ≥ 0; `array_key_exists` para distinguir ausente).
- [x] **Paso 4:** misma orden → PASA; luego la suite entera del servidor.
- [x] **Paso 5: commit** `feat(servidor): clave actualizacion en comunidad.json y en estado.php`.

### Tarea 4: Envoltorio de Play (`appUpdate.ts`)

**Archivos:** instalar `@capawesome/capacitor-app-update` en `game/` (`npm install`); crear `game/src/systems/appUpdate.ts`; probar en `game/tests/unit/appUpdate.test.ts`.

**Interfaces:**
- Produce:
  ```ts
  export interface PlayUpdateInfo { available: boolean; immediateAllowed: boolean; versionCode: number | null }
  export interface PlayUpdater {
    info(): Promise<PlayUpdateInfo>;                                  // nunca lanza: ante cualquier fallo, { available:false, immediateAllowed:false, versionCode:null }
    immediate(): Promise<'actualizada' | 'cancelada' | 'fallo'>;      // nunca lanza
  }
  export function createPlayUpdater(): PlayUpdater;                   // usa el plugin (solo Android nativo)
  export function setPlayUpdater(u: PlayUpdater | null): void;
  export function getPlayUpdater(): PlayUpdater | null;
  ```

- [x] **Paso 1: leer el README y los tipos reales del paquete instalado** (`node_modules/@capawesome/capacitor-app-update/README.md` y `dist/esm/definitions.d.ts`) y anotar los nombres exactos de `getAppUpdateInfo`, `performImmediateUpdate`, `updateAvailability`, `immediateUpdateAllowed`, el código de versión disponible y el resultado cuando el usuario cancela. Dejar la nota en la sección «Cómo quedó» de la spec.
- [x] **Paso 2: pruebas que fallan** con el plugin simulado (`vi.mock`): disponible + permitida → `available`/`immediateAllowed` true; «no hay actualización» → `available:false`; `immediateAllowed:false` → no permitido; el plugin lanza → informa de nada, sin lanzar; `immediate()` con éxito/cancelación/excepción → `'actualizada'`/`'cancelada'`/`'fallo'`.
- [x] **Paso 3:** `npx vitest run tests/unit/appUpdate.test.ts` → FALLA; **implementar**; PASA.
- [x] **Paso 4: reglas de R8 y Android** (hecho `cap sync`; el plugin no trae reglas propias; `check:aab` queda para cuando se compile el AAB): `npx cap sync android`; ver si el plugin necesita reglas en el archivo de R8 del proyecto (spec `2026-10-25-optimizacion-dex-r8`); ejecutar `npm run check:manifest` y `npm run check:aab` si no necesitan un AAB nuevo; apuntar el tamaño del plugin.
- [x] **Paso 5: commit** `feat(actualizacion): envoltorio del plugin de actualización de Play` (incluye `package.json`, `package-lock.json` y lo que cambie `cap sync`).

### Tarea 5: Escena, flecha, botón «atrás» y textos

**Archivos:** crear `game/src/ui/updateArrow.ts` y `game/src/scenes/UpdateNoticeScene.ts`; modificar `core/back.ts`, `systems/platform.ts`, `main.ts`, `data/strings/*.ts` (11 idiomas); probar en `tests/unit/back.test.ts`, `strings.test.ts` y una prueba de medidas de la flecha (`tests/unit/updateArrow.test.ts`).

**Interfaces:**
- Consume: `UpdateKind` (Tarea 1).
- Produce:
  ```ts
  export type UpdateNoticeMode = 'suave' | 'bloqueo';
  export interface UpdateNoticeData { mode: UpdateNoticeMode; kind: UpdateKind; onAccept: () => void; onLater: () => void }
  // UpdateNoticeScene ('UpdateNotice'): decline(): void (= «luego», solo en suave); retry(): void (= actualizar); yesPos()/noPos()/exitPos(): Vec | null
  export function drawUpdateArrow(size: number): HTMLCanvasElement;       // flecha hacia abajo dentro de un círculo
  // core/back.ts:  BackContext.updateNotice: 'none' | 'soft' | 'block';  BackAction gana nada nuevo:
  //   soft → 'close-ad' (equivale a «luego»), block → 'ask-quit' (la puerta de salida)
  ```
  Clave de texto: `update.title` («¡Hay versión nueva!»), una sola frase.

- [x] **Paso 1: pruebas que fallan:** `decideBack` con `updateNotice:'soft'` → `'close-ad'` incluso con tienda abierta; con `'block'` → `'ask-quit'` aun estando el diálogo de salir cerrado, y con el diálogo abierto sigue `'close-quit'`; `strings.test.ts` exige `update.title` en los 11 idiomas; la flecha devuelve un lienzo cuadrado con píxeles de dos colores distintos y no vacío.
- [x] **Paso 2:** `npx vitest run tests/unit/back.test.ts tests/unit/strings.test.ts tests/unit/updateArrow.test.ts` → FALLA.
- [x] **Paso 3: implementar** (modelo: `PollNoticeScene` y `AdOfferScene`): `suave` = panel con flecha, botón verde grande ✓ y botón pequeño con reloj («luego»); `bloqueo` = pantalla completa con la flecha grande que se pulsa para reintentar y una puerta pequeña «Salir» (abre `askQuit`). Reiniciar con el cambio de tamaño sin contar dos veces. `Platform.backAction`/`back` leen la escena `UpdateNotice` activa (`mode`) y la registran en `main.ts` **al final** de la lista (encima de todo salvo Rotate).
- [x] **Paso 4:** las tres pruebas → PASAN; `npm run typecheck`.
- [x] **Paso 5: commit** `feat(actualizacion): escena del aviso, flecha, manejo de «atrás» y textos en 11 idiomas`.

### Tarea 6: Coordinador y cableado (`updateNotice.ts`)

**Archivos:** crear `game/src/systems/updateNotice.ts`; modificar `TitleScene.ts`, `Platform` (al volver a primer plano), `main.ts`/instalación, `systems/testHooks.ts`; probar en `tests/unit/updateNotice.test.ts`.

**Interfaces:**
- Consume: `decideUpdate`, `afterOffer`, `afterLater`, `isSafeMoment`, `UPDATE_KEY` (T1); `Community.liveUpdateKey()` (T2); `PlayUpdater` (T4); escena `UpdateNotice` y `UpdateNoticeData` (T5).
- Produce:
  ```ts
  export interface UpdateNoticeDeps {
    native: boolean; store: KeyValueStore; events: EventBus<GameEvents>;
    community: () => { liveUpdateKey(): UpdateKey | null } | null;
    play: () => PlayUpdater | null; currentCode: () => number;
    activeScenes: () => string[]; show: (data: UpdateNoticeData) => void; today?: () => string;
  }
  export class UpdateNotice { constructor(d: UpdateNoticeDeps); start(): Promise<void>; check(): Promise<void> /* idempotente: no se solapa */ }
  export function installUpdateNotice(game: Phaser.Game): void;   // solo nativo; llama a check() en: título abierto, `community-updated`, vuelta a primer plano
  ```
  Reglas: `check()` sale sin hacer nada si no es nativo, no hay clave en vivo, el momento no es seguro o `play.info()` no dice `available && immediateAllowed` (y para el aviso suave basta `available`); si `decideUpdate` da `suave` → anota `afterOffer` y muestra; `obligatoria` → emite `update-forced`, llama `play.immediate()`; si da `cancelada`/`fallo` → emite `update-failed` y muestra `bloqueo`, cuyo botón vuelve a llamar a `immediate()`. «Actualizar» en la suave → `update-accepted` y `immediate()`; «luego»/atrás → `afterLater` y `update-later`.

- [x] **Paso 1: pruebas que fallan** (con Play, servidor y escenas falsos): no nativo → nada; sin respuesta del servidor esta sesión → nada; Play «no disponible» o «no permitido» → **nunca** bloquea ni avisa; Play lanza → nada; momento no seguro → nada y no consume aviso; suave: se anota el aviso y «luego» suma una aplazada; dos `check()` seguidos → un solo aviso; grande: dos «luego» en días distintos y a la tercera `immediate()`; cancelar la obligatoria → `bloqueo` y el botón reintenta; rota → `immediate()` ya; título reiniciado por tamaño → no cuenta dos veces.
- [x] **Paso 2:** `npx vitest run tests/unit/updateNotice.test.ts` → FALLA; **implementar**; PASA.
- [x] **Paso 3: cableado y ganchos de prueba** (`window.__ZOO__`): `updateFake({ available, allowed, versionCode, result })` (monta la pieza falsa, marca «nativo» y arranca el coordinador con la memoria de `store`), `updateCheck()`, `updateState()`.
- [x] **Paso 4:** `npm run typecheck`, `npm test` (toda la suite unitaria) → PASAN.
- [x] **Paso 5: commit** `feat(actualizacion): coordinador del aviso con momento seguro y Play`.

### Tarea 7: Estadísticas de Matomo (los 7 pasos de `game/README.md`)

**Archivos:** `systems/events.ts`, `systems/analyticsEvents.ts`, `core/eventCatalog.ts`, la spec (tabla ya escrita), `tests/unit/eventCatalog.test.ts` (añadir `2026-11-19-actualizacion-obligatoria-design.md` a su lista), `tests/unit/analyticsEvents.test.ts`, `tools/matomo/resumen.mjs`, escenarios de IA.

**Interfaces:**
- Produce en `GameEvents`: `'update-offered': { kind: UpdateKind }`, `'update-accepted': { kind }`, `'update-later': { kind; deferred: number }`, `'update-forced': { kind: 'grande' | 'rota' }`, `'update-failed': { kind }`. Categoría `actualizacion` con las acciones `actualizacion-ofrece|acepta|luego|obliga|fallo`; nombre = tipo, valor de `luego` = veces aplazadas ya.

- [x] **Paso 1: pruebas que fallan** en `analyticsEvents.test.ts` (cada evento, con su nombre y valor) y en `eventCatalog.test.ts` (acciones únicas y escritas en la spec).
- [x] **Paso 2:** `npx vitest run tests/unit/analyticsEvents.test.ts tests/unit/eventCatalog.test.ts` → FALLA; implementar los avisos en el bus (emitidos por el coordinador), traducciones y `CATALOG.actualizacion`; PASA.
- [x] **Paso 3:** apartado «Actualizaciones» en `tools/matomo/resumen.mjs` (ofrecidos, aceptados, aplazados, obligados, fallos, por tipo) y `node tools/matomo/resumen.mjs` para ver que sale sin errores con los datos que haya (sin mostrar ningún secreto). Comprobar que los escenarios de jugadores con IA siguen con `stats: false` (`tests/unit/iaEscenarios.test.ts`).
- [x] **Paso 4: commit** `feat(actualizacion): estadísticas de Matomo del aviso (categoría actualizacion)`.

### Tarea 8: Pruebas de juego (Playwright, Play falso)

**Archivos:** crear `game/tests/e2e/actualizacion.spec.ts` (modelo: `board.spec.ts`: servidor falso con `page.route`, estado con la clave `actualizacion`).

- [x] **Paso 1: escribir las pruebas** (una por caso, cada una arranca con memoria limpia): sale en el título con la pequeña; «luego» y «atrás» (llamar a `platform.back`) aplazan y se puede jugar; grande: dos aplazadas en días distintos (hook de reloj) y a la tercera `immediate()` y, si se cancela, el bloqueo; el bloqueo tiene salida por la puerta (abre «¿Salir?»); cancelar la actualización vuelve al bloqueo; no sale con una ventana abierta (tienda) ni dando de comer; sin conexión (servidor falso caído) no sale; Play «no permitido» → no sale ni bloquea; pantalla baja apaisada (667×375 y 568×320); árabe de derecha a izquierda; los 11 idiomas caben (comparar con el ancho del panel).
- [x] **Paso 2:** `cd game; npx playwright test tests/e2e/actualizacion.spec.ts --workers=1` → al principio FALLAN lo que dependa de arreglos; corregir **código** (cada fallo con su prueba primero) hasta PASAR. Capturas para David: guardarlas **fuera del repo** (carpeta de scratchpad) para los casos visuales (suave, bloqueo, árabe, apaisado bajo).
- [x] **Paso 3:** como regresión, `npx playwright test tests/e2e/board.spec.ts tests/e2e/ads.spec.ts --workers=1` (de una en una; nunca varios navegadores).
- [x] **Paso 4: commit** `test(actualizacion): pruebas de juego con Play falso`.

### Tarea 9: Documentación al día

- [x] **Paso 1:** `game/README.md`: apartado nuevo «Avisos de actualización» (cómo cambiar `actualizacion` en `comunidad.json`, los topes, ganchos `__ZOO__`, aviso de que no se ve en `npm run dev`), y la fila de pruebas de juego; `server/README.md`: la clave `actualizacion` en `comunidad.json` y `estado.php`; `README.md` raíz: estado y hoja de ruta (queda pendiente probarlo en pista interna de Play, leer la política de «Diseñado para Familias», subir `ultima` y lanzar el aviso de Play Console con permiso de David).
- [x] **Paso 2:** spec: «Cómo quedó» (nombres reales del plugin, tamaño, decisiones y lo que **no** está verificado: lo visual, la prueba en pista interna y la política de Familias) y estado; marcar todas las casillas de este plan.
- [x] **Paso 3: commit** `docs(actualizacion): README, servidor, spec y plan al día`.
- [ ] **Paso 4:** pasar a David las capturas y los comandos que le toquen (PowerShell, al final del mensaje); no dar la tarea por terminada hasta su visto bueno visual.
