'use client';

import React, { Suspense } from 'react';
import { LoginCard } from '@/features/auth';

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs">
          Memuat portal login...
        </div>
      }
    >
      <LoginCard />
    </Suspense>
  );
}
