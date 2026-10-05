import { describe, expect, it } from 'vitest';
import { resolveFeeding } from '../../src/core/reactions';
import { ANIMALS, trayFoods, type AnimalId } from '../../src/data/animals';
import type { FoodId } from '../../src/data/foods';

describe('resolveFeeding', () => {
  it.each<[AnimalId, FoodId, string, number]>([
    ['leon', 'carne', 'come', 1],
    ['leon', 'conejo', 'come', 1],
    ['leon', 'piedra', 'rechaza', 0],
    ['leon', 'zanahoria', 'rechaza', 0],
    ['cabra', 'carne', 'rechaza', 0],
    ['cabra', 'conejo', 'especial', 2],
    ['cabra', 'piedra', 'come', 1],
    ['cabra', 'zanahoria', 'come', 1],
    ['pantera', 'carne', 'come', 2],
    ['pantera', 'conejo', 'come', 2],
    ['pantera', 'piedra', 'rechaza', 0],
    ['pantera', 'zanahoria', 'rechaza', 0],
    ['panda', 'carne', 'rechaza', 0],
    ['panda', 'conejo', 'especial', 4],
    ['panda', 'piedra', 'rechaza', 0],
    ['panda', 'zanahoria', 'come', 2],
  ])('%s + %s → %s (%i monedas)', (animal, food, reaction, coins) => {
    expect(resolveFeeding(animal, food)).toEqual({ reaction, coins });
  });
});

describe('bandeja por especie', () => {
  it('hoy cada especie enseña las 4 comidas, en el orden de FOOD_IDS', () => {
    expect(trayFoods('leon')).toEqual(['piedra', 'carne', 'conejo', 'zanahoria']);
  });

  it('una comida sin reacción no sale en la bandeja y, si llega, se rechaza sin monedas', () => {
    const original = ANIMALS.leon.reactions;
    ANIMALS.leon.reactions = { carne: 'come' };
    try {
      expect(trayFoods('leon')).toEqual(['carne']);
      expect(resolveFeeding('leon', 'piedra')).toEqual({ reaction: 'rechaza', coins: 0 });
    } finally {
      ANIMALS.leon.reactions = original;
    }
  });
});
