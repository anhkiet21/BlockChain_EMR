"use client";

import { FormEvent, useEffect, useState } from "react";
import { AccessState } from "@/components/access-state";
import { useRequiredRole } from "@/lib/auth/use-required-role";
import { apiDownload, apiFetch } from "@/lib/api/client";
import { Page, PendingRecordUpload, RecordAuditLog, UnifiedMedicalRecord } from "@/lib/api/types";
import { createOnChainRecordWithMetadata } from "@/lib/web3/provider";

const ACTION_LABELS: Record<string, string> = {
  UPLOAD: "Tải file lên",
  CREATE: "Tạo bệnh án",
  VIEW: "Xem bệnh án",
  DOWNLOAD: "Tải file",
  EDIT: "Chỉnh sửa",
  CORRECT: "Tạo bản sửa",
};

export default function PatientRecordsPage() {
  const access = useRequiredRole("PATIENT");
  const [records, setRecords] = useState<UnifiedMedicalRecord[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [auditRecord, setAuditRecord] = useState<UnifiedMedicalRecord | null>(null);
  const [auditLogs, setAuditLogs] = useState<RecordAuditLog[]>([]);
  const [auditBusy, setAuditBusy] = useState(false);

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
      setMessage(`Đã tạo hồ sơ ${pending.sourceType}.`);
      setFile(null);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload thất bại");
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
      setMessage(error instanceof Error ? error.message : "Không thể tải file");
    }
  }

  async function loadAudit(record: UnifiedMedicalRecord) {
    setAuditRecord(record);
    setAuditBusy(true);
    setMessage("");
    try {
      setAuditLogs(await apiFetch<RecordAuditLog[]>(`/patient/records/${record.recordId}/audit-logs`));
    } catch (error) {
      setAuditLogs([]);
      setMessage(error instanceof Error ? error.message : "Không tải được audit log");
    } finally {
      setAuditBusy(false);
    }
  }

  if (access !== "allowed") return <AccessState access={access} />;

  return (
    <section className="grid gap-6">
      <div>
        <p className="badge">Bệnh án cá nhân</p>
        <h1 className="mt-3 section-title">Hồ sơ bệnh án của tôi</h1>
        <p className="mt-2 text-slate-600">
          Tải file lên IPFS, ký giao dịch on-chain, xem CID/hash và theo dõi audit ai đã thao tác với bệnh án.
        </p>
      </div>

      <form className="card flex flex-wrap items-end gap-3" onSubmit={upload}>
        <label className="grid flex-1 gap-2 text-sm font-bold text-slate-700">
          File PDF, JSON, JPEG hoặc PNG
          <input className="input" type="file" required onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        </label>
        <button className="btn-primary" disabled={busy}>{busy ? "Đang upload và ký..." : "Upload hồ sơ"}</button>
      </form>

      {message && <p className="status">{message}</p>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>File</th>
              <th>Nguồn</th>
              <th>Người upload</th>
              <th>Cơ sở</th>
              <th>CID / Hash</th>
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
                <td className="max-w-xs break-all font-mono text-xs">{record.cid}<br />{record.contentHash}</td>
                <td>
                  <div className="flex flex-wrap gap-2">
                    <button className="btn-secondary" onClick={() => loadAudit(record)}>Xem audit</button>
                    <button className="btn-secondary" onClick={() => download(record)}>Tải file</button>
                  </div>
                </td>
              </tr>
            ))}
            {!records.length && <tr><td colSpan={6} className="text-center text-slate-500">Chưa có bệnh án.</td></tr>}
          </tbody>
        </table>
      </div>

      {auditRecord && (
        <section className="card grid gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="badge">Audit bệnh án</p>
              <h2 className="mt-3 text-2xl font-black">{auditRecord.originalFileName}</h2>
              <p className="mt-2 muted">
                Lịch sử thao tác được ghi bởi backend mỗi khi bệnh án được tạo, xem, tải hoặc chỉnh sửa.
              </p>
            </div>
            <button className="btn-secondary" onClick={() => loadAudit(auditRecord)} disabled={auditBusy}>
              {auditBusy ? "Đang tải..." : "Làm mới audit"}
            </button>
          </div>

          <div className="grid gap-3">
            {auditBusy && <p className="status">Đang tải lịch sử audit...</p>}
            {!auditBusy && auditLogs.length === 0 && <p className="muted">Chưa có audit log cho bệnh án này.</p>}
            {auditLogs.map((log) => (
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
                  <p><b>File:</b> {log.medicalFileName ?? "-"}</p>
                  <p><b>Cơ sở:</b> {log.facilityName ?? log.facilityId ?? "-"}</p>
                  <p><b>Mã log:</b> #{log.id}</p>
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
  return sourceType === "PATIENT_UPLOADED" ? "Bệnh nhân upload" : "Bác sĩ upload";
}

function roleLabel(role: string) {
  if (role === "PATIENT") return "Bệnh nhân";
  if (role === "DOCTOR") return "Bác sĩ";
  if (role === "ADMIN") return "Quản trị";
  return role;
}
