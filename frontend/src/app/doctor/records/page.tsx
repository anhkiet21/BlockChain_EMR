"use client";

import { FormEvent, useEffect, useState } from "react";
import { AccessState } from "@/components/access-state";
import { useRequiredRole } from "@/lib/auth/use-required-role";
import { apiDownload, apiFetch } from "@/lib/api/client";
import { DoctorProfile, Page, PatientSummary, PendingRecordUpload, UnifiedMedicalRecord } from "@/lib/api/types";
import { createOnChainRecordWithMetadata } from "@/lib/web3/provider";

export default function DoctorRecordsPage() {
  const access = useRequiredRole("DOCTOR"); const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [query, setQuery] = useState(""); const [patients, setPatients] = useState<PatientSummary[]>([]); const [patient, setPatient] = useState<PatientSummary | null>(null);
  const [records, setRecords] = useState<UnifiedMedicalRecord[]>([]); const [reason, setReason] = useState(""); const [file, setFile] = useState<File | null>(null); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { if (access === "allowed") apiFetch<DoctorProfile>("/doctors/me").then(setDoctor).catch((e) => setMessage(e.message)); }, [access]);
  async function search(event: FormEvent) { event.preventDefault(); try { setPatients((await apiFetch<Page<PatientSummary>>(`/patients?query=${encodeURIComponent(query)}`)).content); } catch (e) { setMessage(e instanceof Error ? e.message : "Tim kiem that bai"); } }
  async function requestAccess() { if (!patient) return; try { await apiFetch("/doctor/access-requests", { method: "POST", body: JSON.stringify({ patientIdentifier: patient.patientCode, reason }) }); setMessage("Da gui yeu cau truy cap cho benh nhan."); } catch (e) { setMessage(e instanceof Error ? e.message : "Khong gui duoc yeu cau"); } }
  async function loadRecords(selected = patient) { if (!selected) return; setPatient(selected); try { setRecords((await apiFetch<Page<UnifiedMedicalRecord>>(`/doctor/records?patientId=${selected.id}`)).content); setMessage("Co so y te da duoc cap quyen."); } catch (e) { setRecords([]); setMessage(e instanceof Error ? e.message : "Chua co quyen truy cap"); } }
  async function upload(event: FormEvent) { event.preventDefault(); if (!patient || !file) return; setBusy(true); try { const data = new FormData(); data.append("file", file); const pending = await apiFetch<PendingRecordUpload>(`/doctor/records?patientId=${patient.id}`, { method: "POST", body: data }); const chain = await createOnChainRecordWithMetadata(pending); await apiFetch("/doctor/records/confirm", { method: "POST", body: JSON.stringify({ medicalFileId: pending.medicalFileId, onChainRecordId: chain.recordId, transactionHash: chain.transactionHash }) }); setMessage("Da tao ho so DOCTOR_UPLOADED."); await loadRecords(); } catch (e) { setMessage(e instanceof Error ? e.message : "Upload that bai"); } finally { setBusy(false); } }
  async function download(record: UnifiedMedicalRecord) { const blob = await apiDownload(`/doctor/records/${record.recordId}/content`); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = record.originalFileName; a.click(); URL.revokeObjectURL(url); }
  if (access !== "allowed") return <AccessState access={access} />;
  const ready = doctor?.verificationStatus === "VERIFIED" && !!doctor;
  return <section className="grid gap-6"><div><p className="label text-blue-700">Doctor workspace</p><h1 className="mt-2 text-3xl font-bold">Ho so benh nhan</h1><p className="mt-2 text-slate-600">Trang thai: {doctor?.verificationStatus ?? "..."} · {doctor?.facility?.name ?? "Chua co co so"}</p></div>
    {!ready && <p className="status">Tai khoan bac si dang cho admin xac thuc.</p>}{message && <p className="status">{message}</p>}
    {ready && <><form className="card flex gap-3" onSubmit={search}><input className="input" required minLength={3} placeholder="Nhap CCCD hoac ten benh nhan" value={query} onChange={(e) => setQuery(e.target.value)} /><button className="btn-primary">Tim</button></form>
    <div className="grid gap-3">{patients.map((p) => <div className="card flex flex-wrap items-center justify-between gap-3" key={p.id}><div><b>{p.fullName}</b><p className="text-sm text-slate-500">{p.patientCode}</p></div><button className="btn-secondary" onClick={() => loadRecords(p)}>Kiem tra quyen / xem ho so</button></div>)}</div>
    {patient && <div className="grid gap-4 lg:grid-cols-2"><div className="card grid gap-3"><h2 className="font-bold">Yeu cau quyen cho {patient.fullName}</h2><textarea className="input" required placeholder="Ly do truy cap" value={reason} onChange={(e) => setReason(e.target.value)} /><button className="btn-primary" onClick={requestAccess}>Gui yeu cau</button></div><form className="card grid gap-3" onSubmit={upload}><h2 className="font-bold">Upload ho so</h2><input className="input" type="file" required onChange={(e) => setFile(e.target.files?.[0] ?? null)} /><button className="btn-primary" disabled={busy}>{busy ? "Dang upload va ky..." : "Upload"}</button></form></div>}
    <div className="table-wrap"><table><thead><tr><th>File</th><th>Nguon</th><th>Uploader</th><th>Co so</th><th></th></tr></thead><tbody>{records.map((r) => <tr key={r.recordId}><td>{r.originalFileName}</td><td>{r.sourceType}</td><td>{r.uploaderName}</td><td>{r.facilityName ?? "-"}</td><td><button className="btn-secondary" onClick={() => download(r)}>Tai file</button></td></tr>)}</tbody></table></div></>}
  </section>;
}
