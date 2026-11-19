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
