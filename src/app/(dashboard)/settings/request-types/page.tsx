'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import {
  SlidersHorizontal,
  Edit2,
  FileCheck,
  CalendarCheck,
  AlertCircle,
  FileText,
  Clock,
} from 'lucide-react';
import {
  getRequestTypes,
  updateRequestType,
  toggleRequestTypeStatus,
} from '@/app/actions/request-types';
import { RequestType, RequestCategory, GenderType, MaritalStatusType } from '@/types/database';

export default function RequestTypesPage() {
  const [types, setTypes] = useState<RequestType[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<'all' | RequestCategory>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal edit state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<RequestType | null>(null);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<RequestCategory>('cuti');
  const [formDefaultDays, setFormDefaultDays] = useState<string>('');
  const [formIsHalfDay, setFormIsHalfDay] = useState(false);
  const [formRequiresAttachment, setFormRequiresAttachment] = useState(false);
  const [formMandatoryAfterDays, setFormMandatoryAfterDays] = useState<string>('');
  const [formDeductsAnnualLeave, setFormDeductsAnnualLeave] = useState(false);
  const [formGender, setFormGender] = useState<string>('');
  const [formMarital, setFormMarital] = useState<string>('');
  const [formMinServiceDays, setFormMinServiceDays] = useState<string>('0');
  const [formDescription, setFormDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    const res = await getRequestTypes();
    if (res.error) {
      setError(res.error);
    } else {
      setTypes(res.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredTypes = types.filter((t) => {
    if (categoryFilter === 'all') return true;
    return t.category === categoryFilter;
  });

  const openEditModal = (t: RequestType) => {
    setEditingType(t);
    setFormName(t.name);
    setFormCategory(t.category);
    setFormDefaultDays(t.default_days?.toString() || t.default_duration_days?.toString() || '');
    setFormIsHalfDay(t.is_half_day ?? false);
    setFormRequiresAttachment(t.requires_attachment);
    setFormMandatoryAfterDays(t.attachment_mandatory_after_days?.toString() || '');
    setFormDeductsAnnualLeave(t.deducts_annual_leave ?? t.deducts_leave_quota ?? false);
    setFormGender(t.gender_restriction || '');
    setFormMarital(t.marital_status_restriction || '');
    setFormMinServiceDays((t.min_service_days || 0).toString());
    setFormDescription(t.description || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    const res = await toggleRequestTypeStatus(id, !currentStatus);
    if (!res.success) {
      alert(res.error);
    } else {
      loadData();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingType) return;
    if (!formName.trim()) {
      setFormError('Nama jenis pengajuan wajib diisi');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const res = await updateRequestType(editingType.id, {
      name: formName,
      category: formCategory,
      default_days: formDefaultDays ? parseInt(formDefaultDays, 10) : null,
      is_half_day: formIsHalfDay,
      requires_attachment: formRequiresAttachment,
      attachment_mandatory_after_days: formMandatoryAfterDays
        ? parseInt(formMandatoryAfterDays, 10)
        : null,
      deducts_annual_leave: formDeductsAnnualLeave,
      gender_restriction: (formGender as GenderType) || null,
      marital_status_restriction: (formMarital as MaritalStatusType) || null,
      min_service_days: parseInt(formMinServiceDays, 10) || 0,
      description: formDescription,
    });

    if (!res.success) {
      setFormError(res.error);
    } else {
      setIsModalOpen(false);
      loadData();
    }
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-base font-semibold text-slate-100">
              Jenis Pengajuan Cuti & Izin Dinamis
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Kelola batas hari maksimal, syarat berkas lampiran, dan pemotongan kuota cuti tahunan
            </p>
          </div>

          <div className="flex items-center gap-2">
            {(['all', 'cuti', 'izin', 'lembur'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition ${
                  categoryFilter === cat
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat === 'all' ? 'Semua' : cat}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-400">
            <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
            Memuat daftar jenis pengajuan...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/60 text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider font-mono">
                <tr>
                  <th className="py-3 px-4 font-semibold">Jenis Pengajuan</th>
                  <th className="py-3 px-4 font-semibold">Kategori</th>
                  <th className="py-3 px-4 font-semibold">Batas Hari</th>
                  <th className="py-3 px-4 font-semibold">Aturan Tambahan</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredTypes.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3.5 px-4 font-medium text-slate-100">
                      <div>
                        <span>{t.name}</span>
                        <span className="block font-mono text-[10px] text-slate-500">
                          {t.code}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 uppercase font-mono text-[11px]">
                      <span
                        className={`inline-block px-2 py-0.5 rounded font-semibold ${
                          t.category === 'cuti'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : t.category === 'izin'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                        }`}
                      >
                        {t.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      {t.default_days !== null ? `${t.default_days} hari` : 'Sesuai Pengajuan'}
                    </td>
                    <td className="py-3.5 px-4 space-y-1 text-[11px]">
                      {t.deducts_annual_leave && (
                        <div className="text-amber-400/90 flex items-center gap-1 font-medium">
                          <CalendarCheck className="w-3.5 h-3.5" />
                          <span>Memotong kuota cuti tahunan</span>
                        </div>
                      )}
                      {t.requires_attachment && (
                        <div className="text-cyan-400/90 flex items-center gap-1 font-medium">
                          <FileCheck className="w-3.5 h-3.5" />
                          <span>
                            Wajib berkas pendukung
                            {t.attachment_mandatory_after_days
                              ? ` (> ${t.attachment_mandatory_after_days} hari)`
                              : ''}
                          </span>
                        </div>
                      )}
                      {t.is_half_day && (
                        <div className="text-slate-400 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Bisa setengah hari</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleStatus(t.id, t.is_active)}
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition ${
                          t.is_active
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                            : 'bg-slate-800 text-slate-500 border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        {t.is_active ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => openEditModal(t)}
                        className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800/60 rounded-md transition"
                        title="Edit Aturan"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal Edit Request Type */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Konfigurasi: ${editingType?.name || ''}`}
        description="Atur parameter perhitungan kuota, prasyarat lampiran, dan pembatasan gender/status"
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Nama Jenis Pengajuan"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              required
            />

            <Select
              label="Kategori"
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value as RequestCategory)}
            >
              <option value="cuti">Cuti</option>
              <option value="izin">Izin</option>
              <option value="lembur">Lembur</option>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Batas Maksimal Hari (Kosongkan jika fleksibel)"
              type="number"
              min="1"
              placeholder="Contoh: 3"
              value={formDefaultDays}
              onChange={(e) => setFormDefaultDays(e.target.value)}
            />

            <Input
              label="Masa Kerja Minimal (Hari)"
              type="number"
              min="0"
              placeholder="0"
              value={formMinServiceDays}
              onChange={(e) => setFormMinServiceDays(e.target.value)}
            />
          </div>

          {/* Checkbox Options */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="deducts_leave"
                checked={formDeductsAnnualLeave}
                onChange={(e) => setFormDeductsAnnualLeave(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="deducts_leave" className="text-xs font-medium text-slate-200">
                Memotong Kuota Cuti Tahunan (12 Hari)
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="requires_attach"
                checked={formRequiresAttachment}
                onChange={(e) => setFormRequiresAttachment(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="requires_attach" className="text-xs font-medium text-slate-200">
                Wajib Mengunggah Berkas / Dokumen Pendukung (Surat Dokter, Undangan, dll)
              </label>
            </div>

            {formRequiresAttachment && (
              <div className="pl-6 pt-1">
                <Input
                  label="Wajib Lampiran Jika Durasi Lebih Dari (Hari)"
                  type="number"
                  min="0"
                  placeholder="Contoh: 1 (jika > 1 hari baru wajib surat dokter)"
                  value={formMandatoryAfterDays}
                  onChange={(e) => setFormMandatoryAfterDays(e.target.value)}
                  helperText="Kosongkan jika selalu wajib sejak hari pertama pengajuan"
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_half_day_check"
                checked={formIsHalfDay}
                onChange={(e) => setFormIsHalfDay(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="is_half_day_check" className="text-xs font-medium text-slate-200">
                Mengizinkan Pengajuan Setengah Hari (Pagi / Siang)
              </label>
            </div>
          </div>

          <Input
            label="Deskripsi / Ketentuan Kebijakan (Opsional)"
            placeholder="Ketentuan UU Ketenagakerjaan No. 13 Tahun 2003..."
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
          />

          <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit" size="sm" isLoading={isSubmitting}>
              Simpan Konfigurasi
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
