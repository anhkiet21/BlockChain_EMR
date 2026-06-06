"use client";

import { FormEvent, useEffect, useState } from "react";
import { AccessState } from "@/components/access-state";
import { apiDownload, apiFetch } from "@/lib/api/client";
import { MedicalFile, Page } from "@/lib/api/types";
import { useRequiredRole } from "@/lib/auth/use-required-role";

export default function PatientFilesPage() {
  const access = useRequiredRole("PATIENT");
  const [files, setFiles] = useState<MedicalFile[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (access === "allowed") loadFiles();
  }, [access]);

  async function loadFiles() {
    try {
      const page = await apiFetch<Page<MedicalFile>>("/medical-files/me?size=50");
      setFiles(page.content);
      setMessage(`Da tai ${page.totalElements} file.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Khong the tai danh sach file");
    }
  }

  async function upload(event: FormEvent) {
    event.preventDefault();
    if (!file) return setMessage("Hay chon file.");
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const uploaded = await apiFetch<MedicalFile>("/medical-files/me", { method: "POST", body });
      setMessage(`Upload thanh cong: ${uploaded.originalFilename}`);
      setFile(null);
      await loadFiles();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload that bai");
    } finally {
      setBusy(false);
    }
  }

  async function download(item: MedicalFile) {
    try {
      const blob = await apiDownload(`/medical-files/${item.id}/content`);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = item.originalFilename;
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
        <p className="label text-blue-700">Patient storage</p>
        <h1 className="mt-2 text-3xl font-bold">File benh an cua toi</h1>
        <p className="mt-2 text-slate-600">Test ma hoa file, upload storage/IPFS va tai lai file cua chinh benh nhan.</p>
      </div>

      <form className="card grid gap-4" onSubmit={upload}>
        <h2 className="text-lg font-bold">Upload file rieng</h2>
        <input className="input" type="file" accept=".json,.pdf,image/jpeg,image/png" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        {message && <p className="status">{message}</p>}
        <button className="btn-primary w-fit" disabled={busy || !file}>{busy ? "Dang upload..." : "Upload file"}</button>
      </form>

      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Danh sach file</h2>
          <button className="btn-secondary" onClick={loadFiles}>Lam moi</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>ID</th><th>Ten file</th><th>Loai</th><th>Kich thuoc</th><th>Thoi gian</th><th></th></tr></thead>
            <tbody>
              {files.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.originalFilename}</td>
                  <td>{item.contentType}</td>
                  <td>{item.originalSize} bytes</td>
                  <td>{new Date(item.createdAt).toLocaleString("vi-VN")}</td>
                  <td><button className="btn-secondary" onClick={() => download(item)}>Tai file</button></td>
                </tr>
              ))}
              {!files.length && <tr><td colSpan={6} className="text-center text-slate-500">Chua co file.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
