import React, { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { I18nManager } from 'react-native';
import i18n from '../i18n';

interface DirectionValue {
  isRTL: boolean;
  direction: 'rtl' | 'ltr';
}

const DirectionContext = createContext<DirectionValue>({
  isRTL: i18n.language === 'he',
  direction: i18n.language === 'he' ? 'rtl' : 'ltr',
});

export function DirectionProvider({ children }: PropsWithChildren) {
  const [isRTL, setIsRTL] = useState(i18n.language === 'he');

  useEffect(() => {
    const handler = (lang: string) => {
      const rtl = lang === 'he';
      setIsRTL(rtl);
      // Persist for next cold start
      if (I18nManager.isRTL !== rtl) {
        I18nManager.allowRTL(true);
        I18nManager.forceRTL(rtl);
      }
    };
    i18n.on('languageChanged', handler);
    return () => { i18n.off('languageChanged', handler); };
  }, []);

  const value: DirectionValue = {
    isRTL,
    direction: isRTL ? 'rtl' : 'ltr',
  };

  return (
    <DirectionContext.Provider value={value}>
      {children}
    </DirectionContext.Provider>
  );
}

export function useDirection(): DirectionValue {
  return useContext(DirectionContext);
}
