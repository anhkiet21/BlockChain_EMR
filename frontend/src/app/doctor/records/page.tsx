"use client";

import { FormEvent, useEffect, useState } from "react";
import { WalletCard } from "@/components/wallet-card";
import { AccessState } from "@/components/access-state";
import { apiDownload, apiFetch, getSession } from "@/lib/api/client";
import { MedicalRecord, Page, PatientSummary, UploadedFile } from "@/lib/api/types";
import { useRequiredRole } from "@/lib/auth/use-required-role";
import {
  createOnChainRecord,
  createOnChainRecordVersion,
  shortAddress,
  triggerEmergencyAccess,
} from "@/lib/web3/provider";

const EMERGENCY_DURATIONS = [
  { label: "1 giờ",   seconds: 3600 },
  { label: "4 giờ",   seconds: 14400 },
  { label: "12 giờ",  seconds: 43200 },
  { label: "24 giờ",  seconds: 86400 },
];

const RECORD_TYPE_LABELS: Record<string, string> = {
  DIAGNOSIS:    "🔬 Chẩn đoán",
  LAB_RESULT:   "🧪 Xét nghiệm",
  IMAGING:      "🩻 Hình ảnh",
  PRESCRIPTION: "💊 Đơn thuốc",
};

const STATUS_BADGES: Record<string, string> = {
  ACTIVE:    "badge-emerald",
  CORRECTED: "badge-amber",
  CANCELLED: "badge-red",
};

export default function DoctorRecordsPage() {
  const access = useRequiredRole("DOCTOR");
  const [doctorWallet, setDoctorWallet]     = useState("");
  const [patientWallet, setPatientWallet]   = useState("");
  const [patientId, setPatientId]           = useState("");
  const [patientName, setPatientName]       = useState("");
  const [query, setQuery]                   = useState("");
  const [patients, setPatients]             = useState<PatientSummary[]>([]);
  const [records, setRecords]               = useState<MedicalRecord[]>([]);
  const [title, setTitle]                   = useState("");
  const [recordType, setRecordType]         = useState("DIAGNOSIS");
  const [file, setFile]                     = useState<File | null>(null);
  const [correctionFiles, setCorrectionFiles]   = useState<Record<number, File | null>>({});
  const [correctionReasons, setCorrectionReasons] = useState<Record<number, string>>({});
  const [message, setMessage]               = useState("");
  const [msgKind, setMsgKind]               = useState<"info"|"error"|"success">("info");
  const [busy, setBusy]                     = useState(false);

  // ── Access Request modal ────────────────────────────────────────────────
  const [showAccessReqModal, setShowAccessReqModal]  = useState(false);
  const [accessReqReason, setAccessReqReason]        = useState("");
  const [accessReqBusy, setAccessReqBusy]            = useState(false);
  const [accessReqMsg, setAccessReqMsg]              = useState("");
  const [accessReqMsgKind, setAccessReqMsgKind]      = useState<"success"|"error">("success");

  // ── Emergency Access modal ──────────────────────────────────────────────
  const [showEmergencyModal, setShowEmergencyModal]  = useState(false);
  const [emergencyReason, setEmergencyReason]        = useState("");
  const [emergencyDuration, setEmergencyDuration]    = useState(3600);
  const [emergencyBusy, setEmergencyBusy]            = useState(false);
  const [emergencyMsg, setEmergencyMsg]              = useState("");
  const [emergencyError, setEmergencyError]          = useState("");

  useEffect(() => {
    const wallet = getSession()?.user.wallets[0];
    if (wallet) setDoctorWallet(wallet);
  }, []);

  function showMsg(text: string, kind: "info"|"error"|"success" = "info") {
    setMessage(text); setMsgKind(kind);
  }

  async function searchPatients(event: FormEvent) {
    event.preventDefault();
    showMsg("");
    try {
      const page = await apiFetch<Page<PatientSummary>>(`/patients?query=${encodeURIComponent(query)}&size=20`);
      setPatients(page.content);
      if (page.content.length === 0) showMsg("Không tìm thấy bệnh nhân phù hợp.", "info");
    } catch (error) {
      showMsg(error instanceof Error ? error.message : "Không thể tìm bệnh nhân", "error");
    }
  }

  async function loadRecords() {
    if (!patientId || !patientWallet || !doctorWallet)
      return showMsg("Cần đủ ID bệnh nhân và hai địa chỉ ví.", "error");
    setBusy(true);
    try {
      const page = await apiFetch<Page<MedicalRecord>>(
        `/medical-records?patientProfileId=${patientId}&patientWallet=${patientWallet}&doctorWallet=${doctorWallet}&size=50`,
      );
      setRecords(page.content);
      showMsg(`Đã tải ${page.totalElements} bệnh án.`, "success");
    } catch (error) {
      showMsg(error instanceof Error ? error.message : "Không thể tải bệnh án", "error");
    } finally { setBusy(false); }
  }

  async function createRecord(event: FormEvent) {
    event.preventDefault();
    if (!file) return showMsg("Hãy chọn file bệnh án.", "error");
    setBusy(true);
    try {
      showMsg("Đang mã hóa và tải file lên IPFS...", "info");
      const body = new FormData();
      body.append("file", file);
      const uploaded = await apiFetch<UploadedFile>(
        `/medical-records/patients/${patientId}/files?patientWallet=${patientWallet}&doctorWallet=${doctorWallet}`,
        { method: "POST", body },
      );
      showMsg("File đã tải lên. Hãy ký giao dịch trong MetaMask...", "info");
      const onChain = await createOnChainRecord(patientWallet, doctorWallet, uploaded.cid, uploaded.contentHash);
      showMsg("Đang xác minh on-chain và lưu bệnh án...", "info");
      await apiFetch("/medical-records", {
        method: "POST",
        body: JSON.stringify({ patientProfileId: Number(patientId), title, recordType, medicalFileId: uploaded.fileId, onChainRecordId: onChain.recordId, patientWallet, doctorWallet }),
      });
      showMsg(`✅ Tạo bệnh án thành công! TX: ${shortAddress(onChain.transactionHash)}`, "success");
      setTitle(""); setFile(null);
      await loadRecords();
    } catch (error) {
      showMsg(error instanceof Error ? error.message : "Không thể tạo bệnh án", "error");
    } finally { setBusy(false); }
  }

  async function correctRecord(event: FormEvent, record: MedicalRecord) {
    event.preventDefault();
    const correctionFile = correctionFiles[record.id];
    const correctionReason = correctionReasons[record.id]?.trim();
    if (!correctionFile) return showMsg("Hãy chọn file bản chỉnh sửa.", "error");
    if (!correctionReason) return showMsg("Hãy nhập lý do sửa bệnh án.", "error");
    setBusy(true);
    try {
      showMsg("Đang upload file bản chỉnh sửa lên IPFS...", "info");
      const body = new FormData();
      body.append("file", correctionFile);
      const uploaded = await apiFetch<UploadedFile>(
        `/medical-records/patients/${patientId}/files?patientWallet=${patientWallet}&doctorWallet=${doctorWallet}`,
        { method: "POST", body },
      );
      showMsg("Hãy ký giao dịch tạo phiên bản mới trên blockchain...", "info");
      const onChain = await createOnChainRecordVersion(record.onChainRecordId, doctorWallet, uploaded.cid, uploaded.contentHash);
      showMsg("Đang xác minh và lưu bản chỉnh sửa...", "info");
      await apiFetch(`/medical-records/${record.id}/corrections`, {
        method: "POST",
        body: JSON.stringify({ title: `${record.title} - bản chỉnh sửa`, recordType: record.recordType, medicalFileId: uploaded.fileId, onChainRecordId: onChain.recordId, correctionReason, patientWallet, doctorWallet }),
      });
      showMsg(`✅ Đã tạo bản chỉnh sửa. TX: ${shortAddress(onChain.transactionHash)}`, "success");
      setCorrectionFiles((c) => ({ ...c, [record.id]: null }));
      setCorrectionReasons((c) => ({ ...c, [record.id]: "" }));
      await loadRecords();
    } catch (error) {
      showMsg(error instanceof Error ? error.message : "Không thể sửa bệnh án", "error");
    } finally { setBusy(false); }
  }

  async function download(recordId: number, fileId: number, filename: string) {
    try {
      const blob = await apiDownload(`/medical-records/${recordId}/files/${fileId}/content?patientWallet=${patientWallet}&doctorWallet=${doctorWallet}`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      showMsg(error instanceof Error ? error.message : "Không thể tải file", "error");
    }
  }

  async function handleSendAccessRequest() {
    if (!accessReqReason.trim()) return setAccessReqMsg("Vui lòng nhập lý do.");
    if (!patientId) return setAccessReqMsg("Chưa chọn bệnh nhân.");
    setAccessReqBusy(true); setAccessReqMsg("");
    try {
      await apiFetch("/access-requests", {
        method: "POST",
        body: JSON.stringify({ patientProfileId: Number(patientId), reason: accessReqReason.trim() }),
      });
      setAccessReqMsg("Đã gửi yêu cầu truy cập. Chờ bệnh nhân phê duyệt.");
      setAccessReqMsgKind("success");
      setAccessReqReason("");
    } catch (err) {
      setAccessReqMsg(err instanceof Error ? err.message : "Không thể gửi yêu cầu");
      setAccessReqMsgKind("error");
    } finally { setAccessReqBusy(false); }
  }

  async function handleEmergencyAccess() {
    if (!emergencyReason.trim()) return setEmergencyError("Vui lòng nhập lý do khẩn cấp.");
    if (!patientWallet) return setEmergencyError("Chưa có địa chỉ ví bệnh nhân.");
    setEmergencyBusy(true); setEmergencyError(""); setEmergencyMsg("");
    try {
      setEmergencyMsg("⏳ Đang gọi MetaMask — vui lòng ký giao dịch...");
      const { txHash, expiresAt } = await triggerEmergencyAccess(patientWallet, emergencyReason.trim(), emergencyDuration);
      setEmergencyMsg("⏳ Đang xác minh giao dịch với backend...");
      await apiFetch("/access-control/emergency/verify", {
        method: "POST",
        body: JSON.stringify({ transactionHash: txHash, patientProfileId: Number(patientId), patientWallet, doctorWallet, reason: emergencyReason.trim(), durationSeconds: emergencyDuration }),
      });
      setEmergencyMsg(`⚡ Truy cập khẩn cấp đã được kích hoạt!\nTX: ${shortAddress(txHash)}\nHết hạn lúc: ${expiresAt.toLocaleString("vi-VN")}`);
      setEmergencyReason("");
    } catch (err) {
      setEmergencyError(err instanceof Error ? err.message : "Không thể kích hoạt truy cập khẩn cấp");
      setEmergencyMsg("");
    } finally { setEmergencyBusy(false); }
  }

  if (access !== "allowed") return <AccessState access={access} />;

  const msgClass = msgKind === "error" ? "alert-error" : msgKind === "success" ? "alert-success" : "alert-info";

  return (
    <div className="grid gap-8 animate-fade-in">
      {/* ── Header ── */}
      <div>
        <div className="role-pill bg-emerald-500/10 border-emerald-500/20 text-emerald-400">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Bác sĩ
        </div>
        <h1 className="page-title">🏥 Quản lý bệnh án</h1>
        <p className="page-subtitle">
          Tìm bệnh nhân, upload file lên IPFS, tạo bệnh án blockchain và quản lý chỉnh sửa.
        </p>
      </div>

      {/* ── Wallet ── */}
      <WalletCard onConnected={setDoctorWallet} />

      {/* ── Global message ── */}
      {message && (
        <div className={`${msgClass} animate-scale-in`}>{message}</div>
      )}

      {/* ── Step 1 + 2: Search & Access scope ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Search patients */}
        <form className="card-glass grid gap-4" onSubmit={searchPatients}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 text-sm font-bold">1</div>
            <h2 className="section-title text-base">Tìm bệnh nhân</h2>
          </div>
          <div className="flex gap-2">
            <input
              className="input flex-1"
              required
              placeholder="Mã hoặc tên bệnh nhân..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button type="submit" className="btn-secondary shrink-0">Tìm</button>
          </div>

          {patients.length > 0 && (
            <div className="grid gap-2 max-h-52 overflow-auto pr-1">
              {patients.map((patient) => (
                <button
                  key={patient.id}
                  type="button"
                  className={`rounded-xl border px-4 py-3 text-left transition-all duration-150 ${
                    patientId === String(patient.id)
                      ? "border-emerald-500/40 bg-emerald-500/10"
                      : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8"
                  }`}
                  onClick={() => { setPatientId(String(patient.id)); setPatientName(patient.fullName); }}
                >
                  <p className="text-white text-sm font-medium">{patient.fullName}</p>
                  <p className="text-slate-500 text-xs mono mt-0.5">{patient.patientCode} · ID {patient.id}</p>
                </button>
              ))}
            </div>
          )}
        </form>

        {/* Access scope */}
        <div className="card-glass grid gap-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-400 text-sm font-bold">2</div>
            <h2 className="section-title text-base">Xác định phạm vi truy cập</h2>
          </div>

          {patientId && (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5">
              <p className="text-emerald-400 text-sm font-medium">✓ Bệnh nhân: {patientName}</p>
              <p className="text-emerald-600 text-xs mono">ID #{patientId}</p>
            </div>
          )}

          <label className="grid gap-1.5">
            <span className="form-label">ID hồ sơ bệnh nhân</span>
            <input className="input" type="number" min="1" value={patientId} onChange={(e) => setPatientId(e.target.value)} />
          </label>
          <label className="grid gap-1.5">
            <span className="form-label">Ví bệnh nhân</span>
            <input className="input mono" placeholder="0x..." pattern="^0x[0-9a-fA-F]{40}$" value={patientWallet} onChange={(e) => setPatientWallet(e.target.value)} />
          </label>
          <label className="grid gap-1.5">
            <span className="form-label">Ví bác sĩ</span>
            <input className="input mono" placeholder="0x..." pattern="^0x[0-9a-fA-F]{40}$" value={doctorWallet} onChange={(e) => setDoctorWallet(e.target.value)} />
          </label>
          <button className="btn-secondary w-full" disabled={busy} onClick={loadRecords}>
            {busy ? <><span className="spinner-sm border-slate-300" /> Đang tải...</> : "Kiểm tra quyền & tải bệnh án"}
          </button>

          {/* Access request & Emergency */}
          {patientId && (
            <div className="flex flex-wrap gap-2 border-t border-white/5 pt-3">
              <button
                type="button"
                onClick={() => { setShowAccessReqModal(true); setAccessReqMsg(""); }}
                className="flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-sm font-semibold text-indigo-400 hover:bg-indigo-500/20 transition-all"
              >
                📨 Gửi yêu cầu truy cập
              </button>
              <button
                type="button"
                onClick={() => { setShowEmergencyModal(true); setEmergencyError(""); setEmergencyMsg(""); }}
                className="flex items-center gap-1.5 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-bold text-red-400 hover:bg-red-500/20 transition-all shadow-sm shadow-red-500/10"
              >
                ⚡ Khẩn cấp (Break-the-Glass)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Step 3: Create record ── */}
      <form className="card-glass grid gap-5" onSubmit={createRecord}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-sm font-bold">3</div>
          <h2 className="section-title text-base">Tạo bệnh án mới</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          <label className="grid gap-1.5">
            <span className="form-label">Tiêu đề bệnh án *</span>
            <input className="input" required maxLength={200} placeholder="VD: Khám tổng quát 06/2026" value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="grid gap-1.5">
            <span className="form-label">Loại bệnh án *</span>
            <select className="input" value={recordType} onChange={(e) => setRecordType(e.target.value)}>
              <option value="DIAGNOSIS">Chẩn đoán</option>
              <option value="LAB_RESULT">Xét nghiệm</option>
              <option value="IMAGING">Hình ảnh y tế</option>
              <option value="PRESCRIPTION">Đơn thuốc</option>
            </select>
          </label>
          <label className="grid gap-1.5">
            <span className="form-label">File bệnh án *</span>
            <input className="input" type="file" required accept=".json,.pdf,image/jpeg,image/png" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
        </div>
        <div className="flex flex-wrap gap-3 pt-1">
          <button
            className="btn-primary"
            disabled={busy || !patientId || !patientWallet || !doctorWallet}
          >
            {busy ? <><span className="spinner-sm border-white" /> Đang xử lý...</> : "⬆️ Upload, ký & tạo bệnh án"}
          </button>
          <p className="text-xs text-slate-500 self-center">File sẽ được mã hóa và lưu trên IPFS. CID & hash được ghi lên Blockchain.</p>
        </div>
      </form>

      {/* ── Step 4: Records list ── */}
      <div className="card-glass grid gap-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 text-sm font-bold">4</div>
            <h2 className="section-title text-base">Bệnh án được phép truy cập</h2>
          </div>
          <button className="btn-icon" disabled={busy} onClick={loadRecords} title="Làm mới">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {records.length === 0 ? (
          <div className="empty-state py-14">
            <div className="text-4xl mb-2">📋</div>
            <p className="text-slate-400">Chưa tải danh sách hoặc không có bệnh án nào.</p>
            <p className="text-slate-600 text-xs">Kiểm tra quyền và nhấn tải lại ở bước 2.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {records.map((record) => (
              <article key={record.id} className="rounded-xl border border-white/10 bg-white/5 p-5 hover:border-white/20 transition-all">
                <div className="flex flex-wrap justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-white font-semibold">{record.title}</h3>
                      <span className={`badge ${STATUS_BADGES[record.status] ?? "badge-slate"}`}>
                        {record.status === "ACTIVE" ? "✓ Hiệu lực" : record.status === "CORRECTED" ? "↑ Đã chỉnh sửa" : "✗ Đã huỷ"}
                      </span>
                    </div>
                    <p className="text-slate-500 text-xs mt-1 mono">
                      {RECORD_TYPE_LABELS[record.recordType] ?? record.recordType} · On-chain #{record.onChainRecordId} · {new Date(record.createdAt).toLocaleString("vi-VN")}
                    </p>
                  </div>
                </div>

                {record.previousRecordId && (
                  <div className="mb-3 rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-2 text-xs text-blue-300">
                    📎 Bản chỉnh sửa của bệnh án #{record.previousRecordId}. Lý do: {record.correctionReason}
                  </div>
                )}
                {record.successorRecordId && (
                  <div className="mb-3 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs text-amber-300">
                    ⚠️ Đã có bản chỉnh sửa mới: #{record.successorRecordId}. Không nên dùng bản cũ để ra quyết định điều trị.
                  </div>
                )}

                <div className="flex flex-wrap gap-2 mb-4">
                  {record.files.map((item) => (
                    <button key={item.id} className="btn-secondary text-xs py-1.5 px-3" onClick={() => download(record.id, item.id, item.originalFilename)}>
                      ⬇️ {item.originalFilename}
                    </button>
                  ))}
                </div>

                {record.status === "ACTIVE" && (
                  <form className="rounded-xl bg-white/5 border border-white/10 p-4 grid gap-3" onSubmit={(e) => correctRecord(e, record)}>
                    <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide">Tạo bản chỉnh sửa</p>
                    <textarea
                      className="input min-h-[80px] resize-none text-xs"
                      required maxLength={500}
                      placeholder="Lý do chỉnh sửa: sai chẩn đoán, sai đơn thuốc..."
                      value={correctionReasons[record.id] ?? ""}
                      onChange={(e) => setCorrectionReasons((c) => ({ ...c, [record.id]: e.target.value }))}
                    />
                    <input
                      className="input text-xs"
                      type="file" required
                      accept=".json,.pdf,image/jpeg,image/png"
                      onChange={(e) => setCorrectionFiles((c) => ({ ...c, [record.id]: e.target.files?.[0] ?? null }))}
                    />
                    <button className="btn-secondary w-fit text-xs" disabled={busy || !patientId || !patientWallet || !doctorWallet}>
                      ✏️ Upload, ký & tạo bản chỉnh sửa
                    </button>
                  </form>
                )}
              </article>
            ))}
          </div>
        )}
      </div>

      {/* ══ Access Request Modal ════════════════════════════════════════════ */}
      {showAccessReqModal && (
        <div className="modal-overlay animate-scale-in">
          <div className="modal-content">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-xl">📨</div>
              <div>
                <h2 className="section-title">Gửi yêu cầu truy cập</h2>
                {patientName && <p className="text-slate-500 text-xs">Bệnh nhân: <strong className="text-slate-300">{patientName}</strong></p>}
              </div>
            </div>

            <label className="grid gap-2 mb-4">
              <span className="form-label">Lý do yêu cầu *</span>
              <textarea
                className="input min-h-[110px] resize-none"
                placeholder="Nhập lý do yêu cầu truy cập hồ sơ bệnh án..."
                value={accessReqReason}
                onChange={(e) => setAccessReqReason(e.target.value)}
                maxLength={500} autoFocus
              />
              <p className="text-slate-600 text-xs text-right">{accessReqReason.length}/500</p>
            </label>

            {accessReqMsg && (
              <div className={`${accessReqMsgKind === "success" ? "alert-success" : "alert-error"} mb-4 text-sm`}>
                {accessReqMsgKind === "success" ? "✅ " : "❌ "}{accessReqMsg}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setShowAccessReqModal(false)} className="btn-ghost flex-1">Đóng</button>
              <button
                onClick={handleSendAccessRequest}
                disabled={accessReqBusy || !accessReqReason.trim()}
                className="btn-primary flex-1"
              >
                {accessReqBusy && <span className="spinner-sm border-white" />}
                Gửi yêu cầu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Emergency Access Modal ══════════════════════════════════════════ */}
      {showEmergencyModal && (
        <div className="modal-overlay animate-scale-in">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-red-500/30 shadow-2xl shadow-red-900/20 p-6">
            {/* Warning header */}
            <div className="mb-5 rounded-xl bg-red-500/10 border border-red-500/20 px-5 py-4">
              <h2 className="text-xl font-bold text-red-400 flex items-center gap-2">
                ⚡ Truy cập khẩn cấp <span className="text-base font-normal text-red-300/70">(Break the Glass)</span>
              </h2>
              <p className="text-red-300/80 text-sm mt-2 leading-relaxed">
                ⚠️ <strong>Cảnh báo:</strong> Hành động này sẽ được ghi lại vĩnh viễn trên blockchain và bệnh nhân sẽ được thông báo. Chỉ sử dụng trong trường hợp thực sự khẩn cấp!
              </p>
            </div>

            <label className="grid gap-2 mb-4">
              <span className="form-label text-slate-300">Lý do khẩn cấp *</span>
              <textarea
                className="input min-h-[100px] resize-none focus:border-red-400/50"
                placeholder="Mô tả tình trạng khẩn cấp của bệnh nhân (bắt buộc)..."
                value={emergencyReason}
                onChange={(e) => setEmergencyReason(e.target.value)}
                maxLength={500} autoFocus
              />
              <p className="text-slate-600 text-xs text-right">{emergencyReason.length}/500</p>
            </label>

            <label className="grid gap-2 mb-5">
              <span className="form-label text-slate-300">Thời hạn truy cập</span>
              <select
                className="input focus:border-red-400/50"
                value={emergencyDuration}
                onChange={(e) => setEmergencyDuration(Number(e.target.value))}
              >
                {EMERGENCY_DURATIONS.map((d) => (
                  <option key={d.seconds} value={d.seconds}>{d.label}</option>
                ))}
              </select>
            </label>

            {emergencyMsg && (
              <div className="mb-4 rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-amber-300 text-sm whitespace-pre-line">
                {emergencyMsg}
              </div>
            )}
            {emergencyError && (
              <div className="mb-4 alert-error text-sm">⚠️ {emergencyError}</div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setShowEmergencyModal(false); setEmergencyReason(""); setEmergencyMsg(""); setEmergencyError(""); }}
                className="btn-ghost flex-1"
              >
                Huỷ
              </button>
              <button
                onClick={handleEmergencyAccess}
                disabled={emergencyBusy || !emergencyReason.trim()}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-500 border border-red-500 px-4 py-2.5 text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-600/30"
              >
                {emergencyBusy && <span className="spinner-sm border-white" />}
                ⚡ Xác nhận truy cập khẩn cấp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
