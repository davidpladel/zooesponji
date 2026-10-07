// game/src/core/reach.ts
import { weekStart } from './activity';
import { STEPS, type ReachKind, type ReachScope, type Step } from './eventCatalog';

/**
 * Jugadores únicos sin identificar a nadie: el dispositivo recuerda qué ha hecho hoy, esta semana y
 * alguna vez, y avisa solo la primera. Contar avisos es contar jugadores.
 */
export interface ReachState {
  /** Día al que pertenece `today`, `AAAA-MM-DD` en hora local. */
  day: string;
  /** Lunes de la semana a la que pertenece `thisWeek`. */
  week: string;
  today: string[];
  thisWeek: string[];
  ever: string[];
  /** Pasos del embudo ya dados. */
  steps: Step[];
  /** Segundos de juego en primer plano desde la instalación. */
  playSeconds: number;
}

export const REACH_KEY = 'zooesponji_v3_reach';

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function emptyReach(today: string): ReachState {
  return { day: today, week: String(weekStart(today)), today: [], thisWeek: [], ever: [], steps: [], playSeconds: 0 };
}

function strings(value: unknown): string[] | null {
  return Array.isArray(value) && value.every((item) => typeof item === 'string') ? (value as string[]) : null;
}

export function parseReach(raw: string | null): ReachState | null {
  if (!raw) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  const today = strings(v.today);
  const thisWeek = strings(v.thisWeek);
  const ever = strings(v.ever);
  const steps = strings(v.steps);
  if (typeof v.day !== 'string' || !DAY_PATTERN.test(v.day) || typeof v.week !== 'string') return null;
  if (!today || !thisWeek || !ever || !steps) return null;
  if (typeof v.playSeconds !== 'number' || !Number.isFinite(v.playSeconds) || v.playSeconds < 0) return null;
  return {
    day: v.day,
    week: v.week,
    today,
    thisWeek,
    ever,
    steps: STEPS.filter((step) => steps.includes(step)),
    playSeconds: v.playSeconds,
  };
}

/** Día nuevo: se vacía lo de hoy; lunes nuevo: también lo de la semana. Con el reloj hacia atrás, nada. */
function roll(state: ReachState, today: string): ReachState {
  if (today <= state.day) return state;
  const week = String(weekStart(today));
  return { ...state, day: today, week, today: [], thisWeek: week === state.week ? state.thisWeek : [] };
}

export function markReach(state: ReachState, kind: ReachKind, id: string, today: string): { state: ReachState; scopes: ReachScope[] } {
  let next = roll(state, today);
  const key = `${kind}:${id}`;
  const scopes: ReachScope[] = [];
  if (!next.today.includes(key)) {
    scopes.push('dia');
    next = { ...next, today: [...next.today, key] };
  }
  if (!next.thisWeek.includes(key)) {
    scopes.push('semana');
    next = { ...next, thisWeek: [...next.thisWeek, key] };
  }
  if (!next.ever.includes(key)) {
    scopes.push('vida');
    next = { ...next, ever: [...next.ever, key] };
  }
  return { state: next, scopes };
}

export function markEver(state: ReachState, key: string): { state: ReachState; first: boolean } {
  if (state.ever.includes(key)) return { state, first: false };
  return { state: { ...state, ever: [...state.ever, key] }, first: true };
}

export function markStep(state: ReachState, step: Step): { state: ReachState; first: boolean } {
  if (state.steps.includes(step)) return { state, first: false };
  return { state: { ...state, steps: [...state.steps, step] }, first: true };
}

/** Pasos que ya estaban dados antes de empezar a medir: se apuntan sin avisar. */
export function seedSteps(state: ReachState, steps: readonly Step[]): ReachState {
  return { ...state, steps: STEPS.filter((step) => state.steps.includes(step) || steps.includes(step)) };
}

/** Un valor que no sea un número se guardaría como `null` y dejaría todo el estado ilegible: suma 0. */
export function addPlay(state: ReachState, seconds: number): ReachState {
  return { ...state, playSeconds: state.playSeconds + (Number.isFinite(seconds) ? Math.max(0, seconds) : 0) };
}
