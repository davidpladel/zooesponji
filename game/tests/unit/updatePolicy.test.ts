import { describe, expect, it } from 'vitest';
import {
  afterLater, afterOffer, decideUpdate, emptyUpdateMemory, isSafeMoment, parseUpdateKey, parseUpdateMemory,
  type UpdateKey, type UpdateMemory,
} from '../../src/core/updatePolicy';

const small: UpdateKey = { minima: 10, ultima: 14, grande: false };
const big: UpdateKey = { minima: 10, ultima: 14, grande: true };
const mem = (p: Partial<UpdateMemory> = {}): UpdateMemory => ({ ...emptyUpdateMemory(), ultima: 14, ...p });
const TODAY = '2026-11-20';
const decide = (key: UpdateKey | null, memory: UpdateMemory, code = 12, today = TODAY) => decideUpdate({ code, key, memory, today });

describe('parseUpdateKey', () => {
  it('lee una clave válida y grande ausente es false', () => {
    expect(parseUpdateKey({ minima: 12, ultima: 14, grande: true })).toEqual({ minima: 12, ultima: 14, grande: true });
    expect(parseUpdateKey({ minima: 12, ultima: 14 })).toEqual({ minima: 12, ultima: 14, grande: false });
  });
  it('lo mal formado es null', () => {
    for (const bad of [null, undefined, 3, 'x', [], {}, { minima: 12 }, { ultima: 14 }, { minima: '12', ultima: 14 }, { minima: -1, ultima: 14 },
      { minima: 12, ultima: 1.5 }, { minima: 15, ultima: 14 }, { minima: 12, ultima: 14, grande: 1 }, { minima: NaN, ultima: 14 }]) {
      expect(parseUpdateKey(bad), JSON.stringify(bad)).toBeNull();
    }
  });
});

describe('decideUpdate', () => {
  it('al día: nada', () => {
    expect(decide(small, mem(), 14)).toEqual({ action: 'nada' });
    expect(decide(big, mem(), 15)).toEqual({ action: 'nada' });
  });
  it('pequeña: suave, una al día y tope de tres', () => {
    expect(decide(small, mem())).toEqual({ action: 'suave', kind: 'pequena' });
    expect(decide(small, mem({ ultimoAviso: TODAY, aplazadas: 1 }))).toEqual({ action: 'nada' });
    expect(decide(small, mem({ ultimoAviso: '2026-11-19', aplazadas: 2 }))).toEqual({ action: 'suave', kind: 'pequena' });
    expect(decide(small, mem({ ultimoAviso: '2026-11-19', aplazadas: 3 }))).toEqual({ action: 'nada' });
  });
  it('grande: dos suaves y la tercera obligatoria, como mucho una al día', () => {
    expect(decide(big, mem())).toEqual({ action: 'suave', kind: 'grande' });
    expect(decide(big, mem({ aplazadas: 1, ultimoAviso: '2026-11-19' }))).toEqual({ action: 'suave', kind: 'grande' });
    expect(decide(big, mem({ aplazadas: 2, ultimoAviso: '2026-11-19' }))).toEqual({ action: 'obligatoria', kind: 'grande' });
    expect(decide(big, mem({ aplazadas: 2, ultimoAviso: TODAY }))).toEqual({ action: 'nada' });
    expect(decide(big, mem({ aplazadas: 1, ultimoAviso: TODAY }))).toEqual({ action: 'nada' });
  });
  it('rota: obligatoria ya, aunque hoy ya haya avisado', () => {
    expect(decide(big, mem(), 9)).toEqual({ action: 'obligatoria', kind: 'rota' });
    expect(decide(small, mem({ ultimoAviso: TODAY, aplazadas: 3 }), 9)).toEqual({ action: 'obligatoria', kind: 'rota' });
  });
  it('lo aplazado de otra ultima empieza de cero (más vieja o más baja)', () => {
    expect(decide(big, mem({ ultima: 13, aplazadas: 2, ultimoAviso: '2026-11-01' }))).toEqual({ action: 'suave', kind: 'grande' });
    expect(decide(big, mem({ ultima: 20, aplazadas: 2, ultimoAviso: '2026-11-01' }))).toEqual({ action: 'suave', kind: 'grande' });
    // el aviso de hoy de otra ultima tampoco cuenta
    expect(decide(small, mem({ ultima: 13, ultimoAviso: TODAY }))).toEqual({ action: 'suave', kind: 'pequena' });
  });
  it('sin clave o con datos inválidos: nada', () => {
    expect(decide(null, mem())).toEqual({ action: 'nada' });
    expect(decide({ minima: 15, ultima: 14, grande: false }, mem(), 9)).toEqual({ action: 'nada' });
    expect(decide({ minima: -1, ultima: 14, grande: false }, mem())).toEqual({ action: 'nada' });
    expect(decide({ minima: 1, ultima: 14.5, grande: false }, mem())).toEqual({ action: 'nada' });
    expect(decide(small, mem(), Number.NaN)).toEqual({ action: 'nada' });
    expect(decide(small, mem(), 0)).toEqual({ action: 'nada' });
  });
  it('reloj atrás: la fecha de hoy anterior al último aviso no vuelve a avisar', () => {
    expect(decide(small, mem({ ultimoAviso: '2026-11-25' }))).toEqual({ action: 'nada' });
  });
});

describe('memoria', () => {
  it('afterOffer anota el día y reinicia si cambió la ultima', () => {
    expect(afterOffer(mem({ aplazadas: 1 }), small, TODAY)).toEqual({ ultima: 14, aplazadas: 1, ultimoAviso: TODAY });
    expect(afterOffer(mem({ ultima: 13, aplazadas: 2 }), small, TODAY)).toEqual({ ultima: 14, aplazadas: 0, ultimoAviso: TODAY });
  });
  it('afterLater suma una aplazada', () => {
    expect(afterLater(mem({ aplazadas: 1, ultimoAviso: TODAY }), small, TODAY)).toEqual({ ultima: 14, aplazadas: 2, ultimoAviso: TODAY });
    expect(afterLater(mem({ ultima: 9, aplazadas: 2 }), small, TODAY)).toEqual({ ultima: 14, aplazadas: 1, ultimoAviso: TODAY });
  });
  it('parseUpdateMemory: guardado viejo, vacío o roto da los valores por defecto sin lanzar', () => {
    expect(parseUpdateMemory(null)).toEqual(emptyUpdateMemory());
    expect(parseUpdateMemory('no es json')).toEqual(emptyUpdateMemory());
    expect(parseUpdateMemory('[1,2]')).toEqual(emptyUpdateMemory());
    expect(parseUpdateMemory(JSON.stringify({ ultima: 'x', aplazadas: -3, ultimoAviso: 5 }))).toEqual(emptyUpdateMemory());
    expect(parseUpdateMemory(JSON.stringify({ ultima: 14, aplazadas: 2, ultimoAviso: TODAY }))).toEqual({ ultima: 14, aplazadas: 2, ultimoAviso: TODAY });
    expect(parseUpdateMemory(JSON.stringify({ ultima: 14 }))).toEqual({ ultima: 14, aplazadas: 0, ultimoAviso: null });
  });
});

describe('isSafeMoment', () => {
  it('seguro en el título y en el mundo sin ventanas', () => {
    expect(isSafeMoment(['Title'])).toBe(true);
    expect(isSafeMoment(['World'])).toBe(true);
    expect(isSafeMoment(['World', 'Hud'])).toBe(true);
  });
  it('no seguro con una ventana, una acción o el tutorial en marcha', () => {
    for (const k of ['Shop', 'Feed', 'Clean', 'Cure', 'Clinic', 'Book', 'Board', 'Tutorial', 'TutorialOffer', 'Quit', 'Settings', 'AdOffer', 'PollNotice', 'UpdateNotice']) {
      expect(isSafeMoment(['World', 'Hud', k]), k).toBe(false);
    }
  });
  it('sin título ni mundo (arrancando) no es seguro', () => {
    expect(isSafeMoment([])).toBe(false);
    expect(isSafeMoment(['Boot'])).toBe(false);
  });
});
