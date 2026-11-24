import { describe, expect, it } from 'vitest';
import { decideBack, type BackContext } from '../../src/core/back';

const base: BackContext = { quitDialogOpen: false, settingsOpen: false, overlayOpen: false, adOfferOpen: false, screen: 'world' };

describe('decideBack', () => {
  it('con el panel del anuncio abierto, atrás equivale a la X', () => {
    expect(decideBack({ ...base, adOfferOpen: true })).toBe('close-ad');
  });

  it('el panel del anuncio va antes que la tienda sobre la que se abrió', () => {
    expect(decideBack({ ...base, adOfferOpen: true, overlayOpen: true })).toBe('close-ad');
  });
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

  it('aviso de actualizar suave: atrás equivale a «luego», incluso con la tienda abierta o en el título', () => {
    expect(decideBack({ ...base, updateNotice: 'soft' })).toBe('close-ad');
    expect(decideBack({ ...base, updateNotice: 'soft', overlayOpen: true })).toBe('close-ad');
    expect(decideBack({ ...base, updateNotice: 'soft', screen: 'title' })).toBe('close-ad');
  });

  it('pantalla de bloqueo: atrás abre «¿Salir?» (la puerta de salida), nunca cierra el bloqueo ni sale de golpe', () => {
    expect(decideBack({ ...base, updateNotice: 'block', screen: 'title' })).toBe('ask-quit');
    expect(decideBack({ ...base, updateNotice: 'block', overlayOpen: true, settingsOpen: true })).toBe('ask-quit');
  });

  it('con «¿Salir?» abierto encima del bloqueo, atrás lo cierra', () => {
    expect(decideBack({ ...base, updateNotice: 'block', quitDialogOpen: true })).toBe('close-quit');
  });

  it('sin aviso de actualizar, todo igual que antes', () => {
    expect(decideBack({ ...base, updateNotice: 'none' })).toBe('ask-quit');
  });
});
