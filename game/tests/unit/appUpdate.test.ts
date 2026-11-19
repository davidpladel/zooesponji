import { beforeEach, describe, expect, it, vi } from 'vitest';

// Plugin simulado con los mismos valores numéricos que sus tipos reales (definitions.d.ts, 8.1.1).
const plugin = vi.hoisted(() => ({
  getAppUpdateInfo: vi.fn(),
  performImmediateUpdate: vi.fn(),
  openAppStore: vi.fn(),
  startFlexibleUpdate: vi.fn(),
}));

vi.mock('@capawesome/capacitor-app-update', () => ({
  AppUpdate: plugin,
  AppUpdateAvailability: { UNKNOWN: 0, UPDATE_NOT_AVAILABLE: 1, UPDATE_AVAILABLE: 2, UPDATE_IN_PROGRESS: 3 },
  AppUpdateResultCode: { OK: 0, CANCELED: 1, FAILED: 2, NOT_AVAILABLE: 3, NOT_ALLOWED: 4, INFO_MISSING: 5 },
}));

import { createPlayUpdater, getPlayUpdater, setPlayUpdater } from '../../src/systems/appUpdate';

const base = { currentVersionName: '2.10.0', currentVersionCode: '13', updateAvailability: 2, immediateUpdateAllowed: true };

beforeEach(() => {
  for (const fn of Object.values(plugin)) fn.mockReset();
  setPlayUpdater(null);
});

describe('createPlayUpdater().info', () => {
  it('disponible y permitida', async () => {
    plugin.getAppUpdateInfo.mockResolvedValue(base);
    expect(await createPlayUpdater().info()).toEqual({ available: true, immediateAllowed: true, versionCode: 13 });
  });
  it('sin actualización disponible', async () => {
    plugin.getAppUpdateInfo.mockResolvedValue({ ...base, updateAvailability: 1 });
    expect(await createPlayUpdater().info()).toEqual({ available: false, immediateAllowed: true, versionCode: 13 });
  });
  it('desconocida o en curso: no cuenta como disponible', async () => {
    for (const updateAvailability of [0, 3]) {
      plugin.getAppUpdateInfo.mockResolvedValue({ ...base, updateAvailability });
      expect((await createPlayUpdater().info()).available).toBe(false);
    }
  });
  it('actualización inmediata no permitida o campo ausente', async () => {
    plugin.getAppUpdateInfo.mockResolvedValue({ ...base, immediateUpdateAllowed: false });
    expect((await createPlayUpdater().info()).immediateAllowed).toBe(false);
    plugin.getAppUpdateInfo.mockResolvedValue({ ...base, immediateUpdateAllowed: undefined });
    expect((await createPlayUpdater().info()).immediateAllowed).toBe(false);
  });
  it('código de versión ilegible: null', async () => {
    plugin.getAppUpdateInfo.mockResolvedValue({ ...base, currentVersionCode: 'x' });
    expect((await createPlayUpdater().info()).versionCode).toBeNull();
    plugin.getAppUpdateInfo.mockResolvedValue({ ...base, currentVersionCode: '13.5' });
    expect((await createPlayUpdater().info()).versionCode).toBeNull();
  });
  it('si el plugin falla, informa de nada y no lanza', async () => {
    plugin.getAppUpdateInfo.mockRejectedValue(new Error('Play no responde'));
    expect(await createPlayUpdater().info()).toEqual({ available: false, immediateAllowed: false, versionCode: null });
  });
});

describe('createPlayUpdater().immediate', () => {
  it('pide la información antes (el plugin lo exige) y devuelve «actualizada»', async () => {
    plugin.getAppUpdateInfo.mockResolvedValue(base);
    plugin.performImmediateUpdate.mockResolvedValue({ code: 0 });
    expect(await createPlayUpdater().immediate()).toBe('actualizada');
    expect(plugin.getAppUpdateInfo.mock.invocationCallOrder[0]).toBeLessThan(plugin.performImmediateUpdate.mock.invocationCallOrder[0]!);
  });
  it('cancelada por el jugador', async () => {
    plugin.getAppUpdateInfo.mockResolvedValue(base);
    plugin.performImmediateUpdate.mockResolvedValue({ code: 1 });
    expect(await createPlayUpdater().immediate()).toBe('cancelada');
  });
  it('fallo de Play o excepción', async () => {
    plugin.getAppUpdateInfo.mockResolvedValue(base);
    plugin.performImmediateUpdate.mockResolvedValue({ code: 2 });
    expect(await createPlayUpdater().immediate()).toBe('fallo');
    plugin.performImmediateUpdate.mockRejectedValue(new Error('boom'));
    expect(await createPlayUpdater().immediate()).toBe('fallo');
  });
  it('no disponible, no permitida o sin información: «no-disponible» (nunca se bloquea por esto)', async () => {
    plugin.getAppUpdateInfo.mockResolvedValue(base);
    for (const code of [3, 4, 5]) {
      plugin.performImmediateUpdate.mockResolvedValue({ code });
      expect(await createPlayUpdater().immediate(), String(code)).toBe('no-disponible');
    }
  });
  it('si ni siquiera se puede leer la información: «no-disponible»', async () => {
    plugin.getAppUpdateInfo.mockRejectedValue(new Error('x'));
    expect(await createPlayUpdater().immediate()).toBe('no-disponible');
    expect(plugin.performImmediateUpdate).not.toHaveBeenCalled();
  });
  it('nunca sale de la app hacia la tienda con enlace propio', async () => {
    plugin.getAppUpdateInfo.mockResolvedValue(base);
    plugin.performImmediateUpdate.mockResolvedValue({ code: 0 });
    await createPlayUpdater().info();
    await createPlayUpdater().immediate();
    expect(plugin.openAppStore).not.toHaveBeenCalled();
    expect(plugin.startFlexibleUpdate).not.toHaveBeenCalled();
  });
});

describe('setPlayUpdater', () => {
  it('guarda y devuelve la pieza (también la falsa de las pruebas)', () => {
    expect(getPlayUpdater()).toBeNull();
    const fake = { info: async () => ({ available: false, immediateAllowed: false, versionCode: null }), immediate: async () => 'actualizada' as const };
    setPlayUpdater(fake);
    expect(getPlayUpdater()).toBe(fake);
  });
});
