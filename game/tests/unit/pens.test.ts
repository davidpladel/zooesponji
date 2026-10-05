import { describe, expect, it } from 'vitest';
import { ANIMALS } from '../../src/data/animals';
import { BOOK_PAGES } from '../../src/data/book';
import { PEN_IDS, PENS, allLooks, findResident, isPenId, nextResident, penCapacity, residentsIn } from '../../src/data/pens';
import { STRINGS_ES } from '../../src/data/strings';

describe('recintos', () => {
  it('son los 4 actuales, con los mismos ids que el guardado', () => {
    expect([...PEN_IDS]).toEqual(['leon', 'cabra', 'pantera', 'panda']);
  });

  it('caben los mismos animales que antes', () => {
    expect(PEN_IDS.map(penCapacity)).toEqual([1, 5, 2, 2]);
  });

  it('león y cabra vienen de inicio; pantera y panda se compran', () => {
    expect(PENS.leon.cost).toBeUndefined();
    expect(PENS.cabra.cost).toBeUndefined();
    expect(PENS.pantera.cost).toBe(50);
    expect(PENS.panda.cost).toBe(100);
  });

  it('cada residente tiene id único, especie conocida y página del libro', () => {
    const ids = PEN_IDS.flatMap((id) => PENS[id].residents.map((r) => r.id));
    expect(new Set(ids).size).toBe(ids.length);
    for (const penId of PEN_IDS) {
      for (const r of PENS[penId].residents) {
        expect(ANIMALS[r.species]).toBeDefined();
        expect(BOOK_PAGES.some((p) => p.id === r.id)).toBe(true);
        expect(STRINGS_ES[`book.page.${r.id}.title` as keyof typeof STRINGS_ES]).toBeTruthy();
      }
    }
  });

  it('residentsIn da los que han llegado, en orden', () => {
    expect(residentsIn('cabra', 2).map((r) => r.id)).toEqual(['gordi', 'nube']);
    expect(residentsIn('cabra', 0)).toEqual([]);
    expect(residentsIn('cabra', 99)).toHaveLength(5);
  });

  it('nextResident da el siguiente o null si está lleno', () => {
    expect(nextResident('cabra', 1)?.id).toBe('nube');
    expect(nextResident('cabra', 5)).toBeNull();
    expect(nextResident('leon', 1)).toBeNull();
  });

  it('findResident localiza recinto y posición', () => {
    expect(findResident('sombra')).toEqual({ penId: 'pantera', index: 1, resident: PENS.pantera.residents[1] });
    expect(findResident('nadie')).toBeNull();
  });

  it('isPenId distingue ids válidos', () => {
    expect(isPenId('panda')).toBe(true);
    expect(isPenId('tigre')).toBe(false);
  });

  it('allLooks: un aspecto por especie más los de cada residente, sin repetir', () => {
    const looks = allLooks();
    expect(new Set(looks).size).toBe(looks.length);
    for (const species of ['leon', 'cabra', 'pantera', 'panda']) expect(looks).toContain(species);
    for (const penId of PEN_IDS) for (const r of PENS[penId].residents) expect(looks).toContain(r.look);
  });
});
