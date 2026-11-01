import { ANIMALS, type AnimalId } from '../data/animals';
import { PEN_IDS, PENS, nextResident, penCapacity, type PenId } from '../data/pens';
import { LUNA_COST, LUNA_ITEM_ID, extraItemId, shopItemForPen } from '../data/shop';
import { isPenOpen, penCount, type GameState } from './economy';

export type ShopEntryStatus = 'buy' | 'owned' | 'full';

interface EntryBase {
  id: string;
  /** Hoja de sprites que se dibuja en la peana: la del animal que llegaría (o la de Luna). */
  look: string;
  cost: number;
  status: ShopEntryStatus;
}

/** Artículo visible en la tienda: un recinto por abrir, "otro animal" para un recinto abierto, o Luna. */
export type ShopEntry =
  | (EntryBase & {
      kind: 'pen' | 'extra';
      penId: PenId;
      /** Especie que se dibuja en la peana: el animal que llegaría (o el último, si ya no cabe más). */
      species: AnimalId;
      /** Solo en extras: animales que hay y máximo del recinto. */
      count?: number;
      max?: number;
    })
  | (EntryBase & { kind: 'pet' });

/** Lo que puede ir en una peana: un recinto (su artículo) o Luna. */
export type StockId = PenId | typeof LUNA_ITEM_ID;

function lunaEntry(state: GameState): ShopEntry {
  return { id: LUNA_ITEM_ID, kind: 'pet', look: 'luna', cost: LUNA_COST, status: state.luna ? 'owned' : 'buy' };
}

function stockEntry(state: GameState, id: StockId): ShopEntry | null {
  return id === LUNA_ITEM_ID ? lunaEntry(state) : entryFor(state, id);
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
export function shopStock(state: GameState): StockId[] {
  const ids: StockId[] = [...PEN_IDS, LUNA_ITEM_ID];
  const entries = ids.flatMap((id) => {
    const entry = stockEntry(state, id);
    return entry ? [{ id, entry }] : [];
  });
  // `sort` es estable: a igual precio se queda el orden de los recintos.
  const buyable = entries.filter((e) => e.entry.status === 'buy').sort((a, b) => a.entry.cost - b.entry.cost).slice(0, SHOP_SLOTS);
  // Luna comprada no rellena huecos: va con la cuidadora, no en una peana con AGOTADO.
  const done = entries.filter((e) => e.entry.status !== 'buy' && e.entry.kind !== 'pet').slice(0, SHOP_SLOTS - buyable.length);
  return [...buyable, ...done].map((e) => e.id);
}

/**
 * Los artículos de las peanas. `stock` es lo que se puso al entrar en la tienda: mientras se está
 * dentro no cambia, así cada animal sigue en su peana aunque se compre. Si se completa, se queda ahí
 * con su sello AGOTADO en vez de dejar el sitio a otro (que se compraría sin querer con el mismo toque).
 * Lo siguiente sale en la próxima visita.
 */
export function shopEntries(state: GameState, stock: readonly StockId[] = shopStock(state)): ShopEntry[] {
  return stock.flatMap((id) => stockEntry(state, id) ?? []);
}
