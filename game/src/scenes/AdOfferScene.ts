import * as Phaser from 'phaser';
import type { AdSlot } from '../core/adPacing';
import type { Vec } from '../core/movement';
import { t } from '../data/strings';
import { getAds } from '../systems/ads';
import { sfx } from '../systems/audio';
import { bus } from '../systems/events';
import { addUiText } from '../ui/text';
import { UI, textStyle } from '../ui/theme';
import { addCloseBadge, addPanel, addPillButton, addVeil, coinImage } from '../ui/widgets';

export interface AdOfferSceneData {
  slot: AdSlot;
  /** Escena que abrió el panel: queda en pausa y se reanuda al cerrarlo. */
  resume: 'Shop' | 'World';
  /** Solo al volver a montarse (cambio de tamaño): el premio ya fijado, lo que queda de cuenta atrás y si el anuncio está en pantalla. */
  amount?: number;
  left?: number;
  busy?: boolean;
}

/** En la pausa el anuncio empieza solo al acabar esta cuenta atrás; la X se lo salta. */
const COUNTDOWN_MS = 5000;
const RING = 0xffd23c;

/**
 * Panel que ofrece ver un anuncio a cambio de monedas. No depende de leer: monedas, número grande,
 * botón verde con ▶ y una X. Tocar fuera no hace nada, para que no se cierre sin querer.
 */
export class AdOfferScene extends Phaser.Scene {
  private slot: AdSlot = 'tienda';
  private resumeKey: 'Shop' | 'World' = 'World';
  private amount = 0;
  private left = COUNTDOWN_MS;
  private busy = false;
  private fresh = true;
  /** El panel ya se ha cerrado: un cambio de tamaño que llegue después no debe volver a montarlo. */
  private closed = false;
  private onResize: (() => void) | null = null;
  private yes: Phaser.GameObjects.Container | null = null;
  private no: Phaser.GameObjects.Container | null = null;
  private ring: Phaser.GameObjects.Graphics | null = null;

  constructor() {
    super('AdOffer');
  }

  init(data: AdOfferSceneData): void {
    this.slot = data.slot;
    this.resumeKey = data.resume;
    this.busy = data.busy ?? false;
    this.left = data.left ?? COUNTDOWN_MS;
    // El premio se fija una vez, al abrir el panel: es el que se enseña y el que se paga.
    this.fresh = data.amount === undefined;
    this.amount = data.amount ?? getAds()?.offer(data.slot) ?? 0;
    this.closed = false;
    this.yes = null;
    this.no = null;
    this.ring = null;
  }

  create(): void {
    const { width, height } = this.scale;
    addVeil(this);
    const restart = (): void => {
      if (this.closed) return;
      const data: AdOfferSceneData = { slot: this.slot, resume: this.resumeKey, amount: this.amount, left: this.left, busy: this.busy };
      this.scene.restart(data);
    };
    this.onResize = restart;
    this.scale.once(Phaser.Scale.Events.RESIZE, restart);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, restart));
    if (!getAds()) {
      this.finish();
      return;
    }
    // Con el anuncio en pantalla solo queda el velo: el panel ya se contestó.
    if (this.busy) return;

    const panelW = Math.min(width * 0.72, 560);
    const panelH = Math.min(height * 0.84, 440);
    const cx = width / 2;
    const cy = height / 2;
    addPanel(this, cx, cy, panelW, panelH);

    // Monedas apiladas y la cantidad en grande.
    const coin = Phaser.Math.Clamp(panelH * 0.17, 32, 68);
    const top = cy - panelH * 0.3;
    const label = addUiText(this, 0, top, `+${this.amount}`, textStyle(Math.round(coin * 1.25), '#ffffff', '#5a3210')).setOrigin(0, 0.5);
    const stackW = coin * 1.5;
    const gap = coin * 0.3;
    const left = cx - (stackW + gap + label.width) / 2;
    [0.22, 0, -0.22].forEach((dy, i) => coinImage(this, coin).setPosition(left + coin / 2 + i * coin * 0.25, top + dy * coin));
    label.setX(left + stackW + gap).setDepth(1);

    // Botón verde redondo con ▶, sin texto.
    const button = Phaser.Math.Clamp(panelH * 0.3, 64, 124);
    const buttonY = cy + panelH * 0.06;
    if (this.slot === 'pausa') this.ring = this.add.graphics();
    this.yes = addPillButton(this, cx, buttonY, button, button, { color: 'green', icon: 'play', onTap: () => void this.accept() });
    this.no = addCloseBadge(this, cx + panelW / 2 - 18, cy - panelH / 2 + 18, () => this.decline(), 52);

    let size = Phaser.Math.Clamp(Math.round(panelH * 0.075), 16, 30);
    const phrase = addUiText(this, cx, cy + panelH * 0.38, t('ad.offer', { n: this.amount }), textStyle(size, UI.brown, UI.cream)).setOrigin(0.5);
    while (phrase.width > panelW * 0.88 && size > 12) {
      size -= 2;
      phrase.setStyle(textStyle(size, UI.brown, UI.cream));
    }

    if (this.fresh) sfx.play('coin');
    this.drawRing();
  }

  override update(_time: number, delta: number): void {
    if (this.busy || !this.ring) return;
    this.left = Math.max(0, this.left - delta);
    this.drawRing();
    if (this.left === 0) void this.accept();
  }

  /** Anillo de la cuenta atrás alrededor del botón verde: se vacía en 5 segundos. */
  private drawRing(): void {
    const ring = this.ring;
    const yes = this.yes;
    if (!ring || !yes) return;
    const radius = yes.width * 0.64;
    const thick = Math.max(6, yes.width * 0.09);
    const start = -Math.PI / 2;
    ring.clear();
    ring.lineStyle(thick, 0xffffff, 0.35);
    ring.strokeCircle(yes.x, yes.y, radius);
    if (this.left <= 0) return;
    ring.lineStyle(thick, RING, 1);
    ring.beginPath();
    ring.arc(yes.x, yes.y, radius, start, start + Math.PI * 2 * (this.left / COUNTDOWN_MS), false);
    ring.strokePath();
  }

  /** Botón verde, o cuenta atrás a cero: se enseña el anuncio. */
  private async accept(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    sfx.play('tap');
    const amount = this.amount;
    const result = (await getAds()?.accept(this.slot)) ?? 'fallo';
    this.finish();
    if (result === 'visto') {
      sfx.play('coin');
      bus.emit('toast', { text: t('ad.thanks', { n: amount }) });
    } else if (result === 'fallo') {
      bus.emit('toast', { text: t('ad.none') });
    }
  }

  /** La X (y el botón atrás de Android): no se ve el anuncio. */
  decline(): void {
    if (this.busy || !this.scene.isActive()) return;
    this.busy = true;
    sfx.play('tap');
    getAds()?.decline(this.slot);
    this.finish();
  }

  private finish(): void {
    // Parar la escena va a la cola de Phaser: hasta entonces, un cambio de tamaño la volvería a montar solo con el velo.
    this.closed = true;
    if (this.onResize) this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize);
    this.onResize = null;
    this.scene.stop();
    this.scene.resume(this.resumeKey);
  }

  // --- API para pruebas ---

  yesPos(): Vec | null {
    return this.yes ? { x: this.yes.x, y: this.yes.y } : null;
  }

  noPos(): Vec | null {
    return this.no ? { x: this.no.x, y: this.no.y } : null;
  }

  offeredAmount(): number {
    return this.amount;
  }

  /** Milisegundos que quedan de cuenta atrás; `null` si este panel no la tiene. */
  countdownLeft(): number | null {
    return this.ring ? this.left : null;
  }
}
