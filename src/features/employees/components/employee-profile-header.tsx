'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  Calendar,
  Mail,
  Phone,
  Plus,
  User,
  Trash2,
} from 'lucide-react';
import { RoleBadge, StatusBadge } from '@/components/ui/badge';
import { Employee } from '@/types/database';

interface EmployeeProfileHeaderProps {
  employee: Employee;
  onOpenAddContract: () => void;
  onOpenDelete?: () => void;
}

export function EmployeeProfileHeader({
  employee,
  onOpenAddContract,
  onOpenDelete,
}: EmployeeProfileHeaderProps) {
  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2.5 text-xs text-slate-400">
          <Link
            href="/employees"
            className="text-slate-400 hover:text-white transition flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Data Karyawan
          </Link>
          <span>/</span>
          <span className="text-slate-200 font-semibold">{employee.full_name}</span>
        </div>

        <div className="flex items-center gap-2">
          {onOpenDelete && (
            <button
              onClick={onOpenDelete}
              className="px-3.5 py-2 rounded-xl bg-rose-600/10 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/20 hover:border-rose-600 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Hapus / Reset Akun Karyawan"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Hapus Akun
            </button>
          )}
          <button
            onClick={onOpenAddContract}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-lg shadow-blue-600/20 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Tambah / Perpanjang Kontrak
          </button>
        </div>
      </div>

      {/* Executive Header Card */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xl font-bold text-white overflow-hidden shrink-0 shadow-inner">
              {employee.photo_url ? (
                <img
                  src={employee.photo_url}
                  alt={employee.full_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-8 h-8 text-slate-400" />
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-extrabold text-white tracking-tight">
                  {employee.full_name}
                </h1>
                <RoleBadge role={employee.role} />
                <StatusBadge status={employee.status} />
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <Building2 className="w-3.5 h-3.5 text-blue-400" />
                  {employee.division?.name || 'Belum Ditentukan Divisi'}
                </span>
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  {employee.email}
                </span>
                {employee.phone_number && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    {employee.phone_number}
                  </span>
                )}
                {employee.join_date && (
                  <span className="flex items-center gap-1.5 font-mono">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    Bergabung: {employee.join_date}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Supervisor pill */}
          {employee.spv && (
            <div className="bg-slate-900 border border-slate-800/80 p-3 rounded-xl min-w-[200px] text-xs space-y-1">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">
                Atasan Langsung (SPV)
              </span>
              <span className="font-bold text-white block">{employee.spv.full_name}</span>
              <span className="text-[10px] text-slate-400">{employee.spv.email}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
