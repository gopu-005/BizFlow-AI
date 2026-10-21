import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/database';
import { resolveTenantBusinessId } from '@/lib/auth/rbac';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const requestedBusinessId = searchParams.get('businessId');
  const { businessId, errorResponse } = resolveTenantBusinessId(req, requestedBusinessId);
  if (errorResponse) return errorResponse;

  const period = (searchParams.get('period') as 'today' | 'week' | 'month') || 'today';

  const summary = db.getSalesSummary(businessId, period);
  return NextResponse.json(summary);
}
