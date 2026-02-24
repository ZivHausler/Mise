import type { Language } from '@/constants/defaults';

const RTL_LANGUAGES: ReadonlySet<string> = new Set<Language>(['he', 'ar']);

/** Whether a language code (or i18next language string) is RTL. */
export function isRtlLanguage(lang: string): boolean {
  return RTL_LANGUAGES.has(lang);
}

/** Returns `'rtl'` or `'ltr'` for a language code. */
export function languageDir(lang: string): 'rtl' | 'ltr' {
  return isRtlLanguage(lang) ? 'rtl' : 'ltr';
}
