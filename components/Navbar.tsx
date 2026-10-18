'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  ChevronDown,
  CheckCircle2,
} from 'lucide-react';
import { Business } from '@/types/erp';

interface NavbarProps {
  currentBusinessId?: string;
  onBusinessChange?: (bizId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentBusinessId = 'biz_karthik_textiles',
  onBusinessChange,
}) => {
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

  useEffect(() => {
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

          {/* 3. Profile / Business Switcher Button */}
          <div className="relative">
            <button
              onClick={() => setShowBusinessSwitcher(!showBusinessSwitcher)}
              className="flex items-center gap-2 p-1.5 pl-2.5 rounded-2xl bg-white border border-purple-100 shadow-xs hover:border-purple-300 transition-all"
              title="Business Profile & Switcher"
            >
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 text-white text-[11px] font-bold flex items-center justify-center shadow-inner">
                {currentBusiness.ownerName.charAt(0)}
              </div>
              <span className="hidden sm:inline text-xs font-semibold text-gray-700 max-w-[120px] truncate">
                {currentBusiness.name.split(' ')[0]}
              </span>
              <ChevronDown className="w-3 h-3 text-gray-400 mr-0.5" />
            </button>

            {showBusinessSwitcher && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 p-2 z-50 text-xs space-y-1 animate-in fade-in slide-in-from-top-2 duration-150">
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
        </div>
      </div>
    </header>
  );
};
