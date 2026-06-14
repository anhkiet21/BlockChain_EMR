"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { AccessState } from "@/components/access-state";
import { useRequiredRole } from "@/lib/auth/use-required-role";
import { apiDownload, apiFetch } from "@/lib/api/client";
import { DoctorProfile, EmergencyAccessLog, Page, PatientSummary, PendingRecordUpload, UnifiedMedicalRecord } from "@/lib/api/types";
import { friendlyErrorMessage } from "@/lib/errors";
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
  const [emergencyCaseCode, setEmergencyCaseCode] = useState("");
  const [emergencyReason, setEmergencyReason] = useState("");
  const [emergencyDuration, setEmergencyDuration] = useState("120");
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
      apiFetch<DoctorProfile>("/doctors/me").then(setDoctor).catch((error) => setMessage(friendlyErrorMessage(error, "Không tải được hồ sơ bác sĩ")));
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
      setMessage(friendlyErrorMessage(error, "Tìm kiếm thất bại"));
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
      setMessage(friendlyErrorMessage(error, "Không tải được danh sách bệnh nhân đã cấp quyền"));
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
      setMessage(friendlyErrorMessage(error, "Không gửi được yêu cầu"));
    }
  }

  async function activateEmergencyAccess() {
    if (!patient) return;
    try {
      const emergency = await apiFetch<EmergencyAccessLog>("/doctor/emergency-access", {
        method: "POST",
        body: JSON.stringify({
          patientIdentifier: patient.patientCode,
          caseCode: emergencyCaseCode,
          reason: emergencyReason,
          durationMinutes: Number(emergencyDuration),
        }),
      });
      setMessage(`Đã mở quyền xem bệnh án đến ${new Date(emergency.expiresAt).toLocaleString("vi-VN")}. Mọi thao tác bằng quyền khẩn cấp sẽ được ghi log.`);
      setEmergencyCaseCode("");
      setEmergencyReason("");
      await loadRecords(patient);
    } catch (error) {
      setMessage(friendlyErrorMessage(error, "Không thể mở quyền xem bệnh án"));
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
      setMessage(friendlyErrorMessage(error, "Chưa có quyền truy cập"));
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
      setMessage(friendlyErrorMessage(error, "Tải hồ sơ lên thất bại"));
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
      setMessage(friendlyErrorMessage(error, "Không thể tạo bản đính chính"));
    } finally {
      setCorrectionBusy(false);
    }
  }

  if (access !== "allowed") return <AccessState access={access} />;

  const ready = doctor?.verificationStatus === "VERIFIED" && !!doctor.wallets.length && !!doctor.facility;

  return (
    <section className="grid gap-6">
      <div>
        <p className="badge">Không gian bác sĩ</p>
        <h1 className="mt-3 section-title">Hồ sơ bệnh nhân</h1>
        <p className="mt-2 text-slate-600">
          {doctorStatusLabel(doctor?.verificationStatus)} · {doctor?.facility?.name ?? "Chưa có cơ sở"}
        </p>
      </div>

      {!ready && (
        <div className={doctor?.verificationStatus === "REJECTED" ? "status border-red-200 bg-red-50 text-red-900" : "status"}>
          {doctorBlockingMessage(doctor)}
          {doctor?.rejectionReason && <p className="mt-2"><b>Lý do:</b> {doctor.rejectionReason}</p>}
        </div>
      )}
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
              {!patientHasAccess && (
                <div className="card grid gap-3 border-amber-200 bg-amber-50/60">
                  <div>
                    <p className="badge border-amber-200 bg-white text-amber-800">Quyền khẩn cấp</p>
                    <h2 className="mt-3 font-black">Xem bệnh án khi bệnh nhân không thể phản hồi</h2>
                    <p className="mt-1 text-sm text-amber-900">
                      Chỉ dùng trong cấp cứu. Quyền này chỉ cho xem/tải hồ sơ tạm thời và sẽ được ghi log cho bệnh nhân kiểm tra.
                    </p>
                  </div>
                  <input
                    className="input"
                    required
                    maxLength={80}
                    placeholder="Mã ca cấp cứu / mã nhập viện"
                    value={emergencyCaseCode}
                    onChange={(event) => setEmergencyCaseCode(event.target.value)}
                  />
                  <textarea
                    className="input"
                    required
                    maxLength={1000}
                    placeholder="Lý do khẩn cấp"
                    value={emergencyReason}
                    onChange={(event) => setEmergencyReason(event.target.value)}
                  />
                  <select className="input" value={emergencyDuration} onChange={(event) => setEmergencyDuration(event.target.value)}>
                    <option value="60">1 giờ</option>
                    <option value="120">2 giờ</option>
                    <option value="240">4 giờ</option>
                    <option value="360">6 giờ</option>
                  </select>
                  <button className="btn-danger" type="button" onClick={activateEmergencyAccess}>
                    Xem bệnh án
                  </button>
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
                    <td className="font-semibold">
                      {record.originalFileName}
                    </td>
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

function doctorStatusLabel(status?: DoctorProfile["verificationStatus"]) {
  if (status === "VERIFIED") return "Đã xác thực";
  if (status === "REJECTED") return "Đã bị từ chối";
  return "Đang chờ xác thực";
}

function doctorBlockingMessage(doctor: DoctorProfile | null) {
  if (!doctor) return "Không tải được hồ sơ bác sĩ.";
  if (doctor.verificationStatus === "REJECTED") {
    return "Hồ sơ bác sĩ đã bị từ chối. Hãy cập nhật hồ sơ và gửi xác thực lại tại trang Hồ sơ.";
  }
  if (doctor.verificationStatus === "PENDING_VERIFICATION") {
    return "Tài khoản bác sĩ đang chờ quản trị viên xác thực.";
  }
  if (!doctor.wallets.length) return "Tài khoản bác sĩ chưa liên kết và xác minh ví.";
  if (!doctor.facility) return "Tài khoản bác sĩ chưa được gắn cơ sở y tế.";
  return "Tài khoản bác sĩ chưa sẵn sàng.";
}
