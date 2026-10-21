import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/database';
import { resolveTenantBusinessId } from '@/lib/auth/rbac';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const requestedBusinessId = searchParams.get('businessId');
  const { businessId, errorResponse } = resolveTenantBusinessId(req, requestedBusinessId);
  if (errorResponse) return errorResponse;

  const invoices = db.getInvoices(businessId);
  return NextResponse.json({ invoices });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { businessId: requestedBusinessId, ...invoiceData } = body;
    const { businessId, errorResponse } = resolveTenantBusinessId(req, requestedBusinessId);
    if (errorResponse) return errorResponse;

    if (!invoiceData.customerName || !invoiceData.items || invoiceData.items.length === 0) {
      return NextResponse.json({ error: 'Customer name and at least one item are required' }, { status: 400 });
    }

    const created = db.createInvoice(businessId, invoiceData);
    return NextResponse.json({ success: true, invoice: created });
  } catch (err: any) {
    console.error('Invoice Creation Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to create invoice' }, { status: 500 });
  }
}
