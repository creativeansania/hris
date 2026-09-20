# Checklist Kesiapan Go-Live & Prosedur Rollback (Sprint 14)

Dokumen ini merupakan panduan resmi cutover produksi, verifikasi keamanan, dan rencana mitigasi darurat (rollback plan) untuk implementasi Sistem HRIS PWA PT Kanti Sehati Sukses.

---

## 1. Checklist Kesiapan Produksi (Go-Live Checklist)

### 1.1 Kesiapan Infrastruktur & Environment
- [x] **Supabase Production Database**: Database aktif di region Southeast Asia (Singapore) dengan backup otomatis harian.
- [x] **Environment Variables**:
  - `NEXT_PUBLIC_SUPABASE_URL` valid & terhubung.
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` valid untuk client-side queries dengan RLS.
  - `SUPABASE_SERVICE_ROLE_KEY` terproteksi di server actions / scripts.
  - `ODOO_URL`, `ODOO_DB`, `ODOO_USERNAME`, `ODOO_API_KEY` aktif terhubung ke live SaaS.
- [x] **Google OAuth 2.0 Client**: Domain produksi telah didaftarkan pada Google Cloud Console Authorized Redirect URIs (`/auth/callback`).
- [x] **HTTPS & SSL Enforcement**: Seluruh traffic terenkripsi TLS 1.3 dengan sertifikat SSL aktif.
- [x] **Security Headers**: Content Security Policy (CSP), Strict-Transport-Security (HSTS), X-Frame-Options `DENY`, X-Content-Type-Options `nosniff` telah dikonfigurasi di `next.config.js`.

### 1.2 Kesiapan Database & Master Data
- [x] **Migrasi Data Karyawan Odoo**: 94 karyawan aktif berhasil dimigrasikan dari Odoo ERP dengan email perusahaan `@kantiss.com` unik.
- [x] **Sinkronisasi Divisi**: 15 divisi operasional telah terpetakan lengkap dengan Kepala Divisi terkait.
- [x] **Jadwal Kerja Default**: Jadwal kerja reguler (Senin - Jumat 08:00 - 17:00) terpasang ke seluruh staf.
- [x] **Saldo Cuti Tahunan 2026**: Kuota 12 hari cuti tahunan telah diprovisi ke seluruh karyawan aktif.
- [x] **Master Lokasi Kantor (Geofence GPS)**: Koordinat latitude/longitude dan toleransi radius (100 meter) kantor pusat dan cabang telah terdaftar.

### 1.3 Kesiapan PWA & Offline Engine
- [x] **Web App Manifest**: `manifest.json` terverifikasi dengan nama aplikasi, tema warna obsidian, dan ikon 192px/512px.
- [x] **Serwist Service Worker**: Cache-first untuk aset statis, network-first untuk dynamic data, dan fallback rute `/offline`.
- [x] **IndexedDB Outbox Queue**: Presensi clock-in dan formulir pengajuan cuti dapat tersimpan secara lokal saat perangkat offline dan auto-sync saat koneksi kembali.

### 1.4 UAT & Sign-Off Role
- [x] **Role Staff**: Pengujian Clock-in GPS, formulir cuti/izin, isi alasan telat, dan slip gaji tervalidasi.
- [x] **Role Supervisor (SPV)**: Pengujian approval tim dan penerbitan penugasan lembur (SPL) tervalidasi.
- [x] **Role Kepala Divisi**: Pengujian approval berjenjang tingkat dua dan monitoring analitik divisi tervalidasi.
- [x] **Role HR Administrator**: Pengujian import Excel fingerprint, review GPS dinas luar, mutasi karyawan, dan push Odoo sync tervalidasi.
- [x] **Role Management**: Pengujian kalkulasi payroll formula Kemenaker dan penguncian periode gaji tervalidasi.
- [x] **Role IT Administrator**: Pengujian system health probe (`/api/health`) dan audit trail tervalidasi.

---

## 2. Prosedur Cutover Menuju Produksi

1. **Pengumuman Pengguna (H-3 Go-Live)**:
   - HRGA mendistribusikan email/pengumuman WhatsApp kepada seluruh karyawan terkait peluncuran sistem HRIS baru.
   - Menyertakan tautan panduan penggunaan (`docs/user_guide.md`) dan instruksi login pertama kali via Google.
2. **Freeze Data Lama (H-1 Go-Live)**:
   - Pencatatan absensi manual/spreadsheet dihentikan pada pukul 23:59 WIB.
   - Melakukan sinkronisasi data master karyawan final dari Odoo ERP via `node scripts/import_odoo_employees.js --apply`.
3. **Penyalaan Sistem (Hari-H 00:01 WIB)**:
   - Akses HRIS dibuka penuh untuk seluruh staf.
   - Mesin fingerprint di kantor pusat disinkronkan ke nomor barcode/AC ID karyawan.
   - Tim IT & HR standby melakukan monitoring real-time pada `/uat` dan `/api/health`.

---

## 3. Rencana Mitigasi Darurat & Prosedur Rollback (Rollback Plan)

Apabila terjadi kendala sistem fatal (Critical Severity 1) yang menghambat operasional presensi lebih dari 2 jam pada hari pertama, ikuti langkah-langkah darurat berikut:

### 3.1 Kategori Insiden Kritis
- **Database Unreachable**: Database Supabase mengalami down melebihi toleransi failover.
- **Data Corruption**: Terjadi anomali kalkulasi potongan gaji massal yang tidak dapat diperbaiki dalam 1 jam.
- **OAuth Authentication Blackout**: Login Google ditolak secara menyeluruh karena kendala API pihak ketiga.

### 3.2 Langkah Rollback Langkah demi Langkah
1. **Aktivasi Fallback Presensi Fingerprint Offline**:
   - Seluruh karyawan diinstruksikan untuk menggunakan mesin absensi fisik (fingerprint/kartu RFID) secara normal.
   - Mesin fingerprint menyimpan data offline di memori internal mesin secara mandiri.
2. **Penyelamatan Snapshot Database Supabase**:
   - Buka Supabase Dashboard → Database → Backups.
   - Pilih *Point-in-Time Recovery (PITR)* atau restore dari snapshot otomatis H-1 sebelum cutover.
3. **Pemberitahuan Sistem (System Maintenance Banner)**:
   - Admin mengaktifkan mode pemeliharaan dengan mengarahkan domain utama ke halaman statis maintenance:
   - *"Sistem HRIS sedang dalam peningkatan performa berkala. Silakan lakukan presensi via mesin sidik jari kantor."*
4. **Isolasi Masalah & Patch Hotfix**:
   - Tim IT melakukan debugging menggunakan log di `/audit-logs` dan diagnostic trace pada `/api/health`.
   - Lakukan uji regresi lokal via `npm run test:all` dan `npm run build` sebelum membuka kembali traffic.

---

## 4. Kontak Darurat Tim Respon Cepat (Incident Team)

| Posisi | Nama / Penanggung Jawab | Kontak / Saluran |
|---|---|---|
| **Lead IT / System Admin** | Tim IT Kanti Sehati Sukses | it@kantiss.com |
| **HRGA Lead** | Andri Fadjar | hrd@kantiss.com |
| **Executive Sponsor** | Management PT Kanti Sehati Sukses | management@kantiss.com |

---

*Dokumen ini resmi disetujui untuk pelaksanaan Go-Live Sprint 14.*
