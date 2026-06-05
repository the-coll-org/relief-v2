import { NextResponse } from 'next/server';
import { getSnapshot } from '@/lib/store';
import { buildMergedDtos } from '@/lib/organizations';
import { CRN_CATEGORY_OPTIONS } from '@/lib/serviceCategoryMap';
import type { FilterGroup } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const GROUP_LABELS = new Map<string, { en: string; ar: string }>([
  ['sector', { en: 'Sector', ar: 'القطاع' }],
  ['district', { en: 'District', ar: 'القضاء' }],
]);

function tally(values: Iterable<string | null | undefined>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const value of values) {
    if (!value) continue;
    const key = value.toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

// GET /api/filters — ported from listFilters.
export async function GET() {
  const { providers, locations, categories } = await getSnapshot();

  const sectorCounts = tally(providers.flatMap((p) => p.sectors ?? []));
  const districtCounts = tally(providers.flatMap((p) => p.districts ?? []));

  const groups: FilterGroup[] = Object.entries(categories).map(([groupId, options]) => {
    const label = GROUP_LABELS.get(groupId) ?? { en: groupId, ar: groupId };
    const counts =
      groupId === 'sector'
        ? sectorCounts
        : groupId === 'district'
          ? districtCounts
          : new Map<string, number>();
    return {
      group_id: groupId,
      group_label: label.en,
      group_label_ar: label.ar,
      options: options.map((opt, i) => ({
        id: opt.key,
        label: opt.en_label,
        label_ar: opt.ar_label ?? null,
        result_count:
          counts.get(opt.en_label.toLowerCase()) ??
          counts.get(opt.key.toLowerCase()) ??
          0,
        display_order: opt.sort_order ?? i,
      })),
    };
  });

  const dtos = buildMergedDtos(providers, locations);
  const categoryCounts = new Map<string, number>();
  for (const d of dtos) {
    for (const c of d.categories) {
      categoryCounts.set(c.id, (categoryCounts.get(c.id) ?? 0) + 1);
    }
  }
  groups.push({
    group_id: 'category',
    group_label: 'Service Category',
    group_label_ar: 'فئة الخدمة',
    options: CRN_CATEGORY_OPTIONS.map((opt, i) => ({
      id: opt.id,
      label: opt.label,
      label_ar: opt.label_ar,
      result_count: categoryCounts.get(opt.id) ?? 0,
      display_order: i,
    })),
  });

  return NextResponse.json({ data: groups });
}
