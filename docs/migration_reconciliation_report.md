# Laporan Rekonsiliasi Migrasi Data Karyawan (Sprint 14)

**Tanggal Eksekusi:** 2026-09-20
**Sumber Data:** Live Odoo ERP (`https://kanti-sehati-sukses.odoo.com`, Database: `kanti-sehati-sukses`)
**Target Database:** Supabase HRIS Production (`https://bhnjartvfbsbxdfoztqg.supabase.co`)

---

## 1. Ringkasan Eksekutif

| Indikator | Nilai | Status |
|---|---|---|
| **Total Record Karyawan Odoo** | 98 record | Terproses Lengkap |
| **Total Karyawan Aktif di HRIS** | 94 karyawan unik | 100% Tercatat & Aktif |
| **Penanganan Duplikasi Odoo** | 4 record ganda disanitasi & diindividualisasi | Bersih & Bebas Duplikat |
| **Divisi / Departemen Tersinkron** | 14 Departemen Odoo + 1 Master IT (15 Divisi) | Lengkap |
| **Hirarki Atasan (SPV / Manager)** | 32 relasi direct-report | Terhubung |
| **Kepala Divisi Ter-assign** | 2 divisi dipimpin Kadiv | Terhubung |
| **Saldo Cuti 2026 Diprovisi** | 94 karyawan x 12 hari (1.128 hari total) | Aktif & Siap Pakai |
| **Integritas Email Unik** | 94 email unik `@kantiss.com` / 0 duplikat | Valid Terverifikasi |

---

## 2. Distribusi Role Karyawan (RBAC Matrix)

| Role | Jumlah Karyawan | Hak Akses Utama |
|---|---|---|
| **Staff** | 74 | Presensi GPS/PWA, Pengajuan Cuti/Izin/Lembur, Slip Gaji, Mode Offline |
| **Supervisor (SPV)** | 2 | Approval Pengajuan Tim, Riwayat Anggota Tim, Delegasi Lembur |
| **Kepala Divisi** | 2 | Approval Tingkat Dua Lintas Divisi, Alokasi Lembur Divisi |
| **HRGA / HR** | 5 | Import Fingerprint Excel, Master Karyawan, Saldo Cuti, Sync Odoo |
| **Management / Direksi** | 2 | Payroll Calculation, Lock & Finalize Gaji, Executive Reports |
| **Administrator / IT** | 9 | Konfigurasi Sistem, Office GPS Locations, Audit Trail, Health Monitoring |
| **Total** | **94** | **100% Seluruh Role Terisi & Teruji** |

---

## 3. Distribusi Departemen / Divisi

| Nama Divisi | Jumlah Karyawan | Keterangan |
|---|---|---|
| **WAREHOUSE** | 21 | Dipimpin Head of Warehouse (Afrinaldi) |
| **SALES** | 13 | Tim penjualan retail & cabang |
| **QMS** | 9 | Tim Quality Management System |
| **HRGA** | 5 | Tim HR & General Affairs |
| **FINANCE & ACCOUNTING** | 6 | Dipimpin Head of Finance (Dewi Susilawati) |
| **PRODUCTION** | 5 | Tim produksi garmen & tekstil |
| **MARCOM** | 5 | Tim Marketing & Komunikasi |
| **MERCHANDISE** | 5 | Tim merchandising |
| **KONSULTAN** | 4 | Tim konsultan bisnis |
| **DESIGN** | 3 | Tim desain grafis & produk |
| **SALES CORPORATE** | 3 | Tim penjualan B2B korporat |
| **MANAGEMENT** | 2 | Direktur (Yus Ansari) & Komisaris (Nurhasanah) |
| **IT & Sistem** | 2 | Administrator IT & support |
| **Administration** | 1 | Administrasi umum |
| **Unassigned** | 10 | Karyawan lintas divisi (dipetakan manual) |

---

## 4. Validasi Integritas Data & Sanitasi

1. **Penanganan Shared Mailbox**: Alamat email generic departemen dari Odoo (`it@kantiss.com`, `hrd@kantiss.com`, `management@kantiss.com`, `quality@kantiss.com`) yang digunakan bersama oleh beberapa karyawan di Odoo otomatis diindividualisasi ke email berbasis nama karyawan (misal `denish.akbar@kantiss.com`, `salsabila.putri@kantiss.com`, `hilda.muharani@kantiss.com`) sehingga masing-masing staf dapat login secara independen melalui Google OAuth.
2. **Penanganan Duplikasi Karyawan**: Karyawan dengan identitas berulang (seperti *Bagus Ilham Khoir*) ditandai dengan indeks pembeda untuk mencegah bentrok email dan AC barcode.
3. **Nomor Fingerprint (AC No)**: Dipetakan langsung dari Barcode / PIN Odoo untuk sinkronisasi mesin Solution / ZKTeco.
4. **Jadwal Kerja Default**: 100% karyawan dipetakan ke grup jadwal "Reguler Kantor (Senin - Jumat)".
5. **Saldo Cuti 2026**: Seluruh 94 karyawan memiliki kuota Cuti Tahunan 12 hari yang aktif dan siap dipakai untuk pengajuan cuti via portal atau PWA.

---

*Laporan ini dihasilkan otomatis oleh script migrasi HRIS Sprint 14.*
