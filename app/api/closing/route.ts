import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/database';
import { requireAgenticAccess } from '@/lib/auth/rbac';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedBusinessId = searchParams.get('businessId');
    const { businessId, errorResponse } = requireAgenticAccess(req, requestedBusinessId);
    if (errorResponse) return errorResponse;

    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    // Check if finalized or draft report exists, otherwise calculate fresh
    let closing = db.getDailyClosing(businessId, date);
    if (!closing) {
      closing = db.generateDailyClosing(businessId, date);
    }

    const anomalies = db.detectMarginAnomalies(businessId, 15);
    const payments = db.getPaymentRecords(businessId).filter((p) => p.paymentDate === date);
    const expenses = db.getExpenses(businessId, date);
    const invoices = db.getInvoices(businessId).filter((i) => i.createdAt.startsWith(date));

    return NextResponse.json({
      success: true,
      closing,
      anomalies,
      invoices,
      payments,
      expenses,
    });
  } catch (err: any) {
    console.error('Failed to get closing report:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch closing data' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { businessId: requestedBusinessId, action, payload = {} } = body;
    const { businessId, errorResponse } = requireAgenticAccess(req, requestedBusinessId);
    if (errorResponse) return errorResponse;

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    // 1. Generate/Refresh closing report
    if (action === 'generate') {
      const date = payload.date || new Date().toISOString().split('T')[0];
      const report = db.generateDailyClosing(businessId, date);
      return NextResponse.json({ success: true, closing: report });
    }

    // 2. Finalize daily closing
    if (action === 'finalize') {
      const { date, verifiedBy = 'Business Owner' } = payload;
      if (!date) {
        return NextResponse.json({ error: 'Date is required for finalization.' }, { status: 400 });
      }
      const finalized = db.finalizeDailyClosing(businessId, date, verifiedBy);
      return NextResponse.json({ success: true, closing: finalized });
    }

    // 3. Detect margin anomalies
    if (action === 'detect_anomalies') {
      const minMarginPercent = payload.minMarginPercent || 15;
      const anomalies = db.detectMarginAnomalies(businessId, minMarginPercent);
      return NextResponse.json({ success: true, anomalies });
    }

    // 4. Reconcile an unmatched payment
    if (action === 'reconcile_payment') {
      const { paymentId, invoiceId } = payload;
      if (!paymentId || !invoiceId) {
        return NextResponse.json({ error: 'paymentId and invoiceId are required.' }, { status: 400 });
      }
      const recResult = db.reconcilePayment(businessId, paymentId, invoiceId);
      if (!recResult.success) {
        return NextResponse.json({ error: recResult.error }, { status: 400 });
      }
      return NextResponse.json({ ...recResult });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    console.error('Closing action failed:', err);
    return NextResponse.json({ error: err.message || 'Closing action failed' }, { status: 500 });
  }
}
