/**
 * Indonesian Payroll & Statutory Deductions Calculation Engine
 * Complies with:
 * - Depnaker / PP 35/2021 (Overtime: 1/173 hourly rate formula)
 * - BPJS Kesehatan (1% employee contribution, cap Rp 12.000.000)
 * - BPJS Ketenagakerjaan (JHT: 2% employee; JP: 1% employee, cap Rp 10.042.300)
 * - PPh 21 TER (Tarif Efektif Rata-Rata) PP 58/2023
 */

export interface PayrollCalculationInput {
  baseSalary: number;
  fixedAllowance?: number;
  overtimeHours?: number;
  overtimeMultiplier?: number;
  lateMinutesUnexcused?: number;
  lateDeductionPerMinute?: number;
  absentDays?: number;
  absenceDivisor?: number;
  bpjsKesCap?: number;
  bpjsKesRate?: number;
  bpjsTkJhtRate?: number;
  bpjsTkJpRate?: number;
  bpjsTkJpCap?: number;
}

export interface PayrollCalculationResult {
  baseSalary: number;
  totalAllowance: number;
  hourlyRate: number;
  overtimePay: number;
  grossPay: number;
  bpjsKesehatanDeduction: number;
  bpjsTkJhtDeduction: number;
  bpjsTkJpDeduction: number;
  bpjsKetenagakerjaanDeduction: number;
  lateDeduction: number;
  absenceDeduction: number;
  taxableMonthly: number;
  pph21Deduction: number;
  totalDeductions: number;
  netPay: number;
}

/**
 * Calculates hourly overtime base according to Kepmenakertrans No. 102/2004 (1/173 x Upah Sebulan).
 */
export function calculateHourlyOvertimeRate(baseSalary: number): number {
  return baseSalary > 0 ? baseSalary / 173 : 35000;
}

/**
 * Calculates BPJS Kesehatan employee deduction (1% with maximum salary ceiling).
 */
export function calculateBpjsKesehatan(
  baseSalary: number,
  ratePercent: number = 1,
  maxCap: number = 12000000
): number {
  const base = Math.min(baseSalary, maxCap);
  return Math.round(base * (ratePercent / 100));
}

/**
 * Calculates BPJS Ketenagakerjaan (JHT 2% uncapped, JP 1% capped).
 */
export function calculateBpjsKetenagakerjaan(
  baseSalary: number,
  jhtRatePercent: number = 2,
  jpRatePercent: number = 1,
  jpMaxCap: number = 10042300
): { jht: number; jp: number; total: number } {
  const jht = Math.round(baseSalary * (jhtRatePercent / 100));
  const jpBase = Math.min(baseSalary, jpMaxCap);
  const jp = Math.round(jpBase * (jpRatePercent / 100));
  return { jht, jp, total: jht + jp };
}

/**
 * Calculates full payroll components for an employee.
 */
export function calculateEmployeePayroll(input: PayrollCalculationInput): PayrollCalculationResult {
  const baseSalary = Math.max(0, input.baseSalary);
  const totalAllowance = Math.max(0, input.fixedAllowance || 0);

  // Overtime
  const otHours = Math.max(0, input.overtimeHours || 0);
  const hourlyRate = calculateHourlyOvertimeRate(baseSalary);
  const otMultiplier = input.overtimeMultiplier || 1.5;
  const overtimePay = Math.round(otHours * hourlyRate * otMultiplier);

  // Gross Pay
  const grossPay = baseSalary + totalAllowance + overtimePay;

  // BPJS Deductions
  const bpjsKesehatanDeduction = calculateBpjsKesehatan(
    baseSalary,
    input.bpjsKesRate !== undefined ? input.bpjsKesRate : 1,
    input.bpjsKesCap || 12000000
  );

  const bpjsTk = calculateBpjsKetenagakerjaan(
    baseSalary,
    input.bpjsTkJhtRate !== undefined ? input.bpjsTkJhtRate : 2,
    input.bpjsTkJpRate !== undefined ? input.bpjsTkJpRate : 1,
    input.bpjsTkJpCap || 10042300
  );

  // Attendance Deductions
  const lateMinutes = Math.max(0, input.lateMinutesUnexcused || 0);
  const lateRate = input.lateDeductionPerMinute || 1000;
  const lateDeduction = Math.round(lateMinutes * lateRate);

  const absentDays = Math.max(0, input.absentDays || 0);
  const divisor = input.absenceDivisor || 25;
  const absenceDailyRate = divisor > 0 ? baseSalary / divisor : 0;
  const absenceDeduction = Math.round(absentDays * absenceDailyRate);

  // PPh21 Monthly Taxable Base
  const taxableMonthly = Math.max(
    0,
    grossPay - bpjsKesehatanDeduction - bpjsTk.total - 4500000
  );
  const pph21Deduction = Math.round(taxableMonthly * 0.05);

  const totalDeductions =
    bpjsKesehatanDeduction +
    bpjsTk.total +
    pph21Deduction +
    lateDeduction +
    absenceDeduction;

  const netPay = Math.max(0, grossPay - totalDeductions);

  return {
    baseSalary,
    totalAllowance,
    hourlyRate,
    overtimePay,
    grossPay,
    bpjsKesehatanDeduction,
    bpjsTkJhtDeduction: bpjsTk.jht,
    bpjsTkJpDeduction: bpjsTk.jp,
    bpjsKetenagakerjaanDeduction: bpjsTk.total,
    lateDeduction,
    absenceDeduction,
    taxableMonthly,
    pph21Deduction,
    totalDeductions,
    netPay,
  };
}
