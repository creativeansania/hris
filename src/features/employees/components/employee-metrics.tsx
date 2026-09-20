'use client';

import React from 'react';
import { Users, UserX, Clock, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface EmployeeMetricsProps {
  total: number;
  active: number;
  pendingClaim: number;
  inactive: number;
}

export function EmployeeMetrics({
  total,
  active,
  pendingClaim,
  inactive,
}: EmployeeMetricsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* Total Karyawan */}
      <Card className="p-4 bg-[#0d1322] border-slate-800/80 hover:border-slate-700/80 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Total Karyawan</span>
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Users className="w-4 h-4 text-blue-400" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold font-mono text-white">{total}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Terdaftar dalam database</p>
        </div>
      </Card>

      {/* Karyawan Aktif */}
      <Card className="p-4 bg-[#0d1322] border-slate-800/80 hover:border-slate-700/80 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Status Aktif</span>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold font-mono text-emerald-400">{active}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Memiliki akses & absensi aktif</p>
        </div>
      </Card>

      {/* Belum Klaim Akun */}
      <Card className="p-4 bg-[#0d1322] border-slate-800/80 hover:border-slate-700/80 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Pending Klaim</span>
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold font-mono text-amber-400">{pendingClaim}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Menunggu aktivasi Google SSO</p>
        </div>
      </Card>

      {/* Nonaktif */}
      <Card className="p-4 bg-[#0d1322] border-slate-800/80 hover:border-slate-700/80 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Nonaktif / Resign</span>
          <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
            <UserX className="w-4 h-4 text-rose-400" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold font-mono text-slate-400">{inactive}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Akses akun dinonaktifkan</p>
        </div>
      </Card>
    </div>
  );
}
