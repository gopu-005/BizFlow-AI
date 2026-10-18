'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Mic,
  TrendingUp,
  Package,
  FileText,
  Users,
  BarChart3,
  Database,
  FileSpreadsheet,
  CreditCard,
  ChevronDown,
  CheckCircle2,
  Calendar,
  Sparkles,
  Menu,
  X,
  ArrowLeft,
} from 'lucide-react';
import { Business } from '@/types/erp';

interface NavbarProps {
  currentBusinessId?: string;
  onBusinessChange?: (bizId: string) => void;
}

const NAV_ITEMS = [
  { href: '/', label: 'Assistant', icon: Mic, match: (p: string) => p === '/' },
  { href: '/sales', label: 'Sales', icon: TrendingUp, match: (p: string) => p.startsWith('/sales') },
  { href: '/inventory', label: 'Inventory', icon: Package, match: (p: string) => p.startsWith('/inventory') },
  { href: '/invoices', label: 'Invoices', icon: FileText, match: (p: string) => p.startsWith('/invoices') },
  { href: '/customers', label: 'Customers', icon: Users, match: (p: string) => p.startsWith('/customers') || p.startsWith('/follow-ups') },
  { href: '/reports', label: 'Reports', icon: BarChart3, match: (p: string) => p.startsWith('/reports') },
  { href: '/connectors', label: 'Apps', icon: Database, match: (p: string) => p.startsWith('/connectors') },
  { href: '/import', label: 'Import', icon: FileSpreadsheet, match: (p: string) => p.startsWith('/import') },
];

export const Navbar: React.FC<NavbarProps> = ({
  currentBusinessId = 'biz_karthik_textiles',
  onBusinessChange,
}) => {
  const pathname = usePathname();
  const router = useRouter();

  const [businesses, setBusinesses] = useState<Business[]>([
    {
      id: 'biz_karthik_textiles',
      name: 'Karthik Textiles & Garments',
      type: 'Clothing & Retail',
      currency: '₹',
      ownerName: 'Karthik Ramanathan',
      gstNumber: '33AAAAA0000A1Z5',
      address: '42 Ranganathan Street, T. Nagar, Chennai, Tamil Nadu 600017',
      phone: '+91 98400 11223',
      email: 'karthik@textiles.bizflow.in',
      createdAt: '2024-01-10T10:00:00Z',
    },
    {
      id: 'biz_murugan_bakery',
      name: 'Sri Murugan Bakery & Sweets',
      type: 'Bakery & Food Vendor',
      currency: '₹',
      ownerName: 'Murugan Velayudham',
      gstNumber: '33BBBBB1111B2Z6',
      address: '15 Gandhi Road, Tambaram, Chennai 600045',
      phone: '+91 94441 55667',
      email: 'murugan@bakery.bizflow.in',
      createdAt: '2024-03-01T09:00:00Z',
    },
  ]);

  const [activeBizId, setActiveBizId] = useState(currentBusinessId);
  const [showBusinessSwitcher, setShowBusinessSwitcher] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Sync with localStorage if available
    const saved = localStorage.getItem('bizflow_active_business_id');
    if (saved) {
      setActiveBizId(saved);
      if (onBusinessChange) onBusinessChange(saved);
    }
  }, []);

  const handleSelectBusiness = (bizId: string) => {
    setActiveBizId(bizId);
    setShowBusinessSwitcher(false);
    localStorage.setItem('bizflow_active_business_id', bizId);
    if (onBusinessChange) onBusinessChange(bizId);
  };

  const currentBusiness = businesses.find((b) => b.id === activeBizId) || businesses[0];

  return (
    <header className="relative z-30 w-full bg-white/80 backdrop-blur-md border-b border-purple-100/80 shadow-xs transition-all">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-3">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative w-8 h-8 rounded-full bg-gradient-to-tr from-purple-900 via-purple-600 to-fuchsia-400 p-[2px] shadow-sm transition-transform group-hover:scale-105">
              <div className="w-full h-full rounded-full bg-[#0a0518] flex items-center justify-center overflow-hidden">
                <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 blur-[2px] animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base sm:text-lg font-bold tracking-tight text-gray-900 font-heading">
                  BizFlow AI
                </span>
                <span className="hidden md:inline-block text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                  ERP
                </span>
              </div>
              <div className="text-[10px] text-gray-400 font-medium leading-none hidden sm:block">
                Conversational ERP
              </div>
            </div>
          </Link>

          {/* Back to Assistant link when not on home */}
          {pathname !== '/' && (
            <Link
              href="/"
              className="hidden lg:flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold border border-purple-200 transition-colors ml-2"
              title="Return to main Voice Assistant"
            >
              <Mic className="w-3.5 h-3.5 text-purple-600" />
              <span>Voice Assistant</span>
            </Link>
          )}
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden xl:flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = item.match(pathname);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-sm shadow-purple-500/25'
                    : 'text-gray-600 hover:text-purple-700 hover:bg-purple-50/80'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Controls: Plan Button, Business Switcher, Mobile Toggle */}
        <div className="flex items-center gap-2">
          {/* Plan / Subscription Link */}
          <Link
            href="/billing"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-purple-50 hover:bg-purple-100 border border-purple-200 text-xs font-semibold text-purple-700 transition-all shadow-xs group"
            title="Subscription & Payments"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600 group-hover:rotate-12 transition-transform" />
            <span className="hidden sm:inline">All-in-One Plan</span>
            <span className="sm:hidden text-[11px]">Plan</span>
          </Link>

          {/* Business Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowBusinessSwitcher(!showBusinessSwitcher)}
              className="flex items-center gap-1.5 p-1 pl-2 rounded-2xl bg-white border border-purple-100 shadow-xs hover:border-purple-300 transition-all"
              title="Switch Active Business"
            >
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 text-white text-[11px] font-bold flex items-center justify-center shadow-inner">
                {currentBusiness.ownerName.charAt(0)}
              </div>
              <span className="hidden md:inline text-xs font-semibold text-gray-700 max-w-[110px] truncate">
                {currentBusiness.name.split(' ')[0]}
              </span>
              <ChevronDown className="w-3 h-3 text-gray-400 mr-0.5" />
            </button>

            {showBusinessSwitcher && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 p-2 z-50 text-xs space-y-1">
                <div className="px-2 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Active Business
                </div>
                {businesses.map((biz) => (
                  <button
                    key={biz.id}
                    onClick={() => handleSelectBusiness(biz.id)}
                    className={`w-full text-left p-2 rounded-lg flex items-center justify-between transition-colors ${
                      biz.id === activeBizId
                        ? 'bg-purple-50 text-purple-900 font-bold'
                        : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div>
                      <div>{biz.name}</div>
                      <div className="text-[10px] text-gray-400 font-normal">{biz.type}</div>
                    </div>
                    {biz.id === activeBizId && (
                      <CheckCircle2 className="w-4 h-4 text-purple-600" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden p-1.5 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors"
            title="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer / Dropdown Navigation Menu */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-t border-purple-100 bg-white/95 backdrop-blur-xl px-4 py-3 shadow-lg animate-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {NAV_ITEMS.map((item) => {
              const isActive = item.match(pathname);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-gray-700 hover:bg-purple-50'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
};
