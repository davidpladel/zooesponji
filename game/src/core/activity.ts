/**
 * Usuarios activos sin identificar a nadie: el dispositivo sabe si hoy es su primera sesión del día,
 * de la semana o del mes, y lo avisa con una bandera. Contar banderas es contar jugadores.
 */
export interface ActivityState {
  /** Primer día de juego, `AAAA-MM-DD` en hora local. */
  firstDay: string;
  /** Último día con sesión. */
  lastDay: string;
  sessions: number;
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
function monday(day: string): number {
  const time = toUtc(day);
  const sinceMonday = (new Date(time).getUTCDay() + 6) % 7;
  return time - sinceMonday * DAY_MS;
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
  const { firstDay, lastDay, sessions } = value as Record<string, unknown>;
  if (typeof firstDay !== 'string' || !DAY_PATTERN.test(firstDay)) return null;
  if (typeof lastDay !== 'string' || !DAY_PATTERN.test(lastDay)) return null;
  if (typeof sessions !== 'number' || !Number.isInteger(sessions) || sessions < 1) return null;
  return { firstDay, lastDay, sessions };
}

export function nextActivity(prev: ActivityState | null, today: string): { state: ActivityState; flags: ActivityFlag[] } {
  if (!prev) return { state: { firstDay: today, lastDay: today, sessions: 1 }, flags: ['nuevo', 'dia', 'semana', 'mes'] };
  const sessions = prev.sessions + 1;
  // Mismo día, o el reloj del móvil ha ido hacia atrás: no cuenta otra vez.
  if (today <= prev.lastDay) return { state: { ...prev, sessions }, flags: [] };
  const flags: ActivityFlag[] = ['dia'];
  if (monday(today) !== monday(prev.lastDay)) flags.push('semana');
  if (today.slice(0, 7) !== prev.lastDay.slice(0, 7)) flags.push('mes');
  return { state: { firstDay: prev.firstDay, lastDay: today, sessions }, flags };
}

/** Tramos en vez de números exactos: no distinguen a un jugador de otro. */
export function sessionBucket(sessions: number): string {
  if (sessions <= 1) return '1';
  if (sessions <= 5) return '2-5';
  if (sessions <= 20) return '6-20';
  return '21+';
}

export function ageBucket(firstDay: string, today: string): string {
  const days = Math.round((toUtc(today) - toUtc(firstDay)) / DAY_MS);
  if (days <= 0) return 'd0';
  if (days === 1) return 'd1';
  if (days <= 6) return 'd2-6';
  if (days <= 29) return 'd7-29';
  return 'd30+';
}
