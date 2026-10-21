import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/database';
import { requireAgenticAccess } from '@/lib/auth/rbac';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedBusinessId = searchParams.get('businessId');
    const { businessId, errorResponse } = requireAgenticAccess(req, requestedBusinessId);
    if (errorResponse) return errorResponse;
    const runId = searchParams.get('runId');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    if (runId) {
      const run = db.getAgentRun(businessId, runId);
      if (!run) {
        return NextResponse.json({ error: 'Agent run not found.' }, { status: 404 });
      }
      return NextResponse.json({ run });
    }

    const runs = db.getAgentRuns(businessId, limit);
    return NextResponse.json({ runs });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch agent runs' }, { status: 500 });
  }
}
