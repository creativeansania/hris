# Approval Flow Reference — HRIS PWA

Dokumen ini menjelaskan secara detail alur approval untuk semua jenis pengajuan. Digunakan sebagai referensi saat implementasi logic routing approval.

---

## 1. Prinsip Dasar

1. **Approval ditentukan dari role karyawan yang bersangkutan**, bukan dari siapa yang membuat pengajuan.
2. **Approval bersifat paralel** — kedua approver harus menyetujui. Bukan berurutan.
3. **HR selalu menjadi approver paralel** di semua level.
4. **Auto-skip rule**: jika pembuat pengajuan kebetulan sama dengan salah satu approver, step tersebut otomatis tercatat approved.

---

## 2. Routing Table

### 2.1 Cuti & Izin (Self-Request)

```
Karyawan mengajukan sendiri → sistem tentukan approver berdasarkan role karyawan
```

| Role Karyawan | Approver Hierarki | Approver Paralel | Lookup |
|---|---|---|---|
| Staff | SPV-nya | HR | `employees.spv_id` |
| SPV | Kepala Divisi | HR | `divisions.kepala_divisi_id` WHERE `divisions.id = employee.division_id` |
| Kepala Divisi | Management | HR | Any employee WHERE `role = 'management'` |

### 2.2 Lembur (Request oleh Atasan)

```
Atasan membuat pengajuan untuk bawahan → approval berdasarkan role BAWAHAN (bukan atasan)
```

| Pembuat | Untuk Siapa | Approver Hierarki | Approver Paralel | Auto-Skip? |
|---|---|---|---|---|
| SPV | Staff | SPV (= pembuat) | HR | ✅ SPV auto-approved |
| Kepala Divisi | SPV | Kepala Divisi (= pembuat) | HR | ✅ Kadiv auto-approved |
| Management | Kepala Divisi | Management (= pembuat) | HR | ✅ Management auto-approved |

> **Catatan:** Karena auto-skip, efektif hanya HR yang perlu approve lembur.

---

## 3. State Machine: Request Status

```
                    ┌─────────────┐
                    │   pending    │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌───────────┐
        │ approved │ │ rejected │ │ cancelled │
        └──────────┘ └──────────┘ └───────────┘
```

**Transisi:**

| Dari | Ke | Trigger |
|---|---|---|
| `pending` | `approved` | Semua approver decision = `approved` |
| `pending` | `rejected` | Salah satu approver decision = `rejected` |
| `pending` | `cancelled` | Karyawan/pembuat membatalkan sebelum ada decision |
| `approved` | *(final)* | Tidak bisa diubah |
| `rejected` | *(final)* | Tidak bisa diubah |
| `cancelled` | *(final)* | Tidak bisa diubah |

---

## 4. Logic Detail (Pseudocode)

### 4.1 Saat Pengajuan Dibuat

```
function createRequest(requestTypeId, employeeId, createdById, ...data):
  // 1. Lookup request type (dari reference table, bukan enum)
  requestType = select * from request_types where id = requestTypeId

  // 2. Buat record request
  request = insert into requests(request_type_id: requestTypeId, ...)
  // 3. Tentukan approver berdasarkan role karyawan
  employee = getEmployee(employeeId)
  approvers = []
  switch employee.role:
    case 'staff':
      approvers.push({ id: employee.spv_id, role: 'spv' })
    case 'spv':
      division = getDivision(employee.division_id)
      approvers.push({ id: division.kepala_divisi_id, role: 'kepala_divisi' })
    case 'kepala_divisi':
      mgmt = getAnyEmployeeWithRole('management')
      approvers.push({ id: mgmt.id, role: 'management' })

  // HR sebagai approver paralel (ambil salah satu HR)
  hr = getAnyEmployeeWithRole('hr')
  approvers.push({ id: hr.id, role: 'hr' })

  // 3. Buat record approval untuk setiap approver
  for approver in approvers:
    decision = 'pending'

    // Auto-skip: jika pembuat = approver
    if approver.id == createdById:
      decision = 'approved'

    insert into request_approvals(
      request_id: request.id,
      approver_id: approver.id,
      approver_role: approver.role,
      decision: decision
    )

  // 5. Cek apakah semua sudah auto-approved (misal: lembur)
  checkAndFinalizeRequest(request.id, requestType)

  // 6. Kirim notifikasi ke approver yang masih pending
  notifyPendingApprovers(request.id)
```

### 4.2 Saat Approver Membuat Keputusan

```
function processDecision(requestId, approverId, decision, note):
  // 1. Update approval record
  update request_approvals
    set decision = decision, note = note, decided_at = now()
    where request_id = requestId and approver_id = approverId

  // 2. Cek apakah semua sudah decide
  allApprovals = select * from request_approvals where request_id = requestId
  
  if any approval.decision == 'rejected':
    // Satu reject = seluruh request rejected
    update requests set status = 'rejected', decided_at = now()
    notify employee: "Pengajuan Anda ditolak"
    
  else if all approvals.decision == 'approved':
    // Semua approve = request approved
    update requests set status = 'approved', decided_at = now()
    notify employee: "Pengajuan Anda disetujui"
    
    // Side effects (lookup via request_types reference table)
    requestType = select * from request_types where id = request.request_type_id
    
    if requestType.deducts_leave_quota:
      updateLeaveBalance(request, requestType)
    if requestType.code == 'izin_telat':
      linkToAttendance(request)
      
  else:
    // Masih ada yang pending, tunggu
    pass
```

### 4.3 Saat Karyawan Membatalkan

```
function cancelRequest(requestId, cancelledById, reason):
  request = getRequest(requestId)
  
  // Hanya bisa cancel jika masih pending
  if request.status != 'pending':
    throw "Tidak bisa membatalkan pengajuan yang sudah diputuskan"
  
  // Cek apakah ada approver yang sudah approve
  approvedCount = count approvals where decision = 'approved' and request_id = requestId
  
  if approvedCount > 0:
    // Tampilkan warning: "Pengajuan sudah di-approve sebagian. Yakin batal?"
    // Jika user confirm, lanjutkan
    
  update requests
    set status = 'cancelled',
        cancelled_by = cancelledById,
        cancelled_at = now(),
        cancel_reason = reason
```

---

## 5. Edge Cases

| Skenario | Handling |
|---|---|
| SPV kosong (belum di-assign) | Request dari staff tidak bisa dibuat. Tampilkan error: "Atasan belum ditetapkan, hubungi Admin" |
| Kepala Divisi kosong | Request dari SPV tidak bisa dibuat. Tampilkan error serupa |
| HR tidak ada di sistem | Sistem tidak bisa berjalan — minimal 1 HR harus ada |
| Approver resign/nonaktif saat ada approval pending | HR mendapat notifikasi. Opsi: (1) HR take-over approval, (2) Admin reassign atasan baru, approval di-route ulang |
| Dua approver approve bersamaan (race condition) | Row-level locking pada `request_approvals`. Decision pertama menang |
| Karyawan mutasi divisi, ada request pending | Request pending tetap di-approve oleh approver lama. Request baru mengikuti divisi baru |

---

## 6. Izin Telat — Aturan Khusus

| Aturan | Detail |
|---|---|
| Batas waktu submit | Sebelum jam masuk sesuai `work_schedules` karyawan (default 08:00) |
| Validasi | Cek `submitted_at < work_schedule.start_time` untuk hari itu |
| Jika approved | Link ke `attendance.linked_izin_telat_request_id` hari itu |
| Efek | Telat aktual hari itu tidak masuk akumulasi sanksi |
| Jika rejected/cancelled | Telat aktual tetap masuk akumulasi (normal) |
