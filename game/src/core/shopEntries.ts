import { ANIMALS, type AnimalId } from '../data/animals';
import { PEN_IDS, PENS, nextResident, penCapacity, type PenId } from '../data/pens';
import { extraItemId, shopItemForPen } from '../data/shop';
import { isPenOpen, penCount, type GameState } from './economy';

export type ShopEntryStatus = 'buy' | 'owned' | 'full';

/** Artículo visible en la tienda: un recinto por abrir o "otro animal" para un recinto abierto. */
export interface ShopEntry {
  id: string;
  kind: 'pen' | 'extra';
  penId: PenId;
  /** Especie que se dibuja en la peana: el animal que llegaría (o el último, si ya no cabe más). */
  species: AnimalId;
  /** Hoja de sprites que se dibuja en la peana: la del animal que llegaría. */
  look: string;
  cost: number;
  status: ShopEntryStatus;
  /** Solo en extras: animales que hay y máximo del recinto. */
  count?: number;
  max?: number;
}

/**
 * Un artículo por recinto, como en las tiendas de otros juegos: el recinto mientras no se tenga y,
 * al comprarlo, su "otro animal" ocupa su sitio (así no quedan peanas "ya compradas" que confunden).
 */
export function shopEntries(state: GameState): ShopEntry[] {
  const entries: ShopEntry[] = [];
  for (const penId of PEN_IDS) {
    const residents = PENS[penId].residents;
    const open = isPenOpen(state, penId);
    const count = penCount(state, penId);
    const max = penCapacity(penId);
    const pen = shopItemForPen(penId);
    const coming = nextResident(penId, count) ?? residents[residents.length - 1]!;
    const extraCost = ANIMALS[coming.species].extraCost;
    const hasExtra = open && max > 1 && extraCost !== undefined;
    if (pen && !hasExtra) {
      entries.push({ id: pen.id, kind: 'pen', penId, species: residents[0]!.species, look: residents[0]!.look, cost: pen.cost, status: open ? 'owned' : 'buy' });
    }
    if (hasExtra && extraCost !== undefined) {
      entries.push({
        id: extraItemId(penId),
        kind: 'extra',
        penId,
        species: coming.species,
        look: coming.look,
        cost: extraCost,
        status: count >= max ? 'full' : 'buy',
        count,
        max,
      });
    }
  }
  return entries;
}
