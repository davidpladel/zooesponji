import type { KeyValueStore } from '../core/save';

export type WebStorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export function createMemoryStore(
  initial: Record<string, string> = {},
): KeyValueStore & { dump(): Record<string, string> } {
  const map = new Map(Object.entries(initial));
  return {
    async get(key) {
      return map.get(key) ?? null;
    },
    async set(key, value) {
      map.set(key, value);
    },
    dump() {
      return Object.fromEntries(map);
    },
  };
}

function browserLocalStorage(): WebStorageLike | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

/** Store sobre localStorage. Si el navegador lo bloquea, nunca lanza errores. */
export function createWebStore(storage: WebStorageLike | null = browserLocalStorage()): KeyValueStore {
  if (!storage) return createMemoryStore();
  return {
    async get(key) {
      try {
        return storage.getItem(key);
      } catch {
        return null;
      }
    },
    async set(key, value) {
      try {
        storage.setItem(key, value);
      } catch (error) {
        console.error('[storage] no se pudo guardar', key, error);
      }
    },
  };
}

export interface PreferencesLike {
  get(options: { key: string }): Promise<{ value: string | null }>;
  set(options: { key: string; value: string }): Promise<void>;
}

/** Store sobre @capacitor/preferences (almacenamiento nativo; Android no lo borra como el del WebView). */
export function createCapacitorStore(preferences: PreferencesLike): KeyValueStore {
  return {
    async get(key) {
      try {
        return (await preferences.get({ key })).value;
      } catch {
        return null;
      }
    },
    async set(key, value) {
      try {
        await preferences.set({ key, value });
      } catch (error) {
        console.error('[storage] no se pudo guardar (nativo)', key, error);
      }
    },
  };
}
