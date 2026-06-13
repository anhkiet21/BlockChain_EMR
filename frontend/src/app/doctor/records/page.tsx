"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { AccessState } from "@/components/access-state";
import { useRequiredRole } from "@/lib/auth/use-required-role";
import { apiDownload, apiFetch } from "@/lib/api/client";
import { DoctorProfile, Page, PatientSummary, PendingRecordUpload, UnifiedMedicalRecord } from "@/lib/api/types";
import { createOnChainRecordVersion, createOnChainRecordWithMetadata } from "@/lib/web3/provider";

export default function DoctorRecordsPage() {
  const access = useRequiredRole("DOCTOR");
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [query, setQuery] = useState("");
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [authorizedPatients, setAuthorizedPatients] = useState<PatientSummary[]>([]);
  const [showingAuthorized, setShowingAuthorized] = useState(true);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [patient, setPatient] = useState<PatientSummary | null>(null);
  const [patientHasAccess, setPatientHasAccess] = useState<boolean | null>(null);
  const [records, setRecords] = useState<UnifiedMedicalRecord[]>([]);
  const [reason, setReason] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [correctionRecord, setCorrectionRecord] = useState<UnifiedMedicalRecord | null>(null);
  const [correctionFile, setCorrectionFile] = useState<File | null>(null);
  const [correctionReason, setCorrectionReason] = useState("");
  const [correctionBusy, setCorrectionBusy] = useState(false);
  const correctionFormRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    if (access === "allowed") {
      apiFetch<DoctorProfile>("/doctors/me").then(setDoctor).catch((error) => setMessage(error.message));
    }
  }, [access]);

  useEffect(() => {
    if (doctor?.verificationStatus === "VERIFIED") {
      void loadAuthorizedPatients();
    }
  }, [doctor]);

  useEffect(() => {
    if (!correctionRecord) return;
    const frame = requestAnimationFrame(() => {
      correctionFormRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      correctionFormRef.current?.querySelector<HTMLTextAreaElement>("textarea")?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [correctionRecord]);

  async function search(event: FormEvent) {
    event.preventDefault();
    setLoadingPatients(true);
    try {
      setPatients((await apiFetch<Page<PatientSummary>>(`/patients?query=${encodeURIComponent(query)}`)).content);
      setShowingAuthorized(false);
      setPatient(null);
      setPatientHasAccess(null);
      setRecords([]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Tìm kiếm thất bại");
    } finally {
      setLoadingPatients(false);
    }
  }

  async function loadAuthorizedPatients() {
    setLoadingPatients(true);
    try {
      const result = await apiFetch<Page<PatientSummary>>("/doctor/authorized-patients?size=50");
      setAuthorizedPatients(result.content);
      setPatients(result.content);
      setShowingAuthorized(true);
      setPatient(null);
      setPatientHasAccess(null);
      setRecords([]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không tải được danh sách bệnh nhân đã cấp quyền");
    } finally {
      setLoadingPatients(false);
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
    setPatientHasAccess(null);
    try {
      setRecords((await apiFetch<Page<UnifiedMedicalRecord>>(`/doctor/records?patientId=${selected.id}`)).content);
      setPatientHasAccess(true);
      setMessage("Cơ sở y tế đã được cấp quyền.");
    } catch (error) {
      setRecords([]);
      setPatientHasAccess(false);
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

  async function correctRecord(event: FormEvent) {
    event.preventDefault();
    if (!correctionRecord || !correctionFile || !correctionReason.trim()) return;
    setCorrectionBusy(true);
    setMessage("");
    try {
      const data = new FormData();
      data.append("file", correctionFile);
      const pending = await apiFetch<PendingRecordUpload>(
        `/doctor/records/${correctionRecord.recordId}/corrections`,
        { method: "POST", body: data },
      );
      if (!pending.facilityId) throw new Error("Không xác định được cơ sở y tế của bác sĩ.");
      const chain = await createOnChainRecordVersion(
        correctionRecord.onChainRecordId,
        pending.uploaderWallet,
        pending.cid,
        pending.contentHash,
        pending.facilityId,
      );
      await apiFetch(`/doctor/records/${correctionRecord.recordId}/corrections/confirm`, {
        method: "POST",
        body: JSON.stringify({
          medicalFileId: pending.medicalFileId,
          onChainRecordId: chain.recordId,
          transactionHash: chain.transactionHash,
          correctionReason: correctionReason.trim(),
        }),
      });
      setMessage("Đã tạo bản đính chính mới. Bản cũ được giữ lại trong lịch sử.");
      setCorrectionRecord(null);
      setCorrectionFile(null);
      setCorrectionReason("");
      await loadRecords();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể tạo bản đính chính");
    } finally {
      setCorrectionBusy(false);
    }
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
            <button className="btn-primary" disabled={loadingPatients}>
              {loadingPatients && !showingAuthorized ? "Đang tìm..." : "Tìm kiếm"}
            </button>
            {!showingAuthorized && (
              <button className="btn-secondary" type="button" disabled={loadingPatients} onClick={loadAuthorizedPatients}>
                Bệnh nhân đã cấp quyền
              </button>
            )}
          </form>

          <div className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-black">
                {showingAuthorized ? "Bệnh nhân đã cấp quyền" : "Kết quả tìm kiếm"}
              </h2>
              <span className="text-sm text-slate-500">{patients.length} bệnh nhân</span>
            </div>
            {patients.map((item) => (
              <div className="card flex flex-wrap items-center justify-between gap-3" key={item.id}>
                <div>
                  <b>{item.fullName}</b>
                  <p className="text-sm text-slate-500">{item.patientCode}</p>
                </div>
                <button className="btn-secondary" type="button" onClick={() => loadRecords(item)}>
                  {authorizedPatients.some((authorized) => authorized.id === item.id)
                    ? "Xem hồ sơ"
                    : "Kiểm tra quyền / xem hồ sơ"}
                </button>
              </div>
            ))}
            {!loadingPatients && !patients.length && (
              <div className="card text-center text-slate-500">
                {showingAuthorized
                  ? "Chưa có bệnh nhân nào cấp quyền cho cơ sở y tế này."
                  : "Không tìm thấy bệnh nhân phù hợp."}
              </div>
            )}
          </div>

          {patient && patientHasAccess !== null && (
            <div className="grid gap-4 lg:grid-cols-2">
              {!patientHasAccess && (
                <div className="card grid gap-3">
                  <h2 className="font-black">Yêu cầu quyền cho {patient.fullName}</h2>
                  <textarea className="input" required placeholder="Lý do truy cập hồ sơ" value={reason} onChange={(e) => setReason(e.target.value)} />
                  <button className="btn-primary" onClick={requestAccess}>Gửi yêu cầu</button>
                </div>
              )}
              {patientHasAccess && (
                <form className="card grid gap-3" onSubmit={upload}>
                  <h2 className="font-black">Tải hồ sơ lên cho {patient.fullName}</h2>
                  <input className="input" type="file" required onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                  <button className="btn-primary" disabled={busy}>{busy ? "Đang xử lý..." : "Tải hồ sơ lên"}</button>
                </form>
              )}
            </div>
          )}

          <div className="table-wrap">
            <table>
              <thead><tr><th>Tệp</th><th>Phiên bản</th><th>Nguồn</th><th>Người tải lên</th><th>Cơ sở</th><th></th></tr></thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.recordId}>
                    <td className="font-semibold">{record.originalFileName}</td>
                    <td>
                      <span className={record.status === "ACTIVE" ? "badge" : "badge border-amber-200 bg-amber-50 text-amber-700"}>
                        {record.status === "ACTIVE" ? "Hiện hành" : "Đã đính chính"}
                      </span>
                      {record.correctionReason && <p className="mt-1 text-xs text-slate-500">{record.correctionReason}</p>}
                    </td>
                    <td>{record.sourceType === "PATIENT_UPLOADED" ? "Bệnh nhân" : "Bác sĩ"}</td>
                    <td>{record.uploaderName}</td>
                    <td>{record.facilityName ?? "-"}</td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <button className="btn-secondary" onClick={() => download(record)}>Tải xuống</button>
                        {record.status === "ACTIVE" && (
                          <button className="btn-secondary" type="button" onClick={() => {
                            setCorrectionRecord(record);
                            setCorrectionFile(null);
                            setCorrectionReason("");
                          }}>
                            {correctionRecord?.recordId === record.recordId ? "Đang đính chính" : "Tạo bản đính chính"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!records.length && <tr><td colSpan={6} className="text-center text-slate-500">Chưa có hồ sơ để hiển thị.</td></tr>}
              </tbody>
            </table>
          </div>

          {correctionRecord && (
            <form ref={correctionFormRef} className="card grid gap-4 ring-2 ring-cyan-200" onSubmit={correctRecord}>
              <div>
                <p className="badge">Đính chính bệnh án</p>
                <h2 className="mt-3 text-xl font-black">{correctionRecord.originalFileName}</h2>
                <p className="mt-2 muted">Bản hiện tại không bị xóa. Hệ thống sẽ tạo một phiên bản mới liên kết với bản này.</p>
                {correctionRecord.previousRecordId && (
                  <p className="mt-2 text-sm font-semibold text-cyan-700">
                    Đây là bản đính chính hiện hành. Bạn có thể tiếp tục đính chính để tạo phiên bản kế tiếp.
                  </p>
                )}
              </div>
              <textarea
                className="input"
                required
                maxLength={500}
                placeholder="Lý do đính chính"
                value={correctionReason}
                onChange={(event) => setCorrectionReason(event.target.value)}
              />
              <input
                className="input"
                type="file"
                required
                accept=".json,.pdf,image/jpeg,image/png"
                onChange={(event) => setCorrectionFile(event.target.files?.[0] ?? null)}
              />
              <div className="flex flex-wrap gap-2">
                <button className="btn-primary" disabled={correctionBusy}>
                  {correctionBusy ? "Đang tạo bản đính chính..." : "Ký và tạo bản đính chính"}
                </button>
                <button className="btn-secondary" type="button" disabled={correctionBusy} onClick={() => setCorrectionRecord(null)}>
                  Hủy
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </section>
  );
}
