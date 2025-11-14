import { getFlatTranslations, Locale } from '@/locales';

type TranslationResponse = {
  translations: string[];
};

const flatTranslations = getFlatTranslations();
const reverseLookup = new Map<
  string,
  {
    [key in Locale]?: string;
  }
>();

const buildReverseLookup = () => {
  const zhEntries = flatTranslations.zh;
  Object.entries(zhEntries).forEach(([key, zhValue]) => {
    const bundle: Record<Locale, string | undefined> = {
      zh: zhValue,
      en: flatTranslations.en[key],
      ja: flatTranslations.ja[key],
    };
    if (zhValue) {
      reverseLookup.set(zhValue, bundle);
    }
  });
};

if (reverseLookup.size === 0) {
  buildReverseLookup();
}

export const translateTexts = async (texts: string[], target: Locale): Promise<string[]> => {
  if (!texts.length) return [];

  const endpoint = process.env.NEXT_PUBLIC_TRANSLATION_ENDPOINT;

  if (endpoint) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts, target }),
      });

      if (!response.ok) {
        throw new Error('Translation request failed');
      }

      const data = (await response.json()) as TranslationResponse;
      return data.translations ?? texts;
    } catch (error) {
      console.error('[translation] fallback triggered', error);
    }
  }

  return texts.map((text) => {
    const normalized = text.trim();
    const match = reverseLookup.get(normalized);
    return match?.[target] ?? text;
  });
};

