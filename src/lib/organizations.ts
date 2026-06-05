// Ported from lbresponse-api/src/controllers/organizationsController.ts —
// the DTO building, name-splitting, dedup/merge, filter and relevance-score
// logic. Kept byte-faithful so the rebuilt API returns identical results.

import type {
  Location,
  MapListingDto,
  MapRegionGroup,
  OrganizationDto,
  Provider,
  ProviderContact,
} from './types';
import { normalizeCategories } from './serviceCategoryMap';

export function str(v: unknown): string {
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return v.map(str).join(',');
  return '';
}

export function toArray(v: unknown): string[] {
  return str(v)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function clampInt(v: unknown, fallback: number, min = 1, max = 1000): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function isValidLebanesePhone(text: string): boolean {
  let digits = text.replace(/\D/g, '');
  if (digits.startsWith('961')) digits = digits.slice(3);
  if (digits.length < 7 || digits.length > 8) return false;
  if (/^(\d)\1+$/.test(digits)) return false;
  if (digits.startsWith('00')) return false;
  return true;
}

function pushIfValidPhone(out: string[], seen: Set<string>, raw: unknown): void {
  if (typeof raw !== 'string') return;
  const trimmed = raw.trim();
  if (!trimmed || seen.has(trimmed) || !isValidLebanesePhone(trimmed)) return;
  seen.add(trimmed);
  out.push(trimmed);
}

function collectPhones(...contacts: (ProviderContact | null | undefined)[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const c of contacts) {
    if (!c) continue;
    pushIfValidPhone(out, seen, c.phone);
    pushIfValidPhone(out, seen, c.whatsapp);
  }
  return out;
}

function pickWhatsapp(...contacts: (ProviderContact | null | undefined)[]): string | null {
  for (const c of contacts) {
    if (!c) continue;
    const wa = typeof c.whatsapp === 'string' ? c.whatsapp.trim() : '';
    if (wa && isValidLebanesePhone(wa)) return wa;
  }
  return null;
}

function pickEmail(...contacts: (ProviderContact | null | undefined)[]): string | null {
  for (const c of contacts) {
    const email = typeof c?.email === 'string' ? c.email.trim() : '';
    if (email) return email;
  }
  return null;
}

function buildDescription(p: Provider): string | null {
  const services = Array.isArray(p.services) ? p.services : [];
  const names: string[] = [];
  const seen = new Set<string>();
  for (const s of services) {
    const raw = typeof s.name === 'string' ? s.name.trim() : '';
    const name = raw.replace(/^[A-Z][A-Z0-9]*\d+:\s*/, '');
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    names.push(name);
    if (names.length >= 3) break;
  }
  return names.length ? names.join('; ') : null;
}

function buildMapUrlFromDistricts(districts: string[]): string | null {
  if (districts.length === 0) return null;
  return `https://www.google.com/maps?q=${encodeURIComponent(districts[0] + ', Lebanon')}`;
}

function lookupGovernorate(
  districts: string[],
  locations: Map<string, Location>
): string | null {
  if (!districts.length || locations.size === 0) return null;
  const wanted = new Set(districts.map((d) => d.toLowerCase().trim()));
  for (const loc of locations.values()) {
    const d = (loc.district ?? '').toLowerCase().trim();
    if (d && wanted.has(d) && loc.governorate) return loc.governorate;
  }
  return null;
}

function toDto(p: Provider, locations: Map<string, Location>): OrganizationDto {
  const primary = p.primary_contact ?? null;
  const secondary = p.secondary_contact ?? null;
  const sectors = Array.isArray(p.sectors) ? p.sectors.filter(Boolean) : [];
  const districts = Array.isArray(p.districts) ? p.districts.filter(Boolean) : [];
  const services = Array.isArray(p.services) ? p.services : [];
  const phones = collectPhones(primary, secondary);
  const categories = normalizeCategories([
    ...sectors,
    ...services.map((s) => s.sector ?? ''),
  ]);
  const governorate = lookupGovernorate(districts, locations);

  return {
    id: p.provider_id,
    title: p.provider_name,
    title_ar: p.provider_name_ar ?? null,
    description: buildDescription(p),
    description_ar: null,
    email: pickEmail(primary, secondary),
    verified: Boolean(p.verified),
    phone_numbers: phones,
    whatsapp: pickWhatsapp(primary, secondary),
    social_media: [],
    type: null,
    locations: districts,
    governorate,
    sectors,
    categories,
    services,
    service_count:
      typeof p.service_count === 'number' ? p.service_count : services.length,
    primary_contact_name: primary?.name ?? null,
    secondary_contact: secondary,
    map_url: buildMapUrlFromDistricts(districts),
    organization_type: sectors[0] ?? null,
    updated_at: p.updated_at ?? null,
  };
}

function expandToDtos(
  p: Provider,
  locations: Map<string, Location>
): { dto: OrganizationDto; isSplit: boolean }[] {
  const baseDto = toDto(p, locations);
  const beforeSlash = baseDto.title.split('/')[0].trim() || baseDto.title;
  const fragments = beforeSlash
    .split(',')
    .map((n) => n.trim())
    .filter((n) => n.length > 0 && /[A-Za-z؀-ۿ]/.test(n));
  if (fragments.length === 0) return [{ dto: baseDto, isSplit: false }];
  if (fragments.length === 1) {
    if (fragments[0] === baseDto.title) return [{ dto: baseDto, isSplit: false }];
    return [{ dto: { ...baseDto, title: fragments[0] }, isSplit: false }];
  }
  return fragments.map((name, idx) => ({
    dto: { ...baseDto, id: `${baseDto.id}:${idx}`, title: name },
    isSplit: true,
  }));
}

export function buildMergedDtos(
  providers: Provider[],
  locations: Map<string, Location>
): OrganizationDto[] {
  const seen = new Map<string, { dto: OrganizationDto; isSplit: boolean }>();
  for (const p of providers) {
    for (const expanded of expandToDtos(p, locations)) {
      const district = (expanded.dto.locations[0] ?? '').toLowerCase().trim();
      const key = `${expanded.dto.title.toLowerCase().trim()}|${district}`;
      const existing = seen.get(key);
      if (!existing) {
        seen.set(key, expanded);
        continue;
      }
      const existingHasPhone = existing.dto.phone_numbers.length > 0;
      const expandedHasPhone = expanded.dto.phone_numbers.length > 0;
      if (!existingHasPhone && expandedHasPhone) {
        seen.set(key, expanded);
        continue;
      }
      if (existingHasPhone && !expandedHasPhone) continue;
      if (existing.isSplit && !expanded.isSplit) seen.set(key, expanded);
    }
  }

  const contactMerged = new Map<string, OrganizationDto>();
  const ungrouped: OrganizationDto[] = [];
  for (const { dto } of seen.values()) {
    const phone = dto.phone_numbers[0]?.trim() ?? '';
    const email = dto.email?.trim() ?? '';
    const contactKey = phone
      ? `phone:${phone}`
      : email
        ? `email:${email.toLowerCase()}`
        : '';
    if (!contactKey) {
      ungrouped.push(dto);
      continue;
    }
    const key = `${dto.title.toLowerCase().trim()}|${contactKey}`;
    const existing = contactMerged.get(key);
    if (!existing) {
      contactMerged.set(key, dto);
      continue;
    }
    const districts = new Set(existing.locations);
    for (const d of dto.locations) districts.add(d);
    contactMerged.set(key, { ...existing, locations: [...districts] });
  }
  return [...contactMerged.values(), ...ungrouped];
}

interface FilterParams {
  types: string[];
  sectorFilter: string[];
  locationFilter: string[];
  /**
   * AND-of-groups: the org must match EVERY group, and matches a group if it
   * has ANY of that group's category ids. One pill = one group (a pill may map
   * to several ids, e.g. food → [food_nutrition, wash_hygiene]). Selecting
   * multiple pills therefore narrows results (AND), per product decision.
   */
  categoryGroups?: string[][];
}

export function filterDtos(dtos: OrganizationDto[], params: FilterParams): OrganizationDto[] {
  const { types, sectorFilter, locationFilter, categoryGroups = [] } = params;
  return dtos.filter((dto) => {
    if (types.length && !types.includes((dto.organization_type ?? '').toLowerCase()))
      return false;
    if (sectorFilter.length && !dto.sectors.some((s) => sectorFilter.includes(slugify(s))))
      return false;
    if (
      locationFilter.length &&
      !dto.locations.some((l) => locationFilter.includes(slugify(l)))
    )
      return false;
    if (
      categoryGroups.length &&
      !categoryGroups.every((group) => dto.categories.some((c) => group.includes(c.id)))
    )
      return false;
    return true;
  });
}

/** Parse the `category` query param into AND-of-groups: ";"=AND, ","=OR. */
export function parseCategoryGroups(raw: string): string[][] {
  return raw
    .split(';')
    .map((group) =>
      group
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
    )
    .filter((group) => group.length > 0);
}

export function scoreMatch(dto: OrganizationDto, q: string): number {
  const hay = [
    dto.title,
    dto.description,
    dto.organization_type,
    ...dto.locations,
    ...dto.sectors,
    ...dto.categories.map((c) => c.label),
    ...dto.services.map((s) => s.name ?? ''),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  if (!hay.includes(q)) return 0;
  let score = 0;
  if (dto.title.toLowerCase().includes(q)) score += 3;
  if (dto.description?.toLowerCase().includes(q)) score += 2;
  if (dto.locations.some((l) => l.toLowerCase().includes(q))) score += 1;
  if (dto.organization_type?.toLowerCase().includes(q)) score += 1;
  return score || 1;
}

export function buildRegionGroups(filtered: OrganizationDto[]): MapRegionGroup[] {
  const groups = new Map<string, MapRegionGroup>();
  for (const dto of filtered) {
    const region = dto.locations[0]?.trim() || 'Unknown';
    const regionId = slugify(region) || 'unknown';
    let group = groups.get(regionId);
    if (!group) {
      group = { region, region_id: regionId, count: 0, listings: [] };
      groups.set(regionId, group);
    }
    const listing: MapListingDto = {
      id: dto.id,
      category: dto.sectors[0] ? slugify(dto.sectors[0]) : null,
      title: dto.title,
    };
    group.listings.push(listing);
    group.count += 1;
  }
  return [...groups.values()].sort((a, b) => a.region.localeCompare(b.region));
}
