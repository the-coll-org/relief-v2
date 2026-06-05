'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

/** Registers the service worker (production) and shows an offline banner. */
export function PWA() {
  const t = useTranslations('offline');
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // If a service worker already controls this page (e.g. a returning visitor
      // still under the OLD site's worker, or an earlier version of this app),
      // reload once when our new worker takes over so they swap to the current
      // app without a manual refresh. First-time visitors (no existing
      // controller) are not reloaded. This also makes future deploys seamless.
      const hadController = !!navigator.serviceWorker.controller;
      let reloaded = false;
      const onControllerChange = () => {
        if (reloaded || !hadController) return;
        reloaded = true;
        window.location.reload();
      };
      navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
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
