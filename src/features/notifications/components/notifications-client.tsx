'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, Inbox } from 'lucide-react';
import { NotificationItem } from '@/types/database';
import { EmptyState } from '@/components/ui/empty-state';
import {
  getMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  checkAndDispatchSystemReminders,
} from '@/app/actions/notifications';
import { NotificationsHeader } from './notifications-header';
import { NotificationsMetrics } from './notifications-metrics';
import { NotificationsFilterBar } from './notifications-filter-bar';
import { NotificationCard } from './notification-card';

export function NotificationsClient() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [scanning, setScanning] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Filters
  const [tabFilter, setTabFilter] = useState<string>('all');
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
    } catch {
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
      const remainingUnread = notifications.filter((n) => n.id !== id && !n.is_read).length;
      setUnreadCount(remainingUnread);
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  // Filtered Items
  const filteredNotifications = notifications.filter((item) => {
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
      ![
        'contract_expiring',
        'leave_quota_warning',
        'payroll_generated',
        'odoo_sync_completed',
      ].includes(item.type)
    )
      return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchMsg = (item.message || '').toLowerCase().includes(q);
      return matchTitle || matchMsg;
    }

    return true;
  });

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <NotificationsHeader
        unreadCount={unreadCount}
        scanning={scanning}
        statusMessage={statusMessage}
        onScanReminders={handleScanReminders}
        onMarkAllRead={handleMarkAllRead}
        onDismissStatus={() => setStatusMessage(null)}
      />

      {/* Metrics */}
      <NotificationsMetrics
        notifications={notifications}
        unreadCount={unreadCount}
      />

      {/* Filter and Search Bar */}
      <NotificationsFilterBar
        notifications={notifications}
        unreadCount={unreadCount}
        tabFilter={tabFilter}
        setTabFilter={setTabFilter}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {/* Notifications List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center rounded-2xl bg-[#0e1626]/40 border border-slate-800">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-300">
              Memuat riwayat notifikasi...
            </p>
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
          filteredNotifications.map((item) => (
            <NotificationCard
              key={item.id}
              item={item}
              onMarkAsRead={handleMarkAsRead}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>
    </div>
  );
}
