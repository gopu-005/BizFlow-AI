'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  TrendingUp,
  Package,
  FileText,
  Users,
  Mail,
  MessageCircle,
  Database,
  FileSpreadsheet,
  X,
  Sparkles,
  FileCheck,
  House,
  Lock,
  LucideIcon,
} from 'lucide-react';
import { useBusiness } from './BusinessProvider';

/** Pages where the floating drawers should NOT appear (auth screens & admin portal). */
const HIDDEN_PREFIXES = ['/login', '/register', '/forgot-password', '/reset-password', '/admin'];

interface DrawerItem {
  id: string;
  label: string;
  hint: string;
  route: string;
  icon: LucideIcon;
  /** Requires a logged-in session (Agentic OS feature) */
  agentic?: boolean;
  /** Tailwind classes — kept as full literals so JIT picks them up */
  hoverBg: string;
  iconIdle: string;
  iconHover: string;
  activeRing: string;
}

const OPERATIONS_ITEMS: DrawerItem[] = [
  {
    id: 'drawer-nav-udhaar',
    label: 'Customer Credit & Udhaar',
    hint: 'Aging buckets & WhatsApp reminders',
    route: '/udhaar',
    icon: Users,
    agentic: true,
    hoverBg: 'hover:bg-indigo-50/80',
    iconIdle: 'bg-indigo-100 text-indigo-700',
    iconHover: 'group-hover:bg-indigo-600 group-hover:text-white',
    activeRing: 'bg-indigo-50 border-indigo-200',
  },
  {
    id: 'drawer-nav-closing',
    label: 'Daily Closing & Profit Leaks',
    hint: 'Reconciliation & margin audit',
    route: '/closing',
    icon: FileCheck,
    agentic: true,
    hoverBg: 'hover:bg-emerald-50/80',
    iconIdle: 'bg-emerald-100 text-emerald-700',
    iconHover: 'group-hover:bg-emerald-600 group-hover:text-white',
    activeRing: 'bg-emerald-50 border-emerald-200',
  },
];

const ERP_ITEMS: DrawerItem[] = [
  {
    id: 'drawer-nav-invoices',
    label: 'Invoices & Billing',
    hint: 'GST tax bills & PDF export',
    route: '/invoices?action=create',
    icon: FileText,
    hoverBg: 'hover:bg-blue-50/80',
    iconIdle: 'bg-blue-100 text-blue-700',
    iconHover: 'group-hover:bg-blue-600 group-hover:text-white',
    activeRing: 'bg-blue-50 border-blue-200',
  },
  {
    id: 'drawer-nav-inventory',
    label: 'Inventory & Stock',
    hint: 'Stock thresholds & restock',
    route: '/inventory',
    icon: Package,
    hoverBg: 'hover:bg-amber-50/80',
    iconIdle: 'bg-amber-100 text-amber-700',
    iconHover: 'group-hover:bg-amber-600 group-hover:text-white',
    activeRing: 'bg-amber-50 border-amber-200',
  },
  {
    id: 'drawer-nav-sales',
    label: 'Sales Dashboard',
    hint: 'Revenue & cash flow history',
    route: '/sales',
    icon: TrendingUp,
    hoverBg: 'hover:bg-purple-50/80',
    iconIdle: 'bg-purple-100 text-purple-700',
    iconHover: 'group-hover:bg-purple-600 group-hover:text-white',
    activeRing: 'bg-purple-50 border-purple-200',
  },
  {
    id: 'drawer-nav-import',
    label: 'Data & Ledger Import',
    hint: 'Excel & Photo OCR ingestion',
    route: '/import',
    icon: FileSpreadsheet,
    hoverBg: 'hover:bg-emerald-50/80',
    iconIdle: 'bg-emerald-100 text-emerald-700',
    iconHover: 'group-hover:bg-emerald-600 group-hover:text-white',
    activeRing: 'bg-emerald-50 border-emerald-200',
  },
];

const routePath = (route: string) => route.split('?')[0];

export const NavigationDrawers: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname() || '/';
  const { businessId, isAuthenticated, isLoading } = useBusiness();

  const [isLeftOpen, setIsLeftOpen] = useState(false);
  const [isRightOpen, setIsRightOpen] = useState(false);

  // Live badges
  const [overdueTotal, setOverdueTotal] = useState(0);
  const [unmatchedCount, setUnmatchedCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);

  const hidden = HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  const loadBadges = useCallback(async () => {
    if (!businessId || isLoading) return;
    try {
      const invRes = await fetch(`/api/erp/inventory?businessId=${businessId}&filter=low_stock`);
      const invData = await invRes.json();
      setLowStockCount(invData.products ? invData.products.length : 0);

      // Agentic badges are only fetched for signed-in users (APIs reject guests)
      if (isAuthenticated) {
        const [udhaarRes, closingRes] = await Promise.all([
          fetch(`/api/udhaar?businessId=${businessId}`),
          fetch(`/api/closing?businessId=${businessId}`),
        ]);
        const udhaarData = await udhaarRes.json();
        const closingData = await closingRes.json();
        setOverdueTotal(udhaarData.summary?.totalOverdue || 0);
        setUnmatchedCount(
          Array.isArray(closingData.payments) ? closingData.payments.filter((p: any) => !p.matched).length : 0
        );
      } else {
        setOverdueTotal(0);
        setUnmatchedCount(0);
      }
    } catch (e) {
      console.error('Failed to load navigation badges:', e);
    }
  }, [businessId, isAuthenticated, isLoading]);

  // Refresh badges when the tenant/session changes and whenever the Operations drawer opens
  useEffect(() => {
    if (hidden) return;
    loadBadges();
  }, [loadBadges, hidden]);

  useEffect(() => {
    if (isLeftOpen) loadBadges();
  }, [isLeftOpen, loadBadges]);

  // Close drawers on route change and on Escape
  useEffect(() => {
    setIsLeftOpen(false);
    setIsRightOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsLeftOpen(false);
        setIsRightOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (hidden) return null;

  const navigateTo = (path: string) => {
    setIsLeftOpen(false);
    setIsRightOpen(false);
    router.push(path);
  };

  const isActive = (route: string) => {
    const p = routePath(route);
    return p === '/' ? pathname === '/' || pathname === '/app' : pathname === p || pathname.startsWith(`${p}/`);
  };

  const showLock = (item: { agentic?: boolean }) => item.agentic && !isAuthenticated && !isLoading;

  const renderBadge = (item: DrawerItem) => {
    if (showLock(item)) return null;
    if (item.route === '/udhaar' && overdueTotal > 0) {
      return (
        <span className="bg-rose-100 text-rose-800 text-[9px] px-1.5 rounded-full font-bold">
          ₹{Math.round(overdueTotal / 1000)}k
        </span>
      );
    }
    if (item.route === '/closing' && unmatchedCount > 0) {
      return (
        <span className="bg-amber-100 text-amber-800 text-[9px] px-1.5 rounded-full font-bold">
          {unmatchedCount} unrec
        </span>
      );
    }
    if (item.route === '/inventory' && lowStockCount > 0) {
      return (
        <span className="bg-amber-100 text-amber-800 text-[9px] px-1.5 rounded-full font-bold">{lowStockCount}</span>
      );
    }
    return null;
  };

  const renderItem = (item: DrawerItem) => {
    const active = isActive(item.route);
    const Icon = item.icon;
    return (
      <button
        key={item.id}
        id={item.id}
        onClick={() => navigateTo(item.route)}
        aria-current={active ? 'page' : undefined}
        className={`w-full text-left p-2.5 rounded-2xl flex items-center gap-3 transition-colors group cursor-pointer border ${
          active ? item.activeRing : `border-transparent ${item.hoverBg}`
        }`}
      >
        <div
          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${item.iconIdle} ${item.iconHover}`}
        >
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
            <span className="truncate">{item.label}</span>
            {renderBadge(item)}
            {showLock(item) && <Lock className="w-3 h-3 text-gray-400 shrink-0" aria-label="Sign in required" />}
          </div>
          <div className="text-[11px] text-gray-500 truncate">{item.hint}</div>
        </div>
        {active && <span className="w-1.5 h-1.5 rounded-full bg-purple-600 shrink-0" />}
      </button>
    );
  };

  const homeActive = isActive('/');
  const agentActive = isActive('/agent');

  return (
    <>
      {/* FLOATING EDGE TABS (Side Triggers for Drawers) */}
      <button
        id="drawer-trigger-operations"
        onClick={() => setIsLeftOpen(true)}
        className="fixed left-0 top-1/2 -translate-y-1/2 z-30 bg-white/95 hover:bg-purple-50 backdrop-blur-md border border-l-0 border-purple-200/90 rounded-r-2xl py-3 px-1.5 shadow-md text-purple-700 hover:text-purple-900 transition-all flex flex-col items-center gap-1.5 group hover:pl-2.5 cursor-pointer"
        title="Quick Business Pages & Agent Workspaces"
        aria-label="Open Operations navigation"
      >
        <TrendingUp className="w-3.5 h-3.5 text-purple-600 group-hover:scale-110 transition-transform" />
        <span className="text-[9px] font-bold tracking-wider [writing-mode:vertical-rl] rotate-180 text-gray-500 group-hover:text-purple-700">
          OPERATIONS
        </span>
      </button>

      <button
        id="drawer-trigger-connectors"
        onClick={() => setIsRightOpen(true)}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-30 bg-white/95 hover:bg-purple-50 backdrop-blur-md border border-r-0 border-purple-200/90 rounded-l-2xl py-3 px-1.5 shadow-md text-indigo-700 hover:text-indigo-900 transition-all flex flex-col items-center gap-1.5 group hover:pr-2.5 cursor-pointer"
        title="Integrations & Apps Status"
        aria-label="Open Connectors panel"
      >
        <Database className="w-3.5 h-3.5 text-indigo-600 group-hover:scale-110 transition-transform" />
        <span className="text-[9px] font-bold tracking-wider [writing-mode:vertical-rl] text-gray-500 group-hover:text-indigo-700">
          CONNECTORS
        </span>
      </button>

      {/* LEFT SLIDE-OUT DRAWER — Agentic OS Destinations */}
      {isLeftOpen && (
        <div
          onClick={() => setIsLeftOpen(false)}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity"
        />
      )}

      <aside
        aria-hidden={!isLeftOpen}
        className={`fixed top-0 left-0 h-full w-[21rem] max-w-[85vw] bg-white/95 backdrop-blur-2xl z-50 shadow-2xl border-r border-purple-100 transform transition-transform duration-300 ease-in-out p-5 flex flex-col justify-between overflow-y-auto ${
          isLeftOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 font-heading">Agentic OS Destinations</h3>
                <p className="text-[11px] text-gray-500">Autonomous &amp; Guided Workflows</p>
              </div>
            </div>
            <button
              onClick={() => setIsLeftOpen(false)}
              className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors"
              title="Close drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1">
            {/* Home / Command Center */}
            <button
              id="drawer-nav-home"
              onClick={() => navigateTo('/')}
              aria-current={homeActive ? 'page' : undefined}
              className={`w-full text-left p-2.5 rounded-2xl flex items-center gap-3 transition-colors group cursor-pointer border ${
                homeActive ? 'bg-slate-50 border-slate-200' : 'border-transparent hover:bg-slate-50'
              }`}
            >
              <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 group-hover:bg-slate-800 group-hover:text-white transition-colors">
                <House className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="text-xs font-bold text-gray-900">Home · Command Center</div>
                <div className="text-[11px] text-gray-500">Voice assistant &amp; attention items</div>
              </div>
              {homeActive && <span className="w-1.5 h-1.5 rounded-full bg-purple-600 shrink-0" />}
            </button>

            {/* AGENT 1: Unified Agent Workspace */}
            <button
              id="drawer-nav-agent"
              onClick={() => navigateTo('/agent')}
              aria-current={agentActive ? 'page' : undefined}
              className={`w-full text-left p-2.5 rounded-2xl flex items-center gap-3 transition-colors group cursor-pointer border ${
                agentActive ? 'bg-purple-100 border-purple-300' : 'bg-purple-50/70 hover:bg-purple-100 border-purple-200'
              }`}
            >
              <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                  AI Agent Workspace
                  <span className="bg-purple-200 text-purple-800 text-[9px] px-1.5 rounded-full font-bold">OS</span>
                  {showLock({ agentic: true }) && (
                    <Lock className="w-3 h-3 text-purple-400" aria-label="Sign in required" />
                  )}
                </div>
                <div className="text-[11px] text-purple-700">Multi-step console &amp; approvals</div>
              </div>
              {agentActive && <span className="w-1.5 h-1.5 rounded-full bg-purple-600 shrink-0" />}
            </button>

            {/* AGENTS 2 & 3: Udhaar, Daily Closing */}
            {OPERATIONS_ITEMS.map(renderItem)}

            <div className="py-2">
              <div className="h-[1px] bg-gray-100" />
            </div>

            {/* Core ERP pages */}
            {ERP_ITEMS.map(renderItem)}
          </div>

          {!isAuthenticated && !isLoading && (
            <div className="mt-4 p-3 rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 text-[11px] text-purple-900 flex items-start gap-2">
              <Lock className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-px" />
              <span>
                Agentic workspaces require an account.{' '}
                <button
                  onClick={() => navigateTo(`/login?next=${encodeURIComponent(pathname)}`)}
                  className="font-bold underline hover:text-purple-700"
                >
                  Sign in
                </button>{' '}
                to unlock them.
              </span>
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-purple-100 text-purple-700 text-xs font-semibold flex items-center justify-between">
          <span>₹299/mo Starter Plan</span>
          <button onClick={() => navigateTo('/billing')} className="font-bold underline hover:text-purple-900">
            Usage Meter →
          </button>
        </div>
      </aside>

      {/* RIGHT SLIDE-OUT DRAWER — Truthful Connected Apps Status */}
      {isRightOpen && (
        <div
          onClick={() => setIsRightOpen(false)}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity"
        />
      )}

      <aside
        aria-hidden={!isRightOpen}
        className={`fixed top-0 right-0 h-full w-[21rem] max-w-[85vw] bg-white/95 backdrop-blur-2xl z-50 shadow-2xl border-l border-purple-100 transform transition-transform duration-300 ease-in-out p-5 flex flex-col justify-between overflow-y-auto ${
          isRightOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 font-heading">Integration Status</h3>
                <span className="flex items-center gap-1.5 text-[10px] font-semibold text-amber-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  1 Connected • Credentials Required
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsRightOpen(false)}
              className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors"
              title="Close drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2">
            {/* Database (PostgreSQL) - Genuinely Connected */}
            <button
              id="drawer-connector-database"
              onClick={() => navigateTo('/connectors')}
              className="w-full text-left p-2.5 rounded-2xl hover:bg-gray-50 flex items-center justify-between transition-colors border border-transparent hover:border-gray-200 cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-900">Database (PostgreSQL)</div>
                  <div className="text-[11px] text-emerald-600 font-medium">Connected &amp; Isolated</div>
                </div>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </button>

            {/* Excel / Photo OCR - Smart Entry Agent (members only) */}
            <button
              id="drawer-connector-ocr"
              onClick={() => navigateTo('/agent?tab=entry')}
              className="w-full text-left p-2.5 rounded-2xl hover:bg-gray-50 flex items-center justify-between transition-colors border border-transparent hover:border-gray-200 cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                    Smart Document OCR
                    {showLock({ agentic: true }) && <Lock className="w-3 h-3 text-gray-400" />}
                  </div>
                  <div className="text-[11px] text-emerald-600 font-medium">
                    {showLock({ agentic: true }) ? 'Sign in to upload' : 'Ready for Upload'}
                  </div>
                </div>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </button>

            {/* WhatsApp Business - Truthful Status */}
            <button
              id="drawer-connector-whatsapp"
              onClick={() => navigateTo('/connectors')}
              className="w-full text-left p-2.5 rounded-2xl hover:bg-gray-50 flex items-center justify-between transition-colors border border-transparent hover:border-gray-200 cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-900">WhatsApp Messaging</div>
                  <div className="text-[10px] text-amber-600 font-medium">Click-to-chat active • API Setup Req</div>
                </div>
              </div>
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            </button>

            {/* Email (Gmail) - Truthful Status */}
            <button
              id="drawer-connector-email"
              onClick={() => navigateTo('/connectors')}
              className="w-full text-left p-2.5 rounded-2xl hover:bg-gray-50 flex items-center justify-between transition-colors border border-transparent hover:border-gray-200 cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-900">Email (Gmail API)</div>
                  <div className="text-[10px] text-gray-400 font-medium">Credentials Setup Required</div>
                </div>
              </div>
              <span className="w-2 h-2 rounded-full bg-rose-500" />
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
          <span>Truthful integration status</span>
          <button
            onClick={() => navigateTo('/connectors')}
            className="font-bold text-purple-700 hover:text-purple-900 transition-colors cursor-pointer"
          >
            Configure →
          </button>
        </div>
      </aside>
    </>
  );
};
