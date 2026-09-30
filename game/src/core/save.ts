import { ANIMAL_IDS, ANIMALS, isAnimalId, type AnimalId } from '../data/animals';
import { SHOP_UNLOCK_COINS } from '../data/shop';
import { initialCounts, type GameState } from './economy';

export interface KeyValueStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}

export interface Settings {
  music: boolean;
  sfx: boolean;
  joystick: boolean;
}

/** v1: `unlocked: AnimalId[]`. v2: `counts` por recinto (animales extra). */
export const SAVE_VERSION = 2;

/** Libro del zoo: páginas ya leídas y si el tendero ya contó el secreto. Ids, nunca textos. */
export interface BookProgress {
  seen: string[];
  hinted: boolean;
  /** Página donde se quedó (se abre por ahí, como un libro de verdad). */
  page: string | null;
}

export interface SaveData {
  version: typeof SAVE_VERSION;
  state: GameState;
  settings: Settings;
  book: BookProgress;
}

export const SAVE_KEY = 'zooesponji_v3_save';
export const BACKUP_KEY = 'zooesponji_v3_save_backup';
export const LEGACY_COINS_KEY = 'zooesponji_coins';
export const LEGACY_PURCHASES_KEY = 'zooesponji_purchases';

type Loose = Record<string, unknown>;

function isObject(value: unknown): value is Loose {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Conteos válidos: enteros entre 0 y el máximo del recinto; los animales de inicio, al menos 1. */
function sanitizeCounts(raw: Partial<Record<AnimalId, unknown>>): Record<AnimalId, number> {
  const base = initialCounts();
  const counts = {} as Record<AnimalId, number>;
  for (const id of ANIMAL_IDS) {
    const value = raw[id];
    const n = typeof value === 'number' && Number.isInteger(value) ? value : 0;
    counts[id] = Math.min(ANIMALS[id].maxCount, Math.max(base[id], n));
  }
  return counts;
}

function countsFromUnlocked(ids: readonly AnimalId[]): Record<AnimalId, number> {
  const raw: Partial<Record<AnimalId, number>> = {};
  for (const id of ids) raw[id] = 1;
  return sanitizeCounts(raw);
}

export function defaultSettings(): Settings {
  return { music: true, sfx: true, joystick: false };
}

export function defaultBook(): BookProgress {
  return { seen: [], hinted: false, page: null };
}

/** Partidas sin libro (anteriores a él): libro vacío, así brilla y se descubre. */
function parseBook(raw: unknown): BookProgress {
  if (!isObject(raw)) return defaultBook();
  const seen = Array.isArray(raw.seen) ? raw.seen.filter((id): id is string => typeof id === 'string') : [];
  return { seen: [...new Set(seen)], hinted: raw.hinted === true, page: typeof raw.page === 'string' ? raw.page : null };
}

export function defaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
    state: { coins: 0, counts: initialCounts(), shopUnlocked: false },
    settings: defaultSettings(),
    book: defaultBook(),
  };
}

export function parseSave(value: unknown): SaveData | null {
  if (!isObject(value) || (value.version !== 1 && value.version !== SAVE_VERSION)) return null;
  const state = value.state;
  if (!isObject(state)) return null;

  const coins = state.coins;
  if (typeof coins !== 'number' || !Number.isInteger(coins) || coins < 0) return null;

  let counts: Record<AnimalId, number>;
  if (value.version === 1) {
    // Migración: cada animal desbloqueado de la v1 pasa a tener 1 en su recinto.
    if (!Array.isArray(state.unlocked)) return null;
    counts = countsFromUnlocked(
      state.unlocked.filter((id): id is AnimalId => typeof id === 'string' && isAnimalId(id)),
    );
  } else {
    if (!isObject(state.counts)) return null;
    counts = sanitizeCounts(state.counts);
  }
  const rawSettings = isObject(value.settings) ? value.settings : {};
  const defaults = defaultSettings();
  const bool = (key: keyof Settings): boolean =>
    typeof rawSettings[key] === 'boolean' ? (rawSettings[key] as boolean) : defaults[key];

  return {
    version: SAVE_VERSION,
    state: { coins, counts, shopUnlocked: state.shopUnlocked === true },
    settings: { music: bool('music'), sfx: bool('sfx'), joystick: bool('joystick') },
    book: parseBook(value.book),
  };
}

export function migrateLegacy(coinsRaw: string | null, purchasesRaw: string | null): SaveData | null {
  if (coinsRaw === null && purchasesRaw === null) return null;

  const parsedCoins = Number.parseInt(coinsRaw ?? '', 10);
  const coins = Number.isFinite(parsedCoins) && parsedCoins > 0 ? parsedCoins : 0;

  let purchases: unknown = null;
  try {
    purchases = purchasesRaw ? JSON.parse(purchasesRaw) : null;
  } catch {
    purchases = null;
  }
  const bought: Loose = isObject(purchases) ? purchases : {};
  const extra = ANIMAL_IDS.filter((id) => bought[id] === true);

  return {
    version: SAVE_VERSION,
    state: {
      coins,
      counts: countsFromUnlocked(extra),
      shopUnlocked: bought.shop === true || coins >= SHOP_UNLOCK_COINS,
    },
    settings: defaultSettings(),
    book: defaultBook(),
  };
}

export async function loadSave(store: KeyValueStore): Promise<SaveData> {
  const raw = await store.get(SAVE_KEY);
  if (raw !== null) {
    let parsed: SaveData | null = null;
    try {
      parsed = parseSave(JSON.parse(raw));
    } catch {
      parsed = null;
    }
    if (parsed) return parsed;
    await store.set(BACKUP_KEY, raw);
    return defaultSave();
  }
  const legacy = migrateLegacy(await store.get(LEGACY_COINS_KEY), await store.get(LEGACY_PURCHASES_KEY));
  return legacy ?? defaultSave();
}

export async function writeSave(store: KeyValueStore, data: SaveData): Promise<void> {
  await store.set(SAVE_KEY, JSON.stringify(data));
}
