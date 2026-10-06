import * as Phaser from 'phaser';
import type { Vec } from '../core/movement';
import { t } from '../data/strings';
import { sfx } from '../systems/audio';
import { addPanel, addPillButton, addRibbonTitle, addVeil, restartOnResize } from '../ui/widgets';

export interface QuitSceneData {
  /** Guarda y cierra la app. */
  onConfirm: () => void;
}

/** «¿Salir del zoo?»: seguir jugando (grande, verde) o salir (rojo). Se abre con atrás en Android o con «Salir» en ajustes. */
export class QuitScene extends Phaser.Scene {
  private onConfirm: () => void = () => {};
  private yes!: Phaser.GameObjects.Container;
  private stay!: Phaser.GameObjects.Container;

  constructor() {
    super('Quit');
  }

  init(data: QuitSceneData): void {
    if (data?.onConfirm) this.onConfirm = data.onConfirm;
  }

  create(): void {
    const { width, height } = this.scale;
    if (this.scene.isActive('World')) this.scene.pause('World');
    addVeil(this, () => this.close());
    const panelW = Math.min(width * 0.8, 600);
    const panelH = height * 0.56;
    const panelY = height * 0.56;
    addPanel(this, width / 2, panelY, panelW, panelH);
    addRibbonTitle(this, width / 2, panelY - panelH / 2, Math.min(panelW * 0.8, 440), Phaser.Math.Clamp(height * 0.15, 44, 84), t('quit.ask'));

    const stayH = Phaser.Math.Clamp(height * 0.19, 52, 96);
    const stayW = Math.min(panelW * 0.54, stayH * 3.8);
    const leaveH = stayH * 0.78;
    const leaveW = Math.min(panelW * 0.3, leaveH * 2.6);
    const gap = panelW * 0.04;
    const left = width / 2 - (stayW + gap + leaveW) / 2;
    const y = panelY + panelH * 0.08;
    this.stay = addPillButton(this, left + stayW / 2, y, stayW, stayH, { color: 'green', icon: 'play', label: t('quit.stay'), onTap: () => this.close() });
    this.yes = addPillButton(this, left + stayW + gap + leaveW / 2, y, leaveW, leaveH, { color: 'red', label: t('quit.leave'), onTap: () => this.onConfirm() });
    restartOnResize(this);
  }

  /** Botón que confirma la salida. */
  yesPos(): Vec {
    return { x: this.yes.x, y: this.yes.y };
  }

  stayPos(): Vec {
    return { x: this.stay.x, y: this.stay.y };
  }

  close(): void {
    if (!this.scene.isActive()) return;
    sfx.play('tap');
    this.scene.stop();
    this.scene.resume('World');
  }
}
