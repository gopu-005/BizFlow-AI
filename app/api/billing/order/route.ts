import { NextRequest, NextResponse } from 'next/server';
import { createSubscriptionOrder } from '@/lib/billing/razorpay';
import { resolveTenantBusinessId } from '@/lib/auth/rbac';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { businessId: requestedBusinessId, billingCycle = 'monthly', customerName, customerEmail, customerPhone, customerGstin } = body;
    const { businessId, errorResponse } = resolveTenantBusinessId(req, requestedBusinessId);
    if (errorResponse) return errorResponse;

    const order = createSubscriptionOrder({
      businessId,
      billingCycle,
      customerName: customerName || 'Business Owner',
      customerEmail: customerEmail || 'billing@bizflow.in',
      customerPhone,
      customerGstin,
    });

    return NextResponse.json({ success: true, order });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create payment order' }, { status: 500 });
  }
}
