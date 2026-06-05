'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { formatRelativeTime, isStale } from '@/lib/freshness';
import { deriveSectorIcon, SectorGlyph } from './sectorIcons';

export interface OrgCardData {
  title: string;
  title_ar?: string | null;
  categoryLabel: string | null;
  sectors: string[];
  description: string | null;
  locations: string[];
  phone: string | null;
  whatsapp: string | null;
  updated_at: string | null;
  /** Map deep-link, e.g. "/map?focus=akkar". Omit/null to hide the map button. */
  mapHref?: string | null;
}

function PhoneIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6.5 3h3l1.5 4-2 1.5a12 12 0 0 0 5 5L15.5 11l4 1.5v3a2 2 0 0 1-2.2 2A16 16 0 0 1 4.5 5.2 2 2 0 0 1 6.5 3Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function MapPinIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function OrganizationCard(props: OrgCardData) {
  const t = useTranslations('card');
  const locale = useLocale();
  const isArabic = locale === 'ar';
  const [showAllZones, setShowAllZones] = useState(false);

  const title = isArabic && props.title_ar ? props.title_ar : props.title;
  const icon = deriveSectorIcon(props.sectors);
  const rel = formatRelativeTime(props.updated_at, isArabic);
  const stale = isStale(props.updated_at);
  const phone = props.phone;
  const zones = props.locations.filter(Boolean);
  const visibleZones = showAllZones ? zones : zones.slice(0, 2);
  const extra = zones.length - visibleZones.length;

  return (
    <article className="flex flex-col gap-md rounded-card bg-surface p-md shadow-card">
      <div className="flex items-start gap-sm">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-button bg-primary-tint text-primary">
          <SectorGlyph icon={icon} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-heading text-base font-semibold leading-tight text-text-primary">
              {title}
            </h3>
            {props.categoryLabel && (
              <span className="rounded-pill bg-accent-gold/15 px-2 py-0.5 text-xs font-medium text-accent-gold">
                {props.categoryLabel}
              </span>
            )}
          </div>
          {props.description && (
            <p className="line-clamp-3 text-sm text-text-secondary">{props.description}</p>
          )}
        </div>
        {rel && (
          <span
            className={`flex shrink-0 items-center gap-1 text-xs ${
              stale ? 'text-stale' : 'text-text-secondary'
            }`}
            title={props.updated_at ?? undefined}
          >
            <ClockIcon />
            {rel}
          </span>
        )}
      </div>

      {zones.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <MapPinIcon />
          {visibleZones.map((z) => (
            <span key={z} className="text-sm text-text-secondary">
              {z}
            </span>
          ))}
          {extra > 0 && (
            <button
              type="button"
              onClick={() => setShowAllZones(true)}
              className="rounded-pill bg-light px-2 py-0.5 text-xs font-medium text-text-secondary"
            >
              {t('moreZones', { count: extra })}
            </button>
          )}
        </div>
      )}

      <div className="flex items-stretch gap-sm">
        {phone ? (
          <a
            href={`tel:${phone}`}
            className="flex flex-1 items-center justify-center gap-2 rounded-button bg-primary px-md py-2.5 text-sm font-semibold text-text-inverse"
          >
            <PhoneIcon />
            {t('call', { number: phone })}
          </a>
        ) : (
          <span className="flex flex-1 items-center justify-center rounded-button bg-light px-md py-2.5 text-sm font-medium text-text-secondary">
            {t('unavailable')}
          </span>
        )}
        {props.mapHref && (
          <Link
            href={props.mapHref}
            className="flex items-center justify-center gap-2 rounded-button bg-primary-tint px-md py-2.5 text-sm font-semibold text-primary"
            aria-label={t('map')}
          >
            <MapPinIcon />
            <span>{t('map')}</span>
          </Link>
        )}
      </div>
    </article>
  );
}
