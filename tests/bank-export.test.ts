import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateBcaPayrollCsv,
  generateMandiriPayrollCsv,
} from '../src/lib/bank-export.ts';
import type { BankTransferRecord } from '../src/lib/bank-export.ts';

test('Bank Payroll Export Engine', async (t) => {
  const sampleRecords: BankTransferRecord[] = [
    {
      employeeName: 'Budi Santoso',
      bankAccountNo: '123-456-7890',
      bankName: 'BCA',
      netPay: 7500000,
      email: 'budi@ansania.co.id',
    },
    {
      employeeName: 'Siti Rahma',
      bankAccountNo: '9876543210',
      bankName: 'Mandiri',
      netPay: 6200000,
      email: 'siti@ansania.co.id',
    },
  ];

  await t.test('generates valid BCA Payroll CSV format', () => {
    const csv = generateBcaPayrollCsv(sampleRecords, 'September 2026');
    assert.ok(csv.includes('NO_REKENING,NAMA_PENERIMA,NOMINAL,BERITA,EMAIL'));
    assert.ok(csv.includes('"1234567890","Budi Santoso",7500000,"Gaji September 2026","budi@ansania.co.id"'));
  });

  await t.test('generates valid Mandiri MCM CSV format', () => {
    const csv = generateMandiriPayrollCsv(sampleRecords, 'September 2026');
    assert.ok(csv.includes('BEN_ACCOUNT,BEN_NAME,AMOUNT,CURRENCY,REMARK1,REMARK2,BEN_EMAIL'));
    assert.ok(csv.includes('"9876543210","Siti Rahma",6200000,"IDR","PAYROLL","September 2026","siti@ansania.co.id"'));
  });
});
