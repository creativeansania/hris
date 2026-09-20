'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { WifiOff, MapPin, FileText, RefreshCw, Smartphone, ShieldCheck, ArrowRight } from 'lucide-react';

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleCheckConnection = () => {
    setIsChecking(true);
    setTimeout(() => {
      setIsOnline(navigator.onLine);
      setIsChecking(false);
      if (navigator.onLine) {
        window.location.href = '/dashboard';
      }
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background ambient light */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full text-center space-y-6 relative z-10">
        {/* Status Icon */}
        <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-600/10 border border-amber-500/30 flex items-center justify-center shadow-xl shadow-amber-500/10">
          <WifiOff className="w-10 h-10 text-amber-400 animate-pulse" />
        </div>

        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20 uppercase tracking-wider font-mono">
            Mode Offline PWA Aktif
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight text-white mt-3">
            Koneksi Internet Terputus
          </h1>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            Anda sedang tidak terhubung ke jaringan. Namun, Anda tetap dapat menggunakan fitur esensial seperti Presensi GPS dan Pengajuan. Data akan disimpan di antrean lokal (IndexedDB) dan otomatis dikirim saat online.
          </p>
        </div>

        {/* Offline Quick Actions */}
        <div className="space-y-3 text-left">
          <Link
            href="/clock-in"
            className="group block p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-800/60 transition-all shadow-md"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                    Presensi GPS (Clock In)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Bisa absen offline dengan GPS perangkat
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </div>
          </Link>

          <Link
            href="/requests"
            className="group block p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-800/60 transition-all shadow-md"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                    Pengajuan Cuti / Izin
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Isi formulir pengajuan & simpan di antrean
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </div>
          </Link>
        </div>

        {/* Retry Button */}
        <div className="pt-2">
          <button
            onClick={handleCheckConnection}
            disabled={isChecking}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'Mengecek Koneksi...' : 'Periksa Koneksi Internet'}</span>
          </button>
        </div>

        <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 pt-2 font-mono">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
          <span>Sistem HRIS Progressive Web App v2.0</span>
        </div>
      </div>
    </div>
  );
}
