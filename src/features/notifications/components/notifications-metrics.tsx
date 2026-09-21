import React from 'react';
import { Bell, AlertCircle, CalendarDays, FileText } from 'lucide-react';
import { NotificationItem } from '@/types/database';

interface NotificationsMetricsProps {
  notifications: NotificationItem[];
  unreadCount: number;
}

export function NotificationsMetrics({
  notifications,
  unreadCount,
}: NotificationsMetricsProps) {
  const countRequests = notifications.filter((n) =>
    ['request_submitted', 'request_approved', 'request_rejected'].includes(n.type)
  ).length;

  const countHr = notifications.filter((n) =>
    ['contract_expiring', 'leave_quota_warning', 'payroll_generated', 'odoo_sync_completed'].includes(n.type)
  ).length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <div className="p-4 rounded-2xl bg-[#0e1626]/70 border border-slate-800/80 backdrop-blur-sm relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Total Notifikasi</span>
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Bell className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl font-bold text-white mt-2">{notifications.length}</div>
        <p className="text-[11px] text-slate-500 mt-0.5">Tersimpan dalam riwayat audit</p>
      </div>

      <div className="p-4 rounded-2xl bg-[#0e1626]/70 border border-slate-800/80 backdrop-blur-sm relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Belum Dibaca</span>
          <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <AlertCircle className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl font-bold text-rose-400 mt-2">{unreadCount}</div>
        <p className="text-[11px] text-slate-500 mt-0.5">Memerlukan perhatian Anda</p>
      </div>

      <div className="p-4 rounded-2xl bg-[#0e1626]/70 border border-slate-800/80 backdrop-blur-sm relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Cuti & Approval</span>
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <CalendarDays className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl font-bold text-amber-300 mt-2">{countRequests}</div>
        <p className="text-[11px] text-slate-500 mt-0.5">Permohonan & persetujuan</p>
      </div>

      <div className="p-4 rounded-2xl bg-[#0e1626]/70 border border-slate-800/80 backdrop-blur-sm relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Kontrak & Sistem</span>
          <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
            <FileText className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl font-bold text-teal-300 mt-2">{countHr}</div>
        <p className="text-[11px] text-slate-500 mt-0.5">PKWT, kuota, payroll, Odoo</p>
      </div>
    </div>
  );
}
