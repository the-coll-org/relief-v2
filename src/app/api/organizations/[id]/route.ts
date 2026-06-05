import { NextResponse } from 'next/server';
import { getSnapshot } from '@/lib/store';
import { buildMergedDtos } from '@/lib/organizations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/organizations/:id — ported from getOrganization.
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { providers, locations } = await getSnapshot();
  const mergedDtos = buildMergedDtos(providers, locations);
  const dto = mergedDtos.find((d) => d.id === params.id);
  if (!dto) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }
  return NextResponse.json({ data: dto });
}
