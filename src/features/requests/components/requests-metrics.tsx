import React from 'react';
import { CalendarDays, Clock, CheckCircle2, Layers } from 'lucide-react';
import { LeaveBalance, RequestItem } from '@/types/database';

interface RequestsMetricsProps {
  leaveBalance: LeaveBalance | null;
  requests: RequestItem[];
}

export function RequestsMetrics({ leaveBalance, requests }: RequestsMetricsProps) {
  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const approvedCount = requests.filter((r) => r.status === 'approved').length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Sisa Saldo Cuti */}
      <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Sisa Cuti Tahunan {new Date().getFullYear()}
          </span>
          <span className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
            <CalendarDays className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-white font-mono">
            {leaveBalance?.remaining ?? 12}
          </span>
          <span className="text-xs text-slate-400">
            hari / {leaveBalance?.quota ?? 12} kuota
          </span>
        </div>
        <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          Terpakai: {leaveBalance?.used ?? 0} hari
          {Number(leaveBalance?.adjustment) !== 0 && (
            <span className="text-blue-400 ml-1">
              (Penyesuaian: {Number(leaveBalance?.adjustment) > 0 ? '+' : ''}
              {leaveBalance?.adjustment})
            </span>
          )}
        </div>
      </div>

      {/* Pengajuan Menunggu */}
      <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Menunggu Persetujuan
          </span>
          <span className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
            <Clock className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-amber-400 font-mono">{pendingCount}</span>
          <span className="text-xs text-slate-400">pengajuan aktif</span>
        </div>
        <p className="mt-2 text-[11px] text-slate-400">Proses paralel Atasan & HR</p>
      </div>

      {/* Disetujui */}
      <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Disetujui
          </span>
          <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-emerald-400 font-mono">
            {approvedCount}
          </span>
          <span className="text-xs text-slate-400">selesai diproses</span>
        </div>
        <p className="mt-2 text-[11px] text-slate-400">Semua approval lolos</p>
      </div>

      {/* Total Riwayat */}
      <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Total Riwayat
          </span>
          <span className="p-2 rounded-lg bg-slate-700/40 text-slate-300">
            <Layers className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-white font-mono">{requests.length}</span>
          <span className="text-xs text-slate-400">permohonan tercatat</span>
        </div>
        <p className="mt-2 text-[11px] text-slate-400">Termasuk cuti & izin dinas</p>
      </div>
    </div>
  );
}
