import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PayrollPeriod, PayrollRun } from '@/types/database';
import { formatIDR } from '@/lib/formatters';
import { EmptyState } from '@/components/ui/empty-state';
import { PayslipData } from '@/components/payroll/payslip-modal';
import {
  Users,
  Search,
  Download,
  Lock,
  Play,
  Printer,
  CreditCard,
  Building,
  CheckCircle2,
} from 'lucide-react';

interface PayrollRunReviewProps {
  selectedPeriod: PayrollPeriod | null;
  runs: PayrollRun[];
  onGenerateRun: (periodId: string) => void;
  onFinalizePeriod: (periodId: string) => void;
  onOpenBankExport: () => void;
  onViewPayslip: (data: PayslipData) => void;
  isPending: boolean;
}

export function PayrollRunReview({
  selectedPeriod,
  runs,
  onGenerateRun,
  onFinalizePeriod,
  onOpenBankExport,
  onViewPayslip,
  isPending,
}: PayrollRunReviewProps) {
  const [searchQuery, setSearchQuery] = useState('');

  if (!selectedPeriod) {
    return (
      <EmptyState
        icon={Users}
        title="Pilih Periode Penggajian"
        description="Silakan pilih salah satu periode pada tab 'Daftar Periode' di atas untuk meninjau rincian kalkulasi gaji karyawan."
      />
    );
  }

  const isFinalized = selectedPeriod.status === 'finalized';

  const filteredRuns = runs.filter((run) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      run.employee?.full_name?.toLowerCase().includes(q) ||
      run.employee?.nik?.toLowerCase().includes(q) ||
      run.employee?.division?.name?.toLowerCase().includes(q)
    );
  });

  const periodLabel = `${selectedPeriod.period_start} s/d ${selectedPeriod.period_end}`;

  const handleOpenSlip = (run: PayrollRun) => {
    const totalDeductions =
      (run.bpjs_kesehatan_deduction || 0) +
      (run.bpjs_ketenagakerjaan_deduction || 0) +
      (run.pph21_deduction || 0) +
      (run.late_deduction || 0) +
      (run.absence_deduction || 0) +
      (run.other_deduction || 0);

    const slip: PayslipData = {
      employeeName: run.employee?.full_name || 'Karyawan',
      nik: run.employee?.nik || '-',
      role: run.employee?.role || 'staff',
      divisionName: run.employee?.division?.name || 'Umum',
      bankName: run.employee?.bank_name || 'BCA',
      bankAccountNo: run.employee?.bank_account_no || '-',
      periodLabel,
      periodStart: selectedPeriod.period_start,
      periodEnd: selectedPeriod.period_end,
      baseSalary: run.base_salary || 0,
      totalAllowance: run.total_allowance || 0,
      overtimePay: run.overtime_pay || 0,
      grossPay: run.gross_pay || 0,
      bpjsKesehatan: run.bpjs_kesehatan_deduction || 0,
      bpjsTkJht: run.breakdown_json?.bpjsTkJht || 0,
      bpjsTkJp: run.breakdown_json?.bpjsTkJp || 0,
      bpjsTkTotal: run.bpjs_ketenagakerjaan_deduction || 0,
      pph21: run.pph21_deduction || 0,
      lateDeduction: run.late_deduction || 0,
      absenceDeduction: run.absence_deduction || 0,
      totalDeductions,
      netPay: run.net_pay || 0,
    };
    onViewPayslip(slip);
  };

  return (
    <div className="space-y-4">
      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#111827]/70 p-3 rounded-xl border border-slate-800/80">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder="Cari nama, NIK, atau divisi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 bg-slate-900 border-slate-700 text-xs text-slate-200"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isFinalized && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onGenerateRun(selectedPeriod.id)}
              disabled={isPending}
              className="border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 text-xs"
            >
              <Play className="w-3.5 h-3.5 mr-1" />
              Hitung Ulang
            </Button>
          )}

          {!isFinalized && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onFinalizePeriod(selectedPeriod.id)}
              disabled={isPending}
              className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10 text-xs"
            >
              <Lock className="w-3.5 h-3.5 mr-1" />
              Finalisasi Periode
            </Button>
          )}

          {runs.length > 0 && (
            <Button
              size="sm"
              onClick={onOpenBankExport}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs"
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              Export Transfer Bank
            </Button>
          )}
        </div>
      </div>

      {/* Runs Table */}
      {filteredRuns.length === 0 ? (
        <EmptyState
          icon={Users}
          title={runs.length === 0 ? 'Belum Ada Kalkulasi Gaji' : 'Tidak Ada Karyawan Cocok'}
          description={
            runs.length === 0
              ? 'Klik tombol "Hitung Ulang" di atas untuk menghasilkan kalkulasi payroll bagi seluruh karyawan aktif.'
              : 'Ubah kata kunci pencarian Anda untuk menemukan data karyawan.'
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-[#0d1322]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-semibold">
                <th className="py-3 px-3">Karyawan</th>
                <th className="py-3 px-3">Divisi</th>
                <th className="py-3 px-3 text-right">Gaji Pokok</th>
                <th className="py-3 px-3 text-right">Tunjangan</th>
                <th className="py-3 px-3 text-right">Lembur</th>
                <th className="py-3 px-3 text-right">Potongan</th>
                <th className="py-3 px-3 text-right font-bold text-white">Take Home Pay</th>
                <th className="py-3 px-3 text-center">Slip Gaji</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredRuns.map((run) => (
                <tr key={run.id} className="hover:bg-slate-850/40 transition-colors">
                  <td className="py-3 px-3">
                    <div className="font-medium text-white">{run.employee?.full_name || '-'}</div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {run.employee?.nik || 'Tanpa NIK'}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-slate-400">
                    {run.employee?.division?.name || 'Umum'}
                  </td>
                  <td className="py-3 px-3 text-right font-mono">
                    {formatIDR(run.base_salary)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-400">
                    {formatIDR(run.total_allowance)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-purple-300">
                    {formatIDR(run.overtime_pay)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-rose-400">
                    -{formatIDR(
                      (run.bpjs_kesehatan_deduction || 0) +
                      (run.bpjs_ketenagakerjaan_deduction || 0) +
                      (run.pph21_deduction || 0) +
                      (run.late_deduction || 0) +
                      (run.absence_deduction || 0) +
                      (run.other_deduction || 0)
                    )}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">
                    {formatIDR(run.net_pay)}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenSlip(run)}
                      className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-[11px] py-1 px-2 h-7"
                    >
                      <Printer className="w-3 h-3 mr-1 text-blue-400" />
                      Lihat Slip
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
