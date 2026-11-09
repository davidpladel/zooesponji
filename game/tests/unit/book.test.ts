import { describe, expect, it } from 'vitest';
import {
  pageCoins,
  BOOK_NOTICE_VISITS,
  bookPageAfterPurchase,
  bookStartPage,
  chapterProgress,
  showBookNotice,
  isBookComplete,
  isContentPage,
  newlyUnlockedPages,
  pagePosition,
  unlockedPageIds,
  unreadPageIds,
} from '../../src/core/book';
import { initialState, type GameState } from '../../src/core/economy';
import { ANIMALS } from '../../src/data/animals';
import { BOOK_BACK_ID, BOOK_CHAPTERS, BOOK_PAGES, CHAPTER_PENS, chapterTitleKey } from '../../src/data/book';
import { PEN_IDS, PENS } from '../../src/data/pens';
import { STRINGS_ES } from '../../src/data/strings';

const withCounts = (counts: Partial<GameState['counts']>): GameState => ({
  ...initialState(),
  counts: { ...initialState().counts, ...counts },
});

describe('libro del zoo', () => {
  it('tiene 56 páginas que cuentan: 4 de inicio (con Luna) y una por cada animal', () => {
    expect(BOOK_PAGES.filter(isContentPage)).toHaveLength(56);
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

  it('la leona va detrás de Bills, en el capítulo del centro', () => {
    const ids = BOOK_PAGES.map((p) => p.id);
    expect(ids.indexOf('sasha')).toBe(ids.indexOf('bills') + 1);
    expect(BOOK_PAGES.find((p) => p.id === 'sasha')).toMatchObject({ chapter: 'centro', unlock: { penId: 'leon', count: 1 } });
  });

  it('al empezar: portada, historia, Mary, Bills, Sasha y Gordi (el índice y las portadillas no cuentan)', () => {
    expect(unlockedPageIds(initialState())).toEqual(['cover', 'story', 'mary', 'bills', 'sasha', 'gordi']);
  });

  it('las cabras se nombran por orden de llegada', () => {
    expect(unlockedPageIds(withCounts({ cabra: 3 }))).toContain('galleta');
    expect(unlockedPageIds(withCounts({ cabra: 3 }))).not.toContain('tolon');
  });

  it('comprar la pantera trae la página de Noche', () => {
    expect(unreadPageIds(withCounts({ pantera: 1 }), unlockedPageIds(initialState()))).toEqual(['noche']);
  });

  it('completo con todos los animales', () => {
    const full = Object.fromEntries(PEN_IDS.map((id) => [id, PENS[id].residents.length]));
    expect(isBookComplete(initialState())).toBe(false);
    expect(isBookComplete(withCounts({ cabra: 5, pantera: 2, panda: 3 }))).toBe(false);
    // Sin Luna no está completo: su página también cuenta.
    expect(isBookComplete(withCounts(full))).toBe(false);
    expect(isBookComplete({ ...withCounts(full), luna: true })).toBe(true);
  });

  it('progreso por capítulo', () => {
    expect(chapterProgress(initialState(), 'inicio')).toEqual({ n: 3, total: 4 });
    expect(chapterProgress(initialState(), 'centro')).toEqual({ n: 2, total: 7 });
    expect(chapterProgress(withCounts({ establo: 3 }), 'granja')).toEqual({ n: 3, total: 23 });
  });

  it('cada página se numera dentro de su capítulo', () => {
    const page = (id: string) => BOOK_PAGES.find((p) => p.id === id)!;
    expect(pagePosition(page('mary'))).toEqual({ n: 3, total: 4 });
    expect(pagePosition(page('gordi'))).toEqual({ n: 1, total: 5 });
    expect(pagePosition(page('raja'))).toEqual({ n: 11, total: 12 });
    expect(pagePosition(page('index'))).toBeNull();
    expect(pagePosition(page('chapter-polo'))).toBeNull();
  });

  it('cada página que cuenta (y la contraportada) tiene título y texto en strings.ts', () => {
    const strings: Record<string, string> = STRINGS_ES;
    for (const id of [...BOOK_PAGES.filter(isContentPage).map((p) => p.id), BOOK_BACK_ID]) {
      expect(strings[`book.page.${id}.title`], id).toBeTruthy();
      expect(strings[`book.page.${id}.text`], id).toBeTruthy();
    }
  });

  it('cada capítulo tiene nombre', () => {
    for (const chapter of BOOK_CHAPTERS) expect(STRINGS_ES[chapterTitleKey(chapter)], chapter).toBeTruthy();
  });

  it('una compra trae solo su página', () => {
    expect(newlyUnlockedPages(withCounts({ cabra: 5 }), withCounts({ cabra: 5, pantera: 1 }))).toEqual(['noche']);
    expect(newlyUnlockedPages(initialState(), initialState())).toEqual([]);
  });

  it('ids únicos', () => {
    const ids = BOOK_PAGES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('aviso del libro en la tienda', () => {
  it('desde la 3.ª entrada, o si ya se ha abierto alguna vez, se ve siempre', () => {
    expect(BOOK_NOTICE_VISITS).toBe(3);
    expect(showBookNotice(2, false)).toBe(false);
    expect(showBookNotice(3, false)).toBe(true);
    expect(showBookNotice(10, true)).toBe(true);
    expect(showBookNotice(1, true)).toBe(true);
  });
});

describe('página de Luna', () => {
  it('va detrás de la de Mary, con su dibujo, y se consigue al comprarla', () => {
    const ids = BOOK_PAGES.map((p) => p.id);
    expect(ids.indexOf('luna')).toBe(ids.indexOf('mary') + 1);
    const luna = BOOK_PAGES.find((p) => p.id === 'luna')!;
    expect(luna.picture).toEqual({ kind: 'pet', petId: 'luna' });
    expect(unlockedPageIds(initialState())).not.toContain('luna');
    expect(unlockedPageIds({ ...initialState(), luna: true })).toContain('luna');
    expect(newlyUnlockedPages(initialState(), { ...initialState(), luna: true })).toEqual(['luna']);
  });
});

describe('por qué página se abre el libro (David, 2026-11-08)', () => {
  const never = { page: null, seen: [] as string[], opened: false };
  const opened = { page: 'story', seen: ['cover', 'story'], opened: true };

  it('sin abrirlo nunca, aunque se compre, empieza por la primera hoja', () => {
    expect(bookPageAfterPurchase(never, ['noche'])).toBeNull();
    expect(bookStartPage({ ...never, page: 'noche' })).toBeNull();
    expect(bookStartPage(never)).toBeNull();
  });

  it('ya abierto, cada compra lo deja en la página del animal nuevo', () => {
    expect(bookPageAfterPurchase(opened, ['noche'])).toBe('noche');
    expect(bookStartPage({ ...opened, page: 'noche' })).toBe('noche');
    expect(bookPageAfterPurchase(opened, [])).toBe('story');
  });

  it('tras comprar varios sin leerlos, la primera de todos ellos en el libro', () => {
    const order = (id: string) => BOOK_PAGES.findIndex((p) => p.id === id);
    expect(order('noche')).toBeLessThan(order('mochi'));
    // Panda primero y pantera después, o al revés: siempre la pantera, que va antes.
    expect(bookPageAfterPurchase({ ...opened, page: 'mochi' }, ['noche'])).toBe('noche');
    expect(bookPageAfterPurchase({ ...opened, page: 'noche' }, ['mochi'])).toBe('noche');
    // Una vez leída, la siguiente compra ya lleva a la suya.
    expect(bookPageAfterPurchase({ ...opened, page: 'noche', seen: [...opened.seen, 'noche'] }, ['mochi'])).toBe('mochi');
  });
});

describe('monedas en la página de cada animal (David, 2026-11-09)', () => {
  const page = (id: string) => BOOK_PAGES.find((p) => p.id === id)!;

  it('la cabra: 1 moneda por comer y su comida especial, el conejo, da 1 más', () => {
    expect(pageCoins(page('gordi'))).toEqual({ come: 1, special: { foodId: 'conejo', extra: 1 } });
  });

  it('la jirafa: 8, y con el plátano 4 más', () => {
    const giraffe = BOOK_PAGES.find((p) => !p.role && p.picture.kind === 'animal' && p.picture.animalId === 'jirafa')!;
    expect(pageCoins(giraffe)).toEqual({ come: 8, special: { foodId: 'platano', extra: 4 } });
  });

  it('sin comida especial, solo la primera línea', () => {
    expect(pageCoins(page('bills'))).toEqual({ come: 1 });
  });

  it('cada página de animal lleva las monedas de su especie (las mismas por comer, lavar y curar)', () => {
    for (const p of BOOK_PAGES) {
      if (p.role || p.picture.kind !== 'animal') continue;
      expect(pageCoins(p)?.come, p.id).toBe(ANIMALS[p.picture.animalId].coins.come);
    }
  });

  it('las portadillas, el índice, Luna, la cuidadora y el portón no llevan monedas', () => {
    for (const p of BOOK_PAGES) if (p.picture.kind !== 'animal') expect(pageCoins(p), p.id).toBeNull();
    for (const p of BOOK_PAGES) if (p.role) expect(pageCoins(p), p.id).toBeNull();
  });
});
