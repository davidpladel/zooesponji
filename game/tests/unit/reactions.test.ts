import { describe, expect, it } from 'vitest';
import { resolveFeeding } from '../../src/core/reactions';
import type { AnimalId } from '../../src/data/animals';
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
