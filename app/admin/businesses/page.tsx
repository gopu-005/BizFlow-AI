'use client';

import React, { useState, useEffect } from 'react';
import {
  Building2,
  Search,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  X,
  AlertCircle,
  Cpu,
  FileText,
} from 'lucide-react';

export default function AdminBusinessesPage() {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Suspend modal state
  const [selectedBiz, setSelectedBiz] = useState<any>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchBusinesses();
  }, [search, statusFilter]);

  const fetchBusinesses = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/admin/businesses?${params.toString()}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setBusinesses(data.businesses || []);
      }
    } catch (err) {
      console.error('Failed to load businesses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSuspend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBiz || !suspendReason.trim()) return;

    setActionLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/businesses/suspend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: selectedBiz.id,
          reason: suspendReason.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: data.message });
        fetchBusinesses();
        setTimeout(() => {
          setSelectedBiz(null);
          setSuspendReason('');
        }, 1200);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to suspend account.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network connection error.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivate = async (biz: any) => {
    if (!confirm(`Reactivate business account "${biz.name}"?`)) return;

    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/businesses/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: biz.id }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchBusinesses();
      } else {
        alert(data.error || 'Failed to activate business.');
      }
    } catch {
      alert('Network error.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="pb-4 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white font-heading">Business Accounts Directory</h1>
          <p className="text-xs text-gray-400 mt-1">
            Search, inspect subscription state, and manage tenant activation status with audit logging
          </p>
        </div>
        <div className="text-xs text-gray-400">
          Total: <strong className="text-white">{businesses.length}</strong> businesses
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by business name, owner, email, or GSTIN..."
            className="w-full pl-9 pr-3 py-2 bg-[#120b24] border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-[#120b24] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
        >
          <option value="">All Account Statuses</option>
          <option value="active">Active Only</option>
          <option value="suspended">Suspended Only</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-[#120b24] border border-white/10 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 text-gray-400 border-b border-white/10">
              <tr>
                <th className="py-3 px-5 font-semibold">Business & Owner</th>
                <th className="py-3 px-5 font-semibold">Tax & Currency</th>
                <th className="py-3 px-5 font-semibold">AI Quota Used</th>
                <th className="py-3 px-5 font-semibold">Status</th>
                <th className="py-3 px-5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-gray-300">
              {businesses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">
                    No business accounts found matching your query.
                  </td>
                </tr>
              ) : (
                businesses.map((biz) => {
                  const isSuspended = biz.status === 'suspended';
                  return (
                    <tr key={biz.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="font-semibold text-white">{biz.name}</div>
                        <div className="text-[11px] text-gray-400">
                          {biz.ownerName} • {biz.ownerEmail}
                        </div>
                      </td>
                      <td className="py-3.5 px-5 font-mono text-[11px] text-gray-300">
                        <div>GST: {biz.gstNumber || biz.gstin || 'Unregistered'}</div>
                        <div className="text-gray-500">{biz.currency || '₹'} • {biz.type}</div>
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="flex items-center gap-1 text-purple-300">
                            <Cpu className="w-3 h-3" /> {biz.quota?.usedAiRuns ?? 0}/{biz.quota?.maxAiRuns ?? 100}
                          </span>
                          <span className="text-gray-600">•</span>
                          <span className="flex items-center gap-1 text-indigo-300">
                            <FileText className="w-3 h-3" /> {biz.quota?.usedExtractions ?? 0}/{biz.quota?.maxExtractions ?? 50}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-5">
                        {isSuspended ? (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                              <ShieldAlert className="w-3 h-3" /> Suspended
                            </span>
                            {biz.suspendedReason && (
                              <div className="text-[10px] text-amber-400/80 mt-1 max-w-[200px] truncate" title={biz.suspendedReason}>
                                {biz.suspendedReason}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" /> Active
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        {isSuspended ? (
                          <button
                            onClick={() => handleActivate(biz)}
                            disabled={actionLoading}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold transition-colors disabled:opacity-50"
                          >
                            Reactivate
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setMessage(null);
                              setSelectedBiz(biz);
                              setSuspendReason('');
                            }}
                            disabled={actionLoading}
                            className="px-3 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 text-[11px] font-semibold transition-colors disabled:opacity-50"
                          >
                            Suspend
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Suspend Account Modal */}
      {selectedBiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-[#150e2a] border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Suspend Account: {selectedBiz.name}
              </h3>
              <button
                onClick={() => setSelectedBiz(null)}
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

            <form onSubmit={handleSuspend} className="space-y-4">
              <p className="text-xs text-gray-400 leading-relaxed">
                Suspension prevents users of this tenant from signing in or issuing invoices. All financial records and transactions will remain securely preserved in the database.
              </p>

              <div>
                <label className="block text-xs font-semibold text-gray-200 mb-1">
                  Reason for Suspension (Mandatory & Recorded to Audit Log)
                </label>
                <textarea
                  rows={3}
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="e.g., Payment dispute / Violation of terms / Owner requested temporary pause"
                  required
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-hidden focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedBiz(null)}
                  className="px-3.5 py-2 rounded-xl border border-white/10 text-xs font-semibold text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || suspendReason.trim().length < 5}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-xs disabled:opacity-50"
                >
                  {actionLoading ? 'Recording Suspension...' : 'Confirm Account Suspension'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
