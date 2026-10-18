import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db/database';
import { RAZORPAY_KEY_SECRET } from '@/lib/billing/razorpay';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    // In production, verify signature:
    if (signature && process.env.RAZORPAY_WEBHOOK_SECRET) {
      const expected = crypto
        .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
        .update(rawBody)
        .digest('hex');

      if (signature !== expected) {
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
      }
    }

    const event = JSON.parse(rawBody);
    const eventId = event.id || event.payload?.payment?.entity?.id || `evt_${Date.now()}`;

    // Idempotency check: has this event already been processed?
    if (db.isWebhookProcessed(eventId)) {
      return NextResponse.json({ status: 'ignored_already_processed', eventId });
    }

    const eventType = event.event; // e.g. "payment.captured", "subscription.charged"

    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const paymentEntity = event.payload?.payment?.entity;
      const businessId = paymentEntity?.notes?.businessId || 'biz_karthik_textiles';
      const billingCycle = paymentEntity?.notes?.billingCycle || 'monthly';
      const paymentId = paymentEntity?.id || `pay_${Date.now()}`;

      // Check if invoice already issued for this transaction
      const existingInvoices = db.getBillingInvoices(businessId);
      const isDuplicate = existingInvoices.some((inv) => inv.gatewayTransactionRef === paymentId);

      if (!isDuplicate) {
        const totalPaid = billingCycle === 'annual' ? 4999 : 499;
        const baseAmount = Math.round((totalPaid / 1.18) * 100) / 100;
        const taxAmount = Math.round((totalPaid - baseAmount) * 100) / 100;

        db.createBillingInvoice(businessId, {
          planName: 'BizFlow AI All-in-One',
          billingCycle,
          baseAmount,
          taxRate: 18,
          taxAmount,
          totalPaid,
          paymentMethod: paymentEntity?.method || 'UPI / NetBanking',
          gatewayTransactionRef: paymentId,
        });

        const now = new Date();
        const nextDate = new Date(now);
        if (billingCycle === 'annual') nextDate.setFullYear(nextDate.getFullYear() + 1);
        else nextDate.setMonth(nextDate.getMonth() + 1);

        db.updateSubscription(businessId, {
          status: 'active',
          billingCycle,
          amount: totalPaid,
          currentPeriodStart: now.toISOString(),
          currentPeriodEnd: nextDate.toISOString(),
          autoRenew: true,
          lastPaymentDate: now.toISOString(),
        });
      }
    }

    // Mark event processed for idempotency
    db.markWebhookProcessed(eventId);

    return NextResponse.json({ status: 'success', eventId, processed: true });
  } catch (err: any) {
    console.error('Webhook error:', err);
    return NextResponse.json({ error: err.message || 'Webhook processing failed' }, { status: 500 });
  }
}
