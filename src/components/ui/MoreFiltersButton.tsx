'use client';

function FilterIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 5h18M6 12h12M10 19h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function MoreFiltersButton({
  label,
  count,
  onClick,
}: {
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex shrink-0 items-center gap-2 rounded-pill border border-black/10 bg-surface px-3.5 py-2 text-sm font-medium text-text-primary shadow-card"
    >
      <FilterIcon />
      {label}
      {count > 0 && (
        <span className="grid h-5 min-w-5 place-items-center rounded-pill bg-primary px-1 text-xs font-semibold text-text-inverse">
          {count}
        </span>
      )}
    </button>
  );
}
