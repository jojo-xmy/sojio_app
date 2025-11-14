"use client";

import { useCallback } from 'react';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { Locale } from '@/locales';

export const useTranslation = (namespace?: string) => {
  const { t, locale, setLocale, translateTexts } = useLanguage();

  const translateWithNamespace = useCallback(
    (key: string, fallback?: string) => {
      const composedKey = namespace ? `${namespace}.${key}` : key;
      return t(composedKey, fallback);
    },
    [t, namespace],
  );

  return {
    locale,
    setLocale: (nextLocale: Locale) => setLocale(nextLocale),
    t: translateWithNamespace,
    translateTexts,
  };
};

