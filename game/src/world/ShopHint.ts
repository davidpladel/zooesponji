import type * as Phaser from 'phaser';
import type { Point } from '../core/pathfinding';

/** Pista para los más peques: un rastro de huellas que va apareciendo de la cuidadora hasta el objetivo. */
export class ShopHint {
  private prints: Phaser.GameObjects.Container[] = [];
  private shown = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly scale: number,
  ) {}

  get visible(): boolean {
    return this.prints.length > 0;
  }

  /** `from` y `to` en pantalla. */
  show(from: Point, to: Point): void {
    this.hide();
    const s = this.scale;
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    const steps = Math.max(2, Math.floor(distance / (11 * s)));
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    // Izquierda y derecha alternas, como huellas de verdad.
    const side = { x: -Math.sin(angle) * 2.5 * s, y: Math.cos(angle) * 2.5 * s };
    for (let i = 1; i <= steps; i++) {
      const f = i / (steps + 1);
      const sign = i % 2 === 0 ? 1 : -1;
      const x = from.x + (to.x - from.x) * f + side.x * sign;
      const y = from.y + (to.y - from.y) * f + side.y * sign;
      // Halo claro detrás de cada huella para que se vea bien sobre la madera y la alfombra.
      const halo = this.scene.add.circle(x, y, 5.5 * s, 0xfff8e1, 0.75).setDepth(1449);
      const print = this.scene.add
        .text(x, y, '🐾', { fontSize: `${Math.round(8 * s)}px` })
        .setOrigin(0.5)
        .setAngle((angle * 180) / Math.PI + 90)
        .setDepth(1450);
      const pair = this.scene.add.container(0, 0, [halo, print]).setDepth(1450).setAlpha(0);
      // Aparece una tras otra, se queda un rato y se desvanece.
      this.scene.tweens.add({ targets: pair, alpha: 1, duration: 220, delay: i * 140, hold: 1400, yoyo: true });
      this.prints.push(pair);
    }
    const shown = ++this.shown;
    this.scene.time.delayedCall(steps * 140 + 2200, () => {
      if (this.shown === shown) this.hide();
    });
  }

  hide(): void {
    for (const print of this.prints) {
      this.scene.tweens.killTweensOf(print);
      print.destroy();
    }
    this.prints = [];
  }
}
