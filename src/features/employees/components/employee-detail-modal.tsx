'use client';

import React from 'react';
import Link from 'next/link';
import { FileText, ArrowUpRight } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { RoleBadge, StatusBadge } from '@/components/ui/badge';
import { Employee } from '@/types/database';

interface EmployeeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
}

export function EmployeeDetailModal({
  isOpen,
  onClose,
  employee,
}: EmployeeDetailModalProps) {
  if (!isOpen || !employee) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Detail Profil Karyawan"
      description="Informasi lengkap personal, kepegawaian, dan rekening transfer"
      maxWidth="2xl"
    >
      <div className="space-y-5 text-xs text-slate-300">
        {/* Header info */}
        <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-lg font-bold text-white shadow-inner">
            {employee.full_name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="text-base font-bold text-white">
                {employee.full_name}
              </h4>
              <RoleBadge role={employee.role} />
              <StatusBadge status={employee.status} />
            </div>
            <p className="text-slate-400 text-xs mt-0.5">{employee.email}</p>
          </div>
        </div>

        {/* Grid sections */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-2">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">
              STRUKTUR ORGANISASI
            </span>
            <div>
              <span className="text-slate-500 block">Divisi:</span>
              <span className="font-medium text-slate-200">
                {employee.division?.name || 'Belum diplot'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Atasan Langsung (SPV):</span>
              <span className="font-medium text-slate-200">
                {employee.spv?.full_name || 'Tidak ada (Direksi)'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Jadwal Kerja:</span>
              <span className="font-medium text-slate-200">
                {employee.work_schedule?.name || 'Jadwal Standar'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">ID Fingerprint AC:</span>
              <span className="font-mono text-slate-200">
                {employee.fingerprint_ac_no || '-'}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-2">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">
              REKENING PAYROLL
            </span>
            <div>
              <span className="text-slate-500 block">Bank:</span>
              <span className="font-medium text-slate-200">
                {employee.bank_name || '-'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Nomor Rekening:</span>
              <span className="font-mono text-slate-200">
                {employee.bank_account_no || '-'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Atas Nama:</span>
              <span className="font-medium text-slate-200">
                {employee.bank_account_name || '-'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Tanggal Bergabung:</span>
              <span className="font-mono text-slate-200">
                {employee.join_date || '-'}
              </span>
            </div>
          </div>
        </div>

        {/* Emergency and personal details */}
        <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-2">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">
            KONTAK DARURAT & BIODATA
          </span>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-slate-500 block">Kontak Darurat:</span>
              <span className="text-slate-200">
                {employee.emergency_contact_name || '-'} (
                {employee.emergency_contact_phone || '-'})
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">NIK KTP:</span>
              <span className="font-mono text-slate-200">
                {employee.nik || '-'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Tempat & Tanggal Lahir:</span>
              <span className="text-slate-200">
                {employee.place_of_birth || '-'}, {employee.birth_date || '-'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Status Pernikahan / Anak:</span>
              <span className="text-slate-200 capitalize">
                {employee.marital_status?.replace('_', ' ') || '-'} (
                {employee.dependents_count || 0} Tanggungan)
              </span>
            </div>
          </div>
        </div>

        <div className="pt-3 flex items-center justify-between border-t border-slate-800/80">
          <Link
            href={`/employees/${employee.id}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Buka Profil Lengkap & Histori Kontrak</span>
            <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
          >
            Tutup
          </Button>
        </div>
      </div>
    </Modal>
  );
}
