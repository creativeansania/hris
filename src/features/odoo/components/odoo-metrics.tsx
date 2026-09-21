'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Layers,
} from 'lucide-react';

interface OdooMetricsProps {
  pendingCount: number;
  syncedCount: number;
  failedCount: number;
  totalCount: number;
}

export function OdooMetrics({
  pendingCount,
  syncedCount,
  failedCount,
  totalCount,
}: OdooMetricsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Pending Sync */}
      <Card className="relative overflow-hidden group hover:border-slate-700 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Menunggu Sinkronisasi</span>
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold font-mono text-blue-400">
            {pendingCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Data siap di-push ke server Odoo
          </p>
        </div>
      </Card>

      {/* Synced Successfully */}
      <Card className="relative overflow-hidden group hover:border-slate-700 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Berhasil Terkirim</span>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {syncedCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Tercatat & diakui downstream Odoo
          </p>
        </div>
      </Card>

      {/* Failed / Needs Retry */}
      <Card className="relative overflow-hidden group hover:border-slate-700 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Gagal / Perlu Retry</span>
          <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold font-mono text-rose-400">
            {failedCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Dapat dicoba ulang hingga 3x
          </p>
        </div>
      </Card>

      {/* Total Outbox Records */}
      <Card className="relative overflow-hidden group hover:border-slate-700 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Total Antrean Outbox</span>
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <Layers className="w-4 h-4 text-purple-400" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold font-mono text-purple-300">
            {totalCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Akumulasi record outbox di database
          </p>
        </div>
      </Card>
    </div>
  );
}
