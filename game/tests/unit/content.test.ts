import { describe, expect, it } from 'vitest';
import { ANIMAL_IDS, ANIMALS, isAnimalId } from '../../src/data/animals';
import { FOOD_IDS, FOODS } from '../../src/data/foods';
import { SHOP_ITEMS, SHOP_UNLOCK_COINS, getShopItem, shopItemForAnimal } from '../../src/data/shop';
import { STRINGS_ES, t } from '../../src/data/strings';

describe('contenido: animales', () => {
  it('contiene los 4 animales actuales', () => {
    expect([...ANIMAL_IDS]).toEqual(['leon', 'cabra', 'pantera', 'panda']);
  });

  it.each(ANIMAL_IDS)('%s tiene reacción para todas las comidas', (id) => {
    for (const food of FOOD_IDS) {
      expect(['come', 'rechaza', 'especial']).toContain(ANIMALS[id].reactions[food]);
    }
  });

  it.each(ANIMAL_IDS)('%s da monedas por comer y, si tiene especial, por especial', (id) => {
    const animal = ANIMALS[id];
    expect(animal.coins.come).toBeGreaterThan(0);
    const hasSpecial = FOOD_IDS.some((f) => animal.reactions[f] === 'especial');
    if (hasSpecial) expect(animal.coins.especial).toBeGreaterThan(0);
  });

  it.each(ANIMAL_IDS)('%s tiene nombre en la tabla de textos', (id) => {
    expect(STRINGS_ES[ANIMALS[id].nameKey]).toBeTruthy();
  });

  it.each(ANIMAL_IDS)('%s: si admite extras, tiene precio y texto', (id) => {
    const def = ANIMALS[id];
    if (def.maxCount === 1) return;
    expect(def.extraCost).toBeGreaterThan(0);
    expect(def.extraNameKey && STRINGS_ES[def.extraNameKey]).toBeTruthy();
  });

  it('isAnimalId distingue ids válidos', () => {
    expect(isAnimalId('leon')).toBe(true);
    expect(isAnimalId('tigre')).toBe(false);
  });

  it('león y cabra vienen desbloqueados; pantera y panda no', () => {
    expect(ANIMALS.leon.unlockedByDefault).toBe(true);
    expect(ANIMALS.cabra.unlockedByDefault).toBe(true);
    expect(ANIMALS.pantera.unlockedByDefault).toBe(false);
    expect(ANIMALS.panda.unlockedByDefault).toBe(false);
  });
});

describe('contenido: comidas', () => {
  it.each(FOOD_IDS)('%s tiene nombre y emoji', (id) => {
    expect(t(FOODS[id].nameKey)).toBeTruthy();
    expect(FOODS[id].emoji).toBeTruthy();
  });
});

describe('contenido: tienda', () => {
  it('la tienda se desbloquea a las 20 monedas', () => {
    expect(SHOP_UNLOCK_COINS).toBe(20);
  });

  it('pantera cuesta 50 y panda 100', () => {
    expect(getShopItem('pantera')?.cost).toBe(50);
    expect(getShopItem('panda')?.cost).toBe(100);
  });

  it('todo animal no desbloqueado de inicio se puede comprar, y solo esos', () => {
    const lockedAnimals = ANIMAL_IDS.filter((id) => !ANIMALS[id].unlockedByDefault).sort();
    const sold = SHOP_ITEMS.map((item) => item.animalId).sort();
    expect(sold).toEqual(lockedAnimals);
  });

  it('getShopItem devuelve undefined para ids desconocidos', () => {
    expect(getShopItem('delfines')).toBeUndefined();
  });
});

describe('textos con variables', () => {
  it('t sustituye {n}', () => {
    expect(t('toast.shopLocked', { n: 20 })).toBe('La tienda abre con 20 monedas');
  });
  it('sin variables deja el texto igual', () => {
    expect(t('title.play')).toBe('Jugar');
  });
});

describe('shopItemForAnimal', () => {
  it('encuentra el producto de un animal comprable', () => {
    expect(shopItemForAnimal('pantera')?.cost).toBe(50);
  });
  it('undefined para animales de inicio', () => {
    expect(shopItemForAnimal('leon')).toBeUndefined();
  });
});
