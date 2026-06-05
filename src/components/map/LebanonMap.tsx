'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { MAP_MARKERS } from '@/lib/mapRegions';

interface PanZoom {
  zoomIn: () => void;
  zoomOut: () => void;
  destroy: () => void;
  reset: () => void;
}

export function LebanonMap({
  counts,
  selectedId,
  onSelect,
  zoomInLabel,
  zoomOutLabel,
}: {
  counts: Record<string, number>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  zoomInLabel: string;
  zoomOutLabel: string;
}) {
  const t = useTranslations('map.cities');
  const svgRef = useRef<SVGSVGElement | null>(null);
  const pzRef = useRef<PanZoom | null>(null);

  useEffect(() => {
    let cancelled = false;
    const el = svgRef.current;
    if (!el) return;
    import('svg-pan-zoom').then((mod) => {
      if (cancelled || !svgRef.current) return;
      pzRef.current = mod.default(svgRef.current, {
        zoomEnabled: true,
        panEnabled: true,
        controlIconsEnabled: false,
        fit: true,
        center: true,
        minZoom: 0.8,
        maxZoom: 12,
        zoomScaleSensitivity: 0.3,
        dblClickZoomEnabled: false,
      }) as unknown as PanZoom;
    });
    return () => {
      cancelled = true;
      try {
        pzRef.current?.destroy();
      } catch {
        /* ignore */
      }
      pzRef.current = null;
    };
  }, []);

  return (
    <div className="relative overflow-hidden rounded-card bg-surface shadow-card">
      <svg
        ref={svgRef}
        viewBox="0 0 250 326"
        role="img"
        aria-label="Lebanon resource map"
        className="h-[60vh] max-h-[520px] w-full touch-none"
      >
        <image href="/map.svg" x="0" y="0" width="250" height="326" opacity="0.9" />
        {MAP_MARKERS.map((m) => {
          const count = m.regionIds.reduce((n, r) => n + (counts[r] ?? 0), 0);
          const selected = m.id === selectedId;
          return (
            <g
              key={m.id}
              role="button"
              tabIndex={0}
              aria-label={`${t(m.nameKey)}: ${count}`}
              onClick={() => onSelect(m.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onSelect(m.id);
              }}
              style={{ cursor: 'pointer' }}
            >
              <circle
                cx={m.x}
                cy={m.y}
                r={selected ? 13 : 11}
                fill="var(--color-primary)"
                stroke={selected ? 'var(--color-accent-gold)' : '#ffffff'}
                strokeWidth={selected ? 2.4 : 1.6}
              />
              <text
                x={m.x}
                y={m.y + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="9"
                fontWeight="700"
                fill="#ffffff"
              >
                {count}
              </text>
              <text
                x={m.x}
                y={m.y + 20}
                textAnchor="middle"
                fontSize="7"
                fontWeight="600"
                fill="var(--color-text-primary)"
              >
                {t(m.nameKey)}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="absolute end-3 top-3 flex flex-col gap-2">
        <button
          type="button"
          aria-label={zoomInLabel}
          onClick={() => pzRef.current?.zoomIn()}
          className="grid h-9 w-9 place-items-center rounded-button bg-surface text-text-primary shadow-card"
        >
          +
        </button>
        <button
          type="button"
          aria-label={zoomOutLabel}
          onClick={() => pzRef.current?.zoomOut()}
          className="grid h-9 w-9 place-items-center rounded-button bg-surface text-text-primary shadow-card"
        >
          −
        </button>
      </div>
    </div>
  );
}
