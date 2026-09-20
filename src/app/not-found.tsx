import React from 'react';
import Link from 'next/link';
import { FileQuestion, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full rounded-2xl bg-[#111726] border border-slate-800 p-6 sm:p-8 shadow-2xl text-center">
        <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto mb-4">
          <FileQuestion className="w-7 h-7" />
        </div>

        <span className="inline-block px-2.5 py-1 rounded-full bg-slate-800 text-xs font-semibold text-slate-400 mb-3">
          404 — Tidak Ditemukan
        </span>

        <h1 className="text-xl font-bold text-white mb-2">Halaman Tidak Ditemukan</h1>
        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
          Tautan yang Anda tuju tidak tersedia atau telah dipindahkan ke alamat lain.
        </p>

        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition shadow-lg shadow-blue-600/20"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Dashboard
        </Link>
      </div>
    </div>
  );
}
