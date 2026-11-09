import * as Phaser from 'phaser';
import { ART_KEYS, getArt, idleFrame } from '../art/art';
import type { Facing } from '../core/facing';
import type { Point } from '../core/pathfinding';
import type { ShopInterior } from './ShopInterior';
import { HUD_COIN } from '../ui/widgets';
import { wrapStyle } from '../ui/wrap';

/** Borde de abajo del contador de monedas (moneda de 44 px centrada en HUD_COIN) y un poco de aire. */
const COIN_CLEAR_Y = HUD_COIN.y + 22 + 6;

/** Cuánto se aparta la cuidadora (px de pantalla por unidad de escala) antes de que el tendero gire la cabeza. */
const LOOK_MARGIN = 10;

/** El tendero tras el mostrador: respira, mira a la cuidadora, saluda y habla con bocadillos. */
export class Shopkeeper {
  private readonly sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Text;
  private readonly feet: Point;
  private facing: Facing = 'down';
  private bubble: Phaser.GameObjects.Container | null = null;
  private current: string | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly interior: ShopInterior,
    /** Otro sitio u otro dibujo (los veterinarios de la clínica): pies en px de interior, hoja de sprites y emoji sin arte. */
    look: { at?: Point; texture?: string; emoji?: string } = {},
  ) {
    const s = interior.layout.scale;
    const at = look.at ?? interior.spots.shopkeeper;
    this.feet = interior.screen(at);
    // Algo más grande que el mobiliario: es el personaje que atiende y tiene que verse bien tras el mostrador.
    this.sprite = getArt()
      ? scene.add.sprite(this.feet.x, this.feet.y, look.texture ?? ART_KEYS.shopkeeper, idleFrame('down')).setOrigin(0.5, 1).setScale(Math.round(s * 1.6))
      : scene.add.text(this.feet.x, this.feet.y, look.emoji ?? '🧑‍🌾', { fontSize: `${Math.round(34 * s)}px` }).setOrigin(0.5, 1);
    this.sprite.setDepth(at.y);
    // Respira: sube y baja un pelín.
    scene.tweens.add({ targets: this.sprite, scaleY: this.sprite.scaleY * 1.04, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }

  /** Texto del bocadillo que se ve ahora (null si no habla). */
  get message(): string | null {
    return this.current;
  }

  /** Gira la cabeza hacia una x de pantalla (izquierda, de frente o derecha). */
  lookAt(x: number): void {
    if (!(this.sprite instanceof Phaser.GameObjects.Sprite)) return;
    const dx = x - this.feet.x;
    const margin = LOOK_MARGIN * this.interior.layout.scale;
    const facing: Facing = dx > margin * 4 ? 'right' : dx < -margin ? 'left' : 'down';
    if (facing === this.facing) return;
    this.facing = facing;
    this.sprite.setFrame(idleFrame(facing));
  }

  hop(): void {
    const s = this.interior.layout.scale;
    const y = this.feet.y;
    this.scene.tweens.add({ targets: this.sprite, y: y - 6 * s, duration: 140, yoyo: true, repeat: 1, ease: 'Quad.Out', onComplete: () => this.sprite.setY(y) });
  }

  /** Saluda con la mano: una manita que se balancea junto a su cabeza. */
  wave(): void {
    const s = this.interior.layout.scale;
    const hand = this.scene.add
      .text(this.feet.x + 9 * s, this.feet.y - this.sprite.displayHeight * 0.8, '👋', { fontSize: `${Math.round(9 * s)}px` })
      .setOrigin(0.5, 1)
      .setDepth(1900)
      .setScale(0);
    this.scene.tweens.chain({
      targets: hand,
      tweens: [
        { scale: 1, duration: 160, ease: 'Back.Out' },
        { angle: { from: -20, to: 20 }, duration: 180, yoyo: true, repeat: 2, ease: 'Sine.InOut' },
        { alpha: 0, duration: 200, onComplete: () => hand.destroy() },
      ],
    });
  }

  /** Bocadillo encima de su cabeza durante `ms`. */
  say(message: string, ms: number): void {
    this.hideBubble();
    const s = this.interior.layout.scale;
    const text = this.scene.add
      .text(0, 0, message, { fontFamily: 'sans-serif', fontSize: `${Math.round(Math.max(16, 6.5 * s))}px`, color: '#4e342e', align: 'center', wordWrap: wrapStyle(110 * s) })
      .setOrigin(0.5);
    const w = text.width + 12 * s;
    const h = text.height + 8 * s;
    const g = this.scene.add.graphics();
    g.fillStyle(0xffffff, 1).lineStyle(Math.max(2, s * 0.75), 0x5d4037, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 4 * s).strokeRoundedRect(-w / 2, -h / 2, w, h, 4 * s);
    // Punta abajo a la izquierda: el globo va a la derecha de la tendera.
    g.fillTriangle(-w / 2 + 6 * s, h / 2 - 1, -w / 2 + 14 * s, h / 2 - 1, -w / 2 + 2 * s, h / 2 + 6 * s);
    // A la derecha de la tendera, a la altura de su cabeza, y siempre por debajo del contador de monedas (arriba a
    // la izquierda) para no taparlo.
    const x = Math.min(this.scene.scale.width - w / 2 - 8, this.feet.x + 10 * s + w / 2);
    const y = Math.max(h / 2 + COIN_CLEAR_Y, this.feet.y - this.sprite.displayHeight - 2 * s - h / 2);
    const bubble = this.scene.add.container(x, y, [g, text]).setDepth(2000).setScale(0);
    this.bubble = bubble;
    this.current = message;
    this.scene.tweens.add({ targets: bubble, scale: 1, duration: 220, ease: 'Back.Out' });
    this.scene.time.delayedCall(ms, () => {
      if (this.bubble === bubble) this.hideBubble();
    });
  }

  hideBubble(): void {
    this.bubble?.destroy();
    this.bubble = null;
    this.current = null;
  }
}
