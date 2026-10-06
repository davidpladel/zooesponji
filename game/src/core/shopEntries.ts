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

/** El artículo de un recinto: el recinto mientras está cerrado y, abierto, su "otro animal". Null si no vende nada. */
function entryFor(state: GameState, penId: PenId): ShopEntry | null {
  const residents = PENS[penId].residents;
  const count = penCount(state, penId);
  const max = penCapacity(penId);
  const pen = shopItemForPen(penId);
  const first = residents[0]!;
  if (!isPenOpen(state, penId)) {
    return pen ? { id: pen.id, kind: 'pen', penId, species: first.species, look: first.look, cost: pen.cost, status: 'buy' } : null;
  }
  const coming = nextResident(penId, count) ?? residents[residents.length - 1]!;
  const cost = ANIMALS[coming.species].extraCost;
  if (max <= 1 || cost === undefined) {
    // Recinto de un solo animal ya comprado: no hay más que vender.
    return pen ? { id: pen.id, kind: 'pen', penId, species: first.species, look: first.look, cost: pen.cost, status: 'owned' } : null;
  }
  return { id: extraItemId(penId), kind: 'extra', penId, species: coming.species, look: coming.look, cost, status: count >= max ? 'full' : 'buy', count, max };
}

/**
 * Lo que la tienda pone en sus peanas al entrar: como mucho `SHOP_SLOTS` recintos, los de los artículos
 * más baratos que se pueden comprar (recintos por abrir y "otro animal" de los abiertos, mezclados), de
 * menor a mayor precio. Solo cuando quedan menos cosas que peanas, los recintos ya completos rellenan
 * los huecos, para que la tienda no se quede vacía.
 */
export function shopStock(state: GameState): PenId[] {
  const entries = PEN_IDS.flatMap((penId) => entryFor(state, penId) ?? []);
  // `sort` es estable: a igual precio se queda el orden de los recintos.
  const buyable = entries.filter((e) => e.status === 'buy').sort((a, b) => a.cost - b.cost).slice(0, SHOP_SLOTS);
  const done = entries.filter((e) => e.status !== 'buy').slice(0, SHOP_SLOTS - buyable.length);
  return [...buyable, ...done].map((e) => e.penId);
}

/**
 * Los artículos de las peanas. `stock` es lo que se puso al entrar en la tienda: mientras se está
 * dentro no cambia, así cada animal sigue en su peana aunque se compre. Si se completa, se queda ahí
 * con su sello AGOTADO en vez de dejar el sitio a otro (que se compraría sin querer con el mismo toque).
 * Lo siguiente sale en la próxima visita.
 */
export function shopEntries(state: GameState, stock: readonly PenId[] = shopStock(state)): ShopEntry[] {
  return stock.flatMap((penId) => entryFor(state, penId) ?? []);
}
