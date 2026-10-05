import * as Phaser from 'phaser';
import { getArt } from '../art/art';
import { KEEPER_SPEED, MAPS, TEXTURES, TILE_SIZE } from '../config';
import { approachTile } from '../core/interaction';
import { inJoystickZone } from '../core/joystick';
import { stepAlongPath, tileCenter, tryMove, worldToTile, type Vec } from '../core/movement';
import { findPathOrNearest, isWalkable, type Point, type WalkGrid } from '../core/pathfinding';
import { buildWalkGrid, readEnclosures, readGates, readProps, readShop, readSpawn, type TiledMap } from '../core/tiledmap';
import { PENS, type PenId } from '../data/pens';
import { SHOP_UNLOCK_COINS } from '../data/shop';
import { t } from '../data/strings';
import { sfx } from '../systems/audio';
import { bus } from '../systems/events';
import { joystickState } from '../systems/joystickState';
import { getSession } from '../systems/session';
import { computeZoom } from '../systems/viewport';
import { createKeeper, type Walker } from '../world/Actors';
import { Pens } from '../world/Pens';
import { ShopBuilding } from '../world/ShopBuilding';
import { Decor } from '../world/Decor';
import { TerrainArt } from '../world/TerrainArt';
import { VisitorCrowd } from '../world/VisitorCrowd';
import type { FeedSceneData } from './FeedScene';

/** Si el dedo se desplaza más que esto entre pulsar y soltar, no es un toque. */
const TAP_MAX_DISTANCE = 12;

type WasdKeys = Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;

export class WorldScene extends Phaser.Scene {
  private grid!: WalkGrid;
  private mapData!: TiledMap;
  private keeper!: Walker;
  private marker!: Phaser.GameObjects.Image;
  private route: Vec[] = [];
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd?: WasdKeys;
  private pens!: Pens;
  private shop: ShopBuilding | null = null;
  private visitors!: VisitorCrowd;

  constructor() {
    super('World');
  }

  create(): void {
    const mapData = this.cache.tilemap.get(MAPS.zoo).data as TiledMap;
    this.mapData = mapData;
    this.grid = buildWalkGrid(mapData);

    const map = this.make.tilemap({ key: MAPS.zoo });
    const tileset = map.addTilesetImage('placeholder', TEXTURES.tiles);
    if (!tileset) throw new Error('No se pudo crear el tileset "placeholder"');
    const art = getArt();
    if (art) {
      TerrainArt.build(this, mapData);
      Decor.build(this, mapData);
    } else {
      map.createLayer('suelo', tileset, 0, 0);
    }

    const state = getSession().state;
    this.pens = new Pens(this, readEnclosures(mapData), readGates(mapData), state, readProps(mapData));
    const shopInfo = readShop(mapData);
    this.shop = shopInfo ? new ShopBuilding(this, shopInfo, state) : null;
    this.visitors = new VisitorCrowd(this, this.grid);

    const spawn = tileCenter(readSpawn(mapData), TILE_SIZE);
    this.marker = this.add.image(0, 0, TEXTURES.marker).setVisible(false).setDepth(3);
    this.keeper = createKeeper(this, spawn.x, spawn.y);
    this.route = [];

    const camera = this.cameras.main;
    camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    camera.startFollow(this.keeper.object, true);
    this.applyZoom();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.applyZoom, this);

    this.input.on(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
    const keyboard = this.input.keyboard;
    if (keyboard) {
      this.cursors = keyboard.createCursorKeys();
      this.wasd = keyboard.addKeys('W,A,S,D') as WasdKeys;
    }

    const offShopUnlocked = bus.on('shop-unlocked', () => this.shop?.sync(getSession().state));
    const offFed = bus.on('animal-fed', ({ penId, reaction }) => this.pens.celebrate(penId, reaction));
    this.events.on(Phaser.Scenes.Events.RESUME, this.onResume, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.applyZoom, this);
      this.input.off(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
      this.events.off(Phaser.Scenes.Events.RESUME, this.onResume, this);
      offShopUnlocked();
      offFed();
    });
  }

  update(time: number, delta: number): void {
    this.visitors.update(delta);
    this.pens.update(time, delta);
    this.moveKeeper(delta);

    const tile = worldToTile(this.keeper, TILE_SIZE);
    const state = getSession().state;
    // Al llegar al camino pegado a la puerta de un recinto se abre la ventana de dar de comer.
    const doorstep = this.pens.onKeeperTile(tile, state);
    if (doorstep?.locked) bus.emit('toast', { text: t('toast.needShop') });
    else if (doorstep) {
      this.openFeed(PENS[doorstep.penId].residents[0]!.id);
      return;
    }
    const doorEvent = this.shop?.onKeeperTile(tile, state) ?? null;
    if (doorEvent === 'open') this.openShop();
    else if (doorEvent === 'locked') bus.emit('toast', { text: t('toast.shopLocked', { n: SHOP_UNLOCK_COINS }) });
  }

  /** Manda a la cuidadora hacia un punto del mundo. Devuelve false si no hay a dónde ir. */
  goTo(world: Vec): boolean {
    const path = findPathOrNearest(this.grid, worldToTile(this.keeper, TILE_SIZE), worldToTile(world, TILE_SIZE));
    if (!path || path.length < 2) {
      this.route = [];
      this.marker.setVisible(false);
      return false;
    }
    this.route = path.slice(1).map((tile) => tileCenter(tile, TILE_SIZE));
    const last = this.route[this.route.length - 1]!;
    this.marker.setPosition(last.x, last.y).setVisible(true);
    return true;
  }

  goToTile(x: number, y: number): boolean {
    return this.goTo(tileCenter({ x, y }, TILE_SIZE));
  }

  gateApproachTile(animalId: string): Point | null {
    const enclosure = readEnclosures(this.mapData).find((e) => e.animalId === animalId);
    const gate = readGates(this.mapData).find((g) => g.animalId === animalId);
    return enclosure && gate ? approachTile(gate.tile, enclosure, TILE_SIZE, this.grid) : null;
  }

  shopDoorTile(): Point | null {
    return readShop(this.mapData)?.door ?? null;
  }

  spawnTile(): Point {
    return readSpawn(this.mapData);
  }

  keeperPosition(): Vec {
    return { x: this.keeper.x, y: this.keeper.y };
  }

  worldToScreen(world: Vec): Vec {
    const camera = this.cameras.main;
    return {
      x: (world.x - camera.worldView.x) * camera.zoom,
      y: (world.y - camera.worldView.y) * camera.zoom,
    };
  }

  /** Centro del tile en coordenadas relativas al canvas (para tests). */
  tileToScreen(tile: Point): Vec {
    return this.worldToScreen(tileCenter(tile, TILE_SIZE));
  }

  animalsInPen(penId: PenId): number {
    return this.pens.animalsIn(penId);
  }

  private moveKeeper(delta: number): void {
    const direction = this.inputDirection();
    const length = Math.hypot(direction.x, direction.y);
    if (length > 0) {
      this.route = [];
      this.marker.setVisible(false);
      const distance = ((KEEPER_SPEED * delta) / 1000) * Math.min(1, length);
      const next = tryMove(
        this.grid,
        TILE_SIZE,
        this.keeper,
        (direction.x / length) * distance,
        (direction.y / length) * distance,
      );
      if (next.x === this.keeper.x && next.y === this.keeper.y) this.keeper.stop();
      else this.keeper.moveTo(next.x, next.y);
      return;
    }
    if (this.route.length > 0) {
      const step = stepAlongPath(this.keeper, this.route, KEEPER_SPEED, delta);
      this.keeper.moveTo(step.pos.x, step.pos.y);
      this.route = step.remaining;
      if (this.route.length === 0) this.marker.setVisible(false);
      return;
    }
    this.keeper.stop();
  }

  /** Teclado si se está usando; si no, el joystick virtual. */
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

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.getDistance() > TAP_MAX_DISTANCE) return;
    const down = { x: pointer.downX, y: pointer.downY };
    if (getSession().settings.joystick && inJoystickZone(down, this.scale.width, this.scale.height)) return;

    const point = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const world = { x: point.x, y: point.y };
    if (this.pens.lockedPenAt(world, getSession().state)) bus.emit('toast', { text: t('toast.needShop') });
    this.goTo(world);
  }

  private openFeed(residentId: string): void {
    this.stopWalking();
    sfx.play('tap');
    this.scene.pause();
    const data: FeedSceneData = { residentId };
    this.scene.launch('Feed', data);
  }

  private openShop(): void {
    this.stopWalking();
    this.scene.pause();
    this.scene.launch('Shop');
  }

  private stopWalking(): void {
    this.route = [];
    this.marker.setVisible(false);
  }

  private onResume(_sys: Phaser.Scenes.Systems, data?: { from?: string }): void {
    if (data?.from === 'shop') this.leaveShop();
    const state = getSession().state;
    this.pens.syncUnlocks(state);
    this.shop?.sync(state);
  }

  /** Al salir de la tienda la cuidadora aparece delante de la puerta, mirando hacia abajo (y no vuelve a entrar). */
  private leaveShop(): void {
    const shop = readShop(this.mapData);
    if (!shop) return;
    const below = { x: shop.door.x, y: shop.door.y + 1 };
    if (!isWalkable(this.grid, below.x, below.y)) return;
    const x = (shop.door.x + shop.doorWidth / 2) * TILE_SIZE;
    const y = tileCenter(below, TILE_SIZE).y;
    this.stopWalking();
    // El último paso es hacia abajo: así se queda mirando hacia abajo.
    this.keeper.moveTo(x, y - 1);
    this.keeper.moveTo(x, y);
    this.keeper.stop();
  }

  private applyZoom(): void {
    this.cameras.main.setZoom(computeZoom(this.scale.width, this.scale.height));
  }
}
