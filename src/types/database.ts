export type EmployeeRole =
  | 'admin'
  | 'management'
  | 'hr'
  | 'kepala_divisi'
  | 'spv'
  | 'staff';

export type EmployeeStatus = 'pending_claim' | 'active' | 'inactive';

export type GenderType = 'laki_laki' | 'perempuan';

export type MaritalStatusType = 'belum_kawin' | 'kawin' | 'cerai_hidup' | 'cerai_mati';

export type ContractType = 'pkwt' | 'pkwtt';

export type AttendanceStatus =
  | 'present'
  | 'late'
  | 'early_leave'
  | 'late_and_early_leave'
  | 'absent'
  | 'leave'
  | 'holiday';

export type AttendanceSource = 'fingerprint' | 'app_fallback';

export type AttendanceReviewStatus = 'auto_valid' | 'pending_review' | 'approved' | 'rejected';

export type RequestCategory = 'cuti' | 'izin' | 'lembur';

export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export type ApprovalDecision = 'pending' | 'approved' | 'rejected';

export type HolidayType = 'national' | 'company' | 'cuti_bersama';

export interface Division {
  id: string;
  name: string;
  kepala_divisi_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // joined fields
  kepala_divisi?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
}

export interface OfficeLocation {
  id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  radius_meters: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkScheduleGroup {
  id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkScheduleDay {
  id: string;
  schedule_group_id: string;
  day_of_week: number; // 0=Minggu, 1=Senin, ..., 6=Sabtu
  start_time: string;
  end_time: string;
  break_start_time: string | null;
  break_end_time: string | null;
  is_day_off: boolean;
  late_tolerance_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface Holiday {
  id: string;
  name: string;
  holiday_date: string;
  type: HolidayType;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface RequestType {
  id: string;
  code: string;
  name: string;
  category: RequestCategory;
  default_days: number | null;
  is_half_day: boolean;
  requires_attachment: boolean;
  attachment_mandatory_after_days: number | null;
  deducts_annual_leave: boolean;
  gender_restriction: GenderType | null;
  marital_status_restriction: MaritalStatusType | null;
  min_service_days: number;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  auth_user_id: string | null;
  full_name: string;
  email: string;
  phone_number: string | null;
  nik: string | null;
  npwp: string | null;
  gender: GenderType | null;
  place_of_birth: string | null;
  birth_date: string | null;
  religion: string | null;
  marital_status: MaritalStatusType | null;
  dependents_count: number;
  address: string | null;

  // Emergency contact
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;

  // Bank Info (for payroll transfer)
  bank_name: string | null;
  bank_account_no: string | null;
  bank_account_name: string | null;

  // Organization mapping
  role: EmployeeRole;
  division_id: string | null;
  spv_id: string | null;
  work_schedule_id: string | null;
  fingerprint_ac_no: string | null;

  // Account status & dates
  status: EmployeeStatus;
  join_date: string | null;
  photo_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;

  // Joined relations
  division?: Division | null;
  spv?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
  work_schedule?: WorkScheduleGroup | null;
}

export interface SystemSetting {
  id: string;
  setting_key: string;
  setting_value: string;
  description: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}
