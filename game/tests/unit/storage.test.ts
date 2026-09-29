import { describe, expect, it } from 'vitest';
import { createCapacitorStore, createMemoryStore, createWebStore } from '../../src/systems/storage';

function fakeWebStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
  };
}

describe('createMemoryStore', () => {
  it('guarda y lee valores', async () => {
    const store = createMemoryStore({ a: '1' });
    expect(await store.get('a')).toBe('1');
    await store.set('b', '2');
    expect(await store.get('b')).toBe('2');
    expect(store.dump()).toEqual({ a: '1', b: '2' });
  });

  it('devuelve null para claves que no existen', async () => {
    expect(await createMemoryStore().get('nada')).toBeNull();
  });
});

describe('createWebStore', () => {
  it('delega en el storage del navegador', async () => {
    const web = fakeWebStorage();
    const store = createWebStore(web);
    await store.set('k', 'v');
    expect(web.getItem('k')).toBe('v');
    expect(await store.get('k')).toBe('v');
  });

  it('no revienta si el navegador bloquea el storage', async () => {
    const broken = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    const store = createWebStore(broken);
    await expect(store.set('k', 'v')).resolves.toBeUndefined();
    expect(await store.get('k')).toBeNull();
  });

  it('sin storage disponible funciona en memoria', async () => {
    const store = createWebStore(null);
    await store.set('k', 'v');
    expect(await store.get('k')).toBe('v');
  });
});

describe('createCapacitorStore', () => {
  function fakePreferences() {
    const map = new Map<string, string>();
    return {
      get: async ({ key }: { key: string }) => ({ value: map.get(key) ?? null }),
      set: async ({ key, value }: { key: string; value: string }) => void map.set(key, value),
    };
  }

  it('guarda y lee a través de Preferences', async () => {
    const store = createCapacitorStore(fakePreferences());
    await store.set('k', 'v');
    expect(await store.get('k')).toBe('v');
    expect(await store.get('nada')).toBeNull();
  });

  it('no revienta si Preferences falla', async () => {
    const store = createCapacitorStore({
      get: async () => {
        throw new Error('fallo nativo');
      },
      set: async () => {
        throw new Error('fallo nativo');
      },
    });
    expect(await store.get('k')).toBeNull();
    await expect(store.set('k', 'v')).resolves.toBeUndefined();
  });
});
