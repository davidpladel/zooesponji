import type { StringKey } from '../data/strings';
import type { ShopEntry } from './shopEntries';

export interface ShopLine {
  key: StringKey;
  params?: Record<string, number>;
}

/**
 * Lo que dice la tendera al mirar un animal de la tienda. Si no llega el dinero, en vez de la curiosidad del
 * animal dice cuántas monedas faltan y cómo se ganan (los jugadores no sabían de dónde sacarlas).
 */
export function shopkeeperLine(entry: ShopEntry, coins: number): ShopLine {
  if (entry.status === 'owned') return { key: 'shop.owned' };
  if (entry.status === 'full') return { key: 'shop.full' };
  if (coins < entry.cost) return { key: 'shop.needCoinsHow', params: { n: entry.cost - coins } };
  if (entry.kind === 'pet') return { key: 'shop.about.luna' };
  if (entry.kind === 'clinic') return { key: 'shop.about.clinic' };
  return { key: `shop.about.${entry.species}` as StringKey };
}
