# Tutorial de la limpieza y de la clínica — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (David trabaja sin subagentes) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Al desbloquear la limpieza (primer recinto de barro) o la clínica, al salir de la tienda sale un aviso como el de la primera vez y, si el niño acepta, una lección guiada con la mano; el botón Aprender del menú encadena todas las lecciones desbloqueadas; todo medido en Matomo.

**Architecture:** La lógica pura va a `core/` (qué avisos tocan, qué animal se usa para practicar, máquinas de pasos de cada lección) con pruebas unitarias. `TutorialScene` pasa de una lección fija a una **cola de lecciones** (`inicio`, `limpieza`, `clinica`), con un proveedor de gestos por lección y el mismo dibujo de mano/anillo/bocadillo. `TutorialOfferScene` recibe la lección y pinta su dibujo y su frase. `WorldScene` lanza los avisos pendientes al volver de la tienda.

**Tech Stack:** TypeScript, Phaser 3, Vite, Vitest (unit), Playwright (e2e).

**Spec:** [docs/superpowers/specs/2026-11-10-tutorial-limpieza-clinica-design.md](../specs/2026-11-10-tutorial-limpieza-clinica-design.md)

## Global Constraints

- Rama `feat/plaza-recintos-recorrido`. Commits con `git add` + `git commit` juntos y mirar `HEAD` después (puede haber otra sesión trabajando).
- Las pruebas locales las lanza **David**: cada paso de «Run» es un comando para él, en PowerShell, con el resultado esperado. Desde `game/`.
- Textos nuevos en los **11 idiomas** (`src/data/strings/*.ts`), con exactamente las mismas claves que `es.ts`. Las frases de aviso, **escritas ya en MAYÚSCULAS** en el fichero (no se transforman en código).
- Frases aprobadas (es): limpieza «¡TUS ANIMALES SE MANCHAN DE BARRO! ¿APRENDEMOS A BAÑARLOS?»; clínica «¡YA TIENES CLÍNICA! ¿APRENDEMOS A CURAR?».
- Matomo: nombres en español, **ninguna acción se repite en todo el catálogo**, cruces ya hechos en el nombre con `part(...)`.
- Lo ensuciado o enfermado para la lección **no** emite `puddle-muddy`, `animal-soiled` ni `animal-sick`.
- La lección de inicio no cambia: mismos pasos y mismos nombres de paso en Matomo (`moverse`, `tocar-animal`, `arrastrar-comida`, `monedas`, `tienda`).
- Al cerrar: README, estado de la spec («Cómo quedó») y este plan al día.

## Review Focus

1. **Compra las dos cosas en la misma visita** → al salir, aviso de limpieza; al acabar o saltar su lección, aviso de clínica, sin volver a la tienda. (Task 7, prueba e2e.)
2. **Solo tiene elefantes asiáticos** (ni cerdos ni africanos) → la lección ensucia a un elefante asiático, nunca manda a un recinto cerrado. (Task 2, prueba unitaria.)
3. **El animal elegido para limpiar está malito** → `soil` no lo mancharía: se elige otro del mismo recinto o de otro abierto. (Task 2.)
4. **Ya hay 2 enfermos en el zoo** → la lección de clínica usa uno de ellos (`ya-estaba`), no enferma a un tercero. **No hay a quién enfermar** → la lección se salta y sigue la cola. (Task 2 y Task 6.)
5. **Cierra la comida, la limpieza o la clínica a medias** → la mano vuelve al paso que toca; la ✕ corta toda la cola. (Task 3, pruebas unitarias.)

---

### Task 1: Guardar qué avisos han salido

**Files:**
- Modify: `src/core/save.ts` (`TutorialProgress`, `parseTutorial`, valores por defecto en las líneas ~152 y ~232)
- Modify: `src/systems/session.ts:192-196` (`markTutorialOffered`)
- Modify: callers de `markTutorialOffered` (`src/scenes/TutorialOfferScene.ts`)
- Test: `tests/unit/save.test.ts`, `tests/unit/session.test.ts`

**Interfaces:**
- Produces: `type LessonId = 'inicio' | 'limpieza' | 'clinica'` exportado desde `src/core/tutorial.ts` (se crea aquí, lo usan todas las tareas).
- Produces: `interface TutorialProgress { offered: boolean; cleanOffered: boolean; clinicOffered: boolean }`.
- Produces: `session.markLessonOffered(lesson: LessonId): Promise<void>` (sustituye a `markTutorialOffered`; `'inicio'` → `offered`).

- [ ] **Step 1: Pruebas que fallan**
  - `save.test.ts` › «una partida de antes sin cleanOffered ni clinicOffered los lee como false»: `parse({ tutorial: { offered: true } })` → `{ offered: true, cleanOffered: false, clinicOffered: false }`.
  - `save.test.ts` › «guarda y lee los tres avisos»: ida y vuelta con `{ offered: true, cleanOffered: true, clinicOffered: false }`.
  - `session.test.ts` › «markLessonOffered marca solo el de esa lección»: tras `markLessonOffered('limpieza')`, `tutorial` es `{ offered: false, cleanOffered: true, clinicOffered: false }` y queda escrito.
- [ ] **Step 2:** David lanza `npx vitest run tests/unit/save.test.ts tests/unit/session.test.ts` → FALLAN.
- [ ] **Step 3: Implementar** los campos, `parseTutorial` (cada campo `=== true`), los valores por defecto a `false`, `markLessonOffered` (no escribe si ya estaba a `true`) y cambiar el caller.
- [ ] **Step 4:** el mismo comando → PASAN. `npx tsc --noEmit` → sin errores.
- [ ] **Step 5: Commit** `feat(tutorial): guardar los avisos de limpieza y clínica`.

### Task 2: Qué avisos tocan y con qué animal se practica

**Files:**
- Create: `src/core/lessons.ts`
- Test: `tests/unit/lessons.test.ts`

**Interfaces:**
- Consumes: `LessonId`, `TutorialProgress` (Task 1); `MUD_PENS`, `MudPenId`, `CareState`, `isDirty`, `isSick`, `sickCandidates`, `makeMuddy`, `soil`, `fallSick` de `core/care.ts`; `isPenOpen`, `GameState` de `core/economy.ts`; `residentsIn` de `data/pens`.
- Produces:
  - `pendingLessonOffers(state: GameState, progress: TutorialProgress): ('limpieza' | 'clinica')[]` — `limpieza` si algún `MUD_PENS` está abierto y `!cleanOffered`; `clinica` si `state.clinic` y `!clinicOffered`. Siempre en ese orden.
  - `menuLessons(state: GameState): LessonId[]` — `['inicio']` + `limpieza` si hay recinto de barro abierto + `clinica` si `state.clinic`.
  - `type PracticeTarget = { residentId: string; penId: PenId; already: boolean }`.
  - `cleanPractice(care: CareState, state: GameState): { target: PracticeTarget; care: CareState } | null` — primero un sucio que ya exista en un recinto abierto (`already: true`, `care` igual). Si no, el primer recinto abierto de `MUD_PENS` (en su orden) que tenga un residente no malito: `makeMuddy` + `soil` sobre él (`already: false`). `null` si no hay ninguno.
  - `sickPractice(care: CareState, state: GameState): { target: PracticeTarget; care: CareState } | null` — primero un enfermo que ya exista (`already: true`). Si no, `sickCandidates(care, state)[0]` con `fallSick` (`already: false`). `null` si no hay candidato.

- [ ] **Step 1: Pruebas que fallan** (`lessons.test.ts`):
  - `pendingLessonOffers`: sin recintos de barro ni clínica → `[]`; con `elefantes-asiaticos` abierto → `['limpieza']`; con eso y `clinic: true` → `['limpieza', 'clinica']`; con `cleanOffered: true` y clínica → `['clinica']`.
  - `menuLessons`: zoo de inicio → `['inicio']`; con cerdos y clínica → `['inicio', 'limpieza', 'clinica']`.
  - `cleanPractice` «solo elefantes asiáticos»: el `penId` es `elefantes-asiaticos`, el residente es de ese recinto, `care.muddy` lo incluye y `care.dirty` contiene al residente.
  - `cleanPractice` «ya hay uno sucio»: devuelve ese con `already: true` y el mismo objeto `care`.
  - `cleanPractice` «el primero está malito»: elige otro residente que no está en `care.sick`.
  - `cleanPractice` sin recintos de barro abiertos → `null`.
  - `sickPractice` «ya hay 2 enfermos» → uno de ellos con `already: true`, `care.sick.length` sigue en 2.
  - `sickPractice` sin enfermos → `care.sick` tiene 1, `already: false`.
- [ ] **Step 2:** `npx vitest run tests/unit/lessons.test.ts` → FALLAN.
- [ ] **Step 3: Implementar** `src/core/lessons.ts` (puro, sin Phaser ni bus).
- [ ] **Step 4:** el mismo comando → PASAN.
- [ ] **Step 5: Commit** `feat(tutorial): qué lecciones tocan y con qué animal se practica`.

### Task 3: Pasos de las lecciones de limpieza y clínica

**Files:**
- Modify: `src/core/tutorial.ts`
- Test: `tests/unit/tutorial.test.ts`

**Interfaces:**
- Produces:
  - `CLEAN_LESSON_STEPS = ['tap-dirty', 'cacahuete', 'cepillo', 'jabon', 'agua', 'toalla'] as const` y `type CleanLessonStep`.
  - `CLINIC_LESSON_STEPS = ['tap-sick', 'drag-food', 'cross', 'bed', 'back-to-clinic', 'cure'] as const` y `type ClinicLessonStep`.
  - `type LessonEvent = { type: 'clean-opened' } | { type: 'clean-step'; step: CleanStep | 'hecho' } | { type: 'clean-closed'; done: boolean } | { type: 'feed-opened' } | { type: 'feed-closed' } | { type: 'sick-refused' } | { type: 'clinic-requested' } | { type: 'clinic-opened' } | { type: 'clinic-closed' } | { type: 'cure-opened' } | { type: 'cure-closed'; done: boolean }`.
  - `advanceClean(step: CleanLessonStep, event: LessonEvent): CleanLessonStep | 'done'`
  - `advanceClinic(step: ClinicLessonStep, event: LessonEvent): ClinicLessonStep | 'done'`
  - `lessonStepName(lesson: LessonId, step: string): string` — `inicio` devuelve los nombres de ahora (`tutorialStepName` se mueve aquí desde `analyticsEvents.ts`). `limpieza`: `tap-dirty`→`limpieza/tocar-animal`, y el resto `limpieza/<paso>`. `clinica`: `tap-sick`→`clinica/tocar-animal`, `drag-food`→`clinica/comida`, `cross`→`clinica/cruz`, `bed`→`clinica/cama`, `back-to-clinic`→`clinica/volver`, `cure`→`clinica/curar`.

Transiciones (lo que no aparece deja el paso igual):

| Lección | Paso | Evento | Siguiente |
|---|---|---|---|
| limpieza | `tap-dirty` | `clean-opened` | `cacahuete` |
| limpieza | `cacahuete`…`toalla` | `clean-step` con `s` ≠ paso actual | `s` (o `done` si `s` = `hecho`) |
| limpieza | `cacahuete`…`toalla` | `clean-closed` `done: true` | `done` |
| limpieza | `cacahuete`…`toalla` | `clean-closed` `done: false` | `tap-dirty` |
| clínica | `tap-sick` | `feed-opened` | `drag-food` |
| clínica | `drag-food` | `sick-refused` | `cross` |
| clínica | `drag-food`, `cross` | `feed-closed` | `tap-sick` |
| clínica | `cross` | `clinic-requested` | `bed` |
| clínica | `bed` | `cure-opened` | `cure` |
| clínica | `bed` | `clinic-closed` | `back-to-clinic` |
| clínica | `back-to-clinic` | `clinic-opened` | `bed` |
| clínica | `cure` | `cure-closed` `done: true` | `done` |
| clínica | `cure` | `cure-closed` `done: false` | `bed` |

- [ ] **Step 1: Pruebas que fallan:** un `it.each` por tabla (cada fila de arriba), «lo que no toca deja el paso igual» (`advanceClean('jabon', { type: 'feed-opened' })` → `'jabon'`; `advanceClinic('bed', { type: 'sick-refused' })` → `'bed'`), y `lessonStepName` (`('inicio','move')`→`'moverse'`, `('limpieza','tap-dirty')`→`'limpieza/tocar-animal'`, `('limpieza','cepillo')`→`'limpieza/cepillo'`, `('clinica','back-to-clinic')`→`'clinica/volver'`).
- [ ] **Step 2:** `npx vitest run tests/unit/tutorial.test.ts` → FALLAN las nuevas; las de antes siguen pasando.
- [ ] **Step 3: Implementar** en `core/tutorial.ts`. `advance` (inicio) no se toca.
- [ ] **Step 4:** el mismo comando → PASAN todas.
- [ ] **Step 5: Commit** `feat(tutorial): pasos de las lecciones de limpieza y clínica`.

### Task 4: Eventos y Matomo

**Files:**
- Modify: `src/systems/events.ts:103-108`
- Modify: `src/core/eventCatalog.ts` (categoría `tutorial`)
- Modify: `src/systems/analyticsEvents.ts:65-69, 165-176`
- Modify: emisores de los eventos cambiados (`TutorialOfferScene.ts`, `TutorialScene.ts`) para que compilen con `lesson: 'inicio'` (las tareas 6 y 7 los generalizan).
- Test: `tests/unit/analyticsEvents.test.ts`, `tests/unit/eventCatalog.test.ts`

**Interfaces:**
- Produces (payloads del bus):
  - `'tutorial-offered': { lesson: LessonId }`
  - `'tutorial-answered': { lesson: LessonId; learn: boolean }`
  - `'tutorial-started': { from: 'aviso' | 'menu'; lesson: LessonId }`
  - `'tutorial-step': { lesson: LessonId; step: string }`
  - `'tutorial-ended': { lesson: LessonId; done: boolean; step: string }`
  - `'tutorial-prepared': { lesson: 'limpieza' | 'clinica'; residentId: string; already: boolean }` (nuevo)
- Matomo (categoría `tutorial`):
  - `tutorial-ofrece`, `tutorial-aprende`, `tutorial-salta`, `tutorial-menu`, `tutorial-fin` → nombre = `lesson`.
  - `tutorial-paso`, `tutorial-deja` → nombre = `lessonStepName(lesson, step)`; valor = segundos desde que empezó **esa lección**.
  - `tutorial-fin` → valor = segundos de esa lección.
  - `tutorial-prepara` (nueva en `CATALOG.tutorial`) → nombre `part(lesson, residentName(residentId))` si `!already`, o `part(lesson, 'ya-estaba')`.

- [ ] **Step 1: Pruebas que fallan:** actualizar la prueba de tutorial existente a los nuevos payloads (`'tutorial | tutorial-ofrece | inicio'`, `'tutorial | tutorial-fin | inicio'`, pasos de inicio sin cambiar), y una nueva «lección de limpieza: pasos con su lección delante, segundos de la lección»: `tutorial-started {from:'aviso', lesson:'limpieza'}`, +5 s, `tutorial-step {lesson:'limpieza', step:'cepillo'}` → `'tutorial | tutorial-paso | limpieza/cepillo'` con valor 5; `tutorial-prepared {lesson:'limpieza', residentId:<un cerdo>, already:false}` → `'tutorial | tutorial-prepara | limpieza/cerdos/<nombre>'`; con `already:true` → `'tutorial | tutorial-prepara | limpieza/ya-estaba'`. `eventCatalog.test.ts` sigue exigiendo acciones únicas (debe pasar con la nueva).
- [ ] **Step 2:** `npx vitest run tests/unit/analyticsEvents.test.ts tests/unit/eventCatalog.test.ts` → FALLAN.
- [ ] **Step 3: Implementar.** `tutorialAt` sigue siendo uno: se reinicia en cada `tutorial-started`.
- [ ] **Step 4:** el mismo comando → PASAN; `npx tsc --noEmit` limpio.
- [ ] **Step 5: Commit** `feat(estadisticas): lecciones de limpieza y clínica en Matomo`.

### Task 5: Textos de los avisos en 11 idiomas

**Files:**
- Modify: `src/data/strings/{es,en,fr,it,pt-PT,pt-BR,ru,ar,hi,ja,zh}.ts`
- Test: `tests/unit/strings.test.ts` (ya exige las mismas claves que `es`)

**Interfaces:**
- Produces: claves `'lesson.clean.offer'` y `'lesson.clinic.offer'`.

- [ ] **Step 1:** añadir las dos claves en `es.ts` con las frases aprobadas (Global Constraints).
- [ ] **Step 2:** `npx vitest run tests/unit/strings.test.ts` → FALLA («mismas claves que el español»).
- [ ] **Step 3:** traducir a los otros 10 idiomas, en mayúsculas donde el alfabeto las tiene, con el mismo tono infantil.
- [ ] **Step 4:** el mismo comando → PASA.
- [ ] **Step 5: Commit** `feat(tutorial): frases de los avisos de limpieza y clínica`.

### Task 6: Aviso por lección

**Files:**
- Modify: `src/scenes/TutorialOfferScene.ts`
- Modify: `src/systems/testHooks.ts` (+ su implementación)

**Interfaces:**
- Consumes: `markLessonOffered` (Task 1), eventos (Task 4), claves (Task 5).
- Produces: `interface TutorialOfferSceneData { lesson?: LessonId }` (por defecto `'inicio'`). Al terminar: `markLessonOffered(lesson)`, `tutorial-answered {lesson, learn}`, reanuda World con `{ from: 'notice' }` y, si aprende, lanza `Tutorial` con `{ from: 'aviso', lessons: [lesson] }`.
- Produces (pruebas): `tutorialOfferLesson(): LessonId | null` en `window.__ZOO__`.

- [ ] **Step 1: Implementar.** `inicio` queda como ahora (sin frase). `limpieza`: dibujo de un cerdo con manchas (la textura del cerdo de `cerdos` con las manchas que ya usa el mapa, o 🐷 si no está) y la mano 👆; `clinica`: `addRedCross` y la mano. Debajo del dibujo, la frase con `t('lesson.clean.offer' | 'lesson.clinic.offer')`, centrada y ajustada al ancho del panel, sin tapar los botones.
- [ ] **Step 2:** `npx tsc --noEmit` limpio; `npx vitest run` todo en verde.
- [ ] **Step 3: Commit** `feat(tutorial): aviso de la limpieza y de la clínica`.

### Task 7: La cola de lecciones en el tutorial

**Files:**
- Modify: `src/scenes/TutorialScene.ts`
- Modify: `src/scenes/WorldScene.ts` (API para la mano)
- Modify: `src/scenes/SettingsScene.ts:275-282` (botón Aprender)
- Modify: `src/systems/testHooks.ts` (+ implementación)

**Interfaces:**
- Consumes: `cleanPractice`, `sickPractice`, `menuLessons` (Task 2); `advanceClean`, `advanceClinic`, `CLEAN_LESSON_STEPS`, `CLINIC_LESSON_STEPS` (Task 3); eventos (Task 4); `CleanScene.state()` / `targetsOnScreen()`, `FeedScene.targetsOnScreen()` / `crossScreenPos()`, `ClinicScene.bedResidents()` / `bedScreenPos(i)`, `CureScene.targetsOnScreen()`, `HudScene.clinicButtonPos()`.
- Produces:
  - `TutorialSceneData { from?: 'aviso' | 'menu'; lessons?: LessonId[] }` (por defecto `['inicio']`).
  - `WorldScene.residentScreen(residentId: string): Vec | null` — dónde está ese residente en pantalla (puede salirse; la mano usa el bocadillo del borde).
  - Pruebas: `tutorialLesson(): LessonId | null` en `window.__ZOO__`; `tutorialStep()` sigue devolviendo el paso.

Comportamiento:
- Al empezar cada lección: `tutorial-started {from, lesson}`. Para `limpieza`/`clinica`, se prepara con `cleanPractice`/`sickPractice` sobre `getSession().care` y `state`; si cambia, `session.setCare(next)` (emite `care-changed`, no los eventos de barro ni de enfermedad) y `tutorial-prepared`. Si devuelve `null`, la lección se salta (sin `tutorial-started`) y se pasa a la siguiente.
- El residente de la práctica se guarda en la escena: los gestos lo señalan a él.
- Gestos de **limpieza**: `tap-dirty` → toque en `world.residentScreen(id)`; pasos de herramienta → arrastre desde `CleanScene.targetsOnScreen().tool` hasta `.animal`, con un vaivén al final (frotar). Cada `update`, se lee `CleanScene.state().step` y, si cambió, se manda `clean-step`.
- Gestos de **clínica**: `tap-sick` → toque en el residente; `drag-food` → arrastre de `goodFood(especie)` hasta el animal (`FeedScene.targetsOnScreen()`); `cross` → toque en `FeedScene.crossScreenPos()`; `bed` → toque en `ClinicScene.bedScreenPos(i)` de la cama de ese residente (`null` mientras la clínica no está a la vista: la cuidadora va andando sola); `back-to-clinic` → toque en `HudScene.clinicButtonPos()` (ui); `cure` → arrastre de una medicina de `CureScene.targetsOnScreen().medicines` hasta el animal.
- Al acabar una lección: `tutorial-ended {lesson, done: true}` y la siguiente de la cola empieza sin pausa. La ✕: `tutorial-ended {lesson, done: false, step}` y se para toda la cola.
- Escuchas nuevas del bus para la máquina: `clean-opened`, `clean-closed`, `sick-refused`, `clinic-requested`, `clinic-opened`, `clinic-closed`, `cure-opened`, `cure-closed` (más las que ya tiene).
- La escena sigue por encima de todas las demás (también de `Clean`, `Clinic` y `Cure`). La ✕ se esconde también con `Clean` y `Cure` abiertas (tienen la suya).
- Ajustes › Aprender: `this.scene.launch('Tutorial', { from: 'menu', lessons: menuLessons(getSession().state) })`.

- [ ] **Step 1: Implementar** `residentScreen` en World y la cola, preparación y gestos en `TutorialScene`. Si los gestos por lección hacen crecer mucho el fichero, se pueden sacar a `src/scenes/lessonGestures.ts` (funciones `(scene, lesson, step, residentId) => Gesture | null`).
- [ ] **Step 2:** cambiar el botón Aprender de Ajustes.
- [ ] **Step 3:** `npx tsc --noEmit` limpio; `npx vitest run` en verde; `npx playwright test tests/e2e/tutorial.spec.ts` sigue pasando (lección de inicio igual).
- [ ] **Step 4: Commit** `feat(tutorial): lecciones de limpieza y clínica guiadas con la mano`.

### Task 8: Avisos al salir de la tienda

**Files:**
- Modify: `src/scenes/WorldScene.ts` (`onResume`, `maybeTutorialOffer`, escuchas en `create`)
- Create: `tests/e2e/lecciones.spec.ts`

**Interfaces:**
- Consumes: `pendingLessonOffers` (Task 2), `TutorialOfferSceneData` (Task 6), hooks `buy`, `addCoins`, `tutorialOfferPos`, `tutorialOfferLesson`, `tutorialLesson`, `tutorialStep` (Tasks 6-7).
- Produces: `WorldScene.maybeLessonOffer(): boolean` (privado).

Comportamiento:
- En `onResume` con `from === 'shop'`: se marca `lessonOffersArmed = true` y se llama a `maybeLessonOffer()`. Si lanza un aviso, **no** se ofrece anuncio ni se busca otro aviso en esta vuelta.
- `maybeLessonOffer()`: si `lessonOffersArmed`, no hay otro panel (`tutorialRunning()`, `AdOffer`, `PollNotice`) y `pendingLessonOffers(state, tutorial)` no está vacío → pausa World y lanza `TutorialOffer` con `{ lesson: pendientes[0] }`. Si la lista está vacía, `lessonOffersArmed = false`.
- Al acabar una lección o saltar su aviso (`tutorial-ended` de la última lección de la cola, o `tutorial-answered {learn: false}`), World llama otra vez a `maybeLessonOffer()` tras `NOTICE_MS`: así sale el de la clínica justo después del de la limpieza.
- El aviso de la primera vez (`maybeTutorialOffer`) tiene prioridad: si sale ese, el de la lección espera a la próxima salida de la tienda.

- [ ] **Step 1: Prueba e2e que falla** (`lecciones.spec.ts`, con `?sin-tutorial` y saltando el aviso de inicio igual que `shop.spec.ts`):
  - «comprar elefantes asiáticos: al salir de la tienda, aviso de limpieza; Aprender lleva a un elefante asiático sucio y la mano pasa por los 5 pasos»: `addCoins` + `buy('elefantes-asiaticos')`, abrir y cerrar la tienda, esperar `tutorialOfferLesson() === 'limpieza'`, tocar Aprender, comprobar `tutorialLesson() === 'limpieza'`, `tutorialStep() === 'tap-dirty'` y que la mano se ve.
  - «comprar elefantes y clínica en la misma visita: limpieza primero, y al saltarla, clínica».
  - «en la tienda no sale ningún aviso»: tras `buy`, con la tienda abierta, `tutorialOfferLesson()` es `null`.
  - «quien ya tenía elefantes de antes: aviso al salir de la tienda sin comprar nada».
  - «Aprender del menú con cerdos y clínica: inicio, limpieza y clínica seguidas» (comprobando `tutorialLesson()` al cambiar).
- [ ] **Step 2:** `npx playwright test tests/e2e/lecciones.spec.ts` → FALLAN.
- [ ] **Step 3: Implementar** lo de arriba en `WorldScene`.
- [ ] **Step 4:** el mismo comando → PASAN; `npx playwright test tests/e2e/tutorial.spec.ts tests/e2e/shop.spec.ts tests/e2e/cuidados.spec.ts` siguen pasando.
- [ ] **Step 5: Commit** `feat(tutorial): avisos de limpieza y clínica al salir de la tienda`.

### Task 9: Probarlo jugando y dejar los papeles al día

**Files:**
- Modify: `docs/superpowers/specs/2026-11-10-tutorial-limpieza-clinica-design.md` (sección nueva «Cómo quedó al construirlo»: nombres de paso de clínica `clinica/comida` y `clinica/volver` añadidos, que el animal sale del primer recinto de barro abierto y no necesariamente del recién comprado, que no se guarda una lista de «pendientes» porque se deduce de lo que tiene abierto y de los avisos ya salidos, y cualquier otra cosa que cambie)
- Modify: `README.md`, `game/README.md` (tutorial y Matomo)
- Modify: este plan (casillas marcadas)

- [ ] **Step 1:** David juega en `npm run dev` con una partida nueva: compra cerdos, sale de la tienda, hace la lección de limpieza entera; compra la clínica, sale, hace la de clínica; luego Ajustes › Aprender. Resultado esperado: avisos en mayúsculas, la mano lleva a cada sitio y no se queda colgada en ningún paso.
- [ ] **Step 2:** `npm run build` → sin errores.
- [ ] **Step 3:** actualizar los documentos.
- [ ] **Step 4: Commit** `docs: tutorial de limpieza y clínica terminado`.
