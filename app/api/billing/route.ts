import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/database';
import { BIZFLOW_PLAN } from '@/types/billing';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const businessId = searchParams.get('businessId') || 'biz_karthik_textiles';

  const subscription = db.getSubscription(businessId);
  const billingDetails = db.getBillingDetails(businessId);
  const invoices = db.getBillingInvoices(businessId);

  return NextResponse.json({
    plan: BIZFLOW_PLAN,
    subscription,
    billingDetails,
    invoices,
  });
}

export async function POST(req: NextRequest) {
  try {
    const { businessId = 'biz_karthik_textiles', details } = await req.json();
    const updated = db.updateBillingDetails(businessId, details);
    return NextResponse.json({ success: true, billingDetails: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update billing details' }, { status: 500 });
  }
}
