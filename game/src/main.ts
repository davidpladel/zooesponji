import * as Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { FeedScene } from './scenes/FeedScene';
import { HudScene } from './scenes/HudScene';
import { PreloadScene } from './scenes/PreloadScene';
import { QuitScene } from './scenes/QuitScene';
import { RotateScene } from './scenes/RotateScene';
import { SettingsScene } from './scenes/SettingsScene';
import { ShopScene } from './scenes/ShopScene';
import { TitleScene } from './scenes/TitleScene';
import { WorldScene } from './scenes/WorldScene';
import { installErrorHandlers } from './systems/errors';
import { Platform } from './systems/platform';
import { installTestHooks } from './systems/testHooks';

installErrorHandlers();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#1d2b1f',
  pixelArt: true,
  roundPixels: true,
  scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
  // El orden importa: Hud se dibuja encima de Feed/Shop; ajustes, salir y girar, encima de todo.
  scene: [BootScene, PreloadScene, TitleScene, WorldScene, FeedScene, ShopScene, HudScene, SettingsScene, QuitScene, RotateScene],
});

const platform = new Platform(game);
platform.install();
installTestHooks(game, platform);
