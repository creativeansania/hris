import React from 'react';
import { Card } from '@/components/ui/card';
import { PayrollPeriod, PayrollRun } from '@/types/database';
import { Calendar, Receipt, Users, CreditCard } from 'lucide-react';
import { formatIDR } from '@/lib/formatters';
import { PayrollStatusBadge } from '@/components/ui/badge';

interface PayrollMetricsProps {
  periods: PayrollPeriod[];
  selectedPeriod: PayrollPeriod | null;
  runs: PayrollRun[];
}

export function PayrollMetrics({ periods, selectedPeriod, runs }: PayrollMetricsProps) {
  const finalizedPeriodsCount = periods.filter((p) => p.status === 'finalized').length;
  const totalNetPay = runs.reduce((acc, r) => acc + (r.net_pay || 0), 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="p-4 bg-[#0d1322] border-slate-800/80 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-xs font-medium">Total Periode</span>
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-blue-400" />
          </div>
        </div>
        <div className="my-2">
          <div className="text-2xl font-bold font-mono text-white">{periods.length}</div>
          <p className="text-[11px] text-slate-400 mt-1">
            {finalizedPeriodsCount} periode terkunci
          </p>
        </div>
      </Card>

      <Card className="p-4 bg-[#0d1322] border-slate-800/80 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-xs font-medium">Periode Aktif</span>
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <Receipt className="w-4 h-4 text-purple-400" />
          </div>
        </div>
        <div className="my-2">
          <div className="text-sm font-bold font-mono text-purple-300 truncate">
            {selectedPeriod
              ? `${selectedPeriod.period_start} s/d ${selectedPeriod.period_end}`
              : 'Belum Dipilih'}
          </div>
          <div className="mt-1.5">
            {selectedPeriod ? (
              <PayrollStatusBadge status={selectedPeriod.status} />
            ) : (
              <span className="text-[11px] text-slate-500">Pilih periode di bawah</span>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-4 bg-[#0d1322] border-slate-800/80 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-xs font-medium">Karyawan Terproses</span>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
        </div>
        <div className="my-2">
          <div className="text-2xl font-bold font-mono text-emerald-400">{runs.length}</div>
          <p className="text-[11px] text-slate-400 mt-1">
            {selectedPeriod ? 'Dalam periode terpilih' : 'Pilih periode'}
          </p>
        </div>
      </Card>

      <Card className="p-4 bg-[#0d1322] border-slate-800/80 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-xs font-medium">Total Take Home Pay</span>
          <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
            <CreditCard className="w-4 h-4 text-teal-400" />
          </div>
        </div>
        <div className="my-2">
          <div className="text-lg font-bold font-mono text-teal-300 truncate">
            {formatIDR(totalNetPay)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Total beban gaji periode ini</p>
        </div>
      </Card>
    </div>
  );
}
