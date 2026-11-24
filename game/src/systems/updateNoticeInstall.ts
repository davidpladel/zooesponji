import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import type * as Phaser from 'phaser';
import type { UpdateNoticeScene } from '../scenes/UpdateNoticeScene';
import { UPDATE_KEY } from '../core/updatePolicy';
import { createFakePlayUpdater, createPlayUpdater, fakePlayFromQuery, getPlayUpdater, setPlayUpdater, type PlayUpdater } from './appUpdate';
import { getCommunity } from './community';
import { getReview } from './review';
import { createStore } from './createStore';
import { bus } from './events';
import { UpdateNotice } from './updateNotice';

let current: UpdateNotice | null = null;
let unsubscribe: (() => void) | null = null;

/** `null` fuera de Android (o antes de instalarlo): no hay aviso. */
export function getUpdateNotice(): UpdateNotice | null {
  return current;
}

/** Monta el aviso con una pieza de Play (en las pruebas, una falsa). */
export function startUpdateNotice(game: Phaser.Game, play: PlayUpdater, options: { today?: () => string } = {}): UpdateNotice {
  setPlayUpdater(play);
  unsubscribe?.();
  const notice = new UpdateNotice({
    native: true,
    store: createStore(),
    events: bus,
    community: () => getCommunity(),
    play: () => getPlayUpdater(),
    // Con la tarjeta de la valoración encima tampoco es momento: cuenta como una escena más.
    activeScenes: () => [...game.scene.getScenes(true).map((scene) => scene.scene.key), ...(getReview()?.open ? ['Review'] : [])],
    show: (data) => {
      // Como el aviso de votación: el mundo queda en pausa debajo y la escena lo reanuda al cerrarse.
      if (game.scene.isActive('World')) game.scene.pause('World');
      game.scene.run('UpdateNotice', data);
      game.scene.bringToTop('UpdateNotice');
    },
    close: () => {
      if (game.scene.isActive('UpdateNotice')) game.scene.getScene<UpdateNoticeScene>('UpdateNotice').close();
    },
    today: options.today,
  });
  current = notice;
  void notice.start();
  // La respuesta del servidor llega cuando llega: si el título sigue abierto, se mira entonces.
  unsubscribe = bus.on('community-updated', () => void notice.check());
  return notice;
}

/** Solo en Android nativo. Nunca lanza: el aviso nunca impide jugar. */
export function installUpdateNotice(game: Phaser.Game): void {
  try {
    // Prueba en casa con `npm run dev`: Play falso desde la dirección (`?play-falso=...`). Nunca en el paquete.
    if (import.meta.env.DEV && startFakeFromUrl(game)) return;
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return;
    startUpdateNotice(game, createPlayUpdater());
    // Volver a abrir la app es otro momento seguro (si no hay nada abierto).
    void App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) void current?.check();
    });
  } catch {
    current = null;
  }
}

/** `?play-falso` en la dirección (solo `npm run dev`): monta el aviso con un Play falso. */
function startFakeFromUrl(game: Phaser.Game): boolean {
  const fake = fakePlayFromQuery(window.location.search);
  if (!fake) return false;
  if (fake.reset) {
    try {
      window.localStorage.removeItem(UPDATE_KEY);
    } catch {
      // Sin almacén: no hay nada que borrar.
    }
  }
  const today = fake.today;
  startUpdateNotice(game, createFakePlayUpdater(fake.play), { today: today ? () => today : undefined });
  return true;
}
