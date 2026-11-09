import { ANIMALS } from '../data/animals';
import { BOOK_PAGES, type BookPage, type ChapterId } from '../data/book';
import type { FoodId } from '../data/foods';
import { penCount, type GameState } from './economy';

/** Las páginas que cuentan: todas menos el índice y las portadillas. */
export function isContentPage(page: BookPage): boolean {
  return page.role === undefined;
}

export function isPageUnlocked(state: GameState, page: BookPage): boolean {
  const unlock = page.unlock;
  if (!unlock) return true;
  if ('pet' in unlock) return state.luna;
  return penCount(state, unlock.penId) >= unlock.count;
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

/**
 * Página por la que se abrirá el libro después de una compra que trae las páginas `fresh` (David, 2026-11-08):
 * - Si el libro no se ha abierto nunca, no cambia: la primera vez se empieza por la primera hoja.
 * - Si no, la del animal nuevo. Si ya había otra nueva esperando (comprada y aún sin leer), la que va antes en el
 *   libro: tras comprar varios, se abre por la primera de todos ellos y se pasa hoja hasta las demás.
 */
export function bookPageAfterPurchase(
  book: { page: string | null; seen: readonly string[]; opened: boolean },
  fresh: readonly string[],
): string | null {
  if (!book.opened || fresh.length === 0) return book.page;
  const order = (id: string) => BOOK_PAGES.findIndex((p) => p.id === id);
  const current = BOOK_PAGES.find((p) => p.id === book.page);
  const waiting = current && isContentPage(current) && !book.seen.includes(current.id) ? [current.id] : [];
  return [...waiting, ...fresh].sort((a, b) => order(a) - order(b))[0]!;
}

/** Página por la que se abre el libro: la primera hoja si no se ha abierto nunca; si no, donde se quedó. */
export function bookStartPage(book: { page: string | null; opened: boolean }): string | null {
  return book.opened ? book.page : null;
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

/** Desde esta entrada a la tienda (o desde que se abre por primera vez), el libro está siempre a la vista. */
export const BOOK_NOTICE_VISITS = 3;

/** ¿El libro tiene que estar a la vista, parpadeando, en vez de escondido en la estantería? (Pedido de David, 2026-11-02: una vez que sale, ya no se esconde.) */
export function showBookNotice(visits: number, opened: boolean): boolean {
  return visits >= BOOK_NOTICE_VISITS || opened;
}

/** Monedas que enseña la página de un animal: lo que da por comer (igual que por lavarlo o curarlo) y su especial. */
export interface PageCoins {
  come: number;
  /** Su comida especial y cuánto da de más que la normal. */
  special?: { foodId: FoodId; extra: number };
}

/**
 * Monedas de la página de un animal (David, 2026-11-09): para que el niño vea qué animal da más y decida cuál
 * desbloquear antes. Solo las páginas de un animal: las portadillas reúnen varios y el resto no come.
 */
export function pageCoins(page: BookPage): PageCoins | null {
  if (page.role || page.picture.kind !== 'animal') return null;
  const animal = ANIMALS[page.picture.animalId];
  const food = (Object.entries(animal.reactions) as [FoodId, string][]).find(([, reaction]) => reaction === 'especial')?.[0];
  const special = animal.coins.especial;
  if (!food || special === undefined) return { come: animal.coins.come };
  return { come: animal.coins.come, special: { foodId: food, extra: special - animal.coins.come } };
}
