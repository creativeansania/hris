import * as XLSX from 'xlsx';

export interface RawAttendanceRow {
  fingerprint_ac_no: string;
  employee_name_raw?: string;
  attendance_date: string; // YYYY-MM-DD
  on_duty?: string | null;  // HH:MM:SS
  off_duty?: string | null; // HH:MM:SS
  clock_in?: string | null;  // HH:MM:SS
  clock_out?: string | null; // HH:MM:SS
  late_minutes?: number;
  early_minutes?: number;
  ot_minutes?: number;
  department_raw?: string | null;
  is_absent?: boolean;
}

function parseDate(val: unknown): string | null {
  if (!val) return null;

  // If already string
  if (typeof val === 'string') {
    const s = val.trim();
    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    // YYYY/MM/DD
    if (/^\d{4}\/\d{2}\/\d{2}$/.test(s)) return s.replace(/\//g, '-');
    // DD/MM/YYYY
    const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dmy) {
      const day = dmy[1].padStart(2, '0');
      const month = dmy[2].padStart(2, '0');
      const year = dmy[3];
      return `${year}-${month}-${day}`;
    }
    // DateTime string: "2026-09-17 08:05:00"
    const dt = s.match(/^(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/);
    if (dt) return parseDate(dt[1]);
  }

  // If Excel serial number (date)
  if (typeof val === 'number') {
    const dateObj = XLSX.SSF.parse_date_code(val);
    if (dateObj) {
      const y = dateObj.y;
      const m = String(dateObj.m).padStart(2, '0');
      const d = String(dateObj.d).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return null;
}

function parseTime(val: unknown): string | null {
  if (!val && val !== 0) return null;

  if (typeof val === 'string') {
    const s = val.trim();
    if (!s || s === '-' || s === '00:00:00' || s === 'null') return null;

    // "08:15" -> "08:15:00"
    if (/^\d{1,2}:\d{2}$/.test(s)) {
      return `${s.padStart(5, '0')}:00`;
    }
    // "08:15:30"
    if (/^\d{1,2}:\d{2}:\d{2}$/.test(s)) {
      return s.padStart(8, '0');
    }
    // "2026-09-17 08:15:30"
    const parts = s.split(' ');
    if (parts.length > 1 && parts[1]) {
      return parseTime(parts[1]);
    }
  }

  // If fractional day time in Excel (e.g. 0.3368 = ~08:05)
  if (typeof val === 'number') {
    const totalSeconds = Math.round(val * 86400);
    const hours = Math.floor(totalSeconds / 3600) % 24;
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return null;
}

function parseMinutes(val: unknown): number {
  if (!val) return 0;
  if (typeof val === 'number') return Math.max(0, Math.round(val));
  if (typeof val === 'string') {
    const clean = val.replace(/[^0-9]/g, '');
    const num = parseInt(clean, 10);
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

export function parseFingerprintFile(buffer: Buffer | ArrayBuffer): RawAttendanceRow[] {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];

  const sheet = workbook.Sheets[sheetName];
  // Read as array of arrays or objects
  const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, {
    raw: true,
    defval: null,
  });

  if (!rawRows || rawRows.length === 0) return [];

  const normalizedRows: RawAttendanceRow[] = [];

  for (const row of rawRows) {
    const keys = Object.keys(row);
    const getVal = (...matches: string[]): unknown => {
      for (const m of matches) {
        const foundKey = keys.find((k) => k.toLowerCase().replace(/[^a-z0-9]/g, '') === m.toLowerCase().replace(/[^a-z0-9]/g, ''));
        if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null) {
          return row[foundKey];
        }
      }
      return null;
    };

    // ID / AC No
    const acNoRaw = getVal('acno', 'userid', 'pin', 'id', 'noid', 'badgenumber', 'no');
    if (!acNoRaw) continue; // Skip header / empty row

    const fingerprint_ac_no = String(acNoRaw).trim();

    // Employee name
    const nameRaw = getVal('name', 'nama', 'namakaryawan', 'employeename');
    const employee_name_raw = nameRaw ? String(nameRaw).trim() : undefined;

    // Date
    const dateRaw = getVal('date', 'tanggal', 'tgl', 'attendancedate', 'datetime', 'waktu');
    const attendance_date = parseDate(dateRaw);
    if (!attendance_date) continue; // Invalid date

    // Times
    const onDutyRaw = getVal('onduty', 'jadwalmasuk', 'jamkerja', 'timetable');
    const on_duty = parseTime(onDutyRaw);

    const offDutyRaw = getVal('offduty', 'jadwalpulang');
    const off_duty = parseTime(offDutyRaw);

    const clockInRaw = getVal('clockin', 'masuk', 'jammasuk', 'in', 'time1', 'scan1');
    const clock_in = parseTime(clockInRaw);

    const clockOutRaw = getVal('clockout', 'pulang', 'jampulang', 'out', 'time2', 'scan2');
    const clock_out = parseTime(clockOutRaw);

    // Late & Early
    const lateRaw = getVal('late', 'latemin', 'terlambat', 'telat');
    const late_minutes = parseMinutes(lateRaw);

    const earlyRaw = getVal('early', 'earlymin', 'pulangcepat', 'cepat');
    const early_minutes = parseMinutes(earlyRaw);

    const otRaw = getVal('ot', 'otmin', 'overtime', 'lembur');
    const ot_minutes = parseMinutes(otRaw);

    // Department
    const deptRaw = getVal('department', 'departemen', 'dept', 'divisi');
    const department_raw = deptRaw ? String(deptRaw).trim() : null;

    const is_absent = !clock_in && !clock_out;

    normalizedRows.push({
      fingerprint_ac_no,
      employee_name_raw,
      attendance_date,
      on_duty,
      off_duty,
      clock_in,
      clock_out,
      late_minutes,
      early_minutes,
      ot_minutes,
      department_raw,
      is_absent,
    });
  }

  return normalizedRows;
}
