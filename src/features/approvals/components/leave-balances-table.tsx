import React from 'react';
import { Sparkles } from 'lucide-react';
import { RoleBadge } from '@/components/ui/badge';
import { LeaveBalance } from '@/types/database';

interface LeaveBalancesTableProps {
  leaveBalances: LeaveBalance[];
  onOpenAdjust: (balance: LeaveBalance) => void;
}

export function LeaveBalancesTable({
  leaveBalances,
  onOpenAdjust,
}: LeaveBalancesTableProps) {
  return (
    <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-400" />
            Rekap Saldo Cuti Karyawan Tahun {new Date().getFullYear()}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            HR dan Admin dapat melihat sisa kuota cuti tahunan dan melakukan penyesuaian manual (+/- hari) beserta alasannya.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-900/80 border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
            <tr>
              <th className="px-4 py-3">Karyawan</th>
              <th className="px-4 py-3">Divisi / Role</th>
              <th className="px-4 py-3 text-center">Hak Kuota</th>
              <th className="px-4 py-3 text-center">Carry Over</th>
              <th className="px-4 py-3 text-center">Penyesuaian HR</th>
              <th className="px-4 py-3 text-center">Terpakai</th>
              <th className="px-4 py-3 text-center">Sisa Saldo</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {leaveBalances.map((b) => (
              <tr key={b.id} className="hover:bg-slate-900/40 transition font-sans">
                <td className="px-4 py-3 font-semibold text-white">
                  {b.employee?.full_name}
                  <span className="block text-[10px] text-slate-400 font-normal font-mono">
                    {b.employee?.email}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-slate-300 block">{b.employee?.division?.name || '-'}</span>
                  <RoleBadge role={b.employee?.role || 'staff'} />
                </td>
                <td className="px-4 py-3 text-center font-mono font-bold text-white">
                  {b.quota}
                </td>
                <td className="px-4 py-3 text-center font-mono text-slate-400">
                  {b.carry_over}
                </td>
                <td className="px-4 py-3 text-center font-mono">
                  <span
                    className={`font-semibold ${
                      Number(b.adjustment) > 0
                        ? 'text-emerald-400'
                        : Number(b.adjustment) < 0
                        ? 'text-rose-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {Number(b.adjustment) > 0 ? '+' : ''}
                    {b.adjustment}
                  </span>
                </td>
                <td className="px-4 py-3 text-center font-mono text-rose-400 font-bold">
                  {b.used}
                </td>
                <td className="px-4 py-3 text-center font-mono">
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">
                    {b.remaining} hari
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => onOpenAdjust(b)}
                    className="px-3 py-1.5 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 font-semibold text-xs transition cursor-pointer"
                  >
                    Sesuaikan Kuota
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
