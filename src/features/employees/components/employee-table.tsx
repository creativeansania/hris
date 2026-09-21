'use client';

import React from 'react';
import Link from 'next/link';
import { Users, FileText, Eye, Edit2, UserX, CheckCircle2, Trash2 } from 'lucide-react';
import { RoleBadge, StatusBadge } from '@/components/ui/badge';
import { Employee } from '@/types/database';

interface EmployeeTableProps {
  employees: Employee[];
  isLoading: boolean;
  onOpenDetail: (emp: Employee) => void;
  onOpenEdit: (emp: Employee) => void;
  onToggleStatus: (emp: Employee) => void;
  onOpenDelete?: (emp: Employee) => void;
}

export function EmployeeTable({
  employees,
  isLoading,
  onOpenDetail,
  onOpenEdit,
  onToggleStatus,
  onOpenDelete,
}: EmployeeTableProps) {
  if (isLoading) {
    return (
      <div className="py-16 text-center text-xs text-slate-400">
        <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
        Memuat data karyawan...
      </div>
    );
  }

  if (employees.length === 0) {
    return (
      <div className="py-16 text-center text-xs text-slate-400 border border-dashed border-slate-800 rounded-xl my-4">
        <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
        <p className="text-slate-300 font-medium">Tidak ada data karyawan yang cocok</p>
        <p className="text-slate-500 mt-0.5">
          Coba sesuaikan kata kunci pencarian atau filter di atas.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto mt-4">
      <table className="w-full text-left text-xs text-slate-300">
        <thead className="bg-slate-900/60 text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider font-mono">
          <tr>
            <th className="py-3 px-4 font-semibold">Karyawan</th>
            <th className="py-3 px-4 font-semibold">Role</th>
            <th className="py-3 px-4 font-semibold">Divisi</th>
            <th className="py-3 px-4 font-semibold">Atasan (SPV)</th>
            <th className="py-3 px-4 font-semibold">Status Akun</th>
            <th className="py-3 px-4 font-semibold">Tanggal Masuk</th>
            <th className="py-3 px-4 text-right font-semibold">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {employees.map((emp) => (
            <tr key={emp.id} className="hover:bg-slate-800/30 transition">
              <td className="py-3.5 px-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center font-bold text-white text-xs shrink-0 ring-1 ring-white/10">
                    {emp.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-100 block">
                      {emp.full_name}
                    </span>
                    <span className="text-slate-400 text-[11px] block">
                      {emp.email}
                    </span>
                  </div>
                </div>
              </td>
              <td className="py-3.5 px-4">
                <RoleBadge role={emp.role} />
              </td>
              <td className="py-3.5 px-4">
                {emp.division?.name ? (
                  <span className="text-slate-300 font-medium">
                    {emp.division.name}
                  </span>
                ) : (
                  <span className="text-slate-500 italic">-</span>
                )}
              </td>
              <td className="py-3.5 px-4 text-slate-400">
                {emp.spv?.full_name || '-'}
              </td>
              <td className="py-3.5 px-4">
                <StatusBadge status={emp.status} />
              </td>
              <td className="py-3.5 px-4 font-mono text-slate-400">
                {emp.join_date || '-'}
              </td>
              <td className="py-3.5 px-4 text-right">
                <div className="inline-flex items-center gap-1">
                  <Link
                    href={`/employees/${emp.id}`}
                    className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800/60 rounded-md transition"
                    title="Buka Profil Lengkap & Riwayat Kontrak"
                  >
                    <FileText className="w-3.5 h-3.5" />
                  </Link>
                  <button
                    onClick={() => onOpenDetail(emp)}
                    className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800/60 rounded-md transition"
                    title="Lihat Ringkasan"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onOpenEdit(emp)}
                    className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800/60 rounded-md transition"
                    title="Edit Data"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onToggleStatus(emp)}
                    className={`p-1.5 rounded-md transition ${
                      emp.status === 'active'
                        ? 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/10'
                        : 'text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10'
                    }`}
                    title={emp.status === 'active' ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}
                  >
                    {emp.status === 'active' ? (
                      <UserX className="w-3.5 h-3.5" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                  {onOpenDelete && (
                    <button
                      onClick={() => onOpenDelete(emp)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition"
                      title="Hapus Akun / Karyawan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
