/**
 * Bank Payroll Batch Export Utilities for Indonesian Corporate Banking.
 * Supports:
 * - BCA Payroll / KlikBCA Bisnis CSV Batch Format
 * - Mandiri Cash Management (MCM) CSV Batch Format
 */

export interface BankTransferRecord {
  employeeName: string;
  bankAccountNo: string;
  bankName: string;
  netPay: number;
  email?: string;
  nik?: string;
  notes?: string;
}

/**
 * Generates CSV string for BCA KlikBCA Bisnis batch transfer.
 * Typical standard columns:
 * [Beneficiary Account, Beneficiary Name, Amount, Description, Transfer Type]
 */
export function generateBcaPayrollCsv(
  records: BankTransferRecord[],
  periodLabel: string
): string {
  const headers = ['NO_REKENING', 'NAMA_PENERIMA', 'NOMINAL', 'BERITA', 'EMAIL'];
  const rows = records.map((r) => {
    const cleanAccount = (r.bankAccountNo || '').replace(/[^0-9]/g, '');
    const cleanName = (r.employeeName || '').replace(/[,"]/g, '').substring(0, 35);
    const amount = Math.round(r.netPay || 0);
    const note = `Gaji ${periodLabel}`.substring(0, 30);
    const email = r.email || '';
    return `"${cleanAccount}","${cleanName}",${amount},"${note}","${email}"`;
  });

  return [headers.join(','), ...rows].join('\r\n');
}

/**
 * Generates CSV string for Mandiri Corporate Cash Management (MCM).
 * Columns:
 * [Ben Account Number, Ben Name, Amount, Currency, Remark 1, Remark 2, Ben Email]
 */
export function generateMandiriPayrollCsv(
  records: BankTransferRecord[],
  periodLabel: string
): string {
  const headers = [
    'BEN_ACCOUNT',
    'BEN_NAME',
    'AMOUNT',
    'CURRENCY',
    'REMARK1',
    'REMARK2',
    'BEN_EMAIL',
  ];

  const rows = records.map((r) => {
    const cleanAccount = (r.bankAccountNo || '').replace(/[^0-9]/g, '');
    const cleanName = (r.employeeName || '').replace(/[,"]/g, '').substring(0, 35);
    const amount = Math.round(r.netPay || 0);
    const remark1 = `PAYROLL`.substring(0, 20);
    const remark2 = `${periodLabel}`.substring(0, 20);
    const email = r.email || '';
    return `"${cleanAccount}","${cleanName}",${amount},"IDR","${remark1}","${remark2}","${email}"`;
  });

  return [headers.join(','), ...rows].join('\r\n');
}

/**
 * Helper to trigger browser file download of CSV content.
 */
export function downloadCsvFile(csvContent: string, fileName: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
