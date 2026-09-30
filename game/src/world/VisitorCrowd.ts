import type * as Phaser from 'phaser';
import { TILE_SIZE } from '../config';
import { stepAlongPath, tileCenter, worldToTile, type Vec } from '../core/movement';
import type { Point, WalkGrid } from '../core/pathfinding';
import { pickRandom, planWander, walkableTiles, type Rng } from '../core/wander';
import { createVisitor, type Walker } from './Actors';

const VISITOR_EMOJIS = ['🧒', '👧', '👦', '👩', '👨', '🧓', '👵', '👴'];
/** Más lentos que la cuidadora (64 px/s). */
const VISITOR_SPEED = 28;

interface Visitor {
  walker: Walker;
  route: Vec[];
  wait: number;
}

/** Número fijo de visitantes que se reutilizan siempre (nada de crear/destruir). */
export class VisitorCrowd {
  private readonly visitors: Visitor[] = [];
  private readonly tiles: Point[];

  constructor(
    scene: Phaser.Scene,
    private readonly grid: WalkGrid,
    private readonly rng: Rng = Math.random,
  ) {
    this.tiles = walkableTiles(grid);
    VISITOR_EMOJIS.forEach((emoji, index) => {
      const start = pickRandom(this.tiles, rng);
      if (!start) return;
      const pos = tileCenter(start, TILE_SIZE);
      this.visitors.push({ walker: createVisitor(scene, index, pos.x, pos.y, emoji), route: [], wait: rng() * 1500 });
    });
  }

  update(delta: number): void {
    for (const visitor of this.visitors) {
      if (visitor.route.length === 0) {
        visitor.walker.stop();
        visitor.wait -= delta;
        if (visitor.wait > 0) continue;
        const path = planWander(this.grid, worldToTile(visitor.walker, TILE_SIZE), this.tiles, this.rng);
        visitor.route = path ? path.slice(1).map((tile) => tileCenter(tile, TILE_SIZE)) : [];
        visitor.wait = 800 + this.rng() * 2200;
        continue;
      }
      const step = stepAlongPath(visitor.walker, visitor.route, VISITOR_SPEED, delta);
      visitor.walker.moveTo(step.pos.x, step.pos.y);
      visitor.route = step.remaining;
    }
  }
}
