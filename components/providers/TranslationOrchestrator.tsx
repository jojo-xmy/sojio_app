"use client";

import { useEffect, useRef } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { Locale } from '@/locales';

const TRANSLATABLE_SELECTOR = '[data-translatable]';
const AUTO_TRANSLATE_SELECTOR = '[data-auto-translate-root]';
const SKIP_ATTRIBUTE = 'data-skip-translation';
const ORIGINAL_ATTR = 'translationOriginal';
const LOCALE_ATTR = 'translationLocale';
const CHINESE_CHAR_PATTERN = /[\u3400-\u4dbf\u4e00-\u9fff]/;
const SKIP_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'NOSCRIPT',
  'CODE',
  'PRE',
  'KBD',
  'SAMP',
  'VAR',
  'INPUT',
  'TEXTAREA',
  'SELECT',
  'OPTION',
  'META',
  'LINK',
]);

type TextMeta = {
  original: string;
  leading: string;
  trailing: string;
  locale?: Locale;
  lastApplied?: string;
};

type ElementTarget = {
  type: 'element';
  node: HTMLElement;
  key?: string;
  original: string;
  originalFull: string;
};

type TextTarget = {
  type: 'text';
  node: Text;
  key?: string;
  original: string;
  meta: TextMeta;
};

type TranslationTarget = ElementTarget | TextTarget;

const textMetaMap = new WeakMap<Text, TextMeta>();
const translationCache: Record<Locale, Map<string, string>> = {
  zh: new Map(),
  en: new Map(),
  ja: new Map(),
};

export function TranslationOrchestrator() {
  const { locale, translateTexts, t } = useTranslation();
  const observerRef = useRef<MutationObserver | null>(null);
  const rafRef = useRef<number | null>(null);
  const applyingRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const getAutoTranslateRoots = () => {
      const roots = Array.from(document.querySelectorAll<HTMLElement>(AUTO_TRANSLATE_SELECTOR));
      if (!roots.length && document.body) {
        roots.push(document.body);
      }
      return roots;
    };

    const shouldSkipElement = (element: Element | null) => {
      if (!element) return true;
      if (element.closest(`[${SKIP_ATTRIBUTE}="true"]`)) return true;
      if (SKIP_TAGS.has(element.tagName)) return true;
      if (element instanceof HTMLElement && element.isContentEditable) return true;
      return false;
    };

    const ensureTextMeta = (node: Text, currentValue: string) => {
      let meta = textMetaMap.get(node);
      const createMeta = (value: string): TextMeta => {
        const leading = value.match(/^\s*/)?.[0] ?? '';
        const trailing = value.match(/\s*$/)?.[0] ?? '';
        return {
          original: value,
          leading,
          trailing,
          lastApplied: value,
        };
      };

      if (!meta) {
        meta = createMeta(currentValue);
        textMetaMap.set(node, meta);
        return meta;
      }

      if (meta.lastApplied !== currentValue && CHINESE_CHAR_PATTERN.test(currentValue)) {
        const leading = currentValue.match(/^\s*/)?.[0] ?? '';
        const trailing = currentValue.match(/\s*$/)?.[0] ?? '';
        meta.original = currentValue;
        meta.leading = leading;
        meta.trailing = trailing;
        meta.locale = undefined;
        meta.lastApplied = currentValue;
      }

      return meta;
    };

    const collectElementTargets = (): ElementTarget[] => {
      const nodes = Array.from(document.querySelectorAll<HTMLElement>(TRANSLATABLE_SELECTOR));

      return nodes
        .map((node) => {
          if (!node.dataset[ORIGINAL_ATTR]) {
            node.dataset[ORIGINAL_ATTR] = node.textContent ?? '';
          }
          const originalFull = node.dataset[ORIGINAL_ATTR] ?? '';
          const trimmedOriginal = originalFull.trim();
          if (!trimmedOriginal) {
            return null;
          }
          if (node.dataset[LOCALE_ATTR] === locale) {
            return null;
          }
          return {
            type: 'element' as const,
            node,
            key: node.dataset.translationKey,
            original: trimmedOriginal,
            originalFull,
          };
        })
        .filter(Boolean) as ElementTarget[];
    };

    const collectTextTargets = (): TextTarget[] => {
      const roots = getAutoTranslateRoots();
      const targets: TextTarget[] = [];

      roots.forEach((root) => {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          const textNode = walker.currentNode as Text;
          const parentElement = textNode.parentElement;
          if (!parentElement) continue;
          if (parentElement.closest(TRANSLATABLE_SELECTOR)) continue;
          if (shouldSkipElement(parentElement)) continue;
          const value = textNode.textContent ?? '';
          if (!value.trim()) continue;
          if (!CHINESE_CHAR_PATTERN.test(value)) continue;
          const meta = ensureTextMeta(textNode, value);
          const trimmedOriginal = meta.original.trim();
          if (!trimmedOriginal) continue;
          if (meta.locale === locale) continue;
          targets.push({
            type: 'text',
            node: textNode,
            key: parentElement.dataset.translationKey,
            original: trimmedOriginal,
            meta,
          });
        }
      });

      return targets;
    };

    const applyToElement = (target: ElementTarget, value: string) => {
      const finalValue = locale === 'zh' ? target.originalFull : value;
      if (target.node.textContent !== finalValue) {
        target.node.textContent = finalValue;
      }
      target.node.dataset[LOCALE_ATTR] = locale;
    };

    const applyToText = (target: TextTarget, value: string) => {
      const { meta } = target;
      if (!meta) return;

      if (locale === 'zh') {
        if (target.node.textContent !== meta.original) {
          target.node.textContent = meta.original;
        }
        meta.locale = 'zh';
        meta.lastApplied = meta.original;
        return;
      }

      const finalValue = `${meta.leading}${value}${meta.trailing}`;
      if (target.node.textContent !== finalValue) {
        target.node.textContent = finalValue;
      }
      meta.locale = locale;
      meta.lastApplied = finalValue;
    };

    const applyTranslations = async () => {
      if (applyingRef.current) return;
      applyingRef.current = true;

      const elementTargets = collectElementTargets();
      const textTargets = collectTextTargets();
      const targets: TranslationTarget[] = [...elementTargets, ...textTargets];

      if (!targets.length) {
        applyingRef.current = false;
        return;
      }

      const keyedTargets = targets.filter((target) => target.key) as TranslationTarget[];
      const dynamicTargets = targets.filter((target) => !target.key);
      const translations = new Map<TranslationTarget, string>();

      keyedTargets.forEach((target) => {
        const translation = t(target.key!, target.original);
        translations.set(target, translation);
      });

      if (locale === 'zh') {
        dynamicTargets.forEach((target) => {
          translations.set(target, target.original);
        });
      } else {
        const cache = translationCache[locale];
        const pendingTargets: TranslationTarget[] = [];
        const payload: string[] = [];

        dynamicTargets.forEach((target) => {
          const cached = cache.get(target.original);
          if (cached) {
            translations.set(target, cached);
            return;
          }
          pendingTargets.push(target);
          payload.push(target.original);
        });

        if (payload.length) {
          try {
            const translated = await translateTexts(payload, locale);
            pendingTargets.forEach((target, index) => {
              const result = translated[index] ?? target.original;
              cache.set(target.original, result);
              translations.set(target, result);
            });
          } catch (error) {
            console.error('[translation] dynamic translation failed', error);
            pendingTargets.forEach((target) => {
              translations.set(target, target.original);
            });
          }
        }
      }

      targets.forEach((target) => {
        const value = translations.get(target) ?? target.original;
        if (target.type === 'element') {
          applyToElement(target, value);
        } else {
          applyToText(target, value);
        }
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
      observerRef.current.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
      });
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

