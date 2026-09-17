'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit2, Trash2, Calendar, AlertCircle } from 'lucide-react';
import { getHolidays, createHoliday, updateHoliday, deleteHoliday } from '@/app/actions/holidays';
import { Holiday, HolidayType } from '@/types/database';

export default function HolidaysPage() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formType, setFormType] = useState<HolidayType>('national');
  const [formDescription, setFormDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadData = async (yearToLoad: number) => {
    setIsLoading(true);
    setError(null);
    const res = await getHolidays(yearToLoad);
    if (res.error) {
      setError(res.error);
    } else {
      setHolidays(res.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData(selectedYear);
  }, [selectedYear]);

  const openCreateModal = () => {
    setEditingId(null);
    setFormName('');
    setFormDate(`${selectedYear}-01-01`);
    setFormType('national');
    setFormDescription('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (h: Holiday) => {
    setEditingId(h.id);
    setFormName(h.name);
    setFormDate(h.holiday_date);
    setFormType(h.type);
    setFormDescription(h.description || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formDate) {
      setFormError('Nama libur dan tanggal wajib diisi');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    if (editingId) {
      const res = await updateHoliday(editingId, {
        name: formName,
        holiday_date: formDate,
        type: formType,
        description: formDescription,
      });

      if (!res.success) {
        setFormError(res.error);
      } else {
        setIsModalOpen(false);
        loadData(selectedYear);
      }
    } else {
      const res = await createHoliday({
        name: formName,
        holiday_date: formDate,
        type: formType,
        description: formDescription,
      });

      if (!res.success) {
        setFormError(res.error);
      } else {
        setIsModalOpen(false);
        loadData(selectedYear);
      }
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus hari libur "${name}"?`)) return;

    const res = await deleteHoliday(id);
    if (!res.success) {
      alert(res.error);
    } else {
      loadData(selectedYear);
    }
  };

  const formatIndonesianDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-base font-semibold text-slate-100">Kalender Hari Libur</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Hari libur nasional dan cuti bersama resmi yang dikecualikan dari hari kerja absensi
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                <option key={y} value={y}>
                  Tahun {y}
                </option>
              ))}
            </select>

            <Button onClick={openCreateModal} size="sm" className="gap-1.5">
              <Plus className="w-4 h-4" />
              <span>Tambah Hari Libur</span>
            </Button>
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
            Memuat kalender libur {selectedYear}...
          </div>
        ) : holidays.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-slate-800 rounded-xl">
            <Calendar className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-300 font-medium">Belum ada hari libur di tahun {selectedYear}</p>
            <p className="text-slate-500 mt-0.5">
              Klik tombol Tambah Hari Libur untuk menginput hari libur tahun {selectedYear}.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/60 text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider font-mono">
                <tr>
                  <th className="py-3 px-4 font-semibold">Tanggal</th>
                  <th className="py-3 px-4 font-semibold">Nama Libur</th>
                  <th className="py-3 px-4 font-semibold">Kategori</th>
                  <th className="py-3 px-4 font-semibold">Keterangan</th>
                  <th className="py-3 px-4 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {holidays.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-200 whitespace-nowrap">
                      {formatIndonesianDate(h.holiday_date)}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-100">{h.name}</td>
                    <td className="py-3.5 px-4">
                      {h.type === 'cuti_bersama' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Cuti Bersama
                        </span>
                      ) : h.type === 'company' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          Libur Perusahaan
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          Libur Nasional
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 max-w-xs truncate">
                      {h.description || '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(h)}
                          className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800/60 rounded-md transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(h.id, h.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal Add / Edit Holiday */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Hari Libur' : 'Tambah Hari Libur Baru'}
        description="Hari libur resmi otomatis tidak dihitung sebagai absensi terlambat atau alpa"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
              {formError}
            </div>
          )}

          <Input
            label="Nama Hari Libur"
            placeholder="Contoh: Hari Raya Idul Fitri 1447 H"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            required
            autoFocus
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Tanggal"
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              required
            />

            <Select
              label="Kategori Libur"
              value={formType}
              onChange={(e) => setFormType(e.target.value as HolidayType)}
            >
              <option value="national">Libur Nasional</option>
              <option value="cuti_bersama">Cuti Bersama</option>
              <option value="company">Libur Perusahaan</option>
            </Select>
          </div>

          <Input
            label="Keterangan Tambahan (Opsional)"
            placeholder="Keputusan Bersama 3 Menteri (SKB)"
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
              {editingId ? 'Simpan Perubahan' : 'Tambah Libur'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
