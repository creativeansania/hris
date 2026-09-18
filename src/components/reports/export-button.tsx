'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import { EmployeeReportRow } from '@/app/actions/reports';

interface ExportButtonProps {
  data: EmployeeReportRow[];
  periodLabel: string;
  divisionLabel?: string;
}

export function ExportButton({
  data,
  periodLabel,
  divisionLabel = 'Semua Divisi',
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportCSV = () => {
    setIsExporting(true);

    try {
      // Header row
      const headers = [
        'NIK',
        'Nama Lengkap',
        'Email',
        'Role',
        'Divisi',
        'Hari Hadir Tepat Waktu',
        'Hari Terlambat',
        'Izin Telat Sah',
        'Total Menit Keterlambatan',
        'Total Jam Lembur',
        'Hari Cuti / Izin',
        'Gaji Pokok (IDR)',
        'Estimasi Biaya Lembur (IDR)',
      ];

      // Format rows
      const rows = data.map((row) => [
        `"${row.nik || '-'}"`,
        `"${row.fullName.replace(/"/g, '""')}"`,
        `"${row.email || '-'}"`,
        `"${row.role}"`,
        `"${row.divisionName.replace(/"/g, '""')}"`,
        row.presentDays,
        row.lateDays,
        row.excusedLateDays,
        row.totalLateMinutes,
        row.overtimeHours.toFixed(1),
        row.leaveDays,
        row.baseSalary,
        row.estimatedOvertimePay,
      ]);

      // Combine with BOM for Excel UTF-8 recognition
      const csvContent =
        '\uFEFF' +
        [
          `"Laporan Rekapitulasi Presensi & SDM HRIS"`,
          `"Periode: ${periodLabel}"`,
          `"Divisi: ${divisionLabel}"`,
          `"Waktu Ekspor: ${new Date().toLocaleString('id-ID')}"`,
          '',
          headers.join(','),
          ...rows.map((r) => r.join(',')),
        ].join('\r\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const sanitizedPeriod = periodLabel.replace(/[^a-zA-Z0-9]/g, '_');
      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `Rekap_Presensi_HRIS_${sanitizedPeriod}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export CSV:', err);
      alert('Gagal mengekspor data ke format CSV.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExportCSV}
      disabled={isExporting || data.length === 0}
      className="bg-emerald-950/30 border-emerald-500/30 text-emerald-400 hover:bg-emerald-900/40 hover:text-emerald-300 font-medium transition-all shadow-sm flex items-center gap-2"
    >
      {isExporting ? (
        <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
      ) : (
        <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
      )}
      <span>Ekspor ke Excel / CSV</span>
    </Button>
  );
}
