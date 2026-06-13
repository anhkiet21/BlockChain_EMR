'use client';

import { useEffect, useState } from 'react';
import { AccessState } from '@/components/access-state';
import { apiDownload, apiFetch } from '@/lib/api/client';
import { MedicalFile, Page } from '@/lib/api/types';
import { useRequiredRole } from '@/lib/auth/use-required-role';

function fileIcon(contentType: string): string {
  if (contentType.includes('pdf')) return '📄';
  if (contentType.startsWith('image/')) return '🖼️';
  if (contentType.includes('json')) return '📋';
  return '📁';
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function fileTypeLabel(contentType: string): string {
  if (contentType.includes('pdf')) return 'PDF';
  if (contentType === 'image/jpeg') return 'JPEG';
  if (contentType === 'image/png') return 'PNG';
  if (contentType.includes('json')) return 'JSON';
  return contentType.split('/').pop()?.toUpperCase() ?? contentType;
}

export default function PatientFilesPage() {
  const access = useRequiredRole('PATIENT');
  const [files, setFiles] = useState<MedicalFile[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  useEffect(() => {
    if (access === 'allowed') loadFiles();
  }, [access]);

  async function loadFiles() {
    setLoading(true);
    setErrorMsg('');
    try {
      const page = await apiFetch<Page<MedicalFile>>('/medical-files/me?size=50');
      setFiles(page.content);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Không thể tải danh sách file');
    } finally {
      setLoading(false);
    }
  }

  async function upload(event: React.FormEvent) {
    event.preventDefault();
    if (!file) {
      setErrorMsg('Hãy chọn file để tải lên.');
      return;
    }
    setBusy(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const body = new FormData();
      body.append('file', file);
      const uploaded = await apiFetch<MedicalFile>('/medical-files/me', { method: 'POST', body });
      setSuccessMsg(`✅ Tải lên thành công: ${uploaded.originalFilename}`);
      setFile(null);
      // Reset file input
      const input = document.getElementById('file-upload-input') as HTMLInputElement | null;
      if (input) input.value = '';
      await loadFiles();
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Tải lên thất bại');
    } finally {
      setBusy(false);
    }
  }

  async function download(item: MedicalFile) {
    setDownloadingId(item.id);
    setErrorMsg('');
    try {
      const blob = await apiDownload(`/medical-files/${item.id}/content`);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = item.originalFilename;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Không thể tải file');
    } finally {
      setDownloadingId(null);
    }
  }

  if (access !== 'allowed') return <AccessState access={access} />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-4 md:p-8">
      <div className="max-w-5xl mx-auto grid gap-8">

        {/* ── Page Header ─────────────────────────────────────────────────── */}
        <div className="animate-fade-in">
          <div className="role-pill border-cyan-500/20 bg-cyan-500/10 text-cyan-400">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
            Không gian bệnh nhân
          </div>
          <h1 className="page-title mt-2">📂 File bệnh án của tôi</h1>
          <p className="page-subtitle">
            File được mã hóa và lưu trữ an toàn. Chỉ bạn và bác sĩ được cấp quyền mới có thể truy cập.
          </p>
        </div>

        {/* ── Success / Error banners ──────────────────────────────────────── */}
        {successMsg && (
          <div className="alert-success animate-fade-in flex items-center gap-3">
            <span className="flex-1 text-sm">{successMsg}</span>
            <button
              type="button"
              onClick={() => setSuccessMsg('')}
              className="opacity-60 hover:opacity-100 transition-opacity text-lg leading-none"
            >
              ×
            </button>
          </div>
        )}
        {errorMsg && (
          <div className="alert-error animate-fade-in flex items-center gap-3">
            <span className="flex-1 text-sm">{errorMsg}</span>
            <button
              type="button"
              onClick={() => setErrorMsg('')}
              className="opacity-60 hover:opacity-100 transition-opacity text-lg leading-none"
            >
              ×
            </button>
          </div>
        )}

        {/* ── Upload Form ──────────────────────────────────────────────────── */}
        <form
          className="card grid gap-5 animate-fade-in stagger-1"
          onSubmit={upload}
        >
          <div className="flex items-center gap-3 pb-4 border-b border-white/10">
            <div className="h-10 w-10 rounded-xl bg-cyan-500/20 flex items-center justify-center text-xl">
              ⬆️
            </div>
            <div>
              <h2 className="section-title">Tải lên file bệnh án</h2>
              <p className="text-slate-500 text-xs mt-0.5">
                Hỗ trợ: PDF, hình ảnh (JPEG, PNG), JSON
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div className="flex-1 w-full">
              <label className="form-label">Chọn file</label>
              <label
                className="flex items-center gap-3 w-full rounded-xl border border-white/10 border-dashed bg-white/[0.02] px-4 py-4 cursor-pointer hover:bg-white/[0.05] hover:border-white/20 transition-all duration-200 group"
              >
                <span className="text-2xl">{file ? fileIcon(file.type) : '📎'}</span>
                <span className="flex-1 min-w-0">
                  {file ? (
                    <span className="text-white text-sm font-medium truncate block">
                      {file.name}
                      <span className="ml-2 text-slate-500 font-normal">
                        ({formatFileSize(file.size)})
                      </span>
                    </span>
                  ) : (
                    <span className="text-slate-500 text-sm">
                      Nhấn để chọn hoặc kéo thả file vào đây...
                    </span>
                  )}
                </span>
                <input
                  id="file-upload-input"
                  type="file"
                  className="hidden"
                  accept=".json,.pdf,image/*"
                  onChange={(e) => {
                    setFile(e.target.files?.[0] ?? null);
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                />
              </label>
            </div>
            <button
              type="submit"
              className="btn-primary shrink-0"
              disabled={busy || !file}
            >
              {busy ? (
                <>
                  <span className="spinner-sm border-white/40 border-t-white" />
                  Đang tải lên...
                </>
              ) : (
                <>
                  <span>⬆️</span>
                  Tải lên
                </>
              )}
            </button>
          </div>
        </form>

        {/* ── Files Grid ──────────────────────────────────────────────────── */}
        <div className="grid gap-4 animate-fade-in stagger-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-xl">
                📁
              </div>
              <div>
                <h2 className="section-title">Danh sách file của tôi</h2>
                <p className="text-slate-500 text-xs mt-0.5">
                  {files.length > 0 ? `${files.length} file` : 'Chưa có file'}
                </p>
              </div>
            </div>
            <button
              className="btn-secondary"
              onClick={loadFiles}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-sm border-white/40 border-t-white" />
                  Đang tải...
                </>
              ) : (
                '↻ Làm mới'
              )}
            </button>
          </div>

          {/* Loading state */}
          {loading && files.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-400">
              <div className="h-10 w-10 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
              <p className="text-sm">Đang tải danh sách file...</p>
            </div>
          ) : files.length === 0 ? (
            <div className="card empty-state">
              <div className="text-6xl">📭</div>
              <p className="text-slate-300 font-semibold text-lg">Chưa có file nào</p>
              <p className="text-slate-500 text-sm max-w-sm text-center">
                Tải lên file bệnh án đầu tiên của bạn. File sẽ được mã hóa và lưu trữ an toàn trên hệ thống.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {files.map((item, idx) => (
                <div
                  key={item.id}
                  className={`card-hover grid gap-3 animate-fade-in stagger-${Math.min(idx + 1, 4)}`}
                >
                  {/* File header */}
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 flex items-center justify-center text-2xl shrink-0">
                      {fileIcon(item.contentType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-white font-semibold text-sm leading-tight truncate"
                        title={item.originalFilename}
                      >
                        {item.originalFilename}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="badge badge-slate text-xs">
                          {fileTypeLabel(item.contentType)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* File meta */}
                  <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2.5 grid grid-cols-2 gap-y-1.5">
                    <div>
                      <p className="text-xs text-slate-600 uppercase tracking-wider">Kích thước</p>
                      <p className="text-xs text-slate-300 font-medium mt-0.5">
                        {formatFileSize(item.originalSize)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 uppercase tracking-wider">Định dạng</p>
                      <p className="text-xs text-slate-300 font-medium mt-0.5 truncate" title={item.contentType}>
                        {item.contentType}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-slate-600 uppercase tracking-wider">Ngày tải lên</p>
                      <p className="text-xs text-slate-300 font-medium mt-0.5">
                        {new Date(item.createdAt).toLocaleString('vi-VN')}
                      </p>
                    </div>
                  </div>

                  {/* Download button */}
                  <button
                    className="btn-secondary w-full text-xs"
                    onClick={() => download(item)}
                    disabled={downloadingId === item.id}
                  >
                    {downloadingId === item.id ? (
                      <>
                        <span className="spinner-sm border-white/40 border-t-white" />
                        Đang tải...
                      </>
                    ) : (
                      <>
                        <span>⬇️</span>
                        Tải xuống
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
