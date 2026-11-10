import * as Phaser from 'phaser';
import type { Vec } from '../core/movement';
import { t } from '../data/strings';
import { sfx } from '../systems/audio';
import { bus } from '../systems/events';
import { getSession } from '../systems/session';
import type { LessonId } from '../core/tutorial';
import { addRedCross } from '../ui/redCross';
import { addEmoji, addUiText } from '../ui/text';
import { textStyle } from '../ui/theme';
import { wrapStyle } from '../ui/wrap';
import { addPanel, addPillButton, addVeil } from '../ui/widgets';
import type { TutorialSceneData } from './TutorialScene';

/** Qué lección ofrece: la de inicio (al empezar) o la de la limpieza o la clínica (al salir de la tienda). */
export interface TutorialOfferSceneData {
  lesson?: LessonId;
}

/** Frase de cada lección (la de inicio no lleva: se entiende con el dibujo). */
const OFFER_TEXT = { limpieza: 'lesson.clean.offer', clinica: 'lesson.clinic.offer' } as const;

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
  private lesson: LessonId = 'inicio';

  constructor() {
    super('TutorialOffer');
  }

  init(data: TutorialOfferSceneData = {}): void {
    this.lesson = data.lesson ?? 'inicio';
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
    this.drawPicture(cx, cy, panelW, panelH);
    if (this.lesson !== 'inicio') {
      // La frase, debajo del dibujo y encima de los botones: encoge hasta caber en su hueco, en cualquier idioma.
      const maxW = panelW * 0.86;
      const maxH = panelH * 0.2;
      let size = Math.round(Phaser.Math.Clamp(panelH * 0.06, 16, 26));
      const text = addUiText(this, cx, cy + panelH * 0.08, t(OFFER_TEXT[this.lesson]), { ...textStyle(size, '#fff8e1'), align: 'center', wordWrap: wrapStyle(maxW) }).setOrigin(0.5);
      while ((text.height > maxH || text.width > maxW) && size > 10) {
        size -= 1;
        text.setFontSize(size);
      }
    }

    const button = Phaser.Math.Clamp(panelH * 0.22, 56, 100);
    const w = Math.min(panelW * 0.42, button * 2.6);
    const y = cy + panelH * 0.3;
    this.learn = addPillButton(this, cx - w / 2 - 10, y, w, button, { color: 'green', icon: 'play', label: t('tutorial.learn'), onTap: () => this.start() });
    this.skipButton = addPillButton(this, cx + w / 2 + 10, y, w, button, { color: 'red', icon: 'close', label: t('tutorial.skip'), onTap: () => this.skip() });
    if (!this.counted) bus.emit('tutorial-offered', { lesson: this.lesson });
    this.counted = true;
    sfx.play('coin');
    this.scale.once(Phaser.Scale.Events.RESIZE, this.onResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize, this));
  }

  /** El dibujo de cada lección: una mano que toca a un animalito, a un cerdito manchado de barro o la cruz de la clínica. */
  private drawPicture(cx: number, cy: number, _panelW: number, panelH: number): void {
    // Con frase, el dibujo sube y encoge un poco para dejarle sitio.
    const lift = this.lesson === 'inicio' ? 0 : panelH * 0.06;
    const size = this.lesson === 'inicio' ? 1 : 0.8;
    const ax = cx - panelH * 0.08;
    const ay = cy - panelH * 0.14 - lift;
    if (this.lesson === 'clinica') {
      addRedCross(this, ax, ay, panelH * 0.2 * size);
    } else {
      addEmoji(this, ax, ay, this.lesson === 'limpieza' ? '🐷' : '🐐', panelH * 0.26 * size);
      if (this.lesson === 'limpieza') {
        // Manchas de barro encima del cerdito.
        const r = panelH * 0.02;
        for (const [dx, dy, k] of [[-0.05, -0.02, 1.2], [0.04, 0.03, 1], [-0.01, 0.06, 0.8], [0.06, -0.04, 0.7]] as const) {
          this.add.circle(ax + panelH * dx, ay + panelH * dy, r * k, 0x6d4c41, 0.9);
        }
      }
    }
    const hand = addEmoji(this, cx + panelH * 0.1, cy - panelH * 0.06 - lift, '👆', panelH * 0.2 * size);
    this.tweens.add({ targets: hand, y: hand.y - panelH * 0.05, duration: 450, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
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
    void getSession().markLessonOffered(this.lesson);
    bus.emit('tutorial-answered', { lesson: this.lesson, learn });
    this.counted = false;
    this.scene.stop();
    this.scene.resume('World', { from: 'notice' });
    if (learn) this.scene.launch('Tutorial', { from: 'aviso', lessons: [this.lesson] } satisfies TutorialSceneData);
  }

  // --- API para pruebas ---

  currentLesson(): LessonId {
    return this.lesson;
  }

  learnPos(): Vec | null {
    return this.learn ? { x: this.learn.x, y: this.learn.y } : null;
  }

  skipPos(): Vec | null {
    return this.skipButton ? { x: this.skipButton.x, y: this.skipButton.y } : null;
  }
}
