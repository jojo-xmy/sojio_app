"use client";

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_LOCALE, Locale, SUPPORTED_LOCALES, translateKey } from '@/locales';
import { translateTexts as translateDynamicTexts } from '@/lib/translationService';
import { TranslationOrchestrator } from './TranslationOrchestrator';

type LanguageContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, fallback?: string) => string;
  translateTexts: (texts: string[], target?: Locale) => Promise<string[]>;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);
const STORAGE_KEY = 'sojio:preferred-locale';

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(STORAGE_KEY) as Locale | null;
    const browserLocale = (navigator.language || 'zh').slice(0, 2) as Locale;
    if (stored && SUPPORTED_LOCALES.includes(stored)) {
      setLocaleState(stored);
      return;
    }
    if (SUPPORTED_LOCALES.includes(browserLocale)) {
      setLocaleState(browserLocale);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    document.documentElement.lang = locale;
    window.localStorage.setItem(STORAGE_KEY, locale);
  }, [locale]);

  const value = useMemo<LanguageContextValue>(() => {
    const translate = (key: string, fallback?: string) => {
      return translateKey(locale, key) ?? fallback ?? key;
    };

    return {
      locale,
      setLocale: (nextLocale) => {
        if (locale === nextLocale) return;
        setLocaleState(nextLocale);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('sojio:language-change', {
              detail: { locale: nextLocale },
            }),
          );
        }
      },
      t: translate,
      translateTexts: (texts: string[], target?: Locale) =>
        translateDynamicTexts(texts, target ?? locale),
    };
  }, [locale]);

  return (
    <LanguageContext.Provider value={value}>
      <TranslationOrchestrator />
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

