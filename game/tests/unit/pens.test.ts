import { describe, expect, it } from 'vitest';
import { ANIMAL_IDS, ANIMALS } from '../../src/data/animals';
import { BOOK_PAGES } from '../../src/data/book';
import { PEN_IDS, PENS, allLooks, findResident, isPenId, nextResident, penCapacity, residentsIn } from '../../src/data/pens';
import { STRINGS_ES } from '../../src/data/strings';

describe('recintos', () => {
  it('son los 4 de siempre, con los mismos ids que el guardado, y los 7 nuevos en el orden de la tienda', () => {
    expect([...PEN_IDS]).toEqual([
      'leon', 'cabra', 'pantera', 'panda',
      'estanque', 'ovejas', 'establo', 'pinguinos', 'sabana', 'elefantes-africanos', 'elefantes-asiaticos',
    ]);
  });

  it('cabe en cada recinto lo que dice el diseño', () => {
    expect(PEN_IDS.map(penCapacity)).toEqual([1, 5, 2, 2, 5, 5, 8, 5, 8, 2, 2]);
  });

  it('león y cabra vienen de inicio; el resto se compra, cada vez más caro', () => {
    expect(PEN_IDS.map((id) => PENS[id].cost)).toEqual([undefined, undefined, 50, 100, 150, 250, 400, 600, 900, 1300, 1600]);
  });

  it('cada residente tiene id único, especie conocida y nombre', () => {
    const ids = PEN_IDS.flatMap((id) => PENS[id].residents.map((r) => r.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(45);
    for (const penId of PEN_IDS) {
      for (const r of PENS[penId].residents) {
        expect(ANIMALS[r.species], r.id).toBeDefined();
        expect(STRINGS_ES[`book.page.${r.id}.title` as keyof typeof STRINGS_ES], r.id).toBeTruthy();
      }
    }
  });

  // Las 35 páginas de los animales nuevos llegan con el plan 4 (tienda y libro).
  it('los animales de los cuatro recintos de siempre tienen página en el libro', () => {
    for (const penId of ['leon', 'cabra', 'pantera', 'panda'] as const) {
      for (const r of PENS[penId].residents) expect(BOOK_PAGES.some((p) => p.id === r.id), r.id).toBe(true);
    }
  });

  it('cada recinto nuevo empieza con el animal que dice el diseño', () => {
    const first = (id: (typeof PEN_IDS)[number]) => PENS[id].residents[0]!.species;
    expect((['estanque', 'ovejas', 'establo', 'pinguinos', 'sabana', 'elefantes-africanos', 'elefantes-asiaticos'] as const).map(first)).toEqual([
      'pato', 'oveja', 'caballo', 'pinguino', 'jirafa', 'elefante-africano', 'elefante-asiatico',
    ]);
  });

  it('los recintos mixtos tienen las especies y cantidades del diseño', () => {
    const tally = (id: (typeof PEN_IDS)[number]) => {
      const count: Record<string, number> = {};
      for (const r of PENS[id].residents) count[r.species] = (count[r.species] ?? 0) + 1;
      return count;
    };
    expect(tally('sabana')).toEqual({ jirafa: 2, cebra: 2, gacela: 4 });
    expect(tally('establo')).toEqual({ caballo: 4, gallina: 3, gallo: 1 });
  });

  it('dentro de un recinto no hay dos animales con el mismo aspecto', () => {
    // Las dos panteras y los dos pandas comparten hoja: son los dibujos de los niños.
    for (const penId of PEN_IDS.filter((id) => id !== 'pantera' && id !== 'panda')) {
      const looks = PENS[penId].residents.map((r) => r.look);
      expect(new Set(looks).size, penId).toBe(looks.length);
    }
  });

  it('cada recinto tiene nombre', () => {
    for (const penId of PEN_IDS) expect(STRINGS_ES[PENS[penId].nameKey], penId).toBeTruthy();
  });

  it('solo en el recinto de ovejas entran los visitantes', () => {
    expect(PEN_IDS.filter((id) => PENS[id].visitors)).toEqual(['ovejas']);
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
    for (const species of ANIMAL_IDS) expect(looks).toContain(species);
    for (const penId of PEN_IDS) for (const r of PENS[penId].residents) expect(looks).toContain(r.look);
  });

  it('las cinco cabras tienen cada una su aspecto', () => {
    const looks = PENS.cabra.residents.map((r) => r.look);
    expect(looks).toEqual(['cabra-gordi', 'cabra', 'cabra-galleta', 'cabra-tolon', 'cabra-chispa']);
  });
});
