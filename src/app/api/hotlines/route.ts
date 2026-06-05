import { NextResponse } from 'next/server';
import { getSnapshot } from '@/lib/store';
import { clampInt } from '@/lib/organizations';

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
  const city = qs(searchParams.get('city')).trim().toLowerCase();
  const search = qs(searchParams.get('search')).trim().toLowerCase();
  const page = clampInt(searchParams.get('page'), 1);
  const pageSize = clampInt(searchParams.get('page_size'), 10, 1, 100);

  const filtered = hotlines.filter((h) => {
    if (categories && !categories.has(h.category.toLowerCase())) return false;
    if (city && h.city.toLowerCase() !== city) return false;
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
