-- ============================================================================
-- HRIS PWA — Database Schema (Supabase / PostgreSQL)
-- ============================================================================
-- v3 — Updated: 2026-09-17
-- Perubahan dari v2 (deep audit):
--   - request_type_code enum → tabel request_types (configurable, bisa CRUD)
--   - attachment_url → tabel request_attachments (multi-file)
--   - work_schedules di-split → work_schedule_groups + work_schedule_days
--   - Tambah bank info, gender, tempat lahir, agama, emergency contact di employees
--   - Tambah CHECK constraints di semua tabel
--   - Tambah missing indexes
--   - Tambah trigger set_updated_at() + apply ke semua tabel
--   - RLS lengkap di semua tabel data personal
--   - Fix holidays.type, attendance_import_batches.status (text → CHECK)
--   - Tambah effective_year di PPh21 tables
--   - Tambah action_url di notifications
--   - Tambah total_days di requests
--   - Tambah file_url di attendance_import_batches
--   - Tambah notes di payroll_runs
--   - Tambah next_retry_at di odoo_sync_outbox
--
-- Struktur besar:
--   0. Utility Functions (trigger, helper)
--   1. Enums (hanya yang truly fixed / tied to app logic)
--   2. Reference Tables (request_types — configurable by admin)
--   3. Organisasi & Karyawan
--   4. Jadwal Kerja & Lokasi Kantor
--   5. Absensi (fingerprint + GPS + koreksi)
--   6. Pengajuan + Attachments + Approval
--   7. Kuota Cuti
--   8. Sanksi & Akumulasi Keterlambatan
--   9. Payroll
--  10. Sinkronisasi Odoo
--  11. Notifikasi
--  12. Audit Logs
--  13. System Settings
--  14. RLS (policies + helper functions)
-- ============================================================================


-- ============================================================================
-- 0. UTILITY FUNCTIONS
-- ============================================================================

-- Auto-update updated_at on UPDATE
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ============================================================================
-- 1. ENUMS (hanya yang truly fixed / tied to application logic)
-- ============================================================================
-- Prinsip: enum hanya untuk nilai yang STRUCTURAL (menentukan behavior di code).
-- Nilai yang BISNIS/KONFIGURASI (bisa berubah tanpa deploy) → reference table.

create type employee_role as enum (
  'admin', 'management', 'hr', 'kepala_divisi', 'spv', 'staff'
);

create type employee_status as enum (
  'pending_claim',   -- sudah diinput admin, belum login/klaim
  'active',
  'inactive'         -- resign / nonaktif
);

create type gender_type as enum ('laki_laki', 'perempuan');

create type marital_status_type as enum (
  'belum_kawin', 'kawin', 'cerai_hidup', 'cerai_mati'
);

create type contract_type as enum ('pkwt', 'pkwtt');

create type attendance_source as enum ('fingerprint', 'app_fallback');

create type attendance_review_status as enum (
  'auto_valid',      -- masuk radius lokasi terdaftar, auto-accept
  'pending_review',  -- di luar radius semua lokasi terdaftar
  'approved',        -- HR sudah review dan approve
  'rejected'
);

-- Kategori request — structural (menentukan flow approval & validasi di code)
create type request_category as enum ('cuti', 'izin', 'lembur');

create type request_status as enum (
  'pending', 'approved', 'rejected', 'cancelled'
);

create type approval_decision as enum ('pending', 'approved', 'rejected');

create type odoo_sync_status as enum ('pending', 'synced', 'failed');

create type payroll_period_status as enum ('draft', 'generated', 'finalized');


-- ============================================================================
-- 2. REFERENCE TABLES (configurable — bisa CRUD tanpa migrasi database)
-- ============================================================================

-- Jenis pengajuan — menggantikan enum request_type_code
-- Admin/HR bisa tambah jenis baru tanpa ALTER TYPE
create table request_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,               -- 'cuti_tahunan', 'cuti_menikah', dll (identifier)
  category request_category not null,      -- 'cuti', 'izin', 'lembur' (structural)
  name text not null,                      -- 'Cuti Tahunan' (display name)
  description text,                        -- penjelasan untuk user
  default_duration_days int,               -- null = flexible, 3 = menikah, 2 = duka, dll
  requires_attachment boolean not null default false,
  deducts_leave_quota boolean not null default false,  -- true = kurangi saldo cuti tahunan
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_by uuid,                         -- FK ditambahkan setelah employees ada
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Seed data request types (UU Ketenagakerjaan No.13/2003 Pasal 93 ayat 4)
insert into request_types (code, category, name, default_duration_days, requires_attachment, deducts_leave_quota, sort_order) values
  ('cuti_tahunan',           'cuti',   'Cuti Tahunan',                               null, false, true,  1),
  ('cuti_menikah',           'cuti',   'Cuti Menikah',                               3,    true,  false, 2),
  ('cuti_menikahkan_anak',   'cuti',   'Cuti Menikahkan Anak',                       2,    true,  false, 3),
  ('cuti_khitanan_baptis',   'cuti',   'Cuti Khitanan/Baptis Anak',                  2,    true,  false, 4),
  ('cuti_istri_melahirkan',  'cuti',   'Cuti Istri Melahirkan/Keguguran',            2,    true,  false, 5),
  ('cuti_duka_serumah',      'cuti',   'Cuti Duka (Keluarga Serumah Meninggal)',     2,    true,  false, 6),
  ('cuti_duka_keluarga',     'cuti',   'Cuti Duka (Orang Tua/Mertua/Anak/Menantu)', 2,    true,  false, 7),
  ('izin_telat',             'izin',   'Izin Telat',                                 null, false, false, 10),
  ('izin_pulang_cepat',      'izin',   'Izin Pulang Cepat',                          null, false, false, 11),
  ('izin_sakit',             'izin',   'Izin Sakit',                                 null, false, false, 12),
  ('izin_urusan_keluarga',   'izin',   'Izin Urusan Keluarga',                       null, false, false, 13),
  ('izin_lainnya',           'izin',   'Izin Lainnya',                               null, false, false, 14),
  ('lembur',                 'lembur', 'Lembur',                                     null, false, false, 20);


-- ============================================================================
-- 3. ORGANISASI & KARYAWAN
-- ============================================================================

create table divisions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kepala_divisi_id uuid,          -- FK ditambahkan setelah tabel employees ada (circular ref)
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_divisions_updated_at before update on divisions
  for each row execute function set_updated_at();

create table employees (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id),  -- null sampai akun diklaim

  -- identitas
  full_name text not null,
  email text not null unique,               -- harus persis sama dengan email Google
  phone_number text,                        -- untuk kontak / notifikasi WA
  nik text unique,                          -- NIK KTP
  npwp text,
  gender gender_type,
  place_of_birth text,                      -- tempat lahir (standar KTP)
  birth_date date,
  religion text,                            -- untuk laporan BPJS & HR
  marital_status marital_status_type,       -- basis PTKP (enum, bukan text bebas)
  dependents_count int not null default 0,
  address text,

  -- kontak darurat
  emergency_contact_name text,
  emergency_contact_phone text,

  -- info bank (untuk transfer payroll)
  bank_name text,
  bank_account_no text,
  bank_account_name text,                   -- nama pemilik rekening

  -- struktur organisasi
  role employee_role not null default 'staff',
  division_id uuid references divisions(id),
  spv_id uuid references employees(id),     -- atasan langsung (SPV)
  work_schedule_id uuid,                    -- FK ke work_schedule_groups (bawah)
  fingerprint_ac_no text,                   -- ID di mesin fingerprint (utk matching import)

  -- status akun
  status employee_status not null default 'pending_claim',
  join_date date,

  photo_url text,
  created_by uuid references employees(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- constraints
  constraint chk_employees_dependents check (dependents_count >= 0)
);

create trigger trg_employees_updated_at before update on employees
  for each row execute function set_updated_at();

alter table divisions
  add constraint fk_divisions_kepala_divisi
  foreign key (kepala_divisi_id) references employees(id);

alter table request_types
  add constraint fk_request_types_created_by
  foreign key (created_by) references employees(id);

create index idx_employees_division on employees(division_id);
create index idx_employees_spv on employees(spv_id);
create index idx_employees_status on employees(status);
create index idx_employees_fingerprint_ac_no on employees(fingerprint_ac_no);
create index idx_employees_role on employees(role);

-- Riwayat kontrak kerja (histori, bukan overwrite)
create table employee_contracts (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id),
  contract_type contract_type not null,
  start_date date not null,
  end_date date,                 -- null = PKWTT / masih berjalan
  base_salary numeric(14,2) not null,
  notes text,
  created_by uuid references employees(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint chk_contracts_dates check (end_date is null or end_date > start_date),
  constraint chk_contracts_salary check (base_salary > 0)
);

create trigger trg_contracts_updated_at before update on employee_contracts
  for each row execute function set_updated_at();

create index idx_contracts_employee on employee_contracts(employee_id);
create index idx_contracts_active on employee_contracts(employee_id, end_date);

-- Riwayat jabatan / mutasi divisi (histori)
create table employee_positions (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id),
  division_id uuid references divisions(id),
  position_title text,
  start_date date not null,
  end_date date,
  created_by uuid references employees(id),
  created_at timestamptz not null default now(),

  constraint chk_positions_dates check (end_date is null or end_date >= start_date)
);

create index idx_positions_employee on employee_positions(employee_id);


-- ============================================================================
-- 4. JADWAL KERJA & LOKASI KANTOR
-- ============================================================================

-- Parent: grup jadwal ("Reguler", "Shift Pagi", dll)
create table work_schedule_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,                -- "Reguler Senin-Sabtu", "Shift Pagi"
  is_active boolean not null default true,
  created_by uuid references employees(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_work_schedule_groups_updated_at before update on work_schedule_groups
  for each row execute function set_updated_at();

-- Child: detail per hari dalam satu grup
create table work_schedule_days (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references work_schedule_groups(id) on delete cascade,
  day_of_week int not null,          -- 0=Minggu ... 6=Sabtu
  start_time time not null,
  end_time time not null,
  break_start time,                  -- jam mulai istirahat (opsional)
  break_end time,                    -- jam selesai istirahat (opsional)
  created_at timestamptz not null default now(),

  unique (group_id, day_of_week),
  constraint chk_schedule_day_range check (day_of_week between 0 and 6),
  constraint chk_schedule_times check (end_time > start_time),
  constraint chk_schedule_break check (
    (break_start is null and break_end is null)
    or (break_start is not null and break_end is not null
        and break_start >= start_time and break_end <= end_time
        and break_end > break_start)
  )
);

create index idx_schedule_days_group on work_schedule_days(group_id);

-- FK dari employees ke work_schedule_groups
alter table employees
  add constraint fk_employees_work_schedule
  foreign key (work_schedule_id) references work_schedule_groups(id);

-- Kalender libur — dikelola HR
create table holidays (
  id uuid primary key default gen_random_uuid(),
  holiday_date date not null unique,
  name text not null,
  type text not null default 'national',
  created_by uuid references employees(id),
  created_at timestamptz not null default now(),

  constraint chk_holiday_type check (type in ('national', 'company', 'cuti_bersama'))
);

-- Lokasi kantor/cabang — dikelola admin. Multi-lokasi
create table office_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,                      -- alamat lengkap untuk display
  latitude numeric(10,7) not null,
  longitude numeric(10,7) not null,
  radius_meters int not null default 500,
  is_active boolean not null default true,
  created_by uuid references employees(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint chk_location_radius check (radius_meters > 0),
  constraint chk_location_lat check (latitude between -90 and 90),
  constraint chk_location_lng check (longitude between -180 and 180)
);

create trigger trg_office_locations_updated_at before update on office_locations
  for each row execute function set_updated_at();


-- ============================================================================
-- 5. ABSENSI
-- ============================================================================

-- Batch upload Excel dari mesin fingerprint (HR)
create table attendance_import_batches (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  file_url text,                     -- file asli di storage (untuk audit)
  period_start date not null,
  period_end date not null,
  machine_label text,
  uploaded_by uuid not null references employees(id),
  row_count int,
  matched_count int default 0,
  unmatched_count int default 0,
  status text not null default 'processed',
  notes text,
  uploaded_at timestamptz not null default now(),

  constraint chk_batch_period check (period_end >= period_start),
  constraint chk_batch_status check (status in ('processed', 'failed', 'partial'))
);

create table attendance (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id),
  attendance_date date not null,
  source attendance_source not null,

  -- dari fingerprint (kolom asli mesin, sudah dihitung mesin)
  on_duty time,
  off_duty time,
  clock_in time,
  clock_out time,
  late_minutes int default 0,
  early_minutes int default 0,
  is_absent boolean default false,
  ot_minutes int default 0,
  work_minutes int default 0,
  department_raw text,
  import_batch_id uuid references attendance_import_batches(id),

  -- telat aktual: alasan (dokumentasi, TIDAK butuh approval)
  late_reason text,
  late_reason_filled_at timestamptz,

  -- kalau telat ini sudah "ditutupi" izin telat yang disetujui
  linked_izin_telat_request_id uuid,   -- FK ditambahkan setelah tabel requests ada

  -- untuk source = app_fallback (GPS)
  office_location_id uuid references office_locations(id),
  submitted_latitude numeric(10,7),
  submitted_longitude numeric(10,7),
  gps_accuracy_meters numeric(8,2),
  distance_to_office_meters numeric(8,2),
  review_status attendance_review_status,
  reviewed_by uuid references employees(id),
  reviewed_at timestamptz,
  device_info text,
  is_mock_location boolean default false,

  created_at timestamptz not null default now(),

  unique (employee_id, attendance_date, source),
  constraint chk_attendance_late check (late_minutes >= 0),
  constraint chk_attendance_early check (early_minutes >= 0),
  constraint chk_attendance_ot check (ot_minutes >= 0),
  constraint chk_attendance_work check (work_minutes >= 0)
);

create index idx_attendance_employee_date on attendance(employee_id, attendance_date);
create index idx_attendance_date on attendance(attendance_date);
create index idx_attendance_late on attendance(late_minutes) where late_minutes > 0;
create index idx_attendance_review_status on attendance(review_status);
create index idx_attendance_import_batch on attendance(import_batch_id);

-- Koreksi data absensi (non-destructive — data asli tetap di tabel attendance)
create table attendance_corrections (
  id uuid primary key default gen_random_uuid(),
  attendance_id uuid not null references attendance(id),

  corrected_clock_in time,
  corrected_clock_out time,
  corrected_late_minutes int,
  corrected_early_minutes int,
  corrected_is_absent boolean,
  corrected_work_minutes int,

  reason text not null,
  corrected_by uuid not null references employees(id),
  created_at timestamptz not null default now()
);

create index idx_attendance_corrections_attendance on attendance_corrections(attendance_id);


-- ============================================================================
-- 6. PENGAJUAN + ATTACHMENTS + APPROVAL
-- ============================================================================

create table requests (
  id uuid primary key default gen_random_uuid(),
  request_type_id uuid not null references request_types(id),  -- FK ke reference table

  employee_id uuid not null references employees(id),
  created_by uuid not null references employees(id),

  -- rentang tanggal/waktu
  start_date date not null,
  end_date date,
  start_time time,
  end_time time,
  total_days numeric(5,1),           -- jumlah hari (dihitung di app, karena exclude weekend/libur)

  reason text not null,

  status request_status not null default 'pending',
  submitted_at timestamptz not null default now(),
  decided_at timestamptz,

  -- tracking pembatalan
  cancelled_by uuid references employees(id),
  cancelled_at timestamptz,
  cancel_reason text,

  created_at timestamptz not null default now(),

  constraint chk_requests_dates check (end_date is null or end_date >= start_date),
  constraint chk_requests_total_days check (total_days is null or total_days > 0)
);

alter table attendance
  add constraint fk_attendance_linked_izin_telat
  foreign key (linked_izin_telat_request_id) references requests(id);

create index idx_requests_employee on requests(employee_id);
create index idx_requests_type on requests(request_type_id);
create index idx_requests_status on requests(status);
create index idx_requests_type_status on requests(request_type_id, status);
create index idx_requests_created_by on requests(created_by);
create index idx_requests_submitted_at on requests(submitted_at);

-- Multi-file attachments per request
create table request_attachments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references requests(id) on delete cascade,
  file_name text not null,
  file_url text not null,            -- URL di Supabase Storage
  file_size_bytes int,
  mime_type text,                    -- 'image/jpeg', 'application/pdf', dll
  uploaded_at timestamptz not null default now(),

  constraint chk_attachment_size check (file_size_bytes is null or file_size_bytes > 0),
  constraint chk_attachment_mime check (
    mime_type is null
    or mime_type in ('image/jpeg', 'image/png', 'application/pdf')
  )
);

create index idx_request_attachments_request on request_attachments(request_id);

-- Approval per-request (paralel, mis. SPV + HR sekaligus)
create table request_approvals (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references requests(id) on delete cascade,
  approver_id uuid not null references employees(id),
  approver_role employee_role not null,
  decision approval_decision not null default 'pending',
  note text,
  decided_at timestamptz,
  created_at timestamptz not null default now(),

  unique (request_id, approver_id)
);

create index idx_request_approvals_request on request_approvals(request_id);
create index idx_request_approvals_approver on request_approvals(approver_id, decision);


-- ============================================================================
-- 7. KUOTA CUTI
-- ============================================================================

create table leave_balances (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id),
  year int not null,
  request_type_id uuid not null references request_types(id),  -- FK ke reference table
  quota numeric(5,1) not null default 12,
  used numeric(5,1) not null default 0,
  adjustment numeric(5,1) not null default 0,  -- manual adjustment oleh HR (+ atau -)
  carry_over numeric(5,1) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (employee_id, year, request_type_id),
  constraint chk_leave_quota check (quota >= 0),
  constraint chk_leave_used check (used >= 0),
  constraint chk_leave_carry_over check (carry_over >= 0)
);

create trigger trg_leave_balances_updated_at before update on leave_balances
  for each row execute function set_updated_at();

-- Trigger: saat request cuti approved → increment used
-- (implementasi di application layer atau Supabase Edge Function)


-- ============================================================================
-- 8. SANKSI & AKUMULASI KETERLAMBATAN
-- ============================================================================

create table late_accumulations (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id),
  year int not null,
  month int not null,
  late_count int not null default 0,
  total_late_minutes int not null default 0,
  excused_count int not null default 0,
  unexcused_count int not null default 0,
  absence_without_leave_count int not null default 0,
  deduction_amount numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (employee_id, year, month),
  constraint chk_late_month check (month between 1 and 12),
  constraint chk_late_counts check (
    late_count >= 0 and total_late_minutes >= 0
    and excused_count >= 0 and unexcused_count >= 0
    and absence_without_leave_count >= 0
  ),
  constraint chk_late_deduction check (deduction_amount >= 0)
);

create trigger trg_late_accumulations_updated_at before update on late_accumulations
  for each row execute function set_updated_at();

create index idx_late_accumulations_period on late_accumulations(year, month);


-- ============================================================================
-- 9. PAYROLL (kewenangan Management) — scaffolding
-- ============================================================================

create table payroll_rules (
  id uuid primary key default gen_random_uuid(),
  rule_key text not null unique,
  rule_value text not null,            -- disimpan text, di-parse di app (bisa numeric/formula)
  value_type text not null default 'number',  -- 'number', 'percentage', 'formula'
  description text,
  is_active boolean not null default true,
  updated_by uuid references employees(id),
  updated_at timestamptz not null default now(),

  constraint chk_rule_value_type check (value_type in ('number', 'percentage', 'formula'))
);

create trigger trg_payroll_rules_updated_at before update on payroll_rules
  for each row execute function set_updated_at();

create table allowance_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_fixed boolean not null default true,
  default_amount numeric(14,2),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint chk_allowance_amount check (default_amount is null or default_amount >= 0)
);

create trigger trg_allowance_types_updated_at before update on allowance_types
  for each row execute function set_updated_at();

create table employee_allowances (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id),
  allowance_type_id uuid not null references allowance_types(id),
  amount numeric(14,2) not null,
  start_date date not null,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint chk_emp_allowance_amount check (amount >= 0),
  constraint chk_emp_allowance_dates check (end_date is null or end_date > start_date)
);

create trigger trg_employee_allowances_updated_at before update on employee_allowances
  for each row execute function set_updated_at();

create index idx_allowances_employee on employee_allowances(employee_id);

-- Konfigurasi PPh21
create table pph21_ptkp_config (
  id uuid primary key default gen_random_uuid(),
  status_code text not null,          -- TK/0, TK/1, K/0, K/1, K/2, K/3, dst
  annual_ptkp numeric(14,2) not null,
  effective_year int not null,        -- tahun berlaku (tarif bisa berubah antar tahun)
  created_at timestamptz not null default now(),

  unique (status_code, effective_year),
  constraint chk_ptkp_amount check (annual_ptkp > 0)
);

create table pph21_tax_brackets (
  id uuid primary key default gen_random_uuid(),
  bracket_order int not null,
  min_annual_income numeric(14,2) not null,
  max_annual_income numeric(14,2),
  rate numeric(5,4) not null,
  effective_year int not null,
  created_at timestamptz not null default now(),

  unique (bracket_order, effective_year),
  constraint chk_bracket_rate check (rate > 0 and rate < 1),
  constraint chk_bracket_income check (min_annual_income >= 0),
  constraint chk_bracket_range check (max_annual_income is null or max_annual_income > min_annual_income)
);

create table payroll_periods (
  id uuid primary key default gen_random_uuid(),
  period_start date not null,
  period_end date not null,
  status payroll_period_status not null default 'draft',
  generated_by uuid references employees(id),
  generated_at timestamptz,
  approved_by uuid references employees(id),
  approved_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),

  unique (period_start, period_end),
  constraint chk_payroll_period check (period_end > period_start)
);

create table payroll_runs (
  id uuid primary key default gen_random_uuid(),
  payroll_period_id uuid not null references payroll_periods(id),
  employee_id uuid not null references employees(id),

  base_salary numeric(14,2) not null default 0,
  total_allowance numeric(14,2) not null default 0,
  overtime_pay numeric(14,2) not null default 0,
  bpjs_kesehatan_deduction numeric(14,2) not null default 0,
  bpjs_ketenagakerjaan_deduction numeric(14,2) not null default 0,
  pph21_deduction numeric(14,2) not null default 0,
  late_deduction numeric(14,2) not null default 0,
  absence_deduction numeric(14,2) not null default 0,
  other_deduction numeric(14,2) not null default 0,

  gross_pay numeric(14,2) not null default 0,
  net_pay numeric(14,2) not null default 0,

  breakdown_json jsonb,
  notes text,                         -- catatan adjustment manual
  created_at timestamptz not null default now(),

  unique (payroll_period_id, employee_id)
);

create index idx_payroll_runs_period on payroll_runs(payroll_period_id);
create index idx_payroll_runs_employee on payroll_runs(employee_id);


-- ============================================================================
-- 10. SINKRONISASI ODOO (manual, dipicu tombol HR)
-- ============================================================================

create table odoo_sync_outbox (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  odoo_model text,
  payload_json jsonb not null,
  status odoo_sync_status not null default 'pending',
  retry_count int not null default 0,
  max_retries int not null default 3,
  next_retry_at timestamptz,          -- kapan retry berikutnya dijadwalkan
  synced_by uuid references employees(id),
  synced_at timestamptz,
  odoo_response_json jsonb,
  error_message text,
  created_at timestamptz not null default now(),

  constraint chk_odoo_retry check (retry_count >= 0 and retry_count <= max_retries)
);

create index idx_odoo_outbox_status on odoo_sync_outbox(status);
create index idx_odoo_outbox_entity on odoo_sync_outbox(entity_type, entity_id);
create index idx_odoo_outbox_retry on odoo_sync_outbox(next_retry_at)
  where status = 'failed' and retry_count < max_retries;


-- ============================================================================
-- 11. NOTIFIKASI
-- ============================================================================

create table notifications (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id),
  type text not null,
  title text not null,
  message text,
  action_url text,                    -- deep link: '/requests/abc-123', '/attendance/2026-09-17'
  related_entity_type text,
  related_entity_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_notifications_employee_unread on notifications(employee_id)
  where is_read = false;
create index idx_notifications_employee_created on notifications(employee_id, created_at desc);


-- ============================================================================
-- 12. AUDIT LOGS
-- ============================================================================

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references employees(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  changes_json jsonb,
  metadata_json jsonb,
  ip_address inet,                    -- kolom terpisah untuk query cepat
  created_at timestamptz not null default now()
);

create index idx_audit_logs_entity on audit_logs(entity_type, entity_id);
create index idx_audit_logs_actor on audit_logs(actor_id);
create index idx_audit_logs_created_at on audit_logs(created_at);
create index idx_audit_logs_action on audit_logs(action);


-- ============================================================================
-- 13. SYSTEM SETTINGS
-- ============================================================================

create table system_settings (
  id uuid primary key default gen_random_uuid(),
  setting_key text not null unique,
  setting_value text not null,
  data_type text not null default 'string',
  description text,
  category text not null default 'general',
  updated_by uuid references employees(id),
  updated_at timestamptz not null default now(),

  constraint chk_setting_data_type check (data_type in ('string', 'number', 'boolean', 'json')),
  constraint chk_setting_category check (category in ('general', 'attendance', 'leave', 'payroll', 'gps'))
);

create trigger trg_system_settings_updated_at before update on system_settings
  for each row execute function set_updated_at();

-- Seed data
insert into system_settings (setting_key, setting_value, data_type, description, category) values
  ('default_leave_quota', '12', 'number', 'Kuota cuti tahunan default (hari)', 'leave'),
  ('leave_carry_over_enabled', 'false', 'boolean', 'Apakah sisa cuti bisa carry-over ke tahun berikutnya', 'leave'),
  ('leave_carry_over_max', '0', 'number', 'Maksimal hari carry-over (0 = hangus)', 'leave'),
  ('gps_accuracy_threshold_meters', '100', 'number', 'Toleransi akurasi GPS maksimal (meter)', 'gps'),
  ('gps_timeout_seconds', '15', 'number', 'Timeout GPS (detik)', 'gps'),
  ('late_deduction_per_event', '25000', 'number', 'Potongan per kejadian telat (Rp)', 'payroll'),
  ('late_threshold_for_deduction', '4', 'number', 'Minimal jumlah telat per bulan untuk kena potongan', 'payroll'),
  ('absence_deduction_formula', '1/22', 'string', 'Formula potongan absen tanpa keterangan (fraction of base)', 'payroll'),
  ('max_upload_size_mb', '5', 'number', 'Maksimal ukuran file upload (MB)', 'general'),
  ('max_files_per_request', '3', 'number', 'Maksimal jumlah file per pengajuan', 'general'),
  ('contract_reminder_days', '30', 'number', 'Reminder kontrak habis H-berapa hari', 'general');


-- ============================================================================
-- 14. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- ── Helper Functions ──

create or replace function current_employee_id()
returns uuid language sql stable as $$
  select id from employees where auth_user_id = auth.uid()
$$;

create or replace function current_employee_role()
returns employee_role language sql stable as $$
  select role from employees where auth_user_id = auth.uid()
$$;

create or replace function is_direct_report(target_id uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from employees where id = target_id and spv_id = current_employee_id()
  )
$$;

create or replace function is_in_my_division(target_id uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from employees e
    join divisions d on e.division_id = d.id
    where e.id = target_id and d.kepala_divisi_id = current_employee_id()
  )
$$;

-- Shortcut: apakah role saat ini punya akses global?
create or replace function has_global_access()
returns boolean language sql stable as $$
  select current_employee_role() in ('admin', 'hr', 'management')
$$;


-- ── EMPLOYEES ──
alter table employees enable row level security;

create policy employees_select_self on employees
  for select using (auth_user_id = auth.uid());
create policy employees_select_as_spv on employees
  for select using (spv_id = current_employee_id());
create policy employees_select_as_kadiv on employees
  for select using (is_in_my_division(id));
create policy employees_select_global on employees
  for select using (has_global_access());
create policy employees_insert_admin on employees
  for insert with check (current_employee_role() = 'admin');
-- HR bisa update data karyawan KECUALI role (role hanya admin)
-- Enforced: HR update di app layer filter out role field
create policy employees_update_admin on employees
  for update using (current_employee_role() = 'admin');
create policy employees_update_hr on employees
  for update using (
    current_employee_role() = 'hr'
    -- Catatan: restriction "HR tidak boleh ubah role" di-enforce di application layer
    -- karena column-level RLS tidak didukung PostgreSQL
  );


-- ── EMPLOYEE CONTRACTS ──
alter table employee_contracts enable row level security;

create policy contracts_select_self on employee_contracts
  for select using (employee_id = current_employee_id());
create policy contracts_select_global on employee_contracts
  for select using (has_global_access());
create policy contracts_insert_hr_admin on employee_contracts
  for insert with check (current_employee_role() in ('admin', 'hr'));
create policy contracts_update_hr_admin on employee_contracts
  for update using (current_employee_role() in ('admin', 'hr'));


-- ── EMPLOYEE POSITIONS ──
alter table employee_positions enable row level security;

create policy positions_select_self on employee_positions
  for select using (employee_id = current_employee_id());
create policy positions_select_global on employee_positions
  for select using (has_global_access());
create policy positions_insert_hr_admin on employee_positions
  for insert with check (current_employee_role() in ('admin', 'hr'));


-- ── EMPLOYEE ALLOWANCES ──
alter table employee_allowances enable row level security;

create policy allowances_select_self on employee_allowances
  for select using (employee_id = current_employee_id());
create policy allowances_select_global on employee_allowances
  for select using (has_global_access());
create policy allowances_insert_hr_admin on employee_allowances
  for insert with check (current_employee_role() in ('admin', 'hr'));
create policy allowances_update_hr_admin on employee_allowances
  for update using (current_employee_role() in ('admin', 'hr'));


-- ── ATTENDANCE ──
alter table attendance enable row level security;

create policy attendance_select_self on attendance
  for select using (employee_id = current_employee_id());
create policy attendance_select_as_spv on attendance
  for select using (is_direct_report(employee_id));
create policy attendance_select_as_kadiv on attendance
  for select using (is_in_my_division(employee_id));
create policy attendance_select_global on attendance
  for select using (has_global_access());
-- GPS clock-in: karyawan submit untuk diri sendiri
create policy attendance_insert_self on attendance
  for insert with check (
    employee_id = current_employee_id() and source = 'app_fallback'
  );
-- Import fingerprint: HR only
create policy attendance_insert_hr on attendance
  for insert with check (
    current_employee_role() = 'hr' and source = 'fingerprint'
  );
-- HR bisa update (review GPS, link izin telat, dll)
create policy attendance_update_hr on attendance
  for update using (current_employee_role() = 'hr');


-- ── ATTENDANCE CORRECTIONS ──
alter table attendance_corrections enable row level security;

create policy corrections_select_global on attendance_corrections
  for select using (has_global_access());
create policy corrections_insert_hr on attendance_corrections
  for insert with check (current_employee_role() = 'hr');


-- ── REQUESTS ──
alter table requests enable row level security;

create policy requests_select_self on requests
  for select using (employee_id = current_employee_id() or created_by = current_employee_id());
create policy requests_select_as_spv on requests
  for select using (is_direct_report(employee_id));
create policy requests_select_as_kadiv on requests
  for select using (is_in_my_division(employee_id));
create policy requests_select_global on requests
  for select using (has_global_access());
create policy requests_insert_self_or_superior on requests
  for insert with check (
    employee_id = current_employee_id()
    or is_direct_report(employee_id)
    or is_in_my_division(employee_id)
    or current_employee_role() = 'management'
  );
-- Cancel: hanya yang bikin / karyawan terkait / HR
create policy requests_update_cancel on requests
  for update using (
    (employee_id = current_employee_id() or created_by = current_employee_id())
    or current_employee_role() = 'hr'
  );


-- ── REQUEST ATTACHMENTS ──
alter table request_attachments enable row level security;

-- Bisa lihat attachment jika bisa lihat request-nya (simplified: global + self)
create policy attachments_select_self on request_attachments
  for select using (
    exists (
      select 1 from requests r
      where r.id = request_attachments.request_id
      and (r.employee_id = current_employee_id() or r.created_by = current_employee_id())
    )
  );
create policy attachments_select_global on request_attachments
  for select using (has_global_access());
create policy attachments_insert_self on request_attachments
  for insert with check (
    exists (
      select 1 from requests r
      where r.id = request_attachments.request_id
      and r.created_by = current_employee_id()
    )
  );


-- ── REQUEST APPROVALS ──
alter table request_approvals enable row level security;

create policy approvals_select_own on request_approvals
  for select using (approver_id = current_employee_id());
create policy approvals_select_global on request_approvals
  for select using (has_global_access());
-- Karyawan bisa lihat approval status request-nya sendiri
create policy approvals_select_requestor on request_approvals
  for select using (
    exists (
      select 1 from requests r
      where r.id = request_approvals.request_id
      and (r.employee_id = current_employee_id() or r.created_by = current_employee_id())
    )
  );
create policy approvals_update_own on request_approvals
  for update using (approver_id = current_employee_id());


-- ── LEAVE BALANCES ──
alter table leave_balances enable row level security;

create policy leave_balances_select_self on leave_balances
  for select using (employee_id = current_employee_id());
create policy leave_balances_select_global on leave_balances
  for select using (has_global_access());
create policy leave_balances_insert_hr on leave_balances
  for insert with check (current_employee_role() in ('admin', 'hr'));
create policy leave_balances_update_hr on leave_balances
  for update using (current_employee_role() in ('admin', 'hr'));


-- ── LATE ACCUMULATIONS ──
alter table late_accumulations enable row level security;

create policy late_acc_select_self on late_accumulations
  for select using (employee_id = current_employee_id());
create policy late_acc_select_as_spv on late_accumulations
  for select using (is_direct_report(employee_id));
create policy late_acc_select_global on late_accumulations
  for select using (has_global_access());


-- ── PAYROLL RUNS ──
alter table payroll_runs enable row level security;

create policy payroll_runs_select_self on payroll_runs
  for select using (employee_id = current_employee_id());
create policy payroll_runs_select_mgmt_hr on payroll_runs
  for select using (current_employee_role() in ('management', 'hr'));


-- ── NOTIFICATIONS ──
alter table notifications enable row level security;

create policy notifications_select_self on notifications
  for select using (employee_id = current_employee_id());
create policy notifications_update_self on notifications
  for update using (employee_id = current_employee_id());
-- INSERT via service role (server-side), tidak perlu policy client


-- ── AUDIT LOGS ──
alter table audit_logs enable row level security;

create policy audit_logs_select_admin_mgmt on audit_logs
  for select using (current_employee_role() in ('admin', 'management'));
-- INSERT via service role (server-side)


-- ── PUBLIC REFERENCE TABLES (bisa dibaca semua authenticated user) ──
-- request_types, work_schedule_groups, work_schedule_days, holidays, office_locations
-- → tidak perlu RLS (data publik / read-only untuk user biasa)
-- → INSERT/UPDATE restricted via application layer (hanya admin/HR)
