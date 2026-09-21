'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, RefreshCw } from 'lucide-react';
import {
  getTodayGpsStatus,
  submitGpsClockIn,
  submitGpsClockOut,
} from '@/app/actions/gps-attendance';
import {
  findClosestOffice,
  isGpsAccuracyAcceptable,
  OfficeLocationGeo,
} from '@/lib/geo/haversine';
import { useCurrentUser } from '@/hooks/use-current-user';
import {
  saveOfflineAttendance,
  getPendingAttendanceQueue,
  cacheMasterData,
  getCachedMasterData,
  OfflineAttendanceItem,
} from '@/lib/offline-db';
import { syncAllOfflineData } from '@/lib/sync-engine';
import { CurrentGpsEmployee, TodayGpsAttendanceState } from '@/types/database';
import { ClockBanner } from './clock-banner';
import { GeoStatusCard } from './geo-status-card';
import { ClockActionCard } from './clock-action-card';
import { AttendanceAuditTrail } from './attendance-audit-trail';
import { OfflineQueueCard } from './offline-queue-card';
import { getClientDeviceSummary } from '@/lib/device-parser';

const PRESET_REASONS = [
  'Meeting kunjungan klien di lokasi',
  'Tugas dinas operasional lapangan',
  'Bekerja remote / penugasan khusus',
  'Inspeksi proyek cabang luar kota',
];

export function ClockInClient() {
  const { email: currentUserEmail, isLoading: isAuthLoading } = useCurrentUser();

  // Current time state
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Geolocation states
  const [geoCoords, setGeoCoords] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(true);

  // Office locations & Proximity
  const [officeLocations, setOfficeLocations] = useState<OfficeLocationGeo[]>([]);
  const [closestOfficeInfo, setClosestOfficeInfo] = useState<{
    office: OfficeLocationGeo | null;
    distanceMeters: number;
    isWithinRadius: boolean;
  } | null>(null);

  // Today's attendance state
  const [attendance, setAttendance] = useState<TodayGpsAttendanceState | null>(null);
  const [employee, setEmployee] = useState<CurrentGpsEmployee | null>(null);
  const [, setIsLoadingStatus] = useState<boolean>(true);

  // Offline queue states
  const [offlineQueue, setOfflineQueue] = useState<OfflineAttendanceItem[]>([]);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [isSyncingQueue, setIsSyncingQueue] = useState<boolean>(false);

  // Clock in form state
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Request browser geolocation
  const detectLocation = useCallback(() => {
    setIsLocating(true);
    setGeoError(null);

    if (!navigator.geolocation) {
      setGeoError('Perangkat atau peramban Anda tidak mendukung Geolocation API.');
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        setGeoCoords(coords);
        setIsLocating(false);

        // Evaluate closest office
        if (officeLocations.length > 0) {
          const closest = findClosestOffice(coords, officeLocations);
          setClosestOfficeInfo(closest);
        }
      },
      (error) => {
        setIsLocating(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGeoError(
              'Izin akses lokasi ditolak. Harap izinkan akses lokasi pada browser/ponsel Anda.'
            );
            break;
          case error.POSITION_UNAVAILABLE:
            setGeoError(
              'Informasi lokasi tidak tersedia. Pastikan sinyal GPS atau koneksi internet aktif.'
            );
            break;
          case error.TIMEOUT:
            setGeoError('Waktu pencarian lokasi habis (timeout). Silakan klik Deteksi Ulang.');
            break;
          default:
            setGeoError('Gagal mendeteksi lokasi: ' + error.message);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
      }
    );
  }, [officeLocations]);

  // Load pending offline queue
  const loadOfflineQueue = useCallback(async () => {
    try {
      const queue = await getPendingAttendanceQueue();
      setOfflineQueue(queue);
    } catch (err) {
      console.warn('[ClockIn] Error reading offline queue:', err);
    }
  }, []);

  // Load initial status & locations (with IndexedDB fallback)
  const loadStatus = useCallback(async () => {
    setIsLoadingStatus(true);
    const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
    setIsOffline(!online);

    try {
      if (online) {
        const email = currentUserEmail || 'itkantiss@gmail.com';
        const res = await getTodayGpsStatus(email);

        if (res.officeLocations && res.officeLocations.length > 0) {
          setOfficeLocations(res.officeLocations);
          await cacheMasterData('gps_init', res);
        }
        if (res.attendance) {
          setAttendance(res.attendance);
        }
        if (res.employee) {
          setEmployee(res.employee);
        }
      } else {
        // Offline: Read from cached master data
        const cached = await getCachedMasterData<any>('gps_init');
        if (cached) {
          if (cached.officeLocations) setOfficeLocations(cached.officeLocations);
          if (cached.employee) setEmployee(cached.employee);
          if (cached.attendance) setAttendance(cached.attendance);
        }
      }
    } catch (err) {
      console.warn('Network issue loading GPS status, falling back to cache:', err);
      const cached = await getCachedMasterData<any>('gps_init');
      if (cached) {
        if (cached.officeLocations) setOfficeLocations(cached.officeLocations);
        if (cached.employee) setEmployee(cached.employee);
      }
    } finally {
      setIsLoadingStatus(false);
      loadOfflineQueue();
    }
  }, [currentUserEmail, loadOfflineQueue]);

  useEffect(() => {
    if (isAuthLoading) return;
    loadStatus();

    const handleOnline = () => {
      setIsOffline(false);
      loadStatus();
    };
    const handleOffline = () => setIsOffline(true);
    const handleQueueChange = () => loadOfflineQueue();
    const handleSyncComplete = () => {
      loadOfflineQueue();
      loadStatus();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('hris-queue-changed', handleQueueChange);
    window.addEventListener('hris-sync-completed', handleSyncComplete);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('hris-queue-changed', handleQueueChange);
      window.removeEventListener('hris-sync-completed', handleSyncComplete);
    };
  }, [loadOfflineQueue, loadStatus]);

  // When locations are loaded, trigger initial geolocation
  useEffect(() => {
    if (officeLocations.length > 0) {
      detectLocation();
    }
  }, [officeLocations.length, detectLocation]);

  // Re-calculate proximity if coords or locations update
  useEffect(() => {
    if (geoCoords && officeLocations.length > 0) {
      const closest = findClosestOffice(geoCoords, officeLocations);
      setClosestOfficeInfo(closest);
    }
  }, [geoCoords, officeLocations]);

  // Handle Clock In (with Offline Queue Fallback)
  const handleClockIn = async () => {
    if (!geoCoords) {
      setFeedback({
        type: 'error',
        message: 'Koordinat lokasi belum terdeteksi. Tunggu hingga GPS terkunci.',
      });
      return;
    }

    if (!isGpsAccuracyAcceptable(geoCoords.accuracy)) {
      setFeedback({
        type: 'error',
        message: `Akurasi GPS terlalu rendah (±${Math.round(
          geoCoords.accuracy
        )}m). Pindah ke ruang terbuka agar akurasi < 100m.`,
      });
      return;
    }

    if (closestOfficeInfo && !closestOfficeInfo.isWithinRadius && !notes.trim()) {
      setFeedback({
        type: 'error',
        message: 'Anda berada di luar radius kantor. Wajib mengisi keterangan dinas luar / penugasan.',
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    const now = new Date();
    const currentTimeStr = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(now);
    const todayWibStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);
    const deviceInfo = getClientDeviceSummary();
    const isDeviceOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    // Direct Offline Submission
    if (!isDeviceOnline) {
      try {
        await saveOfflineAttendance({
          type: 'clock_in',
          employeeEmail: employee?.email,
          latitude: geoCoords.latitude,
          longitude: geoCoords.longitude,
          accuracy: geoCoords.accuracy,
          deviceInfo,
          notes: notes.trim(),
          recordedAt: now.toISOString(),
        });

        setAttendance((prev: any) => ({
          ...(prev || {}),
          clock_in: currentTimeStr,
          attendance_date: todayWibStr,
          review_status: closestOfficeInfo?.isWithinRadius ? 'auto_valid' : 'pending_review',
          submitted_latitude: geoCoords.latitude,
          submitted_longitude: geoCoords.longitude,
          gps_accuracy_meters: geoCoords.accuracy,
          distance_to_office_meters: closestOfficeInfo?.distanceMeters || 0,
          late_reason: notes.trim(),
        }));

        setIsSubmitting(false);
        setFeedback({
          type: 'success',
          message: `Clock In tersimpan di Antrean Offline (IndexedDB) pada pukul ${currentTimeStr}. Akan disinkronkan otomatis saat online.`,
        });
        loadOfflineQueue();
        window.dispatchEvent(new CustomEvent('hris-queue-changed'));
        return;
      } catch {
        setIsSubmitting(false);
        setFeedback({
          type: 'error',
          message: 'Gagal menyimpan presensi offline ke penyimpanan perangkat.',
        });
        return;
      }
    }

    // Online submission with automatic offline fallback on network failure
    try {
      const res = await submitGpsClockIn({
        employeeEmail: employee?.email,
        latitude: geoCoords.latitude,
        longitude: geoCoords.longitude,
        accuracy: geoCoords.accuracy,
        deviceInfo,
        notes: notes.trim(),
        recordedAt: now.toISOString(),
      });

      setIsSubmitting(false);

      if (res.success && res.data) {
        setAttendance(res.data.record);
        setFeedback({
          type: 'success',
          message: res.data.isInsideRadius
            ? `Clock In Berhasil! Terverifikasi di ${res.data.officeName} (${res.data.distanceMeters}m).`
            : `Clock In Tercatat (Di luar radius ${res.data.distanceMeters}m). Menunggu review HR.`,
        });
      } else {
        setFeedback({
          type: 'error',
          message: res.error || 'Gagal melakukan Clock In',
        });
      }
    } catch (err: any) {
      console.warn('Network error during clock in, saving to offline queue:', err);
      try {
        await saveOfflineAttendance({
          type: 'clock_in',
          employeeEmail: employee?.email,
          latitude: geoCoords.latitude,
          longitude: geoCoords.longitude,
          accuracy: geoCoords.accuracy,
          deviceInfo,
          notes: notes.trim(),
          recordedAt: now.toISOString(),
        });

        setAttendance((prev: any) => ({
          ...(prev || {}),
          clock_in: currentTimeStr,
          attendance_date: now.toISOString().split('T')[0],
        }));

        setIsSubmitting(false);
        setFeedback({
          type: 'success',
          message: `Koneksi terputus saat submit. Presensi otomatis dialihkan dan disimpan di Antrean Offline lokal (${currentTimeStr}).`,
        });
        loadOfflineQueue();
        window.dispatchEvent(new CustomEvent('hris-queue-changed'));
      } catch {
        setIsSubmitting(false);
        setFeedback({
          type: 'error',
          message: err?.message || 'Terjadi kesalahan sistem saat Clock In',
        });
      }
    }
  };

  // Handle Clock Out (with Offline Queue Fallback)
  const handleClockOut = async () => {
    if (!geoCoords) {
      setFeedback({
        type: 'error',
        message: 'Koordinat lokasi belum terdeteksi.',
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    const now = new Date();
    const currentTimeStr = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(now);
    const deviceInfo = getClientDeviceSummary();
    const isDeviceOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    // Direct Offline Submission
    if (!isDeviceOnline) {
      try {
        await saveOfflineAttendance({
          type: 'clock_out',
          employeeEmail: employee?.email,
          latitude: geoCoords.latitude,
          longitude: geoCoords.longitude,
          accuracy: geoCoords.accuracy,
          deviceInfo,
          recordedAt: now.toISOString(),
        });

        setAttendance((prev: any) => ({
          ...prev,
          clock_out: currentTimeStr,
        }));

        setIsSubmitting(false);
        setFeedback({
          type: 'success',
          message: `Clock Out tersimpan di Antrean Offline (IndexedDB) pada pukul ${currentTimeStr}. Selamat beristirahat!`,
        });
        loadOfflineQueue();
        window.dispatchEvent(new CustomEvent('hris-queue-changed'));
        return;
      } catch {
        setIsSubmitting(false);
        setFeedback({
          type: 'error',
          message: 'Gagal menyimpan Clock Out offline ke penyimpanan perangkat.',
        });
        return;
      }
    }

    try {
      const res = await submitGpsClockOut({
        employeeEmail: employee?.email,
        latitude: geoCoords.latitude,
        longitude: geoCoords.longitude,
        accuracy: geoCoords.accuracy,
        deviceInfo,
        recordedAt: now.toISOString(),
      });

      setIsSubmitting(false);

      if (res.success && res.data) {
        setAttendance((prev: any) => ({
          ...prev,
          clock_out: res.data.clockOutTime,
          work_minutes: res.data.workMinutes,
        }));
        setFeedback({
          type: 'success',
          message: `Clock Out Berhasil pada jam ${res.data.clockOutTime}! Selamat beristirahat.`,
        });
      } else {
        setFeedback({
          type: 'error',
          message: res.error || 'Gagal melakukan Clock Out',
        });
      }
    } catch (err: any) {
      console.warn('Network error during clock out, saving to offline queue:', err);
      try {
        await saveOfflineAttendance({
          type: 'clock_out',
          employeeEmail: employee?.email,
          latitude: geoCoords.latitude,
          longitude: geoCoords.longitude,
          accuracy: geoCoords.accuracy,
          deviceInfo,
          recordedAt: now.toISOString(),
        });

        setAttendance((prev: any) => ({
          ...prev,
          clock_out: currentTimeStr,
        }));

        setIsSubmitting(false);
        setFeedback({
          type: 'success',
          message: `Koneksi terputus saat submit. Clock Out otomatis dialihkan dan disimpan di Antrean Offline (${currentTimeStr}).`,
        });
        loadOfflineQueue();
        window.dispatchEvent(new CustomEvent('hris-queue-changed'));
      } catch {
        setIsSubmitting(false);
        setFeedback({
          type: 'error',
          message: err?.message || 'Terjadi kesalahan sistem saat Clock Out',
        });
      }
    }
  };

  const handleManualQueueSync = async () => {
    setIsSyncingQueue(true);
    await syncAllOfflineData();
    setIsSyncingQueue(false);
    loadOfflineQueue();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Presensi GPS & Geofencing
                <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Fallback System
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Pencatatan kehadiran mandiri berbasis koordinat lokasi untuk kantor cabang & dinas luar.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            loadStatus();
            detectLocation();
          }}
          disabled={isLocating}
          className="self-start sm:self-auto px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800/80 text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${
              isLocating ? 'animate-spin text-blue-400' : 'text-slate-400'
            }`}
          />
          <span>Segarkan Lokasi</span>
        </button>
      </div>

      {/* Live Digital Clock Banner */}
      <ClockBanner currentTime={currentTime} attendance={attendance} />

      {/* Geofencing & GPS Proximity Card */}
      <GeoStatusCard
        isLocating={isLocating}
        geoCoords={geoCoords}
        geoError={geoError}
        closestOfficeInfo={closestOfficeInfo}
      />

      {/* Main Action Box */}
      <ClockActionCard
        attendance={attendance}
        closestOfficeInfo={closestOfficeInfo}
        notes={notes}
        setNotes={setNotes}
        presetReasons={PRESET_REASONS}
        isSubmitting={isSubmitting}
        isLocating={isLocating}
        geoCoords={geoCoords}
        feedback={feedback}
        onClockIn={handleClockIn}
        onClockOut={handleClockOut}
      />

      {/* Audit Log Card */}
      <AttendanceAuditTrail attendance={attendance} />

      {/* Offline Queue Section */}
      <OfflineQueueCard
        offlineQueue={offlineQueue}
        isSyncingQueue={isSyncingQueue}
        isOffline={isOffline}
        onSyncQueue={handleManualQueueSync}
      />
    </div>
  );
}
