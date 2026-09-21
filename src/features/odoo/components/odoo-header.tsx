'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Layers,
  Send,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface OdooHeaderProps {
  connectionConfig: {
    isConfigured: boolean;
    mode: 'live' | 'sandbox';
    url: string | null;
  };
  pendingCount: number;
  isPending: boolean;
  actionMessage: {
    type: 'success' | 'error';
    text: string;
  } | null;
  onClearActionMessage: () => void;
  onCollectData: () => void;
  onSyncAllPending: () => void;
}

export function OdooHeader({
  connectionConfig,
  pendingCount,
  isPending,
  actionMessage,
  onClearActionMessage,
  onCollectData,
  onSyncAllPending,
}: OdooHeaderProps) {
  return (
    <div className="space-y-4">
      {/* 1. Header & Global Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-semibold text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/20 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              Integrasi ERP
            </span>
            <span className="text-slate-600">&bull;</span>
            <span className="text-xs text-slate-400">Outbox Engine & Sinkronisasi</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Sinkronisasi Odoo
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Pengumpulan otomatis data presensi, cuti, izin, dan lembur untuk di-push ke modul Odoo dengan audit trail.
          </p>
        </div>

        {/* Global Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={onCollectData}
            disabled={isPending}
            className="border-slate-800 text-slate-200 hover:bg-slate-850 hover:text-white"
          >
            <Layers className="w-4 h-4 mr-1.5 text-blue-400" />
            Pindai & Kumpulkan Data
          </Button>

          <Button
            size="sm"
            onClick={onSyncAllPending}
            disabled={isPending || pendingCount === 0}
            className="bg-purple-600 hover:bg-purple-500 text-white font-medium shadow-md shadow-purple-900/30"
          >
            <Send className="w-4 h-4 mr-1.5" />
            Sync Semua ({pendingCount})
          </Button>
        </div>
      </div>

      {/* Connection Info Banner */}
      <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              connectionConfig.mode === 'live'
                ? 'bg-emerald-400 animate-pulse'
                : 'bg-amber-400'
            }`}
          />
          <span className="text-slate-300 font-medium">Status Integrasi Odoo:</span>
          {connectionConfig.mode === 'live' ? (
            <span className="text-emerald-400 font-mono">
              Live Connection ({connectionConfig.url})
            </span>
          ) : (
            <span className="text-amber-300/90">
              Sandbox Validation Mode (Simulasi Payload Aktif & Validasi Odoo Model)
            </span>
          )}
        </div>
        <div className="text-[11px] text-slate-400 font-mono">
          Sinkronisasi bersifat Manual oleh HR (PRD §12) &bull; Max Retry: 3x
        </div>
      </div>

      {/* Alert Banner for Operations */}
      {actionMessage && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between gap-2 ${
            actionMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={onClearActionMessage}
            className="text-[11px] text-slate-400 hover:text-white"
          >
            Tutup
          </button>
        </div>
      )}
    </div>
  );
}
