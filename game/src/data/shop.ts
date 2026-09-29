import { isAnimalId, type AnimalId } from './animals';

/** Monedas que hay que alcanzar (no gastar) para abrir la tienda. */
export const SHOP_UNLOCK_COINS = 20;

export interface ShopItemDef {
  id: string;
  animalId: AnimalId;
  cost: number;
}

export const SHOP_ITEMS: readonly ShopItemDef[] = [
  { id: 'pantera', animalId: 'pantera', cost: 50 },
  { id: 'panda', animalId: 'panda', cost: 100 },
];

export function getShopItem(id: string): ShopItemDef | undefined {
  return SHOP_ITEMS.find((item) => item.id === id);
}

export function shopItemForAnimal(animalId: AnimalId): ShopItemDef | undefined {
  return SHOP_ITEMS.find((item) => item.animalId === animalId);
}

const EXTRA_PREFIX = 'extra-';

/** Id del artículo "otro animal" de un recinto. */
export function extraItemId(animalId: AnimalId): string {
  return `${EXTRA_PREFIX}${animalId}`;
}

export function parseExtraItemId(itemId: string): AnimalId | null {
  if (!itemId.startsWith(EXTRA_PREFIX)) return null;
  const id = itemId.slice(EXTRA_PREFIX.length);
  return isAnimalId(id) ? id : null;
}
