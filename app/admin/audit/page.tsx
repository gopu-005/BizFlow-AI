'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Search,
  Clock,
  User,
  Activity,
  FileCode,
} from 'lucide-react';

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/admin/audit-logs?limit=200');
      const data = await res.json();
      if (res.ok && data.success) {
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      !search ||
      log.adminEmail?.toLowerCase().includes(search.toLowerCase()) ||
      log.action?.toLowerCase().includes(search.toLowerCase()) ||
      log.targetId?.toLowerCase().includes(search.toLowerCase()) ||
      JSON.stringify(log.details || {}).toLowerCase().includes(search.toLowerCase());

    const matchesAction = !actionFilter || log.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="pb-4 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white font-heading">Administrative Audit Trail</h1>
          <p className="text-xs text-gray-400 mt-1">
            Tamper-evident, immutable event log of all administrative interventions, suspensions, role adjustments, and access events
          </p>
        </div>
        <div className="text-xs text-gray-400">
          Records Logged: <strong className="text-white">{filteredLogs.length}</strong>
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
            placeholder="Search by administrator email, target ID, action, or details..."
            className="w-full pl-9 pr-3 py-2 bg-[#120b24] border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="bg-[#120b24] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
        >
          <option value="">All Action Types</option>
          <option value="admin_login">Admin Login</option>
          <option value="admin_logout">Admin Logout</option>
          <option value="suspend_business">Suspend Business</option>
          <option value="activate_business">Activate Business</option>
          <option value="deactivate_user">Deactivate User</option>
          <option value="activate_user">Activate User</option>
          <option value="update_subscription_limits">Update Quota Limits</option>
          <option value="provision_admin">Provision Admin</option>
        </select>
      </div>

      {/* Audit Trail List */}
      <div className="bg-[#120b24] border border-white/10 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 text-gray-400 border-b border-white/10">
              <tr>
                <th className="py-3 px-5 font-semibold">Timestamp</th>
                <th className="py-3 px-5 font-semibold">Acting Administrator</th>
                <th className="py-3 px-5 font-semibold">Action</th>
                <th className="py-3 px-5 font-semibold">Target Entity</th>
                <th className="py-3 px-5 font-semibold">Event Context & Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-gray-300">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">
                    No administrative audit logs match your filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3.5 px-5 font-mono text-[11px] text-gray-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="font-semibold text-white">{log.adminEmail}</div>
                      <div className="text-[10px] text-gray-500 font-mono">{log.adminUserId}</div>
                    </td>
                    <td className="py-3.5 px-5 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30 font-mono">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 whitespace-nowrap">
                      <div className="capitalize font-semibold text-gray-300">{log.targetEntity}</div>
                      {log.targetId && (
                        <div className="text-[10px] text-gray-500 font-mono">{log.targetId}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-5">
                      {log.details ? (
                        <pre className="text-[11px] font-mono bg-black/30 p-2 rounded-lg border border-white/5 text-gray-300 max-w-md overflow-x-auto whitespace-pre-wrap">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      ) : (
                        <span className="text-gray-500 text-[11px]">No extra payload</span>
                      )}
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
