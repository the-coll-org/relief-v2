import { test, expect } from '@playwright/test';

// Phase 2 data-layer gate — runs against the live API of the running server.

test('ingest populated the database with >0 organizations', async ({ request }) => {
  const status = await (await request.get('/api/status')).json();
  expect(status.counts.providers).toBeGreaterThan(0);

  const list = await (await request.get('/api/organizations?page_size=10')).json();
  expect(list.total).toBeGreaterThan(0);
  expect(Array.isArray(list.data)).toBe(true);
  expect(list.data.length).toBeGreaterThan(0);
});

test('org list filters by sector', async ({ request }) => {
  const all = await (await request.get('/api/organizations?page_size=1')).json();
  const gbv = await (await request.get('/api/organizations?sector=gbv&page_size=100')).json();
  expect(gbv.total).toBeGreaterThan(0);
  expect(gbv.total).toBeLessThanOrEqual(all.total);
  for (const org of gbv.data) {
    expect(org.sectors.map((s: string) => s.toLowerCase())).toContain('gbv');
  }
});

test('org list filters by zone (district/location)', async ({ request }) => {
  const akkar = await (
    await request.get('/api/organizations?location=akkar&page_size=100')
  ).json();
  expect(akkar.total).toBeGreaterThan(0);
  for (const org of akkar.data) {
    const slugs = org.locations.map((l: string) =>
      l.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-')
    );
    expect(slugs).toContain('akkar');
  }
});

test('org list filters by free-text search', async ({ request }) => {
  const res = await (
    await request.get('/api/organizations?search=abaad&sort=relevance&page_size=20')
  ).json();
  expect(res.total).toBeGreaterThan(0);
  const hay = JSON.stringify(res.data).toLowerCase();
  expect(hay).toContain('abaad');
});

test('emergency hotlines endpoint returns the 4 numbers', async ({ request }) => {
  const res = await (await request.get('/api/hotlines/emergency')).json();
  const numbers = res.data.map((h: { hotline: string }) => h.hotline);
  expect(res.total).toBe(4);
  expect(numbers).toEqual(expect.arrayContaining(['140', '125', '129', '1714']));
});

test('hotlines directory endpoint returns records and filters', async ({ request }) => {
  const all = await (await request.get('/api/hotlines?page_size=200')).json();
  expect(all.total).toBeGreaterThan(0);
  const hospitals = await (
    await request.get('/api/hotlines?category=hospital&page_size=200')
  ).json();
  expect(hospitals.total).toBeGreaterThan(0);
  expect(hospitals.total).toBeLessThanOrEqual(all.total);
});

test('map endpoint returns per-region organization counts', async ({ request }) => {
  const res = await (await request.get('/api/organizations/map')).json();
  expect(Array.isArray(res.data)).toBe(true);
  expect(res.data.length).toBeGreaterThan(0);
  for (const group of res.data) {
    expect(group).toHaveProperty('region_id');
    expect(group.count).toBeGreaterThan(0);
    expect(group.count).toBe(group.listings.length);
  }
  const totalOrgs = (await (await request.get('/api/organizations?page_size=1')).json()).total;
  const summed = res.data.reduce((n: number, g: { count: number }) => n + g.count, 0);
  expect(summed).toBe(totalOrgs);
});
