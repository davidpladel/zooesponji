import * as Phaser from 'phaser';
import { TEXTURES, TILE_SIZE } from '../config';
import { withVersion } from '../core/cacheBust';
import { loadUiFont } from '../ui/font';
import { smooth } from '../ui/paint';
import { TITLE_BG } from '../ui/titleBackdrop';

/** Genera el arte provisional (hasta que llegue el pack en el hito 5). */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    this.load.image(TITLE_BG, withVersion('assets/ui/title-bg.webp'));
  }

  create(): void {
    this.makeTiles();
    this.makeKeeper();
    this.makeMarker();
    if (this.textures.exists(TITLE_BG)) smooth(this, TITLE_BG);
    // La letra tiene que estar antes del primer texto; si no llega en 2 s, se sigue sin ella.
    void loadUiFont().then(() => this.scene.start('Preload'));
  }

  /** 5 tiles en fila, en el orden del tileset "placeholder": césped, camino, valla, puerta, edificio. */
  private makeTiles(): void {
    const g = this.make.graphics({}, false);
    const colors = [0x5fa84a, 0xd2b07a, 0x7a4e2d, 0xf0d890, 0xc0603a];
    colors.forEach((color, i) => {
      g.fillStyle(color, 1);
      g.fillRect(i * TILE_SIZE, 0, TILE_SIZE, TILE_SIZE);
    });
    // Detalles mínimos para distinguirlos a simple vista.
    g.fillStyle(0x4f9440, 1).fillRect(3, 4, 2, 2).fillRect(10, 11, 2, 2);
    g.fillStyle(0x4a2f1a, 1).fillRect(2 * TILE_SIZE, 5, TILE_SIZE, 2).fillRect(2 * TILE_SIZE, 10, TILE_SIZE, 2);
    g.lineStyle(1, 0x7a4e2d, 1).strokeRect(3 * TILE_SIZE + 0.5, 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
    g.fillStyle(0x8d3b22, 1).fillRect(4 * TILE_SIZE, 0, TILE_SIZE, 4); // tejado
    g.generateTexture(TEXTURES.tiles, TILE_SIZE * 5, TILE_SIZE);
    g.destroy();
  }

  private makeKeeper(): void {
    const g = this.make.graphics({}, false);
    g.fillStyle(0x2e7d32, 1).fillRoundedRect(1, 5, 10, 9, 2); // uniforme verde
    g.fillStyle(0xf1c27d, 1).fillCircle(6, 4, 4); // cara
    g.fillStyle(0x6d4c41, 1).fillRect(2, 0, 8, 2); // sombrero
    g.generateTexture(TEXTURES.keeper, 12, 14);
    g.destroy();
  }

  private makeMarker(): void {
    const g = this.make.graphics({}, false);
    g.lineStyle(2, 0xffffff, 0.9).strokeCircle(6, 6, 5);
    g.generateTexture(TEXTURES.marker, 12, 12);
    g.destroy();
  }
}
