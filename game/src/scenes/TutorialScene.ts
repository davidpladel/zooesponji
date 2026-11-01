import * as Phaser from 'phaser';
import type { Vec } from '../core/movement';
import { COINS_SHOW_MS, MOVE_DISTANCE, advance, goodFood, handVisible, type TutorialEvent, type TutorialStep } from '../core/tutorial';
import { findResident } from '../data/pens';
import { bus } from '../systems/events';
import { getSession } from '../systems/session';
import { addIcon } from '../ui/icons';
import { addEmoji } from '../ui/text';
import { HUD_COIN, addCloseBadge } from '../ui/widgets';
import type { FeedScene } from './FeedScene';
import type { HudScene } from './HudScene';
import type { WorldScene } from './WorldScene';

/** Margen (px) del borde de la pantalla: un sitio fuera de ella se señala desde aquí, con una flecha. */
const EDGE = 56;
/** Duración de cada gesto de la mano (ms). */
const TAP_MS = 1200;
const DRAG_MS = 1800;

type Gesture = { kind: 'tap'; at: Vec } | { kind: 'drag'; from: Vec; to: Vec };

/**
 * El tutorial, sin palabras: una mano encima del juego hace el gesto junto a lo que hay que tocar y
 * no pasa al siguiente hasta que el jugador lo hace. No tapa los toques (solo su ✕ es tocable).
 */
export class TutorialScene extends Phaser.Scene {
  private step: TutorialStep = 'move';
  private moveFrom: Vec | null = null;
  private clock = 0;
  private gesture: Gesture | null = null;
  private hand!: Phaser.GameObjects.Text;
  private ring!: Phaser.GameObjects.Arc;
  private arrow!: Phaser.GameObjects.Text;
  private joystick!: Phaser.GameObjects.Container;
  private coinsTimer: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super('Tutorial');
  }

  init(): void {
    this.step = 'move';
    this.moveFrom = null;
    this.clock = 0;
    this.gesture = null;
    this.coinsTimer = null;
  }

  create(): void {
    this.ring = this.add.circle(0, 0, 20, 0xffffff, 0).setStrokeStyle(4, 0xffffff, 0.9).setVisible(false);
    this.arrow = addEmoji(this, 0, 0, '➡️', 34).setVisible(false);
    this.hand = addEmoji(this, 0, 0, '👆', 52).setOrigin(0.35, 0.05).setVisible(false);
    this.hand.setShadow(2, 3, '#00000066', 4, false, true);
    // Junto al engranaje: el joystick existe, y se enciende ahí (paso de moverse).
    const stick = addIcon(this, 0, 0, 'joystick', 40);
    const toGear = addEmoji(this, -46, 0, '⬅️', 30);
    this.joystick = this.add.container(0, 0, [toGear, stick]).setVisible(false);
    this.tweens.add({ targets: toGear, x: -54, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    addCloseBadge(this, this.scale.width / 2, 40, () => this.finish(), 48);

    const offs = [
      bus.on('feed-opened', () => this.on({ type: 'feed-opened' })),
      bus.on('feed-closed', () => this.on({ type: 'feed-closed' })),
      bus.on('animal-fed', ({ coins }) => this.on({ type: 'fed', coins })),
      bus.on('shop-opened', () => this.on({ type: 'shop-opened' })),
    ];
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => offs.forEach((off) => off()));
  }

  private on(event: TutorialEvent): void {
    const next = advance(this.step, event);
    if (next === this.step) return;
    if (next === 'done') {
      this.finish();
      return;
    }
    this.step = next;
    this.clock = 0;
    this.moveFrom = null;
    if (next === 'coins') this.coinsTimer = this.time.delayedCall(COINS_SHOW_MS, () => this.on({ type: 'coins-shown' }));
  }

  /** Termina (o se cierra a medias): no vuelve a salir solo; queda el botón Aprender del menú. */
  finish(): void {
    this.coinsTimer?.remove();
    if (this.scene.isActive()) this.scene.stop();
  }

  update(_time: number, delta: number): void {
    // Encima de todo, también de la ventana de comer, que se abre después.
    const scenes = this.scene.manager.getScenes(true);
    if (scenes[scenes.length - 1] !== this) this.scene.bringToTop();
    this.clock += delta;
    this.gesture = this.currentGesture();
    this.joystick.setVisible(false);
    if (this.step === 'move' && this.scene.isActive('World')) this.showJoystickHint();
    this.draw();
  }

  private world(): WorldScene | null {
    return this.scene.isActive('World') ? this.scene.get<WorldScene>('World') : null;
  }

  /** Qué gesto toca ahora y dónde; null si la escena que hace falta no está a la vista. */
  private currentGesture(): Gesture | null {
    const coins = getSession().state.coins;
    if (!handVisible(this.step, coins)) return null;
    const world = this.world();
    switch (this.step) {
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
      case 'drag-food': {
        if (!this.scene.isActive('Feed')) return null;
        const feed = this.scene.get<FeedScene>('Feed');
        const found = findResident(feed.resident());
        const targets = feed.targetsOnScreen();
        const from = found ? targets.foods[goodFood(found.resident.species)] : undefined;
        return from ? { kind: 'drag', from, to: targets.animal } : null;
      }
      case 'coins':
        return { kind: 'tap', at: HUD_COIN };
      case 'shop': {
        const door = world?.shopDoorTile();
        return world && door ? { kind: 'tap', at: world.tileToScreen(door) } : null;
      }
    }
  }

  private showJoystickHint(): void {
    const hud = this.scene.get<HudScene>('Hud');
    if (!this.scene.isActive('Hud') || !hud.gearVisible()) return;
    const gear = hud.gearScreenPos();
    this.joystick.setPosition(gear.x + 100, gear.y).setVisible(true);
  }

  /** Lleva a la pantalla un punto que se sale (con margen) y dice hacia dónde queda. */
  private onScreen(p: Vec): { at: Vec; outside: number | null } {
    const { width, height } = this.scale;
    const at = { x: Phaser.Math.Clamp(p.x, EDGE, width - EDGE), y: Phaser.Math.Clamp(p.y, EDGE, height - EDGE) };
    const outside = at.x !== p.x || at.y !== p.y ? Math.atan2(p.y - at.y, p.x - at.x) : null;
    return { at, outside };
  }

  private draw(): void {
    const g = this.gesture;
    this.hand.setVisible(g !== null);
    this.ring.setVisible(false);
    this.arrow.setVisible(false);
    if (!g) return;
    if (g.kind === 'tap') {
      const { at, outside } = this.onScreen(g.at);
      const u = (this.clock % TAP_MS) / TAP_MS;
      // Baja, aprieta (se encoge y sale un anillo) y vuelve a subir.
      const lift = u < 0.35 ? (1 - u / 0.35) * 26 : u < 0.6 ? 0 : ((u - 0.6) / 0.4) * 26;
      this.hand.setPosition(at.x, at.y + lift).setScale(u >= 0.35 && u < 0.6 ? 0.85 : 1).setAlpha(1);
      if (u >= 0.35) {
        const r = Math.min(1, (u - 0.35) / 0.5);
        this.ring.setVisible(true).setPosition(at.x, at.y).setRadius(10 + r * 26).setStrokeStyle(4, 0xffffff, 0.9 * (1 - r));
      }
      if (outside !== null) this.arrow.setVisible(true).setPosition(at.x, at.y - 44).setRotation(outside);
      return;
    }
    // Arrastre: va a la comida, la coge, la lleva hasta el animal y la suelta.
    const u = (this.clock % DRAG_MS) / DRAG_MS;
    const k = u < 0.25 ? 0 : u > 0.8 ? 1 : Phaser.Math.Easing.Sine.InOut((u - 0.25) / 0.55);
    const x = g.from.x + (g.to.x - g.from.x) * k;
    const y = g.from.y + (g.to.y - g.from.y) * k;
    const pressed = u >= 0.15 && u <= 0.85;
    this.hand.setPosition(x, y + (pressed ? 0 : 14)).setScale(pressed ? 0.88 : 1).setAlpha(u > 0.9 ? 1 - (u - 0.9) / 0.1 : 1);
  }

  // --- API para pruebas ---

  currentStep(): TutorialStep {
    return this.step;
  }

  handPos(): Vec | null {
    return this.hand?.visible ? { x: this.hand.x, y: this.hand.y } : null;
  }
}
