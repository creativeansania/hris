'use client';

import React from 'react';
import { Calendar, CreditCard, FileText, TrendingUp } from 'lucide-react';
import { EmployeeContract, LeaveBalance } from '@/types/database';

interface EmployeeStatsBannerProps {
  latestContract: EmployeeContract | null;
  joinDate: string | null;
  leaveBalance: LeaveBalance | null;
}

export function EmployeeStatsBanner({
  latestContract,
  joinDate,
  leaveBalance,
}: EmployeeStatsBannerProps) {
  // Calculate tenure (masa kerja)
  const calculateTenure = () => {
    if (!joinDate) return 'Baru Bergabung';
    const start = new Date(joinDate);
    const now = new Date();
    let years = now.getFullYear() - start.getFullYear();
    let months = now.getMonth() - start.getMonth();
    if (months < 0) {
      years--;
      months += 12;
    }
    if (years === 0 && months === 0) return '< 1 Bulan';
    if (years === 0) return `${months} Bulan`;
    return `${years} Thn ${months} Bln`;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Gaji Pokok Terakhir */}
      <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Gaji Pokok Aktif
          </span>
          <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
            <CreditCard className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-3 flex items-baseline gap-1">
          <span className="text-2xl font-extrabold text-white font-mono">
            Rp {(latestContract?.base_salary || 0).toLocaleString('id-ID')}
          </span>
        </div>
        <p className="mt-2 text-[11px] text-slate-400">
          {latestContract
            ? `Kontrak ${latestContract.contract_type.toUpperCase()}`
            : 'Belum ada data kontrak'}
        </p>
      </div>

      {/* Status Kontrak & Reminder */}
      <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Status Kontrak
          </span>
          <span
            className={`p-2 rounded-lg ${
              latestContract?.status_urgency === 'critical'
                ? 'bg-rose-500/10 text-rose-400'
                : latestContract?.status_urgency === 'warning'
                ? 'bg-amber-500/10 text-amber-400'
                : 'bg-blue-500/10 text-blue-400'
            }`}
          >
            <FileText className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-extrabold uppercase font-mono text-white">
            {latestContract?.contract_type || 'N/A'}
          </span>
          {latestContract?.contract_type === 'pkwt' &&
            typeof latestContract.days_remaining === 'number' && (
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  latestContract.status_urgency === 'critical'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : latestContract.status_urgency === 'warning'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-400'
                }`}
              >
                {latestContract.days_remaining < 0
                  ? 'Kedaluwarsa'
                  : `Sisa ${latestContract.days_remaining} Hari`}
              </span>
            )}
        </div>
        <p className="mt-2 text-[11px] text-slate-400">
          {latestContract?.contract_type === 'pkwtt'
            ? 'Karyawan Tetap (PKWTT)'
            : latestContract?.end_date
            ? `Berakhir: ${latestContract.end_date}`
            : 'Belum terikat kontrak'}
        </p>
      </div>

      {/* Masa Kerja */}
      <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Masa Kerja
          </span>
          <span className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
            <TrendingUp className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-3 flex items-baseline gap-1">
          <span className="text-2xl font-extrabold text-white font-mono">
            {calculateTenure()}
          </span>
        </div>
        <p className="mt-2 text-[11px] text-slate-400">
          Sejak {joinDate || 'awal bergabung'}
        </p>
      </div>

      {/* Sisa Cuti */}
      <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Sisa Saldo Cuti {new Date().getFullYear()}
          </span>
          <span className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
            <Calendar className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-extrabold text-blue-400 font-mono">
            {leaveBalance?.remaining ?? 12}
          </span>
          <span className="text-xs text-slate-400">
            hari / {leaveBalance?.quota ?? 12} hak
          </span>
        </div>
        <p className="mt-2 text-[11px] text-slate-400">
          Terpakai: {leaveBalance?.used ?? 0} hari
        </p>
      </div>
    </div>
  );
}
