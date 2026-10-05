# Zoo grande, plan 3 de 4: mapa y recintos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el zoo pase de 4 a 11 recintos en un mapa de 96×60: sabana, dos jaulas de elefantes, pingüinos, ovejas, establo y estanque, con sus 11 especies nuevas, sus 35 animales con aspecto propio, recintos mixtos y visitantes que entran a acariciar a las ovejas.

**Architecture:** El mapa lo sigue generando `make-zoo-map.mjs`: el parque de 48×35 queda intacto en el centro (se escribe en sus coordenadas de siempre, con un desplazamiento) y de sus caminos salen tres avenidas a las zonas nuevas. Especies y recintos son solo datos (`data/animals.ts`, `data/pens.ts`); el motor de recintos del plan 1 ya los pinta y deja entrar a la cuidadora. Lo nuevo de motor es poco: animales grandes (radio por especie), recintos fuera de pantalla que no se actualizan y la granja de contacto (visitantes dentro de `ovejas`, con lógica pura en `core/`).

**Tech Stack:** TypeScript, Phaser 4, Vite, Vitest, Playwright, `pngjs` y `adm-zip` (ya instalados). Todo dentro de `game/`.

**Spec:** `docs/superpowers/specs/2026-10-05-zoo-grande-design.md`. **Planes anteriores (hechos):** `2026-10-05-zoo-grande-1-cimientos.md` y `2026-10-05-zoo-grande-2-arte-y-comidas.md`.

## Global Constraints

- **Ningún archivo de arte de los packs entra en este repo.** `game/public/art/` y `art-packs/` están en `.gitignore`. Las vistas previas se escriben en el repo privado (`../zooesponji-private/art-work/plantillas/`).
- El repo privado tiene que estar clonado junto a este (`C:\Projects\games\zooesponji-private`); sin él `npm run art:import` se para con un aviso.
- Las partidas guardadas siguen valiendo: no se toca `SAVE_VERSION` ni los ids `leon`, `cabra`, `pantera`, `panda`, ni los ids de sus residentes. Los recintos nuevos se leen como 0.
- `core/` no importa Phaser ni APIs del navegador.
- Ningún texto visible fuera de `src/data/strings.ts`; frases completas; ningún dibujo lleva letras.
- Cada especie enseña entre 4 y 5 comidas. **Regla de las bandejas:** en cada bandeja hay al menos una comida que ese animal rechaza y que otro animal sí come.
- No se sube la versión (sigue 2.2.0): la 2.3.0 sale al cerrar el plan 4.
- **Fuera de este plan (plan 4):** las 35 páginas del libro y sus textos, los capítulos del libro, y el rediseño de la tienda. Aquí solo entra lo mínimo para que el juego funcione: los títulos de los residentes (`FeedScene` los usa como nombre) y que la tienda no enseñe más de 3 recintos por comprar.
- Cada vez que se añaden especies o aspectos hay que volver a ejecutar `npm run art:import`: el manifiesto exige la hoja de cada especie y, si falta, el juego arranca en modo provisional (emojis).
- Los dibujos de los niños mandan: si existe `art-work/terminados/<archivo>` para un aspecto, se usa tal cual y no se le aplican retoques.
- Todos los comandos se ejecutan desde `game/`. Unitarias: `npm test`. Tipos: `npm run typecheck`. E2E: `npm run test:e2e`.
- Commits en español con el prefijo del repo (`feat:`, `refactor:`, `test:`, `docs:`).

## Mapa de archivos

| Archivo | Cambio | Responsabilidad |
|---|---|---|
| `src/core/tiledmap.ts`, `core/interaction.ts` | Modificar | La propiedad del mapa pasa de `animalId` a `penId`; `PropInfo.zone`; `tapDistance`, `rectsOverlap` |
| `scripts/make-zoo-map.mjs`, `scripts/make-test-map.mjs` | Modificar | Mapa de 96×60 con las tres zonas; `penId` |
| `public/assets/maps/zoo.tmj`, `test-map.tmj` | Regenerar | Salida de los scripts |
| `art/art.config.json` | Modificar | Suelos, agua y piezas de las zonas; hojas de 11 especies y de 35 residentes |
| `src/data/animals.ts` | Modificar | 11 especies: bandeja, monedas, precio del extra, radio |
| `src/data/pens.ts` | Modificar | 7 recintos, 35 residentes, `visitors` |
| `src/data/strings.ts` | Modificar | Nombres de especies, recintos, zonas y residentes |
| `src/core/shopEntries.ts` | Modificar | Solo 3 recintos por comprar a la vez |
| `src/core/flock.ts` | Modificar | Radio por animal; `fleeTarget`, `followTarget` |
| `src/core/petting.ts` | Nuevo | Aforo de visitantes dentro de un recinto |
| `src/world/Pens.ts` | Modificar | Recintos mixtos, animales grandes, fuera de pantalla, granja de contacto |
| `src/world/VisitorCrowd.ts` | Modificar | Visitantes que entran a acariciar |
| `src/world/Decor.ts` | Modificar | Carteles de zona |
| `src/scenes/WorldScene.ts`, `HudScene.ts` | Modificar | Conectar lo anterior; aviso con el nombre de la especie |
| `src/systems/testHooks.ts` | Modificar | `buy`, `visitorsInPen`, `sendVisitorInside`, `petHearts` |

---

### Task 1: La propiedad del mapa se llama `penId`

Desde el plan 1 el recinto y la especie son cosas distintas, pero en el mapa la propiedad de recintos y puertas se sigue llamando `animalId`. Es un cambio mecánico, sin cambio de comportamiento.

**Files:**
- Modify: `game/src/core/tiledmap.ts`, `game/src/core/interaction.ts`
- Modify: `game/src/world/Pens.ts`, `game/src/world/Decor.ts`, `game/src/scenes/WorldScene.ts`, `game/src/systems/testHooks.ts`
- Modify: `game/scripts/make-zoo-map.mjs`, `game/scripts/make-test-map.mjs`
- Regenerate: `game/public/assets/maps/zoo.tmj`, `game/public/assets/maps/test-map.tmj`
- Test: `game/tests/unit/tiledmap.test.ts`, `interaction.test.ts`, `zoomap.test.ts`, `flock.test.ts`

**Interfaces:**
- Produces:
  - `interface EnclosureInfo { penId: string; biome: string | null; x: number; y: number; width: number; height: number }`
  - `interface GateInfo { penId: string; tile: Point }`
  - `interface GateRef { penId: string; tile: Point }` (en `core/interaction.ts`)

- [ ] **Step 1: Cambiar los tests para que fallen**

En `tests/unit/tiledmap.test.ts`, `interaction.test.ts`, `zoomap.test.ts` y `flock.test.ts`, sustituir cada `.animalId` y cada `animalId:` por `.penId` y `penId:`. En `tiledmap.test.ts`, el test del mapa de prueba deja de depender de `ANIMAL_IDS` (el mapa de prueba se queda con sus 4 recintos aunque el juego tenga más):

```ts
  it('el mapa de prueba tiene exactamente un recinto y una puerta por cada uno de sus 4 recintos', () => {
    const expected = ['cabra', 'leon', 'panda', 'pantera'];
    expect(readEnclosures(map).map((e) => e.penId).sort()).toEqual(expected);
    expect(readGates(map).map((g) => g.penId).sort()).toEqual(expected);
  });
```

y

```ts
    expect(leon).toEqual({ penId: 'leon', biome: null, x: 80, y: 80, width: 176, height: 112 });
```

Quitar de ese archivo los imports de `ANIMAL_IDS` e `isAnimalId` si ya no se usan. En `zoomap.test.ts`, el bucle `for (const id of ANIMAL_IDS)` se queda igual en esta tarea (solo cambia `.animalId` → `.penId`).

- [ ] **Step 2: Ver que fallan**

Run: `npm test`
Expected: FAIL en los cuatro archivos (`penId` es `undefined`; errores de tipos en `GateRef`).

- [ ] **Step 3: Renombrar en el código**

`src/core/tiledmap.ts`:

```ts
export interface EnclosureInfo {
  /** Id del recinto (`PenId`). */
  penId: string;
  /** Ambiente del recinto (savannah, alpine, rainforest, bamboo, tundra, grassland) o null si no tiene. */
  biome: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GateInfo {
  penId: string;
  tile: Point;
}
```

```ts
function penIdOf(object: TiledObject): string | null {
  const value = getProperty(object.properties, 'penId');
  return typeof value === 'string' ? value : null;
}
```

En `readEnclosures` y `readGates`, `const penId = penIdOf(object);` y `penId` en el objeto que se devuelve.

`src/core/interaction.ts`:

```ts
export interface GateRef {
  penId: string;
  tile: Point;
}
```

`src/world/Pens.ts`: en el constructor `if (!isPenId(enclosure.penId)) continue; const id = enclosure.penId; const gate = gates.find((g) => g.penId === id);`. En `lockedDoorstep`: `this.pens.map((pen) => ({ penId: pen.id, tile: pen.gate }))` y `const id = gate?.penId ?? null;`.

`src/world/Decor.ts`: `isPenId(enclosure.penId)` y `PENS[enclosure.penId]`.

`src/scenes/WorldScene.ts`:

```ts
  gateApproachTile(penId: string): Point | null {
    const enclosure = readEnclosures(this.mapData).find((e) => e.penId === penId);
    const gate = readGates(this.mapData).find((g) => g.penId === penId);
    return enclosure && gate ? approachTile(gate.tile, enclosure, TILE_SIZE, this.pathGrid) : null;
  }
```

`src/systems/testHooks.ts`: el parámetro de `gateApproachTile` pasa a llamarse `penId` (en la interfaz y en la implementación).

`scripts/make-zoo-map.mjs` y `scripts/make-test-map.mjs`: en la lista `enclosures`, la clave `animalId` pasa a `penId`; `const animalProp = [{ name: 'animalId', ... value: e.animalId }]` pasa a `const penProp = [{ name: 'penId', type: 'string', value: e.penId }]`; los nombres de objeto a `` `recinto-${e.penId}` `` y `` `puerta-${e.penId}` ``.

- [ ] **Step 4: Regenerar los dos mapas**

Run: `npm run make:zoo-map; npm run make:test-map`
Expected: `Mapa generado en …zoo.tmj` y `…test-map.tmj`.

- [ ] **Step 5: Ver que todo pasa**

Run: `npm test; npm run typecheck`
Expected: PASS, sin errores de tipos. `grep -rn "animalId" src scripts tests` solo debe encontrar `pic.animalId`/`animalId: AnimalId` de `data/book.ts`, `BookScene.ts`, `FeedScene.ts` y `core/reactions.ts` (ahí sí es la especie).

- [ ] **Step 6: Commit**

```bash
git add src scripts tests public/assets/maps
git commit -m "refactor: la propiedad de recintos y puertas del mapa se llama penId"
```

---

### Task 2: Mapa de 96×60 con sabana, polo y granja

**Files:**
- Modify: `game/scripts/make-zoo-map.mjs` (se reescribe entero)
- Regenerate: `game/public/assets/maps/zoo.tmj`
- Modify: `game/art/art.config.json` (sección `props`)
- Modify: `game/src/core/tiledmap.ts` (`PropInfo.zone`), `game/src/world/Decor.ts`, `game/src/data/strings.ts`
- Test: `game/tests/unit/zoomap.test.ts`, `game/tests/unit/tiledmap.test.ts`

**Interfaces:**
- Consumes: `EnclosureInfo.penId`, `GateInfo.penId` (Task 1).
- Produces:
  - `PropInfo.zone: string | null` — zona que anuncia un cartel (`sabana`, `polo`, `granja`).
  - Recintos en el mapa, con estos ids exactos: `leon`, `cabra`, `pantera`, `panda`, `sabana`, `elefantes-africanos`, `elefantes-asiaticos`, `pinguinos`, `ovejas`, `estanque`, `establo`.
  - Biomas nuevos: `tundra` (pingüinos) y `grassland` (granja). Sabana y elefantes usan `savannah`.
  - Textos `zone.sabana`, `zone.polo`, `zone.granja`.

**Distribución** (casillas; el parque de siempre va desplazado 24 a la derecha y 20 hacia abajo):

| Recinto | x | y | ancho × alto | Puerta (x, fila) | Zona |
|---|---|---|---|---|---|
| `sabana` | 14 | 3 | 22 × 12 | 24, 14 | Norte |
| `elefantes-africanos` | 52 | 5 | 12 × 10 | 57, 14 | Norte |
| `elefantes-asiaticos` | 66 | 5 | 12 × 10 | 71, 14 | Norte (pasillo de césped en 64–65) |
| `pinguinos` | 5 | 25 | 16 × 10 | 12, 34 | Oeste |
| `ovejas` | 72 | 25 | 11 × 10 | 77, 34 | Este |
| `estanque` | 84 | 25 | 10 × 10 | 88, 34 | Este |
| `establo` | 74 | 39 | 16 × 10 | 81, 39 | Este |

Avenidas (2 de ancho): norte en las filas 17–18 (x 12–79), que baja a la cruz central por x 47–48; oeste y este prolongan el camino del medio del parque (filas 36–37) hasta x 5 y x 93.

- [ ] **Step 1: Escribir los tests que fallan**

En `tests/unit/zoomap.test.ts`, añadir al principio:

```ts
const config = JSON.parse(readFileSync(fileURLToPath(new URL('../../art/art.config.json', import.meta.url)), 'utf8')) as {
  props: Record<string, unknown>;
};
/** Recintos que tiene que haber en el mapa. */
const MAP_PENS = [
  'leon', 'cabra', 'pantera', 'panda',
  'sabana', 'elefantes-africanos', 'elefantes-asiaticos', 'pinguinos', 'ovejas', 'estanque', 'establo',
];
const enclosure = (id: string) => readEnclosures(map).find((e) => e.penId === id)!;
```

Sustituir estos tests:

```ts
  it('mide 96×60 y el inicio es transitable', () => {
    expect([grid.width, grid.height]).toEqual([96, 60]);
    expect(isWalkable(grid, spawn.x, spawn.y)).toBe(true);
  });

  it('cada recinto tiene valla y puerta, y se llega andando a la puerta', () => {
    const enclosures = readEnclosures(map);
    const gates = readGates(map);
    expect(enclosures.map((e) => e.penId).sort()).toEqual([...MAP_PENS].sort());
    for (const id of MAP_PENS) {
      const gate = gates.find((g) => g.penId === id);
      expect(gate, id).toBeDefined();
      const approach = approachTile(gate!.tile, enclosure(id), 16, grid);
      expect(approach, `acceso a ${id}`).not.toBeNull();
      expect(findPath(grid, spawn, approach!), `camino a ${id}`).not.toBeNull();
    }
  });

  it('cada recinto tiene bioma', () => {
    const biome = (id: string) => enclosure(id).biome;
    expect(MAP_PENS.map(biome)).toEqual([
      'savannah', 'alpine', 'rainforest', 'bamboo',
      'savannah', 'savannah', 'savannah', 'tundra', 'grassland', 'grassland', 'grassland',
    ]);
  });

  it('hay decoración en los recintos de siempre, en los nuevos y en el parque', () => {
    const names = new Set(readProps(map).map((p) => p.prop));
    for (const name of ['acacia', 'plateau', 'waterfall', 'bamboo-mid', 'bench', 'lamp', 'sign', 'fountain', 'pond-tundra', 'pond-grassland', 'sunflowers']) {
      expect(names.has(name), name).toBe(true);
    }
  });
```

Y añadir:

```ts
  it('el parque de siempre queda en el centro, sin cambios', () => {
    expect(enclosure('leon')).toMatchObject({ x: (9 + 24) * 16, y: (5 + 20) * 16, width: 12 * 16, height: 8 * 16 });
    expect(enclosure('pantera')).toMatchObject({ x: (6 + 24) * 16, y: (19 + 20) * 16, width: 15 * 16, height: 10 * 16 });
    expect(readShop(map)).toMatchObject({ x: (25 + 24) * 16, y: (4 + 20) * 16, door: { x: 27 + 24, y: 9 + 20 } });
    expect(spawn).toEqual({ x: 47, y: 50 });
  });

  it('la sabana es el recinto grande y los elefantes van en dos jaulas con un pasillo de césped', () => {
    expect(enclosure('sabana')).toMatchObject({ width: 22 * 16, height: 12 * 16 });
    const african = enclosure('elefantes-africanos');
    const asian = enclosure('elefantes-asiaticos');
    expect(asian.x - (african.x + african.width)).toBe(2 * 16);
    for (const x of [64, 65]) for (let y = 5; y <= 14; y++) expect(isWalkable(grid, x, y), `(${x},${y})`).toBe(false);
  });

  it('cada zona nueva tiene su cartel a la entrada', () => {
    const zones = readProps(map).flatMap((p) => (p.zone ? [p.zone] : []));
    expect(zones.sort()).toEqual(['granja', 'polo', 'sabana']);
  });

  it('toda pieza del mapa y todo suelo de bioma están en art.config.json', () => {
    for (const p of readProps(map)) expect(config.props[p.prop], p.prop).toBeDefined();
    for (const e of readEnclosures(map)) expect(config.props[`ground-${e.biome}`], `suelo de ${e.penId}`).toBeDefined();
  });
```

Quitar el import de `ANIMAL_IDS` si ya no se usa. En `tests/unit/tiledmap.test.ts` añadir, en el `describe` que lee `readProps`, o al final del archivo:

```ts
describe('readProps: carteles de zona', () => {
  const withProp = (properties: { name: string; type: string; value: unknown }[]): TiledMap => ({
    width: 1, height: 1, tilewidth: 16, tileheight: 16, tilesets: [],
    layers: [{ type: 'objectgroup', name: 'objetos', objects: [{ id: 1, name: 'p', type: 'prop', x: 8, y: 16, width: 0, height: 0, properties }] }],
  });

  it('lee la zona del cartel', () => {
    const map = withProp([{ name: 'prop', type: 'string', value: 'sign-zone' }, { name: 'zone', type: 'string', value: 'polo' }]);
    expect(readProps(map)[0]).toMatchObject({ prop: 'sign-zone', zone: 'polo' });
  });

  it('sin zona, null', () => {
    expect(readProps(withProp([{ name: 'prop', type: 'string', value: 'tree' }]))[0]!.zone).toBeNull();
  });
});
```

(Si `TiledMap` o `readProps` no están importados en ese archivo, añadirlos al import de `../../src/core/tiledmap`.)

- [ ] **Step 2: Ver que fallan**

Run: `npm test -- zoomap tiledmap`
Expected: FAIL (`[48, 35]` en vez de `[96, 60]`, faltan recintos, `zone` es `undefined`).

- [ ] **Step 3: `PropInfo.zone`**

En `src/core/tiledmap.ts`, en `PropInfo`:

```ts
  /** Zona que anuncia (solo los carteles de zona): `sabana`, `polo`, `granja`. */
  zone: string | null;
```

y en `readProps`, dentro del objeto que se añade a `result`:

```ts
      zone: ((v) => (typeof v === 'string' ? v : null))(getProperty(object.properties, 'zone')),
```

- [ ] **Step 4: Reescribir `scripts/make-zoo-map.mjs`**

Contenido completo:

```js
// Genera public/assets/maps/zoo.tmj: el zoo de verdad (96x60), lógico (césped/camino/valla/puerta/edificio).
// El arte real lo pone el autotiler en el juego; este mapa también sirve en modo provisional.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const W = 96;
const H = 60;
const T = 16;
/** El parque de siempre (48x35) queda en el centro: lo suyo se escribe en sus coordenadas de antes. */
const OX = 24;
const OY = 20;
const GRASS = 1;
const PATH = 2;
const FENCE = 3;
const GATE = 4;
const BUILDING = 5;

const data = new Array(W * H).fill(GRASS);
const set = (x, y, gid) => {
  data[y * W + x] = gid;
};
const fill = (x0, y0, x1, y1, gid) => {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, gid);
};
/** Igual, en coordenadas del parque de siempre. */
const pfill = (x0, y0, x1, y1, gid) => fill(x0 + OX, y0 + OY, x1 + OX, y1 + OY, gid);

// Parque. Caminos de 2 de ancho: anillo exterior y cruz central.
pfill(2, 2, 45, 3, PATH);
pfill(2, 30, 45, 31, PATH);
pfill(2, 2, 3, 31, PATH);
pfill(44, 2, 45, 31, PATH);
pfill(2, 16, 45, 17, PATH);
pfill(23, 2, 24, 31, PATH);
// Entrada: el camino central baja hasta el portón, en el borde de abajo del mapa.
fill(23 + OX, 32 + OY, 24 + OX, H - 1, PATH);
// Plaza en el cruce (8x8) con la fuente en medio sobre una isla de césped de 4x4, como el parque de la v1.
pfill(20, 13, 27, 20, PATH);
pfill(22, 15, 25, 18, GRASS);

// Avenidas a las zonas nuevas.
fill(12, 17, 79, 18, PATH); // norte: sabana y elefantes
fill(23 + OX, 19, 24 + OX, OY + 1, PATH); // baja de la avenida norte a la cruz central
fill(5, 16 + OY, 1 + OX, 17 + OY, PATH); // oeste (polo): sigue el camino del medio
fill(46 + OX, 16 + OY, 93, 17 + OY, PATH); // este (granja)

const objects = [];
let nextId = 1;
// Alto por defecto; la pantera es más alta (10) para que quepa la catarata entera.
const DEFAULT_EH = 8;
/** Recinto del parque de siempre, en sus coordenadas de antes. */
const park = (e) => ({ ...e, x: e.x + OX, y: e.y + OY, gateX: e.gateX + OX, gateRow: e.gateRow + OY, link: [e.link[0] + OY, e.link[1] + OY] });
// ew: ancho; eh: alto; gateRow: fila de la valla con la puerta; link: filas de camino hasta la avenida.
// En el parque el pasillo central deja solo 2 casillas de césped a cada lado para que al andar se vea el
// interior: pantera y panda son más anchos (15) y el león se arrima al centro. La cabra no se mueve: a su
// lado está el puesto de la tienda.
const enclosures = [
  park({ penId: 'leon', biome: 'savannah', x: 9, y: 5, ew: 12, gateX: 14, gateRow: 12, link: [13, 15] }),
  park({ penId: 'cabra', biome: 'alpine', x: 30, y: 5, ew: 12, gateX: 35, gateRow: 12, link: [13, 15] }),
  park({ penId: 'pantera', biome: 'rainforest', x: 6, y: 19, ew: 15, eh: 10, gateX: 12, gateRow: 19, link: [18, 18] }),
  park({ penId: 'panda', biome: 'bamboo', x: 27, y: 21, ew: 15, gateX: 33, gateRow: 21, link: [18, 20] }),
  // Norte, sabana: el recinto grande y, al lado, dos jaulas de elefantes con un pasillo de césped (64-65).
  { penId: 'sabana', biome: 'savannah', x: 14, y: 3, ew: 22, eh: 12, gateX: 24, gateRow: 14, link: [15, 16] },
  { penId: 'elefantes-africanos', biome: 'savannah', x: 52, y: 5, ew: 12, eh: 10, gateX: 57, gateRow: 14, link: [15, 16] },
  { penId: 'elefantes-asiaticos', biome: 'savannah', x: 66, y: 5, ew: 12, eh: 10, gateX: 71, gateRow: 14, link: [15, 16] },
  // Oeste, polo.
  { penId: 'pinguinos', biome: 'tundra', x: 5, y: 25, ew: 16, eh: 10, gateX: 12, gateRow: 34, link: [35, 35] },
  // Este, granja: ovejas y estanque arriba de la avenida, establo debajo.
  { penId: 'ovejas', biome: 'grassland', x: 72, y: 25, ew: 11, eh: 10, gateX: 77, gateRow: 34, link: [35, 35] },
  { penId: 'estanque', biome: 'grassland', x: 84, y: 25, ew: 10, eh: 10, gateX: 88, gateRow: 34, link: [35, 35] },
  { penId: 'establo', biome: 'grassland', x: 74, y: 39, ew: 16, eh: 10, gateX: 81, gateRow: 39, link: [38, 38] },
];
for (const e of enclosures) {
  const EW = e.ew;
  const EH = e.eh ?? DEFAULT_EH;
  fill(e.x, e.y, e.x + EW - 1, e.y, FENCE);
  fill(e.x, e.y + EH - 1, e.x + EW - 1, e.y + EH - 1, FENCE);
  fill(e.x, e.y, e.x, e.y + EH - 1, FENCE);
  fill(e.x + EW - 1, e.y, e.x + EW - 1, e.y + EH - 1, FENCE);
  fill(e.gateX, e.gateRow, e.gateX + 1, e.gateRow, GATE);
  fill(e.gateX, e.link[0], e.gateX + 1, e.link[1], PATH);
  const penProp = [{ name: 'penId', type: 'string', value: e.penId }];
  objects.push({
    id: nextId++, name: `recinto-${e.penId}`, type: 'recinto',
    x: e.x * T, y: e.y * T, width: EW * T, height: EH * T, rotation: 0, visible: true,
    properties: [...penProp, { name: 'biome', type: 'string', value: e.biome }],
  });
  objects.push({
    id: nextId++, name: `puerta-${e.penId}`, type: 'puerta',
    x: e.gateX * T, y: e.gateRow * T, width: 2 * T, height: T, rotation: 0, visible: true, properties: penProp,
  });
}

// Tienda: puesto de mercado 5x5 con la puerta (2 casillas) debajo y conexión al camino.
pfill(25, 4, 29, 8, BUILDING);
pfill(27, 9, 28, 9, GATE);
pfill(27, 10, 28, 13, PATH);
objects.push({ id: nextId++, name: 'tienda', type: 'tienda', x: (25 + OX) * T, y: (4 + OY) * T, width: 5 * T, height: 5 * T, rotation: 0, visible: true });
objects.push({ id: nextId++, name: 'puerta-tienda', type: 'puertaTienda', x: (27 + OX) * T, y: (9 + OY) * T, width: 2 * T, height: T, rotation: 0, visible: true });

// Props de decoración: x,y = punto de apoyo (centro de la base) en px.
// blockW/blockH: rectángulo que el animal no puede pisar (centrado en la base); flat: pieza plana
// (agua, meseta) que se dibuja pegada al suelo, por debajo de animales y personas; zone: zona que
// anuncia un cartel de zona.
const prop = (name, px, py, { block = null, flat = false, z = 0, zone = null } = {}) => {
  const properties = [
    { name: 'prop', type: 'string', value: name },
    { name: 'blocks', type: 'bool', value: block !== null },
    { name: 'flat', type: 'bool', value: flat },
    { name: 'z', type: 'int', value: z },
  ];
  if (block) properties.push({ name: 'blockW', type: 'int', value: block[0] }, { name: 'blockH', type: 'int', value: block[1] });
  if (zone) properties.push({ name: 'zone', type: 'string', value: zone });
  objects.push({ id: nextId++, name: `${name}-${nextId}`, type: 'prop', x: px, y: py, width: 0, height: 0, rotation: 0, visible: true, properties });
};
/** Prop apoyado en la casilla (tx,ty) del mapa: centro horizontal de la casilla, borde inferior. */
const at = (name, tx, ty, opts) => prop(name, tx * T + T / 2, (ty + 1) * T, opts);
/** Lo mismo, en coordenadas del parque de siempre. */
const pat = (name, tx, ty, opts) => at(name, tx + OX, ty + OY, opts);
const pprop = (name, px, py, opts) => prop(name, px + OX * T, py + OY * T, opts);
/** Piezas que se pisan (el animal pasa por encima): hierba y flores. */
const WALKABLE = /^(grass-tall-dry|flowers)/;
/** Ancho (px) de las piezas con volumen que no dan su bloqueo: se bloquea su base (ancho × 1 casilla). */
const BASE_W = {
  'rock-grey': 16, 'rock-grey-big': 32, 'pine-small': 16, 'rock-savannah': 16, 'rock-savannah-big': 32, 'jungle-tree': 32, 'bush-jungle': 32,
  'rock-snow': 16, 'rock-snow-big': 32, 'pine-snow-small': 16, sunflowers: 16, stump: 32, bush: 16,
};
/**
 * Igual, en coordenadas del interior de un recinto (0,0 = primera casilla dentro de la valla).
 * Dentro de un recinto toda pieza no plana bloquea (su base), salvo las pisables.
 */
const inPen = (e) => (name, cx, cy, opts = {}) => {
  const solid = !opts.flat && !WALKABLE.test(name) && !opts.block;
  if (solid && !BASE_W[name]) throw new Error(`Falta el ancho de la base de "${name}" en BASE_W`);
  at(name, e.x + 1 + cx, e.y + 1 + cy, solid ? { ...opts, block: [BASE_W[name], T] } : opts);
};

const [leon, cabra, pantera, panda, sabana, africanos, asiaticos, pinguinos, ovejas, estanque, establo] = enclosures.map(inPen);
// 🦁 Sabana (puerta abajo: se deja libre la zona central inferior).
leon('acacia', 2, 2, { block: [32, 16] });
leon('acacia-small', 8, 5, { block: [16, 16] });
leon('rock-savannah-big', 6, 1);
leon('rock-savannah', 1, 5);
for (const [cx, cy] of [[5, 1], [9, 2], [3, 3], [7, 3]]) leon('grass-tall-dry', cx, cy);
leon('grass-tall-dry-big', 0, 1);
// 🐐 Montaña (puerta abajo). La meseta es plana: la cabra puede subir.
cabra('plateau', 8, 4, { flat: true });
cabra('cave', 2, 1, { block: [48, 16] });
cabra('pine', 1, 4, { block: [16, 16] });
cabra('pine-small', 5, 1);
cabra('rock-grey', 5, 3);
cabra('rock-grey-big', 0, 5);
// 🐆 Selva con catarata (puerta arriba), a la derecha junto al pasillo. Montada como enseña el autor
// del pack: bloque alto de acantilado a cada lado (con su remate), la catarata en medio empalmando con la
// roca y el agua al pie, montada con las casillas 16x16 del terrain como pide el autor (catarata
// arriba/medio/abajo alineada con el acantilado C/D y empalmando con el agua E). 112x112 (7x7).
pantera('waterfall', 9, 7, { flat: true, block: [112, 104] });
pantera('lilypad', 10, 6, { flat: true, z: 2 });
pantera('palm', 1, 2, { block: [16, 8] });
pantera('palm', 2, 7, { block: [16, 8] });
pantera('bush-jungle', 1, 5);
pantera('flowers-red', 3, 1);
// 🐼 Bosquecillo de bambú en el lado de fuera y abajo (puerta arriba). El bambú mide 5-6 casillas:
// arriba taparía el camino y el cartel, en el centro escondería al panda y junto al pasillo central
// taparía el recinto; ahí solo un bambú pequeño en la esquina de abajo.
panda('bamboo-big', 12, 5, { block: [32, 16] });
panda('bamboo-big', 12, 2, { block: [32, 16] });
panda('bamboo-mid', 10, 5, { block: [32, 16] });
panda('bamboo-mid', 8, 5, { block: [32, 16] });
panda('bamboo-small', 10, 2, { block: [16, 16] });
panda('bamboo-small', 0, 5, { block: [16, 16] });
panda('log', 4, 3, { block: [32, 16] });
panda('flowers', 3, 2);
panda('flowers-red', 8, 2);
// 🦒 Sabana grande (interior 20x10, puerta abajo en las columnas 9-10: esa franja queda libre).
sabana('acacia', 3, 3, { block: [32, 16] });
sabana('acacia', 15, 2, { block: [32, 16] });
sabana('acacia-small', 13, 6, { block: [16, 16] });
sabana('rock-savannah-big', 7, 1);
sabana('rock-savannah', 17, 7);
sabana('rock-savannah', 1, 8);
for (const [cx, cy] of [[5, 2], [11, 3], [14, 8], [2, 5], [18, 4]]) sabana('grass-tall-dry', cx, cy);
sabana('grass-tall-dry-big', 0, 1);
// 🐘 Elefantes (interior 10x8, puerta abajo en las columnas 4-5): poca cosa, que los elefantes son grandes.
africanos('acacia', 1, 2, { block: [32, 16] });
africanos('rock-savannah-big', 7, 1);
for (const [cx, cy] of [[4, 1], [8, 5]]) africanos('grass-tall-dry', cx, cy);
asiaticos('acacia-small', 8, 3, { block: [16, 16] });
asiaticos('rock-savannah', 1, 1);
asiaticos('rock-savannah-big', 1, 6);
for (const [cx, cy] of [[5, 2], [7, 6]]) asiaticos('grass-tall-dry', cx, cy);
// 🐧 Polo (interior 14x8, puerta abajo en las columnas 6-7): nieve y una charca.
pinguinos('pond-tundra', 10, 3, { flat: true, block: [48, 40] });
pinguinos('rock-snow-big', 1, 1);
pinguinos('rock-snow', 3, 5);
pinguinos('pine-snow-small', 0, 6);
pinguinos('pine-snow', 13, 6, { block: [16, 16] });
// 🐑 Ovejas (interior 9x8, puerta abajo en las columnas 4-5). Aquí entran también los visitantes.
ovejas('sunflowers', 0, 1);
ovejas('stump', 7, 1);
for (const [cx, cy] of [[3, 2], [6, 5]]) ovejas('flowers', cx, cy);
// 🦆 Estanque (interior 8x8, puerta abajo en las columnas 3-4).
estanque('pond-grassland', 3, 3, { flat: true, block: [48, 40] });
estanque('lilypad', 3, 2, { flat: true, z: 2 });
estanque('lilypad-flower', 4, 3, { flat: true, z: 2 });
estanque('sunflowers', 7, 1);
estanque('flowers', 0, 6);
// 🐴 Establo (interior 14x8, puerta arriba en las columnas 6-7).
establo('stump', 1, 6);
establo('log', 11, 6, { block: [32, 16] });
establo('sunflowers', 13, 1);
establo('bush', 0, 1);
for (const [cx, cy] of [[3, 3], [10, 2]]) establo('flowers', cx, cy);

// Parque.
// La fuente animada en el centro de la plaza (80x64: tapa la isla de césped de 4x4).
pprop('fountain', 24 * T, 19 * T);
for (const [x, y] of [[4, 6], [4, 13], [6, 8], [6, 11], [4, 22], [4, 26], [21, 7], [21, 11], [21, 23], [22, 27], [26, 23], [25, 27], [42, 6], [42, 11], [42, 22], [42, 27], [33, 4], [39, 4]]) {
  pat('tree', x, y);
}
for (const [x, y] of [[7, 13], [22, 22], [26, 25], [43, 14], [10, 4], [15, 29], [36, 29]]) pat('bush', x, y);
for (const [x, y] of [[13, 13], [34, 13], [11, 18], [32, 20]]) pat('sign', x, y);
for (const [x, y] of [[22, 9], [25, 11], [22, 25], [25, 25]]) pat('lamp', x, y);
for (const [x, y] of [[17, 14], [7, 14], [29, 19], [39, 19]]) pprop('bench', (x + 1) * T, (y + 1) * T);
pprop('flowerbed', 22 * T, 5 * T);
pat('barrel', 26, 9);
pat('crate-fruit', 29, 9);

// Zonas nuevas: cartel de cada recinto junto a su puerta y cartel de zona a la entrada.
for (const [x, y] of [[23, 15], [56, 15], [70, 15], [11, 35], [76, 35], [87, 35], [80, 38]]) at('sign', x, y);
at('sign-zone', 49, 20, { zone: 'sabana' });
at('sign-zone', 24, 35, { zone: 'polo' });
at('sign-zone', 70, 35, { zone: 'granja' });
for (const [x, y] of [
  [10, 6], [10, 12], [38, 6], [38, 12], [44, 9], [50, 9], [80, 6], [80, 12], [30, 20], [64, 20], [8, 20], [86, 20],
  [3, 30], [23, 30], [8, 40], [16, 42], [22, 46], [4, 50], [14, 52],
  [71, 44], [92, 42], [80, 52], [90, 52], [74, 22], [86, 22],
]) {
  at('tree', x, y);
}
for (const [x, y] of [[12, 20], [40, 16], [62, 16], [6, 38], [90, 38]]) at('bush', x, y);
for (const [x, y] of [[30, 16], [10, 38], [72, 38]]) prop('bench', (x + 1) * T, (y + 1) * T);

// Muro del parque (madera sobre piedra) alrededor de todo, con el portón abajo, donde acaba el camino central.
const gatePx = (24 + OX) * T;
for (let x = 0; x < W * T; x += 32) prop('park-wall', x + 16, 2 * T);
for (let x = 0; x < W * T; x += 32) if (x + 32 <= gatePx - 2 * T || x >= gatePx + 2 * T) prop('park-wall', x + 16, H * T);
for (let y = 3; y <= H - 3; y++) {
  prop('park-wall-side', T, y * T);
  prop('park-wall-side', (W - 1) * T, y * T);
}
prop('park-gate', gatePx, H * T);

objects.push({
  id: nextId++, name: 'inicio', type: 'punto', point: true,
  x: (23 + OX) * T + T / 2, y: (30 + OY) * T + T / 2, width: 0, height: 0, rotation: 0, visible: true,
});

const walkable = [{ name: 'walkable', type: 'bool', value: true }];
const map = {
  compressionlevel: -1, width: W, height: H, tilewidth: T, tileheight: T, infinite: false,
  orientation: 'orthogonal', renderorder: 'right-down', tiledversion: '1.11.0', type: 'map', version: '1.10',
  nextlayerid: 3, nextobjectid: nextId,
  layers: [
    { id: 1, name: 'suelo', type: 'tilelayer', width: W, height: H, x: 0, y: 0, opacity: 1, visible: true, data },
    { id: 2, name: 'objetos', type: 'objectgroup', draworder: 'topdown', x: 0, y: 0, opacity: 1, visible: true, objects },
  ],
  tilesets: [{
    firstgid: 1, name: 'placeholder', image: '../tiles/placeholder.png', imagewidth: T * 5, imageheight: T,
    tilewidth: T, tileheight: T, tilecount: 5, columns: 5, margin: 0, spacing: 0,
    tiles: [{ id: PATH - 1, properties: walkable }, { id: GATE - 1, properties: walkable }],
  }],
};

const out = resolve(dirname(fileURLToPath(import.meta.url)), '../public/assets/maps/zoo.tmj');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(map, null, 1) + '\n');
console.log('Mapa generado en', out);
```

- [ ] **Step 5: Piezas nuevas en `art/art.config.json`**

Dentro de `props`, después de `"ground-bamboo"`:

```json
    "ground-tundra": { "zip": "biomeA", "file": "Original/16x16/tundra/tilesets/vectoraith_tileset_full_terrain_tundra.png", "x": 0, "y": 16, "w": 16, "h": 16 },
    "ground-grassland": { "zip": "biomeB", "file": "16x16/grassland/tilesets/vectoraith_tileset_full_terrain_grassland.png", "x": 0, "y": 16, "w": 16, "h": 16 },
    "pond-tundra": { "zip": "biomeA", "file": "Original/16x16/tundra/tilesets/vectoraith_tileset_full_terrain_tundra.png", "x": 0, "y": 128, "w": 48, "h": 48, "animate": { "step": 80, "count": 3, "fps": 3 } },
    "pond-grassland": { "zip": "biomeB", "file": "16x16/grassland/tilesets/vectoraith_tileset_full_terrain_grassland.png", "x": 0, "y": 128, "w": 48, "h": 48, "animate": { "step": 80, "count": 3, "fps": 3 } },
    "rock-snow": { "zip": "biomeA", "file": "Original/16x16/tundra/tilesets/vectoraith_tileset_details_tundra.png", "x": 0, "y": 96, "w": 16, "h": 16 },
    "rock-snow-big": { "zip": "biomeA", "file": "Original/16x16/tundra/tilesets/vectoraith_tileset_details_tundra.png", "x": 0, "y": 112, "w": 32, "h": 32 },
    "pine-snow": { "zip": "biomeA", "file": "Original/16x16/tundra/tilesets/vectoraith_tileset_details_tundra.png", "x": 48, "y": 0, "w": 32, "h": 48 },
    "pine-snow-small": { "zip": "biomeA", "file": "Original/16x16/tundra/tilesets/vectoraith_tileset_details_tundra.png", "x": 32, "y": 16, "w": 16, "h": 32 },
    "sunflowers": { "zip": "biomeB", "file": "16x16/grassland/tilesets/vectoraith_tileset_details_grassland.png", "x": 16, "y": 0, "w": 16, "h": 32 },
    "stump": { "zip": "biomeB", "file": "16x16/grassland/tilesets/vectoraith_tileset_details_grassland.png", "x": 0, "y": 64, "w": 32, "h": 32 },
    "sign-zone": { "zip": "wooden", "file": "Original/16x16/vectoraith_tileset_buildings_wooden_1.png", "x": 80, "y": 48, "w": 16, "h": 16 },
```

Las coordenadas están leídas de las hojas con `npm run art:grid` (rejilla de 16 px): los tilesets de tundra y pradera tienen la misma distribución que los que ya usa el juego (suelo liso en `0,16`, charca de 48×48 en `0,128` con sus tres fotogramas cada 80 px).

- [ ] **Step 6: Carteles de zona**

En `src/data/strings.ts`, después de `'animal.panda'`:

```ts
  'zone.sabana': 'Sabana',
  'zone.polo': 'Polo',
  'zone.granja': 'Granja',
```

En `src/world/Decor.ts`, importar `STRINGS_ES` y `type StringKey` de `../data/strings`, y sustituir el bloque `if (p.prop === 'sign') { … }` por:

```ts
      const label = signLabel(p, enclosures);
      if (label) {
        scene.add
          .text(p.x, p.y - TILE - 2, label, {
            fontFamily: 'sans-serif',
            fontSize: p.zone ? '7px' : '6px',
            fontStyle: p.zone ? 'bold' : 'normal',
            color: '#ffffff',
            stroke: '#3e2723',
            strokeThickness: 3,
          })
          .setOrigin(0.5, 1)
          .setResolution(4)
          .setDepth(depthForY(p.y) + 1);
      }
```

y añadir, encima de `export const Decor`:

```ts
/** Texto de un cartel: el nombre de su zona, o el del recinto que tiene más cerca. Null si no es un cartel. */
function signLabel(p: PropInfo, enclosures: EnclosureInfo[]): string | null {
  if (p.prop === 'sign-zone') {
    const key = `zone.${p.zone}`;
    return key in STRINGS_ES ? t(key as StringKey) : null;
  }
  if (p.prop !== 'sign') return null;
  const enclosure = nearestEnclosure(enclosures, p.x, p.y);
  return enclosure && isPenId(enclosure.penId) ? t(PENS[enclosure.penId].nameKey) : null;
}
```

(`PropInfo` se importa de `../core/tiledmap` junto a `EnclosureInfo`.) Los carteles de los recintos nuevos no llevan texto hasta la Task 4, cuando esos ids pasan a ser recintos del juego.

- [ ] **Step 7: Generar el mapa y ver que pasa**

Run: `npm run make:zoo-map; npm test; npm run typecheck`
Expected: PASS. Si falla «los props se apoyan siempre en césped» o «no hay caminos de 1 casilla», el mensaje da la casilla: mover esa pieza una casilla en el script y regenerar.

- [ ] **Step 8: Importar el arte y mirar el mapa**

Run: `npm run art:import`
Expected: `Arte importado en …public/art`, sin errores de «No está … en …zip».

Run: `npm run art:props-sheet -- ../../zooesponji-private/art-work/plantillas/piezas_para_ver.png` y abrir la imagen con la herramienta Read.
Expected: `ground-tundra` es nieve lisa, `ground-grassland` es hierba lisa, `pond-tundra` y `pond-grassland` son una charca entera con su borde, y `rock-snow`, `rock-snow-big`, `pine-snow`, `pine-snow-small`, `sunflowers` y `stump` son una pieza completa cada una, sin trozos de la vecina. Si un recorte corta la pieza, ajustar su `x`, `y`, `w`, `h` mirando la hoja con `npm run art:grid -- <zip> "<archivo>" ../../zooesponji-private/art-work/plantillas/rejilla.png` y volver a importar.

Arrancar el juego con la herramienta de vista previa (`preview_start`, servidor `dev`) y recorrer el mapa con `window.__ZOO__.goToTile(24, 16)`, `goToTile(12, 36)` y `goToTile(80, 37)`.
Expected: se ven las tres zonas con su suelo, sus vallas y su cartel de zona; el parque del centro está igual que antes; los recintos nuevos están vacíos (todavía no son recintos del juego).

- [ ] **Step 9: E2E y commit**

Run: `npm run test:e2e`
Expected: PASS (los e2e usan casillas que piden al juego, no fijas).

```bash
git add scripts/make-zoo-map.mjs public/assets/maps/zoo.tmj art/art.config.json src tests
git commit -m "feat: mapa de 96x60 con sabana, polo y granja alrededor del parque"
```

---

### Task 3: Once especies nuevas

**Files:**
- Modify: `game/src/data/animals.ts`, `game/src/data/strings.ts`
- Modify: `game/art/art.config.json` (sección `animals`)
- Test: `game/tests/unit/content.test.ts`, `game/tests/unit/manifest.test.ts`

**Interfaces:**
- Produces: `ANIMAL_IDS` con estos 15 ids, en este orden: `leon`, `cabra`, `pantera`, `panda`, `jirafa`, `cebra`, `gacela`, `pinguino`, `oveja`, `caballo`, `gallina`, `gallo`, `pato`, `elefante-africano`, `elefante-asiatico`. Cada uno con `nameKey` `animal.<id>`, `extraNameKey` `shop.extra.<id>` y texto `shop.about.<id>`.

- [ ] **Step 1: Escribir los tests que fallan**

En `tests/unit/content.test.ts`, sustituir `'contiene los 4 animales actuales'` por:

```ts
  it('están las 4 especies de siempre y las 11 nuevas', () => {
    expect([...ANIMAL_IDS]).toEqual([
      'leon', 'cabra', 'pantera', 'panda',
      'jirafa', 'cebra', 'gacela', 'pinguino', 'oveja', 'caballo', 'gallina', 'gallo', 'pato', 'elefante-africano', 'elefante-asiatico',
    ]);
  });

  // Tabla «Comidas» del diseño del zoo grande: [especie, come, especial, rechaza].
  const TRAYS: [string, FoodId[], FoodId[], FoodId[]][] = [
    ['jirafa', ['lechuga', 'manzana'], ['platano'], ['carne', 'calcetin']],
    ['cebra', ['zanahoria', 'lechuga'], ['manzana'], ['piedra', 'pescado']],
    ['gacela', ['zanahoria', 'lechuga'], ['maiz'], ['carne', 'huevo']],
    ['pinguino', ['pescado'], ['piedra'], ['zanahoria', 'pan', 'calcetin']],
    ['oveja', ['lechuga', 'maiz'], ['gallina'], ['carne', 'calcetin']],
    ['caballo', ['zanahoria', 'maiz'], ['manzana'], ['piedra', 'huevo']],
    ['gallina', ['lechuga', 'maiz'], ['pan'], ['piedra', 'pescado']],
    ['gallo', ['maiz', 'pan'], [], ['carne', 'huevo', 'calcetin']],
    ['pato', ['lechuga', 'maiz'], ['pescado'], ['piedra', 'pan']],
    ['elefante-africano', ['lechuga', 'manzana'], ['platano'], ['carne', 'calcetin']],
    ['elefante-asiatico', ['lechuga', 'platano'], ['manzana'], ['piedra', 'pescado']],
  ];
  it.each(TRAYS)('%s: come, especial y rechaza lo que dice el diseño', (id, come, especial, rechaza) => {
    if (!isAnimalId(id)) throw new Error(`Especie desconocida: ${id}`);
    const by = (reaction: string) => FOOD_IDS.filter((food) => ANIMALS[id].reactions[food] === reaction);
    expect(by('come')).toEqual(come);
    expect(by('especial')).toEqual(especial);
    expect(by('rechaza')).toEqual(rechaza);
  });

  // Tabla «Monedas y precios»: [especie, come, especial, otro animal].
  const COINS: [string, number, number | undefined, number][] = [
    ['pato', 3, 5, 30], ['oveja', 4, 6, 40], ['caballo', 5, 8, 60], ['gallina', 3, 5, 30], ['gallo', 3, undefined, 30],
    ['pinguino', 6, 9, 80], ['jirafa', 8, 12, 150], ['cebra', 6, 9, 120], ['gacela', 5, 8, 100],
    ['elefante-africano', 10, 15, 200], ['elefante-asiatico', 10, 15, 200],
  ];
  it.each(COINS)('%s paga %i (especial %s) y otro igual cuesta %i', (id, come, especial, extra) => {
    if (!isAnimalId(id)) throw new Error(`Especie desconocida: ${id}`);
    expect(ANIMALS[id].coins).toEqual(especial === undefined ? { come } : { come, especial });
    expect(ANIMALS[id].extraCost).toBe(extra);
  });

  it.each(ANIMAL_IDS)('%s tiene la frase del tendero y el texto de «otro»', (id) => {
    const strings: Record<string, string> = STRINGS_ES;
    expect(strings[`shop.about.${id}`], `shop.about.${id}`).toBeTruthy();
    if (id !== 'leon') expect(strings[`shop.extra.${id}`], `shop.extra.${id}`).toBeTruthy();
  });
```

(Las listas de `come`/`especial`/`rechaza` van en el orden de `FOOD_IDS`, que es el de la bandeja.)

En `tests/unit/manifest.test.ts`, la función `valid()` construye los animales a mano con las 4 especies; pasa a construirlos desde `ANIMAL_IDS` para no romperse con cada especie nueva:

```ts
import { ANIMAL_IDS } from '../../src/data/animals';
```

```ts
    animals: { ...Object.fromEntries(ANIMAL_IDS.map((id) => [id, sheet(16, 16)])), leon: sheet(24, 24), pantera: sheet(24, 24), panda: sheet(32, 32) },
```

- [ ] **Step 2: Ver que fallan**

Run: `npm test -- content`
Expected: FAIL (`ANIMAL_IDS` tiene 4; «Especie desconocida: jirafa»).

- [ ] **Step 3: Especies en `src/data/animals.ts`**

`ANIMAL_IDS`:

```ts
export const ANIMAL_IDS = [
  'leon', 'cabra', 'pantera', 'panda',
  'jirafa', 'cebra', 'gacela', 'pinguino', 'oveja', 'caballo', 'gallina', 'gallo', 'pato', 'elefante-africano', 'elefante-asiatico',
] as const;
```

Y en `ANIMALS`, después de `panda`:

```ts
  jirafa: {
    id: 'jirafa',
    nameKey: 'animal.jirafa',
    emoji: '🦒',
    reactions: { lechuga: 'come', manzana: 'come', platano: 'especial', carne: 'rechaza', calcetin: 'rechaza' },
    coins: { come: 8, especial: 12 },
    extraCost: 150,
    extraNameKey: 'shop.extra.jirafa',
  },
  cebra: {
    id: 'cebra',
    nameKey: 'animal.cebra',
    emoji: '🦓',
    reactions: { lechuga: 'come', zanahoria: 'come', manzana: 'especial', pescado: 'rechaza', piedra: 'rechaza' },
    coins: { come: 6, especial: 9 },
    extraCost: 120,
    extraNameKey: 'shop.extra.cebra',
  },
  gacela: {
    id: 'gacela',
    nameKey: 'animal.gacela',
    emoji: '🦌',
    reactions: { lechuga: 'come', zanahoria: 'come', maiz: 'especial', carne: 'rechaza', huevo: 'rechaza' },
    coins: { come: 5, especial: 8 },
    extraCost: 100,
    extraNameKey: 'shop.extra.gacela',
  },
  pinguino: {
    id: 'pinguino',
    nameKey: 'animal.pinguino',
    emoji: '🐧',
    reactions: { pescado: 'come', piedra: 'especial', zanahoria: 'rechaza', pan: 'rechaza', calcetin: 'rechaza' },
    coins: { come: 6, especial: 9 },
    extraCost: 80,
    extraNameKey: 'shop.extra.pinguino',
  },
  oveja: {
    id: 'oveja',
    nameKey: 'animal.oveja',
    emoji: '🐑',
    reactions: { lechuga: 'come', maiz: 'come', gallina: 'especial', carne: 'rechaza', calcetin: 'rechaza' },
    coins: { come: 4, especial: 6 },
    extraCost: 40,
    extraNameKey: 'shop.extra.oveja',
  },
  caballo: {
    id: 'caballo',
    nameKey: 'animal.caballo',
    emoji: '🐴',
    reactions: { zanahoria: 'come', maiz: 'come', manzana: 'especial', huevo: 'rechaza', piedra: 'rechaza' },
    coins: { come: 5, especial: 8 },
    extraCost: 60,
    extraNameKey: 'shop.extra.caballo',
  },
  gallina: {
    id: 'gallina',
    nameKey: 'animal.gallina',
    emoji: '🐔',
    reactions: { maiz: 'come', lechuga: 'come', pan: 'especial', pescado: 'rechaza', piedra: 'rechaza' },
    coins: { come: 3, especial: 5 },
    extraCost: 30,
    extraNameKey: 'shop.extra.gallina',
  },
  gallo: {
    id: 'gallo',
    nameKey: 'animal.gallo',
    emoji: '🐓',
    reactions: { maiz: 'come', pan: 'come', huevo: 'rechaza', carne: 'rechaza', calcetin: 'rechaza' },
    coins: { come: 3 },
    extraCost: 30,
    extraNameKey: 'shop.extra.gallo',
  },
  pato: {
    id: 'pato',
    nameKey: 'animal.pato',
    emoji: '🦆',
    reactions: { maiz: 'come', lechuga: 'come', pescado: 'especial', pan: 'rechaza', piedra: 'rechaza' },
    coins: { come: 3, especial: 5 },
    extraCost: 30,
    extraNameKey: 'shop.extra.pato',
  },
  'elefante-africano': {
    id: 'elefante-africano',
    nameKey: 'animal.elefante-africano',
    emoji: '🐘',
    reactions: { lechuga: 'come', manzana: 'come', platano: 'especial', carne: 'rechaza', calcetin: 'rechaza' },
    coins: { come: 10, especial: 15 },
    extraCost: 200,
    extraNameKey: 'shop.extra.elefante-africano',
  },
  'elefante-asiatico': {
    id: 'elefante-asiatico',
    nameKey: 'animal.elefante-asiatico',
    emoji: '🐘',
    reactions: { lechuga: 'come', platano: 'come', manzana: 'especial', pescado: 'rechaza', piedra: 'rechaza' },
    coins: { come: 10, especial: 15 },
    extraCost: 200,
    extraNameKey: 'shop.extra.elefante-asiatico',
  },
```

- [ ] **Step 4: Textos en `src/data/strings.ts`**

Después de `'animal.panda'`:

```ts
  'animal.jirafa': 'Jirafa',
  'animal.cebra': 'Cebra',
  'animal.gacela': 'Gacela',
  'animal.pinguino': 'Pingüino',
  'animal.oveja': 'Oveja',
  'animal.caballo': 'Caballo',
  'animal.gallina': 'Gallina',
  'animal.gallo': 'Gallo',
  'animal.pato': 'Pato',
  'animal.elefante-africano': 'Elefante africano',
  'animal.elefante-asiatico': 'Elefante asiático',
```

Después de `'shop.about.panda'`:

```ts
  'shop.about.jirafa': '¡La jirafa llega a las hojas más altas!',
  'shop.about.cebra': '¡No hay dos cebras con las mismas rayas!',
  'shop.about.gacela': '¡La gacela da unos saltos enormes!',
  'shop.about.pinguino': '¡Los pingüinos se regalan piedrecitas!',
  'shop.about.oveja': '¡La oveja es blandita como una nube!',
  'shop.about.caballo': '¡Al caballo le encantan las manzanas!',
  'shop.about.gallina': '¡La gallina pone un huevo cada día!',
  'shop.about.gallo': '¡El gallo canta al salir el sol!',
  'shop.about.pato': '¡El pato nada sin mojarse las plumas!',
  'shop.about.elefante-africano': '¡El elefante africano tiene las orejas enormes!',
  'shop.about.elefante-asiatico': '¡El elefante asiático se ducha con la trompa!',
```

Después de `'shop.extra.panda'`:

```ts
  'shop.extra.jirafa': 'Otra jirafa',
  'shop.extra.cebra': 'Otra cebra',
  'shop.extra.gacela': 'Otra gacela',
  'shop.extra.pinguino': 'Otro pingüino',
  'shop.extra.oveja': 'Otra oveja',
  'shop.extra.caballo': 'Otro caballo',
  'shop.extra.gallina': 'Otra gallina',
  'shop.extra.gallo': 'Otro gallo',
  'shop.extra.pato': 'Otro pato',
  'shop.extra.elefante-africano': 'Otro elefante africano',
  'shop.extra.elefante-asiatico': 'Otro elefante asiático',
```

- [ ] **Step 5: Hoja de cada especie en `art/art.config.json`**

Dentro de `animals`, después de `"panda"`:

```json
    "jirafa": { "zip": "wild", "file": "16x16/Default format/$giraffe.png", "override": "jirafa.png" },
    "cebra": { "zip": "wild", "file": "16x16/Default format/$zebra.png", "override": "cebra.png" },
    "gacela": { "zip": "wild", "file": "16x16/Default format/$gazelle_thomson.png", "override": "gacela.png" },
    "pinguino": { "zip": "wild", "file": "16x16/Default format/$penguin_emperor.png", "override": "pinguino.png" },
    "oveja": { "zip": "farm", "file": "16x16/Default Format/$sheep.png", "override": "oveja.png" },
    "caballo": { "zip": "farm", "file": "16x16/Default Format/$horse.png", "override": "caballo.png" },
    "gallina": { "zip": "farm", "file": "16x16/Default Format/$chicken_hen.png", "override": "gallina.png" },
    "gallo": { "zip": "farm", "file": "16x16/Default Format/$chicken_rooster.png", "override": "gallo.png" },
    "pato": { "zip": "farm", "file": "16x16/Default Format/$duck.png", "override": "pato.png" },
    "elefante-africano": { "zip": "wild", "file": "16x16/Default format/$elephant_african.png", "override": "elefante-africano.png" },
    "elefante-asiatico": { "zip": "wild", "file": "16x16/Default format/$elephant_asian.png", "override": "elefante-asiatico.png" },
```

Tamaño de fotograma de estas hojas (el juego lo lee del manifiesto, no hay que escribirlo): jirafa y elefantes 48×48; cebra y caballo 32×32; el resto 16×16.

- [ ] **Step 6: Ver que todo pasa e importar**

Run: `npm test; npm run typecheck`
Expected: PASS. El test «rechaza al menos una comida que otro animal sí come» pasa para las 15 especies.

Run: `npm run art:import`
Expected: sin errores; `public/art/manifest.json` tiene `animals.jirafa`, `animals.pato`, etc.

- [ ] **Step 7: Commit**

```bash
git add src/data art/art.config.json tests
git commit -m "feat: once especies nuevas con su bandeja, sus monedas y su hoja"
```

---

### Task 4: Siete recintos y 35 animales

**Files:**
- Modify: `game/src/data/pens.ts`, `game/src/data/strings.ts`
- Modify: `game/src/core/shopEntries.ts`
- Modify: `game/src/world/Pens.ts`, `game/src/scenes/WorldScene.ts`, `game/src/scenes/HudScene.ts`
- Modify: `game/art/art.config.json` (sección `animals`)
- Test: `game/tests/unit/pens.test.ts`, `shopEntries.test.ts`, `economy.test.ts`, `save.test.ts`, `content.test.ts`, `zoomap.test.ts`

**Interfaces:**
- Consumes: las 15 especies (Task 3); los recintos del mapa (Task 2).
- Produces:
  - `PEN_IDS`, en este orden (el de la tienda): `leon`, `cabra`, `pantera`, `panda`, `estanque`, `ovejas`, `establo`, `pinguinos`, `sabana`, `elefantes-africanos`, `elefantes-asiaticos`.
  - `PENS_ON_SALE = 3` en `core/shopEntries.ts`.
  - `Pens.celebrate(residentId: string, reaction: Reaction): void` (antes recibía el recinto).
  - Textos `pen.<id>` para los 7 recintos y `book.page.<residente>.title` para los 35 residentes.

Residentes, por orden de llegada (`id` → especie, aspecto):

| Recinto | Precio | Residentes |
|---|---|---|
| `estanque` | 150 | `cuac` pato `pato`; `charco` pato `pato-charco`; `pluma` pato `pato-pluma`; `remo` pato `pato-remo`; `pio` pato `pato-pio` |
| `ovejas` | 250 | `lana` oveja `oveja`; `bolita` `oveja-bolita`; `trueno` `oveja-trueno`; `algodon` `oveja-algodon`; `rizos` `oveja-rizos` |
| `establo` | 400 | `canela` caballo `caballo`; `pepa` gallina `gallina`; `lucero` caballo `caballo-lucero`; `kiko` gallo `gallo`; `clo` gallina `gallina-clo`; `tizon` caballo `caballo-tizon`; `miga` gallina `gallina-miga`; `mancha` caballo `caballo-mancha` |
| `pinguinos` | 600 | `pingu` `pinguino`; `copito` `pinguino-copito`; `frac` `pinguino-frac`; `tobogan` `pinguino-tobogan`; `hielo` `pinguino-hielo` |
| `sabana` | 900 | `lola` jirafa `jirafa`; `raya` cebra `cebra`; `brisa` gacela `gacela`; `pecas` jirafa `jirafa-pecas`; `zigzag` cebra `cebra-zigzag`; `salto` gacela `gacela-salto`; `miel` gacela `gacela-miel`; `pipa` gacela `gacela-pipa` |
| `elefantes-africanos` | 1300 | `tembo` `elefante-africano`; `kali` `elefante-africano-kali` |
| `elefantes-asiaticos` | 1600 | `raja` `elefante-asiatico`; `mali` `elefante-asiatico-mali` |

- [ ] **Step 1: Escribir los tests que fallan**

`tests/unit/pens.test.ts`. Sustituir los tres primeros tests y el de «cada residente…» por:

```ts
  it('son los 4 de siempre, con los mismos ids que el guardado, y los 7 nuevos en el orden de la tienda', () => {
    expect([...PEN_IDS]).toEqual([
      'leon', 'cabra', 'pantera', 'panda',
      'estanque', 'ovejas', 'establo', 'pinguinos', 'sabana', 'elefantes-africanos', 'elefantes-asiaticos',
    ]);
  });

  it('cabe en cada recinto lo que dice el diseño', () => {
    expect(PEN_IDS.map(penCapacity)).toEqual([1, 5, 2, 2, 5, 5, 8, 5, 8, 2, 2]);
  });

  it('león y cabra vienen de inicio; el resto se compra, cada vez más caro', () => {
    expect(PEN_IDS.map((id) => PENS[id].cost)).toEqual([undefined, undefined, 50, 100, 150, 250, 400, 600, 900, 1300, 1600]);
  });

  it('cada residente tiene id único, especie conocida y nombre', () => {
    const ids = PEN_IDS.flatMap((id) => PENS[id].residents.map((r) => r.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(45);
    for (const penId of PEN_IDS) {
      for (const r of PENS[penId].residents) {
        expect(ANIMALS[r.species], r.id).toBeDefined();
        expect(STRINGS_ES[`book.page.${r.id}.title` as keyof typeof STRINGS_ES], r.id).toBeTruthy();
      }
    }
  });

  // Las 35 páginas de los animales nuevos llegan con el plan 4 (tienda y libro).
  it('los animales de los cuatro recintos de siempre tienen página en el libro', () => {
    for (const penId of ['leon', 'cabra', 'pantera', 'panda'] as const) {
      for (const r of PENS[penId].residents) expect(BOOK_PAGES.some((p) => p.id === r.id), r.id).toBe(true);
    }
  });

  it('cada recinto nuevo empieza con el animal que dice el diseño', () => {
    const first = (id: (typeof PEN_IDS)[number]) => PENS[id].residents[0]!.species;
    expect((['estanque', 'ovejas', 'establo', 'pinguinos', 'sabana', 'elefantes-africanos', 'elefantes-asiaticos'] as const).map(first)).toEqual([
      'pato', 'oveja', 'caballo', 'pinguino', 'jirafa', 'elefante-africano', 'elefante-asiatico',
    ]);
  });

  it('los recintos mixtos tienen las especies y cantidades del diseño', () => {
    const tally = (id: (typeof PEN_IDS)[number]) => {
      const count: Record<string, number> = {};
      for (const r of PENS[id].residents) count[r.species] = (count[r.species] ?? 0) + 1;
      return count;
    };
    expect(tally('sabana')).toEqual({ jirafa: 2, cebra: 2, gacela: 4 });
    expect(tally('establo')).toEqual({ caballo: 4, gallina: 3, gallo: 1 });
  });

  it('dentro de un recinto no hay dos animales con el mismo aspecto', () => {
    for (const penId of PEN_IDS) {
      const looks = PENS[penId].residents.map((r) => r.look);
      expect(new Set(looks).size, penId).toBe(looks.length);
    }
  });

  it('cada recinto tiene nombre', () => {
    for (const penId of PEN_IDS) expect(STRINGS_ES[PENS[penId].nameKey], penId).toBeTruthy();
  });
```

En el test de `allLooks`, el bucle de especies pasa a `for (const species of ANIMAL_IDS)` (importar `ANIMAL_IDS`).

`tests/unit/shopEntries.test.ts`. Sustituir los dos primeros tests y añadir uno:

```ts
  it('al principio: otra cabra y los tres recintos siguientes (el león no tiene extras)', () => {
    expect(summary(withCounts({}))).toEqual(['extra-cabra:buy', 'pantera:buy', 'panda:buy', 'estanque:buy']);
  });

  it('con la pantera comprada, "otra pantera" ocupa su sitio y asoma el recinto siguiente', () => {
    expect(summary(withCounts({ pantera: 1 }))).toEqual(['extra-cabra:buy', 'extra-pantera:buy', 'panda:buy', 'estanque:buy', 'ovejas:buy']);
  });

  it('nunca hay más de 3 recintos por comprar a la vez', () => {
    const pens = (state: GameState) => shopEntries(state).filter((e) => e.kind === 'pen' && e.status === 'buy');
    expect(pens(withCounts({}))).toHaveLength(PENS_ON_SALE);
    expect(pens(withCounts({ pantera: 1, panda: 1, estanque: 1, ovejas: 1, establo: 1, pinguinos: 1 })).map((e) => e.id)).toEqual([
      'sabana', 'elefantes-africanos', 'elefantes-asiaticos',
    ]);
  });

  it('el "otro animal" de un recinto mixto es el siguiente de su lista, con el precio de su especie', () => {
    const next = (count: number) => shopEntries(withCounts({ establo: count })).find((e) => e.id === 'extra-establo');
    expect(next(1)).toMatchObject({ species: 'gallina', look: 'gallina', cost: 30, count: 1, max: 8 });
    expect(next(2)).toMatchObject({ species: 'caballo', look: 'caballo-lucero', cost: 60 });
  });
```

(importar `PENS_ON_SALE` de `../../src/core/shopEntries`).

`tests/unit/economy.test.ts`: el test que compara `initialState()` con un literal pasa a:

```ts
    expect(initialState()).toEqual({
      coins: 0,
      counts: { leon: 1, cabra: 1, pantera: 0, panda: 0, estanque: 0, ovejas: 0, establo: 0, pinguinos: 0, sabana: 0, 'elefantes-africanos': 0, 'elefantes-asiaticos': 0 },
      shopUnlocked: false,
    });
```

y añadir:

```ts
  it('comprar un recinto mixto trae solo su primer animal, y cada extra cuesta lo de su especie', () => {
    let state: GameState = { ...initialState(), coins: 1000, shopUnlocked: true };
    const buy = (item: string) => {
      const result = purchase(state, item);
      if (!result.ok) throw new Error(result.error);
      state = result.state;
    };
    buy('establo');
    expect([state.counts.establo, state.coins]).toEqual([1, 600]);
    buy('extra-establo'); // Pepa, gallina: 30
    buy('extra-establo'); // Lucero, caballo: 60
    expect([state.counts.establo, state.coins]).toEqual([3, 510]);
  });
```

`tests/unit/save.test.ts`: en cada `toEqual` que compare `counts` (o `state`) con un literal de 4 recintos, extender el literal con los recintos nuevos a 0 mediante `{ ...initialCounts(), … }` (importar `initialCounts` de `../../src/core/economy`). Por ejemplo `expect(parsed?.state.counts).toEqual({ ...initialCounts(), leon: 1, cabra: 5, pantera: 2, panda: 0 });`. Y añadir:

```ts
  it('una partida de la 2.2 (solo 4 recintos) se lee sin perder nada y con los recintos nuevos cerrados', () => {
    const old = {
      version: 2,
      state: { coins: 321, counts: { leon: 1, cabra: 4, pantera: 2, panda: 1 }, shopUnlocked: true },
      settings: { music: false, sfx: true, joystick: true },
      book: { seen: ['cover', 'bills'], hinted: true, page: 'bills' },
    };
    const parsed = parseSave(old)!;
    expect(parsed.state.coins).toBe(321);
    expect(parsed.state.counts).toEqual({ ...initialCounts(), leon: 1, cabra: 4, pantera: 2, panda: 1 });
    expect(parsed.state.counts.sabana).toBe(0);
    expect(parsed.book).toEqual(old.book);
  });
```

`tests/unit/content.test.ts`: `'león y cabra vienen desbloqueados; pantera y panda no'` se queda igual. Los demás ya iteran `PEN_IDS`.

`tests/unit/zoomap.test.ts`, añadir (importar `PEN_IDS` de `../../src/data/pens`):

```ts
  it('los recintos del mapa son los del juego', () => {
    expect([...MAP_PENS].sort()).toEqual([...PEN_IDS].sort());
  });
```

- [ ] **Step 2: Ver que fallan**

Run: `npm test`
Expected: FAIL en `pens`, `shopEntries`, `economy`, `save` y `zoomap`.

- [ ] **Step 3: Recintos en `src/data/pens.ts`**

```ts
export const PEN_IDS = [
  'leon', 'cabra', 'pantera', 'panda',
  // En el orden en que se ofrecen en la tienda.
  'estanque', 'ovejas', 'establo', 'pinguinos', 'sabana', 'elefantes-africanos', 'elefantes-asiaticos',
] as const;
```

Encima de `PENS`, junto al ayudante `residents`:

```ts
/** Un residente con aspecto propio: `one('lucero', 'caballo', 'lucero')` usa la hoja `caballo-lucero`. */
const one = (id: string, species: AnimalId, look?: string): ResidentDef => ({ id, species, look: look ? `${species}-${look}` : species });
```

Y en `PENS`, después de `panda`:

```ts
  estanque: {
    id: 'estanque',
    nameKey: 'pen.estanque',
    cost: 150,
    residents: [one('cuac', 'pato'), one('charco', 'pato', 'charco'), one('pluma', 'pato', 'pluma'), one('remo', 'pato', 'remo'), one('pio', 'pato', 'pio')],
  },
  ovejas: {
    id: 'ovejas',
    nameKey: 'pen.ovejas',
    cost: 250,
    residents: [one('lana', 'oveja'), one('bolita', 'oveja', 'bolita'), one('trueno', 'oveja', 'trueno'), one('algodon', 'oveja', 'algodon'), one('rizos', 'oveja', 'rizos')],
  },
  establo: {
    id: 'establo',
    nameKey: 'pen.establo',
    cost: 400,
    residents: [
      one('canela', 'caballo'),
      one('pepa', 'gallina'),
      one('lucero', 'caballo', 'lucero'),
      one('kiko', 'gallo'),
      one('clo', 'gallina', 'clo'),
      one('tizon', 'caballo', 'tizon'),
      one('miga', 'gallina', 'miga'),
      one('mancha', 'caballo', 'mancha'),
    ],
  },
  pinguinos: {
    id: 'pinguinos',
    nameKey: 'pen.pinguinos',
    cost: 600,
    residents: [one('pingu', 'pinguino'), one('copito', 'pinguino', 'copito'), one('frac', 'pinguino', 'frac'), one('tobogan', 'pinguino', 'tobogan'), one('hielo', 'pinguino', 'hielo')],
  },
  sabana: {
    id: 'sabana',
    nameKey: 'pen.sabana',
    cost: 900,
    residents: [
      one('lola', 'jirafa'),
      one('raya', 'cebra'),
      one('brisa', 'gacela'),
      one('pecas', 'jirafa', 'pecas'),
      one('zigzag', 'cebra', 'zigzag'),
      one('salto', 'gacela', 'salto'),
      one('miel', 'gacela', 'miel'),
      one('pipa', 'gacela', 'pipa'),
    ],
  },
  'elefantes-africanos': {
    id: 'elefantes-africanos',
    nameKey: 'pen.elefantes-africanos',
    cost: 1300,
    residents: [one('tembo', 'elefante-africano'), one('kali', 'elefante-africano', 'kali')],
  },
  'elefantes-asiaticos': {
    id: 'elefantes-asiaticos',
    nameKey: 'pen.elefantes-asiaticos',
    cost: 1600,
    residents: [one('raja', 'elefante-asiatico'), one('mali', 'elefante-asiatico', 'mali')],
  },
```

- [ ] **Step 4: Textos en `src/data/strings.ts`**

Después de los `zone.*`:

```ts
  'pen.estanque': 'Estanque',
  'pen.ovejas': 'Ovejas',
  'pen.establo': 'Establo',
  'pen.pinguinos': 'Pingüinos',
  'pen.sabana': 'Sabana',
  'pen.elefantes-africanos': 'Elefantes africanos',
  'pen.elefantes-asiaticos': 'Elefantes asiáticos',
```

Antes de `'book.page.back.title'` (solo los títulos: la ventana de dar de comer los usa como nombre del animal; los textos de las páginas son del plan 4):

```ts
  'book.page.cuac.title': 'Cuac, el pato',
  'book.page.charco.title': 'Charco, el pato',
  'book.page.pluma.title': 'Pluma, la pata',
  'book.page.remo.title': 'Remo, el pato',
  'book.page.pio.title': 'Pío, el patito',
  'book.page.lana.title': 'Lana, la oveja',
  'book.page.bolita.title': 'Bolita, la oveja',
  'book.page.trueno.title': 'Trueno, la oveja negra',
  'book.page.algodon.title': 'Algodón, la oveja',
  'book.page.rizos.title': 'Rizos, la oveja',
  'book.page.canela.title': 'Canela, el caballo',
  'book.page.pepa.title': 'Pepa, la gallina',
  'book.page.lucero.title': 'Lucero, el caballo',
  'book.page.kiko.title': 'Kiko, el gallo',
  'book.page.clo.title': 'Clo, la gallina',
  'book.page.tizon.title': 'Tizón, el caballo',
  'book.page.miga.title': 'Miga, la gallina',
  'book.page.mancha.title': 'Mancha, el caballo',
  'book.page.pingu.title': 'Pingu, el pingüino',
  'book.page.copito.title': 'Copito, el pingüino',
  'book.page.frac.title': 'Frac, el pingüino',
  'book.page.tobogan.title': 'Tobogán, el pingüino',
  'book.page.hielo.title': 'Hielo, el pingüino',
  'book.page.lola.title': 'Lola, la jirafa',
  'book.page.raya.title': 'Raya, la cebra',
  'book.page.brisa.title': 'Brisa, la gacela',
  'book.page.pecas.title': 'Pecas, la jirafa',
  'book.page.zigzag.title': 'Zigzag, la cebra',
  'book.page.salto.title': 'Salto, la gacela',
  'book.page.miel.title': 'Miel, la gacela',
  'book.page.pipa.title': 'Pipa, la gacela',
  'book.page.tembo.title': 'Tembo, el elefante africano',
  'book.page.kali.title': 'Kali, el elefante africano',
  'book.page.raja.title': 'Raja, el elefante asiático',
  'book.page.mali.title': 'Mali, el elefante asiático',
```

- [ ] **Step 5: La tienda enseña solo 3 recintos por comprar**

`src/core/shopEntries.ts`:

```ts
/** Recintos por comprar que se ofrecen a la vez: los siguientes de la lista, para no llenar la tienda. */
export const PENS_ON_SALE = 3;
```

y en `shopEntries`, dentro del bucle:

```ts
  const entries: ShopEntry[] = [];
  let onSale = 0;
  for (const penId of PEN_IDS) {
    …
    if (pen && !hasExtra) {
      if (!open && onSale >= PENS_ON_SALE) continue;
      if (!open) onSale++;
      entries.push({ id: pen.id, kind: 'pen', penId, species: residents[0]!.species, look: residents[0]!.look, cost: pen.cost, status: open ? 'owned' : 'buy' });
    }
```

Con varios recintos abiertos los «otro animal» pueden pasar de las 5 peanas: `pedestalFor` ya coloca los que sobran en fila delante del mostrador. Ordenarlo bien es parte del plan 4.

- [ ] **Step 6: `Pens` con recintos mixtos**

`src/world/Pens.ts`. Importar `type AnimalId` de `../data/animals`. En `Wanderer`:

```ts
  /** Su especie; null en los acompañantes. */
  species: AnimalId | null;
```

`wanderer` recibe la especie:

```ts
const wanderer = (walker: Walker, residentId: string | null, species: AnimalId | null, rest = Math.random() * 2000): Wanderer => ({
  walker,
  residentId,
  species,
  roam: { pos: { x: walker.x, y: walker.y }, target: null, rest },
  base: { x: walker.x, y: walker.y },
  phase: Math.random() * Math.PI * 2,
});
```

En el constructor, el acompañante es el de la especie del primer residente (un recinto ya no es una especie):

```ts
      const lead = def.residents[0]!.species;
      const hasCompanion = Boolean(getArt()?.companions[lead]);
```

```ts
        return wanderer(createAnimal(scene, resident.species, p.x, p.y, resident.look), resident.id, resident.species);
```

```ts
      const companionWalker = hasCompanion ? createCompanion(scene, lead, companionAt.x, companionAt.y) : null;
      const companion = companionWalker ? wanderer(companionWalker, null, null, 500 + Math.random() * 1500) : null;
```

En `addAnimal`: `wanderer(createAnimal(…), resident.id, resident.species, 800)`.

`celebrate` pasa a ir por animal:

```ts
  /** Reacciona el animal que ha comido y, con él, los de su especie que haya en el recinto. */
  celebrate(residentId: string, reaction: Reaction): void {
    const pen = this.pens.find((p) => p.animals.some((w) => w.residentId === residentId));
    const fed = pen?.animals.find((w) => w.residentId === residentId);
    if (!pen || !fed) return;
    for (const w of pen.animals.filter((a) => a.species === fed.species)) {
      const object = w.walker.object;
      const emoji = this.sparkle(REACTION_EMOJI[reaction]).setPosition(w.walker.x, w.walker.y - 16);
      this.scene.tweens.add({ targets: emoji, y: emoji.y - 10, alpha: 0, duration: 1200, onComplete: () => emoji.setVisible(false) });
      if (reaction === 'rechaza') {
        this.scene.tweens.add({ targets: object, angle: 12, duration: 70, yoyo: true, repeat: 3, onComplete: () => object.setAngle(0) });
      } else {
        this.scene.tweens.add({ targets: object, scaleY: 0.8, duration: 110, yoyo: true, repeat: reaction === 'especial' ? 3 : 1 });
      }
    }
  }
```

`src/scenes/WorldScene.ts`:

```ts
    const offFed = bus.on('animal-fed', ({ residentId, reaction }) => this.pens.celebrate(residentId, reaction));
```

`src/scenes/HudScene.ts`: el aviso de recinto nuevo dice el animal que llega, no el nombre del recinto («¡Nuevo animal: Jirafa!»). Importar `ANIMALS` de `../data/animals`:

```ts
      bus.on('animal-unlocked', ({ penId }) =>
        this.showToast(t('toast.newAnimal', { name: t(ANIMALS[PENS[penId].residents[0]!.species].nameKey) })),
      ),
```

- [ ] **Step 7: Hojas de los residentes en `art/art.config.json`**

Dentro de `animals`, después de las especies de la Task 3. Las que no llevan `edits` ni `shrink` son hojas reales del pack; el resto son recolores que se revisan mirándolos en la Task 5.

```json
    "pato-charco": { "zip": "farm", "file": "16x16/Default Format/$duck_mallard_m.png", "override": "pato-charco.png" },
    "pato-pluma": { "zip": "farm", "file": "16x16/Default Format/$duck_mallard_f.png", "override": "pato-pluma.png" },
    "pato-remo": {
      "zip": "farm", "file": "16x16/Default Format/$duck.png", "override": "pato-remo.png",
      "edits": [{ "swap": { "f4f3f2": "f0d9a8", "e6e3e0": "e0c692", "c5beba": "c4a874", "aba19c": "a88d5e" } }]
    },
    "pato-pio": { "zip": "farm", "file": "16x16/Default Format/$duck_chick.png", "override": "pato-pio.png" },
    "oveja-bolita": {
      "zip": "farm", "file": "16x16/Default Format/$sheep.png", "override": "oveja-bolita.png",
      "edits": [{ "swap": { "f4f3f2": "e8c9a0", "e6e3e0": "d9b88c", "c5beba": "c09a6e", "aba19c": "a07a52" } }]
    },
    "oveja-trueno": {
      "zip": "farm", "file": "16x16/Default Format/$sheep.png", "override": "oveja-trueno.png",
      "edits": [{ "swap": { "f4f3f2": "4a4542", "e6e3e0": "3f3a38", "c5beba": "383432", "aba19c": "2e2a29", "ffdab2": "6b5a50" } }]
    },
    "oveja-algodon": {
      "zip": "farm", "file": "16x16/Default Format/$sheep.png", "override": "oveja-algodon.png",
      "edits": [{ "swap": { "f4f3f2": "fff6e6", "e6e3e0": "f3e6cf", "aba19c": "c9b79f" } }]
    },
    "oveja-rizos": {
      "zip": "farm", "file": "16x16/Default Format/$sheep.png", "override": "oveja-rizos.png",
      "edits": [{ "swap": { "f4f3f2": "cfd2d8", "e6e3e0": "bfc3cb", "c5beba": "a9aeb8", "aba19c": "8f95a1" } }]
    },
    "caballo-lucero": { "zip": "farm", "file": "16x16/Default Format/$horse_arabian_blaze.png", "override": "caballo-lucero.png" },
    "caballo-tizon": { "zip": "farm", "file": "16x16/Default Format/$horse_friesian.png", "override": "caballo-tizon.png" },
    "caballo-mancha": { "zip": "farm", "file": "16x16/Default Format/$horse_clydesdale.png", "override": "caballo-mancha.png" },
    "gallina-clo": { "zip": "farm", "file": "16x16/Default Format/$chicken_wild_hen.png", "override": "gallina-clo.png" },
    "gallina-miga": { "zip": "farm", "file": "16x16/Default Format/$chicken_silkie_hen.png", "override": "gallina-miga.png" },
    "pinguino-copito": { "zip": "wild", "file": "16x16/Default format/$penguin_african.png", "override": "pinguino-copito.png" },
    "pinguino-frac": {
      "zip": "wild", "file": "16x16/Default format/$penguin_emperor.png", "override": "pinguino-frac.png",
      "edits": [{ "swap": { "d8b637": "f4f3f2", "ead59f": "f4f3f2", "756435": "8d97a3" } }]
    },
    "pinguino-tobogan": {
      "zip": "wild", "file": "16x16/Default format/$penguin_african.png", "override": "pinguino-tobogan.png",
      "edits": [{ "swap": { "586473": "3f4a5c", "8d97a3": "6f7a88", "af908c": "e08a7a" } }]
    },
    "pinguino-hielo": {
      "zip": "wild", "file": "16x16/Default format/$penguin_emperor.png", "override": "pinguino-hielo.png",
      "shrink": 13,
      "edits": [{ "swap": { "586473": "7d8fa6", "45494f": "5f6f85" } }]
    },
    "jirafa-pecas": {
      "zip": "wild", "file": "16x16/Default format/$giraffe.png", "override": "jirafa-pecas.png",
      "edits": [{ "swap": { "a6644a": "8a4a32", "6c493b": "573629", "f0d7a0": "f6e3b8", "d8b974": "e2c88c" } }]
    },
    "cebra-zigzag": {
      "zip": "wild", "file": "16x16/Default format/$zebra.png", "override": "cebra-zigzag.png",
      "edits": [{ "swap": { "f4f3f2": "efe2c8", "e6e3e0": "e2d3b4", "c5beba": "cdbb9a", "45494f": "5a4636" } }]
    },
    "gacela-salto": {
      "zip": "wild", "file": "16x16/Default format/$gazelle_thomson.png", "override": "gacela-salto.png",
      "edits": [{ "swap": { "f1bd74": "dc9c58", "bc8651": "a66f3d" } }]
    },
    "gacela-miel": {
      "zip": "wild", "file": "16x16/Default format/$gazelle_thomson.png", "override": "gacela-miel.png",
      "edits": [{ "swap": { "f1bd74": "f6d696", "bc8651": "d6a868" } }]
    },
    "gacela-pipa": { "zip": "wild", "file": "16x16/Default format/$gazelle_thomson.png", "override": "gacela-pipa.png", "shrink": 13 },
    "elefante-africano-kali": {
      "zip": "wild", "file": "16x16/Default format/$elephant_african.png", "override": "elefante-africano-kali.png",
      "edits": [{ "swap": { "a0a1a3": "b3a89a", "86888a": "978c7f", "c1c1c2": "d0c6b8", "77787a": "847a6e", "b1b2b4": "c2b8aa" } }]
    },
    "elefante-asiatico-mali": { "zip": "wild", "file": "16x16/Default format/$elephant_asian_brown.png", "override": "elefante-asiatico-mali.png" },
```

Los colores de origen de cada `swap` son los que más píxeles ocupan en cada hoja del pack (contados al escribir este plan).

- [ ] **Step 8: Ver que todo pasa**

Run: `npm test; npm run typecheck`
Expected: PASS. `artConfig.test` comprueba que cada aspecto de `allLooks()` está en la configuración. Si `session.test.ts` u otro test compara `counts` con un literal de 4 recintos, extenderlo con `...initialCounts()` igual que en `save.test.ts`.

- [ ] **Step 9: Importar y verlo en el juego**

Run: `npm run art:import`
Expected: sin errores.

Arrancar el juego (`preview_start`, servidor `dev`). En la consola del navegador (`javascript_tool`): `await window.__ZOO__.addCoins(9000)`, entrar en la tienda y comprar recintos hasta tener la sabana y el establo, y varios «otro animal» de cada uno.
Expected: la tienda enseña como mucho 3 recintos por comprar; al comprar la sabana aparece una jirafa y el aviso «¡Nuevo animal: Jirafa!»; los extras llegan en el orden de la tabla; tocar una cebra abre la comida con «Raya, la cebra» y la bandeja de la cebra; al darle de comer reaccionan las cebras, no las jirafas; los carteles de los recintos nuevos llevan su nombre.

- [ ] **Step 10: E2E y commit**

Run: `npm run test:e2e`
Expected: PASS. Si `shop.spec.ts` cuenta los artículos de la tienda, ahora al principio hay 4 (`extra-cabra`, `pantera`, `panda`, `estanque`).

```bash
git add src art/art.config.json tests
git commit -m "feat: siete recintos nuevos con sus 35 animales; la tienda ofrece los 3 siguientes"
```

---

### Task 5: Mirar y ajustar los 14 aspectos pintados

Catorce de los 35 animales nuevos no tienen hoja propia en los packs: son un recolor (o una reducción) de la de su especie. La Task 4 les dio colores de partida; aquí se miran uno a uno y se corrigen. Es trabajo de ojo, no de tests.

**Files:**
- Modify: `game/art/art.config.json` (solo `edits` y `shrink` de los aspectos de la lista)

**Interfaces:**
- Consumes: `npm run art:preview -- <aspecto>` (plan 2), que escribe `../zooesponji-private/art-work/plantillas/<aspecto>_x8_para_ver.png`.

Aspectos a revisar y qué tiene que verse:

| Aspecto | Tiene que verse |
|---|---|
| `pato-remo` | Pato color canela, distinto del blanco (`pato`) y de la hembra de ánade (`pato-pluma`) |
| `oveja-bolita` | Oveja tostada |
| `oveja-trueno` | Oveja negra, con la cara oscura; se le distinguen los ojos |
| `oveja-algodon` | Oveja crema, más cálida que `oveja` |
| `oveja-rizos` | Oveja gris |
| `pinguino-frac` | Emperador sin amarillo: blanco y negro, «de frac» |
| `pinguino-tobogan` | Africano más oscuro que `pinguino-copito` |
| `pinguino-hielo` | Más pequeño que los demás y azulado |
| `jirafa-pecas` | Manchas más oscuras que las de `jirafa`, fondo más claro |
| `cebra-zigzag` | Fondo crema y rayas marrones |
| `gacela-salto` | Más oscura que `gacela` |
| `gacela-miel` | Más clara que `gacela` |
| `gacela-pipa` | Cría: más pequeña, con ojos y contorno enteros |
| `elefante-africano-kali` | Tono arena, distinto del gris de `elefante-africano` |

- [ ] **Step 1: Sacar la vista de cada aspecto y de su especie**

Run (una vez por aspecto de la tabla y por su especie base, p. ej. `oveja` y `oveja-trueno`): `npm run art:preview -- oveja-trueno`
Expected: imprime la ruta de la imagen en el repo privado. Abrirla con la herramienta Read.

- [ ] **Step 2: Corregir lo que no se vea bien**

Para cada aspecto, comparar con la tabla. Arreglos habituales, todos en su entrada de `art.config.json`:

- **Un color no ha cambiado** (queda una zona del color de la especie): falta ese color en `swap`. Añadirlo con el mismo criterio que sus vecinos (más oscuro o más claro en la misma proporción).
- **El animal se confunde con otro del mismo recinto:** separar más los tonos.
- **Se pierde un detalle al reducir** (`shrink`): probar `14` en lugar de `13`.
- **Se quiere una marca** (una mancha, un mechón): añadir un retoque `dots` con `rows` y `cols`, como la campanita de `cabra-tolon`. El fotograma central del paso (`cols: [1]`) suele ir 1 px más alto que los otros dos.

Volver a sacar la vista después de cada cambio hasta que cumpla la tabla.

- [ ] **Step 3: Importar y verlos juntos en su recinto**

Run: `npm test -- artConfig; npm run art:import`
Expected: PASS y sin errores.

Arrancar el juego, `await window.__ZOO__.addCoins(9000)`, comprar los recintos y todos sus animales, y hacer una captura de cada recinto nuevo.
Expected: en cada recinto se distinguen todos los animales entre sí a tamaño de juego.

- [ ] **Step 4: Commit**

```bash
git add art/art.config.json
git commit -m "feat: aspecto propio para ovejas, pingüinos, gacelas y demás animales sin hoja en los packs"
```

Las vistas previas quedan en el repo privado; hacer allí su commit (`git -C ../../zooesponji-private add art-work/plantillas; git -C ../../zooesponji-private commit -m "vistas de los animales del zoo grande"`).

---

### Task 6: Animales grandes y recintos fuera de pantalla

Una jirafa y un elefante miden 48 px y una cebra o un caballo 32; hasta ahora todo medía 16–24. Con la separación fija de 14 px se pisarían, y tocarlos por los pies no es lo natural. Además, con casi 50 animales, los de los recintos que no se ven dejan de actualizarse.

**Files:**
- Modify: `game/src/core/flock.ts`, `game/src/core/interaction.ts`
- Modify: `game/src/data/animals.ts`
- Modify: `game/src/world/Pens.ts`, `game/src/scenes/WorldScene.ts`
- Test: `game/tests/unit/flock.test.ts`, `game/tests/unit/interaction.test.ts`, `game/tests/unit/content.test.ts`

**Interfaces:**
- Produces:
  - `AnimalDef.radius?: number` — radio del cuerpo en px. Jirafa 16, elefantes 18, cebra y caballo 11; el resto no lo lleva.
  - `Roamer.radius?: number`; `BODY_RADIUS = MIN_GAP / 2` (7) y `gapBetween(a, b): number` en `core/flock.ts`.
  - `spreadPositions(space, n, rng, margin = 8, gap = MIN_GAP * 1.5): Vec[]`
  - `tapDistance(feet: Vec, radius: number, point: Vec, base = 7): number` y `rectsOverlap(a: Rect, b: Rect, margin = 0): boolean` en `core/interaction.ts`.
  - `Pens.update(time: number, delta: number, view: Rect): void`

- [ ] **Step 1: Escribir los tests que fallan**

`tests/unit/flock.test.ts` (importar `BODY_RADIUS` y `gapBetween`):

```ts
describe('animales grandes', () => {
  const space = { inner: { x: 0, y: 0, width: 200, height: 120 }, obstacles: [] };

  it('la separación entre dos animales es la suma de sus radios; sin radio, la de siempre', () => {
    expect(gapBetween({}, {})).toBe(MIN_GAP);
    expect(gapBetween({ radius: 18 }, { radius: 18 })).toBe(36);
    expect(gapBetween({ radius: 18 }, {})).toBe(18 + BODY_RADIUS);
  });

  it('dos elefantes que van uno hacia el otro se paran antes de pisarse', () => {
    const rng = seeded(5);
    let a: Roamer = { pos: { x: 40, y: 60 }, target: { x: 160, y: 60 }, rest: 0, radius: 18 };
    let b: Roamer = { pos: { x: 160, y: 60 }, target: { x: 40, y: 60 }, rest: 0, radius: 18 };
    for (let step = 0; step < 400; step++) {
      a = stepRoamer(a, [b], space, 50, rng);
      b = stepRoamer(b, [a], space, 50, rng);
      expect(distance(a.pos, b.pos)).toBeGreaterThanOrEqual(36 - 1e-9);
    }
  });

  it('un animal grande no elige destinos pegados a la valla', () => {
    const rng = seeded(9);
    let r: Roamer = { pos: { x: 100, y: 60 }, target: null, rest: 0, radius: 18 };
    for (let step = 0; step < 2000; step++) {
      r = stepRoamer(r, [], space, 50, rng);
      if (!r.target) continue;
      expect(r.target.x).toBeGreaterThanOrEqual(18);
      expect(r.target.x).toBeLessThanOrEqual(200 - 18);
      expect(r.target.y).toBeGreaterThanOrEqual(18);
      expect(r.target.y).toBeLessThanOrEqual(120 - 18);
    }
  });

  it('spreadPositions separa más si se le pide', () => {
    const points = spreadPositions(space, 2, seeded(3), 18, 54);
    expect(points).toHaveLength(2);
    expect(distance(points[0]!, points[1]!)).toBeGreaterThanOrEqual(36);
  });
});
```

`tests/unit/interaction.test.ts` (importar `tapDistance` y `rectsOverlap`):

```ts
describe('tapDistance', () => {
  const feet = { x: 100, y: 100 };

  it('en un animal pequeño es la distancia a sus pies', () => {
    expect(tapDistance(feet, 7, { x: 103, y: 96 })).toBeCloseTo(5);
  });

  it('en uno grande se toca el cuerpo: el centro sube y el radio crece', () => {
    // Jirafa (radio 16): tocar 20 px por encima de los pies cuenta como tocarla de lleno.
    expect(tapDistance(feet, 16, { x: 100, y: 80 })).toBeLessThanOrEqual(14);
    // A un animal pequeño ese mismo toque no le llega.
    expect(tapDistance(feet, 7, { x: 100, y: 80 })).toBeGreaterThan(14);
  });
});

describe('rectsOverlap', () => {
  const view = { x: 100, y: 100, width: 200, height: 100 };

  it('dentro, a medias y fuera', () => {
    expect(rectsOverlap(view, { x: 150, y: 120, width: 20, height: 20 })).toBe(true);
    expect(rectsOverlap(view, { x: 290, y: 190, width: 50, height: 50 })).toBe(true);
    expect(rectsOverlap(view, { x: 320, y: 100, width: 50, height: 50 })).toBe(false);
  });

  it('con margen entra lo que está cerca del borde', () => {
    expect(rectsOverlap(view, { x: 320, y: 100, width: 50, height: 50 }, 32)).toBe(true);
  });
});
```

`tests/unit/content.test.ts`, en el `describe` de animales:

```ts
  it('los animales grandes dicen su radio', () => {
    const radius = (id: string) => (isAnimalId(id) ? ANIMALS[id].radius : undefined);
    expect(['jirafa', 'elefante-africano', 'elefante-asiatico', 'cebra', 'caballo', 'cabra', 'pato'].map(radius)).toEqual([16, 18, 18, 11, 11, undefined, undefined]);
  });
```

- [ ] **Step 2: Ver que fallan**

Run: `npm test -- flock interaction content`
Expected: FAIL (`gapBetween`, `tapDistance`, `rectsOverlap` no existen).

- [ ] **Step 3: `core/flock.ts`**

```ts
/** Un animal que pasea: posición, destino (o null si descansa) y ms de descanso restantes. */
export interface Roamer {
  pos: Vec;
  target: Vec | null;
  rest: number;
  /** Radio del cuerpo (px). Sin él, `BODY_RADIUS`. */
  radius?: number;
}

/** Radio de un animal de 16 px: dos de ellos se separan MIN_GAP. */
export const BODY_RADIUS = MIN_GAP / 2;

/** Distancia mínima entre dos animales: la suma de sus radios. */
export function gapBetween(a: Pick<Roamer, 'radius'>, b: Pick<Roamer, 'radius'>): number {
  return (a.radius ?? BODY_RADIUS) + (b.radius ?? BODY_RADIUS);
}
```

`spreadPositions` recibe la separación de partida:

```ts
export function spreadPositions(space: PenSpace, n: number, rng: Rng, margin = 8, gap = MIN_GAP * 1.5): Vec[] {
  const { inner, obstacles } = space;
  const points: Vec[] = [];
  for (let g = gap; points.length < n && g > 0; g -= 2) {
    for (let attempt = 0; attempt < 200 && points.length < n; attempt++) {
      const p = {
        x: inner.x + margin + rng() * (inner.width - margin * 2),
        y: inner.y + margin + rng() * (inner.height - margin * 2),
      };
      if (obstacles.some((r) => rectContains(r, p, 2)) || tooClose(p, points, g)) continue;
      points.push(p);
    }
  }
  return points;
}
```

En `stepRoamer`, el margen del destino y la separación dependen del radio:

```ts
    const margin = Math.max(8, roamer.radius ?? 0);
    const target = pickWanderTarget(space.inner, pos, space.obstacles, rng, margin, 12, occupied);
```

```ts
  const blocked = others.some((o) => {
    const after = Math.hypot(o.pos.x - next.x, o.pos.y - next.y);
    return after < gapBetween(roamer, o) && after < Math.hypot(o.pos.x - pos.x, o.pos.y - pos.y);
  });
```

- [ ] **Step 4: `core/interaction.ts`**

```ts
/**
 * Distancia de un toque a un animal. A los grandes se les toca el cuerpo, no los pies: el centro
 * sube y la distancia se descuenta en lo que su radio pasa de `base` (el de un animal de 16 px).
 */
export function tapDistance(feet: Vec, radius: number, point: Vec, base = 7): number {
  const extra = Math.max(0, radius - base);
  return Math.hypot(feet.x - point.x, feet.y - extra - point.y) - extra;
}

export function rectsOverlap(a: Rect, b: Rect, margin = 0): boolean {
  return (
    a.x - margin < b.x + b.width && a.x + a.width + margin > b.x && a.y - margin < b.y + b.height && a.y + a.height + margin > b.y
  );
}
```

- [ ] **Step 5: Radio de las especies grandes**

`src/data/animals.ts`, en `AnimalDef`:

```ts
  /** Radio del cuerpo en px (por defecto 7): separa a los grandes al pasear y agranda su zona de toque. */
  radius?: number;
```

y en las especies: `jirafa` → `radius: 16`; `elefante-africano` y `elefante-asiatico` → `radius: 18`; `cebra` y `caballo` → `radius: 11`.

- [ ] **Step 6: `Pens`: radio, toque y fuera de pantalla**

`src/world/Pens.ts`. Imports: `BODY_RADIUS` de `../core/flock`; `rectsOverlap` y `tapDistance` de `../core/interaction` (y quitar `nearestWithin` del import: deja de usarse aquí hasta la Task 7); `MIN_GAP` de `../core/obstacles`; `ANIMALS` de `../data/animals`.

En `Wanderer`: `/** Radio del cuerpo (px). */ radius: number;`. `wanderer` lo recibe y se lo pasa al `Roamer`:

```ts
const wanderer = (walker: Walker, residentId: string | null, species: AnimalId | null, radius: number, rest = Math.random() * 2000): Wanderer => ({
  walker,
  residentId,
  species,
  radius,
  roam: { pos: { x: walker.x, y: walker.y }, target: null, rest, radius },
  base: { x: walker.x, y: walker.y },
  phase: Math.random() * Math.PI * 2,
});

const radiusOf = (species: AnimalId): number => ANIMALS[species].radius ?? BODY_RADIUS;
```

En el constructor:

```ts
      // Los grandes empiezan más separados y más lejos de la valla.
      const biggest = Math.max(...def.residents.map((r) => radiusOf(r.species)));
      const spots = spreadPositions(space, count + (hasCompanion ? 1 : 0), Math.random, Math.max(8, biggest), Math.max(MIN_GAP * 1.5, biggest * 3));
```

```ts
        return wanderer(createAnimal(scene, resident.species, p.x, p.y, resident.look), resident.id, resident.species, radiusOf(resident.species));
```

```ts
      const companion = companionWalker ? wanderer(companionWalker, null, null, radiusOf(lead), 500 + Math.random() * 1500) : null;
```

En `addAnimal`: `wanderer(createAnimal(…), resident.id, resident.species, radiusOf(resident.species), 800)`.

`update` recibe lo que se ve y se salta los recintos de fuera:

```ts
  /**
   * Con arte, los animales pasean por su recinto sin pisarse; sin arte, se balancean en su sitio.
   * Los de los recintos que no se ven (`view`: la zona de la cámara) no se actualizan.
   */
  update(time: number, delta: number, view: Rect): void {
    const art = getArt() !== null;
    for (const pen of this.pens) {
      if (!rectsOverlap(view, pen.rect, TILE_SIZE * 2)) continue;
      const all = this.members(pen);
      …
```

`residentAt`:

```ts
  /** El residente de un recinto abierto más cercano a `point`, a no más de `radius` de su cuerpo. */
  residentAt(point: Vec, state: GameState, radius: number): { penId: PenId; residentId: string } | null {
    let best: { penId: PenId; residentId: string } | null = null;
    let bestDistance = radius;
    for (const pen of this.pens) {
      if (!isPenOpen(state, pen.id)) continue;
      for (const w of pen.animals) {
        if (w.residentId === null) continue;
        const distance = tapDistance({ x: w.walker.x, y: w.walker.y }, w.radius, point);
        if (distance <= bestDistance) {
          best = { penId: pen.id, residentId: w.residentId };
          bestDistance = distance;
        }
      }
    }
    return best;
  }
```

`anchorOf` sube con el tamaño:

```ts
    return w ? { x: w.walker.x, y: w.walker.y - 16 - (w.radius - BODY_RADIUS) * 2 } : null;
```

`src/scenes/WorldScene.ts`, en `update`:

```ts
    this.pens.update(time, delta, this.cameras.main.worldView);
```

- [ ] **Step 7: Ver que todo pasa**

Run: `npm test; npm run typecheck`
Expected: PASS. El test de «cinco cabras en su recinto» sigue pasando (sin radio, la separación es la de siempre).

- [ ] **Step 8: Verlo en el juego**

Arrancar el juego, `await window.__ZOO__.addCoins(9000)` y comprar la sabana, los dos recintos de elefantes y todos sus animales.
Expected: los dos elefantes de cada jaula no se montan uno encima del otro ni se salen por la valla; tocar el cuerpo o la cabeza de una jirafa manda a la cuidadora hacia ella; con la cuidadora en el parque del centro y al volver a la sabana, los animales siguen donde estaban y vuelven a moverse.

- [ ] **Step 9: Commit**

```bash
git add src tests
git commit -m "feat: los animales grandes se separan y se tocan por el cuerpo; lo que no se ve no se actualiza"
```

---

### Task 7: Granja de contacto: visitantes y corazones en `ovejas`

Los visitantes andan solo por los caminos, salvo en `ovejas`: cuando el recinto está abierto entran por la puerta (como mucho 3 a la vez), se paran junto a una oveja y salen. Las ovejas se apartan de quien pasa andando, se acercan a quien se queda quieto y siguen un rato a la cuidadora. Cuando un visitante y una oveja se juntan salen corazones.

**Files:**
- Create: `game/src/core/petting.ts`
- Modify: `game/src/core/flock.ts`
- Modify: `game/src/data/pens.ts`
- Modify: `game/src/world/VisitorCrowd.ts`, `game/src/world/Pens.ts`
- Modify: `game/src/scenes/WorldScene.ts`, `game/src/systems/testHooks.ts`
- Test: `game/tests/unit/petting.test.ts` (nuevo), `game/tests/unit/flock.test.ts`, `game/tests/unit/pens.test.ts`

**Interfaces:**
- Consumes: `Pens.update(time, delta, view)` y `Wanderer.radius` (Task 6); `withPenInteriors(grid, spaces, tile)` (plan 1).
- Produces:
  - `PenDef.visitors?: boolean` — solo `ovejas` lo lleva.
  - `core/petting.ts`: `MAX_VISITORS_INSIDE = 3`; `interface Stroller { pos: Vec; goal: Vec | null }`; `roomInside(visitors: readonly Stroller[], area: Rect, max = MAX_VISITORS_INSIDE): boolean`.
  - `core/flock.ts`: `fleeTarget(pos: Vec, from: Vec, space: PenSpace, distance = 20, margin = 8): Vec | null`; `followTarget(pos: Vec, to: Vec, space: PenSpace, keep = 20, margin = 8): Vec | null`.
  - `world/VisitorCrowd.ts`: `interface Petting { area: Rect; spots(): Vec[] }`; `setGrid(grid: WalkGrid): void`; `setPetting(petting: Petting | null): void`; `people(): { walking: Vec[]; standing: Vec[] }`; `insideCount(area: Rect): number`; `sendInside(from: Vec): boolean`.
  - `world/Pens.ts`: `interface People { keeper: Vec; walking: Vec[]; standing: Vec[] }`; `update(time, delta, view, people: People)`; `visitorSpaces(state): PenSpace[]`; `petting(state): Petting | null`; `rectOf(penId): Rect`; `heartsShown: number`.
  - Hooks de prueba: `visitorsInPen(penId): number`, `sendVisitorInside(penId): boolean`, `petHearts(): number`.

- [ ] **Step 1: Escribir los tests que fallan**

`tests/unit/petting.test.ts` (nuevo):

```ts
import { describe, expect, it } from 'vitest';
import { MAX_VISITORS_INSIDE, roomInside, type Stroller } from '../../src/core/petting';

const area = { x: 100, y: 100, width: 80, height: 60 };
const inside = { x: 120, y: 120 };
const outside = { x: 10, y: 10 };
const stroller = (pos: { x: number; y: number }, goal: { x: number; y: number } | null = null): Stroller => ({ pos, goal });

describe('aforo de la granja de contacto', () => {
  it('caben 3 visitantes', () => {
    expect(MAX_VISITORS_INSIDE).toBe(3);
  });

  it('con sitio, puede entrar uno más', () => {
    expect(roomInside([stroller(inside), stroller(inside), stroller(outside)], area)).toBe(true);
  });

  it('con 3 dentro no entra nadie más', () => {
    expect(roomInside([stroller(inside), stroller(inside), stroller(inside), stroller(outside)], area)).toBe(false);
  });

  it('cuentan también los que ya van hacia dentro', () => {
    expect(roomInside([stroller(inside), stroller(inside), stroller(outside, inside)], area)).toBe(false);
  });

  it('el que está dentro y va hacia fuera sigue contando hasta que sale', () => {
    expect(roomInside([stroller(inside, outside), stroller(inside), stroller(inside)], area)).toBe(false);
  });
});
```

`tests/unit/flock.test.ts` (importar `fleeTarget` y `followTarget`):

```ts
describe('ovejas de la granja de contacto', () => {
  const space = { inner: { x: 0, y: 0, width: 160, height: 120 }, obstacles: [{ x: 100, y: 40, width: 20, height: 20 }] };

  it('se aparta en dirección contraria a quien pasa', () => {
    expect(fleeTarget({ x: 60, y: 60 }, { x: 50, y: 60 }, space)).toEqual({ x: 80, y: 60 });
  });

  it('no se sale del recinto para apartarse (los animales no cruzan la valla ni la puerta)', () => {
    expect(fleeTarget({ x: 12, y: 60 }, { x: 22, y: 60 }, space)).toBeNull();
    expect(fleeTarget({ x: 80, y: 110 }, { x: 80, y: 100 }, space)).toBeNull();
  });

  it('no se aparta hacia una roca', () => {
    expect(fleeTarget({ x: 90, y: 50 }, { x: 80, y: 50 }, space)).toBeNull();
  });

  it('se acerca a alguien quedándose a un paso', () => {
    expect(followTarget({ x: 20, y: 80 }, { x: 80, y: 80 }, space, 20)).toEqual({ x: 60, y: 80 });
  });

  it('si ya está al lado, no se mueve', () => {
    expect(followTarget({ x: 70, y: 80 }, { x: 80, y: 80 }, space, 20)).toBeNull();
  });

  it('no atraviesa una roca para acercarse', () => {
    expect(followTarget({ x: 80, y: 50 }, { x: 150, y: 50 }, space, 20)).toBeNull();
  });
});
```

`tests/unit/pens.test.ts`:

```ts
  it('solo en el recinto de ovejas entran los visitantes', () => {
    expect(PEN_IDS.filter((id) => PENS[id].visitors)).toEqual(['ovejas']);
  });
```

- [ ] **Step 2: Ver que fallan**

Run: `npm test -- petting flock pens`
Expected: FAIL (no existe `core/petting`; `fleeTarget` y `followTarget` no existen; `visitors` no está en `PenDef`).

- [ ] **Step 3: Lógica pura**

`src/core/petting.ts` (nuevo):

```ts
import { rectContains, type Rect } from './interaction';
import type { Vec } from './movement';

/** Visitantes que caben a la vez dentro de la granja de contacto. */
export const MAX_VISITORS_INSIDE = 3;

/** Un visitante: dónde está y a dónde va (null si está parado). */
export interface Stroller {
  pos: Vec;
  goal: Vec | null;
}

/** ¿Cabe un visitante más? Cuentan los que están dentro y los que ya van hacia dentro. */
export function roomInside(visitors: readonly Stroller[], area: Rect, max = MAX_VISITORS_INSIDE): boolean {
  const busy = visitors.filter((v) => rectContains(area, v.pos) || (v.goal !== null && rectContains(area, v.goal))).length;
  return busy < max;
}
```

`src/core/flock.ts` (importar `segmentHitsRects` de `./obstacles`):

```ts
/** ¿Se puede estar en `p`? Dentro del recinto, a `margin` de la valla y fuera de los obstáculos. */
function freeSpot(p: Vec, space: PenSpace, margin: number): boolean {
  const { inner, obstacles } = space;
  return (
    p.x >= inner.x + margin &&
    p.x <= inner.x + inner.width - margin &&
    p.y >= inner.y + margin &&
    p.y <= inner.y + inner.height - margin &&
    !obstacles.some((r) => rectContains(r, p))
  );
}

function reachable(pos: Vec, p: Vec, space: PenSpace, margin: number): Vec | null {
  return freeSpot(p, space, margin) && !segmentHitsRects(pos, p, space.obstacles) ? p : null;
}

/** Destino para apartarse de `from`: `distance` px en dirección contraria. Null si ahí no se puede estar. */
export function fleeTarget(pos: Vec, from: Vec, space: PenSpace, distance = 20, margin = 8): Vec | null {
  const dx = pos.x - from.x;
  const dy = pos.y - from.y;
  const d = Math.hypot(dx, dy);
  if (d === 0) return null;
  return reachable(pos, { x: pos.x + (dx / d) * distance, y: pos.y + (dy / d) * distance }, space, margin);
}

/** Destino para acercarse a `to` quedándose a `keep` px. Null si ya está al lado o no hay paso. */
export function followTarget(pos: Vec, to: Vec, space: PenSpace, keep = 20, margin = 8): Vec | null {
  const dx = to.x - pos.x;
  const dy = to.y - pos.y;
  const d = Math.hypot(dx, dy);
  if (d <= keep) return null;
  return reachable(pos, { x: pos.x + (dx / d) * (d - keep), y: pos.y + (dy / d) * (d - keep) }, space, margin);
}
```

`src/data/pens.ts`, en `PenDef`:

```ts
  /** Granja de contacto: los visitantes también entran. */
  visitors?: boolean;
```

y `visitors: true` en `ovejas`.

- [ ] **Step 4: Ver que las unitarias pasan**

Run: `npm test -- petting flock pens`
Expected: PASS.

- [ ] **Step 5: `VisitorCrowd`: visitantes que entran a acariciar**

`src/world/VisitorCrowd.ts`, completo:

```ts
import type * as Phaser from 'phaser';
import { TILE_SIZE } from '../config';
import { rectContains, type Rect } from '../core/interaction';
import { stepAlongPath, tileCenter, worldToTile, type Vec } from '../core/movement';
import { findPath, type Point, type WalkGrid } from '../core/pathfinding';
import { roomInside } from '../core/petting';
import { pickRandom, planWander, walkableTiles, type Rng } from '../core/wander';
import { createVisitor, type Walker } from './Actors';

const VISITOR_EMOJIS = ['🧒', '👧', '👦', '👩', '👨', '🧓', '👵', '👴'];
/** El mapa grande es cuatro veces el de antes: con 8 visitantes se veía vacío. */
const VISITOR_COUNT = 14;
/** Más lentos que la cuidadora (64 px/s). */
const VISITOR_SPEED = 28;
/** De cada paseo, cuántos van a acariciar a un animal de la granja (si está abierta y cabe). */
const PET_CHANCE = 0.3;

/** Recinto donde entran los visitantes y los animales que se dejan acariciar. */
export interface Petting {
  area: Rect;
  spots(): Vec[];
}

interface Visitor {
  walker: Walker;
  route: Vec[];
  /** A dónde va (el final de su ruta); null si está parado. */
  goal: Vec | null;
  wait: number;
}

/** Número fijo de visitantes que se reutilizan siempre (nada de crear/destruir). */
export class VisitorCrowd {
  private readonly visitors: Visitor[] = [];
  /** Casillas de camino: a dónde van de paseo. */
  private readonly tiles: Point[];
  /** Por dónde pueden andar: los caminos y, si está abierta, la granja de contacto. */
  private grid: WalkGrid;
  private petting: Petting | null = null;

  constructor(
    scene: Phaser.Scene,
    paths: WalkGrid,
    private readonly rng: Rng = Math.random,
  ) {
    this.grid = paths;
    this.tiles = walkableTiles(paths);
    for (let index = 0; index < VISITOR_COUNT; index++) {
      const start = pickRandom(this.tiles, rng);
      if (!start) return;
      const pos = tileCenter(start, TILE_SIZE);
      const emoji = VISITOR_EMOJIS[index % VISITOR_EMOJIS.length]!;
      this.visitors.push({ walker: createVisitor(scene, index, pos.x, pos.y, emoji), route: [], goal: null, wait: rng() * 1500 });
    }
  }

  setGrid(grid: WalkGrid): void {
    this.grid = grid;
  }

  setPetting(petting: Petting | null): void {
    this.petting = petting;
  }

  update(delta: number): void {
    for (const visitor of this.visitors) {
      if (visitor.route.length === 0) {
        visitor.walker.stop();
        visitor.goal = null;
        visitor.wait -= delta;
        if (visitor.wait > 0) continue;
        this.setRoute(visitor, this.plan(visitor));
        continue;
      }
      const step = stepAlongPath(visitor.walker, visitor.route, VISITOR_SPEED, delta);
      visitor.walker.moveTo(step.pos.x, step.pos.y);
      visitor.route = step.remaining;
    }
  }

  /** Dónde está cada visitante, según ande o esté parado (para que las ovejas reaccionen). */
  people(): { walking: Vec[]; standing: Vec[] } {
    const walking: Vec[] = [];
    const standing: Vec[] = [];
    for (const v of this.visitors) (v.route.length > 0 ? walking : standing).push({ x: v.walker.x, y: v.walker.y });
    return { walking, standing };
  }

  insideCount(area: Rect): number {
    return this.visitors.filter((v) => rectContains(area, v.walker)).length;
  }

  /** Para pruebas: el primer visitante aparece en `from` y va a acariciar. False si no hay a quién o no hay paso. */
  sendInside(from: Vec): boolean {
    const visitor = this.visitors[0];
    if (!visitor) return false;
    visitor.walker.moveTo(from.x, from.y);
    visitor.walker.stop();
    const path = this.pathToPet(visitor);
    if (!path) return false;
    this.setRoute(visitor, path);
    return true;
  }

  private setRoute(visitor: Visitor, path: Point[] | null): void {
    visitor.route = path ? path.slice(1).map((tile) => tileCenter(tile, TILE_SIZE)) : [];
    visitor.goal = visitor.route[visitor.route.length - 1] ?? null;
    // Al llegar se queda un rato; junto a un animal, más.
    const petting = this.petting !== null && visitor.goal !== null && rectContains(this.petting.area, visitor.goal);
    visitor.wait = petting ? 2500 + this.rng() * 2000 : 800 + this.rng() * 2200;
  }

  private plan(visitor: Visitor): Point[] | null {
    const pet = this.petting;
    if (pet && this.rng() < PET_CHANCE) {
      const strollers = this.visitors.map((v) => ({ pos: { x: v.walker.x, y: v.walker.y }, goal: v.goal }));
      if (roomInside(strollers, pet.area)) {
        const path = this.pathToPet(visitor);
        if (path) return path;
      }
    }
    return planWander(this.grid, worldToTile(visitor.walker, TILE_SIZE), this.tiles, this.rng);
  }

  /** Camino hasta la casilla de uno de los animales que se dejan acariciar. */
  private pathToPet(visitor: Visitor): Point[] | null {
    const spot = pickRandom(this.petting?.spots() ?? [], this.rng);
    if (!spot) return null;
    const path = findPath(this.grid, worldToTile(visitor.walker, TILE_SIZE), worldToTile(spot, TILE_SIZE));
    return path && path.length > 1 ? path : null;
  }
}
```

- [ ] **Step 6: `Pens`: ovejas que reaccionan y corazones**

`src/world/Pens.ts`. Imports: `fleeTarget` y `followTarget` de `../core/flock`; `nearestWithin` de `../core/interaction`; `type Petting` de `./VisitorCrowd`.

Constantes, junto a `LOCKED_ALPHA`:

```ts
/** Una oveja se aparta de quien pasa andando a menos de esto (px). */
const FLEE_RADIUS = 14;
/** Y se acerca a quien se queda quieto a menos de esto. */
const CURIOUS_RADIUS = 64;
/** Tiempo (ms) que siguen a la cuidadora desde que entra. */
const FOLLOW_MS = 5000;
/** Un visitante y una oveja a menos de esto están juntos: salen corazones, como mucho cada HEART_EVERY ms. */
const HEART_RADIUS = 22;
const HEART_EVERY = 5000;

/** Quién anda por el mundo, para los recintos donde los animales reaccionan a la gente. */
export interface People {
  keeper: Vec;
  walking: Vec[];
  standing: Vec[];
}
```

En `Wanderer`: `/** Última vez (ms) que le salieron corazones. */ heartAt: number;` (y `heartAt: -HEART_EVERY` en `wanderer`). En `Pen`:

```ts
  /** Granja de contacto: entran visitantes y los animales reaccionan a la gente. */
  petting: boolean;
  keeperInside: boolean;
  /** Ms que les quedan de seguir a la cuidadora. */
  followLeft: number;
```

(en el constructor: `petting: def.visitors === true, keeperInside: false, followLeft: 0`).

Contador para las pruebas, junto a `held`:

```ts
  /** Veces que han salido corazones entre un visitante y un animal (para pruebas). */
  heartsShown = 0;
```

`update` recibe a la gente y, en los recintos de contacto abiertos, decide antes de pasear:

```ts
  update(time: number, delta: number, view: Rect, people: People): void {
    const art = getArt() !== null;
    for (const pen of this.pens) {
      if (!rectsOverlap(view, pen.rect, TILE_SIZE * 2)) continue;
      if (pen.petting && pen.shown) this.pet(pen, time, delta, people, art);
      const all = this.members(pen);
      …
```

Métodos nuevos:

```ts
  /** Interior de los recintos abiertos donde entran visitantes. */
  visitorSpaces(state: GameState): PenSpace[] {
    return this.pens.filter((pen) => pen.petting && isPenOpen(state, pen.id)).map((pen) => pen.space);
  }

  /** La granja de contacto, si está abierta: su zona y dónde están sus animales. */
  petting(state: GameState): Petting | null {
    const pen = this.pens.find((p) => p.petting && isPenOpen(state, p.id));
    if (!pen) return null;
    return { area: pen.rect, spots: () => pen.animals.map((w) => ({ x: w.walker.x, y: w.walker.y })) };
  }

  rectOf(penId: PenId): Rect {
    return this.pen(penId).rect;
  }

  /**
   * Granja de contacto. Cada animal, por orden: se aparta de quien pasa andando; sigue un rato a la
   * cuidadora cuando entra; el más cercano a un visitante parado se le acerca. Y cuando un visitante
   * parado y un animal están juntos, salen corazones.
   */
  private pet(pen: Pen, time: number, delta: number, people: People, art: boolean): void {
    const keeperInside = rectContains(pen.rect, people.keeper);
    if (keeperInside && !pen.keeperInside) pen.followLeft = FOLLOW_MS;
    pen.keeperInside = keeperInside;
    if (keeperInside) pen.followLeft = Math.max(0, pen.followLeft - delta);
    const standing = people.standing.filter((p) => rectContains(pen.rect, p));

    for (const w of art ? pen.animals : []) {
      if (w.residentId === this.held) continue;
      const pos = w.roam.pos;
      const passer = nearestWithin(people.walking, pos, FLEE_RADIUS);
      // undefined: pasea a su aire. null: se queda donde está.
      let target: Vec | null | undefined;
      if (passer) target = fleeTarget(pos, passer, pen.space) ?? undefined;
      else if (keeperInside && pen.followLeft > 0) target = followTarget(pos, people.keeper, pen.space, 22);
      else {
        const visitor = nearestWithin(standing, pos, CURIOUS_RADIUS);
        if (visitor && this.closest(pen, visitor) === w) target = followTarget(pos, visitor, pen.space, 14);
      }
      if (target === undefined) continue;
      w.roam = target ? { ...w.roam, target, rest: 0 } : { ...w.roam, target: null, rest: 300 };
    }

    for (const visitor of standing) {
      const w = this.closest(pen, visitor);
      if (!w || Math.hypot(w.walker.x - visitor.x, w.walker.y - visitor.y) > HEART_RADIUS) continue;
      if (time - w.heartAt < HEART_EVERY) continue;
      w.heartAt = time;
      this.heartsShown++;
      this.hearts({ x: w.walker.x, y: w.walker.y });
      this.hearts(visitor);
    }
  }

  private closest(pen: Pen, point: Vec): Wanderer | null {
    let best: Wanderer | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const w of pen.animals) {
      const d = Math.hypot(w.walker.x - point.x, w.walker.y - point.y);
      if (d < bestDistance) {
        best = w;
        bestDistance = d;
      }
    }
    return best;
  }

  /** Corazones que suben, como en la reacción especial de la ventana de dar de comer. */
  private hearts(at: Vec): void {
    ['❤️', '💕', '💖'].forEach((shape, i) => {
      const heart = this.sparkle(shape).setPosition(at.x + (i - 1) * 6, at.y - 14);
      this.scene.tweens.add({ targets: heart, y: heart.y - 16, alpha: 0, delay: i * 120, duration: 900, onComplete: () => heart.setVisible(false) });
    });
  }
```

- [ ] **Step 7: Conectarlo en `WorldScene` y en los hooks**

`src/scenes/WorldScene.ts`. En `create`, después de crear los visitantes:

```ts
    this.visitors = new VisitorCrowd(this, this.pathGrid);
    this.syncVisitors(state);
```

En `update`:

```ts
    this.visitors.update(delta);
    this.pens.update(time, delta, this.cameras.main.worldView, { keeper: this.keeperPosition(), ...this.visitors.people() });
```

En `onResume`, después de recalcular `this.grid`: `this.syncVisitors(state);`. Y los métodos:

```ts
  /** Los visitantes andan por los caminos y, si está abierta, por dentro de la granja de contacto. */
  private syncVisitors(state: GameState): void {
    this.visitors.setGrid(withPenInteriors(this.pathGrid, this.pens.visitorSpaces(state), TILE_SIZE));
    this.visitors.setPetting(this.pens.petting(state));
  }

  visitorsInPen(penId: PenId): number {
    return this.visitors.insideCount(this.pens.rectOf(penId));
  }

  /** Para pruebas: un visitante aparece delante de la puerta del recinto y entra a acariciar. */
  sendVisitorInside(penId: PenId): boolean {
    const tile = this.gateApproachTile(penId);
    return tile ? this.visitors.sendInside(tileCenter(tile, TILE_SIZE)) : false;
  }

  petHearts(): number {
    return this.pens.heartsShown;
  }
```

`src/systems/testHooks.ts`, en `ZooTestApi`:

```ts
  visitorsInPen(penId: PenId): number;
  /** Un visitante aparece delante de la puerta del recinto y entra a acariciar. */
  sendVisitorInside(penId: PenId): boolean;
  petHearts(): number;
```

y en la implementación:

```ts
    visitorsInPen: (penId) => activeScene<WorldScene>('World')?.visitorsInPen(penId) ?? 0,
    sendVisitorInside: (penId) => activeScene<WorldScene>('World')?.sendVisitorInside(penId) ?? false,
    petHearts: () => activeScene<WorldScene>('World')?.petHearts() ?? 0,
```

- [ ] **Step 8: Ver que todo pasa**

Run: `npm test; npm run typecheck`
Expected: PASS.

- [ ] **Step 9: Verlo en el juego**

Arrancar el juego, `await window.__ZOO__.addCoins(2000)`, comprar el estanque, las ovejas y dos o tres ovejas más, salir de la tienda e ir a la puerta de las ovejas. En la consola: `window.__ZOO__.sendVisitorInside('ovejas')`.
Expected: el visitante entra por la puerta y va hacia una oveja; al pasar pegado a otra, esa se aparta; se para, la oveja más cercana se le arrima y salen corazones sobre los dos; al rato el visitante sale por la puerta. Las ovejas no salen del recinto. Al entrar la cuidadora, las ovejas la siguen unos segundos y luego vuelven a lo suyo. Dejando el juego un par de minutos, nunca hay más de 3 visitantes dentro (`window.__ZOO__.visitorsInPen('ovejas')`). En el resto de recintos no entra ningún visitante.

- [ ] **Step 10: Commit**

```bash
git add src tests
git commit -m "feat: los visitantes entran a acariciar a las ovejas y salen corazones"
```

---

### Task 8: Pruebas de extremo a extremo y documentación

**Files:**
- Modify: `game/src/scenes/WorldScene.ts`, `game/src/systems/testHooks.ts`
- Create: `game/tests/e2e/zoo-grande.spec.ts`
- Modify: `docs/superpowers/specs/2026-10-05-zoo-grande-design.md`, `game/README.md`
- Modify (repo privado): `../zooesponji-private/art-work/GUIA-PINTAR-CON-PISKEL.md`

**Interfaces:**
- Consumes: hooks `feedResident`, `keeperInPen`, `feedTargets`, `isFeedBusy`, `hudCoinsText`, `addCoins`, `gateApproachTile`, `goToTile`, `keeperPosition`, `visitorsInPen`, `sendVisitorInside`, `petHearts`.
- Produces: hook `buy(itemId: string): Promise<boolean>` — compra sin pasar por la tienda y pone al día el mundo; `WorldScene.refresh(): void`.

- [ ] **Step 1: Hook para comprar desde las pruebas**

`src/scenes/WorldScene.ts`: sacar a un método público lo que `onResume` hace con el estado, y usarlo desde `onResume`:

```ts
  /** Pone el mundo al día con el estado: recintos recién abiertos, animales nuevos y por dónde se anda. */
  refresh(): void {
    const state = getSession().state;
    this.pens.release();
    this.pens.syncUnlocks(state);
    this.grid = withPenInteriors(this.pathGrid, this.pens.openSpaces(state), TILE_SIZE);
    this.syncVisitors(state);
    this.shop?.sync(state);
  }

  private onResume(_sys: Phaser.Scenes.Systems, data?: { from?: string }): void {
    if (data?.from === 'shop') this.leaveShop();
    this.refresh();
  }
```

`src/systems/testHooks.ts`, en `ZooTestApi`:

```ts
  /** Compra un artículo sin pasar por la tienda (para llegar rápido a un recinto en las pruebas). */
  buy(itemId: string): Promise<boolean>;
```

y en la implementación:

```ts
    buy: async (itemId) => {
      const result = await getSession().buy(itemId);
      game.scene.getScene<WorldScene>('World').refresh();
      return result.ok;
    },
```

- [ ] **Step 2: Escribir los e2e**

`tests/e2e/zoo-grande.spec.ts` (nuevo):

```ts
import { expect, test, type Page } from '@playwright/test';

// El mapa es grande: la cuidadora tarda en cruzarlo.
test.setTimeout(120_000);

async function canvasBox(page: Page) {
  const box = await page.locator('canvas').boundingBox();
  if (!box) throw new Error('No hay canvas');
  return box;
}

async function startGame(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForFunction(() => window.__ZOO__?.activeScenes().includes('Title'));
  const box = await canvasBox(page);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.62);
  await page.waitForFunction(() => window.__ZOO__?.activeScenes().includes('World'));
}

async function dragFood(page: Page, food: string): Promise<void> {
  const targets = await page.evaluate(() => window.__ZOO__!.feedTargets());
  if (!targets) throw new Error('La escena de comer no está abierta');
  const box = await canvasBox(page);
  const from = (targets.foods as Record<string, { x: number; y: number }>)[food]!;
  await page.mouse.move(box.x + from.x, box.y + from.y);
  await page.mouse.down();
  await page.mouse.move(box.x + targets.animal.x, box.y + targets.animal.y, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(150);
  await expect.poll(() => page.evaluate(() => window.__ZOO__!.isFeedBusy())).toBe(false);
}

/** Toca a un animal (la cuidadora va andando hasta él) y espera a que se abra la comida. */
async function feed(page: Page, residentId: string): Promise<void> {
  expect(await page.evaluate((id) => window.__ZOO__!.feedResident(id), residentId)).toBe(true);
  await page.waitForFunction(() => window.__ZOO__?.activeScenes().includes('Feed'), undefined, { timeout: 90_000 });
}

async function closeFeed(page: Page): Promise<void> {
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !window.__ZOO__?.activeScenes().includes('Feed'));
}

const coins = (page: Page) => page.evaluate(() => window.__ZOO__!.hudCoinsText());

test('se compra el estanque, la cuidadora entra y da de comer a un pato', async ({ page }) => {
  await startGame(page);
  await page.evaluate(() => window.__ZOO__!.addCoins(200));
  expect(await page.evaluate(() => window.__ZOO__!.buy('estanque'))).toBe(true);
  expect(await page.evaluate(() => window.__ZOO__!.animalsInPen('estanque'))).toBe(1);

  await feed(page, 'cuac');
  expect(await page.evaluate(() => window.__ZOO__!.keeperInPen('estanque'))).toBe(true);
  await dragFood(page, 'maiz');
  // 200 − 150 del estanque + 3 del pato.
  await expect.poll(() => coins(page)).toBe('🪙 53');
  // El pan les sienta mal: no da monedas.
  await dragFood(page, 'pan');
  await expect.poll(() => coins(page)).toBe('🪙 53');
});

test('en la sabana se da de comer a una jirafa y a una cebra, cada una con su bandeja', async ({ page }) => {
  await startGame(page);
  await page.evaluate(() => window.__ZOO__!.addCoins(1100));
  expect(await page.evaluate(() => window.__ZOO__!.buy('sabana'))).toBe(true);
  expect(await page.evaluate(() => window.__ZOO__!.buy('extra-sabana'))).toBe(true); // Raya, la cebra: 120
  expect(await page.evaluate(() => window.__ZOO__!.animalsInPen('sabana'))).toBe(2);

  await feed(page, 'lola');
  expect(await page.evaluate(() => window.__ZOO__!.keeperInPen('sabana'))).toBe(true);
  let foods = Object.keys((await page.evaluate(() => window.__ZOO__!.feedTargets()))!.foods);
  expect(foods.sort()).toEqual(['calcetin', 'carne', 'lechuga', 'manzana', 'platano']);
  await dragFood(page, 'lechuga');
  // 1100 − 900 − 120 + 8 de la jirafa.
  await expect.poll(() => coins(page)).toBe('🪙 88');
  await closeFeed(page);

  await feed(page, 'raya');
  foods = Object.keys((await page.evaluate(() => window.__ZOO__!.feedTargets()))!.foods);
  expect(foods.sort()).toEqual(['lechuga', 'manzana', 'pescado', 'piedra', 'zanahoria']);
  await dragFood(page, 'zanahoria');
  // + 6 de la cebra.
  await expect.poll(() => coins(page)).toBe('🪙 94');
});

test('un visitante entra en el recinto de las ovejas y salen corazones', async ({ page }) => {
  await startGame(page);
  await page.evaluate(() => window.__ZOO__!.addCoins(300));
  expect(await page.evaluate(() => window.__ZOO__!.buy('ovejas'))).toBe(true);

  // La cuidadora se acerca a la puerta: los recintos que no se ven no se actualizan.
  const approach = await page.evaluate(() => window.__ZOO__!.gateApproachTile('ovejas'));
  await page.evaluate(([x, y]) => window.__ZOO__!.goToTile(x!, y!), [approach!.x, approach!.y]);
  await expect
    .poll(() => page.evaluate(() => window.__ZOO__!.keeperPosition()), { timeout: 60_000 })
    .toEqual({ x: approach!.x * 16 + 8, y: approach!.y * 16 + 8 });

  expect(await page.evaluate(() => window.__ZOO__!.sendVisitorInside('ovejas'))).toBe(true);
  await expect.poll(() => page.evaluate(() => window.__ZOO__!.visitorsInPen('ovejas')), { timeout: 30_000 }).toBeGreaterThanOrEqual(1);
  await expect.poll(() => page.evaluate(() => window.__ZOO__!.petHearts()), { timeout: 30_000 }).toBeGreaterThanOrEqual(1);
  expect(await page.evaluate(() => window.__ZOO__!.visitorsInPen('ovejas'))).toBeLessThanOrEqual(3);
});

test('sin comprar las ovejas, ningún visitante entra en su recinto', async ({ page }) => {
  await startGame(page);
  expect(await page.evaluate(() => window.__ZOO__!.sendVisitorInside('ovejas'))).toBe(false);
  expect(await page.evaluate(() => window.__ZOO__!.visitorsInPen('ovejas'))).toBe(0);
});
```

- [ ] **Step 3: Ejecutar todo**

Run: `npm test; npm run typecheck; npm run test:e2e`
Expected: PASS. El e2e del león entrando en su recinto (`play.spec.ts`, ya existente) cubre «el león, la pantera y el panda siguen jugándose igual de fácil».

Si el e2e del visitante falla porque no salen corazones, mirar con `preview_start` qué pasa al llamar a `sendVisitorInside('ovejas')` (¿el visitante se para lejos de la oveja?, ¿la oveja no se acerca?) y ajustar `HEART_RADIUS` o `CURIOUS_RADIUS` en `Pens.ts`; no alargar los tiempos de espera del test.

- [ ] **Step 4: Estado en el spec**

`docs/superpowers/specs/2026-10-05-zoo-grande-design.md`. La cabecera pasa a:

```markdown
**Estado:** aprobado por David (5-oct-2026). Planes: cuatro; hechos los tres primeros, falta el 4
(ver «Estado de implementación» al final).
```

En la tabla de «Estado de implementación», la fila del plan 3:

```markdown
| 3. Mapa y recintos | ✅ Hecho | `docs/superpowers/plans/2026-10-05-zoo-grande-3-mapa-y-recintos.md` |
```

Y al final, una sección nueva con lo que de verdad se haya decidido al implementar. Como mínimo:

```markdown
### Decisiones tomadas durante la implementación (plan 3)

- El mapa mide 96×60. El parque de siempre queda en el centro (desplazado 24 a la derecha y 20 hacia
  abajo) y `make-zoo-map.mjs` lo escribe en sus coordenadas de antes.
- La propiedad de recintos y puertas del mapa se llama `penId`.
- Orden de llegada en los recintos mixtos. Sabana: Lola, Raya, Brisa, Pecas, Zigzag, Salto, Miel, Pipa.
  Establo: Canela, Pepa, Lucero, Kiko, Clo, Tizón, Miga, Mancha.
- Al dar de comer reaccionan el animal y los de su especie en el recinto, no todo el recinto.
- Los animales grandes llevan `radius` en su especie: se separan más y se tocan por el cuerpo.
- La charca de pingüinos y la del estanque bloquean el paso, como la catarata de la pantera: los patos
  pasean alrededor.
- Visitantes: 14 en lugar de 8 (el mapa es cuatro veces mayor). En `ovejas`, la oveja más cercana a un
  visitante parado se le acerca, y los corazones salen cuando están a menos de 22 px.
- Adelantado del plan 4, lo justo para que el juego funcione: la tienda enseña solo los 3 recintos
  siguientes (`PENS_ON_SALE`) y los 35 residentes tienen título (`book.page.<id>.title`), que la ventana
  de dar de comer usa como nombre. Las páginas, sus textos y los capítulos siguen en el plan 4.
- Pendiente para el plan 4: con muchos recintos abiertos, los «otro animal» pasan de las 5 peanas y los
  que sobran salen en fila delante del mostrador.
```

Añadir a esa lista cualquier otra cosa que haya cambiado respecto a este plan (coordenadas de un recorte, un radio, un color).

- [ ] **Step 5: README del juego**

En `game/README.md`:

- Línea de **Mapa**: `npm run make:zoo-map` genera un mapa de 96×60: el parque de siempre en el centro y tres zonas (sabana al norte, polo al oeste, granja al este), cada una con su cartel.
- En «Añadir un animal» (el punto que habla de la capa `objetos` de Tiled): la propiedad de `recinto` y `puerta` se llama `penId`.
- Sección «Animales distintos dentro de un recinto»: añadir que un recinto puede mezclar especies (sabana, establo), que la tienda vende el siguiente de su lista al precio de su especie, y que cada especie puede llevar `radius` si es grande.
- En la descripción de `src/world/`: `VisitorCrowd` (visitantes; en la granja de contacto entran a acariciar, 3 como mucho) y `Pens` (los recintos que no se ven no se actualizan).
- En `src/core/`: añadir `petting` (aforo de la granja de contacto).
- Recordatorio en la parte de arte: tras añadir una especie o un aspecto hay que volver a ejecutar `npm run art:import`.

- [ ] **Step 6: Guía de los niños (repo privado)**

En `../zooesponji-private/art-work/GUIA-PINTAR-CON-PISKEL.md`, añadir al final:

```markdown
## Pintar un animal del zoo grande

Cada animal nuevo tiene su dibujo. Para cambiar uno, pinta su hoja (3 columnas × 4 filas: de frente,
izquierda, derecha y de espaldas) y guárdala en `art-work/terminados/` con el nombre de la tabla.
Luego se ejecuta `npm run art:import` en `game/`.

| Animal | Archivo | Tamaño de cada dibujito |
|---|---|---|
| Patos: Cuac, Charco, Pluma, Remo, Pío | `pato.png`, `pato-charco.png`, `pato-pluma.png`, `pato-remo.png`, `pato-pio.png` | 16×16 |
| Ovejas: Lana, Bolita, Trueno, Algodón, Rizos | `oveja.png`, `oveja-bolita.png`, `oveja-trueno.png`, `oveja-algodon.png`, `oveja-rizos.png` | 16×16 |
| Caballos: Canela, Lucero, Tizón, Mancha | `caballo.png`, `caballo-lucero.png`, `caballo-tizon.png`, `caballo-mancha.png` | 32×32 |
| Gallinas Pepa, Clo, Miga y gallo Kiko | `gallina.png`, `gallina-clo.png`, `gallina-miga.png`, `gallo.png` | 16×16 |
| Pingüinos: Pingu, Copito, Frac, Tobogán, Hielo | `pinguino.png`, `pinguino-copito.png`, `pinguino-frac.png`, `pinguino-tobogan.png`, `pinguino-hielo.png` | 16×16 |
| Jirafas: Lola, Pecas | `jirafa.png`, `jirafa-pecas.png` | 48×48 |
| Cebras: Raya, Zigzag | `cebra.png`, `cebra-zigzag.png` | 32×32 |
| Gacelas: Brisa, Salto, Miel, Pipa | `gacela.png`, `gacela-salto.png`, `gacela-miel.png`, `gacela-pipa.png` | 16×16 |
| Elefantes africanos: Tembo, Kali | `elefante-africano.png`, `elefante-africano-kali.png` | 48×48 |
| Elefantes asiáticos: Raja, Mali | `elefante-asiatico.png`, `elefante-asiatico-mali.png` | 48×48 |

Para ver cómo es ahora un animal antes de pintarlo: `npm run art:preview -- oveja-trueno` deja su dibujo
en grande en `art-work/plantillas/`.
```

- [ ] **Step 7: Commit**

```bash
git add src tests ../docs game/README.md 2>/dev/null || git add src tests README.md ../docs
git commit -m "docs: mapa y recintos del zoo grande (plan 3), con sus pruebas de extremo a extremo"
```

Y en el repo privado: `git -C ../../zooesponji-private add art-work/GUIA-PINTAR-CON-PISKEL.md; git -C ../../zooesponji-private commit -m "guía: animales del zoo grande"`.

---

## Self-Review

**Cobertura del spec (lo que toca al plan 3):**

| Requisito | Tarea |
|---|---|
| Mapa de 48×35 a 96×60, parque intacto en el centro, tres zonas | 2 |
| Sabana grande, dos jaulas de elefantes con pasillo de césped | 2 |
| Polo con tundra y agua; granja con pradera y estanque | 2 |
| Cartel de zona a la entrada; candado y precio en lo no comprado | 2 (el candado ya lo pone `Pens`) |
| 11 especies con su bandeja (4–5 comidas, regla de las bandejas) | 3 |
| Monedas y precio de «otro animal» por especie | 3 |
| 7 recintos, 35 residentes, orden de llegada, nombres aprobados | 4 |
| Comprar un recinto trae solo su primer residente; el extra cuesta según su especie | 4 (motor del plan 1; tests nuevos) |
| Partidas guardadas válidas sin migración | 4 |
| Recintos mixtos: se da de comer al animal que se toca | 4 |
| Cada residente con su hoja: pack, variante real o recolor | 4 y 5 |
| Coherencia especie ↔ sprites ↔ recinto en el mapa | 2, 3 y 4 (`zoomap`, `artConfig`, `pens`) |
| Rendimiento: los recintos fuera de pantalla no se actualizan | 6 |
| Visitantes dentro de `ovejas`, 3 como mucho; ovejas que se apartan y siguen a la cuidadora; corazones | 7 |
| Los animales no cruzan la puerta | 7 (`fleeTarget`) y el paseo de siempre |
| E2E: estanque y pato; jirafa y cebra; visitante en ovejas; león entrando | 8 (el del león ya existe) |

**Queda para el plan 4:** las 35 páginas del libro con sus textos (David los aprueba antes), capítulos e índice, el test de textos fuera de `strings.ts`, la tienda cuando hay más artículos que peanas, y la versión 2.3.0. La comprobación «cada residente tiene página» se relaja en la Task 4 solo para los 35 nuevos y vuelve a ser total en el plan 4.

**Punto abierto del diseño, sin resolver aquí:** en la tabla de comidas el **huevo** lo rechazan la gacela, el caballo y el gallo, pero no lo come ningún animal. La regla de las bandejas se sigue cumpliendo (cada uno rechaza además otra comida que alguien sí come), pero el huevo se queda como comida que nadie quiere. Si no es lo buscado, basta con que una especie lo coma (cambio de una línea en `data/animals.ts`).

**Consistencia de nombres:** `penId` (Task 1) se usa igual en `EnclosureInfo`, `GateInfo`, `GateRef`, el mapa y los hooks. `wanderer(walker, residentId, species, radius, rest)` gana `species` en la Task 4 y `radius` en la 6. `Pens.update(time, delta, view)` (Task 6) pasa a `update(time, delta, view, people)` en la 7. `Pens.celebrate(residentId, reaction)` desde la Task 4. Los ids de recinto del mapa (Task 2) son los de `PEN_IDS` (Task 4), y un test lo comprueba.
