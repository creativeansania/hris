'use client';

import React from 'react';
import { Printer, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatIDR } from '@/lib/formatters';

export interface PayslipData {
  employeeName: string;
  nik?: string | null;
  role: string;
  divisionName?: string | null;
  bankName?: string | null;
  bankAccountNo?: string | null;
  periodLabel: string;
  periodStart?: string;
  periodEnd?: string;
  baseSalary: number;
  totalAllowance: number;
  overtimePay: number;
  grossPay: number;
  bpjsKesehatan: number;
  bpjsTkJht: number;
  bpjsTkJp: number;
  bpjsTkTotal: number;
  pph21: number;
  lateDeduction: number;
  absenceDeduction: number;
  totalDeductions: number;
  netPay: number;
}

export function PayslipModal({
  isOpen,
  onClose,
  data,
}: {
  isOpen: boolean;
  onClose: () => void;
  data: PayslipData | null;
}) {
  if (!isOpen || !data) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      {/* Container */}
      <div className="relative w-full max-w-2xl bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden my-8 print:m-0 print:p-0 print:shadow-none print:w-full print:max-w-none">
        {/* Screen Toolbar (Hidden on print) */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white print:hidden border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">Pratinjau Slip Gaji</span>
            <span className="text-xs bg-blue-600 px-2 py-0.5 rounded text-white font-medium">Resmi</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 h-8"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak / PDF</span>
            </Button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Payslip Document Body */}
        <div className="p-8 sm:p-10 space-y-6 text-sm" id="printable-payslip">
          {/* Header Kop Surat */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-slate-950 uppercase">
                PT ANSANIA CREATIVE INDONESIA
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Sistem Manajemen Sumber Daya Manusia & Penggajian
              </p>
              <p className="text-xs text-slate-500">Jakarta, Indonesia</p>
            </div>
            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-slate-100 text-slate-800 font-bold text-xs uppercase tracking-wider rounded border border-slate-300">
                SLIP GAJI KARYAWAN
              </span>
              <p className="text-xs font-semibold text-slate-700 mt-1.5">
                Periode: {data.periodLabel}
              </p>
            </div>
          </div>

          {/* Employee Metadata */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <div className="space-y-1.5">
              <div className="flex">
                <span className="w-28 text-slate-500">Nama Karyawan</span>
                <span className="font-bold text-slate-900">: {data.employeeName}</span>
              </div>
              <div className="flex">
                <span className="w-28 text-slate-500">NIK / ID</span>
                <span className="font-medium text-slate-800">: {data.nik || '-'}</span>
              </div>
              <div className="flex">
                <span className="w-28 text-slate-500">Jabatan / Role</span>
                <span className="font-medium text-slate-800 capitalize">: {data.role}</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex">
                <span className="w-28 text-slate-500">Unit / Divisi</span>
                <span className="font-medium text-slate-800">: {data.divisionName || 'Umum'}</span>
              </div>
              <div className="flex">
                <span className="w-28 text-slate-500">Bank Transfer</span>
                <span className="font-medium text-slate-800">: {data.bankName || 'BCA'}</span>
              </div>
              <div className="flex">
                <span className="w-28 text-slate-500">No. Rekening</span>
                <span className="font-mono text-slate-800">: {data.bankAccountNo || '-'}</span>
              </div>
            </div>
          </div>

          {/* Breakdown Penerimaan & Potongan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Kolom 1: Penerimaan (Earnings) */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-100 px-4 py-2 font-bold text-xs text-slate-800 uppercase tracking-wide border-b border-slate-200">
                Penerimaan (Earnings)
              </div>
              <div className="p-4 space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600">Gaji Pokok</span>
                  <span className="font-mono font-medium text-slate-900">{formatIDR(data.baseSalary)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Tunjangan Tetap</span>
                  <span className="font-mono font-medium text-slate-900">{formatIDR(data.totalAllowance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Upah Lembur (Overtime)</span>
                  <span className="font-mono font-medium text-slate-900">{formatIDR(data.overtimePay)}</span>
                </div>
                <div className="pt-3 border-t border-slate-200 flex justify-between font-bold text-slate-950">
                  <span>Total Penghasilan Bruto</span>
                  <span className="font-mono">{formatIDR(data.grossPay)}</span>
                </div>
              </div>
            </div>

            {/* Kolom 2: Potongan (Deductions) */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-100 px-4 py-2 font-bold text-xs text-slate-800 uppercase tracking-wide border-b border-slate-200">
                Potongan (Deductions)
              </div>
              <div className="p-4 space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600">BPJS Kesehatan (1%)</span>
                  <span className="font-mono font-medium text-rose-700">-{formatIDR(data.bpjsKesehatan)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">BPJS Ketenagakerjaan (JHT + JP)</span>
                  <span className="font-mono font-medium text-rose-700">-{formatIDR(data.bpjsTkTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">PPh 21 TER</span>
                  <span className="font-mono font-medium text-rose-700">-{formatIDR(data.pph21)}</span>
                </div>
                {data.lateDeduction > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Potongan Keterlambatan</span>
                    <span className="font-mono font-medium text-rose-700">-{formatIDR(data.lateDeduction)}</span>
                  </div>
                )}
                {data.absenceDeduction > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Potongan Ketidakhadiran</span>
                    <span className="font-mono font-medium text-rose-700">-{formatIDR(data.absenceDeduction)}</span>
                  </div>
                )}
                <div className="pt-3 border-t border-slate-200 flex justify-between font-bold text-slate-950">
                  <span>Total Potongan</span>
                  <span className="font-mono text-rose-700">-{formatIDR(data.totalDeductions)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Take Home Pay Callout */}
          <div className="bg-slate-900 text-white p-5 rounded-xl flex items-center justify-between print:bg-slate-100 print:text-slate-950 print:border print:border-slate-300">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 print:text-slate-600">
                Penerimaan Bersih (Take Home Pay)
              </span>
              <p className="text-xs text-slate-400 print:text-slate-500 mt-0.5">
                Ditransfer ke rekening {data.bankName || 'BCA'} {data.bankAccountNo ? `• ${data.bankAccountNo}` : ''}
              </p>
            </div>
            <div className="text-2xl font-extrabold font-mono text-emerald-400 print:text-emerald-700">
              {formatIDR(data.netPay)}
            </div>
          </div>

          {/* Signatures */}
          <div className="pt-6 grid grid-cols-2 gap-8 text-center text-xs text-slate-600">
            <div>
              <p>Penerima,</p>
              <div className="h-16 flex items-end justify-center">
                <div className="w-36 border-b border-slate-400" />
              </div>
              <p className="font-bold text-slate-900 mt-1">{data.employeeName}</p>
            </div>
            <div>
              <p>Finance & HR Department,</p>
              <div className="h-16 flex items-end justify-center">
                <div className="w-36 border-b border-slate-400" />
              </div>
              <p className="font-bold text-slate-900 mt-1">PT Ansania Creative Indonesia</p>
            </div>
          </div>

          {/* Footer note */}
          <p className="text-[10px] text-center text-slate-400 pt-4 border-t border-slate-200">
            Dokumen ini dibuat otomatis oleh HRIS System PT Ansania Creative Indonesia dan sah tanpa cap basah.
          </p>
        </div>
      </div>
    </div>
  );
}
