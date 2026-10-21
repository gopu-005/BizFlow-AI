'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileCheck,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Calendar,
  Search,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  Receipt,
  HelpCircle,
  Link2,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { DailyClosingReport, MarginAnomaly, PaymentRecord } from '@/types/agent';
import { Invoice, Expense } from '@/types/erp';
import { useBusiness } from '@/components/BusinessProvider';

export default function DailyClosingPage() {
  const { currentBusiness, businessId: activeBusinessId, setBusinessId: setActiveBusinessId } = useBusiness();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [closing, setClosing] = useState<DailyClosingReport | null>(null);
  const [anomalies, setAnomalies] = useState<MarginAnomaly[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Reconcile modal state
  const [reconcileModal, setReconcileModal] = useState<{
    isOpen: boolean;
    payment?: PaymentRecord;
    invoiceId: string;
    loading: boolean;
  }>({
    isOpen: false,
    invoiceId: '',
    loading: false,
  });

  useEffect(() => {
    if (!activeBusinessId) return;
    loadClosingData();
  }, [activeBusinessId, selectedDate]);

  const loadClosingData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/closing?businessId=${activeBusinessId}&date=${selectedDate}`);
      const data = await res.json();
      if (data.success) {
        setClosing(data.closing || null);
        setAnomalies(data.anomalies || []);
        setInvoices(data.invoices || []);
        setPayments(data.payments || []);
        setExpenses(data.expenses || []);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Finalize Closing
  const handleFinalizeClosing = async () => {
    if (!closing) return;
    try {
      const res = await fetch('/api/closing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: activeBusinessId,
          action: 'finalize',
          payload: { date: selectedDate, verifiedBy: currentBusiness?.ownerName || 'Business Owner' },
        }),
      });

      const data = await res.json();
      if (data.success) {
        setClosing(data.closing);
        setFeedback({
          type: 'success',
          text: `Daily closing report for ${selectedDate} finalized and locked.`,
        });
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to finalize closing' });
    }
  };

  // Reconcile unmatched payment
  const handleReconcilePayment = async () => {
    if (!reconcileModal.payment || !reconcileModal.invoiceId) return;

    setReconcileModal((prev) => ({ ...prev, loading: true }));
    try {
      const res = await fetch('/api/closing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: activeBusinessId,
          action: 'reconcile_payment',
          payload: {
            paymentId: reconcileModal.payment.id,
            invoiceId: reconcileModal.invoiceId,
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: 'success',
          text: `Payment of ₹${reconcileModal.payment.amount} reconciled with Invoice #${data.invoice?.invoiceNumber || reconcileModal.invoiceId}.`,
        });
        setReconcileModal({ isOpen: false, invoiceId: '', loading: false });
        loadClosingData();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Reconciliation failed' });
      setReconcileModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const unmatchedPayments = payments.filter((p) => !p.matched);

  return (
    <div className="min-h-screen bg-[#fbfbfe] text-[#0f172a] flex flex-col justify-between">
      <Navbar currentBusinessId={activeBusinessId} onBusinessChange={(id) => setActiveBusinessId(id)} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header with Date Picker */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-purple-100 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 font-bold">
                <FileCheck className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-bold font-heading text-gray-900">
                Daily Closing & Financial Investigations
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              End-of-day reconciliation, cash variance audit, payment matching, and margin leak detection.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs font-semibold p-2 rounded-xl border border-gray-200 bg-white"
            />
            <button
              onClick={loadClosingData}
              className="p-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 ${
              feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            <span>{feedback.text}</span>
            <button onClick={() => setFeedback(null)} className="text-gray-400 hover:text-gray-600">
              ✕
            </button>
          </div>
        )}

        {/* Reconciled Financial Metrics */}
        {closing && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
            {/* Sales */}
            <div className="bg-white p-4 rounded-2xl border border-purple-100 shadow-xs">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Finalized Sales</div>
              <div className="text-base sm:text-lg font-bold text-gray-900 mt-1">
                ₹{closing.totalSales.toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-gray-400">{closing.totalInvoices} invoices recorded</div>
            </div>

            {/* Collections */}
            <div className="bg-white p-4 rounded-2xl border border-purple-100 shadow-xs">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Collections Received</div>
              <div className="text-base sm:text-lg font-bold text-emerald-700 mt-1">
                ₹{closing.totalCollections.toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-emerald-600">UPI, Cash & Bank</div>
            </div>

            {/* Expenses */}
            <div className="bg-white p-4 rounded-2xl border border-purple-100 shadow-xs">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Recorded Expenses</div>
              <div className="text-base sm:text-lg font-bold text-rose-700 mt-1">
                ₹{closing.totalExpenses.toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-gray-400">{expenses.length} expense entries</div>
            </div>

            {/* Gross Profit */}
            <div className="bg-white p-4 rounded-2xl border border-purple-100 shadow-xs">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Gross Profit</div>
              <div className="text-base sm:text-lg font-bold text-purple-700 mt-1">
                ₹{closing.estimatedGrossProfit.toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-purple-600 font-semibold">{closing.profitMarginPercent}% Margin</div>
            </div>

            {/* Cash Variance */}
            <div
              className={`p-4 rounded-2xl border shadow-xs ${
                Math.abs(closing.cashVariance) > 0 ? 'bg-amber-50/60 border-amber-200' : 'bg-emerald-50/60 border-emerald-200'
              }`}
            >
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Cash Variance</div>
              <div
                className={`text-base sm:text-lg font-bold mt-1 ${
                  Math.abs(closing.cashVariance) > 0 ? 'text-amber-800' : 'text-emerald-800'
                }`}
              >
                ₹{closing.cashVariance.toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-gray-500">
                Rec: ₹{closing.cashRecorded} | Exp: ₹{closing.cashExpected}
              </div>
            </div>
          </div>
        )}

        {/* Daily Closing Report Card */}
        {closing && (
          <div className="bg-white p-5 rounded-2xl border border-purple-100 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-gray-900 font-heading">
                    Closing Report for {closing.date}
                  </h2>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      closing.status === 'finalized'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}
                  >
                    {closing.status.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Verified against real database invoices, customer ledgers, and payment receipts.
                </p>
              </div>

              {closing.status !== 'finalized' ? (
                <button
                  onClick={handleFinalizeClosing}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  Verify & Finalize Closing
                </button>
              ) : (
                <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                  <CheckCircle2 className="w-4 h-4" /> Finalized by {closing.verifiedBy || 'Owner'}
                </span>
              )}
            </div>

            {/* Summary Text */}
            <div className="p-3.5 bg-purple-50/60 rounded-xl border border-purple-100 text-xs text-purple-950 font-medium">
              {closing.summaryText}
            </div>
          </div>
        )}

        {/* Unmatched Payment Transactions Card */}
        <div className="bg-white p-5 rounded-2xl border border-purple-100 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900 font-heading flex items-center gap-2">
                Unmatched Payments Awaiting Reconciliation ({unmatchedPayments.length})
                {unmatchedPayments.length > 0 && (
                  <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.2 rounded-full">
                    Action Needed
                  </span>
                )}
              </h3>
              <p className="text-xs text-gray-500">
                Incoming bank or UPI entries not yet matched to specific customer invoices.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {unmatchedPayments.map((pay) => (
              <div
                key={pay.id}
                className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-900">
                      ₹{pay.amount.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded-md border border-amber-200 text-amber-900">
                      Ref: {pay.referenceNumber}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                      {pay.paymentMode}
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-600 mt-1">
                    Customer: {pay.customerName || 'Unknown Counterparty'} | Received on: {pay.paymentDate}
                  </div>
                </div>

                <button
                  onClick={() =>
                    setReconcileModal({
                      isOpen: true,
                      payment: pay,
                      invoiceId: invoices[0]?.id || '',
                      loading: false,
                    })
                  }
                  className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs cursor-pointer shrink-0"
                >
                  <Link2 className="w-3.5 h-3.5 inline mr-1" /> Match to Invoice
                </button>
              </div>
            ))}

            {unmatchedPayments.length === 0 && (
              <div className="text-xs text-emerald-700 bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                All payments for {selectedDate} are reconciled with verified invoice records.
              </div>
            )}
          </div>
        </div>

        {/* Margin Leak & Discrepancies Investigation Card */}
        <div className="bg-white p-5 rounded-2xl border border-purple-100 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900 font-heading flex items-center gap-2">
                Profit Margin Anomaly Investigation ({anomalies.length})
              </h3>
              <p className="text-xs text-gray-500">
                Products selling below target margin (&lt;15%) or with unusually deep discounts.
              </p>
            </div>
            <Link
              href="/agent"
              className="text-purple-600 hover:text-purple-800 text-xs font-semibold"
            >
              Ask AI Agent →
            </Link>
          </div>

          <div className="space-y-2">
            {anomalies.map((anom) => (
              <div
                key={anom.productId}
                className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  anom.severity === 'high'
                    ? 'bg-rose-50/50 border-rose-200'
                    : 'bg-amber-50/50 border-amber-200'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-900">{anom.productName}</span>
                    <span className="text-[10px] font-mono text-gray-500">({anom.sku})</span>
                    <span
                      className={`text-[9px] font-bold px-2 py-0.2 rounded-full uppercase ${
                        anom.severity === 'high' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {anom.severity} anomaly
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-600 mt-1">{anom.explanation}</div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs font-bold text-gray-900">
                    Selling: ₹{anom.sellingPrice} | Cost: ₹{anom.costPrice}
                  </div>
                  <div className="text-[11px] font-bold text-rose-700">
                    Actual Margin: {anom.actualMarginPercent}% (Target: {anom.targetMarginPercent}%)
                  </div>
                </div>
              </div>
            ))}

            {anomalies.length === 0 && (
              <div className="text-xs text-gray-500 text-center py-4">
                No margin anomalies or unusual discounts detected for configured thresholds.
              </div>
            )}
          </div>
        </div>
      </main>

      {/* MODAL: Reconcile Payment to Invoice */}
      {reconcileModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-2xl p-6 shadow-2xl border border-purple-100 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-bold text-gray-900 font-heading">
                Match Payment to Invoice
              </h3>
              <button
                onClick={() => setReconcileModal((prev) => ({ ...prev, isOpen: false }))}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-purple-50 rounded-xl text-purple-900">
                <div>Amount: <span className="font-bold">₹{reconcileModal.payment?.amount}</span></div>
                <div>Ref: <span className="font-mono">{reconcileModal.payment?.referenceNumber}</span></div>
                <div>Counterparty: {reconcileModal.payment?.customerName || 'Customer'}</div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Select Open Invoice to Match</label>
                <select
                  value={reconcileModal.invoiceId}
                  onChange={(e) => setReconcileModal((prev) => ({ ...prev, invoiceId: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-gray-200 bg-white"
                >
                  {invoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} — {inv.customerName} (₹{inv.total}) - Status: {inv.status}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => setReconcileModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleReconcilePayment}
                disabled={reconcileModal.loading || !reconcileModal.invoiceId}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold"
              >
                {reconcileModal.loading ? 'Matching...' : 'Confirm Match'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
