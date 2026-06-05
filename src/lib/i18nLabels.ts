// Arabic labels for the bounded, controlled vocabularies the PowerBI scrape
// only provides in English (districts/cazas and hotline categories). Service-
// category Arabic lives in serviceCategoryMap.ts next to its English mapping.
// These are static + version-controlled so a live scrape can never wipe them.

function slug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Lebanese cazas (districts), keyed by the category slug used in the DB.
export const DISTRICT_AR: Record<string, string> = {
  akkar: 'عكار',
  aley: 'عاليه',
  baabda: 'بعبدا',
  baalbek: 'بعلبك',
  bcharre: 'بشرّي',
  beirut: 'بيروت',
  'bent-jbeil': 'بنت جبيل',
  chouf: 'الشوف',
  'el-batroun': 'البترون',
  'el-hermel': 'الهرمل',
  'el-koura': 'الكورة',
  'el-meten': 'المتن',
  'el-minieh-dennie': 'المنية-الضنية',
  'el-nabatieh': 'النبطية',
  hasbaya: 'حاصبيا',
  jbeil: 'جبيل',
  jezzine: 'جزّين',
  kesrwane: 'كسروان',
  marjaayoun: 'مرجعيون',
  rachaya: 'راشيا',
  saida: 'صيدا',
  sour: 'صور',
  tripoli: 'طرابلس',
  'west-bekaa': 'البقاع الغربي',
  zahle: 'زحلة',
  zgharta: 'زغرتا',
};

/** Arabic for a district slug (e.g. "el-nabatieh"), or null if unknown. */
export function arabicDistrictBySlug(districtSlug: string): string | null {
  return DISTRICT_AR[districtSlug] ?? null;
}

/** Arabic for a district English label (e.g. "El Nabatieh"); falls back to the
 *  given label when no Arabic is known. */
export function arabicDistrict(enLabel: string): string {
  return DISTRICT_AR[slug(enLabel)] ?? enLabel;
}

// Hotline categories (help center), keyed by lowercased English.
export const HOTLINE_CATEGORY_AR: Record<string, string> = {
  gbv: 'العنف القائم على النوع الاجتماعي',
  'territorial border': 'الحدود البرية',
  hospital: 'مستشفى',
  'heavy equipment': 'المعدات الثقيلة',
  ngo: 'منظمة غير حكومية',
  fire: 'إطفاء',
  'medical / fire': 'طوارئ طبية / إطفاء',
  services: 'خدمات',
  security: 'الأمن',
  airport: 'المطار',
  'child protection': 'حماية الطفل',
  medical: 'طبي',
  'travel agency': 'وكالة سفر',
  government: 'حكومي',
  'financial assistance': 'المساعدة المالية',
  'mental health': 'الصحة النفسية',
};

/** Arabic for a hotline category; falls back to the English value when unknown. */
export function arabicHotlineCategory(en: string | null | undefined): string | null {
  if (!en) return en ?? null;
  return HOTLINE_CATEGORY_AR[en.toLowerCase().trim()] ?? en;
}
