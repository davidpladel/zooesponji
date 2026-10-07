import { describe, expect, it } from 'vitest';
import { NEAR_MARGIN, NEAR_MS, noPen, stepNear, type NearState } from '../../src/core/penNear';

const pens = [
  { id: 'leon', rect: { x: 100, y: 100, width: 80, height: 60 } },
  { id: 'panda', rect: { x: 400, y: 100, width: 80, height: 60 } },
] as const;
type Id = (typeof pens)[number]['id'];
const inside = { x: 120, y: 120 };
const edge = { x: 100 - NEAR_MARGIN, y: 120 };
const far = { x: 300, y: 300 };

function run(steps: { pos: { x: number; y: number }; delta: number }[]): (Id | null)[] {
  let state: NearState<Id> = noPen();
  return steps.map(({ pos, delta }) => {
    const step = stepNear(state, pens, pos, delta);
    state = step.state;
    return step.entered;
  });
}

describe('visitar un recinto', () => {
  it('pasar de largo no cuenta', () => {
    expect(run([{ pos: inside, delta: 16 }, { pos: inside, delta: NEAR_MS - 100 }, { pos: far, delta: 16 }])).toEqual([null, null, null]);
  });

  it('quedarse dos segundos cuenta, una sola vez', () => {
    expect(run([{ pos: inside, delta: 16 }, { pos: inside, delta: NEAR_MS }, { pos: inside, delta: 5000 }])).toEqual([null, 'leon', null]);
  });

  it('el margen de alrededor también es «junto al recinto»', () => {
    expect(run([{ pos: edge, delta: 16 }, { pos: edge, delta: NEAR_MS }])).toEqual([null, 'leon']);
  });

  it('salir y volver es otra visita', () => {
    const visit = [{ pos: inside, delta: 16 }, { pos: inside, delta: NEAR_MS }];
    expect(run([...visit, { pos: far, delta: 16 }, ...visit])).toEqual([null, 'leon', null, null, 'leon']);
  });

  it('cambiar de recinto empieza la cuenta de nuevo', () => {
    const atPanda = { x: 420, y: 120 };
    expect(run([{ pos: inside, delta: 16 }, { pos: inside, delta: 1500 }, { pos: atPanda, delta: 16 }, { pos: atPanda, delta: 1500 }, { pos: atPanda, delta: 600 }]))
      .toEqual([null, null, null, null, 'panda']);
  });
});
