// Relative-time + staleness, ported from the old frontend's freshness logic
// (useNeedHelpScreenState.tsx). Stale threshold = 14 days (brief phase 3).

export const STALE_DAYS = 14;

export function formatRelativeTime(
  isoDate: string | null | undefined,
  isArabic: boolean
): string | null {
  if (!isoDate) return null;
  const ts = new Date(isoDate).getTime();
  if (!Number.isFinite(ts)) return null;
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (isArabic) {
    if (minutes < 1) return 'الآن';
    if (minutes < 60) return `منذ ${minutes} دق`;
    if (hours < 24) return `منذ ${hours} ساعة`;
    return `منذ ${days} يوم`;
  }
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export function isStale(isoDate: string | null | undefined): boolean {
  if (!isoDate) return false;
  const ts = new Date(isoDate).getTime();
  if (!Number.isFinite(ts)) return false;
  return Date.now() - ts > STALE_DAYS * 24 * 60 * 60 * 1000;
}
