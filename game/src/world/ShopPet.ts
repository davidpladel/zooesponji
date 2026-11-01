import type * as Phaser from 'phaser';
import { facingFromDelta } from '../core/facing';
import { stepAlongPath, tileCenter, worldToTile, type Vec } from '../core/movement';
import { findPathOrNearest, type WalkGrid } from '../core/pathfinding';
import { PET_SPEED } from '../core/petFollow';
import { pickShopSpot } from '../core/shopWalk';
import { createPet, type Walker } from './Actors';
import type { ShopInterior } from './ShopInterior';

const T = 16;
/** Lo que se queda mirando cada cosa (ms). */
const LOOK_MIN_MS = 1500;
const LOOK_EXTRA_MS = 1500;

/**
 * Luna dentro de la tienda: va a su aire, como un perrito en una tienda. Elige algo interesante,
 * va andando, se queda mirándolo un rato (a veces da un saltito) y busca otra cosa. No sigue a la
 * cuidadora ni sale por la puerta. Su posición va en píxeles del interior, como la de la cuidadora.
 */
export class ShopPet {
  private feetPos: Vec;
  private route: Vec[] = [];
  private wait: number;
  private readonly walker: Walker;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly interior: ShopInterior,
    private grid: WalkGrid,
    start: Vec,
    private readonly rng: () => number = Math.random,
  ) {
    this.feetPos = { ...start };
    const { offsetY, scale } = interior.layout;
    const screen = interior.screen(start);
    this.walker = createPet(scene, 'luna', screen.x, screen.y, (y) => (y - offsetY) / scale + 0.4);
    // A la escala de la cuidadora: una perrita pequeña a su lado.
    this.walker.object.setScale(Math.round(scale * 1.6));
    this.wait = 600;
  }

  get feet(): Vec {
    return { ...this.feetPos };
  }

  setGrid(grid: WalkGrid): void {
    this.grid = grid;
  }

  /** Entra detrás de la cuidadora: aparece bajo la puerta y la cruza. */
  walkIn(from: Vec, points: Vec[]): void {
    this.feetPos = { ...from };
    const screen = this.interior.screen(from);
    this.walker.object.setPosition(screen.x, screen.y).setAlpha(0);
    this.scene.tweens.add({ targets: this.walker.object, alpha: 1, duration: 350 });
    this.route = points.map((p) => ({ ...p }));
    this.wait = 0;
  }

  /** `interests`: lo que le llama la atención (peanas, estantería, tendero), en px del interior. */
  update(delta: number, interests: readonly Vec[]): void {
    if (this.route.length > 0) {
      const step = stepAlongPath(this.feetPos, this.route, PET_SPEED, delta);
      this.feetPos = step.pos;
      this.route = step.remaining;
      const screen = this.interior.screen(this.feetPos);
      this.walker.moveTo(screen.x, screen.y);
      if (this.route.length === 0) this.lookAround(interests);
      return;
    }
    this.walker.stop();
    this.wait -= delta;
    if (this.wait > 0) return;
    const spot = pickShopSpot(this.grid, interests, this.rng);
    const path = spot ? findPathOrNearest(this.grid, worldToTile(this.feetPos, T), worldToTile(spot, T)) : null;
    this.route = path ? path.slice(1).map((tile) => tileCenter(tile, T)) : [];
    if (this.route.length === 0) this.wait = LOOK_MIN_MS;
  }

  /** Al llegar: se gira hacia lo más cercano que le interesa y se queda mirando; a veces, saltito. */
  private lookAround(interests: readonly Vec[]): void {
    this.wait = LOOK_MIN_MS + this.rng() * LOOK_EXTRA_MS;
    let near: Vec | null = null;
    for (const p of interests) if (!near || Math.hypot(p.x - this.feetPos.x, p.y - this.feetPos.y) < Math.hypot(near.x - this.feetPos.x, near.y - this.feetPos.y)) near = p;
    if (near) this.walker.face(facingFromDelta(near.x - this.feetPos.x, near.y - this.feetPos.y, 'down'));
    if (this.rng() < 0.35) {
      const s = this.interior.layout.scale;
      this.scene.tweens.add({ targets: this.walker.object, y: this.walker.object.y - 4 * s, duration: 140, yoyo: true, ease: 'Quad.Out' });
    }
  }
}
