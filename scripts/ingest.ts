/**
 * Ingestion — populate the local SQLite store from the audited Firebase RTDB
 * shape. Two sources (see docs/AUDIT.md §2.4):
 *
 *   npm run ingest                     # default: data/backup-lbresponse-db.json
 *   npm run ingest -- --source=firebase  # mirror the LIVE RTDB (collreliefnetwork)
 *
 * The PowerBI→RTDB scrape itself is an external upstream job; this only mirrors
 * the already-normalized /entities, /categories, /hotlines tree into SQLite.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// tsx doesn't auto-load .env; default the DB path (schema-relative → prisma/dev.db)
// so `npm run ingest` works standalone. Docker/host .env can override.
process.env.DATABASE_URL ||= 'file:./dev.db';

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface RawTree {
  categories?: Record<string, Record<string, RawCategory>>;
  entities?: { providers?: Record<string, RawProvider> };
  entities_metadata?: unknown;
  hotlines?: Record<string, RawHotline>;
}
interface RawCategory {
  key?: string;
  en_label?: string;
  ar_label?: string | null;
  sort_order?: number;
}
interface RawContact {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
}
interface RawProvider {
  provider_id?: string;
  provider_name?: string;
  provider_name_ar?: string | null;
  slug?: string | null;
  primary_contact?: RawContact | null;
  secondary_contact?: RawContact | null;
  sectors?: string[] | null;
  districts?: string[] | null;
  services?: unknown[] | null;
  service_count?: number | null;
  is_name_valid?: boolean | null;
  pinned?: boolean | null;
  verified?: boolean | null;
  updated_at?: string | null;
}
interface RawHotline {
  id?: string;
  category?: string;
  city?: string;
  name_en?: string;
  name_ar?: string | null;
  hotline?: string | null;
  phone?: string | null;
  email?: string | null;
  source_url?: string | null;
  inserted_at?: string | null;
  updated_at?: string | null;
}

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit?.split('=')[1];
}

async function loadFromBackup(): Promise<RawTree> {
  const file = resolve(process.cwd(), 'data/backup-lbresponse-db.json');
  console.log(`Source: backup file ${file}`);
  return JSON.parse(readFileSync(file, 'utf8')) as RawTree;
}

async function loadFromLive(): Promise<RawTree> {
  // Produced by scripts/build_entities_json.py from a fresh PowerBI scrape.
  const file = resolve(process.cwd(), 'data/live-entities.json');
  console.log(`Source: live scrape ${file}`);
  return JSON.parse(readFileSync(file, 'utf8')) as RawTree;
}

async function loadFromFirebase(): Promise<RawTree> {
  // Lazy import so the default (backup) path never needs firebase-admin.
  const admin = (await import('firebase-admin')).default;
  const saPath =
    process.env.FIREBASE_SERVICE_ACCOUNT ||
    resolve(process.cwd(), '../lbresponse-api/service-account.json');
  const dbUrl =
    process.env.FIREBASE_DB_URL ||
    'https://collreliefnetwork-default-rtdb.europe-west1.firebasedatabase.app';
  console.log(`Source: live RTDB ${dbUrl} (sa: ${saPath})`);
  const sa = JSON.parse(readFileSync(saPath, 'utf8'));
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(sa), databaseURL: dbUrl });
  }
  const db = admin.database();
  const [categories, providers, hotlines, meta] = await Promise.all([
    db.ref('categories').once('value'),
    db.ref('entities/providers').once('value'),
    db.ref('hotlines').once('value'),
    db.ref('entities_metadata').once('value'),
  ]);
  return {
    categories: categories.val() ?? {},
    entities: { providers: providers.val() ?? {} },
    hotlines: hotlines.val() ?? {},
    entities_metadata: meta.val() ?? null,
  };
}

function categoryRows(tree: RawTree) {
  const rows: {
    id: string;
    type: string;
    key: string;
    enLabel: string;
    arLabel: string | null;
    sortOrder: number;
  }[] = [];
  for (const [type, entries] of Object.entries(tree.categories ?? {})) {
    for (const [key, c] of Object.entries(entries)) {
      rows.push({
        id: `${type}:${key}`,
        type,
        key: c.key ?? key,
        enLabel: c.en_label ?? key,
        arLabel: c.ar_label ?? null,
        sortOrder: c.sort_order ?? 0,
      });
    }
  }
  return rows;
}

function providerRows(tree: RawTree) {
  const providers = tree.entities?.providers ?? {};
  return Object.entries(providers).map(([id, p]) => ({
    id: p.provider_id ?? id,
    name: p.provider_name ?? '',
    nameAr: p.provider_name_ar ?? null,
    slug: p.slug ?? null,
    primaryContact: p.primary_contact ? JSON.stringify(p.primary_contact) : null,
    secondaryContact: p.secondary_contact ? JSON.stringify(p.secondary_contact) : null,
    sectors: JSON.stringify(p.sectors ?? []),
    districts: JSON.stringify(p.districts ?? []),
    services: JSON.stringify(p.services ?? []),
    serviceCount: typeof p.service_count === 'number' ? p.service_count : 0,
    isNameValid: p.is_name_valid !== false,
    pinned: p.pinned === true,
    verified: p.verified === true,
    updatedAt: p.updated_at ?? null,
  }));
}

function hotlineRows(tree: RawTree) {
  return Object.entries(tree.hotlines ?? {}).map(([id, h]) => ({
    id: h.id ?? id,
    category: h.category ?? '',
    city: h.city ?? '',
    nameEn: h.name_en ?? '',
    nameAr: h.name_ar ?? null,
    hotline: h.hotline ?? null,
    phone: h.phone ?? null,
    email: h.email ?? null,
    sourceUrl: h.source_url ?? null,
    insertedAt: h.inserted_at ?? null,
    updatedAt: h.updated_at ?? null,
  }));
}

const chunk = <T>(arr: T[], n: number) =>
  Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

async function writeMeta(source: string, tree: RawTree, counts: object) {
  await prisma.meta.upsert({
    where: { key: 'source' },
    update: { value: JSON.stringify(source) },
    create: { key: 'source', value: JSON.stringify(source) },
  });
  await prisma.meta.upsert({
    where: { key: 'ingested_at' },
    update: { value: JSON.stringify(new Date().toISOString()) },
    create: { key: 'ingested_at', value: JSON.stringify(new Date().toISOString()) },
  });
  await prisma.meta.upsert({
    where: { key: 'upstream_metadata' },
    update: { value: JSON.stringify(tree.entities_metadata ?? null) },
    create: { key: 'upstream_metadata', value: JSON.stringify(tree.entities_metadata ?? null) },
  });
  await prisma.meta.upsert({
    where: { key: 'counts' },
    update: { value: JSON.stringify(counts) },
    create: { key: 'counts', value: JSON.stringify(counts) },
  });
}

// Full refresh — used for seeding (backup) or a fresh Firebase mirror.
async function fullRefresh(source: string, tree: RawTree) {
  const cats = categoryRows(tree);
  const provs = providerRows(tree);
  const hots = hotlineRows(tree);
  console.log(`Parsed: ${provs.length} providers, ${hots.length} hotlines, ${cats.length} categories`);

  await prisma.$transaction([
    prisma.provider.deleteMany(),
    prisma.hotline.deleteMany(),
    prisma.category.deleteMany(),
    prisma.meta.deleteMany(),
  ]);
  for (const c of chunk(provs, 200)) await prisma.provider.createMany({ data: c });
  for (const c of chunk(hots, 200)) await prisma.hotline.createMany({ data: c });
  for (const c of chunk(cats, 200)) await prisma.category.createMany({ data: c });
  await writeMeta(source, tree, {
    providers: provs.length,
    hotlines: hots.length,
    categories: cats.length,
  });
}

// Upsert — used for the live 6-hour scrape. Updates existing orgs with fresh
// scraped fields but PRESERVES manual pinned/verified flags; inserts new orgs;
// never deletes; never touches the (separately-sourced) hotlines.
async function upsertLive(source: string, tree: RawTree) {
  const cats = categoryRows(tree);
  const provs = providerRows(tree);
  console.log(`Parsed (live): ${provs.length} providers, ${cats.length} categories`);

  const existing = await prisma.provider.findMany({
    select: { id: true, pinned: true, verified: true },
  });
  const flags = new Map(existing.map((e) => [e.id, e]));

  let updated = 0;
  let inserted = 0;
  for (const p of provs) {
    const prev = flags.get(p.id);
    // preserve a manually-set true flag even if the scrape defaults it to false
    const data = {
      ...p,
      pinned: (prev?.pinned ?? false) || p.pinned,
      verified: (prev?.verified ?? false) || p.verified,
    };
    await prisma.provider.upsert({ where: { id: p.id }, update: data, create: data });
    if (prev) updated++;
    else inserted++;
  }

  for (const c of cats) {
    await prisma.category.upsert({ where: { id: c.id }, update: c, create: c });
  }

  const hotlineCount = await prisma.hotline.count();
  await writeMeta(source, tree, {
    providers: await prisma.provider.count(),
    hotlines: hotlineCount,
    categories: await prisma.category.count(),
  });
  console.log(`Upsert: ${updated} updated, ${inserted} inserted, hotlines untouched (${hotlineCount}).`);
}

async function main() {
  const source = arg('source') ?? 'backup';
  if (source === 'live') {
    await upsertLive(source, await loadFromLive());
  } else if (source === 'firebase') {
    await fullRefresh(source, await loadFromFirebase());
  } else {
    await fullRefresh(source, await loadFromBackup());
  }
  const providerCount = await prisma.provider.count();
  console.log(`✓ Ingest complete. providers in DB: ${providerCount}`);
}

main()
  .catch((e) => {
    console.error('Ingest failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
