import { setRequestLocale } from 'next-intl/server';
import { ScreenHeader } from '@/components/ScreenHeader';
import { PhasePlaceholder } from '@/components/PhasePlaceholder';

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
      <main className="flex-1 px-md py-lg">
        <PhasePlaceholder screen="helpCenter" />
      </main>
    </>
  );
}
