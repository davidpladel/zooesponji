import { ANIMAL_IDS, ANIMALS, type AnimalId } from '../data/animals';
import { SHOP_UNLOCK_COINS, getShopItem, parseExtraItemId } from '../data/shop';

export interface GameState {
  readonly coins: number;
  /** Animales en cada recinto (0 = recinto cerrado). */
  readonly counts: Readonly<Record<AnimalId, number>>;
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

export function initialCounts(): Record<AnimalId, number> {
  const counts = {} as Record<AnimalId, number>;
  for (const id of ANIMAL_IDS) counts[id] = ANIMALS[id].unlockedByDefault ? 1 : 0;
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

export function animalCount(state: GameState, id: AnimalId): number {
  return state.counts[id] ?? 0;
}

export function isAnimalUnlocked(state: GameState, id: AnimalId): boolean {
  return animalCount(state, id) > 0;
}

export function unlockedAnimals(state: GameState): AnimalId[] {
  return ANIMAL_IDS.filter((id) => isAnimalUnlocked(state, id));
}

function withCount(state: GameState, id: AnimalId, count: number, cost: number): GameState {
  return { ...state, coins: state.coins - cost, counts: { ...state.counts, [id]: count } };
}

/** Otro animal para un recinto ya abierto, hasta su máximo. */
export function buyExtra(state: GameState, id: AnimalId): PurchaseResult {
  const def = ANIMALS[id];
  if (!state.shopUnlocked) return { ok: false, error: 'shop-locked' };
  const count = animalCount(state, id);
  if (count === 0) return { ok: false, error: 'pen-closed' };
  if (count >= def.maxCount || def.extraCost === undefined) return { ok: false, error: 'pen-full' };
  if (state.coins < def.extraCost) return { ok: false, error: 'not-enough-coins' };
  return { ok: true, state: withCount(state, id, count + 1, def.extraCost) };
}

/** Compra un artículo de la tienda: un recinto (`pantera`) o un animal extra (`extra-cabra`). */
export function purchase(state: GameState, itemId: string): PurchaseResult {
  const extra = parseExtraItemId(itemId);
  if (extra) return buyExtra(state, extra);
  const item = getShopItem(itemId);
  if (!item) return { ok: false, error: 'unknown-item' };
  if (!state.shopUnlocked) return { ok: false, error: 'shop-locked' };
  if (isAnimalUnlocked(state, item.animalId)) return { ok: false, error: 'already-owned' };
  if (state.coins < item.cost) return { ok: false, error: 'not-enough-coins' };
  return { ok: true, state: withCount(state, item.animalId, 1, item.cost) };
}
