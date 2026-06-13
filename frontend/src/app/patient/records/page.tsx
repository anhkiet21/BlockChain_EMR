"use client";

import { FormEvent, useEffect, useState } from "react";
import { AccessState } from "@/components/access-state";
import { useRequiredRole } from "@/lib/auth/use-required-role";
import { apiDownload, apiFetch } from "@/lib/api/client";
import { Page, PendingRecordUpload, RecordAuditLog, UnifiedMedicalRecord } from "@/lib/api/types";
import { createOnChainRecordWithMetadata } from "@/lib/web3/provider";

const ACTION_LABELS: Record<string, string> = {
  UPLOAD: "Tải tệp lên",
  CREATE: "Tạo bệnh án",
  VIEW: "Xem bệnh án",
  DOWNLOAD: "Tải tệp",
  EDIT: "Chỉnh sửa",
  CORRECT: "Tạo bản sửa",
};

export default function PatientRecordsPage() {
  const access = useRequiredRole("PATIENT");
  const [records, setRecords] = useState<UnifiedMedicalRecord[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [historyRecord, setHistoryRecord] = useState<UnifiedMedicalRecord | null>(null);
  const [historyLogs, setHistoryLogs] = useState<RecordAuditLog[]>([]);
  const [historyBusy, setHistoryBusy] = useState(false);

  useEffect(() => {
    if (access === "allowed") load();
  }, [access]);

  async function load() {
    try {
      setRecords((await apiFetch<Page<UnifiedMedicalRecord>>("/patient/records")).content);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không tải được hồ sơ");
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
      setMessage(error instanceof Error ? error.message : "Tải hồ sơ lên thất bại");
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
      setMessage(error instanceof Error ? error.message : "Không thể tải tệp");
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
      setMessage(error instanceof Error ? error.message : "Không tải được lịch sử hoạt động");
    } finally {
      setHistoryBusy(false);
    }
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

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Tệp</th>
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
                <td>{sourceLabel(record.sourceType)}</td>
                <td>{record.uploaderName}</td>
                <td>{record.facilityName ?? "-"}</td>
                <td>
                  <div className="flex flex-wrap gap-2">
                    <button className="btn-secondary" onClick={() => loadHistory(record)}>Xem lịch sử</button>
                    <button className="btn-secondary" onClick={() => download(record)}>Tải xuống</button>
                  </div>
                </td>
              </tr>
            ))}
            {!records.length && <tr><td colSpan={5} className="text-center text-slate-500">Chưa có bệnh án.</td></tr>}
          </tbody>
        </table>
      </div>

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
            {historyLogs.map((log) => (
              <article className="rounded-2xl border border-slate-200 bg-white p-4" key={log.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-black text-slate-950">{ACTION_LABELS[log.action] ?? log.action}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {log.actorName} · {log.actorRoles.map(roleLabel).join(", ")}
                    </p>
                  </div>
                  <span className="badge">{new Date(log.createdAt).toLocaleString("vi-VN")}</span>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-3">
                  <p><b>Tệp:</b> {log.medicalFileName ?? "-"}</p>
                  <p><b>Cơ sở:</b> {log.facilityName ?? log.facilityId ?? "-"}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </section>
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
