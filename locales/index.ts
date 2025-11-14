import zh from './zh';
import en from './en';
import ja from './ja';

export const SUPPORTED_LOCALES = ['zh', 'en', 'ja'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

type TranslationRecord = Record<string, string>;
interface TranslationTree {
  [key: string]: string | TranslationTree;
}

const resources = {
  zh,
  en,
  ja,
} as const;

const flattenedResources: Record<Locale, TranslationRecord> = {
  zh: {},
  en: {},
  ja: {},
};

const flattenResource = (tree: TranslationTree, prefix = ''): TranslationRecord => {
  return Object.entries(tree).reduce<TranslationRecord>((acc, [key, value]) => {
    const composedKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      acc[composedKey] = value;
      return acc;
    }
    Object.assign(acc, flattenResource(value, composedKey));
    return acc;
  }, {});
};

SUPPORTED_LOCALES.forEach((locale) => {
  flattenedResources[locale] = flattenResource(resources[locale]);
});

export const DEFAULT_LOCALE: Locale = 'zh';

export const localeMeta: Record<
  Locale,
  {
    label: string;
    shortLabel: string;
    icon?: string;
  }
> = {
  zh: { label: '中文', shortLabel: '中' },
  en: { label: 'English', shortLabel: 'EN' },
  ja: { label: '日本語', shortLabel: '日' },
};

export const translateKey = (locale: Locale, key: string): string | undefined => {
  return flattenedResources[locale]?.[key];
};

export const getAllTranslations = () => resources;
export const getFlatTranslations = () => flattenedResources;

