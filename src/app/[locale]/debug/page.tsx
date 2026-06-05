import { setRequestLocale } from 'next-intl/server';
import { getSnapshot } from '@/lib/store';

export const dynamic = 'force-dynamic';

// Temporary data-layer debug page (brief phase 2 allows one). Not linked from nav.
export default async function DebugPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { providers, hotlines, categories } = await getSnapshot();

  return (
    <main className="flex-1 px-md py-lg" dir="ltr">
      <h1 className="font-heading text-xl font-bold text-text-primary">Data debug</h1>
      <ul className="mt-md space-y-1 text-sm text-text-secondary">
        <li>providers (valid): {providers.length}</li>
        <li>hotlines (directory): {hotlines.length}</li>
        <li>category groups: {Object.keys(categories).join(', ')}</li>
        <li>sectors: {(categories.sector ?? []).length}</li>
        <li>districts: {(categories.district ?? []).length}</li>
      </ul>
      <h2 className="mt-lg font-heading font-semibold text-text-primary">
        First 8 providers
      </h2>
      <ol className="mt-2 space-y-1 text-sm text-text-secondary">
        {providers.slice(0, 8).map((p) => (
          <li key={p.provider_id}>
            {p.provider_name} — {(p.districts ?? []).join(', ') || '—'} —{' '}
            {(p.sectors ?? []).join(', ') || '—'}
          </li>
        ))}
      </ol>
    </main>
  );
}
