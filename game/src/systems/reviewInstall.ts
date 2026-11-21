import { AppReview } from '@capawesome/capacitor-app-review';
import { Capacitor } from '@capacitor/core';
import type * as Phaser from 'phaser';
import { PLAY_MIN_S, REVIEW_KEY, emptyReview } from '../core/reviewPrompt';
import { createStore } from './createStore';
import { bus } from './events';
import { playing } from './playing';
import { Review, setReview, type Reviewer } from './review';

/**
 * El de verdad: solo «pedir reseña» (la tarjeta de Google encima del juego). Este es el único archivo que toca el
 * plugin. Su otra función, la que abre la ficha de Play, no se usa nunca: dentro del juego no hay enlaces.
 */
export function createPlayReviewer(): Reviewer {
  return { request: () => AppReview.requestReview() };
}

let timer: ReturnType<typeof setInterval> | null = null;

/** Monta la valoración con quien llama a Play (en las pruebas, uno falso) y arranca el reloj de juego. */
export async function startReview(game: Phaser.Game, reviewer: Reviewer, options: { playSeconds?: number } = {}): Promise<Review> {
  const store = createStore();
  // Solo para probar en casa (`?valoracion=rapido`): los 10 min de juego ya hechos.
  if (options.playSeconds !== undefined) await store.set(REVIEW_KEY, JSON.stringify({ ...emptyReview(), playSeconds: options.playSeconds }));
  const review = new Review({ reviewer, store, events: bus, now: () => new Date() });
  await review.start();
  setReview(review);
  if (timer !== null) clearInterval(timer);
  timer = setInterval(() => {
    if (playing(game)) review.tick(1);
  }, 1000);
  return review;
}

/** Solo en Android nativo (o con `?valoracion=rapido` en `npm run dev`). Nunca lanza: la valoración nunca impide jugar. */
export function installReview(game: Phaser.Game): void {
  try {
    if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('valoracion') === 'rapido') {
      const fake: Reviewer = {
        request: async () => {
          console.info('valoracion: pedida');
        },
      };
      void startReview(game, fake, { playSeconds: PLAY_MIN_S }).catch(() => undefined);
      return;
    }
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return;
    void startReview(game, createPlayReviewer()).catch(() => undefined);
  } catch {
    // La valoración nunca impide jugar.
  }
}
