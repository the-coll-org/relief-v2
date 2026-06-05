'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

/** Registers the service worker (production) and shows an offline banner. */
export function PWA() {
  const t = useTranslations('offline');
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* SW registration is best-effort */
      });
    }
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  if (!offline) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-50 bg-accent-gold px-md py-2 text-center text-sm font-medium text-text-primary"
    >
      {t('banner')}
    </div>
  );
}
