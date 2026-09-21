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
  default_duration_days?: number | null;
  default_days?: number | null;
  is_half_day?: boolean;
  requires_attachment: boolean;
  attachment_mandatory_after_days?: number | null;
  deducts_leave_quota?: boolean;
  deducts_annual_leave?: boolean;
  gender_restriction?: GenderType | null;
  marital_status_restriction?: MaritalStatusType | null;
  min_service_days?: number;
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
  contracts?: EmployeeContract[];
  positions?: EmployeePosition[];
}

export interface EmployeeContract {
  id: string;
  employee_id: string;
  contract_type: ContractType;
  start_date: string;
  end_date: string | null;
  base_salary: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // joined fields
  created_by_user?: {
    id: string;
    full_name: string;
  } | null;
  days_remaining?: number | null;
  status_urgency?: 'critical' | 'warning' | 'safe' | 'permanent' | 'expired';
}

export interface ExpiringContractItem {
  contract: EmployeeContract;
  employee: Employee;
}

export interface EmployeePosition {
  id: string;
  employee_id: string;
  division_id: string | null;
  position_title: string | null;
  start_date: string;
  end_date: string | null;
  created_by: string | null;
  created_at: string;
  // joined fields
  division?: Division | null;
  created_by_user?: {
    id: string;
    full_name: string;
  } | null;
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

export interface RequestAttachment {
  id: string;
  request_id: string;
  file_name: string;
  file_url: string;
  file_size_bytes: number | null;
  mime_type: string | null;
  uploaded_at: string;
}

export interface RequestApproval {
  id: string;
  request_id: string;
  approver_id: string;
  approver_role: EmployeeRole;
  decision: ApprovalDecision;
  note: string | null;
  decided_at: string | null;
  created_at: string;
  // joined fields
  approver?: {
    id: string;
    full_name: string;
    email: string;
    role: EmployeeRole;
    photo_url?: string | null;
  } | null;
}

export interface RequestItem {
  id: string;
  request_type_id: string;
  employee_id: string;
  created_by: string;
  start_date: string;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  total_days: number | null;
  reason: string;
  status: RequestStatus;
  submitted_at: string;
  decided_at: string | null;
  cancelled_by: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  created_at: string;
  // joined fields
  employee?: {
    id: string;
    full_name: string;
    email: string;
    role: EmployeeRole;
    photo_url?: string | null;
    division?: {
      id: string;
      name: string;
    } | null;
  } | null;
  created_by_user?: {
    id: string;
    full_name: string;
    role: EmployeeRole;
  } | null;
  request_type?: RequestType | null;
  approvals?: RequestApproval[];
  attachments?: RequestAttachment[];
}

export interface LeaveBalance {
  id: string;
  employee_id: string;
  year: number;
  request_type_id: string;
  quota: number;
  used: number;
  adjustment: number;
  carry_over: number;
  created_at: string;
  updated_at: string;
  // virtual / joined fields
  remaining?: number;
  employee?: {
    id: string;
    full_name: string;
    email: string;
    role: EmployeeRole;
    division?: {
      name: string;
    } | null;
  } | null;
  request_type?: RequestType | null;
}

export type OdooSyncStatus = 'pending' | 'synced' | 'failed';

export interface OdooSyncOutboxItem {
  id: string;
  entity_type: string; // 'attendance' | 'leave' | 'overtime' | 'employee'
  entity_id: string;
  odoo_model: string | null;
  payload_json: Record<string, any>;
  status: OdooSyncStatus;
  retry_count: number;
  max_retries: number;
  next_retry_at: string | null;
  synced_by: string | null;
  synced_at: string | null;
  odoo_response_json: Record<string, any> | null;
  error_message: string | null;
  created_at: string;
  // joined fields
  employee?: {
    id: string;
    full_name: string;
    nik: string;
    email: string;
  } | null;
  synced_by_user?: {
    id: string;
    full_name: string;
  } | null;
}

export type PayrollPeriodStatus = 'draft' | 'generated' | 'finalized';

export interface PayrollRule {
  id: string;
  rule_key: string;
  rule_value: string;
  value_type: 'number' | 'percentage' | 'formula';
  description: string | null;
  is_active: boolean;
  updated_by: string | null;
  updated_at: string;
}

export interface PayrollPeriod {
  id: string;
  period_start: string;
  period_end: string;
  status: PayrollPeriodStatus;
  generated_by: string | null;
  generated_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  notes: string | null;
  created_at: string;
  // joined fields
  generated_by_user?: {
    id: string;
    full_name: string;
  } | null;
  approved_by_user?: {
    id: string;
    full_name: string;
  } | null;
  runs_count?: number;
  total_net_pay?: number;
}

export interface PayrollRun {
  id: string;
  payroll_period_id: string;
  employee_id: string;
  base_salary: number;
  total_allowance: number;
  overtime_pay: number;
  bpjs_kesehatan_deduction: number;
  bpjs_ketenagakerjaan_deduction: number;
  pph21_deduction: number;
  late_deduction: number;
  absence_deduction: number;
  other_deduction: number;
  gross_pay: number;
  net_pay: number;
  breakdown_json: Record<string, any> | null;
  notes: string | null;
  created_at: string;
  // joined fields
  employee?: {
    id: string;
    nik: string;
    full_name: string;
    email: string;
    role: EmployeeRole;
    bank_name?: string | null;
    bank_account_no?: string | null;
    bank_account_name?: string | null;
    division?: {
      id: string;
      name: string;
    } | null;
  } | null;
  payroll_period?: PayrollPeriod | null;
}

export type NotificationType =
  | 'request_submitted'
  | 'request_approved'
  | 'request_rejected'
  | 'overtime_assigned'
  | 'attendance_late'
  | 'attendance_late_repeat'
  | 'contract_expiring'
  | 'leave_quota_warning'
  | 'odoo_sync_completed'
  | 'payroll_generated'
  | 'system_announcement';

export interface NotificationItem {
  id: string;
  employee_id: string;
  type: NotificationType | string;
  title: string;
  message: string | null;
  action_url: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  is_read: boolean;
  created_at: string;
  employee?: {
    id: string;
    full_name: string;
    email: string;
    role: EmployeeRole;
  } | null;
}

export interface GpsReviewItem {
  id: string;
  employee_id: string;
  attendance_date: string;
  clock_in: string | null;
  clock_out: string | null;
  latitude: number | null;
  longitude: number | null;
  submitted_latitude?: number | null;
  submitted_longitude?: number | null;
  distance_meters?: number | null;
  distance_to_office_meters?: number | null;
  gps_accuracy_meters?: number | null;
  review_status?: AttendanceReviewStatus | string | null;
  notes?: string | null;
  late_reason?: string | null;
  device_info?: string | null;
  is_mock_location?: boolean | null;
  employee?: {
    id: string;
    full_name: string;
    email: string;
    role: string;
    nik?: string | null;
    division?: { name: string } | null;
  } | null;
  office?: {
    name: string;
    address?: string | null;
    radius_meters?: number | null;
  } | null;
  location?: {
    name: string;
  } | null;
  reviewer?: {
    full_name: string;
    email: string;
  } | null;
}

export interface IzinTelatItem {
  id: string;
  employee_id?: string;
  start_date: string;
  request_date?: string;
  start_time: string | null;
  end_time: string | null;
  total_days?: number | null;
  late_minutes?: number | null;
  reason: string;
  notes?: string | null;
  status: RequestStatus | string;
  submitted_at: string;
  decided_at?: string | null;
  employee?: {
    id?: string;
    full_name: string;
    email?: string;
    role?: string;
    division?: { name: string } | null;
  } | null;
  request_type?: { name: string; code: string } | null;
  approvals?: Array<{
    id?: string;
    decision: ApprovalDecision | string;
    note: string | null;
    decided_at?: string | null;
    approver?: { full_name: string } | null;
  }>;
}

export interface LateAccumulationItem {
  id: string;
  employee_id: string;
  year: number;
  month: number;
  total_late_count?: number;
  late_count?: number;
  excused_count?: number;
  unexcused_count?: number;
  total_late_minutes: number;
  excused_late_minutes?: number;
  penalty_multiplier?: number;
  penalty_amount?: number;
  deduction_amount?: number;
  employee?: {
    id: string;
    full_name: string;
    email: string;
    role: string;
    nik?: string | null;
    division_id?: string | null;
    division?: { name: string } | null;
  } | null;
}

export interface AttendanceImportBatchItem {
  id: string;
  file_name: string;
  period_start?: string;
  period_end?: string;
  total_rows?: number;
  matched_count?: number;
  unmatched_count?: number;
  duplicate_count?: number;
  inserted_count?: number;
  skipped_count?: number;
  uploaded_at?: string;
  created_at: string;
  uploader?: {
    full_name: string;
    email: string;
  } | null;
  uploaded_by_user?: {
    full_name: string;
    email?: string;
  } | null;
}

export interface AttendanceCorrectionItem {
  id: string;
  attendance_id: string;
  previous_clock_in: string | null;
  previous_clock_out: string | null;
  new_clock_in: string | null;
  new_clock_out: string | null;
  correction_reason?: string;
  reason?: string;
  created_at: string;
  corrector?: {
    full_name: string;
    email: string;
    role: string;
  } | null;
  modifier?: {
    full_name: string;
    email?: string;
    role?: string;
  } | null;
}

export interface TodayGpsAttendanceState {
  id?: string;
  clock_in?: string | null;
  clock_out?: string | null;
  attendance_date?: string;
  review_status?: string | null;
  submitted_latitude?: number | null;
  submitted_longitude?: number | null;
  gps_accuracy_meters?: number | null;
  distance_to_office_meters?: number | null;
  late_reason?: string | null;
  late_minutes?: number | null;
  work_minutes?: number | null;
  device_info?: string | null;
  created_at?: string;
  [key: string]: unknown;
}

export interface IzinTelatCheckResult {
  canApply: boolean;
  scheduledStartTime: string;
  message: string;
  employee?: {
    id: string;
    full_name: string;
    email: string;
    role?: string;
    work_schedule_id?: string | null;
  } | null;
  existingRequest?: unknown;
  currentTotalMinutes?: number;
  scheduledTotalMinutes?: number;
  allowed?: boolean;
}

export interface CurrentGpsEmployee {
  id: string;
  full_name: string;
  email: string;
  role?: string;
  work_schedule_id?: string | null;
}


