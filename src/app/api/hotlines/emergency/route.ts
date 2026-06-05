import { NextResponse } from 'next/server';
import { EMERGENCY_HOTLINES, emergencyAsContacts } from '@/lib/emergencyHotlines';

export const runtime = 'nodejs';

// GET /api/hotlines/emergency — the 4 canonical, life-critical numbers
// (Ambulance 140, Civil Defense 125, Medical Aid 129, Marine Rescue 1714).
export async function GET() {
  return NextResponse.json({
    data: emergencyAsContacts(),
    raw: EMERGENCY_HOTLINES,
    total: EMERGENCY_HOTLINES.length,
  });
}
