import React from 'react';
import {
  Compass,
  AlertTriangle,
  Building,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { OfficeLocationGeo } from '@/lib/geo/haversine';

interface GeoStatusCardProps {
  isLocating: boolean;
  geoCoords: {
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null;
  geoError: string | null;
  closestOfficeInfo: {
    office: OfficeLocationGeo | null;
    distanceMeters: number;
    isWithinRadius: boolean;
  } | null;
}

export function GeoStatusCard({
  isLocating,
  geoCoords,
  geoError,
  closestOfficeInfo,
}: GeoStatusCardProps) {
  return (
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
  );
}
