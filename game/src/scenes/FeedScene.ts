import * as Phaser from 'phaser';
import { isDropOnTarget, type Rect } from '../core/interaction';
import type { Vec } from '../core/movement';
import type { FeedResult } from '../core/reactions';
import { trayFoods, type AnimalId } from '../data/animals';
import { FOODS, type FoodId } from '../data/foods';
import { findResident } from '../data/pens';
import { t, type StringKey } from '../data/strings';
import { sfx } from '../systems/audio';
import { getSession } from '../systems/session';
import { foodKey, getArt } from '../art/art';
import { animalPortrait } from '../world/Actors';
import { sceneryTexture } from '../ui/paint';
import { textStyle } from '../ui/theme';
import { addUiText } from '../ui/text';
import type { UiText } from '../ui/text';
import { HUD_COIN, addCloseBadge, addPanel, addRibbonTitle, addTile, addVeil, restartOnResize } from '../ui/widgets';

export interface FeedSceneData {
  residentId: string;
}

/** Margen (px) alrededor del animal para que soltar "cerca" cuente. */
const DROP_MARGIN = 48;
/** Retardo elástico de la comida al seguir el dedo (0..1; 1 = sin retardo). */
const FOLLOW = 0.35;

type Food = Phaser.GameObjects.Text | Phaser.GameObjects.Image;

/** Escala normal de una comida de la bandeja (los iconos pequeños se amplían). */
function baseScaleOf(food: Food): number {
  return (food.getData('baseScale') as number | undefined) ?? 1;
}

export class FeedScene extends Phaser.Scene {
  private residentId = 'bills';
  private animalId: AnimalId = 'leon';
  private look = 'leon';
  private animal!: Phaser.GameObjects.Sprite | Phaser.GameObjects.Text;
  private baseScale = 1;
  private speech!: UiText;
  private readonly foods = new Map<FoodId, Food>();
  private readonly homes = new Map<FoodId, Vec>();
  private dragging: { id: FoodId; target: Vec } | null = null;
  private busy = false;
  private pool: Phaser.GameObjects.Text[] = [];

  constructor() {
    super('Feed');
  }

  init(data: FeedSceneData): void {
    const found = findResident(data.residentId);
    if (!found) throw new Error(`Residente desconocido: ${data.residentId}`);
    this.residentId = data.residentId;
    this.animalId = found.resident.species;
    this.look = found.resident.look;
    this.foods.clear();
    this.homes.clear();
    this.dragging = null;
    this.busy = false;
    this.pool = [];
  }

  create(): void {
    const { width, height } = this.scale;

    // El velo bloquea los toques al mundo.
    addVeil(this);
    const panelW = Math.min(width * 0.88, 780);
    const panelH = height * 0.86;
    const panelY = height * 0.55;
    const top = panelY - panelH / 2;
    addPanel(this, width / 2, panelY, panelW, panelH);
    // Ventana con cielo y prado donde se asoma el animal.
    this.add.image(width / 2, height * 0.37, sceneryTexture(this, panelW * 0.9, height * 0.44));
    this.animal = animalPortrait(this, this.animalId, width / 2, height * 0.37, height * 0.3, this.look);
    this.baseScale = this.animal.scaleX;
    const title = t(`book.page.${this.residentId}.title` as StringKey);
    addRibbonTitle(this, width / 2, top, Math.min(panelW * 0.6, 440), Phaser.Math.Clamp(height * 0.14, 40, 80), title);
    this.speech = addUiText(this, width / 2 + height * 0.22, height * 0.2, '', textStyle(Math.round(height * 0.06), '#ffffff', '#4e342e'))
      .setOrigin(0.5)
      .setDepth(15)
      .setVisible(false);

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
  }

  update(): void {
    if (!this.dragging) return;
    const food = this.foods.get(this.dragging.id);
    if (!food) return;
    food.x += (this.dragging.target.x - food.x) * FOLLOW;
    food.y += (this.dragging.target.y - food.y) * FOLLOW;
  }

  close(): void {
    if (!this.scene.isActive()) return;
    this.scene.stop();
    this.scene.resume('World');
  }

  targetsOnScreen(): { animal: Vec; foods: Partial<Record<FoodId, Vec>> } {
    const foods: Partial<Record<FoodId, Vec>> = {};
    for (const [id, home] of this.homes) foods[id] = { x: home.x, y: home.y };
    return { animal: { x: this.animal.x, y: this.animal.y }, foods };
  }

  isBusy(): boolean {
    return this.busy;
  }

  private createTray(width: number, height: number, panelW: number): void {
    const tray = trayFoods(this.animalId);
    const size = Phaser.Math.Clamp(Math.round(height * 0.12), 56, 96);
    const tile = Math.round(size * 1.45);
    const trayY = height * 0.79;
    const gap = Math.min((panelW * 0.9) / tray.length, tile * 1.2);
    tray.forEach((id, index) => {
      const x = width / 2 + (index - (tray.length - 1) / 2) * gap;
      // La ficha es solo el hueco: la comida se arrastra, no se pulsa.
      addTile(this, x, trayY, tile, tile);
      const icon = getArt()?.foods[id];
      // Icono del pack con escala entera (nítido); si no hay, el emoji.
      const food: Food = icon
        ? this.add.image(x, trayY, foodKey(id)).setScale(Math.max(1, Math.floor(size / icon.height)))
        : this.add.text(x, trayY, FOODS[id].emoji, { fontSize: `${size}px` }).setOrigin(0.5);
      food.setInteractive({ draggable: true, useHandCursor: true });
      food.setData('food', id);
      food.setData('baseScale', food.scaleX);
      this.foods.set(id, food);
      this.homes.set(id, { x, y: trayY });
    });
  }

  private onDragStart(_pointer: Phaser.Input.Pointer, food: Food): void {
    if (this.busy) return;
    const id = food.getData('food') as FoodId;
    this.tweens.killTweensOf(food);
    food.setScale(baseScaleOf(food) * 1.2).setDepth(10);
    this.dragging = { id, target: { x: food.x, y: food.y } };
    sfx.play('tap');
  }

  private onDrag(_pointer: Phaser.Input.Pointer, food: Food, dragX: number, dragY: number): void {
    if (this.dragging && this.dragging.id === food.getData('food')) {
      this.dragging.target = { x: dragX, y: dragY };
    }
  }

  private onDragEnd(pointer: Phaser.Input.Pointer, food: Food): void {
    const id = food.getData('food') as FoodId;
    if (!this.dragging || this.dragging.id !== id) return;
    this.dragging = null;
    const bounds = this.animal.getBounds();
    const target: Rect = { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };
    if (!this.busy && isDropOnTarget({ x: pointer.x, y: pointer.y }, target, DROP_MARGIN)) {
      void this.feed(id, food);
    } else {
      this.returnHome(id, food);
    }
  }

  private async feed(id: FoodId, food: Food): Promise<void> {
    this.busy = true;
    this.tweens.add({ targets: food, x: this.animal.x, y: this.animal.y, scale: 0, duration: 180, ease: 'Quad.easeIn' });
    const result = await getSession().feed(this.residentId, id);
    this.playReaction(result, id);
    this.time.delayedCall(result.reaction === 'especial' ? 1900 : 1000, () => {
      this.returnHome(id, food, true);
      this.busy = false;
    });
  }

  private returnHome(id: FoodId, food: Food, fromZero = false): void {
    const home = this.homes.get(id)!;
    food.setDepth(0);
    if (fromZero) food.setPosition(home.x, home.y).setScale(0);
    this.tweens.add({ targets: food, x: home.x, y: home.y, scale: baseScaleOf(food), duration: 250, ease: 'Back.easeOut' });
  }

  private playReaction(result: FeedResult, foodId: FoodId): void {
    const animal = this.animal;
    const baseX = this.scale.width / 2;
    this.tweens.killTweensOf(animal);
    animal.setScale(this.baseScale).setAngle(0).setX(baseX);

    if (result.reaction === 'come') {
      sfx.play('come');
      this.say(`${t('feed.yum')} 😋`);
      this.tweens.add({ targets: animal, scaleY: this.baseScale * 0.85, duration: 120, yoyo: true, repeat: 2 });
    } else if (result.reaction === 'rechaza') {
      sfx.play('rechaza');
      this.say(`${t('feed.yuck')} 🤢`);
      this.tweens.add({
        targets: animal,
        x: baseX + 14,
        duration: 60,
        yoyo: true,
        repeat: 4,
        onComplete: () => animal.setX(baseX),
      });
    } else {
      sfx.play('especial');
      this.say(`${t('feed.wow')} 🤩`);
      if (FOODS[foodId].friend) this.friendship(foodId);
      else this.delight();
    }
    this.flyCoins(result.coins);
  }

  private say(text: string): void {
    this.tweens.killTweensOf(this.speech);
    this.speech.setText(text).setVisible(true).setScale(0);
    this.tweens.add({ targets: this.speech, scale: 1, duration: 200, ease: 'Back.easeOut' });
    this.time.delayedCall(900, () => this.speech.setVisible(false));
  }

  private flyCoins(count: number): void {
    for (let i = 0; i < count; i++) {
      const coin = this.pooled('🪙', 36).setPosition(this.animal.x, this.animal.y);
      this.tweens.add({
        targets: coin,
        x: HUD_COIN.x,
        y: HUD_COIN.y,
        scale: 0.6,
        delay: i * 120,
        duration: 600,
        ease: 'Cubic.easeIn',
        onComplete: () => {
          coin.setVisible(false);
          sfx.play('coin');
        },
      });
    }
  }

  /**
   * Reacción especial con un amigo (como en la v1): el conejo o la gallina no se comen, se hacen
   * amigos. Aparece al lado, saltan juntos, se dan un achuchón y salen corazones.
   */
  private friendship(friendId: FoodId): void {
    const animal = this.animal;
    const size = animal.displayHeight * 0.55;
    const icon = getArt()?.foods[friendId];
    const bunny: Food = icon
      ? this.add.image(0, 0, foodKey(friendId)).setScale(Math.max(1, Math.floor(size / icon.height)))
      : this.add.text(0, 0, FOODS[friendId].emoji, { fontSize: `${Math.round(size)}px` }).setOrigin(0.5);
    const bunnyScale = bunny.scaleX;
    const groundY = animal.y + animal.displayHeight / 2 - bunny.displayHeight / 2;
    const sideX = animal.x + animal.displayWidth / 2 + bunny.displayWidth * 0.3;
    bunny.setPosition(sideX, groundY).setDepth(12).setScale(0);

    this.tweens.chain({
      targets: bunny,
      tweens: [
        { scale: bunnyScale, duration: 220, ease: 'Back.easeOut' },
        { y: groundY - 30, duration: 160, yoyo: true, repeat: 2, ease: 'Quad.easeOut' },
        { x: sideX - bunny.displayWidth * 0.35, duration: 150, yoyo: true },
        { scale: 0, alpha: 0, delay: 300, duration: 200, onComplete: () => bunny.destroy() },
      ],
    });
    this.tweens.add({
      targets: animal,
      y: animal.y - 24,
      delay: 220,
      duration: 160,
      yoyo: true,
      repeat: 2,
      ease: 'Quad.easeOut',
    });
    this.hearts((animal.x + sideX) / 2, animal.y - animal.displayHeight * 0.2);
  }

  /** Reacción especial con una comida que le encanta: salta de alegría y salen corazones. */
  private delight(): void {
    const animal = this.animal;
    this.tweens.add({ targets: animal, y: animal.y - 24, duration: 160, yoyo: true, repeat: 2, ease: 'Quad.easeOut' });
    this.hearts(animal.x, animal.y - animal.displayHeight * 0.2);
  }

  private hearts(x: number, y: number): void {
    const shapes = ['❤️', '💕', '💖'];
    const size = Math.round(this.scale.height * 0.07);
    for (let i = 0; i < 8; i++) {
      const heart = this.pooled(shapes[i % shapes.length], size + (i % 3) * 10).setPosition(
        x + Phaser.Math.Between(-size, size),
        y + Phaser.Math.Between(0, size),
      );
      heart.setScale(0);
      this.tweens.add({
        targets: heart,
        y: heart.y - Phaser.Math.Between(size * 1.5, size * 2.5),
        x: heart.x + Phaser.Math.Between(-size / 2, size / 2),
        scale: { value: 1, delay: 200 + i * 110, duration: 250, ease: 'Back.easeOut' },
        alpha: { value: 0, delay: 900 + i * 110, duration: 400 },
        delay: 200 + i * 110,
        duration: 1100,
        ease: 'Sine.easeOut',
        onComplete: () => heart.setVisible(false),
      });
    }
  }

  /** Reutiliza textos ocultos (monedas, chispas) en vez de crear y destruir. */
  private pooled(text: string, fontSize: number): Phaser.GameObjects.Text {
    let item = this.pool.find((candidate) => !candidate.visible);
    if (!item) {
      item = this.add.text(0, 0, '').setOrigin(0.5).setDepth(20);
      this.pool.push(item);
    }
    return item.setText(text).setFontSize(fontSize).setVisible(true).setAlpha(1).setScale(1).setAngle(0);
  }
}
