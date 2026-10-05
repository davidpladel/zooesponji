import { FOOD_IDS, type FoodId } from './foods';
import type { StringKey } from './strings';

export const ANIMAL_IDS = [
  'leon', 'cabra', 'pantera', 'panda',
  'jirafa', 'cebra', 'gacela', 'pinguino', 'oveja', 'caballo', 'gallina', 'gallo', 'pato', 'elefante-africano', 'elefante-asiatico',
] as const;
export type AnimalId = (typeof ANIMAL_IDS)[number];

export type Reaction = 'come' | 'rechaza' | 'especial';

export interface AnimalDef {
  id: AnimalId;
  nameKey: StringKey;
  emoji: string;
  /** Solo las comidas que salen en su bandeja. */
  reactions: Partial<Record<FoodId, Reaction>>;
  coins: { come: number; especial?: number };
  /** Precio de cada animal de esta especie que se compra suelto en la tienda. */
  extraCost?: number;
  /** Texto del artículo extra ("Otra cabra"). */
  extraNameKey?: StringKey;
  /** Radio del cuerpo en px (por defecto 7): separa a los grandes al pasear y agranda su zona de toque. */
  radius?: number;
}

export const ANIMALS: Record<AnimalId, AnimalDef> = {
  leon: {
    id: 'leon',
    nameKey: 'animal.leon',
    emoji: '🦁',
    reactions: { carne: 'come', conejo: 'come', piedra: 'rechaza', zanahoria: 'rechaza' },
    coins: { come: 1 },
  },
  cabra: {
    id: 'cabra',
    nameKey: 'animal.cabra',
    emoji: '🐐',
    reactions: { carne: 'rechaza', conejo: 'especial', piedra: 'come', zanahoria: 'come', lechuga: 'come' },
    coins: { come: 1, especial: 2 },
    extraCost: 10,
    extraNameKey: 'shop.extra.cabra',
  },
  pantera: {
    id: 'pantera',
    nameKey: 'animal.pantera',
    emoji: '🐆',
    reactions: { carne: 'come', conejo: 'come', piedra: 'rechaza', zanahoria: 'rechaza' },
    coins: { come: 2 },
    extraCost: 20,
    extraNameKey: 'shop.extra.pantera',
  },
  panda: {
    id: 'panda',
    nameKey: 'animal.panda',
    emoji: '🐼',
    reactions: { carne: 'rechaza', conejo: 'especial', piedra: 'rechaza', zanahoria: 'come' },
    coins: { come: 2, especial: 4 },
    extraCost: 20,
    extraNameKey: 'shop.extra.panda',
  },
  jirafa: {
    id: 'jirafa',
    nameKey: 'animal.jirafa',
    emoji: '🦒',
    reactions: { lechuga: 'come', manzana: 'come', platano: 'especial', carne: 'rechaza', calcetin: 'rechaza' },
    coins: { come: 8, especial: 12 },
    extraCost: 150,
    extraNameKey: 'shop.extra.jirafa',
    radius: 16,
  },
  cebra: {
    id: 'cebra',
    nameKey: 'animal.cebra',
    emoji: '🦓',
    reactions: { lechuga: 'come', zanahoria: 'come', manzana: 'especial', pescado: 'rechaza', piedra: 'rechaza' },
    coins: { come: 6, especial: 9 },
    extraCost: 120,
    extraNameKey: 'shop.extra.cebra',
    radius: 11,
  },
  gacela: {
    id: 'gacela',
    nameKey: 'animal.gacela',
    emoji: '🦌',
    reactions: { lechuga: 'come', zanahoria: 'come', maiz: 'especial', carne: 'rechaza', huevo: 'rechaza' },
    coins: { come: 5, especial: 8 },
    extraCost: 100,
    extraNameKey: 'shop.extra.gacela',
  },
  pinguino: {
    id: 'pinguino',
    nameKey: 'animal.pinguino',
    emoji: '🐧',
    reactions: { pescado: 'come', piedra: 'especial', zanahoria: 'rechaza', pan: 'rechaza', calcetin: 'rechaza' },
    coins: { come: 6, especial: 9 },
    extraCost: 80,
    extraNameKey: 'shop.extra.pinguino',
  },
  oveja: {
    id: 'oveja',
    nameKey: 'animal.oveja',
    emoji: '🐑',
    reactions: { lechuga: 'come', maiz: 'come', gallina: 'especial', carne: 'rechaza', calcetin: 'rechaza' },
    coins: { come: 4, especial: 6 },
    extraCost: 40,
    extraNameKey: 'shop.extra.oveja',
  },
  caballo: {
    id: 'caballo',
    nameKey: 'animal.caballo',
    emoji: '🐴',
    reactions: { zanahoria: 'come', maiz: 'come', manzana: 'especial', huevo: 'rechaza', piedra: 'rechaza' },
    coins: { come: 5, especial: 8 },
    extraCost: 60,
    extraNameKey: 'shop.extra.caballo',
    radius: 11,
  },
  gallina: {
    id: 'gallina',
    nameKey: 'animal.gallina',
    emoji: '🐔',
    reactions: { maiz: 'come', lechuga: 'come', pan: 'especial', pescado: 'rechaza', piedra: 'rechaza' },
    coins: { come: 3, especial: 5 },
    extraCost: 30,
    extraNameKey: 'shop.extra.gallina',
  },
  gallo: {
    id: 'gallo',
    nameKey: 'animal.gallo',
    emoji: '🐓',
    reactions: { maiz: 'come', pan: 'come', huevo: 'rechaza', carne: 'rechaza', calcetin: 'rechaza' },
    coins: { come: 3 },
    extraCost: 30,
    extraNameKey: 'shop.extra.gallo',
  },
  pato: {
    id: 'pato',
    nameKey: 'animal.pato',
    emoji: '🦆',
    reactions: { maiz: 'come', lechuga: 'come', pescado: 'especial', pan: 'rechaza', piedra: 'rechaza' },
    coins: { come: 3, especial: 5 },
    extraCost: 30,
    extraNameKey: 'shop.extra.pato',
  },
  'elefante-africano': {
    id: 'elefante-africano',
    nameKey: 'animal.elefante-africano',
    emoji: '🐘',
    reactions: { lechuga: 'come', manzana: 'come', platano: 'especial', carne: 'rechaza', calcetin: 'rechaza' },
    coins: { come: 10, especial: 15 },
    extraCost: 200,
    extraNameKey: 'shop.extra.elefante-africano',
    radius: 18,
  },
  'elefante-asiatico': {
    id: 'elefante-asiatico',
    nameKey: 'animal.elefante-asiatico',
    emoji: '🐘',
    reactions: { lechuga: 'come', platano: 'come', manzana: 'especial', pescado: 'rechaza', piedra: 'rechaza' },
    coins: { come: 10, especial: 15 },
    extraCost: 200,
    extraNameKey: 'shop.extra.elefante-asiatico',
    radius: 18,
  },
};

export function isAnimalId(value: string): value is AnimalId {
  return (ANIMAL_IDS as readonly string[]).includes(value);
}

/** Comidas que se le ofrecen a la especie, en el orden de la bandeja. */
export function trayFoods(id: AnimalId): FoodId[] {
  return FOOD_IDS.filter((food) => ANIMALS[id].reactions[food] !== undefined);
}
