import { AppUpdate, AppUpdateAvailability, AppUpdateResultCode } from '@capawesome/capacitor-app-update';

/**
 * Único archivo que toca el plugin de actualización de Play (`@capawesome/capacitor-app-update`).
 * Solo usa `getAppUpdateInfo` y `performImmediateUpdate`: nunca `openAppStore` (saldría del juego con un enlace de
 * tienda, y un juego infantil no lleva enlaces externos) ni la actualización flexible.
 */

export interface PlayUpdateInfo {
  /** Play dice que hay una versión nueva para este aparato. */
  available: boolean;
  /** Y que la ventana de actualización inmediata está permitida ahora mismo. */
  immediateAllowed: boolean;
  /** `versionCode` instalado (de Play, no del nombre de la versión). `null` si no se puede leer. */
  versionCode: number | null;
}

export type PlayUpdateResult = 'actualizada' | 'cancelada' | 'fallo' | 'no-disponible';

export interface PlayUpdater {
  /** Nunca lanza: ante cualquier fallo, «nada disponible». */
  info(): Promise<PlayUpdateInfo>;
  /** Nunca lanza. `no-disponible`: Play dice que no hay versión, que no se puede o que no hay información: no es un fallo. */
  immediate(): Promise<PlayUpdateResult>;
}

const NOTHING: PlayUpdateInfo = { available: false, immediateAllowed: false, versionCode: null };

function toCode(value: unknown): number | null {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null;
  const n = Number(value);
  return Number.isSafeInteger(n) ? n : null;
}

/** Con el plugin real; solo tiene sentido en Android nativo. */
export function createPlayUpdater(): PlayUpdater {
  return {
    async info() {
      try {
        const info = await AppUpdate.getAppUpdateInfo();
        return {
          available: info.updateAvailability === AppUpdateAvailability.UPDATE_AVAILABLE,
          immediateAllowed: info.immediateUpdateAllowed === true,
          versionCode: toCode(info.currentVersionCode),
        };
      } catch {
        return NOTHING;
      }
    },
    async immediate() {
      try {
        // El plugin exige haber pedido la información antes (si no, INFO_MISSING).
        await AppUpdate.getAppUpdateInfo();
      } catch {
        return 'no-disponible';
      }
      try {
        const { code } = await AppUpdate.performImmediateUpdate();
        if (code === AppUpdateResultCode.OK) return 'actualizada';
        if (code === AppUpdateResultCode.CANCELED) return 'cancelada';
        if (code === AppUpdateResultCode.FAILED) return 'fallo';
        return 'no-disponible';
      } catch {
        return 'fallo';
      }
    },
  };
}

let current: PlayUpdater | null = null;

export function setPlayUpdater(updater: PlayUpdater | null): void {
  current = updater;
}

/** `null` fuera de Android o antes de instalarlo: no hay aviso. */
export function getPlayUpdater(): PlayUpdater | null {
  return current;
}

// --- Play falso: pruebas de juego y prueba en casa con `npm run dev` (en el navegador no hay Play) ---

export interface FakePlayOptions {
  available?: boolean;
  allowed?: boolean;
  versionCode?: number;
  /** Lo que devuelve cada intento de actualizar; el último se repite. */
  results?: PlayUpdateResult[];
}

const RESULTS: readonly PlayUpdateResult[] = ['actualizada', 'cancelada', 'fallo', 'no-disponible'];

export function createFakePlayUpdater(o: FakePlayOptions = {}, onCall?: (result: PlayUpdateResult) => void): PlayUpdater {
  const results = [...(o.results ?? ['cancelada'])];
  return {
    info: async () => ({ available: o.available ?? true, immediateAllowed: o.allowed ?? true, versionCode: o.versionCode ?? 12 }),
    immediate: async () => {
      const result = (results.length > 1 ? results.shift() : results[0]) ?? 'cancelada';
      onCall?.(result);
      return result;
    },
  };
}

/**
 * Lee el Play falso de la dirección: `?play-falso=cancelada,actualizada&codigo=13&dia=2026-11-21&play=no-hay&aviso-de-cero`.
 * `null` sin `play-falso`. Solo se usa con `npm run dev` (lo decide quien lo llama).
 */
export function fakePlayFromQuery(search: string): { play: Required<FakePlayOptions>; today: string | null; reset: boolean } | null {
  const q = new URLSearchParams(search);
  if (!q.has('play-falso')) return null;
  const results = (q.get('play-falso') ?? '').split(',').filter((r): r is PlayUpdateResult => (RESULTS as string[]).includes(r));
  const code = q.get('codigo') ?? '';
  const day = q.get('dia') ?? '';
  return {
    play: {
      available: q.get('play') !== 'no-hay',
      allowed: q.get('play') !== 'no-permitida',
      versionCode: /^\d+$/.test(code) ? Number(code) : 13,
      results: results.length > 0 ? results : ['cancelada'],
    },
    today: /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null,
    reset: q.has('aviso-de-cero'),
  };
}
