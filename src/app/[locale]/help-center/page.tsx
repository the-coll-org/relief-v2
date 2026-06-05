import { setRequestLocale } from 'next-intl/server';
import { ScreenHeader } from '@/components/ScreenHeader';
import { EmergencyHotlines } from '@/components/help-center/EmergencyHotlines';
import { HelpCenterClient } from '@/components/help-center/HelpCenterClient';

export default async function HelpCenterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <>
      <ScreenHeader screen="helpCenter" />
      <main className="flex flex-1 flex-col gap-lg px-md py-lg">
        <EmergencyHotlines locale={locale} />
        <HelpCenterClient />
      </main>
    </>
  );
}
