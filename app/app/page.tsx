'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import BizFlowDashboard from '@/app/page';
import { Loader2 } from 'lucide-react';

export default function AuthenticatedBusinessApp() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => {
        if (!res.ok) {
          router.push('/login');
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (!data || !data.success) {
          router.push('/login');
        } else if (data.user?.role === 'platform_admin') {
          router.push('/admin');
        } else {
          setAuthenticated(true);
          setCheckingAuth(false);
        }
      })
      .catch(() => {
        router.push('/login');
      });
  }, [router]);

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#fbfbfe] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
        <span className="text-xs font-semibold text-gray-500">Verifying secure business session...</span>
      </div>
    );
  }

  if (!authenticated) return null;

  return <BizFlowDashboard />;
}
