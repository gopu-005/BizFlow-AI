'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  ChevronDown,
  CheckCircle2,
  User,
  Settings,
  Users,
  Shield,
  LogOut,
  LogIn,
} from 'lucide-react';
import { Business } from '@/types/erp';

import { useBusiness } from './BusinessProvider';

interface NavbarProps {
  currentBusinessId?: string;
  onBusinessChange?: (bizId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentBusinessId,
  onBusinessChange,
}) => {
  const router = useRouter();
  const {
    currentBusiness,
    businessId: activeBizId,
    setBusinessId,
    accessibleBusinesses,
    currentUser,
    isPlatformAdmin,
  } = useBusiness();

  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (currentBusinessId && currentBusinessId !== activeBizId && isPlatformAdmin) {
      setBusinessId(currentBusinessId);
    }
  }, [currentBusinessId, activeBizId, isPlatformAdmin, setBusinessId]);

  const handleSelectBusiness = (bizId: string) => {
    setBusinessId(bizId);
    setShowDropdown(false);
    if (onBusinessChange) onBusinessChange(bizId);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('bizflow_active_business_id');
      }
      setShowDropdown(false);
      window.location.href = '/login';
    }
  };

  const displayName = currentUser?.name || currentBusiness?.ownerName || 'User';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header className="relative z-30 w-full bg-white/80 backdrop-blur-md border-b border-purple-100/80 shadow-xs transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-4">
        {/* 1. Brand Logo & Name: BizFlow AI */}
        <Link href="/" className="flex items-center gap-2.5 group">
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
              <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                ERP
              </span>
            </div>
            <div className="text-[10px] text-gray-400 font-medium leading-none">
              Conversational ERP
            </div>
          </div>
        </Link>

        {/* Right Controls: All-in-One Plan + Profile Button */}
        <div className="flex items-center gap-2.5">
          {/* 2. All-in-One Plan Button */}
          <Link
            href="/billing"
            className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full bg-purple-50 hover:bg-purple-100 border border-purple-200 text-xs font-semibold text-purple-700 transition-all shadow-xs group"
            title="Subscription & Payments"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600 group-hover:rotate-12 transition-transform" />
            <span className="hidden sm:inline">All-in-One Plan</span>
            <span className="sm:hidden text-xs">Plan</span>
          </Link>

          {/* 3. Profile / Auth Button */}
          {currentUser ? (
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2 p-1.5 pl-2.5 rounded-2xl bg-white border border-purple-100 shadow-xs hover:border-purple-300 transition-all"
                title="Account & Business Profile"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 text-white text-[11px] font-bold flex items-center justify-center shadow-inner">
                  {initial}
                </div>
                <span className="hidden sm:inline text-xs font-semibold text-gray-700 max-w-[120px] truncate">
                  {displayName.split(' ')[0]}
                </span>
                <ChevronDown className="w-3 h-3 text-gray-400 mr-0.5" />
              </button>

              {showDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 z-50 text-xs space-y-1 animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* User Header */}
                  <div className="px-3 py-2 border-b border-gray-100 mb-1">
                    <div className="font-bold text-gray-900 truncate">{currentUser.name}</div>
                    <div className="text-[11px] text-gray-400 truncate">{currentUser.email}</div>
                    <span className="inline-block mt-1 px-2 py-0.2 rounded-full bg-purple-50 text-purple-700 text-[9px] font-bold uppercase tracking-wider border border-purple-200">
                      {currentUser.role?.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {/* Navigation Links */}
                  <Link
                    href="/profile"
                    onClick={() => setShowDropdown(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-gray-700 hover:bg-purple-50 hover:text-purple-900 transition-colors"
                  >
                    <User className="w-4 h-4 text-purple-600" />
                    <span>Account Profile</span>
                  </Link>

                  <Link
                    href="/settings"
                    onClick={() => setShowDropdown(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-gray-700 hover:bg-purple-50 hover:text-purple-900 transition-colors"
                  >
                    <Settings className="w-4 h-4 text-purple-600" />
                    <span>Business Settings</span>
                  </Link>

                  <Link
                    href="/team"
                    onClick={() => setShowDropdown(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-gray-700 hover:bg-purple-50 hover:text-purple-900 transition-colors"
                  >
                    <Users className="w-4 h-4 text-purple-600" />
                    <span>Team & Permissions</span>
                  </Link>

                  {/* Platform Admin Link if authorized */}
                  {currentUser.role === 'platform_admin' && (
                    <Link
                      href="/admin"
                      onClick={() => setShowDropdown(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-900/10 text-purple-900 font-semibold hover:bg-purple-900/20 transition-colors"
                    >
                      <Shield className="w-4 h-4 text-purple-700" />
                      <span>Platform Admin Portal</span>
                    </Link>
                  )}

                  {/* Business Switcher for Multi-Tenant / Admin */}
                  <div className="pt-2 border-t border-gray-100">
                    <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      {accessibleBusinesses.length > 1 ? 'Switch Workspace' : 'Active Workspace'}
                    </div>
                    {accessibleBusinesses.map((biz) => (
                      <button
                        key={biz.id}
                        onClick={() => handleSelectBusiness(biz.id)}
                        disabled={accessibleBusinesses.length <= 1}
                        className={`w-full text-left px-3 py-1.5 rounded-lg flex items-center justify-between transition-colors ${
                          biz.id === activeBizId
                            ? 'bg-purple-50 text-purple-900 font-bold'
                            : 'hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        <div className="truncate max-w-[170px]">
                          <div className="truncate">{biz.name}</div>
                          <div className="text-[10px] text-gray-400 font-normal truncate">{biz.type}</div>
                        </div>
                        {biz.id === activeBizId && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Sign out */}
                  <div className="pt-2 border-t border-gray-100">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 transition-colors font-medium text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full bg-purple-600 hover:bg-purple-700 text-xs font-semibold text-white transition-all shadow-xs"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
