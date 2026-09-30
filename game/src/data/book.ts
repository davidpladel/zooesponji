import type { AnimalId } from './animals';

/**
 * Páginas del libro del zoo, en el orden del parque. Los textos están en strings.ts
 * (`book.page.<id>.title` / `.text`): aquí solo ids, para que el multi-idioma sea traducir.
 */
export interface BookPage {
  id: string;
  /** Sin `unlock`: página que está desde el principio. */
  unlock?: { animalId: AnimalId; count: number };
  /** Qué dibujo sale: el animal, su compañero (la leona), la cuidadora o el portón del zoo. */
  picture: { kind: 'animal' | 'companion'; animalId: AnimalId } | { kind: 'keeper' } | { kind: 'gate' } | { kind: 'logo' };
}

export const BOOK_PAGES: readonly BookPage[] = [
  { id: 'cover', picture: { kind: 'logo' } },
  { id: 'story', picture: { kind: 'gate' } },
  { id: 'mary', picture: { kind: 'keeper' } },
  { id: 'bills', unlock: { animalId: 'leon', count: 1 }, picture: { kind: 'animal', animalId: 'leon' } },
  { id: 'sasha', unlock: { animalId: 'leon', count: 1 }, picture: { kind: 'companion', animalId: 'leon' } },
  { id: 'gordi', unlock: { animalId: 'cabra', count: 1 }, picture: { kind: 'animal', animalId: 'cabra' } },
  { id: 'nube', unlock: { animalId: 'cabra', count: 2 }, picture: { kind: 'animal', animalId: 'cabra' } },
  { id: 'galleta', unlock: { animalId: 'cabra', count: 3 }, picture: { kind: 'animal', animalId: 'cabra' } },
  { id: 'tolon', unlock: { animalId: 'cabra', count: 4 }, picture: { kind: 'animal', animalId: 'cabra' } },
  { id: 'chispa', unlock: { animalId: 'cabra', count: 5 }, picture: { kind: 'animal', animalId: 'cabra' } },
  { id: 'noche', unlock: { animalId: 'pantera', count: 1 }, picture: { kind: 'animal', animalId: 'pantera' } },
  { id: 'sombra', unlock: { animalId: 'pantera', count: 2 }, picture: { kind: 'animal', animalId: 'pantera' } },
  { id: 'mochi', unlock: { animalId: 'panda', count: 1 }, picture: { kind: 'animal', animalId: 'panda' } },
  { id: 'pompon', unlock: { animalId: 'panda', count: 2 }, picture: { kind: 'animal', animalId: 'panda' } },
];

/** Contraportada: solo aparece con el libro completo (no cuenta en "n de total"). */
export const BOOK_BACK_ID = 'back';
