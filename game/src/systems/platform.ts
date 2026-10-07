import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import type * as Phaser from 'phaser';
import { decideBack, type BackAction } from '../core/back';
import type { FeedScene } from '../scenes/FeedScene';
import type { QuitScene, QuitSceneData } from '../scenes/QuitScene';
import type { BookScene } from '../scenes/BookScene';
import type { SettingsScene } from '../scenes/SettingsScene';
import type { ShopScene } from '../scenes/ShopScene';
import { getAnalytics } from './analytics';
import { sfx } from './audio';
import { bus } from './events';
import { closeLegal } from './legal';
import { getSession } from './session';

async function exitApp(): Promise<void> {
  try {
    await getSession().save();
  } catch {
    // Sin sesión (aún en el título) no hay nada que guardar.
  }
  try {
    await App.exitApp();
  } catch {
    // En la web no existe: no se hace nada.
  }
}

/** Abre "¿Salir?" encima de todo; al confirmar guarda y cierra la app. */
export function askQuit(game: Phaser.Game): void {
  bus.emit('quit-asked', {});
  const data: QuitSceneData = { onConfirm: () => void exitApp() };
  game.scene.run('Quit', data);
  game.scene.bringToTop('Quit');
}

/** Botón atrás (Android), segundo plano y capa "gira el móvil". */
export class Platform {
  /** Motivos por los que esta clase pausó el mundo (para reanudarlo solo si fue ella). */
  private readonly worldPausedBy = new Set<'background' | 'rotate'>();

  private lastSize = { width: -1, height: -1 };

  constructor(private readonly game: Phaser.Game) {}

  install(): void {
    if (Capacitor.isNativePlatform()) {
      void App.addListener('backButton', () => void this.back());
      void App.addListener('appStateChange', ({ isActive }) => this.setBackground(!isActive));
    }
    document.addEventListener('visibilitychange', () => this.setBackground(document.hidden));
    this.game.scale.on('resize', () => this.checkOrientation());
    this.game.events.once('ready', () => this.checkOrientation());
    // Los navegadores móviles avisan del giro antes de actualizar el tamaño: se vuelve a medir varias veces.
    const remeasure = () => {
      for (const ms of [50, 250, 600, 1200]) {
        setTimeout(() => {
          this.game.scale.refresh();
        }, ms);
      }
    };
    window.addEventListener('orientationchange', remeasure);
    screen.orientation?.addEventListener('change', remeasure);
    window.visualViewport?.addEventListener('resize', remeasure);
  }

  private active(key: string): boolean {
    return this.game.scene.isActive(key);
  }

  backAction(): BackAction {
    const screen = this.active('World') || this.game.scene.isPaused('World') ? 'world' : this.active('Title') ? 'title' : 'other';
    return decideBack({
      quitDialogOpen: this.active('Quit'),
      settingsOpen: this.active('Settings') || this.active('Book'),
      overlayOpen: this.active('Feed') || this.active('Shop'),
      screen,
    });
  }

  async back(): Promise<BackAction> {
    // La página de privacidad va por encima del juego (HTML): es lo primero que se cierra.
    if (closeLegal()) return 'close-overlay';
    const action = this.backAction();
    const scene = <T extends Phaser.Scene>(key: string) => this.game.scene.getScene(key) as T;
    switch (action) {
      case 'close-quit':
        scene<QuitScene>('Quit').close();
        break;
      case 'close-settings':
        if (this.active('Book')) scene<BookScene>('Book').close();
        else scene<SettingsScene>('Settings').close();
        break;
      case 'close-overlay':
        if (this.active('Feed')) scene<FeedScene>('Feed').close();
        if (this.active('Shop')) scene<ShopScene>('Shop').close();
        break;
      case 'ask-quit':
        askQuit(this.game);
        break;
      case 'exit':
        await exitApp();
        break;
      case 'none':
        break;
    }
    return action;
  }

  /** Al irse a segundo plano: guardar, pausar el mundo y la música; al volver, reanudar. */
  setBackground(hidden: boolean): void {
    sfx.setPaused('background', hidden);
    getAnalytics()?.setBackground(hidden);
    if (hidden) {
      void getSessionSafe()?.save();
      this.pauseWorld('background');
    } else {
      this.resumeWorld('background');
    }
  }

  checkOrientation(): void {
    const { width, height } = this.game.scale;
    // Sin cambio de tamaño no hay nada que hacer (evita reiniciar la animación en cada medida repetida).
    if (width === this.lastSize.width && height === this.lastSize.height) return;
    this.lastSize = { width, height };
    const portrait = height > width;
    sfx.setPaused('rotate', portrait);
    if (portrait) {
      if (this.active('Rotate')) this.game.scene.getScene('Rotate').scene.restart();
      else this.game.scene.run('Rotate');
      this.game.scene.bringToTop('Rotate');
      this.pauseWorld('rotate');
    } else {
      if (this.active('Rotate')) this.game.scene.stop('Rotate');
      this.resumeWorld('rotate');
    }
  }

  private pauseWorld(reason: 'background' | 'rotate'): void {
    if (this.active('World')) {
      this.game.scene.pause('World');
      this.worldPausedBy.add(reason);
    }
  }

  private resumeWorld(reason: 'background' | 'rotate'): void {
    if (!this.worldPausedBy.delete(reason) || this.worldPausedBy.size > 0) return;
    if (this.game.scene.isPaused('World')) this.game.scene.resume('World');
  }
}

function getSessionSafe(): ReturnType<typeof getSession> | null {
  try {
    return getSession();
  } catch {
    return null;
  }
}
