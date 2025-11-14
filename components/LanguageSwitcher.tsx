"use client";

import { useCallback, useState } from 'react';
import { Bot, Languages } from 'lucide-react';
import { localeMeta, Locale, SUPPORTED_LOCALES } from '@/locales';
import { useTranslation } from '@/hooks/useTranslation';

const quickLocales: Locale[] = ['zh', 'en', 'ja'];

export const LanguageSwitcher = () => {
  const { locale, setLocale, t } = useTranslation();
  const [engineOpen, setEngineOpen] = useState(false);
  const [engineTarget, setEngineTarget] = useState<Locale>(locale);

  const toggleEngine = useCallback(() => {
    setEngineOpen((prev) => {
      const next = !prev;
      if (next) {
        setEngineTarget(locale);
      }
      return next;
    });
  }, [locale]);

  const handleLocaleSwitch = (nextLocale: Locale) => {
    setEngineOpen(false);
    if (nextLocale === locale) return;
    setLocale(nextLocale);
  };

  const handleEngineConfirm = () => {
    setLocale(engineTarget);
    setEngineOpen(false);
  };

  return (
    <div style={{ position: 'relative', display: 'inline-flex', gap: '0.35rem' }}>
      {quickLocales.map((item) => (
        <button
          key={item}
          onClick={() => handleLocaleSwitch(item)}
          aria-label={`${t('translation.switchTo')} ${localeMeta[item].label}`}
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            border: '1px solid rgba(148, 163, 184, 0.4)',
            background: locale === item ? 'linear-gradient(135deg, #22D3EE, #3B82F6)' : '#FFFFFF',
            color: locale === item ? '#FFFFFF' : '#0F172A',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow:
              locale === item ? '0 8px 18px rgba(59, 130, 246, 0.25)' : '0 4px 8px rgba(15, 23, 42, 0.08)',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          }}
        >
          {localeMeta[item].shortLabel}
        </button>
      ))}

      <button
        onClick={toggleEngine}
        aria-label={t('translation.engineAria')}
        style={{
          width: '38px',
          height: '38px',
          borderRadius: '50%',
          border: '1px solid rgba(148, 163, 184, 0.4)',
          background: engineOpen ? 'linear-gradient(135deg, #A855F7, #7C3AED)' : '#FFFFFF',
          color: engineOpen ? '#FFFFFF' : '#0F172A',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: engineOpen ? '0 10px 20px rgba(124, 58, 237, 0.25)' : '0 4px 8px rgba(15, 23, 42, 0.08)',
        }}
      >
        <Bot size={18} />
      </button>

      {engineOpen && (
        <div
          style={{
            position: 'absolute',
            top: '48px',
            right: 0,
            width: '220px',
            background: '#FFFFFF',
            borderRadius: '16px',
            padding: '1rem',
            boxShadow: '0 22px 45px rgba(15, 23, 42, 0.18)',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            zIndex: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <Languages size={18} color="#4C1D95" />
            <div>
              <p style={{ margin: 0, fontSize: '0.92rem', fontWeight: 600, color: '#1E1B4B' }}>
                {t('translation.panelTitle')}
              </p>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#475569' }}>{t('translation.panelSubtitle')}</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {SUPPORTED_LOCALES.map((item) => (
              <label
                key={item}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.55rem 0.65rem',
                  borderRadius: '10px',
                  border: engineTarget === item ? '1px solid rgba(79, 70, 229, 0.4)' : '1px solid transparent',
                  background: engineTarget === item ? 'rgba(79, 70, 229, 0.08)' : 'transparent',
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: '0.85rem', color: '#0F172A' }}>{localeMeta[item].label}</span>
                <input
                  type="radio"
                  name="engineLocale"
                  value={item}
                  checked={engineTarget === item}
                  onChange={() => setEngineTarget(item)}
                />
              </label>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.9rem' }}>
            <button
              onClick={() => setEngineOpen(false)}
              style={{
                flex: 1,
                padding: '0.5rem 0.75rem',
                borderRadius: '10px',
                border: '1px solid rgba(148, 163, 184, 0.6)',
                background: '#F8FAFC',
                color: '#0F172A',
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleEngineConfirm}
              style={{
                flex: 1,
                padding: '0.5rem 0.75rem',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                color: '#FFFFFF',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 12px 24px rgba(99, 102, 241, 0.25)',
              }}
            >
              {t('common.translateNow')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

