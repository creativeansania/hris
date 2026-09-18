# Sprint Plan — HRIS PWA

**Asumsi:** solo developer, sprint 2 minggu, payroll dikerjakan setelah formula final dari Management. Urutan disusun supaya tiap sprint menghasilkan sesuatu yang bisa langsung dites/dipakai, bukan numpuk di akhir.

**Update v2:** dependency holidays/work_schedules dipindahkan ke Sprint 1, Sprint 11 lama dipecah, ditambah sprint security & migrasi data.

---

## Sprint 0 — Fondasi (1 minggu)
**Tujuan:** environment siap, schema dasar jalan.
- Setup project Next.js + Supabase, konfigurasi PWA (manifest, service worker)
- Jalankan schema SQL awal (semua tabel, enums, reference tables, triggers, RLS, seed data)
- Setup Google OAuth di Supabase Auth
- Setup Supabase Storage bucket (leave-attachments, attendance-imports)
- Deploy pipeline dasar (staging)

**Acceptance Criteria:**
- [ ] Project berjalan di localhost dan staging
- [ ] Google OAuth login berhasil (redirect + callback)
- [ ] Tabel database terbuat semua tanpa error
- [ ] Storage bucket accessible

**Deliverable:** project kosong tapi bisa login Google, terhubung ke database.

---

## Sprint 1 — Master Data, Onboarding & Jadwal Kerja
**Tujuan:** admin bisa provisioning karyawan, flow klaim akun jalan, data dasar jadwal & hari libur tersedia.
- CRUD karyawan (admin): input data lengkap (identitas, kontak darurat, bank, mapping divisi/atasan/role)
- Logic klaim akun saat login Google pertama kali (match email → `pending_claim` → `active`)
- RLS dasar per role (employees table)
- CRUD divisi, office locations (admin)
- CRUD work_schedule_groups + work_schedule_days (HR): setup jadwal kerja default (Sen-Jum 08-17, Sab 08-14, termasuk jam istirahat)
- CRUD holidays (HR): input kalender libur tahun berjalan
- CRUD request_types (admin/HR): review seed data, tambah/nonaktifkan jenis pengajuan jika perlu
- Seed data `system_settings` default

**Acceptance Criteria:**
- [ ] Admin bisa CRUD karyawan dengan data lengkap (identitas, kontak darurat, bank)
- [ ] Login Google pertama kali → akun match email → status `active`
- [ ] Login dengan email yang tidak terdaftar → ditolak
- [ ] Admin bisa setup lokasi kantor dengan koordinat & radius
- [ ] HR bisa setup jadwal kerja (grup + detail per hari, termasuk jam istirahat)
- [ ] HR bisa setup kalender libur
- [ ] Admin bisa melihat/edit daftar jenis pengajuan (request_types)
- [ ] RLS memblokir akses data antar role

**Deliverable:** admin bisa input karyawan baru, karyawan itu bisa login dan otomatis "ketemu" datanya. Jadwal kerja & hari libur tersedia untuk modul absensi.

---

## Sprint 2 — Absensi: Import Fingerprint
**Tujuan:** HR bisa upload data absensi dari mesin fingerprint.
- Parser Excel/CSV (handle format yang sudah dikonfirmasi + fleksibel untuk merek lain)
- Preview sebelum konfirmasi import (highlight ID tidak match, baris duplikat, anomali)
- Handling duplikasi: pilihan skip atau overwrite jika data periode sudah ada
- Simpan ke tabel `attendance`, mapping ke `employee_id`
- Halaman riwayat absensi (staff & HR)
- Audit log: catat setiap import batch

**Acceptance Criteria:**
- [x] HR bisa upload file Excel/CSV fingerprint
- [x] Preview menampilkan data dengan highlight: matched (hijau), unmatched (merah), duplikat (kuning)
- [x] Setelah confirm, data masuk tabel `attendance` dengan `source = fingerprint`
- [x] Staff bisa melihat riwayat absensi miliknya sendiri
- [x] HR bisa melihat riwayat absensi semua karyawan (filter divisi/karyawan/periode)
- [x] Import tercatat di audit_logs & attendance_import_batches
- [x] Alasan keterlambatan dapat diisi langsung oleh karyawan di halaman Presensi Saya

**Deliverable:** HR upload file fingerprint, data absensi karyawan langsung muncul di sistem. Status: COMPLETED.

---

## Sprint 3 — Absensi: Fallback GPS
**Tujuan:** clock-in manual untuk lokasi tanpa mesin fingerprint.
- Halaman clock-in dengan Geolocation API
- Perhitungan jarak ke semua `office_locations` (server-side)
- Auto-accept dalam radius, `pending_review` di luar radius
- Validasi accuracy GPS + log audit trail (device info, timestamp server)
- Error handling: GPS off, timeout, akurasi buruk, mock location detection
- Halaman review GPS attendance (HR)

**Acceptance Criteria:**
- [x] Karyawan bisa clock-in dari halaman app (/clock-in)
- [x] Dalam radius → status `auto_valid`, tanpa approval
- [x] Di luar radius → status `pending_review`, wajib isi catatan dinas luar
- [x] GPS dimatikan → error message, tidak bisa submit
- [x] Akurasi > 100m → ditolak dengan pesan
- [x] HR bisa review dan approve/reject attendance pending di /attendance-management
- [x] Log lengkap (koordinat, akurasi, device info) tersimpan

**Deliverable:** karyawan bisa clock-in manual dari cabang manapun yang terdaftar, otomatis diterima jika dalam radius. Status: COMPLETED.

---

## Sprint 4 — Telat Aktual & Izin Telat
**Tujuan:** dua alur berbeda untuk keterlambatan.
- Auto-notifikasi ke karyawan saat data fingerprint menunjukkan telat → form isi alasan (tanpa approval)
- Form pengajuan izin telat (sebelum jam masuk sesuai `work_schedules`) → masuk approval flow
- Logic linking izin telat yang approved ke data attendance hari itu
- Halaman akumulasi keterlambatan (personal & HR)
- Tabel `late_accumulations` — auto-update saat data absensi masuk
- Koreksi data absensi (HR) via `attendance_corrections`

**Acceptance Criteria:**
- [x] Setelah import fingerprint / presensi, karyawan yang telat mendapat rekap & form klarifikasi
- [x] Karyawan bisa isi alasan telat (tanpa approval, hanya dokumentasi)
- [x] Izin telat hanya bisa diajukan sebelum jam masuk sesuai jadwal kerja karyawan
- [x] Izin telat yang approved → telat aktual hari itu tidak masuk akumulasi sanksi (status Excused)
- [x] Akumulasi keterlambatan per bulan terlihat di dashboard karyawan & HR
- [x] HR bisa koreksi data absensi (data asli tetap tersimpan di attendance_corrections)

**Deliverable:** dua jalur telat berjalan sesuai bedanya, akumulasi terlihat, koreksi bisa dilakukan. Status: COMPLETED.

---

## Sprint 5 — Cuti & Izin (Approval Flow)
**Tujuan:** modul pengajuan cuti/izin lengkap dengan approval berjenjang.
- Form pengajuan dinamis: jenis cuti/izin diambil dari tabel `request_types` (bukan hardcode)
- Multi-file upload via tabel `request_attachments` (constraint: JPG/PNG/PDF, max 5MB, max 3 file, validasi MIME type server-side)
- Logic approval paralel (routing otomatis berdasarkan role pengaju):
  - Staff → SPV (via `spv_id`) + HR
  - SPV → Kepala Divisi (via `divisions.kepala_divisi_id`) + HR
  - Kepala Divisi → Management + HR
- Halaman approval inbox (SPV, Kadiv, HR, Management)
- Kuota cuti: tampilan sisa saldo + riwayat history + manual adjustment oleh HR
- Auto-generate kuota cuti tahunan (prorata untuk karyawan baru)
- Validasi `requires_attachment` dari `request_types` — jika wajib, tidak bisa submit tanpa file
- Validasi `deducts_leave_quota` — hanya kurangi saldo jika flag true

**Acceptance Criteria:**
- [x] Form pengajuan menampilkan jenis cuti/izin dari `request_types` (hanya `is_active = true`)
- [x] Upload multi-file berfungsi (validasi format, ukuran, max file count)
- [x] Jenis yang `requires_attachment = true` wajib upload sebelum submit
- [x] Request di-route ke approver yang benar sesuai hierarki
- [x] Approval paralel: kedua approver harus approve → request approved
- [x] Salah satu reject → request rejected (dengan catatan)
- [x] Saldo cuti berkurang otomatis setelah approved (hanya jika `deducts_leave_quota = true`)
- [x] Cuti khusus tidak mengurangi kuota cuti tahunan
- [x] Karyawan bisa cancel request yang masih pending
- [x] HR bisa manual adjust saldo cuti (adjustment +/-)

**Deliverable:** staff bisa ajukan cuti/izin, atasan+HR bisa approve, saldo cuti otomatis terupdate. Status: COMPLETED.

---

## Sprint 6 — Lembur
**Tujuan:** atasan bisa assign lembur ke bawahan.
- Form pembuatan lembur (khusus role SPV/Kadiv/Management), pilih staff yang dilemburkan
- Validasi: hanya bisa memilih bawahan langsung/divisinya
- Approval flow mengikuti pola sprint 5 (berdasarkan role staff yang dilemburkan)
- Auto-skip: jika pembuat pengajuan = salah satu approver, auto-approved untuk level itu
- Halaman riwayat lembur (staff lihat, atasan kelola)

**Acceptance Criteria:**
- [x] SPV bisa buat lembur untuk staff di bawahnya
- [x] Kadiv bisa buat lembur untuk SPV di divisinya
- [x] Staff **tidak bisa** self-request lembur (form tidak muncul)
- [x] Auto-skip approval jika creator = approver
- [x] Approval flow berjalan sama dengan cuti/izin
- [x] Staff bisa lihat riwayat penugasan lembur

**Deliverable:** SPV bikin lembur untuk staff, approval jalan, staff bisa lihat. Status: COMPLETED.

---

## Sprint 7 — Employee Database & Kontrak
**Tujuan:** data karyawan lebih lengkap untuk kebutuhan HR.
- CRUD kontrak kerja (PKWT/PKWTT) dengan histori (bukan overwrite)
- CRUD riwayat jabatan/mutasi
- Reminder kontrak PKWT mendekati tanggal berakhir (H-30 dan H-7)
- Halaman profil karyawan lengkap (data pribadi, kontrak, jabatan, absensi, cuti)

**Acceptance Criteria:**
- [ ] HR bisa input/edit kontrak kerja (histori tersimpan)
- [ ] HR bisa input/edit riwayat mutasi jabatan
- [ ] Notifikasi muncul saat kontrak PKWT H-30 dan H-7
- [ ] Halaman profil menampilkan semua data karyawan secara terpusat

**Deliverable:** HR bisa kelola data kontrak, dapat notifikasi kontrak mau habis.

---

## Sprint 8 — Reporting Dashboard
**Tujuan:** HR & Management punya visibilitas data.
- Dashboard HR: rekap kehadiran/cuti/lembur/keterlambatan per divisi
- Dashboard Management: rekap yang sama + placeholder cost payroll
- Filter periode/divisi/karyawan
- Export ke Excel (opsional, nice-to-have)

**Acceptance Criteria:**
- [ ] Dashboard HR menampilkan rekap kehadiran, cuti, lembur, keterlambatan
- [ ] Dashboard Management menampilkan rekap + placeholder payroll cost
- [ ] Filter by periode, divisi, karyawan berfungsi
- [ ] Data sesuai RLS (HR lihat semua, SPV lihat timnya, dll)

**Deliverable:** dashboard reporting untuk kedua role siap dipakai.

---

## Sprint 9 — Integrasi Odoo
**Tujuan:** sinkronisasi manual ke Odoo.
- Tabel `odoo_sync_outbox` + logic pengumpulan data yang pending sync
- Tombol manual sync (HR) dengan preview sebelum kirim
- Riwayat sync (berhasil/gagal, retry, max 3 retries)
- Mapping payload ke model Odoo (menunggu konfirmasi nama tabel/model dari user)

**Acceptance Criteria:**
- [ ] Data attendance/leave/payroll yang baru otomatis masuk outbox
- [ ] HR bisa lihat preview data yang akan di-sync
- [ ] HR bisa klik sync, data ter-push ke Odoo
- [ ] Riwayat sync menampilkan status (berhasil/gagal/retry count)
- [ ] Gagal sync bisa di-retry (max 3x)

**Deliverable:** HR bisa klik satu tombol, data ter-push ke Odoo, ada riwayatnya.

---

## Sprint 10 — Payroll *(kondisional — mulai setelah formula final)*
**Tujuan:** hitung gaji otomatis.
- Input `payroll_rules` (rate BPJS, tarif telat, dll) via UI Management
- Engine hitung: base + tunjangan + lembur − BPJS − PPh21 − sanksi
- Generate payroll run per periode, breakdown per komponen
- Alur: draft → generated → review → finalized (locked)
- Slip gaji (view staff)

**Acceptance Criteria:**
- [ ] Management bisa input/edit payroll rules
- [ ] Management bisa generate payroll per periode
- [ ] Perhitungan otomatis: base, tunjangan, lembur, BPJS, PPh21, sanksi
- [ ] Management bisa review breakdown per karyawan
- [ ] Management bisa finalize (lock, tidak bisa diubah)
- [ ] Staff bisa lihat slip gaji sendiri
- [ ] Payroll yang di-finalize masuk audit_logs

**Deliverable:** Management bisa generate payroll, staff lihat slip gaji.

---

## Sprint 11 — Notifikasi Lengkap
**Tujuan:** sistem notifikasi in-app berjalan untuk semua event.
- Bell icon + badge unread count di header
- Halaman notifikasi (list, mark as read, mark all as read)
- Implementasi semua event trigger (sesuai matrix di PRD §11.2):
  - Pengajuan baru → approver
  - Pengajuan di-approve/reject → pengaju
  - Telat aktual → karyawan
  - Kontrak mendekati habis → HR
  - Kuota cuti menipis → karyawan
  - Import/sync selesai → HR
  - Akumulasi telat ≥ 4x → karyawan + HR

**Acceptance Criteria:**
- [ ] Bell icon menampilkan jumlah notifikasi unread
- [ ] Klik bell → halaman notifikasi
- [ ] Setiap event di matrix menghasilkan notifikasi ke penerima yang benar
- [ ] Mark as read berfungsi (individual dan bulk)
- [ ] Notifikasi real-time (Supabase Realtime / polling)

**Deliverable:** notifikasi in-app berjalan untuk semua event.

---

## Sprint 12 — Security Hardening & RLS Lengkap
**Tujuan:** keamanan production-grade.
- Review & lengkapi RLS di semua tabel (attendance, requests, request_approvals, leave_balances, payroll_runs, notifications, audit_logs)
- RBAC middleware di application layer (double-check, bukan hanya bergantung RLS)
- Validasi server-side untuk semua input (sanitize, constraint)
- Rate limiting di API endpoints sensitif (login, GPS submit)
- Content Security Policy headers
- Review Supabase service role usage (minimize)

**Acceptance Criteria:**
- [ ] Semua tabel dengan data personal punya RLS aktif
- [ ] Role X tidak bisa akses data role Y (test per role)
- [ ] Input validation berjalan di server-side
- [ ] Rate limiting aktif di endpoint sensitif
- [ ] Security checklist passed (manual review)

**Deliverable:** keamanan sistem siap untuk production.

---

## Sprint 13 — PWA Offline & Polish
**Tujuan:** pengalaman PWA yang solid.
- PWA offline handling: queue submit saat sinyal buruk → sync otomatis saat online
- Service worker: cache halaman utama, form absensi/pengajuan
- Offline indicator (banner "Anda sedang offline")
- UI/UX polish: loading states, empty states, error states
- Responsive testing (mobile 360px - desktop 1440px)
- Performance optimization (lazy loading, image optimization)

**Acceptance Criteria:**
- [ ] App bisa di-install sebagai PWA
- [ ] Form absensi/pengajuan bisa diisi saat offline → auto-submit saat online
- [ ] Offline indicator muncul saat koneksi terputus
- [ ] Semua halaman responsive (mobile & desktop)
- [ ] Load time < 3 detik di koneksi 3G (Lighthouse score ≥ 80)

**Deliverable:** PWA offline handling dan UI polish selesai.

---

## Sprint 14 — Data Migration, UAT & Go-Live
**Tujuan:** siap go-live.
- Script migrasi data existing (jika ada data karyawan/absensi lama)
- Validasi data migrasi (reconciliation report)
- UAT bareng tiap role (staff, SPV, HR, Management, admin) — dengan checklist
- Bug fixing dari hasil UAT
- Setup monitoring & alerting (error tracking)
- Dokumentasi user guide (minimal per role)
- Go-live checklist & rollback plan

**Acceptance Criteria:**
- [ ] Data existing berhasil dimigrasi (jika ada)
- [ ] UAT passed oleh semua role (sign-off)
- [ ] Bug kritis dari UAT sudah diperbaiki
- [ ] Monitoring aktif (error tracking)
- [ ] User guide tersedia (per role)
- [ ] Go-live checklist completed

**Deliverable:** sistem siap dipakai produksi.

---

## Ringkasan Timeline

| Sprint | Durasi | Fokus |
|---|---|---|
| Sprint 0 | 1 minggu | Fondasi |
| Sprint 1 | 2 minggu | Master Data, Onboarding, Jadwal Kerja |
| Sprint 2 | 2 minggu | Absensi: Import Fingerprint |
| Sprint 3 | 2 minggu | Absensi: GPS Fallback |
| Sprint 4 | 2 minggu | Telat Aktual & Izin Telat |
| Sprint 5 | 2 minggu | Cuti & Izin + Approval Flow |
| Sprint 6 | 2 minggu | Lembur |
| Sprint 7 | 2 minggu | Employee Database & Kontrak |
| Sprint 8 | 2 minggu | Reporting Dashboard |
| Sprint 9 | 2 minggu | Integrasi Odoo |
| Sprint 10 | 2 minggu | Payroll *(kondisional)* |
| Sprint 11 | 2 minggu | Notifikasi Lengkap |
| Sprint 12 | 2 minggu | Security Hardening |
| Sprint 13 | 2 minggu | PWA Offline & Polish |
| Sprint 14 | 2 minggu | Migration, UAT & Go-Live |

**Total: 14 sprint + Sprint 0 = ± 29 minggu (± 7 bulan)** solo developer.

---

## Catatan
- Sprint 9 & 10 posisinya fleksibel — bisa ditukar urutannya kalau Odoo lebih mendesak duluan daripada payroll, atau sebaliknya.
- Sprint 11-13 bisa dikerjakan paralel sebagian jika ada tambahan developer.
- Bisa dipercepat jika prioritas dipersempit: Odoo & payroll didorong ke fase 2 setelah MVP core (absensi + cuti + izin + lembur) jalan duluan → **MVP bisa go-live setelah Sprint 8 (± 4.5 bulan)**.
