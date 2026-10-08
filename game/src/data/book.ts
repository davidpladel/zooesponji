import type { AnimalId } from './animals';
import { PENS, type PenId } from './pens';
import type { StringKey } from './strings';

/** Capítulos del libro, por zona del zoo. `inicio` es lo de antes de los animales: no lleva portadilla. */
export const BOOK_CHAPTERS = ['inicio', 'centro', 'montana', 'granja', 'polo', 'sabana'] as const;
export type ChapterId = (typeof BOOK_CHAPTERS)[number];

/** Recintos de cada capítulo, en el orden en que salen sus páginas. */
export const CHAPTER_PENS: Record<ChapterId, readonly PenId[]> = {
  inicio: [],
  centro: ['leon', 'pantera', 'panda'],
  montana: ['cabra'],
  granja: ['estanque', 'ovejas', 'establo'],
  polo: ['pinguinos'],
  sabana: ['sabana', 'elefantes-africanos', 'elefantes-asiaticos'],
};

export const chapterTitleKey = (id: ChapterId): StringKey => `book.chapter.${id}`;
/** Id de la portadilla de un capítulo. */
export const chapterPageId = (id: ChapterId): string => `chapter-${id}`;

/**
 * Una página del libro. Los textos están en strings.ts (`book.page.<id>.title` / `.text`): aquí solo
 * ids, para que el multi-idioma sea traducir.
 */
export interface BookPage {
  id: string;
  chapter: ChapterId;
  /** Páginas de paso, que no cuentan: el índice y la portadilla de cada capítulo. */
  role?: 'index' | 'divider';
  /** Sin `unlock`: página que está desde el principio. */
  unlock?: { penId: PenId; count: number };
  /** Qué dibujo sale: el animal, su compañero (la leona), la cuidadora o el portón del zoo. */
  picture: { kind: 'animal' | 'companion'; animalId: AnimalId } | { kind: 'keeper' } | { kind: 'gate' } | { kind: 'logo' };
}

/** Páginas de un recinto: una por residente, por orden de llegada (y la leona detrás de Bills). */
function penPages(chapter: ChapterId, penId: PenId): BookPage[] {
  return PENS[penId].residents.flatMap((resident, index): BookPage[] => {
    const unlock = { penId, count: index + 1 };
    const page: BookPage = { id: resident.id, chapter, unlock, picture: { kind: 'animal', animalId: resident.species } };
    const companion = index === 0 ? PENS[penId].companion : undefined;
    if (!companion) return [page];
    return [page, { id: companion.id, chapter, unlock, picture: { kind: 'companion', animalId: companion.species } }];
  });
}

/** Portadilla y páginas de un capítulo con animales. El dibujo de la portadilla es el de su primer animal. */
function chapterPages(chapter: ChapterId): BookPage[] {
  const pens = CHAPTER_PENS[chapter];
  const lead = pens[0];
  if (!lead) return [];
  const divider: BookPage = {
    id: chapterPageId(chapter),
    chapter,
    role: 'divider',
    picture: { kind: 'animal', animalId: PENS[lead].residents[0]!.species },
  };
  return [divider, ...pens.flatMap((penId) => penPages(chapter, penId))];
}

/** El libro entero, en orden: portada, índice, la historia y un capítulo por zona. */
export const BOOK_PAGES: readonly BookPage[] = [
  { id: 'cover', chapter: 'inicio', picture: { kind: 'logo' } },
  { id: 'index', chapter: 'inicio', role: 'index', picture: { kind: 'logo' } },
  { id: 'story', chapter: 'inicio', picture: { kind: 'gate' } },
  { id: 'mary', chapter: 'inicio', picture: { kind: 'keeper' } },
  ...BOOK_CHAPTERS.flatMap(chapterPages),
];

/** Contraportada: solo aparece con el libro completo (no cuenta en "n de total"). */
export const BOOK_BACK_ID = 'back';
