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

/** Artículos que se enseñan a la vez: uno por peana. */
export const SHOP_SLOTS = 5;

/**
 * Lo que la tienda enseña: como mucho `SHOP_SLOTS` artículos, los más baratos que se pueden comprar
 * (recintos por abrir y "otro animal" de los abiertos, mezclados), de menor a mayor precio. Lo demás
 * va saliendo según se compra. Solo cuando quedan menos cosas que peanas, los recintos ya completos
 * rellenan los huecos con su sello AGOTADO, para que la tienda no se quede vacía.
 */
export function shopEntries(state: GameState): ShopEntry[] {
  const buyable: ShopEntry[] = [];
  const full: ShopEntry[] = [];
  for (const penId of PEN_IDS) {
    const residents = PENS[penId].residents;
    const count = penCount(state, penId);
    const max = penCapacity(penId);
    if (!isPenOpen(state, penId)) {
      const pen = shopItemForPen(penId);
      const first = residents[0]!;
      if (pen) buyable.push({ id: pen.id, kind: 'pen', penId, species: first.species, look: first.look, cost: pen.cost, status: 'buy' });
      continue;
    }
    const coming = nextResident(penId, count) ?? residents[residents.length - 1]!;
    const cost = ANIMALS[coming.species].extraCost;
    if (max <= 1 || cost === undefined) continue;
    const entry: ShopEntry = { id: extraItemId(penId), kind: 'extra', penId, species: coming.species, look: coming.look, cost, status: count >= max ? 'full' : 'buy', count, max };
    (entry.status === 'buy' ? buyable : full).push(entry);
  }
  // `sort` es estable: a igual precio se queda el orden de los recintos.
  const shown = buyable.sort((a, b) => a.cost - b.cost).slice(0, SHOP_SLOTS);
  return [...shown, ...full.slice(0, SHOP_SLOTS - shown.length)];
}
