'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/routing';

function GlobeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function LanguageToggle() {
  const t = useTranslations('actions');
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const nextLocale = locale === 'ar' ? 'en' : 'ar';
  function switchLanguage() {
    router.replace(pathname, { locale: nextLocale });
  }

  return (
    <button
      type="button"
      onClick={switchLanguage}
      aria-label={t('toggleLanguage')}
      data-umami-event="language_switch"
      data-umami-event-to={nextLocale}
      className="flex h-10 items-center gap-2 rounded-pill bg-white/15 px-3 text-sm font-semibold text-text-inverse transition-colors hover:bg-white/25"
    >
      <GlobeIcon />
      <span>{t('toggleLanguage')}</span>
    </button>
  );
}
