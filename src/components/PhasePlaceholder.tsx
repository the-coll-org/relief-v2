import { useTranslations } from 'next-intl';

/** Temporary card shown until each tab's real content lands (phases 3–5). */
export function PhasePlaceholder({
  screen,
}: {
  screen: 'needHelp' | 'helpCenter' | 'map';
}) {
  const t = useTranslations('header');
  return (
    <div className="rounded-card bg-surface p-lg shadow-card">
      <h2 className="font-heading text-lg font-semibold text-text-primary">
        {t(`${screen}.title`)}
      </h2>
      <p className="mt-2 text-sm text-text-secondary">{t(`${screen}.subtitle`)}</p>
      <div className="mt-md h-2 w-16 rounded-pill bg-accent-gold" />
    </div>
  );
}
