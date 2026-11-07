import type * as Phaser from 'phaser';
import { PAW } from '../core/guideArt';
import type { Point } from '../core/pathfinding';
import { pawRows, pawSteps, type PawFacing } from '../core/pawTrail';
import { pixelTexture } from '../ui/pixelArt';

/** Encima del suelo y las vallas, por debajo de personas y animales. */
const DEPTH = 3;
/** Ritmo con el que se encienden las huellas, de la cuidadora a la tienda (ms). */
const STEP_MS = 110;
/** Px que se aparta cada huella del centro de la casilla. */
const SIDE_PX = 3;
const ALPHA = 0.85;

const textureOf = (scene: Phaser.Scene, facing: PawFacing): string => pixelTexture(scene, `guide-paw-${facing}`, pawRows(PAW, facing));

/**
 * Huellas de Luna por el camino de verdad (el mismo que andaría la cuidadora) hasta la puerta de la tienda.
 * La cuidadora no se mueve sola: el niño las sigue.
 */
export class PawTrail {
  private prints: Phaser.GameObjects.Image[] = [];
  private timer: Phaser.Time.TimerEvent | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly tile: number,
  ) {}

  get active(): boolean {
    return this.prints.length > 0;
  }

  get count(): number {
    return this.prints.length;
  }

  /** Casillas con huella (para pruebas). */
  tiles(): Point[] {
    return this.prints.map((p) => p.getData('tile') as Point);
  }

  /** `path`: casillas de la cuidadora a la puerta. Se apagan solas pasados `lifeMs`. */
  show(path: readonly Point[], lifeMs: number): void {
    this.hide();
    const t = this.tile;
    pawSteps(path).forEach((step, i) => {
      const horizontal = step.facing === 'left' || step.facing === 'right';
      const x = step.tile.x * t + t / 2 + (horizontal ? 0 : step.side * SIDE_PX);
      const y = step.tile.y * t + t / 2 + (horizontal ? step.side * SIDE_PX : 0);
      const print = this.scene.add.image(Math.round(x), Math.round(y), textureOf(this.scene, step.facing)).setDepth(DEPTH).setAlpha(0);
      print.setData('tile', step.tile);
      this.scene.tweens.add({ targets: print, alpha: ALPHA, duration: 200, delay: i * STEP_MS });
      this.prints.push(print);
    });
    this.timer = this.scene.time.delayedCall(lifeMs, () => this.fadeOut());
  }

  /** La cuidadora pisa la casilla: la huella de ahí ya ha servido y se apaga. */
  stepOn(tile: Point): void {
    const i = this.prints.findIndex((p) => {
      const at = p.getData('tile') as Point;
      return at.x === tile.x && at.y === tile.y;
    });
    if (i < 0) return;
    const [print] = this.prints.splice(i, 1);
    this.scene.tweens.killTweensOf(print!);
    this.scene.tweens.add({ targets: print, alpha: 0, duration: 300, onComplete: () => print!.destroy() });
    if (this.prints.length === 0) {
      this.timer?.remove();
      this.timer = null;
    }
  }

  /** Se apagan poco a poco (al llegar o pasado el rato). */
  fadeOut(): void {
    const prints = this.prints;
    this.prints = [];
    this.timer?.remove();
    this.timer = null;
    for (const print of prints) {
      this.scene.tweens.killTweensOf(print);
      this.scene.tweens.add({ targets: print, alpha: 0, duration: 400, onComplete: () => print.destroy() });
    }
  }

  hide(): void {
    this.timer?.remove();
    this.timer = null;
    for (const print of this.prints) {
      this.scene.tweens.killTweensOf(print);
      print.destroy();
    }
    this.prints = [];
  }
}
