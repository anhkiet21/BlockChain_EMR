"use client";

import { FormEvent, useEffect, useState } from "react";
import { AccessState } from "@/components/access-state";
import { ReasonDialog } from "@/components/reason-dialog";
import { useRequiredRole } from "@/lib/auth/use-required-role";
import Link from "next/link";
import { apiDownload, apiFetch, getSession } from "@/lib/api/client";
import { EmergencyAccessLog, Page, PendingRecordUpload, RecordAuditLog, RecordIntegrity, UnifiedMedicalRecord } from "@/lib/api/types";
import { friendlyErrorMessage } from "@/lib/errors";
import { createOnChainRecordWithMetadata } from "@/lib/web3/provider";

const ACTION_LABELS: Record<string, string> = {
  UPLOAD: "Tải tệp lên",
  CREATE: "Tạo bệnh án",
  VIEW: "Xem bệnh án",
  DOWNLOAD: "Tải tệp",
  EDIT: "Chỉnh sửa",
  CORRECT: "Tạo bản sửa",
};

ACTION_LABELS.INTEGRITY_CHECK = "Kiểm tra toàn vẹn";
ACTION_LABELS.EMERGENCY_VIEW = "Xem bệnh án";
ACTION_LABELS.EMERGENCY_DOWNLOAD = "Tải tệp";

export default function PatientRecordsPage() {
  const access = useRequiredRole("PATIENT");
  const [records, setRecords] = useState<UnifiedMedicalRecord[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [historyRecord, setHistoryRecord] = useState<UnifiedMedicalRecord | null>(null);
  const [historyLogs, setHistoryLogs] = useState<RecordAuditLog[]>([]);
  const [historyBusy, setHistoryBusy] = useState(false);
  const [integrity, setIntegrity] = useState<RecordIntegrity | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<UnifiedMedicalRecord | null>(null);
  const [emergencyLogs, setEmergencyLogs] = useState<EmergencyAccessLog[]>([]);
  const [endingEmergencyId, setEndingEmergencyId] = useState<number | null>(null);
  const [emergencyToEnd, setEmergencyToEnd] = useState<EmergencyAccessLog | null>(null);

  useEffect(() => {
    if (access === "allowed") load();
  }, [access]);

  async function load() {
    try {
      const [recordData, emergencyData] = await Promise.all([
        apiFetch<Page<UnifiedMedicalRecord>>("/patient/records"),
        apiFetch<Page<EmergencyAccessLog>>("/patient/emergency-access-logs?size=20"),
      ]);
      setRecords(recordData.content);
      setEmergencyLogs(emergencyData.content);
    } catch (error) {
      setMessage(friendlyErrorMessage(error, "Không tải được hồ sơ"));
    }
  }

  async function upload(event: FormEvent) {
    event.preventDefault();
    if (!file) return;
    setBusy(true);
    setMessage("");
    try {
      const data = new FormData();
      data.append("file", file);
      const pending = await apiFetch<PendingRecordUpload>("/patient/records", { method: "POST", body: data });
      const chain = await createOnChainRecordWithMetadata(pending);
      await apiFetch("/patient/records/confirm", {
        method: "POST",
        body: JSON.stringify({ medicalFileId: pending.medicalFileId, onChainRecordId: chain.recordId, transactionHash: chain.transactionHash }),
      });
      setMessage("Đã tải hồ sơ bệnh án lên thành công.");
      setFile(null);
      await load();
    } catch (error) {
      setMessage(friendlyErrorMessage(error, "Tải hồ sơ lên thất bại"));
    } finally {
      setBusy(false);
    }
  }

  async function download(record: UnifiedMedicalRecord) {
    try {
      const blob = await apiDownload(`/patient/records/${record.recordId}/content`);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = record.originalFileName;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setMessage(friendlyErrorMessage(error, "Không thể tải tệp"));
    }
  }

  async function loadHistory(record: UnifiedMedicalRecord) {
    setHistoryRecord(record);
    setHistoryBusy(true);
    setMessage("");
    try {
      setHistoryLogs(await apiFetch<RecordAuditLog[]>(`/patient/records/${record.recordId}/audit-logs`));
    } catch (error) {
      setHistoryLogs([]);
      setMessage(friendlyErrorMessage(error, "Không tải được lịch sử hoạt động"));
    } finally {
      setHistoryBusy(false);
    }
  }

  async function checkIntegrity(record: UnifiedMedicalRecord) {
    setMessage("");
    try {
      const result = await apiFetch<RecordIntegrity>(`/patient/records/${record.recordId}/integrity`);
      setIntegrity(result);
      setMessage(integrityTitle(result));
      if (historyRecord?.recordId === record.recordId) await loadHistory(record);
    } catch (error) {
      setMessage(friendlyErrorMessage(error, "Không kiểm tra được tính toàn vẹn"));
    }
  }

  async function endEmergencyAccess(log: EmergencyAccessLog, reason: string) {
    setEndingEmergencyId(log.id);
    setMessage("");
    try {
      await apiFetch(`/patient/emergency-access/${log.id}/end`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      await load();
      setMessage("Đã kết thúc quyền truy cập khẩn cấp. Các lần đọc tiếp theo sẽ bị chặn.");
      setEmergencyToEnd(null);
    } catch (error) {
      setMessage(friendlyErrorMessage(error, "Không thể kết thúc quyền truy cập khẩn cấp"));
    } finally {
      setEndingEmergencyId(null);
    }
  }

  async function copyValue(label: string, value: string) {
    await navigator.clipboard.writeText(value);
    setMessage(`Đã sao chép ${label}.`);
  }

  if (access !== "allowed") return <AccessState access={access} />;

  return (
    <section className="grid gap-6">
      <div>
        <p className="badge">Bệnh án cá nhân</p>
        <h1 className="mt-3 section-title">Hồ sơ bệnh án của tôi</h1>
        <p className="mt-2 text-slate-600">
          Tải lên, xem và theo dõi lịch sử thao tác với hồ sơ bệnh án.
        </p>
      </div>

      <form className="card flex flex-wrap items-end gap-3" onSubmit={upload}>
        <label className="grid flex-1 gap-2 text-sm font-bold text-slate-700">
          Chọn tệp PDF, JSON, JPEG hoặc PNG
          <input className="input" type="file" required onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        </label>
        <button className="btn-primary" disabled={busy}>{busy ? "Đang xử lý..." : "Tải hồ sơ lên"}</button>
      </form>

      {message && <p className="status">{message}</p>}

      <section className="card grid gap-4 border-amber-100 bg-amber-50/40">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="badge border-amber-200 bg-white text-amber-800">Nhật ký khẩn cấp</p>
            <h2 className="mt-3 text-xl font-black">Truy cập khẩn cấp vào hồ sơ của bạn</h2>
            <p className="mt-1 muted">Mỗi lần cơ sở y tế mở quyền khẩn cấp đều được ghi lại với lý do và thời hạn.</p>
          </div>
          <button className="btn-secondary" type="button" onClick={load}>Làm mới</button>
        </div>
        <div className="grid gap-3">
          {emergencyLogs.length === 0 && <p className="muted">Chưa có truy cập khẩn cấp nào.</p>}
          {emergencyLogs.map((log) => (
            <article className="rounded-2xl border border-amber-200 bg-white p-4" key={log.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-black text-slate-950">{log.facilityName}</p>
                  <p className="mt-1 text-sm text-slate-600">Bác sĩ {log.doctorName} · ca {log.caseCode}</p>
                </div>
                <span className={log.active ? "badge border-red-200 bg-red-50 text-red-800" : "badge"}>
                  {log.active ? "Còn hiệu lực" : log.endedAt ? "Đã kết thúc" : "Đã hết hạn"}
                </span>
              </div>
              <p className="mt-3 text-sm text-slate-700"><b>Lý do:</b> {log.reason}</p>
              <div className="mt-3 grid gap-2 text-xs font-semibold text-slate-500 md:grid-cols-2">
                <p>Bắt đầu: {new Date(log.createdAt).toLocaleString("vi-VN")}</p>
                <p>Hết hạn: {new Date(log.expiresAt).toLocaleString("vi-VN")}</p>
                {log.endedAt && <p>Kết thúc lúc: {new Date(log.endedAt).toLocaleString("vi-VN")}</p>}
                {log.endReason && <p>Lý do kết thúc: {log.endReason}</p>}
              </div>
              {log.active && (
                <button
                  className="btn-danger mt-4"
                  type="button"
                  disabled={endingEmergencyId === log.id}
                  onClick={() => setEmergencyToEnd(log)}
                >
                  {endingEmergencyId === log.id ? "Đang kết thúc..." : "Kết thúc quyền khẩn cấp"}
                </button>
              )}
            </article>
          ))}
        </div>
      </section>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Tệp</th>
              <th>Phiên bản</th>
              <th>Nguồn</th>
              <th>Người tải lên</th>
              <th>Cơ sở</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.recordId}>
                <td className="font-semibold">{record.originalFileName}</td>
                <td>
                  <span className={record.status === "ACTIVE" ? "badge" : "badge border-amber-200 bg-amber-50 text-amber-700"}>
                    {record.status === "ACTIVE" ? "Hiện hành" : "Đã đính chính"}
                  </span>
                  {record.correctionReason && <p className="mt-1 text-xs text-slate-500">Lý do: {record.correctionReason}</p>}
                  {record.previousRecordId && <p className="mt-1 text-xs text-slate-500">Đính chính từ hồ sơ #{record.previousRecordId}</p>}
                </td>
                <td>{sourceLabel(record.sourceType)}</td>
                <td>{record.uploaderName}</td>
                <td>{record.facilityName ?? "-"}</td>
                <td>
                  <div className="flex flex-wrap gap-2">
                    <button className="btn-secondary" onClick={() => loadHistory(record)}>Xem lịch sử</button>
                    <button className="btn-secondary" onClick={() => setSelectedRecord(record)}>Xem mã hồ sơ</button>
                    <button className="btn-secondary" onClick={() => checkIntegrity(record)}>Kiểm tra toàn vẹn</button>
                    <button className="btn-secondary" onClick={() => download(record)}>Tải xuống</button>
                  </div>
                </td>
              </tr>
            ))}
            {!records.length && <tr><td colSpan={6} className="text-center text-slate-500">Chưa có bệnh án.</td></tr>}
          </tbody>
        </table>
      </div>

      {selectedRecord && (
        <section className="card grid gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="badge">Định danh hồ sơ</p>
              <h2 className="mt-3 text-2xl font-black">{selectedRecord.originalFileName}</h2>
              <p className="mt-2 muted">Các mã dưới đây được lấy trực tiếp từ API, không cần truy cập MySQL.</p>
            </div>
            <button className="btn-secondary" type="button" onClick={() => setSelectedRecord(null)}>Đóng</button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <RecordCode label="Mã hồ sơ hệ thống (recordId)" value={String(selectedRecord.recordId)} onCopy={copyValue} />
            <RecordCode label="Mã hồ sơ blockchain (onChainRecordId)" value={String(selectedRecord.onChainRecordId)} onCopy={copyValue} />
            <RecordCode label="Mã giao dịch (transactionHash)" value={selectedRecord.blockchainTxHash} onCopy={copyValue} />
            <RecordCode label="CID lưu trữ IPFS" value={selectedRecord.cid} onCopy={copyValue} />
            <RecordCode label="Mã toàn vẹn (contentHash)" value={selectedRecord.contentHash} onCopy={copyValue} />
          </div>
          {getSession()?.user.wallets[0] && (
            <Link
              className="btn-primary w-fit"
              href={`/blockchain?recordIdType=blockchain&recordId=${encodeURIComponent(String(selectedRecord.onChainRecordId))}`}
            >
              Kiểm tra hồ sơ trên blockchain
            </Link>
          )}
        </section>
      )}

      {integrity && (
        <section className={integrity.valid ? "card border-emerald-100 bg-emerald-50/50" : "card border-red-100 bg-red-50/70"}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className={integrity.valid ? "badge border-emerald-200 bg-emerald-100 text-emerald-900" : "badge border-red-200 bg-red-100 text-red-900"}>
                {integrity.valid ? "Toàn vẹn" : "Cảnh báo"}
              </p>
              <h2 className="mt-3 text-2xl font-black">{integrityTitle(integrity)}</h2>
              <p className="mt-2 muted">Kiểm tra lần cuối: {new Date(integrity.checkedAt).toLocaleString("vi-VN")}</p>
            </div>
            <span className="rounded-full bg-white px-4 py-2 text-sm font-black text-slate-700">Record #{integrity.recordId}</span>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <IntegrityItem label="Đọc IPFS" ok={integrity.storageReadable} />
            <IntegrityItem label="Đọc on-chain" ok={integrity.blockchainReadable} />
            <IntegrityItem label="CID khớp on-chain" ok={integrity.cidMatches} />
            <IntegrityItem label="Hash DB khớp on-chain" ok={integrity.databaseHashMatchesOnChain} />
            <IntegrityItem label="Hash file khớp on-chain" ok={integrity.computedHashMatchesOnChain} />
          </div>
          <div className="mt-5 grid gap-3 text-xs md:grid-cols-2">
            <HashBox label="CID trong DB" value={integrity.databaseCid} />
            <HashBox label="CID on-chain" value={integrity.onChainCid ?? "Không đọc được on-chain"} />
            <HashBox label="Hash trong DB" value={integrity.databaseHash} />
            <HashBox label="Hash on-chain" value={integrity.onChainHash ?? "Không đọc được on-chain"} />
            <HashBox label="Hash tính lại từ file" value={integrity.computedHash ?? "Không đọc được file"} />
          </div>
        </section>
      )}

      <ReasonDialog
        open={emergencyToEnd !== null}
        title="Kết thúc quyền truy cập khẩn cấp"
        description={emergencyToEnd
          ? `Quyền của ${emergencyToEnd.facilityName} sẽ bị chặn ngay, dù thời hạn ban đầu chưa kết thúc.`
          : ""}
        label="Lý do kết thúc"
        confirmLabel="Kết thúc quyền"
        defaultValue=""
        maxLength={500}
        busy={emergencyToEnd !== null && endingEmergencyId === emergencyToEnd.id}
        onCancel={() => setEmergencyToEnd(null)}
        onConfirm={async (reason) => {
          if (emergencyToEnd) await endEmergencyAccess(emergencyToEnd, reason);
        }}
      />

      {historyRecord && (
        <section className="card grid gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="badge">Lịch sử hoạt động</p>
              <h2 className="mt-3 text-2xl font-black">{historyRecord.originalFileName}</h2>
              <p className="mt-2 muted">
                Lịch sử tạo, xem, tải và chỉnh sửa hồ sơ.
              </p>
            </div>
            <button className="btn-secondary" onClick={() => loadHistory(historyRecord)} disabled={historyBusy}>
              {historyBusy ? "Đang tải..." : "Làm mới"}
            </button>
          </div>

          <div className="grid gap-3">
            {historyBusy && <p className="status">Đang tải lịch sử hoạt động...</p>}
            {!historyBusy && historyLogs.length === 0 && <p className="muted">Chưa có hoạt động nào được ghi nhận.</p>}
            {historyLogs.map((log) => {
              const emergency = log.action.startsWith("EMERGENCY_");
              return (
              <article
                className={emergency
                  ? "rounded-2xl border border-red-200 bg-red-50/70 p-4"
                  : "rounded-2xl border border-slate-200 bg-white p-4"}
                key={log.id}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-black text-slate-950">{ACTION_LABELS[log.action] ?? log.action}</p>
                      {emergency && <span className="badge border-red-200 bg-white text-red-800">Bằng quyền khẩn cấp</span>}
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {log.actorName} · {log.actorRoles.map(roleLabel).join(", ")}
                    </p>
                  </div>
                  <span className="badge">{new Date(log.createdAt).toLocaleString("vi-VN")}</span>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                  <p><b>Tệp:</b> {log.medicalFileName ?? "-"}</p>
                  <p><b>Cơ sở:</b> {log.facilityName ?? log.facilityId ?? "-"}</p>
                </div>
                {emergency && (
                  <div className="mt-4 rounded-2xl border border-red-100 bg-white p-4 text-sm text-slate-700">
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <p><b>Mã ca cấp cứu:</b> {log.emergencyCaseCode ?? "-"}</p>
                      <p><b>Bác sĩ mở quyền:</b> {log.emergencyDoctorName ?? log.actorName}</p>
                      <p><b>Cơ sở cấp cứu:</b> {log.emergencyFacilityName ?? log.facilityName ?? "-"}</p>
                      <p>
                        <b>Trạng thái lúc thao tác:</b>{" "}
                        {log.emergencyActiveAtActionTime === false ? "Đã hết hiệu lực" : "Còn hiệu lực"}
                      </p>
                      <p><b>Bắt đầu:</b> {log.emergencyStartedAt ? new Date(log.emergencyStartedAt).toLocaleString("vi-VN") : "-"}</p>
                      <p><b>Hết hạn:</b> {log.emergencyExpiresAt ? new Date(log.emergencyExpiresAt).toLocaleString("vi-VN") : "-"}</p>
                    </div>
                    <p className="mt-3"><b>Lý do khẩn cấp:</b> {log.emergencyReason ?? "Chưa có lý do được ghi nhận."}</p>
                  </div>
                )}
              </article>
              );
            })}
          </div>
        </section>
      )}
    </section>
  );
}

function integrityTitle(integrity: RecordIntegrity) {
  if (integrity.valid) return "Bệnh án toàn vẹn";
  if (integrity.status === "ON_CHAIN_UNREADABLE") {
    return "Không đọc được dữ liệu on-chain của bệnh án";
  }
  if (!integrity.storageReadable) return "Không đọc hoặc giải mã được file bệnh án";
  return "Bệnh án có dấu hiệu bị thay đổi";
}

function IntegrityItem({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white p-4">
      <p className={ok ? "font-black text-emerald-700" : "font-black text-red-700"}>{ok ? "Đạt" : "Không đạt"}</p>
      <p className="mt-1 text-sm text-slate-600">{label}</p>
    </div>
  );
}

function HashBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="font-bold text-slate-700">{label}</p>
      <p className="mt-2 break-all font-mono text-slate-600">{value}</p>
    </div>
  );
}

function RecordCode({ label, value, onCopy }: { label: string; value: string; onCopy: (label: string, value: string) => Promise<void> }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 break-all font-mono text-sm text-slate-900">{value}</p>
      <button className="btn-secondary mt-3" type="button" onClick={() => void onCopy(label, value)}>Sao chép</button>
    </div>
  );
}

function sourceLabel(sourceType: UnifiedMedicalRecord["sourceType"]) {
  return sourceType === "PATIENT_UPLOADED" ? "Bệnh nhân tải lên" : "Bác sĩ tải lên";
}

function roleLabel(role: string) {
  if (role === "PATIENT") return "Bệnh nhân";
  if (role === "DOCTOR") return "Bác sĩ";
  if (role === "ADMIN") return "Quản trị";
  return role;
}
