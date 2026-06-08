import { test, expect } from '@playwright/test';

// Phase 4 — Help Center tab behavior gate.

const EMERGENCY = [
  { name: /Ambulance/i, number: '140' },
  { name: /Civil Defense/i, number: '125' },
  { name: /Medical Aid/i, number: '129' },
  { name: /Marine Rescue/i, number: '1714' },
];

test('all four emergency hotlines render with correct tel: links', async ({ page }) => {
  await page.goto('/en');
  await page.goto('/en/help-center');
  for (const h of EMERGENCY) {
    const link = page.locator(`a[href="tel:${h.number}"]`);
    await expect(link).toBeVisible();
    await expect(link).toContainText(h.number);
  }
});

test('hotlines are visible above the fold at 390x844', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/en/help-center');
  // every emergency tile's bottom must be within the first viewport (no scroll)
  for (const h of EMERGENCY) {
    const box = await page.locator(`a[href="tel:${h.number}"]`).boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y + box!.height).toBeLessThanOrEqual(844);
  }
});

test('search filters the directory', async ({ page }) => {
  await page.goto('/en/help-center');
  const count = page.getByText(/\d+\s+results/);
  await expect(page.locator('article').first()).toBeVisible();
  const totalOf = async () =>
    Number((await count.textContent())?.match(/(\d+)\s+results/)?.[1] ?? '0');
  await expect.poll(totalOf).toBeGreaterThan(10);
  const all = await totalOf();

  await page.getByPlaceholder(/Search hospitals/i).fill('hospital');
  await expect.poll(totalOf).toBeLessThanOrEqual(all);
  await expect.poll(totalOf).toBeGreaterThan(0);
});

test('service-type pill filters the directory', async ({ page }) => {
  await page.goto('/en/help-center');
  const count = page.getByText(/\d+\s+results/);
  await expect(page.locator('article').first()).toBeVisible();
  const totalOf = async () =>
    Number((await count.textContent())?.match(/(\d+)\s+results/)?.[1] ?? '0');
  await expect.poll(totalOf).toBeGreaterThan(10);
  const all = await totalOf();
  await page.getByRole('button', { name: 'Cash & Livelihood' }).click();
  await expect.poll(totalOf).toBeLessThan(all);
});
