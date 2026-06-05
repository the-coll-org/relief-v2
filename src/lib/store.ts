// Mirrors lbresponse-api/src/utils/entityStore.ts: load providers / hotlines /
// categories into an in-memory snapshot with a 60s TTL and the same provider
// name-validity filter. Source is now SQLite (via Prisma) instead of RTDB.

import { prisma } from './db';
import { arabicDistrictBySlug } from './i18nLabels';
import type {
  CategoryRecord,
  EmergencyContact,
  Location,
  Provider,
  ProviderContact,
  ProviderService,
} from './types';

interface Snapshot {
  providers: Provider[];
  locations: Map<string, Location>;
  categories: Record<string, CategoryRecord[]>;
  hotlines: EmergencyContact[];
  fetchedAt: number;
}

const TTL_MS = 60_000;
let cache: Snapshot | null = null;
let pending: Promise<Snapshot> | null = null;

const PHONE_LIKE_PATTERN = /^[\d\s\-+()]+$/;

function isProviderNameValid(name: unknown): boolean {
  if (typeof name !== 'string') return false;
  const s = name.trim();
  if (!s) return false;
  if (/^\d+$/.test(s) && s.length >= 10) return false;
  if (PHONE_LIKE_PATTERN.test(s)) return false;
  return /[A-Za-z؀-ۿ]/.test(s);
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

async function load(): Promise<Snapshot> {
  const [rows, hotlineRows, categoryRows] = await Promise.all([
    prisma.provider.findMany(),
    prisma.hotline.findMany(),
    prisma.category.findMany(),
  ]);

  const allProviders: Provider[] = rows.map((r) => ({
    provider_id: r.id,
    provider_name: r.name,
    provider_name_ar: r.nameAr,
    slug: r.slug,
    primary_contact: parseJson<ProviderContact | null>(r.primaryContact, null),
    secondary_contact: parseJson<ProviderContact | null>(r.secondaryContact, null),
    sectors: parseJson<string[]>(r.sectors, []),
    districts: parseJson<string[]>(r.districts, []),
    services: parseJson<ProviderService[]>(r.services, []),
    service_count: r.serviceCount,
    is_name_valid: r.isNameValid,
    pinned: r.pinned,
    verified: r.verified,
    updated_at: r.updatedAt,
  }));

  const providers = allProviders.filter(
    (p) => p.is_name_valid !== false && isProviderNameValid(p.provider_name)
  );

  // entities/locations was absent in the source data (audit §1.4) → empty.
  const locations = new Map<string, Location>();

  const categories: Record<string, CategoryRecord[]> = {};
  for (const c of categoryRows) {
    // The PowerBI scrape only provides English; overlay a static Arabic label
    // for districts (cazas) so it survives refreshes and the filter UI can
    // render Arabic in Arabic mode.
    const arLabel =
      c.arLabel ?? (c.type === 'district' ? arabicDistrictBySlug(c.key) : null);
    (categories[c.type] ??= []).push({
      key: c.key,
      en_label: c.enLabel,
      ar_label: arLabel,
      sort_order: c.sortOrder,
    });
  }
  for (const type of Object.keys(categories)) {
    categories[type].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }

  const hotlines: EmergencyContact[] = hotlineRows.map((h) => ({
    id: h.id,
    category: h.category,
    city: h.city,
    name_en: h.nameEn,
    name_ar: h.nameAr,
    hotline: h.hotline,
    phone: h.phone,
    email: h.email,
    source_url: h.sourceUrl,
    inserted_at: h.insertedAt ?? '',
    updated_at: h.updatedAt,
  }));

  return { providers, locations, categories, hotlines, fetchedAt: Date.now() };
}

export async function getSnapshot(): Promise<Snapshot> {
  if (cache && Date.now() - cache.fetchedAt < TTL_MS) return cache;
  if (pending) return pending;
  pending = load()
    .then((s) => {
      cache = s;
      return s;
    })
    .finally(() => {
      pending = null;
    });
  return pending;
}

export function invalidateSnapshot(): void {
  cache = null;
}
