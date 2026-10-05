import { ANIMALS } from '../data/animals';
import { PEN_IDS, PENS, nextResident, type PenId } from '../data/pens';
import { SHOP_UNLOCK_COINS, getShopItem, parseExtraItemId } from '../data/shop';

export interface GameState {
  readonly coins: number;
  /** Residentes que han llegado a cada recinto (0 = recinto cerrado). */
  readonly counts: Readonly<Record<PenId, number>>;
  readonly shopUnlocked: boolean;
}

export type PurchaseError =
  | 'unknown-item'
  | 'shop-locked'
  | 'already-owned'
  | 'not-enough-coins'
  | 'pen-closed'
  | 'pen-full';
export type PurchaseResult = { ok: true; state: GameState } | { ok: false; error: PurchaseError };

export function initialCounts(): Record<PenId, number> {
  const counts = {} as Record<PenId, number>;
  for (const id of PEN_IDS) counts[id] = PENS[id].cost === undefined ? 1 : 0;
  return counts;
}

export function initialState(): GameState {
  return { coins: 0, counts: initialCounts(), shopUnlocked: false };
}

export function addCoins(state: GameState, amount: number): GameState {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new Error(`Cantidad de monedas no válida: ${amount}`);
  }
  const coins = state.coins + amount;
  return { ...state, coins, shopUnlocked: state.shopUnlocked || coins >= SHOP_UNLOCK_COINS };
}

export function penCount(state: GameState, id: PenId): number {
  return state.counts[id] ?? 0;
}

export function isPenOpen(state: GameState, id: PenId): boolean {
  return penCount(state, id) > 0;
}

export function openPens(state: GameState): PenId[] {
  return PEN_IDS.filter((id) => isPenOpen(state, id));
}

function withCount(state: GameState, id: PenId, count: number, cost: number): GameState {
  return { ...state, coins: state.coins - cost, counts: { ...state.counts, [id]: count } };
}

/** El siguiente residente de un recinto ya abierto. Su precio lo marca su especie. */
export function buyExtra(state: GameState, id: PenId): PurchaseResult {
  if (!state.shopUnlocked) return { ok: false, error: 'shop-locked' };
  const count = penCount(state, id);
  if (count === 0) return { ok: false, error: 'pen-closed' };
  const next = nextResident(id, count);
  const cost = next ? ANIMALS[next.species].extraCost : undefined;
  if (!next || cost === undefined) return { ok: false, error: 'pen-full' };
  if (state.coins < cost) return { ok: false, error: 'not-enough-coins' };
  return { ok: true, state: withCount(state, id, count + 1, cost) };
}

/** Compra un artículo de la tienda: un recinto (`pantera`) o un animal extra (`extra-cabra`). */
export function purchase(state: GameState, itemId: string): PurchaseResult {
  const extra = parseExtraItemId(itemId);
  if (extra) return buyExtra(state, extra);
  const item = getShopItem(itemId);
  if (!item) return { ok: false, error: 'unknown-item' };
  if (!state.shopUnlocked) return { ok: false, error: 'shop-locked' };
  if (isPenOpen(state, item.penId)) return { ok: false, error: 'already-owned' };
  if (state.coins < item.cost) return { ok: false, error: 'not-enough-coins' };
  return { ok: true, state: withCount(state, item.penId, 1, item.cost) };
}
