import * as Phaser from 'phaser';
import { CURE_DOSES, MEDICINES, type MedicineId } from '../core/care';
import { isDropOnTarget } from '../core/interaction';
import type { Vec } from '../core/movement';
import { findResident } from '../data/pens';
import { t, type StringKey } from '../data/strings';
import { sfx } from '../systems/audio';
import { bus } from '../systems/events';
import { getSession } from '../systems/session';
import { sceneryTexture } from '../ui/paint';
import { addEmoji, addUiText, fitText, type UiText } from '../ui/text';
import { textStyle } from '../ui/theme';
import { HUD_COIN, addCloseBadge, addPanel, addRibbonTitle, addTile, addVeil, restartOnResize } from '../ui/widgets';
import { animalPortrait } from '../world/Actors';

export interface CureSceneData {
  residentId: string;
}

const MEDICINE_EMOJI: Readonly<Record<MedicineId, string>> = { pastilla: '💊', vendaje: '🩹', jarabe: '🧴', termometro: '🌡️' };
/** Margen (px) alrededor del animal para que soltar «cerca» cuente. */
const DROP_MARGIN = 48;
const FX_DEPTH = 60;

/**
 * Curar a un animal malito en la clínica: como dar de comer, con medicinas. Da igual el orden; cada una que
 * se le da llena la barra. Al llenarla queda curado. Cerrar a medias no cambia nada.
 */
export class CureScene extends Phaser.Scene {
  private residentId = 'bills';
  private doses = 0;
  private done = false;
  private animal!: Phaser.GameObjects.Sprite | Phaser.GameObjects.Text;
  private sad!: Phaser.GameObjects.Text;
  private label!: UiText;
  private bar!: Phaser.GameObjects.Graphics;
  private barRect = { x: 0, y: 0, w: 0, h: 0 };
  private readonly medicines = new Map<MedicineId, Phaser.GameObjects.Text>();
  private readonly homes = new Map<MedicineId, Vec>();
  private fx: Phaser.GameObjects.Text[] = [];

  constructor() {
    super('Cure');
  }

  init(data: CureSceneData): void {
    if (!findResident(data.residentId)) throw new Error(`Residente desconocido: ${data.residentId}`);
    this.residentId = data.residentId;
    this.doses = 0;
    this.done = false;
    this.medicines.clear();
    this.homes.clear();
    this.fx = [];
  }

  create(): void {
    const { width, height } = this.scale;
    const found = findResident(this.residentId)!;
    addVeil(this);
    const panelW = Math.min(width * 0.88, 780);
    const panelH = height * 0.86;
    const panelY = height * 0.55;
    const top = panelY - panelH / 2;
    addPanel(this, width / 2, panelY, panelW, panelH);
    this.add.image(width / 2, height * 0.4, sceneryTexture(this, panelW * 0.9, height * 0.42));
    this.animal = animalPortrait(this, found.resident.species, width / 2, height * 0.42, height * 0.26, found.resident.look);
    // Se ve que está malito: carita triste encima hasta que se cura.
    this.sad = addEmoji(this, this.animal.x + this.animal.displayWidth * 0.45, this.animal.y - this.animal.displayHeight * 0.45, '🤒', height * 0.07).setDepth(20);
    this.tweens.add({ targets: this.sad, scale: 1.15, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    // Malito: pálido y quieto, respirando despacio.
    if (this.animal instanceof Phaser.GameObjects.Sprite) this.animal.setTint(0xd7e3d0);
    this.tweens.add({ targets: this.animal, scaleY: this.animal.scaleY * 0.97, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    addRibbonTitle(this, width / 2, top, Math.min(panelW * 0.6, 440), Phaser.Math.Clamp(height * 0.14, 40, 80), t(`book.page.${this.residentId}.title` as StringKey));
    const small = Math.round(Phaser.Math.Clamp(height * 0.045, 15, 26));
    this.label = addUiText(this, width / 2, height * 0.66, t('cure.sick'), textStyle(Math.round(small * 1.15), '#ffffff', '#4e342e')).setOrigin(0.5).setDepth(20);
    fitText(this.label, width * 0.8);
    this.barRect = { w: panelW * 0.5, h: Math.max(10, height * 0.025), x: width / 2 - panelW * 0.25, y: height * 0.7 };
    this.bar = this.add.graphics().setDepth(20);
    this.drawBar();

    this.createTray(width, height, panelW);
    const badge = Phaser.Math.Clamp(height * 0.13, 44, 64);
    addCloseBadge(this, width / 2 + panelW / 2 - badge * 0.35, top + badge * 0.35, () => this.close(), badge);
    restartOnResize(this);
    this.input.on(Phaser.Input.Events.DRAG_START, this.onDragStart, this);
    this.input.on(Phaser.Input.Events.DRAG, this.onDrag, this);
    this.input.on(Phaser.Input.Events.DRAG_END, this.onDragEnd, this);
    this.input.keyboard?.on('keydown-ESC', this.close, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off(Phaser.Input.Events.DRAG_START, this.onDragStart, this);
      this.input.off(Phaser.Input.Events.DRAG, this.onDrag, this);
      this.input.off(Phaser.Input.Events.DRAG_END, this.onDragEnd, this);
      this.input.keyboard?.off('keydown-ESC', this.close, this);
    });
    bus.emit('cure-opened', { residentId: this.residentId });
  }

  close(): void {
    if (!this.scene.isActive()) return;
    bus.emit('cure-closed', { residentId: this.residentId, done: this.done });
    this.scene.stop();
    this.scene.resume('Clinic', { from: 'cure' });
  }

  /** Dosis dadas (para pruebas). */
  dosesGiven(): number {
    return this.doses;
  }

  /** Dónde están el animal y cada medicina (para pruebas). */
  targetsOnScreen(): { animal: Vec; medicines: Partial<Record<MedicineId, Vec>> } {
    const medicines: Partial<Record<MedicineId, Vec>> = {};
    for (const [id, home] of this.homes) medicines[id] = { ...home };
    return { animal: { x: this.animal.x, y: this.animal.y }, medicines };
  }

  /** Se le da una medicina. Lo usan el arrastre y las pruebas. */
  give(id: MedicineId): void {
    if (this.done) return;
    this.doses = Math.min(CURE_DOSES, this.doses + 1);
    sfx.play('come');
    const item = this.pooled(MEDICINE_EMOJI[id], Math.round(this.scale.height * 0.06)).setPosition(this.animal.x, this.animal.y);
    this.tweens.add({ targets: item, y: item.y - 60, alpha: 0, duration: 700, onComplete: () => item.setVisible(false) });
    this.tweens.add({ targets: this.animal, y: this.animal.y - 10, duration: 120, yoyo: true });
    this.drawBar();
    if (this.doses >= CURE_DOSES) void this.finish();
  }

  private createTray(width: number, height: number, panelW: number): void {
    const size = Phaser.Math.Clamp(Math.round(height * 0.11), 48, 88);
    const tile = Math.round(size * 1.4);
    const y = height * 0.82;
    const gap = Math.min((panelW * 0.9) / MEDICINES.length, tile * 1.2);
    MEDICINES.forEach((id, index) => {
      const x = width / 2 + (index - (MEDICINES.length - 1) / 2) * gap;
      addTile(this, x, y, tile, tile);
      const item = addEmoji(this, x, y, MEDICINE_EMOJI[id], size).setInteractive({ draggable: true, useHandCursor: true }).setDepth(10);
      item.setData('medicine', id);
      this.medicines.set(id, item);
      this.homes.set(id, { x, y });
    });
  }

  private onDragStart(_pointer: Phaser.Input.Pointer, item: Phaser.GameObjects.Text): void {
    if (this.done) return;
    this.tweens.killTweensOf(item);
    item.setScale(1.2).setDepth(40);
    sfx.play('tap');
  }

  private onDrag(_pointer: Phaser.Input.Pointer, item: Phaser.GameObjects.Text, dragX: number, dragY: number): void {
    if (!this.done) item.setPosition(dragX, dragY);
  }

  private onDragEnd(pointer: Phaser.Input.Pointer, item: Phaser.GameObjects.Text): void {
    const id = item.getData('medicine') as MedicineId;
    const b = this.animal.getBounds();
    if (!this.done && isDropOnTarget({ x: pointer.x, y: pointer.y }, { x: b.x, y: b.y, width: b.width, height: b.height }, DROP_MARGIN)) this.give(id);
    const home = this.homes.get(id)!;
    item.setDepth(10);
    this.tweens.add({ targets: item, x: home.x, y: home.y, scale: 1, duration: 250, ease: 'Back.easeOut' });
  }

  private drawBar(): void {
    const { x, y, w, h } = this.barRect;
    const full = this.doses / CURE_DOSES;
    this.bar.clear();
    this.bar.fillStyle(0x4e342e, 1).fillRoundedRect(x - 3, y - 3, w + 6, h + 6, (h + 6) / 2);
    this.bar.fillStyle(0xfff8e1, 1).fillRoundedRect(x, y, w, h, h / 2);
    if (full > 0) this.bar.fillStyle(0xef5350, 1).fillRoundedRect(x, y, Math.max(h, w * full), h, h / 2);
  }

  private async finish(): Promise<void> {
    this.done = true;
    const coins = await getSession().cureAnimal(this.residentId);
    sfx.play('especial');
    this.tweens.killTweensOf(this.sad);
    this.sad.setText('😊');
    if (this.animal instanceof Phaser.GameObjects.Sprite) this.animal.clearTint();
    this.label.setText(t('cure.done'));
    fitText(this.label, this.scale.width * 0.8);
    this.tweens.add({ targets: this.animal, y: this.animal.y - 24, duration: 160, yoyo: true, repeat: 2, ease: 'Quad.easeOut' });
    for (let i = 0; i < 8; i++) {
      const heart = this.pooled(['❤️', '💕', '💖'][i % 3]!, Math.round(this.scale.height * 0.06)).setPosition(this.animal.x + Phaser.Math.Between(-60, 60), this.animal.y);
      heart.setScale(0);
      this.tweens.add({ targets: heart, y: heart.y - 80, scale: 1, alpha: 0, delay: i * 100, duration: 1000, onComplete: () => heart.setVisible(false) });
    }
    for (let i = 0; i < coins; i++) {
      const coin = this.pooled('🪙', 36).setPosition(this.animal.x, this.animal.y);
      this.tweens.add({ targets: coin, x: HUD_COIN.x, y: HUD_COIN.y, scale: 0.6, delay: i * 120, duration: 600, ease: 'Cubic.easeIn', onComplete: () => {
        coin.setVisible(false);
        sfx.play('coin');
      } });
    }
    this.time.delayedCall(1800, () => this.close());
  }

  private pooled(text: string, fontSize: number): Phaser.GameObjects.Text {
    let item = this.fx.find((candidate) => !candidate.visible);
    if (!item) {
      item = this.add.text(0, 0, '').setOrigin(0.5).setDepth(FX_DEPTH);
      this.fx.push(item);
    }
    return item.setText(text).setFontSize(fontSize).setVisible(true).setAlpha(1).setScale(1).setAngle(0);
  }
}
