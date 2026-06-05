import { NextResponse } from 'next/server';
import { getSnapshot } from '@/lib/store';
import {
  buildMergedDtos,
  buildRegionGroups,
  filterDtos,
  slugify,
  toArray,
} from '@/lib/organizations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/organizations/map — ported from mapListOrganizations.
export async function GET(req: Request) {
  const { providers, locations } = await getSnapshot();
  const { searchParams } = new URL(req.url);

  const types = toArray(searchParams.get('organization_type')).map((s) => s.toLowerCase());
  const sectorFilter = toArray(searchParams.get('sector')).map(slugify);
  const locationFilter = toArray(searchParams.get('location')).map(slugify);
  const categoryFilter = toArray(searchParams.get('category')).map((s) => s.toLowerCase());

  const mergedDtos = buildMergedDtos(providers, locations);
  const filtered = filterDtos(mergedDtos, {
    types,
    sectorFilter,
    locationFilter,
    categoryFilter,
  });

  const data = buildRegionGroups(filtered);
  return NextResponse.json({ data, total: data.length });
}
