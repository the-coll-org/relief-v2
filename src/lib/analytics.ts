// Thin, safe wrapper over the self-hosted Umami tracker (loaded in the locale
// layout when UMAMI_SRC + UMAMI_WEBSITE_ID are set). Every call no-ops when the
// tracker isn't present — local dev, Do-Not-Track, or an ad-blocker — so call
// sites never need to guard. Plain clicks are tracked declaratively via
// `data-umami-event*` attributes on the element; this helper is only for events
// that aren't a single click (map-pin selection, filter apply, first search).

declare global {
  interface Window {
    umami?: {
      track: (event: string, data?: Record<string, unknown>) => void;
      identify?: (data: Record<string, unknown>) => void;
    };
  }
}

/**
 * Product-usage events. Keep these names in sync with the `data-umami-event`
 * attribute values used for declarative click tracking across the app.
 */
export type AnalyticsEvent =
  | 'call_tap'
  | 'hotline_tap'
  | 'filter_pill'
  | 'filter_apply'
  | 'load_more'
  | 'map_pin_tap'
  | 'language_switch'
  | 'help_search'
  | 'feedback_open';

/**
 * Record a product event. Safe to call anywhere on the client; a no-op on the
 * server or when the tracker hasn't loaded. Keep `data` coarse — never pass PII
 * (names, phone numbers, or raw search text).
 */
export function track(event: AnalyticsEvent, data?: Record<string, string | number>): void {
  if (typeof window === 'undefined') return;
  window.umami?.track(event, data);
}
