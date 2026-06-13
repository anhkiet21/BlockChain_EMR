"use client";

import { FormEvent, useEffect, useState } from "react";
import { AccessState } from "@/components/access-state";
import { ResponseBox } from "@/components/response-box";
import { apiFetch } from "@/lib/api/client";
import { Department, DoctorProfile, PatientProfile } from "@/lib/api/types";
import { useRequiredRole } from "@/lib/auth/use-required-role";

export default function AdminPage() {
  const access = useRequiredRole("ADMIN");
  const [departments, setDepartments]   = useState<Department[]>([]);
  const [department, setDepartment]     = useState({ code: "", name: "", description: "" });
  const [editDept, setEditDept]         = useState({ id: "", name: "", description: "", active: true });
  const [doctorId, setDoctorId]         = useState("");
  const [patientId, setPatientId]       = useState("");
  const [message, setMessage]           = useState("");
  const [msgKind, setMsgKind]           = useState<"info"|"error"|"success">("info");
  const [lastResponse, setLastResponse] = useState<unknown>(null);

  useEffect(() => { if (access === "allowed") loadDepartments(); }, [access]);

  function showMsg(text: string, kind: "info"|"error"|"success" = "info") {
    setMessage(text); setMsgKind(kind);
  }

  async function loadDepartments() {
    try {
      const data = await apiFetch<Department[]>("/departments");
      setDepartments(data);
    } catch (err) { showMsg(err instanceof Error ? err.message : "Không thể tải khoa phòng", "error"); }
  }

  async function createDepartment(event: FormEvent) {
    event.preventDefault();
    try {
      const created = await apiFetch<Department>("/departments", { method: "POST", body: JSON.stringify(department) });
      setLastResponse(created);
      showMsg("✅ Đã tạo khoa phòng thành công.", "success");
      setDepartment({ code: "", name: "", description: "" });
      await loadDepartments();
    } catch (err) { showMsg(err instanceof Error ? err.message : "Không thể tạo khoa phòng", "error"); }
  }

  async function updateDepartment(event: FormEvent) {
    event.preventDefault();
    try {
      const updated = await apiFetch<Department>(`/departments/${editDept.id}`, {
        method: "PUT",
        body: JSON.stringify({ name: editDept.name, description: editDept.description, active: editDept.active }),
      });
      setLastResponse(updated);
      showMsg("✅ Đã cập nhật khoa phòng.", "success");
      await loadDepartments();
    } catch (err) { showMsg(err instanceof Error ? err.message : "Không thể cập nhật khoa phòng", "error"); }
  }

  async function getDoctor() {
    try {
      const doctor = await apiFetch<DoctorProfile>(`/doctors/${doctorId}`);
      setLastResponse(doctor);
      showMsg(`Đã tải thông tin bác sĩ: ${doctor.fullName}`, "success");
    } catch (err) { showMsg(err instanceof Error ? err.message : "Không thể tải bác sĩ", "error"); }
  }

  async function verifyDoctor(verified: boolean) {
    try {
      const doctor = await apiFetch<DoctorProfile>(`/doctors/${doctorId}/verification`, {
        method: "PUT",
        body: JSON.stringify({ verified }),
      });
      setLastResponse(doctor);
      showMsg(verified ? "✅ Đã xác minh bác sĩ." : "Đã huỷ xác minh bác sĩ.", verified ? "success" : "info");
    } catch (err) { showMsg(err instanceof Error ? err.message : "Không thể cập nhật bác sĩ", "error"); }
  }

  async function getPatient() {
    try {
      const patient = await apiFetch<PatientProfile>(`/patients/${patientId}`);
      setLastResponse(patient);
      showMsg(`Đã tải thông tin bệnh nhân: ${patient.fullName}`, "success");
    } catch (err) { showMsg(err instanceof Error ? err.message : "Không thể tải bệnh nhân", "error"); }
  }

  async function syncEvents() {
    try {
      const result = await apiFetch("/blockchain/events/sync", { method: "POST" });
      setLastResponse(result);
      showMsg("✅ Đã đồng bộ blockchain events.", "success");
    } catch (err) { showMsg(err instanceof Error ? err.message : "Không thể đồng bộ events", "error"); }
  }

  if (access !== "allowed") return <AccessState access={access} />;

  const msgClass = msgKind === "error" ? "alert-error" : msgKind === "success" ? "alert-success" : "alert-info";

  return (
    <div className="grid gap-8 animate-fade-in">
      {/* ── Header ── */}
      <div>
        <div className="role-pill bg-red-500/10 border-red-500/20 text-red-400">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
          </svg>
          Quản trị viên
        </div>
        <h1 className="page-title">⚙️ Bảng điều khiển quản trị</h1>
        <p className="page-subtitle">Quản lý khoa phòng, xác minh bác sĩ và đồng bộ sự kiện blockchain.</p>
      </div>

      {/* ── Message banner ── */}
      {message && <div className={`${msgClass} animate-scale-in`}>{message}</div>}

      {/* ── Cards grid ── */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* Create department */}
        <form className="card-glass grid gap-4" onSubmit={createDepartment}>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 text-lg">🏢</div>
            <h2 className="section-title text-base">Tạo khoa phòng</h2>
          </div>
          <label className="grid gap-2">
            <span className="form-label">Mã khoa *</span>
            <input className="input" placeholder="Ví dụ: CARDIOLOGY" required value={department.code} onChange={(e) => setDepartment({ ...department, code: e.target.value })} />
          </label>
          <label className="grid gap-2">
            <span className="form-label">Tên khoa *</span>
            <input className="input" placeholder="Tên đầy đủ của khoa" required value={department.name} onChange={(e) => setDepartment({ ...department, name: e.target.value })} />
          </label>
          <label className="grid gap-2">
            <span className="form-label">Mô tả</span>
            <textarea className="input min-h-[80px] resize-none" placeholder="Mô tả ngắn về khoa..." value={department.description} onChange={(e) => setDepartment({ ...department, description: e.target.value })} />
          </label>
          <button className="btn-primary w-fit">➕ Tạo khoa</button>
        </form>

        {/* Update department */}
        <form className="card-glass grid gap-4" onSubmit={updateDepartment}>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-400 text-lg">✏️</div>
            <h2 className="section-title text-base">Cập nhật khoa phòng</h2>
          </div>
          <label className="grid gap-2">
            <span className="form-label">Chọn khoa *</span>
            <select
              className="input"
              required
              value={editDept.id}
              onChange={(e) => {
                const selected = departments.find((item) => item.id === Number(e.target.value));
                setEditDept({ id: e.target.value, name: selected?.name || "", description: selected?.description || "", active: selected?.active ?? true });
              }}
            >
              <option value="">-- Chọn khoa phòng --</option>
              {departments.map((item) => (
                <option value={item.id} key={item.id}>{item.code} - {item.name}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-2">
            <span className="form-label">Tên khoa *</span>
            <input className="input" placeholder="Tên khoa" required value={editDept.name} onChange={(e) => setEditDept({ ...editDept, name: e.target.value })} />
          </label>
          <label className="grid gap-2">
            <span className="form-label">Mô tả</span>
            <textarea className="input min-h-[80px] resize-none" placeholder="Mô tả" value={editDept.description} onChange={(e) => setEditDept({ ...editDept, description: e.target.value })} />
          </label>
          <label className="flex items-center gap-3 rounded-xl border border-white/10 px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors">
            <input
              type="checkbox"
              checked={editDept.active}
              onChange={(e) => setEditDept({ ...editDept, active: e.target.checked })}
              className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-indigo-500 focus:ring-indigo-500"
            />
            <span className="text-slate-300 text-sm font-medium">Hoạt động (Active)</span>
          </label>
          <button className="btn-primary w-fit">💾 Cập nhật</button>
        </form>

        {/* Doctor verification */}
        <div className="card-glass grid gap-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-lg">🩺</div>
            <h2 className="section-title text-base">Xác minh bác sĩ</h2>
          </div>
          <label className="grid gap-2">
            <span className="form-label">ID hồ sơ bác sĩ</span>
            <input className="input" type="number" min="1" placeholder="Nhập ID bác sĩ..." value={doctorId} onChange={(e) => setDoctorId(e.target.value)} />
          </label>
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary" type="button" onClick={getDoctor}>🔍 Xem thông tin</button>
            <button className="btn-success" type="button" onClick={() => verifyDoctor(true)}>✅ Xác minh</button>
            <button className="btn-danger" type="button" onClick={() => verifyDoctor(false)}>❌ Huỷ xác minh</button>
          </div>
        </div>

        {/* Patient & blockchain */}
        <div className="card-glass grid gap-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 text-lg">⛓️</div>
            <h2 className="section-title text-base">Bệnh nhân & Blockchain</h2>
          </div>
          <label className="grid gap-2">
            <span className="form-label">ID hồ sơ bệnh nhân</span>
            <input className="input" type="number" min="1" placeholder="Nhập ID bệnh nhân..." value={patientId} onChange={(e) => setPatientId(e.target.value)} />
          </label>
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary" type="button" onClick={getPatient}>🔍 Xem bệnh nhân</button>
            <button className="btn-primary" type="button" onClick={syncEvents}>🔄 Đồng bộ blockchain events</button>
          </div>
          <p className="text-xs text-slate-600">Đồng bộ sẽ đọc tất cả events từ smart contract và cập nhật cơ sở dữ liệu.</p>
        </div>
      </div>

      {/* ── Response box ── */}
      <ResponseBox title="API Response" data={lastResponse} />
    </div>
  );
}
