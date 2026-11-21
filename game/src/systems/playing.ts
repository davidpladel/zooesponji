import type * as Phaser from 'phaser';

/** Tiempo de juego: el juego en pantalla y la partida empezada (ya se ha salido de la portada). */
export function playing(game: Phaser.Game): boolean {
  return !document.hidden && (game.scene.isActive('World') || game.scene.isPaused('World'));
}
