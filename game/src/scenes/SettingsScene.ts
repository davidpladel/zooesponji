import { Capacitor } from '@capacitor/core';
import * as Phaser from 'phaser';
import { animalKey, animalSheet, getArt, idleFrame } from '../art/art';
import type { Vec } from '../core/movement';
import type { ToggleKey } from '../core/save';
import { APP_VERSION } from '../core/version';
import { t, type StringKey } from '../data/strings';
import { sfx } from '../systems/audio';
import { openLegal } from '../systems/legal';
import { askQuit } from '../systems/platform';
import { getSession } from '../systems/session';
import { addCloseButton, addPlateButton, addWoodPanel, restartOnResize, textStyle } from './ui';

const TOGGLES: readonly { key: ToggleKey; icon: string; label: StringKey }[] = [
  { key: 'music', icon: '🎵', label: 'settings.music' },
  { key: 'sfx', icon: '🔊', label: 'settings.sfx' },
  { key: 'joystick', icon: '🕹️', label: 'settings.joystick' },
];

type ButtonKey = 'privacy' | 'quit';

/**
 * Menú de ajustes en un tablero de madera: música, sonido, joystick, créditos, privacidad y salir.
 * Sin puerta parental: la privacidad se lee dentro del juego y nada lleva fuera de él.
 */
export class SettingsScene extends Phaser.Scene {
  private readonly toggles = new Map<ToggleKey, Phaser.GameObjects.Container>();
  private readonly buttons = new Map<ButtonKey, Phaser.GameObjects.Container>();
  /** El mundo estaba en marcha al abrir: al cerrar se reanuda. */
  private pausedWorld = false;

  constructor() {
    super('Settings');
  }

  init(data: { pausedWorld?: boolean } = {}): void {
    this.toggles.clear();
    this.buttons.clear();
    if (data.pausedWorld !== undefined) this.pausedWorld = data.pausedWorld;
  }

  create(): void {
    sfx.setPaused('menu', true);
    const { width, height } = this.scale;
    // Tocar fuera del panel cierra.
    this.add.rectangle(0, 0, width, height, 0x000000, 0.6).setOrigin(0).setInteractive().on('pointerup', () => this.close());
    const panelW = Math.min(width * 0.9, 760);
    addWoodPanel(this, width / 2, height * 0.53, panelW, height * 0.88);
    // El cartel del título va montado sobre el borde de arriba.
    const signH = Phaser.Math.Clamp(height * 0.13, 44, 84);
    addWoodPanel(this, width / 2, height * 0.1, Math.min(panelW * 0.5, 360), signH);
    this.add.text(width / 2, height * 0.1, t('settings.title'), textStyle(Math.round(signH * 0.5), '#ffffff', '#4e2f14')).setOrigin(0.5);

    const size = Phaser.Math.Clamp(Math.min(height * 0.2, (panelW - 80) / 3.6), 64, 140);
    TOGGLES.forEach((toggle, i) => {
      const x = width / 2 + (i - 1) * (size + 40);
      const button = this.add.container(x, height * 0.35);
      button.setSize(size, size).setInteractive({ useHandCursor: true });
      button.on('pointerup', () => void this.flip(toggle.key));
      this.toggles.set(toggle.key, button);
      this.renderToggle(toggle.key, size, toggle.icon, t(toggle.label));
    });

    this.addCredits(height * 0.6, panelW);
    this.addButtons(height * 0.805, panelW);
    const footer = APP_VERSION ? `${t('credits.copyright')} · v${APP_VERSION}` : t('credits.copyright');
    const footerSize = Math.round(Math.max(10, Math.min(height * 0.03, panelW * 0.028)));
    this.add.text(width / 2, height * 0.89, footer, { fontFamily: 'sans-serif', fontSize: `${footerSize}px`, color: '#3e2723' }).setOrigin(0.5);

    addCloseButton(this, () => this.close());
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

  /** Textos de créditos visibles (para pruebas). */
  creditsText(): string {
    return `${t('credits.madeBy')} ${t('credits.art')}`;
  }

  togglePos(key: ToggleKey): Vec | null {
    const button = this.toggles.get(key);
    return button ? { x: button.x, y: button.y } : null;
  }

  buttonPos(key: ButtonKey): Vec | null {
    const button = this.buttons.get(key);
    return button ? { x: button.x, y: button.y } : null;
  }

  private async flip(key: ToggleKey): Promise<void> {
    const session = getSession();
    await session.updateSettings({ [key]: !session.settings[key] });
    sfx.play('tap');
    const toggle = TOGGLES.find((x) => x.key === key)!;
    const button = this.toggles.get(key)!;
    this.renderToggle(key, button.width, toggle.icon, t(toggle.label));
  }

  private renderToggle(key: ToggleKey, size: number, icon: string, label: string): void {
    const button = this.toggles.get(key);
    if (!button) return;
    button.removeAll(true);
    const on = getSession().settings[key];
    const lip = Math.max(4, Math.round(size * 0.07));
    button.add(this.add.rectangle(0, 0, size, size, 0x4e2f14));
    button.add(this.add.rectangle(0, -lip / 2, size - lip * 2, size - lip * 3, on ? 0xf3e9d2 : 0x9c8f7c));
    button.add(this.add.text(0, -lip / 2, icon, { fontSize: `${Math.round(size * 0.48)}px` }).setOrigin(0.5).setAlpha(on ? 1 : 0.35));
    // Apagado: una raya roja lo tacha.
    if (!on) button.add(this.add.rectangle(0, -lip / 2, size * 0.8, lip * 1.4, 0xc62828).setAngle(-45));
    button.add(this.add.text(0, size * 0.68, label, textStyle(Math.round(size * 0.2), '#ffffff', '#4e2f14')).setOrigin(0.5));
    button.setData('on', on);
  }

  /** Privacidad siempre; Salir solo en la app (una web no se puede cerrar a sí misma). */
  private addButtons(y: number, panelW: number): void {
    const { width, height } = this.scale;
    const keys: ButtonKey[] = Capacitor.isNativePlatform() ? ['privacy', 'quit'] : ['privacy'];
    const h = Phaser.Math.Clamp(height * 0.11, 40, 68);
    const w = Math.min((panelW - 96) / 2, h * 4.2);
    keys.forEach((key, i) => {
      const x = width / 2 + (i - (keys.length - 1) / 2) * (w + 24);
      this.buttons.set(key, addPlateButton(this, x, y, w, h, t(`settings.${key}`), () => this.press(key)));
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

  /** Créditos de la versión vieja (pie de index.html), con los animales que pintaron los niños. */
  private addCredits(y: number, panelW: number): void {
    const { width, height } = this.scale;
    const size = Math.round(Math.min(height * 0.04, panelW * 0.035));
    this.add.text(width / 2, y, t('credits.madeBy'), textStyle(size, '#ffffff', '#4e2f14')).setOrigin(0.5);
    const art = getArt();
    const line = this.add.text(width / 2, y + size * 2, t('credits.art'), textStyle(Math.round(size * 0.85), '#fff3d6', '#4e2f14')).setOrigin(0.5);
    if (!art) return;
    const spriteY = y + size * 2;
    for (const [id, side] of [['panda', -1], ['pantera', 1]] as const) {
      const frameHeight = animalSheet(art, id).frameHeight;
      const scale = Math.max(2, Math.floor((height * 0.1) / frameHeight));
      this.add.sprite(width / 2 + side * (line.width / 2 + 16 + (frameHeight * scale) / 2), spriteY, animalKey(id), idleFrame('down')).setScale(scale);
    }
  }
}
