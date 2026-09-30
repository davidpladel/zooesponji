import { ANIMAL_IDS, ANIMALS, type AnimalId } from '../data/animals';
import { extraItemId, shopItemForAnimal } from '../data/shop';
import { animalCount, isAnimalUnlocked, type GameState } from './economy';

export type ShopEntryStatus = 'buy' | 'owned' | 'full';

/** Artículo visible en la tienda: un recinto por abrir o "otro animal" para un recinto abierto. */
export interface ShopEntry {
  id: string;
  kind: 'pen' | 'extra';
  animalId: AnimalId;
  cost: number;
  status: ShopEntryStatus;
  /** Solo en extras: animales que hay y máximo del recinto. */
  count?: number;
  max?: number;
}

/**
 * Un artículo por animal, como en las tiendas de otros juegos: el recinto mientras no se tenga y,
 * al comprarlo, su "otro animal" ocupa su sitio (así no quedan peanas "ya compradas" que confunden).
 */
export function shopEntries(state: GameState): ShopEntry[] {
  const entries: ShopEntry[] = [];
  for (const animalId of ANIMAL_IDS) {
    const def = ANIMALS[animalId];
    const unlocked = isAnimalUnlocked(state, animalId);
    const pen = shopItemForAnimal(animalId);
    const hasExtra = unlocked && def.maxCount > 1 && def.extraCost !== undefined;
    if (pen && !hasExtra) entries.push({ id: pen.id, kind: 'pen', animalId, cost: pen.cost, status: unlocked ? 'owned' : 'buy' });
    if (hasExtra && def.extraCost !== undefined) {
      const count = animalCount(state, animalId);
      entries.push({
        id: extraItemId(animalId),
        kind: 'extra',
        animalId,
        cost: def.extraCost,
        status: count >= def.maxCount ? 'full' : 'buy',
        count,
        max: def.maxCount,
      });
    }
  }
  return entries;
}
