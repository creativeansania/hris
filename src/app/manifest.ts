import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'HRIS — Human Resource Information System',
    short_name: 'HRIS PWA',
    description: 'Sistem Informasi Manajemen SDM, Presensi Geofencing, Payroll, dan Pengajuan Cuti/Izin',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    display_override: ['window-controls-overlay', 'standalone'],
    background_color: '#0b0f19',
    theme_color: '#0b0f19',
    orientation: 'portrait-primary',
    categories: ['business', 'productivity', 'utilities'],
    prefer_related_applications: false,
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
    shortcuts: [
      {
        name: 'Presensi GPS',
        short_name: 'Clock In',
        description: 'Buka form presensi GPS dan Geofencing',
        url: '/clock-in',
        icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
      },
      {
        name: 'Pengajuan Cuti & Izin',
        short_name: 'Pengajuan',
        description: 'Buat permohonan cuti, sakit atau izin dinas',
        url: '/requests',
        icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
      },
      {
        name: 'Presensi Saya',
        short_name: 'Riwayat',
        description: 'Lihat rekap dan riwayat presensi pribadi',
        url: '/my-attendance',
        icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
      },
    ],
  };
}
