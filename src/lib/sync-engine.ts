/**
 * Client-side Background Sync Engine for HRIS PWA
 * Automatically synchronizes queued offline attendance and leave requests when online connectivity resumes.
 */

import {
  getPendingAttendanceQueue,
  removeOfflineAttendance,
  updateAttendanceQueueItem,
  getPendingRequestsQueue,
  removeOfflineRequest,
  getAllOfflineQueueStats,
} from '@/lib/offline-db';
import {
  syncOfflineAttendanceItem,
  syncOfflineRequestItem,
} from '@/app/actions/offline-sync';

let isSyncInProgress = false;

export async function syncAllOfflineData(): Promise<{
  syncedAttendance: number;
  failedAttendance: number;
  syncedRequests: number;
  failedRequests: number;
  totalSynced: number;
}> {
  if (typeof window === 'undefined') {
    return {
      syncedAttendance: 0,
      failedAttendance: 0,
      syncedRequests: 0,
      failedRequests: 0,
      totalSynced: 0,
    };
  }

  if (!navigator.onLine) {
    console.log('[SyncEngine] Cannot sync: Device is offline.');
    return {
      syncedAttendance: 0,
      failedAttendance: 0,
      syncedRequests: 0,
      failedRequests: 0,
      totalSynced: 0,
    };
  }

  if (isSyncInProgress) {
    console.log('[SyncEngine] Sync already in progress, skipping duplicate call.');
    return {
      syncedAttendance: 0,
      failedAttendance: 0,
      syncedRequests: 0,
      failedRequests: 0,
      totalSynced: 0,
    };
  }

  isSyncInProgress = true;
  window.dispatchEvent(new CustomEvent('hris-sync-started'));

  let syncedAttendance = 0;
  let failedAttendance = 0;
  let syncedRequests = 0;
  let failedRequests = 0;

  try {
    // 1. Process Attendance Queue
    const pendingAtt = await getPendingAttendanceQueue();
    for (const item of pendingAtt) {
      await updateAttendanceQueueItem(item.id, { status: 'syncing' });
      try {
        const res = await syncOfflineAttendanceItem({
          id: item.id,
          type: item.type,
          employeeEmail: item.employeeEmail,
          latitude: item.latitude,
          longitude: item.longitude,
          accuracy: item.accuracy,
          deviceInfo: item.deviceInfo,
          notes: item.notes,
          recordedAt: item.recordedAt,
        });

        if (res.success) {
          await removeOfflineAttendance(item.id);
          syncedAttendance++;
        } else {
          await updateAttendanceQueueItem(item.id, {
            status: 'failed',
            lastError: res.error || 'Gagal sinkronisasi ke server',
            retryCount: (item.retryCount || 0) + 1,
          });
          failedAttendance++;
        }
      } catch (err: unknown) {
        await updateAttendanceQueueItem(item.id, {
          status: 'failed',
          lastError: err instanceof Error ? err.message : 'Kesalahan jaringan saat sinkronisasi',
          retryCount: (item.retryCount || 0) + 1,
        });
        failedAttendance++;
      }
    }

    // 2. Process Requests Queue
    const pendingReqs = await getPendingRequestsQueue();
    for (const reqItem of pendingReqs) {
      try {
        const res = await syncOfflineRequestItem({
          id: reqItem.id,
          employeeEmail: reqItem.employeeEmail,
          requestTypeId: reqItem.requestTypeId,
          startDate: reqItem.startDate,
          endDate: reqItem.endDate,
          startTime: reqItem.startTime,
          endTime: reqItem.endTime,
          isHalfDay: reqItem.isHalfDay,
          reason: reqItem.reason,
          files: reqItem.files,
        });

        if (res.success) {
          await removeOfflineRequest(reqItem.id);
          syncedRequests++;
        } else {
          failedRequests++;
        }
      } catch (err) {
        console.warn('[SyncEngine] Failed to sync request:', err);
        failedRequests++;
      }
    }
  } catch (globalErr) {
    console.error('[SyncEngine] Error during sync run:', globalErr);
  } finally {
    isSyncInProgress = false;
    const totalSynced = syncedAttendance + syncedRequests;

    // Dispatch completion event
    window.dispatchEvent(
      new CustomEvent('hris-sync-completed', {
        detail: {
          syncedAttendance,
          failedAttendance,
          syncedRequests,
          failedRequests,
          totalSynced,
        },
      })
    );
    window.dispatchEvent(new CustomEvent('hris-queue-changed'));
  }

  return {
    syncedAttendance,
    failedAttendance,
    syncedRequests,
    failedRequests,
    totalSynced: syncedAttendance + syncedRequests,
  };
}

let isInitialized = false;

/**
 * Initializes listeners for online/offline events and triggers automatic sync.
 */
export function initSyncEngine(): () => void {
  if (typeof window === 'undefined' || isInitialized) {
    return () => {};
  }

  isInitialized = true;

  const handleOnline = () => {
    console.log('[SyncEngine] Network reconnected (online). Starting auto-sync...');
    setTimeout(() => {
      syncAllOfflineData();
    }, 1500); // 1.5s grace period for socket stabilization
  };

  window.addEventListener('online', handleOnline);

  // Check initial queue count if online
  if (navigator.onLine) {
    getAllOfflineQueueStats().then((stats) => {
      if (stats.total > 0) {
        syncAllOfflineData();
      }
    });
  }

  return () => {
    window.removeEventListener('online', handleOnline);
    isInitialized = false;
  };
}
