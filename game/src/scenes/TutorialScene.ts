import * as Phaser from 'phaser';
import type { Vec } from '../core/movement';
import { COINS_SHOW_MS, MOVE_DISTANCE, advance, goodFood, type TutorialEvent, type TutorialStep } from '../core/tutorial';
import { findResident } from '../data/pens';
import { bus } from '../systems/events';
import { edgeHint } from '../core/guideArt';
import { addHand } from '../ui/hand';
import { addIcon } from '../ui/icons';
import { addShopBubble, pawTexture, setBubbleTail } from '../ui/pixelArt';
import { addEmoji } from '../ui/text';
import { HUD_COIN, HUD_SHOP, addCloseBadge } from '../ui/widgets';
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
/** Dónde va la ✕ que cierra el tutorial: debajo del botón de la tienda, en la columna de las monedas. */
export const CLOSE_AT: Vec = { x: HUD_SHOP.x, y: HUD_SHOP.y + 62 };

/** Desde dónde se abre: el aviso de la primera vez o el botón Aprender del menú (para Matomo). */
export interface TutorialSceneData {
  from?: 'aviso' | 'menu';
}

/**
 * `ui`: el sitio es de la interfaz (contador, botón de la tienda), en coordenadas de pantalla: se señala tal cual.
 * Si no, es un sitio del mapa: si se sale de la pantalla, la mano va al borde, junto a un bocadillo que apunta hacia él.
 */
type Gesture = { kind: 'tap'; at: Vec; ui?: boolean } | { kind: 'drag'; from: Vec; to: Vec };

/**
 * El tutorial, sin palabras: una mano encima del juego hace el gesto junto a lo que hay que tocar y
 * no pasa al siguiente hasta que el jugador lo hace. No tapa los toques (solo su ✕ es tocable).
 */
export class TutorialScene extends Phaser.Scene {
  private step: TutorialStep = 'move';
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
    ];
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => offs.forEach((off) => off()));
    bus.emit('tutorial-started', { from: this.from });
    bus.emit('tutorial-step', { step: this.step });
  }

  private on(event: TutorialEvent): void {
    const next = advance(this.step, event);
    if (next === this.step) return;
    if (next === 'done') {
      this.finish(true);
      return;
    }
    this.step = next;
    bus.emit('tutorial-step', { step: next });
    this.clock = 0;
    this.moveFrom = null;
    if (next === 'coins') this.coinsTimer = this.time.delayedCall(COINS_SHOW_MS, () => this.on({ type: 'coins-shown' }));
  }

  /** Termina (`done`) o se deja a medias con la ✕: no vuelve a salir solo; queda el botón Aprender del menú. */
  finish(done = false): void {
    if (!this.scene.isActive()) return;
    bus.emit('tutorial-ended', { done, step: this.step });
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
        return { kind: 'tap', at: HUD_COIN, ui: true };
      case 'shop': {
        // Se señala el botón de la tienda: al tocarlo salen las huellas hasta la puerta (y el bocadillo del borde,
        // si la puerta no se ve, lo pone el HUD).
        const hud = this.scene.get<HudScene>('Hud');
        return world && this.scene.isActive('Hud') && hud.shopButtonVisible() ? { kind: 'tap', at: hud.shopButtonPos(), ui: true } : null;
      }
    }
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
    // Con la comida abierta, su ✕ basta: dos ✕ rojas a la vez parecían decir «sal del tutorial».
    this.closeBadge?.setVisible(!this.scene.isActive('Feed'));
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
    // Arrastre: va a la comida, la coge, la lleva hasta el animal y la suelta.
    const u = (this.clock % DRAG_MS) / DRAG_MS;
    const k = u < 0.25 ? 0 : u > 0.8 ? 1 : Phaser.Math.Easing.Sine.InOut((u - 0.25) / 0.55);
    const x = g.from.x + (g.to.x - g.from.x) * k;
    const y = g.from.y + (g.to.y - g.from.y) * k;
    const pressed = u >= 0.15 && u <= 0.85;
    this.hand.setPosition(x, y + (pressed ? 0 : 14)).setScale(this.handScale).setAlpha(u > 0.9 ? 1 - (u - 0.9) / 0.1 : 1);
  }

  // --- API para pruebas ---

  currentStep(): TutorialStep {
    return this.step;
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
