import type { StringKey } from './strings';

/** En el orden en que salen en la bandeja. */
export const FOOD_IDS = [
  'piedra',
  'carne',
  'conejo',
  'gallina',
  'zanahoria',
  'lechuga',
  'maiz',
  'manzana',
  'platano',
  'pan',
  'huevo',
  'pescado',
  'calcetin',
] as const;
export type FoodId = (typeof FOOD_IDS)[number];

export interface FoodDef {
  id: FoodId;
  nameKey: StringKey;
  emoji: string;
  /** No se come: si es la reacción especial de un animal, se hace su amigo. */
  friend?: boolean;
}

export const FOODS: Record<FoodId, FoodDef> = {
  piedra: { id: 'piedra', nameKey: 'food.piedra', emoji: '🪨' },
  carne: { id: 'carne', nameKey: 'food.carne', emoji: '🥩' },
  conejo: { id: 'conejo', nameKey: 'food.conejo', emoji: '🐇', friend: true },
  gallina: { id: 'gallina', nameKey: 'food.gallina', emoji: '🐔', friend: true },
  zanahoria: { id: 'zanahoria', nameKey: 'food.zanahoria', emoji: '🥕' },
  lechuga: { id: 'lechuga', nameKey: 'food.lechuga', emoji: '🥬' },
  maiz: { id: 'maiz', nameKey: 'food.maiz', emoji: '🌽' },
  manzana: { id: 'manzana', nameKey: 'food.manzana', emoji: '🍎' },
  platano: { id: 'platano', nameKey: 'food.platano', emoji: '🍌' },
  pan: { id: 'pan', nameKey: 'food.pan', emoji: '🍞' },
  huevo: { id: 'huevo', nameKey: 'food.huevo', emoji: '🥚' },
  pescado: { id: 'pescado', nameKey: 'food.pescado', emoji: '🐟' },
  /** Cosa rara: no es comida. */
  calcetin: { id: 'calcetin', nameKey: 'food.calcetin', emoji: '🧦' },
};
