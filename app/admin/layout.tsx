'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  Activity,
  ShieldCheck,
  LogOut,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === '/admin/login';

  const [adminUser, setAdminUser] = useState<any>(null);
  const [loading, setLoading] = useState(!isLoginPage);

  useEffect(() => {
    if (!isLoginPage) {
      checkAdminAuth();
    }
  }, [pathname]);

  const checkAdminAuth = async () => {
    try {
      const res = await fetch('/api/admin/metrics');
      if (res.status === 401 || res.status === 403) {
        window.location.href = '/admin/login';
        return;
      }
      // Also get admin identity from /api/auth/me
      const meRes = await fetch('/api/auth/me');
      const meData = await meRes.json();
      if (meRes.ok && meData.user && meData.user.role === 'platform_admin') {
        setAdminUser(meData.user);
      } else {
        window.location.href = '/admin/login';
      }
    } catch {
      window.location.href = '/admin/login';
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogout = async () => {
    try {
      await fetch('/api/admin/auth/logout', { method: 'POST' });
    } finally {
      router.push('/admin/login');
      router.refresh();
    }
  };

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0518] flex items-center justify-center text-purple-400 font-medium text-sm">
        <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mr-3" />
        Authenticating Platform Administrator...
      </div>
    );
  }

  const navItems = [
    { name: 'Overview', href: '/admin', icon: LayoutDashboard },
    { name: 'Businesses', href: '/admin/businesses', icon: Building2 },
    { name: 'User Directory', href: '/admin/users', icon: Users },
    { name: 'Subscriptions & Quotas', href: '/admin/subscriptions', icon: CreditCard },
    { name: 'System Monitoring', href: '/admin/monitoring', icon: Activity },
    { name: 'Audit Trail', href: '/admin/audit', icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen bg-[#090614] text-gray-200 flex flex-col font-sans selection:bg-purple-600 selection:text-white">
      {/* Top Platform Bar */}
      <header className="h-14 border-b border-white/10 bg-[#0e0920]/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white tracking-tight text-sm font-heading">
              BizFlow AI <span className="text-purple-400 font-semibold">Admin</span>
            </span>
          </Link>
          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold uppercase tracking-wider">
            Platform Operator
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="hidden sm:inline-flex items-center gap-1 text-xs text-purple-300/70 hover:text-white transition-colors"
          >
            <span>Back to App</span>
            <ExternalLink className="w-3 h-3" />
          </Link>

          <div className="h-4 w-px bg-white/10 hidden sm:block" />

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-purple-700/50 border border-purple-500/40 text-purple-200 text-xs font-bold flex items-center justify-center">
              A
            </div>
            <span className="text-xs text-gray-300 font-medium hidden md:inline truncate max-w-[140px]">
              {adminUser?.email || 'admin@bizflow.in'}
            </span>
          </div>

          <button
            onClick={handleAdminLogout}
            title="Sign out of Admin Portal"
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Sidebar */}
        <aside className="w-full md:w-60 border-b md:border-b-0 md:border-r border-white/10 bg-[#0d071e]/70 p-3 shrink-0">
          <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="hidden md:block mt-8 pt-6 border-t border-white/10 px-3">
            <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-2">
              Security Notice
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Every action taken in this platform portal is recorded in the immutable administrative audit trail.
            </p>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
