import type * as Phaser from 'phaser';
import type { Settings } from '../core/save';
import { withVersion } from '../core/cacheBust';
import { getSession } from './session';

export type SoundId = 'come' | 'rechaza' | 'especial' | 'coin' | 'buy' | 'unlock' | 'tap' | 'campanita' | 'paso';
export const SOUND_IDS: readonly SoundId[] = ['come', 'rechaza', 'especial', 'coin', 'buy', 'unlock', 'tap', 'campanita', 'paso'];

/** La campanita y el paso se sintetizan con scripts/make-*.mjs (wav); el resto son ogg de Kenney. */
export const soundFile = (id: SoundId): string => `audio/${id}.${id === 'campanita' || id === 'paso' ? 'wav' : 'ogg'}`;

export const soundKey = (id: SoundId): string => `sfx-${id}`;
export const MUSIC_KEY = 'music';

const SFX_VOLUME = 0.6;
const MUSIC_VOLUME = 0.25;

/** Motivos por los que la música se para: menú de ajustes, app en segundo plano, móvil en vertical. */
export type PauseReason = 'menu' | 'background' | 'rotate';

/** Lo mínimo del gestor de sonido de Phaser que usa el juego (se sustituye en los tests). */
export interface SoundBackend {
  has(key: string): boolean;
  play(key: string, volume: number): void;
  /** Bucle de música; null si no se pudo cargar. */
  loop(key: string, volume: number): { play(): void; pause(): void; resume(): void; readonly isPlaying: boolean; readonly isPaused: boolean } | null;
}

/** Samples CC0 (public/audio). Si un audio no cargó, simplemente no suena. */
export class AudioSystem {
  private backend: SoundBackend | null = null;
  private music: ReturnType<SoundBackend['loop']> = null;
  private unlocked = false;
  private readonly paused = new Set<PauseReason>();

  constructor(private readonly settings: () => Settings | null) {}

  attach(backend: SoundBackend): void {
    this.backend = backend;
    this.music = backend.has(MUSIC_KEY) ? backend.loop(MUSIC_KEY, MUSIC_VOLUME) : null;
    this.syncMusic();
  }

  /** Llamar tras el primer toque del jugador: los navegadores bloquean el audio hasta entonces. */
  unlock(): void {
    this.unlocked = true;
    this.syncMusic();
  }

  play(id: SoundId): void {
    if (this.settings()?.sfx === false || !this.backend) return;
    const key = soundKey(id);
    try {
      if (this.backend.has(key)) this.backend.play(key, SFX_VOLUME);
    } catch {
      // Un audio roto nunca debe romper el juego.
    }
  }

  setPaused(reason: PauseReason, paused: boolean): void {
    if (paused) this.paused.add(reason);
    else this.paused.delete(reason);
    this.syncMusic();
  }

  /** Pone o quita la música según el ajuste 🎵, las pausas y el desbloqueo del audio. */
  syncMusic(): void {
    const music = this.music;
    if (!music) return;
    const wanted = this.unlocked && this.settings()?.music !== false && this.paused.size === 0;
    try {
      if (wanted && !music.isPlaying) {
        if (music.isPaused) music.resume();
        else music.play();
      } else if (!wanted && music.isPlaying) {
        music.pause();
      }
    } catch {
      // Igual que con los efectos: sin música antes que un error.
    }
  }
}

export const sfx = new AudioSystem(() => {
  try {
    return getSession().settings;
  } catch {
    return null;
  }
});

/** Encola los audios en el loader (ogg para efectos; música en ogg + mp3, Phaser elige). */
export function queueAudio(scene: Phaser.Scene): void {
  for (const id of SOUND_IDS) scene.load.audio(soundKey(id), [withVersion(soundFile(id))]);
  scene.load.audio(MUSIC_KEY, [withVersion('audio/music.ogg'), withVersion('audio/music.mp3')]);
}

export function phaserBackend(game: Phaser.Game): SoundBackend {
  return {
    has: (key) => game.cache.audio.exists(key),
    play: (key, volume) => {
      game.sound.play(key, { volume });
    },
    loop: (key, volume) => game.sound.add(key, { loop: true, volume }),
  };
}
