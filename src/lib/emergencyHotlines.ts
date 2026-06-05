// Canonical, life-critical emergency numbers. Hardcoded reference data per the
// brief (§1 "what to reuse") and the old frontend (helpCenter.data.ts) — these
// are NOT part of the scraped directory. Order is display order.
import type { EmergencyContact } from './types';

export interface EmergencyHotline {
  id: string;
  name_en: string;
  name_ar: string;
  number: string;
  icon: 'ambulance' | 'civil-defense' | 'medical' | 'marine';
}

export const EMERGENCY_HOTLINES: EmergencyHotline[] = [
  { id: 'ambulance', name_en: 'Ambulance (Red Cross)', name_ar: 'الإسعاف (الصليب الأحمر)', number: '140', icon: 'ambulance' },
  { id: 'civil-defense', name_en: 'Civil Defense', name_ar: 'الدفاع المدني', number: '125', icon: 'civil-defense' },
  { id: 'medical', name_en: 'Medical Aid', name_ar: 'المساعدة الطبية', number: '129', icon: 'medical' },
  { id: 'marine', name_en: 'Marine Rescue', name_ar: 'الإنقاذ البحري', number: '1714', icon: 'marine' },
];

/** Shaped like the directory EmergencyContact for a uniform API response. */
export function emergencyAsContacts(): EmergencyContact[] {
  return EMERGENCY_HOTLINES.map((h) => ({
    id: h.id,
    category: 'Emergency',
    city: 'Nationwide',
    name_en: h.name_en,
    name_ar: h.name_ar,
    hotline: h.number,
    phone: h.number,
    email: null,
    source_url: null,
    inserted_at: '',
    updated_at: null,
  }));
}
