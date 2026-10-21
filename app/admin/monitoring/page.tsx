'use client';

import React, { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Cpu,
  RefreshCw,
  Server,
  Zap,
} from 'lucide-react';

export default function AdminMonitoringPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMonitoring();
  }, []);

  const fetchMonitoring = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/monitoring');
      const json = await res.json();
      if (res.ok && json.success) {
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  const runsByStatus = data?.summary?.runsByStatus || {};
  const runsByAgent = data?.summary?.runsByAgent || {};
  const health = data?.integrationHealth || [];
  const recentRuns = data?.recentRuns || [];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="pb-4 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white font-heading">AI & System Monitoring</h1>
          <p className="text-xs text-gray-400 mt-1">
            Real-time execution telemetry for Smart Entry, Udhaar Collection, and Profit Closing agents
          </p>
        </div>
        <button
          onClick={fetchMonitoring}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-semibold transition-colors w-fit"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {/* Integration Services Health */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {health.map((svc: any) => (
          <div key={svc.service} className="bg-[#120b24] border border-white/10 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-white truncate max-w-[150px]">{svc.service}</span>
              <Server className="w-4 h-4 text-purple-400" />
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  svc.status === 'healthy' || svc.status === 'ready' || svc.status === 'configured'
                    ? 'bg-emerald-400'
                    : 'bg-amber-400'
                }`}
              />
              <span className="text-xs font-bold text-gray-200 capitalize">{svc.status.replace(/_/g, ' ')}</span>
            </div>
            <div className="mt-2 text-[11px] text-gray-500 font-mono">
              Latency: {svc.latencyMs}ms
            </div>
          </div>
        ))}
      </div>

      {/* Execution Distribution Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Runs by Status */}
        <div className="bg-[#120b24] border border-white/10 rounded-2xl p-5 shadow-xs">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-purple-400" />
            Workflow Status Distribution
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 bg-white/5 rounded-xl border border-white/5">
              <div className="text-lg font-bold text-emerald-400">{runsByStatus.completed ?? 0}</div>
              <div className="text-[11px] text-gray-400 mt-1">Completed</div>
            </div>
            <div className="p-3 bg-white/5 rounded-xl border border-white/5">
              <div className="text-lg font-bold text-purple-300">{runsByStatus.executing ?? 0}</div>
              <div className="text-[11px] text-gray-400 mt-1">Executing</div>
            </div>
            <div className="p-3 bg-white/5 rounded-xl border border-white/5">
              <div className="text-lg font-bold text-amber-400">{runsByStatus.awaiting_approval ?? 0}</div>
              <div className="text-[11px] text-gray-400 mt-1">Awaiting</div>
            </div>
            <div className="p-3 bg-white/5 rounded-xl border border-white/5">
              <div className="text-lg font-bold text-red-400">{runsByStatus.failed ?? 0}</div>
              <div className="text-[11px] text-gray-400 mt-1">Failed</div>
            </div>
          </div>
        </div>

        {/* Runs by Agent Type */}
        <div className="bg-[#120b24] border border-white/10 rounded-2xl p-5 shadow-xs">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-indigo-400" />
            Runs by Agent Specialty
          </h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-white/5 rounded-xl border border-white/5">
              <div className="text-lg font-bold text-purple-300">{runsByAgent.smart_entry ?? 0}</div>
              <div className="text-[11px] text-gray-400 mt-1">Smart Entry</div>
            </div>
            <div className="p-3 bg-white/5 rounded-xl border border-white/5">
              <div className="text-lg font-bold text-indigo-300">{runsByAgent.udhaar_collection ?? 0}</div>
              <div className="text-[11px] text-gray-400 mt-1">Udhaar & Credit</div>
            </div>
            <div className="p-3 bg-white/5 rounded-xl border border-white/5">
              <div className="text-lg font-bold text-fuchsia-300">{runsByAgent.daily_closing ?? 0}</div>
              <div className="text-[11px] text-gray-400 mt-1">Daily Closing</div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Agent Execution Telemetry Table */}
      <div className="bg-[#120b24] border border-white/10 rounded-2xl overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-purple-400" />
            Live Agent Runs Log ({recentRuns.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 text-gray-400 border-b border-white/10">
              <tr>
                <th className="py-3 px-5 font-semibold">Agent & Business</th>
                <th className="py-3 px-5 font-semibold">Prompt / Goal</th>
                <th className="py-3 px-5 font-semibold">Autonomy</th>
                <th className="py-3 px-5 font-semibold">Status</th>
                <th className="py-3 px-5 font-semibold">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-gray-300">
              {recentRuns.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">
                    No agent runs recorded in the database yet.
                  </td>
                </tr>
              ) : (
                recentRuns.map((run: any) => (
                  <tr key={run.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="font-semibold text-white capitalize">{run.agentType?.replace('_', ' ')}</div>
                      <div className="text-[11px] text-purple-300">{run.businessName}</div>
                    </td>
                    <td className="py-3.5 px-5 max-w-xs">
                      <div className="truncate text-gray-300" title={run.prompt}>
                        {run.prompt}
                      </div>
                      {run.error && (
                        <div className="text-[10px] text-red-400 mt-0.5 truncate">{run.error}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-5 font-mono text-[11px] text-gray-400">
                      {run.autonomyMode?.replace('_', ' ')}
                    </td>
                    <td className="py-3.5 px-5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          run.status === 'completed'
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : run.status === 'failed'
                            ? 'bg-red-500/15 text-red-300 border border-red-500/30'
                            : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {run.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-gray-400 text-[11px]">
                      {new Date(run.createdAt).toLocaleTimeString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
