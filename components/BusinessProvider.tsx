'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Business } from '@/types/erp';

export interface BusinessContextType {
  currentBusiness: Business | null;
  businessId: string;
  setBusinessId: (id: string) => void;
  accessibleBusinesses: Business[];
  currentUser: any | null;
  isAuthenticated: boolean;
  isPlatformAdmin: boolean;
  isLoading: boolean;
  refreshBusiness: () => Promise<void>;
}

// Fallback demo business for unauthenticated visitors only
const DEMO_FALLBACK_BUSINESS: Business = {
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
};

const BusinessContext = createContext<BusinessContextType>({
  currentBusiness: null,
  businessId: '',
  setBusinessId: () => {},
  accessibleBusinesses: [],
  currentUser: null,
  isAuthenticated: false,
  isPlatformAdmin: false,
  isLoading: true,
  refreshBusiness: async () => {},
});

export const BusinessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [currentBusiness, setCurrentBusiness] = useState<Business | null>(null);
  const [businessId, setBusinessIdState] = useState<string>('');
  const [accessibleBusinesses, setAccessibleBusinesses] = useState<Business[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          setCurrentUser(data.user);

          const isAdmin = data.user.role === 'platform_admin';
          if (isAdmin) {
            // Platform Admin has global oversight access
            const list: Business[] = data.accessibleBusinesses && data.accessibleBusinesses.length > 0
              ? data.accessibleBusinesses
              : [DEMO_FALLBACK_BUSINESS];
            setAccessibleBusinesses(list);

            const saved = typeof window !== 'undefined' ? localStorage.getItem('bizflow_active_business_id') : null;
            const targetBiz = (saved && list.find((b) => b.id === saved)) || list[0] || DEMO_FALLBACK_BUSINESS;
            setCurrentBusiness(targetBiz);
            setBusinessIdState(targetBiz.id);
            if (typeof window !== 'undefined') {
              localStorage.setItem('bizflow_active_business_id', targetBiz.id);
            }
          } else {
            // STRICT TENANT ISOLATION: Business owner or staff MUST ONLY see their own business!
            const userBiz: Business = data.business || {
              id: data.user.businessId,
              name: data.user.name ? `${data.user.name}'s Business` : 'My Business Workspace',
              type: 'Retail & Commercial',
              currency: '₹',
              ownerName: data.user.name || 'Business Owner',
              email: data.user.email,
              phone: data.user.phone || '+91 90000 00000',
              address: 'Registered Workspace Address',
              createdAt: data.user.createdAt || new Date().toISOString(),
            };

            // STRICT: Accessible businesses for non-admins is ONLY their single business tenant
            setAccessibleBusinesses([userBiz]);
            setCurrentBusiness(userBiz);
            setBusinessIdState(userBiz.id);

            // Overwrite any stale localStorage from previous sessions
            if (typeof window !== 'undefined') {
              localStorage.setItem('bizflow_active_business_id', userBiz.id);
            }
          }
          return;
        }
      }

      // If unauthenticated, maintain demo fallback
      setCurrentUser(null);
      setAccessibleBusinesses([DEMO_FALLBACK_BUSINESS]);
      setCurrentBusiness(DEMO_FALLBACK_BUSINESS);
      setBusinessIdState(DEMO_FALLBACK_BUSINESS.id);
    } catch (e) {
      console.warn('Failed to fetch user session for business context:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const setBusinessId = useCallback(
    (id: string) => {
      // Platform admin can switch between businesses
      if (currentUser?.role === 'platform_admin') {
        const target = accessibleBusinesses.find((b) => b.id === id);
        if (target) {
          setCurrentBusiness(target);
          setBusinessIdState(id);
          if (typeof window !== 'undefined') {
            localStorage.setItem('bizflow_active_business_id', id);
          }
        }
        return;
      }

      // For regular users, they can only select their own business
      if (currentBusiness && currentBusiness.id === id) {
        setBusinessIdState(id);
      }
    },
    [currentUser, accessibleBusinesses, currentBusiness]
  );

  const value: BusinessContextType = {
    currentBusiness,
    businessId,
    setBusinessId,
    accessibleBusinesses,
    currentUser,
    isAuthenticated: !!currentUser,
    isPlatformAdmin: currentUser?.role === 'platform_admin',
    isLoading,
    refreshBusiness: fetchSession,
  };

  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>;
};

export const useBusiness = (): BusinessContextType => {
  const context = useContext(BusinessContext);
  if (!context) {
    throw new Error('useBusiness must be used within a BusinessProvider');
  }
  return context;
};
