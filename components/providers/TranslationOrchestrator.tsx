"use client";

import { useEffect, useRef } from 'react';
import { useTranslation } from '@/hooks/useTranslation';

const TRANSLATABLE_SELECTOR = '[data-translatable]';
const ORIGINAL_ATTR = 'translationOriginal';
const LOCALE_ATTR = 'translationLocale';

export function TranslationOrchestrator() {
  const { locale, translateTexts, t } = useTranslation();
  const observerRef = useRef<MutationObserver | null>(null);
  const rafRef = useRef<number | null>(null);
  const applyingRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const collectNodes = () => {
      const allNodes = Array.from(document.querySelectorAll<HTMLElement>(TRANSLATABLE_SELECTOR));
      return allNodes.filter((node) => {
        if (!node.dataset[ORIGINAL_ATTR]) {
          node.dataset[ORIGINAL_ATTR] = node.textContent?.trim() ?? '';
        }
        return node.dataset[LOCALE_ATTR] !== locale;
      });
    };

    const applyTranslations = async () => {
      if (applyingRef.current) return;
      applyingRef.current = true;

      const nodes = collectNodes();
      if (!nodes.length) {
        applyingRef.current = false;
        return;
      }

      const keyedResults = nodes.map((node) => {
        const key = node.dataset.translationKey;
        if (key) {
          return t(key, node.dataset[ORIGINAL_ATTR] ?? node.textContent ?? '');
        }
        return null;
      });

      const dynamicNodes: HTMLElement[] = [];
      const dynamicOriginals: string[] = [];

      nodes.forEach((node, index) => {
        if (keyedResults[index] === null) {
          const original = node.dataset[ORIGINAL_ATTR] ?? node.textContent ?? '';
          dynamicNodes.push(node);
          dynamicOriginals.push(original);
        }
      });

      let dynamicTranslations: string[] = [];
      if (dynamicOriginals.length) {
        try {
          dynamicTranslations = await translateTexts(dynamicOriginals, locale);
        } catch (error) {
          console.error('[translation] dynamic translation failed', error);
          dynamicTranslations = dynamicOriginals;
        }
      }

      let dynamicIndex = 0;
      nodes.forEach((node, index) => {
        const keyed = keyedResults[index];
        const translated =
          keyed ??
          dynamicTranslations[dynamicIndex++] ??
          node.dataset[ORIGINAL_ATTR] ??
          node.textContent ??
          '';
        if (node.textContent !== translated) {
          node.textContent = translated;
        }
        node.dataset[LOCALE_ATTR] = locale;
      });

      applyingRef.current = false;
    };

    const scheduleApply = () => {
      if (rafRef.current !== null) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        applyTranslations();
      });
    };

    scheduleApply();

    if (!observerRef.current) {
      observerRef.current = new MutationObserver(() => scheduleApply());
      observerRef.current.observe(document.body, { childList: true, subtree: true });
    }

    window.addEventListener('sojio:language-change', scheduleApply);

    return () => {
      window.removeEventListener('sojio:language-change', scheduleApply);
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      applyingRef.current = false;
    };
  }, [locale, translateTexts, t]);

  return null;
}

