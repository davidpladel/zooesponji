import { ANIMALS } from '../data/animals';
import { PEN_IDS, PENS, nextResident, type PenId } from '../data/pens';
import { LUNA_COST, LUNA_ITEM_ID, SHOP_ITEMS, SHOP_UNLOCK_COINS, getShopItem, parseExtraItemId } from '../data/shop';

export interface GameState {
  readonly coins: number;
  /** Residentes que han llegado a cada recinto (0 = recinto cerrado). */
  readonly counts: Readonly<Record<PenId, number>>;
  readonly shopUnlocked: boolean;
  /** La perrita de la cuidadora, comprada en la tienda. */
  readonly luna: boolean;
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

/** La tienda está abierta desde el principio (2026-11-02): así el tutorial puede llevar hasta ella. */
export function initialState(): GameState {
  return { coins: 0, counts: initialCounts(), shopUnlocked: true, luna: false };
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

/** Luna: se compra una vez y va con la cuidadora para siempre. */
function buyLuna(state: GameState): PurchaseResult {
  if (!state.shopUnlocked) return { ok: false, error: 'shop-locked' };
  if (state.luna) return { ok: false, error: 'already-owned' };
  if (state.coins < LUNA_COST) return { ok: false, error: 'not-enough-coins' };
  return { ok: true, state: { ...state, coins: state.coins - LUNA_COST, luna: true } };
}

/** Compra un artículo de la tienda: un recinto (`pantera`), un animal extra (`extra-cabra`) o a Luna. */
export function purchase(state: GameState, itemId: string): PurchaseResult {
  if (itemId === LUNA_ITEM_ID) return buyLuna(state);
  const extra = parseExtraItemId(itemId);
  if (extra) return buyExtra(state, extra);
  const item = getShopItem(itemId);
  if (!item) return { ok: false, error: 'unknown-item' };
  if (!state.shopUnlocked) return { ok: false, error: 'shop-locked' };
  if (isPenOpen(state, item.penId)) return { ok: false, error: 'already-owned' };
  if (state.coins < item.cost) return { ok: false, error: 'not-enough-coins' };
  return { ok: true, state: withCount(state, item.penId, 1, item.cost) };
}

const AD_REWARD_MIN = 10;

/**
 * Monedas por ver un anuncio: la décima parte del recinto más barato que queda por abrir, con un mínimo.
 * Con todo abierto, la décima parte del más caro. Así el premio crece con el zoo.
 */
export function adReward(state: GameState): number {
  const closed = SHOP_ITEMS.filter((item) => !isPenOpen(state, item.penId)).map((item) => item.cost);
  const base = closed.length > 0 ? Math.min(...closed) : Math.max(...SHOP_ITEMS.map((item) => item.cost));
  return Math.max(AD_REWARD_MIN, Math.round(base / 10));
}
