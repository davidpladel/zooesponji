import * as Phaser from 'phaser';
import { t } from '../data/strings';
import { sfx } from '../systems/audio';
import { textStyle } from '../ui/theme';
import { addTitleBackdrop } from '../ui/titleBackdrop';
import { addHeartLine, addPillButton, restartOnResize } from '../ui/widgets';

export class TitleScene extends Phaser.Scene {
  private started = false;

  constructor() {
    super('Title');
  }

  init(): void {
    this.started = false;
  }

  /** Texto del botón de jugar (para pruebas). */
  playLabel(): string {
    return t('title.play');
  }

  create(): void {
    const { width, height } = this.scale;
    const layout = addTitleBackdrop(this);

    // El botón va dentro de un contenedor que late; así el latido no pelea con el efecto al pulsar.
    const pulse = this.add.container(width / 2, layout.buttonY).setScale(0.8);
    pulse.add(addPillButton(this, 0, 0, layout.buttonW, layout.buttonH, { color: 'yellow', icon: 'play', label: t('title.play'), onTap: () => this.play() }));
    this.tweens.add({
      targets: pulse,
      scale: 1,
      duration: 200,
      ease: 'Back.easeOut',
      onComplete: () => this.tweens.add({ targets: pulse, scale: 1.04, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' }),
    });

    const creditSize = Math.round(Math.max(16, height * 0.05));
    addHeartLine(this, width / 2, height * 0.89, t('title.credits'), textStyle(creditSize, '#ffffff', '#5a3210'));
    const copySize = Math.round(Math.max(11, height * 0.032));
    this.add
      .text(width / 2, height * 0.89 + creditSize * 1.05, t('credits.copyright'), { ...textStyle(copySize, '#ffffff', '#5a3210'), fontFamily: 'sans-serif', fontStyle: 'normal' })
      .setOrigin(0.5);
    restartOnResize(this);
  }

  private play(): void {
    if (this.started) return;
    this.started = true;
    sfx.unlock();
    this.scene.start('World');
    this.scene.launch('Hud');
  }
}
