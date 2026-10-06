import { describe, expect, it } from 'vitest';
import { pressStep } from '../../src/core/press';

describe('efecto al pulsar', () => {
  it('bajar el dedo aprieta sin ejecutar', () => {
    expect(pressStep('idle', 'down')).toEqual({ state: 'down', fire: false });
  });

  it('soltar dentro ejecuta', () => {
    expect(pressStep('down', 'up')).toEqual({ state: 'idle', fire: true });
  });

  it('salir con el dedo apretado cancela', () => {
    expect(pressStep('down', 'out')).toEqual({ state: 'idle', fire: false });
  });

  it('soltar sin haber apretado aquí no ejecuta', () => {
    expect(pressStep('idle', 'up')).toEqual({ state: 'idle', fire: false });
  });

  it('salir y volver a soltar encima no ejecuta', () => {
    const out = pressStep('down', 'out');
    expect(pressStep(out.state, 'up').fire).toBe(false);
  });
});
