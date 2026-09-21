'use client';

import React from 'react';
import { Briefcase, Plus } from 'lucide-react';
import { EmployeePosition } from '@/types/database';

interface EmployeePositionsTabProps {
  positions: EmployeePosition[];
  currentDivisionName?: string;
  onOpenAddPosition: () => void;
}

export function EmployeePositionsTab({
  positions,
  currentDivisionName = 'N/A',
  onOpenAddPosition,
}: EmployeePositionsTabProps) {
  return (
    <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-blue-400" />
            Riwayat Jabatan & Mutasi Divisi
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Histori perjalanan karier, mutasi antar divisi, dan promosi jabatan karyawan.
          </p>
        </div>
        <button
          onClick={onOpenAddPosition}
          className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-lg shadow-blue-600/20 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          Catat Mutasi Jabatan
        </button>
      </div>

      {positions.length === 0 ? (
        <div className="py-12 text-center text-slate-400">
          <Briefcase className="w-8 h-8 mx-auto mb-2 text-slate-500" />
          <p className="text-xs">
            Belum ada data mutasi yang dicatat. Divisi saat ini:{' '}
            <strong>{currentDivisionName}</strong>.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              <tr>
                <th className="px-4 py-3">Divisi</th>
                <th className="px-4 py-3">Judul Jabatan</th>
                <th className="px-4 py-3">Mulai Menjabat</th>
                <th className="px-4 py-3">Selesai Menjabat</th>
                <th className="px-4 py-3">Dicatat Oleh</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {positions.map((p, idx) => (
                <tr key={p.id} className="hover:bg-slate-900/40 transition">
                  <td className="px-4 py-3 font-semibold text-white">
                    {p.division?.name || '-'}
                    {idx === 0 && (
                      <span className="ml-2 text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Posisi Terkini
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold text-blue-400">
                    {p.position_title || 'Staff'}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-200">{p.start_date}</td>
                  <td className="px-4 py-3 font-mono text-slate-200">
                    {p.end_date || 'Sekarang (Aktif)'}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {p.created_by_user?.full_name || 'HR Admin'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
