import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import {
  MapPin,
  Check,
  Ban,
  Smartphone,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Navigation,
} from 'lucide-react';
import { GpsReviewItem } from '@/types/database';
import { formatDeviceInfo } from '@/lib/device-parser';

interface GpsReviewListProps {
  records: GpsReviewItem[];
  onReview: (attendanceId: string, decision: 'approved' | 'rejected') => void;
  reviewingId: string | null;
}

export function GpsReviewList({ records, onReview, reviewingId }: GpsReviewListProps) {
  const [filterStatus, setFilterStatus] = useState<'pending_review' | 'all' | 'approved' | 'rejected'>('pending_review');

  const pendingCount = records.filter((r) => r.review_status === 'pending_review').length;
  const approvedCount = records.filter((r) => r.review_status === 'approved' || r.review_status === 'auto_valid').length;
  const rejectedCount = records.filter((r) => r.review_status === 'rejected').length;

  const filteredRecords = records.filter((r) => {
    if (filterStatus === 'pending_review') return r.review_status === 'pending_review';
    if (filterStatus === 'approved') return r.review_status === 'approved' || r.review_status === 'auto_valid';
    if (filterStatus === 'rejected') return r.review_status === 'rejected';
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header & Status Sub-Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0d1322] p-3.5 rounded-xl border border-slate-800">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-blue-400" />
            Verifikasi & Audit Presensi Mobile GPS
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Tinjau presensi di luar radius kantor, titik lokasi Google Maps, perangkat, dan catatan tugas.
          </p>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-900/80 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setFilterStatus('pending_review')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${
              filterStatus === 'pending_review'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>Perlu Review ({pendingCount})</span>
          </button>
          <button
            onClick={() => setFilterStatus('approved')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${
              filterStatus === 'approved'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>Disetujui ({approvedCount})</span>
          </button>
          <button
            onClick={() => setFilterStatus('rejected')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${
              filterStatus === 'rejected'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <XCircle className="w-3 h-3" />
            <span>Ditolak ({rejectedCount})</span>
          </button>
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              filterStatus === 'all'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Semua ({records.length})
          </button>
        </div>
      </div>

      {filteredRecords.length === 0 ? (
        <EmptyState
          icon={Smartphone}
          title={
            filterStatus === 'pending_review'
              ? 'Tidak Ada Antrean Perlu Review'
              : 'Tidak Ada Data Presensi GPS'
          }
          description={
            filterStatus === 'pending_review'
              ? 'Semua presensi mobile GPS telah diverifikasi atau berada dalam radius kantor.'
              : 'Tidak ditemukan riwayat presensi mobile pada filter status yang dipilih.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRecords.map((rec) => {
            const isProcessing = reviewingId === rec.id;
            const lat = rec.submitted_latitude ?? rec.latitude;
            const lng = rec.submitted_longitude ?? rec.longitude;
            const mapUrl = lat && lng ? `https://www.google.com/maps?q=${lat},${lng}` : null;
            const dist = rec.distance_to_office_meters ?? rec.distance_meters;
            const formattedDist =
              typeof dist === 'number'
                ? dist >= 1000
                  ? `${(dist / 1000).toFixed(1)} km (${Math.round(dist)} m)`
                  : `${Math.round(dist)} meter`
                : 'N/A';
            const officeName = rec.office?.name || rec.location?.name || 'Kantor Cabang';
            const notes = rec.late_reason || rec.notes;
            const device = formatDeviceInfo(rec.device_info);

            const isPending = rec.review_status === 'pending_review';
            const isApproved = rec.review_status === 'approved';
            const isAutoValid = rec.review_status === 'auto_valid';
            const isRejected = rec.review_status === 'rejected';

            return (
              <Card
                key={rec.id}
                className="p-4 bg-[#0d1322] border-slate-800/80 flex flex-col justify-between hover:border-slate-700 transition-colors"
              >
                <div>
                  {/* Card Header: Employee & Status */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h4 className="font-semibold text-white text-xs">
                        {rec.employee?.full_name || 'Karyawan'}
                      </h4>
                      <p className="text-[11px] text-slate-400 font-mono">
                        {rec.attendance_date} &bull; Jam Masuk: {rec.clock_in?.slice(0, 5) || '-'}
                      </p>
                      {rec.employee?.division?.name && (
                        <span className="text-[10px] text-slate-400 font-medium">
                          Divisi {rec.employee.division.name}
                        </span>
                      )}
                    </div>

                    {isPending && (
                      <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20 font-medium whitespace-nowrap">
                        Perlu Review
                      </span>
                    )}
                    {isApproved && (
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 font-medium whitespace-nowrap flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Disetujui
                      </span>
                    )}
                    {isAutoValid && (
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 font-medium whitespace-nowrap flex items-center gap-1">
                        <ShieldCheck className="w-2.5 h-2.5" /> Dalam Radius
                      </span>
                    )}
                    {isRejected && (
                      <span className="text-[10px] bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded border border-rose-500/20 font-medium whitespace-nowrap flex items-center gap-1">
                        <XCircle className="w-2.5 h-2.5" /> Ditolak
                      </span>
                    )}
                  </div>

                  {/* Location & Device Info Box */}
                  <div className="space-y-1.5 my-3 p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px]">
                    <div className="flex justify-between text-slate-400">
                      <span>Kantor Acuan:</span>
                      <span className="text-slate-200 font-medium">{officeName}</span>
                    </div>

                    <div className="flex justify-between text-slate-400">
                      <span>Jarak dari Kantor:</span>
                      <span
                        className={`font-mono font-medium ${
                          typeof dist === 'number' && dist > 100 ? 'text-amber-400' : 'text-emerald-400'
                        }`}
                      >
                        {formattedDist}
                      </span>
                    </div>

                    <div className="flex justify-between text-slate-400">
                      <span>Perangkat:</span>
                      <span className="text-slate-200 truncate max-w-[180px]" title={device}>
                        {device}
                      </span>
                    </div>

                    {rec.gps_accuracy_meters && (
                      <div className="flex justify-between text-slate-400">
                        <span>Akurasi GPS:</span>
                        <span className="text-slate-300 font-mono">
                          ±{Math.round(rec.gps_accuracy_meters)}m
                        </span>
                      </div>
                    )}

                    {mapUrl && (
                      <div className="pt-1.5 border-t border-slate-800/80 flex justify-end">
                        <a
                          href={mapUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-[11px] underline underline-offset-2"
                        >
                          <MapPin className="w-3 h-3" />
                          Buka Titik di Google Maps <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Notes / Reason */}
                  {notes ? (
                    <div className="text-[11px] text-slate-300 bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/60 mb-3 space-y-0.5">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block tracking-wider">
                        Catatan Tugas / Alasan:
                      </span>
                      <p className="italic text-slate-300 break-words">&ldquo;{notes}&rdquo;</p>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500 italic mb-3">
                      Tidak ada catatan tugas/keterangan yang dilampirkan.
                    </p>
                  )}
                </div>

                {/* Card Actions / Reviewer info */}
                <div className="pt-2 border-t border-slate-800">
                  {isPending ? (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onReview(rec.id, 'rejected')}
                        disabled={isProcessing}
                        className="border-rose-500/40 text-rose-400 hover:bg-rose-500/10 text-xs flex-1"
                      >
                        <Ban className="w-3.5 h-3.5 mr-1" />
                        Tolak
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => onReview(rec.id, 'approved')}
                        disabled={isProcessing}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs flex-1"
                      >
                        <Check className="w-3.5 h-3.5 mr-1" />
                        Setujui
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-[11px] text-slate-400 py-1">
                      <span>Status Review:</span>
                      <span className="font-medium text-slate-200">
                        {isApproved && (
                          <span className="text-emerald-400">
                            Disetujui {rec.reviewer?.full_name ? `(${rec.reviewer.full_name})` : ''}
                          </span>
                        )}
                        {isAutoValid && <span className="text-emerald-400">Terverifikasi Radius</span>}
                        {isRejected && (
                          <span className="text-rose-400">
                            Ditolak {rec.reviewer?.full_name ? `(${rec.reviewer.full_name})` : ''}
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
