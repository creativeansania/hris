'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  MapPin,
  Clock,
  Compass,
  AlertTriangle,
  CheckCircle2,
  Navigation,
  RefreshCw,
  Building,
  ShieldCheck,
  Smartphone,
  Info,
  Calendar,
  Sparkles,
  ArrowRight,
  LogOut,
  LogIn,
  Database,
  WifiOff,
  CloudUpload,
} from 'lucide-react';
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
import { createClient } from '@/lib/supabase/client';
import {
  saveOfflineAttendance,
  getPendingAttendanceQueue,
  cacheMasterData,
  getCachedMasterData,
  OfflineAttendanceItem,
} from '@/lib/offline-db';
import { syncAllOfflineData } from '@/lib/sync-engine';

export default function ClockInPage() {
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
  const [attendance, setAttendance] = useState<any>(null);
  const [employee, setEmployee] = useState<any>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState<boolean>(true);

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
            setGeoError('Izin akses lokasi ditolak. Harap izinkan akses lokasi pada browser/ponsel Anda.');
            break;
          case error.POSITION_UNAVAILABLE:
            setGeoError('Informasi lokasi tidak tersedia. Pastikan sinyal GPS atau koneksi internet aktif.');
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
  const loadStatus = async () => {
    setIsLoadingStatus(true);
    const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
    setIsOffline(!online);

    try {
      if (online) {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        const email = user?.email || 'itkantiss@gmail.com';
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
  };

  useEffect(() => {
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
  }, [loadOfflineQueue]);

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
        message: `Akurasi GPS terlalu rendah (±${Math.round(geoCoords.accuracy)}m). Pindah ke ruang terbuka agar akurasi < 100m.`,
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
    const currentTimeStr = now.toLocaleTimeString('id-ID', { hour12: false });
    const deviceInfo = `${navigator.userAgent}`;
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
          attendance_date: now.toISOString().split('T')[0],
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
      } catch (saveErr) {
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
      // Network failure mid-request: save to offline queue
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
    const currentTimeStr = now.toLocaleTimeString('id-ID', { hour12: false });
    const deviceInfo = `${navigator.userAgent}`;
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

  const presetReasons = [
    'Meeting kunjungan klien di lokasi',
    'Tugas dinas operasional lapangan',
    'Bekerja remote / penugasan khusus',
    'Inspeksi proyek cabang luar kota',
  ];

  const hasClockedIn = !!attendance?.clock_in;
  const hasClockedOut = !!attendance?.clock_out;

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
          className="self-start sm:self-auto px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800/80 text-xs font-medium flex items-center gap-2 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin text-blue-400' : 'text-slate-400'}`} />
          <span>Segarkan Lokasi</span>
        </button>
      </div>

      {/* Live Digital Clock Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-[#0b1120] to-[#090d16] border border-slate-800/80 p-6 md:p-8 shadow-2xl">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-blue-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Waktu Server Indonesia (WIB)
            </span>
            <div className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono mt-1">
              {currentTime.toLocaleTimeString('id-ID', { hour12: false })}
            </div>
            <p className="text-sm text-slate-400 mt-1 capitalize font-medium">
              {currentTime.toLocaleDateString('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>

          {/* Quick status badge if clocked in */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 min-w-[150px]">
              <span className="text-[10px] font-mono uppercase text-slate-500">Jam Masuk</span>
              <p className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
                {attendance?.clock_in || '--:--'}
              </p>
              <span className="text-[10px] text-slate-500 font-mono">
                {attendance?.late_minutes > 0
                  ? `Telat +${attendance.late_minutes}m`
                  : attendance?.clock_in
                  ? 'Tepat Waktu'
                  : 'Belum Masuk'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 min-w-[150px]">
              <span className="text-[10px] font-mono uppercase text-slate-500">Jam Pulang</span>
              <p className="text-lg font-bold font-mono text-blue-400 mt-0.5">
                {attendance?.clock_out || '--:--'}
              </p>
              <span className="text-[10px] text-slate-500 font-mono">
                {attendance?.work_minutes > 0
                  ? `Total: ${Math.floor(attendance.work_minutes / 60)}j ${attendance.work_minutes % 60}m`
                  : 'Belum Pulang'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Geofencing & GPS Proximity Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Radar & Coordinates */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Compass className="w-4 h-4 text-blue-400" />
              Radar Koordinat
            </span>
            {isLocating ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse">
                Mencari GPS...
              </span>
            ) : geoCoords ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Terkunci
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-500/10 text-rose-400 border border-rose-500/20">
                Gagal
              </span>
            )}
          </div>

          <div className="space-y-2 font-mono text-xs">
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-500">Latitude:</span>
              <span className="text-slate-200">
                {geoCoords ? geoCoords.latitude.toFixed(6) : '--'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-500">Longitude:</span>
              <span className="text-slate-200">
                {geoCoords ? geoCoords.longitude.toFixed(6) : '--'}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Akurasi Sinyal:</span>
              <span
                className={`font-semibold ${
                  !geoCoords
                    ? 'text-slate-500'
                    : geoCoords.accuracy <= 50
                    ? 'text-emerald-400'
                    : geoCoords.accuracy <= 100
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
              >
                {geoCoords ? `±${Math.round(geoCoords.accuracy)} meter` : '--'}
              </span>
            </div>
          </div>

          {geoError && (
            <div className="mt-3 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px] flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{geoError}</span>
            </div>
          )}
        </div>

        {/* Closest Branch & Geofence Status */}
        <div className="md:col-span-2 p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Building className="w-4 h-4 text-blue-400" />
                Kantor Cabang Terdekat
              </span>

              {closestOfficeInfo && (
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium border flex items-center gap-1.5 ${
                    closestOfficeInfo.isWithinRadius
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}
                >
                  {closestOfficeInfo.isWithinRadius ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Dalam Radius Kantor ({closestOfficeInfo.distanceMeters}m)
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Di Luar Radius (+{closestOfficeInfo.distanceMeters}m)
                    </>
                  )}
                </span>
              )}
            </div>

            {closestOfficeInfo?.office ? (
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-white">
                  {closestOfficeInfo.office.name}
                </h3>
                <p className="text-xs text-slate-400">
                  {closestOfficeInfo.office.address || 'Alamat cabang terdaftar di database'}
                </p>
                <div className="flex items-center gap-4 text-xs font-mono text-slate-500 pt-1">
                  <span>Radius Maks: {closestOfficeInfo.office.radius_meters} meter</span>
                  <span>•</span>
                  <span
                    className={
                      closestOfficeInfo.isWithinRadius ? 'text-emerald-400' : 'text-amber-400'
                    }
                  >
                    Jarak Anda: {closestOfficeInfo.distanceMeters} meter
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-4 text-center text-slate-500 text-xs">
                {isLocating ? 'Mengkalkulasi jarak ke kantor terdaftar...' : 'Lokasi kantor belum teridentifikasi'}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>
              {closestOfficeInfo?.isWithinRadius
                ? 'Presensi Anda akan otomatis berstatus Auto-Valid tanpa perlu verifikasi manual.'
                : 'Di luar radius: Anda wajib mengisi catatan tugas dinas di bawah agar dapat disetujui HR.'}
            </span>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-start gap-3 animate-in fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />
          )}
          <div>
            <p className="font-semibold text-sm">{feedback.message}</p>
          </div>
        </div>
      )}

      {/* Main Action Box */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm space-y-6">
        {/* If outside radius and not clocked in, show required reason notes */}
        {!hasClockedIn && closestOfficeInfo && !closestOfficeInfo.isWithinRadius && (
          <div className="space-y-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
            <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Catatan Penugasan / Dinas Luar (Wajib):
            </div>
            <p className="text-xs text-slate-400">
              Karena Anda berada di luar radius kantor ({closestOfficeInfo.distanceMeters}m), tuliskan keterangan singkat agenda kerja Anda hari ini.
            </p>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {presetReasons.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setNotes(p)}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>

            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Kunjungan klien ke PT Maju Terus di Senayan..."
              className="w-full bg-[#090d16] border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        )}

        {/* Buttons State */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-400">
            {hasClockedOut ? (
              <span className="text-emerald-400 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Presensi harian Anda telah lengkap untuk hari ini.
              </span>
            ) : hasClockedIn ? (
              <span>
                Anda sudah Clock In jam <strong className="text-white font-mono">{attendance.clock_in}</strong>. Klik tombol untuk mengakhiri jam kerja.
              </span>
            ) : (
              <span>
                Pastikan posisi GPS sudah akurat sebelum menekan tombol Clock In.
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {!hasClockedIn ? (
              <button
                type="button"
                disabled={isSubmitting || isLocating || !geoCoords}
                onClick={handleClockIn}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-bold flex items-center justify-center gap-2.5 transition-all shadow-xl shadow-blue-500/25 active:scale-[0.98]"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Memproses Presensi...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Clock In Sekarang</span>
                  </>
                )}
              </button>
            ) : !hasClockedOut ? (
              <button
                type="button"
                disabled={isSubmitting || isLocating}
                onClick={handleClockOut}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-bold flex items-center justify-center gap-2.5 transition-all shadow-xl shadow-amber-500/25 active:scale-[0.98]"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Memproses Pulang...</span>
                  </>
                ) : (
                  <>
                    <LogOut className="w-4 h-4" />
                    <span>Clock Out (Pulang)</span>
                  </>
                )}
              </button>
            ) : (
              <div className="px-6 py-3 rounded-xl bg-slate-800 text-slate-400 text-xs font-mono font-medium border border-slate-700">
                Presensi Hari Ini Selesai
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Audit Log Card */}
      {attendance && (
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-3 text-xs">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-2.5">
            <span className="font-mono text-slate-400 uppercase tracking-wider text-[11px] font-semibold flex items-center gap-2">
              <Smartphone className="w-3.5 h-3.5 text-blue-400" />
              Audit Trail Presensi GPS Hari Ini
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                attendance.review_status === 'auto_valid'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : attendance.review_status === 'approved'
                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  : attendance.review_status === 'rejected'
                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}
            >
              Status: {attendance.review_status}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 font-mono text-[11px] text-slate-400">
            <div>
              <span className="text-slate-500 block">Koordinat Tercatat:</span>
              <span className="text-white">
                {attendance.submitted_latitude?.toFixed(5)}, {attendance.submitted_longitude?.toFixed(5)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Jarak ke Kantor:</span>
              <span className="text-white">
                {attendance.distance_to_office_meters || 0} meter
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Akurasi GPS:</span>
              <span className="text-white">
                ±{Math.round(attendance.gps_accuracy_meters || 0)}m
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Catatan Tugas:</span>
              <span className="text-white truncate block" title={attendance.late_reason}>
                {attendance.late_reason || '-'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Offline Queue Section */}
      {offlineQueue.length > 0 && (
        <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3 text-xs animate-in fade-in">
          <div className="flex items-center justify-between border-b border-amber-500/20 pb-2.5">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-amber-300">
                Antrean Presensi Offline ({offlineQueue.length})
              </span>
            </div>

            <button
              onClick={handleManualQueueSync}
              disabled={isSyncingQueue || isOffline}
              className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 text-[11px] font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncingQueue ? 'animate-spin' : ''}`} />
              <span>{isSyncingQueue ? 'Menyinkronkan...' : isOffline ? 'Tersimpan Offline' : 'Sinkronkan Sekarang'}</span>
            </button>
          </div>

          <div className="divide-y divide-amber-500/10">
            {offlineQueue.map((item) => (
              <div key={item.id} className="py-2 flex items-center justify-between font-mono text-[11px]">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      item.type === 'clock_in'
                        ? 'bg-blue-500/20 text-blue-300'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {item.type === 'clock_in' ? 'Clock In' : 'Clock Out'}
                  </span>
                  <span className="text-slate-300">
                    {new Date(item.recordedAt).toLocaleTimeString('id-ID', { hour12: false })}
                  </span>
                  <span className="text-slate-500 text-[10px]">
                    (±{Math.round(item.accuracy)}m)
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-amber-400 text-[10px]">
                    {item.status === 'syncing' ? 'Sedang kirim...' : 'Menunggu koneksi online'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
