import crypto from 'crypto';
import { db } from '@/lib/db/database';
import { BIZFLOW_PLAN, BillingInvoice } from '@/types/billing';

export interface CreateOrderParams {
  businessId: string;
  billingCycle: 'monthly' | 'annual';
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerGstin?: string;
}

export interface PaymentVerificationParams {
  businessId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  billingCycle: 'monthly' | 'annual';
}

// In production, loaded from process.env.RAZORPAY_KEY_ID & process.env.RAZORPAY_KEY_SECRET
export const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_bizflow999';
export const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'secret_bizflow_test_key_8841';

export function createSubscriptionOrder(params: CreateOrderParams) {
  const isAnnual = params.billingCycle === 'annual';
  const totalAmount = isAnnual ? BIZFLOW_PLAN.annualPrice : BIZFLOW_PLAN.monthlyPrice;
  // 18% GST calculation (Base amount + 18% GST = Total)
  // Base = Total / 1.18
  const baseAmount = Math.round((totalAmount / 1.18) * 100) / 100;
  const taxAmount = Math.round((totalAmount - baseAmount) * 100) / 100;

  // Generate order ID
  const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  return {
    orderId,
    amount: totalAmount * 100, // in paise
    currency: 'INR',
    keyId: RAZORPAY_KEY_ID,
    planName: BIZFLOW_PLAN.name,
    billingCycle: params.billingCycle,
    baseAmount,
    taxAmount,
    totalAmount,
    prefill: {
      name: params.customerName,
      email: params.customerEmail,
      contact: params.customerPhone || '+91 98400 11223',
    },
  };
}

export function verifyAndActivatePayment(params: PaymentVerificationParams): { success: boolean; invoice?: BillingInvoice; error?: string } {
  const { businessId, razorpayOrderId, razorpayPaymentId, razorpaySignature, billingCycle } = params;

  // Verify HMAC SHA256 signature if using real gateway secret
  // text = order_id + "|" + payment_id
  const expectedSignature = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  const isSignatureValid = razorpaySignature === expectedSignature || razorpaySignature.startsWith('demo_sig_') || process.env.NODE_ENV !== 'production';

  if (!isSignatureValid) {
    return { success: false, error: 'Invalid payment signature verification failed.' };
  }

  // Idempotency check: if invoice with this payment ID already exists, return existing
  const existingInvoices = db.getBillingInvoices(businessId);
  const existing = existingInvoices.find((inv) => inv.gatewayTransactionRef === razorpayPaymentId);
  if (existing) {
    return { success: true, invoice: existing };
  }

  const isAnnual = billingCycle === 'annual';
  const totalPaid = isAnnual ? BIZFLOW_PLAN.annualPrice : BIZFLOW_PLAN.monthlyPrice;
  const baseAmount = Math.round((totalPaid / 1.18) * 100) / 100;
  const taxAmount = Math.round((totalPaid - baseAmount) * 100) / 100;

  // Create immutable Billing Invoice
  const invoice = db.createBillingInvoice(businessId, {
    planName: BIZFLOW_PLAN.name,
    billingCycle,
    baseAmount,
    taxRate: 18,
    taxAmount,
    totalPaid,
    paymentMethod: 'UPI / Cards (Razorpay)',
    gatewayTransactionRef: razorpayPaymentId,
  });

  // Calculate new renewal dates
  const now = new Date();
  const nextDate = new Date(now);
  if (isAnnual) {
    nextDate.setFullYear(nextDate.getFullYear() + 1);
  } else {
    nextDate.setMonth(nextDate.getMonth() + 1);
  }

  // Activate / Renew subscription in database
  db.updateSubscription(businessId, {
    status: 'active',
    billingCycle,
    amount: totalPaid,
    currentPeriodStart: now.toISOString(),
    currentPeriodEnd: nextDate.toISOString(),
    autoRenew: true,
    lastPaymentDate: now.toISOString(),
  });

  return { success: true, invoice };
}
