'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Shield,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  UserCheck,
  UserX,
} from 'lucide-react';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [search, roleFilter]);

  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (roleFilter) params.set('role', roleFilter);

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (user: any) => {
    const nextStatus = user.status === 'active' ? 'suspended' : 'active';
    const actionText = nextStatus === 'suspended' ? 'deactivate and revoke active sessions for' : 'reactivate';

    if (!confirm(`Are you sure you want to ${actionText} user "${user.name}" (${user.email})?`)) return;

    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/users/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          status: nextStatus,
          reason: `Admin manual status toggle to ${nextStatus}`,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        fetchUsers();
      } else {
        alert(data.error || 'Failed to update user status.');
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
          <h1 className="text-xl font-bold text-white font-heading">User Directory & IAM</h1>
          <p className="text-xs text-gray-400 mt-1">
            Global identity directory across all tenants with account status controls and session revocation
          </p>
        </div>
        <div className="text-xs text-gray-400">
          Total Users: <strong className="text-white">{users.length}</strong>
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
            placeholder="Search by user name, email, or phone..."
            className="w-full pl-9 pr-3 py-2 bg-[#120b24] border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="bg-[#120b24] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
        >
          <option value="">All Roles</option>
          <option value="platform_admin">Platform Administrator</option>
          <option value="business_owner">Business Owner</option>
          <option value="business_manager">Business Manager</option>
          <option value="business_staff">Business Staff</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-[#120b24] border border-white/10 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 text-gray-400 border-b border-white/10">
              <tr>
                <th className="py-3 px-5 font-semibold">User Details</th>
                <th className="py-3 px-5 font-semibold">Tenant Association</th>
                <th className="py-3 px-5 font-semibold">Assigned Role</th>
                <th className="py-3 px-5 font-semibold">Account Status</th>
                <th className="py-3 px-5 font-semibold">Last Login</th>
                <th className="py-3 px-5 font-semibold text-right">Access Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-gray-300">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    No users found matching your search criteria.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isSuspended = u.status === 'suspended';
                  const isPrimaryAdmin = u.email === 'admin@bizflow.in';
                  return (
                    <tr key={u.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="font-semibold text-white">{u.name}</div>
                        <div className="text-[11px] text-gray-400">{u.email}</div>
                      </td>
                      <td className="py-3.5 px-5">
                        <span className="font-medium text-purple-300">{u.businessName}</span>
                      </td>
                      <td className="py-3.5 px-5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            u.role === 'platform_admin'
                              ? 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40'
                              : 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                          }`}
                        >
                          <Shield className="w-3 h-3" />
                          {u.role.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-5">
                        {isSuspended ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-md border border-amber-500/30">
                            <ShieldAlert className="w-3 h-3" /> Deactivated
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-md border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" /> Active
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-gray-400 text-[11px]">
                        {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never logged in'}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        {isPrimaryAdmin ? (
                          <span className="text-[10px] text-gray-500 italic">Root Administrator</span>
                        ) : (
                          <button
                            onClick={() => handleToggleStatus(u)}
                            disabled={actionLoading}
                            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors disabled:opacity-50 ${
                              isSuspended
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                : 'bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30'
                            }`}
                          >
                            {isSuspended ? (
                              <>
                                <UserCheck className="w-3 h-3" /> Activate
                              </>
                            ) : (
                              <>
                                <UserX className="w-3 h-3" /> Deactivate
                              </>
                            )}
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
    </div>
  );
}
