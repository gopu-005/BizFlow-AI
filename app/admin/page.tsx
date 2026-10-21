'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Building2,
  Users,
  CreditCard,
  Cpu,
  FileCheck,
  AlertTriangle,
  Activity,
  ArrowUpRight,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Clock,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const [metRes, logsRes] = await Promise.all([
        fetch('/api/admin/metrics'),
        fetch('/api/admin/audit-logs?limit=5'),
      ]);

      const metData = await metRes.json();
      const logsData = await logsRes.json();

      if (metRes.ok && metData.success) {
        setMetrics(metData.metrics);
      }
      if (logsRes.ok && logsData.success) {
        setRecentLogs(logsData.logs || []);
      }
    } catch (err) {
      console.error('Failed to load admin metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex items-center justify-center text-purple-400 text-xs">
        <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mr-3" />
        Loading real-time platform telemetry...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-xl font-bold text-white font-heading">Platform SaaS Overview</h1>
          <p className="text-xs text-gray-400 mt-1">
            Real-time multi-tenant telemetry, subscription health, and AI operating metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            System Live & Enforcing RBAC
          </span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Businesses */}
        <div className="bg-[#120b24] border border-white/10 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-gray-400 text-xs mb-2 font-medium">
            <span>Total Businesses</span>
            <Building2 className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white font-heading">
            {metrics?.totalBusinesses ?? 0}
          </div>
          <div className="mt-2 flex items-center gap-2 text-[11px]">
            <span className="text-emerald-400 font-semibold">{metrics?.activeBusinesses ?? 0} Active</span>
            <span className="text-gray-500">•</span>
            <span className="text-amber-400 font-semibold">{metrics?.suspendedBusinesses ?? 0} Suspended</span>
          </div>
        </div>

        {/* Card 2: Registered Users */}
        <div className="bg-[#120b24] border border-white/10 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-gray-400 text-xs mb-2 font-medium">
            <span>Registered Users</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white font-heading">
            {metrics?.totalUsers ?? 0}
          </div>
          <div className="mt-2 text-[11px] text-gray-400">
            {metrics?.activeUsers ?? 0} active tenant accounts
          </div>
        </div>

        {/* Card 3: Platform MRR */}
        <div className="bg-[#120b24] border border-white/10 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-gray-400 text-xs mb-2 font-medium">
            <span>Platform MRR</span>
            <CreditCard className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white font-heading">
            ₹{metrics?.mrr?.toLocaleString() ?? 0}
          </div>
          <div className="mt-2 text-[11px] text-emerald-400/90 font-medium">
            {metrics?.paidSubscriptionsCount ?? 0} paid ₹299/mo subscriptions
          </div>
        </div>

        {/* Card 4: AI Workflow Volume */}
        <div className="bg-[#120b24] border border-white/10 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-gray-400 text-xs mb-2 font-medium">
            <span>AI Executions</span>
            <Cpu className="w-4 h-4 text-fuchsia-400" />
          </div>
          <div className="text-2xl font-bold text-white font-heading">
            {metrics?.aiWorkflowRunsTotal ?? 0}
          </div>
          <div className="mt-2 flex items-center gap-2 text-[11px]">
            <span className="text-purple-300">{metrics?.documentExtractionsTotal ?? 0} OCR docs</span>
            <span className="text-gray-500">•</span>
            <span className={metrics?.failedAgentRunsCount > 0 ? 'text-red-400' : 'text-gray-400'}>
              {metrics?.failedAgentRunsCount ?? 0} failed
            </span>
          </div>
        </div>
      </div>

      {/* Quick Access Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/admin/businesses"
          className="p-4 bg-[#120b24] border border-white/10 hover:border-purple-500/50 rounded-2xl flex items-center justify-between group transition-all"
        >
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-purple-400" />
              Manage Businesses
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Search tenants, activate or suspend with recorded reasons
            </p>
          </div>
          <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-purple-300 transition-colors" />
        </Link>

        <Link
          href="/admin/subscriptions"
          className="p-4 bg-[#120b24] border border-white/10 hover:border-purple-500/50 rounded-2xl flex items-center justify-between group transition-all"
        >
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-indigo-400" />
              Plan & Quotas
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Configure ₹299/mo plan limits and adjust tenant quotas
            </p>
          </div>
          <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-purple-300 transition-colors" />
        </Link>

        <Link
          href="/admin/monitoring"
          className="p-4 bg-[#120b24] border border-white/10 hover:border-purple-500/50 rounded-2xl flex items-center justify-between group transition-all"
        >
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-fuchsia-400" />
              Live Agent Telemetry
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Inspect Smart Entry, Udhaar, and Daily Closing execution logs
            </p>
          </div>
          <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-purple-300 transition-colors" />
        </Link>
      </div>

      {/* Recent Audit Log Snapshot */}
      <div className="bg-[#120b24] border border-white/10 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-purple-400" />
            Recent Administrative Audit Trail
          </h2>
          <Link href="/admin/audit" className="text-xs text-purple-400 hover:text-purple-300 font-semibold">
            View Complete Trail →
          </Link>
        </div>

        {recentLogs.length === 0 ? (
          <p className="text-xs text-gray-500 py-3">No administrative audit records logged yet.</p>
        ) : (
          <div className="space-y-2">
            {recentLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 bg-white/5 rounded-xl border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-purple-400" />
                  <div>
                    <span className="font-semibold text-purple-200 capitalize">
                      {log.action?.replace(/_/g, ' ')}
                    </span>
                    <span className="text-gray-400 ml-2">by {log.adminEmail}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-gray-400 text-[11px]">
                  <span className="font-mono bg-white/5 px-2 py-0.5 rounded text-gray-300">
                    {log.targetEntity}: {log.targetId || 'global'}
                  </span>
                  <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
