import { describe, expect, it } from 'vitest';
import { UPDATE_KEY, type UpdateKey } from '../../src/core/updatePolicy';
import type { PlayUpdateInfo, PlayUpdateResult, PlayUpdater } from '../../src/systems/appUpdate';
import { EventBus, type GameEvents } from '../../src/systems/events';
import { createMemoryStore } from '../../src/systems/storage';
import { UpdateNotice } from '../../src/systems/updateNotice';
import type { UpdateNoticeData } from '../../src/scenes/UpdateNoticeScene';

const BIG: UpdateKey = { minima: 10, ultima: 14, grande: true };
const SMALL: UpdateKey = { minima: 10, ultima: 14, grande: false };

interface Options {
  native?: boolean;
  key?: UpdateKey | null;
  community?: boolean;
  info?: Partial<PlayUpdateInfo> | 'throws';
  results?: PlayUpdateResult[];
  active?: string[];
  stored?: string;
}

function make(o: Options = {}) {
  let day = '2026-11-20';
  let active = o.active ?? ['Title'];
  const shown: UpdateNoticeData[] = [];
  let closed = 0;
  const immediate: PlayUpdateResult[] = [];
  const results = [...(o.results ?? ['cancelada'])];
  const play: PlayUpdater = {
    info: async () => {
      if (o.info === 'throws') throw new Error('Play');
      return { available: true, immediateAllowed: true, versionCode: 12, ...(o.info ?? {}) };
    },
    immediate: async () => {
      const r = results.length > 1 ? results.shift()! : results[0]!;
      immediate.push(r);
      return r;
    },
  };
  const events = new EventBus<GameEvents>();
  const log: string[] = [];
  for (const name of ['update-offered', 'update-accepted', 'update-later', 'update-forced', 'update-failed'] as const) {
    events.on(name, (p) => log.push(`${name}:${JSON.stringify(p)}`));
  }
  const store = createMemoryStore(o.stored ? { [UPDATE_KEY]: o.stored } : {});
  const notice = new UpdateNotice({
    native: o.native ?? true,
    store,
    events,
    community: () => (o.community === false ? null : { liveUpdateKey: () => (o.key === undefined ? BIG : o.key) }),
    play: () => play,
    activeScenes: () => active,
    show: (data) => {
      shown.push(data);
      active = [...active, 'UpdateNotice'];
    },
    close: () => {
      closed += 1;
      active = active.filter((k) => k !== 'UpdateNotice');
    },
    today: () => day,
  });
  return {
    notice, shown, immediate, log, store,
    closed: () => closed,
    setDay: (d: string) => { day = d; },
    setActive: (a: string[]) => { active = a; },
    /** Lo que haría la escena al pulsar «luego»: se cierra sola y avisa. */
    later: () => { active = active.filter((k) => k !== 'UpdateNotice'); shown.at(-1)!.onLater(); },
    accept: () => { if (shown.at(-1)!.mode === 'suave') active = active.filter((k) => k !== 'UpdateNotice'); shown.at(-1)!.onAccept(); },
  };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('UpdateNotice: cuándo no hace nada', () => {
  it('fuera de Android nativo', async () => {
    const t = make({ native: false });
    await t.notice.start();
    await t.notice.check();
    expect(t.shown).toEqual([]);
    expect(t.immediate).toEqual([]);
  });
  it('sin respuesta del servidor en esta sesión (o sin tablón)', async () => {
    for (const t of [make({ key: null }), make({ community: false })]) {
      await t.notice.start();
      await t.notice.check();
      expect(t.shown).toEqual([]);
    }
  });
  it('Play dice «no disponible» o «no permitido»: nunca bloquea ni avisa, ni siquiera la rota', async () => {
    for (const info of [{ available: false }, { immediateAllowed: false }, { versionCode: null }]) {
      const t = make({ key: { minima: 13, ultima: 14, grande: true }, info });
      await t.notice.start();
      await t.notice.check();
      expect(t.shown, JSON.stringify(info)).toEqual([]);
      expect(t.immediate, JSON.stringify(info)).toEqual([]);
    }
  });
  it('Play lanza: nada', async () => {
    const t = make({ info: 'throws' });
    await t.notice.start();
    await expect(t.notice.check()).resolves.toBeUndefined();
    expect(t.shown).toEqual([]);
  });
  it('momento no seguro: nada y no gasta el aviso del día', async () => {
    const t = make({ active: ['World', 'Hud', 'Feed'] });
    await t.notice.start();
    await t.notice.check();
    expect(t.shown).toEqual([]);
    t.setActive(['World', 'Hud']);
    await t.notice.check();
    expect(t.shown).toHaveLength(1);
  });
  it('versión al día: nada', async () => {
    const t = make({ info: { versionCode: 14 } });
    await t.notice.start();
    await t.notice.check();
    expect(t.shown).toEqual([]);
  });
});

describe('UpdateNotice: ventana suave', () => {
  it('sale, se anota el día y «luego» suma una aplazada', async () => {
    const t = make({ key: SMALL });
    await t.notice.start();
    await t.notice.check();
    expect(t.shown).toHaveLength(1);
    expect(t.shown[0]).toMatchObject({ mode: 'suave', kind: 'pequena' });
    expect(JSON.parse((await t.store.get(UPDATE_KEY))!)).toEqual({ ultima: 14, aplazadas: 0, ultimoAviso: '2026-11-20' });
    t.later();
    expect(JSON.parse((await t.store.get(UPDATE_KEY))!)).toEqual({ ultima: 14, aplazadas: 1, ultimoAviso: '2026-11-20' });
    expect(t.log).toEqual(['update-offered:{"kind":"pequena"}', 'update-later:{"kind":"pequena","deferred":1}']);
    // el mismo día ya no vuelve a salir
    await t.notice.check();
    expect(t.shown).toHaveLength(1);
  });
  it('dos comprobaciones seguidas (título reiniciado, servidor y vuelta a la app a la vez): un solo aviso', async () => {
    const t = make({ key: SMALL });
    await t.notice.start();
    await Promise.all([t.notice.check(), t.notice.check(), t.notice.check()]);
    expect(t.shown).toHaveLength(1);
    expect(t.log.filter((l) => l.startsWith('update-offered'))).toHaveLength(1);
  });
  it('«actualizar» lanza la ventana de Play; si se cancela cuenta como aplazada y queda el fallo', async () => {
    const t = make({ key: SMALL, results: ['cancelada'] });
    await t.notice.start();
    await t.notice.check();
    t.accept();
    await flush();
    expect(t.immediate).toEqual(['cancelada']);
    expect(t.log).toContain('update-accepted:{"kind":"pequena"}');
    expect(t.log).toContain('update-failed:{"kind":"pequena"}');
    expect(JSON.parse((await t.store.get(UPDATE_KEY))!).aplazadas).toBe(1);
    expect(t.shown).toHaveLength(1);
  });
  it('lee la memoria guardada: con tres aplazadas de la pequeña ya no avisa', async () => {
    const t = make({ key: SMALL, stored: JSON.stringify({ ultima: 14, aplazadas: 3, ultimoAviso: '2026-11-01' }) });
    await t.notice.start();
    await t.notice.check();
    expect(t.shown).toEqual([]);
  });
});

describe('UpdateNotice: obligatoria', () => {
  it('grande: dos «luego» en días distintos y a la tercera la ventana de Play; si se cancela, el bloqueo', async () => {
    const t = make({ key: BIG, results: ['cancelada'] });
    await t.notice.start();
    await t.notice.check();
    t.later();
    t.setDay('2026-11-21');
    await t.notice.check();
    t.later();
    t.setDay('2026-11-22');
    await t.notice.check();
    expect(t.immediate).toEqual(['cancelada']);
    expect(t.shown.map((s) => s.mode)).toEqual(['suave', 'suave', 'bloqueo']);
    expect(t.log).toContain('update-forced:{"kind":"grande"}');
    expect(t.log).toContain('update-failed:{"kind":"grande"}');
    expect(t.log.filter((l) => l.startsWith('update-offered'))).toHaveLength(3);
  });
  it('rota: la ventana de Play ya, sin oportunidades', async () => {
    const t = make({ key: { minima: 13, ultima: 14, grande: false }, results: ['actualizada'] });
    await t.notice.start();
    await t.notice.check();
    expect(t.immediate).toEqual(['actualizada']);
    expect(t.shown).toEqual([]);
    expect(t.log).toEqual(['update-forced:{"kind":"rota"}']);
  });
  it('el bloqueo: el botón vuelve a intentar; cancelar lo deja; si Play acepta, se va', async () => {
    const t = make({ key: { minima: 13, ultima: 14, grande: false }, results: ['cancelada', 'cancelada', 'actualizada'] });
    await t.notice.start();
    await t.notice.check();
    expect(t.shown.map((s) => s.mode)).toEqual(['bloqueo']);
    t.accept();
    await flush();
    expect(t.closed()).toBe(0);
    t.accept();
    await flush();
    expect(t.immediate).toEqual(['cancelada', 'cancelada', 'actualizada']);
    expect(t.closed()).toBe(1);
    expect(t.log.filter((l) => l.startsWith('update-accepted'))).toHaveLength(2);
  });
  it('si Play falla (no cancela) no se queda bloqueado: sin bloqueo y se puede jugar', async () => {
    const t = make({ key: { minima: 13, ultima: 14, grande: false }, results: ['fallo'] });
    await t.notice.start();
    await t.notice.check();
    expect(t.shown).toEqual([]);
    expect(t.log).toEqual(['update-forced:{"kind":"rota"}', 'update-failed:{"kind":"rota"}']);
  });
  it('si en el bloqueo Play falla o ya no está disponible, se cierra el bloqueo', async () => {
    for (const second of ['fallo', 'no-disponible'] as const) {
      const t = make({ key: { minima: 13, ultima: 14, grande: false }, results: ['cancelada', second] });
      await t.notice.start();
      await t.notice.check();
      t.accept();
      await flush();
      expect(t.closed(), second).toBe(1);
    }
  });
  it('rota con el bloqueo ya abierto: otra comprobación no abre otro', async () => {
    const t = make({ key: { minima: 13, ultima: 14, grande: false }, results: ['cancelada'] });
    await t.notice.start();
    await t.notice.check();
    await t.notice.check();
    expect(t.shown).toHaveLength(1);
    expect(t.immediate).toHaveLength(1);
  });
});
