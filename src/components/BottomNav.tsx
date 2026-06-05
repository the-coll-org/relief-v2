'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/routing';

function HelpIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 21s-7-4.35-9.33-9.06A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.33 5.94C19 16.65 12 21 12 21Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function DirectoryIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function MapIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m9 4-6 2.5v13L9 17l6 2.5 6-2.5v-13L15 6.5 9 4Zm0 0v13m6-10.5v13"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const TABS = [
  { href: '/', key: 'needHelp', Icon: HelpIcon },
  { href: '/help-center', key: 'helpCenter', Icon: DirectoryIcon },
  { href: '/map', key: 'map', Icon: MapIcon },
] as const;

export function BottomNav() {
  const t = useTranslations('nav');
  const pathname = usePathname();

  return (
    <nav
      aria-label={t('aria')}
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-md pb-[max(env(safe-area-inset-bottom),12px)]"
    >
      <ul className="flex w-full max-w-[360px] items-stretch justify-between gap-1 rounded-pill border border-black/5 bg-surface p-1.5 shadow-card">
        {TABS.map(({ href, key, Icon }) => {
          const active = pathname === href;
          return (
            <li key={key} className="flex-1">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center gap-1 rounded-pill px-2 py-2 font-medium transition-colors ${
                  active
                    ? 'bg-primary text-text-inverse'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <Icon />
                <span className="text-[11px] leading-none">{t(key)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
