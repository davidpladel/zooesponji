import * as Phaser from 'phaser';
import { getArt, interiorKey, propKey } from '../art/art';
import { FALLBACK_SPOTS, interiorLayout, toScreen, type InteriorLayout } from '../core/interiorLayout';
import type { Point } from '../core/pathfinding';
import { readInteriorSpots, wallRows, type InteriorDeco, type InteriorSpots, type TiledMap } from '../core/tiledmap';
import { t } from '../data/strings';
import { textStyle } from '../scenes/ui';

const MAP_W = 320;
const MAP_H = 192;

/** Tamaño de cada pieza (px de interior) y cómo se pinta sin arte. Coincide con los recortes de art.config.json. */
const PIECES: Record<string, { w: number; h: number; color: number; emoji?: string }> = {
  window: { w: 14, h: 17, color: 0xb3e5fc },
  clock: { w: 13, h: 13, color: 0x8d6e63, emoji: '🕰️' },
  frames: { w: 30, h: 15, color: 0x6d4c41, emoji: '🖼️' },
  candles: { w: 12, h: 14, color: 0xffcc80, emoji: '🕯️' },
  'shelf-wide': { w: 48, h: 32, color: 0x8d6e63 },
  'shelf-a': { w: 32, h: 32, color: 0x8d6e63 },
  'shelf-b': { w: 32, h: 32, color: 0x8d6e63 },
  bookcase: { w: 32, h: 32, color: 0x795548, emoji: '📚' },
  counter: { w: 48, h: 32, color: 0xa1887f },
  bread: { w: 16, h: 21, color: 0xd7a86e, emoji: '🧺' },
  'crate-green': { w: 16, h: 24, color: 0x7cb342, emoji: '🥬' },
  'crate-yellow': { w: 16, h: 24, color: 0xfdd835, emoji: '🍌' },
  'crate-red': { w: 16, h: 24, color: 0xe53935, emoji: '🍎' },
  barrel: { w: 12, h: 15, color: 0x6d4c41 },
  plant: { w: 14, h: 21, color: 0x43a047, emoji: '🪴' },
  flowers: { w: 16, h: 10, color: 0x81c784, emoji: '🌼' },
  'flowers-red': { w: 16, h: 10, color: 0x81c784, emoji: '🌺' },
};

/** Colores de los banderines: alegres y suaves. */
const BUNTING = [0xf48fb1, 0xfff176, 0x80cbc4, 0x81d4fa, 0xce93d8, 0xffab91];

/** Textura de una pieza: primero las del interior; si no, una del zoo (flores). Null = sin arte. */
function textureFor(piece: string): string | null {
  const art = getArt();
  if (!art) return null;
  if (art.interior[piece]) return interiorKey(piece);
  const prop = art.props[piece];
  return prop && !prop.frames ? propKey(piece) : null;
}

/** El interior de la tienda: suelo, pared, muebles y ambiente (luz de ventanas, velas, polvo). */
export class ShopInterior {
  readonly spots: InteriorSpots;
  readonly layout: InteriorLayout;
  /** La estantería donde se esconde el libro (base en px de interior), si la hay. */
  readonly bookShelf: Point | null;
  private readonly withArt: boolean;

  constructor(
    private readonly scene: Phaser.Scene,
    map: TiledMap | null,
  ) {
    const spots = map ? readInteriorSpots(map) : null;
    if (!spots) console.warn('tienda.tmj no disponible o incompleto: tienda con peanas en fila');
    this.spots = spots ?? FALLBACK_SPOTS;
    this.layout = interiorLayout(scene.scale.width, scene.scale.height, MAP_W, MAP_H);
    this.withArt = Boolean(getArt() && Object.keys(getArt()!.interior).length > 0);
    const shelf = this.spots.decos.find((d) => d.piece === 'shelf-b');
    this.bookShelf = shelf ? { x: shelf.x, y: shelf.y - shelf.z } : null;
    this.drawRoom(map ? wallRows(map) : 4);
    for (const deco of this.spots.decos) this.addDeco(deco);
    this.addAmbience();
  }

  screen(p: Point): Point {
    return toScreen(this.layout, p);
  }

  private get s(): number {
    return this.layout.scale;
  }

  private drawRoom(rows: number): void {
    const { offsetX: x, offsetY: y } = this.layout;
    const wallH = rows * 16;
    if (this.withArt) {
      this.scene.add.tileSprite(x, y, MAP_W, MAP_H, interiorKey('floor')).setOrigin(0).setScale(this.s).setDepth(-1000);
      this.scene.add.tileSprite(x, y, MAP_W, wallH, interiorKey('wall')).setOrigin(0).setScale(this.s).setDepth(-999);
    } else {
      const g = this.scene.add.graphics().setDepth(-1000);
      g.fillStyle(0xd7a86e).fillRect(x, y, MAP_W * this.s, MAP_H * this.s);
      g.lineStyle(Math.max(1, this.s / 2), 0xb07f4a, 0.6);
      for (let px = 16; px < MAP_W; px += 16) g.lineBetween(x + px * this.s, y + wallH * this.s, x + px * this.s, y + MAP_H * this.s);
      g.fillStyle(0x7da35a).fillRect(x, y, MAP_W * this.s, wallH * this.s);
      g.fillStyle(0x8d6e63).fillRect(x, y + (wallH - 16) * this.s, MAP_W * this.s, 16 * this.s);
    }
    // Sombra suave donde la pared toca el suelo: da profundidad.
    this.scene.add.rectangle(x, y + wallH * this.s, MAP_W * this.s, 4 * this.s, 0x000000, 0.18).setOrigin(0).setDepth(-998);
  }

  private addDeco(deco: InteriorDeco): void {
    if (deco.piece === 'rug') {
      this.drawRug(deco);
      return;
    }
    const info = PIECES[deco.piece];
    const pos = this.screen({ x: deco.x, y: deco.y - deco.z });
    const originY = deco.flat ? 0.5 : 1;
    const depth = deco.flat ? -500 : deco.y;
    let obj: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
    const texture = this.withArt ? textureFor(deco.piece) : null;
    if (texture) {
      obj = this.scene.add.image(pos.x, pos.y, texture).setOrigin(0.5, originY).setScale(this.s);
    } else if (info) {
      obj = this.scene.add
        .rectangle(pos.x, pos.y, info.w * this.s, info.h * this.s, info.color)
        .setOrigin(0.5, originY)
        .setStrokeStyle(Math.max(1, this.s / 2), 0x3e2723);
      if (info.emoji) {
        this.scene.add
          .text(pos.x, deco.flat ? pos.y : pos.y - (info.h * this.s) / 2, info.emoji, { fontSize: `${Math.round(Math.min(info.w, info.h) * this.s * 0.8)}px` })
          .setOrigin(0.5)
          .setDepth(depth + 0.5);
      }
    } else {
      console.warn(`Pieza de interior desconocida: ${deco.piece}`);
      return;
    }
    obj.setDepth(depth);
    if (deco.piece === 'candles') this.flicker(pos, obj);
    if (deco.piece === 'window') this.lightBeam(pos);
  }

  /** Alfombra ovalada cálida (coral y melocotón) con borde dorado y huellas alrededor. */
  private drawRug(deco: InteriorDeco): void {
    const s = this.s;
    const c = this.screen(deco);
    const g = this.scene.add.graphics().setDepth(-500);
    g.fillStyle(0x000000, 0.15).fillEllipse(c.x, c.y + 2 * s, 196 * s, 64 * s);
    g.fillStyle(0xe2674f).fillEllipse(c.x, c.y, 192 * s, 60 * s);
    g.lineStyle(Math.max(2, s), 0xffd54f).strokeEllipse(c.x, c.y, 184 * s, 54 * s);
    g.fillStyle(0xf6a47e).fillEllipse(c.x, c.y, 150 * s, 38 * s);
    g.lineStyle(Math.max(1, s / 2), 0xfff3e0, 0.9).strokeEllipse(c.x, c.y, 150 * s, 38 * s);
    // Huellas color crema en el anillo exterior, dando la vuelta.
    g.fillStyle(0xfff3e0, 0.85);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const px = c.x + Math.cos(a) * 84 * s;
      const py = c.y + Math.sin(a) * 24.5 * s;
      g.fillEllipse(px, py + 0.6 * s, 3.2 * s, 2.4 * s);
      for (const dx of [-1.6, 0, 1.6]) g.fillCircle(px + dx * s, py - 1.4 * s - (dx === 0 ? 0.4 * s : 0), 0.75 * s);
    }
  }

  /** Banderines de colores colgando de la pared, a ambos lados del cartel. */
  private drawBunting(): void {
    const s = this.s;
    for (const [x0, x1] of [[2, 118], [202, 318]] as const) {
      const flags = 9;
      const g = this.scene.add.graphics().setDepth(-900);
      const sag = (t: number) => 3 + Math.sin(t * Math.PI) * 7;
      const p = (t: number) => this.screen({ x: x0 + (x1 - x0) * t, y: sag(t) });
      g.lineStyle(Math.max(1, s / 2), 0x6d4c41);
      g.strokePoints(Array.from({ length: 21 }, (_v, i) => new Phaser.Math.Vector2(p(i / 20).x, p(i / 20).y)));
      for (let i = 0; i < flags; i++) {
        const top = p((i + 0.5) / flags);
        const flag = this.scene.add
          .triangle(top.x, top.y, -3.5 * s, 0, 3.5 * s, 0, 0, 7 * s, BUNTING[i % BUNTING.length]!)
          .setOrigin(0.5, 0)
          .setDepth(-899);
        this.scene.tweens.add({
          targets: flag,
          angle: { from: -6, to: 6 },
          duration: 1400 + (i % 3) * 200,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.InOut',
          delay: i * 90,
        });
      }
    }
  }

  /** Velas: parpadeo y un halo cálido. */
  private flicker(pos: Point, obj: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle): void {
    const glow = this.scene.add
      .circle(pos.x, pos.y - 10 * this.s, 14 * this.s, 0xffcc80, 0.22)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(obj.depth + 1);
    this.scene.tweens.add({ targets: glow, alpha: 0.1, scale: 0.85, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.scene.tweens.add({ targets: obj, alpha: 0.85, duration: 260, yoyo: true, repeat: -1, delay: 130 });
  }

  /** Haz de luz desde la ventana hasta el suelo, con motas de polvo flotando. */
  private lightBeam(win: Point): void {
    const s = this.s;
    const top = win.y - 2 * s;
    const bottom = win.y + 96 * s;
    const g = this.scene.add.graphics().setDepth(-400).setBlendMode(Phaser.BlendModes.ADD);
    g.fillStyle(0xfff3c4, 0.14);
    g.fillPoints(
      [
        new Phaser.Math.Vector2(win.x - 7 * s, top),
        new Phaser.Math.Vector2(win.x + 7 * s, top),
        new Phaser.Math.Vector2(win.x + 26 * s, bottom),
        new Phaser.Math.Vector2(win.x - 2 * s, bottom),
      ],
      true,
    );
    this.scene.tweens.add({ targets: g, alpha: 0.6, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    for (let i = 0; i < 5; i++) {
      const mote = this.scene.add
        .rectangle(win.x + Phaser.Math.Between(-4, 18) * s, top + Phaser.Math.Between(10, 80) * s, s, s, 0xffffff, 0.7)
        .setDepth(-399);
      this.scene.tweens.add({
        targets: mote,
        y: mote.y + 14 * s,
        x: mote.x + 6 * s,
        alpha: 0,
        duration: Phaser.Math.Between(2500, 4500),
        delay: Phaser.Math.Between(0, 2000),
        repeat: -1,
      });
    }
  }

  private addAmbience(): void {
    this.drawBunting();
    this.drawSign();
    const { offsetX: x, offsetY: y } = this.layout;
    // Luz cálida de tarde sobre toda la tienda: que se sienta acogedora.
    this.scene.add
      .rectangle(x, y, MAP_W * this.s, MAP_H * this.s, 0xffa94d, 0.08)
      .setOrigin(0)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(950);
    // Viñeta suave para centrar la mirada en las peanas.
    const g = this.scene.add.graphics().setDepth(900);
    g.fillStyle(0x3e1f10, 0.12);
    g.fillRect(x, y, 10 * this.s, MAP_H * this.s);
    g.fillRect(x + (MAP_W - 10) * this.s, y, 10 * this.s, MAP_H * this.s);
  }

  /** Cartel de madera colgado con el nombre de la tienda (con cuerdas y un leve balanceo). */
  private drawSign(): void {
    const s = this.s;
    const c = this.screen({ x: 160, y: 11 });
    const text = this.scene.add
      .text(0, 0, `🏪 ${t('shop.title')}`, textStyle(Math.round(Math.max(18, 8.5 * s)), '#fff8e1', '#4e342e'))
      .setOrigin(0.5);
    const w = text.width + 12 * s;
    const h = text.height + 4 * s;
    const g = this.scene.add.graphics();
    g.lineStyle(Math.max(1, s / 2), 0x4e342e);
    g.lineBetween(-w / 3, -h / 2, -w / 4, -h / 2 - 8 * s);
    g.lineBetween(w / 3, -h / 2, w / 4, -h / 2 - 8 * s);
    g.fillStyle(0x3e2723, 0.35).fillRoundedRect(-w / 2 + s, -h / 2 + 1.5 * s, w, h, 3 * s);
    g.fillStyle(0xa0673f).fillRoundedRect(-w / 2, -h / 2, w, h, 3 * s);
    g.lineStyle(Math.max(2, s * 0.75), 0xffd54f).strokeRoundedRect(-w / 2 + s, -h / 2 + s, w - 2 * s, h - 2 * s, 2.5 * s);
    const sign = this.scene.add.container(c.x, Math.max(h / 2 + 4, c.y), [g, text]).setDepth(1000);
    this.scene.tweens.add({ targets: sign, angle: { from: -1.2, to: 1.2 }, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }

  /** Peana redonda de madera con borde dorado; `p` = base donde se apoya el animal. */
  drawPedestal(p: Point): Phaser.GameObjects.GameObject[] {
    const s = this.s;
    const c = this.screen(p);
    const depth = p.y - 1;
    const shadow = this.scene.add.ellipse(c.x, c.y + 6 * s, 30 * s, 8 * s, 0x000000, 0.25).setDepth(depth - 0.2);
    const body = this.scene.add.rectangle(c.x, c.y + 3 * s, 26 * s, 7 * s, 0x8d6e63).setDepth(depth - 0.1);
    const top = this.scene.add
      .ellipse(c.x, c.y, 26 * s, 9 * s, 0xd7a86e)
      .setStrokeStyle(Math.max(1, s * 0.75), 0xffca28)
      .setDepth(depth);
    return [shadow, body, top];
  }

  /** Felpudo de salida con flecha que bota; tocarlo sale de la tienda. */
  doorMat(onTap: () => void): void {
    const s = this.s;
    const c = this.screen(this.spots.door);
    this.scene.add.rectangle(c.x, c.y + 4 * s, 34 * s, 4 * s, 0x3e2723).setDepth(-450);
    const mat = this.scene.add
      .rectangle(c.x, c.y - 2 * s, 30 * s, 10 * s, 0x558b2f)
      .setStrokeStyle(Math.max(1, s / 2), 0x33691e)
      .setDepth(-450)
      .setInteractive({ useHandCursor: true });
    mat.on('pointerup', onTap);
    this.scene.add.text(c.x, c.y - 2 * s, '🐾', { fontSize: `${Math.round(7 * s)}px` }).setOrigin(0.5).setDepth(-449);
    const arrow = this.scene.add
      .text(c.x, c.y - 12 * s, '⬇', { fontFamily: 'sans-serif', fontSize: `${Math.round(8 * s)}px`, color: '#ffffff', stroke: '#33691e', strokeThickness: 3 })
      .setOrigin(0.5)
      .setDepth(1000);
    this.scene.tweens.add({ targets: arrow, y: arrow.y + 3 * s, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }
}
