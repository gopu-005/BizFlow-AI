import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/database';
import { requirePlatformAdmin } from '@/lib/auth/rbac';

export async function GET(req: NextRequest) {
  try {
    const { errorResponse } = requirePlatformAdmin(req);
    if (errorResponse) return errorResponse;

    const metrics = db.getPlatformMetrics();

    return NextResponse.json({
      success: true,
      metrics,
    });
  } catch (err: any) {
    console.error('Admin metrics error:', err);
    return NextResponse.json({ error: 'Failed to retrieve platform metrics.' }, { status: 500 });
  }
}
