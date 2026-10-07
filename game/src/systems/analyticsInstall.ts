import { Capacitor } from '@capacitor/core';
import type * as Phaser from 'phaser';
import { parseConfig, type MatomoEnv } from '../core/matomoRequest';
import { APP_VERSION } from '../core/version';
import { Analytics, setAnalytics } from './analytics';
import { createStore } from './createStore';
import { bus } from './events';
import { getLanguage } from './language';
import { getSession } from './session';

const FLUSH_MS = 10_000;

/** Escena de Phaser → nombre de pantalla en Matomo. */
const SCREENS: Record<string, string> = {
  Title: 'titulo',
  World: 'mapa',
  Shop: 'tienda',
  Book: 'libro',
  Feed: 'comer',
  Settings: 'ajustes',
};

function randomId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Sin cookies (`credentials: 'omit'`) y sin leer la respuesta. `keepalive` deja terminar el envío al salir. */
function send(url: string, body: string): Promise<boolean> {
  return fetch(url, { method: 'POST', body, mode: 'no-cors', keepalive: true, credentials: 'omit' }).then(
    () => true,
    () => false,
  );
}

/** Arranca las estadísticas anónimas. Sin configuración (desarrollo, tests) no hace nada. Nunca lanza. */
export async function installAnalytics(game: Phaser.Game): Promise<void> {
  try {
    const config = parseConfig(import.meta.env as MatomoEnv);
    if (!config) return;
    const session = getSession();
    const analytics = new Analytics({
      config,
      store: createStore(),
      events: bus,
      send,
      now: () => new Date(),
      randomId,
      version: APP_VERSION,
      platform: Capacitor.isNativePlatform() ? 'android' : 'web',
      language: getLanguage,
      settings: session.settings,
      coins: session.state.coins,
    });
    setAnalytics(analytics);
    for (const [key, name] of Object.entries(SCREENS)) {
      const events = game.scene.getScene(key).events;
      events.on('start', () => analytics.screenView(name));
      events.on('resume', () => analytics.screenView(name));
    }
    setInterval(() => void analytics.flush(), FLUSH_MS);
    await analytics.start();
  } catch {
    // Medir nunca impide jugar.
  }
}
