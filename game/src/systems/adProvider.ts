import type { AdConfig } from '../core/adConfig';
import type { AdSlot } from '../core/adPacing';
import type { AdProvider } from './ads';

/** Avisos del SDK que interesan: se abrió, no se pudo abrir, se cerró, el premio está ganado. */
export type AdMobEvent = 'showed' | 'failed' | 'dismissed' | 'rewarded';

/** Lo mínimo del complemento de AdMob que usa el juego (se sustituye en las pruebas). */
export interface AdMobLike {
  /** Arranca el SDK en modo infantil. */
  initialize(testing: boolean): Promise<void>;
  /** Carga el anuncio de un hueco: bonificado en la tienda, intersticial bonificado en la pausa. */
  prepare(slot: AdSlot, adId: string, testing: boolean): Promise<void>;
  show(slot: AdSlot): Promise<void>;
  on(slot: AdSlot, event: AdMobEvent, handler: () => void): Promise<{ remove(): Promise<void> }>;
}

/** Temporizador: devuelve cómo cancelarlo. */
export type Wait = (ms: number, fn: () => void) => () => void;

/** Si en este tiempo el SDK no avisa de que el anuncio se abrió, se da por fallido: el juego no se queda parado. */
export const SHOW_TIMEOUT_MS = 10_000;
/** Tope con el anuncio abierto: si el SDK no avisa de que se cerró, el juego sigue igualmente. */
export const OPEN_TIMEOUT_MS = 5 * 60_000;

const timeout: Wait = (ms, fn) => {
  const id = setTimeout(fn, ms);
  return () => clearTimeout(id);
};

/**
 * Convierte el complemento en un `AdProvider`. Trabaja con los avisos del SDK y no con lo que devuelven
 * sus llamadas: el premio solo existe si llega «rewarded», y «dismissed» solo indica que se cerró.
 */
export function createAdMobProvider(admob: AdMobLike, config: AdConfig, wait: Wait = timeout): AdProvider {
  let started: Promise<boolean> | null = null;
  /** El SDK se inicia justo antes de la primera carga, no al abrir el juego. Si falla, la siguiente carga lo reintenta. */
  const start = (): Promise<boolean> => {
    started ??= Promise.resolve()
      .then(() => admob.initialize(config.testing))
      .then(
        () => true,
        () => {
          started = null;
          return false;
        },
      );
    return started;
  };

  return {
    async load(slot) {
      const adId = config.units[slot];
      if (!adId) return false;
      if (!(await start())) return false;
      try {
        await admob.prepare(slot, adId, config.testing);
        return true;
      } catch {
        return false;
      }
    },

    show(slot) {
      return new Promise((resolve) => {
        let shown = false;
        let rewarded = false;
        let done = false;
        let cancel: () => void = () => {};
        const handles: Promise<{ remove(): Promise<void> }>[] = [];
        const finish = (result: { shown: boolean; rewarded: boolean }): void => {
          if (done) return;
          done = true;
          cancel();
          for (const handle of handles) void handle.then((h) => h.remove()).catch(() => {});
          resolve(result);
        };
        const failed = (): void => finish({ shown: false, rewarded: false });
        const listen = (event: AdMobEvent, handler: () => void): void => {
          handles.push(Promise.resolve().then(() => admob.on(slot, event, handler)));
        };
        listen('rewarded', () => {
          rewarded = true;
        });
        listen('showed', () => {
          shown = true;
          cancel();
          cancel = wait(OPEN_TIMEOUT_MS, () => finish({ shown: true, rewarded }));
        });
        listen('failed', failed);
        listen('dismissed', () => finish({ shown: true, rewarded }));
        // Primero los avisos, luego el anuncio: así no se escapa ninguno.
        Promise.all(handles)
          .then(() => {
            cancel = wait(SHOW_TIMEOUT_MS, () => {
              if (!shown) failed();
            });
            return admob.show(slot);
          })
          .catch(() => {
            // Con el anuncio ya abierto se sigue esperando su cierre.
            if (!shown) failed();
          });
      });
    },
  };
}
