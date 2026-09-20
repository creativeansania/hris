import React from 'react';
import { AttendanceRecordItem } from '@/app/actions/attendance';
import { AttendanceStatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PaginationControls } from '@/components/ui/pagination';
import { Users, Edit2, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';

interface AttendanceRecordsTableProps {
  records: AttendanceRecordItem[];
  onEditRecord: (record: AttendanceRecordItem) => void;
  currentPage?: number;
  totalPages?: number;
  totalItems?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
}

export function AttendanceRecordsTable({
  records,
  onEditRecord,
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}: AttendanceRecordsTableProps) {
  if (records.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="Tidak Ada Data Presensi"
        description="Tidak ditemukan riwayat kehadiran karyawan yang sesuai dengan kriteria filter saat ini."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-[#0d1322]">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-semibold">
              <th className="py-3 px-3">Tanggal</th>
              <th className="py-3 px-3">Karyawan</th>
              <th className="py-3 px-3">Divisi</th>
              <th className="py-3 px-3 text-center">Clock In</th>
              <th className="py-3 px-3 text-center">Clock Out</th>
              <th className="py-3 px-3 text-center">Telat (Menit)</th>
              <th className="py-3 px-3 text-center">Status</th>
              <th className="py-3 px-3 text-center">Sumber</th>
              <th className="py-3 px-3 text-center">Tindakan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {records.map((rec) => {
              const isLate = rec.late_minutes > 0;
              const isAbsent = rec.is_absent || (!rec.clock_in && !rec.clock_out);
              const status = isAbsent ? 'absent' : isLate ? 'late' : 'present';

              return (
                <tr key={rec.id} className="hover:bg-slate-850/40 transition-colors">
                  <td className="py-3 px-3 font-mono text-slate-300 whitespace-nowrap">
                    {rec.attendance_date}
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-medium text-white">
                      {rec.employee?.full_name || 'Karyawan'}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {rec.employee?.email || '-'}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-slate-400">
                    {rec.employee?.division?.name || 'Umum'}
                  </td>
                  <td className="py-3 px-3 text-center font-mono">
                    {rec.clock_in ? (
                      <span className={isLate ? 'text-amber-400 font-semibold' : 'text-slate-200'}>
                        {rec.clock_in.slice(0, 5)}
                      </span>
                    ) : (
                      <span className="text-slate-600">&mdash;</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center font-mono">
                    {rec.clock_out ? (
                      <span className="text-slate-200">{rec.clock_out.slice(0, 5)}</span>
                    ) : (
                      <span className="text-slate-600">&mdash;</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center font-mono">
                    {rec.late_minutes > 0 ? (
                      <span className="text-amber-400 font-semibold">
                        +{rec.late_minutes} mnt
                      </span>
                    ) : (
                      <span className="text-slate-500">0</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <AttendanceStatusBadge status={status} />
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/50">
                      {rec.source || 'fingerprint'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onEditRecord(rec)}
                      className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-[11px] py-1 px-2 h-7"
                    >
                      <Edit2 className="w-3 h-3 mr-1 text-blue-400" />
                      Koreksi
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {currentPage && totalPages && onPageChange && totalItems !== undefined && pageSize && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}
