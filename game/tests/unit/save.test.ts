import { describe, expect, it } from 'vitest';
import { initialCounts } from '../../src/core/economy';
import {
  BACKUP_KEY,
  LEGACY_COINS_KEY,
  LEGACY_PURCHASES_KEY,
  SAVE_KEY,
  SAVE_VERSION,
  defaultSave,
  loadSave,
  migrateLegacy,
  parseSave,
  shopVisited,
  writeSave,
} from '../../src/core/save';
import { createMemoryStore } from '../../src/systems/storage';
import { LANGUAGES } from '../../src/systems/language';

describe('parseSave', () => {
  it('acepta una partida válida', () => {
    const data = defaultSave();
    expect(parseSave(JSON.parse(JSON.stringify(data)))).toEqual(data);
  });

  it.each([
    ['null', null],
    ['versión desconocida', { ...defaultSave(), version: 99 }],
    ['monedas negativas', { ...defaultSave(), state: { ...defaultSave().state, coins: -3 } }],
    ['monedas con decimales', { ...defaultSave(), state: { ...defaultSave().state, coins: 1.5 } }],
    ['v1 sin lista de desbloqueados', { version: 1, state: { coins: 1 }, settings: {} }],
    ['v2 sin conteos', { version: 2, state: { coins: 1 }, settings: {} }],
  ])('rechaza: %s', (_label, value) => {
    expect(parseSave(value)).toBeNull();
  });

  it('una partida de la 2.2 (solo 4 recintos) se lee sin perder nada y con los recintos nuevos cerrados', () => {
    const old = {
      version: 2,
      state: { coins: 321, counts: { leon: 1, cabra: 4, pantera: 2, panda: 1 }, shopUnlocked: true },
      settings: { music: false, sfx: true, joystick: true },
      book: { seen: ['cover', 'bills'], hinted: true, page: 'bills' },
    };
    const parsed = parseSave(old)!;
    expect(parsed.state.coins).toBe(321);
    expect(parsed.state.counts).toEqual({ ...initialCounts(), leon: 1, cabra: 4, pantera: 2, panda: 1 });
    expect(parsed.state.counts.sabana).toBe(0);
    expect(parsed.book).toEqual({ ...old.book, opened: true });
  });

  it('migra un guardado v1 real: cada desbloqueado cuenta 1 (y descarta desconocidos)', () => {
    const parsed = parseSave({
      version: 1,
      state: { coins: 5, unlocked: ['leon', 'cabra', 'panda', 'tigre'], shopUnlocked: true },
      settings: { music: true, sfx: false, joystick: false },
    });
    expect(parsed).toEqual({
      version: 2,
      state: { coins: 5, counts: { ...initialCounts(), leon: 1, cabra: 1, pantera: 0, panda: 1 }, shopUnlocked: true, luna: false },
      settings: { music: true, sfx: false, joystick: false, stats: true },
      book: { seen: [], hinted: false, page: null, opened: false },
      tutorial: { offered: false },
      // Tenía el panda (de compra): ya había entrado en la tienda.
      shop: { visits: 1 },
    });
  });

  it('libro: partidas sin libro empiezan vacías; se guardan solo ids sin repetir', () => {
    const base = { version: 2, state: { coins: 0, counts: {}, shopUnlocked: false }, settings: {} };
    expect(parseSave(base)?.book).toEqual({ seen: [], hinted: false, page: null, opened: false });
    expect(parseSave({ ...base, book: { seen: ['mary', 'mary', 3, 'noche'], hinted: true, page: 'mary' } })?.book).toEqual({
      seen: ['mary', 'noche'],
      hinted: true,
      page: 'mary',
      opened: true,
    });
  });

  it('v2: recorta al máximo, ignora basura y siempre incluye los animales de inicio', () => {
    const parsed = parseSave({
      version: 2,
      state: { coins: 0, counts: { ...initialCounts(), leon: 0, cabra: 9, pantera: 2, panda: -1, tigre: 3 }, shopUnlocked: true },
      settings: {},
    });
    expect(parsed?.state.counts).toEqual({ ...initialCounts(), leon: 1, cabra: 5, pantera: 2, panda: 0 });
  });

  it('rellena ajustes que falten con los valores por defecto', () => {
    const parsed = parseSave({
      version: 2,
      state: { coins: 0, counts: {}, shopUnlocked: false },
      settings: { music: false },
    });
    expect(parsed?.settings).toEqual({ music: false, sfx: true, joystick: false, stats: true });
  });

  it('una partida de la 2.2.0 se lee igual tras separar recintos y especies', () => {
    const old = {
      version: 2,
      state: { coins: 77, counts: { ...initialCounts(), leon: 1, cabra: 3, pantera: 2, panda: 0 }, shopUnlocked: true },
      settings: { music: false, sfx: true, joystick: true },
      book: { seen: ['cover', 'gordi'], hinted: true, page: 'gordi' },
    };
    expect(parseSave(old)).toEqual({
      ...old,
      state: { ...old.state, luna: false },
      settings: { ...old.settings, stats: true },
      book: { ...old.book, opened: true },
      tutorial: { offered: false },
      shop: { visits: 1 },
    });
  });
});

describe('migrateLegacy (partidas de la v1.1)', () => {
  it('sin datos antiguos devuelve null', () => {
    expect(migrateLegacy(null, null)).toBeNull();
  });

  it('trae monedas y compras', () => {
    const migrated = migrateLegacy('37', JSON.stringify({ shop: true, pantera: true }));
    expect(migrated?.state).toEqual({ coins: 37, counts: { ...initialCounts(), leon: 1, cabra: 1, pantera: 1, panda: 0 }, shopUnlocked: true, luna: false });
  });

  it('abre la tienda si ya había 20 monedas aunque no la comprara', () => {
    expect(migrateLegacy('25', null)?.state.shopUnlocked).toBe(true);
  });

  it('ignora valores corruptos', () => {
    const migrated = migrateLegacy('abc', 'no-es-json');
    expect(migrated?.state).toEqual({ coins: 0, counts: { ...initialCounts(), leon: 1, cabra: 1, pantera: 0, panda: 0 }, shopUnlocked: true, luna: false });
  });

  it('una partida de antes con la tienda cerrada la tiene abierta', () => {
    const old = { version: 2, state: { coins: 3, counts: {}, shopUnlocked: false }, settings: {} };
    expect(parseSave(old)!.state.shopUnlocked).toBe(true);
  });
});

describe('loadSave / writeSave', () => {
  it('sin nada guardado devuelve la partida por defecto', async () => {
    expect(await loadSave(createMemoryStore())).toEqual(defaultSave());
  });

  it('lo que se escribe se vuelve a leer igual', async () => {
    const store = createMemoryStore();
    const data = { ...defaultSave(), state: { coins: 42, counts: { ...initialCounts(), leon: 1, cabra: 3, pantera: 0, panda: 0 }, shopUnlocked: true, luna: false }, shop: { visits: 2 } };
    await writeSave(store, data);
    expect(await loadSave(store)).toEqual(data);
  });

  it('partida corrupta: hace copia de seguridad y empieza de cero', async () => {
    const store = createMemoryStore({ [SAVE_KEY]: '{esto no es json' });
    expect(await loadSave(store)).toEqual(defaultSave());
    expect(await store.get(BACKUP_KEY)).toBe('{esto no es json');
  });

  it('sin partida v3 migra la de la v1.1', async () => {
    const store = createMemoryStore({
      [LEGACY_COINS_KEY]: '12',
      [LEGACY_PURCHASES_KEY]: JSON.stringify({ panda: true }),
    });
    const loaded = await loadSave(store);
    expect(loaded.state.coins).toBe(12);
    expect(loaded.state.counts.panda).toBe(1);
  });

  it('si hay partida v3, ignora la de la v1.1', async () => {
    const store = createMemoryStore({ [LEGACY_COINS_KEY]: '99' });
    await writeSave(store, defaultSave());
    expect((await loadSave(store)).state.coins).toBe(0);
  });
});

describe('ajustes: idioma', () => {
  const withLanguage = (language: unknown) => ({ ...defaultSave(), settings: { ...defaultSave().settings, language } });

  it('sin idioma guardado queda en automático (el campo no existe)', () => {
    const parsed = parseSave(JSON.parse(JSON.stringify(defaultSave())))!;
    expect(parsed.settings.language).toBeUndefined();
    expect('language' in parsed.settings).toBe(false);
  });

  it.each(LANGUAGES)('acepta %s', (language) => {
    expect(parseSave(withLanguage(language))?.settings.language).toBe(language);
  });

  it.each([['de'], ['pt'], ['EN'], ['es-ES'], [3], [null], [true]])('ignora %j y queda en automático', (language) => {
    const parsed = parseSave(withLanguage(language))!;
    expect(parsed.settings.language).toBeUndefined();
    expect(parsed.settings.music).toBe(true);
  });

  it('ida y vuelta: lo que se escribe se vuelve a leer', async () => {
    const store = createMemoryStore();
    await writeSave(store, { ...defaultSave(), settings: { ...defaultSave().settings, language: 'en' } });
    expect((await loadSave(store)).settings.language).toBe('en');
  });

  it('no cambia la versión del guardado', () => {
    expect(SAVE_VERSION).toBe(2);
  });
});

describe('ajuste de estadísticas', () => {
  const withStats = (stats: unknown) => ({ ...defaultSave(), settings: { ...defaultSave().settings, stats } });

  it('por defecto están encendidas', () => {
    expect(defaultSave().settings.stats).toBe(true);
  });

  it('un guardado antiguo sin el ajuste las deja encendidas', () => {
    const old = { version: 2, state: { coins: 0, counts: {}, shopUnlocked: false }, settings: { music: false } };
    expect(parseSave(old)?.settings.stats).toBe(true);
  });

  it('se respeta el apagado', () => {
    expect(parseSave(withStats(false))?.settings.stats).toBe(false);
  });

  it('un valor que no es sí o no cuenta como encendido', () => {
    expect(parseSave(withStats('no'))?.settings.stats).toBe(true);
  });
});

describe('guardado de Luna, el tutorial, las visitas a la tienda y el libro', () => {
  const roundTrip = (data: unknown) => parseSave(JSON.parse(JSON.stringify(data)));

  it('una partida nueva: sin Luna, aviso del tutorial pendiente, 0 visitas y libro sin abrir', () => {
    const data = defaultSave();
    expect(data.state.luna).toBe(false);
    expect(data.tutorial).toEqual({ offered: false });
    expect(data.shop).toEqual({ visits: 0 });
    expect(data.book.opened).toBe(false);
  });

  it('ida y vuelta conserva todo', () => {
    const data = defaultSave();
    const full = { ...data, state: { ...data.state, luna: true }, tutorial: { offered: true }, shop: { visits: 4 }, book: { ...data.book, opened: true } };
    expect(roundTrip(full)).toEqual(full);
  });

  it('una partida de antes de esta versión: el aviso sale también a quien ya jugaba y el libro cuenta como abierto si hay páginas leídas', () => {
    const old = {
      version: 2,
      state: { coins: 50, counts: { leon: 1, cabra: 2 }, shopUnlocked: true },
      settings: {},
      book: { seen: ['cover'], hinted: true, page: 'cover' },
    };
    const parsed = roundTrip(old)!;
    expect(parsed.state.luna).toBe(false);
    expect(parsed.tutorial).toEqual({ offered: false });
    // Tenía 2 cabras (una comprada): cuenta como que ya entró en la tienda.
    expect(parsed.shop).toEqual({ visits: 1 });
    expect(parsed.book.opened).toBe(true);
  });

  it('tienda ya visitada: las partidas viejas con compras o con Luna cuentan; las que no, no', () => {
    const base = { version: 2, settings: {} };
    const parse = (state: object, shop?: object) => parseSave({ ...base, state: { coins: 0, shopUnlocked: true, ...state }, ...(shop ? { shop } : {}) })!;
    expect(shopVisited(parse({ counts: initialCounts() }).shop)).toBe(false);
    expect(shopVisited(parse({ counts: initialCounts(), luna: true }).shop)).toBe(true);
    expect(shopVisited(parse({ counts: { ...initialCounts(), cabra: 2 } }).shop)).toBe(true);
    expect(shopVisited(parse({ counts: { ...initialCounts(), pantera: 1 } }).shop)).toBe(true);
    // Las visitas contadas mandan.
    expect(parse({ counts: initialCounts(), luna: true }, { visits: 5 }).shop).toEqual({ visits: 5 });
    expect(shopVisited(parse({ counts: initialCounts() }, { visits: 1 }).shop)).toBe(true);
  });

  it('sin páginas leídas, el libro no cuenta como abierto (la página se pone sola al comprar)', () => {
    const old = { version: 2, state: { coins: 0, counts: {}, shopUnlocked: false }, settings: {}, book: { seen: [], hinted: false, page: 'nube' } };
    expect(roundTrip(old)!.book.opened).toBe(false);
  });

  it('una partida v1 carga con el aviso pendiente', () => {
    const parsed = roundTrip({ version: 1, state: { coins: 30, unlocked: ['leon', 'cabra', 'pantera'], shopUnlocked: true }, settings: {} })!;
    expect(parsed.tutorial.offered).toBe(false);
    expect(parsed.state.luna).toBe(false);
  });

  it.each([[-1], [2.5], ['3']])('visitas a la tienda no válidas (%s) cuentan como 0', (visits) => {
    expect(roundTrip({ ...defaultSave(), shop: { visits } })!.shop.visits).toBe(0);
  });

  it('migrateLegacy trae los campos nuevos por defecto', () => {
    const data = migrateLegacy('25', null)!;
    expect(data.state.luna).toBe(false);
    expect(data.tutorial.offered).toBe(false);
    expect(data.shop.visits).toBe(0);
    expect(data.book.opened).toBe(false);
  });
});
