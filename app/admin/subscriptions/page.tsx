'use client';

import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Cpu,
  FileText,
  Sliders,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
} from 'lucide-react';

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Edit limits modal
  const [selectedSub, setSelectedSub] = useState<any>(null);
  const [maxAiRuns, setMaxAiRuns] = useState<number>(100);
  const [maxExtractions, setMaxExtractions] = useState<number>(50);
  const [maxStorageMb, setMaxStorageMb] = useState<number>(500);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      const res = await fetch('/api/admin/subscriptions');
      const data = await res.json();
      if (res.ok && data.success) {
        setSubscriptions(data.subscriptions || []);
        setCatalog(data.planCatalog);
      }
    } catch (err) {
      console.error('Failed to load subscriptions:', err);
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (sub: any) => {
    setMessage(null);
    setSelectedSub(sub);
    setMaxAiRuns(sub.quota?.maxAiRuns || 100);
    setMaxExtractions(sub.quota?.maxExtractions || 50);
    setMaxStorageMb(sub.quota?.maxStorageMb || 500);
  };

  const handleSaveLimits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub) return;

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/subscriptions/limits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: selectedSub.businessId,
          maxAiRuns,
          maxExtractions,
          maxStorageMb,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: data.message });
        fetchSubscriptions();
        setTimeout(() => setSelectedSub(null), 1200);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update quota limits.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network connection error.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="pb-4 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white font-heading">Subscription & Plan Quotas</h1>
          <p className="text-xs text-gray-400 mt-1">
            Manage ₹299/mo plan catalog, track active entitlements, and configure per-tenant AI quotas
          </p>
        </div>
        <div className="text-xs text-gray-400">
          Enrolled Tenants: <strong className="text-white">{subscriptions.length}</strong>
        </div>
      </div>

      {/* Plan Catalog Highlight */}
      <div className="bg-gradient-to-r from-purple-900/30 via-indigo-900/20 to-purple-900/30 border border-purple-500/30 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3 h-3 text-purple-400" /> Current Standard Plan
          </div>
          <h3 className="text-lg font-bold text-white">{catalog?.name || 'BizFlow AI Starter'}</h3>
          <p className="text-xs text-gray-300 mt-0.5 max-w-xl">
            {catalog?.description || 'Agentic Operating System with Smart Entry, Udhaar Collections, and Profit Closing'}
          </p>
        </div>
        <div className="text-right sm:border-l sm:border-white/10 sm:pl-6 shrink-0">
          <div className="text-2xl font-bold text-white font-heading">₹299<span className="text-xs text-purple-300 font-normal"> / month</span></div>
          <div className="text-xs text-purple-300 font-medium">₹2,999 / year (Save 16%)</div>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-[#120b24] border border-white/10 rounded-2xl overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-purple-400" />
            Active Business Subscriptions & Quota Usage
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 text-gray-400 border-b border-white/10">
              <tr>
                <th className="py-3 px-5 font-semibold">Tenant & Client Details</th>
                <th className="py-3 px-5 font-semibold">Plan & Gateway</th>
                <th className="py-3 px-5 font-semibold">AI Runs Quota</th>
                <th className="py-3 px-5 font-semibold">OCR Extractions</th>
                <th className="py-3 px-5 font-semibold">Status</th>
                <th className="py-3 px-5 font-semibold text-right">Quota Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-gray-300">
              {subscriptions.map((sub) => (
                <tr key={sub.businessId} className="hover:bg-white/5 transition-colors">
                  <td className="py-3.5 px-5">
                    <div className="font-semibold text-white">{sub.businessName}</div>
                    <div className="text-[11px] text-purple-300 font-medium">{sub.customerName || 'Business Client'}</div>
                    <div className="text-[10px] text-gray-400 truncate max-w-[220px]">
                      {sub.customerEmail || 'billing@bizflow.in'} {sub.customerPhone ? `• ${sub.customerPhone}` : ''}
                    </div>
                  </td>
                  <td className="py-3.5 px-5">
                    <div className="font-medium text-purple-200">₹{sub.priceMonthly}/mo</div>
                    <div className="text-[10px] text-gray-400 capitalize">{sub.billingCycle} billing</div>
                    <div className="text-[10px] text-indigo-400 font-mono mt-0.5 truncate max-w-[180px]" title={sub.gatewayTransactionRef || 'Razorpay Page'}>
                      Ref: {sub.gatewayTransactionRef || 'rzp_monthly_page'}
                    </div>
                  </td>
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-3.5 h-3.5 text-purple-400" />
                      <span className="font-mono text-white">
                        {sub.quota?.usedAiRuns ?? 0} / {sub.quota?.maxAiRuns ?? 100}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="font-mono text-white">
                        {sub.quota?.usedExtractions ?? 0} / {sub.quota?.maxExtractions ?? 50}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-5">
                    {sub.status === 'under_process' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        <Clock className="w-3 h-3 animate-spin" /> Under Process
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3" /> Active
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    <button
                      onClick={() => openEditModal(sub)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-[11px] font-semibold transition-colors"
                    >
                      <Sliders className="w-3 h-3" />
                      <span>Adjust Quota</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjust Quotas Modal */}
      {selectedSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-[#150e2a] border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-purple-400" />
                Adjust AI Quotas: {selectedSub.businessName}
              </h3>
              <button
                onClick={() => setSelectedSub(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {message && (
              <div
                className={`mb-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
                  message.type === 'success'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-red-500/20 text-red-300 border border-red-500/30'
                }`}
              >
                {message.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                )}
                <span>{message.text}</span>
              </div>
            )}

            <form onSubmit={handleSaveLimits} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-200 mb-1">
                  Monthly Max AI Workflow Runs
                </label>
                <input
                  type="number"
                  min={10}
                  max={10000}
                  value={maxAiRuns}
                  onChange={(e) => setMaxAiRuns(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-200 mb-1">
                  Monthly Max OCR Document Extractions
                </label>
                <input
                  type="number"
                  min={5}
                  max={5000}
                  value={maxExtractions}
                  onChange={(e) => setMaxExtractions(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-200 mb-1">
                  Max Document Storage (MB)
                </label>
                <input
                  type="number"
                  min={50}
                  max={20000}
                  value={maxStorageMb}
                  onChange={(e) => setMaxStorageMb(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500 font-mono"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedSub(null)}
                  className="px-3.5 py-2 rounded-xl border border-white/10 text-xs font-semibold text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-xs disabled:opacity-50"
                >
                  {saving ? 'Updating...' : 'Save Quota Limits'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
