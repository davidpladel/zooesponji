import { describe, expect, it } from 'vitest';
import { ANIMAL_IDS, ANIMALS } from '../../src/data/animals';
import { advance, goodFood, type TutorialEvent, type TutorialStep } from '../../src/core/tutorial';

describe('pasos del tutorial', () => {
  it.each<[TutorialStep, TutorialEvent, TutorialStep | 'done']>([
    ['move', { type: 'moved' }, 'tap-animal'],
    ['move', { type: 'feed-opened' }, 'drag-food'],
    ['tap-animal', { type: 'feed-opened' }, 'drag-food'],
    ['drag-food', { type: 'fed', coins: 2 }, 'coins'],
    ['drag-food', { type: 'feed-closed' }, 'tap-animal'],
    ['coins', { type: 'coins-shown' }, 'shop'],
    ['coins', { type: 'feed-closed' }, 'shop'],
    ['shop', { type: 'shop-opened' }, 'done'],
  ])('%s + %o → %s', (step, event, next) => {
    expect(advance(step, event)).toBe(next);
  });

  it('una comida que no gusta (sin monedas) no cuenta: la mano repite el arrastre', () => {
    expect(advance('drag-food', { type: 'fed', coins: 0 })).toBe('drag-food');
  });

  it('lo que no toca deja el paso igual', () => {
    expect(advance('tap-animal', { type: 'moved' })).toBe('tap-animal');
    expect(advance('coins', { type: 'shop-opened' })).toBe('coins');
    expect(advance('move', { type: 'coins-shown' })).toBe('move');
  });

  it('la mano arrastra una comida que el animal se come', () => {
    expect(goodFood('leon')).toBe('carne');
    for (const id of ANIMAL_IDS) expect(ANIMALS[id].reactions[goodFood(id)], id).not.toBe('rechaza');
  });
});
