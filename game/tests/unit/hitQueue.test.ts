import { describe, expect, it } from 'vitest';
import {
  BATCH_SIZE, CDT_AFTER_MS, ack, clearLost, emptyQueue, expire, maxAgeMs, oldestAge, parseQueue, push, stamp, takeBatch,
  type QueueState,
} from '../../src/core/hitQueue';

const T0 = Date.UTC(2026, 9, 7, 10, 0, 0);
const hit = (n: number, t = T0) => ({ q: `?n=${n}`, t });
const filled = (count: number): QueueState => Array.from({ length: count }, (_, i) => hit(i)).reduce((s, h) => push(s, h), emptyQueue());

describe('cola', () => {
  it('guarda en orden', () => {
    expect(filled(3).hits.map((h) => h.q)).toEqual(['?n=0', '?n=1', '?n=2']);
  });

  it('con el tope se descartan los más viejos y se cuentan', () => {
    const state = [hit(0), hit(1), hit(2)].reduce((s, h) => push(s, h, 2), emptyQueue());
    expect(state.hits.map((h) => h.q)).toEqual(['?n=1', '?n=2']);
    expect(state.lost).toEqual({ full: 1, expired: 0 });
  });

  it('lo caducado se descarta y se cuenta; si nada caduca devuelve la misma cola', () => {
    const state = [hit(0, T0 - 5000), hit(1, T0 - 1000)].reduce((s, h) => push(s, h), emptyQueue());
    const next = expire(state, T0, 2000);
    expect(next.hits.map((h) => h.q)).toEqual(['?n=1']);
    expect(next.lost).toEqual({ full: 0, expired: 1 });
    expect(expire(next, T0, 2000)).toBe(next);
  });

  it('un lote son los primeros 50 y confirmarlo los quita', () => {
    const state = filled(BATCH_SIZE + 5);
    const batch = takeBatch(state);
    expect(batch).toHaveLength(BATCH_SIZE);
    expect(ack(state, batch).hits.map((h) => h.q)).toEqual(['?n=50', '?n=51', '?n=52', '?n=53', '?n=54']);
  });

  it('borrar lo perdido deja los eventos', () => {
    const state = clearLost({ hits: [hit(0)], lost: { full: 3, expired: 2 } });
    expect(state).toEqual({ hits: [hit(0)], lost: { full: 0, expired: 0 } });
  });

  it('la edad del más viejo', () => {
    expect(oldestAge(emptyQueue(), T0)).toBeNull();
    expect(oldestAge(push(emptyQueue(), hit(0, T0 - 7000)), T0)).toBe(7000);
  });
});

describe('fecha real', () => {
  it('un evento reciente va sin fecha: usa la hora del servidor', () => {
    expect(stamp(hit(0, T0 - CDT_AFTER_MS), T0)).toBe('?n=0');
  });

  it('pasados cinco minutos lleva su fecha en UTC', () => {
    expect(stamp(hit(0, T0 - CDT_AFTER_MS - 1), T0)).toBe('?n=0&cdt=2026-10-07%2009%3A54%3A59');
  });

  it('con el reloj atrasado (edad negativa) va sin fecha', () => {
    expect(stamp(hit(0, T0 + 60_000), T0)).toBe('?n=0');
  });

  it('la ventana de reenvío nunca es menor que el margen sin fecha', () => {
    expect(maxAgeMs(23)).toBe(23 * 3_600_000);
    expect(maxAgeMs(0)).toBe(CDT_AFTER_MS);
  });
});

describe('guardado', () => {
  it('se lee lo que se guarda', () => {
    const state = { hits: [hit(0), hit(1)], lost: { full: 1, expired: 2 } };
    expect(parseQueue(JSON.stringify(state))).toEqual(state);
  });

  it.each([null, '', 'x', '{}', '{"hits":[{"q":1,"t":2}],"lost":{"full":0,"expired":0}}'])(
    'un valor ilegible (%s) es una cola vacía', (raw) => expect(parseQueue(raw)).toEqual(emptyQueue()));
});
