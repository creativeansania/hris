# PRD — HRIS PWA (Absensi, Cuti, Izin, Lembur & Payroll)

**Status:** Draft v3
**Stack:** Next.js + Supabase (PWA)
**Last updated:** 2026-09-17

---

## 1. Latar Belakang & Tujuan

Perusahaan saat ini membutuhkan sistem HRIS berbasis web (PWA) untuk mengelola absensi, cuti, izin, lembur, dan payroll karyawan secara terpusat, multi-role, dan terintegrasi dengan sistem ERP (Odoo) yang sudah digunakan.

**Tujuan utama:**
- Mendigitalisasi proses pengajuan cuti/izin/lembur beserta alur approval berjenjang
- Mengonsolidasikan data absensi dari banyak mesin fingerprint (multi-cabang, multi-merek)
- Menyediakan basis data yang rapi untuk perhitungan payroll (base gaji, tunjangan, BPJS, PPh21, lembur, sanksi)
- Menyediakan dashboard reporting untuk HR & Management
- Sinkronisasi data ke Odoo tanpa kehilangan visibilitas data di sistem HRIS sendiri

---

## 2. Role & Hak Akses

| Role | Ringkasan Tanggung Jawab |
|---|---|
| **Admin** | Kontrol penuh sistem: provisioning & mapping karyawan (divisi/atasan/role), kelola lokasi kantor, settings sistem. **Di luar hierarki approval.** |
| **Management** | Approval level tertinggi (dari Kepala Divisi), **pemilik proses payroll** (generate/approve/lihat detail), reporting perusahaan. |
| **HR** | Approve semua pengajuan (paralel di semua level), import data absensi fingerprint, kelola data karyawan/kontrak/kuota cuti, kelola kalender libur & jam kerja/shift, reporting operasional, sync Odoo. |
| **Kepala Divisi** | Approve pengajuan dari SPV di divisinya, dapat membuat pengajuan lembur untuk SPV. |
| **SPV** | Approve pengajuan dari staff timnya, **wajib** membuat pengajuan lembur untuk staff (staff tidak bisa self-request lembur). |
| **Staff** | Mengajukan cuti/izin, menerima penugasan lembur dari atasan, melihat riwayat & status pengajuan sendiri. |

---

## 3. Autentikasi & Onboarding

- Login **hanya** via Google OAuth — tidak ada email/password.
- Pola **pre-provision + claim**:
  1. Admin input data karyawan baru (nama, email Google, NIK, divisi, atasan, role) → status `pending_claim`.
  2. Karyawan login Google pertama kali → sistem mencocokkan email → akun terklaim, status `active`.
  3. Email tidak cocok dengan data manapun → login ditolak, arahkan untuk menghubungi admin.

---

## 4. Modul: Absensi

### 4.1 Sumber Utama — Fingerprint (Multi-cabang, Multi-merek)
- HR mengunggah file export dari mesin fingerprint (format bervariasi per merek; contoh yang sudah diverifikasi: gaya eSSL/ZKTeco dengan kolom *Emp No., Name, Date, Clock In/Out, Late, Early, Absent, OT Time, Work Time, Department*, dll).
- Sistem melakukan matching baris data ke karyawan (via ID/AC-No. mesin ↔ `fingerprint_ac_no` karyawan).
- Kolom yang sudah dihitung mesin (Late, Early, Absent, OT Time) langsung dipetakan — tidak dihitung ulang.
- Baris dengan tanggal yang belum terjadi (future rows bawaan mesin) diabaikan saat import.
- Preview data sebelum konfirmasi import, dengan highlight ID yang tidak match / anomali.
- **Duplikasi handling:** Jika data fingerprint di-upload ulang untuk periode yang sudah ada, sistem menampilkan konfirmasi — pilihan: skip duplikat, atau overwrite data lama.

### 4.2 Fallback — GPS via App
Dipakai saat karyawan berada di lokasi kerja yang **tidak memiliki mesin fingerprint** (bukan untuk WFH saja — mencakup semua cabang: Banceuy, Cipadung, Gedebage, Bekton, Raden Mochtar, dan lokasi lain yang terdaftar).

- Sistem menyimpan koordinat setiap lokasi kantor/cabang (`office_locations`, multi-row).
- Saat submit, sistem menghitung jarak koordinat HP terhadap **semua** lokasi terdaftar (dihitung di server, bukan client).
- Masuk radius (default 500m, dapat disesuaikan per lokasi) salah satu lokasi → **auto-accept**, tanpa approval.
- Di luar radius semua lokasi terdaftar → `pending_review` (kasus yang diharapkan jarang terjadi karena lokasi resmi sudah lengkap terdaftar).
- Lapisan proteksi tambahan (karena fitur serupa pernah di-abuse di project lain, dan foto tidak dapat digunakan):
  - Validasi `accuracy` dari Geolocation API (tolak jika akurasi terlalu rendah/tidak wajar)
  - Perhitungan jarak dilakukan di server, tidak bisa dimanipulasi dari client
  - Log lengkap (koordinat, akurasi, timestamp server, device info) untuk audit trail

**Error handling GPS:**

| Kondisi | Perilaku Sistem |
|---|---|
| GPS dimatikan user | Tampilkan pesan error: "Aktifkan lokasi untuk clock-in", tidak bisa submit |
| Timeout (> 15 detik) | Tampilkan pesan timeout, tombol retry |
| Akurasi > 100 meter | Tolak otomatis, minta user pindah ke area terbuka / tunggu GPS lock |
| Mock location terdeteksi | Tolak, log sebagai potensi fraud, notifikasi ke HR |
| Browser tidak support Geolocation | Tampilkan pesan: "Browser tidak mendukung lokasi, gunakan browser lain" |

### 4.3 Koreksi Data Absensi
- Jika data fingerprint salah (misal: lupa clock-out, mesin error), **HR** dapat membuat koreksi.
- Setiap koreksi menyimpan: data original, data koreksi, alasan, siapa yang koreksi, kapan.
- Koreksi bersifat **non-destructive** — data asli tetap tersimpan, koreksi di-layer di atas.

### 4.4 Telat Aktual vs Izin Telat (Berbeda Konsep)
- **Telat aktual**: terdeteksi dari data fingerprint setelah kejadian. Karyawan diminta mengisi alasan (dokumentasi), **tidak memerlukan approval**. Masuk akumulasi keterlambatan.
- **Izin telat**: pengajuan proaktif **sebelum jam masuk sesuai jadwal kerja karyawan** (default 08:00, mengacu `work_schedules`), di hari yang sama, melalui approval flow normal (SPV+HR). Jika disetujui, menutupi status telat yang muncul di data fingerprint hari itu (tidak masuk hitungan sanksi).

---

## 5. Modul: Cuti & Izin

### 5.1 Jenis Pengajuan

Jenis pengajuan disimpan sebagai **reference table (`request_types`)** di database, bukan hardcode enum. Admin/HR dapat menambahkan, mengubah nama, atau menonaktifkan jenis pengajuan tanpa memerlukan perubahan kode atau migrasi database.

Setiap jenis pengajuan memiliki atribut:
- `code` — identifier unik (misal: `cuti_menikah`)
- `category` — kategori structural: `cuti`, `izin`, atau `lembur` (menentukan flow approval & validasi)
- `name` — nama tampilan
- `default_duration_days` — durasi default (null = flexible)
- `requires_attachment` — apakah wajib upload dokumen
- `deducts_leave_quota` — apakah mengurangi saldo cuti tahunan
- `is_active` — bisa dinonaktifkan tanpa dihapus

**Data awal (seed):**

| Kode | Jenis | Kuota/Durasi | Dokumen Pendukung | Kurangi Saldo Cuti? |
|---|---|---|---|---|
| `cuti_tahunan` | Cuti Tahunan | 12 hari/tahun (configurable) | Tidak wajib | ✅ Ya |
| `cuti_menikah` | Cuti Menikah | 3 hari | Undangan/surat nikah | ❌ Tidak |
| `cuti_menikahkan_anak` | Cuti Menikahkan Anak | 2 hari | Undangan | ❌ Tidak |
| `cuti_khitanan_baptis` | Cuti Khitanan/Baptis Anak | 2 hari | Surat keterangan | ❌ Tidak |
| `cuti_istri_melahirkan` | Cuti Istri Melahirkan/Keguguran | 2 hari | Surat dokter/RS | ❌ Tidak |
| `cuti_duka_serumah` | Cuti Duka (Keluarga Serumah) | 2 hari | Surat kematian | ❌ Tidak |
| `cuti_duka_keluarga` | Cuti Duka (Orang Tua/Mertua/Anak/Menantu) | 2 hari | Surat kematian | ❌ Tidak |
| `izin_telat` | Izin Telat (lihat §4.4) | — | Tidak wajib | ❌ Tidak |
| `izin_pulang_cepat` | Izin Pulang Cepat | — | Tidak wajib | ❌ Tidak |
| `izin_sakit` | Izin Sakit | — | Surat dokter (wajib jika > 1 hari) | ❌ Tidak |
| `izin_urusan_keluarga` | Izin Urusan Keluarga | — | Tidak wajib | ❌ Tidak |
| `izin_lainnya` | Izin Lainnya | — | Opsional | ❌ Tidak |
| `lembur` | Lembur | — | Tidak wajib | ❌ Tidak |

> **Catatan:** Jenis dan durasi cuti khusus mengacu UU Ketenagakerjaan No. 13/2003 Pasal 93 ayat (4). Jika perusahaan ingin menambah jenis cuti baru (misal: cuti melahirkan, cuti haji), Admin cukup menambahkan entry baru di tabel `request_types` tanpa perubahan kode.

### 5.2 Alur Approval Berjenjang

Berdasarkan **role karyawan yang bersangkutan** (bukan siapa yang input):

| Role Karyawan | Approver 1 (hierarki) | Approver 2 (paralel) | Cara lookup Approver 1 |
|---|---|---|---|
| **Staff** | SPV-nya | HR | `employees.spv_id` |
| **SPV** | Kepala Divisi | HR | `divisions.kepala_divisi_id` (dari `division_id` karyawan) |
| **Kepala Divisi** | Management | HR | Salah satu user dengan `role = 'management'` |

- Approval bersifat **paralel** — kedua approver harus menyetujui (bukan berurutan).
- Jika salah satu reject → status seluruh request = `rejected`.
- HR sebagai approver paralel di **semua** level.

### 5.3 Kuota Cuti & Carry-Over

- Kuota cuti tahunan default: **12 hari/tahun** (configurable).
- **Carry-over policy:** sisa cuti tahunan yang tidak digunakan **hangus** di akhir tahun (31 Desember). Tidak ada carry-over kecuali diubah via konfigurasi.
- Cuti khusus **tidak mengurangi** kuota cuti tahunan — merupakan hak terpisah sesuai UU.
- Kuota cuti tahunan di-generate otomatis setiap awal tahun untuk karyawan `active`.
- Karyawan baru: kuota prorata berdasarkan bulan bergabung (join setelah tanggal 15 = bulan itu tidak dihitung).

### 5.4 Fitur Pendukung
- Tampilan sisa kuota cuti real-time
- Riwayat history cuti per karyawan
- Upload dokumen pendukung (foto/PDF) — lihat §14 untuk constraint

---

## 6. Modul: Lembur

- **Wajib dibuat oleh atasan** (SPV membuat untuk staff; Kepala Divisi membuat untuk SPV; Management membuat untuk Kepala Divisi) — tidak ada self-request oleh staff.
- Approval flow **identik** dengan alur cuti/izin (ditentukan dari role karyawan yang dilemburkan, bukan dari siapa yang membuat pengajuan).
- **Auto-skip rule:** Jika approver di suatu level kebetulan sama dengan pembuat pengajuan, step tersebut otomatis tercatat approved (tidak perlu meng-approve diri sendiri).

---

## 7. Modul: Sanksi & Akumulasi Keterlambatan

### 7.1 Akumulasi Keterlambatan
- Dihitung **per bulan** (reset setiap awal bulan).
- Sumber: data telat aktual dari fingerprint yang **tidak ditutupi** izin telat yang disetujui.
- Threshold: **> 0 menit** dari jam masuk = telat (sesuai `work_schedules` karyawan).

### 7.2 Tingkat Sanksi

| Akumulasi per Bulan | Sanksi |
|---|---|
| 1–3 kali telat | Peringatan otomatis (notifikasi in-app) |
| 4–6 kali telat | Potongan gaji (rate configurable via `payroll_rules`, default: Rp 25.000/kejadian) |
| > 6 kali telat | Potongan gaji + notifikasi ke HR untuk tindak lanjut manual (SP) |

### 7.3 Izin Tanpa Persetujuan
- Karyawan yang tidak masuk tanpa pengajuan izin yang disetujui → dicatat sebagai **absen tanpa keterangan**.
- Potongan gaji: **1/22 base gaji per hari** absen tanpa keterangan (configurable).

> **Catatan:** Semua rate/threshold di atas disimpan sebagai konfigurasi (`payroll_rules`), bukan hardcode. Management/HR dapat menyesuaikan.

---

## 8. Modul: Employee Database & Kontrak

**Data pribadi karyawan:**
- Identitas: nama, NIK KTP, NPWP, tempat & tanggal lahir, jenis kelamin, agama, alamat, status pernikahan (enum: belum kawin/kawin/cerai hidup/cerai mati), jumlah tanggungan
- Kontak: email (Google), no. telepon, kontak darurat (nama + no. telepon)
- Keuangan: nama bank, nomor rekening, nama pemilik rekening — untuk transfer payroll
- Organisasi: role, divisi, atasan (SPV), jadwal kerja, ID fingerprint, foto

**Riwayat:**
- Riwayat kontrak kerja (PKWT/PKWTT) — historis, bukan overwrite, dengan reminder saat kontrak PKWT mendekati tanggal berakhir
- Riwayat jabatan/mutasi divisi — historis

---

## 9. Modul: Payroll (Kewenangan Management)

> **Status: tertunda.** Formula & rate detail masih menunggu diskusi dengan atasan pengguna. Bagian ini berisi kerangka yang sudah disepakati sejauh ini; detail akan disusul.

**Komponen yang telah disepakati masuk cakupan:**
- Base gaji — dari hari kerja & jam kerja aktual
- Tunjangan (jabatan, transport, makan, komunikasi, dll) & BPJS (Kesehatan + Ketenagakerjaan)
- PPh21 (pajak penghasilan) — mengacu PTKP & tarif progresif, metode awal yang disarankan: gross
- Lembur — dihitung dari data lembur yang disetujui
- Sanksi — dari akumulasi keterlambatan & izin tanpa persetujuan (lihat §7)

**Rate/formula (persentase BPJS, tarif potongan telat, dll) disimpan sebagai konfigurasi**, bukan hardcode, agar Management/HR dapat menyesuaikan tanpa perubahan kode.

**Alur payroll:**
1. Management men-generate payroll untuk periode tertentu → status `draft`
2. Sistem menghitung otomatis semua komponen → status `generated`
3. Management mereview breakdown per karyawan
4. Management approve/finalize → status `finalized` (locked, tidak bisa diubah)
5. Staff dapat melihat slip gaji masing-masing

---

## 10. Modul: Reporting Dashboard

| Role | Isi Reporting |
|---|---|
| HR | Rekap kehadiran, cuti, lembur, akumulasi keterlambatan — per divisi/karyawan (fokus operasional) |
| Management | Rekap yang sama + payroll cost & breakdown per periode (fokus angka besar/tren) |

---

## 11. Modul: Notifikasi

### 11.1 Channel
- **MVP:** In-app notification (bell icon, badge unread count)
- **Fase 2 (opsional):** Email notification, push notification PWA

### 11.2 Event Matrix

| Event | Penerima | Pesan |
|---|---|---|
| Pengajuan baru (cuti/izin) | Approver (SPV/Kadiv + HR) | "Pengajuan {type} dari {nama} menunggu persetujuan Anda" |
| Pengajuan baru (lembur) | Karyawan yang dilemburkan + Approver | "Anda ditugaskan lembur oleh {nama_atasan}" / "Pengajuan lembur menunggu persetujuan" |
| Pengajuan di-approve | Pengaju / karyawan terkait | "Pengajuan {type} Anda telah disetujui" |
| Pengajuan di-reject | Pengaju / karyawan terkait | "Pengajuan {type} Anda ditolak: {alasan}" |
| Telat aktual terdeteksi | Karyawan yang telat | "Anda tercatat telat pada {tanggal}. Silakan isi alasan" |
| Kontrak PKWT mendekati habis (30 hari) | HR | "Kontrak {nama} akan berakhir pada {tanggal}" |
| Kontrak PKWT mendekati habis (7 hari) | HR + Management | "Kontrak {nama} akan berakhir dalam 7 hari" |
| Kuota cuti menipis (≤ 2 hari) | Karyawan | "Sisa cuti tahunan Anda tinggal {sisa} hari" |
| Import fingerprint selesai | HR (yang upload) | "Import absensi selesai: {n} record berhasil, {m} gagal match" |
| Odoo sync selesai | HR (yang trigger) | "Sinkronisasi Odoo selesai: {n} berhasil, {m} gagal" |
| Payroll di-generate | Management | "Payroll periode {periode} telah di-generate, menunggu review" |
| Akumulasi telat ≥ 4x/bulan | Karyawan + HR | "Akumulasi keterlambatan bulan ini: {n} kali. Potongan gaji berlaku" |
| GPS absensi pending review | HR | "Absensi GPS {nama} di luar radius, menunggu review" |

### 11.3 Pengaturan
- Notifikasi in-app tidak bisa dimatikan (selalu aktif).
- Notifikasi sudah dibaca → tandai `is_read = true`, tidak dihapus (retained untuk history).

---

## 12. Integrasi Odoo

- Sinkronisasi **manual**, dipicu tombol oleh HR — bukan otomatis/terjadwal (cron).
- Data yang menunggu sync tercatat di outbox; HR dapat melihat preview sebelum kirim, dan riwayat sync (berhasil/gagal, dapat di-retry).
- Data tetap sepenuhnya dapat dilihat di sistem HRIS sendiri setelah sync (Odoo bukan satu-satunya tempat data tersimpan).
- Nama model/tabel Odoo tujuan: **menyusul**, menunggu konfirmasi dari pengguna.

---

## 13. Kalender Libur & Jam Kerja

- Dikelola oleh **HR**.
- **Jadwal kerja** distrukturkan dua level:
  - **Grup jadwal** (`work_schedule_groups`): "Reguler Senin-Sabtu", "Shift Pagi", dll — karyawan di-assign ke satu grup
  - **Detail per hari** (`work_schedule_days`): jam masuk, jam pulang, jam istirahat per hari dalam satu grup
- Jam kerja saat ini: Senin–Jumat 08:00–17:00 (istirahat 12:00–13:00), Sabtu 08:00–14:00
- Mendukung **multi-shift** ke depannya — cukup buat grup jadwal baru, assign karyawan
- **Kalender libur** harus di-setup sebelum modul absensi digunakan, karena logic telat dan hari kerja bergantung pada data ini
- Tipe hari libur: `national` (nasional), `company` (perusahaan), `cuti_bersama`

---

## 14. Upload & Attachment

Setiap pengajuan dapat memiliki **beberapa file attachment** (multi-file), disimpan di tabel terpisah `request_attachments` — bukan satu kolom URL.

### 14.1 Constraint

| Parameter | Nilai |
|---|---|
| Format yang diterima | JPG, JPEG, PNG, PDF |
| Maksimum ukuran file | 5 MB per file (configurable via `system_settings`) |
| Maksimum file per pengajuan | 3 file (configurable via `system_settings`) |
| MIME type validation | Server-side: `image/jpeg`, `image/png`, `application/pdf` |
| Storage | Supabase Storage (bucket per tipe: `leave-attachments`, `attendance-imports`) |
| Retensi | Tidak dihapus otomatis (retained selama karyawan aktif + 2 tahun setelah resign) |

### 14.2 Jenis Upload

| Konteks | Siapa | Format |
|---|---|---|
| Dokumen cuti khusus (surat nikah, surat kematian, dll) | Karyawan pengaju | JPG, PNG, PDF |
| Surat dokter (izin sakit > 1 hari) | Karyawan pengaju | JPG, PNG, PDF |
| File export fingerprint | HR | XLS, XLSX, CSV |

---

## 15. Edge Cases & Error Handling

### 15.1 Mutasi / Pindah Divisi

| Skenario | Handling |
|---|---|
| Karyawan pindah divisi saat ada pengajuan `pending` | Pengajuan yang sudah `pending` tetap menggunakan approver lama. Pengajuan baru mengikuti divisi baru |
| SPV pindah divisi | Staff di bawahnya harus di-reassign ke SPV baru oleh Admin. Approval pending tetap di SPV lama |

### 15.2 SPV / Atasan Resign atau Nonaktif

| Skenario | Handling |
|---|---|
| SPV resign, ada approval pending | HR mendapat notifikasi. Admin harus assign SPV baru. HR dapat mengambil alih approval yang tertunda |
| Kepala Divisi kosong | Pengajuan SPV menunggu sampai Admin assign Kepala Divisi baru, atau HR ambil alih |

### 15.3 Upload Fingerprint Tumpang Tindih

| Skenario | Handling |
|---|---|
| Upload data untuk tanggal yang sudah ada | Preview menunjukkan data duplikat dengan highlight kuning. Pilihan: skip (biarkan data lama) atau overwrite |
| Karyawan punya 2 record clock-in di tanggal sama (mesin berbeda) | Tampilkan di preview sebagai anomali. HR pilih mana yang dipakai, atau gabungkan (clock-in dari mesin A, clock-out dari mesin B) |

### 15.4 Concurrency & Race Condition

| Skenario | Handling |
|---|---|
| Dua approver approve/reject bersamaan | Gunakan row-level locking. Decision pertama yang masuk menang, yang kedua mendapat notifikasi bahwa status sudah berubah |
| Karyawan membatalkan pengajuan saat approver sedang approve | Cancelled menang jika belum ada decision. Jika sudah ada partial decision, tampilkan warning ke karyawan |

---

## 16. Non-Functional Requirements

- **PWA**: installable, basic offline capability (form absensi/pengajuan dapat di-queue saat sinyal buruk lalu sync)
- **Keamanan**: Row Level Security (RLS) di Supabase — setiap role hanya bisa mengakses data sesuai cakupannya (diri sendiri / bawahan / semua)
- **Audit trail**: log perubahan penting (approval, import absensi, sync Odoo, perubahan data karyawan, koreksi absensi) untuk keperluan investigasi/dispute — via tabel `audit_logs`
- **Performance**: halaman harus load < 3 detik pada koneksi 3G
- **Responsive**: mendukung desktop (1024px+) dan mobile (360px+)
- **Browser support**: Chrome (utama), Edge, Safari (iOS untuk PWA)

---

## 17. Di Luar Cakupan MVP (Belum Diputuskan/Ditunda)

- Detail formula payroll final (menunggu diskusi dengan atasan)
- Reimbursement/klaim, Employee Self-Service lanjutan, performance management, recruitment/ATS, training — belum dibahas/diputuskan masuk scope
- Mapping model/tabel Odoo spesifik
- Email / push notification (MVP: in-app only)
- Carry-over cuti antar tahun (MVP: hangus, bisa diaktifkan via config)

---

## 18. Open Questions

- [ ] Nama model/tabel Odoo tujuan sinkronisasi
- [ ] Formula & rate final payroll (base, lembur, sanksi, BPJS, PPh21)
- [x] ~~Radius per lokasi kantor — apakah 500m berlaku sama untuk semua cabang atau bisa berbeda-beda~~ → **Sudah dijawab**: configurable per lokasi (`radius_meters` di `office_locations`)
- [ ] Apakah ada kebutuhan multi-shift (misal: shift malam)?
- [ ] Apakah cuti tahunan prorata untuk karyawan baru sudah sesuai kebijakan perusahaan?
- [ ] Rate sanksi keterlambatan (default Rp 25.000/kejadian) — sudah sesuai?
- [ ] Retensi data: berapa lama data karyawan yang sudah resign disimpan?
