import { PEN_IDS, PENS, isPenId, type PenId } from './pens';

/** Monedas que hay que alcanzar (no gastar) para abrir la tienda. */
export const SHOP_UNLOCK_COINS = 20;

export interface ShopItemDef {
  id: string;
  penId: PenId;
  cost: number;
}

/** Un artículo por recinto con precio, en el orden de `PEN_IDS`. */
export const SHOP_ITEMS: readonly ShopItemDef[] = PEN_IDS.flatMap((penId) => {
  const cost = PENS[penId].cost;
  return cost === undefined ? [] : [{ id: penId, penId, cost }];
});

export function getShopItem(id: string): ShopItemDef | undefined {
  return SHOP_ITEMS.find((item) => item.id === id);
}

export function shopItemForPen(penId: PenId): ShopItemDef | undefined {
  return SHOP_ITEMS.find((item) => item.penId === penId);
}

const EXTRA_PREFIX = 'extra-';

/** Id del artículo "otro animal" de un recinto. */
export function extraItemId(penId: PenId): string {
  return `${EXTRA_PREFIX}${penId}`;
}

export function parseExtraItemId(itemId: string): PenId | null {
  if (!itemId.startsWith(EXTRA_PREFIX)) return null;
  const id = itemId.slice(EXTRA_PREFIX.length);
  return isPenId(id) ? id : null;
}
