'use client';

import React from 'react';
import { CreditCard, Phone, ShieldCheck } from 'lucide-react';
import { Employee } from '@/types/database';

interface EmployeePersonalTabProps {
  employee: Employee;
}

export function EmployeePersonalTab({ employee }: EmployeePersonalTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Identitas KTP & Pajak */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800/80 pb-3">
          <ShieldCheck className="w-4 h-4 text-blue-400" />
          Identitas KTP & Pajak
        </h3>

        <div className="space-y-3 text-xs divide-y divide-slate-800/60">
          <div className="flex justify-between items-center pt-2">
            <span className="text-slate-400">NIK (KTP):</span>
            <span className="font-mono text-white font-semibold">
              {employee.nik || '-'}
            </span>
          </div>
          <div className="flex justify-between items-center pt-2">
            <span className="text-slate-400">NPWP:</span>
            <span className="font-mono text-white font-semibold">
              {employee.npwp || '-'}
            </span>
          </div>
          <div className="flex justify-between items-center pt-2">
            <span className="text-slate-400">Jenis Kelamin:</span>
            <span className="text-white capitalize">
              {employee.gender ? employee.gender.replace('_', ' ') : '-'}
            </span>
          </div>
          <div className="flex justify-between items-center pt-2">
            <span className="text-slate-400">Tempat & Tanggal Lahir:</span>
            <span className="text-white">
              {employee.place_of_birth ? `${employee.place_of_birth}, ` : ''}
              {employee.birth_date || '-'}
            </span>
          </div>
          <div className="flex justify-between items-center pt-2">
            <span className="text-slate-400">Agama:</span>
            <span className="text-white capitalize">{employee.religion || '-'}</span>
          </div>
          <div className="flex justify-between items-center pt-2">
            <span className="text-slate-400">Status Perkawinan & PTKP:</span>
            <span className="text-white capitalize font-mono">
              {employee.marital_status ? employee.marital_status.replace('_', ' ') : '-'}{' '}
              (Tanggungan: {employee.dependents_count || 0})
            </span>
          </div>
          <div className="pt-2">
            <span className="text-slate-400 block mb-1">Alamat Domisili / KTP:</span>
            <p className="text-slate-200 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/60 leading-relaxed">
              {employee.address || 'Alamat belum diinput'}
            </p>
          </div>
        </div>
      </div>

      {/* Kontak Darurat & Perbankan */}
      <div className="space-y-6">
        {/* Kontak Darurat */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800/80 pb-3">
            <Phone className="w-4 h-4 text-emerald-400" />
            Kontak Darurat
          </h3>
          <div className="space-y-3 text-xs divide-y divide-slate-800/60">
            <div className="flex justify-between items-center pt-2">
              <span className="text-slate-400">Nama Kontak Darurat:</span>
              <span className="font-semibold text-white">
                {employee.emergency_contact_name || '-'}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-slate-400">Nomor Telepon Darurat:</span>
              <span className="font-mono text-emerald-400 font-bold">
                {employee.emergency_contact_phone || '-'}
              </span>
            </div>
          </div>
        </div>

        {/* Informasi Bank Payroll */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800/80 pb-3">
            <CreditCard className="w-4 h-4 text-amber-400" />
            Informasi Bank (Transfer Gaji)
          </h3>
          <div className="space-y-3 text-xs divide-y divide-slate-800/60">
            <div className="flex justify-between items-center pt-2">
              <span className="text-slate-400">Nama Bank:</span>
              <span className="font-bold text-white uppercase">
                {employee.bank_name || '-'}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-slate-400">Nomor Rekening:</span>
              <span className="font-mono text-amber-400 font-extrabold text-sm">
                {employee.bank_account_no || '-'}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-slate-400">Atas Nama Rekening:</span>
              <span className="text-white font-semibold">
                {employee.bank_account_name || '-'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
