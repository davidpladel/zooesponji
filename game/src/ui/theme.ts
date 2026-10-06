import type * as Phaser from 'phaser';

export const FONT = 'Baloo 2';
export const FONT_STACK = `"${FONT}", "Arial Rounded MT Bold", sans-serif`;
export const FONT_FILE = 'fonts/baloo-2-latin-800-normal.woff2';

export const UI = {
  cream: '#fff6e0',
  frame: '#f0b24a',
  outline: '#8a4a18',
  brown: '#7a4a1c',
  rim: '#fff6dc',
  shadow: 'rgba(60,30,0,0.35)',
  ribbonTop: '#ff9d2e',
  ribbonBottom: '#f27612',
  sky: '#58b0f0',
  logo: '#ffd23c',
  veil: 0x142814,
} as const;

export type PillColor = 'yellow' | 'green' | 'blue' | 'red' | 'gray' | 'sand';

/** Degradado del cuerpo (top → bottom), canto de abajo y contorno del texto de cada color. */
export const PILL: Record<PillColor, { top: string; bottom: string; lip: string; stroke: string }> = {
  yellow: { top: '#ffd83a', bottom: '#ffab0a', lip: '#e08600', stroke: '#8a3b12' },
  green: { top: '#8fe04a', bottom: '#4fb52a', lip: '#358a18', stroke: '#24600f' },
  blue: { top: '#4cc3ff', bottom: '#1e8fe8', lip: '#1569b8', stroke: '#134a86' },
  red: { top: '#ff7a6b', bottom: '#e63a34', lip: '#b02320', stroke: '#7d1512' },
  gray: { top: '#d8d2c6', bottom: '#b3ab9c', lip: '#8f8777', stroke: '#5f584c' },
  sand: { top: '#ffe9b8', bottom: '#ffd98a', lip: '#e9b860', stroke: '#7a4a1c' },
};

/** Letra de la interfaz: gordita, con contorno. */
export function textStyle(size: number, color = '#ffffff', stroke: string = UI.outline): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: FONT_STACK,
    fontStyle: '800',
    fontSize: `${size}px`,
    color,
    stroke,
    strokeThickness: Math.max(3, Math.round(size / 6)),
  };
}
