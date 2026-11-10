import { PEN_IDS, isPenId, penCapacity, type PenId } from '../data/pens';
import { isLanguage, type Language } from '../systems/language';
import { emptyCare, sanitizeCare, type CareState } from './care';
import { initialCounts, initialState, type GameState } from './economy';

export interface KeyValueStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}

export interface Settings {
  music: boolean;
  sfx: boolean;
  joystick: boolean;
  /** Estadísticas anónimas. Apagarlas es la forma de oponerse a la medición. */
  stats: boolean;
  /** Idioma elegido en Ajustes. Ausente = automático: el del móvil. */
  language?: Language;
}

/** Los ajustes que son un interruptor de sí o no. */
export type ToggleKey = 'music' | 'sfx' | 'joystick' | 'stats';

/** v1: `unlocked: PenId[]`. v2: `counts` por recinto (animales extra). */
export const SAVE_VERSION = 2;

/** Libro del zoo: páginas ya leídas y si el tendero ya contó el secreto. Ids, nunca textos. */
export interface BookProgress {
  seen: string[];
  hinted: boolean;
  /** Página donde se quedó (se abre por ahí, como un libro de verdad). */
  page: string | null;
  /** Se ha abierto alguna vez: deja de estar a la vista en la tienda. */
  opened: boolean;
}

/** Qué avisos de aprender ya salieron (se aprendiera o se saltara): el de inicio, el de la limpieza y el de la clínica. */
export interface TutorialProgress {
  offered: boolean;
  cleanOffered: boolean;
  clinicOffered: boolean;
}

/**
 * Veces que se ha entrado en la tienda (el libro se enseña desde la 3.ª). Con alguna, el botón de la tienda lleva
 * andando a la cuidadora; sin ninguna, enseña las huellas de Luna hasta la puerta.
 */
export interface ShopProgress {
  visits: number;
}

/** ¿Ha entrado alguna vez en la tienda? */
export function shopVisited(shop: ShopProgress): boolean {
  return shop.visits > 0;
}

/** Veces que se ha entrado en la clínica: con alguna, sale su botón debajo del de la tienda. */
export interface ClinicProgress {
  visits: number;
}

/** ¿Ha entrado alguna vez en la clínica? */
export function clinicVisited(clinic: ClinicProgress): boolean {
  return clinic.visits > 0;
}

/** Sin dato (partidas de antes) o roto, ninguna visita. */
function parseClinic(raw: unknown): ClinicProgress {
  const visits = isObject(raw) ? raw.visits : undefined;
  return { visits: typeof visits === 'number' && Number.isInteger(visits) && visits >= 0 ? visits : 0 };
}

export interface SaveData {
  version: typeof SAVE_VERSION;
  state: GameState;
  settings: Settings;
  book: BookProgress;
  tutorial: TutorialProgress;
  shop: ShopProgress;
  clinic: ClinicProgress;
  /** Animales sucios o malitos y charcos de barro. Sin dato (partidas de antes), todo limpio y sano. */
  care: CareState;
}

export const SAVE_KEY = 'zooesponji_v3_save';
export const BACKUP_KEY = 'zooesponji_v3_save_backup';
export const LEGACY_COINS_KEY = 'zooesponji_coins';
export const LEGACY_PURCHASES_KEY = 'zooesponji_purchases';

type Loose = Record<string, unknown>;

function isObject(value: unknown): value is Loose {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Conteos válidos: enteros entre 0 y la capacidad del recinto; los recintos de inicio, al menos 1. */
function sanitizeCounts(raw: Partial<Record<PenId, unknown>>): Record<PenId, number> {
  const base = initialCounts();
  const counts = {} as Record<PenId, number>;
  for (const id of PEN_IDS) {
    const value = raw[id];
    const n = typeof value === 'number' && Number.isInteger(value) ? value : 0;
    counts[id] = Math.min(penCapacity(id), Math.max(base[id], n));
  }
  return counts;
}

function countsFromUnlocked(ids: readonly PenId[]): Record<PenId, number> {
  const raw: Partial<Record<PenId, number>> = {};
  for (const id of ids) raw[id] = 1;
  return sanitizeCounts(raw);
}

export function defaultSettings(): Settings {
  return { music: true, sfx: true, joystick: false, stats: true };
}

export function defaultBook(): BookProgress {
  return { seen: [], hinted: false, page: null, opened: false };
}

/** Partidas sin libro (anteriores a él): libro vacío, así brilla y se descubre. */
function parseBook(raw: unknown): BookProgress {
  if (!isObject(raw)) return defaultBook();
  const seen = Array.isArray(raw.seen) ? raw.seen.filter((id): id is string => typeof id === 'string') : [];
  // Partidas de antes del indicador: abierto si ya hay páginas leídas (`page` no vale: se pone sola al comprar).
  return { seen: [...new Set(seen)], hinted: raw.hinted === true, page: typeof raw.page === 'string' ? raw.page : null, opened: raw.opened === true || seen.length > 0 };
}

/** Sin dato (partidas de antes), el aviso está pendiente: sale una vez a todos. */
function parseTutorial(raw: unknown): TutorialProgress {
  const flag = (key: string): boolean => isObject(raw) && raw[key] === true;
  return { offered: flag('offered'), cleanOffered: flag('cleanOffered'), clinicOffered: flag('clinicOffered') };
}

/**
 * Partidas de antes de contar las visitas (2026-11-07): si ya compró algo (Luna o un animal más de los de
 * inicio) es que entró en la tienda, y cuenta como una visita.
 */
function parseShop(raw: unknown, state: Pick<GameState, 'luna' | 'counts'>): ShopProgress {
  const visits = isObject(raw) ? raw.visits : undefined;
  const counted = typeof visits === 'number' && Number.isInteger(visits) && visits >= 0 ? visits : 0;
  if (counted > 0) return { visits: counted };
  const base = initialCounts();
  const bought = state.luna || PEN_IDS.some((id) => state.counts[id] > base[id]);
  return { visits: bought ? 1 : 0 };
}

export function defaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
    state: initialState(),
    settings: defaultSettings(),
    book: defaultBook(),
    tutorial: { offered: false, cleanOffered: false, clinicOffered: false },
    shop: { visits: 0 },
    clinic: { visits: 0 },
    care: emptyCare(),
  };
}

export function parseSave(value: unknown): SaveData | null {
  if (!isObject(value) || (value.version !== 1 && value.version !== SAVE_VERSION)) return null;
  const state = value.state;
  if (!isObject(state)) return null;

  const coins = state.coins;
  if (typeof coins !== 'number' || !Number.isInteger(coins) || coins < 0) return null;

  let counts: Record<PenId, number>;
  if (value.version === 1) {
    // Migración: cada animal desbloqueado de la v1 pasa a tener 1 en su recinto.
    if (!Array.isArray(state.unlocked)) return null;
    counts = countsFromUnlocked(
      state.unlocked.filter((id): id is PenId => typeof id === 'string' && isPenId(id)),
    );
  } else {
    if (!isObject(state.counts)) return null;
    counts = sanitizeCounts(state.counts);
  }
  const rawSettings = isObject(value.settings) ? value.settings : {};
  const defaults = defaultSettings();
  const bool = (key: ToggleKey): boolean =>
    typeof rawSettings[key] === 'boolean' ? (rawSettings[key] as boolean) : defaults[key];
  // Cualquier otro valor se ignora: el idioma vuelve a ser automático.
  const language = isLanguage(rawSettings.language) ? rawSettings.language : undefined;

  const luna = state.luna === true;
  const clinic = state.clinic === true;
  return {
    version: SAVE_VERSION,
    // Desde el 2026-11-02 la tienda está abierta para todos, también en partidas de antes.
    state: { coins, counts, shopUnlocked: true, luna, clinic },
    settings: {
      music: bool('music'),
      sfx: bool('sfx'),
      joystick: bool('joystick'),
      stats: bool('stats'),
      ...(language ? { language } : {}),
    },
    book: parseBook(value.book),
    tutorial: parseTutorial(value.tutorial),
    shop: parseShop(value.shop, { luna, counts }),
    clinic: parseClinic(value.clinic),
    care: sanitizeCare(value.care, counts),
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
  const extra = PEN_IDS.filter((id) => bought[id] === true);

  return {
    version: SAVE_VERSION,
    state: {
      coins,
      counts: countsFromUnlocked(extra),
      shopUnlocked: true,
      luna: false,
      clinic: false,
    },
    settings: defaultSettings(),
    book: defaultBook(),
    tutorial: { offered: false, cleanOffered: false, clinicOffered: false },
    shop: { visits: 0 },
    clinic: { visits: 0 },
    care: emptyCare(),
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
