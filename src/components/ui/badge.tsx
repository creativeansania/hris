import React from 'react';
import { EmployeeRole, EmployeeStatus } from '@/types/database';
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/constants';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  dot?: boolean;
}

export function Badge({
  children,
  variant = 'default',
  dot = false,
  className = '',
  ...props
}: BadgeProps) {
  const variantStyles = {
    default: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    danger: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    info: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    neutral: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  };

  const dotColors = {
    default: 'bg-blue-400',
    success: 'bg-emerald-400',
    warning: 'bg-amber-400',
    danger: 'bg-rose-400',
    info: 'bg-cyan-400',
    neutral: 'bg-slate-400',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  );
}

export function RoleBadge({ role }: { role: EmployeeRole }) {
  const style = ROLE_COLORS[role] || ROLE_COLORS.staff;
  const label = ROLE_LABELS[role] || role;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${style.bg} ${style.text} ${style.border}`}
    >
      {label}
    </span>
  );
}

export function StatusBadge({ status }: { status: EmployeeStatus }) {
  if (status === 'active') {
    return (
      <Badge variant="success" dot>
        Aktif
      </Badge>
    );
  }
  if (status === 'pending_claim') {
    return (
      <Badge variant="warning" dot>
        Menunggu Klaim
      </Badge>
    );
  }
  return (
    <Badge variant="danger" dot>
      Non-Aktif
    </Badge>
  );
}

export function AttendanceStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'present':
      return <Badge variant="success" dot>Hadir</Badge>;
    case 'late':
      return <Badge variant="warning" dot>Terlambat</Badge>;
    case 'early_leave':
      return <Badge variant="warning" dot>Pulang Cepat</Badge>;
    case 'late_and_early_leave':
      return <Badge variant="warning" dot>Telat & Pulang Cepat</Badge>;
    case 'leave':
      return <Badge variant="info" dot>Cuti/Izin</Badge>;
    case 'holiday':
      return <Badge variant="neutral" dot>Libur</Badge>;
    case 'absent':
    default:
      return <Badge variant="danger" dot>Alpa</Badge>;
  }
}

export function RequestStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'approved':
      return <Badge variant="success" dot>Disetujui</Badge>;
    case 'rejected':
      return <Badge variant="danger" dot>Ditolak</Badge>;
    case 'cancelled':
      return <Badge variant="neutral" dot>Dibatalkan</Badge>;
    case 'pending':
    default:
      return <Badge variant="warning" dot>Menunggu Persetujuan</Badge>;
  }
}

export function PayrollStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'finalized':
      return <Badge variant="success" dot>Final / Terkunci</Badge>;
    case 'generated':
      return <Badge variant="info" dot>Kalkulasi Selesai</Badge>;
    case 'draft':
    default:
      return <Badge variant="neutral" dot>Draft</Badge>;
  }
}
