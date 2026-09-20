'use client';

import React, { useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard component error:', error);
  }, [error]);

  return (
    <div className="py-12 flex items-center justify-center">
      <div className="max-w-md w-full rounded-2xl bg-[#111726] border border-slate-800 p-6 shadow-xl text-center">
        <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>

        <h2 className="text-base font-bold text-white mb-1.5">Gagal Memuat Modul</h2>
        <p className="text-xs text-slate-400 mb-5 leading-relaxed">
          Terjadi kesalahan saat memuat data modul ini. Silakan coba muat ulang komponen.
        </p>

        <button
          onClick={() => reset()}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition shadow-md shadow-blue-600/20"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Muat Ulang Komponen
        </button>
      </div>
    </div>
  );
}
