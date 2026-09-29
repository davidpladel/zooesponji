import * as Phaser from 'phaser';
import { animalKey, getArt, idleFrame } from '../art/art';
import type { Vec } from '../core/movement';
import type { Settings } from '../core/save';
import { t, type StringKey } from '../data/strings';
import { sfx } from '../systems/audio';
import { getSession } from '../systems/session';
import { addCloseButton, restartOnResize, textStyle } from './ui';

const TOGGLES: readonly { key: keyof Settings; icon: string; label: StringKey }[] = [
  { key: 'music', icon: '🎵', label: 'settings.music' },
  { key: 'sfx', icon: '🔊', label: 'settings.sfx' },
  { key: 'joystick', icon: '🕹️', label: 'settings.joystick' },
];

/** Menú de ajustes (música, sonido, joystick) y créditos. Sin puerta parental: no hay nada de riesgo. */
export class SettingsScene extends Phaser.Scene {
  private readonly toggles = new Map<keyof Settings, Phaser.GameObjects.Container>();
  /** El mundo estaba en marcha al abrir: al cerrar se reanuda. */
  private pausedWorld = false;

  constructor() {
    super('Settings');
  }

  init(data: { pausedWorld?: boolean } = {}): void {
    this.toggles.clear();
    if (data.pausedWorld !== undefined) this.pausedWorld = data.pausedWorld;
  }

  create(): void {
    sfx.setPaused('menu', true);
    const { width, height } = this.scale;
    // Tocar fuera del panel cierra.
    this.add.rectangle(0, 0, width, height, 0x000000, 0.6).setOrigin(0).setInteractive().on('pointerup', () => this.close());
    const panelW = Math.min(width * 0.9, 760);
    const panelH = height * 0.86;
    // El panel se traga los toques para que no cierren el menú.
    this.add.rectangle(width / 2, height / 2, panelW, panelH, 0xe3f2fd).setStrokeStyle(6, 0x1565c0).setInteractive();
    this.add
      .text(width / 2, height / 2 - panelH / 2 + height * 0.08, `⚙️ ${t('settings.title')}`, textStyle(Math.round(height * 0.06), '#ffffff', '#1565c0'))
      .setOrigin(0.5);

    const size = Phaser.Math.Clamp(Math.min(height * 0.22, (panelW - 80) / 3.6), 72, 150);
    TOGGLES.forEach((toggle, i) => {
      const x = width / 2 + (i - 1) * (size + 36);
      const button = this.add.container(x, height * 0.42);
      button.setSize(size, size).setInteractive({ useHandCursor: true });
      button.on('pointerup', () => void this.flip(toggle.key));
      this.toggles.set(toggle.key, button);
      this.renderToggle(toggle.key, size, toggle.icon, t(toggle.label));
    });

    this.addCredits(height * 0.72, panelW);
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

  togglePos(key: keyof Settings): Vec | null {
    const button = this.toggles.get(key);
    return button ? { x: button.x, y: button.y } : null;
  }

  private async flip(key: keyof Settings): Promise<void> {
    const session = getSession();
    await session.updateSettings({ [key]: !session.settings[key] });
    sfx.play('tap');
    const toggle = TOGGLES.find((x) => x.key === key)!;
    const button = this.toggles.get(key)!;
    this.renderToggle(key, button.width, toggle.icon, t(toggle.label));
  }

  private renderToggle(key: keyof Settings, size: number, icon: string, label: string): void {
    const button = this.toggles.get(key);
    if (!button) return;
    button.removeAll(true);
    const on = getSession().settings[key];
    button.add(this.add.rectangle(0, 0, size, size, on ? 0x43a047 : 0x9e9e9e).setStrokeStyle(5, on ? 0x1b5e20 : 0x616161));
    button.add(this.add.text(0, -size * 0.08, icon, { fontSize: `${Math.round(size * 0.45)}px` }).setOrigin(0.5).setAlpha(on ? 1 : 0.5));
    button.add(this.add.text(size / 2 - 6, -size / 2 + 4, on ? '✔️' : '✖️', { fontSize: `${Math.round(size * 0.2)}px` }).setOrigin(1, 0));
    button.add(this.add.text(0, size * 0.32, label, textStyle(Math.round(size * 0.14), '#ffffff', '#263238')).setOrigin(0.5));
    button.setData('on', on);
  }

  /** Créditos de la versión vieja (pie de index.html), con los animales que pintaron los niños. */
  private addCredits(y: number, panelW: number): void {
    const { width, height } = this.scale;
    const size = Math.round(Math.min(height * 0.04, panelW * 0.035));
    this.add.text(width / 2, y, t('credits.madeBy'), textStyle(size, '#4e342e', '#ffffff')).setOrigin(0.5);
    this.add.text(width / 2, height * 0.905, t('credits.copyright'), textStyle(Math.round(size * 0.8), '#37474f', '#ffffff')).setOrigin(0.5);
    const art = getArt();
    const line = this.add.text(width / 2, y + size * 2, t('credits.art'), textStyle(Math.round(size * 0.85), '#4e342e', '#ffffff')).setOrigin(0.5);
    if (!art) return;
    const spriteY = y + size * 2;
    for (const [id, side] of [['panda', -1], ['pantera', 1]] as const) {
      const frameHeight = art.animals[id].frameHeight;
      const scale = Math.max(2, Math.floor((height * 0.12) / frameHeight));
      this.add.sprite(width / 2 + side * (line.width / 2 + 16 + (frameHeight * scale) / 2), spriteY, animalKey(id), idleFrame('down')).setScale(scale);
    }
  }
}
