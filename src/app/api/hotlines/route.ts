import { NextResponse } from 'next/server';
import { getSnapshot } from '@/lib/store';
import { clampInt, slugify } from '@/lib/organizations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function qs(v: string | null): string {
  return v ?? '';
}

// GET /api/hotlines — ported from listHotlines (the scraped help directory).
export async function GET(req: Request) {
  const { hotlines } = await getSnapshot();
  const { searchParams } = new URL(req.url);

  const categoryRaw = qs(searchParams.get('category')).trim().toLowerCase();
  const categories = categoryRaw
    ? new Set(categoryRaw.split(',').map((s) => s.trim()))
    : null;
  // `city` accepts a csv of district slugs (OR); match against slugify(h.city).
  const cityRaw = qs(searchParams.get('city')).trim().toLowerCase();
  const cities = cityRaw
    ? new Set(cityRaw.split(',').map((s) => slugify(s.trim())).filter(Boolean))
    : null;
  const search = qs(searchParams.get('search')).trim().toLowerCase();
  const page = clampInt(searchParams.get('page'), 1);
  const pageSize = clampInt(searchParams.get('page_size'), 10, 1, 100);

  const filtered = hotlines.filter((h) => {
    if (categories && !categories.has(h.category.toLowerCase())) return false;
    if (cities && !cities.has(slugify(h.city))) return false;
    if (search) {
      const haystack = [h.name_en, h.name_ar, h.category, h.city, h.hotline, h.phone, h.email]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const data = filtered.slice(start, start + pageSize);
  return NextResponse.json({ data, total, page, page_size: pageSize });
}
