import { NextRequest, NextResponse } from 'next/server';
import { createSubscriptionOrder } from '@/lib/billing/razorpay';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { businessId = 'biz_karthik_textiles', billingCycle = 'monthly', customerName, customerEmail, customerPhone, customerGstin } = body;

    const order = createSubscriptionOrder({
      businessId,
      billingCycle,
      customerName: customerName || 'Karthik Ramanathan',
      customerEmail: customerEmail || 'karthik@textiles.bizflow.in',
      customerPhone,
      customerGstin,
    });

    return NextResponse.json({ success: true, order });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create payment order' }, { status: 500 });
  }
}
