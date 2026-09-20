import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateHourlyOvertimeRate,
  calculateBpjsKesehatan,
  calculateBpjsKetenagakerjaan,
  calculateEmployeePayroll,
} from '../src/lib/payroll-calc.ts';

test('Payroll & Statutory Deductions Engine', async (t) => {
  await t.test('calculates 1/173 hourly overtime rate according to Depnaker', () => {
    // 6.000.000 / 173 = 34682.08...
    const hourly = calculateHourlyOvertimeRate(6000000);
    assert.equal(Math.round(hourly), 34682);
  });

  await t.test('calculates BPJS Kesehatan (1% with Rp 12.000.000 salary cap)', () => {
    // Salary 5jt -> 1% = 50.000
    const standard = calculateBpjsKesehatan(5000000);
    assert.equal(standard, 50000);

    // Salary 15jt -> capped at 12jt = 120.000
    const highSalary = calculateBpjsKesehatan(15000000);
    assert.equal(highSalary, 120000);
  });

  await t.test('calculates BPJS Ketenagakerjaan (JHT 2% uncapped, JP 1% capped at 10.042.300)', () => {
    // Salary 15jt:
    // JHT: 15jt * 2% = 300.000
    // JP: capped at 10.042.300 * 1% = 100.423
    const res = calculateBpjsKetenagakerjaan(15000000);
    assert.equal(res.jht, 300000);
    assert.equal(res.jp, 100423);
    assert.equal(res.total, 400423);
  });

  await t.test('calculates complete employee take-home pay with all allowances and penalties', () => {
    const result = calculateEmployeePayroll({
      baseSalary: 6000000,
      fixedAllowance: 1000000,
      overtimeHours: 10,
      overtimeMultiplier: 1.5,
      lateMinutesUnexcused: 30,
      lateDeductionPerMinute: 1000,
      absentDays: 1,
      absenceDivisor: 25,
    });

    // Overtime: 10 * (6000000/173) * 1.5 = 10 * 34682.08 * 1.5 = 520231
    assert.equal(result.overtimePay, 520231);

    // Gross: 6.000.000 + 1.000.000 + 520.231 = 7.520.231
    assert.equal(result.grossPay, 7520231);

    // BPJS Kes: 6.000.000 * 1% = 60.000
    assert.equal(result.bpjsKesehatanDeduction, 60000);

    // BPJS TK: JHT 6.000.000 * 2% = 120.000; JP 6.000.000 * 1% = 60.000 -> Total 180.000
    assert.equal(result.bpjsKetenagakerjaanDeduction, 180000);

    // Late penalty: 30 * 1000 = 30.000
    assert.equal(result.lateDeduction, 30000);

    // Absence penalty: 1 * (6000000 / 25) = 240.000
    assert.equal(result.absenceDeduction, 240000);

    // Net pay must be greater than 0 and less than gross
    assert.ok(result.netPay > 0);
    assert.ok(result.netPay < result.grossPay);
    assert.equal(result.netPay, result.grossPay - result.totalDeductions);
  });
});
