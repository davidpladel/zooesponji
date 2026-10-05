import { BOOK_PAGES, type BookPage } from '../data/book';
import { penCount, type GameState } from './economy';

export function isPageUnlocked(state: GameState, page: BookPage): boolean {
  return !page.unlock || penCount(state, page.unlock.penId) >= page.unlock.count;
}

/** Ids de las páginas conseguidas, en el orden del libro. */
export function unlockedPageIds(state: GameState): string[] {
  return BOOK_PAGES.filter((p) => isPageUnlocked(state, p)).map((p) => p.id);
}

/** Páginas conseguidas que aún no se han leído. */
export function unreadPageIds(state: GameState, seen: readonly string[]): string[] {
  const read = new Set(seen);
  return unlockedPageIds(state).filter((id) => !read.has(id));
}

export function isBookComplete(state: GameState): boolean {
  return BOOK_PAGES.every((p) => isPageUnlocked(state, p));
}

/** Páginas que trae una compra (las que hay después y no había antes), en orden del libro. */
export function newlyUnlockedPages(before: GameState, after: GameState): string[] {
  const had = new Set(unlockedPageIds(before));
  return unlockedPageIds(after).filter((id) => !had.has(id));
}
