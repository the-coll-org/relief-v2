'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import type { ChipOption } from './FiltersSheet';

interface FilterGroupOption {
  id: string;
  label: string;
  label_ar: string | null;
  result_count: number;
}
interface FilterGroup {
  group_id: string;
  options: FilterGroupOption[];
}

/**
 * Loads the District (caza) and Service-Category options from /api/filters once.
 * District ids are slugs (match the `location` param); category ids are CRN ids
 * (match the `category` param). Only options with results are shown.
 */
export function useFilterOptions() {
  const locale = useLocale();
  const isArabic = locale === 'ar';
  const [districts, setDistricts] = useState<ChipOption[]>([]);
  const [categories, setCategories] = useState<ChipOption[]>([]);

  useEffect(() => {
    let alive = true;
    fetch('/api/filters')
      .then((r) => r.json())
      .then((json: { data: FilterGroup[] }) => {
        if (!alive) return;
        const pick = (groupId: string): ChipOption[] => {
          const g = json.data.find((x) => x.group_id === groupId);
          if (!g) return [];
          return g.options
            .filter((o) => o.result_count > 0)
            .map((o) => ({
              id: o.id,
              label: isArabic && o.label_ar ? o.label_ar : o.label,
            }));
        };
        setDistricts(pick('district'));
        setCategories(pick('category'));
      })
      .catch(() => {
        /* leave empty on failure */
      });
    return () => {
      alive = false;
    };
  }, [isArabic]);

  return { districts, categories };
}
