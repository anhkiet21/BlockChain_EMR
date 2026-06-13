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
      setMessage(`Đã tải ${page.totalElements} file.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể tải danh sách file");
    }
  }

  async function upload(event: FormEvent) {
    event.preventDefault();
    if (!file) return setMessage("Hãy chọn file.");
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const uploaded = await apiFetch<MedicalFile>("/medical-files/me", { method: "POST", body });
      setMessage(`Upload thành công: ${uploaded.originalFilename}`);
      setFile(null);
      await loadFiles();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload thất bại");
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
      setMessage(error instanceof Error ? error.message : "Không thể tải file");
    }
  }

  if (access !== "allowed") return <AccessState access={access} />;

  return (
    <section className="grid gap-6">
      <div>
        <p className="badge">Kho lưu trữ bệnh nhân</p>
        <h1 className="mt-3 section-title">File bệnh án của tôi</h1>
        <p className="mt-2 text-slate-600">Kiểm thử mã hóa file, upload storage/IPFS và tải lại file của chính bệnh nhân.</p>
      </div>

      <form className="card grid gap-4" onSubmit={upload}>
        <h2 className="text-lg font-black">Upload file riêng</h2>
        <input className="input" type="file" accept=".json,.pdf,image/jpeg,image/png" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        {message && <p className="status">{message}</p>}
        <button className="btn-primary w-fit" disabled={busy || !file}>{busy ? "Đang upload..." : "Upload file"}</button>
      </form>

      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-black">Danh sách file</h2>
          <button className="btn-secondary" onClick={loadFiles}>Làm mới</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>ID</th><th>Tên file</th><th>Loại</th><th>Kích thước</th><th>Thời gian</th><th></th></tr></thead>
            <tbody>
              {files.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.originalFilename}</td>
                  <td>{item.contentType}</td>
                  <td>{item.originalSize} bytes</td>
                  <td>{new Date(item.createdAt).toLocaleString("vi-VN")}</td>
                  <td><button className="btn-secondary" onClick={() => download(item)}>Tải file</button></td>
                </tr>
              ))}
              {!files.length && <tr><td colSpan={6} className="text-center text-slate-500">Chưa có file.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
