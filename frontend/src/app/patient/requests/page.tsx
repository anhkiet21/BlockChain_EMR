"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch, getSession } from "@/lib/api/client";
import { useRequiredRole } from "@/lib/auth/use-required-role";
import { AccessState } from "@/components/access-state";
import { connectWallet, sendPreparedTransaction } from "@/lib/web3/provider";
import type { AccessRequest, Page, PreparedAccessTransaction } from "@/lib/api/types";

const STATUS_STYLES: Record<string, string> = {
  PENDING:  "badge-amber",
  APPROVED: "badge-emerald",
  REJECTED: "badge-red",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING:  "⏳ Chờ duyệt",
  APPROVED: "✅ Đã phê duyệt",
  REJECTED: "❌ Đã từ chối",
};

export default function PatientRequestsPage() {
  const access = useRequiredRole("PATIENT");
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<number | null>(null);

  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectBusy, setRejectBusy] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const loadRequests = useCallback(() => {
    if (access !== "allowed") return;
    setLoading(true);
    setError("");
    apiFetch<Page<AccessRequest>>(`/access-requests/patients/me?page=${page}&size=20`)
      .then((data) => {
        setRequests(data.content);
        setTotalPages(data.totalPages);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Không thể tải yêu cầu"))
      .finally(() => setLoading(false));
  }, [access, page]);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  async function handleApprove(req: AccessRequest) {
    setError(""); setSuccessMsg("");
    const session = getSession();
    if (!session) return setError("Phiên đăng nhập không tồn tại.");
    const patientWallet = session.user.wallets?.[0];
    if (!patientWallet) {
      return setError("Bạn chưa liên kết ví MetaMask. Vui lòng đến trang Hồ sơ để liên kết ví.");
    }
    if (!req.doctorWallet) {
      return setError("Bác sĩ chưa liên kết ví MetaMask nên chưa thể cấp quyền.");
    }
    setBusy(req.id);
    try {
      const prepared = await apiFetch<PreparedAccessTransaction>("/access-control/transactions/prepare", {
        method: "POST",
        body: JSON.stringify({
          doctorProfileId: req.doctorProfileId,
          patientWallet,
          doctorWallet: req.doctorWallet,
          granted: true,
        }),
      });
      const receipt = await sendPreparedTransaction(prepared);
      await apiFetch(`/access-requests/${req.id}/approve`, {
        method: "PUT",
        body: JSON.stringify({ transactionHash: receipt.hash }),
      });
      setSuccessMsg(`✅ Đã phê duyệt yêu cầu từ bác sĩ ${req.doctorName}. TX: ${receipt.hash.slice(0, 14)}...`);
      loadRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể phê duyệt yêu cầu");
    } finally { setBusy(null); }
  }

  async function handleRejectSubmit() {
    if (!rejectId || !rejectReason.trim()) return setError("Vui lòng nhập lý do từ chối.");
    setRejectBusy(true); setError("");
    try {
      await apiFetch(`/access-requests/${rejectId}/reject`, {
        method: "PUT",
        body: JSON.stringify({ rejectedReason: rejectReason.trim() }),
      });
      setSuccessMsg("Đã từ chối yêu cầu truy cập.");
      setRejectId(null); setRejectReason("");
      loadRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể từ chối yêu cầu");
    } finally { setRejectBusy(false); }
  }

  if (access !== "allowed") return <AccessState access={access} />;

  return (
    <div className="grid gap-8 animate-fade-in">
      {/* ── Header ── */}
      <div>
        <div className="role-pill bg-violet-500/10 border-violet-500/20 text-violet-400">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
          </svg>
          Bệnh nhân
        </div>
        <h1 className="page-title">🔔 Yêu cầu truy cập bệnh án</h1>
        <p className="page-subtitle">
          Bác sĩ gửi yêu cầu xem hồ sơ bệnh án. Bạn có toàn quyền phê duyệt hoặc từ chối.
        </p>
      </div>

      {/* ── Messages ── */}
      {error && (
        <div className="alert-error animate-scale-in">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 shrink-0">⚠️</span>
            <div>
              <p>{error}</p>
              {error.includes("ví MetaMask") && (
                <a href="/profile" className="underline text-red-300 mt-1 inline-block text-xs">
                  → Đến trang Hồ sơ để liên kết ví
                </a>
              )}
            </div>
          </div>
        </div>
      )}
      {successMsg && (
        <div className="alert-success animate-scale-in">{successMsg}</div>
      )}

      {/* ── Content ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-28 gap-4">
          <div className="h-12 w-12 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
          <p className="text-slate-400 text-sm">Đang tải yêu cầu...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="empty-state">
          <div className="w-20 h-20 rounded-2xl bg-slate-800 border border-white/5 flex items-center justify-center text-4xl mb-2">
            🔕
          </div>
          <p className="text-lg font-semibold text-slate-300">Không có yêu cầu truy cập nào</p>
          <p className="text-sm text-slate-500 max-w-sm text-center">
            Khi bác sĩ gửi yêu cầu xem bệnh án của bạn, chúng sẽ xuất hiện ở đây.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {requests.map((req, i) => (
            <div
              key={req.id}
              className="card-glass hover:border-white/20 transition-all duration-200 animate-fade-in"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                {/* Doctor info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold text-base shrink-0 shadow-lg shadow-violet-500/20">
                      {req.doctorName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-white font-semibold">{req.doctorName}</p>
                      <p className="text-slate-500 text-xs mono">Mã BS: {req.doctorCode}</p>
                    </div>
                    <span className={`badge ${STATUS_STYLES[req.status] ?? "badge-slate"}`}>
                      {STATUS_LABELS[req.status] ?? req.status}
                    </span>
                  </div>

                  {/* Reason */}
                  <div className="mt-4 rounded-xl bg-white/5 border border-white/10 px-4 py-3">
                    <p className="label mb-1.5">Lý do yêu cầu</p>
                    <p className="text-slate-300 text-sm leading-relaxed">{req.reason}</p>
                  </div>

                  {/* Rejection reason */}
                  {req.status === "REJECTED" && req.rejectedReason && (
                    <div className="mt-2 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3">
                      <p className="text-xs text-red-400 font-semibold uppercase tracking-wide mb-1">Lý do từ chối</p>
                      <p className="text-red-300 text-sm">{req.rejectedReason}</p>
                    </div>
                  )}

                  {/* Tx hash */}
                  {req.transactionHash && (
                    <p className="mt-2 text-xs text-slate-600 mono">
                      TX: {req.transactionHash.slice(0, 22)}...
                    </p>
                  )}

                  <p className="mt-2 text-xs text-slate-600">
                    Gửi lúc: {new Date(req.createdAt).toLocaleString("vi-VN")}
                    {req.respondedAt && ` · Phản hồi: ${new Date(req.respondedAt).toLocaleString("vi-VN")}`}
                  </p>
                </div>

                {/* Actions */}
                {req.status === "PENDING" && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleApprove(req)}
                      disabled={busy === req.id}
                      className="btn-success"
                    >
                      {busy === req.id ? (
                        <span className="spinner-sm border-white" />
                      ) : "✅"}
                      Phê duyệt
                    </button>
                    <button
                      onClick={() => { setRejectId(req.id); setRejectReason(""); setError(""); }}
                      disabled={busy === req.id}
                      className="btn-danger"
                    >
                      ❌ Từ chối
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="btn-secondary">
            ← Trước
          </button>
          <span className="text-slate-400 text-sm">{page + 1} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="btn-secondary">
            Tiếp →
          </button>
        </div>
      )}

      {/* ── Reject Modal ── */}
      {rejectId !== null && (
        <div className="modal-overlay animate-scale-in">
          <div className="modal-content">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 text-lg">
                ❌
              </div>
              <div>
                <h2 className="section-title">Từ chối yêu cầu</h2>
                <p className="text-slate-500 text-xs">Bác sĩ sẽ được thông báo về quyết định của bạn.</p>
              </div>
            </div>

            <label className="grid gap-2">
              <span className="form-label">Lý do từ chối *</span>
              <textarea
                className="input min-h-[110px] resize-none"
                placeholder="Nhập lý do từ chối..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                maxLength={500}
                autoFocus
              />
              <p className="text-slate-600 text-xs text-right">{rejectReason.length}/500</p>
            </label>

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => { setRejectId(null); setRejectReason(""); }}
                className="btn-ghost flex-1"
              >
                Huỷ bỏ
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={rejectBusy || !rejectReason.trim()}
                className="btn-danger flex-1"
              >
                {rejectBusy && <span className="spinner-sm border-white" />}
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
