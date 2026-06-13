"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api/client";
import { useRequiredRole } from "@/lib/auth/use-required-role";
import { AccessState } from "@/components/access-state";
import type { InstitutionProfile, DoctorAssociation } from "@/lib/api/types";

type Tab = "info" | "doctors";

const ASSOC_STYLES: Record<string, string> = {
  PENDING:  "badge-amber",
  APPROVED: "badge-emerald",
  REJECTED: "badge-red",
};

const ASSOC_LABELS: Record<string, string> = {
  PENDING:  "⏳ Chờ duyệt",
  APPROVED: "✅ Đã duyệt",
  REJECTED: "❌ Đã từ chối",
};

export default function InstitutionPage() {
  const access = useRequiredRole("INSTITUTION");
  const [tab, setTab] = useState<Tab>("info");

  const [info, setInfo]               = useState<Partial<InstitutionProfile>>({});
  const [infoLoading, setInfoLoading] = useState(true);
  const [infoSaving, setInfoSaving]   = useState(false);
  const [infoMsg, setInfoMsg]         = useState("");
  const [infoError, setInfoError]     = useState("");

  const [doctors, setDoctors]             = useState<DoctorAssociation[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [doctorBusy, setDoctorBusy]       = useState<number | null>(null);
  const [doctorMsg, setDoctorMsg]         = useState("");
  const [doctorError, setDoctorError]     = useState("");

  useEffect(() => {
    if (access !== "allowed") return;
    setInfoLoading(true);
    apiFetch<InstitutionProfile>("/institutions/me")
      .then((data) => setInfo(data))
      .catch((err) => {
        const msg = err instanceof Error ? err.message : "";
        if (msg.toLowerCase().includes("not found") || msg.toLowerCase().includes("404")) {
          setInfo({});
        } else {
          setInfoError(msg || "Không thể tải thông tin");
        }
      })
      .finally(() => setInfoLoading(false));
  }, [access]);

  const loadDoctors = useCallback(() => {
    setDoctorsLoading(true);
    setDoctorError("");
    apiFetch<DoctorAssociation[]>("/institutions/me/doctors")
      .then((data) => setDoctors(Array.isArray(data) ? data : []))
      .catch((err) => setDoctorError(err instanceof Error ? err.message : "Không thể tải danh sách bác sĩ"))
      .finally(() => setDoctorsLoading(false));
  }, []);

  useEffect(() => {
    if (access === "allowed" && tab === "doctors") loadDoctors();
  }, [access, tab, loadDoctors]);

  async function handleSaveInfo(e: React.FormEvent) {
    e.preventDefault();
    setInfoSaving(true); setInfoMsg(""); setInfoError("");
    try {
      const updated = await apiFetch<InstitutionProfile>("/institutions/me", {
        method: "PUT",
        body: JSON.stringify({ institutionName: info.institutionName, licenseNumber: info.licenseNumber, address: info.address, phone: info.phone, website: info.website }),
      });
      setInfo(updated);
      setInfoMsg("✅ Đã lưu thông tin cơ sở y tế thành công.");
    } catch (err) {
      setInfoError(err instanceof Error ? err.message : "Không thể lưu thông tin");
    } finally { setInfoSaving(false); }
  }

  async function handleApproveDoctor(doctorId: number) {
    setDoctorBusy(doctorId); setDoctorMsg(""); setDoctorError("");
    try {
      await apiFetch(`/institutions/me/doctors/${doctorId}/approve`, { method: "PUT" });
      setDoctorMsg("✅ Đã phê duyệt bác sĩ.");
      loadDoctors();
    } catch (err) {
      setDoctorError(err instanceof Error ? err.message : "Không thể phê duyệt");
    } finally { setDoctorBusy(null); }
  }

  async function handleRejectDoctor(doctorId: number) {
    setDoctorBusy(doctorId); setDoctorMsg(""); setDoctorError("");
    try {
      await apiFetch(`/institutions/me/doctors/${doctorId}/reject`, { method: "PUT" });
      setDoctorMsg("Đã từ chối yêu cầu liên kết.");
      loadDoctors();
    } catch (err) {
      setDoctorError(err instanceof Error ? err.message : "Không thể từ chối");
    } finally { setDoctorBusy(null); }
  }

  if (access !== "allowed") return <AccessState access={access} />;

  return (
    <div className="grid gap-8 animate-fade-in">
      {/* ── Header ── */}
      <div>
        <div className="role-pill bg-teal-500/10 border-teal-500/20 text-teal-400">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0v12h8V4H6z" />
          </svg>
          Cơ sở y tế
        </div>
        <h1 className="page-title">🏥 Quản lý cơ sở y tế</h1>
        <p className="page-subtitle">
          Cập nhật thông tin cơ sở và quản lý danh sách bác sĩ liên kết.
        </p>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 p-1.5 bg-white/5 rounded-2xl border border-white/10 w-fit">
        {(["info", "doctors"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
              tab === t
                ? "bg-teal-500 text-white shadow-lg shadow-teal-500/20"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            {t === "info" ? "📋 Thông tin cơ sở" : "👨‍⚕️ Quản lý bác sĩ"}
          </button>
        ))}
      </div>

      {/* ── INFO TAB ── */}
      {tab === "info" && (
        <div className="card-glass animate-fade-in">
          <h2 className="section-title mb-6">Thông tin cơ sở y tế</h2>

          {infoLoading ? (
            <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
              <div className="h-8 w-8 rounded-full border-2 border-teal-400 border-t-transparent animate-spin" />
              <p>Đang tải thông tin...</p>
            </div>
          ) : (
            <form onSubmit={handleSaveInfo} className="grid gap-5">
              <div className="grid md:grid-cols-2 gap-5">
                <label className="grid gap-2">
                  <span className="form-label">Tên cơ sở y tế *</span>
                  <input
                    className="input"
                    required
                    placeholder="Bệnh viện / Phòng khám..."
                    value={info.institutionName ?? ""}
                    onChange={(e) => setInfo((p) => ({ ...p, institutionName: e.target.value }))}
                  />
                </label>
                <label className="grid gap-2">
                  <span className="form-label">Số giấy phép *</span>
                  <input
                    className="input"
                    required
                    placeholder="GP-XXXXXXXXX"
                    value={info.licenseNumber ?? ""}
                    onChange={(e) => setInfo((p) => ({ ...p, licenseNumber: e.target.value }))}
                  />
                </label>
              </div>

              <label className="grid gap-2">
                <span className="form-label">Địa chỉ</span>
                <input
                  className="input"
                  placeholder="Số nhà, đường, phường, quận, tỉnh/thành phố"
                  value={info.address ?? ""}
                  onChange={(e) => setInfo((p) => ({ ...p, address: e.target.value }))}
                />
              </label>

              <div className="grid md:grid-cols-2 gap-5">
                <label className="grid gap-2">
                  <span className="form-label">Số điện thoại</span>
                  <input
                    className="input"
                    placeholder="+84..."
                    value={info.phone ?? ""}
                    onChange={(e) => setInfo((p) => ({ ...p, phone: e.target.value }))}
                  />
                </label>
                <label className="grid gap-2">
                  <span className="form-label">Website</span>
                  <input
                    type="url"
                    className="input"
                    placeholder="https://..."
                    value={info.website ?? ""}
                    onChange={(e) => setInfo((p) => ({ ...p, website: e.target.value }))}
                  />
                </label>
              </div>

              {infoMsg && <div className="alert-success">{infoMsg}</div>}
              {infoError && <div className="alert-error">⚠️ {infoError}</div>}

              <div className="flex items-center gap-4 pt-2">
                <button
                  type="submit"
                  disabled={infoSaving}
                  className="btn-primary"
                  style={{ background: "linear-gradient(135deg, rgb(20,184,166), rgb(6,182,212))", boxShadow: "0 4px 20px rgba(20,184,166,0.2)" }}
                >
                  {infoSaving && <span className="spinner-sm border-white" />}
                  {infoSaving ? "Đang lưu..." : "💾 Lưu thông tin"}
                </button>

                {/* Read-only meta */}
                {info.institutionCode && (
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>Mã: <span className="text-slate-400 mono">{info.institutionCode}</span></span>
                    <span>
                      Trạng thái:{" "}
                      <span className={info.active ? "text-emerald-400 font-semibold" : "text-red-400 font-semibold"}>
                        {info.active ? "Hoạt động" : "Không hoạt động"}
                      </span>
                    </span>
                  </div>
                )}
              </div>
            </form>
          )}
        </div>
      )}

      {/* ── DOCTORS TAB ── */}
      {tab === "doctors" && (
        <div className="card-glass animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <h2 className="section-title">Danh sách bác sĩ liên kết</h2>
            <button onClick={loadDoctors} className="btn-secondary text-sm">🔄 Làm mới</button>
          </div>

          {doctorMsg && <div className="alert-success mb-4">{doctorMsg}</div>}
          {doctorError && <div className="alert-error mb-4">⚠️ {doctorError}</div>}

          {doctorsLoading ? (
            <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
              <div className="h-8 w-8 rounded-full border-2 border-teal-400 border-t-transparent animate-spin" />
              <p>Đang tải danh sách...</p>
            </div>
          ) : doctors.length === 0 ? (
            <div className="empty-state py-12">
              <div className="text-5xl mb-2">👨‍⚕️</div>
              <p className="text-slate-300 font-medium">Chưa có bác sĩ nào liên kết</p>
              <p className="text-sm text-slate-500">Bác sĩ có thể gửi yêu cầu liên kết từ trang hồ sơ của họ.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {doctors.map((doc, i) => (
                <div
                  key={doc.doctorId}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-5 py-4 hover:border-white/20 transition-all animate-fade-in"
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <div className="flex items-center gap-4">
                    <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white font-bold shrink-0 shadow-lg shadow-teal-500/20">
                      {(doc.fullName ?? "?").charAt(0)}
                    </div>
                    <div>
                      <p className="text-white font-semibold">{doc.fullName}</p>
                      <p className="text-slate-500 text-xs mono">
                        {doc.doctorCode} · {doc.specialization} · GP: {doc.licenseNumber}
                      </p>
                      <p className="text-slate-600 text-xs mt-0.5">
                        Yêu cầu: {new Date(doc.createdAt).toLocaleDateString("vi-VN")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`badge ${doc.institutionStatus ? (ASSOC_STYLES[doc.institutionStatus] ?? "badge-slate") : "badge-slate"}`}>
                      {doc.institutionStatus ? (ASSOC_LABELS[doc.institutionStatus] ?? doc.institutionStatus) : "Không rõ"}
                    </span>

                    {doc.institutionStatus === "PENDING" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApproveDoctor(doc.doctorId)}
                          disabled={doctorBusy === doc.doctorId}
                          className="btn-success text-xs py-1.5 px-3"
                        >
                          {doctorBusy === doc.doctorId ? <span className="spinner-sm border-white" /> : "✅"}
                          Duyệt
                        </button>
                        <button
                          onClick={() => handleRejectDoctor(doc.doctorId)}
                          disabled={doctorBusy === doc.doctorId}
                          className="btn-danger text-xs py-1.5 px-3"
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
        </div>
      )}
    </div>
  );
}
