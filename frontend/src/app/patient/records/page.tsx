"use client";

import { FormEvent, useEffect, useState } from "react";
import { AccessState } from "@/components/access-state";
import { useRequiredRole } from "@/lib/auth/use-required-role";
import { apiDownload, apiFetch } from "@/lib/api/client";
import { Page, PendingRecordUpload, UnifiedMedicalRecord } from "@/lib/api/types";
import { createOnChainRecordWithMetadata } from "@/lib/web3/provider";

export default function PatientRecordsPage() {
  const access = useRequiredRole("PATIENT"); const [records, setRecords] = useState<UnifiedMedicalRecord[]>([]);
  const [file, setFile] = useState<File | null>(null); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { if (access === "allowed") load(); }, [access]);
  async function load() { try { setRecords((await apiFetch<Page<UnifiedMedicalRecord>>("/patient/records")).content); } catch (e) { setMessage(e instanceof Error ? e.message : "Khong tai duoc ho so"); } }
  async function upload(event: FormEvent) {
    event.preventDefault(); if (!file) return; setBusy(true); setMessage("");
    try {
      const data = new FormData(); data.append("file", file);
      const pending = await apiFetch<PendingRecordUpload>("/patient/records", { method: "POST", body: data });
      const chain = await createOnChainRecordWithMetadata(pending);
      await apiFetch("/patient/records/confirm", { method: "POST", body: JSON.stringify({ medicalFileId: pending.medicalFileId, onChainRecordId: chain.recordId, transactionHash: chain.transactionHash }) });
      setMessage(`Da tao ho so ${pending.sourceType}.`); setFile(null); await load();
    } catch (e) { setMessage(e instanceof Error ? e.message : "Upload that bai"); } finally { setBusy(false); }
  }
  async function download(record: UnifiedMedicalRecord) { const blob = await apiDownload(`/patient/records/${record.recordId}/content`); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = record.originalFileName; a.click(); URL.revokeObjectURL(url); }
  if (access !== "allowed") return <AccessState access={access} />;
  return <section className="grid gap-6"><div><p className="label text-blue-700">Patient records</p><h1 className="mt-2 text-3xl font-bold">Ho so benh an cua toi</h1></div>
    <form className="card flex flex-wrap items-end gap-3" onSubmit={upload}><label className="grid flex-1 gap-1 text-sm font-medium">File PDF, JSON, JPEG hoac PNG<input className="input" type="file" required onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label><button className="btn-primary" disabled={busy}>{busy ? "Dang upload va ky..." : "Upload ho so"}</button></form>
    {message && <p className="status">{message}</p>}
    <div className="table-wrap"><table><thead><tr><th>File</th><th>Nguon</th><th>Nguoi upload</th><th>Co so</th><th>CID / Hash</th><th></th></tr></thead><tbody>{records.map((r) => <tr key={r.recordId}><td>{r.originalFileName}</td><td>{r.sourceType}</td><td>{r.uploaderName}</td><td>{r.facilityName ?? "-"}</td><td className="max-w-xs break-all text-xs">{r.cid}<br />{r.contentHash}</td><td><button className="btn-secondary" onClick={() => download(r)}>Tai file</button></td></tr>)}</tbody></table></div>
  </section>;
}
