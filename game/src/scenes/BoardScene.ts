import * as Phaser from 'phaser';
import { daysLeft, jarTier, localized, type PollOption } from '../core/community';
import type { Vec } from '../core/movement';
import { APP_VERSION } from '../core/version';
import { t } from '../data/strings';
import { sfx } from '../systems/audio';
import { getCommunity } from '../systems/community';
import { bus } from '../systems/events';
import { getLanguage } from '../systems/language';
import { addEmoji, addUiText, fitText } from '../ui/text';
import { UI, textStyle } from '../ui/theme';
import { addCloseBadge, addPanel, addPillButton, addRibbonTitle, addTile, addVeil, restartOnResize } from '../ui/widgets';

export type BoardZone = 'poll' | 'wall' | 'idea';
export type PollView = 'cards' | 'bars' | 'winner' | 'closed' | 'none' | 'offline';

export interface BoardSceneData {
  /** Opción marcada sin confirmar (se conserva al girar el móvil o cambiar de idioma). */
  picked?: string | null;
  zone?: BoardZone;
  /** Se tocó «Cambiar»: se vuelven a ver las tarjetas. */
  changing?: boolean;
  /** Mensaje que se enseña dentro del tablón al volver a montarse (gracias, o no se pudo votar). */
  note?: string | null;
  /** Página del muro que se está viendo (empieza en 0). */
  wallPage?: number;
}

const JAR_BULBS = [0, 1, 3, 6, 10] as const;
const MAX_WALL_SHOWN = 4;

/** El tablón: votación con dibujos, tarro de ideas, muro y tarjeta del QR. No depende de leer. */
export class BoardScene extends Phaser.Scene {
  private zoneKey: BoardZone = 'poll';
  private pickedId: string | null = null;
  private changing = false;
  private note: string | null = null;
  private wallPage = 0;
  private busy = false;
  private view: PollView = 'none';
  private tabs = new Map<BoardZone, Phaser.GameObjects.Container>();
  private cards = new Map<string, Phaser.GameObjects.Container>();
  private confirm: Phaser.GameObjects.Container | null = null;
  private change: Phaser.GameObjects.Container | null = null;
  private jar: Phaser.GameObjects.Text | null = null;
  private wallArrows: Phaser.GameObjects.Container[] = [];
  private body!: Phaser.Geom.Rectangle;
  private opened = false;

  constructor() {
    super('Board');
  }

  init(data: BoardSceneData = {}): void {
    this.opened = data.zone === undefined && data.picked === undefined && data.changing === undefined;
    this.zoneKey = data.zone ?? 'poll';
    this.pickedId = data.picked ?? null;
    this.changing = data.changing ?? false;
    this.note = data.note ?? null;
    this.wallPage = data.wallPage ?? 0;
    this.busy = false;
    this.tabs = new Map();
    this.cards = new Map();
    this.confirm = null;
    this.change = null;
    this.jar = null;
    this.wallArrows = [];
  }

  create(): void {
    const community = getCommunity();
    if (!community) {
      this.finish();
      return;
    }
    sfx.setPaused('menu', true);
    const { width, height } = this.scale;
    addVeil(this);
    const panelW = Math.min(width * 0.9, 980);
    const panelH = height * 0.86;
    const panelY = height * 0.54;
    addPanel(this, width / 2, panelY, panelW, panelH);
    const panel = new Phaser.Geom.Rectangle(width / 2 - panelW / 2, panelY - panelH / 2, panelW, panelH);
    addRibbonTitle(this, width / 2, panel.y, panelW * 0.6, Phaser.Math.Clamp(height * 0.13, 40, 76), t('board.title'));
    const badge = Phaser.Math.Clamp(height * 0.13, 44, 64);
    addCloseBadge(this, panel.right - badge * 0.35, panel.y + badge * 0.35, () => this.close(), badge);

    // Pestañas con dibujo, sin texto.
    const tabH = Phaser.Math.Clamp(height * 0.12, 44, 72);
    const tabY = panel.y + tabH * 1.05;
    const zones: [BoardZone, string][] = [['poll', '🗳️'], ['wall', '🫙'], ['idea', '💡']];
    zones.forEach(([zone, emoji], i) => {
      const x = width / 2 + (i - 1) * tabH * 1.6;
      const tab = addPillButton(this, x, tabY, tabH * 1.4, tabH, { color: zone === this.zoneKey ? 'yellow' : 'sand', onTap: () => this.goZone(zone) });
      tab.add(addEmoji(this, 0, -tabH * 0.05, emoji, tabH * 0.5));
      this.tabs.set(zone, tab);
    });
    this.body = new Phaser.Geom.Rectangle(panel.x + panelW * 0.05, tabY + tabH * 0.75, panelW * 0.9, panel.bottom - (tabY + tabH * 0.75) - panelH * 0.05);

    if (this.zoneKey === 'poll') this.drawPoll();
    else if (this.zoneKey === 'wall') this.drawWall();
    else this.drawIdea();
    this.showNote();

    if (this.opened) {
      bus.emit('board-opened', { phase: community.phase() });
      if (!community.online) bus.emit('board-offline', {});
      // Al abrir se pide lo último; si cambia algo, se vuelve a montar.
      const wasOnline = community.online;
      void community.refresh().then((ok) => {
        // Se rehace si llegó algo nuevo o si cambió la conexión (franja 📡 y botón ✓).
        if ((ok || community.online !== wasOnline) && this.scene.isActive() && !this.busy) this.restart();
      });
      this.opened = false;
    }
    const keyboard = this.input.keyboard;
    keyboard?.on('keydown-ESC', this.close, this);
    restartOnResize(this, () => this.sceneData());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => keyboard?.off('keydown-ESC', this.close, this));
  }

  // --- Zonas ---

  private drawPoll(): void {
    const community = getCommunity()!;
    const status = community.status;
    const b = this.body;
    if (!status) {
      this.view = 'offline';
      this.bigMessage('📡', t('board.offline'));
      return;
    }
    if (!community.online) this.strip('📡 ' + t('board.offline'));
    const poll = status.votacion;
    const phase = community.phase();
    if (!poll || phase === 'none') {
      this.view = 'none';
      this.bigMessage('🗳️', t('board.noPoll'));
      return;
    }
    const lang = getLanguage();
    if (phase === 'closed' && poll.ganadora) {
      this.view = 'winner';
      const win = poll.opciones.find((o) => o.id === poll.ganadora)!;
      const size = Math.min(b.width * 0.4, b.height * 0.62);
      this.option(win, b.centerX, b.y + size / 2 + 8, size, false);
      fitText(addUiText(this, b.centerX, b.y + size + 30, t('board.winner'), textStyle(Math.round(size * 0.14), '#ffffff', UI.outline)).setOrigin(0.5), b.width);
      this.confetti();
      community.markBoardSeen();
      return;
    }
    if (phase === 'open' || (phase === 'voted' && this.changing)) {
      this.view = 'cards';
      const n = poll.opciones.length;
      const gap = b.width * 0.03;
      const button = Phaser.Math.Clamp(b.height * 0.18, 52, 84);
      const size = Math.min((b.width - gap * (n - 1)) / n, b.height - button - 16);
      const startX = b.centerX - ((size + gap) * n - gap) / 2 + size / 2;
      poll.opciones.forEach((option, i) => {
        const card = this.option(option, startX + i * (size + gap), b.y + size / 2, size, true);
        this.cards.set(option.id, card);
      });
      this.markPicked();
      if (community.online) {
        // El botón dice lo que hace («✓ Votar»): con el dibujo solo no se entendía.
        this.confirm = addPillButton(this, b.centerX, b.bottom - button / 2, button * 3, button, { color: 'green', label: `✓ ${t('board.vote')}`, onTap: () => void this.confirmVote() });
        this.confirm.setVisible(this.pickedId !== null);
      }
      return;
    }
    // Votada, o cerrada sin ganadora: barras sin números.
    this.view = phase === 'voted' ? 'bars' : 'closed';
    const mine = community.memory.voted[poll.id] ?? null;
    const rowH = Math.min((b.height * 0.7) / poll.opciones.length, 70);
    const barX = b.x + rowH * 1.2 + b.width * 0.22;
    const barW = b.right - barX - b.width * 0.04;
    poll.opciones.forEach((option, i) => {
      const y = b.y + rowH * (i + 0.5);
      this.drawing(option.dibujo, b.x + rowH * 0.6, y, rowH * 0.9);
      fitText(addUiText(this, b.x + rowH * 1.2, y, localized(option.titulo, lang), textStyle(Math.round(rowH * 0.3), UI.brown, UI.cream)).setOrigin(0, 0.5), barX - b.x - rowH * 1.2 - 8);
      const share = poll.reparto[option.id] ?? 0;
      const bar = this.add.graphics();
      bar.fillStyle(0xffffff, 0.35).fillRoundedRect(barX, y - rowH * 0.25, barW, rowH * 0.5, 8);
      bar.fillStyle(option.id === mine ? 0x4caf50 : 0xffb300, 1).fillRoundedRect(barX, y - rowH * 0.25, Math.max(8, (barW * share) / 100), rowH * 0.5, 8);
      if (option.id === mine) addUiText(this, barX + barW + 6, y, '✓', textStyle(Math.round(rowH * 0.4), '#4caf50', '#ffffff')).setOrigin(0, 0.5);
    });
    const footY = b.bottom - Math.min(b.height * 0.12, 40);
    if (phase === 'voted') {
      const left = daysLeft(status);
      fitText(addUiText(this, b.x + b.width * 0.25, footY, `⏳ ${left <= 1 ? t('board.lastDay') : t('board.daysLeft', { n: left })}`, textStyle(22, UI.brown, UI.cream)).setOrigin(0.5), b.width * 0.46);
      if (community.online) {
        this.change = addPillButton(this, b.x + b.width * 0.75, footY, 180, 56, { color: 'blue', label: t('board.change'), onTap: () => this.startChange() });
      }
    } else {
      fitText(addUiText(this, b.centerX, footY, t('board.closed'), textStyle(20, UI.brown, UI.cream)).setOrigin(0.5), b.width);
    }
  }

  private drawWall(): void {
    const community = getCommunity()!;
    const status = community.status;
    const b = this.body;
    if (!status) {
      this.bigMessage('📡', t('board.offline'));
      return;
    }
    community.markBoardSeen();
    // Tarro con bombillas, el número de verdad debajo.
    const jarSize = Math.min(b.width * 0.3, b.height * 0.6);
    const jx = b.x + b.width * 0.18;
    const jy = b.y + jarSize / 2 + 6;
    addEmoji(this, jx, jy, '🫙', jarSize * 0.8);
    const bulbs = JAR_BULBS[jarTier(status.ideas)];
    for (let i = 0; i < bulbs; i++) {
      const bx = jx + ((i % 3) - 1) * jarSize * 0.2;
      const by = jy + jarSize * 0.22 - Math.floor(i / 3) * jarSize * 0.15;
      addEmoji(this, bx, by, '💡', jarSize * 0.13);
    }
    const jarLine = status.ideas === 0 ? t('board.jarEmpty') : status.ideas === 1 ? t('board.jarOne') : t('board.jar', { n: status.ideas });
    this.jar = addUiText(this, jx, jy + jarSize / 2 + 18, jarLine, { ...textStyle(18, UI.brown, UI.cream), wordWrap: { width: b.width * 0.34 }, align: 'center' }).setOrigin(0.5, 0);
    // Muro.
    const wx = b.x + b.width * 0.4;
    fitText(addUiText(this, wx, b.y + 4, t('board.wallTitle'), textStyle(22, UI.brown, UI.cream)).setOrigin(0, 0), b.right - wx);
    const lang = getLanguage();
    // De MAX_WALL_SHOWN en MAX_WALL_SHOWN, con flechas abajo si hay más de una página.
    const pages = Math.max(1, Math.ceil(status.muro.length / MAX_WALL_SHOWN));
    const page = Phaser.Math.Clamp(this.wallPage, 0, pages - 1);
    const arrow = pages > 1 ? Phaser.Math.Clamp(b.height * 0.14, 36, 52) : 0;
    const rowH = Math.min((b.height - 40 - arrow - (arrow ? 8 : 0)) / MAX_WALL_SHOWN, 72);
    if (pages > 1) {
      const ay = b.bottom - arrow / 2;
      const mid = (wx + b.right) / 2;
      const turn = (step: number): void => {
        if (this.busy) return;
        sfx.play('tap');
        this.wallPage = (page + step + pages) % pages;
        this.restart();
      };
      this.wallArrows = [
        addPillButton(this, mid - arrow * 1.8, ay, arrow * 1.3, arrow, { color: 'blue', icon: 'left', onTap: () => turn(-1) }),
        addPillButton(this, mid + arrow * 1.8, ay, arrow * 1.3, arrow, { color: 'blue', icon: 'right', onTap: () => turn(1) }),
      ];
      addUiText(this, mid, ay, `${page + 1} / ${pages}`, textStyle(Math.round(arrow * 0.45), UI.brown, UI.cream)).setOrigin(0.5);
    }
    status.muro.slice(page * MAX_WALL_SHOWN, (page + 1) * MAX_WALL_SHOWN).forEach((entry, i) => {
      const y = b.y + 40 + rowH * (i + 0.5);
      this.drawing(entry.dibujo, wx + rowH * 0.45, y, rowH * 0.85);
      const name = entry.ideaDe ? ` · ${t('board.ideaOf', { name: entry.ideaDe })}` : '';
      const stamp = entry.estado === 'hecha' ? t('board.done') : t('board.chosen');
      const mark = fitText(addUiText(this, b.right - 4, y, stamp, textStyle(Math.round(rowH * 0.24), entry.estado === 'hecha' ? '#2e7d32' : '#1565c0', '#ffffff')).setOrigin(1, 0.5), b.width * 0.18);
      const textX = wx + rowH;
      fitText(addUiText(this, textX, y, `${localized(entry.titulo, lang)}${name}`, textStyle(Math.round(rowH * 0.26), UI.brown, UI.cream)).setOrigin(0, 0.5), b.right - 16 - mark.width - textX);
    });
  }

  private drawIdea(): void {
    const b = this.body;
    bus.emit('board-qr', {});
    const size = Math.max(160, Math.min(b.height * 0.92, b.width * 0.45));
    const qr = this.add.image(b.x + b.width * 0.28, b.centerY, getLanguage() === 'en' ? 'qr-ideas-en' : 'qr-ideas');
    qr.setDisplaySize(size, size);
    const tx = b.x + b.width * 0.56;
    const room = b.right - tx;
    fitText(addUiText(this, tx, b.y + b.height * 0.18, t('board.ideaCard'), textStyle(30, UI.brown, UI.cream)).setOrigin(0, 0.5), room);
    fitText(addUiText(this, tx, b.y + b.height * 0.38, `👉 ${t('board.showAdult')}`, textStyle(24, UI.brown, UI.cream)).setOrigin(0, 0.5), room);
    fitText(addUiText(this, tx, b.y + b.height * 0.7, t('board.version', { v: APP_VERSION || '—' }), textStyle(16, UI.brown, UI.cream)).setOrigin(0, 0.5), room);
    fitText(addUiText(this, tx, b.y + b.height * 0.82, t('board.terms'), textStyle(14, UI.brown, UI.cream)).setOrigin(0, 0.5), room);
  }

  // --- Piezas ---

  private option(option: PollOption, x: number, y: number, size: number, tappable: boolean): Phaser.GameObjects.Container {
    const card = addTile(this, x, y, size, size, tappable ? () => this.pick(option.id) : undefined);
    const lang = getLanguage();
    // Dibujo arriba y los textos por encima del canto de abajo de la tarjeta, sin salirse de ella.
    card.add(this.drawing(option.dibujo, 0, -size * 0.13, size * 0.5));
    card.add(fitText(addUiText(this, 0, size * 0.2, localized(option.titulo, lang), textStyle(Math.round(size * 0.1), UI.brown, UI.cream)).setOrigin(0.5), size * 0.86));
    if (option.ideaDe) card.add(fitText(addUiText(this, 0, size * 0.31, t('board.ideaOf', { name: option.ideaDe }), textStyle(Math.round(size * 0.07), UI.brown, UI.cream)).setOrigin(0.5), size * 0.86));
    return card;
  }

  /** Dibujo del servidor; mientras carga, o si falla, el de reserva. */
  private drawing(name: string | null, x: number, y: number, size: number): Phaser.GameObjects.Container {
    const holder = this.add.container(x, y);
    const fallback = addEmoji(this, 0, 0, '🖼️', size * 0.6);
    holder.add(fallback);
    const url = getCommunity()?.drawingUrl(name) ?? null;
    if (!url) return holder;
    const key = `dibujo:${name}`;
    const show = (): void => {
      if (!holder.active || !this.textures.exists(key)) return;
      fallback.setVisible(false);
      holder.add(this.add.image(0, 0, key).setDisplaySize(size, size));
    };
    if (this.textures.exists(key)) {
      show();
      return holder;
    }
    this.load.setCORS('anonymous');
    this.load.image(key, url);
    this.load.once(`filecomplete-image-${key}`, show);
    this.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, () => undefined);
    if (!this.load.isLoading()) this.load.start();
    return holder;
  }

  private bigMessage(emoji: string, text: string): void {
    const b = this.body;
    addEmoji(this, b.centerX, b.centerY - b.height * 0.12, emoji, b.height * 0.32);
    fitText(addUiText(this, b.centerX, b.centerY + b.height * 0.25, text, textStyle(26, UI.brown, UI.cream)).setOrigin(0.5), b.width);
  }

  private strip(text: string): void {
    const b = this.body;
    fitText(addUiText(this, b.centerX, b.y - 6, text, textStyle(16, '#ffffff', UI.outline)).setOrigin(0.5, 1).setDepth(5), b.width);
  }

  private confetti(): void {
    const { width, height } = this.scale;
    const colors = [0xffd23c, 0xe03c31, 0x4caf50, 0x2196f3, 0xff80ab];
    for (let i = 0; i < 30; i++) {
      const piece = this.add.rectangle(Phaser.Math.Between(0, width), -20, 8, 14, colors[i % colors.length]).setDepth(50);
      this.tweens.add({ targets: piece, y: height + 20, angle: Phaser.Math.Between(180, 720), duration: Phaser.Math.Between(1600, 2800), delay: Phaser.Math.Between(0, 600) });
    }
  }

  // --- Acciones ---

  private pick(id: string): void {
    if (this.busy) return;
    sfx.play('tap');
    this.pickedId = id;
    this.markPicked();
    this.confirm?.setVisible(true);
  }

  private markPicked(): void {
    for (const [id, card] of this.cards) card.setScale(id === this.pickedId ? 1.06 : 1).setAlpha(this.pickedId && id !== this.pickedId ? 0.75 : 1);
  }

  private async confirmVote(): Promise<void> {
    const community = getCommunity();
    if (!community || !this.pickedId || this.busy) return;
    this.busy = true;
    sfx.play('tap');
    const result = await community.vote(this.pickedId);
    this.busy = false;
    if (!this.scene.isActive()) return;
    if (result === 'ok') {
      sfx.play('coin');
      this.pickedId = null;
      this.changing = false;
      this.note = t('board.thanks');
    } else if (result === 'offline') {
      this.note = t('board.voteFailed');
      this.showNote();
      return;
    }
    // El aviso va dentro del tablón: el de la barra de arriba quedaba encima de las pestañas.
    this.scene.restart({ ...this.sceneData(), note: this.note });
  }

  private startChange(): void {
    sfx.play('tap');
    const poll = getCommunity()?.status?.votacion;
    this.changing = true;
    this.pickedId = poll ? (getCommunity()?.memory.voted[poll.id] ?? null) : null;
    this.restart();
  }

  private goZone(zone: BoardZone): void {
    if (zone === this.zoneKey || this.busy) return;
    sfx.play('tap');
    this.zoneKey = zone;
    this.restart();
  }

  /** Mensaje corto dentro del tablón, encima del pie, que se va solo. */
  private showNote(): void {
    const note = this.note;
    this.note = null;
    if (!note) return;
    const b = this.body;
    const text = fitText(addUiText(this, b.centerX, b.bottom - b.height * 0.24, note, textStyle(26, '#ffffff', UI.outline)).setOrigin(0.5).setDepth(30), b.width);
    this.tweens.add({ targets: text, alpha: 0, delay: 2200, duration: 400, onComplete: () => text.destroy() });
  }

  private sceneData(): BoardSceneData {
    return { zone: this.zoneKey, picked: this.pickedId, changing: this.changing, wallPage: this.wallPage };
  }

  private restart(): void {
    this.scene.restart(this.sceneData());
  }

  close(): void {
    if (!this.scene.isActive()) return;
    sfx.play('tap');
    this.finish();
  }

  private finish(): void {
    this.scene.stop();
    sfx.setPaused('menu', false);
    if (this.scene.isPaused('World')) this.scene.resume('World', { from: 'board' });
  }

  // --- API para pruebas ---

  zone(): BoardZone {
    return this.zoneKey;
  }

  zonePos(zone: BoardZone): Vec | null {
    const tab = this.tabs.get(zone);
    return tab ? { x: tab.x, y: tab.y } : null;
  }

  optionPos(id: string): Vec | null {
    const card = this.cards.get(id);
    return card ? { x: card.x, y: card.y } : null;
  }

  confirmPos(): Vec | null {
    return this.confirm?.visible ? { x: this.confirm.x, y: this.confirm.y } : null;
  }

  changePos(): Vec | null {
    return this.change ? { x: this.change.x, y: this.change.y } : null;
  }

  pollView(): PollView {
    return this.view;
  }

  picked(): string | null {
    return this.pickedId;
  }

  /** Página del muro y dónde están sus flechas (null si no hay más de una página). */
  wallPageNow(): number {
    return this.wallPage;
  }

  wallArrowPos(dir: 'prev' | 'next'): Vec | null {
    const arrow = this.wallArrows[dir === 'prev' ? 0 : 1];
    return arrow ? { x: arrow.x, y: arrow.y } : null;
  }

  jarText(): string | null {
    return this.jar?.text ?? null;
  }
}
