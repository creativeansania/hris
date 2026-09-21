'use client';

import React from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowUpRight } from 'lucide-react';
import { ExpiringContractItem } from '@/types/database';

interface ContractAlertBoxProps {
  expiringContracts: ExpiringContractItem[];
  criticalCount: number;
  warningCount: number;
}

export function ContractAlertBox({
  expiringContracts,
  criticalCount,
  warningCount,
}: ContractAlertBoxProps) {
  if (!expiringContracts || expiringContracts.length === 0) {
    return null;
  }

  return (
    <div
      className={`p-4 rounded-2xl border transition shadow-sm ${
        criticalCount > 0
          ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={`p-2 rounded-xl mt-0.5 ${
              criticalCount > 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Peringatan Masa Berakhir Kontrak PKWT</span>
              {criticalCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500/30 text-rose-300 font-extrabold">
                  {criticalCount} Kritis (H-7)
                </span>
              )}
              {warningCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/30 text-amber-300 font-extrabold">
                  {warningCount} Mendekati (H-30)
                </span>
              )}
            </h4>
            <p className="text-xs text-slate-300 mt-0.5">
              Terdapat {expiringContracts.length} karyawan dengan kontrak PKWT yang akan berakhir dalam 30 hari ke depan. Mohon lakukan evaluasi untuk perpanjangan atau penyelesaian kontrak.
            </p>
          </div>
        </div>
      </div>

      {/* Quick chips of expiring employees */}
      <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center gap-2 flex-wrap text-xs">
        <span className="text-[11px] font-semibold text-slate-400">Daftar Karyawan:</span>
        {expiringContracts.slice(0, 5).map(({ contract, employee }) => (
          <Link
            key={contract.id}
            href={`/employees/${employee.id}`}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition hover:opacity-90 ${
              contract.status_urgency === 'critical'
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                : 'bg-amber-500/20 border-amber-500/40 text-amber-300'
            }`}
          >
            <span>{employee.full_name}</span>
            <span className="font-mono font-bold">
              ({typeof contract.days_remaining === 'number' && contract.days_remaining < 0
                ? 'Habis'
                : `H-${contract.days_remaining ?? 0}`})
            </span>
            <ArrowUpRight className="w-3 h-3" />
          </Link>
        ))}
        {expiringContracts.length > 5 && (
          <span className="text-xs text-slate-400 font-mono">
            +{expiringContracts.length - 5} lainnya...
          </span>
        )}
      </div>
    </div>
  );
}
