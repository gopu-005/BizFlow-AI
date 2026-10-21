'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  MessageCircle,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  Plus,
  ShieldCheck,
  Search,
  Phone,
  FileText,
  X,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Customer } from '@/types/erp';
import { PaymentCommitment, PaymentRecord } from '@/types/agent';

interface CustomerCreditSummary {
  customer: Customer;
  balance: number;
  overdueDays: number;
  lastPaymentDate?: string;
  aging: {
    current: number;
    days16to30: number;
    days31to60: number;
    daysOver60: number;
  };
  activeCommitment?: PaymentCommitment;
}

import { useBusiness } from '@/components/BusinessProvider';

export default function UdhaarCollectionsPage() {
  const { currentBusiness, businessId: activeBusinessId, setBusinessId: setActiveBusinessId } = useBusiness();
  const [credits, setCredits] = useState<CustomerCreditSummary[]>([]);
  const [commitments, setCommitments] = useState<PaymentCommitment[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [summary, setSummary] = useState<{
    totalOutstanding: number;
    totalOverdue: number;
    customerCount: number;
    agingSummary: { current: number; days16to30: number; days31to60: number; daysOver60: number };
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Modals state
  const [reminderModal, setReminderModal] = useState<{
    isOpen: boolean;
    customer?: Customer;
    reminderData?: any;
    reminderType: 'gentle' | 'due_today' | 'overdue' | 'urgent';
    loading: boolean;
  }>({
    isOpen: false,
    reminderType: 'gentle',
    loading: false,
  });

  const [paymentModal, setPaymentModal] = useState<{
    isOpen: boolean;
    customer?: Customer;
    amount: number;
    paymentMode: 'cash' | 'upi' | 'bank_transfer' | 'cheque';
    referenceNumber: string;
    notes: string;
    loading: boolean;
  }>({
    isOpen: false,
    amount: 0,
    paymentMode: 'upi',
    referenceNumber: '',
    notes: '',
    loading: false,
  });

  const [commitmentModal, setCommitmentModal] = useState<{
    isOpen: boolean;
    customer?: Customer;
    amountPromised: number;
    promisedDate: string;
    notes: string;
    loading: boolean;
  }>({
    isOpen: false,
    amountPromised: 0,
    promisedDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    notes: '',
    loading: false,
  });

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!activeBusinessId) return;
    loadData();
  }, [activeBusinessId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/udhaar?businessId=${activeBusinessId}`);
      const data = await res.json();
      if (data.success) {
        setCredits(data.credits || []);
        setCommitments(data.commitments || []);
        setPayments(data.payments || []);
        setSummary(data.summary || null);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Open WhatsApp reminder modal & generate click-to-chat
  const handleOpenReminder = async (customer: Customer, type: 'gentle' | 'due_today' | 'overdue' | 'urgent' = 'gentle') => {
    setReminderModal({
      isOpen: true,
      customer,
      reminderType: type,
      loading: true,
    });

    try {
      const res = await fetch('/api/udhaar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: activeBusinessId,
          action: 'prepare_reminder',
          payload: {
            customerId: customer.id,
            reminderType: type,
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        setReminderModal((prev) => ({
          ...prev,
          reminderData: data.reminder,
          loading: false,
        }));
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: 'Failed to generate reminder draft' });
      setReminderModal((prev) => ({ ...prev, loading: false }));
    }
  };

  // Submit payment commitment
  const handleSaveCommitment = async () => {
    if (!commitmentModal.customer || commitmentModal.amountPromised <= 0) return;

    setCommitmentModal((prev) => ({ ...prev, loading: true }));
    try {
      const res = await fetch('/api/udhaar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: activeBusinessId,
          action: 'create_commitment',
          payload: {
            customerId: commitmentModal.customer.id,
            customerName: commitmentModal.customer.name,
            customerPhone: commitmentModal.customer.phone,
            amountPromised: commitmentModal.amountPromised,
            promisedDate: commitmentModal.promisedDate,
            notes: commitmentModal.notes,
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: 'success',
          text: `Payment promise of ₹${commitmentModal.amountPromised.toLocaleString('en-IN')} recorded for ${commitmentModal.customer.name}.`,
        });
        setCommitmentModal({ isOpen: false, amountPromised: 0, promisedDate: '', notes: '', loading: false });
        loadData();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to save commitment' });
      setCommitmentModal((prev) => ({ ...prev, loading: false }));
    }
  };

  // Submit verified payment
  const handleRecordPayment = async () => {
    if (!paymentModal.customer || paymentModal.amount <= 0) return;

    setPaymentModal((prev) => ({ ...prev, loading: true }));
    try {
      const res = await fetch('/api/udhaar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: activeBusinessId,
          action: 'record_payment',
          payload: {
            customerId: paymentModal.customer.id,
            amount: paymentModal.amount,
            paymentMode: paymentModal.paymentMode,
            referenceNumber: paymentModal.referenceNumber || `UPI-${Date.now().toString().slice(-6)}`,
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: 'success',
          text: `Verified payment of ₹${paymentModal.amount.toLocaleString('en-IN')} logged. Customer credit deducted transactionally.`,
        });
        setPaymentModal({ isOpen: false, amount: 0, paymentMode: 'upi', referenceNumber: '', notes: '', loading: false });
        loadData();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to record payment' });
      setPaymentModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const filteredCredits = credits.filter(
    (c) =>
      c.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.customer.phone.includes(searchQuery)
  );

  return (
    <div className="min-h-screen bg-[#fbfbfe] text-[#0f172a] flex flex-col justify-between">
      <Navbar currentBusinessId={activeBusinessId} onBusinessChange={(id) => setActiveBusinessId(id)} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-purple-100 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700 font-bold">
                <Users className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-bold font-heading text-gray-900">
                Udhaar & Collection Agent Workspace
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Customer credit ledger, 0–60+ day aging buckets, verified payment logger, and WhatsApp click-to-chat reminders.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              className="p-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition-colors"
              title="Refresh ledger"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <Link
              href="/agent"
              className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-xs"
            >
              Open AI Console
            </Link>
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

        {/* KPI Metrics Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-purple-100 shadow-xs">
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Udhaar</div>
              <div className="text-lg sm:text-xl font-bold text-gray-900 mt-1">
                ₹{summary.totalOutstanding.toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5">{summary.customerCount} customers on credit</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-amber-100 shadow-xs">
              <div className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Overdue Balance</div>
              <div className="text-lg sm:text-xl font-bold text-amber-700 mt-1">
                ₹{summary.totalOverdue.toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5">Needs follow-up action</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-purple-100 shadow-xs">
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Active Promises</div>
              <div className="text-lg sm:text-xl font-bold text-purple-700 mt-1">
                {commitments.filter((c) => c.status === 'pending').length} commitments
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5">Scheduled payments</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-xs">
              <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Recent Collections</div>
              <div className="text-lg sm:text-xl font-bold text-emerald-700 mt-1">
                ₹{payments.reduce((s, p) => s + p.amount, 0).toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5">Verified payments recorded</div>
            </div>
          </div>
        )}

        {/* Aging Buckets Card */}
        {summary && (
          <div className="bg-white p-5 rounded-2xl border border-purple-100 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-gray-900 font-heading">Credit Aging Buckets Breakdown</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200">
                <div className="text-[10px] font-bold text-emerald-800 uppercase">Current (0–15 Days)</div>
                <div className="text-base font-bold text-emerald-900 mt-0.5">
                  ₹{summary.agingSummary.current.toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-emerald-600">Low risk</div>
              </div>

              <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200">
                <div className="text-[10px] font-bold text-blue-800 uppercase">16–30 Days</div>
                <div className="text-base font-bold text-blue-900 mt-0.5">
                  ₹{summary.agingSummary.days16to30.toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-blue-600">Gentle reminder due</div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200">
                <div className="text-[10px] font-bold text-amber-800 uppercase">31–60 Days</div>
                <div className="text-base font-bold text-amber-900 mt-0.5">
                  ₹{summary.agingSummary.days31to60.toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-amber-600">High priority follow-up</div>
              </div>

              <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-200">
                <div className="text-[10px] font-bold text-rose-800 uppercase">Over 60 Days</div>
                <div className="text-base font-bold text-rose-900 mt-0.5">
                  ₹{summary.agingSummary.daysOver60.toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-rose-600">Critical overdue risk</div>
              </div>
            </div>
          </div>
        )}

        {/* Customer Credit Ledger Table */}
        <div className="bg-white p-5 rounded-2xl border border-purple-100 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-gray-900 font-heading">Customer Outstanding Ledgers</h2>
              <p className="text-xs text-gray-500">
                Click any customer to record a payment, schedule a commitment, or prepare a WhatsApp reminder.
              </p>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by customer name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-xs pl-8 pr-3 py-2 rounded-xl border border-gray-200 w-full sm:w-64 focus:outline-purple-600"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Phone</th>
                  <th className="py-2.5 px-3">Balance</th>
                  <th className="py-2.5 px-3">Aging (0-15 / 16-30 / 31-60 / 60+)</th>
                  <th className="py-2.5 px-3">Promise Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCredits.map((item) => (
                  <tr key={item.customer.id} className="hover:bg-purple-50/40 transition-colors">
                    <td className="py-3 px-3 font-bold text-gray-900">
                      <div>{item.customer.name}</div>
                      <div className="text-[10px] text-gray-400 font-normal">{item.customer.id}</div>
                    </td>
                    <td className="py-3 px-3 font-mono text-gray-600">{item.customer.phone}</td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-sm text-gray-900">
                        ₹{item.balance.toLocaleString('en-IN')}
                      </div>
                      {item.overdueDays > 0 ? (
                        <div className="text-[10px] text-rose-600 font-semibold">{item.overdueDays} days overdue</div>
                      ) : (
                        <div className="text-[10px] text-emerald-600 font-semibold">On track</div>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5 text-[10px] font-mono">
                        <span className="text-emerald-700">₹{item.aging.current}</span> /
                        <span className="text-blue-700">₹{item.aging.days16to30}</span> /
                        <span className="text-amber-700">₹{item.aging.days31to60}</span> /
                        <span className="text-rose-700 font-bold">₹{item.aging.daysOver60}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      {item.activeCommitment ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                          Promised: {item.activeCommitment.promisedDate} (₹{item.activeCommitment.amountPromised})
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-400">No active promise</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right space-x-1">
                      <button
                        onClick={() => handleOpenReminder(item.customer, item.overdueDays > 30 ? 'overdue' : 'gentle')}
                        className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold"
                        title="Prepare WhatsApp Click-to-Chat Reminder"
                      >
                        <MessageCircle className="w-3.5 h-3.5 inline mr-1" />
                        WhatsApp
                      </button>

                      <button
                        onClick={() =>
                          setCommitmentModal({
                            isOpen: true,
                            customer: item.customer,
                            amountPromised: item.balance,
                            promisedDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
                            notes: '',
                            loading: false,
                          })
                        }
                        className="p-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-semibold"
                        title="Record Payment Promise Date"
                      >
                        <Calendar className="w-3.5 h-3.5 inline mr-1" />
                        Promise
                      </button>

                      <button
                        onClick={() =>
                          setPaymentModal({
                            isOpen: true,
                            customer: item.customer,
                            amount: item.balance,
                            paymentMode: 'upi',
                            referenceNumber: '',
                            notes: '',
                            loading: false,
                          })
                        }
                        className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-2xs"
                        title="Record Verified Payment"
                      >
                        Record Pay
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment Commitments Tracker Card */}
        <div className="bg-white p-5 rounded-2xl border border-purple-100 shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-gray-900 font-heading">
            Scheduled Payment Commitments ({commitments.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {commitments.map((com) => (
              <div key={com.id} className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-gray-900">{com.customerName}</span>
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      com.status === 'fulfilled'
                        ? 'bg-emerald-100 text-emerald-800'
                        : com.status === 'missed'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}
                  >
                    {com.status.toUpperCase()}
                  </span>
                </div>
                <div className="text-xs text-gray-600">
                  Promised: <span className="font-bold text-gray-900">₹{com.amountPromised.toLocaleString('en-IN')}</span> on{' '}
                  <span className="font-semibold text-purple-700">{com.promisedDate}</span>
                </div>
                {com.notes && <div className="text-[11px] text-gray-500 italic">"{com.notes}"</div>}
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* MODAL 1: WhatsApp Reminder Preview */}
      {reminderModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full rounded-2xl p-6 shadow-2xl border border-purple-100 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                  <MessageCircle className="w-4 h-4" />
                </span>
                <h3 className="text-sm font-bold text-gray-900 font-heading">
                  WhatsApp Reminder Draft (Click-to-Chat)
                </h3>
              </div>
              <button
                onClick={() => setReminderModal({ isOpen: false, reminderType: 'gentle', loading: false })}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Severity Tone Selector */}
            <div className="flex gap-2">
              {(['gentle', 'due_today', 'overdue', 'urgent'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => reminderModal.customer && handleOpenReminder(reminderModal.customer, type)}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border capitalize transition-colors ${
                    reminderModal.reminderType === type
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {type.replace('_', ' ')}
                </button>
              ))}
            </div>

            {reminderModal.loading ? (
              <div className="py-8 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-purple-600" /> Generating personalized draft...
              </div>
            ) : reminderModal.reminderData ? (
              <div className="space-y-3">
                <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 text-xs text-gray-800 font-mono whitespace-pre-wrap">
                  {reminderModal.reminderData.messageText}
                </div>

                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800">
                  <span className="font-bold">Messaging restriction notice:</span> {reminderModal.reminderData.note}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => setReminderModal({ isOpen: false, reminderType: 'gentle', loading: false })}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100"
                  >
                    Close
                  </button>

                  <a
                    href={reminderModal.reminderData.whatsappClickToChatUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open in WhatsApp Web
                  </a>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* MODAL 2: Record Verified Payment */}
      {paymentModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-2xl p-6 shadow-2xl border border-purple-100 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-bold text-gray-900 font-heading">
                Record Verified Payment: {paymentModal.customer?.name}
              </h3>
              <button
                onClick={() => setPaymentModal((prev) => ({ ...prev, isOpen: false }))}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Payment Amount (₹)</label>
                <input
                  type="number"
                  value={paymentModal.amount}
                  onChange={(e) => setPaymentModal((prev) => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                  className="w-full p-2.5 rounded-xl border border-gray-200 font-bold text-sm focus:outline-purple-600"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Payment Mode</label>
                <select
                  value={paymentModal.paymentMode}
                  onChange={(e) => setPaymentModal((prev) => ({ ...prev, paymentMode: e.target.value as any }))}
                  className="w-full p-2.5 rounded-xl border border-gray-200 bg-white"
                >
                  <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
                  <option value="cash">Cash in Hand</option>
                  <option value="bank_transfer">Bank Transfer (NEFT/IMPS)</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Reference / UTR Number</label>
                <input
                  type="text"
                  placeholder="e.g. UPI-98401928"
                  value={paymentModal.referenceNumber}
                  onChange={(e) => setPaymentModal((prev) => ({ ...prev, referenceNumber: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-gray-200"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => setPaymentModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordPayment}
                disabled={paymentModal.loading || paymentModal.amount <= 0}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold"
              >
                {paymentModal.loading ? 'Recording...' : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Schedule Payment Commitment */}
      {commitmentModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-2xl p-6 shadow-2xl border border-purple-100 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-bold text-gray-900 font-heading">
                Schedule Payment Commitment: {commitmentModal.customer?.name}
              </h3>
              <button
                onClick={() => setCommitmentModal((prev) => ({ ...prev, isOpen: false }))}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Promised Amount (₹)</label>
                <input
                  type="number"
                  value={commitmentModal.amountPromised}
                  onChange={(e) => setCommitmentModal((prev) => ({ ...prev, amountPromised: parseFloat(e.target.value) || 0 }))}
                  className="w-full p-2.5 rounded-xl border border-gray-200 font-bold text-sm focus:outline-purple-600"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Promised Date</label>
                <input
                  type="date"
                  value={commitmentModal.promisedDate}
                  onChange={(e) => setCommitmentModal((prev) => ({ ...prev, promisedDate: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-gray-200"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Notes / Call Summary</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Promised to clear after Diwali sales on Friday"
                  value={commitmentModal.notes}
                  onChange={(e) => setCommitmentModal((prev) => ({ ...prev, notes: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-gray-200"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => setCommitmentModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCommitment}
                disabled={commitmentModal.loading || commitmentModal.amountPromised <= 0}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold"
              >
                {commitmentModal.loading ? 'Saving...' : 'Save Commitment'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
