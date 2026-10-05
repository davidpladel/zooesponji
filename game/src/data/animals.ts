import { FOOD_IDS, type FoodId } from './foods';
import type { StringKey } from './strings';

export const ANIMAL_IDS = ['leon', 'cabra', 'pantera', 'panda'] as const;
export type AnimalId = (typeof ANIMAL_IDS)[number];

export type Reaction = 'come' | 'rechaza' | 'especial';

export interface AnimalDef {
  id: AnimalId;
  nameKey: StringKey;
  emoji: string;
  /** Solo las comidas que salen en su bandeja. */
  reactions: Partial<Record<FoodId, Reaction>>;
  coins: { come: number; especial?: number };
  unlockedByDefault: boolean;
  /** Animales que caben en el recinto (sin contar acompañantes como la leona). */
  maxCount: number;
  /** Precio de cada animal extra en la tienda (sin extras si maxCount es 1). */
  extraCost?: number;
  /** Texto del artículo extra ("Otra cabra"). */
  extraNameKey?: StringKey;
}

export const ANIMALS: Record<AnimalId, AnimalDef> = {
  leon: {
    id: 'leon',
    nameKey: 'animal.leon',
    emoji: '🦁',
    reactions: { carne: 'come', conejo: 'come', piedra: 'rechaza', zanahoria: 'rechaza' },
    coins: { come: 1 },
    unlockedByDefault: true,
    maxCount: 1,
  },
  cabra: {
    id: 'cabra',
    nameKey: 'animal.cabra',
    emoji: '🐐',
    reactions: { carne: 'rechaza', conejo: 'especial', piedra: 'come', zanahoria: 'come' },
    coins: { come: 1, especial: 2 },
    unlockedByDefault: true,
    maxCount: 5,
    extraCost: 10,
    extraNameKey: 'shop.extra.cabra',
  },
  pantera: {
    id: 'pantera',
    nameKey: 'animal.pantera',
    emoji: '🐆',
    reactions: { carne: 'come', conejo: 'come', piedra: 'rechaza', zanahoria: 'rechaza' },
    coins: { come: 2 },
    unlockedByDefault: false,
    maxCount: 2,
    extraCost: 20,
    extraNameKey: 'shop.extra.pantera',
  },
  panda: {
    id: 'panda',
    nameKey: 'animal.panda',
    emoji: '🐼',
    reactions: { carne: 'rechaza', conejo: 'especial', piedra: 'rechaza', zanahoria: 'come' },
    coins: { come: 2, especial: 4 },
    unlockedByDefault: false,
    maxCount: 2,
    extraCost: 20,
    extraNameKey: 'shop.extra.panda',
  },
};

export function isAnimalId(value: string): value is AnimalId {
  return (ANIMAL_IDS as readonly string[]).includes(value);
}

/** Comidas que se le ofrecen a la especie, en el orden de la bandeja. */
export function trayFoods(id: AnimalId): FoodId[] {
  return FOOD_IDS.filter((food) => ANIMALS[id].reactions[food] !== undefined);
}
