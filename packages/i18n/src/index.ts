// IndustrySignal — i18n public API.
//
// Server-safe by design: `t(lang, key, ...args)` takes the language as an
// explicit argument, so it can be called from Server Components, route
// handlers, and worker code without React context.
//
// A React hook (`useLang`) for client-side language toggling will be
// added in a follow-up commit once the language switcher UI lands.

import { dict, type Lang } from './dictionary';

export { dict };
export type { Lang, DictionaryKey } from './dictionary';

export const SUPPORTED_LANGS: readonly Lang[] = ['cs', 'en'] as const;
export const DEFAULT_LANG: Lang = 'cs';

export function isLang(value: unknown): value is Lang {
  return value === 'cs' || value === 'en';
}

export function t(lang: Lang, key: string, ...args: unknown[]): string {
  const primary = dict[lang]?.[key];
  const entry = primary ?? dict[DEFAULT_LANG][key];
  if (typeof entry === 'function') return entry(...args);
  if (typeof entry === 'string') return entry;
  if (Array.isArray(entry)) return entry.join('\n');
  return key;
}
