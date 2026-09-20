'use client';

import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, CheckCircle2 } from 'lucide-react';
import Image from 'next/image';

export function PwaInstallPrompt() {
  const [canInstall, setCanInstall] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  useEffect(() => {
    // Check if already in standalone PWA mode
    if (typeof window !== 'undefined') {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      setIsStandalone(isStandaloneMode);

      const dismissedAt = localStorage.getItem('hris_pwa_install_dismissed');
      if (dismissedAt) {
        const timePassed = Date.now() - parseInt(dismissedAt, 10);
        // If dismissed within 3 days, don't show
        if (timePassed < 3 * 24 * 60 * 60 * 1000) {
          setIsDismissed(true);
        }
      }

      if ((window as any).deferredPrompt) {
        setCanInstall(true);
      }
    }

    const handleInstallReady = () => {
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setCanInstall(false);
      setInstalledSuccess(true);
      setTimeout(() => setInstalledSuccess(false), 5000);
    };

    window.addEventListener('hris-pwa-install-ready', handleInstallReady);
    window.addEventListener('hris-pwa-installed', handleAppInstalled);

    return () => {
      window.removeEventListener('hris-pwa-install-ready', handleInstallReady);
      window.removeEventListener('hris-pwa-installed', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    const promptEvent = (window as any).deferredPrompt;
    if (!promptEvent) return;

    // Show native install dialog
    promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;

    if (outcome === 'accepted') {
      console.log('[PWA] User accepted the install prompt');
      setCanInstall(false);
    } else {
      console.log('[PWA] User dismissed the install prompt');
    }

    (window as any).deferredPrompt = null;
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('hris_pwa_install_dismissed', Date.now().toString());
  };

  if (isStandalone || isDismissed || (!canInstall && !installedSuccess)) {
    return null;
  }

  if (installedSuccess) {
    return (
      <div className="fixed bottom-4 left-4 z-50 p-4 rounded-2xl bg-emerald-950/90 border border-emerald-500/40 shadow-2xl backdrop-blur-md flex items-center gap-3 text-xs text-emerald-200 animate-in slide-in-from-bottom-2">
        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
        <div>
          <p className="font-bold text-white">Aplikasi Berhasil Diinstal!</p>
          <p className="text-[11px] text-emerald-300">Sekarang Anda dapat membuka HRIS langsung dari Home Screen.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 sm:left-auto sm:right-4 z-50 p-4 rounded-2xl bg-[#0d1322]/95 border border-blue-500/30 shadow-2xl shadow-blue-500/10 backdrop-blur-md max-w-sm w-[calc(100%-2rem)] sm:w-96 text-xs text-slate-200 animate-in slide-in-from-bottom-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25 shrink-0 overflow-hidden relative">
            <Smartphone className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-white">Pasang Aplikasi HRIS</h4>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
              Akses cepat tanpa browser URL, hemat kuota & presensi offline stabil.
            </p>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          aria-label="Tutup"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-3.5 flex items-center justify-end gap-2 pt-2 border-t border-slate-800/80">
        <button
          onClick={handleDismiss}
          className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white text-xs font-medium transition"
        >
          Nanti Saja
        </button>
        <button
          onClick={handleInstallClick}
          className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-blue-500/25 active:scale-[0.98]"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install Aplikasi</span>
        </button>
      </div>
    </div>
  );
}
