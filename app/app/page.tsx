'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function AuthenticatedBusinessApp() {
  const router = useRouter();

  useEffect(() => {
    // Cleanly redirect to main dashboard
    router.replace('/');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#fbfbfe] flex flex-col items-center justify-center gap-3">
      <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
      <span className="text-xs font-semibold text-gray-500">Loading your workspace...</span>
    </div>
  );
}
