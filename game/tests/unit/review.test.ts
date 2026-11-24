import { describe, expect, it } from 'vitest';
import { REVIEW_KEY, parseReview } from '../../src/core/reviewPrompt';
import type { KeyValueStore } from '../../src/core/save';
import { EventBus, type GameEvents } from '../../src/systems/events';
import { Review, type Reviewer } from '../../src/systems/review';
import { createMemoryStore } from '../../src/systems/storage';

const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));
const DAY_MS = 86_400_000;
const pause = { boughtAnimal: true, tutorialReady: true, panelOpen: false, natural: true };
const calm = { ...pause, natural: false };

type Answer = 'ok' | 'fallo' | 'colgada';

async function setup(opts: { store?: KeyValueStore; answer?: Answer; timeoutMs?: number; raw?: string } = {}) {
  const store = opts.store ?? createMemoryStore();
  if (opts.raw !== undefined) await store.set(REVIEW_KEY, opts.raw);
  const events = new EventBus<GameEvents>();
  const log: string[] = [];
  events.on('review-requested', ({ attempt }) => log.push(`pedida ${attempt}`));
  events.on('review-failed', ({ attempt }) => log.push(`fallo ${attempt}`));
  const clock = { time: new Date(2026, 10, 21, 10, 0, 0).getTime() };
  const calls: { savedAttempts: number }[] = [];
  let finish: (() => void) | null = null;
  const reviewer: Reviewer = {
    request: async () => {
      calls.push({ savedAttempts: parseReview(await store.get(REVIEW_KEY)).attempts });
      const answer = opts.answer ?? 'ok';
      if (answer === 'fallo') throw new Error('Play dice que no');
      if (answer === 'colgada') await new Promise<void>((resolve) => (finish = resolve));
    },
  };
  const review = new Review({ reviewer, store, events, now: () => new Date(clock.time), timeoutMs: opts.timeoutMs });
  await review.start();
  const play = (seconds: number) => {
    for (let i = 0; i < seconds; i++) review.tick(1);
  };
  return { review, store, events, log, calls, clock, play, finish: () => finish?.() };
}

const saved = async (store: KeyValueStore) => parseReview(await store.get(REVIEW_KEY));

describe('Review: arranque y contador', () => {
  it('sin clave empieza en cero', async () => {
    const { review, store } = await setup();
    expect(review.canRequest(pause)).toBe(false);
    review.setBackground(true);
    await settle();
    expect((await saved(store)).playSeconds).toBe(0);
  });

  it('clave corrupta: como vacía, sin lanzar', async () => {
    const { review, play } = await setup({ raw: '{nope' });
    play(599);
    expect(review.canRequest(pause)).toBe(false);
    play(1);
    expect(review.canRequest(pause)).toBe(true);
  });

  it('9 min 59 s: no; 10 min con animal: sí; sin animal: no', async () => {
    const { review, play } = await setup();
    play(599);
    expect(review.canRequest(pause)).toBe(false);
    play(1);
    expect(review.canRequest({ ...pause, boughtAnimal: false })).toBe(false);
    expect(review.canRequest(pause)).toBe(true);
  });

  it('se guarda cada minuto de juego y al ir a segundo plano; otro arranque sigue donde iba', async () => {
    const { store, play, review } = await setup();
    play(59);
    await settle();
    expect((await saved(store)).playSeconds).toBe(0);
    play(1);
    await settle();
    expect((await saved(store)).playSeconds).toBe(60);
    play(20);
    review.setBackground(true);
    await settle();
    expect((await saved(store)).playSeconds).toBe(80);
    const again = await setup({ store });
    again.play(519);
    expect(again.review.canRequest(pause)).toBe(false);
    again.play(1);
    expect(again.review.canRequest(pause)).toBe(true);
  });

  it('un salto enorme de segundos no suma', async () => {
    const { review } = await setup();
    review.tick(5000);
    expect(review.canRequest(pause)).toBe(false);
  });
});

describe('Review: avisos y anuncios cerca', () => {
  it.each(['poll-notice', 'poll-winner-notice'] as const)('%s hace 9 min 59 s: no; a los 10 min: sí', async (name) => {
    const { review, play, events } = await setup();
    play(600);
    events.emit(name, { poll: '2026-11-a' });
    play(599);
    expect(review.canRequest(pause)).toBe(false);
    play(1);
    expect(review.canRequest(pause)).toBe(true);
  });

  it('aviso de actualización hace menos de 10 min: no', async () => {
    const { review, play, events } = await setup();
    play(600);
    events.emit('update-offered', { kind: 'pequena' });
    play(599);
    expect(review.canRequest(pause)).toBe(false);
    play(1);
    expect(review.canRequest(pause)).toBe(true);
  });

  it('anuncio hace 2 min 59 s: no; a los 3 min: sí', async () => {
    const { review, play, events } = await setup();
    play(600);
    events.emit('ad-offered', { slot: 'pausa', coins: 5, balance: 10 });
    play(179);
    expect(review.canRequest(pause)).toBe(false);
    play(1);
    expect(review.canRequest(pause)).toBe(true);
  });

  it('sin pausa natural: a los 5 min de cumplir, sí', async () => {
    const { review, play } = await setup();
    play(600);
    expect(review.canRequest(calm)).toBe(false);
    play(299);
    expect(review.canRequest(calm)).toBe(false);
    play(1);
    expect(review.canRequest(calm)).toBe(true);
  });
});

describe('Review: pedir', () => {
  it('marca y guarda el intento antes de llamar a Play, avisa y se cierra al acabar', async () => {
    const { review, play, calls, log, store } = await setup();
    play(600);
    expect(review.canRequest(pause)).toBe(true);
    const done = review.request();
    expect(review.open).toBe(true);
    await done;
    expect(calls).toEqual([{ savedAttempts: 1 }]);
    expect(log).toEqual(['pedida 1']);
    expect(review.open).toBe(false);
    expect((await saved(store)).lastAttemptDay).toBe('2026-11-21');
    expect(review.canRequest(pause)).toBe(false);
  });

  it('si Play falla: avisa del fallo, se cierra y no vuelve a pedir', async () => {
    const { review, play, log } = await setup({ answer: 'fallo' });
    play(600);
    review.canRequest(pause);
    await review.request();
    expect(log).toEqual(['pedida 1', 'fallo 1']);
    expect(review.open).toBe(false);
    expect(review.canRequest(pause)).toBe(false);
  });

  it('si Play no contesta, se cierra solo al tiempo máximo', async () => {
    const { review, play, log } = await setup({ answer: 'colgada', timeoutMs: 30 });
    play(600);
    review.canRequest(pause);
    await review.request();
    expect(review.open).toBe(false);
    expect(log).toEqual(['pedida 1']);
  });

  it('dos veces seguidas: Play se llama una vez', async () => {
    const { review, play, calls, finish } = await setup({ answer: 'colgada' });
    play(600);
    review.canRequest(pause);
    const first = review.request();
    await settle();
    await review.request();
    finish();
    await first;
    expect(calls).toHaveLength(1);
  });

  it('sin un «sí» de canRequest justo antes no pide', async () => {
    const { review, calls, play } = await setup();
    play(600);
    await review.request();
    expect(calls).toHaveLength(0);
  });

  it('con la tarjeta abierta el juego no suma', async () => {
    const { review, play, store, finish } = await setup({ answer: 'colgada' });
    play(600);
    review.canRequest(pause);
    const done = review.request();
    await settle();
    play(60);
    finish();
    await done;
    review.setBackground(true);
    await settle();
    expect((await saved(store)).playSeconds).toBe(600);
  });

  it('cierre a la fuerza con la tarjeta abierta: al volver no pide otra vez', async () => {
    const first = await setup({ answer: 'colgada' });
    first.play(600);
    first.review.canRequest(pause);
    void first.review.request();
    await settle();
    await settle();
    const again = await setup({ store: first.store });
    again.play(600);
    expect(again.review.canRequest(pause)).toBe(false);
  });

  it('segunda vez a los 30 días y 10 min más; después, nunca', async () => {
    const { review, play, clock, log } = await setup();
    play(600);
    review.canRequest(pause);
    await review.request();
    clock.time += 29 * DAY_MS;
    play(600);
    expect(review.canRequest(pause)).toBe(false);
    clock.time += DAY_MS;
    expect(review.canRequest(pause)).toBe(true);
    await review.request();
    clock.time += 400 * DAY_MS;
    play(5000);
    expect(review.canRequest(pause)).toBe(false);
    expect(log).toEqual(['pedida 1', 'pedida 2']);
  });

  it('nunca lanza aunque el almacén falle', async () => {
    const broken: KeyValueStore = { get: async () => { throw new Error('roto'); }, set: async () => { throw new Error('roto'); } };
    const { review, play, calls } = await setup({ store: broken });
    play(600);
    expect(review.canRequest(pause)).toBe(false);
    await review.request();
    review.setBackground(true);
    expect(calls).toHaveLength(0);
  });
});
