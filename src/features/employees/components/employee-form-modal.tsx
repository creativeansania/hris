'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  Employee,
  Division,
  WorkScheduleGroup,
  EmployeeRole,
  GenderType,
  MaritalStatusType,
} from '@/types/database';
import { EmployeeFormData, createEmployee, updateEmployee } from '@/app/actions/employees';
import { ROLE_LABELS } from '@/lib/constants';

interface EmployeeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingEmployee: Employee | null;
  divisions: Division[];
  schedules: WorkScheduleGroup[];
  allEmployees: Employee[];
  onSuccess: () => void;
}

export function EmployeeFormModal({
  isOpen,
  onClose,
  editingEmployee,
  divisions,
  schedules,
  allEmployees,
  onSuccess,
}: EmployeeFormModalProps) {
  const [activeFormTab, setActiveFormTab] = useState<'personal' | 'org' | 'emergency' | 'bank'>('personal');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const initialFormData: EmployeeFormData = {
    full_name: '',
    email: '',
    phone_number: '',
    nik: '',
    npwp: '',
    gender: 'laki_laki',
    place_of_birth: '',
    birth_date: '',
    religion: 'Islam',
    marital_status: 'belum_kawin',
    dependents_count: 0,
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    bank_name: 'BCA',
    bank_account_no: '',
    bank_account_name: '',
    role: 'staff',
    division_id: null,
    spv_id: null,
    work_schedule_id: null,
    fingerprint_ac_no: '',
    join_date: new Date().toISOString().split('T')[0],
  };

  const [formData, setFormData] = useState<EmployeeFormData>(initialFormData);

  useEffect(() => {
    if (editingEmployee) {
      setFormData({
        full_name: editingEmployee.full_name || '',
        email: editingEmployee.email || '',
        phone_number: editingEmployee.phone_number || '',
        nik: editingEmployee.nik || '',
        npwp: editingEmployee.npwp || '',
        gender: editingEmployee.gender || 'laki_laki',
        place_of_birth: editingEmployee.place_of_birth || '',
        birth_date: editingEmployee.birth_date || '',
        religion: editingEmployee.religion || 'Islam',
        marital_status: editingEmployee.marital_status || 'belum_kawin',
        dependents_count: editingEmployee.dependents_count || 0,
        address: editingEmployee.address || '',
        emergency_contact_name: editingEmployee.emergency_contact_name || '',
        emergency_contact_phone: editingEmployee.emergency_contact_phone || '',
        bank_name: editingEmployee.bank_name || 'BCA',
        bank_account_no: editingEmployee.bank_account_no || '',
        bank_account_name: editingEmployee.bank_account_name || '',
        role: editingEmployee.role || 'staff',
        division_id: editingEmployee.division_id || null,
        spv_id: editingEmployee.spv_id || null,
        work_schedule_id: editingEmployee.work_schedule_id || null,
        fingerprint_ac_no: editingEmployee.fingerprint_ac_no || '',
        join_date: editingEmployee.join_date || new Date().toISOString().split('T')[0],
      });
    } else {
      setFormData(initialFormData);
    }
    setActiveFormTab('personal');
    setFormError(null);
  }, [editingEmployee, isOpen]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);

    try {
      if (editingEmployee) {
        const res = await updateEmployee(editingEmployee.id, formData);
        if (res.error) {
          setFormError(res.error);
        } else {
          onClose();
          onSuccess();
        }
      } else {
        const res = await createEmployee(formData);
        if (res.error) {
          setFormError(res.error);
        } else {
          onClose();
          onSuccess();
        }
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Terjadi kesalahan sistem');
    } finally {
      setFormSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingEmployee ? 'Edit Data Karyawan' : 'Tambah Karyawan Baru'}
      description="Masukkan identitas lengkap, penempatan organisasi, kontak darurat, dan informasi bank"
      maxWidth="4xl"
    >
      <form onSubmit={handleFormSubmit} className="space-y-5">
        {formError && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
            {formError}
          </div>
        )}

        {/* Form Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          {[
            { id: 'personal', label: '1. Identitas Pribadi' },
            { id: 'org', label: '2. Organisasi & Role' },
            { id: 'emergency', label: '3. Kontak Darurat' },
            { id: 'bank', label: '4. Rekening Bank' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFormTab(tab.id as typeof activeFormTab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                activeFormTab === tab.id
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Personal Info */}
        {activeFormTab === 'personal' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Nama Lengkap (Sesuai KTP)"
                placeholder="Contoh: Budi Santoso"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
                autoFocus
              />
              <Input
                label="Email Google Workspace (SSO)"
                type="email"
                placeholder="budi@perusahaan.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                helperText="Digunakan untuk otentikasi login Google"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Nomor Telepon / WhatsApp"
                placeholder="08123456789"
                value={formData.phone_number || ''}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
              />
              <Input
                label="NIK KTP (16 Digit)"
                placeholder="3171xxxxxxxxxxxx"
                value={formData.nik || ''}
                onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
              />
              <Input
                label="NPWP"
                placeholder="xx.xxx.xxx.x-xxx.xxx"
                value={formData.npwp || ''}
                onChange={(e) => setFormData({ ...formData, npwp: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Select
                label="Jenis Kelamin"
                value={formData.gender || 'laki_laki'}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value as GenderType })}
              >
                <option value="laki_laki">Laki-Laki</option>
                <option value="perempuan">Perempuan</option>
              </Select>

              <Input
                label="Tempat Lahir"
                placeholder="Jakarta"
                value={formData.place_of_birth || ''}
                onChange={(e) => setFormData({ ...formData, place_of_birth: e.target.value })}
              />

              <Input
                label="Tanggal Lahir"
                type="date"
                value={formData.birth_date || ''}
                onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
              />

              <Select
                label="Agama"
                value={formData.religion || 'Islam'}
                onChange={(e) => setFormData({ ...formData, religion: e.target.value })}
              >
                <option value="Islam">Islam</option>
                <option value="Kristen Protestan">Kristen Protestan</option>
                <option value="Katolik">Katolik</option>
                <option value="Hindu">Hindu</option>
                <option value="Buddha">Buddha</option>
                <option value="Konghucu">Konghucu</option>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Status Pernikahan (Dasar PTKP)"
                value={formData.marital_status || 'belum_kawin'}
                onChange={(e) =>
                  setFormData({ ...formData, marital_status: e.target.value as MaritalStatusType })
                }
              >
                <option value="belum_kawin">Belum Kawin</option>
                <option value="kawin">Kawin</option>
                <option value="cerai_hidup">Cerai Hidup</option>
                <option value="cerai_mati">Cerai Mati</option>
              </Select>

              <Input
                label="Jumlah Tanggungan Anak"
                type="number"
                min="0"
                max="10"
                value={formData.dependents_count}
                onChange={(e) =>
                  setFormData({ ...formData, dependents_count: parseInt(e.target.value, 10) || 0 })
                }
              />
            </div>

            <Input
              label="Alamat Lengkap KTP / Domisili"
              placeholder="Jl. Melati No. 12, RT 01 / RW 02..."
              value={formData.address || ''}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>
        )}

        {/* Tab 2: Organization Mapping */}
        {activeFormTab === 'org' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Role Akun & Hak Akses"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as EmployeeRole })}
                required
              >
                {Object.entries(ROLE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>

              <Select
                label="Divisi Organisasi"
                value={formData.division_id || ''}
                onChange={(e) => setFormData({ ...formData, division_id: e.target.value || null })}
              >
                <option value="">-- Pilih Divisi --</option>
                {divisions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Atasan Langsung (SPV / Approver)"
                value={formData.spv_id || ''}
                onChange={(e) => setFormData({ ...formData, spv_id: e.target.value || null })}
                helperText="Digunakan pada jenjang persetujuan (approval flow) cuti & izin"
              >
                <option value="">-- Tidak ada atasan (Direksi/Pucuk) --</option>
                {allEmployees
                  .filter((e) => e.id !== editingEmployee?.id)
                  .map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} ({ROLE_LABELS[emp.role] || emp.role})
                    </option>
                  ))}
              </Select>

              <Select
                label="Kelompok Jadwal Kerja"
                value={formData.work_schedule_id || ''}
                onChange={(e) =>
                  setFormData({ ...formData, work_schedule_id: e.target.value || null })
                }
                helperText="Menentukan jam kerja, jam istirahat, dan toleransi keterlambatan"
              >
                <option value="">-- Pilih Jadwal Kerja --</option>
                {schedules.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.is_default ? '(Default)' : ''}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="ID Fingerprint / AC No Mesin"
                placeholder="Contoh: 1024"
                value={formData.fingerprint_ac_no || ''}
                onChange={(e) => setFormData({ ...formData, fingerprint_ac_no: e.target.value })}
                helperText="ID karyawan di mesin fingerprint untuk pencocokan file Excel import absensi"
              />

              <Input
                label="Tanggal Mulai Bekerja (Join Date)"
                type="date"
                value={formData.join_date || ''}
                onChange={(e) => setFormData({ ...formData, join_date: e.target.value })}
                required
              />
            </div>
          </div>
        )}

        {/* Tab 3: Emergency Contact */}
        {activeFormTab === 'emergency' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300">
              Kontak darurat digunakan jika terjadi situasi darurat pada karyawan saat bertugas.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Nama Kontak Darurat"
                placeholder="Nama Orang Tua / Pasangan / Kerabat"
                value={formData.emergency_contact_name || ''}
                onChange={(e) =>
                  setFormData({ ...formData, emergency_contact_name: e.target.value })
                }
              />
              <Input
                label="Nomor Telepon Kontak Darurat"
                placeholder="081298765432"
                value={formData.emergency_contact_phone || ''}
                onChange={(e) =>
                  setFormData({ ...formData, emergency_contact_phone: e.target.value })
                }
              />
            </div>
          </div>
        )}

        {/* Tab 4: Bank Information */}
        {activeFormTab === 'bank' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
              Informasi rekening digunakan oleh modul Payroll untuk proses penggajian dan transfer tunjangan.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Select
                label="Nama Bank"
                value={formData.bank_name || 'BCA'}
                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
              >
                <option value="BCA">Bank BCA</option>
                <option value="Mandiri">Bank Mandiri</option>
                <option value="BRI">Bank BRI</option>
                <option value="BNI">Bank BNI</option>
                <option value="BSI">Bank Syariah Indonesia (BSI)</option>
                <option value="CIMB">Bank CIMB Niaga</option>
                <option value="Permata">Bank Permata</option>
                <option value="Lainnya">Lainnya</option>
              </Select>

              <Input
                label="Nomor Rekening Bank"
                placeholder="Contoh: 1234567890"
                value={formData.bank_account_no || ''}
                onChange={(e) => setFormData({ ...formData, bank_account_no: e.target.value })}
              />

              <Input
                label="Nama Pemilik Rekening"
                placeholder="Sesuai buku tabungan"
                value={formData.bank_account_name || ''}
                onChange={(e) => setFormData({ ...formData, bank_account_name: e.target.value })}
              />
            </div>
          </div>
        )}

        {/* Footer Controls */}
        <div className="pt-4 flex items-center justify-between border-t border-slate-800">
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <span>Status akun baru:</span>
            <span className="font-mono text-amber-400 font-medium">pending_claim</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
            >
              Batal
            </Button>
            <Button type="submit" size="sm" isLoading={formSubmitting}>
              {editingEmployee ? 'Simpan Perubahan' : 'Simpan Karyawan'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
