/** Reglas de ritmo de la publicidad. Lógica pura: ni reloj, ni almacén, ni Phaser. */

/** Segundos de juego en la partida antes del primer panel de la tienda. */
export const SESSION_MIN_S = 300;
/** Segundos de juego entre un panel resuelto (se viera el anuncio o no) y el siguiente. */
export const GAP_S = 900;
/** Segundos de juego en la partida antes del panel de la pausa. */
export const PAUSE_SESSION_S = 900;
/** Anuncios enseñados por día, como mucho. */
export const DAILY_MAX = 4;
/** Tras este rato en segundo plano empieza una partida nueva (la misma regla que las estadísticas). */
export const SESSION_GAP_S = 1800;

/** Clave propia en el almacén: no forma parte de la partida guardada ni de `SAVE_VERSION`. */
export const ADS_KEY = 'zooesponji_v3_ads';

export type AdSlot = 'tienda' | 'pausa';
export const AD_SLOTS: readonly AdSlot[] = ['tienda', 'pausa'];

/** Cómo acabó un panel: se enseñó un anuncio (entero o cortado), el niño tocó la X, o el anuncio no llegó a enseñarse. */
export type AdOutcome = 'shown' | 'declined' | 'failed';

export interface AdPacingState {
  /** Segundos de juego desde el último panel resuelto. `null`: nunca ha habido ninguno. */
  sinceLast: number | null;
  /** Día de la cuenta, `AAAA-MM-DD` en hora local. */
  day: string;
  /** Anuncios enseñados ese día. */
  shown: number;
}

/** Lo que solo vive en memoria, por partida. */
export interface AdSessionState {
  /** Segundos de juego en esta partida. */
  sessionPlay: number;
  /** Se ha enseñado algún anuncio en esta partida. */
  seenInSession: boolean;
  /** Ya saltó el panel de la pausa en esta partida. */
  pauseOffered: boolean;
}

export function emptyPacing(today: string): AdPacingState {
  return { sinceLast: null, day: today, shown: 0 };
}

export function newAdSession(): AdSessionState {
  return { sessionPlay: 0, seenInSession: false, pauseOffered: false };
}

/** La cuenta del día se pone a cero solo cuando hoy es posterior. Con el reloj hacia atrás no cambia nada. */
export function rollDay(state: AdPacingState, today: string): AdPacingState {
  return today > state.day ? { ...state, day: today, shown: 0 } : state;
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Lee el estado guardado. Lo ilegible se trata como «nunca ha habido ninguno». Nunca lanza. */
export function parsePacing(raw: string | null, today: string): AdPacingState {
  if (raw === null) return emptyPacing(today);
  try {
    const value = JSON.parse(raw) as { sinceLast?: unknown; day?: unknown; shown?: unknown } | null;
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return emptyPacing(today);
    const { sinceLast, day, shown } = value;
    const sinceOk = sinceLast === null || (typeof sinceLast === 'number' && Number.isFinite(sinceLast) && sinceLast >= 0);
    if (!sinceOk) return emptyPacing(today);
    if (typeof day !== 'string' || !DAY.test(day)) return emptyPacing(today);
    if (typeof shown !== 'number' || !Number.isInteger(shown) || shown < 0) return emptyPacing(today);
    return rollDay({ sinceLast: sinceLast as number | null, day, shown }, today);
  } catch {
    return emptyPacing(today);
  }
}

/** Pasan `seconds` de juego. */
export function tick(state: AdPacingState, session: AdSessionState, seconds: number): { state: AdPacingState; session: AdSessionState } {
  if (!(seconds > 0)) return { state, session };
  return {
    state: { ...state, sinceLast: state.sinceLast === null ? null : state.sinceLast + seconds },
    session: { ...session, sessionPlay: session.sessionPlay + seconds },
  };
}

/** Segundos de juego que faltan para que el panel pueda saltar. `Infinity`: ya no puede en esta partida o este día. */
export function secondsUntil(slot: AdSlot, state: AdPacingState, session: AdSessionState, today: string): number {
  const rolled = rollDay(state, today);
  if (rolled.shown >= DAILY_MAX) return Infinity;
  if (slot === 'pausa' && (session.seenInSession || session.pauseOffered)) return Infinity;
  const needed = slot === 'tienda' ? SESSION_MIN_S : PAUSE_SESSION_S;
  const gap = rolled.sinceLast === null ? 0 : GAP_S - rolled.sinceLast;
  return Math.max(0, needed - session.sessionPlay, gap);
}

export function canOffer(slot: AdSlot, state: AdPacingState, session: AdSessionState, today: string): boolean {
  return secondsUntil(slot, state, session, today) === 0;
}

/** Un panel se ha resuelto: empieza la espera, y cuenta en el día y en la partida según cómo acabó. */
export function resolvePanel(
  slot: AdSlot,
  outcome: AdOutcome,
  state: AdPacingState,
  session: AdSessionState,
  today: string,
): { state: AdPacingState; session: AdSessionState } {
  const rolled = rollDay(state, today);
  const shown = outcome === 'shown';
  return {
    state: { ...rolled, sinceLast: 0, shown: rolled.shown + (shown ? 1 : 0) },
    session: { ...session, seenInSession: session.seenInSession || shown, pauseOffered: session.pauseOffered || slot === 'pausa' },
  };
}
