import { NextRequest, NextResponse } from 'next/server';
import { verifyAndActivatePayment } from '@/lib/billing/razorpay';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { businessId = 'biz_karthik_textiles', razorpayOrderId, razorpayPaymentId, razorpaySignature, billingCycle = 'monthly' } = body;

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
