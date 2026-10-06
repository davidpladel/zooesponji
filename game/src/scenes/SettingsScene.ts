import { Capacitor } from '@capacitor/core';
import * as Phaser from 'phaser';
import type { Vec } from '../core/movement';
import type { ToggleKey } from '../core/save';
import { APP_VERSION } from '../core/version';
import { t, type StringKey } from '../data/strings';
import { sfx } from '../systems/audio';
import { getLanguage, otherLanguage, setLanguage } from '../systems/language';
import { openLegal } from '../systems/legal';
import { askQuit } from '../systems/platform';
import { getSession } from '../systems/session';
import { addIcon, type IconName } from '../ui/icons';
import { makePressable } from '../ui/press';
import { addUiText } from '../ui/text';
import { PILL, UI, textStyle, type PillColor } from '../ui/theme';
import { addCloseBadge, addHeartLine, addPanel, addPillButton, addRibbonTitle, addVeil, pillImage, restartOnResize } from '../ui/widgets';

const TOGGLES: readonly { key: ToggleKey; icon: IconName; label: StringKey }[] = [
  { key: 'music', icon: 'music', label: 'settings.music' },
  { key: 'sfx', icon: 'volume', label: 'settings.sfx' },
  { key: 'joystick', icon: 'joystick', label: 'settings.joystick' },
];

/** Ventanas que pueden estar abiertas debajo del menú; sus textos ya están pintados en el idioma anterior. */
const OVERLAYS = ['Book', 'Shop', 'Feed'] as const;

type ButtonKey = 'privacy' | 'quit';

const BUTTONS: Record<ButtonKey, { color: PillColor; icon: IconName }> = {
  privacy: { color: 'blue', icon: 'shield' },
  quit: { color: 'red', icon: 'door' },
};

interface Chip {
  color: PillColor;
  label: string;
  icon?: IconName;
  text?: string;
  dim?: boolean;
}

/**
 * Menú de ajustes: música, sonido, joystick, idioma, privacidad, salir y créditos.
 * Sin puerta parental: la privacidad se lee dentro del juego y nada lleva fuera de él.
 */
export class SettingsScene extends Phaser.Scene {
  private readonly toggles = new Map<ToggleKey, Phaser.GameObjects.Container>();
  private readonly buttons = new Map<ButtonKey, Phaser.GameObjects.Container>();
  private language: Phaser.GameObjects.Container | null = null;
  /** Ya se ha pulsado el idioma: se ignoran más toques hasta que el menú se monte de nuevo. */
  private switching = false;
  /** El mundo estaba en marcha al abrir: al cerrar se reanuda. */
  private pausedWorld = false;

  constructor() {
    super('Settings');
  }

  init(data: { pausedWorld?: boolean } = {}): void {
    this.toggles.clear();
    this.buttons.clear();
    this.language = null;
    this.switching = false;
    if (data.pausedWorld !== undefined) this.pausedWorld = data.pausedWorld;
  }

  create(): void {
    sfx.setPaused('menu', true);
    const { width, height } = this.scale;
    // Tocar fuera del panel cierra.
    addVeil(this, () => this.close());
    const panelW = Math.min(width * 0.88, height * 1.75, 820);
    const panelH = height * 0.84;
    const panelY = height * 0.55;
    const top = panelY - panelH / 2;
    addPanel(this, width / 2, panelY, panelW, panelH);
    addRibbonTitle(this, width / 2, top, Math.min(panelW * 0.5, 380), Phaser.Math.Clamp(height * 0.15, 44, 84), t('settings.title'));
    const badge = Phaser.Math.Clamp(height * 0.13, 44, 64);
    addCloseBadge(this, width / 2 + panelW / 2 - badge * 0.35, top + badge * 0.35, () => this.close(), badge);

    // Cuatro fichas en fila: los tres interruptores y el idioma.
    const slots = TOGGLES.length + 1;
    const size = Phaser.Math.Clamp(Math.min(height * 0.2, (panelW - 80) / (slots * 1.3)), 56, 140);
    const gap = Math.min(40, size * 0.4);
    const slotX = (i: number): number => width / 2 + (i - (slots - 1) / 2) * (size + gap);
    const rowY = height * 0.36;
    TOGGLES.forEach((toggle, i) => {
      const chip = this.add.container(slotX(i), rowY).setSize(size, size);
      makePressable(chip, () => void this.flip(toggle.key));
      this.toggles.set(toggle.key, chip);
      this.renderToggle(toggle.key);
    });
    this.language = this.add.container(slotX(TOGGLES.length), rowY).setSize(size, size);
    makePressable(this.language, () => void this.switchLanguage());
    this.paintChip(this.language, { color: 'blue', text: getLanguage().toUpperCase(), label: t('settings.language') });

    this.addButtons(height * 0.7, panelW);
    const creditSize = Math.round(Math.min(height * 0.045, panelW * 0.036));
    addHeartLine(this, width / 2, height * 0.82, t('credits.madeBy'), textStyle(creditSize, UI.brown, UI.cream));
    const footer = APP_VERSION ? `${t('credits.copyright')} · v${APP_VERSION}` : t('credits.copyright');
    const footerSize = Math.round(Math.max(10, Math.min(height * 0.03, panelW * 0.028)));
    this.add.text(width / 2, height * 0.9, footer, { fontFamily: 'sans-serif', fontSize: `${footerSize}px`, color: '#9a7a55' }).setOrigin(0.5);

    this.input.keyboard?.on('keydown-ESC', this.close, this);
    restartOnResize(this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input.keyboard?.off('keydown-ESC', this.close, this));
  }

  close(): void {
    if (!this.scene.isActive()) return;
    sfx.play('tap');
    this.scene.stop();
    sfx.setPaused('menu', false);
    if (this.pausedWorld) this.scene.resume('World');
    this.pausedWorld = false;
  }

  /** Texto de créditos visible (para pruebas). */
  creditsText(): string {
    return t('credits.madeBy');
  }

  togglePos(key: ToggleKey): Vec | null {
    const button = this.toggles.get(key);
    return button ? { x: button.x, y: button.y } : null;
  }

  buttonPos(key: ButtonKey): Vec | null {
    const button = this.buttons.get(key);
    return button ? { x: button.x, y: button.y } : null;
  }

  languagePos(): Vec | null {
    return this.language ? { x: this.language.x, y: this.language.y } : null;
  }

  /** Nombre del idioma que enseña el botón (para pruebas). */
  languageLabel(): string {
    return t('settings.language');
  }

  private async flip(key: ToggleKey): Promise<void> {
    const session = getSession();
    await session.updateSettings({ [key]: !session.settings[key] });
    sfx.play('tap');
    this.renderToggle(key);
  }

  /** Encendido: ficha verde. Apagado: gris con el icono atenuado. */
  private renderToggle(key: ToggleKey): void {
    const chip = this.toggles.get(key);
    const toggle = TOGGLES.find((x) => x.key === key);
    if (!chip || !toggle) return;
    const on = getSession().settings[key];
    this.paintChip(chip, { color: on ? 'green' : 'gray', icon: toggle.icon, label: t(toggle.label), dim: !on });
    chip.setData('on', on);
  }

  /** Repinta una ficha cuadrada (el contenedor se conserva: es el que recibe los toques). */
  private paintChip(chip: Phaser.GameObjects.Container, o: Chip): void {
    const size = chip.width;
    const cy = -size * 0.04;
    chip.removeAll(true);
    chip.add(pillImage(this, size, size, o.color, size * 0.26));
    if (o.icon) chip.add(addIcon(this, 0, cy, o.icon, size * 0.56).setAlpha(o.dim ? 0.55 : 1));
    if (o.text) chip.add(addUiText(this, 0, cy, o.text, textStyle(Math.round(size * 0.4), '#ffffff', PILL[o.color].stroke)).setOrigin(0.5));
    chip.add(addUiText(this, 0, size * 0.72, o.label, textStyle(Math.round(size * 0.22), UI.brown, UI.cream)).setOrigin(0.5));
  }

  /**
   * Cambia de idioma sin recargar. Se guarda antes de tocar nada: no se pierde partida.
   * Los rótulos del mundo se pintan una sola vez al montarlo, así que el mundo se monta de nuevo
   * (la cuidadora vuelve a la entrada) y se queda en pausa debajo del menú. El HUD no tiene textos fijos.
   */
  private async switchLanguage(): Promise<void> {
    if (this.switching) return;
    this.switching = true;
    const next = otherLanguage(getLanguage());
    await getSession().updateSettings({ language: next });
    setLanguage(next);
    sfx.play('tap');
    for (const key of OVERLAYS) {
      if (this.scene.isActive(key) || this.scene.isPaused(key)) this.scene.stop(key);
    }
    // Las operaciones de escena se aplican en orden en el siguiente paso: parar, montar, pausar.
    this.scene.stop('World');
    this.scene.launch('World');
    // Si el menú se cerró mientras se guardaba, el mundo se queda en marcha y el menú no se reabre.
    if (!this.scene.isActive()) return;
    this.scene.pause('World');
    this.scene.restart({ pausedWorld: true });
  }

  /** Privacidad siempre; Salir solo en la app (una web no se puede cerrar a sí misma). */
  private addButtons(y: number, panelW: number): void {
    const { width, height } = this.scale;
    const keys: ButtonKey[] = Capacitor.isNativePlatform() ? ['privacy', 'quit'] : ['privacy'];
    const h = Phaser.Math.Clamp(height * 0.13, 44, 72);
    const w = Math.min((panelW - 96) / 2, h * 4);
    keys.forEach((key, i) => {
      const x = width / 2 + (i - (keys.length - 1) / 2) * (w + 24);
      const button = addPillButton(this, x, y, w, h, { ...BUTTONS[key], label: t(`settings.${key}`), onTap: () => this.press(key) });
      this.buttons.set(key, button);
    });
  }

  private press(key: ButtonKey): void {
    sfx.play('tap');
    if (key === 'privacy') {
      openLegal();
      return;
    }
    const game = this.game;
    this.close();
    askQuit(game);
  }
}
