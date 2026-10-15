import { describe, expect, it } from 'vitest';
import {
  communityUrl, daysLeft, drawingName, emptyMemory, hasUnseen, localized, parseMemory, parseStatus, pollPhase,
  shouldNotify, shouldNotifyWinner, wallKey, type CommunityStatus,
} from '../../src/core/community';

const raw = () => ({
  hoy: '2026-11-03',
  ideas: 127,
  votacion: {
    id: '2026-11-a', abre: '2026-11-01', cierra: '2026-11-15', ganadora: null, abierta: true,
    opciones: [
      { id: 'delfines', titulo: { es: 'Delfines', en: 'Dolphins' }, dibujo: 'delfines.png', ideaDe: 'Lucía' },
      { id: 'koalas', titulo: { es: 'Koalas', en: 'Koalas' }, dibujo: 'koalas.png' },
    ],
    reparto: { delfines: 65, koalas: 35 },
  },
  muro: [{ titulo: { es: 'Pingüinos', en: 'Penguins' }, dibujo: 'pinguinos.png', ideaDe: 'Adrián', estado: 'hecha', recinto: 'pinguinos' }],
});

const status = (patch: (r: ReturnType<typeof raw>) => unknown = (r) => r): CommunityStatus => parseStatus(patch(raw()))!;

describe('parseStatus', () => {
  it('acepta la respuesta del servidor', () => {
    const s = status();
    expect(s.ideas).toBe(127);
    expect(s.votacion?.opciones.map((o) => o.id)).toEqual(['delfines', 'koalas']);
    expect(s.votacion?.opciones[1]?.ideaDe).toBeNull();
    expect(s.muro[0]?.recinto).toBe('pinguinos');
  });

  it('sin votación', () => {
    expect(status((r) => ({ ...r, votacion: null })).votacion).toBeNull();
  });

  it('rechaza lo que no tiene forma de respuesta', () => {
    for (const bad of [null, 'x', [], {}, { ...raw(), hoy: 'ayer' }, { ...raw(), ideas: -1 }, { ...raw(), muro: 'x' }]) {
      expect(parseStatus(bad)).toBeNull();
    }
  });

  it('una votación rota se queda en «sin votación» y no tira el muro', () => {
    const s = status((r) => ({ ...r, votacion: { ...r.votacion, opciones: [r.votacion.opciones[0]] } }));
    expect(s.votacion).toBeNull();
    expect(s.muro).toHaveLength(1);
  });

  it('recorta títulos a 30 y nombres a 20, y descarta dibujos con rutas', () => {
    const s = status((r) => ({
      ...r,
      muro: [{ ...r.muro[0], titulo: { es: 'A'.repeat(50), en: 'B' }, ideaDe: 'Maximiliano Alejandro Luis', dibujo: '../x.png' }],
    }));
    expect(s.muro[0]?.titulo.es).toHaveLength(30);
    expect(s.muro[0]?.ideaDe).toBe('Maximiliano Alejandr');
    expect(s.muro[0]?.dibujo).toBeNull();
  });

  it('descarta entradas del muro mal formadas y se queda con las buenas', () => {
    const s = status((r) => ({ ...r, muro: [{ estado: 'hecha' }, r.muro[0], { ...r.muro[0], estado: 'rara' }] }));
    expect(s.muro).toHaveLength(1);
  });

  it('el reparto se lee solo de opciones que existen, entre 0 y 100', () => {
    const s = status((r) => ({ ...r, votacion: { ...r.votacion, reparto: { delfines: 140, vieja: 50 } } }));
    expect(s.votacion?.reparto).toEqual({ delfines: 100, koalas: 0 });
  });
});

describe('fase de la votación', () => {
  it('abierta, votada, cerrada y sin votación', () => {
    const memory = emptyMemory();
    expect(pollPhase(status(), memory)).toBe('open');
    expect(pollPhase(status(), { ...memory, voted: { '2026-11-a': 'koalas' } })).toBe('voted');
    expect(pollPhase(status((r) => ({ ...r, votacion: { ...r.votacion, abierta: false } })), memory)).toBe('closed');
    expect(pollPhase(status((r) => ({ ...r, votacion: null })), memory)).toBe('none');
  });

  it('un voto de otra votación no cuenta', () => {
    expect(pollPhase(status(), { ...emptyMemory(), voted: { '2026-10-a': 'koalas' } })).toBe('open');
  });

  it('días que quedan, contando hoy; el último día queda 1', () => {
    expect(daysLeft(status())).toBe(13);
    expect(daysLeft(status((r) => ({ ...r, hoy: '2026-11-15' })))).toBe(1);
    expect(daysLeft(status((r) => ({ ...r, hoy: '2026-11-20' })))).toBe(0);
    expect(daysLeft(status((r) => ({ ...r, votacion: null })))).toBe(0);
  });

  it('el cambio de mes también cuenta bien', () => {
    expect(daysLeft(status((r) => ({ ...r, hoy: '2026-10-31', votacion: { ...r.votacion, cierra: '2026-11-02' } })))).toBe(3);
  });
});

describe('qué hay sin ver', () => {
  it('votación abierta sin votar', () => {
    expect(hasUnseen(status(), { ...emptyMemory(), wallSeen: wallKey(status().muro[0]!) })).toBe(true);
  });

  it('nada nuevo', () => {
    const s = status();
    expect(hasUnseen(s, { ...emptyMemory(), voted: { '2026-11-a': 'delfines' }, wallSeen: wallKey(s.muro[0]!) })).toBe(false);
  });

  it('ganadora nueva', () => {
    const s = status((r) => ({ ...r, votacion: { ...r.votacion, abierta: false, ganadora: 'delfines' }, muro: [] }));
    expect(hasUnseen(s, emptyMemory())).toBe(true);
    expect(hasUnseen(s, { ...emptyMemory(), winnerSeen: '2026-11-a' })).toBe(false);
  });

  it('entrada nueva en el muro', () => {
    const s = status((r) => ({ ...r, votacion: null }));
    expect(hasUnseen(s, emptyMemory())).toBe(true);
    expect(hasUnseen(s, { ...emptyMemory(), wallSeen: wallKey(s.muro[0]!) })).toBe(false);
  });

  it('el aviso salta una vez por votación abierta y no si ya se votó', () => {
    const s = status();
    const veteran = { ...emptyMemory(), firstDay: '2026-11-01' };
    expect(shouldNotify(s, veteran, '2026-11-03')).toBe(true);
    expect(shouldNotify(s, { ...veteran, noticed: '2026-11-a' }, '2026-11-03')).toBe(false);
    expect(shouldNotify(s, { ...veteran, voted: { '2026-11-a': 'koalas' } }, '2026-11-03')).toBe(false);
    expect(shouldNotify(status((r) => ({ ...r, votacion: { ...r.votacion, abierta: false } })), veteran, '2026-11-03')).toBe(false);
  });

  it('el aviso de la ganadora salta una vez, si no la ha visto, y nunca el primer día', () => {
    const s = status((r) => ({ ...r, votacion: { ...r.votacion, abierta: false, ganadora: 'koalas' } }));
    const veteran = { ...emptyMemory(), firstDay: '2026-11-01' };
    expect(shouldNotifyWinner(s, veteran, '2026-11-20')).toBe(true);
    expect(shouldNotifyWinner(s, { ...veteran, winnerNoticed: '2026-11-a' }, '2026-11-20')).toBe(false);
    expect(shouldNotifyWinner(s, { ...veteran, winnerSeen: '2026-11-a' }, '2026-11-20')).toBe(false);
    expect(shouldNotifyWinner(s, { ...veteran, firstDay: '2026-11-20' }, '2026-11-20')).toBe(false);
    expect(shouldNotifyWinner(status(), veteran, '2026-11-03')).toBe(false);
  });

  it('el primer día de juego no hay aviso', () => {
    const s = status();
    expect(shouldNotify(s, emptyMemory(), '2026-11-03')).toBe(false);
    expect(shouldNotify(s, { ...emptyMemory(), firstDay: '2026-11-03' }, '2026-11-03')).toBe(false);
    expect(shouldNotify(s, { ...emptyMemory(), firstDay: '2026-11-02' }, '2026-11-03')).toBe(true);
  });
});

describe('memoria del aparato', () => {
  it('vacía si no hay nada o está rota', () => {
    expect(parseMemory(null)).toEqual(emptyMemory());
    expect(parseMemory('{rota')).toEqual(emptyMemory());
    expect(parseMemory('[]')).toEqual(emptyMemory());
  });

  it('se lee lo guardado y se limpia lo raro', () => {
    const saved = JSON.stringify({ voted: { '2026-11-a': 'koalas', mal: 3 }, noticed: '2026-11-a', winnerSeen: 7, wallSeen: 'x', hinted: true, last: raw() });
    const m = parseMemory(saved);
    expect(m.voted).toEqual({ '2026-11-a': 'koalas' });
    expect(m.noticed).toBe('2026-11-a');
    expect(m.winnerSeen).toBeNull();
    expect(m.hinted).toBe(true);
    expect(m.last?.ideas).toBe(127);
  });
});

describe('ayudas', () => {
  it('texto en el idioma del juego', () => {
    expect(localized({ es: 'Delfines', en: 'Dolphins' }, 'en')).toBe('Dolphins');
  });

  it('nombres de dibujo', () => {
    expect(drawingName('delfines-2.png')).toBe('delfines-2.png');
    for (const bad of ['../a.png', 'a/b.png', 'A.png', 'a.jpg', '', 3, null]) expect(drawingName(bad)).toBeNull();
  });
});

describe('communityUrl', () => {
  it('https sin barra final; nada si falta o no es una dirección segura', () => {
    expect(communityUrl({ VITE_COMMUNITY_URL: 'https://api.zooesponji.com/' })).toBe('https://api.zooesponji.com');
    expect(communityUrl({ VITE_COMMUNITY_URL: ' https://api.zooesponji.com ' })).toBe('https://api.zooesponji.com');
    expect(communityUrl({ VITE_COMMUNITY_URL: 'http://api.zooesponji.com' })).toBeNull();
    expect(communityUrl({ VITE_COMMUNITY_URL: 'http://localhost:8080' })).toBe('http://localhost:8080');
    expect(communityUrl({ VITE_COMMUNITY_URL: '' })).toBeNull();
    expect(communityUrl({})).toBeNull();
  });
});
