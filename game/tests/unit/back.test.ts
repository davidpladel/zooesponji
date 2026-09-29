import { describe, expect, it } from 'vitest';
import { decideBack, type BackContext } from '../../src/core/back';

const base: BackContext = { quitDialogOpen: false, settingsOpen: false, overlayOpen: false, screen: 'world' };

describe('decideBack', () => {
  it('en el mundo pregunta antes de salir', () => {
    expect(decideBack(base)).toBe('ask-quit');
  });

  it('en el título sale', () => {
    expect(decideBack({ ...base, screen: 'title' })).toBe('exit');
  });

  it('el menú de ajustes se cierra antes que nada', () => {
    expect(decideBack({ ...base, settingsOpen: true, overlayOpen: true })).toBe('close-settings');
  });

  it('tienda o primer plano: se cierran', () => {
    expect(decideBack({ ...base, overlayOpen: true })).toBe('close-overlay');
  });

  it('con el diálogo de salir abierto, atrás lo cierra (no sale)', () => {
    expect(decideBack({ ...base, quitDialogOpen: true })).toBe('close-quit');
  });

  it('cargando: no hace nada', () => {
    expect(decideBack({ ...base, screen: 'other' })).toBe('none');
  });
});
