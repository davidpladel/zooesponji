import { describe, expect, it } from 'vitest';
import {
  AD_QUIET_S, CALM_WAIT_S, MAX_ATTEMPTS, MAX_TICK_S, NOTICE_QUIET_S, PLAY_MIN_S, REVIEW_KEY, SECOND_PLAY_S, SECOND_WAIT_DAYS,
  addPlay, emptyReview, isDue, markAttempt, parseReview, shouldRequest, type ReviewMemory, type ReviewMoment,
} from '../../src/core/reviewPrompt';

const mem = (extra: Partial<ReviewMemory> = {}): ReviewMemory => ({ ...emptyReview(), ...extra });
const moment = (extra: Partial<ReviewMoment> = {}): ReviewMoment => ({
  boughtAnimal: true, tutorialReady: true, panelOpen: false, natural: true, dueFor: 0, sinceNotice: null, sinceAd: null, today: '2026-11-21', ...extra,
});

describe('constantes', () => {
  it('son las de la spec', () => {
    expect(REVIEW_KEY).toBe('zooesponji_v3_review');
    expect([PLAY_MIN_S, SECOND_WAIT_DAYS, SECOND_PLAY_S, MAX_ATTEMPTS, CALM_WAIT_S, NOTICE_QUIET_S, AD_QUIET_S, MAX_TICK_S]).toEqual([600, 30, 600, 2, 300, 600, 180, 60]);
  });
});

describe('parseReview', () => {
  it('sin clave: vacía', () => {
    expect(parseReview(null)).toEqual({ playSeconds: 0, attempts: 0, lastAttemptDay: null, playAtAttempt: null });
  });

  it.each([
    '{', '[]', 'null', '7',
    JSON.stringify({ playSeconds: -1, attempts: 0, lastAttemptDay: null, playAtAttempt: null }),
    JSON.stringify({ playSeconds: '5', attempts: 0, lastAttemptDay: null, playAtAttempt: null }),
    JSON.stringify({ playSeconds: 5, attempts: 3, lastAttemptDay: '2026-11-21', playAtAttempt: 5 }),
    JSON.stringify({ playSeconds: 5, attempts: 1.5, lastAttemptDay: '2026-11-21', playAtAttempt: 5 }),
    JSON.stringify({ playSeconds: 5, attempts: 1, lastAttemptDay: '21-11-2026', playAtAttempt: 5 }),
    JSON.stringify({ playSeconds: 5, attempts: 1, lastAttemptDay: '2026-11-21', playAtAttempt: -2 }),
    '{"playSeconds":1e999,"attempts":0,"lastAttemptDay":null,"playAtAttempt":null}',
  ])('mala (%s): vacía, sin lanzar', (raw) => {
    expect(parseReview(raw)).toEqual(emptyReview());
  });

  it('buena: se lee igual', () => {
    const good = { playSeconds: 700, attempts: 1, lastAttemptDay: '2026-11-01', playAtAttempt: 650 };
    expect(parseReview(JSON.stringify(good))).toEqual(good);
  });
});

describe('addPlay', () => {
  it('suma los segundos de juego', () => {
    expect(addPlay(mem({ playSeconds: 10 }), 1).playSeconds).toBe(11);
    expect(addPlay(mem(), MAX_TICK_S).playSeconds).toBe(60);
  });

  it.each([0, -5, Number.NaN, Number.POSITIVE_INFINITY, 61])('ignora %s (salto de reloj o valor raro)', (s) => {
    expect(addPlay(mem({ playSeconds: 10 }), s).playSeconds).toBe(10);
  });
});

describe('markAttempt', () => {
  it('apunta el intento, el día y el juego que había', () => {
    expect(markAttempt(mem({ playSeconds: 640 }), '2026-11-21')).toEqual({ playSeconds: 640, attempts: 1, lastAttemptDay: '2026-11-21', playAtAttempt: 640 });
  });
});

describe('isDue: primera vez', () => {
  it('9 min 59 s con animal: no; 10 min con animal: sí', () => {
    expect(isDue(mem({ playSeconds: 599 }), true, '2026-11-21')).toBe(false);
    expect(isDue(mem({ playSeconds: 600 }), true, '2026-11-21')).toBe(true);
  });

  it('sin animal comprado: no, aunque juegue mucho', () => {
    expect(isDue(mem({ playSeconds: 600 }), false, '2026-11-21')).toBe(false);
    expect(isDue(mem({ playSeconds: 3000 }), false, '2026-11-21')).toBe(false);
  });
});

describe('isDue: segunda vez y última', () => {
  const after = (extra: number) => mem({ playSeconds: 650 + extra, attempts: 1, lastAttemptDay: '2026-11-01', playAtAttempt: 650 });

  it('a los 29 días: no', () => {
    expect(isDue(after(600), true, '2026-11-30')).toBe(false);
  });

  it('a los 30 días pero sin otros 10 min: no', () => {
    expect(isDue(after(599), true, '2026-12-01')).toBe(false);
  });

  it('a los 30 días y con otros 10 min: sí', () => {
    expect(isDue(after(600), true, '2026-12-01')).toBe(true);
  });

  it('reloj hacia atrás (fecha anterior al intento): no', () => {
    expect(isDue(after(5000), true, '2026-10-31')).toBe(false);
  });

  it('con 2 intentos: nunca más', () => {
    expect(isDue(mem({ playSeconds: 99_999, attempts: 2, lastAttemptDay: '2025-01-01', playAtAttempt: 0 }), true, '2026-11-21')).toBe(false);
  });
});

describe('shouldRequest', () => {
  const ready = mem({ playSeconds: 600 });

  it('todo cumplido en una pausa natural: sí', () => {
    expect(shouldRequest(ready, moment())).toBe(true);
  });

  it.each<[string, Partial<ReviewMoment>]>([
    ['sin animal', { boughtAnimal: false }],
    ['tutorial sin ofrecer, en marcha o con lecciones', { tutorialReady: false }],
    ['otro panel abierto', { panelOpen: true }],
    ['aviso destacado hace 9 min 59 s', { sinceNotice: NOTICE_QUIET_S - 1 }],
    ['anuncio hace 2 min 59 s', { sinceAd: AD_QUIET_S - 1 }],
    ['sin pausa natural y aún sin los 5 min', { natural: false, dueFor: CALM_WAIT_S - 1 }],
  ])('%s: no', (_name, extra) => {
    expect(shouldRequest(ready, moment(extra))).toBe(false);
  });

  it('aviso hace 10 min y anuncio hace 3 min: sí', () => {
    expect(shouldRequest(ready, moment({ sinceNotice: NOTICE_QUIET_S, sinceAd: AD_QUIET_S }))).toBe(true);
  });

  it('sin pausa natural, a los 5 min de cumplir: sí', () => {
    expect(shouldRequest(ready, moment({ natural: false, dueFor: CALM_WAIT_S }))).toBe(true);
  });

  it('sin los 10 min de juego: no', () => {
    expect(shouldRequest(mem({ playSeconds: 599 }), moment())).toBe(false);
  });
});
