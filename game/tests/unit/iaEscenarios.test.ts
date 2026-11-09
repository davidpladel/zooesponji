import { describe, expect, it } from 'vitest';
import { ESCENARIOS } from '../../scripts/ia/escenarios';
import { parseSave, SAVE_KEY } from '../../src/core/save';

describe('escenarios de los jugadores con IA', () => {
  it('guardan donde el juego lee la partida', () => {
    for (const escenario of Object.values(ESCENARIOS)) expect(escenario.key).toBe(SAVE_KEY);
  });

  it.each(Object.keys(ESCENARIOS))('%s es una partida que el juego carga tal cual', (name) => {
    const raw = ESCENARIOS[name]!.save;
    const parsed = parseSave(JSON.parse(JSON.stringify(raw)));
    expect(parsed).not.toBeNull();
    // Nada se descarta al leerla: lo preparado es lo que se juega.
    expect(parsed).toEqual(raw);
  });

  it('cuidados: cerdos y elefantes abiertos, clínica comprada, sucios, malitos y barro; sin estadísticas', () => {
    const { save } = ESCENARIOS.cuidados!;
    expect(save.state.clinic).toBe(true);
    expect(save.state.counts.cerdos).toBe(5);
    expect(save.state.counts['elefantes-africanos']).toBeGreaterThan(0);
    expect(save.care.dirty.length).toBeGreaterThanOrEqual(2);
    expect(save.care.sick).toHaveLength(2);
    expect(save.care.muddy.length).toBeGreaterThan(0);
    // Las partidas de IA no cuentan en Matomo.
    expect(save.settings.stats).toBe(false);
  });
});
