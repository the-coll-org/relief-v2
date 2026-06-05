'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import type { MapRegionGroup, OrganizationDto } from '@/lib/types';
import { MAP_MARKERS, markerForRegion } from '@/lib/mapRegions';
import { distanceToDistricts } from '@/lib/districtGeo';
import { FilterPills, type Pill } from '@/components/ui/FilterPills';
import { Toast } from '@/components/ui/Toast';
import { OrganizationCard } from '@/components/cards/OrganizationCard';
import { LebanonMap } from './LebanonMap';

const PAGE_SIZE = 10;

const PILL_DEFS: { id: string; category: string | null; geo?: boolean }[] = [
  { id: 'clothes', category: 'shelter_nfi' },
  { id: 'shelter', category: 'shelter_nfi' },
  { id: 'medical', category: 'health_medical' },
  { id: 'food', category: 'food_nutrition,wash_hygiene' },
  { id: 'nearby', category: null, geo: true },
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
    mapHref: null,
  };
}

export function MapClient() {
  const t = useTranslations('map');
  const tn = useTranslations('needHelp');
  const tc = useTranslations('common');
  const focusParam = useSearchParams().get('focus');

  const [activePills, setActivePills] = useState<string[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [orgs, setOrgs] = useState<OrganizationDto[]>([]);
  const [orgTotal, setOrgTotal] = useState(0);
  const [orgPage, setOrgPage] = useState(1);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const orgReq = useRef(0);

  // AND-of-groups: each selected category pill is one ";"-separated group.
  const category = useMemo(() => {
    const groups = activePills
      .map((id) => PILL_DEFS.find((p) => p.id === id))
      .filter((p): p is (typeof PILL_DEFS)[number] => !!p && !p.geo && !!p.category)
      .map((p) => p.category as string);
    return groups.length ? groups.join(';') : null;
  }, [activePills]);

  const pills: Pill[] = useMemo(
    () => PILL_DEFS.map((p) => ({ id: p.id, label: t(`filters.${p.id}`) })),
    [t]
  );

  // Cluster counts from the map endpoint (re-fetched when the category changes).
  useEffect(() => {
    const url = category
      ? `/api/organizations/map?category=${encodeURIComponent(category)}`
      : '/api/organizations/map';
    fetch(url)
      .then((r) => r.json())
      .then((json: { data: MapRegionGroup[] }) => {
        const map: Record<string, number> = {};
        for (const g of json.data) map[g.region_id] = g.count;
        setCounts(map);
      })
      .catch(() => setCounts({}));
  }, [category]);

  const selectedMarker = useMemo(
    () => MAP_MARKERS.find((m) => m.id === selected) ?? null,
    [selected]
  );

  const fetchRegion = useCallback(
    (markerId: string, page: number, append: boolean) => {
      const marker = MAP_MARKERS.find((m) => m.id === markerId);
      if (!marker) return;
      const id = ++orgReq.current;
      if (append) setLoadingMore(true);
      else setLoadingOrgs(true);
      const p = new URLSearchParams();
      p.set('location', marker.regionIds.join(','));
      p.set('page', String(page));
      p.set('page_size', String(PAGE_SIZE));
      if (category) p.set('category', category);
      fetch(`/api/organizations?${p.toString()}`)
        .then((r) => r.json())
        .then((json: { data: OrganizationDto[]; total: number }) => {
          if (id !== orgReq.current) return;
          setOrgs((prev) => (append ? [...prev, ...json.data] : json.data));
          setOrgTotal(json.total);
          setOrgPage(page);
        })
        .finally(() => {
          if (id === orgReq.current) {
            setLoadingOrgs(false);
            setLoadingMore(false);
          }
        });
    },
    [category]
  );

  const selectMarker = useCallback(
    (markerId: string) => {
      setSelected(markerId);
      fetchRegion(markerId, 1, false);
    },
    [fetchRegion]
  );

  // Deep-link: /map?focus=<district> selects that district's marker once.
  const didFocus = useRef(false);
  useEffect(() => {
    if (didFocus.current || !focusParam) return;
    const marker = markerForRegion(focusParam);
    if (marker) {
      didFocus.current = true;
      selectMarker(marker.id);
    }
  }, [focusParam, selectMarker]);

  // Re-fetch the open region when the category filter changes.
  useEffect(() => {
    if (selected) fetchRegion(selected, 1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const onTogglePill = useCallback(
    (id: string) => {
      if (activePills.includes(id)) {
        setActivePills((prev) => prev.filter((x) => x !== id));
        return;
      }
      if (id === 'nearby') {
        if (!('geolocation' in navigator)) {
          setToast(tn('geo.unsupported'));
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const user: [number, number] = [pos.coords.latitude, pos.coords.longitude];
            let best = MAP_MARKERS[0];
            let bestD = Infinity;
            for (const m of MAP_MARKERS) {
              const d = distanceToDistricts(user, m.regionIds);
              if (d < bestD) {
                bestD = d;
                best = m;
              }
            }
            selectMarker(best.id);
          },
          () => setToast(tn('geo.denied')),
          { timeout: 8000 }
        );
        return;
      }
      setActivePills((prev) => [...prev, id]);
    },
    [activePills, tn, selectMarker]
  );

  return (
    <div className="flex flex-col gap-md">
      <FilterPills pills={pills} activeIds={activePills} onToggle={onTogglePill} />

      <LebanonMap
        counts={counts}
        selectedId={selected}
        onSelect={selectMarker}
        zoomInLabel={t('zoomIn')}
        zoomOutLabel={t('zoomOut')}
      />

      {selectedMarker && (
        <section aria-label={t('cities.' + selectedMarker.nameKey)} className="flex flex-col gap-md">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg font-semibold text-text-primary">
              {t('cities.' + selectedMarker.nameKey)}
            </h2>
            <span className="text-sm text-text-secondary">
              <span dir="ltr" className="tabular-nums">
                {orgTotal}
              </span>{' '}
              {tn('resultUnit')}
            </span>
          </div>

          {loadingOrgs ? (
            <div className="grid gap-md sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-40 animate-pulse rounded-card bg-surface shadow-card" />
              ))}
            </div>
          ) : orgs.length === 0 ? (
            <div className="rounded-card bg-surface p-lg text-center text-sm text-text-secondary shadow-card">
              {tn('empty.title')}
            </div>
          ) : (
            <>
              <div className="grid gap-md sm:grid-cols-2 lg:grid-cols-3">
                {orgs.map((dto) => (
                  <OrganizationCard key={dto.id} {...toCard(dto)} />
                ))}
              </div>
              {orgs.length < orgTotal && (
                <button
                  type="button"
                  onClick={() => fetchRegion(selectedMarker.id, orgPage + 1, true)}
                  disabled={loadingMore}
                  className="mx-auto rounded-button bg-primary px-lg py-2.5 text-sm font-semibold text-text-inverse disabled:opacity-60"
                >
                  {loadingMore ? tc('loading') : tn('loadMore')}
                </button>
              )}
            </>
          )}
        </section>
      )}

      {!selectedMarker && (
        <p className="text-center text-sm text-text-secondary">{t('tapHint')}</p>
      )}

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
