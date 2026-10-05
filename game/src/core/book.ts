import { BOOK_PAGES, type BookPage, type ChapterId } from '../data/book';
import { penCount, type GameState } from './economy';

/** Las páginas que cuentan: todas menos el índice y las portadillas. */
export function isContentPage(page: BookPage): boolean {
  return page.role === undefined;
}

export function isPageUnlocked(state: GameState, page: BookPage): boolean {
  return !page.unlock || penCount(state, page.unlock.penId) >= page.unlock.count;
}

/** Ids de las páginas conseguidas, en el orden del libro. */
export function unlockedPageIds(state: GameState): string[] {
  return BOOK_PAGES.filter((p) => isContentPage(p) && isPageUnlocked(state, p)).map((p) => p.id);
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

function contentOf(chapter: ChapterId): BookPage[] {
  return BOOK_PAGES.filter((p) => p.chapter === chapter && isContentPage(p));
}

/** Páginas conseguidas de un capítulo y cuántas tiene. */
export function chapterProgress(state: GameState, chapter: ChapterId): { n: number; total: number } {
  const pages = contentOf(chapter);
  return { n: pages.filter((p) => isPageUnlocked(state, p)).length, total: pages.length };
}

/** Puesto de una página dentro de su capítulo ("3 de 6"). Null en el índice y las portadillas. */
export function pagePosition(page: BookPage): { n: number; total: number } | null {
  if (!isContentPage(page)) return null;
  const pages = contentOf(page.chapter);
  return { n: pages.findIndex((p) => p.id === page.id) + 1, total: pages.length };
}
