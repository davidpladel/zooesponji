import * as Phaser from 'phaser';
import { getArt } from '../art/art';
import { KEEPER_SPEED, MAPS, TEXTURES, TILE_SIZE } from '../config';
import { isPenOpen, type GameState } from '../core/economy';
import { facingFromDelta } from '../core/facing';
import { approachTile } from '../core/interaction';
import { inJoystickZone } from '../core/joystick';
import { stepAlongPath, tileCenter, tryMove, worldToTile, type Vec } from '../core/movement';
import { findPathOrNearest, isWalkable, type Point, type WalkGrid } from '../core/pathfinding';
import { withPenInteriors } from '../core/penGrid';
import { shopVisited } from '../core/save';
import { tourWaypoints } from '../core/tour';
import { followTrail, recordTrail } from '../core/petFollow';
import { noPen, stepNear, type NearState } from '../core/penNear';
import { buildWalkGrid, readBoard, readEnclosures, readGates, readProps, readWater, readShop, readSpawn, withSolidProps, type TiledMap } from '../core/tiledmap';
import { PEN_IDS, residentsIn, type PenId } from '../data/pens';
import { SHOP_UNLOCK_COINS } from '../data/shop';
import { t } from '../data/strings';
import { getAds } from '../systems/ads';
import { sfx } from '../systems/audio';
import { getCommunity } from '../systems/community';
import { bus, type ControlMode } from '../systems/events';
import { joystickState } from '../systems/joystickState';
import { getSession } from '../systems/session';
import { computeZoom } from '../systems/viewport';
import { createKeeper, createPet, type Walker } from '../world/Actors';
import { Board } from '../world/Board';
import { Pens } from '../world/Pens';
import { ShopBuilding } from '../world/ShopBuilding';
import { Decor, getWalkPieces } from '../world/Decor';
import { TerrainArt } from '../world/TerrainArt';
import { PawTrail } from '../world/PawTrail';
import { VisitorCrowd } from '../world/VisitorCrowd';
import type { AdOfferSceneData } from './AdOfferScene';
import type { FeedSceneData } from './FeedScene';
import type { HudScene } from './HudScene';

/** Si el dedo se desplaza más que esto entre pulsar y soltar, no es un toque. */
const TAP_MAX_DISTANCE = 12;
/** Radio (px) alrededor de un animal en el que un toque cuenta como tocarlo. */
const TAP_REACH = 14;
/** Distancia (px) a la que la cuidadora ya puede dar de comer a un animal. */
const FEED_REACH = 18;
/** El panel de la pausa salta un momento después de volver al mapa: deja acabar el fundido de la tienda. */
const AD_OFFER_MS = 300;
/** El aviso de votación se mira un poco después del anuncio, para no pisarse. */
const NOTICE_MS = AD_OFFER_MS + 250;
/** Lo que Luna espera quieta antes de pararse y mirar a la cuidadora. */
const PET_REST_MS = 200;
/** Lo que duran las huellas hasta la tienda si nadie las sigue (ms). */
const TRAIL_MS = 30_000;

type WasdKeys = Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;

export class WorldScene extends Phaser.Scene {
  /** Caminos más el interior de los recintos abiertos: por aquí anda la cuidadora. */
  private grid!: WalkGrid;
  /** Solo caminos: por aquí andan los visitantes. */
  private pathGrid!: WalkGrid;
  /** Residente hacia el que va la cuidadora para darle de comer. */
  private feedTarget: string | null = null;
  private near: NearState<PenId> = noPen();
  /** Formas de moverse ya avisadas desde que se montó el mapa. */
  private readonly controlsUsed = new Set<ControlMode>();
  private mapData!: TiledMap;
  private keeper!: Walker;
  private marker!: Phaser.GameObjects.Image;
  private route: Vec[] = [];
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd?: WasdKeys;
  private pens!: Pens;
  private shop: ShopBuilding | null = null;
  private board: Board | null = null;
  private visitors!: VisitorCrowd;
  /** Luna, si se ha comprado: sigue el rastro de la cuidadora. */
  private pet: Walker | null = null;
  private petTrail: Vec[] = [];
  /** Rato (ms) que Luna lleva sin avanzar: solo se sienta pasado PET_REST_MS (si no, se cortan los pasos). */
  private petIdle = 0;
  /** Huellas de Luna hasta la tienda (botón de la tienda, antes de la primera visita). */
  private trail!: PawTrail;

  constructor() {
    super('World');
  }

  create(): void {
    const mapData = this.cache.tilemap.get(MAPS.zoo).data as TiledMap;
    this.mapData = mapData;
    this.pathGrid = withSolidProps(buildWalkGrid(mapData), readProps(mapData), TILE_SIZE);

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
    this.pens = new Pens(this, readEnclosures(mapData), readGates(mapData), state, readProps(mapData), computeZoom(this.scale.width, this.scale.height), readWater(mapData));
    this.grid = withPenInteriors(this.pathGrid, this.pens.openSpaces(state), TILE_SIZE);
    const shopInfo = readShop(mapData);
    this.shop = shopInfo ? new ShopBuilding(this, shopInfo, state) : null;
    const boardInfo = readBoard(mapData);
    this.board = boardInfo ? new Board(this, boardInfo) : null;
    this.visitors = new VisitorCrowd(this, this.pathGrid);
    this.syncVisitors(state);
    this.trail = new PawTrail(this, TILE_SIZE);

    const spawn = tileCenter(readSpawn(mapData), TILE_SIZE);
    this.marker = this.add.image(0, 0, TEXTURES.marker).setVisible(false).setDepth(3);
    this.keeper = createKeeper(this, spawn.x, spawn.y);
    this.route = [];
    this.feedTarget = null;
    this.near = noPen();
    this.controlsUsed.clear();
    this.pet = null;
    this.petTrail = [];
    this.syncPet();

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
    const offCommunity = bus.on('community-updated', () => {
      this.board?.sync();
      this.time.delayedCall(NOTICE_MS, () => this.maybeNotice());
    });
    const offFed = bus.on('animal-fed', ({ residentId, reaction }) => this.pens.celebrate(residentId, reaction));
    this.events.on(Phaser.Scenes.Events.RESUME, this.onResume, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.applyZoom, this);
      this.input.off(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
      this.events.off(Phaser.Scenes.Events.RESUME, this.onResume, this);
      offShopUnlocked();
      offFed();
      offCommunity();
    });
    this.time.delayedCall(NOTICE_MS, () => {
      if (!this.maybeTutorialOffer()) this.maybeNotice();
    });
  }

  update(time: number, delta: number): void {
    this.visitors.update(delta);
    this.pens.update(time, delta, this.cameras.main.worldView, { keeper: this.keeperPosition(), ...this.visitors.people() });
    this.moveKeeper(delta);
    this.updatePet(delta);
    const pos = this.keeperPosition();
    this.watchPens(pos, delta);
    if (this.reachResident(pos)) return;

    const state = getSession().state;

    const tile = worldToTile(this.keeper, TILE_SIZE);
    this.trail.stepOn(tile);
    if (this.pens.lockedDoorstep(tile, state)) bus.emit('toast', { text: t('toast.needShop') });
    const doorEvent = this.shop?.onKeeperTile(tile, state) ?? null;
    if (doorEvent === 'open') this.openShop();
    else if (doorEvent === 'locked') {
      bus.emit('shop-locked', { missing: Math.max(0, SHOP_UNLOCK_COINS - state.coins) });
      bus.emit('toast', { text: t('toast.shopLocked', { n: SHOP_UNLOCK_COINS }) });
    }
    if (this.board?.onKeeperTile(tile)) this.openBoard();
  }

  /** Avisa cuando la cuidadora lleva un rato junto a un recinto: es una visita, no un ir de paso. */
  private watchPens(pos: Vec, delta: number): void {
    const step = stepNear(this.near, this.pens.rects(), pos, delta);
    this.near = step.state;
    if (step.entered) bus.emit('pen-near', { penId: step.entered, locked: !isPenOpen(getSession().state, step.entered) });
  }

  private usedControl(mode: ControlMode): void {
    if (this.controlsUsed.has(mode)) return;
    this.controlsUsed.add(mode);
    bus.emit('control-used', { mode });
  }

  /**
   * Abre la comida al llegar junto al animal que se ha tocado. Pasar andando al lado de otro no abre
   * nada: en un recinto con varios animales saltaba sin querer a cada paso.
   */
  private reachResident(pos: Vec): boolean {
    if (!this.feedTarget) return false;
    const at = this.pens.positionOf(this.feedTarget);
    if (at && Math.hypot(at.x - pos.x, at.y - pos.y) <= FEED_REACH) {
      this.openFeed(this.feedTarget);
      return true;
    }
    // No hay camino hasta él: se deja de esperar.
    if (this.route.length === 0) this.cancelFeedTarget();
    return false;
  }

  private cancelFeedTarget(): void {
    this.feedTarget = null;
    this.pens.release();
  }

  /** Manda a la cuidadora a dar de comer a un animal concreto. False si ese animal no está en el zoo. */
  feedResident(residentId: string): boolean {
    const at = this.pens.positionOf(residentId);
    if (!at) return false;
    this.feedTarget = residentId;
    this.pens.hold(residentId);
    this.goTo(at);
    return true;
  }

  residentScreenPos(residentId: string): Vec | null {
    const at = this.pens.positionOf(residentId);
    return at ? this.worldToScreen(at) : null;
  }

  keeperInPen(penId: PenId): boolean {
    return this.pens.contains(penId, this.keeperPosition());
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

  gateApproachTile(penId: string): Point | null {
    const enclosure = readEnclosures(this.mapData).find((e) => e.penId === penId);
    const gate = readGates(this.mapData).find((g) => g.penId === penId);
    return enclosure && gate ? approachTile(gate.tile, enclosure, TILE_SIZE, this.pathGrid) : null;
  }

  shopDoorTile(): Point | null {
    return readShop(this.mapData)?.door ?? null;
  }

  /** Centro de la puerta de la tienda, en pantalla (las 2 casillas). */
  shopDoorScreenPos(): Vec | null {
    const shop = readShop(this.mapData);
    if (!shop) return null;
    return this.worldToScreen({ x: (shop.door.x + shop.doorWidth / 2) * TILE_SIZE, y: (shop.door.y + 0.5) * TILE_SIZE });
  }

  /**
   * Botón de la tienda. Antes de la primera visita salen las huellas de Luna por el camino hasta la puerta (otro
   * toque las apaga); después, la cuidadora va andando sola. Devuelve lo que ha hecho.
   */
  guideToShop(): 'huellas' | 'apagar' | 'andando' | null {
    const door = this.shopDoorTile();
    if (!door) return null;
    if (shopVisited(getSession().shop)) {
      this.cancelFeedTarget();
      this.trail.hide();
      return this.goToTile(door.x, door.y) ? 'andando' : null;
    }
    if (this.trail.active) {
      this.trail.fadeOut();
      return 'apagar';
    }
    const path = findPathOrNearest(this.grid, worldToTile(this.keeper, TILE_SIZE), door);
    if (!path || path.length < 2) return null;
    this.trail.show(path, TRAIL_MS);
    return 'huellas';
  }

  /** ¿Hay huellas hasta la tienda? */
  shopTrailActive(): boolean {
    return this.trail?.active ?? false;
  }

  /** Para pruebas: casillas con huella. */
  shopTrailTiles(): Point[] {
    return this.trail?.tiles() ?? [];
  }

  /** Para pruebas: la ruta que andaría la cuidadora hasta la puerta de la tienda. */
  shopRoute(): Point[] {
    const door = this.shopDoorTile();
    return door ? (findPathOrNearest(this.grid, worldToTile(this.keeper, TILE_SIZE), door) ?? []) : [];
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

  /** Los visitantes andan por los caminos y, si está abierta, por dentro de la granja de contacto. */
  private syncVisitors(state: GameState): void {
    this.visitors.setGrid(withPenInteriors(this.pathGrid, this.pens.visitorSpaces(state), TILE_SIZE));
    this.visitors.setPetting(this.pens.petting(state));
  }

  visitorsInPen(penId: PenId): number {
    return this.visitors.insideCount(this.pens.rectOf(penId));
  }

  /** Para pruebas: un visitante aparece delante de la puerta del recinto y entra a acariciar. */
  sendVisitorInside(penId: PenId): boolean {
    const tile = this.gateApproachTile(penId);
    return tile ? this.visitors.sendInside(tileCenter(tile, TILE_SIZE)) : false;
  }

  petHearts(): number {
    return this.pens.heartsShown;
  }

  private moveKeeper(delta: number): void {
    const direction = this.inputDirection();
    const length = Math.hypot(direction.x, direction.y);
    if (length > 0) {
      this.route = [];
      this.marker.setVisible(false);
      if (this.feedTarget) this.cancelFeedTarget();
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
      if (x !== 0 || y !== 0) {
        this.usedControl('teclado');
        return { x, y };
      }
    }
    const stick = joystickState.vector;
    if (stick.x !== 0 || stick.y !== 0) this.usedControl('joystick');
    return stick;
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.getDistance() > TAP_MAX_DISTANCE) return;
    const down = { x: pointer.downX, y: pointer.downY };
    if (getSession().settings.joystick && inJoystickZone(down, this.scale.width, this.scale.height)) return;
    if (this.scene.isActive('Hud') && this.scene.get<HudScene>('Hud').coversPoint(down.x, down.y)) return;

    const point = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const world = { x: point.x, y: point.y };
    const state = getSession().state;
    const hit = this.pens.residentAt(world, state, TAP_REACH);
    this.usedControl('toque');
    if (hit) {
      bus.emit('animal-tapped', { residentId: hit.residentId });
      this.feedResident(hit.residentId);
      return;
    }
    if (this.board?.hit(world)) {
      this.cancelFeedTarget();
      const at = this.board.info.tile;
      this.goToTile(at.x, at.y);
      return;
    }
    this.cancelFeedTarget();
    const locked = this.pens.lockedPenAt(world, state);
    if (locked) {
      bus.emit('locked-tap', { penId: locked });
      bus.emit('toast', { text: t('toast.needShop') });
    }
    this.goTo(world);
  }

  private openFeed(residentId: string): void {
    this.stopWalking();
    this.feedTarget = null;
    this.pens.hold(residentId);
    sfx.play('tap');
    bus.emit('feed-opened', { residentId });
    this.scene.pause();
    const data: FeedSceneData = { residentId };
    this.scene.launch('Feed', data);
  }

  private openShop(): void {
    this.stopWalking();
    this.trail.hide();
    bus.emit('shop-opened', {});
    this.scene.pause();
    // Datos vacíos a propósito: Phaser se queda con los del último reinicio (un giro dentro de la tienda)
    // si no se le pasan otros, y la visita nueva parecería la continuación de aquella.
    this.scene.launch('Shop', {});
  }

  /** Abre el tablón: el mundo queda en pausa debajo. */
  openBoard(): void {
    if (!getCommunity() || this.scene.isActive('Board')) return;
    this.stopWalking();
    sfx.play('tap');
    this.scene.pause();
    this.scene.launch('Board');
  }

  boardTile(): Point | null {
    return this.board?.visible ? this.board.info.tile : null;
  }

  boardScreenPos(): Vec | null {
    return this.board?.visible ? this.tileToScreen(this.board.info.standTile) : null;
  }

  boardSparkling(): boolean {
    return this.board?.sparkling() ?? false;
  }


  private stopWalking(): void {
    this.route = [];
    this.marker.setVisible(false);
  }

  /** Pone el mundo al día con el estado: recintos recién abiertos, animales nuevos y por dónde se anda. */
  refresh(): void {
    const state = getSession().state;
    this.pens.release();
    this.pens.syncUnlocks(state);
    this.grid = withPenInteriors(this.pathGrid, this.pens.openSpaces(state), TILE_SIZE);
    this.syncVisitors(state);
    this.shop?.sync(state);
    this.syncPet();
  }

  private onResume(_sys: Phaser.Scenes.Systems, data?: { from?: string }): void {
    if (data?.from === 'shop') this.leaveShop();
    this.refresh();
    // Lo visto en el tablón apaga la estrellita.
    this.board?.sync();
    // Una pausa natural: se vuelve de dar de comer o de la tienda. De Ajustes, del libro o de «¿Salir?», no.
    if (data?.from === 'shop' || data?.from === 'feed') this.time.delayedCall(AD_OFFER_MS, () => this.offerAd());
    if (data?.from !== 'notice' && data?.from !== 'board') this.time.delayedCall(NOTICE_MS, () => this.maybeNotice());
  }

  /** Mientras se aprende a jugar no salen anuncios ni avisos: un panel cada vez. */
  private tutorialRunning(): boolean {
    return this.scene.isActive('Tutorial') || this.scene.isActive('TutorialOffer');
  }

  /**
   * La primera vez (también a quien ya jugaba antes de esta versión), el aviso de aprender a jugar.
   * Las pruebas automáticas lo saltan con `?sin-tutorial` (solo en desarrollo).
   */
  private maybeTutorialOffer(): boolean {
    if (getSession().tutorial.offered || !this.scene.isActive() || this.scene.isActive('AdOffer') || this.scene.isActive('PollNotice')) return false;
    if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('sin-tutorial')) return false;
    this.stopWalking();
    this.scene.pause();
    this.scene.launch('TutorialOffer');
    return true;
  }

  /** Para el tutorial: una casilla de camino a unas casillas de la cuidadora, en pantalla. */
  tutorialMoveTarget(): Vec | null {
    const from = worldToTile(this.keeper, TILE_SIZE);
    for (const [dx, dy] of [[0, -4], [4, 0], [-4, 0], [0, 4], [0, -3], [3, 0], [-3, 0], [0, 3], [0, -5], [5, 0], [-5, 0], [0, 5]] as const) {
      if (isWalkable(this.grid, from.x + dx, from.y + dy)) return this.tileToScreen({ x: from.x + dx, y: from.y + dy });
    }
    return null;
  }

  /** Para el tutorial: el animal del zoo más cercano a la cuidadora y dónde está en pantalla. */
  tutorialAnimal(): { residentId: string; screen: Vec } | null {
    const keeper = this.keeperPosition();
    const state = getSession().state;
    let best: { residentId: string; at: Vec; d: number } | null = null;
    for (const penId of PEN_IDS) {
      for (const r of residentsIn(penId, state.counts[penId])) {
        const at = this.pens.positionOf(r.id);
        if (!at) continue;
        const d = Math.hypot(at.x - keeper.x, at.y - keeper.y);
        if (!best || d < best.d) best = { residentId: r.id, at, d };
      }
    }
    return best ? { residentId: best.residentId, screen: this.worldToScreen(best.at) } : null;
  }

  /** Una vez por votación, al llegar al mapa, si no hay otro panel abierto. Si lo hay, espera a otra vuelta. */
  private maybeNotice(): void {
    if (this.tutorialRunning()) return;
    // Las demás ventanas (tienda, comer, libro, tablón, ajustes, salir) pausan World, así que aquí isActive() es falso.
    if (!this.scene.isActive() || this.scene.isActive('AdOffer') || this.scene.isActive('PollNotice')) return;
    if (getAds()?.panelOpen) return;
    if (!getCommunity()?.notify()) return;
    this.stopWalking();
    this.scene.pause();
    this.scene.launch('PollNotice');
  }

  /** Si toca y hay anuncio listo, se ofrece: el mundo queda en pausa debajo del panel. */
  private offerAd(): void {
    if (!this.scene.isActive() || this.tutorialRunning()) return;
    if (!getAds()?.canOffer('pausa')) return;
    const data: AdOfferSceneData = { slot: 'pausa', resume: 'World' };
    this.stopWalking();
    this.scene.pause();
    this.scene.launch('AdOffer', data);
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
    // Luna se quedó curioseando en la tienda: sale con ella.
    if (this.pet) {
      this.pet.moveTo(x + 12, y);
      this.pet.face('down');
    }
    this.petTrail = [];
  }

  /** Luna aparece junto a la cuidadora en cuanto se ha comprado. */
  private syncPet(): void {
    if (this.pet || !getSession().state.luna) return;
    this.pet = createPet(this, 'luna', this.keeper.x + 12, this.keeper.y);
    this.petTrail = [];
  }

  /** Luna va por el rastro de la cuidadora; si esta entra en un recinto, la espera en la puerta. */
  private updatePet(delta: number): void {
    if (!this.pet) return;
    const keeper = this.keeperPosition();
    const tile = worldToTile(keeper, TILE_SIZE);
    this.petTrail = recordTrail(this.petTrail, keeper, isWalkable(this.pathGrid, tile.x, tile.y));
    const step = followTrail({ x: this.pet.x, y: this.pet.y }, this.petTrail, delta);
    this.petTrail = step.trail;
    if (step.pos.x !== this.pet.x || step.pos.y !== this.pet.y) this.pet.moveTo(step.pos.x, step.pos.y);
    // Pegada a la cuidadora avanza a tirones (un fotograma sí y otro no): pararla en cada uno cortaba la animación de las patas.
    this.petIdle = step.moving ? 0 : this.petIdle + delta;
    if (this.petIdle >= PET_REST_MS) this.pet.face(facingFromDelta(keeper.x - this.pet.x, keeper.y - this.pet.y, 'down'));
  }

  /** Para pruebas: casilla de la cuidadora. */
  keeperTile(): Point {
    return { x: Math.floor(this.keeper.x / TILE_SIZE), y: Math.floor(this.keeper.y / TILE_SIZE) };
  }

  /**
   * Para pruebas: puntos para recorrer a pie desde donde está la cuidadora todos los caminos (`withPens`
   * false) o el interior de los recintos abiertos (true), con como mucho `maxStep` pasos entre dos.
   */
  tourWaypoints(maxStep: number, withPens: boolean): Point[] {
    const start = this.keeperTile();
    if (!withPens) return tourWaypoints(this.pathGrid, start, maxStep);
    return tourWaypoints(this.grid, start, maxStep, (p) => !isWalkable(this.pathGrid, p.x, p.y));
  }

  /** Para pruebas: piezas que se pisan y se dibujan encima de la cuidadora o de Luna (vacío = bien). */
  walkPropsAbove(): string[] {
    const actors = [this.keeper.object, this.pet?.object].filter((o): o is NonNullable<typeof o> => Boolean(o));
    const above: string[] = [];
    for (const { name, piece } of getWalkPieces()) {
      const bounds = piece.getBounds();
      for (const actor of actors) {
        if (piece.depth >= actor.depth && Phaser.Geom.Intersects.RectangleToRectangle(bounds, actor.getBounds())) above.push(name);
      }
    }
    return above;
  }

  /** Para pruebas: dónde está Luna en el mapa. */
  petPosition(): Vec | null {
    return this.pet ? { x: this.pet.x, y: this.pet.y } : null;
  }

  private applyZoom(): void {
    const zoom = computeZoom(this.scale.width, this.scale.height);
    this.cameras.main.setZoom(zoom);
    this.pens?.setZoom(zoom);
  }
}
