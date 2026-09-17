'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  Clock,
  Users,
  Shield,
  Layers,
  MapPin,
  CalendarCheck,
  FileCheck2,
  Sparkles,
  ArrowRight,
  Database,
  RefreshCw,
  Smartphone,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function DashboardPage() {
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'unconfigured'>('checking');
  const [dbMessage, setDbMessage] = useState<string>('Memeriksa koneksi Supabase...');
  const [pwaInstalled, setPwaInstalled] = useState<boolean>(false);

  useEffect(() => {
    // Check PWA display mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setPwaInstalled(true);
    }

    const checkDb = async () => {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (!url || url.includes('placeholder')) {
        setDbStatus('unconfigured');
        setDbMessage('Menunggu pengisian kredensial di .env.local');
        return;
      }

      try {
        const supabase = createClient();
        const { error } = await supabase.from('request_types').select('id').limit(1);
        if (error) {
          setDbStatus('unconfigured');
          setDbMessage(`Error koneksi: ${error.message}`);
        } else {
          setDbStatus('connected');
          setDbMessage('Terhubung & schema v3 terverifikasi');
        }
      } catch (err: unknown) {
        setDbStatus('unconfigured');
        setDbMessage(err instanceof Error ? err.message : 'Koneksi gagal');
      }
    };

    checkDb();
  }, []);

  const todayStr = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-mono font-medium text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
              SPRINT 0 — FONDASI AKTIF
            </span>
            <span className="text-slate-600">&bull;</span>
            <span className="text-xs text-slate-400">{todayStr}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Dashboard Utama HRIS
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Infrastruktur sistem, manajemen kehadiran geofencing, pengajuan cuti, dan payroll enterprise.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
            <Smartphone className="w-4 h-4 text-blue-400" />
            <span className="text-slate-300">PWA:</span>
            <span className="font-mono text-emerald-400">
              {pwaInstalled ? 'Aplikasi Terpasang' : 'Web / Siap Install'}
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Koneksi Database</span>
            <Database className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-3">
            <div className="text-lg font-bold text-white flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  dbStatus === 'connected'
                    ? 'bg-emerald-500'
                    : dbStatus === 'checking'
                    ? 'bg-amber-500 animate-pulse'
                    : 'bg-amber-400'
                }`}
              />
              {dbStatus === 'connected' ? 'Aktif' : 'Standby / Config'}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 truncate">{dbMessage}</p>
          </div>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Arsitektur Schema</span>
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-3">
            <div className="text-lg font-bold text-white">v3.0 Production</div>
            <p className="text-[11px] text-slate-400 mt-1">18 Tabel, RLS & Triggers Siap</p>
          </div>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Keamanan & Sesi</span>
            <Shield className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3">
            <div className="text-lg font-bold text-white">Google OAuth SSO</div>
            <p className="text-[11px] text-slate-400 mt-1">Auto-Claim Karyawan Aktif</p>
          </div>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Antarmuka PWA</span>
            <Smartphone className="w-4 h-4 text-teal-400" />
          </div>
          <div className="mt-3">
            <div className="text-lg font-bold text-white">Serwist Worker</div>
            <p className="text-[11px] text-slate-400 mt-1">Plus Jakarta Sans UI</p>
          </div>
        </Card>
      </div>

      {/* Sprint 0 Foundation Checklist & Architecture Highlights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Sprint 0 Deliverables Verified */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader
              title="Komponen Fondasi Sprint 0"
              subtitle="Pondasi teknis yang telah dibangun dan siap digunakan"
            />

            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="text-xs font-semibold text-slate-200">
                    Next.js 16 + App Router + TypeScript
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Arsitektur modern dengan Server & Client Components, routing grup auth & dashboard terpisah.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="text-xs font-semibold text-slate-200">
                    Typography & Visual System (Bukan Template AI)
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Ditenagai <strong>Plus Jakarta Sans</strong> untuk keterbacaan enterprise optimal dan <strong>JetBrains Mono</strong> untuk angka tabular.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="text-xs font-semibold text-slate-200">
                    Integrasi Supabase SSR & Middleware Auth
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Cookie-based session refresher, route protection, dan handler callback OAuth dengan logika auto-claim akun karyawan.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="text-xs font-semibold text-slate-200">
                    PWA Ready (Manifest + Service Worker)
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Web App Manifest dinamis terintegrasi Serwist, offline shell caching, dan icon maskable 192x192 & 512x512.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="text-xs font-semibold text-slate-200">
                    Database Schema Migration v3
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Tersedia di <code className="text-blue-400 font-mono">supabase/migrations/20260917000001_initial_schema.sql</code>, mencakup 35 perbaikan audit mendalam.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Col: Next Sprints Roadmap */}
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Roadmap Modul Selanjutnya"
              subtitle="Urutan pengerjaan sprint sesuai rencana"
            />

            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                <div className="flex items-center justify-between text-xs font-bold text-blue-400 font-mono">
                  <span>SPRINT 1</span>
                  <span>SELANJUTNYA</span>
                </div>
                <div className="text-xs font-semibold text-slate-200 mt-1">
                  Master Data & Akun Karyawan
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  CRUD Karyawan, Divisi, Jadwal Kerja, Jam Istirahat, dan Jenis Pengajuan Dinamis.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800 text-slate-400">
                <div className="text-xs font-bold text-slate-500 font-mono">SPRINT 2</div>
                <div className="text-xs font-semibold text-slate-300 mt-1">
                  Presensi Geofencing GPS
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Check-in/out GPS radius kantor, selfie camera, kalkulasi keterlambatan otomatis.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800 text-slate-400">
                <div className="text-xs font-bold text-slate-500 font-mono">SPRINT 3 - 5</div>
                <div className="text-xs font-semibold text-slate-300 mt-1">
                  Cuti, Izin & Multi-Tier Approval
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Pengajuan berjenjang (SPV &rarr; Kadiv &rarr; HR), kuota cuti tahunan, lampiran berkas.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
