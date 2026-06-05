/**
 * Visual QA gate (brief §2). For a given phase, screenshots every touched route
 * in Arabic-RTL and English-LTR, in light and dark mode, at mobile (390x844)
 * and desktop (1440x900). Saves to qa/phase-N/.
 *
 * Usage: BASE_URL=http://localhost:3000 tsx scripts/qa-screenshots.ts <phase>
 * Requires the production server already running at BASE_URL.
 */
import { chromium, type Browser } from '@playwright/test';
import { mkdir, rm } from 'node:fs/promises';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Routes touched per phase. AR is the default locale (no prefix); EN is /en/...
const ROUTES_BY_PHASE: Record<string, { name: string; ar: string; en: string }[]> = {
  '1': [
    { name: 'need-help', ar: '/', en: '/en' },
    { name: 'help-center', ar: '/help-center', en: '/en/help-center' },
    { name: 'map', ar: '/map', en: '/en/map' },
  ],
  '3': [{ name: 'need-help', ar: '/', en: '/en' }],
  '4': [{ name: 'help-center', ar: '/help-center', en: '/en/help-center' }],
  '5': [{ name: 'map', ar: '/map', en: '/en/map' }],
  '6': [
    { name: 'need-help', ar: '/', en: '/en' },
    { name: 'help-center', ar: '/help-center', en: '/en/help-center' },
    { name: 'map', ar: '/map', en: '/en/map' },
  ],
};

const VIEWPORTS = [
  { tag: 'mobile', width: 390, height: 844 },
  { tag: 'desktop', width: 1440, height: 900 },
];
const THEMES = ['light', 'dark'] as const;
const LANGS = ['ar', 'en'] as const;

async function shoot(browser: Browser, outDir: string, phase: string) {
  const routes = ROUTES_BY_PHASE[phase];
  if (!routes) throw new Error(`No routes configured for phase ${phase}`);
  const consoleErrors: string[] = [];

  for (const vp of VIEWPORTS) {
    for (const theme of THEMES) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 1,
      });
      // Seed the persisted theme so ThemeScript applies it before paint.
      await context.addInitScript((t) => {
        try {
          localStorage.setItem('theme', t as string);
        } catch {
          /* ignore */
        }
      }, theme);

      const page = await context.newPage();
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(`[${vp.tag}/${theme}] ${msg.text()}`);
      });
      page.on('pageerror', (err) => consoleErrors.push(`[${vp.tag}/${theme}] ${err.message}`));

      for (const route of routes) {
        for (const lang of LANGS) {
          const path = lang === 'ar' ? route.ar : route.en;
          await page.goto(`${BASE_URL}${path}`, { waitUntil: 'networkidle' });
          await page.waitForTimeout(350); // let fonts settle
          const file = `${outDir}/${route.name}__${lang}__${theme}__${vp.tag}.png`;
          await page.screenshot({ path: file, fullPage: true });
          process.stdout.write(`  ✓ ${file.replace(outDir + '/', '')}\n`);
        }
      }
      await context.close();
    }
  }

  return consoleErrors;
}

async function main() {
  const phase = process.argv[2];
  if (!phase) throw new Error('Usage: tsx scripts/qa-screenshots.ts <phase>');
  const outDir = `qa/phase-${phase}`;
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  console.log(`QA screenshots → ${outDir} (BASE_URL=${BASE_URL})`);
  const browser = await chromium.launch();
  try {
    const errors = await shoot(browser, outDir, phase);
    if (errors.length) {
      console.log(`\n⚠ ${errors.length} console error(s):`);
      for (const e of errors) console.log(`  - ${e}`);
      process.exitCode = 1;
    } else {
      console.log('\n✓ No console errors.');
    }
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
