import { describe, expect, it } from 'vitest';
import type { AdConfig } from '../../src/core/adConfig';
import { OPEN_TIMEOUT_MS, SHOW_TIMEOUT_MS, createAdMobProvider, type AdMobLike, type Wait } from '../../src/systems/adProvider';

const config: AdConfig = { units: { tienda: 'unidad-tienda', pausa: 'unidad-pausa' }, testing: true };
const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

function fake(unitConfig: AdConfig = config) {
  const handlers = new Map<string, () => void>();
  const calls: string[] = [];
  const fail = { initialize: false, prepare: false, show: false, on: false };
  const timers: { ms: number; fn: () => void }[] = [];
  const admob: AdMobLike = {
    initialize: async (testing) => {
      calls.push(`init:${testing}`);
      if (fail.initialize) throw new Error('sin SDK');
    },
    prepare: async (slot, adId, testing) => {
      calls.push(`prepare:${slot}:${adId}:${testing}`);
      if (fail.prepare) throw new Error('sin anuncio');
    },
    show: async (slot) => {
      calls.push(`show:${slot}`);
      if (fail.show) throw new Error('no se abre');
    },
    on: async (slot, event, handler) => {
      if (fail.on) throw new Error('sin avisos');
      const key = `${slot}:${event}`;
      handlers.set(key, handler);
      return {
        remove: async () => {
          handlers.delete(key);
        },
      };
    },
  };
  const wait: Wait = (ms, fn) => {
    const timer = { ms, fn };
    timers.push(timer);
    return () => {
      const at = timers.indexOf(timer);
      if (at >= 0) timers.splice(at, 1);
    };
  };
  const fire = (key: string): void => handlers.get(key)?.();
  const provider = createAdMobProvider(admob, unitConfig, wait);
  return { provider, calls, fail, timers, handlers, fire };
}

describe('proveedor de AdMob: cargar', () => {
  it('inicia el SDK justo antes de la primera carga, y solo una vez', async () => {
    const t = fake();
    expect(t.calls).toEqual([]);
    expect(await t.provider.load('tienda')).toBe(true);
    expect(await t.provider.load('pausa')).toBe(true);
    expect(t.calls).toEqual(['init:true', 'prepare:tienda:unidad-tienda:true', 'prepare:pausa:unidad-pausa:true']);
  });

  it('dos cargas a la vez comparten el mismo inicio', async () => {
    const t = fake();
    await Promise.all([t.provider.load('tienda'), t.provider.load('pausa')]);
    expect(t.calls.filter((call) => call.startsWith('init'))).toHaveLength(1);
  });

  it('si el SDK no arranca, no hay anuncio y se vuelve a intentar en la siguiente carga', async () => {
    const t = fake();
    t.fail.initialize = true;
    expect(await t.provider.load('tienda')).toBe(false);
    t.fail.initialize = false;
    expect(await t.provider.load('tienda')).toBe(true);
    expect(t.calls).toEqual(['init:true', 'init:true', 'prepare:tienda:unidad-tienda:true']);
  });

  it('si la carga falla, no hay anuncio', async () => {
    const t = fake();
    t.fail.prepare = true;
    expect(await t.provider.load('tienda')).toBe(false);
  });

  it('un hueco sin bloque no carga ni inicia el SDK', async () => {
    const t = fake({ units: { tienda: 'unidad-tienda' }, testing: false });
    expect(await t.provider.load('pausa')).toBe(false);
    expect(t.calls).toEqual([]);
  });
});

describe('proveedor de AdMob: enseñar', () => {
  it('visto entero: el premio sale del aviso «rewarded»', async () => {
    const t = fake();
    const shown = t.provider.show('tienda');
    await settle();
    expect(t.calls).toEqual(['show:tienda']);
    t.fire('tienda:showed');
    t.fire('tienda:rewarded');
    t.fire('tienda:dismissed');
    expect(await shown).toEqual({ shown: true, rewarded: true });
  });

  it('cerrado antes de tiempo: enseñado, sin premio', async () => {
    const t = fake();
    const shown = t.provider.show('pausa');
    await settle();
    t.fire('pausa:showed');
    t.fire('pausa:dismissed');
    expect(await shown).toEqual({ shown: true, rewarded: false });
  });

  it('escucha los avisos de su hueco, no los del otro', async () => {
    const t = fake();
    const shown = t.provider.show('pausa');
    await settle();
    expect([...t.handlers.keys()].every((key) => key.startsWith('pausa:'))).toBe(true);
    t.fire('pausa:dismissed');
    await shown;
  });

  it('no se pudo enseñar', async () => {
    const t = fake();
    const shown = t.provider.show('tienda');
    await settle();
    t.fire('tienda:failed');
    expect(await shown).toEqual({ shown: false, rewarded: false });
  });

  it('si la llamada falla antes de abrirse, no se enseñó', async () => {
    const t = fake();
    t.fail.show = true;
    expect(await t.provider.show('tienda')).toEqual({ shown: false, rewarded: false });
  });

  it('si no se pueden escuchar los avisos, no se enseña nada', async () => {
    const t = fake();
    t.fail.on = true;
    expect(await t.provider.show('tienda')).toEqual({ shown: false, rewarded: false });
    expect(t.calls).toEqual([]);
  });

  it('vigilante: si el SDK no avisa de que se abrió, a los 10 segundos se da por fallido', async () => {
    const t = fake();
    const shown = t.provider.show('tienda');
    await settle();
    expect(t.timers.map((timer) => timer.ms)).toEqual([SHOW_TIMEOUT_MS]);
    t.timers[0]!.fn();
    expect(await shown).toEqual({ shown: false, rewarded: false });
  });

  it('una vez abierto el anuncio, el vigilante de apertura se retira y queda el tope de cierre', async () => {
    const t = fake();
    const shown = t.provider.show('tienda');
    await settle();
    t.fire('tienda:showed');
    expect(t.timers.map((timer) => timer.ms)).toEqual([OPEN_TIMEOUT_MS]);
    t.fire('tienda:dismissed');
    expect(await shown).toEqual({ shown: true, rewarded: false });
  });

  it('al acabar deja de escuchar y un aviso tardío no cambia nada', async () => {
    const t = fake();
    const shown = t.provider.show('tienda');
    await settle();
    t.fire('tienda:showed');
    t.fire('tienda:dismissed');
    const result = await shown;
    await settle();
    expect(t.handlers.size).toBe(0);
    expect(t.timers).toEqual([]);
    expect(result).toEqual({ shown: true, rewarded: false });
  });

  it('un premio que llega sin cierre no resuelve: se espera al cierre', async () => {
    const t = fake();
    let done = false;
    const shown = t.provider.show('tienda').then((result) => {
      done = true;
      return result;
    });
    await settle();
    t.fire('tienda:showed');
    t.fire('tienda:rewarded');
    await settle();
    expect(done).toBe(false);
    t.fire('tienda:dismissed');
    expect(await shown).toEqual({ shown: true, rewarded: true });
  });
});

describe('proveedor de AdMob: el anuncio se abre y el SDK no avisa de que se cerró', () => {
  it('pasado el tope se da por cerrado, para que el juego no se quede parado', async () => {
    const t = fake();
    const result = t.provider.show('tienda');
    await settle();
    t.fire('tienda:showed');
    expect(t.timers.map((timer) => timer.ms)).toEqual([OPEN_TIMEOUT_MS]);
    t.timers[0]!.fn();
    expect(await result).toEqual({ shown: true, rewarded: false });
  });

  it('si el premio ya estaba ganado, se conserva', async () => {
    const t = fake();
    const result = t.provider.show('pausa');
    await settle();
    t.fire('pausa:showed');
    t.fire('pausa:rewarded');
    t.timers[0]!.fn();
    expect(await result).toEqual({ shown: true, rewarded: true });
  });

  it('al cerrarse a tiempo, el tope se retira', async () => {
    const t = fake();
    const result = t.provider.show('tienda');
    await settle();
    t.fire('tienda:showed');
    t.fire('tienda:dismissed');
    await result;
    expect(t.timers).toEqual([]);
  });
});
