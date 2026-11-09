import * as Phaser from 'phaser';
import { idleFrame } from '../art/art';
import { CLEAN_EFFORT, CLEAN_STEPS, FACES, faceFacing, isDone, isStepEnabled, startCleaning, stroke, type CleanStep, type CleaningState } from '../core/cleaning';
import type { Vec } from '../core/movement';
import { findResident } from '../data/pens';
import { t, type StringKey } from '../data/strings';
import { sfx } from '../systems/audio';
import { bus } from '../systems/events';
import { getSession } from '../systems/session';
import { sceneryTexture } from '../ui/paint';
import { addEmoji, addUiText, fitText, type UiText } from '../ui/text';
import { textStyle } from '../ui/theme';
import { wrapStyle } from '../ui/wrap';
import { HUD_COIN, addCloseBadge, addPanel, addRibbonTitle, addTile, addVeil, restartOnResize } from '../ui/widgets';
import { animalPortrait } from '../world/Actors';

export interface CleanSceneData {
  residentId: string;
}

/** Herramienta de cada paso. */
const TOOL_EMOJI: Readonly<Record<CleanStep, string>> = { cacahuete: '🥜', cepillo: '🪥', jabon: '🧼', agua: '🚿', toalla: '🧺' };
/** Lo que sale al pasar la herramienta: miguitas, polvo de barro, burbujas, gotas y brillos. */
const TRAIL_EMOJI: Readonly<Record<CleanStep, string>> = { cacahuete: '😋', cepillo: '💨', jabon: '🫧', agua: '💧', toalla: '✨' };
/** Margen (px) alrededor del animal: frotar "casi encima" también cuenta. */
const RUB_MARGIN = 24;
/** Cada cuánto recorrido sale un adorno del rastro. */
const TRAIL_EVERY = 28;
/** Herramientas apagadas: se ven, pero claramente que no toca. */
const OFF_ALPHA = 0.3;
const MUD = 0x6d4c41;
const FX_DEPTH = 60;

type Portrait = Phaser.GameObjects.Sprite | Phaser.GameObjects.Text;

/**
 * La limpieza: como dar de comer, pero con 5 herramientas en orden. Solo se puede usar la del paso que toca
 * (las demás, apagadas) y se pasa el dedo por encima del animal hasta llenar la barra. Cerrarla a medias no
 * cambia nada: el animal sigue sucio y la próxima vez se empieza de cero.
 */
export class CleanScene extends Phaser.Scene {
  private residentId = 'rosita';
  private cleaning: CleaningState = startCleaning();
  private animal!: Portrait;
  private baseScale = 1;
  private home: Vec = { x: 0, y: 0 };
  private spots!: Phaser.GameObjects.Graphics;
  private pool!: Phaser.GameObjects.Graphics;
  private bar!: Phaser.GameObjects.Graphics;
  private barRect = { x: 0, y: 0, w: 0, h: 0 };
  private stepText!: UiText;
  private whyText!: UiText;
  private faceText!: UiText;
  private readonly tools = new Map<CleanStep, Phaser.GameObjects.Text>();
  private readonly toolHomes = new Map<CleanStep, Vec>();
  private dragging: { step: CleanStep; last: Vec | null } | null = null;
  private trail = 0;
  private finished = false;
  private fx: Phaser.GameObjects.Text[] = [];

  constructor() {
    super('Clean');
  }

  init(data: CleanSceneData): void {
    if (!findResident(data.residentId)) throw new Error(`Residente desconocido: ${data.residentId}`);
    this.residentId = data.residentId;
    this.cleaning = startCleaning();
    this.tools.clear();
    this.toolHomes.clear();
    this.dragging = null;
    this.trail = 0;
    this.finished = false;
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

    this.home = { x: width / 2, y: height * 0.42 };
    // La piscina de agua tibia, debajo del animal: se ve en el paso del agua.
    this.pool = this.add.graphics().setVisible(false);
    this.animal = animalPortrait(this, found.resident.species, this.home.x, this.home.y, height * 0.26, found.resident.look);
    this.baseScale = this.animal.scaleX;
    this.spots = this.add.graphics().setPosition(this.home.x, this.home.y);
    this.drawSpots(1);
    this.drawPool();

    addRibbonTitle(this, width / 2, top, Math.min(panelW * 0.6, 440), Phaser.Math.Clamp(height * 0.14, 40, 80), t(`book.page.${this.residentId}.title` as StringKey));
    const small = Math.round(Phaser.Math.Clamp(height * 0.045, 15, 26));
    this.whyText = addUiText(this, width / 2, top + height * 0.12, t('clean.why.cacahuete'), { ...textStyle(small, '#fff59d', '#4e342e'), align: 'center', wordWrap: wrapStyle(panelW * 0.85) })
      .setOrigin(0.5, 0)
      .setDepth(20);
    this.faceText = addUiText(this, width / 2, this.home.y + height * 0.15, '', textStyle(small, '#ffffff', '#4e342e')).setOrigin(0.5).setDepth(20);
    this.stepText = addUiText(this, width / 2, height * 0.66, '', textStyle(Math.round(small * 1.15), '#ffffff', '#4e342e')).setOrigin(0.5).setDepth(20);
    this.barRect = { w: panelW * 0.5, h: Math.max(10, height * 0.025), x: width / 2 - panelW * 0.25, y: height * 0.7 };
    this.bar = this.add.graphics().setDepth(20);

    this.createTools(width, height, panelW);
    const badge = Phaser.Math.Clamp(height * 0.13, 44, 64);
    addCloseBadge(this, width / 2 + panelW / 2 - badge * 0.35, top + badge * 0.35, () => this.close(), badge);
    restartOnResize(this);
    this.refresh();

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
    bus.emit('clean-opened', { residentId: this.residentId });
  }

  close(): void {
    if (!this.scene.isActive()) return;
    bus.emit('clean-closed', { residentId: this.residentId, done: isDone(this.cleaning) });
    this.scene.stop();
    this.scene.resume('World', { from: 'clean' });
  }

  /** A quién se está limpiando. */
  resident(): string {
    return this.residentId;
  }

  /** Paso, progreso y cara (para pruebas). */
  state(): CleaningState {
    return this.cleaning;
  }

  /** Dónde están el animal y la herramienta del paso actual (para pruebas). */
  targetsOnScreen(): { animal: Vec; tool: Vec | null } {
    const step = this.cleaning.step;
    const tool = step === 'hecho' ? null : (this.toolHomes.get(step) ?? null);
    return { animal: { ...this.home }, tool: tool ? { ...tool } : null };
  }

  /**
   * Se ha frotado `distance` px sobre el animal con la herramienta que toca. Lo usan el arrastre y las
   * pruebas: así las dos hacen exactamente lo mismo.
   */
  rub(distance: number, at: Vec = this.home): void {
    if (this.finished || isDone(this.cleaning)) return;
    const before = this.cleaning;
    this.cleaning = stroke(before, distance);
    if (this.cleaning === before) return;
    this.trail += distance;
    while (this.trail >= TRAIL_EVERY) {
      this.trail -= TRAIL_EVERY;
      this.sparkle(before.step === 'hecho' ? 'toalla' : before.step, at);
    }
    if (this.cleaning.step !== before.step || this.cleaning.face !== before.face) this.stepDone(before);
    this.refresh();
    if (isDone(this.cleaning)) void this.finish();
  }

  private createTools(width: number, height: number, panelW: number): void {
    const size = Phaser.Math.Clamp(Math.round(height * 0.1), 44, 80);
    const tile = Math.round(size * 1.4);
    const y = height * 0.82;
    const gap = Math.min((panelW * 0.9) / CLEAN_STEPS.length, tile * 1.15);
    CLEAN_STEPS.forEach((step, index) => {
      const x = width / 2 + (index - (CLEAN_STEPS.length - 1) / 2) * gap;
      addTile(this, x, y, tile, tile);
      // El número del paso, para que se vea el orden aunque no se sepa leer.
      addUiText(this, x - tile * 0.36, y - tile * 0.36, String(index + 1), textStyle(Math.round(size * 0.32), '#ffffff', '#4e342e')).setOrigin(0.5).setDepth(5);
      const tool = addEmoji(this, x, y, TOOL_EMOJI[step], size).setInteractive({ draggable: true, useHandCursor: true }).setDepth(10);
      tool.setData('step', step);
      this.tools.set(step, tool);
      this.toolHomes.set(step, { x, y });
    });
  }

  private onDragStart(_pointer: Phaser.Input.Pointer, tool: Phaser.GameObjects.Text): void {
    const step = tool.getData('step') as CleanStep;
    if (this.finished || !isStepEnabled(this.cleaning, step)) {
      // La que no toca tiembla un poquito: «esta todavía no».
      this.tweens.add({ targets: tool, angle: 12, duration: 60, yoyo: true, repeat: 2 });
      return;
    }
    this.tweens.killTweensOf(tool);
    tool.setAngle(0).setScale(1.2).setDepth(40);
    this.dragging = { step, last: null };
    sfx.play('tap');
  }

  private onDrag(pointer: Phaser.Input.Pointer, tool: Phaser.GameObjects.Text, dragX: number, dragY: number): void {
    if (!this.dragging || this.dragging.step !== tool.getData('step')) return;
    // La herramienta va un poco por encima del dedo, para que se vea lo que se frota.
    tool.setPosition(dragX, dragY - tool.displayHeight * 0.3);
    const at = { x: pointer.x, y: pointer.y };
    const bounds = this.animal.getBounds();
    const over =
      at.x >= bounds.x - RUB_MARGIN && at.x <= bounds.right + RUB_MARGIN && at.y >= bounds.y - RUB_MARGIN && at.y <= bounds.bottom + RUB_MARGIN;
    const last = this.dragging.last;
    this.dragging.last = over ? at : null;
    if (over && last) this.rub(Math.hypot(at.x - last.x, at.y - last.y), at);
  }

  private onDragEnd(_pointer: Phaser.Input.Pointer, tool: Phaser.GameObjects.Text): void {
    const step = tool.getData('step') as CleanStep;
    if (this.dragging?.step === step) this.dragging = null;
    const home = this.toolHomes.get(step);
    if (!home) return;
    tool.setDepth(10);
    this.tweens.add({ targets: tool, x: home.x, y: home.y, scale: 1, duration: 250, ease: 'Back.easeOut', onComplete: () => this.refresh() });
  }

  /** Acaba un paso (o una cara del cepillado): saltito, sonido y, con el cepillo, el animal se gira. */
  private stepDone(before: CleaningState): void {
    sfx.play('come');
    this.tweens.add({ targets: this.animal, y: this.home.y - 14, duration: 140, yoyo: true, ease: 'Quad.easeOut' });
    if (before.step !== this.cleaning.step && this.dragging) {
      // La herramienta que se estaba usando ya no toca: vuelve a su sitio.
      const tool = this.tools.get(this.dragging.step);
      this.dragging = null;
      if (tool) this.onDragEnd(this.input.activePointer, tool);
    }
  }

  /** Pinta todo según el paso: herramientas, textos, barra, manchas, cara y piscina. */
  private refresh(): void {
    const { step, face, progress } = this.cleaning;
    for (const [id, tool] of this.tools) {
      const on = isStepEnabled(this.cleaning, id);
      tool.setAlpha(on ? 1 : OFF_ALPHA);
      if (on && !this.dragging && !this.tweens.isTweening(tool)) {
        this.tweens.add({ targets: tool, scale: 1.12, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      } else if (!on) {
        this.tweens.killTweensOf(tool);
        tool.setScale(1).setAngle(0);
      }
    }
    this.whyText.setVisible(step === 'cacahuete');
    this.stepText.setText(step === 'hecho' ? t('clean.done') : t(`clean.step.${step}` as StringKey));
    fitText(this.stepText, this.scale.width * 0.8);
    this.faceText.setVisible(step === 'cepillo').setText(t(`clean.face.${face}` as StringKey));
    this.showFace(step === 'cepillo' ? face : 'frente');

    // Las manchas se van con el cepillo, cara a cara.
    const brushed = step === 'cacahuete' ? 0 : step === 'cepillo' ? (FACES.indexOf(face) + progress / CLEAN_EFFORT.cepillo) / FACES.length : 1;
    this.drawSpots(1 - brushed);
    this.pool.setVisible(step === 'agua');

    const { x, y, w, h } = this.barRect;
    const full = step === 'hecho' ? 1 : progress / CLEAN_EFFORT[step];
    this.bar.clear();
    this.bar.fillStyle(0x4e342e, 1).fillRoundedRect(x - 3, y - 3, w + 6, h + 6, (h + 6) / 2);
    this.bar.fillStyle(0xfff8e1, 1).fillRoundedRect(x, y, w, h, h / 2);
    if (full > 0) this.bar.fillStyle(0x66bb6a, 1).fillRoundedRect(x, y, Math.max(h, w * full), h, h / 2);
  }

  /** Gira el retrato: con arte, la fila de su dibujo; sin arte, el emoji se voltea y se da la vuelta. */
  private showFace(face: (typeof FACES)[number]): void {
    const facing = faceFacing(face);
    if (this.animal instanceof Phaser.GameObjects.Sprite) {
      this.animal.setFrame(idleFrame(facing));
      return;
    }
    this.animal.setFlipX(facing === 'right').setAngle(facing === 'up' ? 180 : 0).setAlpha(facing === 'up' ? 0.85 : 1);
  }

  /** Manchas de barro encima del animal; `amount` de 0 (limpio) a 1 (todo el barro). Siempre en el mismo sitio. */
  private drawSpots(amount: number): void {
    this.spots.clear();
    if (amount <= 0) return;
    const w = this.animal.displayWidth;
    const h = this.animal.displayHeight;
    let seed = [...this.residentId].reduce((s, c) => s + c.charCodeAt(0), 0);
    const rand = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    this.spots.fillStyle(MUD, 0.85 * amount);
    for (let i = 0; i < 6; i++) {
      const r = (0.07 + rand() * 0.07) * Math.min(w, h) * (0.4 + 0.6 * amount);
      this.spots.fillCircle((rand() - 0.5) * w * 0.6, (rand() - 0.35) * h * 0.5, r);
    }
  }

  private drawPool(): void {
    const w = this.animal.displayWidth * 1.5;
    const y = this.home.y + this.animal.displayHeight * 0.35;
    this.pool.clear();
    this.pool.fillStyle(0x4e342e, 1).fillEllipse(this.home.x, y, w + 10, w * 0.38 + 10);
    this.pool.fillStyle(0x4fc3f7, 1).fillEllipse(this.home.x, y, w, w * 0.38);
    this.pool.fillStyle(0xb3e5fc, 1).fillEllipse(this.home.x - w * 0.15, y - w * 0.05, w * 0.4, w * 0.1);
  }

  /** Un adorno que sube y se desvanece donde se frota. */
  private sparkle(step: CleanStep, at: Vec): void {
    const item = this.pooled(TRAIL_EMOJI[step], Math.round(this.scale.height * 0.05)).setPosition(at.x, at.y);
    item.setScale(0.4);
    this.tweens.add({
      targets: item,
      y: at.y - Phaser.Math.Between(30, 70),
      x: at.x + Phaser.Math.Between(-30, 30),
      scale: 1,
      alpha: 0,
      duration: 700,
      ease: 'Sine.easeOut',
      onComplete: () => item.setVisible(false),
    });
  }

  private async finish(): Promise<void> {
    this.finished = true;
    this.dragging = null;
    sfx.play('especial');
    this.tweens.killTweensOf(this.animal);
    this.animal.setScale(this.baseScale).setPosition(this.home.x, this.home.y);
    this.tweens.add({ targets: this.animal, y: this.home.y - 24, duration: 160, yoyo: true, repeat: 2, ease: 'Quad.easeOut' });
    const coins = await getSession().cleanAnimal(this.residentId);
    for (let i = 0; i < 8; i++) this.time.delayedCall(i * 90, () => this.sparkle('toalla', { x: this.home.x + Phaser.Math.Between(-60, 60), y: this.home.y }));
    for (let i = 0; i < coins; i++) {
      const coin = this.pooled('🪙', 36).setPosition(this.home.x, this.home.y);
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
