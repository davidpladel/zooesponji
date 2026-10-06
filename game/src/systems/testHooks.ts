import type * as Phaser from 'phaser';
import { getArt } from '../art/art';
import { openPens } from '../core/economy';
import type { Vec } from '../core/movement';
import type { Settings } from '../core/save';
import { BOOK_CHAPTERS } from '../data/book';
import type { FoodId } from '../data/foods';
import type { PenId } from '../data/pens';
import type { FeedScene } from '../scenes/FeedScene';
import type { HudScene } from '../scenes/HudScene';
import type { BookScene } from '../scenes/BookScene';
import type { SettingsScene } from '../scenes/SettingsScene';
import type { ShopScene } from '../scenes/ShopScene';
import type { TitleScene } from '../scenes/TitleScene';
import type { WorldScene } from '../scenes/WorldScene';
import { getLanguage } from './language';
import type { Platform } from './platform';
import { getSession } from './session';

export interface ZooTestApi {
  activeScenes(): string[];
  keeperPosition(): Vec | null;
  tileToScreen(x: number, y: number): Vec | null;
  addCoins(amount: number): Promise<void>;
  /** Compra un artículo sin pasar por la tienda (para llegar rápido a un recinto en las pruebas). */
  buy(itemId: string): Promise<boolean>;
  hudCoinsText(): string | null;
  openFeed(residentId: string): void;
  feedTargets(): { animal: Vec; foods: Partial<Record<FoodId, Vec>> } | null;
  isFeedBusy(): boolean;
  openShop(): void;
  shopCardScreenPos(itemId: string): Vec | null;
  shopCardStatus(itemId: string): string | null;
  shopBubble(): string | null;
  shopDoorScreenPos(): Vec | null;
  shopKeeperScreenPos(): Vec | null;
  shopBuyBubblePos(): Vec | null;
  shopHintVisible(): boolean;
  shopActiveItem(): string | null;
  shopBookPos(): Vec | null;
  shopBookOut(): boolean;
  bookPage(): string | null;
  bookText(): string | null;
  bookNext(): void;
  /** Abre el libro por una página, sin pasar por la estantería de la tienda. */
  openBook(page?: string): void;
  /** Con el índice abierto: dónde tocar para abrir un capítulo. */
  bookIndexPos(chapter: string): Vec | null;
  unlocked(): string[];
  /** Simula el botón atrás de Android; devuelve la acción aplicada. */
  back(): Promise<string>;
  /** Provoca un error no controlado (para probar la pantalla de error). */
  crash(): void;
  openSettings(): void;
  settingsTogglePos(key: 'music' | 'sfx' | 'joystick'): Vec | null;
  settings(): Settings;
  /** Idioma activo: 'es' o 'en'. */
  language(): string;
  titlePlayLabel(): string | null;
  settingsLanguagePos(): Vec | null;
  settingsLanguageLabel(): string | null;
  settingsCredits(): string | null;
  settingsButtonPos(key: 'privacy' | 'quit'): Vec | null;
  counts(): Record<PenId, number>;
  animalsInPen(penId: PenId): number;
  /** Manda a la cuidadora a dar de comer a un animal (lo mismo que tocarlo). */
  feedResident(residentId: string): boolean;
  residentScreenPos(residentId: string): Vec | null;
  keeperInPen(penId: PenId): boolean;
  visitorsInPen(penId: PenId): number;
  /** Un visitante aparece delante de la puerta del recinto y entra a acariciar. */
  sendVisitorInside(penId: PenId): boolean;
  petHearts(): number;
  goToTile(x: number, y: number): boolean;
  artMode(): boolean;
  gateApproachTile(penId: string): { x: number; y: number } | null;
  shopDoorTile(): { x: number; y: number } | null;
  spawnTile(): { x: number; y: number } | null;
}

declare global {
  interface Window {
    __ZOO__?: ZooTestApi;
    /** Solo en desarrollo, para depurar desde la consola. */
    __GAME__?: Phaser.Game;
  }
}

/** Solo en desarrollo: API para Playwright y depuración. Nunca en la build de producción. */
export function installTestHooks(game: Phaser.Game, platform: Platform): void {
  if (!import.meta.env.DEV) return;

  const activeScene = <T extends Phaser.Scene>(key: string): T | null =>
    game.scene.isActive(key) ? (game.scene.getScene(key) as T) : null;

  window.__GAME__ = game;
  window.__ZOO__ = {
    activeScenes: () => game.scene.getScenes(true).map((scene) => scene.scene.key),
    keeperPosition: () => activeScene<WorldScene>('World')?.keeperPosition() ?? null,
    tileToScreen: (x, y) => activeScene<WorldScene>('World')?.tileToScreen({ x, y }) ?? null,
    addCoins: (amount) => getSession().earnCoins(amount),
    buy: async (itemId) => {
      const result = await getSession().buy(itemId);
      game.scene.getScene<WorldScene>('World').refresh();
      return result.ok;
    },
    hudCoinsText: () => activeScene<HudScene>('Hud')?.coinsLabel() ?? null,
    openFeed: (residentId) => {
      if (game.scene.isActive('World')) game.scene.pause('World');
      game.scene.start('Feed', { residentId });
    },
    feedTargets: () => activeScene<FeedScene>('Feed')?.targetsOnScreen() ?? null,
    isFeedBusy: () => activeScene<FeedScene>('Feed')?.isBusy() ?? false,
    openShop: () => {
      if (game.scene.isActive('World')) game.scene.pause('World');
      game.scene.start('Shop');
    },
    shopCardScreenPos: (itemId) => activeScene<ShopScene>('Shop')?.cardScreenPos(itemId) ?? null,
    shopCardStatus: (itemId) => activeScene<ShopScene>('Shop')?.cardStatus(itemId) ?? null,
    shopBubble: () => activeScene<ShopScene>('Shop')?.bubbleText() ?? null,
    shopDoorScreenPos: () => activeScene<ShopScene>('Shop')?.doorScreenPos() ?? null,
    shopKeeperScreenPos: () => activeScene<ShopScene>('Shop')?.keeperScreenPos() ?? null,
    shopBuyBubblePos: () => activeScene<ShopScene>('Shop')?.buyBubblePos() ?? null,
    shopHintVisible: () => activeScene<ShopScene>('Shop')?.hintVisible() ?? false,
    shopActiveItem: () => activeScene<ShopScene>('Shop')?.activeItem() ?? null,
    shopBookPos: () => activeScene<ShopScene>('Shop')?.bookScreenPos() ?? null,
    shopBookOut: () => activeScene<ShopScene>('Shop')?.bookIsOut() ?? false,
    bookPage: () => activeScene<BookScene>('Book')?.pageId() ?? null,
    bookText: () => activeScene<BookScene>('Book')?.pageText() ?? null,
    bookNext: () => activeScene<BookScene>('Book')?.next(),
    openBook: (page) => {
      if (game.scene.isActive('World')) game.scene.pause('World');
      game.scene.start('Book', { page });
    },
    bookIndexPos: (chapter) => {
      const id = BOOK_CHAPTERS.find((c) => c === chapter);
      return id ? (activeScene<BookScene>('Book')?.indexPos(id) ?? null) : null;
    },
    openSettings: () => game.scene.getScene<HudScene>('Hud').openSettings(),
    settingsTogglePos: (key) => activeScene<SettingsScene>('Settings')?.togglePos(key) ?? null,
    settings: () => ({ ...getSession().settings }),
    settingsCredits: () => activeScene<SettingsScene>('Settings')?.creditsText() ?? null,
    language: () => getLanguage(),
    titlePlayLabel: () => activeScene<TitleScene>('Title')?.playLabel() ?? null,
    settingsLanguagePos: () => activeScene<SettingsScene>('Settings')?.languagePos() ?? null,
    settingsLanguageLabel: () => activeScene<SettingsScene>('Settings')?.languageLabel() ?? null,
    settingsButtonPos: (key) => activeScene<SettingsScene>('Settings')?.buttonPos(key) ?? null,
    back: () => platform.back(),
    crash: () => {
      setTimeout(() => {
        throw new Error('Error de prueba');
      });
    },
    unlocked: () => openPens(getSession().state),
    counts: () => ({ ...getSession().state.counts }),
    animalsInPen: (penId) => game.scene.getScene<WorldScene>('World').animalsInPen(penId),
    feedResident: (residentId) => activeScene<WorldScene>('World')?.feedResident(residentId) ?? false,
    residentScreenPos: (residentId) => activeScene<WorldScene>('World')?.residentScreenPos(residentId) ?? null,
    // Con getScene: se consulta también con el mundo en pausa (ventana de comer abierta).
    keeperInPen: (penId) => game.scene.getScene<WorldScene>('World').keeperInPen(penId),
    visitorsInPen: (penId) => activeScene<WorldScene>('World')?.visitorsInPen(penId) ?? 0,
    sendVisitorInside: (penId) => activeScene<WorldScene>('World')?.sendVisitorInside(penId) ?? false,
    petHearts: () => activeScene<WorldScene>('World')?.petHearts() ?? 0,
    goToTile: (x, y) => activeScene<WorldScene>('World')?.goToTile(x, y) ?? false,
    artMode: () => getArt() !== null,
    gateApproachTile: (penId) => activeScene<WorldScene>('World')?.gateApproachTile(penId) ?? null,
    shopDoorTile: () => activeScene<WorldScene>('World')?.shopDoorTile() ?? null,
    spawnTile: () => activeScene<WorldScene>('World')?.spawnTile() ?? null,
  };
}
