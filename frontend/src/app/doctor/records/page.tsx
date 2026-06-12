"use client";

import { FormEvent, useEffect, useState } from "react";
import { WalletCard } from "@/components/wallet-card";
import { AccessState } from "@/components/access-state";
import { apiDownload, apiFetch, getSession } from "@/lib/api/client";
import { MedicalRecord, Page, PatientSummary, UploadedFile } from "@/lib/api/types";
import { useRequiredRole } from "@/lib/auth/use-required-role";
import { createOnChainRecord, createOnChainRecordVersion, shortAddress } from "@/lib/web3/provider";

export default function DoctorRecordsPage() {
  const access = useRequiredRole("DOCTOR");
  const [doctorWallet, setDoctorWallet] = useState("");
  const [patientWallet, setPatientWallet] = useState("");
  const [patientId, setPatientId] = useState("");
  const [query, setQuery] = useState("");
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [title, setTitle] = useState("");
  const [recordType, setRecordType] = useState("DIAGNOSIS");
  const [file, setFile] = useState<File | null>(null);
  const [correctionFiles, setCorrectionFiles] = useState<Record<number, File | null>>({});
  const [correctionReasons, setCorrectionReasons] = useState<Record<number, string>>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const wallet = getSession()?.user.wallets[0];
    if (wallet) setDoctorWallet(wallet);
  }, []);

  async function searchPatients(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    try {
      const page = await apiFetch<Page<PatientSummary>>(`/patients?query=${encodeURIComponent(query)}&size=20`);
      setPatients(page.content);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Khong the tim benh nhan");
    }
  }

  async function createRecord(event: FormEvent) {
    event.preventDefault();
    if (!file) return setMessage("Hay chon file benh an.");
    setBusy(true);
    try {
      setMessage("Dang ma hoa va tai file len IPFS...");
      const body = new FormData();
      body.append("file", file);
      const uploaded = await apiFetch<UploadedFile>(
        `/medical-records/patients/${patientId}/files?patientWallet=${patientWallet}&doctorWallet=${doctorWallet}`,
        { method: "POST", body },
      );
      setMessage("File da tai len. Hay ky giao dich ghi CID/hash trong MetaMask...");
      const onChain = await createOnChainRecord(patientWallet, doctorWallet, uploaded.cid, uploaded.contentHash);
      setMessage("Dang xac minh on-chain va luu metadata benh an...");
      await apiFetch("/medical-records", {
        method: "POST",
        body: JSON.stringify({
          patientProfileId: Number(patientId),
          title,
          recordType,
          medicalFileId: uploaded.fileId,
          onChainRecordId: onChain.recordId,
          patientWallet,
          doctorWallet,
        }),
      });
      setMessage(`Tao benh an thanh cong. Transaction: ${shortAddress(onChain.transactionHash)}`);
      setTitle("");
      setFile(null);
      await loadRecords();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Khong the tao benh an");
    } finally {
      setBusy(false);
    }
  }

  async function correctRecord(event: FormEvent, record: MedicalRecord) {
    event.preventDefault();
    const correctionFile = correctionFiles[record.id];
    const correctionReason = correctionReasons[record.id]?.trim();
    if (!correctionFile) return setMessage("Hay chon file ban chinh sua.");
    if (!correctionReason) return setMessage("Hay nhap ly do sua benh an.");
    setBusy(true);
    try {
      setMessage("Dang upload file ban chinh sua len IPFS...");
      const body = new FormData();
      body.append("file", correctionFile);
      const uploaded = await apiFetch<UploadedFile>(
        `/medical-records/patients/${patientId}/files?patientWallet=${patientWallet}&doctorWallet=${doctorWallet}`,
        { method: "POST", body },
      );
      setMessage("Hay ky giao dich tao phien ban moi tren blockchain...");
      const onChain = await createOnChainRecordVersion(record.onChainRecordId, doctorWallet, uploaded.cid, uploaded.contentHash);
      setMessage("Dang xac minh va luu ban chinh sua...");
      await apiFetch(`/medical-records/${record.id}/corrections`, {
        method: "POST",
        body: JSON.stringify({
          title: `${record.title} - ban chinh sua`,
          recordType: record.recordType,
          medicalFileId: uploaded.fileId,
          onChainRecordId: onChain.recordId,
          correctionReason,
          patientWallet,
          doctorWallet,
        }),
      });
      setMessage(`Da tao ban chinh sua. Transaction: ${shortAddress(onChain.transactionHash)}`);
      setCorrectionFiles((current) => ({ ...current, [record.id]: null }));
      setCorrectionReasons((current) => ({ ...current, [record.id]: "" }));
      await loadRecords();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Khong the sua benh an");
    } finally {
      setBusy(false);
    }
  }

  async function loadRecords() {
    if (!patientId || !patientWallet || !doctorWallet) {
      return setMessage("Can du ID benh nhan va hai dia chi vi.");
    }
    setBusy(true);
    try {
      const page = await apiFetch<Page<MedicalRecord>>(
        `/medical-records?patientProfileId=${patientId}&patientWallet=${patientWallet}&doctorWallet=${doctorWallet}&size=50`,
      );
      setRecords(page.content);
      setMessage(`Da tai ${page.totalElements} benh an.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Khong the tai benh an");
    } finally {
      setBusy(false);
    }
  }

  async function download(recordId: number, fileId: number, filename: string) {
    try {
      const blob = await apiDownload(
        `/medical-records/${recordId}/files/${fileId}/content?patientWallet=${patientWallet}&doctorWallet=${doctorWallet}`,
      );
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Khong the tai file");
    }
  }

  if (access !== "allowed") return <AccessState access={access} />;
  return (
    <section className="grid gap-6">
      <div>
        <p className="label text-blue-700">Doctor workspace</p>
        <h1 className="mt-2 text-3xl font-bold">Quan ly benh an</h1>
        <p className="mt-2 text-slate-600">
          Backend kiem tra dong thoi quyen ung dung, quyen smart contract, CID/hash va phien ban benh an.
        </p>
      </div>
      <WalletCard onConnected={setDoctorWallet} />

      <div className="grid gap-6 lg:grid-cols-2">
        <form className="card grid gap-4" onSubmit={searchPatients}>
          <h2 className="text-lg font-bold">1. Tim benh nhan</h2>
          <div className="flex gap-2">
            <input className="input" required placeholder="Ma hoac ten benh nhan" value={query} onChange={(e) => setQuery(e.target.value)} />
            <button className="btn-secondary">Tim</button>
          </div>
          <div className="grid max-h-56 gap-2 overflow-auto">
            {patients.map((patient) => (
              <button className="rounded-lg border p-3 text-left hover:border-blue-400" type="button" key={patient.id} onClick={() => setPatientId(String(patient.id))}>
                <strong>{patient.fullName}</strong>
                <span className="ml-2 text-xs text-slate-500">{patient.patientCode} - ID {patient.id}</span>
              </button>
            ))}
          </div>
        </form>
        <div className="card grid gap-4">
          <h2 className="text-lg font-bold">2. Xac dinh pham vi truy cap</h2>
          <label className="grid gap-1 text-sm font-medium">ID ho so benh nhan<input className="input" type="number" min="1" value={patientId} onChange={(e) => setPatientId(e.target.value)} /></label>
          <label className="grid gap-1 text-sm font-medium">Vi benh nhan<input className="input font-mono" pattern="^0x[0-9a-fA-F]{40}$" value={patientWallet} onChange={(e) => setPatientWallet(e.target.value)} /></label>
          <label className="grid gap-1 text-sm font-medium">Vi bac si<input className="input font-mono" pattern="^0x[0-9a-fA-F]{40}$" value={doctorWallet} onChange={(e) => setDoctorWallet(e.target.value)} /></label>
          <button className="btn-secondary" disabled={busy} onClick={loadRecords}>Kiem tra quyen va tai danh sach</button>
        </div>
      </div>

      <form className="card grid gap-4" onSubmit={createRecord}>
        <h2 className="text-lg font-bold">3. Tao benh an moi</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="grid gap-1 text-sm font-medium">Tieu de<input className="input" required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} /></label>
          <label className="grid gap-1 text-sm font-medium">Loai benh an<select className="input" value={recordType} onChange={(e) => setRecordType(e.target.value)}><option>DIAGNOSIS</option><option>LAB_RESULT</option><option>IMAGING</option><option>PRESCRIPTION</option></select></label>
          <label className="grid gap-1 text-sm font-medium">File benh an<input className="input" type="file" required accept=".json,.pdf,image/jpeg,image/png" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>
        </div>
        {message && <p className="status">{message}</p>}
        <button className="btn-primary w-fit" disabled={busy || !patientId || !patientWallet || !doctorWallet}>{busy ? "Dang xu ly..." : "Upload, ky va tao benh an"}</button>
      </form>

      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Benh an duoc phep truy cap</h2>
          <button className="btn-secondary" disabled={busy} onClick={loadRecords}>Lam moi</button>
        </div>
        <div className="grid gap-4">
          {records.map((record) => (
            <article className="rounded-xl border border-slate-200 p-4" key={record.id}>
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <h3 className="font-bold">{record.title}</h3>
                  <p className="text-sm text-slate-500">
                    {record.recordType} - {record.status} - On-chain #{record.onChainRecordId} - {new Date(record.createdAt).toLocaleString("vi-VN")}
                  </p>
                </div>
              </div>
              {record.previousRecordId && <p className="mt-2 text-sm text-slate-600">Ban chinh sua cua benh an #{record.previousRecordId}. Ly do: {record.correctionReason}</p>}
              {record.successorRecordId && <p className="mt-2 text-sm text-amber-700">Da co ban chinh sua moi: #{record.successorRecordId}. Khong nen dung ban cu de ra quyet dinh dieu tri.</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {record.files.map((item) => (
                  <button className="btn-secondary" key={item.id} onClick={() => download(record.id, item.id, item.originalFilename)}>
                    Tai {item.originalFilename}
                  </button>
                ))}
              </div>
              {record.status === "ACTIVE" && (
                <form className="mt-4 grid gap-3 rounded-lg bg-slate-50 p-3" onSubmit={(event) => correctRecord(event, record)}>
                  <h4 className="font-semibold">Sua benh an bang ban moi</h4>
                  <textarea className="input min-h-20" required maxLength={500} placeholder="Ly do sua: sai chan doan, sai don thuoc..."
                    value={correctionReasons[record.id] ?? ""} onChange={(event) => setCorrectionReasons((current) => ({ ...current, [record.id]: event.target.value }))} />
                  <input className="input" type="file" required accept=".json,.pdf,image/jpeg,image/png"
                    onChange={(event) => setCorrectionFiles((current) => ({ ...current, [record.id]: event.target.files?.[0] ?? null }))} />
                  <button className="btn-secondary w-fit" disabled={busy || !patientId || !patientWallet || !doctorWallet}>Upload, ky va tao ban chinh sua</button>
                </form>
              )}
            </article>
          ))}
          {!records.length && <p className="text-sm text-slate-500">Chua tai danh sach hoac khong co benh an.</p>}
        </div>
      </div>
    </section>
  );
}
