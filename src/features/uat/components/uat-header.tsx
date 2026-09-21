'use client';

import React from 'react';
import {
  Sparkles,
  Download,
  CheckCircle2,
  RotateCcw,
  Activity,
  RefreshCw,
} from 'lucide-react';
import { SystemHealthState } from '../types';

interface UatHeaderProps {
  totalCount: number;
  passedCount: number;
  progressPercent: number;
  systemHealth: SystemHealthState;
  onExport: () => void;
  onMarkAllPassed: () => void;
  onResetAll: () => void;
}

export function UatHeader({
  totalCount,
  passedCount,
  progressPercent,
  systemHealth,
  onExport,
  onMarkAllPassed,
  onResetAll,
}: UatHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950/40 to-slate-900 border border-slate-800/80 p-6 md:p-8 shadow-2xl">
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Matriks Kesiapan Go-Live</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            Portal UAT & Verifikasi Sistem
          </h1>
          <p className="text-slate-400 text-sm mt-1 max-w-2xl">
            Checklist Pengujian Penerimaan Pengguna (User Acceptance Testing) lintas 6 role bisnis.
          </p>
        </div>

        {/* Quick Metrics & Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onExport}
            className="px-4 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium inline-flex items-center gap-2 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4 text-blue-400" />
            Export Sign-Off
          </button>
          <button
            onClick={onMarkAllPassed}
            className="px-4 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-medium inline-flex items-center gap-2 transition-colors"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Pass Semua
          </button>
          <button
            onClick={onResetAll}
            className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/60 text-xs transition-colors"
            title="Reset status checklist"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar & Health Status */}
      <div className="mt-6 pt-6 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Progres Kelulusan UAT</span>
            <span className="font-bold text-white">
              {progressPercent}% ({passedCount}/{totalCount})
            </span>
          </div>
          <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <Activity className="w-5 h-5 text-blue-400 shrink-0" />
          <div>
            <div className="text-[11px] text-slate-400 uppercase font-mono">Status Database</div>
            <div className="text-xs font-semibold text-white flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Supabase Live ({systemHealth.dbLatency}ms)</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <RefreshCw
            className={`w-5 h-5 text-indigo-400 shrink-0 ${
              systemHealth.loading ? 'animate-spin' : ''
            }`}
          />
          <div>
            <div className="text-[11px] text-slate-400 uppercase font-mono">Status Odoo ERP</div>
            <div className="text-xs font-semibold text-white flex items-center gap-1.5 mt-0.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  systemHealth.odooStatus === 'ok' ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              <span className="capitalize">
                {systemHealth.odooStatus === 'ok'
                  ? 'Connected (v19.0)'
                  : systemHealth.odooStatus}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
