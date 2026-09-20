'use client';

import { useEffect, useState } from 'react';
import { initSyncEngine } from '@/lib/sync-engine';
import { Sparkles, RefreshCw } from 'lucide-react';

export function PwaRegister() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    // 1. Initialize offline sync engine
    const cleanupSync = initSyncEngine();

    // 2. Register Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('[PWA] ServiceWorker registered with scope:', registration.scope);

            // Handle updates
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    console.log('[PWA] New version available!');
                    setWaitingWorker(newWorker);
                    setUpdateAvailable(true);
                  }
                });
              }
            });
          })
          .catch((err) => {
            console.warn('[PWA] ServiceWorker registration failed:', err);
          });
      });
    }

    // 3. Listen for PWA BeforeInstallPromptEvent
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      // Store event globally for install banners
      (window as any).deferredPrompt = e;
      window.dispatchEvent(new CustomEvent('hris-pwa-install-ready'));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Listen for app installed
    const handleAppInstalled = () => {
      (window as any).deferredPrompt = null;
      window.dispatchEvent(new CustomEvent('hris-pwa-installed'));
      console.log('[PWA] Application successfully installed.');
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      cleanupSync();
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleApplyUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }
    setUpdateAvailable(false);
    window.location.reload();
  };

  if (!updateAvailable) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 p-4 rounded-xl bg-slate-900 border border-blue-500/40 shadow-2xl flex items-center gap-3 text-xs animate-in slide-in-from-bottom-3 max-w-sm">
      <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
        <Sparkles className="w-4 h-4" />
      </div>
      <div className="flex-1">
        <p className="font-semibold text-white">Pembaruan Sistem Tersedia</p>
        <p className="text-[11px] text-slate-400">Versi terbaru HRIS siap diterapkan.</p>
      </div>
      <button
        onClick={handleApplyUpdate}
        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-blue-500/20"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        <span>Update</span>
      </button>
    </div>
  );
}
