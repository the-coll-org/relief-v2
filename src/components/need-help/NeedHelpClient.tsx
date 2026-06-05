'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { OrganizationDto } from '@/lib/types';
import { SearchBar } from '@/components/ui/SearchBar';
import { FilterPills, type Pill } from '@/components/ui/FilterPills';
import { ScrollToTop } from '@/components/ui/ScrollToTop';
import { Toast } from '@/components/ui/Toast';
import { OrganizationCard } from '@/components/cards/OrganizationCard';
import { distanceToDistricts } from '@/lib/districtGeo';

const PAGE_SIZE = 10;

// Pills mirror the live app + brief. category = CRN ids (comma = OR). The
// "nearest" pill triggers geolocation proximity sorting instead of a filter.
const PILL_DEFS: { id: string; category: string | null; geo?: boolean }[] = [
  { id: 'nearest', category: null, geo: true },
  { id: 'food', category: 'food_nutrition,wash_hygiene' },
  { id: 'medical', category: 'health_medical' },
  { id: 'shelter', category: 'shelter_nfi' },
  { id: 'clothes', category: 'shelter_nfi' },
  { id: 'safety', category: 'safety_protection' },
  { id: 'cash', category: 'cash_livelihood' },
];

function slug(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function toCard(dto: OrganizationDto) {
  return {
    title: dto.title,
    title_ar: dto.title_ar,
    categoryLabel: dto.categories[0]?.label ?? dto.organization_type,
    sectors: dto.sectors,
    description: dto.description,
    locations: dto.locations,
    phone: dto.phone_numbers[0] ?? null,
    whatsapp: dto.whatsapp,
    updated_at: dto.updated_at,
    mapHref: dto.locations[0] ? `/map?focus=${slug(dto.locations[0])}` : '/map',
  };
}

export function NeedHelpClient() {
  const t = useTranslations('needHelp');
  const tc = useTranslations('common');

  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [activePill, setActivePill] = useState<string | null>(null);
  const [items, setItems] = useState<OrganizationDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [userCoords, setUserCoords] = useState<[number, number] | null>(null);
  const reqId = useRef(0);

  // debounce search
  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(id);
  }, [query]);

  const pills: Pill[] = useMemo(
    () => PILL_DEFS.map((p) => ({ id: p.id, label: t(`pills.${p.id}`) })),
    [t]
  );

  const activeCategory = useMemo(() => {
    const def = PILL_DEFS.find((p) => p.id === activePill);
    return def && !def.geo ? def.category : null;
  }, [activePill]);

  const nearestActive = activePill === 'nearest';

  const buildUrl = useCallback(
    (pageNum: number, pageSize: number) => {
      const p = new URLSearchParams();
      p.set('page', String(pageNum));
      p.set('page_size', String(pageSize));
      if (debounced) {
        p.set('search', debounced);
        p.set('sort', 'relevance');
      }
      if (activeCategory) p.set('category', activeCategory);
      return `/api/organizations?${p.toString()}`;
    },
    [debounced, activeCategory]
  );

  // Primary load (page 1) — re-runs on search / filter / geo change.
  useEffect(() => {
    const id = ++reqId.current;
    setLoading(true);
    // "nearest": pull a large set and sort client-side by zone proximity.
    const pageSize = nearestActive && userCoords ? 100 : PAGE_SIZE;
    fetch(buildUrl(1, pageSize))
      .then((r) => r.json())
      .then((json: { data: OrganizationDto[]; total: number }) => {
        if (id !== reqId.current) return;
        let data = json.data;
        if (nearestActive && userCoords) {
          data = [...data].sort(
            (a, b) =>
              distanceToDistricts(userCoords, a.locations) -
              distanceToDistricts(userCoords, b.locations)
          );
        }
        setItems(data);
        setTotal(json.total);
        setPage(1);
      })
      .catch(() => {
        if (id === reqId.current) {
          setItems([]);
          setTotal(0);
        }
      })
      .finally(() => {
        if (id === reqId.current) setLoading(false);
      });
  }, [buildUrl, nearestActive, userCoords]);

  const loadMore = useCallback(() => {
    if (loadingMore || items.length >= total) return;
    setLoadingMore(true);
    const next = page + 1;
    fetch(buildUrl(next, PAGE_SIZE))
      .then((r) => r.json())
      .then((json: { data: OrganizationDto[] }) => {
        setItems((prev) => [...prev, ...json.data]);
        setPage(next);
      })
      .finally(() => setLoadingMore(false));
  }, [buildUrl, loadingMore, items.length, total, page]);

  const onTogglePill = useCallback(
    (id: string) => {
      if (id === activePill) {
        setActivePill(null);
        setUserCoords(null);
        return;
      }
      if (id === 'nearest') {
        if (!('geolocation' in navigator)) {
          setToast(t('geo.unsupported'));
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setUserCoords([pos.coords.latitude, pos.coords.longitude]);
            setActivePill('nearest');
          },
          () => setToast(t('geo.denied')),
          { timeout: 8000 }
        );
        return;
      }
      setActivePill(id);
      setUserCoords(null);
    },
    [activePill, t]
  );

  const canLoadMore = !nearestActive && items.length < total;

  return (
    <div className="flex flex-col gap-md">
      <SearchBar value={query} onChange={setQuery} placeholder={t('searchPlaceholder')} />
      <FilterPills pills={pills} activeId={activePill} onToggle={onTogglePill} />

      <p className="text-sm font-medium text-text-secondary">
        <span dir="ltr" className="tabular-nums">
          {items.length} / {total}
        </span>{' '}
        {t('resultUnit')}
      </p>

      {loading ? (
        <div className="grid gap-md sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-card bg-surface shadow-card" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-card bg-surface p-xl text-center shadow-card">
          <p className="font-heading text-lg font-semibold text-text-primary">
            {t('empty.title')}
          </p>
          <p className="mt-1 text-sm text-text-secondary">{t('empty.subtitle')}</p>
        </div>
      ) : (
        <>
          <div className="grid gap-md sm:grid-cols-2">
            {items.map((dto) => (
              <OrganizationCard key={dto.id} {...toCard(dto)} />
            ))}
          </div>
          {canLoadMore && (
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="mx-auto mt-2 rounded-button bg-primary px-lg py-2.5 text-sm font-semibold text-text-inverse disabled:opacity-60"
            >
              {loadingMore ? tc('loading') : t('loadMore')}
            </button>
          )}
        </>
      )}

      <ScrollToTop label={tc('scrollToTop')} />
      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
