import { getLanguage, type Language } from '../../systems/language';
import { STRINGS_AR } from './ar';
import { STRINGS_EN } from './en';
import { STRINGS_ES, type StringKey } from './es';
import { STRINGS_FR } from './fr';
import { STRINGS_HI } from './hi';
import { STRINGS_IT } from './it';
import { STRINGS_JA } from './ja';
import { STRINGS_PT_BR } from './pt-BR';
import { STRINGS_PT_PT } from './pt-PT';
import { STRINGS_RU } from './ru';
import { STRINGS_ZH } from './zh';

export { STRINGS_EN, STRINGS_ES };
export type { StringKey };

export const STRINGS: Record<Language, Record<StringKey, string>> = {
  es: STRINGS_ES,
  en: STRINGS_EN,
  fr: STRINGS_FR,
  'pt-BR': STRINGS_PT_BR,
  'pt-PT': STRINGS_PT_PT,
  it: STRINGS_IT,
  ru: STRINGS_RU,
  ar: STRINGS_AR,
  hi: STRINGS_HI,
  zh: STRINGS_ZH,
  ja: STRINGS_JA,
};

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
