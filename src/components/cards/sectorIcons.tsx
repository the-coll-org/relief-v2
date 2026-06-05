import type { ReactNode } from 'react';

export type SectorIcon =
  | 'food'
  | 'medical'
  | 'shelter'
  | 'clothes'
  | 'safety'
  | 'cash'
  | 'education';

const S = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none' as const };

const ICONS: Record<SectorIcon, ReactNode> = {
  food: (
    <svg {...S}>
      <path d="M5 3v8a3 3 0 0 0 6 0V3M8 3v18M19 3c-1.5 0-3 1.8-3 5s1 5 3 5m0 0v8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  medical: (
    <svg {...S}>
      <path d="M12 3a3 3 0 0 0-3 3H6a3 3 0 0 0-3 3v9h18v-9a3 3 0 0 0-3-3h-3a3 3 0 0 0-3-3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M12 11v5m-2.5-2.5h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  shelter: (
    <svg {...S}>
      <path d="m3 11 9-7 9 7M5 9.5V20h14V9.5M10 20v-5h4v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  clothes: (
    <svg {...S}>
      <path d="M9 3 4 7l2.5 3L9 8.5V21h6V8.5L17.5 10 20 7l-5-4a3 3 0 0 1-6 0Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  ),
  safety: (
    <svg {...S}>
      <path d="M12 3 5 6v5c0 4 3 7 7 9 4-2 7-5 7-9V6l-7-3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  cash: (
    <svg {...S}>
      <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  ),
  education: (
    <svg {...S}>
      <path d="m12 4 10 5-10 5L2 9l10-5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M6 11v5c0 1.1 2.7 2 6 2s6-.9 6-2v-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
};

export function deriveSectorIcon(sectors: string[]): SectorIcon {
  const n = sectors.map((s) => s.toLowerCase());
  const has = (...keys: string[]) => n.some((s) => keys.some((k) => s.includes(k)));
  if (has('food', 'wash', 'water', 'nutrition')) return 'food';
  if (has('health', 'medical', 'hospital', 'mental')) return 'medical';
  if (has('shelter', 'housing')) return 'shelter';
  if (has('cloth', 'nfi')) return 'clothes';
  if (has('gbv', 'protection', 'child', 'social', 'security', 'fire')) return 'safety';
  if (has('cwg', 'livelihood', 'cash', 'financial')) return 'cash';
  if (has('education')) return 'education';
  return 'shelter';
}

export function SectorGlyph({ icon }: { icon: SectorIcon }) {
  return <>{ICONS[icon]}</>;
}
