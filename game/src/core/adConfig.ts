import { AD_SLOTS, type AdSlot } from './adPacing';

/** Variables de compilación (`.env.production.local`, que no se sube al repositorio). */
export interface AdEnv {
  VITE_ADMOB_REWARDED?: string;
  VITE_ADMOB_REWARDED_INTERSTITIAL?: string;
  VITE_ADMOB_TESTING?: string;
}

export interface AdConfig {
  /** Bloque de anuncios de cada hueco. Un hueco sin bloque no existe. */
  units: Partial<Record<AdSlot, string>>;
  /** Se piden anuncios de prueba: nunca dan dinero y se pueden tocar. */
  testing: boolean;
}

/** Bloques públicos de prueba de Google: bonificado e intersticial bonificado. */
export const TEST_UNITS: Readonly<Record<AdSlot, string>> = {
  tienda: 'ca-app-pub-3940256099942544/5224354917',
  pausa: 'ca-app-pub-3940256099942544/5354046379',
};

const UNIT = /^ca-app-pub-\d{16}\/\d{10}$/;
const ENV_OF: Record<AdSlot, keyof AdEnv> = { tienda: 'VITE_ADMOB_REWARDED', pausa: 'VITE_ADMOB_REWARDED_INTERSTITIAL' };

/** `null`: no hay publicidad. En desarrollo, o con `VITE_ADMOB_TESTING=1`, solo anuncios de prueba. */
export function parseAdConfig(env: AdEnv, dev: boolean): AdConfig | null {
  if (dev || env.VITE_ADMOB_TESTING === '1') return { units: { ...TEST_UNITS }, testing: true };
  const units: Partial<Record<AdSlot, string>> = {};
  for (const slot of AD_SLOTS) {
    const unit = env[ENV_OF[slot]]?.trim();
    if (unit && UNIT.test(unit)) units[slot] = unit;
  }
  return Object.keys(units).length > 0 ? { units, testing: false } : null;
}

export function configuredSlots(config: AdConfig): AdSlot[] {
  return AD_SLOTS.filter((slot) => config.units[slot] !== undefined);
}
