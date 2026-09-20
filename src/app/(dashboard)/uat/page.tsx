'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  ShieldCheck,
  Activity,
  Download,
  RotateCcw,
  Users,
  UserCheck,
  Briefcase,
  Layers,
  Database,
  RefreshCw,
  Building2,
  Sparkles,
} from 'lucide-react';

interface Scenario {
  id: string;
  role: 'staff' | 'spv' | 'kepala_divisi' | 'hr' | 'management' | 'admin';
  title: string;
  steps: string;
  expected: string;
  targetUrl: string;
  actionLabel: string;
}

const UAT_SCENARIOS: Scenario[] = [
  // Staff Scenarios
  {
    id: 'STF-01',
    role: 'staff',
    title: 'Clock In GPS & Deteksi Geofence',
    steps: 'Buka halaman /clock-in. Izinkan GPS browser, pastikan koordinat terdeteksi dalam radius kantor.',
    expected: 'Status "Dalam Radius Kantor" hijau, tombol Clock In aktif dan submit berhasil menjadi auto_valid.',
    targetUrl: '/clock-in',
    actionLabel: 'Tes Clock In GPS',
  },
  {
    id: 'STF-02',
    role: 'staff',
    title: 'Catat Alasan Telat Aktual',
    steps: 'Buka /my-attendance. Temukan catatan presensi yang berstatus telat lalu klik "Isi Alasan".',
    expected: 'Modal input alasan muncul, alasan tersimpan tanpa memerlukan approval berbelit.',
    targetUrl: '/my-attendance',
    actionLabel: 'Buka Presensi Saya',
  },
  {
    id: 'STF-03',
    role: 'staff',
    title: 'Pengajuan Cuti Tahunan & Kuota 12 Hari',
    steps: 'Buka /requests, klik "Buat Pengajuan", pilih jenis "Cuti Tahunan", isi tanggal dan alasan.',
    expected: 'Sistem menampilkan sisa kuota cuti 12 hari dan pengajuan masuk ke status pending_spv.',
    targetUrl: '/requests',
    actionLabel: 'Buka Pengajuan Cuti',
  },
  {
    id: 'STF-04',
    role: 'staff',
    title: 'PWA Offline Attendance Queue',
    steps: 'Matikan koneksi WiFi/Data (DevTools Offline), lakukan Clock In di /clock-in.',
    expected: 'Banner offline muncul, presensi tersimpan di IndexedDB outbox dan sync saat koneksi pulih.',
    targetUrl: '/clock-in',
    actionLabel: 'Tes Mode Offline PWA',
  },
  {
    id: 'STF-05',
    role: 'staff',
    title: 'Lihat & Download Slip Gaji',
    steps: 'Buka /payroll pada tab "Slip Gaji Saya".',
    expected: 'Komponen gaji pokok, tunjangan, potongan absensi, dan PPh21 terinci rapi.',
    targetUrl: '/payroll',
    actionLabel: 'Cek Slip Gaji',
  },

  // SPV Scenarios
  {
    id: 'SPV-01',
    role: 'spv',
    title: 'Monitoring Presensi Tim Bawahan',
    steps: 'Buka /attendance-management (atau /dashboard). Filter data presensi berdasarkan tim divisi.',
    expected: 'Hanya anggota tim yang dipimpin yang tampil dalam rekapitulasi presensi harian.',
    targetUrl: '/attendance-management',
    actionLabel: 'Cek Presensi Tim',
  },
  {
    id: 'SPV-02',
    role: 'spv',
    title: 'Approval Pengajuan Cuti Anggota Tim',
    steps: 'Buka /approvals pada tab "Menunggu Persetujuan". Klik Review pada salah satu pengajuan bawahan.',
    expected: 'SPV dapat menyetujui (Approve) atau menolak (Reject) dengan catatan revisi.',
    targetUrl: '/approvals',
    actionLabel: 'Review Approval Tim',
  },
  {
    id: 'SPV-03',
    role: 'spv',
    title: 'Delegasi & Penugasan Lembur Tim',
    steps: 'Buka /overtime, klik "Buat Penugasan Lembur", pilih anggota tim bawahan dan estimasi jam.',
    expected: 'Surat Perintah Lembur (SPL) terbit dan bawahan menerima notifikasi penugasan.',
    targetUrl: '/overtime',
    actionLabel: 'Buka Menu Lembur',
  },

  // Kepala Divisi Scenarios
  {
    id: 'KDV-01',
    role: 'kepala_divisi',
    title: 'Approval Cuti Lintas Tim (Tingkat Dua)',
    steps: 'Buka /approvals dengan role Kepala Divisi. Periksa pengajuan yang telah diapprove oleh SPV.',
    expected: 'Pengajuan berstatus approved_spv membutuhkan sign-off Kepala Divisi sebelum ke HR.',
    targetUrl: '/approvals',
    actionLabel: 'Verifikasi Approval Kadiv',
  },
  {
    id: 'KDV-02',
    role: 'kepala_divisi',
    title: 'Monitoring KPI & Lembur Divisi',
    steps: 'Buka /reports, pilih filter divisi terkait, amati ringkasan jam lembur dan rasio absensi.',
    expected: 'Data analitik tersaring otomatis khusus divisi yang dipimpin.',
    targetUrl: '/reports',
    actionLabel: 'Buka Laporan Divisi',
  },

  // HR Administrator Scenarios
  {
    id: 'HR-01',
    role: 'hr',
    title: 'Import Batch File Presensi Fingerprint',
    steps: 'Buka /attendance-management tab "Import Fingerprint". Upload file Excel presensi Solution/ZKTeco.',
    expected: 'Pratinjau mapping AC No ke ID karyawan tampil, baris duplikat dihighlight, dan import tersimpan.',
    targetUrl: '/attendance-management',
    actionLabel: 'Tes Import Fingerprint',
  },
  {
    id: 'HR-02',
    role: 'hr',
    title: 'Review Presensi GPS Dinas Luar (Pending)',
    steps: 'Buka /attendance-management tab "Review GPS". Periksa clock-in di luar radius kantor.',
    expected: 'HR dapat melihat foto/koordinat dan menyetujui presensi dinas luar.',
    targetUrl: '/attendance-management',
    actionLabel: 'Buka Review GPS',
  },
  {
    id: 'HR-03',
    role: 'hr',
    title: 'Manajemen Kontrak PKWT & Database Karyawan',
    steps: 'Buka /employees. Pilih salah satu dari 94 karyawan hasil migrasi Odoo, klik tab "Kontrak".',
    expected: 'Detail profil lengkap, jabatan, NIK, dan opsi catat mutasi/perpanjangan kontrak aktif.',
    targetUrl: '/employees',
    actionLabel: 'Kelola Data Karyawan',
  },
  {
    id: 'HR-04',
    role: 'hr',
    title: 'Sinkronisasi Outbox ke Live Odoo ERP',
    steps: 'Buka /odoo-sync. Periksa status koneksi Odoo dan tekan tombol "Sync Sekarang".',
    expected: 'Koneksi ke kanti-sehati-sukses.odoo.com terhubung, item outbox dipush via JSON-RPC.',
    targetUrl: '/odoo-sync',
    actionLabel: 'Buka Sinkronisasi Odoo',
  },

  // Management / Direksi Scenarios
  {
    id: 'MGT-01',
    role: 'management',
    title: 'Kalkulasi Payroll & Aturan Lembur Kemenaker',
    steps: 'Buka /payroll tab "Periode Gaji". Buat periode berjalan dan klik "Hitung Otomatis".',
    expected: 'Perhitungan gaji pokok, lembur pengali 1.5x/2x, dan potongan absensi terhitung presisi.',
    targetUrl: '/payroll',
    actionLabel: 'Kalkulasi Payroll',
  },
  {
    id: 'MGT-02',
    role: 'management',
    title: 'Finalisasi & Lock Periode Penggajian',
    steps: 'Buka periode gaji yang telah dikaji, klik "Kunci & Finalisasi Periode".',
    expected: 'Periode terkunci (read-only), slip gaji resmi terdistribusi ke seluruh karyawan.',
    targetUrl: '/payroll',
    actionLabel: 'Finalisasi Gaji',
  },
  {
    id: 'MGT-03',
    role: 'management',
    title: 'Executive Analytics & Tren Biaya SDM',
    steps: 'Buka /reports tab "Executive Overview".',
    expected: 'Chart kehadiran, distribusi rasio lembur per departemen, dan tren absensi tampil interaktif.',
    targetUrl: '/reports',
    actionLabel: 'Buka Laporan Eksekutif',
  },

  // IT Administrator Scenarios
  {
    id: 'ADM-01',
    role: 'admin',
    title: 'System Health Probe & Latensi Database',
    steps: 'Buka /api/health untuk memeriksa diagnostik latency DB Supabase dan live Odoo connectivity.',
    expected: 'Response JSON status: "healthy", latency DB < 800ms, Odoo version 19.0+e.',
    targetUrl: '/api/health',
    actionLabel: 'Cek Health API',
  },
  {
    id: 'ADM-02',
    role: 'admin',
    title: 'Konfigurasi Master Kantor & Radius Geofence',
    steps: 'Buka /settings/offices. Pastikan lokasi kantor pusat terdaftar dengan lat/long & radius.',
    expected: 'Daftar kantor tersimpan dan menjadi acuan validasi geofence clock-in GPS.',
    targetUrl: '/settings/offices',
    actionLabel: 'Kelola Lokasi Kantor',
  },
  {
    id: 'ADM-03',
    role: 'admin',
    title: 'Audit Security Logs & RLS Integrity',
    steps: 'Buka /audit-logs. Amati pencatatan rekaman log seluruh mutasi sistem dan percobaan unauthorized.',
    expected: 'Setiap aksi penting tersimpan di audit_logs dengan timestamp, actor, dan changes_json.',
    targetUrl: '/audit-logs',
    actionLabel: 'Buka Audit Logs',
  },
];

const ROLE_TABS = [
  { id: 'all', label: 'Semua Role', icon: Layers },
  { id: 'staff', label: 'Staff Karyawan', icon: Users },
  { id: 'spv', label: 'Supervisor (SPV)', icon: UserCheck },
  { id: 'kepala_divisi', label: 'Kepala Divisi', icon: Building2 },
  { id: 'hr', label: 'HR Administrator', icon: Briefcase },
  { id: 'management', label: 'Management / Direksi', icon: ShieldCheck },
  { id: 'admin', label: 'IT Administrator', icon: Database },
];

export default function UatPortalPage() {
  const [activeTab, setActiveTab] = useState<string>('all');
  const [scenarioStatus, setScenarioStatus] = useState<Record<string, 'passed' | 'failed' | 'pending'>>({});
  const [testerNotes, setTesterNotes] = useState<Record<string, string>>({});
  const [systemHealth, setSystemHealth] = useState<{
    status: string;
    dbLatency: number;
    odooStatus: string;
    loading: boolean;
  }>({
    status: 'checking',
    dbLatency: 0,
    odooStatus: 'checking',
    loading: true,
  });

  // Load persisted UAT status from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('hris_uat_progress_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        setScenarioStatus(parsed.status || {});
        setTesterNotes(parsed.notes || {});
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  // Save to localStorage on change
  const updateStatus = (id: string, status: 'passed' | 'failed' | 'pending') => {
    const updated = { ...scenarioStatus, [id]: status };
    setScenarioStatus(updated);
    localStorage.setItem(
      'hris_uat_progress_v1',
      JSON.stringify({ status: updated, notes: testerNotes })
    );
  };

  const updateNote = (id: string, note: string) => {
    const updated = { ...testerNotes, [id]: note };
    setTesterNotes(updated);
    localStorage.setItem(
      'hris_uat_progress_v1',
      JSON.stringify({ status: scenarioStatus, notes: updated })
    );
  };

  const resetAll = () => {
    if (confirm('Reset seluruh status checklist UAT ke awal?')) {
      setScenarioStatus({});
      setTesterNotes({});
      localStorage.removeItem('hris_uat_progress_v1');
    }
  };

  // Mark all as passed shortcut
  const markAllPassed = () => {
    const allPassed: Record<string, 'passed'> = {};
    UAT_SCENARIOS.forEach((s) => {
      allPassed[s.id] = 'passed';
    });
    setScenarioStatus(allPassed);
    localStorage.setItem(
      'hris_uat_progress_v1',
      JSON.stringify({ status: allPassed, notes: testerNotes })
    );
  };

  // Fetch live system health
  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch('/api/health');
        if (res.ok) {
          const data = await res.json();
          setSystemHealth({
            status: data.status,
            dbLatency: data.checks?.database?.latencyMs || 0,
            odooStatus: data.checks?.odoo?.status || 'disabled',
            loading: false,
          });
        } else {
          setSystemHealth({
            status: 'degraded',
            dbLatency: 0,
            odooStatus: 'error',
            loading: false,
          });
        }
      } catch {
        setSystemHealth({
          status: 'unreachable',
          dbLatency: 0,
          odooStatus: 'unreachable',
          loading: false,
        });
      }
    }
    checkHealth();
  }, []);

  const filteredScenarios =
    activeTab === 'all'
      ? UAT_SCENARIOS
      : UAT_SCENARIOS.filter((s) => s.role === activeTab);

  const totalCount = UAT_SCENARIOS.length;
  const passedCount = Object.values(scenarioStatus).filter((s) => s === 'passed').length;
  const failedCount = Object.values(scenarioStatus).filter((s) => s === 'failed').length;
  const pendingCount = totalCount - passedCount - failedCount;
  const progressPercent = Math.round((passedCount / totalCount) * 100);

  const exportReport = () => {
    const reportData = {
      title: 'UAT Sign-Off Certificate — HRIS PWA Production',
      generatedAt: new Date().toISOString(),
      summary: {
        totalScenarios: totalCount,
        passed: passedCount,
        failed: failedCount,
        pending: pendingCount,
        completionPercentage: `${progressPercent}%`,
      },
      scenarios: UAT_SCENARIOS.map((s) => ({
        id: s.id,
        role: s.role,
        title: s.title,
        status: scenarioStatus[s.id] || 'pending',
        notes: testerNotes[s.id] || '-',
      })),
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `uat_sign_off_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950/40 to-slate-900 border border-slate-800/80 p-6 md:p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Matriks Kesiapan Go-Live</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              Portal UAT & Verifikasi Sistem
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              Checklist Pengujian Penerimaan Pengguna (User Acceptance Testing) lintas 6 role bisnis.
            </p>
          </div>

          {/* Quick Metrics & Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={exportReport}
              className="px-4 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium inline-flex items-center gap-2 transition-colors shadow-sm"
            >
              <Download className="w-4 h-4 text-blue-400" />
              Export Sign-Off
            </button>
            <button
              onClick={markAllPassed}
              className="px-4 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-medium inline-flex items-center gap-2 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Pass Semua
            </button>
            <button
              onClick={resetAll}
              className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/60 text-xs transition-colors"
              title="Reset status checklist"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6 pt-6 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>Progres Kelulusan UAT</span>
              <span className="font-bold text-white">{progressPercent}% ({passedCount}/{totalCount})</span>
            </div>
            <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <Activity className="w-5 h-5 text-blue-400 shrink-0" />
            <div>
              <div className="text-[11px] text-slate-400 uppercase font-mono">Status Database</div>
              <div className="text-xs font-semibold text-white flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Supabase Live ({systemHealth.dbLatency}ms)</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <RefreshCw className={`w-5 h-5 text-indigo-400 shrink-0 ${systemHealth.loading ? 'animate-spin' : ''}`} />
            <div>
              <div className="text-[11px] text-slate-400 uppercase font-mono">Status Odoo ERP</div>
              <div className="text-xs font-semibold text-white flex items-center gap-1.5 mt-0.5">
                <span className={`w-2 h-2 rounded-full ${systemHealth.odooStatus === 'ok' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                <span className="capitalize">{systemHealth.odooStatus === 'ok' ? 'Connected (v19.0)' : systemHealth.odooStatus}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Role Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-800/80">
        {ROLE_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const count =
            tab.id === 'all'
              ? totalCount
              : UAT_SCENARIOS.filter((s) => s.role === tab.id).length;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'bg-slate-900/60 hover:bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-800/80'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Scenarios List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredScenarios.map((scenario) => {
          const status = scenarioStatus[scenario.id] || 'pending';
          const note = testerNotes[scenario.id] || '';

          return (
            <div
              key={scenario.id}
              className={`rounded-2xl border transition-all p-5 md:p-6 ${
                status === 'passed'
                  ? 'bg-emerald-950/10 border-emerald-500/30'
                  : status === 'failed'
                  ? 'bg-rose-950/10 border-rose-500/30'
                  : 'bg-[#0d1322] border-slate-800/80'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div className="space-y-3 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {scenario.id}
                    </span>
                    <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {scenario.role.replace('_', ' ')}
                    </span>
                    <h3 className="text-base font-semibold text-white tracking-tight">
                      {scenario.title}
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/60 text-slate-300">
                      <span className="text-[11px] font-mono uppercase text-slate-500 block mb-1">
                        Langkah Pengujian
                      </span>
                      {scenario.steps}
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/60 text-slate-300">
                      <span className="text-[11px] font-mono uppercase text-slate-500 block mb-1">
                        Hasil yang Diharapkan
                      </span>
                      {scenario.expected}
                    </div>
                  </div>

                  {/* Note Input */}
                  <div className="pt-1">
                    <input
                      type="text"
                      placeholder="Catatan tester / temuan bug (opsional)..."
                      value={note}
                      onChange={(e) => updateNote(scenario.id, e.target.value)}
                      className="w-full text-xs px-3 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Status & Action Buttons */}
                <div className="flex lg:flex-col items-center lg:items-end justify-between lg:justify-start gap-3 shrink-0 pt-2 lg:pt-0">
                  <Link
                    href={scenario.targetUrl}
                    target="_blank"
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
                  >
                    <span>{scenario.actionLabel}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>

                  <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
                    <button
                      onClick={() => updateStatus(scenario.id, 'passed')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1 transition-all ${
                        status === 'passed'
                          ? 'bg-emerald-500 text-white font-bold shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Pass</span>
                    </button>
                    <button
                      onClick={() => updateStatus(scenario.id, 'failed')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1 transition-all ${
                        status === 'failed'
                          ? 'bg-rose-500 text-white font-bold shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Fail</span>
                    </button>
                    <button
                      onClick={() => updateStatus(scenario.id, 'pending')}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1 transition-all ${
                        status === 'pending'
                          ? 'bg-slate-700 text-white shadow'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                      title="Set to Pending"
                    >
                      <Clock className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
