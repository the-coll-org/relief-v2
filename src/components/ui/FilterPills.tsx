'use client';

import type { ReactNode } from 'react';

export interface Pill {
  id: string;
  label: string;
  icon?: ReactNode;
}

export function FilterPills({
  pills,
  activeIds,
  onToggle,
  source,
}: {
  pills: Pill[];
  activeIds: string[];
  onToggle: (id: string) => void;
  /** Screen the pills live on, for analytics attribution (need_help/map/etc). */
  source?: string;
}) {
  return (
    <div className="-mx-md overflow-x-auto px-md no-scrollbar">
      <div className="flex w-max items-center gap-2">
        {pills.map((p) => {
          const active = activeIds.includes(p.id);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onToggle(p.id)}
              aria-pressed={active}
              data-umami-event="filter_pill"
              data-umami-event-pill={p.id}
              data-umami-event-source={source}
              className={`flex shrink-0 items-center gap-1.5 rounded-pill px-3.5 py-2 text-sm font-medium transition-colors ${
                active
                  ? 'bg-primary text-text-inverse'
                  : 'border border-black/10 bg-surface text-text-secondary'
              }`}
            >
              {p.icon}
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
