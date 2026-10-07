import { cdtParam } from './matomoRequest';

/** Un evento listo para enviar y el instante en que ocurrió. */
export interface StoredHit {
  q: string;
  t: number;
}

/** Lo que espera a enviarse y lo que se ha tenido que tirar desde el último envío con éxito. */
export interface QueueState {
  hits: StoredHit[];
  lost: { full: number; expired: number };
}

export const QUEUE_KEY = 'zooesponji_v3_stats_queue';
export const QUEUE_LIMIT = 1000;
export const BATCH_SIZE = 50;
/** Hasta esta edad el evento va sin fecha y usa la hora del servidor, que no depende del reloj del móvil. */
export const CDT_AFTER_MS = 5 * 60 * 1000;

export function emptyQueue(): QueueState {
  return { hits: [], lost: { full: 0, expired: 0 } };
}

const count = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0;

export function parseQueue(raw: string | null): QueueState {
  if (!raw) return emptyQueue();
  try {
    const value = JSON.parse(raw) as { hits?: unknown; lost?: { full?: unknown; expired?: unknown } };
    const hits = value.hits;
    const lost = value.lost;
    if (!Array.isArray(hits) || !lost || !count(lost.full) || !count(lost.expired)) return emptyQueue();
    const valid = hits.every((h: unknown) => {
      const hit = h as Partial<StoredHit> | null;
      return typeof hit?.q === 'string' && typeof hit.t === 'number' && Number.isFinite(hit.t);
    });
    if (!valid) return emptyQueue();
    return { hits: (hits as StoredHit[]).map(({ q, t }) => ({ q, t })), lost: { full: lost.full, expired: lost.expired } };
  } catch {
    return emptyQueue();
  }
}

export function push(state: QueueState, hit: StoredHit, limit = QUEUE_LIMIT): QueueState {
  const hits = [...state.hits, hit];
  const over = Math.max(0, hits.length - limit);
  return { hits: over > 0 ? hits.slice(over) : hits, lost: { ...state.lost, full: state.lost.full + over } };
}

/** Matomo no acepta sin token fechas más viejas que su ventana: esos eventos se tiran y se cuentan. */
export function expire(state: QueueState, now: number, maxAge: number): QueueState {
  const hits = state.hits.filter((hit) => now - hit.t <= maxAge);
  const gone = state.hits.length - hits.length;
  return gone === 0 ? state : { hits, lost: { ...state.lost, expired: state.lost.expired + gone } };
}

export function takeBatch(state: QueueState, size = BATCH_SIZE): StoredHit[] {
  return state.hits.slice(0, size);
}

/** Quita un lote ya entregado. Cada consulta lleva un `rand` distinto: sirve de identidad. */
export function ack(state: QueueState, batch: readonly StoredHit[]): QueueState {
  const sent = new Set(batch.map((hit) => hit.q));
  return { ...state, hits: state.hits.filter((hit) => !sent.has(hit.q)) };
}

export function clearLost(state: QueueState): QueueState {
  return { ...state, lost: { full: 0, expired: 0 } };
}

export function stamp(hit: StoredHit, now: number): string {
  return now - hit.t > CDT_AFTER_MS ? hit.q + cdtParam(hit.t) : hit.q;
}

export function oldestAge(state: QueueState, now: number): number | null {
  const first = state.hits[0];
  return first ? Math.max(0, now - first.t) : null;
}

export function maxAgeMs(replayHours: number): number {
  return Math.max(replayHours * 3_600_000, CDT_AFTER_MS);
}
