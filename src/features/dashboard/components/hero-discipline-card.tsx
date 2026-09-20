import React from 'react';
import { Card } from '@/components/ui/card';

interface HeroDisciplineCardProps {
  onTimeRate: number;
  totalPresentDays: number;
  totalLateDays: number;
}

export function HeroDisciplineCard({
  onTimeRate,
  totalPresentDays,
  totalLateDays,
}: HeroDisciplineCardProps) {
  const isHigh = onTimeRate >= 90;
  const isMedium = onTimeRate >= 75;

  return (
    <Card className="lg:col-span-5 relative overflow-hidden bg-gradient-to-br from-[#0e1626] to-[#121c33] border-slate-800/80 p-5 flex flex-col justify-between shadow-sm">
      <div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Indeks Disiplin Presensi
          </span>
          <span
            className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
              isHigh
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : isMedium
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
            }`}
          >
            {isHigh ? 'Disiplin Tinggi' : isMedium ? 'Perlu Monitoring' : 'Kritis'}
          </span>
        </div>

        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
            {onTimeRate}
          </span>
          <span className="text-xl font-semibold text-slate-400">%</span>
          <span className="text-xs text-slate-400 ml-1">tepat waktu</span>
        </div>

        {/* Visual Progress Bar */}
        <div className="w-full bg-slate-800/80 h-2.5 rounded-full mt-4 overflow-hidden p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isHigh
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                : isMedium
                ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                : 'bg-gradient-to-r from-rose-500 to-red-400'
            }`}
            style={{ width: `${Math.min(100, Math.max(0, onTimeRate))}%` }}
          />
        </div>
      </div>

      <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
        <span>
          Tepat Waktu: <strong className="text-white">{totalPresentDays} hari</strong>
        </span>
        <span>
          Terlambat: <strong className="text-amber-400">{totalLateDays} kejadian</strong>
        </span>
      </div>
    </Card>
  );
}
