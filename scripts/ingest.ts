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

async function main() {
  const source = arg('source') ?? 'backup';
  const tree = source === 'firebase' ? await loadFromFirebase() : await loadFromBackup();

  const cats = categoryRows(tree);
  const provs = providerRows(tree);
  const hots = hotlineRows(tree);

  console.log(`Parsed: ${provs.length} providers, ${hots.length} hotlines, ${cats.length} categories`);

  // Full refresh: clear then bulk insert.
  await prisma.$transaction([
    prisma.provider.deleteMany(),
    prisma.hotline.deleteMany(),
    prisma.category.deleteMany(),
    prisma.meta.deleteMany(),
  ]);

  const chunk = <T>(arr: T[], n: number) =>
    Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

  for (const c of chunk(provs, 200)) await prisma.provider.createMany({ data: c });
  for (const c of chunk(hots, 200)) await prisma.hotline.createMany({ data: c });
  for (const c of chunk(cats, 200)) await prisma.category.createMany({ data: c });

  await prisma.meta.createMany({
    data: [
      { key: 'source', value: JSON.stringify(source) },
      { key: 'ingested_at', value: JSON.stringify(new Date().toISOString()) },
      {
        key: 'upstream_metadata',
        value: JSON.stringify(tree.entities_metadata ?? null),
      },
      {
        key: 'counts',
        value: JSON.stringify({
          providers: provs.length,
          hotlines: hots.length,
          categories: cats.length,
        }),
      },
    ],
  });

  const providerCount = await prisma.provider.count();
  console.log(`✓ Ingest complete. providers in DB: ${providerCount}`);
}

main()
  .catch((e) => {
    console.error('Ingest failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
