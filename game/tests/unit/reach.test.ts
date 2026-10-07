import { describe, expect, it } from 'vitest';
import { addPlay, emptyReach, markEver, markReach, markStep, parseReach, seedSteps } from '../../src/core/reach';

const MON = '2026-10-05';
const TUE = '2026-10-06';
const NEXT_MON = '2026-10-12';

describe('alcance', () => {
  it('la primera vez cuenta para hoy, la semana y la vida', () => {
    expect(markReach(emptyReach(MON), 'animal', 'cabra/gordi', MON).scopes).toEqual(['dia', 'semana', 'vida']);
  });

  it('la segunda vez del mismo día no cuenta', () => {
    const once = markReach(emptyReach(MON), 'animal', 'cabra/gordi', MON).state;
    const again = markReach(once, 'animal', 'cabra/gordi', MON);
    expect(again.scopes).toEqual([]);
    expect(again.state).toBe(once);
  });

  it('al día siguiente de la misma semana solo cuenta para el día', () => {
    const once = markReach(emptyReach(MON), 'animal', 'cabra/gordi', MON).state;
    expect(markReach(once, 'animal', 'cabra/gordi', TUE).scopes).toEqual(['dia']);
  });

  it('el lunes siguiente cuenta para el día y la semana, no para la vida', () => {
    const once = markReach(emptyReach(MON), 'animal', 'cabra/gordi', MON).state;
    expect(markReach(once, 'animal', 'cabra/gordi', NEXT_MON).scopes).toEqual(['dia', 'semana']);
  });

  it('el mismo id en otro tipo es otra cosa', () => {
    const once = markReach(emptyReach(MON), 'recinto', 'cabra', MON).state;
    expect(markReach(once, 'pantalla', 'cabra', MON).scopes).toEqual(['dia', 'semana', 'vida']);
  });

  it('con el reloj hacia atrás no se vacía nada', () => {
    const once = markReach(emptyReach(TUE), 'comida', 'pan', TUE).state;
    expect(markReach(once, 'comida', 'pan', MON).scopes).toEqual([]);
  });
});

describe('una vez en la vida', () => {
  it('markEver avisa solo la primera vez', () => {
    const first = markEver(emptyReach(MON), 'especial:cabra/conejo');
    expect(first.first).toBe(true);
    expect(markEver(first.state, 'especial:cabra/conejo').first).toBe(false);
  });

  it('un paso del embudo se da una sola vez', () => {
    const first = markStep(emptyReach(MON), 'primera-comida');
    expect(first.first).toBe(true);
    expect(markStep(first.state, 'primera-comida').first).toBe(false);
  });

  it('los pasos sembrados ya no avisan', () => {
    const seeded = seedSteps(emptyReach(MON), ['tienda-abierta', 'primera-compra']);
    expect(markStep(seeded, 'tienda-abierta').first).toBe(false);
    expect(markStep(seeded, 'primer-libro').first).toBe(true);
  });

  it('acumula el tiempo de juego', () => {
    expect(addPlay(addPlay(emptyReach(MON), 90), 30).playSeconds).toBe(120);
  });

  it('un tiempo que no es un número no estropea lo guardado', () => {
    const state = addPlay(emptyReach(MON), 90);
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      const next = addPlay(state, bad);
      expect(next.playSeconds).toBe(90);
      expect(parseReach(JSON.stringify(next))).toEqual(next);
    }
  });
});

describe('guardado', () => {
  it('se lee lo que se guarda', () => {
    const state = markReach(emptyReach(MON), 'animal', 'cabra/gordi', MON).state;
    expect(parseReach(JSON.stringify(state))).toEqual(state);
  });

  it.each([null, '', 'no es json', '[]', '{"day":"ayer"}', '{"day":"2026-10-05","week":"1","today":[1]}'])(
    'un valor ilegible (%s) es «sin estado»', (raw) => expect(parseReach(raw)).toBeNull());
});
