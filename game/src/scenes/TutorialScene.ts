import * as Phaser from 'phaser';
import type { Vec } from '../core/movement';
import { cleanPractice, sickPractice } from '../core/lessons';
import {
  CLEAN_LESSON_STEPS,
  COINS_SHOW_MS,
  MOVE_DISTANCE,
  advance,
  advanceClean,
  advanceClinic,
  goodFood,
  type CleanLessonStep,
  type ClinicLessonStep,
  type LessonEvent,
  type LessonId,
  type TutorialEvent,
  type TutorialStep,
} from '../core/tutorial';
import { findResident } from '../data/pens';
import { bus } from '../systems/events';
import { getSession } from '../systems/session';
import { edgeHint } from '../core/guideArt';
import { addHand } from '../ui/hand';
import { addIcon } from '../ui/icons';
import { addShopBubble, pawTexture, setBubbleTail } from '../ui/pixelArt';
import { addEmoji } from '../ui/text';
import { HUD_CLINIC, HUD_COIN, HUD_SHOP, addCloseBadge } from '../ui/widgets';
import type { CleanScene } from './CleanScene';
import type { ClinicScene } from './ClinicScene';
import type { CureScene } from './CureScene';
import type { FeedScene } from './FeedScene';
import type { HudScene } from './HudScene';
import type { WorldScene } from './WorldScene';

/** Margen (px) del borde de la pantalla: un sitio del mapa fuera de ella se señala desde aquí, con un bocadillo. */
const EDGE = 56;
/** Escala del bocadillo del borde (32 px de dibujo). */
const BUBBLE_SCALE = 2;
/** Duración de cada gesto de la mano (ms). */
const TAP_MS = 1200;
const DRAG_MS = 1800;
/** Arrastre que frota (herramientas de la limpieza): más largo, para que se vea el vaivén encima del animal. */
const RUB_MS = 2400;
/** Si la cuidadora no ha llegado a la clínica en este rato (se ha ido a otro sitio), la mano señala su botón. Largo: los peques tardan en hacer caso (David, 2026-11-10). */
const CLINIC_WAIT_MS = 15_000;
/** Si las huellas hasta el animal se acaban (pisadas o pasado su rato) sin haber llegado, vuelven a salir a este rato. */
const TRAIL_AGAIN_MS = 3000;
/**
 * Dónde va la ✕ que cierra el tutorial: en la columna de las monedas, debajo del hueco del botón de la clínica (aunque
 * aún no se vea), para no taparlo (David, 2026-11-10). Arriba a la derecha no: ahí está la ✕ de la tienda y la clínica.
 */
export const CLOSE_AT: Vec = { x: HUD_CLINIC.x, y: HUD_CLINIC.y + (HUD_CLINIC.y - HUD_SHOP.y) - 10 };

/**
 * Desde dónde se abre (el aviso o el botón Aprender del menú, para Matomo) y qué lecciones hace, seguidas y sin
 * pausa: la de inicio por defecto; el menú añade detrás la de limpieza y la de clínica si ya las tiene.
 */
export interface TutorialSceneData {
  from?: 'aviso' | 'menu';
  lessons?: LessonId[];
}

type LessonStep = TutorialStep | CleanLessonStep | ClinicLessonStep;
type AnyEvent = TutorialEvent | LessonEvent;
/** Pasos de la limpieza que se hacen dentro (cada herramienta). */
const TOOL_STEPS: readonly string[] = CLEAN_LESSON_STEPS.slice(1);

/**
 * `ui`: el sitio es de la interfaz (contador, botón de la tienda), en coordenadas de pantalla: se señala tal cual.
 * Si no, es un sitio del mapa: si se sale de la pantalla, la mano va al borde, junto a un bocadillo que apunta hacia él.
 * `rub`: el arrastre acaba frotando encima del animal (herramientas de la limpieza).
 */
type Gesture = { kind: 'tap'; at: Vec; ui?: boolean } | { kind: 'drag'; from: Vec; to: Vec; rub?: boolean };

/**
 * El tutorial, sin palabras: una mano encima del juego hace el gesto junto a lo que hay que tocar y
 * no pasa al siguiente hasta que el jugador lo hace. No tapa los toques (solo su ✕ es tocable).
 * Lleva una cola de lecciones (inicio, limpieza, clínica) que se hacen seguidas; la ✕ corta toda la cola.
 */
export class TutorialScene extends Phaser.Scene {
  private queue: LessonId[] = [];
  private lesson: LessonId = 'inicio';
  private step: LessonStep = 'move';
  /** El animal de la práctica (limpieza y clínica): la mano lo señala a él. */
  private practiceId: string | null = null;
  /** Animal al que van las huellas de Luna del paso actual, y cuándo se encendieron por última vez. */
  private trailTo: string | null = null;
  private trailAt = 0;
  /** Lo preparado para la lección que empieza (se cuenta en Matomo justo después de `tutorial-started`). */
  private prepared: { lesson: 'limpieza' | 'clinica'; residentId: string; already: boolean } | null = null;
  private moveFrom: Vec | null = null;
  private clock = 0;
  private gesture: Gesture | null = null;
  private hand!: Phaser.GameObjects.Image | Phaser.GameObjects.Text;
  private handScale = 1;
  private ring!: Phaser.GameObjects.Arc;
  private bubble!: Phaser.GameObjects.Container;
  private joystick!: Phaser.GameObjects.Container;
  private coinsTimer: Phaser.Time.TimerEvent | null = null;
  private closeBadge: Phaser.GameObjects.Container | null = null;
  private from: 'aviso' | 'menu' = 'menu';

  constructor() {
    super('Tutorial');
  }

  init(data: TutorialSceneData = {}): void {
    this.from = data.from ?? 'menu';
    this.queue = [...(data.lessons ?? ['inicio'])];
    this.lesson = 'inicio';
    this.practiceId = null;
    this.trailTo = null;
    this.prepared = null;
    this.step = 'move';
    this.moveFrom = null;
    this.clock = 0;
    this.gesture = null;
    this.coinsTimer = null;
  }

  create(): void {
    this.ring = this.add.circle(0, 0, 20, 0xffffff, 0).setStrokeStyle(4, 0xffffff, 0.9).setVisible(false);
    this.bubble = addShopBubble(this, BUBBLE_SCALE, 'up', pawTexture(this)).setVisible(false);
    (this.bubble.list[1] as Phaser.GameObjects.Image).setTint(0x8d5a3b);
    this.hand = addHand(this).setVisible(false);
    this.handScale = this.hand.scaleX;
    // Junto al engranaje: el joystick existe, y se enciende ahí (paso de moverse).
    const stick = addIcon(this, 0, 0, 'joystick', 40);
    const toGear = addEmoji(this, -46, 0, '⬅️', 30);
    this.joystick = this.add.container(0, 0, [toGear, stick]).setVisible(false);
    this.tweens.add({ targets: toGear, x: -54, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    // Debajo de las monedas: arriba en el centro tapaba el título de la ventana de comer.
    this.closeBadge = addCloseBadge(this, CLOSE_AT.x, CLOSE_AT.y, () => this.finish(), 44);

    const offs = [
      bus.on('feed-opened', () => this.on({ type: 'feed-opened' })),
      bus.on('feed-closed', () => this.on({ type: 'feed-closed' })),
      bus.on('animal-fed', ({ coins }) => this.on({ type: 'fed', coins })),
      bus.on('shop-opened', () => this.on({ type: 'shop-opened' })),
      bus.on('clean-opened', () => this.on({ type: 'clean-opened' })),
      bus.on('clean-closed', ({ done }) => this.on({ type: 'clean-closed', done })),
      bus.on('sick-refused', () => this.on({ type: 'sick-refused' })),
      bus.on('clinic-requested', () => this.on({ type: 'clinic-requested' })),
      bus.on('clinic-opened', () => this.on({ type: 'clinic-opened' })),
      bus.on('clinic-closed', () => this.on({ type: 'clinic-closed' })),
      bus.on('cure-opened', () => this.on({ type: 'cure-opened' })),
      bus.on('cure-closed', ({ done }) => this.on({ type: 'cure-closed', done })),
    ];
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      offs.forEach((off) => off());
      // Se acaba el tutorial (o se cierra con la ✕): sus huellas se apagan.
      if (this.trailTo) this.scene.get<WorldScene>('World').hideResidentTrail();
      this.trailTo = null;
    });
    this.startNext();
  }

  /**
   * Empieza la siguiente lección de la cola. La de limpieza y la de clínica se preparan al momento: si no hay
   * ningún animal sucio o malito, se ensucia o se pone malito uno de los suyos. Si no se puede, esa se salta.
   * Sin más lecciones, se acaba.
   */
  private startNext(): void {
    this.coinsTimer?.remove();
    this.coinsTimer = null;
    for (;;) {
      const lesson = this.queue.shift();
      if (!lesson) {
        this.scene.stop();
        return;
      }
      if (lesson !== 'inicio' && !this.prepare(lesson)) continue;
      this.lesson = lesson;
      this.step = lesson === 'inicio' ? 'move' : lesson === 'limpieza' ? 'tap-dirty' : 'tap-sick';
      this.clock = 0;
      this.moveFrom = null;
      bus.emit('tutorial-started', { from: this.from, lesson });
      if (this.prepared) bus.emit('tutorial-prepared', this.prepared);
      this.prepared = null;
      bus.emit('tutorial-step', { lesson, step: this.step });
      return;
    }
  }

  private prepare(lesson: 'limpieza' | 'clinica'): boolean {
    const session = getSession();
    const practice = lesson === 'limpieza' ? cleanPractice(session.care, session.state) : sickPractice(session.care, session.state);
    if (!practice) return false;
    // Es real, no de mentira: se guarda como cualquier otro sucio o enfermo, pero sin los eventos de barro ni de
    // enfermedad (no son de lo que pasa solo).
    void session.setCare(practice.care);
    this.practiceId = practice.target.residentId;
    this.prepared = { lesson, residentId: practice.target.residentId, already: practice.target.already };
    return true;
  }

  private on(event: AnyEvent): void {
    if (!this.scene.isActive()) return;
    const next = this.advanceLesson(event);
    if (next === this.step) return;
    if (next === 'done') {
      this.endLesson();
      return;
    }
    this.step = next;
    bus.emit('tutorial-step', { lesson: this.lesson, step: next });
    this.clock = 0;
    this.moveFrom = null;
    if (next === 'coins') this.coinsTimer = this.time.delayedCall(COINS_SHOW_MS, () => this.on({ type: 'coins-shown' }));
  }

  private advanceLesson(event: AnyEvent): LessonStep | 'done' {
    switch (this.lesson) {
      case 'inicio':
        return advance(this.step as TutorialStep, event as TutorialEvent);
      case 'limpieza':
        return advanceClean(this.step as CleanLessonStep, event as LessonEvent);
      case 'clinica':
        return advanceClinic(this.step as ClinicLessonStep, event as LessonEvent);
    }
  }

  /** Lección terminada: la siguiente de la cola empieza sin pausa. */
  private endLesson(): void {
    bus.emit('tutorial-ended', { lesson: this.lesson, done: true, step: this.step });
    this.startNext();
  }

  /** Se deja a medias con la ✕: se para toda la cola. No vuelve a salir solo; queda el botón Aprender del menú. */
  finish(): void {
    if (!this.scene.isActive()) return;
    bus.emit('tutorial-ended', { lesson: this.lesson, done: false, step: this.step });
    this.coinsTimer?.remove();
    this.queue = [];
    this.scene.stop();
  }

  update(_time: number, delta: number): void {
    // Encima de todo, también de la ventana de comer, que se abre después.
    const scenes = this.scene.manager.getScenes(true);
    if (scenes[scenes.length - 1] !== this) this.scene.bringToTop();
    this.clock += delta;
    this.pollCleaning();
    if (!this.scene.isActive()) return;
    this.gesture = this.currentGesture();
    this.updateTrail();
    this.joystick.setVisible(false);
    if (this.lesson === 'inicio' && this.step === 'move' && this.scene.isActive('World')) this.showJoystickHint();
    this.draw();
  }

  /** La limpieza no avisa de cada paso: se mira en cada vuelta y, si ha pasado al siguiente, avanza la lección. */
  private pollCleaning(): void {
    if (this.lesson !== 'limpieza' || !TOOL_STEPS.includes(this.step) || !this.scene.isActive('Clean')) return;
    const step = this.scene.get<CleanScene>('Clean').state().step;
    if (step !== this.step) this.on({ type: 'clean-step', step });
  }

  /**
   * En los pasos de tocar a un animal del mapa, las huellas de Luna marcan en el suelo el camino hasta él, como las
   * de la tienda (David, 2026-11-10: con el bocadillo y la mano solo, no sabía por dónde ir).
   */
  private updateTrail(): void {
    const world = this.world();
    if (!world) return;
    const target = this.trailTarget(world);
    if (target !== this.trailTo) {
      if (this.trailTo) world.hideResidentTrail();
      this.trailTo = target;
      this.trailAt = -Infinity;
    }
    if (!target || world.residentTrailActive() || this.time.now - this.trailAt < TRAIL_AGAIN_MS) return;
    if (world.guideToResident(target)) this.trailAt = this.time.now;
  }

  private trailTarget(world: WorldScene): string | null {
    const step = this.step;
    if (step === 'tap-animal') return world.tutorialAnimal()?.residentId ?? null;
    return step === 'tap-dirty' || step === 'tap-sick' ? this.practiceId : null;
  }

  private world(): WorldScene | null {
    return this.scene.isActive('World') ? this.scene.get<WorldScene>('World') : null;
  }

  /** Qué gesto toca ahora y dónde; null si la escena que hace falta no está a la vista. */
  private currentGesture(): Gesture | null {
    if (this.lesson === 'limpieza') return this.cleanGesture();
    if (this.lesson === 'clinica') return this.clinicGesture();
    const world = this.world();
    switch (this.step as TutorialStep) {
      case 'move': {
        if (!world) return null;
        const keeper = world.keeperPosition();
        if (!this.moveFrom) this.moveFrom = keeper;
        if (Math.hypot(keeper.x - this.moveFrom.x, keeper.y - this.moveFrom.y) >= MOVE_DISTANCE) {
          this.on({ type: 'moved' });
          return null;
        }
        const at = world.tutorialMoveTarget();
        return at ? { kind: 'tap', at } : null;
      }
      case 'tap-animal': {
        const animal = world?.tutorialAnimal();
        return animal ? { kind: 'tap', at: animal.screen } : null;
      }
      case 'drag-food':
        return this.feedGesture();
      case 'coins':
        return { kind: 'tap', at: HUD_COIN, ui: true };
      case 'shop': {
        // Se señala el botón de la tienda: al tocarlo salen las huellas hasta la puerta (y el bocadillo del borde,
        // si la puerta no se ve, lo pone el HUD).
        const hud = this.scene.get<HudScene>('Hud');
        return world && this.scene.isActive('Hud') && hud.shopButtonVisible() ? { kind: 'tap', at: hud.shopButtonPos(), ui: true } : null;
      }
    }
  }

  /** Arrastrar la comida que el animal se come hasta su boca (a un enfermo cualquiera le da «¡puaj!»). */
  private feedGesture(): Gesture | null {
    if (!this.scene.isActive('Feed')) return null;
    const feed = this.scene.get<FeedScene>('Feed');
    const found = findResident(feed.resident());
    const targets = feed.targetsOnScreen();
    const from = found ? targets.foods[goodFood(found.resident.species)] : undefined;
    return from ? { kind: 'drag', from, to: targets.animal } : null;
  }

  /** El animal de la práctica en el mapa (si se sale de la pantalla, la mano va al bocadillo del borde). */
  private practiceTap(): Gesture | null {
    const world = this.world();
    const at = world && this.practiceId ? world.residentScreenPos(this.practiceId) : null;
    return at ? { kind: 'tap', at } : null;
  }

  private cleanGesture(): Gesture | null {
    if (this.step === 'tap-dirty') return this.practiceTap();
    if (!this.scene.isActive('Clean')) return null;
    // La herramienta que toca, arrastrada hasta el animal y frotada encima.
    const targets = this.scene.get<CleanScene>('Clean').targetsOnScreen();
    return targets.tool ? { kind: 'drag', from: targets.tool, to: targets.animal, rub: true } : null;
  }

  private clinicGesture(): Gesture | null {
    switch (this.step as ClinicLessonStep) {
      case 'tap-sick':
        return this.practiceTap();
      case 'drag-food':
        return this.feedGesture();
      case 'cross': {
        const at = this.scene.isActive('Feed') ? this.scene.get<FeedScene>('Feed').crossScreenPos() : null;
        return at ? { kind: 'tap', at, ui: true } : null;
      }
      case 'bed': {
        if (this.scene.isActive('Clinic')) {
          const clinic = this.scene.get<ClinicScene>('Clinic');
          const beds = clinic.bedResidents();
          const index = this.practiceId && beds.includes(this.practiceId) ? beds.indexOf(this.practiceId) : beds.findIndex((id) => id !== null);
          const at = index >= 0 ? clinic.bedScreenPos(index) : null;
          return at ? { kind: 'tap', at, ui: true } : null;
        }
        // La cuidadora va andando sola a la clínica; si no llega (se ha ido a otro sitio), al botón de la clínica.
        return this.clock > CLINIC_WAIT_MS ? this.clinicButtonTap() : null;
      }
      case 'back-to-clinic':
        return this.clinicButtonTap();
      case 'cure': {
        if (!this.scene.isActive('Cure')) return null;
        const targets = this.scene.get<CureScene>('Cure').targetsOnScreen();
        const from = Object.values(targets.medicines)[0];
        return from ? { kind: 'drag', from, to: targets.animal } : null;
      }
    }
  }

  private clinicButtonTap(): Gesture | null {
    if (!this.world() || !this.scene.isActive('Hud')) return null;
    const at = this.scene.get<HudScene>('Hud').clinicButtonPos();
    return at ? { kind: 'tap', at, ui: true } : null;
  }

  private showJoystickHint(): void {
    const hud = this.scene.get<HudScene>('Hud');
    if (!this.scene.isActive('Hud') || !hud.gearVisible()) return;
    const gear = hud.gearScreenPos();
    this.joystick.setPosition(gear.x + 100, gear.y).setVisible(true);
  }

  private draw(): void {
    const g = this.gesture;
    this.hand.setVisible(g !== null);
    this.ring.setVisible(false);
    this.bubble.setVisible(false);
    // Con la comida, la limpieza o la cura abiertas, su ✕ basta: dos ✕ rojas a la vez parecían decir «sal del tutorial».
    this.closeBadge?.setVisible(!['Feed', 'Clean', 'Cure'].some((key) => this.scene.isActive(key)));
    if (!g) return;
    if (g.kind === 'tap') {
      let at = g.at;
      if (!g.ui) {
        const hint = edgeHint(g.at, this.scale.width, this.scale.height, EDGE);
        if (hint) {
          // Fuera de la pantalla: el bocadillo en el borde, con la colita hacia el sitio, y la mano en él.
          setBubbleTail(this.bubble, hint.side);
          this.bubble.setVisible(true).setPosition(hint.x, hint.y);
          at = { x: hint.x, y: hint.y };
        }
      }
      const u = (this.clock % TAP_MS) / TAP_MS;
      // Baja, aprieta (baja un poco más y sale un anillo) y vuelve a subir.
      const lift = u < 0.35 ? (1 - u / 0.35) * 26 : u < 0.6 ? -2 : ((u - 0.6) / 0.4) * 26;
      this.hand.setPosition(at.x, at.y + lift).setScale(this.handScale).setAlpha(1);
      if (u >= 0.35) {
        const r = Math.min(1, (u - 0.35) / 0.5);
        this.ring.setVisible(true).setPosition(at.x, at.y).setRadius(10 + r * 26).setStrokeStyle(4, 0xffffff, 0.9 * (1 - r));
      }
      return;
    }
    if (g.rub) {
      // Frotar: coge la herramienta, la lleva al animal, la frota de lado a lado y la suelta.
      const u = (this.clock % RUB_MS) / RUB_MS;
      const k = u < 0.15 ? 0 : u > 0.45 ? 1 : Phaser.Math.Easing.Sine.InOut((u - 0.15) / 0.3);
      const wiggle = u > 0.45 && u < 0.88 ? Math.sin(((u - 0.45) / 0.43) * Math.PI * 6) * 22 : 0;
      const pressed = u >= 0.08 && u <= 0.9;
      const x = g.from.x + (g.to.x - g.from.x) * k + wiggle;
      const y = g.from.y + (g.to.y - g.from.y) * k;
      this.hand.setPosition(x, y + (pressed ? 0 : 14)).setScale(this.handScale).setAlpha(u > 0.92 ? 1 - (u - 0.92) / 0.08 : 1);
      return;
    }
    // Arrastre: va a la comida, la coge, la lleva hasta el animal y la suelta.
    const u = (this.clock % DRAG_MS) / DRAG_MS;
    const k = u < 0.25 ? 0 : u > 0.8 ? 1 : Phaser.Math.Easing.Sine.InOut((u - 0.25) / 0.55);
    const x = g.from.x + (g.to.x - g.from.x) * k;
    const y = g.from.y + (g.to.y - g.from.y) * k;
    const pressed = u >= 0.15 && u <= 0.85;
    this.hand.setPosition(x, y + (pressed ? 0 : 14)).setScale(this.handScale).setAlpha(u > 0.9 ? 1 - (u - 0.9) / 0.1 : 1);
  }

  // --- API para pruebas ---

  currentStep(): string {
    return this.step;
  }

  currentLesson(): LessonId {
    return this.lesson;
  }

  /** La lección en marcha y las que quedan detrás. */
  lessons(): LessonId[] {
    return [this.lesson, ...this.queue];
  }

  /** El animal de la práctica (limpieza y clínica). */
  practiceResident(): string | null {
    return this.practiceId;
  }

  closePos(): Vec | null {
    return this.closeBadge ? { x: this.closeBadge.x, y: this.closeBadge.y } : null;
  }

  handPos(): Vec | null {
    return this.hand?.visible ? { x: this.hand.x, y: this.hand.y } : null;
  }

  /** ¿Se ve el bocadillo del borde (sitio del mapa fuera de la pantalla)? */
  edgeBubbleVisible(): boolean {
    return this.bubble?.visible ?? false;
  }

  /** ¿Se ve la ✕ del tutorial? */
  closeVisible(): boolean {
    return this.closeBadge?.visible ?? false;
  }
}
