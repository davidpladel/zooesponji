import { getLanguage, type Language } from '../../systems/language';
import { STRINGS_EN } from './en';
import { STRINGS_ES, type StringKey } from './es';

export { STRINGS_EN, STRINGS_ES };
export type { StringKey };

const STRINGS: Record<Language, Record<StringKey, string>> = { es: STRINGS_ES, en: STRINGS_EN };

/** ¿Existe esta clave? Para las que se montan con datos del mapa (p. ej. `zone.<zona>`). */
export function hasKey(key: string): key is StringKey {
  return Object.hasOwn(STRINGS_ES, key);
}

/** Texto en el idioma activo. Los marcadores `{nombre}` se sustituyen por `vars`. */
export function t(key: StringKey, vars: Record<string, string | number> = {}): string {
  return STRINGS[getLanguage()][key].replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}
