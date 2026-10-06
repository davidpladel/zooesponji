import { STRINGS_ES, type StringKey } from './es';

export { STRINGS_ES };
export type { StringKey };

/** ¿Existe esta clave? Para las que se montan con datos del mapa (p. ej. `zone.<zona>`). */
export function hasKey(key: string): key is StringKey {
  return Object.hasOwn(STRINGS_ES, key);
}

export function t(key: StringKey, vars: Record<string, string | number> = {}): string {
  return STRINGS_ES[key].replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}
