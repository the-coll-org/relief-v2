'use client';

import type { ReactNode } from 'react';

export interface Pill {
  id: string;
  label: string;
  icon?: ReactNode;
}

export function FilterPills({
  pills,
  activeId,
  onToggle,
}: {
  pills: Pill[];
  activeId: string | null;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="-mx-md overflow-x-auto px-md no-scrollbar">
      <div className="flex w-max items-center gap-2">
        {pills.map((p) => {
          const active = p.id === activeId;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onToggle(p.id)}
              aria-pressed={active}
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
