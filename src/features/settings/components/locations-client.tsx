'use client';

import React, { useState } from 'react';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Plus, Edit2, Trash2, MapPin, AlertCircle, Navigation } from 'lucide-react';
import {
  getOfficeLocations,
  createOfficeLocation,
  updateOfficeLocation,
  deleteOfficeLocation,
} from '@/app/actions/locations';
import { OfficeLocation } from '@/types/database';

interface LocationsClientProps {
  initialLocations: OfficeLocation[];
  initialError?: string | null;
}

export function LocationsClient({
  initialLocations,
  initialError = null,
}: LocationsClientProps) {
  const [locations, setLocations] = useState<OfficeLocation[]>(initialLocations);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formLat, setFormLat] = useState('-6.2088');
  const [formLng, setFormLng] = useState('106.8456');
  const [formRadius, setFormRadius] = useState('100');
  const [formIsActive, setFormIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const reloadData = async () => {
    setIsLoading(true);
    setError(null);
    const res = await getOfficeLocations();
    if (res.error) {
      setError(res.error);
    } else {
      setLocations(res.data);
    }
    setIsLoading(false);
  };

  const openCreateModal = () => {
    setEditingId(null);
    setFormName('');
    setFormAddress('');
    setFormLat('-6.2088');
    setFormLng('106.8456');
    setFormRadius('100');
    setFormIsActive(true);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (loc: OfficeLocation) => {
    setEditingId(loc.id);
    setFormName(loc.name);
    setFormAddress(loc.address || '');
    setFormLat(loc.latitude.toString());
    setFormLng(loc.longitude.toString());
    setFormRadius(loc.radius_meters.toString());
    setFormIsActive(loc.is_active);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setFormError('Peramban tidak mendukung deteksi geolokasi.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormLat(pos.coords.latitude.toFixed(6));
        setFormLng(pos.coords.longitude.toFixed(6));
        setFormError(null);
      },
      (err) => {
        setFormError(`Gagal mengambil koordinat saat ini: ${err.message}`);
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Nama lokasi kantor wajib diisi');
      return;
    }

    const lat = parseFloat(formLat);
    const lng = parseFloat(formLng);
    const radius = parseInt(formRadius, 10);

    if (isNaN(lat) || isNaN(lng)) {
      setFormError('Latitude dan Longitude harus berupa angka koordinat valid');
      return;
    }

    if (isNaN(radius) || radius <= 0) {
      setFormError('Radius geofencing harus lebih besar dari 0 meter');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    if (editingId) {
      const res = await updateOfficeLocation(editingId, {
        name: formName,
        address: formAddress,
        latitude: lat,
        longitude: lng,
        radius_meters: radius,
        is_active: formIsActive,
      });

      if (!res.success) {
        setFormError(res.error);
      } else {
        setIsModalOpen(false);
        reloadData();
      }
    } else {
      const res = await createOfficeLocation({
        name: formName,
        address: formAddress,
        latitude: lat,
        longitude: lng,
        radius_meters: radius,
      });

      if (!res.success) {
        setFormError(res.error);
      } else {
        setIsModalOpen(false);
        reloadData();
      }
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus lokasi kantor "${name}"?`)) return;

    const res = await deleteOfficeLocation(id);
    if (!res.success) {
      setError(res.error || 'Gagal menghapus lokasi kantor');
    } else {
      reloadData();
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Daftar Lokasi Kantor & Geofencing GPS"
          subtitle="Titik koordinat dan radius validasi presensi karyawan saat check-in mobile"
          action={
            <Button onClick={openCreateModal} size="sm" className="gap-1.5 cursor-pointer">
              <Plus className="w-4 h-4" />
              <span>Tambah Lokasi</span>
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
            Memuat lokasi kantor...
          </div>
        ) : locations.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-slate-800 rounded-xl">
            <MapPin className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-300 font-medium">Belum ada lokasi kantor terdaftar</p>
            <p className="text-slate-500 mt-0.5">
              Tambahkan lokasi kantor utama agar validasi geofencing GPS absensi dapat berjalan.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {locations.map((loc) => (
              <div
                key={loc.id}
                className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-100">{loc.name}</h4>
                      <p className="text-xs text-slate-400 mt-0.5 max-w-xs truncate">
                        {loc.address || 'Tidak ada alamat rinci'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(loc)}
                      className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800/60 rounded-md transition cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(loc.id, loc.name)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/60 font-mono text-[11px]">
                  <div className="p-2 rounded bg-slate-950/60 border border-slate-800/80">
                    <span className="text-slate-500 block text-[10px]">KOORDINAT</span>
                    <span className="text-slate-300">
                      {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-slate-950/60 border border-slate-800/80">
                    <span className="text-slate-500 block text-[10px]">RADIUS GEOFENCE</span>
                    <span className="text-emerald-400 font-semibold">{loc.radius_meters} meter</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Modal Add / Edit Location */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Lokasi Kantor' : 'Tambah Lokasi Kantor Baru'}
        description="Koordinat GPS digunakan oleh sistem untuk menghitung toleransi radius kehadiran mobile karyawan"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
              {formError}
            </div>
          )}

          <Input
            label="Nama Lokasi Kantor"
            placeholder="Contoh: Kantor Pusat Menara Sudirman"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            required
            autoFocus
          />

          <Input
            label="Alamat Lengkap (Opsional)"
            placeholder="Jl. Jend. Sudirman Kav. 50, Jakarta Selatan"
            value={formAddress}
            onChange={(e) => setFormAddress(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Latitude"
              placeholder="-6.2088"
              value={formLat}
              onChange={(e) => setFormLat(e.target.value)}
              required
            />
            <Input
              label="Longitude"
              placeholder="106.8456"
              value={formLng}
              onChange={(e) => setFormLng(e.target.value)}
              required
            />
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleGetCurrentLocation}
              className="text-xs text-blue-400 hover:text-blue-300 inline-flex items-center gap-1 font-medium cursor-pointer"
            >
              <Navigation className="w-3.5 h-3.5" />
              Gunakan Lokasi GPS Saya Saat Ini
            </button>
          </div>

          <Input
            label="Radius Toleransi Kehadiran (Meter)"
            type="number"
            min="10"
            max="2000"
            placeholder="100"
            value={formRadius}
            onChange={(e) => setFormRadius(e.target.value)}
            helperText="Jarak maksimal karyawan dari titik tengah kantor agar presensi dinyatakan sah (dalam radius)"
            required
          />

          {editingId && (
            <div className="pt-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="loc_is_active"
                checked={formIsActive}
                onChange={(e) => setFormIsActive(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="loc_is_active" className="text-xs font-medium text-slate-300">
                Lokasi Aktif
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
              {editingId ? 'Simpan Perubahan' : 'Tambah Lokasi'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
