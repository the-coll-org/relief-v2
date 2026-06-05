'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { EmergencyContact } from '@/lib/types';
import { SearchBar } from '@/components/ui/SearchBar';
import { FilterPills, type Pill } from '@/components/ui/FilterPills';
import { ScrollToTop } from '@/components/ui/ScrollToTop';
import { OrganizationCard } from '@/components/cards/OrganizationCard';

const PAGE_SIZE = 12;

// Service-type pills → underlying scraped hotline categories (audit §4.5).
const SERVICE_PILLS: { id: string; categories: string }[] = [
  { id: 'medical', categories: 'hospital,medical,medical / fire,mental health' },
  { id: 'safety', categories: 'gbv,child protection,security' },
  { id: 'cash', categories: 'financial assistance' },
  { id: 'emergency', categories: 'fire' },
];

function slug(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function toCard(h: EmergencyContact, isArabic: boolean) {
  const city = h.city && h.city.toLowerCase() !== 'nationwide' ? h.city : null;
  return {
    title: h.name_en || h.name_ar || h.id,
    title_ar: h.name_ar,
    categoryLabel: h.category || null,
    sectors: [h.category],
    description: h.email ?? null,
    locations: city ? [city] : isArabic ? ['على مستوى الوطن'] : ['Nationwide'],
    phone: h.phone || h.hotline || null,
    whatsapp: null as string | null,
    updated_at: null as string | null,
    mapHref: city ? `/map?focus=${slug(city)}` : null,
  };
}

export function HelpCenterClient() {
  const t = useTranslations('helpCenter');
  const tc = useTranslations('common');
  const tn = useTranslations('needHelp');
  const locale = useLocale();
  const isArabic = locale === 'ar';

  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [activePills, setActivePills] = useState<string[]>([]);
  const [items, setItems] = useState<EmergencyContact[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const reqId = useRef(0);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(id);
  }, [query]);

  const pills: Pill[] = useMemo(
    () => SERVICE_PILLS.map((p) => ({ id: p.id, label: t(`services.${p.id}`) })),
    [t]
  );

  // Hotlines hold a single category, so multi-select here is an OR-union of
  // every selected service type's underlying categories.
  const activeCategories = useMemo(() => {
    const cats = activePills
      .map((id) => SERVICE_PILLS.find((p) => p.id === id)?.categories)
      .filter((c): c is string => !!c);
    return cats.length ? cats.join(',') : null;
  }, [activePills]);

  const buildUrl = useCallback(
    (pageNum: number) => {
      const p = new URLSearchParams();
      p.set('page', String(pageNum));
      p.set('page_size', String(PAGE_SIZE));
      if (debounced) p.set('search', debounced);
      if (activeCategories) p.set('category', activeCategories);
      return `/api/hotlines?${p.toString()}`;
    },
    [debounced, activeCategories]
  );

  useEffect(() => {
    const id = ++reqId.current;
    setLoading(true);
    fetch(buildUrl(1))
      .then((r) => r.json())
      .then((json: { data: EmergencyContact[]; total: number }) => {
        if (id !== reqId.current) return;
        setItems(json.data);
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
  }, [buildUrl]);

  const loadMore = useCallback(() => {
    if (loadingMore || items.length >= total) return;
    setLoadingMore(true);
    const next = page + 1;
    fetch(buildUrl(next))
      .then((r) => r.json())
      .then((json: { data: EmergencyContact[] }) => {
        setItems((prev) => [...prev, ...json.data]);
        setPage(next);
      })
      .finally(() => setLoadingMore(false));
  }, [buildUrl, loadingMore, items.length, total, page]);

  return (
    <div className="flex flex-col gap-md">
      <SearchBar value={query} onChange={setQuery} placeholder={t('searchPlaceholder')} />
      <FilterPills
        pills={pills}
        activeIds={activePills}
        onToggle={(id) =>
          setActivePills((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
          )
        }
      />

      <p className="text-sm font-medium text-text-secondary">
        <span dir="ltr" className="tabular-nums">
          {items.length} / {total}
        </span>{' '}
        {t('resultUnit')}
      </p>

      {loading ? (
        <div className="grid gap-md sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-card bg-surface shadow-card" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-card bg-surface p-xl text-center shadow-card">
          <p className="font-heading text-lg font-semibold text-text-primary">
            {tn('empty.title')}
          </p>
          <p className="mt-1 text-sm text-text-secondary">{tn('empty.subtitle')}</p>
        </div>
      ) : (
        <>
          <div className="grid gap-md sm:grid-cols-2 lg:grid-cols-3">
            {items.map((h) => (
              <OrganizationCard key={h.id} {...toCard(h, isArabic)} />
            ))}
          </div>
          {items.length < total && (
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="mx-auto mt-2 rounded-button bg-primary px-lg py-2.5 text-sm font-semibold text-text-inverse disabled:opacity-60"
            >
              {loadingMore ? tc('loading') : tn('loadMore')}
            </button>
          )}
        </>
      )}

      <ScrollToTop label={tc('scrollToTop')} />
    </div>
  );
}
