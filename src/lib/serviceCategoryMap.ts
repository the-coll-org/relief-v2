// Ported from lbresponse-api/src/lib/serviceCategoryMap.ts (verbatim mapping).
// Maps raw Power BI sector/service names → CRN UI category id+label.
// Lookup is case- and whitespace-insensitive.

export interface CrnCategory {
  id: string;
  label: string;
  label_ar: string;
}

export interface NormalizedCategory {
  id: string;
  label: string;
  label_ar: string;
  raw_name: string;
}

const SAFETY = { id: 'safety_protection', label: 'Safety & Protection', label_ar: 'الحماية والسلامة' };
const CASH = { id: 'cash_livelihood', label: 'Cash and Livelihood', label_ar: 'النقد وسبل العيش' };
const FOOD = { id: 'food_nutrition', label: 'Food and Nutrition', label_ar: 'الغذاء والتغذية' };
const SHELTER = { id: 'shelter_nfi', label: 'Shelter / NFI', label_ar: 'المأوى والمواد غير الغذائية' };
const WASH = { id: 'wash_hygiene', label: 'WASH and Hygiene', label_ar: 'المياه والصرف الصحي والنظافة' };
const EDUCATION = { id: 'education', label: 'Education', label_ar: 'التعليم' };

// PowerBI (UN) sector name → CRN user-facing category
export const SERVICE_CATEGORY_MAP: Record<string, CrnCategory> = {
  // Safety & Protection umbrella
  'Child Protection': SAFETY,
  GBV: SAFETY,
  Protection: SAFETY,
  'Social Stability': SAFETY,
  // Cash & Livelihood umbrella
  CWG: CASH,
  Livelihoods: CASH,
  // Food & Nutrition umbrella
  'Food Security & Agriculture': FOOD,
  Nutrition: FOOD,
  // Shelter / NFI
  Shelter: SHELTER,
  // WASH
  WaSH: WASH,
  // Education (no CRN equivalent yet, kept for completeness)
  Education: EDUCATION,
};

const LOOKUP = new Map<string, CrnCategory>(
  Object.entries(SERVICE_CATEGORY_MAP).map(([k, v]) => [k.toLowerCase().trim(), v])
);

export function normalizeCategory(raw: string): NormalizedCategory {
  const trimmed = (raw ?? '').trim();
  const hit = LOOKUP.get(trimmed.toLowerCase());
  if (hit) return { id: hit.id, label: hit.label, label_ar: hit.label_ar, raw_name: trimmed };
  // Unknown categories have no Arabic source → fall back to the raw label.
  return { id: 'unknown', label: trimmed, label_ar: trimmed, raw_name: trimmed };
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
