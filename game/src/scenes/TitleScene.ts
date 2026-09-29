import * as Phaser from 'phaser';
import { t } from '../data/strings';
import { sfx } from '../systems/audio';
import { restartOnResize } from './ui';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create(): void {
    const { width, height } = this.scale;
    this.add
      .text(width / 2, height * 0.3, t('title.name'), {
        fontFamily: 'sans-serif',
        fontSize: '56px',
        color: '#ffd54a',
        stroke: '#3b2a10',
        strokeThickness: 8,
      })
      .setOrigin(0.5);

    const play = this.add
      .text(width / 2, height * 0.62, `▶  ${t('title.play')}`, {
        fontFamily: 'sans-serif',
        fontSize: '40px',
        color: '#ffffff',
        backgroundColor: '#3e8e41',
        padding: { x: 36, y: 18 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(width / 2, height * 0.9, t('title.credits'), {
        fontFamily: 'sans-serif',
        fontSize: `${Math.round(Math.max(16, height * 0.04))}px`,
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setAlpha(0.85);
    this.add
      .text(width / 2, height * 0.9 + Math.max(16, height * 0.04) * 1.1, t('credits.copyright'), {
        fontFamily: 'sans-serif',
        fontSize: `${Math.round(Math.max(11, height * 0.028))}px`,
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setAlpha(0.6);
    restartOnResize(this);

    play.once('pointerup', () => {
      sfx.unlock();
      this.scene.start('World');
      this.scene.launch('Hud');
    });
  }
}
