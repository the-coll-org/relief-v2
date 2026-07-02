import { getTranslations } from 'next-intl/server';
import { EMERGENCY_HOTLINES, type EmergencyHotline } from '@/lib/emergencyHotlines';

function Glyph({ icon }: { icon: EmergencyHotline['icon'] }) {
  const p = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none' as const };
  switch (icon) {
    case 'ambulance':
      return (
        <svg {...p}>
          <path d="M3 7h11v8H3zM14 10h4l3 3v2h-7z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
          <circle cx="7" cy="17" r="1.8" stroke="currentColor" strokeWidth="1.7" />
          <circle cx="17" cy="17" r="1.8" stroke="currentColor" strokeWidth="1.7" />
          <path d="M8 9v3M6.5 10.5h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case 'civil-defense':
      return (
        <svg {...p}>
          <path d="M12 3 5 6v5c0 4 3 7 7 9 4-2 7-5 7-9V6l-7-3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        </svg>
      );
    case 'medical':
      return (
        <svg {...p}>
          <path d="M12 4v16M4 12h16" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      );
    case 'marine':
      return (
        <svg {...p}>
          <path d="M4 14h16l-2 5H6l-2-5ZM12 3v8M8 8h8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
  }
}

export async function EmergencyHotlines({ locale }: { locale: string }) {
  const t = await getTranslations('helpCenter');
  const isArabic = locale === 'ar';
  return (
    <section aria-label={t('emergencyTitle')} className="flex flex-col gap-sm">
      <h2 className="font-heading text-base font-bold text-text-primary">
        {t('emergencyTitle')}
      </h2>
      <div className="grid grid-cols-2 gap-sm">
        {EMERGENCY_HOTLINES.map((h) => (
          <a
            key={h.id}
            href={`tel:${h.number}`}
            data-umami-event="hotline_tap"
            data-umami-event-hotline={h.id}
            className="flex min-h-[64px] items-center gap-3 rounded-card bg-accent-red px-md py-3 text-text-inverse shadow-card"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-pill bg-white/15">
              <Glyph icon={h.icon} />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-xs font-medium text-text-inverse/85">
                {isArabic ? h.name_ar : h.name_en}
              </span>
              <span dir="ltr" className="font-heading text-xl font-bold tabular-nums">
                {h.number}
              </span>
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
