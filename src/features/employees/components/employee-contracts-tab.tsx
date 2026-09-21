'use client';

import React from 'react';
import { FileText, Plus } from 'lucide-react';
import { EmployeeContract } from '@/types/database';

interface EmployeeContractsTabProps {
  contracts: EmployeeContract[];
  onOpenAddContract: () => void;
}

export function EmployeeContractsTab({
  contracts,
  onOpenAddContract,
}: EmployeeContractsTabProps) {
  return (
    <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            Riwayat Kontrak Kerja Karyawan
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Pencatatan riwayat kontrak PKWT dan PKWTT secara permanen (histori lengkap, bukan overwrite).
          </p>
        </div>
        <button
          onClick={onOpenAddContract}
          className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-lg shadow-blue-600/20 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          Tambah Kontrak Baru
        </button>
      </div>

      {contracts.length === 0 ? (
        <div className="py-12 text-center text-slate-400">
          <FileText className="w-8 h-8 mx-auto mb-2 text-slate-500" />
          <p className="text-xs">Belum ada data kontrak kerja yang tercatat.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              <tr>
                <th className="px-4 py-3">Tipe Kontrak</th>
                <th className="px-4 py-3">Periode Mulai</th>
                <th className="px-4 py-3">Periode Berakhir</th>
                <th className="px-4 py-3">Gaji Pokok</th>
                <th className="px-4 py-3 text-center">Status / Urgensi</th>
                <th className="px-4 py-3">Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {contracts.map((c, idx) => (
                <tr key={c.id} className="hover:bg-slate-900/40 transition font-sans">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold uppercase text-white font-mono">
                        {c.contract_type}
                      </span>
                      {idx === 0 && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 font-semibold">
                          Aktif Terkini
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-200">{c.start_date}</td>
                  <td className="px-4 py-3 font-mono text-slate-200">
                    {c.end_date || 'Permanen (PKWTT)'}
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-emerald-400">
                    Rp {c.base_salary.toLocaleString('id-ID')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {c.contract_type === 'pkwtt' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Karyawan Tetap
                      </span>
                    ) : c.status_urgency === 'critical' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        H-7 Kritis ({c.days_remaining} Hari)
                      </span>
                    ) : c.status_urgency === 'warning' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        H-30 Peringatan ({c.days_remaining} Hari)
                      </span>
                    ) : c.status_urgency === 'expired' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-400">
                        Kedaluwarsa
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-400">
                        Aktif Aman
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-400 italic text-[11px]">
                    {c.notes || '-'}
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
