'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  CheckCircle2,
  Download,
  ShieldCheck,
  Sparkles,
  Clock,
  AlertCircle,
  RefreshCw,
  Building,
  ExternalLink,
  ArrowLeft,
  FileText,
  Loader2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { BIZFLOW_PLAN, Subscription, BillingInvoice, BillingDetails } from '@/types/billing';
import { Business } from '@/types/erp';
import { generateBillingInvoicePDF } from '@/lib/erp/pdf-generator';

const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false);
    if ((window as any).Razorpay) return resolve(true);

    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) return resolve(true);

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function BillingPage() {
  const [businessId, setBusinessId] = useState('biz_karthik_textiles');
  const [activeTab, setActiveTab] = useState<'plan' | 'invoices' | 'settings'>('plan');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [isYearlyLoading, setIsYearlyLoading] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [billingDetails, setBillingDetails] = useState<BillingDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentSuccessMessage, setPaymentSuccessMessage] = useState<string | null>(null);
  const RAZORPAY_MONTHLY_PAGE = 'https://pages.razorpay.com/lykspirehqbizflowmonthly';

  const currentBusiness: Business = {
    id: businessId,
    name:
      businessId === 'biz_karthik_textiles'
        ? 'Karthik Textiles & Garments'
        : 'Sri Murugan Bakery & Sweets',
    type:
      businessId === 'biz_karthik_textiles' ? 'Clothing & Retail' : 'Bakery & Sweets',
    currency: '₹',
    ownerName:
      businessId === 'biz_karthik_textiles'
        ? 'Karthik Ramanathan'
        : 'Murugan Velayudham',
    gstNumber:
      businessId === 'biz_karthik_textiles'
        ? '33AAAAA0000A1Z5'
        : '33BBBBB1111B2Z6',
    address: 'Chennai, Tamil Nadu',
    phone: '+91 98400 11223',
    email: 'karthik@textiles.bizflow.in',
    createdAt: '2024-01-10T10:00:00Z',
  };

  const [legalName, setLegalName] = useState(currentBusiness.name);
  const [gstin, setGstin] = useState(currentBusiness.gstNumber || '');
  const [billingEmail, setBillingEmail] = useState(currentBusiness.email);
  const [addressLine1, setAddressLine1] = useState(currentBusiness.address);

  const [quota, setQuota] = useState<{ usedAiRuns: number; maxAiRuns: number; usedExtractions: number; maxExtractions: number } | null>(null);

  useEffect(() => {
    fetchBillingData();
  }, [businessId]);

  const fetchBillingData = async () => {
    try {
      const res = await fetch(`/api/billing?businessId=${businessId}`);
      const data = await res.json();
      if (data.subscription) setSubscription(data.subscription);
      if (data.invoices) setInvoices(data.invoices);
      if (data.billingDetails) {
        setBillingDetails(data.billingDetails);
        setLegalName(data.billingDetails.legalName || currentBusiness.name);
        setGstin(data.billingDetails.gstin || currentBusiness.gstNumber || '');
        setBillingEmail(data.billingDetails.billingEmail || currentBusiness.email);
        setAddressLine1(data.billingDetails.addressLine1 || currentBusiness.address);
      }

      const qRes = await fetch(`/api/agent/quota?businessId=${businessId}`);
      const qData = await qRes.json();
      if (qData.quota) setQuota(qData.quota);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveBillingDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          details: {
            legalName,
            gstin,
            billingEmail,
            addressLine1,
            isGstRegistered: !!gstin,
          },
        }),
      });
      alert('Billing & GST details saved successfully!');
      fetchBillingData();
    } catch (e) {
      alert('Failed to save settings');
    }
  };

  const verifyPayment = async (verifyPayload: {
    businessId: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
    billingCycle: 'monthly' | 'annual';
  }) => {
    try {
      const verifyRes = await fetch('/api/billing/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(verifyPayload),
      });

      const verifyData = await verifyRes.json();
      if (verifyData.success && verifyData.invoice) {
        setPaymentSuccessMessage(
          `Payment of ₹${billingCycle === 'annual' ? '4,999' : '499'} confirmed! Tax invoice #${verifyData.invoice.invoiceNumber} generated. Full product access unlocked!`
        );

        try {
          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.6 },
          });
        } catch (e) {
          // ignore
        }

        fetchBillingData();
        setActiveTab('invoices');
      } else {
        alert(verifyData.error || 'Payment verification failed');
      }
    } catch (err: any) {
      alert(err.message || 'Payment verification failed');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleMonthlyRedirect = async () => {
    setIsProcessingPayment(true);
    try {
      // Record client subscription intent & details in database so it is stored and viewed in Admin Panel
      await fetch('/api/billing/page-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          customerName: legalName || currentBusiness.ownerName,
          customerEmail: billingEmail || currentBusiness.email,
          customerPhone: currentBusiness.phone,
          billingCycle: 'monthly',
          status: 'active',
        }),
      });
    } catch (e) {
      console.warn('Failed to pre-record subscription:', e);
    }
    // Redirect directly to the requested Razorpay Payment Page for the 299 monthly plan
    window.location.href = RAZORPAY_MONTHLY_PAGE;
  };

  const handleYearlyClick = () => {
    setBillingCycle('annual');
    setIsYearlyLoading(true);
  };

  const handleCheckout = async (redirectDirectly: boolean = false) => {
    setIsProcessingPayment(true);
    setPaymentSuccessMessage(null);

    try {
      // 1. Create order on server
      const orderRes = await fetch('/api/billing/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          billingCycle,
          customerName: legalName,
          customerEmail: billingEmail,
          customerPhone: currentBusiness.phone,
          customerGstin: gstin,
        }),
      });

      const orderData = await orderRes.json();
      if (!orderData.success || !orderData.order) {
        throw new Error('Order creation failed');
      }

      const order = orderData.order;

      // Redirect to Razorpay hosted payment page if requested
      if (redirectDirectly) {
        const razorpayHostedUrl = `https://rzp.io/l/bizflow-ai-${billingCycle}`;
        window.open(razorpayHostedUrl, '_blank', 'noopener,noreferrer');
      }

      // Load Razorpay official SDK
      const scriptLoaded = await loadRazorpayScript();

      if (scriptLoaded && (window as any).Razorpay) {
        const options = {
          key: order.keyId,
          amount: order.amount,
          currency: order.currency,
          name: 'BizFlow AI (LyKSpire)',
          description: `${BIZFLOW_PLAN.name} (${billingCycle.toUpperCase()})`,
          order_id: order.orderId || order.id,
          prefill: {
            name: legalName,
            email: billingEmail,
            contact: currentBusiness.phone,
          },
          notes: {
            businessId,
            billingCycle,
          },
          theme: {
            color: '#7c3aed',
          },
          handler: function (response: any) {
            verifyPayment({
              businessId,
              razorpayOrderId: response.razorpay_order_id || order.orderId || order.id,
              razorpayPaymentId: response.razorpay_payment_id || `pay_${Date.now()}`,
              razorpaySignature: response.razorpay_signature || `sig_${Date.now()}`,
              billingCycle,
            });
          },
          modal: {
            ondismiss: function () {
              setIsProcessingPayment(false);
            },
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', function (response: any) {
          alert(`Payment failed: ${response.error?.description || 'Unknown reason'}`);
          setIsProcessingPayment(false);
        });
        rzp.open();
      } else {
        // Fallback simulation for sandbox if offline or adblock
        setTimeout(async () => {
          await verifyPayment({
            businessId,
            razorpayOrderId: order.orderId || order.id,
            razorpayPaymentId: `pay_sim_${Date.now()}`,
            razorpaySignature: `sig_sim_${Date.now()}`,
            billingCycle,
          });
        }, 1200);
      }
    } catch (err: any) {
      alert(`Could not initiate payment: ${err.message}`);
      setIsProcessingPayment(false);
    }
  };

  const downloadInvoice = (invoice: BillingInvoice) => {
    const doc = generateBillingInvoicePDF(invoice);
    doc.save(`BizFlow_Tax_Invoice_${invoice.invoiceNumber}.pdf`);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#fbfbfe] text-[#0f172a] font-sans antialiased">
      <Navbar currentBusinessId={businessId} onBusinessChange={(id) => setBusinessId(id)} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Breadcrumb & Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-xl bg-white border border-gray-200 hover:border-purple-300 text-gray-600 hover:text-purple-700 transition-colors shadow-xs"
              title="Back to Voice Assistant"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">
                  Subscription & Checkout
                </span>
                <span className="text-gray-300">•</span>
                <span className="text-xs text-gray-500">{currentBusiness.name}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 font-heading">
                All-in-One Enterprise Plan
              </h1>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-gray-200 shadow-xs">
            <button
              onClick={() => setActiveTab('plan')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${activeTab === 'plan'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              Subscription Plan
            </button>
            <button
              onClick={() => setActiveTab('invoices')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${activeTab === 'invoices'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              Tax Invoices ({invoices.length})
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${activeTab === 'settings'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              GST & Billing Details
            </button>
          </div>
        </div>

        {paymentSuccessMessage && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <p className="text-xs sm:text-sm font-semibold text-emerald-900">
                {paymentSuccessMessage}
              </p>
            </div>
            <button
              onClick={() => setPaymentSuccessMessage(null)}
              className="text-emerald-700 hover:text-emerald-900 text-xs font-bold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* TAB 1: PLAN SELECTION & RAZORPAY CHECKOUT */}
        {activeTab === 'plan' && (
          <div className="space-y-6">
            {/* Billing Cycle Toggle */}
            <div className="flex items-center justify-center">
              <div className="flex items-center bg-white p-1 rounded-2xl border border-purple-200 shadow-xs">
                <button
                  onClick={() => {
                    setBillingCycle('monthly');
                    setIsYearlyLoading(false);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    billingCycle === 'monthly'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-purple-600'
                  }`}
                >
                  Monthly Billing (₹299/mo)
                </button>
                <button
                  onClick={handleYearlyClick}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    billingCycle === 'annual'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-purple-600'
                  }`}
                >
                  {isYearlyLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                      <span className="italic font-semibold">*Currently under process*</span>
                    </>
                  ) : (
                    <>
                      <span>Annual Billing (₹2,999/yr)</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold uppercase tracking-wide">
                        Save 17%
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Plan Card & Checkout Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Pricing Box */}
              <div className="lg:col-span-2 glass-card rounded-2xl p-6 sm:p-8 border border-purple-200/90 shadow-sm relative overflow-hidden space-y-6">
                <div className="absolute top-0 right-0 w-60 h-60 bg-purple-200/30 rounded-full blur-3xl pointer-events-none" />

                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-widest text-purple-700 bg-purple-100 px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 font-heading mt-2">
                      {BIZFLOW_PLAN.name}
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">
                      {BIZFLOW_PLAN.description}
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl sm:text-4xl font-black text-gray-900 font-heading">
                        ₹{billingCycle === 'annual' ? '2,999' : '299'}
                      </span>
                      <span className="text-xs text-gray-500 font-semibold">
                        /{billingCycle === 'annual' ? 'year' : 'month'}
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-400 font-medium">
                      + 18% GST (Tax invoice provided)
                    </div>
                  </div>
                </div>

                {/* Notice banner if yearly is selected */}
                {(billingCycle === 'annual' || isYearlyLoading) && (
                  <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 flex items-center gap-2.5 text-purple-900 animate-in fade-in duration-200">
                    <Loader2 className="w-4 h-4 animate-spin text-purple-600 shrink-0" />
                    <span className="text-xs font-semibold italic">*Currently under process*</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {BIZFLOW_PLAN.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-gray-700">
                      <div className="w-4 h-4 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 mt-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Primary Payment CTA Buttons */}
                <div className="pt-4 border-t border-purple-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  {billingCycle === 'annual' || isYearlyLoading ? (
                    <button
                      disabled
                      className="flex-1 px-5 py-3.5 rounded-xl bg-purple-100 border border-purple-300 text-purple-800 font-bold text-sm shadow-xs flex items-center justify-center gap-2 cursor-not-allowed"
                    >
                      <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                      <span className="italic">*Currently under process*</span>
                    </button>
                  ) : (
                    <>
                      {/* Button 1: Redirect to Razorpay Monthly Hosted Page (₹299) */}
                      <button
                        onClick={handleMonthlyRedirect}
                        disabled={isProcessingPayment}
                        className="flex-1 px-5 py-3.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-sm shadow-md shadow-purple-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                        title="Redirect to Razorpay Payment Page: https://pages.razorpay.com/lykspirehqbizflowmonthly"
                      >
                        {isProcessingPayment ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Connecting to Razorpay...
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-4 h-4" />
                            <span>Subscribe for ₹299/month (Razorpay Page)</span>
                            <ExternalLink className="w-4 h-4 ml-1" />
                          </>
                        )}
                      </button>

                      {/* Button 2: Direct link to Razorpay Payment Page */}
                      <a
                        href={RAZORPAY_MONTHLY_PAGE}
                        onClick={handleMonthlyRedirect}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-5 py-3.5 rounded-xl bg-white hover:bg-purple-50 border border-purple-300 text-purple-800 font-bold text-sm shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                        title="Open Razorpay Payment Page in new tab"
                      >
                        <span>Open Razorpay Page</span>
                        <ExternalLink className="w-4 h-4 text-purple-600" />
                      </a>
                    </>
                  )}
                </div>
              </div>

              {/* Status & Trust Box */}
              <div className="space-y-4">
                <div className="glass-card rounded-2xl p-6 border border-gray-200/80 shadow-xs space-y-4">
                  <h3 className="text-sm font-bold text-gray-900 font-heading">
                    Current Subscription Status
                  </h3>

                  <div className="p-3 rounded-xl bg-purple-50 border border-purple-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">Status</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {subscription?.status.toUpperCase() || 'ACTIVE (TRIAL)'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">Billing Cycle</span>
                      <span className="text-xs font-bold text-gray-800 capitalize">
                        {subscription?.billingCycle || billingCycle}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">Renewal Date</span>
                      <span className="text-xs font-bold text-gray-800">
                        {subscription?.currentPeriodEnd
                          ? new Date(subscription.currentPeriodEnd).toLocaleDateString('en-IN')
                          : '18/11/2026'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs text-gray-500">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>100% Secure 256-bit SSL encrypted checkout</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-purple-600 shrink-0" />
                      <span>Instant GST tax invoice with input credit</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>Cancel or switch cycles anytime</span>
                    </div>
                  </div>
                </div>

                {/* Server-Enforced Live Quota Meter */}
                {quota && (
                  <div className="glass-card rounded-2xl p-6 border border-purple-200/80 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                        Monthly AI Usage Meter
                      </h4>
                      <span className="text-[10px] text-purple-700 font-bold bg-purple-100 px-2 py-0.5 rounded-full">
                        Server Enforced
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-gray-600">AI Workflow Runs</span>
                          <span className="font-bold text-gray-900">
                            {quota.usedAiRuns} / {quota.maxAiRuns}{' '}
                            <span className="text-[11px] text-emerald-600 font-normal">
                              ({quota.maxAiRuns - quota.usedAiRuns} left)
                            </span>
                          </span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-600 rounded-full transition-all"
                            style={{ width: `${Math.min(100, (quota.usedAiRuns / quota.maxAiRuns) * 100)}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-gray-600">AI Document Extractions</span>
                          <span className="font-bold text-gray-900">
                            {quota.usedExtractions} / {quota.maxExtractions}{' '}
                            <span className="text-[11px] text-indigo-600 font-normal">
                              ({quota.maxExtractions - quota.usedExtractions} left)
                            </span>
                          </span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-600 rounded-full transition-all"
                            style={{ width: `${Math.min(100, (quota.usedExtractions / quota.maxExtractions) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-purple-50 text-[11px] text-purple-900 mt-2">
                      <span className="font-bold">Unblocked Manual Operations:</span> Ordinary database CRUD, invoice generation, and manual ledger exports are never blocked even when AI quota is reached.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: INVOICES & RECEIPTS */}
        {activeTab === 'invoices' && (
          <div className="glass-card rounded-2xl p-6 shadow-sm border border-gray-200/80 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-gray-900 font-heading">
                  Subscription Tax Invoices
                </h3>
                <p className="text-xs text-gray-500">
                  Download official GST-compliant tax invoices for your accounting
                </p>
              </div>
            </div>

            {invoices.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No billing invoices found yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-semibold">
                      <th className="py-2.5 px-3">Invoice No</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Plan</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">GST (18%)</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-purple-50/20">
                        <td className="py-2.5 px-3 font-mono font-bold text-purple-700">
                          {inv.invoiceNumber}
                        </td>
                        <td className="py-2.5 px-3 text-gray-600">
                          {new Date(inv.createdAt).toLocaleDateString('en-IN')}
                        </td>
                        <td className="py-2.5 px-3 text-gray-800">
                          {inv.planName} ({inv.billingCycle})
                        </td>
                        <td className="py-2.5 px-3 font-bold text-gray-900">
                          ₹{(inv.totalPaid ?? (inv as any).amount ?? 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-3 text-gray-600">
                          ₹{(inv.taxAmount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            PAID
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => downloadInvoice(inv)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold transition-colors cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>PDF</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: GST & BILLING PROFILE */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl glass-card rounded-2xl p-6 shadow-sm border border-gray-200/80 space-y-5">
            <div>
              <h3 className="text-base font-bold text-gray-900 font-heading">
                GSTIN & Invoicing Profile
              </h3>
              <p className="text-xs text-gray-500">
                Ensure this matches your GST registration so your monthly tax invoices are eligible for input tax credit.
              </p>
            </div>

            <form onSubmit={handleSaveBillingDetails} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Legal Business Name
                </label>
                <input
                  type="text"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-gray-200 focus:border-purple-500 focus:outline-none text-xs text-gray-900"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  GST Number (GSTIN)
                </label>
                <input
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  placeholder="33AAAAA0000A1Z5"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-gray-200 focus:border-purple-500 focus:outline-none font-mono text-xs text-gray-900 uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Billing Email
                </label>
                <input
                  type="email"
                  value={billingEmail}
                  onChange={(e) => setBillingEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-gray-200 focus:border-purple-500 focus:outline-none text-xs text-gray-900"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Registered Address
                </label>
                <textarea
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-gray-200 focus:border-purple-500 focus:outline-none text-xs text-gray-900"
                  required
                />
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
              >
                Save Billing Details
              </button>
            </form>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
