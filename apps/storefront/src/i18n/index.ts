import i18n, { type PostProcessorModule } from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager } from 'react-native';
import he from './he.json';
import en from './en.json';

const resources = {
  he: { translation: he },
  en: { translation: en },
};

// Unicode Right-to-Left Isolate (U+2067) and Pop Directional Isolate (U+2069).
// Wrapping translated Hebrew strings with these characters tells the text engine
// the paragraph base direction is RTL, which fixes punctuation placement (!, ?, ...)
// appearing at the wrong end of the string.
const RLI = '\u2067';
const PDI = '\u2069';

const rtlIsolatePostProcessor: PostProcessorModule = {
  type: 'postProcessor',
  name: 'rtlIsolate',
  process(value: string, _key: string, _options: any, translator: any) {
    const lng = translator?.language ?? i18n.language;
    if (lng === 'he' && value) {
      return `${RLI}${value}${PDI}`;
    }
    return value;
  },
};

/**
 * Configure RTL based on language.
 * This must happen before the first render.
 */
export function configureRTL(lang: 'he' | 'en') {
  const isRTL = lang === 'he';
  if (I18nManager.isRTL !== isRTL) {
    I18nManager.allowRTL(true);
    I18nManager.forceRTL(isRTL);
    // Note: Changing RTL direction requires an app restart for full effect
  }
}

// RTL is configured from App.tsx after reading the saved language preference.
// Do NOT call configureRTL here — it would always force RTL=true before the
// saved language is loaded from AsyncStorage, creating a race condition.

i18n
  .use(initReactI18next)
  .use(rtlIsolatePostProcessor)
  .init({
    resources,
    lng: 'he',
    fallbackLng: 'he',
    interpolation: {
      escapeValue: false,
    },
    postProcess: ['rtlIsolate'],
    react: {
      useSuspense: false,
    },
  });

export default i18n;
