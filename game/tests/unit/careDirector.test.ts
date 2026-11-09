import { describe, expect, it } from 'vitest';
import { MUD_DELAY_MS, SICK_DELAY_MS, emptyCare, fallSick, makeMuddy, sickCandidates, type CareState } from '../../src/core/care';
import { CareDirector, type CareEvent } from '../../src/core/careDirector';
import { initialState, type GameState } from '../../src/core/economy';

const STEP = 1000;
/** Solo los cerdos abiertos (y león y cabra, que vienen de inicio). */
const withPigs = (clinic = false): GameState => ({ ...initialState(), clinic, counts: { ...initialState().counts, cerdos: 3 } });

/** Avanza `total` ms en pasos de un segundo, aplicando cada evento como haría el mundo. */
function run(director: CareDirector, total: number, state: GameState, start: CareState): { events: CareEvent[]; care: CareState } {
  let care = start;
  const events: CareEvent[] = [];
  for (let t = 0; t < total; t += STEP) {
    for (const e of director.update(STEP, state, care)) {
      events.push(e);
      care = e.type === 'muddy' ? makeMuddy(care, e.penId) : fallSick(care, e.residentId);
    }
  }
  return { events, care };
}

describe('CareDirector: charcos', () => {
  it('el charco de un recinto abierto se pone de barro una vez dentro del intervalo', () => {
    const { events } = run(new CareDirector(() => 0.5), MUD_DELAY_MS.max, withPigs(), emptyCare());
    expect(events).toEqual([{ type: 'muddy', penId: 'cerdos' }]);
  });

  it('no vuelve a salir hasta que el charco esté limpio y pase otro intervalo', () => {
    const director = new CareDirector(() => 0.5);
    const first = run(director, MUD_DELAY_MS.max, withPigs(), emptyCare());
    expect(run(director, MUD_DELAY_MS.max * 2, withPigs(), first.care).events).toEqual([]);
    // Limpio otra vez: hace falta otro intervalo entero.
    expect(run(director, MUD_DELAY_MS.min - STEP, withPigs(), emptyCare()).events).toEqual([]);
    expect(run(director, MUD_DELAY_MS.max, withPigs(), emptyCare()).events).toEqual([{ type: 'muddy', penId: 'cerdos' }]);
  });

  it('un recinto cerrado nunca se pone de barro', () => {
    const { events } = run(new CareDirector(() => 0), MUD_DELAY_MS.max * 3, initialState(), emptyCare());
    expect(events).toEqual([]);
  });
});

describe('CareDirector: enfermedades', () => {
  it('sin clínica nadie se pone malito', () => {
    const { events } = run(new CareDirector(() => 0), SICK_DELAY_MS.max * 3, withPigs(false), makeMuddy(emptyCare(), 'cerdos'));
    expect(events.filter((e) => e.type === 'sick')).toEqual([]);
  });

  it('con clínica, un candidato válido se pone malito dentro del intervalo', () => {
    const state = withPigs(true);
    const { events } = run(new CareDirector(() => 0.5), SICK_DELAY_MS.max, state, makeMuddy(emptyCare(), 'cerdos'));
    const sick = events.filter((e) => e.type === 'sick');
    expect(sick).toHaveLength(1);
    expect(sickCandidates(emptyCare(), state)).toContain((sick[0] as { residentId: string }).residentId);
  });

  it('con dos enfermos no enferma nadie más', () => {
    const two: CareState = { ...makeMuddy(emptyCare(), 'cerdos'), sick: ['rosita', 'bills'] };
    const { events } = run(new CareDirector(() => 0), SICK_DELAY_MS.max * 3, withPigs(true), two);
    expect(events).toEqual([]);
  });
});

describe('CareDirector: el tiempo', () => {
  it('sin tiempo, o con tiempo negativo, no pasa nada', () => {
    const director = new CareDirector(() => 0);
    expect(director.update(0, withPigs(true), emptyCare())).toEqual([]);
    expect(director.update(-5, withPigs(true), emptyCare())).toEqual([]);
    // El negativo no ha retrasado el reloj: justo al mínimo, salta.
    expect(director.update(MUD_DELAY_MS.min, withPigs(), emptyCare())).toEqual([{ type: 'muddy', penId: 'cerdos' }]);
  });

  it('con el mismo azar y los mismos pasos sale lo mismo', () => {
    const seeded = () => {
      let s = 7;
      return () => (s = (s * 9301 + 49297) % 233280) / 233280;
    };
    const a = run(new CareDirector(seeded()), SICK_DELAY_MS.max * 2, withPigs(true), emptyCare());
    const b = run(new CareDirector(seeded()), SICK_DELAY_MS.max * 2, withPigs(true), emptyCare());
    expect(a.events).toEqual(b.events);
    expect(a.events.length).toBeGreaterThan(0);
  });
});
