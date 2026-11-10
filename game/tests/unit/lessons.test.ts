import { describe, expect, it } from 'vitest';
import { emptyCare, type CareState } from '../../src/core/care';
import { initialState, type GameState } from '../../src/core/economy';
import { cleanPractice, menuLessons, pendingLessonOffers, sickPractice } from '../../src/core/lessons';
import type { TutorialProgress } from '../../src/core/save';
import { findResident, residentsIn } from '../../src/data/pens';

const care = (c: Partial<CareState>): CareState => ({ ...emptyCare(), ...c });
const game = (counts: Partial<GameState['counts']> = {}, clinic = false): GameState => ({
  ...initialState(),
  clinic,
  counts: { ...initialState().counts, ...counts },
});
const progress = (p: Partial<TutorialProgress> = {}): TutorialProgress => ({ offered: true, cleanOffered: false, clinicOffered: false, ...p });
const penOf = (id: string) => findResident(id)?.penId;

describe('lecciones: qué avisos tocan', () => {
  it('sin recintos de barro ni clínica, ninguno', () => {
    expect(pendingLessonOffers(game(), progress())).toEqual([]);
  });

  it('con elefantes asiáticos abiertos, el de la limpieza', () => {
    expect(pendingLessonOffers(game({ 'elefantes-asiaticos': 1 }), progress())).toEqual(['limpieza']);
  });

  it('con barro y clínica, primero la limpieza y luego la clínica', () => {
    expect(pendingLessonOffers(game({ 'elefantes-asiaticos': 1 }, true), progress())).toEqual(['limpieza', 'clinica']);
  });

  it('si el de la limpieza ya salió, solo la clínica', () => {
    expect(pendingLessonOffers(game({ 'elefantes-asiaticos': 1 }, true), progress({ cleanOffered: true }))).toEqual(['clinica']);
  });
});

describe('lecciones: botón Aprender del menú', () => {
  it('zoo de inicio: solo la de inicio', () => {
    expect(menuLessons(game())).toEqual(['inicio']);
  });

  it('con cerdos y clínica: las tres seguidas', () => {
    expect(menuLessons(game({ cerdos: 2 }, true))).toEqual(['inicio', 'limpieza', 'clinica']);
  });
});

describe('lecciones: con qué animal se practica la limpieza', () => {
  it('solo elefantes asiáticos: ensucia a un elefante asiático', () => {
    const result = cleanPractice(emptyCare(), game({ 'elefantes-asiaticos': 2 }))!;
    expect(result.target.penId).toBe('elefantes-asiaticos');
    expect(result.target.already).toBe(false);
    expect(penOf(result.target.residentId)).toBe('elefantes-asiaticos');
    expect(result.care.muddy).toContain('elefantes-asiaticos');
    expect(result.care.dirty).toContain(result.target.residentId);
  });

  it('si ya hay uno sucio, usa ese y no toca nada', () => {
    const pig = residentsIn('cerdos', 2)[1]!.id;
    const before = care({ dirty: [pig], muddy: ['cerdos'] });
    const result = cleanPractice(before, game({ cerdos: 2, 'elefantes-asiaticos': 2 }))!;
    expect(result.target).toEqual({ residentId: pig, penId: 'cerdos', already: true });
    expect(result.care).toBe(before);
  });

  it('si el primero está malito, elige otro', () => {
    const [first] = residentsIn('cerdos', 2);
    const result = cleanPractice(care({ sick: [first!.id] }), game({ cerdos: 2 }))!;
    expect(result.target.residentId).not.toBe(first!.id);
    expect(result.care.sick).toEqual([first!.id]);
    expect(result.care.dirty).toEqual([result.target.residentId]);
  });

  it('si el único de un recinto está malito, va al siguiente recinto abierto', () => {
    const [pig] = residentsIn('cerdos', 1);
    const result = cleanPractice(care({ sick: [pig!.id] }), game({ cerdos: 1, 'elefantes-africanos': 1 }))!;
    expect(result.target.penId).toBe('elefantes-africanos');
  });

  it('sin recintos de barro abiertos, no hay lección', () => {
    expect(cleanPractice(emptyCare(), game())).toBeNull();
  });
});

describe('lecciones: con qué animal se practica la clínica', () => {
  it('ya hay 2 enfermos: usa uno de ellos y no enferma a un tercero', () => {
    const sick = [residentsIn('cerdos', 1)[0]!.id, residentsIn('elefantes-asiaticos', 1)[0]!.id];
    const before = care({ sick });
    const result = sickPractice(before, game({ cerdos: 1, 'elefantes-asiaticos': 1 }, true))!;
    expect(result.target.already).toBe(true);
    expect(sick).toContain(result.target.residentId);
    expect(result.care.sick).toHaveLength(2);
  });

  it('sin enfermos: enferma a uno', () => {
    const result = sickPractice(emptyCare(), game({}, true))!;
    expect(result.target.already).toBe(false);
    expect(result.care.sick).toEqual([result.target.residentId]);
    expect(result.target.penId).toBe(penOf(result.target.residentId));
  });

  it('sin clínica no hay a quién enfermar', () => {
    expect(sickPractice(emptyCare(), game())).toBeNull();
  });
});
