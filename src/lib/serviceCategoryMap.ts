// Ported from lbresponse-api/src/lib/serviceCategoryMap.ts (verbatim mapping).
// Maps raw Power BI sector/service names → CRN UI category id+label.
// Lookup is case- and whitespace-insensitive.

export interface CrnCategory {
  id: string;
  label: string;
}

export interface NormalizedCategory {
  id: string;
  label: string;
  raw_name: string;
}

// PowerBI (UN) sector name → CRN user-facing category
export const SERVICE_CATEGORY_MAP: Record<string, CrnCategory> = {
  // Safety & Protection umbrella
  'Child Protection': { id: 'safety_protection', label: 'Safety & Protection' },
  GBV: { id: 'safety_protection', label: 'Safety & Protection' },
  Protection: { id: 'safety_protection', label: 'Safety & Protection' },
  'Social Stability': { id: 'safety_protection', label: 'Safety & Protection' },
  // Cash & Livelihood umbrella
  CWG: { id: 'cash_livelihood', label: 'Cash and Livelihood' },
  Livelihoods: { id: 'cash_livelihood', label: 'Cash and Livelihood' },
  // Food & Nutrition umbrella
  'Food Security & Agriculture': {
    id: 'food_nutrition',
    label: 'Food and Nutrition',
  },
  Nutrition: { id: 'food_nutrition', label: 'Food and Nutrition' },
  // Shelter / NFI
  Shelter: { id: 'shelter_nfi', label: 'Shelter / NFI' },
  // WASH
  WaSH: { id: 'wash_hygiene', label: 'WASH and Hygiene' },
  // Education (no CRN equivalent yet, kept for completeness)
  Education: { id: 'education', label: 'Education' },
};

const LOOKUP = new Map<string, CrnCategory>(
  Object.entries(SERVICE_CATEGORY_MAP).map(([k, v]) => [k.toLowerCase().trim(), v])
);

export function normalizeCategory(raw: string): NormalizedCategory {
  const trimmed = (raw ?? '').trim();
  const hit = LOOKUP.get(trimmed.toLowerCase());
  if (hit) return { id: hit.id, label: hit.label, raw_name: trimmed };
  return { id: 'unknown', label: trimmed, raw_name: trimmed };
}

export function normalizeCategories(
  rawNames: Iterable<string | null | undefined>
): NormalizedCategory[] {
  const byId = new Map<string, NormalizedCategory>();
  for (const raw of rawNames) {
    if (!raw) continue;
    const cat = normalizeCategory(raw);
    if (!cat.label) continue;
    const dedupeKey =
      cat.id === 'unknown' ? `unknown:${cat.label.toLowerCase()}` : cat.id;
    if (!byId.has(dedupeKey)) byId.set(dedupeKey, cat);
  }
  return [...byId.values()];
}

export const CRN_CATEGORY_OPTIONS: CrnCategory[] = (() => {
  const seen = new Map<string, CrnCategory>();
  for (const v of Object.values(SERVICE_CATEGORY_MAP)) {
    if (!seen.has(v.id)) seen.set(v.id, v);
  }
  return [...seen.values()].sort((a, b) => a.label.localeCompare(b.label));
})();
