import { describe, expect, it } from 'vitest';
import { isBookComplete, newlyUnlockedPages, unlockedPageIds, unreadPageIds } from '../../src/core/book';
import { initialState, type GameState } from '../../src/core/economy';
import { BOOK_BACK_ID, BOOK_PAGES } from '../../src/data/book';
import { STRINGS_ES } from '../../src/data/strings';

const withCounts = (counts: Partial<GameState['counts']>): GameState => ({
  ...initialState(),
  counts: { ...initialState().counts, ...counts },
});

describe('libro del zoo', () => {
  it('al empezar: portada, historia, Mary, Bills, Sasha y Gordi', () => {
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
    expect(isBookComplete(initialState())).toBe(false);
    expect(isBookComplete(withCounts({ cabra: 5, pantera: 2, panda: 2 }))).toBe(true);
  });

  it('cada página (y la contraportada) tiene título y texto en strings.ts', () => {
    const strings: Record<string, string> = STRINGS_ES;
    for (const id of [...BOOK_PAGES.map((p) => p.id), BOOK_BACK_ID]) {
      expect(strings[`book.page.${id}.title`], id).toBeTruthy();
      expect(strings[`book.page.${id}.text`], id).toBeTruthy();
    }
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
