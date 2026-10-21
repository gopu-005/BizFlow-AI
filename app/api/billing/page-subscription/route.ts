import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/database';
import { RAZORPAY_MONTHLY_PAGE_URL } from '@/types/billing';
import { resolveTenantBusinessId } from '@/lib/auth/rbac';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      businessId: requestedBusinessId,
      customerName,
      customerEmail,
      customerPhone,
      paymentId,
      status = 'active',
      billingCycle = 'monthly',
    } = body;

    const { businessId, errorResponse } = resolveTenantBusinessId(req, requestedBusinessId);
    if (errorResponse) return errorResponse;

    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
    }

    const sub = db.recordPaymentPageSubscription({
      businessId,
      customerName,
      customerEmail,
      customerPhone,
      paymentId,
      status,
      billingCycle,
    });

    return NextResponse.json({
      success: true,
      redirectUrl: RAZORPAY_MONTHLY_PAGE_URL,
      subscription: sub,
    });
  } catch (err: any) {
    console.error('Record page subscription error:', err);
    return NextResponse.json({ error: err.message || 'Failed to record subscription' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const requestedBusinessId = req.nextUrl.searchParams.get('businessId');
    const { businessId, errorResponse } = resolveTenantBusinessId(req, requestedBusinessId);
    if (errorResponse) return errorResponse;

    const sub = db.getSubscription(businessId);
    return NextResponse.json({
      success: true,
      redirectUrl: RAZORPAY_MONTHLY_PAGE_URL,
      subscription: sub,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to get subscription' }, { status: 500 });
  }
}
