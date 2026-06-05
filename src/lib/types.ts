// Ported verbatim from lbresponse-api/src/models/Organization.ts so the
// normalization logic and API response shapes stay byte-compatible with the
// old backend (frontend depends on these field names).

export interface ProviderContact {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
}

export interface ProviderService {
  name?: string | null;
  sector?: string | null;
  district?: string | null;
  target_age_gender?: string | null;
  target_population?: string | null;
  accessible?: boolean | null;
}

export interface Provider {
  provider_id: string;
  provider_name: string;
  provider_name_ar?: string | null;
  slug?: string | null;
  primary_contact?: ProviderContact | null;
  secondary_contact?: ProviderContact | null;
  sectors?: string[] | null;
  districts?: string[] | null;
  services?: ProviderService[] | null;
  service_count?: number | null;
  is_name_valid?: boolean | null;
  pinned?: boolean | null;
  verified?: boolean | null;
  updated_at?: string | null;
}

export interface Location {
  location_id: string;
  governorate?: string | null;
  city?: string | null;
  district?: string | null;
}

export interface CategoryRecord {
  key: string;
  en_label: string;
  ar_label?: string | null;
  sort_order?: number | null;
}

export interface NormalizedCategoryDto {
  id: string;
  label: string;
  raw_name: string;
}

export interface OrganizationDto {
  id: string;
  title: string;
  title_ar: string | null;
  description: string | null;
  description_ar: string | null;
  email: string | null;
  verified: boolean;
  phone_numbers: string[];
  whatsapp: string | null;
  social_media: string[];
  type: string | null;
  locations: string[];
  governorate: string | null;
  sectors: string[];
  categories: NormalizedCategoryDto[];
  services: ProviderService[];
  service_count: number;
  primary_contact_name: string | null;
  secondary_contact: ProviderContact | null;
  map_url: string | null;
  organization_type: string | null;
  updated_at: string | null;
}

export interface MapListingDto {
  id: string;
  category: string | null;
  title: string;
}

export interface MapRegionGroup {
  region: string;
  region_id: string;
  count: number;
  listings: MapListingDto[];
}

export interface FilterOption {
  id: string;
  label: string;
  label_ar: string | null;
  result_count: number;
  display_order: number;
}

export interface FilterGroup {
  group_id: string;
  group_label: string;
  group_label_ar: string;
  options: FilterOption[];
}

export interface EmergencyContact {
  id: string;
  category: string;
  city: string;
  name_en: string;
  name_ar: string | null;
  hotline: string | null;
  phone: string | null;
  email: string | null;
  source_url: string | null;
  inserted_at: string;
  updated_at: string | null;
}
