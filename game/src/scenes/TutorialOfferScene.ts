import * as Phaser from 'phaser';
import type { Vec } from '../core/movement';
import { t } from '../data/strings';
import { sfx } from '../systems/audio';
import { bus } from '../systems/events';
import { getSession } from '../systems/session';
import { addEmoji } from '../ui/text';
import { addPanel, addPillButton, addVeil } from '../ui/widgets';
import type { TutorialSceneData } from './TutorialScene';

/**
 * Aviso de la primera vez: «¿aprendemos a jugar?». Como el de votar: un dibujo y dos botones grandes,
 * ▶ Aprender y ✕ Saltar, que se entienden sin leer. Sale una vez; luego queda el botón del menú.
 */
export class TutorialOfferScene extends Phaser.Scene {
  /** Ya se ha contado en Matomo: al volver a montarse por un giro no se cuenta otra vez. */
  private counted = false;
  private learn: Phaser.GameObjects.Container | null = null;
  private skipButton: Phaser.GameObjects.Container | null = null;
  private done = false;

  constructor() {
    super('TutorialOffer');
  }

  init(): void {
    this.learn = null;
    this.skipButton = null;
    this.done = false;
  }

  create(): void {
    const { width, height } = this.scale;
    addVeil(this);
    const panelW = Math.min(width * 0.62, 520);
    const panelH = Math.min(height * 0.8, 420);
    const cx = width / 2;
    const cy = height / 2;
    addPanel(this, cx, cy, panelW, panelH);
    // El dibujo: una mano que toca a un animalito.
    addEmoji(this, cx - panelH * 0.08, cy - panelH * 0.14, '🐐', panelH * 0.26);
    const hand = addEmoji(this, cx + panelH * 0.1, cy - panelH * 0.06, '👆', panelH * 0.2);
    this.tweens.add({ targets: hand, y: hand.y - panelH * 0.05, duration: 450, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    const button = Phaser.Math.Clamp(panelH * 0.22, 56, 100);
    const w = Math.min(panelW * 0.42, button * 2.6);
    const y = cy + panelH * 0.3;
    this.learn = addPillButton(this, cx - w / 2 - 10, y, w, button, { color: 'green', icon: 'play', label: t('tutorial.learn'), onTap: () => this.start() });
    this.skipButton = addPillButton(this, cx + w / 2 + 10, y, w, button, { color: 'red', icon: 'close', label: t('tutorial.skip'), onTap: () => this.skip() });
    if (!this.counted) bus.emit('tutorial-offered', {});
    this.counted = true;
    sfx.play('coin');
    this.scale.once(Phaser.Scale.Events.RESIZE, this.onResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize, this));
  }

  private onResize(): void {
    if (this.scene.isActive()) this.scene.restart();
  }

  start(): void {
    this.finish(true);
  }

  skip(): void {
    this.finish(false);
  }

  private finish(learn: boolean): void {
    if (this.done || !this.scene.isActive()) return;
    this.done = true;
    sfx.play('tap');
    void getSession().markLessonOffered('inicio');
    bus.emit('tutorial-answered', { learn });
    this.counted = false;
    this.scene.stop();
    this.scene.resume('World', { from: 'notice' });
    if (learn) this.scene.launch('Tutorial', { from: 'aviso' } satisfies TutorialSceneData);
  }

  // --- API para pruebas ---

  learnPos(): Vec | null {
    return this.learn ? { x: this.learn.x, y: this.learn.y } : null;
  }

  skipPos(): Vec | null {
    return this.skipButton ? { x: this.skipButton.x, y: this.skipButton.y } : null;
  }
}
