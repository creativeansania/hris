'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit2, Trash2, Clock, Calendar, Check, AlertCircle, Coffee } from 'lucide-react';
import {
  getScheduleGroups,
  saveScheduleGroup,
  deleteScheduleGroup,
  ScheduleDayInput,
} from '@/app/actions/schedules';
import { WorkScheduleGroup, WorkScheduleDay } from '@/types/database';

const DAY_NAMES = [
  'Minggu',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
];

const DEFAULT_WEEK_DAYS: ScheduleDayInput[] = [
  { day_of_week: 0, start_time: '08:00', end_time: '17:00', break_start_time: '12:00', break_end_time: '13:00', is_day_off: true, late_tolerance_minutes: 0 },
  { day_of_week: 1, start_time: '08:00', end_time: '17:00', break_start_time: '12:00', break_end_time: '13:00', is_day_off: false, late_tolerance_minutes: 15 },
  { day_of_week: 2, start_time: '08:00', end_time: '17:00', break_start_time: '12:00', break_end_time: '13:00', is_day_off: false, late_tolerance_minutes: 15 },
  { day_of_week: 3, start_time: '08:00', end_time: '17:00', break_start_time: '12:00', break_end_time: '13:00', is_day_off: false, late_tolerance_minutes: 15 },
  { day_of_week: 4, start_time: '08:00', end_time: '17:00', break_start_time: '12:00', break_end_time: '13:00', is_day_off: false, late_tolerance_minutes: 15 },
  { day_of_week: 5, start_time: '08:00', end_time: '17:00', break_start_time: '11:30', break_end_time: '13:00', is_day_off: false, late_tolerance_minutes: 15 },
  { day_of_week: 6, start_time: '08:00', end_time: '13:00', break_start_time: null, break_end_time: null, is_day_off: true, late_tolerance_minutes: 0 },
];

export default function WorkSchedulesPage() {
  const [groups, setGroups] = useState<(WorkScheduleGroup & { days?: WorkScheduleDay[] })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [formDays, setFormDays] = useState<ScheduleDayInput[]>(DEFAULT_WEEK_DAYS);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    const res = await getScheduleGroups();
    if (res.error) {
      setError(res.error);
    } else {
      setGroups(res.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingGroupId(null);
    setFormName('');
    setFormDescription('');
    setFormIsDefault(groups.length === 0);
    setFormDays(DEFAULT_WEEK_DAYS);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (group: WorkScheduleGroup & { days?: WorkScheduleDay[] }) => {
    setEditingGroupId(group.id);
    setFormName(group.name);
    setFormDescription(group.description || '');
    setFormIsDefault(group.is_default);

    // Map existing days or fill default
    const existingDays = group.days || [];
    const populated = [0, 1, 2, 3, 4, 5, 6].map((dayIdx) => {
      const found = existingDays.find((d) => d.day_of_week === dayIdx);
      if (found) {
        return {
          day_of_week: found.day_of_week,
          start_time: found.start_time?.slice(0, 5) || '08:00',
          end_time: found.end_time?.slice(0, 5) || '17:00',
          break_start_time: found.break_start_time?.slice(0, 5) || '12:00',
          break_end_time: found.break_end_time?.slice(0, 5) || '13:00',
          is_day_off: found.is_day_off,
          late_tolerance_minutes: found.late_tolerance_minutes || 0,
        };
      }
      return DEFAULT_WEEK_DAYS[dayIdx];
    });

    setFormDays(populated);
    setFormError(null);
    setIsModalOpen(true);
  };

  const updateDayField = (
    dayIdx: number,
    field: keyof ScheduleDayInput,
    value: unknown
  ) => {
    setFormDays((prev) =>
      prev.map((d) => (d.day_of_week === dayIdx ? { ...d, [field]: value } : d))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Nama kelompok jadwal kerja wajib diisi');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const res = await saveScheduleGroup(
      editingGroupId,
      {
        name: formName,
        is_active: true,
      },
      formDays
    );

    if (!res.success) {
      setFormError(res.error);
    } else {
      setIsModalOpen(false);
      loadData();
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus kelompok jadwal "${name}"?`)) return;

    const res = await deleteScheduleGroup(id);
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
          title="Kelompok Jadwal Kerja & Jam Istirahat"
          subtitle="Atur jam masuk, jam pulang, toleransi keterlambatan, dan jam istirahat per hari kerja"
          action={
            <Button onClick={openCreateModal} size="sm" className="gap-1.5">
              <Plus className="w-4 h-4" />
              <span>Tambah Jadwal Baru</span>
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
            Memuat jadwal kerja...
          </div>
        ) : groups.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-slate-800 rounded-xl">
            <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-300 font-medium">Belum ada kelompok jadwal kerja</p>
            <p className="text-slate-500 mt-0.5">
              Klik Tambah Jadwal Baru untuk mengatur jam kerja kantor reguler atau shift.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => {
              const days = group.days || [];
              const sortedDays = [1, 2, 3, 4, 5, 6, 0].map((idx) =>
                days.find((d) => d.day_of_week === idx)
              );

              return (
                <div
                  key={group.id}
                  className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h4 className="text-base font-bold text-slate-100">{group.name}</h4>
                        {group.is_default && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                            DEFAULT KARYAWAN
                          </span>
                        )}
                      </div>
                      {group.description && (
                        <p className="text-xs text-slate-400 mt-0.5">{group.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(group)}
                        className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800/60 rounded-md transition"
                        title="Edit Jadwal"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(group.id, group.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition"
                        title="Hapus Jadwal"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* 7 Days Preview Table */}
                  <div className="overflow-x-auto">
                    <div className="grid grid-cols-7 gap-2 min-w-[600px] text-center text-xs">
                      {sortedDays.map((d, idx) => {
                        const dayNumber = [1, 2, 3, 4, 5, 6, 0][idx];
                        const dayName = DAY_NAMES[dayNumber];
                        const isOff = d ? d.is_day_off : dayNumber === 0;

                        return (
                          <div
                            key={dayNumber}
                            className={`p-2.5 rounded-lg border text-left space-y-1 ${
                              isOff
                                ? 'bg-slate-950/40 border-slate-900 opacity-60'
                                : 'bg-slate-950/80 border-slate-800/80'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[11px] font-bold">
                              <span className={isOff ? 'text-rose-400/80' : 'text-slate-300'}>
                                {dayName}
                              </span>
                              {isOff && (
                                <span className="text-[9px] text-rose-400 font-mono">LIBUR</span>
                              )}
                            </div>

                            {!isOff && d ? (
                              <div className="space-y-0.5 text-[11px] font-mono">
                                <div className="text-emerald-400">
                                  {d.start_time.slice(0, 5)} - {d.end_time.slice(0, 5)}
                                </div>
                                {d.break_start_time && (
                                  <div className="text-[10px] text-slate-500 flex items-center gap-1">
                                    <Coffee className="w-3 h-3" />
                                    <span>
                                      {d.break_start_time.slice(0, 5)}-{d.break_end_time?.slice(0, 5)}
                                    </span>
                                  </div>
                                )}
                                {d.late_tolerance_minutes > 0 && (
                                  <div className="text-[10px] text-amber-400/80">
                                    Tol: {d.late_tolerance_minutes}m
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-[10px] text-slate-600 font-mono">-</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Modal Add / Edit Schedule */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingGroupId ? 'Edit Kelompok Jadwal Kerja' : 'Tambah Kelompok Jadwal Baru'}
        description="Atur rincian waktu jam masuk, pulang, jam istirahat, dan toleransi keterlambatan untuk 7 hari seminggu"
        maxWidth="4xl"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Nama Kelompok Jadwal"
              placeholder="Contoh: Reguler Kantor (Senin - Jumat)"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              required
              autoFocus
            />
            <Input
              label="Deskripsi (Opsional)"
              placeholder="Jadwal standar 40 jam kerja per minggu"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_default_check"
              checked={formIsDefault}
              onChange={(e) => setFormIsDefault(e.target.checked)}
              className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="is_default_check" className="text-xs font-medium text-slate-300">
              Jadikan sebagai jadwal default untuk karyawan baru
            </label>
          </div>

          {/* 7 Days Matrix Configuration */}
          <div className="border border-slate-800 rounded-xl overflow-hidden">
            <div className="bg-slate-900/80 px-4 py-2.5 border-b border-slate-800 text-xs font-semibold text-slate-300">
              Pengaturan Jam Kerja 7 Hari
            </div>
            <div className="divide-y divide-slate-800/80">
              {[1, 2, 3, 4, 5, 6, 0].map((dayIdx) => {
                const day = formDays.find((d) => d.day_of_week === dayIdx)!;
                const dayName = DAY_NAMES[dayIdx];

                return (
                  <div
                    key={dayIdx}
                    className={`p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs ${
                      day.is_day_off ? 'bg-slate-950/40 opacity-70' : 'bg-slate-900/30'
                    }`}
                  >
                    <div className="w-32 flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`day_off_${dayIdx}`}
                        checked={day.is_day_off}
                        onChange={(e) => updateDayField(dayIdx, 'is_day_off', e.target.checked)}
                        className="rounded border-slate-700 bg-slate-900 text-rose-600 focus:ring-rose-500"
                      />
                      <label htmlFor={`day_off_${dayIdx}`} className="font-bold text-slate-200 cursor-pointer">
                        {dayName}
                        {day.is_day_off && (
                          <span className="text-[10px] text-rose-400 font-normal block">Libur (Day Off)</span>
                        )}
                      </label>
                    </div>

                    {!day.is_day_off ? (
                      <div className="flex-1 grid grid-cols-2 sm:grid-cols-5 gap-2 items-center">
                        <div>
                          <span className="text-[10px] text-slate-500 block mb-0.5">Jam Masuk</span>
                          <input
                            type="time"
                            value={day.start_time}
                            onChange={(e) => updateDayField(dayIdx, 'start_time', e.target.value)}
                            className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-slate-100 text-xs font-mono"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block mb-0.5">Jam Pulang</span>
                          <input
                            type="time"
                            value={day.end_time}
                            onChange={(e) => updateDayField(dayIdx, 'end_time', e.target.value)}
                            className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-slate-100 text-xs font-mono"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block mb-0.5">Mulai Istirahat</span>
                          <input
                            type="time"
                            value={day.break_start_time || ''}
                            onChange={(e) => updateDayField(dayIdx, 'break_start_time', e.target.value || null)}
                            className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-slate-100 text-xs font-mono"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block mb-0.5">Selesai Istirahat</span>
                          <input
                            type="time"
                            value={day.break_end_time || ''}
                            onChange={(e) => updateDayField(dayIdx, 'break_end_time', e.target.value || null)}
                            className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-slate-100 text-xs font-mono"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block mb-0.5">Toleransi (m)</span>
                          <input
                            type="number"
                            min="0"
                            max="120"
                            value={day.late_tolerance_minutes}
                            onChange={(e) => updateDayField(dayIdx, 'late_tolerance_minutes', parseInt(e.target.value, 10) || 0)}
                            className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-slate-100 text-xs font-mono"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 text-slate-500 italic text-[11px]">
                        Hari tidak masuk kerja (otomatis tidak dihitung alpa)
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

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
              {editingGroupId ? 'Simpan Perubahan' : 'Buat Jadwal'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
