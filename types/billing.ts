export interface SubscriptionPlan {
  id: 'bizflow-all-in-one';
  name: 'BizFlow AI All-in-One';
  description: 'Complete conversational ERP, inventory, invoicing, voice AI, automated reports, and integrations.';
  monthlyPrice: 499;
  annualPrice: 4999;
  currency: 'INR';
  features: string[];
}

export const BIZFLOW_PLAN: SubscriptionPlan = {
  id: 'bizflow-all-in-one',
  name: 'BizFlow AI All-in-One',
  description: 'Complete conversational ERP, inventory, invoicing, voice AI, automated reports, and integrations.',
  monthlyPrice: 499,
  annualPrice: 4999,
  currency: 'INR',
  features: [
    'Unlimited conversational ERP queries',
    'Tamil and English voice & text assistance',
    'Smart invoice creation with PDF export',
    'Real-time inventory & low-stock alerts',
    'Customer follow-up reminder tracking',
    'Daily, monthly & audit-pack reports (PDF/CSV)',
    'Handwritten stock register & receipt OCR import',
    'Gmail & WhatsApp connector integration',
    'Multi-tenant business isolation & secure backup',
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
