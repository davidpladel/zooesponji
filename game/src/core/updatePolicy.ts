/**
 * Cuándo avisar para actualizar el juego. Lógica pura: sin Phaser, sin Capacitor, sin red.
 * Los números son `versionCode` (enteros que siempre suben), nunca el nombre de la versión.
 */

export type UpdateKind = 'pequena' | 'grande' | 'rota';

/** La clave `actualizacion` del servidor. */
export interface UpdateKey {
  /** Por debajo de esta, la versión está rota: actualización obligatoria ya. */
  minima: number;
  /** La última publicada. */
  ultima: number;
  /** Con `true`, tras dos avisos suaves, la tercera vez es obligatoria. */
  grande: boolean;
}

/** Lo que recuerda el aparato, por cada valor de `ultima`. */
export interface UpdateMemory {
  ultima: number | null;
  /** Veces que el jugador ha dicho «luego» a esta `ultima`. */
  aplazadas: number;
  /** Último día (`AAAA-MM-DD`, del móvil) en que salió un aviso. */
  ultimoAviso: string | null;
}

export type UpdateDecision = { action: 'nada' } | { action: 'suave' | 'obligatoria'; kind: UpdateKind };

export const UPDATE_KEY = 'zooesponji_v3_update';

/** Pequeña: avisos suaves en total por cada `ultima`. */
export const MAX_SOFT_SMALL = 3;
/** Grande: avisos suaves antes de que el siguiente sea obligatorio. */
export const MAX_SOFT_BIG = 2;

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const isCode = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0;
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** `null`: no hay aviso (ausente o mal formada). */
export function parseUpdateKey(raw: unknown): UpdateKey | null {
  if (!isObject(raw) || !isCode(raw.minima) || !isCode(raw.ultima) || raw.ultima < raw.minima) return null;
  if (raw.grande !== undefined && typeof raw.grande !== 'boolean') return null;
  return { minima: raw.minima, ultima: raw.ultima, grande: raw.grande === true };
}

export function emptyUpdateMemory(): UpdateMemory {
  return { ultima: null, aplazadas: 0, ultimoAviso: null };
}

/** Nunca lanza: un guardado vacío, viejo o roto da los valores por defecto. */
export function parseUpdateMemory(raw: string | null): UpdateMemory {
  const memory = emptyUpdateMemory();
  if (!raw) return memory;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return memory;
  }
  if (!isObject(value)) return memory;
  if (isCode(value.ultima)) memory.ultima = value.ultima;
  if (isCode(value.aplazadas)) memory.aplazadas = value.aplazadas;
  if (typeof value.ultimoAviso === 'string' && DAY.test(value.ultimoAviso)) memory.ultimoAviso = value.ultimoAviso;
  return memory;
}

/** Lo aplazado vale solo para la `ultima` en la que se anotó: con otra (más nueva o más baja) se empieza de cero. */
function forKey(memory: UpdateMemory, key: UpdateKey): UpdateMemory {
  return memory.ultima === key.ultima ? memory : { ultima: key.ultima, aplazadas: 0, ultimoAviso: null };
}

export function decideUpdate(input: { code: number; key: UpdateKey | null; memory: UpdateMemory; today: string }): UpdateDecision {
  const { code, today } = input;
  const key = parseUpdateKey(input.key);
  if (!key || !Number.isInteger(code) || code <= 0) return { action: 'nada' };
  if (code < key.minima) return { action: 'obligatoria', kind: 'rota' };
  if (code >= key.ultima) return { action: 'nada' };
  const memory = forKey(input.memory, key);
  // Como mucho un aviso por día; con el reloj atrás (hoy anterior al último aviso) tampoco se vuelve a avisar.
  if (memory.ultimoAviso !== null && memory.ultimoAviso >= today) return { action: 'nada' };
  if (key.grande) {
    return memory.aplazadas >= MAX_SOFT_BIG ? { action: 'obligatoria', kind: 'grande' } : { action: 'suave', kind: 'grande' };
  }
  return memory.aplazadas >= MAX_SOFT_SMALL ? { action: 'nada' } : { action: 'suave', kind: 'pequena' };
}

/** Sale un aviso: se anota el día. */
export function afterOffer(memory: UpdateMemory, key: UpdateKey, today: string): UpdateMemory {
  return { ...forKey(memory, key), ultimoAviso: today };
}

/** El jugador dijo «luego» (o «atrás»). */
export function afterLater(memory: UpdateMemory, key: UpdateKey, today: string): UpdateMemory {
  const base = forKey(memory, key);
  return { ...base, aplazadas: base.aplazadas + 1, ultimoAviso: today };
}

/** Escenas que, abiertas, hacen que NO sea momento de molestar: el niño está haciendo algo. */
const BUSY = ['Feed', 'Clean', 'Cure', 'Clinic', 'Shop', 'Book', 'Board', 'Tutorial', 'TutorialOffer', 'Quit', 'Settings', 'AdOffer', 'PollNotice', 'UpdateNotice'];

/** Momento seguro: en el título, o en el mundo sin ventanas ni lecciones abiertas. */
export function isSafeMoment(active: readonly string[]): boolean {
  if (!active.includes('Title') && !active.includes('World')) return false;
  return !active.some((key) => BUSY.includes(key));
}
