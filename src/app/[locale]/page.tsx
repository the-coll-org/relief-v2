import { setRequestLocale } from 'next-intl/server';
import { ScreenHeader } from '@/components/ScreenHeader';
import { NeedHelpClient } from '@/components/need-help/NeedHelpClient';

export default async function NeedHelpPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <>
      <ScreenHeader screen="needHelp" />
      <main className="flex-1 px-md py-lg">
        <NeedHelpClient />
      </main>
    </>
  );
}
