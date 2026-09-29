import type { StringKey } from './strings';

export const FOOD_IDS = ['piedra', 'carne', 'conejo', 'zanahoria'] as const;
export type FoodId = (typeof FOOD_IDS)[number];

export interface FoodDef {
  id: FoodId;
  nameKey: StringKey;
  emoji: string;
}

export const FOODS: Record<FoodId, FoodDef> = {
  piedra: { id: 'piedra', nameKey: 'food.piedra', emoji: '🪨' },
  carne: { id: 'carne', nameKey: 'food.carne', emoji: '🥩' },
  conejo: { id: 'conejo', nameKey: 'food.conejo', emoji: '🐇' },
  zanahoria: { id: 'zanahoria', nameKey: 'food.zanahoria', emoji: '🥕' },
};
