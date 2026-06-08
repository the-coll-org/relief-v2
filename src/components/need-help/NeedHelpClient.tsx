'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { OrganizationDto } from '@/lib/types';
import { SearchBar } from '@/components/ui/SearchBar';
import { FilterPills, type Pill } from '@/components/ui/FilterPills';
import { ScrollToTop } from '@/components/ui/ScrollToTop';
import { Toast } from '@/components/ui/Toast';
import { OrganizationCard } from '@/components/cards/OrganizationCard';
import { FiltersSheet } from '@/components/ui/FiltersSheet';
import { MoreFiltersButton } from '@/components/ui/MoreFiltersButton';
import { useFilterOptions } from '@/components/ui/useFilterOptions';
import { distanceToDistricts } from '@/lib/districtGeo';
import { arabicDistrict } from '@/lib/i18nLabels';

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
    categoryLabel_ar: dto.categories[0]?.label_ar ?? dto.organization_type,
    sectors: dto.sectors,
    description: dto.description,
    locations: dto.locations,
    locations_ar: dto.locations.map(arabicDistrict),
    phone: dto.phone_numbers[0] ?? null,
    whatsapp: dto.whatsapp,
    updated_at: dto.updated_at,
    mapHref: dto.locations[0] ? `/map?focus=${slug(dto.locations[0])}` : '/map',
  };
}

export function NeedHelpClient() {
  const t = useTranslations('needHelp');
  const tc = useTranslations('common');
  const tf = useTranslations('filters');

  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [activePills, setActivePills] = useState<string[]>([]);
  const [items, setItems] = useState<OrganizationDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [userCoords, setUserCoords] = useState<[number, number] | null>(null);
  // "More filters" sheet: districts → location, services → extra categories.
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetDistricts, setSheetDistricts] = useState<string[]>([]);
  const [sheetServices, setSheetServices] = useState<string[]>([]);
  const { districts: districtOptions, categories: categoryOptions } = useFilterOptions();
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

  // Category ids from the quick pills (OR union).
  const pillCats = useMemo(
    () =>
      activePills
        .map((id) => PILL_DEFS.find((p) => p.id === id))
        .filter((p): p is (typeof PILL_DEFS)[number] => !!p && !p.geo && !!p.category)
        .map((p) => p.category as string),
    [activePills]
  );

  // category = (pills ∪ sheet services), all OR. location = sheet districts (OR).
  // Backend ANDs location with the category group → location AND (cat OR cat…).
  const activeCategory = useMemo(
    () => [...pillCats, ...sheetServices].join(','),
    [pillCats, sheetServices]
  );
  const activeLocation = useMemo(() => sheetDistricts.join(','), [sheetDistricts]);

  const nearestActive = activePills.includes('nearest');

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
      if (activeLocation) p.set('location', activeLocation);
      return `/api/organizations?${p.toString()}`;
    },
    [debounced, activeCategory, activeLocation]
  );

  // Live count for the sheet's pending selection (combined with active pills).
  const fetchSheetCount = useCallback(
    async (districts: string[], services: string[]) => {
      const p = new URLSearchParams();
      p.set('page_size', '1');
      const cats = [...pillCats, ...services];
      if (cats.length) p.set('category', cats.join(','));
      if (districts.length) p.set('location', districts.join(','));
      const json = await (await fetch(`/api/organizations?${p.toString()}`)).json();
      return json.total as number;
    },
    [pillCats]
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
      if (activePills.includes(id)) {
        setActivePills((prev) => prev.filter((x) => x !== id));
        if (id === 'nearest') setUserCoords(null);
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
            setActivePills((prev) => [...prev, 'nearest']);
          },
          () => setToast(t('geo.denied')),
          { timeout: 8000 }
        );
        return;
      }
      setActivePills((prev) => [...prev, id]);
    },
    [activePills, t]
  );

  const canLoadMore = !nearestActive && items.length < total;

  return (
    <div className="flex flex-col gap-md">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <SearchBar value={query} onChange={setQuery} placeholder={t('searchPlaceholder')} />
        </div>
        <MoreFiltersButton
          label={tf('button')}
          count={sheetDistricts.length + sheetServices.length}
          onClick={() => setSheetOpen(true)}
        />
      </div>
      <FilterPills pills={pills} activeIds={activePills} onToggle={onTogglePill} />

      <p className="text-sm font-medium text-text-secondary">
        <span dir="ltr" className="tabular-nums">
          {items.length} / {total}
        </span>{' '}
        {t('resultUnit')}
      </p>

      {loading ? (
        <div className="grid gap-md sm:grid-cols-2 lg:grid-cols-3">
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
          <div className="grid gap-md sm:grid-cols-2 lg:grid-cols-3">
            {items.map((dto) => (
              <OrganizationCard key={dto.id} {...toCard(dto)} />
            ))}
          </div>
          {canLoadMore && (
            <div className="mt-2 flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="rounded-button bg-primary px-lg py-2.5 text-sm font-semibold text-text-inverse disabled:opacity-60"
              >
                {loadingMore ? tc('loading') : t('loadMore')}
              </button>
              <p className="text-sm font-medium text-text-secondary">
                <span dir="ltr" className="tabular-nums">
                  {items.length} / {total}
                </span>{' '}
                {t('resultUnit')}
              </p>
            </div>
          )}
        </>
      )}

      <ScrollToTop label={tc('scrollToTop')} />
      <Toast message={toast} onDismiss={() => setToast(null)} />

      <FiltersSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={tf('title')}
        districtLabel={tf('district')}
        serviceLabel={tf('serviceType')}
        resetLabel={tf('reset')}
        showMoreLabel={tf('showMore')}
        showLessLabel={tf('showLess')}
        applyLabel={(n) => tf('apply', { count: n })}
        districtOptions={districtOptions}
        serviceOptions={categoryOptions}
        initialDistricts={sheetDistricts}
        initialServices={sheetServices}
        fetchCount={fetchSheetCount}
        onApply={(d, s) => {
          setSheetDistricts(d);
          setSheetServices(s);
          setSheetOpen(false);
        }}
      />
    </div>
  );
}
