import React from 'react';
import Link from 'next/link';
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  XCircle,
  Briefcase,
  Clock,
  AlertTriangle,
  FileText,
  AlertCircle,
  RefreshCw,
  Receipt,
  Check,
  Trash2,
  ArrowUpRight,
} from 'lucide-react';
import { NotificationItem } from '@/types/database';

export function getNotificationMetadata(type: string) {
  switch (type) {
    case 'request_submitted':
      return {
        label: 'Pengajuan Baru',
        icon: CalendarDays,
        color: 'text-amber-400',
        bg: 'bg-amber-500/10 border-amber-500/20',
        badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      };
    case 'request_approved':
      return {
        label: 'Pengajuan Disetujui',
        icon: CheckCircle2,
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10 border-emerald-500/20',
        badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      };
    case 'request_rejected':
      return {
        label: 'Pengajuan Ditolak',
        icon: XCircle,
        color: 'text-rose-400',
        bg: 'bg-rose-500/10 border-rose-500/20',
        badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      };
    case 'overtime_assigned':
      return {
        label: 'Penugasan Lembur',
        icon: Briefcase,
        color: 'text-purple-400',
        bg: 'bg-purple-500/10 border-purple-500/20',
        badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      };
    case 'attendance_late':
      return {
        label: 'Keterlambatan Presensi',
        icon: Clock,
        color: 'text-amber-400',
        bg: 'bg-amber-500/10 border-amber-500/20',
        badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      };
    case 'attendance_late_repeat':
      return {
        label: 'Peringatan Telat Berulang',
        icon: AlertTriangle,
        color: 'text-rose-400',
        bg: 'bg-rose-500/10 border-rose-500/20',
        badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      };
    case 'contract_expiring':
      return {
        label: 'Peringatan Kontrak PKWT',
        icon: FileText,
        color: 'text-orange-400',
        bg: 'bg-orange-500/10 border-orange-500/20',
        badge: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
      };
    case 'leave_quota_warning':
      return {
        label: 'Peringatan Kuota Cuti',
        icon: AlertCircle,
        color: 'text-amber-400',
        bg: 'bg-amber-500/10 border-amber-500/20',
        badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      };
    case 'odoo_sync_completed':
      return {
        label: 'Sinkronisasi Odoo',
        icon: RefreshCw,
        color: 'text-blue-400',
        bg: 'bg-blue-500/10 border-blue-500/20',
        badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      };
    case 'payroll_generated':
      return {
        label: 'Payroll Terbit',
        icon: Receipt,
        color: 'text-cyan-400',
        bg: 'bg-cyan-500/10 border-cyan-500/20',
        badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      };
    default:
      return {
        label: 'Pemberitahuan Sistem',
        icon: Bell,
        color: 'text-slate-400',
        bg: 'bg-slate-800/80 border-slate-700',
        badge: 'bg-slate-800 text-slate-300 border-slate-700',
      };
  }
}

export function formatFullDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

interface NotificationCardProps {
  item: NotificationItem;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}

export function NotificationCard({
  item,
  onMarkAsRead,
  onDelete,
}: NotificationCardProps) {
  const meta = getNotificationMetadata(item.type);
  const Icon = meta.icon;

  return (
    <div
      className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 relative overflow-hidden group ${
        !item.is_read
          ? 'bg-[#0f172a]/90 border-blue-500/40 shadow-lg shadow-blue-500/5'
          : 'bg-[#0c1220]/60 border-slate-800/80 hover:border-slate-700/80'
      }`}
    >
      {/* Glowing left bar for unread */}
      {!item.is_read && (
        <span className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-blue-500 to-indigo-500" />
      )}

      <div className="flex items-start gap-3.5 sm:gap-4">
        {/* Icon */}
        <div
          className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 border ${meta.bg} ${meta.color} shadow-sm`}
        >
          <Icon className="w-5 h-5" />
        </div>

        {/* Body */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border uppercase tracking-wider ${meta.badge}`}
            >
              {meta.label}
            </span>

            {!item.is_read && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Baru
              </span>
            )}

            <span className="text-xs text-slate-500 ml-auto">
              {formatFullDate(item.created_at)}
            </span>
          </div>

          <h4
            className={`text-sm sm:text-base font-semibold text-slate-100 ${
              !item.is_read ? 'text-white' : 'text-slate-200'
            }`}
          >
            {item.title}
          </h4>

          {item.message && (
            <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
              {item.message}
            </p>
          )}

          {/* Bottom action row */}
          <div className="mt-3.5 pt-3 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {item.action_url && (
                <Link
                  href={item.action_url}
                  onClick={() => {
                    if (!item.is_read) onMarkAsRead(item.id);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 hover:text-blue-200 border border-blue-500/30 transition cursor-pointer"
                >
                  <span>Buka Halaman Aksi</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>

            <div className="flex items-center gap-1.5 ml-auto">
              {!item.is_read && (
                <button
                  type="button"
                  onClick={() => onMarkAsRead(item.id)}
                  className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 px-2.5 py-1.5 rounded-lg hover:bg-slate-800/80 transition cursor-pointer"
                  title="Tandai sudah dibaca"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Tandai Dibaca</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => onDelete(item.id)}
                className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
                title="Hapus notifikasi"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
