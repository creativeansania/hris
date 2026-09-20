# Panduan Pengguna Sistem HRIS (User Guide)

Selamat datang di Sistem Informasi Manajemen Sumber Daya Manusia (HRIS) PT Kanti Sehati Sukses. HRIS ini dibangun berbasis Progressive Web Application (PWA) dengan dukungan sinkronisasi offline dan integrasi langsung ke sistem ERP Odoo.

---

## Daftar Isi
1. [Panduan Karyawan (Staff)](#1-panduan-karyawan-staff)
2. [Panduan Supervisor (SPV)](#2-panduan-supervisor-spv)
3. [Panduan Kepala Divisi (Kadiv)](#3-panduan-kepala-divisi-kadiv)
4. [Panduan HR Administrator](#4-panduan-hr-administrator)
5. [Panduan Management / Direksi](#5-panduan-management--direksi)
6. [Panduan IT Administrator](#6-panduan-it-administrator)
7. [Fitur PWA Offline & Instalasi Aplikasi](#7-fitur-pwa-offline--instalasi-aplikasi)

---

## 1. Panduan Karyawan (Staff)

### 1.1 Login & Aktivasi Akun
1. Buka alamat sistem HRIS pada browser ponsel atau laptop Anda.
2. Klik tombol **"Masuk dengan Google"** (`Google OAuth`).
3. Pilih akun Google perusahaan (`@kantiss.com`) atau email yang telah didaftarkan oleh HRGA.
4. Pada login pertama, sistem akan mencocokkan email Anda dan mengaktifkan profil karyawan secara otomatis (`status: active`).

### 1.2 Presensi GPS (Clock In & Clock Out)
1. Akses menu **"Clock In / Out (GPS)"** di bilah menu samping atau tombol cepat di Dashboard.
2. Izinkan browser mengakses lokasi perangkat (*Allow Geolocation*).
3. Indikator radius kantor akan mendeteksi posisi Anda terhadap kantor cabang/pusat:
   - **Dalam Radius Hijau**: Jarak < 100m dari koordinat kantor. Klik tombol **"Clock In Sekarang"** → Langsung diterima otomatis (`auto_valid`).
   - **Di Luar Radius (Dinas Luar)**: Jika Anda sedang bertugas di luar kantor, masukkan keterangan penugasan/alasan dinas luar, lampirkan foto selfie/kegiatan bila diminta, lalu klik **"Submit Presensi"** → Presensi masuk ke antrean verifikasi HR (`pending_review`).
4. Saat jam pulang kerja tiba, ulangi langkah di atas dan klik **"Clock Out Sekarang"**.

### 1.3 Pengisian Alasan Keterlambatan Aktual
Jika Anda terlambat berdasarkan rekaman mesin fingerprint atau GPS:
1. Buka menu **"Presensi Saya"**.
2. Pada baris tanggal yang ditandai badge merah **"Terlambat"**, klik tombol **"Isi Alasan"**.
3. Masukkan keterangan kendala (misal: *Hujan deras, perbaikan jalan raya, atau kendala operasional*).
4. Klik **"Simpan Alasan"**. Alasan Anda langsung tercatat tanpa membutuhkan proses approval berbelit.

### 1.4 Pengajuan Cuti, Izin & Lembur Mandiri
1. Buka menu **"Pengajuan Cuti / Izin"**.
2. Di bagian atas terlihat sisa kuota Cuti Tahunan Anda (standar 12 hari/tahun).
3. Klik tombol **"Buat Pengajuan Baru"**:
   - Pilih jenis: Cuti Tahunan, Cuti Khusus (Menikah, Melahirkan, Duka), Izin Telat, Izin Pulang Cepat, atau Izin Sakit.
   - Tentukan rentang tanggal mulai dan tanggal selesai.
   - Masukkan alasan pengajuan dan upload bukti dokumen (misal: surat keterangan dokter).
4. Klik **"Kirim Pengajuan"**. Notifikasi otomatis terkirim ke atasan langsung Anda (SPV).

### 1.5 Melihat & Mengunduh Slip Gaji
1. Buka menu **"Payroll"** dan pilih tab **"Slip Gaji Saya"**.
2. Pilih periode bulan penggajian yang ingin dilihat.
3. Rincian penerimaan (Gaji Pokok, Tunjangan Jabatan/Makan/Transport, Uang Lembur) dan potongan (PPh 21, BPJS, Potongan Terlambat) akan ditampilkan secara transparan.
4. Klik **"Cetak Slip Gaji"** untuk mengunduh dokumen PDF resmi.

---

## 2. Panduan Supervisor (SPV)

### 2.1 Menyetujui / Menolak Pengajuan Tim Bawahan
1. Buka menu **"Approval Pengajuan"**.
2. Tab **"Menunggu Persetujuan"** menampilkan seluruh pengajuan cuti, izin, dan klaim lembur dari anggota tim Anda.
3. Klik pada baris pengajuan untuk memeriksa detail tanggal, kuota cuti anggota, dan dokumen pendukung.
4. Pilih tindakan:
   - **Setujui (Approve)**: Masukkan catatan apresiasi/persetujuan (opsional) → Pengajuan diteruskan ke Kepala Divisi atau HR.
   - **Tolak (Reject)**: Wajib memasukkan alasan penolakan agar bawahan dapat melakukan perbaikan pengajuan.

### 2.2 Membuat Penugasan Lembur (Surat Perintah Lembur / SPL)
1. Buka menu **"Lembur"**.
2. Klik tombol **"Buat Penugasan Lembur"**.
3. Pilih anggota tim yang ditugaskan, tanggal lembur, estimasi jam mulai dan selesai, serta uraian pekerjaan.
4. Klik **"Terbitkan Penugasan"**. Karyawan yang bersangkutan akan menerima notifikasi dan penugasan lembur tercatat resmi sebagai dasar kalkulasi payroll.

---

## 3. Panduan Kepala Divisi (Kadiv)

### 3.1 Approval Tingkat Dua & Hierarki Paralel
1. Kepala Divisi bertindak sebagai approver tingkat kedua untuk pengajuan cuti berdurasi panjang (> 3 hari) atau pengajuan langsung dari para Supervisor.
2. Akses menu **"Approval Pengajuan"** → Tinjau pengajuan yang telah divalidasi oleh SPV.
3. Berikan persetujuan akhir sebelum diproses oleh HRGA.

### 3.2 Laporan & Analitik Kinerja Divisi
1. Buka menu **"Reporting"**.
2. Amati visualisasi metrik divisi: rasio kehadiran per departemen, akumulasi jam lembur tim, dan tingkat keterlambatan.
3. Ekspor data berkala ke format Excel/CSV untuk evaluasi manajerial bulanan.

---

## 4. Panduan HR Administrator

### 4.1 Import Data Presensi Mesin Fingerprint
1. Buka menu **"Manajemen Presensi"** → Tab **"Import Fingerprint"**.
2. Download template file Excel jika diperlukan.
3. Tarik atau pilih file rekaman presensi dari mesin Solution / ZKTeco (`.xlsx` atau `.csv`).
4. Klik **"Unggah & Analisis"**:
   - Sistem akan memetakan nomor AC/PIN mesin ke database karyawan.
   - Baris duplikat atau anomali akan di-highlight kuning/merah.
5. Klik **"Konfirmasi Import"** untuk memasukkan data ke tabel absensi dan memicu auto-notifikasi keterlambatan.

### 4.2 Verifikasi Presensi GPS Dinas Luar
1. Buka menu **"Manajemen Presensi"** → Tab **"Review GPS"**.
2. Periksa entri clock-in berstatus `pending_review` (di luar radius geofence kantor).
3. Evaluasi koordinat peta, akurasi GPS, dan foto penugasan karyawan.
4. Klik **"Setujui Dinas Luar"** atau **"Tolak"**.

### 4.3 Manajemen Data Karyawan & Kontrak PKWT/PKWTT
1. Buka menu **"Data Karyawan"**.
2. Tambah karyawan baru atau pilih profil karyawan existing.
3. Tab **"Informasi Pribadi"**: Atur NIK, NPWP, Bank, dan Kontak Darurat.
4. Tab **"Pekerjaan & Hirarki"**: Tentukan Divisi, Atasan Langsung (SPV), dan Role akses.
5. Tab **"Kontrak Kerja"**: Catat tanggal mulai, tanggal berakhir PKWT, dan notifikasi peringatan H-30 sebelum kontrak berakhir.

### 4.4 Sinkronisasi Data ke Odoo ERP
1. Buka menu **"Integrasi Odoo"**.
2. Periksa status antrean outbox (*Pending*, *Synced*, *Failed*).
3. Klik tombol **"Sync Sekarang"** untuk mengirimkan data absensi tervalidasi dan cuti yang disetujui langsung ke database Odoo via JSON-RPC.

---

## 5. Panduan Management / Direksi

### 5.1 Executive Dashboard
1. Buka menu **"Dashboard"** atau **"Reporting"**.
2. Tinjau rangkuman eksekutif:
   - Total Tenaga Kerja Aktif.
   - Tingkat Kehadiran Perusahaan Harian & Bulanan.
   - Total Alokasi Biaya Lembur.
   - Distribusi headcount per divisi.

### 5.2 Review & Finalisasi Periode Gaji (Payroll)
1. Buka menu **"Payroll"** → Tab **"Periode Gaji"**.
2. Pilih draf periode penggajian bulan berjalan (misal: *September 2026*).
3. Klik **"Hitung Otomatis"** untuk memproses absensi, keterlambatan, dan lembur berbasis formula Kemenaker.
4. Tinjau total bruto, potongan, dan take-home-pay perusahaan.
5. Jika seluruh angka telah tervalidasi, klik **"Kunci & Finalisasi Periode"**. Seluruh data menjadi *read-only* demi kepatuhan audit.

---

## 6. Panduan IT Administrator

### 6.1 Pemantauan Kesehatan Sistem (Health Monitoring)
1. Akses endpoint diagnostik pada browser: `https://domain-hris/api/health` atau via menu **"UAT & Go-Live"**.
2. Periksa metrik:
   - Konektivitas dan latensi database Supabase (< 800ms).
   - Status live bridge JSON-RPC ke Odoo SaaS.
   - Jumlah antrean outbox sinkronisasi.

### 6.2 Konfigurasi Master Kantor & Jadwal Kerja
1. Buka menu **"Pengaturan Sistem"**:
   - **Lokasi Kantor**: Tambahkan cabang kantor baru dengan latitude, longitude, dan radius toleransi (meter).
   - **Jadwal Kerja**: Atur jam masuk, jam pulang, toleransi telat, dan jam istirahat untuk masing-masing grup shift.
   - **Hari Libur**: Masukkan kalender libur nasional tahun berjalan.

### 6.3 Audit Security Log
1. Buka menu **"Pengaturan Sistem"** → **"Audit Log"**.
2. Seluruh mutasi data sensitif (perubahan gaji, delete record, penetapan role, dan percobaan unauthorized) tercatat lengkap dengan identitas pelaku dan IP address.

---

## 7. Fitur PWA Offline & Instalasi Aplikasi

### 7.1 Cara Instalasi di Smartphone (Android / iOS)
- **Android (Chrome)**: Buka website HRIS, klik ikon titik tiga di kanan atas → Pilih **"Tambahkan ke Layar Utama"** atau klik pop-up banner **"Instal HRIS App"**.
- **iPhone (Safari)**: Buka website HRIS, tekan tombol Share (kotak dengan panah ke atas) → Pilih **"Add to Home Screen"** (*Tambah ke Layar Utama*).

### 7.2 Bekerja dalam Keadaan Offline (Sinyal Buruk / Blank Spot)
1. Jika koneksi internet terputus, banner kuning **"Anda Sedang Offline"** akan muncul otomatis.
2. Anda **tetap dapat melakukan Clock In GPS** atau mengisi formulir pengajuan cuti/izin.
3. Data akan disimpan secara aman di memori lokal ponsel (IndexedDB).
4. Begitu perangkat kembali mendapatkan sinyal internet, sistem auto-sync engine akan mengirimkan data antrean ke server secara otomatis di latar belakang.
