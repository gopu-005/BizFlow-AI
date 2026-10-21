import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/database';
import { requireAgenticAccess } from '@/lib/auth/rbac';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedBusinessId = searchParams.get('businessId');
    const { businessId, errorResponse } = requireAgenticAccess(req, requestedBusinessId);
    if (errorResponse) return errorResponse;

    const quota = db.getQuota(businessId);
    return NextResponse.json({
      success: true,
      quota,
      plan: {
        name: 'BizFlow AI Starter',
        priceMonthly: 299,
        priceAnnual: 2999,
        features: [
          'Up to 100 AI workflow runs / month',
          'Up to 50 AI document extractions / month',
          'Smart Entry Agent (Bills, Receipts & CSV)',
          'Udhaar & Collection Agent (Credit & WhatsApp)',
          'Profit Leak & Daily Closing Agent',
          'Human-in-the-loop Guarded Autopilot',
          'Deterministic Financial Audit Trail',
        ],
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch quota' }, { status: 500 });
  }
}
