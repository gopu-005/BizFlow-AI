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
        customerName: sub.customerName || b.ownerName,
        customerEmail: sub.customerEmail || b.email,
        customerPhone: sub.customerPhone || b.phone,
        planId: sub.planId,
        planName: sub.planName || 'BizFlow AI Starter',
        amount: sub.amount || (sub.billingCycle === 'annual' ? 2999 : 299),
        priceMonthly: 299,
        priceAnnual: 2999,
        billingCycle: sub.billingCycle || 'monthly',
        status: sub.status || 'active',
        currentPeriodStart: sub.currentPeriodStart,
        currentPeriodEnd: sub.currentPeriodEnd,
        lastPaymentDate: sub.lastPaymentDate,
        gatewayTransactionRef: sub.gatewayTransactionRef,
        razorpayPaymentPageUrl: sub.razorpayPaymentPageUrl,
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

export async function POST(req: NextRequest) {
  try {
    const { context, errorResponse } = requirePlatformAdmin(req);
    if (errorResponse) return errorResponse;

    const { user: adminUser } = context!;
    const body = await req.json();
    const { businessId, status = 'active', paymentRef, customerName, customerEmail } = body;

    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required.' }, { status: 400 });
    }

    const sub = db.recordPaymentPageSubscription({
      businessId,
      customerName,
      customerEmail,
      paymentId: paymentRef,
      status,
      billingCycle: 'monthly',
    });

    db.createAdminAuditLog({
      adminUserId: adminUser.id,
      adminEmail: adminUser.email,
      action: 'system_configuration_change',
      targetEntity: 'subscription',
      targetId: businessId,
      details: {
        note: `Platform Admin manually verified and activated subscription for ${businessId}`,
        paymentRef,
        status,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Subscription for ${businessId} updated to ${status}.`,
      subscription: sub,
    });
  } catch (err: any) {
    console.error('Admin subscription update error:', err);
    return NextResponse.json({ error: err.message || 'Failed to update subscription' }, { status: 500 });
  }
}
