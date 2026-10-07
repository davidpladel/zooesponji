/**
 * Usuarios activos sin identificar a nadie: el dispositivo sabe si hoy es su primera sesión del día,
 * de la semana o del mes, y lo avisa con una bandera. Contar banderas es contar jugadores.
 */
export type ReturnFlag = 'vuelve-d1' | 'vuelve-d7' | 'vuelve-d30';

/** Días desde el primero a partir de los cuales una sesión cuenta como «ha vuelto». */
const RETURNS: readonly (readonly [days: number, flag: ReturnFlag])[] = [[1, 'vuelve-d1'], [7, 'vuelve-d7'], [30, 'vuelve-d30']];

export interface ActivityState {
  /** Primer día de juego, `AAAA-MM-DD` en hora local. */
  firstDay: string;
  /** Último día con sesión. */
  lastDay: string;
  sessions: number;
  /** Retornos ya avisados: cada uno se envía una vez en la vida. */
  returned?: ReturnFlag[];
}

export type ActivityFlag = 'nuevo' | 'dia' | 'semana' | 'mes';

export const ACTIVITY_KEY = 'zooesponji_v3_activity';

const DAY_MS = 86_400_000;
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function dayKey(date: Date): string {
  const two = (n: number): string => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}`;
}

function toUtc(day: string): number {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, d);
}

/** El lunes de la semana de ese día: dos días son de la misma semana si comparten lunes. */
export function weekStart(day: string): number {
  const time = toUtc(day);
  const sinceMonday = (new Date(time).getUTCDay() + 6) % 7;
  return time - sinceMonday * DAY_MS;
}

export function daysBetween(from: string, to: string): number {
  return Math.round((toUtc(to) - toUtc(from)) / DAY_MS);
}

/** Semana ISO del día (`2026-S41`): agrupa a los jugadores que empezaron a la vez. */
export function cohortWeek(day: string): string {
  const thursday = weekStart(day) + 3 * DAY_MS;
  const year = new Date(thursday).getUTCFullYear();
  const week = Math.floor((thursday - Date.UTC(year, 0, 1)) / (7 * DAY_MS)) + 1;
  return `${year}-S${String(week).padStart(2, '0')}`;
}

export function parseActivity(raw: string | null): ActivityState | null {
  if (raw === null) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null) return null;
  const { firstDay, lastDay, sessions, returned } = value as Record<string, unknown>;
  if (typeof firstDay !== 'string' || !DAY_PATTERN.test(firstDay)) return null;
  if (typeof lastDay !== 'string' || !DAY_PATTERN.test(lastDay)) return null;
  if (typeof sessions !== 'number' || !Number.isInteger(sessions) || sessions < 1) return null;
  const known = Array.isArray(returned) ? RETURNS.map(([, flag]) => flag).filter((flag) => returned.includes(flag)) : [];
  return { firstDay, lastDay, sessions, ...(known.length > 0 ? { returned: known } : {}) };
}

export function nextActivity(
  prev: ActivityState | null,
  today: string,
): { state: ActivityState; flags: ActivityFlag[]; returns: ReturnFlag[] } {
  if (!prev) return { state: { firstDay: today, lastDay: today, sessions: 1 }, flags: ['nuevo', 'dia', 'semana', 'mes'], returns: [] };
  const sessions = prev.sessions + 1;
  // Mismo día, o el reloj del móvil ha ido hacia atrás: no cuenta otra vez.
  if (today <= prev.lastDay) return { state: { ...prev, sessions }, flags: [], returns: [] };
  const flags: ActivityFlag[] = ['dia'];
  if (weekStart(today) !== weekStart(prev.lastDay)) flags.push('semana');
  if (today.slice(0, 7) !== prev.lastDay.slice(0, 7)) flags.push('mes');
  const days = daysBetween(prev.firstDay, today);
  const already = prev.returned ?? [];
  const returns = RETURNS.filter(([min, flag]) => days >= min && !already.includes(flag)).map(([, flag]) => flag);
  const returned = [...already, ...returns];
  return {
    state: { firstDay: prev.firstDay, lastDay: today, sessions, ...(returned.length > 0 ? { returned } : {}) },
    flags,
    returns,
  };
}

/** Tramos en vez de números exactos: no distinguen a un jugador de otro. */
export function sessionBucket(sessions: number): string {
  if (sessions <= 1) return '1';
  if (sessions <= 5) return '2-5';
  if (sessions <= 20) return '6-20';
  return '21+';
}

export function ageBucket(firstDay: string, today: string): string {
  const days = daysBetween(firstDay, today);
  if (days <= 0) return 'd0';
  if (days === 1) return 'd1';
  if (days <= 6) return 'd2-6';
  if (days <= 29) return 'd7-29';
  return 'd30+';
}
