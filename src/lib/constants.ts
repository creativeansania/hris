import { EmployeeRole, AttendanceStatus, RequestStatus } from '@/types/database';

export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'HRIS';

export const ROLE_LABELS: Record<EmployeeRole, string> = {
  admin: 'Administrator',
  management: 'Management',
  hr: 'Human Resources',
  kepala_divisi: 'Kepala Divisi',
  spv: 'Supervisor',
  staff: 'Staff',
};

export const ROLE_COLORS: Record<EmployeeRole, { bg: string; text: string; border: string }> = {
  admin: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' },
  management: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  hr: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  kepala_divisi: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  spv: { bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'border-teal-500/20' },
  staff: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20' },
};

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: 'Tepat Waktu',
  late: 'Terlambat',
  early_leave: 'Pulang Cepat',
  late_and_early_leave: 'Terlambat & Pulang Cepat',
  absent: 'Alpa / Tidak Hadir',
  leave: 'Cuti / Izin',
  holiday: 'Libur',
};

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  pending: 'Menunggu Persetujuan',
  approved: 'Disetujui',
  rejected: 'Ditolak',
  cancelled: 'Dibatalkan',
};

export const NAVIGATION_ITEMS = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: 'LayoutDashboard',
    roles: ['admin', 'management', 'hr', 'kepala_divisi', 'spv', 'staff'] as EmployeeRole[],
  },
  {
    title: 'Clock In / Out (GPS)',
    href: '/clock-in',
    icon: 'MapPin',
    roles: ['staff', 'spv', 'kepala_divisi', 'hr', 'management', 'admin'] as EmployeeRole[],
  },
  {
    title: 'Presensi Saya',
    href: '/my-attendance',
    icon: 'Clock',
    roles: ['staff', 'spv', 'kepala_divisi', 'hr', 'management', 'admin'] as EmployeeRole[],
  },
  {
    title: 'Pengajuan Cuti / Izin',
    href: '/requests',
    icon: 'CalendarDays',
    roles: ['staff', 'spv', 'kepala_divisi', 'hr', 'management', 'admin'] as EmployeeRole[],
  },
  {
    title: 'Approval Pengajuan',
    href: '/approvals',
    icon: 'CheckSquare',
    roles: ['spv', 'kepala_divisi', 'hr', 'management', 'admin'] as EmployeeRole[],
  },
  {
    title: 'Lembur',
    href: '/overtime',
    icon: 'Briefcase',
    roles: ['staff', 'spv', 'kepala_divisi', 'hr', 'management', 'admin'] as EmployeeRole[],
  },
  {
    title: 'Manajemen Presensi',
    href: '/attendance-management',
    icon: 'Fingerprint',
    roles: ['hr', 'admin'] as EmployeeRole[],
  },
  {
    title: 'Data Karyawan',
    href: '/employees',
    icon: 'Users',
    roles: ['hr', 'admin', 'management'] as EmployeeRole[],
  },
  {
    title: 'Integrasi Odoo',
    href: '/odoo-sync',
    icon: 'RefreshCw',
    roles: ['hr', 'admin'] as EmployeeRole[],
  },
  {
    title: 'Payroll',
    href: '/payroll',
    icon: 'Receipt',
    roles: ['hr', 'admin', 'management'] as EmployeeRole[],
  },
  {
    title: 'Pengaturan Sistem',
    href: '/settings',
    icon: 'Sliders',
    roles: ['admin', 'hr'] as EmployeeRole[],
  },
];
