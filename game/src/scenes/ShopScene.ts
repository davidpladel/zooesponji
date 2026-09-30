import * as Phaser from 'phaser';
import { getArt, idleFrame } from '../art/art';
import { pedestalFor } from '../core/interiorLayout';
import { inJoystickZone } from '../core/joystick';
import { tileCenter, type Vec } from '../core/movement';
import { isWalkable, type WalkGrid } from '../core/pathfinding';
import { newlyUnlockedPages, unreadPageIds } from '../core/book';
import { shopEntries, type ShopEntry } from '../core/shopEntries';
import { ENTRY_TARGET, approachPoint, hintTarget, onDoorMat, openInteriorGrid, productInReach, shopWalkGrid } from '../core/shopWalk';
import { buildWalkGrid, type TiledMap } from '../core/tiledmap';
import { MAPS } from '../config';
import { t, type StringKey } from '../data/strings';
import { sfx } from '../systems/audio';
import { bus } from '../systems/events';
import { joystickState } from '../systems/joystickState';
import { getSession } from '../systems/session';
import { animalPortrait } from '../world/Actors';
import { ShopHint } from '../world/ShopHint';
import { ShopInterior } from '../world/ShopInterior';
import { ShopKeeperWalker } from '../world/ShopKeeperWalker';
import { Shopkeeper } from '../world/Shopkeeper';
import { addCloseButton, restartOnResize, textStyle } from './ui';

/** Si el dedo se desplaza más que esto entre pulsar y soltar, no es un toque. */
const TAP_MAX_DISTANCE = 12;
/** Pista: a los 6 s quieto sale el rastro de huellas, y luego cada 8 s. */
const HINT_FIRST_MS = 6000;
const HINT_REPEAT_MS = 8000;
/** A esta distancia (px de interior) de la estantería, el libro secreto salta fuera. */
const BOOK_REACH = 28;
/** Dónde se para la cuidadora para mirar la estantería. */
const BOOK_APPROACH = (shelf: Vec): Vec => ({ x: shelf.x, y: shelf.y + 12 });

type WasdKeys = Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;

/** Al girar el móvil la escena se vuelve a montar: la cuidadora sigue donde estaba y no se repite la entrada. */
export interface ShopSceneData {
  keeper?: Vec;
}

interface Product {
  entry: ShopEntry;
  /** Base de la peana (px de interior). */
  base: Vec;
  /** Zona táctil (pantalla). */
  hit: Vec;
  animal: Phaser.GameObjects.Sprite | Phaser.GameObjects.Text;
  parts: Phaser.GameObjects.GameObject[];
}

/** La tienda por dentro: la cuidadora entra andando, se acerca a un animal y lo compra con el bocadillo. */
export class ShopScene extends Phaser.Scene {
  private readonly products = new Map<string, Product>();
  private interior!: ShopInterior;
  private shopkeeper!: Shopkeeper;
  private keeper!: ShopKeeperWalker;
  private hint!: ShopHint;
  private backdrop!: Phaser.GameObjects.Rectangle;
  private baseGrid!: WalkGrid;
  private grid!: WalkGrid;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd?: WasdKeys;
  private buyBubble: Phaser.GameObjects.Container | null = null;
  private activeId: string | null = null;
  private restored: Vec | null = null;
  private entering = false;
  /** La salida por el felpudo solo vale después de haberse apartado de él. */
  private armed = false;
  private idleMs = 0;
  private nextHintMs = HINT_FIRST_MS;
  private busy = false;
  private closing = false;
  private book: Phaser.GameObjects.Text | null = null;
  private bookOut = false;

  constructor() {
    super('Shop');
  }

  init(data?: ShopSceneData): void {
    this.products.clear();
    this.buyBubble = null;
    this.activeId = null;
    this.restored = data?.keeper ?? null;
    this.entering = false;
    this.armed = false;
    this.idleMs = 0;
    this.nextHintMs = HINT_FIRST_MS;
    this.busy = false;
    this.closing = false;
    this.book = null;
    this.bookOut = false;
  }

  create(): void {
    const { width, height } = this.scale;
    this.backdrop = this.add.rectangle(0, 0, width, height, 0x1b120c).setOrigin(0).setDepth(-2000).setInteractive();
    const cached = this.cache.tilemap.get(MAPS.shop) as { data?: TiledMap } | undefined;
    const map = cached?.data ?? null;
    this.interior = new ShopInterior(this, map);
    this.baseGrid = map ? buildWalkGrid(map) : openInteriorGrid();
    this.shopkeeper = new Shopkeeper(this, this.interior);
    this.hint = new ShopHint(this, this.interior.layout.scale);

    this.renderProducts();
    // Si se giró el móvil a mitad de la entrada (o el sitio ya no se pisa), sigue delante de la alfombra.
    const restored = this.restored && isWalkable(this.grid, Math.floor(this.restored.x / 16), Math.floor(this.restored.y / 16)) ? this.restored : ENTRY_TARGET;
    const start = this.restored ? restored : tileCenter(this.interior.spots.doorTile, 16);
    this.keeper = new ShopKeeperWalker(this, this.interior, this.grid, start);
    this.armed = !onDoorMat(start, this.interior.spots.door);

    // De vez en cuando a algún animal se le escapa un corazón.
    this.time.addEvent({ delay: 1800, loop: true, callback: () => this.floatHeart() });
    this.interior.doorMat(() => this.onDoorTap());
    this.addBook();
    addCloseButton(this, () => this.close());

    const keyboard = this.input.keyboard;
    if (keyboard) {
      this.cursors = keyboard.createCursorKeys();
      this.wasd = keyboard.addKeys('W,A,S,D') as WasdKeys;
      keyboard.on('keydown-ESC', this.close, this);
      keyboard.on('keydown', this.endEntry, this);
    }
    this.input.on(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
    restartOnResize(this, () => ({ keeper: this.entering ? ENTRY_TARGET : this.keeper.feet }) satisfies ShopSceneData);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown-ESC', this.close, this);
      this.input.keyboard?.off('keydown', this.endEntry, this);
      this.input.off(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
    });
    if (!this.restored) this.enter();
  }

  update(_time: number, delta: number): void {
    if (this.closing) return;
    const direction = this.inputDirection();
    if (direction.x !== 0 || direction.y !== 0) this.endEntry();
    const moved = this.keeper.update(delta, direction);
    if (this.entering && !this.keeper.hasRoute) {
      // Ya ha entrado: se vuelve hacia nosotros, como diciendo "¡aquí estoy!".
      this.entering = false;
      this.keeper.face('down');
    }

    const feet = this.keeper.feet;
    this.shopkeeper.lookAt(this.keeper.screen.x);
    this.updateReach(feet);
    this.updateBook(feet);

    if (!onDoorMat(feet, this.interior.spots.door)) this.armed = true;
    else if (this.armed && !this.entering) {
      this.close();
      return;
    }
    this.updateHint(moved, delta);
  }

  /** Entrada: fundido, campanita, la cuidadora da unos pasos y el tendero saluda. Se puede cortar. */
  private enter(): void {
    this.cameras.main.fadeIn(300, 0, 0, 0);
    sfx.play('campanita');
    // Entra desde la calle: aparece bajo la puerta, cruza el felpudo y se para delante de la alfombra.
    const door = tileCenter(this.interior.spots.doorTile, 16);
    this.keeper.walkIn({ x: door.x, y: door.y + 22 }, [door, ENTRY_TARGET]);
    this.entering = true;
    this.shopkeeper.hop();
    this.shopkeeper.wave();
    this.shopkeeper.say(t('shop.hello'), 2640);
    // La primera vez, el tendero cuenta el secreto del libro (después del saludo).
    if (!getSession().book.hinted) {
      this.time.delayedCall(2900, () => {
        // Si ya está hablando de un animal, no le pisa: lo contará otra vez que entre.
        if (this.closing || this.activeId || this.busy) return;
        this.shopkeeper.say(t('shop.bookHint'), 3200);
        void getSession().markBookHinted();
      });
    }
  }

  // --- Libro secreto ---

  /**
   * Como los secretos de otros juegos: la estantería solo destella de vez en cuando. Al acercarse
   * la cuidadora, el libro salta fuera; tocarlo lo abre. Tocar la estantería lleva hasta ella.
   */
  private addBook(): void {
    const spot = this.interior.bookShelf;
    if (!spot) return;
    const s = this.interior.layout.scale;
    const shelf = this.interior.screen({ x: spot.x, y: spot.y - 16 });
    this.book = this.add
      .text(shelf.x, shelf.y, '📕', { fontSize: `${Math.round(Math.max(22, 11 * s))}px`, padding: { x: 6, y: 6 } })
      .setOrigin(0.5)
      .setDepth(2000)
      .setVisible(false)
      .setInteractive({ useHandCursor: true });
    this.book.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this.isTap(pointer)) this.openBook();
    });
    const zone = this.add.zone(shelf.x, shelf.y, 32 * s, 32 * s).setDepth(1900).setInteractive({ useHandCursor: true });
    zone.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!this.isTap(pointer)) return;
      if (this.bookOut) this.openBook();
      else this.keeper.goTo(BOOK_APPROACH(spot));
    });
    this.time.addEvent({ delay: 1100, loop: true, callback: () => this.twinkle(spot) });
  }

  /** Destello suave en la estantería; más a menudo si hay páginas sin leer. */
  private twinkle(spot: Vec): void {
    if (this.bookOut) return;
    const session = getSession();
    const unread = unreadPageIds(session.state, session.book.seen).length > 0;
    if (Math.random() > (unread ? 0.8 : 0.35)) return;
    const s = this.interior.layout.scale;
    const at = this.interior.screen({ x: spot.x + Phaser.Math.Between(-12, 12), y: spot.y - Phaser.Math.Between(10, 28) });
    const star = this.add.text(at.x, at.y, '✨', { fontSize: `${Math.round(5 * s)}px` }).setOrigin(0.5).setDepth(1950).setScale(0).setAlpha(0.9);
    this.tweens.add({ targets: star, scale: 1, angle: 90, duration: 350, yoyo: true, ease: 'Sine.InOut', onComplete: () => star.destroy() });
  }

  /** Con la cuidadora cerca, el libro salta fuera de la estantería; al alejarse, vuelve a su sitio. */
  private updateBook(feet: Vec): void {
    const spot = this.interior.bookShelf;
    if (!spot || !this.book) return;
    const near = Math.hypot(feet.x - spot.x, feet.y - (spot.y + 12)) < BOOK_REACH;
    if (near === this.bookOut) return;
    this.bookOut = near;
    const s = this.interior.layout.scale;
    const home = this.interior.screen({ x: spot.x, y: spot.y - 16 });
    this.tweens.killTweensOf(this.book);
    if (near) {
      sfx.play('tap');
      this.book.setVisible(true).setPosition(home.x, home.y).setScale(0.3).setAngle(0);
      this.tweens.add({ targets: this.book, y: home.y - 14 * s, scale: 1.2, angle: -10, duration: 320, ease: 'Back.Out' });
      this.tweens.add({ targets: this.book, y: home.y - 17 * s, duration: 500, yoyo: true, repeat: -1, delay: 320, ease: 'Sine.InOut' });
    } else {
      this.tweens.add({ targets: this.book, y: home.y, scale: 0.3, duration: 200, onComplete: () => this.book?.setVisible(false) });
    }
  }

  openBook(): void {
    if (this.closing || this.scene.isActive('Book')) return;
    sfx.play('tap');
    this.hint.hide();
    this.scene.launch('Book');
  }

  /** Dónde tocar para el libro: el libro si ha salido, si no la estantería. */
  bookScreenPos(): Vec | null {
    if (!this.book) return null;
    if (this.bookOut) return { x: this.book.x, y: this.book.y };
    const spot = this.interior.bookShelf!;
    return this.interior.screen({ x: spot.x, y: spot.y - 16 });
  }

  bookIsOut(): boolean {
    return this.bookOut;
  }

  /** Cualquier toque, tecla o joystick corta el paseo de entrada (y el saludo) y da el control. */
  private endEntry(): void {
    if (!this.entering) return;
    this.entering = false;
    this.keeper.stopRoute();
    if (this.shopkeeper.message === t('shop.hello')) this.shopkeeper.hideBubble();
  }

  close(): void {
    if (!this.scene.isActive() || this.closing) return;
    this.closing = true;
    this.hint.hide();
    this.cameras.main.fadeOut(180, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.stop();
      this.scene.resume('World', { from: 'shop' });
    });
  }

  // --- API para pruebas ---

  cardScreenPos(itemId: string): Vec | null {
    return this.products.get(itemId)?.hit ?? null;
  }

  /** Estado de un producto (para pruebas): 'buy' | 'owned' | 'full'. */
  cardStatus(itemId: string): string | null {
    return this.products.get(itemId)?.entry.status ?? null;
  }

  bubbleText(): string | null {
    return this.shopkeeper.message;
  }

  doorScreenPos(): Vec {
    const door = this.interior.screen(this.interior.spots.door);
    return { x: door.x, y: door.y - 2 * this.interior.layout.scale };
  }

  keeperScreenPos(): Vec {
    return this.keeper.screen;
  }

  buyBubblePos(): Vec | null {
    return this.buyBubble ? { x: this.buyBubble.x, y: this.buyBubble.y } : null;
  }

  /** Producto que la cuidadora tiene a mano (null si ninguno). */
  activeItem(): string | null {
    return this.activeId;
  }

  hintVisible(): boolean {
    return this.hint.visible;
  }

  // --- Entrada del jugador ---

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

  private isTap(pointer: Phaser.Input.Pointer): boolean {
    if (pointer.getDistance() > TAP_MAX_DISTANCE) return false;
    const down = { x: pointer.downX, y: pointer.downY };
    return !(getSession().settings.joystick && inJoystickZone(down, this.scale.width, this.scale.height));
  }

  /** Tocar el suelo: la cuidadora va andando hasta allí. */
  private onPointerUp(pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]): void {
    if (this.closing || !this.isTap(pointer)) return;
    this.endEntry();
    if (over.some((o) => o !== this.backdrop)) return; // peana, bocadillo, felpudo o ✖
    const { offsetX, offsetY, scale } = this.interior.layout;
    this.keeper.goTo({ x: (pointer.x - offsetX) / scale, y: (pointer.y - offsetY) / scale });
  }

  /** Tocar un animal: la cuidadora va hasta su peana (si ya está al lado, el bocadillo late). */
  private onProductTap(pointer: Phaser.Input.Pointer, id: string): void {
    if (this.closing || !this.isTap(pointer)) return;
    this.endEntry();
    const product = this.products.get(id);
    if (!product) return;
    if (this.activeId === id) {
      if (this.buyBubble) this.tweens.add({ targets: this.buyBubble, scale: 1.25, duration: 120, yoyo: true });
      return;
    }
    const target = approachPoint(this.grid, product.base);
    if (target) this.keeper.goTo(target);
  }

  private onDoorTap(): void {
    if (this.closing) return;
    this.endEntry();
    if (onDoorMat(this.keeper.feet, this.interior.spots.door)) this.close();
    else this.keeper.goTo(tileCenter(this.interior.spots.doorTile, 16));
  }

  // --- Peanas, alcance y compra ---

  private renderProducts(): void {
    for (const product of this.products.values()) for (const part of product.parts) part.destroy();
    this.products.clear();
    const entries = shopEntries(getSession().state);
    entries.forEach((entry, index) => this.addProduct(entry, pedestalFor(this.interior.spots, index, entries.length)));
    this.grid = shopWalkGrid(this.baseGrid, [...this.products.values()].map((p) => p.base));
    this.keeper?.setGrid(this.grid);
  }

  private addProduct(entry: ShopEntry, base: Vec): void {
    const s = this.interior.layout.scale;
    const pos = this.interior.screen(base);
    const parts: Phaser.GameObjects.GameObject[] = this.interior.drawPedestal(base);
    const done = entry.status !== 'buy';
    const affordable = getSession().state.coins >= entry.cost;

    const animal = animalPortrait(this, entry.animalId, pos.x, pos.y, 28 * s).setOrigin(0.5, 1).setDepth(base.y);
    if (done) {
      animal.setAlpha(0.5);
      if (animal instanceof Phaser.GameObjects.Sprite) animal.setTint(0x9e9e9e);
    }
    // Bota suavecito, cada uno a su ritmo.
    this.tweens.add({ targets: animal, y: pos.y - 2 * s, duration: 520, yoyo: true, repeat: -1, delay: Phaser.Math.Between(0, 500), ease: 'Sine.InOut' });
    parts.push(animal);

    const fontSize = Math.round(Math.max(16, 6.5 * s));
    // Como en otras tiendas: se compra → precio; no quedan → sello AGOTADO sobre el animal en gris.
    if (done) {
      const stamp = this.add
        .text(pos.x, pos.y - 12 * s, t('shop.soldOut'), {
          fontFamily: 'sans-serif',
          fontSize: `${Math.round(fontSize * 0.85)}px`,
          fontStyle: 'bold',
          color: '#ffffff',
          backgroundColor: '#c62828',
          padding: { x: Math.round(2.5 * s), y: Math.round(1 * s) },
        })
        .setOrigin(0.5)
        .setAngle(-12)
        .setDepth(1500);
      parts.push(stamp);
    } else {
      const sign = this.add
        .text(pos.x, pos.y + 12 * s, `🪙 ${entry.cost}`, {
          fontFamily: 'sans-serif',
          fontSize: `${fontSize}px`,
          color: '#ffffff',
          backgroundColor: affordable ? '#43a047' : '#9e9e9e',
          padding: { x: Math.round(2.5 * s), y: Math.round(1.5 * s) },
        })
        .setOrigin(0.5, 0)
        .setDepth(1500);
      parts.push(sign);
    }
    if (entry.kind === 'extra') {
      // Cuántos tienes ya, en letra pequeña bajo el precio (o el sello): informa, no pide nada.
      const have = t('shop.have', { n: entry.count ?? 0, max: entry.max ?? 0 });
      parts.push(this.add.text(pos.x, pos.y + (done ? 4 : 25) * s, have, textStyle(Math.round(fontSize * 0.7), '#fff8e1', '#4e342e')).setOrigin(0.5, 0).setDepth(1500));
    }

    // Zona táctil generosa (peana + animal) para dedos pequeños.
    const hit = { x: pos.x, y: pos.y - 10 * s };
    const zone = this.add.zone(hit.x, hit.y, 38 * s, 44 * s).setDepth(3000).setInteractive({ useHandCursor: true });
    zone.on('pointerup', (pointer: Phaser.Input.Pointer) => this.onProductTap(pointer, entry.id));
    parts.push(zone);

    this.products.set(entry.id, { entry, base, hit, animal, parts });
  }

  /** ¿Qué peana tiene a mano la cuidadora? Al cambiar, reacciona el animal y habla el tendero. */
  private updateReach(feet: Vec, quiet = false): void {
    const list = [...this.products.values()];
    const index = productInReach(feet, list.map((p) => p.base));
    const id = index === null ? null : list[index]!.entry.id;
    if (id === this.activeId) return;
    this.activeId = id;
    this.hideBuyBubble();
    const product = id ? this.products.get(id) : undefined;
    if (!product) return;
    if (!quiet) {
      this.greet(product);
      const entry = product.entry;
      const line: StringKey = entry.status === 'owned' ? 'shop.owned' : entry.status === 'full' ? 'shop.full' : (`shop.about.${entry.animalId}` as StringKey);
      this.shopkeeper.say(t(line), 2400);
    }
    if (product.entry.status === 'buy') this.showBuyBubble(product);
  }

  /** El animal se gira hacia la cuidadora, da un saltito y suelta un corazón. */
  private greet(product: Product): void {
    const s = this.interior.layout.scale;
    const animal = product.animal;
    if (animal instanceof Phaser.GameObjects.Sprite && getArt()) {
      animal.setFrame(idleFrame(this.keeper.screen.x < animal.x ? 'left' : 'right'));
    }
    this.tweens.add({ targets: animal, y: animal.y - 7 * s, duration: 150, yoyo: true, ease: 'Quad.Out' });
    this.floatHeart(product);
  }

  /** Bocadillo de compra encima del animal: verde si llega el dinero, gris si no. Tocarlo compra. */
  private showBuyBubble(product: Product): void {
    const s = this.interior.layout.scale;
    const entry = product.entry;
    const affordable = getSession().state.coins >= entry.cost;
    const text = this.add
      .text(0, 0, `¡Comprar! 🪙 ${entry.cost}`, {
        fontFamily: 'sans-serif',
        fontSize: `${Math.round(Math.max(18, 7.5 * s))}px`,
        color: '#ffffff',
        stroke: affordable ? '#1b5e20' : '#424242',
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    const w = text.width + 10 * s;
    const h = text.height + 6 * s;
    const g = this.add.graphics();
    g.fillStyle(affordable ? 0x43a047 : 0x9e9e9e).lineStyle(Math.max(2, s * 0.75), 0xffffff);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 4 * s).strokeRoundedRect(-w / 2, -h / 2, w, h, 4 * s);
    g.fillTriangle(-4 * s, h / 2 - 1, 4 * s, h / 2 - 1, 0, h / 2 + 5 * s);
    const lift = entry.kind === 'extra' ? 12 * s : 0; // por encima de la chapita ➕ n/max
    const y = Math.max(h / 2 + 4, product.animal.y - product.animal.displayHeight - 8 * s - h / 2 - lift);
    const bubble = this.add.container(product.hit.x, y, [g, text]).setDepth(3100).setScale(0);
    bubble.setSize(w, h + 5 * s).setInteractive({ useHandCursor: true });
    bubble.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this.isTap(pointer)) void this.onBuy(entry);
    });
    this.tweens.add({ targets: bubble, scale: 1, duration: 200, ease: 'Back.Out' });
    this.tweens.add({ targets: bubble, y: y - 2 * s, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.InOut', delay: 200 });
    this.buyBubble = bubble;
  }

  private hideBuyBubble(): void {
    if (!this.buyBubble) return;
    this.tweens.killTweensOf(this.buyBubble);
    this.buyBubble.destroy();
    this.buyBubble = null;
  }

  private async onBuy(entry: ShopEntry): Promise<void> {
    if (this.busy || this.closing || entry.status !== 'buy') return;
    this.busy = true;
    this.idleMs = 0;
    const s = this.interior.layout.scale;
    const before = getSession().state;
    const result = await getSession().buy(entry.id);
    if (result.ok) {
      sfx.play('buy');
      // Comprar un recinto puede hacer aparecer su extra: se rehacen todas las peanas.
      this.renderProducts();
      this.activeId = null;
      this.hideBuyBubble();
      this.updateReach(this.keeper.feet, true);
      const product = this.products.get(entry.id);
      if (product) {
        this.tweens.add({ targets: product.animal, y: product.animal.y - 12 * s, duration: 160, yoyo: true, ease: 'Quad.Out' });
        this.coinShower(product.hit);
      }
      this.shopkeeper.hop();
      this.shopkeeper.say(t('shop.thanks'), 1980);
      // Página nueva: aviso y el libro se abrirá por ella.
      const fresh = newlyUnlockedPages(before, result.state)[0];
      if (fresh) {
        bus.emit('toast', { text: t('book.newPage') });
        void getSession().setBookPage(fresh);
      }
    } else if (result.error === 'not-enough-coins') {
      sfx.play('rechaza');
      const product = this.products.get(entry.id);
      if (product) this.tweens.add({ targets: product.animal, x: product.animal.x + 3 * s, duration: 50, yoyo: true, repeat: 3 });
      this.shopkeeper.say(t('shop.needCoins'), 1980);
    }
    this.busy = false;
  }

  // --- Pista para peques ---

  private updateHint(moved: boolean, delta: number): void {
    if (moved || this.keeper.hasRoute || this.entering) {
      this.idleMs = 0;
      this.nextHintMs = HINT_FIRST_MS;
      this.hint.hide();
      return;
    }
    this.idleMs += delta;
    if (this.idleMs < this.nextHintMs) return;
    this.nextHintMs += HINT_REPEAT_MS;
    const entries = [...this.products.values()].map((p) => p.entry);
    const target = hintTarget(entries, getSession().state.coins);
    if (target === this.activeId) return; // ya está a su lado: el bocadillo late solo
    const to = target === 'door' ? this.doorScreenPos() : this.products.get(target)!.hit;
    const from = this.keeper.screen;
    this.hint.show({ x: from.x, y: from.y - 2 * this.interior.layout.scale }, to);
  }

  // --- Adornos ---

  /** Un corazón sube despacito desde un animal (al azar si no se dice cuál) y se desvanece. */
  private floatHeart(chosen?: Product): void {
    const products = [...this.products.values()].filter((p) => p.entry.status !== 'full');
    const product = chosen ?? products[Phaser.Math.Between(0, products.length - 1)];
    if (!product) return;
    const s = this.interior.layout.scale;
    const heart = this.add
      .text(product.animal.x + Phaser.Math.Between(-6, 6) * s, product.animal.y - product.animal.displayHeight, '💗', {
        fontSize: `${Math.round(6 * s)}px`,
      })
      .setOrigin(0.5)
      .setDepth(1400)
      .setScale(0.4);
    this.tweens.add({
      targets: heart,
      y: heart.y - 18 * s,
      scale: 1,
      alpha: { from: 1, to: 0 },
      duration: 1600,
      ease: 'Sine.Out',
      onComplete: () => heart.destroy(),
    });
  }

  /** Lluvia corta de monedas y estrellitas sobre el animal comprado. */
  private coinShower(at: Vec): void {
    const s = this.interior.layout.scale;
    for (let i = 0; i < 10; i++) {
      const icon = this.add
        .text(at.x, at.y, i % 3 === 0 ? '✨' : '🪙', { fontSize: `${Math.round(7 * s)}px` })
        .setOrigin(0.5)
        .setDepth(2500);
      const angle = -Math.PI / 2 + Phaser.Math.FloatBetween(-1.1, 1.1);
      const dist = Phaser.Math.Between(18, 34) * s;
      this.tweens.add({
        targets: icon,
        x: at.x + Math.cos(angle) * dist,
        y: at.y + Math.sin(angle) * dist,
        alpha: 0,
        scale: 1.4,
        duration: Phaser.Math.Between(500, 800),
        ease: 'Quad.Out',
        onComplete: () => icon.destroy(),
      });
    }
  }
}
