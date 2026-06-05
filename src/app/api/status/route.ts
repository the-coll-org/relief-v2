import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/status — health + ingestion metadata (last source/time, counts).
export async function GET() {
  const [providers, hotlines, categories, meta] = await Promise.all([
    prisma.provider.count(),
    prisma.hotline.count(),
    prisma.category.count(),
    prisma.meta.findMany(),
  ]);
  const metaMap = Object.fromEntries(
    meta.map((m) => {
      try {
        return [m.key, JSON.parse(m.value)];
      } catch {
        return [m.key, m.value];
      }
    })
  );
  return NextResponse.json({
    name: 'relief-v2',
    status: 'ok',
    counts: { providers, hotlines, categories },
    ingest: metaMap,
  });
}
