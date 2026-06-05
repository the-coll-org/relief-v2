import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { Locale } from '@/i18n/routing';
import { Cairo, League_Spartan, Montserrat } from 'next/font/google';
import { routing } from '@/i18n/routing';
import { ThemeScript } from '@/components/ThemeScript';
import { BottomNav } from '@/components/BottomNav';
import { PWA } from '@/components/PWA';
import '../globals.css';

const leagueSpartan = League_Spartan({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-league-spartan',
  display: 'swap',
});
const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-montserrat',
  display: 'swap',
});
const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-cairo',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Relief Network — The Collective',
  description:
    'Find food, shelter, medical care and emergency hotlines across Lebanon.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Relief Network' },
};

export const viewport: Viewport = {
  themeColor: '#2d4369',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as Locale)) {
    notFound();
  }
  setRequestLocale(locale);
  const messages = await getMessages();
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <html
      lang={locale}
      dir={dir}
      suppressHydrationWarning
      className={`${leagueSpartan.variable} ${montserrat.variable} ${cairo.variable}`}
    >
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-dvh bg-light text-text-primary antialiased">
        <NextIntlClientProvider messages={messages}>
          <PWA />
          <div className="mx-auto flex min-h-dvh w-full max-w-screen-sm flex-col pb-28">
            {children}
          </div>
          <BottomNav />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
