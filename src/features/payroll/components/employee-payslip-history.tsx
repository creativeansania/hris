import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PayrollRun } from '@/types/database';
import { formatIDR } from '@/lib/formatters';
import { EmptyState } from '@/components/ui/empty-state';
import { PayslipData } from '@/components/payroll/payslip-modal';
import { Receipt, Printer, Calendar } from 'lucide-react';

interface EmployeePayslipHistoryProps {
  payslips: PayrollRun[];
  onViewPayslip: (data: PayslipData) => void;
}

export function EmployeePayslipHistory({
  payslips,
  onViewPayslip,
}: EmployeePayslipHistoryProps) {
  if (payslips.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title="Belum Ada Slip Gaji"
        description="Slip gaji Anda akan otomatis muncul di sini setelah periode penggajian difinalisasi oleh pihak manajemen."
      />
    );
  }

  const handleOpenSlip = (run: PayrollRun) => {
    const periodLabel = run.payroll_period
      ? `${run.payroll_period.period_start} s/d ${run.payroll_period.period_end}`
      : 'Periode Payroll';

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
      periodStart: run.payroll_period?.period_start,
      periodEnd: run.payroll_period?.period_end,
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
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Riwayat Slip Gaji Saya</h3>
        <span className="text-xs text-slate-400">{payslips.length} slip tersedia</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {payslips.map((slip) => (
          <Card
            key={slip.id}
            className="p-4 bg-[#0d1322] border-slate-800/80 flex flex-col justify-between hover:border-slate-700 transition-colors"
          >
            <div>
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <div className="flex items-center gap-1.5 text-xs">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span className="font-mono text-slate-300">
                    {slip.payroll_period?.period_start} s/d {slip.payroll_period?.period_end}
                  </span>
                </div>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 font-medium">
                  Resmi
                </span>
              </div>

              <div className="my-3 py-2 px-3 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[11px] text-slate-400">Take Home Pay</span>
                <div className="text-lg font-bold font-mono text-emerald-400">
                  {formatIDR(slip.net_pay)}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <Button
                size="sm"
                onClick={() => handleOpenSlip(slip)}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs"
              >
                <Printer className="w-3.5 h-3.5 mr-1.5" />
                Cetak / Simpan PDF
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
