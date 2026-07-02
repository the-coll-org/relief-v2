import { test, expect } from '@playwright/test';

// Analytics wiring. Two things are verified here:
//  1. Declarative `data-umami-event*` attributes sit on the key CTAs, and the
//     tracker script stays ABSENT when UMAMI_* env is unset (i.e. in dev/CI).
//  2. The one programmatic event exercised end-to-end (`help_search`) actually
//     calls the tracker — proving the shared `track()` helper is wired.

test('the Umami tracker script is absent when UMAMI_* env is unset', async ({ page }) => {
  await page.goto('/en');
  await expect(page.locator('script[data-website-id]')).toHaveCount(0);
});

test('provider call buttons carry the call_tap event with a source', async ({ page }) => {
  await page.goto('/en');
  const call = page.locator('a[href^="tel:"][data-umami-event="call_tap"]').first();
  await expect(call).toBeVisible();
  await expect(call).toHaveAttribute('data-umami-event-source', 'need_help');
});

test('the four emergency hotlines carry the hotline_tap event', async ({ page }) => {
  await page.goto('/en/help-center');
  await expect(page.locator('a[data-umami-event="hotline_tap"]')).toHaveCount(4);
});

test('the Load More button carries the load_more event with a source', async ({ page }) => {
  await page.goto('/en');
  const more = page.locator('button[data-umami-event="load_more"]').first();
  await expect(more).toBeVisible();
  await expect(more).toHaveAttribute('data-umami-event-source', 'need_help');
});

test('the language toggle carries the language_switch event', async ({ page }) => {
  await page.goto('/en');
  const toggle = page.locator('button[data-umami-event="language_switch"]').first();
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute('data-umami-event-to', 'ar');
});

test('help_search fires exactly once through the tracker when the user types', async ({
  page,
}) => {
  // Stub the tracker before any app code runs; record calls on window.
  await page.addInitScript(() => {
    (window as unknown as { __events: unknown[] }).__events = [];
    (window as unknown as { umami: { track: (e: string, d?: unknown) => void } }).umami = {
      track: (event: string, data?: unknown) =>
        (window as unknown as { __events: unknown[] }).__events.push({ event, data }),
    };
  });
  await page.goto('/en/help-center');

  const countHelpSearch = () =>
    page.evaluate(
      () =>
        (window as unknown as { __events: { event: string }[] }).__events.filter(
          (e) => e.event === 'help_search'
        ).length
    );

  const search = page.getByPlaceholder(/Search hospitals/i);
  await search.fill('clinic');
  await expect.poll(countHelpSearch).toBe(1);

  // Typing more must not fire it again (once per mount).
  await search.fill('clinic beirut');
  await expect.poll(countHelpSearch).toBe(1);
});
