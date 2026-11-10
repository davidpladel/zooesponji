import * as Phaser from 'phaser';
import { edgeHint } from '../core/guideArt';
import { clinicButtonVisible, gearVisible } from '../core/hud';
import { JOYSTICK_RADIUS, inJoystickZone, joystickVector, knobOffset } from '../core/joystick';
import type { Vec } from '../core/movement';
import { ANIMALS } from '../data/animals';
import { PENS } from '../data/pens';
import { t } from '../data/strings';
import { sfx } from '../systems/audio';
import { bus } from '../systems/events';
import { joystickState } from '../systems/joystickState';
import { getLanguage, isRtl } from '../systems/language';
import { getSession } from '../systems/session';
import { textStyle } from '../ui/theme';
import { addUiText } from '../ui/text';
import { addShopBubble, clinicIconTexture, setBubbleTail, shopIconTexture } from '../ui/pixelArt';
import { makePressable } from '../ui/press';
import { HUD_CLINIC, HUD_COIN, HUD_SHOP, addCoinCounter, addPillButton, type CoinCounter } from '../ui/widgets';
import type { TutorialScene } from './TutorialScene';
import type { WorldScene } from './WorldScene';

/** Escala del dibujo del botón de la tienda y del bocadillo del borde (32 px de dibujo → 64 px). */
const GUIDE_SCALE = 2;
/** Lo que se aparta del borde de la pantalla el bocadillo que señala la tienda. */
const EDGE_MARGIN = 44;
/** Esquina de las monedas, los botones de la tienda y la clínica y la ✕ del tutorial, que el bocadillo del borde no tapa. */
const HUD_CORNER = { x: 190, y: 270 };
/** Tiendita del aviso «Cómpralo en la tienda»: 14x11 a x3 (unos 33 px de alto, como el texto). */
const TOAST_ICON_SCALE = 3;
const TOAST_ICON_GAP = 10;

export class HudScene extends Phaser.Scene {
  private coins!: CoinCounter;
  private toast!: Phaser.GameObjects.Container;
  private toastText!: Phaser.GameObjects.Text;
  private toastIcon!: Phaser.GameObjects.Image;
  private gear!: Phaser.GameObjects.Container;
  /** Botón de la tienda: debajo de las monedas. */
  private shopButton!: Phaser.GameObjects.Container;
  /** Botón de la clínica: debajo del de la tienda, desde la primera vez que se entra en ella. */
  private clinicButton!: Phaser.GameObjects.Container;
  /** Bocadillo en el borde de la pantalla con la tiendita, apuntando a la tienda cuando no se ve. */
  private shopEdge!: Phaser.GameObjects.Container;
  private stickBase!: Phaser.GameObjects.Arc;
  private stickKnob!: Phaser.GameObjects.Arc;
  private stickOrigin: Vec | null = null;
  private stickPointerId: number | null = null;

  constructor() {
    super('Hud');
  }

  create(): void {
    this.coins = addCoinCounter(this, HUD_COIN.x, HUD_COIN.y);
    this.renderCoins(getSession().state.coins);

    this.toastText = addUiText(this, 0, 0, '', textStyle(28)).setOrigin(0.5);
    this.toastIcon = this.add.image(0, 0, shopIconTexture(this)).setScale(TOAST_ICON_SCALE);
    this.toast = this.add.container(this.scale.width / 2, 90, [this.toastText, this.toastIcon]).setDepth(50).setVisible(false);

    // Menú de ajustes: abajo a la izquierda (a la derecha están los botones de Android).
    this.gear = addPillButton(this, 0, 0, 56, 56, { color: 'blue', icon: 'gear', onTap: () => this.openSettings() });
    // La tienda está abierta desde el principio: el botón lleva a ella (huellas la primera vez, andando después).
    this.shopButton = addShopBubble(this, GUIDE_SCALE, null).setPosition(HUD_SHOP.x, HUD_SHOP.y).setSize(64, 64);
    makePressable(this.shopButton, () => this.tapShop());
    this.clinicButton = addShopBubble(this, GUIDE_SCALE, null, clinicIconTexture(this)).setPosition(HUD_CLINIC.x, HUD_CLINIC.y).setSize(64, 64);
    makePressable(this.clinicButton, () => this.tapClinic());
    this.shopEdge = addShopBubble(this, GUIDE_SCALE, 'up').setVisible(false);
    this.layout();

    this.stickBase = this.add.circle(0, 0, JOYSTICK_RADIUS, 0xffffff, 0.25).setVisible(false);
    this.stickKnob = this.add.circle(0, 0, 28, 0xffffff, 0.7).setVisible(false);

    const unsubscribe = [
      bus.on('coins-changed', ({ coins }) => this.renderCoins(coins, true)),
      bus.on('toast', ({ text, icon }) => this.showToast(text, icon)),
      bus.on('shop-unlocked', () => {
        sfx.play('unlock');
        this.showToast(t('toast.shopOpen'));
      }),
      bus.on('animal-unlocked', ({ penId }) =>
        this.showToast(t('toast.newAnimal', { name: t(ANIMALS[PENS[penId].residents[0]!.species].nameKey) })),
      ),
    ];

    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
    this.input.on(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this);
    this.input.on(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
    // Si el dedo se suelta fuera del juego (en el borde de la pantalla), llega este otro aviso y no el de arriba.
    this.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onPointerUp, this);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const off of unsubscribe) off();
      this.input.off(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
      this.input.off(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this);
      this.input.off(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
      this.input.off(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onPointerUp, this);
      this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this);
      joystickState.vector = { x: 0, y: 0 };
    });
  }

  coinsLabel(): string {
    return this.coins.label();
  }

  gearScreenPos(): { x: number; y: number } {
    return { x: this.gear.x, y: this.gear.y };
  }

  gearVisible(): boolean {
    return this.gear.visible;
  }

  update(): void {
    // Red de seguridad: si el dedo ya no está apretado y no llegó ningún aviso (se soltó encima de otra
    // ventana, o el juego pasó a segundo plano), el joystick se suelta. Si no, la cuidadora seguía andando sola.
    if (this.stickPointerId !== null) {
      const finger = this.input.manager.pointers.find((p) => p.id === this.stickPointerId);
      if (!finger || !finger.isDown) this.onPointerUp({ id: this.stickPointerId } as Phaser.Input.Pointer);
    }
    const active = this.scene.manager.getScenes(true).map((scene) => scene.scene.key);
    const inZoo = gearVisible(active);
    this.gear.setVisible(inZoo);
    this.shopButton.setVisible(inZoo);
    this.clinicButton.setVisible(clinicButtonVisible(active, getSession().clinicVisits));
    this.updateShopEdge(inZoo);
  }

  /** Toque en el botón de la tienda. */
  tapShop(): void {
    if (!this.shopButton.visible || !this.scene.isActive('World')) return;
    sfx.play('tap');
    const mode = this.scene.get<WorldScene>('World').guideToShop();
    if (mode) bus.emit('shop-guide', { mode });
  }

  /** Toque en el botón de la clínica: la cuidadora va andando sola hasta su puerta (y al pisarla, entra). */
  tapClinic(): void {
    if (!this.clinicButton.visible || !this.scene.isActive('World')) return;
    sfx.play('tap');
    if (this.scene.get<WorldScene>('World').walkToClinic()) bus.emit('clinic-guide', { mode: 'andando' });
  }

  /** Mientras hay huellas (o el tutorial lleva a la tienda) y la puerta no se ve, el bocadillo la señala desde el borde. */
  private updateShopEdge(inZoo: boolean): void {
    this.shopEdge.setVisible(false);
    if (!inZoo) return;
    const world = this.scene.get<WorldScene>('World');
    const tutorial = this.scene.isActive('Tutorial') ? this.scene.get<TutorialScene>('Tutorial') : null;
    if (!world.shopTrailActive() && tutorial?.currentStep() !== 'shop') return;
    const door = world.shopDoorScreenPos();
    const hint = door ? edgeHint(door, this.scale.width, this.scale.height, EDGE_MARGIN) : null;
    if (!hint) return;
    // Arriba a la izquierda están las monedas, los botones y la ✕ del tutorial: el bocadillo se aparta de ellos.
    if (hint.x < HUD_CORNER.x && hint.y < HUD_CORNER.y) {
      if (hint.side === 'up') hint.x = HUD_CORNER.x;
      else hint.y = HUD_CORNER.y;
    }
    setBubbleTail(this.shopEdge, hint.side);
    this.shopEdge.setPosition(hint.x, hint.y).setVisible(true);
  }

  /** ¿El toque cae en un botón del HUD? Entonces el mapa no lo toma como «ve ahí». */
  coversPoint(x: number, y: number): boolean {
    return [this.shopButton, this.clinicButton, this.gear].some((b) => b.visible && b.getBounds().contains(x, y));
  }

  shopButtonPos(): { x: number; y: number } {
    return { x: this.shopButton.x, y: this.shopButton.y };
  }

  shopButtonVisible(): boolean {
    return this.shopButton.visible;
  }

  clinicButtonPos(): { x: number; y: number } | null {
    return this.clinicButton.visible ? { x: this.clinicButton.x, y: this.clinicButton.y } : null;
  }

  shopEdgeVisible(): boolean {
    return this.shopEdge.visible;
  }

  private renderCoins(coins: number, pop = false): void {
    this.coins.set(coins, pop);
  }

  private showToast(text: string, icon?: 'shop'): void {
    this.tweens.killTweensOf(this.toast);
    this.toastText.setText(text);
    // La tiendita va detrás del texto (a la izquierda en árabe, que se lee al revés), y el conjunto centrado.
    const dir = isRtl(getLanguage()) ? -1 : 1;
    const iconWidth = icon ? this.toastIcon.displayWidth + TOAST_ICON_GAP : 0;
    this.toastText.setX((-dir * iconWidth) / 2);
    this.toastIcon.setVisible(!!icon).setX(dir * (this.toastText.width / 2 + TOAST_ICON_GAP + this.toastIcon.displayWidth / 2 - iconWidth / 2));
    this.toast.setPosition(this.scale.width / 2, 90).setVisible(true).setAlpha(1).setScale(0.6);
    this.tweens.add({ targets: this.toast, scale: 1, duration: 200, ease: 'Back.easeOut' });
    this.tweens.add({
      targets: this.toast,
      alpha: 0,
      delay: 1800,
      duration: 400,
      onComplete: () => this.toast.setVisible(false),
    });
  }

  /** El aviso de arriba, para las pruebas: texto y si lleva la tiendita. Null si no se ve. */
  toastShown(): { text: string; shopIcon: boolean } | null {
    return this.toast.visible ? { text: this.toastText.text, shopIcon: this.toastIcon.visible } : null;
  }

  openSettings(): void {
    if (this.scene.isActive('Settings')) return;
    sfx.play('tap');
    const pausedWorld = this.scene.isActive('World');
    if (pausedWorld) this.scene.pause('World');
    this.scene.launch('Settings', { pausedWorld });
  }

  private layout(): void {
    this.gear.setPosition(16 + 28, this.scale.height - 16 - 28);
    this.toast.setX(this.scale.width / 2);
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (!getSession().settings.joystick || this.stickPointerId !== null) return;
    // Con Feed o Settings abiertas el mundo está pausado; en la tienda la cuidadora también anda.
    if (!this.scene.isActive('World') && !this.scene.isActive('Shop')) return;
    const point = { x: pointer.x, y: pointer.y };
    if (this.gear.visible && this.gear.getBounds().contains(point.x, point.y)) return; // la rueda no arranca el joystick
    if (this.shopButton.visible && this.shopButton.getBounds().contains(point.x, point.y)) return;
    if (this.clinicButton.visible && this.clinicButton.getBounds().contains(point.x, point.y)) return;
    if (!inJoystickZone(point, this.scale.width, this.scale.height)) return;
    this.stickPointerId = pointer.id;
    this.stickOrigin = point;
    this.stickBase.setPosition(point.x, point.y).setVisible(true);
    this.stickKnob.setPosition(point.x, point.y).setVisible(true);
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.stickPointerId || !this.stickOrigin) return;
    const current = { x: pointer.x, y: pointer.y };
    joystickState.vector = joystickVector(this.stickOrigin, current);
    const offset = knobOffset(this.stickOrigin, current);
    this.stickKnob.setPosition(this.stickOrigin.x + offset.x, this.stickOrigin.y + offset.y);
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.stickPointerId) return;
    this.stickPointerId = null;
    this.stickOrigin = null;
    joystickState.vector = { x: 0, y: 0 };
    this.stickBase.setVisible(false);
    this.stickKnob.setVisible(false);
  }
}
