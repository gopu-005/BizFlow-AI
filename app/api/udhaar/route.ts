import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/database';
import { AGENT_TOOLS } from '@/lib/agent/tools';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get('businessId') || 'biz_karthik_textiles';
    const customerId = searchParams.get('customerId');

    if (customerId) {
      const ledger = db.getCustomerLedger(businessId, customerId);
      return NextResponse.json({ success: true, ledger });
    }

    const credits = db.getAllCustomerCredits(businessId);
    const commitments = db.getPaymentCommitments(businessId);
    const payments = db.getPaymentRecords(businessId);

    // Calculate aggregated totals
    const totalOutstanding = credits.reduce((sum, c) => sum + c.balance, 0);
    const totalOverdue = credits.reduce((sum, c) => sum + (c.overdueDays > 0 ? c.balance : 0), 0);
    const agingSummary = {
      current: credits.reduce((sum, c) => sum + c.aging.current, 0),
      days16to30: credits.reduce((sum, c) => sum + c.aging.days16to30, 0),
      days31to60: credits.reduce((sum, c) => sum + c.aging.days31to60, 0),
      daysOver60: credits.reduce((sum, c) => sum + c.aging.daysOver60, 0),
    };

    return NextResponse.json({
      success: true,
      credits,
      commitments,
      payments: payments.slice(0, 30),
      summary: {
        totalOutstanding: Math.round(totalOutstanding * 100) / 100,
        totalOverdue: Math.round(totalOverdue * 100) / 100,
        customerCount: credits.length,
        agingSummary,
      },
    });
  } catch (err: any) {
    console.error('Failed to get customer credits:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch customer credits' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { businessId = 'biz_karthik_textiles', action, payload } = body;

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    // 1. Create a payment commitment
    if (action === 'create_commitment') {
      const { customerId, customerName, customerPhone, amountPromised, promisedDate, invoiceId, notes } = payload;
      if (!customerId || !amountPromised || !promisedDate) {
        return NextResponse.json({ error: 'customerId, amountPromised, and promisedDate are required.' }, { status: 400 });
      }

      const commitment = db.createPaymentCommitment({
        businessId,
        customerId,
        customerName: customerName || 'Customer',
        customerPhone: customerPhone || '',
        amountPromised,
        promisedDate,
        invoiceId,
        status: 'pending',
        followUpCount: 0,
        notes,
      });

      return NextResponse.json({ success: true, commitment });
    }

    // 2. Record a verified payment
    if (action === 'record_payment') {
      const { customerId, invoiceId, amount, paymentMode = 'upi', referenceNumber, paymentDate } = payload;
      if (!amount || amount <= 0) {
        return NextResponse.json({ error: 'Valid amount is required.' }, { status: 400 });
      }

      const result = db.recordVerifiedPayment(businessId, {
        customerId,
        invoiceId,
        amount,
        paymentMode,
        referenceNumber: referenceNumber || `PAY-${Date.now().toString().slice(-6)}`,
        paymentDate: paymentDate || new Date().toISOString().split('T')[0],
      });

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({ success: true, payment: result.payment, updatedBalance: result.updatedBalance });
    }

    // 3. Prepare payment reminder with WhatsApp click-to-chat
    if (action === 'prepare_reminder') {
      const { customerId, invoiceId, reminderType } = payload;
      const reminder = await AGENT_TOOLS.prepare_payment_reminder.execute(businessId, {
        customerId,
        invoiceId,
        reminderType,
      });
      return NextResponse.json({ success: true, reminder });
    }

    // 4. Update commitment status
    if (action === 'update_commitment') {
      const { commitmentId, status, notes } = payload;
      const updated = db.updatePaymentCommitment(businessId, commitmentId, { status, notes });
      return NextResponse.json({ success: true, commitment: updated });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    console.error('Udhaar action failed:', err);
    return NextResponse.json({ error: err.message || 'Udhaar action failed' }, { status: 500 });
  }
}
