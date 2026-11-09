# Cerdos, limpieza y clínica — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Nota de David: en este proyecto se trabaja inline, sin subagentes (`executing-plans`).

**Goal:** Añadir el recinto de cerdos, el charco de barro con limpieza de 5 pasos (cerdos y los dos tipos de elefante) y la clínica donde se curan los animales enfermos.

**Architecture:** Toda la lógica nueva (estado de suciedad, enfermedad, pasos de limpieza, temporizadores) va en módulos puros de `game/src/core/`, con pruebas unitarias, y se guarda en la partida junto al resto. Las escenas nuevas (`CleanScene`, `ClinicScene`, `CureScene`) copian la forma de `FeedScene` y `ShopScene`. Todo se pinta con emojis y gráficos procedurales (el juego ya funciona sin arte); el arte de píxeles es una tarea final opcional.

**Tech Stack:** TypeScript, Phaser 3, Vite, Vitest (`npm test`), Playwright (`npm run test:e2e`), mapas Tiled generados por scripts de `game/scripts/`.

**Spec:** `docs/superpowers/specs/2026-11-09-cerdos-limpieza-clinica-design.md` (léela entera antes de empezar). Todos los comandos se lanzan desde `C:\Projects\games\zooesponji\game`.

## Global Constraints

- Precios: recinto de cerdos **150** (incluye el primer cerdo), cerdo extra **50**, máximo **5 cerdos**, clínica **650**.
- Monedas del cerdo por comida: **4** normal y **6** especial. Limpiar y curar dan **las mismas monedas que dar de comer** (`ANIMALS[species].coins.come`).
- Orden en la tienda (`PEN_IDS`): `cerdos` entre `ovejas` y `establo`. La clínica se ofrece entre los pingüinos (600) y la sabana (900) por precio.
- Charco: pasa a barro tras un tiempo aleatorio de **2 a 5 minutos** de juego. Recintos con charco: `cerdos`, `elefantes-africanos`, `elefantes-asiaticos`.
- Limpieza, en este orden: crema de cacahuete, cepillo, jabón, agua tibia con manguera en piscina, toalla. En el cepillo el animal gira solo: frente, lateral, otro lateral, culete. Solo está activo el paso que toca; los demás se ven desactivados. El primer paso lleva un texto en MAYÚSCULAS que explica por qué.
- **Máximo 2 enfermos en todo el parque y nunca 2 en el mismo recinto.** Solo enferman animales cuando la clínica está comprada.
- Sin castigo: nadie pierde monedas ni muere por estar sucio o enfermo.
- Todo texto nuevo, en los **11 idiomas** de `src/data/strings/` (`ar, en, es, fr, hi, it, ja, pt-BR, pt-PT, ru, zh`). `tests/unit/strings.test.ts` exige las mismas claves en todos.
- **Caminos y decoración del zoo: misma armonía que el resto** (David, 2026-11-09). Si se añade o alarga algún camino, hay que seguir las pautas que ya tiene el script `make-zoo-map.mjs`: las farolas se reparten solas por los caminos (donde no hay ninguna a 7 casillas se pone una en el césped de al lado, fuera de los recintos, lejos del muro y sin pegarse a otro adorno), cada recinto lleva su cartel junto a la puerta, y el parque usa los mismos árboles, arbustos, bancos y adornos que los demás. Revisa también los commits recientes de farolas (`git log --oneline -- scripts/make-zoo-map.mjs`) y los comentarios del script antes de decorar. No dejes un camino sin farolas ni un recinto o edificio sin su cartel.
- Nada del arte recortado de los packs va al repo público (`art-packs/` y el repo privado `zooesponji-private`).
- En commits y descripciones de PR **no se añaden líneas de atribución**. No subir (`push`) sin que David lo pida.
- No subir `version` ni `versionCode`: lo decide David al publicar.

## Review Focus

Entradas o condiciones que la spec implica y que ninguna prueba obvia cubriría; cada una tiene su prueba en la tarea indicada.

1. **Partida antigua sin `care` ni `clinic`**: debe cargar con `emptyCare()` y `clinic: false`, sin perder monedas ni recintos (Tarea 2 y 3).
2. **Partida con ids de animales que ya no existen o recintos cerrados**: `sanitizeCare` descarta ids desconocidos y recintos sin abrir (Tarea 3).
3. **Cerrar la limpieza o la cura a medias** (botón X, atrás de Android, girar la pantalla): el animal sigue sucio o enfermo y no se pagan monedas dos veces (Tarea 5 y 8).
4. **Animal sucio que además enferma, o enfermo al que se intenta limpiar**: un enfermo no se ensucia, y si ya estaba sucio, al tocarlo pasa por el «¡puaj!» y la cruz, no por la limpieza (Tarea 3 y 7).
5. **Tiempo en pausa**: con una escena abierta (tienda, comida, limpieza, clínica) o la app en segundo plano no avanzan los temporizadores del charco ni de las enfermedades (Tarea 6).

---

### Task 0: Rama y línea base

**Files:** ninguno.

- [x] **Step 1:** Comprueba que estás en la rama `feat/plaza-recintos-recorrido` y que `git status` está limpio. Crea desde ella `feat/cerdos-limpieza-clinica` (el mapa del zoo de esta rama es el que hay que ampliar).
- [x] **Step 2:** Lanza `npm run typecheck` y `npm test`. Anota cuántas pruebas pasan: es la línea base. Si algo falla ya, para y avisa a David.

---

### Task 1: Datos del cerdo y de la tienda

**Files:**
- Modify: `src/data/animals.ts` (añade `'cerdo'` a `ANIMAL_IDS` y a `ANIMALS`)
- Modify: `src/data/pens.ts` (añade `'cerdos'` a `PEN_IDS` entre `'ovejas'` y `'establo'`, y a `PENS`)
- Modify: `src/data/shop.ts` (constantes de la clínica)
- Modify: `src/data/foods.ts` solo si hace falta una comida nueva (no debería)
- Modify: `src/data/strings/*.ts` (11 idiomas)
- Modify: `src/data/book.ts` (páginas del Libro del Zoo)
- Test: `tests/unit/content.test.ts`, `tests/unit/pens.test.ts`, `tests/unit/strings.test.ts`, `tests/unit/book.test.ts` (ajusta los recuentos y listas que cambien)

**Interfaces:**
- Produces: `AnimalId` incluye `'cerdo'`; `PenId` incluye `'cerdos'`; en `data/shop.ts`: `export const CLINIC_ITEM_ID = 'clinic'` y `export const CLINIC_COST = 650`.

- [x] **Step 1: Escribe las pruebas que fallan** en `content.test.ts` / `pens.test.ts`:
  - `cerdo` tiene `coins` `{ come: 4, especial: 6 }` y `extraCost` 50.
  - `PENS.cerdos.cost === 150`, `penCapacity('cerdos') === 5`, 5 residentes con ids únicos en todo `PENS`.
  - `PEN_IDS` tiene `'cerdos'` justo detrás de `'ovejas'`.
  - `CLINIC_COST === 650`.
- [x] **Step 2:** Ejecuta `npx vitest run tests/unit/content.test.ts tests/unit/pens.test.ts`. Esperado: FALLA.
- [x] **Step 3: Implementa.**
  - `ANIMALS.cerdo`: emoji `🐷`, `nameKey: 'animal.cerdo'`, `extraNameKey: 'shop.extra.cerdo'`, `radius` entre el de la oveja y el del caballo. Reacciones (decisión del plan, ajustable): `zanahoria`, `maiz`, `pan` → `'come'`; `manzana` → `'especial'`; `carne` y `calcetin` → `'rechaza'`. Mira `trayFoods` para que la bandeja se arme sola.
  - `PENS.cerdos`: `cost: 150`, nombre `pen.cerdos`, residentes `residents('cerdo', 'rosita', 'morrito', 'tocino', 'bellota', 'churro')` (mismo aspecto para todos; el arte propio es la Tarea 11).
  - Cada residente nuevo necesita su página del libro: sigue el patrón de `book.ts` y de las claves `book.page.<id>.title` y siguientes de otro recinto de 5 animales (por ejemplo ovejas).
  - Textos nuevos mínimos en `es.ts`: `animal.cerdo`, `pen.cerdos`, `shop.extra.cerdo`, `shop.about.cerdo`, y las del libro. Cópialos a los otros 10 idiomas **traducidos** (no dejes el español). Arregla los recuentos que cambien en `strings.test.ts`.
- [x] **Step 4:** `npm run typecheck && npm test`. Esperado: todo PASA (si falla un test de mapa por el recinto nuevo, déjalo: se arregla en la Tarea 9 y ahora lo marcas `it.skip` con comentario `TODO tarea 9`).
- [x] **Step 5: Commit** `feat(cerdos): datos del cerdo, recinto de 150 y precio de la clínica`.

---

### Task 2: La clínica se compra (economía, tienda y guardado)

**Files:**
- Modify: `src/core/economy.ts`, `src/core/shopEntries.ts`, `src/core/save.ts`
- Modify: `src/scenes/ShopScene.ts`, `src/world/ShopInterior.ts` (la peana de la clínica)
- Create: `src/ui/redCross.ts`
- Test: `tests/unit/economy.test.ts`, `tests/unit/shopEntries.test.ts`, `tests/unit/save.test.ts`

**Interfaces:**
- Consumes: `CLINIC_ITEM_ID`, `CLINIC_COST` (Tarea 1).
- Produces:
  - `GameState.clinic: boolean` (inicial `false`).
  - `purchase(state, 'clinic')` → como Luna: `shop-locked`, `already-owned`, `not-enough-coins`.
  - `ShopEntry` nuevo `(EntryBase & { kind: 'clinic' })` con `look: 'clinic'`, `cost: CLINIC_COST`, `status: 'buy' | 'owned'`.
  - `StockId` incluye `typeof CLINIC_ITEM_ID`; `shopStock` trata la clínica como Luna: comprada, no rellena huecos.
  - `export function addRedCross(scene: Phaser.Scene, x: number, y: number, size: number): Phaser.GameObjects.Container` en `src/ui/redCross.ts` (cruz roja con borde blanco, dibujada con `Graphics`, sin arte).

- [x] **Step 1: Pruebas que fallan.**
  - `economy.test.ts`: `purchase` de `'clinic'` con 650 monedas devuelve `ok` con `clinic: true` y 0 monedas; con 649 → `not-enough-coins`; ya comprada → `already-owned`; `initialState().clinic === false`.
  - `shopEntries.test.ts`: con monedas suficientes y estado inicial, `shopEntries(state)` contiene una entrada `kind: 'clinic'` de coste 650; tras comprarla su `status` es `'owned'` y no ocupa una peana con AGOTADO.
  - `save.test.ts`: una partida guardada **sin** `clinic` carga con `clinic: false`; una con `clinic: true` la conserva; un valor que no sea booleano se ignora.
- [x] **Step 2:** `npx vitest run tests/unit/economy.test.ts tests/unit/shopEntries.test.ts tests/unit/save.test.ts`. Esperado: FALLA.
- [x] **Step 3: Implementa** siguiendo el camino de Luna en esos tres archivos (`buyLuna`, `lunaEntry`, `parseSave`: `state.luna === true`). Actualiza `migrateLegacy` y `defaultSave`. `STARTING_COINS` y `adReward` no cambian (la clínica es más cara que el mínimo); si `cheapestAtStart` la incluye, que no baje el mínimo.
- [x] **Step 4:** En `ShopScene`/`ShopInterior`, dibuja la peana de la clínica con `addRedCross` en vez de un sprite de animal y el texto `shop.clinic.name` (clave nueva en los 11 idiomas: «Clínica»). Para probarlo, mira cómo se pinta la peana de Luna (`kind: 'pet'`).
- [x] **Step 5:** `npm run typecheck && npm test`. Esperado: PASA.
- [x] **Step 6: Commit** `feat(clinica): la clínica se compra en la tienda por 650`.

---

### Task 3: Lógica de suciedad y enfermedad (módulo puro)

**Files:**
- Create: `src/core/care.ts`
- Modify: `src/core/save.ts`, `src/systems/session.ts` (guardar y exponer `care`)
- Test: `tests/unit/care.test.ts`, `tests/unit/save.test.ts`

**Interfaces:**
- Consumes: `GameState` (`clinic`, `counts`), `residentsIn`, `findResident`, `penCount`, `isPenOpen`, `ANIMALS`.
- Produces, todo en `src/core/care.ts`:

```ts
export const MUD_PENS = ['cerdos', 'elefantes-africanos', 'elefantes-asiaticos'] as const;
export type MudPenId = (typeof MUD_PENS)[number];
export const MAX_SICK = 2;
export const MUD_DELAY_MS = { min: 120_000, max: 300_000 } as const;
export const SICK_DELAY_MS = { min: 180_000, max: 360_000 } as const; // decisión del plan
export const CURE_DOSES = 5; // decisión del plan

export interface CareState {
  readonly dirty: readonly string[];   // ids de residentes sucios
  readonly sick: readonly string[];    // ids de residentes enfermos
  readonly muddy: readonly MudPenId[]; // charcos que están de barro
}
export const emptyCare = (): CareState;
export function isMudPen(id: PenId): id is MudPenId;
export function isDirty(care: CareState, residentId: string): boolean;
export function isSick(care: CareState, residentId: string): boolean;
export function randomDelay(range: { min: number; max: number }, rng: () => number): number;
export function makeMuddy(care: CareState, penId: MudPenId): CareState;
export function soil(care: CareState, penId: MudPenId, residentId: string): CareState;
export function clean(care: CareState, penId: MudPenId, residentId: string): CareState;
export function sickCandidates(care: CareState, state: GameState): string[];
export function fallSick(care: CareState, residentId: string): CareState;
export function cure(care: CareState, residentId: string): CareState;
export function careReward(species: AnimalId): number; // = ANIMALS[species].coins.come
export function sanitizeCare(raw: unknown, counts: Readonly<Record<PenId, number>>): CareState;
```

  - `Session` expone `care: CareState` y `setCare(next: CareState): void`, que guarda la partida y emite `bus.emit('care-changed', {})` (evento nuevo en `systems/events.ts`). Imita cómo `Session` ya guarda `shop` y `tutorial`.
  - `SaveData.care: CareState` (sin subir `SAVE_VERSION`: es un campo con valor por defecto, como `tutorial`).

- [x] **Step 1: Pruebas que fallan** en `care.test.ts` (nombres exactos):
  - `soil` solo ensucia si el charco de ese recinto está de barro, el residente no está sucio ni enfermo; si no, devuelve el mismo estado.
  - `clean` quita al residente; **si era el último sucio del recinto**, el recinto sale de `muddy` (charco limpio); si quedan sucios en ese recinto, sigue de barro.
  - `makeMuddy` es idempotente y los residentes de otros recintos no se ven afectados.
  - `sickCandidates` devuelve `[]` si `state.clinic` es `false`; devuelve `[]` si ya hay `MAX_SICK`; **nunca** incluye a un residente de un recinto que ya tiene un enfermo; solo incluye residentes que ya han llegado (`residentsIn(penId, count)`), de recintos abiertos; los dos elefantes de un mismo recinto no se pueden enfermar a la vez.
  - `fallSick` quita al residente de `dirty` (un enfermo no está sucio). `cure` lo quita de `sick`.
  - `randomDelay({min:100,max:200}, () => 0) === 100` y con `() => 0.999` está entre 100 y 200.
  - `careReward('elefante-africano') === 10`, `careReward('cerdo') === 4`.
  - `sanitizeCare`: ignora ids que no existen, recintos sin abrir, duplicados, más de `MAX_SICK` enfermos, dos enfermos del mismo recinto (se queda con el primero) y `muddy` con recintos que no son de barro; con basura (`null`, número, texto) devuelve `emptyCare()`.
  - `save.test.ts`: una partida sin `care` carga con `emptyCare()`; una con `care` válida lo conserva tras guardar y volver a cargar.
- [x] **Step 2:** `npx vitest run tests/unit/care.test.ts tests/unit/save.test.ts`. Esperado: FALLA.
- [x] **Step 3: Implementa** `care.ts` (funciones puras e inmutables) y el cableado en `save.ts`/`session.ts`.
- [x] **Step 4:** `npm run typecheck && npm test`. Esperado: PASA.
- [x] **Step 5: Commit** `feat(cuidados): estado de suciedad y enfermedad con guardado`.

---

### Task 4: Temporizadores del charco y de las enfermedades

**Files:**
- Create: `src/core/careDirector.ts`
- Test: `tests/unit/careDirector.test.ts`

**Interfaces:**
- Consumes: `CareState`, `MUD_PENS`, `MUD_DELAY_MS`, `SICK_DELAY_MS`, `randomDelay`, `makeMuddy`, `fallSick`, `sickCandidates`, `isPenOpen`.
- Produces:

```ts
export type CareEvent =
  | { type: 'muddy'; penId: MudPenId }
  | { type: 'sick'; residentId: string };

export class CareDirector {
  constructor(rng?: () => number);
  /** Avanza `deltaMs` de juego y devuelve lo que ha pasado. No muta `care`: el que llama aplica los eventos. */
  update(deltaMs: number, state: GameState, care: CareState): CareEvent[];
}
```

  Un temporizador por recinto con charco (solo corre si el recinto está abierto y su charco **no** está de barro) y uno para enfermedades (solo corre si la clínica está comprada y hay menos de `MAX_SICK` enfermos). Al saltar el de una enfermedad, elige al azar entre `sickCandidates`; si no hay ninguno, lo vuelve a armar.

- [x] **Step 1: Pruebas que fallan** (con `rng` fijo y `update` en pasos):
  - Con el recinto de cerdos abierto, tras `MUD_DELAY_MS.max` ms acumulados sale exactamente un evento `muddy` para `cerdos`, y no otro hasta que el charco se limpie y pase otro intervalo.
  - Un recinto cerrado nunca genera `muddy`.
  - Sin `state.clinic`, nunca hay `sick`. Con la clínica y un recinto abierto, tras `SICK_DELAY_MS.max` sale un `sick` de un candidato válido; con ya 2 enfermos no sale ninguno.
  - `update(0, …)` no genera nada y `update(-5, …)` no retrocede el tiempo.
  - Dos llamadas con el mismo `rng` y los mismos pasos dan los mismos eventos (determinismo).
- [x] **Step 2:** `npx vitest run tests/unit/careDirector.test.ts`. Esperado: FALLA.
- [x] **Step 3: Implementa** `CareDirector`.
- [x] **Step 4:** `npx vitest run tests/unit/careDirector.test.ts`. Esperado: PASA.
- [x] **Step 5: Commit** `feat(cuidados): temporizadores aleatorios del charco y las enfermedades`.

---

### Task 5: Pasos de la limpieza (módulo puro) y escena de limpieza

**Files:**
- Create: `src/core/cleaning.ts`, `src/scenes/CleanScene.ts`
- Modify: `src/main.ts` (registrar la escena, mira cómo se registra `FeedScene`), `src/systems/events.ts` (eventos `clean-opened`, `clean-closed`, `animal-cleaned`)
- Test: `tests/unit/cleaning.test.ts`

**Interfaces:**
- Consumes: `FacingRows`/`idleFrame`/`animalKey` de `art/art.ts`; `animalPortrait` de `world/Actors.ts`; `careReward`, `clean`.
- Produces, en `src/core/cleaning.ts`:

```ts
export const CLEAN_STEPS = ['cacahuete', 'cepillo', 'jabon', 'agua', 'toalla'] as const;
export type CleanStep = (typeof CLEAN_STEPS)[number];
export const FACES = ['frente', 'lateral-izquierdo', 'lateral-derecho', 'culete'] as const;
export type Face = (typeof FACES)[number];
export const CLEAN_EFFORT: Record<CleanStep, number>; // px de recorrido del dedo; por cara en el cepillo
export interface CleaningState { readonly step: CleanStep | 'hecho'; readonly progress: number; readonly face: Face }
export function startCleaning(): CleaningState;                       // cacahuete, 0, frente
export function stroke(state: CleaningState, distance: number): CleaningState;
export function isStepEnabled(state: CleaningState, step: CleanStep): boolean;
export function isDone(state: CleaningState): boolean;
export function faceFacing(face: Face): Facing;                       // frente→'down', izq→'left', der→'right', culete→'up'
```

  Valores de esfuerzo (decisión del plan, ajustables): cacahuete 150, cepillo 200 por cara, jabón 250, agua 250, toalla 200.
  `CleanScene` recibe `{ residentId: string }` y, igual que `FeedScene`, se abre sobre `World` y la reanuda al cerrar.

- [x] **Step 1: Pruebas que fallan** en `cleaning.test.ts`:
  - `startCleaning()` empieza en `cacahuete`, progreso 0, cara `frente`.
  - Con distancia suficiente, `stroke` pasa de `cacahuete` a `cepillo` y a partir de ahí **solo** `isStepEnabled(state, 'cepillo')` es cierto.
  - En el cepillo la cara avanza **en este orden**: `frente → lateral-izquierdo → lateral-derecho → culete`, y tras `culete` pasa a `jabon` con la cara `frente`.
  - Los pasos siguen el orden `jabon → agua → toalla → hecho`; `isDone` solo en `hecho`.
  - `stroke` con distancia 0 o negativa no cambia nada; una distancia enorme no se salta pasos (avanza solo hasta el límite del paso actual y descarta el resto).
  - `faceFacing('culete') === 'up'`.
- [x] **Step 2:** `npx vitest run tests/unit/cleaning.test.ts`. Esperado: FALLA.
- [x] **Step 3: Implementa** `cleaning.ts`.
- [x] **Step 4: Implementa `CleanScene`** copiando la estructura de `FeedScene` (velo, panel, retrato del animal, bandeja con 5 herramientas, botón de cerrar, `restartOnResize`):
  - Herramientas con emoji: 🥜 cacahuete, 🪥 cepillo, 🧼 jabón, 🚿 manguera, 🧺 toalla. Solo la del paso actual se puede tocar; las demás, con alfa bajo. Al tocar la herramienta activa, se arrastra y se **pasa el dedo sobre el animal**; la distancia recorrida encima del animal llama a `stroke`.
  - Barra de progreso del paso actual; texto en MAYÚSCULAS arriba durante el paso 1 con la clave `clean.why.cacahuete` (ej. «ASÍ SE QUEDA QUIETO MIENTRAS LO LIMPIAS»), y un texto corto por paso (`clean.step.<paso>`). Claves nuevas en 11 idiomas.
  - El retrato cambia de cara con `faceFacing` (los sprites ya tienen filas down/left/right/up). Sin arte, `animalPortrait` pinta el emoji: para la cara, gíralo/espejalo de forma reconocible y muestra una etiqueta pequeña con el nombre de la cara.
  - Las manchas marrones se pintan encima del animal con `Graphics` y se borran poco a poco con el progreso; en `jabon` salen burbujas; en `agua`, una piscina azul debajo del animal y gotas.
  - Al llegar a `hecho`: llama a `getSession()` para sumar `careReward(species)` monedas, `setCare(clean(care, penId, residentId))`, emite `animal-cleaned` y `coins-changed`, muestra monedas y corazones como `FeedScene`, y cierra tras un momento.
  - Si el jugador cierra con la X o el botón atrás **antes de terminar**: no se cambia `care` ni se pagan monedas (se reinicia la limpieza la próxima vez).
- [x] **Step 5:** `npm run typecheck && npm test`. Esperado: PASA. Comprueba a mano en `npm run dev` abriendo la escena con un hook de pruebas (Tarea 10) o desde la consola.
- [x] **Step 6: Commit** `feat(limpieza): los 5 pasos y la escena de limpieza`.

---

### Task 6: Charcos, manchas e iconos en el mundo

**Files:**
- Modify: `src/world/Pens.ts` (dibujo del charco, manchas, icono de enfermo, detección de pisar el barro)
- Modify: `src/scenes/WorldScene.ts` (reloj del `CareDirector`, enrutado de toques)
- Modify: `src/world/Actors.ts` si hace falta superponer manchas a un `Walker`
- Test: `tests/unit/careWorld.test.ts` (solo la parte pura, ver abajo)

**Interfaces:**
- Consumes: `CareDirector`, `CareState`, `isDirty`, `isSick`, `soil`, `makeMuddy`, `Session.care`, `Session.setCare`.
- Produces:
  - En `core/care.ts`: `export function insidePuddle(point: Vec, puddle: { x: number; y: number; rx: number; ry: number }): boolean` (elipse).
  - `Pens` nuevo: `setCare(care: CareState): void` (repinta charcos, manchas e iconos), y callback `onSoil: (penId: MudPenId, residentId: string) => void` configurable.
  - `WorldScene.update` llama a `director.update(delta, state, care)` **solo si** la escena `World` está activa y ninguna otra escena modal está abierta, y aplica los eventos (`makeMuddy`, `fallSick`) con `setCare`; emite `puddle-muddy`, `animal-sick`.
  - Toque sobre un residente: si `isSick` → abre `FeedScene` (ahí se ve el «¡puaj!»); si `isDirty` → abre `CleanScene`; si no → `FeedScene` como hasta ahora.

- [x] **Step 1: Pruebas que fallan** (solo lógica pura): `insidePuddle` con el centro, el borde y un punto fuera; y una función `pickTapScene(care, residentId): 'clean' | 'feed'` en `core/care.ts` que devuelve `'feed'` para enfermos (aunque estén sucios), `'clean'` para sucios no enfermos y `'feed'` en los demás casos.
- [x] **Step 2:** `npx vitest run tests/unit/careWorld.test.ts`. Esperado: FALLA.
- [x] **Step 3: Implementa** las dos funciones puras y luego el cableado visual:
  - **Charco** en cada recinto de `MUD_PENS`: una elipse dentro del recinto, en un hueco libre (usa `penSpace`/`props` para no taparse con adornos). Agua: azul claro. Barro: marrón. Cuando el estado cambia, se repinta.
  - **Pisar el barro**: cada segundo, cada residente cuyo punto cae dentro del charco de barro tiene un 30 % de `soil` (decisión del plan).
  - **Manchas**: un grupo de 3 a 5 manchas marrones pequeñas sobre el animal (hijas del objeto del `Walker`, siguen al animal).
  - **Icono de enfermo**: un emoji 🤒 sobre la cabeza que se queda hasta curarse.
  - **Pausa del tiempo**: el director solo recibe `delta` cuando `scene.isActive('World')` y no hay escena modal por encima; mira cómo `WorldScene` ya se pausa al abrir la tienda o la comida.
- [x] **Step 4:** `npm run typecheck && npm test`. Esperado: PASA. Prueba con `npm run dev`: baja los intervalos temporalmente con un hook de pruebas (Tarea 10) y comprueba a ojo que el charco se pone de barro, los cerdos se manchan y al limpiarlos todos el charco vuelve a agua.
- [x] **Step 5: Commit** `feat(cuidados): charco, manchas y icono de enfermo en el mundo`.

---

### Task 7: Comer con un animal enfermo: «¡puaj!», la cruz y el camino a la clínica

**Files:**
- Modify: `src/scenes/FeedScene.ts`, `src/scenes/WorldScene.ts`, `src/core/tiledmap.ts` (leer la puerta de la clínica)
- Modify: `src/systems/events.ts` (`clinic-requested`)
- Test: `tests/unit/careFeed.test.ts`, `tests/unit/tiledmap.test.ts`

**Interfaces:**
- Consumes: `isSick`, `addRedCross`, el mecanismo de la ruta andando a la tienda (`guideToShop`, `shopRoute`, `shopDoorTile`).
- Produces:
  - `tiledmap.ts`: `export interface ClinicInfo { door: Point; doorWidth: number; /* resto como ShopInfo */ }` y `readClinic(map: TiledMap): ClinicInfo | null`, igual que `readShop` pero para objetos de tipo `clinica`.
  - `WorldScene`: `walkToClinic(): boolean` (mismo comportamiento que ir andando a la tienda; devuelve `false` si el mapa no tiene clínica) y `clinicDoorTile(): Point | null`.
  - En `core/care.ts`: `export function feedOutcome(care: CareState, residentId: string): 'normal' | 'sick-refuse'`.

- [x] **Step 1: Pruebas que fallan:** `feedOutcome` devuelve `'sick-refuse'` para un enfermo y `'normal'` para los demás; `readClinic` lee el objeto `clinica` de un mapa de prueba y devuelve `null` si no existe.
- [x] **Step 2:** `npx vitest run tests/unit/careFeed.test.ts tests/unit/tiledmap.test.ts`. Esperado: FALLA.
- [x] **Step 3: Implementa:**
  - En `FeedScene`, si el residente está enfermo, **cualquier** comida soltada sobre él produce un «¡puaj!» (texto `feed.puaj`, ya hay mecánica de rechazo para copiar), no da monedas, y aparece una **cruz roja grande** (`addRedCross`) encima del animal. Tocarla emite `clinic-requested`, cierra la comida y `WorldScene` llama a `walkToClinic()`. Si ya hay icono de enfermo y se abre la comida, la cruz sale directamente sin repetir el «¡puaj!» (igual que dijeron los niños).
  - Si no se pincha la cruz y se sale de la comida, el animal sigue enfermo con su icono.
- [x] **Step 4:** `npm run typecheck && npm test`. Esperado: PASA.
- [x] **Step 5: Commit** `feat(clinica): puaj, cruz y camino andando a la clínica`.

---

### Task 8: Clínica por dentro y escena de cura

**Files:**
- Create: `src/scenes/ClinicScene.ts`, `src/scenes/CureScene.ts`, `scripts/make-clinic-map.mjs`, `public/assets/maps/clinic.tmj`
- Modify: `src/main.ts`, `package.json` (script `make:clinic-map`), `src/systems/events.ts` (`clinic-opened`, `clinic-closed`, `animal-cured`)
- Modify: `src/world/ShopInterior.ts` o crear `src/world/ClinicInterior.ts`, según lo que se pueda reutilizar
- Test: `tests/unit/clinicSpots.test.ts`

**Interfaces:**
- Consumes: `ShopScene` y `ShopInterior` (modelo del paseo por el interior), `interiorLayout`, `shopWalk` (rejilla y alcance), `care`, `careReward`, `CURE_DOSES`.
- Produces, en `core/care.ts`:

```ts
export const CLINIC_SPOTS = 2;
/** Qué enfermo ocupa cada hueco (0 o 1): el orden en que enfermaron. Menos de dos enfermos deja huecos vacíos (null). */
export function clinicSlots(care: CareState): (string | null)[];
export const MEDICINES = ['pastilla', 'vendaje', 'jarabe', 'termometro'] as const;
```

  - `ClinicScene` recibe nada y lee `getSession().care`; `CureScene` recibe `{ residentId: string }`.

- [x] **Step 1: Pruebas que fallan** en `clinicSpots.test.ts`: con 0 enfermos `clinicSlots` es `[null, null]`; con 1 es `[id, null]`; con 2 conserva el orden de `care.sick`; tras `cure` del primero, el segundo pasa al primer hueco **o** se queda en el suyo (decide una y pruébala; recomendado: se queda en su hueco para que «el otro siga allí»; guarda en `CareState` solo `sick`, así que calcula el hueco por el índice en `sick` y no reordenes: documenta la decisión en el test).
- [x] **Step 2:** `npx vitest run tests/unit/clinicSpots.test.ts`. Esperado: FALLA.
- [x] **Step 3: Implementa `clinicSlots`.**
- [x] **Step 4: `ClinicScene`:** interior con la cuidadora que se mueve (joystick o toque) como en la tienda; **2 empleados** (veterinario y veterinaria: reutiliza el dibujo del tendero y `keeper`/personajes existentes con un emoji 🧑‍⚕️ si no hay arte) y **2 huecos** con camillas. Cada hueco con un enfermo lo dibuja con su carita triste y un texto `clinic.sick`; al tocarlo abre `CureScene`. Puerta de salida que vuelve al mundo. Genera `clinic.tmj` con `scripts/make-clinic-map.mjs` copiando `make-shop-map.mjs`.
- [x] **Step 5: `CureScene`:** igual que `FeedScene`, con bandeja de 4 medicinas (💊 pastilla, 🩹 vendaje, 🧴 jarabe, 🌡️ termómetro). Cada una soltada sobre el animal suma una dosis; el orden da igual; con `CURE_DOSES` dosis la barra se llena. Mientras tanto se ve la carita triste y el texto `cure.sick`. Al terminar: `setCare(cure(care, residentId))`, monedas con `careReward`, evento `animal-cured`, el animal desaparece de su hueco y el icono 🤒 del mundo se quita. Cerrarla a medias no cambia nada.
- [x] **Step 6:** `npm run typecheck && npm test`. Esperado: PASA. Prueba a mano: con la clínica comprada y 2 enfermos forzados por hook, curar uno y comprobar que el otro sigue.
- [x] **Step 7: Commit** `feat(clinica): interior, dos huecos y escena de cura`.

---

### Task 9: El mapa del zoo: recinto de cerdos y edificio de la clínica

**Files:**
- Modify: `scripts/make-zoo-map.mjs` y regenerar `public/assets/maps/zoo.tmj` (`npm run make:zoo-map`)
- Modify: `src/world/ShopBuilding.ts` o crear `src/world/ClinicBuilding.ts` (edificio y puerta)
- Modify: `src/scenes/WorldScene.ts` (abrir `ClinicScene` al pisar la puerta si la clínica está comprada; si no, un aviso `toast.needClinic`)
- Test: `tests/unit/zoomap.test.ts`, `tests/unit/recintos.test.ts`, `tests/unit/tiledmap.test.ts`, `tests/e2e/zoo-grande.spec.ts`

**Interfaces:**
- Consumes: `readClinic` (Tarea 7), `enclosures` y `park()` de `make-zoo-map.mjs`.
- Produces: en `zoo.tmj` un recinto con `penId: 'cerdos'` (y su puerta) en la **zona de la granja** (este del mapa, junto a ovejas, estanque y establo), de al menos el tamaño mínimo que usan los demás recintos (el comentario del script habla de 14×9 por dentro), sin pisar caminos ni otros recintos; y un objeto `clinica` (edificio con puerta) **en la plaza** del cruce del parque (decisión de David, 2026-11-09). La plaza mide 15×13 casillas (`PLAZA` en el script) con la isla de la fuente en medio (`ISLAND`, 5×4) y una vuelta de 4 casillas alrededor. El edificio se pone en esa vuelta, **sin tapar los caminos que llegan a la plaza (la cruz de 3 de ancho) ni la fuente**, con la puerta mirando a la plaza y accesible a pie desde ella. Mira dónde están ya la farola, los bancos y los carteles de la plaza antes de elegir sitio.

- [x] **Step 1: Pruebas que fallan:** `zoomap.test.ts` y `recintos.test.ts` esperan un recinto `cerdos` con puerta y sin solaparse con los demás; el mapa tiene un objeto `clinica` dentro de la plaza (entre `PLAZA` y fuera de `ISLAND`) con puerta accesible desde un camino (la rejilla de paso lo conecta con el resto). Quita los `it.skip` de la Tarea 1.
- [x] **Step 2:** `npx vitest run tests/unit/zoomap.test.ts tests/unit/recintos.test.ts tests/unit/tiledmap.test.ts`. Esperado: FALLA.
- [x] **Step 3:** Lee `scripts/make-zoo-map.mjs` entero antes de tocarlo. El mapa mide `W = 117` por `H = 75`; el camino derecho está en `RIGHT = W - 4`. El hueco más probable para los cerdos es debajo de la avenida de la granja, a la derecha del establo (`x = RING_R + 22 …`). **Si no cabe sin tocar el camino derecho, para y avisa a David** en vez de ensanchar el mapa por tu cuenta (cambiar `W` mueve todo y rompe muchas pruebas).
- [x] **Step 4:** Añade el recinto de cerdos a `enclosures`, sus adornos (comedero, barril, heno) como hacen `ovejas(...)` y `establo(...)`, el cartel y las farolas que reparte el script. Añade el edificio de la clínica en la plaza, con puerta y un cartel con la cruz roja; si por tamaño no cabe en la plaza sin tapar un camino o la fuente, **para y avisa a David** en vez de moverla a otro sitio. Regenera con `npm run make:zoo-map`. Mira el resultado con `npm run map:preview`.
- [x] **Step 4b:** Si has añadido o alargado caminos, comprueba que **todos tienen farolas con el reparto automático del script** (sin tramos de más de 7 casillas a oscuras), que el recinto de cerdos y la clínica tienen su cartel, y que los adornos nuevos son del mismo estilo que los de ovejas, establo y la plaza. Mira el resultado en `npm run map:preview` y en `npm run map:snapshot` antes de seguir.
- [x] **Step 5:** `npm run typecheck && npm test && npm run test:e2e -- tests/e2e/zoo-grande.spec.ts tests/e2e/recorrido.spec.ts`. Esperado: PASA (el recorrido por todos los recintos debe incluir el nuevo; si la prueba cuenta recintos, actualízala).
- [x] **Step 6: Commit** `feat(mapa): recinto de cerdos en la granja y edificio de la clínica`.

---

### Task 10: Ganchos de prueba, analítica y prueba de punta a punta

**Files:**
- Modify: `src/systems/testHooks.ts` (ganchos nuevos), `src/core/eventCatalog.ts`, `src/systems/analyticsEvents.ts` (eventos nuevos, si las pruebas de cableado lo exigen)
- Create: `tests/e2e/cuidados.spec.ts`
- Test: `tests/unit/analyticsWiring.test.ts`, `tests/unit/eventCatalog.test.ts`

**Interfaces:**
- Produces (ganchos, solo con la bandera de pruebas que ya usa `testHooks.ts`): `forceMuddy(penId)`, `forceSoil(residentId)`, `forceSick(residentId)`, `setCoins(n)`, `giveClinic()`, `shortenCareTimers()`.

- [x] **Step 1:** Lee `testHooks.ts` y `analyticsWiring.test.ts` para saber cómo declaran los ganchos y cómo se exige que cada evento del bus esté en el catálogo. Lanza `npm test` y mira qué pruebas fallan por los eventos nuevos (`care-changed`, `animal-soiled`, `animal-cleaned`, `animal-sick`, `animal-cured`, `puddle-muddy`, `puddle-clean`, `clinic-opened`, `clinic-closed`, `clinic-requested`, `clean-opened`, `clean-closed`).
- [x] **Step 2: Escribe `tests/e2e/cuidados.spec.ts`** con dos caminos felices:
  - **Limpieza:** con el recinto de cerdos abierto, `forceMuddy('cerdos')`, `forceSoil('<un cerdo>')`; tocar al cerdo abre la limpieza (no la comida); completar los 5 pasos; las monedas suben 4; el cerdo queda limpio y el charco vuelve a agua.
  - **Clínica:** `giveClinic()`, `forceSick(...)` de dos recintos distintos; comer con un enfermo muestra «¡puaj!» y la cruz; entrar en la clínica muestra los 2 enfermos; curar uno deja al otro; las monedas suben.
- [x] **Step 3:** Lanza `npx playwright test tests/e2e/cuidados.spec.ts`. Esperado: PASA (si hay que pulsar con coordenadas, mira cómo lo hacen `play.spec.ts` y `shop.spec.ts`).
- [x] **Step 4:** `npm run typecheck && npm test && npm run test:e2e`. Esperado: todo PASA. Compara con la línea base de la Tarea 0.
- [x] **Step 5: Commit** `test(cuidados): ganchos, analítica y prueba de punta a punta`.

---

### Task 11: Arte propio del cerdo y pulido (opcional, solo si el pack lo permite)

**Files:**
- Modify: `art/art.config.json`, `public/art/*` (lo genera `npm run art:import`)
- Modify: `src/data/pens.ts` (aspectos propios, si se crean)
- Test: `tests/unit/artConfig.test.ts`, `tests/unit/looks.test.ts`

- [x] **Step 1:** Mira si el pack `farm` (`Farm & Cute Animals Sprite Pack.zip`, en el repo privado) trae un cerdo. Si lo trae, añade `animals.cerdo` a `art/art.config.json` como hace `animals.cabra` y ejecuta `npm run art:import`. Si necesita ediciones de color para variantes, sigue el patrón de `cabra-gordi`.
- [x] **Step 2:** `npm test` (`artConfig` y `looks` comprueban el manifiesto). Esperado: PASA. Revisa a ojo que el cerdo se ve en el recinto y en las escenas.
- [x] **Step 3:** Los recortes del pack **no** se suben al repo público: respeta la regla de `.gitignore` y de `zooesponji-private`.
- [x] **Step 4: Commit** `feat(arte): sprites del cerdo`. Si no hay cerdo en el pack, deja el emoji 🐷 y anótalo en el resumen final.

---

### Task 12: Documentación al día

**Files:**
- Modify: `README.md` y `game/README.md` (lista de funciones), la spec (`docs/superpowers/specs/2026-11-09-cerdos-limpieza-clinica-design.md`: estado «implementado» y las decisiones del plan que se hayan cambiado), este plan (casillas marcadas)

- [x] **Step 1:** Actualiza los README con los cerdos, la limpieza y la clínica, y la spec con el estado real y cualquier decisión que haya cambiado al construir.
- [x] **Step 2:** `npm run typecheck && npm test && npm run test:e2e && npm run build`. Esperado: todo PASA.
- [x] **Step 3: Commit** `docs: cerdos, limpieza y clínica al día`.
- [x] **Step 4:** Resume a David qué se hizo, qué decisiones del plan se cambiaron, qué no se pudo verificar y los pasos para probarlo a mano (en PowerShell, uno por uno), con el resultado esperado de cada uno. No subas ni fusiones nada.
