"use client";

import { FormEvent, useEffect, useState } from "react";
import { AccessState } from "@/components/access-state";
import { useRequiredRole } from "@/lib/auth/use-required-role";
import { apiDownload, apiFetch } from "@/lib/api/client";
import { DoctorProfile, Page, PatientSummary, PendingRecordUpload, UnifiedMedicalRecord } from "@/lib/api/types";
import { createOnChainRecordWithMetadata } from "@/lib/web3/provider";

export default function DoctorRecordsPage() {
  const access = useRequiredRole("DOCTOR");
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [query, setQuery] = useState("");
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [patient, setPatient] = useState<PatientSummary | null>(null);
  const [records, setRecords] = useState<UnifiedMedicalRecord[]>([]);
  const [reason, setReason] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (access === "allowed") {
      apiFetch<DoctorProfile>("/doctors/me").then(setDoctor).catch((error) => setMessage(error.message));
    }
  }, [access]);

  async function search(event: FormEvent) {
    event.preventDefault();
    try {
      setPatients((await apiFetch<Page<PatientSummary>>(`/patients?query=${encodeURIComponent(query)}`)).content);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Tìm kiếm thất bại");
    }
  }

  async function requestAccess() {
    if (!patient) return;
    try {
      await apiFetch("/doctor/access-requests", { method: "POST", body: JSON.stringify({ patientIdentifier: patient.patientCode, reason }) });
      setMessage("Đã gửi yêu cầu truy cập cho bệnh nhân.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không gửi được yêu cầu");
    }
  }

  async function loadRecords(selected = patient) {
    if (!selected) return;
    setPatient(selected);
    try {
      setRecords((await apiFetch<Page<UnifiedMedicalRecord>>(`/doctor/records?patientId=${selected.id}`)).content);
      setMessage("Cơ sở y tế đã được cấp quyền.");
    } catch (error) {
      setRecords([]);
      setMessage(error instanceof Error ? error.message : "Chưa có quyền truy cập");
    }
  }

  async function upload(event: FormEvent) {
    event.preventDefault();
    if (!patient || !file) return;
    setBusy(true);
    try {
      const data = new FormData();
      data.append("file", file);
      const pending = await apiFetch<PendingRecordUpload>(`/doctor/records?patientId=${patient.id}`, { method: "POST", body: data });
      const chain = await createOnChainRecordWithMetadata(pending);
      await apiFetch("/doctor/records/confirm", {
        method: "POST",
        body: JSON.stringify({ medicalFileId: pending.medicalFileId, onChainRecordId: chain.recordId, transactionHash: chain.transactionHash }),
      });
      setMessage("Đã tải hồ sơ bệnh án lên thành công.");
      await loadRecords();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Tải hồ sơ lên thất bại");
    } finally {
      setBusy(false);
    }
  }

  async function download(record: UnifiedMedicalRecord) {
    const blob = await apiDownload(`/doctor/records/${record.recordId}/content`);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = record.originalFileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (access !== "allowed") return <AccessState access={access} />;

  const ready = doctor?.verificationStatus === "VERIFIED" && !!doctor;

  return (
    <section className="grid gap-6">
      <div>
        <p className="badge">Không gian bác sĩ</p>
        <h1 className="mt-3 section-title">Hồ sơ bệnh nhân</h1>
        <p className="mt-2 text-slate-600">
          {doctor?.verificationStatus === "VERIFIED" ? "Đã xác thực" : "Đang chờ xác thực"} · {doctor?.facility?.name ?? "Chưa có cơ sở"}
        </p>
      </div>

      {!ready && <p className="status">Tài khoản bác sĩ đang chờ quản trị viên xác thực hoặc chưa được gắn cơ sở y tế.</p>}
      {message && <p className="status">{message}</p>}

      {ready && (
        <>
          <form className="card flex flex-wrap gap-3" onSubmit={search}>
            <input
              className="input flex-1"
              required
              minLength={3}
              placeholder="Nhập CCCD, mã hoặc tên bệnh nhân"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button className="btn-primary">Tìm kiếm</button>
          </form>

          <div className="grid gap-3">
            {patients.map((item) => (
              <div className="card flex flex-wrap items-center justify-between gap-3" key={item.id}>
                <div>
                  <b>{item.fullName}</b>
                  <p className="text-sm text-slate-500">{item.patientCode}</p>
                </div>
                <button className="btn-secondary" onClick={() => loadRecords(item)}>Kiểm tra quyền / xem hồ sơ</button>
              </div>
            ))}
          </div>

          {patient && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="card grid gap-3">
                <h2 className="font-black">Yêu cầu quyền cho {patient.fullName}</h2>
                <textarea className="input" required placeholder="Lý do truy cập hồ sơ" value={reason} onChange={(e) => setReason(e.target.value)} />
                <button className="btn-primary" onClick={requestAccess}>Gửi yêu cầu</button>
              </div>
              <form className="card grid gap-3" onSubmit={upload}>
                <h2 className="font-black">Tải hồ sơ lên</h2>
                <input className="input" type="file" required onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                <button className="btn-primary" disabled={busy}>{busy ? "Đang xử lý..." : "Tải hồ sơ lên"}</button>
              </form>
            </div>
          )}

          <div className="table-wrap">
            <table>
              <thead><tr><th>Tệp</th><th>Nguồn</th><th>Người tải lên</th><th>Cơ sở</th><th></th></tr></thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.recordId}>
                    <td className="font-semibold">{record.originalFileName}</td>
                    <td>{record.sourceType === "PATIENT_UPLOADED" ? "Bệnh nhân" : "Bác sĩ"}</td>
                    <td>{record.uploaderName}</td>
                    <td>{record.facilityName ?? "-"}</td>
                    <td><button className="btn-secondary" onClick={() => download(record)}>Tải xuống</button></td>
                  </tr>
                ))}
                {!records.length && <tr><td colSpan={5} className="text-center text-slate-500">Chưa có hồ sơ để hiển thị.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
