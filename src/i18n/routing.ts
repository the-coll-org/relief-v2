import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  locales: ['ar', 'en'],
  // Arabic is the default; default locale carries no path prefix, so the
  // default routes are "/", "/help-center", "/map" (Arabic, RTL). English is
  // served under "/en", "/en/help-center", "/en/map".
  defaultLocale: 'ar',
  localePrefix: 'as-needed',
  // Arabic is the canonical default document state. Do NOT auto-switch to the
  // browser's Accept-Language — "/" must always serve Arabic-RTL (brief §1).
  localeDetection: false,
});

export type Locale = (typeof routing.locales)[number];

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
