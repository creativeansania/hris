import React from 'react';
import { Sparkles, ShieldAlert } from 'lucide-react';
import { LeaveBalance } from '@/types/database';

interface LeaveBalanceInfoProps {
  leaveBalance: LeaveBalance | null;
}

export function LeaveBalanceInfo({ leaveBalance }: LeaveBalanceInfoProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Balance Breakdown Card */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-5 lg:col-span-1">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-400" />
          Ringkasan Kuota {new Date().getFullYear()}
        </h3>

        <div className="space-y-3 font-mono text-sm divide-y divide-slate-800/80">
          <div className="flex justify-between items-center pt-2">
            <span className="text-slate-400 text-xs font-sans">Hak Kuota Tahunan:</span>
            <span className="font-bold text-white">{leaveBalance?.quota ?? 12} hari</span>
          </div>
          <div className="flex justify-between items-center pt-2">
            <span className="text-slate-400 text-xs font-sans">Carry Over Tahun Lalu:</span>
            <span className="font-bold text-slate-300">{leaveBalance?.carry_over ?? 0} hari</span>
          </div>
          <div className="flex justify-between items-center pt-2">
            <span className="text-slate-400 text-xs font-sans">Penyesuaian Manual HR:</span>
            <span
              className={`font-bold ${
                Number(leaveBalance?.adjustment) > 0
                  ? 'text-emerald-400'
                  : Number(leaveBalance?.adjustment) < 0
                  ? 'text-rose-400'
                  : 'text-slate-400'
              }`}
            >
              {Number(leaveBalance?.adjustment) > 0 ? '+' : ''}
              {leaveBalance?.adjustment ?? 0} hari
            </span>
          </div>
          <div className="flex justify-between items-center pt-2">
            <span className="text-slate-400 text-xs font-sans">Cuti yang Telah Terpakai:</span>
            <span className="font-bold text-rose-400">{leaveBalance?.used ?? 0} hari</span>
          </div>
          <div className="flex justify-between items-center pt-3 border-t border-blue-500/30">
            <span className="text-white text-xs font-sans font-bold">
              Sisa Saldo Kuota Cuti:
            </span>
            <span className="text-xl font-extrabold text-blue-400">
              {leaveBalance?.remaining ?? 12} hari
            </span>
          </div>
        </div>

        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-300">
          Setiap cuti tahunan yang disetujui otomatis mengurangi saldo di atas secara realtime.
        </div>
      </div>

      {/* Guidelines & Legal Rules */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-4 lg:col-span-2">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-amber-400" />
          Ketentuan Cuti & Izin Berdasarkan UU No. 13/2003
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
            <h4 className="font-bold text-white">Cuti Menikah (3 Hari)</h4>
            <p className="text-slate-400">
              Hak bagi karyawan yang melangsungkan pernikahan resmi. Tidak memotong cuti tahunan. Wajib upload undangan/surat nikah.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
            <h4 className="font-bold text-white">Cuti Melahirkan / Istri (2 Hari)</h4>
            <p className="text-slate-400">
              Hak suami saat istri melahirkan atau keguguran kandungan. Tidak memotong cuti tahunan. Wajib surat keterangan RS/Bidan.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
            <h4 className="font-bold text-white">Cuti Duka Cita (2 Hari)</h4>
            <p className="text-slate-400">
              Orang tua, mertua, anak, atau anggota keluarga serumah meninggal dunia. Tidak memotong saldo cuti tahunan.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
            <h4 className="font-bold text-white">Izin Sakit</h4>
            <p className="text-slate-400">
              Izin tidak bekerja karena sakit. Wajib melampirkan Surat Keterangan Dokter jika lebih dari 1 hari kerja.
            </p>
          </div>
        </div>

        <div className="p-4 bg-slate-900/80 border border-slate-800/80 rounded-xl text-xs text-slate-300 space-y-2">
          <span className="font-semibold text-white block">Catatan Approval Paralel:</span>
          <ul className="list-disc list-inside space-y-1 text-slate-400">
            <li>
              Pengajuan karyawan diproses bersamaan oleh <strong>Atasan Langsung</strong> dan{' '}
              <strong>HR</strong>.
            </li>
            <li>Kedua approver harus memberikan persetujuan agar permohonan resmi disetujui.</li>
            <li>
              Jika salah satu menolak, pengajuan otomatis berstatus ditolak dengan catatan alasan.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
