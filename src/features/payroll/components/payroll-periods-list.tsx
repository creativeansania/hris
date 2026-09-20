import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PayrollPeriod } from '@/types/database';
import { PayrollStatusBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Calendar, Play, Lock, ChevronRight, RefreshCw, FileText } from 'lucide-react';

interface PayrollPeriodsListProps {
  periods: PayrollPeriod[];
  selectedPeriodId: string;
  onSelectPeriod: (periodId: string) => void;
  onGenerateRun: (periodId: string) => void;
  onFinalizePeriod: (periodId: string) => void;
  onCreateNewPeriod: () => void;
  isPending: boolean;
}

export function PayrollPeriodsList({
  periods,
  selectedPeriodId,
  onSelectPeriod,
  onGenerateRun,
  onFinalizePeriod,
  onCreateNewPeriod,
  isPending,
}: PayrollPeriodsListProps) {
  if (periods.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        title="Belum Ada Periode Payroll"
        description="Buka periode payroll pertama untuk mulai mengkalkulasi kompensasi dan tunjangan karyawan."
        actionLabel="Buka Periode Baru"
        onAction={onCreateNewPeriod}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Daftar Periode Penggajian</h3>
        <span className="text-xs text-slate-400">{periods.length} periode tercatat</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {periods.map((period) => {
          const isSelected = period.id === selectedPeriodId;
          const isFinalized = period.status === 'finalized';

          return (
            <Card
              key={period.id}
              className={`p-4 bg-[#0d1322] border transition-all duration-200 flex flex-col justify-between ${
                isSelected
                  ? 'border-blue-500/80 shadow-md shadow-blue-500/10'
                  : 'border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-mono font-bold text-white">
                      {period.period_start} &mdash; {period.period_end}
                    </span>
                  </div>
                  <PayrollStatusBadge status={period.status} />
                </div>

                <div className="text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 space-y-1 mb-4">
                  <div className="flex justify-between">
                    <span className="text-slate-500">ID Periode:</span>
                    <span className="font-mono text-slate-400">{period.id.slice(0, 8)}...</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Status:</span>
                    <span className="text-slate-300 font-medium capitalize">{period.status}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant={isSelected ? 'primary' : 'outline'}
                  onClick={() => onSelectPeriod(period.id)}
                  className={`text-xs flex-1 ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : 'border-slate-700 text-slate-300 hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 mr-1" />
                  {isSelected ? 'Sedang Dibuka' : 'Buka Rincian'}
                </Button>

                {!isFinalized && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onGenerateRun(period.id)}
                      disabled={isPending}
                      className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 text-xs px-2.5"
                      title="Hitung ulang kalkulasi gaji"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onFinalizePeriod(period.id)}
                      disabled={isPending}
                      className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10 text-xs px-2.5"
                      title="Finalisasi dan kunci periode"
                    >
                      <Lock className="w-3.5 h-3.5" />
                    </Button>
                  </>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
