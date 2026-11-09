import { describe, expect, it } from 'vitest';
import { TOWEL_COLORS, TOWEL_ROWS } from '../../src/ui/towelArt';

describe('toalla de la limpieza (dibujo a píxeles)', () => {
  it('es un dibujo de 16x16 como el resto del arte', () => {
    expect(TOWEL_ROWS).toHaveLength(16);
    for (const row of TOWEL_ROWS) expect(row).toHaveLength(16);
  });

  it('solo usa colores definidos (punto = transparente) y lleva contorno y rayas blancas', () => {
    const used = new Set(TOWEL_ROWS.join('').replaceAll('.', ''));
    for (const c of used) expect(TOWEL_COLORS[c], `color ${c}`).toBeDefined();
    expect(used.has('O')).toBe(true);
    expect(TOWEL_COLORS.W).toBe(0xffffff);
    expect(used.has('W')).toBe(true);
  });
});
