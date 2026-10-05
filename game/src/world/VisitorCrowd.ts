import type * as Phaser from 'phaser';
import { TILE_SIZE } from '../config';
import { rectContains, type Rect } from '../core/interaction';
import { stepAlongPath, tileCenter, worldToTile, type Vec } from '../core/movement';
import { findPath, type Point, type WalkGrid } from '../core/pathfinding';
import { roomInside } from '../core/petting';
import { pickRandom, planWander, walkableTiles, type Rng } from '../core/wander';
import { createVisitor, type Walker } from './Actors';

const VISITOR_EMOJIS = ['🧒', '👧', '👦', '👩', '👨', '🧓', '👵', '👴'];
/** El mapa grande es cuatro veces el de antes: con 8 visitantes se veía vacío. */
const VISITOR_COUNT = 14;
/** Más lentos que la cuidadora (64 px/s). */
const VISITOR_SPEED = 28;
/** De cada paseo, cuántos van a acariciar a un animal de la granja (si está abierta y cabe). */
const PET_CHANCE = 0.3;

/** Recinto donde entran los visitantes y los animales que se dejan acariciar. */
export interface Petting {
  area: Rect;
  spots(): Vec[];
}

interface Visitor {
  walker: Walker;
  route: Vec[];
  /** A dónde va (el final de su ruta); null si está parado. */
  goal: Vec | null;
  wait: number;
}

/** Número fijo de visitantes que se reutilizan siempre (nada de crear/destruir). */
export class VisitorCrowd {
  private readonly visitors: Visitor[] = [];
  /** Casillas de camino: a dónde van de paseo. */
  private readonly tiles: Point[];
  /** Por dónde pueden andar: los caminos y, si está abierta, la granja de contacto. */
  private grid: WalkGrid;
  private petting: Petting | null = null;

  constructor(
    scene: Phaser.Scene,
    paths: WalkGrid,
    private readonly rng: Rng = Math.random,
  ) {
    this.grid = paths;
    this.tiles = walkableTiles(paths);
    for (let index = 0; index < VISITOR_COUNT; index++) {
      const start = pickRandom(this.tiles, rng);
      if (!start) return;
      const pos = tileCenter(start, TILE_SIZE);
      const emoji = VISITOR_EMOJIS[index % VISITOR_EMOJIS.length]!;
      this.visitors.push({ walker: createVisitor(scene, index, pos.x, pos.y, emoji), route: [], goal: null, wait: rng() * 1500 });
    }
  }

  setGrid(grid: WalkGrid): void {
    this.grid = grid;
  }

  setPetting(petting: Petting | null): void {
    this.petting = petting;
  }

  update(delta: number): void {
    for (const visitor of this.visitors) {
      if (visitor.route.length === 0) {
        visitor.walker.stop();
        visitor.goal = null;
        visitor.wait -= delta;
        if (visitor.wait > 0) continue;
        this.setRoute(visitor, this.plan(visitor));
        continue;
      }
      const step = stepAlongPath(visitor.walker, visitor.route, VISITOR_SPEED, delta);
      visitor.walker.moveTo(step.pos.x, step.pos.y);
      visitor.route = step.remaining;
    }
  }

  /** Dónde está cada visitante, según ande o esté parado (para que las ovejas reaccionen). */
  people(): { walking: Vec[]; standing: Vec[] } {
    const walking: Vec[] = [];
    const standing: Vec[] = [];
    for (const v of this.visitors) (v.route.length > 0 ? walking : standing).push({ x: v.walker.x, y: v.walker.y });
    return { walking, standing };
  }

  insideCount(area: Rect): number {
    return this.visitors.filter((v) => rectContains(area, v.walker)).length;
  }

  /** Para pruebas: el primer visitante aparece en `from` y va a acariciar. False si no hay a quién o no hay paso. */
  sendInside(from: Vec): boolean {
    const visitor = this.visitors[0];
    if (!visitor) return false;
    visitor.walker.moveTo(from.x, from.y);
    visitor.walker.stop();
    const path = this.pathToPet(visitor);
    if (!path) return false;
    this.setRoute(visitor, path);
    return true;
  }

  private setRoute(visitor: Visitor, path: Point[] | null): void {
    visitor.route = path ? path.slice(1).map((tile) => tileCenter(tile, TILE_SIZE)) : [];
    visitor.goal = visitor.route[visitor.route.length - 1] ?? null;
    // Al llegar se queda un rato; junto a un animal, más.
    const petting = this.petting !== null && visitor.goal !== null && rectContains(this.petting.area, visitor.goal);
    visitor.wait = petting ? 2500 + this.rng() * 2000 : 800 + this.rng() * 2200;
  }

  private plan(visitor: Visitor): Point[] | null {
    const pet = this.petting;
    if (pet && this.rng() < PET_CHANCE) {
      const strollers = this.visitors.map((v) => ({ pos: { x: v.walker.x, y: v.walker.y }, goal: v.goal }));
      if (roomInside(strollers, pet.area)) {
        const path = this.pathToPet(visitor);
        if (path) return path;
      }
    }
    return planWander(this.grid, worldToTile(visitor.walker, TILE_SIZE), this.tiles, this.rng);
  }

  /** Camino hasta la casilla de uno de los animales que se dejan acariciar. */
  private pathToPet(visitor: Visitor): Point[] | null {
    const spot = pickRandom(this.petting?.spots() ?? [], this.rng);
    if (!spot) return null;
    const path = findPath(this.grid, worldToTile(visitor.walker, TILE_SIZE), worldToTile(spot, TILE_SIZE));
    return path && path.length > 1 ? path : null;
  }
}
