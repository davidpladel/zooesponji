/** Cuándo pedir la valoración en Google Play. Lógica pura: ni reloj, ni almacén, ni Phaser. Nunca lanza. */
import { daysBetween } from './activity';

/** Clave propia en el almacén: no forma parte de la partida guardada ni de `SAVE_VERSION`. No se envía a ningún sitio. */
export const REVIEW_KEY = 'zooesponji_v3_review';
/** Segundos de juego acumulados antes de la primera petición. */
export const PLAY_MIN_S = 600;
/** Días entre la primera petición y la segunda (Google pone una cuota de más o menos un mes). */
export const SECOND_WAIT_DAYS = 30;
/** Segundos de juego desde la primera petición antes de la segunda. */
export const SECOND_PLAY_S = 600;
/** Peticiones en la vida de la instalación, como mucho. */
export const MAX_ATTEMPTS = 2;
/** Si no llega una pausa natural, a los tantos segundos de juego cumpliendo vale cualquier momento tranquilo. */
export const CALM_WAIT_S = 300;
/** Segundos de juego sin votación, aviso de ganadora ni de actualización. */
export const NOTICE_QUIET_S = 600;
/** Segundos de juego sin panel de anuncio. */
export const AD_QUIET_S = 180;
/** Una suma mayor que esta es un salto del reloj: se ignora. */
export const MAX_TICK_S = 60;

export interface ReviewMemory {
  /** Segundos de juego acumulados desde que se instaló la versión con la valoración. */
  playSeconds: number;
  /** Veces que se ha llamado a la API (0, 1 o 2). */
  attempts: number;
  /** Día del último intento, `AAAA-MM-DD` en hora local. */
  lastAttemptDay: string | null;
  /** `playSeconds` en el último intento. */
  playAtAttempt: number | null;
}

/** Lo del momento: lo que mira el mapa y lo que lleva esta partida. */
export interface ReviewMoment {
  boughtAnimal: boolean;
  /** El tutorial ya se ofreció, no hay ninguno en marcha ni lecciones por ofrecer. */
  tutorialReady: boolean;
  /** Hay otro panel abierto (anuncio, votación, aviso de actualización…). */
  panelOpen: boolean;
  /** Pausa natural: se vuelve de dar de comer, limpiar o la tienda. */
  natural: boolean;
  /** Segundos de juego que lleva cumpliendo las condiciones en esta partida. */
  dueFor: number;
  /** Segundos de juego desde el último aviso destacado de esta partida. `null`: ninguno. */
  sinceNotice: number | null;
  /** Segundos de juego desde el último panel de anuncio de esta partida. `null`: ninguno. */
  sinceAd: number | null;
  today: string;
}

export function emptyReview(): ReviewMemory {
  return { playSeconds: 0, attempts: 0, lastAttemptDay: null, playAtAttempt: null };
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const seconds = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;

/** Lee lo guardado. Lo ilegible se trata como vacío. Nunca lanza. */
export function parseReview(raw: string | null): ReviewMemory {
  if (raw === null) return emptyReview();
  try {
    const value = JSON.parse(raw) as Record<string, unknown> | null;
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return emptyReview();
    const { playSeconds, attempts, lastAttemptDay, playAtAttempt } = value;
    if (!seconds(playSeconds)) return emptyReview();
    if (typeof attempts !== 'number' || !Number.isInteger(attempts) || attempts < 0 || attempts > MAX_ATTEMPTS) return emptyReview();
    if (lastAttemptDay !== null && (typeof lastAttemptDay !== 'string' || !DAY.test(lastAttemptDay))) return emptyReview();
    if (playAtAttempt !== null && !seconds(playAtAttempt)) return emptyReview();
    return { playSeconds, attempts, lastAttemptDay, playAtAttempt };
  } catch {
    return emptyReview();
  }
}

/** Pasan `secs` de juego. Lo raro (cero, negativo, infinito o un salto de reloj) no suma. */
export function addPlay(m: ReviewMemory, secs: number): ReviewMemory {
  if (!(secs > 0) || secs > MAX_TICK_S) return m;
  return { ...m, playSeconds: m.playSeconds + secs };
}

export function markAttempt(m: ReviewMemory, today: string): ReviewMemory {
  return { ...m, attempts: m.attempts + 1, lastAttemptDay: today, playAtAttempt: m.playSeconds };
}

/** Las condiciones de juego y de veces, sin mirar el momento. */
export function isDue(m: ReviewMemory, boughtAnimal: boolean, today: string): boolean {
  if (!boughtAnimal || m.attempts >= MAX_ATTEMPTS) return false;
  if (m.attempts === 0) return m.playSeconds >= PLAY_MIN_S;
  if (m.lastAttemptDay === null || m.playAtAttempt === null) return false;
  return daysBetween(m.lastAttemptDay, today) >= SECOND_WAIT_DAYS && m.playSeconds - m.playAtAttempt >= SECOND_PLAY_S;
}

/** ¿Toca pedirla ahora? */
export function shouldRequest(m: ReviewMemory, at: ReviewMoment): boolean {
  if (!isDue(m, at.boughtAnimal, at.today)) return false;
  if (!at.tutorialReady || at.panelOpen) return false;
  if (at.sinceNotice !== null && at.sinceNotice < NOTICE_QUIET_S) return false;
  if (at.sinceAd !== null && at.sinceAd < AD_QUIET_S) return false;
  return at.natural || at.dueFor >= CALM_WAIT_S;
}
