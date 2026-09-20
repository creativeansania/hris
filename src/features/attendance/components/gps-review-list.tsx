import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { MapPin, Check, Ban, Smartphone, ExternalLink, ShieldCheck } from 'lucide-react';

interface GpsReviewListProps {
  records: any[];
  onReview: (attendanceId: string, decision: 'approved' | 'rejected') => void;
  reviewingId: string | null;
}

export function GpsReviewList({ records, onReview, reviewingId }: GpsReviewListProps) {
  if (records.length === 0) {
    return (
      <EmptyState
        icon={Smartphone}
        title="Tidak Ada Antrean GPS Review"
        description="Semua absensi mobile GPS telah diverifikasi atau tidak memerlukan tindakan persetujuan saat ini."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Antrean Verifikasi Presensi GPS Mobile</h3>
        <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
          {records.length} antrean
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {records.map((rec) => {
          const isProcessing = reviewingId === rec.id;
          const mapUrl = rec.latitude && rec.longitude
            ? `https://www.google.com/maps?q=${rec.latitude},${rec.longitude}`
            : null;

          return (
            <Card
              key={rec.id}
              className="p-4 bg-[#0d1322] border-slate-800/80 flex flex-col justify-between hover:border-slate-700 transition-colors"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h4 className="font-semibold text-white text-xs">
                      {rec.employee?.full_name || 'Karyawan'}
                    </h4>
                    <p className="text-[11px] text-slate-400 font-mono">
                      {rec.attendance_date} &bull; {rec.clock_in?.slice(0, 5) || '-'}
                    </p>
                  </div>
                  <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20 font-medium">
                    Perlu Review
                  </span>
                </div>

                <div className="space-y-1.5 my-3 p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px]">
                  <div className="flex justify-between text-slate-400">
                    <span>Lokasi Presensi:</span>
                    <span className="text-slate-200">{rec.location?.name || 'Luar Radius'}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Jarak dari Kantor:</span>
                    <span className="font-mono text-amber-400 font-medium">
                      {rec.distance_meters ? `${Math.round(rec.distance_meters)} meter` : 'N/A'}
                    </span>
                  </div>
                  {mapUrl && (
                    <div className="pt-1 flex justify-end">
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

                {rec.notes && (
                  <p className="text-[11px] text-slate-400 italic bg-slate-900/40 p-2 rounded border border-slate-800/60 mb-3">
                    &ldquo;{rec.notes}&rdquo;
                  </p>
                )}
              </div>

              <div className="pt-2 border-t border-slate-800 flex gap-2">
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
            </Card>
          );
        })}
      </div>
    </div>
  );
}
