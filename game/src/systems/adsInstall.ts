import { AdMob, MaxAdContentRating, RewardAdPluginEvents, RewardInterstitialAdPluginEvents } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';
import type * as Phaser from 'phaser';
import { configuredSlots, parseAdConfig, type AdEnv } from '../core/adConfig';
import type { AdSlot } from '../core/adPacing';
import { createAdMobProvider, type AdMobEvent, type AdMobLike } from './adProvider';
import { Ads, setAds, type AdProvider } from './ads';
import { sfx } from './audio';
import { createStore } from './createStore';
import { bus } from './events';
import { getSession } from './session';

/** Avisos del complemento para cada hueco: bonificado en la tienda, intersticial bonificado en la pausa. */
const EVENTS: Record<AdSlot, Record<AdMobEvent, string>> = {
  tienda: {
    showed: RewardAdPluginEvents.Showed,
    failed: RewardAdPluginEvents.FailedToShow,
    dismissed: RewardAdPluginEvents.Dismissed,
    rewarded: RewardAdPluginEvents.Rewarded,
  },
  pausa: {
    showed: RewardInterstitialAdPluginEvents.Showed,
    failed: RewardInterstitialAdPluginEvents.FailedToShow,
    dismissed: RewardInterstitialAdPluginEvents.Dismissed,
    rewarded: RewardInterstitialAdPluginEvents.Rewarded,
  },
};

/** El complemento de verdad, visto como `AdMobLike`. */
function capacitorAdMob(): AdMobLike {
  return {
    // Modo infantil: dirigido a niños y solo anuncios para todos los públicos. No se marca «menor de la edad de
    // consentimiento» (Google pide no activar las dos) ni se llama a la plataforma de consentimiento.
    initialize: (testing) =>
      AdMob.initialize({ initializeForTesting: testing, tagForChildDirectedTreatment: true, maxAdContentRating: MaxAdContentRating.General }),
    prepare: async (slot, adId, testing) => {
      const options = { adId, isTesting: testing };
      if (slot === 'tienda') await AdMob.prepareRewardVideoAd(options);
      else await AdMob.prepareRewardInterstitialAd(options);
    },
    show: async (slot) => {
      if (slot === 'tienda') await AdMob.showRewardVideoAd();
      else await AdMob.showRewardInterstitialAd();
    },
    // El complemento tipa cada aviso por separado; aquí llegan por nombre.
    on: (slot, event, handler) => AdMob.addListener(EVENTS[slot][event] as never, handler as never),
  };
}

let timer: ReturnType<typeof setInterval> | null = null;

/** Tiempo de juego: el juego en pantalla y la partida empezada (ya se ha salido de la portada). */
function playing(game: Phaser.Game): boolean {
  return !document.hidden && (game.scene.isActive('World') || game.scene.isPaused('World'));
}

/** Monta la publicidad con un proveedor dado y arranca el reloj de juego. Las pruebas pasan uno falso. */
export async function startAds(game: Phaser.Game, provider: AdProvider, slots: readonly AdSlot[]): Promise<Ads> {
  const ads = new Ads({
    provider,
    slots,
    store: createStore(),
    events: bus,
    now: () => new Date(),
    state: () => getSession().state,
    earnCoins: (amount) => getSession().earnCoins(amount),
    pauseSound: (paused) => sfx.setPaused('ad', paused),
  });
  await ads.start();
  setAds(ads);
  if (timer !== null) clearInterval(timer);
  timer = setInterval(() => {
    if (playing(game)) ads.tick(1);
  }, 1000);
  return ads;
}

/** Arranca la publicidad. Fuera de Android nativo o sin configuración no instala nada. Nunca lanza. */
export async function installAds(game: Phaser.Game): Promise<void> {
  try {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return;
    const config = parseAdConfig(import.meta.env as AdEnv, import.meta.env.DEV);
    if (!config) return;
    await startAds(game, createAdMobProvider(capacitorAdMob(), config), configuredSlots(config));
  } catch {
    // La publicidad nunca impide jugar.
  }
}
