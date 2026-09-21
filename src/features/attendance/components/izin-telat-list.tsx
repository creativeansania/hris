import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Clock, Check, Ban, FileText } from 'lucide-react';
import { IzinTelatItem } from '@/types/database';

interface IzinTelatListProps {
  requests: IzinTelatItem[];
  onDecide: (requestId: string, decision: 'approved' | 'rejected') => void;
  decidingId: string | null;
}

export function IzinTelatList({ requests, onDecide, decidingId }: IzinTelatListProps) {
  if (requests.length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title="Tidak Ada Permohonan Izin Telat"
        description="Semua permohonan dispensasi keterlambatan karyawan telah diproses."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">
          Permohonan Dispensasi Izin Keterlambatan
        </h3>
        <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
          {requests.length} pengajuan
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {requests.map((req) => {
          const isProcessing = decidingId === req.id;

          return (
            <Card
              key={req.id}
              className="p-4 bg-[#0d1322] border-slate-800/80 flex flex-col justify-between hover:border-slate-700 transition-colors"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h4 className="font-semibold text-white text-xs">
                      {req.employee?.full_name || 'Karyawan'}
                    </h4>
                    <p className="text-[11px] text-slate-400 font-mono">
                      {req.request_date || req.start_date} &bull; {req.employee?.division?.name || 'Umum'}
                    </p>
                  </div>
                  <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20 font-medium">
                    Menunggu HR
                  </span>
                </div>

                <div className="my-3 p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] space-y-1">
                  <div className="flex justify-between text-slate-400">
                    <span>Estimasi Keterlambatan:</span>
                    <span className="font-mono text-amber-400 font-bold">
                      {req.late_minutes || 0} menit
                    </span>
                  </div>
                  <div className="text-slate-400 pt-1">
                    <span className="text-slate-500">Alasan Keterlambatan:</span>
                    <p className="text-slate-200 mt-0.5 italic">
                      &ldquo;{req.reason || req.notes || 'Tidak ada keterangan'}&rdquo;
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDecide(req.id, 'rejected')}
                  disabled={isProcessing}
                  className="border-rose-500/40 text-rose-400 hover:bg-rose-500/10 text-xs flex-1"
                >
                  <Ban className="w-3.5 h-3.5 mr-1" />
                  Tolak
                </Button>
                <Button
                  size="sm"
                  onClick={() => onDecide(req.id, 'approved')}
                  disabled={isProcessing}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs flex-1"
                >
                  <Check className="w-3.5 h-3.5 mr-1" />
                  Beri Dispensasi
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
