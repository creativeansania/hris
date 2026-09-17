'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit2, Trash2, Building2, User, Check, AlertCircle } from 'lucide-react';
import { getDivisions, createDivision, updateDivision, deleteDivision } from '@/app/actions/divisions';
import { getEmployees } from '@/app/actions/employees';
import { Division, Employee } from '@/types/database';

export default function DivisionsPage() {
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formKepalaDivisiId, setFormKepalaDivisiId] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    const [divRes, empRes] = await Promise.all([
      getDivisions(),
      getEmployees(),
    ]);

    if (divRes.error) {
      setError(divRes.error);
    } else {
      setDivisions(divRes.data);
    }

    if (empRes.data) {
      setEmployees(empRes.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setFormName('');
    setFormKepalaDivisiId('');
    setFormIsActive(true);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (div: Division) => {
    setEditingId(div.id);
    setFormName(div.name);
    setFormKepalaDivisiId(div.kepala_divisi_id || '');
    setFormIsActive(div.is_active);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Nama divisi wajib diisi');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    if (editingId) {
      const res = await updateDivision(editingId, {
        name: formName,
        kepala_divisi_id: formKepalaDivisiId || null,
        is_active: formIsActive,
      });

      if (!res.success) {
        setFormError(res.error);
      } else {
        setIsModalOpen(false);
        loadData();
      }
    } else {
      const res = await createDivision({
        name: formName,
        kepala_divisi_id: formKepalaDivisiId || null,
      });

      if (!res.success) {
        setFormError(res.error);
      } else {
        setIsModalOpen(false);
        loadData();
      }
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus divisi "${name}"?`)) return;

    const res = await deleteDivision(id);
    if (!res.success) {
      alert(res.error);
    } else {
      loadData();
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Daftar Divisi Organisasi"
          subtitle="Departemen / unit kerja perusahaan dan penanggung jawab divisi"
          action={
            <Button onClick={openCreateModal} size="sm" className="gap-1.5">
              <Plus className="w-4 h-4" />
              <span>Tambah Divisi</span>
            </Button>
          }
        />

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-400">
            <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
            Memuat daftar divisi...
          </div>
        ) : divisions.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-slate-800 rounded-xl">
            <Building2 className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-300 font-medium">Belum ada divisi yang dibuat</p>
            <p className="text-slate-500 mt-0.5">Klik tombol Tambah Divisi untuk mulai membuat struktur organisasi.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/60 text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider font-mono">
                <tr>
                  <th className="py-3 px-4 font-semibold">Nama Divisi</th>
                  <th className="py-3 px-4 font-semibold">Kepala Divisi</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {divisions.map((div) => {
                  const kepala = div.kepala_divisi || employees.find((e) => e.id === div.kepala_divisi_id);

                  return (
                    <tr key={div.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-4 font-semibold text-slate-100 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-blue-400 shrink-0" />
                        <span>{div.name}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        {kepala ? (
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-500" />
                            <span>{kepala.full_name}</span>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">Belum ditentukan</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {div.is_active ? (
                          <Badge variant="success" dot>
                            Aktif
                          </Badge>
                        ) : (
                          <Badge variant="neutral" dot>
                            Nonaktif
                          </Badge>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => openEditModal(div)}
                            className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800/60 rounded-md transition"
                            title="Edit Divisi"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(div.id, div.name)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition"
                            title="Hapus Divisi"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal Create / Edit */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Divisi Organisasi' : 'Tambah Divisi Baru'}
        description="Departemen unit kerja yang memetakan karyawan dan alur persetujuan"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
              {formError}
            </div>
          )}

          <Input
            label="Nama Divisi"
            placeholder="Contoh: Divisi Keuangan & Akuntansi"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            required
            autoFocus
          />

          <Select
            label="Kepala Divisi (Opsional)"
            value={formKepalaDivisiId}
            onChange={(e) => setFormKepalaDivisiId(e.target.value)}
          >
            <option value="">-- Pilih dari Karyawan --</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.full_name} ({emp.email})
              </option>
            ))}
          </Select>

          {editingId && (
            <div className="pt-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active_check"
                checked={formIsActive}
                onChange={(e) => setFormIsActive(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="is_active_check" className="text-xs font-medium text-slate-300">
                Divisi Aktif
              </label>
            </div>
          )}

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
              {editingId ? 'Simpan Perubahan' : 'Tambah Divisi'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
