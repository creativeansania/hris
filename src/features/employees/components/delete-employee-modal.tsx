'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { RoleBadge, StatusBadge } from '@/components/ui/badge';
import { Employee } from '@/types/database';
import { deleteEmployee, resetEmployeeClaim } from '@/app/actions/employees';
import { AlertTriangle, Trash2, RefreshCw, ShieldAlert, Loader2 } from 'lucide-react';

interface DeleteEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  employee: Employee | null;
  currentEmployeeId?: string | null;
}

export function DeleteEmployeeModal({
  isOpen,
  onClose,
  onSuccess,
  employee,
  currentEmployeeId,
}: DeleteEmployeeModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!employee) return null;

  const isSelf = Boolean(currentEmployeeId && employee.id === currentEmployeeId);
  const hasClaimedAuth = Boolean(employee.auth_user_id || employee.status === 'active');

  const handleDelete = async () => {
    if (isSelf) {
      setError('Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif digunakan.');
      return;
    }

    if (!confirm(`Apakah Anda yakin ingin MENGHAPUS PERMANEN seluruh data ${employee.full_name}? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }

    setIsDeleting(true);
    setError(null);
    try {
      const res = await deleteEmployee(employee.id);
      if (!res.success) {
        setError(res.error || 'Gagal menghapus karyawan.');
      } else {
        onSuccess();
        onClose();
      }
    } catch {
      setError('Terjadi kesalahan jaringan saat menghapus akun.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleResetClaim = async () => {
    if (!confirm(`Apakah Anda yakin ingin MERESET KLAIM akun ${employee.full_name}? Akun Google SSO yang terhubung akan dilepas dan status kembali ke "Menunggu Klaim".`)) {
      return;
    }

    setIsResetting(true);
    setError(null);
    try {
      const res = await resetEmployeeClaim(employee.id);
      if (!res.success) {
        setError(res.error || 'Gagal mereset klaim akun.');
      } else {
        onSuccess();
        onClose();
      }
    } catch {
      setError('Terjadi kesalahan jaringan saat mereset klaim akun.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manajemen Penghapusan & Reset Akun"
      description="Tindakan administratif terhadap akun karyawan dan kredensial login."
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Warning Banner */}
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 text-rose-300 text-xs">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-rose-200">Perhatian: Hak Akses Administrator</p>
            <p className="text-slate-300 leading-relaxed">
              Penghapusan data bersifat permanen dan akan membersihkan kontrak, riwayat presensi, pengajuan, serta akun autentikasi login yang terhubung.
            </p>
          </div>
        </div>

        {/* Employee Summary Card */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h4 className="font-semibold text-slate-100 text-sm">{employee.full_name}</h4>
              <p className="text-xs text-slate-400 font-mono">{employee.email}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <RoleBadge role={employee.role} />
              <StatusBadge status={employee.status} />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Divisi: <strong className="text-slate-200">{employee.division?.name || 'Umum'}</strong></span>
            <span>
              Login SSO:{' '}
              <strong className={employee.auth_user_id ? 'text-emerald-400' : 'text-amber-400'}>
                {employee.auth_user_id ? 'Terhubung (Google)' : 'Belum Diklaim'}
              </strong>
            </span>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isSelf && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
            ⚠️ Ini adalah akun yang saat ini sedang Anda gunakan untuk login. Anda tidak dapat menghapus akun Anda sendiri.
          </div>
        )}

        {/* Action Options */}
        <div className="space-y-2.5 pt-2">
          {/* Option 1: Reset Claim (if account has claimed SSO) */}
          {hasClaimedAuth && (
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800 hover:border-slate-700 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-slate-200 block">
                  Reset Klaim Akun Saja
                </span>
                <span className="text-[11px] text-slate-400 block leading-tight">
                  Putus tautan Google SSO agar karyawan bisa mengklaim ulang dengan akun Google baru. Data profil tetap aman.
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isDeleting || isResetting}
                onClick={handleResetClaim}
                className="shrink-0 border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300 text-xs"
              >
                {isResetting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5 mr-1" />
                )}
                Reset Klaim
              </Button>
            </div>
          )}

          {/* Option 2: Hard Delete */}
          <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-rose-300 block">
                Hapus Akun Karyawan Permanen
              </span>
              <span className="text-[11px] text-slate-400 block leading-tight">
                Hapus seluruh profil, riwayat kehadiran, kontrak, dan akun Google login secara permanen dari sistem.
              </span>
            </div>
            <Button
              type="button"
              variant="danger"
              size="sm"
              disabled={isDeleting || isResetting || isSelf}
              onClick={handleDelete}
              className="shrink-0 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-lg shadow-rose-600/20"
            >
              {isDeleting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
              ) : (
                <Trash2 className="w-3.5 h-3.5 mr-1" />
              )}
              Hapus Permanen
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isDeleting || isResetting}
          >
            Batal
          </Button>
        </div>
      </div>
    </Modal>
  );
}
