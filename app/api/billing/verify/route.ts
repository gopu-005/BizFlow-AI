import { NextRequest, NextResponse } from 'next/server';
import { verifyAndActivatePayment } from '@/lib/billing/razorpay';
import { resolveTenantBusinessId } from '@/lib/auth/rbac';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { businessId: requestedBusinessId, razorpayOrderId, razorpayPaymentId, razorpaySignature, billingCycle = 'monthly' } = body;
    const { businessId, errorResponse } = resolveTenantBusinessId(req, requestedBusinessId);
    if (errorResponse) return errorResponse;

    if (!razorpayOrderId || !razorpayPaymentId) {
      return NextResponse.json({ error: 'Order ID and Payment ID are required' }, { status: 400 });
    }

    const result = verifyAndActivatePayment({
      businessId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature: razorpaySignature || 'demo_sig_approved',
      billingCycle,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Payment verification failed' }, { status: 400 });
    }

    return NextResponse.json({ success: true, invoice: result.invoice });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Verification exception' }, { status: 500 });
  }
}
