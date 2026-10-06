import * as Phaser from 'phaser';
import { gearVisible } from '../core/hud';
import { JOYSTICK_RADIUS, inJoystickZone, joystickVector, knobOffset } from '../core/joystick';
import type { Vec } from '../core/movement';
import { ANIMALS } from '../data/animals';
import { PENS } from '../data/pens';
import { t } from '../data/strings';
import { sfx } from '../systems/audio';
import { bus } from '../systems/events';
import { joystickState } from '../systems/joystickState';
import { getSession } from '../systems/session';
import { textStyle } from '../ui/theme';
import { addUiText } from '../ui/text';
import { HUD_COIN, addCoinCounter, addPillButton, type CoinCounter } from '../ui/widgets';

export class HudScene extends Phaser.Scene {
  private coins!: CoinCounter;
  private toastText!: Phaser.GameObjects.Text;
  private gear!: Phaser.GameObjects.Container;
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

    this.toastText = addUiText(this, this.scale.width / 2, 90, '', textStyle(28))
      .setOrigin(0.5)
      .setDepth(50)
      .setVisible(false);

    // Menú de ajustes: abajo a la izquierda (a la derecha están los botones de Android).
    this.gear = addPillButton(this, 0, 0, 56, 56, { color: 'blue', icon: 'gear', onTap: () => this.openSettings() });
    this.layout();

    this.stickBase = this.add.circle(0, 0, JOYSTICK_RADIUS, 0xffffff, 0.25).setVisible(false);
    this.stickKnob = this.add.circle(0, 0, 28, 0xffffff, 0.7).setVisible(false);

    const unsubscribe = [
      bus.on('coins-changed', ({ coins }) => this.renderCoins(coins, true)),
      bus.on('toast', ({ text }) => this.showToast(text)),
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
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const off of unsubscribe) off();
      this.input.off(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
      this.input.off(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this);
      this.input.off(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
      this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this);
      joystickState.vector = { x: 0, y: 0 };
    });
  }

  coinsLabel(): string {
    return this.coins.label();
  }

  gearVisible(): boolean {
    return this.gear.visible;
  }

  update(): void {
    this.gear.setVisible(gearVisible(this.scene.manager.getScenes(true).map((scene) => scene.scene.key)));
  }

  private renderCoins(coins: number, pop = false): void {
    this.coins.set(coins, pop);
  }

  private showToast(text: string): void {
    this.tweens.killTweensOf(this.toastText);
    this.toastText.setText(text).setPosition(this.scale.width / 2, 90).setVisible(true).setAlpha(1).setScale(0.6);
    this.tweens.add({ targets: this.toastText, scale: 1, duration: 200, ease: 'Back.easeOut' });
    this.tweens.add({
      targets: this.toastText,
      alpha: 0,
      delay: 1800,
      duration: 400,
      onComplete: () => this.toastText.setVisible(false),
    });
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
    this.toastText.setX(this.scale.width / 2);
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (!getSession().settings.joystick || this.stickPointerId !== null) return;
    // Con Feed o Settings abiertas el mundo está pausado; en la tienda la cuidadora también anda.
    if (!this.scene.isActive('World') && !this.scene.isActive('Shop')) return;
    const point = { x: pointer.x, y: pointer.y };
    if (this.gear.visible && this.gear.getBounds().contains(point.x, point.y)) return; // la rueda no arranca el joystick
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
