import { test, expect } from '@playwright/test';

// Phase 5 — Map tab behavior gate.

async function apiMarkerCount(request: import('@playwright/test').APIRequestContext, regionIds: string[], category?: string) {
  const url = category
    ? `/api/organizations/map?category=${encodeURIComponent(category)}`
    : '/api/organizations/map';
  const json = await (await request.get(url)).json();
  const counts: Record<string, number> = {};
  for (const g of json.data) counts[g.region_id] = g.count;
  return regionIds.reduce((n, r) => n + (counts[r] ?? 0), 0);
}

const BEIRUT_REGIONS = ['beirut', 'aley', 'baabda', 'chouf', 'el-meten', 'jbeil', 'kesrwane'];

test('cluster counts match the API region counts', async ({ page, request }) => {
  await page.goto('/en/map');
  const expected = await apiMarkerCount(request, BEIRUT_REGIONS);
  // The Beirut marker badge shows the summed count.
  const badge = page.getByRole('button', { name: new RegExp(`Beirut: ${expected}`) });
  await expect(badge).toBeVisible();
});

test('sector pill filters update cluster counts', async ({ page, request }) => {
  await page.goto('/en/map');
  const before = await apiMarkerCount(request, BEIRUT_REGIONS);
  const afterFood = await apiMarkerCount(request, BEIRUT_REGIONS, 'food_nutrition,wash_hygiene');
  expect(afterFood).toBeLessThan(before);

  await page.getByRole('button', { name: 'Food & Water' }).click();
  await expect(
    page.getByRole('button', { name: new RegExp(`Beirut: ${afterFood}`) })
  ).toBeVisible();
});

test('tapping a cluster reveals the region org list inline', async ({ page }) => {
  await page.goto('/en/map');
  await page.getByRole('button', { name: /Beirut: \d+/ }).click();
  // an inline heading for the region appears, plus org cards (no modal/dialog)
  await expect(page.getByRole('heading', { name: 'Beirut' })).toBeVisible();
  await expect(page.locator('article').first()).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('deep-link ?focus=akkar opens the Akkar region', async ({ page }) => {
  await page.goto('/en/map?focus=akkar');
  await expect(page.getByRole('heading', { name: 'Akkar' })).toBeVisible();
});

test('mobile touch: tapping a cluster reveals the region list beneath the map', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await page.goto('/en/map');
  const marker = page.locator('[data-marker-id="beirut"]');
  await expect(marker).toBeVisible();
  await marker.tap();
  await expect(page.getByRole('heading', { name: 'Beirut' })).toBeVisible();
  await expect(page.locator('article').first()).toBeVisible();
  await context.close();
});
