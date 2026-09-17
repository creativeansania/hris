'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, MapPin, Clock, Calendar, SlidersHorizontal } from 'lucide-react';

const SETTINGS_TABS = [
  {
    name: 'Divisi Organisasi',
    href: '/settings/divisions',
    icon: Building2,
  },
  {
    name: 'Lokasi Kantor & Geofencing',
    href: '/settings/locations',
    icon: MapPin,
  },
  {
    name: 'Jadwal Kerja & Shift',
    href: '/settings/schedules',
    icon: Clock,
  },
  {
    name: 'Kalender Libur',
    href: '/settings/holidays',
    icon: Calendar,
  },
  {
    name: 'Jenis Pengajuan Dinamis',
    href: '/settings/request-types',
    icon: SlidersHorizontal,
  },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      {/* Settings Header */}
      <div className="border-b border-slate-800/80 pb-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] font-mono font-medium text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
            MASTER DATA & KONFIGURASI
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Pengaturan Sistem & Master Data
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Kelola struktur organisasi, parameter GPS geofencing, jam kerja dan toleransi keterlambatan, kalender libur, serta jenis pengajuan.
        </p>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto mt-6 pt-2 pb-1 scrollbar-none border-t border-slate-800/60">
          {SETTINGS_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = pathname === tab.href;

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.name}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Subpage content */}
      <div>{children}</div>
    </div>
  );
}
