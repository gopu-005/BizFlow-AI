'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  CheckCircle2,
  AlertCircle,
  Clock,
  X,
} from 'lucide-react';

export default function TeamPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<'business_manager' | 'business_staff'>('business_staff');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchTeam();
  }, []);

  const fetchTeam = async () => {
    try {
      const [authRes, teamRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/business/team'),
      ]);

      const authData = await authRes.json();
      const teamData = await teamRes.json();

      if (authRes.ok && authData.success) {
        setUser(authData.user);
      } else {
        router.push('/login');
        return;
      }

      if (teamRes.ok && teamData.success) {
        setMembers(teamData.members || []);
        setInvitations(teamData.invitations || []);
      }
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteLoading(true);
    setInviteMessage(null);

    try {
      const res = await fetch('/api/business/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          name: inviteName.trim(),
          role: inviteRole,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setInviteMessage({ type: 'success', text: data.message });
        setInviteEmail('');
        setInviteName('');
        fetchTeam();
        setTimeout(() => setShowInviteModal(false), 1500);
      } else {
        setInviteMessage({ type: 'error', text: data.error || 'Failed to send invitation.' });
      }
    } catch {
      setInviteMessage({ type: 'error', text: 'Network connection error.' });
    } finally {
      setInviteLoading(false);
    }
  };

  const canInvite = user?.role === 'business_owner' || user?.role === 'business_manager' || user?.role === 'platform_admin';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-purple-600 font-medium text-sm flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
          Loading team members...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-8 w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-200">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 font-heading">Team & Permissions</h1>
            <p className="text-xs text-gray-500 mt-1">
              Authorized staff accounts, store managers, and role assignments for your business tenant
            </p>
          </div>
          {canInvite && (
            <button
              onClick={() => {
                setInviteMessage(null);
                setShowInviteModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs transition-colors w-fit"
            >
              <UserPlus className="w-4 h-4" />
              <span>Invite Team Member</span>
            </button>
          )}
        </div>

        {/* Active Members Table */}
        <div className="mt-6 bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-600" />
              Active Team Members ({members.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 border-b border-gray-100">
                <tr>
                  <th className="py-3 px-6 font-semibold">User</th>
                  <th className="py-3 px-6 font-semibold">Role</th>
                  <th className="py-3 px-6 font-semibold">Status</th>
                  <th className="py-3 px-6 font-semibold">Joined Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50/50">
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-xs">
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{m.name}</div>
                          <div className="text-[11px] text-gray-400">{m.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-6">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
                        <Shield className="w-3 h-3" />
                        {m.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-6">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                        <CheckCircle2 className="w-3 h-3" />
                        Active
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-gray-400">
                      {m.createdAt ? new Date(m.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending Invitations */}
        {invitations.length > 0 && (
          <div className="mt-6 bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                Pending Invitations ({invitations.length})
              </h2>
            </div>
            <div className="divide-y divide-gray-100 text-xs">
              {invitations.map((inv) => (
                <div key={inv.id} className="p-4 px-6 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">{inv.email}</div>
                    <div className="text-[11px] text-gray-400">
                      Invited as {inv.role.replace('_', ' ')} by {inv.invitedByName}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-semibold border border-amber-200">
                    Pending Acceptance
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Invite Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-purple-600" />
                  Invite Team Member
                </h3>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {inviteMessage && (
                <div
                  className={`mb-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
                    inviteMessage.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  {inviteMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <span>{inviteMessage.text}</span>
                </div>
              )}

              <form onSubmit={handleSendInvite} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Staff Email Address
                  </label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="staff@store.bizflow.in"
                    required
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Full Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="Senthil Kumar"
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Assigned Business Role
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e: any) => setInviteRole(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="business_staff">Business Staff (Invoicing, Smart Entry, Ledger)</option>
                    <option value="business_manager">Business Manager (Operations, Closing & Approvals)</option>
                  </select>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Team members cannot access other business accounts or elevated platform settings.
                  </p>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviteLoading}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50"
                  >
                    {inviteLoading ? 'Sending...' : 'Send Invitation'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
