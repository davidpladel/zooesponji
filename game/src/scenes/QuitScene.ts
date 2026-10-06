import * as Phaser from 'phaser';
import type { Vec } from '../core/movement';
import { t } from '../data/strings';
import { sfx } from '../systems/audio';
import { addWoodPanel, restartOnResize, textStyle } from './ui';

export interface QuitSceneData {
  /** Guarda y cierra la app. */
  onConfirm: () => void;
}

/** "¿Salir?" con ✔️ y ❌ grandes. Se abre con el botón atrás de Android o con «Salir» en ajustes. */
export class QuitScene extends Phaser.Scene {
  private onConfirm: () => void = () => {};
  private yes!: Phaser.GameObjects.Text;

  constructor() {
    super('Quit');
  }

  init(data: QuitSceneData): void {
    if (data?.onConfirm) this.onConfirm = data.onConfirm;
  }

  create(): void {
    const { width, height } = this.scale;
    if (this.scene.isActive('World')) this.scene.pause('World');
    this.add.rectangle(0, 0, width, height, 0x000000, 0.7).setOrigin(0).setInteractive().on('pointerup', () => this.close());
    addWoodPanel(this, width / 2, height / 2, Math.min(width * 0.8, 560), height * 0.6);
    this.add.text(width / 2, height * 0.35, t('quit.ask'), textStyle(Math.round(height * 0.08), '#ffffff', '#4e2f14')).setOrigin(0.5);
    const size = Math.round(Phaser.Math.Clamp(height * 0.12, 48, 96));
    const button = (x: number, label: string, color: string, action: () => void) =>
      this.add
        .text(x, height * 0.6, label, { fontSize: `${size}px`, backgroundColor: color, padding: { x: 28, y: 16 } })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerup', action);
    this.yes = button(width / 2 - size * 1.4, '✔️', '#43a047', () => this.onConfirm());
    button(width / 2 + size * 1.4, '❌', '#c62828', () => this.close());
    restartOnResize(this);
  }

  yesPos(): Vec {
    return { x: this.yes.x, y: this.yes.y };
  }

  close(): void {
    if (!this.scene.isActive()) return;
    sfx.play('tap');
    this.scene.stop();
    this.scene.resume('World');
  }
}
