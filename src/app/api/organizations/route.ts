import { NextResponse } from 'next/server';
import { getSnapshot } from '@/lib/store';
import {
  buildMergedDtos,
  clampInt,
  filterDtos,
  parseCategoryGroups,
  scoreMatch,
  slugify,
  str,
  toArray,
} from '@/lib/organizations';
import type { OrganizationDto } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/organizations — ported from listOrganizations (organizationsController).
export async function GET(req: Request) {
  const { providers, locations } = await getSnapshot();
  const { searchParams } = new URL(req.url);

  const q = str(searchParams.get('search')).trim().toLowerCase();
  const types = toArray(searchParams.get('organization_type')).map((s) => s.toLowerCase());
  const sectorFilter = toArray(searchParams.get('sector')).map(slugify);
  const locationFilter = toArray(searchParams.get('location')).map(slugify);
  const categoryGroups = parseCategoryGroups(str(searchParams.get('category')));
  const sort = searchParams.get('sort') === 'relevance' ? 'relevance' : 'az';
  const page = clampInt(searchParams.get('page'), 1);
  const pageSize = clampInt(searchParams.get('page_size'), 10, 1, 100);
  const includes = new Set(toArray(searchParams.get('include')).map((s) => s.toLowerCase()));
  const includeServices = includes.has('services');

  const mergedDtos = buildMergedDtos(providers, locations);
  const filtered = filterDtos(mergedDtos, {
    types,
    sectorFilter,
    locationFilter,
    categoryGroups,
  });

  const scored: { dto: OrganizationDto; score: number }[] = [];
  for (const dto of filtered) {
    const score = q ? scoreMatch(dto, q) : 1;
    if (q && score === 0) continue;
    scored.push({ dto, score });
  }

  scored.sort((a, b) => {
    if (sort === 'relevance' && q) return b.score - a.score;
    return a.dto.title.localeCompare(b.dto.title);
  });

  const total = scored.length;
  const start = (page - 1) * pageSize;
  const data = scored.slice(start, start + pageSize).map((s) =>
    includeServices ? s.dto : { ...s.dto, services: [] }
  );

  return NextResponse.json({ data, total, page, page_size: pageSize });
}
