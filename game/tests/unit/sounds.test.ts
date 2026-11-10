import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MEDICINES } from '../../src/core/care';
import { CLEAN_STEPS } from '../../src/core/cleaning';
import { CARE_SOUND_IDS, RUB_SOUND_GAP_MS, eatSound, medicineSound, toolSound } from '../../src/core/sounds';
import { FOOD_IDS } from '../../src/data/foods';
import { SOUND_IDS, soundFile } from '../../src/systems/audio';

describe('sonidos de comer, limpiar y curar', () => {
  it('lo crujiente cruje y lo blando se traga', () => {
    for (const food of ['zanahoria', 'lechuga', 'maiz', 'manzana'] as const) expect(eatSound(food)).toBe('comer-crujiente');
    for (const food of ['carne', 'pescado', 'pan', 'huevo', 'platano'] as const) expect(eatSound(food)).toBe('comer-blanda');
  });

  it('toda comida tiene su sonido', () => {
    for (const food of FOOD_IDS) expect(SOUND_IDS).toContain(eatSound(food));
  });

  it('cada herramienta suena al frotar, menos el cepillo, que aún no tiene sonido elegido', () => {
    expect(toolSound('cacahuete')).toBe('limpiar-cacahuete');
    expect(toolSound('jabon')).toBe('limpiar-jabon');
    expect(toolSound('agua')).toBe('limpiar-agua');
    expect(toolSound('toalla')).toBe('limpiar-toalla');
    expect(toolSound('cepillo')).toBeNull();
    for (const step of CLEAN_STEPS) {
      const id = toolSound(step);
      if (id) expect(RUB_SOUND_GAP_MS[step]).toBeGreaterThanOrEqual(100);
    }
  });

  it('cada medicina suena distinto', () => {
    const ids = MEDICINES.map(medicineSound);
    expect(new Set(ids).size).toBe(MEDICINES.length);
    expect(medicineSound('vendaje')).toBe('curar-vendaje');
    for (const id of ids) expect(SOUND_IDS).toContain(id);
  });

  it('los sonidos nuevos son wav con su nombre', () => {
    for (const id of CARE_SOUND_IDS) {
      expect(SOUND_IDS).toContain(id);
      expect(soundFile(id)).toBe(`audio/${id}.wav`);
    }
    expect(SOUND_IDS).toContain('barro');
    expect(SOUND_IDS).toContain('malito');
    // Los de antes no cambian.
    expect(soundFile('come')).toBe('audio/come.ogg');
    expect(soundFile('campanita')).toBe('audio/campanita.wav');
  });

  it('existe el archivo de cada sonido (si falta, el juego da un error al cargar)', () => {
    for (const id of SOUND_IDS) expect(existsSync(resolve(__dirname, '../../public', soundFile(id))), soundFile(id)).toBe(true);
  });
});
