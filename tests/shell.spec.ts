import { test, expect } from '@playwright/test';

// Phase 1 behavior gate — shell, i18n/RTL, dark mode, routing.

test('default document is RTL Arabic', async ({ page }) => {
  await page.goto('/');
  const html = page.locator('html');
  await expect(html).toHaveAttribute('dir', 'rtl');
  await expect(html).toHaveAttribute('lang', 'ar');
});

test('language toggle flips to LTR English and persists across reload', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'English' }).click();
  await expect(page).toHaveURL(/\/en$/);
  const html = page.locator('html');
  await expect(html).toHaveAttribute('dir', 'ltr');
  await expect(html).toHaveAttribute('lang', 'en');

  // persists across reload (the /en URL is the source of truth)
  await page.reload();
  await expect(html).toHaveAttribute('dir', 'ltr');
  await expect(html).toHaveAttribute('lang', 'en');
});

test('dark mode toggle persists across reload', async ({ page }) => {
  await page.goto('/');
  const html = page.locator('html');
  await expect(html).toHaveAttribute('data-theme', 'light');

  await page.getByRole('button', { name: /dark mode|الوضع الداكن/ }).click();
  await expect(html).toHaveAttribute('data-theme', 'dark');

  await page.reload();
  await expect(html).toHaveAttribute('data-theme', 'dark');
});

test('all three tabs route correctly', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('link', { name: 'مركز المساعدة' }).click();
  await expect(page).toHaveURL(/\/help-center$/);

  await page.getByRole('link', { name: 'الخريطة' }).click();
  await expect(page).toHaveURL(/\/map$/);

  await page.getByRole('link', { name: 'أحتاج مساعدة' }).click();
  await expect(page).toHaveURL(/\/$|\/ar$/);
});
