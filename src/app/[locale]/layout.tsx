import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isAr = locale === 'ar';
  // Each environment self-describes via SITE_URL (set per container); prod default.
  const base = process.env.SITE_URL ?? 'https://rn.thecoll.org';
  const title = isAr ? 'شبكة الإغاثة — ذا كولكتيف' : 'Relief Network — The Collective';
  const description = isAr
    ? 'اعثر بسرعة على الطعام والمأوى والرعاية الطبية وخطوط الطوارئ في جميع أنحاء لبنان.'
    : 'Find food, shelter, medical care and emergency hotlines across Lebanon — fast.';
  const pageUrl = isAr ? base : `${base}/en`;

  return {
    metadataBase: new URL(base),
    title,
    description,
    manifest: '/manifest.webmanifest',
    appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Relief Network' },
    alternates: {
      canonical: isAr ? '/' : '/en',
      languages: { ar: '/', en: '/en' },
    },
    openGraph: {
      type: 'website',
      siteName: 'Relief Network — The Collective',
      title,
      description,
      url: pageUrl,
      locale: isAr ? 'ar_LB' : 'en_US',
      images: [
        { url: '/og.png', width: 1200, height: 630, alt: 'Relief Network — The Collective' },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/og.png'],
    },
  };
}

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

  // Self-hosted Umami analytics: only load when infra has supplied both values
  // (per environment). Unset → no tracker, so dev and un-provisioned builds
  // stay tracking-free. Honors Do-Not-Track; cookieless by default.
  const umamiSrc = process.env.UMAMI_SRC;
  const umamiWebsiteId = process.env.UMAMI_WEBSITE_ID;

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
        {umamiSrc && umamiWebsiteId && (
          <Script
            src={umamiSrc}
            data-website-id={umamiWebsiteId}
            data-do-not-track="true"
            strategy="afterInteractive"
          />
        )}
        <NextIntlClientProvider messages={messages}>
          <PWA />
          <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col pb-28">
            {children}
          </div>
          <BottomNav />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
