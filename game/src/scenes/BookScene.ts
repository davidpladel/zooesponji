import * as Phaser from 'phaser';
import { ART_KEYS, animalKey, companionKey, getArt, idleFrame, lookOr, propKey } from '../art/art';
import { isBookComplete, isPageUnlocked } from '../core/book';
import { ANIMALS } from '../data/animals';
import { BOOK_BACK_ID, BOOK_PAGES, type BookPage } from '../data/book';
import { findResident } from '../data/pens';
import { t, type StringKey } from '../data/strings';
import { sfx } from '../systems/audio';
import { getSession } from '../systems/session';
import { addCloseButton, restartOnResize, textStyle } from './ui';

export interface BookSceneData {
  /** Página por la que se abre (id). Sin ella: donde se quedó, o la portada. */
  page?: string;
}

/** Un deslizamiento de más de esto (px) pasa página. */
const SWIPE_PX = 50;
/** El texto se encoge hasta este tamaño mínimo si no cabe (idiomas que alargan). */
const MIN_TEXT_PX = 14;

export const pageTitleKey = (id: string): StringKey => `book.page.${id}.title` as StringKey;
export const pageTextKey = (id: string): StringKey => `book.page.${id}.text` as StringKey;

/** Páginas que se pueden hojear: las del libro y, con todo conseguido, la contraportada. */
function bookPages(): BookPage[] {
  const pages = [...BOOK_PAGES];
  if (isBookComplete(getSession().state)) pages.push({ id: BOOK_BACK_ID, picture: { kind: 'gate' } });
  return pages;
}

/** El libro del zoo: una página por pantalla, dibujo grande, poco texto y flechas grandes. */
export class BookScene extends Phaser.Scene {
  private pages: BookPage[] = [];
  private index = 0;
  private content: Phaser.GameObjects.GameObject[] = [];
  private panel!: Phaser.Geom.Rectangle;
  private swipeStart: { x: number; y: number } | null = null;
  private arrows: Phaser.GameObjects.Text[] = [];

  constructor() {
    super('Book');
  }

  init(data: BookSceneData = {}): void {
    this.pages = bookPages();
    this.content = [];
    const session = getSession();
    const target = data.page ?? session.book.page;
    this.index = Math.max(0, this.pages.findIndex((p) => p.id === target));
  }

  create(): void {
    sfx.setPaused('menu', true);
    if (this.scene.isActive('Shop')) this.scene.pause('Shop');
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x000000, 0.65).setOrigin(0).setInteractive();

    const panelH = height * 0.9;
    const panelW = Math.min(width * 0.8, panelH * 1.25);
    this.panel = new Phaser.Geom.Rectangle(width / 2 - panelW / 2, height / 2 - panelH / 2, panelW, panelH);
    const g = this.add.graphics();
    // Tapas de cuero y hoja de papel.
    g.fillStyle(0x6d3b1f).fillRoundedRect(this.panel.x - 10, this.panel.y - 10, panelW + 20, panelH + 20, 18);
    g.fillStyle(0xfff3d6).fillRoundedRect(this.panel.x, this.panel.y, panelW, panelH, 12);
    g.lineStyle(3, 0xd7b98e).strokeRoundedRect(this.panel.x + 10, this.panel.y + 10, panelW - 20, panelH - 20, 8);

    const arrowSize = Math.round(Phaser.Math.Clamp(height * 0.12, 44, 90));
    this.arrows = [
      this.arrow(this.panel.x - arrowSize * 0.2, '◀', arrowSize, -1).setOrigin(1, 0.5),
      this.arrow(this.panel.right + arrowSize * 0.2, '▶', arrowSize, 1).setOrigin(0, 0.5),
    ];

    addCloseButton(this, () => this.close());
    const keyboard = this.input.keyboard;
    keyboard?.on('keydown-ESC', this.close, this);
    keyboard?.on('keydown-LEFT', this.prev, this);
    keyboard?.on('keydown-RIGHT', this.next, this);
    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    this.input.on(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    restartOnResize(this, () => ({ page: this.pages[this.index]?.id }) satisfies BookSceneData);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      keyboard?.off('keydown-ESC', this.close, this);
      keyboard?.off('keydown-LEFT', this.prev, this);
      keyboard?.off('keydown-RIGHT', this.next, this);
      this.input.off(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
      this.input.off(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    });
    this.showPage();
  }

  close(): void {
    if (!this.scene.isActive()) return;
    sfx.play('tap');
    this.scene.stop();
    sfx.setPaused('menu', false);
    if (this.scene.isPaused('Shop')) this.scene.resume('Shop');
  }

  next(): void {
    this.turn(1);
  }

  prev(): void {
    this.turn(-1);
  }

  // --- API para pruebas ---

  pageId(): string | null {
    return this.pages[this.index]?.id ?? null;
  }

  pageText(): string {
    const page = this.pages[this.index];
    if (!page) return '';
    return isPageUnlocked(getSession().state, page) ? `${t(pageTitleKey(page.id))} ${t(pageTextKey(page.id))}` : t('book.locked');
  }

  // --- Páginas ---

  private turn(step: number): void {
    const to = this.index + step;
    if (to < 0 || to >= this.pages.length) return;
    this.index = to;
    sfx.play('tap');
    this.showPage();
  }

  private arrow(x: number, label: string, size: number, step: number): Phaser.GameObjects.Text {
    const arrow = this.add
      .text(x, this.scale.height / 2, label, textStyle(size, '#fff8e1', '#4e342e'))
      .setInteractive({ useHandCursor: true })
      .setDepth(20);
    arrow.on('pointerup', () => this.turn(step));
    arrow.setData('step', step);
    return arrow;
  }

  private showPage(): void {
    for (const obj of this.content) obj.destroy();
    this.content = [];
    const page = this.pages[this.index]!;
    const session = getSession();
    const unlocked = isPageUnlocked(session.state, page);
    const isNew = unlocked && !session.book.seen.includes(page.id);
    const p = this.panel;
    const pad = p.width * 0.07;
    // Sin flecha hacia donde no hay más páginas.
    this.arrows[0]?.setVisible(this.index > 0);
    this.arrows[1]?.setVisible(this.index < this.pages.length - 1);
    void session.setBookPage(page.id);

    const titleSize = Math.round(Phaser.Math.Clamp(p.height * 0.075, 20, 44));
    const title = unlocked ? t(pageTitleKey(page.id)) : t('book.locked');
    this.content.push(
      this.add
        .text(p.centerX, p.y + p.height * 0.1, title, { ...textStyle(titleSize, '#5d4037', '#fff3d6'), align: 'center', wordWrap: { width: p.width - 2 * pad } })
        .setOrigin(0.5),
    );

    this.content.push(...this.picture(page, p.centerX, p.y + p.height * 0.47, p.height * 0.36, unlocked));

    const text = unlocked ? t(pageTextKey(page.id)) : t('book.lockedHint');
    this.content.push(this.fitText(text, p.centerX, p.y + p.height * 0.66, p.width - 2 * pad, p.height * 0.2, Math.round(titleSize * 0.8)));

    // Número de página ("3 de 14").
    this.content.push(
      this.add
        .text(p.centerX, p.bottom - p.height * 0.06, t('book.count', { n: this.index + 1, total: this.pages.length }), textStyle(Math.round(titleSize * 0.55), '#8d6e63', '#fff3d6'))
        .setOrigin(0.5),
    );

    if (isNew) {
      const badge = this.add
        .text(p.right - pad * 0.5, p.y + pad * 0.5, '✨', { fontSize: `${titleSize}px` })
        .setOrigin(0.5);
      this.tweens.add({ targets: badge, scale: 1.3, duration: 500, yoyo: true, repeat: -1 });
      this.content.push(badge);
      void session.readPages([page.id]);
    }
    if (page.id === BOOK_BACK_ID) this.confetti();
  }

  /** Texto de la página: si no cabe (p. ej. en otro idioma), encoge la letra hasta un mínimo. */
  private fitText(text: string, x: number, y: number, width: number, maxHeight: number, size: number): Phaser.GameObjects.Text {
    const label = this.add
      .text(x, y, text, { ...textStyle(size, '#3e2723', '#fff3d6'), align: 'center', wordWrap: { width }, lineSpacing: 4 })
      .setOrigin(0.5, 0);
    for (let s = size; label.height > maxHeight && s > MIN_TEXT_PX; s -= 2) label.setFontSize(s - 2);
    return label;
  }

  /** Dibujo grande de la página. Bloqueada: silueta oscura, como en las colecciones de otros juegos. */
  private picture(page: BookPage, x: number, y: number, maxH: number, unlocked: boolean): Phaser.GameObjects.GameObject[] {
    const art = getArt();
    const pic = page.picture;
    let obj: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image | Phaser.GameObjects.Text;
    if (art && pic.kind === 'animal') {
      // Cada página enseña a su animal, no a uno cualquiera de la especie.
      const look = lookOr(findResident(page.id)?.resident.look ?? pic.animalId, pic.animalId);
      obj = this.add.sprite(x, y, animalKey(look), idleFrame('right'));
    } else if (art && pic.kind === 'companion' && art.companions[pic.animalId]) {
      obj = this.add.sprite(x, y, companionKey(pic.animalId), idleFrame('left'));
    } else if (art && pic.kind === 'keeper') {
      obj = this.add.sprite(x, y, ART_KEYS.keeper, idleFrame('down'));
    } else if (pic.kind === 'logo' && this.textures.exists('logo')) {
      obj = this.add.image(x, y, 'logo');
    } else if (art && pic.kind === 'gate' && art.props['park-gate']) {
      obj = this.add.image(x, y, propKey('park-gate'));
    } else {
      const emoji = pic.kind === 'animal' || pic.kind === 'companion' ? ANIMALS[pic.animalId].emoji : pic.kind === 'keeper' ? '👩‍🌾' : pic.kind === 'logo' ? '🦁' : '🏞️';
      obj = this.add.text(x, y, emoji, { fontSize: `${Math.round(maxH * 0.8)}px` }).setOrigin(0.5);
    }
    if (!(obj instanceof Phaser.GameObjects.Text)) {
      // Escala entera: el pixel art se ve nítido.
      // El logo es un dibujo liso: se ajusta al hueco. El pixel art, a escala entera para verse nítido.
      if (pic.kind === 'logo') obj.setScale(maxH / obj.height);
      else obj.setScale(Math.max(1, Math.floor(maxH / obj.height)));
      if (!unlocked) obj.setTint(0x4e342e).setTintMode(Phaser.TintModes.FILL);
    } else if (!unlocked) {
      obj.setText('❔');
    }
    // Marco tipo cromo detrás del dibujo.
    const frame = this.add
      .rectangle(x, y, obj.displayWidth + 24, obj.displayHeight + 24, 0xffffff)
      .setStrokeStyle(4, 0xd7b98e);
    this.children.moveBelow(frame, obj);
    if (unlocked) this.tweens.add({ targets: obj, y: y - 4, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    return [frame, obj];
  }

  private confetti(): void {
    const colors = [0xf48fb1, 0xfff176, 0x80cbc4, 0x81d4fa, 0xce93d8, 0xffab91];
    for (let i = 0; i < 40; i++) {
      const bit = this.add
        .rectangle(Phaser.Math.Between(0, this.scale.width), -10, 8, 12, colors[i % colors.length]!)
        .setAngle(Phaser.Math.Between(0, 360))
        .setDepth(40);
      this.content.push(bit);
      this.tweens.add({
        targets: bit,
        y: this.scale.height + 20,
        angle: bit.angle + 360,
        duration: Phaser.Math.Between(1400, 2600),
        delay: Phaser.Math.Between(0, 600),
        onComplete: () => bit.destroy(),
      });
    }
  }

  private onDown(pointer: Phaser.Input.Pointer): void {
    this.swipeStart = { x: pointer.x, y: pointer.y };
  }

  private onUp(pointer: Phaser.Input.Pointer): void {
    const start = this.swipeStart;
    this.swipeStart = null;
    if (!start) return;
    const dx = pointer.x - start.x;
    if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(pointer.y - start.y)) this.turn(dx < 0 ? 1 : -1);
  }
}
