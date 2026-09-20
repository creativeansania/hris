'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCheck,
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
  Search,
  Filter,
  Check,
  Trash2,
  ArrowUpRight,
  Sparkles,
  Inbox,
  ShieldAlert,
  HelpCircle,
} from 'lucide-react';
import { NotificationItem } from '@/types/database';
import { EmptyState } from '@/components/ui/empty-state';
import {
  getMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  checkAndDispatchSystemReminders,
} from '@/app/actions/notifications';

function getNotificationMetadata(type: string) {
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

function formatFullDate(dateString: string): string {
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

export default function NotificationsPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [scanning, setScanning] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Filters
  const [tabFilter, setTabFilter] = useState<string>('all'); // all, unread, requests, overtime, attendance, hr
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getMyNotifications(undefined, 'all', 100);
      if (res.success) {
        setNotifications(res.data);
        setUnreadCount(res.unreadCount);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleScanReminders = async () => {
    setScanning(true);
    setStatusMessage(null);
    try {
      const result = await checkAndDispatchSystemReminders();
      setStatusMessage(result.message);
      await loadData();
    } catch (err) {
      setStatusMessage('Gagal menjalankan pemindaian pengingat.');
    } finally {
      setScanning(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      // Re-evaluate unread
      const remainingUnread = notifications.filter((n) => n.id !== id && !n.is_read).length;
      setUnreadCount(remainingUnread);
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  // Filtered Items
  const filteredNotifications = notifications.filter((item) => {
    // 1. Tab filter
    if (tabFilter === 'unread' && item.is_read) return false;
    if (
      tabFilter === 'requests' &&
      !['request_submitted', 'request_approved', 'request_rejected'].includes(item.type)
    )
      return false;
    if (tabFilter === 'overtime' && item.type !== 'overtime_assigned') return false;
    if (
      tabFilter === 'attendance' &&
      !['attendance_late', 'attendance_late_repeat'].includes(item.type)
    )
      return false;
    if (
      tabFilter === 'hr' &&
      !['contract_expiring', 'leave_quota_warning', 'payroll_generated', 'odoo_sync_completed'].includes(item.type)
    )
      return false;

    // 2. Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchMsg = (item.message || '').toLowerCase().includes(q);
      return matchTitle || matchMsg;
    }

    return true;
  });

  // Category counts
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
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Sprint 11 • In-App Engine
            </span>
            {unreadCount > 0 && (
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">
                {unreadCount} Belum Dibaca
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-2">
            Pusat Notifikasi
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Semua riwayat pembaruan status pengajuan, penugasan lembur, catatan kedisiplinan, kontrak PKWT, dan aktivitas sinkronisasi sistem Anda.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleScanReminders}
            disabled={scanning}
            className="px-3.5 py-2 rounded-xl text-xs font-medium bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 text-slate-200 hover:text-white flex items-center gap-2 transition disabled:opacity-50 shadow-sm"
            title="Jalankan pemindaian otomatis pengingat kontrak dan kuota"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${scanning ? 'animate-spin' : ''}`} />
            <span>{scanning ? 'Memindai...' : 'Pindai Pengingat'}</span>
          </button>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="px-3.5 py-2 rounded-xl text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-2 transition shadow-lg shadow-blue-600/25"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Tandai Semua Dibaca</span>
            </button>
          )}
        </div>
      </div>

      {/* Status banner after scan */}
      {statusMessage && (
        <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs flex items-center justify-between animate-in slide-in-from-top-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
            <span>{statusMessage}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-white text-xs font-bold px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Metrics Summary Cards */}
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

      {/* Filter and Search Bar */}
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
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-200"
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
            className={`px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap ${
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
            className={`px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap ${
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
            className={`px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap ${
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
            className={`px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap ${
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
            className={`px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap ${
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
            className={`px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap ${
              tabFilter === 'hr'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800/80'
            }`}
          >
            Kontrak & HR ({countHr})
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center rounded-2xl bg-[#0e1626]/40 border border-slate-800">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-300">Memuat riwayat notifikasi...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="Tidak Ada Notifikasi Ditemukan"
            description={
              searchQuery || tabFilter !== 'all'
                ? 'Tidak ada notifikasi yang sesuai dengan filter atau kata kunci pencarian Anda.'
                : 'Kotak masuk Anda bersih! Semua pengumuman penting, persetujuan, dan keterlambatan akan muncul di sini.'
            }
          />
        ) : (
          filteredNotifications.map((item) => {
            const meta = getNotificationMetadata(item.type);
            const Icon = meta.icon;

            return (
              <div
                key={item.id}
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
                              if (!item.is_read) handleMarkAsRead(item.id);
                            }}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 hover:text-blue-200 border border-blue-500/30 transition"
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
                            onClick={() => handleMarkAsRead(item.id)}
                            className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 px-2.5 py-1.5 rounded-lg hover:bg-slate-800/80 transition"
                            title="Tandai sudah dibaca"
                          >
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Tandai Dibaca</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
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
          })
        )}
      </div>
    </div>
  );
}
