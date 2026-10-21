import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/database';
import { requirePlatformAdmin } from '@/lib/auth/rbac';

export async function GET(req: NextRequest) {
  try {
    const { errorResponse } = requirePlatformAdmin(req);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const limit = Math.min(200, Math.max(10, Number(searchParams.get('limit')) || 100));

    const logs = db.getAdminAuditLogs(limit);

    return NextResponse.json({
      success: true,
      logs,
    });
  } catch (err: any) {
    console.error('Admin audit logs GET error:', err);
    return NextResponse.json({ error: 'Failed to retrieve administrative audit logs.' }, { status: 500 });
  }
}
