import * as Phaser from 'phaser';
import { decorKey, getArt } from '../art/art';
import { depthForY } from '../core/depth';
import type { GameState } from '../core/economy';
import type { Point } from '../core/pathfinding';
import { isShopDoor, type ShopInfo } from '../core/tiledmap';
import { SHOP_UNLOCK_COINS } from '../data/shop';
import { t } from '../data/strings';

export type ShopDoorEvent = 'open' | 'locked' | null;

export class ShopBuilding {
  private readonly lock: Phaser.GameObjects.Text;
  private atDoor = false;

  constructor(
    private readonly scene: Phaser.Scene,
    readonly info: ShopInfo,
    state: GameState,
  ) {
    const cx = info.x + info.width / 2;
    const cy = info.y + info.height / 2;
    if (getArt()) {
      scene.add.image(cx, info.y + info.height, decorKey('shop')).setOrigin(0.5, 1).setDepth(depthForY(info.y + info.height));
    } else {
      scene.add.text(cx, cy, '🏪', { fontSize: '26px' }).setOrigin(0.5).setResolution(4).setDepth(5);
    }
    scene.add
      .text(cx, info.y - 6, t('shop.label'), {
        fontFamily: 'sans-serif',
        fontSize: '9px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setResolution(4)
      .setDepth(10000);
    this.lock = scene.add
      .text(cx, cy + 16, `🔒 ${SHOP_UNLOCK_COINS}🪙`, {
        fontFamily: 'sans-serif',
        fontSize: '10px',
        color: '#ffffff',
        backgroundColor: '#000000aa',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5)
      .setResolution(4)
      .setDepth(10000)
      .setVisible(!state.shopUnlocked);
  }

  /** 'open'/'locked' solo al llegar a la puerta; no se repite hasta salir de ella. */
  onKeeperTile(tile: Point, state: GameState): ShopDoorEvent {
    const onDoor = isShopDoor(this.info, tile);
    if (!onDoor) {
      this.atDoor = false;
      return null;
    }
    if (this.atDoor) return null;
    this.atDoor = true;
    return state.shopUnlocked ? 'open' : 'locked';
  }

  sync(state: GameState): void {
    if (!state.shopUnlocked || !this.lock.visible) return;
    this.scene.tweens.add({
      targets: this.lock,
      scale: 1.8,
      alpha: 0,
      duration: 400,
      onComplete: () => this.lock.setVisible(false),
    });
  }
}
