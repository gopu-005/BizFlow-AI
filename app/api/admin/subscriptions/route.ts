import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/database';
import { requirePlatformAdmin } from '@/lib/auth/rbac';
import { BIZFLOW_PLAN } from '@/types/billing';

export async function GET(req: NextRequest) {
  try {
    const { errorResponse } = requirePlatformAdmin(req);
    if (errorResponse) return errorResponse;

    const businesses = db.getBusinesses();
    const subscriptions = db.getAllSubscriptions();

    const items = businesses.map((b) => {
      const sub = subscriptions[b.id] || db.getSubscription(b.id);
      const quota = db.getQuota(b.id);

      return {
        businessId: b.id,
        businessName: b.name,
        planId: sub.planId,
        planName: sub.planName || 'BizFlow AI Starter',
        priceMonthly: 299,
        priceAnnual: 2999,
        billingCycle: sub.billingCycle || 'monthly',
        status: sub.status || 'active',
        currentPeriodStart: sub.currentPeriodStart,
        currentPeriodEnd: sub.currentPeriodEnd,
        quota,
      };
    });

    return NextResponse.json({
      success: true,
      planCatalog: BIZFLOW_PLAN,
      subscriptions: items,
    });
  } catch (err: any) {
    console.error('Admin subscriptions GET error:', err);
    return NextResponse.json({ error: 'Failed to retrieve subscriptions.' }, { status: 500 });
  }
}
