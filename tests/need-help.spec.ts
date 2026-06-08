import { test, expect } from '@playwright/test';

// Phase 3 — Need Help tab behavior gate (English locale for stable selectors).

test('search narrows results and the count updates', async ({ page }) => {
  await page.goto('/en');
  const count = page.getByText(/\/\s*\d+\s*organizations/).first();
  await expect(count).toBeVisible();
  const before = await count.textContent();

  await page.getByPlaceholder('Search by organization or area').fill('abaad');
  // wait for debounce + refetch to change the count line
  await expect(count).not.toHaveText(before ?? '', { timeout: 5000 });
  const total = Number((await count.textContent())?.match(/\/\s*(\d+)/)?.[1] ?? '0');
  expect(total).toBeGreaterThan(0);
  await expect(page.getByRole('heading', { name: /abaad/i }).first()).toBeVisible();
});

test('a sector pill filters results', async ({ page }) => {
  await page.goto('/en');
  const count = page.getByText(/\/\s*\d+\s*organizations/).first();
  // wait for the initial fetch to resolve (first card present)
  await expect(page.locator('article').first()).toBeVisible();
  const totalOf = async () =>
    Number((await count.textContent())?.match(/\/\s*(\d+)/)?.[1] ?? '0');
  await expect.poll(totalOf).toBeGreaterThan(50);
  const allTotal = await totalOf();

  await page.getByRole('button', { name: 'Shelter and housing' }).click();
  await expect.poll(totalOf).toBeLessThan(allTotal);
});

test('multiple filters widen results (OR)', async ({ page }) => {
  await page.goto('/en');
  const count = page.getByText(/\/\s*\d+\s*organizations/).first();
  await expect(page.locator('article').first()).toBeVisible();
  const totalOf = async () =>
    Number((await count.textContent())?.match(/\/\s*(\d+)/)?.[1] ?? '0');
  await expect.poll(totalOf).toBeGreaterThan(50);

  await page.getByRole('button', { name: 'Food and water' }).click();
  await expect.poll(totalOf).toBeGreaterThan(0);
  const afterOne = await totalOf();

  // adding a second filter must widen (OR union), never narrow
  await page.getByRole('button', { name: 'Safety and protection' }).click();
  await expect.poll(totalOf).toBeGreaterThanOrEqual(afterOne);
});

test('call button renders a valid tel: href', async ({ page }) => {
  await page.goto('/en');
  const call = page.getByRole('link', { name: /^Call / }).first();
  await expect(call).toBeVisible();
  const href = await call.getAttribute('href');
  expect(href).toMatch(/^tel:\d{6,}$/);
});

test('RTL: Arabic renders the screen without crashing and dir=rtl', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByText(/\/\s*\d+/).first()).toBeVisible();
  // at least one card present
  await expect(page.locator('article').first()).toBeVisible();
});
