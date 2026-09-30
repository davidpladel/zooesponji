import type * as Phaser from 'phaser';
import { KEEPER_SPEED } from '../config';
import { stepAlongPath, tileCenter, tryMove, worldToTile, type Vec } from '../core/movement';
import type { Facing } from '../core/facing';
import { findPathOrNearest, isWalkable, type WalkGrid } from '../core/pathfinding';
import { sfx } from '../systems/audio';
import { createKeeper, type Walker } from './Actors';
import type { ShopInterior } from './ShopInterior';

const T = 16;
/** Cada cuánto suena un paso mientras anda (ms). */
const STEP_MS = 270;

/**
 * La cuidadora dentro de la tienda. Su posición (los pies) va en píxeles del interior y se dibuja
 * con la escala de la tienda; se ordena por la Y del interior como el mobiliario.
 */
export class ShopKeeperWalker {
  private feetPos: Vec;
  private route: Vec[] = [];
  private readonly walker: Walker;
  private stepClock = 0;
  private walking = false;
  /** Por dónde se entra desde la calle (centro de la casilla de la puerta). */
  private doorPoint: Vec | null = null;

  constructor(
    scene: Phaser.Scene,
    private readonly interior: ShopInterior,
    private grid: WalkGrid,
    start: Vec,
  ) {
    this.feetPos = { ...start };
    const { offsetY, scale } = interior.layout;
    const screen = interior.screen(start);
    // Un pelín por delante de lo que tiene la misma Y (la peana, el mostrador).
    this.walker = createKeeper(scene, screen.x, screen.y, (y) => (y - offsetY) / scale + 0.5);
    // Igual de grande que el tendero.
    this.walker.object.setScale(Math.round(scale * 1.6));
  }

  get feet(): Vec {
    return { ...this.feetPos };
  }

  get moving(): boolean {
    return this.walking;
  }

  get hasRoute(): boolean {
    return this.route.length > 0;
  }

  /** Pantalla: pies y altura dibujada (para poner cosas encima de su cabeza). */
  get screen(): Vec {
    return this.interior.screen(this.feetPos);
  }

  get displayHeight(): number {
    return this.walker.object.displayHeight;
  }

  /** Cambia la cuadrícula (al comprar pueden cambiar las peanas). */
  setGrid(grid: WalkGrid): void {
    this.grid = grid;
  }

  /** ¿Pisa suelo de la tienda? (Mientras entra desde la calle, no.) */
  private get inside(): boolean {
    const tile = worldToTile(this.feetPos, T);
    return isWalkable(this.grid, tile.x, tile.y);
  }

  /** Va andando (con ruta) hasta un punto del interior. False si no hay a dónde ir. */
  goTo(target: Vec): boolean {
    // Si aún está entrando desde la calle, primero cruza la puerta.
    const door = !this.inside && this.doorPoint ? this.doorPoint : null;
    const from = door ?? this.feetPos;
    const path = findPathOrNearest(this.grid, worldToTile(from, T), worldToTile(target, T));
    if (!path) {
      this.route = door ? [door] : [];
      return false;
    }
    const route = (door ? path : path.slice(1)).map((tile) => tileCenter(tile, T));
    // El último tramo va al punto exacto si es de esa misma casilla.
    const last = path[path.length - 1]!;
    const exact = worldToTile(target, T);
    if (exact.x === last.x && exact.y === last.y) route.splice(route.length - 1, 1, { ...target });
    this.route = route;
    return route.length > 0;
  }

  /** Entra desde fuera (debajo de la puerta) apareciendo poco a poco y sigue los puntos dados. */
  walkIn(from: Vec, points: Vec[]): void {
    this.feetPos = { ...from };
    const screen = this.interior.screen(from);
    this.walker.object.setPosition(screen.x, screen.y).setAlpha(0);
    this.walker.object.scene.tweens.add({ targets: this.walker.object, alpha: 1, duration: 350 });
    this.route = points.map((p) => ({ ...p }));
    this.doorPoint = points[0] ? { ...points[0] } : null;
  }

  face(facing: Facing): void {
    this.walker.face(facing);
  }

  /** Se para; si aún está fuera, termina de cruzar la puerta (si no, se quedaría atascado en la calle). */
  stopRoute(): void {
    this.route = !this.inside && this.doorPoint ? [{ ...this.doorPoint }] : [];
  }

  /** `direction` = teclado/joystick (0,0 si no se toca). Devuelve si se ha movido. */
  update(delta: number, direction: Vec): boolean {
    const before = this.feetPos;
    const length = Math.hypot(direction.x, direction.y);
    if (length > 0 && !this.inside && this.doorPoint) {
      // Desde la calle el teclado/joystick solo le hace entrar por la puerta.
      const step = stepAlongPath(this.feetPos, [this.doorPoint], KEEPER_SPEED, delta);
      this.feetPos = step.pos;
    } else if (length > 0) {
      this.route = [];
      const distance = ((KEEPER_SPEED * delta) / 1000) * Math.min(1, length);
      this.feetPos = tryMove(this.grid, T, this.feetPos, (direction.x / length) * distance, (direction.y / length) * distance);
    } else if (this.route.length > 0) {
      const step = stepAlongPath(this.feetPos, this.route, KEEPER_SPEED, delta);
      this.feetPos = step.pos;
      this.route = step.remaining;
    }
    const moved = this.feetPos.x !== before.x || this.feetPos.y !== before.y;
    if (moved) {
      const screen = this.interior.screen(this.feetPos);
      this.walker.moveTo(screen.x, screen.y);
      this.stepClock += delta;
      if (!this.walking || this.stepClock >= STEP_MS) {
        this.stepClock = 0;
        sfx.play('paso');
      }
    } else {
      this.walker.stop();
      this.stepClock = 0;
    }
    this.walking = moved;
    return moved;
  }
}
