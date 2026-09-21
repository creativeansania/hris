import React from 'react';
import { Search } from 'lucide-react';
import { NotificationItem } from '@/types/database';

interface NotificationsFilterBarProps {
  notifications: NotificationItem[];
  unreadCount: number;
  tabFilter: string;
  setTabFilter: (tab: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export function NotificationsFilterBar({
  notifications,
  unreadCount,
  tabFilter,
  setTabFilter,
  searchQuery,
  setSearchQuery,
}: NotificationsFilterBarProps) {
  const countRequests = notifications.filter((n) =>
    ['request_submitted', 'request_approved', 'request_rejected'].includes(n.type)
  ).length;
  const countOvertime = notifications.filter((n) => n.type === 'overtime_assigned').length;
  const countAttendance = notifications.filter((n) =>
    ['attendance_late', 'attendance_late_repeat'].includes(n.type)
  ).length;
  const countHr = notifications.filter((n) =>
    ['contract_expiring', 'leave_quota_warning', 'payroll_generated', 'odoo_sync_completed'].includes(n.type)
  ).length;

  return (
    <div className="p-4 rounded-2xl bg-[#0e1626]/60 border border-slate-800/80 backdrop-blur-sm space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Cari judul notifikasi, kata kunci, nama..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs sm:text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      {/* Tab Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <button
          type="button"
          onClick={() => setTabFilter('all')}
          className={`px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap cursor-pointer ${
            tabFilter === 'all'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800/80'
          }`}
        >
          Semua ({notifications.length})
        </button>

        <button
          type="button"
          onClick={() => setTabFilter('unread')}
          className={`px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap cursor-pointer ${
            tabFilter === 'unread'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800/80'
          }`}
        >
          Belum Dibaca ({unreadCount})
        </button>

        <button
          type="button"
          onClick={() => setTabFilter('requests')}
          className={`px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap cursor-pointer ${
            tabFilter === 'requests'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800/80'
          }`}
        >
          Cuti & Izin ({countRequests})
        </button>

        <button
          type="button"
          onClick={() => setTabFilter('overtime')}
          className={`px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap cursor-pointer ${
            tabFilter === 'overtime'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800/80'
          }`}
        >
          Lembur ({countOvertime})
        </button>

        <button
          type="button"
          onClick={() => setTabFilter('attendance')}
          className={`px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap cursor-pointer ${
            tabFilter === 'attendance'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800/80'
          }`}
        >
          Presensi ({countAttendance})
        </button>

        <button
          type="button"
          onClick={() => setTabFilter('hr')}
          className={`px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap cursor-pointer ${
            tabFilter === 'hr'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800/80'
          }`}
        >
          Kontrak & HR ({countHr})
        </button>
      </div>
    </div>
  );
}
