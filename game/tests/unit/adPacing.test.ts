import { describe, expect, it } from 'vitest';
import {
  DAILY_MAX, GAP_S, PAUSE_SESSION_S, SESSION_MIN_S,
  canOffer, emptyPacing, newAdSession, parsePacing, resolvePanel, rollDay, secondsUntil, tick,
  type AdPacingState, type AdSessionState,
} from '../../src/core/adPacing';

const TODAY = '2026-10-12';
const played = (seconds: number, session: AdSessionState = newAdSession()): AdSessionState => ({ ...session, sessionPlay: seconds });
const pacing = (change: Partial<AdPacingState> = {}): AdPacingState => ({ ...emptyPacing(TODAY), ...change });

describe('las constantes son las de la spec', () => {
  it('5 minutos de partida, 15 entre paneles, 15 para la pausa y 4 al día', () => {
    expect([SESSION_MIN_S, GAP_S, PAUSE_SESSION_S, DAILY_MAX]).toEqual([300, 900, 900, 4]);
  });
});

describe('panel de la tienda', () => {
  it('no salta con 299 segundos de partida y sí con 300', () => {
    expect(canOffer('tienda', pacing(), played(299), TODAY)).toBe(false);
    expect(canOffer('tienda', pacing(), played(300), TODAY)).toBe(true);
  });

  it('tras un panel no salta con 899 segundos y sí con 900', () => {
    expect(canOffer('tienda', pacing({ sinceLast: 899 }), played(5000), TODAY)).toBe(false);
    expect(canOffer('tienda', pacing({ sinceLast: 900 }), played(5000), TODAY)).toBe(true);
  });

  it('si nunca ha habido panel, solo cuenta el rato de partida', () => {
    expect(canOffer('tienda', pacing({ sinceLast: null }), played(300), TODAY)).toBe(true);
  });

  it('con 3 anuncios hoy salta y con 4 no', () => {
    expect(canOffer('tienda', pacing({ shown: 3 }), played(300), TODAY)).toBe(true);
    expect(canOffer('tienda', pacing({ shown: 4 }), played(300), TODAY)).toBe(false);
  });

  it('puede saltar aunque ya se haya visto un anuncio en la partida', () => {
    const session = { ...played(5000), seenInSession: true, pauseOffered: true };
    expect(canOffer('tienda', pacing({ sinceLast: 900, shown: 1 }), session, TODAY)).toBe(true);
  });
});

describe('panel de la pausa', () => {
  it('no salta con 899 segundos de partida y sí con 900', () => {
    expect(canOffer('pausa', pacing(), played(899), TODAY)).toBe(false);
    expect(canOffer('pausa', pacing(), played(900), TODAY)).toBe(true);
  });

  it('solo una vez por partida', () => {
    expect(canOffer('pausa', pacing({ sinceLast: 900 }), { ...played(5000), pauseOffered: true }, TODAY)).toBe(false);
  });

  it('no salta si en la partida ya se ha visto un anuncio', () => {
    expect(canOffer('pausa', pacing({ sinceLast: 900 }), { ...played(5000), seenInSession: true }, TODAY)).toBe(false);
  });

  it('respeta la espera entre paneles y el tope del día', () => {
    expect(canOffer('pausa', pacing({ sinceLast: 899 }), played(5000), TODAY)).toBe(false);
    expect(canOffer('pausa', pacing({ shown: 4 }), played(5000), TODAY)).toBe(false);
  });
});

describe('cuánto falta', () => {
  it('es lo que más tarde de cumplirse', () => {
    expect(secondsUntil('tienda', pacing(), played(240), TODAY)).toBe(60);
    expect(secondsUntil('tienda', pacing({ sinceLast: 100 }), played(5000), TODAY)).toBe(800);
    expect(secondsUntil('pausa', pacing(), played(300), TODAY)).toBe(600);
    expect(secondsUntil('tienda', pacing(), played(9999), TODAY)).toBe(0);
  });

  it('es infinito si ya no puede saltar en esta partida o este día', () => {
    expect(secondsUntil('tienda', pacing({ shown: 4 }), played(0), TODAY)).toBe(Infinity);
    expect(secondsUntil('pausa', pacing(), { ...played(0), pauseOffered: true }, TODAY)).toBe(Infinity);
  });
});

describe('el tiempo de juego', () => {
  it('suma a la partida y a la espera', () => {
    const next = tick(pacing({ sinceLast: 10 }), played(100), 5);
    expect(next.session.sessionPlay).toBe(105);
    expect(next.state.sinceLast).toBe(15);
  });

  it('si nunca ha habido panel, la espera sigue sin empezar', () => {
    expect(tick(pacing(), played(0), 5).state.sinceLast).toBeNull();
  });

  it.each([0, -3, Number.NaN])('ignora %s segundos', (seconds) => {
    const state = pacing({ sinceLast: 10 });
    const session = played(100);
    expect(tick(state, session, seconds)).toEqual({ state, session });
  });
});

describe('qué cambia cada resultado', () => {
  it('un anuncio enseñado pone la espera a cero, suma al día y marca la partida', () => {
    const next = resolvePanel('tienda', 'shown', pacing({ sinceLast: 950, shown: 1 }), played(1000), TODAY);
    expect(next.state).toEqual({ sinceLast: 0, day: TODAY, shown: 2 });
    expect(next.session).toMatchObject({ seenInSession: true, pauseOffered: false });
  });

  it.each(['declined', 'failed'] as const)('«%s» pone la espera a cero y no suma al día', (outcome) => {
    const next = resolvePanel('tienda', outcome, pacing({ shown: 1 }), played(1000), TODAY);
    expect(next.state).toEqual({ sinceLast: 0, day: TODAY, shown: 1 });
    expect(next.session).toMatchObject({ seenInSession: false, pauseOffered: false });
  });

  it.each(['shown', 'declined', 'failed'] as const)('en la pausa, «%s» gasta la de la partida', (outcome) => {
    expect(resolvePanel('pausa', outcome, pacing(), played(1000), TODAY).session.pauseOffered).toBe(true);
  });

  it('tras cualquier panel no salta ningún otro hasta 15 minutos después', () => {
    const after = resolvePanel('tienda', 'declined', pacing(), played(300), TODAY);
    const later = tick(after.state, after.session, 899);
    expect(canOffer('tienda', later.state, later.session, TODAY)).toBe(false);
    expect(canOffer('pausa', later.state, later.session, TODAY)).toBe(false);
    const enough = tick(later.state, later.session, 1);
    expect(canOffer('tienda', enough.state, enough.session, TODAY)).toBe(true);
    expect(canOffer('pausa', enough.state, enough.session, TODAY)).toBe(true);
  });
});

describe('el día', () => {
  it('al día siguiente la cuenta vuelve a cero', () => {
    expect(rollDay(pacing({ shown: 4 }), '2026-10-13')).toEqual({ sinceLast: null, day: '2026-10-13', shown: 0 });
    expect(canOffer('tienda', pacing({ shown: 4 }), played(300), '2026-10-13')).toBe(true);
  });

  it('con el reloj hacia atrás ni se pone a cero ni retrocede el día', () => {
    const state = pacing({ shown: 4 });
    expect(rollDay(state, '2026-10-11')).toBe(state);
    expect(canOffer('tienda', state, played(300), '2026-10-11')).toBe(false);
  });

  it('un panel resuelto en un día nuevo cuenta en ese día', () => {
    expect(resolvePanel('tienda', 'shown', pacing({ shown: 4 }), played(300), '2026-10-13').state).toEqual({ sinceLast: 0, day: '2026-10-13', shown: 1 });
  });

  it('cambiar de mes y de año también es «después»', () => {
    expect(rollDay(pacing({ day: '2026-09-30', shown: 2 }), '2026-10-01').shown).toBe(0);
    expect(rollDay(pacing({ day: '2026-12-31', shown: 2 }), '2027-01-01').shown).toBe(0);
  });
});

describe('estado guardado', () => {
  it('sin nada guardado: nunca ha habido ninguno', () => {
    expect(parsePacing(null, TODAY)).toEqual({ sinceLast: null, day: TODAY, shown: 0 });
  });

  it('lee lo que se guardó', () => {
    const saved = { sinceLast: 120, day: TODAY, shown: 2 };
    expect(parsePacing(JSON.stringify(saved), TODAY)).toEqual(saved);
    expect(parsePacing(JSON.stringify({ ...saved, sinceLast: null }), TODAY).sinceLast).toBeNull();
  });

  it('lo guardado otro día llega con la cuenta a cero y la espera intacta', () => {
    expect(parsePacing(JSON.stringify({ sinceLast: 120, day: '2026-10-11', shown: 4 }), TODAY)).toEqual({ sinceLast: 120, day: TODAY, shown: 0 });
  });

  it.each([
    ['texto que no es JSON', 'hola'],
    ['vacío', ''],
    ['null', 'null'],
    ['una lista', '[1,2]'],
    ['un número', '7'],
    ['sin campos', '{}'],
    ['espera negativa', JSON.stringify({ sinceLast: -1, day: TODAY, shown: 0 })],
    ['espera que no es número', JSON.stringify({ sinceLast: 'mucho', day: TODAY, shown: 0 })],
    ['espera infinita', '{"sinceLast":1e999,"day":"2026-10-12","shown":0}'],
    ['día mal escrito', JSON.stringify({ sinceLast: 0, day: '12/10/2026', shown: 0 })],
    ['día que no es texto', JSON.stringify({ sinceLast: 0, day: 20261012, shown: 0 })],
    ['cuenta negativa', JSON.stringify({ sinceLast: 0, day: TODAY, shown: -2 })],
    ['cuenta con decimales', JSON.stringify({ sinceLast: 0, day: TODAY, shown: 1.5 })],
    ['cuenta que no es número', JSON.stringify({ sinceLast: 0, day: TODAY, shown: '3' })],
  ])('estado ilegible (%s): nunca ha habido ninguno', (_label, raw) => {
    expect(parsePacing(raw, TODAY)).toEqual({ sinceLast: null, day: TODAY, shown: 0 });
  });
});
