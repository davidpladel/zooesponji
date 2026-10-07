import { describe, expect, it } from 'vitest';
import { ageBucket, cohortWeek, dayKey, daysBetween, nextActivity, parseActivity, sessionBucket, type ActivityState } from '../../src/core/activity';

const state = (firstDay: string, lastDay: string, sessions: number): ActivityState => ({ firstDay, lastDay, sessions });

describe('dayKey', () => {
  it('da el día en hora local, con ceros', () => {
    expect(dayKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(dayKey(new Date(2026, 9, 17, 0, 0))).toBe('2026-10-17');
  });
});

describe('nextActivity', () => {
  it('la primera vez enciende las cuatro banderas', () => {
    expect(nextActivity(null, '2026-10-07')).toEqual({
      state: state('2026-10-07', '2026-10-07', 1),
      flags: ['nuevo', 'dia', 'semana', 'mes'],
      returns: [],
    });
  });

  it('otra sesión el mismo día solo suma la sesión', () => {
    expect(nextActivity(state('2026-10-07', '2026-10-07', 1), '2026-10-07')).toEqual({
      state: state('2026-10-07', '2026-10-07', 2),
      flags: [],
      returns: [],
    });
  });

  it('al día siguiente, en la misma semana y mes: solo día', () => {
    // 7-oct-2026 es miércoles; el 8 es jueves.
    expect(nextActivity(state('2026-10-07', '2026-10-07', 3), '2026-10-08').flags).toEqual(['dia']);
  });

  it('el lunes siguiente: día y semana', () => {
    expect(nextActivity(state('2026-10-07', '2026-10-11', 3), '2026-10-12').flags).toEqual(['dia', 'semana']);
  });

  it('domingo y lunes anterior son la misma semana', () => {
    expect(nextActivity(state('2026-10-05', '2026-10-05', 1), '2026-10-11').flags).toEqual(['dia']);
  });

  it('cambio de mes dentro de la misma semana: día y mes', () => {
    // 30-sep-2026 es miércoles; 1-oct es jueves.
    expect(nextActivity(state('2026-09-30', '2026-09-30', 1), '2026-10-01').flags).toEqual(['dia', 'mes']);
  });

  it('cambio de año: día, semana y mes', () => {
    expect(nextActivity(state('2026-12-20', '2026-12-20', 1), '2027-01-04').flags).toEqual(['dia', 'semana', 'mes']);
  });

  it('con el reloj hacia atrás no hay banderas y el último día no retrocede', () => {
    expect(nextActivity(state('2026-10-01', '2026-10-07', 4), '2026-10-03')).toEqual({
      state: state('2026-10-01', '2026-10-07', 5),
      flags: [],
      returns: [],
    });
  });
});

describe('parseActivity', () => {
  it('lee un estado válido', () => {
    expect(parseActivity('{"firstDay":"2026-10-01","lastDay":"2026-10-07","sessions":4}')).toEqual(state('2026-10-01', '2026-10-07', 4));
  });

  it.each([
    ['nada guardado', null],
    ['no es JSON', '{'],
    ['no es un objeto', '3'],
    ['día mal escrito', '{"firstDay":"ayer","lastDay":"2026-10-07","sessions":4}'],
    ['sesiones no enteras', '{"firstDay":"2026-10-01","lastDay":"2026-10-07","sessions":1.5}'],
    ['sesiones a cero', '{"firstDay":"2026-10-01","lastDay":"2026-10-07","sessions":0}'],
  ])('devuelve null: %s', (_label, raw) => {
    expect(parseActivity(raw)).toBeNull();
  });
});

describe('tramos', () => {
  it.each([
    [1, '1'],
    [2, '2-5'],
    [5, '2-5'],
    [6, '6-20'],
    [20, '6-20'],
    [21, '21+'],
  ])('sesión %i → %s', (n, bucket) => {
    expect(sessionBucket(n)).toBe(bucket);
  });

  it.each([
    ['2026-10-07', 'd0'],
    ['2026-10-08', 'd1'],
    ['2026-10-09', 'd2-6'],
    ['2026-10-13', 'd2-6'],
    ['2026-10-14', 'd7-29'],
    ['2026-11-05', 'd7-29'],
    ['2026-11-06', 'd30+'],
    ['2026-10-01', 'd0'],
  ])('primer día 7-oct, hoy %s → %s', (today, bucket) => {
    expect(ageBucket('2026-10-07', today)).toBe(bucket);
  });
});

describe('semana de inicio y retención', () => {
  it('la semana de inicio es la semana ISO', () => {
    expect(cohortWeek('2026-10-07')).toBe('2026-S41');
    expect(cohortWeek('2027-01-03')).toBe('2026-S53');
    expect(cohortWeek('2027-01-04')).toBe('2027-S01');
  });

  it('cuenta días entre dos fechas', () => {
    expect(daysBetween('2026-10-07', '2026-10-08')).toBe(1);
    expect(daysBetween('2026-12-31', '2027-01-07')).toBe(7);
  });

  it('volver al día siguiente avisa de d1, una sola vez', () => {
    const first = nextActivity(state('2026-10-07', '2026-10-07', 1), '2026-10-08');
    expect(first.returns).toEqual(['vuelve-d1']);
    expect(first.state.returned).toEqual(['vuelve-d1']);
    expect(nextActivity(first.state, '2026-10-09').returns).toEqual([]);
  });

  it('volver por primera vez a los 40 días avisa de las tres', () => {
    const next = nextActivity(state('2026-10-07', '2026-10-07', 1), '2026-11-16');
    expect(next.returns).toEqual(['vuelve-d1', 'vuelve-d7', 'vuelve-d30']);
  });

  it('el mismo día no hay retorno', () => {
    expect(nextActivity(state('2026-10-07', '2026-10-07', 1), '2026-10-07').returns).toEqual([]);
  });

  it('lee y conserva lo ya avisado, y descarta valores raros', () => {
    const raw = '{"firstDay":"2026-10-01","lastDay":"2026-10-07","sessions":4,"returned":["vuelve-d1","otra"]}';
    expect(parseActivity(raw)?.returned).toEqual(['vuelve-d1']);
  });
});
