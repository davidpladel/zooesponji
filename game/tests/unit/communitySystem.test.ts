import { afterEach, describe, expect, it, vi } from 'vitest';
import { COMMUNITY_KEY } from '../../src/core/community';
import { Community, type FetchLike } from '../../src/systems/community';
import { EventBus, type GameEvents } from '../../src/systems/events';
import { createMemoryStore } from '../../src/systems/storage';

const STATUS = {
  hoy: '2026-11-03', ideas: 12,
  votacion: {
    id: '2026-11-a', abre: '2026-11-01', cierra: '2026-11-15', ganadora: null, abierta: true,
    opciones: [
      { id: 'delfines', titulo: { es: 'Delfines', en: 'Dolphins' }, dibujo: 'delfines.png' },
      { id: 'koalas', titulo: { es: 'Koalas', en: 'Koalas' }, dibujo: null },
    ],
    reparto: { delfines: 50, koalas: 50 },
  },
  muro: [],
};

interface Call { url: string; method: string; body: unknown }

/** Red falsa: cada ruta responde lo que se le diga; `null` = sin conexión. */
function fakeNet(routes: Record<string, () => { status: number; body: unknown } | null>) {
  const calls: Call[] = [];
  const fetch: FetchLike = async (url, init) => {
    calls.push({ url, method: init?.method ?? 'GET', body: init?.body ? JSON.parse(init.body) : null });
    const path = url.replace('https://api.test', '');
    const answer = routes[path]?.() ?? null;
    if (!answer) throw new TypeError('Failed to fetch');
    return { ok: answer.status >= 200 && answer.status < 300, status: answer.status, json: async () => answer.body };
  };
  return { fetch, calls };
}

function make(routes: Record<string, () => { status: number; body: unknown } | null>, initial: Record<string, string> = {}) {
  const net = fakeNet(routes);
  const store = createMemoryStore(initial);
  const events = new EventBus<GameEvents>();
  const updates: number[] = [];
  events.on('community-updated', () => updates.push(1));
  const community = new Community({ baseUrl: 'https://api.test', fetch: net.fetch, store, events });
  return { community, net, store, events, updates };
}

const ok = (body: unknown = STATUS) => () => ({ status: 200, body });

describe('Community', () => {
  it('pide el estado al arrancar y avisa', async () => {
    const { community, net, updates } = make({ '/estado.php': ok() });
    await community.start();
    expect(net.calls[0]).toMatchObject({ url: 'https://api.test/estado.php', method: 'GET' });
    expect(community.online).toBe(true);
    expect(community.phase()).toBe('open');
    expect(updates).toHaveLength(1);
  });

  it('sin conexión y sin nada guardado: no hay estado y no lanza', async () => {
    const { community, updates } = make({});
    await community.start();
    expect(community.status).toBeNull();
    expect(community.online).toBe(false);
    expect(community.phase()).toBe('none');
    expect(updates).toHaveLength(1);
  });

  it('sin conexión enseña lo último guardado', async () => {
    const saved = JSON.stringify({ last: STATUS });
    const { community } = make({}, { [COMMUNITY_KEY]: saved });
    await community.start();
    expect(community.online).toBe(false);
    expect(community.status?.ideas).toBe(12);
  });

  it('una respuesta mal formada es «sin conexión» y no pisa lo guardado', async () => {
    const { community } = make({ '/estado.php': ok({ hoy: 'nada' }) }, { [COMMUNITY_KEY]: JSON.stringify({ last: STATUS }) });
    await community.start();
    expect(community.online).toBe(false);
    expect(community.status?.ideas).toBe(12);
  });

  it('guarda la última respuesta válida', async () => {
    const { community, store } = make({ '/estado.php': ok() });
    await community.start();
    expect(JSON.parse((await store.get(COMMUNITY_KEY))!).last.ideas).toBe(12);
  });

  it('vota, anota el voto y pone el reparto nuevo', async () => {
    const { community, net, store, events } = make({
      '/estado.php': ok(),
      '/voto.php': ok({ ok: true, reparto: { delfines: 65, koalas: 35 } }),
    });
    const voted: GameEvents['board-voted'][] = [];
    events.on('board-voted', (e) => voted.push(e));
    await community.start();
    expect(await community.vote('delfines')).toBe('ok');
    expect(net.calls[1]).toMatchObject({ method: 'POST', body: { votacion: '2026-11-a', opcion: 'delfines' } });
    expect(community.phase()).toBe('voted');
    expect(community.status?.votacion?.reparto).toEqual({ delfines: 65, koalas: 35 });
    expect(JSON.parse((await store.get(COMMUNITY_KEY))!).voted).toEqual({ '2026-11-a': 'delfines' });
    expect(voted).toEqual([{ poll: '2026-11-a', option: 'delfines', changed: false }]);
  });

  it('cambiar el voto envía la opción anterior', async () => {
    const { community, net } = make({ '/estado.php': ok(), '/voto.php': ok({ ok: true, reparto: {} }) });
    await community.start();
    await community.vote('delfines');
    await community.vote('koalas');
    expect(net.calls[2]?.body).toEqual({ votacion: '2026-11-a', opcion: 'koalas', anterior: 'delfines' });
    expect(community.memory.voted['2026-11-a']).toBe('koalas');
  });

  it('votar lo mismo otra vez no envía nada (no suma dos veces)', async () => {
    const { community, net } = make({ '/estado.php': ok(), '/voto.php': ok({ ok: true, reparto: {} }) });
    await community.start();
    await community.vote('delfines');
    expect(await community.vote('delfines')).toBe('ok');
    expect(net.calls.filter((c) => c.url.endsWith('/voto.php'))).toHaveLength(1);
  });

  it('dos toques seguidos mientras se envía: un solo voto', async () => {
    const { community, net } = make({ '/estado.php': ok(), '/voto.php': ok({ ok: true, reparto: {} }) });
    await community.start();
    await Promise.all([community.vote('delfines'), community.vote('delfines')]);
    expect(net.calls.filter((c) => c.url.endsWith('/voto.php'))).toHaveLength(1);
  });

  it('voto rechazado por cierre: no se anota y se refresca el estado', async () => {
    let closed = false;
    const { community } = make({
      '/estado.php': () => ({ status: 200, body: closed ? { ...STATUS, votacion: { ...STATUS.votacion, abierta: false } } : STATUS }),
      '/voto.php': () => {
        closed = true;
        return { status: 409, body: { error: 'cerrada' } };
      },
    });
    await community.start();
    expect(await community.vote('delfines')).toBe('closed');
    expect(community.memory.voted).toEqual({});
    expect(community.phase()).toBe('closed');
  });

  it('voto sin conexión: no se anota', async () => {
    const { community } = make({ '/estado.php': ok() });
    await community.start();
    expect(await community.vote('delfines')).toBe('offline');
    expect(community.memory.voted).toEqual({});
  });

  it('una opción que no existe no se envía', async () => {
    const { community, net } = make({ '/estado.php': ok(), '/voto.php': ok({ ok: true, reparto: {} }) });
    await community.start();
    expect(await community.vote('jirafas')).toBe('closed');
    expect(net.calls).toHaveLength(1);
  });

  it('el primer día de juego no hay aviso; otro día, sí', async () => {
    let day = '2026-11-03';
    const net = fakeNet({ '/estado.php': ok() });
    const store = createMemoryStore();
    const community = new Community({ baseUrl: 'https://api.test', fetch: net.fetch, store, events: new EventBus<GameEvents>(), today: () => day });
    await community.start();
    expect(community.notify()).toBe(false);
    expect(JSON.parse((await store.get(COMMUNITY_KEY))!).firstDay).toBe('2026-11-03');
    day = '2026-11-04';
    expect(community.notify()).toBe(true);
  });

  it('marcas de visto: aviso, ganadora, muro y tendero', async () => {
    const { community, store } = make({ '/estado.php': ok() }, { [COMMUNITY_KEY]: JSON.stringify({ firstDay: '2000-01-01' }) });
    await community.start();
    expect(community.notify()).toBe(true);
    community.markNoticed();
    expect(community.notify()).toBe(false);
    community.markHinted();
    await Promise.resolve();
    const saved = JSON.parse((await store.get(COMMUNITY_KEY))!);
    expect(saved.noticed).toBe('2026-11-a');
    expect(saved.hinted).toBe(true);
  });

  it('el almacén roto no impide nada', async () => {
    const net = fakeNet({ '/estado.php': ok(), '/voto.php': ok({ ok: true, reparto: {} }) });
    const store = { get: async () => { throw new Error('roto'); }, set: async () => { throw new Error('roto'); } };
    const community = new Community({ baseUrl: 'https://api.test', fetch: net.fetch, store, events: new EventBus<GameEvents>() });
    await community.start();
    expect(community.phase()).toBe('open');
    expect(await community.vote('delfines')).toBe('ok');
  });

  it('dirección de los dibujos: solo nombres válidos', () => {
    const { community } = make({});
    expect(community.drawingUrl('delfines.png')).toBe('https://api.test/dibujo.php?f=delfines.png');
    expect(community.drawingUrl('../x.png')).toBeNull();
    expect(community.drawingUrl(null)).toBeNull();
  });

  describe('cuerpo colgado', () => {
    afterEach(() => vi.useRealTimers());

    it('si el 200 llega y el cuerpo no, acaba tras el límite y el voto cuenta como hecho (el servidor ya lo sumó)', async () => {
      vi.useFakeTimers();
      const fetch: FetchLike = async (url) => {
        if (url.endsWith('/estado.php')) return { ok: true, status: 200, json: async () => STATUS };
        return { ok: true, status: 200, json: () => new Promise<unknown>(() => undefined) };
      };
      const store = createMemoryStore();
      const community = new Community({ baseUrl: 'https://api.test', fetch, store, events: new EventBus<GameEvents>() });
      await community.start();
      const result = community.vote('delfines');
      await vi.advanceTimersByTimeAsync(10_000);
      expect(await result).toBe('ok');
      expect(community.memory.voted['2026-11-a']).toBe('delfines');
      expect(await store.get(COMMUNITY_KEY)).toContain('delfines');
    });
  });
});
