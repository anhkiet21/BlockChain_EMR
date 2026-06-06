"use client";

import { FormEvent, useEffect, useState } from "react";
import { WalletCard } from "@/components/wallet-card";
import { AccessState } from "@/components/access-state";
import { apiDownload, apiFetch, getSession } from "@/lib/api/client";
import { MedicalRecord, Page, PatientSummary, UploadedFile } from "@/lib/api/types";
import { useRequiredRole } from "@/lib/auth/use-required-role";
import { createOnChainRecord, shortAddress } from "@/lib/web3/provider";

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
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const wallet = getSession()?.user.wallets[0];
    if (wallet) setDoctorWallet(wallet);
  }, []);

  async function searchPatients(event: FormEvent) {
    event.preventDefault(); setMessage("");
    try {
      const page = await apiFetch<Page<PatientSummary>>(`/patients?query=${encodeURIComponent(query)}&size=20`);
      setPatients(page.content);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không thể tìm bệnh nhân"); }
  }

  async function createRecord(event: FormEvent) {
    event.preventDefault();
    if (!file) return setMessage("Hãy chọn file bệnh án.");
    setBusy(true);
    try {
      setMessage("Đang mã hóa và tải file lên IPFS...");
      const body = new FormData(); body.append("file", file);
      const uploaded = await apiFetch<UploadedFile>(
        `/medical-records/patients/${patientId}/files?patientWallet=${patientWallet}&doctorWallet=${doctorWallet}`,
        { method: "POST", body },
      );
      setMessage("File đã tải lên. Hãy ký giao dịch ghi CID/hash trong MetaMask...");
      const onChain = await createOnChainRecord(patientWallet, doctorWallet, uploaded.cid, uploaded.contentHash);
      setMessage("Đang xác minh tham chiếu on-chain và lưu metadata bệnh án...");
      await apiFetch("/medical-records", {
        method: "POST",
        body: JSON.stringify({
          patientProfileId: Number(patientId), title, recordType, medicalFileId: uploaded.fileId,
          onChainRecordId: onChain.recordId, patientWallet, doctorWallet,
        }),
      });
      setMessage(`Tạo bệnh án thành công. Transaction: ${shortAddress(onChain.transactionHash)}`);
      setTitle(""); setFile(null);
      await loadRecords();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không thể tạo bệnh án"); }
    finally { setBusy(false); }
  }

  async function loadRecords() {
    if (!patientId || !patientWallet || !doctorWallet) return setMessage("Cần đủ ID bệnh nhân và hai địa chỉ ví.");
    setBusy(true);
    try {
      const page = await apiFetch<Page<MedicalRecord>>(`/medical-records?patientProfileId=${patientId}&patientWallet=${patientWallet}&doctorWallet=${doctorWallet}&size=50`);
      setRecords(page.content); setMessage(`Đã tải ${page.totalElements} bệnh án.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không thể tải bệnh án"); }
    finally { setBusy(false); }
  }

  async function download(recordId: number, fileId: number, filename: string) {
    try {
      const blob = await apiDownload(`/medical-records/${recordId}/files/${fileId}/content?patientWallet=${patientWallet}&doctorWallet=${doctorWallet}`);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không thể tải file"); }
  }

  if (access !== "allowed") return <AccessState access={access} />;
  return (
    <section className="grid gap-6">
      <div><p className="label text-blue-700">Doctor workspace</p><h1 className="mt-2 text-3xl font-bold">Quản lý bệnh án</h1>
        <p className="mt-2 text-slate-600">Backend kiểm tra đồng thời quyền ứng dụng, quyền smart contract, CID và hash nội dung.</p></div>
      <WalletCard onConnected={setDoctorWallet} />

      <div className="grid gap-6 lg:grid-cols-2">
        <form className="card grid gap-4" onSubmit={searchPatients}>
          <h2 className="text-lg font-bold">1. Tìm bệnh nhân</h2>
          <div className="flex gap-2"><input className="input" required placeholder="Mã hoặc tên bệnh nhân" value={query} onChange={(e) => setQuery(e.target.value)} /><button className="btn-secondary">Tìm</button></div>
          <div className="grid max-h-56 gap-2 overflow-auto">
            {patients.map((patient) => <button className="rounded-lg border p-3 text-left hover:border-blue-400" type="button" key={patient.id} onClick={() => setPatientId(String(patient.id))}>
              <strong>{patient.fullName}</strong><span className="ml-2 text-xs text-slate-500">{patient.patientCode} · ID {patient.id}</span>
            </button>)}
          </div>
        </form>
        <div className="card grid gap-4">
          <h2 className="text-lg font-bold">2. Xác định phạm vi truy cập</h2>
          <label className="grid gap-1 text-sm font-medium">ID hồ sơ bệnh nhân<input className="input" type="number" min="1" value={patientId} onChange={(e) => setPatientId(e.target.value)} /></label>
          <label className="grid gap-1 text-sm font-medium">Ví bệnh nhân<input className="input font-mono" pattern="^0x[0-9a-fA-F]{40}$" value={patientWallet} onChange={(e) => setPatientWallet(e.target.value)} /></label>
          <label className="grid gap-1 text-sm font-medium">Ví bác sĩ<input className="input font-mono" pattern="^0x[0-9a-fA-F]{40}$" value={doctorWallet} onChange={(e) => setDoctorWallet(e.target.value)} /></label>
          <button className="btn-secondary" disabled={busy} onClick={loadRecords}>Kiểm tra quyền và tải danh sách</button>
        </div>
      </div>

      <form className="card grid gap-4" onSubmit={createRecord}>
        <h2 className="text-lg font-bold">3. Tạo bệnh án mới</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="grid gap-1 text-sm font-medium">Tiêu đề<input className="input" required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} /></label>
          <label className="grid gap-1 text-sm font-medium">Loại bệnh án<select className="input" value={recordType} onChange={(e) => setRecordType(e.target.value)}><option>DIAGNOSIS</option><option>LAB_RESULT</option><option>IMAGING</option><option>PRESCRIPTION</option></select></label>
          <label className="grid gap-1 text-sm font-medium">File bệnh án<input className="input" type="file" required accept=".json,.pdf,image/jpeg,image/png" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>
        </div>
        {message && <p className="status">{message}</p>}
        <button className="btn-primary w-fit" disabled={busy || !patientId || !patientWallet || !doctorWallet}>{busy ? "Đang xử lý..." : "Upload, ký và tạo bệnh án"}</button>
      </form>

      <div className="card">
        <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">Bệnh án được phép truy cập</h2><button className="btn-secondary" disabled={busy} onClick={loadRecords}>Làm mới</button></div>
        <div className="grid gap-4">
          {records.map((record) => <article className="rounded-xl border border-slate-200 p-4" key={record.id}>
            <div className="flex flex-wrap justify-between gap-3"><div><h3 className="font-bold">{record.title}</h3><p className="text-sm text-slate-500">{record.recordType} · On-chain #{record.onChainRecordId} · {new Date(record.createdAt).toLocaleString("vi-VN")}</p></div></div>
            <div className="mt-3 flex flex-wrap gap-2">{record.files.map((item) => <button className="btn-secondary" key={item.id} onClick={() => download(record.id, item.id, item.originalFilename)}>Tải {item.originalFilename}</button>)}</div>
          </article>)}
          {!records.length && <p className="text-sm text-slate-500">Chưa tải danh sách hoặc không có bệnh án.</p>}
        </div>
      </div>
    </section>
  );
}
