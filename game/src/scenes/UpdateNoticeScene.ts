import * as Phaser from 'phaser';
import type { Vec } from '../core/movement';
import type { UpdateKind } from '../core/updatePolicy';
import { t } from '../data/strings';
import { sfx } from '../systems/audio';
import { askQuit } from '../systems/platform';
import { smooth } from '../ui/paint';
import { addUiText, fitText } from '../ui/text';
import { UI, textStyle } from '../ui/theme';
import { drawGlyph, type GlyphKind } from '../ui/updateArt';
import { addPanel, addPillButton, addVeil, restartOnResize } from '../ui/widgets';
import { makePressable } from '../ui/press';

export type UpdateNoticeMode = 'suave' | 'bloqueo';

export interface UpdateNoticeData {
  mode: UpdateNoticeMode;
  kind: UpdateKind;
  /** «Actualizar» (en la suave la escena ya se ha cerrado; en el bloqueo sigue abierta hasta que `close()` la cierre). */
  onAccept: () => void;
  /** «Luego» o «atrás» en la suave. */
  onLater: () => void;
}

/** Nombre de la escena abierta en cada modo, para el botón «atrás» (`core/back.ts`). */
export const UPDATE_NOTICE_KEY = 'UpdateNotice';

const GREEN = 0x4fb52a;
const GREEN_RIM = 0xfff6dc;
const GREEN_LINE = 0x24600f;

/** Textura de un dibujo de `updateArt` (una sola vez por clave). */
function glyph(scene: Phaser.Scene, kind: GlyphKind, size: number, color = '#ffffff'): Phaser.GameObjects.Image {
  const px = Math.max(8, Math.round(size));
  const key = `ui-update-${kind}-${px}-${color}`;
  if (!scene.textures.exists(key)) {
    const texture = scene.textures.createCanvas(key, px, px);
    if (!texture) throw new Error(`No se pudo crear la textura ${key}`);
    drawGlyph(texture.context, kind, px, color);
    texture.refresh();
    smooth(scene, key);
  }
  return scene.add.image(0, 0, key);
}

/** Aviso para actualizar: ventana suave («actualizar» o «luego») o pantalla de bloqueo. Sin leer: flecha, ✓ y reloj. */
export class UpdateNoticeScene extends Phaser.Scene {
  private data0: UpdateNoticeData | null = null;
  private done = false;
  private yes: Phaser.GameObjects.Container | null = null;
  private no: Phaser.GameObjects.Container | null = null;
  private exit: Phaser.GameObjects.Container | null = null;

  constructor() {
    super(UPDATE_NOTICE_KEY);
  }

  init(data: UpdateNoticeData): void {
    this.data0 = data;
    this.done = false;
    this.yes = null;
    this.no = null;
    this.exit = null;
  }

  get mode(): UpdateNoticeMode | null {
    return this.data0?.mode ?? null;
  }

  create(): void {
    const data = this.data0;
    if (!data) return;
    if (data.mode === 'bloqueo') this.buildBlock();
    else this.buildSoft(data);
    sfx.play('coin');
    restartOnResize(this, () => data);
  }

  private disc(x: number, y: number, diameter: number): Phaser.GameObjects.Container {
    const r = diameter / 2;
    const shadow = this.add.circle(0, Math.max(3, r * 0.1), r, 0x000000, 0.28);
    const rim = this.add.circle(0, 0, r, GREEN_RIM, 1);
    const body = this.add.circle(0, 0, r * 0.9, GREEN, 1).setStrokeStyle(Math.max(2, r * 0.06), GREEN_LINE, 1);
    const arrow = glyph(this, 'arrow', diameter * 0.62);
    return this.add.container(x, y, [shadow, rim, body, arrow]).setSize(diameter, diameter);
  }

  private buildSoft(data: UpdateNoticeData): void {
    const { width, height } = this.scale;
    addVeil(this);
    const panelW = Math.min(width * 0.62, 520);
    const panelH = Math.min(height * 0.8, 420);
    const cx = width / 2;
    const cy = height / 2;
    addPanel(this, cx, cy, panelW, panelH);
    const button = Phaser.Math.Clamp(panelH * 0.24, 60, 110);
    this.disc(cx, cy - panelH * 0.2, panelH * 0.4);
    fitText(addUiText(this, cx, cy + panelH * 0.07, t('update.title'), textStyle(Math.round(panelH * 0.09), UI.brown, UI.cream)).setOrigin(0.5), panelW * 0.86);
    const rowY = cy + panelH * 0.3;
    // El grande, a un lado; el pequeño del reloj, al otro: «luego» no tapa a «actualizar».
    const yesW = Math.min(panelW * 0.5, button * 2.2);
    this.yes = addPillButton(this, cx - panelW * 0.1, rowY, yesW, button, { color: 'green', onTap: () => this.accept() });
    this.yes.add(glyph(this, 'check', button * 0.62));
    const small = button * 0.72;
    this.no = addPillButton(this, cx + panelW * 0.33, rowY, small, small, { color: 'gray', onTap: () => this.decline() });
    this.no.add(glyph(this, 'clock', small * 0.62, '#5f584c'));
  }

  private buildBlock(): void {
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, UI.veil, 1).setOrigin(0).setInteractive();
    const side = Math.min(width, height);
    const d = Phaser.Math.Clamp(side * 0.46, 110, 320);
    fitText(addUiText(this, width / 2, height * 0.14, t('update.title'), textStyle(Math.round(Math.max(20, side * 0.09)), '#ffffff', '#24600f')).setOrigin(0.5), width * 0.88);
    const big = this.disc(width / 2, height * 0.54, d);
    makePressable(big, () => this.accept());
    this.tweens.add({ targets: big, scale: 1.05, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.yes = big;
    // La puerta de salida: el niño nunca queda atrapado.
    const door = Phaser.Math.Clamp(height * 0.14, 48, 72);
    this.exit = addPillButton(this, width - door, height - door, door, door, { color: 'gray', icon: 'door', onTap: () => askQuit(this.game) });
  }

  private accept(): void {
    const data = this.data0;
    if (!data || this.done) return;
    sfx.play('tap');
    if (data.mode === 'suave') this.close();
    data.onAccept();
  }

  /** «Luego» (y «atrás») en la suave; en el bloqueo no hace nada. */
  decline(): void {
    const data = this.data0;
    if (!data || data.mode !== 'suave' || this.done || !this.scene.isActive()) return;
    sfx.play('tap');
    this.close();
    data.onLater();
  }

  /** Cierra el aviso y, si el mundo estaba en pausa debajo, lo reanuda. */
  close(): void {
    if (this.done) return;
    this.done = true;
    this.scene.stop();
    if (this.scene.isPaused('World')) this.scene.resume('World', { from: 'notice' });
  }

  // --- API para pruebas ---

  yesPos(): Vec | null {
    return this.yes ? { x: this.yes.x, y: this.yes.y } : null;
  }

  noPos(): Vec | null {
    return this.no ? { x: this.no.x, y: this.no.y } : null;
  }

  exitPos(): Vec | null {
    return this.exit ? { x: this.exit.x, y: this.exit.y } : null;
  }
}
