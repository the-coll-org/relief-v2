import { Suspense } from 'react';
import { setRequestLocale } from 'next-intl/server';
import { ScreenHeader } from '@/components/ScreenHeader';
import { MapClient } from '@/components/map/MapClient';

export default async function MapPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <>
      <ScreenHeader screen="map" />
      <main className="flex-1 px-md py-lg">
        <Suspense>
          <MapClient />
        </Suspense>
      </main>
    </>
  );
}
