import * as Phaser from 'phaser';
import { getArt, vetKey } from '../art/art';
import { MAPS } from '../config';
import { clinicSlots } from '../core/care';
import { inJoystickZone } from '../core/joystick';
import { tileCenter, type Vec } from '../core/movement';
import type { Point, WalkGrid } from '../core/pathfinding';
import { ENTRY_TARGET, approachPoint, onDoorMat, openInteriorGrid, productInReach, shopWalkGrid } from '../core/shopWalk';
import { buildWalkGrid, type TiledMap } from '../core/tiledmap';
import { findResident } from '../data/pens';
import { t } from '../data/strings';
import { sfx } from '../systems/audio';
import { bus } from '../systems/events';
import { joystickState } from '../systems/joystickState';
import { getSession } from '../systems/session';
import { textStyle } from '../ui/theme';
import { addUiText } from '../ui/text';
import { addCloseBadge, restartOnResize } from '../ui/widgets';
import { animalPortrait } from '../world/Actors';
import { ShopInterior } from '../world/ShopInterior';
import { ShopKeeperWalker } from '../world/ShopKeeperWalker';
import { Shopkeeper } from '../world/Shopkeeper';
import type { CureSceneData } from './CureScene';

/** Si el dedo se desplaza más que esto entre pulsar y soltar, no es un toque. */
const TAP_MAX_DISTANCE = 12;

type WasdKeys = Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;

/** Al girar el móvil la escena se vuelve a montar: la cuidadora sigue donde estaba. */
export interface ClinicSceneData {
  keeper?: Vec;
}

interface Bed {
  base: Point;
  residentId: string | null;
  /** Zona táctil (pantalla). */
  hit: Vec;
  parts: Phaser.GameObjects.GameObject[];
}

/** Punto suelto del mapa del interior (la veterinaria), en px. */
function mapPoint(map: TiledMap | null, kind: string): Point | null {
  for (const layer of map?.layers ?? []) {
    if (layer.type !== 'objectgroup') continue;
    const found = layer.objects.find((o) => (o.type || o.class) === kind);
    if (found) return { x: found.x, y: found.y };
  }
  return null;
}

/**
 * La clínica por dentro, como la tienda: la cuidadora entra andando y se mueve igual. Hay dos camillas con
 * los animales malitos (si los hay) y dos veterinarios tras el mostrador. Tocar a un animal lleva hasta él y
 * abre la cura.
 */
export class ClinicScene extends Phaser.Scene {
  private interior!: ShopInterior;
  private vets: Shopkeeper[] = [];
  private keeper!: ShopKeeperWalker;
  private backdrop!: Phaser.GameObjects.Rectangle;
  private baseGrid!: WalkGrid;
  private grid!: WalkGrid;
  private beds: Bed[] = [];
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd?: WasdKeys;
  private restored: Vec | null = null;
  private entering = false;
  private armed = false;
  private closing = false;
  /** Camilla hacia la que va la cuidadora para curar (se abre la cura al llegar). */
  private target: number | null = null;

  constructor() {
    super('Clinic');
  }

  init(data?: ClinicSceneData): void {
    this.restored = data?.keeper ?? null;
    this.beds = [];
    this.vets = [];
    this.entering = false;
    this.armed = false;
    this.closing = false;
    this.target = null;
  }

  create(): void {
    const { width, height } = this.scale;
    this.backdrop = this.add.rectangle(0, 0, width, height, 0x1b120c).setOrigin(0).setDepth(-2000).setInteractive();
    const cached = this.cache.tilemap.get(MAPS.clinic) as { data?: TiledMap } | undefined;
    const map = cached?.data ?? null;
    this.interior = new ShopInterior(this, map, { sign: `🏥 ${t('shop.clinic.name')}` });
    this.baseGrid = map ? buildWalkGrid(map) : openInteriorGrid();
    const vets = getArt()?.vets ?? [];
    const second = mapPoint(map, 'veterinaria') ?? { x: this.interior.spots.shopkeeper.x + 28, y: this.interior.spots.shopkeeper.y };
    this.vets = [
      new Shopkeeper(this, this.interior, { texture: vets[0] ? vetKey(0) : undefined, emoji: '🧑‍⚕️' }),
      new Shopkeeper(this, this.interior, { at: second, texture: vets[1] ? vetKey(1) : undefined, emoji: '👩‍⚕️' }),
    ];
    this.renderBeds();

    const start = this.restored ?? tileCenter(this.interior.spots.doorTile, 16);
    this.keeper = new ShopKeeperWalker(this, this.interior, this.grid, start);
    this.armed = !onDoorMat(start, this.interior.spots.door);
    this.interior.doorMat(() => this.onDoorTap());
    const badge = addCloseBadge(this, width - 16 - 32, 16 + 32, () => this.close(), 56).setDepth(4000);
    // Con la cura encima, una sola X: la de la cura.
    const hideBadge = (): void => void badge.setVisible(false);
    const showBadge = (): void => void badge.setVisible(true);
    this.events.on(Phaser.Scenes.Events.PAUSE, hideBadge);
    this.events.on(Phaser.Scenes.Events.RESUME, showBadge);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off(Phaser.Scenes.Events.PAUSE, hideBadge);
      this.events.off(Phaser.Scenes.Events.RESUME, showBadge);
    });

    const keyboard = this.input.keyboard;
    if (keyboard) {
      this.cursors = keyboard.createCursorKeys();
      this.wasd = keyboard.addKeys('W,A,S,D') as WasdKeys;
      keyboard.on('keydown-ESC', this.close, this);
    }
    this.input.on(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
    this.events.on(Phaser.Scenes.Events.RESUME, this.onResume, this);
    restartOnResize(this, () => ({ keeper: this.keeper.feet }) satisfies ClinicSceneData);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown-ESC', this.close, this);
      this.input.off(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
      this.events.off(Phaser.Scenes.Events.RESUME, this.onResume, this);
    });
    if (!this.restored) this.enter();
  }

  update(_time: number, delta: number): void {
    if (this.closing) return;
    const direction = this.inputDirection();
    if (direction.x !== 0 || direction.y !== 0) {
      this.entering = false;
      this.target = null;
    }
    this.keeper.update(delta, direction);
    if (this.entering && !this.keeper.hasRoute) {
      this.entering = false;
      this.keeper.face('down');
    }
    const feet = this.keeper.feet;
    for (const vet of this.vets) vet.lookAt(this.keeper.screen.x);
    if (this.target !== null && productInReach(feet, this.beds.map((b) => b.base)) === this.target) {
      const bed = this.beds[this.target];
      this.target = null;
      if (bed?.residentId) this.openCure(bed.residentId);
      return;
    }
    if (!onDoorMat(feet, this.interior.spots.door)) this.armed = true;
    else if (this.armed && !this.entering) this.close();
  }

  private enter(): void {
    this.cameras.main.fadeIn(300, 0, 0, 0);
    sfx.play('campanita');
    const door = tileCenter(this.interior.spots.doorTile, 16);
    this.keeper.walkIn({ x: door.x, y: door.y + 22 }, [door, ENTRY_TARGET]);
    this.entering = true;
    const anySick = this.beds.some((b) => b.residentId);
    bus.emit('clinic-opened', { sick: this.beds.filter((b) => b.residentId).length });
    this.vets[0]?.wave();
    this.vets[0]?.say(t(anySick ? 'clinic.hello' : 'clinic.none'), 2800);
  }

  close(): void {
    if (!this.scene.isActive() || this.closing) return;
    this.closing = true;
    bus.emit('clinic-closed', {});
    this.cameras.main.fadeOut(180, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.stop();
      this.scene.resume('World', { from: 'clinic' });
    });
  }

  /** Vuelve de curar: el curado ya no está en su camilla; el otro malito sigue allí. */
  private onResume(): void {
    this.renderBeds();
    this.keeper.setGrid(this.grid);
  }

  private openCure(residentId: string): void {
    this.keeper.stopRoute();
    sfx.play('tap');
    this.scene.pause();
    const data: CureSceneData = { residentId };
    this.scene.launch('Cure', data);
  }

  // --- Camillas ---

  private renderBeds(): void {
    for (const bed of this.beds) for (const part of bed.parts) part.destroy();
    const slots = clinicSlots(getSession().care);
    const bases = this.interior.spots.pedestals.slice(0, slots.length);
    this.beds = bases.map((base, i) => this.addBed(base, slots[i] ?? null, i));
    this.grid = shopWalkGrid(this.baseGrid, this.beds.map((b) => b.base));
  }

  /** Camilla de madera con sábana blanca y almohada; encima, el animal malito con su carita. */
  private addBed(base: Point, residentId: string | null, index: number): Bed {
    const s = this.interior.layout.scale;
    const c = this.interior.screen(base);
    const depth = base.y - 1;
    const g = this.add.graphics().setDepth(depth);
    const w = 40 * s;
    const h = 14 * s;
    g.fillStyle(0x000000, 0.22).fillRect(c.x - w / 2 + s, c.y - h / 2 + 3 * s, w, h);
    g.fillStyle(0x8d6e63).fillRect(c.x - w / 2, c.y - h / 2 + 2 * s, w, h);
    g.fillStyle(0xfafafa).fillRect(c.x - w / 2 + s, c.y - h / 2, w - 2 * s, h - 2 * s);
    g.fillStyle(0x90caf9).fillRect(c.x - w / 2 + s, c.y - h / 2 + h * 0.45, w - 2 * s, h * 0.35);
    g.fillStyle(0xffffff).fillRect(c.x - w / 2 + 3 * s, c.y - h / 2 + 2 * s, 8 * s, 5 * s);
    g.lineStyle(Math.max(1, s / 2), 0x5d4037).strokeRect(c.x - w / 2, c.y - h / 2, w, h + 2 * s);
    const parts: Phaser.GameObjects.GameObject[] = [g];
    if (residentId) {
      const found = findResident(residentId);
      if (found) {
        const portrait = animalPortrait(this, found.resident.species, c.x, c.y, 26 * s, found.resident.look).setOrigin(0.5, 0.85).setDepth(depth + 0.5);
        this.tweens.add({ targets: portrait, scaleY: portrait.scaleY * 0.96, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
        const sad = this.add.text(c.x + 12 * s, c.y - portrait.displayHeight * 0.8, '🤒', { fontSize: `${Math.round(9 * s)}px`, padding: { x: 4, y: 4 } }).setOrigin(0.5).setDepth(depth + 1);
        this.tweens.add({ targets: sad, scale: 1.15, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
        const label = addUiText(this, c.x, c.y + 10 * s, t('clinic.sick'), textStyle(Math.round(Math.max(13, 5.5 * s)), '#fff8e1', '#4e342e')).setOrigin(0.5, 0).setDepth(1500);
        parts.push(portrait, sad, label);
      }
    }
    const hit = { x: c.x, y: c.y - 10 * s };
    const zone = this.add.zone(hit.x, hit.y, 44 * s, 40 * s).setDepth(3000).setInteractive({ useHandCursor: true });
    zone.on('pointerup', (pointer: Phaser.Input.Pointer) => this.onBedTap(pointer, index));
    parts.push(zone);
    return { base, residentId, hit, parts };
  }

  /** Tocar a un malito: la cuidadora va hasta su camilla y, al llegar, se abre la cura. */
  private onBedTap(pointer: Phaser.Input.Pointer, index: number): void {
    if (this.closing || !this.isTap(pointer)) return;
    this.entering = false;
    const bed = this.beds[index];
    if (!bed?.residentId) return;
    if (productInReach(this.keeper.feet, this.beds.map((b) => b.base)) === index) {
      this.openCure(bed.residentId);
      return;
    }
    const target = approachPoint(this.grid, bed.base);
    if (!target) return;
    this.target = index;
    this.keeper.goTo(target);
  }

  // --- Pruebas ---

  /** Quién está en cada camilla. */
  bedResidents(): (string | null)[] {
    return this.beds.map((b) => b.residentId);
  }

  /** Dónde tocar cada camilla (pantalla). */
  bedScreenPos(index: number): Vec | null {
    return this.beds[index]?.hit ?? null;
  }

  doorScreenPos(): Vec {
    const door = this.interior.screen(this.interior.spots.door);
    return { x: door.x, y: door.y - 2 * this.interior.layout.scale };
  }

  // --- Entrada del jugador ---

  private inputDirection(): Vec {
    const c = this.cursors;
    const k = this.wasd;
    if (c && k) {
      const x = (c.right.isDown || k.D.isDown ? 1 : 0) - (c.left.isDown || k.A.isDown ? 1 : 0);
      const y = (c.down.isDown || k.S.isDown ? 1 : 0) - (c.up.isDown || k.W.isDown ? 1 : 0);
      if (x !== 0 || y !== 0) return { x, y };
    }
    return joystickState.vector;
  }

  private isTap(pointer: Phaser.Input.Pointer): boolean {
    if (pointer.getDistance() > TAP_MAX_DISTANCE) return false;
    const down = { x: pointer.downX, y: pointer.downY };
    return !(getSession().settings.joystick && inJoystickZone(down, this.scale.width, this.scale.height));
  }

  private onPointerUp(pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]): void {
    if (this.closing || !this.isTap(pointer)) return;
    this.entering = false;
    if (over.some((o) => o !== this.backdrop)) return;
    this.target = null;
    const { offsetX, offsetY, scale } = this.interior.layout;
    this.keeper.goTo({ x: (pointer.x - offsetX) / scale, y: (pointer.y - offsetY) / scale });
  }

  private onDoorTap(): void {
    if (this.closing) return;
    this.entering = false;
    if (onDoorMat(this.keeper.feet, this.interior.spots.door)) this.close();
    else this.keeper.goTo(tileCenter(this.interior.spots.doorTile, 16));
  }
}
