'use client';

import { useLocale, useTranslations } from 'next-intl';

/** Build a compact page list with ellipses: 1 … 4 5 6 … 20 */
function pageItems(current: number, count: number): (number | 'dots')[] {
  const out: (number | 'dots')[] = [];
  const keep = new Set<number>([1, count, current, current - 1, current + 1]);
  let prev = 0;
  for (let p = 1; p <= count; p++) {
    if (!keep.has(p)) continue;
    if (prev && p - prev > 1) out.push('dots');
    out.push(p);
    prev = p;
  }
  return out;
}

function Chevron({ flip }: { flip: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={{ transform: flip ? 'scaleX(-1)' : undefined }}
    >
      <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Pagination({
  page,
  pageCount,
  onChange,
}: {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
}) {
  const t = useTranslations('pagination');
  const isArabic = useLocale() === 'ar';
  if (pageCount <= 1) return null;

  const items = pageItems(page, pageCount);
  const go = (p: number) => onChange(Math.min(pageCount, Math.max(1, p)));

  // In RTL the row reverses, so "previous" sits on the right; flip the chevrons
  // so they still point toward where the previous/next page visually is.
  return (
    <nav aria-label={t('label')} className="mt-2 flex items-center justify-center gap-1.5">
      <button
        type="button"
        aria-label={t('previous')}
        disabled={page <= 1}
        onClick={() => go(page - 1)}
        className="grid h-9 w-9 place-items-center rounded-button border border-black/10 bg-surface text-text-primary disabled:opacity-40"
      >
        <Chevron flip={isArabic} />
      </button>

      {items.map((it, i) =>
        it === 'dots' ? (
          <span key={`d${i}`} className="px-1 text-text-secondary">
            …
          </span>
        ) : (
          <button
            key={it}
            type="button"
            aria-label={t('page', { page: it })}
            aria-current={it === page ? 'page' : undefined}
            onClick={() => go(it)}
            className={`grid h-9 min-w-9 place-items-center rounded-button px-2 text-sm font-semibold tabular-nums ${
              it === page
                ? 'bg-primary text-text-inverse'
                : 'border border-black/10 bg-surface text-text-primary'
            }`}
          >
            {it}
          </button>
        )
      )}

      <button
        type="button"
        aria-label={t('next')}
        disabled={page >= pageCount}
        onClick={() => go(page + 1)}
        className="grid h-9 w-9 place-items-center rounded-button border border-black/10 bg-surface text-text-primary disabled:opacity-40"
      >
        <Chevron flip={!isArabic} />
      </button>
    </nav>
  );
}
