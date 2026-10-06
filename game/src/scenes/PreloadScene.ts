import * as Phaser from 'phaser';
import { queueArt, registerArtAnims, setArt } from '../art/art';
import { parseManifest } from '../art/manifest';
import { withVersion } from '../core/cacheBust';
import { MAPS } from '../config';
import { phaserBackend, queueAudio, sfx } from '../systems/audio';
import { createStore } from '../systems/createStore';
import { bus } from '../systems/events';
import { deviceLanguages, resolveLanguage, setLanguage } from '../systems/language';
import { Session, setSession } from '../systems/session';
import { queueIcons, smoothIcons } from '../ui/icons';
import { addTitleBackdrop } from '../ui/titleBackdrop';
import { pillImage } from '../ui/widgets';

/** Sin arte importado, el archivo no existe (o el servidor devuelve otra cosa): se usa el arte provisional. */
async function fetchManifest(): Promise<unknown> {
  try {
    const response = await fetch('art/manifest.json', { cache: 'no-cache' });
    if (!response.ok) return null;
    return JSON.parse(await response.text()) as unknown;
  } catch {
    return null;
  }
}

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  private bar: Phaser.GameObjects.Image | null = null;
  /** 0: mapas, sonido e iconos (hasta el 40 %). 1: arte (el resto). */
  private phase = 0;

  preload(): void {
    const { width } = this.scale;
    const layout = addTitleBackdrop(this);
    const trackH = layout.buttonH * 0.5;
    pillImage(this, layout.buttonW, trackH, 'sand').setPosition(width / 2, layout.buttonY);
    this.bar = pillImage(this, layout.buttonW - trackH * 0.3, trackH * 0.62, 'yellow').setPosition(width / 2, layout.buttonY - trackH * 0.03);
    this.phase = 0;
    this.showProgress(0);
    this.load.on(Phaser.Loader.Events.PROGRESS, (value: number) => this.showProgress(this.phase === 0 ? value * 0.4 : 0.4 + value * 0.6));
    this.load.tilemapTiledJSON(MAPS.zoo, withVersion('assets/maps/zoo.tmj'));
    this.load.tilemapTiledJSON(MAPS.shop, withVersion('assets/maps/tienda.tmj'));
    this.load.image('logo', withVersion('logo.png'));
    queueIcons(this);
    queueAudio(this);
  }

  /** La barra nunca retrocede: se recorta la píldora amarilla de izquierda a derecha. */
  private showProgress(value: number): void {
    const bar = this.bar;
    if (!bar) return;
    bar.setCrop(0, 0, bar.width * Phaser.Math.Clamp(value, 0, 1), bar.height);
  }

  create(): void {
    smoothIcons(this);
    sfx.attach(phaserBackend(this.game));
    bus.on('settings-changed', () => sfx.syncMusic());
    void this.loadArt();
  }

  private async loadArt(): Promise<void> {
    const manifest = parseManifest(await fetchManifest());
    this.phase = 1;
    if (!manifest) {
      this.showProgress(1);
      setArt(null);
      void this.startSession();
      return;
    }
    queueArt(this, manifest);
    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      registerArtAnims(this, manifest);
      setArt(manifest);
      void this.startSession();
    });
    this.load.start();
  }

  private async startSession(): Promise<void> {
    const session = await Session.load(createStore());
    setSession(session);
    // El idioma elegido en Ajustes; si no hay ninguno, el del móvil.
    setLanguage(resolveLanguage(session.settings.language, deviceLanguages()));
    this.scene.start('Title');
  }
}
