import { describe, expect, it } from 'vitest';
import {
  MAX_SICK,
  MUD_PENS,
  careReward,
  clean,
  cure,
  emptyCare,
  fallSick,
  isDirty,
  isMudPen,
  isSick,
  makeMuddy,
  randomDelay,
  sanitizeCare,
  sickCandidates,
  soil,
  type CareState,
} from '../../src/core/care';
import { initialState, type GameState } from '../../src/core/economy';

const care = (c: Partial<CareState>): CareState => ({ ...emptyCare(), ...c });
/** Partida con los recintos de barro abiertos y llenos, y la clínica según `clinic`. */
const game = (clinic: boolean, counts: Partial<GameState['counts']> = {}): GameState => ({
  ...initialState(),
  clinic,
  counts: { ...initialState().counts, cerdos: 5, 'elefantes-africanos': 2, 'elefantes-asiaticos': 2, ...counts },
});

describe('cuidados: charcos', () => {
  it('los recintos con charco son los cerdos y los dos de elefantes', () => {
    expect([...MUD_PENS]).toEqual(['cerdos', 'elefantes-africanos', 'elefantes-asiaticos']);
    expect(isMudPen('cerdos')).toBe(true);
    expect(isMudPen('ovejas')).toBe(false);
  });

  it('makeMuddy pone de barro solo ese charco y repetirlo no cambia nada', () => {
    const once = makeMuddy(emptyCare(), 'cerdos');
    expect(once.muddy).toEqual(['cerdos']);
    expect(makeMuddy(once, 'cerdos')).toBe(once);
    expect(once.dirty).toEqual([]);
  });
});

describe('cuidados: ensuciarse y limpiar', () => {
  it('soil ensucia si el charco de su recinto es de barro', () => {
    const next = soil(care({ muddy: ['cerdos'] }), 'cerdos', 'rosita');
    expect(isDirty(next, 'rosita')).toBe(true);
  });

  it('soil no hace nada con el charco limpio, si ya está sucio, si está enfermo o si no es de ese recinto', () => {
    const clear = care({});
    expect(soil(clear, 'cerdos', 'rosita')).toBe(clear);
    const dirty = care({ muddy: ['cerdos'], dirty: ['rosita'] });
    expect(soil(dirty, 'cerdos', 'rosita')).toBe(dirty);
    const sick = care({ muddy: ['cerdos'], sick: ['rosita'] });
    expect(soil(sick, 'cerdos', 'rosita')).toBe(sick);
    const other = care({ muddy: ['cerdos'] });
    expect(soil(other, 'cerdos', 'tembo')).toBe(other);
  });

  it('clean quita al último sucio del recinto y el charco vuelve a agua', () => {
    const next = clean(care({ muddy: ['cerdos', 'elefantes-africanos'], dirty: ['rosita', 'tembo'] }), 'cerdos', 'rosita');
    expect(next.dirty).toEqual(['tembo']);
    expect(next.muddy).toEqual(['elefantes-africanos']);
  });

  it('clean con más sucios en el recinto deja el charco de barro', () => {
    const next = clean(care({ muddy: ['cerdos'], dirty: ['rosita', 'trufa'] }), 'cerdos', 'rosita');
    expect(next.dirty).toEqual(['trufa']);
    expect(next.muddy).toEqual(['cerdos']);
  });
});

describe('cuidados: enfermar y curar', () => {
  it('sin clínica no hay candidatos', () => {
    expect(sickCandidates(emptyCare(), game(false))).toEqual([]);
  });

  it('con la clínica, los candidatos son los animales que ya han llegado a recintos abiertos', () => {
    const state = game(true, { cerdos: 2, 'elefantes-africanos': 0 });
    const ids = sickCandidates(emptyCare(), state);
    expect(ids).toContain('rosita');
    expect(ids).toContain('morrito');
    expect(ids).not.toContain('trufa');
    expect(ids).not.toContain('tembo');
    expect(ids).toContain('bills');
    expect(ids).not.toContain('sasha');
  });

  it('nunca dos enfermos en el mismo recinto: los dos elefantes no se ponen malos a la vez', () => {
    const ids = sickCandidates(care({ sick: ['tembo'] }), game(true));
    expect(ids).not.toContain('kali');
    expect(ids).not.toContain('tembo');
    expect(ids).toContain('raja');
  });

  it('con dos enfermos ya no hay más candidatos', () => {
    expect(MAX_SICK).toBe(2);
    expect(sickCandidates(care({ sick: ['tembo', 'rosita'] }), game(true))).toEqual([]);
  });

  it('un enfermo deja de estar sucio, y curarlo lo quita de la lista', () => {
    const sick = fallSick(care({ muddy: ['cerdos'], dirty: ['rosita'] }), 'rosita');
    expect(isSick(sick, 'rosita')).toBe(true);
    expect(isDirty(sick, 'rosita')).toBe(false);
    expect(isSick(cure(sick, 'rosita'), 'rosita')).toBe(false);
  });
});

describe('cuidados: azar y premio', () => {
  it('randomDelay va de min a max', () => {
    expect(randomDelay({ min: 100, max: 200 }, () => 0)).toBe(100);
    const high = randomDelay({ min: 100, max: 200 }, () => 0.999);
    expect(high).toBeGreaterThan(100);
    expect(high).toBeLessThanOrEqual(200);
  });

  it('limpiar y curar pagan lo mismo que darle de comer', () => {
    expect(careReward('elefante-africano')).toBe(10);
    expect(careReward('cerdo')).toBe(4);
  });
});

describe('cuidados: partidas guardadas', () => {
  const counts = game(true).counts;

  it('con basura devuelve el estado vacío', () => {
    for (const raw of [null, 3, 'hola', [], undefined]) expect(sanitizeCare(raw, counts)).toEqual(emptyCare());
  });

  it('conserva un estado válido', () => {
    const ok = care({ dirty: ['rosita'], sick: ['tembo'], muddy: ['cerdos'] });
    expect(sanitizeCare(JSON.parse(JSON.stringify(ok)), counts)).toEqual(ok);
  });

  it('descarta ids desconocidos, recintos sin abrir, duplicados y charcos que no son de barro', () => {
    const raw = { dirty: ['rosita', 'rosita', 'nadie', 7, 'tembo'], sick: [], muddy: ['cerdos', 'cerdos', 'ovejas', 'elefantes-africanos'] };
    const closed = { ...counts, 'elefantes-africanos': 0 };
    expect(sanitizeCare(raw, closed)).toEqual(care({ dirty: ['rosita'], muddy: ['cerdos'] }));
  });

  it('descarta animales que aún no han llegado y sucios de recintos sin charco', () => {
    const raw = { dirty: ['churro', 'lana'], sick: [], muddy: [] };
    expect(sanitizeCare(raw, { ...counts, cerdos: 2, ovejas: 5 })).toEqual(emptyCare());
  });

  it('como mucho dos enfermos, de recintos distintos (se queda con el primero), y los enfermos no están sucios', () => {
    const raw = { dirty: ['rosita'], sick: ['tembo', 'kali', 'rosita', 'raja'], muddy: ['cerdos'] };
    expect(sanitizeCare(raw, counts)).toEqual(care({ dirty: [], sick: ['tembo', 'rosita'], muddy: ['cerdos'] }));
  });
});
