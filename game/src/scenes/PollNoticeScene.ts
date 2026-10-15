import * as Phaser from 'phaser';
import type { Vec } from '../core/movement';
import { sfx } from '../systems/audio';
import { getCommunity } from '../systems/community';
import { bus } from '../systems/events';
import { addEmoji, addUiText, fitText } from '../ui/text';
import { localized } from '../core/community';
import { getLanguage } from '../systems/language';
import { textStyle, UI } from '../ui/theme';
import { t } from '../data/strings';
import { addCloseBadge, addPanel, addPillButton, addVeil } from '../ui/widgets';
import type { WorldScene } from './WorldScene';

/** Panel grande de «¡hay votación!»: una urna, un botón verde que lleva al tablón y una X. Sin leer. */
export class PollNoticeScene extends Phaser.Scene {
  /** Votación ya anunciada: al reiniciar por cambio de tamaño no se cuenta dos veces. */
  static shownFor: string | null = null;

  private yes: Phaser.GameObjects.Container | null = null;
  private no: Phaser.GameObjects.Container | null = null;
  private done = false;

  constructor() {
    super('PollNotice');
  }

  init(): void {
    this.yes = null;
    this.no = null;
    this.done = false;
  }

  create(): void {
    const community = getCommunity();
    const poll = community?.status?.votacion;
    if (!community || !poll) {
      this.finish(false);
      return;
    }
    const { width, height } = this.scale;
    addVeil(this);
    const panelW = Math.min(width * 0.62, 520);
    const panelH = Math.min(height * 0.8, 420);
    const cx = width / 2;
    const cy = height / 2;
    addPanel(this, cx, cy, panelW, panelH);
    const button = Phaser.Math.Clamp(panelH * 0.24, 60, 110);
    const win = community.notifyWinner() ? poll.opciones.find((o) => o.id === poll.ganadora) : undefined;
    if (win) {
      // Ganadora: copa, nombre de la idea y botón que lleva al tablón a verla.
      addEmoji(this, cx, cy - panelH * 0.22, '🏆', panelH * 0.26);
      fitText(addUiText(this, cx, cy + panelH * 0.04, `${t('board.winner')} ${localized(win.titulo, getLanguage())}`, textStyle(Math.round(panelH * 0.09), UI.brown, UI.cream)).setOrigin(0.5), panelW * 0.86);
      this.yes = addPillButton(this, cx, cy + panelH * 0.3, Math.min(panelW * 0.8, button * 3), button, { color: 'green', icon: 'play', label: t('board.see'), onTap: () => this.finish(true) });
      community.markWinnerNoticed();
      bus.emit('poll-winner-notice', { poll: poll.id });
    } else {
      addEmoji(this, cx, cy - panelH * 0.14, '🙋', panelH * 0.32);
      // Botón con texto («¡A votar!»): el ▶ solo no decía qué hacía.
      this.yes = addPillButton(this, cx, cy + panelH * 0.3, Math.min(panelW * 0.8, button * 3), button, { color: 'green', icon: 'play', label: t('board.goVote'), onTap: () => this.finish(true) });
      community.markNoticed();
    }
    this.no = addCloseBadge(this, cx + panelW / 2 - 18, cy - panelH / 2 + 18, () => this.decline(), 52);
    if (win) {
      sfx.play('coin');
      this.scale.once(Phaser.Scale.Events.RESIZE, this.onResize, this);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize, this));
      return;
    }
    if (PollNoticeScene.shownFor !== poll.id) {
      PollNoticeScene.shownFor = poll.id;
      bus.emit('poll-notice', { poll: poll.id });
    }
    sfx.play('coin');
    this.scale.once(Phaser.Scale.Events.RESIZE, this.onResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize, this));
  }

  private onResize(): void {
    if (this.scene.isActive()) this.scene.restart();
  }

  decline(): void {
    if (!this.scene.isActive()) return;
    sfx.play('tap');
    this.finish(false);
  }

  private finish(openBoard: boolean): void {
    if (this.done) return;
    this.done = true;
    this.scene.stop();
    this.scene.resume('World', { from: 'notice' });
    if (openBoard) this.scene.get<WorldScene>('World').openBoard();
  }

  // --- API para pruebas ---

  yesPos(): Vec | null {
    return this.yes ? { x: this.yes.x, y: this.yes.y } : null;
  }

  noPos(): Vec | null {
    return this.no ? { x: this.no.x, y: this.no.y } : null;
  }
}
