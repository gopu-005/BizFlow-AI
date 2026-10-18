export interface SubscriptionPlan {
  id: 'bizflow-all-in-one';
  name: string;
  description: string;
  monthlyPrice: 299;
  annualPrice: 2999;
  currency: 'INR';
  features: string[];
}

export const BIZFLOW_PLAN: SubscriptionPlan = {
  id: 'bizflow-all-in-one',
  name: 'BizFlow AI Starter',
  description: 'Agentic Small Business Operating System: Smart Entry, Udhaar Collections, Profit Closing, and conversational ERP.',
  monthlyPrice: 299,
  annualPrice: 2999,
  currency: 'INR',
  features: [
    'Up to 100 AI workflow runs per month',
    'Up to 50 AI document extractions (Bills & Receipts)',
    'Smart Entry Agent (Document OCR, bills & draft commits)',
    'Udhaar & Collection Agent (Aging buckets & WhatsApp click-to-chat)',
    'Profit Leak & Daily Closing Agent (Reconciliation & margin audit)',
    'Guarded Autopilot with server-side human approval controls',
    'Standard GST invoices, customer credit ledgers & stock movements',
    'Tamil and English voice & text conversational assistance',
    'Deterministic financial calculations with audit trails',
  ],
};

export interface Subscription {
  id: string;
  businessId: string;
  planId: 'bizflow-all-in-one';
  planName: string;
  billingCycle: 'monthly' | 'annual';
  amount: number;
  currency: 'INR';
  status: 'active' | 'pending' | 'cancelled' | 'past_due';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  autoRenew: boolean;
  razorpaySubscriptionId?: string;
  razorpayCustomerId?: string;
  lastPaymentDate?: string;
  createdAt: string;
}

export interface BillingDetails {
  businessId: string;
  legalName: string;
  gstin?: string;
  billingEmail: string;
  billingPhone: string;
  addressLine1: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  isGstRegistered: boolean;
}

export interface BillingInvoice {
  id: string;
  invoiceNumber: string;
  businessId: string;
  businessName: string;
  billingEmail: string;
  customerGstin?: string;
  billingAddress: string;
  planName: string;
  billingPeriod: string; // e.g. "15 Oct 2024 - 15 Nov 2024"
  billingCycle: 'monthly' | 'annual';
  baseAmount: number;
  taxRate: number; // e.g. 18% GST (CGST 9% + SGST 9% or IGST 18%)
  taxAmount: number;
  totalPaid: number;
  currency: 'INR';
  paymentStatus: 'paid' | 'pending' | 'failed' | 'refunded';
  paymentMethod: string; // e.g. "UPI / Card / NetBanking"
  gatewayTransactionRef?: string;
  createdAt: string;
  pdfUrl?: string;
}

export interface PaymentOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  businessName: string;
  description: string;
  prefill: {
    name: string;
    email: string;
    contact: string;
  };
}
