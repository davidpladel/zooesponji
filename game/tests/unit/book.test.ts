import { describe, expect, it } from 'vitest';
import {
  chapterProgress,
  isBookComplete,
  isContentPage,
  newlyUnlockedPages,
  pagePosition,
  unlockedPageIds,
  unreadPageIds,
} from '../../src/core/book';
import { initialState, type GameState } from '../../src/core/economy';
import { BOOK_BACK_ID, BOOK_CHAPTERS, BOOK_PAGES, CHAPTER_PENS, chapterTitleKey } from '../../src/data/book';
import { PEN_IDS, PENS } from '../../src/data/pens';
import { STRINGS_ES } from '../../src/data/strings';

const withCounts = (counts: Partial<GameState['counts']>): GameState => ({
  ...initialState(),
  counts: { ...initialState().counts, ...counts },
});

describe('libro del zoo', () => {
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
    expect(isBookComplete(withCounts({ cabra: 5, pantera: 2, panda: 2 }))).toBe(false);
    expect(isBookComplete(withCounts(full))).toBe(true);
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
