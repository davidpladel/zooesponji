import { describe, expect, it } from 'vitest';
import { initialCounts } from '../../src/core/economy';
import {
  BACKUP_KEY,
  LEGACY_COINS_KEY,
  LEGACY_PURCHASES_KEY,
  SAVE_KEY,
  defaultSave,
  loadSave,
  migrateLegacy,
  parseSave,
  writeSave,
} from '../../src/core/save';
import { createMemoryStore } from '../../src/systems/storage';

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
    expect(parsed.book).toEqual(old.book);
  });

  it('migra un guardado v1 real: cada desbloqueado cuenta 1 (y descarta desconocidos)', () => {
    const parsed = parseSave({
      version: 1,
      state: { coins: 5, unlocked: ['leon', 'cabra', 'panda', 'tigre'], shopUnlocked: true },
      settings: { music: true, sfx: false, joystick: false },
    });
    expect(parsed).toEqual({
      version: 2,
      state: { coins: 5, counts: { ...initialCounts(), leon: 1, cabra: 1, pantera: 0, panda: 1 }, shopUnlocked: true },
      settings: { music: true, sfx: false, joystick: false },
      book: { seen: [], hinted: false, page: null },
    });
  });

  it('libro: partidas sin libro empiezan vacías; se guardan solo ids sin repetir', () => {
    const base = { version: 2, state: { coins: 0, counts: {}, shopUnlocked: false }, settings: {} };
    expect(parseSave(base)?.book).toEqual({ seen: [], hinted: false, page: null });
    expect(parseSave({ ...base, book: { seen: ['mary', 'mary', 3, 'noche'], hinted: true, page: 'mary' } })?.book).toEqual({
      seen: ['mary', 'noche'],
      hinted: true,
      page: 'mary',
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
    expect(parsed?.settings).toEqual({ music: false, sfx: true, joystick: false });
  });

  it('una partida de la 2.2.0 se lee igual tras separar recintos y especies', () => {
    const old = {
      version: 2,
      state: { coins: 77, counts: { ...initialCounts(), leon: 1, cabra: 3, pantera: 2, panda: 0 }, shopUnlocked: true },
      settings: { music: false, sfx: true, joystick: true },
      book: { seen: ['cover', 'gordi'], hinted: true, page: 'gordi' },
    };
    expect(parseSave(old)).toEqual(old);
  });
});

describe('migrateLegacy (partidas de la v1.1)', () => {
  it('sin datos antiguos devuelve null', () => {
    expect(migrateLegacy(null, null)).toBeNull();
  });

  it('trae monedas y compras', () => {
    const migrated = migrateLegacy('37', JSON.stringify({ shop: true, pantera: true }));
    expect(migrated?.state).toEqual({ coins: 37, counts: { ...initialCounts(), leon: 1, cabra: 1, pantera: 1, panda: 0 }, shopUnlocked: true });
  });

  it('abre la tienda si ya había 20 monedas aunque no la comprara', () => {
    expect(migrateLegacy('25', null)?.state.shopUnlocked).toBe(true);
  });

  it('ignora valores corruptos', () => {
    const migrated = migrateLegacy('abc', 'no-es-json');
    expect(migrated?.state).toEqual({ coins: 0, counts: { ...initialCounts(), leon: 1, cabra: 1, pantera: 0, panda: 0 }, shopUnlocked: false });
  });
});

describe('loadSave / writeSave', () => {
  it('sin nada guardado devuelve la partida por defecto', async () => {
    expect(await loadSave(createMemoryStore())).toEqual(defaultSave());
  });

  it('lo que se escribe se vuelve a leer igual', async () => {
    const store = createMemoryStore();
    const data = { ...defaultSave(), state: { coins: 42, counts: { ...initialCounts(), leon: 1, cabra: 3, pantera: 0, panda: 0 }, shopUnlocked: true } };
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
