import { afterEach, describe, expect, it } from 'vitest';
import { ANIMAL_IDS, ANIMALS, isAnimalId, trayFoods } from '../../src/data/animals';
import { FOOD_IDS, FOODS, type FoodId } from '../../src/data/foods';
import { PEN_IDS, PENS } from '../../src/data/pens';
import { SHOP_ITEMS, SHOP_UNLOCK_COINS, getShopItem, shopItemForPen } from '../../src/data/shop';
import { STRINGS_ES, t } from '../../src/data/strings';
import { setLanguage } from '../../src/systems/language';

describe('contenido: animales', () => {
  it('están las 4 especies de siempre y las 11 nuevas', () => {
    expect([...ANIMAL_IDS]).toEqual([
      'leon', 'cabra', 'pantera', 'panda',
      'jirafa', 'cebra', 'gacela', 'pinguino', 'oveja', 'caballo', 'gallina', 'gallo', 'pato', 'elefante-africano', 'elefante-asiatico',
    ]);
  });

  // Tabla «Comidas» del diseño del zoo grande: [especie, come, especial, rechaza].
  const TRAYS: [string, FoodId[], FoodId[], FoodId[]][] = [
    ['jirafa', ['lechuga', 'manzana'], ['platano'], ['carne', 'calcetin']],
    ['cebra', ['zanahoria', 'lechuga'], ['manzana'], ['piedra', 'pescado']],
    ['gacela', ['zanahoria', 'lechuga'], ['maiz'], ['carne', 'huevo']],
    ['pinguino', ['pescado'], ['piedra'], ['zanahoria', 'pan', 'calcetin']],
    ['oveja', ['lechuga', 'maiz'], ['gallina'], ['carne', 'calcetin']],
    ['caballo', ['zanahoria', 'maiz'], ['manzana'], ['piedra', 'huevo']],
    ['gallina', ['lechuga', 'maiz'], ['pan'], ['piedra', 'pescado']],
    ['gallo', ['maiz', 'pan'], [], ['carne', 'huevo', 'calcetin']],
    ['pato', ['lechuga', 'maiz'], ['pescado'], ['piedra', 'pan']],
    ['elefante-africano', ['lechuga', 'manzana'], ['platano'], ['carne', 'calcetin']],
    ['elefante-asiatico', ['lechuga', 'platano'], ['manzana'], ['piedra', 'pescado']],
  ];
  it.each(TRAYS)('%s: come, especial y rechaza lo que dice el diseño', (id, come, especial, rechaza) => {
    if (!isAnimalId(id)) throw new Error(`Especie desconocida: ${id}`);
    const by = (reaction: string) => FOOD_IDS.filter((food) => ANIMALS[id].reactions[food] === reaction);
    expect(by('come')).toEqual(come);
    expect(by('especial')).toEqual(especial);
    expect(by('rechaza')).toEqual(rechaza);
  });

  // Tabla «Monedas y precios»: [especie, come, especial, otro animal].
  const COINS: [string, number, number | undefined, number][] = [
    ['pato', 3, 5, 30], ['oveja', 4, 6, 40], ['caballo', 5, 8, 60], ['gallina', 3, 5, 30], ['gallo', 3, undefined, 30],
    ['pinguino', 6, 9, 80], ['jirafa', 8, 12, 150], ['cebra', 6, 9, 120], ['gacela', 5, 8, 100],
    ['elefante-africano', 10, 15, 200], ['elefante-asiatico', 10, 15, 200],
  ];
  it.each(COINS)('%s paga %i (especial %s) y otro igual cuesta %i', (id, come, especial, extra) => {
    if (!isAnimalId(id)) throw new Error(`Especie desconocida: ${id}`);
    expect(ANIMALS[id].coins).toEqual(especial === undefined ? { come } : { come, especial });
    expect(ANIMALS[id].extraCost).toBe(extra);
  });

  it.each(ANIMAL_IDS)('%s tiene la frase del tendero y el texto de «otro»', (id) => {
    const strings: Record<string, string> = STRINGS_ES;
    expect(strings[`shop.about.${id}`], `shop.about.${id}`).toBeTruthy();
    if (id !== 'leon') expect(strings[`shop.extra.${id}`], `shop.extra.${id}`).toBeTruthy();
  });

  it.each(ANIMAL_IDS)('%s enseña entre 4 y 5 comidas, todas con reacción válida', (id) => {
    const tray = trayFoods(id);
    expect(tray.length).toBeGreaterThanOrEqual(4);
    expect(tray.length).toBeLessThanOrEqual(5);
    for (const food of tray) expect(['come', 'rechaza', 'especial']).toContain(ANIMALS[id].reactions[food]);
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

  it.each(PEN_IDS)('%s: si admite extras, tiene precio y texto', (id) => {
    for (const r of PENS[id].residents.slice(1)) {
      const def = ANIMALS[r.species];
      expect(def.extraCost).toBeGreaterThan(0);
      expect(def.extraNameKey && STRINGS_ES[def.extraNameKey]).toBeTruthy();
    }
  });

  it('los animales grandes dicen su radio', () => {
    const radius = (id: string) => (isAnimalId(id) ? ANIMALS[id].radius : undefined);
    expect(['jirafa', 'elefante-africano', 'elefante-asiatico', 'cebra', 'caballo', 'cabra', 'pato'].map(radius)).toEqual([16, 18, 18, 11, 11, undefined, undefined]);
  });

  it('isAnimalId distingue ids válidos', () => {
    expect(isAnimalId('leon')).toBe(true);
    expect(isAnimalId('tigre')).toBe(false);
  });

  it('león y cabra vienen desbloqueados; pantera y panda no', () => {
    expect(PENS.leon.cost === undefined).toBe(true);
    expect(PENS.cabra.cost === undefined).toBe(true);
    expect(PENS.pantera.cost === undefined).toBe(false);
    expect(PENS.panda.cost === undefined).toBe(false);
  });

  it.each(ANIMAL_IDS)('%s rechaza al menos una comida que otro animal sí come', (id) => {
    const eatenByOthers = (food: FoodId) =>
      ANIMAL_IDS.some((other) => other !== id && ['come', 'especial'].includes(ANIMALS[other].reactions[food] ?? ''));
    const wrong = trayFoods(id).filter((food) => ANIMALS[id].reactions[food] === 'rechaza' && eatenByOthers(food));
    expect(wrong.length).toBeGreaterThanOrEqual(1);
  });
});

describe('contenido: comidas', () => {
  it.each(FOOD_IDS)('%s tiene nombre y emoji', (id) => {
    expect(t(FOODS[id].nameKey)).toBeTruthy();
    expect(FOODS[id].emoji).toBeTruthy();
  });

  it('están las 4 de siempre, la gallina, las 7 nuevas y el calcetín, en el orden de la bandeja', () => {
    expect([...FOOD_IDS]).toEqual([
      'piedra', 'carne', 'conejo', 'gallina', 'zanahoria', 'lechuga', 'maiz', 'manzana', 'platano', 'pan', 'huevo', 'pescado', 'calcetin',
    ]);
  });

  it('los amigos son el conejo y la gallina', () => {
    expect(FOOD_IDS.filter((id) => FOODS[id].friend)).toEqual(['conejo', 'gallina']);
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
    const lockedAnimals = PEN_IDS.filter((id) => PENS[id].cost !== undefined).sort();
    const sold = SHOP_ITEMS.map((item) => item.penId).sort();
    expect(sold).toEqual(lockedAnimals);
  });

  it('getShopItem devuelve undefined para ids desconocidos', () => {
    expect(getShopItem('delfines')).toBeUndefined();
  });
});

describe('textos con variables', () => {
  it('cada idioma se llama a sí mismo en su idioma', () => {
    setLanguage('es');
    expect(t('settings.language')).toBe('Español');
    setLanguage('en');
    expect(t('settings.language')).toBe('English');
  });

  afterEach(() => setLanguage('es'));

  it('en español', () => {
    setLanguage('es');
    expect(t('toast.shopLocked', { n: 20 })).toBe('La tienda abre con 20 monedas');
    expect(t('title.play')).toBe('Jugar');
    expect(t('shop.buy')).toBe('¡Comprar!');
    expect(t('book.page.bills.title')).toBe('Bills, el león');
  });

  it('en inglés', () => {
    setLanguage('en');
    expect(t('toast.shopLocked', { n: 20 })).toBe('The shop opens with 20 coins');
    expect(t('title.play')).toBe('Play');
    expect(t('shop.buy')).toBe('Buy!');
    expect(t('book.page.bills.title')).toBe('Bills, the lion');
  });

  it('el nombre del animal nuevo va traducido dentro del aviso', () => {
    setLanguage('en');
    expect(t('toast.newAnimal', { name: t('animal.pinguino') })).toBe('New animal: Penguin!');
  });

  it('una variable que no se pasa deja el marcador tal cual', () => {
    setLanguage('en');
    expect(t('shop.have', { n: 2 })).toBe('You have 2 of {max}');
  });
});

describe('shopItemForPen', () => {
  it('encuentra el producto de un animal comprable', () => {
    expect(shopItemForPen('pantera')?.cost).toBe(50);
  });
  it('undefined para animales de inicio', () => {
    expect(shopItemForPen('leon')).toBeUndefined();
  });
});
