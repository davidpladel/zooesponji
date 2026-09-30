import * as Phaser from 'phaser';
import { queueArt, registerArtAnims, setArt } from '../art/art';
import { parseManifest } from '../art/manifest';
import { withVersion } from '../core/cacheBust';
import { MAPS } from '../config';
import { phaserBackend, queueAudio, sfx } from '../systems/audio';
import { createStore } from '../systems/createStore';
import { bus } from '../systems/events';
import { Session, setSession } from '../systems/session';

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

  preload(): void {
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, 304, 20).setStrokeStyle(2, 0xffffff);
    const bar = this.add.rectangle(width / 2 - 150, height / 2, 0, 14, 0xffd54a).setOrigin(0, 0.5);
    this.load.on(Phaser.Loader.Events.PROGRESS, (value: number) => {
      bar.width = 300 * value;
    });
    this.load.tilemapTiledJSON(MAPS.zoo, withVersion('assets/maps/zoo.tmj'));
    this.load.tilemapTiledJSON(MAPS.shop, withVersion('assets/maps/tienda.tmj'));
    this.load.image('logo', withVersion('logo.png'));
    queueAudio(this);
  }

  create(): void {
    sfx.attach(phaserBackend(this.game));
    bus.on('settings-changed', () => sfx.syncMusic());
    void this.loadArt();
  }

  private async loadArt(): Promise<void> {
    const manifest = parseManifest(await fetchManifest());
    if (!manifest) {
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
    setSession(await Session.load(createStore()));
    this.scene.start('Title');
  }
}
