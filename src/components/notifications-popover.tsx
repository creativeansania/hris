'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  ExternalLink,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { NotificationItem } from '@/types/database';
import {
  getMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  checkAndDispatchSystemReminders,
} from '@/app/actions/notifications';

interface NotificationsPopoverProps {
  userEmail?: string;
}

function getNotificationIcon(type: string) {
  switch (type) {
    case 'request_submitted':
      return { icon: CalendarDays, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' };
    case 'request_approved':
      return { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' };
    case 'request_rejected':
      return { icon: XCircle, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' };
    case 'overtime_assigned':
      return { icon: Briefcase, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' };
    case 'attendance_late':
      return { icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' };
    case 'attendance_late_repeat':
      return { icon: AlertTriangle, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' };
    case 'contract_expiring':
      return { icon: FileText, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' };
    case 'leave_quota_warning':
      return { icon: AlertCircle, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' };
    case 'odoo_sync_completed':
      return { icon: RefreshCw, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' };
    case 'payroll_generated':
      return { icon: Receipt, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' };
    default:
      return { icon: Bell, color: 'text-slate-400', bg: 'bg-slate-800 border-slate-700' };
  }
}

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return 'Baru saja';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} mnt lalu`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours} jam lalu`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Kemarin';
    if (diffDays < 7) return `${diffDays} hari lalu`;

    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return 'Baru saja';
  }
}

export function NotificationsPopover({ userEmail }: NotificationsPopoverProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const fetchNotifs = async () => {
    try {
      const res = await getMyNotifications(userEmail, 'all', 8);
      if (res.success) {
        setNotifications(res.data);
        setUnreadCount(res.unreadCount);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchNotifs();

    // Trigger system background scan once silently
    checkAndDispatchSystemReminders(userEmail).then(() => {
      fetchNotifs();
    }).catch(() => {});

    // Polling every 45s
    const interval = setInterval(fetchNotifs, 45000);
    return () => clearInterval(interval);
  }, [userEmail]);

  // Handle outside click to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = () => {
    if (!isOpen) {
      fetchNotifs();
    }
    setIsOpen(!isOpen);
  };

  const handleMarkAllAsRead = async () => {
    setMarkingAll(true);
    try {
      await markAllNotificationsAsRead(userEmail);
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    } finally {
      setMarkingAll(false);
    }
  };

  const handleItemClick = async (notif: NotificationItem) => {
    if (!notif.is_read) {
      markNotificationAsRead(notif.id).catch(() => {});
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }

    setIsOpen(false);

    if (notif.action_url) {
      router.push(notif.action_url);
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={handleToggle}
        className={`relative p-2 rounded-lg transition duration-150 ${
          isOpen
            ? 'text-white bg-slate-800'
            : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
        }`}
        title="Notifikasi"
        aria-label="Buka Notifikasi"
      >
        <Bell className="w-4 h-4" />

        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg shadow-rose-500/40 ring-2 ring-[#0d1322] animate-in zoom-in-50 duration-200">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-[#0d1322] border border-slate-800/90 shadow-2xl shadow-black/80 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/50">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-slate-100">Notifikasi</span>
              {unreadCount > 0 ? (
                <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {unreadCount} baru
                </span>
              ) : (
                <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-slate-800 text-slate-400">
                  Semua dibaca
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                disabled={markingAll}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium transition disabled:opacity-50"
                title="Tandai semua sudah dibaca"
              >
                {markingAll ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCheck className="w-3.5 h-3.5" />
                )}
                <span>Tandai Dibaca</span>
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-800/50">
            {notifications.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-800/60 border border-slate-700/60 flex items-center justify-center mx-auto mb-3 text-slate-400">
                  <Bell className="w-5 h-5 text-slate-500" />
                </div>
                <p className="text-sm font-medium text-slate-300">Belum ada notifikasi</p>
                <p className="text-xs text-slate-500 mt-1 max-w-[220px] mx-auto">
                  Pemberitahuan persetujuan, lembur, dan absensi akan muncul di sini.
                </p>
              </div>
            ) : (
              notifications.map((item) => {
                const conf = getNotificationIcon(item.type);
                const Icon = conf.icon;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className={`px-4 py-3 hover:bg-slate-800/40 transition cursor-pointer flex items-start gap-3 group relative ${
                      !item.is_read ? 'bg-blue-500/[0.04]' : ''
                    }`}
                  >
                    {/* Unread indicator bar */}
                    {!item.is_read && (
                      <span className="absolute left-1 top-4 bottom-4 w-1 bg-blue-500 rounded-full" />
                    )}

                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${conf.bg} ${conf.color}`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <p
                          className={`text-xs truncate ${
                            !item.is_read
                              ? 'font-semibold text-slate-100'
                              : 'font-medium text-slate-300'
                          }`}
                        >
                          {item.title}
                        </p>
                        <span className="text-[10px] text-slate-500 shrink-0">
                          {formatRelativeTime(item.created_at)}
                        </span>
                      </div>

                      {item.message && (
                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                          {item.message}
                        </p>
                      )}

                      {item.action_url && (
                        <div className="mt-1.5 flex items-center gap-1 text-[11px] text-blue-400 group-hover:text-blue-300 font-medium">
                          <span>Lihat detail</span>
                          <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-slate-800/80 bg-slate-900/40">
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="w-full py-2 px-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-xs text-center font-medium text-slate-300 hover:text-white flex items-center justify-center gap-1.5 transition"
            >
              <span>Lihat Riwayat Lengkap</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
