# Zoo grande, plan 2 de 4: arte y comidas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que cada animal pueda tener su propio aspecto (empezando por las 5 cabras) y que el juego tenga las 7 comidas nuevas, una amiga (la gallina) y una cosa rara (un calcetín) con su icono, listas para los recintos del plan 3.

**Architecture:** Un "aspecto" (`look`) es una hoja de sprites con nombre propio. El importador de arte la construye por este orden: dibujo de los niños, hoja del pack, y encima una lista de **retoques** declarados en `art.config.json` (cambio de colores por zona y puntos sueltos). El manifiesto de arte pasa a ir por aspecto en lugar de por especie, y cada residente dibuja el suyo en el mundo, la ventana de comer, la tienda y el libro.

**Tech Stack:** TypeScript, Phaser 4, Vite, Vitest, Playwright, `pngjs` y `adm-zip` (ya instalados). Todo dentro de `game/`.

**Spec:** `docs/superpowers/specs/2026-10-05-zoo-grande-design.md`. **Plan anterior:** `docs/superpowers/plans/2026-10-05-zoo-grande-1-cimientos.md` (hecho).

## Global Constraints

- **Ningún archivo de arte de los packs entra en este repo.** `game/public/art/` y `art-packs/` están en `.gitignore`. Las vistas previas se escriben en el repo privado (`../zooesponji-private/art-work/plantillas/`).
- El repo privado tiene que estar clonado junto a este (`C:\Projects\games\zooesponji-private`); sin él `npm run art:import` se para con un aviso.
- Las partidas guardadas siguen valiendo: no se toca `SAVE_VERSION` ni ningún id de recinto o residente.
- `core/` no importa Phaser ni APIs del navegador.
- Ningún texto visible fuera de `src/data/strings.ts`; frases completas.
- Cada especie enseña entre 4 y 5 comidas en su bandeja.
- **Regla de las bandejas:** en cada bandeja hay al menos una comida de verdad que ese animal rechaza y que otro animal sí come. Además hay cosas raras (piedra, calcetín) que casi todos rechazan.
- No se sube la versión (sigue 2.2.0): la 2.3.0 sale al cerrar el plan 4.
- Los dibujos de los niños mandan: si existe `art-work/terminados/<archivo>` para un aspecto, se usa tal cual y no se le aplican retoques.
- Todos los comandos se ejecutan desde `game/`. Unitarias: `npm test`. Tipos: `npm run typecheck`. E2E: `npm run test:e2e`.
- Commits en español con el prefijo del repo (`feat:`, `refactor:`, `test:`, `docs:`).

## Mapa de archivos

| Archivo | Cambio | Responsabilidad |
|---|---|---|
| `scripts/art/pngTools.ts` | Modificar | `editSheet` (retoques) y `scaleUp` |
| `scripts/art/source.ts` | Modificar | Tipo de un aspecto en la configuración |
| `scripts/art/looks.ts` | Nuevo | Construir la hoja de un aspecto |
| `scripts/art/preview.ts` | Nuevo | Vista ×8 de un aspecto, al repo privado |
| `scripts/import-art.ts` | Modificar | Usa `buildLook` |
| `art/art.config.json` | Modificar | Aspectos de las cabras e iconos de las 7 comidas |
| `src/data/pens.ts` | Modificar | `allLooks()`; aspecto de cada cabra |
| `src/art/manifest.ts`, `src/art/art.ts` | Modificar | Manifiesto y carga por aspecto |
| `src/world/Actors.ts`, `world/Pens.ts` | Modificar | Dibujar el aspecto del residente |
| `src/scenes/FeedScene.ts`, `BookScene.ts`, `ShopScene.ts`, `SettingsScene.ts` | Modificar | Idem en cada pantalla |
| `src/core/shopEntries.ts` | Modificar | `ShopEntry.look` |
| `src/data/foods.ts`, `data/strings.ts`, `data/animals.ts` | Modificar | 7 comidas; la cabra come lechuga |

---

### Task 1: Retoques de una hoja de sprites

**Files:**
- Modify: `game/scripts/art/pngTools.ts`
- Test: `game/tests/unit/pngTools.test.ts`

**Interfaces:**
- Produces:
  - `interface SheetEdit { swap?: Record<string, string>; dots?: [number, number, string][]; rows?: number[]; cols?: number[]; area?: [number, number, number, number] }`
  - `editSheet(src: PNG, edits: readonly SheetEdit[], cols = 3, rows = 4): PNG`
  - `scaleUp(src: PNG, k: number): PNG`
  - `shrinkFrames(src: PNG, size: number, cols = 3, rows = 4): PNG`: cada fotograma reducido a `size`×`size` y apoyado abajo en el centro (para un animal más pequeño que los de su especie).

Una hoja es de 3 columnas × 4 filas de fotogramas (filas: de frente, izquierda, derecha, de espaldas). Un retoque se aplica a los fotogramas de las filas (`rows`) y columnas (`cols`) indicadas; todas si no se indican. `cols` sirve para cuando el animal sube o baja un píxel al andar y un punto tiene que moverse con él. `swap` cambia colores exactos (`"f4f3f2": "e8c9a0"`) solo en píxeles opacos y solo dentro de `area` (`[x, y, ancho, alto]` dentro del fotograma; todo si no se indica). `dots` pinta píxeles sueltos (`[x, y, color]`, relativos al fotograma).

- [ ] **Step 1: Escribir los tests que fallan**

Añadir a `game/tests/unit/pngTools.test.ts` (ampliando el import de `pngTools.ts` con `editSheet, scaleUp, shrinkFrames`):

```ts
describe('editSheet', () => {
  // Hoja 3×4 de fotogramas de 2×2 px, toda blanca.
  const sheet = () => solid(6, 8, [244, 243, 242, 255]);

  it('cambia un color exacto en todos los fotogramas', () => {
    const out = editSheet(sheet(), [{ swap: { f4f3f2: 'e8c9a0' } }]);
    expect(pixel(out, 0, 0)).toEqual([232, 201, 160, 255]);
    expect(pixel(out, 5, 7)).toEqual([232, 201, 160, 255]);
  });

  it('no toca el original ni los colores que no están en la tabla', () => {
    const src = sheet();
    src.data.set([65, 64, 64, 255], 0);
    const out = editSheet(src, [{ swap: { f4f3f2: '000000' } }]);
    expect(pixel(out, 0, 0)).toEqual([65, 64, 64, 255]);
    expect(pixel(src, 1, 0)).toEqual([244, 243, 242, 255]);
  });

  it('respeta la zona: lo de fuera se queda igual (calcetines)', () => {
    const out = editSheet(sheet(), [{ swap: { f4f3f2: 'b8824e' }, area: [0, 0, 2, 1] }]);
    expect(pixel(out, 0, 0)).toEqual([184, 130, 78, 255]);
    expect(pixel(out, 0, 1)).toEqual([244, 243, 242, 255]);
    // Segundo fotograma de la tercera fila: misma zona relativa.
    expect(pixel(out, 2, 4)).toEqual([184, 130, 78, 255]);
    expect(pixel(out, 2, 5)).toEqual([244, 243, 242, 255]);
  });

  it('respeta las filas indicadas', () => {
    const out = editSheet(sheet(), [{ swap: { f4f3f2: '000000' }, rows: [3] }]);
    expect(pixel(out, 0, 0)).toEqual([244, 243, 242, 255]);
    expect(pixel(out, 0, 6)).toEqual([0, 0, 0, 255]);
  });

  it('no cambia píxeles transparentes o semitransparentes (la sombra)', () => {
    const src = sheet();
    src.data.set([244, 243, 242, 43], 0);
    expect(pixel(editSheet(src, [{ swap: { f4f3f2: '000000' } }]), 0, 0)).toEqual([244, 243, 242, 43]);
  });

  it('pinta puntos sueltos en los 3 fotogramas de la fila', () => {
    const out = editSheet(sheet(), [{ dots: [[1, 1, 'f2c230']], rows: [0] }]);
    expect(pixel(out, 1, 1)).toEqual([242, 194, 48, 255]);
    expect(pixel(out, 3, 1)).toEqual([242, 194, 48, 255]);
    expect(pixel(out, 5, 1)).toEqual([242, 194, 48, 255]);
    expect(pixel(out, 1, 3)).toEqual([244, 243, 242, 255]);
  });

  it('respeta las columnas indicadas (un fotograma concreto del paso)', () => {
    const out = editSheet(sheet(), [{ dots: [[0, 0, 'f2c230']], rows: [0], cols: [1] }]);
    expect(pixel(out, 2, 0)).toEqual([242, 194, 48, 255]);
    expect(pixel(out, 0, 0)).toEqual([244, 243, 242, 255]);
    expect(pixel(out, 4, 0)).toEqual([244, 243, 242, 255]);
  });

  it('avisa de un color mal escrito', () => {
    expect(() => editSheet(sheet(), [{ swap: { f4f3f2: 'rojo' } }])).toThrow('rojo');
  });
});

describe('shrinkFrames', () => {
  it('reduce cada fotograma y lo apoya abajo en el centro, sin cambiar el tamaño de la hoja', () => {
    // Hoja 3×4 de fotogramas de 4×4, toda negra opaca.
    const out = shrinkFrames(solid(12, 16, [0, 0, 0, 255]), 2);
    expect([out.width, out.height]).toEqual([12, 16]);
    // Primer fotograma: el dibujo ocupa x 1..2, y 2..3.
    expect(pixel(out, 0, 3)[3]).toBe(0);
    expect(pixel(out, 1, 1)[3]).toBe(0);
    expect(pixel(out, 1, 2)).toEqual([0, 0, 0, 255]);
    expect(pixel(out, 2, 3)).toEqual([0, 0, 0, 255]);
    expect(pixel(out, 3, 3)[3]).toBe(0);
    // Último fotograma (columna 2, fila 3): misma colocación.
    expect(pixel(out, 9, 15)).toEqual([0, 0, 0, 255]);
    expect(pixel(out, 8, 15)[3]).toBe(0);
  });

  it('con el tamaño del fotograma no cambia nada', () => {
    const src = solid(12, 16, [9, 9, 9, 255]);
    expect([...shrinkFrames(src, 4).data]).toEqual([...src.data]);
  });
});

describe('scaleUp', () => {
  it('amplía sin suavizar', () => {
    const src = solid(2, 1, [0, 0, 0, 255]);
    src.data.set([255, 0, 0, 255], 4);
    const out = scaleUp(src, 3);
    expect([out.width, out.height]).toEqual([6, 3]);
    expect(pixel(out, 2, 2)).toEqual([0, 0, 0, 255]);
    expect(pixel(out, 3, 0)).toEqual([255, 0, 0, 255]);
  });
});
```

- [ ] **Step 2: Ver que fallan**

Run: `npm test -- pngTools`
Expected: FAIL, `editSheet` y `scaleUp` no existen.

- [ ] **Step 3: Implementar**

Añadir al final de `game/scripts/art/pngTools.ts`:

```ts
/** Un retoque sobre una hoja de fotogramas: cambio de colores por zona y/o puntos sueltos. */
export interface SheetEdit {
  /** Color exacto → color nuevo, en hexadecimal (`"f4f3f2": "e8c9a0"`). Solo píxeles opacos. */
  swap?: Record<string, string>;
  /** Píxeles sueltos [x, y, color], relativos al fotograma. */
  dots?: [number, number, string][];
  /** Filas de la hoja a las que se aplica (0 de frente, 1 izquierda, 2 derecha, 3 de espaldas). Todas si falta. */
  rows?: number[];
  /** Columnas (fotogramas del paso: 0, 1, 2) a las que se aplica. Todas si falta. */
  cols?: number[];
  /** Zona del fotograma [x, y, ancho, alto] donde actúa `swap`. Todo el fotograma si falta. */
  area?: [number, number, number, number];
}

function rgb(hex: string): [number, number, number] {
  if (!/^#?[0-9a-fA-F]{6}$/.test(hex)) throw new Error(`Color no válido: ${hex}`);
  const n = Number.parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Aplica los retoques, en orden, a los fotogramas que indique cada uno. No modifica `src`. */
export function editSheet(src: PNG, edits: readonly SheetEdit[], cols = 3, rows = 4): PNG {
  const out = new PNG({ width: src.width, height: src.height });
  src.data.copy(out.data);
  const fw = src.width / cols;
  const fh = src.height / rows;
  const allRows = Array.from({ length: rows }, (_v, i) => i);
  const allCols = Array.from({ length: cols }, (_v, i) => i);
  for (const edit of edits) {
    const swap = new Map(Object.entries(edit.swap ?? {}).map(([from, to]) => [rgb(from).join(','), rgb(to)] as const));
    const dots = (edit.dots ?? []).map(([x, y, hex]) => [x, y, rgb(hex)] as const);
    const [ax, ay, aw, ah] = edit.area ?? [0, 0, fw, fh];
    for (const row of edit.rows ?? allRows) {
      for (const col of edit.cols ?? allCols) {
        const ox = col * fw;
        const oy = row * fh;
        for (let y = Math.max(0, ay); y < Math.min(fh, ay + ah) && swap.size > 0; y++) {
          for (let x = Math.max(0, ax); x < Math.min(fw, ax + aw); x++) {
            const i = ((oy + y) * out.width + ox + x) * 4;
            if (out.data[i + 3] !== 255) continue;
            const to = swap.get(`${out.data[i]},${out.data[i + 1]},${out.data[i + 2]}`);
            if (to) out.data.set(to, i);
          }
        }
        for (const [x, y, color] of dots) {
          if (x < 0 || y < 0 || x >= fw || y >= fh) continue;
          out.data.set([...color, 255], ((oy + y) * out.width + ox + x) * 4);
        }
      }
    }
  }
  return out;
}

/** Reduce cada fotograma a `size`×`size` (vecino más cercano) y lo apoya abajo en el centro del suyo. */
export function shrinkFrames(src: PNG, size: number, cols = 3, rows = 4): PNG {
  const fw = src.width / cols;
  const fh = src.height / rows;
  if (size >= fw && size >= fh) return src;
  const out = new PNG({ width: src.width, height: src.height });
  out.data.fill(0);
  const dx = Math.floor((fw - size) / 2);
  const dy = fh - size;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const sx = col * fw + Math.floor((x * fw) / size);
          const sy = row * fh + Math.floor((y * fh) / size);
          const si = (sy * src.width + sx) * 4;
          out.data.set(src.data.subarray(si, si + 4), ((row * fh + dy + y) * out.width + col * fw + dx + x) * 4);
        }
      }
    }
  }
  return out;
}

/** Amplía `k` veces sin suavizar (para ver el pixel art en grande). */
export function scaleUp(src: PNG, k: number): PNG {
  const out = new PNG({ width: src.width * k, height: src.height * k });
  for (let y = 0; y < out.height; y++) {
    for (let x = 0; x < out.width; x++) {
      const i = (Math.floor(y / k) * src.width + Math.floor(x / k)) * 4;
      out.data.set(src.data.subarray(i, i + 4), (y * out.width + x) * 4);
    }
  }
  return out;
}
```

- [ ] **Step 4: Ver que pasan**

Run: `npm test -- pngTools`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add game/scripts/art/pngTools.ts game/tests/unit/pngTools.test.ts
git commit -m "feat(arte): retoques de hoja de sprites (cambio de color por zona y puntos)"
```

---

### Task 2: El importador construye aspectos y hay vista previa

**Files:**
- Modify: `game/scripts/art/source.ts:29`
- Create: `game/scripts/art/looks.ts`
- Create: `game/scripts/art/preview.ts`
- Modify: `game/scripts/import-art.ts:6,36-50`
- Modify: `game/package.json` (scripts)

**Interfaces:**
- Consumes: `editSheet`, `scaleUp`, `reorderRows`, `recolorPanther`, `SheetEdit` (Task 1 y existentes); `readSource`, `privateRepo`, `config`.
- Produces:
  - `type LookSource = Source & { recolor?: 'panther'; edits?: SheetEdit[]; shrink?: number; override?: string; overrideRows?: number[] }` en `source.ts`; `ArtConfig.animals: Record<string, LookSource>`.
  - `buildLook(id: string, look: LookSource): { png: PNG; fromOverride: boolean }` en `looks.ts`.
  - Comando `npm run art:preview -- <aspecto> [escala]`.

- [ ] **Step 1: Tipo del aspecto**

En `game/scripts/art/source.ts`, añadir el import y el tipo, y usarlo en `ArtConfig`:

```ts
import type { Animate, Compose, SheetEdit } from './pngTools.ts';
```

```ts
/** Un aspecto de animal: hoja del pack, retoques encima y, si existe, el dibujo de los niños. */
export type LookSource = Source & {
  recolor?: 'panther';
  edits?: SheetEdit[];
  /** Lado (px) al que se reduce cada fotograma: un animal más pequeño que los de su especie. */
  shrink?: number;
  /** Archivo en `art-work/terminados/` que sustituye a todo lo demás. */
  override?: string;
  overrideRows?: number[];
};
```

```ts
  /** Por aspecto: el de la especie (`cabra`) y los de cada animal distinto (`cabra-gordi`). */
  animals: Record<string, LookSource>;
```

- [ ] **Step 2: `looks.ts`**

`game/scripts/art/looks.ts`:

```ts
// Construye la hoja de sprites de un aspecto de animal.
import { PNG } from 'pngjs';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { editSheet, recolorPanther, reorderRows, shrinkFrames } from './pngTools.ts';
import { privateRepo, readSource, type LookSource } from './source.ts';

export const finished = (file: string): string => join(privateRepo, 'art-work/terminados', file);

/**
 * Por orden: el dibujo de los niños si existe (tal cual, sin retoques); si no, la hoja del pack
 * con su recolor, sus retoques y su reducción.
 */
export function buildLook(id: string, look: LookSource): { png: PNG; fromOverride: boolean } {
  const overridePath = look.override ? finished(look.override) : null;
  if (overridePath && existsSync(overridePath)) {
    let png = PNG.sync.read(readFileSync(overridePath));
    // Hojas pintadas con otro orden de filas (p. ej. la pantera: de espaldas arriba).
    if (look.overrideRows) png = reorderRows(png, look.overrideRows);
    return { png, fromOverride: true };
  }
  let png = readSource(look);
  if (png.width % 3 !== 0 || png.height % 4 !== 0) throw new Error(`La hoja de "${id}" no es de 3×4 fotogramas`);
  if (look.recolor === 'panther') png = recolorPanther(png);
  if (look.edits && look.edits.length > 0) png = editSheet(png, look.edits);
  if (look.shrink) png = shrinkFrames(png, look.shrink);
  return { png, fromOverride: false };
}
```

- [ ] **Step 3: `import-art.ts` usa `buildLook`**

En `game/scripts/import-art.ts`:

Línea 6 pasa a (ya no se usan `reorderRows` ni `recolorPanther` aquí):

```ts
import { animatedStrip, composedStrip, characterSheet, crop, erase } from './art/pngTools.ts';
import { buildLook, finished } from './art/looks.ts';
```

Borrar la línea `const finished = …` (línea 11) y sustituir el bucle de animales (líneas 36–50) por:

```ts
const animals: Record<string, { file: string; frameWidth: number; frameHeight: number }> = {};
for (const [id, look] of Object.entries(config.animals)) {
  const { png, fromOverride } = buildLook(id, look);
  if (fromOverride) console.log(`  ${id}: usando el dibujo de los niños (${look.override})`);
  animals[id] = { file: save(png, `animal-${id}.png`), ...sheet(png) };
}
```

- [ ] **Step 4: Vista previa**

`game/scripts/art/preview.ts`:

```ts
// Vista ampliada de un aspecto de animal, para ajustar sus retoques mirándolo.
// Uso: npm run art:preview -- <aspecto> [escala]
// La imagen va al repo privado (art-work/plantillas/), nunca a este.
import { PNG } from 'pngjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildLook } from './looks.ts';
import { scaleUp } from './pngTools.ts';
import { assertPrivateRepo, config, privateRepo } from './source.ts';

assertPrivateRepo();
const [id, k = '8'] = process.argv.slice(2);
const look = id ? config.animals[id] : undefined;
if (!id || !look) {
  console.error(`Uso: npm run art:preview -- <aspecto> [escala]\nAspectos: ${Object.keys(config.animals).join(', ')}`);
  process.exit(1);
}
const outDir = join(privateRepo, 'art-work/plantillas');
mkdirSync(outDir, { recursive: true });
const out = join(outDir, `${id}_x${k}_para_ver.png`);
writeFileSync(out, PNG.sync.write(scaleUp(buildLook(id, look).png, Number(k))));
console.log(out);
```

En `game/package.json`, añadir tras `"art:grid"`:

```json
    "art:preview": "node scripts/art/preview.ts",
```

- [ ] **Step 5: Comprobar que el arte sale igual que antes**

Run: `npm run art:import`
Expected: termina con `Arte importado en …public/art`, mencionando que usa los dibujos de los niños para `pantera` y `panda`.

Run: `npm run art:preview -- cabra`
Expected: imprime la ruta `…zooesponji-private/art-work/plantillas/cabra_x8_para_ver.png`. Ábrela con la herramienta de lectura de imágenes: se ve la cabra blanca del pack, 12 fotogramas.

Run: `npm run typecheck && npm test`
Expected: en verde.

- [ ] **Step 6: Commit**

```bash
git add game/scripts game/package.json
git commit -m "feat(arte): el importador construye aspectos con retoques y hay vista previa"
```

---

### Task 3: El juego dibuja el aspecto de cada residente

Todavía todos los residentes usan el aspecto de su especie, así que no cambia nada a la vista. Deja el juego preparado para la Task 4.

**Regla de seguridad:** si al manifiesto de arte le falta la hoja de un aspecto (alguien compila sin volver a importar el arte), ese animal se dibuja con la hoja de su especie. Nunca se cae todo el arte a emojis por un aspecto que falta.

**Files:**
- Modify: `game/src/data/pens.ts`
- Modify: `game/src/art/manifest.ts`, `game/src/art/art.ts`
- Modify: `game/src/world/Actors.ts:113-139`, `game/src/world/Pens.ts:112,264`
- Modify: `game/src/scenes/FeedScene.ts`, `game/src/scenes/BookScene.ts:198-199`, `game/src/scenes/ShopScene.ts:386`, `game/src/scenes/SettingsScene.ts:112`
- Modify: `game/src/core/shopEntries.ts`
- Test: `game/tests/unit/pens.test.ts`, `manifest.test.ts`, `shopEntries.test.ts`

**Interfaces:**
- Consumes: `PENS`, `ResidentDef.look`, `findResident` (plan 1).
- Produces:
  - `allLooks(): string[]` en `data/pens.ts`: aspectos que el juego necesita (uno por especie más los de cada residente), sin repetir.
  - `ArtManifest.animals: Record<string, SheetInfo>`; `parseManifest` sigue exigiendo solo la hoja de cada especie (`ANIMAL_IDS`) y conserva las demás. `resolveLook(m: ArtManifest | null, look: string, species: AnimalId): string` en `art/manifest.ts` (pura, sin Phaser).
  - En `art/art.ts`: `animalKey(look: string): string`, `animalSheet(m: ArtManifest, look: string): SheetInfo`, `lookOr(look: string, species: AnimalId): string` (envoltorio de `resolveLook` con el arte cargado).
  - En `world/Actors.ts`: `createAnimal(scene, species: AnimalId, x, y, look: string = species)`, `animalPortrait(scene, species: AnimalId, x, y, targetHeight, look: string = species)`.
  - `ShopEntry.look: string`.

- [ ] **Step 1: Escribir los tests que fallan**

Añadir a `game/tests/unit/pens.test.ts` (y `allLooks` al import de `../../src/data/pens`):

```ts
  it('allLooks: un aspecto por especie más los de cada residente, sin repetir', () => {
    const looks = allLooks();
    expect(new Set(looks).size).toBe(looks.length);
    for (const species of ['leon', 'cabra', 'pantera', 'panda']) expect(looks).toContain(species);
    for (const penId of PEN_IDS) for (const r of PENS[penId].residents) expect(looks).toContain(r.look);
  });
```

En `game/tests/unit/manifest.test.ts`, añadir (el `valid()` de ese archivo no cambia):

```ts
  it('conserva las hojas de aspectos además de las de especie', () => {
    const m = parseManifest({ ...valid(), animals: { ...valid().animals, 'cabra-gordi': sheet(16, 16) } });
    expect(m?.animals['cabra-gordi']?.frameWidth).toBe(16);
  });

  it('sigue siendo válido sin hojas de aspectos: bastan las de especie', () => {
    expect(parseManifest(valid())).not.toBeNull();
  });

  it('rechaza una hoja de aspecto mal formada', () => {
    expect(parseManifest({ ...valid(), animals: { ...valid().animals, 'cabra-gordi': { file: 1 } } })).toBeNull();
  });
```

Y en el mismo archivo, la regla de seguridad (ampliando su import con `resolveLook`):

```ts
describe('resolveLook', () => {
  it('usa el aspecto si su hoja está en el manifiesto', () => {
    const m = parseManifest({ ...valid(), animals: { ...valid().animals, 'cabra-gordi': sheet(16, 16) } });
    expect(resolveLook(m, 'cabra-gordi', 'cabra')).toBe('cabra-gordi');
  });

  it('cae a la hoja de la especie si falta la del aspecto', () => {
    expect(resolveLook(parseManifest(valid()), 'cabra-gordi', 'cabra')).toBe('cabra');
  });

  it('sin arte devuelve la especie', () => {
    expect(resolveLook(null, 'cabra-gordi', 'cabra')).toBe('cabra');
  });
});
```

En `game/tests/unit/shopEntries.test.ts`, añadir:

```ts
  it('cada artículo dice qué aspecto dibujar: el del animal que llegaría', () => {
    const state = { ...initialState(), coins: 0, shopUnlocked: true };
    const entries = shopEntries(state);
    expect(entries.find((e) => e.id === 'pantera')?.look).toBe(PENS.pantera.residents[0]!.look);
    expect(entries.find((e) => e.id === 'extra-cabra')?.look).toBe(PENS.cabra.residents[1]!.look);
  });
```

(con `import { PENS } from '../../src/data/pens';` si no está)

- [ ] **Step 2: Ver que fallan**

Run: `npm test -- pens manifest shopEntries`
Expected: FAIL (`allLooks`, `resolveLook` y `look` no existen).

- [ ] **Step 3: Datos y manifiesto**

Añadir a `game/src/data/pens.ts` (con `import { ANIMAL_IDS, type AnimalId } from './animals';`):

```ts
/** Aspectos que el juego dibuja: el de cada especie (retratos genéricos) y el de cada residente. */
export function allLooks(): string[] {
  const looks = new Set<string>(ANIMAL_IDS);
  for (const id of PEN_IDS) for (const r of PENS[id].residents) looks.add(r.look);
  return [...looks];
}
```

En `game/src/art/manifest.ts`, cambiar el tipo:

```ts
  /** Hojas de animal por aspecto (`cabra`, `cabra-gordi`…). Las de especie están siempre. */
  animals: Record<string, SheetInfo>;
```

y sustituir el bloque de `animals` de `parseManifest` (líneas 68–74) por:

```ts
  if (!isObject(value.animals)) return null;
  const animals: Record<string, SheetInfo> = {};
  for (const [look, raw] of Object.entries(value.animals)) {
    const s = asSheet(raw);
    if (!s) return null;
    animals[look] = s;
  }
  // La hoja de cada especie es obligatoria; las de aspectos concretos, no (ver `resolveLook`).
  if (ANIMAL_IDS.some((id) => !animals[id])) return null;
```

y añadir al final del archivo:

```ts
/** El aspecto si su hoja está en el manifiesto; si no, el de su especie (arte importado antes de añadirlo). */
export function resolveLook(m: ArtManifest | null, look: string, species: AnimalId): string {
  return m?.animals[look] ? look : species;
}
```

En `game/src/art/art.ts` (añadir `resolveLook` al import de `./manifest`):

```ts
export const animalKey = (look: string): string => `art-animal-${look}`;
```

```ts
export function animalSheet(m: ArtManifest, look: string): SheetInfo {
  const sheet = m.animals[look];
  if (!sheet) throw new Error(`Falta la hoja del aspecto "${look}"`);
  return sheet;
}

/** El aspecto si su hoja está cargada; si no, el de su especie. */
export function lookOr(look: string, species: AnimalId): string {
  return resolveLook(getArt(), look, species);
}
```

En `queueArt`, la línea de los animales pasa a:

```ts
  for (const [look, s] of Object.entries(m.animals)) sheet(animalKey(look), s);
```

En `registerArtAnims`, sustituir el bucle de `ANIMAL_IDS` por:

```ts
  for (const look of Object.keys(m.animals)) createWalkAnims(scene, animalKey(look));
  for (const id of ANIMAL_IDS) if (m.companions[id]) createWalkAnims(scene, companionKey(id));
```

- [ ] **Step 4: Dibujar el aspecto en cada sitio**

`game/src/world/Actors.ts` (añadir `animalSheet` y `lookOr` al import de `../art/art`):

```ts
/** `look`: hoja de sprites de ese animal en concreto (por defecto, la de su especie). */
export function createAnimal(scene: Phaser.Scene, species: AnimalId, x: number, y: number, look: string = species): Walker {
  if (getArt()) {
    const key = animalKey(lookOr(look, species));
    const sprite = scene.add.sprite(x, y, key).setOrigin(0.5, 0.75).setDepth(5);
    return new SpriteWalker(sprite, key);
  }
  return new PlainWalker(
    scene.add.text(x, y, ANIMALS[species].emoji, { fontSize: '22px' }).setOrigin(0.5).setResolution(4).setDepth(5),
  );
}

/** Retrato grande del animal (pose quieta de perfil, la más reconocible) con escala entera para que el pixel art se vea nítido. */
export function animalPortrait(
  scene: Phaser.Scene,
  species: AnimalId,
  x: number,
  y: number,
  targetHeight: number,
  look: string = species,
): Phaser.GameObjects.Sprite | Phaser.GameObjects.Text {
  const art = getArt();
  if (art) {
    const use = lookOr(look, species);
    const scale = Math.max(1, Math.floor(targetHeight / animalSheet(art, use).frameHeight));
    return scene.add.sprite(x, y, animalKey(use), idleFrame('right')).setScale(scale);
  }
  return scene.add.text(x, y, ANIMALS[species].emoji, { fontSize: `${Math.round(targetHeight)}px` }).setOrigin(0.5);
}
```

`game/src/world/Pens.ts`, las dos llamadas a `createAnimal`:

```ts
        return wanderer(createAnimal(scene, resident.species, p.x, p.y, resident.look), resident.id);
```

```ts
    const w = wanderer(createAnimal(this.scene, resident.species, entry.x, entry.y, resident.look), resident.id, 800);
```

`game/src/scenes/FeedScene.ts`: campo `private look = 'leon';`, en `init` tras fijar la especie `this.look = found.resident.look;`, y el retrato:

```ts
    this.animal = animalPortrait(this, this.animalId, width / 2, height * 0.36, height * 0.3, this.look);
```

`game/src/scenes/BookScene.ts` (añadir `import { findResident } from '../data/pens';` y `lookOr` al import de `../art/art`), la rama del animal:

```ts
    if (art && pic.kind === 'animal') {
      // Cada página enseña a su animal, no a uno cualquiera de la especie.
      const look = lookOr(findResident(page.id)?.resident.look ?? pic.animalId, pic.animalId);
      obj = this.add.sprite(x, y, animalKey(look), idleFrame('right'));
```

`game/src/core/shopEntries.ts`: añadir a `ShopEntry`

```ts
  /** Hoja de sprites que se dibuja en la peana: la del animal que llegaría. */
  look: string;
```

y en los dos `entries.push`: `look: residents[0]!.look` en el de recinto y `look: coming.look` en el extra.

`game/src/scenes/ShopScene.ts` línea 386:

```ts
    const animal = animalPortrait(this, entry.species, pos.x, pos.y, 28 * s, entry.look).setOrigin(0.5, 1).setDepth(base.y);
```

`game/src/scenes/SettingsScene.ts` línea 112 (añadir `animalSheet` al import de `../art/art`):

```ts
      const frameHeight = animalSheet(art, id).frameHeight;
```

- [ ] **Step 5: Ver que todo pasa**

Run: `npm run typecheck && npm test && npm run test:e2e`
Expected: en verde. Si `typecheck` señala otro `art.animals[...]` sin comprobar, cámbialo por `animalSheet(art, …)`.

- [ ] **Step 6: Commit**

```bash
git add game/src game/tests
git commit -m "refactor: el arte de los animales va por aspecto y cada residente dibuja el suyo"
```

---

### Task 4: Cinco cabras distintas

Colores de la cabra del pack (`$goat.png`, 48×64, fotogramas de 16×16): pelo `f4f3f2`, pelo claro en sombra `e6e3e0`, sombra media `c5beba`, sombra `aba19c`, contorno `414040`.

| Residente | Aspecto | Cómo es | Por qué |
|---|---|---|---|
| Gordi | `cabra-gordi` | Tostada | Es la primera y la más comilona |
| Nube | `cabra` | Blanca (la del pack) | "Nube es blanca y blandita" |
| Galleta | `cabra-galleta` | Marrón galleta con calcetines blancos | Su nombre |
| Tolón | `cabra-tolon` | Gris con campanita dorada | "Tolón lleva una campanita" |
| Chispa | `cabra-chispa` | Oscura y más pequeña (13 px en vez de 16) | "Chispa es la más pequeña" |

**Files:**
- Modify: `game/art/art.config.json` (sección `animals`)
- Modify: `game/src/data/pens.ts`
- Create: `game/tests/unit/artConfig.test.ts`
- Test: `game/tests/unit/pens.test.ts`

**Interfaces:**
- Consumes: `LookSource.edits` (Task 2), `allLooks()` (Task 3).
- Produces: aspectos `cabra-gordi`, `cabra-galleta`, `cabra-tolon`, `cabra-chispa` en la configuración y en `PENS.cabra.residents`.

- [ ] **Step 1: Escribir los tests que fallan**

`game/tests/unit/artConfig.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { allLooks } from '../../src/data/pens';

interface Look {
  zip: string;
  file: string;
  edits?: { swap?: Record<string, string>; dots?: [number, number, string][]; rows?: number[]; area?: number[] }[];
}
const config = JSON.parse(readFileSync(new URL('../../art/art.config.json', import.meta.url), 'utf8')) as {
  zips: Record<string, string>;
  animals: Record<string, Look>;
};
const HEX = /^[0-9a-f]{6}$/;

describe('configuración de arte: aspectos', () => {
  it.each(allLooks())('el aspecto %s está en art.config.json y su zip existe', (look) => {
    const entry = config.animals[look];
    expect(entry).toBeDefined();
    expect(config.zips[entry!.zip]).toBeTruthy();
  });

  it('los retoques usan colores bien escritos, filas 0–3 y zonas de 4 números', () => {
    for (const [look, entry] of Object.entries(config.animals)) {
      for (const edit of entry.edits ?? []) {
        for (const [from, to] of Object.entries(edit.swap ?? {})) {
          expect(HEX.test(from), `${look}: ${from}`).toBe(true);
          expect(HEX.test(to), `${look}: ${to}`).toBe(true);
        }
        for (const [, , color] of edit.dots ?? []) expect(HEX.test(color), `${look}: ${color}`).toBe(true);
        for (const row of edit.rows ?? []) expect([0, 1, 2, 3]).toContain(row);
        if (edit.area) expect(edit.area).toHaveLength(4);
      }
    }
  });
});
```

Añadir a `game/tests/unit/pens.test.ts`:

```ts
  it('las cinco cabras tienen cada una su aspecto', () => {
    const looks = PENS.cabra.residents.map((r) => r.look);
    expect(looks).toEqual(['cabra-gordi', 'cabra', 'cabra-galleta', 'cabra-tolon', 'cabra-chispa']);
  });
```

- [ ] **Step 2: Ver que fallan**

Run: `npm test -- artConfig pens`
Expected: FAIL (las cabras comparten aspecto; faltan entradas en la configuración).

- [ ] **Step 3: Aspectos en los datos**

En `game/src/data/pens.ts`, sustituir los residentes de `cabra`:

```ts
  cabra: {
    id: 'cabra',
    nameKey: 'animal.cabra',
    residents: [
      { id: 'gordi', species: 'cabra', look: 'cabra-gordi' },
      { id: 'nube', species: 'cabra', look: 'cabra' },
      { id: 'galleta', species: 'cabra', look: 'cabra-galleta' },
      { id: 'tolon', species: 'cabra', look: 'cabra-tolon' },
      { id: 'chispa', species: 'cabra', look: 'cabra-chispa' },
    ],
  },
```

- [ ] **Step 4: Aspectos en la configuración de arte**

En `game/art/art.config.json`, dentro de `"animals"`, añadir tras la entrada `"cabra"`:

```json
    "cabra-gordi": {
      "zip": "farm",
      "file": "16x16/Default Format/$goat.png",
      "override": "cabra-gordi.png",
      "edits": [
        { "swap": { "f4f3f2": "e8c9a0", "e6e3e0": "d9b88c", "c5beba": "c09a6e", "aba19c": "a07a52" } }
      ]
    },
    "cabra-galleta": {
      "zip": "farm",
      "file": "16x16/Default Format/$goat.png",
      "override": "cabra-galleta.png",
      "edits": [
        { "swap": { "f4f3f2": "b8824e", "e6e3e0": "a87444", "c5beba": "8f5f36", "aba19c": "7a4e2c" }, "area": [0, 0, 16, 12] }
      ]
    },
    "cabra-tolon": {
      "zip": "farm",
      "file": "16x16/Default Format/$goat.png",
      "override": "cabra-tolon.png",
      "edits": [
        { "swap": { "f4f3f2": "c9ccd4", "e6e3e0": "b9bcc6", "c5beba": "9ea2ae", "aba19c": "858a98" } },
        { "dots": [[7, 12, "f2c230"], [8, 12, "f2c230"]], "rows": [0] },
        { "dots": [[4, 10, "f2c230"]], "rows": [1] },
        { "dots": [[11, 10, "f2c230"]], "rows": [2] }
      ]
    },
    "cabra-chispa": {
      "zip": "farm",
      "file": "16x16/Default Format/$goat.png",
      "override": "cabra-chispa.png",
      "shrink": 13,
      "edits": [
        { "swap": { "f4f3f2": "6b625c", "e6e3e0": "5f5751", "c5beba": "524a45", "aba19c": "453e3a", "414040": "2a2625" } }
      ]
    },
```

- [ ] **Step 5: Ver que pasan los tests**

Run: `npm test -- artConfig pens`
Expected: PASS.

- [ ] **Step 6: Mirar cada cabra y ajustar**

Para cada uno de los cuatro aspectos:

Run: `npm run art:preview -- cabra-gordi` (y `cabra-galleta`, `cabra-tolon`, `cabra-chispa`)

Abre cada imagen con la herramienta de lectura de imágenes y comprueba:

1. **Gordi:** tostada entera, con el contorno oscuro intacto.
2. **Galleta:** marrón, con las patas blancas (los 4 píxeles de abajo de cada fotograma). Si el blanco sube hasta la barriga, baja el alto de la zona de `12` a `13`; si no se ven calcetines, súbelo a `11`.
3. **Tolón:** gris, con la campanita dorada **en el cuello** en las filas de frente, izquierda y derecha, y sin campanita de espaldas. Las coordenadas de los puntos son un punto de partida: muévelas píxel a píxel (`[x, y]` dentro del fotograma de 16×16) hasta que la campanita quede justo bajo la barbilla en cada fila. Si en el fotograma central del paso la cabra sube o baja un píxel y la campanita se queda flotando, parte el retoque en dos con `cols` (`"cols": [0, 2]` y `"cols": [1]`) y dale a cada uno su altura.
4. **Chispa:** oscura, claramente más pequeña que las otras, con los pies en la misma línea de suelo, y se le distinguen los ojos, los cuernos y el contorno. Si se empasta, aclara `6b625c` a `7a706a`. Si al reducirla pierde un ojo o un cuerno, prueba `"shrink": 14` y, si sigue mal, `12`; quédate con el que mejor se lea. Si ninguno convence, dibújala a mano sobre la vista previa y guárdala como `art-work/terminados/cabra-chispa.png` (hoja de 48×64).

Repite `npm run art:preview` tras cada cambio hasta que las cuatro estén bien. Los archivos de vista previa quedan en el repo privado; no los copies a este.

- [ ] **Step 7: Importar y verlo en el juego**

Run: `npm run art:import`
Expected: termina bien y `public/art/manifest.json` tiene `animals.cabra-gordi`, `cabra-galleta`, `cabra-tolon` y `cabra-chispa`.

Run: `npm run typecheck && npm test && npm run test:e2e`
Expected: en verde.

Arranca el juego con la herramienta de preview (configuración `dev` de `.claude/launch.json`). En la consola: `await window.__ZOO__.addCoins(100)`, entra en la tienda y compra las cuatro cabras que faltan. Comprueba:

1. En el recinto hay cinco cabras que se distinguen de un vistazo, y Chispa es la pequeña.
2. Al dar de comer a cada una, el retrato es el suyo y el título su nombre.
3. En la tienda, "Otra cabra" enseña la que va a llegar.
4. En el libro, cada página de cabra enseña a esa cabra.

Haz una captura del recinto con las cinco y otra de la página de Tolón en el libro, para David.

- [ ] **Step 8: Commit**

```bash
git add game/art/art.config.json game/src/data/pens.ts game/tests/unit/artConfig.test.ts game/tests/unit/pens.test.ts
git commit -m "feat: cinco cabras distintas (Gordi tostada, Galleta con calcetines, Tolón con campanita, Chispa pequeña)"
```

En el repo privado, confirma las vistas previas:

```bash
git -C ../../zooesponji-private add art-work/plantillas
git -C ../../zooesponji-private commit -m "Vistas previas de las cabras distintas"
```

---

### Task 5: Siete comidas nuevas, una gallina amiga y un calcetín

Iconos en `vectoraith_16x16_iconset_farming.png` (256×320, rejilla de 16 px), comprobados sobre la hoja:

| Comida | id | Emoji de reserva | x | y |
|---|---|---|---|---|
| Lechuga | `lechuga` | 🥬 | 224 | 240 |
| Maíz | `maiz` | 🌽 | 112 | 240 |
| Plátano | `platano` | 🍌 | 176 | 256 |
| Manzana | `manzana` | 🍎 | 208 | 256 |
| Pan | `pan` | 🍞 | 176 | 272 |
| Huevo | `huevo` | 🥚 | 16 | 288 |
| Pescado | `pescado` | 🐟 | 32 | 304 |
| Gallina (amiga, no se come) | `gallina` | 🐔 | hoja `$chicken_hen.png` del pack de granja: 16 | 32 |
| Calcetín (cosa rara) | `calcetin` | 🧦 | dibujo propio | — |

El calcetín no está en los packs: lo dibuja Claude (16×16) y va al repo privado, como la carne.

En este plan solo la cabra estrena comida (lechuga). Las demás quedan listas para las especies del plan 3, cuyas bandejas ya están decididas en el spec.

**Amigos:** el conejo y la gallina no se comen. Cuando son la reacción especial de un animal (cabra y panda con el conejo; oveja con la gallina, en el plan 3), aparecen a su lado, saltan juntos, se dan un achuchón y salen corazones. Hoy esa animación dibuja siempre un conejo, sea cual sea la comida: en esta tarea pasa a dibujar al amigo que se ha dado. Una reacción especial con una comida que no es un amigo (el plátano de la jirafa, la piedra del pingüino) se celebra con saltos y corazones, sin nadie al lado.

**Regla de las bandejas** (la pidió David): en cada bandeja hay al menos una comida de verdad que ese animal rechaza y que otro animal sí come, para que el niño aprenda que no todo vale para todos. Las cosas raras (piedra, calcetín) dan casi siempre error; la gracia es que a algún animal sí le gustan (la cabra come piedras).

**Files:**
- Modify: `game/src/data/foods.ts`, `game/src/data/strings.ts`, `game/src/data/animals.ts`
- Modify: `game/art/art.config.json` (sección `foods`)
- Modify: `game/src/scenes/FeedScene.ts` (`feed`, `playReaction`, `friendship`)
- Create: `game/scripts/make-calcetin.ts`; Modify: `game/package.json`
- Test: `game/tests/unit/content.test.ts`, `reactions.test.ts`, `artConfig.test.ts`; `game/tests/e2e/play.spec.ts`

**Interfaces:**
- Produces: `FOOD_IDS = ['piedra', 'carne', 'conejo', 'gallina', 'zanahoria', 'lechuga', 'maiz', 'manzana', 'platano', 'pan', 'huevo', 'pescado', 'calcetin']`; `FoodDef.friend?: boolean` (verdadero en `conejo` y `gallina`); `ANIMALS.cabra.reactions.lechuga = 'come'`.

- [ ] **Step 1: Escribir los tests que fallan**

En `game/tests/unit/content.test.ts`, añadir dentro de `describe('contenido: comidas', …)`:

```ts
  it('están las 4 de siempre, la gallina, las 7 nuevas y el calcetín, en el orden de la bandeja', () => {
    expect([...FOOD_IDS]).toEqual([
      'piedra', 'carne', 'conejo', 'gallina', 'zanahoria', 'lechuga', 'maiz', 'manzana', 'platano', 'pan', 'huevo', 'pescado', 'calcetin',
    ]);
  });

  it('los amigos son el conejo y la gallina', () => {
    expect(FOOD_IDS.filter((id) => FOODS[id].friend)).toEqual(['conejo', 'gallina']);
  });
```

(El test `'%s tiene nombre y emoji'` que ya hay en ese bloque cubre las nuevas al recorrer `FOOD_IDS`.)

Y dentro de `describe('contenido: animales', …)`, la regla de las bandejas:

```ts
  it.each(ANIMAL_IDS)('%s rechaza al menos una comida que otro animal sí come', (id) => {
    const eatenByOthers = (food: FoodId) =>
      ANIMAL_IDS.some((other) => other !== id && ['come', 'especial'].includes(ANIMALS[other].reactions[food] ?? ''));
    const wrong = trayFoods(id).filter((food) => ANIMALS[id].reactions[food] === 'rechaza' && eatenByOthers(food));
    expect(wrong.length).toBeGreaterThanOrEqual(1);
  });
```

(añadir `type FoodId` al import de `../../src/data/foods`). Este test ya pasa con los 4 animales de hoy: está para que los del plan 3 no se salten la regla.

En `game/tests/unit/reactions.test.ts`, añadir a la tabla de `resolveFeeding` la fila `['cabra', 'lechuga', 'come', 1],` y cambiar el test de la bandeja:

```ts
  it('la bandeja sigue el orden de FOOD_IDS y solo trae lo que la especie lista', () => {
    expect(trayFoods('leon')).toEqual(['piedra', 'carne', 'conejo', 'zanahoria']);
    expect(trayFoods('cabra')).toEqual(['piedra', 'carne', 'conejo', 'zanahoria', 'lechuga']);
  });
```

En `game/tests/unit/artConfig.test.ts`, añadir (ampliando el tipo de `config` con `foods: Record<string, unknown>` y con `import { FOOD_IDS } from '../../src/data/foods';`):

```ts
describe('configuración de arte: comidas', () => {
  it.each(FOOD_IDS)('la comida %s tiene icono en art.config.json', (id) => {
    expect(config.foods[id]).toBeDefined();
  });
});
```

En `game/tests/e2e/play.spec.ts`, añadir:

```ts
test('la cabra tiene lechuga en su bandeja y se la come', async ({ page }) => {
  await startGame(page);
  await page.evaluate(() => window.__ZOO__!.openFeed('gordi'));
  await page.waitForFunction(() => window.__ZOO__?.activeScenes().includes('Feed'));
  const targets = await page.evaluate(() => window.__ZOO__!.feedTargets());
  expect(Object.keys(targets!.foods)).toHaveLength(5);
  await dragFood(page, 'lechuga');
  await expect.poll(() => page.evaluate(() => window.__ZOO__!.hudCoinsText())).toBe('🪙 1');
});
```

- [ ] **Step 2: Ver que fallan**

Run: `npm test -- content reactions artConfig`
Expected: FAIL (faltan las comidas).

- [ ] **Step 3: Datos y textos**

`game/src/data/foods.ts` completo:

```ts
import type { StringKey } from './strings';

/** En el orden en que salen en la bandeja. */
export const FOOD_IDS = [
  'piedra',
  'carne',
  'conejo',
  'gallina',
  'zanahoria',
  'lechuga',
  'maiz',
  'manzana',
  'platano',
  'pan',
  'huevo',
  'pescado',
  'calcetin',
] as const;
export type FoodId = (typeof FOOD_IDS)[number];

export interface FoodDef {
  id: FoodId;
  nameKey: StringKey;
  emoji: string;
  /** No se come: si es la reacción especial de un animal, se hace su amigo. */
  friend?: boolean;
}

export const FOODS: Record<FoodId, FoodDef> = {
  piedra: { id: 'piedra', nameKey: 'food.piedra', emoji: '🪨' },
  carne: { id: 'carne', nameKey: 'food.carne', emoji: '🥩' },
  conejo: { id: 'conejo', nameKey: 'food.conejo', emoji: '🐇', friend: true },
  gallina: { id: 'gallina', nameKey: 'food.gallina', emoji: '🐔', friend: true },
  zanahoria: { id: 'zanahoria', nameKey: 'food.zanahoria', emoji: '🥕' },
  lechuga: { id: 'lechuga', nameKey: 'food.lechuga', emoji: '🥬' },
  maiz: { id: 'maiz', nameKey: 'food.maiz', emoji: '🌽' },
  manzana: { id: 'manzana', nameKey: 'food.manzana', emoji: '🍎' },
  platano: { id: 'platano', nameKey: 'food.platano', emoji: '🍌' },
  pan: { id: 'pan', nameKey: 'food.pan', emoji: '🍞' },
  huevo: { id: 'huevo', nameKey: 'food.huevo', emoji: '🥚' },
  pescado: { id: 'pescado', nameKey: 'food.pescado', emoji: '🐟' },
  /** Cosa rara: no es comida. */
  calcetin: { id: 'calcetin', nameKey: 'food.calcetin', emoji: '🧦' },
};
```

En `game/src/data/strings.ts`, tras `'food.zanahoria'`:

```ts
  'food.lechuga': 'Lechuga',
  'food.maiz': 'Maíz',
  'food.manzana': 'Manzana',
  'food.platano': 'Plátano',
  'food.pan': 'Pan',
  'food.huevo': 'Huevo',
  'food.pescado': 'Pescado',
  'food.calcetin': 'Calcetín',
  'food.gallina': 'Gallina',
```

En `game/src/data/animals.ts`, las reacciones de la cabra:

```ts
    reactions: { carne: 'rechaza', conejo: 'especial', piedra: 'come', zanahoria: 'come', lechuga: 'come' },
```

- [ ] **Step 4: Iconos**

En `game/art/art.config.json`, dentro de `"foods"`, añadir tras `"piedra"`:

```json
    "lechuga": { "zip": "icons", "file": "vectoraith_16x16_iconset_farming.png", "x": 224, "y": 240, "w": 16, "h": 16 },
    "maiz": { "zip": "icons", "file": "vectoraith_16x16_iconset_farming.png", "x": 112, "y": 240, "w": 16, "h": 16 },
    "platano": { "zip": "icons", "file": "vectoraith_16x16_iconset_farming.png", "x": 176, "y": 256, "w": 16, "h": 16 },
    "manzana": { "zip": "icons", "file": "vectoraith_16x16_iconset_farming.png", "x": 208, "y": 256, "w": 16, "h": 16 },
    "pan": { "zip": "icons", "file": "vectoraith_16x16_iconset_farming.png", "x": 176, "y": 272, "w": 16, "h": 16 },
    "huevo": { "zip": "icons", "file": "vectoraith_16x16_iconset_farming.png", "x": 16, "y": 288, "w": 16, "h": 16 },
    "pescado": { "zip": "icons", "file": "vectoraith_16x16_iconset_farming.png", "x": 32, "y": 304, "w": 16, "h": 16 },
    "calcetin": { "override": "calcetin.png" },
    "gallina": { "zip": "farm", "file": "16x16/Default Format/$chicken_hen.png", "x": 16, "y": 32, "w": 16, "h": 16 },
```

(La gallina se recorta igual que el conejo: fotograma central de la fila que mira a la derecha.)

Dibujar el calcetín. `game/scripts/make-calcetin.ts`:

```ts
// Dibuja el icono del calcetín (16×16) en el repo privado, si los niños no han hecho ya el suyo.
// Uso: npm run make:calcetin
import { PNG } from 'pngjs';
import { existsSync, writeFileSync } from 'node:fs';
import { finished } from './art/looks.ts';
import { assertPrivateRepo } from './art/source.ts';

assertPrivateRepo();
const ROWS = [
  '................',
  '.....oooooo.....',
  '....owwwwwwo....',
  '....owwwwwwo....',
  '....orrrrrro....',
  '....orrrrrro....',
  '....orrrrrro....',
  '....orrrrrro....',
  '....orrrrrroo...',
  '....orrrrrrrro..',
  '...oorrrrrrrrro.',
  '..orrrrrrrrrrro.',
  '..orrrrrrrrrddo.',
  '..oddrrrrrdddo..',
  '...oooooooooo...',
  '................',
];
const COLORS: Record<string, [number, number, number, number]> = {
  '.': [0, 0, 0, 0],
  o: [58, 46, 46, 255],
  w: [244, 243, 242, 255],
  r: [217, 83, 79, 255],
  d: [176, 58, 55, 255],
};
const out = finished('calcetin.png');
if (existsSync(out)) {
  console.log(`Ya existe ${out}: no se toca.`);
} else {
  const png = new PNG({ width: 16, height: 16 });
  ROWS.forEach((row, y) => [...row].forEach((c, x) => png.data.set(COLORS[c]!, (y * 16 + x) * 4)));
  writeFileSync(out, PNG.sync.write(png));
  console.log(out);
}
```

En `game/package.json`, añadir tras `"make:paso"`:

```json
    "make:calcetin": "node scripts/make-calcetin.ts",
```

Run: `npm run make:calcetin`
Expected: imprime la ruta de `calcetin.png` en `art-work/terminados/` del repo privado.

- [ ] **Step 5: La animación de amigos usa al amigo que se ha dado**

En `game/src/scenes/FeedScene.ts`:

En `feed`, pasar la comida a la reacción:

```ts
    this.playReaction(result, id);
```

En `playReaction`, la firma y la rama de la reacción especial:

```ts
  private playReaction(result: FeedResult, foodId: FoodId): void {
```

```ts
    } else {
      sfx.play('especial');
      this.say(`${t('feed.wow')} 🤩`);
      if (FOODS[foodId].friend) this.friendship(foodId);
      else this.delight();
    }
```

Sustituir `friendship` (cambia el comentario, la firma y las tres líneas que nombraban al conejo; el resto queda igual) y añadir `delight` debajo:

```ts
  /**
   * Reacción especial con un amigo (como en la v1): el conejo o la gallina no se comen, se hacen
   * amigos. Aparece al lado, saltan juntos, se dan un achuchón y salen corazones.
   */
  private friendship(friendId: FoodId): void {
    const animal = this.animal;
    const size = animal.displayHeight * 0.55;
    const icon = getArt()?.foods[friendId];
    const bunny: Food = icon
      ? this.add.image(0, 0, foodKey(friendId)).setScale(Math.max(1, Math.floor(size / icon.height)))
      : this.add.text(0, 0, FOODS[friendId].emoji, { fontSize: `${Math.round(size)}px` }).setOrigin(0.5);
```

```ts
  /** Reacción especial con una comida que le encanta: salta de alegría y salen corazones. */
  private delight(): void {
    const animal = this.animal;
    this.tweens.add({ targets: animal, y: animal.y - 24, duration: 160, yoyo: true, repeat: 2, ease: 'Quad.easeOut' });
    this.hearts(animal.x, animal.y - animal.displayHeight * 0.2);
  }
```

Hoy todas las reacciones especiales son con el conejo, así que el juego se ve igual; `delight` se estrena en el plan 3.

- [ ] **Step 6: Ver que todo pasa**

Run: `npm run art:import && npm run typecheck && npm test && npm run test:e2e`
Expected: en verde; `public/art/` tiene `food-lechuga.png`, `food-maiz.png`, `food-platano.png`, `food-manzana.png`, `food-pan.png`, `food-huevo.png`, `food-pescado.png`, `food-calcetin.png` y `food-gallina.png`.

- [ ] **Step 7: Comprobar los iconos, la bandeja de 5 y la amistad**

Abre con la herramienta de lectura de imágenes los 9 `public/art/food-*.png` nuevos: cada uno enseña la comida de su nombre, entera y sin trozos de la vecina. El calcetín tiene que leerse como calcetín al tamaño de la bandeja; si no, retoca las filas de `make-calcetin.ts`, borra el PNG del repo privado y vuelve a generarlo.

Con el juego abierto, da de comer a una cabra: la bandeja tiene 5 comidas, caben sin pisarse en horizontal y en un móvil estrecho (usa el tamaño `mobile` de la herramienta de preview, en apaisado). Haz una captura de la bandeja de la cabra. Dale el conejo: sigue apareciendo el conejo a su lado, con saltos y corazones, igual que antes.

- [ ] **Step 8: Commit**

```bash
git add game/src game/art/art.config.json game/tests game/scripts/make-calcetin.ts game/package.json
git commit -m "feat: siete comidas nuevas, gallina amiga y calcetín, con icono; la cabra come lechuga"
git -C ../../zooesponji-private add art-work/terminados/calcetin.png
git -C ../../zooesponji-private commit -m "Icono del calcetín"
```

---

### Task 6: Documentación

**Files:**
- Modify: `docs/superpowers/specs/2026-10-05-zoo-grande-design.md`
- Modify: `game/README.md`
- Modify: `../zooesponji-private/art-work/GUIA-PINTAR-CON-PISKEL.md` (repo privado)

**Interfaces:** ninguna.

- [ ] **Step 1: Estado en el spec**

En `docs/superpowers/specs/2026-10-05-zoo-grande-design.md`, en la tabla de "Estado de implementación", la fila del plan 2 pasa a:

```markdown
| 2. Arte y comidas | ✅ Hecho | `docs/superpowers/plans/2026-10-05-zoo-grande-2-arte-y-comidas.md` |
```

y añadir bajo las decisiones del plan 1:

```markdown
### Decisiones tomadas durante la implementación (plan 2)

- Las "marcas" no son una capa pintada a mano sino **retoques declarados** en `art.config.json`:
  cambio de colores exactos dentro de una zona del fotograma (calcetines, lomo) y puntos sueltos
  (la campanita). Se ajustan mirando `npm run art:preview -- <aspecto>`.
- El dibujo de los niños sigue mandando: `art-work/terminados/<aspecto>.png` sustituye a la hoja
  del pack y a sus retoques.
- El manifiesto de arte va por aspecto (`cabra`, `cabra-gordi`…). Si falta la hoja de un aspecto,
  ese animal se dibuja con la de su especie; para verlo distinto hay que volver a ejecutar
  `npm run art:import`.
- Cabras: Gordi tostada, Nube blanca (la del pack), Galleta marrón con calcetines, Tolón gris con
  campanita, Chispa oscura y más pequeña.
- De las comidas nuevas, en este plan solo se usa la lechuga (cabra). El resto, y el calcetín,
  entran con las especies del plan 3.
- Chispa se reduce a 13 px con `shrink` en su aspecto.
- La animación de amistad dibuja al amigo que se ha dado (conejo o gallina, `FoodDef.friend`); una
  reacción especial con otra comida se celebra con saltos y corazones.
- Regla de las bandejas, con test: cada animal rechaza al menos una comida que otro sí come.
```

- [ ] **Step 2: README del juego**

En `game/README.md`, en la sección que explica el arte (busca `art:import`), añadir:

```markdown
### Animales distintos dentro de un recinto

Cada animal puede tener su propio **aspecto**: una entrada en `animals` de `art/art.config.json`
con la hoja del pack y una lista de `edits` (retoques):

- `swap`: cambia colores exactos (`"f4f3f2": "e8c9a0"`), opcionalmente solo en una `area`
  `[x, y, ancho, alto]` del fotograma.
- `dots`: pinta píxeles sueltos `[x, y, color]`.
- `rows`: a qué filas se aplica (0 de frente, 1 izquierda, 2 derecha, 3 de espaldas).

`npm run art:preview -- <aspecto>` deja una vista ×8 en el repo privado para ajustarlos. El
aspecto se asigna al animal en `src/data/pens.ts` (`look`). Tras cambiar la configuración hay que
ejecutar `npm run art:import`.
```

- [ ] **Step 3: Guía de los niños (repo privado)**

Añadir al final de `../zooesponji-private/art-work/GUIA-PINTAR-CON-PISKEL.md`:

```markdown
## Pintar una cabra a vuestro gusto

Cada cabra tiene su dibujo. Si queréis cambiar una, abrid su plantilla en `plantillas/`
(`cabra-gordi_x8_para_ver.png` es solo para mirar; se pinta sobre la hoja de 48×64) y guardad el
resultado en `terminados/` con el nombre de la cabra: `cabra-gordi.png`, `cabra-galleta.png`,
`cabra-tolon.png` o `cabra-chispa.png`. La próxima vez que papá importe el arte, saldrá la vuestra.
```

- [ ] **Step 4: Commit**

```bash
git add docs game/README.md
git commit -m "docs: aspectos de animales y comidas nuevas (plan 2 del zoo grande)"
git -C ../zooesponji-private add art-work/GUIA-PINTAR-CON-PISKEL.md
git -C ../zooesponji-private commit -m "Guía: cómo pintar una cabra distinta"
```

(Este último paso se ejecuta desde la raíz del repo `zooesponji`, no desde `game/`.)

---

## Self-Review

- **Cobertura del spec (plan 2):** orden de búsqueda del aspecto (dibujo de los niños, hoja del pack, recolor) → Task 2; recolor genérico por tabla de colores → Task 1; "marcas" → Task 1 (retoques por zona y puntos) y Task 4; cabras distintas con sus nombres → Task 4; 7 comidas con icono del pack, la gallina amiga, el calcetín y la regla de las bandejas → Task 5; Chispa más pequeña → Tasks 1, 2 y 4; cabra con lechuga → Task 5; ningún arte en el repo público → vistas previas al repo privado (Tasks 2 y 4). Las variantes de oveja, pingüino, pato, gacela, jirafa, cebra y elefante se hacen en el plan 3, con el mismo mecanismo, cuando existan sus recintos.
- **Diferencia con el spec:** el spec hablaba de una capa de marcas pintada fotograma a fotograma. Se sustituye por retoques declarados, que se pueden probar y ajustar sin dibujar a mano; el dibujo a mano sigue disponible como `override`.
- **Tipos:** `SheetEdit`, `LookSource`, `buildLook`, `allLooks`, `animalKey(look)`, `animalSheet`, `resolveLook`, `lookOr`, `ShopEntry.look` y los parámetros `look` de `createAnimal` y `animalPortrait` se usan con el mismo nombre en todas las tareas.
- **Compilar sin reimportar el arte:** no rompe nada; las cabras salen todas blancas hasta que se ejecute `npm run art:import` (Task 3, `lookOr`). Antes de publicar la web o el APK hay que importarlo.
- **Riesgo conocido:** las coordenadas de la campanita de Tolón y el alto de los calcetines de Galleta son puntos de partida que hay que ajustar mirando la vista previa (Task 4, paso 6). Las coordenadas de los 7 iconos sí están comprobadas sobre la hoja.
