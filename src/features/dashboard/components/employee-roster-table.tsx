import React, { useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { EmployeeReportRow } from '@/app/actions/reports';
import { formatIDR } from '@/lib/formatters';
import { Search, ArrowUpRight, Users } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';

interface EmployeeRosterTableProps {
  rows: EmployeeReportRow[];
  periodLabel: string;
  activeTab: 'hr' | 'management';
}

export function EmployeeRosterTable({
  rows,
  periodLabel,
  activeTab,
}: EmployeeRosterTableProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRows = rows.filter((row) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      row.fullName.toLowerCase().includes(q) ||
      (row.nik && row.nik.toLowerCase().includes(q)) ||
      row.divisionName.toLowerCase().includes(q)
    );
  });

  return (
    <Card className="p-4 sm:p-5 bg-[#0d1322] border-slate-800/80">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
        <div>
          <h3 className="text-sm sm:text-base font-semibold text-slate-100">
            Roster Rekapitulasi Presensi & Lembur Karyawan
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Menampilkan seluruh karyawan aktif dalam periode {periodLabel}
          </p>
        </div>

        {/* Search filter input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama, NIK, divisi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {filteredRows.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Tidak Ada Karyawan Cocok"
          description="Tidak ditemukan data presensi karyawan yang sesuai dengan kriteria pencarian."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800/60">
          <table className="w-full text-left text-xs text-slate-300 border-collapse">
            <thead className="bg-slate-900/90 text-slate-400 uppercase font-mono text-[11px] border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Karyawan</th>
                <th className="px-4 py-3">Divisi</th>
                <th className="px-4 py-3 text-center">Tepat Waktu</th>
                <th className="px-4 py-3 text-center">Keterlambatan</th>
                <th className="px-4 py-3 text-center">Jam Lembur</th>
                <th className="px-4 py-3 text-center">Cuti / Izin</th>
                {activeTab === 'management' && (
                  <th className="px-4 py-3 text-right">Gaji Pokok</th>
                )}
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredRows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-850/40 transition-colors">
                  {/* Employee Name & NIK */}
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-100">{row.fullName}</div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      {row.nik || '-'} &bull;{' '}
                      <span className="uppercase text-[10px] text-slate-500">{row.role}</span>
                    </div>
                  </td>

                  {/* Division */}
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 text-[11px] border border-slate-700/60">
                      {row.divisionName}
                    </span>
                  </td>

                  {/* Present Days */}
                  <td className="px-4 py-3 text-center font-mono">
                    <span className="text-emerald-400 font-semibold">{row.presentDays}</span> hari
                  </td>

                  {/* Late Days & Minutes */}
                  <td className="px-4 py-3 text-center font-mono">
                    {row.lateDays > 0 ? (
                      <div>
                        <span className="text-amber-400 font-semibold">{row.lateDays}x</span> ({row.totalLateMinutes} mnt)
                        {row.excusedLateDays > 0 && (
                          <span className="block text-[10px] text-emerald-400/90">
                            {row.excusedLateDays} izin sah
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-500">0</span>
                    )}
                  </td>

                  {/* Overtime Hours */}
                  <td className="px-4 py-3 text-center font-mono">
                    {row.overtimeHours > 0 ? (
                      <span className="text-purple-400 font-semibold">
                        {row.overtimeHours.toFixed(1)} jam
                      </span>
                    ) : (
                      <span className="text-slate-500">0</span>
                    )}
                  </td>

                  {/* Leave Days */}
                  <td className="px-4 py-3 text-center font-mono">
                    {row.leaveDays > 0 ? (
                      <span className="text-blue-400 font-semibold">{row.leaveDays} hari</span>
                    ) : (
                      <span className="text-slate-500">0</span>
                    )}
                  </td>

                  {/* Base Salary (Management Tab) */}
                  {activeTab === 'management' && (
                    <td className="px-4 py-3 text-right font-mono text-slate-200">
                      {row.baseSalary > 0 ? formatIDR(row.baseSalary) : '-'}
                    </td>
                  )}

                  {/* Action Link */}
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/employees/${row.id}`}
                      className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 hover:underline"
                    >
                      <span>Profil</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
