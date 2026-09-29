import * as Phaser from 'phaser';

/** Capa "gira el móvil" (solo web; en Android la orientación está bloqueada): un móvil que gira, sin texto. */
export class RotateScene extends Phaser.Scene {
  constructor() {
    super('Rotate');
  }

  create(): void {
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x1d2b1f, 1).setOrigin(0).setInteractive();
    const phoneH = Math.min(width, height) * 0.4;
    const phoneW = phoneH * 0.55;
    const phone = this.add.container(width / 2, height / 2);
    phone.add(this.add.rectangle(0, 0, phoneW, phoneH, 0x263238).setStrokeStyle(6, 0xffd54a));
    phone.add(this.add.rectangle(0, 0, phoneW * 0.8, phoneH * 0.75, 0x5fa84a));
    phone.add(this.add.circle(0, phoneH * 0.43, phoneW * 0.06, 0xffd54a));
    phone.add(this.add.text(0, 0, '🦁', { fontSize: `${Math.round(phoneW * 0.4)}px` }).setOrigin(0.5));
    this.add.text(width / 2 + phoneH * 0.55, height / 2 - phoneH * 0.55, '↻', { fontSize: `${Math.round(phoneH * 0.35)}px`, color: '#ffd54a' }).setOrigin(0.5);
    // Vertical → horizontal, en bucle.
    this.tweens.add({ targets: phone, angle: -90, duration: 900, hold: 700, repeatDelay: 500, ease: 'Cubic.easeInOut', repeat: -1 });
  }
}
