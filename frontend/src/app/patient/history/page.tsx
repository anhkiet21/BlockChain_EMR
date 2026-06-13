"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api/client";
import { useRequiredRole } from "@/lib/auth/use-required-role";
import { AccessState } from "@/components/access-state";
import type { RecordAccessLog, Page } from "@/lib/api/types";

const ACTION_STYLES: Record<string, string> = {
  VIEW:     "badge-indigo",
  DOWNLOAD: "badge-violet",
  CREATE:   "badge-emerald",
  UPLOAD:   "badge-indigo",
  CORRECT:  "badge-amber",
  EDIT:     "badge-red",
};

const ACTION_LABELS: Record<string, string> = {
  VIEW:     "👁️ Xem",
  DOWNLOAD: "⬇️ Tải xuống",
  CREATE:   "➕ Tạo mới",
  UPLOAD:   "⬆️ Upload",
  CORRECT:  "✏️ Chỉnh sửa",
  EDIT:     "📝 Biên tập",
};

export default function PatientHistoryPage() {
  const access = useRequiredRole("PATIENT");
  const [logs, setLogs] = useState<RecordAccessLog[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (access !== "allowed") return;
    setLoading(true);
    setError("");
    apiFetch<Page<RecordAccessLog>>(`/patients/me/access-history?page=${page}&size=20`)
      .then((data) => {
        setLogs(data.content);
        setTotalPages(data.totalPages);
        setTotalElements(data.totalElements);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Không thể tải dữ liệu"))
      .finally(() => setLoading(false));
  }, [access, page]);

  if (access !== "allowed") return <AccessState access={access} />;

  return (
    <div className="grid gap-8 animate-fade-in">
      {/* ── Header ── */}
      <div>
        <div className="role-pill bg-indigo-500/10 border-indigo-500/20 text-indigo-400">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
          </svg>
          Bệnh nhân
        </div>
        <h1 className="page-title">📋 Lịch sử truy cập bệnh án</h1>
        <p className="page-subtitle">
          Toàn bộ hoạt động truy cập hồ sơ bệnh án của bạn — minh bạch và bất biến trên Blockchain.
        </p>
        {totalElements > 0 && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-4 py-2">
            <span className="text-slate-400 text-sm">Tổng cộng</span>
            <span className="text-indigo-400 font-bold text-sm">{totalElements}</span>
            <span className="text-slate-400 text-sm">bản ghi</span>
          </div>
        )}
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="alert-error animate-fade-in">
          <span>⚠️</span> {error}
        </div>
      )}

      {/* ── Content ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-28 gap-4">
          <div className="h-12 w-12 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
          <p className="text-slate-400 text-sm">Đang tải dữ liệu...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="empty-state">
          <div className="w-20 h-20 rounded-2xl bg-slate-800 border border-white/5 flex items-center justify-center text-4xl mb-2">
            📜
          </div>
          <p className="text-lg font-semibold text-slate-300">Chưa có lịch sử truy cập nào</p>
          <p className="text-sm text-slate-500 max-w-sm">
            Khi bác sĩ xem hoặc tải bệnh án của bạn, lịch sử sẽ xuất hiện ở đây.
          </p>
        </div>
      ) : (
        /* ── Table ── */
        <div className="card-glass overflow-hidden">
          {/* Header */}
          <div className="hidden md:grid grid-cols-[3.5rem_1fr_1fr_9rem_9rem] items-center px-5 py-3.5 border-b border-white/5">
            <span className="label">#</span>
            <span className="label">Hồ sơ bệnh án</span>
            <span className="label">Người thực hiện</span>
            <span className="label">Hành động</span>
            <span className="label">Thời gian</span>
          </div>

          {/* Rows */}
          <div className="divide-y divide-white/5">
            {logs.map((log, idx) => (
              <div
                key={log.id}
                className="md:grid md:grid-cols-[3.5rem_1fr_1fr_9rem_9rem] items-center px-5 py-4
                           hover:bg-white/[0.03] transition-colors duration-150 animate-fade-in
                           flex flex-col gap-2 md:gap-0"
              >
                {/* Index */}
                <span className="text-slate-600 text-xs mono hidden md:block">
                  {page * 20 + idx + 1}
                </span>

                {/* Record info */}
                <div className="pr-4 w-full md:w-auto">
                  <p className="text-white text-sm font-medium truncate">
                    {log.medicalRecordTitle ?? (
                      <span className="text-slate-500 italic">Không có tiêu đề</span>
                    )}
                  </p>
                  {log.medicalRecordId && (
                    <p className="text-xs text-slate-600 mt-0.5 mono">ID #{log.medicalRecordId}</p>
                  )}
                </div>

                {/* Actor */}
                <div className="pr-4 flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {log.actorFullName.charAt(0)}
                  </div>
                  <p className="text-slate-300 text-sm truncate">{log.actorFullName}</p>
                </div>

                {/* Action badge */}
                <div>
                  <span className={`badge ${ACTION_STYLES[log.action] ?? "badge-slate"}`}>
                    {ACTION_LABELS[log.action] ?? log.action}
                  </span>
                </div>

                {/* Time */}
                <div>
                  <p className="text-slate-400 text-xs">
                    {new Date(log.createdAt).toLocaleDateString("vi-VN")}
                  </p>
                  <p className="text-slate-600 text-xs">
                    {new Date(log.createdAt).toLocaleTimeString("vi-VN")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="btn-secondary"
          >
            ← Trang trước
          </button>
          <div className="flex items-center gap-2 text-sm">
            <span className="px-4 py-2 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-semibold">
              {page + 1}
            </span>
            <span className="text-slate-500">/ {totalPages}</span>
          </div>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="btn-secondary"
          >
            Trang sau →
          </button>
        </div>
      )}
    </div>
  );
}
