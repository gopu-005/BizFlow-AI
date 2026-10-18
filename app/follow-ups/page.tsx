'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function FollowUpsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/customers');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center text-xs text-gray-500">
      Redirecting to Customer Follow-ups...
    </div>
  );
}
