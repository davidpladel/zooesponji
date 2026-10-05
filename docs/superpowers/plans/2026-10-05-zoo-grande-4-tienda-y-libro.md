# Zoo grande, plan 4 de 4: tienda y libro — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cerrar el zoo grande: la tienda enseña como mucho 5 artículos (los siguientes por precio), el libro pasa de 14 a 49 páginas repartidas en capítulos con índice, y sale la versión 2.3.0.

**Architecture:** Dos cambios de lógica pura y uno de pantalla. `core/shopEntries.ts` deja de dar un artículo por recinto y da los 5 más baratos que se pueden comprar. `data/book.ts` deja de ser una lista escrita a mano: las páginas salen de los recintos (`PENS`), agrupadas por capítulo, con dos tipos de página de paso que no cuentan (índice y portadilla). `BookScene` aprende a pintar esas dos páginas y numera dentro del capítulo.

**Tech Stack:** TypeScript, Phaser 4, Vitest, Playwright. Todo dentro de `game/`.

**Spec:** `docs/superpowers/specs/2026-10-05-zoo-grande-design.md`. **Textos:** `docs/superpowers/specs/2026-10-05-zoo-grande-textos-libro.md`. **Planes anteriores (hechos):** 1, 2 y 3.

## Global Constraints

- Las partidas guardadas siguen valiendo: no se toca `SAVE_VERSION`. `book.seen` y `book.page` guardan ids de página, y los 14 ids de siempre no cambian.
- Ningún texto visible fuera de `src/data/strings.ts`; frases completas; el guardado solo guarda ids.
- Textos de página: 20 palabras como mucho.
- `core/` no importa Phaser.
- **Decidido con David (5-oct-2026):** el huevo no lo come ningún animal, y se queda así. La tienda enseña **como mucho 5 artículos: los siguientes por precio**, mezclando recintos y «otro animal».
- Los 35 textos son una propuesta pendiente del OK de David; van al juego para que pueda leerlos ahí.
- Versión 2.3.0 en `package.json`, `package-lock.json` y `android/app/build.gradle` (`versionCode` 5).
- Comandos desde `game/`: `npm test`, `npm run typecheck`, `npm run test:e2e`.

## Mapa de archivos

| Archivo | Cambio | Responsabilidad |
|---|---|---|
| `src/core/shopEntries.ts` | Modificar | Los 5 artículos más baratos que se pueden comprar |
| `src/data/book.ts` | Reescribir | Capítulos y páginas generadas desde `PENS` |
| `src/core/book.ts` | Modificar | Solo cuentan las páginas de contenido; progreso y posición por capítulo |
| `src/scenes/BookScene.ts` | Modificar | Índice tocable, portadillas, número de página por capítulo |
| `src/data/strings.ts` | Modificar | 35 textos y los textos del índice y los capítulos |
| `src/world/Decor.ts` | Modificar | El nombre del zoo sale de `strings.ts` |
| `src/systems/testHooks.ts` | Modificar | `bookIndexPos(chapter)` |
| `tests/unit/strings.test.ts` | Nuevo | Ningún texto visible fuera de `strings.ts`; máximo de palabras |

---

### Task 1: La tienda enseña los 5 siguientes por precio

**Files:** `src/core/shopEntries.ts`; tests `tests/unit/shopEntries.test.ts`, `tests/e2e/polish.spec.ts`.

**Interfaces:**
- Produces: `SHOP_SLOTS = 5`; `shopEntries(state): ShopEntry[]` devuelve como mucho `SHOP_SLOTS` artículos. Desaparece `PENS_ON_SALE`.

Regla:

1. Candidatos: de cada recinto cerrado, el recinto (precio del recinto); de cada recinto abierto con sitio, su «otro animal» (precio de la especie del siguiente residente).
2. Se ordenan por precio, de menor a mayor; a igual precio, en el orden de `PEN_IDS`. Se enseñan los 5 primeros.
3. Solo si hay menos de 5 cosas que comprar, los huecos se rellenan con los «otro animal» de los recintos ya completos (sello AGOTADO), en el orden de `PEN_IDS`. Así la tienda no se queda vacía al final.

- [ ] **Step 1: Tests que fallan** (`tests/unit/shopEntries.test.ts`, sustituyendo los que hablan de «un artículo por recinto» y de los 3 recintos):

```ts
  it('al principio: los cinco más baratos, de menor a mayor precio', () => {
    expect(shopEntries(withCounts({})).map((e) => `${e.id}:${e.cost}`)).toEqual([
      'extra-cabra:10', 'pantera:50', 'panda:100', 'estanque:150', 'ovejas:250',
    ]);
  });

  it('nunca hay más de 5 artículos', () => {
    const all = { pantera: 1, panda: 1, estanque: 1, ovejas: 1, establo: 1, pinguinos: 1, sabana: 1, 'elefantes-africanos': 1, 'elefantes-asiaticos': 1 };
    expect(shopEntries(withCounts(all))).toHaveLength(SHOP_SLOTS);
  });

  it('al comprar un recinto, su "otro animal" entra por su precio y lo caro espera', () => {
    expect(summary(withCounts({ pantera: 1 }))).toEqual(['extra-cabra:buy', 'extra-pantera:buy', 'panda:buy', 'estanque:buy', 'ovejas:buy']);
  });

  it('a igual precio manda el orden de los recintos', () => {
    // Otro pato (30) y otra gallina del establo (30): primero el estanque.
    const ids = shopEntries(withCounts({ cabra: 5, pantera: 2, panda: 2, estanque: 1, establo: 1 })).map((e) => e.id);
    expect(ids.slice(0, 2)).toEqual(['extra-estanque', 'extra-establo']);
  });

  it('lo completo no ocupa sitio mientras haya 5 cosas que comprar', () => {
    expect(summary(withCounts({ cabra: 5, pantera: 2 }))).not.toContain('extra-cabra:full');
  });

  it('cuando quedan menos de 5 cosas que comprar, lo completo rellena los huecos como AGOTADO', () => {
    const done = { cabra: 5, pantera: 2, panda: 2, estanque: 5, ovejas: 5, establo: 8, pinguinos: 5, sabana: 8, 'elefantes-africanos': 2, 'elefantes-asiaticos': 1 };
    expect(summary(withCounts(done))).toEqual(['extra-elefantes-asiaticos:buy', 'extra-cabra:full', 'extra-pantera:full', 'extra-panda:full', 'extra-estanque:full']);
  });
```

Se conservan los tests de especie, aspecto y del extra de un recinto mixto.

- [ ] **Step 2:** `npm test -- shopEntries` → FAIL.
- [ ] **Step 3: Implementar** `shopEntries` con la regla de arriba (ordenación estable por `cost`).
- [ ] **Step 4:** `npm test; npm run typecheck` → PASS.
- [ ] **Step 5:** En `tests/e2e/polish.spec.ts`, el test «comprar la pantera y luego otra» deja de esperar el estado `full`: al completarse, «otra pantera» desaparece de la tienda (`shopCardStatus('extra-pantera')` es `null`). Las monedas y el contador no cambian.
- [ ] **Step 6: Commit** `feat: la tienda enseña los 5 artículos siguientes por precio`.

---

### Task 2: El libro por capítulos, con las 49 páginas

**Files:** `src/data/book.ts`, `src/core/book.ts`, `src/data/strings.ts`; tests `tests/unit/book.test.ts`, `tests/unit/pens.test.ts`.

**Interfaces:**
- Produces (`data/book.ts`):
  - `BOOK_CHAPTERS = ['inicio', 'centro', 'montana', 'granja', 'polo', 'sabana'] as const`; `type ChapterId`.
  - `CHAPTER_PENS: Record<ChapterId, readonly PenId[]>` — `inicio: []`, `centro: leon, pantera, panda`, `montana: cabra`, `granja: estanque, ovejas, establo`, `polo: pinguinos`, `sabana: sabana, elefantes-africanos, elefantes-asiaticos`.
  - `interface BookPage { id: string; chapter: ChapterId; role?: 'index' | 'divider'; unlock?: { penId: PenId; count: number }; picture: … }`.
  - `BOOK_PAGES`: `cover`, `index` (índice), `story`, `mary`, y por cada capítulo con recintos su portadilla `chapter-<id>` seguida de una página por residente en el orden de sus recintos (y `sasha` detrás de `bills`).
  - `chapterTitleKey(id: ChapterId): StringKey` → `book.chapter.<id>`.
- Produces (`core/book.ts`):
  - `isContentPage(page): boolean` — las que no son índice ni portadilla.
  - `unlockedPageIds`, `unreadPageIds`, `newlyUnlockedPages`: solo páginas de contenido.
  - `chapterProgress(state, chapter): { n: number; total: number }` — páginas de contenido conseguidas del capítulo.
  - `pagePosition(page): { n: number; total: number } | null` — puesto de una página de contenido dentro de su capítulo; `null` en índice y portadillas.

- [ ] **Step 1: Tests que fallan** (`tests/unit/book.test.ts`):

```ts
  it('tiene 49 páginas que cuentan: 3 de inicio, 11 de siempre y 35 nuevas', () => {
    expect(BOOK_PAGES.filter(isContentPage)).toHaveLength(49);
  });

  it('empieza por la portada y el índice, y cada capítulo con animales abre con su portadilla', () => {
    expect(BOOK_PAGES.slice(0, 4).map((p) => p.id)).toEqual(['cover', 'index', 'story', 'mary']);
    expect(BOOK_PAGES.filter((p) => p.role === 'divider').map((p) => p.id)).toEqual([
      'chapter-centro', 'chapter-montana', 'chapter-granja', 'chapter-polo', 'chapter-sabana',
    ]);
  });

  it('cada animal del zoo tiene su página, en el capítulo de su recinto', () => {
    for (const chapter of BOOK_CHAPTERS) {
      for (const penId of CHAPTER_PENS[chapter]) {
        PENS[penId].residents.forEach((r, i) => {
          expect(BOOK_PAGES.find((p) => p.id === r.id), r.id).toMatchObject({ chapter, unlock: { penId, count: i + 1 } });
        });
      }
    }
  });

  it('todos los recintos están en algún capítulo, una sola vez', () => {
    expect(BOOK_CHAPTERS.flatMap((c) => CHAPTER_PENS[c]).sort()).toEqual([...PEN_IDS].sort());
  });

  it('el índice y las portadillas no cuentan como páginas nuevas ni por leer', () => {
    expect(unlockedPageIds(initialState())).toEqual(['cover', 'story', 'mary', 'bills', 'sasha', 'gordi']);
  });

  it('progreso por capítulo', () => {
    expect(chapterProgress(initialState(), 'inicio')).toEqual({ n: 3, total: 3 });
    expect(chapterProgress(initialState(), 'centro')).toEqual({ n: 2, total: 6 });
    expect(chapterProgress(withCounts({ establo: 3 }), 'granja')).toEqual({ n: 3, total: 18 });
  });

  it('cada página se numera dentro de su capítulo', () => {
    const page = (id: string) => BOOK_PAGES.find((p) => p.id === id)!;
    expect(pagePosition(page('mary'))).toEqual({ n: 3, total: 3 });
    expect(pagePosition(page('gordi'))).toEqual({ n: 1, total: 5 });
    expect(pagePosition(page('raja'))).toEqual({ n: 11, total: 12 });
    expect(pagePosition(page('index'))).toBeNull();
    expect(pagePosition(page('chapter-polo'))).toBeNull();
  });

  it('completo con todos los animales', () => {
    const full = Object.fromEntries(PEN_IDS.map((id) => [id, PENS[id].residents.length]));
    expect(isBookComplete(initialState())).toBe(false);
    expect(isBookComplete(withCounts(full))).toBe(true);
  });
```

El test «cada página tiene título y texto» pasa a recorrer solo las de contenido (y la contraportada), y se añade que cada capítulo tiene nombre. En `pens.test.ts`, la comprobación de página del libro vuelve a ser para **todos** los residentes.

- [ ] **Step 2:** `npm test -- book pens` → FAIL.
- [ ] **Step 3: Implementar** `data/book.ts` y `core/book.ts` según las interfaces.
- [ ] **Step 4: Textos** en `strings.ts`: los 35 `book.page.<id>.text` del documento de textos, `book.index.title`, los seis `book.chapter.<id>` y `book.chapter.count`. La contraportada sigue igual.
- [ ] **Step 5:** `npm test; npm run typecheck` → PASS.
- [ ] **Step 6: Commit** `feat: el libro tiene 49 páginas repartidas en capítulos`.

---

### Task 3: `BookScene` con índice y portadillas

**Files:** `src/scenes/BookScene.ts`, `src/systems/testHooks.ts`; e2e `tests/e2e/zoo-grande.spec.ts`.

**Interfaces:**
- Consumes: `isContentPage`, `chapterProgress`, `pagePosition`, `chapterTitleKey`, `BOOK_CHAPTERS`, `CHAPTER_PENS`.
- Produces: `BookScene.indexPos(chapter: ChapterId): Vec | null` (centro en pantalla de la fila de ese capítulo, solo con el índice abierto) y el hook `bookIndexPos(chapter: string)`.

Qué pinta cada tipo de página:

- **Índice** (`role: 'index'`): título `book.index.title` y una fila por capítulo con animales (los cinco, sin `inicio`): nombre del capítulo a la izquierda y `book.count` («2 de 6») a la derecha. Cada fila es una zona táctil grande; tocarla lleva a la portadilla de ese capítulo.
- **Portadilla** (`role: 'divider'`): nombre del capítulo en grande, el dibujo del primer animal del capítulo (siempre a color, es una portada) y `book.chapter.count` («Tienes 2 de 6»).
- **Página de contenido**: como hasta ahora; el número de abajo pasa a ser el puesto dentro del capítulo (`pagePosition`).
- Las páginas de paso nunca llevan la estrella de «nueva» ni se marcan como leídas.

- [ ] **Step 1: E2E que falla** (añadir a `tests/e2e/zoo-grande.spec.ts`):

```ts
test('el libro se abre por un capítulo desde el índice', async ({ page }) => {
  await startGame(page);
  await page.evaluate(() => window.__ZOO__!.openBook('index'));
  await page.waitForFunction(() => window.__ZOO__?.bookPage() === 'index');
  const row = await page.evaluate(() => window.__ZOO__!.bookIndexPos('granja'));
  const box = await canvasBox(page);
  await page.mouse.click(box.x + row!.x, box.y + row!.y);
  await expect.poll(() => page.evaluate(() => window.__ZOO__!.bookPage())).toBe('chapter-granja');
  await page.evaluate(() => window.__ZOO__!.bookNext());
  expect(await page.evaluate(() => window.__ZOO__!.bookPage())).toBe('cuac');
  // Sin comprar el estanque, la página de Cuac está por descubrir.
  expect(await page.evaluate(() => window.__ZOO__!.bookText())).toBe('???');
});
```

Hooks nuevos: `openBook(page?: string)` (abre el libro por una página, para no pasar por la estantería) y `bookIndexPos(chapter)`.

- [ ] **Step 2:** ejecutar ese e2e → FAIL.
- [ ] **Step 3: Implementar** en `BookScene`: `showPage` reparte entre `showIndex`, `showDivider` y la página de contenido; `goTo(id)`; `indexPos`.
- [ ] **Step 4:** `npm run typecheck; npm run test:e2e` → PASS (el e2e del libro de `shop.spec.ts` sigue abriendo por `cover` y por `noche`).
- [ ] **Step 5: Verlo** en el juego con todo comprado: índice, una portadilla y páginas de animales nuevos; que ningún texto se sale de la hoja.
- [ ] **Step 6: Commit** `feat: índice y portadillas en el libro del zoo`.

---

### Task 4: Test de textos, versión 2.3.0 y documentación

**Files:** `tests/unit/strings.test.ts` (nuevo), `src/world/Decor.ts`, `package.json`, `package-lock.json`, `android/app/build.gradle`, `game/README.md`, el spec y la memoria del proyecto.

- [ ] **Step 1: Test de textos** (`tests/unit/strings.test.ts`):
  - Cada `book.page.*.text` tiene 20 palabras como mucho.
  - En `src/scenes/` y `src/world/` no queda ningún texto visible escrito a mano: tras quitar comentarios, ninguna cadena entre comillas con dos o más palabras seguidas (letras, con espacio en medio), salvo en líneas de error (`new Error(`), claves de textos y nombres técnicos.
- [ ] **Step 2:** `npm test -- strings` → FAIL donde haya textos sueltos (el «Zoo Esponji» del portón en `Decor.ts`); pasarlos a `t(...)`.
- [ ] **Step 3: Versión** 2.3.0 (`package.json`, `package-lock.json`, `versionName` y `versionCode` 5 en `android/app/build.gradle`).
- [ ] **Step 4: Documentación:** estado del plan 4 y decisiones en el spec; README (tienda de 5 artículos por precio, libro de 49 páginas con capítulos, 2.3.0).
- [ ] **Step 5:** `npm test; npm run typecheck; npm run test:e2e; npm run build` → PASS.
- [ ] **Step 6: Commit** `feat: Zoo Esponji 2.3.0 — zoo grande`.

---

## Self-Review

| Requisito del spec | Tarea |
|---|---|
| La tienda no pasa de las peanas que hay | 1 (regla acordada con David: 5 por precio) |
| Libro de 14 a 49 páginas, una por residente | 2 |
| Capítulos por zona con portadilla que no cuenta | 2 y 3 |
| Índice tocable y contador «n de total» por capítulo | 3 |
| Textos de 20 palabras como mucho, en `strings.ts` | 2 y 4 |
| Test: ningún texto visible fuera de `strings.ts` | 4 |
| E2E: abrir el libro por un capítulo | 3 |
| Versión 2.3.0 y docs | 4 |

Fuera de este plan: el multi-idioma (spec propio, antes de Play Store) y la aprobación de los 35 textos, que es de David.
