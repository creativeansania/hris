/**
 * Client-side IndexedDB Storage for HRIS PWA Offline Capabilities
 * Manages offline attendance queue, offline requests queue, and cached master data.
 */

export interface OfflineAttendanceItem {
  id: string;
  type: 'clock_in' | 'clock_out';
  employeeEmail?: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  deviceInfo?: string;
  notes?: string;
  isMockLocation?: boolean;
  recordedAt: string; // ISO timestamp when punched offline
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  retryCount: number;
  lastError?: string;
  createdAt: string;
}

export interface OfflineRequestItem {
  id: string;
  employeeEmail: string;
  requestTypeId: string;
  requestTypeName?: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  isHalfDay: boolean;
  reason: string;
  files?: Array<{
    name: string;
    type: string;
    size: number;
    base64: string;
  }>;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  retryCount: number;
  lastError?: string;
  createdAt: string;
}

const DB_NAME = 'hris_pwa_offline_db';
const DB_VERSION = 1;
const ATTENDANCE_STORE = 'attendance_queue';
const REQUESTS_STORE = 'requests_queue';
const MASTER_CACHE_STORE = 'master_cache';

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB tidak tersedia di environment ini.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 1. Attendance Queue Store
      if (!db.objectStoreNames.contains(ATTENDANCE_STORE)) {
        const attStore = db.createObjectStore(ATTENDANCE_STORE, { keyPath: 'id' });
        attStore.createIndex('status', 'status', { unique: false });
        attStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // 2. Requests Queue Store
      if (!db.objectStoreNames.contains(REQUESTS_STORE)) {
        const reqStore = db.createObjectStore(REQUESTS_STORE, { keyPath: 'id' });
        reqStore.createIndex('status', 'status', { unique: false });
        reqStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // 3. Master Data Cache Store
      if (!db.objectStoreNames.contains(MASTER_CACHE_STORE)) {
        db.createObjectStore(MASTER_CACHE_STORE, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ==========================================
// 1. ATTENDANCE QUEUE OPERATIONS
// ==========================================

export async function saveOfflineAttendance(
  item: Omit<OfflineAttendanceItem, 'id' | 'status' | 'retryCount' | 'createdAt'>
): Promise<OfflineAttendanceItem> {
  const db = await getDB();
  const record: OfflineAttendanceItem = {
    ...item,
    id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    status: 'pending',
    retryCount: 0,
    createdAt: new Date().toISOString(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(ATTENDANCE_STORE, 'readwrite');
    const store = tx.objectStore(ATTENDANCE_STORE);
    const req = store.add(record);

    req.onsuccess = () => resolve(record);
    req.onerror = () => reject(req.error);
  });
}

export async function getPendingAttendanceQueue(): Promise<OfflineAttendanceItem[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ATTENDANCE_STORE, 'readonly');
    const store = tx.objectStore(ATTENDANCE_STORE);
    const req = store.getAll();

    req.onsuccess = () => {
      const items = (req.result as OfflineAttendanceItem[]) || [];
      // Filter pending or failed items, sorted by createdAt asc
      const pending = items
        .filter((i) => i.status === 'pending' || i.status === 'failed')
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      resolve(pending);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function updateAttendanceQueueItem(
  id: string,
  updates: Partial<OfflineAttendanceItem>
): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ATTENDANCE_STORE, 'readwrite');
    const store = tx.objectStore(ATTENDANCE_STORE);
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      const existing = getReq.result as OfflineAttendanceItem;
      if (!existing) {
        resolve();
        return;
      }
      const updated = { ...existing, ...updates };
      const putReq = store.put(updated);
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

export async function removeOfflineAttendance(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ATTENDANCE_STORE, 'readwrite');
    const store = tx.objectStore(ATTENDANCE_STORE);
    const req = store.delete(id);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ==========================================
// 2. REQUESTS QUEUE OPERATIONS
// ==========================================

export async function saveOfflineRequest(
  item: Omit<OfflineRequestItem, 'id' | 'status' | 'retryCount' | 'createdAt'>
): Promise<OfflineRequestItem> {
  const db = await getDB();
  const record: OfflineRequestItem = {
    ...item,
    id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    status: 'pending',
    retryCount: 0,
    createdAt: new Date().toISOString(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(REQUESTS_STORE, 'readwrite');
    const store = tx.objectStore(REQUESTS_STORE);
    const req = store.add(record);

    req.onsuccess = () => resolve(record);
    req.onerror = () => reject(req.error);
  });
}

export async function getPendingRequestsQueue(): Promise<OfflineRequestItem[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(REQUESTS_STORE, 'readonly');
    const store = tx.objectStore(REQUESTS_STORE);
    const req = store.getAll();

    req.onsuccess = () => {
      const items = (req.result as OfflineRequestItem[]) || [];
      const pending = items
        .filter((i) => i.status === 'pending' || i.status === 'failed')
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      resolve(pending);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function removeOfflineRequest(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(REQUESTS_STORE, 'readwrite');
    const store = tx.objectStore(REQUESTS_STORE);
    const req = store.delete(id);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ==========================================
// 3. MASTER DATA CACHING (OFFLINE FORMS)
// ==========================================

export async function cacheMasterData<T>(key: string, data: T): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(MASTER_CACHE_STORE, 'readwrite');
      const store = tx.objectStore(MASTER_CACHE_STORE);
      const req = store.put({ key, data, cachedAt: new Date().toISOString() });

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[OfflineDB] Failed to cache master data:', err);
  }
}

export async function getCachedMasterData<T>(key: string): Promise<T | null> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(MASTER_CACHE_STORE, 'readonly');
      const store = tx.objectStore(MASTER_CACHE_STORE);
      const req = store.get(key);

      req.onsuccess = () => {
        if (req.result) {
          resolve(req.result.data as T);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

// ==========================================
// 4. STATS & QUEUE AUDIT
// ==========================================

export async function getAllOfflineQueueStats(): Promise<{
  pendingAttendance: number;
  pendingRequests: number;
  total: number;
}> {
  try {
    const [attendance, requests] = await Promise.all([
      getPendingAttendanceQueue(),
      getPendingRequestsQueue(),
    ]);

    return {
      pendingAttendance: attendance.length,
      pendingRequests: requests.length,
      total: attendance.length + requests.length,
    };
  } catch {
    return { pendingAttendance: 0, pendingRequests: 0, total: 0 };
  }
}
