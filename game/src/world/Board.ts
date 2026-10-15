import * as Phaser from 'phaser';
import { TILE_SIZE } from '../config';
import { depthForY } from '../core/depth';
import type { Vec } from '../core/movement';
import type { Point } from '../core/pathfinding';
import { isBoardTile, type BoardInfo } from '../core/tiledmap';
import { t } from '../data/strings';
import { getCommunity } from '../systems/community';

const LABEL_STYLE = { fontFamily: 'sans-serif', fontSize: '9px', color: '#ffffff', stroke: '#000000', strokeThickness: 2 };
/** Alrededor del tablón, un toque cuenta como tocarlo (px de mundo). */
const HIT = 14;

/**
 * El tablón de anuncios de la plaza: se abre al pisar la casilla de delante, como la puerta de la tienda.
 * Brilla una estrellita cuando hay algo sin ver. Los nombres de quién tuvo cada idea solo se ven en el tablón.
 * Sin tablón configurado no se ve nada.
 */
export class Board {
  private readonly group: Phaser.GameObjects.Container;
  private readonly star: Phaser.GameObjects.Text;
  private readonly starTween: Phaser.Tweens.Tween;
  private atBoard = false;
  private readonly center: Vec;

  constructor(
    private readonly scene: Phaser.Scene,
    readonly info: BoardInfo,
  ) {
    const x = info.standTile.x * TILE_SIZE + TILE_SIZE / 2;
    const base = (info.standTile.y + 1) * TILE_SIZE;
    this.center = { x, y: base - 10 };
    const art = scene.add.graphics();
    // Dos postes y un tablero de madera con dos papeles clavados.
    art.fillStyle(0x6b4423).fillRect(-9, -6, 3, 6).fillRect(6, -6, 3, 6);
    art.fillStyle(0x8b5a2b).fillRoundedRect(-12, -22, 24, 17, 2);
    art.lineStyle(1, 0x4a2c12).strokeRoundedRect(-12, -22, 24, 17, 2);
    art.fillStyle(0xfff6d8).fillRect(-9, -19, 8, 10);
    art.fillStyle(0xd8f0ff).fillRect(1, -18, 8, 9);
    art.fillStyle(0xe03c31).fillCircle(-5, -19, 1).fillCircle(5, -18, 1);
    const label = scene.add.text(0, -30, t('board.label'), LABEL_STYLE).setOrigin(0.5).setResolution(4);
    this.star = scene.add.text(14, -30, '⭐', { fontSize: '10px' }).setOrigin(0.5).setResolution(4);
    this.group = scene.add.container(x, base, [art, label, this.star]).setDepth(depthForY(base));
    this.starTween = scene.tweens.add({ targets: this.star, scale: 1.4, alpha: 0.5, duration: 600, yoyo: true, repeat: -1 });
    this.sync();
  }

  get visible(): boolean {
    return this.group.visible;
  }

  /** Pone al día el tablón y la estrellita con lo último del servidor. */
  sync(): void {
    const community = getCommunity();
    const status = community?.status ?? null;
    this.group.setVisible(status !== null);
    const sparkle = community?.unseen() ?? false;
    this.star.setVisible(sparkle);
    if (sparkle) this.starTween.resume();
    else this.starTween.pause();
  }

  /** `true` solo al llegar a la casilla de delante; no se repite hasta salir de ella. */
  onKeeperTile(tile: Point): boolean {
    if (!this.visible || !isBoardTile(this.info, tile)) {
      this.atBoard = false;
      return false;
    }
    if (this.atBoard) return false;
    this.atBoard = true;
    return true;
  }

  /** ¿El toque ha caído sobre el tablón? */
  hit(world: Vec): boolean {
    return this.visible && Math.abs(world.x - this.center.x) <= HIT && Math.abs(world.y - this.center.y) <= HIT;
  }

  sparkling(): boolean {
    return this.visible && this.star.visible;
  }

}
