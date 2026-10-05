import { ANIMALS, type AnimalId, type Reaction } from '../data/animals';
import type { FoodId } from '../data/foods';

export interface FeedResult {
  reaction: Reaction;
  coins: number;
}

/** `animalId` es la especie. Una comida que la especie no lista se rechaza. */
export function resolveFeeding(animalId: AnimalId, foodId: FoodId): FeedResult {
  const animal = ANIMALS[animalId];
  const reaction = animal.reactions[foodId] ?? 'rechaza';
  if (reaction === 'rechaza') return { reaction, coins: 0 };
  return { reaction, coins: animal.coins[reaction] ?? 0 };
}
