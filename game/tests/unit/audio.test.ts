import { describe, expect, it, vi } from 'vitest';
import { defaultSettings, type Settings } from '../../src/core/save';
import { AudioSystem, MUSIC_KEY, SOUND_IDS, soundFile, soundKey, type SoundBackend } from '../../src/systems/audio';

function fakeBackend(loaded: string[]) {
  const music = {
    isPlaying: false,
    isPaused: false,
    play: vi.fn(() => { music.isPlaying = true; }),
    pause: vi.fn(() => { music.isPlaying = false; music.isPaused = true; }),
    resume: vi.fn(() => { music.isPlaying = true; music.isPaused = false; }),
  };
  const backend: SoundBackend = {
    has: (key) => loaded.includes(key),
    play: vi.fn(),
    loop: () => music,
  };
  return { backend, music };
}

function setup(settings: Partial<Settings> = {}, loaded = [soundKey('coin'), MUSIC_KEY]) {
  const current = { ...defaultSettings(), ...settings };
  const audio = new AudioSystem(() => current);
  const fake = fakeBackend(loaded);
  audio.attach(fake.backend);
  return { audio, current, ...fake };
}

describe('AudioSystem', () => {
  it('reproduce un efecto cargado', () => {
    const { audio, backend } = setup();
    audio.play('coin');
    expect(backend.play).toHaveBeenCalledWith(soundKey('coin'), expect.any(Number));
  });

  it('un audio que no cargó no suena ni falla', () => {
    const { audio, backend } = setup();
    expect(() => audio.play('buy')).not.toThrow();
    expect(backend.play).not.toHaveBeenCalled();
  });

  it('con el sonido apagado no reproduce efectos', () => {
    const { audio, backend } = setup({ sfx: false });
    audio.play('coin');
    expect(backend.play).not.toHaveBeenCalled();
  });

  it('sin backend (antes de cargar) no falla', () => {
    expect(() => new AudioSystem(() => null).play('tap')).not.toThrow();
  });

  it('la música empieza tras el primer toque, no antes', () => {
    const { audio, music } = setup();
    expect(music.isPlaying).toBe(false);
    audio.unlock();
    expect(music.isPlaying).toBe(true);
  });

  it('se para con la pausa y con 🎵 apagado, y vuelve después', () => {
    const { audio, music, current } = setup();
    audio.unlock();
    audio.setPaused('background', true);
    expect(music.isPlaying).toBe(false);
    audio.setPaused('background', false);
    expect(music.isPlaying).toBe(true);
    current.music = false;
    audio.syncMusic();
    expect(music.isPlaying).toBe(false);
  });

  it('sin música cargada no falla', () => {
    const { audio } = setup({}, []);
    expect(() => audio.unlock()).not.toThrow();
  });
});
describe('sonidos', () => {
  it('la campanita y el paso son wav propios; el resto ogg', () => {
    expect(SOUND_IDS).toContain('campanita');
    expect(soundFile('campanita')).toBe('audio/campanita.wav');
    expect(soundFile('paso')).toBe('audio/paso.wav');
    expect(soundFile('buy')).toBe('audio/buy.ogg');
  });
});
