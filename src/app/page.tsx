'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from "@/components/providers/i18n-provider";

export default function Home() {
  const router = useRouter();
  const { dict } = useTranslation();

  useEffect(() => {
    // Immediate redirect to login
    router.replace('/dashboard/sales');
  }, [router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
        <p className="text-gray-500 font-medium">{dict.Common.Loading}</p>
      </div>
    </div>
  );
}
