import * as Phaser from 'phaser';
import { ART_KEYS, animalKey, companionKey, getArt, idleFrame, lookOr, propKey } from '../art/art';
import { chapterProgress, isBookComplete, isContentPage, isPageUnlocked, pagePosition } from '../core/book';
import type { Vec } from '../core/movement';
import { ANIMALS } from '../data/animals';
import { BOOK_BACK_ID, BOOK_CHAPTERS, BOOK_PAGES, CHAPTER_PENS, chapterPageId, chapterTitleKey, type BookPage, type ChapterId } from '../data/book';
import { findResident } from '../data/pens';
import { t, type StringKey } from '../data/strings';
import { sfx } from '../systems/audio';
import { bus, type BookPageKind } from '../systems/events';
import { getSession } from '../systems/session';
import { makePressable } from '../ui/press';
import { textStyle } from '../ui/theme';
import { addUiText } from '../ui/text';
import { addCloseBadge, addPanel, addPillButton, addRibbonTitle, addVeil, pillImage, restartOnResize, setRibbonText, tileImage } from '../ui/widgets';

export interface BookSceneData {
  /** Página por la que se abre (id). Sin ella: donde se quedó, o la portada. */
  page?: string;
}

/** Un deslizamiento de más de esto (px) pasa página. */
const SWIPE_PX = 50;
/** El texto se encoge hasta este tamaño mínimo si no cabe (idiomas que alargan). */
const MIN_TEXT_PX = 16;

export const pageTitleKey = (id: string): StringKey => `book.page.${id}.title` as StringKey;
export const pageTextKey = (id: string): StringKey => `book.page.${id}.text` as StringKey;

/** Páginas que se pueden hojear: las del libro y, con todo conseguido, la contraportada. */
function bookPages(): BookPage[] {
  const pages = [...BOOK_PAGES];
  if (isBookComplete(getSession().state)) pages.push({ id: BOOK_BACK_ID, chapter: 'inicio', picture: { kind: 'gate' } });
  return pages;
}

/** El libro del zoo: una página por pantalla, dibujo grande, poco texto y flechas grandes. */
export class BookScene extends Phaser.Scene {
  private pages: BookPage[] = [];
  private index = 0;
  private content: Phaser.GameObjects.GameObject[] = [];
  private panel!: Phaser.Geom.Rectangle;
  private swipeStart: { x: number; y: number } | null = null;
  private arrows: Phaser.GameObjects.Container[] = [];
  private ribbon!: Phaser.GameObjects.Container;
  /** Con el índice abierto: dónde está en pantalla la fila de cada capítulo. */
  private readonly indexRows = new Map<ChapterId, Vec>();

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
    addVeil(this);

    const panelH = height * 0.84;
    // Libro abierto: dos hojas, dibujo a un lado y texto al otro.
    const panelW = Math.min(width * 0.8, panelH * 2.1);
    const panelY = height * 0.55;
    this.panel = new Phaser.Geom.Rectangle(width / 2 - panelW / 2, panelY - panelH / 2, panelW, panelH);
    addPanel(this, width / 2, panelY, panelW, panelH);
    // El encabezado de cada página va en el cartel.
    this.ribbon = addRibbonTitle(this, width / 2, this.panel.y, panelW * 0.76, Phaser.Math.Clamp(height * 0.14, 40, 80), '');

    const arrowSize = Math.round(Phaser.Math.Clamp(height * 0.14, 48, 88));
    this.arrows = [
      addPillButton(this, this.panel.x - arrowSize * 0.7, height / 2, arrowSize, arrowSize, { color: 'blue', icon: 'left', onTap: () => this.turn(-1) }).setDepth(20),
      addPillButton(this, this.panel.right + arrowSize * 0.7, height / 2, arrowSize, arrowSize, { color: 'blue', icon: 'right', onTap: () => this.turn(1) }).setDepth(20),
    ];

    const badge = Phaser.Math.Clamp(height * 0.13, 44, 64);
    addCloseBadge(this, this.panel.right - badge * 0.35, this.panel.y + badge * 0.35, () => this.close(), badge);
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
    bus.emit('book-closed', {});
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
    if (page.role === 'index') return t('book.index.title');
    if (page.role === 'divider') return t(chapterTitleKey(page.chapter));
    return isPageUnlocked(getSession().state, page) ? `${t(pageTitleKey(page.id))} ${t(pageTextKey(page.id))}` : t('book.locked');
  }

  /** Centro en pantalla de la fila de un capítulo en el índice (null si el índice no está abierto). */
  indexPos(chapter: ChapterId): Vec | null {
    return this.indexRows.get(chapter) ?? null;
  }

  // --- Páginas ---

  private turn(step: number): void {
    const to = this.index + step;
    if (to < 0 || to >= this.pages.length) return;
    this.index = to;
    sfx.play('tap');
    this.showPage();
  }

  /** Va directamente a una página (desde el índice). */
  private goTo(id: string): void {
    const to = this.pages.findIndex((p) => p.id === id);
    if (to < 0 || to === this.index) return;
    this.index = to;
    sfx.play('tap');
    this.showPage();
  }

  private showPage(): void {
    for (const obj of this.content) obj.destroy();
    this.content = [];
    this.indexRows.clear();
    const page = this.pages[this.index]!;
    // Sin flecha hacia donde no hay más páginas.
    this.arrows[0]?.setVisible(this.index > 0);
    this.arrows[1]?.setVisible(this.index < this.pages.length - 1);
    void getSession().setBookPage(page.id);
    // La portada lleva el logo, no un personaje: no cuenta como página leída.
    const passing = !isContentPage(page) || page.picture.kind === 'logo';
    const kind: BookPageKind = passing ? 'paso' : isPageUnlocked(getSession().state, page) ? 'contenido' : 'bloqueada';
    bus.emit('book-page-shown', { pageId: page.id, kind });
    if (page.role === 'index') this.showIndex();
    else if (page.role === 'divider') this.showDivider(page);
    else this.showContent(page);
  }

  private titleSize(): number {
    return Math.round(Phaser.Math.Clamp(this.panel.height * 0.075, 20, 44));
  }

  private heading(text: string): void {
    setRibbonText(this.ribbon, text);
  }

  /** Índice: una fila grande por capítulo, con lo que llevas conseguido. Tocarla abre ese capítulo. */
  private showIndex(): void {
    const p = this.panel;
    const size = this.titleSize();
    const state = getSession().state;
    this.heading(t('book.index.title'));
    const chapters = BOOK_CHAPTERS.filter((chapter) => CHAPTER_PENS[chapter].length > 0);
    const rowH = (p.height * 0.78) / chapters.length;
    const rowW = p.width * 0.82;
    const top = p.y + p.height * 0.14;
    chapters.forEach((chapter, i) => {
      const y = top + i * rowH + rowH / 2;
      const { n, total } = chapterProgress(state, chapter);
      const row = this.add.container(p.centerX, y).setSize(rowW, rowH * 0.82);
      row.add(pillImage(this, rowW, rowH * 0.82, 'sand'));
      const edge = rowW / 2 - rowW * 0.07;
      const rowSize = Math.round(Math.min(size * 0.85, rowH * 0.4));
      row.add(addUiText(this, -edge, 0, t(chapterTitleKey(chapter)), textStyle(rowSize, '#5d4037', '#ffe9b8')).setOrigin(0, 0.5));
      row.add(addUiText(this, edge, 0, t('book.count', { n, total }), textStyle(Math.round(rowSize * 0.75), '#8d6e63', '#ffe9b8')).setOrigin(1, 0.5));
      // Un deslizamiento pasa página; solo un toque abre el capítulo.
      makePressable(row, (pointer) => {
        if (pointer.getDistance() > SWIPE_PX) return;
        bus.emit('book-index', { chapter });
        this.goTo(chapterPageId(chapter));
      });
      this.content.push(row);
      this.indexRows.set(chapter, { x: p.centerX, y });
    });
  }

  /** Portadilla de un capítulo: su nombre, su primer animal y cuántos amigos tienes ya en él. */
  private showDivider(page: BookPage): void {
    const chapter = t(chapterTitleKey(page.chapter));
    this.heading(chapter);
    this.spread(page, true, chapter, t('book.chapter.count', chapterProgress(getSession().state, page.chapter)), null);
  }

  private showContent(page: BookPage): void {
    const session = getSession();
    const unlocked = isPageUnlocked(session.state, page);
    const isNew = unlocked && isContentPage(page) && !session.book.seen.includes(page.id);
    // El cartel dice en qué capítulo estás; el nombre del animal va en la hoja del texto.
    this.heading(t(chapterTitleKey(page.chapter)));
    // Número de página dentro del capítulo ("3 de 18"). La contraportada no lleva.
    const position = page.id === BOOK_BACK_ID ? null : pagePosition(page);
    const tile = this.spread(
      page,
      unlocked,
      unlocked ? t(pageTitleKey(page.id)) : t('book.locked'),
      unlocked ? t(pageTextKey(page.id)) : t('book.lockedHint'),
      position ? t('book.count', position) : null,
    );

    if (isNew) {
      // En la esquina de la ficha del dibujo, por encima de ella.
      const corner = tile.getTopRight();
      const badge = this.add
        .text(corner.x - 6, corner.y + 6, '✨', { fontSize: `${this.titleSize()}px` })
        .setOrigin(0.5)
        .setDepth(tile.depth + 2);
      this.tweens.add({ targets: badge, scale: 1.3, duration: 500, yoyo: true, repeat: -1 });
      this.content.push(badge);
      void session.readPages([page.id]);
    }
    if (page.id === BOOK_BACK_ID) this.confetti();
  }

  /**
   * Doble página: el dibujo en la hoja izquierda y, en la derecha, el título, el texto y el pie.
   * Devuelve la ficha del dibujo.
   */
  private spread(page: BookPage, unlocked: boolean, title: string, text: string, footer: string | null): Phaser.GameObjects.Image {
    const p = this.panel;
    const size = this.titleSize();
    const leftX = p.x + p.width * 0.27;
    const rightX = p.x + p.width * 0.72;
    const columnW = p.width * 0.42;
    // Lomo del libro.
    this.content.push(this.add.rectangle(p.centerX, p.y + p.height * 0.54, Math.max(2, p.width * 0.005), p.height * 0.74, 0xf0d9a8));

    const pictureObjects = this.picture(page, leftX, p.y + p.height * 0.54, p.height * 0.5, unlocked, p.width * 0.36);
    this.content.push(...pictureObjects);

    const heading = addUiText(this, rightX, p.y + p.height * 0.17, title, {
      ...textStyle(Math.round(size * 1.15), '#5d4037'),
      strokeThickness: 0,
      align: 'center',
      wordWrap: { width: columnW },
    }).setOrigin(0.5, 0);
    const textTop = heading.y + heading.height + p.height * 0.03;
    const textBottom = p.bottom - p.height * (footer ? 0.14 : 0.07);
    this.content.push(heading, this.fitText(text, rightX, textTop, columnW, textBottom - textTop, size));
    if (footer) {
      this.content.push(
        addUiText(this, rightX, p.bottom - p.height * 0.07, footer, { ...textStyle(Math.round(size * 0.62), '#8d6e63'), strokeThickness: 0 }).setOrigin(0.5),
      );
    }
    return pictureObjects[0] as Phaser.GameObjects.Image;
  }

  /** Texto de la página, sin contorno (marrón sobre crema se lee mejor limpio): si no cabe (p. ej. en otro idioma), encoge la letra hasta un mínimo. */
  private fitText(text: string, x: number, y: number, width: number, maxHeight: number, size: number): Phaser.GameObjects.Text {
    const label = addUiText(this, x, y, text, { ...textStyle(size, '#3e2723'), strokeThickness: 0, align: 'center', wordWrap: { width }, lineSpacing: 4 }).setOrigin(0.5, 0);
    for (let s = size; label.height > maxHeight && s > MIN_TEXT_PX; s -= 2) label.setFontSize(s - 2);
    return label;
  }

  /** Dibujo grande de la página. Bloqueada: silueta oscura, como en las colecciones de otros juegos. */
  private picture(page: BookPage, x: number, y: number, maxH: number, unlocked: boolean, maxW: number): Phaser.GameObjects.GameObject[] {
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
      obj = this.add.text(x, y, emoji, { fontSize: `${Math.round(Math.min(maxH, maxW) * 0.8)}px` }).setOrigin(0.5);
    }
    if (!(obj instanceof Phaser.GameObjects.Text)) {
      // Escala entera: el pixel art se ve nítido.
      // El logo es un dibujo liso: se ajusta al hueco. El pixel art, a escala entera para verse nítido.
      const fit = Math.min(maxH / obj.height, maxW / obj.width);
      if (pic.kind === 'logo') obj.setScale(fit);
      else obj.setScale(Math.max(1, Math.floor(fit)));
      if (!unlocked) obj.setTint(0x4e342e).setTintMode(Phaser.TintModes.FILL);
    } else if (!unlocked) {
      obj.setText('❔');
    }
    // Cromo: ficha blanca un poco girada detrás del dibujo.
    const frame = tileImage(this, obj.displayWidth + 30, obj.displayHeight + 30).setPosition(x, y).setAngle(-3);
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
